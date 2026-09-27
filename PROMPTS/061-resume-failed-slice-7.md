# 061 — resume-failed: Slice 7, the journey

- **For:** session 61
- **Feature:** resume-failed (S-157, S-161 to S-164, S-171 to S-174)
- **Work:** build check 44, then complete Slice 7's journey and every required re-verification journey (S-016, S-028, S-099). Stop at the feature boundary.
- **Written:** 2026-09-27; revised before session 61 because the earlier plan could neither build check 44 nor start the journey.
- **Run:** not yet

## Purpose

This final slice adds the missing check 44: a PATH-only child proving every other resume-failed
test needs neither a key nor an inherited secret. It then verifies the feature through the only
allowed mechanism, node scripts/journey.mjs resume-failed (S-016), and re-journeys every verified
feature this feature amended (S-099). A PASS makes resume-failed verified; a FAIL is the finding.

This is not documentation-only work. Gate 3 assigns check 44 to Slice 7, but no
tests/resume-failed-secrets.test.ts exists. A journey executes tests; it cannot create this test.

## Current state and hard preflight

The four gates are APPROVED. Slices 1 to 6 are committed; Slice 6 is 0a11e48. Slice 7 is
intentionally unticked and Status remains planned.

The prior claim of an unqualified green baseline is superseded. A later node scripts/check.mjs
--code passed typecheck, lint, format, boundaries, boundary proofs and the dead-rule audit, but the
aggregate test command exited 1 after about 471 seconds. check.mjs printed only the first forty
lines of the failed command's output, all passing, and did not name the failing test.

No Slice 7 work is allowed until that failure is identified and the complete node scripts/check.mjs
is green. If the wrapper again hides a failure, run its printed aggregate node
--experimental-strip-types --test command directly with TAP reporting, preserving any diagnostic
capture outside the repository. Do not weaken a test, lengthen a timeout, skip a file, or edit a
check just to make it green.

- If it is not reproducible, repeat the full check and record both outcomes; a transient failure is
  not green by assumption.
- If it is a defect in Slices 1 to 6 or a check those approved gates already require, correct it and
  prove it. If it needs a new product choice, altered gate, unrelated infrastructure change, or a
  weaker check, stop and report the scope conflict.
- Do not brief the Slice 7 builder, tick the slice, or run a journey while this preflight is red.

scripts/journey.mjs requires every slice ticked and a clean tree; it never changes a slice tick.
Therefore the only valid sequence is: build and prove check 44; manually tick and commit Slice 7;
then run the journey on that clean commit. Evidence, Status and Divergence are journey output and
are never typed by hand.

## Read first

1. Follow AGENTS.md's startup order: node scripts/decisions.mjs, node scripts/drift.mjs,
   tail -40 JOURNAL.md, then node scripts/check.mjs --code. If decisions reports unpushed steering
   commits, stop.
2. Read docs/context.md; session 60's Journal entry; this prompt; and
   docs/features/resume-failed.md's Gate 3 checks 41–44, amendment list and Gate 4.
3. Read S-016, S-028, S-099, S-159, S-172 and S-173 in full.
4. Read scripts/journey.mjs. It runs the full check plus the named feature's tests, writes
   Evidence/Divergence/Status, requires a clean tree, and never commits.
5. Read tests/ask-again-secrets.test.ts and tests/paid-path-secrets.test.ts, then every existing
   tests/resume-failed-*.test.ts file.

## Build check 44

Only after a green preflight, brief exactly one slice-builder agent (S-172) to add
tests/resume-failed-secrets.test.ts and only check 44's necessary test support. The main session
reads the diff, runs every check, and commits.

Check 44 is Gate 3's exact promise:

> Every other resume-failed test passes in a child process whose environment holds only PATH and
> what the operating system needs to start Node, in S-028's form.

The test must:

- use S-028's real Windows probe: PATH alone plus exactly the eleven libuv-inherited permitted
  variables, not an assumed empty environment;
- set key-shaped canaries in the parent and prove the child does not inherit them;
- discover every tests/resume-failed-*.test.ts file at runtime, exclude only itself to prevent
  recursion, and pass every other file to one child invocation. No hand-maintained list or hole;
- use the closest established PATH-only test's concurrency, timeout and buffer form. Measure the
  child and record the result; do not invent a wider bound;
- use stand-ins only: no provider call, key read, real reel, or spending-script execution; and
- fail explicitly on a nonzero child, an inherited canary, a missing feature test, or an attempted
  self-run.

Tests first. If it is green as first written because the invariant already holds, say so plainly
and demonstrate its teeth with temporary, byte-restored breaks: inherit a key canary, omit a
feature test, and include the secrets file itself. Each must be caught by check 44; use finally to
restore every break and never end a turn with one applied.

Run check 44 directly, then all tests/resume-failed-*.test.ts, then node scripts/check.mjs. All
checks 1–44 and the full check must be green before the slice is ticked.

## Commit Slice 7, then run its journey

1. Tick Slice 7 manually in docs/features/resume-failed.md. Do not alter Status, Evidence or
   Divergence.
2. Commit the test, tick and only necessary support as:
   test(resume-failed): Slice 7 — PATH-only journey check
3. Confirm git status --porcelain is empty. Run node scripts/journey.mjs resume-failed once.
4. The journey itself repeats the full check and every resume-failed test, including check 44.
   PASS writes evidence, Status: verified and Divergence: none. FAIL writes its own evidence and
   Divergence, leaves Status unchanged, and is the finding. Never edit its output.
5. Commit the exact generated journey result in its own commit. On FAIL, write the required
   Journal/context record, run the document-only check, commit it, and stop.

The journey, not the tick, is the proof that verifies the feature.

## Re-verify affected features

Only after resume-failed's journey PASS, run these journeys serially in this exact order:

~~~
reel-contract
reel-plan
reel-stills
reel-render
reel-takes
paid-failures
ask-again
second-ask
paid-path
three-pictures
~~~

For each: confirm a clean tree; run node scripts/journey.mjs <slug> once; inspect its generated
Evidence, Status and Divergence; and commit that exact journey result before starting the next.
Each journey dirties its feature document, and the next journey otherwise refuses. A FAIL is the
finding: commit its generated result, add the required Journal/context record, run the
document-only check, commit it, and report. Do not run later journeys or rewrite the failed output.

Every journey runs the full repository check and its own test glob. They are intentionally serial;
never substitute --changed or parallelize them.

## Finish only after all eleven journeys PASS

1. Write the required JOURNAL.md entry before finishing: the initial aggregate failure and its
   resolution; check 44's child form, measured time/concurrency and deliberate breaks; the Slice 7
   commit; every journey's PASS commit and test count; collisions or uncaught promises; and the
   next authorized work.
2. Update docs/context.md truthfully: resume-failed is verified and cutroom-sdk's gates are next
   under S-173. Its newest session must match the Journal's newest session.
3. Set this prompt's Run line and PROMPTS/README.md's 061 row to the session that ran it (S-065).
   Do not edit any Evidence, Status or Divergence text.
4. With these documentation-only changes, run node scripts/check.mjs --changed. It must report the
   document checks and authority green. Commit the final Journal/context/prompt bookkeeping.

The end state is resume-failed verified at a named journey commit, each amended verified feature
re-journeyed at a named commit, and a clean tree. Only then is cutroom-sdk's gate work next.

## Out of scope

No new resume behaviour, API contract, provider integration, paid run, secret, real reel, or
cutroom-sdk implementation belongs here. Do not modify approved gates or weaken an existing check.
The preview body's missing contractVersion: 1 remains a future prompt's concern unless a check or
journey proves it blocks this slice.
