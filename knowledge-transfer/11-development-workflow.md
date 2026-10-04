# 11 — Development workflow

This document is the pragmatic "what do I run" guide. Use it when you are about to make a
change and want to know which checks to run, when to run them, and what the command actually
does.

## Prerequisite setup

Once, on a fresh machine:

```
git submodule update --init
corepack pnpm install
node scripts/decisions.mjs --fetch
node scripts/check.mjs --changed --dry-run
```

- The submodule is `steering-ref/`. The decisions pin (`DECISIONS.md`'s authority) lives there.
- `pnpm` is not on `PATH`; `corepack` is how pnpm itself is run.
- `scripts/decisions.mjs --fetch` makes sure the pin is current (or refuses if there are
  unpushed commits in the steering repository).
- `node scripts/check.mjs --changed --dry-run` lists which checks would run for the current
  diff without running them.

If `scripts/decisions.mjs` reports unpushed commits in the steering repository, **stop**. The
authority is newer than anything you can read.

## Starting the service

```
corepack pnpm service
```

This runs `apps/service/src/main.ts` with stand-in adapters for every port. The service
listens on `http://127.0.0.1:8787` by default, reads no key, spends nothing, and is safe for
readiness and integration work.

In another terminal:

```
curl http://127.0.0.1:8787/v1/ready
```

To stop the service, type `stop` on its stdin (no signal reaches a child on Windows — S-118),
or send it SIGINT (Ctrl+C) on Unix.

A real paid run is `scripts/real-reel.mjs`. See `docs/USING_CUTROOM.md` for the full set of
real-reel settings.

## The four kinds of diff

`node scripts/check.mjs` chooses what to run based on what changed.

| Change kind                             | Command                                    | What runs                                                                                   |
| --------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------- |
| Documents only                          | `node scripts/check.mjs --changed`         | `prettier --check`, four scanning tests, decisions pin, copied docs                         |
| One code slice                          | `node scripts/check.mjs --slice <test...>` | Static checks (typecheck, lint, format, boundaries, boundaries-proven) plus the named tests |
| Unclassified / broad                    | `node scripts/check.mjs`                   | Everything — the full suite, every check, every test                                        |
| Workspace / dependency changes          | `node scripts/check.mjs`                   | Same as unclassified                                                                        |
| Verification tooling / boundary changes | `node scripts/check.mjs`                   | Same as unclassified                                                                        |
| A new feature journey                   | `node scripts/check.mjs`                   | Same as unclassified                                                                        |

The mapping is in `scripts/check.mjs:51-69`. **If the diff has both documents and code, run
the full suite** — the change-kind rules are strict.

## What each check is

`node scripts/check.mjs` runs, in order:

1. **typecheck** — `tsc -b --pretty`. Project references across the workspace.
2. **lint** — `eslint .`.
3. **format** — `prettier --check .`.
4. **boundaries** — `scripts/drift.mjs`. Enforces the twenty-two boundaries.
5. **boundaries proven** — `scripts/drift.mjs --prove`. Writes a file to break each rule and
   fails if one stays silent. **Configured-but-dead reads as covered** — never assume a rule
   runs.
6. **no dead rule** — `scripts/drift.mjs --audit`. Fails when a rule names a folder that a
   renamed package lost.
7. **tests** — `node --test --test-concurrency=1 tests/**/*.test.ts packages/**/*.test.ts
apps/**/*.test.ts`. The `--test-concurrency=1` is required — nested ffmpeg/SQLite workers
   would otherwise compete for the same machine.
8. **decisions pin** — `scripts/decisions.mjs`. Confirms the steering repository's decisions
   pin is current.
9. **copied docs** — `scripts/docs-check.mjs`. Confirms the docs that have been written to
   one place have been copied to the other.

## Three "honest" rules

`scripts/check.mjs` does not weaken a test, a boundary or a check to reach green. If
`scripts/drift.mjs --prove` reports a silent rule, that is the finding — not a green light.
If `scripts/check.mjs` reports a red check, the red check is the answer — fix the code, do not
disable the check.

## Running individual tests

```
node --experimental-strip-types --test --test-concurrency=1 tests/reel-plan-gate0.test.ts
```

You need `--experimental-strip-types` because Node 22.14 cannot run `.ts` tests without it
on this machine. The test file is `tests/<filename>.test.ts`. To narrow to one:

```
node --experimental-strip-types --test --test-concurrency=1 --test-name-pattern="^gate0 covered$" tests/reel-plan-gate0.test.ts
```

## Boundaries — when they break

`scripts/drift.mjs` is configured with rules on **resolved file paths**, never on the text of
an import line. Three failure modes:

1. **Wrong import** — `import { … } from '@cutroom/providers'` inside `apps/api`. Fix: move
   the import to where it belongs, or replace with a function the API should be handed.
2. **Wrong folder rule** — e.g. the splitter is imported from a non-planner file. Fix: import
   only from the planner, or move the call into `packages/pipeline/src/plan/`.
3. **Renamed package** — a rule names a folder that no longer exists. Run
   `node scripts/drift.mjs --audit` to find it; either fix the rule or restore the folder.

## Writing a new feature

New features go through the **four gates** in `AGENTS.md`:

1. **Product** — what is the user-facing behaviour?
2. **Architecture** — what packages and ports does it need?
3. **Program design** — what tables, jobs, ports, events?
4. **Slices** — what is the smallest test that proves each stage?

Each gate is reviewed by an adversarial reviewer and approved as a section in
`docs/features/<slug>.md`. The status of each gate (`APPROVED …`) is on the front matter of
the file. **No implementation file is written until all four gates are approved.**

The full feature workflow is described in `AGENTS.md` (rule 1, "Gates before code") and the
template lives in `docs/features/`. The existing feature files (`reel-plan.md`,
`reel-stills.md`, `reel-render.md`, `reel-takes.md`, `paid-path.md`, `paid-failures.md`,
`second-ask.md`, `three-pictures.md`, `ask-again.md`, `cut-rules.md`, `resume-failed.md`,
`cutroom-sdk.md`, `cutroom-sdk-package.md`) are the worked examples.

## Building the SDK packages

```
node scripts/package-sdk.mjs
```

Produces:

```
.package-staging/cutroom-reel-contract-1.0.0.tgz
.package-staging/cutroom-sdk-1.0.0.tgz
```

These are the tarballs an external consumer installs. The contents are compiled ESM
JavaScript and `.d.ts` files; the engine is not in them.

The test `tests/cutroom-sdk-package-build.test.ts` is the binding check — it runs the
packager, asserts the tarballs exist, and unpacks them to make sure their files are what
the test says they are.

## Secrets, media, the database, generated files

Never commit:

- `.env` (it would expose a real key — S-109).
- `.artifacts/`, `.package-staging/`, `data/` (gitignored).
- Any media file (`.mp4`, `.png`, …).
- The SQLite database.

The default for every generated path is a gitignored folder inside this repository (D-086).
Never an absolute path.

## What "verified" means here

A slice is verified only when:

- The checks named by the approved slice pass for the exact Git tree.
- The commit records them in `Verification` trailers.

`scripts/verification-status.mjs` verifies that binding; it does not rerun a completed suite.
A green typecheck proves nothing about whether the product works — that proof belongs to a
journey, once its gates are approved.

## The journal

`JOURNAL.md` is the newest-first log of session outcomes. A session that finishes without
writing a `JOURNAL.md` entry fails the stop-gate hook. The code is recoverable from git; the
reasoning is not.

## Quick reference

| Want to…                                              | Run                                                                                |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------- |
| See what decisions this repo answers to               | `node scripts/decisions.mjs`                                                       |
| See the boundaries as currently configured            | `node scripts/drift.mjs`                                                           |
| Prove the boundaries are live (write a file per rule) | `node scripts/drift.mjs --prove`                                                   |
| Find rules that name no real folder                   | `node scripts/drift.mjs --audit`                                                   |
| Run everything                                        | `node scripts/check.mjs`                                                           |
| Run only the checks for docs                          | `node scripts/check.mjs --changed`                                                 |
| Run static checks + a named test                      | `node scripts/check.mjs --slice <test-file-or-test-glob>`                          |
| See what would run (no execution)                     | `node scripts/check.mjs --changed --dry-run`                                       |
| Run one test file                                     | `node --experimental-strip-types --test --test-concurrency=1 tests/<file>.test.ts` |
| Start the service                                     | `corepack pnpm service`                                                            |
| Build the SDK tarballs                                | `node scripts/package-sdk.mjs`                                                     |
| Make a real paid reel                                 | `node scripts/real-reel.mjs`                                                       |
| Verify a commit tree                                  | `node scripts/verification-status.mjs`                                             |
