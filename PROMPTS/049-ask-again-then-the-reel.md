# 049 — a model answer that does not parse is asked for once more, then the black-holes reel again

- **For:** session 49
- **Feature:** a new one, `ask-again` (slug to confirm) — gates first, in `docs/features/`; then `resume-failed`'s five
  owner questions, if there is time
- **Work:** plan and build the fix `docs/reel-pitfalls.md`' short list puts first — P-001 and P-004 — then make the
  black-holes reel with the brief as committed. **`parallel-shots` is still held.**
- **Written:** 2026-09-24, at the end of session 48, on the owner's choice of option 3: rerun now, and put the fix into
  next session's prompt
- **Run:** session 49, 2026-09-24 — `ask-again` and then `cut-rules` verified; the black-holes reel completed on the
  third run (run 05611ff9, 53c, Gate 7 accepted)

**Where things stand.** Session 48 made four real runs of one brief — black holes — and **none finished**, for 93¢ in
all. Two faults were the brief's and were fixed in it (P-002, P-003). **Three runs were lost to ONE malformed answer
from a model**, because a malformed answer fails the whole run (S-042): MiniMax's word timings repeated a word (P-001),
and the picture witness twice answered shot 1's picture — a black sphere ringed by glowing gas, a good picture both
times — with a count that was not a positive number: a string once, 0 once (P-004). The raw answer is not kept, so what
it wrote is not known. The brief cannot fix a model writing the wrong type.

Paste everything inside the block below as the session's first message.

```text
Plan and build the fix for one malformed model answer failing a whole real run, then make the black-holes reel.

1. `node scripts/decisions.mjs`. If it says commits are unpushed in the steering repository, say so and stop.
   Read CLAUDE.md, JOURNAL.md's session-48 entry and docs/reel-pitfalls.md — its short list, P-001 and P-004.
   `node scripts/check.mjs` once, green before anything.
2. A NEW FEATURE, gates first (docs/features/<slug>.md; four gates, adversarially reviewed, before any code): when a
   model's answer does not parse — the witness's observation, the reconciler's, the planner's, the scorer's, and the
   narration's word timings — ASK ONCE MORE before failing the run, and KEEP THE RAW ANSWER of every one that did not
   parse, so it can be read. What the gates must settle, and put to me where it is a choice:
   - which answers are asked again, and whether the second ask is told what was wrong with the first;
   - what the second ask costs, how the estimate and the ceiling count it, and how receipts show it (D-084);
   - where the raw answer is kept (a table row, or a file under the artifact root — never a key, D-022) and what reads it;
   - that S-042 is superseded only in part, by an S- entry naming what was rejected and how a violation is caught;
   - checks that prove a malformed answer is asked again once, a second malformed answer still fails the run, and the
     raw answers are kept — with stand-ins, spending nothing.
   Build it slice by slice, each committed on a green check.mjs, each broken deliberately and restored. Journey PASS.
3. THE REEL: the brief in scripts/real-reel.mjs is the black-holes brief as committed — do not change it unless it
   fails on the brief's own terms. Run `node --experimental-strip-types --no-warnings scripts/real-reel.mjs --model
   fal-ai/flux-2-pro/edit --voice English_Graceful_Lady`, check the header says `pictures upToThree`, read the
   estimate, type `spend 250`, run it in the background and report each stage. Hand over the file's full path, its
   length, its cost by receipts, which shots came from pictures, every retake or repair. If it fails, read its rows
   first; no rerun without my yes.
4. If there is time: docs/features/resume-failed.md's five questions, put to me.

How to work:
- Add every new pitfall to docs/reel-pitfalls.md, and keep its short list current — what to fix, what to review.
- Brief-writing rules learned in session 48: each criterion a COMPACT thing (never a stream, a line, a horizon); no
  sentence with a verb of vanishing or darkness (disappear, vanish, fade, go dark).
- Never change a check or a test to make a reel pass. Never raise the 250c ceiling. Never print a key or read .env.
- No absolute path in any committed file (D-086).
- Close out with a JOURNAL.md entry (with the reel list), this prompt's Run line set here and in PROMPTS/README.md
  (S-065), and PROMPTS/050.
```
