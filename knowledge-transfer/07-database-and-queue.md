# 07 — Database and queue

This document is a reference for the SQLite tables, the job queue, the event log, and how a
run's state evolves. Read it when you need to know what row a given operation wrote or what
happens when a job is interrupted.

## Storage technology

SQLite, accessed through Drizzle and `better-sqlite3` (`packages/domain/src/{schema.ts,db.ts}`).
`openDatabase` sets `journal_mode = WAL`, `foreign_keys = ON` and `busy_timeout = 5000`, then runs
every unapplied migration in `db/migrations/`. `apps/service` opens it once at startup to migrate
before either half runs.

`data/cutroom.sqlite` is the default database file. The folder is gitignored. A different
database is one `CUTROOM_DB_PATH` setting (D-086).

The API and the worker each open **their own connection** to the same file; WAL mode and the busy
timeout let them share it. Writes that need atomicity are inside `db.transaction(…, { behavior:
'immediate' })`; reads are unguarded.

## The tables

The schema lives in `packages/domain/src/schema.ts`: **21 tables**. The migrations are in
`db/migrations/` (`0000` to `0007`). Column names below are the SQL names you query; Drizzle's
field names are the same in camelCase (`run_id` is `runId`). Every time is an ISO 8601 UTC string
and every JSON value is stored as text.

| Group               | Tables                                                                                                  |
| ------------------- | ------------------------------------------------------------------------------------------------------- |
| Run and queue       | `run`, `run_event`, `job`, `plan`                                                                       |
| Pictures            | `picture`, `observation`, `reconciliation`, `degradation`                                               |
| Narration and takes | `narration`, `take`, `take_observation`, `take_reconciliation`, `still_hold`                            |
| Render              | `render`, `hold`                                                                                        |
| Spend and answers   | `model_receipt`, `generation_receipt`, `video_receipt`, `speech_receipt`, `lost_call`, `refused_answer` |

### `run` — one row per request, plus at most one resume

| Column              | Type | Notes                                                     |
| ------------------- | ---- | --------------------------------------------------------- |
| `run_id`            | text | primary key (`randomUUID()`)                              |
| `request_id`        | text | the caller's name for the reel                            |
| `request`           | text | the body exactly as it arrived                            |
| `request_canonical` | text | the parsed request with keys sorted at every depth        |
| `state`             | text | `'running'` or `'finished'`                               |
| `result`            | text | a `RunResult`, JSON, present once finished                |
| `cancel_requested`  | int  | boolean; honoured at `startStage`                         |
| `created_at`        | text | ISO 8601 UTC                                              |
| `resumes`           | text | the run this one resumes, or null for a first run (S-162) |
| `failure`           | text | a `FailureKind`, written with `result` for a failed run   |
| `resume_request`    | text | the caller's normalised list of pieces to remake          |

Two unique indexes: `request_id WHERE resumes IS NULL` (one first run per `requestId`) and
`resumes` (one resume per failed run).

### `run_event` — append-only event log

Primary key `(run_id, seq)`. `seq` is numbered from 1 per run inside the transaction that writes
the event. `body` is the whole `RunEvent` JSON. The caller reads them with
`eventsAfter(db, runId, since)`.

### `job` — the chain

A reel is a chain of rows sharing one `correlation_id` (D-081). The chain:

```
reel.plan (parent = null)
   │
   ▼
reel.keyframes (parent = plan_job_id)
   │
   ▼
reel.clips (parent = keyframes_job_id)
   │
   ▼
reel.assemble (parent = clips_job_id)
```

`kind` is one of `PLAN_JOB`, `KEYFRAMES_JOB`, `CLIPS_JOB`, `ASSEMBLE_JOB`
(`packages/domain/src/runs.ts`). `payload` is `{ runId }`. `state` is `'queued'`, `'running'`,
`'done'`, `'dead'`. `attempts` increments every claim. `run_at` is when it is due; `locked_at` and
`lease_until` are set by the claim; `error` is a buried job's message. `cost_cents` is the running
sum of the paid calls the job made. `parent_id` is the parent job's id. `correlation_id` is the
run's `runId`.

