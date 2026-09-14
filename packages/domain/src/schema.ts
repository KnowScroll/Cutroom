import {
  type AnySQLiteColumn,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
} from 'drizzle-orm/sqlite-core'

// The engine's tables (docs/features/reel-plan.md, Gate 2 "Storage"). SQLite through Drizzle
// (D-001); every time is an ISO 8601 UTC string, and every JSON value is stored as text.

/** One run per requestId. The request is kept as received and as a canonical JSON value. */
export const run = sqliteTable('run', {
  runId: text('run_id').primaryKey(),
  requestId: text('request_id').notNull().unique(),
  /** The body exactly as it arrived. */
  request: text('request').notNull(),
  /** The parsed request with keys sorted at every depth, so content — not key order — compares. */
  requestCanonical: text('request_canonical').notNull(),
  state: text('state', { enum: ['running', 'finished'] }).notNull(),
  /** A `RunResult`, once finished. */
  result: text('result'),
  cancelRequested: integer('cancel_requested', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull(),
})

/** Append-only. Numbered from 1 per run, in the transaction that writes the event. */
export const runEvent = sqliteTable(
  'run_event',
  {
    runId: text('run_id')
      .notNull()
      .references(() => run.runId),
    seq: integer('seq').notNull(),
    at: text('at').notNull(),
    /** The whole `RunEvent`, as sent to a caller. */
    body: text('body').notNull(),
  },
  (t) => [primaryKey({ columns: [t.runId, t.seq] })],
)

/** The job queue is a table (D-002); a reel is a chain of rows sharing a correlation_id (D-081). */
export const job = sqliteTable('job', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  kind: text('kind').notNull(),
  payload: text('payload').notNull(),
  state: text('state', { enum: ['queued', 'running', 'done', 'dead'] }).notNull(),
  attempts: integer('attempts').notNull().default(0),
  runAt: text('run_at').notNull(),
  lockedAt: text('locked_at'),
  leaseUntil: text('lease_until'),
  error: text('error'),
  parentId: integer('parent_id').references((): AnySQLiteColumn => job.id),
  correlationId: text('correlation_id').notNull(),
  costCents: integer('cost_cents').notNull().default(0),
})

/** Both plans of a fork and the repair, each with what Gate 0 said (D-065, D-113). */
export const plan = sqliteTable(
  'plan',
  {
    runId: text('run_id')
      .notNull()
      .references(() => run.runId),
    role: text('role', { enum: ['a', 'b', 'repair'] }).notNull(),
    unitCount: integer('unit_count').notNull(),
    /** The fork's axis, required on every row (D-062, D-078). */
    axis: text('axis').notNull(),
    plan: text('plan').notNull(),
    verdict: text('verdict').notNull(),
    /** Only when both plans survived Gate 0 (D-113). */
    score: real('score'),
    estimateCents: integer('estimate_cents').notNull(),
    selected: integer('selected', { mode: 'boolean' }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.runId, t.role] })],
)

/** One row per model call that returned, written as it returns (D-005, D-084). */
export const modelReceipt = sqliteTable('model_receipt', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  runId: text('run_id')
    .notNull()
    .references(() => run.runId),
  role: text('role').notNull(),
  model: text('model').notNull(),
  temperature: real('temperature').notNull(),
  inputTokens: integer('input_tokens').notNull(),
  outputTokens: integer('output_tokens').notNull(),
  fake: integer('fake', { mode: 'boolean' }).notNull(),
  at: text('at').notNull(),
})
