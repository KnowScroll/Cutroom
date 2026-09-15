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
