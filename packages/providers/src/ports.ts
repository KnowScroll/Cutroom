import {
  PROVIDER_ADAPTERS,
  STAND_IN,
  type ImageAdapter,
  type ImagePort,
  type LanguageModelPort,
  type ModelAdapter,
  type ModelRole,
  type NarrationAdapter,
  type NarrationPort,
  type PictureSensorPort,
  type ProviderPort,
  type ProviderSettings,
  type SensorAdapter,
  type VideoAdapter,
  type VideoPort,
} from '@cutroom/contracts'
import { FAL_KEY, MINIMAX_KEY, falKey, minimaxKey, type Env } from './env.ts'
import { fakeImage, type FakeImageScript } from './fake/image.ts'
import { fakeModel, type FakeScript } from './fake/model.ts'
import { fakeNarration, type FakeNarrationScript } from './fake/narration.ts'
import { fakeSensors, type FakeSensorScript } from './fake/sensors.ts'
import { fakeVideo, type FakeVideoScript } from './fake/video.ts'
import { ffmpegMedia, type FakeMediaScript } from './ffmpeg/media.ts'
import { ffmpegSensors } from './ffmpeg/sensors.ts'
import type { FfmpegTools } from './ffmpeg/tools.ts'
import { falImage } from './fal/image.ts'
import { falVideo } from './fal/video.ts'
import { imageEntry } from './fal/registry.ts'
import { minimaxModel } from './minimax/model.ts'
import { minimaxNarration } from './minimax/narration.ts'

// ONE FACTORY PER PORT (S-108): it takes an adapter name and returns that port. This is the only
// place a name becomes an implementation, and it is inside `packages/providers` because that is
// the only package allowed to construct an adapter or read a key (S-021, S-038, S-109). Whoever
// composes the engine names the adapters; it never constructs one, and `api-no-providers` and
// `worker-no-providers` keep the two apps that serve and run from reaching here at all.
//
// ALL FIVE real adapters exist: MiniMax's model and narration, on one key (paid-path's Slices 3
// and 4), fal's image and video, on a second key and two hosts (its Slices 5 and 6), and the
// local sensor, which is ffmpeg on this machine and has no key at all (its Slice 7). So NOTHING
// is named and not built any more, and the refusal that said so is gone rather than left behind
// as an unreachable branch — what is left is the closed set's own refusal and the missing-key
// one, each thrown before the database is opened, so a service that cannot honour a setting
// claims no job and buys nothing (S-075's form, D-026's startup refusal, S-126).

/**
 * What the stand-ins answer from (S-116). Every field is optional and an absent one is an empty
 * script — which is exactly what every stand-in did before this existed. The stand-in model is the
 * one that cannot work without a script: it answers from the script or throws, so an engine whose
 * model port is the stand-in finishes a reel only when it was given one.
 */
export interface StandInScripts {
  model?: FakeScript
  images?: FakeImageScript
  sensors?: FakeSensorScript
  video?: FakeVideoScript
  narration?: FakeNarrationScript
  media?: FakeMediaScript
}

/**
 * The transport every real adapter takes: a `fetch` and a base URL, each with the provider's own
 * as its default (Gate 2, finding 3 of the gate review). It is what lets a recorded response be
 * served without a network, and it is how checks 3 and 6 to 16 are run at all (S-111, S-114).
 *
 * A base URL is a SETTING the composition root reads, so a service in a process of its own can be
 * pointed at recorded wire; a `fetch` is not, because a function cannot be written in an
 * environment — a test that hands one is calling an adapter in its own process.
 */
export interface Transport {
  fetch?: typeof globalThis.fetch
  /** Where MiniMax is. Defaults to `MINIMAX_BASE_URL` (S-114). One host, one setting (S-123). */
  minimaxBaseUrl?: string
  /** Where fal's QUEUE is. Defaults to `FAL_BASE_URL`. */
  falBaseUrl?: string
  /**
   * Where fal's STORAGE is. Defaults to `FAL_STORAGE_BASE_URL`. fal is two hosts, so it is two
   * settings: one of them left pointing at the internet while the other is pointed at recorded
   * wire is how a suite reaches the network by accident, which S-111 exists to prevent (S-124).
   */
  falStorageBaseUrl?: string
}

/** What every port is built with: the settings a real adapter and a stand-in both need. */
export interface PortOptions {
  /** The ONE artifact root every file goes under (D-086, D-087). */
  artifactRoot: string
  /** The model id each role is routed to (D-006, S-037). */
  models: Readonly<Record<ModelRole, string>>
  /** ffmpeg and ffprobe, found on PATH by name (S-075). */
  tools: FfmpegTools
  /** What the stand-ins answer from. Absent: nothing, as before (S-116). */
  standIn?: StandInScripts
  /** Where a key is read from. Defaults to this process's environment (S-109). */
  env?: Env
  /** Where a real adapter sends, and what it sends with. Each part defaults to the provider's. */
  transport?: Transport
  /**
   * Which admitted entry the image port is configured with (D-028). Absent: the configured
   * default, `CONFIGURED_IMAGE_SLUG`. A slug outside the closed registry is refused before the
   * port is built, so before any request is made.
   */
  falImageSlug?: string
}

/** A name that is not in the port's closed set. Read before anything is built (S-108). */
function unknownAdapter(port: ProviderPort, name: string): never {
  const adapters = PROVIDER_ADAPTERS[port].join(', ')
  throw new Error(`the ${port} port was told '${name}', which is not one of ${adapters} (S-108)`)
}

/**
 * A name from a port's closed set, or a refusal naming the port, the name and the set (S-108).
 * Whoever reads settings calls this, so the wording of that refusal lives in one place — here,
 * beside the factories, rather than once per composition root.
 */
