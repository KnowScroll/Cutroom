import type { NarrationPort } from '@cutroom/contracts'
import { recordNarration, type Db } from '@cutroom/domain'
import { readNarrationId } from '@cutroom/pipeline'

/**
 * The only narration port the clips stage is handed (docs/features/reel-render.md, Gate 2
 * "Spending"; S-021, S-036, S-070): the port the worker was given, wrapped so that AS EACH CALL
 * RETURNS, its `speech_receipt` with the narration rate applied, its cost added to the job row and
 * the narration's row are written in one transaction.
 *
 * The comparison before each call — the chain's spend and the call's figure against the per-reel cap,
 * then the ceiling, and the refusal of a call that would pass either — is reel-render's Slice 5 (Gate
 * 4), with the checks that prove it. Until then every call is made.
 *
 * Built per job attempt, knowing the attempt and the rate, so the row it writes with its receipt
 * carries the narration's identity.
 */
export function guardedNarrationPort(
  narration: NarrationPort,
  db: Db,
  job: { jobId: number; runId: string; attempt: number; rateCentsPerCharacter: number },
): NarrationPort {
  return {
    async speak(request) {
      const named = readNarrationId(request.narrationId)
      if (named === null) {
        throw new Error(`'${request.narrationId}' is not a<attempt>-shot-<unit>-narration (S-070)`)
      }
      const answer = await narration.speak(request)
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
      })
      return answer
    },
  }
}
