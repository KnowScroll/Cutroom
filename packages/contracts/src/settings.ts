import type { ModelRole } from './model.ts'

// What planning reads from settings rather than from code (docs/features/reel-plan.md, Gate 2).
// The type only; the defaults arrive with the code that reads them.

export interface PlanSettings {
  /** The two unit counts a `shotCount` fork cuts the narration into (D-112). Default [4, 6]. */
  shotCountUnits: readonly [number, number]
  /** Gate 0's total-duration bounds, in seconds (D-111). Default [35, 45]. */
  totalSecondsBounds: readonly [number, number]
  /** Cents per image call (D-083). */
  imageRateCents: number
  /** Cents per second of video (D-083). */
  videoRateCentsPerSecond: number
  /** The model id each role is routed to (D-006). */
  models: Record<ModelRole, string>
  /** The plan score's four closed questions and every weight — provisional until M-1 (D-064). */
  score: { questions: readonly [string, string, string, string]; weights: Record<string, number> }
}
