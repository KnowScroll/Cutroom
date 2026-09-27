---
status: current
authority: a digest for agents, not a plan — every line names its source, and the source wins
---

# Context — read this first

**What an agent reads before anything else** (S-160): where things stand, every real run and what stopped it, and what
changed where — so no agent looks round the repository to learn it. Open a source only for the line you need, by the
name it gives: `grep -n '^## S-160' DECISIONS.md`, never the whole file. `DECISIONS.md` is 6,800 lines and `JOURNAL.md`
6,200; this file stays under 300 (`tests/context-file.test.ts`).

**Kept by every session**: its entry under Changes — newest first, the same session as `JOURNAL.md`'s newest entry,
or the check is red — and any row or line below its work made untrue. Changes older than ten sessions are dropped;
git and the journal keep them.

## Where things stand

- **The engine is built end to end on real providers** (`paid-path`): a brief becomes a plan (MiniMax), pictures
  (fal, `flux-2-pro/edit`), clips (fal, `minimax-h3-turbo`), narration (MiniMax speech) and one cut through ffmpeg,
  judged by Gates 0 to 7. A reel costs about 55¢ against a 250¢ ceiling (D-014). Run: `scripts/real-reel.mjs`.
- **Verified features** (`docs/features/<slug>.md`, `Status:` line): `reel-contract`, `reel-plan`, `reel-stills`,
  `reel-render`, `reel-takes`, `paid-path`, `paid-failures`, `second-ask`, `three-pictures`, `ask-again`, `cut-rules`.
  **Stopped**: `one-subject` (S-149). **Gates approved, Slices 1 to 5 of 7 built**: `resume-failed` (S-161 to S-164, S-171 to S-174). **Planned, gates not
  written**: `cutroom-sdk` (S-173, no file yet), `caption-match` (S-165), `composed-hold`, `diagram-shots` (S-166), `code-reels` (S-167), `self-heal` (S-169, S-170), `video-edits`,
  `parallel-shots` (S-115, no file yet). **Deferred, no place in the queue**: `clip-overlays` (S-167).
- **Three kinds of reel** (S-167): footage (built), hybrid (`diagram-shots`), code-only (`code-reels`).
- **Next**: `PROMPTS/060` — `resume-failed` Slice 6, the owner's script; then Slice 7's check and journeys. In the owner's order — reliability before speed (S-168, S-169) — `cutroom-sdk`'s gates follow the verified feature (S-173); then `self-heal`'s gates — one harness around the run that makes, checks, heals and learns: a rule book of what failed runs taught, each learned rule binding once the owner approves it, and the caller's criteria and claims healed in place only when the request opts in (S-170, superseding D-096 in part); never the engine's code or gates. Session 53's two reels completed, and its engine findings wait for a feature:
  a network error on a picture's status check or file ends the run (P-013), and a witness answer that is not JSON is
  never asked again (P-014). Then `caption-match`'s gates and build, with the registry change S-165 decided.
  Then `composed-hold`, `diagram-shots`, `code-reels`. Then `parallel-shots`' gates, from the prompt at `b15d203`.
- **KnowScroll and the engine** (S-173, settled session 57): the engine stays its own process (D-098); KnowScroll
  calls it through `@cutroom/sdk`, which connects to it, or starts the service as a child when none answers. D-099 in
  part superseded: two packages may be depended on from outside.
- **Reviews answered** (S-165): P-011's caption question gets an exact comparison (`caption-match`); P-010's two
  registry entries go, with their amended checks; P-003 accepted for now. None open.
- **Outside the engine**: reels made from code (Hyperframes) and hybrids — the engine's clips with layers drawn over
  them. Timings, token counts and rules: `docs/research/hyperframes.md`, sessions 50 and 51.
- **Checks**: the last full `check.mjs` green on `395dc40`, `resume-failed`'s Slice 3 (session 57); every later commit
  is documents, or names its own full run below. `check.mjs --changed` between steps (S-159).

## Runs

Every real run in `data/cutroom.sqlite`, newest first, read from its `run` row; cents by our receipts. A run's detail
comes from the `run-reader` agent; a pitfall's, from `docs/reel-pitfalls.md`.

