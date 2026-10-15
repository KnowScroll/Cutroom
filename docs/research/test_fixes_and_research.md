---
status: research
authority: none — a record of what was measured and what to try, not a decision; a choice made from it is an S- entry
---

# Making `check.mjs` and the suite cost less

Written 2026-10-14 from measurements taken on this machine (16 logical cores, 15.3 GB) and from
timings already recorded inside the test files themselves. Companion to
[`knowscroll-agent-setup.md`](knowscroll-agent-setup.md), which covers what KnowScroll's repository
does differently; this file is only about our own check and suite time.

Nothing here is a decision. Every lever in §4 names the decision it needs, what it rejects, and what
would catch it going wrong. Two rules hold throughout: **never raise a bound, skip a journey or
narrow a check to reach green** (CLAUDE.md rule 3), and **a contention red is intermittent**, so no
scheduling change is believed on one green run.

---

## 1. What costs what today

Measured 2026-10-14, warm, this tree:

| Step                                    | Time                                                       | Runs in `--slice`? |
| --------------------------------------- | ---------------------------------------------------------- | ------------------ |
| typecheck (`tsc -b`)                    | **0.23 s**                                                 | yes                |
| lint (eslint over the repo)             | **6.25 s**                                                 | yes                |
| format (prettier over the repo)         | **14.07 s** — code **5.74 s**, Markdown **7.00 s**         | yes                |
| boundaries (`drift.mjs`)                | **2.08 s**                                                 | yes                |
| boundaries proven (`drift.mjs --prove`) | **6.45 s**                                                 | yes                |
| no dead rule (`drift.mjs --audit`)      | **0.23 s**                                                 | yes                |
| four file scans                         | **0.46 s**                                                 | yes                |
| decisions pin                           | **0.29 s**                                                 | authority          |
| copied docs                             | **0.19 s**                                                 | authority          |
| **static total**                        | **≈ 30.3 s**                                               | every run          |
| tests, whole suite                      | **1413 s** at `127adc5`, 149 files, `--test-concurrency=1` | only named files   |

Other measured facts, for sizing:

- Tracked Markdown: **3 674 527 bytes**. Prettier on two changed files: **0.46 s** versus **7.00 s**
  for all of it.
- `openDatabase()` migrates on open: **36.4 ms** per fresh database against **0.8 ms** to copy an
  already-migrated `.sqlite`. Eight migrations.
- Instruction and gate files an agent reads before it starts: `CLAUDE.md` **13 923 B**, `AGENTS.md`
  **5 946 B**, `docs/context.md` **38 476 B**, `JOURNAL.md` **35 759 B**,
  `docs/features/yield-benchmark.md` **108 893 B**, `docs/features/cut-rules.md` **19 921 B**.

## 2. Where the suite's 1413 s goes

**Eleven** files are not ordinary tests: `tests/*-secrets.test.ts` for `ask-again`, `cut-rules`,
`paid-failures`, `paid-path`, `reel-plan`, `reel-render`, `reel-stills`, `reel-takes`,
`resume-failed`, `second-ask`, `three-pictures`. Each one spawns **its own `node --test` child** that
re-runs that feature's other test files in an environment holding only PATH (plus the eleven
variables libuv copies on Windows), with canary keys planted in the parent — S-028's form, quoted
from `paid-path-secrets.test.ts`: _"every other test of this feature passes in a child process whose
environment holds only PATH and what the operating system needs to start Node."_

**So most features are paid for twice**: once in the outer run, once inside their secrets child. That
duplication, not migrations and not JavaScript, is the biggest block of the 1413 s.

Timings already written into those files:

