# 03 — The request lifecycle

This document traces a request from `POST /v1/runs` to a finished run. Walk through it once;
refer back when you need to know where a given row was written or which stage failed a run.

## Overview

```
HTTP API                      SQLite (packages/domain)                  Worker (apps/worker)
──────────                    ───────────────────                  ────────────────────────
POST /v1/runs                 run row, run_event, plan/keyframes/clips/assemble jobs
  submitRun                       │
        │                         ▼
        ▼                job queue (oldest-first)
                          with a lease
        │                         │
        │                         ▼
        ▼              ┌──────────────────────┐
   response 202        runPlanJob (kind=reel.plan)
        │              ├─ split sentences into units
        │              ├─ call model port (×2)
        │              ├─ run Gate 0 on each plan
        │              └─ score & select, or repair
        │                         │
        │              finishRun OR
        │              admitStills + enqueue reel.keyframes
        │                         │
        │                         ▼
        │              runKeyframesJob (kind=reel.keyframes)
        │              ├─ place pictures; ladders (stills/ladder.ts)
        │              ├─ Gates 1 and 1S
        │              └─ canonical / derived / standalone, or degraded
        │                         │
        │              finishStills (until=stills) OR
        │              advanceStills + enqueue reel.clips
        │                         │
        │                         ▼
        │              runClipsJob (kind=reel.clips)
        │              ├─ narration per shot
        │              ├─ up to 3 takes per shot
        │              ├─ Gates 2, 3, 4, 5 per take
        │              └─ third failed take → hold on picture, or stop
        │                         │
        │              advanceClips + enqueue reel.assemble
        │                         │
        │                         ▼
        │              runAssembleJob (kind=reel.assemble)
        │              ├─ build render manifest from rows
        │              ├─ assembler.assemble → .mp4
        │              ├─ media.probe → MediaProbe
        │              ├─ frame strip (3 frames / shot)
        │              ├─ Gate 7
        │              └─ finishVideo
        │                         │
        ▼                         ▼
   GET /v1/runs/:runId      run is finished
   GET /v1/runs/:runId/events
   GET /v1/runs/:runId/result
   GET /v1/runs/:runId/record
```

The full chain runs for a `until: 'video'` request. For `until: 'stills'`, it ends at
`finishStills`. For `until: 'plan'`, it ends at `finishRun` after Gate 0.

## Step 1 — Submit

**Route**: `POST /v1/runs` (`apps/api/src/server.ts:311-313`).

Body shape: `SubmitRequest` from `packages/reel-contract`. The API parses it with
`SubmitRequest.safeParse`; an invalid body is `422 invalid` with a detail string naming every
issue.

The handler calls `submitRun` (`packages/domain/src/runs.ts:97-135`) in **one immediate
transaction**:

- If `requestId` was used before and the canonicalised body matches, returns `202 accepted` with
  `replayed: true` and the **newest** run for that `requestId` (so the caller's name for the reel
  always reaches its current run).
- If `requestId` was used before and the body differs, returns `409 conflict`.
- Otherwise inserts a `run` row (`runId = randomUUID()`, `state = 'running'`), enqueues the
  chain's first job (`kind = 'reel.plan'`, `correlationId = runId`, `payload = { runId }`), and
  appends a `run.accepted` event.

The response is `202 accepted` with `runId` and `replayed: false`.

The handler then returns and the caller polls. `requestId` uniqueness is enforced by a partial
unique index on `run.requestId WHERE resumes IS NULL` (a resumed run inherits its requestId).

## Step 2 — The worker claims `reel.plan`

**Worker loop**: `apps/worker/src/worker.ts:241-262`. The worker:

1. Calls `claimJob(db, [PLAN_JOB, KEYFRAMES_JOB, CLIPS_JOB, ASSEMBLE_JOB], now, leaseMs)`.
2. The claim is `UPDATE … RETURNING`, so two workers cannot claim the same row. The claim holds
   the job for `leaseMs`. The worker's own default is 60 seconds; the service keeps 60 seconds
   while every port is a stand-in, and uses a 4-hour floor (the time the video adapter allows a
   clip, times the most clips one job can ask for, plus an hour) as soon as any adapter is real.
3. Runs the job's runner, catching any thrown error into `buryJob` (the job goes to state
   `'dead'` with the error message and is never claimed again).
4. After the job returns or is buried, polls again.

