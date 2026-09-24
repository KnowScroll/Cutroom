# 051 — `resume-failed`'s gates, and the reviews real reels left

- **For:** session 51
- **Feature:** `resume-failed` (gates, on S-157's direction); P-003's, P-010's and P-011's reviews put to the owner
- **Work:** write `resume-failed`'s four gates and have them reviewed; put the three reviews to the owner; whether an
  overlay or diagram-shot feature gets its gates, if there is time. **`parallel-shots` is still held.**
- **Written:** 2026-09-24, at the end of session 49 as 050; carried to 051 at the end of session 50, which ran no
  prompt, with its standing and its reviews brought up to date
- **Run:** not yet

**Where things stand.** Session 49 built and verified `ask-again` (S-156) and `cut-rules` (S-158), and the first
black-holes reel completed. Session 50 opened with a question and made **the first hybrid reel**: the engine's footage of
volcanoes (run `bf8f4444…`) with labels, lines that follow the picture, and one diagram shot drawn over it by Hyperframes,
outside the engine (`docs/research/hyperframes.md`, its last section). Four runs and 73¢ on the way: fal's flux upstream
failed twice (P-009 — `resume-failed`'s case exactly), a switch to `nano-banana-2` failed D-028's frame assertion (P-010),
and Gate 7 stopped a cut whose captions were correct (P-011).

Paste everything inside the block below as the session's first message.

```text
Write resume-failed's gates, then put the reviews real reels left to me.

1. `node scripts/decisions.mjs`. If it says commits are unpushed in the steering repository, say so and stop.
   Read CLAUDE.md, JOURNAL.md's session-49 and session-50 entries and docs/reel-pitfalls.md — its short list.
   `node scripts/check.mjs` once, green before anything (the check-runner agent may run it).
2. resume-failed: write its four gates in docs/features/resume-failed.md on S-157's direction — both the engine and
   the caller may start a resume, one in all; provider faults only; pictures Gate 1 accepted are kept; the caller sees a
   new run pointing back and the failed run stays failed. Settle what S-157 left for the gates: how the engine judges a
   failure a provider's (a closed list, and who names it — P-009's 504 is one), the new run's request and how it points
   back (D-094, D-099), what a clips-stage failure keeps (S-092 after a failure, not only a crash), and how ask-again's
   kept answers inform the judgement. Put every real choice to me. Have the gates reviewed by the gate-reviewer agent
   until approved or a finding needs me; use the test-impact agent for the amended-check list. Build only if all four
   are approved and there is time, slice by slice, each on a green check.mjs and broken deliberately.
3. The reviews, to me with AskUserQuestion, each with what docs/reel-pitfalls.md says of it:
   - P-003: a shot made from words has nothing to fall back on at its third failed take, so it stops the reel (S-090).
     Accept it, or give such shots a fallback.
   - P-011: Gate 7 stopped a correct cut on "Do the burned captions follow the narration?" — 13 of its 18 frames carry
     no caption. Which fix gets its gates: the caption text shown to the judge, frames taken on words, or an exact
     comparison of the subtitles with the narration.
   - P-010: nano-banana-2 and seedream are admitted to the image registry but cannot make the exact frame. Drop them,
     or send them a size they honour.
4. If there is time: whether graphics over the clips (docs/research/hyperframes.md §4 F) or diagram shots (§4 C)
   becomes a feature with its four gates, from that file's hybrid-reel section, to me.

How to work:
- Add every new pitfall to docs/reel-pitfalls.md, and keep its short list current.
- Before recommending a different model or provider, read its history in JOURNAL.md and DECISIONS.md (P-010).
- Brief-writing rules: each criterion a COMPACT thing, and each sentence too; no verb of vanishing or darkness; a
  criterion's claim carried only by sentences the criterion fits (P-008); no digit, symbol or acronym in a sentence.
- Never change a check or a test to reach green. Never raise the 250c ceiling. Never print a key or read .env.
- No absolute path in any committed file (D-086).
- Close out with a JOURNAL.md entry, this prompt's Run line set here and in PROMPTS/README.md (S-065), and
  PROMPTS/052.
```
