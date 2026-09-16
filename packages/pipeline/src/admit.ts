import type { Plan, PlanSettings } from '@cutroom/contracts'

// What a `stills` run is admitted on (docs/features/reel-stills.md, Gate 2 "Admission"; S-030,
// S-035). A run's ceiling is what THAT RUN may spend, and a stills run spends image calls only —
// so the figure compared with it is the pictures', not the reel's.

/**
 * The selected plan's planned image calls x the image rate, and whether the caller's ceiling
 * covers it. **The reserve is not counted** (S-035, superseding D-081's enqueue clause): D-027
 * plans four calls and holds two "unspent at plan time", and D-083's estimate is what the reel
 * would cost "as planned". Every image call is guarded against the cap and the ceiling as it is
 * made instead, which is where a reserve call is paid for. Exactly equal is admitted.
 */
export function admitPictures(
  plan: Pick<Plan, 'plannedImageCalls'>,
  budgetCents: number,
  s: Pick<PlanSettings, 'imageRateCents'>,
): { admitted: boolean; picturesCents: number } {
  const picturesCents = Math.ceil(plan.plannedImageCalls * s.imageRateCents)
  return { admitted: picturesCents <= budgetCents, picturesCents }
}
