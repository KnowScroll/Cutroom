import type { LanguageModelPort, PlanSettings } from '@cutroom/contracts'
import {
  appendEvent,
  finishRun,
  readReelCapCents,
  readRequest,
  readRun,
  type ClaimedJob,
  type Db,
  type PlanRow,
} from '@cutroom/domain'
import { GATE_ORDER, planReel, type PlanOutcome } from '@cutroom/pipeline'
import { CONTRACT_VERSION } from '@cutroom/reel-contract'
import { recordingPort } from './recording-port.ts'

// The `reel.plan` job (docs/features/reel-plan.md, Gate 2 "How a run goes"). It reads the cap once,
// runs `planReel` against a port that records every receipt, and finishes the run in one transaction.

export interface PlanJobContext {
  /** The model the stand-in or, one day, an adapter provides. The worker never chooses one. */
  model: LanguageModelPort
  settings: PlanSettings
  /** The BUDGET.md whose `Per reel, all-in` row is the cap (D-100). */
  budgetPath: string
}

type Selected = Extract<PlanOutcome, { kind: 'selected' }>

async function plan(db: Db, runId: string, context: PlanJobContext): Promise<Selected> {
  const request = readRequest(db, runId)
  // One figure, read once per job: what Gate 0 compares with (D-100, D-014).
  const capCents = readReelCapCents(context.budgetPath)
  const model = recordingPort(context.model, db, runId)
  const outcome = await planReel(request, model, capCents, context.settings)
  if (outcome.kind !== 'selected') {
    // reel-plan's Slice 4 builds the runs that end at the plan step without a selected plan.
    throw new Error(`finishing a run as '${outcome.kind}' is not built (reel-plan Slice 4)`)
  }
  return outcome
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

  appendEvent(db, runId, { type: 'stage.started', stage: 'plan' })

  let outcome: Selected
  try {
    outcome = await plan(db, runId, context)
  } catch (error) {
    // A thrown call, or an answer not built yet: the run fails with why, and every receipt of a
    // call that returned is already written.
    const detail = error instanceof Error ? error.message : String(error)
    finishRun(db, { runId, jobId: job.id, result: { ...finished, status: 'failed', detail } })
    return
  }

  const { fork, verdicts, scores, selected } = outcome
  const plans: PlanRow[] = (['a', 'b'] as const).map((role) => ({
    role,
    axis: fork.axis,
    plan: fork[role],
    verdict: verdicts[role],
    score: scores === null ? null : scores[role].total,
    selected: selected === role,
  }))
  finishRun(db, {
    runId,
    jobId: job.id,
    plans,
    events: [
      ...plans.map((row) => ({
        type: 'verdict' as const,
        gate: GATE_ORDER[0],
        outcome: row.verdict.outcome,
      })),
      { type: 'stage.finished', stage: 'plan' },
    ],
    result: {
      ...finished,
      status: 'completed',
      until: 'plan',
      // The selected plan's estimate. The request's ceiling is never compared here: a plan-only
      // run is not refused against it, and planning costs nothing (D-083).
      estimateCents: outcome.estimateCents,
    },
  })
}
