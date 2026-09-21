# 038 — paid-path: Slice 3

- **For:** session 38
- **Feature:** `paid-path` — [`docs/features/paid-path.md`](../docs/features/paid-path.md)
- **Work:** Slice 3 of 8 — the model adapter; checks 3, 6, 7 and 8
- **Written:** 2026-09-20, at the end of session 37, after Slice 2 was green and S-119 and S-120 were recorded
- **Run:** session 38

Paste everything inside the block below as the session's first message.

```text
Build paid-path's Slice 3 — the MiniMax model adapter, the FIRST REAL ADAPTER this engine has ever had. It proves
checks 3, 6, 7 and 8 of docs/features/paid-path.md. Check 3 is here rather than in Slice 2 because a stand-in reads
no key, so it had no teeth until an adapter existed (S-120).

NOTHING IN THIS SLICE SPENDS MONEY AND NO TEST NEEDS A KEY. Every test runs against recorded wire (S-111); every
default stays 'fake' (S-108); reel-takes' check 26 and reel-render's check 50 keep their exact form and stay green.

Start:
1. Run `node scripts/decisions.mjs`. If it says commits are unpushed in the steering repository, say so and stop.
2. Read CLAUDE.md; then JOURNAL.md's sessions 36 and 37 entries in full — Slice 1 built apps/service and
   packages/providers/src/env.ts, Slice 2 built the twentieth rule in two halves and the recorded-wire harness.
3. Read docs/features/paid-path.md whole, and especially Gate 2's "The five adapters, and the wire each one speaks",
   "What is transient, and what is a fault", and checks 3, 6, 7 and 8.
4. Decisions, each read whole, in DECISIONS.md: S-114 (no model SDK — fetch and zod, superseding D-005 for this
   engine), S-111 (recorded wire in the suite, one hand-run reel outside it), S-109 (keys from the environment, read
   only in providers), S-119 (the twentieth rule's two halves — the scan reads source, so nothing you write may read
   a key outside packages/providers/src), S-108 (one setting per port), S-096 (transient versus fault, and the retry
   counter that already exists), S-021 and S-038 (the worker is handed its ports). In steering-ref/steering/
   DECISIONS.md: D-006 (the role-to-model routing table), D-019 (the structured answer and what a spike found),
   D-022 (what a provider hands back is a credential), D-084 (the model client lives in providers).
5. Read the code this slice changes: packages/providers/src/ports.ts (modelPort, which refuses today),
   packages/providers/src/fake/model.ts (the stand-in whose contract the real one must meet),
   packages/providers/src/env.ts, tests/engine/wire.ts and tests/fixtures/wire/*.json (the harness Slice 2 built),
   apps/service/src/settings.ts and service.ts, and the LanguageModelPort in packages/contracts.

What Slice 3 builds:
- `packages/providers/src/minimax/model.ts` — the real LanguageModelPort, over `/v1`, with `fetch` and `zod` and NO
  NEW NPM DEPENDENCY (S-114). D-006's routing read from settings; the <think> block parsed as the answer after it; a
  call consumed entirely by reasoning failing by NAMING THE TOKEN BUDGET, not the schema; every receipt carrying the
  model id, the tokens and `fake: false`; a vision call carrying its picture or clip the way the wire expects.
- The transient classification (S-096): 429, 5xx, a connection error and a poll timeout answered `unavailable` with a
  detail; 400, 401 and an unparseable body thrown. The adapter only CLASSIFIES — the sending, the backoff and the
  counter are the guarded port's, already built and verified.
- The transport: every real adapter takes a `fetch` and a base URL, each a setting defaulting to the provider's own
  (Gate 2, finding 3 of the gate review). That is what lets a recorded response be served without a network.
- `modelPort('minimax', …)` stops refusing and builds it. Its key still comes from env.ts and nowhere else.
- The fixtures checks 6, 7 and 8 need, under tests/fixtures/wire/, each REDACTED BEFORE IT IS COMMITTED — check 21
  reads them all and the names are `<provider>-<call>-<case>.json` with no dashes inside a part.
- tests/paid-path-model.test.ts (6, 7, 8) and tests/paid-path-secrets.test.ts (3) — red first.

How to work:
- CHECK 3 NEEDS A DECISION AND IT IS A REAL ONE: it asks for a COMPLETED RUN, through the service as a process, with
  a real adapter reading a key from the environment file — and then that no row, receipt, event, question, log line
  or fault holds the key. A recorded `fetch` lives inside the test process, not inside the service's. Decide HOW the
  service's real adapter is served recorded wire — a loopback HTTP server the test starts and points the base-URL
  setting at is the obvious shape, and loopback is already what D-098 allows — and whether the run is completed with
  every other port a stand-in. Write it as an S-entry with what was rejected. The next free number is S-121.
- Never weaken a check or a test to reach green. If an assertion cannot hold as written, that is a finding to put to
  the owner with AskUserQuestion, as sessions 36 and 37 did — not something to re-aim quietly.
- No test calls a provider, no test needs a key, and no npm dependency is added (S-111, S-114).
- Nothing outside packages/providers/src may read a key — `node scripts/drift.mjs` now reads the source for that
  (S-119), so a test that reaches for `process.env.MINIMAX_API_KEY` fails the boundaries check.
- No absolute path anywhere (D-086).
- Once green, run a break campaign as sessions 30 to 37 did — the runner in .tmp/campaign/ (move session 37's
  breaks.mjs and results.jsonl aside to s37/ first). Break at least: the key sent in no header; the key written into
  a receipt, a row and a fault message; the <think> block kept in the answer; a reasoning-exhausted call reported as
  a schema failure; the routing table hardcoded; 429 thrown instead of answered unavailable; 400 answered unavailable
  instead of thrown; `fake` left true on a real receipt. Add a control caught by nothing. Record what each break was
  caught by, and fix — by ADDING — any break caught by nothing that a check's words promise to catch. Run the
  campaign inside one turn.
- Tick Slice 3 in docs/features/paid-path.md only when checks 3, 6, 7 and 8 pass by number and check.mjs is green.

Do NOT in this slice: build the narration, image, video or sensor adapters (Slices 4 to 7); write
scripts/real-reel.mjs; make anything concurrent (S-115); run any journey — paid-path's is Slice 8's, and the
re-runs of the five verified features' journeys are Slice 8's too (S-099's form).

Finish:
- `node scripts/check.mjs` green, with the new test count stated by a TAP count. NO journey.
- A JOURNAL.md entry: intent; what changed (files, S-entries, +N tests); observed — what was red first and why, the
  break campaign's table with what each break was caught by, anything caught by nothing and what was done; next.
- Set this prompt's Run line to session 38 in PROMPTS/038-paid-path-slice-3.md and in PROMPTS/README.md (S-065), and
  write PROMPTS/039 for Slice 4.
```
