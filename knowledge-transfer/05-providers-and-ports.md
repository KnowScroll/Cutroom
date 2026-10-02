# 05 — Providers and ports

This document is a reference for the adapters behind the ports — the stand-ins and the real ones
(fal for images and videos, MiniMax for the model and narration, local ffmpeg for sensors and
the render). It also explains the port factories and the key-confinement rule.

## The principle

A **port** is a typed interface that the pipeline talks to; an **adapter** is a concrete
implementation behind it. The pipeline never imports an adapter. The composition root imports
the ports it needs (`LanguageModelPort`, `ImagePort`, `VideoPort`, `NarrationPort`,
`MediaPort`, `AssemblerPort`, `PictureSensorPort`) and asks `packages/providers/src/ports.ts`
to build them from settings. Each adapter is constructed in exactly one place.

Two consequences:
- The pipeline can be tested without a database, without a real provider, and without a key
  (every port has a stand-in).
- A provider key (`MINIMAX_KEY`, `FAL_KEY`) is read in exactly one place (`packages/providers`
  through `env.ts`). No other package, no app, no test may import one.

This is **S-021, S-038, S-108, S-109** — three rules read together.

## The five ports

| Port              | Type                                                | Real | Built when…                                        |
| ----------------- | --------------------------------------------------- | ---- | -------------------------------------------------- |
| `LanguageModelPort` | `packages/contracts/src/model.ts`                 | ✅   | `model: 'minimax'` is configured                    |
| `ImagePort`       | `packages/contracts/src/picture.ts`                 | ✅   | `image: 'fal'` is configured                       |
| `VideoPort`       | `packages/contracts/src/providers.ts`               | ✅   | `video: 'fal'` is configured                       |
| `NarrationPort`   | `packages/contracts/src/narration.ts`               | ✅   | `narration: 'minimax'` is configured               |
| `MediaPort`       | `packages/contracts/src/observation.ts`             | ✅   | always; ffmpeg on this machine (S-075)            |
| `AssemblerPort`   | `packages/contracts/src/render.ts`                  | ✅   | always; ffmpeg on this machine (S-075)            |
| `PictureSensorPort` | `packages/contracts/src/observation.ts`            | ✅   | `sensor: 'local'` (the only real option; S-126)    |

`MediaPort` and `AssemblerPort` have no stand-in — the local ffmpeg is the implementation.

## The factory

`packages/providers/src/ports.ts` has one factory per port. The shape:

```ts
export function imagePort(name: ImageAdapter, options: PortOptions): ImagePort {
  if (name === STAND_IN) return fakeImage(options.standIn?.images ?? {}, { artifactRoot: options.artifactRoot })
  if (name === 'fal') {
    const key = falKey(options.env)
    if (key === undefined) missingKey('image', name, FAL_KEY)
    return falImage({ key, entry: imageEntry(options.falImageSlug), artifactRoot: options.artifactRoot, … })
  }
  return unknownAdapter('image', name)
}
```

The pattern:

1. The name must be in `PROVIDER_ADAPTERS[port]`, otherwise `unknownAdapter` (S-108).
2. For a real one, `missingKey` refuses before the port is built (S-109). No fallback, no
   no-key default — a real name without a key refuses at startup, before the database is
   opened, before any job is claimed, before any provider is called.
3. The port is built with the entry it needs (e.g. `imageEntry(falImageSlug)`), the artifact
   root, the transport, and the optional `env` override.

The composition root (`apps/service/src/service.ts`) is the only place this is called. The
worker is handed the built ports it needs and never constructs one itself (`worker-no-providers`
rule).

## Real adapters — what they do

### `packages/providers/src/minimax/` — model and narration

- `model.ts` (`minimaxModel`): structured-output chat completion against MiniMax's chat path.
  Uses the `models` map from `PlanSettings` to route roles (`planner`, `reconciler`, `witness`,
  `judge`). M3 is the only model in the family that accepts images (D-006). The adapter is
  wrapped in `retryingModelPort` (`apps/worker/src/model-port.ts`) for transient failures.
- `narration.ts` (`minimaxNarration`): T2A speech synthesis. Returns audio bytes plus word
  timings.
- `wire.ts`: `MinimaxBaseUrl`, the constant for the base URL.

### `packages/providers/src/fal/` — image and video

- `image.ts` (`falImage`): against `fal-ai/flux-2-pro/edit` (or any closed-set entry —
  `registry.ts`). Uploads reference pictures, calls the model, polls until ready, downloads
  the result. The artifact goes under `artifactRoot`.