A resumed run's jobs start at the attempts the run it resumes reached at that kind, so every id the
job makes is new and no take is sent the seed the failed run's was (D-018, S-162).

### `plan` — both plans of the fork and the repair

Primary key `(run_id, role)`. One row per plan: `role` (`'a' | 'b' | 'repair'`), `unit_count`,
`axis`, the plan JSON, the Gate 0 verdict JSON, the `score` (only when both plans survived),
`estimate_cents`, and a `selected` flag.

### `picture` — every picture the run made or kept

Primary key `(run_id, picture_id)`, unique `(run_id, seq)`. Written with its image receipt and
updated as each check completes: `picture_id` (`a<attempt>-shot-<unit>-<label>`), `seq` (the run's
picture number), `attempt`, `shot_unit`, `subject_id`, `role` (`canonical`, `derived` or
`standalone`), `label`, `path`, `prompt`, `framing`, `reference_ids`, `measure` (technical step),
`words` (text step), `gate1` (the verdict and each completed step), `score` (keyframe score),
`gate1s`, `degradation` (the reason, on the shot's last failing picture), `chosen` (written when
the stage ends), and `kept_from` (the run it was copied from by a resume, else null).

### `observation`, `reconciliation` — what was said about a picture

One row each per picture whose witness or reconcile step completed: `id` (`obs-<pictureId>`,
`rec-<pictureId>`), `run_id`, `picture_id`, and the observation JSON, or the reconciler's answer
and the reasons code failed it on.

### `degradation` — every shot without an approved picture

Primary key `(run_id, shot_id)`: `gate` (`'1'` or `'1S'`) and `reason`. Its own table, so "every
degraded shot" is a query (I-4).

### `narration` — every narration made or kept