| run        | UTC date   | world           | ending               | ¢   | what ended it                                                                           |
| ---------- | ---------- | --------------- | -------------------- | --- | --------------------------------------------------------------------------------------- |
| `a1b8f2ee` | 2026-09-26 | jojo            | completed            | 53  | a pyramid, not pyramids; a galaxy on four of six shots (P-025); a 14.5 min wait (P-024) |
| `8d233d6e` | 2026-09-26 | jojo            | stopped              | 52  | Gate 5, shot 2's three takes: "Pyramids of Giza" counted one by one (P-018)             |
| `d12931e1` | 2026-09-26 | game-graphics   | completed            | 58  | sentence 6 unclaimed; every take passed at once                                         |
| `a5b76d45` | 2026-09-26 | game-graphics   | stopped              | 73  | Gate 5, shot 2's three takes: the card's shot held to c4's monitor (P-008)              |
| `f44e960b` | 2026-09-26 | game-graphics   | stopped              | 15  | Gate 1 three times: "with no markings" read as required (P-022)                         |
| `8475f26d` | 2026-09-26 | game-graphics   | stopped              | 71  | Gate 5, shot 2's three takes: lettering (P-017); the narration drawn (P-021)            |
| `fdff208b` | 2026-09-25 | game-graphics   | failed               | 0   | the first picture: fetch failed — this machine's DNS (P-020)                            |
| `1496bbb9` | 2026-09-25 | game-graphics   | failed               | 0   | the first picture: fetch failed — this machine's DNS (P-020)                            |
| `a469e36b` | 2026-09-25 | game-graphics   | failed               | 51  | the witness: fetch failed at 3 sends; a character drawn (P-019)                         |
| `cd9648c9` | 2026-09-25 | game-graphics   | failed               | 0   | the planner: fetch failed at 3 sends                                                    |
| `a1cb6cfb` | 2026-09-25 | game-graphics   | stopped              | 75  | Gate 5, shot 2's three takes: a plural id, lettering (P-018, P-017)                     |
| `098e97fd` | 2026-09-25 | honeybees       | completed            | 53  | the brief changed three times; shot 4 made from words (clipped flight)                  |
| `52c63f62` | 2026-09-25 | honeybees       | stopped              | 15  | Gate 1 three times: a cluster seen close, clipped (P-015, P-002)                        |
| `9bc5821e` | 2026-09-25 | honeybees       | failed               | 5   | a made picture's file: fetch failed (P-013)                                             |
| `0ac13e84` | 2026-09-25 | honeybees       | stopped              | 15  | Gate 1 three times: a Queen Bee subject no picture shows (P-016)                        |
| `9d0914dd` | 2026-09-25 | honeybees       | stopped              | 54  | Gate 7 said no: a shot made from words drew bees on a flower (P-015)                    |
| `d459f6f5` | 2026-09-25 | tsunamis        | completed            | 49  | the brief's second run; shot 4 one retake, lettering on the boat                        |
| `62b5a191` | 2026-09-25 | tsunamis        | failed               | 10  | the witness answered not JSON, never asked again (P-014)                                |
| `d4d6c562` | 2026-09-25 | honeybees       | failed               | 0   | a picture's status check: fetch failed (P-013)                                          |
| `74bb96a0` | 2026-09-24 | hurricanes      | completed            | 56  | first try; shot 4's picture refused twice, made from words (P-012)                      |
| `bf8f4444` | 2026-09-24 | volcanoes       | stopped              | 55  | Gate 7 said no to the caption question on a correct cut (P-011)                         |
| `bad736d1` | 2026-09-24 | volcanoes       | failed               | 8   | nano-banana-2 made 768×1376, not the frame (P-010)                                      |
| `9b23d24a` | 2026-09-24 | volcanoes       | failed               | 10  | fal's flux answered 504 on shot 4's picture (P-009)                                     |
| `124f1124` | 2026-09-24 | volcanoes       | failed               | 0   | fal's flux answered 504 on shot 0's picture (P-009)                                     |
| `05611ff9` | 2026-09-24 | black-holes     | completed            | 53  | the first black-holes reel                                                              |
| `af7447f0` | 2026-09-24 | black-holes     | stopped              | 60  | Gate 5, shot 4's three takes: one claim over two shots (P-008)                          |
| `12a097bf` | 2026-09-24 | black-holes     | stopped              | 45  | Gate 7 said no: repetition (P-006); a voice under it (P-007)                            |
| `c52d418a` | 2026-09-23 | black-holes     | failed               | 15  | the witness's count refused (P-004)                                                     |
| `c9f3df47` | 2026-09-23 | black-holes     | failed               | 10  | the witness answered a count as words (P-004)                                           |
| `879a27b7` | 2026-09-23 | black-holes     | stopped              | 53  | Gate 2, shot 2's three takes: clipped subject, dark end (P-002, P-003)                  |
| `ee63e617` | 2026-09-23 | black-holes     | failed               | 15  | MiniMax repeated a word in its timings (P-001); `resume-failed`'s cause                 |
| `436564c1` | 2026-09-23 | first-real-reel | completed            | 228 |                                                                                         |
| `a08a9c9c` | 2026-09-23 | first-real-reel | stopped              | 231 | the budget                                                                              |
| `f895e76d` | 2026-09-23 | first-real-reel | completed            | 160 | the first completed real reel                                                           |
| 18 runs    | 09-21, 22  | first-real-reel | 14 failed, 4 stopped | 554 | the paid path's first contact — below                                                   |

