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
  `resume-failed`, `yield-benchmark` (S-161 to S-164, S-171 to S-174, S-182 to S-186). `cutroom-sdk` carries `Status: verified` from its Slice 4
  journey at `1c7c77d` (`6a95a8d`); its sole compatibility re-journey at `6a95a8d` PASSed at `c15b2d4` after the
  journey writer's format invariant was repaired in `1c7c77d`. The re-journey list is closed on file; nothing has
  been weakened. **Stopped**: `one-subject` (S-149). **Planned, gates not written**: `caption-match` (S-165),
  `composed-hold`, `diagram-shots` (S-166), `code-reels` (S-167), `self-heal` (S-169, S-170), `video-edits`,
  `parallel-shots` (S-115, no file yet). **Deferred, no place in the queue**: `clip-overlays` (S-167).
- **`yield-benchmark` is BUILT and `Status: verified`** (session 87): its journey PASS at `d898693`, and
  `reel-stills`, `reel-render`, `paid-path` re-journeyed for the count (S-099's form, S-178's order). Gates
  approved by owner decision (S-185) and no reviewer, so **the slices carried the review**: 25 findings reported
  rather than built around, three gate sentences now known imprecise. **Enforced boundary rules: 25.**
  **Gates written and NOT approved**:
  `hosted-checks` (round 1 answered, on hold). **Gates not written, files only**: `yield-compare`,
  `benchmark-view` (both S-184), `run-provenance`, `picture-prompt`.
- **Three kinds of reel** (S-167): footage (built), hybrid (`diagram-shots`), code-only (`code-reels`).
- **Next: one older call is the owner's, then `self-heal`** — the three imprecise gate sentences session 87 found
  in `yield-benchmark`'s approved gates. **The scan hole that stood beside it is CLOSED (S-195, session 89)**: both
  file scans read tracked plus untracked-not-ignored files through `repoFiles()` in `tests/_files.ts`, so a slice's
  new files are scanned by the run that verifies them. Two cost levers are open and are the owner's calls, neither
  recommended now (session 90): §4.3 `hosted-checks` (CI, gates on hold) and §4.4 narrowing what each secrets child
  re-runs, which supersedes S-028 and narrows a proven property for about 200 s of a 617 s suite. **Journey reuse is
  CLOSED (S-188, session 88)**: a full run writes `.verification/receipt.json` and the journey re-runs nothing at
  that content, or only the document checks when Markdown alone differs.
  `hosted-checks` stays on hold. SDK v1 is complete on Cutroom's side (S-180, superseding S-179's
  integration scope). The
  `PROMPTS/073-cutroom-sdk-format-finding.md` chain is complete: the SDK journey at `1c7c77d` PASSed at `6a95a8d`,
  the `reel-contract` re-journey at `6a95a8d` PASSed at `c15b2d4`. **`PROMPTS/074-cutroom-sdk-v1-delivery-gates.md`
  is complete**: the `cutroom-sdk-package` journey PASSed at `2e66370` (every check green, 19 tests in
  `tests/cutroom-sdk-package-*.test.ts`); the `cutroom-sdk` re-journey at `5acba17` PASSed at `7c648d2`
  (84 tests after the package-owner test joined the `cutroom-sdk-*` glob; one transient FAIL was recorded
  per Slice 4 / S-178 and then superseded); the `reel-contract` re-journey at `7c648d2` PASSed at
  `6001657` (42 tests, no change). Reproducible build: `node scripts/package-sdk.mjs`; verified
  artifacts: `.package-staging/cutroom-reel-contract-1.0.0.tgz` and `.package-staging/cutroom-sdk-1.0.0.tgz`.
  No KnowScroll file, engine package, installer, registry publication or deployment work belongs to Cutroom.
  Then come `self-heal`, session 53's P-013/P-014 findings, `caption-match`, `composed-hold`,
  `diagram-shots`, `code-reels`, and `parallel-shots`' gates from `b15d203`.
- **KnowScroll and the engine** (S-173, settled session 57): the engine stays its own process (D-098); KnowScroll
  calls it through `@cutroom/sdk`, which connects to it, or starts the service as a child when none answers. D-099 in
  part superseded: two packages may be depended on from outside.
- **Reviews answered** (S-165): P-011's caption question gets an exact comparison (`caption-match`); P-010's two
  registry entries go, with their amended checks; P-003 accepted for now. None open.
- **Outside the engine**: reels made from code (Hyperframes) and hybrids — the engine's clips with layers drawn over
  them. Timings, token counts and rules: `docs/research/hyperframes.md`, sessions 50 and 51.
