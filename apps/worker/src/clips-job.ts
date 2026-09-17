import {
  finishVideo,
  readRun,
  spentCents,
  startStage,
  type ClaimedJob,
  type Db,
} from '@cutroom/domain'
import { CONTRACT_VERSION, type RunResult } from '@cutroom/reel-contract'

// The `reel.clips` job (docs/features/reel-render.md, Gate 2 "The chain" and "Cancel, and a
// restart"): the chain's third row, created only for a `video` run whose stills stage completed
// (S-069). Before every attempt it settles the cancel flag and `stage.started` for video in one
// transaction (S-027, S-051), so a cancel cannot land between the read and the start and a job run
// again writes no second `stage.started`.
//
// Clips are not built yet (reel-render's Slice 2): a started job that is not cancelled finishes the
// run failed, saying so — an answer the contract describes, which Slice 3 replaces with the clips
// stage.

export async function runClipsJob(db: Db, job: ClaimedJob): Promise<void> {
  const runId = job.correlationId
  const found = readRun(db, runId)
  if (found === undefined) throw new Error(`reel.clips job ${job.id} names no run '${runId}'`)
  const finished = { contractVersion: CONTRACT_VERSION, runId, requestId: found.status.requestId }

  if (startStage(db, runId, 'video') === 'cancelled') {
    // No call is made, and what the chain spent before is what the run cost (D-081).
    const result: RunResult = { ...finished, costCents: spentCents(db, runId), status: 'cancelled' }
    finishVideo(db, { runId, jobId: job.id, result })
    return
  }

  const result: RunResult = {
    ...finished,
    costCents: spentCents(db, runId),
    status: 'failed',
    detail: 'clips are not built',
  }
  finishVideo(db, { runId, jobId: job.id, result })
}
