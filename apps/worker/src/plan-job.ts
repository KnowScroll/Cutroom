import {
  failureKindOf,
  type Gate0Verdict,
  type LanguageModelPort,
  type Plan,
  type PlanSettings,
} from '@cutroom/contracts'
import {
  admitStills,
  finishRun,
  readReelCapCents,
  readRequest,
  readRun,
  startStage,
  type ClaimedJob,
  type Db,
  type EventBody,
  type PlanRow,
} from '@cutroom/domain'
import {
  GATE_ORDER,
  admitPictures,
  admitVideo,
  planReel,
  type PlanOutcome,
  type PlanRecord,
} from '@cutroom/pipeline'
import { CONTRACT_VERSION, type SubmitRequest } from '@cutroom/reel-contract'
import { appendBudgetQuestion } from './questions.ts'
import { recordingPort } from './recording-port.ts'

// The `reel.plan` job (docs/features/reel-plan.md, Gate 2 "How a run goes"). It reads the cap once,
// runs `planReel` against a port that records every receipt, and finishes the run in one transaction
// with whichever answer planning gave: a selected plan, a budget refusal, or a rule stop.

export interface PlanJobContext {
  /** The model the stand-in or, one day, an adapter provides. The worker never chooses one. */
  model: LanguageModelPort
  settings: PlanSettings
  /** The BUDGET.md whose `Per reel, all-in` row is the cap (D-100). */
  budgetPath: string
  /** The questions file a per-reel cap refusal is appended to (D-097, D-100). */
  questionsPath: string
}

interface Planned {
  request: SubmitRequest
  capCents: number
  outcome: PlanOutcome
}

async function plan(
  db: Db,
  runId: string,
  jobId: number,
  context: PlanJobContext,
): Promise<Planned> {
  const request = readRequest(db, runId)
  // One figure, read once per job: what Gate 0 compares with (D-100, D-014).
  const capCents = readReelCapCents(context.budgetPath)
  const model = recordingPort(context.model, db, runId, jobId)
  const outcome = await planReel(request, model, capCents, context.settings)
  return { request, capCents, outcome }
}

/** Every plan the record holds — both of the fork, and the repair if one was made — as rows. */
function rowsOf(record: PlanRecord, selected: 'a' | 'b' | 'repair' | null): PlanRow[] {
  const { fork, repair, verdicts, scores } = record
  const row = (role: 'a' | 'b' | 'repair', verdict: Gate0Verdict | null): PlanRow[] => {
    const planned = role === 'repair' ? repair : fork[role]
    if (planned === null || verdict === null) return []
    return [
      {
        role,
        axis: fork.axis,
        plan: planned,
        verdict,
        // A score exists only when both plans survived, and the repair is never scored (D-113).
        score: role === 'repair' || scores === null ? null : scores[role].total,
        selected: selected === role,
      },
    ]
  }
  return [...row('a', verdicts.a), ...row('b', verdicts.b), ...row('repair', verdicts.repair)]
}

/** A stills run's admission, its figure named as a refusal carries it. */
function picturesAdmission(plan: Plan, ceilingCents: number, settings: PlanSettings) {
  const { admitted, picturesCents } = admitPictures(plan, ceilingCents, settings)
  return { admitted, estimateCents: picturesCents }
}

/** One verdict event per plan, in the order the rows are written. */
function verdictEvents(rows: readonly PlanRow[]): EventBody[] {
  return rows.map((row) => ({ type: 'verdict', gate: GATE_ORDER[0], outcome: row.verdict.outcome }))
}

