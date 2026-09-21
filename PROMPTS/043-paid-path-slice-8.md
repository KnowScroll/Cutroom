# 043 — paid-path: Slice 8

- **For:** session 43
- **Feature:** `paid-path` — [`docs/features/paid-path.md`](../docs/features/paid-path.md)
- **Work:** Slice 8 of 8 — the real reel, and the journeys; checks 20 and 22
- **Written:** 2026-09-21, at the end of session 42, after Slice 7 was green and S-126 was recorded
- **Revised:** 2026-09-21, after S-127 corrected three of S-110's cheapness levers, the owner chose
  the cheapest entry for the first run, and the owner set the ceiling at **250¢**
- **Run:** not yet

**This is the one slice that SPENDS, and nothing about it is still open.** Both keys are in `.env`
(`MINIMAX_API_KEY`, `FAL_KEY`); the image entry for this run is the cheapest admitted one; the video
path is hard-locked by D-007; and **the ceiling is 250¢**.

**What the run is expected to cost**, computed from `readSettings` with every port real, on
2026-09-21 — seedream configured:

| total | image calls | estimate |
| ----- | ----------- | -------- |
| 35 s  | 2           | 147¢     |
| 35 s  | 4           | 154¢     |
| 45 s  | 2           | 187¢     |
| 45 s  | 4           | 194¢     |

**147–194¢**, against a 250¢ ceiling and BUDGET.md's 300¢ cap. **The video is about 90% of it** —
35–45 s at H3 Turbo's 4¢/s — and all four keyframes together are 14¢. The shot count does not move
the figure at all, because every shot costs the same video with or without a keyframe (I-3).
MiniMax text, vision and T2A are token-plan covered and record **zero**. On `flux-2-pro/edit` the
same range is 155–210¢; the whole difference between the two entries is 16¢.

Paste everything inside the block below as the session's first message.

