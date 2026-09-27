import type {
  AssemblerPort,
  ImagePort,
  LanguageModelPort,
  MediaPort,
  NarrationPort,
  PictureSensorPort,
  PlanSettings,
  RenderSettings,
  StillsSettings,
  VideoPort,
} from '@cutroom/contracts'
import { PICTURE_RULES } from '@cutroom/contracts'
import {
  ASSEMBLE_JOB,
  BUDGET_MD,
  buryJob,
  claimJob,
  CLIPS_JOB,
  closeDatabase,
  DEFAULT_LEASE_MS,
  KEYFRAMES_JOB,
  openDatabase,
  PLAN_JOB,
} from '@cutroom/domain'
import {
  DEFAULT_PLAN_SETTINGS,
  DEFAULT_RENDER_SETTINGS,
  DEFAULT_STILLS_SETTINGS,
  GATE_ORDER,
} from '@cutroom/pipeline'
import { runAssembleJob, type AssembleJobContext } from './assemble-job.ts'
import { runClipsJob, type ClipsJobContext } from './clips-job.ts'
import { runKeyframesJob, type KeyframesJobContext } from './keyframes-job.ts'
import { retryingModelPort } from './model-port.ts'
import { runPlanJob, type PlanJobContext } from './plan-job.ts'
import { QUESTIONS_MD } from './questions.ts'
import type { ResumeContext } from './resume.ts'

// The runner's loop: claim a due job, run it, and poll again (D-002). Jobs are run one at a time.
// Every kind of the chain is claimed by the one worker, oldest row first, so a reel's job is always
// run before the job it creates (D-081, D-083, S-069).

export interface WorkerOptions {
  /** The database file (D-086), shared with the API. */
  dbPath: string
  /** How long to wait between polls when no job is due. D-002 says 500 ms. */
  pollMs?: number
  /**
   * How long a job this worker claims is held from every other claim (D-002's lease). A job still
   * running when its lease runs out is taken to be abandoned, claimed again and run from the start
   * (S-027). Nothing renews a lease, so it must outlast the longest job. Defaults to 60 seconds.
   */
  leaseMs?: number
  /**
   * The only way the worker asks a model (S-021). The caller supplies it; the worker wraps it so
   * every receipt is recorded, and never constructs one itself.
   */
  model: LanguageModelPort
  /** Planning settings. Defaults to the pipeline's. */
  settings?: PlanSettings
  /** The BUDGET.md the per-reel cap is read from (D-100). Defaults to the pinned steering-ref's. */
  budgetPath?: string
  /** The questions file a per-reel cap refusal or stop is appended to (D-097). Defaults to QUESTIONS.md at the root. */
  questionsPath?: string
  /**
   * The only way the worker makes a picture (S-038). Required, like `model`: whoever starts the
   * worker chooses whether a picture can cost money, and the worker cannot import an adapter to
   * choose for itself. It must accept reference pictures, or the worker refuses to start (D-026).
   */
  image: ImagePort
  /** The only way the worker reads a picture's pixels (S-038). */
  sensors: PictureSensorPort
  /**
   * The stills stage's settings. Defaults to the pipeline's. Two equal canonical framing values
   * would render one prompt twice, so the worker refuses to start with them (D-032).
   */
  stillsSettings?: StillsSettings
  /**
   * The render's settings. Defaults to the pipeline's. Exactly one gate profile is defined, so a
   * profile whose gates are not GATE_ORDER — a lighter set, or one with a gate the engine does not
   * run — makes the worker refuse to start (D-052, S-067); so does a transient setting that could not
   * send a call or wait between sends (S-096), or a still push that would not push in (S-097).
   */
  renderSettings?: RenderSettings
  /**
   * The only way the worker makes a clip (S-071, S-075). Required, like `image`: whoever starts the
   * worker chooses whether a clip can cost money. The worker wraps it so every request is validated,
   * then recorded with its receipt (video-port.ts).
   */
  video: VideoPort
  /** The only way the worker makes a narration (S-070). Wrapped so every call is recorded. */
  narration: NarrationPort
  /**
   * The only way the worker measures a file (S-075): ffmpeg and ffprobe behind a port. Its `ready()`
   * is awaited before the database is opened, and a worker whose tools cannot be run, or lack an
   * encoder or a filter, refuses to start.
   */
  media: MediaPort
  /** The only way the worker assembles a video (S-073), made ready the same way. */
  assembler: AssemblerPort
  /**
   * The engine's own resume of a run a provider's fault fails (docs/features/resume-failed.md; S-163):
   * made in the transaction that fails the run, due `delayMs` after it. ABSENT IS OFF — the worker's
   * own default is no resume at all, so every test that does not ask for one still proves that a
   * provider's fault fails a run. The service turns it on, fifteen minutes on.
   */
  resume?: { delayMs: number }
}

/**
 * Why a worker would break a promise before its first picture — or nothing. Checked before the
 * database is opened, so a refused worker claims no job (D-026's, D-032's and D-052's startup
 * assertions, in that order: S-077), and then the render settings a retry and a still-hold read: a
 * transient setting that could not send a call or wait between sends (S-096), and a push that would
 * not push in (S-097).
 */
