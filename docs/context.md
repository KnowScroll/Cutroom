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
or the check is red — and any row or line below its work made untrue. **What another file carries is not kept here**
(session 90): Changes older than ten sessions go, an older session's entry is compressed to its decisions and
figures once its `S-` entries exist, and Runs lists 2026-09-25 onward — every earlier run is a scored row in
`docs/research/benchmark.md` and a `P-` entry in `docs/reel-pitfalls.md`.

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
- **`yield-benchmark` is BUILT and `Status: verified`** (session 87): every run scored part by part, the ledger at
  `docs/research/benchmark.md`. Its gates were approved by owner decision (S-185) and no reviewer, so **the slices
  carried the review**: 25 findings reported rather than built around, of which **three imprecise gate sentences
  are named in that file's amendment block** (S-197) and the other 22 are lost with session 87's hand-backs.
  **Enforced boundary rules: 25.** **Gates written and NOT approved**: `yield-compare` (all four, refused by
  round 1 on 22 findings and by a fresh round 2 on 24, every one answered; S-199 and its amendment) and
  `hosted-checks` (round 1 answered, on hold).
  **Gates not written, files only**: `benchmark-view` (S-184), `run-provenance`, `picture-prompt`.
- **Three kinds of reel** (S-167): footage (built), hybrid (`diagram-shots`), code-only (`code-reels`).
- **Next: the owner's call on `yield-compare`'s round 3** (`PROMPTS/086`), then `benchmark-view`'s four gates
  (S-184's split, S-198; the owner's word on 2026-10-16). Two adversarial rounds have refused all four gates,
  46 findings between them, 45 applied and 1 refused; S-199 and its amendment settle the choices. Nothing is
  approved, so no implementation file may exist yet. Then `self-heal`, session 53's
  P-013/P-014 findings, `caption-match`, `composed-hold`, `diagram-shots`, `code-reels`, and `parallel-shots`'
  gates from `b15d203`. Both of session 87's older calls are closed (S-195, S-197). Two cost levers stay open and
  are the owner's, neither recommended now (session 90): §4.3 `hosted-checks` (CI, gates on hold) and §4.4
  narrowing what each secrets child re-runs, which supersedes S-028 and narrows a proven property for about 200 s
  of a 617 s suite.
- **SDK v1 is complete on Cutroom's side** (S-180, superseding S-179's integration scope): `cutroom-sdk` and
  `cutroom-sdk-package` verified, their journey chains closed, reproducible build `node scripts/package-sdk.mjs`,
  artifacts under `.package-staging/`. No KnowScroll file, engine package, installer, registry publication or
  deployment work belongs to Cutroom. The commits and the two feature files hold every journey's commit and count.
- **KnowScroll and the engine** (S-173, settled session 57): the engine stays its own process (D-098); KnowScroll
  calls it through `@cutroom/sdk`, which connects to it, or starts the service as a child when none answers. D-099 in
  part superseded: two packages may be depended on from outside.
- **Reviews answered** (S-165): P-011's caption question gets an exact comparison (`caption-match`); P-010's two
  registry entries go, with their amended checks; P-003 accepted for now. None open.
- **Outside the engine**: reels made from code (Hyperframes) and hybrids — the engine's clips with layers drawn over
  them. Timings, token counts and rules: `docs/research/hyperframes.md`, sessions 50 and 51.
