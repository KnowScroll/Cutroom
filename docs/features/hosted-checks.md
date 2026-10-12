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
**`## Measurement`** section — _not_ under `## Evidence`, which `scripts/journey.mjs:122-136` owns
and rewrites, and which S-016 requires be written by the journey and by nothing typed. The record
carries no authority and must state five things, so that a reader can check it and so that a
re-run-until-green cannot hide:

| field         | why it is required                                                                 |
| ------------- | ---------------------------------------------------------------------------------- |
| run id        | the run can be opened                                                              |
| head sha      | which commit ran                                                                   |
| **tree**      | what S-177 binds evidence to, so the record can be compared against a trailer      |
| `run_attempt` | **the only field that reveals a re-run**, which goals 4 and choice 7 forbid hiding |
| conclusion    | what happened                                                                      |

**How far the enforcement actually reaches, stated plainly.** Two things hold today:
`scripts/verification-status.mjs:27` refuses any `Verification:` value that is not `full` or
`targeted`, so a `Verification: hosted` trailer is red; and `permissions: contents: read` means the
job cannot write. **Neither prevents a session from typing `Verification: full` with a matching tree
after only a hosted green.** That is indistinguishable to the checker. The property is a convention
this feature writes down and S-183 binds — it is not a proof, and the gates do not claim it is.

Rejected, with reasons:

- **A `Verification: hosted` trailer that the checker trusts.** A trailer is text a session types.
  Today that is sound because the session that types it is the session that watched the run on this
  machine. A hosted trailer is a claim about work nobody present watched.
- **A `Verification: hosted` trailer the checker verifies over the network.** Buildable, and costed:
  the checker would have to read the run id from the trailer; call
  `/repos/KnowScroll/Cutroom/actions/runs/{id}`; require `conclusion == "success"`; require
  `head_sha`'s tree to equal `Verification-Tree`; require the run's `path` to be the one workflow;
  **hash the workflow blob at `head_sha` against a pinned hash**, because a branch can carry any
  workflow and a run of a workflow that invoked `check.mjs --slice` would otherwise satisfy every
  other condition; and refuse a `run_attempt` above 1 whose earlier attempts it cannot see.
  Rejected because it makes a deterministic offline checker depend on the network: it would then
  fail for reasons that have nothing to do with the code, and a checker that fails transiently is
  one people learn to rerun — the habit S-111 and S-177 exist to remove. If it is ever wanted, it is
  its own feature with its own four gates and a deliberate break for each of those six conditions.
- **Reusing the hosted run as the full-suite half of an integrity boundary.** Rejected by choice 3:
  the hosted run cannot run a journey, and a feature is verified only by its journey (S-016).

### Choice 2 — Which runner, must both pass, and what if it cannot pass at all?

Public-repository standard runners are **4 vCPU / 16 GB / 14 GB SSD** on both Windows and Linux.
That is twice what a _private_ repository gets and **a quarter of this machine's cores**: this laptop
is **16 cores / 15 GB**. The bounds the suite carries were measured on 16 cores.

**Decided, at the owner's word on 2026-10-12: `ubuntu-latest` is the primary measurement, and
`windows-latest` is the control.** S-179 already makes Linux the deployment target, so Linux is the
platform worth knowing about and it is what a push measures. Windows is asked for rather than pushed,
and it earns its place by being the only platform this suite has ever been green on — which is
exactly what makes it a control:

| Linux | Windows | what it means                                                                          |
| ----- | ------- | -------------------------------------------------------------------------------------- |
| red   | green   | **the port is wrong** (class 3). The same tree passes on the platform with evidence.   |
| red   | red     | **the repository is wrong** (class 1), or the runner is (class 2) — reproduce locally. |
| green | green   | corroboration on both, which is the most this feature can deliver.                     |
| green | red     | a Windows regression, and the first time Linux would be the better-evidenced platform. |

Linux support is **unverified** (session 81), so a red there is a finding about the port, recorded —
never a reason to change a check, a bound or a test. **Linux is not required to pass**; it is
required to be measured. Nothing in this repository blocks on either platform, which follows from
choice 5.

This reverses the session's first position, which measured Windows first because prompt 078 said to
("_Linux is a port, not a lift … an ubuntu run is a second, separate measurement_"). The owner's
reason is better and is recorded as the decision: a measurement of the platform we will not deploy
on answers a less useful question. The Windows run that was already in flight was left to finish,
because it is free and it is the control.

