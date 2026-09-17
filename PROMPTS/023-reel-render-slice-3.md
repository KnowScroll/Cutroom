# 023 — reel-render: Slice 3

- **For:** session 23
- **Feature:** `reel-render` — [`docs/features/reel-render.md`](../docs/features/reel-render.md)
- **Work:** Slice 3 of 6 — narration, clips and Gates 2 to 5; checks 11–28, tests first; no journey
- **Written:** 2026-09-17, at the end of session 22, after `reel-render`'s Slice 2 was committed (243483a)
- **Run:** not yet

Paste everything inside the block below as the session's first message.

```text
Build reel-render's Slice 3 — narration, clips and Gates 2 to 5 — and nothing from Slice 4 or later. It proves checks
11 to 28 of docs/features/reel-render.md. Tests first: write each check's test, watch it fail for the reason it exists,
then write the code. reel-render has six slices; this is the third and the largest — eighteen checks, a migration, the
first real tool the engine runs (ffmpeg), two stand-ins that write real media, and the worker requiring four new ports.
No journey runs until Slice 6.

Start:
1. Run `node scripts/decisions.mjs`. If it says commits are unpushed in the steering repository, say so and stop.
2. Read CLAUDE.md; then JOURNAL.md's session 22 entry in full (Slice 2: S-081's "Not handled" — nothing checks a
   clips-job ending's job cost; breaks 9j, 9k and 9p owed to check 11; the campaign runner's reporter trap), session 21's
   (Slice 1: the ports as types, validatingVideoPort, S-079, S-080), and session 17's (reel-stills' Slice 3: the same
   kind of slice — stand-ins writing real files, a migration made by drizzle-kit, a recorder, a guarded port writing
   receipts, costs and rows, the worker requiring new ports — and what it found while building).
3. Read docs/features/reel-render.md: Gate 2's "How a run goes", "Narration", "Clips", "The take's criteria", "Gates 2
   to 5 on each take", "A take that fails", "Spending", "How a video run ends", "Cancel, and a restart", "The ports",
   "ffmpeg and ffprobe", "Media files", "Storage" and "What this feature changes in verified features"; Gate 3's file
   locations, every signature Slice 3 builds, and checks 11–28; Gate 4's Slice 3; and Slices 4 to 6, so you know what is
   NOT yours: no renderManifest function, no startRender, no render or hold row written (Slice 3's migration creates
   both tables; nothing writes them), no assemble but a throw of "not built" that nothing reaches, no frames, no Gate 7
   or judgeCut call, no captions, no holds, finishVideo gains no render argument, readRecord lists no holds; no budget
   stop, question entry or refusal check for a narration or clip call (checks 42–45, Slice 5); no thrown-port sweep
   (46) and no every-ending events check (47); no restart (48, 49). A started assemble job that is not cancelled
   finishes the run failed with the detail "assembly is not built" — a contract-valid answer no check asserts, which
   Slice 4 replaces. Check 11's render-row clause and check 28's second half are green before this slice's code, as
   each says.
4. Decisions. In DECISIONS.md: S-066 and S-069 to S-082 in full — above all S-070 (narration), S-071 (a clip's request,
   prompt, validator and receipt), S-072 (Gates 2 to 5, the witness on a clip, the unclaimed criteria), S-075 (ffmpeg,
   readiness, the ports in providers), S-076 (a clips job run again), S-077 (what changes in verified features in
   Slice 3), S-081 and S-082 — and S-019, S-027, S-031, S-036, S-037, S-040, S-041, S-042, S-046, S-048, S-051, S-053,
   S-055, S-056, S-058, S-059. In steering-ref/steering/DECISIONS.md: D-007, D-008, D-014, D-018, D-019, D-023, D-025,
   D-026, D-028, D-029, D-033, D-041, D-042, D-043, D-044, D-050, D-051, D-053, D-057, D-069, D-071, D-072, D-086,
   D-087; and I-6, I-7, I-8, I-15, I-17 and I-19 in docs/design/contentions.md.
5. Read the real code Slice 3 touches or copies: packages/contracts/src (clip.ts, narration.ts, render.ts, settings.ts,
   model.ts, index.ts); packages/pipeline/src (stills/index.ts — makeStills is makeClips' pattern; stills/criteria.ts,
   stills/prompts.ts' reconcile prompt, stills/observation.ts; clips/; gates/index.ts; render/index.ts'
   DEFAULT_RENDER_SETTINGS; index.ts); packages/providers/src (fake/image.ts — the artifact root and the path refusal;
   fake/sensors.ts, fake/model.ts, fake/key.ts, index.ts); packages/domain/src (schema.ts; ledger.ts' recordGeneration —
   the receipt, job cost and row in one transaction; pictures.ts' upsertPicture; runs.ts' advanceStills, finishVideo,
   startStage; db.ts) and db/migrations; apps/worker/src (worker.ts' startup refusals and claim loop, clips-job.ts — the
   placeholder this slice replaces, keyframes-job.ts, guarded-image-port.ts — the guard's pattern, recorder.ts,
   recording-port.ts, video-port.ts, questions.ts); .dependency-cruiser.cjs (processes-only-in-providers,
   pipeline-no-io); and the tests that build or assert what changes: tests/engine/harness.ts, worker-process.ts,
   restart.ts, stills.ts and video.ts; tests/reel-stills-prompts.test.ts (check 21 calls startWorker itself, S-077);
   tests/reel-render-profile.test.ts (check 3 calls startWorker itself); tests/reel-render-validator.test.ts (check 6
   wraps a recording port with validatingVideoPort); tests/reel-render-chain.test.ts (check 9's second test stops a
   worker once the clips job has begun, S-082); tests/reel-stills-files.test.ts (check 17's root-unset pattern);
   tests/reel-stills-gate1.test.ts, reel-stills-reconcile.test.ts and reel-stills-spending.test.ts (the witness,
   reconcile, receipt and guard patterns).
6. Baseline: `node scripts/check.mjs` green, 202 tests (this prompt's commit). Then run `ffmpeg -version` and
   `ffprobe -version`: this machine had ffmpeg 8.1.1 on PATH, through WinGet's Links folder, on 2026-09-17. If either
   does not run, say so and stop — nothing here installs them (S-075).

What Slice 3 builds (Gate 4, and S-077 for the verified side):
- db/migrations/0003_*, made by `drizzle-kit generate` after schema.ts changes (S-019): narration, speech_receipt, take,
  video_receipt, take_observation, take_reconciliation, render and hold, as Gate 2's "Storage" lists them.
- packages/providers: ffmpeg/tools.ts — ffmpegTools and its readiness (what the tools said, remembered once per process
  for a pair of tool names; every ready() compares its own required encoders and filters against that); ffmpeg/media.ts
  — ffmpegMedia's probe (moovFirst included), scan (blackdetect, freezedetect, silencedetect and ebur128, handed the
  shortest stretches), and readText and listen from a script, defaulting to no words and neither speech nor music, any
  method scriptable to throw — its frames is Slice 4's; ffmpeg/assemble.ts — ffmpegAssembler with ready() alone and an
  assemble that throws "not built"; fake/video.ts — fakeVideo writing a real MP4 through ffmpeg as Gate 2's "Clips"
  describes, with its script; fake/narration.ts — fakeNarration writing a real WAV as Gate 2's "The ports" describes,
  with its script; each refusing an id whose path would leave the root; FfmpegTools, FakeMediaScript, MediaCall,
  FakeVideoScript and FakeNarrationScript exported.
- packages/pipeline: clips/narration.ts (narrationText, wordTimings, requestedSeconds), clips/criteria.ts (takeCriteria),
  clips/prompts.ts (clipPrompt, the take's reconcile prompt and answer schema), clips/index.ts (makeClips, which never
  rejects), gates/gate2.ts to gate5.ts, and the reel's unclaimed mustShow after every take.
- packages/domain: clips.ts (recordNarration, recordClip, upsertNarration, upsertTake, readClipsInputs); runs.ts'
  ASSEMBLE_JOB and advanceClips.
- apps/worker: WorkerOptions requiring video, narration, media and assembler; startWorker keeping its existing refusals
  first — an image port without references, equal framing values, another gate profile — and only then awaiting both
  ready()s, before the database opens (S-077); video-port.ts validating, then guarded, writing each call's receipt, cost
  and take row (S-036's form); narration-port.ts, guarded the same way; clips-recorder.ts; clips-job.ts running makeClips
  and either finishing the run through finishVideo or advancing through advanceClips; assemble-job.ts — its cancel read
  and "assembly is not built"; the worker claiming four kinds. Gate 4 gives the guards' refusals to Slice 5: whether the
  comparison is written now or then is yours to decide, and if now, its breaks are owed to checks 42–45.
- Test support, no assertion: tests/engine/harness.ts and worker-process.ts building the four ports with a small test
  profile and every artifact root inside the test's folder; the startWorker calls in reel-stills-prompts and
  reel-render-profile handed the four ports. CLAUDE.md: the only VideoPort and NarrationPort are stand-ins, the ffmpeg
  adapters are the one real adapter, and ffmpeg on PATH as an environment trap (Gate 4).
- The checks, in tests/reel-render-*.test.ts, each test titled with its check's number and words as Gate 3 writes them.

How to work:
- Red first, per check, and write down what each red said. A test file that fails to link (a missing export) is red for
  every test in it at once: say so. Run each verified test you change red before the code where it can be; a change that
  is test support only cannot be red — say which.
- Eighteen checks is a long slice. A workable order: the migration, ffmpegTools and readiness, and the two stand-ins
  (12, 19); narration (13, 14, 16); a clip's request, prompt and receipt (15, 17, 18); Gates 2 to 5 (20–24); the
  unclaimed criteria and the stops (25, 26); advanceClips (27); costs (28); cancel (11). If it becomes clear the slice
  will not fit in this session, stop at a green state and ask the owner with AskUserQuestion — do not tick the slice,
  commit it as done, or cut it yourself.
- Look for collisions while reading, before writing a test. Session 21 found two before any code (S-078, S-079). Points
  worth checking this time:
  - the harness's `finished()` and `waitFor()` wait 5 seconds, and a video run spawning ffmpeg for every shot may take
    longer — a longer wait is test support, not a weakened check, but say where and why;
  - check 9's second test (S-082) waits for the clips job's stage.started and then stops the worker, which now runs the
    real clips stage to its end; check 6's test calls validatingVideoPort(port) — if that wrapper's signature grows the
    guard, the call changes as support and no assertion is removed;
  - D-096's banned names (reel-plan check 5) and S-073's (reel-render check 5) are scanned at ANY depth — variables,
    object-literal keys and Drizzle columns, not only types: no `source` for an ffmpeg input, no `manifest` for the render
    row's column;
  - .gitignore names *.mp4 and *.wav and no subtitles extension; check 19 asserts no audio, video or subtitles file is
    tracked, and every test's artifact root is a temporary folder but check 19's own root-unset case, which must clean up
    what it writes under .artifacts/ as reel-stills' check 17 does;
  - reel-plan's check 47 and reel-stills' check 50 re-run their suites with PATH alone: ffmpeg must be found there;
  - S-081's "Not handled": if a Slice 3 check's words promise a job row's cost after a clips-job ending — a scripted
    clip cost and a stop, say — add the assertion; if none does, say so again;
  - anything S-077 missed that implements a port or starts a worker: grep for `startWorker(` and for every implementation
    of VideoPort, NarrationPort, MediaPort and AssemblerPort under tests/.
  If building finds a verified check or a gate that cannot hold as written, STOP on that point: record it, and ask the
  owner with AskUserQuestion, a recommended option first, rather than weakening a check or editing an approved gate.
  Nothing about the approved Gates: line changes.
- A choice between real alternatives the gates leave open — the stand-in video's ffmpeg recipe, how the scan's output is
  parsed, the margin around freezedetect's thresholds, where the guard's comparison lives before Slice 5, the take's
  reconcile prompt — is recorded as an S-entry only if it is a real choice with a rejected option and a way it is caught.
  The next free number is S-083.
- Once green, run a break campaign as sessions 19, 21 and 22 did: a runner in the scratchpad that saves each file's
  bytes (fsync'd) before touching it, restores from those bytes and reads them back, fingerprints every modified and
  untracked file after each restore, and refuses to start while a saved record exists. Session 22's lessons: pass a
  custom test reporter as a file:// URL (pathToFileURL) — a Windows path makes `node --test` run nothing, which reads as
  every break caught by nothing; stop the runner when a suite prints no counts; always run with --test-timeout. Every
  break runs typecheck and every test file; the suite now spawns ffmpeg and will be slower, so use more chunks rather
  than fewer files, and if you do narrow the files a break runs, say which. Break each rule of each check at least once
  — including the breaks owed to check 11 by Slice 2 (the clips job unclaimed, its startStage given 'stills', its cancel
  flag ignored) and the assemble job's cancel ignored; a narration's text joined another way, out of plan order, or made
  after its clip; each timing fault accepted; requested seconds rounded down or unclamped; a clip made from a picture not
  chosen; a degraded shot made image-to-video or not marked degraded; an aspect ratio on an image-to-video receipt or
  missing from a text-to-video one; each prompt part dropped, a [Shot marker added, the expanded prompt handed to Gate 4
  or 5; a seed not its take id's CRC-32; the style's id or version not recorded; a stand-in writing outside the root;
  ffmpeg's own two-second defaults used for black or frozen; the aspect tolerance ignored; a take failing Gate 2 for its
  frame rate, sample rate, missing audio or shortness; Gate 3 failing on words, or Gates 4 and 5 skipped after Gate 3
  fails; observe handed anything but the clip; an unparsed witness answer accepted; a clipped entity failing Gate 5; each
  of Gate 5's four failing rules removed; the unclaimed mustShow never checked; a failed take not stopping the run; a
  later shot's narration made after a failure; a reel.assemble row after a stop; advanceClips with the wrong parent,
  correlation_id or a reset cost; a receipt costing other than 0 by default; ready() awaited after the database opens or
  not at all; a filter remembered as present — plus a control that should be caught by nothing. Record what each break
  was caught by, fix by ADDING any break caught by nothing that a check's words promise to catch, and say which breaks
  are owed to a later slice's check. Run the campaign inside one turn: the stop-gate runs check.mjs --code when a turn
  ends, so never end a turn with a break applied — wait on each background chunk with a foreground waiter whose end
  condition is the runner's own completion line, not a pattern a test title can contain.
- Tick Slice 3 in docs/features/reel-render.md only when checks 11–28 pass by number and check.mjs is green.

Traps, each already paid for:
- A heredoc or `node -e` text holding backticks or apostrophes can end early and run nothing. Write such text with the
  editing tool.
- Shell tooling halves backslashes, and sed/grep in Git Bash strip `\r`. Verify a file's bytes, not the command typed.
- TypeScript checks a fresh object literal for excess properties and a variable not at all: a type check written only
  with literals can pass on a type that refuses nothing (session 21's check 1).
- Start a tool with an argument array, never a shell string. A Windows path inside an ffmpeg filtergraph needs its `:`
  and `\` escaped; a path given as an input or output argument does not.
- ffmpeg reports blackdetect, freezedetect, silencedetect and ebur128 on stderr at info level: a quieter log level hides
  what the scan parses. freezedetect measures a freeze a few frames short (Gate 2).
- `@cutroom/domain` does not resolve from tests/; a test importing it uses the package's src/index.ts by relative path.
- Leave no untracked file at the repository root; journey.mjs refuses a dirty tree.

Out of scope: anything from Slices 4–6; reel-takes' and video-edits' gates; the steering stubs and the pin (S-033);
reel-script's criterion type (S-029); S-074's judgeCut receipt naming its frames (Slice 4's).

Finish:
- `node scripts/check.mjs` green, with the new test count stated.
- A JOURNAL.md entry: intent; what changed (files, the migration, S-entries, the verified checks and test support that
  changed, +N tests); observed — each red and what it said, what Slice 3 builds that no Slice 3 check asserts, the break
  campaign's table with what each was caught by, anything caught by nothing and what was done, any collision with a
  verified feature; next (Slice 4 — assembly, Gate 7 and a video; checks 29–41).
- Set this prompt's Run line to session 23 in PROMPTS/023-reel-render-slice-3.md and in PROMPTS/README.md (S-065).
- Commit as `feat(reel-render): Slice 3 — narration, clips and Gates 2 to 5`.
- If the owner asks for Slice 4's prompt, write it in PROMPTS/ as S-065 says.
```