- **Checks**: session 87 ran four full suites green (tests 1420–1465 s) and four journeys. S-177 binds verification to the exact
  commit tree: ordinary slices run static/boundary checks plus named affected tests; full suites remain for checker,
  boundary, workspace/dependency and journey work — and, since **S-188**, for a journey only at content no green
  full receipt covers; `node scripts/check.mjs --documents` is the ~15 s set a Markdown change can fail. The known PATH-only child transient remains a full-suite signal;
  S-192 replaced S-176’s serial aggregate with two non-overlapping pools (617 s, lowest free memory 2483 MB over four green runs); every child bound is unchanged. A hosted run is corroboration only and carries no trailer (S-183).

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

### 2026-10-16 · session 90

- **The queue read, and this digest's stale "Next" corrected.** Line 38 still named the tracked-files scan hole
  as an open owner call; **S-195 closed it in session 89**, so the bullet now names the one older call that
  remains — the three imprecise `yield-benchmark` gate sentences — and records that §4.3 (`hosted-checks`) and
  §4.4 (narrowing the secrets children) are open owner calls that this session recommends against taking now:
  §4.4's own decision line in `docs/research/test_fixes_and_research.md` makes it conditional on §4.2 and §4.3
  not having made the suite cheap enough, and S-192 did (1455 s → 617 s), so its ~200 s no longer buys the
  narrowing of a proven property; §4.3 adds Ubuntu as a second platform for corroboration that carries no
  trailer (S-183). No code touched; `check.mjs --changed` is the whole verification a Markdown-only change owes
  (S-193). The journal was compacted to its 80-line budget first (sessions 72 and 73–75 merged, their detail in
  the commits and feature files per S-177) — the same thing session 85 did, and the reason this entry exists.

### 2026-10-15/16 · session 89

- **A recorded impact map answers "which tests" for a code diff** (**S-196**, superseding S-177 in part).
  `node scripts/impact-map.mjs` (402 s, 156 files) runs each test file alone under `NODE_V8_COVERAGE` and
  records what it and every process it spawned loaded, plus the repository paths it NAMES — which is how a
  test that copies a tool into a scratch repository is credited. The twelve PATH-only children are derived
  from their siblings and never measured: coverage reaches a child through an environment variable, which is
  what they exist to refuse (all twelve fail under it, naming `NODE_V8_COVERAGE`). `--changed` runs the
  static checks plus exactly the covering tests, pooled above eight files because 110 selected files cost
  1361 s serially against 617 s for the whole suite pooled.
- **Worth 617 s to 4 s on a peripheral change, close to nothing on an engine one.** 2 tests for
  `packages/sdk/src/launcher.ts`; 110–128 tests (91–93 % of the serial suite) for `reel-contract`,
  `pipeline`, `domain` or the API; **median 110 of 156**. Cause: D-094 — a package is entered only through
  its `src/index.ts`, so file-level coverage collapses to package-level. Function-level granularity would
  fix it and is NOT built, because a mapping mistake under-selects silently. Every uncertainty still owes
  the full run: unknown path, verification infrastructure, tooling configuration, missing map, uncovered
  file.

- **The scan hole is closed** (**S-195**, open since session 87): `no-absolute-paths` and `line-endings`
  enumerated `git ls-files` — tracked only — so a file a change ADDED was invisible to the run that
  verified it (the order is write, check, commit). One file, same bytes: untracked it passes, tracked it
  fails twice. Both scans now use `repoFiles(cwd)` in `tests/_files.ts` — tracked plus
  untracked-not-ignored — and the hole is proved closed end to end. `feature-files` and `context-file`
  read named paths and were never blind this way.

- **Markdown is a document wherever it lives** (**S-193**, superseding S-159 in part): `DOCUMENT` is
  `[/\.md$/]`, not three named places, so prose under `.claude/agents/`, a skill's `SKILL.md`, a package
  README or the copied authority runs `--changed`'s seven document checks instead of the full suite —
  which one stale sentence in an agent description had just cost this session. What executes stays code:
  `.claude/settings.json` and `.claude/hooks/*.sh` are still refused by name. `journey.mjs` reuses a
  recorded run for a prose-only delta anywhere, by the same list (S-188). **Verified targeted, not by the
  full suite (S-194, owner’s call against S-177)**: everything that reads `DOCUMENT` was enumerated —
  `check.mjs` and `reuseVerdict`, nothing else — so the slice was `check-receipt`, `check-changed` and
  `journey` plus every static check, 50 s; the gap is the 151 files that never read the rule.

