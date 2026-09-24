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
   **Every feature is planned here**, in `docs/features/`, including `reel-stills` and
   `reel-render`, moved before their gates were written (S-033, superseding S-017's exception). Trivial fixes (one file, no new route, table, job or screen) skip
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
given every package source by its Slice 3; **the only `LanguageModelPort` is the stand-in** in
`packages/providers/src/fake/`, and the worker is handed it rather than choosing one (S-021). The
same holds for **the only `ImagePort` and `PictureSensorPort`**, since `reel-stills`' Slice 3 (S-038):
the image stand-in writes real PNGs under one artifact root, `.artifacts/` by default (D-086, D-087).
And for **the only `VideoPort` and `NarrationPort`**, since `reel-render`'s Slice 3: stand-ins writing
real MP4s (through ffmpeg) and WAVs under the same root. **The one real adapter is ffmpeg on this
machine** — the `MediaPort` and the `AssemblerPort` in `packages/providers/src/ffmpeg/` — which costs
nothing, reads no secret and reaches no network; a worker awaits both ports' `ready()` before it opens
its database, and refuses to start without the tools (S-075).
**Nineteen** boundary rules are enforced on the real dependency graph, and
`node scripts/drift.mjs --prove` builds a deliberate violation of each one — relative and by
package name, npm packages laid out the way pnpm lays them out — and fails if any case stays silent
or any legal import is reported or fails to resolve. The load-bearing ones: **pipeline imports no
domain, no providers, no app, no I/O at all, and no npm package but `zod`**. A stage is handed a
port; it never reaches for one. **Nothing outside `providers` imports a model client** (`ai`,
`@ai-sdk/*`), and **nothing under `apps/worker` imports `packages/providers`** — the worker is
handed its ports, so it cannot construct an adapter that spends (`worker-no-providers`, S-038).
**Nothing outside `providers` imports `child_process`** — a process is started only behind a port
(`processes-only-in-providers`, S-075).

**Three of the nineteen are between two folders of one package**, and they are the reason this is
dependency-cruiser rather than a script matching import text. It resolves every import to a file
path, so `'../split/index.ts'` and `'@cutroom/pipeline'` are the same kind of thing to it:
`split-imports-only-itself`, `split-imported-only-by-plan`, `split-entered-through-its-index` —
**D-073**, whose stated check was never buildable against import text, because inside one package
every import is relative. (`plan-no-epistemic` and `split-no-cinematic` are gone — **S-020**.)

**The npm rules see an import only if it resolves to a `node_modules` path.** That is why
`node_modules` is not in `options.exclude`, why `dist` there is anchored to this repository's own
output, and why the resolver is given `conditionNames` — each of the three, undone, makes a rule
silent on `ai` (S-020).

**`split/` and `plan/` exist, and every folder rule is live.** `node scripts/drift.mjs --audit`
reports every rule whose folders are absent, and **fails** once a package has source files while a folder one of its
rules names is still missing — which is what a rename looks like. A rule that reads correctly and
matches nothing is the worst state to be in, because it reads as coverage.

A package is entered **only** through its `src/index.ts`. Adding a package's first file also
means adding its reference to the root `tsconfig.json` — `tests/workspace.test.ts` fails if you
forget, because an unreferenced package is one nothing typechecks.

## Subagents, and the model each one runs on

`.claude/agents/` holds the four this repository uses most. Each one names its own model, chosen by what a wrong
answer costs. Per million tokens in and out: Opus $4/$20, Sonnet $2/$10, Haiku $1/$5. No agent here uses Fable
($10/$50).

- **`gate-reviewer`** — `opus`. The adversarial review of a feature's four gates; every review so far. Code is
  written against what it approves, so it gets the strongest model this repository uses.
- **`test-impact`** — `sonnet`. Which verified checks a planned change turns red or wrongly green. Careful reading of
  many test files, no design judgement.
- **`check-runner`** — `haiku`. Runs `check.mjs`, one test file, a drift proof or a named journey, and returns the
  verdict and the decisive lines — never the whole stream.
- **`run-reader`** — `haiku`. Reads a real run's rows from the database, read-only, after it finishes or fails.

None of them edits code. The reviewer's one allowed edit is the `Gates:` line of the file it approves.

## Environment traps, each one already paid for

- **`pnpm` is not on PATH** and is not installed globally. Use `corepack pnpm <script>`, or skip
  it: `node scripts/check.mjs`.
- **ffmpeg and ffprobe must be on PATH** — 8.1.1 here, through WinGet's Links folder. Nothing in this
  repository installs them and no path to them is written (S-075, D-086): a worker without them
  refuses to start, and the suite needs them, including the checks that run it with PATH alone.
  Start either with an argument array, never a shell string; a Windows path inside a filtergraph needs
  its `:` and `\` escaped, one given as an input or output argument does not. The detectors a scan
  parses report on stderr at info level, so no quieter log level.
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
node scripts/check.mjs            # every check: before committing code, and inside every journey
node scripts/check.mjs --changed  # between steps: what the paths changed since HEAD can turn red
```

Seven code checks plus two about the authority. `--code` runs only the first seven. A red
`decisions pin` is not yours to fix by editing anything here.

**`--changed` is enough between steps** (S-159): documents alone — Markdown under `docs/` or `PROMPTS/`, the journal,
the decisions, this file — run the formatting, the two authority checks and the three scans that read files other than
code, in about 13 s; one path of code, or one it does not recognise, runs everything. `--dry-run` says which and why.
**The full run is required before committing code, and before a feature's journey**: `--changed` trusts HEAD, and
that rule is what keeps HEAD green.

**A feature in `docs/features/` is verified only by its journey** (S-016), run after its last slice is
committed:

```bash
node scripts/journey.mjs <slug>
```

It runs every check and `tests/<slug>-*.test.ts`, and writes the evidence, the status and the divergence. Never
type any of the three by hand. A FAIL is the finding: stop and report.

## Prompts

Every session's opening prompt is kept in **`PROMPTS/`** (S-065): one file per session, `NNN-<feature>-<work>.md`
with `NNN` the session's number in `JOURNAL.md`, a short label, and the prompt verbatim in a fenced `text` block, listed
in `PROMPTS/README.md`. Asked for the next session's prompt, write it there and commit it — never leave a prompt
untracked at the root, where it makes `journey.mjs` refuse. When you run a prompt, set its `Run` line.

## Copy voice, when anything becomes user-visible

The design's words, not ours: "kept things" not Relics, "checked out" not documented, "a place"
not World. **No scores, no streaks, no time-spent, no percentages.** Never build streaks, XP,
progress dashboards, quizzes, notification pressure, follower counts or a marketplace — see the
steering repository's `docs/founding/RESEARCH.md` §19.
