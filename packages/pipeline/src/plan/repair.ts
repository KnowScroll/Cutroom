import type { Gate0Verdict, Plan } from '@cutroom/contracts'

// D-114's choice (docs/features/reel-plan.md, Gate 2 "Selection, repair and how a run ends"). When
// both plans fail Gate 0, the one repair call works from the grouping of the plan that came closest
// to passing — chosen here, by counting, before the call. It imports no port type: it is handed
// two plans' figures and verdicts and never asks a model anything.

/**
 * Which plan's grouping the repair keeps: the one that failed fewer of Gate 0's conditions; if
 * they failed as many, the one with the lower estimate; if still tied, `a` — the 4-unit plan at
 * the default settings, planned first, as a tied plan score also goes to it (S-024).
 */
export function repairBasis(
  plans: { a: Pick<Plan, 'estimateCents'>; b: Pick<Plan, 'estimateCents'> },
  verdicts: { a: Gate0Verdict; b: Gate0Verdict },
): 'a' | 'b' {
  const failedA = verdicts.a.failed.length
  const failedB = verdicts.b.failed.length
  if (failedA !== failedB) return failedB < failedA ? 'b' : 'a'
  if (plans.a.estimateCents !== plans.b.estimateCents) {
    return plans.b.estimateCents < plans.a.estimateCents ? 'b' : 'a'
  }
  return 'a'
}
