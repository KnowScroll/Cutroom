import {
  finishVideo,
  readRun,
  spentCents,
  startStage,
  type ClaimedJob,
  type Db,
} from '@cutroom/domain'
import { CONTRACT_VERSION, type RunResult } from '@cutroom/reel-contract'

// The `reel.assemble` job (docs/features/reel-render.md, Gate 2 "The chain" and "Cancel, and a
// restart"): the chain's fourth and last row, created only for a `video` run whose clips stage
// completed (S-069). It settles the cancel flag the same way the clips job does — `stage.started` for
// video is already written, so none is added — and IS HANDED NO IMAGE, NARRATION OR VIDEO PORT: nothing
// can be bought once assembly begins (I-18).
//
// Assembly is not built yet (reel-render's Slice 3): a started job that is not cancelled finishes the
// run failed, saying so — an answer the contract describes, which Slice 4 replaces with the one pass.

export async function runAssembleJob(db: Db, job: ClaimedJob): Promise<void> {
  const runId = job.correlationId
  const found = readRun(db, runId)
  if (found === undefined) throw new Error(`reel.assemble job ${job.id} names no run '${runId}'`)
  const finished = { contractVersion: CONTRACT_VERSION, runId, requestId: found.status.requestId }

  if (startStage(db, runId, 'video') === 'cancelled') {
    const result: RunResult = { ...finished, costCents: spentCents(db, runId), status: 'cancelled' }
    finishVideo(db, { runId, jobId: job.id, result })
    return
  }

  const result: RunResult = {
    ...finished,
    costCents: spentCents(db, runId),
    status: 'failed',
    detail: 'assembly is not built',
  }
  finishVideo(db, { runId, jobId: job.id, result })
}
