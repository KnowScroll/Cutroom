# 089 — `benchmark-view` Slice 1, one copy of the schema

- **For:** session 95
- **Feature:** `benchmark-view` (`docs/features/benchmark-view.md`), the benchmark's last part (S-200)
- **Work:** Slice 1 of four — `packages/benchmark-read` with the shared row loader, `scripts/benchmark.mjs` calling
  it, two new boundary rules, and every amendment Gate 3's table names
- **Written:** 2026-10-17
- **Run:** —

> **The gates are APPROVED** — `APPROVED 2026-10-17 owner-delegated-S-205`, four times. **Read S-205 before this
> prompt's facts**: no reviewer read those gates and neither did the owner, the read that approved them was the
> session's own, and the four faults it found in its own text are listed there. **Nothing downstream will catch a
> design fault**, so this slice's checks are the only guard, and a check that cannot fail is worse than a missing
> one.

## Read first

`docs/context.md`, then `docs/features/benchmark-view.md` whole — its Gate 2 is the place-and-may-not table this
slice must not step outside, its Gate 3 holds checks 1, 2, 4 and 5, and its Gate 4 names what Slice 1 contains.
Then, by heading and only the entry's lines: `grep -n '^## S-204' DECISIONS.md` (every choice this slice implements,
with what was rejected), `^## S-203` (why no reviewer approved these gates and what carries the review instead),
`^## S-197` (the form a finding against a gate takes), and `^## S-182` (what `scripts/benchmark.mjs` is allowed to
be). `docs/features/yield-benchmark.md`'s Gate 2 is the table this slice edits one row of.

## The facts, measured in session 94 — do not re-derive them

- **`check.mjs`'s `FULL_ONLY` holds `/^scripts\//`** (`scripts/check.mjs:229-235`), and this slice touches
  `scripts/benchmark.mjs`, the root `tsconfig.json`, `.dependency-cruiser.cjs`, `biome.json` and `.prettierignore`.
  **Its verification is the full suite, 617 s.** There is no targeted route for it and there is no point looking.
- **`scripts/drift.mjs:45` cruises `['packages', 'apps']` only**, which is why the loader is a package and not a
  module under `scripts/`.
- **What goes red when the open moves** (measured, not assumed): `tests/yield-benchmark-reader.test.ts:235-240`,
  the count of exactly one `new DatabaseSync(` and the `{ readOnly: true }` match; and `:424-427`, the
  `DEFAULT_DB_PATH` match, once the `--db` → `CUTROOM_DB_PATH` → default order moves.
- **What goes wrongly green:** `:241-255`, eleven source scans — the domain's opener, `@cutroom/providers`,
  `@cutroom/domain`, `spawnSync`, `spawn(`, `execSync`, `execFileSync`, `fork(`, `loadEnvFile`, `DEFAULT_ENV_FILE`,
  `CUTROOM_ENV_FILE`, `readSettings` and the `.env` regex. **Each must read both sources.**
- **What stays green for the right reason:** `:249-251`, the `processes` deep-equal `['git']` and the `run('git',
['rev-parse'` match, because `git rev-parse --short HEAD` (`scripts/benchmark.mjs:850`) **stays in the script**.
  Do not move it.
- **The clause-by-clause column scan does not exist** and this slice writes it (check 4). `TABLES` is at
  `scripts/benchmark.mjs:68-89`, twenty tables in order, with `run` read separately; the join key is
  `correlation_id` for `job` and `run_id` for the other nineteen; the order is `seq` for `run_event` and `rowid`
  otherwise; `heldColumns()` is `:243-267`, `absentColumns()` `:274-283`, `rowsOf()` `:287-321`, the scrubber
  `:106-107` and `:156-191`.
- **The rule count `25` appears in** `tests/paid-path-keys.test.ts:124` and `:146-147`,
  `tests/yield-benchmark-boundary.test.ts:172`, `tests/boundaries.test.ts:47` and `:59`, plus
  `tests/reel-stills-rules.test.ts` and `tests/reel-render-rules.test.ts` which the first of those compares against.
  **Grep the test tree for the literal before editing any of them**, so a missed site is a red and not a gap.
- **The package may NOT resolve the database path.** `DEFAULT_DB_PATH` and `SETTING_NAMES` come from
  `@cutroom/service` — that is `apps/service` (`apps/service/src/settings.ts:47`, `:86`) — which
  `benchmark-read-no-engine` forbids. The precedence goes into **`scripts/_lib.mjs`**, which both scripts already
  import, and the loader is handed a resolved path. This was fault 1 of S-205's read: as first written, Gate 2 could
  not be built.
- **The package declares `@cutroom/benchmark` at `workspace:*`** for `FIELD_COLUMNS`, and no registry dependency —
  the house form (`packages/benchmark/package.json`).
- **A new package must** carry its own `package.json` named `@cutroom/benchmark-read` with `exports` exactly
  `{ ".": "./src/index.ts" }`, its own `tsconfig.json`, and a `{ "path": "./packages/benchmark-read" }` reference in
  the root `tsconfig.json` (`tests/workspace.test.ts:53`, `:61`, `:68`, `:76-92`).

## What this slice owes

`packages/benchmark-read/src/index.ts` as the package's only entrance, holding the read-only open of a path it is
handed, the held column set, the row selection and the scrubber; the `--db` → `CUTROOM_DB_PATH` → `DEFAULT_DB_PATH`
precedence in `scripts/_lib.mjs`; `scripts/benchmark.mjs` calling both and holding
no `new DatabaseSync(` of its own; `benchmark-read-no-engine` and `benchmark-no-reader` in
`.dependency-cruiser.cjs` with a `drift --prove` case for each, relative and by package name; `vendor/` ignored by
Biome and Prettier, named there as a third-party build; the seven rule-count sites at 27; the four reader-test
amendments; and `tests/benchmark-view-loader.test.ts` with checks 1, 2, 4 and 5 — **each seen red once before its
code exists, and restored** (S-172).

**Done is** `node scripts/check.mjs` green, the receipt naming the tree, and a commit carrying
`Verification: full` and `Verification-Tree`. **No ledger row, no record and no page is written by this slice.**

## Do not

Move `git rev-parse` out of `scripts/benchmark.mjs`. Narrow, loosen or delete any assertion to make room — every
amendment in Gate 3's table either moves a check to the source that now holds its property or grows it to a second
source, and a count only goes up (CLAUDE.md rule 3). Write any part of the server, the routes, the payloads or the
page: that is Slices 2 and 3, and this slice must pass with none of it present. Put the vendored ECharts build under
`packages/` — `tests/reel-plan-shapes.test.ts:116-130` would go red on its `source:` keys, and the build is Slice
4's anyway. Adjust a gate sentence to fit the code: a finding goes in the **Amendments** block as a numbered list
naming the sentence it contradicts, and a slice that cannot make its check pass as written stops and reports
(S-016, S-197).