The first 18, in the order made: `9cdadf20` MiniMax 401, `80c959ef` 402; `53710655` the plan's shape; `e1adc629` the
reconciler 400, `00aa29ec` fenced JSON, `87227235` 180 s with no answer; `8f9c921e` and `f9507840` seedream's result
and its 1920×3416 frame; `4938925b` the planner's reasoning and no answer, `5df208e3` its schema echoed back;
`bef01ee5` and `c4c9b112` a subject id refused; `4ce2d176` and `ad65acbe` the witness's answer refused; `e590de48`,
`56a0a2b2` and `46354140` Gate 1 three times on one picture; `ffbd04b5` Gate 7 said no, 202¢.

## Changes

Newest first. Each: where, what, and the decision or the reason — enough that an agent need not diff to know.

### 2026-09-27 · session 60

- `PROMPTS/060` — the implementation prompt for `resume-failed` Slice 6: the real-reel preview and paid resume flow, one-read answers, waiting-run cancellation before the service starts, and service-owned `waitingRuns`/`cancelRuns`; checks 41 to 43 and paid-path check 20's amendment. `PROMPTS/059` and the prompt index record that session 59 built Slice 5.
- Verified Slice 5 from its production paths, not only its feature record: checks 35 to 40 plus the amended `reel-render` context checks passed, 9/9. The aggregate code check again reached its test phase then failed without the wrapper identifying the test; the prompt requires that finding to be resolved without weakening a check before Slice 6 commits.
- Slice 6, the owner's script — built by one `slice-builder` agent (S-172) and committed after the full `check.mjs` green (the wrapper's earlier omission did not recur today; 41+ test files ran green in 370 s). `scripts/_answers.mjs` (pure, import-free `answers(input)`) and `scripts/_answers.d.mts`; `apps/service/src/waiting-runs.ts` — `waitingRuns` reads through a `better-sqlite3` connection opened `readonly: true, fileMustExist: true` and never mutates; `cancelRuns` is one `UPDATE run SET cancel_requested = 1 WHERE state = 'running' AND run_id IN (...)`; both exported from `@cutroom/service`. `scripts/real-reel.mjs` — one `post(path, body)` helper owns the sole `method: 'POST'`; `makeReel` owns the one `/v1/runs` post; `resumeReel` owns the literal `{ preview: true }` preview and the no-`preview`-key paid resume; the second `!== confirmation(` gate compares `confirmation(figure)` from `Number(preview.estimateCents)`; the poll loop follows `resumedBy` to the resumed run's end; the start's waiting-runs question is asked through the service helpers; every answer is `line.next()` from `answers(redirectedInput)`. `tests/paid-path-real-reel.test.ts` check 20 absorbs the Slice 6 shape (markers re-pointed, `method: 'POST'` inside `function post(`, three `post()` calls, one literal `{ preview: true }`, no `preview` on the paid body, two `!== confirmation(` gates, `makeReel`/`resumeReel` each holding one path) and gains a sibling assertion that every local module the file imports reads no `child_process`. `tests/resume-failed-script.test.ts` — checks 42 (three `answers` tests) and 43 (five `waitingRuns`/`cancelRuns` tests). `docs/features/paid-path.md` Slice 6 amendment block (newest first); `docs/features/resume-failed.md` Slice 6 ticked. 13 deliberate breaks demonstrated, each caught by the check meant to catch it.
- **Checks**: the full `check.mjs` green on this commit — the aggregate test phase that was a finding for sessions 58 and 59 ran green today (no wrapper omission, no marginal test).

### 2026-09-27 · session 59

