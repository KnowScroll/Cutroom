---
status: draft — analysis; the per-reel figures it rests on are now ratified (D-027…D-030)
authority: none until ratified
date: 2026-09-11
project: KnowScroll reel creation engine
scope: Design only. No implementation and no paid generation authorized by this document.
---

# Multi-reel pipeline

`VideoGenerationFlow.md` describes how **one** reel is made. This describes how **many** are,
and why that changes what the hard problem is.

---

## 1. The problem

> A viewer must never wait for a reel. But a reel takes **19–41 seconds** to make, and a single
> provider round-trip has a floor near **7 seconds** no matter what we do. So "under 5 seconds"
> is not reachable by making generation faster.
>
> Reels in the vertical feed are **independent** — nothing carries from reel N to reel N+1. So
> they need not be made one at a time, nor at the moment they are asked for. Make N of them at
> once, ahead of the viewer, and serve from a queue that is already full.
>
> Per-reel latency then stops being a user-facing number. It becomes a **throughput** number:
> does the queue refill faster than the viewer drains it.

The floor is not an efficiency problem. The one real measurement in the repo — a 5-second clip
on h3-turbo, 2026-09-03 — took **7 s wall, 2.5 s inference**. Only 2.5 s was the model. The
other ~4.5 s was upload, queue admission and CDN fetch. Drive inference to zero and a round
trip still costs about five seconds.

So the answer is not a faster reel. It is a reel that already exists.

---

## 2. The mechanism

Vertical reels share no state: no anchors, no continuity, no references carried forward. The
work is embarrassingly parallel.

```
SEQUENTIAL                          BATCHED
reel 1 ──► reel 2 ──► reel 3        reel 1 ─┐
  41s       41s        41s          reel 2 ─┼─► all in flight together
                                    reel 3 ─┘        ~41s for all
viewer waits 41s each               viewer waits 0
```

Generate a batch, gate it, keep the ones that passed, serve from the queue. The viewer draws
from a full shelf and never observes generation at all.

**One consequence worth stating early:** this makes Config A (`contentions.md` §4) more clearly
correct, not less. If batching absorbs latency completely, the pipeline should be tuned purely
for cost and quality — and the 22 seconds Config A costs over the bare baseline becomes free.

---

## 3. Two different problems wearing one name

Batching covers one kind of movement and not the other.

| | **Vertical** — next reel in the feed | **Horizontal** — a branch off the current reel |
|---|---|---|
| relationship | independent of the previous reel | **derived** from the reel being watched |
| can it be made ahead? | yes, blindly | only speculatively, against a guess |
| what bounds it | money | latency |
| where the 5 s pressure lives | nowhere — the queue absorbs it | **here** |

**Vertical is a supply problem.** How much ready content exists, and who paid for it.

**Horizontal is a latency problem.** You cannot prefetch a branch without knowing which reel the
person is on and which way they will go. Prefetch three branches per reel and you pay for three
to serve one.

`04-FAST` §2 reached the same split independently: vertical swipes land on existing supply,
generation is for horizontal branches and the frontier.

The rest of this document analyses the two constraints separately (§4 money, §5 throughput),
then puts them together (§6).

---

## 4. Analysis one — money

### 4.1 Generate X, show Y

Gates decide what is shown. A reel that fails is not served. So the real cost of a *shown* reel
is:

```
cost per shown reel  =  (X / Y) x cost per generated reel
```

For the seed library at Config A's average of **$2.52**.

> **Note added 2026-09-11.** Config A is now binding for Phase 1 (**D-027**) and its four-call
> shape is unchanged, so $2.52 still holds — but it assumes images at **$0.15**, which is
> `nano-banana-pro`, the **dearest** of the four entries **D-028** admits. The verified rates in
> `BUDGET.md` put the same reel at **$2.24** on `nano-banana-2` ($0.08) and **$2.06** on
> `seedream/v5/lite` ($0.035). Budgeting on the dearest is deliberate — `BUDGET.md`'s rule is that
> where figures disagree the higher one is used — and the default is not chosen yet (O-4). Every
> row below is therefore a **ceiling**, and the 80% row's "barely" has more room than it shows.
>
> **Note added 2026-09-12, when L5 was specified (D-054…D-059).** Assembly adds **two costs and
> neither moves a row**: narration at roughly **$0.01** per reel — T2A bills per character, so
> D-057's one call per shot costs what one call for the whole script costs — and the ffmpeg pass at
> **$0**, because it is local. The $2.52 average absorbs both inside its own rounding. **No row here
> was chosen by assembly, and no assembly choice was made on cost.**
>
> **Note added 2026-09-12, when the plan layer forked (D-061…D-065).** Two storyboards per reel, a deterministic Gate 0 and a plan score add **~$0** — the token plan covers M3 and Gate 0 makes no model call — and **I-20** keeps it that way by letting only the winner generate. What it changes is not the cost of a reel but **where a bad one dies**: a badly shaped reel used to survive to Gate 7, after ~$2.20. It now dies at $0. If M-1 ever shows the plan layer rejecting a meaningful share of storyboards, **the X/Y ratio in this table improves without any row moving**, because the reels that fail stop consuming image and video calls at all.
>
> **And a scope correction the same day (D-076).** Every figure in this section is **generation only**. Research spend is a separate envelope with its own ceilings, so "$2.52 per reel" is no longer a reel's whole cost — it is the half this table models. The $40 seed total and $10/day still bind both envelopes together, so the *fits $40?* column stays honest only once M-9 puts a number on the other half.

