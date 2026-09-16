import type { Plan } from '@cutroom/contracts'
import { rankSubjects } from '../rank.ts'

// Where the pictures go (docs/features/reel-stills.md, Gate 2 "Where the pictures go"; D-027,
// D-029, S-039). A picture is frame 1 of exactly one shot, placed by code from the ranking —
// never chosen by a model (D-034).

export interface Placement {
  subjectId: string
  shotUnit: number
  role: 'canonical' | 'derived'
}

/** `shot-<unit>`: how the contract names a shot. */
export const shotIdOf = (unit: number) => `shot-${unit}`

/**
 * `a<attempt>-shot-<unit>-<label>`: the attempt is in the id, so a restarted attempt never reuses an
 * id or a file path (S-046).
 */
export const pictureIdOf = (attempt: number, unit: number, label: string) =>
  `a${attempt}-${shotIdOf(unit)}-${label}`

/** The attempt, shot and label a picture id names, or null for an id that is not one. */
export function readPictureId(
  pictureId: string,
): { attempt: number; shotUnit: number; label: string } | null {
  const parts = /^a(\d+)-shot-(\d+)-([a-z0-9-]+)$/.exec(pictureId)
  if (parts === null) return null
  return { attempt: Number(parts[1]), shotUnit: Number(parts[2]), label: parts[3] as string }
}

/**
 * Rank 1, if any, is the canonical, on the first shot that shows it (D-029 part 4). Ranks 2 and 3,
 * where they exist, are derived, each on the earliest shot showing it that no higher rank holds.
 * A rank whose every shot is held gets no picture and no call: a picture that opened no shot is
 * what D-029 part 2 forbids, and every one of those shots already opens with a checked picture
 * (S-039). Every other shot has no picture (D-027), and a plan with no subject in two shots places
 * nothing.
 */
export function placePictures(plan: Pick<Plan, 'shots' | 'subjects'>): Placement[] {
  const held = new Set<number>()
  const placed: Placement[] = []
  rankSubjects(plan)
    .slice(0, 3)
    .forEach((subjectId, rank) => {
      const shot = plan.shots.find((s) => s.subjectIds.includes(subjectId) && !held.has(s.unit))
      if (shot === undefined) return
      held.add(shot.unit)
      placed.push({ subjectId, shotUnit: shot.unit, role: rank === 0 ? 'canonical' : 'derived' })
    })
  return placed
}
