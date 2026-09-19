import type { RunResult } from '@cutroom/reel-contract'
import type { WordTiming } from './narration.ts'
import type { PictureRef, WitnessObservation } from './picture.ts'

// The clip shapes, the video and media ports, and the records the clips stage keeps
// (docs/features/reel-render.md, Gate 3; S-071, S-072). Types only: no adapter, no file, no default
// lives here. A stage is HANDED a VideoPort, a MediaPort and a ClipsRecorder; it never reaches for
// one (S-021, S-075).

/** A clip on this machine: its take id, and the file it was written to. Never bytes (D-087). */
export interface ClipRef {
  /** `a<attempt>-shot-<unit>-take-<n>` — the attempt is in the id, so a restart reuses none (S-076). */
  takeId: string
  /** Absolute, under the artifact root (D-086). */
  path: string
}

interface VideoRequestFields {
  runId: string
  takeId: string
  prompt: string
  /** Whole seconds, 5..15 (D-019, S-023, S-070). */
  durationSeconds: number
  /** D-007, D-014. */
  resolution: '768P'
  /** The take id's CRC-32, made by the caller and recorded (D-018). */
  seed: number
  /** Recorded on every receipt (D-072). */
  promptExpansionMode: string
}

/**
 * From the shot's chosen picture, or from words with the 9:16 D-019 calls a trap. No
 * `reference-to-video` mode and no end image (D-026, D-037). The validator at the worker's port holds
 * the same two rules at run time, for a request the type never saw (D-071, S-071).
 */
export type VideoRequest =
  | (VideoRequestFields & { mode: 'image-to-video'; image: PictureRef; aspectRatio?: never })
  | (VideoRequestFields & { mode: 'text-to-video'; aspectRatio: '9:16'; image?: never })

export interface VideoReceipt {
  model: string
  /** The provider's request id (D-028). */
  requestId: string
  /** 0 from the stand-in unless a test scripts a cost on it (S-036). */
  costCents: number
  fake: boolean
  /** What the provider made of the prompt; never shown to Gate 4 or 5 (D-072). */
  expandedPrompt: string
}

export type VideoAnswer =
  | { kind: 'made'; clip: ClipRef; receipt: VideoReceipt }
  | {
      /** Only the worker's guarded port refuses; a provider adapter never reads a budget (S-035). */
      kind: 'refused'
      limit: Extract<RunResult, { reason: 'budget' }>['limit']
      estimateCents: number
    }
  /**
   * The provider made nothing and may if asked again (S-096). Only a provider answers it; the
   * worker's guarded port sends the call again, and it is never a take (I-11). It carries a detail
   * and nothing else.
   */
  | { kind: 'unavailable'; detail: string }

export interface VideoPort {
  generate(request: VideoRequest): Promise<VideoAnswer>
}

/** What ffprobe says of a file (I-17). */
export interface MediaProbe {
  readable: boolean
  durationSeconds: number
  video: { codec: string; width: number; height: number; fps: number; frames: number } | null
  audio: { codec: string; sampleRate: number; channels: number } | null
  /** For an MP4: does `moov` precede `mdat` (D-056). Null for any other file. */
  moovFirst: boolean | null
}

/** One ffmpeg pass over a clip (S-072). */
export interface ClipScan {
  /** Each at least the `blackSeconds` the scan was handed. */
  black: Array<{ startSeconds: number; seconds: number }>
  /** Each at least the `frozenSeconds` the scan was handed. */
  frozen: Array<{ startSeconds: number; seconds: number }>
  silent: Array<{ startSeconds: number; seconds: number }>
  loudnessLufs: number | null
}

export interface ClipSound {
  speech: boolean
  music: boolean
}

/**
 * The file work `pipeline-no-io` forbids inside the pipeline, behind a port (S-075): measuring a
 * narration, a clip and the output, and cutting Gate 7's frame strip. Built in packages/providers,
 * the only place a process may be started.
 */
export interface MediaPort {
  /** Rejects naming a missing tool, encoder or filter (S-075). */
  ready(): Promise<void>
  probe(file: { id: string; path: string }): Promise<MediaProbe>
  scan(clip: ClipRef, shortest: { blackSeconds: number; frozenSeconds: number }): Promise<ClipScan>
  readText(clip: ClipRef): Promise<string[]>
  listen(clip: ClipRef): Promise<ClipSound>
  /** PNGs under the artifact root; refuses an id whose path would leave it (D-086). */
  frames(
    file: { runId: string; renderId: string; path: string },
    atSeconds: readonly number[],
  ): Promise<PictureRef[]>
}

/**
 * The witness's answer on a clip: a still's, with D-041's temporal block, which is required here and
 * refused on a still. One witness, one contract, two inputs (D-053).
 */
export type ClipObservation = WitnessObservation & {
  actions: Array<{ entity: string; verb: string; completes: boolean }>
  eventOrder: string[]
}

/** What the reconciler answered for a take, and what code made of it: `failed` is computed (S-072). */
export interface ClipReconciliation {
  subjects: Array<{ id: string; entity: number | null; countMatches: boolean }>
  criteria: Array<{ id: string; shown: boolean; entity: number | null }>
  failed: string[]
}

type Outcome = 'accept' | 'fail'

export interface TakeVerdict {
  gate: '2' | '3' | '4' | '5'
  outcome: Outcome
  reasons: string[]
  /** I-6. Gates 2 and 3 `whole file`; Gate 4 `full` with its limitation (D-051); Gate 5 `observation`. */
  coverage:
    | { strategy: 'whole file' }
    | { strategy: 'full'; limitations: string[] }
    | { strategy: 'observation' }
}

/** A take's number among its shot's decided takes: three a shot, counted when decided (D-024, S-094). */
export type TakeNumber = 1 | 2 | 3

/** One entry per take made, with each gate it reached, whatever ended the run (S-072). */
export interface TakeRecord {
  takeId: string
  /** The clips job's attempt. */
  attempt: number
  shotUnit: number
  number: TakeNumber
  mode: VideoRequest['mode']
  /** The chosen picture of an image-to-video take. */
  pictureId: string | null
  /** Text-to-video because the shot's picture was degraded (D-050 step 2). */
  degraded: boolean
  prompt: string
  durationSeconds: number
  seed: number
  requestId: string
  expandedPrompt: string
  path: string
  probe: MediaProbe | null
  scan: ClipScan | null
  words: string[] | null
  sound: ClipSound | null
  observation: ClipObservation | null
  reconciliation: ClipReconciliation | null
  /** In gate order, each once completed. */
  verdicts: TakeVerdict[]
  /** Null until Gate 2 fails or Gate 5 completes. */
  outcome: Outcome | null
  /** A hold's reason, written with the assemble job's ending (S-073). */
  degradation: string | null
}

/**
 * One entry per narration made (S-070). Declared here rather than beside the narration port: the
 * recorder below takes it, and a record whose probe is a `MediaProbe` in narration.ts would make the
 * two files import each other, which `no-circular` refuses (S-079).
 */
export interface NarrationRecord {
  narrationId: string
  attempt: number
  shotUnit: number
  text: string
  path: string
  /** Once parsed. */
  words: WordTiming[] | null
  /** Once measured. */
  probe: MediaProbe | null
}

/** The clips stage's one way to make its progress durable — handed to it like every other port. */
export interface ClipsRecorder {
  /** Upserted after every change. */
  take(take: TakeRecord): Promise<void>
  narration(narration: NarrationRecord): Promise<void>
}
