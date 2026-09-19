# 028 — reel-render: Slice 6

- **For:** session 28
- **Feature:** `reel-render` — [`docs/features/reel-render.md`](../docs/features/reel-render.md)
- **Work:** Slice 6 of 6 — restart, no secrets, and the journeys; checks 48–50, tests first; then 1–47 again and four
  journeys
- **Written:** 2026-09-19, in session 27, after `reel-render`'s Slice 5 was committed (8ffcee6)
- **Run:** not yet

Paste everything inside the block below as the session's first message.

```text
Build reel-render's Slice 6 — restart, no secrets, and the journeys — the last of its six slices. It proves checks 48,
49 and 50 of docs/features/reel-render.md, re-runs 1 to 47, and then runs the reel-render journey and the reel-stills,
reel-plan and reel-contract journeys again (S-077). Tests first: write each check's test, watch it fail for the reason
it exists, then write the code. Several clauses of 48 and 49 may be green before any code — the lease reclaim (S-027),
ids carrying the attempt, stage.started written once, the chain's spend read before every call and a render id per
attempt all exist already: say which were green, and show each can fail by its breaks.

Start:
1. Run `node scripts/decisions.mjs`. If it says commits are unpushed in the steering repository, say so and stop.
2. Read CLAUDE.md; then JOURNAL.md's session 27 entry in full (Slice 5: the guards, S-087 and S-088, checks 42 to 47,
   ninety breaks — and what it carried: S-081's clips-job cost checked only at a budget stop; a last shot's overspent
   clip completing over its limit; the campaign's runner faults, a machine sleep and a flake under memory pressure),
   session 25's (readRenderInputs choosing the latest clips attempt, named as check 48's; worker-process.ts left
   unchanged because a function cannot cross its JSON; the render row written before the assembler is called),
   session 23's (break 19e, a take id not carrying the attempt, owed to check 48; the system stopping a campaign for
   low memory), and session 19's (reel-stills' Slice 5: killedMidStills and takenUp, S-062's hold at a witness call,
   S-063, the PATH-alone child, and its three journeys — an untracked file at the root made journey.mjs refuse).
3. Read docs/features/reel-render.md: Gate 2's "Cancel, and a restart", "The chain", "How a video run ends",
   "Spending" and "Media files"; Gate 3's paragraph opening the checks (one journey, counting
   tests/reel-render-*.test.ts, S-016) and checks 48 to 50 — and 11, 19, 29, 30, 36, 39 and 40, whose clauses a
   restart touches; Gate 4's Slice 6. The Status line, Evidence and Divergence are the journey's, never typed by hand.
4. Decisions. In DECISIONS.md: S-076 above all (a clips job run again starts over and pays again; an assemble job run
   again renders again and buys nothing); S-027, S-048, S-055, S-062 and S-063 (the stills restart and its checks'
   form); S-028 (the PATH-alone child and the eleven variables Windows adds); S-016 and S-047 (the journeys, and
   re-running verified ones); S-069, S-073, S-075, S-077, S-081, S-085, S-087 and S-088. In
   steering-ref/steering/DECISIONS.md: D-002, D-081, D-086 and D-087.
5. Read the code and the tests Slice 6 touches or copies: tests/engine/worker-process.ts (the child worker: holdAtCall
   counted over every model call, the planner's included; its scripts handed as JSON); tests/engine/restart.ts
   (killedMidStills and takenUp — stills-shaped: they assert the keyframes job's row, wait 60 s and read with
   readStills); tests/engine/harness.ts (spawnWorker, restart, the child's leaseMs); tests/engine/video.ts and
   render.ts; tests/reel-stills-restart.test.ts, reel-stills-restart-reserve.test.ts and reel-stills-secrets.test.ts
   (the patterns for 48, 49 and 50) and reel-plan-restart.test.ts; apps/worker/src/clips-job.ts and assemble-job.ts;
   packages/domain/src (queue.ts — claimJob and the lease; runs.ts — startStage, startRender, finishVideo; clips.ts —
   readRenderInputs' `max(take.attempt)`; pictures.ts — readRecord's latest render); scripts/journey.mjs.
6. Baseline: `node scripts/check.mjs` green, 284 tests by a TAP count (this prompt's commit). Then run
   `ffmpeg -version` and `ffprobe -version`: 8.1.1 on PATH on 2026-09-19. If either does not run, say so and stop.

What Slice 6 builds (Gate 4):
- Check 48 — a worker killed mid-clips and a new one started: the run completes; stage.started for video appears once;
  the first attempt's narrations and takes are in the tables under attempt-1 ids with the gates they reached and no
  outcome where one was cut off; their receipts and cost are kept; no picture is made again; and when the first
  attempt's scripted cost leaves the second attempt's next call above the ceiling, the run stops for budget — the
  guard reading an earlier attempt's spend.
- Check 49 — a worker killed at Gate 7 and a new one started: the run completes with a second render row and file, the
  first kept, no narration, video or image receipt added, and the result's video at the second render's path.
- Check 50 — every other reel-render test passing in a child whose environment holds only PATH and what the operating
  system needs to start Node (S-028), the restart checks' own worker processes included.
- Anything 48 to 50 find failing where it should not — fixed by adding, never by loosening.
- Test support, no assertion: video-shaped restart helpers beside the stills ones (the clips or assemble job's row, its
  second claim no earlier than the first lease ran out, readVideo, a video run's wait), and whatever worker-process.ts
  lacks to hold a clips-stage or Gate 7 call.
- Then 1 to 47 again, by check.mjs and inside check 50's child; then the journeys.

How to work:
- Red first, per check, and write down what each red said. A change that is test support only cannot be red: say
  which.
- A workable order: 48's completed restart; 48's budget stop across attempts; 49; 50; check.mjs; the campaign; then
  commit the slice and run the journeys. If it becomes clear the slice will not fit in this session, stop at a green
  state and ask the owner with AskUserQuestion — do not tick the slice, commit it as done, or cut it yourself.
- Look for collisions while reading, before writing a test. Points checked on 2026-09-19, each worth a look:
  - holdAtCall counts every model call from 1. By my count, for THREE_RANKS with default sensors: the planner's 2, the
    stills stage's 8 (four pictures, a witness and a reconcile each, no compare), then each take's witness and
    reconcile — take k's witness is call 11 + 2k, and Gate 7's judgeCut call 23. Hold a witness call so a take is cut
    off inside its gates, as S-062 does, and assert what was made from the receipts before the kill, never the count.
  - the child is handed the engine's video, narration and media scripts as JSON. A cost keyed by a whole take id —
    `a1-shot-1-take-1` — lands on the first attempt alone, since entryFor looks the whole id up first: how 48's budget
    clause gives only the first attempt a cost (S-062's form). No wrapper crosses JSON.
  - restart.ts' helpers are the stills stage's: LEASE_MS 1 s, FINISH_MS 60 s, while a video run is given 90 s
    (VIDEO_FINISH_MS). New helpers beside them are test support; a verified check's helper need not change.
  - a clips attempt cut off leaves takes with the gates they reached and no outcome. readRenderInputs builds the
    manifest from `max(take.attempt)`'s takes and narrations; the ledger sums every attempt's receipts; only the
    finishing attempt's verdicts become events (S-069, S-076).
  - check 49's first render row: startRender writes it before the assembler, and only finishVideo sets its path and
    finish — which the first worker, killed at judgeCut, never reaches. Its file is on disk at
    <root>/<runId>/a1-render.mp4 beside a row whose path is null. Say how "the first kept" is read before deciding.
  - check 40 compares every receipt's time with the FIRST render row's start: after 49's restart it must still hold.
    The second attempt's judgeCut receipt is a model receipt, not a paid one.
  - check 50's child runs every other tests/reel-render-*.test.ts file — about thirty, many encoding with ffmpeg, 48 and
    49 with child workers of their own — inside one test, beside the whole suite. reel-stills' check 50 gives its child
    spawnSync's 300 s: measure reel-render's, bound the child's concurrency if memory needs it, and say where a longer
    wait is test support, not a weakened check. On 2026-09-19 an editor held about 4 GB and 678 MB of 16 GB were free.
  - S-081: a clips-job ending's job cost is read only at a budget stop, by check 42. Say so again unless a Slice 6
    check's words promise more — 48's "their receipts and cost are kept" is about the first attempt's.
  If building finds a verified check or a gate that cannot hold as written, STOP on that point: record it, and ask the
  owner with AskUserQuestion, a recommended option first, rather than weakening a check or editing an approved gate.
  Nothing about the approved Gates: line changes.
- A choice between real alternatives the gates leave open — which call is held, how "the first kept" is read, the
  child's bound — is recorded as an S-entry only if it is a real choice with a rejected option and a way it is caught.
  The next free number is S-089.
- Once green, run a break campaign as sessions 19 and 21 to 27 did, from session 27's runner in .tmp/campaign/
  (ignored; move its files aside first): each file's bytes (fsync'd) saved to a record before touching it, restored
  from those bytes and read back; every modified and untracked file fingerprinted after each restore; a refusal to
  start while a record exists; every find checked to occur once before a chunk starts. Carried lessons: the built-in
  TAP reporter, the counts required; always --test-timeout; BOUND THE MEMORY FROM THE START with --test-concurrency; a
  break's text must still parse — `Math.ceil(` replaced by `(` left a trailing comma and loaded nothing; a run whose
  counts fall short of the suite's, or whose failures name files rather than checks, is a runner fault or a sleep —
  run it again; keep the machine awake. Check 50 re-runs everything inside each break, so narrow each break's tests —
  48's and 49's files for their breaks, 50's for its own — and say which. After each chunk confirm no record is left
  and .artifacts/ is empty. Break each rule of each check at least once — a take id not carrying the attempt (19e);
  stage.started written on every attempt; the first attempt's rows or receipts removed, or overwritten by the
  second's; an outcome written for a cut-off take; a claim resetting the job's cost; the guard reading only this
  attempt's spend; the keyframes job run again; the manifest built from the first attempt's takes, or from both; a
  render id not carrying the attempt; the second render written over the first's file or row; a receipt added by the
  assemble job; the result's video at the first render's path; the child handed process.env, or its own file, or one
  file left out; the roll call stopping short — plus a control that should be caught by nothing. Record what each
  break was caught by, fix by ADDING any break caught by nothing that a check's words promise to catch. Run the
  campaign inside one turn: the stop-gate runs check.mjs --code when a turn ends, so never end a turn with a break
  applied — wait on each background chunk with a foreground waiter under ten minutes whose end condition is the
  runner's own completion line.
- Tick Slice 6 in docs/features/reel-render.md only when checks 48 to 50 pass by number and check.mjs is green, and
  commit the slice. Then, on a clean tree, `node scripts/journey.mjs reel-render`; then reel-stills, reel-plan and
  reel-contract again (S-077). A journey writes its own evidence and status and never commits, and journey.mjs refuses
  a dirty tree: commit each journey's result on its own before the next. A FAIL is the finding — stop and report; never
  edit what a journey wrote.

Traps, each already paid for:
- A heredoc or `node -e` text holding backticks, apostrophes or backslashes can end early, run nothing, or arrive with
  `\n` turned into a real newline — session 27's rerun list did. Write such text with the editing tool, and check it.
- Shell tooling halves backslashes, and sed/grep in Git Bash strip `\r`. Verify a file's bytes, not the command typed.
- Start a tool with an argument array, never a shell string. A Windows path INSIDE a filtergraph needs its `:` and `\`
  escaped; one given as an input or output argument does not.
- `@cutroom/domain` does not resolve from tests/; a test importing it uses the package's src/index.ts by relative path.
- A held call that never arrives hangs its file until the timeout: fail once the run finishes first, as whenHeld does,
  and kill a child worker in `finally`.
- The questions file is created on the first write: a test reads the harness's questionsPath, never a root QUESTIONS.md.
- Leave no untracked file at the repository root; journey.mjs refuses a dirty tree.

Out of scope: reel-takes (D-024's takes, I-11's retry counter, D-025's ladder) and video-edits, both with every gate
pending; S-081's clips-job ending cost beyond what a Slice 6 check's words promise; a last shot's overspent clip
(S-087's Not handled); break 34d, a level no check names (deferred item 15); renderManifest's unread `request`; the
stand-in's receipt count (S-088); the steering stubs and the pin (S-033); reel-script's criterion type (S-029);
KnowScroll's check of a returned video (S-068) and serving the file (S-073).

Finish:
- `node scripts/check.mjs` green, with the new test count stated; each journey's result as the script wrote it.
- A JOURNAL.md entry: intent; what changed (files, S-entries, test support, +N tests); observed — each red and what it
  said, which clauses were green first, what was measured rather than assumed, the break campaign's table with what
  each was caught by, anything caught by nothing and what was done, any collision with a verified feature, each
  journey's PASS or FAIL at its commit; next (reel-render verified, or the finding that stopped it; then which of
  reel-takes and video-edits comes first is the owner's call).
- Set this prompt's Run line to session 28 in PROMPTS/028-reel-render-slice-6.md and in PROMPTS/README.md (S-065).
- Commit the slice as `feat(reel-render): Slice 6 — restart, no secrets, and the journeys`, and each journey's result
  in a commit of its own.
- If the owner asks for the next session's prompt, write it in PROMPTS/ as S-065 says.
```
