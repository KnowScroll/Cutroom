import type { Plan, PlanScore, PlanSettings } from '@cutroom/contracts'
import type { SubmitRequest } from '@cutroom/reel-contract'
import { claimsShown } from '../gates/gate0.ts'
import { rankSubjects } from '../rank.ts'

// The plan score (docs/features/reel-plan.md, Gate 2 "The plan score"; D-064, D-113). It ranks two
// survivors and can reject nothing (I-16): every input gives a number, and this file has no throw.

/** The terms the four closed questions become, in the order the questions are asked. */
export const QUESTION_TERMS = ['order', 'pacing', 'juxtaposition', 'distinct'] as const

/** Share of the request's claims shown by some shot. A request with no claims has nothing uncovered. */
function coverage(plan: Plan, request: SubmitRequest): number {
  if (request.claims.length === 0) return 1
  const shown = claimsShown(plan, request)
  return request.claims.filter((c) => shown.has(c.id)).length / request.claims.length
}

/** Share of shots showing rank 1's subject (Gate 3, least confident 3). No rank 1, or no shots: 0. */
function recurrence(plan: Plan): number {
  const [first] = rankSubjects(plan)
  if (first === undefined || plan.shots.length === 0) return 0
  return plan.shots.filter((shot) => shot.subjectIds.includes(first)).length / plan.shots.length
}

/** A weight that is missing, negative or not a finite number counts as 0. */
const weightOf = (weight: number | undefined) =>
  typeof weight === 'number' && Number.isFinite(weight) && weight > 0 ? weight : 0

/**
 * The weighted sum of six terms, each between 0 and 1: claim coverage, subject recurrence, and one
 * term per closed question — 1 for `yes`, 0 for anything else. Higher is better.
 */
export function scorePlan(
  plan: Plan,
  request: SubmitRequest,
  answers: readonly ('yes' | 'no')[],
  settings: PlanSettings,
): PlanScore {
  const terms: Record<string, number> = {
    coverage: coverage(plan, request),
    recurrence: recurrence(plan),
  }
  QUESTION_TERMS.forEach((term, i) => {
    terms[term] = answers[i] === 'yes' ? 1 : 0
  })
  let total = 0
  for (const [term, value] of Object.entries(terms)) {
    total += weightOf(settings.score.weights[term]) * value
  }
  return { terms, total: Math.min(total, Number.MAX_VALUE) }
}
