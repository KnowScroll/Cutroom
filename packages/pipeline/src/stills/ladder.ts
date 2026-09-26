import type { PictureRecord, Plan } from '@cutroom/contracts'
import { placePictures, type Placement } from './place.ts'

// The reserve, and the cap on a shot's repairs (docs/features/reel-stills.md, Gate 2 "The ladders
// and the reserve"; D-014, D-027, D-048, S-043).

/** No run makes more than six image calls (D-027). */
export const IMAGE_CALLS = 6

/** No shot takes more than two repairs — D-014's "retries ≤ 2 per shot" (S-043). */
export const REPAIRS_PER_SHOT = 2

/**
 * The image calls the placement makes before any repair: 2 for a placed canonical and 1 for each
 * placed derived picture — the plan's planned image calls less any rank with no free shot (S-039).
 */
export function placementCalls(placements: readonly Placement[]): number {
  return placements.reduce((calls, p) => calls + (p.role === 'canonical' ? 2 : 1), 0)
}

/**
 * The image calls a plan made under `pictures: 'upToThree'` plans: its placement's own calls — at most
 * 3 with no canonical, at most 4 with one, as few as 0 (docs/features/three-pictures.md, S-150). The
 * plan stage uses it ONLY under that rule; under the default it keeps D-027's
 * `plannedImageCalls(rankSubjects(…))`, which differs from the placement's calls where S-039 leaves a
 * rank without a shot, and must go on differing.
 */
export function plannedImageCallsFor(plan: Pick<Plan, 'shots' | 'subjects' | 'pictures'>): number {
  return placementCalls(placePictures(plan))
}

/** A picture an earlier attempt decided, as the reserve counts it: which shot and which label. */
export type KeptCall = Pick<PictureRecord, 'shotUnit' | 'label'>

/**
 * The first calls still to make: 'a' and 'b' for a placed canonical and 'single' for each other
 * placement, less those a kept picture satisfies (S-164). With nothing kept, the placement's calls.
 */
export function unmadeCalls(placements: readonly Placement[], kept: readonly KeptCall[]): number {
  const has = (unit: number, label: string) =>
    kept.some((k) => k.shotUnit === unit && k.label === label)
  return placements.reduce((calls, p) => {
    const labels = p.role === 'canonical' ? ['a', 'b'] : ['single']
    return calls + labels.filter((label) => !has(p.shotUnit, label)).length
  }, 0)
}

/**
 * The slots every repair takes one of, any free one (S-043): six less `earlier`, the image calls the
 * run made before this attempt (its receipts and image lost calls, every attempt's), less the first
 * calls no kept picture satisfies (S-164, superseding S-061's "less the placement's calls"), fixed
 * when the attempt starts. A kept picture is counted once, as an earlier call; a picture a crash cut
 * off twice, as an earlier call and as a first call still to make — so the crash's call counts, as
 * S-048 counts it. A kept repair satisfies no first call: its call is in `earlier` already. A
 * placement with a rank left out therefore holds more than D-027's two. Below 0, the attempt cannot
 * make its pictures within six calls, and the stage fails before any call (S-061).
 */
export function reserveOf(
  placements: readonly Placement[],
  earlier: number,
  kept: readonly KeptCall[],
): number {
  return IMAGE_CALLS - earlier - unmadeCalls(placements, kept)
}

/** A derived shot's repairs are labelled `repair`, then `repair-2` (S-046). */
export function repairLabel(repair: number): string {
  return repair === 1 ? 'repair' : `repair-${repair}`
}
