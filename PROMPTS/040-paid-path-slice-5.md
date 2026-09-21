# 040 — paid-path: Slice 5

- **For:** session 40
- **Feature:** `paid-path` — [`docs/features/paid-path.md`](../docs/features/paid-path.md)
- **Work:** Slice 5 of 8 — the fal image adapter and D-028's registry; checks 11, 12 and 13
- **Written:** 2026-09-20, at the end of session 39, after Slice 4 was green and S-123 was recorded
- **Run:** session 40

Paste everything inside the block below as the session's first message.

```text
Build paid-path's Slice 5 — the fal image adapter and D-028's closed registry, the THIRD real adapter and the
FIRST on a second provider and a second key. It proves checks 11, 12 and 13 of docs/features/paid-path.md.

NOTHING IN THIS SLICE SPENDS MONEY AND NO TEST NEEDS A KEY. Every test runs against recorded wire (S-111); every
default stays 'fake' (S-108); reel-takes' check 26 and reel-render's check 50 keep their exact form and stay green.
The owner's fal credit is owed before Slice 8 and is NOT needed here.

Start:
1. Run `node scripts/decisions.mjs`. If it says commits are unpushed in the steering repository, say so and stop.
2. Read CLAUDE.md; then JOURNAL.md's sessions 36 to 39 entries in full — Slice 1 built apps/service and
   packages/providers/src/env.ts, Slice 2 the twentieth rule and the recorded-wire harness, Slice 3 the first real
   adapter and the loopback wire server, Slice 4 the narration adapter, packages/providers/src/minimax/wire.ts and
   the presigned-URL sweep.
3. Read docs/features/paid-path.md whole, and especially Gate 2's "The image" paragraph, "Getting a local picture
   to fal", "What is transient, and what is a fault", and checks 11, 12, 13 and 21.
4. Decisions, each read whole, in DECISIONS.md: S-123 (the arm versus the typed throw, and why the carrier follows
   the port), S-122 and S-121, S-114 (fetch and zod, no SDK, AND its one escape hatch — @fal-ai/client may replace
   uploadReference and nothing else, if fal's storage upload proves fragile, recorded as its own entry), S-111,
   S-109, S-096, S-110 (the cheapest admitted entry is configured for the first run and settles nothing). In
   steering-ref/steering/DECISIONS.md: D-028 (THE CLOSED REGISTRY — read every word, including O-4 / C-8, the
   default entry the owner has not chosen), D-026 (reference pictures), D-019 (image-to-video has NO aspect_ratio
   field, which is the trap that would ship a 16:9 clip into a 9:16 product), D-022, D-086, D-087.
5. Read the code this slice changes: packages/providers/src/ports.ts (imagePort, which refuses today),
   packages/providers/src/fake/image.ts (the stand-in whose contract the real one must meet),
   packages/providers/src/minimax/{model,narration,wire}.ts (the two adapters' transport, classification and
   receipts are the pattern), packages/providers/src/transient.ts, tests/engine/wire.ts (recordedFetch now takes a
   Wire BUILT IN THE TEST as well as a fixture's name), and apps/service/src/settings.ts.

What Slice 5 builds:
- `packages/providers/src/fal/registry.ts` — D-028's FOUR admitted entries, each carrying its own slug, rate and
  limits, and ONE CONFIGURED DEFAULT. A call naming a slug outside the registry is refused BEFORE any request. No
  slug is ever spelled at a call site.
- `packages/providers/src/fal/image.ts` — the real ImagePort over fal, with `fetch` and `zod` and NO NEW NPM
  DEPENDENCY. It writes the picture under the artifact root and records the LOCAL PATH, never the provider's URL
  (D-022, D-086, D-087).
- THE TWO ADMISSION GATES, ASSERTED RATHER THAN TRUSTED: a configured entry that does not advertise reference
  pictures makes the SERVICE REFUSE TO START (D-026 — without them the derive step has no mechanism); and the
  produced picture's 9:16 is CHECKED ON THE FRAME, so a recorded response whose file is 16:9 fails the call naming
  the entry and never reaches image-to-video.
- The receipt's cost: the CONFIGURED ENTRY'S RATE applied to the call. Check 13 says changing the configured entry
  must change what admission estimates — an unchanged estimate means a rate is hardcoded somewhere.
- `uploadReference(file) → url`, the ONE function that gets a local picture to a URL fal can fetch, written with
  fetch like everything else. S-114's escape hatch is attached to this function and nothing else.
- The same classification split the two MiniMax adapters share (S-096, S-122, S-123): decide and record WHICH
  CARRIER this port takes, by reading `ImageAnswer` in packages/contracts — the narration and video ports have an
  `unavailable` arm and the model port does not, and S-096 says image calls are NOT covered by the guarded retry.
  The answer follows the port, not the other adapters.
- The transport: a `fetch` and a base URL. `CUTROOM_MINIMAX_BASE_URL` exists; fal is a DIFFERENT provider on a
  different host, and S-123 shared one setting only because MiniMax's two wires are one host. Decide and record.
- The fixtures checks 11, 12 and 13 need, each REDACTED BEFORE IT IS COMMITTED (check 21 reads them all, and it
  forbids a query string — a fal result URL is exactly the shape that must not be recorded).
- tests/paid-path-image.test.ts (11, 12, 13) — red first.

How to work:
- Never weaken a check or a test to reach green. If an assertion cannot hold as written, that is a finding to put
  to the owner with AskUserQuestion, as sessions 36 to 39 did — not something to re-aim quietly.
- No test calls a provider, no test needs a key, and no npm dependency is added (S-111, S-114).
- Nothing outside packages/providers/src may read a key — `node scripts/drift.mjs` reads the source for that.
- No absolute path anywhere (D-086).
- Once green, run a break campaign as sessions 30 to 39 did — the runner in .tmp/campaign/ (move session 39's
  breaks.mjs and results.jsonl aside to s39/ first). Break at least: a slug outside the registry accepted; the
  configured entry's rate hardcoded at a call site; the reference-picture gate dropped; the 9:16 check dropped, and
  the 16:9 response accepted; the picture's provider URL recorded instead of its local path; the picture written
  outside the artifact root; the base URL ignored (session 39's n29 was caught by NOTHING until a test was added —
  do not repeat it); the key sent in no header, and the key written into a message. Add a control caught by
  nothing. Record what each break was caught by, and fix — by ADDING — any break caught by nothing that a check's
  words promise to catch. Run the campaign inside one turn.
- Tick Slice 5 in docs/features/paid-path.md only when checks 11, 12 and 13 pass by number and check.mjs is green.

Do NOT in this slice: build the video or sensor adapters (Slices 6 and 7); write scripts/real-reel.mjs; make
anything concurrent (S-115); settle D-028's default entry, which is the owner's bake-off and stays open (O-4 /
C-8); run any journey — paid-path's is Slice 8's, and the re-runs of the five verified features' journeys are
Slice 8's too (S-099's form).

Finish:
- `node scripts/check.mjs` green, with the new test count stated by a TAP count. NO journey.
- A JOURNAL.md entry: intent; what changed (files, S-entries, +N tests); observed — what was red first and why, the
  break campaign's table with what each break was caught by, anything caught by nothing and what was done; next.
- Set this prompt's Run line to session 40 in PROMPTS/040-paid-path-slice-5.md and in PROMPTS/README.md (S-065), and
  write PROMPTS/041 for Slice 6.
```
