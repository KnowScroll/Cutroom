---
name: checks
description: Run, install, and verify this repository exactly the way every session does it — including the pnpm-is-not-on-PATH workaround. Use when asked to install, typecheck, lint, test, check boundaries, read a decision, or confirm the repository is green.
---

# Checking Cutroom

**Do not invent a command.** This is the recorded recipe, so that every session runs the same
thing and nobody concludes a check passed when it was never run.

## The one trap

**`pnpm` is not on this machine's PATH.** It is not installed globally either. `corepack` is,
and `package.json` pins `pnpm@10.15.1`, so:

```bash
corepack pnpm install          # works; fetches the pinned pnpm
pnpm install                   # "command not found"
```

Anything that does not need pnpm should skip it entirely and call node:

```bash
node scripts/check.mjs         # every check, one summary
node scripts/check.mjs --code  # only the checks about code in this repo
```

## Everything at once

```bash
node scripts/check.mjs
```

Nine steps. The first seven are about this repository's code and must be green:

| step                | what it proves                                              |
| ------------------- | ----------------------------------------------------------- |
| `typecheck`         | `tsc -b` over every referenced project                      |
| `lint`              | eslint, flat config                                         |
| `format`            | prettier, check only                                        |
| `boundaries`        | no forbidden edge exists right now                          |
| `boundaries proven` | each rule still **catches** a violation written to break it |
| `no dead rule`      | no rule names a folder a package has since lost             |
| `tests`             | `node --test` with type stripping                           |

The last two are about the authority, which lives in another repository:

| step            | what it proves                                                            |
| --------------- | ------------------------------------------------------------------------- |
| `decisions pin` | the `steering-ref` submodule is not behind, and nothing is unpushed there |
| `copied docs`   | `docs/design/` is still byte-identical to the steering originals          |

## One at a time

```bash
node node_modules/typescript/bin/tsc -b --pretty
node node_modules/eslint/bin/eslint.js .
node node_modules/prettier/bin/prettier.cjs --check .
node node_modules/prettier/bin/prettier.cjs --write .     # fix formatting
node scripts/drift.mjs                                    # boundaries now
node scripts/drift.mjs --prove                            # boundaries can still bite
node scripts/drift.mjs --audit                            # no rule has gone quietly inert
node --experimental-strip-types --test "tests/**/*.test.ts"
```

`--experimental-strip-types` is needed because Node here is **22.14**; it became the default
later. Without it `node --test` tries to `require` the `.ts` file and fails with
`MODULE_NOT_FOUND`.

Also: `node --test tests` does **not** work on this version — a bare directory is read as a
module path. Pass a quoted glob; **Node** expands it, not the shell, so it behaves the same
in bash and in cmd.exe.

## Reading a decision

The decisions are in the KnowScroll steering repository and there is exactly one copy of
them (D-088). This repository sees them through a pinned submodule at `steering-ref/`.

```bash
node scripts/decisions.mjs                  # which commit we see; is it stale
node scripts/decisions.mjs --fetch          # ask the remote rather than a local ref
node scripts/decisions.mjs D-086            # print one decision
git submodule update --init --depth 1       # first checkout
```

If it says commits are unpushed in the steering repository, the decisions that exist are
**newer than any pin can reach**. That is not fixable here — it is fixed by pushing there.

## Database tooling

There is no schema yet: the tables are a feature's first slice, and its gates are still in
review. The tooling is wired and will fail until the schema exists, which is correct.

```bash
corepack pnpm run db:generate   # drizzle-kit generate -> db/migrations/
corepack pnpm run db:migrate
```

## When install misbehaves

- **`Ignored build scripts: esbuild`** — a native package is not allowlisted. Add it to
  `pnpm-workspace.yaml` → `onlyBuiltDependencies`, then install again. Putting it in
  `package.json`'s `pnpm` key does nothing on pnpm 10.
- **`tsc -b` says "No inputs were found"** — a project with an empty `src/` was referenced
  from `tsconfig.json`. Empty packages are deliberately not referenced; the reference is
  added along with the package's first file.
