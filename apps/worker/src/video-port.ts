import type { VideoPort } from '@cutroom/contracts'
import { validateVideoRequest } from '@cutroom/pipeline'

/**
 * The only video port the clips stage will be handed (docs/features/reel-render.md, Gate 2 "Clips";
 * D-071, I-19, S-071): the port the worker was given, wrapped so that every request passes the
 * validator FIRST — before the guard and before the port underneath — and one that fails it is
 * refused by throwing, so the run fails as a fault and nothing is bought.
 *
 * A refusal the caller could read and ignore would be a flag, and a flag is a template by another
 * name: the next call site forgets it (D-071's rejected option). This file and the clips stage are
 * the only two that call a video port's `generate`.
 *
 * The guard — the chain's spend against the cap and the ceiling — and the receipt written as each
 * call returns are reel-render's Slice 3, and go between the validator and the call. The worker is
 * handed no video port until then.
 */
export function validatingVideoPort(video: VideoPort): VideoPort {
  return {
    async generate(request) {
      const reasons = validateVideoRequest(request)
      if (reasons.length > 0) {
        throw new Error(
          `the video request ${String(request.takeId)} is refused at the boundary: ${reasons.join('; ')}`,
        )
      }
      return video.generate(request)
    },
  }
}
