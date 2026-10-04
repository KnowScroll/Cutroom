# 08 — Resume of failed runs

This document is a reference for the two resume paths: the **engine's own resume** (automatic,
off by default; on for the service after `resumeDelayMs`) and the **caller's manual resume**
(via `POST /v1/runs/:runId/resume`, with `preview` to ask before making). Both use the same
planner and the same admission rule.

## The principle

A failed run is **a new run of the same `requestId`** (S-162). The new run's `run.resumes`
names the failed run. The new chain's `reel.keyframes` / `reel.clips` / `reel.assemble` jobs
start at the **attempts the run it resumes reached** at the corresponding kind (D-018), so
every id the new chain makes is new and no take is sent the seed the failed run's was.

Both resume paths go through one planner (`planResume`) and one admission rule
(`admitResume`), with the rates the worker prices at (`resumeRates`). The engine's resume and
the caller's preview cannot come to plan the same resume two ways, and cannot come to price it
differently (S-174).

## Which endings are resumed

The planner's table of resumable endings (`packages/pipeline/src/resume/index.ts`) decides, for
both paths:

- **The engine** resumes a run that **failed** with one of the four resumable kinds —
  `'unavailable'`, `'unreadable'`, `'provider-failed'`, `'crashed'` — and whose caller did not
  ask to cancel it.
- **A caller** may resume those, and also a run that **stopped at Gate 7**.
- `off-spec` is never resumed (the same image entry would make the same unusable frame), and
  neither is `engine`, the engine's own fault (S-163).
- A run is resumed at most once, and a run that is itself a resume is not resumed again.

## The planner — `planResume`, `normalise`, `takedown`, `admitResume`

All four are in `packages/pipeline/src/resume/index.ts` and are **pure**.

### `normalise(pieces, plan, until)`

The caller's named pieces as one list, in shot order then still / narration / clip (S-161).
Expands `piece.shot = undefined` to every shot the plan places a picture on (for `still`) or
every shot of a video run (for `narration` and `clip`). Refuses:

- A run with no selected plan.
- A still on a shot the plan places no picture on.
- A narration or a clip on a `until !== 'video'` run.
- A shot id outside the plan's shots.

Returns `{ pieces: […] }` or `{ invalid: '…' }`.

### `takedown(named, plan, until)`

What the named pieces take down with them. A still takes down its shot's clip, and the
canonical's still every derived shot's still and clip drew from (D-026). A standalone's still
takes down its shot only (S-150). A narration takes down its shot's clip (which is timed to
it). A clip takes itself. The cut and Gate 7 are **always** made again.

### `planResume(inputs, remake, rates, by)`

Pure. Inputs:

- `inputs: ResumeInputs` (the failed run's request, the kept pictures / narrations / takes,
  and the spent cents).
- `remake`: the pieces the caller names to make again (empty for the engine's resume, which
  keeps every piece the run checked). Each is normalised, then `takedown` adds what it takes down
  with it.
- `rates: ResumeRates` (the rates the worker prices at — `imageRateCents`,
  `videoRateCentsPerSecond`, `narrationRateCentsPerCharacter`).
- `by: 'engine' | 'caller'` — names the resume's source so the question the owner is asked
  can name the right actor.

Answers `replayed` or `resumed` for a run resumed already, a refusal for an ending the table does
not resume or an invalid list, or `planned`: what is kept (every plan row, decided picture,
finished narration and decided take the named pieces do not take down) and what is made again. A
run that failed before it had a selected plan is planned again from nothing, keeping nothing. The
plan carries the resume's `estimateCents` — the first calls still to make, at `rates`, with no
repair, retry or reserve — and the normalised `named` list.

### `admitResume(spentCents, estimateCents, capCents, ceilingCents)`

The cap first (D-100), the ceiling second. Returns one of:

- `{ admitted: true, estimateCents }`.
- `{ admitted: false, limit: 'reel', estimateCents }` (the per-reel cap fired — the owner is
  asked).
- `{ admitted: false, limit: 'ceiling', estimateCents }` (the caller's ceiling fired — the
  caller is refused, no question is written).

