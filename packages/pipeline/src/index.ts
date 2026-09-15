// Pure functions: the planning stage and what it computes (docs/features/reel-plan.md, Gate 3).
// No database, no provider, no filesystem, no network. The splitter is not exported: the planning
// stage is its one caller (D-073).

export { estimate } from './estimate.ts'
export { GATE_ORDER, gate0 } from './gates/index.ts'
export {
  DEFAULT_PLAN_SETTINGS,
  planForkSchema,
  planReel,
  type PlanOutcome,
  type PlanRecord,
} from './plan/index.ts'
export { planningAnswer, scoreAnswer } from './plan/prompts.ts'
export { scorePlan } from './plan/score.ts'
export { plannedImageCalls, rankSubjects } from './rank.ts'
