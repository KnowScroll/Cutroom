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
  been weakened. **Stopped**: `one-subject` (S-149), **`yield-compare` (S-200)**. **Planned, gates not written**: `caption-match` (S-165),
  `composed-hold`, `diagram-shots` (S-166), `code-reels` (S-167), `self-heal` (S-169, S-170), `video-edits`,
  `parallel-shots` (S-115, no file yet). **Deferred, no place in the queue**: `clip-overlays` (S-167).
- **`yield-benchmark` is BUILT and `Status: verified`** (session 87): every run scored part by part, the ledger at
  `docs/research/benchmark.md`. Its gates were approved by owner decision (S-185) and no reviewer, so **the slices
  carried the review**: 25 findings reported rather than built around, of which **three imprecise gate sentences
  are named in that file's amendment block** (S-197) and the other 22 are lost with session 87's hand-backs.
  **Enforced boundary rules: 25.** **`yield-compare` is STOPPED (S-200)**: its four gates were written and refused
  by three fresh rounds on 22, 24 and 11 findings — 57 in all, 56 applied and 1 refused, S-199 with two amendments —
  and the owner stopped it rather than approve it by decision or run a fourth round. The file is kept as the record;
  **no implementation file of it is ever written**. **Gates written and NOT approved**: `hosted-checks` (round 1
  answered, on hold). **Gates not written, files only**: `benchmark-view` (S-184, S-200), `run-provenance`,
  `picture-prompt`.
- **Three kinds of reel** (S-167): footage (built), hybrid (`diagram-shots`), code-only (`code-reels`).
- **Agent models are a written choice at last (S-202)**: `gate-reviewer` moves **opus → sonnet**, halving a review's cost for a job that is cross-reading rather than invention and whose findings the main session verifies in the
  source before applying; **`slice-builder` stays on opus as the only agent there**, because it writes rather than
  reads. Haiku was refused for the reviewer — round 3's best finding needed four hops across three files. **No entry
  had ever set any agent's model.** Watch the next round's findings: shallow ones are the signal to go back.
- **Next: `benchmark-view`'s four gates** (`PROMPTS/088`). **Its shape is APPROVED** — the owner signed off a
  working mockup on 2026-10-17 and **S-201** records it, superseding S-184's self-contained no-server page and
  amending S-200's `--out` sentence: it is **a local server you start, reading `data/cutroom.sqlite` directly**.
  The full specification is `docs/features/benchmark-view.md`, "The shape the owner approved"; the mockup and its
  source sit under the gitignored `.artifacts/view-mockup/`. **The benchmark's last part and the only one left**. The page reads `scripts/benchmark.mjs`' own `--out` record — which exists and holds 52 runs — draws no
  verdict and no delta, and **owns the stratification** that was `yield-compare`'s: session 82's 42% / 70% / 100%
  by subjects per shot, the one view needing no matched pairs. Its gates must settle where the data comes from and
  **whether a stratum carries an uncertainty band at all**, since that arithmetic went with the stopped feature.
  **After it the benchmark is complete**, and the queue is `self-heal`, session 53's
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

### 2026-10-16 — session 93

- **A FRESH round 3 refused `yield-compare`’s four gates on eleven findings** (`PROMPTS/086`, CLAUDE.md rule 4),
  **all eleven applied and none refused**, recorded as a table in the feature file beside rounds 1 and 2; **S-199
  is amended a second time** for the five choices that moved. Every pinned figure was recomputed first, so the
  round went to the design. **Two findings would have broken working code.** The widened `redact()` would have
  erased the record’s own run ids and brief keys — `scripts/benchmark.mjs:912-916` passes **every string** of the
  `--out` record through it — **and no check would have noticed**, so the widening became `redactProse()` over the
  sides document alone. And the exhaustive `processes` deep-equal is an **order-exact list, not a set**, so a
  second `git rev-parse` reddens it: **the permission went, not the assertion** (rule 3). Three more with teeth:
  `planVaryOn` moved to Slice 2 (left in Slice 3 its check was unbuildable), the guard’s cross-group vote was
  imported with two clauses undecided and both are now chosen against the import, and check 3’s only vote case
  read the same under the chosen rule **and** the one Gate 2 rejects. **Corrected as fact**: a plan-stage death
  **has** a `model_receipt`, so **three** observed conditions go absent, not four. The “twelve” instrument was
  re-measured before the round and three of round 2’s own faults corrected — **eleven live claims**, stale
  citations, and a seventh `DECISIONS.md` children claim missed.
