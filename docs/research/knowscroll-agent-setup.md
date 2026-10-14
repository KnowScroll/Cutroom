---
status: research
authority: none — a record of what was read and measured, not a decision; a choice made from it is an S- entry
---

# What KnowScroll's repository does that this one could take

Read on 2026-10-14 from `KnowScroll/knowscroll`, branch `dev`, by shallow sparse clone (`docs`,
`.claude`, `scripts`, plus `git show` for files outside those paths). 2053 tracked files, 1064 of
them under `docs/`. Nothing was copied into this repository; every path below that starts `docs/` or
`scripts/` is **theirs** unless it is marked as ours.

**That repository is not the one our pin reads.** `steering-ref` is `Legend101Zz/Knowscroll-v2` at
`e05e9f0`. In `KnowScroll/knowscroll` the whole D-series sits at `docs/archive/legacy-decisions.md`
under the header _"Historical decisions for Knowscroll-v2. These are provenance, not this
repository's operational instructions. New ADRs selectively adopt or supersede choices."_ Its live
authority is 51 ADRs in `docs/decisions/`. See "The authority gap" at the end.

Every item is marked **ADOPT**, **ADAPT**, **MEASURE FIRST** or **REJECT**, with what was actually
checked. Each adoption is a choice between real alternatives, so each one needs an `S-` entry naming
what it rejects and how a violation is caught (CLAUDE.md rule 2); anything adding a route, table,
job, screen or check needs its four gates (rule 1).

---

## Measured here, before recommending anything

Run on this machine, this tree, 2026-10-14:

| What                                            | Measured                                                             |
| ----------------------------------------------- | -------------------------------------------------------------------- |
| `eslint .`                                      | 6 255 ms                                                             |
| `prettier --check .`                            | 14 073 ms — code-only 5 740 ms, Markdown-only 7 005 ms               |
| `tsc -b`, warm                                  | 234 ms                                                               |
| Tracked Markdown                                | 3 674 527 bytes                                                      |
| `openDatabase()`, migrate on open, 8 migrations | 36.4 ms per fresh database                                           |
| `copyFileSync` of an already-migrated `.sqlite` | 0.8 ms                                                               |
| Our suite                                       | 149 test files, `--test-concurrency=1`, 1413 s recorded at `127adc5` |

Lint plus format is about **20 s on every `--slice` run**, and Markdown is a third of it.

---

## 1. CI, so a 23-minute suite stops blocking the session — ADOPT (as `hosted-checks`)

**Theirs.** `.github/workflows/checks.yml`, three jobs: `backend`, `web-journey`, `android`. The
backend job runs `format:check`, `lint`, `knip`, `typecheck`, `contracts:check`, `test`, web
typecheck and tests, a release build plus smoke test, then **nine journey runners as ordinary
steps**. `web-journey` runs a real Vite server, a real API and worker, and Chromium through
Playwright. `android` assembles a shrunk, signed release with a keystore generated on the spot.

Details worth copying rather than rediscovering:

- Every action pinned to a commit SHA with the version in a comment
  (`actions/checkout@3d3c42e… # v7.0.1`).
