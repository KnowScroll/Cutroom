# 048 — fal's own figure closes Slice 8; then the first reel made from standalone pictures

- **For:** session 48
- **Feature:** `paid-path`'s Slice 8, then a real reel under `three-pictures` (S-150)
- **Work:** **A** (tick Slice 8 once the owner has read fal's figure, free), then **B** (a real reel with the picture
  rule on, 140–210¢, only with the owner's go-ahead). **`parallel-shots` is still held.**
- **Written:** 2026-09-23, at the end of session 47
- **Run:** not yet

**Session 47 built `second-ask` and made the first reel that passed Gate 7.** `second-ask` is verified: a refused
witness answer is asked once more, at the gate, and only once (S-147). Then run `f895e76d-1567-4cd5-8b5e-6e1a04dcf72f`
**completed, Gate 7 accepted**, for **160¢ by our receipts** against a 250¢ ceiling — and made no picture: the planner
named the recurring logbook as two subjects, and the plan that did recur lost on score (S-148).

**Two things are owed, and both are the owner's.**

1. **fal's own figure for run `f895e76d…`** — our arithmetic says 160¢ (36¢, 36¢, 36¢, 52¢, all
   `fal-ai/minimax-h3-turbo/text-to-video`). Slice 8 and the Outcome line _"One real reel exists … beside what the
   provider says it cost"_ both need it, and so does D-007's Q9. Also: did any call from earlier runs bill that our
   record does not show?
2. **Pictures AND Gate 7 — answered in session 47, not yet proven** (updated at its end). `one-subject` measured a
   planner sentence for nothing and it was **not kept**; underneath, a recurring subject reads as repetition to the
   scorer's fourth question, which is Gate 7's (S-149). The owner then chose `three-pictures` (S-150), **built and
   verified**: with `CUTROOM_PICTURES=upToThree` — which `scripts/real-reel.mjs` sets — free picture slots, up to three
   pictures a reel, go to shots holding none and naming no pictured subject, as `standalone` pictures made from
   scratch. **Whether a real reel of different scenes made that way passes Gate 7 is unknown until one is made.**

Paste everything inside the block below as the session's first message.

```text
Work in this order: A (Slice 8, once the owner gives fal's figure), then B (the first real reel under
three-pictures). parallel-shots is HELD by the owner: do not start it. Everything is written out in
PROMPTS/048-provider-figure-then-recurring-subject.md.

WHAT IS ALREADY SETTLED, so do not ask any of it again:
- second-ask is verified (S-147): a refused observation is asked once more at the gate, once.
- Run f895e76d-1567-4cd5-8b5e-6e1a04dcf72f passed Gate 7 for 160c by our receipts. It is the reel Slice 8 names.
- THE CEILING IS 250 CENTS, a constant in scripts/real-reel.mjs that --ceiling can only lower.
- Both keys are in .env and work. Never print a key and never read .env to show one.

Start:
1. `node scripts/decisions.mjs`. If it says commits are unpushed in the steering repository, say so and stop.
2. Read CLAUDE.md; then JOURNAL.md's session 47 entry IN FULL; then DECISIONS.md's S-147 to S-150.
3. `node scripts/check.mjs` — confirm green before anything else. Session 47 saw its tests step fail twice and pass
   three times with no change; if it fails, find WHICH test before anything else (check.mjs prints 40 lines only).

A. DONE IN SESSION 47: fal's figures were read and paid-path is verified (S-154). A clip is billed about 0.2c, not
   36-52c; fal's quantity is not seconds of video. The rate was deliberately NOT changed.

B. DONE IN SESSION 47: the service defaults to pictures: 'upToThree' (S-153).

C. DONE IN SESSION 47: fal video re-priced to 0.5c a second in the real adapter (S-155). Nothing is
   owed but upstream: BUDGET.md's figure. Ask the owner what comes next; parallel-shots (S-115) is held by them.

How to work:
- Never weaken a check or a test to reach green. Every fix by addition.
- Any choice between real alternatives becomes a written S- entry with what was rejected and how a violation is
  caught.
- No test calls a provider, no test needs a key, and no npm dependency is added (S-111, S-114).
- No absolute path anywhere (D-086). Write every break and every regex from a FILE; in session 47 the shell ran the
  backticks inside a double-quoted `node -e` as commands and dropped words from a decision.

Finish:
- `node scripts/check.mjs` green, and the journeys the change touches PASS.
- A JOURNAL.md entry; this prompt's Run line set here and in PROMPTS/README.md (S-065); and PROMPTS/049.
```
