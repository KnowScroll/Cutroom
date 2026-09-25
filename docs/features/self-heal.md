---
status: current
authority: plan
---

# self-heal — a model inside the engine reads why a run failed or stopped, and heals it with what the engine owns

Status: planned
Gates: product pending · architecture pending · program-design pending · slices pending

> **Created 2026-09-25 at the owner's request** (S-169), in session 53, after eight real runs made two reels: the
> honeybee reel took six, each failure read from its rows and answered by hand. **Its gates follow `resume-failed`'s
> build**, which it builds on.
>
> **Its gates are not written.** This file records what the owner chose and what the gates must settle. No
> implementation file until all four are approved by an adversarial reviewer.

## What the owner chose (S-169)

A model **inside the engine** reads a failed or stopped run's own rows — the verdicts, the refusals, the lost calls —
and heals the run with what the engine owns, so a fault it can answer does not end the reel. It never edits code, a
gate, a check or a test (CLAUDE.md rule 3), never raises a ceiling, and never rewrites the caller's narration or
criteria, which the engine receives _"as given"_ (D-096): a change to the brief is returned to the caller as a
proposal.

## What it would heal, from the runs so far

Counted in `docs/research/refusals.md` (41 runs) and `docs/reel-pitfalls.md`:

| fault                                                           | seen                                               | a heal the engine owns                           |
| --------------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------ |
| a network error on a picture's status or file                   | P-013, twice in session 53                         | look again; the job or the file exists           |
| a witness answer that is not JSON                               | P-014; the witness, runs `4ce2d176` and `62b5a191` | ask again, told why, as `askStructured` does     |
| fal's 504, a provider down for minutes                          | P-009, twice                                       | wait, then resume (`resume-failed`)              |
| a named subject clipped by the frame's edge                     | 31 of 49 picture reasons; 5 degraded               | ask for the picture again with its framing named |
| a subject the planner named that no picture can show            | P-016: the queen inside the swarm                  | plan again without it                            |
| a shot made from words that drifts out of the reel's world      | P-015; 16 of 49 such clips refused                 | a picture for it, or its prompt held to the reel |
| a criterion that fits one sentence of its claim and not another | P-008                                              | a proposal to the caller                         |
| a sentence that names the unseeable, or asks for darkness       | P-016, P-003                                       | a proposal to the caller                         |

## What the gates must settle

1. **Which model heals, and what it is shown**: the run's rows only, or the pictures and frames too; and the rules it
   reads — `docs/reel-pitfalls.md` is prose for people, not a list a model can be held to.
2. **How many heals a run may take, and at what cost**: each inside the caller's ceiling (D-014, D-100); a heal that
   buys is a new run or a new attempt, recorded with what was read and what was changed (D-084).
3. **What a proposal to the caller looks like**: a field of the run's result, so an amendment to the contract in
   S-034's form or a version 2 — and whether the engine may ever apply one itself, which would need D-096 superseded.
4. **How a heal is checked**: a heal must pass the same gates as the piece it replaces; nothing about a gate moves.
5. **How it relates to `resume-failed`**: a heal that resumes is a resumed run (S-157, S-161 to S-164).
6. **Which verified checks it moves**, found by `test-impact` first.

## Evidence (newest first; appended by the journey, never typed by hand)

## Divergence (the first broken boundary, or "none")

none