- ffmpeg installed explicitly, with the reason in the file: _"ubuntu-latest (24.04, image
  20260907.300.1) does not ship ffmpeg/ffprobe in its default software list (confirmed against
  actions/runner-images' own Ubuntu2404-Readme.md…)"_.
- PostgreSQL as a service container with `--health-cmd pg_isready`.
- `timeout-minutes: 30` on the browser job: _"Bounds a hang in cleanup, which the runner's own
  watchdog no longer covers once it is stopping."_
- Evidence uploaded on `if: failure()`, and on `always()` for interruption receipts,
  `retention-days: 7`.
- `PLAYWRIGHT_BROWSERS_PATH` set at job level so the install step and the runner agree.

**Why better.** Our 1413 s suite runs in the session, so the session waits. Theirs runs elsewhere, on
every push, and **every journey they have ever written keeps running forever**. Ours runs once, by
hand, at one commit; nothing re-runs `cut-rules`' journey when `reel-render` changes.

**Here.** `hosted-checks` has gates written and round 1 answered, on hold. This is the prior art for
its Gate 2: lift the ffmpeg step, the pinned SHAs, the failure-artifact upload and the job split
instead of designing them.

**Cost, honestly.** Ubuntu is a second platform for us: PATH-only ffmpeg from WinGet, a CRLF working
tree, `tests/line-endings.test.ts`, and the known PATH-only child transient. S-183 already says a
hosted run is corroboration and carries no trailer; that stays true, so CI buys wall-clock and
regression coverage, not verification authority.

## 2. Biome in place of eslint + prettier, for code only — ADOPT

**Theirs.** One Rust binary. `format:check` is `node scripts/format-query-sql.mjs --check && biome
format apps/api apps/worker packages tests scripts ops`; `lint` is `biome check
--formatter-enabled=false apps/api apps/worker packages`, then a **four-rule subset for
`tests scripts ops`** (`--only=correctness/noUnusedImports`, `noUnusedVariables`,
`noUnusedFunctionParameters`, `style/useImportType`), then their architecture script. `biome.json`
pins the schema to its exact version, sets `lineWidth: 80` and single quotes, and disables the rules
they disagree with by name.

**Checked before recommending.** Our `eslint.config.mjs` is `js.configs.recommended` plus
`tseslint.configs.recommended` plus three rules, and sets no `parserOptions.project` — so **we use no
type-aware lint rules**, which are the one thing Biome cannot replace. Migration is viable.

**Why better.** ~12 s back on every targeted run, three devDeps and two config files gone, and the
four-rule subset for test files stops agent-written tests failing on style.

**Here.** Biome for `.ts`/`.mjs`/`.json`; **keep prettier for Markdown** — Biome does not format it,
and 3.6 MB of our docs are prettier-formatted today. That splits `format` into two steps, which
`--changed` can then use: document work needs only the Markdown half.

## 3. A live state probe, not a prose summary — ADOPT

**Theirs.** `pnpm state` → `scripts/state.ts` prints JSON: `observedAt`, git HEAD, every
`schema_migrations` row, `job` counts grouped by status, the last five `worker_heartbeat` rows with
`last_seen > now()-interval '3 seconds' AS recently_seen`, whether `/health` answers, and a
`capabilities` block of explicit `false`s. `CONTRIBUTING.md` requires it: _"Check `git status`, fetch
remote, and inspect `pnpm state` when changing runtime."_

**Why better.** Our session-start hook prints `docs/context.md`, true as of its last write. Theirs
reads the running system. The `capabilities: {reasoning: false, cutroom: false}` block is the good
part — the probe states what is _not_ live, so a fresh session cannot infer it from a module's
existence.

**Here.** One script over our SQLite and filesystem: HEAD, the last run and what ended it, receipts
by kind and spend against the ceiling, queue depth by state, artifact root present, ffmpeg and
ffprobe on PATH, service answering or not. Called by the session-start hook. It replaces a
`run-reader` call at session start — zero model tokens, current by construction.

## 4. Backdating instead of waiting — ADOPT when first needed

**Theirs.** `scripts/lib/backdate.ts`: `ALTER TABLE ledger DISABLE TRIGGER ask_ledger_no_update`,
`UPDATE ledger SET created_at = created_at - interval '1 day'`, re-enable — inside the caller's
transaction, with a header explaining that an Ask is immutable by migration 0009 and the guard is
lifted for exactly this update. It is how a seven-day retirement contract is proved in seconds.

**Why better.** An elapsed-time rule otherwise costs real time or forces a fake clock into
production code.

**Here.** Budget windows, lease expiry, `resume-failed`'s staleness. A helper under `tests/` that
moves rows in a disposable database, never in `data/`.

## 5. The stale-generated-artifact check — ADOPT

**Theirs.** `"contracts:check": "tsx scripts/export-contracts.ts && git diff --exit-code --
packages/contracts/http-v1.schema.json"`, as a CI step, commented _"this fails if it was not
regenerated"_.

**Why better.** Three lines, and a generated file can never silently diverge from its source.

**Here.** `db/migrations` against the Drizzle schema, and the two SDK package manifests. Cheap enough
for `--code`.

## 6. `knip` for unused files, exports and dependencies — ADOPT

**Theirs.** `knip@6.39.0`, one devDep, `knip.json` with per-workspace `entry` and `project` globs,
`includeEntryExports: true`, `ignoreWorkspaces: ["apps/web"]`, and
`ignoreBinaries: ["ffmpeg","ffprobe","pg_config","psql","journalctl"]` — our situation exactly.

**Checked, and the check is the argument for the tool.** I tried to answer "do we have dead exports?"
with two hand-written text scans. The first said 226, the second 620, and both were demonstrably
wrong: they named `takeCriteria` (used at `packages/pipeline/src/clips/index.ts:342`) and `startApi`
(used at `apps/service/src/service.ts:151`). **I cannot tell you whether we have dead exports, and
that is the finding** — the same lesson as D-073, where a rule stated against import text was never
buildable and dependency-cruiser's resolver was needed. Dead-code analysis needs a resolver.

## 7. A fixture peer that can be killed mid-journey — ADAPT

**Theirs.** `scripts/fixtures/cutroom-http-peer.ts` stands in for the engine, and a CI step is named
_"Verify pinned Cutroom client with separate local fixture restarts"_. The peer dies and comes back
inside the journey.

**Why better.** Reconnection and resumption get proved without the real dependency and without
spending.

**Here.** Our stand-ins sit behind ports, which is cleaner than a fixture server, but nothing of ours
dies on purpose mid-journey. `self-heal` and `resume-failed` are where this belongs: a service child
killed and restarted while a run is in flight.

## 8. One file per gate, plus a status file — ADOPT for large features

**Theirs.** `docs/plans/<feature>/00-status.md`, `01-product.md`, `02-architecture.md`,
`03-program-design.md`, `04-slices.md`, with `research/<date>-<topic>.md` and `mockups/*.html` beside
them. HTML mockups exist before the UI does.

**Why better.** A `slice-builder` reads slices; a `gate-reviewer` reads architecture; the session
reads status. We hand every agent one file, and `docs/features/yield-benchmark.md` is 108 KB — so
each call pays for four gates and every review round. This is the most direct hit on S-160's cost
model, which says what re-reads a whole context is what costs.

**Cost.** `Status:`/`Gates:` lines, `tests/*-rules.test.ts` expectations and `journey.mjs`'s writer
all know today's single-file shape. Converting is itself a slice, so: new large features split,
existing ones stay.

## 9. Scoped `AGENTS.md` next to the code — ADOPT

**Theirs.** Root `CLAUDE.md` is **16 lines** (`@AGENTS.md`, `@docs/CHECKPOINT.md`, a compaction
protocol); root `AGENTS.md` is 26. The rules live in `apps/api/AGENTS.md`, `apps/worker/AGENTS.md`,
`packages/core/AGENTS.md`, `packages/db/AGENTS.md`, and each component's `CLAUDE.md` is the single
line `@AGENTS.md`. Root warns: _"Read the scoped AGENTS.md for every component you change; root
discovery does not imply nested instructions were loaded."_ The paragraphs are written as grants and
refusals — _"The recorded_only receipt grants no queue/provider or V1 Keep-context authority"_ — with
lock order spelled out as `universe → session → Job → children → fairness → bucket`.

**Why better.** Our root `CLAUDE.md` is ~300 lines and all five agents re-read it in full on every
call, including `check-runner`, which needs none of it.

**Here.** A ten-line `AGENTS.md` per package: what it owns, the boundary rules naming it, what it may
not import, what it is handed rather than reaches for. Enforce with a workspace test, the way
`tests/workspace.test.ts` already enforces the `tsconfig` reference.

## 10. File headers and comment conventions that can be scanned — ADAPT

**Theirs** (`CONTRIBUTING.md`, "Code conventions"):

- _"Start each file with a header of one to six lines: what the module owns, the invariants a reader
  must not break, and the governing ADRs."_
- _"Write JSDoc on an exported function only when the signature does not tell the story: transaction
  or lock preconditions, idempotent replay, or what a refusal looks like."_
- _"A db function's JSDoc says whether it owns its transaction or needs the caller's `client`, and
  which locks it expects to be held."_
- _"Inline comments explain why, never what the next line does."_
- _"Do not leave positional, diff-narration or process-history comments ('this slice', 'review I3',
  'used to'). Put ADR and issue citations at the end of a sentence, not at the start."_
