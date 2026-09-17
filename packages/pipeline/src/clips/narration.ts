import { z } from 'zod'
import type { Plan, WordTiming } from '@cutroom/contracts'
import type { SubmitRequest } from '@cutroom/reel-contract'

// A shot's narration (docs/features/reel-render.md, Gate 2 "Narration"; S-070, D-008, D-019, D-057):
// what it says, what its timings must be before anything reads them, and the clip it asks for.

/** The unit's sentences, in order, joined by one space (S-070). */
export function narrationText(
  shotUnit: number,
  plan: Pick<Plan, 'units'>,
  request: SubmitRequest,
): string {
  return (plan.units[shotUnit] ?? [])
    .map((position) => request.narration[position]?.text ?? '')
    .join(' ')
}

const words = (text: string) => text.split(/\s+/).filter((word) => word !== '')

/**
 * What a narration's word timings must be, parsed at the stage's boundary (S-070): every word of the
 * text, split on white space, exactly once and in order; each ending after it starts; none overlapping
 * the next; the last ending at or before the measured duration. The port types the timings `unknown`,
 * and an answer that does not parse fails the run, as a witness's does (S-042).
 */
export function wordTimings(text: string, measuredSeconds: number): z.ZodType<WordTiming[]> {
  const expected = words(text)
  const endMs = measuredSeconds * 1000
  return z
    .array(
      z.strictObject({
        word: z.string(),
        startMs: z.number().int().nonnegative(),
        endMs: z.number().int().nonnegative(),
      }),
    )
    .superRefine((timings, ctx) => {
      const said = timings.map((t) => t.word)
      if (said.length !== expected.length || said.some((word, i) => word !== expected[i])) {
        const why =
          said.length < expected.length
            ? 'a word is left out'
            : said.length > expected.length
              ? 'a word is repeated'
              : 'they are not its words in order'
        ctx.addIssue({
          code: 'custom',
          path: [],
          message: `the timings give ${said.length} words, "${said.join(' ')}", for a text of ${expected.length}: ${why}`,
        })
      }
      timings.forEach((timing, i) => {
        if (timing.endMs <= timing.startMs) {
          ctx.addIssue({
            code: 'custom',
            path: [i, 'endMs'],
            message: `"${timing.word}" ends at ${timing.endMs} ms, not after it starts at ${timing.startMs} ms`,
          })
        }
        const next = timings[i + 1]
        if (next !== undefined && next.startMs < timing.endMs) {
          ctx.addIssue({
            code: 'custom',
            path: [i + 1, 'startMs'],
            message: `"${next.word}" starts at ${next.startMs} ms, before "${timing.word}" ends at ${timing.endMs} ms`,
          })
        }
      })
      const last = timings.at(-1)
      if (last !== undefined && last.endMs > endMs) {
        ctx.addIssue({
          code: 'custom',
          path: [timings.length - 1, 'endMs'],
          message: `the last word ends at ${last.endMs} ms, after the narration's measured ${endMs} ms`,
        })
      }
    })
}

/**
 * The clip a narration asks for: its measured seconds rounded up to a whole second (S-023), at least
 * 5 and at most 15 (D-019). A narration over 15 seconds gets a 15-second clip whose last frame is held
 * (S-070, S-073).
 */
export function requestedSeconds(measuredSeconds: number): number {
  return Math.min(15, Math.max(5, Math.ceil(measuredSeconds)))
}
