import type { VideoRequest } from '@cutroom/contracts'
import { NEGATIVE_AUDIO } from './prompts.ts'

/**
 * The validator every video call passes (D-071, I-19, S-071): the reasons a request must not reach a
 * video port, or none. The worker's video port runs it before the guard and before the port it
 * wraps, and throws on any reason, so the run fails as a fault and nothing is bought.
 *
 * Both rules are silent when broken — the clip still generates, and only sounds or looks wrong — so
 * a template in the composer is not enough: the next call site forgets it (D-071's rejected option).
 * The request's type already refuses a text-to-video request without its ratio; this is for the one
 * the type never saw, built from a value typed `any`.
 *
 * Every request that is not `image-to-video` is held to the 9:16 rule, not only one that says
 * `text-to-video`: a provider call without an image IS text-to-video, and its default ratio is the
 * trap D-019 names (D-036's finding; S-080).
 *
 * Image, narration and model calls do not pass it (S-071).
 */
export function validateVideoRequest(request: VideoRequest): string[] {
  const reasons: string[] = []
  const { prompt, mode, aspectRatio } = request as {
    prompt?: unknown
    mode?: unknown
    aspectRatio?: unknown
  }
  if (typeof prompt !== 'string' || !prompt.includes(NEGATIVE_AUDIO)) {
    reasons.push(
      `its prompt lacks the negative audio block, ${JSON.stringify(NEGATIVE_AUDIO)} (D-008, D-071)`,
    )
  }
  if (mode !== 'image-to-video' && aspectRatio !== '9:16') {
    reasons.push(
      `it is ${String(mode)} without aspectRatio 9:16, so the provider would make its default ratio (D-019, D-071)`,
    )
  }
  return reasons
}
