import { randomUUID } from 'node:crypto'
import { and, asc, eq, gt, max, sql } from 'drizzle-orm'
import type { Gate0Verdict, ModelReceipt, Plan } from '@cutroom/contracts'
import {
  CONTRACT_VERSION,
  SubmitRequest,
  type RunEvent,
  type RunResult,
  type RunStatus,
} from '@cutroom/reel-contract'
import type { Db } from './db.ts'
import { markChosen, markDegraded, type DegradedShot } from './pictures.ts'
import { completeJob, enqueue, type Writer } from './queue.ts'
import { modelReceipt, plan, run, runEvent } from './schema.ts'

// Runs and their event record (docs/features/reel-plan.md, Gate 2 "How the contract's rules are
// kept"). Every write that numbers an event happens inside one immediate transaction, so the
// number and the row that carries it cannot be separated.

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never

/** An event as a writer describes it; the engine stamps the version, run, number and time. */
export type EventBody = DistributiveOmit<RunEvent, 'contractVersion' | 'runId' | 'seq' | 'at'>

export const PLAN_JOB = 'reel.plan'
/** The chain's second job: the pictures of an admitted `stills` or `video` run (D-081, D-083, D-108). */
export const KEYFRAMES_JOB = 'reel.keyframes'
/** The chain's third job: the clips of a `video` run whose stills stage completed (S-069). */
export const CLIPS_JOB = 'reel.clips'
/** The chain's fourth and last job: assembling a `video` run whose clips stage completed (S-069). */
export const ASSEMBLE_JOB = 'reel.assemble'

/** The stages a run has events for: `plan`, `stills` and `video`, the contract's. */
export type Stage = Extract<RunEvent, { stage: string }>['stage']

