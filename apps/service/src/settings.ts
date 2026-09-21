import { fileURLToPath } from 'node:url'
import {
  PROVIDER_PORTS,
  anyReal,
  type ProviderPort,
  type ProviderSettings,
} from '@cutroom/contracts'
import type { PlanSettings } from '@cutroom/contracts'
import { BUDGET_MD, DEFAULT_LEASE_MS } from '@cutroom/domain'
import { DEFAULT_PLAN_SETTINGS, TAKES_A_SHOT } from '@cutroom/pipeline'
import {
  CONFIGURED_IMAGE_SLUG,
  DEFAULT_ARTIFACT_ROOT,
  DEFAULT_VIDEO_WAIT_MS,
  FAL_BASE_URL,
  FAL_STORAGE_BASE_URL,
  H3_TURBO,
  MINIMAX_BASE_URL,
  adapterName,
  clipsAJob,
  imageEntry,
  imageRateCents,
  type Env,
  type Transport,
} from '@cutroom/providers'
import { QUESTIONS_MD } from '@cutroom/worker'

// What the service settles, read from the environment (docs/features/paid-path.md, Gate 2). ONE
// SETTING PER GENERATED PATH, every default inside this repository and none of them absolute
// (D-086, tests/no-absolute-paths.test.ts): each default below is found from THIS FILE's own URL,
// never from the working directory, so the service settles the same folders whoever starts it and
// from wherever.
//
// Nothing here reads a key. The environment a key would be in is passed on to
// `packages/providers`, which is the only place that may look at one (S-109).

/** This repository's root, found from this file rather than from `process.cwd()` (D-086). */
const REPO = new URL('../../../', import.meta.url)
const inRepo = (path: string) => fileURLToPath(new URL(path, REPO))

/** The database file the API and the worker share (D-001, D-086). `data/` is gitignored. */
export const DEFAULT_DB_PATH = inRepo('data/cutroom.sqlite')
/** The environment file a key is loaded from (S-109). `.env` is gitignored; no exception is added. */
export const DEFAULT_ENV_FILE = inRepo('.env')
/** Loopback only, and a fixed port so a caller knows where to look (D-098). 0 takes any free one. */
export const DEFAULT_API_PORT = 8787

/**
 * The most clips one clips job can ask for: every shot of the largest fork, at the full ladder —
 * eighteen, as D-112's `[4, 6]` and D-024's three takes make it.
 */
export const CLIPS_A_JOB = clipsAJob(DEFAULT_PLAN_SETTINGS.shotCountUnits, TAKES_A_SHOT)

/**
 * Everything a clips job does that is not waiting on fal: the narrations, the ffmpeg probes, scans
 * and frame strips, and the model calls of four gates a take. An hour is generous on purpose — the
 * one error here that costs no money is a lease that is too long.
 */
export const LEASE_SLACK_MS = 3_600_000

/**
 * The lease a real job needs (S-113), **computed from the wait the video adapter allows** rather
 * than declared beside it (S-125).
 *
 * A real clip takes minutes and NOTHING RENEWS A LEASE (D-002), so a clips job of eighteen real
 * clips plus their narrations must finish inside one. The adapter lets each clip sit on fal's
 * queue for `DEFAULT_VIDEO_WAIT_MS`, so the worst case this engine can actually produce is that
 * figure times the clips one job can ask for — and if the floor were a separate constant the two
 * could drift into a job that outlives its own lease, is claimed again, and PAYS A SECOND TIME for
 * the take in flight (S-092, D-014). That is the exact failure S-113 exists to prevent, so the
 * relationship is arithmetic rather than a comment.
 *
 * Both figures are declared defaults and guesses until Slice 8 measures a real reel. Four hours is
 * what they come to today.
 */
export const DEFAULT_LEASE_FLOOR_MS = CLIPS_A_JOB * DEFAULT_VIDEO_WAIT_MS + LEASE_SLACK_MS

