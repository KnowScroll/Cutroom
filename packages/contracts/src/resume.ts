import type { Piece, RunResult, SubmitRequest } from '@cutroom/reel-contract'
import type { Plan } from './cinematic.ts'
import type { FailureKind } from './failures.ts'

// A resume's internal shapes (docs/features/resume-failed.md, Gate 2 "How a resume is planned,
// admitted and made"; S-157, S-161 to S-164). A resume is a new run of the same request that copies
// the failed run's kept rows into itself: `readResumeInputs` reads what the failed run holds,
// `planResume` decides what is kept and what it costs, `admitResume` compares that with the cap and
// the ceiling, and `resumeRun` makes the run. Types only.

/**
 * One piece a caller names not to keep: a shot's still, narration or clip, or — with no shot — that
 * piece of every shot that has one (S-161). The caller's own shape, declared once, by the contract's
 * route (`@cutroom/reel-contract`), and named here for every package that plans a resume.
 */
export type { Piece }

/** Who asks for a resume: the run's caller, or the engine itself after a provider's fault (S-163). */
export type ResumeBy = 'caller' | 'engine'

/** The rates a resume is priced at: the worker's own (S-124, S-155, S-161). */
export interface ResumeRates {
  imageRateCents: number
  videoRateCentsPerSecond: number
  narrationRateCentsPerCharacter: number
}

/** What a failed run holds, as a resume is planned from it (S-157, S-164). */
export interface ResumeInputs {
  runId: string
  request: SubmitRequest
  /** Its result as stored — or as the failing transaction is about to write it. Null while running. */
  result: RunResult | null
  /** Its kind as stored, or as about to be written; null for every ending but a failure (S-163). */
  failure: FailureKind | null
  cancelRequested: boolean
  /** The run it resumes, or null for a request's first run. */
  resumes: string | null
  /** The run that resumed it and that run's stored remake list — null for the engine's. */
  resumedBy: { runId: string; remake: string | null } | null
  /** Its selected plan, or null for a run that failed before one was selected. */
  plan: Plan | null
  /** Every plan row's role, in the order written. */
  plans: ReadonlyArray<Plan['role']>
  /**
   * Every picture whose Gate 1 decided, in the order made — of two of one shot and label (a run from
   * before S-164, restarted), the later attempt's only. A picture whose checks were cut off is not here.
   */
  pictures: ReadonlyArray<{
    pictureId: string
    shotUnit: number
    label: string
    attempt: number
    outcome: 'accept' | 'fail'
  }>
  /** Every narration FINISHED — measured and timed — in the order made (S-092, P-001). */
  narrations: ReadonlyArray<{ narrationId: string; shotUnit: number; durationSeconds: number }>
  /** Every take DECIDED, in the order made. A take whose gates were cut off is not here. */
  takes: ReadonlyArray<{ takeId: string; shotUnit: number; outcome: 'accept' | 'fail' }>
  /** What the reel has spent: the run's own and the run it resumes (S-162). */
  spentCents: number
}

/** What a resume keeps and makes, and what its own first calls cost (S-161, S-164). */
export interface ResumePlan {
  /** A run failed before its plan was selected plans again; every other starts at its pictures. */
  start: 'plan' | 'keyframes'
  /** What is copied into the new run, by id — every plan row, by role. */
  keep: {
    plans: Array<Plan['role']>
    pictures: string[]
    narrations: string[]
    takes: string[]
  }
  /** The caller's named pieces, normalised: the list stored with the run and compared (S-162). */
  named: Piece[]
  /** Every piece made again: the named, and what each takes down, normalised (S-161). */
  remade: Piece[]
  /** The first calls still to make, priced: no repair, no retry, no reserve (S-035, S-161). */
  estimateCents: number
}

/** `planResume`'s answer: a plan, or why no new run is made (S-161, S-162, S-163). */
export type ResumePlanned =
  | { outcome: 'planned'; plan: ResumePlan }
  /** The same list the run was resumed with: the run that resumed it, again (S-162). */
  | { outcome: 'replayed'; runId: string }
  /** Resumed already, with another list or by the engine: one resume in all (S-162). */
  | { outcome: 'resumed'; runId: string; detail: string }
  | { outcome: 'refused'; reason: 'not-resumable' | 'invalid'; detail: string }

/**
 * `admitResume`'s answer. `estimateCents` is the figure compared with the limits — what the reel
 * has spent plus the resume's estimate — as every estimate in the contract is (D-100, S-161).
 */
export type ResumeAdmission =
  | { admitted: true; estimateCents: number }
  | { admitted: false; limit: 'reel' | 'ceiling'; estimateCents: number }

/**
 * What a resume is admitted on (D-097, D-100): the figure compared — what the reel has spent plus the
 * resume's estimate — what the reel has spent, the per-reel cap and the caller's ceiling.
 */
export interface ResumeFigures {
  estimateCents: number
  spentCents: number
  capCents: number
  ceilingCents: number
}

/**
 * A caller's resume decided: `planResume`'s answer when no plan is made, else the plan with the
 * figures it was admitted on, or the limit it would pass (S-161, S-162). `budget`'s plan carries the
 * normalised named pieces the owner's question names, and what the preview lists.
 */
export type ResumeDecision =
  | Exclude<ResumePlanned, { outcome: 'planned' }>
  | ({ outcome: 'budget'; plan: ResumePlan; limit: 'reel' | 'ceiling' } & ResumeFigures)
  | ({ outcome: 'admitted'; plan: ResumePlan } & ResumeFigures)
