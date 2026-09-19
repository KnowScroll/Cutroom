import type {
  LanguageModelPort,
  MediaPort,
  NarrationPort,
  PlanSettings,
  RenderSettings,
  VideoPort,
} from '@cutroom/contracts'
import {
  advanceClips,
  finishVideo,
  readClipsInputs,
  readReelCapCents,
  readRequest,
  readRun,
  readSelectedPlan,
  spentCents,
  startStage,
  type ClaimedJob,
  type Db,
} from '@cutroom/domain'
import { makeClips, readTakeId } from '@cutroom/pipeline'
import { CONTRACT_VERSION, type RunResult } from '@cutroom/reel-contract'
import { clipsRecorder } from './clips-recorder.ts'
import { guardedNarrationPort } from './narration-port.ts'
import { appendClipsStopQuestion } from './questions.ts'
import { recordingPort } from './recording-port.ts'
import { guardedVideoPort, validatingVideoPort, type ClipsLimits } from './video-port.ts'

// The `reel.clips` job (docs/features/reel-render.md, Gate 2 "The chain", "How a video run ends" and
// "Cancel, and a restart"): the chain's third row, created only for a `video` run whose stills stage
// completed (S-069). Before every attempt it settles the cancel flag and `stage.started` for video in
// one transaction (S-027, S-051), so a cancel cannot land between the read and the start and a job run
// again writes no second `stage.started`. It hands `makeClips` the selected plan, the chosen pictures
// and the ports it built, and then either advances — its events, itself done with its cost kept, and
// the `reel.assemble` row — or ends the run with whatever the stage answered. Either way, in the same
// transaction, it writes the labels of every shot the stage held on its picture (reel-takes, S-098).

export interface ClipsJobContext {
  /** The ports the worker was handed; it never constructs one (S-021, S-075). */
  model: LanguageModelPort
  video: VideoPort
  narration: NarrationPort
  media: MediaPort
  settings: PlanSettings
  render: RenderSettings
  /** The BUDGET.md whose `Per reel, all-in` row is the cap (D-100), read once per attempt. */
  budgetPath: string
  /** The questions file a stop at the per-reel cap is appended to (D-097, D-100). */
  questionsPath: string
}

export async function runClipsJob(
  db: Db,
  job: ClaimedJob,
  context: ClipsJobContext,
): Promise<void> {
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

  const request = readRequest(db, runId)
  const plan = readSelectedPlan(db, runId)
  const ceilingCents = request.options.budgetCents
  let capCents: number
  let inputs: ReturnType<typeof readClipsInputs>
  try {
    // One figure, read once per attempt, as the keyframes job reads it: what every narration and clip
    // call is compared with (D-100, S-035, S-059). A cap that cannot be read fails the run before any
    // call is made.
    capCents = readReelCapCents(context.budgetPath)
    inputs = readClipsInputs(db, runId)
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    finishVideo(db, {
      runId,
      jobId: job.id,
      result: { ...finished, costCents: spentCents(db, runId), status: 'failed', detail },
    })
    return
  }

  // What both guards compare with, and where either puts the call it refuses (S-087).
  const limits: ClipsLimits = { capCents, ceilingCents, refused: [] }
  const outcome = await makeClips(
    { runId, attempt: job.attempts, request, plan, ...inputs },
    {
      // The validator outermost, then the guard, then the port the worker was given (S-071).
      video: validatingVideoPort(
        guardedVideoPort(context.video, db, {
          jobId: job.id,
          runId,
          attempt: job.attempts,
          degradedShots: inputs.degradedShots,
          rateCents: context.settings.videoRateCentsPerSecond,
          style: { id: request.style.id, version: request.style.version },
          limits,
          transient: context.render.transient,
        }),
      ),
      narration: guardedNarrationPort(context.narration, db, {
        jobId: job.id,
        runId,
        attempt: job.attempts,
        rateCentsPerCharacter: context.render.narrationRateCentsPerCharacter,
        limits,
        transient: context.render.transient,
      }),
      media: context.media,
      model: recordingPort(context.model, db, runId),
      recorder: clipsRecorder(db, runId),
    },
    { plan: context.settings, render: context.render },
  )

  // The held shots' labels are written with WHATEVER ENDING the job reaches, in the transaction that
  // ends its stage or its run (S-098).
  const { stillHolds } = outcome
  if (outcome.kind === 'completed') {
    // The run goes on: in one transaction, the held shots' labels, the stage's events, this job done
    // with its cost kept, and the chain's `reel.assemble` row. The run is not finished, and the video
    // stage has no stage.finished until its assembly completes (S-069).
    advanceClips(db, { runId, jobId: job.id, events: outcome.events, stillHolds })
    return
  }

  // Any other ending finishes the run, keeping this job's cost as its calls added it (S-081).
  const costCents = spentCents(db, runId)
  const ended = (result: RunResult) =>
    finishVideo(db, { runId, jobId: job.id, events: outcome.events, stillHolds, result })

  if (outcome.kind === 'stopped-rule') {
    ended({
      ...finished,
      costCents,
      status: 'stopped',
      reason: 'rule',
      rule: outcome.rule,
      step: 'video',
      detail: outcome.detail,
    })
    return
  }

  if (outcome.kind === 'stopped-budget') {
    // A call was refused, so it was not made: what was spent is what the guard read (S-059).
    ended({
      ...finished,
      costCents,
      status: 'stopped',
      reason: 'budget',
      limit: outcome.limit,
      estimateCents: outcome.estimateCents,
      ceilingCents,
      capCents,
    })
    // The engine's own cap fired, so the owner is asked, naming the call that was not made — after
    // the run is finished (D-100, S-026, S-035, S-087). A stop at the caller's ceiling is returned,
    // not written.
    const refused = limits.refused.at(-1)
    if (outcome.limit === 'reel' && refused !== undefined) {
      appendClipsStopQuestion(context.questionsPath, {
        runId,
        requestId: request.requestId,
        refused:
          refused.call === 'clip'
            ? {
                call: 'clip',
                takeId: refused.request.takeId,
                // Its number among its shot's takes, which its id carries (reel-takes, S-095).
                number: readTakeId(refused.request.takeId)?.number ?? null,
                seconds: refused.request.durationSeconds,
              }
            : {
                call: 'narration',
                narrationId: refused.request.narrationId,
                characters: [...refused.request.text].length,
              },
        estimateCents: outcome.estimateCents,
        spentCents: costCents,
        narrations: outcome.narrations.length,
        clips: outcome.takes.length,
        ceilingCents,
        capCents,
        imageRateCents: context.settings.imageRateCents,
        videoRateCentsPerSecond: context.settings.videoRateCentsPerSecond,
        narrationRateCentsPerCharacter: context.render.narrationRateCentsPerCharacter,
        plan: { role: plan.role, units: plan.units.length, estimateCents: plan.estimateCents },
      })
    }
    return
  }

  ended({ ...finished, costCents, status: 'failed', detail: outcome.detail })
}
