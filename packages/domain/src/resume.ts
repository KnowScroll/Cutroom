import { randomUUID } from 'node:crypto'
import { and, asc, eq, inArray, isNotNull, sql } from 'drizzle-orm'
import type {
  Gate0Verdict,
  Piece,
  Plan,
  ResumeBy,
  ResumeDecision,
  ResumeInputs,
  ResumePlan,
  ResumeRates,
} from '@cutroom/contracts'
import { SubmitRequest, type RunResult } from '@cutroom/reel-contract'
import type { Db } from './db.ts'
import { reelSpentCents } from './ledger.ts'
import { enqueue, type Writer } from './queue.ts'
import {
  KEYFRAMES_JOB,
  PLAN_JOB,
  append,
  canonicalJson,
  greatestAttempts,
  type RunEnding,
} from './runs.ts'
import {
  narration,
  observation,
  picture,
  plan,
  reconciliation,
  run,
  take,
  takeObservation,
  takeReconciliation,
} from './schema.ts'

// A failed run resumed (docs/features/resume-failed.md, Gate 2 "How a resume is planned, admitted and
// made"; S-157, S-161 to S-164). A RESUME IS A NEW RUN OF THE SAME REQUEST THAT COPIES THE FAILED RUN'S
// KEPT ROWS INTO ITSELF, in the one transaction that creates it — so every stage, every reader and
// every label goes on reading one run's rows, and finds a kept piece exactly where it already finds an
// earlier attempt's. Receipts are never copied: every cent stays with the run that spent it (D-084).
// Files are never copied: a copied row keeps its stored path, and every reader reads that path.
//
// This file reads and writes; what to keep, and whether the resume is admitted, is the pipeline's
// `planResume` and `admitResume`, which this package never imports.

/**
 * What a resume refused at the per-reel cap asks the owner (D-097, D-100, S-026's form): the failed
 * run and its request, who asked, the pieces named — normalised; none for the engine's — the resume's
 * own estimate, what the reel has spent, the figure compared (the two added), both limits, and the
 * rates the resume was priced at.
 */
export interface ResumeQuestion {
  runId: string
  requestId: string
  by: ResumeBy
  named: Piece[]
  /** The resume's own first calls, priced: no repair, no retry, no reserve (S-035, S-161). */
  resumeEstimateCents: number
  spentCents: number
  /** The figure compared with the cap: what the reel has spent plus the resume's estimate. */
  estimateCents: number
  capCents: number
  ceilingCents: number
  rates: ResumeRates
}

/**
 * What the API is handed to plan, admit and ask about a caller's resume (docs/features/resume-failed.md,
 * Gate 2 "How a resume is planned, admitted and made"; S-161, S-162). Built by `apps/service` from the
 * pipeline's planner and the worker's own settings and questions file, so a caller's preview, a
 * caller's call and the engine's own resume are one planner and one rule — and the API, which imports
 * neither the pipeline nor the worker, holds neither a rate nor a path.
 */
export interface ResumeService {
  /** Plans a caller's resume of the run `inputs` holds and admits it against `capCents`. Pure. */
  decide(inputs: ResumeInputs, remake: readonly Piece[], capCents: number): ResumeDecision
  /**
   * Appends the cap's question for a resume CALL refused at the per-reel cap, the rates added by the
   * service, which prices with them. A preview, and a refusal at the ceiling, never ask (D-097, D-100).
   */
  askOwner(question: Omit<ResumeQuestion, 'rates'>, now: Date): void
}

const parsed = <T>(text: string | null): T | null =>
  text === null ? null : (JSON.parse(text) as T)

/**
 * What a run holds, as a resume is planned from it (S-157, S-164): its request, its ending and kind,
 * its cancel flag, the run it resumes and the run that resumed it with that run's stored list, its
 * selected plan and every plan row, every picture whose Gate 1 decided — of two of one shot and label
 * (a run from before S-164, restarted) the later attempt's — every narration finished, measured and
 * timed, every take decided, and what the reel has spent.
 *
 * `reader` is a connection or a transaction: the engine's own resume reads INSIDE the transaction
 * that fails the run, and hands in the ending that transaction is about to write, after the stage's
 * labels (S-163); a caller's reads the run as it stands.
 */
