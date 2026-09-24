import { isSpent } from '@cutroom/contracts'
import { recordLostCall, type Db } from '@cutroom/domain'

/**
 * One call to a provider, with the row it owes written if it spent and could not be used
 * (docs/features/paid-failures.md, Gate 2; S-133, S-142).
 *
 * `Spent` is thrown by a real adapter once the provider has made something — a picture whose frame
 * is refused, a clip `ffprobe` cannot read, an answer that is not the JSON it was asked for. It
 * carries the port, the wire, the cost our configured rate gives that call and a detail; this
 * writes the `lost_call` row and adds the cost to the job row, then **rethrows the error
 * unchanged**, so the stage fails the run exactly as it did before this existed (S-046).
 *
 * It records and it does not repair. A caller that swallowed a `Spent` would turn a failure into a
 * run that carried on without what it paid for. The pipeline's `askStructured` catches one — a
 * `structured` answer refused for its shape — and asks once more; it never swallows it, because
 * this row and its `refused_answer` are already written, and a second refusal rethrows (S-156).
 *
 * THE CLASS IS `packages/contracts`', not `packages/providers`': `worker-no-providers` forbids this
 * package importing an adapter (S-038), which is exactly why a thrown classification could not be
 * caught here until this feature.
 */
export async function recordingSpend<T>(
  db: Db,
  job: { jobId: number; runId: string },
  call: () => Promise<T>,
): Promise<T> {
  try {
    return await call()
  } catch (error) {
    if (isSpent(error)) {
      recordLostCall(db, { jobId: job.jobId, runId: job.runId, lost: error.receipt })
    }
    throw error
  }
}