export function adapterName<P extends ProviderPort>(port: P, name: string): ProviderSettings[P] {
  if (!PROVIDER_ADAPTERS[port].includes(name)) unknownAdapter(port, name)
  return name as ProviderSettings[P]
}

/** A real adapter named with no key to reach it (S-109). Never names the key's value. */
function missingKey(port: ProviderPort, name: string, keyName: string): never {
  throw new Error(
    `the ${port} port was told '${name}', and ${keyName} is not in the environment (S-109)`,
  )
}

export function modelPort(name: ModelAdapter, options: PortOptions): LanguageModelPort {
  if (name === STAND_IN) return fakeModel(options.standIn?.model ?? {}, { models: options.models })
  if (name === 'minimax') {
    // THE FIRST REAL ADAPTER (paid-path's Slice 3). Its key is read here, from `env.ts` and
    // nowhere else, and an absent one refuses before anything is built — a key cannot be guessed
    // later, and a service that started without one would fail after it had spent (S-109).
    const key = minimaxKey(options.env)
    if (key === undefined) missingKey('model', name, MINIMAX_KEY)
    return minimaxModel({
      key,
      models: options.models,
      baseUrl: options.transport?.minimaxBaseUrl,
      fetch: options.transport?.fetch,
    })
  }
  return unknownAdapter('model', name)
}

export function imagePort(name: ImageAdapter, options: PortOptions): ImagePort {
  if (name === STAND_IN) {
    return fakeImage(options.standIn?.images ?? {}, { artifactRoot: options.artifactRoot })
  }
  if (name === 'fal') {
    // THE THIRD REAL ADAPTER (paid-path's Slice 5), and the first on a second key. Its key is read
    // here, from `env.ts` and nowhere else, and an absent one refuses before anything is built.
    // The ENTRY is resolved before the port is built too, so a slug outside D-028's closed
    // registry, or one that does not advertise reference pictures, refuses with nothing sent.
    const key = falKey(options.env)
    if (key === undefined) missingKey('image', name, FAL_KEY)
    return falImage({
      key,
      entry: imageEntry(options.falImageSlug),
      artifactRoot: options.artifactRoot,
      baseUrl: options.transport?.falBaseUrl,
      storageBaseUrl: options.transport?.falStorageBaseUrl,
      fetch: options.transport?.fetch,
    })
  }
  return unknownAdapter('image', name)
}

export function sensorPort(name: SensorAdapter, options: PortOptions): PictureSensorPort {
  if (name === STAND_IN) return fakeSensors(options.standIn?.sensors ?? {})
  if (name === 'local') {
    // THE FIFTH AND LAST REAL ADAPTER (paid-path's Slice 7), and the only one with NO KEY AT ALL:
    // it is the ffmpeg this repository already requires, reading a file already on this machine
    // (S-075, S-112). So there is no key to read, nothing to spend, and no transport — the one
    // thing it cannot do locally, reading text, is a call the PIPELINE hands it, made from the
    // model port that gate was given, so the receipt lands where every other does (S-126).
    //
    // It is handed the TOOLS and not a model port, for S-125's reason: a port is built once at
    // startup and `recordingPort` wraps per run, so a model port handed here would be the
    // unwrapped one and its receipts would be lost.
    return ffmpegSensors(options.tools)
  }
  return unknownAdapter('sensor', name)
}

export function videoPort(name: VideoAdapter, options: PortOptions): VideoPort {
  if (name === STAND_IN) {
    return fakeVideo(options.tools, options.standIn?.video ?? {}, {
      artifactRoot: options.artifactRoot,
    })
  }
  if (name === 'fal') {
    // THE FOURTH REAL ADAPTER (paid-path's Slice 6), on the same key and the same two hosts as the
    // image port. Its key is read here, from `env.ts` and nowhere else, and an absent one refuses
    // before anything is built (S-109).
    const key = falKey(options.env)
    if (key === undefined) missingKey('video', name, FAL_KEY)
    return falVideo({
      key,
      artifactRoot: options.artifactRoot,
      // THE PROBE IS THE ENGINE'S ONE PROBE (S-125). `PortOptions` carries the tools, and the
      // image port was deliberately not handed them — it reads four bytes of a file header, which
      // is not worth a process a keyframe (S-124). A clip is a container, and the question "is
      // this a readable clip" already has exactly one answer in this repository: the ffmpeg
      // `MediaPort`'s probe. It is built here from the tools every other ffmpeg port is built
      // from, so `fal/` imports no ffmpeg and there is no second implementation to disagree.
      probe: ffmpegMedia(options.tools, { artifactRoot: options.artifactRoot }).probe,
      baseUrl: options.transport?.falBaseUrl,
      storageBaseUrl: options.transport?.falStorageBaseUrl,
      fetch: options.transport?.fetch,
    })
  }
  return unknownAdapter('video', name)
}

export function narrationPort(name: NarrationAdapter, options: PortOptions): NarrationPort {
  if (name === STAND_IN) {
    return fakeNarration(options.standIn?.narration ?? {}, { artifactRoot: options.artifactRoot })
  }
  if (name === 'minimax') {
    // THE SECOND REAL ADAPTER (paid-path's Slice 4), on the SAME key and the SAME base URL as the
    // model: one provider, one host, one setting (S-123). Its key is read here, from `env.ts` and
    // nowhere else, and an absent one refuses before anything is built (S-109).
    const key = minimaxKey(options.env)
    if (key === undefined) missingKey('narration', name, MINIMAX_KEY)
    return minimaxNarration({
      key,
      artifactRoot: options.artifactRoot,
      baseUrl: options.transport?.minimaxBaseUrl,
      fetch: options.transport?.fetch,
    })
  }
  return unknownAdapter('narration', name)
}
