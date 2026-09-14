import { appendEvent, finishRun, readRun, type ClaimedJob, type Db } from '@cutroom/domain'
import { CONTRACT_VERSION } from '@cutroom/reel-contract'

/**
 * The `reel.plan` job (docs/features/reel-plan.md, Slice 1). Planning is not built yet, so the
 * run's plan stage starts and the run finishes `failed` with a detail saying so — a
 * contract-valid answer that no check asserts, and that Slice 3 replaces.
 */
export const NOT_BUILT = 'planning is not built'

export async function runPlanJob(db: Db, job: ClaimedJob): Promise<void> {
  const runId = job.correlationId
  const found = readRun(db, runId)
  if (found === undefined) throw new Error(`reel.plan job ${job.id} names no run '${runId}'`)

  appendEvent(db, runId, { type: 'stage.started', stage: 'plan' })
  finishRun(db, {
    runId,
    jobId: job.id,
    result: {
      contractVersion: CONTRACT_VERSION,
      runId,
      requestId: found.status.requestId,
      costCents: 0,
      status: 'failed',
      detail: NOT_BUILT,
    },
  })
}
