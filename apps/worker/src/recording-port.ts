import type { LanguageModelPort } from '@cutroom/contracts'
import { recordReceipt, type Db } from '@cutroom/domain'

/**
 * The port the worker hands the pipeline (docs/features/reel-plan.md, Gate 2 "Receipts"): the
 * model it was given, wrapped so that each call's `model_receipt` is written as the call returns
 * (D-005, D-084). A call that throws returned nothing and leaves no receipt; every call before it
 * keeps its own, whatever happens to the run afterwards.
 *
 * All four calls are recorded (S-037, S-074): the observation and the reconciliation of a picture
 * or a take are tied to their receipts by key — the one `observe` receipt whose `pictureIds` or
 * `takeIds` is that picture's or take's, and the one `reconciler` receipt likewise — so a call that
 * left no row would leave a record nothing can join.
 *
 * Each row names its call, its picture ids and its take ids — the columns reel-stills' Slice 3
 * migration and reel-render's Slice 1 migration added (S-049, S-072).
 */
export function recordingPort(model: LanguageModelPort, db: Db, runId: string): LanguageModelPort {
  return {
    async structured(call) {
      const answer = await model.structured(call)
      recordReceipt(db, runId, answer.receipt)
      return answer
    },
    async observe(call) {
      const answer = await model.observe(call)
      recordReceipt(db, runId, answer.receipt)
      return answer
    },
    async compare(call) {
      const answer = await model.compare(call)
      recordReceipt(db, runId, answer.receipt)
      return answer
    },
    async judgeCut(call) {
      const answer = await model.judgeCut(call)
      recordReceipt(db, runId, answer.receipt)
      return answer
    },
  }
}
