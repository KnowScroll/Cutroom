import { createHash } from 'node:crypto'
import type {
  AssemblerPort,
  LanguageModelPort,
  MediaPort,
  RenderManifest,
  RenderSettings,
} from '@cutroom/contracts'
import {
  canonicalJson,
  finishVideo,
  readClipsInputs,
  readRenderInputs,
  readRequest,
  readRun,
  readSelectedPlan,
  spentCents,
  startRender,
  startStage,
  type ClaimedJob,
  type Db,
  type EventBody,
  type HeldShot,
  type RenderInputs,
} from '@cutroom/domain'
import { cutReel, renderManifest, shotIdOf } from '@cutroom/pipeline'
import { CONTRACT_VERSION, type RunResult } from '@cutroom/reel-contract'
import { recordingPort } from './recording-port.ts'

// The `reel.assemble` job (docs/features/reel-render.md, Gate 2 "The chain", "The render manifest",
// "How a video run ends" and "Cancel, and a restart"): the chain's fourth and last row, created only
// for a `video` run whose clips stage completed (S-069). It settles the cancel flag the same way the
// clips job does — `stage.started` for video is already written, so none is added — builds the render
// manifest from the run's rows, writes it with its hash on a render row, and only then hands it to
// `cutReel`: the one pass, the output measured, the frame strip and Gate 7 (S-073, S-074).
//
// IT IS HANDED NO IMAGE, NARRATION OR VIDEO PORT: nothing can be bought once assembly begins, because
// the job that assembles holds no port that buys, and no job follows it (I-18).

export interface AssembleJobContext {
  /** The ports the worker was handed; it never constructs one (S-021, S-075). */
  model: LanguageModelPort
  media: MediaPort
  assembler: AssemblerPort
  render: RenderSettings
}

const messageOf = (error: unknown) => (error instanceof Error ? error.message : String(error))

export async function runAssembleJob(
  db: Db,
  job: ClaimedJob,
  context: AssembleJobContext,
): Promise<void> {
  const runId = job.correlationId
  const found = readRun(db, runId)
  if (found === undefined) throw new Error(`reel.assemble job ${job.id} names no run '${runId}'`)
  const finished = { contractVersion: CONTRACT_VERSION, runId, requestId: found.status.requestId }

  if (startStage(db, runId, 'video') === 'cancelled') {
    // Nothing is rendered, and what the chain spent before is what the run cost (D-081).
    const result: RunResult = { ...finished, costCents: spentCents(db, runId), status: 'cancelled' }
    finishVideo(db, { runId, jobId: job.id, result })
    return
  }

  // The one document the render is made from, built from the run's rows. Rows that cannot make one
  // fail the run before any render row exists (S-073).
  const plan = readSelectedPlan(db, runId)
  let rows: RenderInputs
  let built: RenderManifest
  try {
    rows = readRenderInputs(db, runId)
    built = renderManifest(
      { runId, attempt: job.attempts, plan, request: readRequest(db, runId), ...rows },
      context.render,
    )
  } catch (error) {
    finishVideo(db, {
      runId,
      jobId: job.id,
      result: {
        ...finished,
        costCents: spentCents(db, runId),
        status: 'failed',
        detail: `the render manifest could not be built: ${messageOf(error)}`,
      },
    })
    return
  }

  // Assembly begins: the render row, with the manifest, its hash and its start time, BEFORE the
  // assembler is called (I-18). The hash is of the text the row stores (S-085).
  const hash = createHash('sha256').update(canonicalJson(built), 'utf8').digest('hex')
  startRender(db, { runId, jobId: job.id, attempt: job.attempts, renderManifest: built, hash })

  const outcome = await cutReel(
    { renderManifest: built },
    {
      assembler: context.assembler,
      media: context.media,
      model: recordingPort(context.model, db, runId),
    },
    context.render,
  )

  // A hold's four labels are written with whatever ending the job reaches (S-058's form): they are
  // facts of the manifest, decided before the pass ran.
  const holds: HeldShot[] = built.shots.flatMap((shot) =>
    shot.hold === null
      ? []
      : [
          {
            shotId: shot.shotId,
            takeId: shot.takeId,
            seconds: shot.hold.seconds,
            reason: shot.hold.reason,
          },
        ],
  )
  const events: EventBody[] = holds.map((held) => ({
    type: 'degraded',
    shotId: held.shotId,
    reason: held.reason,
  }))
  if (outcome.gate7 !== null) {
    events.push({ type: 'verdict', gate: '7', outcome: outcome.gate7.outcome })
  }
  const render = {
    renderId: built.renderId,
    holds,
    assembled: outcome.assembled,
    measured: outcome.measured,
    gate7: outcome.gate7,
  }
  const costCents = spentCents(db, runId)

  if (outcome.kind === 'completed' && outcome.assembled !== null) {
    // The stage produced its output, so it finished (S-025, S-069). The stills are the chosen
    // pictures, in shot order, at the paths their rows record; the degradations are the stills
    // stage's in the order reached, then the holds' in shot order.
    const inputs = readClipsInputs(db, runId)
    finishVideo(db, {
      runId,
      jobId: job.id,
      render,
      events: [...events, { type: 'stage.finished', stage: 'video' }],
      result: {
        ...finished,
        costCents,
        status: 'completed',
        until: 'video',
        estimateCents: plan.estimateCents,
        stills: inputs.stills.map((still) => ({
          pictureId: still.pictureId,
          shotId: shotIdOf(still.shotUnit),
          path: still.path,
        })),
        video: { path: outcome.assembled.path },
        degradations: [
          ...rows.degradations,
          ...holds.map((held) => ({ shotId: held.shotId, reason: held.reason })),
        ],
      },
    })
    return
  }

  if (outcome.kind === 'stopped-rule') {
    // The file and its render row stay; the result carries no video, and no question is written: a
    // reel that failed its last check is never given back looking finished (S-074).
    finishVideo(db, {
      runId,
      jobId: job.id,
      render,
      events,
      result: {
        ...finished,
        costCents,
        status: 'stopped',
        reason: 'rule',
        rule: outcome.rule,
        step: 'video',
        detail: outcome.detail,
      },
    })
    return
  }

  finishVideo(db, {
    runId,
    jobId: job.id,
    render,
    events,
    result: {
      ...finished,
      costCents,
      status: 'failed',
      detail: outcome.kind === 'failed' ? outcome.detail : 'the cut completed with no file',
    },
  })
}
