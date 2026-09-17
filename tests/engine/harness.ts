import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { startApi, type Api } from '@cutroom/api'
import type {
  LanguageModelPort,
  NarrationPort,
  PlanSettings,
  RenderSettings,
  StillsSettings,
  VideoPort,
} from '@cutroom/contracts'
import { DEFAULT_PLAN_SETTINGS, DEFAULT_RENDER_SETTINGS } from '@cutroom/pipeline'
import {
  DEFAULT_ARTIFACT_ROOT,
  fakeImage,
  fakeModel,
  fakeNarration,
  fakeSensors,
  fakeVideo,
  ffmpegAssembler,
  ffmpegMedia,
  ffmpegTools,
  type FakeImage,
  type FakeImageScript,
  type FakeMediaScript,
  type FakeModel,
  type FakeNarration,
  type FakeNarrationScript,
  type FakeScript,
  type FakeSensors,
  type FakeSensorScript,
  type FakeVideo,
  type FakeVideoScript,
  type FfmpegAssembler,
  type FfmpegMedia,
} from '@cutroom/providers'
import { startWorker, type Worker } from '@cutroom/worker'
import { REPO } from '../_repo.ts'
import { client } from '../stand-in/client.ts'
import type { WorkerProcessConfig } from './worker-process.ts'

/** The small output profile every engine a test starts is handed (reel-render, Gate 3). */
export const TEST_RENDER_SETTINGS: RenderSettings = {
  ...DEFAULT_RENDER_SETTINGS,
  profile: {
    container: 'mp4',
    videoCodec: 'h264',
    audioCodec: 'aac',
    width: 108,
    height: 192,
    fps: 24,
    sampleRate: 48000,
    channels: 2,
  },
}

/**
 * The real engine — its API and its worker — started on a database file in a temporary folder
 * this harness owns. Every reply goes through ../stand-in/client.ts, which fails the test on a
 * body the contract does not describe for that route and status.
 *
 * The worker is optional and can be started later, which is how a test observes a run before
 * any job has been claimed. Its only model is the stand-in, answering from the script a test
 * gives — none, by default, so a run that reaches a model call fails. Its questions file is always
 * inside the harness's folder, so no test can write the repository's own.
 *
 * The worker is also handed an image stand-in and a sensor stand-in (reel-stills, S-047), each
 * answering from a script a test gives — by default a readable 9:16 picture at no cost, and every
 * sensor's default. The image stand-in's artifact root is inside the harness's folder unless a
 * test asks for the stand-in's own default, which only reel-stills' check 17 does.
 *
 * And the worker is handed the video and narration stand-ins, the ffmpeg media port and the
 * assembler (reel-render's Slice 3, S-077), each answering from a script a test gives and writing
 * under the same artifact root; and a small output profile, so no test renders at 768 × 1366.
 */
export interface Engine {
  dir: string
  dbPath: string
  /** The questions file the worker was pointed at, inside `dir`. Not created until written. */
  questionsPath: string
  /** The BUDGET.md written into `dir` when a test supplied one; otherwise the worker's default. */
  budgetPath: string | undefined
  /** Where the image stand-in writes its pictures: inside `dir`, or the stand-in's default. */
  artifactRoot: string
  api: Api
  http: ReturnType<typeof client>
  /** The stand-in the worker was handed, with every call it received. */
  model: FakeModel
  /** The image stand-in the worker was handed, with every call it received. */
  image: FakeImage
  /** The sensor stand-in the worker was handed, with every call it received. */
  sensors: FakeSensors
  /** The video stand-in the worker was handed, with every request it received. */
  video: FakeVideo
  /** The narration stand-in the worker was handed, with every request it received. */
  narration: FakeNarration
  /** The ffmpeg media port the worker was handed, with every call it received. */
  media: FfmpegMedia
  /** The assembler the worker was handed. */
  assembler: FfmpegAssembler
  startWorker(): Promise<Worker>
  /** Stops the worker — after the job in hand — so `startWorker()` starts a new one. */
  stopWorker(): Promise<void>
  /**
   * The worker in a child process, whose stand-in never answers call `holdAtCall`: a run in the
   * middle of its plan stage, or of its stills stage, which the test ends by killing the process.
   * Its image and sensor stand-ins answer from the engine's `images` and `sensors`, and it is
   * handed the engine's `stillsSettings`.
   */
  spawnWorker(options: { script: FakeScript; holdAtCall: number; leaseMs: number }): WorkerProcess
  /**
   * Stops the worker and the API and starts the API again on the same database file, with a new
   * stand-in answering from `script`. The folder is kept. The worker is not started again until
   * `startWorker()`.
   */
  restart(options: { script?: FakeScript }): Promise<void>
  /** Reads the database file directly, the way an operator would, and closes it again. */
  query<T>(sql: string, ...params: Array<string | number>): T[]
  stop(): Promise<void>
}

