# 048 — fal's own figure closes Slice 8; then a subject that recurs in the chosen plan

- **For:** session 48
- **Feature:** `paid-path`'s Slice 8, and whatever the owner chooses for S-148's second question
- **Work:** **A** (tick Slice 8 once the owner has read fal's figure, free), then **B** (the owner's choice on
  recurrence, gates first if it touches a verified feature). **`parallel-shots` is still held.**
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
2. **Pictures AND Gate 7 — the question S-149's measurement left** (updated at the end of session 47). The owner
   chose the planner's prompt for S-148; `one-subject` measured it for nothing and it was **not kept** (0 of 6, as the
   baseline). Underneath: in all six runs where the selected plan would make a picture, the scorer answered **no** to
   _"Does every shot show something that no other shot has already shown?"_ — Gate 7's question too. D-027 makes a
   picture only for a subject that recurs; D-064's fourth question counts recurrence against the plan. Which, if
   either, moves is the owner's.

Paste everything inside the block below as the session's first message.

```text
Work in this order: A (Slice 8, once the owner gives fal's figure), then B (a subject that recurs in the chosen
plan). parallel-shots is HELD by the owner: do not start it. Everything is written out in
PROMPTS/048-provider-figure-then-recurring-subject.md.

WHAT IS ALREADY SETTLED, so do not ask any of it again:
- second-ask is verified (S-147): a refused observation is asked once more at the gate, once.
- Run f895e76d-1567-4cd5-8b5e-6e1a04dcf72f passed Gate 7 for 160c by our receipts. It is the reel Slice 8 names.
- THE CEILING IS 250 CENTS, a constant in scripts/real-reel.mjs that --ceiling can only lower.
- Both keys are in .env and work. Never print a key and never read .env to show one.

Start:
1. `node scripts/decisions.mjs`. If it says commits are unpushed in the steering repository, say so and stop.
2. Read CLAUDE.md; then JOURNAL.md's session 47 entry IN FULL; then DECISIONS.md's S-147, S-148 and S-149 (as amended).
3. `node scripts/check.mjs` — confirm green before anything else. Session 47 saw its tests step fail twice and pass
   three times with no change; if it fails, find WHICH test before anything else (check.mjs prints 40 lines only).

A. SLICE 8. Ask the owner for fal's own figure for run f895e76d… and whether any earlier call billed that our record
   does not show. Write both beside our 160c in JOURNAL.md, tick Slice 8 and the "One real reel exists" Outcome line
   in docs/features/paid-path.md, and run paid-path's journey. If the figures disagree, that is the finding: record it
   and say what it means for the budget guard before ticking anything.

B. PICTURES AND GATE 7. Read S-149 as amended: a recurring subject reads as repetition to the scorer's fourth
   question, which is Gate 7's. Put the choice to the owner with AskUserQuestion — for instance D-027's rule (a
   picture only for a recurring subject), D-064's fourth question's wording, or leave both — each a change to a
   verified feature and a D-entry, so gates first. Measure any wording for nothing first, as one-subject did
   (.tmp/one-subject-measure.mjs is the pattern; it is not committed). A reel costs about 160-210c; do not run one
   without the owner's go-ahead in this session.

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
