import type { LanguageModelPort } from '@cutroom/contracts'
import { recordReceipt, type Db } from '@cutroom/domain'

/**
 * The port the worker hands `planReel` (docs/features/reel-plan.md, Gate 2 "Receipts"): the model
 * it was given, wrapped so that each call's `model_receipt` is written as the call returns (D-005,
 * D-084). A call that throws returned nothing and leaves no receipt; every call before it keeps
 * its own, whatever happens to the run afterwards.
 */
export function recordingPort(model: LanguageModelPort, db: Db, runId: string): LanguageModelPort {
  return {
    async structured(call) {
      const answer = await model.structured(call)
      recordReceipt(db, runId, answer.receipt)
      return answer
    },
  }
}