## The engine's own resume

`apps/worker/src/resume.ts`. Off in the worker's own default; the service always turns it on with
`WorkerOptions.resume = { delayMs: settings.resumeDelayMs }` — `CUTROOM_RESUME_DELAY_MS`, 15
minutes unless set (`0` makes the resume due at once).

When a stage fails (`finishFailed`):

1. Read the cap **before the transaction** (so an unreadable cap is one line in
   `QUESTIONS.md`, not a buried job).
2. Call the stage's finishing function with `resume: (tx, now) => …` — a `ResumeStep` that
   runs **inside a `SAVEPOINT resume`** of the finishing transaction, rolled back if it
   throws (S-163).
3. Inside the savepoint: `readResumeInputs(tx, runId, ending)`, `planResume(inputs, [], rates,
'engine')`, `admitResume(...)`. If admitted: `resumeRun(tx, runId, plan, { now, delayMs:
context.delayMs, resumeRequest: null })`. If over the ceiling: `{ outcome: 'not-resumed' }`.
   If over the cap: `{ outcome: 'cap', question }`.
4. After the transaction: write the question for a cap-refused resume, or one line for a
   resume that could not be made (D-097, S-026). Nothing for a ceiling-refused or a successful
   resume.

`SAVEPOINT resume` means a resume that cannot be made leaves no row of its own and never stops
the run from failing (S-163). The finishing function writes the failed result, the engine's
"resume question" line (if any), and the run is finished — the resumed run, if any, runs in
its own time.

## The caller's resume — `POST /v1/runs/:runId/resume`

`apps/api/src/server.ts:180-279`. The service hands the API a `ResumeService` built from the
worker's own settings and questions file (`apps/service/src/service.ts:53-81`). That service
is one builder of `planResume`, `admitResume`, and `appendResumeQuestion` — **the same**
planner, the same admission, the same questions file as the worker.

Request body shape (`ResumeRequest` from `packages/reel-contract`):

```ts
{
  contractVersion: 1,
  remake?: Piece[]   // pieces not to keep; absent or empty keeps every piece the run checked
  preview?: true     // answer what would be made and what it would cost; write nothing
}
```

Each `Piece` is `{ kind: 'still' | 'narration' | 'clip', shot?: 'shot-N' }`. A `shot` of
`undefined` expands to every applicable shot; a named `shot` must be in the plan.

Outcomes (`ResumeResponse`):

| Status | Body                                                                                                                                                            |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 200    | `{ outcome: 'preview', runId, remake, estimateCents, spentCents, capCents, ceilingCents, limit? }` — reads and writes nothing; `limit` says which it would pass |
| 202    | `{ outcome: 'accepted', runId, resumes, replayed: false }` — the resume was admitted and made in one transaction; `runId` is the new run                        |
| 202    | `{ outcome: 'accepted', runId, resumes, replayed: true }` — the run was already resumed with this same list                                                     |
| 404    | `ErrorResponse` — no such run                                                                                                                                   |
| 409    | `{ outcome: 'refused', runId, reason: 'not-resumable', detail }` — an ending the table does not resume                                                          |
| 409    | `{ outcome: 'refused', runId, reason: 'resumed', detail }` — already resumed with another list (or by the engine)                                               |
| 409    | `{ outcome: 'refused', runId, reason: 'budget', limit, estimateCents, spentCents, capCents, ceilingCents }` — over the per-reel cap or the caller's ceiling     |
| 422    | `{ outcome: 'refused', runId, reason: 'invalid', detail }` — the body is not JSON or fails the schema, or a named piece is not in the plan                      |
| 422    | `{ outcome: 'refused', runId, reason: 'version', detail }` — another `contractVersion`                                                                          |
| 422    | `{ outcome: 'refused', runId, reason: 'unsupported', detail }` — the engine was started without a `ResumeService`                                               |

### The transaction

For a non-preview call, the API opens `db.transaction(tx => …, { behavior: 'immediate' })`. Inside:

