---
status: current
authority: plan
---

> **Moved here on 2026-09-15** from the KnowScroll repository's `steering/features/reel-render.md`, **before its
> gates were written**, under **S-033**; the last steering commit holding it is `e05e9f0`. Text below is unchanged
> but for formatting and the Evidence heading, which named `pnpm journey`: `pnpm state` and `pnpm journey` are the
> steering repository's tools, and here the journey is `node scripts/journey.mjs`. **Item 5 below has since been
> answered by D-100** — the engine's admission is generation-only, against the per-reel cap and the caller's ceiling.
> Its gates are written and reviewed here.

# reel-render — approved stills become a finished video, for $0

Status: planned
Decisions: D-080 (the split), D-008, D-014, D-015, D-019, D-023, D-025, D-036, D-051…D-059, D-071, D-072, and **D-050 step 2 only**
Gates: product pending · architecture pending · program-design pending · slices pending

> **Created 2026-09-12 by D-080**, which cut the engine in two. Since **D-108** (2026-09-14) the half
> before this one is two features, `reel-plan` and `reel-stills`; `reel-stills` ends with approved still
> images. This feature starts there and ends with a video file. Below, `reel-engine` means those two.
>
> **Its gates are not written.** They belong to their own session, under ritual 2 — one feature per
> session. This file exists so the boundary is recorded and `pnpm state` can see it, not because the
> plan is ready.

## What is in it

Everything after the stills are approved:

- the clips — one clip per shot, made from an approved still
- **D-050 step 2 only**: when a picture fails the set-consistency check and no repair slot is free,
  the frame is discarded and its shot falls back to `text-to-video`, with the reel recording that it
  was made worse. **Step 1 — the one repair image call — is `reel-engine`'s**, because it is an image
  call. The second review found this step belonged to neither feature.
- Gates 2, 3, 4 and 5, and the take ladder when a clip fails one
- holding a shot as a still when the takes run out, and writing down that it happened
- the narration audio and the word timings the captions are cut from
- the single assembly pass that puts it all into one file
- Gates 7 and 8, which judge the finished file and cannot spend money

## What is not in it

The plan, the two storyboards and their filter and score, the keyframes, Gate 1 and Gate 1S, the
splitter, and the epistemic layer. Those are `reel-engine`'s — and so is **D-041 to D-050**, which
an earlier version of the `Decisions:` line above wrongly claimed while this section disclaimed it.
The two features' decision ranges are now disjoint, which matters because `pnpm state` reads that
field as a string and cannot see a contradiction between it and the prose beneath it.

## What it needs before its gates can be written

1. **`reel-stills` approved and built**, because this feature's input is that feature's output.
2. **A fake for the narration audio.** The review of `reel-engine` found that narration is a
   separate MiniMax T2A call with word timings, and D-019 gives it no fallback, so the real path
   needs a credential. The fake must return audio and timings, or the run cannot be keyless.
3. **A fake whose video files have sound in them.** An ffmpeg `color` source is silent, so nothing
   would exercise D-055's audio conform or D-008's ducking.
4. **L4 and Gate 6 settled.** They are in the pipeline design and were claimed as built in
   `reel-engine` while appearing in no slice. Either they are built here, or D-036's `cut` default
   makes them unnecessary and that is written down.
5. **An answer on the money ledger.** D-076 split research spend into its own envelope, and the
   admission check takes one number. This feature is where the video spend actually happens.

## Evidence (newest first; appended by the journey, never typed by hand)

## Divergence (the first broken boundary, or "none")

none

## Pending human decisions

Gates unwritten, so none yet. The five items above are what a session writing them starts from.