export interface WorkerProcess {
  /** Resolves once the worker's stand-in is holding its call open; rejects if the process ends first. */
  held: Promise<void>
  /** Ends the process at once, as a crash would, and resolves when it has gone. */
  kill(): Promise<void>
}

export interface EngineOptions {
  worker: boolean
  script?: FakeScript
  settings?: PlanSettings
  /** The text of a BUDGET.md, written into the engine's folder and read by the worker for the cap. */
  budgetMd?: string
  /** What the image stand-in makes of each picture, keyed `shot-<unit>-<label>`. */
  images?: FakeImageScript
  /** What the sensor stand-in reads off each picture, keyed `shot-<unit>-<label>`. */
  sensors?: FakeSensorScript
  /** The stills stage's settings. Defaults to the pipeline's. */
  stillsSettings?: StillsSettings
  /**
   * The image stand-in's artifact root. Absent: a folder inside the engine's own. `null`: left
   * unset, so the stand-in writes under its default — the repository's `.artifacts/` (D-086).
   */
  artifactRoot?: string | null
  /** Wraps the model the worker is handed — how a test holds a call open in-process. */
  wrapModel?: (model: LanguageModelPort) => LanguageModelPort
  /** What the video stand-in makes of each take, keyed `shot-<unit>-take-<n>`. */
  video?: FakeVideoScript
  /** What the narration stand-in speaks for each shot, keyed `shot-<unit>-narration`. */
  narration?: FakeNarrationScript
  /** What the media port reads and hears in each take, keyed `shot-<unit>-take-<n>`. */
  media?: FakeMediaScript
  /** The render settings. Defaults to TEST_RENDER_SETTINGS. */
  renderSettings?: RenderSettings
  /** Wraps the video port the worker is handed — how a test sees the calls' order and answers. */
  wrapVideo?: (video: VideoPort) => VideoPort
  /** Wraps the narration port the worker is handed. */
  wrapNarration?: (narration: NarrationPort) => NarrationPort
}

