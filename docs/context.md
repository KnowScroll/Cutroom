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
- **Next**: `self-heal`; SDK v1 is complete on Cutroom's side (S-180, superseding S-179's
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
- **Checks**: Slice 1’s `127adc5` recorded a full green check (tests 1413 s). S-177 now binds verification to the exact
  commit tree: ordinary slices run static/boundary checks plus named affected tests; full suites remain for checker,
  boundary, workspace/dependency and journey work. The known PATH-only child transient remains a full-suite signal;
  S-176’s serial aggregate and existing child bounds stand. A hosted run is corroboration only and carries no trailer (S-183).

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

### 2026-10-12 · session 84

- **The repository is public, and so is the steering repository it answers to.** `docs/research/public-exposure-audit.md`
  records the whole-history audit: 1857 blobs (reachable and not, via `git cat-file --batch-all-objects`), 287 commits,
  599 paths ever committed, every commit message, 18 refs, 0 tags, every version of every `tests/fixtures/wire/*.json`,
  and the steering clone’s 401 blobs, swept for key shapes, credential-named URL query parameters and D-022’s
  presigned-OSS case. **No secret was found.** Every hit is a fixture (`sk-canary-not-a-real-key`,
  `X-Amz-Signature=deadbeef`, `AKIAEXAMPLE`); `.env` was never committed and no media, database or archive ever was.
  `Legend101Zz/Knowscroll-v2` is **public and was already public**, so `BUDGET.md`, the founding research and all 115
  `D-` entries were readable before this repository was. Nothing rewritten — a scrub is not a fix. Public and not
  secret: the author’s email on all 287 commits, every run’s cost, the provider and model choices.
- **S-183 — a hosted run corroborates and never verifies.** `scripts/verification-status.mjs` is unchanged and no
  trailer names a run; the record lives under `## Measurement`, never `## Evidence`, which `journey.mjs` owns (S-016),
  and carries run id, head sha, tree, `run_attempt` and conclusion. Journeys stay local. **Linux is the primary
  measurement and Windows the control** (owner, mid-session; S-179 makes Linux the deployment target): Linux red beside
  Windows green is the port, red on both is the repository or the runner, a lone Linux run could say neither. Linux is
  required to be measured, not to pass. `docs/features/hosted-checks.md` holds the four gates and nine choices.
- **Gate review round 1 approved nothing** — 17 findings, all answered in the file, gates still NOT APPROVED. Two were
  understated: eleven tests spawn a bounded PATH-only journey child at 300/360/600 s, not six, and this machine is 16
  cores, so a hosted runner is a quarter of it. The blocking finding: a test grepping a workflow for `real-reel` must
  contain that literal, which `paid-path`’s check 20 forbids any other test file from doing (S-111) — so it becomes an
  amendment in `tests/paid-path-real-reel.test.ts` and `paid-path` takes a re-journey.
- **The environment is measured; the suite is not yet.** `.github/workflows/measure-checks.yml` is report-only on branch
  `ci-measurement` at `49b0686` and **not on `main`**. Setup costs **26 s on Linux against 116 s on Windows** (install
  5 s against 71 s). Four runs were needed: the install failed because `better-sqlite3@13.0.3` **publishes no prebuilt
  binary** while pnpm 10.15.1 bundles node-gyp 11.1.0, which cannot detect the image’s Visual Studio 2022 17.14 — class
  2, the runner is wrong, answered with a pinned node-gyp 13.1.0 and no change to any check. Reading that line needed
  choice 8: a job-log download answers `403 Must have admin rights to Repository`, so each job republishes its decisive
  output as a check-run annotation. Both `check.mjs` runs were still in flight at close, so there is nothing yet to set
  against the local 1413 s.
- No code, contract, test, boundary rule or check changed, and nothing was weakened. `main` gains documents only.
- **Hazard:** a second Claude session was committing to `main` in this same checkout, swept this session’s untracked
  documents into its commits, and wrote files while this session had a branch checked out. One `--amend` landed on its
  commit and was repaired by `git reset --soft` to its original object (same SHA, message and tree). Nothing lost,
  nothing pushed. One working tree per session.