**The stop condition, which round 1 found missing.** Eleven tests spawn a PATH-only journey child
with its own bound, and the bounds are not uniform:

| file                                     | bound     |
| ---------------------------------------- | --------- |
| `tests/reel-plan-secrets.test.ts:76`     | 300 s     |
| `tests/reel-stills-secrets.test.ts:80`   | 300 s     |
| `tests/reel-render-secrets.test.ts:92`   | 300 s     |
| `tests/reel-takes-secrets.test.ts:96`    | 300 s     |
| `tests/paid-failures-secrets.test.ts:52` | 300 s     |
| `tests/paid-path-secrets.test.ts:53`     | **360 s** |
| `tests/ask-again-secrets.test.ts:49`     | **600 s** |
| `tests/cut-rules-secrets.test.ts:44`     | **600 s** |
| `tests/second-ask-secrets.test.ts:52`    | **600 s** |
| `tests/three-pictures-secrets.test.ts`   | **600 s** |
| `tests/resume-failed-secrets.test.ts:59` | **600 s** |

S-176 made the aggregate runner serial because these children run their own bounded parallel suites
and competed for _this_ machine. On a quarter of the cores, **one or more of these bounds failing is
a likely outcome, not an edge case.** If that happens:

- the finding is the runner's size, recorded in `## Measurement` with the bound, the file and the
  elapsed time;