export async function startEngine(options: EngineOptions): Promise<Engine> {
  const dir = mkdtempSync(join(tmpdir(), 'reel-plan-'))
  const dbPath = join(dir, 'engine.sqlite')
  const questionsPath = join(dir, 'QUESTIONS.md')
  let budgetPath: string | undefined
  if (options.budgetMd !== undefined) {
    budgetPath = join(dir, 'BUDGET.md')
    writeFileSync(budgetPath, options.budgetMd)
  }
  const settings = options.settings ?? DEFAULT_PLAN_SETTINGS
  const artifactRoot =
    options.artifactRoot === null
      ? DEFAULT_ARTIFACT_ROOT
      : (options.artifactRoot ?? join(dir, 'artifacts'))
  const imageOptions = options.artifactRoot === null ? {} : { artifactRoot }
  const renderSettings = options.renderSettings ?? TEST_RENDER_SETTINGS
  const tools = ffmpegTools()
  const api = await startApi({ dbPath })
  let worker: Worker | undefined
  const children: Array<ReturnType<typeof spawn>> = []
  const wrap = options.wrapModel ?? ((model: LanguageModelPort) => model)
  const wrapVideo = options.wrapVideo ?? ((video: VideoPort) => video)
  const wrapNarration = options.wrapNarration ?? ((narration: NarrationPort) => narration)

  const engine: Engine = {
    dir,
    dbPath,
    questionsPath,
    budgetPath,
    artifactRoot,
    api,
    http: client(api.baseUrl),
    model: fakeModel(options.script ?? {}, { models: settings.models }),
    image: fakeImage(options.images ?? {}, imageOptions),
    sensors: fakeSensors(options.sensors ?? {}),
    video: fakeVideo(tools, options.video ?? {}, imageOptions),
    narration: fakeNarration(options.narration ?? {}, imageOptions),
    media: ffmpegMedia(tools, { ...imageOptions, script: options.media ?? {} }),
    assembler: ffmpegAssembler(tools, imageOptions),
    async startWorker() {
      worker ??= await startWorker({
        dbPath,
        pollMs: 10,
        model: wrap(engine.model),
        image: engine.image,
        sensors: engine.sensors,
        video: wrapVideo(engine.video),
        narration: wrapNarration(engine.narration),
        media: engine.media,
        assembler: engine.assembler,
        settings,
        renderSettings,
        questionsPath,
        ...(budgetPath === undefined ? {} : { budgetPath }),
        ...(options.stillsSettings === undefined ? {} : { stillsSettings: options.stillsSettings }),
      })
      return worker
    },
    async stopWorker() {
      const stopping = worker
      worker = undefined
      await stopping?.stop()
    },
    spawnWorker({ script, holdAtCall, leaseMs }) {
      const config: WorkerProcessConfig = {
        dbPath,
        questionsPath,
        ...(budgetPath === undefined ? {} : { budgetPath }),
        artifactRoot,
        settings,
        ...(options.stillsSettings === undefined ? {} : { stillsSettings: options.stillsSettings }),
        script,
        images: options.images ?? {},
        sensors: options.sensors ?? {},
        video: options.video ?? {},
        narration: options.narration ?? {},
        media: options.media ?? {},
        renderSettings,
        holdAtCall,
        leaseMs,
      }
      const child = spawn(
        process.execPath,
        [
          '--experimental-strip-types',
          '--no-warnings',
          join('tests', 'engine', 'worker-process.ts'),
        ],
        { cwd: REPO, stdio: ['pipe', 'pipe', 'pipe'] },
      )
      children.push(child)
      let output = ''
      const gone = new Promise<void>((resolve) => child.once('exit', () => resolve()))
      const held = new Promise<void>((resolve, reject) => {
        child.stdout.on('data', (chunk: Buffer) => {
          output += chunk.toString('utf8')
          if (/^held$/m.test(output)) resolve()
        })
        child.stderr.on('data', (chunk: Buffer) => {
          output += chunk.toString('utf8')
        })
        child.once('exit', (code) => {
          reject(new Error(`the worker process ended (${code}) before holding a call:\n${output}`))
        })
      })
      // A process killed before it held a call is the test's own doing, not an unhandled failure.
      held.catch(() => {})
      child.stdin.end(JSON.stringify(config))
      return {
        held,
        async kill() {
          if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL')
          await gone
        },
      }
    },
    async restart({ script }) {
      await worker?.stop()
      worker = undefined
      await engine.api.stop()
      engine.api = await startApi({ dbPath })
      engine.http = client(engine.api.baseUrl)
      engine.model = fakeModel(script ?? {}, { models: settings.models })
      engine.image = fakeImage(options.images ?? {}, imageOptions)
      engine.sensors = fakeSensors(options.sensors ?? {})
      engine.video = fakeVideo(tools, options.video ?? {}, imageOptions)
      engine.narration = fakeNarration(options.narration ?? {}, imageOptions)
      engine.media = ffmpegMedia(tools, { ...imageOptions, script: options.media ?? {} })
      engine.assembler = ffmpegAssembler(tools, imageOptions)
    },
    query<T>(sql: string, ...params: Array<string | number>): T[] {
      const db = new DatabaseSync(dbPath)
      try {
        return db.prepare(sql).all(...params) as T[]
      } finally {
        db.close()
      }
    },
    async stop() {
      for (const child of children) {
        if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL')
      }
      await Promise.all(
        children.map((child) =>
          child.exitCode === null && child.signalCode === null
            ? new Promise<void>((resolve) => child.once('exit', () => resolve()))
            : undefined,
        ),
      )
      await worker?.stop()
      await engine.api.stop()
      rmSync(dir, { recursive: true, force: true })
    },
  }
  if (options.worker) {
    // A worker that fails to start must not leave the API listening: the test file's process would
    // never exit, and a run of the suite would hang rather than fail (seen by check 47's child).
    try {
      await engine.startWorker()
    } catch (error) {
      await engine.stop()
      throw error
    }
  }
  return engine
}

