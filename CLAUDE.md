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
packages/benchmark   pure functions: every measure of a stored run. Reads rows, not a database.
packages/providers   adapters behind the ports, including stand-ins. No durable state.
packages/domain      tables, migrations, the job queue, the budget ledger.
apps/worker          the runner. The only place that knows both a stage and a table.
apps/api             submitting work, reading records. Never calls a provider.
apps/service         the composition root and runnable loopback service.
packages/reel-contract  the caller-facing schemas, types and route contract.
packages/sdk         the typed local client; no engine internals.
```

`packages/reel-contract` is the caller-facing contract (D-094), and `packages/sdk` is its typed
loopback client (S-173, S-175, S-180). `packages/providers` now contains both stand-ins and the
verified paid adapters: MiniMax model and narration, fal image and video, the local picture sensor,
and ffmpeg media/assembly. Which implementation each port receives is a service setting; the worker
is handed ports and never chooses or constructs one. Stand-ins write real PNG, MP4 and WAV files
under one artifact root, `.artifacts/` by default (D-086, D-087), while paid adapters are reached
only by a manually confirmed paid run or an explicitly configured service. A worker awaits the
local tools' `ready()` before it opens its database and refuses to start without them (S-075).
**Twenty-seven** boundary rules are enforced on the real dependency graph, and
`node scripts/drift.mjs --prove` builds a deliberate violation of each one — relative and by
package name, npm packages laid out the way pnpm lays them out — and fails if any case stays silent
or any legal import is reported or fails to resolve. The load-bearing ones: **pipeline imports no
domain, no providers, no app, no I/O at all, and no npm package but `zod`**. A stage is handed a
port; it never reaches for one. **Nothing outside `providers` imports a model client** (`ai`,
`@ai-sdk/*`), and **nothing under `apps/worker` imports `packages/providers`** — the worker is
handed its ports, so it cannot construct an adapter that spends (`worker-no-providers`, S-038).
**Nothing outside `providers` imports `child_process` except
`packages/sdk/src/launcher.ts`**; an independent SDK rule makes that the only SDK exception
(`processes-only-in-providers`, `sdk-processes-only-launcher`, S-075, S-175). Key-shaped
environment reads likewise stay in providers, apart from non-secret service settings.

**Three of the twenty-seven are between two folders of one package**, and they are the reason this is
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

`.claude/agents/` holds the five this repository uses most. Each one names its own model, chosen by what a wrong
answer costs **and written down as a decision** — S-202, which is where the reasoning lives, because until then
two agents ran on Opus with no entry justifying either. Per million tokens in and out: Opus $4/$20, Sonnet $2/$10,
Haiku $1/$5. No agent here uses Fable ($10/$50).

- **`gate-reviewer`** — `sonnet` (**S-202**, down from `opus`). The adversarial review of a feature's four gates.
  Code is written against what it approves, so it is the most expensive wrong answer here — but the work is
  careful cross-reading rather than invention, and **its findings are checkable**: every one names the sentence it
  contradicts and a `file:line` the main session verifies before applying it. **Haiku was refused** for this one:
  its hardest findings need three or four hops across files, and a shallow review is worse than none because it
  reads as coverage.
- **`test-impact`** — `sonnet`. Which verified checks a planned change turns red or wrongly green. Careful reading of
  many test files, no design judgement.
- **`check-runner`** — `haiku`. Runs `check.mjs`, one test file, a drift proof or a named journey, and returns the
  verdict and the decisive lines — never the whole stream.
- **`run-reader`** — `haiku`. Reads a real run's rows from the database, read-only, after it finishes or fails.
- **`slice-builder`** — `opus`, and **the one Opus agent left** (S-202 keeps it, for now). Builds ONE slice of an
  approved feature — tests, code, deliberate breaks — and hands back a report and an uncommitted diff (S-172,
  S-177). One at a time; the main session runs the approved targeted check and commits its tree-bound evidence,
  reserving the full suite for integrity boundaries. It is kept on Opus because it **writes** rather than reads,
  and a bad slice is caught only by the checks it wrote itself — the owner's call to move it is open.

Only `slice-builder` edits code, within the slice it is handed, and it never commits. The reviewer's one allowed edit
is the `Gates:` line of the file it approves.

**What re-reads a whole context is what costs** (S-160): every call of this session and of each agent reads its
context again. `check.mjs` runs no model. Four standing rules:

1. **Agents working at once run as one workflow**, so this thread wakes once, not at every hand-back. A prompt that
   fans out agents says _"use a workflow"_ — the owner's pasted prompt is the opt-in. A fix every agent needs is a
   step in the script.
2. **A session is one phase** — building, a real run and its reel, gates and reviews — handed over by the journal
   and the next prompt; `/compact` between two when one session must hold both. `DECISIONS.md`, `JOURNAL.md` and the
   steering decisions are read by heading, then the entry's lines, never whole.
3. **An agent is handed facts and one test of done**: what several would each measure is measured once and put in
   its brief; its done is one script's pass; a fault in what it was handed is fixed centrally at the first report.
4. **A gate review is continued through SendMessage** after the first round; the round that would approve all four
   is a fresh reviewer.

**`docs/context.md` is read first** — by this session and by every agent, before looking anywhere else: where things
stand, every real run and what ended it, and each session's changes with their paths. **Every session writes its
entry there beside its journal entry**; `tests/context-file.test.ts` is red when the two name different sessions.

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
node scripts/verification-status.mjs             # reuse only evidence bound to HEAD's exact tree
node scripts/check.mjs --slice tests/<feature>-*.test.ts  # static checks plus an approved ordinary slice
node scripts/check.mjs                            # full suite: tooling, broad diffs and journeys
node scripts/check.mjs --changed                  # document-only work
node scripts/check.mjs --documents                # the document checks, asked for by name (S-188)
```

Seven code checks plus two about the authority. `--code` runs only the first seven. A red
`decisions pin` is not yours to fix by editing anything here.

**Biome lints and formats the code; prettier formats only the markup** (S-189). `biome check .` is the `code`
step, 0.49 s for lint and format together, where eslint plus prettier over the same files cost about 12 s.
Prettier keeps Markdown, YAML and the one HTML page, and is handed file paths — never a glob, which it exits 2
on when it matches nothing. `biome format --write .` fixes code formatting alone; `biome check --write .` also
applies safe lint fixes, which is a change to source and belongs in a slice, not in a formatting pass. Biome's
warnings do not gate: the thirteen rules eslint never enforced are `warn` in `biome.json`, named there with the
reason, so nothing that used to be caught stopped being caught and nothing new became a blocker without a
decision.

**`--changed` is enough for documents** (S-159, superseded in part by S-177 and S-193): **any Markdown file,
wherever it lives** — `docs/`, `PROMPTS/`, the journal, decisions, this file, an agent's description under
`.claude/agents/`, a skill's `SKILL.md`, a package README, the copied authority — runs markup formatting
(prettier over the files that differ, 0.26 s for two of them against 8.7 s for all 126, S-189), the authority
and the four file scans, and nothing of code. Prose stops costing the suite; what executes does not become
prose, so `.claude/settings.json` and `.claude/hooks/*.sh` are still code paths and a check holds that line. A code diff cannot use it, unless the recorded full run already
covered that exact code (S-214, the carry):
it must name every approved affected test through `--slice`, or use the full run. `--slice` always runs typecheck,
the code check, the markup that differs and all boundary checks, then only its named test files; it rejects an
unlisted changed test, an unknown path, and verification infrastructure. `--dry-run` says which checks would run and why.

**Markdown written after a green full run NEVER costs a second suite** (S-214, and it is the owner's
standing instruction — do not ask again and do not reason around it). The journal entry, this file,
`docs/context.md`, a journey's three lines: write them, then run `node scripts/check.mjs --changed`. It
compares the working content against **the tree the recorded full run tested**, not against HEAD, and when
every path that differs is Markdown it runs the markup, the four scans and the authority — about 13 s — and
records **`Verification: full`** for the new tree. That word is the truth: the suite ran, on this content's
code, byte for byte; only prose came after it. The commit carries the ordinary `Verification: full` and
`Verification-Tree:` and nothing else. **A code path in the diff that the recorded run never saw refuses the
carry and says which path did it** — that case owes `--slice` or the full run exactly as before. The checker
writes the trailer it recorded and prints it at the end of a green run (S-213): copy it, never type it.

**The suite's `tests` step is two pools that never overlap** (S-192, superseding S-176 in part):
`scripts/run-tests.mjs` runs the ordinary files at an outer concurrency of **4**, then the thirteen
PATH-only journey children at a pool of **2**, each still spawning the 2 or 4 its own file ratifies.
**617 s where the serial runner took 1455 s**, nothing skipped, with each pool's time and lowest free
memory written into the receipt and printed on every run. The sizes rest on four consecutive green
full runs, whose lowest free memory was **2483 MB of 15714 MB** — the floor moves with the machine's
state, not with the pools, so the figure to compare against is each run's own `freeMinMB` in the
receipt; raising either size needs its own three runs, and `node scripts/run-tests.mjs --serial` restores S-176's single serial pool for a bisect.
Test files are enumerated from the filesystem, so an uncommitted one still runs.

**A code diff asks the recorded impact map which tests to run** (S-196, superseding S-177 in part).
`node scripts/impact-map.mjs` runs each test file alone under `NODE_V8_COVERAGE` — 402 s — and records
every file of this repository that process or any process it spawned loaded, plus every repository path the
test NAMES as a string, which is how a tool a test copies into a scratch repository is credited. The thirteen
PATH-only children are derived from their feature's siblings and never measured, because coverage reaches a
child through an environment variable and those files exist to prove none does. `--changed` then runs the
static checks, the boundary proofs and exactly the covering tests, through the two pools when more than
eight files are selected. **It is worth 617 s to 4 s for a change under `packages/sdk` or `scripts/`, and
close to nothing for a change inside the engine**: a package is entered only through its `src/index.ts`
(D-094), so importing one symbol loads the whole package and the median change selects 110 of 156 test
files. Every uncertainty still owes the full run — an unclassified path, verification infrastructure,
tooling or workspace configuration, a missing map, or a changed file no recorded test covers.

**The full run is reserved for integrity boundaries**: a change to checking/journey/boundary tooling, workspace or
dependency configuration, an unclassified or broad diff, and a feature journey at content no recorded full run has
seen (S-188, superseding S-177's _"every feature journey"_). An ordinary slice commits only
after its targeted run passes. Its commit carries `Verification: targeted` (or `full`), `Verification-Tree`, and for
targeted evidence `Verification-Tests`; `verification-status.mjs` refuses a stale tree. This keeps a clean later
session from rerunning a suite that already passed for the same commit without accepting evidence for changed code.

**A feature in `docs/features/` is verified only by its journey** (S-016), run after its last slice is
committed:

```bash
node scripts/journey.mjs <slug>
```

It writes the evidence, the status and the divergence. Never type any of the three by hand. A FAIL is the finding:
stop and report.

**Nothing re-runs at a tree where a recorded full run already passed** (S-188). A full `check.mjs` run writes
`.verification/receipt.json` — gitignored, naming the content it tested, each check's verdict and each test file's
counts — and the journey reads it: at the same content it runs nothing; where only Markdown differs it runs
`node scripts/check.mjs --documents` (format, the four scans, the authority) and nothing else; anything else is the
full suite. Only a green `full` receipt naming the feature's own passing test files qualifies. The receipt is
written by the checker, not typed, and the content it names is the content a commit of that working copy writes —
so the usual order, change then full run then commit, stays reusable. **The same record is what `--changed`
carries** (S-214): prose written after that run is checked against it, not against HEAD, which is why a journal
entry or a journey's verdict costs 13 s and not 617 s. Only a green full run writes it, so a failed run cannot
throw away the record it rests on.

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
