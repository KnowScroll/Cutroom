import type { Placement } from './place.ts'

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
 * The slots every repair takes one of, any free one (S-043): six less the image calls the run's
 * earlier attempts made, less the placement's calls (S-048), fixed when the attempt starts. A
 * placement with a rank left out therefore holds more than D-027's two. Below 0, the attempt cannot
 * make its pictures within six calls, and the stage fails before any call (S-061).
 */
export function reserveOf(placements: readonly Placement[], earlierImageCalls: number): number {
  return IMAGE_CALLS - earlierImageCalls - placementCalls(placements)
}

/** A derived shot's repairs are labelled `repair`, then `repair-2` (S-046). */
export function repairLabel(repair: number): string {
  return repair === 1 ? 'repair' : `repair-${repair}`
}
