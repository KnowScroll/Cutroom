---
status: current
authority: a digest for agents, not a plan — every line names its source, and the source wins
---

# Context — read this first

**What an agent reads before anything else** (S-160): where things stand, every real run and what stopped it, and what
changed where — so no agent looks round the repository to learn it. Open a source only for the line you need, by the
name it gives: `grep -n '^## S-177' DECISIONS.md`, never the whole file. `DECISIONS.md` is the authority; the compact
`JOURNAL.md` links to historical detail under `docs/history/`; this file stays under 300 (`tests/context-file.test.ts`).

**Kept by every session**: its entry under Changes — newest first, the same session as `JOURNAL.md`'s newest entry,
or the check is red — and any row or line below its work made untrue. Changes older than ten sessions are dropped;
git and the journal keep them.

## Where things stand

- **The engine is built end to end on real providers** (`paid-path`): a brief becomes a plan (MiniMax), pictures
  (fal, `flux-2-pro/edit`), clips (fal, `minimax-h3-turbo`), narration (MiniMax speech) and one cut through ffmpeg,
  judged by Gates 0 to 7. A reel costs about 55¢ against a 250¢ ceiling (D-014). Run: `scripts/real-reel.mjs`.
- **Verified features** (`docs/features/<slug>.md`, `Status:` line): `reel-contract`, `reel-plan`, `reel-stills`,
  `reel-render`, `reel-takes`, `paid-path`, `paid-failures`, `second-ask`, `three-pictures`, `ask-again`, `cut-rules`,
  `resume-failed` (S-161 to S-164, S-171 to S-174). `cutroom-sdk` carries `Status: verified` from its Slice 4
  journey at `1c7c77d` (`6a95a8d`); its sole compatibility re-journey at `6a95a8d` PASSed at `c15b2d4` after the
  journey writer's format invariant was repaired in `1c7c77d`. The re-journey list is closed on file; nothing has
  been weakened. **Stopped**: `one-subject` (S-149). **Planned, gates not written**: `caption-match` (S-165),
  `composed-hold`, `diagram-shots` (S-166), `code-reels` (S-167), `self-heal` (S-169, S-170), `video-edits`,
  `parallel-shots` (S-115, no file yet). **Deferred, no place in the queue**: `clip-overlays` (S-167).