| Gate pass rate | Reels to generate for 12 good | Cost | Fits $40? |
|---|---|---|---|
| 100% | 12 | $30.24 | yes |
| 90% | 14 | $35.28 | yes |
| 80% | 15 | $37.80 | **barely** |
| 70% | 18 | $45.36 | **no** |
| 60% | 20 | $50.40 | no |

**Nobody has measured the pass rate. Not once.** It is the difference between the seed library
fitting D-014 and breaching it, and it is the single most load-bearing unmeasured number in the
whole design.

Two things soften it, neither quantified:

- **The design fails cheap, and D-047 put a floor under how cheap.** The keyframe gate kills a bad
  shot at **one image call** — $0.15 to $0.035 depending on the configured entry (D-028) — before
  the $0.32 clip. The **worst** early death is now specified: a canonical that fails best-of-2 and
  then fails its one informed repair call ends the reel at **three image calls and zero video** —
  about **$0.45** at the dearest admitted model, against $2.52 for a completed one. D-042's added
  reconcile step is what makes that kill reachable at all; without it a keyframe of the wrong
  subject passed Gate 1 and died at the clip.
- **A failed reel is not always a wasted reel.** Shots that passed are gated assets; a repair
  path may reuse them rather than regenerate the whole thing.

### 4.2 The number that decides everything

`BUDGET.md` caps spend at **$10.00 per day**, enforced pre-flight.

```
$10.00 per day  /  $2.52 per reel  =  ~4 reels per day
```

**Four new reels per day. Across all five users combined.** On the cheapest admitted image entry
it is five, not four (D-028) — which changes nothing that follows: the gap being measured here is
three orders of magnitude, and a 25% move does not touch it.

Now compare that against demand. Five people watching 40-second reels continuously would
consume:

```
5 reels per 40 s  =  450 reels per hour  =  $1,134 per hour
```

That is not a tuning problem. It is three orders of magnitude.

**Conclusion: the feed cannot be generation-driven at any batch size.** No amount of
parallelism changes it, because parallelism was never the constraint. The feed has to be
mostly a **library** — the twelve seeds, the cache, branches already taken and kept — with
generation as the exception at the frontier.

This is what D-015 and `04-FAST` already assert. The arithmetic here is why.

### 4.3 Horizontal speculation is worse

Branches cannot be batched blindly, so they are speculated: generate several, serve the one
taken, discard the rest.

```
3 branches per reel x $2.20  =  $6.60 per swipe
```

Against a $10 daily cap, that is roughly **one and a half swipes per day**.

So speculative branch generation is only viable if the speculation is very narrow (one
candidate, high confidence) or if the discarded branches are **kept as supply** rather than
thrown away — an accepted-but-unwatched branch is a cache entry, not a loss. That is exactly
what `04-FAST`'s speculation pool is for.

---

## 5. Analysis two — throughput

### 5.1 Refill versus drain

The queue holds if reels arrive at least as fast as they are consumed.

```
refill  =  B reels per T_gen          B = batch size, T_gen ~41 s
drain   =  U reels per T_watch        U = concurrent viewers, T_watch ~40 s

queue holds when   B / T_gen  >=  U / T_watch
```

Solving for B at T_gen ≈ T_watch:

| Concurrent viewers | Batch size needed | Concurrent video jobs (× 5 shots) |
|---|---|---|
| 1 | 2 | 10 |
| 3 | 4 | 20 |
| **5 — the whole user base** | **6** | **30** |

**A batch of six covers every user watching simultaneously.** For a single viewer, a batch of
two is comfortable and even sequential generation nearly keeps up.

This is the finding that matters: **throughput is trivially solvable.** The numbers are small.
Nothing here is hard.

### 5.2 The one real unknown