- _"No `index.ts` barrels inside a package. Only the package root may have one."_
- Imports: package name across packages, relative with `.ts` inside one, never leaving the package;
  `import type` when every name is a type.

**Measured here.** 487 comment lines under `packages/*/src` and `apps/*/src` reference a slice, a
round or an `S-` entry. About half our `packages/contracts/src/*.ts` files open with a header; the
other half open with an import.

**Verdict.** Their header rule beats our practice and is scannable — we already run four file scans,
so a fifth is in pattern. Their no-process-history rule is half right for us: `S-` and gate citations
are our traceability mechanism and must stay. What should go is build-order narration — "arrived with
paid-path's Slice 7", "Slice 1's finding", "moved here unchanged" — stale the moment slices renumber
and paid for on every read. A scan can tell them apart: allow `S-\d+` and
`docs/features/<slug>.md`, refuse "Slice N added/arrived/used to".

## 11. A verifier that cannot be satisfied by a plausible answer — ADAPT

**Theirs.** `scripts/journey-verifier.ts` is separate from the endpoint assertions and says why in
its own JSDoc: _"This is deliberately separate from endpoint assertions: an HTTP server aimed at a
different database can return plausible JSON but cannot satisfy this query."_ It is itself under
test — `pnpm exec tsx --test scripts/journey-verifier.test.ts` is its own CI step.