- `video.ts` (`falVideo`): against `minimax/h3-turbo` (D-007's hard-locked path), or any
  closed-set entry. Two hosts: `falBaseUrl` (queue) and `falStorageBaseUrl` (storage).
- `registry.ts`: `IMAGE_REGISTRY` is a closed registry of admitted entries. `imageEntry(slug)`
  refuses before the port is built if the slug is outside the registry (D-028). The entry's
  `imageRateCents` is what the worker prices at (S-124).
- `queue.ts`: fal is a queue — submit, poll until ready or `DEFAULT_VIDEO_WAIT_MS`.
- `frame.ts`: `PICTURE_FRAME` is the canonical aspect (768 × 1366 by default).
- `h3.ts`: H3 Turbo's specific settings.

### `packages/providers/src/ffmpeg/` — media, assembler, sensors

- `media.ts` (`ffmpegMedia`): probe a file (codec, geometry, fps, audio sample rate,
  channels, frame count, moov-first), extract a frame strip at given timestamps.
- `assemble.ts` (`ffmpegAssembler`): burn captions, apply the still-push on held shots,
  produce one MP4 with the manifest's profile.
- `sensors.ts` (`ffmpegSensors`): read pixels for Gate 1 (`observation.ts`). The sensor port
  has no key (S-075, S-112); it is ffmpeg on this machine.

## Stand-in adapters — `packages/providers/src/fake/`

The defaults. They keep the suite green without keys.

- `fake/model.ts`: the stand-in model port. **It deliberately throws if a script is not
  configured** (`STAND_IN_FAILURES` — see `fake/thrown.ts`). An engine with the stand-in
  model port and no script finishes a reel only when given a script (`S-116`).
- `fake/image.ts`, `fake/video.ts`, `fake/narration.ts`, `fake/sensors.ts`: the other stand-ins.
  Each takes an optional script; an absent script is an empty answer.
- `fake/thrown.ts`: `STAND_IN_FAILURES` is the closed set of failures the stand-ins raise.

## Stand-in scripts (`CUTROOM_STAND_IN_SCRIPT`)

The composition root reads `CUTROOM_STAND_IN_SCRIPT` (a JSON file) into `StandInScripts`. Each
field is optional; an absent one is an empty script. The full verified end-to-end is exercised
by `tests/paid-path-service.test.ts`.

Example shape (illustrative; see the `FakeScript` types in `packages/providers/src/fake/` for
the exact fields):

```json
{
  "model":   { … }, // answers to planning / score / repair / witness / gate-7 calls
  "images":  { … }, // picture calls
  "sensors": { … }, // sensor calls
  "video":   { … }, // clip calls
  "narration": { … }, // narration calls
  "media":   { … }  // media calls
}
```

## Key reading — `packages/providers/src/env.ts`

`MINIMAX_KEY` and `FAL_KEY` are read here, and **only here**, from `process.env` or the `env`
override. The composition root can pass an explicit `env` to the ports; otherwise the process's
environment is used.

`minimaxKey(env)` and `falKey(env)` return `string | undefined`. A real adapter with an
undefined key refuses at startup with `missingKey(port, name, keyName)` (S-109). No test
imports this file.

## Transport

Each real adapter takes a `Transport`:

- `fetch?: typeof globalThis.fetch` — a recorded-wire fetch (S-111).
- `minimaxBaseUrl?` — MiniMax's base URL.
- `falBaseUrl?` — fal's queue base URL.
- `falStorageBaseUrl?` — fal's storage base URL (a second host — S-124).

The two fal URLs are independent settings because **one can be pointed at recorded wire while
the other is pointed at the internet** is how a test reaches the network by accident
(S-124). Composition is on `apps/service`.

## Artifacts

Every file the engine writes — stills, clips, narrations, renders — goes under `artifactRoot`
(D-086, D-087). The default is `.artifacts/` inside the repository. No path is absolute, no
artifact escapes the configured root.

## Spent / unavailable / transient

`packages/providers/src/transient.ts` defines:

- `Spent` — a call that succeeded and added to the spent total.
- `Unavailable` — a call that the adapter could not make (network, 5xx).
- `isSpent`, `isUnavailable`, `messageOf` — helpers.
- `transientStatus(status)` — the transient classification.

A transient failure is sent again up to `transient.maxAttempts` times (default `3`), with
`backoffMs` between sends (default `1000` — D-024, I-11, S-096). The wrapping is in
`apps/worker/src/{model-port,video-port,narration-port}.ts`.

## Failure kinds

`FailureKind` is decided where the error is caught (S-163):

- `unavailable` — a transient failure the retries could not recover.
- `unreadable` — a file or response that the adapter could not parse.
- `provider-failed` — a non-transient provider error (e.g. the model returned a 4xx).
- `crashed` — an unhandled throw inside the adapter.
- `engine` — the engine's fault (a missing adapter, a bad input). Resume is not offered for
  `engine` failures.
- `off-spec` — the provider returned something off the contract's spec.

`failureKindOf(error)` is the one decision point.

## How ports are handed to the worker

The composition root (`apps/service/src/service.ts:114-120`):

```ts
const ports = {
  model: modelPort(providers.model, options),
  image: imagePort(providers.image, options),
  sensors: sensorPort(providers.sensor, options),
  video: videoPort(providers.video, options),
  narration: narrationPort(providers.narration, options),
}
```

These five ports, plus `media` (ffmpeg) and `assembler` (ffmpeg), are spread into `startWorker`.
The worker wraps the model port in `retryingModelPort`, the image port in `guardedImagePort`,
and the video and narration ports in their recorders. The wrapped ports are what every job's
context carries.