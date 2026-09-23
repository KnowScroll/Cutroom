import type { Plan } from '@cutroom/contracts'
import { rankSubjects } from '../rank.ts'

// Where the pictures go (docs/features/reel-stills.md, Gate 2 "Where the pictures go"; D-027,
// D-029, S-039). A picture is frame 1 of exactly one shot, placed by code from the ranking —
// never chosen by a model (D-034).

export interface Placement {
  subjectId: string
  shotUnit: number
  role: 'canonical' | 'derived' | 'standalone'
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
 *
 * UNDER THE PLAN'S OWN `pictures: 'upToThree'` (docs/features/three-pictures.md, S-150), the free
 * slots — up to three pictures in all — then go to the earliest shots holding no picture AND naming
 * no subject any placed shot names, one `standalone` each, labelled by the shot's first subject. A
 * picture shows every subject its shot names, so a shot that shows a pictured subject is passed
 * over rather than drawn again from nothing. The rule is the PLAN'S, never a worker's setting, so
 * pictures are made under the rule the plan was priced and admitted under (D-083).
 */
export function placePictures(plan: Pick<Plan, 'shots' | 'subjects' | 'pictures'>): Placement[] {
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
  if (plan.pictures !== 'upToThree') return placed

  const pictured = new Set(plan.shots.filter((s) => held.has(s.unit)).flatMap((s) => s.subjectIds))
  for (const shot of plan.shots) {
    if (placed.length >= 3) break
    const [first] = shot.subjectIds
    if (held.has(shot.unit) || first === undefined) continue
    if (shot.subjectIds.some((id) => pictured.has(id))) continue
    held.add(shot.unit)
    for (const id of shot.subjectIds) pictured.add(id)
    placed.push({ subjectId: first, shotUnit: shot.unit, role: 'standalone' })
  }
  return placed
}
