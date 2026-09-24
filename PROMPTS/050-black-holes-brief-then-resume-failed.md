# 050 — `resume-failed`'s gates, and the text-made shot with nothing to fall back on

- **For:** session 50
- **Feature:** `resume-failed` (gates, on S-157's direction); P-003's review put to the owner
- **Work:** write `resume-failed`'s four gates and have them reviewed; put P-003's question to the owner; the side
  session's Hyperframes questions if there is time. **`parallel-shots` is still held.**
- **Written:** 2026-09-24, at the end of session 49 (rewritten before it ran, once the reel was made)
- **Run:** not yet

**Where things stand.** Session 49 built and verified `ask-again` (S-156) and `cut-rules` (S-158), and **the first
black-holes reel completed**: run `05611ff9…`, 50.3 s, 53¢, Gate 7 accepted, narration its only sound. On the way, two
runs stopped: one on Gate 7's repetition question (removed), one on a brief whose claim spanned two shots (fixed,
P-008). The owner settled `resume-failed`'s five questions (S-157). A side session researched Hyperframes
(`docs/research/hyperframes.md`, five owner questions in its §8).

Paste everything inside the block below as the session's first message.

```text
Write resume-failed's gates, then put P-003's review to me.

1. `node scripts/decisions.mjs`. If it says commits are unpushed in the steering repository, say so and stop.
   Read CLAUDE.md, JOURNAL.md's session-49 entries and docs/reel-pitfalls.md — its short list.
   `node scripts/check.mjs` once, green before anything (the check-runner agent may run it).
2. resume-failed: write its four gates in docs/features/resume-failed.md on S-157's direction — both the engine and
   the caller may start a resume, one in all; provider faults only; pictures Gate 1 accepted are kept; the caller sees a
   new run pointing back and the failed run stays failed. Settle what S-157 left for the gates: how the engine judges a
   failure a provider's (a closed list, and who names it), the new run's request and how it points back (D-094, D-099),
   what a clips-stage failure keeps (S-092 after a failure, not only a crash), and how ask-again's kept answers inform
   the judgement. Put every real choice to me. Have the gates reviewed by the gate-reviewer agent until approved or a
   finding needs me; use the test-impact agent for the amended-check list. Build only if all four are approved and
   there is time, slice by slice, each on a green check.mjs and broken deliberately.
3. P-003's review, to me with AskUserQuestion: a shot made from words has nothing to fall back on at its third failed
   take, so it stops the reel (S-090) where a pictured shot is held. Accept it, or give such shots a fallback.
4. If there is time: docs/research/hyperframes.md §8's five questions, to me.

How to work:
- Add every new pitfall to docs/reel-pitfalls.md, and keep its short list current.
- Brief-writing rules: each criterion a COMPACT thing, and each sentence too; no verb of vanishing or darkness; a
  criterion's claim carried only by sentences the criterion fits (P-008).
- Never change a check or a test to reach green. Never raise the 250c ceiling. Never print a key or read .env.
- No absolute path in any committed file (D-086).
- Close out with a JOURNAL.md entry, this prompt's Run line set here and in PROMPTS/README.md (S-065), and
  PROMPTS/051.
```
