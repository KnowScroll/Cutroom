---
status: current
authority: plan
---

# hosted-checks — this repository's checks measured on a hosted runner, as corroboration and never as verification

Status: planned
Decisions: D-022, D-086, S-016, S-075, S-111, S-159, S-176, S-177, S-183
Named only as what it cannot do: S-178
Gates: product NOT APPROVED 2026-10-12 round 1 · architecture NOT APPROVED 2026-10-12 round 1 · program-design NOT APPROVED 2026-10-12 round 1 · slices NOT APPROVED 2026-10-12 round 1

> **Created 2026-10-12 in this repository at the owner's request**, in session 84, out of
> `PROMPTS/078-ci-on-github-actions.md`. The owner made `KnowScroll/Cutroom` public before this
> session; standard GitHub-hosted runners are free for public repositories, so running the suite
> somewhere other than this laptop became free for the first time. **Its gates are not approved.**
> Round 1 of adversarial review returned 17 findings and approved nothing; this file is the revision
> that answers them, and it awaits round 2. No `.github/` file belongs on `main` until all four
> gates are approved (CLAUDE.md rule 1). The report-only measurement workflow lives on the
> `ci-measurement` branch and nowhere else.

## Feature summary

A hosted runner runs `node scripts/check.mjs` — the whole suite, every bound and timeout exactly as
this repository has them — and reports how long each check took. **Its result is corroboration, not
evidence.** The local full run stays the sole authority for S-177's `Verification:` trailers, and
`scripts/verification-status.mjs` is not changed by this feature.

What that buys, and it is the whole case for the feature: an independent reproduction on a machine
nobody configured by hand, which is the only thing that can catch a green that depends on this
laptop; and a second platform, so that Linux stops being a guess.

What it does not buy, and must never be claimed to: a commit is not verified because a hosted run
was green, and a commit is not unverified because a hosted run was red.

**What round 1 established, and the gates now say outright:** this may not be obtainable on a
4-vCPU runner at all. See Gate 1, choice 2 and its stop condition.

## Goals

1. **Measure, before anything claims to be verification.** Wall clock per check step, peak resident
   memory where the runner reports it, and every failing step with its decisive line — by a
   retrieval path that is itself settled (choice 8), because the first run proved the obvious one
   does not work.
2. **Keep the authority local.** No change to `scripts/verification-status.mjs`, no new trailer, no
   hosted journey, no commit written by a runner. **This is a convention backed by two narrow
   checks, not a proof** — see choice 1 for exactly how far the enforcement reaches.
3. **Spend nothing, and be unable to spend.** Every provider defaults to the stand-in, so the suite
   needs no key. `scripts/real-reel.mjs` is the only script that spends and nothing automatic may
   reach it.
