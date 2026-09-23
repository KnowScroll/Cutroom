---
status: current
authority: plan
---

# resume-failed — a failed run is made again from where it failed, keeping every piece that was fine

Status: planned
Gates: product pending · architecture pending · program-design pending · slices pending

> **Created 2026-09-24 at the owner's request**, in session 48, after run `ee63e617…` failed. It had a plan
> accepted by Gate 0 and three pictures accepted by Gate 1, then failed 6 s into the video stage, before any clip was
> bought: MiniMax's word timings for shot 0's narration repeated a word ("Sun. Sun."), and the stage's parse refused
> them (S-070). A second run of the same brief — a new request — planned again, drew again and paid again for the
> pictures that had nothing to do with the failure. The owner: _"keep the assets saved from a run, if it fails find out
> what failed and re run for that and use the ones that were fine for that run."_
>
> **Its gates are not written.** This file records what the feature is, what is already decided that it builds on,
> and what must be settled before its gates can be written. No implementation file until all four are approved by an
> adversarial reviewer.

## What the owner asked for, in plain words

When a run fails partway, its finished work is not thrown away. The engine finds what failed, makes only that again,
and uses everything that was fine — the plan, the checked pictures, the finished narrations, the accepted clips — to
finish the SAME run. Nothing that already passed its checks is paid for twice.

## What is already decided that it builds on

- **A clips job run again after a crash keeps** every finished narration and every decided take, and picks up at the
  first shot not finished (**S-092**). A take a crash cut off inside its gates is made again, never resumed. This
  feature asks for the same rule after a _failure_, not only after a crash.
- **A keyframes job run again after a crash starts over and pays again** (**S-048**, the owner, 2026-09-16), because a
  picture whose checks were cut off would need a second look (D-045). **This feature asks for the opposite for a picture
  whose checks FINISHED and accepted it** — so its gates must say whether S-048 is superseded, and for which pictures.
- A plan is bound to its request, and the planner is not deterministic at temperature 0 (session 47). **Pieces are
  reusable only by the same run, under the same request** — a changed brief is a new request, a new plan and new
  pictures. Resuming a run and fixing its brief are two different things.
- Every paid call already has its receipt, and a run's cost counts every attempt's calls (D-084, S-036); the per-reel
  cap and the 250¢ ceiling bound what a resumed run spends in all, not per attempt (D-014, D-100).
- `failed` is a terminal status in the caller's contract (D-094). Resuming a failed run changes what `failed` means to a
  caller, or needs a new status or a new call.

## What must be settled before the gates (the owner's to choose)

1. **Who starts a resume** — the caller, by a new call on a failed run (`POST /v1/runs/<id>/resume`), or the engine by
   itself, once, for a failure it judges passing (a provider's malformed answer, a network fault)?
2. **Which failures may be resumed.** A provider answering badly (this case) is worth asking again. A gate refusing on
   the brief's own terms (S-151's Gate 5, S-145's Gate 7) would fail the same way — should those be resumable at all?
3. **Pictures accepted by Gate 1 are kept** — superseding S-048 for those only — or not?
4. **How many resumes a run gets**, and whether the ceiling is shared across them (it is today, across attempts).
5. **What the caller sees**: the same run id going from `failed` to `running`, or a new run that points back to the
   failed one and inherits its pieces.

## Measured cost of not having it

Run `ee63e617…`: 15¢ of pictures and about 3.6 minutes redone by the next run; with a bad answer on a later shot, every
accepted clip before it too (about 1.5–2 minutes a clip). Run `879a27b7…` (the next one) stopped at Gate 2 on shot 2 with shots 0 and 1 finished — two pictures and two
accepted clips, 22¢ and about 4 minutes, that a rerun makes again. Small in cents at today's rates (S-155), larger in time.

## Deferred

Nothing yet.
