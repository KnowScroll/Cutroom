# 022 — reel-render: Slice 2

- **For:** session 22
- **Feature:** `reel-render` — [`docs/features/reel-render.md`](../docs/features/reel-render.md)
- **Work:** Slice 2 of 6 — asking for a video, and the chain; checks 7–10, tests first; no journey
- **Written:** 2026-09-17, at the end of session 21, after `reel-render`'s Slice 1 was committed (603ea36)
- **Run:** session 22

Paste everything inside the block below as the session's first message.

```text
Build reel-render's Slice 2 — asking for a video, and the chain — and nothing from Slice 3 or later. It proves checks 7,
8, 9 and 10 of docs/features/reel-render.md. Tests first: write each check's test, watch it fail for the reason it
exists, then write the code. reel-render has six slices; this is the second, and no journey runs until Slice 6.

Start:
1. Run `node scripts/decisions.mjs`. If it says commits are unpushed in the steering repository, say so and stop.
2. Read CLAUDE.md; then JOURNAL.md's session 21 entry in full (Slice 1: two collisions found before any code, S-078
   and S-079, a break a check's words promised caught by nothing, and the campaign runner's traps), and session 16's
   (reel-stills' Slice 2: the same kind of slice — a refusal narrowed, an admission, a second job row, verified checks
   that changed — and S-051's note that no Slice 2 check read the stage argument).
3. Read docs/features/reel-render.md: Gate 2's "What a request becomes", "Admission", "The chain", "How a video run
   ends", "Cancel, and a restart" and "What this feature changes in verified features"; Gate 3's signatures for
   admitVideo, CLIPS_JOB, advanceStills and WorkerOptions, and checks 7–11; Gate 4's Slice 2, and Slice 3 so you know
   what is NOT yours: no narration, no clip, no ffmpeg, no stand-in video or narration port, no migration 0003, no port
   required on the worker, no reel.assemble row, no ASSEMBLE_JOB. A started clips job that is not cancelled finishes the
   run failed with the detail "clips are not built" — a contract-valid answer no check asserts, which Slice 3 replaces.
   Check 11 (a cancel before the clips job) is Slice 3's even though Slice 2 builds the clips job's startStage.
4. Decisions. In DECISIONS.md: S-069 in full, S-077 and S-078, and S-025, S-026, S-027, S-030, S-035, S-046, S-047,
   S-051, S-052, S-055, S-058, S-059. In steering-ref/steering/DECISIONS.md: D-047, D-081, D-083, D-100, D-108, D-110.
5. Read the real code Slice 2 touches: apps/api/src/server.ts (the two "not built yet" refusals); apps/worker/src
   (plan-job.ts' admission, keyframes-job.ts' endings, worker.ts' claim loop and job kinds); packages/domain/src
   (runs.ts: PLAN_JOB, KEYFRAMES_JOB, admitStills, finishRun, finishStills, startStage; queue.ts; index.ts);
   packages/pipeline/src/admit.ts (admitPictures) and index.ts; and the tests that assert or build what changes:
   tests/reel-plan-asking.test.ts (reel-plan's check 10), tests/reel-plan-run.test.ts and tests/reel-plan-service.test.ts
   (each sends until 'video' to get a refusal), tests/reel-stills-asking.test.ts (reel-stills' check 8),
   tests/reel-stills-admission.test.ts (check 10's second job row — the pattern for check 9's), tests/reel-stills-endings.test.ts
   (S-046's endings — the pattern for check 10), tests/engine/harness.ts, plans.ts and stills.ts.
6. Baseline: `node scripts/check.mjs` green, 196 tests (this prompt's commit).

What Slice 2 builds (Gate 4, and S-077 for the verified side):
- apps/api: until 'video' accepted with a runId; planVaryOn other than shotCount still refused 422 'unsupported'.
- packages/pipeline: admitVideo(plan, budgetCents) in admit.ts — the selected plan's estimateCents against the ceiling;
  exactly equal is admitted; the reserve is not counted and narration is not in the estimate (S-069).
- apps/worker/src/plan-job.ts: a video run whose selected plan's estimate is above its ceiling finishes refused for
  budget, limit 'ceiling', estimateCents the plan's, ceilingCents and capCents; stage.finished for plan; no question;
  one job row. At or below: admitStills, unchanged (S-052). A stills run's admission is untouched.
- packages/domain: CLIPS_JOB = 'reel.clips'; advanceStills(db, { runId, jobId, chosen, degraded, events }) — in one
  transaction the chosen flags, the degradations' four labels (S-058), the events and stage.finished for stills, the
  keyframes job done with its cost kept (S-055), and one reel.clips row with the run's correlation_id and the keyframes
  job as parent — returning that row's id. The run is not finished.
- apps/worker/src/keyframes-job.ts: a video run whose stills stage completes advances with advanceStills — also for a
  plan that places no picture; every other stills ending ends a video run exactly as a stills run's (S-046), with no
  reel.clips row. A stills run's endings are untouched.
- apps/worker: the worker claims reel.clips; the clips job settles the cancel flag and stage.started for video with
  startStage(db, runId, 'video') before every attempt (S-027, S-051) — cancelled finishes the run cancelled with
  costCents the spend — and otherwise finishes the run failed with "clips are not built".
- Verified checks that change, S-077's form, NO ASSERTION REMOVED: reel-plan's check 10 asserts video accepted, and
  keeps every assertion it made of its refusal — 422, unsupported, the requestId echoed, a detail saying not built yet,
  no runId, nothing stored — made of planVaryOn 'order'; reel-stills' check 8's video clause asserts acceptance;
  reel-plan-run.test.ts and reel-plan-service.test.ts send planVaryOn 'order' for their refusal. reel-plan.md and
  reel-stills.md each gain a note naming S-077 — outside their gates, whose text is not edited.
- The checks, in tests/reel-render-*.test.ts, each test titled with its check's number and words as Gate 3 writes them:
  7. a submit with until 'video' is accepted with a runId; and one with planVaryOn 'order' is refused 422 'unsupported',
     with its requestId, a detail saying not built yet, no runId, and no run stored;
  8. a video run whose selected plan's estimate is above its ceiling finishes refused for budget with limit 'ceiling',
     the plan's estimate as estimateCents, the ceiling and the cap; its events end stage.finished for plan,
     run.finished; it writes no question and leaves one job row; and a ceiling of exactly the estimate is admitted while
     one cent less is refused;
  9. an admitted video run whose stills stage completes has stage.finished for stills and no run.finished from it; its
     keyframes job is done with its cost kept, and one reel.clips row carries the run's correlation_id and the keyframes
     job as its parent — also for a plan that places no picture;
  10. a video run whose stills stage stops for a rule, stops for budget or fails ends exactly as a stills run does, with
      no reel.clips row.

How to work:
- Red first, per check, and write down what each red said. A test file that fails to link (a missing export) is red for
  every test in it at once: say so rather than claiming each test was red alone. Run each verified test you change red
  BEFORE the code, too — session 21 did not, and had to lean on breaks to show they could fail.
- Check 9 in this slice: once the keyframes job writes the reel.clips row, the worker claims it and the placeholder
  clips job finishes the run failed. "No run.finished from it" is about the keyframes job's own writes, so observe them
  before the clips job runs, or by which job wrote what — not by a run that happens to still be running.
- A choice between real alternatives the gates leave open — how check 9 observes the keyframes job alone, whether
  advanceStills shares code with finishStills, the placeholder's exact detail — is recorded as an S-entry only if it is
  a real choice with a rejected option and a way it is caught. The next free number is S-081.
- If building finds a verified check or a gate that cannot hold as written (session 21 found two before any code:
  S-078 and S-079), STOP on that point: record it, and ask the owner with AskUserQuestion, a recommended option first,
  rather than weakening a check or editing an approved gate. Nothing about the approved Gates: line changes. Look for
  such collisions while reading, before writing a test.
- Once green, run a break campaign as sessions 19 and 21 did: a runner in the scratchpad that saves each file's bytes
  (fsync'd) before touching it, restores from those bytes, fingerprints every modified and untracked file after each
  restore, refuses to start while a saved record exists, and — session 21's lesson — runs the suite with
  --test-timeout, since a break that makes every write throw leaves tests waiting forever. Break each rule of each
  check at least once — including video refused again, planVaryOn 'order' accepted, admission on the pictures' share
  instead of the plan's estimate, the boundary as > instead of >=, a question written at the ceiling, a second job row
  on refusal, no stage.finished for plan on refusal, advanceStills creating no row or one with the wrong parent or
  correlation_id, the keyframes job writing run.finished for a video run, its cost reset, a reel.clips row after a
  stills stop, a plan placing no picture not advancing, an until 'stills' run advancing to clips, the clips job
  unclaimed, startStage called with 'stills' from the clips job — plus a control that should be caught by nothing.
  Record what each break was caught by, and fix — by ADDING — any break caught by nothing that a check's words promise
  to catch; say which breaks are owed to a later slice's check. Run the campaign inside one turn: the stop-gate runs
  check.mjs --code when a turn ends, so never end a turn with a break applied — wait on a background chunk with a
  foreground waiter whose end condition matches the runner's own restore line, not a pattern a test title can contain.
- Tick Slice 2 in docs/features/reel-render.md only when checks 7–10 pass by number and check.mjs is green.

Traps, each already paid for:
- A heredoc or `node -e` text holding backticks or apostrophes can end early and run nothing. Write such text with the
  editing tool.
- Shell tooling halves backslashes, and sed/grep in Git Bash strip `\r`. Verify a file's bytes, not the command typed.
- TypeScript checks a fresh object literal for excess properties and a variable not at all: a type check written only
  with literals can pass on a type that refuses nothing (session 21's check 1).
- D-096 bans the field names source, sources, truthState, claimText and exposure (and reel-plan's check 5 beat and
  beats); S-073 bans a type or field named manifest or endCard.
- `@cutroom/domain` does not resolve from tests/; a test importing it uses the package's src/index.ts by relative path.
- `tar` reads `C:` as a remote host without --force-local.
- Leave no untracked file at the repository root; journey.mjs refuses a dirty tree.

Out of scope: anything from Slices 3–6; reel-takes' and video-edits' gates; the steering stubs and the pin (S-033);
reel-script's criterion type (S-029); S-074's judgeCut receipt naming its frames, which no check asserts (session 21 —
Slice 4's).

Finish:
- `node scripts/check.mjs` green, with the new test count stated.
- A JOURNAL.md entry: intent; what changed (files, S-entries, the verified checks and test support that changed, +N
  tests); observed — each red and what it said, what Slice 2 builds that no Slice 2 check asserts, the break campaign's
  table with what each was caught by, anything caught by nothing and what was done, any collision with a verified
  feature; next (Slice 3 — narration, clips and Gates 2 to 5; checks 11–28).
- Set this prompt's Run line to session 22 in PROMPTS/022-reel-render-slice-2.md and in PROMPTS/README.md (S-065).
- Commit as `feat(reel-render): Slice 2 — asking for a video, and the chain`.
- If the owner asks for Slice 3's prompt, write it in PROMPTS/ as S-065 says.
```
