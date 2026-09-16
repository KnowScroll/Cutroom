---
status: current
authority: plan
---

# reel-takes — a clip that fails its checks is tried again, and at the cap its shot is held, labelled or failed

Status: planned
Gates: product pending · architecture pending · program-design pending · slices pending

> **Created 2026-09-16 by S-066**, at the owner's choice, when `reel-render` was cut in two while its gates were
> written. `reel-render` makes a gated video with **one take a shot**: a take that fails a gate stops the reel. This
> feature deepens that without changing what the finished video is.
>
> **Its gates are not written.** This file records what the feature holds and what it must settle, so the boundary is
> kept and a session writing its gates starts from here. It is written after `reel-render` is verified.

## What it holds

- **D-024's three paid takes a shot**, counted in takes, with informed retries: a retry's prompt consumes the failed
  take's verdict (D-033's rider, and its `Confirmed-by` that take 2's prompt differs from take 1's).
- **I-11's counter for provider transient errors**, separate from the take counter, with `maxAttempts` and backoff.
- **D-025 at the take cap**, by failure class: `accept_with_label` for a soft failure, never over a failed `mustShow`
  (I-5); **holding the gated keyframe as a still** for the shot's span, with a slow push, rendered in `reel-render`'s one
  pass; failing the reel otherwise — each labelled on the shot, in the verdict and in the receipt, and queryable.
- **The takes in the contract's record** — `reel-contract`'s _Pending_ item 1, which `reel-render` left here.

## What it must settle before its gates can be written

1. **Which of `reel-render`'s checks it changes.** Checks 21 to 26 and 38 assert that a failing take, or a failing Gate
   7, stops the reel (S-066). Three takes turn the first into a retry; its gates say which assertion becomes what, in
   S-047's form, and remove none.
2. **What "soft", "motion broken" and "never passed" are**, as outcomes of Gates 2 to 5 — no decision maps a gate's
   failure to D-025's classes.
3. **A still-hold for a shot with no gated keyframe** — a `text-to-video` shot (D-050 step 2) has no picture to hold.
4. **D-024's _"two failures on one strategy trigger at most one alternative"_** — what a strategy is.
5. **A restart's takes against the cap** — S-076 counts one take a shot per attempt; with three, whether a restarted
   attempt's takes count against the shot's cap is S-048's question again.
6. **The takes in the record** — whether adding them amends contract version 1, as S-034 did for a criterion's type.

## Evidence (newest first; appended by the journey, never typed by hand)

## Divergence (the first broken boundary, or "none")

none

## Pending human decisions

Gates unwritten, so none yet. The six items above are where a session writing them starts.