- Slice 4, the call (`7315af0`) — built by session 58, which left it uncommitted and wrote no entry here; read, checked
  and committed this session. `packages/reel-contract/src/resume.ts` — `Piece`, `ResumeRequest`, `ResumeResponse`;
  `POST /v1/runs/:runId/resume` (`routes.ts`, `apps/api/src/server.ts`, handed `ResumeService` and `budgetPath`, both
  optional); `RunStatus.resumes`/`resumedBy`, the record's `keptFrom`; lookup and replay answer the newest run
  (`domain/src/runs.ts`); `resumeService(...)` (`apps/service/src/service.ts`); `appendResumeQuestion`
  (`apps/worker/src/questions.ts`); S-171's stop by `copiedPictures` (`pictures.ts`, `stills/index.ts`); the stand-in
  engine and client. `tests/resume-failed-contract.test.ts`, checks 26 to 34.
- Slice 5, the engine's own resume: `finishRun`/`finishStills`/`finishVideo` take an optional `resume(tx, now)`, run
  after the labels in `SAVEPOINT resume`, before `endRun` (`domain/src/runs.ts`, `ResumeStep`, `ResumeStepped`);
  `apps/worker/src/resume.ts` — `ResumeContext`, `finishFailed`, `resumeRates`; every job's failed stage ending through
  `finishFailed`; `WorkerOptions.resume`, off by default; `appendResumeUnmade` (`questions.ts`); the service's switch
  and `CUTROOM_RESUME_DELAY_MS`, 900000 (`apps/service/src/settings.ts`, `service.ts`); `EngineOptions.resume`
  (`tests/engine/harness.ts`). `tests/resume-failed-engine.test.ts`, checks 35 to 40; `reel-render` check 40 amended.
- `DECISIONS.md` — **S-174**: every job context's `resume` key required, `ResumeContext | undefined`; one rates
  mapping, `resumeRates`, exported from `@cutroom/worker` and used by the service.

### 2026-09-26 · session 57

- Slice 3, the resume made by a test (`395dc40`): `packages/contracts/src/resume.ts` — the resume's shapes, `Piece`
  local until Slice 4; `packages/pipeline/src/resume/index.ts` — `normalise`, `takedown`, `planResume`,
  `admitResume`; `packages/domain/src/resume.ts` — `readResumeInputs`, `resumeRun` (copies in the origin's row
  order); `reelSpentCents` and `imageCallCount` counting copies (`ledger.ts`); `enqueue`'s starting attempts
  (`queue.ts`, passed by `admitStills`, `advanceStills`, `advanceClips`); `receiptRuns` — labels in two runs
  (`pictures.ts`, `runs.ts`); the three guards and both stop questions on the reel's spend (`apps/worker`); the
  kept-take check (`pipeline/src/clips/index.ts`). `tests/resume-failed-resume.test.ts`, checks 12 to 25;
  `resumed()` and `Engine.settings` in `tests/engine/harness.ts`. Amendment blocks: `reel-plan`, `reel-stills`,
  `reel-render`, `reel-takes`, `paid-failures`.
- `PROMPTS/057` and `PROMPTS/README.md` — the Run line. `PROMPTS/058` — new: Slice 4 onwards, each slice by a builder.
- `DECISIONS.md` — **S-172**: one `slice-builder` agent (Opus, `.claude/agents/slice-builder.md`) builds each slice;
  the main session briefs, reads the diff, runs the full check and commits; `CLAUDE.md`'s agent list gains it.
  **S-173**: KnowScroll calls the engine through `@cutroom/sdk` — connect, or start when none answers — `cutroom-sdk`
  next after `resume-failed`, before `self-heal` (D-099 superseded in part).

### 2026-09-26 · session 56

- `docs/features/resume-failed.md` — the approving read, Gate review 12: three findings fixed, all four gates
  APPROVED 2026-09-26 (`a38edf5`). `DECISIONS.md` — **S-171**: a resumed run's named canonical with no slot for its
  repair makes its two candidates and stops for `gate-1` if both fail (the owner; D-047 steps 1 and 3 superseded
  for that case).
- Slice 1, the kind (`e67ec6f`): `packages/contracts/src/failures.ts` — five classes and `failureKindOf`; throw
  sites in `fal/image.ts`, `fal/queue.ts`, `minimax/narration.ts`, `ffmpeg/sensors.ts`, `gates/witness.ts`,
  `gate1s.ts`, `gate7.ts`, `apps/worker/src/transient.ts`; stand-ins' `as` (`fake/thrown.ts`); each stage's failed
  ending's `failure`; `db/migrations/0007_resume_failed.sql`; `endRun` and `RunEnding` (`domain/src/runs.ts`).
  `tests/resume-failed-kinds.test.ts`, checks 1 to 5; fixture `minimax-t2a-rejected`. Eight amendment blocks.
