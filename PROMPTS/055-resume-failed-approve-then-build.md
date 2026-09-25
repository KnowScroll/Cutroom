# 055 — `resume-failed`: one approving read of its gates, then its build, slice by slice

- **For:** session 55
- **Feature:** `resume-failed` (S-157, S-161 to S-164)
- **Work:** one fresh approving read of the four gates — its findings fixed, not another open round — then the build
  from Slice 1, each slice committed after the full check.
- **Written:** 2026-09-25, at the end of session 52, when the owner put `resume-failed` ahead of `parallel-shots`
  (S-168). This file held `parallel-shots`' gates until then; that text is at `b15d203`, carried to the session that
  writes them. Written as 053, renumbered 054 when the owner put two test reels first (`PROMPTS/053`), and 055 when
  the owner put two explainer reels first (`PROMPTS/054`).
- **Run:** not yet

**Where things stand.** Session 52 wrote `resume-failed`'s four gates — 44 checks in 7 slices — on twenty-two owner
answers (S-161 to S-164) and took them through eleven review rounds. Round 10 would have approved all four; round 11, a
fresh reviewer, found five things, every one fixed there, none needing the owner. The owner stopped the review: _"I
think we are doing redundant checks uselessly"_. The gates are written and not approved — `docs/features/resume-failed.md`,
its `Gates:` line and its review sections. It also decided the next work's order (S-168): this, then `caption-match`
and the registry change, then `composed-hold`, `diagram-shots` and `code-reels`, then `parallel-shots`.

**Why it matters.** Of the twelve real runs since the black-holes world, three ended on a provider's fault (P-009
twice, P-001) and were paid for again from the plan. This is the feature that keeps what was already checked.

Paste everything inside the block below as the session's first message.

```text
resume-failed: one approving read of its gates, then its build, slice by slice.

1. `node scripts/decisions.mjs`. If it says commits are unpushed in the steering repository, say so and stop.
   Read docs/context.md first, then CLAUDE.md; open JOURNAL.md, DECISIONS.md and docs/features/resume-failed.md only by
   the headings they name, never whole (S-160). `node scripts/check.mjs --changed` once (S-159).
2. The approving read. One fresh gate-reviewer reads all four gates of docs/features/resume-failed.md, handed round
   11's five findings and their fixes, and S-161 to S-164. It approves, or it names findings. Fix every finding in the
   file; one that needs a decision goes to me with AskUserQuestion. Then the same reviewer, through SendMessage, reads
   the fixes only and approves — no new open round. If it still will not approve, stop and ask me.
3. The build, from Slice 1, in the gates' order. Before each slice: its amendment blocks and the checks it proves, read
   from Gate 3 and Gate 4, and the test-impact agent on anything the slice touches that a verified check asserts. Each
   slice: its tests first, then its code; the full `node scripts/check.mjs` green (the check-runner agent), then one
   commit naming the slice and the checks it proves. Tick its box in Gate 4.
4. Stop at a slice boundary when the context grows heavy — never inside a slice. The journal and docs/context.md hand
   the next slice over.

How to work:
- --changed between steps; the full check.mjs before every commit of code, and before a journey (S-159).
- S-160: hand an agent its facts and the lines of docs/context.md that matter, not a search. Agents working at once
  run as one workflow.
- Every provider stays a stand-in in tests; no real run in this session, and nothing spent.
- Never change a check or a test to reach green. Never raise the 250c ceiling. Never print a key or read .env.
- No absolute path in any committed file (D-086).
- Close out with a JOURNAL.md entry and docs/context.md's entry for this session (S-160), this prompt's Run line set
  here and in PROMPTS/README.md (S-065), and PROMPTS/055 — the next slice of resume-failed, or, when Slice 7's journey
  has passed, caption-match's gates (S-165, S-168).
```