| File                     | Child's own cost, as recorded there                  | Checks re-run | Child concurrency | Bound |
| ------------------------ | ---------------------------------------------------- | ------------- | ----------------- | ----- |
| `reel-render-secrets`    | **116 s** in-suite at Node's default; **97 s alone** | 49            | 4                 | —     |
| `reel-takes-secrets`     | **101 s** at default; **130 s** bounded to four      | 25            | 4                 | —     |
| `paid-path-secrets`      | **52 s** alone (2026-09-21)                          | 21            | 4                 | 360 s |
| `reel-stills-secrets`    | not recorded                                         | 49            | default           | —     |
| `ask-again-secrets`      | not recorded                                         | 22            | 2                 | 600 s |
| `paid-failures-secrets`  | not recorded                                         | 11            | 4                 | 300 s |
| `three-pictures-secrets` | not recorded                                         | 11            | 2                 | 600 s |
| `second-ask-secrets`     | not recorded                                         | 8             | 2                 | 600 s |
| `cut-rules-secrets`      | not recorded                                         | 4             | 2                 | 600 s |
| `resume-failed-secrets`  | not recorded                                         | —             | 2                 | 600 s |
| `reel-plan-secrets`      | not recorded                                         | —             | default           | —     |

Eleven children at 60–90 s each is **≈650–1000 s of the 1413 s** _(estimate; three of eleven are
actually recorded)_.

**The wall is memory, not cores.** From `reel-takes-secrets.test.ts`, measured 2026-09-20 with the
outer runner at Node's default: _"at Node's default this child took 101 s and the machine was down to
**815 MB of 15.7 GB** free, with check 50 at **248 s of its 300-second bound**; bounded to four,
130 s, 1306 MB free, check 50 at 237 s and the suite 11 s shorter"_ (S-107).

**What S-176 actually chose.** `--test-concurrency=1` for the outer runner, because Node's default
(`availableParallelism() - 1`, so **15** here) overlapped ordinary test work with those nested child
suites and killed a child at its unchanged 300-second bound _"despite its assertions otherwise
passing"_. S-176's rejected list names raising the child timeout, reducing child concurrency,
skipping the secrets journey, and keeping parallel outer execution with a 40-line failure tail. **It
does not name a bounded pool that never overlaps the two classes** — that is the gap §4.2 aims at.

## 3. Measure first — the one pass to run before changing anything

**HALF TAKEN, 2026-10-15, session 88 — see S-190.** `.tmp/measure.mjs` runs every file alone, times it,
counts its tests and samples free memory; it reached **80 of 153 files (644 s, no reds)** before Claude Code
killed the background shell for system memory pressure. What it says already: five of the eleven secrets
journeys account for **85 s** of that, `paid-path-secrets` **49.4 s** alone (its own file recorded 52 s), the
heavy files are the media ones (`paid-path-refusals` 39.3 s, `reel-render-gates` 29.6 s,
`reel-render-faults` 27.7 s, `reel-render-pass` 27.0 s), and **the lowest free memory seen anywhere was
3045 MB** of 15.3 GB — so S-107's 815 MB was a wall of overlap, not of any one file. **Six secrets journeys
remain unmeasured, including the two largest known**, so the subtraction below has no answer yet and §4.2
must not be sized until it does. Finish it in slices, secrets first: `PROMPTS/083-measure-and-schedule.md`.

Run on an idle machine, with no other session building in this tree (contention is the variable
being measured, so a second session invalidates the numbers). Write everything to `.tmp/`, which is
gitignored. The measurement runner is a throwaway in `.tmp/`, **not** a committed script, so it
carries no verification obligation; if it ever becomes a committed tool it is checker tooling and
S-177 makes it a full-suite change.

Record, per test file:

1. **Wall time alone.** Invoke each file in its own `node --experimental-strip-types --test <file>`
   and time it. Sort descending. ~25–30 min for the set, once.
2. **Each secrets child's elapsed time**, and its **margin against its own bound** (three of eleven
   print this today; the other eight should, and that is a one-line addition inside each test).
3. **Free memory at its lowest** during each heavy file — sample `os.freemem()` on an interval from
   the measuring process, the way S-107's note did it by hand.
4. **The subtraction**: outer suite total − Σ secrets children = what the ordinary ~150 files cost.
   That ratio decides whether §4.2 or §4.4 is the real lever.

