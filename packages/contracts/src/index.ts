// The engine's internal shapes and its ports, as types (S-010). The caller-facing types stay in
// @cutroom/reel-contract, the one internal package this may import (D-099).

export {
  DEFAULT_PLAN_VARY_ON,
  type Gate0Condition,
  type Gate0Verdict,
  type Plan,
  type PlanFork,
  type PlanScore,
  type PlanShot,
  type PlanSubject,
} from './cinematic.ts'
export type { LanguageModelPort, ModelReceipt, ModelRole } from './model.ts'
export type { PlanSettings } from './settings.ts'
