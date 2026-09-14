import { randomUUID } from 'node:crypto'
import { and, asc, eq, gt, max } from 'drizzle-orm'
import {
  CONTRACT_VERSION,
  type RunEvent,
  type RunResult,
  type RunStatus,
  type SubmitRequest,
} from '@cutroom/reel-contract'
import type { Db } from './db.ts'
import { completeJob, enqueue, type Writer } from './queue.ts'
import { run, runEvent } from './schema.ts'

// Runs and their event record (docs/features/reel-plan.md, Gate 2 "How the contract's rules are
// kept"). Every write that numbers an event happens inside one immediate transaction, so the
// number and the row that carries it cannot be separated.

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never

/** An event as a writer describes it; the engine stamps the version, run, number and time. */
export type EventBody = DistributiveOmit<RunEvent, 'contractVersion' | 'runId' | 'seq' | 'at'>

export const PLAN_JOB = 'reel.plan'

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

export function appendEvent(db: Db, runId: string, body: EventBody, now: Date = new Date()) {
  return db.transaction((tx) => append(tx, runId, body, now), { behavior: 'immediate' })
}

/**
 * Finishes a run in one transaction: its `run.finished` event, its result, and its job marked
 * done — so a job interrupted before this leaves no half-finished run behind.
 */
export function finishRun(
  db: Db,
  finish: { runId: string; jobId: number; result: RunResult },
  now: Date = new Date(),
): void {
  const { runId, jobId, result } = finish
  db.transaction(
    (tx) => {
      append(tx, runId, { type: 'run.finished', status: result.status }, now)
      tx.update(run)
        .set({ state: 'finished', result: JSON.stringify(result) })
        .where(eq(run.runId, runId))
        .run()
      completeJob(tx, jobId, result.costCents)
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