For `reel.plan`, the runner is `runPlanJob` (`apps/worker/src/plan-job.ts`).

## Step 3 — The plan stage

**File**: `apps/worker/src/plan-job.ts`. **Pipeline**: `packages/pipeline/src/plan/index.ts`.

1. `startStage(db, runId, 'plan')` (`packages/domain/src/runs.ts:772-803`) opens a transaction,
   reads the cancel flag, and writes `stage.started` if it is the first attempt. A cancelled run
   answers `cancelled` immediately with `costCents: 0`.
2. The runner reads the request once, reads the cap from `BUDGET.md` once, wraps the model port
   in `recordingPort` (so every model receipt is persisted as it returns), and calls
   `planReel(request, model, capCents, settings)`.

`planReel`:

1. Splits the narration into sentences (`request.narration.length`), then groups them into two
   unit counts (`settings.shotCountUnits`, default `[4, 6]`). If either grouping is impossible
   without dividing a sentence, returns `kind: 'stopped-rule', rule: 'split'` — no fork, no call
   (D-112).
2. Asks the model port twice: once for `countA` units (role `'planner'`, temperature 0), once
   for `countB` units. Each call returns a structured `PlanningAnswer` (units, shots, subjects).
3. Builds two `Plan`s from those answers. Code, not the model, copies the criteria and computes
   `plannedImageCalls` and `estimateCents`. Under the `recurring` picture rule,
   `plannedImageCalls` is 0 when no subject appears in two or more shots, otherwise
   `2 + min(rankedSubjects − 1, 2)` — the rank-1 subject's canonical is made best of two, ranks 2
   and 3 once each — so at most 4. Under `upToThree` it is the placement's own calls (2 for a
   canonical, 1 for every other picture). `estimateCents` is
   `⌈plannedImageCalls × imageRateCents + total shot seconds × videoRateCentsPerSecond⌉`.
4. Runs `gate0` on both plans (`packages/pipeline/src/gates/gate0.ts`). A plan fails Gate 0 if
   any of the four conditions fails: `coverage`, `criteria`, `shape`, `cost`.
5. If both survive, scores each (one reconciler call per plan, never two at once, D-064) and
   picks the higher total (a tie goes to the 4-unit plan).
6. If exactly one survives, picks it without scoring (D-113).
7. If neither survives, makes **one** repair call (`repairBasis` picks the grouping) and runs
   Gate 0 on the repair. If the repair survives, picks it; otherwise the outcome is either
   `refused-budget` (all three over the per-reel cap, the lowest estimate is the refused figure)
   or `stopped-rule` (gate-0) with the failure reasons for all three.

Back in `runPlanJob`, the runner:

- If `outcome.kind === 'selected'` and the run is `until: 'plan'`, finishes the run with
  `status: 'completed', until: 'plan', estimateCents`. The selected plan's estimate is the
  `estimateCents` (a plan-only run is not refused against the caller's ceiling; planning costs
  nothing — D-083).
- If `outcome.kind === 'selected'` and the run is `until: 'stills'` or `until: 'video'`,
  compares the **whole estimate** (for `video`) or **just the pictures** (`stills`) against the
  caller's `budgetCents` ceiling. Admitted: `admitStills` (writes the plan rows, the events, the
  plan job done at cost 0, and the chain's `reel.keyframes` job). Refused: `finishRun` with
  `status: 'refused', reason: 'budget', limit: 'ceiling'`. No question is written — the caller's
  ceiling fired, not the engine's cap (D-100).
- If `outcome.kind === 'refused-budget'` (every plan over the per-reel cap), finishes the run
  with `limit: 'reel'` and appends a question to `QUESTIONS.md` (D-097, D-100). The owner is the
  one who can clear it.
- If `outcome.kind === 'stopped-rule'`, finishes with `status: 'stopped', reason: 'rule'`.

In every path, the planner's model receipts are already in `model_receipt` rows — they are
written as the call returns (D-005, D-084), outside any transaction, so they survive a thrown
call, a failed run and an interrupted job.

## Step 4 — The stills stage

**File**: `apps/worker/src/keyframes-job.ts`. **Pipeline**: `packages/pipeline/src/stills/index.ts`.

`reel.keyframes` exists only for an admitted `stills` or `video` run (D-081, D-083).

