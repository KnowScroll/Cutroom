import type { Plan } from '@cutroom/contracts'

// D-029 part 3, exactly, and the image calls it plans (D-027). Computed by code from what the
// planning call named, never chosen by a model (D-034) — so this file is handed a plan's shots and
// subjects and nothing that could make a call.

/**
 * The eligible subjects, best first: a subject in two or more shots is eligible; ranked by how many
 * shots show it, then by the earliest shot that shows it, then by the order the plan names them.
 */
export function rankSubjects(plan: Pick<Plan, 'shots' | 'subjects'>): string[] {
  const seen = new Map<string, { shots: number; first: number; named: number }>()
  plan.subjects.forEach((subject, named) => {
    if (!seen.has(subject.id)) seen.set(subject.id, { shots: 0, first: Infinity, named })
  })
  plan.shots.forEach((shot, index) => {
    for (const id of new Set(shot.subjectIds)) {
      const entry = seen.get(id)
      if (entry === undefined) continue
      entry.shots += 1
      entry.first = Math.min(entry.first, index)
    }
  })
  return [...seen.entries()]
    .filter(([, entry]) => entry.shots >= 2)
    .sort(([, x], [, y]) => y.shots - x.shots || x.first - y.first || x.named - y.named)
    .map(([id]) => id)
}

/** Rank 1, if any, is generated best-of-2; ranks 2 and 3, where they exist, once each. At most 4. */
export function plannedImageCalls(ranked: readonly string[]): number {
  if (ranked.length === 0) return 0
  return 2 + Math.min(ranked.length - 1, 2)
}
