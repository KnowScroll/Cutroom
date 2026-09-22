# 045 — paid-path: the real reel, and the journeys

- **For:** session 45
- **Feature:** `paid-path` — [`docs/features/paid-path.md`](../docs/features/paid-path.md)
- **Work:** the rest of Slice 8 — **one real reel**, then six journeys; checks 20 and 22 are already green
- **Written:** 2026-09-21, at the end of session 43
- **Run:** session 45, 2026-09-22 — the reel was made and Gate 7 refused it; S-130 to S-140

**Session 43 built every part of Slice 8 and could not make the reel; session 44 is what unblocks it.** The
engine, the script, checks 20 and 22 and the break campaign are done and committed, and
`node scripts/check.mjs` is green. What stopped the run was **the MiniMax account**, not the engine: every
generation call answers `402 insufficient balance (1008)` while `GET /v1/models` answers 200 — measured across
both wires, three hosts, five model names and both header styles. **Do not run this prompt until session 44 has
a MiniMax call answering 200.**

**So this session is short and almost entirely one command**, and everything it needs is settled:

|          |                                                                                     |
| -------- | ----------------------------------------------------------------------------------- |
| entry    | `bytedance/seedream/v5/lite/edit`, the cheapest admitted one (S-127)                |
| estimate | **147–194¢**, printed by the script from `readSettings` and confirmed on 2026-09-21 |
| ceiling  | **250¢** (S-128), typed back as `spend 250` before anything is submitted            |
| cap      | BUDGET.md's 300¢ per-reel, unchanged and checked before the ceiling (D-014, D-100)  |
| video    | D-007's hard-locked `fal-ai/minimax-h3-turbo` at 768P — nothing to choose           |

**Two things session 43 found before anything spent, both settled by the owner and already built** — read
them in `DECISIONS.md` as **S-128** before the run, because the run rests on them. No admitted image entry
could make the canonical picture at all (`image_urls` is required on three of the four edit wires, and the
canonical carries none), so an entry now carries its model's **text wire** beside its edit wire; and
`DEFAULT_RENDER_SETTINGS.voice` was still the string `'stand-in'`, which MiniMax refuses, so the voice is
now `CUTROOM_NARRATION_VOICE`.

Paste everything inside the block below as the session's first message.

```text
Finish paid-path's Slice 8: make ONE REAL REEL with scripts/real-reel.mjs, write down what it cost against what
the provider says it cost, then run six journeys. Session 43 built and committed everything else; this session
spends money and records what happened.

WHAT IS ALREADY SETTLED, so do not ask any of it again:
- Both keys are in .env. Never print a key and never read .env to show it — the service's own refusal names the
  KEY NAME and never its value, and that is the only check you need.
- The image entry for this run is bytedance/seedream/v5/lite/edit, named with CUTROOM_FAL_IMAGE_MODEL and NOT by
  moving CONFIGURED_IMAGE_SLUG (S-127). D-028 admits seedream conditionally — "9:16 undocumented" — so if its
  produced frame fails check 12's assertion, THAT FAILURE IS THE ANSWER to what D-028 flagged: record it, then run
  again on fal-ai/flux-2-pro/edit and record both. The downside is bounded at four image calls, about 14c, with NO
  video spend, because the stills stage runs before any clip.
- The voice is English_Graceful_Lady, which D-019's spike verified live.
- THE CEILING IS 250 CENTS (S-128). It is a constant in the script that --ceiling can only lower. Do not raise it
  and do not raise it mid-run — a run that would exceed it is stopped by the budget guard, and that is the guard
  working (S-059, S-095).

Start:
1. `node scripts/decisions.mjs`. If it says commits are unpushed in the steering repository, say so and stop.
2. Read CLAUDE.md; then JOURNAL.md's session 43 and 44 entries in full, which are what this session continues.
3. Read DECISIONS.md's S-128 whole, then S-127, S-111, S-110 and S-115.
4. `node scripts/check.mjs` — confirm it is green before anything spends. A red suite is a finding, not a
   reason to run the reel anyway.

THE RUN. One command, and read its output before you answer it:

  node --experimental-strip-types --no-warnings scripts/real-reel.mjs \
    --model bytedance/seedream/v5/lite/edit --voice English_Graceful_Lady

It prints the settings, the four corners of the estimate and the range, then waits. IF THE RANGE IS NOT 147-194c,
SOMETHING MOVED: stop and report it rather than confirming. If it is, type `spend 250` and let it run. It submits
ONE request, follows the events with their timings, and prints every receipt and the latency when it finishes.
A run that fails partway HAS ALREADY SPENT: read its receipts before running anything again, and never re-run
it blind.

WRITE INTO JOURNAL.md, from what the run actually produced:
- the reel's own receipts, the provider's dashboard figures beside them, and the difference;
- WHETHER A FAILED CALL BILLS (Gate 2 says this is read, never assumed);
- WHETHER SEEDREAM'S PRODUCED FRAME PASSED the 9:16 assertion D-028 admitted it conditionally on;
- the MEASURED LATENCY of the whole run and of one clip (S-115 — parallel-shots cannot be planned without it);
- whether D-019's 768x1344 margin against reel-render's 0.01 aspectTolerance held on a real clip (session 41
  measured the spike's at 0.0011);
- and the two figures owed upstream, restated with what this run observed: the video rate (D-007's Q9) and the
  corrected image rate. They are NOT edited into BUDGET.md here (D-115, S-017); they are owed to the steering
  repository and named in the journal.

THEN tick Slice 8 and the "One real reel exists" Outcome line in docs/features/paid-path.md, commit, and only
then the journeys (S-016):
- `node scripts/journey.mjs paid-path`, then `reel-stills`, `reel-plan`, `reel-render`, `reel-takes` and
  `reel-contract` again (S-099's form): the rule count moved in Slice 2, reel-plan's and reel-render's check 3
  moved in Slice 7. Never type the evidence, the status or the divergence by hand. A FAIL is the finding: stop
  and report.
- KNOWN FRAGILITY, recorded in session 41 and still unresolved: reel-render's check 50 runs the whole
  reel-render journey four files at a time with a 300 s bound (S-107). Measured ALONE it takes 97 s; inside a
  loaded suite it was killed at 300 s once. If it fails, run it alone before concluding anything, and do NOT
  raise the bound — that would be a fourth change to a verified feature, which this feature's own "What this
  feature changes in verified features" says will not happen. paid-path's own check 22 is a second PATH-alone
  child in the same suite, 52 s alone against a 360 s bound.

How to work:
- Never weaken a check or a test to reach green. If an assertion cannot hold as written, that is a finding to
  put to the owner with AskUserQuestion, as sessions 36 to 43 did.
- No test calls a provider, no test needs a key, and no npm dependency is added (S-111, S-114).
- No absolute path anywhere (D-086).
- No break campaign is owed: session 43 ran one of 38 breaks over this slice's code and closed every gap.

Finish:
- `node scripts/check.mjs` green, and SIX journeys PASS.
- A JOURNAL.md entry: intent; what changed; observed — the reel's receipts against the dashboard, whether
  seedream's frame passed, the latency, and anything that surprised you; next.
- Set this prompt's Run line to session 45 in PROMPTS/045-paid-path-real-reel.md and in PROMPTS/README.md
  (S-065), and write PROMPTS/046 for whatever the owner chooses next. Two candidates, and the owner picks:
  D-028's BAKE-OFF (O-4 / C-8 — the same request run under each admitted entry, comparing gate pass rates and
  identity retention, which is the only thing that answers "cheapest but good"), and `parallel-shots`, which
  S-115 defers to and which cannot be planned until this session's latency figure exists.
```