/** Every setting's name, in the order the banner prints them. */
export const SETTING_NAMES = {
  envFile: 'CUTROOM_ENV_FILE',
  dbPath: 'CUTROOM_DB_PATH',
  artifactRoot: 'CUTROOM_ARTIFACT_ROOT',
  questionsPath: 'CUTROOM_QUESTIONS_PATH',
  budgetPath: 'CUTROOM_BUDGET_PATH',
  apiPort: 'CUTROOM_API_PORT',
  leaseMs: 'CUTROOM_LEASE_MS',
  leaseFloorMs: 'CUTROOM_LEASE_FLOOR_MS',
  standInScript: 'CUTROOM_STAND_IN_SCRIPT',
  minimaxBaseUrl: 'CUTROOM_MINIMAX_BASE_URL',
  falBaseUrl: 'CUTROOM_FAL_BASE_URL',
  falStorageBaseUrl: 'CUTROOM_FAL_STORAGE_BASE_URL',
  falImageModel: 'CUTROOM_FAL_IMAGE_MODEL',
} as const

/** `CUTROOM_PROVIDER_MODEL`, `_IMAGE`, `_SENSOR`, `_VIDEO`, `_NARRATION` (S-108). */
export const providerSetting = (port: ProviderPort) => `CUTROOM_PROVIDER_${port.toUpperCase()}`

export interface ServiceSettings {
  dbPath: string
  artifactRoot: string
  questionsPath: string
  budgetPath: string
  apiPort: number
  leaseMs: number
  leaseFloorMs: number
  providers: ProviderSettings
  /** The file the stand-ins answer from (S-116). Absent: they answer from nothing, as before. */
  standInScript: string | undefined
  /** Where each real adapter sends: one setting a HOST, each defaulting to its own (S-124). */
  transport: Transport
  /** Which admitted entry the image port is configured with (D-028). */
  falImageSlug: string
  /**
   * What the worker plans and prices with. It is `DEFAULT_PLAN_SETTINGS` except for the rates a
   * real adapter actually charges: with a real image port, `imageRateCents` is THE CONFIGURED
   * ENTRY'S OWN RATE (D-028, S-124), and with a real video port `videoRateCentsPerSecond` is
   * D-007's one path's (S-125). Pre-flight has to price whatever is configured — a rate that is a
   * constant in code makes every estimate wrong in the direction that overspends the moment the
   * default moves (D-014, I-1).
   */
  planSettings: PlanSettings
  /** The environment the ports are built from — where `packages/providers` reads a key (S-109). */
  env: Env
}

/** A whole number of at least `least`, or a refusal naming the setting and what it was given. */
function whole(env: Env, name: string, fallback: number, least: number): number {
  const raw = env[name]
  if (raw === undefined || raw.trim() === '') return fallback
  const value = Number(raw)
  if (!Number.isInteger(value) || value < least) {
    throw new Error(`${name} is '${raw}', and it must be a whole number of at least ${least}`)
  }
  return value
}

const text = (env: Env, name: string, fallback: string): string => {
  const raw = env[name]
  return raw === undefined || raw.trim() === '' ? fallback : raw
}

/** One adapter name per port, each from its closed set, every default `'fake'` (S-108). */
function providers(env: Env): ProviderSettings {
  const read = <P extends ProviderPort>(port: P): ProviderSettings[P] =>
    adapterName(port, text(env, providerSetting(port), 'fake'))
  return {
    model: read('model'),
    image: read('image'),
    sensor: read('sensor'),
    video: read('video'),
    narration: read('narration'),
  }
}

/**
 * Every setting, read and refused. A refusal here happens before anything is built and long before
 * the database is opened, so a service told something it cannot honour claims no job and writes no
 * file (S-075's form).
 */
