import { shotIdOf } from '../stills/place.ts'

// How the clips stage names what it makes (docs/features/reel-render.md, Gate 2 "Narration" and
// "Clips"; S-070, S-071). The attempt is in every id, so an attempt run again reuses no id and no file
// path, and an earlier attempt's rows and files stay (S-076).

/** `a<attempt>-shot-<unit>-narration`. */
export const narrationIdOf = (attempt: number, unit: number) =>
  `a${attempt}-${shotIdOf(unit)}-narration`

/** `a<attempt>-shot-<unit>-take-<n>`; the take number is 1 in this feature (S-066). */
export const takeIdOf = (attempt: number, unit: number, take = 1) =>
  `a${attempt}-${shotIdOf(unit)}-take-${take}`

/** The attempt and shot a narration id names, or null for an id that is not one. */
export function readNarrationId(narrationId: string): { attempt: number; shotUnit: number } | null {
  const parts = /^a(\d+)-shot-(\d+)-narration$/.exec(narrationId)
  if (parts === null) return null
  return { attempt: Number(parts[1]), shotUnit: Number(parts[2]) }
}

/** The attempt, shot and take number a take id names, or null for an id that is not one. */
export function readTakeId(
  takeId: string,
): { attempt: number; shotUnit: number; number: number } | null {
  const parts = /^a(\d+)-shot-(\d+)-take-(\d+)$/.exec(takeId)
  if (parts === null) return null
  return { attempt: Number(parts[1]), shotUnit: Number(parts[2]), number: Number(parts[3]) }
}