/** Polls until `predicate` holds, or fails naming what it was waiting for. */
export async function waitFor(
  what: string,
  predicate: () => Promise<boolean> | boolean,
  timeoutMs = 5000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (await predicate()) return
    await new Promise((resolve) => setTimeout(resolve, 10))
  }
  throw new Error(`timed out after ${timeoutMs}ms waiting for ${what}`)
}

/** Waits until the run's status says it has finished. */
export async function finished(engine: Engine, runId: string): Promise<void> {
  await waitFor(`run ${runId} to finish`, async () => {
    const { json } = await engine.http.status(runId)
    return json.state === 'finished'
  })
}

/** A stored plan row, its JSON columns parsed. */
export interface PlanRowRead {
  role: string
  axis: string
  unitCount: number
  plan: { units: number[][]; estimateCents: number }
  verdict: { outcome: string; failed: string[] }
  score: number | null
  estimateCents: number
  selected: boolean
}

/** A finished run as a caller and an operator see it: its result and events, its rows. */
export interface Ran {
  runId: string
  result: Record<string, unknown>
  events: Array<Record<string, unknown> & { type: string }>
  plans: PlanRowRead[]
  receipts: Array<{ role: string }>
}

/** Submits a request, waits for its run to finish, and reads everything it left behind. */
export async function run(engine: Engine, request: unknown): Promise<Ran> {
  const submitted = await engine.http.submit(request)
  if (submitted.status !== 202) {
    throw new Error(`the request was not accepted: ${JSON.stringify(submitted.json)}`)
  }
  const runId = String(submitted.json.runId)
  await finished(engine, runId)
  const plans = engine
    .query<{
      role: string
      axis: string
      unit_count: number
      plan: string
      verdict: string
      score: number | null
      estimate_cents: number
      selected: number
    }>('SELECT * FROM plan WHERE run_id = ? ORDER BY role', runId)
    .map((row) => ({
      role: row.role,
      axis: row.axis,
      unitCount: row.unit_count,
      plan: JSON.parse(row.plan) as PlanRowRead['plan'],
      verdict: JSON.parse(row.verdict) as PlanRowRead['verdict'],
      score: row.score,
      estimateCents: row.estimate_cents,
      selected: row.selected === 1,
    }))
  return {
    runId,
    result: (await engine.http.result(runId)).json,
    events: (await engine.http.events(runId)).json.events as Ran['events'],
    plans,
    receipts: engine
      .query<{ role: string }>('SELECT role FROM model_receipt WHERE run_id = ? ORDER BY id', runId)
      .map((r) => ({ role: r.role })),
  }
}