1. `startStage(db, runId, 'stills')` — same pattern as plan: a cancelled run ends with `status:
'cancelled'`.
2. Read the per-reel cap once. Wrap the image port in `guardedImagePort` (the cap is enforced
   here, so a stills stage cannot spend past it). Wrap the model port in `recordingPort`.
3. Call `makeStills({…}, { image, sensors, model }, stillsSettings)`.

`makeStills` first places the pictures by the plan's own rule (`placePictures`): the rank-1
recurring subject gets the **canonical** on the first shot that shows it; ranks 2 and 3 get a
**derived** picture each on the earliest free shot showing them; under `upToThree`, free slots (up
to three pictures in all) go to early shots with no picture and no pictured subject as
**standalone** pictures. Every other shot has no picture. A run makes at most six image calls;
whatever the placement does not need is the reserve for repairs (at most two a shot). Then, one
shot's ladder finished before the next begins (S-057):

- **The canonical.** Two candidates, framed `medium` and `wide` (`canonicalFraming`, D-032), each
  through Gate 1 as soon as it is made. Two survivors are ranked by the keyframe score; one
  survivor is chosen outright; none gets one repair from the reserve. If the repair fails Gate 1
  too, the run stops for rule `gate-1` before any derived picture is attempted.
- **Derived pictures** are made with the canonical as a reference picture and go through Gate 1;
  a failure takes a repair if a reserve slot is free, otherwise the shot is **degraded**. Each
  derived picture that passed Gate 1 is then held against the canonical by Gate 1S, with the
  same repair-or-degrade rule.
- **Standalones** go through Gate 1 only, with the same repair-or-degrade rule.
- A **degraded** shot goes on without an approved picture: its clip is later made from words
  (text-to-video), and the reason is recorded four ways (S-058).
- The stage answers `kind: 'completed'`, `kind: 'stopped-rule'`, `kind: 'stopped-budget'`, or
  `kind: 'failed'` — never throws (S-046).

The runner ends the stage:

- `kind: 'completed'` and `until: 'stills'` → `finishStills` (writes the chosen flags, the
  degradations, the events, `run.finished`, the result, marks the keyframes job done).
- `kind: 'completed'` and `until: 'video'` → `advanceStills` (same writes, plus the
  `reel.clips` job enqueued with `parent_id = keyframes_job_id`).
- `kind: 'stopped-rule' | 'stopped-budget'` → `finishStills` (the run is finished with
  `status: 'stopped'` and the corresponding `reason`).
- `kind: 'failed'` → `finishStills` with `status: 'failed'`. The failure kind is decided by
  `failureKindOf(error)` from the thrown error's class — `unavailable`, `unreadable`,
  `provider-failed`, `off-spec` or `engine` — except `crashed`, which is never thrown: the stage
  returns it when a job claimed again after a crash can no longer fit its pictures in six calls.
  (S-163.)

## Step 5 — The clips stage

**File**: `apps/worker/src/clips-job.ts`. **Pipeline**: `packages/pipeline/src/clips/index.ts`.

`reel.clips` exists only for a `video` run whose stills stage completed (S-069).

1. `startStage(db, runId, 'video')`.
2. Read the cap once; wrap the video and narration ports; call `makeClips({…}, { video,
narration, media, model }, renderSettings)`.

`makeClips` runs **shot by shot, in plan order**. For each shot:

- **Narration**: the shot's sentences are joined; the narration port returns audio or throws.
  The media port probes the file and parses `wordTimings` (the narration returned).
