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
  journey at `18e9a48` (`5bd079c`); its Slice 4 sole compatibility re-journey at `5bd079c` FAILed on `format`
  (`3b50714`). The re-journey list is closed on file; the FAIL has not weakened any check, timeout, test or rule.
  **Stopped**: `one-subject` (S-149). **Planned, gates not written**: `caption-match` (S-165), `composed-hold`,
  `diagram-shots` (S-166), `code-reels` (S-167), `self-heal` (S-169, S-170), `video-edits`,
  `parallel-shots` (S-115, no file yet). **Deferred, no place in the queue**: `clip-overlays` (S-167).
- **Three kinds of reel** (S-167): footage (built), hybrid (`diagram-shots`), code-only (`code-reels`).
- **Next**: finish SDK v1 before `self-heal` (S-179). First run
  `PROMPTS/073-cutroom-sdk-format-finding.md` resolution A: format the two pre-existing Markdown failures plus the
  unrun prompt itself, bind a fresh full check to the new tree, and rerun the SDK and `reel-contract` journeys to
  PASS. Then run
  `PROMPTS/074-cutroom-sdk-v1-delivery-gates.md`: plan and adversarially approve the linked Cutroom release and
  KnowScroll integration gates for Linux, with no Windows-only or source-checkout assumption and no implementation
  before approval. Build prompts follow only after both gate sets pass review. SDK v1 is complete only when a clean
  Linux install proves KnowScroll using the packaged SDK to join or start one separate Cutroom process. Then come
  `self-heal`, session 53's P-013/P-014 findings, `caption-match`, `composed-hold`, `diagram-shots`, `code-reels`, and
  `parallel-shots`' gates from `b15d203`.
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

### 2026-09-28 · session 64

- Read Slice 0 against the approved readiness gate and current tests. It is not safe to begin Slice 1 from the
  committed record: its table assigns readiness to a new dedicated test and leaves `reel-plan` unchanged, while
  its later section requires two `reel-plan` amendments; one of those wrongly makes an in-memory readiness route
  return 500 when unrelated database tables are dropped. It also names the required
  `tests/resume-failed-contract.test.ts` caller change, then claims no `resume-failed` file references the new
  option. The exact Slice 4 re-journey list is therefore not established.
- `PROMPTS/064-cutroom-sdk-slice-1.md` — the corrected handoff. First repair and separately commit Slice 0's
  impact record; then one builder adds the strict readiness schema/route, single-read getter, service/harness
  lifecycle and dedicated no-write/500 tests. It leaves `reel-plan`'s route matrix alone and stops before Slice 2.
  `PROMPTS/063` now records that session 63 ran Slice 0 only; the prompt index gains 064.
- Current-HEAD startup evidence: decisions current (115, none unpushed), drift green (143 modules), and
  `node scripts/check.mjs --code` fully green; its serial test step took 2,065,804 ms.

### 2026-09-28 · session 63

- `docs/features/cutroom-sdk.md` — all four S-173 gates are **approved by adversarial review**. The Contract V1 audit finds three post-original-package additions the SDK must expose: required `Criterion.type`/presence-only `mustNotShow` (`reel-stills`); required `RunRecord.takes` (`reel-takes`); and `resume-failed`'s `Piece`, `ResumeRequest`, all `ResumeResponse` arms, resume route, `RunStatus.resumes`/`resumedBy`, and record `keptFrom`. The approved plan maps all eight current routes, validates both directions, defines strict `GET /v1/ready` 200/503 bodies and joins an already-booting peer rather than launching another child, fixes creator-owned close, and limits `packages/sdk` to the contract and Node built-ins. No implementation exists.
- `DECISIONS.md` — S-175 records the owner's answer: KnowScroll supplies an explicit program-and-argument launcher when it expects the SDK to start an absent service. The SDK has no source-entrypoint default, invokes no shell, stays on the fixed loopback port, and stops only its own child. Adversarial review closed its readiness, ownership, error-shape and boundary gaps; the genuinely green full preflight remains the sole pre-code blocker.
- **Checks observed**: `node scripts/decisions.mjs --fetch` found the steering pin current (`e05e9f0`, 115 decisions, none unpushed); `drift.mjs` was green (143 modules, no violations). A new full `check.mjs --code` passed typecheck, lint, format, boundaries, proofs and audit, then failed tests after 462.506 s; its wrapper omitted the failing TAP line. This is a pre-code finding, not an SDK defect.
- **Failure identified**: the direct aggregate test command, with full TAP held outside the repository, found the sole failure: `reel-render-secrets.test.ts` check 50. Its child runs every other reel-render test with PATH only and `--test-concurrency=4`; under the aggregate's concurrent load, it remained running at its unchanged 300 s timeout (`300222.044 ms`). Its parent then asserts `suite.status === 0` and fails. The aggregate summary was 605 pass / 1 fail, 606 total, 460705.398 ms. This is the prior load-sensitive transient, now identified rather than attributed to the SDK.
- **Preflight re-run**: at the owner's request, one `node scripts/check.mjs --code` re-run passed typecheck, lint, format, boundaries, boundary proof and dead-rule audit, but its aggregate tests failed after 458.053 s. The wrapper again retained only its first TAP lines, all passing, and supplied no test identity. No retry, timeout, test or code change followed. The green pre-code gate remains unmet, so no Slice 1 implementation plan was written.
- **Reliability repair and preflight**: S-176 makes the aggregate test runner serial while preserving every nested PATH-only journey's own concurrency, assertions and 300-second bound; failed-command output now retains the final 80 lines. The verified `node scripts/check.mjs --code` was fully green: its tests step took 1,476,701 ms. `PROMPTS/063-cutroom-sdk-slices-0-1.md` now gives a no-duplicate-preflight execution plan for Slice 0's precise impact record and Slice 1's readiness contract. No SDK source exists.