- **Then the owner STOPPED `yield-compare` (S-200)** — _"No just leave it, we should just build the view part of it
  and end the benchmark"_ — rather than approve it by decision or run a fourth round, after the case for it was
  made twice. `Status: stopped`, the file kept as the record of 57 faults found in a specification, **no
  implementation file ever**. **`benchmark-view` is now the benchmark's last part and the only one left**: it reads
  the scoring half's `--out`, draws no verdict or delta, and **owns the stratification**, whose uncertainty band
  went with the stopped feature and is a question for its gates. **What stopping costs is recorded rather than
  softened**: nothing will say whether an engine change helped, and the engine's spread on ONE brief with nothing
  changed is wider than most real improvements — `f984199a` rates 3.0, 10.0, 10.0, 38.5, 45.7 over five runs, and
  `db460dea`'s higher-rated run (69.3) made **no** reel while its lower (60.0) did. Reopening the claim means
  reopening those gates, which is why they are kept.

- **Then the owner specified `benchmark-view` by answering, and a MOCKUP was built before any gate** (session
  93, second phase). Settled by asking: a **local server you start** (`node scripts/benchmark-serve.mjs`) reading
  **`data/cutroom.sqlite` directly**, finished runs only, localhost for now; a **comparison board of any number of
  runs as columns**, briefs and configs mixed, **no verdict words** — so it is not the stopped feature; fleet
  overview as the landing; runs picked by checkbox in a filterable ledger; the model’s words **folded**;
  **ECharts vendored locally**. **Two settled decisions are contradicted and NOT yet rewritten** — S-184’s
  self-contained no-server file, and S-200’s "reads the scoring half’s `--out` record" — because a page opened
  from the filesystem **cannot** load a JSON beside it under file-origin rules. Both need an `S-` entry once the
  shape is approved.
- **The mockup earned its cost in three faults no written spec would have caught**: ECharts is **not on cdnjs at
  5.5.1** (404), the progress chart **built six series and never assigned them**, and "refusal by attempt" is one
  bar because **every picture is attempt 1**. It runs on all 52 real runs and reproduces session 82’s finding
  from the record (**42% / 70% / 100% / 100%** by subjects per shot). Feedback applied twice: full-bleed width,
  charts two across with S/M/L/XL presets and drag resize, **refusal by world** filling the empty slot. At
  `.artifacts/view-mockup/`, **gitignored**, with its source beside it; **no implementation file exists**.
- **The owner APPROVED it on 2026-10-17 — S-201.** Four rounds of look feedback, each a real defect: side margins
  on a full-width instrument; charts clumped three-up and too small; a funnel nobody could read (now a plain
  column chart in stage order with each previous stage’s loss in red); four group-by charts crowded in one panel
  (now four cards); and a blue-cast dark theme (now true black). Everything scaled up with it. **The chart palette
  is validated, not chosen** — both themes pass the colour-blindness and contrast checks, so re-colouring means
  re-validating. **S-201 names what it costs elsewhere**: the shared row loader `yield-compare` designed and never
  built moves to this feature, because one check asserts the reader holds exactly one `new DatabaseSync(`.

### 2026-10-16 — session 92

