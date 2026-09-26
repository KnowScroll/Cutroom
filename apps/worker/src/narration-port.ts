import type { NarrationAnswer, NarrationPort, RenderSettings } from '@cutroom/contracts'
import { recordNarration, reelSpentCents, type Db } from '@cutroom/domain'
import { readNarrationId } from '@cutroom/pipeline'
import { recordingSpend } from './spend.ts'
import { sentUntilAvailable } from './transient.ts'
import type { ClipsLimits } from './video-port.ts'

/**
 * The only narration port the clips stage is handed (docs/features/reel-render.md, Gate 2
 * "Spending"; S-021, S-035, S-036, S-070): the port the worker was given, wrapped so that
 *
 * - BEFORE EACH SEND, the reel's spend plus the call's figure — the text's characters at the
 *   narration rate — is compared with the per-reel cap, then with the caller's ceiling: the chain's,
 *   and for a resumed run the chain of the run it resumes too (resume-failed, S-157, S-162). A call that
 *   would pass either is not made: the answer is `refused`, with the limit and that figure, the
 *   request goes on the attempt's list of refused calls, and the stage stops (S-035). Exactly equal
 *   is made. A character is a Unicode code point (S-088).
 * - A PROVIDER ANSWERING `unavailable` is sent the same request again, with backoff, every send
 *   guarded, and nothing written for it (reel-takes, S-096): see `sentUntilAvailable`.
 * - AS EACH CALL RETURNS MADE, its `speech_receipt` with the narration rate applied and the
 *   `unavailable` answers before it, its cost added to the job row and the narration's row are
 *   written in one transaction.
 *
 * Built per job attempt, knowing the attempt, the rate, the cap the job read and the ceiling, so the
 * row it writes with its receipt carries the narration's identity.
 */
export function guardedNarrationPort(
  narration: NarrationPort,
  db: Db,
  job: {
    jobId: number
    runId: string
    attempt: number
    rateCentsPerCharacter: number
    limits: ClipsLimits
    transient: RenderSettings['transient']
  },
): NarrationPort {
  return {
    async speak(request) {
      const named = readNarrationId(request.narrationId)
      if (named === null) {
        throw new Error(`'${request.narrationId}' is not a<attempt>-shot-<unit>-narration (S-070)`)
      }

      const { answer, unavailable } = await sentUntilAvailable(
        `the narration call for ${request.narrationId}`,
        job.transient,
        async (): Promise<NarrationAnswer> => {
          // SUM(cost_cents) over the chain — and the chain of the run it resumes (S-162) — read again
          // before every send (D-081, S-036, S-095), plus this narration's characters — code points, not a string's UTF-16 length (S-088) — at the
          // rate, rounded up, as every guard's figure is (S-053, S-059).
          const characters = [...request.text].length
          const estimateCents = Math.ceil(
            reelSpentCents(db, job.runId) + characters * job.rateCentsPerCharacter,
          )
          const { capCents, ceilingCents, refused } = job.limits
          if (estimateCents > capCents || estimateCents > ceilingCents) {
            refused.push({ call: 'narration', request })
            return {
              kind: 'refused',
              limit: estimateCents > capCents ? 'reel' : 'ceiling',
              estimateCents,
            }
          }
          // A narration the provider SPOKE and we could not use leaves its row too (S-142). The
          // figure on it is zero, because T2A is plan-covered — what the row carries is that the
          // call happened.
          return recordingSpend(db, job, () => narration.speak(request))
        },
      )
      if (answer.kind !== 'made') return answer
      recordNarration(db, {
        jobId: job.jobId,
        runId: job.runId,
        narration: {
          narrationId: request.narrationId,
          attempt: job.attempt,
          shotUnit: named.shotUnit,
          text: request.text,
          path: answer.audio.path,
          words: null,
          probe: null,
        },
        rateCentsPerCharacter: job.rateCentsPerCharacter,
        receipt: answer.receipt,
        // The `unavailable` answers before it: the transient counter (I-11).
        transientErrors: unavailable,
      })
      return answer
    },
  }
}
