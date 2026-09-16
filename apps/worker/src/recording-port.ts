import type { LanguageModelPort } from '@cutroom/contracts'
import { recordReceipt, type Db } from '@cutroom/domain'

/**
 * The port the worker hands the pipeline (docs/features/reel-plan.md, Gate 2 "Receipts"): the
 * model it was given, wrapped so that each call's `model_receipt` is written as the call returns
 * (D-005, D-084). A call that throws returned nothing and leaves no receipt; every call before it
 * keeps its own, whatever happens to the run afterwards.
 *
 * All three calls are recorded (S-037): the observation and the reconciliation of a picture are
 * tied to their receipts by key — the one `observe` receipt whose `pictureIds` is that picture's,
 * the one `reconciler` receipt whose `pictureIds` is that picture's — so a call that left no row
 * would leave a record nothing can join.
 *
 * `model_receipt` has no `call` or `picture_ids` column until reel-stills' Slice 3 migration, so
 * until then a receipt's row carries its role, model, temperature, usage and `fake` and not those
 * two fields (S-049). Nothing calls `observe` or `compare` before Slice 3.
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
  }
}