- **Takes**: up to 3 per shot, each made from the shot's chosen picture (image-to-video) or, for a
  shot with no picture, from words (text-to-video). Takes 2 and 3 are told every earlier failed
  take's reasons (D-033). Each take runs Gate 2 (technical: probe and black/frozen scan), Gate 3
  (text and sound: words recorded, speech or music fails), Gate 4 (the witness on the clip) and
  Gate 5 (the brief, decided by code from the reconciler's answer). The first accepted take is
  the shot's (D-030).
- **At the cap**: after three failed takes, a shot that has a chosen picture and claims no `event`
  mustShow is **held** on that picture — the media port probes the picture, a `degraded` event is
  appended, and the stage goes on (D-055, S-097, S-098); the held shot is a slow push on the still
  in the cut. A shot with no picture, or one that must show an event, cannot be held: the reel
  stops for the rule of the third take's lowest failing gate.

The stage ends with `kind: 'completed' | 'stopped-rule' | 'stopped-budget' | 'failed'`. Once
every shot is done, a `gate-5` stop happens if a `mustShow` that no sentence claims was shown by
no accepted take (a held shot's failed takes show nothing — S-072, S-090).

The runner ends the stage:

- `kind: 'completed'` → `advanceClips` (writes held labels, events, marks the clips job done,
  enqueues `reel.assemble`).
- `kind: 'stopped-*' | 'failed'` → `finishVideo` with the corresponding result.

## Step 6 — The render stage

**File**: `apps/worker/src/assemble-job.ts`. **Pipeline**: `packages/pipeline/src/render/index.ts`.

`reel.assemble` exists only for a `video` run whose clips stage completed (S-069). It is the
last job in the run, with no `image`, `narration` or `video` port — nothing can be bought once
assembly begins (I-18, S-069).

1. `startStage(db, runId, 'video')`.
2. Build the `RenderManifest` from the run's rows (`renderManifest`, `packages/pipeline/src/render/manifest.ts`).
3. Call `startRender` to write the render row with the manifest and its hash.
4. Call `cutReel` with the manifest and the media + model ports.

`cutReel` runs **one pass**:

1. `ports.assembler.assemble(manifest)` → `AssembledFile` (an `.mp4`).
2. `ports.media.probe(...)` → `MediaProbe`. If the file differs from the manifest's profile
   (codec, geometry, fps, sample rate, channels, frame count, moov-first), the stage fails
   `kind: 'failed', failure: 'engine'` — the assembler broke its own input.
3. `ports.media.frames(...)` → three frames per shot (first, middle, last).
4. `gate7` sends one `judgeCut` call (role judge) with each shot's three frames and sentences
   and the four closed questions: _Are the shots in a sensible order? Does the pacing work? Does
   every shot sit well beside the shot that follows it? Do the burned captions follow the
   narration?_ If any answer is no, the stage stops `kind: 'stopped-rule', rule: 'gate-7'`.
5. `kind: 'completed'` otherwise.

The runner ends the stage through `finishVideo` with the render row's outputs and the held
shots' four labels (S-058, S-073).

## Step 7 — Reading the result

Once the run is finished, the caller can read:

- `GET /v1/runs/:runId` → `RunStatus` (the same for any run, finished or running).
- `GET /v1/runs?requestId=…` → the **newest** run for the request, including a resumed run.
- `GET /v1/runs/:runId/events?since=N` → the event log, paginated. `seq` is per-run and
  monotonic; `since` is the last `seq` the caller has.
- `GET /v1/runs/:runId/result` → the `RunResult` (200) or the `RunStatus` (409 if the run is
  still active — the contract's defined refusal).
- `GET /v1/runs/:runId/record` → the `RunRecord`: every picture made (in seq order) and every
  take made, each with the checks it reached, and every degradation (S-046). Receipts are not in
  it; they stay in the receipt tables. In a resumed run, every picture and take copied into it names the run
  it came from (S-162).
- `POST /v1/runs/:runId/cancel` → set the cancel flag. The run is cancelled at the next
  `startStage` check (the cancel is read inside one transaction with `stage.started`).

## What you can do during a run

- **Follow events** with `GET /v1/runs/:runId/events?since=N`. Every stage writes events as it
  goes. The full event types are in `packages/reel-contract/src/events.ts`.
- **Cancel** with `POST /v1/runs/:runId/cancel`. The cancel flag is honoured at the next
  `startStage`; mid-stage work continues to its next transaction.
- **Inspect** what model calls have happened so far by reading the `model_receipt` table
  directly (`scripts/decisions.mjs --print-style` does not — there is no such helper; use
  `sqlite3 data/cutroom.sqlite` or any Drizzle reader).
- **Restart an interrupted job**: nothing to do. The lease expires, the job is re-claimed, and
  the runner runs again from the start. The `attempts` column increments (S-027).

## What happens on failure

Every transaction that fails a run writes its `run.failure` kind (S-163):

- `unavailable`, `unreadable`, `provider-failed`, `crashed` → resumable. The engine resumes the
  run automatically when the worker's switch is on (it is, in the service — see
  `08-resume-of-failed-runs.md`), and a caller may resume it.
- `off-spec` (the provider made something this engine can never use) and `engine` (our own
  fault) → never resumed: the same request would fail the same way.

The failed `RunResult` does **not** carry the failure kind — that lives in `run.failure`, so a
caller reads the result unchanged (S-157).