**Why better.** The verifier is the thing most likely to pass for the wrong reason, so it gets its
own test. We learned the same at `1c7c77d`, where the journey writer's format invariant had to be
repaired before the SDK journey could be believed.

**Here.** A test over `journey.mjs`'s writer and `verification-status.mjs`' tree binding: feed them a
receipt for a different tree and require refusal.

## 12. A negative control inside the journey — ADOPT

**Theirs.** `scripts/run-isolated-journey.ts` _"creates disposable actual/decoy databases and a
dynamic loopback port, launches real API/worker processes, checks a passing persisted path, then
**requires a specific rejection against the decoy database**."_ J001 records both.

**Why better.** A journey that only ever observes success cannot tell "the path works" from "the
check is blind". We prove deliberate breaks per property in a slice and per rule in `drift --prove`,
but **no journey of ours proves a refusal** — the engine pointed at an unmigrated database, a missing
artifact root, or a service answering for a different tree.

**Here.** One required refusal per journey, written into Gate 3 as an ordinary check.

## 13. A required-evidence table, written before the run — ADOPT

**Theirs.** `docs/journeys/J008.md` carries a two-column table, **boundary | required observation**,
agreed before the journey runs: _"An unknown address and the owner address both answer 202 with
byte-identical bodies"_, _"GET /v1/auth/confirm reports valid:true twice in a row"_, and a `Cleanup`
row naming what must not have been touched. Then `## Limits`, naming what it does not prove —
including that a timing side-channel is a design property and _"not something this journey measures,
since a wall-clock timing assertion would be flaky rather than meaningful"_.

**Why better.** Our evidence line is generated after the fact: `journey=PASS at 3cb421e — every check
green; 5 tests pass`. True, tree-bound, and silent about what was supposed to be observed.

**Here.** The table belongs in the feature file's Gate 3, and the journey prints it back.

## 14. Receipts and screenshots committed, sanitized — ADOPT

**Theirs.** `docs/journeys/evidence/<name>/last-run-receipt.json` plus PNGs. A real one carries the
disposable database name, the chosen ports, `playwright.result`, a per-check ledger, a
`databaseLineage` block of row counts, `axeSeriousOrCritical: 0`, screenshot paths,
`databaseDropped: true`. J008's rule: _"Neither the receipt nor this document ever contains the
address requested or any raw token — every check is a boolean, a status code or a fixed error
shape."_

**Why better.** Our real-run facts live only in the SQLite file, read through `run-reader`. Rotate or
delete it and the evidence is gone; a fresh clone has none of it.

**Here.** `docs/features/evidence/<slug>/last-run.json`: run id, stage timings, receipts by kind with
cost, gate verdicts, ffprobe duration and stream facts of the finished file, the refusal observed.
Numbers and booleans only — not media, not a key, so rule 4 is intact.

## 15. Evidence levels, named — ADOPT

**Theirs.** `docs/operations/system-navigation.md`: **source → implementation checks → fixture
integration → real local service → live provider/media → release UI → owner acceptance**, with
_"Passing one does not imply the next. Label stand-ins, reused outputs and scripted observations. A
rendered video is not proof of H3 use; a provider call is not proof of acceptable content."_ Every
issue and PR states the level reached.