Primary key `(run_id, narration_id)`: `narration_id` (`a<attempt>-shot-<unit>-narration`),
`attempt`, `shot_unit`, `text` (the unit's sentences joined by one space), `path`, `words` (the
word timings), `probe` (the file's measure), `kept_from`.

### `take` — every clip the run made or kept

Primary key `(run_id, take_id)`: `take_id` (`a<attempt>-shot-<unit>-take-<n>`), `attempt`,
`shot_unit`, `number`, `mode` (`image-to-video` or `text-to-video`), `picture_id`, `degraded`,
`prompt`, `expanded_prompt`, `requested_seconds`, `seed` (CRC-32 of the take id), `request_id` (the
provider's), `path`, `probe`, `scan`, `words`, `sound`, `verdicts` (every gate's verdict, in gate
order), `outcome` (`accept` or `fail`, once decided), `degradation` (a hold's or still-hold's
reason), `kept_from`.

### `take_observation`, `take_reconciliation` — what was said about a take

Gate 4's observation and Gate 5's reconciliation of a take, ids `obs-<takeId>` and `rec-<takeId>`.

### `still_hold` — every shot held on its picture

Primary key `(run_id, shot_id)`. Written by the clips job, whatever ending it reaches: the clips
job's `attempt`, the chosen `picture_id` it is held on, that picture's `probe`, the three
`take_ids` that failed, and the `reason` (S-098).

### `render` — the render row

Primary key `(run_id, render_id)`. `render_id` (`a<attempt>-render`), `attempt`, `render_manifest`
(canonical JSON), `hash` (SHA-256 of that text), `profile` and `started_at` are written **before**
the assembler is called; `path`, `invocations` (the ffmpeg argument lists), `measure`, `gate7` and
`finished_at` once `cutReel` returns.

### `hold` — every clip shorter than its narration

Primary key `(run_id, render_id, shot_id)`: `seconds` (the hold's length) and `reason`. Written
with the assemble job's ending. Not a `still_hold`, which is a shot shown as its picture.

### The receipt and answer tables

Each is one row per call that returned, written as it returns, with the rate applied:

- `model_receipt` — every model call: `role`, `call` (`structured`, `observe`, `compare`,
  `judgeCut`, `readText`), `picture_ids`, `take_ids`, `model`, `temperature`, `input_tokens`,
  `output_tokens`, `fake`, `at`. Written **outside the transaction that finishes the run**, so it
  survives a later thrown call, a failed run and an interrupted job (D-005, D-084).
- `generation_receipt` — every image call: `picture_id`, `model`, `prompt`, `reference_ids`,
  `style_id`, `style_version`, `rate_cents`, `cost_cents`, `fake`, `degraded`, `at`.
- `video_receipt` — every clip call: `take_id`, `model`, `mode`, `resolution`,
  `requested_seconds`, `aspect_ratio`, `seed`, `request_id`, `prompt`, `expanded_prompt`,
  `expansion_mode`, `style_id`, `style_version`, `rate_cents`, `cost_cents`, `fake`, `degraded`,
  `transient_errors`, `at`. A held shot's three takes' receipts are marked `degraded` in the
  transaction that writes the hold (S-058, S-098).
- `speech_receipt` — every narration call: `narration_id`, `model`, `characters`, `rate_cents`,
  `cost_cents`, `fake`, `transient_errors`, `at`.
- `lost_call` — a call a provider answered and the engine could not use (`Spent`): `port`,
  `model`, `cost_cents`, `detail` (never a key or URL), `at`. Its cost is added to the job row like
  any receipt's (S-142).
- `refused_answer` — a model answer that could not be read, kept for a person: `port`, `role`,
  `call`, `about`, `ask` (1 or 2), `reasons`, `answer` (redacted and capped at 32 000 characters).
  Nothing in the engine reads it back; `scripts/refused.mjs` prints it (S-156).

## The job queue

`packages/domain/src/queue.ts`. The queue is a table (D-002), not a separate process.

### `enqueue(tx, entry, now)`

Inserts a job row with `state: 'queued'`, `runAt: now.toISOString()`. Returns the new id.
`attempts` defaults to 0.

### `claimJob(db, kinds, now, leaseMs)`

The claim is one `UPDATE … RETURNING`, so two workers cannot claim the same row. The claim
holds the job for `leaseMs` (default `DEFAULT_LEASE_MS = 60_000`). A job claimed whose lease
ran out (its worker died with it in hand) is claimed again and run from the start (S-027).

The `WHERE` is:

```sql
state IN ('queued', 'running') AND kind IN (…) AND
( (state = 'queued' AND runAt <= now) OR (state = 'running' AND leaseUntil <= now) )
```

ORDER BY id ASC LIMIT 1 — oldest first.

### `completeJob(tx, jobId, costCents?)`

Marks the job `done`, clears the lease. If `costCents` is given, sets it; otherwise the cost
its image calls added is kept (S-036).

### `buryJob(db, jobId, error)`

Marks the job `dead` with the error message and clears the lease. A buried job is never claimed
again. This is what the worker does with any thrown error.

## The run lifecycle

| Function                                   | When it runs                                            | What it writes                                                                                  |
| ------------------------------------------ | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `submitRun(db, request, received, now)`    | `POST /v1/runs`                                         | `run` row, `reel.plan` job, `run.accepted` event                                                |
| `startStage(db, runId, stage, now)`        | every stage, before the stage's work                    | `stage.started` event (first attempt only), or answers `'cancelled'`                            |
| `finishRun(db, finish, now)`               | `reel.plan`                                             | `plan` rows, events, `run.finished` event, result, job done, **engine's own resume**            |
| `admitStills(db, admit, now)`              | `reel.plan` admits                                      | `plan` rows, events, plan job done, `reel.keyframes` job                                        |
| `finishStills(db, finish, now)`            | `reel.keyframes` ends the run (`until: 'stills'`)       | chosen flags, degradations, events, `run.finished`, job done                                    |
| `advanceStills(db, a, now)`                | `reel.keyframes` admits (`until: 'video'`)              | chosen flags, degradations, events, keyframes job done, `reel.clips` job                        |
| `advanceClips(db, a, now)`                 | `reel.clips` admits                                     | held labels, events, clips job done, `reel.assemble` job                                        |
| `finishVideo(db, f, now)`                  | `reel.clips` stops/fails, `reel.assemble` ends the run  | held labels (and render outputs from `reel.assemble`), events, `run.finished`, result, job done |
| `resumeRun(tx, runId, plan, options, now)` | `POST /v1/runs/:runId/resume` admitted, engine's resume | a new `run` row with `resumes = runId`, the kept rows copied in, `run.accepted`, the first job  |
| `requestCancel(db, runId)`                 | `POST /v1/runs/:runId/cancel`                           | sets `cancelRequested = true` on a running run                                                  |

Every write that numbers an event happens inside **one immediate transaction** — the event's
`seq` and the row that carries it cannot be separated (`packages/domain/src/runs.ts:39`).

## Resumes and the chain

A resume is a **new run of the same `requestId`** (S-162). It names the run it resumes in
`run.resumes`, and the kept rows (plan rows, decided pictures, finished narrations, decided takes)
are copied into it with `kept_from` set. Its first job has no parent and is `reel.keyframes` — the
plan is copied, not made again — or `reel.plan` when the failed run had no selected plan. Every job
of the new chain starts at the **attempts the run it resumes reached** at that kind (D-018). So every id the resumed chain makes —
take numbers, picture ids — is new, and no take is sent the seed the failed run's was.

`readRunByRequestId(db, requestId)` returns the **newest** run for that request, so the
caller's name for the reel always reaches its current run.

## How receipts are written

`recordReceipt(db, runId, receipt, now)` (`packages/domain/src/runs.ts:205-226`) writes a
`model_receipt` row **outside any transaction**. The point is durability: a later thrown call
cannot erase the receipts the calls that succeeded left. The row carries the role, the call
metadata (prompt kind, picture ids, take ids), the model name, the temperature, the token
counts, whether it was a stand-in call, and the time.

The paid receipts are written by the worker's guarded ports as each call returns, before the
answer reaches the stage, each in one immediate transaction with what it made and its cost added to
the job row: `generation_receipt` with the `picture` row, `video_receipt` with the `take` row,
`speech_receipt` with the `narration` row. A call that answered and could not be used writes a
`lost_call` row instead (S-142).

## Reading the rows from the SDK

The API exposes:

- `GET /v1/runs/:runId` → `RunStatus`. The `resumes` field is present iff this run has one;
  the `resumedBy` field is present iff another run resumes this one. Both are read from the
  rows (`statusOf`, `packages/domain/src/runs.ts:142-165`), so they are never stale.
- `GET /v1/runs/:runId/events?since=N` → `EventsPage`. `nextSince` is the last event's `seq` (or
  `since` if there were no events).
- `GET /v1/runs/:runId/result` → `RunResult` (200) or `RunStatus` (409).
- `GET /v1/runs/:runId/record` → `RunRecord`. Every picture made, every attempt's, in `seq`
  order, with each check it reached. In a resumed run, every picture and take copied into it
  names the run it came from.

## Migrations

`db/migrations/` are plain SQL files numbered in order. The runner applies every unapplied
migration at startup. The migrations relevant to the current state of the engine include:

- `0007_resume_failed.sql` — adds `resumes`, `failure`, `resume_request` to `run` and makes the
  `requestId` index partial (S-162, S-163).

To change the schema, edit `packages/domain/src/schema.ts` and generate the migration with
`corepack pnpm db:generate` (drizzle-kit), which writes the next numbered `db/migrations/000N_*.sql`
and updates `db/migrations/meta/`. Never edit a migration that has already been applied.

## Inspecting the database

There is no CLI helper — use `sqlite3 data/cutroom.sqlite` (or any Drizzle reader) and read the
tables directly. `scripts/decisions.mjs` does not print runs; `docs/context.md` lists the
recent real runs by hand.
