import { and, asc, eq, inArray, lte, or, sql } from 'drizzle-orm'
import type { Db } from './db.ts'
import { job } from './schema.ts'

// The job queue is a table (D-002). A job is claimed with one UPDATE … RETURNING, so two workers
// can never claim the same row. A claimed job whose lease has run out — its worker died with it in
// hand — is claimed again and run from the start (S-027).

/** A write inside a transaction or outside one. */
export type Writer = Pick<Db, 'select' | 'insert' | 'update'>

export interface ClaimedJob {
  id: number
  kind: string
  correlationId: string
  payload: unknown
  attempts: number
}

/** How long a claimed job is held before another claim may take it (D-002's lease). */
export const DEFAULT_LEASE_MS = 60_000

export function enqueue(
  tx: Writer,
  entry: { kind: string; correlationId: string; payload: unknown; parentId?: number },
  now: Date,
): number {
  const row = tx
    .insert(job)
    .values({
      kind: entry.kind,
      correlationId: entry.correlationId,
      payload: JSON.stringify(entry.payload),
      parentId: entry.parentId ?? null,
      state: 'queued',
      runAt: now.toISOString(),
    })
    .returning({ id: job.id })
    .get()
  return row.id
}

/**
 * Claims the oldest job of one of `kinds` that is queued and due, or running with its lease run
 * out, or returns undefined. The claim holds the job for `leaseMs`.
 */
export function claimJob(
  db: Db,
  kinds: readonly string[],
  now: Date = new Date(),
  leaseMs: number = DEFAULT_LEASE_MS,
): ClaimedJob | undefined {
  const at = now.toISOString()
  const next = db
    .select({ id: job.id })
    .from(job)
    .where(
      and(
        inArray(job.kind, [...kinds]),
        or(
          and(eq(job.state, 'queued'), lte(job.runAt, at)),
          and(eq(job.state, 'running'), lte(job.leaseUntil, at)),
        ),
      ),
    )
    .orderBy(asc(job.id))
    .limit(1)
  const row = db
    .update(job)
    .set({
      state: 'running',
      attempts: sql`${job.attempts} + 1`,
      lockedAt: at,
      leaseUntil: new Date(now.getTime() + leaseMs).toISOString(),
    })
    .where(inArray(job.id, next))
    .returning()
    .get()
  if (row === undefined) return undefined
  return {
    id: row.id,
    kind: row.kind,
    correlationId: row.correlationId,
    payload: JSON.parse(row.payload) as unknown,
    attempts: row.attempts,
  }
}

/**
 * Marks a job done. With `costCents`, that is its cost; without, the cost its image calls added as
 * they returned is kept (S-036).
 */
export function completeJob(tx: Writer, jobId: number, costCents?: number): void {
  tx.update(job)
    .set({ state: 'done', leaseUntil: null, ...(costCents === undefined ? {} : { costCents }) })
    .where(eq(job.id, jobId))
    .run()
}

/** A job whose runner threw outside the run's own answer: kept, with why, and never claimed again. */
export function buryJob(db: Db, jobId: number, error: string): void {
  db.update(job).set({ state: 'dead', error, leaseUntil: null }).where(eq(job.id, jobId)).run()
}
