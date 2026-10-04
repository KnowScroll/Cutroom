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

## The seven ports: five chosen by setting, two always ffmpeg

Five ports are chosen by one setting each, `CUTROOM_PROVIDER_<PORT>`, from a closed set whose
default is the stand-in `fake` (S-108):

| Port                | Type                                  | Setting value for the real adapter                      |
| ------------------- | ------------------------------------- | ------------------------------------------------------- |
| `LanguageModelPort` | `packages/contracts/src/model.ts`     | `CUTROOM_PROVIDER_MODEL=minimax`                        |
| `ImagePort`         | `packages/contracts/src/picture.ts`   | `CUTROOM_PROVIDER_IMAGE=fal`                            |
| `PictureSensorPort` | `packages/contracts/src/picture.ts`   | `CUTROOM_PROVIDER_SENSOR=local` (ffmpeg, no key; S-126) |
| `VideoPort`         | `packages/contracts/src/clip.ts`      | `CUTROOM_PROVIDER_VIDEO=fal`                            |
| `NarrationPort`     | `packages/contracts/src/narration.ts` | `CUTROOM_PROVIDER_NARRATION=minimax`                    |

Two more are not settings at all: `MediaPort` (`packages/contracts/src/clip.ts`) and
`AssemblerPort` (`packages/contracts/src/render.ts`) are always `ffmpegMedia` and
`ffmpegAssembler` on this machine (S-075), stand-in runs included. The ffmpeg media port's probe,
scan and frame strip are real; its `readText` (words on a clip) and `listen` (speech or music)
answer from the stand-in script's `media` entry, defaulting to no words and neither.

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
- `narration.ts` (`minimaxNarration`): T2A speech synthesis (`speech-2.8-hd`). The audio arrives
  hex-encoded and is written under the artifact root; the answer carries its path and the word
  timings, fetched from a presigned subtitle URL.
- `wire.ts`: `MINIMAX_BASE_URL` and the shared answer to "would asking again help?".

### `packages/providers/src/fal/` — image and video

- `image.ts` (`falImage`): against `fal-ai/flux-2-pro/edit` (or any closed-set entry —
  `registry.ts`). Uploads reference pictures, calls the model, polls until ready, downloads
  the result. The artifact goes under `artifactRoot`.
- `video.ts` (`falVideo`): against `fal-ai/minimax-h3-turbo/image-to-video` or
  `…/text-to-video` — D-007's one hard-locked path, not a registry. Always 768P, whole seconds 5
  to 15. Two hosts: `falBaseUrl` (queue) and `falStorageBaseUrl` (storage).
- `registry.ts`: `IMAGE_REGISTRY` is a closed registry of four admitted entries
  (`fal-ai/flux-2-pro/edit`, the configured default; `fal-ai/nano-banana-pro/edit`;
  `fal-ai/nano-banana-2/edit`; `bytedance/seedream/v5/lite/edit`), each with its rate as data.
  `imageEntry(slug)` refuses before the port is built if the slug is outside the registry
  (D-028). With a real image port, the entry's rate is what the worker prices at (S-124).
  `PICTURE_FRAME` is 864 × 1536, the size every picture is asked for.
- `queue.ts`: fal is a queue — submit, poll the request's status, fetch the result.
- `frame.ts`: reads a picture's dimensions from the file's own bytes, never from fal's answer, to
  enforce the 9:16 frame (D-028).
- `h3.ts`: the H3 path as data — slugs, 768P, 5–15 s, 0.5¢ a second, and
  `DEFAULT_VIDEO_WAIT_MS` (10 minutes a clip).
- `upload.ts`: puts a local picture on fal's storage so an edit or image-to-video call can use
  it.

(The rendered reel's own size is the output profile, 768 × 1366, set in the render settings.)

### `packages/providers/src/ffmpeg/` — media, assembler, sensors

- `media.ts` (`ffmpegMedia`): probe a file (codec, geometry, fps, audio sample rate,
  channels, frame count, moov-first), extract a frame strip at given timestamps.
- `assemble.ts` (`ffmpegAssembler`): burn captions, apply the still-push on held shots,
  produce one MP4 with the manifest's profile.
- `sensors.ts` (`ffmpegSensors`): measures a picture for Gate 1 (readable, size, sharpness,
  brightness) and the similarity of two pictures for Gate 1S, with ffmpeg filters. It has no key
  (S-075, S-112). Reading text off a picture is a model call (`readText`) the gate hands it,
  because this ffmpeg has no OCR filter (S-126).

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

The error classes live in `packages/contracts/src/failures.ts` — not in providers — because the
adapters throw them and the worker, which may not import providers, must catch them by class:

- `Spent` — the provider answered and the call was paid for, but the answer cannot be used (a
  body that does not parse, an answer not in the schema). It is never sent again; the worker
  writes a `lost_call` row and rethrows. A `structured` answer refused only for its shape is the
  one exception: the pipeline asks once more, as a new call told why (S-156).
- `Unavailable` — the provider made nothing and might if asked again (429, 5xx, connection
  error, timeout).
- `OffSpec` and `RefusedRequest` (both `Spent`), `Unanswered`, `ProviderFailed` and
  `StillUnavailable` (an `Unavailable`) — see "Failure kinds" below.

`packages/providers/src/transient.ts` only classifies an HTTP status as transient or not
(`transientStatus`). Adapters never retry. The worker does: a video, narration or model call
answered `Unavailable` is sent again, up to `transient.maxAttempts` sends in all (default `3`),
waiting `backoffMs` (default `1000`) and then twice the last wait (D-024, I-11, S-096). The
wrapping is in `apps/worker/src/{model-port,video-port,narration-port,transient}.ts`. An image
call has no such retry: an `Unavailable` there fails the run (kind `unavailable`, resumable).

## Failure kinds

`FailureKind` is decided where the error is caught, by the error's **class**, never its message
(`failureKindOf`, S-163):

- `unavailable` — `Unavailable` / `StillUnavailable`: the provider made nothing at every send.
  Resumable.
- `unreadable` — `Spent` (a paid answer that could not be used) or `Unanswered` (a gate refused
  the model's answer at its last ask). Resumable.
- `provider-failed` — `ProviderFailed`: fal accepted the job and then reported it failed.
  Resumable.
- `crashed` — never thrown: the stills stage returns it when a job claimed again after a crash can
  no longer make its pictures within six image calls. Resumable.
- `off-spec` — `OffSpec`: the provider made something this engine may never use (a picture whose
  frame the registry entry refuses). Never resumed.
- `engine` — everything else: a plain `Error`, a `ZodError`, a file-system or ffmpeg error, a 4xx,
  `RefusedRequest` (MiniMax refused our request), a cap that cannot be read, a stand-in out of its
  script. Never resumed.

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
The worker wraps the model port once in `retryingModelPort` at startup, and each job wraps it again
in `recordingPort` (a `model_receipt` per call). Each job attempt wraps the image port in
`guardedImagePort`, the video port in `validatingVideoPort(guardedVideoPort(…))` and the
narration port in `guardedNarrationPort`: each guard compares spend with the cap and the ceiling
before a call and writes the receipt after it. The sensor, media and assembler ports are used as
built.