/** JSON with keys sorted at every depth, so two requests that differ only in key order are equal. */
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`
  if (value !== null && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    const keys = Object.keys(obj)
      .filter((k) => obj[k] !== undefined)
      .sort()
    return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`).join(',')}}`
  }
  return JSON.stringify(value)
}

function append(tx: Writer, runId: string, body: EventBody, now: Date): RunEvent {
  const last = tx
    .select({ seq: max(runEvent.seq) })
    .from(runEvent)
    .where(eq(runEvent.runId, runId))
    .get()
  const seq = (last?.seq ?? 0) + 1
  const at = now.toISOString()
  const event = { contractVersion: CONTRACT_VERSION, runId, seq, at, ...body } as RunEvent
  tx.insert(runEvent)
    .values({ runId, seq, at, body: JSON.stringify(event) })
    .run()
  return event
}

export type Submitted =
  | { outcome: 'accepted'; runId: string }
  | { outcome: 'replayed'; runId: string }
  | { outcome: 'conflict'; runId: string }

/**
 * Stores a valid request as a run with one `reel.plan` job (D-081, D-083) and its `run.accepted`
 * event — or, for a requestId already used, compares content: equal is the stored run, replayed;
 * different is a conflict. Validity is the caller's to check first.
 */
export function submitRun(
  db: Db,
  request: SubmitRequest,
  received: string,
  now: Date = new Date(),
): Submitted {
  const canonical = canonicalJson(request)
  return db.transaction(
    (tx): Submitted => {
      const existing = tx
        .select({ runId: run.runId, requestCanonical: run.requestCanonical })
        .from(run)
        .where(eq(run.requestId, request.requestId))
        .get()
      if (existing !== undefined) {
        const outcome = existing.requestCanonical === canonical ? 'replayed' : 'conflict'
        return { outcome, runId: existing.runId }
      }

      const runId = randomUUID()
      tx.insert(run)
        .values({
          runId,
          requestId: request.requestId,
          request: received,
          requestCanonical: canonical,
          state: 'running',
          createdAt: now.toISOString(),
        })
        .run()
      enqueue(tx, { kind: PLAN_JOB, correlationId: runId, payload: { runId } }, now)
      append(tx, runId, { type: 'run.accepted' }, now)
      return { outcome: 'accepted', runId }
    },
    { behavior: 'immediate' },
  )
}

function statusOf(db: Db, row: { runId: string; requestId: string; state: string }): RunStatus {
  const last = db
    .select({ seq: max(runEvent.seq) })
    .from(runEvent)
    .where(eq(runEvent.runId, row.runId))
    .get()
  return {
    contractVersion: CONTRACT_VERSION,
    runId: row.runId,
    requestId: row.requestId,
    state: row.state === 'finished' ? 'finished' : 'running',
    lastSeq: last?.seq ?? 0,
  }
}

export interface StoredRun {
  status: RunStatus
  /** Present once the run has finished. */
  result: RunResult | undefined
}

export function readRun(db: Db, runId: string): StoredRun | undefined {
  const row = db.select().from(run).where(eq(run.runId, runId)).get()
  if (row === undefined) return undefined
  return {
    status: statusOf(db, row),
    result: row.result === null ? undefined : (JSON.parse(row.result) as RunResult),
  }
}

export function readRunByRequestId(db: Db, requestId: string): StoredRun | undefined {
  const row = db.select({ runId: run.runId }).from(run).where(eq(run.requestId, requestId)).get()
  return row === undefined ? undefined : readRun(db, row.runId)
}

/** The request a run was submitted with, parsed under the contract it was accepted by. */
export function readRequest(db: Db, runId: string): SubmitRequest {
  const row = db.select({ request: run.request }).from(run).where(eq(run.runId, runId)).get()
  if (row === undefined) throw new Error(`no run '${runId}'`)
  return SubmitRequest.parse(JSON.parse(row.request))
}

/**
 * One model call that returned, written as it returns (D-005, D-084) — outside the transaction
 * that finishes the run, so it survives a later thrown call, a failed run and an interrupted job.
 */
export function recordReceipt(
  db: Db,
  runId: string,
  receipt: ModelReceipt,
  now: Date = new Date(),
): void {
  db.insert(modelReceipt)
    .values({
      runId,
      role: receipt.role,
      call: receipt.call,
      pictureIds: JSON.stringify(receipt.pictureIds),
      takeIds: JSON.stringify(receipt.takeIds),
      model: receipt.model,
      temperature: receipt.temperature,
      inputTokens: receipt.usage.inputTokens,
      outputTokens: receipt.usage.outputTokens,
      fake: receipt.fake,
      at: now.toISOString(),
    })
    .run()
}

/** A plan as its row stores it: the plan, what Gate 0 said, its score if any, and the fork's axis. */
export interface PlanRow {
  role: Plan['role']
  /** The axis of the fork the plan belongs to, read from the fork (D-078). */
  axis: string
  plan: Plan
  verdict: Gate0Verdict
  score: number | null
  selected: boolean
}

/** The events numbered after `since`, in order. */
export function eventsAfter(db: Db, runId: string, since: number): RunEvent[] {
  return db
    .select({ body: runEvent.body })
    .from(runEvent)
    .where(and(eq(runEvent.runId, runId), gt(runEvent.seq, since)))
    .orderBy(asc(runEvent.seq))
    .all()
    .map((row) => JSON.parse(row.body) as RunEvent)
}

/** The plan rows a stage produced, written inside whichever transaction ends that stage. */
function writePlans(tx: Writer, runId: string, plans: readonly PlanRow[]): void {
  for (const row of plans) {
    tx.insert(plan)
      .values({
        runId,
        role: row.role,
        unitCount: row.plan.units.length,
        axis: row.axis,
        plan: JSON.stringify(row.plan),
        verdict: JSON.stringify(row.verdict),
        score: row.score,
        estimateCents: row.plan.estimateCents,
        selected: row.selected,
      })
      .run()
  }
}

/**
 * A `stills` run whose pictures fit the caller's ceiling (S-030, S-035), in one transaction: the
 * plan rows, the events the plan stage ended with, the plan job marked done at cost 0, and the
 * chain's next row — one `reel.keyframes` job whose `correlation_id` is the run and whose
 * `parent_id` is the plan job (D-081, D-083). Returns that row's id.
 *
 * The run is deliberately NOT finished: it has no result until the pictures are answered for, and
 * a worker that died between this transaction and the next claim leaves a queued job, not a
 * half-finished run.
 */
export function admitStills(
  db: Db,
  admit: {
    runId: string
    jobId: number
    plans?: readonly PlanRow[]
    events?: readonly EventBody[]
  },
  now: Date = new Date(),
): number {
  const { runId, jobId } = admit
  return db.transaction(
    (tx) => {
      writePlans(tx, runId, admit.plans ?? [])
      for (const event of admit.events ?? []) append(tx, runId, event, now)
      completeJob(tx, jobId, 0)
      return enqueue(
        tx,
        { kind: KEYFRAMES_JOB, correlationId: runId, payload: { runId }, parentId: jobId },
        now,
      )
    },
    { behavior: 'immediate' },
  )
}

/** A run's ending, written inside whichever transaction ends it: `run.finished`, its state and result. */
function endRun(tx: Writer, runId: string, result: RunResult, now: Date): void {
  append(tx, runId, { type: 'run.finished', status: result.status }, now)
  tx.update(run)
    .set({ state: 'finished', result: JSON.stringify(result) })
    .where(eq(run.runId, runId))
    .run()
}

/**
 * Finishes a run in one transaction: its plans, the events before the end, its `run.finished`
 * event, its result, and its job marked done — so a job interrupted before this leaves no
 * half-finished run behind.
 */
export function finishRun(
  db: Db,
  finish: {
    runId: string
    jobId: number
    result: RunResult
    plans?: readonly PlanRow[]
    events?: readonly EventBody[]
  },
  now: Date = new Date(),
): void {
  const { runId, jobId, result } = finish
  db.transaction(
    (tx) => {
      writePlans(tx, runId, finish.plans ?? [])
      for (const event of finish.events ?? []) append(tx, runId, event, now)
      endRun(tx, runId, result, now)
      completeJob(tx, jobId, result.costCents)
    },
    { behavior: 'immediate' },
  )
}

/** The plan an admitted run was admitted on: its selected plan row's plan. */
export function readSelectedPlan(db: Db, runId: string): Plan {
  const row = db
    .select({ plan: plan.plan })
    .from(plan)
    .where(and(eq(plan.runId, runId), eq(plan.selected, true)))
    .get()
  if (row === undefined) throw new Error(`run '${runId}' has no selected plan`)
  return JSON.parse(row.plan) as Plan
}

/** What a stills stage leaves, however the run goes on from it (S-046, S-055, S-058). */
interface StillsEnding {
  chosen?: readonly string[]
  degraded?: readonly DegradedShot[]
  events?: readonly EventBody[]
}

/**
 * The stills stage's ending, written inside whichever transaction ends the stage: the approved
 * pictures marked chosen, every degraded shot's four labels (S-058), and the events the stage's checks
 * produced. One writer for a stage that ends the run and one that advances it, so the two cannot come
 * to label a shot differently (S-081).
 */
function endStills(tx: Writer, runId: string, ending: StillsEnding, now: Date): void {
  markChosen(tx, runId, ending.chosen ?? [])
  for (const shot of ending.degraded ?? []) markDegraded(tx, runId, shot)
  for (const event of ending.events ?? []) append(tx, runId, event, now)
}

/**
 * Ends a run at its stills stage, in one immediate transaction (S-046): the approved pictures marked
 * chosen, every degraded shot's labels (S-058), the events the stage's checks produced, `run.finished`,
 * the result, and the keyframes job done — its cost left as its image calls added it (S-036), never
 * overwritten with the result's.
 */
export function finishStills(
  db: Db,
  finish: StillsEnding & { runId: string; jobId: number; result: RunResult },
  now: Date = new Date(),
): void {
  const { runId, jobId, result } = finish
  db.transaction(
    (tx) => {
      endStills(tx, runId, finish, now)
      endRun(tx, runId, result, now)
      completeJob(tx, jobId)
    },
    { behavior: 'immediate' },
  )
}

/**
 * A `video` run whose stills stage completed, in one immediate transaction (S-069): everything
 * `finishStills` writes of the stage — the chosen flags, the degradations' labels, the events and
 * `stage.finished` for stills — and the keyframes job done with its cost kept (S-055), and the chain's
 * next row: one `reel.clips` job whose `correlation_id` is the run and whose `parent_id` is the
 * keyframes job (D-081, D-083). Returns that row's id.
 *
 * The run is NOT finished, as `admitStills` leaves it (S-052): it has no result until the clips are
 * answered for, and a worker that died between this transaction and the next claim leaves a queued
 * job, not a half-finished run.
 */
export function advanceStills(
  db: Db,
  a: {
    runId: string
    jobId: number
    chosen: readonly string[]
    degraded: readonly DegradedShot[]
    events: readonly EventBody[]
  },
  now: Date = new Date(),
): number {
  const { runId, jobId } = a
  return db.transaction(
    (tx) => {
      endStills(tx, runId, a, now)
      completeJob(tx, jobId)
      return enqueue(
        tx,
        { kind: CLIPS_JOB, correlationId: runId, payload: { runId }, parentId: jobId },
        now,
      )
    },
    { behavior: 'immediate' },
  )
}

/**
 * A `video` run whose clips stage completed, in one immediate transaction (S-069): the events its
 * gates produced, the clips job done with its cost kept — what its narration and clip calls added
 * (S-036) — and the chain's last row: one `reel.assemble` job whose `correlation_id` is the run and
 * whose `parent_id` is the clips job (D-081, D-083). Returns that row's id.
 *
 * The run is NOT finished, and the video stage has no `stage.finished`: the stage produced its output
 * only once its assembly does (S-025's reading, S-069).
 */
export function advanceClips(
  db: Db,
  a: { runId: string; jobId: number; events: readonly EventBody[] },
  now: Date = new Date(),
): number {
  const { runId, jobId } = a
  return db.transaction(
    (tx) => {
      for (const event of a.events) append(tx, runId, event, now)
      completeJob(tx, jobId)
      return enqueue(
        tx,
        { kind: ASSEMBLE_JOB, correlationId: runId, payload: { runId }, parentId: jobId },
        now,
      )
    },
    { behavior: 'immediate' },
  )
}

/**
 * Ends a `video` run at one of its video stage's jobs, in one immediate transaction: the events
 * before the end, `run.finished`, the result, and the job done — its cost left as its calls added it
 * (S-036), never overwritten with the result's, which is the whole chain's spend (D-081). Slice 4
 * adds a render's holds and measures.
 */
export function finishVideo(
  db: Db,
  f: { runId: string; jobId: number; result: RunResult; events?: readonly EventBody[] },
  now: Date = new Date(),
): void {
  const { runId, jobId, result } = f
  db.transaction(
    (tx) => {
      for (const event of f.events ?? []) append(tx, runId, event, now)
      endRun(tx, runId, result, now)
      completeJob(tx, jobId)
    },
    { behavior: 'immediate' },
  )
}

/**
 * What a job does before its stage, in one immediate transaction, so a cancel cannot land between
 * the read and the start (docs/features/reel-plan.md, Gate 2 "Cancel" and "A restart";
 * docs/features/reel-stills.md, Gate 2 "Cancel"; S-027). A run whose cancel flag is set answers
 * `cancelled` and nothing is written — also when an interrupted job is run again. Otherwise
 * `stage.started` is appended, unless an earlier attempt at the job already wrote it: a job run
 * again from the start does not write it twice.
 *
 * One function over every stage, not one per stage: the transaction and the once-only rule are the
 * same for `plan`, `stills` and `video`, and a second copy is a second place for the rule to drift
 * (S-051, S-069).
 */
export function startStage(
  db: Db,
  runId: string,
  stage: Stage,
  now: Date = new Date(),
): 'cancelled' | 'started' {
  return db.transaction(
    (tx) => {
      const row = tx
        .select({ cancelRequested: run.cancelRequested })
        .from(run)
        .where(eq(run.runId, runId))
        .get()
      if (row === undefined) throw new Error(`no run '${runId}'`)
      if (row.cancelRequested) return 'cancelled'
      const started = tx
        .select({ seq: runEvent.seq })
        .from(runEvent)
        .where(
          and(
            eq(runEvent.runId, runId),
            sql`json_extract(${runEvent.body}, '$.type') = 'stage.started'`,
            sql`json_extract(${runEvent.body}, '$.stage') = ${stage}`,
          ),
        )
        .get()
      if (started === undefined) append(tx, runId, { type: 'stage.started', stage }, now)
      return 'started'
    },
    { behavior: 'immediate' },
  )
}

/** Sets the cancel flag on a running run. A finished run is left as it is. */
export function requestCancel(db: Db, runId: string): StoredRun | undefined {
  db.update(run)
    .set({ cancelRequested: true })
    .where(and(eq(run.runId, runId), eq(run.state, 'running')))
    .run()
  return readRun(db, runId)
}
