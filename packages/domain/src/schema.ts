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
 *
 * `readText` arrived with paid-path's Slice 7 (S-126): Gate 1's text step is a vision call, so it
 * is a call on the one model port and writes a row like every other (D-084). It needed no
 * migration — the column is text, and the enum is the type this repository reads it through.
 */
export const modelReceipt = sqliteTable('model_receipt', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  runId: text('run_id')
    .notNull()
    .references(() => run.runId),
  role: text('role').notNull(),
  call: text('call', { enum: ['structured', 'observe', 'compare', 'judgeCut', 'readText'] })
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

// ---------------------------------------------------------------- reel-render
//
// docs/features/reel-render.md, Gate 2 "Storage". Every narration and take made — every attempt's —
// is a row, written with its receipt and updated as each measure and gate completes (S-070, S-071,
// S-072). The render and hold tables arrived in the same migration (Slice 3); the assemble job writes
// them (Slice 4): a render row before the assembler is called, and its holds with the job's ending.

/** One row per narration made, written with its speech receipt (S-070). */
export const narration = sqliteTable(
  'narration',
  {
    runId: text('run_id')
      .notNull()
      .references(() => run.runId),
    /** `a<attempt>-shot-<unit>-narration`. */
    narrationId: text('narration_id').notNull(),
    attempt: integer('attempt').notNull(),
    shotUnit: integer('shot_unit').notNull(),
    /** The unit's sentences, in order, joined by one space. */
    text: text('text').notNull(),
    path: text('path').notNull(),
    /** JSON: the word timings, once parsed. */
    words: text('words'),
    /** JSON: the file's measure, once taken (I-17). */
    probe: text('probe'),
  },
  (t) => [primaryKey({ columns: [t.runId, t.narrationId] })],
)

/** One row per narration call that returned: what was spoken, at what rate, and what it cost. */
export const speechReceipt = sqliteTable('speech_receipt', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  runId: text('run_id')
    .notNull()
    .references(() => run.runId),
  narrationId: text('narration_id').notNull(),
  model: text('model').notNull(),
  characters: integer('characters').notNull(),
  /** The narration rate, per character, applied to this call (S-070). */
  rateCents: real('rate_cents').notNull(),
  costCents: integer('cost_cents').notNull(),
  fake: integer('fake', { mode: 'boolean' }).notNull(),
  /** The `unavailable` answers before the call was made (S-096): 0 for a row made at its first send. */
  transientErrors: integer('transient_errors').notNull().default(0),
  at: text('at').notNull(),
})

/**
 * One row per take made, every attempt's (S-071, S-072). Written with its video receipt — what it is
 * and what was asked for — and updated as each measure and gate completes. Its degradation is a
 * hold's reason, written with the assemble job's ending (S-073), or — on a held shot's third take — a
 * still-hold's, written with the clips job's (S-098).
 */
export const take = sqliteTable(
  'take',
  {
    runId: text('run_id')
      .notNull()
      .references(() => run.runId),
    /** `a<attempt>-shot-<unit>-take-<n>`. */
    takeId: text('take_id').notNull(),
    attempt: integer('attempt').notNull(),
    shotUnit: integer('shot_unit').notNull(),
    number: integer('number').notNull(),
    mode: text('mode', { enum: ['image-to-video', 'text-to-video'] }).notNull(),
    pictureId: text('picture_id'),
    degraded: integer('degraded', { mode: 'boolean' }).notNull().default(false),
    prompt: text('prompt').notNull(),
    requestedSeconds: integer('requested_seconds').notNull(),
    seed: integer('seed').notNull(),
    requestId: text('request_id').notNull(),
    expandedPrompt: text('expanded_prompt').notNull(),
    path: text('path').notNull(),
    /** JSON: what ffprobe measured (I-17). */
    probe: text('probe'),
    /** JSON: the black, frozen and silent stretches and the loudness (S-072). */
    scan: text('scan'),
    /** JSON: the words read, recorded and never failing (S-041's reading). */
    words: text('words'),
    /** JSON: whether its sound is speech or music. */
    sound: text('sound'),
    /** JSON: each gate's verdict with its coverage, in gate order, each once completed (I-6). */
    verdicts: text('verdicts').notNull().default('[]'),
    /** Null until Gate 2 fails or Gate 5 completes. */
    outcome: text('outcome', { enum: ['accept', 'fail'] }),
    /** A hold's reason (S-073), or a still-hold's on a held shot's third take (S-098). */
    degradation: text('degradation'),
  },
  (t) => [primaryKey({ columns: [t.runId, t.takeId] })],
)