Deliverable: one table in `.tmp/`, pasted into the session's journal entry and into the `S-` entry
of whatever is changed afterwards. Until it exists, every number in §4 is an estimate.

## 4. The levers

### 4.0 Wire `journey.mjs` to the evidence record S-177 already built — touches no property at all

**BUILT, 2026-10-15, session 88, as S-188** — shape B, plus a document-only delta the owner chose
over exact-tree-only. One measurement changed the build: Node 22.14 attributes no test to its file in either
built-in reporter (tap and junit both print one flat stream for several files), so the receipt collects per-file
results through `scripts/test-receipt.mjs`, reading the runner event stream. The tested tree is the content the run
saw, written through a throwaway index, not HEAD. Read S-188 rather than the plan below for what holds.

**What is there now.** `scripts/journey.mjs:89` runs `scripts/check.mjs` — the full thing, all nine
checks including the 1413 s suite. Then `scripts/journey.mjs:99-101` runs `tests/<slug>-*.test.ts`
**again**, with a TAP reporter, to count them; the suite at line 89 has just run those same files.
`journey.mjs` contains no reference to `verification-status`, `Verification-Tree` or reuse — the grep
is empty. `scripts/verification-status.mjs` is 37 lines whose own header reads: _"Evidence is
commit-tree-bound: a later session may reuse a completed run only when HEAD still names the exact
tree it tested (S-177)."_ Its only caller is `.claude/hooks/stop-gate.sh:31`.

**Be precise about what kind of finding this is.** Nothing is being violated. CLAUDE.md lists _"every
feature journey"_ among the cases reserved for the full run, so `journey.mjs` does exactly what is
written. The finding is the tension beside it: S-177 built tree-bound reuse so that _"a clean later
session"_ need not rerun _"a suite that already passed for the same commit"_, and then the single most
expensive consumer of that mechanism was left outside it. An unused mechanism, not a broken rule —
and still worth closing, because it is the cheapest large saving in this file.

**The owner has settled it**, 2026-10-14: _"this needs to be the case dont fucking re run shit that
has already ran and didnt change."_ So the rule to write is not "may reuse" but **nothing re-runs at a
tree where it already passed** — the journey included. What remains to decide is only the shape
below, and the `S-` entry's exact wording.

**Change, shape A — reuse the suite, re-run only the feature's tests.** Skip the `check.mjs` call
when HEAD carries `Verification: full` **and** `Verification-Tree` equal to
`git rev-parse HEAD^{tree}`; still run `tests/<slug>-*.test.ts`, because that is where the evidence
line's test count comes from. ~24 min → seconds to a couple of minutes. Cheap, but it still re-runs
files the suite just ran, which is exactly what the owner's rule forbids.

**Change, shape B — re-run nothing, which is what the rule actually asks for.** `check.mjs` writes a
machine receipt alongside its run: tree sha, each check's verdict and duration, and **each test
file's result and assertion count**. `journey.mjs` reads the receipt, takes its own slug's files out
of it, and writes the evidence line from recorded numbers. A journey at an already-verified tree then
costs milliseconds. This is strictly more work to build — the receipt has to exist and be trustworthy
— and it is the version that matches the decision rather than approximating it.

Recommended: build the receipt (shape B) and let shape A be what happens when no receipt is present
yet, so nothing is blocked while the receipt lands.

**Two hard conditions.**

1. **Only `full` qualifies.** `targeted` evidence names a subset of tests, so it cannot support the
   journey's claim that every check was green. A journey accepting it would be weaker than its own
   sentence.
2. **Every existing refusal stays** — dirty tree, gate not approved, slice not ticked, no test named.

**Where the saving actually lands.** A slice commit carries `targeted`, so reuse does nothing
immediately after one. It pays when a journey follows an integrity-boundary full run at the same
commit, and it pays most in the **re-journey chains**: `cutroom-sdk` at `1c7c77d`, `reel-contract` at
`6a95a8d`, then `7c648d2`, then `6001657` — each re-ran the whole suite at a tree where it had
already passed. After wiring, the first journey at a tree costs the suite and every journey after it
at that same tree costs only that feature's tests.