### 2026-10-12 · session 83

- Added `docs/features/yield-benchmark.md`, **gates NOT approved after two adversarial rounds** (both recorded in the file): the benchmark, designed and not built. Per the owner, a benchmark run is a WHOLE REEL with its own numbers, timings and rating per part, one composite number beside every internal number, and it must run on individual parts too; then the paid half was deferred, so this feature is the reading half only — a pure `packages/benchmark` plus one read-only script that scores the runs already in `data/cutroom.sqlite` across five parts (plan, pictures, narration, clips, cut), every count, timing, cost, retry and gate verdict, a rating a part and a rating a run, with the yield reported beside the rating and never folded in. It spends nothing and never opens the record for writing. **Deferred 1 holds the paid pass whole** — six frozen briefs with their measured refusal rates, a 150¢ per-reel ceiling, one typed confirmation, its own database file and artifact root, continuation by pass id, and a containment check in check 20’s shape. The benchmark stays in this repository (a second one would be a second copy of the schema).
- Measured read-only from the record, and the figures the gates rest on: **52 runs over 25 brief groups** (the request minus `requestId` and `options`; largest group 8 runs), every one `until: video`; 43 selected plans, 132 pictures with all 132 files still on disk, 128 observations, 127 reconciliations, 118 takes, 95 narrations, 12 renders, 691 verdict events, 118 `stage.started` against 74 `stage.finished` (S-046); `job.cost_cents` 2202¢ = 732 + 1457 + 0 + 13 by receipt kind, `model_receipt` carrying no cost column; image calls 5¢ × 108 and 8¢ × 24, min 2 / median 4 / max 6 a run; selected-plan estimates 40–51¢ at today’s rates; plan plus stills a median 294 s over 23 runs; **subjects per shot from the selected plan agrees with the prompt’s `It shows:` line on 132 of 132 pictures**; 13 distinct Gate 1 reason shapes, all from reconcile.
- Round 1 refused all four gates with 20 findings, three of them false claims about this repository’s own code: `gate5.ts` builds four reconcile templates and deliberately **no** clipping one (S-072, D-044); `gate2.ts` writes no silence reason (Gate 3 writes the two sound ones); and `scripts/` is in `check.mjs`’ `FULL_ONLY`, so a slice built there is never targeted. Four findings changed the design: the git-diff comparability rule is gone, because **no row records the engine version that made a run**; an absent part scores 0 against its weight, because renormalising made a run that died on its first picture outrank every finished reel; the arithmetic moved into a pure package; and the reason classifier is scoped to Gate 1 and Gate 5 reconcile.
- Round 2 verified those four hold and found 20 more, every one applied in the file: a 23rd boundary rule would turn `reel-stills` check 3, `reel-render` check 2 and `paid-path` check 4 red (each asserts `22 rules proven to fire`) with no amendment list; the purity rule forbids the `node:crypto` the brief key needs; the brief key erases `until` and `budgetCents`; `kept_from` rows are counted twice across runs; the credit guard cannot separate an honest prompt fix from gaming; and the ledger’s columns, the fixture corpus’ provenance and the exact expected ratings are unspecified. **S-182 is unwritten** — its weights wait on the owner’s open decision about whether the comparison stays here or goes to Deferred 1.
- Added `PROMPTS/077-benchmark-design.md` (run by this session) and `PROMPTS/078-ci-on-github-actions.md` (written here, run by session 84 in parallel on branch `ci-measurement`), both listed in `PROMPTS/README.md`. Session 82’s two documents — `docs/research/yield-baseline.md` and `docs/features/picture-prompt.md` — were written but never committed, and are committed with this session.
- No code, contract, test, provider, database, media or boundary changed by this session. No reel was made and nothing was spent.

### 2026-10-12 · session 82

