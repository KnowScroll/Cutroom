---
status: current
authority: binding for this repository's setup only
---

# DECISIONS — Cutroom setup

**Append-only.** To go against an entry, append a new one that supersedes it; never edit or
delete the old line.

**Scope: the room, not the furniture.** These entries cover toolchain, layout, checks and the
Claude Code setup. Anything about the product, the pipeline or the data model belongs in
`steering/DECISIONS.md` in the KnowScroll repository, which is the authority for both
repositories (D-088) and which **no entry here may contradict**. Numbers here are `S-`; numbers
there are `D-`.

Every entry names what was rejected and how a violation gets caught, because an entry nobody can
fail is a preference.

---

## S-001 | 2026-09-12 | The decisions are read through a pinned submodule, and staleness is checked in both directions

**Chose.** `steering-ref/` is a git submodule pinned to a commit of the KnowScroll repository.
`node scripts/decisions.mjs` reports the pinned commit, how many decisions are readable at it,
and whether it is stale — **and also** whether a local steering checkout has commits that are not
on its remote, which no pin can see.

**Rejected.** (a) A configured sibling path with no copy at all — always current, but broken on
any other machine and on CI. (b) A link in `CLAUDE.md` and nothing else — a session then has to
leave the repository to read a constraint, which is exactly when people stop reading them.

**Caught by.** `scripts/decisions.mjs` exits non-zero on either kind of staleness, and the
session-start hook runs it before the first turn.

**Confirmed-by.** The owner, 2026-09-12, answering point 1 of Q18.

---

## S-002 | 2026-09-12 | This repository runs a light ritual of its own, and copies no steering script

**Chose.** A session-start hook that prints the pin, the boundaries, the last journal entries and
the last commits; a stop-gate that refuses to end a session with no `JOURNAL.md` entry, and that
runs the code checks when source files changed. Its own `JOURNAL.md` and `DECISIONS.md`.

**Rejected.** (a) Hygiene only — no hooks, no journal: a session then begins by reconstructing
context from whatever it opens, which is the failure this is built against. (b) Porting `state`,
`journey` and `proof` to read a local steering tree — two sets of machinery for one project, and
the steering repository has already recorded that machinery rots silently.

**Caught by.** The stop-gate hook; `.claude/settings.json` wires both hooks.

**Confirmed-by.** The owner, 2026-09-12. Consistent with Q18 point 2: the engine repository runs
tests, the steering repository runs the ritual.

---

## S-003 | 2026-09-12 | Internal packages are scoped `@cutroom/*`

**Chose.** `@cutroom/contracts`, `@cutroom/pipeline`, `@cutroom/providers`, `@cutroom/domain`,
`@cutroom/worker`, `@cutroom/api`.

**Rejected.** (a) `@knowscroll/*`, which matches the steering repository's existing names and the
way decisions quote them, at the cost of a repository whose scope disagrees with its own name and
a rename when Cutroom's core arrives. (b) `@reel/*` — wrong the moment anything that is not a
reel lands here.

**Caught by.** `tests/workspace.test.ts` asserts every package name matches `^@cutroom/`.

**Confirmed-by.** The owner, 2026-09-12.

---

## S-004 | 2026-09-12 | The three design documents are copied rather than moved, and divergence is caught mechanically

**Chose.** `VideoGenerationFlow.md`, `multi-reel-pipeline.md` and `contentions.md` are copied to
`docs/design/` with their front matter intact. Both repositories hold them.
`docs/design/COPIED_FROM.json` records the source path, the source commit and a content hash, and
`node scripts/docs-check.mjs` compares the copies against the originals in `steering-ref/`.

**Rejected.** (a) Moving them, so only this repository holds them — which was the recommendation,
because two copies of one document is the drift D-088 exists to prevent. (b) Copying with no
check, which is that drift with no alarm on it.

**Caught by.** `scripts/docs-check.mjs`, which distinguishes _the copy was edited here_ from _the
original moved_. Line endings are normalised on both sides before comparing; a lone `\r`, which
`contentions.md` contains deliberately, is not.

**Confirmed-by.** The owner, 2026-09-12, choosing "copy, keep both" over the recommendation.

---

## S-005 | 2026-09-12 | Tests run on Node's own runner with type stripping, so imports name `.ts` and `tsc` emits declarations only

**Chose.** `node --experimental-strip-types --test "<glob>"`. No test framework. Because the
runtime strips types rather than compiling, a relative import names the file that exists on disk
(`./thing.ts`), so `tsconfig.base.json` sets `allowImportingTsExtensions` with
`emitDeclarationOnly` — types for the editor, and no emitted JavaScript that could be imported by
accident and go stale.

**Rejected.** (a) Vitest — a dependency and a config for a repository whose tests are plain
assertions. (b) A `tsx` loader, which is the same cost with less of the benefit. (c) Waiting for a
Node where stripping is the default; this machine has 22.14.

**Caught by.** `tests/toolchain.test.ts` is written in TypeScript, so the runner, the flag and the
syntax are all proven by the suite running at all.

---

## S-006 | 2026-09-12 | The module boundaries are enforced by dependency-cruiser, and each rule must prove it still fires

**Chose.** Eleven rules in `.dependency-cruiser.cjs` over the real dependency graph, type-only
imports included. `node scripts/drift.mjs --prove` generates a file that violates each rule and
fails if any rule stays silent, then generates a legal shape and fails if any rule fires on it.
Both run in the test suite.

**Rejected.** (a) Describing the boundaries in prose — in the steering repository two rules the
architecture rested on were described for weeks and were not in the config at all. (b) ESLint
import rules, which cannot prove anything about themselves. (c) A check of only the current graph,
which passes trivially while every package is empty.

**Caught by.** `tests/boundaries.test.ts` asserts both modes exit zero and that the output
contains neither `SILENT` nor `EAGER`.

---

## S-007 | 2026-09-12 | Lint is ESLint flat config; formatting is Prettier; neither owns the boundaries

**Chose.** `eslint` 9 with `@eslint/js` and `typescript-eslint` recommended, plus `prettier
--check` in the checks. `eqeqeq` and unused-variable errors on.

**Rejected.** (a) No linter at all — the steering repository's `lint` script is actually its drift
check, so nothing there reads the code itself. On the first run here ESLint found a real defect: a
JavaScript string escape that had collapsed `\\.` to `\.` in a boundary regex, making it match any
character. (b) `oxlint`, faster but one more unfamiliar tool in a repository nobody else works in.

**Caught by.** `node scripts/check.mjs`, steps `lint` and `format`.

---

## S-008 | 2026-09-12 | Line endings are settled by `.gitattributes`, and a test counts bytes

**Chose.** `* text=auto eol=lf`, `*.sh text eol=lf`, and `tests/line-endings.test.ts`, which
counts `0x0d` bytes rather than reading lines.

**Rejected.** `.editorconfig` alone — which is what the steering repository has, and it is advice
to editors only. That repository's working tree is CRLF, a regex there could not match a line
ending in `\r`, and an afternoon went into finding out why.

**Caught by.** The test, which also asserts the two shell hooks contain no `\r` — bash fails them
with `$'\r': command not found`.

---

## S-009 | 2026-09-12 | pnpm is invoked through corepack at the version `package.json` pins

**Chose.** `corepack pnpm <script>`, with `"packageManager": "pnpm@10.15.1"`.

**Rejected.** (a) Installing pnpm globally — this machine does not have it on PATH, and a version
nobody pinned is how two machines get different lockfiles. (b) npm, which would fork the workspace
layout away from the steering repository's. (c) pnpm 11, which corepack offers by default; the
lessons recorded about pnpm 10's `onlyBuiltDependencies` were learned on 10.

**Caught by.** Nothing mechanical — it is a documented recipe in `.claude/skills/checks/SKILL.md`,
and the failure mode is loud (`pnpm: command not found`).

---

## S-010 | 2026-09-12 | The six-package layout is kept, with the ports as types in `contracts`

**Chose.** The proposed layout, unchanged, plus one amendment: a port is a **type in
`packages/contracts`**, and its implementations are in `packages/providers`. That is what lets
`pipeline` name a port while importing no provider, which is what the `pipeline-no-providers` rule
needs in order to be satisfiable at all.

**Rejected.** (a) A separate `packages/ports` — a package holding only types that `contracts`
already exists to hold. (b) Ports declared in `providers`, which makes every stage depend on the
adapters (D-006, D-084 point the other way).

**Caught by.** `pipeline-no-providers` and `contracts-are-a-leaf` in `drift`.

---

## S-011 | 2026-09-12 | An empty package is not referenced from the root tsconfig, and a test catches the missing reference later

**Chose.** `tsconfig.json` references only projects that have source files. Adding a package's
first file also means adding its reference.

**Rejected.** (a) A placeholder `src/index.ts` in each package — that is feature code, and the
bootstrap is explicit that not even the types may exist yet. (b) `"files": []` stubs, which make
`tsc -b` pass while checking nothing, and which nobody would remember to undo.

**Caught by.** `tests/workspace.test.ts` fails when a package contains a `.ts` file and is not
referenced — an unreferenced package is one nothing typechecks.

---

## S-012 | 2026-09-12 | Migration tooling exists; the tables do not

**Chose.** `drizzle.config.ts` and an empty `db/migrations/`, with `db:generate` and `db:migrate`
scripts. The config points at `packages/domain/src/schema.ts`, which does not exist, so
`db:generate` fails until it does.

**Rejected.** (a) Authoring the tables — they are a feature's first slice, and its gates are in
review. (b) Leaving the tooling out, so the first schema session has to choose a migration tool
while also designing tables.

**Caught by.** The failure is the mechanism: drizzle-kit reports the missing schema path.
---

## S-013 | 2026-09-12 | Boundary rules are matched on resolved file paths, which is what makes a rule between two folders of one package possible

**Chose.** Every rule is expressed as a **file path pattern over the resolved dependency graph**,
never as a match against the text of an import line. On that basis four rules were added that the
steering repository's approach cannot express at all, bringing the set to fifteen. **Supersedes the
count in S-006**, not its substance.

- `plan-no-epistemic` — **D-085**: the planning and cinematic code must not import the module
  holding the truth fields. The narrowed-view type is the real enforcement; this is the backstop
  for the one thing a type cannot catch, a plan module reaching the full script through the
  epistemic module.
- `split-no-cinematic` — **D-073**: the splitter cuts prose and knows nothing about how a shot
  will be filmed. Matched on `cinematic` anywhere in the path, so it holds wherever those types
  land.
- `split-imported-only-by-plan` — **D-073**: the planner calls the splitter; nothing else imports
  it. A second caller is a second authority over where a narration unit begins.
- `split-entered-through-its-index` — **D-073**: _may call it, may not reach inside it_. The
  package-level internals rule only guards package boundaries; inside a package a deep import is
  relative, and this is its folder-level equivalent.

**Why.** The steering repository's `scripts/drift.mjs` matches an **import specifier prefix**, so
it sees `from '@knowscroll/domain'` and is blind to `from '../../domain'` — the same import, a
different spelling. D-067 put the planning and epistemic layers in **one package**, so every import
between them is relative and no prefix can ever match one. **D-085 exists because of that limit**:
it replaced the rule D-034 demanded rather than building it. D-073's `Confirmed-by` asks for a
`drift` edge that was likewise unbuildable there. Resolved paths make all four ordinary.

**Rejected.** **Matching import text**, which cannot see a relative import and silently passes.
**Splitting the folders into separate packages** so specifier matching would work — it would, and
it undoes D-067, which put them together deliberately. **Leaving D-073's edge unbuilt** because its
`Confirmed-by` was written against a tool that could not express it.

**Caught by.** `node scripts/drift.mjs --prove` builds a relative-import violation of each of the
four and fails if any stays silent, then builds the legal shape — planner calling `split/index.ts`,
epistemic keeping the full script — and fails if any rule fires on it. Both run in `pnpm test`.

---

## S-014 | 2026-09-12 | A rule must be provably live, not merely present

**Chose.** `node scripts/drift.mjs --audit` reads the rules themselves, expands the folders each
one names, and reports them as **live**, **inert** (the folder is not written yet) or **DEAD** — a
folder that does not exist in a package that **already has source files**, which is the shape of a
rename. DEAD fails the run. It is a step in `node scripts/check.mjs` and an assertion in
`tests/boundaries.test.ts`, which also asserts dependency-cruiser is installed and declared.

**Why.** In the steering repository `.dependency-cruiser.cjs` carries seven rules — including
`contracts-are-a-leaf` and `no-circular` — and the tool is **not installed**; `node_modules` there
is empty. `scripts/drift.mjs:115` wraps the entire invocation in
`existsSync(node_modules/.bin/depcruise)`, so the block is skipped **in silence** and none of those
seven rules has run once. **Configured-but-dead is worse than absent, because it reads as covered.**
The same failure has a second form this repository is exposed to: four of its rules name folders
that do not exist yet, so a gate that renames one would leave a rule reading perfectly and guarding
nothing.

**Rejected.** **Trusting that a configured rule runs** — the state next door. **Failing on any rule
whose folder is missing** — every one of the four would fail today, before the gates that create
those folders are even approved, and a check that is red by design gets ignored. **A comment asking
a future session to remember** — the thing every mechanism here exists to replace.

**Caught by.** The audit's own demonstration: with one `.ts` file dropped into
`packages/pipeline/src/`, all four folder rules report DEAD and the run exits 1. Removing the file
returns it to 0 dead.

---

## S-015 | 2026-09-14 | A feature file moved here from the steering repository lives in `docs/features/`

**Chose.** A feature whose gates were approved in the steering repository, and which D-089 or D-105 then
moves here, lives at **`docs/features/<slug>.md`**. It keeps its front matter, its gates, its review
history and a short note saying when and why it moved. Its slices are ticked and its journey recorded here
from then on. The first is `reel-contract`, moved on 2026-09-14.

**Why.** D-089 and D-105 say _that_ a feature moves here and never say _where_; this repository had no
place for one. `docs/` already holds the copied design documents under `docs/design/`, so a feature beside
them is where a session reading this repository will look.

**Unlike `docs/design/`, a file here is not a copy.** The steering repository deletes it on the move, so
there is nothing to stay byte-identical with: it is formatted like any other markdown here, and
`docs-check.mjs`, which guards the copies, does not apply to it. The move of `reel-contract` was checked for
lost content through the formatter — all 15 headings, all 27 checks and every word kept.

**Rejected.** **`steering/features/`** — a `steering/` folder beside `steering-ref/` would read as a second
authority, the ambiguity D-088 exists to prevent. **A `features/` folder at the root** — one more top-level
name for something that is documentation. **Under `docs/design/`** — that folder means "a copy that must not
diverge", and a moved feature is the opposite.

**Caught by.** Nothing mechanical yet. With one moved feature there is nothing to be inconsistent with; the
second move is the moment to add a test that every `docs/features/*.md` carries front matter and a moved-from
note.

---

## S-016 | 2026-09-14 | A feature here is marked verified by `scripts/journey.mjs`, and by nothing typed

**Chose.** `node scripts/journey.mjs <slug>` judges a feature in `docs/features/`. It **refuses and writes
nothing** unless all four gates read APPROVED, every slice is ticked, at least one test is named
`tests/<slug>-*.test.ts`, and the working tree is clean. Then it runs **every check** (`scripts/check.mjs`) and
**the feature's own tests**, and writes one evidence line — date, PASS or FAIL, the commit, and the test count or
what broke — above any earlier line. **PASS** flips `Status:` to `verified` and sets Divergence to `none`.
**FAIL** fills Divergence and leaves `Status:` alone. It never commits.

**Why.** `reel-contract` finished all five slices with every check green, and nothing was allowed to say so. Its
file says evidence is "appended by the journey, never typed by hand"; S-002 declined to port the steering
repository's `journey`, and D-089 says no proof goes back there. So the rule existed and the thing it names did
not. **The owner chose on 2026-09-14** to build a small one here, over counting a fully ticked slice list as
done. A ticked list is typed by the same hand that ticks it; a script run at a named commit is not.

**Why a clean tree.** The evidence line names a commit. With uncommitted changes, the commit is not what ran.

**Why the feature's tests as well as every check.** `check.mjs` already runs them. The second run is what gives
the evidence a count, and it means a feature with no tests of its own cannot be verified by a green repository.

**Why FAIL leaves Status alone.** A failing run proves nothing new about the feature, and a status that
changes on failure invites running it again until it doesn't.

**Supersedes S-002, in part.** S-002 rejected "porting `state`, `journey` and `proof` to read a local steering
tree". This is not that: it reads no steering tree, writes no proof bundle and nothing goes back to the steering
repository. `state` and `proof` stay unported.

**Rejected.** **Ticked slices mean verified** — nothing independent of the person ticking. **Porting the steering
repository's `journey.mjs`** — it runs Playwright journey specs, writes proof bundles under `proof/` and has a
`--red` mode, none of which exists or is needed here; red-first is shown in `JOURNAL.md` by deliberate breaks.
**Only the feature's tests, not every check** — a feature verified while a boundary rule is red. **A `--check`
flag to choose the check command** — a way to verify a feature against a weaker check. Only `--repo` exists,
and it judges a feature in another repository, never one here.

**Caught by.** `tests/journey.test.ts` — eleven cases, each run against a small throwaway git repository with a
check script that passes or fails on command. Eleven deliberate breaks to the script, each caught by the case
meant for it. **Not caught:** an evidence line typed by hand. Nothing stops that, here or in the steering
repository.

**Confirmed-by.** The owner, 2026-09-14: _"Small script in the engine repo"_.

---

## S-017 | 2026-09-14 | Decisions about the engine and Cutroom are written here now; the steering repository's D-entries bind until one here supersedes them

**Chose.** From 2026-09-14 this file holds **every new decision about the engine and Cutroom**, not only setup
choices. The numbering continues as `S-`. The steering repository's **D-001 to D-114 stay there**, read at
`steering-ref/steering/DECISIONS.md`, and **bind this repository until an entry here supersedes one by naming
it** (`Supersedes: D-0nn`). **New features are planned here**: gates written and reviewed in `docs/features/`.
The three engine feature files still in the steering repository — `reel-plan`, `reel-stills`, `reel-render` —
stay there until their gates are approved, then move here (S-015). Decisions about KnowScroll's side — the
script, the epistemic layer, the orchestrator, the player — stay in the steering repository.

**Supersedes** this file's opening scope note, which says anything about the product, the pipeline or the data
model belongs in the steering repository and that no entry here may contradict it. An entry here may now
supersede a D-entry, and must name it when it does.

**Why.** **D-115**, the steering repository's last decision about Cutroom, chosen by the owner on 2026-09-14:
_"lets stop making decisions for cutroom here, and do work there"_. The code, the boundary rules, the journey
and the first verified feature were already here; only the deciding was not.

**Rejected.** **Copying the D-entries into this file** — two copies of one authority, the drift D-088 was
written against; the owner chose to leave them where they are. **A second prefix for engine decisions beside
`S-`** — two numbering sequences in one file, and nothing a reader gains from telling them apart.

**Caught by.** Nothing mechanical. `scripts/decisions.mjs` still reports whether the pin can see the steering
repository's decisions, which still bind. A D-entry superseded here carries no mark over there — D-115 records
that cost, and says to read this file after that one for engine questions.

**Confirmed-by.** The owner, 2026-09-14, through D-115.

---

## S-018 | 2026-09-14 | The engine's service is Node's own `http` module, with no web framework

**Chose.** `apps/api/src/server.ts` serves the contract's seven routes on `node:http`: a few path patterns, bodies
read whole, every request body validated by `@cutroom/reel-contract`'s own schemas, every answer typed by them.
No dependency is added to `apps/api` beyond the two workspace packages it needs.

**Why.** Seven routes on the loopback address, for one caller (D-098). The schemas that describe every body
already exist and are the contract (D-094); what a framework adds is routing and a validation layer, and the
first is a dozen lines. The contract's stand-in, in `tests/`, had already served the same routes this way and
been held to the contract by 27 checks.

**Rejected.** **Hono** — a dependency and a router for seven routes. **Fastify** — its JSON-schema validation
would be a second description of every body beside the zod schemas, the two-copies drift the contract package
exists to prevent; skipping it would leave a framework used for little more than routing.

**Caught by.** Nothing mechanical keeps a framework out; one would arrive as a dependency in
`apps/api/package.json`, where a review sees it. What matters about the choice is checked whatever serves the
routes: `reel-plan`'s check 13 produces every status the contract gives every route, and parses each body under
its schema.

---

## S-019 | 2026-09-14 | The engine brings its database up to date itself, when it opens the file

**Chose.** `openDatabase` in `packages/domain` opens the SQLite file with better-sqlite3 in WAL mode (D-001),
turns foreign keys on, waits up to five seconds on a lock, and runs Drizzle's migrator against `db/migrations` —
the folder `drizzle-kit generate` writes to (S-012). The API and the worker each call it on start. Migrations are
committed; a new one is made with `drizzle-kit generate` after `schema.ts` changes.

**Rejected.** **Running `drizzle-kit migrate` by hand before starting the service** — a step to forget, and a
service on an old file fails at its first query rather than at start. **`CREATE TABLE IF NOT EXISTS` in code, as
the contract's stand-in does** — a second description of the tables beside `schema.ts`, and no path for the second
migration.

**Caught by.** Every `reel-plan` test starts the engine on an empty file in a temporary folder, so a table the
migration does not create fails them; check 16 reads `job` straight from the file. **Not caught:** `schema.ts`
changed without a new migration — the tests then run against the old tables and pass if nothing reads the new
column. **Not handled:** two processes opening a brand-new file at the same instant both try the first migration;
the tests start the API before the worker. `reel-plan`'s Slice 5, which restarts both, is where that is met.

---

## S-020 | 2026-09-14 | The boundary rules as `reel-plan` changes them, and the two resolver settings without which its npm rules see nothing

**Chose.** Seventeen rules. **As `reel-plan`'s Gate 2 lists:** `contracts-are-a-leaf` permits
`packages/reel-contract/` (D-099); `plan-no-epistemic` is deleted (D-096; D-103 retired D-085);
`split-no-cinematic` is replaced by `split-imports-only-itself` — nothing under `packages/pipeline/src/split/`
imports anything outside that folder; `split-entered-through-its-index` no longer names a `cinematic` folder;
`pipeline-npm-only-zod` and `model-client-only-in-providers` are added, with Gate 2's patterns character for
character; `node_modules` comes out of `options.exclude`.

**Two settings Gate 2 does not list**, each found by Slice 2's `--prove` cases and each required for those
rules to fire on a real package:

- **`enhancedResolveOptions.conditionNames: ['import', 'require', 'node', 'default']`.** zod and ai declare
  `exports` with only `types`, `import` and `require` conditions. With `exportsFields` alone, such an import
  stays **unresolved**: its path is the bare name, never a `node_modules` path, and `pipeline-npm-only-zod`
  is silent on `ai` from the pipeline. drizzle-orm, which also declares `default`, resolved — which is why
  nothing noticed.
- **`dist` in `options.exclude` anchored** to this repository's own tsc output: `^dist/` and
  `^(apps|packages)/[^/]+/dist/`. Unanchored, it matched `node_modules/.pnpm/ai@…/node_modules/ai/dist/index.mjs`
  and removed the edge from the graph, so once `ai` resolved **both** npm rules were silent on it from the
  pipeline, the worker and the API.

**And `--prove` itself** now counts a case as caught only when its rule fires on that file's edge to that
module, not when the rule's name appears anywhere; builds its npm packages in pnpm's layout with manifests
shaped like the real ones' (`dist/` entries, conditions-only `exports`); fails when a **legal** import does not
resolve, since a rule is trivially silent on an edge that never reached the graph; and works in a folder named
for its process, because two test files now run it at once.

**Supersedes** **S-013**'s list of four folder rules and its count, and the counts in S-006 and `CLAUDE.md`
(fifteen, sixteen). Not their substance: rules are still matched on resolved paths, and each is still proven.

**Why.** Gate 2's experiment ran the rules in a miniature workspace whose packages had plain manifests with
root-level files. Every real shape that differs from that — an entry under `dist/`, an `exports` map with no
`default` — made a rule read correctly and match nothing, which is S-014's failure arriving through the
resolver instead of through a rename. Seen in this order on 2026-09-14: the gate's config as written,
`pipeline-npm-only-zod` SILENT on `ai` and five legal npm imports UNRESOLVED; with `conditionNames`, four cases
SILENT and `ai` "not in the graph"; with `dist` anchored, all 38 cases caught and every legal import resolved.

**Rejected.** **Catching unresolved bare imports by dependency type** inside `pipeline-npm-only-zod` — a
second pattern beside the approved one, and every other path rule stays blind to the same imports; resolving
them fixes the graph for all seventeen. **Putting `types` among the conditions** — zod lists `types` first, so
its edge would be a declaration file rather than the code Node loads. **Dropping `dist` from `exclude`** —
tsc's declarations in `packages/*/dist` would enter the graph beside every source file. **Counting a rule as
proven when its name appears once** — the npm rules have several cases each, and one firing would have covered
all of them, including a silent one.

**Caught by.** `node scripts/drift.mjs --prove`, whose cases reproduce both holes: undo `conditionNames` and
`pipeline-npm-only-zod` goes SILENT on `ai` while zod and ai go UNRESOLVED; unanchor `dist` and
`model-client-only-in-providers` goes SILENT on three cases. `reel-plan`'s checks 8 and 9
(`tests/reel-plan-rules.test.ts`) assert each case's own line, and that `exclude` keeps a store path in the
graph and tsc output out of it. **Not caught:** an npm package that is not installed, imported from the
pipeline, has no `node_modules` path and passes `pipeline-npm-only-zod` (only `ai` and `@ai-sdk/*` are matched
by name); the typecheck fails on such an import. A global `fetch` in the pipeline — `reel-plan`'s deferred
item 8.

---

## S-021 | 2026-09-15 | The worker is handed its model port by whoever starts it, and never constructs one

**Chose.** `startWorker` takes `model: LanguageModelPort` as a **required** option, beside optional `settings`
(defaulting to the pipeline's `DEFAULT_PLAN_SETTINGS`) and `budgetPath` (defaulting to the pinned
`steering-ref/steering/BUDGET.md`, D-100). The worker wraps the port it is given in `recording-port.ts`, so every
receipt is written as its call returns, and passes that to `planReel`. `apps/worker` does not depend on
`@cutroom/providers`; the tests' harness builds the stand-in and hands it over.

**Why.** `reel-plan`'s Gate 2 says the worker hands `planReel` "the stand-in wrapped", and Gate 3 gives no signature
for how the worker comes to hold it. Whoever holds the choice of model is choosing whether a run can spend. Kept out of
the runner, the choice is made once, by the code that starts the engine, and the runner stays the same when a real
adapter arrives with the paid-path feature.

**Rejected.** **The worker constructs the stand-in itself** — one less argument, and it puts an adapter choice in the
runner: the paid-path feature would then either edit the runner or select an adapter by a setting, which Gate 3's
fourth least-confident decision rejects as _"a property asserted of a setting"_; and a worker started with no script
would fail every run that reaches a call. **An environment variable naming the adapter** — the same setting, read
from the surroundings Gate 1 requires to hold no secret.

**Caught by.** The type: `model` is required, so `tsc -b` fails on a worker started without one. `reel-plan`'s checks
6 and 37 run the real worker with the stand-in the harness built, and 37 asserts one receipt per call the stand-in
received. **Not caught:** a later change adding `@cutroom/providers` to the worker and building a port inside it — no
boundary rule forbids `apps/worker -> packages/providers`.

---

## S-022 | 2026-09-15 | The plan score is a plain weighted sum of six named terms, and a weight that is not a non-negative number counts as 0

**Chose.** `PlanScore` keeps Slice 2's shape, `{ terms, total }`. `terms` has six keys, which are also the keys of
`PlanSettings.score.weights`: `coverage` (share of the request's claims shown by some shot; 1 when there are no
claims), `recurrence` (share of shots showing rank 1's subject; 0 when nothing is ranked or there are no shots), and
one per closed question, in the order asked — `order`, `pacing`, `juxtaposition`, `distinct` — each 1 for `yes` and 0
for anything else. `total` is the sum of weight × term. **A weight that is missing, negative, `NaN` or infinite
counts as 0**, and the total is capped at the largest finite number. Every default weight is 1, provisional until
M-1 (D-064). The fourth question is worded so that `yes` is good: _does every shot show something no other shot has
already shown?_

**Why.** Gate 2 fixes the score as _"a weighted sum with non-negative weights over terms between 0 and 1"_ with _"no
path that rejects"_ (I-16) and leaves what the terms are called, how an answer becomes a number and what an invalid
weight does. Weights are settings, so a mistyped one is an expected input, and the score must still return a number.

**Rejected.** **Dividing by the sum of the weights** — keeps totals between 0 and 1, and returns `NaN` when every
weight is 0, which is a total that compares false with everything and silently selects the 4-unit plan. **Refusing
invalid weights** — a path that rejects, which I-16 forbids in a score. **Keying the question terms by the question's
wording** — rewording a question, which Gate 2 makes a setting, would drop its weight to 0 unnoticed. **A `yes` that
means bad on the repetition question** — one term scored the other way from the other three, and a reader of the
weights cannot tell.

**Caught by.** `reel-plan`'s check 35 (`tests/reel-plan-score.test.ts`) scores every combination of answers,
malformed answers, zero, missing, negative, `NaN`, infinite and huge weights, a plan with no shots and a request with
no claims, and asserts a finite, non-negative total and every term between 0 and 1 — and that `plan/score.ts` holds
no `throw`. Dividing by the weight sum was the break it was watched catching.

---

## S-023 | 2026-09-15 | The planning answer is also refused for a subject named twice, a shot showing an unnamed subject, and a duration in part-seconds

**Chose.** Beside D-070's guard — each unit exactly one shot, and no shot for a unit that does not exist — the
planning call's schema refuses an answer that names one subject id twice, a shot whose `subjectIds` names a subject
the answer does not, or a `durationSeconds` that is not a whole number. As Gate 3's second least-confident decision
says of any schema refusal, such a run finishes `failed`.

**Why.** Each is an answer that is not a plan in D-029's sense, and each would otherwise be absorbed silently by code
downstream. D-029 part 1 has subjects _"named … and deduped there"_; a duplicated id would make ranking count one
subject under two entries. A shot naming an unknown id would be dropped by the ranking without a trace, changing the
image-call count and the estimate. D-019 records the video model's `duration` as 5–15, and the schema it was read
from types it as an integer (`steering-ref/docs/research/minimax-h3.md`); a plan of 7.5 would be estimated for a clip
that cannot be requested.

**Rejected.** **Accepting and ignoring them** — the plan then differs from what the model said, with nothing
recording it. **Refusing them at Gate 0** — a fifth condition D-063 does not have, and the repair path for an answer
that was never a plan (the same reason Gate 3 gives for treating schema refusals as faults). **Rounding durations** —
code changing a cinematic field the planning layer owns (D-034).

**Caught by.** `reel-plan`'s check 7 (`tests/reel-plan-shapes.test.ts`) asserts each is refused. Each refusal was
disabled on purpose once and check 7, alone, failed.

---

## S-024 | 2026-09-15 | The repair call is also shown the plan it corrects, and every tie between the two plans goes to plan `a`

**Chose.** The one repair call (D-064) is given, in `repairPrompt` (`packages/pipeline/src/plan/prompts.ts`): both
plans' Gate 0 verdicts, one line each, naming the plan by its unit count and listing every condition it failed; a
sentence per failed condition saying what it asks; **the shots of the plan whose grouping D-114 picked** — each
unit's seconds and the subjects it shows; and then the same body as a planning call on that grouping — the units,
their claims, the shape bounds and the criteria. Its schema is the planning schema for that unit count, and code
builds the repair plan exactly as it builds `a` and `b`. **When D-114's first two rules tie, the grouping is `a`'s**,
the plan planned first — the 4-unit plan at the default `shotCountUnits` — as a tied plan score already goes to `a`
(Slice 3).

**Why.** D-114's title says the repair plan _"starts from the plan that came closest to passing"_; its body says the
call is given _"that grouping and both plans' Gate 0 verdicts"_. Gate 3 names neither the prompt nor its contents.
D-047's reason for an informed repair — _"a retry that cannot see why the previous take failed is a re-roll"_ — is
half met by the verdicts alone: a call told _"shape"_ without the durations that failed it is a third planning call
with a hint. D-114 also justifies the choice as _"correcting the plan with fewer problems asks the call to fix
less"_, which assumes the call can see that plan. On the tie: Gate 2 calls the score's tie winner _"the 4-unit plan,
the one planned first"_; the two descriptions part only when the setting puts the larger count first.

**Rejected.** **The grouping and the verdicts only** — the literal minimum, and the call re-plans from nothing.
**Both plans' shots** — two plans in one request, which D-064 keeps out of the score call, and a grouping the call
may not use. **A tie to the plan with fewer units** — a second reading of _"the 4-unit plan"_ that disagrees with the
score's tie whenever the setting is reversed, and has no answer for a pair of equal counts.

**Caught by.** `reel-plan`'s check 39 (`tests/reel-plan-repair.test.ts`): the repair call's schema accepts only the
picked grouping's unit count and its prompt lists exactly those units; each verdict line carries exactly its plan's
failed conditions; the prompt carries every shot of the kept plan and none of the other's; each of D-114's rules and
the full tie is built. Breaks watched: dropping one verdict line, dropping the kept plan's shots, showing the other
plan's shots, and a tie going to `b` — each caught by 39.

---

## S-025 | 2026-09-15 | A run that ends at the plan step with no plan selected has no `stage.finished`

**Chose.** The events of a `reel.plan` run, by how it ends:

- **completed** — `run.accepted`, `stage.started`, one `verdict` per plan (two, or three with a repair),
  `stage.finished`, `run.finished`;
- **refused for budget**, or **stopped for rule `gate-0`** — `run.accepted`, `stage.started`, three `verdict`s,
  `run.finished`;
- **stopped for rule `split`**, or **failed** — `run.accepted`, `stage.started`, `run.finished`.

Verdicts are written for `a`, `b` and `repair` in that order, with the plan rows and the result, in the one
finishing transaction.

**Why.** Gate 2 lists the events _"a plan run emits"_ once, for a run that completes, and does not say whether a
stage that produced no plan finished. The contract's stand-in (`tests/stand-in/reel-engine-stand-in.ts`), held to
the approved contract by its journey, sends `stage.finished` for `plan` only when a plan goes on — to completion or
to the next stage — and never before a refusal at the per-reel cap, a rule stop or a failure. A caller built
against it reads `stage.finished` as _"there is a plan"_.

**Rejected.** **`stage.finished` whenever `planReel` returned an answer** — the stage did run to its end, and a
caller would see an event the contract's stand-in never sends for those endings. **Verdict events for `a` and `b`
only** — the repair has its own verdict (D-113), and the events would count fewer verdicts than the plan rows.

**Caught by.** `reel-plan`'s checks 20, 38, 40, 41, 42 and 44 assert each ending's event types exactly. Breaks
watched: `stage.finished` on every ending, and no verdict events when nothing is selected — each caught by 41 and 42.

---

## S-026 | 2026-09-15 | A per-reel cap refusal appends a Markdown entry to the questions file, after the run is finished

**Chose.** `apps/worker/src/questions.ts`. The file is the worker's `questionsPath` setting, defaulting to
`QUESTIONS.md` at this repository's root. On first write it is created with a short header (flag `wx`, so two
writers cannot both write one). Each refusal for `limit: 'reel'` then appends **one entry**: a `## ` heading with the
time, the run id and _"refused: every plan is over the per-reel cap"_; bullets for the request id, the lowest
estimate, the per-reel cap, the caller's ceiling, each plan's role, unit count and estimate, and the two rates; and
one question. Entries are not numbered. The worker appends it **after** the transaction that finishes the run.
Nothing else is ever written to the file, and nothing reads it back.

**Why.** D-014 and D-097 say a question is written to `QUESTIONS.md` and what a refusal must carry; neither says
the entry's form. The reader is the owner, and the steering repository's questions file is Markdown with a heading
per question. The figures are D-097's; the rates are there because an estimate is only as good as them (Q9). After
the transaction because Gate 2's sequence puts it there, and because a job is run again from the start after an
interruption: a question written before the finish would be written twice for one refusal.

**Rejected.** **Numbering entries `Q-n`** by reading the file first — a read, parse and write that fails on a
hand-edited file and races two workers; the steering file's numbers are the owner's to assign. **JSON lines** —
machine-readable, and nothing but the owner reads it. **Appending before the finishing transaction** — above.
**Inside the transaction** — a file is not rolled back.

**Not handled.** A crash between the commit and the append loses the question; the refusal itself is kept. An
append that throws leaves the run refused and its job marked `dead` with the error, by the worker's existing
`buryJob`.

**Caught by.** `reel-plan`'s check 41 (`tests/reel-plan-endings.test.ts`): the file is absent before the first
refusal and created by it; one `## ` entry per refusal, naming the run and the request and carrying the lowest
estimate, the ceiling and the cap; a second refusal appends and leaves the first entry byte for byte; nothing else
is written to the engine's folder; the repository's own `QUESTIONS.md` is untouched; the default path is the root's.
Checks 42 and 43 assert no question for a rule stop or a plan-only run over its ceiling. Breaks watched: no append,
an overwrite instead of an append, the default one folder too high (41); a question on a rule stop (41, 42); a
question for a completed run over its ceiling (43).

---

## S-027 | 2026-09-15 | An abandoned job is claimed again when its lease runs out; the cancel flag and `stage.started` are settled in one transaction before every attempt

**Chose.** Four parts, all about a `reel.plan` job that a worker took and did not finish.

- **Reclaim by lease.** `claimJob` (`packages/domain/src/queue.ts`) takes the oldest job that is `queued` and due,
  **or `running` with `lease_until` at or before now**. The claim sets `locked_at`, a new `lease_until` and
  `attempts + 1`, and the job runs from the start. The lease is the worker's `leaseMs` setting, default 60 seconds
  (`DEFAULT_LEASE_MS`). Nothing renews it.
- **Before every attempt, one immediate transaction** — `startPlanStage` (`packages/domain/src/runs.ts`): if the run's
  cancel flag is set it answers `cancelled` and writes nothing, and the worker finishes the run `cancelled`, cost 0;
  otherwise it appends `stage.started` for `plan` **unless the run already has one**, found by reading the event
  bodies. So a run cancelled before its stage has no `stage.started`, and a run whose job is run again keeps the one
  its first attempt wrote.
- **A cancel that arrives while a job is interrupted is honoured** when the job is claimed again: the run finishes
  `cancelled`, with the `stage.started` of the attempt that died and the receipts of the calls that returned, and no
  model is asked again.
- **"Mid-run" in check 46 is a worker process killed.** `tests/engine/worker-process.ts` runs the real `startWorker` in
  a child process whose stand-in never answers one chosen call; the test waits for it to say so, kills it (a
  `SIGKILL`, which on Windows is `TerminateProcess`), stops and starts the API on the same file, and starts a new worker.

**Why.** Gate 2 says a claimed, unfinished job _"is run again from the start"_ and that `stage.started` _"is not
written twice"_, and names neither how the job is found nor how the repeat is avoided. D-002 already chose the
mechanism: a `lease_until` column, _"lease-based claiming gives us … crash recovery for free"_, confirmed by _"worker
restart mid-job re-leases rather than duplicating"_. Slice 1 wrote the lease and nothing read it. The cancel read shares
the transaction so a cancel cannot land between the read and the start. Honouring a cancel on a second attempt costs
nothing the contract promises — Gate review 2 notes a cancel during the stage need not stop it, not that it must not —
and a run the caller asked to stop is not planned again, which will matter when a call costs money.

**Rejected.** **Reclaim every `running` job when a worker starts** — no wait after a crash, and a second worker's start
takes the first's live job, which D-002's lease exists to prevent. **Knowing `stage.started` was written from
`attempts > 1`** — an attempt that died between its claim and the event would leave a run that never has one. **A column
on `run` for the stage** — a migration, and a second record of what the event log already says. **Reading the cancel
flag only when the stage has not started** (Gate 2's words, literally) — the second attempt would re-run every call of a
run the caller cancelled. **A stand-in answer that waits, with an in-process worker** — its `stop()` finishes the job in
hand, so it cannot be stopped mid-run, and a held promise left behind would write to a closed database. **Setting a
job's row to `running` by hand** — it proves what the test wrote, not what a dying worker leaves.

**Not handled.** A job that outlasts its lease while its worker is alive is claimed by a second worker — there is one
worker today, and the stand-in answers at once. A job that kills its worker every time is claimed forever: no attempt
limit. **S-019's race is not met here**: a restart opens a file whose migrations are applied, and Drizzle's migrator
then runs an empty transaction. Two processes opening a **brand-new** file at once still both read "no migration
applied" before their `BEGIN`, so the second fails on an existing table; the tests still start the API first, and the
child worker opens the file after it.

**Caught by.** `reel-plan`'s check 46 (`tests/reel-plan-restart.test.ts`): before the kill, events 1–2 are
`run.accepted` and `stage.started`, one receipt, the job `running` at attempt 1; after the restart the run is found by
`requestId` at the same `lastSeq`, a replay returns it, it completes, events 3–6 follow with no gap, `stage.started`
appears once, the first receipt is kept beside four new ones, and the job is `done` at attempt 2 with its second
`locked_at` no earlier than the first `lease_until`. Check 45 (`tests/reel-plan-cancel.test.ts`) asserts a cancelled run
has no `stage.started` and its second test the cancel read on a second attempt. Breaks watched: no reclaim (45's second
test, 46); the lease ignored (46); the worker's `leaseMs` ignored (45's second test, 46); `stage.started` on every attempt
(46); the repeat looked for under another stage (46); the flag ignored (45, both tests); the flag read only before a
first start (45's second test); `stage.started` written before the flag is read (45). Check 47 re-runs both files, so it
fails with each.

---

## S-028 | 2026-09-15 | Check 47's child is given PATH alone, and on Windows the eleven variables libuv adds are what "the operating system needs"

**Chose.** `tests/reel-plan-secrets.test.ts` starts every other `tests/reel-plan-*.test.ts` in one `node --test` child
whose `env` is **`{ PATH }` and nothing else**. Before that it starts a probe with the same object and reads the
environment the probe actually has. The variables allowed there are **`PATH`** and, on Windows only, the eleven that
libuv — the layer Node spawns through — copies from the parent into any child environment that lacks them:
`HOMEDRIVE`, `HOMEPATH`, `LOGONSERVER`, `SYSTEMDRIVE`, `SYSTEMROOT`, `TEMP`, `USERDOMAIN`, `USERNAME`, `USERPROFILE`,
`WINDIR` and `PATH` itself. A canary shaped like a key is set in the test's own process and must not reach the probe.
The suite must pass with no failure, cancellation, skip or todo, and every check 1–46 must appear among its passing
tests — 47 must not.

**Why.** Seen on this machine on 2026-09-15 (Node 22.14): a child spawned with `env: { PATH }` holds exactly those
eleven, and one spawned with `env: {}` holds the same eleven and starts. So on Windows no environment given to
`spawn` is really "only PATH", and a check that trusted its own argument would state something false. None of the
eleven is a credential: they name the machine, the user and folders. The roll call of 1–46 is there because a child
that ran fewer files, or matched none, would otherwise pass as green.

**Rejected.** **Asserting the argument, not the child** — true of the object and false of the process on Windows.
**Passing a hand-picked Windows set, such as `SYSTEMROOT` and `TEMP`** — libuv adds the rest regardless, so an
assertion of "only these" fails, and not asserting it hides what the child holds. **Filtering the parent's environment
by name** (dropping `*KEY*`, `*TOKEN*`, `*SECRET*`) — a secret under any other name passes. **Running `check.mjs` in
the child** — Gate 1 is about the journey's tests, and the check would run 47 again, inside itself.

**Caught by.** Check 47 itself. Breaks watched: the child handed `process.env` (the probe sees the canary and the extra
variables); the worker requiring `HOME`, which the parent shell has and the bare environment does not (47 alone — every
other test passed in the parent); a test file left out of the child (47, checks 15 and 16 missing); its own file left
in (47, before anything is spawned). **Not caught:** a secret held under one of the eleven names, and anything read
from a file rather than the environment.

---

## S-029 | 2026-09-15 | A criterion in the contract carries its type, `presence` or `event`, and D-043 stands

**Chose.** `@cutroom/reel-contract`'s `Criterion` gains a **required** `type: 'presence' | 'event'`, supplied by the
caller — KnowScroll's `reel-script`, which computes the criteria (D-096). **In `mustNotShow` only `presence` is
accepted**, since D-043 says `mustNotShow` is always `presence`. D-043 binds as written: an untyped criterion fails
validation, `presence` is checked on the still and the clip, `event` on the clip only. **Not decided here**, and left
to `reel-stills`' Gate 2 under D-106: whether this is an amendment to contract version 1, while no caller is built, or
version 2.

**Why.** D-043's type is what stops Gate 1 checking a still for motion it can never show — without it every shot with
a verb fails its picture. The approved contract was written without it, so a caller cannot say which a criterion is,
and D-043 forbids the engine inferring it from the words (_"the hero turns to face the door"_ against _"the hero faces
the door"_). **The owner chose it on 2026-09-15**, answering a questions session before `reel-stills`' gates. No caller
of the contract exists yet (Q16), so the change will never be cheaper.

**Rejected.** **Every caller criterion counts as `presence`** — the contract stays as it is, and D-043's doom loop
returns bounded by D-047's one repair: a reel whose criterion has a verb fails at its picture instead of looping. **Caller
criteria checked on clips only** — D-043's rejected _"keyframe checks nothing"_, which pays $0.32 for a clip to learn
what a $0.15 picture showed (D-042). **The engine inferring the type from the text** — D-043's own rejection.

**Caught by.** Nothing yet: no code. `reel-stills`' Gate 3 must carry checks that an untyped criterion and an `event` in
`mustNotShow` are refused, and that no `event` criterion appears in a Gate 1 verdict (D-043's `Confirmed-by`). The
reviewer of those gates holds them to it. **Also owed by KnowScroll:** `reel-script` must emit the type.

**Confirmed-by.** The owner, 2026-09-15.

---

## S-030 | 2026-09-15 | A `stills` run is admitted against the caller's ceiling by the pictures' share of the estimate

**Chose.** Before any picture is made, a run with `until: 'stills'` compares **the cost of the image calls its chosen
plan plans** with the request's `budgetCents`. The video's share of the estimate is not compared: this run does not
spend it. **The per-reel cap is unchanged** — Gate 0 already compares the whole reel's estimate with it (D-063, D-100),
so a plan whose reel could not be made under the cap is never chosen. A refusal carries `limit: 'ceiling'` and that
figure as `estimateCents`, as the contract says (_"the figure that was compared"_). **Left to `reel-stills`' Gate 2:**
whether the reserve calls D-027 holds count in the admitted figure, or a repair that would pass the ceiling stops the
run for budget, which the contract already answers when a limit is passed while being made.

**Why.** D-100: the orchestrator _"gives **each run** a spending ceiling"_. A stills run's ceiling is what that run may
spend. The contract's _Pending_, item 2, left the figure to the engine. **The owner chose it on 2026-09-15.**

**Rejected.** **The whole reel's estimate** — never buys pictures for a reel this ceiling could not finish, but turns a
run's ceiling into a reel's budget, and refuses a picture preview for video money it would not spend.

**Caught by.** Nothing yet: no code. `reel-stills`' Gate 3 must carry a check with a plan whose pictures fit the ceiling
and whose whole estimate does not — admitted — and one whose pictures do not — refused, `limit: 'ceiling'`, with the
pictures' figure. The contract's _Pending_ item 2 is answered by this entry.

**Confirmed-by.** The owner, 2026-09-15.

---

## S-031 | 2026-09-15 | Gate 1 stops a picture at a failed technical step; otherwise its other three steps all run

**Chose.** Gate 1's four steps (D-042) — technical, text, blind witness, reconcile — run in order on each picture. **A
picture that fails the technical step stops there**: there is nothing a witness can look at in a file that cannot be
read or is the wrong size. **Any other failure does not stop the gate**: text, witness and reconcile each run, and the
verdict records every step's outcome. So every picture that passed the technical step has an observation and a
reconciliation, and D-047's informed repair is given every reason a picture failed.

**Why.** The contract's _Pending_, item 3, left it open, and the record's observation and reconciliation ids are optional
until it is settled. Gate 0 records every condition that fails (D-114) so the repair can see them; the same reason holds
here, and D-047 says a retry that cannot see why is a re-roll. Gate model calls are covered by the token plan (D-042), so
running the later steps costs time, not money. **The owner chose it on 2026-09-15.**

**Rejected.** **Stop at the first failure** — fewest calls; a failed picture may have no observation, and the repair
knows only the first reason. **Always run all four** — the witness and reconcile then run on a file the technical step
found unreadable.

**Caught by.** Nothing yet: no code. `reel-stills`' Gate 3 must carry checks that a picture failing the technical step
has no witness or reconcile call and no observation id, and that a picture failing the text step still has both. The
contract's _Pending_ item 3 is answered by this entry.

**Confirmed-by.** The owner, 2026-09-15.

---

## S-032 | 2026-09-15 | `reel-stills` builds no declared state change; D-037 and D-048 wait for a later feature

**Chose.** In `reel-stills` the planner declares **no within-shot state change**, so no reel plans D-037's end-frame pin
and **no plan has more than four image calls**, with two held in reserve (D-027). The planning call gains no
state-change field. D-037 and D-048 are not superseded; they are **not built**, and are listed in `reel-stills`'
_Deferred_ with no feature assigned.

**Why.** `reel-plan` deferred the state change and its fifth call to `reel-stills`. Building it brings D-048's remainder
— a consistency repair when the one reserve slot is spent — which D-048 says needs its own decision, and C-6, the case
it serves, is still open. `reel-stills` is to be written by removing promises, as `reel-plan` was. **The owner chose it
on 2026-09-15.**

**Rejected.** **Build it in `reel-stills`** — a larger first picture feature carrying an undecided repair path.

**Caught by.** Nothing yet. `reel-plan`'s check 25 already asserts no plan exceeds four image calls; `reel-stills`'
Gate 3 must keep a check of that. A plan of five is then a regression, until a feature that builds D-048 supersedes this
entry.

**Confirmed-by.** The owner, 2026-09-15.

---

## S-033 | 2026-09-15 | `reel-stills` and `reel-render` are planned here, not in the steering repository

**Chose.** Both feature files move to **`docs/features/reel-stills.md`** and **`docs/features/reel-render.md`** now,
before their gates are written, and their gates are written and reviewed here, as `video-edits`' will be. The steering
repository's copies, last changed at `e05e9f0`, are the owner's to delete there. Until they are, the files here are the
authority and those are stale.

**Supersedes:** **S-017**, on its exception — _"The three engine feature files still in the steering repository —
`reel-plan`, `reel-stills`, `reel-render` — stay there until their gates are approved, then move here"_. No engine
feature is planned in the steering repository any more. `CLAUDE.md`'s rule 1 is changed to match.

**Why.** D-115, in the owner's words: _"lets stop making decisions for cutroom here, and do work there"_. Both files
are stubs with no gate written, and `reel-stills`' says to rewrite rather than copy. Writing gates there would need a
session in the other repository and a pin bump for every change read here. **The owner chose it on 2026-09-15.**

**Rejected.** **Keep S-017's exception** — the gates are written in a KnowScroll session and moved on approval, as
`reel-plan`'s were.

**Caught by.** Nothing mechanical. S-015's promised test — every `docs/features/*.md` carries front matter and a
moved-from note — is still not written, with four feature files here now.

**Confirmed-by.** The owner, 2026-09-15.

---

## S-034 | 2026-09-15 | A criterion's `type` amends contract version 1; there is no version 2

**Chose.** S-029's required `Criterion.type` — `presence` or `event`, `presence` only in `mustNotShow` — is added to
`@cutroom/reel-contract` **in version 1**. `CONTRACT_VERSION` stays `1`. Every criterion in `reel-contract`'s and
`reel-plan`'s test fixtures gains a type in the same slice. `docs/features/reel-contract.md` gains a note naming this
entry and S-030; its approved gates are not edited.

**Why.** S-029 left it to `reel-stills`' Gate 2 under D-106. The version exists so that _"a caller that sends version 1
keeps working when version 2 adds fields"_ (D-095). **No caller exists**: nothing in the KnowScroll repository depends on
the package, and `reel-script` is not built (S-029), so a bump protects no one. D-095 gives version 1 _"Phase 1's
fields"_, and D-043's type is a Phase 1 field the contract was written without. And a version 2 would leave version 1
unusable anyway: D-043 says an untyped criterion fails validation, so the engine would refuse every version-1 request
that carries a criterion.

**Rejected.** **Version 2** — `CONTRACT_VERSION` 2 and either two request schemas served side by side or version 1
refused outright; the first is two copies of the request to keep in step for a caller that does not exist, the second
is a version bump with nothing on the far side of it. **Leave the type out and infer it** — D-043's own rejection,
restated by S-029.

**Caught by.** `reel-stills`' check 1: a criterion without a type, and a `mustNotShow` criterion typed `event`, fail
validation, and `CONTRACT_VERSION` is 1. `reel-contract`'s shape checks run unchanged over the amended schema.

---

## S-035 | 2026-09-15 | A `stills` run is admitted on its planned image calls only; every image call is guarded, and one that would pass a limit stops the run

**Chose.** S-030's admitted figure is **the selected plan's planned image calls × the image rate**, and **does not
count D-027's reserve**. Admission refuses a figure above `budgetCents`; exactly equal is admitted. **Before every
image call** — planned or reserve — the worker's guard compares **the chain's spend plus the image rate**, first with
**the per-reel cap** and then with **the ceiling**. (The six-call ceiling is kept by the reserve, S-043 and S-048, not by
the guard.) Above either, the call is
not made and the run finishes **`stopped`, `reason: 'budget'`**, with `limit: 'reel'` if the cap would be passed, else
`'ceiling'`, and `estimateCents` the spend plus the rate. **A stop at the per-reel cap appends one entry to the questions
file** after the run finishes, in S-026's form with its own heading; a stop at the ceiling writes none.

**Supersedes:** **D-081**, on _"checked before each job in the chain is enqueued"_ and its `Confirmed-by` _"a chain whose
accumulated cost would pass $3.00 refuses the next job rather than the first"_ — the cap is compared over the chain's
`SUM(cost_cents)` **before each image call**, and a call that would pass it is refused. D-081's chain, its
`correlation_id` and its sum stand.

**Why.** S-030 left the reserve open. D-083's estimate is _"what the reel would cost to generate as planned"_; D-027
plans four calls and holds two _"unspent at plan time"_; D-048 reports a plan's _"planned"_ and _"reserve"_ calls
separately. The contract already answers the other half: _"Making it can need extra attempts; if that passes or would
pass your limit, it stops and tells you."_ Before each call rather than each enqueue because the chain's only spend is
image calls, all inside one job, and D-014 already enforces caps _"before every paid call"_; at the enqueue the chain has
spent nothing and Gate 0 has compared the whole estimate with the cap, so a comparison there could never fire. Cap before
ceiling because D-100 writes a question only when the engine's own cap fires, and a call that passes both has passed the
cap.

**Rejected.** **Counting the reserve** — six calls' worth refused for a run that usually makes four, and a figure that
is no longer the estimate D-083 names. **A cap comparison at the enqueue as well** — a check that cannot fail. **Guarding
only reserve calls** — a real call can cost more than its rate (Q9), and a planned call is the first to find out.
**Ceiling before cap** — a run passing both would be told `ceiling`, and the owner would never be asked about the cap.

**Caught by.** `reel-stills`' checks 10 (equal admitted, one cent less refused), 42 (the comparison, cap then ceiling),
43 and 44 (a stop at the ceiling, and a reserve call not made), 45 (a stop at the cap, and its question).

---

## S-036 | 2026-09-15 | A stand-in picture costs 0 unless a test scripts a cost, and every image call's cost is added to its job row as it returns

**Chose.** Every image call writes a `generation_receipt` with the `costCents` its port reports and the image rate
applied (D-028), and **in the same transaction adds the cost to the running job row's `cost_cents`**. The spend the
guard compares (S-035) is **`SUM(cost_cents)` over every job row sharing the run's `correlation_id`** (D-081). **The
stand-in image port reports 0**, unless a test scripts a cost for a picture; every receipt it writes carries `fake:
true`. A run's `costCents` is that sum.

**Why.** Gate 1 says nothing may cost money, and the contract says `costCents` is generation spend: a stand-in charging
its rate would report spend that never happened. But a spend that is always 0 makes every budget stop, and D-081's sum,
a check that cannot fail — S-014's rule that reads correctly and matches nothing. A scripted cost exercises the same
arithmetic a real invoice will. Adding the cost to the row as each call returns keeps the sum current through a crash:
a job run again after its lease runs out (S-027) sees what its first attempt spent.

**Rejected.** **Charging the configured rate on every stand-in call** — a `costCents` that describes no payment. **Cost
always 0, not scriptable** — the stop paths unfailable. **Summing receipts instead of job rows** — D-081 names
`cost_cents` over the group, and a second sum beside it is a second ledger.

**Caught by.** `reel-stills`' checks 35 (a default run costs 0 everywhere), 42 (the sum over the chain and no other),
43 (a scripted cost stops the run, `costCents` the spend), 48 (a restarted attempt stopped by its first attempt's cost).

---

## S-037 | 2026-09-15 | Pictures enter the model port through `observe` and `compare` only; `structured` carries none, and a receipt is tied to its picture by key

**Chose.** `LanguageModelPort` has three calls. **`structured`** is `reel-plan`'s, restricted to roles `planner` and
`reconciler`, and **has no picture field** — only optional `pictureIds`, strings for its receipt. **`observe`** takes **a
picture and temperature 0, and nothing else**; its role is `witness`, its question and answer shape are fixed inside the
adapter, and its value is typed `unknown` and parsed by the pipeline at the gate boundary (D-041). **`compare`** takes two
pictures, the names of the subjects they share and temperature 0; its role is `judge` — D-006's keyframe judge — and it
is Gate 1S's adjudication. **`ModelReceipt`** gains `call` and `pictureIds`; `ModelRole` is
`planner | reconciler | witness | judge`. **An observation is tied to the one `observe` receipt whose `pictureIds` is its
picture's, and a reconciliation to the one `reconciler` receipt whose `pictureIds` is its picture's** — by key, with no
receipt id stored, since picture ids never repeat (S-046). The model stand-in keeps its `observe` and `compare` calls in
lists of their own.

**Supersedes:** **D-045**, on its `Confirmed-by` _"Exactly one vision call appears in the receipts per generated image"_ —
now **exactly one `observe` receipt per picture**; a `compare` receipt is Gate 1S's and names two pictures. D-045's
_Chose_ — the scorer and the composer read Gate 1's verdict and make no vision call — stands.

**Why.** Review 4 of `reel-engine` found the witness _"sighted by another route"_: a `structured` call accepting images,
a free prompt and any schema lets a Gate 1 step show the brief to a vision call; and `observe` receipts carried no role.
A picture that can reach a model only through a call with no text field cannot be looked at by a model told the brief
(I-8). The type alone is not enough — review 4 noted TypeScript rejects extra fields only on fresh literals — so the
stand-in records every call as made, and a check reads what reached it. **D-049, written after D-045, adds a model call
over pictures**; `compare` answers one closed question about a pair and records no observation, so the one record of what
a picture shows is still its one `observe` — what I-15 protects against: _"a second record that can disagree with the
first"_. A receipt id cannot be stored on an observation: the port's receipt has none, and `reel-plan`'s review 2 (N1)
removed the same kind of column for the same reason.

**Rejected.** **Images on `structured`** — review 4's finding. **A separate port for vision** — D-006 and D-084: one port
for text and vision. **Gate 1S's question through `observe`** — the witness would be told two pictures belong together.
**Parsing the observation inside the adapter** — the stand-in cannot import the pipeline's schema
(`providers-no-pipeline`), and D-041 validates at the gate. **A receipt id returned through the recording port** — a
field on a port type that only one implementation fills.

**Caught by.** `reel-stills`' checks 2 (each misuse a type error), 4 (roles by call), 25 (one `observe` receipt per
picture past technical, and one `reconciler` receipt per reconciliation, by picture id), 26 (every `observe` call holds
only a picture of that run and a temperature), 33 (a `compare` receipt behind every Gate 1S fail).

---

## S-038 | 2026-09-15 | Pixel work sits behind a `PictureSensorPort`; the worker is handed its image and sensor ports and cannot import an adapter

**Chose.** `packages/contracts` declares **`PictureSensorPort`** — `measure` (readable, width, height, sharpness,
exposure), `readText`, `similarity` — and **`ImagePort`**, with `acceptsReferences`. The stand-in sensor port **reads
the real file** for readable, width and height, and answers the rest from a test's script. **`startWorker` requires
`image` and `sensors`** beside `model` (S-021), and refuses to start when `image.acceptsReferences` is false (D-026). A
new boundary rule, **`worker-no-providers`**: nothing under `apps/worker` imports `packages/providers`. Seventeen rules
become eighteen.

**Why.** Review 4 found that Gate 1's technical and text steps and Gate 1S's embeddings must read pixels, which
`pipeline-no-io` forbids in the pipeline, and no port was named. A port keeps every stage a pure function handed what it
needs. `measure` reads the file because D-087 has the stand-in write real pictures so that path handling is exercised;
a scripted width would test nothing about the file. S-021 recorded a worker importing `providers` as **not caught**;
with an image port within reach, that import is how a run would come to spend.

**Rejected.** **Reading files in the pipeline, with an exception to `pipeline-no-io`** — a rule with a hole is the
_"reads as coverage"_ state S-014 exists against. **Scripting every measure** — D-087's real files never read. **Real
sharpness, text and embedding sensors now** — native dependencies for numbers whose weights and threshold are
unmeasured (D-031, D-049).

**Caught by.** `reel-stills`' checks 3 (`worker-no-providers` fires by path and by package name), 21 (a worker refuses
an image port without references), 23 (a wrong size and unreadable bytes each fail technical).

---

## S-039 | 2026-09-15 | A picture is frame 1 of one shot: the canonical on its subject's first shot, a derived picture on the earliest shot no higher rank holds

**Chose.** From D-029's ranking of the selected plan: rank 1 on **the first shot that shows it**; ranks 2 and 3 each on
**the earliest shot showing it that no higher rank holds**; **a rank whose every shot is held gets no picture and no
call**, and is not a degradation. Every other shot has no picture. A plan with no subject in two shots places nothing,
and its run completes with no picture. Shot ids are `shot-<unit>`.

**Supersedes:** **D-029** part 3 step 5, _"The remaining planned image calls … buy derived keyframes for the next-ranked
subjects, one each"_, and **D-030**'s `Confirmed-by` _"a derived keyframe issues exactly one call unless its gate
fails"_ — **for a rank every one of whose shots already opens with a higher rank's picture**: that rank gets no call.
Both stand for every rank that has a free shot.

**Why.** Review 4 of `reel-engine` found _"one approved picture per shot"_ against D-027, whose Config A plans one
canonical, two derived and **bare** shots. D-029 part 4 puts the canonical on _"its first shot"_ and says every image is
_"frame 1 of a real shot"_, but not which shot a derived picture opens; D-030's blast radius — _"its own shot plus both
derived frames and their shots"_ — counts one shot per picture, so no shot opens with two. A rank-2 subject shows in at
least two shots, so it always has a free one; a rank-3 subject can find both its shots held. Then a picture of it would
open no shot, which **D-029 part 2 forbids**: _"No image is generated purely as a reference that the viewer never sees"_.
It is not a degradation because every shot that subject appears in still opens with a checked picture: no shot is made
worse.

**Rejected.** **Every shot showing a subject opens with that subject's picture** — D-029 part 1's _"shots showing the
same thing share one"_, read literally, contradicts D-027's bare shots and D-030's count. **Passing an unplaced rank's
call to rank 4** — changes D-029's ranking, which buys derived pictures for the next two ranks. **Making the picture
anyway** — an image that opens no shot. **The planner choosing the shot** — D-034: the model names, code places.

**Caught by.** `reel-stills`' checks 13 (placement, including a rank with every shot held), 14 (every picture's shot shows
its subject in the selected plan), 15 (no subject in two shots).

---

## S-040 | 2026-09-15 | Gate 1 gives a picture the criteria of its shot, by claim; reconcile fails a picture on five conditions

**Chose.** **Which criteria, chosen by the owner:** a **`mustShow` presence criterion** is checked on the pictures of
shots whose sentences carry its `claimId`; **every `mustNotShow`** on every picture; a `mustShow` with no `claimId`, or
whose shots have no picture, on no picture — **the clip's Gate 5 checks every criterion** (D-043). **An `event`
criterion is never given to Gate 1.** **The failure conditions, this entry's reading of D-042, D-044 and D-046:**
reconcile fails a picture when **a subject its shot shows is not shown**, **a shown subject's entity is clipped by the
edge**, **a shown subject's count does not match**, **a `mustShow` is not shown**, or **a `mustNotShow` is shown**. A
subject's count matches when the entity's `count` is **the number the subject's name states; or, when it states none,
one for a singular name and two or more for a plural one** — _"the barons"_ matches any count above one; a collective
name such as _"a flock"_ is the reconciler's to read; the reconciler judges it and its prompt says so, in those words. The reconcile answer must name every subject and criterion it
was given; code applies the conditions.

**Supersedes:** **D-043**, on its table's `presence` row, _"Checked at keyframe and clip"_, and its `Confirmed-by` clause
_"every `presence` criterion appears in both a Gate 1 and a Gate 5 verdict"_ — **for a presence criterion with no
`claimId`, or whose shots have no picture**: it is checked at the clip only. Every presence criterion this entry gives a
picture appears in that picture's Gate 1 verdict, and every presence criterion appears in a Gate 5 verdict. D-043's type,
its partition and `mustNotShow` being always `presence` stand.

**Why.** The contract's criteria are per reel (D-096); a picture opens one shot. The claim id is the only structural
link from a criterion to a shot, and D-043 rejects any link an author writes (_"a freely declared `checkAt` field"_).
D-027's bare shots and a reel-wide `mustShow` can never be in a picture's verdict, so D-043's clause as written could
hold for no reel; the still check stays pure addition because Gate 5 runs everything. Every subject the shot shows is
required because D-042 reconciles a picture _"against its brief"_, and the brief is the shot. The plan names a subject
and gives it no count, so its name is the only place a count can come from.

**Rejected.** **Every presence criterion on every picture** — one shot cannot show the whole reel; most pictures fail.
**The planner assigning criteria to shots** — D-043's rejected routing. **Only the picture's own subject required** — a
shot's opening frame missing a subject the plan put in it is a frame of another shot. **A count field in the planning
call** — a change to `reel-plan`'s one call (D-035) for one veto. **One when the name states no number** — fails every
true picture of _"the barons"_; D-046 vetoes a miscount because it is _"a picture of the wrong thing"_, and that rule
would veto the right thing, D-043's doom loop bounded only by the repair.

**Caught by.** `reel-stills`' checks 27 (no `event` criterion reaches reconcile, and the count's rule is in the prompt in
its words — the rejected rule's prompt fails), 28 (which pictures get which criteria), 29 (each failure condition built
alone).

**Confirmed-by.** The owner, 2026-09-15, on which criteria a picture gets, while `reel-stills`' gates were written.

---

## S-041 | 2026-09-15 | Gate 1's text step records the words it reads and never fails a picture

**Chose.** The text step reads the picture's words through the sensor port and records them on the picture; its outcome
is always `accept`. Nothing is refused for words until a text policy exists.

**Supersedes:** **S-031**, on its `Caught by` clause _"a picture failing the text step still has both"_ — no picture
fails that step. What the clause protected — that no step after technical stops the gate — is checked instead on a
picture failing **reconcile**, which keeps its observation and reconciliation. S-031's _Chose_ stands.

**Why.** D-042 names a text step, and no decision says what fails it. I-9 lists `textPolicy` among the criteria written
at plan time; none was ever designed, and the contract carries none. **The owner chose it on 2026-09-15**, over failing
any picture with readable text.

**Rejected.** **Any readable text fails** — D-008 keeps on-screen words to the engine's own captions, but a picture of a
sign or a page would then always fail and spend a repair.

**Caught by.** `reel-stills`' checks 22 (the step, in order), 24 (words read, outcome accept), 29 (a reconcile failure
keeps both records).

**Confirmed-by.** The owner, 2026-09-15.

---

## S-042 | 2026-09-15 | A witness answer that is not a valid observation fails the run

**Chose.** The pipeline parses each `observe` answer under the `WitnessObservation` schema at the gate boundary. **One
that does not parse finishes the run `failed`**, with the parse error as its detail, like `reel-plan`'s refused planning
answer. **The witness step is recorded only when its answer parses**, so that picture's record has its technical and
text checks, **no Gate 1 verdict outcome** (S-046) and no observation id — the contract's ids are _"for a picture that
reached those steps"_, and it did not complete one; and D-041's _"every Gate 1 verdict with outcome: 'accept' carries a
non-empty evidence.observation"_ holds, because its verdict was never decided. Every answer that parses is recorded, and S-031 holds for its picture: an observation and a
reconciliation.

**Supersedes:** **D-041**, on its `Confirmed-by` clause _"a malformed observation fails the gate rather than reaching a
consumer"_ — it fails the run, and still reaches no consumer.

**Why.** S-031 says every picture past technical has an observation and a reconciliation; a malformed answer leaves
nothing to reconcile, so failing only the gate would break S-031 for that picture. **The owner chose it on 2026-09-15.**

**Rejected.** **The picture fails its witness step and skips reconcile** — an exception to S-031. **Recording a witness
check with outcome `fail` and no observation** — a picture that reached a step with no id, against the contract's
record rule.

**Caught by.** `reel-stills`' check 46.

**Confirmed-by.** The owner, 2026-09-15, on the run failing.

---

## S-043 | 2026-09-15 | A derived picture that fails gets a repair from any free reserve slot; no slot is held for Gate 1S

**Chose.** A derived picture that **fails Gate 1** takes **one informed repair call if a reserve slot is free**,
consuming its verdict; the repair goes through Gate 1. With no slot, or if the repair fails Gate 1, **its shot goes on
without a picture**, recorded as degraded, and the run does not fail. **Any free slot will do: none is held for a Gate
1S repair.** A derived picture that **fails Gate 1S** is repaired **as D-050 step 1 says** — if a slot is free — and its
repair goes through Gate 1, then Gate 1S; a repair that fails Gate 1 degrades its shot, and one that fails Gate 1S is
again a derived picture failing Gate 1S. **No shot takes more than two repairs** — D-014's _"retries ≤ 2 per shot"_ —
so a failure after a shot's second repair degrades it even with a slot free. **The reserve is 6 − the placement's
calls** — 2 for a placed canonical and 1 for each placed derived picture, a rank with no free shot left out (S-039) —
less a restarted attempt's earlier calls (S-048); every repair takes a slot; the canonical's repair runs first (D-047,
D-048).

**Supersedes:** **D-027**, on _"one for a canonical that fails best-of-2, one for a set-consistency repair"_ and its
`Confirmed-by` _"a 6th remains available to a consistency repair within the same reel"_ — the reserve is one pool, and a
derived picture's Gate 1 repair may take the slot a consistency repair would have used. **D-027**, on _"Two of the six
permitted image calls are left unspent at plan time and held as reserve"_, and **D-029** part 3 step 7, _"two held in
reserve (D-027)"_ — **for a placement with a rank left out** (S-039): its reserve is 6 − the placement's calls, so a
planned call never made becomes a slot. **D-050** step 1, _"Repair it, if a reserve slot is free"_ — **for a shot that
has had two repairs**, by D-014's _"retries ≤ 2 per shot"_: its next failure degrades it. D-027's Config A, its four
planned calls and its ceiling of six stand.

**Why.** D-030 says a derived keyframe is _"regenerated only on gate failure"_ and no more; D-050 covers only a Gate 1S
failure. **The owner chose on 2026-09-15** one repair from a free slot, and _"if the repair fails, the shot goes without
a picture"_; and **on 2026-09-16, that the repair may take any free slot**, over holding one for Gate 1S. A Gate 1
failure and a Gate 1S failure each cost one shot its picture, so neither earns a slot set aside from the other; every
derived picture meets Gate 1, while Gate 1S asks the judge only in doubt, so a held slot would often go unused while a
shot went without. D-027's allocation was written before any rule for a derived picture's Gate 1 failure existed.

**Rejected.** **No repair for a Gate 1 failure** — against D-030's _"regenerated"_ and the owner's answer. **The reel
fails** — D-025 step 3 read literally; its scope is the clip take cap, and a derived picture's blast radius is one shot
(D-050); the owner rejected it. **Holding the last slot for Gate 1S** — keeps D-027's allocation, and can leave a shot
without a picture while a slot sits empty; the owner rejected it. **At most one repair per derived shot** — narrows D-050
step 1 further than D-014 does. **No cap per shot, the reserve alone** — past D-014's two on a plan of three, whose
reserve is three; D-024's _"fixed by policy, unconditional, not retries"_ describes planned keyframe calls, not repairs.
**The reserve from the planned calls** — a rank with no free shot would count against it, and fail a restart that fits.

**Caught by.** `reel-stills`' checks 38 (a Gate 1 repair from any free slot, and the degraded shot), 39 (a Gate 1S repair,
a second one while a slot is free, and the cap of two), 40 (the reserve spent on the canonical and a Gate 1 repair, a
Gate 1S failure degraded, six calls), 49 (a placement with a rank left out).

**Confirmed-by.** The owner, 2026-09-15, on a Gate 1 failure of a derived picture; and 2026-09-16, on any free slot.
The two-repair cap, the reserve from the placement's calls, and the supersessions of D-050 step 1 and of D-027's two-slot
reserve with D-029 part 3 step 7 are this entry's reading, written after reviews 3 and 4.

---

## S-044 | 2026-09-15 | The keyframe score is a weighted sum of five terms, each above 0, and the canonical's two prompts differ in framing

**Chose.** The score of a canonical candidate that survived Gate 1 reads its verdict only (D-045): **reference terms**
from the canonical subject's reconciled entity — `faceVisible` (`yes`, `noFace` 1; `partial` ⅔; `no` ⅓), `unoccluded`
(1; occluded ½), `prominence` (foreground 1; midground ⅔; background ⅓) — and **technical terms** from the technical
measure, `sharpness` and `exposure`, clamped to [0.01, 1]. `total` is Σ weight × term, **capped at the largest finite
number**. **Weights are settings, defaulting to 2 for each reference term and 1 for each technical term**; a weight that
is missing or not a positive finite number counts as its default. **Each score records its terms, the weights used and
its total.** Higher wins; a tie goes to candidate `a`. **The canonical's entry declares its axis, `framing`**, and its two
prompts render the entry with the setting's two values, default `medium` and `wide`; **a worker whose two values are
equal refuses to start**.

**Why.** D-031 fixes the score's shape — normalised terms, weights in config, deterministic sensors and the witness's
closed answers both feeding it, reference quality above composition, every term's value recorded so a score replays —
and leaves the parameter list and the weights open until M-1. D-046 requires **every recorded score above 0**, which a
term of 0 or a weight of 0 would break; so every term has a floor, and a bad weight falls back to its default rather than
to 0, unlike the plan score's S-022, which has no such clause. A replay that does not know the weights cannot tell a
changed weight from a changed function. D-032 permits variation only where the manifest is silent; the planning call
authors no framing, and D-032 names framing _"the expected default"_. Two equal values are D-032's rejected seed-only
variation.

**Rejected.** **Terms that can be 0** — a surviving candidate scoring 0, against D-046. **An invalid weight counting 0**
— S-022's rule, which can zero a total. **Equal weights** — D-031's one fixed ordering is reference above composition.
**A model-chosen axis** — D-034.

**Caught by.** `reel-stills`' checks 7 (an entry without its axis fails), 19 (two prompts differing in framing and in
nothing else), 21 (equal framing values refused), 30 (selection and tie), 31 (finite and above 0 for every input,
including huge weights; no throw), 32 (replay with recorded weights, and a weight changing the winner).

---

## S-045 | 2026-09-15 | Gate 1S compares whole pictures, asks the judge only above its threshold, and accepts a pair with no shared subject

**Chose.** Gate 1S runs after every derived picture has been through Gate 1, on each derived picture that passed it,
against the chosen canonical, in rank order. The **subjects both shots show** come from the selected plan; **none** —
the pair is accepted and recorded as not compared. Otherwise the sensor port's **similarity of the two whole pictures**
gives **suspicion = 1 − similarity**; **at or below the threshold** (a setting, default 0.25, provisional until M-1) the
pair is accepted with no call; **above it, one `compare` call** decides. Its answer must name every shared subject with
`yes` or `no`, or it does not parse and the run fails; **any `no` fails the picture**, and the subjects answered `no` are
the verdict's reasons, which a repair's prompt carries (D-050). **One call per pair, given two pictures.** A repaired
picture goes through Gate 1, then Gate 1S.

**Supersedes:** **D-049**, on _"DINO/CLIP cosine between each derived frame and the canonical, over the shared subject"_
— a similarity of the whole pictures — and on _"One grid model call adjudicates. A contact sheet of the pool"_ — one
`compare` call per suspicious pair, given its two pictures. D-049's two stages, its threshold that only routes, its
place after Gate 1 and its rule that no similarity fails a picture alone stand.

**Why.** D-049 compares a derived frame with the canonical _"for identity of the subject they share"_, and says nothing
of a pair that shares none — there is then no identity to compare. Embeddings over the shared subject need the subject
located, which is a detector, parked by D-044 (C-12). A pool holds at most two derived pictures, so a sheet buys nothing
a pair does not, and composing one is pixel work behind another port method.

**Rejected.** **A detector to crop the shared subject** — a second vision dependency for one input to a threshold that
only routes. **The judge on every pair** — D-049's rejected _"model-only over every pair"_. **Failing a pair with no
shared subject** — a failure nothing about identity justifies. **A contact sheet** — above.

**Caught by.** `reel-stills`' checks 33 (when Gate 1S runs, when it calls, no fail without a call, and its reasons), 39
(a repair's prompt carrying them, and the repair through both gates), 47 (an answer leaving out a subject).

---

## S-046 | 2026-09-15 | How a stills run ends: picture ids carry the attempt, pictures are written as they go, and the stage never throws

**Chose.** **Picture ids are `a<attempt>-shot-<unit>-<label>`**, the attempt being the keyframes job's, so no attempt
reuses an id or a file path. **A picture's row is written with its image receipt**, in one transaction, **and updated
through a `StillsRecorder` port** each time one of its checks, its score or its Gate 1S verdict completes. Each row
carries **`seq`**, the run's image-call number, taken from the run's receipts in that transaction. **A Gate 1 verdict has
no outcome until it is decided** — `fail` when technical fails or reconcile completes with a step failed, `accept` only
when all four steps completed and accepted — so a picture whose steps were cut off has its completed steps, no outcome
and no `verdict` event. `makeStills` **returns** `completed`, `stopped-rule` (`rule: 'gate-1'`, `step: 'stills'`),
`stopped-budget` or `failed`, and never throws. The keyframes job then writes the chosen flags, the degradations and
their labels, the events, `run.finished` and the result in one transaction. **The record holds every picture made, every
attempt's, in `seq` order**, each with the checks it completed; a restarted attempt's earlier pictures are none chosen.
`observationId` is `obs-<pictureId>` and `reconciliationId` `rec-<pictureId>`, the ids of those rows. The worker calls
`placePictures` so the row it writes with each receipt carries the shot, subject and role. **Events, in the order the
checks ran:**

- **refused at the ceiling** — `run.accepted`, `stage.started` `plan`, one `verdict` per plan, `stage.finished` `plan`,
  `run.finished`;
- **admitted** — the same, up to `stage.finished` `plan`; then, from the keyframes job:
  - **completed** — `stage.started` `stills`; for each check as it completes, a `verdict` gate `'1'` for a picture's
    Gate 1 and a `verdict` gate `'1S'` for its Gate 1S; a `degraded` when a shot is degraded; then `stage.finished`
    `stills`, `run.finished`;
  - **stopped for a rule, stopped for budget, or failed** — `stage.started` `stills`, the verdicts and `degraded` events
    reached, `run.finished`;
  - **cancelled** — `run.finished`.

Only the finishing attempt's verdicts become events. The plan stage's other endings are `reel-plan`'s (S-025).

**Why.** The contract's record holds _"one entry per picture made"_ with _"each check it reached"_. A stage that threw
would lose the pictures made before a stop or a fault; rows written only at the end lose a killed attempt's; fixed ids
would let a second attempt overwrite the first's files and reuse its receipts' ids. A verdict read as `accept` from the
steps a cut-off picture completed would be an accepted verdict with no observation, the failure D-041 exists against,
and would record fewer than D-042's four step outcomes. S-025's reading — `stage.finished` means the stage produced its
output — holds for `stills` the same way. `step: 'stills'` names the stage, as `reel-plan`'s rule stop names `plan`.

**Rejected.** **Throwing, and letting the worker finish the run** — `reel-plan`'s shape, and the partial record goes with
the stack. **Writing pictures only when the stage ends** — a killed attempt's pictures would be in no record. **Fixed
picture ids, the second attempt overwriting the first** — files and receipts of pictures the record no longer holds.
**Grouping events by gate** — a Gate 1S repair's Gate 1 verdict comes after the first Gate 1S verdicts, and a grouped
order describes no run. **`stage.finished` for `stills` on every ending** — a caller would read a stopped run as having
pictures.

**Caught by.** `reel-stills`' checks 9 and 41 (each ending's events), 16 (ids carry the attempt), 37, 43 and 47 (the
pictures made before a stop or a fault are in the record with their checks, and no outcome where one was cut off), 46 (an
unparsed witness answer leaves no outcome), 48 (a killed attempt's pictures in the record).

---

## S-047 | 2026-09-15 | What `reel-stills` changes in verified features

**Chose.** Each change is made in the slice that forces it, and **none removes an assertion**:

- every criterion in `reel-contract`'s and `reel-plan`'s fixtures gains a `type`; `reel-contract.md` gains a note naming
  S-030 and S-034 (Slice 1);
- `reel-plan`'s check 10, _"a submit with until 'stills' or 'video' is refused 422 'unsupported'"_, asserts `video` only;
  `reel-plan-run.test.ts`'s refused submit sends `video`; `reel-plan.md` gains a note naming this entry, since its Gate 1
  and Outcome say pictures are "not built yet" (Slice 2);
- `reel-plan`'s check 29, _"GATE_ORDER equals ['0']"_, asserts `['0', '1', '1S']` (Slice 3);
- **code and test support that must follow the ports**, none of it an assertion: `apps/worker/src/recording-port.ts`
  records `observe` and `compare`; `DEFAULT_PLAN_SETTINGS.models` names `witness` and `judge`;
  `tests/engine/worker-process.ts` builds a port with all three calls (Slice 1); `tests/engine/harness.ts` and
  `worker-process.ts` pass an image and a sensor stand-in (Slice 3). The model stand-in keeps `observe` and `compare`
  calls in their own lists, so `reel-plan`'s check 37, which reads the `structured` calls' roles, is untouched.

`reel-plan`'s and `reel-contract`'s Evidence lines are not touched; both journeys are run again after Slice 5.

**Why.** D-108's `Confirmed-by` scopes the stills refusal: _"a submit with `until: 'stills'` to a `reel-plan` build is
refused"_. `reel-plan`'s Gate 2: _"`GATE_ORDER` is the literal `['0']`. `reel-stills` appends its gates."_ Both checks
were written to change here. A fixture criterion without a type is a request the amended contract refuses. A port type
that gains calls must be implemented by everything that implements it.

**Rejected.** **Leaving `reel-plan`'s tests as written** — the repository goes red on a correct build. **Dropping check
10's stills clause without a record** — CLAUDE.md rule 3. **Editing the verified files' gates** — they were approved as
written; a note says what changed and where it is decided.

**Caught by.** Nothing mechanical sees an assertion change. `reel-stills`' checks 5 and 8 assert the new values, and
`node scripts/journey.mjs reel-plan` and `reel-contract` must still pass after Slice 5.

---

## S-048 | 2026-09-16 | A keyframes job run again starts over and pays again; its earlier image calls come out of the reserve

**Chose.** A `reel.keyframes` job claimed again after its worker died (S-027) **makes every picture again from the
start, and pays for them again**. Its earlier attempts' pictures, receipts, files and cost stay (S-046). **At the start
of each attempt the worker counts the run's image calls so far** (`imageCallCount`), and the attempt's reserve is **6 −
those calls − the placement's calls** (S-043). **Below 0** — the attempt cannot make its pictures within six calls —
**the run finishes `failed` before any image call**, its detail naming the counts. **A canonical repair needs a free
slot**: when both candidates fail and the reserve is 0, which only a restarted attempt can reach, the run finishes
`failed` before the call. Otherwise a repair beyond the reserve degrades its shot, as in any attempt (S-043). The guard
counts the earlier attempts' cost (S-035, S-036).

**Supersedes:** **for a restarted attempt only**, which makes its canonical's two candidates and its derived pictures
again: **D-047**'s `Confirmed-by` _"No run produces four image calls against one canonical entry"_ and _"A fixture manifest
entry that cannot pass Gate 1 produces exactly three image receipts … with all three verdicts attached"_; **D-065**'s
_"terminates with three image calls"_; and **D-030**'s _"a derived keyframe issues exactly one call unless its gate
fails"_; and **D-047 step 1**, _"One informed repair call"_, for a restarted attempt whose reserve is 0 when both
canonical candidates fail — the run fails instead. The run's receipts then count every attempt's calls. All stand within
one attempt.

**Why.** Review 2 of `reel-stills` found a restarted attempt's reserve blind to the calls its guard counted, so a restart
could ask for a seventh call and fail a run the ladder said completes; and that making the canonical pair again breaks
D-047's and D-030's checks, which no entry superseded. **The owner chose on 2026-09-16** to start over and pay again, over
resuming from the pictures already made. D-002's lease runs a job from the start, as `reel-plan`'s does (S-027). Resuming
would mean re-checking a picture whose checks were cut off — a second witness look at one picture, against D-045 and
I-15 — or storing each half-finished step. Crashes are rare, a stand-in costs nothing, and the per-reel cap and the
ceiling still bound what a real restart spends. Failing a restart that cannot fit its plan, or its canonical repair, is
a fault — a crash — which the contract allows `failed` for, and it is decided before the call rather than after a
seventh. Failing and stopping for rule `gate-1` both leave out D-047 step 1's repair; failing is chosen because the
cause is the crash, not the picture.

**Rejected.** **Resume from what was made** — no double payment, and a second look or half-step storage; the owner
rejected it. **A reserve that ignores earlier calls, with a seventh-call refusal in the guard** — round 2's N2: a run
failing midway that its own ladder says completes. **Making the planned pictures and trimming repairs only** — a
restarted attempt after three calls would make a seventh.

**Caught by.** `reel-stills`' checks 48 (a restart's pictures, receipts and cost kept, and a budget stop across
attempts, and the record in `seq` order) and 49 (a restart's reserve reduced by earlier calls; a restart whose canonical
repair finds no slot failing with four calls; a restart that cannot fit its plan failing before any call; one that fits
because a rank is left out of the placement).

**Confirmed-by.** The owner, 2026-09-16, on starting over and paying again, and on earlier calls coming out of the
reserve. The placement's calls, failing a restart whose canonical repair finds no slot, and the supersessions of D-047,
D-065 and D-030 are this entry's reading, written after review 3.

---

## S-049 | 2026-09-16 | `LanguageModelPort` carrying three calls changes one assertion in verified `reel-plan`, and an `observe` or `compare` receipt keeps no `call` until Slice 3

**Chose.** Two things S-047 did not list, found while building `reel-stills`' Slice 1:

- **`reel-plan`'s check 3** — _"no type named `StructuredCall` is exported as a standalone port"_ — asserts
  `LanguageModelPort`'s members as an exact list, `['structured']`. It becomes **`['structured', 'observe', 'compare']`**,
  in Slice 1, the slice that adds them (S-037). **The list stays exact and nothing is removed**: a fourth call, a
  `StructuredCall` port, or a second declaration of the port still fails it.
- **`recordingPort` records all three calls** from Slice 1, and `model_receipt` has **no `call` or `picture_ids`
  column until `reel-stills`' Slice 3 migration**, so until then such a row carries the receipt's role, model,
  temperature, usage and `fake` and not those two fields. Nothing calls `observe` or `compare` before Slice 3.

**Supersedes:** **S-047**, by addition only — its list of what `reel-stills` changes in verified features gains
`reel-plan`'s check 3. Its rule that no assertion is removed is unchanged and holds here.

**Why.** S-047 listed `reel-plan`'s checks 10 and 29 and called the rest _"code and test support … none of it an
assertion"_. Check 3 is an assertion, and no slice could satisfy it: Gate 2, Gate 3 and S-037 all say the port carries
three calls, so the check pinning one call is the stale thing, not the port. Leaving it as written would make a correct
build red, which S-047 itself named as the reason such changes are listed. Recording the two picture calls without their
two fields is what the slice boundary leaves: the alternative is a migration in Slice 1, which Gate 4 puts in Slice 3.
The fields are lost for no caller, because nothing makes either call yet.

**Rejected.** **Leaving check 3 as `['structured']`** — the repository goes red on the build the gates describe.
**Relaxing it to "contains structured"** — that would stop catching a fourth call and a picture reaching the model by a
new route, which is what S-037 needs it for; CLAUDE.md rule 3. **Not recording `observe` and `compare` until Slice 3**
— an observation is tied to its receipt by key (S-037), so a call that leaves no row leaves a record nothing can join,
and the wrapper would be written twice. **A migration in Slice 1** — Gate 4 owns the slice boundaries.

**Caught by.** `reel-plan`'s check 3, which now asserts the three names and still fails on a fourth; `reel-stills`'
check 2, which compiles each misuse; and `reel-stills`' check 4 (Slice 3), _"every `model_receipt` names its call and
role"_, which fails until the migration and the column exist.

---

## S-050 | 2026-09-16 | The sensor's exposure measure is named `brightness`, because D-096 bans the word `exposure` anywhere in this repository

**Chose.** The technical measure D-031 and `reel-stills`' Gate 3 call **exposure** is declared as
**`PictureMeasure.brightness`**, and the keyframe score's fifth term as **`'brightness'`**. `reel-stills`' Gate 3
signature and the three prose lines naming the measure are amended to say so, each marked with this entry; **the
`Gates:` approval line is not touched**, and no other word of the gates changes.

**Supersedes:** **S-038**, on `measure` answering _"readable, width, height, sharpness, exposure"_; **S-044**, on the
technical terms being _"`sharpness` and `exposure`"_ — the term, not the meaning or the arithmetic, in both.

**Why.** **D-096's `Confirmed-by` is that no field named `source`, `sources`, `truthState`, `claimText` or
`exposure` exists ANYWHERE in the engine repository**, and `reel-plan`'s verified check 5 asserts it over live source,
by folded name. The banned `exposure` is KnowScroll's epistemic one; Gate 3's is photographic — but a check that reads
names cannot tell two meanings apart, and it is not weakened to let one through (CLAUDE.md rule 3). The steering
repository's own D-031 and D-096 collide on this word and nothing noticed. **The owner chose the rename on 2026-09-16**
over an exception to check 5. `brightness` is what the stand-in and any real sensor actually measure, and it folds to
neither banned name.

**Rejected.** **An allowlist in check 5** — one permitted `exposure` declaration pinned by file and type: a rule with a
hole, which is the _"reads as coverage"_ state S-014 exists against, and it would have to supersede D-096's
`Confirmed-by` on the word _"anywhere"_. **Leaving the gates and going red** — a correct build cannot be red.
**Sending Gate 3 back for a sixth review** — the owner settled it; a name is not a mechanism, and no check, figure or
step changes with it.

**Caught by.** `reel-plan`'s check 5, unchanged, which fails on any field folding to `exposure` anywhere in
`packages/` or `apps/`; `reel-stills`' checks 30, 31 and 32 (Slice 3), which score and replay the five terms by name.

**Confirmed-by.** The owner, 2026-09-16, choosing the rename over an exception to the check, and with it the edit to
Gate 3's signature.

---

## S-051 | 2026-09-16 | One `startStage` over both stages, not one function per stage

**Chose.** `packages/domain/src/runs.ts`' `startPlanStage(db, runId)` becomes
**`startStage(db, runId, stage)`**, `stage` being `'plan' | 'stills' | 'video'` — the contract's own stage type,
re-exported as `Stage`. The body is unchanged apart from the two places that said `'plan'`: the `json_extract`
that looks for an earlier `stage.started` now matches **that stage's**, and the event it appends carries it. Both
job runners call it: `reel.plan` with `'plan'`, `reel.keyframes` with `'stills'` (`apps/worker/src/keyframes-job.ts`).

**Why.** `reel-stills`' Gate 3 names `startStage` in `runs.ts` and does not name `startPlanStage`, and Gate 2 puts
the same two obligations on the stills stage as S-027 put on the plan stage: one immediate transaction, so a cancel
cannot land between the read and the start; and `stage.started` written once however many attempts a job takes. The
rule is identical; only the word `'plan'` differed. **A second copy of a rule is a second place for it to drift**, and
S-014's finding is that a rule which reads correctly and matches nothing is worse than no rule.

**Rejected.** **A `startStillsStage` beside `startPlanStage`** — two functions, one rule, and a fix to the cancel
transaction that has to be made twice. **Keeping `startPlanStage` as a wrapper** — a name for one argument. **A
`stage` column on `run`** — a migration, and a second record of what the event log already says (S-027 rejected it
once already).

**Not handled.** **No Slice 2 check catches the `stage` argument.** Breaking the `json_extract` filter so it matches
any stage — making the keyframes job treat the plan stage's `stage.started` as its own, and write none — left every
Slice 2 check green, because nothing in Slice 2 reads a stills event. It is caught by **check 41** (Slice 4, each
ending's events) and **check 48** (Slice 5, _"`stage.started` for stills appears once"_). Said rather than widened:
check 10's words are about job rows, and inventing an event assertion here would move Slice 4's work forward.

**Caught by.** `reel-plan`'s checks 45 and 46 for `'plan'` — a cancelled run has no `stage.started`, and a job run
again does not write a second one — both unchanged and still green through the rename. Breaks watched, each caught:
none.

---

## S-052 | 2026-09-16 | An admitted `stills` run's plan stage is ended by `admitStills`, which writes everything `finishRun` writes except the ending

**Chose.** `admitStills(db, { runId, jobId, plans, events })` in `packages/domain/src/runs.ts`, one immediate
transaction that writes **the plan rows, the events, the plan job done at cost 0, and the `reel.keyframes` row**, and
**returns that row's id**. It writes **no `run.finished` event and no result**, and does not touch `run.state`: an
admitted run stays `running` until the keyframes job answers for its pictures. The plan-row write `finishRun` used to
do inline is factored into one `writePlans`, called by both, so the two transactions cannot come to store a plan
differently.

**Why.** Gate 2's _Admission_ lists five things in **one** transaction, and D-083's whole point is that the second row
exists **only** if the plan survived — a plan row written by one transaction and a job row by another can be separated
by a crash, and D-083's test would then pass over a database that says nothing about why the row exists. The run must
not be finished, because `finishRun` sets `run.state` and writes `run.finished`: a caller polling would read an
admitted run as over, and the record route would answer 200 with no pictures.

**Rejected.** **`finishRun` with an optional "next job" and an optional result** — one function that sometimes ends a
run and sometimes does not, whose callers all pass the half they do not mean. **Enqueueing outside the transaction,
after `finishRun`-without-a-result** — the crash window above. **Marking the plan job done in the keyframes job** —
the plan job's own runner is the only thing that knows it succeeded, and a lease would reclaim it meanwhile.

**Caught by.** `reel-stills`' check 10: the admitted run has exactly two job rows, the plan job `done` at
`cost_cents` 0, the keyframes row carrying the run's `correlation_id` and the plan job's id as `parent_id`, the plan
stage's `stage.finished`, **and both plan rows with the selected one flagged**; and it is not refused. Breaks watched,
each caught by check 10: the plan rows left out of the transaction, the events left out, the plan job completed at a
cost, `parent_id` dropped, `correlation_id` given a chain of its own, and the run finished at the plan job as a
plan-only run is. Check 9 and check 11 watch the other side — a refusal or a stop that enqueues the row anyway.

---

## S-053 | 2026-09-16 | The pictures' figure is rounded up, the way the estimate it is a share of is

**Chose.** `admitPictures` returns `Math.ceil(plannedImageCalls * imageRateCents)`. Every rate in
`PlanSettings` is typed `number`, not an integer, and today's two are whole cents.

**Why.** D-083's estimate is `Math.ceil(image calls x image rate + seconds x video rate)` — `estimate.ts`, unchanged
since `reel-plan`. The pictures' figure is a **share of that same estimate** (S-030), so it must round the same way,
or a fractional rate would make the two figures disagree about the same plan. Up rather than down is the direction
that refuses at the boundary rather than admitting: the contract promises a run is stopped when spending _"would
pass"_ the limit, and a figure rounded down under-reports what the calls will cost.

**Rejected.** **No rounding** — `estimateCents` is an integer field in the contract and in the `plan` row; an
unrounded figure reaches a caller as a fraction of a cent. **Rounding down** — admits a run whose calls cost more
than its ceiling, by less than a cent per reel, in the one direction the contract forbids. **Requiring integer
rates** — a constraint on `PlanSettings` that `reel-plan` does not make and that a real invoice (Q9) may not keep.

**Caught by.** `reel-stills`' check 10's exact-ceiling pair: a ceiling of exactly `planned calls x rate` is admitted
and one cent less is refused, which fails on any figure that is not that arithmetic. Breaks watched, each caught by
checks 9 and 10: the reserve's two calls added to the figure, and the plan's whole `estimateCents` compared in its
place. **Not caught by anything today:** the rounding itself, since both rates are whole cents — a fractional rate
has no fixture until Q9 is read.

---

## S-054 | 2026-09-16 | The keyframe score's edges: a sensor value that is not a number is the floor, and a total that rounds to nothing is held at the smallest positive number

**Chose.** In `packages/pipeline/src/stills/score.ts`, three edges S-044 leaves unsaid:

- **A technical measure that is not a number — `NaN` included — counts as the floor, 0.01.** `+Infinity` clamps to
  1 and `-Infinity` to 0.01, as any number outside [0.01, 1] does.
- **An entity answer outside its closed list** counts as that term's lowest value: ⅓ for `faceVisible` and
  `prominence`, ½ for `unoccluded`. The lists are read through a `Map`, so an answer such as `constructor` finds
  nothing rather than a function.
- **The total is `max(min(Σ weight × term, largest finite number), smallest positive number)`.** A weight that is a
  positive finite number counts as itself, however small; five products of such weights can round to exactly 0,
  and the floor keeps the total above 0.

**Why.** S-044 says the terms are _"clamped to [0.01, 1]"_ and that _"every score is finite and above 0"_ (D-046).
`NaN` has no order, so `min(1, max(0.01, NaN))` is `NaN` — a clamp written the obvious way returns a total that
compares false with everything, and the tie rule then silently keeps candidate `a`. And S-044's weight rule keeps
`Number.MIN_VALUE` as a weight: `5e-324 × ⅓` is 0 in floating point, so the gate's promise was false for a weight
the settings type allows. A broken sensor counted as the floor, not the ceiling, never lets a picture it could not
measure outrank one it could.

**Rejected.** **`NaN` as 1** — a sensor that failed would score its picture as perfectly sharp. **A weight below
some small number counting as its default** — a second threshold nobody measured, deciding what "positive" means.
**Leaving the underflow** — a recorded score of 0, which D-046 says never exists. **A `try`/`catch` around the
arithmetic** — a file with a path that rejects, which check 31 reads for.

**Caught by.** `reel-stills`' check 31: every combination of entity answers, ten measures including `NaN`, both
infinities and `-0`, and eleven weightings including `Number.MIN_VALUE` and `Number.MAX_VALUE`, each finite and
above 0; bad weights replaced by their defaults exactly; S-044's term values exactly; no `throw` in the file.
Breaks watched, each caught by 31: an invalid weight counting 0; no cap; no floor; `NaN` passed through; a `throw`
added; the term floor 0; `partial` counting ½ (also 32); the total not the weighted sum (also 32).

---

## S-055 | 2026-09-16 | A picture's row: what it is, written once with its receipt; what its checks found, rewritten as they complete; `chosen`, written with the ending

**Chose.**

- **`recordGeneration`** (`packages/domain/src/ledger.ts`) writes the `generation_receipt`, adds the cost to the job
  row and inserts the picture's row in one immediate transaction, taking **`seq`** there as the run's receipt count
  plus one. It is handed the picture **without** a `seq` — `Omit<PictureRecord, 'seq'>`, narrower than Gate 3's
  `PictureRecord` — so no caller can pass one the transaction would ignore.
- **`upsertPicture`** (`pictures.ts`), which the worker's `StillsRecorder` calls, **rewrites only what the checks
  found** — the measure, the words, the Gate 1 verdict, the score and the Gate 1S verdict — and writes the
  observation and the reconciliation **once** each. The picture's identity — shot, subject, role, label, path,
  prompt, framing, references, attempt and `seq` — is never rewritten.
- **`chosen`** is written only by **`finishStills`** (`runs.ts`), in the transaction that ends the run, for the
  pictures of a completed stage; a failed run marks none. `finishStills` marks the keyframes job done **without
  touching its `cost_cents`**, which its image calls built up (S-036), so `completeJob`'s cost became optional.
- **`observation` and `reconciliation`** are keyed `(run_id, id)` — picture ids repeat across runs — with a foreign
  key to the picture; `picture` has a unique index on `(run_id, seq)`.
- **`model_receipt.call`** defaults to `'structured'` and **`picture_ids`** to `'[]'`: SQLite cannot add a
  `NOT NULL` column without a default, and every row written before them was a structured call about no picture
  (S-049). Every writer names both.

**Why.** Gate 2 has `seq` _"taken from the run's receipts in the transaction that writes the row"_, the row written
as each image call returns, and then updated _"through the recorder"_. A recorder that rewrote the whole row would
rewrite `seq` with the pipeline's own count, which agrees with the receipts on a first attempt and on no restart.
A `chosen` flag written as the stage picks would leave a killed attempt with a chosen picture, which check 48 says
it never has, and would make a failed run's record say something was approved.

**Rejected.** **The recorder upserting every column** — two writers of `seq`. **`chosen` through the recorder** —
above. **Nullable `call` and `picture_ids`** — a receipt naming no call, which check 4 could not tell from an old
row. **`observation` keyed by its id alone** — the second run's `obs-a1-shot-0-a` collides with the first's.

**Caught by.** `reel-stills`' checks 4 (every receipt names its call), 16 (the row's path is the file's and the
still's), 25 (one observation and one reconciliation per picture, by id), 34 (the stills are exactly the pictures
marked chosen) and 35 (a scripted cost is the receipt's, the job row's and its own run's only). Breaks watched:
the receipt row losing its call, or its picture ids (4, 25, 33); the row recording another path (16, 17, 19, 26,
33); the observation not written (25, 29, 32); a failed picture's reconciliation not kept (25, 29); the chosen flags
not written (34 and six others); a scripted cost not the receipt's, not added to the job row, a constant in the
result, or overwritten by the finish (35 each); the spend summed over every job (35, once it ran two costly runs).
**Not caught in Slice 3:** a recorder that rewrote `seq` — the pipeline's count equals the receipts' on every first
attempt; check 48 (Slice 5) runs a second one.

---

## S-056 | 2026-09-16 | A reconcile answer naming an entity the witness never gave, or an id it was not asked about, does not parse; a suspicion that is not a number goes to the judge

**Chose.**

- **`reconcileAnswer`** (`packages/pipeline/src/stills/prompts.ts`) refuses an answer whose `entity` is neither
  `null` nor an index of the observation's entities, and one naming a subject or criterion it was not given — as
  well as one leaving any out or naming one twice (Gate 2). A `shown` criterion with a `null` entity parses: a
  criterion such as a setting is shown by no single entity. A refused answer fails the run, as every refused answer
  does.
- **`compareAnswer`** is `{ subjects: [{ subject, same: 'yes' | 'no' }] }`, every shared subject by name exactly once.
- **Gate 1S** accepts a pair with no call only when its suspicion is **at or below** the threshold. A suspicion that
  is `NaN` is not, so the judge decides.

**Why.** Gate 2 has the reconciler answer _"the index of the entity that is it or none"_ and code apply the vetoes
to that entity. An index past the list names nothing: read as "not shown" it would fail a true picture for the
reconciler's slip and spend a repair; read as shown it would skip D-044's clipping veto, which reads the entity. Both
let a malformed answer pass as a judgement, and an id not asked about is the same slip. For Gate 1S, D-049 lets the
similarity route and never decide; a sensor that returned no number has routed nothing, and asking the one thing
that may fail a picture keeps I-16.

**Rejected.** **An out-of-range entity read as not shown** — a doom loop bounded by the repair, as S-040 rejected
for the count. **Ignoring ids not asked about** — a reconciler answering another picture's brief would pass. **A
`NaN` suspicion accepted with no call** — a broken sensor would wave every pair through.

**Caught by.** `reel-stills`' check 27: for every picture, an answer leaving out a subject, leaving out a criterion,
naming the event criterion, or naming an entity the witness did not give is refused by the call's own schema; and
check 33 at and above the threshold. Breaks watched: an answer allowed to leave a subject out, and one allowed an
entity nobody saw (27 each); the threshold setting ignored, and a suspicion at the threshold sent to the judge (33
each). **Not caught:** the `NaN` suspicion — the stand-in's similarity is a number unless a test scripts otherwise,
and none does.

---

## S-057 | 2026-09-16 | A shot's ladder at a step is finished before the next shot's begins

**Chose.** `makeStills` (`packages/pipeline/src/stills/index.ts`) takes each step of Gate 2's ladders one shot at a
time, in rank order, and finishes that shot's ladder before the next shot's turn:

- **step 2** — a derived picture failing Gate 1 takes its repair, and the repair goes through Gate 1, **before the next
  derived picture is made**;
- **step 3** — a derived picture failing Gate 1S takes its repair, the repair goes through Gate 1 and then Gate 1S, and
  a second repair follows while one is allowed, **before the next shot's pair is judged**.

Gate 1S still starts only once every derived picture has been through Gate 1, repairs included. So a run whose rank 2
is repaired calls the image port for shot 0 `a`, `b`, shot 1 `single`, shot 1 `repair`, then shot 2 `single`; and a
shot's repair verdicts sit next to the verdict they answer, in the record and in the events.

**Why.** Gate 2 says the stage runs "in this order", steps 1 to 3, "in rank order", and that Gate 1S "runs once every
derived picture has been through Gate 1" — and check 40's six calls hold under either reading, which is why it had to be
decided. The canonical's ladder already finishes before any derived picture, and Gate 1 runs on every picture "as soon
as it is made"; treating a derived shot the same way keeps one shape for every ladder, keeps a repair next to the verdict
it consumes, and gives the higher rank the first claim on a slot at every step — D-048's reason for ordering at all, a
higher rank being in more shots. Deferring repairs would hold pending verdicts across shots, state the stage has nowhere
else.

**Rejected.** **Every derived picture made first, then the Gate 1 repairs in rank order** — every planned call spent
before any reserve call, so a budget stop at a repair keeps more planned pictures; but it changes no slot's owner, since
the repairs still go in rank order, and it puts another shot's picture and verdict between a verdict and its repair.
**Every pair judged first, then the Gate 1S repairs** — the same trade at step 3, and a repair's own Gate 1S verdict
would come after later shots' verdicts: the grouped order S-046 rejected.

**Caught by.** `reel-stills`' check 41, whose event lists are typed by hand: a run with rank 2's Gate 1 repair before
rank 3's picture, and a run with a Gate 1S repair on each of two shots. Every ladder check's script is ordered as well —
the stand-in answers in call order, so another order misaligns the answers. Breaks watched: derived Gate 1 repairs
deferred until every derived picture is made (38, 40, 41); Gate 1S repairs deferred until every pair is judged (41
alone).

---

## S-058 | 2026-09-16 | A degraded shot's four labels are written with whatever ending the run reaches, in the order the ladders reached them

**Chose.**

- The stage records a degradation — shot, gate, reason — puts the reason on the shot's **last failing picture**, and
  adds a `degraded` event, at the moment the shot's ladder gives up. The keyframes job writes the `degradation` row,
  that picture's `degradation` and **every `generation_receipt` of the shot's pictures marked `degraded`** in the
  transaction that ends the run, **on every ending** — completed, stopped for a rule or for budget, or failed — with the
  events (S-046). Only `chosen` waits for a completed ending (S-055).
- The receipts marked are the shot's pictures **this attempt made**.
- **The reason** names the last failing picture and what failed — each failed Gate 1 step with its reasons, or the shared
  subjects the judge did not see as the same — and why nothing follows: no reserve slot is free, it was the shot's
  repair, or the shot has had two repairs (D-014). The gate is the one that failed last, so a Gate 1S repair failing
  Gate 1 is gate `'1'`.
- The result's `degradations` and the record's list them **in the order the ladders reached them**; the record reads the
  table by `rowid`, the order they were written.

**Why.** I-4: _"degradation is recorded or it does not happen"_; D-025's confirmation: _"if the degradation is not
queryable it was silent"_. S-046 already puts the `degraded` events reached into a stopped or failed run's events, and an
event with no row would tell a caller following events one thing and a query another. `chosen` waits because a stopped
run approved nothing (S-055); a degradation is a fact about a shot, decided when its ladder ended, whatever happens next.
The order reached is the events' order; a sort by shot id would be a third order, and wrong as text for `shot-10`.

**Rejected.** **Labels only on a completed ending**, like `chosen` — an event naming a degradation no row records.
**Marking only the last failing picture's receipt** — Gate 2 says every receipt of the shot's pictures. **Shot order** —
above. **Every attempt's pictures of the shot** — an earlier attempt's pictures belong to a ladder that degraded nothing
(S-048); Slice 5's restart is where this would show.

**Caught by.** `reel-stills`' checks 38 and 39 through one hand-written assertion, `assertDegraded`: the four labels
agree, and no other picture or receipt carries one — for a Gate 1 repair that fails, no slot free at Gate 1, the cap of
two at Gate 1S and no slot free at Gate 1S; and for two shots degraded in one run whose rank order is not shot order,
where the result and the record list them alike, in the order reached. Check 40, and check 41's stop for budget after a
degradation, whose labels are asserted with its events. Breaks watched: no `degradation` row, no reason on the last
failing picture, no receipt marked, no `degraded` event (38, 39, 40, 41 each); only the last picture's receipt marked
(38, 39, 41); the reason on the first picture rather than the failing repair (38, 41); the result listing none (38, 39,
40); **the labels written only on a completed ending (41 alone)**; the result's list sorted by shot id, and the record's
(38 each).

---

## S-059 | 2026-09-16 | The guard reads the chain's spend before every call and rounds up; the cap is read once per attempt; a stop at the cap asks in S-026's form

**Chose.**

- The guard is `apps/worker/src/guarded-image-port.ts`. **Before every image call** it reads `spentCents` over the chain
  again, adds the image rate, **rounds up** (S-053), and refuses with `limit: 'reel'` above the cap, else `'ceiling'`
  above the ceiling; the refusal's `estimateCents` is that figure, and exactly equal is made.
- **The cap is read once per attempt** of the keyframes job, from the worker's `budgetPath` — as the plan job reads it
  (D-100) — and handed to the guard with the request's `budgetCents`. **A cap that cannot be read finishes the run
  `failed`**, its reason the detail, before any image call.
- A stop's result carries the guard's `limit` and `estimateCents`, the ceiling and the cap as read, and `costCents` the
  chain's spend when the stage returned — the spend the guard read, since the refused call was not made.
- **A stop at the per-reel cap appends one entry** after the finishing transaction (S-026's order): a `## ` heading with
  the time, the run and _"stopped: the next picture would pass the per-reel cap"_; bullets for the request, the estimate,
  the spend and the pictures made, the cap, the ceiling, the plan — role, units, estimate, planned image calls — and the
  two rates; and one question. It shares the refusal entry's first write, which creates the file with its header.

**Why.** Gate 2 puts the comparison "before each call" and names the figures, not where they are read. A spend read once
at the start misses the call that just returned — the call a scripted cost is on. Reading the cap once per attempt is
"the cap the job read" and what the plan job does; reading it before every call would let an edit to `BUDGET.md` change
the rule halfway through a run. Rounding up follows S-053, and is as unfalsifiable while rates are whole cents. An
unreadable cap fails the run as in the plan job, whose read sits inside its fault handling; without that the worker
would bury the job and leave the run running for ever, which no answer in the contract describes.

**Rejected.** **The guard in the pipeline** — the spend is the database's (`pipeline-no-io`), and a stage is handed
ports, not figures. **A spend kept per attempt from the receipts the port writes** — a second ledger beside
`SUM(cost_cents)`, which S-036 rejected. **No rounding** — an `estimateCents` the contract's integer schema refuses once a
rate has a fraction. **A stop's entry under the refusal's heading** — S-035 gives it its own, and the owner would read a
stop as a refusal before any picture.

**Not handled.** **Nothing checks the unreadable cap's failure**: no check in 36–47 changes `BUDGET.md` between the two
jobs. A crash between the finish and the append loses the question (S-026's limit).

**Caught by.** `reel-stills`' checks 42 (a row of the chain other than the keyframes job counted and another run's row
not; exactly at the ceiling made and one cent over refused, and the same at the cap; the rate the setting's; the cap the
fixture `BUDGET.md`'s; the cap before the ceiling), 43 and 44 (the figures of a stop, a planned and a reserve call
refused), and 45 (one entry with the figures, a second stop appending, and the run finished when the entry cannot be
written). Breaks watched: the spend summed over receipts (42), or over every job (35, 42); the ceiling compared before
the cap, a call exactly at the ceiling refused, one exactly at the cap refused, the rate a constant (42 each); the cap
read from the pinned file, not the worker's (42, 45); the spend read once (41–45); no guard (41–45); a stop's
`costCents` the estimate, its ceiling the cap, an estimate without the rate, a refusal's estimate the spend (43, with
others); a stop at the ceiling writing a question (43 — **caught only once the check read the file before its engine was
stopped**: the first campaign found the assertion vacuous, since stopping an engine removes its folder); a stopped run's
pictures marked chosen (33, 37, 41, 43, 44, 46, 47); reserve calls unguarded, and a refused Gate 1S repair degrading its
shot and going on (44 each); no question, the question before the finish, the entry's spend the estimate, the file
emptied before the entry (45 each). **An unreadable cap burying the job instead of failing the run: not caught**, as
said above.

---

## S-060 | 2026-09-16 | A repair's prompt is its entry's prompt with the consumed verdicts appended; a derived repair consumes the one verdict that asked for it

**Chose.** `repairPrompt` (`packages/pipeline/src/stills/prompts.ts`) renders the picture's entry exactly as
`imagePrompt` does — the canonical's with candidate `a`'s framing — then a blank line, a line saying the try before
failed, and each consumed verdict's reasons as bullets, under `Try 1:` and `Try 2:` when there are two. A Gate 1 reason is
written as recorded; a Gate 1S reason, a shared subject's name, as _"<name> does not look like the same one as in the
reference picture"_. **The canonical's repair consumes both candidates' Gate 1 verdicts** (D-047). **A derived repair
consumes the one verdict that asked for it** — its picture's Gate 1 verdict or its Gate 1S verdict — so `repair-2`
carries its repair's verdict and not the first picture's. Every derived repair keeps the canonical as its only reference
(D-026, D-038); the canonical's repair has none.

**Why.** Gate 2: _"A repair renders its picture's entry again with the reasons of every verdict it consumes appended"_.
"Appended" makes the entry's prompt a prefix a check can compare, and keeps D-032's one-line difference between
candidates out of the repair. D-050 step 1 and S-043 each have a repair consuming _"its verdict"_; the verdict of a picture
already replaced is not what the repair corrects, and carrying it would tell the image model that a subject the latest
judge saw as the same was not.

**Rejected.** **Every earlier verdict of the shot in `repair-2`** — above. **The reasons woven into the entry's lines** —
the prompt would no longer be the entry's, and a repair's difference from its picture could not be read. **Picture ids
in the prompt** — nothing an image model can use.

**Caught by.** `reel-stills`' checks 36 (both candidates' reasons appended to candidate `a`'s prompt — the same reason
twice for a clipped pair, two different reasons for a pair failing at different steps), 38 (a derived repair's prompt is
its picture's with the verdict's reasons appended) and 39 (a Gate 1S repair carries the subject answered no and not the
one answered yes; `repair-2` carries its repair's subject, not the first picture's). Breaks watched: the canonical's
repair told only candidate `a`'s reasons, given `b`'s framing, or given a reference (36 each); a derived repair told
nothing, or made with no reference (38 each); a Gate 1S repair told every shared subject, or made with no reference (39
each).

---

## S-061 | 2026-09-16 | A restarted attempt that cannot fit its pictures, or whose canonical repair finds no slot, is failed by the stills stage, from the earlier calls the worker counts

**Chose.**

- **`imageCallCount`** (`packages/domain/src/ledger.ts`) is the number of the run's `generation_receipt` rows, every
  attempt's. The keyframes job reads it **once per attempt**, after the cancel read and the cap, just before the stage,
  and hands it to `makeStills` as `earlierImageCalls`.
- **`reserveOf(placements, earlierImageCalls)`** (`stills/ladder.ts`) is 6 − the earlier calls − the placement's calls.
- **`makeStills` decides both of S-048's failures**, before the call each is about:
  - **below 0** — before any image call: `failed`, detail _"attempt 2 cannot make its pictures within 6 image calls:
    the run made 3 before it and its placement makes 4, 7 in all (S-048)"_;
  - **no candidate survives and no slot is free** — before the repair's call: `failed`, detail _"attempt 2 cannot
    repair the canonical picture of shot-0: no reserve slot is free, the run having made 2 image calls before it and
    its placement making 4 of the 6 (S-048)."_, then each candidate's Gate 1 failure in the words of the rule stop's
    detail (_"a2-shot-0-a failed Gate 1 at reconcile: …"_), joined by `. `.
- A plan that places nothing makes no call, and completes before the reserve is looked at.

**Why.** Gate 2 puts the reserve in the ladders, and the ladders are the stage's; Gate 3 hands the stage
`earlierImageCalls` beside the plan it places, so it has every figure the decision needs, and `placePictures`,
`placementCalls` and the reserve already live there. The worker holds the count only because counting is a read of the
database, which the pipeline may not make (`pipeline-no-io`). Gate 2 asks for a detail _"naming the counts"_; the
canonical's also names what failed, because the rule stop it replaces names the three pictures' failures, and an
operator reading a failed run needs to know why a repair was due as much as why it could not be made.

**Rejected.** **The worker deciding "below 0" before calling the stage** — it calls `placePictures` already, for its
guard, but the reserve would be computed in two packages, and a stage handed a count it could not fit would still make
calls. **A seventh call refused by the guard** — S-048's rejected round-2 N2: a run failing midway that its own ladder
says completes. **A rule stop, `gate-1`, when the canonical repair has no slot** — S-048 chose `failed`: the cause is the
crash, not the picture. **A detail naming only the counts** — the reasons would be in the record alone.

**Caught by.** `reel-stills`' check 49 (`tests/reel-stills-restart-reserve.test.ts`): killed after 2 calls of a plan of
4, reserve 0 — a derived picture failing Gate 1 degraded, 6 calls; killed after 2, both candidates failing — `failed`
with the detail above, 4 calls, no repair; killed after 3, reserve −1 — `failed` with the detail above, no image, sensor
or model call in the second attempt; a plan of 4 whose rank 3 has no free shot, killed after 3 — fits, completes. Breaks
watched, each caught by 49 (and 50, which runs it): the count not taken (the Slice 4 stand-in); `reserveOf` without
the earlier calls; the reserve from the plan's planned calls (also 39); −1 let through; no below-0 failure; a reserve of
exactly 0 failed (also 48); either detail without its counts, the canonical's without its reasons; either failure
reported as a rule stop; the canonical's decided after its call. **The count taken over every run's receipts** is caught
by 13, 14, 29, 30 and 35, whose engines run several stills runs — not by 49, whose engines run one.

---

## S-062 | 2026-09-16 | The restart checks hold their first worker at the witness call of the picture after the image calls they need, and trust the receipts, not the count

**Chose.** `tests/engine/worker-process.ts` keeps `reel-plan`'s one mechanism: `holdAtCall`, counted over every model
call from 1, the planner's included. Checks 48 and 49 hold **the witness call of the picture after the N-th image
call** — the fixture plans make two planner calls, then each picture past technical one witness and one reconcile call,
so call 5 follows 2 image calls and call 7 follows 3 — say in the test which picture that is, and **assert the picture
ids of the run's `generation_receipt` rows before the kill** (`killedMidStills`, `tests/engine/restart.ts`). The child
is now handed the engine's `images`, `sensors` and `stillsSettings`, so a cost keyed by a whole picture id,
`a1-shot-0-b`, lands on the first attempt alone. The child's lease is 1 s; the helper waits up to 60 s for the hold and
for the finish, and kills the child in `finally`.

**Why.** A hold at a witness call leaves a picture cut off inside Gate 1 — technical and text recorded, no observation, no
outcome — which is what check 48 asserts of _"no verdict outcome where one was cut off"_. The count of calls depends on
how many planner calls a fixture makes and how many calls a picture takes, both of which can change without the test
changing; the receipts cannot disagree with what was made.

**Rejected.** **A hold on the image port** — every picture made before it would have completed Gate 1, so no picture
would be cut off, and it is a second hold mechanism beside the one `reel-plan`'s check 46 uses. **A hold at the
reconcile call** — a picture cut off after its observation, so a cut-off picture with no observation id would go
unasserted. **A cost scripted in the child's own options** — two scripts for one run, which could disagree.

**Caught by.** `killedMidStills` fails when the receipts are not the pictures the test names. The break of the child
ignoring the engine's image script is caught by both halves of check 48.

---

## S-063 | 2026-09-16 | Two things the restart checks assert beyond a restart's arithmetic: a recorder handed another `seq` keeps the row's, and a restart's degradation marks only its own attempt's receipts

**Chose.**

- Check 48's first case, once its run has completed, hands `upsertPicture` — the one write of the worker's recorder —
  the second attempt's first picture **numbered 1**, as a stage told of no earlier call would number it, and asserts
  every row's `seq` unchanged. The test imports the domain package's `src/index.ts` by relative path, as
  `tests/reel-plan-planning.test.ts` imports the splitter's.
- Check 49 has a fifth case: the restart of a plan whose rank 3 has no free shot, as in the fourth, with the second
  attempt's derived picture failing Gate 1. Its reserve is 0, so the shot is degraded, and **the first attempt's picture
  of that shot has its receipt unmarked and no degradation**.
- `assertDegraded` (`tests/engine/stills.ts`) takes the attempt whose receipts it expects marked, 1 unless given.

**Why.** S-055 left _"a recorder that rewrote `seq`"_ to check 48 because the stage's own count _"agrees with the
receipts on a first attempt and on no restart"_ — true while `earlierImageCalls` was 0. Slice 5 counts the earlier
calls, so the two counts agree on every restart too, and a recorder that rewrites `seq` writes the number already
there. The break campaign showed it: that break alone was caught by nothing; with the stage's count also forgetting the
earlier calls, check 48 caught it at once (`UNIQUE constraint failed: picture.run_id, picture.seq`). No run can tell the
two recorders apart; a picture handed with its own number can. S-058 rejected marking every attempt's receipts of a
degraded shot, and said _"Slice 5's restart is where this would show"_; no restart case had an earlier attempt's picture
of a shot the later attempt degraded, and the break marking them was caught by nothing.

**Rejected.** **Leaving the `seq` break uncaught, as equivalent** — S-055's rule is that `seq` has one writer, and a
second writer matters as soon as the counts can disagree, which a job whose lease outlasts a live worker makes possible
(`reel-plan`'s known limit, carried as `reel-stills`' limit 12). **A run with a live duplicate worker, to make the counts
disagree** — builds a known limit into a check. **Changing the fourth case's script instead of adding a fifth** — its
claim, that a restart fitting exactly completes with every still, would no longer be shown. **Adding `@cutroom/domain`
to the root's dependencies** — a lockfile change for one test.

**Caught by.** The breaks: `upsertPicture` also writing `seq` (48); `markDegraded` marking every attempt's receipts of
the shot (49's fifth case).

---

## S-064 | 2026-09-16 | A feature file begins with front matter, and says where it came from — judged against the steering repository's history, not against itself

**Chose.** `tests/feature-files.test.ts` holds every `docs/features/*.md` to three things:

- **Front matter as its first bytes**, with `status:` and `authority:` present and not empty. Their values are free.
- **A feature the steering repository ever held** at `steering/features/<slug>.md` — read from `steering-ref`'s history
  up to the pinned commit — **opens, before its title, with a note** beginning `> **Moved here on <date>** from`
  the KnowScroll repository's, naming `` `steering/features/<slug>.md` ``. Where the note says _"the last steering
  commit holding it is `<commit>`"_, that commit must hold that path.
- **A feature the steering repository never held** carries no _"Moved here on"_ note, and has a `> **Created <date>`
  note before its first `## ` heading.

A shallow `steering-ref`, whose history could make every feature look new, fails the test rather than passing it.

**Why.** S-015 promised _"a test that every `docs/features/*.md` carries front matter and a moved-from note"_, written
when every feature here had been moved. `video-edits` never was — it is the first feature planned here (S-017), and
S-033 makes that the rule for every feature from now on — so a moved-from note on it would be false, and the promise
as written cannot hold. What was moved is a fact of the steering repository's history, which this repository already
pins; a list kept in the test would agree with whatever the files say whenever both were edited together. D-079 holds
`docs/` front matter to presence, because its values are descriptive prose.

**Rejected.** **A list of moved slugs in the test** — a second record of the move, beside the history that is the
first. **Every move note naming a commit** — `reel-contract.md`'s names none, and it is verified; editing a verified
feature to suit a test is S-047's rejected _"editing the verified files"_. **A closed vocabulary for `status:` and
`authority:`** — D-079's rejected tightening, for `docs/`. **A note anywhere in the file** — each moved file opens with
it, and a note after the title reads as the feature's own prose. **A check in `docs-check.mjs`** — that script guards
the copies in `docs/design/`, and S-015 says a feature file is not a copy.

**Not handled.** A move note that names no commit is not checked against the history beyond its path. A well-formed
but wrong date passes. A slug the steering repository held only on a branch the pin does not reach looks created here.

**Caught by.** The test itself. Breaks watched, each caught: front matter removed; `authority:` empty; `status:`
missing; front matter not the first bytes; a moved feature's note gone; the note naming another feature's path; the
note naming a steering commit that does not hold the file; the note moved after the title; its date not a date; a
feature created here claiming a move; one saying nothing of where it came from; a new feature file with no note; a new
file claiming to be created here under a slug the steering repository held (`reel-engine`); and, in the test, the
steering history never consulted — caught by its own guard that some feature was moved. Not caught, as it cannot be: the
test's commit comparison disabled, when every named commit is right.

---

## S-065 | 2026-09-16 | Each session's opening prompt is kept in `PROMPTS/`, one numbered file per session, committed

**Chose.** A folder **`PROMPTS/`** at the repository root holds the prompt each session is started with, from session
20 on.

- **One file per prompt, `NNN-<feature>-<work>.md`**: `NNN` is the session's number in `JOURNAL.md`, three digits, so
  the folder sorts in session order. The first is `PROMPTS/020-reel-render-gates.md`.
- **Each file** has a title, a short label — the session it is for, the feature, the work, when it was written, and
  `Run` — and **the prompt verbatim in one fenced `text` block**.
- **`PROMPTS/README.md`** says this and lists every prompt with the same label.
- **A prompt is committed when it is written.** Once its session has run, only its `Run` line changes, in the file and
  in the index; a changed prompt is a new file.
- `CLAUDE.md` names the folder, so a session asked for the next prompt writes it there.

**Why.** The owner, 2026-09-16: _"create a new dir called PROMPTS, and put the prompt for the next session inside it,
label it nicely we will also keep track of prompts from now on"_. Until now a prompt lived as `nextPrompt.txt`,
untracked at the root: it made `journey.mjs` refuse a dirty tree at `reel-plan`'s journey and again at `reel-stills'`,
and was deleted, so what those sessions were asked survives only in their transcripts. Kept beside `JOURNAL.md`, a
prompt shows what a session was asked next to what it says it did. The session number is the key both files share,
and the only one that orders sessions: five of them ran on 2026-09-16. The fence keeps the prompt byte for byte:
Prettier checks every markdown file here and would rewrite a prompt's list indentation and emphasis, and it leaves a
fenced block alone.

**Rejected.** **Plain `.txt` files** — nothing to label them with, and an index could not link them. **Dated
filenames** — a date does not order sessions or name one. **`docs/prompts/`** — `docs/` holds copied design documents
and feature plans under D-079's front-matter rule, and a prompt is neither; the owner named the folder. **Leaving
prompts untracked or ignored** — the journey refuses the first, and the second is not kept. **Backfilling earlier
prompts** — the owner said _"from now on"_, and the earlier ones survive only in transcripts.

**Caught by.** Nothing mechanical: no test reads `PROMPTS/`. `node scripts/journey.mjs` refuses to run while a prompt
is left uncommitted.

**Confirmed-by.** The owner, 2026-09-16, on the folder, its name and keeping every prompt. The file names, the label,
the fence, the index and committing on writing are this entry's reading.

---

## S-066 | 2026-09-16 | `reel-render` is cut in two: a gated video with one take a shot, and D-024's takes and D-025's ladder in a new feature, `reel-takes`

**Chose.** `reel-render` builds everything from the approved stills to a finished video: the narration of every shot;
one clip a shot, made from its approved picture or from words alone; Gates 2 to 5 on every clip; the one assembly
pass; and Gate 7 on the assembled file. **A shot gets one take in each attempt of the clips job.** A take that fails
Gate 2, 3 or 5 stops the reel for that gate's rule, and a reel that fails Gate 7 stops for rule `gate-7`: nothing more
is bought, and no video is returned. **A new feature, `reel-takes`** (`docs/features/reel-takes.md`, created with its
gates unwritten), owns D-024's three takes and their informed retries, with D-033's rider that a retry consumes the
failed take's verdict; I-11's counter for provider transient errors; and D-025 at the take cap — `accept_with_label`,
holding the gated keyframe as a still, and failing the reel — with their labels. **D-058's edit repairs stay
`video-edits`'.** Sizes, as asked: `reel-render` about fifty-five checks, `reel-takes` about thirty.

**Supersedes**, for `reel-render`'s build, until `reel-takes` supersedes this entry in turn (quoted without the
source's emphasis):

- **D-024**, on _"A shot may consume 3 paid clip takes — one initial plus two retries — before it is marked `failed`"_
  and its `Confirmed-by` _"A test that a shot with three failed takes is marked `failed` and that no fourth video job is
  submitted for it"_ — a shot's first take in an attempt is its last, and its failure stops the reel;
- **D-025**, on rung 1, _"soft failure (style adherence, camera not exactly as asked) → `accept_with_label`, with the
  verdict recording why"_, and rung 2, _"picture right, motion broken (freeze, morph, artifact) → hold the gated
  keyframe as a `still` for the shot's duration, with a slow push"_ — every take failure has rung 3's outcome, the reel
  fails, reported as stopped for the gate's rule;
- **D-033**, on its `Confirmed-by` _"A test that take 2's prompt differs from take 1's whenever take 1 failed a gate"_ —
  no take 2 is made;
- **D-024**, on _"and provider transient errors (`maxAttempts` with backoff)"_ and its `Confirmed-by` _"A
  test that N consecutive provider transient errors leave the take counter unchanged"_, and **I-11**, on _"Transient
  failures retry on `maxAttempts` with backoff, on their own counter"_ — no call is retried in this build: a call that
  throws finishes the run `failed`, as a thrown call does in `reel-plan` and `reel-stills` (S-046), and counts as no
  take;
- **D-058**, on _"Their repair vocabulary is a closed enum of edit ops that spend no money: `reorder`, `retime`,
  `recaption`, `reselect-take` (choosing a different already-accepted take of the same shot). Applying any of them
  re-runs L5 and re-runs Gates 7 and 8."_ and its `Confirmed-by` _"The op vocabulary is a closed enum in the schema and
  an op outside it fails validation."_ — no edit op exists until `video-edits` builds them, so every Gate 7 failure
  reaches D-058's _"If no edit op fixes the failure, the reel fails and is labelled"_;
- **D-080**, on _"the clips, Gates 2 to 5, the take ladder, the narration audio, the assembly pass, and Gates 7 and 8"_,
  and **D-108**, on _"`reel-render` is unchanged: everything after the approved stills (D-080)"_ — the take ladder is
  `reel-takes`', the edits `video-edits`', and Gate 8 KnowScroll's (S-068).

D-024's rule that a take is counted in takes and never in retries, its keyframe counter — kept by the stills stage of a
`video` run as of any `stills` run — D-025 rung 3 and its labels, and D-014's _"retries
≤ 2 per shot"_ — zero is within it — stand.

**Why.** Written whole, `reel-render` was about ninety to a hundred checks in nine or ten slices, twice `reel-stills`,
which took five reviews at fifty. D-080 and D-108 each split a plan of that shape because it did not converge. The
contract's `until` has no value between `stills` and `video`, so a first half verified through the API must end with a
real video, and a gated video at one take is the smallest one that runs every gate the decisions require. Takes and
holds deepen it without changing what the finished video is. With stand-ins nothing is paid, so no real reel is lost
to the lower cap.

**Rejected.** **One feature** — the shape D-080 and D-108 split. **Two, with D-024's retries in the first** and only
D-025's label and still-hold waiting — a larger first half for a smaller second. **Split by stage, clips then
assembly** — the first half could answer no caller: `video` would stay refused until the second landed, so its journey
would verify runs ending on a placeholder. **Defining an `until` for clips** — exposes the engine's internal seam to
callers, which D-093's contract exists to hide.

**Caught by.** `reel-render`'s checks 26 (a failing take stops the reel, and nothing later is made) and 38 (a failing
Gate 7 stops it). **Owed by `reel-takes`:** its gates name checks 21 to 26 and 38 as premises it changes, in S-047's
form, since each asserts a stop that three takes turn into a retry.

**Confirmed-by.** The owner, 2026-09-16, choosing _"Two: video first, takes second"_, whose option listed what each
feature holds, one take a shot with a failing take stopping the reel, Gate 7's failure stopping it, and D-058's edits
staying `video-edits`'. **This entry's reading:** that one take is per attempt of the clips job, D-033's rider moving
with the retries, and the supersession quotes.

---

## S-067 | 2026-09-16 | L4 SELECT and Gate 6 are not built while every reel is a cut

**Chose.** No plan carries a join mode — the planning call's cinematic fields are `reel-stills`' deferred item 6 — so
**every reel is D-036's default, `cut`**, and every shot of a render manifest records `joinMode: 'cut'`. **L4 SELECT is
not built:** its handover frames and anchors serve a chain (D-036; O-7 _"matters less if O-1 lands on cuts"_), one take
a shot (S-066) leaves no accepted take to pick among, and a new version of a cut is `video-edits`' question 2. **Gate 6
does not run on a cut join:** identity of a shared subject across shots is checked on the stills by Gate 1S (D-049,
S-045), and D-036 records that distinct scenes lose nothing to a cut. `GATE_ORDER` holds no `'6'`. Both arrive with
chains, which need a join mode in the planning call (D-035) and a feature that builds them.

**The gate profile is config, as D-052 requires:** a setting, `RenderSettings.gateProfile`, defaulting to
`{ id: 'phase-1', gates: GATE_ORDER }`. **Exactly one profile is defined**, so a worker handed one whose gates are not
`GATE_ORDER` refuses to start — no lighter set exists (D-052) — and every render manifest records the profile that ran.

**Supersedes:** **D-052**, on _"every gate in it runs: Gate 1, Gate 1S, Gates 2–5 per take, Gate 6 per join, Gates 7–8
on the cut"_ — Gate 6 does not run on a cut join. **D-036**, on _"The manifest declares a join mode — `cut` or `chain` —
per reel, and per adjacent pair where only part of a reel must flow."_ and its `Confirmed-by` _"The manifest carries a
join mode and fails schema validation without one."_ — the planning call's plan declares none, and every plan is
D-036's default, `cut`; **the render manifest is where the join mode is declared**, on every shot, and its schema
refuses a shot without one. D-036's default, D-052's one profile as config, and its record of what ran, stand.

**Why.** `reel-render.md`'s need 4 asked whether L4 and Gate 6 are built or D-036's default makes them unnecessary. The
decisions settle L4 — every part of it is chain machinery or a choice among takes that do not exist — and do not settle
Gate 6, which D-052 names for every join.

**Rejected.** **Gate 6 on every cut join** — each shot's last frame against the next shot's first, as Gate 1S does:
about five more checks for a comparison D-036 says a cut does not need. **Building chains now** — a join mode in
`reel-plan`'s verified planning call, last-frame extraction, re-anchoring after three hops, L4 and Gate 6.

**Caught by.** `reel-render`'s checks 3 (`GATE_ORDER` as data, the default profile, and a worker refusing another), 5
(a shot with no join mode refused), 29 (every shot's join mode `cut`, and the profile recorded) and 39 (no verdict for
gate 6).

**Confirmed-by.** The owner, 2026-09-16, choosing _"Not run while every reel is a cut"_. The list of L4's parts, the
`GATE_ORDER` value, the gate profile setting and the supersession of D-036's _Chose_ clause and check are this entry's
reading.

---

## S-068 | 2026-09-16 | Gate 8 is KnowScroll's, not the engine's

**Chose.** **The engine runs no Gate 8.** Under D-096 it never receives a claim's content, a source or a truth state,
and contract version 1 carries no plugin (D-095), so an epistemic gate inside the engine would have nothing to judge.
The engine's gates end at 7: a completed video has passed Gates 1 to 5 and 7, and 1S wherever a derived picture was
made. **Whether and how KnowScroll checks a returned video is KnowScroll's side**, decided in the steering repository
(D-115); it is owed there, beside Q19.

**Supersedes**, for the engine: **D-052**, on _"Gates 7–8 on the cut"_ — Gate 7 alone runs on the cut — and on its
_Rejected_ _"Dropping Gate 8 (`ks:epistemic`) in Phase 1 — it is the only gate that checks the thing KnowScroll exists
to get right"_; **D-058**, on _"and Gate 8 (`ks:epistemic`) run on the assembled output file"_ and on its `Confirmed-by`
_"A test that no reel reaches the library with a `pending` or absent Gate 7 or Gate 8 verdict, each carrying `coverage`
(I-6)"_ — the engine's test holds for Gate 7; **D-080**, on _"and Gates 7 and 8"_ — `reel-render` takes Gate 7.

**Why.** D-096, written after D-052 and D-058, keeps everything Gate 8 would read in KnowScroll. I-14 lets the
`ks:epistemic` plugin reach a harness; version 1 of the verified contract builds no plugin route, and a stand-in gate
with nothing behind it is the guard D-103 retired D-085 for being.

**Rejected.** **A later contract version adds a hook** so KnowScroll's check runs before the engine answers `completed`
— no different for `reel-render`, and it names the engine as the place the check is owed. **A stand-in Gate 8 in the
engine** — a scripted pass with no data behind it, which reads as coverage.

**Caught by.** `reel-render`'s checks 3 (`GATE_ORDER`) and 39 (no verdict for gate 8); `reel-plan`'s check 5 keeps the
truth fields' names out of the engine.

**Confirmed-by.** The owner, 2026-09-16, choosing _"KnowScroll's, not the engine's"_. The supersession quotes are this
entry's reading.

---

## S-069 | 2026-09-16 | A video run: admitted on its plan's estimate, made by four jobs under one stage `video`, and nothing bought once its render begins

**Chose.**

- **Submit** accepts `until: 'video'`. `planVaryOn` other than `shotCount` is still refused `unsupported` (D-110).
- **Admission.** When planning selects a plan and `until` is `video`, the plan job compares **the selected plan's
  `estimateCents`** (D-083, unchanged) with `budgetCents`. **Above** → refused for budget, `limit: 'ceiling'`,
  `estimateCents` the plan's estimate — the contract's own words, _"the chosen plan's estimate"_ — with the ceiling and
  the cap; no question; one job row; `stage.finished` for `plan`. **At or below** → admitted exactly as a `stills` run is,
  by `admitStills` (S-052). The reserve is not counted (S-035), and narration is not in the estimate (S-070).
- **The chain** is `reel.plan` → `reel.keyframes` → `reel.clips` → `reel.assemble`, each row created, with the run as
  `correlation_id` and the job before it as `parent_id`, in the transaction that ends its parent's stage successfully
  (D-081, D-083):
  - **the keyframes job of a `video` run whose stills stage completes** writes, in one transaction, the chosen flags,
    the degradations' labels (S-058), its events and `stage.finished` for `stills`, itself done with its cost kept
    (S-055), and the `reel.clips` row. The run is not finished. **Any other stills ending** ends the run exactly as a
    `stills` run's (S-046) and creates no row;
  - **the clips job** settles the cancel flag and `stage.started` for `video` before every attempt (S-027, S-051);
    completed, it writes its events, itself done with its cost kept, and the `reel.assemble` row;
  - **the assemble job** settles the cancel flag the same way — writing no second `stage.started` — and **is handed no
    image, narration or video port**.
- **I-18 by structure.** `reel.assemble` is the chain's last job and holds no paid port, so nothing can be bought once
  its render row is written; a check compares every receipt's time with the first render row's.
- **One stage, `video`** — the contract's — spans both jobs: `stage.started` from the clips job's first attempt,
  `stage.finished` only when the assemble job completes (S-025's reading).
- **Events of an admitted `video` run**, after the plan stage's (S-025): from the keyframes job, S-046's for `stills`,
  and when the stills stage completes, `stage.finished` for `stills`; then from the clips job — cancelled: `run.finished`;
  else `stage.started` for `video`, then for each shot in plan order a `verdict` for gates `'2'`, `'3'`, `'4'` and `'5'`
  with its `shotId`, each once its gate completes; then — a take failing, a stop for budget or a failure: `run.finished`;
  an unclaimed `mustShow` no take shows: a `verdict` gate `'5'`, outcome `fail`, no `shotId`, then `run.finished`;
  completed: nothing more from this job. From the assemble job — cancelled: `run.finished`; else a `degraded` event per
  hold in shot order (S-073), a `verdict` gate `'7'` once decided, and `stage.finished` for `video` and `run.finished`
  when it accepts, or `run.finished` when it fails or the job fails. **Only the finishing attempt's verdicts become
  events.**
- **Endings.** Completed → `until: 'video'`, `estimateCents` the plan's, `costCents` the spend, `stills` the chosen
  pictures in shot order, `video` the render's absolute path, `degradations` the stills' then the holds'. A rule stop
  names step `video` and rule `gate-2`, `gate-3`, `gate-5` or `gate-7`. Each job reads the cap once per attempt (S-059).
- **`reel-render.md`'s need 5 (D-076, D-100).** The engine's admission and guard are generation-only: the spend is
  `SUM(cost_cents)` over the chain's job rows, and only image, narration and clip calls add to them. No port, table or
  setting for research spend exists in the engine.

**Why.** D-081 gives a stage its own row when it can fail on its own, take minutes or need to survive a restart: clips
are all three, and an assembly that fails must not buy the clips again. A last job with no paid port makes I-18 a
structure rather than a promise. S-030 compared a `stills` run's ceiling with what that run spends; a `video` run spends
the whole estimate, which is the figure the contract already names.

**Rejected.** **One `reel.render` job for clips and assembly** — a restart during assembly pays for every clip again, and
I-18 rests on the stage's code. **Admitting on the pictures' share** — a video run's ceiling would never be compared with
its clips. **Narration in the estimate** — changes `reel-plan`'s verified D-083 figure for a cost the token plan covers
(D-019). **Stage names `clips` and `assembly`** — the contract's stage is `plan`, `stills` or `video`.

**Caught by.** `reel-render`'s checks 7 to 11, 27, 39, 40 and 47.

---

## S-070 | 2026-09-16 | Narration is made shot by shot, just before each clip, by a stand-in voice writing real audio and word timings; the clip's duration is asked for from the measured narration

**Chose.**

- **`NarrationPort.speak({ runId, narrationId, text, voice })`.** `narrationId` is `a<attempt>-shot-<unit>-narration`;
  `text` the unit's sentences in order, joined by one space; `voice` a setting. It answers `made` — the audio file, the
  word timings typed `unknown`, and a receipt of model, characters, cost and `fake` — or `refused`, which only the
  worker's guard answers.
- **One call a shot, in plan order, immediately before that shot's clip.**
- **The stand-in** writes a real WAV — 16-bit PCM, mono, 24 kHz, a steady 660 Hz tone — at
  `<artifact root>/<runId>/<narrationId>.wav`, each word 300 ms of timing followed by a 200 ms gap, the file as long as
  its timings; scriptable per shot for the word and gap lengths, the timings it reports, a cost, and a throw.
- **Measured, then parsed.** The media port probes the file, and **the measured duration is the narration's** (I-17).
  The timings are parsed at the stage's boundary: every word of the text, split on white space, exactly once, in order,
  each ending after it starts, none overlapping the next, the last ending at or before the measured duration. An answer
  that does not parse finishes the run `failed`, as S-042's witness answer does.
- **The guard** (S-035, S-059): before the call, the chain's spend plus the text's characters × the narration rate,
  rounded up, against the cap, then the ceiling. **The rate is a setting defaulting to 0 cents**: T2A is covered by the
  owner's token plan (D-019), and D-057 says narration _"costs nothing"_. A test scripts a rate and a cost.
- **After the call**, in one transaction: its `speech_receipt` with the rate applied, its cost added to the job row,
  and the narration's row.
- **The clip's requested duration** is the measured narration rounded up to a whole second (S-023), **at least 5 and at
  most 15** (D-019). A narration longer than 15 seconds gets a 15-second clip whose last frame is held (S-073).

**Supersedes:** **D-057**, on _"the planner requests a clip `duration` at or above the shot's measured narration
duration, inside D-019's 5–15 s range"_, and on its `Confirmed-by` _"A test that every shot's requested clip `duration`
is at or above its narration unit's measured duration."_ — **the clips stage requests it**, after measuring the
narration, at or above that duration, **or 15 seconds when the narration is longer**, and the rest is held (S-073). The
planning call runs before any narration exists (`reel-plan`'s known limit 10).

**Why.** D-008 makes narration its own call with word timings; D-019 gives it no fallback, so without a stand-in that
returns both, a run needs a credential — `reel-engine` review 1's _"The fake provider still cannot run the feature"_.
Real audio is what lets the conform, the mix and the measure run on a file (`reel-render.md`'s need 2). Just before its
clip, because D-057 asks for the clip from the measured narration.

**Rejected.** **Narration in parallel with the clips**, as the flow diagram draws it — a clip's duration could not come
from it. **Every narration first, then every clip** — a stop at the first clip leaves the rest of the reel's narration
bought; either order passes the other checks, so it is decided here. **The clip's duration from the plan's
`durationSeconds`** — shorter than its narration whenever the plan guessed short. **A rate at the $100 per million
characters list price by default** — a charge the token plan does not make.

**Caught by.** `reel-render`'s checks 13, 14, 16, 42 and 44.

---

## S-071 | 2026-09-16 | A clip is made from its approved picture or from words, composed from its shot and Gate 1's observation, and refused at the boundary without the audio block or the 9:16

**Chose.**

- **Take ids** are `a<attempt>-shot-<unit>-take-1`.
- **Mode.** `image-to-video` from the shot's chosen picture (D-026), where the stills chose one; **`text-to-video` with
  `aspectRatio: '9:16'` for every other shot** — one that was never given a picture (D-027; D-029 part 3 step 6) and one
  whose picture was degraded (D-050 step 2). A degraded shot's take row and video receipt are marked `degraded`.
- **The request** carries the prompt, the duration (S-070), `resolution: '768P'` (D-007, D-014), a seed — the CRC-32 of
  the take id, made by the caller and recorded (D-018) — and the expansion mode, a setting defaulting to `balanced`, the
  only value the research read; which value rewrites least is O-20, the paid-path feature's (D-072). Its type has no
  `reference-to-video` mode and no end image (D-026, D-037).
- **The prompt**, composed by code after the stills are approved (D-033, D-069, D-008): the style contract's text; the
  shot's sentences; the names of the subjects it shows; each `mustShow` — presence or event — whose `claimId` a sentence
  of its unit carries, every `mustNotShow`, and every `mustShow` with no `claimId`, under a line saying the reel must
  show it in some shot; for an `image-to-video` shot, its picture's recorded observation — framing, setting, lighting,
  and each entity's label and position — read from Gate 1's verdict, never looked at again (D-033, I-15); and last, the
  negative audio block, `No dialogue, no speech, no music.` then `non_diegetic_music: N/A`. No camera, since none is
  planned; no `[Shot` marker (D-071).
- **The validator** (D-071, I-19) is a pure function in the pipeline, run by the worker's video port **before the guard
  and before the port it wraps**: it refuses — by throwing, so the run fails as a fault — a request whose prompt lacks
  the negative audio block, and a `text-to-video` request without `aspectRatio: '9:16'`. The clips stage is handed only
  that port.
- **The guard** (S-059's form): the chain's spend plus the requested seconds × the video rate, rounded up, against the
  cap, then the ceiling.
- **After each call**, in one transaction: its `video_receipt` — model, mode, resolution, duration, **the aspect ratio
  a `text-to-video` call asked for** (none for `image-to-video`, whose ratio follows its picture), seed, the provider's
  request id, prompt, expanded prompt, expansion mode, **the style contract's id and version** (D-069), rate applied,
  cost, `fake`, degraded — its cost added to the job row, and the take's row.
- **Only two files call a video port's `generate`**: the worker's `video-port.ts`, on the port it wraps after validating,
  and the clips stage's `clips/index.ts`, on the port it is handed; and the clips job hands `makeClips` only the port
  `video-port.ts` builds. A test reads the source for it.
- **The stand-in** writes a real MP4 through ffmpeg (S-075): a moving test pattern with **a band whose colour is keyed
  from the take id**, so a shot's frames can be told from the next shot's in an output, a dark band across its lower
  third, where captions go, and a steady 220 Hz tone, as long as requested; scriptable per take for a black or frozen
  stretch at a given time and length, or a whole black or frozen picture, another size, frame rate or sample rate, no
  audio stream, no video stream, unreadable bytes, a shorter duration, a cost, an expanded prompt, and a throw.

**Supersedes:**

- **D-071**, on _"a validator every outgoing provider call passes, which refuses a call whose prompt omits D-008's
  negative audio block, or a `text-to-video` call without an explicit `aspect_ratio: 9:16`"_, and **I-19**, on _"One
  validator that every outgoing call passes is the only version of this that survives code nobody has written yet"_ —
  **image, narration and model calls do not pass it.** D-008's block ends _"Every shot prompt"_; no image prompt carries
  it (`reel-stills`, verified), so read literally the validator refuses every image call; and neither rule names a
  narration call or a model call — `structured`, `observe`, `compare` or `judgeCut` — so passing them through would refuse
  nothing. Every video call passes it.
- **D-050**, on its `Confirmed-by` _"produces a shot with no image receipt"_ — a shot degraded by its ladder has the
  image receipts of its failed pictures, marked degraded (S-043, S-058). What the clause guarded holds: no clip is made
  from any of them, and the shot's clip is `text-to-video` with 9:16.

**Why.** D-033 composes the prompt late so it describes the frame that exists; D-071 puts the two silent rules where no
new call site can skip them; D-019's trap is a `text-to-video` call without the ratio. A seed made from the take id is
recorded like any seed and lets two runs of one script be compared. An unclaimed `mustShow` was placed on no shot by the
plan (S-040), so a clip is only asked for it if every prompt carries it.

**Rejected.** **The validator on every port, with no rule for two of them** — a check that cannot fail (S-014). **The
validator inside the clips stage only** — D-071's rejected template, _"bypassed by the next call site, silently"_. **A random seed** —
two stand-in runs of one script could not be compared. **Looking at the picture again to compose** — D-033's second
record of one frame. **The unclaimed `mustShow` in no prompt** — no clip would be asked for it, and the reel would stop
for it every time (S-072).

**Caught by.** `reel-render`'s checks 1, 6, 15, 17, 18 and 19.

---

## S-072 | 2026-09-16 | Gates 2 to 5 on a take: what fails one, which measures are real, the witness on a whole clip, and the criteria no shot holds

**Chose.** On each take as soon as it is made, in order (I-7, D-042's ladder, D-052):

- **Gate 2, technical.** The media port measures the file (I-17): ffprobe for its streams, codecs, duration, width,
  height, frame rate, frame count, sample rate and channels; and one ffmpeg pass of `blackdetect`, `freezedetect`,
  `silencedetect` and `ebur128`, **handed `blackSeconds` and `frozenSeconds` as the shortest stretch each reports** —
  ffmpeg's own defaults are two seconds, so a shorter threshold would otherwise never be reached. **It fails when** the
  file is not readable or has no video stream; when its width over its height differs from 9/16 by more than a
  tolerance, default 0.01 — D-019's 16:9 trap; when a black stretch of at least `blackSeconds`, default 0.5, is
  reported; or when a frozen stretch of at least `frozenSeconds`, default 1.0, is reported. `freezedetect` measures a
  freeze a few frames short, so the checks keep a margin either side of each threshold. Duration,
  frame rate, sample rate, channels, a missing audio stream, silence and loudness are recorded and never fail a take: a
  short clip is held (S-073), and the rest are conformed. The thresholds are settings, provisional until M-1. **A take
  failing Gate 2 has no later gate**: there is nothing to witness in a file that could not be measured as a clip
  (S-031's reason).
- **Gate 3, text and sound.** The media port reads the clip's words and classifies its sound as speech or music — from
  a script in this feature, as `reel-stills`' sensors read words (real OCR and audio classifiers are deferred). **Words
  are recorded and never fail** (S-041's reading). **Speech or music fails the take**: D-008 makes H3's sound ambience
  only, and every prompt forbids both.
- **Gate 4, the witness.** **One `observe` call, role `witness`, temperature 0, given the clip and nothing else** —
  one witness, whose input is the clip (D-051, D-053, I-8). Its answer is parsed as a clip's `WitnessObservation`,
  whose `actions` and `eventOrder` are required (D-041); an answer that does not parse finishes the run `failed`
  (S-042). Its coverage is `full`, with the limitation that how the model samples a supplied clip is undocumented
  (D-051, I-6). It accepts once parsed.
- **Gate 5, the brief.** **One `structured` call, role `reconciler`, temperature 0**, naming the take for its receipt,
  given the clip observation, the subjects the shot shows, **the take's criteria** — each `mustShow`, presence or event,
  whose claim a sentence of the unit carries, and every `mustNotShow` — and **every unclaimed `mustShow`, marked as the
  reel's**. It answers as S-040's reconciler does, naming every subject and criterion given once, with entities the
  witness gave (S-056). **Code fails the take** when a subject the shot shows is not shown, a shown subject's count does
  not match (S-040's rule), a claimed `mustShow` of either type is not shown, or a `mustNotShow` is shown. **A clipped
  entity does not fail a clip**: D-044's veto is the keyframe's, and a subject leaving a moving frame is motion.
- **An unclaimed `mustShow`** is recorded on every take and fails none; **once every shot's take is accepted, one shown
  by no take stops the reel for rule `gate-5`** at step `video`, naming it — D-025's rung 3, _"`mustShow` unmet"_, and
  D-043's _"Gate 5 still runs every criterion on the clip"_.
- **A take's outcome** is decided when Gate 2 fails or Gate 5 completes; `accept` only when all four completed and
  accepted. After Gate 3 fails, Gates 4 and 5 still run, so the record holds every reason. **A take that fails stops the
  run** for the rule of its lowest failing gate, the detail naming each failed gate's reasons (S-066).
- **Coverage** on every verdict (I-6): Gate 2 and Gate 3 `whole file`; Gate 4 as above; Gate 5 `observation`.
- **Receipts and rows.** `ModelReceipt` and `model_receipt` gain **`takeIds`**; the witness receipt and the reconciler
  receipt of a take name it, and its `take_observation` (`obs-<takeId>`) and `take_reconciliation` (`rec-<takeId>`) rows
  are tied to them by key (S-037's form). The model stand-in keeps `observe` calls on clips in a list of their own.
  `model_receipt.take_ids` arrives with `reel-render`'s first slice, defaulting to `'[]'` (S-055's form), so the port's
  new field is never recorded without a column.

**Supersedes:**

- **S-037**, on _"`observe` takes a picture and temperature 0, and nothing else"_ — it takes a picture **or a clip**,
  and temperature 0, and nothing else.
- **D-051**, on _"Sampled frames remain implemented and are the recorded fallback"_ and its `Confirmed-by` _"A clip
  exceeding the inline limit produces a verdict recording a frames strategy and a stated limitation, not a failed
  gate"_ — the inline limit and a provider refusing a format belong to a real adapter, so the frames path is the
  paid-path feature's; every Gate 4 verdict here records `full`.

**Why.** No decision says what fails a clip at Gate 2 or 3; I-7 lists what is measured and D-025 names freezes as broken
motion. The witness is one contract with two inputs (D-053), so `observe` takes both. D-043 promises every criterion a
Gate 5 verdict, and S-040 already found that a reel-wide `mustShow` fails nearly every frame it is required of.

**Rejected.** **Failing silence or a missing audio stream** — H3's sound is only ambience, and the conform supplies
silence. **Letterboxing a 16:9 clip** — the trap D-019 names. **Recording speech and music only** — they would sit under
the narration. **Every `mustShow` on every clip** — S-040's doom loop. **Ignoring an unclaimed `mustShow`** — D-043.

**Caught by.** `reel-render`'s checks 4 and 20 to 26.

---

## S-073 | 2026-09-16 | The one pass: the render manifest, spans and holds, conform notes, captions and the mix, and the output measured

**Chose.**

- **The render manifest** (D-059) is built by code from the run's rows when the clips job has completed, validated by
  its schema, and written with its hash on a render row **before the assembler is called**; with the files it names, it
  is the assembler's only input. It holds the run, a render id `a<attempt>-render`, the output profile, the gate profile
  that ran (S-067), the caption style, the duck level and a cost ledger — image, narration and video cents — and, **for
  every shot of the selected plan in plan order, none removed** (I-12, D-025): its shot id, `joinMode: 'cut'` (S-067),
  its take, the provider's request id, the expanded prompt and the clip's path; **its opening** — `keyframe` with the
  picture's id; `text-to-video`, not placed, for a shot the plan gave no picture, with no reason; or `text-to-video`,
  placed, for a shot whose picture was degraded, with its degradation reason — so the schema refuses a placed opening
  without a reason and an unplaced one with one; its narration id, audio path and word timings; the clip's measured
  facts; its span; its conform notes; its hold; and every verdict decided before assembly — 1 and 1S where its picture
  had them, 2 to 5 — with coverage. Captions are listed in reel time. No end card (D-101); no type or field is named
  `manifest` alone — the fields that hold one are `renderManifest`.
- **A span** is the measured narration in frames, rounded up, starting where the shot before ends. **A clip with at
  least that many frames is trimmed at the tail** — the ordinary case, no label (D-057, I-12). **One with fewer holds its
  last frame for the rest: a hold**, labelled in four places (I-4, S-058's form) — a `hold` row with its seconds and
  reason; **the take's row, whose degradation reason sits beside its verdicts**, as a degraded picture's does; the
  take's video receipt, marked degraded; and a `degraded` event — and carried on the shot's manifest entry, and listed
  after the stills' degradations in a completed result and in the record.
- **Captions** (D-008): one event per narrated word, from its start to its end, offset by its shot's start; burned by
  the `ass` filter from a subtitles file the assembler writes beside the output; the style is a setting with an id.
- **The mix** (D-008): each clip's sound resampled to the profile and fitted to its span — silence where it has none —
  lowered by the duck level, a setting defaulting to 18 dB, for the whole span, since the narration spans every shot;
  each narration resampled and fitted to its span; the two mixed.
- **The conform** (D-055) reads each clip's geometry, frame rate, sample rate and channels **only from its measured
  facts in the manifest** — a video request carries none of them: scaled to fit the profile keeping its aspect, padded,
  its frame rate converted, its sound resampled to the profile's rate and layout. **A conform note** is recorded for a
  pad, a frame-rate conversion and added silence; a scale alone or a resample alone records none.
- **One pass** (D-054): **one ffmpeg invocation** reads every clip and narration file and writes one MP4 — H.264, AAC,
  the profile's geometry, frame rate, sample rate and channels, `-movflags +faststart` — at
  `<artifact root>/<runId>/<renderId>.mp4`. **Shots are joined by the `concat` filter inside that one filtergraph**:
  one decode, one encode. No concat demuxer or protocol is used, and nothing is stream-copied.
- **The profile** (D-055) is a setting defaulting to 768 × 1366 at 24 frames a second, 48 kHz, two channels,
  provisional until M-7. Every test but one sets a small profile, so the suite stays quick.
- **The output is measured** (I-17) by the media port's probe: codecs, geometry, frame rate, sample rate, channels,
  decoded frame count, and whether `moov` comes before `mdat`. A difference from the profile or from the manifest's
  total frames, or `mdat` first, finishes the run `failed`, naming it: the assembler broke its own input.
- **The adapters refuse paths outside the root**: the assembler and the frame strip, like the stand-ins, refuse a run or
  render id whose path would leave the artifact root (D-086).
- **The render row** is the assembly's receipt: render id, attempt, the manifest and its hash, the output path, the
  profile, the invocations, the measure, when it started and finished, and Gate 7's verdict (S-074). **The reel's
  record is the render row with its manifest.**
- **Checked by measurement, not by reading the manifest back.** Each stand-in take's picture carries a band keyed from
  its take id, so **a shot boundary is the frame at which that band changes** in the output. A replay renders a stored
  manifest again **under another artifact root**, so it never overwrites the file it is compared with; and a manifest
  whose captions' text alone is changed renders with the same boundaries — D-054's caption test, which needs no edit
  op.

**Supersedes:**

- **D-057**, on _"A shot's span on the output timeline is `max(its narration duration, its picture duration)`"_ — **the
  span is the narration's measured duration**: D-057's own next clauses trim a longer picture to its narration and hold
  a shorter one to it, so no picture outlasts its span.
- **D-055**, on _"and in every receipt"_ and its `Confirmed-by` _"Every `generation_receipt` and every render manifest
  carries the profile"_ — the render manifest and the render row carry it; an image, narration or clip receipt records
  what its call asked for. The profile being identical for every reel, and its record in the render manifest, stand.
- **D-059**, on its `Confirmed-by` _"A test that a shot marked `still-hold` or `text-to-video` without a degradation
  reason fails validation"_ — a `text-to-video` shot carries a reason exactly when its picture was degraded; a shot the
  plan gave no picture (D-027) is `text-to-video` by design and carries none. `still-hold` is `reel-takes`' (S-066).
- **D-059**, on _"every gate verdict from Gates 1 through 8, each with its `coverage` (I-6)"_ and _"It is also what L6
  publishes as the reel's record"_ — the manifest holds every verdict decided before it is built, Gates 1, 1S and 2 to
  5; **Gate 7's verdict and the output's measure**, decided on the file the manifest made, are on the render row beside
  it, and the reel's record is the two together. Gate 8 is KnowScroll's (S-068).
- **D-056**, on _"served over HTTP Range from the API's `/media` route"_ and its `Confirmed-by` _"A test that `/media`
  answers a `Range` request with `206` and the correct byte window"_ — the engine returns the file's absolute path, as
  `reel-contract`'s Gate 3 chose (least confident 4), and serving it to a viewer is the player's, KnowScroll's (D-115).
  One progressive MP4 with `faststart` and no `.m3u8` stand.

**Why.** D-054's concern is seams between separately encoded segments; a filter joining decoded streams inside one
encode has none. A fixed duck over a span the narration fills is what a compressor would settle to, and it can be
measured. One caption a word makes every offset checkable against its timing. D-059's manifest must hold everything the
pass reads, so the measured facts travel in it.

**Rejected.** **Segments, the concat demuxer or stream copy** — D-054. **Spans from the plan's durations** — picture and
voice would drift apart. **A sidechain compressor** — an envelope with no gap to release into, and a level no check can
predict. **A caption a sentence** — its word timings would go unused and no offset could be checked. **Normalising
loudness** — no target is decided; it is measured only.

**Caught by.** `reel-render`'s checks 5, 29 to 37, 39 and 41.

---

## S-074 | 2026-09-16 | Gate 7 is one `judgeCut` call on a frame strip of the assembled file, answering five closed questions, and its failure ends the reel

**Chose.**

- Once the output is measured, **the media port extracts a frame strip**: for each shot, the frames at the start, the
  middle and the end of its span, as PNGs `<artifact root>/<runId>/<renderId>-frame-<n>.png` (D-051: Gate 7 keeps its
  frame strip).
- **One `judgeCut` call, role `judge`** (D-006's M3), temperature 0, given each shot in timeline order with its frames
  and its sentences, and **five closed questions** — a setting, provisional until M-1: the order of the shots, their
  pacing, what sits next to what, whether the burned captions follow the narration (D-058), and whether a shot repeats
  what another shows (D-064's fourth question). Its receipt names the frames' ids.
- **Its answer names every question once, `yes` or `no`**, or it does not parse and the run fails. **Any `no` fails Gate
  7** (I-16). The verdict records its coverage — `frames`, with their number (I-6) — the answer, and the questions
  answered `no` as its reasons.
- **A failure stops the run for rule `gate-7` at step `video`**: the file and its render row are kept, the result
  carries no video, and no question is written. No edit op exists to try first (S-066).
- `LanguageModelPort` carries **four** calls.

**Supersedes:** **S-037**, on _"`LanguageModelPort` has three calls"_ and its title's _"Pictures enter the model port
through `observe` and `compare` only"_ — `judgeCut` also carries pictures, the assembled file's frames, with the shots'
sentences and the questions. It is not the witness: I-8 protects `observe`, which is unchanged, and Gate 7 must see the
narration to judge the cut against it (D-058).

**Why.** D-058 puts Gate 7 on the assembled file because only there are the conform, the burned captions and the mix
visible. D-064 took Gate 7's questions for the plan score, and D-058 adds the captions' alignment. D-045's _"one witness
call per image"_ is about generated images; these frames are cut from a file already judged shot by shot.

**Rejected.** **A text-only call on the render manifest** — it could not see what D-058 runs Gate 7 on the file to see.
**`observe` or `compare`** — the blind witness and Gate 1S's fixed question. **The whole video instead of frames** —
D-051 keeps a strip for Gate 7. **Returning a failed cut with a label** — the contract's _"never receive a reel that
looks finished but is not"_.

**Caught by.** `reel-render`'s checks 38 and 46; `reel-plan`'s check 3, the port's calls.

---

## S-075 | 2026-09-16 | ffmpeg and ffprobe come from PATH, are checked when a worker starts, and are reached only through ports built in `packages/providers`

**Chose.**

- **They are found on PATH by name**: the adapters' settings `ffmpeg` and `ffprobe` default to `'ffmpeg'` and
  `'ffprobe'`. No path to them is written in the repository (D-086). Nothing here installs them; `CLAUDE.md`'s traps name
  them, as 8.1.1 on this machine.
- **The adapters live in `packages/providers/src/ffmpeg/`**: `ffmpegTools`, which runs the two and checks them;
  `ffmpegMedia`, the `MediaPort` — its probe, scan and frames real, its words and sound from a script; and
  `ffmpegAssembler`, the `AssemblerPort`. The stand-in video port writes its clips with the same tools. Each writes only
  under the artifact root and refuses an id that would leave it.
- **`ready()`** on the media port and on the assembler runs both tools' `-version`, reads `-encoders` and `-filters`,
  and rejects naming the first thing missing: a tool that cannot be run, `libx264`, `aac`, or a filter the scan, the
  pass or the strip uses. **`startWorker` awaits both before it opens its database, and refuses to start with that
  reason** — D-026's startup refusal, so no job is claimed. **What is remembered, once per process for a pair of tool
  names, is what the tools said** — each one's `-version`, `-encoders` and `-filters` output, or that it could not be run
  — so the many workers a test suite starts do not each spawn the tools again; **every `ready()` compares its own
  required encoders and filters against that**, so a port asking for a filter the tools lack is refused whatever passed
  before it.
- **The pipeline never touches them**: `pipeline-no-io` forbids `child_process` there. **A new rule,
  `processes-only-in-providers`**: nothing under `packages/` or `apps/` outside `packages/providers` imports
  `child_process`, so neither the worker, the API nor the domain can start a process. Eighteen rules become
  **nineteen**. Its `drift:prove` cases import the module under both its spellings, `child_process` and
  `node:child_process`, from `apps/worker`, `apps/api` and `packages/domain` — in `drift.mjs`' list of cases by file,
  where `pipeline-no-io`'s `node:fs` case already sits, since a built-in module has no package for the by-name cases to
  place. `CLAUDE.md`'s count follows.
- **The worker requires the video, narration and media ports and the assembler from `reel-render`'s third slice**,
  when their stand-ins and adapters exist, as `reel-stills` required its image and sensor ports from its third.

**Why.** D-054 and D-055 need ffmpeg, and it costs nothing, reads no secret and reaches no network. A port keeps every
stage pure (S-038). A missing tool found at start is found before any clip is bought. S-021 recorded a worker import as
uncaught until a rule existed; a spawn in the runner is the same shape.

**Rejected.** **An npm package bundling ffmpeg** — a native binary per platform in the lockfile. **A default absolute
path** — D-086. **Spawning ffmpeg from the worker** — a process started by the one place that knows stages and tables.
**Finding a missing tool at first use** — after the reel's clips are paid for.

**Caught by.** `reel-render`'s checks 2 (the rule), 12 (the refusal) and 50 (a child whose environment is PATH alone runs
them).

---

## S-076 | 2026-09-16 | A clips job run again starts over and pays again; an assemble job run again renders again and buys nothing

**Chose.**

- **A `reel.clips` job claimed again** after its lease runs out (S-027) runs from the start with the next attempt:
  every narration and take is made again under ids carrying that attempt, and paid for again — S-048, applied to clips.
  The earlier attempt's rows, receipts, files and cost stay, with the gates each take reached and no outcome where one
  was cut off; the guard counts its cost; `stage.started` for `video` is not written twice; only the finishing attempt's
  verdicts become events. One take a shot is per attempt (S-066).
- **A `reel.assemble` job claimed again** builds its manifest again from the same rows, under a render id carrying the
  next attempt, and writes a new render row and file. The earlier render row and file stay. No receipt of a paid call
  can be added (S-069).
- **A worker that dies between two jobs** leaves the next row queued, and the next worker claims it; the job before is
  not run again (D-081).

**Why.** S-048's reasons hold: resuming a take whose gates were cut off would mean a second look at one clip (I-15) or
storing half-finished steps. Rendering again costs nothing.

**Rejected.** **Resuming the accepted takes** — a take cut off inside its gates would be looked at twice. **Reusing an
earlier render's file** — its Gate 7 verdict may have been cut off.

**Caught by.** `reel-render`'s checks 48 and 49.

---

## S-077 | 2026-09-16 | What `reel-render` changes in verified features

**Chose.** Each change is made in the slice that forces it, and **none removes an assertion**:

- **`reel-plan`'s check 10 and `reel-stills`' check 8** assert that `until: 'video'` is refused; each asserts it is
  **accepted** with a `runId`. **Every assertion check 10 made of its refusal** — `422`, `unsupported`, the `requestId`
  echoed, a detail saying _"not built yet"_, no `runId`, and nothing stored — **is kept, made of the one request the
  engine still refuses as `unsupported`, `planVaryOn: 'order'`**, in the same test; `reel-render`'s check 7 makes them
  too. `reel-plan-run.test.ts` and `reel-plan-service.test.ts`, which send `video` to get a refusal, send `planVaryOn:
'order'` (Slice 2). `reel-plan.md` and `reel-stills.md` gain notes naming this entry.
- **`reel-plan`'s check 29 and `reel-stills`' check 5**: `GATE_ORDER` equals `['0', '1', '1S', '2', '3', '4', '5', '7']`
  (Slice 1).
- **`reel-plan`'s check 3**: `LanguageModelPort`'s calls are exactly `structured`, `observe`, `compare` and `judgeCut`
  (Slice 1, S-049's form).
- **`reel-contract`**: nothing in its package; its file gains a note, in the slice that completes a video (Slice 4),
  that the real engine now answers `until: 'video'` and that its record still lists pictures only.
- **Code and test support, none of it an assertion**: `model_receipt.take_ids`, `recordReceipt` writing it, and
  `ModelReceipt.takeIds` in the model stand-in; `recording-port.ts` recording `judgeCut`; and `worker-process.ts`'
  port carrying `judgeCut`, its held call counted across the four calls (Slice 1, as S-047 put the three-call port in the
  slice that grew it); `WorkerOptions` requiring `video`, `narration`, `media` and `assembler` (S-021, S-038, S-075),
  with `tests/engine/harness.ts` and `worker-process.ts` building them with a small test profile (Slice 3); `readRecord` listing
  a render's holds after the degradations (Slice 4); the keyframes job advancing a `video` run, the plan job admitting
  one, and the API accepting it (Slice 2); `CLAUDE.md`: nineteen rules (Slice 1), the only video and narration ports
  stand-ins and ffmpeg on PATH (Slice 3).
- **Found after the gates were approved, by Gate review 3's list of what it could not check**, and added here by
  addition only, as S-049 added to S-047: `tests/reel-stills-endings.test.ts` and `tests/reel-stills-placing.test.ts`
  each wrap the model port call by call in a `hold`, and gain `judgeCut` passed through (Slice 1, since `tests/` is
  type-checked); `tests/reel-stills-prompts.test.ts` calls `startWorker` itself for `reel-stills`' check 21, and hands
  it the four ports (Slice 3). **`startWorker` keeps its existing refusals first** — an image port without references,
  equal framing values, and now another gate profile — **and only then awaits `ready()`**, so check 21's refusals are
  reached before any tool is run. No assertion of either file changes.

`reel-plan`'s, `reel-stills`' and `reel-contract`'s Evidence lines are not touched; their journeys run again in
`reel-render`'s last slice.

**Why.** D-108's `Confirmed-by` refuses `video` to _"a `reel-plan` build"_, and S-047 narrowed the refusal the same way
for `stills`. A port that gains a call must be implemented by everything that implements it.

**Rejected.** **Leaving the refusals as written** — a correct build goes red. **Relaxing check 3 to "contains"** —
S-049's reason. **Editing the verified files' gates** — a note says what changed and where it is decided.

**Caught by.** `reel-render`'s checks 1, 3 and 7, and the three journeys.

---

## S-078 | 2026-09-16 | `reel-stills`' check 3 counts nineteen rules, exactly

**Chose.** `tests/reel-stills-rules.test.ts`' test _"3. drift, drift:prove and drift --audit pass"_ asserts that
`drift --prove` prints **`19 rules proven to fire`**, where it asserted `18`, in `reel-render`'s Slice 1 — the slice that
adds the nineteenth rule, `processes-only-in-providers` (S-075). **The count stays exact**, and nothing else in the test
changes. `reel-render`'s check 2 asserts the same line.

**Supersedes:** **S-077**, by addition only — its list of what `reel-render` changes in verified features gains
`reel-stills`' check 3. Its rule that no assertion is removed is unchanged and holds here.

**Why.** Found while building Slice 1, before any code: the assertion pins the number of rules `drift --prove` watches
fire, which S-075 raises by one, and S-077 did not list it — the miss S-049 found in S-047, again. Left as written, the
build the gates describe is red.

**Rejected.** **Asserting the printed count equals `.dependency-cruiser.cjs`' rules** — it stops pinning the number the
decisions name, and a rule added with its cases passes silently. **Stopping the slice until a gate review amends
S-077** — the owner settled it; no gate text, figure or step changes.

**Caught by.** `reel-stills`' check 3 and `reel-render`'s check 2, each failing when a rule loses every one of its prove
cases — session 21's break 2d: nineteen rules became eighteen, caught by both.

**Confirmed-by.** The owner, 2026-09-16, choosing _"18 → 19, exact"_.

---

## S-079 | 2026-09-16 | `NarrationRecord` is declared in `clip.ts`, beside `TakeRecord` and `ClipsRecorder`

**Chose.** `packages/contracts/src/clip.ts` declares **`NarrationRecord`**, beside `TakeRecord` and the `ClipsRecorder`
that takes both. `narration.ts` declares `WordTiming`, `NarrationRequest`, `NarrationReceipt`, `NarrationAnswer` and
`NarrationPort`, and imports nothing from `clip.ts`; `clip.ts` imports `WordTiming` from it. The type's fields and
`@cutroom/contracts`' exports are Gate 3's. **No gate text is edited.**

**Supersedes:** `reel-render`'s Gate 3, on its file list's _"`packages/contracts/src/narration.ts` — `WordTiming`,
`NarrationRequest`, `NarrationReceipt`, `NarrationAnswer`, `NarrationPort`, `NarrationRecord`"_ — the last of the six
lives in `clip.ts`.

**Why.** Gate 3 puts `MediaProbe` and `ClipsRecorder` in `clip.ts`, and `NarrationRecord`, whose `probe` is a
`MediaProbe`, in `narration.ts`, so the two files would import each other's types. `no-circular` fires on a cycle of
type-only imports, since `tsPreCompilationDeps` is on — built in the scratchpad against this repository's config before
any file was written, and it fired. A record beside the recorder that takes it, and beside the other record, is the
one move that breaks the cycle.

**Rejected.** **A new `media.ts`** holding `ClipRef`, `MediaProbe`, `ClipScan`, `ClipSound` and `MediaPort`, imported by
both — five types leave the file Gate 3 names instead of one. **An exception to `no-circular`** — a rule with a hole
(S-014). **Stopping the slice until a gate review amends Gate 3** — the owner settled it.

**Caught by.** `no-circular`, in `drift` and `tests/boundaries.test.ts`, on the real graph. `reel-render`'s check 1
compiles `NarrationRecord` and `ClipsRecorder` from the package's index.

**Confirmed-by.** The owner, 2026-09-16, choosing _"NarrationRecord into clip.ts"_.

---

## S-080 | 2026-09-16 | The validator holds every video request that is not `image-to-video` to 9:16

**Chose.** `validateVideoRequest` refuses a request **whose mode is not `image-to-video`** and whose `aspectRatio` is not
`'9:16'` — a `text-to-video` request without it, and one of a mode the type does not have. It refuses the negative
audio block unless the prompt holds **both of its lines, together**. When both rules fail, both reasons are given.

**Why.** The validator is for a request the type never saw — one built from a value typed `any` (Gate 2, _"What the
rules do not catch"_). D-036's finding records that a provider call with no image **is** text-to-video, at the
provider's default ratio: D-019's trap does not depend on what the request called its mode. A validator matching only
the word `text-to-video` lets a request of any other spelling through with no ratio.

**Rejected.** **Matching `mode === 'text-to-video'` alone** — D-071's words read literally, and silent on the request
the validator exists for. **Also refusing an `image-to-video` request with no image** — a third rule D-071 does not
name; the type refuses it, and the clips stage builds the request from a chosen picture (S-071).

**Caught by.** `reel-render`'s check 6: a request of an unknown mode with no ratio, and a prompt holding only one of the
block's two lines, are each refused with the wrapped port receiving no call — session 21's breaks 6d and 6c, each caught
by it.

---

## S-081 | 2026-09-17 | A stills stage that completes is written by one writer whether its run ends or advances; the clips job ends a run keeping its job's cost

**Chose.**

- **`packages/domain/src/runs.ts` writes a stills stage's ending once**, in a private `endStills` — the chosen flags
  (S-055), each degraded shot's four labels (S-058) and the stage's events — called inside their own immediate
  transactions by **`finishStills`**, which then ends the run, and by **`advanceStills`**, which then marks the
  keyframes job done without touching its cost and enqueues the `reel.clips` row. `apps/worker/src/keyframes-job.ts`
  builds one ending for a completed stage and hands it to `advanceStills` for a `video` run, or to `finishStills` with
  the result otherwise. The run's own ending — `run.finished`, its state and its result — is likewise one private
  `endRun`, called by `finishRun`, `finishStills` and `finishVideo`.
- **`finishVideo(db, { runId, jobId, result, events? })`** is built in `reel-render`'s Slice 2, with Gate 3's signature
  less `render`, which Slice 4 adds: the placeholder clips job and its cancel read need a finish that marks the job done
  **without overwriting its cost**, and Gate 3 names that function for it.

**Why.** Gate 2 and S-069 give `advanceStills` exactly what `finishStills` writes of the stage — _"the chosen flags, the
degradations' four labels (S-058), its events"_ — and a `video` run's stills stage is exactly `reel-stills`' (Gate 2,
_"What a request becomes"_). Two copies of the label-writing are two places for a shot to come to be labelled
differently, S-051's reason for one `startStage`. `finishRun` marks its job done at the result's `costCents`, which is
the whole chain's spend: from the clips job, D-081's `SUM(cost_cents)` would then count the keyframes job's image
calls twice.

**Rejected.** **A copy of the chosen flags and labels in `advanceStills`** — above. **`finishStills` with an optional
next row**, ending the run or not by its arguments — S-052 rejected the same shape for `finishRun`. **`finishRun` from the
clips job** — the doubled spend above. **`finishStills` from the clips job** — the body fits, and the name says the
stills stage ended a run that its video stage ended.

**Not handled.** **Nothing checks a clips-job ending's job cost.** Session 22's break 9o, `finishVideo` marking the job
done at the result's cost, was caught by nothing, and no check of `reel-render`'s fifty reads a job row's cost after a
clips-job ending: the stand-ins cost 0 by default, and each result's `costCents` is read before the finish. Said for
Slice 3, whose clips calls are the first a clips job pays for.

**Caught by.** `reel-render`'s check 9 holds a `video` run's chosen flags, degradation rows, picture labels and receipt
marks, from a completed stage with two chosen pictures and a degraded shot, equal to the same fixture asked for stills —
session 22's breaks 9l (`advanceStills` writing no chosen flags) and 9m (no labels) each caught by it alone. Check 10
holds every other ending equal, with no `reel.clips` row — break 10a caught by it.

---

## S-082 | 2026-09-17 | `reel-render`'s check 9 reads the keyframes job's writes with no clips job run after them, or by which job wrote what

**Chose.** `tests/reel-render-chain.test.ts`, two tests titled with check 9.

- **A plan that places pictures**: the model port the worker is handed is wrapped so the stills stage's first witness
  call waits; once it waits, the test calls `stopWorker()` and then lets the call go, so the worker finishes the
  keyframes job and claims nothing after it (`reel-stills`' check 41 stops a worker between two jobs the same way). The
  run is then read as it is: status `running`, its result route `409`, its events ending `stage.finished` for stills
  with no `run.finished`, and three job rows, the `reel.clips` row `queued` at attempt 0 with its parent and
  `correlation_id`. The same fixture, asked for stills on an engine of its own, is the standard the events up to
  `stage.finished` for stills and the labels are held to (S-081).
- **A plan that places no picture** makes no call in its stills stage, so nothing can hold the worker there. The test
  waits for `stage.started` for video, stops the worker, and asserts that **the events before that one** are exactly the
  plan stage's, `stage.started` and `stage.finished` for stills: the worker runs one job at a time, the clips job is
  claimed only after the keyframes job's transaction commits, and its first write is that event — so every event before
  it is the plan and keyframes jobs'. Nothing the clips job writes after it is asserted.

**Why.** Once the keyframes job writes the `reel.clips` row, the placeholder clips job is claimed in the same loop and
finishes the run failed: a run read after that is finished whichever job finished it, and a run read while it happens
still to be running is a race with that claim.

**Rejected.** **Reading the finished run and trusting which ending it has** — _"clips are not built"_ would be the
evidence, and Gate 4 says no check asserts it. **A worker option to claim only some job kinds** — code in the worker that
exists for a test. **Waiting for the keyframes job's row to be `done` and reading at once** — the clips job may already
have run.

**Not handled.** The second test depends on the clips job writing `stage.started` for video first. Session 22's breaks
9j (the clips job unclaimed) and 9k (its `startStage` given `stills`) each make it time out — caught, but for a promise
check 11 owns (Slice 3).

**Caught by.** Session 22's breaks: 9d (`advanceStills` appending `run.finished`) and 9e (a `video` run's completed
stage finished as a stills run's) — both tests; 9f (the run's state set finished with no event) — the first test alone;
9h (a plan placing no picture not advancing) — the second alone.

---

## S-083 | 2026-09-17 | The clips job composes the video port it hands the stage — the validator outermost — from two builders in `video-port.ts`

**Chose.** `apps/worker/src/video-port.ts` exports **`validatingVideoPort(video)`**, unchanged from `reel-render`'s Slice
1, and **`guardedVideoPort(video, db, job)`**, which writes each call's `video_receipt`, its cost on the job row and the
take's row as the call returns (S-036's form; its comparison with the cap and the ceiling is Slice 5's). **`clips-job.ts`
hands `makeClips` `validatingVideoPort(guardedVideoPort(context.video, db, …))`**, so a request is validated before the
guard and before the port the worker was given (Gate 2, _"Clips"_). `reel-render`'s check 17 reads its clause _"clips-job.ts
hands makeClips only the port video-port.ts builds"_ as: the `video` property of the one `makeClips` call is a call of
`validatingVideoPort`, imported from `./video-port.ts`, whose argument is a call of a builder imported from the same file.

**Why.** Check 6 tests `validatingVideoPort` itself, and every request the clips stage builds passes the validator, so
no engine run can see the validator missing from the port the stage is handed. Only the composition's place in the
source can: kept in `clips-job.ts`, it is one expression a check can read.

**Rejected.** **Growing `validatingVideoPort`'s signature with the guard's database and job** — the change S-077 and
session 23's prompt anticipated; check 6 would need a database, a run and a job row to call the port it tests, for no
assertion. **One `videoPort(video, db, job)` builder in `video-port.ts` composing both** — a builder that dropped the
validator would be caught by nothing, for the reason above.

**Caught by.** `reel-render`'s check 17: session 23's break 17m, `clips-job.ts` handing the guarded port with no
validator around it, caught by 17 alone; break 17l, a third file calling a video port's `generate`, caught by 17 alone.
Check 6 catches the validator itself.

---

## S-084 | 2026-09-18 | A caption style is in the output's own pixels: the subtitles file's geometry is the profile's

**Chose.** The subtitles file the assembler writes (S-073) declares **the render manifest's profile as its geometry** —
`PlayResX` and `PlayResY` are the profile's width and height — so a caption style's `fontSize` and `marginV` are pixels
of the output, and everything that places a caption is in the manifest. **A profile of another size is handed a caption
style of its own**: the default style, 48-pixel words 200 above the foot, is sized for the default 768 × 1366, and the
small profile every test but one renders at (`TEST_RENDER_SETTINGS`, 108 × 192) carries `word-captions-test`, 12-pixel
words 20 above the foot — test support, no assertion.

**Why.** D-059 and S-073: the manifest, with the files it names, is the assembler's only input, and _"D-059's manifest
must hold everything the pass reads"_. A reference geometry the style is sized against would be a number the pass
reads that no manifest holds. The style's type is Gate 3's — an id, a font, a size, a margin — and has no field for one.

**Rejected.** **A fixed reference geometry in the assembler** — 768 × 1366, say — with every style scaled from it to the
profile: one style would serve every profile, but the constant is an input outside the manifest, a replay under another
build could burn another size from the same stored manifest, and a profile of another shape would stretch the margin
and not the font. **A reference geometry added to the caption style** — Gate 3's signature, which this slice does not
edit.

**Caught by.** `reel-render`'s check 33, which measures the caption band of the output at the small profile: with the
subtitles file's geometry anything but the profile's, 12-pixel words are burned at another size or outside the band, and
a frame inside a word is no brighter than the gap before it. Session 25's break 33e, the geometry a fixed 768 × 1366,
caught by 33 and by 36's caption-text clause.

---

## S-085 | 2026-09-18 | The render row's hash is SHA-256 over the text the row stores, computed by the worker

**Chose.** `startRender` stores **`canonicalJson(renderManifest)`** — the domain's one serialiser, keys sorted at every
depth — as the row's `render_manifest`, and **the worker hands it the SHA-256, in hex, of exactly that text**
(`assemble-job.ts`, `node:crypto`). So the hash can be computed again from the row alone, by anyone, and a replay reads
the stored text and nothing else.

**Why.** Gate 3 hands `startRender` the manifest and its hash, so the hash is made before the domain is called; the
pipeline imports no Node module, so it cannot be made there without a hand-written digest; and a hash over any other
serialising of the same manifest — `JSON.stringify`, whose key order is the builder's — could not be checked against
what the row holds.

**Rejected.** **A SHA-256 written by hand in the pipeline**, as the seed's CRC-32 was (S-071) — forty lines nothing
else needs, where a CRC is four. **Hashing inside `startRender`** — Gate 3's signature hands the hash in, and the
function that writes a receipt should not also be the only witness to what it wrote. **Hashing `JSON.stringify` of
the manifest** — above.

**Caught by.** `reel-render`'s check 29 computes SHA-256 over the row's stored text and holds the row's hash to it, and
check 36 does so again after a replay. Session 25's breaks 29m, the hash of another serialising, and 29n, another
text stored, each caught by 29 and 36.

---

## S-086 | 2026-09-18 | Gate 7 is shown a shot's sentences as the render manifest holds them: its narration's words, joined

**Chose.** `cutReel` is handed the render manifest and nothing else about the run (Gate 3), and the manifest holds a
shot's narration as its word timings. **The `sentences` a `judgeCut` call carries for a shot are one string: the shot's
words in order, joined by one space** — which is the narration's text, since that text is its unit's sentences joined by
one space and its timings are every word of it, in order (S-070).

**Why.** S-074 gives the judge _"each shot in timeline order with its frames and its sentences"_ so that it can hold
the burned captions against the narration; the words joined are those sentences, to the letter. Gate 7 then judges a
render from the one document the render was made from, so a stored manifest is enough to judge its file again (S-076).

**Rejected.** **Handing `cutReel` the plan and the request** to read each unit's sentences one by one — a second input
to the cut, against Gate 3's signature, for the same words in more strings. **A `sentences` field on the manifest's
shot** — Gate 3's `RenderShot`, which this slice does not edit. **Splitting the text at full stops** — a guess, wrong for
an abbreviation.

**Not handled.** A caller's sentence holding two spaces together reaches the judge with one, as it reaches the
narration's timings (S-070 splits on white space).

**Caught by.** `reel-render`'s check 38 holds each shot's `sentences`, joined by one space, to its unit's sentences typed
by hand and joined the same way. Session 25's breaks 38f, no sentences, and 38g, the words joined by two spaces, each
caught by 38 alone.

---

## S-087 | 2026-09-19 | The clips stage's guards refuse as the image guard does, and a stop at the cap asks naming the call the guard refused

**Chose.**

- `apps/worker/src/narration-port.ts` and `video-port.ts` compare, **before every call**, the chain's spend read again
  (`spentCents`) plus the call's figure — the narration's characters (S-088) at `narrationRateCentsPerCharacter`, or the
  clip's requested seconds at `videoRateCentsPerSecond` — **rounded up over the total**, `Math.ceil(spent + figure)`,
  the image guard's form (S-053, S-059), with the cap and then the ceiling. Above either, the answer is `refused` with
  that limit and figure; nothing is called and nothing is written. Exactly equal is made. The validator stays outermost
  (S-083).
- **The clips job reads the cap once per attempt** from its `budgetPath`, after `startStage` and before any call, as
  the keyframes job does; a file that cannot be read finishes the run `failed`, its reason the detail. Both guards are
  handed one `ClipsLimits` (`video-port.ts`): the cap, the request's `budgetCents`, and a list.
- **A guard that refuses puts the request it refused on that list.** When the stage answers `stopped-budget`, the clips
  job ends the run stopped for budget — the stage's limit and `estimateCents`, the ceiling and the cap as read,
  `costCents` the spend, the finishing attempt's events, then `run.finished` — and, for `limit: 'reel'` only, appends
  one entry after the finish (S-026's order), `appendClipsStopQuestion` in `questions.ts`: a heading
  `## <time> — run <id> stopped: the next clip, <takeId>, would pass the per-reel cap` (or _the next narration,
  <narrationId>,_), then bullets for the request, the refused call with its seconds or characters at its rate, the
  estimate, the spend and what this attempt made, the cap, the ceiling, the plan and the three rates, and one question.

**Why.** Gate 3's `ClipsOutcome` carries only the limit and the figure on a budget stop, typed from `VideoAnswer`'s
`refused`, while Gate 2 and check 45 want the entry to name the clip or the narration. The guard is the one place that
holds the refused request, and it is already built per attempt knowing the cap and the ceiling (Gate 3, the paragraph
under `WorkerOptions`): handing it one list more keeps every approved signature and declares no budget type (D-094) —
the list holds requests. One rounding over the three guards: while every spend is whole cents, rounding the total and
rounding the figure agree, and a second form would be a second rule.

**Rejected.** **Widening `ClipsOutcome`, `VideoAnswer` or `NarrationAnswer` with the refused request** — Gate 3's
approved signatures. **Inferring the call from the stage's records** — a narration with no take for its shot means its
clip was refused, otherwise the next shot's narration was — an inference from the stage's order (S-070), which a stage
making them in another order would falsify with no check failing: the records say what was made, not what was refused.
**A list per guard** — two places to look. **Reading the cap before every call** — an edit to BUDGET.md would change the
rule halfway through an attempt (S-059's reason).

**Not handled.** **A clip on the last shot that costs more than its rate is followed by no call, so no guard fires**:
the run completes with `costCents` above its ceiling or the cap, since assembly buys nothing (I-18). No check's words
reach it; the contract's _"if that passes … your limit, it stops"_ cannot stop a spend already made. A crash between the
finish and the append loses the question (S-026). An inner port answering `refused` itself — only the guard refuses
(S-035) — would stop the stage with nothing on the list, and a stop at the cap would then write no entry. **S-081's
clips-job ending cost** is read at a budget stop by check 42, which holds the job rows to the spend it compared; at
every other clips-job ending it is still checked by nothing.

**Caught by.** `reel-render`'s checks 42 (each guard at each limit, exactly equal made and one cent over refused, the cap
before the ceiling, the spend read again), 43 and 44 (a stop's figures, and the call not made), 45 (one entry naming a
clip, one naming a narration, a second stop appending, the cap the attempt read though BUDGET.md is rewritten while the
stage runs, the run finished before the append), and 47 (the stop's events; an unreadable BUDGET.md failing the run).
Session 27's breaks are in the journal.

---

## S-088 | 2026-09-19 | A narration's characters are its text's Unicode code points

**Chose.** The narration guard's figure counts **code points**, `[...text].length`. The stand-in narration port's
receipt reports `characters` the same way, so a receipt's count is the one the guard multiplied.

**Why.** Gate 2 prices a narration at _"the text's characters × the narration rate"_. A JavaScript string's `length`
counts UTF-16 units, in which a character outside the Basic Multilingual Plane — a mathematical letter, most emoji,
rarer CJK — is two: that figure would overcharge exactly those texts. A code point is what Unicode calls a character.
Every fixture was ASCII, so the two had never been told apart.

**Rejected.** **`text.length`** — above. **Grapheme clusters, by `Intl.Segmenter`** — closer to what a reader sees, but
segmentation follows the ICU data a Node build carries, so a guard's figure could change with the Node binary. **UTF-8
bytes** — three for most CJK: a byte count, not characters. **What the provider bills** — the real T2A adapter is
deferred and its count unread; when it is built, its receipt reports what it billed, and the guard's figure before the
call may need an entry of its own.

**Not handled.** Which count MiniMax's T2A bills. A rate that is not a binary fraction, such as 0.1, can make a product
that is whole in decimals land a hair above it in floating point, and `Math.ceil` then adds a cent; today's rates are 0
and whole cents, and the fixtures' fractional rates are binary fractions. The stand-in's receipt count is read by no
check.

**Caught by.** `reel-render`'s check 42: shot 2's narration holds one letter outside the BMP — 34 code points, 35 UTF-16
units — and at 0.75 cents a character its figure is 216 + 25.5, rounded up to 242, made at a ceiling of exactly 242;
counted by `length` it would be 216 + 26.25, rounded up to 243, and refused.

---

## S-089 | 2026-09-19 | The video restart checks hold a take's witness call or Gate 7's; "the first kept" is the first render row as its worker left it and its file byte for byte; check 48 reads the rows a render is made from

**Chose.**

- **Check 48 holds its first worker at a take's witness call** — S-062's form, applied to clips. For `THREE_RANKS` the
  planner makes two calls and the stills stage eight, so take k's witness is call 11 + 2k: call 15 in the completed
  restart, where shots 0 and 1 have been through every gate and shot 2's clip has been made, measured and heard and
  never seen; call 11 in the budget stop. What the first attempt made is asserted from its receipts before the kill
  (`killedMidVideo`, `tests/engine/restart.ts`). A cost keyed by a whole id — `a1-shot-0-take-1` — lands on the first
  attempt alone. **The budget clause is shown for each guard**: at a narration rate of 0.5 the second attempt's first
  call, its narration, would be 210 + 41 = 251 and is refused; at 0 its narration is made and its clip, 210 + 36 = 246,
  is refused — each over a ceiling of 240.
- **Check 49 holds its first worker at Gate 7's `judgeCut`**, call 23. The render row is written before the assembler
  (`startRender`), and only the assemble job's ending writes its path, measure, verdict and finish (`finishVideo`); a
  killed job reaches no ending. So **"the first kept" is read as the first render row exactly as it was when its worker
  died** — its manifest text, hash and start, and no path, finish or verdict — **and its file where the assembler wrote
  it, `<root>/<runId>/a1-render.mp4`, byte for byte**, measured with every frame and every shot where its narration puts
  it. The test types that path by hand, as check 39 types `a1-render.mp4`.
- **Check 48 reads `readRenderInputs` itself** once its run has completed: the second attempt's six takes and six
  narrations alone, and a ledger summing every attempt's receipts. The test imports the domain package's
  `src/index.ts` by relative path (S-063's form).

**Why.** S-062's reasons hold for a take: a hold at its witness leaves it cut off inside its gates, with no observation
and no outcome, and the count of calls moves with the fixtures where the receipts cannot. Gate 7's is the only model
call after assembly begins. The gates give the render row two writes — its start before the pass and its ending after
(Gate 2, _"The chain"_; S-073) — so a row kept from a killed job has no output, and the file is what says the first
render happened. **A render made from both attempts' rows is the same render on every run one worker can make**:
`renderManifest` takes each shot's last accepted take and narration, and the finishing attempt's rows are always
written last. Session 28's break 48o, `readRenderInputs` dropping its attempt filter, was caught by nothing; session 25
owed _"`readRenderInputs` choosing the latest clips attempt"_ to check 48.

**Rejected.** **A write naming the file on the render row once the assembler returns** — a third write Gate 3 does not
give the row, and a row naming a file whose Gate 7 was cut off reads like a judged render. **Two render rows as all
"kept" means** — a second render written over the first's file would pass. **Holding the assembler** — a second hold
mechanism beside the model's (S-062's reason). **Leaving 48o uncaught as equivalent** — the filter is one line nothing
else reads, and a late row from a worker whose lease outlasted it (`reel-plan`'s known limit) would make the render a
mix of attempts. **A run with two live workers to show it** — builds a known limit into a check (S-063's reason).

**Not handled.** The first render's frame strip stays beside its file, read by no check. A render row whose worker died
has no finish time, and nothing marks it abandoned: `readRecord` lists the holds of the latest render only (S-076).

**Caught by.** Session 28's breaks: 49b, the assembler naming every output for the first render; 49c, the second
render's ending written over the first row; 49d, the first row removed when a render starts again — each by 49; 48o2,
the manifest read from both attempts' rows, by 48 once it reads `readRenderInputs`; 48k and 48l, each guard alone
reading only its own attempt's spend, by 48 and 42.

---

## S-090 | 2026-09-19 | At the take cap a shot is held on its chosen picture when a hold would pass, and the reel stops otherwise; nothing is soft in this build

**Chose.** When a shot's third decided take fails (D-024, S-094), a pure function of the shot and its three takes,
**`atTheCap`**, applies D-025's ladder:

- **Rung 2, hold** — **the shot has a chosen picture and claims no `event` mustShow**. Its picture passed Gate 1 against
  every subject its shot shows, every presence `mustShow` its sentences claim and every `mustNotShow` (S-040), and Gate
  1S where it ran; every failure Gates 2, 3 and 5 can find in one of its takes is either in the clip alone — black,
  frozen, the wrong shape, unreadable, speech or music — or one that picture was checked against. So the class is **a
  property of the shot, not of which gate failed**. The shot is held on its picture for its span, with a slow push, and
  the stage goes on to the next shot.
- **Rung 3, fail the reel** — **a shot with no chosen picture**, made from words because the plan gave it none (D-027)
  or because its picture was degraded (D-050): D-025's _"keyframe never passed"_, since there is no gated picture to
  hold; and **a shot that claims an `event` mustShow**: a still cannot show an event (D-043), so a hold would leave it
  unmet — D-025's _"`mustShow` unmet"_. The run stops **for the rule of the third take's lowest failing gate** —
  `gate-2`, `gate-3` or `gate-5` — at step `video`, the detail naming the three takes, each one's failed gates and
  reasons, and why the shot cannot be held.
- **Rung 1, `accept_with_label`** — **no failure of Gates 2 to 5 is in its class.** D-025's soft failures are _"style
  adherence, camera not exactly as asked"_: no gate here checks style, and no plan asks for a camera (`reel-stills`'
  deferred item 6). So **no take is accepted with a label**, and `atTheCap`'s answer has no member for one.

A held shot's takes stay, all failed, and none is used; its labels are S-098's; its render is S-097's. **The reel's
unclaimed `mustShow` is checked once every shot is done — accepted or held — over accepted takes alone**, so a held
shot's failed takes show nothing for it.

**Supersedes:**

- **D-025**, on _"applies fixed policy in this order, by failure class"_, on rung 2's _"picture right, motion broken
  (freeze, morph, artifact)"_ and on rung 3's _"`mustShow` unmet"_ — the class is a property of the shot, as above: a
  shot with a chosen picture that claims no event is held whatever its three takes failed on, including a presence
  `mustShow` its clips missed and its picture shows, which the hold shows. D-025's order of rungs, rung 2's _"hold the
  gated keyframe as a `still` for the shot's duration, with a slow push"_ and rung 3's _"keyframe never passed"_ and
  _"fail the reel; publish nothing"_ stand.
- **S-066**, on its Chose's _"`accept_with_label`, holding the gated keyframe as a still, and failing the reel"_, as
  this feature's — on its first part: no label is built here.
- **S-066**, on its supersession of **D-025**, on rung 1, _"soft failure (style adherence, camera not exactly as asked)
  → `accept_with_label`, with the verdict recording why"_, and rung 2, _"picture right, motion broken (freeze, morph,
  artifact) → hold the gated keyframe as a `still` for the shot's duration, with a slow push"_ — ended, as S-066's own
  _"until `reel-takes` supersedes this entry in turn"_ provides: rung 2 is built, and rung 1 stands, with no failure in
  its class in this build.
- **D-025**, on its `Confirmed-by` _"A test that `accept_with_label` over a failed `mustShow` is refused."_ — **for this
  build**: nothing is accepted with a label, so there is nothing for a refusal to refuse, and a check of one could not
  fail. `atTheCap`'s answer having no label member is checked by the type (`reel-takes`' check 12). The refusal is built
  with rung 1's first class. I-5 stands, and holds vacuously.
- **S-072**, on _"once every shot's take is accepted, one shown by no take stops the reel for rule `gate-5`"_, and
  **S-069**, on _"an unclaimed `mustShow` no take shows"_ — once every shot is done, accepted or held, one shown by no
  accepted take stops the reel for `gate-5`.

D-025's _"Every one of these is labelled on the shot, in the verdict and in the receipt, and is queryable afterwards"_
and its other two checks stand, and are `reel-takes`' checks 14 and 17.

**Why.** No decision maps a failed gate to D-025's classes (`reel-takes.md`'s item 2). D-025's own reason for rung 2 is
_"The keyframe has already passed its gate, so composition, identity and `mustShow` are witness-confirmed; what failed is
motion"_ — which holds for every Gate 5 failure but an event's, since Gate 1 is given the shot's subjects, its claimed
presence criteria and every `mustNotShow` (S-040), and never an event (D-043). A shot with no gated picture has nothing
to hold (item 3): D-047 already refused to hold a picture that did not pass — _"that one holds a keyframe that passed
Gate 1, and here nothing has"_.

**Rejected.** **Hold on picture faults only** — only takes failing Gate 2, D-025's literal _"freeze, morph, artifact"_;
it stops reels a hold would cure, for failures the picture was already checked against (the owner rejected it).
**Sound failures as soft**, accepted with a label and the last take used — D-008 forbids speech and music in every clip,
and a label fixes framing, not substance (I-5); the owner rejected it. **A hold for a shot made from words on a frame of
a failed take** — a picture no gate passed. **A plain background in place of a shot with nothing to hold** — new content
no gate saw, and D-025 rung 3 already names the case.

**Caught by.** `reel-takes`' checks 12 (each case that stops the reel, its detail, and no label in the ladder's
answer), 13 (a hold on each gate's failure) and 15 (a held shot's takes show no unclaimed `mustShow`).

**Confirmed-by.** The owner, 2026-09-19, choosing _"Hold if a hold would pass (Recommended)"_, whose option said that a
shot whose approved picture passed its checks is held on it with a slow push whatever the clips failed on, since the
picture was already checked for it; that a shot that must show an event, and a shot with no approved picture, fail the
reel; and that nothing is soft in this build, `accept_with_label` waiting for the first check of style or camera. The
substance of the supersessions of D-025 and of S-066's allocation is that answer. **This entry's reading:** the rule a
stopped reel names, its detail, the unclaimed `mustShow` over accepted takes alone, and every supersession quote.

---

## S-091 | 2026-09-19 | A shot's takes are all made its own way; a retry changes its prompt and its seed, never its mode

**Chose.** **Every take of a shot is made in the shot's mode**: `image-to-video` from its chosen picture, or
`text-to-video` at 9:16 — as `reel-render` makes its first take (S-071). A retry differs from the take before it in its
prompt, which carries that take's reasons (S-094), and in its seed, the CRC-32 of its own take id (D-018). **No take
changes strategy.** D-024's _"Takes may span strategies: two failures on one strategy trigger at most one alternative."_
allows none — _"at most one"_ — and is read, not superseded.

**Why.** The one alternative that exists for a pictured shot is `text-to-video`, which gives up the identity its
picture was bought for (D-030: selection is spent on the canonical because it is the reference); D-050 allows words only
where the picture failed, because it _"trades down from nothing"_. For such a shot the hold at the cap is free and keeps
the checked picture (S-090). A shot already made from words has no alternative that exists: an image call in the clips
stage would be a picture made outside the stills stage's six (D-027) and after its gate (I-10). D-037's FLF2V pair is
not built (S-032).

**Rejected.** **Words as the third take's alternative for a pictured shot**, labelled if accepted — the owner rejected
it. **A new seed alone** — D-033's rejected _"re-roll dressed as a retry"_. **FLF2V** — S-032.

**Caught by.** `reel-takes`' check 5: every take of a shot in its first take's mode, on a pictured shot and on one made
from words.

**Confirmed-by.** The owner, 2026-09-19, choosing _"One strategy: the shot's own (Recommended)"_.

---

## S-092 | 2026-09-19 | A clips job run again keeps every finished narration and decided take, and picks up at the first shot not finished; a take a crash cut off is made again and counts against nothing

**Chose.** A `reel.clips` job claimed again after its lease runs out (S-027) **runs its code from the start, and its
stage skips what earlier attempts finished**:

- **Kept**: every narration an earlier attempt **finished** — made, measured, its timings parsed — and every take an
  earlier attempt **decided** — its outcome `accept` or `fail`, with the verdicts it reached. The worker reads them once
  per attempt, after the stage's start and the cap, every earlier attempt's in the order made (`readClipsInputs`), and
  hands them to `makeClips` as `kept`.
- **Not made again, and not looked at again**: a kept narration is not spoken, probed or parsed; a kept take is not made,
  measured, heard, witnessed or reconciled; no receipt is added for either. The stage takes each shot in plan order: a
  shot with a kept accepted take is finished; a kept narration is the shot's; **the shot's next take is numbered its kept
  decided takes plus one**, and a retry after kept failed takes is told every one's reasons (S-094).
- **Made again**: a take **cut off inside its gates** — no outcome — is not resumed: its row, receipt, file and cost stay
  with the gates it reached, and the shot's take of that number is made again under the next attempt's id. **It is not
  a decided take and counts against no cap**, though it is a further paid clip — one each crash, bounded by the per-reel
  cap and the ceiling, which every send is compared with (S-095). A narration made and not finished is made again.
- **The cap holds across attempts**: a shot's decided takes are at most three, every attempt's. A shot with three kept
  failed takes goes to `atTheCap` with no call.
- **Events**: the finishing attempt emits each kept take's verdicts when it reaches the shot, so every decided take's
  verdicts are events once, in shot and take order, and a cut-off take's never.
- **The render** is read from each shot's finished narration and accepted take, whichever attempt made them, the
  still-holds and each held shot's three takes (S-097, S-098); never a cut-off take or an unfinished narration. With
  checkpoints a shot has at most one finished narration and at most one accepted take, so **`renderManifest` refuses
  rows holding two of either for one shot**, naming it, and the assemble job fails the run rather than choosing — what
  S-089 guarded, a render quietly made from rows the stage did not use, kept by a fault instead of an attempt filter.
- **A held shot** whose attempt did not end is held again from its kept takes, and its labels mark the receipts of its
  three takes, whichever attempt made them (S-098).

**Supersedes:**

- **S-076**, on _"A `reel.clips` job claimed again after its lease runs out (S-027) runs from the start with the next
  attempt: every narration and take is made again under ids carrying that attempt, and paid for again — S-048, applied
  to clips."_, on _"only the finishing attempt's verdicts become events"_ and on _"One take a shot is per attempt
  (S-066)."_ — as above. Its _"The earlier attempt's rows, receipts, files and cost stay, with the gates each take reached
  and no outcome where one was cut off; the guard counts its cost; `stage.started` for `video` is not written twice"_
  stands, and so do its bullets on an assemble job run again and a worker dying between jobs. And on its `Rejected`
  _"Resuming the accepted takes — a take cut off inside its gates would be looked at twice."_ — accepted takes are kept;
  the take the reason is about, the cut-off one, is never resumed but made again.
- **S-069**, on _"Only the finishing attempt's verdicts become events."_ — for the clips job, the finishing attempt's
  events hold the verdicts of every take it kept or made, each once.
- **S-089**, on _"the second attempt's six takes and six narrations alone"_ — `reel-render`'s check 48 reads, from
  `readRenderInputs`, each shot's finished narration and accepted take, whichever attempt made them (S-099); and on its
  `Rejected` reason _"a late row from a worker whose lease outlasted it (`reel-plan`'s known limit) would make the render
  a mix of attempts"_ — a render is made of rows from more than one attempt by design, and a late row that would give a
  shot a second accepted take or finished narration fails the run instead (above).
- **D-024**, on _"A shot may consume 3 paid clip takes — one initial plus two retries"_ and on its `Confirmed-by` _"and
  that no fourth video job is submitted for it"_, and **D-014**, on _"retries ≤ 2 per shot"_ — **for a take a crash cut
  off**: it is made again, a further paid clip and video job for the shot that is neither a further take nor a retry.
  No video job follows a shot's third decided take, in any attempt, and every other take is within both.

**S-048 stands for the stills stage**: a keyframes job run again still starts over and pays again. D-002's lease and
S-027 stand: the job runs from the start, and its stage reads what is finished.

**Why.** S-048 rejected resuming, and S-076 followed it: _"Resuming would mean re-checking a picture whose checks were
cut off — a second witness look at one picture, against D-045 and I-15 — or storing each half-finished step."_ Keeping
only what finished needs neither:
a finished narration and a decided take have every step recorded, and a take cut off is made again rather than
re-checked, so no clip is looked at twice (I-15). A crash is not a bad clip, as a provider's 500 is not (I-11's reason),
so the take it cut off costs its shot no try.

**Rejected.** **Starting over**, three takes a shot per attempt (S-076's form, the owner's first option) — the owner
asked for checkpoints. **Keeping finished shots only**, the shot in progress starting over with three new takes — pays
again for its failed takes and forgets their reasons; the owner rejected it. **Resuming a cut-off take's gates** — a
second look at a clip whose witness call may have been made (I-15), or half-finished steps stored. **Counting a cut-off
take** — a crash would cost a shot a try.

**Caught by.** `reel-takes`' checks 21 (the kept work not made or looked at again, the cut-off take made again, the
events once), 22 (the cap and the retry prompt across attempts, a held shot held again with no call), 23 (the render's
rows, read directly and measured, and two accepted takes or finished narrations of one shot refused) and 24 (a budget
stop across attempts, for each guard); `reel-render`'s check 48 as S-099 changes it.

**Confirmed-by.** The owner, 2026-09-19. Asked whether a restarted attempt's earlier takes count against a shot's
three, the owner answered _"Option 1, but can we not save the results as checkpoints so if a crash happens then we pick
from there"_; asked which checkpoint rule, the owner chose _"Keep every finished result (Recommended)"_, whose option
said that a narration measured and timed and every clip whose checks all finished are kept and not bought again, that
the restart picks up at the first shot not finished, that a clip cut off mid-check is made again and counts against no
cap, so a shot gets three judged clips across attempts, and that a retry after the crash is told why the last judged
clip failed; the question said pictures keep S-048's start-over. The substance of the supersessions of S-076's
start-over and its rejection of resuming, and of D-024's and D-014's clauses for a take a crash cut off, is that
answer. **This entry's reading:** the events, the render's rows and the fault that guards them, a held shot held again,
and every supersession quote.

---

## S-093 | 2026-09-19 | The record lists every take made, in contract version 1

**Chose.** `@cutroom/reel-contract`'s `RunRecord` gains **`takes`**, required: **one entry per take made, every
attempt's, in the order made** — a cut-off take too — each with its **`takeId`**, its **`shotId`**, its **`number`** (a
whole number above 0), **`used`**, **`checks`** — each gate it reached, `'2'` to `'5'`, with its outcome — and, where it
reached them, **`observationId`** and **`reconciliationId`** (`obs-<takeId>`, `rec-<takeId>`, S-072). **`used` is true
exactly for the take each shot of a completed video run's video shows** — the take its latest render manifest's clip
shot names — as `chosen` is true only for a completed stills stage's pictures (S-055). A plan or stills run's record has
`takes: []`. The entry is strict, as every contract shape is. **`CONTRACT_VERSION` stays 1.** `readRecord` returns the
takes; `reel-contract.md` gains a note naming this entry, and its gates are not edited; the contract's example record
and the stand-in service's records carry `takes` (test support, S-034's form).

**Why.** S-034's reasoning holds: the version exists so a caller that sends version 1 keeps working when version 2 adds
fields (D-095), and **no caller exists**. `reel-contract`'s _Pending_ item 1 says _"Adding clip entries is compatible
with version 1"_. D-015 traces seed-library assets and clips are assets; D-058 keeps rejected takes because _"they cost
money, they carry evidence"_, and the record is where a caller reads evidence (I-4).

**Rejected.** **Version 2** — two record shapes kept in step for a caller that does not exist (S-034's reason); the owner
rejected it. **Leaving clips out** — the owner rejected it. **`takes` optional** — a record that leaves them out could
not be told from one with none. **Narrations and renders in the record** — not asked; they stay in the tables.

**Caught by.** `reel-takes`' checks 3 (the schema, and the version) and 4 (the entries a run's record lists, `used`, and
none for a plan or stills run); `reel-contract`'s shape checks, run over the amended schema.

**Confirmed-by.** The owner, 2026-09-19, choosing _"Add clips, in version 1 (Recommended)"_, whose option named the
entry's shot, checks and outcomes, and observation and reconciliation ids, every attempt's, and `CONTRACT_VERSION`
staying 1 as S-034 did. **This entry's reading:** `number`, `used`, the order, and the entry being required and strict.

---

## S-094 | 2026-09-19 | Three takes a shot, counted when decided; a retry is told the failed takes' reasons and nothing else

**Chose.**

- **A shot gets up to three takes, each counted once its outcome is decided** — Gate 2 failed, or Gate 5 completed
  (D-024). A take that fails is followed by the shot's next take; the first accepted is the shot's, and none follows it
  (D-030); **after the third decided failure no video call names the shot**, and `atTheCap` decides (S-090). A take is
  not counted when its call was refused (S-095), answered `unavailable` to the last send (S-096), or cut off by a crash
  (S-092).
- **Take ids are `a<attempt>-shot-<unit>-take-<n>`**, `n` 1 to 3, the take's number among the shot's decided takes;
  `TakeRecord.number` is typed `1 | 2 | 3`. The seed is the CRC-32 of the id (D-018). Every take of a shot is in its
  first take's mode (S-091), with its criteria and its requested seconds.
- **A retry's prompt is `retryPrompt(first, failed)`**: the shot's first take's prompt with, **inserted before the
  negative audio block**, a blank line, a line saying the takes before this one failed their checks, and **every earlier
  failed take's reasons, each under `Take 1:` or `Take 2:`, then under `Gate 2:`, `Gate 3:` and `Gate 5:`**, as bullets.
  **The negative audio block stays last** (S-071). It consumes **every earlier failed take of the shot**, as the
  canonical's repair consumes both candidates' verdicts (D-047, S-060): take 3 is told take 1's and take 2's reasons, so
  its prompt differs from take 2's even when take 2 failed for take 1's reasons.
- **A retry is never shown** the failed take's clip, path, observation or expanded prompt (D-072), and no model looks at
  anything to write it (D-033: _"No second vision call is made"_, I-15).
- **Gates 4 and 5 of every take are told nothing of an earlier take**: the witness is given the take's clip and a
  temperature (I-8, S-072), and the reconcile prompt is made of the take's own observation and its shot's brief.
- **Events**: each take's verdicts, with the shot's id, take after take in the order the gates ran.

**Supersedes:**

- **S-066**, on _"A shot gets one take in each attempt of the clips job."_ and on _"A take that fails Gate 2, 3 or 5
  stops the reel for that gate's rule"_ — as above. Its supersession of **D-024**, on _"A shot may consume 3 paid clip
  takes — one initial plus two retries — before it is marked `failed`"_ and its `Confirmed-by` _"A test that a shot with
  three failed takes is marked `failed` and that no fourth video job is submitted for it"_, and of **D-033**, on its
  `Confirmed-by` _"A test that take 2's prompt differs from take 1's whenever take 1 failed a gate"_, ends, as S-066's
  own _"until `reel-takes` supersedes this entry in turn"_ provides: both apply as written, but where S-092 supersedes
  D-024 for a take a crash cut off. _"marked `failed`"_ is read as the shot reaching its cap, where D-025's ladder, as
  S-090 reads it, applies. S-066's _"a reel that fails Gate 7 stops for rule `gate-7`"_ stands.
- **S-071**, on _"Take ids are `a<attempt>-shot-<unit>-take-1`."_ — the number is 1 to 3; and, by addition, on _"The
  prompt, composed by code after the stills are approved (D-033, D-069, D-008)"_ — a retry's prompt adds the failed
  takes' reasons before the negative audio block, which stays last.
- **D-033**, by addition, on its rider _"A retry prompt additionally consumes the failed take's verdict."_ — take 3's
  prompt consumes take 1's verdict as well as take 2's, as D-047's repair consumes both failed verdicts of one entry.
  The rider's reason, _"a retry that cannot see why the previous take failed is a re-roll, not a retry"_, and D-033's
  two inputs stand: a failed take's verdict is recorded, and citing it is never a second look.
- **S-072**, on _"A take that fails stops the run for the rule of its lowest failing gate, the detail naming each failed
  gate's reasons (S-066)."_ — a take that fails is followed by the shot's next; a shot that fails at its cap and cannot
  be held stops the run for the rule of its third take's lowest failing gate (S-090).
- **S-069**, on _"then for each shot in plan order a `verdict` for gates `'2'`, `'3'`, `'4'` and `'5'` with its `shotId`,
  each once its gate completes"_ — for each take of each shot, take after take; and on _"a take failing"_ among the clips
  job's endings — a shot failing at its cap.

**Why.** D-024's three takes and D-033's rider are what S-066 withheld. The reasons go before the block because S-071
puts the block last and the validator holds every video request to it; they are the verdict D-033 names. D-033 rejects
_"Retrying with an unchanged prompt and a new seed — a re-roll dressed as a retry"_, and says of its check _"an
identical prompt proves the verdict was never consumed"_: a take 3 told only take 2's reasons would be take 2's prompt
again whenever the two failed alike, the likeliest case. D-047 already consumes both failed verdicts of one entry.

**Rejected.** **The reasons after the negative audio block**, _"appended"_ as S-060 appends — the block would no longer
be last. **Only the one failed take before it**, S-060's form for a derived repair — take 3 would repeat take 2's prompt
when both failed alike. **The failed take's observation in the prompt** — what a witness saw of a clip that failed
describes what was made, not what was wrong; the reasons are the verdict. **Counting a take when made** — a crash or a
refusal would cost a shot a try.

**Caught by.** `reel-takes`' checks 5 (the next take, its id, number, seed and mode, and no fourth), 6 (the retry
prompt, and take 3's differing from take 2's), 7 (Gates 4 and 5 told nothing of an earlier take), 8 (the events) and 12
(the stop at the cap); `reel-render`'s checks as S-099 changes them.

**Confirmed-by.** Nothing here was asked of the owner: this entry is its own reading of D-024, D-033 and S-066, and of
the owner's S-091 answer, whose option said _"each retry told why the last take failed"_ — which this entry widens, as
its reading, to every earlier failed take, for the reason above.

---

## S-095 | 2026-09-19 | A video run is still admitted on its plan's estimate; every take is guarded, and a refused retry stops the run

**Chose.**

- **Admission is unchanged** (S-069, D-083): the selected plan's estimate, which counts one clip a shot at the plan's
  durations, against the request's ceiling. **A retry is not in the estimate**, as the stills reserve is not (S-035).
- **Every take is sent through the guard, and every send of it** (S-096): the chain's spend read again, plus the
  requested seconds × the video rate, rounded up, against the cap the job read and then the ceiling (S-059, S-087).
  Exactly equal is made.
- **A retry the guard refuses is not made, and its shot is not held**: the stage stops for budget and the run finishes
  `stopped`, `reason: 'budget'`, with the limit, the figure, the ceiling, the cap and the spend (S-087). A stop at the
  cap appends S-087's question, naming the take by its id.
- **D-014's _"retries ≤ 2 per shot"_ stands for decided takes**: three decided takes is two retries. A take a crash cut
  off is made again beyond them (S-092). The per-reel cap and the ceiling bound what every take spends.

**Why.** D-083's plan job _"estimates what the reel would cost to generate"_ from the winning storyboard, and a retry is
in no storyboard; D-024's note: _"The pre-flight check is the control that matters; this is a backstop"_; I-2: the
per-reel cap binds before the take cap does. D-014: a cap _"never silently degrades quality or silently overspends"_ —
holding a shot because its retry was refused would degrade it to save money.

**Rejected.** **Admitting on three clips a shot** — refuses nearly every reel for a spend most never make. **Holding a
shot whose retry is refused** — D-014. **Guarding only a call's first send** — the guard would stop reading the spend
between sends of one call.

**Caught by.** `reel-takes`' check 9, its refused retry on a shot a hold would cure; `reel-render`'s checks 8 and 42 to
45, unchanged.

---

## S-096 | 2026-09-19 | A provider that fails for a moment answers `unavailable`; the worker's guarded ports send the call again, with backoff, on their own counter

**Chose.**

- **`VideoAnswer` and `NarrationAnswer` gain `{ kind: 'unavailable'; detail: string }`** — the provider made nothing and
  may if asked again. Only a provider answers it; the stand-ins answer it only when a test scripts `transient: n` on a
  take or a narration — the first `n` sends of that id.
- **The worker's guarded video and narration ports send the same request again** on `unavailable`, **up to
  `maxAttempts` sends in all**, waiting `backoffMs` before the second, then twice that before each next —
  `RenderSettings.transient`, **default 3 and 1000 ms**. Every send is guarded (S-095). Nothing is written for an
  `unavailable` answer; in this build it costs nothing.
- **A call made after N `unavailable` answers** records **`transient_errors` N** on its video or speech receipt — a
  column defaulting to 0 — and is otherwise what it would have been: **the take counter is unchanged**.
- **A call still `unavailable` at the last send** makes the port throw, naming the call, the sends and I-11; the stage
  fails the run as for any thrown call (S-046) — no row, no receipt, **no take counted**.
- **A throw is a fault**, sent once, failing the run, as in `reel-render`. The pipeline treats an `unavailable` answer
  that reaches it — which the guarded port never passes on — as a fault too.
- **Which calls: video and narration.** Image and model calls are not covered.
- A worker handed **`maxAttempts` not a whole number of at least 1, or `backoffMs` not a finite number of at least 0,
  refuses to start**, before its database is opened.

**Supersedes:**

- **S-066**, on its supersession of **D-024**, on _"and provider transient errors (`maxAttempts` with backoff)"_ and its
  `Confirmed-by` _"A test that N consecutive provider transient errors leave the take counter unchanged"_, and of
  **I-11**, on _"Transient failures retry on `maxAttempts` with backoff, on their own counter"_ — **ended for video and
  narration calls**, as S-066's _"until `reel-takes` supersedes this entry in turn"_ provides. S-066's _"a call that
  throws finishes the run `failed`, as a thrown call does in `reel-plan` and `reel-stills` (S-046), and counts as no
  take"_ stands, for a call that throws.
- **I-11**, on _"Transient failures retry on `maxAttempts` with backoff, on their own counter"_, and **D-024**, on
  _"and provider transient errors (`maxAttempts` with backoff)"_ — **for image and model calls**, until the paid-path
  feature builds the adapters that fail transiently: a thrown image or model call fails the run, as `reel-plan` and
  `reel-stills` were verified. No image or model call touches a take counter.
- **S-066**, on its Chose's allocation to this feature of _"I-11's counter for provider transient errors"_ — **for image
  and model calls**, which the paid-path feature takes, as above; this feature builds the counter for video and
  narration calls.

**Why.** D-024 puts transient errors on a counter of their own, which must not share with takes; I-11: _"A 500 is not a
bad picture and is often unbilled."_ A typed answer, rather than an error the worker recognises by its shape, makes
the difference structural: a bug that throws is never sent again, and the guard, which holds the spend and the ceiling,
is the one place that sends. Backoff waits, and waiting is the runner's, not a pure stage's (`pipeline-no-io`). The
stand-ins reach no network, so nothing is transient unless a test says so.

**Rejected.** **A thrown error carrying a marker** — the worker would retry by an error's shape, which no type names,
and a thrown bug of the same shape would be sent again. **The retry in the stage** — the take counter and the transient
counter in one loop, which D-024 says must not share, and a timer in the pipeline. **Every port now** — changes verified
`reel-plan` and `reel-stills` for adapters that do not exist. **No backoff** — D-024 and I-11 name it.

**Caught by.** `reel-takes`' checks 1 (the answer's type), 2 (the settings and the refusals), 10 (N below `maxAttempts`,
for a video and a narration call; the waits; a take 2 staying take 2) and 11 (the last send, a throw sent once, and the
stage, read directly, failing on an `unavailable` that reaches it); `reel-render`'s check 46, unchanged.

**Confirmed-by.** The owner, 2026-09-19, after the first review of `reel-takes`' gates found the narrowing of S-066's
allocation needed the owner: asked which calls the counter covers, the owner chose _"Clip and voice calls now
(Recommended)"_, whose option said picture and model calls get the same counter with the paid-path feature that builds
their real adapters, since changing verified `reel-plan` and `reel-stills` now would guard against failures no stand-in
can produce. **This entry's reading:** the `unavailable` answer, the sends, the backoff and its defaults, the receipt
column, the refusals, and the supersession quotes.

---

## S-097 | 2026-09-19 | A held shot is rendered in the one pass from its picture's file, pushed in by `zoompan`, with silence under its narration

**Chose.**

- **`RenderShot` is `ClipShot | StillHoldShot`.** `ClipShot` is `reel-render`'s shot, unchanged, with `stillHold?:
never`. `StillHoldShot` has the shot's id, `joinMode: 'cut'`, narration, words, span and conform notes, and a
  **`stillHold`** block — the chosen picture's **id and path**, **its probe** — ffprobe of the file, taken by the media
  port when the ladder held the shot and kept on the `still_hold` row (S-098) — **the three takes** its ladder consumed,
  **the reason**, and **`endZoom`** — and every clip field typed `never`. A picture that does not probe as a readable
  picture is a fault, and fails the run. Its **verdicts** are its picture's, Gate 1 and 1S where it ran, then its three takes', Gates 2 to 5 in order,
  with coverage. A clip shot's verdicts stay its picture's and its accepted take's.
- **The schema refuses** a still-hold shot with no reason, with other than three takes, or with any clip field, and a
  clip shot with a `stillHold`.
- **The one pass** reads the picture's file in place of a clip: scaled to fit the profile keeping its aspect and padded
  from its probe (D-055), then **`zoompan`**, making **exactly the span's frames** from the one picture, zooming **from
  1 at the span's first frame to `endZoom` at its last, centred**, at the profile's frame rate; **silence** for its
  sound, with the narration mixed over it; joined by the `concat` filter in the one filtergraph (D-054).
- **`RenderSettings.stillPush`**, `{ endZoom }`, **default 1.1**, provisional until M-1; a worker handed an `endZoom`
  that is not a finite number above 1 refuses to start. **`zoompan` joins `PASS_FILTERS`**, so `ready()` requires it.
- **A still-hold is measured, never read back** (S-073): every frame of its span carries its picture's colour and none
  the band of its takes; a bordered stand-in picture's border — **2 pixels** of its 90, since a push to 1.1 takes about
  4.1 from each side — is at the span's first frame and pushed out by its last; the span's frames are counted; its clip
  tone is absent under the narration's.
- **The assembler, the assemble job and `cutReel` take both kinds of shot**, a clip shot's geometry read from its
  clip's probe and a still-hold shot's from its picture's — the two measured sources `reel-render`'s check 37 allows
  (S-099).

**Supersedes:**

- **D-059**, on _"the selected take id with its provider `request_id` and `expanded_prompt`"_ — **for a still-hold
  shot**, which has no selected take: its picture's id, path and probe, and the takes its ladder consumed.
- **S-073**, on _"its take, the provider's request id, the expanded prompt and the clip's path"_, _"its opening"_, _"the
  clip's measured facts"_ and _"its hold"_ — for a still-hold shot, which has none of them: its `stillHold` block, as
  above; and on _"`still-hold` is `reel-takes`' (S-066)."_ — built here: D-059's check _"A test that a shot
  marked `still-hold` or `text-to-video` without a degradation reason fails validation"_ applies to a still-hold shot,
  and S-073's reading of it for a `text-to-video` shot stands.

D-059's other clauses stand: the manifest is the assembler's only input, its paths local and under the root, every
shot in timeline order with its join mode and conform notes. S-073's spans, holds, captions, mix and measure stand.

**Why.** D-025 rung 2: _"hold the gated keyframe as a `still` for the shot's duration, with a slow push"_, whose
reason names the primitive _"implemented with ffmpeg `zoompan`"_. D-059 lists _"`still-hold`"_ among a shot's openings,
with its reason. D-055: _"Every input is measured with ffprobe and conformed to that profile"_ — Gate 1's sensor read
the picture's size from its header, which is not ffprobe — so the stage probes the file once, when it holds the shot,
and the manifest carries the probe: the assembler reads nothing the manifest does not hold (D-059), and no geometry is
taken on trust (I-17). Run on this machine before the gates were fixed: a 90 × 160 PNG through `scale`, `setsar` and
`zoompan` with `d` 50 gave exactly 50 frames; the first review ran it again and found a 4-pixel border still at the last
frame's edge and a 2-pixel one gone.

**Rejected.** **A still-hold shot as a clip shot with null fields** — a type in which a keyframe shot may have no take.
**A kind field on every shot** — every manifest's text, hash and fixture would change for shots that did not. **The
picture looped as an input and trimmed** — `zoompan` makes the frames itself, from one picture. **Gate 1's sensor
measure** — D-055 measures every input with ffprobe. **The assembler probing the picture** — the manifest is its only
input (D-059). **The three takes' verdicts left out** — the hold's evidence would be
in rows alone, and a replayed manifest could not show why its shot is held.

**Caught by.** `reel-takes`' checks 2 (the setting and `zoompan`), 13 (a picture that cannot be probed fails the run),
16 (the types and the schema), 17 (the manifest), 18 (the output, measured) and 20 (a replay, and Gate 7's frames);
`reel-render`'s check 37, widened as S-099 says.

---

## S-098 | 2026-09-19 | A held shot is labelled in four places with whatever ending the clips job reaches, in a table of its own, and listed after the stills' degradations

**Chose.**

- **Four places** (I-4): **a `still_hold` row** — run, shot, the clips attempt that decided it, picture, the picture's
  probe (S-097), the three take ids, reason — its key the run and the shot; **the third take's row**, whose
  `degradation` carries the reason; **the video receipt of each of the three takes**, marked `degraded`, **whichever
  attempt made it**; and **a `degraded` event** after the third take's verdicts. S-058's form, but for the receipts:
  S-058's _"The receipts marked are the shot's pictures this attempt made"_ is about pictures, and its reason — an
  earlier attempt's pictures belong to a ladder that degraded nothing — does not hold under checkpoints, where an
  earlier attempt's decided takes are this ladder's (S-092).
- **Written with whatever ending the clips job reaches**: `advanceClips` for a completed stage, `finishVideo` for a
  stop or a failure, in the transaction that ends it. The stage records each `StillHold` and its event when its ladder
  holds.
- **Listed** in a completed result's `degradations` and in the record's: the stills stage's in the order reached, then
  **the still-holds in the order reached**, then the latest render's holds in shot order.
- **Kept apart from a hold** (S-073): a still-hold's reason begins with the shot _"is held on its approved picture"_ and
  cites D-025; a hold's says a take's _"last frame is held"_ and cites S-073. They are written by different jobs to
  different tables, and no shot has both, since a held shot shows no clip.

**Supersedes:** **S-069**, on _"`degradations` the stills' then the holds'"_ — the stills', then the still-holds', then
the holds'; and on its list of the clips job's events, ending _"completed: nothing more from this job"_ — the clips job
also writes a `degraded` event for each held shot, after its third take's verdicts, whatever its ending. S-069's
_"From the assemble job — cancelled: `run.finished`; else a `degraded` event per hold in shot order (S-073)"_ stands for
the holds.

**Why.** I-4: _"A still-hold, an `accept_with_label`, a dropped shot — each is labelled on the shot, in the verdict, in
the receipt, and queryable afterwards."_ D-025's check wants a query for the reels containing a held shot, which a
table of its own answers, as S-073's `hold` table does for a clip held to its narration. S-058 writes a degraded
picture's labels with every ending, because a degradation is a fact decided when its ladder ended.

**Rejected.** **The `degradation` table** — the stills stage's, which `readClipsInputs` reads as the shots to make from
words: a restart would make a held shot `text-to-video`. **The `hold` table with a kind** — one name for two things, and
the record lists the latest render's holds only. **Labels on a completed ending only** — an event no row records
(S-058's reason). **Only the third take's receipt marked** — S-058 marks every receipt of the shot's pictures.

**Caught by.** `reel-takes`' checks 14 (the four places, with three endings, and the query), 19 (the order, and the
two kept apart) and 25 (the events of a held shot's endings).

---

## S-099 | 2026-09-19 | What `reel-takes` changes in verified features

**Chose.** Each change is made in the slice that forces it, and **none removes an assertion**. **A premise three takes
turn into a retry is kept on the path that still stops**: the failure built on each of a shot's three takes, on a shot
S-090 cannot hold — shot 0 of `NO_RECURRENCE`, shot 3 of `THREE_RANKS` (each made from words) or shot 0 of `THREE_RANKS`
(it claims the event `show-pressing`).

**`reel-render`** (Slice 2, but check 37 in Slice 4 and check 48 in Slice 5):

- **Check 20** (`tests/reel-render-gates.test.ts`), its held test: its Gate 3 failure is on shot 1, which a hold can
  cure, so once released the run makes shot 1's take 2 and goes on to shots 2 to 5; its script, which answered
  `[t0, t1]`, answers shot 1's take 2 and every take after it, so the run ends as a completed clips stage rather than on
  a missing answer. Every assertion is kept as written — it reads take 1 alone.
- **Check 21** (`tests/reel-render-gate2.test.ts`): `firstTake` scripts its entry on `shot-0-take-1`, `-2` and `-3` of
  `NO_RECURRENCE`. In `failedGate2`, _"a later take was made"_ — one take row — becomes three, the shot's, and none of a
  later shot; the one take's verdicts `[['2', 'fail']]`, its outcome and its Gate 2 reason are asserted of each of the
  three; stopped, rule `gate-2`, step `video`, no observe or reconcile call and no observation or reconciliation are kept
  as written. Its passing tests are unchanged.
- **Check 22** (`tests/reel-render-gates.test.ts`): the speech and the music runs script the sound on each of shot 3's
  three takes, where they scripted shot 2's one; stopped and rule `gate-3` are kept; the take's verdicts, reasons,
  outcome and sound, and Gates 4 and 5 having run, are asserted of each of the three. The words run is unchanged.
- **Check 23**, its first test: the Gate 5 failure on each of shot 3's three takes; rule `gate-5` kept; the outcomes
  `['accept', 'accept', 'fail']` become three `accept` then three `fail`; `observeClipCalls.length` 3 becomes 6; the
  rest is asserted over every take, as written. Its second test is unchanged: an unparsed witness answer fails the run.
- **Check 24**, its second test: each Gate 5 fault on each of shot 0's three takes; rule `gate-5` kept; the one take's
  Gate 5 verdict, reason and outcome asserted of each of the three; the observations and reconciliations — one each —
  become the three takes', with one reconciler receipt each. Its first test is unchanged.
- **Check 26** (`tests/reel-render-stops.test.ts`): each case's fault on each of shot 3's three takes, where it was on
  shot 2's one. Status, reason, rule and step are kept. _"The detail names the take and every reason of every gate it
  failed"_ is asserted of the three takes. `/one take/i` becomes `/three takes/i` and `/no approved picture/i`. The
  narration calls become shots 0 to 3, and so do the narration rows, `[0, 1, 2]` becoming `[0, 1, 2, 3]`; the clip calls
  take 1 of shots 0 to 2, then takes 1, 2 and 3 of shot 3; the take rows shots 0 to 2 accepted, then shot 3's three
  failed; the gates each failing take reached, per case, of each of the three; the reconciliations 3 or 6 where they were
  2 or 3; the Gate 3 case's criteria, shot 3's.
- **Check 37** (`tests/reel-render-cut.test.ts`, Slice 4): its reading of the assembler's source — that every width,
  height, frame rate, sample rate and channels read is off the profile or off `shot.clip.video` — gains a second
  measured source, `shot.stillHold.probe.video`, a still-hold shot's picture probed by ffprobe (S-097, D-055); every
  other read it refuses, it still refuses, and its grep for the concat demuxer, stream copy and segments is unchanged.
- **Check 47**, _"a take failing"_ (`tests/reel-render-endings.test.ts`): the music on each of shot 3's three takes; the
  events `TAKES(2)` and shot 2's four become `TAKES(3)` and shot 3's three takes' four each — `2 accept`, `3 fail`,
  `4 accept`, `5 accept` — then `run.finished stopped`; rule `gate-3` kept.
- **Check 48** (`tests/reel-render-restart.test.ts`, Slice 5, S-092). The completed restart, held at call 15: the new
  worker's narration calls, every shot's, become shots 3 to 5's; its clip calls, every shot's, become shot 2's —
  `a2-shot-2-take-1`, the take the kill cut off, made again — and shots 3 to 5's; the narration rows become the first
  attempt's three and the second's three; the take rows the first attempt's three and the second's four; the
  observations and reconciliations `T(1,0)`, `T(1,1)` and the second's four; the second attempt's receipts its three
  narrations and four clips; the manifest's shots, and the takes `framesOf` measures, the first attempt's takes and
  narrations for shots 0 and 1, the first attempt's narration and the second's take for shot 2, the second's for 3 to
  5; `readRenderInputs` those same rows, where it was _"the second attempt's six takes and six narrations alone"_ (S-089)
  — each shot's finished narration and accepted take, never `T(1,2)`. The new worker's model script, `clipsScript`,
  answers from shot 2's take on, the second attempt's first model call. The result, the jobs, `stage.started` once, the
  events, the kept receipts, the files and the ledger are kept as written. The budget stop, held at call 11: the clip
  guard's run keeps its figure, 246, and its made calls become none — shot 0's narration is kept, so the refused call is
  its take made again; the narration guard's run holds its first worker where the second attempt's first narration call
  comes after the cut-off take is made again — the next shot's — with a ceiling and a narration rate chosen in the slice
  so that clip is made and that narration refused, and asserts the same things of it.
- **Stand as written**: checks **13** and **18**, whose fixtures are one attempt with no failing take — though their
  words, _"one narration call in each attempt"_ and _"N video receipts"_, no longer hold of every run: a restarted
  attempt makes no narration it kept, and an attempt with a retry makes a receipt a take; **25**; **38** — a Gate 7
  failure is terminal, D-058's edits being `video-edits'`; **46** — a throw is a fault, only `unavailable` is sent again;
  **49**; and every check not named here.
- `reel-render.md` gains a note naming this entry and checks 13 and 18 — its Gate 2 and 3 passages resting on S-066's
  one take, S-072's stop, S-076's start-over and S-069's events and order of `degradations` are superseded with those
  entries, not edited — and its Evidence line is not touched.

**`reel-contract`** (Slice 1, S-093): `RunRecord` requires `takes`, so the shape check's example record and the
stand-in service's records (`tests/stand-in/`) carry `takes: []`; `reel-contract.md` gains a note. No assertion changes.

**`reel-stills`** and **`reel-plan`**: nothing asserted changes. The stand-in picture's `border` is an option no stills
test sets; the model port keeps its four calls.

**Code and test support, none of it an assertion**: `TakeRecord.number` widened, and the guarded video port and
`readRenderInputs` writing and reading the take's number; the pipeline handling `unavailable` (Slice 1); the assembler,
the assemble job and `cutReel` taking both kinds of render shot, and two verified test files typed for the union —
`tests/reel-render-shapes.test.ts`' shot builder taking a `ClipShot['opening']`, and
`tests/reel-render-manifest.test.ts`' `rows()` carrying `stillHolds: []` (Slice 4); `tests/engine/video.ts`'
`videoScript` and `clipsScript` answering the model stand-in for each take made, retakes included, in call order;
`TEST_RENDER_SETTINGS` and the child worker carrying `transient` — with a short backoff — and `stillPush`.

**S-066's other supersessions continue**, by name: of **D-058**, on _"Their repair vocabulary is a closed enum of edit
ops that spend no money: `reorder`, `retime`, `recaption`, `reselect-take` (choosing a different already-accepted take
of the same shot). Applying any of them re-runs L5 and re-runs Gates 7 and 8."_ and its `Confirmed-by` _"The op
vocabulary is a closed enum in the schema and an op outside it fails validation."_ — the edits are `video-edits'`, and
a Gate 7 failure stays terminal; and of **D-080**, on _"the clips, Gates 2 to 5, the take ladder, the narration audio,
the assembly pass, and Gates 7 and 8"_, and **D-108**, on _"`reel-render` is unchanged: everything after the approved
stills (D-080)"_ — the take ladder is this feature's and is built here, the edits `video-edits'`, and Gate 8
KnowScroll's (S-068).

`reel-render's`, `reel-stills'`, `reel-plan's` and `reel-contract's` journeys run again in Slice 6.

**Why.** S-066: _"Owed by `reel-takes`: its gates name checks 21 to 26 and 38 as premises it changes, in S-047's form,
since each asserts a stop that three takes turn into a retry."_ Checks 46 and 48 meet I-11's counter and the restart.

**Rejected.** **Leaving the checks as written** — red on a correct build. **Moving each to a shot that is held** — its
stop assertions would go. **Scripting the failure on take 1 alone** — the run completes on take 2, and the stop
assertions go dead (S-055's lesson). **Editing `reel-render`'s gates** — a note says what changed and where it is
decided (S-047).

**Caught by.** The four journeys, run again in `reel-takes`' Slice 6, and `reel-render`'s check 50, whose child runs
every changed test.

---

## S-100 | 2026-09-19 | `reel-takes`' check 4 is built on runs later slices leave alone, but one restart, typed for S-076's start-over, which Slice 5 moves

**Chose.** Check 4 (`tests/reel-takes-record.test.ts`) reads each run's record from the record route, every expectation
typed by hand, on runs chosen so the ladders Slices 2 to 5 build leave the record as Slice 1 finds it:

- **The run stopped in its clips stage** stops on shot 3's first take — `THREE_RANKS`' shot made from words — which
  fails Gate 2, black from its first frame, at a scripted cost of 230 under a ceiling of 240. Slice 1 stops it for
  `gate-2`; from Slice 2 the retry, at least 230 + 20, is refused by the guard and the run stops for budget (S-095). The
  record is the same four entries either way, and the check asserts the run stopped, not why.
- **The first restart** holds its first worker at call 12, shot 0's reconcile call: the first attempt decides no take,
  so the second makes all six whether it starts over (S-076) or picks up where the first stopped (S-092).
- **The plan and stills runs** share an engine with a video run, so their records are read while the database holds
  another run's takes.
- **A second restart**, added after this slice's break campaign, holds its first worker at call 16, shot 2's reconcile
  call: shots 0 and 1 decided and accepted, shot 2's take cut off. **It is typed for S-076's start-over** — the first
  attempt's three entries, none used, then the second attempt's six, used. **Slice 5 moves it onto S-092's
  checkpoints**, as S-099 moves `reel-render`'s check 48: the new worker's model script from shot 2's take on, the
  second attempt's four takes, and shots 0 and 1's first-attempt takes used; every clause kept.

**Why.** Two wrong records passed every run the first four cases make: **the takes in shot order** rather than the order
made, and **every accepted take of a completed run marked used** — breaks 4f and 4c, caught by nothing. Check 4 promises
both, _"in the order made"_ and _"used true for every take its video shows"_ as S-093 reads it, _"exactly"_. Neither
differs from the right record while a restart's first attempt decided no take, or on any run of one attempt: only a
restart that starts over after deciding takes lists an attempt's takes out of shot order and shows none of its accepted
ones. Under checkpoints no run can — a finishing attempt makes nothing before the take it cut off, and every accepted
take of a completed run is its shot's one — so the moved case needs to catch neither there.

**Rejected.** **Rows written straight into a database and `readRecord` read directly** — a record of rows no run made,
where check 4 reads runs. **Expectations read from the tables** — the order from the take rows, `used` from the render
row — to spare Slice 5 the move: not typed by hand, and the new worker's script still differs between the two
slices, so the case moves anyway. **Leaving 4c and 4f uncaught** — the check's words promise both.

**Caught by.** Breaks 4c2 and 4f2 — 4c and 4f run again after the case was added — each caught by check 4. Slice 5's
suite, in which this case goes red once checkpoints land, until it is moved.

---

## S-101 | 2026-09-19 | `reel-takes`' check 9 shows every send of a take guarded, by a spend a test writes between two sends

**Chose.** Check 9 (`tests/reel-takes-guard.test.ts`) holds S-095's _"Every take is sent through the guard, and every
send of it"_ with a fourth run beside its three: shot 1's retry is scripted `transient: 1`, and the port the worker is
handed is wrapped so that, when that send is answered `unavailable`, the test adds 213 cents to the clips job's row — as
a provider that billed an unavailable answer would make the spend grow. The guard reads the chain's spend again before
the second send and refuses it, 213 + 28 = 241 against a ceiling of 240, so the run stops for budget with that figure:
the retry's first send reached the port, and its second did not. The test is titled with check 9's words and _"every
send of a take, not only its first"_.

**Why.** In this build nothing changes the chain's spend between two sends of one call: an `unavailable` answer writes
nothing and costs nothing (S-096), and the worker runs one job at a time (D-002). So a guard that compared only a call's
first send — S-095's rejected _"Guarding only a call's first send"_ — gives every run the answer one that compares each
gives, and S-095 names check 9 as what catches its rules. A rule nothing can fail reads as coverage (S-014).

**Rejected.** **Leaving it to the paid path**, which settles whether a provider bills an `unavailable` answer
(`reel-takes`' deferred item 2) — the guard's rule is this feature's, built now, and would go unchecked until then.
**A cost scripted on the stand-in's `unavailable` answer** — S-096 says one costs nothing here, and a cost on an answer
that writes no receipt is spend no ledger holds. **`guardedVideoPort` exported and called on a database built by
hand** — a worker export that exists for a test (S-082's reason), and the port read apart from the clips job that builds
it.

**Not handled.** **The narration guard's every-send rule is checked by nothing.** Check 9's words are about takes, and no
check of the 26 reads a narration's second send against a spend that grew: session 31's break 9c, the narration guard
comparing only a call's first send, was caught by nothing. Said here rather than widened.

**Caught by.** Session 31's break 9b, the video guard comparing only a call's first send — caught by check 9 alone.

---

## S-102 | 2026-09-19 | A wait between two sends of one call is held to a monotonic deadline, not to one timer

**Chose.** `apps/worker/src/transient.ts`, through which both guarded ports send (S-096), waits between two sends until
`performance.now()` has passed the deadline the wait began with — `backoffMs`, then twice the last wait — and sleeps
again for what is left whenever a timer ends first.

**Why.** Gate 2 and S-096 say the port waits `backoffMs` and then twice that, and check 10 measures each wait as _"at
least backoffMs"_. libuv counts a timer from the event loop's cached time, in whole milliseconds, so one `setTimeout(ms)`
can end a fraction of a millisecond — more after a long turn of the loop — before `ms` have passed on the monotonic
clock. Session 31 saw it: in its break campaign check 10 failed under six breaks that cannot reach it, and with the bare
timer put back one of three runs of the campaign's test set failed with _"a1-shot-1-narration's first wait was 150
ms"_ — 149 and a fraction, rounded. A probe of 27 waits under load found a least margin of 0.18 ms with the bare timer
and 1.24 ms with the deadline, and three runs with the deadline passed.

**Rejected.** **One `setTimeout` a wait** — a wait the gate says is at least `backoffMs` that now and then is not.
**Check 10 allowing a millisecond short** — a check loosened to fit the code, where the code can keep the gate's word
(CLAUDE.md's rule 3). **Asking the timer for a millisecond more** — how far short a timer ends grows with the turn of the
loop it was set in, which nothing bounds.

**Not handled.** The bare timer is caught only now and then: session 31's break w1, which restores it, passed check 10
the one time the campaign ran it, and failed one run in three beside it.

**Caught by.** Check 10's measured waits, and session 31's breaks 10b (no wait) and 10c (a constant one), each caught by
check 10 once the deadline was in.

---

## S-103 | 2026-09-20 | A held picture probes as a readable picture only when ffprobe finds a video stream with a width and a height

**Chose.** When the ladder holds a shot (S-090), the clips stage probes its chosen picture with the media port (D-055,
S-097) and holds it **only if the probe is `readable`, has a video stream, and that stream's width and height are
above 0** (`notAPicture`, `packages/pipeline/src/clips/index.ts`). Anything else
finishes the run `failed` with a detail naming the shot and the picture, saying it _"did not probe as a readable
picture"_ and what the probe found; nothing is recorded for the hold, so no label is written. A probe that **throws**
is not this: it fails the run with the throw's message, as any thrown call does (S-046).

**Why.** S-097 says a picture that does not probe as a readable picture fails the run, and `reel-takes`' check 13
builds one by replacing the picture's file with other bytes before its third take is decided. Measured on this
machine, with ffprobe 8.1.1: bytes that are no picture, in a file named `.png`, make ffprobe **exit 0** and report an
`image2` input with one `png` stream of **0 × 0** and no frame read — so the media port answers `readable: true`, with a
video stream. The stand-in's real picture probes as `png_pipe`, 90 × 160, one frame. `readable` says ffprobe could
read the file, not that the file is a picture. **No frame count is asked for**: a PNG cut short after its header
probes as 0 × 0 too, so a rule on frames would fail no picture the size rule passes — a rule nothing can fail (S-014).

**Rejected.** **`readable` alone** — the replaced picture passes, the shot is held on bytes no gate saw, and the render
would conform a 0 × 0 stream (I-17's silent kind of failure). **Comparing the probe with Gate 1's measure** — that is
the sensor's reading of the PNG header, not ffprobe (D-055), and a check of one against the other adds a second source
for the geometry. **Probing the picture before the shot's takes** — S-097 says when the ladder holds the shot, and a
file changed during the takes would be probed before it changed.

**Caught by.** `reel-takes`' check 13, its run whose picture is replaced with other bytes during its third take's
measure: with `readable` alone the shot is held and the run goes on, and the check's failed ending and its detail go
red.

---

## S-104 | 2026-09-20 | A render manifest's shot is refused BY BRANCH: a clip shot or a still-hold shot, each strict

**Chose.** `renderManifestSchema`'s `shots` are a **union of two strict objects**
(`packages/pipeline/src/render/manifest.ts`): `clipShot` — every field `reel-render` built, and no `stillHold` — and
`stillHoldShot` — the span's fields and a `stillHold` block, and no clip field. Because **each branch is strict**, a
still-hold shot carrying a take id, a request id, an expanded prompt, a clip path, an opening, a clip measure, picture
frames or a hold is refused by construction, and so is a clip shot carrying a `stillHold`: no combination of fields is
written out by hand, so none can be forgotten. The still-hold branch itself refuses a shot whose `degradation` is
missing or empty — **D-059's check, which S-073 left to this feature** — and one whose `takeIds` are not
`TAKES_A_SHOT` of them.

**Why.** S-097 makes `RenderShot` a union of two types, each making the other's fields `never`. A schema of one object
with every field optional would describe a type that does not exist, and every refusal would then be a rule someone
wrote: eight clip fields against the `stillHold`, in both directions. A pair nobody wrote is a shot the schema accepts —
a rule that reads as coverage and catches nothing (S-014). Strictness already refuses an unknown key, so the two
branches carry the whole rule for nothing.

**Rejected.** **One strict object with every field optional and a `superRefine`** — the forgotten pair above.
**A discriminated union on a `kind` field** — S-097 rejected a `kind` on every shot: every manifest's text, hash and
fixture would change for shots that did not. **Leaving the refusal to the builder** — the schema is what a manifest
must be (D-059), and a manifest is parsed again on the way in, which is what check 20's replay renders.

**Caught by.** `reel-takes`' check 16 — its refusals of a still-hold shot with no reason, with other than three takes
and with each clip field in turn, of a clip shot carrying a `stillHold`, and its manifest holding both kinds, which
parses. Breaks 16a to 16d and 16g.

---

## S-105 | 2026-09-20 | A held shot's conform notes are its pad and its silence; making frames is not a frame-rate conversion

**Chose.** A still-hold shot's `conform` is written by `stillConformNotes`
(`packages/pipeline/src/render/manifest.ts`): **the pad**, computed from the picture's own probe exactly as a clip's is
from its measured facts, and **the added silence** — a picture has no sound. It records **no frame-rate note**, whatever
rate ffprobe reports of the picture's file, because **nothing is converted**: `zoompan` MAKES the span's frames at the
profile's rate from the one picture.

**Why.** D-055 records a conform note "where conforming changes anything beyond resampling — a letterbox, a crop, a
frame-rate conversion". ffprobe calls the stand-in's PNG **25 frames a second** (measured on this machine, as S-103
measured the rest of that probe), so reusing `conformNotes` would write _"frame rate: 25 to 24"_ on every held shot: a
record of a conversion the pass never performs. I-4 wants a degradation recorded; it does not want a record of
something that did not happen. The pad and the silence are both real — the picture is scaled to fit and padded, and
silence is added for the span (S-097).

**Rejected.** **Reusing `conformNotes`** — the spurious rate note above, on every held shot of every reel. **No notes at
all** — the pad is a letterbox, which D-055 says is recorded, and the silence is what S-073 records for a clip with no
sound. **A note naming `zoompan`** — a conform note says what was done to an input to make it fit the profile, not which
filter did it.

**Caught by.** `reel-takes`' check 17, which reads the held shot's conform notes as the manifest holds them. Break 17k,
the clip's notes reused.

---

## S-106 | 2026-09-20 | The reel's unclaimed `mustShow` is judged over every decided take of the run, kept ones included

**Chose.** The clips stage's last check — a `mustShow` no sentence claims that **no accepted take showed** stops the
reel for `gate-5` (S-072, S-090) — reads **every decided take of the run: the takes this attempt made AND the takes it
kept from earlier attempts** (`makeClips`, `packages/pipeline/src/clips/index.ts`; S-092). A shot an earlier attempt
accepted is a finished shot of this run, and the take that finished it is the take that showed what it showed.

**Why.** Under checkpoints a finishing attempt makes nothing at all for a shot an earlier attempt accepted, so its own
record holds no take for that shot. Judged over this attempt's takes alone, a restarted run whose unclaimed criterion
was shown only by a kept take would stop for `gate-5` **with every shot accepted** — a stop no run of one attempt can
reach, and one a caller could do nothing with, since nothing is wrong with the reel. S-092 has the finishing attempt
emit a kept take's verdicts _"as if it had made them"_; the same reading applies to what those takes showed. The rule
itself is unchanged: a HELD shot's takes all failed, so they still show nothing (S-090).

**Rejected.** **This attempt's takes alone**, the code as Slice 3 left it — the stop above, on a reel that is whole.
**Reading the kept takes' reconciliations from the tables at the end** — the stage is handed them already, and a second
read is a second source that can disagree with the first (I-15's reason). **Judging it over kept takes only where a
kept take finished the shot** — the same set, spelled longer: a kept take that failed is not accepted either way.

**Caught by.** `reel-takes`' check 21. Its second attempt's four takes are each reconciled as **not** showing
`show-meadow`, the reel's unclaimed `mustShow`, and only the kept takes of shots 0 and 1 show it — so a stage counting
this attempt's takes alone stops the run for `gate-5` where check 21 says it completes. Break 21g.

---

## S-107 | 2026-09-20 | `reel-takes`' check 26 runs its child four files at a time, and `reel-render`'s check 50 keeps its bound

**Chose.** `tests/reel-takes-secrets.test.ts` starts its PATH-alone child with **`--test-concurrency=4`**
and the same **300-second timeout** `reel-render`'s check 50 uses (S-028's form). **`reel-render`'s check 50
is not touched**: neither its bound nor its timeout is widened for the second child.

**Why.** Two PATH-alone children now run inside one suite, and each holds a whole feature's tests — nine
restart runs in `reel-takes`' case, each starting a worker process of its own, and a video run in each that
starts ffmpeg again and again. Measured on this machine on 2026-09-20, inside the suite, at 16 cores and
15.7 GB:

| check 26's child | its time | machine's least free memory | check 50's child | the whole suite |
| ---------------- | -------- | --------------------------- | ---------------- | --------------- |
| Node's default   | 101 s    | 815 MB                      | 248 s            | 291 s           |
| bounded to four  | 130 s    | 1306 MB                     | 237 s            | 280 s           |

The bound costs this child 29 s and gives the machine 491 MB back, takes 11 s off `reel-render`'s child —
which is the one near its bound — and 11 s off the suite. Alone, outside the suite, the same child is 51 s
at the default and 68 s bounded, so the bound's cost is small and its relief is not.

**A bound and a timeout are test support**: every file still runs, every assertion is unchanged, and the
roll call still holds that checks 1 to 25 each ran and passed in the child.

**Rejected.** **Node's default concurrency** — 101 s is the faster child, but it is the one that leaves 815 MB
free while `reel-render`'s child, already at 248 s of its 300, runs beside it; the suite is no faster for it.
**Widening `reel-render`'s check 50 to 400 s** — it would hide exactly what its own bound is for, and CLAUDE.md's
rule is that a check is never weakened to reach green; 237 s under 300 is a finding to report, not to paper over.
**Bounding `reel-render`'s check 50 harder, to two** — a change to a verified feature's test for this feature's
convenience, which S-099 does not allow.

**Caught by.** Check 26 itself: a bound too tight, or a machine too loaded, ends the child at its 300-second
timeout and the check fails with the child's output — it is never made green by widening. **Not caught:** a
machine with fewer cores or less memory than this one, where both figures would differ; the numbers above are
this machine's, dated, as check 50's are.

**Confirmed-by.** Nothing asked of the owner: test support, measured.

---

## S-108 | 2026-09-20 | Which adapter each port gets is one setting per port, defaulting to the stand-in

**Chose.** A `ProviderSettings` block names **one adapter per port** — `model`, `image`, `sensor`, `video`,
`narration` — each a value from a **closed set**: `'fake'` for the stand-in, or the one real adapter that port has
(`'minimax'` for the model and the narration, `'fal'` for the image and the video, `'local'` for the sensor).
**Every default is `'fake'`**, so a worker started with no provider settings is the engine as it is verified today:
free, secretless, reaching no network but ffmpeg on this machine.

- **The setting is read where the worker is composed**, in `apps/worker`'s entry point — the composition root that
  already chooses the stand-ins — **and it names an adapter; it never constructs one**. `packages/providers` exports
  one factory per port that takes the name and returns the port. **S-021 and S-038 stand**: the worker is handed its
  ports, and `worker-no-providers` keeps `apps/worker/src` from importing `packages/providers` at all.
- **A name outside the closed set, or a real adapter whose key is absent, refuses to start**, before the database is
  opened, in the same place and the same shape as S-075's tools and S-096's transient settings: a worker that cannot
  build the ports it was told to build claims no job and buys nothing.
- **Mixed is legal and expected**: a real video adapter beside a stand-in image adapter is a setting, not a branch in
  any stage. No stage, gate or job learns which it was handed; `receipt.fake` already says so, per call, on every
  receipt the tables keep (S-036).

**Why.** The owner chose it, over the two alternatives below. It keeps the one property every feature so far was
verified against — **the suite runs on stand-ins, for $0, with no secret** — true by default rather than by
circumstance, and it makes "make this reel for real" one setting rather than a second program. The engine already
proves the shape works: `reel-takes` hands the worker validated, guarded, recording wrappers around whatever port it
was given, and nothing below the worker knows the difference.

**Rejected.** **Real whenever a key is present in the environment** — the default becomes whatever the machine
happens to hold, a stray `FAL_KEY` in a shell turns a test run into a paid one, and the no-secrets checks would be
proving something about that machine rather than about the engine. **A second entry point that composes the real
ports** — the strongest separation and the most duplication: two composition roots drift, and the one that is not
exercised by the suite is the one that breaks. **A per-call choice** — a stage would have to know, which is the
boundary S-021 exists to hold.

**Caught by.** The paid-path feature's checks: a worker refusing every name outside the set and every real adapter
with no key; a run whose settings are all `'fake'` making exactly the calls it makes today; and a boundary rule test
that `apps/worker` still imports no provider.

**Confirmed-by.** The owner, 2026-09-20, asked how the engine chooses a real provider over a stand-in: _"A setting,
per port (Recommended)"_.

---

## S-109 | 2026-09-20 | A provider's key comes from the environment, and only `packages/providers` may read one

**Chose.** Each real adapter reads its key **from the environment, at the moment it is constructed, inside
`packages/providers`** — `MINIMAX_API_KEY` for the model and the narration adapters, `FAL_KEY` for the image and the
video adapters. **No other package, app or test may read a key**, and a **twentieth boundary rule**,
`keys-only-in-providers`, is added to `scripts/drift.mjs` to hold it, with a deliberate violation built by
`--prove` like the other nineteen.

- **The environment is loaded from a gitignored `.env`** by the worker's entry point, one setting naming the file,
  defaulting to `.env` beside the repository root (D-086's form: one setting, a default inside this repository).
  **`.gitignore` already covers `.env`; no exception is added** (CLAUDE.md rule 4).
- **A key is never written anywhere**: not into a receipt, a row, an event, a question, a log line or a fault's
  message. An adapter that must name its call names the model and the request id, never a header.
- **D-022 is binding on what a provider hands back.** A response field that is a URL — MiniMax T2A's
  `subtitle_file` is a presigned OSS URL carrying `OSSAccessKeyId` and `Signature`, which is the exact shape that
  leaked in the steering repository — **is used and dropped, never persisted**. The narration adapter fetches the
  timings and stores the words; the video and image adapters download the file under the artifact root and store the
  local path. **What is persisted is the host at most, never the query string.**
- **The no-secrets checks keep their meaning.** `reel-takes`' check 26 and `reel-render`'s check 50 run the suite in
  a child holding PATH alone; with every default `'fake'` (S-108) nothing in the suite constructs a real adapter, so
  **no test needs a key and the guarantee stays unconditional** (S-111).

**Why.** The owner chose it. The engine reads no secret today and two checks prove it; the rule that keeps that
true as real adapters arrive has to be structural, not a habit — the same argument that made `pipeline-no-io` and
`worker-no-providers` rules rather than review notes. D-022's finding is that scanning for your own keys proves
nothing about what a provider handed you, so the boundary is where a response is recorded, not where a key is typed.

**Rejected.** **A key file named by a setting** — one more file that must never be committed, and D-022's incident
was a credential written into a file. **Keys reaching the worker as arguments** — the worker would hold a secret it
has no use for, and `worker-no-providers` would be the only thing between it and a provider. **Reading a key at call
time** — a run that starts without one would fail halfway through, after spending.

**Caught by.** The paid-path feature's checks: `drift --prove` building a violation of `keys-only-in-providers`; an
adapter's receipt and rows asserted to hold no key and no query string against a recorded response that carries
both; and a worker refusing to start when a named real adapter's key is absent. **Changes a verified feature:**
`reel-stills`' check 3 counts the boundary rules and says **nineteen** exactly (S-078) — it becomes twenty, by
addition, in the slice that adds the rule, and `reel-stills`' journey runs again with the feature's own.

**Confirmed-by.** The owner, 2026-09-20: _"Environment, read only in providers (Recommended)"_.

---

## S-110 | 2026-09-20 | The first real reel is one reel under the $3.00 cap, and is made as cheap as the decisions allow

**Chose.** The paid path's first real run is **one reel**, under **BUDGET.md's $3.00 per-reel cap unchanged**
(D-014, D-100), with **the caller's ceiling set lower than the cap** for that run, and every lever that does not
break a decision pulled towards cheap:

- **The plan's 4-shot side of the `shotCount` axis** where Gate 0 admits it (D-112, S-111's run is a caller's
  request like any other), and **5-second clips**, the provider's floor (D-019's `duration` 5..15).
- **The cheapest admitted image entry as the configured default for that run** — `flux-2-pro/edit` at about $0.03,
  of D-028's four admitted entries. **This does not settle D-028's open default** (O-4 / C-8, the bake-off): it is a
  setting for one run, and the entry is chosen because it is cheapest, not because it is best.
- **Narration and every model call are token-plan covered** (D-019's spike: T2A `speech-2.8-hd` and all three text
  models answered on the owner's plan), so the marginal cost of a first reel is **its images and its clips**: about
  4 × $0.03 + 6 × 5 s × $0.04 = **$1.32** at the budgeting rates, against a $3.00 cap.
- **768P stays, always** (D-007). 480P exists in the schema and is not taken: the resolution is hard-locked, and
  `reel-stills`' and `reel-render`'s receipts are asserted against it.
- **The observed rate is read from the provider and written into BUDGET.md** after the first paid clip — D-007's
  and BUDGET.md's own open item (Q9), which no session has been able to close because nothing had ever made a paid
  call.

**Why.** The owner asked for one reel, at $3.00 at most, _"but try to keep it even cheaper"_. Every cheapening
above is a lever the decisions already allow; none of them weakens a gate, changes a resolution or drops a check.
The cap is not lowered in `BUDGET.md` — that file is the steering repository's authority, read through the pin — so
the run is bounded by the caller's ceiling instead, which is what a ceiling is for (D-100).

**Rejected.** **480P for the first run** — D-007 hard-locks 768P and two verified features assert it. **Lowering the
$3.00 cap** — it lives in the pinned steering repository, and this repository does not edit it (D-115, S-017).
**A shorter reel than Gate 0 admits** — Gate 0's 35–45 seconds is D-111's setting, and a run that dodges it is not
the engine's path. **Skipping the rate read** — the estimate would stay a guess after money had been spent.

**Caught by.** The paid-path feature's checks: the run's own receipts totalling under the ceiling; every video
receipt carrying `768P`; and the journal entry recording what the dashboard said against what the receipts say.

**Confirmed-by.** The owner, 2026-09-20: _"One reel, $3 cap max, but try to keep it even cheaper"_. **Open, and
owed by the owner before the first paid call:** fal credit, which the MiniMax token plan does not cover (D-007).

---

## S-111 | 2026-09-20 | A real adapter is proven against recorded wire in the suite, and by one hand-run reel outside it

**Chose.** **No test calls a provider.** Every real adapter is tested in the suite against **recorded responses** —
the bodies a real call returned, saved as fixtures with D-022's redaction already applied — covering what it parses,
what it downloads, what it records, and **which failures it turns into `unavailable` and which it throws** (S-096).
The adapter is handed its transport, so a fixture is served without a network.

- **One script, run by hand, makes a real reel**: `scripts/real-reel.mjs`, outside `tests/`, which starts the engine
  with the real adapters named (S-108), submits one request and prints what it spent. **It is never run by
  `check.mjs`, by a journey or by any test**, and `tests/` holds a check that no test file names it.
- **The evidence of a real run is its receipts and the journal**, as every other claim in this repository is: the
  run's rows, the file it produced, the dashboard's figure beside the receipts' — never a test asserting that a
  provider was reachable on the day the suite ran.
- **`reel-takes`' check 26 and `reel-render`'s check 50 keep their exact form**, and stay unconditional: with every
  default `'fake'` (S-108) the child needs no key, and the suite is still $0.

**Why.** The owner chose it. Gate 1 of every feature verified so far says nothing may cost money, read a secret or
reach out of this machine, and two checks prove it by running the whole journey with PATH alone; a test that calls a
provider would make those checks false or conditional, and a conditional check reads as coverage while proving
nothing. What a recorded response cannot prove — that the endpoint still exists and still answers this shape — a
hand-run reel proves once, with its evidence written down, which is what D-018 and D-019 already did with spikes.

**Rejected.** **A live smoke test behind an environment flag** — skipped when the flag is absent, and a skipped test
reads as coverage; `reel-takes`' check 26 asserts zero skipped for exactly that reason. **Always-on live tests** —
every suite run spends money and needs a key, which contradicts four verified features' Gate 1. **No real run at
all** — recorded wire proves the parser, never the provider; the engine would claim a paid path it had never used.

**Caught by.** The paid-path feature's checks: the recorded-wire tests themselves; a check that no test file, and
no `check.mjs` step, names the real-reel script; and checks 26 and 50, unchanged, still green.

**Confirmed-by.** The owner, 2026-09-20: _"Recorded wire, plus one manual real run (Recommended)"_.

---

## S-112 | 2026-09-20 | The real sensor measures with ffmpeg, and reads text with one vision call

**Chose.** The real `PictureSensorPort` (`packages/providers/src/ffmpeg/sensors.ts`) is **local and free**, built on
the one real tool this repository already requires (S-075):

- **`sharpness`** from ffmpeg's **`blurdetect`**, **`brightness`** from **`signalstats`**, **`similarity`** from
  **`ssim`** over the two pictures — each mapped into the range `PictureMeasure` declares (0..1, and -1..1 for the
  cosine), and `readable: false` for a file ffprobe does not read as a picture (S-050's naming, S-044's ranges).
- **`readText` is one vision call through the `LanguageModelPort`** the adapter is composed with, asking what text
  is visible in the picture, and its strings are the answer. **A failed call throws**; it never answers "no text".

**Why.** Gate 1's four steps include a text step (D-042), and a sensor that cannot read text would have to answer
"none" always — **a gate that always passes, which is weakening a check to make it buildable**, forbidden here.
**This ffmpeg has no `ocr` filter and no tesseract**: checked on this machine on 2026-09-20, `ffmpeg -filters` lists
`blurdetect`, `signalstats` and `ssim` and no `ocr`, and `-buildconf` names no tesseract. Of the two ways left — a
new machine dependency, or a call to the model the engine already uses to look at pictures — the second adds
nothing to install, is covered by the owner's token plan (D-019), and uses the model D-006 already routes every
seeing call to. The three measures stay local because ffmpeg can do them exactly and a model cannot do them
repeatably.

**Rejected.** **Tesseract, or an ffmpeg built with it** — a second tool on PATH, which S-075's whole point is to
keep to one, and nothing installs tools here. **A new npm image library (`sharp`)** — a native dependency for three
numbers ffmpeg already computes. **A sensor that answers no text** — a gate that cannot fail. **Every measure by
model call** — unrepeatable numbers where a filter gives exact ones, and four paid calls a picture where zero will do.

**Caught by.** The paid-path feature's checks 18 and 19: each measure in its range from a real file, an unreadable
file measuring unreadable with no model call, and the text step's strings coming from the vision call, with a failed
call throwing.

---

## S-113 | 2026-09-20 | A real job's lease is set from the adapters it was given, with a floor, and one worker runs

**Chose.** A real clip takes minutes where a stand-in takes milliseconds, and **nothing renews a lease** (D-002,
`reel-takes`' known limit 14). So:

- **The service sets `leaseMs` from the adapters it was told to build**, and **refuses to start when any real
  adapter is named and the lease is below a floor** that covers the longest job a real run can make — a clips job of
  six shots at up to three takes each, every take a real clip, plus their narrations. The floor is a setting with a
  declared default, and **its figure is measured on the first real run, not guessed** (S-110).
- **The service starts exactly one worker.** With one poller, no second claim exists to take a job whose lease ran
  out while it was still alive.
- **Lease renewal is deferred**, named in the feature's deferral list: a heartbeat extending a live job's lease is
  what a second worker would need, and nothing here runs two.

**Why.** Under checkpoints a second attempt keeps every finished narration and decided take (S-092) but **pays again
for the take in flight** — so an expired lease on a real run is a real, silent, repeated charge, which is exactly
what D-014's _"never silently overspends"_ forbids. A long lease costs only the time a genuinely dead worker's job
waits; a short one costs money. One worker makes the race impossible rather than unlikely, which is the same shape
as every other structural rule here (S-021, I-18).

**Rejected.** **Leaving the 60-second default** — the first real clips job would outlive it and be claimed again.
**A heartbeat now** — the honest fix, and a change to `domain`'s claim and `worker`'s loop for a fleet that does not
exist; it is deferred, not denied. **Letting the worker extend its own lease implicitly by finishing** — a lease is
read by whoever claims, not by whoever holds. **Running several workers for speed** — one job at a time is D-002's
design and the per-reel cap's reading is per chain; concurrency is its own feature.

**Caught by.** The paid-path feature's check 17: a service given a real adapter and a short lease refuses to start,
naming the figure, and one worker is started.

---

## S-114 | 2026-09-20 | The engine speaks each provider's wire itself, with `fetch` and `zod`; no model SDK, and no vendor client unless one is earned

**Chose.** **No provider SDK is installed in this repository.** Every real adapter in `packages/providers` makes its
calls with the platform's `fetch` and parses what comes back with `zod`:

- **The model adapter** posts to MiniMax's **OpenAI-compatible `/v1/chat/completions`** — the wire D-019 verified
  live for all three models — asking for its schema through `response_format`, and carrying a picture or a clip as a
  content part for the seeing calls. It **strips the `<think>…</think>` block before parsing**, budgets `max_tokens`
  on top of reasoning, and records `usage`, including `reasoning_tokens` and `cached_tokens` where the model reports
  them (D-006, D-019).
- **The image and video adapters** drive fal's queue themselves: submit to `queue.fal.run/<slug>`, poll status, fetch
  the result, **download the file under the artifact root** (D-086) and record the local path, never the provider's
  URL (D-022).
- **Every adapter is handed its transport** — a `fetch` and a base URL, each a setting with the provider's own as
  its default — so a recorded response is served without a network (S-111), which is how these adapters are tested.

**One escape hatch, named and conditioned.** `@fal-ai/client` may be adopted **for fal only, inside
`packages/providers` only**, **if and only if** driving fal's **storage upload** by hand — the step that gets a
local reference picture to a URL fal can fetch — proves fragile or undocumented in Slice 5. Adopting it is a new
S-entry recording what was measured, and it changes nothing else: the download, the error classification and the
receipts stay the engine's, and its own retry is disabled so it can never shadow S-096's counter.

**Supersedes D-005**, on _"`ai` (Apache-2.0) for every model call"_ and on its `Confirmed-by` _"a test asserts no
provider SDK is imported outside `packages/providers`"_ — **for this engine**. D-005's other clauses stand
unchanged: orchestration is the job table and not an agent framework (D-002), and every model call writes a
`model_receipt`. **D-005 continues to bind KnowScroll's side**, where the research episode lives (D-066, D-076,
D-096), and this entry says nothing about it. **`model-client-only-in-providers` stays**, and gains S-114 beside
D-005 in its comment: a rule forbidding a model client outside `packages/providers` is still true, and is now also
what keeps one from being reintroduced anywhere.

**Why.** **The one thing D-005 bought is not in this engine.** Its reason was _"a state machine with schema-shaped
model calls between the states and exactly one bounded tool loop"_ — and **the tool loop is the research episode**,
which belongs to KnowScroll (D-096: the engine receives derived criteria and opaque claim ids, and never searches).
What is left here is four single structured calls — planner, witness `observe`, reconciler, `judgeCut` — with no
tools, no streaming and no UI.

**The harness the SDK would bring already exists here, and a second copy would fight it.** Receipts are
`recordingPort`'s, the budget refusal before every send is S-087's, and the transient retry with backoff is S-096's,
on its own counter, which D-024 says must never share with the take counter. An SDK's own retry would have to be
disabled to be safe, which is a dependency carried for the parts we turn off.

**D-019's findings want the raw wire.** Every model in the family emits a reasoning block, and a call whose budget
is spent inside it returns nothing at all — the failure that reads as a schema error and is not one. Handling that,
and recording reasoning tokens, is easier at the wire than through a layer designed to hide it.

**And the cost of not having it is small and known**: `packages/providers` has **zero npm dependencies today**, and
`ai`/`@ai-sdk/*` are installed nowhere in this repository — nothing imports them, so nothing is rewritten. What we
write instead is request shaping, timeouts on `AbortSignal`, and response parsing we would have written schemas for
anyway.

**Rejected.** **The `openai` client with its `baseURL` pointed at MiniMax** — typed messages and a maintained
transport, at the price of the first dependency tree in `providers`, types that do not carry MiniMax's extra fields,
and a retry policy that must be set to zero to keep S-096 the only one. **`@ai-sdk/openai-compatible`** — the thin
slice of D-005, still abstracting the reasoning block D-019 says to handle by hand. **Keeping the AI SDK whole** —
the owner declined it, and the tool loop that justified it is another repository's. **`@fal-ai/client` adopted up
front** — a dependency taken before the endpoint it would save us from has been tried once.

**Caught by.** `model-client-only-in-providers`, unchanged, with its `--prove` violation; the paid-path feature's
checks 6 to 8 and 14 to 16, each against a recorded response served to an injected transport; and the absence of any
`ai`, `@ai-sdk/*` or `openai` entry in every `package.json`, which a check reads.

**Confirmed-by.** The owner, 2026-09-20: asked why the AI SDK was wanted and what the better alternatives were, then
chose _"Plain fetch + zod (Recommended)"_ for the model wire and _"Decide in Slice 5, from the wire (Recommended)"_
for fal's.

---

## S-115 | 2026-09-20 | Shots stay sequential through the paid path; D-023's parallel gain is unbuilt, named, and planned for after the first real reel

**Chose.** The paid path builds **nothing concurrent**. A run keeps the order every verified feature was built and
checked against: one worker, one job at a time (D-002); each shot in plan order, its narration measured before its
own clip is asked for (S-070); each shot's ladder finished before the next shot's begins (S-057); every take's
verdicts in shot and take order (S-069, S-094, S-092).

**D-023's third gain — _"Independent shots generate in parallel, which is the only latency lever available"_ — is
NOT built, and never has been.** It sits in that decision's **Why**, supporting its binding choice, which is the
**unit** of generation: shots of 5–15 s, joined by cuts, never one long clip. That choice is honoured in full. The
latency lever is not, and this entry is what stops _"we decided parallel shots"_ from being read as _"the engine
generates shots in parallel"_.

**A `parallel-shots` feature follows the first real reel**, planned against measured figures rather than guesses,
and it owns the three things concurrency actually costs here:

1. **The budget guard races.** The chain's spend is read before every call and every send, and compared with the cap
   and then the ceiling (S-059, S-087, S-095). Two concurrent takes can each pass that read and together breach the
   cap. Concurrency needs a reservation, or a serialized guard — a change to the mechanism that makes an overspend
   structurally impossible, which is why it is not done casually.
2. **Event order is asserted by name, everywhere.** `reel-takes`' checks 8, 21, 22 and 25 and `reel-render`'s 47 type
   whole event lists by hand, and dozens of checks assert exact call sequences. Parallel shots interleave them, so
   the stage would have to buffer per shot and emit in plan order — and every journey re-runs (S-099's form).
3. **The provider's own limits and this machine's.** Concurrent fal jobs meet rate limits, which arrive as
   `unavailable` and back off (S-096), giving some of the win back; and every take runs ffmpeg probes and scans
   beside the others (S-107 measured what the suite already costs in memory).

**Why.** The owner's goal is a real reel, and the first paid run is the first time any of this repository's cost and
latency figures stop being estimates — **the price has never been read** (D-007's open Q9) and **the latency has
never been measured at all**. Changing the guard and the event ordering in the same feature that first spends money
would mean a failure could be the provider, the guard or the ordering, with no earlier run to compare against.
D-023's own reason for the lever — per-call latency is not controllable — is as true after one sequential reel as
before it, and the feature is cheaper to plan once its numbers exist.

**Rejected.** **Concurrency inside the paid path** — the first paid run and a rewrite of the budget guard landing
together, against checks that assert the order it would change. **Declaring sequential permanent** — it gives up the
only latency lever D-023 found, on no measurement; a 4–6 shot reel at minutes a clip is the case that decides it.
**Parallelising only the stills stage** — S-057 chose its order deliberately, for the repair-next-to-its-verdict
reading, and four image calls are seconds, not minutes: the wrong place for the lever.

**Caught by.** `paid-path`'s checks, which assert sequential call order as every verified feature already does; its
deferred list, which names this entry; and the `parallel-shots` feature's own gates, which cannot be written until
Slice 8 has produced a measured run.

**Confirmed-by.** The owner, 2026-09-20, asked whether parallel shots were already decided and chose _"After the
first real reel (Recommended)"_.

---

## S-116 | 2026-09-20 | The stand-ins answer from one script file the service names, and without one the engine still behaves exactly as it always has

**Chose.** A seventh setting, `CUTROOM_STAND_IN_SCRIPT`, names a JSON file the stand-ins answer from. Its shape is
`StandInScripts` in `packages/providers` — `model`, `images`, `sensors`, `video`, `narration`, `media`, each optional
— which is the same set `tests/engine/worker-process.ts` has passed on standard input since `reel-plan`'s Slice 3.
**The setting absent is an empty script for every port**, so a service started plainly is byte-for-byte the behaviour
every verified feature runs on.

- **It exists because the stand-in model is the one stand-in that cannot work without a script.** `fakeModel` answers
  from its script and throws `the stand-in's script has no answer for <role> call <n>` when it runs out — deliberately,
  since a canned answer would make a plan the pipeline never planned. Every other stand-in has a working default: a
  readable 9:16 picture, a clip, a voice, a measurement. So **an engine whose model port is the stand-in cannot finish
  a reel at all** without this, and check 1 — the service completing a video run as a process — could not hold.
- **It is a path, in D-086's form**: one setting, no absolute path written, and no default, because the free path
  needs no such file.
- **The service reads it and hands it to the factories.** No stage, no gate and no table learns a script exists.

**Why.** Check 1 asks a plainly-started service to complete a video run over HTTP, and Gate 2's list of what the
service settles had six settings and no script. Building the program showed the check could not hold as written.
Making it hold takes one setting whose default changes nothing, which is strictly less than changing what the stand-in
model does or what check 1 asserts.

**Rejected.** **A canned default answer in `fakeModel`** — it would break every check that rests on an exhausted
script failing (reel-plan's own, and every `throws` fixture), which is weakening tests to reach green. **A demo script
shipped inside `packages/providers`** — a fixture in production code that matches exactly one request's sentences and
criteria, so any other brief still dies at the first model call. **The script inline in the setting** — a whole
fixture in an environment variable, with nothing on disk to read back when a run goes wrong. **Dropping "completes a
video run" from check 1** — the assertion that the program works at all.

**Caught by.** `paid-path`'s check 1, which is the only thing that uses it: a service started without the setting and
asked for a reel fails at its first model call, and the check names the script file it was given. And the default
staying `{}` is what keeps every other test of the suite unchanged — 354 tests passed before this entry and 363 after
it, none of them edited.

---

## S-117 | 2026-09-20 | The one read of a key lands in `paid-path`'s Slice 1, because check 2 cannot hold without it; the twentieth rule stays in Slice 2

**Chose.** `packages/providers/src/env.ts` — S-109's **only read of a key**, one function per key name — is written in
Slice 1 rather than Slice 2. Nothing else moves: `keys-only-in-providers`, its `drift --prove` violation,
`reel-stills`' check 3 counting twenty, the fixture guard and the recorded-wire harness are all still Slice 2's, and
the rule count is still nineteen until then.

**Why.** Gate 3's check 2 says a named real adapter **whose key is absent** refuses to start, and Gate 4 proves check
2 in Slice 1 — while assigning the only file allowed to look at a key to Slice 2. A slice cannot check for a missing
key with no way to look for one, so as written the two gates contradict each other. The options were to move one file
forward or to write a check whose words say something its test does not, for six slices. **Add, never subtract**: the
file moves.

**What it costs, stated plainly.** For one slice a key is read with no boundary rule holding that read. It is a small
window: no real adapter exists yet, so nothing uses a key for anything but refusing; no test needs one; and `env.ts`
is 30 lines that return a key or `undefined` and never log, throw with, or persist one.

**Rejected.** **Refusing a real adapter as "not built yet" and re-aiming the test in Slice 3** — check 2 would read as
proven while proving something else, which is the state `drift --audit` exists to prevent in rules and is no better in
checks. **Moving check 2's key case to Slice 2** — editing an approved gate's slice assignment, for a worse reason
than this one.

**Caught by.** `paid-path`'s check 2: a service told `minimax` or `fal` with no `MINIMAX_API_KEY` or `FAL_KEY` refuses
before its database is opened, naming the port and the key — and a key set to white space refuses the same way, since
a variable set to nothing is the same absence as one never set. Slice 2's check 4 then adds the rule that keeps the
read where it is.

**Confirmed-by.** The owner, 2026-09-20, asked how Slice 1 should resolve the contradiction and chose _"Move env.ts
into Slice 1 (Recommended)"_.

---

## S-118 | 2026-09-20 | The service stops on SIGINT or on a `stop` line, one shutdown for both, because Windows delivers no signal to a child

**Chose.** `startService` registers **one** shutdown function and wires SIGINT to it; `apps/service/src/main.ts` wires
a `stop` line on standard input to the same one. Check 5 is proven in two tests: **a real process, stopped over
standard input**, asserting the API refuses connections, no job is left running and the process **exits by itself**
with code 0 — nothing calls `process.exit`, so a leaked timer, socket or database handle fails it; and **an
in-process service**, asserting it registered exactly one SIGINT handler, that calling that handler — the one the
operating system would call — closes the API and stops the worker, and that a stopped service leaves no handler
behind.

**Why.** Measured on this machine, 2026-09-20: **no signal can be delivered to a spawned child on Windows.**
`child.kill('SIGINT')`, `'SIGBREAK'`, `'SIGTERM'` and `'SIGHUP'` each terminate the child outright — it exits with
`code: null` and a signal, and a handler registered for that signal never runs and prints nothing. So a test that
sends SIGINT proves nothing here except that the process died. What is left unproven is OS signal delivery, which
nothing on this machine can prove; what is proven is that the shutdown SIGINT is wired to is the shutdown that works.

**Rejected.** **Delivering a real Ctrl+C through PowerShell** — `AttachConsole` plus `GenerateConsoleCtrlEvent` is the
only way to send one, and it means a P/Invoke inside the suite, a console window per run, and a test whose result
depends on which process the console is attached to. **Proving check 5 in-process only** — it drops "exits without an
open handle", which is the half that catches a leaked handle, and that is the half a composition root gets wrong.
**Leaving check 5 unproven and calling it a known limit** — a check that reads as covered and is not.

**Caught by.** `paid-path`'s check 5, both tests. The stdin path is not a second shutdown: it calls `service.stop()`,
the same function SIGINT calls, so a change that broke one would break the other.

**Confirmed-by.** The owner, 2026-09-20, shown the measurement, chose _"Stop on SIGINT or a stdin line, one function
(Recommended)"_.

---

## S-119 | 2026-09-20 | `keys-only-in-providers` is carried by two mechanisms under one name, because no rule that resolves imports can see a key being read

**Chose.** The twentieth boundary rule is held in **two places, both named `keys-only-in-providers`**, and
`drift --prove` builds a deliberate violation of each:

- **The config half**, in `.dependency-cruiser.cjs`: nothing outside `packages/providers/` may reach
  `packages/providers/src/env.ts` — the module that owns the read — matched **both as the resolved path and as the
  bare specifier `@cutroom/providers/env`**, which is what an import of a subpath that does not resolve looks like to
  the graph. That second alternation is `model-client-only-in-providers`' trick (S-020), and it is what makes this
  half catch something no other rule does: `no-reaching-into-internals` matches `^(apps|packages)/…` and is blind to
  a bare specifier.
- **The scan half**, in `scripts/drift.mjs`: every source file under `packages/`, `apps/`, `tests/` and `scripts/`
  is read for an environment READ — `env.NAME`, `env['NAME']`, `env[NAME]` — whose name matches a key's shape
  (`*_API_KEY`, `*_KEY`, `*_TOKEN`, `*_SECRET`), outside `packages/providers/src`. It runs on every plain
  `node scripts/drift.mjs`, beside the graph check, and **a name assigned is not a read**, so the secrets checks'
  key-shaped canary (S-028) stays legal.

**The count is twenty**, by addition: the rule name is new, so `20 rules proven to fire` — and **both**
`reel-stills`' check 3 **and `reel-render`'s check 2** assert that line (S-120).

**Why.** Gate 2 says the twentieth rule is a dependency-cruiser rule with a `--prove` violation "as it does for the
other nineteen". Building it found that unbuildable as stated, in exactly the shape CLAUDE.md already records for
D-073: **a key is read with `process.env.NAME`, a property access on a global.** There is no import, no specifier and
no edge, so no resolver will ever see one — and the only import shape that exists, a deep import of `env.ts`, is
already forbidden to everything outside providers by `no-reaching-into-internals`. A config rule alone would
therefore have read as S-109's guard while missing S-109's actual shape, which is the state `drift --audit` exists to
prevent. Two mechanisms, one name, both proven: one going quiet while the other stays green is the failure this is
built against.

**What the scan does not hold.** It is a regular expression over source, so `process.env['FAL' + '_KEY']` passes it,
as `child_process` would pass a rule written against import text. It is the same bargain every rule here makes: it
catches what someone would write, not what someone would smuggle. And it holds Gate 2's boundary — the **folder**
`packages/providers/src` — not S-109's stricter claim that `env.ts` is the only reader; inside providers that is held
by the config half and by there being nothing else that needs one.

**Rejected.** **The config rule alone** — silent on `process.env.FAL_KEY` written in `apps/worker`, which is the
violation anyone would actually write. **The scan alone, with no entry in `.dependency-cruiser.cjs`** — then "the
twentieth boundary rule" is not in the boundary config and `--audit`, which reads that config, never sees it.
**Forbidding an import of `node:process`** — `process.env` is a global and needs no import, so the rule would be
silent on every real case. **Adding a `./env` subpath export to `packages/providers` so the by-name case resolves** —
it would legitimise the deep import the rule exists to forbid, to make a test convenient.

**Caught by.** `paid-path`'s check 4, in four `caught` lines: the config half relative and by package name, and the
scan half in each of the four roots it walks. Session 37's break campaign, 19 breaks: the rule deleted, its `to.path`
renamed away, its by-name alternation removed, either half's `--prove` cases deleted, the scan's roots cut, its
subscript spelling dropped, its assignment lookahead dropped, the scan unhooked from `drift`, and a key actually read
in `apps/service` — **every one caught**, by check 4 and, where `drift` itself fails, by `reel-stills`' check 3 and
`reel-render`'s check 2 as well.

**Confirmed-by.** The owner, 2026-09-20, shown that a resolver cannot see a key read, chose _"Config rule + a key
scan, one name (Recommended)"_.

---

## S-120 | 2026-09-20 | `paid-path`'s check 3 moves to Slice 3, and `reel-render`'s check 2 joins the list of what this feature changes

**Chose.** Two corrections to an approved Gate 4, both by moving nothing but where a check is proven:

- **Check 3 — a key reaching its adapter and appearing nowhere — is proven in Slice 3**, beside the MiniMax model
  adapter it needs. Slice 2 proves **4 and 21**; Slice 3 proves **3, 6, 7 and 8**. Every check still appears in
  exactly one slice: 2 + 4 + 3 + 2 + 3 + 4 + 2 + 2 = 22.
- **`reel-render`'s check 2 also asserts `N rules proven to fire`** and becomes twenty with `reel-stills`' check 3.
  The feature's _What this feature changes in verified features_ section named only `reel-stills`; it names both now.
  `reel-render`'s journey was already being re-run in Slice 8, so nothing else moves.

**Why.** The gate review's own finding 4 said check 3 "could not fail as written" against stand-ins and fixed it by
pointing it at a real adapter — and Gate 4 then left it in the slice **before** the first real adapter exists. A
stand-in reads no key, so in Slice 2 check 3 is a check that cannot fail; S-117 refused that state a slice ago and it
is refused here. The alternative was to pull the model adapter back into Slice 2, which is a whole slice of work
moved to keep one check number in place.

The second is the same miss for the third time: S-049 found it in S-047, S-078 found it in S-077, and this feature's
own changes-to-verified-features list carried it again. A test now asserts **both** files count twenty, so a session
that updates one and forgets the other fails a named check rather than the suite.

**Rejected.** **Splitting check 3 in two, proving the environment-file half in Slice 2** — for one slice check 3
would read as proven while proving half of what its words say, which is the state `drift --audit` exists to prevent
in rules and is no better in checks. **Leaving `reel-render`'s check 2 to be found by a red suite in Slice 8** — it
was found by a red suite in THIS slice, and a count that two features pin is a fact worth asserting rather than
rediscovering.

**Caught by.** `paid-path`'s check 4's last test, which reads both `tests/reel-stills-rules.test.ts` and
`tests/reel-render-rules.test.ts` and fails if either still says nineteen — session 37's breaks k12 and k13, each
caught. And Slice 3's check 3, which is where a key now has an adapter to reach.

**Confirmed-by.** The owner, 2026-09-20, asked where check 3 goes and chose _"Move check 3 to Slice 3
(Recommended)"_.

---

## S-121 | 2026-09-20 | Check 3's completed run is a PLAN run through the service as a process, served recorded wire by a loopback HTTP server

**Chose.** Check 3 — _"the service loads its environment from the file its setting names; a key in that
file reaches its adapter and appears in no row, receipt, event, question, log line or fault message of a
completed run"_ — is proven in this arrangement, and every part of it is load-bearing:

- **The service as a PROCESS**, started the way a person starts it (`tests/engine/service.ts`), with
  `CUTROOM_PROVIDER_MODEL=minimax` and **the key only in the environment file** the `CUTROOM_ENV_FILE`
  setting names. The process is started without the key in its own environment, so a service that ignored
  the file it was pointed at could not make a call at all — which is what makes the first clause an
  assertion rather than a description.
- **A loopback HTTP server the test starts**, `wireServer` in `tests/engine/wire.ts`, serving the same
  fixtures `recordedFetch` serves, through the same matcher. The service's adapter is pointed at it by a
  new setting, **`CUTROOM_MINIMAX_BASE_URL`**, which is Gate 2's _"every real adapter takes its
  transport — a `fetch` and a base URL, each a setting defaulting to the provider's own"_. A `fetch` is a
  function and cannot be written into an environment; a base URL can, and loopback is what D-098 already
  allows.
- **Every other port a stand-in**, and the run is a **plan run** — `until: 'plan'`, the eight sentences
  `tests/engine/plans.ts` submits. The two groupings make **exactly two planner calls**: the 4-unit fork
  passes Gate 0 and the 6-unit fork is 50 seconds and fails it, so one fork survives, nothing is scored,
  and no other port is ever reached. Two calls, two recorded answers, and a completed run.
- **The hunt is exhaustive and reads the machine, not a list**: every table in `sqlite_master`, every row
  of each, the events, the caller's answer, everything the process wrote to stdout and stderr, and **every
  file under the service's folder as bytes except the environment file itself** — so a key written into
  the database and deleted is still caught, because the bytes are still there.
- **A second test for the fault clause**, since a completed run has no fault: the same service, wire whose
  second answer is a 401, a run that ends `failed`, and the same hunt over its detail, its events, its
  rows and its files.

**Why.** The gate review's finding 4 fixed check 3 by pointing it at a real adapter, because a stand-in
reads no key and the assertion had nothing to bite on. That leaves one mechanical problem: **a recorded
`fetch` lives in the test's process and the service lives in its own**, so something has to cross the
boundary. A base URL crosses it; a function does not.

A **plan** run rather than a video one is the smallest arrangement in which every clause is true. Check 1
already proves a whole video run through the service, and repeating it here would buy nothing but thirty
recorded model answers, each of which would have to be a valid gate answer — a fixture folder that is
really the stand-in's script wearing a wire's envelope. Two genuine recorded bodies prove more.

**Rejected.** **A recorded `fetch` handed to an in-process `startService`** — it needs no server and no
setting, and it drops the one thing check 3 is about: a key read from a file by a program, which an
in-process call supplies from the test's own environment. **A stub provider process** — a second program
to keep true. **Pointing the adapter at a file URL** — `fetch` reads `file:` in no runtime we target, and
it would prove nothing about a header. **A full video run on recorded wire** — every stills and clips
answer becomes a fixture, and check 1 already covers the shape.

**Caught by.** `paid-path`'s check 3, in `tests/paid-path-secrets.test.ts`, in two tests. Session 38's
break campaign: the key sent in no header, the key written into a receipt, a row, a log line and a fault
message, the environment file ignored, and the base-URL setting ignored — each caught.

**Confirmed-by.** `PROMPTS/038-paid-path-slice-3.md` asks the session to decide this and write it down;
the loopback server is the shape the prompt calls obvious, and the plan-run part is this session's.

---

## S-122 | 2026-09-20 | What the MiniMax model adapter sends: the wire D-019 verified, no unverified switch for thinking, and a budget that names itself

**Chose.** Four things about the first real adapter, each between real alternatives:

- **The path is `POST /v1/chat/completions`**, which is the wire D-019's spike ran live on 2026-09-03 —
  `steering-ref/scripts/spikes/minimax-text.mjs` posts to exactly that URL and all three models answered
  200 with usage. S-114 names it. **Slice 2's two chat fixtures recorded `/v1/text/chatcompletion_v2`
  instead, and they are corrected**: MiniMax documents both, but only one of them has ever been shown to
  answer, and a fixture is a record of what happened.
- **Thinking is NOT switched off**, because nothing has verified a field that switches it off on this
  wire. Gate 2 says _"disables thinking where the wire allows it"_; the spike sent `model`, `messages`,
  `max_tokens` and `temperature` and nothing else, and an unverified field on the first paid call is the
  404 lesson D-019 records. What carries D-019's finding instead is the pair that was verified: **the
  reasoning prefix is stripped before anything is parsed**, and **`max_tokens` is the answer's budget plus
  a reasoning budget on top** — 2048 and 4096, the larger for reasoning, because a budget never reached
  costs nothing and a budget exhausted inside the block returns an empty string rather than an error.
- **A call consumed by reasoning fails naming the budget**: what it spent, what it was given, and the
  words _"This is the token budget, not the answer's shape"_. D-019: _"A schema call that 'returns
  nothing' will be this, not a schema failure."_
- **The classification is carried by the error's TYPE** — `Unavailable`, exported from
  `packages/providers/src/transient.ts` — because `LanguageModelPort`'s four calls return
  `{ value, receipt }` and have no `unavailable` arm, and nothing wraps the model port with retry.
  429, 5xx, 408, a connection error and the adapter's own timeout throw `Unavailable`; 400, 401, 403, a
  body that is not JSON, a body that is not this wire, and a `base_resp` code that is not 1002 throw a
  plain `Error`. **The adapter only classifies**: it never sends again, waits or counts.

**Why.** S-096 rejected _"a thrown error carrying a marker"_ for the video and narration ports, because the
worker would have recognised a transient by an error's **shape** and a thrown bug of the same shape would
have been sent again. A class is not a shape: nothing else constructs `Unavailable`, so no bug produces
one, and no code reads a message to decide what happened. S-096 also says plainly that a thrown model call
fails the run _"until the paid-path feature builds the adapters that fail transiently"_ — this slice builds
the classification, and the sending is whatever first needs it.

The receipt records **the model the call was routed to**, from the table in settings, not the one the
response names: the receipt is the record of what the engine asked for, and D-006's routing is the thing a
check can hold it to.

**Rejected.** **`unavailable` as an arm on `LanguageModelPort`**, with a guarded model port in
`apps/worker` — the full S-096 shape, and it rewrites the port in `packages/contracts`, the stand-in and
every call site in `packages/pipeline`, touching four verified features, in a slice whose Gate 4 line is
_"the transient classification"_. **A pure `classify()` the adapter never uses** — then the classification
is provable only by calling the classifier, which is the state `drift --audit` exists to prevent in rules.
**Sending a disable field anyway** — an unverified field, on the one call that spends. **Keeping the
`/v1/text/chatcompletion_v2` fixtures** — a fixture that records a path nothing ever answered on is worse
than no fixture.

**Caught by.** `paid-path`'s checks 6, 7 and 8 in `tests/paid-path-model.test.ts`: the path and the budget
on the request, the strip, the budget's own failure message, the receipt, D-006's routing read from a table
the test replaces, and each wire case classified by the class it throws. Session 38's break campaign: the
`<think>` block kept, a reasoning-exhausted call reported as a schema failure, the routing hardcoded, 429
thrown, 400 answered unavailable, `fake` left true — each caught.

**Confirmed-by.** The owner, 2026-09-20, shown that the model port has no `unavailable` arm and nothing
retries a model call, chose _"A typed error, carrying the classification"_. The rest is this session's,
recorded here because each is a choice a later session would otherwise have to re-make.

---

## S-123 | 2026-09-20 | The narration adapter ANSWERS `unavailable` where the model adapter throws it; T2A shares the model's base URL; and a transient on the timings fetch re-buys the audio, named

**Chose.** Five things about the second real adapter, each between real alternatives:

- **The classification is carried by the PORT'S OWN ARM, not by a thrown type.** `NarrationAnswer`
  has `{ kind: 'unavailable'; detail }` — S-096 built it, `reel-takes` verified it, and the
  worker's guarded narration port is what sends the call again, with backoff, on the transient
  counter that is never the take counter. So 429, 5xx, a `base_resp` of 1002, a connection error
  and the adapter's own timeout are **answered**; 400, 401, 403, a body that is not JSON, a body
  that is not this wire and every other `base_resp` code **throw** a plain `Error`. The split is
  the model adapter's exactly (S-122); only the carrier differs, and it differs because the ports
  do. **The adapter still only classifies**: it never sends again, waits or counts.
- **T2A shares `CUTROOM_MINIMAX_BASE_URL`.** One provider, one host — D-019's spike posted to
  `https://api.minimax.io/v1/t2a_v2` and to `https://api.minimax.io/v1/chat/completions`, on one
  key — so one setting points both, and `MINIMAX_BASE_URL`, `base_resp`, the transient code and
  the body summariser move into `packages/providers/src/minimax/wire.ts`, which both adapters read.
- **A transient on the SECOND call is answered `unavailable` like any other, AND THE AUDIO IS
  BOUGHT AGAIN.** The guarded port sends the whole `speak` again, so a 429 on the timings fetch
  costs one more audio call. This is a **named limit, not an oversight**: an adapter may not retry
  a call of its own (S-096, S-122), T2A is covered by the owner's token plan so the second buy
  costs nothing today (D-019, S-110), and Slice 8 measures it against the provider's own figures.
  A test asserts the adapter did not send the audio call again itself.
- **The subtitle body's shape is documented and has never been seen here, and a body that is not
  it throws.** The spike recorded that a subtitle URL came back and withheld the URL, so nothing
  in this repository has read what is behind one. **One entry becomes one word timing, trimmed,
  and nothing is split**: an entry holding a whole sentence is passed on as it arrived and fails
  S-070's parse at the stage's boundary, which is the boundary that owns that question (S-042).
  Slice 8's hand-run reel is what verifies the shape.
- **Check 9's words gain the classification, by addition.** Gate 2's _"What is transient, and what
  is a fault"_ binds both providers, and neither check 9 nor check 10 named it — so the one thing
  this slice builds beyond the request and the dropped URL had nothing whose words promised to
  catch it, which is the state session 37 found check 3 in. Check 9 now ends _"and 429, 5xx, a
  connection error and a timeout are answered unavailable while 400, 401 and a body that does not
  parse throw"_. Nothing is removed, the check count stays **22**, and Slice 4 still proves 9 and 10.

**The correction, because it is a fact and not a preference.** Slice 2's T2A fixture put
`subtitle_file` at the top level of the body. **The spike read it at `data.subtitle_file`** —
`steering-ref/scripts/spikes/minimax-t2a.mjs` reads `r.json.data.subtitle_file ?? r.json.data.subtitle`,
and `spike-results.json` records `hasSubtitle: true` with the host it came from, so that read
found something. The fixture now carries the field where the spike found it and the host
`spike-results.json` records. This is session 38's `/v1/chat/completions` correction again, in the
same shape: a fixture is a record of what happened.

**Why.** **Throwing `Unavailable` from this adapter would leave a verified mechanism unreachable
for the one adapter that can use it.** S-122 made the model's classification a thrown type for one
stated reason — `LanguageModelPort`'s four calls return `{ value, receipt }` and have no
`unavailable` arm, and nothing wraps the model port with retry. Neither clause is true here: the
arm exists, and `apps/worker/src/narration-port.ts` reads it. A thrown `Unavailable` would
propagate past `sentUntilAvailable`, fail the run on a 429, and leave S-096's backoff and its
transient counter dead code behind a real adapter — a silent weakening, which is the one thing
CLAUDE.md forbids absolutely.

**A second base-URL setting would be a second thing to keep true.** Two settings for one host make
it possible to point half of one provider at recorded wire and the other half at the internet,
which is a way for a suite to reach the network by accident — the failure S-111 exists to prevent.

**Rejected.** **Throwing `Unavailable` for symmetry with the model adapter** — above; symmetry
between two ports that differ is not a virtue. **`CUTROOM_MINIMAX_T2A_BASE_URL`** — above.
**Retrying the subtitle fetch inside the adapter** — it makes the adapter count, which S-096 puts
in one place and D-024 says must never be two. **Throwing on a transient timings fetch** — a
hiccup at the provider's storage would kill a reel after every earlier shot had been paid for,
which is what S-096 built the transient path to prevent; the owner was shown both and chose the
answer with the re-buy named. **Splitting a multi-word subtitle entry across its own span** — it
invents the milliseconds inside it, and captions are burned from these timings (D-008, S-073).
**Accepting the subtitle body in more than one shape** — a shape nothing has verified, accepted
silently, is worse than one that fails loudly on the hand-run that would have found it.
**Changing `DEFAULT_RENDER_SETTINGS.voice` from `'stand-in'`** — it is a fourth change to a
verified feature, and this feature's _"What this feature changes in verified features"_ says
"Nothing else". Naming a real voice belongs to Slice 8, with the run that needs one.

**Caught by.** `paid-path`'s checks 9 and 10 in `tests/paid-path-narration.test.ts`: the request's
path, model, `subtitle_enable`, voice and audio settings; the audio written under the artifact
root and never carried as bytes; the timings run through `wordTimings`, the stage's own parser;
the code points; each wire case classified by the arm or the throw it produces, including one on
the second call; and the presigned sweep. Session 39's break campaign.

**Confirmed-by.** The owner, 2026-09-20, shown that Gate 2 binds both providers while no check
named the classification, chose _"Extend check 9's words, by addition"_; and shown that a
transient on the timings fetch re-buys the audio, chose _"Answer unavailable; name the re-buy as a
limit"_. The rest is this session's, recorded here because each is a choice a later session would
otherwise have to re-make.

---

## S-124 | 2026-09-21 | The fal image adapter: the frame is exactly 9:16 at 864×1536, the registry admits by data, the transient is THROWN, and fal gets two base URLs because it has two hosts

**Chose.** Six things about the third real adapter — the first on a second provider and a second
key — each between real alternatives:

- **The frame asked for is 864×1536, exactly 9:16.** `packages/pipeline/src/gates/gate1.ts`'
  technical step demands `width * 16 === height * 9` — D-028's dimension assertion, verified in
  `reel-stills` — and **BUDGET.md's assumed 768×1365 is not that**: 768×16 is 12288 and 1365×9 is
  12285, so every picture at that size would fail Gate 1 for its shape. 864×1536 is the **smallest
  exact 9:16 frame whose sides are both multiples of 32 and whose short side is at least 768**, so
  a 768P clip (D-014, D-007) never upscales the keyframe the viewer sees at t=0 (D-026). **The
  consequence is a corrected rate**: at 1.33 MP a flux-2-pro derived call bills about 7.5¢ rather
  than BUDGET.md's ~6¢, and the corrected figure is owed upstream beside the video rate (D-115,
  S-017), not edited here.
- **The two admission gates are DATA and are asserted at the entry, not at a setting.** Every entry
  carries `maxReferences`, and `admitEntry` refuses one that advertises none (D-026) — thrown where
  the port is built, before the database is opened, which is the service refusing to start. It is
  reached by the registry's **data**, not by an environment value: all four admitted entries
  advertise references, so no setting can produce a failing one, and that is the closed registry
  doing its job. A test builds such an entry and hands it to `falImage`; a second test asserts every
  shipped entry passes the gate, so a future admission cannot drift past it. **The second gate stays
  on the frame**: the produced file's own header is read and a picture that is not exactly 9:16
  fails the call naming the entry — never the width and height in the provider's JSON, which is
  what "checked on the produced frame, not trusted" forbids.
- **The classification is THROWN as `Unavailable`, as the model adapter throws it** (S-122), not
  answered. `ImageAnswer`'s two arms are `made` and `refused`, and `refused` is the worker's guarded
  port's budget refusal, which a provider adapter may never construct (S-035). S-096 says plainly
  _"Which calls: video and narration. Image and model calls are not covered."_ **The carrier follows
  the port**, which is S-123's rule read the other way: there the arm existed and answering it was
  the only way not to leave a verified mechanism unreachable; here no arm exists, and inventing one
  rewrites `packages/contracts`, the stand-in and every call site in `packages/pipeline`, touching
  two verified features in a slice whose Gate 4 line is the registry and the rate.
- **The registry is entered through `imageEntry(slug)`, and no slug is spelled at a call site.** A
  slug outside it is refused **before any request** — the port is never built, so nothing is sent.
  `ImageRequest` carries no model field and this feature adds none (Gate 2 gives `packages/contracts`
  `ProviderSettings` and nothing else), so D-028's _"overridable per call"_ is the **configured
  entry**, read from `CUTROOM_FAL_IMAGE_MODEL`; a per-call override is unbuilt and named.
- **The rate reaches admission through `PlanSettings.imageRateCents`**, which `apps/service` now
  sets from the configured entry. `WorkerOptions.settings` already existed and no verified file
  changes. A flat entry's rate is its own; a per-megapixel entry's is computed for the engine's own
  frame and its one reference (D-027 allows one hop, never a chain), so **changing the configured
  entry changes what admission estimates** — check 13's whole point, and an unchanged estimate means
  a rate is hardcoded.
- **fal takes TWO base-URL settings, because fal is two hosts.** `CUTROOM_FAL_BASE_URL`
  (`https://queue.fal.run`) and `CUTROOM_FAL_STORAGE_BASE_URL` (`https://rest.alpha.fal.ai`). S-123
  gave MiniMax one setting because its two wires are one host; the reasoning was never "one setting
  a provider" but **"no half of a provider may be left pointing at the internet while the other half
  is pointed at recorded wire"**, and with two hosts that needs two settings. A test asserts each is
  honoured, because session 39's `n29` — a base URL ignored entirely — was caught by nothing until
  one was added. The third URL in the upload, the one `initiate` hands back, is **not** a setting and
  cannot be: it is the provider's own, followed as given, exactly as the subtitle URL is (S-123).

- **Check 11's words gain the classification, by addition** — S-123's form, applied to the identical
  situation rather than re-decided. Gate 2's _"What is transient, and what is a fault"_ binds both
  providers, and none of checks 11, 12 and 13 named it, so the split this slice builds would have had
  nothing whose words promised to catch it. Check 11 now ends _"and 429, 5xx, a connection error and a
  timeout THROW Unavailable while 400, 401, 422, a body that does not parse and a job the provider
  accepted and then failed throw a plain fault, with the key in one header and in no message"_. Nothing
  is removed, the check count stays **22**, and Slice 5 still proves 11, 12 and 13. S-123 rejected a
  check 23 for this — it moves the count off 22 and rewrites Gate 4's slice sum after the gates were
  approved — and that reasoning transfers unchanged, so this session applied it rather than asking again.

**The upload is documented and has never been seen here.** `uploadReference` posts to
`/storage/upload/initiate`, PUTs the bytes to the `upload_url` it is handed, and returns the
`file_url` — fal's documented REST storage, which nothing in this repository has ever called. It is
the state Slice 4's subtitle body was in, and it is recorded rather than hidden: a body that is not
this shape throws naming what arrived, so Slice 8's hand-run reel finds it at once. **S-114's escape
hatch stays attached to this one function**: if the protocol proves fragile by hand, `@fal-ai/client`
may replace `uploadReference` and nothing else, as its own entry recording what was measured.

**Why.** **The frame had to be decided before anything else, because Gate 1 would have failed every
picture.** BUDGET.md's figure was read off a pricing page, not off this engine's own gate, and the
two disagree — the gate is verified and the figure is an estimate, so the figure moves. Saying so is
the same correction Slice 3 made to a fixture's path and Slice 4 made to a fixture's field: **a
number that describes what we will actually ask for is worth more than one that matches a document.**

**A rate carried in the entry is what keeps the cap honest** (D-028): pre-flight prices what is
configured, and a constant in code makes every estimate wrong in the direction that overspends the
moment the default moves. That is why the rate reaches `imageRateCents` rather than staying inside
the adapter — an adapter that priced its own receipts correctly while admission priced a different
model would pass every receipt check and breach the cap.

**Rejected.** **768×1365, BUDGET.md's frame** — it fails Gate 1's exact 9:16, which is D-028's own
assertion; shipping it would mean every picture failing its technical step, or that step being
loosened, which is the one thing CLAUDE.md forbids. **1080×1920** — exact and safe, and about 10.5¢ a
derived flux call against S-110's _"as cheap as the decisions allow"_. **720×1280** — cheapest, and
below 768P, so `image-to-video` upscales the frame D-026 says the viewer sees at t=0. **Making the
registry injectable** so a service process could be pointed at an entry that fails admission — it
reopens the registry D-028 closed on purpose, to admit a state no shipped configuration can reach.
**Extending check 11's words** — the refusal thrown where the port is built, before the database is
opened, IS the service refusing to start; nothing needed saying differently. **Answering
`unavailable`** — there is no arm to answer with, and adding one rewrites two verified features.
**A `data:` URI instead of an upload** — no second host and no unverified protocol, at the price of
multi-megabyte bodies whose limit fal does not document, and a function Gate 2 and check 15 name
`uploadReference` that would upload nothing. **Trusting the width and height in fal's result JSON** —
D-028 says the requirement _"fails silently"_ and is therefore checked on the produced frame; reading
the provider's own numbers is trusting exactly what the decision says not to trust. **One fal base
URL** — it cannot reach two hosts, and an unsettable storage host is a suite that reaches the
internet, which is what S-111 exists to prevent.

**Caught by.** `paid-path`'s checks 11, 12 and 13 in `tests/paid-path-image.test.ts`: the four
entries with their rates and limits; a slug outside the registry refused with nothing sent; an entry
advertising no references refused with nothing sent, and every shipped entry passing; the frame read
from the produced file, a 16:9 one failing the call and naming the entry; the receipt's cost as the
configured entry's rate applied to the call; and two configured entries giving two different
admission estimates for one plan. Session 40's break campaign.

**Confirmed-by.** The owner, 2026-09-21, shown that Gate 1's exact 9:16 rules out BUDGET.md's frame,
chose _"864×1536"_; shown that the closed registry leaves check 11's reference gate unreachable from
any setting, chose _"At the factory, entry built in test"_; and shown that fal's storage is a second
host on an unverified protocol, chose _"fal storage upload, second setting"_. The rest is this
session's, recorded here because each is a choice a later session would otherwise have to re-make.

---

## S-125 | 2026-09-21 | The fal video adapter: the one path is data, the probe is the engine's one probe, the transient is ANSWERED, and the lease floor is computed from the wait a clip is allowed

**Chose.** Six things about the fourth real adapter — the second on fal's queue, and the first that
can buy the same thing twice — each between real alternatives:

- **The one video path is DATA, in `packages/providers/src/fal/h3.ts`.** D-028 made the image model
  a closed registry because four candidates are admitted and nothing has measured the axis that
  separates them; **D-007 does the opposite for video and hard-locks one alias at one resolution**,
  so there is nothing to choose. The figures still have to live somewhere **both the receipt a call
  writes and the estimate admission makes can read** — the two slugs, the rate, the resolution and
  the 5..15 bounds — because a rate that is a constant at a call site makes every pre-flight
  estimate wrong in the direction that overspends the moment it moves (D-014, I-1). The entry is
  **injectable**, so a test hands one whose rate is not the default's and a hardcoded figure fails;
  and **no slug is spelled anywhere else**, which a test proves by reading this repository's own
  source, as it does for the image slugs.
- **The probe is the ffmpeg `MediaPort`'s own, handed to the adapter.** Check 15 asks that the clip
  be _"probed before the answer returns"_, and this repository already has exactly one answer to
  _"what does ffprobe say of this file"_. It is built in `ports.ts` from the tools `PortOptions`
  already carries and passed in, so **`fal/` imports no ffmpeg** and there is no second
  implementation to disagree with the one four verified gates read. It asks ONE question — is this
  a readable file with a picture in it — and a file that fails it is **deleted and the call fails**,
  so nothing that failed is left under the artifact root for a restart to find (S-124's shape for
  the image frame). Duration, frame rate and streams are Gate 2's, judged on the same probe by a
  verified feature; an adapter that judged them would be a gate in the wrong place.
- **The whole-job WAIT is split from the per-request TIMEOUT, and it is ten minutes.** `runQueued`
  used one figure for both because an image job answers in seconds. **A real clip takes minutes**
  (S-113), and a shared 120 s would have declared a job fal was still working on `unavailable` —
  which sends the whole call again and **buys a second clip**. The per-request figure is unchanged
  and the image adapter passes its own timeout as its wait, so nothing about the image path moved.
  Ten minutes is a declared default and a guess until Slice 8: the one measurement that exists is
  D-019's spike, whose 5-second 768P clip came back in **7 seconds of wall clock**.
- **THE LEASE FLOOR IS COMPUTED FROM THAT WAIT**, not declared beside it. A clips job asks for up to
  eighteen clips — `max(shotCountUnits) * TAKES_A_SHOT`, read from the settings and the ladder
  rather than typed — so the worst case this engine can actually produce is eighteen waits plus an
  hour for the narrations, the ffmpeg work and the gates: **four hours**, where Slice 1 declared
  one. Two constants beside each other drift, and the drift is a job that outlives its own lease, is
  claimed again, and **pays a second time for the take in flight** — the exact double charge S-113
  exists to prevent (S-092, D-014). A lease that is too long costs only the time a genuinely dead
  worker's job waits, which is the only one of these errors that costs no money.
- **The classification is carried by the PORT'S OWN ARM, as narration's is (S-123).** `VideoAnswer`
  has `{ kind: 'unavailable'; detail }` — S-096 built it, `reel-takes` verified it, and
  `apps/worker/src/video-port.ts` reads it through `sentUntilAvailable`. The SPLIT is the image
  adapter's exactly (S-124) and the queue driver's, unchanged: 429, 5xx, 408, a connection error,
  the adapter's own timeout and a job still queued when the wait runs out are transient; 400, 401,
  403, 422, a body that is not JSON, a body that is not this wire, and **a job fal accepted and then
  failed, carrying the provider's own message**, are faults. Only the carrier differs, and it differs
  because the ports do. **The adapter still only classifies**: it never sends again, waits between
  sends or counts.
- **NAMED LIMIT: a transient after fal has ACCEPTED the job RE-BUYS THE CLIP.** A 429 or 5xx on a
  status poll or on the file download, and a job still queued when the wait runs out, are answered
  `unavailable`; the guarded port then sends the whole `generate` again, so a clip fal may already
  have made and billed is bought a second time. **Unlike S-123's re-buy this one costs real money**
  — T2A is covered by the owner's token plan and H3 video is explicitly excluded (D-007) — which is
  why the owner was asked rather than S-123 being applied. Every re-send is budget-guarded, so the
  cap and the ceiling still hold (S-095, S-059); there are at most three sends (S-096's default);
  and Slice 8 measures what it actually cost against the dashboard.

- **Check 15's words gain the download's transient, by addition** — S-123's form, applied rather than
  re-decided, as S-124 applied it. Check 16 already names the poll, the wait and the rejected
  request; **the download is the one video case no check named**, and it is the one that re-buys a
  clip. Check 15 now ends _"and a 429 or 5xx on the download itself is answered unavailable like
  every other transient, which re-buys the clip"_. Nothing is removed, the check count stays **22**,
  and Slice 6 still proves 14, 15, 16 and 17.

**A test of check 2's that moved, because the fact under it moved.** Slice 1 proved _"a real adapter
named with its key present still refuses while no such adapter is built"_ against the VIDEO port,
which was then unbuilt. It is built now, so the assertion moved to the **sensor**, the last of the
five (Slice 7). The assertion is unchanged and nothing was dropped; what it points at is.

**Why.** **Answering `unavailable` and naming the re-buy is what Gate 2 and check 16 already say
for every other fal call**, and throwing would leave a verified mechanism unreachable for the one
adapter that can use it — S-123's reasoning exactly. What does NOT transfer is S-123's stated reason
for accepting the re-buy, so the owner was shown the difference and chose it anyway: a 5xx at fal's
file host killing a reel after every earlier shot has been paid for is worse than buying one clip
twice, and the cap is held either way.

**Making the floor arithmetic is the same move as putting the image rate in the registry** (S-124):
a figure that must agree with another figure should be computed from it, or the two disagree the
first time either moves, silently, in the direction that costs money.

**Rejected.** **A constant rate in `video.ts`** — it is one place, and a test cannot tell it from a
figure typed at the call site, because there is nothing to change it to; an injectable entry makes
the difference observable. **Adding video to D-028's registry** — that registry is a closed set of
CANDIDATES for an unsettled choice, and D-007 settled this one; putting a locked path in it would
read as a bake-off that is not happening. **Building the probe inside `fal/video.ts` from
`FfmpegTools`** — a second ffprobe invocation beside `ffmpeg/media.ts`', which four verified gates
read, and the two would answer differently the first time either changed. **Handing the adapter the
whole `MediaPort`** — it needs one method, and the rest of that port reads text and listens from a
script. **Probing duration and streams too** — Gate 2 does that, on the same probe, in the verified
pipeline; an adapter that failed a clip for its duration would be a gate nobody could see.
**Keeping one timeout for the queue** — it calls a working job unavailable after two minutes and
buys a second clip. **Declaring the floor beside the wait** — above. **Retrying the poll or the
download inside the adapter** — it makes the adapter count, which S-096 puts in one place and D-024
says must never be two; S-124's break `t8` exists to catch exactly that. **Throwing a fault once fal
has accepted the job** — nothing would ever be bought twice, and one 503 on a status poll would kill
a reel; it also contradicts check 16's own words, which call a queued job answering 429 or 5xx
unavailable. **Requiring `expanded_prompt` in the schema** — a clip that is made and paid for must
not be thrown away over a field of metadata; it is optional, and a receipt says plainly when none
came back (D-072).

**Caught by.** `paid-path`'s checks 14, 15, 16 and 17 in `tests/paid-path-video.test.ts`: the
submitted request's resolution, duration, seed and expansion mode, and the absence of `aspect_ratio`
on image-to-video against its presence on text-to-video; every request the endpoint would reject
refused with NOTHING SENT, not even the upload; the expansion on the receipt and nowhere else; no
slug or endpoint spelled outside the file that owns it; the clip written under the artifact root,
probed, and recorded by its local path with no provider URL anywhere; bytes that are not a clip
failing the call and leaving nothing behind; the cost as the entry's rate times the seconds asked
for, rounded up, proven against an entry whose rate is not the default's; the upload through the one
`uploadReference` with no key on the presigned PUT; each wire case classified by the arm or the
throw it produces, including one on the poll and one on the download; the floor equal to the
arithmetic; a service refusing a short lease against an adapter that EXISTS and starting when the
floor is honoured; and the composition root starting exactly one worker. Session 41's break campaign.

**A measured limit of that last one, recorded because it changes what the check is worth.** "Exactly
one worker" cannot be proven from the database on the free path. Measured twice, directly: a service
started with a SECOND worker runs two runs in the same six seconds and `count(*) from job where
state = 'running'` never reaches two, because the first worker's `drain()` claims every due job in a
tight loop and stand-in work never yields long enough for a second poller's 500 ms timer to find
anything due. What a second worker does change is the shutdown — only the one the root kept is
stopped, so the process never exits, which check 5 catches. So check 17 reads the count from
`apps/service/src/service.ts` itself, the way check 11 reads the source for a slug and check 4 reads
it for a key; the two-runs sampling is kept beside it, holding the property the words name, with
what it can and cannot tell written in the test.

**Confirmed-by.** The owner, 2026-09-21, shown that a transient on the clip download re-buys a clip
and that S-123's reason for accepting that does not transfer to H3, chose _"Answer unavailable; name
the re-buy"_; and shown that the adapter's whole-job wait and S-113's lease floor are now coupled,
chose _"10 min a clip, floor 4 hours, derived"_. The rest is this session's, recorded here because
each is a choice a later session would otherwise have to re-make.

---

## S-126 | 2026-09-21 | The sensor's text step is a FIFTH call on the one model port, handed to the sensor by the pipeline; the measures are ffmpeg read from stdout; and check 2's "named and not built" assertion turns round rather than being deleted

**Chose.** Six things about the fifth and last real adapter — the only one that costs nothing,
reads no key and reaches no network — each between real alternatives:

- **`readText` is a FIFTH CALL ON `LanguageModelPort`**: one picture and a temperature in, the
  answer out unparsed, the question fixed inside the adapter (I-8), role `witness`, routed by
  D-006's table. `ModelCall` and `model_receipt`'s enum gain `'readText'`; **no migration**, because
  the column is text and the enum is the type this repository reads it through. `recordingPort`
  gains the arm, so the call writes its row like every other.
- **Two verified checks are amended BY ADDITION, in S-077's exact form.** `reel-render`'s **check
  3** says in its own words that the port's calls are _"exactly structured, observe, compare and
  judgeCut"_, and `reel-plan`'s **check 3** asserts the same list with a comment reading _"a fifth
  call … still fails here"_. **Both now name five and both stay EXACT** — a sixth call still fails
  them, and break `p5` proves it. Nothing is removed, no assertion is weakened, and each feature
  gains an amendment block above its gates saying so. `paid-path`'s _"What this feature changes in
  verified features"_ gains the two entries; both journeys were already going to be re-run in
  Slice 8.
- **The sensor is handed the ONE CALL, at CALL TIME, by the pipeline.** `PictureSensorPort.readText`
  takes a `PictureTextReader` — a function, declared in `packages/contracts/src/picture.ts` — and
  `gate1.ts` builds it from `ports.model`. Inside a worker that port is the **recording** one, so
  the vision call leaves a `model_receipt` row. **`measure` and `similarity` are handed nothing and
  can reach nothing**, so check 18's _"no model call, no spend"_ is true by construction. Every
  existing implementation keeps its one-parameter signature, because TypeScript admits an
  implementation that takes fewer parameters: the stand-in sensor and every test sensor are
  unchanged.
- **The three measures are ffmpeg, read from STDOUT.** `blurdetect` for sharpness through a
  declared, injectable `BLUR_FLOOR`; `signalstats`' `YAVG` for brightness on the limited-range
  scale, **clamped**; `ssim`'s **combined** figure for similarity, with `scale2ref` holding two
  pictures of different sizes to one frame. Both filtergraphs print what they measured on stdout —
  the `metadata` filter's `file=-` and ssim's `stats_file=-` — so **no log level can silence them**
  and nothing depends on ffmpeg's log format. `./media.ts`' scan parses stderr because its
  detectors report only there (S-072); these two do not have to.
- **`SENSOR_FILTERS` join `REQUIRED_FILTERS`.** `PictureSensorPort` has no `ready()` of its own, so
  the six filters the sensor names are demanded by EVERY ffmpeg port's `ready()` — which a worker
  awaits before it opens its database (S-075). A machine without `blurdetect` refuses to start; it
  does not measure 0 and carry on.
- **Check 2's _"named and not built"_ assertion TURNS ROUND.** Slice 1 proved it against the video
  port; S-125 moved it to the sensor; Slice 7 builds the sensor, so there is nothing left to point
  at. It is not deleted — a test dropped when its subject is finished leaves the property
  unwatched. It asserts the opposite, which is strictly stronger: **every name in every closed set
  BUILDS**, given whatever key it needs, and a port answering _"not built"_ is the finding. The
  `notBuilt` helper is gone rather than left as an unreachable branch.

**Why.**

**A call off the port has no model id, no role and no receipt.** That is D-084's argument for
`StructuredCall`, word for word, and it applies unchanged: the text step is a paid vision call, so
either it is on `LanguageModelPort` and writes a `model_receipt` row, or the run's record does not
show a call that was made. The one option that touched nothing verified — a `minimax/vision.ts`
function handed to the sensor — bought that by breaking D-084's _"every call writes a
`model_receipt` row"_ and D-006's _"the model id is recorded in every receipt"_ for the one call
nobody would ever see.

**And none of the four existing calls fits.** `structured` may carry no picture at all — review 4
of `reel-engine`'s finding, and I-8's rule. `observe` is the witness, with a fixed answer shape
that has `readableTextPresent` and no strings, and a **second `observe` per picture breaks the
observation's join**: an observation is tied to the one `observe` receipt whose `pictureIds` is its
picture's, with no receipt id stored (S-037, S-046), so two would make that key ambiguous — a
silent corruption, not a failing test. `compare` takes two pictures and subjects; `judgeCut` is
Gate 7's, on the settings' closed questions.

**The port had to be handed at call time because ports are built once and wrapped per run.**
`apps/service` builds every port at startup; `apps/worker` wraps the model in
`recordingPort(model, db, runId)` inside `keyframes-job.ts`, per run. A model port handed to the
sensor in `PortOptions` is therefore the **unwrapped** one, and its receipts go on the floor — the
same D-084 hole as a function off the port, arriving by a different door. The pipeline is the only
place that holds both the sensor and the recording port, so it is the place that joins them.

**A function rather than a port type, for two reasons.** `model.ts` already imports from
`picture.ts`, and `clip.ts` sits between them, so a port type in `picture.ts` is a cycle
`no-circular` forbids — and moving `PictureRef` alone does not break it, because `clip.ts` also
takes `WitnessObservation` from there. And a sensor needs ONE call, not a port: S-125's stated
reason for handing the video adapter a probe rather than the whole `MediaPort`.

**A measurement that corrected a comment.** `format=yuv420p` was written here as what keeps black
and white at 16 and 235. **It does not**: a full-range black JPEG reports a luma of 0 with or
without it, measured on this machine on 2026-09-21. So the **clamp** is what holds brightness
inside the range `PictureMeasure` declares, and the comment now says so. A file from outside this
engine is still answered inside the range.

**Rejected.** **A `minimax/vision.ts` function off the port** — above; it is the only option that
moves nothing verified, and it pays for that with a paid model call the record does not show.
**The witness's `observe` answer supplying the text** — one vision call a picture instead of two,
already recorded and already routed; it needs `gate1`'s text step moved AFTER the witness and fed
from its answer, which reorders a verified gate (D-042, S-031, S-041) and makes check 19's _"the
sensor's answer"_ true only as pass-through. **A second `observe` call from inside the sensor** —
the join above, broken silently. **A fifth `ModelRole`** — roles are read by name in three verified
tests and by D-006's table, and the text step is a seeing call, which is what `witness` is.
**Handing the sensor a `LanguageModelPort` in `PortOptions`** — two lines, and the receipts are
lost. **An optional `useModel` the worker sets per run** — recorded correctly, and it puts mutable
state on a port, correct only while everything is sequential (S-115) and a landmine for
`parallel-shots`. **Parsing the measures off stderr, as the scan does** — it works, and it ties a
measure to a log level; stdout cannot be silenced. **A sensor that answers "no text"** — S-112's
own rejection, and the reason the step is a call at all. **Deleting check 2's finished assertion**
— an unwatched property; turning it round keeps a test watching the same thing from the other end.

**Caught by.** `paid-path`'s checks 18 and 19 in `tests/paid-path-sensor.test.ts`: a picture and
the same picture blurred, measuring apart; a picture past the blur floor clamped to 0, and a flat
frame, which `blurdetect` cannot measure at all, answering 0 rather than 1; black at 0, white at 1,
and a full-range file clamped; ssim's combined figure told from every single channel by a pair with
the same luma and a different colour; two pictures of different sizes answered rather than refused;
a file that is not a picture measuring unreadable with no model call; the three filters in
`REQUIRED_FILTERS`, and a `ready()` that refuses a filter the tools lack; one call and exactly one,
whose strings are the port's answer; a failed call and an answer that does not parse both throwing;
the picture, the fixed question and the receipt's `readText`, `witness` and `pictureIds` against
recorded wire, with each wire case saying which failure it was; and a whole run through the service
writing one `readText` receipt for every picture the witness saw.
`tests/paid-path-refusals.test.ts` for every name in every closed set building.
`tests/reel-plan-shapes.test.ts` and `tests/reel-render-profile.test.ts` for the five-call list,
still exact. Session 42's break campaign.

**Confirmed-by.** The owner, 2026-09-21, shown that `LanguageModelPort` has no call that answers
"what text is in this picture" and that two verified checks pin it to exactly four, chose _"A fifth
call, S-077's form"_; and shown that a port handed at construction is the unwrapped one whose
receipts are lost, chose _"The pipeline hands it at call time"_. The rest is this session's,
recorded here because each is a choice a later session would otherwise have to re-make.
---

## S-127 | 2026-09-21 | Three of S-110's cheapness levers do not hold: flux is not the cheapest entry at this engine's frame, five-second clips fail Gate 0, and the first run names its entry with the SETTING rather than the default

**Supersedes:** **S-110**, on three of its stated levers only — which entry is cheapest, the clip
length, and the arithmetic that followed from them. **Its conclusion is untouched**: the first real
run is still one reel, still under BUDGET.md's $3.00 per-reel cap unchanged, still with the caller's
ceiling set below the cap, and still with every lever that does not break a decision pulled towards
cheap. What changes is which levers those are.

**Chose.**

- **`flux-2-pro/edit` is NOT the cheapest admitted entry at the frame this engine asks for.** S-110
  reads _"the cheapest admitted image entry as the configured default for that run —
  `flux-2-pro/edit` at about $0.03"_. At **864 × 1536 with one reference** (S-124's frame), measured
  from the registry's own rates: **`bytedance/seedream/v5/lite/edit` is 3.5¢** a derived call and
  **flux is 7.5¢** — with `nano-banana-2` at 8¢ and `nano-banana-pro` at 15¢. S-110's $0.03 is
  flux's **headline first-megapixel rate**, and `registry.ts`' own comment beside that entry already
  says why it does not survive: _"we send custom dimensions, which is why its headline rate does not
  survive our frame size."_ Session 40 corrected the figure to 7.5¢ (S-124) and did not revisit
  which entry the corrected figure made cheapest. **Flux is second cheapest of four.**
- **"Five-second clips, the provider's floor" is UNREACHABLE.** Gate 0 requires a plan of **4 to 6
  shots** (`SHOT_COUNT`, D-014, D-063), each **5 to 15 seconds** (`SHOT_SECONDS`, D-019), totalling
  **35 to 45 seconds** (`totalSecondsBounds`, D-111). Six five-second shots is **30 seconds and
  fails `shaped()`**; four is 20 and fails harder. **The cheapest legal reel is 35 seconds however
  it is cut**, so the video term has a floor of 35 × 4¢ = **140¢** and the shot count does not move
  it at all — every shot costs the same video with or without a keyframe (I-3).
- **S-110's total is therefore wrong on both terms**, and is restated: _"4 × $0.03 + 6 × 5 s ×
  $0.04 = $1.32"_ becomes **4 × 7.5¢ + 35 s × 4¢ = 170¢** at flux, or **4 × 3.5¢ + 35 s × 4¢ =
  154¢** at seedream, against a $3.00 cap. The floor across every legal shape is **155¢** and the
  ceiling of the range is **210¢** (four image calls, 45 seconds, flux).
- **THE FIRST RUN NAMES ITS ENTRY WITH `CUTROOM_FAL_IMAGE_MODEL`, NOT BY MOVING
  `CONFIGURED_IMAGE_SLUG`.** A default is D-028's to settle and its bake-off is what settles it
  (O-4 / C-8, open); a setting is one run's. Check 13 already proves the setting reaches admission
  and changes what it estimates, so this needs no new mechanism — and `CONFIGURED_IMAGE_SLUG` stays
  where it is, still settling nothing.
- **The first run is made on `bytedance/seedream/v5/lite/edit`** — the owner's instruction, _"test
  first with the cheapest but good option, then we'll see"_ — and the risk it carries is named
  rather than discovered: **seedream is the one entry D-028 admits conditionally**, with _"9:16
  undocumented — must pass the frame assertion before use"_, and `documentsVertical: false` records
  that. **What that costs if it is wrong is bounded and early**: the frame is read off the produced
  bytes and judged **before the file is written** (S-124), the call fails **naming the entry**
  (check 12), and the stills stage runs **before any clip is bought** — so the whole downside is at
  most four image calls, **14¢, with no video spend at all**. If the frame fails, the run is made
  again on flux and the failure is itself the answer to the thing D-028 flagged.
- **THE CLAIM BECOMES DATA.** _"The cheapest admitted entry"_ was asserted in a comment and went
  stale the moment a rate moved, with nothing to notice. The registry gains **`cheapestEntry()`**,
  computed from the same `imageRateCents` every estimate and receipt already use, and a test pins
  which slug it answers today. This is S-124's rule for the image rate and S-125's for the lease
  floor, applied a third time: **a figure that must agree with another figure is computed from it,
  or the two disagree the first time either moves, silently.** The comment on
  `CONFIGURED_IMAGE_SLUG` is corrected to say what it is — a default that settles nothing — and
  stops claiming a rank it does not hold.

**Why.** **None of this is a gap in the plan; it is three facts that moved under a decision and were
not noticed.** S-110 was written on 2026-09-20 against BUDGET.md's rates and before the frame was
decided. S-124 fixed the frame on 2026-09-21 and, with it, every per-megapixel rate in the registry
— flux's most of all, because it is the only entry priced per megapixel rather than per image. The
clip length was wrong from the start: D-111's 35-second floor and D-019's 5-second shot floor cannot
both be taken at once at any admitted shot count, and nothing computed the product.

**A decision that is wrong about its own arithmetic is worse than one that is silent**, because the
next session reads it as measured. Slice 8 is the session that spends, and it would have submitted a
run built on a clip length Gate 0 refuses and an entry chosen for a rank it does not hold — and the
refusal would have read as the engine misbehaving.

**Rejected.** **Moving `CONFIGURED_IMAGE_SLUG` to seedream** — it reads as settling D-028's open
default by the back door, on price alone, which is the one axis the bake-off is not about; a setting
says "for this run" and a default says "from now on". **Leaving S-110's levers and running on them**
— a plan that fails Gate 0 before anything is bought, blamed on the engine. **Correcting the figures
in a comment** — that is what went stale; `cheapestEntry()` is a function a test can hold.
**Running flux first for safety** — considered and put to the owner, who chose cheap; and the
argument for flux is weaker than it first looked, because the failure it guards against is
attributable by check 12's own words, costs at most 14¢, and happens before a single clip is
bought. **Widening `totalSecondsBounds` or `SHOT_SECONDS` to reach $1.32** — weakening a verified
gate to match a superseded arithmetic, which is the exact move CLAUDE.md's rule 3 forbids.

**Caught by.** `paid-path`'s check 13, unchanged, which already proves the configured entry reaches
admission and that changing it changes the estimate — run in Slice 8 against seedream rather than
flux. A new test in Slice 8 that **`cheapestEntry()` is `bytedance/seedream/v5/lite/edit` at the
registry's current rates**, which fails the moment a rate moves and the rank with it. Check 12, which
fails a call whose produced frame is not 9:16, **naming the entry** — the assertion seedream's
conditional admission rests on. And Gate 0's own `shaped()`, which refuses a 30-second plan, in
`reel-plan`'s verified checks.

**Confirmed-by.** The owner, 2026-09-21, told that flux is second cheapest of four and that
seedream's 9:16 is undocumented, chose to run the cheapest option first and see. The three
corrections are facts measured from this repository's own source and gates on the same day, not
preferences.

---

## S-128 | 2026-09-21 | Every admitted image entry carries its model's TEXT wire beside its edit wire, because the canonical picture is made from nothing; the narration voice is a service setting; and the first real reel's ceiling is 250¢

**Chose.** Three choices, each between real alternatives, and the first two are **blockers found
before anything spent** — read from fal's own published OpenAPI schemas on 2026-09-21, keyless and
free, the way D-019's spike read H3's.

- **AN ENTRY HAS TWO WIRES, AND THE CALL PICKS ONE BY WHETHER IT CARRIES A REFERENCE.**
  `ImageEntry` gains **`textSlug`** beside `slug`, and `wireFor(entry, references)` answers the
  text wire for a call with none and the edit wire for a call with one. The four are
  `fal-ai/nano-banana-pro`, `fal-ai/nano-banana-2`, `bytedance/seedream/v5/lite/text-to-image` and
  `fal-ai/flux-2-pro`, each verified to exist by the same schema read. **The receipt records the
  wire that was called**, never the entry's edit slug whatever was sent.
- **THE NARRATION VOICE IS `CUTROOM_NARRATION_VOICE`**, read by `apps/service` and handed to the
  worker as `renderSettings.voice`, **defaulting to `DEFAULT_RENDER_SETTINGS.voice`** — still
  `'stand-in'`. `apps/service` had never passed `renderSettings` at all; it does now, and its one
  difference from the pipeline's own default is the voice.
- **THE FIRST REAL REEL'S CEILING IS 250¢**, a constant in `scripts/real-reel.mjs` that `--ceiling`
  can only LOWER. The script prints the estimate, computed from the same `estimate()` admission
  uses, and **submits nothing until the figure is typed back** as `spend 250`.

**Why.**

- **No admitted entry could make the canonical picture.** `makeStills` calls `generate` with
  `references: []` for the canonical's two best-of-2 candidates — it is the first picture of the
  reel and there is nothing to derive it from (D-027, D-030, D-032) — and fal's schemas make
  **`image_urls` a REQUIRED field** on `bytedance/seedream/v5/lite/edit`, `fal-ai/flux-2-pro/edit`
  and `fal-ai/nano-banana-pro/edit`. **The first image call of the first real reel would have been
  refused 422**, and the refusal would have read as the engine misbehaving. This is S-127's shape a
  second time and in the same week: two decisions each correct on their own — D-028 admits edit
  wires because D-026 requires reference input, D-027 makes the canonical from nothing — with
  nothing computing their product. **D-028's closed set of MODELS is not touched**: the same four
  models are admitted, at the same rates and the same limits, and a model has always had two wires.
- **The voice was a named limit three sessions running, and it is a provider refusal.** The adapter
  is handed `RenderSettings.voice` and sends it as MiniMax's `voice_id`; it may not spell one
  (S-070). Left at `'stand-in'`, **every narration call of a real run is refused** — before any clip
  is bought, but also before any reel exists. A setting keeps the free path byte-for-byte what four
  verified features run on, and names the voice the way S-127 names the image entry: for one run.
- **The ceiling is above the estimate and below the cap.** 147–194¢ on seedream, so one retake does
  not stop a run with money already spent; BUDGET.md's 300¢ per-reel cap is the steering
  repository's and is not lowered here (D-115, S-017), so the run is bounded by the caller's
  ceiling, which is what a ceiling is for (D-100). It is a constant rather than a setting because
  **a ceiling an environment variable could raise is a ceiling an accident can raise**.

**Rejected.**

- **Running on `fal-ai/nano-banana-2/edit`**, the one admitted entry whose `image_urls` is optional
  — no code and no decision. It is an `ask: 'ratio'` entry, so the frame is **the provider's
  choice** at the 1K tier rather than the exact 864 × 1536 sent to seedream and flux, and D-028 says
  the 9:16 requirement fails silently and is judged on the produced frame: a frame that is not
  exactly 9:16 fails **after it has been paid for**, four times over. It is also 8¢ a call against
  3.5¢. Put to the owner with the schema read beside it; not chosen.
- **Stopping, and putting the canonical to D-028 upstream.** It is the honest reading if this were
  a change to which models are admitted. It is not: the models, their rates and their limits are
  untouched, and what was missing was the second slug each of them has always published. Stopping
  would have ended the slice with no reel and the Outcome lines unticked over a field name.
- **Making the canonical carry a reference.** There is none. The canonical IS the reference every
  other picture carries, which is the whole of D-027's ladder.
- **Moving `DEFAULT_RENDER_SETTINGS.voice` to a real voice.** One line, and it is a verified
  feature's default (`reel-render`): this feature's _What this feature changes in verified features_
  lists exactly three changes, and adding a fourth is the thing that list exists to prevent. It also
  puts a vendor's voice id on every stand-in run, which the stand-in ignores and which is then
  untrue of what the free path does.
- **A ceiling of 290¢**, the most headroom available under the cap, which barely constrains
  anything the cap does not; and **210¢**, the tightest figure that admits every legal shape, whose
  16¢ of headroom is less than one clip retake.
- **A `--yes` flag on the script.** A confirmation that can be given without reading the estimate is
  not a confirmation. The figure is typed back instead.

**Caught by.** **Check 11**, whose words gain both wires by addition: every admitted entry carries
two slugs, they are polled in the same place (fal polls a slug's first two segments, so a pair that
did not would submit in one place and be polled in another), a call with no reference goes to the
text wire and one with a reference to the edit wire, **and each receipt names the wire that was
called**. A fault now names the wire called **and asserts the other one absent**, because the edit
slug is the text slug plus a segment and `includes` alone would pass either way. Check 11's
"no slug is spelled anywhere but the registry" holds **both** slugs. **Check 9**, whose words gain
the voice setting by addition: the default is the pipeline's own, the setting reaches
`renderSettings.voice`, and nothing else about what the worker renders with moves with it.
**Check 20**, which reads the script's own source and fails if the estimate is printed after the
submit, if more than one request is submitted, or if a confirmation is not read between them.
And **the run itself**, whose receipts are compared with fal's dashboard (S-110).

**A gap this found in the suite, closed by adding.** The recorded-wire harness throws when nothing
matches a call's path, and the image adapter classifies that throw as `Unavailable` — so a fixture
whose path stopped matching satisfied every transient assertion while proving nothing. Each
transient and fault case now asserts `recorded.left()` is empty: **the fixture was served, or the
test fails**. It was found because moving the canonical to the text wire moved five fixtures'
paths out from under their tests, and all five went on passing.

**Confirmed-by.** The owner, 2026-09-21, shown fal's schema read and both alternatives for the
canonical, chose the two wires; shown D-019's spike voice and the cost of moving a verified
feature's default, chose the setting. The ceiling is the owner's, 2026-09-21.

---

## S-129 | 2026-09-21 | The MiniMax credential is the Token Plan SUBSCRIPTION key, not a pay-as-you-go API key; and T2A's word timings are asked for with `subtitle_type`, joined back into the text's words and never split

**Supersedes.** **D-019**, in two of its recorded facts, each of which was true of the call it was
read from and is not true as written. The corrected facts are owed upstream rather than edited into
`steering-ref/` here (D-115, S-017).

**Chose.**

- **The key `apps/service` is given is MiniMax's Token Plan SUBSCRIPTION key**, the one at
  Billing → Token Plan, prefix `sk-cp-…`. Nothing in this repository changed for it: the adapter
  already sent what MiniMax's own integration guide gives for that key, header for header.
- **The narration call asks for `subtitle_type: 'word'`**, beside `subtitle_enable: true`, because
  `subtitle_enable` alone answers the provider's **default granularity, which is `sentence`**.
- **The provider's tokens are JOINED back into the narration text's white-space words** inside the
  adapter — `R` + `ad` + `ar` into `Radar`, `did` + `.` into `did.` — a joined word beginning where
  its first token begins and ending where its last one ends. A run of tokens that does not build the
  next word of the text **abandons the join**, and every token is passed on as it arrived.
- **A body with no word level is still not split.** One entry holding a whole sentence is passed on
  whole, and the stage's parse is what refuses it.

**Why.**

- **The engine could not generate at all, and the reason was the credential's TYPE.** Four sessions
  of a paid path ended at `402 insufficient_balance_error … insufficient balance (1008)` on every
  wire, every model and both header styles, while `GET /v1/models` answered 200 — reading worked and
  generating did not. **That is what an entitlement keyed on the credential looks like**, and it was
  measured to be exactly that: MiniMax issues **two** credentials that an SDK will accept in the
  same field — a pay-as-you-go **API Key**, prefix `sk-api-…`, drawing on an account balance, and a
  Token Plan **Subscription Key**, prefix `sk-cp-…`, drawing on a seat or on Credits. Its own
  documentation: _"It is not interchangeable with pay-as-you-go API Keys."_ The key in `.env` was
  `sk-api-…`, on an account with no balance. The same kind of key is what the working tools carry —
  OpenCode's issue 22614 and pi's 2768 are both about `sk-cp-` keys.
- **D-019 recorded "the token-plan key covers all three" from a real call on 2026-09-03**, and it is
  still true of a Subscription Key: with one in `.env`, `POST /v1/chat/completions` answered 200 on
  MiniMax-M3 and MiniMax-M2.7, `/anthropic/v1/messages` answered 200 on Bearer and on `x-api-key`,
  `POST /v1/t2a_v2` answered 200 with 50 KB of audio, and `POST /v1/image_generation` answered 200.
  What has to be said differently is **which credential**: "the key" is one of two things, and only
  one of them generates. **`estimate()` still has no model or narration term**, which remains right
  only while the plan covers them — it is the plan, not the endpoint, that makes them free.
- **The word timings were the wrong shape, and the shape had never been seen.** D-008's whole reason
  for a separate narration track is word timings, and D-019 recorded that `subtitle_enable: true`
  answered "a subtitle_file URL" — which it does. The spike never fetched the body, so session 38
  wrote the fixture from the documentation, one entry a word, and its own comment said so. **A live
  call answers neither shape.** At the default granularity a three-sentence, twenty-word narration
  came back as **one entry for the whole text**; `wordTimings` demands every word of the text,
  exactly once, in order, so **every narration of a real reel would have been spoken, paid for and
  then refused by the stage** — the second blocker in two sessions found before it could spend.
- **An unknown field is dropped in silence by this wire.** `subtitle_granularity`, `granularity`,
  `subtitle_setting.granularity` and `subtitle_level` were each answered **200 with sentence-level
  timings** — so a wrong guess at the name reads exactly like a provider that has no word level.
  `subtitle_type` is the name the provider's own reference gives, and the one measured answering
  with words.
- **Joining invents nothing; splitting would.** The provider's tokens are not the stage's words:
  white space arrives as tokens of its own, a full stop is its own token, `holds` arrives as `hold`
  then `s`, and `Radar` as `R`, `ad`, `ar`. Joining them is exact — the span is the first token's
  begin and the last token's end, both the provider's own figures. Splitting a sentence entry into
  words is the opposite: it would have to invent the milliseconds inside it.

**Rejected.**

- **Refusing a key whose prefix is not `sk-cp-`, at startup.** It would have turned four sessions of
  402s into one message. It is also wrong: MiniMax's own reference says _"Treat the prefix as a
  useful clue, not as proof that the key has the correct region, Team, balance, or resource
  access"_, a pay-as-you-go key WITH balance is a legitimate way to run this engine, and a guard
  that reads a credential's contents to decide whether to send it is a guard that has to be taught
  every prefix MiniMax ever issues. The provider's own refusal is already classified as a fault, and
  a fault stops the run at its first call having bought nothing — which is what happened.
- **Splitting a sentence entry by character proportion**, or by the entry's `text_begin`/`text_end`
  offsets. Both produce timings for every word and both are fabrications: nothing in a
  sentence-level answer says when a word inside it was said. A wrong word against a wrong
  millisecond is worse than a refused narration, because the reel is made and nobody is told.
- **Reporting the mismatch from the adapter** when the tokens do not build the text. _"Are these the
  narration's words"_ is the stage's question (S-070, S-042); answering it here would make the
  stage's parse unreachable, which is the exact gap session 38 wrote the adapter to avoid.
- **Matching on `pronounce_word` rather than `word`.** `pronounce_word` is the spoken form; the
  stage compares against the text's own characters.
- **Keeping the documented fixture beside the recorded one.** Two shapes, one of which no call has
  ever answered, reads as coverage of a wire that does not exist.

**Caught by.** **Check 9**, whose words gain the granularity by addition: the call asks
`subtitle_type: 'word'`; the recorded word-level body — **recorded from a live call on 2026-09-21**,
not written from a document — joins into the text's nine words with the provider's own figures at
both ends, and the test fails if the recorded wire ever stops splitting `Radar` into tokens, because
a body with one token a word would make the join prove nothing; **the sentence-level body, recorded
from the same call without the field**, is passed on whole and is refused by `wordTimings` naming
how many words it was given; and tokens that are not the text's words are passed on as they arrived
rather than forced into it. **`tests/fixtures/wire/minimax-subtitle-words.json` and
`minimax-subtitle-sentence.json`** are what pin both. The credential has no check and is not given
one, for the reason under Rejected; what catches it is the provider's own 1008, classified as a
fault since S-096 and exercised live in session 43.

**Confirmed-by.** The owner, 2026-09-21, who replaced the key on being shown the prefix finding, and
against whose Subscription Key every figure above was measured.

---

## S-130 | 2026-09-22 | This wire answers 200 to `response_format` and ignores it, so the adapter says the shape in the MESSAGE as well — the same rendering, never a second copy of the field names

**Chose.**

- **The MiniMax model adapter appends the rendered JSON Schema to the message it sends**, after
  the pipeline's prompt in a structured call and as a text part after the media in a vision call.
  The words it is appended under are `SHAPE_PREFACE`, a constant, and they say **the field names**
  because that is what this wire got wrong.
- **It is the SAME `z.toJSONSchema` rendering that `response_format` carries.** One call to it,
  used twice, so the header field and the message cannot disagree.
- **`response_format` is still sent, and `strict` stays `false`.** Nothing is taken away.
- **`packages/pipeline` is untouched.** No prompt gains a field name, and `reel-plan` is not
  changed by this feature.

**Why.**

- **The first real reel failed at its first parse, and the reason was the provider ignoring a
  field it answers 200 to.** Measured on 2026-09-22 against the live wire, at temperature 0, with
  the planning call the run itself makes:

  | what was sent                         | the shot's field names came back as     | parses  |
  | ------------------------------------- | --------------------------------------- | ------- |
  | `strict: false` — as shipped, 4 units | `unit`, `duration`, `subjects`          | no      |
  | `strict: false` — as shipped, 8 units | `unit`, `seconds`, `subjects`           | no      |
  | `strict: true`                        | `unit`, `seconds`, `subjects`           | no      |
  | `type: 'json_object'`                 | `unit`, `seconds`, `subjects`           | no      |
  | the schema appended to the message    | `unit`, `durationSeconds`, `subjectIds` | **yes** |

  **`strict: true` is indistinguishable from asking for no schema at all**, and the rendered
  schema is correct — it names `durationSeconds`, `subjectIds`, and `additionalProperties: false`
  — so nothing was wrong with what was computed, only with what the provider did with it. The
  invented names DIFFER between two groupings of the same reel, which is why "answer only with the
  JSON object the schema describes" cannot be made to work by asking more firmly.

- **This is session 44's finding a second time, on the other wire.** S-129 recorded that T2A
  **drops an unknown field in silence**, so a wrong guess at a field name reads exactly like a
  provider that has no such feature. Here the field is not unknown and is not dropped: it is
  accepted, echoed by a 200, and ignored. Both say the same thing about this provider — **what it
  accepts is not what it honours**, and the only proof is the body that comes back.
- **The shape is a rendering, never a copy.** The alternative was to spell the field names in the
  pipeline's four prompts. That is the shape S-124, S-125 and S-127 each ruled against: a figure
  that must agree with another figure is computed from it, or the two disagree the first time
  either moves, silently. A prompt naming `durationSeconds` in prose is exactly that, in four
  places, with nothing to notice when a schema gains a field.
- **It does not weaken I-8.** The three calls that carry a picture or a clip still take no prompt,
  no schema and no criterion **from a caller**. What is appended is the ADAPTER'S OWN schema,
  fixed in the adapter, which is the same thing `response_format` already carried — a gate's brief
  cannot be written into it.
- **Replay survives.** The rendering is built from the schema alone — no time, no randomness — so
  the same inputs still ask the same thing, which is what D-062 and D-064 rest on.

**Rejected.**

- **The pipeline's prompts naming their own field names.** It is a fourth change to a verified
  feature, which `docs/features/paid-path.md`'s own _"What this feature changes in verified
  features"_ list exists to prevent, and it hand-types in four prompts what four schemas already
  say. Put to the owner with the measurement beside it; not chosen.
- **`strict: true`.** Measured, and it changes nothing: the answer is the same as asking for no
  schema. Sending it would read as a guard.
- **Dropping `response_format`.** It costs nothing, it is the field a provider that honours
  schemas would honour, and removing it is subtraction.
- **Retrying a failed parse with the names supplied.** A second call for every first one, and it
  makes the first call's waste structural rather than fixing it. The shape is cheap to say once.
- **Stopping and putting it upstream.** It is this engine's adapter and this repository's decision
  (D-115, S-017); nothing about the script, the epistemic layer, the orchestrator or the player
  moves.

**Caught by.** **Check 6**, whose words gain the message by addition: a structured call opens with
the pipeline's prompt **whole and first**, then says the shape under `SHAPE_PREFACE`, and the
message's rendering is asserted **equal to the one `response_format` carries** — so a break that
renders it twice, or renders it differently, fails. The field names asserted are read from the
schema's own rendering, so a schema that gains a field gains the assertion with it. **Check 7**
gains the same for a vision call, where the shape is the LAST part and the media is still carried
as bytes before it. **A break campaign of six**, each typechecking clean, each written from a file
rather than through a shell (S-129's note on the backslash trap, a fourth session): the shape not
said in a structured call — 6; not said in a vision call — 7; a different rendering in the message
than in the header — 6; the preface said and the schema omitted — 6 and 7; the shape said before
the prompt — 6. The control, a comment reworded, is caught by nothing.

**Confirmed-by.** The owner, 2026-09-22, shown the table above and both alternatives, chose the
adapter.

---

## S-131 | 2026-09-22 | A boolean schema is dropped from the rendering this wire is sent, because MiniMax's parser refuses the whole request over one — and `additionalProperties` is kept, because the same parser accepts it and it is load-bearing

**Supersedes:** nothing. It corrects what **S-130** could not see: with planning fixed, the run
reached the scoring call for the first time and that call was refused before it was read.

**Chose.**

- **`withoutBooleanSchemas` is applied to the one rendering** `shapeAsked` builds — so
  `response_format` and the message still carry the same thing (S-130's invariant).
- **`additionalProperties` is kept, although it is a boolean.** The rule is "the booleans this
  parser refuses", measured, not "every boolean".
- **`packages/pipeline` is untouched.** `scoreAnswer` stays `z.tuple([yesNo × 4])`, and it is
  still what parses the answer.

**Why.**

- **JSON Schema 2020-12 lets a schema BE a boolean, and zod uses it.** `z.tuple` of four renders
  `"items": false` beside `prefixItems` — "and no more than these". Measured 2026-09-22:

  | what was sent to `/v1/chat/completions`             | M3      | M2.7    |
  | --------------------------------------------------- | ------- | ------- |
  | the score schema as rendered, with `"items": false` | **400** | **400** |
  | the same with boolean schemas dropped               | 200     | 200     |
  | `{ type: 'json_object' }`                           | 200     | 200     |

  The refusal is `invalid params, Mismatch type open_platform_oai.CCv2GlyphProperties with value
bool "at index 2356: mismatched type with value"` — **the provider's own parser failing on our
  REQUEST**, before any model sees it. It is not M3's: both models refuse it.

- **It was already being sent, and nothing had ever reached it.** `responseFormat` carried this
  rendering before S-130 existed. The reel had never got past its first planning call, so the
  scoring call — the only tuple in the engine — had never been made. **Two blockers in one run,
  the second hidden behind the first**, which is the same shape as session 44's.
- **Dropping it loses nothing that is said elsewhere.** `"items": false` beside `prefixItems` and
  `"maxItems": 4` says what `maxItems` already says, and the pipeline's own strict schema is what
  actually accepts or refuses the answer. **Nothing about what is ACCEPTED moves** — only what is
  asked for, from one provider, in that provider's adapter.
- **`additionalProperties` is the opposite case and had to be measured separately.** It is a
  boolean by the same rule, the same parser **accepts** it, and it is what tells the model to add
  no field of its own. Every pipeline schema is strict, so a field the model invents is a refused
  answer — dropping every boolean would have quietly stopped asking for the one thing that keeps
  an answer parseable. **A rule wide enough to cover the measurement is not the same as the rule
  the measurement supports.**

**Rejected.**

- **`response_format: { type: 'json_object' }`, dropping the schema from the header entirely.**
  Measured 200 and it parses, and this wire ignores the schema anyway. But the day a MiniMax model
  honours one, this engine would not be asking with one, and nothing would notice. Put to the
  owner beside the sanitised rendering; not chosen.
- **Changing `scoreAnswer` from a tuple to a bounded array.** One line, and it is
  `packages/pipeline` — a verified feature changed to suit one provider's JSON parser. The tuple
  is also what makes the four answers positional, which `scorePlan` reads them as.
- **Dropping every boolean, `additionalProperties` included.** Simpler to write and wrong: see
  above. The narrow rule is the measured one.
- **Retrying a 400 without the field.** A 400 is a fault (S-096): sending the same request again
  cannot help, and sending a DIFFERENT one on a fault is the adapter deciding what the caller
  asked for.

**Caught by.** **Check 6**, by addition: a schema that renders `"items": false` — asserted to
still render it, so the check cannot go quiet if zod changes — is sent with the boolean gone,
`prefixItems` and `maxItems: 4` intact, `additionalProperties: false` intact, and the message
carrying the same rendering as the header. The 400 itself is already classified as a fault by
check 8, which is why this run stopped having bought nothing.

**Confirmed-by.** The owner, 2026-09-22, shown the table above and all three alternatives, chose
the sanitised rendering.

---

## S-132 | 2026-09-22 | A whole answer wrapped in a code fence is unwrapped where the reasoning block is, and only when the fence is the whole of it

**Chose.** `answerAfterReasoning` ends in `unfenced`, which removes a fence that **opens at the
start of the content and closes at the end**, and does nothing otherwise. Both the language tag
form and the bare form. It is applied after the `<think>` strip, because a real answer carries
both.

**Why.**

- **The reel's third attempt failed on a correct answer.** With the shape said in the message and
  the boolean gone, MiniMax-M3 answered the scoring call with exactly what was asked for —
  `{"answers":["no","yes","yes","no"]}` — inside ` ```json `, and `JSON.parse` refuses a
  fence. **Two model calls before it had already been made**, so this is the failure shape that
  costs the most: everything works and the last inch is presentation.
- **It is the same family as D-019's `<think>` block**, which this adapter already strips for
  exactly this reason: a wrapper the model adds around an answer that was asked for as JSON.
  Neither is suppressed reliably by instruction — the prompt already ends _"Answer only with the
  JSON object the schema describes"_ and the model fenced it anyway — so it is removed where the
  other one is.
- **Only a WHOLE fence, so that a content which is not an answer still fails as one.** A model
  that explains itself and puts JSON in the middle has not answered the call; unwrapping that
  would turn a prose answer into a parse that happens to succeed, and the failure this adapter
  reports would stop being true. `jsonOf`'s message is the right outcome there.
- **The fixture records both wrappers in one body.** `minimax-chat-fenced.json` is the live M3
  answer from this run, reasoning block and all, kept as it arrived: what it proves is that
  neither wrapper reaches the answer, and a fixture with the reasoning removed would prove half
  of it.

**Rejected.**

- **Asking the model not to fence.** The prompt already says to answer only with the JSON object.
  An instruction that was already given and already ignored is not a fix.
- **Stripping every fence anywhere in the content**, or finding the first `{` and the last `}`.
  Both turn prose that contains JSON into a successful parse, which is a worse failure than a
  refusal: the call did not answer, and the engine would proceed as if it had.
- **Doing it in `jsonOf`.** It is a property of this provider's ANSWER, like the reasoning block,
  not of parsing JSON; `answerAfterReasoning` is where the adapter already says what an answer is
  once the model's presentation is taken off.

**Caught by.** **Check 6**, by addition: the recorded body carrying both wrappers parses to the
four answers, with neither wrapper anywhere in the value; and `unfenced` is asserted on the four
cases directly — tagged fence, bare fence, no fence, **and a fence that is not the whole content,
which is left alone**.

---

## S-133 | 2026-09-22 | A field the image adapter does not read may not refuse a picture: every untrusted field of fal's result admits `null` as well as absent

**Chose.** In `packages/providers/src/fal/image.ts`, the result shape's **`width`, `height`,
`content_type`, `seed` and `prompt` are `nullish`** rather than optional. **`url` is not**: it is
the one field here the adapter uses.

**Why.**

- **fal answered 200 with `width: null` and `height: null`**, on the first real reel's canonical
  picture, 2026-09-22. `z.number().optional()` refuses a null, so the adapter threw
  `a body that is not this wire: images.0.width Invalid input: expected number, received null` —
  **on a picture fal had already made and had already billed for.**
- **The fields it refused on are the two the adapter documents as trusted for nothing.** D-028
  says the 9:16 requirement fails silently and must be judged on the produced frame, so S-124 put
  the frame read on the BYTES and left the provider's own numbers unread. They were still able to
  fail the call — **a field nothing reads could refuse a picture that was paid for**, which is the
  opposite of what "not trusted" was supposed to mean.
- **The rule is the fields, not the one null that was seen.** Every field here that the adapter
  records and does not read now admits the null, because the next one to arrive null would be
  another paid picture thrown away and another run of the reel. `url` is excluded deliberately: a
  schema that admitted a null url would turn a missing picture into a fetch of nothing, and that
  IS read.
- **The fixtures said so about themselves.** `fal-image-made.json`'s own note reads _"DOCUMENTED
  SHAPE, NEVER SEEN HERE … Slice 8's hand-run reel is what verifies it."_ This is that
  verification, and it found a difference.

**Rejected.**

- **Widening `width` and `height` alone**, the two that were measured. Narrower than the reason:
  the reason is that the adapter does not read them, and four other fields share it. The cost of
  being wrong again is another paid picture and another run.
- **Reading the frame from the provider's numbers now that they are handled.** D-028 and S-124
  both say the opposite, and a null is exactly why: the provider's account of what it made is not
  always there.
- **Accepting any unknown body shape.** The refusal is what caught this. What changes is one
  field's admitted values, not whether the shape is checked.

**Caught by.** **Check 12**, by addition: `fal-image-nulled.json` — the shape the live call
answered, with the untrusted fields null — still makes a picture, still writes its file, still
reads its frame off the bytes, and its recorded body is asserted served. **Check 11 caught the
first draft of this entry's own comment**, which spelled a slug outside the registry; the comment
names the wire instead.

**Owed, and not fixed here.** **A call that completes and then fails to parse leaves no receipt.**
Four model calls and this image call were made in this run; the image call has no row, because
`structured` and `generate` both build their receipt after the answer is parsed. Under the token
plan the model calls cost nothing, so nothing was lost today — but **the budget guard reads the
chain's spend from receipts before every call** (S-059, S-087, S-095), so a paid call that leaves
no row is spend the guard cannot see. It is named here and put to the owner as the next feature's
candidate rather than fixed inside the run that found it.

---

## S-134 | 2026-09-22 | The first reel's REQUEST is changed where it argued with itself, and nothing in the engine is: a caller's criteria are the caller's

**Chose.** In `scripts/real-reel.mjs`, and nowhere else:

- **`never-person` becomes "a recognisable real-world public figure"**, which is what the
  depiction policy means by it.
- **`show-lamp` hangs off claim `c2` rather than `c1`**, so the keeper and the lamp are not
  demanded of the same shot.
- **Each `presence` criterion says "seen whole within the frame"**, which is the framing Gate 1
  already judges.

**Nothing in `packages/` moved. No gate, no policy, no check and no test.**

**Why.**

- **The request argued with itself, and a real reconciler said so.** `show-keeper` REQUIRES a
  lighthouse keeper; `never-person` forbade "any real living person". Shown a picture of a
  lighthouse keeper, the reconciler judged `never-person` shown — correctly, on the words it was
  given. **A criterion that is violated by satisfying another criterion cannot be met by any
  picture**, and no number of retakes finds one.
- **Three candidates in a row were refused for clipping, at 15¢.** Gate 1 refuses a subject
  clipped by the edge of the frame (D-046). The plan put the keeper AND the lamp in shot 0, and
  two subjects whole in one 9:16 frame is a hard picture to make; D-047 stops after three, which
  is what it did. Spreading the two across claims and asking for whole framing is the caller
  saying what it wants, not the engine being told to accept less.
- **This is the first time any of these gates has judged a real picture**, and what it found is a
  badly written brief. That is the system working: the gate is what a badly written brief runs
  into, and it ran into it **before any clip was bought** — 15¢ of images, no video.
- **It is the caller's request, and the caller is this script.** `scripts/real-reel.mjs` holds one
  `SubmitRequest`, the same shape any caller sends (D-094). Changing what a caller asks for is not
  changing what the engine does with it, and the engine's answer to the old request — stop, with
  the reason named — stands unaltered and is recorded.

**Rejected.**

- **Loosening Gate 1, the clipping rule, or D-047's three strikes.** Never weaken a check to reach
  green: the gates found a real problem and said exactly what it was. Their verdicts are the
  evidence this entry is written from.
- **Running the same request again unchanged.** Three different candidates failed the same way,
  and one of the two causes — the contradiction — no redraw can fix.
- **Dropping `never-person` entirely.** It is a real criterion and the sort a caller will send;
  what was wrong was its words, not its existence.
- **Teaching the reconciler that a fictional keeper is not a real living person.** That is a
  prompt change in `packages/pipeline`, to a verified feature, to make one badly worded criterion
  work. The criterion is what is wrong.

**Caught by.** **Check 20**, which reads the script's own source, is unchanged and green: the
estimate is still printed before the submit, one request is still submitted, and a confirmation is
still read between them. The request's own shape is held by `reel-contract`'s schema, which
accepted it. **And the run itself**, whose verdicts are in `JOURNAL.md` for both wordings.

---

## S-135 | 2026-09-22 | The reasoning allowance is set for the tail, not the median, because thinking cannot be switched off on this wire — measured, not assumed

**Chose.** `DEFAULT_REASONING_TOKENS` is **24576**, so `max_tokens` is 26624. **Nothing else
moves**: the answer allowance stays 2048, the `<think>` strip stays, and the failure this guards
against is still reported by naming the budget rather than the schema.

**Why.**

- **A real reel died on it.** A planning call spent **6144 of 6144** completion tokens inside its
  reasoning block, finished on `length`, and answered nothing — D-019's third finding, live, and
  reported exactly as this adapter was built to report it: _"This is the token budget, not the
  answer's shape: raise the reasoning allowance."_ The adapter's own message names the remedy.
- **It is the tail, not the median.** The same two planning calls measured with room spend **3131
  completion tokens for four units and 2405 for eight** — comfortably inside the old budget. So
  4096 is not obviously too small, which is exactly what makes it dangerous: it works, until a
  call deliberates longer than usual and a run that has already spent stops for no reason a reader
  can see. **A budget set near the median is a run that fails sometimes.**
- **The cost of a budget that is never reached is nothing at all** — the comment that was already
  there, and it is still true: reasoning tokens are billed when spent, and the Token Plan covers
  them (S-129). What a larger allowance buys is that the tail finishes; what it costs is latency
  on the rare call that uses it.
- **THINKING CANNOT BE TURNED OFF HERE, AND NOW THAT IS MEASURED.** Gate 2 asks for the switch
  _"where the wire allows it"_, and D-019 refused to guess at one on the strength of the Hermes 404. Measured 2026-09-22 on MiniMax-M2.7: `reasoning_effort: 'minimal'`,
  `thinking: { type: 'disabled' }`, `enable_thinking: false` and
  `chat_template_kwargs: { enable_thinking: false }` were **each answered 200 with a `<think>`
  block still in the content**. **The wire does not allow it.** That is the third field this
  provider accepts and ignores in two days — `subtitle_granularity` (S-129), `response_format`
  (S-130), and now every thinking switch. **What this provider accepts is not what it honours**,
  and only the body proves which.

**Rejected.**

- **Raising it to just above what was measured** — 8192, say. The measurement IS the tail, and a
  tail has no ceiling a single sample shows. The budget is free until it is used.
- **Switching the planner to another model.** D-006's table is the authority on which role goes to
  which model, and the failure is not the model's: every model in this family thinks.
- **Sending a thinking switch anyway.** Four were tried and none worked; sending one that does
  nothing is a line that reads as a guard and is not one.
- **Retrying a budget failure with a bigger budget.** A second call for every first one, and it
  hides the thing worth knowing — how much this engine's calls actually need — behind a retry.

**Caught by.** The adapter's existing check-6 assertion that a call consumed entirely by reasoning
fails **naming the budget and the figure it spent**, which is what found this, and which is
unchanged. `DEFAULT_ANSWER_TOKENS + DEFAULT_REASONING_TOKENS` is asserted to be what `max_tokens`
carries, so the two cannot drift apart. **And the run itself**: the journal records the call that
died on 6144 and the two that were measured with room.

---

## S-136 | 2026-09-22 | An answer that is THE SCHEMA is refused as that; the preface that forbids it is chosen on its words, because the failure is too rare to measure

**Chose.**

- **`SHAPE_PREFACE` opens by forbidding the echo**: _"Answer with a JSON object of your own, never
  with the schema below and never any part of it."_
- **`jsonOf` reads for the echo BEFORE it parses**, and refuses it by name.
- **`echoedTheSchema`** is the test: `$schema`, `"properties"` or `"additionalProperties"` in the
  answer. They are the schema's own words and appear in no answer this engine asks for.

**Why.**

- **A real reel died on it.** With the shape said in the message (S-130), the planner answered
  **with the rendered schema document** rather than an object matching it. That is the hazard
  S-130's mechanism carries, and it is the price of the mechanism working: a schema in the message
  is a thing the model can copy.
- **The wording is NOT claimed to fix it, because it could not be measured.** Twelve probe calls
  — **six under each wording, across both groupings, at temperature 0** — echoed **0 times** and
  parsed **12 of 12**. So the two prefaces are indistinguishable on the evidence available, and
  the new one is chosen because **it names the failure that was seen**, at no cost. **This entry
  says so rather than claiming a fix**, because a claim that the next session reads as measured is
  the thing this repository's decisions exist to prevent.
- **What IS relied on is the refusal.** `jsonOf` said _"answered something that is not JSON"_ —
  true of the truncated echo it received, and misleading beside a quote that is plainly JSON. The
  operator reading that goes looking for a parse bug. Now the message says what happened.
- **The check is read before the parse**, because an echo cut off by the token budget does not
  parse either, and that is the shape that was actually seen.

**Rejected.**

- **Retrying on an echo.** A second call for every first one, and it would have hidden this: the
  run would have finished and nobody would know the planner ever did it.
- **Spelling the field names in prose instead of rendering the schema.** Measured to work — it was
  the first thing that made a planning call parse — but it is the copy-by-hand shape S-130
  rejected, and it would go stale against the schema with nothing to notice.
- **Dropping `$schema` from the rendering to make an echo harder to recognise.** Backwards: the
  marks are what make the echo recognisable, and a quieter echo is a worse one.
- **Claiming the preface fixes it.** Not measured. See above.

**Caught by.** **Check 6**, by addition: `minimax-chat-echo.json` — the rendering the planning call
sends, answered back — is refused with a message that names the echo and **does not** call it bad
JSON, and `echoedTheSchema` is asserted on the three marks and on a real answer.

---

## S-137 | 2026-09-22 | A call's timeout must cover the token budget it grants, or the budget is a lie — and the model port still has no retry, which is named rather than built

**Chose.** `DEFAULT_TIMEOUT_MS` is **600_000**, raised with `max_tokens` rather than separately.
**Nothing else moves**: a timeout is still `Unavailable`, still transient, still not retried here.

**Why.**

- **The two figures are one figure.** 180 s was set beside a `max_tokens` of 6144. S-135 raised
  that to 26624 for a reason that stands — a planning call really did need more — and **left the
  timeout where it was**, so the adapter granted a budget it would not wait for. Measured
  immediately: a reconciler call **answered nothing within 180 s** and the run stopped. The call
  was doing exactly what it had been allowed to do.
- **This is S-124's rule again, on a pair nobody had paired**: a figure that must agree with
  another figure has to move with it. Here they are not derived from one another — tokens per
  second is the provider's and not ours — but the direction is: **raising one without the other
  is a guaranteed timeout, not a risk of one.**
- **A transient is the most expensive failure this engine has**, because the model port does not
  retry: the run stops, and everything it has already bought is spent. This run had bought
  nothing; a run that timed out after the stills stage would have lost its images.

**Rejected.**

- **Lowering the reasoning budget back** to fit 180 s. S-135's measurement is what raised it, and
  a call that dies on its budget is the failure that was actually seen twice.
- **Deriving the timeout from `max_tokens` times a rate.** The rate is the provider's, it is not
  published, and a figure computed from a guess reads as measured. A bound with a stated reason is
  honest; an arithmetic one built on an invented constant is not.
- **Retrying the timeout here.** See below — it is a feature, not a line.

**Owed, and not built here.** **The model port has no transient retry.** The adapter classifies
`Unavailable` correctly and `../transient.ts` says in as many words that the counter and the
backoff are the worker's guarded ports' and that **for the model port it is not built**. Every
other port has one (S-096). A transient on any of this engine's model calls therefore stops the
run outright, and the later the call, the more it costs. **Named here, and put to the owner as the
next feature's candidate beside the lost receipt of S-133** — the two are the same shape: a call
that happened, and a run that cannot carry on from it.

---

## S-138 | 2026-09-22 | A closed question quotes the strings it will accept back, and says "character for character" — "by its name" is an invitation to rename, and it was taken

**Chose.** In `COMPARE_QUESTION` and the `compare` call, both **the adapter's own** (I-8):

- **Each subject is listed QUOTED**, `- "shelf"`, as `judgeCut` already lists its sentences.
- **The question demands the string back character for character**, and forbids renaming,
  expanding, translating or describing it — _"even if a more natural name for the thing is obvious
  from the pictures"_, because that is exactly what happened.
- **"by its name" is gone.** It is the phrase that invited the rename.

**Why.**

- **Measured on a real reel, 34¢ in and past Gate 1.** Gate 1S asked about the subject `shelf`;
  MiniMax-M3 answered `"Shelf of Bound Volumes"` — the plan's display name for that subject, and
  a perfectly good name. Gate 1S refused it, correctly: _"'Shelf of Bound Volumes' was not asked
  about"_ and _"'shelf' is answered 0 times, not once"_ (S-045's rule, every shared subject by
  name, once). **The run had already paid for five pictures and passed Gate 1 on shot 0.**
- **`shelf` unquoted reads as a topic, not as a string.** Given a picture of a shelf of bound
  volumes and the word `shelf`, a vision model writes down what it would call the thing. The
  quotes are what give the string edges, and `judgeCut`'s questions have had them all along —
  this is one closed question catching up with the other.
- **It is the adapter's question, so it is the adapter's fix.** I-8 puts these three questions
  inside the adapter precisely because they are fixed and nothing about a caller's brief may reach
  them. Nothing in `packages/pipeline` moved: what is asked about is still the ids Gate 1S sends,
  and what is accepted back is still exactly those.
- **Third time this provider has answered a plausible thing instead of the asked-for thing** —
  invented field names (S-130), the schema itself (S-136), and now a subject's display name. The
  pattern is the same: **where the answer's exact form is not pinned in the message, it is filled
  in with something reasonable**, and every gate this engine has is built on exact forms.

**Rejected.**

- **Sending the subject's display NAME instead of its id.** It would read more naturally to a
  vision model — and it is a `packages/pipeline` change to Gate 1S, to what is asked and parsed,
  for a verified feature, to work around a wording. The wording is what was wrong.
- **Matching the answer back loosely** — case-insensitively, or by prefix. That is Gate 1S's
  closed question stopping being closed: a subject answered about under another name is a subject
  the judge chose, not the one that was asked about.
- **Retrying a refused comparison.** The answer was not a failure of the call; it was the wrong
  question.

**Caught by.** **Check 7**, by addition: a compare call's question lists each subject quoted,
demands it back character for character, and **is asserted not to contain "by its name"** — so
the wording that caused this cannot come back unnoticed.

---

## S-139 | 2026-09-22 | A closed set in a schema is an ENUM, not a `superRefine` over a string — because a refinement renders into nothing, so the answerer never sees the constraint it is judged by

**Chose.** In `packages/pipeline/src/stills/prompts.ts`, the id fields of the two closed answers
become **`z.enum` over the very list they are already checked against**:

- `reconcileAnswer`'s `subjects[].id` over `subjectIds`, and its `criteria[].id` over
  `criterionIds`.
- `compareAnswer`'s `subjects[].subject` over `subjects`.
- **An empty list stays `z.string()`**, because `z.enum` has no empty form and a field accepting
  nothing would refuse before `namesEach` could say why.

**What is ACCEPTED does not move by one character.** `namesEach` still runs, and still requires
every id exactly once and no other. **This is the only change this feature makes in
`packages/pipeline`.**

**Why.**

- **A `superRefine` does not render into JSON Schema.** `namesEach` has always refused an id that
  was not asked about — but the shape the model is SHOWN said `{"type":"string"}`, so the
  constraint the answer is judged by reached the answerer **in nothing**. With the enum, the
  rendering the adapter puts in the message (S-130) now carries
  `"id":{"type":"string","enum":["keeper","log"]}`.
- **Measured, 98¢ in, with two clips already bought.** Asked about `keeper` and `log`, the
  reconciler answered `"Lighthouse Keeper"` and `"Handwritten Logbook"` — the plan's display
  names for those subjects — and the answer was refused. The run had passed Gate 1, Gate 1S and
  Gates 2 to 5 on shot 0, made its narration and bought two clips. **This is the most expensive
  place any of this session's failures landed**, and it is the fourth time this provider has
  answered a plausible thing where an exact one was required (S-130, S-136, S-138).
- **S-138 fixed the same failure in the adapter's own question and could not fix this one**, because
  this prompt and this schema are the pipeline's. The general answer is not better wording; it is
  **putting the closed set where it renders**, which is the schema.
- **It is strictly stronger, not looser.** Two things now refuse an unasked id instead of one, and
  the one that always did is untouched. A reader of the schema and a reader of the code now see
  the same rule.

**Rejected.**

- **Wording the prompts harder**, as S-138 did for the adapter's question. It is what this failure
  survived once already, it is four prompts to keep in step with four schemas by hand, and it is
  exactly the copy-by-hand shape S-124, S-125, S-127 and S-130 each rejected.
- **Sending display names rather than ids.** It changes what Gate 1 and Gate 5 ask about and parse
  — real behaviour of two verified features — to work around a rendering.
- **Accepting a display name and mapping it back.** The gate's question stops being closed, and a
  subject answered about under a name the judge chose is not the subject that was asked about.
- **Rendering the enum in the ADAPTER**, from the call's own list. The adapter does not know which
  field of a caller's schema is the closed one; only the schema knows, and that is the argument
  for putting it there.

**Caught by.** `reel-stills`' and `reel-takes`' own checks, unchanged and green — **129 tests**,
which is what "the accepted set did not move" means concretely. And the rendering itself: the
enum is computed from the same list `namesEach` is given, so a list that moves moves both, and the
two cannot disagree.

---

## S-140 | 2026-09-22 | An answer CUT OFF mid-JSON is the token budget, not the shape — and the longest thing this engine asks for is an observation, not a plan

**Chose.**

- **`DEFAULT_ANSWER_TOKENS` is 8192**, so `max_tokens` is 32768.
- **A body that will not parse and finished on `length` is refused by naming the budget**, and
  says which allowance to raise. Everything else that will not parse is still refused as bad JSON.
- **`finish_reason` is threaded to the parse** from both call paths, because it is the only thing
  that tells the two apart.

**Why.**

- **D-019's finding had two halves and only one was built.** `answerOf` already reports the budget
  when it is spent inside the `<think>` block and **nothing** is left. The other half is the block
  closing, the answer beginning, and the tokens running out **inside the answer** — the text is
  not empty, so it sails past that guard and arrives at `JSON.parse` as malformed. The adapter
  then said _"answered something that is not JSON"_, which sends the reader after a parse bug.
- **Measured on a real reel, 23¢ in.** A witness describing one picture answered
  `{"entities":[{"label":"older man with grey hair wearing a grey knit sweater",…` and stopped
  mid-object. **The comment on the constant was wrong about which call is longest:** it said _"a
  structured plan is the longest thing any call asks for"_, and 2048 was set for that. An
  observation names every entity in the picture **in the model's own words** (D-041's `label`, and
  `ambiguities`, and `unsafeDepictions`) — a picture with a dozen entities is several times a
  plan. **A figure set against the wrong call is a figure that was never measured.**
- **The same session raised the reasoning allowance for the same reason** (S-135) and left this
  one alone, because the failure that had been seen was the reasoning one. Both budgets are now
  set against the call that actually needs them.

**Rejected.**

- **Reporting every unparseable answer as the budget.** Most are not, and a message that guesses
  is the thing this entry is fixing.
- **Guessing from the text's shape** — an unbalanced brace, say. `finish_reason` is the provider
  saying it, and it is already in the body this adapter parses.
- **Trimming what an observation may say** — shorter labels, fewer ambiguities. That is D-041's
  content, judged by gates, changed to fit a budget.
- **Retrying a truncated answer with a larger budget.** Hides how much this engine's calls need,
  behind a retry, and pays for the first call twice.

**Caught by.** **Check 6**, by addition: `minimax-chat-cut.json` — an answer truncated mid-JSON,
`finish_reason: "length"` — is refused with a message that says **cut off mid-answer**, names
`finished on length`, names the `max_tokens` figure computed from both constants, and **does not**
call it bad JSON.

---

## S-141 | 2026-09-22 | A feature's four gates are named on the ONE line a journey reads, and the document is what changes — not the reader, which stays as strict as it was

**Chose.**

- **`docs/features/paid-path.md`'s `Gates:` line is one physical line**, as the other five feature
  files' already are. Nothing about what it SAYS moves: the same four gates, the same
  `APPROVED 2026-09-20 adversarial-reviewer`.
- **`scripts/journey.mjs` is untouched.** It still reads the gates with `/^Gates:(.*)$/m`, which
  sees one line.
- **`tests/feature-files.test.ts` gains a test**: every feature file names all four gates on the
  line that starts `Gates:`. **What each gate says is not constrained** — `video-edits` is
  `pending` on all four, and refusing that is the journey's job, not this test's.

**Why.**

- **Every journey of `paid-path` refused, saying a gate that IS approved is not.** The first thing
  session 46 ran was `node scripts/journey.mjs paid-path`, and it answered
  `REFUSED gate 'program-design' is not approved`. The gate was approved on 2026-09-20 by an
  adversarial reviewer and says so in the file — **on the second line of a wrapped `Gates:` line**,
  where the reader cannot see it. The approval and the reading disagreed, and the document was the
  one that was wrong: the other five files carry the whole line, over 100 characters, unwrapped.
- **The mechanism is not at fault and the wrap is not prettier's.** `.prettierrc` sets no
  `proseWrap`, so the default is `preserve` — the five long lines in the other feature files are
  proof it does not rewrap prose. **The wrap was typed**, when `paid-path`'s gates were written.
- **It fails in the safe direction, which is why it survived two days.** A gate below the wrap
  reads as NOT approved, so a journey refuses rather than passing something unreviewed. That is the
  right direction and it is still a fault: a refusal naming the wrong cause sends the next session
  looking for an unapproved gate, and **the six owed journeys could not start**.
- **The document changes, not the reader, because the reader is the thing every feature is judged
  by.** Widening it to read a continuation line makes `Gates:` a paragraph rather than a line, and
  then the question of where the gates stop has no answer a reader and a regular expression agree
  on. One line is a rule a writer can keep and a reader can state.

**Rejected.**

- **Widening `journey.mjs` to read until the blank line.** It is the verification script, changed
  to make a journey run — the shape this repository refuses on principle even when, as here, the
  approvals are genuinely there. It also invites the next wrap rather than catching it.
- **Detecting the wrap in `journey.mjs` and naming it in the refusal.** Better than widening, and
  still a change to the reader for something the writer can simply not do; the test says the same
  thing earlier, in `check.mjs`, to every feature file at once.
- **Fixing the file and writing nothing down.** The journeys were owed for a session and the reason
  they could not run was invisible. An entry is what stops the next wrap being diagnosed twice.

**Caught by.** **`tests/feature-files.test.ts`**, by addition, and so in every run of `node scripts/check.mjs`: the four
gate names are asserted on the `Gates:` line of every file in `docs/features/`. **A break campaign
of one**, written from a file rather than through a shell (CLAUDE.md's backslash trap, a fifth
session — and it fired again here, halving the regex in the new test before it was read back from
the file): the line re-wrapped exactly as it was, and the test fails naming `program-design` and
saying a gate below a wrap reads as unapproved. **And the journeys themselves**, which ran after it.

---

## S-142 | 2026-09-22 | The two gaps session 45 named get a feature of their own, `paid-failures`; a call the provider has already answered carries its receipt in the error it throws; and a paid call that made nothing gets a table of its own

**Chose.** Three things, each put to the owner with its alternatives and each answered on
2026-09-22.

- **A FEATURE OF ITS OWN**, `docs/features/paid-failures.md`, with its four gates written and
  reviewed before any implementation file — not a Slice 9 of `paid-path`.
- **A TYPED ERROR CARRYING ITS RECEIPT.** `Spent`, a class in **`packages/contracts`**, thrown by
  a real adapter once the provider has made something, carrying what the row needs: the port, the
  wire, the cost and a detail. The worker catches it, writes the row, and **rethrows it unchanged**
  — so nothing about how a run fails moves.
- **A TABLE OF ITS OWN**, `lost_call`, rather than a widened `generation_receipt`. The cost reaches
  `job.cost_cents` exactly as a made picture's does, which is what the budget guard reads; and
  `imageCallCount` — D-027's six-call cap — is changed to count both tables, so **a paid call that
  made no picture spends one of the six**.

**Why.**

- **A feature of its own, because `paid-path`'s approved scope excludes what this needs.** Its Gate
  1 says in as many words that it _"builds no new stage, gate, table or route"_, and a reviewer
  approved that sentence on 2026-09-20. B1 adds a table and a migration. A Slice 9 would widen a
  feature past the text its review was written against, by an amendment nobody adversarial has
  read — which is the drift the gates exist to catch. The cost is stated and accepted: gates plus a
  review is most of a session, so **the reel that passes Gate 7 very likely waits for the next one.**
- **The receipt travels in the error because the money is already spent by then.** A cost here is
  **our configured rate applied to what we asked for** — `imageCostCents(entry, …)`,
  `videoCostCents(entry, seconds)` — so it is fully known at the moment the provider answers, and
  nothing in the answer is needed to compute it. What was missing was not the figure; it was a path
  from an adapter that may keep no durable state to the worker, which is the only place that knows
  both a stage and a table.
- **`Unavailable` is the precedent, and it is a class for the same reason (S-096, S-122).** A
  thrown error recognised by its SHAPE would be produced by a bug of the same shape; a class
  nothing else constructs cannot be. `Spent` is that a second time.
- **IT MUST LIVE IN `packages/contracts`, and this is the part that was not obvious.**
  `worker-no-providers` forbids `apps/worker` importing `packages/providers` (S-038), so the worker
  cannot name a class declared there — which is exactly why `Unavailable` has never been seen by
  the worker, and why the model port has no retry today (S-137). Contracts imports nothing internal
  and already holds runtime values beside its types (`PROVIDER_ADAPTERS`, `anyReal`), so both sides
  can name one class without a new boundary or a new package.
- **A table of its own, because `generation_receipt` is joined to a picture.** Every row there has
  a `picture_id` and a picture row made in the same transaction (S-036). A call that made nothing
  has neither. Widening the column to accept a null would leave every existing reader of that table
  to exclude the picture-less rows by hand, and **one that forgot would fail silently** — a receipt
  row read as a picture. A separate table leaves every existing reader's meaning exactly as it is
  and makes the new rows something a reader has to ask for.
- **And the six-call cap has to count them, or the cap leaks the same way the budget does.**
  D-027 bounds a run at six image calls; `imageCallCount` reads `generation_receipt`. Two calls in
  session 45 answered 200, made nothing readable, and counted for nothing — so a run could pay for
  eight. Counting both tables makes the cap **stricter**, never looser.

**Rejected.**

- **A Slice 9 of `paid-path`.** See above: the approved scope excludes a new table. Put to the
  owner with the cost of each; not chosen.
- **Splitting the two gaps** — B1 its own feature, B2 a slice. They are one shape, said so in
  S-133 and S-137 on the same day, and both are about what happens after a call that has already
  spent. Two features would put the model port's retry and the receipt it may have to write in
  different reviews.
- **A new answer arm on every port** — `{ kind: 'spent', receipt }` beside `made` and
  `unavailable`. Honest in the types rather than in a thrown class, and it moves `LanguageModelPort`
  and `ImagePort` in `packages/contracts`, every stand-in, and every call site in
  `packages/pipeline`: four verified features change so that one failure path can be recorded. Put
  to the owner; not chosen.
- **Recording a receipt from the estimate BEFORE the call and correcting it after.** It is the only
  shape that also covers a call whose answer never reached us at all — and it makes a receipt stop
  meaning _"one call that returned"_ (D-084), leaves rows for spend that may never have happened,
  and would have to be unwound by every path that fails before sending. Put to the owner; not
  chosen.
- **Widening `generation_receipt` with a nullable `picture_id`.** One table and no change to the
  cap's arithmetic, and it hands every existing reader a row shape it was not written for. See
  above.
- **Letting the adapter write the row.** `packages/providers` holds no durable state, and that is
  the rule this whole shape exists to keep.

**Caught by.** `docs/features/paid-failures.md`'s own checks, written in its Gate 3 and each one a
test: that every adapter with an answer in hand throws `Spent` and every failure before the
provider made anything does not; that the worker writes one row, adds the cost to the job row and
rethrows unchanged; that `spentCents` and `imageCallCount` both count it, so the guard refuses the
next call it should; and that `apps/worker` still imports no `packages/providers`, proven by
`drift --prove` on the rule that says so. **This entry is what those checks answer to**, and the
feature's journey is what says they ran.

**Confirmed-by.** The owner, 2026-09-22, shown all three questions with their alternatives and the
cost of each, chose the feature of its own, the typed error carrying its receipt, and the table of
its own.

---

## S-143 | 2026-09-22 | The clip a re-buy replaces goes on the record: `VideoAnswer`'s unavailable arm gains an optional `spent`, and `reel-takes`' check 1 stays exact by naming it

**Supersedes:** nothing. It completes **S-125**, whose named limit — a transient after fal has
accepted the job **re-buys the clip** — is kept exactly as it is, and whose second payment was the
only one the budget guard could see.

**Chose.**

- **`VideoAnswer`'s `{ kind: 'unavailable' }` arm gains `spent?: LostCall`.** Exactly one case sets
  it: a **429 or 5xx on the DOWNLOAD**, which comes after the job has completed, so fal has made
  the clip and billed for it. Every other unavailable answer — a busy submit, a poll, a wait that
  runs out — leaves it absent, because nothing was made.
- **The guarded video port writes the row and adds the cost BEFORE it sends again**, so the record
  carries the clip that was paid for and then the clip that replaced it.
- **`NarrationAnswer`'s arm is unchanged.** T2A's re-buy (S-123) costs nothing under the Token Plan
  (S-129): there is no figure to lose, and an optional field nothing sets is a field that rots.
- **`reel-takes`' check 1 is amended by NAMING the field, not by loosening.** It asserted
  `Same<keyof VideoUnavailable, 'kind' | 'detail'>`; it now asserts
  `'kind' | 'detail' | 'spent'`, that `spent` is `LostCall | undefined`, and that the whole arm is
  that exact object type — **so a third key still fails it**, proven by adding one.

**Why.**

- **It is the largest leak of the three this feature closes, and it is not a thrown failure.** A
  clip is the most expensive call this engine makes — 168¢ of the first real reel's 202¢ (S-140's
  session). S-133's shape is a call that THROWS after spending, and `Spent` carries the row out
  through the throw. A re-bought clip does not throw: the adapter answers `unavailable` and the
  worker's counter sends the whole call again. **An answer is the only channel there is**, so the
  row has to ride on the answer.
- **Keeping the re-buy is S-125's decision and it stands.** The owner was shown it and chose it
  over failing a reel that every earlier shot had been paid for. This entry does not reopen it: it
  makes the cost of it visible, which is what the budget guard needs to stop a run at its cap
  rather than past it (S-035, S-095, D-100).
- **The check caught it, which is the check working.** The change was made and
  `tests/reel-takes-ports.test.ts` failed on the same commit — a verified feature's type assertion
  refusing a field that had not been declared to it. That is the order this repository wants: the
  rule fires, and then a decision says why the rule's text moves.
- **Exact, still.** The arm is pinned as a whole object type rather than as a key list alone, so
  the amendment is narrower than what it replaced, not wider: a `spent` of the wrong type now fails
  too, and it could not have before.

**Rejected.**

- **Throwing `Spent` on a post-completion download transient instead.** It would need no contract
  change and no amendment — and it reverses S-125 on the quiet: the re-buy stops, and a reel that
  has paid for every earlier shot dies of one 429 on a file fetch. A decision is not reopened by a
  side effect of another feature.
- **Leaving the re-buy invisible and recording nothing.** The whole feature exists because a paid
  call the guard cannot see is spend that leaks; the clip is where the money is.
- **Giving `NarrationAnswer` the same field for symmetry.** Nothing would ever set it. When a
  narration costs money it gains what the clip has, and `paid-failures`' Deferred says so.
- **A worker-side count of re-buys instead of a row.** The guard reads cents from job rows, not
  counts, and a count cannot be priced later.
- **Widening check 1 to "a kind, a detail and anything else".** That is the weakening this
  repository forbids: it would have admitted the next field with nothing to notice.

**Caught by.** **`reel-takes`' check 1**, amended as above and **broken deliberately**: a fourth key
added to the arm (`retries?: number`) fails it, and the file was restored. And
`docs/features/paid-failures.md`'s check 4, which asserts the row and the job row's figure for the
re-buy case; and `reel-takes`' journey, re-run in that feature's last slice.

---

## S-144 | 2026-09-22 | A rendered enum is not enough for a vision call: the closed sets are SAID in the question too, computed from the shape — and this is not claimed as a fix, because it was measured and it is a tail

**Chose.**

- **`closedSetsSaid(shape)`** walks the rendered JSON Schema and returns one line per closed set —
  `- entities.position: exactly one of "left", "centre", "right"` — under `CLOSED_SETS_PREFACE`,
  which also says what to do with the thing the model would rather have said: _"Give the value from
  the set even when a more exact description of what you see is available, and put that description
  in `ambiguities` instead."_
- **It is appended to the QUESTION'S OWN text part**, not added as a part of its own, so a vision
  call still carries what checks 6 and 7 assert it carries: the question first, the media as bytes
  after it, the rendered schema last.
- **The lines are computed from the shape**, never typed beside it: a set that gains a value gains
  the sentence.
- **Nothing in `packages/pipeline` moves.** `position` is still `left | centre | right`, and an
  answer outside it is still refused.

**Why, and what the measurement actually says.**

- **A finished run died on it, 152¢ in.** 2026-09-22, the reel with four different scenes: four
  clips bought, three shots through Gates 2 to 5, and the run failed on
  _"the witness's answer for a1-shot-3-take-1 is not a clip observation: lighting: Invalid option:
  expected one of "bright"|"dim"|"mixed"|"silhouette""_. **Gate 7 was never reached.**
- **The enum DOES render.** `shapeAsked` puts the whole JSON Schema in the message (S-130), and
  `lighting` and `position` carry their values in it. **So S-139's answer — put the closed set where
  it renders — was already in force here, and the model answered outside the set anyway.**
- **Measured on the clip that killed the run**, at temperature 0, calls that cost nothing under the
  Token Plan (S-129):

  | wording                       | calls | answers outside a closed set | what was answered                                                    |
  | ----------------------------- | ----- | ---------------------------- | -------------------------------------------------------------------- |
  | as shipped, the enum only     | 14    | **2**                        | `"scattered between the tall pillars"`, `"bottom half"`, `"top"`     |
  | the sets said in the question | 12    | **1**                        | `"foreground"`, `"background"` — the NEIGHBOURING field's vocabulary |

- **So the wording is NOT claimed to fix it**, and this entry says so rather than implying a cure:
  2 in 14 and 1 in 12 are not distinguishable, and the failure survived the change. It is chosen
  because it costs nothing, because it names the failure that was seen, and because the alternative
  readings of the evidence are worse (below). **This is S-136's honesty, a second time.**
- **What the values say about the cause.** They are not synonyms and not spellings. They are the
  model **preferring a more precise thing to say** over the set it was given — a phrase where a
  token was asked for, and then, under the new wording, the adjacent field's set. No rendering
  forbids that, and no wording has been shown to.
- **What it costs when it happens is the whole run.** The observation is Gate 5's, which is reached
  only after that shot's clip is bought: at four clips a reel, **an 8% per-call failure is a run in
  three**, and the run has already spent everything by then.

**Rejected.**

- **Widening the pipeline's schema** to accept `"center"`, `"top"` or a free phrase. That is
  weakening a gate's closed set so a model's answer passes, which is the one thing this repository
  never does. The set is what makes Gate 5's reading of a clip comparable at all.
- **Normalising a near-miss in the adapter** — mapping `"center"` to `"centre"`, `"top"` to
  something. The adapter would be deciding what the answer meant, and `"scattered between the tall
pillars"` has no answer to be mapped to. A closed question whose answers are repaired is not
  closed.
- **Retrying the observation.** It is the shape most likely to work — the draws look independent,
  so a second ask would take a run's chance of dying from about a third to about a fiftieth — and
  **it is not this entry's to take**: an adapter never sends again (S-096), and the stage that
  parses is `packages/pipeline`, a verified feature. **Put to the owner as its own decision, with
  the figures above.**
- **Claiming the wording fixes it.** Not measured. See above.

**Caught by.** **Check 7**, by addition: a vision call's question is asserted to carry
`CLOSED_SETS_PREFACE` and one exact line per closed set — `framing`, `lighting`,
`entities.position`, `entities.prominence` — with the values read from the pipeline's own schema,
and the text-part count asserted so the sets cannot migrate into a part of their own and move the
media or the shape. **Broken deliberately**, from a file rather than through a shell: `closedSetsSaid`
made to return nothing fails check 7 naming the question, and the file was restored.

**Owed.** Whether an unparseable observation should be asked again, and by whom. The figures are in
this entry; the decision is the owner's.

---

## S-145 | 2026-09-22 | A brief whose four units share no subject makes the stills stage a no-op, and the reel is made from words — measured, and the finding is the brief's, not the engine's

**Chose.** Nothing in `packages/` moves. This entry **records a measured consequence of a caller's
request** and puts the choice it implies to the owner (below).

**Why.**

- **The reel of 2026-09-22 made no pictures at all.** The run's own events:
  `stage.started stills` and `stage.finished stills` **in the same 0.0 s**, `image 0 receipts 0c`,
  and every one of the four clips bought on `fal-ai/minimax-h3-turbo/**text-to-video**`. The reel
  was made **from words**, and cost **152¢** rather than the 202¢ the earlier brief cost.
- **The cause is the brief, and it is the same change that was made to satisfy Gate 7.** Session
  45's cut was refused for repeating itself — four shots of a keeper, a logbook and bound volumes
  (S-140's session). The rewrite made the four units **genuinely different scenes**: a lamp at
  night, a page under lamplight, an instrument box on grass, open water at first light. **Different
  scenes share no subject**, and D-027's ladder makes a canonical picture for a subject that
  RECURS: with nothing recurring, there was nothing for the stills stage to make, and D-050's step 2
  took every shot to text-to-video.
- **So the two things pull against each other, and that is the finding.** Gate 7 asks whether every
  shot shows something no other shot repeats. The stills stage exists to carry identity ACROSS
  shots (D-026, D-027). A brief that satisfies the first by sharing nothing removes the second's
  reason to run — and the engine's own promise, _"approved stills become a finished video"_, is
  bypassed without a single gate refusing anything.
- **Nothing was wrong with what the engine did.** Every stage did what it is specified to do, and
  the cheaper reel is the honest consequence of a request with no recurring subject. **The engine
  is not the finding; the brief is.**

**Rejected.**

- **Making the stills stage run anyway**, on a subject that appears once. It would buy pictures for
  identity that nothing needs carried, against D-027's own reason for the ladder.
- **Reading the earlier brief as the right one.** Its cut was refused by Gate 7 on a true judgement
  about itself.
- **Deciding the next brief here.** It costs about 150–200¢ to find out whether any particular
  compromise passes Gate 7, and which compromise to buy is the owner's. See below.

**Caught by.** The run's own record: `image 0 receipts`, the two `stage` events at the same instant,
and four `text-to-video` receipts, all of them in `JOURNAL.md` beside this entry. And by
`reel-stills`' own checks, which are unchanged and green — **nothing about the stage moved**.

**Owed.** Which brief to spend the next ~200¢ on: one with a subject that recurs across two of its
four shots and different scenes for the rest, or another shape entirely. The owner's.

---

## S-146 | 2026-09-22 | An observation the gate cannot parse is asked again ONCE, and that needs its gates before its code — the owner's, with the figures in front of them

**Chose.** The direction, and nothing else today.

- **An unparseable observation is asked again once.** Not a wording, not a normalisation, not a
  wider schema: the same call, sent a second time, when the answer the stage parses is refused.
- **NO IMPLEMENTATION FILE IS OPENED FOR IT IN THIS SESSION.** It breaks a written rule — _"an
  adapter never sends again"_ (S-096) — and it lands in either `packages/contracts` and
  `packages/providers` (a new arm on the model port) or `packages/pipeline` (a retry where the
  stage parses), and that second one is a verified feature. **Gates before code**: it is a feature
  of its own or a slice of one, with its four gates written and reviewed, and `PROMPTS/047` is
  where it starts.
- **The next reel's brief keeps one subject recurring across two of its four shots**, with the four
  scenes still different in place, object and hour.

**Why.**

- **The figures are S-144's, and they are what the owner decided on.** Measured at zero cost on the
  clip that killed the run: an answer outside a closed set in **2 of 14** calls as shipped and **1
  of 12** with the sets said in the question. The draws look independent, so **one retry takes a
  four-clip run's chance of dying here from about one in three to about one in fifty** — and the
  retry buys nothing, because model calls are covered by the Token Plan (S-129).
- **Wording has now been tried twice and measured twice**, and neither time did it move the rate:
  S-136's preface against the schema echo, and S-144's closed sets against the free-text answer.
  **The lever that is left is the second ask**, and the reason it was not taken earlier is a rule
  written for a different failure: S-096 forbade an adapter retrying because a retry would spend
  again and would hide a provider's transient behind a counter nobody could see. **Neither is true
  of a model call that answered nothing usable**: it costs nothing, and the thing it hides —
  how often this wire answers outside a rendered set — is exactly what S-144 has now measured and
  written down.
- **The brief keeps a recurring subject because the two demands pull against each other** (S-145).
  Gate 7 refuses a cut that repeats itself; the stills stage exists to carry identity ACROSS shots,
  and a brief with four unrelated scenes gives it nothing to do — which is how a reel came to be
  made entirely from words, 152¢, no picture. One subject in two shots is the compromise neither
  run has tried: the stills stage runs, Gate 1S has something to compare, and the cut still shows
  four different things.

**Rejected.**

- **Building the retry now, in this session, against the measurement.** It would be an
  implementation file for a feature with no gates, which is the rule this repository is built on.
  The owner chose the direction; the gates are what say where it lives and what catches it.
- **Refusing the answer in the adapter instead.** Put to the owner: it fails the run at the same
  moment for the same money and buys a better message, not a better outcome.
- **Leaving it and keeping the wording.** Put to the owner: about one run in three would die the
  same way, and every one of those has already bought its clips.
- **Running the all-different brief again** because it is cheaper. Put to the owner: it reaches
  Gate 7, which nothing has ever passed, and it bypasses the stills stage entirely — so _"approved
  stills become a finished video"_ would stay unproven on real providers.

**Caught by.** `PROMPTS/047`, which is where the gates are written, and this entry, which is what a
reviewer reads them against. **Nothing in the code claims any of it yet** — the only thing this
session shipped on the subject is S-144's sentence and its check, which are honest about being a
wording that was measured not to work.

**Confirmed-by.** The owner, 2026-09-22, shown the two tables and all three alternatives on each
question, chose the second ask and the recurring subject.

---

## S-147 | 2026-09-23 | The second ask lives at the gate that parses — Gates 1 and 4 call `observe` once more when their own schema refuses the answer — and the adapter still sends each call exactly once

**Chose.**

- **A new feature, `second-ask`** (`docs/features/second-ask.md`), with its four gates written and
  reviewed before any implementation file is opened (S-146).
- **The retry lives in `packages/pipeline`, at the two gate boundaries that parse an observation**:
  Gate 1's witness step (a still, `witnessObservation`) and Gate 4 (a take's clip,
  `clipObservation`). When the gate's own schema refuses the answer, the gate makes **the same
  `observe` call once more** — the same picture or clip, temperature 0, nothing added — and parses
  that. **A second refusal fails the run exactly as one refusal does today**, with the second
  answer's issues as its detail. There is no third ask.
- **Both witnesses**, because stills and clips answer the same closed sets (`framing`, `lighting`,
  `entities.position`, `entities.prominence`, `entities.faceVisible`); the failure was measured on a clip (S-144) and
  nothing about it is specific to one.
- **The adapter is not touched, and S-096 stands as written**: an adapter still sends each call it is
  given exactly once, and never parses an observation. The gate calls the port twice; the port
  answers each call once.
- **Each ask is a call, and each call keeps its receipt.** The recording port already writes a
  `model_receipt` as a call returns, before the gate parses it, so a second ask leaves **two
  `observe` receipts** for that picture or take. **The observation is tied to the LAST of them**
  (receipts carry an autoincrement id); an earlier one is the refused ask. With no refusal there is
  one receipt, exactly as today.

**Supersedes:** **S-042**, in part — _"one that does not parse finishes the run `failed`"_ becomes
_"one that does not parse is asked once more, and a second that does not parse finishes the run
`failed`"_. Everything else S-042 says stands: the witness step is recorded only when an answer
parses, a picture cut off there has no Gate 1 verdict outcome and no observation id, and no
malformed observation reaches a consumer. **And D-045's I-15, in its count and not its reason** —
_"one vision call per generated image"_ becomes _"one OBSERVATION per image or clip, from at most two
witness calls, of which only the one that parses is ever recorded"_. I-15's reason is kept whole: _"a
second pass over one image produces a second record that can disagree with the first, with no rule for
which wins"_ — a refused answer is never a record (no observation row, no verdict, nothing downstream
reads it), so there is still one record, and the rule for which counts is that only one of them can.
D-033's _"no second vision call is made"_ is about the score and the clip prompt reading Gate 1's verdict,
and still holds: neither makes a call. **And S-037's _"exactly one `observe` receipt per picture"_, and S-072's _"one
`observe` call"_ for Gate 4** — each becomes one when the answer parses, two when the first was refused. **And
D-045's premise that _"at temperature 0 a duplicate call returns a duplicate answer"_**, measured false on this
wire by S-144: D-031 rule 5's replayable score is replayed from the one stored observation, never by asking
again, and stands. S-126's argument — a second `observe` makes the join ambiguous, _"a silent corruption"_ — is
answered in `second-ask`'s Gate 2: only one answer can become a record, and the receipt counts are asserted.
**And the key-tie in `ModelReceipt`'s two doc comments and `recordingPort`'s header** —
_"the one `observe` receipt whose `pictureIds` [or `takeIds`] is its picture's [or take's]"_ — which
becomes _"the last"_.

**Why.**

- **The only schema that refuses lives at the gate.** The adapter's shapes exist to ASK for a shape
  and are commented as never parsing an answer, so that the gate's refusal stays reachable (D-041,
  S-042). A retry in the adapter would need its own copy of the schema to know when to retry, and
  two copies of one closed set is the drift this repository exists to catch.
- **It keeps every call on the record.** An adapter that retried inside one `observe` would return
  one receipt for two paid-for calls, and the first call's tokens would vanish (D-005, D-084).
- **It works identically for the stand-in**, so every check is written against the fake model with
  no provider, no key and no spend (S-111).
- **The cost is three verified features amended and re-journeyed**, `reel-stills` (Gate 1),
  `reel-render` (Gate 4) and `reel-takes` (a check whose fixture refuses a take's observation) —
  the owner accepted the amending of verified features when choosing the gate boundary.

**Rejected.**

- **A new arm on the model port** (`packages/contracts` and `packages/providers`), the adapter
  checking its own copy of the shape and sending again. Put to the owner 2026-09-23; rejected for
  the two copies of the schema, the adapter parsing what it is written never to parse, and the lost
  first receipt.
- **Gate 4 only**, where the failure was measured. Put to the owner; rejected because Gate 1 asks the
  same closed sets and would die the same way.
- **Asking again on a thrown call** — `Spent`, a fault, or `Unavailable`. A fault is a request that
  was wrong; `Unavailable` already has the worker's counter (S-137, S-142); and a `Spent` observation
  (an answer that is not JSON, is the schema, or is cut off) is the adapter failing to READ what it
  was given, not the gate refusing a value. Those stay one send and a failed run.
- **Widening a closed set or normalising a near-miss** — S-144's rejections, unchanged.
- **A third ask, or a counter.** Once is the owner's figure (S-146); a loop has a provider's bad day
  at the end of it.

**A correction to S-146's figure, which is not edited.** S-146 says one retry takes a four-clip run
from about one in three to _"about one in fifty"_. At S-144's 1 in 12 per call and independent draws
it is 1 − (143/144)⁴, **about one in thirty-five**; one in fifty would need about 1 in 14. The
decision does not move with the figure.

**Caught by.** `second-ask`'s checks (its Gate 3), in `tests/second-ask-*.test.ts`: a first refusal
then a parse accepts the second observation with two receipts; two refusals fail the run after
exactly two calls; a call that throws is made once on the first ask and twice after a refusal,
and its error comes out unchanged; the two schemas equal a hand-typed JSON Schema snapshot.
`reel-stills`' check 46, `reel-render`'s check 23 and `reel-takes`' labels check (`r14-failed`) are
amended by giving their refused witness TWO answers AND asserting today's exact words and two
`observe` receipts — without both, each would stay green on the stand-in running out of answers,
which is a thrown call and not a refusal.

**Confirmed-by.** The owner, 2026-09-23, on both questions: the gate boundary, and both witnesses.