export function readSettings(env: Env): ServiceSettings {
  const settings = providers(env)
  const leaseFloorMs = whole(env, SETTING_NAMES.leaseFloorMs, DEFAULT_LEASE_FLOOR_MS, 1)
  const real = anyReal(settings)

  // S-113: the lease is set FROM THE ADAPTERS the service was given. With only stand-ins it is
  // D-002's 60 seconds, which every verified feature runs on; with any real adapter it is the
  // floor, and a lease explicitly set below the floor is refused rather than quietly raised.
  const leaseMs = whole(
    env,
    SETTING_NAMES.leaseMs,
    real === undefined ? DEFAULT_LEASE_MS : leaseFloorMs,
    1,
  )
  if (real !== undefined && leaseMs < leaseFloorMs) {
    throw new Error(
      `the lease is ${leaseMs} ms and the ${real} port was told '${settings[real]}': a real job ` +
        `needs at least ${leaseFloorMs} ms, because nothing renews a lease, and a job claimed ` +
        `again pays a second time for the take in flight (S-113, D-002, D-014)`,
    )
  }

  // D-028's closed registry, read before anything is built: a slug outside it refuses here, which
  // is before the database is opened and before any request is made (S-124).
  const falImageSlug = text(env, SETTING_NAMES.falImageModel, CONFIGURED_IMAGE_SLUG)
  const entry = imageEntry(falImageSlug)
  // What the worker PLANS AND PRICES with. Pre-flight has to price what is actually configured: a
  // rate left at the pipeline's own default while a real adapter charges another is an estimate
  // wrong in the direction that overspends (D-014, I-1, S-124). The video rate is D-007's one path
  // (S-125); it happens to equal BUDGET.md's planning figure today, and when Slice 8 reads the
  // dashboard one line in `packages/providers` moves and both the estimate and the receipt follow.
  const planSettings: PlanSettings = {
    ...DEFAULT_PLAN_SETTINGS,
    ...(settings.image === 'fake' ? {} : { imageRateCents: imageRateCents(entry) }),
    ...(settings.video === 'fake' ? {} : { videoRateCentsPerSecond: H3_TURBO.rateCentsPerSecond }),
  }

  const apiPort = whole(env, SETTING_NAMES.apiPort, DEFAULT_API_PORT, 0)
  if (apiPort > 65535) throw new Error(`${SETTING_NAMES.apiPort} is ${apiPort}, which is no port`)

  return {
    dbPath: text(env, SETTING_NAMES.dbPath, DEFAULT_DB_PATH),
    artifactRoot: text(env, SETTING_NAMES.artifactRoot, DEFAULT_ARTIFACT_ROOT),
    questionsPath: text(env, SETTING_NAMES.questionsPath, QUESTIONS_MD),
    budgetPath: text(env, SETTING_NAMES.budgetPath, BUDGET_MD),
    apiPort,
    leaseMs,
    leaseFloorMs,
    providers: settings,
    standInScript: env[SETTING_NAMES.standInScript],
    // A base URL, not a path: it points at a provider, so its default is the provider's own and
    // D-086's rule about paths does not reach it. What a test points it at is a loopback server
    // serving recorded wire, which is the only way a service in a process of its own can be
    // proven against a real adapter without a network (S-111, S-121).
    transport: {
      minimaxBaseUrl: text(env, SETTING_NAMES.minimaxBaseUrl, MINIMAX_BASE_URL),
      // fal is TWO hosts — its queue and its storage — so it takes two settings. One of them left
      // pointing at the internet while the other is pointed at recorded wire is how a suite
      // reaches the network by accident, which S-111 exists to prevent (S-124).
      falBaseUrl: text(env, SETTING_NAMES.falBaseUrl, FAL_BASE_URL),
      falStorageBaseUrl: text(env, SETTING_NAMES.falStorageBaseUrl, FAL_STORAGE_BASE_URL),
    },
    falImageSlug,
    planSettings,
    env,
  }
}

/** What the service prints when it starts. Adapter names and paths only — never a key (S-109). */
export function banner(settings: ServiceSettings, baseUrl: string): string {
  const ports = PROVIDER_PORTS.map((p) => `${p}=${settings.providers[p]}`).join(' ')
  return [
    'cutroom service',
    `  database   ${settings.dbPath}`,
    `  artifacts  ${settings.artifactRoot}`,
    `  questions  ${settings.questionsPath}`,
    `  providers  ${ports}`,
    `  minimax    ${settings.transport.minimaxBaseUrl ?? MINIMAX_BASE_URL}`,
    `  fal        ${settings.transport.falBaseUrl ?? FAL_BASE_URL} ${settings.transport.falStorageBaseUrl ?? FAL_STORAGE_BASE_URL}`,
    `  image      ${settings.falImageSlug} at ${settings.planSettings.imageRateCents} cents`,
    `  video      ${settings.planSettings.videoRateCentsPerSecond} cents a second`,
    `  lease      ${settings.leaseMs} ms`,
    `  listening  ${baseUrl}`,
    '',
    '  stop with SIGINT, or by writing `stop` on standard input.',
  ].join('\n')
}
