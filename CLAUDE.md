# Cutroom — how to work in this repo

**The authority is not here.** `steering/DECISIONS.md` lives in the KnowScroll repository and is
binding on this one (**D-088**). Read it at `steering-ref/steering/DECISIONS.md`, and run
`node scripts/decisions.mjs` first: it tells you whether what you can see is current. **If it
says commits are unpushed over there, the decisions that exist are newer than anything you can
read — say so and stop, rather than deciding for yourself.**

This repository never gets its own copy of that file. Two copies of one authority is the drift
the whole mechanism exists to catch.

## The rules that carry over, and are not negotiable

1. **Gates before code.** No implementation file for a feature whose four planning gates —
   product, architecture, program design, slices — are not approved by an adversarial reviewer.
   The gates are written and reviewed **in the steering repository**. Trivial fixes (one file, no
   new route, table, job or screen) skip to a slice.
2. **Any choice between real alternatives becomes a written decision** with what was rejected and
   how a violation will be caught. Not in chat, not in your head. Setup choices go in this
   repository's `DECISIONS.md` as `S-` entries; anything about the product goes in the steering
   repository's.
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

All six are **empty on purpose**. Eleven boundary rules are enforced on the real dependency
graph, and `node scripts/drift.mjs --prove` builds a deliberate violation of each one and fails
if any rule stays silent. The load-bearing ones: **pipeline imports no domain, no providers, no
app, and no I/O at all** — no filesystem, no network, no process, no database driver. A stage is
handed a port; it never reaches for one.

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

## Copy voice, when anything becomes user-visible

The design's words, not ours: "kept things" not Relics, "checked out" not documented, "a place"
not World. **No scores, no streaks, no time-spent, no percentages.** Never build streaks, XP,
progress dashboards, quizzes, notification pressure, follower counts or a marketplace — see the
steering repository's `docs/founding/RESEARCH.md` §19.
