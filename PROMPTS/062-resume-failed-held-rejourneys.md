# 062 — `resume-failed`: finish the held re-journeys

- **For:** session 62
- **Feature:** `resume-failed` compatibility verification (S-016, S-028, S-099)
- **Work:** finish the five re-journeys held by session 61, serially and with one committed result per journey; stop at the feature boundary
- **Written:** 2026-09-28, after an independent read and diagnostic rerun of session 61's failure
- **Run:** not yet

## Purpose

`resume-failed` itself is verified: Slice 7's check 44 is committed at `aa9a9f4`, and its journey
PASS is committed at `45b758f`. Five amended features then re-journeyed PASS. The sixth,
`paid-failures`, recorded a FAIL because the full suite's `reel-render` PATH-only child reached its
300-second bound under cumulative load. The prompt correctly stopped there, leaving five
re-journeys to finish.

This session completes only those held compatibility journeys. It changes no implementation,
approved gate, check, timeout or test. It starts no later feature work.

## What is already proved, and what is not

The committed PASS re-journeys are:

1. `reel-contract` — `8904d9a`, 42 tests.
2. `reel-plan` — `860b7f7`, 50 tests.
3. `reel-stills` — `8f67bf4`, 63 tests.
4. `reel-render` — `a86ca4c`, 106 tests.
5. `reel-takes` — `f6e2a75`, 66 tests.

`paid-failures` has a generated FAIL committed at `cbffbc5`; do not rewrite or remove that evidence.
Its rerun and the four journeys after it remain:

```
paid-failures
ask-again
second-ask
paid-path
three-pictures
```

The independent audit after session 61 reproduced the infrastructure finding rather than a
`resume-failed` defect:

- `node scripts/check.mjs --code` passed typecheck, lint, format, boundaries, boundary proofs and
  the dead-rule audit, then failed its aggregate tests after 670 seconds.
- The exact aggregate command with full TAP ran 606 tests: 604 passed. `resume-failed` check 44
  passed in 277.135 seconds.
- The two failures were pre-existing nested PATH-only checks: `reel-render` check 50 at 300.455
  seconds and `reel-takes` check 26 at 300.442 seconds, each killed at its 300-second bound.
- Run serially and outside the aggregate load, those same two files passed: check 50 in 231.349
  seconds and check 26 in 155.879 seconds.

That diagnosis does not make a red full check green. The session must begin when the machine is
quiet enough for the complete preflight to pass, and a journey FAIL remains a finding.

## Read first and establish the preflight

1. Follow `AGENTS.md` and `CLAUDE.md` in their required order:
   `node scripts/decisions.mjs`, `node scripts/drift.mjs`, the last 40 lines of `JOURNAL.md`, then
   `node scripts/check.mjs --code`. If the decisions script reports unpushed steering commits,
   stop. Do not infer around newer authority.
2. Read `docs/context.md`'s session 61 entry; session 61's newest `JOURNAL.md` entry; this prompt;
   `docs/features/resume-failed.md`'s Slice 7 and Evidence; and the Evidence/Divergence blocks of
   the five feature files named above.
3. Read S-016, S-028, S-099 and S-159, plus `scripts/journey.mjs`. A journey runs the full check,
   runs the feature's own test glob, writes Evidence/Status/Divergence and never commits.
4. Confirm `git status --porcelain` is empty. Record the starting HEAD. Do not start while another
   repository check, journey or test suite is running on this machine. Do not parallelize checks or
   journeys.

The startup `node scripts/check.mjs --code` is the hard preflight. It must be fully green before the
first journey. A targeted pass is diagnostic evidence, never a substitute.

If the wrapper is red and hides the failing test:

1. Run its exact printed aggregate command with TAP reporting, capturing the complete diagnostic
   outside the repository.
2. Name every failing test and its duration. If a nested PATH-only check hit its bound, run only
   the named secrets files serially to distinguish load from a deterministic defect.
3. After every diagnostic child has exited and no other repository check is running, run the full
   `node scripts/check.mjs --code` once more.
4. If that complete rerun is red, stop and report. Do not start a journey, edit a check, lengthen a
   bound, lower concurrency, skip a file or treat the targeted green as permission to continue.

No preflight or diagnostic result is committed; record it in the final Journal entry.

## Run the five journeys

Run these serially in this exact order:

```
paid-failures
ask-again
second-ask
paid-path
three-pictures
```

For each slug:

1. Confirm `git status --porcelain` is empty and record `git rev-parse --short HEAD` as the journey's
   input commit.
2. Run `node scripts/journey.mjs <slug>` exactly once. Do not use `--changed`, a test glob or a
   prior PASS in place of the journey.
3. Read the generated diff. It may change only that feature document's generated
   Evidence/Status/Divergence result. Do not hand-edit those fields.
4. If the journey PASSes, confirm its newest Evidence line names the input commit, its own tests all
   passed, and Divergence is `none`. Commit that exact generated result before moving on, using
   `docs(<slug>): re-journey PASS at <input-commit>`.
5. Confirm the tree is clean after the commit. Only then start the next slug.

Every journey runs the full repository check and then its own test glob. Five journeys therefore
mean five full checks; the time and compute cost are expected. They run no model and consume no
model context or API tokens. Keep large TAP streams out of the conversation unless a failure needs
its decisive lines.

## Failure branch

A FAIL is the finding, including another load-sensitive timeout:

1. Inspect the generated Evidence and Divergence without rewriting them. If the wrapper hid the
   failing test, use the same outside-repository full-TAP diagnostic as the preflight and record the
   decisive lines.
2. Commit the exact generated journey result as
   `docs(<slug>): re-journey FAIL at <input-commit>`.
3. Do not run that journey again in this session and do not run any later journey.
4. Add the required Journal and context record, set this prompt's Run line and the prompt index row,
   run `node scripts/check.mjs --changed`, commit the documentation, and report the first broken
   boundary plainly.

Never change an existing test, timeout, concurrency, gate or decision merely to make a journey
green. If the failure proves a real product or implementation defect, report it; fixing it is a
separately authorized piece of work.

## Finish after all five PASS

After the fifth PASS commit:

1. Confirm all five new Evidence lines and commit hashes, every test count, and a clean tree.
2. Add the required `JOURNAL.md` entry: the preflight result and duration; any diagnostic rerun;
   each journey's input commit, PASS commit and test count; and that all ten affected-feature
   re-journeys required by Slice 7 are now complete.
3. Update `docs/context.md` truthfully: remove the held-journey finding, record the five PASSes and
   their commits, and leave the existing later-work queue otherwise unchanged.
4. Set this prompt's Run line and `PROMPTS/README.md`'s 062 row to session 62.
5. Run `node scripts/check.mjs --changed`. It must report every document, authority and scan check
   green. Commit only the Journal/context/prompt bookkeeping.
6. Confirm `git status --porcelain` is empty and stop at the feature boundary.

## Out of scope

No implementation, new feature plan, gate, decision, provider call, paid run, secret, real reel,
test rewrite, timeout change or push belongs to this session. Do not revisit the five already-PASS
re-journeys unless a check proves their committed evidence malformed. Do not start later work after
the fifth PASS; finish the records and stop.
