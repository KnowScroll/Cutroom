import { finishRun, readRun, startStage, type ClaimedJob, type Db } from '@cutroom/domain'
import { CONTRACT_VERSION } from '@cutroom/reel-contract'

// The `reel.keyframes` job (docs/features/reel-stills.md, Gate 2 "How a run goes"): the chain's
// second row, created only for an admitted `stills` run (D-081, D-083).
//
// Slice 2 builds the chain and not the pictures. So this runner settles the cancel flag and the
// stage's start in one transaction (S-027) and then finishes the run `failed` with why — a
// contract-valid ending that no check asserts, and that Slice 3 replaces with the stills stage.

/** What a run is told while the stills stage does not exist. Slice 3 removes it. */
const NOT_BUILT = 'pictures are not built'

export async function runKeyframesJob(db: Db, job: ClaimedJob): Promise<void> {
  const runId = job.correlationId
  const found = readRun(db, runId)
  if (found === undefined) throw new Error(`reel.keyframes job ${job.id} names no run '${runId}'`)
  const finished = {
    contractVersion: CONTRACT_VERSION,
    runId,
    requestId: found.status.requestId,
    // Nothing has been generated, so nothing has been spent. Slice 3 reads the chain's sum.
    costCents: 0,
  }

  // Before every attempt, in one transaction with the cancel read, so a cancel cannot land between
  // them (S-027). A run cancelled here has no `stage.started` for stills and makes no image call.
  if (startStage(db, runId, 'stills') === 'cancelled') {
    finishRun(db, { runId, jobId: job.id, result: { ...finished, status: 'cancelled' } })
    return
  }

  finishRun(db, {
    runId,
    jobId: job.id,
    result: { ...finished, status: 'failed', detail: NOT_BUILT },
  })
}