### 2026-09-28 · session 62

- `PROMPTS/062` run; all five held re-journeys PASS in the order the prompt named. The full `node scripts/check.mjs --code` preflight was fully green (typecheck 715 ms, lint 26 s, format 14 s, boundaries 1.3 s, boundary proofs 3.8 s, no dead rule 68 ms, tests 408 s) on commit `51212ed`, with no diagnostic rerun needed. Five re-journeys, each from a clean tree, each one result commit: `paid-failures` 17 tests (`cfbb453`), `ask-again` 23 (`9f93d72`), `second-ask` 9 (`bc4c35d`), `paid-path` 120 (`5d4faa7`), `three-pictures` 12 (`50e1ffc`). Every Evidence line names its input commit, its own tests passed, and Divergence is `none` for all five. With session 61's five (`8904d9a`, `860b7f7`, `8f67bf4`, `a86ca4c`, `f6e2a75`), all ten S-099 affected-feature re-journeys required by `resume-failed`'s Slice 7 are complete. Session 61's `paid-failures` FAIL at `cbffbc5` is the prior newest evidence line, now second; the load-sensitive reel-render-secrets transient did not recur. No implementation, gate, test, timeout or concurrency was changed; the prompt's session boundary was kept.

### 2026-09-28 · session 61, continued

- `PROMPTS/062-resume-failed-held-rejourneys.md` — the execution plan for the five re-journeys session 61 held after `paid-failures` recorded its full-check FAIL: a fully green `check.mjs --code` preflight, then `paid-failures`, `ask-again`, `second-ask`, `paid-path` and `three-pictures` serially, each from a clean tree and each generated result committed before the next. A FAIL is committed and stops the session; no check, timeout or concurrency is weakened. The independent audit reproduced the load finding with full TAP: 604/606 aggregate tests passed; `resume-failed` check 44 passed in 277.135 s; `reel-render` check 50 and `reel-takes` check 26 each hit its existing 300 s bound. Run alone and serially, those two passed in 231.349 s and 155.879 s. The prompt starts no later work and stops after the five journeys and their records.

### 2026-09-28 · session 61

- Slice 7 built (`aa9a9f4`): `tests/resume-failed-secrets.test.ts` — check 44, the PATH-only journey child, in S-028's form; the roll call is checks 1–40 then 43 (41 and 42 live in paid-path's `paid-path-real-reel.test.ts`, the only file allowed to name the script that spends). Concurrency 2 (the closest established PATH-only test, second-ask's check 9 and three-pictures' check 13); bound 600 s with S-107's headroom reasoning. The probe runs `process.execPath -e 'process.stdout.write(...)'` in the same bare environment, the canaries `sk-canary-not-a-real-key` and `fal-canary-not-a-real-key` are set here, asserted present, then looked for in the probe's output. The file is named to break three ways — inherit `process.env`, omit a feature test, drop the self-exclusion — and restored byte-for-byte in `finally` each time. `docs/features/resume-failed.md` Slice 7 ticked; the prompt's prompt fence (`~~~`) reformatted to the project's ` ``` ` style as one `prettier --write` cleanup of session 60's `1faf095`. Five of the ten S-099 amended features' re-journeys PASS — `reel-contract` 42 tests (`8904d9a`), `reel-plan` 50 (`860b7f7`), `reel-stills` 63 (`8f67bf4`), `reel-render` 106 (`a86ca4c`), `reel-takes` 66 (`f6e2a75`) — each its own commit. `paid-failures` re-journeyed FAIL at `cbffbc5`: the test phase of `node scripts/check.mjs` hit the same load-sensitive transient the journal has named since session 41 — `tests/reel-render-secrets.test.ts`'s check 50 child timed out at 300494 ms (its 300 s bound) with 605/606 tests passing. The feature itself is correct: it passes alone in 101 s and in the prior `check.mjs --code` runs that session 61 ran (each `tests` phase 374–409 s, all green). Per the prompt, the five PASS journeys are committed, the FAIL is committed as the finding, and the remaining five journeys (`ask-again`, `second-ask`, `paid-path`, `three-pictures`, the unpaid `paid-failures` rerun) are held for a session with a less loaded machine — `cutroom-sdk`'s gates (S-173) come next when that machine is free.
- **Checks**: `node scripts/check.mjs` ran green (typecheck, lint, format, boundaries, boundary proofs, no dead rule, tests, decisions pin, copied docs) on commit `aa9a9f4` (409 s) and on the prior four working-tree snapshots. The format check caught the prompt's `~~~` fences and was tidied; the tests phase reproduced the reel-render-secrets transient in two consecutive runs (`374 s green`, `415 s green`, `426 s green` then `708 s FAIL`) — the four successful runs were before any other shell work, the failing run after `node scripts/journey.mjs` had just run five features back-to-back.

### 2026-09-27 · session 60, continued

- `PROMPTS/061` — repaired before session 61: it now names the missing `resume-failed` check 44 file, treats the unnamed aggregate-test failure as a hard preflight, ticks and commits Slice 7 before `journey.mjs` can run, and gives all ten S-099 re-verification journeys a serial clean-tree/one-commit-per-result order. It also names the Journal, context and prompt-index finish work. No test was run in this documentation correction.

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
