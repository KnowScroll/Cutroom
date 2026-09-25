---
status: current
authority: plan
---

# clip-overlays — labels, arrows or a small diagram drawn by code over a generated clip

Status: deferred — kept for later, not in the queue until the owner gives it a place (S-167)
Gates: product pending · architecture pending · program-design pending · slices pending

> **Created 2026-09-25 at the owner's request** (S-167), in session 52, from `docs/research/hyperframes.md` §4 F and
> the two hybrid reels made outside the engine — a volcano (session 50) and a hurricane (session 51), each the engine's
> clips with layers drawn over them. S-166 did not choose it; S-167 keeps it rather than discarding it.
>
> **Its gates are not written.** No implementation file until all four are approved by an adversarial reviewer.

## What the owner chose (S-167)

A video model keeps making the realistic clip; for the shots that call for it, code draws a transparent layer —
labels, arrows, a small diagram — timed to the shot's own narration words, laid over the accepted clip in the one
ffmpeg pass (D-054). The realism only a model makes, and the precision only code has. Kept for later, not built.

## What its gates must answer (S-166's reasons, kept)

1. **A moving camera**: a line into generated footage must follow what it points at — 230 px across one shot of the
   hybrid, and about three hours of placing by hand. What measures a clip's track, and what does when it cannot.
2. **A label names what the footage may not show** (the hybrid's rule 1): Gates 2–5 judge the clip before the layer
   exists, so the pair is judged only by Gate 7, in the cut.
3. **Words on screen** come only from the narration and the brief's criteria texts (S-166), and a reel's `mustNotShow`
   binds a layer as it binds a picture.
4. **What it reuses**: `composed-hold`'s port and Chrome adapter, and the seven rules session 51's layers ran into.

## Evidence (newest first; appended by the journey, never typed by hand)

## Divergence (the first broken boundary, or "none")

none