export function readResumeInputs(
  reader: Pick<Db, 'select'>,
  runId: string,
  ending?: RunEnding,
): ResumeInputs {
  const row = reader.select().from(run).where(eq(run.runId, runId)).get()
  if (row === undefined) throw new Error(`no run '${runId}'`)
  const resumedBy = reader
    .select({ runId: run.runId, remake: run.resumeRequest })
    .from(run)
    .where(eq(run.resumes, runId))
    .get()
  const plans = reader
    .select({ role: plan.role, plan: plan.plan, selected: plan.selected })
    .from(plan)
    .where(eq(plan.runId, runId))
    .orderBy(sql`rowid`)
    .all()
  const selected = plans.find((p) => p.selected)

  // Every decided picture, in the order made; of two of one shot and label, the later attempt's.
  const decided = reader
    .select({
      pictureId: picture.pictureId,
      shotUnit: picture.shotUnit,
      label: picture.label,
      attempt: picture.attempt,
      gate1: picture.gate1,
    })
    .from(picture)
    .where(eq(picture.runId, runId))
    .orderBy(asc(picture.seq))
    .all()
    .flatMap((p) => {
      const outcome = parsed<{ outcome: 'accept' | 'fail' | null }>(p.gate1)?.outcome ?? null
      if (outcome === null) return []
      const { pictureId, shotUnit, label, attempt } = p
      return [{ pictureId, shotUnit, label, attempt, outcome }]
    })
  const latest = new Map<string, number>()
  for (const p of decided) {
    const key = `${p.shotUnit}:${p.label}`
    latest.set(key, Math.max(latest.get(key) ?? 0, p.attempt))
  }
  const pictures = decided.filter((p) => latest.get(`${p.shotUnit}:${p.label}`) === p.attempt)

  const narrations = reader
    .select({
      narrationId: narration.narrationId,
      shotUnit: narration.shotUnit,
      probe: narration.probe,
    })
    .from(narration)
    .where(and(eq(narration.runId, runId), isNotNull(narration.words), isNotNull(narration.probe)))
    .orderBy(sql`rowid`)
    .all()
    .map((n) => ({
      narrationId: n.narrationId,
      shotUnit: n.shotUnit,
      durationSeconds: parsed<{ durationSeconds: number }>(n.probe)?.durationSeconds ?? 0,
    }))
  const takes = reader
    .select({ takeId: take.takeId, shotUnit: take.shotUnit, outcome: take.outcome })
    .from(take)
    .where(and(eq(take.runId, runId), isNotNull(take.outcome)))
    .orderBy(sql`rowid`)
    .all()
    .flatMap((t) => (t.outcome === null ? [] : [{ ...t, outcome: t.outcome }]))

  return {
    runId,
    request: SubmitRequest.parse(JSON.parse(row.request)),
    result: ending?.result ?? parsed<RunResult>(row.result),
    failure: ending === undefined ? row.failure : (ending.failure ?? null),
    cancelRequested: row.cancelRequested,
    resumes: row.resumes,
    resumedBy: resumedBy === undefined ? null : resumedBy,
    plan: selected === undefined ? null : (JSON.parse(selected.plan) as Plan),
    plans: plans.map((p) => p.role),
    pictures,
    narrations,
    takes,
    spentCents: reelSpentCents(reader, runId),
  }
}

/**
 * Makes the resume `planned` describes, inside the caller's immediate transaction, and answers the new
 * run's id (S-157, S-162, S-164). `now` is the time the caller stamps everything else it writes.
 *
 * The run the plan was made from is read again first: one that was resumed already, or that itself
 * resumes another, THROWS, and the caller's transaction leaves nothing — one resume in all. Then:
 *
 * - a run of the same request id and request, resuming it, running, with the caller's normalised list
 *   stored as canonical JSON, or null for the engine's (`resumeRequest`);
 * - its kept rows copied, `kept_from` naming the run: every plan row; each picture with its
 *   observation and reconciliation, `chosen` false and its degradation AS IT IS (S-164's carried
 *   decision); each narration; each take with its observation and reconciliation, its degradation
 *   reset — a hold's or a still-hold's is the ending's to write again. Ids, attempts, paths, verdicts
 *   and measures unchanged. No receipt, lost call, refused answer, degradation, still-hold, render or
 *   hold is copied (D-084);
 * - `run.accepted`, and — with plan rows — the plan stage's events as its plan job wrote them;
 * - one job, with no parent: `reel.plan` for a run with no plan, else `reel.keyframes`, due `delayMs`
 *   after `now`, its attempts starting at the failed run's greatest for that kind (S-162).
 */
