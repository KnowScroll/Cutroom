# 036 — paid-path: Slice 1

- **For:** session 36
- **Feature:** `paid-path` — [`docs/features/paid-path.md`](../docs/features/paid-path.md)
- **Work:** Slice 1 of 8 — the engine runs as a program; checks 1, 2 and 5
- **Written:** 2026-09-20, at the end of session 35, after `reel-takes` was verified and `paid-path`'s gates were
  approved (`3a859a4` and the commit that adds them)
- **Run:** session 36

Paste everything inside the block below as the session's first message.

```text
Build paid-path's Slice 1 — the engine runs as a program. It proves checks 1, 2 and 5 of docs/features/paid-path.md.
NO ADAPTER IS BUILT IN THIS SLICE: every port stays a stand-in, nothing costs money, nothing reads a key.

Start:
1. Run `node scripts/decisions.mjs`. If it says commits are unpushed in the steering repository, say so and stop.
2. Read CLAUDE.md; then JOURNAL.md's session 35 entry and its "continued" entry in full — the second is where this
   feature came from, including the owner's six answers and the eight findings of its own gate review.
3. Read docs/features/paid-path.md whole. It is short by this repository's standards and every part of it binds.
   Note especially: Gate 2's "What the service is, and why it is a new app", "What the service settles", and the
   review's findings 1 to 4, which are what this slice exists to satisfy.
4. Decisions, each read whole, in DECISIONS.md: S-108 (a setting per port, every default 'fake'), S-109 (keys from
   the environment, read only in providers — Slice 2 builds the rule, but the environment file setting is this
   slice's), S-113 (the lease floor and one worker), S-115 (sequential, and why), S-021, S-038, S-075 (the worker is
   handed its ports and refuses to start without its tools), S-051, S-027. In steering-ref/steering/DECISIONS.md:
   D-098 (the engine runs as its own service), D-002 (the job table, the lease, one job at a time), D-086 (one
   setting per generated path, defaulting inside this repository), D-001.
5. Read the code this slice composes rather than changes: apps/worker/src/worker.ts (WorkerOptions and every
   refusal it already makes), apps/api/src/server.ts (startApi), packages/domain's openDatabase and its migrations,
   and tests/engine/harness.ts — which is TODAY THE ONLY THING THAT HAS EVER STARTED EITHER HALF, and is the shape
   the service must take without importing test code.

What Slice 1 builds:
- `packages/contracts/src/providers.ts` — `ProviderSettings`: one adapter name per port from a closed set, every
  default 'fake' (S-108). Types only; no factory, no adapter, no default path.
- `apps/service/` — a new app, referenced in the root tsconfig.json (tests/workspace.test.ts fails if you forget):
  loads the environment file its setting names, reads its settings, applies the migrations, builds every port
  through packages/providers' factories, starts ONE worker and the API on loopback, and stops both on SIGINT.
  It is the only app that may import packages/providers; api-no-providers and worker-no-providers stand untouched.
- `packages/providers` — one factory per port taking an adapter name and returning that port. In this slice every
  name but 'fake' returns a refusal: the real adapters are Slices 3 to 7.
- The refusals, in S-075's form and place — before the database is opened, claiming no job: a name outside the
  closed set; a real adapter named whose key is absent; and a lease below the floor when any real adapter is named
  (S-113). Each names the port and what was wrong.
- tests/paid-path-service.test.ts and tests/paid-path-refusals.test.ts — checks 1, 2 and 5, red first.

How to work:
- Check 1 runs the service AS A PROCESS and submits over HTTP. Its events are typed by hand, as reel-takes' check 25
  types its six endings; do not compute them from the pipeline. tests/engine/worker-process.ts is the precedent for
  spawning, and tests/engine/harness.ts for reading a run back.
- No absolute path anywhere (D-086, tests/no-absolute-paths.test.ts). Every setting defaults inside this repository:
  the database, the artifact root, the environment file, the API port, the lease.
- Nothing in this slice reads a key. Slice 2 adds keys-only-in-providers and the twentieth rule; if you find
  yourself wanting process.env for a key here, stop — that is Slice 2's work and its rule does not exist yet.
- A choice between real alternatives becomes an S-entry with what was rejected and how a violation is caught. The
  next free number is S-116.
- If building finds a check or a gate that cannot hold as written, STOP on that point: record it and ask the owner
  with AskUserQuestion, a recommended option first, rather than weakening a check or editing an approved gate.
- Once green, run a break campaign as sessions 30 to 35 did — the runner in .tmp/campaign/ (move session 35's
  breaks.mjs, chunk logs and results.jsonl aside to s35/ first). Break at least: the service started with a name
  outside the set and not refusing; a real name with no key not refusing; the migrations not applied; the API bound
  off loopback; SIGINT leaving the worker polling; two workers started instead of one; the environment file setting
  ignored. Add a control caught by nothing. Record what each break was caught by, and fix — by ADDING — any break
  caught by nothing that a check's words promise to catch. Run the campaign inside one turn.
- Tick Slice 1 in docs/features/paid-path.md only when checks 1, 2 and 5 pass by number and check.mjs is green.

Do NOT in this slice: build any real adapter; add any npm dependency; add the twentieth boundary rule; touch
reel-stills' check 3; write scripts/real-reel.mjs; make anything concurrent (S-115).

Finish:
- `node scripts/check.mjs` green, with the new test count stated by a TAP count. NO journey: paid-path's journey is
  Slice 8's, after the real reel.
- A JOURNAL.md entry: intent; what changed (files, S-entries, +N tests); observed — what was red first and why, the
  break campaign's table with what each break was caught by, anything caught by nothing and what was done; next.
- Set this prompt's Run line to session 36 in PROMPTS/036-paid-path-slice-1.md and in PROMPTS/README.md (S-065), and
  write PROMPTS/037 for Slice 2.
```