- **§4.2 is built (S-192, superseding S-176 in part)**: the tests step is two pools that never overlap —
  142 ordinary files at 4, then the twelve PATH-only children at 2, each keeping its own ratified nested
  concurrency. **617 / 620 / 627 s over three consecutive green full runs against 1455 s**, 797 tests
  over 154 files, nothing skipped. **Lowest free memory 2483 MB of 15714 MB over four green runs** (5431 MB in three — the floor follows the machine, so judge a change by the receipt’s own `freeMinMB`); **worst child margin 155.7 s**
  (`reel-render-secrets`, 48 % of its 300 s bound). `scripts/run-tests.mjs` owns the pools and writes
  each one's time and floor into the receipt; `--serial` restores S-176's behaviour for a bisect.
- **The first attempt found a real fault, in a test's teardown rather than in the scheduler**:
  `cutroom-sdk-launcher` check 8 failed with `write EPIPE` after every assertion in its body passed,
  because a failed IPC send arrives as an `error` event on the child and nothing listened. Fixed by
  listening for exactly `EPIPE` and `ERR_IPC_CHANNEL_CLOSED`; no assertion changed; `cutroom-sdk`
  journey re-PASSed at `88c2bc4` (99 tests, from the recorded run).

- **§3 is taken, all 153 files** (**S-191**, superseding S-190 in part). The table is committed as
  `docs/research/test-file-costs.md`; the runner stays a throwaway in `.tmp/`, now writing one file per slice
  with a `missing` mode, so a kill costs one file — session 88’s partial data was one invocation from being
  overwritten — and keeping `.tmp/red-<file>.log` on a red.
- **The subtraction answers §4.2 before it is built.** 153 files alone cost **1501.7 s** (twelve secrets
  children **423.9 s**, the other 141 **1077.8 s**) against the suite’s **1455 s**: a difference of -46.7 s,
  which is the measuring runner’s own per-file overhead. **The serial suite already costs what its files cost**,
  so §4.2 can only win what real parallelism wins — floor 269 s at 4 ordinary, 212 s at 2 secrets, ~480 s for
  both classes — and memory, not arithmetic, is the open question.
- **One full suite is 274 file executions of 153 files**: 153 direct plus **121 nested** inside the twelve
  secrets children (`reel-render` 28, `reel-stills` 23, `reel-takes` 20, `reel-plan` 12, `paid-path` 11). The
  design — only running a journey with no secrets proves it passes with none — and the largest block in the
  suite, which puts **§4.4 ahead of §4.6** in value and in the owner’s hands.
- **The cost is 35 files**: 67 files under 3 s cost 90.7 s together; 35 files cost 742 s of 1077.8 s.
  **Twelve** secrets journeys, not eleven (`yield-benchmark-secrets`, session 87). Every child far inside its
  bound alone, worst `reel-render-secrets` 123.8 s of 300 s. Floor **3045 MB** of 15.3 GB.
- **One red, cause unrecovered**: `reel-render-secrets` failed once at 123.8 s with nothing else running, then
  passed alone at 100.6 s. The known PATH-only transient, but not explained by outer contention this time; its
  lines were discarded by the runner, and the next occurrence keeps them.

### 2026-10-15 · session 88

- **The verification receipt, and a journey that reads it** (**S-188**, from `docs/research/test_fixes_and_research.md`
  §4.0). New: `scripts/_verification.mjs` (+`.d.mts`) — the receipt, the document list, the tree a run tested, the
  tree delta, the reuse verdict — and `scripts/test-receipt.mjs`, a reporter that attributes each test to its file,
  because **Node 22.14's tap and junit reporters print one flat stream** for several files (measured here).
  `check.mjs` writes `.verification/receipt.json` (gitignored), gains `--documents`, and keeps one document list;
  `journey.mjs` runs nothing at a tree a green full receipt covers, `--documents` alone when only Markdown differs,
  and takes its test count from the receipt instead of running `tests/<slug>-*.test.ts` a second time.
- **The tested tree is the content, not the commit**: a dirty run records what `git add -A` would commit, through a
  throwaway index, so change → full run → commit stays reusable. The receipt folder holds a `.gitignore` of `*` and keeps
  itself out of every tree: a `:(exclude)` pathspec made `git add -A` exit 1 on an ignored path, so the tree
  came out undefined HERE while every scratch fixture passed — found by running it, now its own check and break.
- **The first real use amended it** (S-188 `Amended 2026-10-15`): the journey at `f06bc4e` ran nothing in
  **0.277 s** and reported `reel-plan`’s 51 tests, and then the `check.mjs --changed` run before the
  evidence commit **overwrote the reusable receipt** — the middle step of every chain. The last full run
  now keeps `receipt-full.json`; the journey reads only that.