- **A FRESH round 2 refused `yield-compare`'s four gates on twenty-four findings** (`PROMPTS/085`, CLAUDE.md rule
  4), **twenty-three applied and one refused**; **S-199 is amended** for the eight choices that moved, and that
  amendment carries the detail. The eleven pinned band values were recomputed in the main session first, so the
  round went to the design: every finding with teeth was a rule that **could not fire or could not fail**. The
  credit guard **could never fire** on `plannedShots` or `plannedSeconds` — four runs planning six shots against
  four planning four have variance zero on both sides, and the floor returns `NaN` on a count — so the guard takes
  bare Welch and **a zero band FIRES it**. The positive control **could not read _helped_** at two runs a side, so
  it became its own 24-run fixture, four a side. The zero-band rule was **undone one level up**, where {helped, no
  verdict, no verdict} fell through to _inside the noise_. And **`planVaryOn` turns `yield-benchmark`'s check 1
  red**, no committed fixture carrying the field, so one fixture's options gain it rather than a check being
  touched.
- **Four more holes, each verified in the source first**: the five always-run scans **do not run under `--slice`**
  (the S-195 hole again), so Slices 1 and 2 name them; `redact()` matches **no key shape**, so it moves into the
  shared module; a **degraded shot is FILMED from words** and pays its video call, so Gate 1 had described measure
  6 twice and measure 5 not at all; and a shot **cannot** carry two degradation rows, both tables being keyed
  `(run_id, shot_id)`. Markdown only (S-193). **Refused, one of twenty-four**: `request.ts:79-90` is exactly the
  `SubmitRequest` declaration, re-counted in the source.

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

- **The queue read, the digest's stale "Next" corrected, and two cost levers declined** — both still open and the
  owner's, neither recommended: §4.3 `hosted-checks` buys corroboration that carries no trailer (S-183) at the
  price of a second platform, and §4.4's own decision line makes it conditional on §4.2 and §4.3 not having made
  the suite cheap enough, which S-192 did (1455 s to 617 s), so its ~200 s would now narrow a proven property and
  supersede S-028 for nothing.
- **Then the owner took session 87's older call, and S-197 names the three imprecise `yield-benchmark` gate
  sentences at last** — in that file's amendment block, gates unedited, no assertion or bound moved: Gate 3's two
  mentions of `tests/fixtures/benchmark/*.json` against Slice 3's recursing glob; the ledger-column table's three
  short value sets (`ending` also `absent`, each part rating also `inherited`, `s` also `absent`), all three
  accepted by check 7 and **none present in the 52-run ledger**, which is why no reader noticed; and "the measures
  version", which the gates never define. **Only two of session 87's 25 findings were ever written down and the
  promised third is unrecoverable**, so these are a fresh 1104-line read of the gates against the built code, and
  `.claude/agents/slice-builder.md` now requires findings as a numbered list naming the sentence each contradicts.
  No mechanical check is claimed: the count lives in prose, and a regex over English reads as coverage.
- **Then the owner corrected the queue (S-198)**: `yield-compare`, then `benchmark-view`, then `self-heal` — session
  90's `self-heal` recommendation withdrawn, because every feature behind this one is an engine change whose worth
  is a claim that runs got better. **And this file was trimmed 298 lines of its 300 to 231**, by the rule now in
  its own header: what another file carries by name is not kept here.

### 2026-10-15/16 · session 89

- **A recorded impact map answers "which tests" a code diff owes** (**S-196**, superseding S-177 in part).
  `node scripts/impact-map.mjs` (402 s, 156 files) runs each test file alone under `NODE_V8_COVERAGE` and records
  what it and every process it spawned loaded, plus the repository paths it NAMES. The twelve PATH-only children
  cannot be measured and are derived from their siblings. Worth **4 s against 617 s** for a `packages/sdk` or
  `scripts/` change, close to nothing inside the engine (**median 110 of 156 files**, since D-094 means a package
  is entered only through its `src/index.ts`). Function-level granularity is deliberately NOT built: a mapping
  mistake under-selects silently.
- **The scan hole is closed** (**S-195**, open since session 87): both file scans enumerated tracked files, so a
  file a change ADDED was invisible to the run that verified it. Both now read `repoFiles(cwd)` in
  `tests/_files.ts` — tracked plus untracked-not-ignored.
