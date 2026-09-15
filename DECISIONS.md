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
