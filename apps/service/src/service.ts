import { mkdirSync, readFileSync } from 'node:fs'
import type { AddressInfo } from 'node:net'
import { dirname } from 'node:path'
import { startApi, type Api } from '@cutroom/api'
import { closeDatabase, openDatabase } from '@cutroom/domain'
import { DEFAULT_PLAN_SETTINGS } from '@cutroom/pipeline'
import {
  ffmpegAssembler,
  ffmpegMedia,
  ffmpegTools,
  imagePort,
  modelPort,
  narrationPort,
  sensorPort,
  videoPort,
  type PortOptions,
  type StandInScripts,
} from '@cutroom/providers'
import { startWorker, type Worker } from '@cutroom/worker'
import type { ServiceSettings } from './settings.ts'

// THE COMPOSITION ROOT (docs/features/paid-path.md, Gate 2). `startApi` and `startWorker` are
// libraries, and before this app nothing but the test harness had ever started either — so the
// engine had no program. This is that program: it reads settings, builds every port through
// `packages/providers`' factories, applies the migrations, and starts ONE worker and the API.
//
// It is an app of its own because it MUST import `packages/providers`, and `api-no-providers` and
// `worker-no-providers` forbid the two apps that exist from doing it — which is the rule that keeps
// a stage or a runner from reaching for an adapter that spends (S-021, S-038). Nothing imports
// this app, and it holds no pipeline logic: it names adapters and hands them over.

export interface Service {
  baseUrl: string
  address: AddressInfo
  settings: ServiceSettings
  /** Resolves once the service has stopped, however it was told to. */
  stopped: Promise<void>
  /** Closes the API and stops the worker after the job in hand. Safe to call twice. */
  stop(): Promise<void>
}

/** What the stand-ins answer from, read from the file the script setting names (S-116). */
function standInScripts(path: string | undefined): StandInScripts {
  if (path === undefined) return {}
  const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'))
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`the stand-in script at ${path} is not a JSON object (S-116)`)
  }
  return parsed as StandInScripts
}

/**
 * Starts the engine: every port, the migrations, the API and one worker.
 *
 * The order is what check 2 rests on. Every port is built FIRST, so a setting naming an adapter
 * that does not exist, or a real adapter whose key is absent, refuses before the database is
 * opened — no job is claimed and no file is written (S-075's form, D-026's startup refusal). The
 * two ffmpeg ports are made ready next, for the same reason (S-075). Only then are the migrations
 * applied, and only then does either half run.
 */
export async function startService(settings: ServiceSettings): Promise<Service> {
  const tools = ffmpegTools()
  const options: PortOptions = {
    artifactRoot: settings.artifactRoot,
    models: DEFAULT_PLAN_SETTINGS.models,
    tools,
    standIn: standInScripts(settings.standInScript),
    env: settings.env,
    transport: settings.transport,
    falImageSlug: settings.falImageSlug,
  }
  const { providers } = settings
  const ports = {
    model: modelPort(providers.model, options),
    image: imagePort(providers.image, options),
    sensors: sensorPort(providers.sensor, options),
    video: videoPort(providers.video, options),
    narration: narrationPort(providers.narration, options),
  }
  const artifacts = { artifactRoot: settings.artifactRoot }
  const media = ffmpegMedia(tools, artifacts)
  const assembler = ffmpegAssembler(tools, artifacts)
  for (const [name, port] of [
    ['media port', media],
    ['assembler', assembler],
  ] as const) {
    try {
      await port.ready()
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      throw new Error(`its ${name} is not ready: ${reason} (S-075)`)
    }
  }

  // The migrations, applied once at startup, before either half runs (Gate 2). `openDatabase`
  // brings the file up to date (S-012); the API and the worker each open their own connection to
  // the same file afterwards.
  mkdirSync(dirname(settings.dbPath), { recursive: true })
  closeDatabase(openDatabase(settings.dbPath))

  const api: Api = await startApi({ dbPath: settings.dbPath, port: settings.apiPort })

  // EXACTLY ONE WORKER (S-113). With one poller no second claim exists to take a job whose lease
  // ran out while it was still alive — which on a real run would pay a second time for the take in
  // flight (S-092, D-014). Lease renewal is deferred and named in the feature's deferral list.
  let worker: Worker
  try {
    worker = await startWorker({
      dbPath: settings.dbPath,
      leaseMs: settings.leaseMs,
      questionsPath: settings.questionsPath,
      budgetPath: settings.budgetPath,
      media,
      assembler,
      // What the worker plans and PRICES with. Its one difference from the pipeline's own
      // defaults is `imageRateCents`, which with a real image port is the configured registry
      // entry's own rate — so pre-flight estimates what is actually configured (D-028, S-124).
      settings: settings.planSettings,
      ...ports,
    })
  } catch (error) {
    // A worker that refuses must not leave the API listening: the process would never exit.
    await api.stop()
    throw error
  }

  let done: () => void = () => {}
  const stopped = new Promise<void>((resolve) => {
    done = resolve
  })
  let stopping: Promise<void> | undefined

  // SIGINT is what a person pressing Ctrl+C sends, and it is wired to the SAME shutdown a caller
  // gets from `stop()` (S-118). On Windows no signal reaches a spawned child at all — every one of
  // them terminates it outright — so what proves this path is a test that calls the handler the
  // operating system would call, and a second that stops a real process another way.
  const onSigint = (): void => {
    void stop()
  }
  process.once('SIGINT', onSigint)

  async function shutDown(): Promise<void> {
    process.removeListener('SIGINT', onSigint)
    await api.stop()
    await worker.stop()
    done()
  }

  function stop(): Promise<void> {
    stopping ??= shutDown()
    return stopping
  }

  return { baseUrl: api.baseUrl, address: api.address, settings, stopped, stop }
}