- Slice 2, what a crash keeps (`0f73e5d`): `readStillsInputs` (`domain/src/pictures.ts`); the stills ladder's kept
  input (`pipeline/src/stills/index.ts`); `reserveOf(placements, earlier, kept)` (`ladder.ts`); `seq` the greatest
  plus one (`ledger.ts`). `tests/resume-failed-stills.test.ts`, checks 6 to 11; `reel-stills` checks 48 and 49
  amended; `killedAgain` (`tests/engine/restart.ts`). Amendment blocks: `reel-stills`, `three-pictures`.
- `PROMPTS/056` and `PROMPTS/README.md` — the Run line. `PROMPTS/057` — new: Slice 3 onwards.

### 2026-09-26 · session 55

- Both explainer reels made, six real runs, 322¢: brief B (game graphics) completed at its fourth run, `d12931e1`,
  50.2 s; brief A (JoJo) at its second, `a1b8f2ee`, 52.5 s. The DNS lookup was 11 s at the start and under 1.1 s for
  every run. The Runs table above; both briefs as they completed and every run in `JOURNAL.md`.
- `docs/reel-pitfalls.md` — P-021 (the narration drawn as a subtitle), P-022 (a must-show's qualifier read as
  required), P-023 (illegible marks refused as lettering), P-024 (a 14.5-minute wait no row explains), P-025 (a
  recurring subject fills the unclaimed sentences); P-008 and P-018 recurred; their short-list rows, and P-020's state.
- `docs/research/refusals.md` — counts and ledger to 52 runs.
- `PROMPTS/055` and `PROMPTS/README.md` — the Run line. `scripts/real-reel.mjs` put back as HEAD has it.
- `DECISIONS.md` — **S-170**: `self-heal` is one harness around the run — make, check, heal, learn — with a rule book
  from failed runs; a learned rule binds once the owner approves it; the caller's criteria and claims healed in place
  only when the request opts in, never a sentence or a fact (D-096 superseded in part). `docs/features/self-heal.md` —
  its title, what the owner added, four more faults, gates 3 and 6 widened; then what the rule book teaches the prompts (no model is trained),
  the baseline — sessions 53 to 55, 19 runs, 4 reels, 649¢ — and the target its journey is held to.

### 2026-09-26 · session 54, continued

