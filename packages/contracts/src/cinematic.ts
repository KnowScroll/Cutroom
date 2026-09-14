import type { Criterion, PlanVaryOn } from '@cutroom/reel-contract'

// The plan shapes (docs/features/reel-plan.md, Gate 3). `PlanVaryOn` and `Criterion` are declared
// only in the contract and reused here (D-099), so a caller and the engine read one definition.

/** The axis two plans differ on when a request names none (D-092). Provisional until M-1. */
export const DEFAULT_PLAN_VARY_ON: PlanVaryOn = 'shotCount'

/** A subject the planner names once (D-029 part 1). */
export interface PlanSubject {
  id: string
  name: string
}

/** One narration unit is one shot (D-070). */
export interface PlanShot {
  unit: number
  durationSeconds: number
  subjectIds: string[]
}

export interface Plan {
  role: 'a' | 'b' | 'repair'
  /** Sentence positions per unit, contiguous and in order (D-073, D-107). */
  units: readonly (readonly number[])[]
  shots: PlanShot[]
  subjects: PlanSubject[]
  /** Every supplied criterion, copied by code with its id and text — never by the model (D-034). */
  criteria: { mustShow: Criterion[]; mustNotShow: Criterion[] }
  /** Computed by code after the call (D-035, D-027): at most 4. */
  plannedImageCalls: number
  /** Integer cents, computed by code after the call (D-035, D-083). */
  estimateCents: number
}

/** Two plans of the same words, and the axis they differ on — required, never defaulted here (D-062, D-078). */
export interface PlanFork {
  axis: PlanVaryOn
  a: Plan
  b: Plan
}

export type Gate0Condition = 'coverage' | 'criteria' | 'shape' | 'cost'

/** All four conditions are checked, and every one that fails is recorded (D-114). */
export interface Gate0Verdict {
  outcome: 'accept' | 'fail'
  failed: Gate0Condition[]
}

/**
 * The plan score, computed only when both plans survive Gate 0 (D-064, D-113): a weighted sum with
 * non-negative weights over terms between 0 and 1. `terms` is keyed as the settings' weights are.
 */
export interface PlanScore {
  terms: Record<string, number>
  total: number
}
