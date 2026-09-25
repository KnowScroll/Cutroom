---
status: current
authority: plan
---

# diagram-shots — the planner may choose a vetted template for a shot, drawn by code where no video model is exact

Status: planned
Gates: product pending · architecture pending · program-design pending · slices pending

> **Created 2026-09-25 at the owner's request** (S-166), in session 52, from `docs/research/hyperframes.md` §4 C and the
> hybrid reel of session 50, whose shot 0 was a drawn cross-section of a volcano. **Its gates follow
> `composed-hold`'s**, whose port and Chrome adapter it reuses.
>
> **Its gates are not written.** This file records what the owner chose and what the gates must settle. No
> implementation file until all four are approved by an adversarial reviewer.

## What the owner chose (S-166)

A closed set of vetted templates — a labelled diagram, a scale comparison, a timeline — that the planner may choose for
a shot and fill, the way D-028's registry holds image models. **Every word on screen comes from the narration or the
brief's criteria texts** (D-096): a number appears only if one of them says it. A reel's `mustNotShow` binds a template
as it binds a picture.

## What the gates must settle

1. **The first templates**, and how each is vetted once, linted (`hyperframes check`, which caught what lint passed) and
   tested with the stand-ins.
2. **How a shot kind reaches the plan, Gate 0, the estimate and the render manifest**, and whether the caller's contract
   changes at all (version 1).
3. **How a template shot is checked**: which of Gates 1–5 apply to a drawn shot, and what replaces the witness for
   words the engine itself drew.
4. **Timing to the narration's words** (the hybrid's rule 6: a span ends with its narration's last word).
5. **Which verified checks it moves**, found by `test-impact` first.

## Evidence (newest first; appended by the journey, never typed by hand)

## Divergence (the first broken boundary, or "none")

none

## Deferred

1. **Parallel shots** (D-023, S-115) — held by the owner.
