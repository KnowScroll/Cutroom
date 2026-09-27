import type { PlanSettings, RenderSettings, ResumeRates } from '@cutroom/contracts'
import {
  readReelCapCents,
  readResumeInputs,
  resumeRun,
  type ResumeQuestion,
  type ResumeStep,
  type ResumeStepped,
  type RunEnding,
} from '@cutroom/domain'
import { admitResume, planResume } from '@cutroom/pipeline'
import { appendResumeQuestion, appendResumeUnmade } from './questions.ts'

// The engine's own resume (docs/features/resume-failed.md, Gate 2 "Which endings are resumed, and who
// judges" and "How a resume is planned, admitted and made"; S-163). A run a stage fails by a provider's
// fault is resumed once, by the engine, IN THE TRANSACTION THAT FAILS IT: the finishing function writes
// the stage's labels, then runs the step built here in a savepoint — the run read as those labels left
// it, its cancel flag included, planned by the one planner a caller's resume uses, admitted by the one
// rule every guard keeps, and made — then `run.finished`. What the step asks for is written after the
// transaction: one question for a resume over the per-reel cap, one line for a resume that could not
// be made, nothing for one the table or the ceiling refuses.
//
// Behind a switch that is off unless the worker is started with it (S-163, in S-153's form): the
// service turns it on; every verified test runs without it, so a provider's fault still fails a run.

/**
 * The switch, and what the engine's resume is made with. Absent — or `undefined` — the switch is off
 * and no job hands its finishing function a resume.
 */
export interface ResumeContext {
  /** How long after the failure the resume is due: 15 minutes in the service (S-163, P-009). */
  delayMs: number
  /** The worker's own plan and render settings, whose rates the resume is priced at (S-124, S-155). */
  settings: PlanSettings
  render: RenderSettings
  /** The BUDGET.md whose `Per reel, all-in` row is the cap (D-100), read before the transaction. */
  budgetPath: string
  /** The questions file a resume over the cap, or one that could not be made, is written to (D-097). */
  questionsPath: string
}

/** A run's ending as a stage failed it: its failed result and the kind of its failure (S-163). */
export type FailedEnding = Extract<RunEnding, { result: { status: 'failed' } }>

/** What the engine's resume came to, inside the transaction that failed the run. */
type Resumed =
  | { outcome: 'resumed'; runId: string }
  /** Refused by the table of resumable endings — or over the caller's ceiling: nothing is written. */
  | { outcome: 'not-resumed' }
  /** Over the per-reel cap: the owner is asked, after the transaction (D-097, D-100). */
  | { outcome: 'cap'; question: ResumeQuestion }

/**
 * The rates a resume is priced at, from the settings the worker prices with. The one mapping: the
 * engine's own resume uses it, and the service's `ResumeService` prices a caller's with it, so the two
 * cannot come to price one resume differently (S-174).
 */
export const resumeRates = (settings: PlanSettings, render: RenderSettings): ResumeRates => ({
  imageRateCents: settings.imageRateCents,
  videoRateCentsPerSecond: settings.videoRateCentsPerSecond,
  narrationRateCentsPerCharacter: render.narrationRateCentsPerCharacter,
})

/**
 * Fails run `runId` with `ending` through `finish` — the job's own finishing function, handed the
 * engine's resume to run in its transaction, or nothing when the switch is off — and writes, after
 * that transaction, what the resume asked for.
 *
 * The cap is read HERE, before the transaction, since it is a file — and inside this `try`, so a cap
 * that cannot be read is a resume that could not be made, never a job buried. It is thrown only once
 * the table has said the run is one the engine resumes: a run the table refuses is refused, whatever
 * the cap file holds.
 */
export function finishFailed(
  context: ResumeContext | undefined,
  runId: string,
  ending: FailedEnding,
  finish: (resume: ResumeStep<Resumed> | undefined) => ResumeStepped<Resumed> | undefined,
): void {
  if (context === undefined) {
    finish(undefined)
    return
  }
  let cap: { cents: number } | { unread: unknown }
  try {
    cap = { cents: readReelCapCents(context.budgetPath) }
  } catch (error) {
    cap = { unread: error }
  }
  const rates = resumeRates(context.settings, context.render)

  const stepped = finish((tx, now) => {
    // Read inside the transaction, after the stage's labels, with the ending about to be written:
    // the cancel flag, a resume already made and a run that is itself a resume are all read here,
    // where the API's cancel must wait for this transaction (S-163).
    const inputs = readResumeInputs(tx, runId, ending)
    const planned = planResume(inputs, [], rates, 'engine')
    if (planned.outcome !== 'planned') return { outcome: 'not-resumed' }
    if ('unread' in cap) throw cap.unread
    const { plan } = planned
    const ceilingCents = inputs.request.options.budgetCents
    const admission = admitResume(inputs.spentCents, plan.estimateCents, cap.cents, ceilingCents)
    if (!admission.admitted) {
      if (admission.limit === 'ceiling') return { outcome: 'not-resumed' }
      return {
        outcome: 'cap',
        question: {
          runId,
          requestId: inputs.request.requestId,
          by: 'engine',
          named: [],
          resumeEstimateCents: plan.estimateCents,
          spentCents: inputs.spentCents,
          estimateCents: admission.estimateCents,
          capCents: cap.cents,
          ceilingCents,
          rates,
        },
      }
    }
    const resumedBy = resumeRun(tx, runId, plan, {
      now,
      delayMs: context.delayMs,
      resumeRequest: null,
    })
    return { outcome: 'resumed', runId: resumedBy }
  })

  // After the transaction, as every question is (S-026): over the cap, the owner is asked; a resume
  // that could not be made is one line naming the run and why.
  if (stepped === undefined) return
  if ('unmade' in stepped) {
    appendResumeUnmade(context.questionsPath, runId, stepped.unmade)
    return
  }
  if (stepped.answered.outcome === 'cap') {
    appendResumeQuestion(context.questionsPath, stepped.answered.question)
  }
}
