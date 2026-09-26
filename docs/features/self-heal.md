---
status: current
authority: plan
---

# self-heal — one harness around the run: make, check, heal, and learn from what failed

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

## What the owner added (S-170)

In session 55, after six runs made both explainer reels — every stop a brief cause healed by hand:

- **One harness around the whole run**: the engine makes each piece, the gates judge it, and on a refusal or a failed
  call the harness reads why and chooses the next move — the piece is made and judged again, inside the ceiling.
- **A rule book is its memory** — learning from failed runs is part of this feature, not another. Each cause and each
  heal that worked becomes a rule with its runs, and the rule book feeds a check of the brief before anything is spent,
  the planner's and the picture's prompts, and the harness's first choice of heal. `docs/reel-pitfalls.md`' rules are
  its first entries.
- **A learned rule binds only once the owner approves it.** Until then it is a proposal and changes no run.
- **The caller's criteria and claims are healed in place only when the request opts in**: a criterion's wording or id,
  and which claims a sentence carries — never a sentence's text, a fact, a `mustNotShow`, the style or the policy
  version. Every change recorded and returned with the brief as it completed. Without the opt-in, a proposal (S-169).
  This supersedes D-096 in part (S-170).

## What the rule book teaches the prompts, and how it is measured

The owner, later in session 55: the harness must be _"very sophisticated and no-bs"_ and _"learn from mistakes, that is
what the image model needs in future images so it fails less, the descriptions, details"_.

- **No model is trained.** What learns is what the engine asks for: the picture's, the clip's and the planner's prompts,
  written from the rule book. From session 55's refusals alone — made objects unbranded, no badges, no labels on their
  controls (P-017); a screen showing only its image, filling it; the sentences are heard, never drawn as text (P-021); one
  whole thing named, not many (P-018); a tall or wide subject framed small, with space round it (P-002, P-012 — 45 of 94
  picture reasons).
- **A repair is told what the witness saw**, not only the gate's reason: _"TUF on the card's shroud"_, where today it
  hears _"never-text is shown"_.
- **A rule is kept by its numbers.** It names the kind of subject it covers and the model it was learned on, and carries
  the refusal rate before and after it; a rule that does not lower refusals is withdrawn, and none binds until the owner
  approves it (S-170).
- **The feature is measured on real runs, against today's baseline.** Sessions 53 to 55: 19 runs made 4 reels, 649¢ —
  about 162¢ a reel, against about 55¢ for a clean run; 15 runs ended early, 7 on one request (a network error, an answer
  not JSON) and 8 on the brief. **The target its journey holds it to**: one submission per reel for every fault the
  harness owns, and a reel's cost near one clean run's. A journey that does not show it is not done.

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
| a criterion that fits one sentence of its claim and not another | P-008, recurred in session 55                      | opted in: move the claim; else a proposal        |
| lettering on things that carry it in life                       | P-017; 13 of 17 pictures refused in session 55     | opted in: a subject that carries none; a prompt  |
| a plural name, or a qualifier read as required                  | P-018 (the pyramids), P-022                        | the brief check; opted in: reword the criterion  |
| the narration drawn on a picture                                | P-021                                              | a prompt that says the sentences are heard       |
| a sentence that names the unseeable, or asks for darkness       | P-016, P-003                                       | a proposal to the caller                         |

## What the gates must settle

1. **Which model heals, and what it is shown**: the run's rows only, or the pictures and frames too; and the rules it
   reads — `docs/reel-pitfalls.md` is prose for people, not a list a model can be held to.
2. **How many heals a run may take, and at what cost**: each inside the caller's ceiling (D-014, D-100); a heal that
   buys is a new run or a new attempt, recorded with what was read and what was changed (D-084).
3. **What a proposal to the caller looks like, and the opt-in**: a field of the run's result and a field of the
   request, so an amendment to the contract in S-034's form or a version 2. Applied in place only when opted in, within
   S-170's limits; how KnowScroll's side reads a completed brief is the steering repository's to decide.
4. **How a heal is checked**: a heal must pass the same gates as the piece it replaces; nothing about a gate moves.
5. **How it relates to `resume-failed`**: a heal that resumes is a resumed run (S-157, S-161 to S-164).
6. **The rule book**: where it lives, what a rule holds (its cause, its runs, its heal), how it is read by the brief
   check, the prompts and the harness, and how the owner approves one (S-170).
7. **The measure**: which real briefs the journey runs, how many, and how the baseline above is counted, so the target
   is a number a reviewer can hold the build to.
8. **Which verified checks it moves**, found by `test-impact` first.

## Evidence (newest first; appended by the journey, never typed by hand)

## Divergence (the first broken boundary, or "none")

none