- `readResumeInputs(tx, runId)`.
- `service.decide(inputs, remake, capCents)`.
- If admitted: `resumeRun(tx, runId, plan, { now, delayMs: 0, resumeRequest: plan.named })` — the
  new run, its copied rows and its first job, due at once.
- If over the per-reel cap: write the `askOwner` question **after** the transaction. The
  transaction itself wrote nothing (S-161).

A preview reads through the connection and opens no transaction — it writes nothing.

## `resumeRun`

`packages/domain/src/resume.ts`, used by both the API and the engine's resume, always inside the
caller's immediate transaction.

`resumeRun(tx, runId, plan, { now, delayMs, resumeRequest })`:

1. Reads the failed run again; one that was resumed already, or is itself a resume, **throws**, and
   the transaction leaves nothing.
2. Creates a new `run` row: a new `runId`, the failed run's `requestId` and request,
   `resumes = runId`, `state = 'running'`, and the caller's normalised list as
   `resume_request` (null for the engine's). The partial unique index on `request_id` allows it
   because `resumes` is not null.
3. Copies the kept rows into it with `kept_from` naming the failed run: every plan row; each kept
   picture with its observation and reconciliation (`chosen` reset, its degradation kept); each
   kept narration; each kept take with its observation and reconciliation (its degradation
   reset). Receipts, lost calls, refused answers, degradation rows, still-holds, renders and holds
   are **not** copied: every cent stays with the run that spent it (D-084). Files are not copied
   either; a copied row keeps its stored path.
4. Appends `run.accepted` and, when there are plan rows, the plan stage's events.
5. Enqueues one job with no parent: `reel.keyframes` when the failed run had a selected plan
   (nothing is planned again), or `reel.plan` when it had none. It is due `delayMs` after `now`
   (15 minutes for the engine's, at once for a caller's), and its `attempts` start at the greatest
   the failed run reached for that kind, so every `a<attempt>-…` id and every seed is new (D-018,
   S-162).
6. Returns the new run's id.

## What "kept" means

A `PictureRecord` is kept when its Gate 1 **decided**, accepted or failed, with every check it
completed. A `NarrationRecord` is kept when it was made, measured and its word timings parsed. A
`TakeRecord` is kept when it was **decided** — Gate 2 failed it or Gate 5 completed, accept or
fail. Pieces the named list takes down are not kept.

The ladders consult `kept` before every call: a kept picture or take is used, not made again —
no call, no check, no receipt (S-164, S-092). A shot whose kept takes already hold an accepted one
is finished; a shot with three kept failed takes reaches the hold-or-stop decision with no call.
The new run still emits `verdict` events for the kept pieces once, when the ladder reaches them.

## The cap and the two questions

- **Per-reel cap** (D-100): read from `BUDGET.md`'s `Per reel, all-in` row.
- **Caller's ceiling**: from `request.options.budgetCents`.

A refusal at the per-reel cap asks the owner (D-097). A refusal at the caller's ceiling does
not — it returns the refusal and only the refusal.

The owner is asked through the `ResumeService` the service built. The API's refusal at the
cap fires `service.askOwner({ runId, requestId, by: 'caller', named, … }, now)`, which calls
`appendResumeQuestion(options.questionsPath, …)`. The engine's resume fires
`appendResumeQuestion(context.questionsPath, …)` directly. The same questions file
(`QUESTIONS.md` by default) gets both.

## The contract — what the caller sees

`ResumeResponse` is the discriminated union above. The SDK (`packages/sdk/src/index.ts`)
parses every `200`, `202`, `409` and `422` response with `ResumeResponse` and returns it as a
value — a refusal is an answer, not an exception. A `404` or `500` `ErrorResponse` is thrown as
`SdkApiError`, and a body that fails its schema as `SdkProtocolError`. A preview that answers 200 with `outcome: 'preview'` is the
caller's chance to ask the user before committing spend.

The resume preview is the right tool when the caller wants to know "what would this cost?" or
"what would this remake?" before the engine actually spends. The engine does not call any
provider for a preview (S-161).
