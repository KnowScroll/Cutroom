import type { RunResult } from '@cutroom/reel-contract'

// The picture shapes and the two ports that touch pixels (docs/features/reel-stills.md, Gate 3).
// Types only: no adapter, no file, no default lives here. A stage is HANDED an ImagePort, a
// PictureSensorPort and a StillsRecorder; it never reaches for one (S-021, S-038).

/** A picture on this machine: its id, and the file it was written to. Never bytes (D-087). */
export interface PictureRef {
  /** `a<attempt>-shot-<unit>-<label>` — the attempt is in the id, so a restart reuses none (S-046). */
  pictureId: string
  /** Absolute, under the artifact root, which is one setting with a default in this repo (D-086). */
  path: string
}

export interface ImageRequest {
  runId: string
  pictureId: string
  prompt: string
  /** The chosen canonical, or none. One hop, never a chain (D-026, D-038). */
  references: readonly PictureRef[]
  aspectRatio: '9:16'
}

export interface ImageReceipt {
  model: string
  /** 0 from the stand-in unless a test scripts a cost on it (S-036). */
  costCents: number
  fake: boolean
}

export type ImageAnswer =
  | { kind: 'made'; picture: PictureRef; receipt: ImageReceipt }
  | {
      /** Only the worker's guarded port refuses; a provider adapter never reads a budget (S-035). */
      kind: 'refused'
      limit: Extract<RunResult, { reason: 'budget' }>['limit']
      estimateCents: number
    }

export interface ImagePort {
  /** D-026: a port that cannot carry a reference cannot make a derived picture from a canonical. */
  readonly acceptsReferences: boolean
  generate(request: ImageRequest): Promise<ImageAnswer>
}

/**
 * What the sensors read off the file itself. `sharpness` and `brightness` are 0..1 (S-044).
 *
 * `brightness` is D-031's and Gate 3's "exposure" under another name: D-096's `Confirmed-by` bans a
 * field named `exposure` ANYWHERE in this repository, for KnowScroll's epistemic meaning, and
 * `reel-plan`'s check 5 enforces it over live source. The owner chose the rename over an exception
 * to that check, so no rule gains a hole (S-050).
 */
export interface PictureMeasure {
  readable: boolean
  width: number
  height: number
  sharpness: number
  brightness: number
}

/**
 * The ONE model call the text step makes, handed to the sensor by whoever holds the model port
 * (S-126). A picture in; the model's answer out, unparsed, exactly as `observe` returns one.
 *
 * It is a FUNCTION and not a `LanguageModelPort` for two reasons. `model.ts` already depends on
 * this file, so a port type here would be a cycle, which `no-circular` forbids. And a sensor
 * needs one call, not a port — S-125's reason for handing the video adapter a probe rather than
 * the whole `MediaPort`.
 *
 * Whoever passes it decides which port the call goes through, which is the point: the pipeline
 * passes the model port it was handed, and inside a worker that is the RECORDING one, so the
 * call writes its `model_receipt` row like every other (D-084, D-006).
 */
export type PictureTextReader = (picture: PictureRef) => Promise<unknown>

/**
 * The pixel work `pipeline-no-io` forbids inside the pipeline, behind a port (S-038). Gate 1's
 * technical and text steps and Gate 1S's similarity are the three things that must read a file.
 *
 * `measure` and `similarity` are handed no reader and can reach none: they are local, free and
 * deterministic, and "no model call, no spend" is true of them by construction (S-112).
 */
export interface PictureSensorPort {
  measure(picture: PictureRef): Promise<PictureMeasure>
  readText(picture: PictureRef, read: PictureTextReader): Promise<string[]>
  /** A cosine over the two whole pictures, -1..1 (S-045). */
  similarity(a: PictureRef, b: PictureRef): Promise<number>
}

export type Framing = 'closeUp' | 'medium' | 'wide' | 'extremeWide'

/**
 * What the witness answers: D-041's fields as amended by D-044's `clippedByEdge`. No `actions`
 * and no `eventOrder` — a still has no temporal block (D-041). The port types this `unknown`; the
 * pipeline parses it at the gate boundary, which is where a malformed answer is caught (S-042).
 */
export interface WitnessObservation {
  entities: Array<{
    label: string
    count: number
    position: 'left' | 'centre' | 'right'
    prominence: 'foreground' | 'midground' | 'background'
    faceVisible: 'yes' | 'partial' | 'no' | 'noFace'
    occluded: boolean
    clippedByEdge: boolean
  }>
  framing: Framing
  setting: string
  lighting: 'bright' | 'dim' | 'mixed' | 'silhouette'
  readableTextPresent: boolean
  ambiguities: string[]
  unsafeDepictions: string[]
}

/** What the reconciler answers, and what code made of it: `failed` is computed, never read (S-040). */
export interface Reconciliation {
  subjects: Array<{ id: string; entity: number | null; countMatches: boolean }>
  criteria: Array<{ id: string; shown: boolean; entity: number | null }>
  failed: string[]
}

/** The score's five terms: three reference, two technical. `brightness` is D-031's "exposure" (S-050). */
export type KeyframeTerm = 'faceVisible' | 'unoccluded' | 'prominence' | 'sharpness' | 'brightness'

/** Every term in (0, 1] and the total finite and above 0, so a score never rejects (S-044, I-16). */
export interface KeyframeScore {
  terms: Record<KeyframeTerm, number>
  /** As used, after defaults, so a score replays from its row (D-031 rule 5). */
  weights: Record<KeyframeTerm, number>
  total: number
}

type Outcome = 'accept' | 'fail'

/** One entry per picture made, with each check it reached, whatever ended the run (S-046). */
export interface PictureRecord {
  pictureId: string
  /** The keyframes job's attempt: an earlier attempt's pictures stay under their own (S-048). */
  attempt: number
  shotUnit: number
  subjectId: string
  /** `standalone`: made once, from scratch, on a shot naming no pictured subject (S-150). */
  role: 'canonical' | 'derived' | 'standalone'
  label: string
  path: string
  prompt: string
  framing: Framing | null
  references: string[]
  /** The run's image-call number, 1..6 (D-027, S-046). */
  seq: number
  gate1: {
    /** Null until technical fails or reconcile completes: a cut-off verdict decides nothing (D-041, D-042). */
    outcome: Outcome | null
    coverage: 'whole picture'
    steps: Array<{
      step: 'technical' | 'text' | 'witness' | 'reconcile'
      outcome: Outcome
      reasons: string[]
    }>
  } | null
  measure: PictureMeasure | null
  text: string[] | null
  observation: WitnessObservation | null
  reconciliation: Reconciliation | null
  score: KeyframeScore | null
  gate1s: {
    outcome: Outcome
    coverage: 'pair'
    compared: boolean
    suspicion: number | null
    answer: Array<{ subject: string; same: 'yes' | 'no' }> | null
    /** The shared subjects the judge answered no, which a repair is told (S-045). */
    reasons: string[]
  } | null
  /** On the shot's last failing picture, one of I-4's four labels (D-025). */
  degradation: string | null
  chosen: boolean
}

/** The stage's one way to make its progress durable — handed to it like every other port (S-046). */
export interface StillsRecorder {
  record(picture: PictureRecord): Promise<void>
}