A batch of six reels is **30 concurrent video jobs** submitted to fal at once.

We have **no concurrency data, no rate-limit data, and no queue-depth data.** If fal serializes
past some N, a batch of six does not take 41 s — it takes some multiple of it, and the model in
§5.1 is wrong.

Cheap to answer: submit N jobs, measure wall-clock against N. One test, one small spend.
Recorded as a trap in `contentions.md` T-6's neighbourhood; it belongs on the Phase 0 list.

### 5.3 Batch sizing beyond the minimum

Larger batches are not obviously better:

- **Larger** amortises the plan stage, smooths provider variance, and gives the gate pass rate
  more samples to average over.
- **Smaller** loses less when a batch is cancelled, responds faster to a change in what the
  viewer wants, and keeps less capital tied up in unwatched reels.

Given §4.2, the practical batch size is set by the **daily spend cap**, not by the refill
arithmetic. At four reels per day the whole question is close to moot.

---

## 6. The two together

| | Money | Throughput |
|---|---|---|
| binding? | **yes, by ~1000×** | no |
| what it permits | ~4 new reels/day, all users | ~6 reels per 41 s |
| unknown that moves it | gate pass rate | fal concurrency |
| cost to find out | one seed run | one test, small spend |

The two analyses do not meet in the middle. Throughput clears the requirement with room to
spare; money misses it by three orders of magnitude. Any design effort spent on parallelism,
scheduling or batch sizing is effort spent on the constraint that was never binding.

**What that implies, stated as a choice rather than a decision:**

1. **The feed is a library, not a generator.** Most swipes serve existing content. Generation
   happens at the frontier, rarely, and every generated artifact is kept because it is
   expensive.
2. **The unit of scarcity is the reel, not the second.** Design pressure belongs on raising the
   gate pass rate and on reuse, not on making generation faster.
3. **Discarded work must be recoverable.** An accepted-but-unwatched branch is supply. A reel
   that failed on one shot is four good shots. Throwing either away is the expensive mistake.
4. **Horizontal stays a latency problem** and does not benefit from any of this. It is the only
   place the original 5–10 s target still applies, and it is bounded by how narrow the
   speculation can be made.

None of the four is decided here.

---

## 7. Open

| # | Question | Cost to answer |
|---|---|---|
| M-1 | **Gate pass rate.** Decides whether twelve seeds fit $40. Completely unmeasured. | one seed run |
| M-2 | **fal concurrency and rate limits.** Decides whether §5.1's model holds at all. | one test |
| M-3 | **Does the $10/day cap survive Phase 2?** It was written for the seed library. Four reels/day may be the wrong shape for a live feed. | owner |
| M-4 | **Is a failed reel salvageable** — do passing shots survive into a repair, or is the reel discarded whole? Changes the effective X/Y ratio materially. | design |
| M-5 | **Are unwatched speculative branches kept as supply?** If yes, speculation is much cheaper than §4.3 suggests. | design |
| M-6 | **Batch size**, once M-2 and M-3 are known. Currently moot at four reels/day. | derived |
| **M-7** | **What H3 actually returns** — output pixel dimensions and frame rate. `fps` exists on no fal H3 endpoint (verified by schema absence) and neither value is documented anywhere. **D-055** conforms every input from ffprobe and pins the output profile in config rather than guessing, so nothing is blocked; the literal values are simply unknown. | **one ffprobe of one clip — $0**, and one already-paid clip answers it |
| **M-8** | **What `prompt_expansion_mode` accepts.** Required on every fal H3 call; the provider rewrites the prompt server-side. Only `balanced` appears in the repo's research, so D-072's "least-rewriting value" names a setting nobody can select yet. A batch generated under mixed expansion behaviour would make M-1's pass rate measured across inconsistent conditions. | **one schema read, $0** |
| **M-9** | **Exa's rate**, and how many searches and fetches a reel actually takes. D-076 gives research its own per-reel and per-day ceilings and **the shape is decided while the value is not**. SERPdive is documented — 1,000 free credits a month, `moby` 1.5 each (D-010) — and Exa's price is recorded nowhere in this repo. | **one pricing read**, then one real research run |

---

## 8. Relationship to the other documents

- `VideoGenerationFlow.md` — how one reel is made. Everything here treats that as a black box
  costing $2.52 and taking 41 s.
- `contentions.md` — invariants, open forks, traps, and the full per-reel cost and latency
  model this document's figures come from.
- `../video-harness/04-FAST.md` — tiers, lanes, prefetch depth and the speculation pool. The
  vertical/horizontal split in §3 is that document's conclusion, reached again here from the
  cost side.
