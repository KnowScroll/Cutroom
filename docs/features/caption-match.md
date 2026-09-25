---
status: current
authority: plan
---

# caption-match — Gate 7's caption question is answered by comparing the subtitles with the narration, word for word

Status: planned
Gates: product pending · architecture pending · program-design pending · slices pending

> **Created 2026-09-25 at the owner's request** (S-165), in session 52, from P-011: run `bf8f4444…` stopped at Gate 7 on
> a correct cut, 55¢, because the judge answered no to _"Do the burned captions follow the narration?"_ — and 13 of the
> 18 frames it was shown carry no caption. The subtitles file held all 89 words of the narration, in order. Run
> `74bb96a0…` was asked the same question over the same kind of frames and answered yes.
>
> **Its gates are not written.** This file records what the owner chose and what the gates must settle. No
> implementation file until all four are approved by an adversarial reviewer.

## What the owner chose (S-165)

The caption question leaves the judge: the engine compares its own two texts — the subtitles it burned and the
narration it was given — word for word, with no model. The judge keeps Gate 7's other three questions. Rejected: frames
taken at word midpoints; the caption text shown to the judge. Until this feature is verified, Gate 7 asks as it does
today — it is not weakened meanwhile (CLAUDE.md rule 3).

## What the gates must settle

1. **What "follow" means exactly**: every narration word once, in order, each shown while it is spoken — the word
   timings (S-070) against each caption's start and end — and how punctuation and case are compared.
2. **What proves the captions were burned, not only written**: the render's check that the cut matches its manifest
   (`render/index.ts`), a frame read on a word midpoint, or both.
3. **Where the comparison lives** (a pure function in the pipeline, beside Gate 7) and **how its verdict is recorded**:
   one of Gate 7's four answers, or a verdict of its own in the render row and the events.
4. **Which verified checks it moves**: Gate 7's question list, the judge's call and its receipts (`cut-rules`,
   `reel-render`), found by `test-impact` first.

## Evidence (newest first; appended by the journey, never typed by hand)

## Divergence (the first broken boundary, or "none")

none

## Deferred

1. **Parallel shots** (D-023, S-115) — held by the owner.
