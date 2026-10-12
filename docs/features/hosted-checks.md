---
status: current
authority: plan
---

# hosted-checks — this repository's checks measured on a hosted runner, as corroboration and never as verification

Status: planned
Decisions: D-022, D-086, S-016, S-075, S-111, S-159, S-176, S-177, S-183
Named only as what it cannot do: S-178
Gates: product pending · architecture pending · program-design pending · slices pending

> **Created 2026-10-12 in this repository at the owner's request**, in session 84, out of
> `PROMPTS/078-ci-on-github-actions.md`. The owner made `KnowScroll/Cutroom` public before this
> session; standard GitHub-hosted runners are free for public repositories, so running the suite
> somewhere other than this laptop became free for the first time. **Its gates are not written.** A
> workflow that claims verification changes how this repository claims anything is done, so no
> `.github/` file belongs on `main` until all four gates are approved by an adversarial reviewer
> (CLAUDE.md rule 1). The report-only measurement workflow lives on the `ci-measurement` branch at
> `8a16efa` and is deliberately not merged.

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

## Goals

1. **Measure, before anything claims to be verification.** Wall clock per check step, peak resident
   memory where the runner reports it, and every failing step with its decisive line.
2. **Keep the authority local.** No change to `scripts/verification-status.mjs`, no new trailer, no
   hosted journey, no commit written by a runner.
3. **Spend nothing, and be unable to spend.** Every provider defaults to the stand-in, so the suite
   needs no key. `scripts/real-reel.mjs` is the only script that spends and nothing automatic may
   reach it; `paid-path`'s check 20 already asserts that no step of `check.mjs` and no script it can
   reach names it.
4. **Weaken nothing to be green there.** A red that is only about the runner is recorded as a
   runner fact. Raising a timeout, loosening a bound, skipping or conditioning a test, adding
   `continue-on-error`, or re-running until green and reporting the green are all forbidden
   (CLAUDE.md rule 3; S-111's own reason — a conditional check reads as coverage while proving
   nothing).
5. **Leak nothing.** No `secrets.*` reference, `permissions: contents: read`, and no trigger a
   stranger can start.

## Non-goals

- Verification evidence from a hosted run (Gate 1, choice 1 — rejected, with the exact conditions
  under which it could be reconsidered).
- Hosted journeys (choice 3 — `scripts/journey.mjs` writes into the repository).
- Required green on Linux (choice 2 — Linux is an unverified port, session 81).
- A self-hosted runner (choice 6 — priced and rejected).
- Any change to S-177's targeted-slice arrangement (choice 5).
- Caching `node_modules` or the pnpm store. A cache is a way for one run to inherit another run's
  state, and the first thing it would hide is a lockfile that no longer installs cleanly.

## Gate 1 — Product: the seven choices, each with what was rejected

### Choice 1 — May a hosted run carry S-177 evidence? **No.**

`scripts/verification-status.mjs` reads HEAD's `Verification:`, `Verification-Tree` and
`Verification-Tests` trailers, compares the recorded tree against `git rev-parse HEAD^{tree}`, and
**reruns nothing**. It is offline, deterministic, and 40 lines long. That is the whole of it.

**Decided: a hosted run writes no trailer and is named nowhere that
`scripts/verification-status.mjs` reads.** A hosted run is recorded as prose in this file's
Evidence section, with its run id, the tree it ran and its conclusion, so a reader can go and look —
and that record carries no authority.

Rejected, with reasons:

- **A `Verification: hosted` trailer that the checker trusts.** A trailer is text a session types.
  Today that is sound because the session that types it is the session that watched the run on this
  machine. A hosted trailer is a claim about work nobody present watched, and trusting it makes the
  trailer the weakest link in S-177 rather than its record.
- **A `Verification: hosted` trailer the checker verifies over the network.** This is buildable and
  was costed. The checker would have to: read the run id from the trailer; call
  `/repos/KnowScroll/Cutroom/actions/runs/{id}`; require `conclusion == "success"`; require
  `head_sha`'s tree to equal `Verification-Tree`; require the run's `path` to be the one workflow;
  **and hash the workflow blob at `head_sha` against a pinned hash**, because a branch can carry any
  workflow and a run of a workflow that invoked `check.mjs --slice` would otherwise satisfy every
  other condition. It would also have to refuse a `run_attempt` greater than 1 whose earlier
  attempts it cannot see. Rejected because it makes a deterministic offline checker depend on the
  network: it would then fail for reasons that have nothing to do with the code, and a checker that
  fails transiently is one people learn to rerun — the habit S-111 and S-177 exist to remove. If it
  is ever wanted, it is its own feature with its own four gates and a deliberate break for each of
  the six conditions above.