- Added `docs/research/yield-baseline.md`: the engine's yield over all 52 runs, read read-only from `data/cutroom.sqlite`, and the baseline later fixes are compared against. **8 of 52 runs produced a reel (15.4%)**; Gate 1 refuses 53% of pictures, Gate 5 26% of takes, Gate 7 33% of cuts; Gates 0, 1S, 3 and 4 have never refused. New measure: refusal by subjects named in the shot — 42% at one, 70% at two, 100% at three or more (clipping 23/49/100%), so the crammed prompt, not the gate, is the cause. Capacity half unused (3.1 pictures of 6; 63% of clips made from words, which cannot be held at the take cap). Five causes read from source: `PictureAnswer` has no `unavailable` kind so the image port gets no transient resend (6 dead runs); `reconcileAnswer`'s single `entity` index makes a plural subject unsatisfiable against `COUNT_RULE` (19 refusals); `gate4.ts` returns `accept` unconditionally; nothing caps subjects per shot; the picture prompt names what it forbids while FLUX.2 has no negative prompt (38 refusals). Clips are 53–87% of wall clock and the slowest run retried nothing, so retries are not what makes a reel slow.
- Added `docs/features/picture-prompt.md`, gates unwritten: the first fix, scoped to `pictureEntry` in `packages/pipeline/src/stills/prompts.ts` — framing discipline, describing the wanted state instead of naming the forbidden, and removing prompts that both demand and forbid a person. Records the rejected alternative: changing the clipping veto in `gate1.ts`, disproved by the owner with a 9:16 image of a whole spiral galaxy; D-044 and D-046 stand.
- Added `PROMPTS/077-benchmark-design.md` (for session 83) and listed it in `PROMPTS/README.md`: design and specify the benchmark every later fix is measured against — four gates and the `S-` entry, no implementation of any kind. It names the ten choices that session must settle, chief among them that the 15.4% baseline is a historical record across changing briefs and a changing engine, not a controlled measurement.
- No code, contract, test or boundary changed. No `S-` entry yet — the owner asked first for a benchmark harness to compare fixes against (not started). The subjects-per-shot cap and a picture for every shot are their own feature, not started.

### 2026-10-05 · session 81