- **Checks**: S-177 binds verification to the exact commit tree, and **S-196** answers which tests a code diff owes
  from the recorded impact map (`node scripts/impact-map.mjs`); a full suite is **617 s** in two non-overlapping
  pools (S-192, judge a later change by the receipt's own `freeMinMB`), a Markdown change costs
  `node scripts/check.mjs --documents`, and a journey re-runs nothing at content a green full receipt covers
  (S-188). The full run stays for checker, boundary, workspace/dependency work and an unclassified diff (S-188's
  list). The known PATH-only child transient remains a full-suite signal; no child bound has moved. A hosted run is
  corroboration only and carries no trailer (S-183).

## Runs

Every real run in `data/cutroom.sqlite`, newest first, read from its `run` row; cents by our receipts. A run's detail
comes from the `run-reader` agent; a pitfall's, from `docs/reel-pitfalls.md`.

| run                                                                                                                   | UTC date   | world         | ending    | ¢   | what ended it                                                                           |
| --------------------------------------------------------------------------------------------------------------------- | ---------- | ------------- | --------- | --- | --------------------------------------------------------------------------------------- |
| `a1b8f2ee`                                                                                                            | 2026-09-26 | jojo          | completed | 53  | a pyramid, not pyramids; a galaxy on four of six shots (P-025); a 14.5 min wait (P-024) |
| `8d233d6e`                                                                                                            | 2026-09-26 | jojo          | stopped   | 52  | Gate 5, shot 2's three takes: "Pyramids of Giza" counted one by one (P-018)             |
| `d12931e1`                                                                                                            | 2026-09-26 | game-graphics | completed | 58  | sentence 6 unclaimed; every take passed at once                                         |
| `a5b76d45`                                                                                                            | 2026-09-26 | game-graphics | stopped   | 73  | Gate 5, shot 2's three takes: the card's shot held to c4's monitor (P-008)              |
| `f44e960b`                                                                                                            | 2026-09-26 | game-graphics | stopped   | 15  | Gate 1 three times: "with no markings" read as required (P-022)                         |
| `8475f26d`                                                                                                            | 2026-09-26 | game-graphics | stopped   | 71  | Gate 5, shot 2's three takes: lettering (P-017); the narration drawn (P-021)            |
| `fdff208b`                                                                                                            | 2026-09-25 | game-graphics | failed    | 0   | the first picture: fetch failed — this machine's DNS (P-020)                            |
| `1496bbb9`                                                                                                            | 2026-09-25 | game-graphics | failed    | 0   | the first picture: fetch failed — this machine's DNS (P-020)                            |
| `a469e36b`                                                                                                            | 2026-09-25 | game-graphics | failed    | 51  | the witness: fetch failed at 3 sends; a character drawn (P-019)                         |
| `cd9648c9`                                                                                                            | 2026-09-25 | game-graphics | failed    | 0   | the planner: fetch failed at 3 sends                                                    |
| `a1cb6cfb`                                                                                                            | 2026-09-25 | game-graphics | stopped   | 75  | Gate 5, shot 2's three takes: a plural id, lettering (P-018, P-017)                     |
| `098e97fd`                                                                                                            | 2026-09-25 | honeybees     | completed | 53  | the brief changed three times; shot 4 made from words (clipped flight)                  |
| `52c63f62`                                                                                                            | 2026-09-25 | honeybees     | stopped   | 15  | Gate 1 three times: a cluster seen close, clipped (P-015, P-002)                        |
| `9bc5821e`                                                                                                            | 2026-09-25 | honeybees     | failed    | 5   | a made picture's file: fetch failed (P-013)                                             |
| `0ac13e84`                                                                                                            | 2026-09-25 | honeybees     | stopped   | 15  | Gate 1 three times: a Queen Bee subject no picture shows (P-016)                        |
| `9d0914dd`                                                                                                            | 2026-09-25 | honeybees     | stopped   | 54  | Gate 7 said no: a shot made from words drew bees on a flower (P-015)                    |
| `d459f6f5`                                                                                                            | 2026-09-25 | tsunamis      | completed | 49  | the brief's second run; shot 4 one retake, lettering on the boat                        |
| `62b5a191`                                                                                                            | 2026-09-25 | tsunamis      | failed    | 10  | the witness answered not JSON, never asked again (P-014)                                |
| `d4d6c562`                                                                                                            | 2026-09-25 | honeybees     | failed    | 0   | a picture's status check: fetch failed (P-013)                                          |
| **The 33 runs before 2026-09-25 are not listed here** (session 90's trim): every one is a scored row in               |
| `docs/research/benchmark.md`, its rows are the `run-reader` agent's, and what each taught is a `P-` entry in          |
| `docs/reel-pitfalls.md`. In short — 09-24, hurricanes and volcanoes: the caption question on a correct cut (P-011),   |
| a 768×1376 frame from nano-banana-2 (P-010), fal's flux 504 twice (P-009). 09-23/24, black-holes: one claim over two  |
| shots (P-008), repetition and a voice under it (P-006, P-007), the witness's count refused twice (P-004), a clipped   |
| subject and a dark end (P-002, P-003), MiniMax repeating a word in its timings (P-001, `resume-failed`'s cause), and  |
| the first three `first-real-reel` runs at 228¢, 231¢ (the budget) and 160¢ — the first completed real reel. 09-21/22, |
| the paid path's first contact: 18 runs, 14 failed and 4 stopped, 554¢, every one a provider's first refusal shape     |
| (MiniMax 401 and 402, the plan's shape, the reconciler 400 and fenced JSON, 180 s with no answer, seedream's frame,   |
| the planner's schema echoed back, a subject id refused, the witness's answer refused, Gate 1 three times on one       |
| picture, Gate 7 said no at 202¢).                                                                                     |

## Changes

Newest first. Each: where, what, and the decision or the reason — enough that an agent need not diff to know.

### 2026-10-16 — session 92

- **A FRESH round 2 refused `yield-compare`'s four gates on twenty-four findings** (`PROMPTS/085`, CLAUDE.md rule
  4), **twenty-three applied and one refused**, recorded as a table in the feature file beside round 1's; **S-199 is
  amended for the eight choices that moved**. The main session recomputed all **eleven pinned band values** before
  the round and handed them over measured, so the round went to the design: every finding with teeth was a rule that
  **could not fire or could not fail**. (a) **The credit guard could never fire on `plannedShots` or
  `plannedSeconds`** — four runs planning six shots against four planning four have variance zero on both sides, so
  the measures' zero-band rule votes _no verdict_, while the floor returns `NaN` on a count (`pA' = 25/6`). Settled:
  bare Welch for the guard, never the floor, and **a zero band FIRES it**, because withholding credit on no
  uncertainty under-claims where claiming a verdict over-claims. (b) **The positive control could not read
  _helped_** at the null's two runs a side, `0/2` against `2/2` being pinned inside the noise; it becomes its own
  fixture of 24 runs, four a side, with identical attempted work so the guard cannot withhold. (c) **The zero-band
  rule was undone one level up**, where {helped, no verdict, no verdict} fell through to _inside the noise_; a
  no-verdict group is now surviving but not comparable. (d) **`planVaryOn` turns `yield-benchmark`'s check 1 red**,
  since that check proves each `FIELD_COLUMNS` entry by mutating its column and **no committed fixture carries the
  field**; one fixture's `options` gain it, an eleventh fixture being refused because check 4 pins `groups.size` at
  9 and its shared pair by name.
- **Four more holes, each verified in the source before it was applied**: the **five always-run scans do not run
  under `--slice`** (`SCANS` is a step of the full suite and `--documents` alone, `scripts/check.mjs:138-157`) —
  the S-195 hole again — so Slices 1 and 2 name those five plus `tests/yield-benchmark-schema.test.ts`;
  `redact()` (`scripts/benchmark.mjs:187-191`) matches **no key shape**, so it moves into the shared module with the
  loader and is widened; a **degraded shot is FILMED from words** and pays its video call, the still fallback being
  measure 6, so Gate 1 had described one measure twice; and a shot **cannot carry two degradation rows**, both
  tables being keyed `(run_id, shot_id)`, so check 4 pins the **inherited row outside the denominator** instead.
  The reader's three-file scan splits clause by clause, its exhaustive `processes` deep-equal having been missing
  from the amendment list entirely, and the live "twelve" claims are **twelve, not nine** — `scripts/check.mjs:57`
  and `scripts/_pools.mjs:4` and `:7` were missed, and three `docs/context.md` citations were stale.
- **Refused, one of twenty-four**: `packages/reel-contract/src/request.ts:79-90` is exactly the `SubmitRequest`
  declaration, re-counted in the source. Markdown only, so `check.mjs --changed` is the whole verification owed
  (S-193). **No implementation file exists and no gate is approved** — the `Gates:` line reads pending four times,
  and whether a round 3 runs is the owner's call.

### 2026-10-16 — session 91

- **`yield-compare`'s four gates were written, and S-199 settles its nine open choices** (`PROMPTS/084`,
  S-198's order): 903 lines, Gate 2's place-and-may-not table, Gate 3's fourteen numbered checks, Gate 4's four
  slices. **S-199 supersedes S-182 in six named parts** — one standard error with a multiplier of two; **the run
  is the unit of evidence**, so only `reels made` is a share over runs; the two per-run counts become rates over
  attempted shots; nothing pooled across brief groups; the guard gains the plan's shot count and planned seconds;
  and the fingerprint settles at seven conditions. Writing them against the scoring half as BUILT corrected three
  inherited clauses, named in the file's own header block.
- **Round 1 refused all four gates on 22 findings, every one applied and none refused.** The two that changed the
  design: the null comparison **could not fail** (one brief key is one group, so it now holds fifteen runs over
  three groups with the group votes asserted), and the share band treated items inside a run as independent
  trials — pinned both ways on the same rows, `0/20` against `8/20` is delta +0.3636 band 0.1138 **moved** pooled
  and delta +0.4000 band 0.2531 **inside the noise** per run. A stopped subagent cannot be resumed, so round 1 was
  paid for twice. Markdown only; no implementation file, no gate approved.

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
- **Then the owner took the older call, and the three imprecise gate sentences are named at last (S-197).** They
  are in `docs/features/yield-benchmark.md`'s amendment block, gates unedited, no assertion or title moved: Gate
  3's two mentions of `tests/fixtures/benchmark/*.json` against Slice 3's recursing glob; **the ledger-column
  table's three short value sets** — `ending` also `absent`, each part rating also `inherited` (S-162, S-164), `s`
  also `absent`, all three accepted by check 7 at `tests/yield-benchmark-reader.test.ts:504-519` and none present
  in the 52-run ledger, which is why no reader noticed; and "the measures version", which the gates never define
  (`packages/benchmark` exports `RATING_VERSION` only; `scripts/benchmark.mjs` declares `m1` with its reason).
  **Only two of session 87's 25 findings were ever written down and the lost third of the promised three cannot be
  recovered**, so these are a fresh read of the gates against the built code — a 1104-line read to recover what a
  one-line list would have held. `.claude/agents/slice-builder.md` now requires findings as a numbered list naming
  the sentence each contradicts. No mechanical check is claimed: the count lived in prose, and a regex over English
  would read as coverage.
- **The queue was then corrected by the owner and written down (S-198)**: `yield-compare`'s four gates next, then
  `benchmark-view`'s, then `self-heal` — session 90's `self-heal` recommendation is withdrawn, because every
  feature behind this one is an engine change whose worth is a claim that runs got better, and the scoring half
  puts no two sets of runs beside each other. `PROMPTS/084-yield-compare-gates.md` is written for it, with the nine
  choices the gates must settle and the limit Gate 1 must state: **no verdict is available from the 52 runs already
  made**.
- **Then this file was trimmed to make room: 298 lines of its 300 to 231.** Nothing unique was dropped, only what
  another file carries by name. **Runs** now lists 2026-09-25 onward and summarises the 33 earlier runs in a
  paragraph with their `P-` numbers, because `docs/research/benchmark.md` scores every one of them, the
  `run-reader` agent reads their rows, and `docs/reel-pitfalls.md` holds what each taught. Sessions 88 and 89 are
  compressed to their decisions, figures and `S-` numbers, their narrative left in `JOURNAL.md` and the commits
  (S-177). The SDK chain's journey commits and counts go the same way, to the two feature files. The rule is now in
  this file's header, so the next session trims by it instead of re-deciding.

### 2026-10-15/16 · session 89

- **A recorded impact map answers "which tests" a code diff owes** (**S-196**, superseding S-177 in part).
  `node scripts/impact-map.mjs` (402 s, 156 files) runs each test file alone under `NODE_V8_COVERAGE` and records
  what it and every process it spawned loaded, plus the repository paths it NAMES — which credits a tool a test
  copies into a scratch repository. The twelve PATH-only children cannot be measured (coverage reaches a child
  through the variable they exist to refuse) and are derived from their siblings. Worth **4 s against 617 s** for a
  `packages/sdk` or `scripts/` change, and close to nothing inside the engine: **median 110 of 156 files**, because
  D-094 means a package is entered only through its `src/index.ts`. A selection above eight files runs through the
  pools. Function-level granularity is deliberately NOT built: a mapping mistake under-selects silently.
- **The scan hole is closed** (**S-195**, open since session 87): both file scans enumerated tracked files, so a
  file a change ADDED was invisible to the run that verified it. Both now read `repoFiles(cwd)` in
  `tests/_files.ts` — tracked plus untracked-not-ignored.
- **Markdown is a document wherever it lives** (**S-193**, superseding S-159 in part): `DOCUMENT` is `[/.md$/]`,
  so prose anywhere runs the seven document checks instead of the full suite, while `.claude/settings.json` and
  `.claude/hooks/*.sh` stay code by name. Verified targeted by the three files that read the rule, plus a full
  suite that agreed (S-194, the owner's call against S-177).
- **The tests step is two pools that never overlap** (**S-192**, superseding S-176 in part): 142 ordinary files at
  4, then the twelve PATH-only children at 2. **617 s against 1455 s** over four green runs, nothing skipped, no
  bound raised; the memory floor follows the machine (5431, 2483, 4142 MB), so judge a later change by the
  receipt's own `freeMinMB`. Worst child margin 155.7 s. `--serial` restores S-176 for a bisect. The first
  attempt's red was a real latent fault, not the scheduler: `cutroom-sdk-launcher`'s teardown took `write EPIPE`
  from an async `error` event nothing listened for.
- **The suite already costs what its files cost** (**S-191**, superseding S-190): 153 files alone 1501.7 s against
  the suite's 1455 s, so §4.2's whole case was real parallelism. Table: `docs/research/test-file-costs.md`. **One
  full suite is 274 file executions of 153 files** — 121 of them nested inside the twelve secrets children, which
  is the largest block left and what §4.4 would narrow. **The cost is 35 files**: 67 under 3 s cost 90.7 s, 35 cost
  742 s. One red is unexplained: `reel-render-secrets` failed once at 123.8 s with nothing else running, passed
  alone at 100.6 s, and its lines were discarded.

### 2026-10-15 · session 88

- **The verification receipt, and a journey that reads it** (**S-188**, from `docs/research/test_fixes_and_research.md`
  §4.0). `scripts/_verification.mjs` and `scripts/test-receipt.mjs` are new — the latter because **Node 22.14's tap
  and junit reporters attribute nothing to a file**, measured here. `check.mjs` writes `.verification/receipt.json`,
  gains `--documents`, and holds one document list; `journey.mjs` runs nothing at a tree a green full receipt
  covers, `--documents` when only Markdown differs, and takes its count from the receipt. Measured: `reel-plan`
  0.277 s, `reel-contract` 0.248 s, `reel-stills` 18.4 s on a one-document delta, against ~25 min before.
- **The tested tree is the CONTENT, not the commit**: a dirty run records what `git add -A` would commit, through a
  throwaway index, so change → full run → commit stays reusable. Two faults were found by running it rather than by
  its tests, both in S-188: a `:(exclude)` pathspec made the tree undefined here while every scratch fixture
  passed, and the `--changed` run between two journeys overwrote the reusable receipt — the last full run now keeps
  `receipt-full.json`, which the journey alone reads.
- **Biome replaces eslint and prettier for code** (**S-189**, same session at the owner's word): the `code` step
  **0.492 s** against 6.25 s + 5.74 s; a slice's static checks 30.3 s → 6.9 s; documents ~15 s → 1.2 s. Prettier
  keeps Markdown, YAML and the one HTML page and is handed file paths from git (a glob matching nothing exits 2).
  Eslint's three rules are carried by name and biome's other thirteen are `warn`, so the gate did not widen.
  `biome check --write` was refused: it rewrote imports in two verified features' source.

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
