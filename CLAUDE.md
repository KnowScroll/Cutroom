# Cutroom — how to work in this repo

**Two files of decisions, read in this order** (**D-115**, **S-017**, 2026-09-14):

1. **`steering-ref/steering/DECISIONS.md`** — the KnowScroll repository's D-001 to D-114, read
   through the pin. They bind this repository. Nothing new about Cutroom is written there any more.
   Run `node scripts/decisions.mjs` first: it tells you whether what you can see is current. **If it
   says commits are unpushed over there, say so and stop, rather than deciding for yourself.**
2. **`DECISIONS.md` here** — every decision about the engine and Cutroom from 2026-09-14 on, as `S-`
   entries. **An entry here that names a D-entry in `Supersedes` wins over it.**

This repository never gets a copy of the D-entries. Two copies of one authority is the drift the
whole mechanism exists to catch.

## The rules that carry over, and are not negotiable

1. **Gates before code.** No implementation file for a feature whose four planning gates —
   product, architecture, program design, slices — are not approved by an adversarial reviewer.
   **New features are planned here**, in `docs/features/`. `reel-plan`, `reel-stills` and
   `reel-render` are the exception: their gates are still in the steering repository and move here
   once approved (S-015, S-017). Trivial fixes (one file, no new route, table, job or screen) skip
   to a slice.
2. **Any choice between real alternatives becomes a written decision** with what was rejected and
   how a violation will be caught. Not in chat, not in your head. Anything about the engine or
   Cutroom goes in this repository's `DECISIONS.md` as an `S-` entry (S-017); anything about
   KnowScroll's side — the script, the epistemic layer, the orchestrator, the player — goes in the
   steering repository's.
3. **Never weaken a check or a test to reach green.** Add, never subtract. If `drift --prove`
   fails, a rule stopped working — that is the finding, not an obstacle.
4. **Never commit** media, the SQLite file, generated artifacts, or a secret. `.gitignore` covers
   the defaults; do not add an exception.
5. **Write a `JOURNAL.md` entry before you stop.** The stop-gate hook refuses otherwise. Date,
   what changed, what you observed, why, what is next.

## Layout, and what each part may not do

```text
packages/contracts   shared types, and the ports AS TYPES. Imports nothing internal.
packages/pipeline    pure functions: stages and gates.
packages/providers   adapters behind the ports, including stand-ins. No durable state.
packages/domain      tables, migrations, the job queue, the budget ledger.
apps/worker          the runner. The only place that knows both a stage and a table.
apps/api             submitting work, reading records. Never calls a provider.
```

A seventh package, `packages/reel-contract`, is the caller-facing contract (D-094). `reel-plan` has
given `contracts`, `domain`, `api` and `worker` source; `pipeline` and `providers` stay **empty until
its Slice 3**. **Seventeen** boundary rules are enforced on the real dependency graph, and
`node scripts/drift.mjs --prove` builds a deliberate violation of each one — relative and by
package name, npm packages laid out the way pnpm lays them out — and fails if any case stays silent
or any legal import is reported or fails to resolve. The load-bearing ones: **pipeline imports no
domain, no providers, no app, no I/O at all, and no npm package but `zod`**. A stage is handed a
port; it never reaches for one. **Nothing outside `providers` imports a model client** (`ai`,
`@ai-sdk/*`).

**Three of the seventeen are between two folders of one package**, and they are the reason this is
dependency-cruiser rather than a script matching import text. It resolves every import to a file
path, so `'../split/index.ts'` and `'@cutroom/pipeline'` are the same kind of thing to it:
`split-imports-only-itself`, `split-imported-only-by-plan`, `split-entered-through-its-index` —
**D-073**, whose stated check was never buildable against import text, because inside one package
every import is relative. (`plan-no-epistemic` and `split-no-cinematic` are gone — **S-020**.)

**The npm rules see an import only if it resolves to a `node_modules` path.** That is why
`node_modules` is not in `options.exclude`, why `dist` there is anchored to this repository's own
output, and why the resolver is given `conditionNames` — each of the three, undone, makes a rule
silent on `ai` (S-020).

**Neither folder, `split/` nor `plan/`, exists yet.** `node scripts/drift.mjs --audit` reports every rule
whose folders are absent, and **fails** once a package has source files while a folder one of its
rules names is still missing — which is what a rename looks like. A rule that reads correctly and
matches nothing is the worst state to be in, because it reads as coverage.

A package is entered **only** through its `src/index.ts`. Adding a package's first file also
means adding its reference to the root `tsconfig.json` — `tests/workspace.test.ts` fails if you
forget, because an unreferenced package is one nothing typechecks.

## Environment traps, each one already paid for

- **`pnpm` is not on PATH** and is not installed globally. Use `corepack pnpm <script>`, or skip
  it: `node scripts/check.mjs`.
- **Node is 22.14**, so TypeScript tests need `--experimental-strip-types`. A bare directory
  (`node --test tests`) is read as a module path and fails; pass a quoted glob and let **Node**
  expand it.
- **Windows, CRLF working tree.** `sed`, `awk` and `grep` in Git Bash **strip `\r` on read**, so
  they lie about line endings. Count bytes instead: `tr -cd '\r' < file | wc -c`. `.gitattributes`
  is what keeps the repository LF; `tests/line-endings.test.ts` is what notices when it does not.
- **Shell tooling can halve backslashes in transit.** A regex written through a heredoc can
  arrive as `\.` instead of `\\.`, which silently matches any character. This has already
  happened here, in a boundary rule. Verify the file, not the command you typed.
- **No absolute paths, ever** (D-086). One setting per generated path, defaulting inside this
  repository. `tests/no-absolute-paths.test.ts` enforces it.

## Before claiming anything is done

```bash
node scripts/check.mjs
```

Six code checks plus two about the authority. `--code` runs only the first six. A red
`decisions pin` is not yours to fix by editing anything here.

**A feature in `docs/features/` is verified only by its journey** (S-016), run after its last slice is
committed:

```bash
node scripts/journey.mjs <slug>
```

It runs every check and `tests/<slug>-*.test.ts`, and writes the evidence, the status and the divergence. Never
type any of the three by hand. A FAIL is the finding: stop and report.

## Copy voice, when anything becomes user-visible

The design's words, not ours: "kept things" not Relics, "checked out" not documented, "a place"
not World. **No scores, no streaks, no time-spent, no percentages.** Never build streaks, XP,
progress dashboards, quizzes, notification pressure, follower counts or a marketplace — see the
steering repository's `docs/founding/RESEARCH.md` §19.
