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
  **Stopped**: `one-subject` (S-149). **Gates written, approval read due in 053**: `resume-failed` (S-161 to S-164). **Planned, gates not
  written**: `caption-match` (S-165), `composed-hold`, `diagram-shots` (S-166), `code-reels` (S-167), `video-edits`,
  `parallel-shots` (S-115, no file yet). **Deferred, no place in the queue**: `clip-overlays` (S-167).
- **Three kinds of reel** (S-167): footage (built), hybrid (`diagram-shots`), code-only (`code-reels`).
- **Next, in the owner's order — reliability before speed (S-168)**: `PROMPTS/053` — `resume-failed`'s one approving
  read, then its build, slice by slice. Then `caption-match`'s gates and build, with the registry change S-165 decided.
  Then `composed-hold`, `diagram-shots`, `code-reels`. Then `parallel-shots`' gates, from the prompt at `b15d203`.
- **Parked by the owner**: how KnowScroll uses the engine — an `@cutroom/sdk` package that starts the service, or an
  in-process library against D-098. Nothing decided; the journal's session 52 (S-167) entry has the options.
- **Reviews answered** (S-165): P-011's caption question gets an exact comparison (`caption-match`); P-010's two
  registry entries go, with their amended checks; P-003 accepted for now. None open.
- **Outside the engine**: reels made from code (Hyperframes) and hybrids — the engine's clips with layers drawn over
  them. Timings, token counts and rules: `docs/research/hyperframes.md`, sessions 50 and 51.
- **Checks**: the last full `check.mjs` green on session 52's session-start hook commit; every later commit is
  documents, or names its own full run below. `check.mjs --changed` between steps (S-159).

## Runs

Every real run in `data/cutroom.sqlite`, newest first, read from its `run` row; cents by our receipts. A run's detail
comes from the `run-reader` agent; a pitfall's, from `docs/reel-pitfalls.md`.

| run        | UTC date   | world           | ending               | ¢   | what ended it                                                           |
| ---------- | ---------- | --------------- | -------------------- | --- | ----------------------------------------------------------------------- |
| `74bb96a0` | 2026-09-24 | hurricanes      | completed            | 56  | first try; shot 4's picture refused twice, made from words (P-012)      |
| `bf8f4444` | 2026-09-24 | volcanoes       | stopped              | 55  | Gate 7 said no to the caption question on a correct cut (P-011)         |
| `bad736d1` | 2026-09-24 | volcanoes       | failed               | 8   | nano-banana-2 made 768×1376, not the frame (P-010)                      |
| `9b23d24a` | 2026-09-24 | volcanoes       | failed               | 10  | fal's flux answered 504 on shot 4's picture (P-009)                     |
| `124f1124` | 2026-09-24 | volcanoes       | failed               | 0   | fal's flux answered 504 on shot 0's picture (P-009)                     |
| `05611ff9` | 2026-09-24 | black-holes     | completed            | 53  | the first black-holes reel                                              |
| `af7447f0` | 2026-09-24 | black-holes     | stopped              | 60  | Gate 5, shot 4's three takes: one claim over two shots (P-008)          |
| `12a097bf` | 2026-09-24 | black-holes     | stopped              | 45  | Gate 7 said no: repetition (P-006); a voice under it (P-007)            |
| `c52d418a` | 2026-09-23 | black-holes     | failed               | 15  | the witness's count refused (P-004)                                     |
| `c9f3df47` | 2026-09-23 | black-holes     | failed               | 10  | the witness answered a count as words (P-004)                           |
| `879a27b7` | 2026-09-23 | black-holes     | stopped              | 53  | Gate 2, shot 2's three takes: clipped subject, dark end (P-002, P-003)  |
| `ee63e617` | 2026-09-23 | black-holes     | failed               | 15  | MiniMax repeated a word in its timings (P-001); `resume-failed`'s cause |
| `436564c1` | 2026-09-23 | first-real-reel | completed            | 228 |                                                                         |
| `a08a9c9c` | 2026-09-23 | first-real-reel | stopped              | 231 | the budget                                                              |
| `f895e76d` | 2026-09-23 | first-real-reel | completed            | 160 | the first completed real reel                                           |
| 18 runs    | 09-21, 22  | first-real-reel | 14 failed, 4 stopped | 554 | the paid path's first contact — below                                   |

The first 18, in the order made: `9cdadf20` MiniMax 401, `80c959ef` 402; `53710655` the plan's shape; `e1adc629` the
reconciler 400, `00aa29ec` fenced JSON, `87227235` 180 s with no answer; `8f9c921e` and `f9507840` seedream's result
and its 1920×3416 frame; `4938925b` the planner's reasoning and no answer, `5df208e3` its schema echoed back;
`bef01ee5` and `c4c9b112` a subject id refused; `4ce2d176` and `ad65acbe` the witness's answer refused; `e590de48`,
`56a0a2b2` and `46354140` Gate 1 three times on one picture; `ffbd04b5` Gate 7 said no, 202¢.

## Changes

Newest first. Each: where, what, and the decision or the reason — enough that an agent need not diff to know.

### 2026-09-25 · session 52, continued

- `DECISIONS.md` — S-167: three kinds of reel; code-only reels planned; graphics over clips deferred, not rejected
  (supersedes S-166 in part). `docs/features/code-reels.md` — new, planned, three owner questions before its product
  gate. `docs/features/clip-overlays.md` — new, deferred. `docs/research/hyperframes.md` §8 — question 1 answered.
- `DECISIONS.md` — S-168: the order, reliability before speed. `PROMPTS/053` — rewritten: `resume-failed`'s approving
  read, then its build; `parallel-shots`' text kept at `b15d203`. `PROMPTS/README.md` — its row and a note.

### 2026-09-25 · session 52

- `docs/features/resume-failed.md` — four gates, 44 checks, 7 slices; eleven review rounds, round 10 would approve, round
  11's five findings fixed, the approving read in 053 since S-168 (the owner stopped the review). S-161 to S-164 (DECISIONS.md).
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

### 2026-09-24 · session 50

- `scripts/real-reel.mjs` — the volcano brief (`497182b`); runs `124f1124` to `bf8f4444`.
- `docs/reel-pitfalls.md` — P-009 to P-011 (`e143cea`). `docs/research/hyperframes.md` — the hybrid reel, §4 F and
  §4 C (`3338cc2`, `728a29a`).

## Where to look

| to learn                         | read                                                             |
| -------------------------------- | ---------------------------------------------------------------- |
| a decision                       | `grep -n '^## S-157' DECISIONS.md`, then that entry's lines only |
| a D-entry                        | `steering-ref/steering/DECISIONS.md`, the same way               |
| a session's reasoning            | `grep -n '^## 2026-09-25' JOURNAL.md`, then that entry           |
| a feature's state                | `docs/features/<slug>.md`: its `Status:` and `Gates:` lines      |
| a pitfall                        | `docs/reel-pitfalls.md`, the short list, then the `### P-` entry |
| a run's rows                     | the `run-reader` agent, with the run's id                        |
| how to run checks, and the traps | `CLAUDE.md`                                                      |