- **Three kinds of reel** (S-167): footage (built), hybrid (`diagram-shots`), code-only (`code-reels`).
- **Next**: finish SDK v1 before `self-heal` (S-180, superseding S-179's integration scope). The
  `PROMPTS/073-cutroom-sdk-format-finding.md` chain is complete: the SDK journey at `1c7c77d` PASSed at `6a95a8d`,
  the `reel-contract` re-journey at `6a95a8d` PASSed at `c15b2d4`. Next run `PROMPTS/074-cutroom-sdk-v1-delivery-gates.md`:
  approve the minimal package gates, build portable installable `@cutroom/sdk` and `@cutroom/reel-contract` artifacts,
  and prove them from a temporary external consumer. No KnowScroll file, engine package, installer, registry publication
  or deployment work belongs to Cutroom. SDK v1 is complete when the consumer-neutral package journey and exact affected
  re-journeys PASS. Then come `self-heal`, session 53's P-013/P-014 findings, `caption-match`, `composed-hold`,
  `diagram-shots`, `code-reels`, and `parallel-shots`' gates from `b15d203`.
- **KnowScroll and the engine** (S-173, settled session 57): the engine stays its own process (D-098); KnowScroll
  calls it through `@cutroom/sdk`, which connects to it, or starts the service as a child when none answers. D-099 in
  part superseded: two packages may be depended on from outside.
- **Reviews answered** (S-165): P-011's caption question gets an exact comparison (`caption-match`); P-010's two
  registry entries go, with their amended checks; P-003 accepted for now. None open.
- **Outside the engine**: reels made from code (Hyperframes) and hybrids — the engine's clips with layers drawn over
  them. Timings, token counts and rules: `docs/research/hyperframes.md`, sessions 50 and 51.
- **Checks**: Slice 1’s `127adc5` recorded a full green check (tests 1413 s). S-177 now binds verification to the exact
  commit tree: ordinary slices run static/boundary checks plus named affected tests; full suites remain for checker,
  boundary, workspace/dependency and journey work. The known PATH-only child transient remains a full-suite signal;
  S-176’s serial aggregate and existing child bounds stand.

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

### 2026-09-30 · session 77

- Repaired `scripts/journey.mjs` so the writer leaves every feature file format-clean: the Divergence
  replacement now trims to a single trailing newline, no matter where Divergence lives. Without this fix the
  journey appended a trailing blank line to any feature whose last section is Divergence (as in
  `docs/features/cutroom-sdk.md`), which `prettier --check` rejects. Two regression cases in
  `tests/journey.test.ts` cover the PASS and FAIL paths.
- The interrupted prompt-073-A PASS chain is now complete: `fix(journey): preserve the file's format
invariant; complete the PASS chain` at `1c7c77d` (full preflight, tree `35d3382…`); SDK journey PASS at
  `6a95a8d`; `reel-contract` re-journey PASS at `c15b2d4` — every check green, 42 tests in
  `tests/reel-contract-*.test.ts` pass, Divergence reset to `none`, both feature files format-clean. The same
  writer fix keeps subsequent runs green.
- `docs/features/cutroom-sdk.md` was prettier-formatted at `1c7c77d` (the trailing-blank-line shape the journey
  would write, applied once by hand so the commit's tree carries `Verification: full`); the SDK journey then
  wrote a real evidence line on a clean file.

### 2026-09-30 · session 76

- S-181 records the future `reel-series` feature: one topic-level brief plus a positive integer `n` produces
  exactly `n` ordered, individually complete reels, planned together and made serially. Neither variants of one
  brief nor fragments of a long reel; the public API, gates and queue order remain unwritten.
- `docs/features/reel-series.md` is the recorded feature stub, with the future success criteria, edge cases
  the gates must cover and the open questions for gate review. No implementation, boundary or check change
  is added.

### 2026-09-30 · session 75

- Resolution A of `PROMPTS/073-cutroom-sdk-format-finding.md` ran end to end. `prettier --write` removed the
  pre-existing format failures from `docs/features/cutroom-sdk.md`, `docs/context.md`, and `PROMPTS/073-cutroom-sdk-format-finding.md`;
  the formatting commit `48a6746` carries a full-green `check.mjs` evidence (`Verification: full`, tree
  `85cd3ec2`). The SDK journey at `48a6746` PASS at `3226321`. The `reel-contract` re-journey at `3226321`
  FAILed on `format` at `647c5e6` — the same divergence session 72 caught at `3b50714`, now legible: the SDK
  journey's own modification to `docs/features/cutroom-sdk.md` appended an evidence line and a trailing blank
  line, and `prettier --check` rejects that file. The session stops per Slice 4's wording; no check, journey,
  timeout, test or boundary rule was changed. The owner decides between widening `.prettierignore` (resolution B),
  fixing `scripts/journey.mjs` so the writer leaves the file format-clean (resolution A's missing pre-condition),
  or another outcome; prompt 074 then runs after that.

### 2026-09-30 · session 74

- S-180 corrects S-179's scope: Cutroom ships and proves portable consumer-neutral SDK/contract packages; consumers
  own KnowScroll or any other integration, engine installation and launcher configuration. The unrun prompt 074 now
  approves minimal package gates, builds the artifacts and proves a clean external installation; it contains no
  consumer edit, engine bundle, registry publication, OS installer, activation or rollback work.

### 2026-09-30 · session 73

- S-179 extends the SDK-first queue through an actually installable v1: Linux is the deployment target; Windows-only
  and source-checkout delivery are rejected; `self-heal` waits. `PROMPTS/074-cutroom-sdk-v1-delivery-gates.md` plans
  linked Cutroom-release and KnowScroll-integration gates after prompt 073 resolution A restores full-green evidence.
  No packaging or integration implementation began. The document check also found the unrun prompt 073 itself needs
  Prettier, so its resolution-A command now names three files rather than leaving its own formatting failure behind.

### 2026-09-30 · session 72

- `cutroom-sdk` Slice 4 ran end to end. The SDK journey PASS at `18e9a48` (every check green, 65 tests in
  `tests/cutroom-sdk-*.test.ts` pass, Status flipped to `verified`); committed as `5bd079c docs(cutroom-sdk):
journey PASS at 18e9a48`. The `reel-contract` re-journey FAILed on `format` at `5bd079c`: `prettier --check .`
  reports `docs/features/cutroom-sdk.md` as the sole failing file. That file fails prettier at the S-176 baseline
  `019d2a9` (its first version) and at every slice commit since — the violation is pre-existing and the SDK
  journey reported green because it was the first invocation of that exact post-tick tree. The FAIL is committed
  as `3b50714 docs(reel-contract): re-journey FAIL at 5bd079c`. Per its wording, the session stops on first FAIL:
  no re-run, no re-journey, no check/timeout/test amendment. The owner decides whether the file is reformatted
  (and its new tree given a fresh full preflight per S-177), `.prettierignore` is widened, or the SDK status is
  amended by hand.
- Pre-session, the session 72 row began as the Slice 4 preparation tick only: the checkbox in
  `docs/features/cutroom-sdk.md` (line 360) was flipped, no source/test/contract/boundary/provider/database/media/
  secret/runtime was changed, `JOURNAL.md` gained the session-72 entry, `PROMPTS/README.md` updated the Run line
  for prompt 072, and `node scripts/check.mjs --changed` ran green on the document-only tree. The `Gates:` line
  case (`approved` vs `APPROVED`) was corrected in a separate preparation commit `18e9a8` to match the journey
  reader; no gate state changed.

### 2026-09-29 · session 71

- `cutroom-sdk` Slice 4 is now explicit and planned, not silently absent from the journey gate. S-178 fixes its
  evidence sequence: a clean tick commit, the no-provider SDK journey, then `reel-contract` alone, serially. The
  final re-journey's full check is the final Gate 4 proof; there is no duplicate aggregate run. `PROMPTS/072` records
  the executable stop-on-FAIL sequence. Slice 3's `ae0599a` verification was read through
  `verification-status.mjs`; no test command ran in this planning session.

### 2026-09-29 · session 70

- `cutroom-sdk` Slice 3 corrective evidence — the missing boundary rule, strict readiness, explicit-port handling,
  ordinary-environment inheritance, route-stand-in readiness handshake, and effect-based launcher tests are all
  proven by `node scripts/check.mjs` at this commit. Trailer `Verification: full`, `Verification-Tree` is the tree
  the trailers bind. Affected tests: `tests/cutroom-sdk-launcher.test.ts`, `tests/cutroom-sdk-routes.test.ts`,
  `tests/cutroom-sdk-readiness.test.ts`, `tests/boundaries.test.ts`, `tests/paid-path-keys.test.ts`,
  `tests/reel-render-rules.test.ts`, `tests/reel-stills-rules.test.ts`. Slice 4's journey and re-journeys remain
  unstarted.

### 2026-09-29 · session 68

- `cutroom-sdk` Slice 2 review corrections (`45b9de9`) — every SDK fetch now uses `redirect: 'manual'`, so a 3xx
  response becomes a request-stage protocol error before a loopback request body can be forwarded; the public-surface
  test references all six exported SDK types; explicit `:80` loopback origins are accepted while no-port origins remain
  rejected. Its targeted evidence binds tree `143d0bc4f3054ecacf854b8f5ff32a3c5a3d36b9` to the route, workspace and
  boundary tests.
- `PROMPTS/069-cutroom-sdk-slice-3.md` — the next-session launcher-lifecycle handoff. It keeps child-process access
  in one private SDK module, uses stand-in-only integration tests, proves the launcher-only boundary by resolved path,
  and requires a final full check because the boundary configuration and its proof script change. `PROMPTS/065` now
  names its completed session and the prompt index has the Slice 2 and Slice 3 rows.

### 2026-09-29 · session 65

- **S-177** replaces repeated full-suite startup/ordinary-slice checks with commit-tree-bound verification evidence.
  `check.mjs --slice` runs static checks, boundary proofs and the approved affected tests, refusing unlisted changed
  tests, unknown paths and verification infrastructure; the latter, workspace/dependency changes and journeys remain
  full-suite work. `verification-status.mjs` validates the current commit’s trailers without rerunning a prior result.
- `JOURNAL.md` is now a short operational index; sessions 01–64 are preserved byte-for-byte in
  `docs/history/JOURNAL-through-session-64.md`. The stop gate now requires a committed source tree with valid evidence
  instead of starting the aggregate suite again. Slice 1’s readiness test now asserts exactly one getter call per probe.

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
