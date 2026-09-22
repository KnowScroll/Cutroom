import type { LanguageModelPort } from '@cutroom/contracts'
import { recordReceipt, type Db } from '@cutroom/domain'
import { recordingSpend } from './spend.ts'

/**
 * The port the worker hands the pipeline (docs/features/reel-plan.md, Gate 2 "Receipts"): the
 * model it was given, wrapped so that each call's `model_receipt` is written as the call returns
 * (D-005, D-084). A call that throws returned nothing and leaves no receipt; every call before it
 * keeps its own, whatever happens to the run afterwards.
 *
 * All five calls are recorded (S-037, S-074, S-126): the observation and the reconciliation of a picture
 * or a take are tied to their receipts by key — the one `observe` receipt whose `pictureIds` or
 * `takeIds` is that picture's or take's, and the one `reconciler` receipt likewise — so a call that
 * left no row would leave a record nothing can join.
 *
 * Each row names its call, its picture ids and its take ids — the columns reel-stills' Slice 3
 * migration and reel-render's Slice 1 migration added (S-049, S-072).
 *
 * AND A CALL THAT ANSWERED AND COULD NOT BE READ LEAVES A `lost_call` ROW (paid-failures, S-142).
 * The adapter throws `Spent` once a 200 is in hand — a reasoning block with no answer, a fence, a
 * schema echo, a body cut off mid-JSON — and `recordingSpend` writes the row and rethrows, so the
 * run fails exactly as it did. The figure is zero while the Token Plan covers these calls (S-129);
 * the ROW is what the next session needs, and it is written against the job that made the call,
 * which is why the job id is asked for here rather than assumed.
 */
export function recordingPort(
  model: LanguageModelPort,
  db: Db,
  runId: string,
  jobId: number,
): LanguageModelPort {
  const job = { jobId, runId }
  return {
    async structured(call) {
      const answer = await recordingSpend(db, job, () => model.structured(call))
      recordReceipt(db, runId, answer.receipt)
      return answer
    },
    async observe(call) {
      const answer = await recordingSpend(db, job, () => model.observe(call))
      recordReceipt(db, runId, answer.receipt)
      return answer
    },
    async compare(call) {
      const answer = await recordingSpend(db, job, () => model.compare(call))
      recordReceipt(db, runId, answer.receipt)
      return answer
    },
    async judgeCut(call) {
      const answer = await recordingSpend(db, job, () => model.judgeCut(call))
      recordReceipt(db, runId, answer.receipt)
      return answer
    },
    // Gate 1's text step (S-112, S-126). The sensor makes this call, through the reader the
    // pipeline hands it — which is made from THIS port, so the vision call a real sensor pays for
    // leaves a row like every other (D-084, D-006).
    async readText(call) {
      const answer = await recordingSpend(db, job, () => model.readText(call))
      recordReceipt(db, runId, answer.receipt)
      return answer
    },
  }
}
