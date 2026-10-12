# 078 — the checks on GitHub Actions, on a repository that is now public

- **For:** session 84
- **Feature:** a new one, slug to be chosen in the session (`ci-checks` suggested); the benchmark waits
- **Work:** the public-history secrets audit, a measured report on whether the suite passes on a hosted runner, the
  four gates written and reviewed, and the `S-` entry drafted. Nothing merged to `main` but documents
- **Written:** 2026-10-12
- **Run:** session 84, 2026-10-12

```text
Read docs/context.md first. This session has three jobs, in this order, and the first one can stop the other two.

THE REPOSITORY IS NOW PUBLIC. The owner made it public before this session. Everything below follows from that.

JOB 1 — the audit, before anything else. A public repository's whole history is readable by anyone, so the
question is not whether .env is ignored today but whether a secret was ever committed, in any commit, on any
branch, and whether anything else in the history should not be public.

- Search the whole history, not the working tree: every commit, every branch, every tag. Key-shaped strings
  (MiniMax's sk- prefixes, fal keys, API_KEY=, TOKEN=, SECRET=, Authorization headers), .env files ever added,
  and any file that holds a provider response verbatim rather than redacted (D-022).
- Check what the submodule now exposes: steering-ref's URL and its pinned commit are public, and CLAUDE.md points
  at the steering repository's founding research, decisions and BUDGET.md. Say plainly whether that repository is
  private, and what a reader of this one can now learn about it.
- IF A SECRET IS IN THE HISTORY, THAT IS THE FINDING. Stop, report it, and say what has to happen — the key
  rotated first, then whatever is decided about the history. Do not rewrite history in this session and do not
  treat a scrub as a fix: a public commit may already be cloned or cached.
- Write the audit's result down whatever it says, including "nothing found, here is what was searched".

JOB 2 — a measurement, not a migration. Find out whether this repository's checks pass on a hosted runner, and
what it costs in time, before anything claims to be verification.

- Minutes are free for public repositories on standard hosted runners. CONFIRM THAT FOR WINDOWS, because this
  machine is Windows, and a windows-latest runner is the one place the suite has ever been green. If Windows is
  free, measure there FIRST: it is the cheap experiment. Linux is a port, not a lift — session 81 recorded that
  Linux support is unverified — so an ubuntu run is a second, separate measurement, and its reds are findings
  about the port, never reasons to change a check.
- The run is on a BRANCH and is REPORT-ONLY. Its result may never be used as verification evidence under S-177,
  it is not merged to main in this session, and the gates decide whether it lives at all. Say so in the workflow
  file's own header.
- What the runner needs, each one already paid for here: Node 22.14 with --experimental-strip-types and quoted
  globs (a bare directory is read as a module path); ffmpeg AND ffprobe on PATH, installed by the workflow and
  version-pinned — nothing in this repository installs them and no path to them may be written (S-075, D-086);
  better-sqlite3, a native module; a checkout whose line endings match .gitattributes (tests/line-endings.test.ts
  is what notices); and no absolute path anywhere (tests/no-absolute-paths.test.ts).
- NO SECRET IS ADDED TO GITHUB ACTIONS, ever, and the workflow may run only scripts/check.mjs and the test runner.
  The two scripts that spend are reached by nothing automatic: paid-path's check 20 asserts that no step of
  check.mjs and no script it can reach names scripts/real-reel.mjs, and a workflow that could run it is a workflow
  that spends. Every provider defaults to 'fake', so the suite needs no key and costs nothing.
- On a public repository, workflow logs are public and a pull request from a fork can trigger runs. Say what that
  means for this repository and what the workflow's triggers must therefore be.
- Measure and report: wall clock per check step, peak memory if the runner reports it, and every step that failed
  with the decisive line. The recorded local figure to compare against is tests at 1413 s.
- EXPECT THE PATH-ONLY TRANSIENT TO BE WORSE, not better. S-176 made the aggregate runner serial because nested
  PATH-only journey children run their own bounded parallel suites and compete for the machine, with 300-second
  bounds; a two-core runner makes that contention worse. If a bound fails there, the finding is the runner's size.
  DO NOT RAISE A TIMEOUT, LOOSEN A BOUND OR SKIP A TEST TO REACH GREEN — CLAUDE.md rule 3 holds here exactly as it
  does in a slice.

JOB 3 — the gates, and the decision. A workflow that claims verification changes how this repository claims
anything is done, so it is a feature with four gates, reviewed adversarially, before any of it lands on main.

Settle at least these, each as a real choice with what was rejected:

1. Whether a hosted run may carry S-177's evidence at all, and if so what the trailer records — the run's id, the
   tree it ran, its conclusion — and how a trailer claiming a run that did not happen, or a run of a different
   tree, is caught. verification-status.mjs reads a commit's trailers today and reruns nothing; say exactly what
   changes and what the check is.
2. Which runner, and whether the suite must pass on both Windows and Linux or only the one it is verified on.
3. What runs there and what stays local. journey.mjs writes an evidence line and flips a feature's Status, so a
   hosted journey would have to commit back; say whether journeys stay local and why.
4. Which triggers, on a public repository with fork pull requests, and what a job may see.
5. Whether the local full run stays the authority, or the hosted run replaces it, or both are required for an
   integrity boundary — and what that does to S-177's targeted-slice arrangement, which exists precisely so the
   suite is not rerun as ritual.
6. Whether a self-hosted runner on a small virtual machine is the better answer (session 81 estimated 4 vCPU,
   8 GB, 50 GB for comfort), keeping load off this machine and logs out of public view. Price both.
7. What happens when the hosted run is red for a reason that is only about the runner — a transient, a missing
   tool, a slower core — so that a red CI is never a reason to weaken a check and never a reason to claim green.

HARD LIMITS. No engine behaviour changes. No check, timeout, bound, test or boundary rule is weakened, skipped or
made conditional — a conditional check reads as coverage while proving nothing (S-111's own reason). No secret in
the repository, in a workflow, or in Actions. No history rewrite. Nothing merged to main in this session but
documents: the feature document with its four gates, the audit's result, the measurement's figures, the drafted
S- entry, PROMPTS/README.md's Run line, JOURNAL.md and docs/context.md.

DO NOT WORK ON THE BENCHMARK. docs/features/yield-benchmark.md's gates are written and under adversarial review as
of session 83; it continues in its own session after this one.

Before you stop: the JOURNAL.md entry and this session's entry in docs/context.md, and set this prompt's Run line.
```