**The honest cost, which belongs in the decision.** Today the journey makes its own independent
observation and trusts nothing. Afterwards it accepts a recorded one, and `verification-status.mjs`
validates the _binding_, not that the run happened — a trailer is a claim someone wrote. Mitigation,
which joins this to the committed-receipt item in
[`knowscroll-agent-setup.md`](knowscroll-agent-setup.md) §14: have `check.mjs` write a machine
receipt (tree sha, per-check verdict, duration, timestamp) that the journey reads, so reuse rests on
a receipt rather than on prose in a commit message.

**Decision to write.** An `S-` entry on the owner's word above: **no check and no test re-runs at a
tree where recorded `full` evidence already passed**, the journey included. Rejected: accepting
`targeted` evidence in a journey's place (it names a subset of tests, so it cannot carry "every check
was green"); re-running the suite on every journey at an unchanged tree (today's behaviour, and the
reason a re-journey chain costs hours); and trusting a trailer alone once the receipt exists.
`Supersedes` must name the part of **S-177** that lists _"every feature journey"_ among the full-run
cases — and CLAUDE.md's matching sentence changes with it. **S-016 is untouched**: the journey is
still the only thing that verifies a feature and still the only writer of its evidence line; it stops
re-measuring an unchanged tree, it does not stop judging.

`Caught-by:` `tests/journey.test.ts`, which already drives `journey.mjs --repo <dir>` against a
scratch repository — a `full` trailer bound to the tree must not invoke `check.mjs`, and must still
write an evidence line naming the commit and the real test count; a `targeted` trailer, a mismatched
tree or no trailer must invoke it; and a receipt whose tree sha does not match HEAD must be refused
rather than read.

**Verification.** Journey tooling, so S-177 makes the change itself a full-suite verification — once,
at the commit that introduces it.

### 4.1 Biome for code, prettier only on changed Markdown — do first

**BUILT, 2026-10-15, session 88, as S-189.** Measured after: the `code` step (biome, lint and format
together) **0.492 s**; markup over all 126 files **8.7 s**, over two changed files **0.259 s**. A slice's
static checks **≈6.9 s** against 30.3 s, a documents-only `--changed` run **≈1.2 s** against ≈15 s, a full
run's static part **≈15.4 s**. Better than the ≈11 s estimated below. Two things this plan did not foresee:
prettier exits **2** on a glob matching nothing, so the markup step enumerates files from git
(`scripts/_markup.mjs`); and `--documents` must NOT be narrowed to the changed set, because a journey
resting on a recorded run has a clean tree and the check would be vacuous. Read S-189 for what holds.

**Change.** Replace eslint + prettier for `.ts`/`.mjs`/`.json` with Biome; keep prettier for
Markdown but run it on changed files only, not all 3.67 MB.

**Effect.** Static total **30.3 s → ≈11 s** _(biome itself estimated ~0.5 s; the rest measured)_.
That is on every `--slice` run, several times a session. A document-only `--changed` run goes
**≈15 s → ≈1.5 s**.

**Checked.** Our `eslint.config.mjs` is `js.configs.recommended` + `tseslint.configs.recommended` +
three rules and sets no `parserOptions.project`, so **no type-aware lint rule is in use** — the one
thing Biome cannot replace. Biome does not format Markdown, which is why prettier stays for `.md`.

**Risk.** Low. Rule-for-rule coverage differs; the migration should list which eslint rules have no
Biome equivalent and either accept or keep them. Formatting the whole tree once with Biome produces a
large, mechanical diff — do it as its own commit.

**Decision.** An `S-` entry: chose Biome for code, rejected keeping eslint+prettier (20 s per run)
and rejected Biome for Markdown (unsupported). `Caught-by:` `check.mjs` runs both steps and
`tests/check-changed.test.ts` still compares the code-path selection to the full runner's dry run.

