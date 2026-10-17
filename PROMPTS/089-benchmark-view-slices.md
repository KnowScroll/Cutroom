# 089 — `benchmark-view`, all four slices in one session

- **For:** session 95
- **Feature:** `benchmark-view` (`docs/features/benchmark-view.md`), the benchmark's last part (S-200)
- **Work:** **all four slices**, one `slice-builder` each, built and committed in this session; then the journey
- **Written:** 2026-10-17, rewritten the same day from a Slice-1-only prompt at the owner's word
- **Run:** 2026-10-17, session 95

> **The gates are APPROVED** — `APPROVED 2026-10-17 owner-delegated-S-205`, four times. **Read S-205 before this
> prompt's facts**: no reviewer read those gates and neither did the owner, the read that approved them was the
> writing session's own, and the four faults it found in its own text are listed there. **Nothing downstream will
> catch a design fault**, so each slice's checks are the only guard, and a check that cannot fail is worse than a
> missing one.

## The stop rule, which is the point of this prompt

**Build all four slices in this one session.** Stop early **only** when this session's context passes **300K tokens
(about 50%)**. At that point, finish the slice in hand — its check run, its commit — and then **stop cleanly**:

1. the journal entry and this session's entry in `docs/context.md`, naming exactly which slices are committed and
   which are not;
2. **`PROMPTS/090`**, this file cut down to the slices that remain, with every fact below carried over and the
   commits of the finished slices named;
3. say plainly in the hand-back which slice is next and what its verification route is.

**Nothing else justifies stopping early** except a FAIL, which is a finding: stop and report it rather than working
around it (S-016).

## How the session spends its context, since that is the budget

- **One `slice-builder` at a time, never two.** The slices are strictly sequential — Slice 2 needs Slice 1's loader,
  Slice 3 needs Slice 2's routes, Slice 4 needs Slice 3's page — so **this is not a workflow** and CLAUDE.md's
  fan-out rule does not apply. A session that spawns them in parallel gets three slices built against a loader that
  does not exist yet.
- **Hand each `slice-builder` the facts below rather than letting it measure again** (S-160, and the reason sessions
  92 and 93 spent their rounds on design instead of arithmetic).
- **Run every check through `check-runner`**, never in this session's own context: a full suite's output is
  thousands of lines and the verdict is four. The two full runs are 654 s each, measured 2026-10-17.
- **Read `DECISIONS.md`, `JOURNAL.md` and the feature file by heading**, never whole — the feature file is about 500
  lines and only its Gate 2, Gate 3 and Gate 4 matter while building.
- **`slice-builder` never commits** (S-172). It hands back a report and an uncommitted diff; this session runs the
  approved check and commits with the trailers.

## Read first

`docs/context.md`, then `docs/features/benchmark-view.md`'s **Gate 2** (the place-and-may-not table and the four
"where each figure comes from" facts), **Gate 3** (the eighteen checks) and **Gate 4** (which check is in which
slice). Then, by heading and only the entry's lines: `grep -n '^## S-204' DECISIONS.md` (every choice the slices
implement, with what was rejected), `^## S-205` (the four faults the approving read fixed, and what that read could
not do), `^## S-203` (why no reviewer approved these gates), `^## S-197` (the form a finding against a gate takes),
`^## S-172` (what a `slice-builder` hands back), `^## S-182` (what `scripts/benchmark.mjs` is allowed to be).

## The facts, measured in session 94 — hand them over, do not re-derive them

- **`check.mjs`'s `FULL_ONLY` holds `/^scripts\//`** (`scripts/check.mjs:229-235`). **Slices 1 and 4 owe the full
  suite**; Slices 2 and 3 are package-only and targeted.
- **`scripts/drift.mjs:45` cruises `['packages', 'apps']` only**, which is why the loader is a package and not a
  module under `scripts/`.
- **The package may NOT resolve the database path.** `DEFAULT_DB_PATH` and `SETTING_NAMES` come from
  `@cutroom/service` — that is `apps/service` (`apps/service/src/settings.ts:47`, `:86`) — which
  `benchmark-read-no-engine` forbids. The `--db` → `CUTROOM_DB_PATH` → `DEFAULT_DB_PATH` precedence goes into
  **`scripts/_lib.mjs`**, which both scripts already import, and the loader is handed a resolved path. This was
  fault 1 of S-205's read.
- **The package declares `@cutroom/benchmark` at `workspace:*`** for `FIELD_COLUMNS`, and no registry dependency —
  the house form (`packages/benchmark/package.json`).
- **What goes RED when the open moves:** `tests/yield-benchmark-reader.test.ts:235-240`, the count of exactly one
  `new DatabaseSync(` and the `{ readOnly: true }` match; and `:424-427`, the `DEFAULT_DB_PATH` match.
- **What goes WRONGLY GREEN:** `:241-255`, eleven source scans — the domain's opener, `@cutroom/providers`,
  `@cutroom/domain`, `spawnSync`, `spawn(`, `execSync`, `execFileSync`, `fork(`, `loadEnvFile`, `DEFAULT_ENV_FILE`,
  `CUTROOM_ENV_FILE`, `readSettings`, and the `.env` regex. **Each must read both sources.**
- **What stays green for the right reason:** `:249-251`, the `processes` deep-equal `['git']` and the
  `run('git', ['rev-parse'` match, because `git rev-parse --short HEAD` (`scripts/benchmark.mjs:850`) **stays in the
  script**. Do not move it.