- **no bound is raised, and no test is skipped or conditioned** — that is goal 4;
- and the feature's conclusion is then written down plainly: **`hosted-checks` delivers no
  corroboration on a 4-vCPU runner.** That is an accepted outcome of the measurement. The feature
  would then either stop (choice 12's only coherent reading) or be re-opened against a larger runner,
  which is a paid runner and a different decision.

Rejected: **requiring green on both platforms** — an unverified port could then block work, which is
the pressure that produces a conditional check; **Windows only** — it measures the platform this
engine will not be deployed on, which answers a less useful question; **Linux only** — a red would
then be unattributable, because nothing would say whether the port or the code was at fault, which is
the whole job of the control; **macOS** — no evidence on it at all, and it is the one standard runner
with a 5-job concurrency cap, so it is the scarce resource for no gain.

### Choice 3 — What runs there, what stays local? **Only `node scripts/check.mjs`. Journeys stay local.**

`scripts/journey.mjs:122-136` writes an evidence line into `docs/features/<slug>.md` and flips that
feature's `Status:` to `verified`. A hosted journey would therefore have to commit back into the
repository.

**Decided: journeys stay local**, and the hosted job holds `permissions: contents: read` so it could
not write even if someone asked it to.

Rejected: **a hosted journey with a commit-back** — it needs `contents: write`, and it would let a
run mark a feature `verified` with nobody watching; **a hosted journey that uploads its evidence
line as an artifact for a local session to apply** — the local session is then trusting a downloaded
file, which is the same forgery with an extra step, and `journey.mjs` would have to grow a way to
write an evidence line without running the journey, which is strictly worse than having no hosted
journey at all.

### Choice 4 — What may a job see, and why are public logs acceptable?

This repository is public, so **the workflow logs are world-readable** and **anyone can fork it and
open a pull request**. GitHub withholds secrets from fork-pull-request runs and issues a read-only
token, and approval can be required for new contributors — but every one of those is a setting
outside this file.

**Decided:** no `pull_request` and no `pull_request_target` trigger, ever; `permissions:
contents: read` at workflow and job level; `persist-credentials: false`; no `secrets` reference in
any form. A job sees the public repository, the public steering submodule, one sha256-pinned ffmpeg
archive, and one pinned node-gyp.

**Why public logs are acceptable, with the check that actually supports it.** `check.mjs` reads no
key and calls no provider, but the suite's failure output can include recorded provider wire. The
sentence "the most sensitive thing a log can contain is a test name and a duration" rests on
`tests/paid-path-fixtures.test.ts:64-77`, check 21: _every recorded fixture holds no key-shaped value
and no query string_, asserted over the bytes as well as the parsed walk, so a credential inside a
string that is itself JSON is caught too. **That check is D-022's case applied to the fixtures**, and
it is the reason the logs — and the annotations of choice 8 — are safe to publish. If that check were
ever weakened, this choice would have to be re-made.

Rejected: **`pull_request`** — the protection against a stranger's run should be the absence of the
trigger, not a setting someone can change; **`pull_request_target`** — it runs in the base
repository's context with access to secrets, and is the shape of every published Actions compromise;
**`schedule`** — a green nobody reads is a badge nobody earned, and scheduled workflows are disabled
in forks anyway, so it would also measure nothing for anyone else.

### Choice 5 — Does the local full run stay the authority? **Yes, and S-177 is untouched.**

**Decided:** the local full run remains the sole authority. An ordinary slice still commits on
`check.mjs --slice`; the full suite is still reserved for integrity boundaries and journeys; the
hosted run is added alongside and required by nothing.

Rejected: **hosted replaces local** — it is forgeable (choice 1), it cannot run journeys (choice 3),
and it would stop exercising the one platform with evidence; **both required for an integrity
boundary** — it adds a second mandatory full suite, which is the ritual S-177 exists to remove, and
makes a queue or a runner outage into a block on committing.

### Choice 6 — Self-hosted runner on a small VM? **No. Hosted, priced against it.**

| option                                                         | price                                                                                                                       |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **Standard hosted runner, public repository** (4 vCPU / 16 GB) | **$0.** Only larger runners are charged, "even when used by public repositories"                                            |
| Hosted runner if this repository went private (2 vCPU / 8 GB)  | 2,000 included minutes/month on Free, then **$0.010/min** Windows 2-core, $0.006/min Linux 2-core                           |
| Self-hosted VM, 4 vCPU / 8 GB (session 81's comfort target)    | roughly **€62/month** (Hetzner CPX31/CPX32 after its June 2026 reprice); **€86/month** for CCX23's 4 dedicated vCPU / 16 GB |
| Self-hosted VM, same shape at a US provider                    | roughly **$48–$60/month** for a 4 vCPU / 8 GB general-purpose instance                                                      |

The private-repository line is the one worth noticing: going private costs money _and_ halves the
cores.

**Decided: hosted.** Three reasons, in order of weight:

1. **A self-hosted runner on a public repository is a documented hazard.** Anything that can start a
   run executes code on a machine whose state persists between jobs. The only safe self-hosted
   arrangement is a private repository, which costs money and loses the 4-core runner.
2. **The thing it would hide is not private.** The stated benefit was keeping logs out of public
   view, but the logs are `check.mjs` output, protected by check 21 (choice 4).
3. **It is a machine to patch**, and a long-lived runner is exactly the hand-configured machine
   whose green cannot be told apart from this laptop's — which is the one thing the feature exists
   to get away from.

Kept on file: a self-hosted runner becomes the right answer the moment a run needs a provider key —
a real-reel run — because that is when public logs and a hosted secret both become unacceptable.
That is not this feature.

### Choice 7 — What happens when the hosted run is red, and for which reasons?

**Decided: classify the red before acting, in writing, and never act on it by changing a check.**
Round 1 found three classes insufficient; there are five.

| class                           | what it looks like                                                                                     | what happens                                                                                                                                                                                                                |
| ------------------------------- | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. the repository is wrong      | the same tree is red locally too                                                                       | fix the code. The local run is the authority; the hosted run was useful and is still not evidence.                                                                                                                          |
| 2. the runner is wrong          | the same tree is green locally, and the failure names a tool, a core count or a clock                  | record it; give the runner the tool **in the workflow**. This is where the first run's node-gyp failure belongs.                                                                                                            |
| 3. the port is wrong            | `ubuntu-latest` only                                                                                   | a finding about the port, recorded. Linux is not required to pass.                                                                                                                                                          |
| 4. **the authority moved**      | `decisions pin` red on the runner and green locally, because the steering repository's `main` advanced | update the pin here, by `git submodule update --remote`. **Not by editing any check** — CLAUDE.md: a red `decisions pin` is not ours to fix by editing anything here, and unpushed commits over there mean say so and stop. |
| 5. **the ffmpeg build differs** | a `ready()` refusal naming `libx264`, `aac` or a missing filter, on a tree that is green locally       | the provisioned build is wrong, not the port and not the code; fix the pinned archive. See Gate 2.                                                                                                                          |

Class 4 exists because the workflow changes what one check compares against — see Gate 2's
asymmetry. It is the most likely hosted red that is nobody's bug.

The forbidden moves, named so that nobody has to decide in the moment: raising a timeout, loosening
a bound, skipping or conditioning a test, `continue-on-error`, **`set +e` or `|| true` or
`if: always()` without propagating the exit status**, hiding a red behind a matrix, and re-running
until green and reporting the green.

### Choice 8 — How is a failing step's decisive line read? **Check-run annotations.**

Goal 1 promises every failing step's decisive line, and the first run proved the obvious route does
not work: `GET /repos/{owner}/{repo}/actions/jobs/{id}/logs` answers
**`403 Must have admin rights to Repository`**, even on a public repository.

**Decided: each job republishes the decisive output as a check-run annotation** — `::error` on
failure, `::notice` on success carrying each check's label and milliseconds, the total wall clock and
the peak resident memory. `GET /repos/{o}/{r}/check-runs/{id}/annotations` is readable by anyone who
can read a public repository, so a session can read its own measurement without anybody holding a
token. The republished text is capped at 1800 characters and sanitised: `%`→`%25`, `::`→`;;`, and
newlines to `%0A`, because an unsanitised `::` in provider output would otherwise be read as a
workflow command.

Rejected: **the job log** — needs admin rights, which is the problem; **`actions/upload-artifact`** —
the artifacts list is public but the download is not, so it has the same gap with an extra step;
**reading the web UI** — needs a human with a browser, and the measurement is meant to be read by
the session that asked for it; **printing to `$GITHUB_STEP_SUMMARY` only** — no API exposes it.

The consequence, stated rather than assumed: this is a **second public publication surface**, and
what it publishes is `check.mjs` output. It is safe for the same reason the logs are — check 21 of
`tests/paid-path-fixtures.test.ts` (choice 4) — and for no other reason.

### Choice 9 — Does the file reach `main`, and with which triggers? **Yes, on `workflow_dispatch` alone.**

Round 1 was right that this was never argued. A branch-only workflow already delivers the
corroboration, so the question is real.

**Decided: on `main`, with `workflow_dispatch` as the only trigger.** The reason is exactly that the
measured tree should be `main`'s tree: a `push`-triggered branch workflow measures a branch forever,
so somebody would have to keep pushing `main` to a branch to measure it, which is an unwritten ritual
and the kind of thing that quietly stops happening. `workflow_dispatch` on `main` measures `main`,
can be pointed at any ref, and **cannot be started by a stranger** — it requires write access.

The `push: [ci-measurement]` trigger exists only while the branch does, for developing the workflow
itself, and **is removed by the slice that lands the file** (Slice 2). The approved state has one
trigger.

**Cadence, also unsettled in round 1: on request, not on a schedule.** A measurement is asked for at
an integrity boundary or when the environment changes (a Node bump, an ffmpeg bump, a new native
dependency). `## Measurement` grows one entry per run. Nothing in this repository requires a
measurement to exist, which follows from choice 5.

Rejected: **`push` on `main`** — it makes every documentation commit start a 30-plus-minute run
nobody asked for, and a green nobody reads is choice 4's badge nobody earned; **staying on a branch
forever** — the measured tree is then never `main`'s; **a `schedule`** — see choice 4.

## Gate 2 — Architecture

- **One file, invoking one script.** `.github/workflows/measure-checks.yml` invokes
  `node scripts/check.mjs` and no other script of this repository. The YAML adds no package, no
  dependency and no boundary rule, and imports nothing — so none of the twenty-two boundary rules can
  be affected by it, and `scripts/drift.mjs` has nothing new to see. (Slice 1 does add a test; the
  claim is about the workflow file.)
- **`.github/` is an unknown path to `check.mjs --changed`.** `kind()` classifies it as neither
  document nor code, so `--changed` **exits 2 with a message and runs nothing** (`scripts/check.mjs:86-90`,
  `:103-110`, `:182-190`); the operator must then type the full run. That is correct and is left
  alone: a workflow file is checking infrastructure, which S-177 already reserves for the full suite.
- **What the runner must be given.** Round 1 found this list incomplete in the one way that mattered
  — it omitted the thing that actually failed.

  | given to the runner          | why, and how                                                                                                                                                                                         |
  | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | Node 22.14.0                 | the tests are TypeScript through `--experimental-strip-types`, and `check.mjs` passes quoted globs for Node to expand                                                                                |
  | ffmpeg **and** ffprobe       | downloaded from a pinned release, sha256-verified, added to `GITHUB_PATH`                                                                                                                            |
  | **pnpm 10.15.1**             | through `corepack`, from `package.json`'s `packageManager`. Named here because round 1 found it unnamed                                                                                              |
  | **a C++ toolchain**          | `better-sqlite3@13.0.3` publishes **no prebuilt binary** — its release carries zero assets — so every install compiles it. The image has VS 2022 17.14 with `Workload.NativeDesktop` and Python 3.12 |
  | **node-gyp 13.1.0, pinned**  | pnpm 10.15.1 bundles node-gyp 11.1.0, which cannot detect a VS 17.14 install. Installed under `$RUNNER_TEMP`, selected by `npm_config_node_gyp`                                                      |
  | the `steering-ref` submodule | full history and an `origin/main` ref — see the asymmetry below                                                                                                                                      |
  | LF line endings              | `actions/checkout` honours `.gitattributes`, and `tests/line-endings.test.ts` notices if it did not                                                                                                  |

- **No path is written, and that claim is narrowed rather than asserted.** Every path the workflow
  writes is `$RUNNER_TEMP` or `${{ runner.temp }}`, never spelled out, because
  `tests/no-absolute-paths.test.ts:17` scans every tracked `.yml` and `.yaml` and both `/home/runner`
  and `C:\Users` match its patterns. **The narrowing S-075 needs in writing:** S-075 governs what
  this repository's _runtime_ does — a worker awaits `ready()` and refuses to start without ffmpeg on
  PATH, and nothing in the runtime installs it or records where it is. A CI workflow provisioning a
  runner's PATH is not the runtime: it adds no binary to the lockfile (which is what S-075's
  "an npm package bundling ffmpeg" rejection was about), writes no path into any tracked runtime
  file, and the worker it hands the machine to still finds ffmpeg on PATH or refuses. S-183 carries
  that narrowing.
- **The one asymmetry: `decisions pin` means something different there.**
  `scripts/decisions.mjs:96-99` compares the pin against `origin/main` inside the submodule.
  `check.mjs` runs it **without `--fetch`**, so locally it compares against whatever was last
  fetched. The workflow's checkout step fetches `origin main` in the submodule, which makes the same
  check a **live network comparison**. So the hosted run goes red on `decisions pin` the moment the
  steering repository's `main` advances, with the local run green. This is why choice 7 has class 4.
  Gate 2 does **not** claim "measurement is a wrapper that changes nothing": it changes what one
  check compares against, and that is written down instead of being asserted away.
- **The measurement wrappers, and their own failure mode.** Windows samples the summed working set
  of `node` processes every 2 s from a background job. Linux uses GNU `time -v` — which is an
  **absolute path** that `tests/no-absolute-paths.test.ts` does not catch, because its four patterns
  are home-directory and drive-letter shaped. If `time` is absent from the image the step fails
  before `check.mjs` runs, and choice 7 would misread it as class 3. **Slice 2 therefore guards it:**
  the wrapper is used when present and the step otherwise runs `check.mjs` plainly and says in the
  annotation that peak memory was not measured. A missing wrapper must never read as a port red.
- **ffmpeg build identity is load-bearing, and the pins are not equivalent.**
  `packages/providers/src/ffmpeg/tools.ts:12` requires `libx264` and `aac`, and `:70` a filter list,
  compared at `ready()`. The Windows archive is `ffmpeg-8.1.1-full_build`, which is the build this
  machine has. **The Linux archive is `ffmpeg-n8.1.1-9-g58d4114d36`** — nine commits past 8.1.1, and
  a GPL build rather than the same build. `grep -q '8\.1\.1'` passes on that string and so cannot tell
  the difference. Slice 2 asserts the exact expected version string per platform, and this file
  records that Linux is not byte-for-byte the local build.

## Gate 3 — Program design

### Exact files, pinned to one commit

| file                                     | state                                                                                                                                                                   |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.github/workflows/measure-checks.yml`   | on `ci-measurement` at **`49b0686`**; **not on `main`**. Earlier revisions `8a16efa`, `b85d5de`, `0341942`, `49c916e` are superseded and the gates do not describe them |
| `docs/features/hosted-checks.md`         | this file                                                                                                                                                               |
| `docs/research/public-exposure-audit.md` | session 84's audit, which made the repository's publicity a settled fact rather than an assumption                                                                      |
| `scripts/verification-status.mjs`        | **unchanged, and changed by no slice of this feature**                                                                                                                  |

### Affected-test inventory

**Six** tests read every tracked file. Only four can be affected by a `.yml`; the other two assert no
media or image is tracked, which a `.yml` cannot trip:

| test                                  | what it asserts about the workflow file                               | affected?                      |
| ------------------------------------- | --------------------------------------------------------------------- | ------------------------------ |
| `tests/line-endings.test.ts`          | `.yml`/`.yaml` are in its `TEXT` set; 0 CR bytes                      | yes                            |
| `tests/no-absolute-paths.test.ts`     | `.yml`/`.yaml` are in its `CHECKED` set; no home or drive-letter path | yes                            |
| `tests/feature-files.test.ts`         | this file's front matter, `Created` note and one-line `Gates:`        | yes, by this document          |
| `tests/context-file.test.ts`          | `docs/context.md` ≤ 300 lines and naming the journal's newest session | yes, by this document          |
| `tests/reel-render-files.test.ts:224` | no audio, video or subtitle file is tracked (D-087)                   | no — a `.yml` is none of those |
| `tests/reel-stills-files.test.ts:181` | no image is tracked (D-087)                                           | no — a `.yml` is none of those |

**And one test is amended, which round 1 found missing and which blocks the slice as first written.**
`tests/paid-path-real-reel.test.ts:45-58`, check 20, asserts that **no test file but itself** contains
`real-reel.mjs` or the string `real-reel` (S-111: `tests/` holds a check that no test file names it).
A new `tests/hosted-checks-workflow.test.ts` that greps the workflow for `real-reel` would have to
contain that literal, and would therefore turn check 20 red — which turns `check.mjs` red, which turns
**every verified feature's journey** red.

| test                                | amendment                                                                                                                                                                                                                                      |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tests/paid-path-real-reel.test.ts` | the "no workflow names the spending script" assertion lives **here**, in the file that is already allowed to name it, as an `// AMENDED BY hosted-checks (S-183)` block — the established form used by `resume-failed` Slice 6 and `ask-again` |

The consequence, stated: that assertion then lives outside `tests/hosted-checks-*.test.ts`, so the
`hosted-checks` journey does not run it, and **`paid-path` needs a re-journey** (Gate 4, Slice 3).

### Measured, with the tree each figure belongs to

Round 1 correctly found the previous attribution false: at `8a16efa` neither document existed, so
`tests/feature-files.test.ts` and `tests/context-file.test.ts` cannot have asserted anything about
them. Corrected:

| measurement                                                                                       | tree it ran on                                           |
| ------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `tests/line-endings.test.ts` and `tests/no-absolute-paths.test.ts` pass with the workflow tracked | `8a16efa` — the workflow is the only relevant file there |
| all four scanning tests pass, 11 of 11, with both documents present                               | session 84's working tree on `main`, uncommitted         |
| `prettier --check .` passes with both documents and the workflow present                          | the same working tree                                    |
| `node scripts/check.mjs --changed` green, documents only                                          | the same working tree                                    |

### Deliberate breaks each slice must show red and restore

Assigned to the slice whose verification command can actually demonstrate them — round 1 found
break 8 assigned to a slice whose command cannot run the install step.

Shown by `node scripts/check.mjs` (Slice 1 and 2):

1. A `secrets` reference in any form — `secrets.FOO`, `secrets['FOO']`, `secrets . FOO`.
2. A workflow naming `scripts/real-reel.mjs` or `real-reel` → red, from the amended `paid-path` check 20.
3. `permissions: contents: write`, at workflow level **or job level** — a job-level grant overrides a
   workflow-level `read`.
4. A `pull_request` or `pull_request_target` trigger.
5. `continue-on-error: true` on any step, **and its disguises**: `|| true`, `if: always()`, and a
   `set +e` step that does not end by propagating the captured exit status.
6. A `.yaml` workflow that escapes every rule above — the rules cover both extensions, because
   GitHub accepts both and both scanning tests already do.
7. A job whose check step is not exactly `node scripts/check.mjs` — this is the substitution choice 1
   identifies as the dangerous one, and round 1 found it unchecked.
8. A `uses:` that is not a 40-character commit SHA.
9. A download step with no sha256 comparison against a literal.
10. A literal `C:\Users` or `/home/runner` path → `tests/no-absolute-paths.test.ts` red.
11. A CRLF workflow file → `tests/line-endings.test.ts` red.
12. A `Verification: hosted` trailer → `scripts/verification-status.mjs` red. **This is a genuine
    addition, not a re-proof:** `check.mjs` never runs that script, and
    `tests/verification-status.test.ts` covers a wrong tree and a missing `Verification-Tests` but
    **not an unknown kind**. The property is currently proven by nothing in the suite.

Shown only by a hosted run (Slice 4, recorded in `## Measurement`, never in a trailer):

13. A sha256 that does not match the archive → the install step red on the runner.

### Verification commands

| slice   | command                                                                                   |
| ------- | ----------------------------------------------------------------------------------------- |
| Slice 1 | `node scripts/check.mjs` — it touches `tests/` and the amended `paid-path` test           |
| Slice 2 | `node scripts/check.mjs` — it adds `.github/`, an unknown path, so `--changed` is refused |
| Slice 3 | `node scripts/journey.mjs hosted-checks`, then `node scripts/journey.mjs paid-path`       |
| Slice 4 | documents only: `node scripts/check.mjs --changed`                                        |

No slice of this feature may use `--slice`: Slice 1 and 2 are checking infrastructure, and S-177
reserves that for the full suite.

### Journey impact and stop conditions

- `scripts/journey.mjs hosted-checks` runs every check plus `tests/hosted-checks-*.test.ts`, writes
  the evidence line and flips `Status:`. It refuses until all four gates read `APPROVED` on one line
  and every slice box is ticked.
- **`paid-path` needs a re-journey**, because this feature amends its check 20. That is the only
  re-journey: no other feature's public contract, stand-in or recorder changes.
- **Stop on the first FAIL**, per S-178's established wording: record the FAIL as the finding, do not
  re-run, and amend no check, timeout or test.
- A hosted run's result is **never** a journey input and never flips a `Status:`.

### What round 1 found unsettled and is now settled elsewhere in this file

| round-1 finding                                    | where it is answered               |
| -------------------------------------------------- | ---------------------------------- |
| the `push` branch list after approval, and cadence | choice 9                           |
| how pnpm and the C++ toolchain reach the runner    | Gate 2's table                     |
| how a failing step's decisive line is retrieved    | choice 8                           |
| the fourth and fifth red classes                   | choice 7                           |
| what happens when a child bound fails on 4 vCPU    | choice 2's stop condition          |
| Slice 3's command, and the journey                 | Gate 3's command table, and Gate 4 |
| whether `.github/` becomes stop-gate source        | below                              |

**`.github/` is outside the stop gate's notion of source.** `.claude/hooks/stop-gate.sh:27` reads
`git status --porcelain -- packages apps tests scripts`, so a session can end with an uncommitted
`.github/` change and the hook will not notice. **Decided: not changed by this feature.** Adding
`.github` there is a `.claude/` change, which `check.mjs`'s `CODE_PATH` classifies as code and which
would need its own slice and a full run; and the gate's purpose is uncommitted _source_, while
`check.mjs --changed` already refuses to classify `.github/` at all. It is recorded here so the gap
is known rather than discovered.

## Gate 4 — Slices

- [ ] **Slice 1 — the rules, as tests, with the workflow present as a fixture.** Round 1 found the
      original Slice 1 vacuously green: at that point nothing exists under `.github/` on `main`, so a
      test iterating "every `.yml` under `.github/`" iterates zero files and passes — the state
      CLAUDE.md calls the worst to be in. So Slice 1 asserts **positively** that at least one
      workflow exists and that every job's check step is exactly `node scripts/check.mjs`, and it
      carries breaks 1–12 against a fixture workflow written into a temporary directory by the test
      itself (the scratch-repo technique `tests/verification-status.test.ts` already uses). The
      amendment to `tests/paid-path-real-reel.test.ts` check 20 lands here.
- [ ] **Slice 2 — the workflow on `main`**, moved from `ci-measurement` at `49b0686`, with its
      `push: [ci-measurement]` trigger **removed** so `workflow_dispatch` is the only trigger
      (choice 9), the Linux `time` wrapper guarded, and the exact ffmpeg version asserted per
      platform (Gate 2). Slice 1's positive assertions then bind the real file.
- [ ] **Slice 3 — the journeys.** `hosted-checks`, then `paid-path` alone, serially, stopping on the
      first FAIL (S-178's arrangement).
- [ ] **Slice 4 — the measurement recorded** in `## Measurement`, with every field choice 1 requires
      and every runner finding, including a bound that failed and what the feature then concludes.

## Measurement

Report-only. No run below is or may become S-177 evidence (choice 1). All on branch
`ci-measurement`, `windows-latest`.

| run           | head sha  | attempt | conclusion                        | what it established                                                              |
| ------------- | --------- | ------- | --------------------------------- | -------------------------------------------------------------------------------- |
| `38248163234` | `8a16efa` | 1       | failure at `Install dependencies` | the environment steps all pass; the install does not, and the log cannot be read |
| `38249519497` | `b85d5de` | 1       | failure at `Install dependencies` | the annotation handler never ran — GitHub starts a bash step with `-e`           |
| `38250397429` | `0341942` | 1       | failure at `Install dependencies` | **the decisive line, read from the annotation**                                  |
| `38251456639` | `49c916e` | 1       | in flight at the time of writing  | first run with a node-gyp able to detect VS 17.14                                |

**The tree is not recorded for these four runs.** Choice 1 requires it and these predate the
requirement; Slice 4's entries carry it.

### Per-step wall clock, run `38250397429`

| step                              | wall clock | result      |
| --------------------------------- | ---------- | ----------- |
| Set up job                        | 1 s        | ok          |
| Checkout, submodule, full history | 11 s       | ok          |
| Submodule `origin/main` ref       | 1 s        | ok          |
| Report the checkout               | 0 s        | ok          |
| Node 22.14.0                      | 19 s       | ok          |
| ffmpeg + ffprobe, sha256-pinned   | 17 s       | ok          |
| Both tools answer on PATH alone   | 1 s        | ok          |
| **Install dependencies**          | **56 s**   | **FAILURE** |
| `node scripts/check.mjs`          | —          | skipped     |

**What this does and does not establish.** It establishes that the environment this repository needs
can be built on a hosted Windows runner in about 50 seconds: a full-history submodule with an
`origin/main` ref, Node 22.14.0 exactly, and a sha256-pinned ffmpeg 8.1.1 with both binaries
answering on PATH alone. **It establishes nothing about the suite**, which has never run on a hosted
runner, and nothing about what a full run costs in minutes — the recorded local figure, tests at
1413 s, still has nothing to compare against. Peak memory has never been sampled, because the step
that samples it has never started.

### The decisive line, and the cause

```
gyp ERR! stack Error: Could not find any Visual Studio installation to use
gyp ERR! System Windows_NT 10.0.26100
gyp ERR! command ".../corepack/v1/pnpm/10.15.1/dist/node_modules/node-gyp/bin/node-gyp.js" "rebuild"
gyp ERR! node -v v22.14.0
gyp ERR! node-gyp -v v11.1.0
.../node_modules/better-sqlite3 install: Failed
 ELIFECYCLE  Command failed with exit code 1.
```

Read from the check run's annotation, not from a log: a job-log download answers
`403 Must have admin rights to Repository` (choice 8).

**Cause, established rather than guessed.** `better-sqlite3@13.0.3` publishes **no prebuilt
binary** — its `v13.0.3` release carries zero assets — so every install of this workspace compiles it
with node-gyp. The `windows-latest` image does carry the toolchain: Visual Studio Enterprise 2022
17.14 with `Microsoft.VisualStudio.Workload.NativeDesktop`, `VC.Tools.x86.x64`, the Windows 11 SDK,
and Python 3.12. But pnpm 10.15.1 bundles **node-gyp 11.1.0**, which cannot detect a 17.14 install.

**This is class 2 of choice 7 — the runner is wrong — and it now has the evidence that class
requires:** the failure names a tool, and the same tree installs on this machine. The answer was
therefore to give the runner the tool it lacks, in the workflow: node-gyp pinned to 13.1.0, installed
under `$RUNNER_TEMP` and selected through `npm_config_node_gyp`. No check, bound, timeout or test was
touched, and the measured commands are unchanged.

**What it cost to learn.** Three runs, because the first had no readable output, the second had a
handler that `-e` killed before it could speak, and only the third could say anything. Choice 8 exists
so that the next failure costs one run.

### Minutes

Four runs started and none was refused or billed, so **Actions minutes are free for this public
repository on `windows-latest`**, which is what the documentation says generally and what the prompt
asked be confirmed for Windows specifically. Nothing is yet known about **how many** minutes a full
suite costs, because no run has reached it.

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
