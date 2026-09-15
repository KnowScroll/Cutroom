import type { Gate0Condition, Gate0Verdict, Plan, PlanSettings } from '@cutroom/contracts'
import type { Criterion, SubmitRequest } from '@cutroom/reel-contract'

// Gate 0 (docs/features/reel-plan.md, Gate 2 "Gate 0"; D-063, D-111, D-114). Counting only: no
// model call, and it imports no port type. All four conditions are checked on every plan and each
// one that fails is recorded, so D-114 can count them.

/** D-014 and D-063: four to six shots. */
export const SHOT_COUNT: readonly [number, number] = [4, 6]
/** D-019: the video model takes 5 to 15 seconds. */
export const SHOT_SECONDS: readonly [number, number] = [5, 15]

const within = (value: number, [low, high]: readonly [number, number]) =>
  value >= low && value <= high

/** The claim ids referenced by a sentence in some shot's unit. */
export function claimsShown(plan: Plan, request: SubmitRequest): Set<string> {
  const shown = new Set<string>()
  for (const shot of plan.shots) {
    for (const position of plan.units[shot.unit] ?? []) {
      for (const id of request.narration[position]?.claimIds ?? []) shown.add(id)
    }
  }
  return shown
}

/** Every claim in the request's list is referenced by a sentence in some shot's unit. */
function covers(plan: Plan, request: SubmitRequest): boolean {
  const shown = claimsShown(plan, request)
  return request.claims.every((claim) => shown.has(claim.id))
}

/** Every supplied criterion is on the plan, in the same list, with the same id and text. */
function keepsCriteria(plan: Plan, request: SubmitRequest): boolean {
  const kept = (supplied: Criterion[], carried: Criterion[]) =>
    supplied.every((c) => carried.some((p) => p.id === c.id && p.text === c.text))
  return (
    kept(request.criteria.mustShow, plan.criteria.mustShow) &&
    kept(request.criteria.mustNotShow, plan.criteria.mustNotShow)
  )
}

function shaped(plan: Plan, s: PlanSettings): boolean {
  const total = plan.shots.reduce((sum, shot) => sum + shot.durationSeconds, 0)
  return (
    within(plan.shots.length, SHOT_COUNT) &&
    within(total, s.totalSecondsBounds) &&
    plan.shots.every((shot) => within(shot.durationSeconds, SHOT_SECONDS))
  )
}

export function gate0(
  plan: Plan,
  request: SubmitRequest,
  capCents: number,
  s: PlanSettings,
): Gate0Verdict {
  const failed: Gate0Condition[] = []
  if (!covers(plan, request)) failed.push('coverage')
  if (!keepsCriteria(plan, request)) failed.push('criteria')
  if (!shaped(plan, s)) failed.push('shape')
  if (!(plan.estimateCents <= capCents)) failed.push('cost')
  return { outcome: failed.length === 0 ? 'accept' : 'fail', failed }
}
