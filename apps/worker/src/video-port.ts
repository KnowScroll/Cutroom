import type {
  NarrationRequest,
  RenderSettings,
  VideoAnswer,
  VideoPort,
  VideoRequest,
} from '@cutroom/contracts'
import { recordClip, recordLostCall, reelSpentCents, type Db } from '@cutroom/domain'
import { readTakeId, validateVideoRequest } from '@cutroom/pipeline'
import { recordingSpend } from './spend.ts'
import { sentUntilAvailable } from './transient.ts'

/**
 * A call one of a clips attempt's two guards refused, as it was asked for. The clips job hands both
 * guards one list and reads it when the stage stops for budget, so the question a stop at the per-reel
 * cap writes names the clip or the narration that was not made (S-087): the guard holds the request it
 * refused, where the stage's records hold only what was made.
 */
export type RefusedCall =
  | { call: 'narration'; request: NarrationRequest }
  | { call: 'clip'; request: VideoRequest }

/** What both guards of one clips attempt compare with, and where each puts a call it refuses. */
export interface ClipsLimits {
  /** The per-reel cap, as the job read it from BUDGET.md once for the attempt (D-100, S-059). */
  capCents: number
  /** The request's `budgetCents`. */
  ceilingCents: number
  refused: RefusedCall[]
}

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
 * S-035, S-036, S-071):
 *
 * - BEFORE EACH SEND, the reel's spend plus the call's figure — the requested seconds at the video
 *   rate — is compared with the per-reel cap, then with the caller's ceiling: the chain's, and for a
 *   resumed run the chain of the run it resumes too (resume-failed, S-157, S-162). A call that would pass
 *   either is not made: the answer is `refused`, with the limit and that figure, the request goes on
 *   the attempt's list of refused calls, and the stage stops (S-035). Exactly equal is made. The cap
 *   is compared first, so a call passing both is told `reel` and the owner is asked (D-100).
 * - A PROVIDER ANSWERING `unavailable` is sent the same request again, with backoff, every send
 *   guarded, and nothing written for it (reel-takes, S-096): see `sentUntilAvailable`.
 * - AS EACH CALL RETURNS MADE, its `video_receipt` — with the expansion mode, the style contract's id
 *   and version, the video rate applied and the `unavailable` answers before it — its cost added to
 *   the job row, and the take's row, numbered as its id numbers it, are written in one transaction.
 *
 * The validator wraps this port, so a request it refuses throws before the guard is asked (S-083).
 * Built per job attempt, knowing the attempt, the shots the stills stage degraded, the cap the job
 * read and the ceiling, so the row it writes with its receipt carries the take's identity, and a
 * degraded shot's is marked (D-050).
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
    limits: ClipsLimits
    transient: RenderSettings['transient']
  },
): VideoPort {
  return {
    async generate(request) {
      const named = readTakeId(request.takeId)
      if (named === null) {
        throw new Error(`'${request.takeId}' is not a<attempt>-shot-<unit>-take-<1 to 3> (S-094)`)
      }

      const { answer, unavailable } = await sentUntilAvailable(
        `the video call for ${request.takeId}`,
        job.transient,
        async (): Promise<VideoAnswer> => {
          // SUM(cost_cents) over the chain — and the chain of the run it resumes (S-162) — read again
          // before every send (D-081, S-036, S-095), plus this clip's requested seconds at the rate —
          // rounded up, as every guard's figure is (S-053, S-059).
          const estimateCents = Math.ceil(
            reelSpentCents(db, job.runId) + request.durationSeconds * job.rateCents,
          )
          const { capCents, ceilingCents, refused } = job.limits
          if (estimateCents > capCents || estimateCents > ceilingCents) {
            refused.push({ call: 'clip', request })
            return {
              kind: 'refused',
              limit: estimateCents > capCents ? 'reel' : 'ceiling',
              estimateCents,
            }
          }
          const answered = await recordingSpend(db, job, () => video.generate(request))
          // A TRANSIENT ON THE DOWNLOAD COMES AFTER THE CLIP WAS MADE (paid-failures, S-142). The
          // re-buy S-125 chose still happens — this send is answered `unavailable` and the whole
          // call is sent again — and the clip that was already paid for is on the record first,
          // so the second payment is not the only one the budget guard can see.
          if (answered.kind === 'unavailable' && answered.spent !== undefined) {
            recordLostCall(db, { jobId: job.jobId, runId: job.runId, lost: answered.spent })
          }
          return answered
        },
      )
      if (answer.kind !== 'made') return answer
      recordClip(db, {
        jobId: job.jobId,
        runId: job.runId,
        take: {
          takeId: request.takeId,
          attempt: job.attempt,
          shotUnit: named.shotUnit,
          number: named.number,
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
        // The `unavailable` answers before it: the transient counter, never the take's (I-11).
        transientErrors: unavailable,
      })
      return answer
    },
  }
}
