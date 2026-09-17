import type { Plan, PlanSettings } from '@cutroom/contracts'

// What a run is admitted on, at the end of its plan job. A run's ceiling is what THAT RUN may spend
// (D-100): a `stills` run spends image calls only, so the figure compared with it is the pictures'
// (docs/features/reel-stills.md, Gate 2 "Admission"; S-030, S-035); a `video` run spends the whole
// estimate, so the figure is the plan's (docs/features/reel-render.md, Gate 2 "Admission"; S-069).

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

/**
 * The selected plan's `estimateCents` — D-083's figure, unchanged, the contract's "chosen plan's
 * estimate" — and whether the caller's ceiling covers it. The reserve is not counted (S-035), and
 * narration is not in the estimate (S-070): every narration and clip call is guarded as it is made.
 * Exactly equal is admitted.
 */
export function admitVideo(
  plan: Pick<Plan, 'estimateCents'>,
  budgetCents: number,
): { admitted: boolean; estimateCents: number } {
  return { admitted: plan.estimateCents <= budgetCents, estimateCents: plan.estimateCents }
}
