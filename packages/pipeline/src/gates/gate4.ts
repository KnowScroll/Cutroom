import type {
  ClipObservation,
  ClipRef,
  LanguageModelPort,
  RefusalRecorder,
  TakeVerdict,
} from '@cutroom/contracts'
import { clipObservation } from '../clips/observation.ts'
import { askWitness } from './witness.ts'

// Gate 4, the witness, on a take (docs/features/reel-render.md, Gate 2 "Gates 2 to 5 on each take";
// S-072, I-8, D-041, D-051, D-053). An `observe` call given the clip and a temperature, and nothing
// else: one witness, whose input is here a whole clip. Its answer is parsed as a clip observation at
// this boundary; one the schema refuses is kept and asked for once more, told only its own schema's
// issues, and a second refusal fails the run (S-042 as S-147 and S-156 amend it,
// docs/features/ask-again.md). It accepts once parsed.

/** D-051's limitation, recorded on every Gate 4 verdict (I-6). */
export const CLIP_SAMPLING_LIMITATION =
  'how the model samples a supplied clip is undocumented, so a moment it skips is not witnessed (D-051)'

export async function gate4(
  clip: ClipRef,
  model: LanguageModelPort,
  refusals: RefusalRecorder,
): Promise<{ observation: ClipObservation; verdict: TakeVerdict }> {
  // The clip as the port made it, and nothing more: an id and a path (I-8).
  const observation = await askWitness(
    { clip: { takeId: clip.takeId, path: clip.path }, temperature: 0 as const },
    (call) => model.observe(call),
    clipObservation,
    clip.takeId,
    'a clip observation',
    refusals,
  )
  return {
    observation,
    verdict: {
      gate: '4',
      outcome: 'accept',
      reasons: [],
      coverage: { strategy: 'full', limitations: [CLIP_SAMPLING_LIMITATION] },
    },
  }
}