- **§3 is half taken (S-190)**: 80 of 153 files timed alone, 644 s, no reds; killed at that point by the
  harness for system memory. Lowest free memory anywhere **3045 MB** of 15.3 GB — S-107’s 815 MB was
  overlap, not one file. Heavy files are the media ones. Six secrets journeys unmeasured, so **§4.2 is not
  sized**. Data: `.tmp/measure.json`, `.tmp/measure.md`; next: `PROMPTS/083-measure-and-schedule.md`.
- **Measured on this repository, both branches**: `reel-plan` 0.277 s and `reel-contract` 0.248 s with no
  check run, and `reel-stills` **18.4 s** on a one-document delta — 51, 42 and 63 tests, each the count
  already on file, against ~25 min a journey before. Evidence commits `11a9698`, `621d608`, `4c58af6`.
- **§4.1 built too, as S-189** (same session, owner’s word): **biome** replaces eslint and prettier for code —
  the `code` step **0.492 s** against 6.25 s + 5.74 s — and prettier keeps Markdown, YAML and the one HTML page,
  handed **file paths from git** (a glob matching nothing makes it exit 2). A full run and `--documents` check
  all 126 markup files, 8.7 s; a slice and `--changed` check only what differs, 0.26 s, and drop the step when
  nothing does. **Static cost: slice 30.3 s → 6.9 s, documents ~15 s → 1.2 s, full run 30.3 s → 15.4 s.**
  Eslint and three packages gone, its three rules carried by name; biome’s other thirteen are `warn`, so the
  gate did not widen. `biome check --write` refused: it rewrote imports in two verified features’ source.
- **Proof**: `tests/check-receipt.test.ts` (25 checks), six S-188 cases in `tests/journey.test.ts` watching what the
  journey invokes, and **fifteen deliberate breaks each seen red and restored**. CLAUDE.md's full-run sentence and
  `PROMPTS/081` written. Nothing weakened; no bound, check or secrets journey touched.

### 2026-10-14/15 · session 87

- **`yield-benchmark` is built and `Status: verified`**, four slices, one `slice-builder` each (S-172).
  **`d535a58`** (full): `packages/benchmark` — `index`, `measures`, `reasons` — its manifest, tsconfig,
  root and tooling references, workspace dependency, 10 row fixtures, the three boundary rules with `--prove`
  cases **generated from the rule's own enumeration**, and **every amendment taking 22 to 25 in one tree** (three
  test files, seven documents, the tenth-member enumerations, amendment blocks in the three features) — session
  86's discarded partial is why they are one commit. **`e9f1266`** (targeted): `ratings.ts`, the thirteen terms,
  S-182's weights and tolerances, the `r1` stamp, five worked fixtures at **0.0, 10.0, 10.0, 34.0, 89.7**, tie
  kept. **`11f036e`** (full): `scripts/benchmark.mjs` read-only through `node:sqlite`, its flags and four exit
  codes, and `docs/research/benchmark.md` — **52 rows written by the script** — with `refusals.md` and
  `yield-baseline.md` frozen onto it. **Slice 4**: four journeys PASS, 43 tests at `d898693`, then 63, 106, 120.
- **A verification hole, reported not patched**: Slice 3's full suite passed with a D-086 violation in
  `scripts/benchmark.mjs` — the four file scans read **tracked** files, and it was untracked when that suite ran.
  Source fixed at `d898693`, check untouched. **`963be3c`**: S-182's second amendment (24.4 and "no tie"
  superseded by 10.0 and a kept tie) and **S-186**, `benchmark-no-io` naming no `dependencyTypes` because bare
  `sqlite` is not a builtin (31 of 32 spellings fire with it). **`050536a` then closed `pipeline-no-io`'s own
  gap (S-187)** at the owner's word: the attribute dropped, its pattern untouched, its proof grown from one case
  to 30, and `reel-plan` re-journeyed PASS at `050536a` with 51 tests. `--prove` now fires 25 rules over 131 cases.
- Also reported: the `hold` table is **empty over all 52 runs**; the record is a migration behind `schema.ts`, so
  the reader reports five columns absent, never zero. Sessions 79–82 dropped for the cap; git keeps them. Nothing
  weakened, nothing spent, no reel made.

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
| what every run did, scored       | `docs/research/benchmark.md`, 52 rows, written by the script     |
| how to run checks, and the traps | `CLAUDE.md`                                                      |
| how the code fits together       | `knowledge-transfer/cutroom-kt.html`, opened in a browser        |