- **The clause-by-clause column scan does not exist** and Slice 1 writes it (check 4). `TABLES` is at
  `scripts/benchmark.mjs:68-89`, twenty tables in order, `run` read separately; the join key is `correlation_id` for
  `job` and `run_id` for the other nineteen; the order is `seq` for `run_event` and `rowid` otherwise;
  `heldColumns()` is `:243-267`, `absentColumns()` `:274-283`, `rowsOf()` `:287-321`, the scrubber `:106-107` and
  `:156-191`.
- **The rule count `25` appears in** `tests/paid-path-keys.test.ts:124` and `:146-147`,
  `tests/yield-benchmark-boundary.test.ts:172`, `tests/boundaries.test.ts:47` and `:59`, plus
  `tests/reel-stills-rules.test.ts` and `tests/reel-render-rules.test.ts` which the first compares against.
  **Grep the test tree for the literal before editing any of them.**
- **A new package must** carry its own `package.json` named `@cutroom/benchmark-read` with `exports` exactly
  `{ ".": "./src/index.ts" }`, its own `tsconfig.json`, and a `{ "path": "./packages/benchmark-read" }` reference in
  the root `tsconfig.json` (`tests/workspace.test.ts:53`, `:61`, `:68`, `:76-92`).
- **Payload sizes, measured on the real record:** the fleet payload is **39 KB for all 52 runs**, one run's full
  scorecard **3 KB typical and 40 KB at the largest**, the whole record **2665 KB**.
- **All 52 runs in the real database are `finished` and none is `running`**, so check 3 needs a crafted database.
- **The group-by keys off `picture.shot_unit`**, an integer column, indexed into `subjectsPerShot(rows)`
  (`packages/benchmark/src/measures.ts:717-720`); the scorecard's `shotId` is synthesised as `shot-${unit}`
  (`:567`), and a run with no selected plan has `subjectsPerShot() === []`.
- **The run's date is `run.created_at`** (`packages/domain/src/schema.ts:36`, `notNull`), not in the scorecard. The
  real range is 2026-09-21 to 2026-09-26.
- **Nothing under `packages/providers` redacts anything**; the only redaction is `scripts/benchmark.mjs:187-191`,
  applied at `:910-916` to the written record alone.
- **The ECharts build must not live under `packages/` or `apps/`**: `tests/reel-plan-shapes.test.ts:116-130` fails on
  an object key named `source`, and the minified build holds `source:` twice. It goes to `vendor/echarts/`, with
  `vendor/` ignored by Biome and Prettier.
- **Today's full suite, for comparison:** 811 tests, 0 failed, 654 s — ordinary pool 397.5 s over 144 files at
  concurrency 4 with 1940 MB free at its lowest, secrets pool 256.8 s over 12 files at concurrency 2 with 1555 MB.
  Judge a later run by its own `freeMinMB` (S-192).

## The four slices, in order

Gate 4 is the authority; this is the operating order.

1. **Slice 1 — one copy of the schema.** Checks 1, 2, 4, 5. **Full suite**, then commit with `Verification: full` and
   `Verification-Tree`.
2. **Slice 2 — the server and its routes** (`GET /` as a minimal document, `/data`, `/run/<id>`; port 0; the 404s and
   traversal refusals; no writes). Checks 3, 11, 12, 13, 16, 17. **Targeted:**
   `node scripts/check.mjs --slice tests/benchmark-view-server.test.ts`, then commit with `Verification: targeted`,
   `Verification-Tree` and `Verification-Tests`.
3. **Slice 3 — the page** (four views, eight charts, the numbers table in every chart panel, the words folded, the
   true-black theme and the validated palette). Checks 6, 7, 8, 9, 14, 15. **Targeted:**
   `node scripts/check.mjs --slice tests/benchmark-view-page.test.ts`.
4. **Slice 4 — the vendored build, its route, the launcher and the PATH-only child.** Checks 10, 18. Then
   `node scripts/impact-map.mjs` (402 s), the **full suite**, and `node scripts/journey.mjs benchmark-view`.

**Write the journal entry and the `docs/context.md` entry BEFORE Slice 4's full run**, so the run's receipt covers
the tree that commit writes. A Markdown-only commit afterwards would owe a second full suite of its own:
`verification-status.mjs` takes only `full|targeted`, and the `--changed` receipt's `mode: "documents"` is read by
nothing (session 94 paid 654 s for exactly this). **That gap is the owner's to settle and is not worked around
here** — no trailer is renamed to fit it.

## Done is

Four slices committed, each with its own tree-bound evidence; `node scripts/journey.mjs benchmark-view` **PASS**
with `Status: verified` written by the journey and never by hand; the `S-` entry for any choice a slice had to make
that the gates left open (S-017); every finding against a gate sentence in the file's **Amendments** block as a
numbered list (S-197); the journal entry and the `docs/context.md` entry; and `PROMPTS/090` for whatever is next —
`self-heal`, or the remaining slices if the 300K rule stopped this session early.

## Do not

Run the four slices in parallel or as a workflow — they are sequential and each needs the one before it. Let a
`slice-builder` commit (S-172). Move `git rev-parse` out of `scripts/benchmark.mjs`. Narrow, loosen or delete any
assertion to make room: every amendment in Gate 3's table either moves a check to the source that now holds its
property or grows it to a second source, and a count only goes up (CLAUDE.md rule 3). Put the vendored build under
`packages/`. Adjust a gate sentence to fit the code — a finding goes in the **Amendments** block naming the sentence
it contradicts, and a slice that cannot make its check pass as written stops and reports (S-016, S-197). Type any
part of the journey's evidence, status or divergence. Skip the full suite on Slice 1 or Slice 4 because the diff
"looks small": both touch `scripts/` and workspace configuration.
