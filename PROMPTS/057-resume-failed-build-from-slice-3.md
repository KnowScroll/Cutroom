# 057 — `resume-failed`: the build from Slice 3, slice by slice, to its journey

- **For:** session 57
- **Feature:** `resume-failed` (S-157, S-161 to S-164, S-171)
- **Work:** Slices 3 to 7 in the gates' order, each committed after the full check; Slice 7 runs the journey.
- **Written:** 2026-09-26, at the end of session 56, which approved the gates and built Slices 1 and 2.
- **Run:** session 57, 2026-09-26 — Slice 3 built (`395dc40`); stopped at its boundary, Slice 4 onwards in `PROMPTS/058`

**Where things stand.** The four gates are APPROVED (2026-09-26, Gate review 12; S-171 decided with the owner in that
round). Slice 1 — the kind: five failure classes, `failureKindOf`, `run.failure`, migration 0007 — is `e67ec6f`.
Slice 2 — what a crash keeps: `readStillsInputs`, the stills ladder's kept input, the reserve `6 − earlier − unmade`,
`seq` the greatest plus one — is `0f73e5d`. Both ran the full `check.mjs` green. Slice 3 is the largest: fourteen
checks (12 to 25), the resume made end to end by a test helper.

**Why it matters.** Of the real runs since the black-holes world, three ended on a provider's fault and were paid for
again from the plan (P-009 twice, P-001). Slice 3 is where a failed run is first made again keeping what it had.

Paste everything inside the block below as the session's first message.

```text
resume-failed: the build from Slice 3, slice by slice, to its journey.

1. `node scripts/decisions.mjs`. If it says commits are unpushed in the steering repository, say so and stop.
   Read docs/context.md first, then CLAUDE.md; open JOURNAL.md, DECISIONS.md and docs/features/resume-failed.md only by
   the headings they name, never whole (S-160). `node scripts/check.mjs --changed` once (S-159).
2. The build, from Slice 3, in the gates' order (Gate 4). Before each slice: its amendment blocks and the checks it
   proves, read from Gate 3 and Gate 4, and the test-impact agent on anything the slice touches that a verified check
   asserts — handed the exact changes and told what Gate 3 already lists, so it does not repeat that pass. Each slice:
   its tests first, then its code; one deliberate break per property, seen red, then restored; the full
   `node scripts/check.mjs` green (the check-runner agent), then one commit naming the slice and the checks it proves.
   Tick its box in Gate 4. Slice 4 carries S-171's stop and the `ResumeService`'s `askOwner` (round 12's fixes).
3. Slice 7: `node scripts/journey.mjs resume-failed` after its commit, and the other features' journeys Gate 4 names.
   A FAIL is the finding: stop and report.
4. Stop at a slice boundary when the context grows heavy — never inside a slice. The journal and docs/context.md hand
   the next slice over.

How to work:
- --changed between steps; the full check.mjs before every commit of code, and before a journey (S-159).
- S-160: hand an agent its facts and the lines of docs/context.md that matter, not a search. Agents working at once
  run as one workflow.
- Every provider stays a stand-in in tests; no real run in this session, and nothing spent.
- Never change a check or a test to reach green. Never raise the 250c ceiling. Never print a key or read .env.
- No absolute path in any committed file (D-086).
- A choice between real alternatives the gates do not settle goes to me with AskUserQuestion, then into DECISIONS.md.
- Close out with a JOURNAL.md entry and docs/context.md's entry for this session (S-160), this prompt's Run line set
  here and in PROMPTS/README.md (S-065), and PROMPTS/058 — the next slice of resume-failed, or, when Slice 7's journey
  has passed, self-heal's gates (S-169, S-170), then caption-match's (S-165, S-168).
```
