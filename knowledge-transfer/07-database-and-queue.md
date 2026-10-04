# 07 — Database and queue

This document is a reference for the SQLite tables, the job queue, the event log, and how a
run's state evolves. Read it when you need to know what row a given operation wrote or what
happens when a job is interrupted.

## Storage technology

SQLite, accessed through Drizzle (`packages/domain/src/{schema.ts,db.ts}`). The migrations are
plain SQL files in `db/migrations/`, applied at startup by `apps/service/src/service.ts`
(`openDatabase` runs every unapplied migration in order).

`data/cutroom.sqlite` is the default database file. The folder is gitignored. A different
database is one `CUTROOM_DB_PATH` setting (D-086).

The API and the worker each open **their own connection** to the same file. Drizzle handles
serialization. Writes that need atomicity are inside `db.transaction(…, { behavior:
'immediate' })`; reads are unguarded.

## The tables

The schema lives in `packages/domain/src/schema.ts`. The migrations are in `db/migrations/`.

### `run` — one row per request, plus at most one resume

| Column             | Type | Notes                                                     |
| ------------------ | ---- | --------------------------------------------------------- |
| `runId`            | text | primary key (`randomUUID()`)                              |
| `requestId`        | text | the caller's name for the reel                            |
| `request`          | text | the body exactly as it arrived                            |
| `requestCanonical` | text | the parsed request with keys sorted at every depth        |
| `state`            | text | `'running'` or `'finished'`                               |
| `result`           | text | a `RunResult`, JSON, present once finished                |
| `cancelRequested`  | int  | boolean; honoured at `startStage`                         |
| `createdAt`        | text | ISO 8601 UTC                                              |
| `resumes`          | text | the run this one resumes, or null for a first run (S-162) |
| `failure`          | text | a `FailureKind`, written with `result` for a failed run   |
| `resumeRequest`    | text | the caller's normalised list of pieces to remake          |

Two unique indexes: `requestId WHERE resumes IS NULL` (one first run per `requestId`) and
`resumes` (one resume per failed run).

### `run_event` — append-only event log

Per-run, monotonic `seq`, written inside one transaction. `body` is the `RunEvent` JSON. The
caller reads them with `eventsAfter(db, runId, since)`.

### `job` — the chain

A reel is a chain of rows sharing one `correlationId` (D-081). The chain:

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
(`packages/domain/src/runs.ts:46-52`). `payload` is `{ runId }`. `state` is `'queued'`,
`'running'`, `'done'`, `'dead'`. `attempts` increments every claim. `costCents` is the sum of
the receipts of calls the job made. `parentId` is the parent job's id. `correlationId` is the
run's `runId`.

A resumed run's jobs start at the attempts the run it resumes reached at that kind
(`startingAttempts`, `packages/domain/src/runs.ts:287-292`), so every id the job makes is new
and no take is sent the seed the failed run's was (D-018, S-162).

### `plan` — both plans of the fork and the repair

One row per plan, with `role: 'a' | 'b' | 'repair'`, `axis`, the plan JSON, the Gate 0 verdict
JSON, the score, the plan's `estimateCents`, and a `selected` flag.

### `picture` — every picture the run made or kept

`pictureId`, `shotId`, `unit`, `role`, `chosen` (the picture the stage picked for the shot),
`degradation` (the reason if the stage degraded the shot), Gate 1's verdict JSON, Gate 1S's
verdict JSON. Pictures an earlier attempt decided carry the deciding attempt's `chosen` flag
(S-164).

### `model_receipt` — every model call that returned

One row per call, written as it returns (D-005, D-084) — **outside the transaction that
finishes the run**, so it survives a later thrown call, a failed run and an interrupted job.

`role`, `call`, `pictureIds`, `takeIds`, `model`, `temperature`, `inputTokens`, `outputTokens`,
`fake` (true for a stand-in call), `at`. `packages/domain/src/runs.ts:205-226`.

### `video_receipt`, `narration_receipt` — every clip / narration call

Same shape as `model_receipt` for the corresponding port. A degraded take's video receipt is
marked `degraded: true` in the same transaction that writes the take's `degradation`
(S-058, S-098).

### `take` — every clip the run made

`takeId`, `shotId`, `unit`, `attempt`, `takeNumber`, every gate's verdict JSON,
`narrationId` if it had one, `degradation` (the reason if it failed after three tries or was
held).

### `still_hold` — every held shot

A row per held shot, written with the clips job's `attempt`, the three `takeIds` that failed,
the chosen picture's id, the media port's `probe` result, and the reason.

### `hold` — every held shot in the render

`renderId`, `shotId`, `seconds` (the hold's length), `reason`. Written by the assemble job's
`finishVideo`.

### `render` — the render row

`runId`, `renderId`, `attempt`, `renderManifest` (canonical JSON), `hash`, `profile`,
`startedAt`, then `path`, `invocations`, `measure`, `gate7`, `finishedAt` once the assemble
job's `cutReel` returns.

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
| `resumeRun(tx, runId, plan, options, now)` | `POST /v1/runs/:runId/resume` admitted, engine's resume | a new `run` row with `resumes = runId`, the new chain's first job                               |
| `requestCancel(db, runId)`                 | `POST /v1/runs/:runId/cancel`                           | sets `cancelRequested = true` on a running run                                                  |

Every write that numbers an event happens inside **one immediate transaction** — the event's
`seq` and the row that carries it cannot be separated (`packages/domain/src/runs.ts:39`).

## Resumes and the chain

A resume is a **new run of the same `requestId`** (S-162). It names the run it resumes in
`run.resumes`. The new run's first job has no parent (`parentId = null`), but the new run's
`reel.keyframes` / `reel.clips` / `reel.assemble` jobs start at the **attempts the run it
resumes reached** at the corresponding kind (D-018). So every id the resumed chain makes —
take numbers, picture ids — is new, and no take is sent the seed the failed run's was.

`readRunByRequestId(db, requestId)` returns the **newest** run for that request, so the
caller's name for the reel always reaches its current run.

## How receipts are written

`recordReceipt(db, runId, receipt, now)` (`packages/domain/src/runs.ts:205-226`) writes a
`model_receipt` row **outside any transaction**. The point is durability: a later thrown call
cannot erase the receipts the calls that succeeded left. The row carries the role, the call
metadata (prompt kind, picture ids, take ids), the model name, the temperature, the token
counts, whether it was a stand-in call, and the time.

The same applies to `video_receipt` and `narration_receipt`: a successful call's row is
written before the call's result is returned to the stage.

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

If you add a migration, name it `0008_…sql` (or whatever number is next) and put the file in
`db/migrations/`. The schema in `packages/domain/src/schema.ts` should match.

## Inspecting the database

There is no CLI helper — use `sqlite3 data/cutroom.sqlite` (or any Drizzle reader) and read the
tables directly. `scripts/decisions.mjs` does not print runs; `docs/context.md` lists the
recent real runs by hand.
