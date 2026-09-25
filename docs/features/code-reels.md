---
status: current
authority: plan
---

# code-reels — a whole reel drawn by code: no picture or clip bought, every shot a composition

Status: planned
Gates: product pending · architecture pending · program-design pending · slices pending

> **Created 2026-09-25 at the owner's request** (S-167), in session 52, from the two reels made from code alone outside
> the engine — how a CPU works (session 50) and a jet engine (session 51) — in `docs/research/hyperframes.md`.
> **Its gates follow `composed-hold`'s and `diagram-shots`'**, whose port, headless-Chrome adapter, stand-in and
> startup check it reuses.
>
> **Its gates are not written.** This file records what the owner chose and what the gates must settle. No
> implementation file until all four are approved by an adversarial reviewer.

## What the owner chose (S-167)

The engine makes three kinds of reel: **footage** (every shot a video model's clip, as built), **hybrid** (drawn shots
cut between clips — `diagram-shots`) and **code-only** — this feature: every shot drawn by code, nothing bought but, at
most, the narration. Words on screen come only from the narration and the brief's criteria texts (S-166, D-096).

## Asked of the owner before the product gate

1. **How a reel's kind is chosen**: the caller asks for one — a contract field, so an amendment to version 1 in S-034's
   form or a version 2 — or the planner chooses, shot by shot.
2. **Who writes the shots**: vetted templates only (`diagram-shots`' set, grown), or a model writing each shot's code
   (research §4 D). The owner likes §4 D. Its risks, as the research reads them: Chrome launched with `--no-sandbox`
   and no request interception, a brief that could steer the code, quality that varies from run to run; and the
   engine's model port answers from MiniMax, which has never written a composition — sessions 50 and 51's were written
   by Claude, and a person checked their frames.
3. **The voice**: the paid narration, or a free one (research §8 question 3).

## What the gates must settle

1. **How a code-only reel is checked**: which of Gates 0–7 apply to a reel with no picture and no clip, and what
   replaces the witness for words the engine itself drew.
2. **The rules the research set down for any composed shot** — a GSAP start state set once, a motion floor, dash speed
   under the strobe limit, text written when built and never tweened, fills faded in with their strokes — each a check,
   not a hope. In session 50 lint passed on blocks that rendered invisible.
3. **Length**: D-111's 35 to 45 seconds; the CPU reel ran 76.3 s because its subject was broad.
4. **If §4 D is chosen**: the render's network blocked, what a composition may load, the shared kit it builds on, and
   which model writes it.
5. **Which verified checks it moves**, found by `test-impact` first.

## Evidence (newest first; appended by the journey, never typed by hand)

## Divergence (the first broken boundary, or "none")

none
