# 039 — paid-path: Slice 4

- **For:** session 39
- **Feature:** `paid-path` — [`docs/features/paid-path.md`](../docs/features/paid-path.md)
- **Work:** Slice 4 of 8 — the narration adapter; checks 9 and 10
- **Written:** 2026-09-20, at the end of session 38, after Slice 3 was green and S-121 and S-122 were recorded
- **Run:** session 39

Paste everything inside the block below as the session's first message.

```text
Build paid-path's Slice 4 — the MiniMax T2A narration adapter, the SECOND real adapter. It proves checks 9 and
10 of docs/features/paid-path.md.

NOTHING IN THIS SLICE SPENDS MONEY AND NO TEST NEEDS A KEY. Every test runs against recorded wire (S-111); every
default stays 'fake' (S-108); reel-takes' check 26 and reel-render's check 50 keep their exact form and stay green.

Start:
1. Run `node scripts/decisions.mjs`. If it says commits are unpushed in the steering repository, say so and stop.
2. Read CLAUDE.md; then JOURNAL.md's sessions 36, 37 and 38 entries in full — Slice 1 built apps/service and
   packages/providers/src/env.ts, Slice 2 built the twentieth rule and the recorded-wire harness, Slice 3 built the
   first real adapter, the loopback wire server and packages/providers/src/transient.ts.
3. Read docs/features/paid-path.md whole, and especially Gate 2's "The narration" paragraph, "What is transient, and
   what is a fault", and checks 9, 10 and 21.
4. Decisions, each read whole, in DECISIONS.md: S-122 (what the model adapter sends, and the typed `Unavailable`
   every real adapter now classifies with), S-121 (how a real adapter is proven through the service as a process),
   S-114 (fetch and zod, no SDK), S-111 (recorded wire), S-109 (keys only in providers), S-096 (transient versus
   fault), S-088 and S-070 (what the narration stage needs from a voice). In steering-ref/steering/DECISIONS.md:
   D-008 (the narration decision and its unbuilt fallback), D-019 (the T2A spike: 110 KB of audio and a
   subtitle_file URL, and the token plan covering T2A), D-022 (THE PRESIGNED URL THAT LEAKED — read every word),
   D-086 and D-087 (one artifact root, files not bytes).
5. Read the code this slice changes: packages/providers/src/ports.ts (narrationPort, which refuses today),
   packages/providers/src/fake/narration.ts (the stand-in whose contract the real one must meet),
   packages/providers/src/minimax/model.ts (the adapter Slice 3 wrote — its transport, its classification and its
   receipt are the pattern to follow), packages/providers/src/transient.ts, tests/engine/wire.ts, and
   tests/fixtures/wire/minimax-t2a-redacted.json, whose note already says what check 10 has to build by hand.

What Slice 4 builds:
- `packages/providers/src/minimax/narration.ts` — the real NarrationPort over `POST /v1/t2a_v2`, `model:
  speech-2.8-hd`, `subtitle_enable: true` (D-008, D-019), with `fetch` and `zod` and NO NEW NPM DEPENDENCY. It
  writes the audio under the artifact root and returns a local path, never bytes (D-086, D-087). It FETCHES THE
  TIMINGS from `subtitle_file` AND DROPS THE URL: that field is a presigned credential belonging to MiniMax, and
  D-022 exists because it was once written into a committed file. The receipt records the text's code points as
  characters and a cost of zero, since the token plan covers T2A.
- The transport: a `fetch` and a base URL, the base URL a setting — `CUTROOM_MINIMAX_BASE_URL` already exists and
  is the same provider, so decide and record whether T2A shares it or takes its own.
- The same classification as the model adapter: `Unavailable` for 429, 5xx, a connection error and a timeout;
  a throw for 400, 401 and a body that does not parse (S-096, S-122). The subtitle fetch is a second call and
  needs its own answer to the same question.
- `narrationPort('minimax', …)` stops refusing and builds it. Its key still comes from env.ts and nowhere else.
- The fixtures checks 9 and 10 need, each REDACTED BEFORE IT IS COMMITTED (check 21 reads them all).
  CHECK 10 NEEDS A LIVE-SHAPED PRESIGNED URL AND CHECK 21 FORBIDS ONE IN A FIXTURE: session 37 found this and
  recorded the resolution — the URL is BUILT INSIDE THE TEST. Follow it; do not weaken check 21.
- tests/paid-path-narration.test.ts (9, 10) — red first.

How to work:
- Never weaken a check or a test to reach green. If an assertion cannot hold as written, that is a finding to put
  to the owner with AskUserQuestion, as sessions 36, 37 and 38 did — not something to re-aim quietly.
- No test calls a provider, no test needs a key, and no npm dependency is added (S-111, S-114).
- Nothing outside packages/providers/src may read a key — `node scripts/drift.mjs` reads the source for that.
- No absolute path anywhere (D-086).
- Once green, run a break campaign as sessions 30 to 38 did — the runner in .tmp/campaign/ (move session 38's
  breaks.mjs and results.jsonl aside to s38/ first). Break at least: the subtitle URL persisted on a receipt, a
  row and a log line; its query string kept while the host is dropped; subtitle_enable dropped from the request;
  the audio written outside the artifact root; the audio returned as bytes; the characters counted in UTF-16 code
  units rather than code points; the cost recorded as something other than zero; 429 on the subtitle fetch thrown
  instead of answered unavailable. Add a control caught by nothing. Record what each break was caught by, and fix
  — by ADDING — any break caught by nothing that a check's words promise to catch. Run the campaign inside one turn.
- Tick Slice 4 in docs/features/paid-path.md only when checks 9 and 10 pass by number and check.mjs is green.

Do NOT in this slice: build the image, video or sensor adapters (Slices 5 to 7); write scripts/real-reel.mjs;
make anything concurrent (S-115); run any journey — paid-path's is Slice 8's, and the re-runs of the five
verified features' journeys are Slice 8's too (S-099's form).

Finish:
- `node scripts/check.mjs` green, with the new test count stated by a TAP count. NO journey.
- A JOURNAL.md entry: intent; what changed (files, S-entries, +N tests); observed — what was red first and why, the
  break campaign's table with what each break was caught by, anything caught by nothing and what was done; next.
- Set this prompt's Run line to session 39 in PROMPTS/039-paid-path-slice-4.md and in PROMPTS/README.md (S-065), and
  write PROMPTS/040 for Slice 5.
```