4. **Weaken nothing to be green there.** A red that is only about the runner is recorded as a
   runner fact. Raising a timeout, loosening a bound, skipping or conditioning a test, adding
   `continue-on-error` **or its disguises**, or re-running until green and reporting the green are
   all forbidden (CLAUDE.md rule 3; S-111's own reason).
5. **Leak nothing.** No `secrets` reference in any form, `permissions: contents: read` at workflow
   _and_ job level, and no trigger a stranger can start.

## Non-goals

- Verification evidence from a hosted run (choice 1 — rejected, with the exact conditions under
  which it could be reconsidered).
- Hosted journeys (choice 3 — `scripts/journey.mjs` writes into the repository).
- Required green on Linux (choice 2 — Linux is an unverified port, session 81).
- A self-hosted runner (choice 6 — priced and rejected).
- Any change to S-177's targeted-slice arrangement (choice 5).
- Caching `node_modules` or the pnpm store. A cache is a way for one run to inherit another run's
  state, and the first thing it would hide is a lockfile that no longer installs cleanly.

## Gate 1 — Product: the nine choices, each with what was rejected

### Choice 1 — May a hosted run carry S-177 evidence? **No.**

`scripts/verification-status.mjs` is **37 lines**. It reads HEAD's `Verification:`,
`Verification-Tree` and `Verification-Tests` trailers, compares the recorded tree against
`git rev-parse HEAD^{tree}`, and **reruns nothing**. It is offline and deterministic.

**Decided: a hosted run writes no trailer and is named nowhere that
`scripts/verification-status.mjs` reads.** A hosted run is recorded under this file's
**`## Measurement

Report-only. No run below is or may become S-177 evidence (choice 1). All on branch
`ci-measurement`.

| run           | head sha  | tree         | attempt | platform  | conclusion                                     |
| ------------- | --------- | ------------ | ------- | --------- | ---------------------------------------------- |
| `38248163234` | `8a16efa` | (unrecorded) | 1       | Windows   | failure — `Install dependencies`               |
| `38249519497` | `b85d5de` | (unrecorded) | 1       | Windows   | failure — `Install dependencies`               |
| `38250397429` | `0341942` | (unrecorded) | 1       | Windows   | failure — `Install dependencies`               |
| `38251456639` | `49c916e` | `de3f5f7`    | 1       | Windows   | **failure — `tests`, 1 of 696**                |
| `38253333794` | `49b0686` | `8cf7e29`    | 1       | **Linux** | **cancelled — the 90-minute cap, mid-`tests`** |

The first three runs predate choice 1's requirement to record the tree, which is why theirs is
missing; it is recorded from the fourth on.

### The environment, both platforms

Every setup step passed on both, including the exact-build ffmpeg assertion.

| step                                      | Linux    | Windows   |
| ----------------------------------------- | -------- | --------- |
| checkout, submodule, full history         | 3 s      | 12 s      |
| submodule `origin/main` ref               | 0 s      | 0 s       |
| Node 22.14.0                              | 8 s      | 14 s      |
| ffmpeg + ffprobe, sha256-pinned           | 8 s      | 11 s      |
| both tools on PATH, exact build           | 0 s      | 1 s       |
| node-gyp 13.1.0                           | 1 s      | 6 s       |
| `corepack pnpm install --frozen-lockfile` | 5 s      | 71 s      |
| **total**                                 | **26 s** | **116 s** |

**The 5-second Linux install is not yet trusted.** `better-sqlite3@13.0.3` publishes no prebuilt
binary, so it must compile from source, and 5 s is fast for that. Either gcc is that much quicker
than a cold MSVC, or it did not build — in which case the domain tests say so. The Linux suite
settles it, and until then this figure is recorded, not claimed.

### Windows, run `38251456639` — the full suite, measured

Job 2157 s (36 min) end to end, inside the 90-minute cap. `check.mjs` itself: **2033 s**. Peak
resident memory **1047 MiB**, summed across `node` processes and sampled every 2 s — comfortable
inside the runner's 16 GB.

| check             | hosted            | local reference |
| ----------------- | ----------------- | --------------- |
| typecheck         | 13.6 s            |                 |
| lint              | 11.4 s            |                 |
| format            | 17.0 s            |                 |
| boundaries        | 1.5 s             |                 |
| boundaries proven | 3.7 s             |                 |
| no dead rule      | 0.07 s            |                 |
| **tests**         | **1985 s — FAIL** | **1413 s**      |
| decisions pin     | 0.16 s            |                 |
| copied docs       | 0.09 s            |                 |

**Nine of the ten checks are green on a hosted runner**, which is the thing this feature set out to
find out and which was unknown before. Three results matter more than the total:

1. **The suite is 1.40× slower, not 4×.** Four cores against this machine's sixteen produced a
   40% increase in the test phase. S-176's serial aggregate runner is why: the suite is not
   CPU-parallel at the top level, so the core count moves it far less than expected.
2. **No child bound fired.** The prompt expected the PATH-only transient to be worse on a small
   runner, and choice 2 recorded a bound failure as a likely outcome. It did not happen on this
   run: none of the eleven bounded children at 300/360/600 s timed out, and the word "bound" appears
   in the log only on the two boundary checks. **The expectation is not borne out, and the stop
   condition was not reached.** One run does not make that safe — it makes it unobserved so far.
3. **`decisions pin` was green**, so the asymmetry of Gate 2 and class 4 of choice 7 did not bite
   here. The steering repository's `main` had not moved.

### The one failure, named — and it is the transient this repository already knows about

**It is `tests/reel-takes-secrets.test.ts`**, test 26 ("every other test of the journey passes in a
child process whose environment holds only PATH and what the operating system needs to start Node").
The assertion that fails is line 106, `assert.equal(suite.status, 0, …)`: the nested child suite
ended with exit status `null`, which means it was killed — its bound is `timeout: 300_000` at line
96, and it runs `--test-concurrency=4` over the other `reel-takes-*` files.

Established by running the `tests` step's exact command locally, because the hosted run could not
say (see below):

| run                              | counts                      |
| -------------------------------- | --------------------------- |
| hosted Windows, `38251456639`    | 696 / 695 pass / 1 fail     |
| **local full run, this machine** | **696 / 695 pass / 1 fail** |
| the same file alone, locally     | 1 / 1 pass / 0 fail         |

**The counts match exactly, and the file passes alone.** So this is a timing failure under load, not
a logic failure, and not a hosted-specific one: it is **the known PATH-only child transient** that
`docs/context.md` already records and that S-176's serial aggregate and S-178's recorded Slice 4
FAIL both concern. Nothing about it was weakened, skipped or re-run to green.

**What that does to the Windows result.** Nine of ten checks green, and the tenth fails on the one
test that also fails here. The hosted Windows run therefore shows **no hosted-specific defect**:
every difference from a local run is accounted for. That is the strongest statement this measurement
supports, and it is weaker than "green" on purpose.

**An open question, not investigated.** The failing test's own reported `duration_ms` in the local
full run was **2,187,010 ms — about 2187 s, far more than the 300 s bound it sets for its child**,
and longer than the entire hosted Windows `tests` phase. Either the bound is not bounding what it is
assumed to bound, or the duration covers more than the child. **This matters beyond tidiness:** if a
300 s bound can hold a test for 2187 s, then the Linux cancellation below needs no Linux-specific
explanation, and S-176's contention finding may be understated. It is recorded here as a question for
a session with a gate, and nothing is changed on the strength of it.

### Linux, run `38253333794` — cancelled at the cap, and faster at everything that finished

The job ran 13:06:06Z to 14:36:26Z — **5420 s, cancelled by the 90-minute `timeout-minutes` cap**,
with `check.mjs` 5394 s into its `tests` step. **The cap was not raised and will not be** (goal 4).

Every static check finished, and every one was faster than Windows:

| check             | Linux                      | Windows              | Linux is          |
| ----------------- | -------------------------- | -------------------- | ----------------- |
| typecheck         | 6.99 s                     | 13.61 s              | 1.95× faster      |
| lint              | 3.24 s                     | 11.43 s              | 3.53× faster      |
| format            | 8.28 s                     | 17.04 s              | 2.06× faster      |
| boundaries        | 0.64 s                     | 1.50 s               | 2.34× faster      |
| boundaries proven | 1.53 s                     | 3.73 s               | 2.43× faster      |
| no dead rule      | 0.02 s                     | 0.07 s               | 3.23× faster      |
| **static total**  | **20.7 s**                 | **47.4 s**           | **2.29× faster**  |
| environment setup | 26 s                       | 116 s                | 4.5× faster       |
| **tests**         | **5394 s, never finished** | **1985 s, finished** | **≥2.72× slower** |

So Linux is faster at everything except the one thing that takes the time.

**This is NOT established as a port defect, and an earlier reading of it as one was wrong.** The
correction matters, so it is recorded rather than quietly replaced: the failure mode that fires on
Windows and locally is a child killed at its bound under contention, and a 4-vCPU runner is the
worst case for exactly that. Eleven tests spawn such a child, bounded at 300/360/600 s; if each
bound fires, the bounds alone total about 4860 s ≈ 81 minutes, which exceeds the cap without any
Linux-specific cause and is consistent with the 5394 s observed. That is arithmetic agreeing with
the evidence — **not a diagnosis**, because no per-test output survives the run.

Classification under choice 7 is therefore **unresolved between class 2 (the runner is wrong — too
few cores for the existing contention) and class 3 (the port is wrong)**, with class 2 the leading
explanation. Settling it needs per-test output from a Linux run, which the next finding says is
currently impossible.

### The observability finding, which is the measurement's most useful result

Neither hosted run could say what it was doing, in two different ways:

1. **Windows failed and would not name the test.** `scripts/check.mjs` prints only the last 80 lines
   of a failing check; the log records `(3924 earlier output line(s) omitted)`. Node's TAP reporter
   puts `not ok <name>` inline at the failure, and the run ends with counts alone — `1..670`,
   `# tests 696`, `# pass 695`, `# fail 1`. Every subtest in the excerpt is `ok`. The name had to be
   recovered by running the suite locally, 36 minutes after the hosted run already knew it.
2. **Linux was cancelled and said nothing at all.** `check.mjs` captures the test runner's output
   rather than streaming it, so the `tests` step emits **no progress whatsoever** until it ends — and
   because a cancelled step never reaches its own handler, choice 8's annotation never fired either.
   A 90-minute stall produced zero bytes about the suite.

**This is a pre-existing weakness in `check.mjs` that the hosted path exposed rather than caused.**
Locally it is survivable: a failing check can be re-run one file at a time, and CLAUDE.md keeps the
`check-runner` agent precisely "to find WHICH test failed when check.mjs's 40-line excerpt does not
say". A runner has no such agent, so the same script becomes unreadable there.

**Nothing was changed in response.** `scripts/check.mjs` is checking infrastructure: S-177 reserves
it for the full suite and CLAUDE.md rule 1 requires gates, so printing the `not ok` lines alongside
the tail — which is the obvious fix, and cheap — belongs to a slice with a gate, not to a
measurement that happened to discover it. It is the first thing the next session should weigh, because
every later hosted measurement is worth less without it.

### Minutes

Five runs started, none refused or billed, so **Actions minutes are free for this public repository
on both `windows-latest` and `ubuntu-latest`** — what the documentation says generally, confirmed
for Windows specifically as the prompt asked. A full Windows measurement costs about **36 minutes of
wall clock and $0**.

## Adversarial review — 2026-10-12, round 1

Reviewed by the `gate-reviewer` agent against the workflow at `8a16efa`, `b85d5de` and the working
tree. **Verdict: all four gates NOT APPROVED, 17 findings.** Every claim this session re-checked was
true, and two were understated — the bounded PATH-only children are **eleven**, not six, and this
machine has **16 cores**, not the 4 the review compared against.

Answered in this revision: the `real-reel` literal blocking Slice 1 (Gate 3's amendment table); the
record's home moving from `## Evidence` to `## Measurement` (choice 1, and S-183 amended); Slice 1's
vacuous green (Gate 4, now a fixture plus positive assertions); the artifact being two revisions
stale and its annotation mechanism unreviewed (Gate 3's pinned table, and choice 8); `decisions pin`
as an unclassifiable red (choice 7 class 4, Gate 2's asymmetry); the real core comparison and the
eleven bounds with a stop condition (choice 2); pnpm and the C++ toolchain unnamed (Gate 2's table);
the false measurement attribution (Gate 3's tree table); break 8's unrunnable command and the missing
supply-chain assertions (Gate 3's breaks 8, 9, 13); the missing journey slice and Slice 3's command
(Gate 3, Gate 4); the post-approval triggers, the case for `main`, and cadence (choice 9); "or stop
measuring that thing" (choice 2's stop condition and choice 12's reading, now removed); the S-075
narrowing, `/usr/bin/time`, and the Linux build's identity (Gate 2); D-022 and check 21 as the actual
support for public logs (choice 4); the Measurement section's three overclaims (rewritten above); the
37-line and "fails closed to the full run" errors (choice 1, Gate 2); and `.github/` outside the stop
gate (Gate 3).

**Round 2 has not run.** A fresh reviewer takes the round that would approve all four.

## Evidence (newest first; appended by the journey, never typed by hand)

none

## Divergence (the first broken boundary, or "none")

none