**Why better.** We distinguish stand-in from paid in prose. A token on the Evidence line and in the
commit trailer makes it machine-checkable, and that last sentence is exactly our Gate 0–7 situation.

## 16. Every authority paired with its non-claim — ADOPT

**Theirs.** The same file's table: question | current authority | **what it does not prove**. _"What
exists in source?"_ → exact revision plus PROJECT-STATE → _"does not prove owner/runtime
deployment"_. _"Which migrations are live?"_ → `schema_migrations` read from the named database
against immutable checksums → _"not other databases or later moments"_.

**Here.** One `Does not prove:` line per verified feature in `docs/context.md`. Divergence and
Deferred cover part of it; the non-claim of the word _verified_ itself is written nowhere.

## 17. A hook that refuses an action, not just a stop — ADOPT

**Theirs.** `.claude/settings.json` wires one `PreToolUse` hook on `Bash`:
`refuse-main-update.mjs`, `timeout: 10`, `statusMessage: "Checking the command does not update main
(#201)"`. `CONTRIBUTING.md` explains it: the agent uses the owner's account, so GitHub rulesets
cannot distinguish them, and the hook can.

**Why better.** Our two hooks announce and refuse-to-stop. Nothing refuses an action mid-session.

**Here.** Candidates, each cheap: refuse a `git commit` with no `Verification-Tree` trailer; refuse
`real-reel.mjs` without an explicit owner confirmation in the session; refuse an edit adding a
`.gitignore` exception; refuse a push. Turns S-177 and CLAUDE.md rule 4 from habit into mechanism.

## 18. Round caps written as a rule — ADOPT

**Theirs.** `docs/operations/agent-workflow.md`: _"Cap repair rounds; don't retry unchanged failures
until green. Replan after two unsuccessful attempts instead of escalating to an unbounded swarm.
Subtasks must not spawn another orchestration layer."_ Plus _"A worker summary is untrusted until
source and receipts are checked"_ and _"Report actual worker models and measured usage when
available, never guessed token or cost savings."_

**Here.** We paid eleven gate-review rounds to learn the first, and it still is not a line in
`CLAUDE.md`. The untrusted-summary rule belongs next to `slice-builder`'s hand-back.

## 19. A machine-readable component map — MEASURE FIRST

**Theirs.** `docs/architecture/component-map.json`: per component a `responsibility`, a `path`
ownership root, a `status` string and an issue link, noted _"Paths are ownership roots, not proof
every target module exists."_ `AGENTS.md` requires reading it before editing.

**Why maybe.** Our `.dependency-cruiser.cjs` already encodes ownership as 25 enforced rules, which is
stronger than a JSON file. What we lack is `responsibility` and `status` prose per package in one
place — probably better solved by item 9 than by a second file that can drift. Do 9 first; revisit
only if something needs to read it.

## 20. A compaction field list — ADOPT (cheap)

**Theirs.** Root `CLAUDE.md`: _"Before deliberate compaction, persist the current issue, exact
branch/revision, active worker/process IDs, next command, failed attempts, evidence limits and
unanswered owner decisions."_ And: _"A summary cannot authorize a provider call or turn an old
observation into current fact."_ Plus the honesty line: _"A crashed session can leave stale Markdown;
the file's existence is not a freshness certificate."_

**Here.** S-160 rule 2 says `/compact` between phases but not what must survive it. Six lines in
`CLAUDE.md`, and the second sentence matters for us specifically: a compacted session must not start
a paid run on the strength of a summary.

## 21. Delivery history as one row per change — ADAPT

**Theirs.** `docs/operations/delivery-history.md`: a table of revision/PR | problem and delivered
consequence | **remaining boundary**, ten rows, newest appended, CI run linked.

**Here.** `JOURNAL.md` is prose compacted to a line budget. A one-row index with a remaining-boundary
column would make "what is still not true" readable without reading entries. Optional.

## 22. Test runner shape — MEASURE FIRST, do not copy blindly

**Theirs.** `scripts/test.sh` sources `env.sh`, migrates **one** disposable database, then runs each
test file against a `createdb -T <base>` clone of it, dropping each copy in a `finally` with
`--force` — _"a worker a failed test left behind cannot keep its copy, or stop the run."_ It takes
file arguments so one file can run alone. The reason is in the comment: a library shared by every
file grew with each fixture until a cold reader's Scroll sat beyond what one feed trip may skip.

