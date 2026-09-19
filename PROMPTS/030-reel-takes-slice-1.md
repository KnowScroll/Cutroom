# 030 — reel-takes: Slice 1

- **For:** session 30
- **Feature:** `reel-takes` — [`docs/features/reel-takes.md`](../docs/features/reel-takes.md)
- **Work:** Slice 1 of 6 — the ports' answers, the settings and the record; checks 1–4, tests first; no journey
- **Written:** 2026-09-19, at the end of session 29, after `reel-takes`' gates were approved (b74951b) and pushed
- **Run:** session 30

Paste everything inside the block below as the session's first message.

```text
Build reel-takes' Slice 1 — the ports' answers, the settings and the record — and nothing from Slice 2 or later. It
proves checks 1, 2, 3 and 4 of docs/features/reel-takes.md. Tests first: write each check's test, watch it fail for the
reason it exists, then write the code. reel-takes has six slices; this is the first, and no journey runs until Slice 6.

Start:
1. Run `node scripts/decisions.mjs`. If it says commits are unpushed in the steering repository, say so and stop.
2. Read CLAUDE.md; then JOURNAL.md's session 29 entry in full (the six owner answers, the three review rounds, and what
   the reviewer could not check), and session 21's (reel-render's Slice 1: the same kind of slice — shapes as types, a
   compile test, settings the worker refuses, a migration, verified test support that changed with a type — and the
   collisions it found only while building).
3. Read docs/features/reel-takes.md: Gate 2 in full, Gate 3's file locations, signatures and checks 1–4, Gate 4's Slice
   1 and the slices after it — so you know what is NOT yours: no take number above 1 on any id, row or seed; no retry
   loop, no retry prompt, no sending again on `unavailable`, no stand-in `transient`; no atTheCap, no hold, no still_hold
   row written, no StillHold type; no RenderShot union, no still-hold schema, no zoompan in any filtergraph; no kept work,
   no checkpoint. Read the three Gate review sections: what each round found, and what is carried to later slices.
4. Decisions. In DECISIONS.md: S-090 to S-099 in full — above all S-093 (the record's takes, version 1), S-096 (the
   `unavailable` answer, the settings and the worker's refusals), S-097 (stillPush and zoompan in PASS_FILTERS) and S-099
   (what changes in verified features, and which slice owns each change) — and S-034 (the precedent for amending version
   1), S-036, S-055 (a column added with a default), S-058, S-067 and S-077 (a worker's startup refusals and their
   order), S-075 (ready() and the filters it requires), S-079, S-081. In steering-ref/steering/DECISIONS.md: D-015,
   D-024, D-025, D-093, D-094, D-095, D-106, and I-11 in steering-ref/docs/founding/reel-creation-engine/contentions.md.
5. Read the real code Slice 1 touches: packages/reel-contract/src (record.ts, responses.ts, version.ts, index.ts);
   packages/contracts/src (clip.ts, narration.ts, settings.ts, index.ts); packages/pipeline/src (clips/index.ts, where
   the stage narrows each answer's kind; render/index.ts for DEFAULT_RENDER_SETTINGS); packages/providers/src/ffmpeg
   (tools.ts — PASS_FILTERS and REQUIRED_FILTERS); packages/domain/src (schema.ts, clips.ts' recordClip and
   recordNarration, pictures.ts' readRecord, runs.ts), db/migrations and meta/; apps/worker/src (worker.ts' refusal(),
   video-port.ts, narration-port.ts, clips-job.ts); apps/api/src/server.ts (the record route); and the tests that build
   or read what changes: tests/reel-contract-shapes.test.ts (its RunRecord example), tests/stand-in/ (its records),
   tests/reel-contract-following.test.ts (check 19), tests/engine/harness.ts (TEST_RENDER_SETTINGS),
   tests/engine/worker-process.ts, tests/engine/video.ts (readVideo, which reads the record), tests/engine/restart.ts,
   tests/reel-render-readiness.test.ts (check 12, a worker refusing to start), tests/reel-render-ports.test.ts and
   tests/reel-stills-ports.test.ts (the compile-test pattern), and tests/reel-render-restart.test.ts (a restart's rows,
   which check 4 reads).
6. Baseline: `node scripts/check.mjs` green, 288 tests by a TAP count (b74951b; 8819d13 was the last commit to change a
   test). The suite takes about 170–320 s here, most of it reel-render's check 50 child.

What Slice 1 builds (Gate 4, and S-099 for the verified side):
- packages/reel-contract: RunRecord gains `takes`, required and strict — each entry takeId, shotId, number (a whole
  number above 0), used, checks (gate and outcome), and observationId and reconciliationId optional (S-093).
  CONTRACT_VERSION stays 1.
- packages/contracts: `TakeNumber = 1 | 2 | 3` and `TakeRecord.number: TakeNumber`; `{ kind: 'unavailable'; detail:
  string }` on VideoAnswer and on NarrationAnswer; RenderSettings gains `transient: { maxAttempts; backoffMs }` and
  `stillPush: { endZoom }`. Types only. Not StillHold and not the render shot union — those are Slices 3 and 4.
- packages/pipeline: DEFAULT_RENDER_SETTINGS' transient { maxAttempts: 3, backoffMs: 1000 } and stillPush { endZoom:
  1.1 }; makeClips treating an `unavailable` answer that reaches it — from the video or the narration port — as a fault:
  the stage fails, naming the answer, and nothing is counted. (Check 11 in Slice 2 reads this directly and declares that
  clause green before Slice 2's code; nothing in Slice 1 asserts it.)
- packages/providers/src/ffmpeg/tools.ts: 'zoompan' in PASS_FILTERS, so REQUIRED_FILTERS holds it and every ready()
  requires it. No filtergraph writes it yet.
- packages/domain: ONE migration, 0004_*, made with drizzle-kit generate after schema.ts changes — the still_hold table
  (run id, shot id, the clips attempt that decided it, picture id, the picture's probe, the three take ids, reason; its
  key the run and the shot) and video_receipt.transient_errors and speech_receipt.transient_errors, each default 0 so
  every earlier row reads as made at its first send (S-055's form); recordClip and recordNarration taking
  `transientErrors` and writing it (the guarded ports pass 0 until Slice 2); readRecord returning `takes` — every take
  made, every attempt's, in the order made, with its checks, its observation and reconciliation ids where it reached
  them, and `used` true exactly for the takes the latest render manifest of a COMPLETED video run shows.
- apps/worker: the refusals S-096 and S-097 name — maxAttempts not a whole number of at least 1, backoffMs not a finite
  number of at least 0, endZoom not a finite number above 1 — among the existing refusals, before ready() and before the
  database opens (S-077's order); the guarded ports passing transientErrors 0.
- apps/api: the record route returns what readRecord returns, `takes` included.
- Test support, no assertion (S-099): the contract shape check's RunRecord example and the stand-in service's records
  carrying `takes: []`; TEST_RENDER_SETTINGS and the child worker carrying `transient` — with a short backoff — and
  `stillPush`; any other test that builds a RenderSettings literal. tests/ is type-checked, so these change with the
  types.
- docs/features/reel-contract.md gains a note naming S-093, in S-034's form; its gates are not edited.
- The checks, in tests/reel-takes-*.test.ts, each test titled with its check's number and words as Gate 3 writes them:
  1. the compile test — a take record numbered 0 or 4 a type error, 1 to 3 compiling; an `unavailable` answer on each
     port carrying a detail and nothing else;
  2. the defaults; a worker handed each bad setting refusing to start and claiming no job; REQUIRED_FILTERS holding
     zoompan;
  3. RunRecord requiring `takes`, each entry's fields, a take entry with any other field refused, and CONTRACT_VERSION 1
     — that clause green before any code, and the check says so;
  4. the record of a completed video run (one entry per take, in order, `used` for each shot's shown take), of a run
     stopped in its clips stage and of one stopped at Gate 7 (none used), of a restarted run (every attempt's takes, the
     cut-off one with the checks it reached and no reconciliation id), and of a plan run and a stills run (no take). Every
     `number` is 1 in this slice; Slice 2's check 5 reads the others.

How to work:
- Red first, per check, and write down what each red said. Where a clause cannot be red before its code (check 3's
  version clause), say so; the breaks below are what show it can fail.
- A choice between real alternatives the gates leave open — the migration's file name, where the record's `used` is
  computed (a query or a read of the latest render row's manifest), the order of the new refusals among the old, how the
  stage words its `unavailable` fault — is recorded as an S-entry only if it is a real choice with a rejected option and a
  way it is caught. The next free number is S-100.
- If building finds a verified check or a gate that cannot hold as written (session 21 found two), STOP on that point:
  record it, and ask the owner with AskUserQuestion, a recommended option first, rather than weakening a check or editing
  an approved gate. The approved Gates: line does not change.
- Once green, run a break campaign as sessions 27 and 28 did — session 28's runner in .tmp/campaign/ (move its files
  aside first): each break's files saved as bytes and fsync'd to a record before touching them, restored from those bytes
  and read back, the record removed; every modified and untracked file fingerprinted after each restore; a refusal to
  start while a record exists; each break's own tests run, and counted. Break each clause at least once — among them:
  `takes` optional in RunRecord; a take entry allowed an extra field; `used` true for a stopped run's takes, or for every
  take of a shot; readRecord listing only the latest attempt's takes; the record's takes out of order; a cut-off take
  given a reconciliation id; each worker refusal removed, and one moved after the database opens; zoompan left out of
  PASS_FILTERS; a default changed; transient_errors with no default; the stage treating `unavailable` as `made` — plus a
  control caught by nothing. Record what each break was caught by, and fix — by ADDING — any break caught by nothing that
  a check's words promise to catch. Run the campaign inside one turn: the stop-gate runs check.mjs --code when a turn
  ends.
- Tick Slice 1 in docs/features/reel-takes.md only when checks 1–4 pass by number and check.mjs is green.

Traps, each already paid for:
- A heredoc or `node -e` text holding backticks, apostrophes or backslashes can end early, run nothing, or arrive with
  `\n` turned into a real newline — session 29 had one cut by the shell. Write such text with the editing tool.
- Shell tooling halves backslashes, and sed/grep in Git Bash strip `\r`. Verify a file's bytes, not the command typed.
- D-096 bans the field names source, sources, truthState, claimText and exposure anywhere; reel-render's check 5 bans a
  type or field named manifest or endCard.
- `@cutroom/domain` does not resolve from tests/; a test importing it uses the package's src/index.ts by relative path.
- node:sqlite's rows have a null prototype: hand plain objects to a deepEqual (session 28).
- `tar` reads `C:` as a remote host without --force-local.
- Leave no untracked file at the repository root; journey.mjs refuses a dirty tree.

Out of scope: anything from Slices 2–6 (above); video-edits' gates; the paid-path feature — a real adapter answering
`unavailable`; the steering stubs and the pin (S-033); reel-script's criterion type (S-029).

Finish:
- `node scripts/check.mjs` green, with the new test count stated by a TAP count.
- A JOURNAL.md entry: intent; what changed (files, the migration, S-entries, the test support that changed, +N tests);
  observed — each red and what it said, what Slice 1 builds that no Slice 1 check asserts (the stage's `unavailable`
  fault, the still_hold table, transient_errors at 0), the break campaign's table with what each was caught by, anything
  caught by nothing and what was done, any collision with a verified feature; next (Slice 2 — three takes, informed
  retries, transient errors, and the cap's stop; checks 5–12, with reel-render's checks 20 to 24, 26 and 47 moved as
  S-099 says).
- Set this prompt's Run line to session 30 in PROMPTS/030-reel-takes-slice-1.md and in PROMPTS/README.md (S-065).
- Commit as `feat(reel-takes): Slice 1 — the ports' answers, the settings and the record`.
- If the owner asks for Slice 2's prompt, write it in PROMPTS/ as S-065 says.
```
