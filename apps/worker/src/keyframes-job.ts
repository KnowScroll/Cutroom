import type {
  ImagePort,
  LanguageModelPort,
  PictureSensorPort,
  PlanSettings,
  StillsSettings,
} from '@cutroom/contracts'
import {
  finishStills,
  imageCallCount,
  readReelCapCents,
  readRequest,
  readRun,
  readSelectedPlan,
  spentCents,
  startStage,
  type ClaimedJob,
  type Db,
  type DegradedShot,
} from '@cutroom/domain'
import { makeStills, placePictures, shotIdOf, type StillsOutcome } from '@cutroom/pipeline'
import { CONTRACT_VERSION, type RunResult } from '@cutroom/reel-contract'
import { guardedImagePort } from './guarded-image-port.ts'
import { appendBudgetStopQuestion } from './questions.ts'
import { stillsRecorder } from './recorder.ts'
import { recordingPort } from './recording-port.ts'

// The `reel.keyframes` job (docs/features/reel-stills.md, Gate 2 "How a run goes" and "How a stills
// run ends"): the chain's second row, created only for an admitted `stills` run (D-081, D-083). It
// settles the cancel flag and the stage's start in one transaction (S-027), reads the per-reel cap,
// hands `makeStills` the selected plan and the ports it built, and ends the run with whatever the
// stage answered — the chosen flags, the degradations and their labels, the events and the result
// in one transaction (S-046) — and, for a stop at the per-reel cap, a question after it (D-100).

export interface KeyframesJobContext {
  /** The model, image and sensor ports the worker was handed; it never constructs one (S-038). */
  model: LanguageModelPort
  image: ImagePort
  sensors: PictureSensorPort
  settings: PlanSettings
  stills: StillsSettings
  /** The BUDGET.md whose `Per reel, all-in` row is the cap (D-100), read once per attempt. */
  budgetPath: string
  /** The questions file a stop at the per-reel cap is appended to (D-097, D-100). */
  questionsPath: string
}

/**
 * Every shot the stage degraded, in the order its ladders reached them, with the picture carrying
 * the reason and every picture of it this attempt made — so all four labels can be written (I-4,
 * S-058).
 */
function degradedShots(outcome: StillsOutcome): DegradedShot[] {
  return outcome.degradations.map((d) => {
    const pictures = outcome.pictures.filter((p) => shotIdOf(p.shotUnit) === d.shotId)
    const labelled = pictures.find((p) => p.degradation === d.reason)
    return {
      shotId: d.shotId,
      gate: d.gate,
      reason: d.reason,
      lastPictureId: labelled?.pictureId ?? '',
      pictureIds: pictures.map((p) => p.pictureId),
    }
  })
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
  const ceilingCents = request.options.budgetCents
  let capCents: number
  try {
    // One figure, read once per attempt: what every image call is compared with (D-100, S-035).
    capCents = readReelCapCents(context.budgetPath)
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    const result: RunResult = {
      ...finished,
      costCents: spentCents(db, runId),
      status: 'failed',
      detail,
    }
    finishStills(db, { runId, jobId: job.id, result })
    return
  }

  // The run's image calls before this attempt, counted from its receipts now, at the attempt's start:
  // a job run again after its worker died makes every picture again, and what the attempts before
  // it made comes out of its reserve (S-048). The stage decides what that leaves (S-061).
  const earlierImageCalls = imageCallCount(db, runId)
  const outcome = await makeStills(
    { runId, attempt: job.attempts, earlierImageCalls, request, plan },
    {
      image: guardedImagePort(context.image, db, {
        jobId: job.id,
        runId,
        attempt: job.attempts,
        placements: placePictures(plan),
        rateCents: context.settings.imageRateCents,
        style: { id: request.style.id, version: request.style.version },
        stills: context.stills,
        capCents,
        ceilingCents,
      }),
      model: recordingPort(context.model, db, runId),
      sensors: context.sensors,
      recorder: stillsRecorder(db, runId),
    },
    { plan: context.settings, stills: context.stills },
  )
  const costCents = spentCents(db, runId)
  // A degradation the checks reached is labelled whatever ends the run (I-4, S-058).
  const degraded = degradedShots(outcome)

  if (outcome.kind === 'completed') {
    // The approved pictures, in shot order, at the paths their rows record (the contract's StillRef).
    const chosen = outcome.pictures.filter((p) => p.chosen).sort((x, y) => x.shotUnit - y.shotUnit)
    finishStills(db, {
      runId,
      jobId: job.id,
      chosen: chosen.map((p) => p.pictureId),
      degraded,
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
        degradations: degraded.map((d) => ({ shotId: d.shotId, reason: d.reason })),
      },
    })
    return
  }

  // A stage that did not complete has no `stage.finished`, and nothing is chosen (S-025's rule,
  // S-046, S-055): its events are the verdicts and degradations reached.
  const ended = (result: RunResult) =>
    finishStills(db, { runId, jobId: job.id, degraded, events: outcome.events, result })

  if (outcome.kind === 'stopped-rule') {
    ended({
      ...finished,
      costCents,
      status: 'stopped',
      reason: 'rule',
      rule: outcome.rule,
      step: 'stills',
      detail: outcome.detail,
    })
    return
  }

  if (outcome.kind === 'stopped-budget') {
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
    // The engine's own cap fired, so the owner is asked — after the run is finished (D-100, S-026,
    // S-035). A stop at the caller's ceiling is returned, not written.
    if (outcome.limit === 'reel') {
      appendBudgetStopQuestion(context.questionsPath, {
        runId,
        requestId: request.requestId,
        estimateCents: outcome.estimateCents,
        spentCents: costCents,
        pictures: outcome.pictures.length,
        ceilingCents,
        capCents,
        imageRateCents: context.settings.imageRateCents,
        videoRateCentsPerSecond: context.settings.videoRateCentsPerSecond,
        plan: {
          role: plan.role,
          units: plan.units.length,
          estimateCents: plan.estimateCents,
          plannedImageCalls: plan.plannedImageCalls,
        },
      })
    }
    return
  }

  ended({ ...finished, costCents, status: 'failed', detail: outcome.detail })
}
