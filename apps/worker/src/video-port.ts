import type { VideoPort } from '@cutroom/contracts'
import { recordClip, type Db } from '@cutroom/domain'
import { readTakeId, validateVideoRequest } from '@cutroom/pipeline'

/**
 * The validator at the video port's boundary (docs/features/reel-render.md, Gate 2 "Clips"; D-071,
 * I-19, S-071): the port it wraps, called only once a request passes — refused otherwise by throwing,
 * so the run fails as a fault and nothing is bought.
 *
 * A refusal the caller could read and ignore would be a flag, and a flag is a template by another
 * name: the next call site forgets it (D-071's rejected option). This file and the clips stage are
 * the only two that call a video port's `generate`, and the clips job hands the stage only this
 * port, wrapped around the guarded one below — so the validator runs before the guard and before the
 * port the worker was given.
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

/**
 * The port the worker was given, guarded (docs/features/reel-render.md, Gate 2 "Spending"; S-021,
 * S-036, S-071): AS EACH CALL RETURNS, its `video_receipt` — with the expansion mode, the style
 * contract's id and version and the video rate applied — its cost added to the job row, and the
 * take's row are written in one transaction.
 *
 * The comparison before each call — the chain's spend and the requested seconds at the rate against
 * the per-reel cap, then the ceiling, and the refusal of a call that would pass either — is
 * reel-render's Slice 5 (Gate 4), with the checks that prove it. Until then every call is made.
 *
 * Built per job attempt, knowing the attempt and the shots the stills stage degraded, so the row it
 * writes with its receipt carries the take's identity, and a degraded shot's is marked (D-050).
 */
export function guardedVideoPort(
  video: VideoPort,
  db: Db,
  job: {
    jobId: number
    runId: string
    attempt: number
    degradedShots: readonly number[]
    rateCents: number
    style: { id: string; version: number }
  },
): VideoPort {
  return {
    async generate(request) {
      const named = readTakeId(request.takeId)
      if (named === null) {
        throw new Error(`'${request.takeId}' is not a<attempt>-shot-<unit>-take-<n> (S-071)`)
      }
      const answer = await video.generate(request)
      if (answer.kind !== 'made') return answer
      recordClip(db, {
        jobId: job.jobId,
        runId: job.runId,
        take: {
          takeId: request.takeId,
          attempt: job.attempt,
          shotUnit: named.shotUnit,
          number: 1,
          mode: request.mode,
          pictureId: request.mode === 'image-to-video' ? request.image.pictureId : null,
          degraded: request.mode === 'text-to-video' && job.degradedShots.includes(named.shotUnit),
          prompt: request.prompt,
          durationSeconds: request.durationSeconds,
          seed: request.seed,
          requestId: answer.receipt.requestId,
          expandedPrompt: answer.receipt.expandedPrompt,
          path: answer.clip.path,
          probe: null,
          scan: null,
          words: null,
          sound: null,
          observation: null,
          reconciliation: null,
          verdicts: [],
          outcome: null,
          degradation: null,
        },
        request,
        style: job.style,
        rateCents: job.rateCents,
        receipt: answer.receipt,
      })
      return answer
    },
  }
}