**Measured here, and it demotes the idea.** Our `openDatabase()` migrates on open: 36.4 ms fresh
versus 0.8 ms to copy an already-migrated file. Real, but small — even a thousand opens across the
suite is ~35 s of 1413 s. **Our 1413 s is not migrations.** Before changing anything, measure where
it goes: ffmpeg encodes in the stand-ins, child service starts, and 149 files in series. Their
`--force`-in-`finally` discipline is worth copying for its own sake; their `-T` clone is not our
bottleneck.

Note what their runner does _not_ do: run files concurrently. Our `--test-concurrency=1` is S-176's
deliberate choice, and nothing in their repository argues against it.

---

## Theirs that we should not take

- **Worktree lanes for parallel agents.** Their own words: _"Git isolation does not isolate ports,
  SQLite, PostgreSQL, media roots or budgets."_ For us that is one SQLite file, one artifact root and
  one budget ledger. Two lanes spending against one ceiling is how a paid run becomes a surprise; a
  per-lane instance root would have to exist first. (This session hit the file-level version: the
  stop-gate could not distinguish another session's uncommitted build from its own.)
- **GitHub as the journal.** Their per-change record lives in issues and PRs, so a clone cannot
  explain itself, and `system-navigation.md` has to warn that chat summaries prove nothing. Our
  `docs/context.md` + `JOURNAL.md` + `PROMPTS/` travels with the repository and is enforced by
  `tests/context-file.test.ts`.
- **One checkpoint that doubles as a log.** `docs/CHECKPOINT.md` is **1057 lines** with 40 dated
  sections, against its own written rule of _"under roughly 120 lines"_. That is what happens when
  the compaction pointer and the history are one file.
- **Their architecture check.** `scripts/check-architecture.mjs` is 55 lines enforcing exactly one
  rule: no `.query(` under `apps/`. Ours is 25 rules on the resolved graph, each proved by a
  deliberate violation. Keep ours.
- **Hand-typed evidence.** J008's own words: _"the commit actually carrying this implementation is
  later — see the PR/issue for the exact delivered revision."_ That is the drift S-177 closed.

## The authority gap

`docs/decisions/` in `KnowScroll/knowscroll` holds ADRs that bind Cutroom's consumer contract and
that `scripts/decisions.mjs` cannot see, because it reads a different repository:

- ADR-0007 Cutroom stays a separate video-generation system
- ADR-0020 Cutroom HTTP client; ADR-0021 Cutroom successor pin and local host composition
- ADR-0023 generated Reel supply; ADR-0024 publication gates and media serving; ADR-0025 eligible
  Reels in inventory
- ADR-0043 Reels carry their Scroll concepts; ADR-0046 content inventory
- ADR-0050 _"One shared Reel pool for dev and stage: claimed once, received everywhere, $5 in
  total"_, 2026-10-08, which **supersedes ADR-0021 §6 and ADR-0023's "$2 total" for dev and stage
  only**, and names upstream Cutroom at `94ee04a`

ADR-0021 pins us at `86d6e2c`; ADR-0050 reads `94ee04a`; our HEAD is later again. Two options, both
an `S-` entry: teach `decisions.mjs` to read that repository's `docs/decisions/` for ADRs naming
Cutroom, or record that KnowScroll-side ADRs are explicitly outside our authority and that the
contract is `packages/reel-contract` alone. Not a thing to decide in passing — the pin mechanism
exists to catch exactly this.

## Suggested order, if the aim is time saved per session

1. Biome for code, prettier for Markdown (2) — ~12 s off every targeted run, no new concepts.
2. The `PreToolUse` refusal hook (17) and the compaction field list (20) — both small, both close
   known holes.
3. The state probe (3) — removes a model call from every session start.
4. CI (1) — the largest wall-clock win, and the only thing that makes old journeys keep running.
5. `knip` (6) and the generated-artifact diff (5) — one devDep, three lines.
6. Journey hardening: negative control (12), required-evidence table (13), committed receipt (14),
   evidence levels (15).
7. Context cost: scoped `AGENTS.md` (9), split gates for new large features (8), the header and
   comment scan (10).
8. Then the authority gap, on the owner's call.
