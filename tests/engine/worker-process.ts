import type {
  LanguageModelPort,
  PlanSettings,
  RenderSettings,
  StillsSettings,
} from '@cutroom/contracts'
import {
  fakeImage,
  fakeModel,
  fakeNarration,
  fakeSensors,
  fakeVideo,
  ffmpegAssembler,
  ffmpegMedia,
  ffmpegTools,
  type FakeImageScript,
  type FakeMediaScript,
  type FakeNarrationScript,
  type FakeScript,
  type FakeSensorScript,
  type FakeVideoScript,
} from '@cutroom/providers'
import { startWorker } from '@cutroom/worker'

/**
 * The real worker, in a process of its own, so a test can end it mid-run the way a crash does —
 * killed, with its job in hand, its database never closed (docs/features/reel-plan.md, check 46).
 * An in-process worker cannot be that: its `stop()` finishes the job in hand first.
 *
 * It reads its settings as JSON on standard input. Its model is the stand-in, answering from the
 * script it is given, except that call `holdAtCall` (counted across the port's four calls and
 * every role, from 1) is never answered: the process prints `held` and waits there until it is
 * killed. Every call before it returns, so its receipt is written. Its image and sensor ports are
 * the stand-ins, answering from the engine's scripts — a cost keyed by a whole picture id lands on
 * that attempt's picture only — and writing under the artifact root it is given (S-047, S-062). Its
 * video and narration ports are the stand-ins and its media port and assembler the ffmpeg adapters,
 * answering from the engine's scripts under the same root, with the engine's small render profile
 * (reel-render's Slice 3, S-077).
 */
export interface WorkerProcessConfig {
  dbPath: string
  questionsPath: string
  budgetPath?: string
  artifactRoot: string
  settings: PlanSettings
  stillsSettings?: StillsSettings
  renderSettings: RenderSettings
  script: FakeScript
  images: FakeImageScript
  sensors: FakeSensorScript
  video: FakeVideoScript
  narration: FakeNarrationScript
  media: FakeMediaScript
  holdAtCall: number
  leaseMs: number
}

const chunks: Buffer[] = []
for await (const chunk of process.stdin) chunks.push(chunk as Buffer)
const config = JSON.parse(Buffer.concat(chunks).toString('utf8')) as WorkerProcessConfig

const standIn = fakeModel(config.script, { models: config.settings.models })
let received = 0

/** True for the one call this process must never answer: the crash a test needs mid-stage. */
function holds(): boolean {
  received += 1
  if (received !== config.holdAtCall) return false
  process.stdout.write('held\n')
  return true
}

const held = <T>(): Promise<T> => new Promise<T>(() => {})

const model: LanguageModelPort = {
  structured(call) {
    return holds() ? held() : standIn.structured(call)
  },
  observe(call) {
    return holds() ? held() : standIn.observe(call)
  },
  compare(call) {
    return holds() ? held() : standIn.compare(call)
  },
  judgeCut(call) {
    return holds() ? held() : standIn.judgeCut(call)
  },
  readText(call) {
    return holds() ? held() : standIn.readText(call)
  },
}

// A held call is a promise nothing will settle, and it keeps no process alive on its own.
setInterval(() => {}, 60_000)

const root = { artifactRoot: config.artifactRoot }
const tools = ffmpegTools()

await startWorker({
  dbPath: config.dbPath,
  pollMs: 10,
  model,
  image: fakeImage(config.images, root),
  sensors: fakeSensors(config.sensors),
  video: fakeVideo(tools, config.video, root),
  narration: fakeNarration(config.narration, root),
  media: ffmpegMedia(tools, { ...root, script: config.media }),
  assembler: ffmpegAssembler(tools, root),
  settings: config.settings,
  ...(config.stillsSettings === undefined ? {} : { stillsSettings: config.stillsSettings }),
  renderSettings: config.renderSettings,
  questionsPath: config.questionsPath,
  leaseMs: config.leaseMs,
  ...(config.budgetPath === undefined ? {} : { budgetPath: config.budgetPath }),
})
