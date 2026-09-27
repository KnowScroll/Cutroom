# 058 — `resume-failed`: the build from Slice 4, slice by slice, to its journey

- **For:** session 58
- **Feature:** `resume-failed` (S-157, S-161 to S-164, S-171)
- **Work:** Slices 4 to 7 in the gates' order, each built by one `slice-builder` agent (S-172) and committed after the
  full check; Slice 7 runs the journey.
- **Written:** 2026-09-26, at the end of session 57, which built Slice 3; amended the same session for S-172 (a builder
  agent per slice, so one session builds several) and S-173 (`cutroom-sdk` next after `resume-failed`).
- **Run:** session 58, 2026-09-26 to 27 — Slice 4 built and committed; stopped at its boundary at the owner's word

**Where things stand.** The four gates are APPROVED (Gate review 12). Slices 1 (`e67ec6f`), 2 (`0f73e5d`) and 3
(`395dc40`) are built, each after a full `check.mjs` green. Slice 3 made the resume end to end by a test:
`planResume`, `admitResume`, `normalise` and `takedown` (`packages/pipeline/src/resume/index.ts`); `readResumeInputs`
and `resumeRun` (`packages/domain/src/resume.ts`); starting attempts; `reelSpentCents` in the guards and questions;
`imageCallCount` counting copies; labels in two runs; the kept-take check; and `resumed()` in
`tests/engine/harness.ts`, which resumes a run the way the API will. Slice 4 is the call: nine checks (26 to 34).

**What Slice 3 left for Slice 4 to replace or build on.** `Piece` is a local type in
`packages/contracts/src/resume.ts` until `reel-contract`'s route arrives; Slice 4 defines the schema there and
`contracts` imports it (Gate 3's import graph). `planResume` answers `planned`, `replayed`, `resumed` or `refused`;
`ResumeDecision` — `decide`'s answer, with `budget` and `admitted` carrying the plan and the four figures — is not yet
written. `ResumePlan` carries both `named` (stored, compared for a replay) and `remade` (what the preview lists).

Paste everything inside the block below as the session's first message.

```text
resume-failed: the build from Slice 4, slice by slice, to its journey.

1. `node scripts/decisions.mjs`. If it says commits are unpushed in the steering repository, say so and stop.
   Read docs/context.md first, then CLAUDE.md; open JOURNAL.md, DECISIONS.md and docs/features/resume-failed.md only by
   the headings they name, never whole (S-160). `node scripts/check.mjs --changed` once (S-159).
2. The build, from Slice 4, in the gates' order (Gate 4), ONE SLICE AT A TIME, EACH BY ONE `slice-builder` AGENT
   (S-172), so this session's own context stays small and several slices fit. Per slice, in this session: read its Gate
   4 box and the Gate 3 checks and amended checks it proves; the test-impact agent on anything the slice touches that a
   verified check asserts — handed the exact changes and told what Gate 3 already lists, so it does not repeat that
   pass; then brief the builder with those facts, this prompt's "What Slice 3 left" lines, and one test of done — the
   slice's test file and `check.mjs --changed` green. The builder writes tests first, then code, one deliberate break
   per property seen red and restored, and the amendment blocks; it never commits. Then read its diff, the full
   `node scripts/check.mjs` green (the check-runner agent), tick its box in Gate 4, and one commit naming the slice,
   the checks it proves and the builder's breaks. Slice 4 carries S-171's stop and the `ResumeService`'s `askOwner`
   (round 12's fixes). A choice the gates leave open that a builder reports goes to me with AskUserQuestion.
3. Slice 7: `node scripts/journey.mjs resume-failed` after its commit, and the other features' journeys Gate 4 names.
   A FAIL is the finding: stop and report.
4. Go on to the next slice after each commit. Stop only at a slice boundary, if this session's own context still
   grows heavy — never inside a slice. The journal and docs/context.md hand the next slice over.

How to work:
- --changed between steps; the full check.mjs before every commit of code, and before a journey (S-159).
- S-160: hand an agent its facts and the lines of docs/context.md that matter, not a search. Agents working at once
  run as one workflow.
- Every provider stays a stand-in in tests; no real run in this session, and nothing spent.
- Never change a check or a test to reach green. Never raise the 250c ceiling. Never print a key or read .env.
- No absolute path in any committed file (D-086).
- A choice between real alternatives the gates do not settle goes to me with AskUserQuestion, then into DECISIONS.md.
- Close out with a JOURNAL.md entry and docs/context.md's entry for this session (S-160), this prompt's Run line set
  here and in PROMPTS/README.md (S-065), and PROMPTS/059 — the next slice of resume-failed, or, when Slice 7's journey
  has passed, cutroom-sdk's gates (S-173: KnowScroll calls the engine through @cutroom/sdk, which connects to it or
  starts it when none answers), then self-heal's (S-169, S-170), then caption-match's (S-165, S-168).
```