- **Markdown is a document wherever it lives** (**S-193**, superseding S-159 in part): `DOCUMENT` is `[/.md$/]`,
  while `.claude/settings.json` and `.claude/hooks/*.sh` stay code by name (S-194, the owner's call against S-177).
- **The tests step is two pools that never overlap** (**S-192**, superseding S-176 in part): 142 ordinary files at
  4, then the twelve PATH-only children at 2. **617 s against 1455 s** over four green runs, nothing skipped, no
  bound raised; the memory floor follows the machine, so judge a later change by the receipt's own `freeMinMB`.
  `--serial` restores S-176 for a bisect. The first attempt's red was a real latent fault, not the scheduler:
  `cutroom-sdk-launcher`'s teardown took `write EPIPE` from an async `error` event nothing listened for.
- **The suite already costs what its files cost** (**S-191**, superseding S-190): 153 files alone 1501.7 s against
  the suite's 1455 s, so §4.2's whole case was real parallelism. **One full suite is 274 file executions of 153
  files** — 121 nested inside the twelve secrets children — and **the cost is 35 files**, 742 s of it. Per-file
  table: `docs/research/test-file-costs.md`.

### 2026-10-15 · session 88

- **The verification receipt, and a journey that reads it** (**S-188**): `scripts/_verification.mjs` and
  `scripts/test-receipt.mjs` are new — the latter because **Node 22.14's tap and junit reporters attribute nothing
  to a file**, measured here. `check.mjs` writes `.verification/receipt.json` and gains `--documents`;
  `journey.mjs` runs nothing at a tree a green full receipt covers. Measured: `reel-stills` **18.4 s** on a
  one-document delta against ~25 min before. **The tested tree is the CONTENT, not the commit**, through a
  throwaway index, so change → full run → commit stays reusable; the last full run keeps `receipt-full.json`,
  which the journey alone reads.
- **Biome replaces eslint and prettier for code** (**S-189**, the owner's word): the `code` step **0.492 s**
  against 6.25 s + 5.74 s, a slice's static checks 30.3 s → 6.9 s. Prettier keeps Markdown, YAML and the one HTML
  page. Eslint's three rules are carried by name and biome's other thirteen are `warn`, so the gate did not widen.
  `biome check --write` was refused: it rewrote imports in two verified features' source.

### 2026-10-14/15 · session 87

- **`yield-benchmark` built and `Status: verified`**, four slices, one `slice-builder` each (S-172), its gates
  approved by owner decision (S-185). `d535a58` (full): `packages/benchmark` with the three boundary rules whose
  `--prove` cases are generated from each rule’s own enumeration, 10 row fixtures, and **every amendment taking
  the rule count 22 to 25 in one tree**. `e9f1266` (targeted): `ratings.ts`, the thirteen terms, S-182’s weights,
  the `r1` stamp, five worked fixtures at **0.0, 10.0, 10.0, 34.0, 89.7**. `11f036e` (full):
  `scripts/benchmark.mjs` read-only through `node:sqlite` and `docs/research/benchmark.md`, **52 rows written by
  the script**. Slice 4: four journeys PASS, 120 tests. `963be3c` carries S-182’s second amendment and **S-186**;
  `050536a` closed `pipeline-no-io`’s own gap (**S-187**), its proof grown from 1 case to 30. `--prove` now fires
  **25 rules over 131 cases**.
- **A verification hole, reported not patched**: Slice 3’s full suite passed with a D-086 violation in
  `scripts/benchmark.mjs`, because the four file scans read **tracked** files and it was untracked when that suite
  ran. Source fixed at `d898693`, check untouched — **S-195** closed the hole itself in session 89.
- **Of its 25 slice findings only two were ever written down**, which is what S-197 exists to prevent; the `hold`
  table is **empty over all 52 runs**. Nothing weakened, nothing spent, no reel made. Every commit, count and
  journey is in `docs/features/yield-benchmark.md` (S-177).

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
