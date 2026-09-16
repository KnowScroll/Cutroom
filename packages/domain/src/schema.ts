import {
  type AnySQLiteColumn,
  foreignKey,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core'

// The engine's tables (docs/features/reel-plan.md and docs/features/reel-stills.md, Gate 2
// "Storage"). SQLite through Drizzle (D-001); every time is an ISO 8601 UTC string, and every JSON
// value is stored as text.

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

/**
 * One row per model call that returned, written as it returns (D-005, D-084). `call` and
 * `picture_ids` arrived with reel-stills (S-037, S-049): an observation or a reconciliation is tied
 * to its receipt by picture id, not by a stored receipt id. Their defaults are what every row
 * written before them was — a `structured` call about no picture — and every writer names both.
 * `take_ids` arrived with reel-render's first slice, in S-055's form: a take's observation and
 * reconciliation are tied to their receipts by take id, and every row before it named no take
 * (S-072).
 */
export const modelReceipt = sqliteTable('model_receipt', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  runId: text('run_id')
    .notNull()
    .references(() => run.runId),
  role: text('role').notNull(),
  call: text('call', { enum: ['structured', 'observe', 'compare', 'judgeCut'] })
    .notNull()
    .default('structured'),
  /** A JSON array of picture ids. */
  pictureIds: text('picture_ids').notNull().default('[]'),
  /** A JSON array of take ids. */
  takeIds: text('take_ids').notNull().default('[]'),
  model: text('model').notNull(),
  temperature: real('temperature').notNull(),
  inputTokens: integer('input_tokens').notNull(),
  outputTokens: integer('output_tokens').notNull(),
  fake: integer('fake', { mode: 'boolean' }).notNull(),
  at: text('at').notNull(),
})

/**
 * One row per picture made, every attempt's (S-046). Written with its image receipt, in the same
 * transaction — its shot, subject, role, label, path, prompt, framing, references and `seq`, the
 * run's image-call number taken from the run's receipts there — and updated as each of its checks
 * completes. `chosen` and `degradation` are written when the run finishes.
 */
export const picture = sqliteTable(
  'picture',
  {
    runId: text('run_id')
      .notNull()
      .references(() => run.runId),
    pictureId: text('picture_id').notNull(),
    seq: integer('seq').notNull(),
    attempt: integer('attempt').notNull(),
    shotUnit: integer('shot_unit').notNull(),
    subjectId: text('subject_id').notNull(),
    role: text('role', { enum: ['canonical', 'derived'] }).notNull(),
    label: text('label').notNull(),
    path: text('path').notNull(),
    prompt: text('prompt').notNull(),
    framing: text('framing'),
    /** A JSON array of the picture ids it was made from (D-026, D-038). */
    referenceIds: text('reference_ids').notNull(),
    /** JSON: the technical step's measure, once taken. */
    measure: text('measure'),
    /** JSON: the words the text step read (S-041). */
    words: text('words'),
    /** JSON: the Gate 1 verdict — outcome or none, coverage, and each completed step (D-042). */
    gate1: text('gate1'),
    /** JSON: the keyframe score — terms, weights and total — for a scored candidate (D-031). */
    score: text('score'),
    /** JSON: the Gate 1S verdict — coverage, suspicion, answer and reasons (D-049). */
    gate1s: text('gate1s'),
    degradation: text('degradation'),
    chosen: integer('chosen', { mode: 'boolean' }).notNull().default(false),
  },
  (t) => [
    primaryKey({ columns: [t.runId, t.pictureId] }),
    uniqueIndex('picture_run_seq_unique').on(t.runId, t.seq),
  ],
)

/** What the witness said of a picture, once, for a picture whose witness step completed (I-15). */
export const observation = sqliteTable(
  'observation',
  {
    /** `obs-<pictureId>`. */
    id: text('id').notNull(),
    runId: text('run_id').notNull(),
    pictureId: text('picture_id').notNull(),
    observation: text('observation').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.runId, t.id] }),
    foreignKey({
      columns: [t.runId, t.pictureId],
      foreignColumns: [picture.runId, picture.pictureId],
    }),
  ],
)

/** What the reconciler answered for a picture, and what code made of it (S-040). */
export const reconciliation = sqliteTable(
  'reconciliation',
  {
    /** `rec-<pictureId>`. */
    id: text('id').notNull(),
    runId: text('run_id').notNull(),
    pictureId: text('picture_id').notNull(),
    answer: text('answer').notNull(),
    failed: text('failed').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.runId, t.id] }),
    foreignKey({
      columns: [t.runId, t.pictureId],
      foreignColumns: [picture.runId, picture.pictureId],
    }),
  ],
)

/** One row per image call that returned (D-028): what was asked, at what rate, and what it cost. */
export const generationReceipt = sqliteTable('generation_receipt', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  runId: text('run_id')
    .notNull()
    .references(() => run.runId),
  pictureId: text('picture_id').notNull(),
  model: text('model').notNull(),
  prompt: text('prompt').notNull(),
  /** A JSON array of the picture ids handed to the call as references. */
  referenceIds: text('reference_ids').notNull(),
  styleId: text('style_id').notNull(),
  styleVersion: integer('style_version').notNull(),
  /** The image rate the estimate used, applied to this call (D-028). */
  rateCents: real('rate_cents').notNull(),
  costCents: integer('cost_cents').notNull(),
  fake: integer('fake', { mode: 'boolean' }).notNull(),
  /** One of a degraded shot's four labels (I-4, D-025). */
  degraded: integer('degraded', { mode: 'boolean' }).notNull().default(false),
  at: text('at').notNull(),
})

/** A shot that goes on without an approved picture: its own table, so it is a query (I-4, D-025). */
export const degradation = sqliteTable(
  'degradation',
  {
    runId: text('run_id')
      .notNull()
      .references(() => run.runId),
    shotId: text('shot_id').notNull(),
    gate: text('gate', { enum: ['1', '1S'] }).notNull(),
    reason: text('reason').notNull(),
  },
  (t) => [primaryKey({ columns: [t.runId, t.shotId] })],
)