function refusal(
  options: WorkerOptions,
  stills: StillsSettings,
  render: RenderSettings,
): string | undefined {
  // The picture rule a plan is built under (S-150). A worker handed settings directly, not through
  // the service, must not fall into a default silently.
  const pictures = (options.settings ?? DEFAULT_PLAN_SETTINGS).pictures
  if (!PICTURE_RULES.some((rule) => rule === pictures)) {
    return `the picture rule is '${String(pictures)}', and it is one of ${PICTURE_RULES.join(', ')} (S-150)`
  }
  if (!options.image.acceptsReferences) {
    return 'the image port does not accept reference pictures, so no derived picture could be made from the canonical (D-026)'
  }
  const [first, second] = stills.canonicalFraming
  if (first === second) {
    return `both canonical framing values are '${first}', so the canonical's two candidates would be one prompt made twice (D-032)`
  }
  const { id, gates } = render.gateProfile
  const one = gates.length === GATE_ORDER.length && gates.every((gate, i) => gate === GATE_ORDER[i])
  if (!one) {
    return `the gate profile '${id}' runs gates [${gates.join(', ')}], and the one profile defined runs [${GATE_ORDER.join(', ')}]: no other set of gates exists (D-052, S-067)`
  }
  const { maxAttempts, backoffMs } = render.transient
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1) {
    return `the transient setting's maxAttempts is ${maxAttempts}, and a call answered unavailable is sent a whole number of times, at least once (S-096, I-11)`
  }
  if (!Number.isFinite(backoffMs) || backoffMs < 0) {
    return `the transient setting's backoffMs is ${backoffMs}, and the wait before a call is sent again is a finite number of milliseconds, at least 0 (S-096, I-11)`
  }
  const { endZoom } = render.stillPush
  if (!Number.isFinite(endZoom) || endZoom <= 1) {
    return `the still push's endZoom is ${endZoom}, and a held shot is pushed in from a zoom of 1 to a finite zoom above it (S-097, D-025)`
  }
  return undefined
}

export interface Worker {
  /** Finishes the job in hand, stops polling, and closes the database. */
  stop(): Promise<void>
}

export async function startWorker(options: WorkerOptions): Promise<Worker> {
  const stills = options.stillsSettings ?? DEFAULT_STILLS_SETTINGS
  const render = options.renderSettings ?? DEFAULT_RENDER_SETTINGS
  const refused = refusal(options, stills, render)
  if (refused !== undefined) throw new Error(`the worker refuses to start: ${refused}`)

  // Only then the tools, and still before the database is opened, so a worker that could not measure
  // or assemble a clip claims no job and buys nothing (S-075, S-077's order).
  for (const [name, port] of [
    ['media port', options.media],
    ['assembler', options.assembler],
  ] as const) {
    try {
      await port.ready()
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      throw new Error(`the worker refuses to start: its ${name} is not ready: ${reason} (S-075)`)
    }
  }

  // THE MODEL PORT'S TRANSIENT COUNTER, wrapped ONCE (paid-failures Slice 4, S-137). Every job's
  // context is handed this port rather than the one the worker was given, so no job can forget it,
  // and the figures are the render settings' — the same `maxAttempts` and `backoffMs` the video and
  // narration ports count on, because a provider having a bad minute is one thing whichever port
  // asks it.
  const model = retryingModelPort(options.model, render.transient)

  const db = openDatabase(options.dbPath)
  const pollMs = options.pollMs ?? 500
  const leaseMs = options.leaseMs ?? DEFAULT_LEASE_MS
  const settings = options.settings ?? DEFAULT_PLAN_SETTINGS
  const budgetPath = options.budgetPath ?? BUDGET_MD
  const questionsPath = options.questionsPath ?? QUESTIONS_MD
  // The engine's own resume: ONE key on every job's context, written even when off, so each job fails
  // a run the same way and a check reading a context's keys sees it (S-163). Off unless asked for.
  const resume: ResumeContext | undefined =
    options.resume === undefined
      ? undefined
      : { delayMs: options.resume.delayMs, settings, render, budgetPath, questionsPath }
  const context: PlanJobContext = {
    model,
    settings,
    budgetPath,
    questionsPath,
    resume,
  }
  const keyframes: KeyframesJobContext = {
    model,
    image: options.image,
    sensors: options.sensors,
    settings,
    stills,
    budgetPath,
    questionsPath,
    resume,
  }
  const clips: ClipsJobContext = {
    model,
    video: options.video,
    narration: options.narration,
    media: options.media,
    settings,
    render,
    budgetPath,
    questionsPath,
    resume,
  }
  // No image, narration or video port: nothing can be bought once assembly begins (I-18, S-069). Its
  // resume carries settings and two files, never a port: a Gate 7 failure resumed is a new run, which
  // buys only before its own first assembly (I-18 read per run, S-161, S-163).
  const assemble: AssembleJobContext = {
    model,
    media: options.media,
    assembler: options.assembler,
    render,
    resume,
  }
  let stopped = false
  let timer: ReturnType<typeof setTimeout> | undefined
  let current: Promise<void> = Promise.resolve()

  async function drain(): Promise<void> {
    while (!stopped) {
      const kinds = [PLAN_JOB, KEYFRAMES_JOB, CLIPS_JOB, ASSEMBLE_JOB]
      const job = claimJob(db, kinds, new Date(), leaseMs)
      if (job === undefined) return
      try {
        if (job.kind === ASSEMBLE_JOB) await runAssembleJob(db, job, assemble)
        else if (job.kind === CLIPS_JOB) await runClipsJob(db, job, clips)
        else if (job.kind === KEYFRAMES_JOB) await runKeyframesJob(db, job, keyframes)
        else await runPlanJob(db, job, context)
      } catch (error) {
        buryJob(db, job.id, error instanceof Error ? error.message : String(error))
      }
    }
  }

  function poll(): void {
    current = drain().finally(() => {
      if (!stopped) timer = setTimeout(poll, pollMs)
    })
  }
  poll()

  return {
    async stop() {
      stopped = true
      clearTimeout(timer)
      await current
      closeDatabase(db)
    },
  }
}