export function resumeRun(
  tx: Writer,
  origin: string,
  planned: ResumePlan,
  options: { now: Date; delayMs: number; resumeRequest: readonly Piece[] | null },
): string {
  const { now } = options
  const row = tx.select().from(run).where(eq(run.runId, origin)).get()
  if (row === undefined) throw new Error(`no run '${origin}'`)
  if (row.resumes !== null) {
    throw new Error(
      `run '${origin}' resumes run '${row.resumes}', and a resume is never resumed: one in all (S-162)`,
    )
  }
  const already = tx.select({ runId: run.runId }).from(run).where(eq(run.resumes, origin)).get()
  if (already !== undefined) {
    throw new Error(
      `run '${origin}' was resumed already, by run '${already.runId}': one in all (S-162)`,
    )
  }

  const runId = randomUUID()
  tx.insert(run)
    .values({
      runId,
      requestId: row.requestId,
      request: row.request,
      requestCanonical: row.requestCanonical,
      state: 'running',
      createdAt: now.toISOString(),
      resumes: origin,
      resumeRequest: options.resumeRequest === null ? null : canonicalJson(options.resumeRequest),
    })
    .run()

  const { keep } = planned
  const plans =
    keep.plans.length === 0
      ? []
      : tx
          .select()
          .from(plan)
          .where(and(eq(plan.runId, origin), inArray(plan.role, keep.plans)))
          .orderBy(sql`rowid`)
          .all()
  for (const p of plans)
    tx.insert(plan)
      .values({ ...p, runId })
      .run()

  if (keep.pictures.length > 0) {
    const kept = and(eq(picture.runId, origin), inArray(picture.pictureId, keep.pictures))
    // Every copy in the order its origin row was written, so a copy reads back as the row did.
    for (const p of tx
      .select()
      .from(picture)
      .where(kept)
      .orderBy(sql`rowid`)
      .all()) {
      tx.insert(picture)
        .values({ ...p, runId, chosen: false, keptFrom: origin })
        .run()
    }
    const ofKept = <T extends typeof observation | typeof reconciliation>(table: T) =>
      and(eq(table.runId, origin), inArray(table.pictureId, keep.pictures))
    for (const o of tx
      .select()
      .from(observation)
      .where(ofKept(observation))
      .orderBy(sql`rowid`)
      .all()) {
      tx.insert(observation)
        .values({ ...o, runId })
        .run()
    }
    for (const r of tx
      .select()
      .from(reconciliation)
      .where(ofKept(reconciliation))
      .orderBy(sql`rowid`)
      .all()) {
      tx.insert(reconciliation)
        .values({ ...r, runId })
        .run()
    }
  }
  if (keep.narrations.length > 0) {
    const kept = and(eq(narration.runId, origin), inArray(narration.narrationId, keep.narrations))
    for (const n of tx
      .select()
      .from(narration)
      .where(kept)
      .orderBy(sql`rowid`)
      .all()) {
      tx.insert(narration)
        .values({ ...n, runId, keptFrom: origin })
        .run()
    }
  }
  if (keep.takes.length > 0) {
    // In the order made, which is the order every reader of takes reads them in (S-092, S-093).
    const kept = and(eq(take.runId, origin), inArray(take.takeId, keep.takes))
    for (const t of tx
      .select()
      .from(take)
      .where(kept)
      .orderBy(sql`rowid`)
      .all()) {
      tx.insert(take)
        .values({ ...t, runId, degradation: null, keptFrom: origin })
        .run()
    }
    const ofKept = <T extends typeof takeObservation | typeof takeReconciliation>(table: T) =>
      and(eq(table.runId, origin), inArray(table.takeId, keep.takes))
    for (const o of tx
      .select()
      .from(takeObservation)
      .where(ofKept(takeObservation))
      .orderBy(sql`rowid`)
      .all()) {
      tx.insert(takeObservation)
        .values({ ...o, runId })
        .run()
    }
    for (const r of tx
      .select()
      .from(takeReconciliation)
      .where(ofKept(takeReconciliation))
      .orderBy(sql`rowid`)
      .all()) {
      tx.insert(takeReconciliation)
        .values({ ...r, runId })
        .run()
    }
  }

  append(tx, runId, { type: 'run.accepted' }, now)
  if (plans.length > 0) {
    append(tx, runId, { type: 'stage.started', stage: 'plan' }, now)
    for (const p of plans) {
      const verdict = JSON.parse(p.verdict) as Gate0Verdict
      append(tx, runId, { type: 'verdict', gate: '0', outcome: verdict.outcome }, now)
    }
    append(tx, runId, { type: 'stage.finished', stage: 'plan' }, now)
  }

  const kind = planned.start === 'plan' ? PLAN_JOB : KEYFRAMES_JOB
  enqueue(
    tx,
    {
      kind,
      correlationId: runId,
      payload: { runId },
      attempts: greatestAttempts(tx, origin, kind),
    },
    new Date(now.getTime() + options.delayMs),
  )
  return runId
}