### 4.2 A two-class scheduler in `check.mjs` — biggest win per unit of risk

**Change.** Two pools, never overlapping: the ~150 ordinary files at outer concurrency **4–6**, then
the eleven secrets children at a pool of **2–3**. Every child keeps its ratified internal concurrency
(2 or 4) and its bound unchanged.

**Effect.** _Estimate, pending §3:_ eleven children ≈700–1000 s serial → ≈250–350 s at a pool of 3;
ordinary files cut by the pool factor. Suite plausibly **8–12 min instead of 23.5**.

**Risk.** Memory. Pool 3 × internal 4 = 12 test processes, each able to spawn ffmpeg, a service and a
worker. S-107 recorded 815 MB free at ~15 outer files. The pool size must be the largest that keeps
**free memory above a recorded floor** and **every child's margin against its bound above a recorded
minimum**, and both numbers belong in the decision.

**Decision.** An `S-` entry superseding **S-176 in part**: the outer scheduler becomes class-aware
instead of a single number. State plainly that S-176's four rejections still stand — no bound raised,
no child concurrency reduced, no journey skipped, no file dropped — and that this removes the _cause_
S-176 named (overlap between ordinary work and nested child suites) rather than widening a limit.
`Caught-by:` **three consecutive green full runs**, with recorded peak memory and worst child margin;
a single green run is not evidence for a contention change.

**Verification.** Checker tooling, so S-177 requires the full suite, not `--slice`.

### 4.3 Split the work across CI jobs — free parallelism

**Change.** `hosted-checks` with four jobs: static + boundaries | ordinary tests | the eleven secrets
children | one job per feature journey.

**Effect.** Parallelism without contention here, because each job is a different machine — and it
makes every old journey re-run on every push, which is the thing we have no equivalent of today.
Their repository runs its nine journeys as serial steps in one job, so a job-per-journey split is
better than their arrangement, not a copy of it.

**Risk and limits.** Ubuntu is a second platform for us: PATH-only ffmpeg from WinGet, CRLF tree,
`tests/line-endings.test.ts`, the known PATH-only child transient. **S-183 stands: a hosted run is
corroboration and carries no trailer.** No key and no paid run ever reaches CI; the eleven secrets
journeys and `tests/paid-path-keys.test.ts` are what prove that, and they stay.

**Prior art to lift rather than redesign** (from `KnowScroll/knowscroll@dev`'s
`.github/workflows/checks.yml`): action SHAs pinned with the version in a comment; an explicit
`apt-get install -y ffmpeg` step, because the runner image does not ship it; `timeout-minutes` on
long jobs; evidence uploaded on `if: failure()` and on `always()` for interruption receipts.

### 4.4 Narrow what each secrets child re-runs — the structural halving, and the one that touches a property

**Change.** A child re-runs only the tests of its feature that could actually read a credential —
those touching a provider, an adapter or an environment read — instead of _every other test of the
feature_.

**Effect.** Potentially the largest single cut, since §2 says the duplication is most of the suite.

**Risk.** This changes the scope of a proven property. Today nobody has to decide which test might
see a key, because all of them are checked; afterwards someone does, and a wrong answer makes the
check quietly narrower than its name. The per-feature list would need its own test keeping it in
sync with the feature's real file set, or it rots into coverage theatre.

**Decision.** Supersedes **S-028** by name, with a gate-level argument, not a tweak. Do it last, on
the §3 numbers, and only if §4.2 and §4.3 have not already made the suite cheap enough.

### 4.5 Already available, costs nothing — keep using `--slice`

S-177 means the 1413 s is owed only at integrity boundaries: checking/journey/boundary tooling,
workspace or dependency configuration, an unclassified or broad diff, and every feature journey. An
ordinary slice runs static checks, the boundary proofs and its named affected tests, then commits
`Verification: targeted`, `Verification-Tree` and `Verification-Tests`;
`verification-status.mjs` refuses stale evidence. If a session is spending 23 minutes routinely, that
is habit, not requirement.