export async function runPlanJob(db: Db, job: ClaimedJob, context: PlanJobContext): Promise<void> {
  const runId = job.correlationId
  const found = readRun(db, runId)
  if (found === undefined) throw new Error(`reel.plan job ${job.id} names no run '${runId}'`)
  const finished = {
    contractVersion: CONTRACT_VERSION,
    runId,
    requestId: found.status.requestId,
    costCents: 0,
  }

  // The cancel flag is read before the plan stage starts, and before a job interrupted mid-stage is
  // run again (S-027). A cancel that arrives after this does not stop the stage (Gate review 2).
  if (startStage(db, runId, 'plan') === 'cancelled') {
    finishRun(db, { runId, jobId: job.id, result: { ...finished, status: 'cancelled' } })
    return
  }

  let planned: Planned
  try {
    planned = await plan(db, runId, job.id, context)
  } catch (error) {
    // A thrown call or a refused answer is a fault: the run fails with why, and every receipt of a
    // call that returned is already written. The plan stage has no catch of its own, so its kind is
    // decided here, from the thrown thing's class (S-163) — a cap that cannot be read is `engine`.
    const detail = error instanceof Error ? error.message : String(error)
    finishRun(db, {
      runId,
      jobId: job.id,
      result: { ...finished, status: 'failed', detail },
      failure: failureKindOf(error),
    })
    return
  }
  const { request, capCents, outcome } = planned

  if (!('fork' in outcome)) {
    // Too few sentences for both groupings: no plan, no call, no verdict (D-112).
    finishRun(db, {
      runId,
      jobId: job.id,
      result: {
        ...finished,
        status: 'stopped',
        reason: 'rule',
        rule: outcome.rule,
        step: 'plan',
        detail: outcome.detail,
      },
    })
    return
  }

  if (outcome.kind === 'selected') {
    const plans = rowsOf(outcome, outcome.selected)
    // The stage produced a plan, so it finished, whichever way the run goes from here (S-025).
    const events: EventBody[] = [...verdictEvents(plans), { type: 'stage.finished', stage: 'plan' }]

    const until = request.options.until
    if (until === 'stills' || until === 'video') {
      const chosen = plans.find((row) => row.selected)
      if (chosen === undefined)
        throw new Error(`the selected plan '${outcome.selected}' has no row`)
      const ceilingCents = request.options.budgetCents
      // What the run spends is what is compared with its ceiling: a stills run's pictures (S-030,
      // S-035), a video run's whole estimate (S-069).
      const { admitted, estimateCents } =
        until === 'video'
          ? admitVideo(chosen.plan, ceilingCents)
          : picturesAdmission(chosen.plan, ceilingCents, context.settings)

      if (!admitted) {
        // The caller's ceiling fired, not the engine's cap: the run is refused with the figure that
        // was compared, no question is written (D-100), and the chain gets no second row (D-083).
        finishRun(db, {
          runId,
          jobId: job.id,
          plans,
          events,
          result: {
            ...finished,
            status: 'refused',
            reason: 'budget',
            limit: 'ceiling',
            estimateCents,
            ceilingCents,
            capCents,
          },
        })
        return
      }

      // Admitted (S-030, S-035, S-069): one transaction writes the plan rows, the events, this job
      // done at cost 0, and the chain's `reel.keyframes` row. The run is not finished — the pictures
      // are, and for a video run what follows them (S-052).
      admitStills(db, { runId, jobId: job.id, plans, events })
      return
    }

    finishRun(db, {
      runId,
      jobId: job.id,
      plans,
      events,
      result: {
        ...finished,
        status: 'completed',
        until: 'plan',
        // The selected plan's estimate. The request's ceiling is never compared here: a plan-only
        // run is not refused against it, and planning costs nothing (D-083).
        estimateCents: outcome.estimateCents,
      },
    })
    return
  }

  // Ended at the plan step with nothing selected (D-113). The stage did not produce a plan, so it
  // has no `stage.finished`; the run ends with the verdicts (S-025).
  const plans = rowsOf(outcome, null)
  const events = verdictEvents(plans)

  if (outcome.kind === 'refused-budget') {
    const ceilingCents = request.options.budgetCents
    finishRun(db, {
      runId,
      jobId: job.id,
      plans,
      events,
      result: {
        ...finished,
        status: 'refused',
        reason: 'budget',
        limit: 'reel',
        estimateCents: outcome.estimateCents,
        ceilingCents,
        capCents,
      },
    })
    // The engine's own cap fired, so the owner is asked — after the run is finished (D-097, D-100).
    appendBudgetQuestion(context.questionsPath, {
      runId,
      requestId: request.requestId,
      estimateCents: outcome.estimateCents,
      ceilingCents,
      capCents,
      imageRateCents: context.settings.imageRateCents,
      videoRateCentsPerSecond: context.settings.videoRateCentsPerSecond,
      plans: plans.map((row) => ({
        role: row.role,
        units: row.plan.units.length,
        estimateCents: row.plan.estimateCents,
      })),
    })
    return
  }

  finishRun(db, {
    runId,
    jobId: job.id,
    plans,
    events,
    result: {
      ...finished,
      status: 'stopped',
      reason: 'rule',
      rule: outcome.rule,
      step: 'plan',
      detail: outcome.detail,
    },
  })
}
