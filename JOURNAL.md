# JOURNAL

Append one entry per session: what changed, what was observed, why, and what is next. The
stop-gate hook refuses to end a session that leaves no entry. Newest at the bottom.

---

## 2026-09-12 — session 01, the room is built and nothing is furnished

**Changed.** The repository: `.gitattributes` first, then the toolchain (pnpm workspace, Node 22,
TypeScript ESM strict), six empty packages, eleven boundary rules with a self-proving mode, five
test files, five scripts, the Claude Code setup, `README.md`, `CLAUDE.md`, `AGENTS.md`,
`DECISIONS.md` with twelve `S-` entries, `docs/SETUP_SURVEY.md`, and the three design documents
copied to `docs/design/` with a provenance manifest. The steering repository is pinned as the
`steering-ref` submodule. **No feature code: no contracts, no tables, no stages, no providers.**

**Observed.**

- **The pin can see 76 decisions; 89 exist.** The steering repository is 11 commits ahead of its
  remote, and a submodule can only pin what the remote has — so `D-077` to `D-089`, which include
  the three that describe this repository's own reason to exist, are invisible here until someone
  pushes. `scripts/decisions.mjs` reports it and exits non-zero rather than letting the gap be
  silent. This is the one red light in `node scripts/check.mjs`, and it is not fixable here.
- **ESLint found a real defect in a boundary regex on its first run.** `'\.'` in a JavaScript
  string collapses to `.`, so two patterns were matching any character instead of a literal dot.
  The cause was upstream of the linter: **a shell heredoc halved the backslashes in transit.** A
  rule can be wrong in a way that reads correctly; `--prove` is what makes that survivable.
- **`node --test <dir>` does not work on Node 22.14** — a bare directory is resolved as a module
  path and fails with `MODULE_NOT_FOUND`. A quoted glob works, and **Node** expands it, so the
  same command behaves identically in bash and in cmd.exe.
- **`contentions.md` contains a lone carriage return inside a code span**, at line 550, as prose
  about this exact class of bug. Every comparison here normalises `\r\n` and never a lone `\r`.
- **The steering repository gained two commits while this session ran** — a second adversarial
  review of `reel-engine`, with findings. Nothing here depended on its outcome, because nothing
  here is feature code.

**Why.** Every choice that had a real alternative is an `S-` entry with what was rejected and how
a violation gets caught. The four that were the owner's to make — how the decisions are read, how
much ritual this repository runs, the package scope, and copy-versus-move for the design documents
— were put to him before any file was written, rather than reported afterwards.

**Next.** Three things, in order. **(1) Push the steering repository**, then
`git submodule update --remote steering-ref && git add steering-ref` — until then this repository
cannot read the decisions that govern it. **(2) A decision about CI**, because every check here
runs locally and nothing enforces them on a push. **(3) `reel-engine`'s gates**, which are being
reviewed there; when they are approved, their feature files move here (D-089) and slice 1 is the
schemas. Not before.

---

## 2026-09-12 — session 02, four rules that the other repository's checker could not express

**Changed.** Four boundary rules added, bringing the set to **fifteen**: `plan-no-epistemic`
(D-085's backstop), and `split-no-cinematic`, `split-imported-only-by-plan`,
`split-entered-through-its-index` (D-073, whose stated check had no buildable form before now).
A third mode, `drift --audit`, reports every rule as live, inert or **DEAD**. New checks: `no dead
rule` in `check.mjs`, and three assertions in `tests/boundaries.test.ts` — one of which simply
asserts dependency-cruiser is installed. **S-013** and **S-014** in `DECISIONS.md`. Still no
feature code.

**Observed.**

- **The owner's correction was right, and the state next door is worse than he said.**
  `node_modules` in the steering repository is **empty — nothing is installed at all**, and
  `scripts/drift.mjs:115` wraps the whole dependency-cruiser invocation in
  `existsSync(node_modules/.bin/depcruise)`. So its seven rules, `contracts-are-a-leaf` and
  `no-circular` among them, have **never executed once**, and the config reads as coverage.
- **All four new rules are between two folders of ONE package**, so every import they forbid is
  relative — `'../epistemic/index.ts'`, not `'@cutroom/pipeline'`. Specifier-prefix matching
  cannot see any of them. This is not a shortcoming anyone has to argue about: **D-085 exists
  precisely because the rule D-034 demanded could not be built**, and D-073's `Confirmed-by` asks
  for an edge in the same unbuildable shape. On resolved paths all four are ordinary, and all four
  are proven firing against relative-import violations.
- **A rule can read correctly and guard nothing.** The four name folders that do not exist yet,
  because the gates that create them are in review. So `--audit` distinguishes _inert_ (the folder
  is not written yet — fine) from _DEAD_ (the folder is missing from a package that already has
  source — a rename). Demonstrated: one `.ts` file dropped into `packages/pipeline/src/` turns all
  four DEAD and exits 1; removing it returns to 0 dead.
- **The audit found a bug in itself first.** Its first version cut every literal path back to its
  parent, so the nine package-level rules all reported `n/a` — an audit that could not see the
  rules it was auditing. Fixed by cutting only patterns that actually contain a metacharacter.

**Why.** The correction came with the reason already attached: configured-but-dead is worse than
absent, because it reads as covered. `--prove` answers _can this rule fire_, and `--audit` answers
_does it still apply to anything_. Neither question is answerable by reading the config, which is
the only thing anyone was doing next door.

**Next.** Unchanged and still first: **push the steering repository** — the pin reads 76 of 89
decisions. Then the CI decision. **One offer standing for the owner**: a one-line change to the
steering repository's `drift.mjs` so a missing dependency-cruiser is a loud failure instead of a
silent skip. Not applied — it is that repository's script, another session is active in it, and it
would turn its `pnpm drift` red until someone installs there.
