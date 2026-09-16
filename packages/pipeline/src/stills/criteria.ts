import type { Plan } from '@cutroom/contracts'
import type { Criterion, SubmitRequest } from '@cutroom/reel-contract'

// Which criteria a picture is held against (docs/features/reel-stills.md, Gate 2 "Which criteria a
// picture gets"; S-040, the owner's answer). The contract's criteria are per reel and a picture
// opens one shot, so a criterion reaches a shot only BY ITS CLAIM — the one structural link from a
// criterion to a shot, which no author writes (D-043's rejected `checkAt`).

/**
 * The presence criteria of one shot's picture:
 *
 * - a `mustShow` presence criterion whose `claimId` is carried by a sentence of the shot's unit;
 * - every `mustNotShow`, which the contract already holds to presence;
 * - never an `event` criterion (D-043), and never a `mustShow` with no claim — the clip's Gate 5
 *   checks every criterion, so the still check stays pure addition.
 */
export function criteriaFor(
  shotUnit: number,
  plan: Pick<Plan, 'units'>,
  request: SubmitRequest,
): { mustShow: Criterion[]; mustNotShow: Criterion[] } {
  const claims = new Set(
    (plan.units[shotUnit] ?? []).flatMap((position) => request.narration[position]?.claimIds ?? []),
  )
  return {
    mustShow: request.criteria.mustShow.filter(
      (c) => c.type === 'presence' && c.claimId !== undefined && claims.has(c.claimId),
    ),
    mustNotShow: request.criteria.mustNotShow.filter((c) => c.type === 'presence'),
  }
}
