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

## Failure kinds the engine resumes

`apps/worker/src/resume.ts:23-29` lists the four "provider's fault" failures:

```
'unavailable', 'unreadable', 'provider-failed', 'crashed'
```

`engine` and `off-spec` failures are **not** resumed by the engine — they are the engine's
fault, not a provider's (S-163).

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
- `remake`: extra pieces the caller wants remade, on top of the named pieces' takedown.
- `rates: ResumeRates` (the rates the worker prices at — `imageRateCents`,
  `videoRateCentsPerSecond`, `narrationRateCentsPerCharacter`).
- `by: 'engine' | 'caller'` — names the resume's source so the question the owner is asked
  can name the right actor.

Decides what is kept (every kept `PictureRecord` / `NarrationRecord` / `TakeRecord`) and what
is made again (the rest). The output includes the resume's `estimateCents` and the `named`
list — the pieces the resume will remake.

### `admitResume(spentCents, estimateCents, capCents, ceilingCents)`

The cap first (D-100), the ceiling second. Returns one of:

- `{ admitted: true, estimateCents }`.
- `{ admitted: false, limit: 'reel', estimateCents }` (the per-reel cap fired — the owner is
  asked).
- `{ admitted: false, limit: 'ceiling', estimateCents }` (the caller's ceiling fired — the
  caller is refused, no question is written).

## The engine's own resume

`apps/worker/src/resume.ts`. Off by default; the service turns it on with
`WorkerOptions.resume = { delayMs: 15 * 60_000 }`.

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
  remake?: Piece[]                     // pieces to remake on top of what failed
  preview?: boolean                   // true: answer with the plan, do not make
}
```

Each `Piece` is `{ kind: 'still' | 'narration' | 'clip', shot?: 'shot-N' }`. A `shot` of
`undefined` expands to every applicable shot; a named `shot` must be in the plan.

Outcomes (`ResumeResponse`):

| Status | Body                                                                                                                                                                                 |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 200    | `{ outcome: 'preview', runId, remake, estimateCents, spentCents, capCents, ceilingCents, limit? }` — read and write nothing; an admitted plan would be made, a refused one would not |
| 202    | `{ outcome: 'accepted', runId, resumes, replayed: false }` — the resume was admitted and made in one transaction                                                                     |
| 202    | `{ outcome: 'accepted', runId, resumes, replayed: true }` — this run was already the resume                                                                                          |
| 409    | `{ outcome: 'refused', runId, reason: 'resumed' }` — already resumed                                                                                                                 |
| 409    | `{ outcome: 'refused', runId, reason: 'budget', limit, estimateCents, spentCents, capCents, ceilingCents }` — over the per-reel cap or the caller's ceiling                          |
| 409    | `{ outcome: 'refused', runId, reason: 'invalid' }` — the named pieces are not in the plan                                                                                            |
| 422    | `{ outcome: 'refused', runId, reason: 'unsupported' }` — the engine was started without a `ResumeService`                                                                            |
| 422    | `{ outcome: 'refused', runId, reason: 'invalid' }` — the body is not JSON / not a JSON object / fails the schema                                                                     |

### The transaction

For a non-preview call, the API opens `db.transaction(tx => …, { behavior: 'immediate' })`. Inside:

- `readResumeInputs(tx, runId)`.
- `service.decide(inputs, remake, capCents)`.
- If `admitResume` admitted and the cap was not over: `resumeRun(tx, runId, plan, …)` — writes
  the new run's row with `resumes = runId`, enqueues the chain's first job with the
  `startingAttempts` of the run it resumes at `reel.plan`.
- If over the per-reel cap: write the `askOwner` question **after** the transaction. The
  transaction itself wrote nothing (S-161).

A preview reads through the connection and opens no transaction — it writes nothing.

## `resumeRun`

`packages/domain/src/runs.ts` (the `resumeRun` definition is the same file that defines
`submitRun`; the call is used by both the API and the engine's resume).

`resumeRun(tx, runId, plan, { now, delayMs, resumeRequest })`:

1. Creates a new `run` row with `runId = randomUUID()`, `requestId` inherited from the failed
   run, `resumes = runId`, `state = 'running'`. The `requestId` partial unique index is
   satisfied because the new row's `resumes` is not null.
2. Computes `startingAttempts` for each kind: for `reel.plan` it is `0`; for
   `reel.keyframes` it is `greatestAttempts(failedRunId, 'reel.keyframes')`; and so on.
3. Enqueues the chain's first job (`reel.plan`) with `parentId = null` and the inherited
   `attempts` for that kind.
4. Returns the new run's id.

The new run's `reel.keyframes` / `reel.clips` / `reel.assemble` jobs are written by the chain
in the normal way, with the inherited `startingAttempts`. So:

- The new run's ids are fresh.
- The new run's planner does not re-plan — it reads the inherited plan from the row and
  does **not** issue new model calls for the kept pictures / narrations / takes.

## What "kept" means

A `PictureRecord` is kept when its Gate 1 verdict was `accept` (or its `accept` chain had
survived 1S). A `NarrationRecord` is kept when the media port parsed its word timings. A
`TakeRecord` is kept when its Gate 5 verdict was `accept`.

The ladder consults `kept` before every call: a kept picture is used, not remade (no call, no
check, no receipt — S-164). The new run still emits `verdict` events for the kept pieces once,
when the ladder reaches them.

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

`ResumeResponse` is the discriminated union above. The SDK (`packages/sdk/src/index.ts:600`)
parses every `200`, `202`, `409`, `422` response with `ResumeResponse.safeParse` and surfaces
errors through `SdkApiError`. A preview that answers 200 with `outcome: 'preview'` is the
caller's chance to ask the user before committing spend.

The resume preview is the right tool when the caller wants to know "what would this cost?" or
"what would this remake?" before the engine actually spends. The engine does not call any
provider for a preview (S-161).