- No code or document changed besides `JOURNAL.md` (sessions 79 and 80 merged under one heading to stay within S-177's 80 lines, words unchanged). Owner asked for the minimum VM; the repository records none, so the answer was an estimate: 2 vCPU, 4 GB RAM, 20 GB disk to run reels; 4 vCPU, 8 GB, 50 GB for comfort and the full suite. Linux support is unverified.

### 2026-10-04 · session 80

- Added `knowledge-transfer/cutroom-kt.html`: one self-contained page (no CDN) that teaches the engine — draggable/zoomable graphs with click-for-detail drawers for the system map, packages and the 22 rules, every stage, failures/resume, the 21-table ER model, SDK connection and service startup; a step-through sequence diagram of one request (until plan/stills/video); tables for gates, ports and wrappers, budget, routes, settings, symptoms, playbooks, features, all 129 source files, glossary and decisions; global search. Built from source at `94ee04a`.
- 18 places the numbered KT markdown disagreed with the code (e.g. a resume re-enters at `reel.keyframes`; the service picture rule defaults to `upToThree`; `SubmitRequest` needs `worldId`, typed criteria and `depictionPolicyVersion`; 21 tables, not 12) were then corrected in `knowledge-transfer/01`–`11`, with every repeat of each mistake; the page's last tab records the corrections, and `knowledge-transfer/README.md` links the page.
- The KT markdown committed in `94ee04a` failed `prettier --check`; it is formatted now (whitespace, list numbering, code-block style). Session 71's journal entry was reflowed to one line a paragraph, words unchanged, to keep JOURNAL.md within S-177's 80 lines.

### 2026-10-01 · session 79

- Replaced the pre-implementation root README and the 2026-09-20 status snapshot with current, user-facing descriptions of the built real-provider engine, verified local SDK package, distribution boundary, operating limits, and next queue item.
- Added `docs/USING_CUTROOM.md`: requirements, safe stand-in startup, free process-level proof, package build and external install, SDK join/launch and all methods, a complete submission/follow example, the confirmed-spend real-reel command, resume, settings, outputs, and unsupported cases.
- Brought `AGENTS.md`, `CLAUDE.md`, `docs/SETUP_SURVEY.md`, and `PROMPTS/README.md` into line with 22 live boundary rules, the paid adapters, Prompt 073/074 completion, and the historical/current distinction. No runtime, contract, provider, database, package artifact, test, or boundary changed.
- Prompt 075 records the owner's documentation-and-push request. The documentation-only check is the evidence for this exact tree; the commit is pushed with the previously local Prompt 074 chain.

### 2026-10-01 · session 78

- `docs/features/cutroom-sdk-package.md` records the four-gate approval of the consumer-neutral portable SDK and contract packaging feature (S-180); the prompt's rejection criteria are applied one by one in the Adversarial review section. Every implementation file (the gate doc, `scripts/package-sdk.mjs`, each `tsconfig.build.json`, the package-owner test) follows.
- `scripts/package-sdk.mjs` wipes `.package-staging/`, runs each package's `tsconfig.build.json` with `--allowImportingTsExtensions --rewriteRelativeImportExtensions`, writes a staged manifest (real version `1.0.0`, no `private`, no `workspace:*`, ESM `.js` exports, versioned `@cutroom/reel-contract` dep), and packs via `corepack pnpm` invoked through Node directly (no shell). Source-tree `packages/{sdk,reel-contract}/package.json` are unchanged — the workspace keeps `private: true`, `workspace:*`, `0.0.0`, `.ts` exports.
- `.gitignore` gains `.package-staging/` (D-086 form, one configured path, gitignored default).
- `tests/cutroom-sdk-package-build.test.ts` (pluralized so the journey glob matches) builds the artifacts first, inspects every archive entry and staged manifest field, then installs both tarballs into a fresh `mkdtempSync(os.tmpdir(), …)` consumer outside the workspace with `pnpm.overrides` pointing at the contract tarball and `--ignore-workspace --prefer-offline`, exercises plain-Node import, typechecks public types with `tsc --noEmit`, and runs the launcher through `process.execPath` plus a JavaScript fixture that binds to a free port and answers strict `{ contractVersion: 1, ready: true }`. Eight deliberate-break tests cover `.ts` runtime export, `workspace:*`, omitted contract archive, removed `.d.ts`, absolute path, workspace-source symlink, `cmd` shell launcher, and removed public export (`close`); each restores before the next runs.
- `tests/cutroom-sdk-*.test.ts` now also matches `tests/cutroom-sdk-package-build.test.ts`, so the cutroom-sdk journey now exercises 84 tests (65 prior in routes, launcher, and readiness, plus the 19 from the package-owner test).
- Journey: `cutroom-sdk-package` at `2e66370` PASS (every check green, 19 tests, `Verification: full`); `cutroom-sdk` re-journey at `5acba17` PASS (84 tests, one transient FAIL at `3a202b0` recorded per Slice 4 / S-178 in `docs/features/cutroom-sdk.md`'s Evidence before passing on the second run); `reel-contract` re-journey at `7c648d2` PASS (42 tests, no change).
- SDK v1 is complete on Cutroom's side per S-180: reproducible build `node scripts/package-sdk.mjs` produces `.package-staging/cutroom-reel-contract-1.0.0.tgz` and `.package-staging/cutroom-sdk-1.0.0.tgz`; any consumer can install them and exercise the SDK contract. Per S-180, no KnowScroll integration, engine package, registry publication, OS installer, release manager, telemetry or update service is added. `self-heal` is the next queue item (S-168).

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
| how the code fits together       | `knowledge-transfer/cutroom-kt.html`, opened in a browser        |
