import type { ModelRole } from './model.ts'
import type { Framing, KeyframeTerm } from './picture.ts'
import type { GateProfile, OutputProfile } from './render.ts'

// What planning, the stills stage and the render read from settings rather than from code
// (docs/features/reel-plan.md, Gate 2; docs/features/reel-stills.md and reel-render.md, Gate 3).
// The types only; the defaults arrive with the code that reads them.

export interface PlanSettings {
  /** The two unit counts a `shotCount` fork cuts the narration into (D-112). Default [4, 6]. */
  shotCountUnits: readonly [number, number]
  /** Gate 0's total-duration bounds, in seconds (D-111). Default [35, 45]. */
  totalSecondsBounds: readonly [number, number]
  /** Cents per image call (D-083). */
  imageRateCents: number
  /** Cents per second of video (D-083). */
  videoRateCentsPerSecond: number
  /** The model id each of the four roles is routed to (D-006, S-037). */
  models: Record<ModelRole, string>
  /** The plan score's four closed questions and every weight — provisional until M-1 (D-064). */
  score: { questions: readonly [string, string, string, string]; weights: Record<string, number> }
}

export interface StillsSettings {
  /**
   * The two framing values the canonical's candidates render, and the one axis they differ on
   * (D-032, S-044). Default ['medium', 'wide']; two equal values make the two prompts identical,
   * and a worker handed them refuses to start.
   */
  canonicalFraming: readonly [Framing, Framing]
  /** The keyframe score's weights — provisional until M-1 (D-031). Default 2, 2, 2, 1, 1. */
  scoreWeights: Record<KeyframeTerm, number>
  /** Above this suspicion Gate 1S asks the judge — provisional until M-1 (D-049). Default 0.25. */
  suspicionThreshold: number
}

export interface RenderSettings {
  /** Default 768 × 1366 at 24 fps, 48 kHz, two channels — provisional until M-7 (D-055). */
  profile: OutputProfile
  /** Default `{ id: 'phase-1', gates: GATE_ORDER }`; exactly one profile is defined (S-067). */
  gateProfile: GateProfile
  /** Default 0: T2A is covered by the token plan (D-019, S-070). */
  narrationRateCentsPerCharacter: number
  voice: string
  /** Default `balanced`, the only value the research read (D-072, O-20). */
  promptExpansionMode: string
  /** Gate 2's thresholds: 0.01, 0.5 s and 1.0 s — provisional until M-1 (S-072). */
  technical: { aspectTolerance: number; blackSeconds: number; frozenSeconds: number }
  captionStyle: { id: string; fontName: string; fontSize: number; marginV: number }
  /** How far a clip's sound sits under the narration. Default 18 (S-073). */
  duckDb: number
  /** Gate 7's five closed questions, each answered yes when the cut is right — provisional until M-1 (S-074). */
  cutQuestions: readonly [string, string, string, string, string]
  /**
   * A video or narration call answered `unavailable` is sent again, up to `maxAttempts` sends in all,
   * waiting `backoffMs` before the second and twice the last wait before each next (D-024, I-11,
   * S-096). Default 3 and 1000; a worker handed a `maxAttempts` that is not a whole number of at least
   * 1, or a `backoffMs` that is not a finite number of at least 0, refuses to start.
   */
  transient: { maxAttempts: number; backoffMs: number }
  /**
   * A shot held on its picture is pushed in from a zoom of 1 at its span's first frame to `endZoom` at
   * its last (D-025, S-097). Default 1.1 — provisional until M-1; a worker handed an `endZoom` that is
   * not a finite number above 1 refuses to start.
   */
  stillPush: { endZoom: number }
}
