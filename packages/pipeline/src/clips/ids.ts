import type { TakeNumber } from '@cutroom/contracts'
import { shotIdOf } from '../stills/place.ts'

// How the clips stage names what it makes (docs/features/reel-render.md, Gate 2 "Narration" and
// "Clips"; S-070, S-071, and reel-takes' S-094). The attempt is in every id, so an attempt run again
// reuses no id and no file path, and an earlier attempt's rows and files stay (S-076).

/** `a<attempt>-shot-<unit>-narration`. */
export const narrationIdOf = (attempt: number, unit: number) =>
  `a${attempt}-${shotIdOf(unit)}-narration`

/** `a<attempt>-shot-<unit>-take-<n>`, `n` the take's number among its shot's decided takes (S-094). */
export const takeIdOf = (attempt: number, unit: number, take: TakeNumber) =>
  `a${attempt}-${shotIdOf(unit)}-take-${take}`

/** The attempt and shot a narration id names, or null for an id that is not one. */
export function readNarrationId(narrationId: string): { attempt: number; shotUnit: number } | null {
  const parts = /^a(\d+)-shot-(\d+)-narration$/.exec(narrationId)
  if (parts === null) return null
  return { attempt: Number(parts[1]), shotUnit: Number(parts[2]) }
}

/**
 * The attempt, shot and take number a take id names, or null for an id that is not one — and a take
 * numbered other than 1 to 3 is not one: a shot has three takes (D-024, S-094).
 */
export function readTakeId(
  takeId: string,
): { attempt: number; shotUnit: number; number: TakeNumber } | null {
  const parts = /^a(\d+)-shot-(\d+)-take-([123])$/.exec(takeId)
  if (parts === null) return null
  return {
    attempt: Number(parts[1]),
    shotUnit: Number(parts[2]),
    number: Number(parts[3]) as TakeNumber,
  }
}
