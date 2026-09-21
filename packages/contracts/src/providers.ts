// Which adapter each port gets (S-108, docs/features/paid-path.md, Gate 2). One setting per port,
// each a value from a CLOSED SET, and every default `'fake'` — so an engine started with no
// provider settings is the engine as every feature before this one was verified: free, secretless,
// reaching no network but ffmpeg on this machine (S-075).
//
// The sets and the defaults are here, beside the port types, and nothing else is: no factory, no
// adapter and no path. A name is turned into a port in `packages/providers`, which is the only
// place an adapter or a key may live (S-021, S-038, S-109).

/** The stand-in every port has, and the one this repository is verified on. */
export const STAND_IN = 'fake'

/** The model: the stand-in, or MiniMax over its OpenAI-compatible wire (D-006, S-114). */
export const MODEL_ADAPTERS = [STAND_IN, 'minimax'] as const
/** The picture maker: the stand-in, or fal through D-028's closed registry. */
export const IMAGE_ADAPTERS = [STAND_IN, 'fal'] as const
/** Reading a picture's pixels: the stand-in, or ffmpeg on this machine (S-112). */
export const SENSOR_ADAPTERS = [STAND_IN, 'local'] as const
/** The clip maker: the stand-in, or fal's queue (D-007, D-018). */
export const VIDEO_ADAPTERS = [STAND_IN, 'fal'] as const
/** The voice: the stand-in, or MiniMax T2A (D-008, D-019). */
export const NARRATION_ADAPTERS = [STAND_IN, 'minimax'] as const

export type ModelAdapter = (typeof MODEL_ADAPTERS)[number]
export type ImageAdapter = (typeof IMAGE_ADAPTERS)[number]
export type SensorAdapter = (typeof SENSOR_ADAPTERS)[number]
export type VideoAdapter = (typeof VIDEO_ADAPTERS)[number]
export type NarrationAdapter = (typeof NARRATION_ADAPTERS)[number]

/** One adapter name per port. Mixed is legal and expected: real video beside stand-in pictures. */
export interface ProviderSettings {
  model: ModelAdapter
  image: ImageAdapter
  sensor: SensorAdapter
  video: VideoAdapter
  narration: NarrationAdapter
}

/** Which port a setting is about, in the order a refusal reports them. */
export type ProviderPort = keyof ProviderSettings

/**
 * Every port with its closed set, so a reader of settings can refuse a name it does not know
 * without a branch per port — and so a port added later cannot be forgotten here.
 */
export const PROVIDER_ADAPTERS: { readonly [P in ProviderPort]: readonly string[] } = {
  model: MODEL_ADAPTERS,
  image: IMAGE_ADAPTERS,
  sensor: SENSOR_ADAPTERS,
  video: VIDEO_ADAPTERS,
  narration: NARRATION_ADAPTERS,
}

/** The ports, in the order settings are read and refusals are reported. */
export const PROVIDER_PORTS: readonly ProviderPort[] = [
  'model',
  'image',
  'sensor',
  'video',
  'narration',
]

/** Every default is the stand-in (S-108): nothing costs money until a setting says so. */
export const DEFAULT_PROVIDER_SETTINGS: ProviderSettings = {
  model: STAND_IN,
  image: STAND_IN,
  sensor: STAND_IN,
  video: STAND_IN,
  narration: STAND_IN,
}

/** Whether any port was told to be something other than its stand-in (S-113 reads this). */
export function anyReal(settings: ProviderSettings): ProviderPort | undefined {
  return PROVIDER_PORTS.find((port) => settings[port] !== STAND_IN)
}