- **Reusing the hosted run as the full-suite half of an integrity boundary.** Rejected by choice 3:
  the hosted run cannot run a journey, and a feature is verified only by its journey (S-016).

### Choice 2 — Which runner, and must both pass? **`windows-latest` is the measured platform; Linux is a separate measurement and is not required to pass.**

Windows is the only platform this suite has ever been green on. Public-repository standard runners
are **4 vCPU / 16 GB / 14 GB SSD** on both Windows and Linux — twice the cores a private repository
gets, and more than the 2-core runner the prompt expected.

**Decided:** a red on `windows-latest` is a finding about this repository and is reproduced locally
before anything is concluded. A red on `ubuntu-latest` is a finding about the port, recorded here,
and never a reason to change a check. `ubuntu-latest` is never started by a push; it is asked for.

Rejected: **requiring both** — an unverified port would then be able to block work, which is exactly
the pressure that produces a conditional check; **Linux only** — it is the platform with no evidence;
**macOS** — nothing here has ever run on it, and the macOS runner is the one standard runner with a
5-job concurrency cap, so it is the scarce resource for no gain.

### Choice 3 — What runs there, what stays local? **Only `node scripts/check.mjs`. Journeys stay local.**

`scripts/journey.mjs` writes an evidence line into `docs/features/<slug>.md` and flips that
feature's `Status:` to `verified`. A hosted journey would therefore have to commit back into the
repository.

**Decided: journeys stay local**, and the hosted job holds `permissions: contents: read` so it
could not write even if someone asked it to.

Rejected: **a hosted journey with a commit-back** — it needs `contents: write`, which makes the
workflow able to change the repository, and it would let a run mark a feature `verified` with
nobody watching; **a hosted journey that uploads its evidence line as an artifact for a local
session to apply** — the local session is then trusting a downloaded file, which is the same
forgery with an extra step, and `journey.mjs` would have to grow a way to write an evidence line
without running the journey, which is strictly worse than having no hosted journey at all.

### Choice 4 — Which triggers, and what may a job see? **`workflow_dispatch`, and `push` on one branch. No `pull_request`.**

This repository is public, so **the workflow logs are world-readable** and **anyone can fork it and
open a pull request**. GitHub withholds secrets from fork-pull-request runs and issues a read-only
token, and approval can be required for new contributors — but every one of those is a setting
outside this file.

**Decided:** `workflow_dispatch` plus `push` restricted to `branches: [ci-measurement]`;
`permissions: contents: read`; `persist-credentials: false`; no `secrets.*` reference. A job sees
the public repository, the public steering submodule, and one sha256-pinned ffmpeg archive.

Rejected: **`pull_request`** — the protection against a stranger's run should be the absence of the
trigger, not a setting someone can change; **`pull_request_target`** — it runs in the base
repository's context with access to secrets, and is the shape of every published Actions compromise;
**`schedule`** — a green nobody reads is a badge nobody earned, and the logs it writes are public;
**`push` on `main`** — nothing on `main` may depend on this workflow until these gates are approved.

Public logs are acceptable here for one specific reason: `check.mjs` reads no key and calls no
provider, so the most sensitive thing a log can contain is a test name and a duration.

### Choice 5 — Does the local full run stay the authority? **Yes, and S-177 is untouched.**

**Decided:** the local full run remains the sole authority. An ordinary slice still commits on
`check.mjs --slice`; the full suite is still reserved for integrity boundaries and journeys; the
hosted run is added alongside and required by nothing.

Rejected: **hosted replaces local** — it is forgeable (choice 1), it cannot run journeys (choice 3),
and it would stop exercising the one platform with evidence; **both required for an integrity
boundary** — it adds a second mandatory full suite, which is the ritual S-177 exists to remove, and
makes a queue or a runner outage into a block on committing.

### Choice 6 — Self-hosted runner on a small VM? **No. Hosted, priced against it.**