```text
Build paid-path's Slice 8 — scripts/real-reel.mjs, ONE REAL REEL made under its ceiling, checks 20 and 22, and
then six journeys. It is the LAST slice of paid-path and the first thing in this repository's history that spends
money.

WHAT THE OWNER HAS ALREADY SETTLED, so do not ask any of it again:
- Both keys are in .env: MINIMAX_API_KEY (model + narration, token-plan covered) and FAL_KEY (image + video, real
  money). Never print a key, never read .env yourself to show it — the service's own refusal names the KEY NAME and
  never its value, and that is the only check you need.
- THE FIRST RUN USES THE CHEAPEST ADMITTED IMAGE ENTRY: bytedance/seedream/v5/lite/edit at 3.5c a derived call,
  named with CUTROOM_FAL_IMAGE_MODEL and NOT by moving CONFIGURED_IMAGE_SLUG (S-127). D-028 admits seedream
  conditionally — "9:16 undocumented" — so if its produced frame fails check 12's assertion, that failure IS the
  answer to what D-028 flagged: record it, then run again on fal-ai/flux-2-pro/edit and record both. The downside is
  bounded at four image calls, about 14c, with NO video spend, because the stills stage runs before any clip.
- The video path is D-007's hard-locked fal-ai/minimax-h3-turbo at 768P. There is nothing to choose.
- THE CEILING IS 250 CENTS, set by the owner on 2026-09-21: above the 147-194c estimate so a retake does not kill
  the run, below BUDGET.md's 300c per-reel cap as S-110 requires. Submit with `budgetCents: 250`. Do not ask again,
  and do not raise it mid-run — a run that would exceed it is stopped by the budget guard, and that is the guard
  working (S-059, S-095). If the estimate printed before the submit is OUTSIDE 147-194c, something moved: stop and
  report it rather than submitting.

Start:
1. Run `node scripts/decisions.mjs`. If it says commits are unpushed in the steering repository, say so and stop.
2. Read CLAUDE.md; then JOURNAL.md's sessions 36 to 42 entries in full — Slices 1 to 7 built apps/service and the
   five real adapters, and session 42 added the FIFTH model call for Gate 1's text step (S-126).
3. Read docs/features/paid-path.md whole, and especially checks 20 and 22, Gate 4's Slice 8 line, the Outcome list,
   and Pending human decisions.
4. Decisions, each read whole, in DECISIONS.md: S-127 FIRST (it supersedes three of S-110's levers and is why the
   run is shaped the way it is), then S-110, S-111 (recorded wire in the suite, ONE hand-run reel outside it, and
   why no test may ever call a provider), S-115 (sequential, and the latency measurement parallel-shots cannot be
   planned without), S-028 (the PATH-alone child check 22 copies), S-099 (the form of re-running a verified
   feature's journey), S-124, S-125, S-126. In steering-ref/steering/DECISIONS.md: D-007, D-014, D-019, D-022,
   D-026, D-028, D-063, D-086, D-100, D-111.

WHAT S-127 CORRECTED, because the run is built on it and a stale figure here spends money:
- Gate 0 requires 4 to 6 shots, EACH 5 to 15 seconds, TOTALLING 35 to 45 seconds. S-110's "5-second clips" is
  unreachable — six 5-second shots is 30 seconds and fails `shaped()`. The cheapest legal reel is 35 SECONDS however
  it is cut, and the shot count does not move the video cost at all (I-3).
- flux-2-pro is SECOND cheapest of the four admitted entries at 864x1536, not cheapest: seedream 3.5c, flux 7.5c,
  nano-banana-2 8c, nano-banana-pro 15c. S-110's "$0.03" was flux's headline first-megapixel rate, which the
  registry's own comment says does not survive our frame size.
- So the estimate is 147-194c on seedream (155-210c on flux), not S-110's $1.32. Print it BEFORE submitting and
  check it against those figures; an estimate outside the range means something moved and is a finding, not a
  number to accept.

What Slice 8 builds:
- `packages/providers/src/fal/registry.ts` — `cheapestEntry()`, computed from the same `imageRateCents` every
  estimate and receipt use, and the comment on CONFIGURED_IMAGE_SLUG corrected to stop claiming a rank it does not
  hold (S-127). A test pins which slug it answers today, so the rank cannot go stale again.
- `scripts/real-reel.mjs` — run BY HAND and by nothing else. It starts the engine with the real adapters named
  (S-108), PRINTS THE ESTIMATE AND WAITS FOR A CONFIRMATION BEFORE IT SUBMITS, submits ONE request, prints what it
  spent when it finishes, and is named by no test file and no step of check.mjs (check 20).
- tests/paid-path-real-reel.test.ts (20) and tests/paid-path-secrets.test.ts's check 22 — S-028's form: every other
  test of this feature passing in a child whose environment holds only PATH and what the operating system needs to
  start Node, with the probe, the canary, the allowed names and the roll call of checks 1 to 21 passing with 22 not
  run. RED FIRST.
- THE REEL ITSELF, made once, by hand. Write into JOURNAL.md: the reel's own receipts, the provider's dashboard
  figures beside them, the difference, WHETHER A FAILED CALL BILLS (Gate 2 says this is read, never assumed),
  WHETHER SEEDREAM'S PRODUCED FRAME PASSED the 9:16 assertion D-028 admitted it conditionally on, the MEASURED
  LATENCY of the whole run and of one clip (S-115 — parallel-shots cannot be planned without it), and whether
  D-019's 768x1344 margin against reel-render's 0.01 aspectTolerance held on a real clip (session 41 measured it at
  0.0011).
- The two figures owed upstream, restated with what this run observed: the video rate (D-007's Q9) and the
  corrected image rate. They are NOT edited into BUDGET.md here (D-115, S-017); they are owed to the steering
  repository and named in the journal.

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
- No absolute path anywhere (D-086). NOTHING THAT SPENDS RUNS TWICE BY ACCIDENT: print the estimate, confirm, then
  submit — and if a run fails partway, read what it already spent from its receipts BEFORE running anything again.
- Once green, run a break campaign as sessions 30 to 42 did — the runner in .tmp/campaign/ (move session 42's
  breaks.mjs and results.jsonl aside to s42/ first). Break at least: the real-reel script named by a test; the
  script named by a step of check.mjs; the PATH-alone child given something besides PATH; the roll call reduced to
  fewer checks than pass; a default that is not 'fake'; the estimate printed after the submit rather than before;
  and `cheapestEntry()` answering a slug that is not the cheapest at the registry's rates. Add a control caught by
  nothing. Record what each break was caught by, and fix — by ADDING — any break caught by nothing that a check's
  words promise to catch. Run the campaign inside one turn.
- Tick Slice 8 and the four Outcome lines in docs/features/paid-path.md only when checks 20 and 22 pass by number
  and check, check.mjs is green, and the real reel exists.

Do NOT in this slice: build lease renewal; make anything concurrent (S-115); plan parallel-shots — this slice
MEASURES what that feature needs and stops there; edit BUDGET.md or any steering document (D-115, S-017); move
CONFIGURED_IMAGE_SLUG, which is D-028's open default and is settled by its bake-off, not by one run's price (S-127).

Finish:
- `node scripts/check.mjs` green, with the new test count stated by a TAP count, and SIX journeys PASS.
- A JOURNAL.md entry: intent; what changed (files, S-entries, +N tests); observed — what was red first and why, the
  break campaign's table, the REAL REEL's receipts against the dashboard, whether seedream's frame passed, the
  latency, and anything caught by nothing and what was done; next.
- Set this prompt's Run line to session 43 in PROMPTS/043-paid-path-slice-8.md and in PROMPTS/README.md (S-065),
  and write PROMPTS/044 for whatever the owner chooses next. Two candidates, and the owner picks: D-028's BAKE-OFF
  (O-4 / C-8 — the same request run under each admitted entry, comparing gate pass rates and identity retention,
  which is the only thing that answers "cheapest but good"), and `parallel-shots`, which S-115 defers to and which
  cannot be planned until this slice's latency figure exists.
```
