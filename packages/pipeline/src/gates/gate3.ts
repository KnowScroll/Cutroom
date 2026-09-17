import type { ClipRef, ClipSound, MediaPort, TakeVerdict } from '@cutroom/contracts'

// Gate 3, text and sound, on a take (docs/features/reel-render.md, Gate 2 "Gates 2 to 5 on each take";
// S-072, S-041, D-008). The media port reads the clip's words and classifies its sound. Words are
// recorded and never fail a take — no text policy exists (S-041's reading). Speech or music fails it:
// H3's sound is ambience only, and every clip prompt forbids both.

export type Gate3Progress = { words: string[] } | { sound: ClipSound }

/** Reads a take's words and hears its sound, recording each, and decides Gate 3. */
export async function gate3(
  clip: ClipRef,
  media: MediaPort,
  progress: (fields: Gate3Progress) => Promise<void>,
): Promise<TakeVerdict> {
  const ref: ClipRef = { takeId: clip.takeId, path: clip.path }
  const words = await media.readText(ref)
  await progress({ words: [...words] })
  const sound = await media.listen(ref)
  await progress({ sound: { speech: sound.speech, music: sound.music } })
  const reasons: string[] = []
  if (sound.speech) reasons.push('its sound is classified as speech')
  if (sound.music) reasons.push('its sound is classified as music')
  return {
    gate: '3',
    outcome: reasons.length === 0 ? 'accept' : 'fail',
    reasons,
    coverage: { strategy: 'whole file' },
  }
}
