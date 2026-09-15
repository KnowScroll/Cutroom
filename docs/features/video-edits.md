---
status: current
authority: plan
---

# video-edits — change a made video with free edits, instead of paying to make a new one

Status: planned
Gates: product pending · architecture pending · program-design pending · slices pending

> **Created 2026-09-14 at the owner's request**, the first feature planned in this repository rather than in
> the steering repository (S-017). **Order, chosen by the owner:** its gates are written **next after
> `reel-plan`'s gates are approved**.
>
> **Order changed by the owner on 2026-09-15:** `reel-stills`' gates are written first, and this feature's after
> them. `reel-plan` was built and verified before either.
>
> **Its gates are not written.** This file records what the feature is, what is already decided that it
> builds on, and what must be settled before its gates can be written.

## What it is, in plain words

Changes to a video that already exists — **cut, trim, remove, split, join, move, reorder, change speed, redo
captions, lower music under the voice, swap in a different take already made** — each costing **$0**, instead
of paying to generate a new clip with the change in it. A reorder costs nothing; a new clip costs about $0.32
(D-058).

## What is already decided that it builds on

- **D-058** — after a reel is assembled, Gates 7 and 8 repair only with a **closed set of free edits**:
  `reorder`, `retime`, `recaption`, `reselect-take`. No provider call may follow a reel's first assembly
  (I-18). This is the first place the engine needs edits, and it is `reel-render`'s.
- **D-057** — picture longer than its narration is trimmed at the tail, as the ordinary case.
- **D-025** — when a shot's takes run out, the approved keyframe is held as a still.
- **D-036** — shots join by `cut` by default; a chain starts from the previous clip's last frame, with no
  image call.
- **D-054, D-055, D-059** — one ffmpeg pass, every input conformed to one profile, and the render manifest as
  the assembler's only input. An edit changes what that pass is given, then the pass runs again.
- **I-12** — never cut a shot to fix a failure. **I-17** — an output is measured with ffprobe, never assumed.

**The design source is a proposal, not a decision:** `steering-ref/docs/founding/video-harness/02-THE-CUT.md`,
`status: proposed`, §3's op set (`clip.insert`, `clip.remove`, `clip.trim`, `clip.split`, `clip.move`,
`clip.retime`, transitions, captions, audio, `shot.selectTake`, …). D-093 records that the Cutroom SDK sketch
contradicts ratified decisions in places, so nothing in it is taken as given.

## What must be settled before its gates can be written

1. **How far edits replace generation.** Before assembly, D-024's take ladder pays for a new take when a clip
   fails. Fixing a failed clip with an edit instead — a trim, a retime, a hold — would be a new decision here.
2. **One document or two.** Whether the Cut of `02-THE-CUT.md` and D-059's render manifest are the same thing,
   or the Cut produces the manifest.
3. **"Remove" against I-12.** A shot removed by someone's choice is not a shot cut to fix a failure; the line
   between the two needs writing down.
4. **Who calls it first, and who else.** `reel-render`'s Gates 7 and 8 are the first caller (D-058). An editing
   agent, the SDK or a CLI are the proposal's Phase 2 surfaces; whether any of them is in scope now is the
   owner's (D-060 scoped work to the engine, its pipeline and its SDK).
5. **What video it works on before `reel-render` exists** — local MP4 files a test makes — and where ffmpeg
   comes from, since nothing here installs it yet.

## Evidence (newest first; appended by the journey, never typed by hand)

## Divergence (the first broken boundary, or "none")

none

## Pending human decisions

Gates unwritten, so none yet. The five items above are where a session writing them starts.
