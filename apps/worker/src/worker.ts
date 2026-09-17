import type {
  ImagePort,
  LanguageModelPort,
  PictureSensorPort,
  PlanSettings,
  RenderSettings,
  StillsSettings,
} from '@cutroom/contracts'
import {
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
import { runClipsJob } from './clips-job.ts'
import { runKeyframesJob, type KeyframesJobContext } from './keyframes-job.ts'
import { runPlanJob, type PlanJobContext } from './plan-job.ts'
import { QUESTIONS_MD } from './questions.ts'

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
  /** The questions file a per-reel cap refusal is appended to (D-097). Defaults to QUESTIONS.md at the root. */
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
   * run — makes the worker refuse to start (D-052, S-067).
   */
  renderSettings?: RenderSettings
}

/**
 * Why a worker would break a promise before its first picture — or nothing. Checked before the
 * database is opened, so a refused worker claims no job (D-026's, D-032's and D-052's startup
 * assertions, in that order: S-077).
 */
function refusal(
  options: WorkerOptions,
  stills: StillsSettings,
  render: RenderSettings,
): string | undefined {
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

  const db = openDatabase(options.dbPath)
  const pollMs = options.pollMs ?? 500
  const leaseMs = options.leaseMs ?? DEFAULT_LEASE_MS
  const settings = options.settings ?? DEFAULT_PLAN_SETTINGS
  const context: PlanJobContext = {
    model: options.model,
    settings,
    budgetPath: options.budgetPath ?? BUDGET_MD,
    questionsPath: options.questionsPath ?? QUESTIONS_MD,
  }
  const keyframes: KeyframesJobContext = {
    model: options.model,
    image: options.image,
    sensors: options.sensors,
    settings,
    stills,
    budgetPath: context.budgetPath,
    questionsPath: context.questionsPath,
  }
  let stopped = false
  let timer: ReturnType<typeof setTimeout> | undefined
  let current: Promise<void> = Promise.resolve()

  async function drain(): Promise<void> {
    while (!stopped) {
      const job = claimJob(db, [PLAN_JOB, KEYFRAMES_JOB, CLIPS_JOB], new Date(), leaseMs)
      if (job === undefined) return
      try {
        if (job.kind === CLIPS_JOB) await runClipsJob(db, job)
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
