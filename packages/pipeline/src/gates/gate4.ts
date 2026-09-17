import type { ClipObservation, ClipRef, LanguageModelPort, TakeVerdict } from '@cutroom/contracts'
import { clipObservation } from '../clips/observation.ts'

// Gate 4, the witness, on a take (docs/features/reel-render.md, Gate 2 "Gates 2 to 5 on each take";
// S-072, I-8, D-041, D-051, D-053). One `observe` call given the clip and a temperature, and nothing
// else: one witness, whose input is here a whole clip. Its answer is parsed as a clip observation at
// this boundary, and one that does not parse fails the run (S-042). It accepts once parsed.

/** D-051's limitation, recorded on every Gate 4 verdict (I-6). */
export const CLIP_SAMPLING_LIMITATION =
  'how the model samples a supplied clip is undocumented, so a moment it skips is not witnessed (D-051)'

export async function gate4(
  clip: ClipRef,
  model: LanguageModelPort,
): Promise<{ observation: ClipObservation; verdict: TakeVerdict }> {
  // The clip as the port made it, and nothing more: an id and a path (I-8).
  const observed = await model.observe({
    clip: { takeId: clip.takeId, path: clip.path },
    temperature: 0,
  })
  const parsed = clipObservation.safeParse(observed.value)
  if (!parsed.success) {
    throw new Error(
      `the witness's answer for ${clip.takeId} is not a clip observation: ${parsed.error.issues
        .map((i) => `${i.path.join('.') || '(answer)'}: ${i.message}`)
        .join('; ')}`,
    )
  }
  return {
    observation: parsed.data,
    verdict: {
      gate: '4',
      outcome: 'accept',
      reasons: [],
      coverage: { strategy: 'full', limitations: [CLIP_SAMPLING_LIMITATION] },
    },
  }
}
