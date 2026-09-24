import type { RefusalRecorder } from '@cutroom/contracts'
import { recordRefusedAnswer, type Db } from '@cutroom/domain'

/**
 * Where the stills and clips stages hand every answer a gate refused — a witness's observation, a
 * narration's word timings — to be KEPT in a `refused_answer` row (docs/features/ask-again.md,
 * S-156). The row goes through `recordRefusedAnswer`, the one function that redacts and caps what
 * a provider handed back (D-022), the same one the recording port calls for an answer the adapter
 * could not read. Nothing in the engine reads the row back: it is for a person.
 */
export function refusalRecorder(db: Db, runId: string): RefusalRecorder {
  return {
    async keep(refusal) {
      recordRefusedAnswer(db, { runId, refusal })
    },
  }
}
