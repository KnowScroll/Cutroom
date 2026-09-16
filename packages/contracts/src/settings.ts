import type { ModelRole } from './model.ts'
import type { Framing, KeyframeTerm } from './picture.ts'

// What planning and the stills stage read from settings rather than from code
// (docs/features/reel-plan.md, Gate 2; docs/features/reel-stills.md, Gate 3). The types only; the
// defaults arrive with the code that reads them.

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
