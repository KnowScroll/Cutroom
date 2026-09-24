# 050 — the black-holes brief, on the owner's choice, then `resume-failed`'s gates

- **For:** session 50
- **Feature:** `resume-failed` (gates, on S-157's direction); the black-holes brief is the caller's text (S-134)
- **Work:** put P-006's choice to the owner and make the reel they choose; then write `resume-failed`'s four gates.
  **`parallel-shots` is still held.**
- **Written:** 2026-09-24, at the end of session 49
- **Run:** not yet

**Where things stand.** Session 49 built and verified `ask-again` (S-156): the witness is shown the shape the gate
judges it by — one copy, in `packages/contracts` — an answer refused for its shape is asked once more, told why, and
every refused answer is kept (`scripts/refused.mjs <run>`). The black-holes reel then ran whole for the first time,
run `12a097bf…`, **45¢**: every shot passed Gates 2–5 on its first take, P-004's picture parsed on its first ask, and
one refused witness answer ("many" stars) was asked again and parsed. **The cut failed Gate 7**: _"Does every shot show
something no other shot repeats?"_ — no. Three of four scenes are a dark disc ringed by glowing gas (P-006). And P-002
came back through sentence 5, which still says "a long thin stream". The file is kept, 49.2 s. The owner also settled
`resume-failed`'s five questions (S-157).

Paste everything inside the block below as the session's first message.

```text
Put the black-holes brief's Gate 7 choice to me, make the reel I choose, then write resume-failed's gates.

1. `node scripts/decisions.mjs`. If it says commits are unpushed in the steering repository, say so and stop.
   Read CLAUDE.md, JOURNAL.md's session-49 entry and docs/reel-pitfalls.md — its short list, P-006 and P-002.
   `node scripts/check.mjs` once, green before anything (the check-runner agent may run it).
2. THE BRIEF (P-006). Run 12a097bf's cut failed Gate 7 on repetition: shots 1, 2 and 3 each show a dark disc ringed by
   glowing gas. Put the choice to me with AskUserQuestion, a recommendation first:
   - rewrite scenes c3 and c4 so each is a different KIND of picture (the torn star seen from far, as a comet-like
     smear; a galaxy from outside with nothing ringed at its centre), and sentence 5 without "stream" (P-002);
   - or review Gate 7's repetition question for a topic reel whose subject is one kind of thing — a feature, gates
     first, not a brief change;
   - or accept run 12a097bf's file as it is.
   On a brief change: edit only request() in scripts/real-reel.mjs (S-134), then run
   `node --experimental-strip-types --no-warnings scripts/real-reel.mjs --model fal-ai/flux-2-pro/edit --voice
   English_Graceful_Lady`, check the header says `pictures upToThree`, read the estimate, type `spend 250`, run it in
   the background and report each stage. Hand over the file's full path, its length, its cost by receipts, which
   shots came from pictures, every retake, repair and refused answer (`scripts/refused.mjs <run>`). If it fails, read
   its rows first (the run-reader agent may); no rerun without my yes.
3. resume-failed: write its four gates in docs/features/resume-failed.md on S-157's direction (both may start a
   resume, one in all; provider faults only; accepted pictures kept; a new run pointing back). Have them reviewed by
   the gate-reviewer agent until approved or a finding needs me. Build only if all four are approved and there is time.

How to work:
- Add every new pitfall to docs/reel-pitfalls.md, and keep its short list current.
- Brief-writing rules: each criterion a COMPACT thing, and each SENTENCE too (never a stream, a line, a horizon); no
  sentence with a verb of vanishing or darkness; no two scenes of the same kind of picture.
- Never change a check or a test to make a reel pass. Never raise the 250c ceiling. Never print a key or read .env.
- No absolute path in any committed file (D-086).
- Close out with a JOURNAL.md entry (with the reel list), this prompt's Run line set here and in PROMPTS/README.md
  (S-065), and PROMPTS/051.
```
