import type { Plan } from '@cutroom/contracts'
import type { Criterion, SubmitRequest } from '@cutroom/reel-contract'

// What a take is held against (docs/features/reel-render.md, Gate 2 "The take's criteria"; S-072,
// D-043, S-040). A criterion reaches a shot only BY ITS CLAIM, as it reaches a picture — but a clip can
// show an event, so a take is given both types; and a `mustShow` no sentence claims is the reel's,
// put to every take and failing none, until the stage asks whether some take showed it.

/**
 * - `mustShow`: each `mustShow`, presence or event, whose `claimId` a sentence of the shot's unit
 *   carries (D-043);
 * - `mustNotShow`: every `mustNotShow`;
 * - `unclaimed`: every `mustShow` with no `claimId`, the reel's.
 */
export function takeCriteria(
  shotUnit: number,
  plan: Pick<Plan, 'units'>,
  request: SubmitRequest,
): { mustShow: Criterion[]; mustNotShow: Criterion[]; unclaimed: Criterion[] } {
  const claims = new Set(
    (plan.units[shotUnit] ?? []).flatMap((position) => request.narration[position]?.claimIds ?? []),
  )
  return {
    mustShow: request.criteria.mustShow.filter(
      (c) => c.claimId !== undefined && claims.has(c.claimId),
    ),
    mustNotShow: [...request.criteria.mustNotShow],
    unclaimed: request.criteria.mustShow.filter((c) => c.claimId === undefined),
  }
}
