import type {
  ImagePort,
  LanguageModelPort,
  PictureSensorPort,
  PlanSettings,
  StillsSettings,
} from '@cutroom/contracts'
import {
  finishStills,
  readRequest,
  readRun,
  readSelectedPlan,
  spentCents,
  startStage,
  type ClaimedJob,
  type Db,
} from '@cutroom/domain'
import { makeStills, placePictures, shotIdOf } from '@cutroom/pipeline'
import { CONTRACT_VERSION, type RunResult } from '@cutroom/reel-contract'
import { guardedImagePort } from './guarded-image-port.ts'
import { stillsRecorder } from './recorder.ts'
import { recordingPort } from './recording-port.ts'

// The `reel.keyframes` job (docs/features/reel-stills.md, Gate 2 "How a run goes" and "How a stills
// run ends"): the chain's second row, created only for an admitted `stills` run (D-081, D-083). It
// settles the cancel flag and the stage's start in one transaction (S-027), hands `makeStills` the
// selected plan and the ports it built, and ends the run with whatever the stage answered — the
// chosen flags, the events and the result in one transaction (S-046).

export interface KeyframesJobContext {
  /** The model, image and sensor ports the worker was handed; it never constructs one (S-038). */
  model: LanguageModelPort
  image: ImagePort
  sensors: PictureSensorPort
  settings: PlanSettings
  stills: StillsSettings
}

export async function runKeyframesJob(
  db: Db,
  job: ClaimedJob,
  context: KeyframesJobContext,
): Promise<void> {
  const runId = job.correlationId
  const found = readRun(db, runId)
  if (found === undefined) throw new Error(`reel.keyframes job ${job.id} names no run '${runId}'`)
  const finished = { contractVersion: CONTRACT_VERSION, runId, requestId: found.status.requestId }

  // Before every attempt, in one transaction with the cancel read, so a cancel cannot land between
  // them (S-027). A run cancelled here has no `stage.started` for stills and makes no image call.
  if (startStage(db, runId, 'stills') === 'cancelled') {
    const result: RunResult = { ...finished, costCents: spentCents(db, runId), status: 'cancelled' }
    finishStills(db, { runId, jobId: job.id, result })
    return
  }

  const request = readRequest(db, runId)
  const plan = readSelectedPlan(db, runId)
  const outcome = await makeStills(
    // The run's image calls before this attempt are Slice 5's to count (S-048): a first attempt has
    // made none, and the restart that could have is not built yet.
    { runId, attempt: job.attempts, earlierImageCalls: 0, request, plan },
    {
      image: guardedImagePort(context.image, db, {
        jobId: job.id,
        runId,
        attempt: job.attempts,
        placements: placePictures(plan),
        rateCents: context.settings.imageRateCents,
        style: { id: request.style.id, version: request.style.version },
        stills: context.stills,
      }),
      model: recordingPort(context.model, db, runId),
      sensors: context.sensors,
      recorder: stillsRecorder(db, runId),
    },
    { plan: context.settings, stills: context.stills },
  )
  const costCents = spentCents(db, runId)

  if (outcome.kind === 'completed') {
    // The approved pictures, in shot order, at the paths their rows record (the contract's StillRef).
    const chosen = outcome.pictures.filter((p) => p.chosen).sort((x, y) => x.shotUnit - y.shotUnit)
    finishStills(db, {
      runId,
      jobId: job.id,
      chosen: chosen.map((p) => p.pictureId),
      // The stage produced its pictures, so it finished (S-025, S-046).
      events: [...outcome.events, { type: 'stage.finished', stage: 'stills' }],
      result: {
        ...finished,
        costCents,
        status: 'completed',
        until: 'stills',
        estimateCents: plan.estimateCents,
        stills: chosen.map((p) => ({
          pictureId: p.pictureId,
          shotId: shotIdOf(p.shotUnit),
          path: p.path,
        })),
        degradations: [],
      },
    })
    return
  }

  // A stage that did not complete has no `stage.finished` (S-025's rule, S-046). A rule stop and a
  // budget stop are Slice 4's endings: until then either is a fault, said so.
  const detail =
    outcome.kind === 'failed'
      ? outcome.detail
      : `the stills stage ended '${outcome.kind}', and that ending is not built`
  finishStills(db, {
    runId,
    jobId: job.id,
    events: outcome.events,
    result: { ...finished, costCents, status: 'failed', detail },
  })
}
