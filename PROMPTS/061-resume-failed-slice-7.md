# 061 — `resume-failed`: Slice 7, the journey

- **For:** session 61
- **Feature:** `resume-failed` (S-157, S-161 to S-164, S-171 to S-174)
- **Work:** build Slice 7 only — the journey (S-016) — and stop at the feature's boundary. The feature's status flips to `verified` when the journey passes.
- **Written:** 2026-09-27, at the end of session 60, which built Slice 6 and stopped at its boundary.
- **Run:** not yet

**Where things stand.** The four gates are APPROVED (Gate review 12). All six slices are built and committed:
`e67ec6f` (the kind), `0f73e5d` (crash-kept pictures), `395dc40` (the resume, made by a test), `7315af0` (the call), `7835849`
(the engine's resume), and session 60's commit (the owner's script). Checks 1 to 43 pass. The full `check.mjs` ran
green after Slice 6, including the aggregate test phase — 41+ test files in 370 s, no wrapper omission, no marginal
test, no failing assertion identified.

**What Slice 7 starts from.** Slices 1 to 6 are in. `docs/features/resume-failed.md` ticks `[x]` for Slices 1 to 6 and
`[ ]` for Slice 7. Every check 1 to 43 has run green inside its slice's test file; no test has run them all together.
The contract's stand-in engine and its `tests/stand-in/client.ts` are unchanged since Slice 4; the harness
(`tests/engine/harness.ts`) already hands the API the `ResumeService` the worker prices with, and the worker's own
`resume` switch is off in every harness test (verified by `tests/resume-failed-engine.test.ts:280-282`'s
"with the switch off"). `scripts/journey.mjs` is the runner — it refuses without all four gates APPROVED, every
slice ticked, a feature-named test file present, and a clean tree; on a green run it writes one evidence line
above any earlier, flips `Status:` to `verified`, and sets Divergence to `none`; on a FAIL it fills Divergence and
leaves Status alone (S-016).

**Slice 7's fixed contract.** It runs the feature's journey and flips `resume-failed`'s status.

- Run `node scripts/journey.mjs resume-failed` once. The journey runs every check (`scripts/check.mjs`) and the
  feature's own tests (`tests/resume-failed-*.test.ts`) and writes one evidence line — date, PASS or FAIL, the commit,
  and the test count or what broke.
- A PASS flips `Status: planned` (or whatever the file currently says) to `Status: verified` and sets Divergence to
  `none` in the journey runner. The `## resume-failed` header stays; `Gates:` stays. The Slice 7 tick flips from
  `[ ]` to `[x]`.
- A FAIL fills Divergence and leaves `Status:` alone (S-016). Stop and report — a failing journey proves nothing
  new about the feature, and the prompt forbids weakening a check or skipping to reach green.
- The journey runs in the same S-159 spirit as the rest of `check.mjs`: documents-only `--changed` between steps;
  the full run is required before this commit, and the journey itself is a single full run.

**What the journey exercises.** Every check 1 to 43:

- 1 to 5 — the kind: `tests/resume-failed-kinds.test.ts`. The five classes, every throw site, the stand-ins' `as`,
  the migration 0007 columns.
- 6 to 11 — the crash-kept stills: `tests/resume-failed-stills.test.ts`. The kept input, the ladder's `reserveOf`,
  `killedAgain`, the amended `reel-stills` checks 48 and 49, `seq`.
- 12 to 25 — the resume made by a test: `tests/resume-failed-resume.test.ts`. `planResume`/`admitResume`/`resumeRun`,
  starting attempts, `reelSpentCents`, `imageCallCount`, labels in two runs, the kept-take check.
- 26 to 34 — the call: `tests/resume-failed-contract.test.ts`. The `ResumeService`, the route, the stand-in engine's
  answer, the amended `reel-contract` and `reel-plan` checks.
- 35 to 40 — the engine's resume: `tests/resume-failed-engine.test.ts`. `finishFailed`, the worker's switch, the
  service's switch and 900000 ms, the amended `reel-render` check 40.
- 41 to 43 — the owner's script: `tests/paid-path-real-reel.test.ts` check 20 (amended in Slice 6) and
  `tests/resume-failed-script.test.ts`. The `post()` helper, the preview/confirmation gate, `makeReel`/`resumeReel`,
  `--resume`/`--remake`, `resumedBy` follow, `waitingRuns`/`cancelRuns`, `_answers.mjs`.

And every amended verified feature's journey:
`reel-contract`, `reel-plan`, `reel-stills`, `reel-render`, `reel-takes`, `paid-failures`, `ask-again`, `second-ask`,
`paid-path`, `three-pictures` (S-099's form — `resume-failed`'s own journey runs each one's, but a feature whose
own journey was just run is the runner's call to skip; the Slice 7 contract says run them).

Check 44 — the secrets test for resume-failed — is a child process whose environment is PATH and the eleven
variables libuv copies from the parent on Windows, in S-028's form. The journey runs it as part of every
`tests/resume-failed-*.test.ts` it includes; the slice adds no test file of its own.

**What Slice 7 starts from.** `scripts/journey.mjs` is the runner. It reads `docs/features/resume-failed.md` to
verify the four gates and the slice ticks; it runs every check; it runs the feature's tests; it writes evidence;
it flips Status and Divergence. It never commits. The main session commits the journey's evidence + the status
flip in one commit.

**What the slice builds.** Nothing new — the feature's code is closed at Slice 6. The slice's only change is the
journey run and its evidence line above any earlier, the `Status:` flip, the Divergence set, and the Slice 7 tick.

**How to work:**

- The full `check.mjs` is required before running the journey, and the journey itself is a single full run; do not
  weaken a check, extend a timeout, or commit around a failure.
- If the journey FAILS, stop and report; a failing journey is the finding. Do not edit code in Slice 7 unless the
  failure is in a test or boundary rule, not the engine — and the gates' approved checks do not move without a new
  review.
- If the gates leave a real choice open — say, the Divergence line's wording — ask the owner. The `docs/features/paid-path.md`
  pattern ("Verified by its journey at `<commit>`, <count> tests") is the precedent.
- A green journey flips the feature to `verified` and makes `cutroom-sdk`'s gates the next work (S-173), as
  `docs/context.md` records.
