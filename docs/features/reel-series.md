---
status: current
authority: plan
---

# reel-series — one topic brief becomes an ordered series of distinct reels

Status: planned
Gates: product pending · architecture pending · program-design pending · slices pending

> **Created 2026-09-30 in this repository at the owner's request** (S-181). This is a future feature, not part of SDK v1 and
> not an implementation instruction. **Its gates are not written.** No implementation file may be added until all
> four gates are approved by an adversarial reviewer.

## Feature summary

A caller supplies one topic-level brief and a positive integer `n`. Cutroom first designs an ordered editorial
series containing exactly `n` distinct reel briefs, then makes the reels one at a time in that order. Each reel must
stand alone while advancing the series as a whole. This is a series-planning and orchestration feature, not repeated
generation of the same reel and not a tool for cutting one long reel into pieces.

For example, a request about CPUs with `n = 3` could plan:

1. how the CPU emerged and what problem it solved;
2. the architectural and manufacturing advances that changed it;
3. how modern CPUs work and where they are heading.

Those angles are illustrative, not a fixed CPU template. The planner must derive the arc from the supplied topic.

## Goals

- Turn one topic-level brief into exactly `n` ordered, individually coherent reel briefs.
- Plan the complete arc before the first reel begins, so overlap, gaps and progression can be judged together.
- Make each planned reel through the existing single-reel workflow, serially and in the approved order.
- Preserve a stable series identity, item order and per-reel identity so a caller can present the result as a
  playlist and understand partial progress.
- Make count limits, estimated spend and terminal outcomes explicit before paid work begins.

## Non-goals

- Producing `n` visual or narrative variants of one reel brief.
- Splitting one long narration or rendered video into `n` fragments.
- Generating loosely related reels independently without first planning their relationship and order.
- Increasing throughput through parallel reel generation. `docs/design/multi-reel-pipeline.md` studies supply and
  batching; it does not define this editorial-series feature.
- Replacing the existing single-reel pipeline or changing the SDK contract before this feature's gates approve such
  a change.
- Providing a playlist user interface or publishing the reels to a social platform.

## Primary user flow

1. The caller submits a topic-level brief and `n`.
2. Cutroom validates the request and rejects a non-integer, non-positive or out-of-policy count before paid work.
3. A series planner returns exactly `n` ordered entries. Each entry carries its own reel brief, title or working
   label, angle, purpose in the arc and relationship to its neighbors.
4. Cutroom validates that the entries are complete, distinct and ordered; the product gate decides whether the
   caller must approve or may revise the plan.
5. Cutroom submits item 1 to the ordinary single-reel workflow. No later item starts while that item is active.
6. When the applicable success condition is met, Cutroom proceeds to the next item and repeats until the series
   reaches a terminal state.
7. The caller receives the ordered series plan, each item's current state and result, and an overall terminal state.

## Functional requirements to settle in the gates

1. **Topic input.** Define what the high-level brief contains and how the planner turns it into the structured input
   the current single-reel workflow requires. A topic brief is not silently treated as today's `SubmitRequest`.
2. **Exact cardinality.** A valid plan contains exactly `n` entries. Define the minimum, maximum and any budget-based
   bound on `n`.
3. **Editorial distinctness.** Define testable evidence that entries have different purposes and are not paraphrases,
   variants or consecutive chunks of one script.
4. **Arc quality.** Define how the order demonstrates progression and how gaps, repetitions and prerequisite errors
   are found before rendering begins.
5. **Approval.** Decide whether planning is returned for explicit approval, automatically accepted, or controlled by
   a request option, and what revision preserves idempotency.
6. **Serial execution.** At most one item in a series is active. Decide the exact success boundary that permits the
   next item to begin.
7. **Failure policy.** Decide whether the first failed item stops the series, whether a caller may skip it, and how a
   stopped series resumes without duplicating completed reels.
8. **Budget.** Show an estimate or ceiling for the complete series before paid work, then attribute actual cost to
   both the series and each reel.
9. **Persistence and results.** Define series, ordered-item and attempt records; terminal states; cancellation;
   partial results; and stable ordering after restart.
10. **Contract ownership.** Decide whether this is a new engine and SDK operation or an orchestrator that composes
    the existing per-reel API. No endpoint or exported type is approved by this stub.

## Proposed state model — not approved

The gates should evaluate at least `planning`, `awaiting_approval`, `running`, `completed`, `failed`, `stopped` and
`cancelled` for the series, with each item retaining the ordinary single-reel state. They must specify which states
are externally visible, which transitions are recoverable and how a terminal item affects the next queued item.

## Edge cases the gates must cover

- `n` is zero, negative, fractional, missing or above the supported limit.
- The planner returns fewer or more than `n` entries.
- Two entries express the same angle with different wording.
- An entry depends on information that a prior reel never established.
- The plan is valid but the caller rejects or revises one entry.
- A process restart happens during planning or between two reels.
- A reel fails, stops, is cancelled or completes in a degraded state.
- A retry repeats an idempotency key or attempts to duplicate a completed reel.
- The caller cancels after some, but not all, reels are complete.
- Estimated series spend exceeds the caller's ceiling before the first paid action.

## Success criteria for the future journey

- A CPU request with `n = 3` yields exactly three ordered, semantically distinct and individually complete reel
  briefs forming a coherent arc.
- The existing single-reel workflow is invoked once per accepted entry, in plan order, with no overlap.
- The result preserves the planned order and identifies every reel and its outcome, including partial completion.
- Invalid counts, duplicate entries, fragmented entries and prohibited transitions fail before they can masquerade
  as a successful series.
- Restart, cancellation, failure and resume behavior match the policies approved by the gates and do not duplicate
  paid work.

## Open questions for gate review

1. Must every reel be understandable without watching the earlier reels, or may later entries assume prior context?
2. Does the caller approve the whole plan, individual entries, or neither?
3. Should a failed reel stop the entire series by default?
4. May a later item use approved facts or outputs from an earlier completed reel, and if so through which record?
5. Who turns the topic brief into narration, claims and visual criteria needed by a normal reel request?
6. Is playlist metadata only an ordered engine result, or does Cutroom also own a manifest artifact?
7. Which verified features and contracts would this amend? Gate work must run `test-impact` before naming them.

## Evidence (newest first; appended by the journey, never typed by hand)

## Divergence (the first broken boundary, or "none")

none
