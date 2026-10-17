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
  **Enforced boundary rules: 27.** **`yield-compare` is STOPPED (S-200)**: its four gates were written and refused
  by three fresh rounds on 22, 24 and 11 findings — 57 in all, 56 applied and 1 refused, S-199 with two amendments —
  and the owner stopped it rather than approve it by decision or run a fourth round. The file is kept as the record;
  **no implementation file of it is ever written**. **Gates APPROVED, nothing built**: `benchmark-view`
  (`owner-delegated-S-205`, session 94). **Gates written and NOT approved**: `hosted-checks` (round 1 answered, on
  hold). **Gates not written, files only**: `run-provenance`, `picture-prompt`.
- **Three kinds of reel** (S-167): footage (built), hybrid (`diagram-shots`), code-only (`code-reels`).
- **Agent models are a written choice at last (S-202)**: `gate-reviewer` moves **opus → sonnet**, halving a review's cost for a job that is cross-reading rather than invention and whose findings the main session verifies in the
  source before applying; **`slice-builder` stays on opus as the only agent there**, because it writes rather than
  reads. Haiku was refused for the reviewer — round 3's best finding needed four hops across three files. **No entry
  had ever set any agent's model.** Watch the next round's findings: shallow ones are the signal to go back.
- **Next: `benchmark-view` Slice 1 (`PROMPTS/089`).** Its four gates are **APPROVED** as `owner-delegated-S-205`
  (session 94): **no reviewer round — S-203**, the owner's call, and then **the approving read delegated to the
  session itself**, which found and fixed four faults in its own text. Its shape was APPROVED against a working
  mockup on 2026-10-17 (**S-201**, superseding S-184's no-server page): **a local server you start, reading
  `data/cutroom.sqlite` directly**, specified in `docs/features/benchmark-view.md`, "The shape the owner
  approved", with the mockup under the gitignored `.artifacts/view-mockup/`. **S-204 settles the eight open
  questions**: one new package `packages/benchmark-read` for the loader and the page, two routes (a 39 KB fleet
  payload, a 40 KB worst-case run), **no band** but every group's decided count with a group under ten drawn
  outlined, the scrubber into the loader, ECharts vendored at `vendor/` and never `packages/`, no browser in the
  suite, and two new boundary rules taking the enforced count to **27**. **Then four slices** — 1 full, 2 and 3
  targeted, 4 full plus the journey. **After it the benchmark is complete**, and the queue is `self-heal`, session
  53's
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
  pools (S-192, judge a later change by the receipt's own `freeMinMB`), and a journey re-runs nothing at content a
  green full receipt covers (S-188). **Markdown written after a green full run never costs a second suite
  (S-214)**: `node scripts/check.mjs --changed` compares the content against the tree that run tested rather than
  against HEAD, runs the markup, the four scans and the authority — 13 s — and records `full`, because the suite
  ran on this code and only prose came after. The checker prints the trailer it recorded; nobody types one
  (S-213). The full run stays for checker, boundary, workspace/dependency work and a diff no recorded run covers
  (S-188's
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

### 2026-10-17 — session 96

- **The checker now writes the verification trailer it recorded, and prose written after a full run no longer
  costs a second suite.** `scripts/check.mjs`, `scripts/_verification.mjs` and its `.d.mts`, plus
  `tests/check-receipt.test.ts`, `tests/check-changed.test.ts` and `tests/journey.test.ts`. One full run bought
  both, against one per feature for ever.
- **S-213**: a documents-only run records `targeted` with the four scans as its tests, measured by the receipt
  reporter the scans now run under (4 files, 11 tests, 2.7 s); `evidenceTrailer()` is the only place a trailer is
  formatted, a green run prints it, and it returns nothing rather than a trailer `verification-status.mjs` would
  refuse. The mode `documents` is written by nothing any more.
- **S-214, and it is the owner's standing rule**: `--changed` carries a recorded green full run to the content in
  front of it — comparing against **that run's tree, not HEAD** — and records **`full`** when every differing path
  is Markdown. 13 s. **No fourth trailer line and no new word**: the run WAS full, only prose came after it. The
  carry is asked before any path is classified, so a checker change is carried too; a carried receipt keeps the
  carried test rows and reaches `receipt-full.json`; only a GREEN full run writes that file now.
- **Shape 1 was refused mid-build.** Reordering the journey to write before the commit does not remove the delta,
  because prose follows the journey as well. Nothing of it was applied: `scripts/journey.mjs` is unchanged.
- **The rule is written where every session reads it** — CLAUDE.md, this file, and the stop-gate's own message.
- Six deliberate breaks, every one red and naming the right test.
- **Finding 23 SETTLED, by the owner — _"let fetch be allowed, it's only local always"_.** Check 11's outbound
  scan is **per file**: the server and loader name none of the four spellings, and
  `packages/benchmark-read/src/draw.ts` — the browser script's text — may name `fetch(`. The Node spellings stay
  banned there, and the absolute-URL ban over the whole served document keeps a permitted `fetch(` same-origin.
  **Two bounds added, none removed**: the exempted file must be a source file, and the document must carry its
  own script text byte for byte. **The page is unchanged, measured** — its figures are already server-rendered
  tables, so moving the block to `/data` sends the same bytes: document 249.1 KB, block 131.6 KB, `/data`
  86.1 KB, `/run/<id>` 5.1 KB, 52 runs. Journey re-run PASS at `afe51b8`, nothing re-ran.
- **The page is ACCEPTED by the owner** — _"It looks perfect"_, 2026-10-17, served from `data/cutroom.sqlite`
  at 52 runs. **The benchmark is COMPLETE**: `yield-benchmark` and `benchmark-view` verified, `yield-compare`
  stopped (S-200), no finding open. The launcher row in the feature file now carries its real command line —
  `--experimental-strip-types --no-warnings` — which the bare form in it had omitted since Slice 4.
- **S-213 AMENDED hours later by the first thing the printed trailer caught, and the fault was S-196's**: a
  `--changed` run the impact map answers had neither `--slice` nor the documents steps, so the flag ladder fell
  through and **a 12-of-161-file run printed `Verification: full`** — the word that also writes
  `receipt-full.json`. **The mode is read off the step that ran.** Seven deliberate breaks this session.

### 2026-10-17 — session 95

- **Compressed (session 96, S-160's rule): its six decisions carry the detail.** `benchmark-view` BUILT in four
  slices — `1c958a1` (loader package, the precedence into `scripts/_lib.mjs`, two boundary rules), `21e8705`
  (server and three routes), `6170ce3` (the page), `cd22b7e` (vendored build, launcher, the thirteenth PATH-only
  child). **Enforced boundary rules: 27** (`drift --prove`: 27 rules, 141 cases), `benchmark-no-reader` closing a
  hole no cruiser rule sees, since its rules are about DIRECT dependencies. **Forty findings against gates no
  reviewer and no owner read** (S-203, S-205), all in the file's Amendments block with the gate text unedited
  (S-197); the gates contradict themselves in at least six places. **S-206 to S-211**, of which **S-210 closes a
  measured D-086 leak** — the launcher passed no roots, so an absolute artifact path inside a prompt was served,
  and three slices of scrubber guards missed it because each supplied its own roots. **S-211** found
  `tests/ask-again-record.test.ts` red on the new package after Slice 4, and names the targeted regime's blind
  spot: `--slice` runs every boundary check but only its NAMED test files, so a repo-wide scan in another
  ordinary test file is invisible to it. Three deliberate breaks stayed green on first attempt, each a real hole;
  a heredoc halving `[/]`, then `biome check --write` reducing it to `[/]`, was caught only by a positive
  control.

### 2026-10-17 — session 94

- **`benchmark-view`'s four gates are WRITTEN, and no reviewer read them — S-203**, the owner's call. It supersedes
  S-185's clause reserving that waiver to `yield-benchmark`, for this feature only; rule 1 stands everywhere else,
  and **the slices carry the review** in S-197's form.
- **The owner then delegated the approving read, and the gates are APPROVED as `owner-delegated-S-205`** — a third
  token no other feature carries, because **no reviewer read them and neither did the owner**. **That read found
  four faults in this session's own text and fixed all four before approving**: Gate 2 was **unbuildable**
  (`DEFAULT_DB_PATH` and `SETTING_NAMES` come from `@cutroom/service`, which is `apps/service`, and
  `benchmark-read-no-engine` forbids `apps/` — so the precedence moves to `scripts/_lib.mjs`); check 11 forbade the
  house form's own `workspace:*` dependency; **Slice 2 needed a file Slice 4 adds**, round 3's exact fault against
  `yield-compare`; check 15 counted six charts where there are eight. **S-205 states what the read could not do** —
  same model, same text, so a design fault would have gone through.
- **The feature file's stale section is gone**, struck through with what happened to it: its data-source choice was
  decided against by S-201, and its two live clauses moved into "What the gates still have to settle", now eight.
- **S-204 settles those eight, each against a measured fact**: **one new package** `packages/benchmark-read` for the
  loader and the page, because `FULL_ONLY` sends every `scripts/` path to the 617 s full run and `drift.mjs` cruises
  only `packages` and `apps`, so **no boundary rule reaches a script**; **two routes**, 39 KB for all 52 runs and
  40 KB for the worst run, against **2665 KB** whole; **no band**, every group carrying its decided count and one
  under ten drawn outlined (today's world groups are 33 and 5); the **scrubber into the loader**, because
  **nothing in `packages/providers` redacts anything** and the record's only redaction is at its write boundary,
  which a server bypasses; ECharts at **`vendor/`, never `packages/`** (the build holds `source:` twice and
  `tests/reel-plan-shapes.test.ts` would go red); **no browser**, port 0 instead; and two rules taking the count to
  **27**, the second stopping `packages/benchmark` reaching `sqlite` **transitively** — a hole no rule sees, since
  cruiser rules are about direct imports.
- **Two sentences this repository believed are false**: S-200 and S-201 both say
  `tests/yield-benchmark-reader.test.ts` holds a clause-by-clause scan of the held column set. **It holds none.**
  What catches the loader's move is its count of one `new DatabaseSync(` (`:235-240`), and **eleven of its source
  scans (`:241-255`) would go wrongly green**. The gates build the scan and grow all eleven.
- **No implementation file exists**, and Markdown only: `check.mjs --changed` is all that is owed (S-193).

### 2026-10-16 — session 93

- **Compressed (session 96, S-160's rule): its decisions exist, so its reasoning lives there.** A FRESH round 3
  refused `yield-compare`’s four gates on **eleven** findings (`PROMPTS/086`, CLAUDE.md rule 4), **all eleven
  applied and none refused**, recorded as a table in the feature file beside rounds 1 and 2; **S-199 is amended a
  second time** for the five choices that moved. **Two findings would have broken working code**: the widened
  `redact()` would have erased the record’s own run ids and brief keys, with no check noticing, so it became
  `redactProse()` over the sides document alone; and the exhaustive `processes` deep-equal is order-exact, so a
  second `git rev-parse` reddens it — the permission went, not the assertion (rule 3). **S-201** names what the
  round cost elsewhere: the shared row loader `yield-compare` designed and never built moves to `benchmark-view`,
  because one check asserts the reader holds exactly one `new DatabaseSync(`. The rest — 57 findings over three
  rounds, 56 applied — is in `docs/features/yield-compare.md`, which is kept as the record of a **STOPPED**
  feature (S-200).

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

- **Compressed to its decisions** (this file's own rule). **S-197** names the three imprecise `yield-benchmark`
  gate sentences in that file's amendment block, gates unedited — only two of session 87's 25 findings were ever
  written down and the third is unrecoverable, which is why `.claude/agents/slice-builder.md` now requires
  findings as a numbered list naming the sentence each contradicts. **S-198** set the queue. **Two cost levers
  stay open and are the owner's, neither recommended**: §4.3 `hosted-checks`, and §4.4's ~200 s, which S-192
  (1455 s to 617 s) made conditional on nothing.

### 2026-10-15/16 · session 89

- **Compressed to its decisions** (this file's own rule), which now carry the detail: **S-196** the recorded impact
  map, **S-195** the scan hole both file scans had, **S-193**/**S-194** Markdown as a document wherever it lives
  while `.claude/settings.json` and `.claude/hooks/*.sh` stay code, **S-192** the two non-overlapping pools, and
  **S-191** that the suite already costs what its files cost. Per-file table: `docs/research/test-file-costs.md`.

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
