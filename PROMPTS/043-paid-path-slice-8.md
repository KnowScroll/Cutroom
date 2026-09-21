# 043 — paid-path: Slice 8

- **For:** session 43
- **Feature:** `paid-path` — [`docs/features/paid-path.md`](../docs/features/paid-path.md)
- **Work:** Slice 8 of 8 — the real reel, and the journeys; checks 20 and 22
- **Written:** 2026-09-21, at the end of session 42, after Slice 7 was green and S-126 was recorded
- **Run:** not yet

**This is the one slice that SPENDS.** It cannot start until the owner has answered the two things named in the
block below: **fal credit**, which D-007 excludes from the MiniMax token plan, and the **ceiling** the hand-run reel
is bounded by. Neither is a gap in the plan; each is a fact the owner supplies (S-110).

Paste everything inside the block below as the session's first message.

```text
Build paid-path's Slice 8 — scripts/real-reel.mjs, ONE REAL REEL made under its ceiling, checks 20 and 22, and
then six journeys. It is the LAST slice of paid-path and the first thing in this repository's history that spends
money.

BEFORE ANY REAL CALL, TWO THINGS MUST BE TRUE, and if either is not, say so and stop rather than deciding for
yourself:
1. fal credit exists on the account whose FAL_KEY this machine holds. D-007 hard-locks the H3 video path and
   EXCLUDES it from the owner's MiniMax token plan, so H3 and flux are bought with money and MiniMax text and T2A
   are not. This has been owed by the owner since session 36 and is named in docs/features/paid-path.md under
   Pending human decisions.
2. THE CEILING THE RUN IS BOUNDED BY is a figure the owner states. S-110 says the first real reel is ONE reel under
   the $3.00 per-reel cap, made as cheap as the decisions allow. The estimate this engine will make is readable
   before anything is bought — a stills run at the configured flux entry estimates 4 x 7.5¢ = 30¢ (S-124), and a
   video run adds eighteen clips at H3 Turbo's rate (S-125) — so print the estimate FIRST, show it to the owner
   with the ceiling, and only then submit. A run whose estimate is above the ceiling is refused at admission and
   nothing is bought, which is the mechanism working, not an obstacle.

Start:
1. Run `node scripts/decisions.mjs`. If it says commits are unpushed in the steering repository, say so and stop.
2. Read CLAUDE.md; then JOURNAL.md's sessions 36 to 42 entries in full — Slices 1 to 7 built apps/service and the
   five real adapters, and session 42 added the FIFTH model call for Gate 1's text step (S-126).
3. Read docs/features/paid-path.md whole, and especially checks 20 and 22, Gate 4's Slice 8 line, the Outcome list,
   and Pending human decisions.
4. Decisions, each read whole, in DECISIONS.md: S-110 (one reel, under the cap, as cheap as the decisions allow —
   read every word), S-111 (recorded wire in the suite, ONE hand-run reel outside it, and why no test may ever call
   a provider), S-115 (sequential, and the latency measurement parallel-shots cannot be planned without), S-028
   (the PATH-alone child check 22 copies), S-099 (the form of re-running a verified feature's journey), S-124 and
   S-125 (the two rates, and the two figures owed upstream), S-126 (the fifth call, and the two verified checks
   amended by addition — both journeys re-run here because of it). In steering-ref/steering/DECISIONS.md: D-007,
   D-019, D-022, D-028, D-086.

What Slice 8 builds:
- `scripts/real-reel.mjs` — run BY HAND and by nothing else. It starts the engine with the real adapters named
  (S-108), submits ONE request, prints the estimate before it submits, prints what it spent when it finishes, and
  is named by no test file and no step of check.mjs (check 20).
- tests/paid-path-real-reel.test.ts (20) and tests/paid-path-secrets.test.ts's check 22 — S-028's form: every other
  test of this feature passing in a child whose environment holds only PATH and what the operating system needs to
  start Node, with the probe, the canary, the allowed names and the roll call of checks 1 to 21 passing with 22 not
  run. RED FIRST.
- THE REEL ITSELF, made once, by hand. Write into JOURNAL.md: the reel's own receipts, the provider's dashboard
  figures beside them, the difference, WHETHER A FAILED CALL BILLS (Gate 2 says this is read, never assumed), the
  MEASURED LATENCY of the whole run and of one clip (S-115 — parallel-shots cannot be planned without it), and
  whether D-019's 768x1344 margin against reel-render's 0.01 aspectTolerance held on a real clip (session 41
  measured it at 0.0011).
- The two figures owed upstream, restated with what this run observed: the video rate (D-007's Q9) and the
  corrected image rate, 7.5¢ a derived flux call at 864x1536. They are NOT edited into BUDGET.md here (D-115,
  S-017); they are owed to the steering repository and named in the journal.

Then the journeys, and only after the last slice is committed (S-016):
- `node scripts/journey.mjs paid-path`, then `reel-stills`, `reel-plan`, `reel-render`, `reel-takes` and
  `reel-contract` again (S-099's form): the rule count moved in Slice 2, and `reel-plan`'s and `reel-render`'s
  check 3 moved in Slice 7. Never type the evidence, the status or the divergence by hand. A FAIL is the finding:
  stop and report.
- KNOWN FRAGILITY, recorded in session 41 and not yet resolved: reel-render's check 50 runs the whole reel-render
  journey four files at a time with a 300 s bound (S-107). Measured ALONE it takes 97 s; inside a loaded suite it
  was killed at 300 s once. If it fails, run it alone before concluding anything, and do NOT raise the bound —
  that would be a fourth change to a verified feature, which this feature's own "What this feature changes in
  verified features" says will not happen.

How to work:
- Never weaken a check or a test to reach green. If an assertion cannot hold as written, that is a finding to put
  to the owner with AskUserQuestion, as sessions 36 to 42 did.
- No test calls a provider, no test needs a key, and no npm dependency is added (S-111, S-114). The real reel is
  made by the hand-run script, outside tests/, and never by check.mjs or a journey.
- No absolute path anywhere (D-086). Nothing that spends runs twice by accident: print, confirm, then submit.
- Once green, run a break campaign as sessions 30 to 42 did — the runner in .tmp/campaign/ (move session 42's
  breaks.mjs and results.jsonl aside to s42/ first). Break at least: the real-reel script named by a test; the
  script named by a step of check.mjs; the PATH-alone child given something besides PATH; the roll call reduced to
  fewer checks than pass; a default that is not 'fake'; and the estimate printed after the submit rather than
  before. Add a control caught by nothing. Record what each break was caught by, and fix — by ADDING — any break
  caught by nothing that a check's words promise to catch. Run the campaign inside one turn.
- Tick Slice 8 and the four Outcome lines in docs/features/paid-path.md only when checks 20 and 22 pass by number
  and check, check.mjs is green, and the real reel exists.

Do NOT in this slice: build lease renewal; make anything concurrent (S-115); plan parallel-shots — this slice
MEASURES what that feature needs and stops there; edit BUDGET.md or any steering document (D-115, S-017).

Finish:
- `node scripts/check.mjs` green, with the new test count stated by a TAP count, and SIX journeys PASS.
- A JOURNAL.md entry: intent; what changed (files, S-entries, +N tests); observed — what was red first and why, the
  break campaign's table, the REAL REEL's receipts against the dashboard, the latency, and anything caught by
  nothing and what was done; next.
- Set this prompt's Run line to session 43 in PROMPTS/043-paid-path-slice-8.md and in PROMPTS/README.md (S-065),
  and write PROMPTS/044 for whatever the owner chooses next — `parallel-shots` is the feature S-115 defers to, and
  it cannot be planned until this slice's latency figure exists.
```