/** One row per video call that returned (D-028, D-072, S-071). */
export const videoReceipt = sqliteTable('video_receipt', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  runId: text('run_id')
    .notNull()
    .references(() => run.runId),
  takeId: text('take_id').notNull(),
  model: text('model').notNull(),
  mode: text('mode', { enum: ['image-to-video', 'text-to-video'] }).notNull(),
  resolution: text('resolution').notNull(),
  requestedSeconds: integer('requested_seconds').notNull(),
  /** What a text-to-video call asked for; none for image-to-video, whose ratio is its picture's. */
  aspectRatio: text('aspect_ratio'),
  seed: integer('seed').notNull(),
  requestId: text('request_id').notNull(),
  prompt: text('prompt').notNull(),
  expandedPrompt: text('expanded_prompt').notNull(),
  expansionMode: text('expansion_mode').notNull(),
  styleId: text('style_id').notNull(),
  styleVersion: integer('style_version').notNull(),
  /** The video rate, per second, applied to this call (D-083). */
  rateCents: real('rate_cents').notNull(),
  costCents: integer('cost_cents').notNull(),
  fake: integer('fake', { mode: 'boolean' }).notNull(),
  /** A degraded shot's text-to-video take (D-050), a hold's (S-073), or a held shot's three (S-098). */
  degraded: integer('degraded', { mode: 'boolean' }).notNull().default(false),
  /** The `unavailable` answers before the call was made (S-096): 0 for a row made at its first send. */
  transientErrors: integer('transient_errors').notNull().default(0),
  at: text('at').notNull(),
})

/** What the witness said of a take, once, for a take whose Gate 4 completed (I-15, S-072). */
export const takeObservation = sqliteTable(
  'take_observation',
  {
    /** `obs-<takeId>`. */
    id: text('id').notNull(),
    runId: text('run_id').notNull(),
    takeId: text('take_id').notNull(),
    observation: text('observation').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.runId, t.id] }),
    foreignKey({ columns: [t.runId, t.takeId], foreignColumns: [take.runId, take.takeId] }),
  ],
)

/** What the reconciler answered for a take, and what code made of it (S-072). */
export const takeReconciliation = sqliteTable(
  'take_reconciliation',
  {
    /** `rec-<takeId>`. */
    id: text('id').notNull(),
    runId: text('run_id').notNull(),
    takeId: text('take_id').notNull(),
    answer: text('answer').notNull(),
    failed: text('failed').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.runId, t.id] }),
    foreignKey({ columns: [t.runId, t.takeId], foreignColumns: [take.runId, take.takeId] }),
  ],
)

/**
 * One row per render: the assembly's receipt (S-073). Its render manifest and that manifest's hash
 * are written before the assembler is called; the output, its measure and Gate 7's verdict after.
 */
export const render = sqliteTable(
  'render',
  {
    runId: text('run_id')
      .notNull()
      .references(() => run.runId),
    /** `a<attempt>-render`. */
    renderId: text('render_id').notNull(),
    attempt: integer('attempt').notNull(),
    /** JSON: the one document the render is made from (D-059). */
    renderManifest: text('render_manifest').notNull(),
    hash: text('hash').notNull(),
    path: text('path'),
    /** JSON: the output profile. */
    profile: text('profile').notNull(),
    /** JSON: the ffmpeg invocations the assembler ran. */
    invocations: text('invocations'),
    /** JSON: the output, measured (I-17). */
    measure: text('measure'),
    startedAt: text('started_at').notNull(),
    finishedAt: text('finished_at'),
    /** JSON: Gate 7's verdict (S-074). */
    gate7: text('gate7'),
  },
  (t) => [primaryKey({ columns: [t.runId, t.renderId] })],
)

/** A shot whose clip is shorter than its narration: its own table, so it is a query (I-4, S-073). */
export const hold = sqliteTable(
  'hold',
  {
    runId: text('run_id').notNull(),
    renderId: text('render_id').notNull(),
    shotId: text('shot_id').notNull(),
    seconds: real('seconds').notNull(),
    reason: text('reason').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.runId, t.renderId, t.shotId] }),
    foreignKey({ columns: [t.runId, t.renderId], foreignColumns: [render.runId, render.renderId] }),
  ],
)

// ---------------------------------------------------------------- reel-takes
//
// docs/features/reel-takes.md, Gate 2 "Storage". The migration that made these arrived in Slice 1;
// the clips job writes a still_hold row with whatever ending it reaches from Slice 3 (S-098).

/**
 * A shot held on its chosen picture at its take cap (D-025 rung 2, S-090): its own table, so "every
 * run with a held shot" is a query (I-4, S-098). Not a `hold`, which is a clip shorter than its
 * narration (S-073).
 */
export const stillHold = sqliteTable(
  'still_hold',
  {
    runId: text('run_id')
      .notNull()
      .references(() => run.runId),
    shotId: text('shot_id').notNull(),
    /** The clips job's attempt whose ladder decided it. */
    attempt: integer('attempt').notNull(),
    /** The chosen picture it is held on. */
    pictureId: text('picture_id').notNull(),
    /** JSON: that picture's file, probed by the media port when the shot was held (D-055, S-097). */
    probe: text('probe').notNull(),
    /** JSON: the three takes its ladder consumed, in order. */
    takeIds: text('take_ids').notNull(),
    reason: text('reason').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.runId, t.shotId] }),
    foreignKey({
      columns: [t.runId, t.pictureId],
      foreignColumns: [picture.runId, picture.pictureId],
    }),
  ],
)
