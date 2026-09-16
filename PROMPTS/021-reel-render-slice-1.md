# 021 — reel-render: Slice 1

- **For:** session 21
- **Feature:** `reel-render` — [`docs/features/reel-render.md`](../docs/features/reel-render.md)
- **Work:** Slice 1 of 6 — the ports, the shapes and one rule; checks 1–6, tests first; no journey
- **Written:** 2026-09-16, at the end of session 20, after `reel-render`'s gates were approved
- **Run:** not yet

Paste everything inside the block below as the session's first message.

```text
Build reel-render's Slice 1 — the ports, the shapes and one rule — and nothing from Slice 2 or later. It proves checks
1, 2, 3, 4, 5 and 6 of docs/features/reel-render.md. Tests first: write each check's test, watch it fail for the reason
it exists, then write the code. reel-render has six slices; this is the first, and no journey runs until Slice 6.

Start:
1. Run `node scripts/decisions.mjs`. If it says commits are unpushed in the steering repository, say so and stop.
2. Read CLAUDE.md; then JOURNAL.md's session 20 entry in full (how the gates were cut, written and reviewed), and
   session 15's (reel-stills' Slice 1: the same kind of slice — ports as types, a compile test, a new boundary rule, a
   verified check that changed — and the two collisions with verified features it found only while building).
3. Read docs/features/reel-render.md: Gate 2 in full, Gate 3's file locations, signatures and checks 1–6, and Gate 4's
   Slice 1 and the slices after it, so you know what is NOT yours: no ffmpeg adapter, no stand-in video or narration
   port, no migration of the new tables, no port required on the worker, no guard, no receipt row but take_ids. Read
   docs/features/reel-takes.md so you know what the one-take cap leaves out.
4. Decisions. In DECISIONS.md: S-066 to S-077 in full — above all S-067 (the gate profile), S-071 (the validator and
   its scope), S-072 (observe on a clip, takeIds), S-073 (the render manifest's schema and names), S-074 (judgeCut),
   S-075 (the rule and its prove cases) and S-077 (what changes in verified features, including the tests found after
   approval) — and S-021, S-037, S-038, S-047, S-049, S-051, S-055. In steering-ref/steering/DECISIONS.md: D-036,
   D-041, D-044, D-052, D-053, D-057, D-059, D-063, D-071, D-084, D-086, D-096, D-101, and I-8 and I-19 in
   docs/design/contentions.md.
5. Read the real code Slice 1 touches: packages/contracts/src (model.ts, picture.ts, settings.ts, index.ts);
   packages/pipeline/src (index.ts, gates/index.ts, stills/index.ts for DEFAULT_STILLS_SETTINGS, stills/observation.ts);
   packages/providers/src/fake/model.ts; packages/domain/src (schema.ts, runs.ts' recordReceipt); apps/worker/src
   (worker.ts, recording-port.ts, index.ts); .dependency-cruiser.cjs and scripts/drift.mjs (CASES, where pipeline-no-io's
   node:fs case sits); and the tests that assert or build what changes: tests/reel-plan-shapes.test.ts (checks 3, 5),
   tests/reel-plan-gate0.test.ts (check 29), tests/reel-stills-shapes.test.ts (check 5),
   tests/reel-stills-ports.test.ts (the compile-test pattern), tests/reel-stills-rules.test.ts (the rule-test pattern),
   tests/reel-stills-prompts.test.ts (a worker refusing to start, check 21), tests/reel-stills-endings.test.ts and
   tests/reel-stills-placing.test.ts (their `hold` wrappers), tests/engine/worker-process.ts, tests/engine/source.ts.
6. Baseline: `node scripts/check.mjs` green, 182 tests (5341834).

What Slice 1 builds (Gate 4, and S-077 for the verified side):
- packages/contracts: clip.ts, narration.ts and render.ts as Gate 3 writes them, and model.ts (observe on a picture OR a
  clip, judgeCut, ModelCall with 'judgeCut', ModelReceipt.takeIds, structured's optional takeIds) and settings.ts
  (RenderSettings with gateProfile). Types only; exported from the package index.
- packages/pipeline: GATE_ORDER = ['0', '1', '1S', '2', '3', '4', '5', '7']; DEFAULT_RENDER_SETTINGS in render/index.ts,
  its gateProfile { id: 'phase-1', gates: GATE_ORDER }; the clip observation schema (clips/observation.ts); the render
  manifest schema (render/manifest.ts — renderManifestSchema only; the renderManifest function is Slice 4's); the
  validator, validateVideoRequest (clips/validate.ts), and NEGATIVE_AUDIO.
- packages/providers/src/fake/model.ts: observe on a clip kept in its own list, judgeCut from the judge script in its
  own list, every receipt carrying takeIds; the three existing lists read exactly as before.
- packages/domain: the migration adding model_receipt.take_ids, default '[]' (0002_*, made with drizzle-kit generate
  after schema.ts changes, S-019), the call enum widened with 'judgeCut', and recordReceipt writing take_ids.
- apps/worker: renderSettings on WorkerOptions, defaulting to DEFAULT_RENDER_SETTINGS; a gate profile whose gates are
  not GATE_ORDER refused among the existing startup refusals, before the database opens (S-067, S-077's order);
  recording-port.ts recording judgeCut; video-port.ts — the wrapper that validates a request and throws before calling
  the port it wraps (its guard and receipts are Slice 3's; the worker is handed no video port yet).
- Test support, no assertion: tests/engine/worker-process.ts' port carrying judgeCut with its held call counted over
  four calls; the `hold` wrappers in tests/reel-stills-endings.test.ts and tests/reel-stills-placing.test.ts passing
  judgeCut through. tests/ is type-checked (tsconfig.tooling.json), so these change with the port.
- Verified checks that change, S-077's form, NO ASSERTION REMOVED: reel-plan's check 3 (the port's calls are exactly
  structured, observe, compare, judgeCut); reel-plan's check 29 and reel-stills' check 5 (the new GATE_ORDER, as data).
- The rule: processes-only-in-providers in .dependency-cruiser.cjs — nothing under packages/ or apps/ outside
  packages/providers imports child_process — with drift:prove cases importing child_process AND node:child_process from
  apps/worker, apps/api and packages/domain, in drift.mjs' CASES list beside pipeline-no-io's node:fs (a built-in module
  has no package for the by-name cases). CLAUDE.md: eighteen rules become nineteen, wherever the count appears.
- The checks, in tests/reel-render-*.test.ts, each test titled with its check's number and words as Gate 3 writes them:
  1. the compile test — every misuse a type error, the calls as Gate 3 writes them compiling;
  2. the rule firing in drift:prove on all six cases, and drift, drift:prove and drift --audit passing;
  3. GATE_ORDER as data; the default gate profile; a worker handed another profile refusing to start and claiming no
     job; the port's four calls;
  4. the clip observation schema requiring actions, eventOrder and clippedByEdge, and the still's still refusing
     actions and eventOrder;
  5. the render manifest schema refusing two shots holding one narration id, a shot with no join mode, a placed
     text-to-video opening with no reason and an unplaced one with a reason; and no type or field in packages/ or apps/
     named manifest or endCard — this last clause is green before any code, and the gate says so;
  6. the validator refusing a prompt without the negative audio block and a text-to-video request without aspectRatio
     9:16 — the worker's video port throwing and a recording port it wraps receiving no call — and passing a request
     carrying both.

How to work:
- Red first, per check, and write down what each red said. Where a check cannot be red before its code (check 5's name
  clause), say so; the breaks below are what show it can fail.
- A choice between real alternatives the gates leave open — the wrapper's exported name, how the clip observation
  schema is derived from the still's, where the compile test's fixtures live, the migration's file name — is recorded as
  an S-entry only if it is a real choice with a rejected option and a way it is caught. The next free number is S-078.
- If building finds a verified check or a gate that cannot hold as written (session 15 found two), STOP on that point:
  record it, and ask the owner with AskUserQuestion, a recommended option first, rather than weakening a check or
  editing an approved gate. Nothing about the approved Gates: line changes.
- Once green, run a break campaign as sessions 18 and 19 did: a runner in the scratchpad that saves each file's bytes
  (fsync'd) before touching it, restores from those bytes, fingerprints every modified and untracked file after each
  restore, and refuses to start while a saved record exists. Break each rule of each check at least once — including
  the rule pointed at the wrong folder, one spelling's prove case deleted, the gate profile refusal removed, the refusal
  moved after the database opens, judgeCut left out of the check-3 list, a still observation accepting actions, the
  validator flagging instead of refusing, the wrapper calling the port before validating — plus a control that should
  be caught by nothing. Record what each break was caught by, and fix — by ADDING — any break caught by nothing that a
  check's words promise to catch. Run the campaign inside one turn: the stop-gate runs check.mjs --code when a turn ends.
- Tick Slice 1 in docs/features/reel-render.md only when checks 1–6 pass by number and check.mjs is green.

Traps, each already paid for:
- A heredoc or `node -e` text holding backticks or apostrophes can end early and run nothing. Write such text with the
  editing tool.
- Shell tooling halves backslashes, and sed/grep in Git Bash strip `\r`. Verify a file's bytes, not the command typed.
- D-096 bans the field names source, sources, truthState, claimText and exposure (and reel-plan's check 5 beat and
  beats); S-073 bans a type or field named manifest or endCard. A field holding a render manifest is renderManifest.
- `@cutroom/domain` does not resolve from tests/; a test importing it uses the package's src/index.ts by relative path.
- `tar` reads `C:` as a remote host without --force-local.
- ffmpeg is not Slice 1's: no adapter, no spawn, nothing under packages/providers/src/ffmpeg yet.
- Leave no untracked file at the repository root; journey.mjs refuses a dirty tree.

Out of scope: anything from Slices 2–6; reel-takes' and video-edits' gates; the steering stubs and the pin (S-033);
reel-script's criterion type (S-029).

Finish:
- `node scripts/check.mjs` green, with the new test count stated.
- A JOURNAL.md entry: intent; what changed (files, S-entries, the verified checks and test support that changed, +N
  tests); observed — each red and what it said, what Slice 1 builds that no Slice 1 check asserts, the break campaign's
  table with what each was caught by, anything caught by nothing and what was done, any collision with a verified
  feature; next (Slice 2 — asking for a video, and the chain; checks 7–10).
- Set this prompt's Run line to session 21 in PROMPTS/021-reel-render-slice-1.md and in PROMPTS/README.md (S-065).
- Commit as `feat(reel-render): Slice 1 — the ports, the shapes and processes-only-in-providers`.
- If the owner asks for Slice 2's prompt, write it in PROMPTS/ as S-065 says.
```