| option                                                               | price                                                                                                          |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Standard hosted runner, public repository** (4 vCPU / 16 GB)       | **$0.** Only larger runners are charged, "even when used by public repositories"                               |
| Hosted runner if this repository went private (2 vCPU / 8 GB)        | 2,000 included minutes/month on Free, then **$0.010/min** Windows, $0.006/min Linux                            |
| Self-hosted VM, 4 vCPU / 8 GB / 160 GB (session 81's comfort target) | roughly **€60–€86/month** at Hetzner after its June 2026 reprice (CPX31/CPX32 ≈ €62, CCX23 4 vCPU/16 GB ≈ €86) |
| Self-hosted VM, same shape at a US provider                          | roughly **$48–$60/month** (4 vCPU / 8 GB general-purpose droplet class)                                        |

The private-repository line is the one worth noticing: going private costs money _and_ halves the
cores.

**Decided: hosted.** Three reasons, in order of weight:

1. **A self-hosted runner on a public repository is a documented hazard.** Anything that can start a
   run executes code on a machine whose state persists between jobs. GitHub's own guidance is not to
   use self-hosted runners with public repositories. The only safe self-hosted arrangement would be
   a private repository, which costs money and loses the 4-core runner.
2. **The thing it would hide is not private.** The stated benefit was keeping logs out of public
   view, but the logs are `check.mjs` output: test names and durations, no key, no provider call.
3. **It is a machine to patch**, and this repository's rule is that nothing here installs a tool or
   writes a path to one (S-075, D-086). A long-lived runner is exactly the hand-configured machine
   whose green cannot be told apart from the laptop's.

Rejected but worth keeping on file: a self-hosted runner becomes the right answer the moment a run
needs a provider key — a real-reel run, say — because that is the point at which public hosted logs
and a hosted secret both become unacceptable. That is not this feature.

### Choice 7 — What happens when the hosted run is red only because of the runner?

**Decided: classify the red before acting, in writing, and never act on it by changing a check.**

| class                   | what it looks like                                                                                 | what happens                                                                                                                                         |
| ----------------------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| the repository is wrong | the same tree is red locally too                                                                   | fix the code. The local run is the authority; the hosted run was useful and is still not evidence.                                                   |
| the runner is wrong     | the same tree is green locally, and the failure names a tool, a core count, a clock or the network | record it here with the evidence that makes it a runner fact; either give the runner what it lacks **in the workflow**, or stop measuring that thing |
| the port is wrong       | `ubuntu-latest` only                                                                               | a finding about the port, recorded. Linux is not required to pass.                                                                                   |

The forbidden moves, named so that nobody has to decide in the moment: raising a timeout, loosening
a bound, skipping or conditioning a test, `continue-on-error`, hiding a red behind a matrix, and
re-running until green and reporting the green. S-176 already made the aggregate runner serial
because nested PATH-only journey children run their own bounded parallel suites with 300-second
bounds; if one of those bounds fails on a hosted runner, **the finding is the runner's size** and it
is written down as such.

## Gate 2 — Architecture

- **One file, on one branch, reaching nothing.** `.github/workflows/measure-checks.yml` invokes
  `node scripts/check.mjs` and no other script of this repository. It adds no package, no
  dependency, no boundary rule and no test, and it imports nothing — so none of the twenty-two
  boundary rules can be affected by it, and `scripts/drift.mjs` has nothing new to see.
- **`.github/` is an unknown path to `check.mjs --changed`.** `kind()` classifies it as neither
  document nor code, so `--changed` fails closed to the full run (S-177). That is correct and is
  left alone: a workflow file is checking infrastructure, which S-177 already reserves for the full
  suite.
- **The runner is given tools, never told where they are.** ffmpeg and ffprobe 8.1.1 are downloaded
  from a version-tagged release, verified against a published sha256, and added to `GITHUB_PATH`.
  Nothing in this repository installs them and no path to them is written (S-075, D-086); the suite
  finds them on PATH exactly as it does here. Every path the workflow writes is `$RUNNER_TEMP` or
  `${{ runner.temp }}`, never spelled out, because `tests/no-absolute-paths.test.ts` scans every
  tracked `.yml` and `/home/runner` and `C:\Users` both match its patterns.
- **The submodule is given full history and an `origin/main` ref.** `scripts/decisions.mjs` counts
  commits between the pin and `origin/main` inside `steering-ref/`, and
  `tests/feature-files.test.ts` refuses a shallow steering clone outright. The steering repository
  is public, so this needs no credential.
- **Measurement is a wrapper, not a different command.** Linux uses `/usr/bin/time -v`; Windows
  samples the summed working set of `node` processes every 2 s from a background job. Neither
  changes what runs.

## Gate 3 — Program design

### Exact files

| file                                     | state                                                                                                      |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `.github/workflows/measure-checks.yml`   | exists on `ci-measurement` at `8a16efa`; **not on `main`**                                                 |
| `docs/features/hosted-checks.md`         | this file                                                                                                  |
| `docs/research/public-exposure-audit.md` | session 84's audit, which is what made the repository's publicity a settled fact rather than an assumption |
| `scripts/verification-status.mjs`        | **unchanged, and changed by no slice of this feature**                                                     |

### Affected-test inventory

Nothing in the suite reads `.github/`, so no test changes behaviour — with four exceptions that read
every tracked file and therefore see the new one:

| test                              | what it asserts about the workflow file                            | measured |
| --------------------------------- | ------------------------------------------------------------------ | -------- |
| `tests/line-endings.test.ts`      | `.yml` is in its `TEXT` set; 0 CR bytes                            | passes   |
| `tests/no-absolute-paths.test.ts` | `.yml` is in its `CHECKED` set; no `/home/`, `/Users/`, `C:\Users` | passes   |
| `tests/feature-files.test.ts`     | this file's front matter, `Created` note and one-line `Gates:`     | passes   |
| `tests/context-file.test.ts`      | `docs/context.md` ≤ 300 lines and naming session 84                | passes   |

Measured at `8a16efa` with the workflow tracked:
`node --experimental-strip-types --test tests/line-endings.test.ts tests/no-absolute-paths.test.ts tests/feature-files.test.ts tests/context-file.test.ts`
— 11 of 11 pass. `prettier --check` passes on both new files.

### Deliberate breaks each slice must show red and restore

1. A `secrets.FOO` reference anywhere in the workflow → refused by the slice's own grep over
   `.github/`.
2. A step naming `scripts/real-reel.mjs` → refused by the same grep, and `paid-path`'s check 20
   already covers the reachable-script half.
3. `permissions: contents: write` → refused.
4. A `pull_request` or `pull_request_target` trigger → refused.
5. `continue-on-error: true` on any step → refused.
6. A literal `C:\Users` or `/home/runner` path in the workflow → `tests/no-absolute-paths.test.ts`
   red.
7. A CRLF workflow file → `tests/line-endings.test.ts` red.
8. An ffmpeg URL without a pinned sha256, or a sha256 that does not match → the install step red.
9. A `Verification: hosted` trailer → `scripts/verification-status.mjs` red, because `hosted` is
   neither `full` nor `targeted`. **This one already holds without any change**, and the slice
   exists to prove it keeps holding.

### Verification commands

The workflow is checking infrastructure, so every slice that touches it is a full run:
`node scripts/check.mjs`. No slice of this feature may use `--slice`.

## Gate 4 — Slices

- [ ] **Slice 1 — the rules, as tests.** `tests/hosted-checks-workflow.test.ts`: every `.yml` under
      `.github/` names no `secrets.`, no `real-reel`, no `pull_request`, no `continue-on-error`, and
      declares `permissions: contents: read`; plus the break for a `Verification: hosted` trailer
      against `scripts/verification-status.mjs`. Written **before** the workflow moves to `main`, so
      the workflow arrives already constrained. Breaks 1–5 and 9.
- [ ] **Slice 2 — the workflow on `main`**, moved from `ci-measurement` unchanged except for its
      `push` branch list, with Slice 1's test green. Breaks 6–8.
- [ ] **Slice 3 — the measurement recorded**, here, with the figures and every runner finding.

## Measurement — 2026-10-12, run 38248163234

The first hosted run, on `ci-measurement` at `8a16efa`, `windows-latest`. **Minutes were free and no
billing block appeared**, which confirms for Windows what the docs say generally.

| step                                  | wall clock | result      |
| ------------------------------------- | ---------- | ----------- |
| Set up job                            | 1 s        | ok          |
| Checkout, submodule, full history     | 13 s       | ok          |
| Submodule `origin/main` ref           | 2 s        | ok          |
| Report the checkout                   | 1 s        | ok          |
| Node 22.14.0                          | 11 s       | ok          |
| ffmpeg + ffprobe 8.1.1, sha256-pinned | 9 s        | ok          |
| Both tools answer on PATH alone       | 0 s        | ok          |
| **Install dependencies**              | **63 s**   | **FAILURE** |
| `node scripts/check.mjs`              | —          | skipped     |

Everything the environment traps predicted would be hard was not: the checkout's line endings, the
submodule's full history and `origin/main` ref, an exact Node 22.14.0, and a sha256-pinned ffmpeg
8.1.1 with both binaries answering on PATH alone — 37 seconds for all of it.

`corepack pnpm install --frozen-lockfile` then failed in 63 s. **The decisive line is not yet
known**: a job log download needs admin rights on the repository
(`403 Must have admin rights to Repository`) and this machine's `gh` token is invalid, so the
measurement is incomplete by an authentication gap and not by a finding. What has been ruled out
offline: the lockfile is **in sync** with all ten importers' `package.json` files, specifier by
specifier, so `ERR_PNPM_OUTDATED_LOCKFILE` is not the cause. 63 s is too short for a cold install of
this workspace to have completed and failed late, which points at corepack fetching pnpm 10.15.1 or
at `better-sqlite3@13.0.3`'s native build — the one dependency in
`pnpm-workspace.yaml`'s `onlyBuiltDependencies`.

**This is recorded as a runner-class question, not as a repository red.** Nothing was changed in
response to it.

## Evidence (newest first; appended by the journey, never typed by hand)

none

## Divergence (the first broken boundary, or "none")

none