### 4.6 Shrink the work itself — only after §3 names the offenders

Candidates once the per-file table exists: shorter or smaller ffmpeg fixtures, fewer encodes per
assertion, reuse of one migrated template database for read-only tests. Sizing is known for the last
one and it is small: **36.4 ms → 0.8 ms** per database, so even a thousand opens is ~35 s of 1413 s.
Worth doing for tidiness, not for speed.

### 4.7 Rejected, with reasons

- **Raising `--test-concurrency` to Node's default and nothing else.** Re-creates exactly the failure
  S-176 measured: a child killed at its bound while its assertions pass. A red that is not a finding
  is worse than a slow suite.
- **Raising any child bound (300 / 360 / 600 s).** On S-176's rejected list; turns contention into a
  longer wait and weakens a known limit.
- **Skipping, quarantining or `--slice`-excluding a secrets journey.** Removes the only proof that
  tests cannot see credentials.
- **`--experimental-test-isolation=none`.** One process for all files, no per-file isolation. Several
  of our tests manipulate PATH and the environment and spawn children; shared-process isolation
  breaks precisely those.
- **Copying their `createdb -T` template trick as a speed measure.** Measured above: not our
  bottleneck.
- **A RAM disk for `TMPDIR`.** No built-in one on Windows, and the suite's cost is processes and
  codecs rather than file I/O. Revisit only if §3 shows otherwise.

## 5. Order of work

1. ~~**§4.0 wire `journey.mjs` to tree-bound `full` evidence.**~~ **Done: S-188, session 88.** It removes
   the whole suite from every journey after the first at one tree, and the document checks (~15 s) are all a
   re-journey chain pays after its first run.
2. ~~**§4.1 biome + changed-Markdown formatting.**~~ **Done: S-189, session 88.** ~23 s off a slice run and
   ~14 s off a documents-only run, measured.
3. **§3 the measurement pass.** Idle machine, `.tmp/`, one table. Nothing after this is guesswork.
   **Half taken (S-190): 80 of 153 files. Finish it in slices, secrets journeys first.**
4. **§4.2 the two-class scheduler**, sized from §3, with three green full runs as its evidence.
5. **§4.3 CI jobs** as `hosted-checks`, gates already written and round 1 answered.
6. **§4.6 fixture shrinking**, against the named offenders.
7. **§4.4 the S-028 narrowing**, only if still needed, with a gate.

Each of 1, 2, 4, 5 and 7 is one session's phase under S-160 rule 2, with the journal and the next
prompt as the handover.

## 6. What "done" looks like for each change

- A number, before and after, from the same machine in the same state.
- For anything touching the scheduler: three consecutive green full runs, the recorded free-memory
  floor, and every child's worst margin against its own bound.
- An `S-` entry naming what was rejected and the mechanism that catches a violation.
- No bound raised, no check narrowed, no file dropped. If a check cannot be made to pass as written,
  that is a finding to report, not a check to adjust (S-185's bargain).

## 7. For the owner

1. **Is a hosted run ever allowed to carry a trailer?** S-183 says no today. While that holds, CI
   buys regression coverage and parallel corroboration but does **not** take the 23 minutes out of a
   journey session. Worth settling before §4.3 is built, because it changes what CI is for.
2. **Is the S-028 narrowing (§4.4) on the table at all?** It is the only lever that touches a proven
   property's scope, and the only one that could halve the suite outright.
3. **Pool size is a spend-free risk decision**: a larger pool is faster and nearer the memory wall. The
   floor belongs to you, not to the measurement.
4. **ANSWERED, 2026-10-15: yes, and wider than asked — a document-only delta too (S-188).** §4.0's whole saving is that trade. The
   mechanism already exists and is tree-bound; what changes is that a journey would believe a receipt
   it did not watch being produced.
