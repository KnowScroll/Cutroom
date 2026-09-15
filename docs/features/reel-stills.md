---
status: current
authority: plan
---

> **Moved here on 2026-09-15** from the KnowScroll repository's `steering/features/reel-stills.md`, **before its
> gates were written**, under **S-033**; the last steering commit holding it is `e05e9f0`. Where this file says "this
> repository" about git history or the reviews file, it means the steering repository, readable at `steering-ref/`.
> Decisions it needs from now on are written here (**D-115**, **S-017**), and its gates are written and reviewed here.

# reel-stills — a chosen plan becomes approved still pictures, for $0

Status: planned
Gates: product pending · architecture pending · program-design pending · slices pending

> **Created 2026-09-14 by D-108**, which replaced `reel-engine` with `reel-plan` and this feature. It starts
> where `reel-plan` ends — a chosen plan — and ends with approved still pictures. `reel-render` starts there.
>
> **Its gates are not written.** They belong to their own session (ritual 2), after `reel-plan` is approved
> and built. `reel-plan` was verified by its journey on 2026-09-15.
>
> **Where to start.** `reel-engine`'s last plan (git, `7e50f79`, `steering/features/reel-engine.md`) holds a
> full draft of this half — Gate 1's picture paragraphs, Slice 8, checks 2, 20–22, 25, 29–31, 47–50 — and
> its four reviews (`docs/founding/reel-creation-engine/reel-engine-reviews.md`) hold every finding against
> that draft. **Rewrite by removing promises, as `reel-plan` was; do not copy the draft back.**

## What is in it

- **Keyframes** — Config A: one canonical subject best-of-2, derived keyframes, the other shots
  `text-to-video` with no keyframe (D-027, D-029, D-030). **No declared state change and no fifth planned call**
  (D-037, D-048) — deferred by S-032.
- **Gate 1**, four steps on each still, with a blind witness (D-041, D-042, D-044, D-045, D-046, I-8, I-15),
  and **Gate 1S**, set consistency (D-049).
- **The picture repair ladders** — the canonical's one informed repair, then the reel fails (D-047); a derived
  picture's one repair when a slot is free, never failing the reel (D-050 steps 1 and 3).
- **Admission against the caller's ceiling**, and the next job row only if admitted (D-083, D-100);
  `SUM(cost_cents)` over a `correlation_id` (D-081).
- **The stand-in's picture files** under the configured path (D-086, D-087).
- **The image prompt compiler and the refusing validator** (D-069, D-071, I-19), and the image-model registry
  (D-026, D-028).
- **`until: 'stills'`** answered by the service `reel-plan` builds.

## What it needs before its gates can be written

Every item in `reel-plan`'s _Deferred — to `reel-stills`_ list, in `docs/features/reel-plan.md`, and in particular:

1. **`reel-plan` approved and built.** This feature's input is its output. **Done**: verified by its journey on
   2026-09-15.
2. **Criterion types.** D-043 types every criterion `presence` or `event` and says an untyped criterion fails
   validation; the approved contract's `Criterion` has no type. **Answered by S-029**: the contract gains a required
   `type`, and `mustNotShow` accepts only `presence`. Open for Gate 2: whether that amends contract version 1 or is
   version 2 (D-106), and `reel-script` emitting it on the KnowScroll side.
3. **Which figure a `stills` run is admitted against**, and **whether Gate 1's four steps stop at the first failure**.
   **Answered by S-030** — the pictures' share of the estimate; open for Gate 2: whether the reserve counts — and
   **S-031** — only a failed technical step stops a picture.
4. **Review 4's findings about pictures** — for Gate 2 to resolve, not owner questions: _"one approved picture per
   shot"_ against D-027; D-048's plan of 5 (moot while S-032 holds, but check 25's limit of 4 must stay); Gate 1's
   pixel sensors with no port under `pipeline-no-io`; the witness sighted through `structured` with images; `observe`
   receipts with no role.

## Evidence (newest first; appended by the journey, never typed by hand)

## Divergence (the first broken boundary, or "none")

none

## Pending human decisions

Gates unwritten. The owner's answers of 2026-09-15 are S-029 to S-033.

### Deferred — chosen, not assigned

1. **A declared within-shot state change** — D-037's end-frame pin, D-048's fifth planned call and its reserve remainder.
   No feature is assigned (S-032).