- `PROMPTS/055` — new: the two explainer reels again, brief B as it last ran and brief A as approved, a DNS lookup
  checked before every run (P-020). `resume-failed` renumbered 056 (`PROMPTS/056`, its feature file's pointer).
  `PROMPTS/README.md` — the rows and a note.

### 2026-09-26 · session 54

- Five real runs of the game graphics reel, none completed, 126¢: `a1cb6cfb` stopped at Gate 5 (a plural criterion id
  as a subject's name; lettering on hardware), then four failed on the network — the last two read to this machine's DNS,
  which takes 11 s on fal's IPv6 lookup against fetch's 10 s. JoJo never ran. The Runs table above; every run and brief
  B as it last ran in `JOURNAL.md`.
- `docs/reel-pitfalls.md` — P-017 to P-020 (lettering on objects that carry it; a plural id; a named game's character;
  the DNS) and their short-list rows. `docs/research/refusals.md` — counts and ledger to 46 runs; the first
  image-to-video takes refused.
- `PROMPTS/054` and `PROMPTS/README.md` — the Run line. `scripts/real-reel.mjs` put back as HEAD has it.

### 2026-09-25 · session 53, continued

- `docs/research/refusals.md` — new: every refusal of the 41 real runs, counted and listed, read from the database.
  42% of pictures refused, 30 of 36 for clipping; no clip made from a picture ever refused, 16 of 49 made from words.
- `PROMPTS/054` — new: two explainer reels, briefs approved; `resume-failed` renumbered 055 (and its feature file's
  pointer). `PROMPTS/README.md` — the rows and a note.
- `DECISIONS.md` — S-169: `self-heal`, a healer inside the engine, planned right after `resume-failed` (supersedes S-168
  in part). `docs/features/self-heal.md` — new, planned, gates not written.
- The owner: reels are to explain — facts, causes, plain words — not tell a story; the story tone was `PROMPTS/053`'s,
  not the engine's (the narration is the caller's text, S-134). A self-healing harness asked about: pieces exist, the
  whole does not; nothing decided.

### 2026-09-25 · session 53

- Eight real runs, two reels completed: tsunamis `d459f6f5` (49¢, 36.5 s) and honeybees `098e97fd` (53¢, 37.1 s);
  201¢ in all. The Runs table above. Both briefs word for word, and each run, in `JOURNAL.md`.
- `docs/reel-pitfalls.md` — P-013 and P-014 (engine: a network error ends a run; a witness answer that is not JSON is
  not asked again), P-015 and P-016 (brief: a criterion that names no scene; a thing hidden inside the subject), and
  their short-list rows. `scripts/real-reel.mjs` put back as HEAD has it: no code changed.
- `PROMPTS/053` and `PROMPTS/README.md` — the Run line.

### 2026-09-25 · session 52, continued

- `DECISIONS.md` — S-167: three kinds of reel; code-only reels planned; graphics over clips deferred, not rejected
  (supersedes S-166 in part). `docs/features/code-reels.md` — new, planned, three owner questions before its product
  gate. `docs/features/clip-overlays.md` — new, deferred. `docs/research/hyperframes.md` §8 — question 1 answered.
- `DECISIONS.md` — S-168: the order, reliability before speed. `PROMPTS/054` — `resume-failed`'s approving
  read, then its build (053 at `b1ffcfd`); `parallel-shots`' text kept at `b15d203`. `PROMPTS/053` — new: two test
  reels, honeybee swarm and tsunami, no check run. `PROMPTS/README.md` — the rows and a note.

### 2026-09-25 · session 52

- `docs/features/resume-failed.md` — four gates, 44 checks, 7 slices; eleven review rounds, round 10 would approve, round
  11's five findings fixed, the approving read in 054 (the owner stopped the review). S-161 to S-164 (DECISIONS.md).
- `docs/features/caption-match.md`, `composed-hold.md`, `diagram-shots.md` — new, planned, gates not written (S-165,
  S-166). S-165: P-011 exact comparison, P-010 two registry entries to go, P-003 accepted. `docs/reel-pitfalls.md`'s
  short list; `docs/research/hyperframes.md` §8 answered. `PROMPTS/053` — `parallel-shots`' gates.

### 2026-09-25 · session 52, its start

- `CLAUDE.md` § Subagents — four standing rules on context cost; this file named first (S-160).
- `docs/context.md` — new: this file. `tests/context-file.test.ts` — new: its sections, its 300 lines, and its newest
  change the journal's newest session. `scripts/check.mjs` — the test is a fourth scan, so `--changed` runs it on
  documents alone (S-160, S-159).
- `.claude/agents/gate-reviewer.md`, `test-impact.md`, `run-reader.md` — each reads this file first (S-160).
- `docs/STATUS.md` — marked a 2026-09-20 snapshot, superseded as a status by this file.
- `.claude/hooks/session-start.sh` — prints this file's "Where things stand" and the journal's newest heading, not
  the last two journal entries (S-160).
- `PROMPTS/052` — step 2 asks the owner five questions about pieces a caller names to be made again on a resume;
  its "How to work" carries S-160's rules. `docs/features/resume-failed.md` — the addition, under what is still for
  the gates (`6566f1d`).

### 2026-09-25 · session 51

- `scripts/check.mjs`, `tests/check-changed.test.ts` — `--changed`: documents alone run format, scans and authority,
  about 13 s; code runs everything (S-159, `a45def7`). `CLAUDE.md` — when `--changed` is enough.
- `scripts/real-reel.mjs` — the hurricane brief (`ba1be17`); run `74bb96a0` completed.
- `docs/research/hyperframes.md` — both session-51 reels: timings, tokens, nineteen rules. `docs/reel-pitfalls.md` —
  P-012. `PROMPTS/052` — written from 051 (`099af7f`).

## Where to look

| to learn                         | read                                                             |
| -------------------------------- | ---------------------------------------------------------------- |
| a decision                       | `grep -n '^## S-157' DECISIONS.md`, then that entry's lines only |
| a D-entry                        | `steering-ref/steering/DECISIONS.md`, the same way               |
| a session's reasoning            | `grep -n '^## 2026-09-25' JOURNAL.md`, then that entry           |
| a feature's state                | `docs/features/<slug>.md`: its `Status:` and `Gates:` lines      |
| a pitfall                        | `docs/reel-pitfalls.md`, the short list, then the `### P-` entry |
| why pieces were refused, counted | `docs/research/refusals.md`: every refusal of the real runs      |
| a run's rows                     | the `run-reader` agent, with the run's id                        |
| how to run checks, and the traps | `CLAUDE.md`                                                      |
