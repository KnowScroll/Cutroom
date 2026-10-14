# AGENTS.md

Instructions for any coding agent working in this repository — Claude Code, Codex, Cursor, or
whatever comes next. `CLAUDE.md` is the same contract in the form Claude Code reads first; if the
two ever disagree, `CLAUDE.md` is newer and wins.

In the steering repository this file is **0 bytes**. That is a gap, not a style. An agent that
finds nothing here reconstructs the project from whatever it happens to open, and two capable
agents then start from different beliefs while both sound certain.

## What this repository is

The working reel creation engine: brief → plan → approved stills (`reel-engine`), then stills
→ clips → narration → one video file (`reel-render`). Its paid path has made real reels;
its loopback service, caller contract, failed-run recovery, typed SDK, and portable SDK packages
are built and verified. It is still a five-user, one-machine engine rather than the future broader
interactive Cutroom product. Start with `README.md`, `docs/STATUS.md`, and
`docs/USING_CUTROOM.md` for the user-facing truth; `docs/context.md` is the exact engineering
state.

## Start here, in this order

```bash
node scripts/decisions.mjs       # can you see the current decisions? if not, stop and say so
node scripts/drift.mjs           # are the boundaries intact?
tail -40 JOURNAL.md              # what the last session did, and why
node scripts/verification-status.mjs  # does HEAD have evidence for this exact committed tree?
```

If `decisions.mjs` reports unpushed commits in the steering repository, **the authority is newer
than anything you can read.** Report that and stop. Do not infer a decision from code, from this
file, or from a summary.

## The five rules

1. **Gates before code.** A feature gets no implementation file until its four planning gates —
   product, architecture, program design, slices — are approved by an adversarial reviewer. New
   Cutroom feature gates live in this repository under `docs/features/`; their `Status`, `Gates`,
   `Evidence`, and `Divergence` lines say what has actually cleared. Do not add "just the types"
   for a feature that has not.
2. **A choice between alternatives is written down**, with what was rejected and how a violation
   gets caught. Existing D-decisions in the pinned steering repository still bind. New decisions
   about the engine or Cutroom are `S-` entries in this repository's `DECISIONS.md`; decisions
   about KnowScroll's product side remain in the steering repository. Both are append-only.
3. **Nothing gets weakened to reach green.** Not a test, not a boundary rule, not a check. If
   `drift --prove` reports a silent rule, that is the finding.
4. **Secrets, media, the database and generated files are never committed.** One configured path
   per generated artifact, defaulting to a gitignored folder in this repository (D-086). Never an
   absolute path — a ratified test in the steering repository once depended on a macOS path that
   could not exist on the machine it ran on.
5. **Write a `JOURNAL.md` entry before you finish.** The stop-gate hook enforces it. The code is
   recoverable from git; the reasoning is not.

## What "verified" may mean here

Only: the checks named by the approved slice pass for its exact Git tree, and the commit records
them in `Verification` trailers. `node scripts/verification-status.mjs` verifies that binding; it
does not rerun a completed suite. Use `node scripts/check.mjs --slice <affected-test...>` for an
ordinary code slice, and the full `node scripts/check.mjs` for verification tooling, workspace or
boundary changes, a broad/unclassified diff, and feature journeys. Do not report a step as done
because it "should" pass, and do not summarise a failure as a warning. A green typecheck proves
nothing about whether the product works — that proof belongs to a journey, once its gates are
approved.

## Boundaries, stated once

`pipeline` imports no `domain`, no `providers`, no app, and **no I/O at all**. `api` never imports
`providers`. `providers` never imports `domain` or `pipeline`. `contracts` and `reel-contract`
are leaves. The worker never imports providers. Keys stay in providers. A package is entered only
through its `src/index.ts`. The SDK imports no engine internals; only its private launcher may
start a process.

Three more are **between two folders of one package** — the splitter imports nothing outside its
own folder, may be imported only by the planner, and may be entered only through its index
(D-073). Two are about npm packages: the pipeline imports none but `zod`, and nothing outside
`providers` imports a model client (reel-plan, S-020).

These are not conventions. They are **twenty-five** rules checked against the real dependency graph,
and they are expressed on **resolved file paths**, never on the text of an import line — which is
the only reason those three can exist at all, since inside one package every import is relative.

```bash
node scripts/drift.mjs --prove    # writes a file to break each rule; fails if one stays silent
node scripts/drift.mjs --audit    # fails when a rule names a folder that a renamed package lost
```

Never assume a configured rule runs. In the steering repository seven rules sit in a
`.dependency-cruiser.cjs` while the tool itself is not installed, and the script skips the whole
block in silence — so none of them has ever executed. Configured-but-dead reads as covered.

## Things that will waste your time if you have not read them

- `pnpm` is not on PATH. `corepack pnpm <script>`, or call node directly.
- Node 22.14 needs `--experimental-strip-types` to run a `.ts` test, and `--test <dir>` does not
  work — pass a quoted glob.
- `grep`, `sed` and `awk` in Git Bash strip `\r`, so they cannot tell you about line endings.
  Count bytes.
- Shell heredocs here have halved backslashes in transit, turning `\\.` into `\.` inside a regex.
  Read the file back after writing one.
