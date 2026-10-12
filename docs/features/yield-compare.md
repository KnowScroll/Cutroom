---
status: current
authority: plan
---

# yield-compare — two sides of runs, compared under a rule fixed before any number is read

Status: planned
Decisions: D-027, D-047, D-050, S-035, S-046, S-070, S-072, S-115, S-149, S-150, S-153, S-155, S-158, S-161, S-162, S-163, S-164, S-182, S-184
Gates: product pending · architecture pending · program-design pending · slices pending

> **Created 2026-10-12 at the owner's request**, in session 83, by S-184: the benchmark is three features, and this
> is the second. The owner refused to defer it — _"No we need job 2 as well, this is also the most important or else
> how would we know whether the new engine or new thing in the engine worked, so no we need job 2 as well, even if
> it takes more time and brainstorming and decision making to close"_ — so it is the next feature after the scoring
> half, not a later maybe.
>
> **Its gates are not written.** This file records what it owns, what three adversarial rounds already settled or
> left open, and what the gates must decide. No implementation file until all four are approved.

## What it owns

Everything about putting two sets of runs beside each other, which `yield-benchmark` deliberately does not do:

- **A side**: a label and an explicit list of runs, grouped by the **brief key** the scoring half already computes
  (the request with its id and options removed).
- **Per-unit rates, never totals**, so a four-shot run and a six-shot run compare at all.
- **The eight deciding measures**: reels made, the shares of pictures, takes and finished cuts refused, shots
  degraded per run, shots held at the take cap per run, cost per run, wall clock per run.
- **Two uncertainty bands** — a binomial one from the counts for a share, and one from the two sides' sample
  variances for a per-run average, which needs at least two runs a side.
- **Four verdict words: helped, hurt, inside the noise, no verdict**, one per measure, each naming the condition
  that decided it.
- **The credit guard**: credit is withheld when the work got smaller, on quantities a real fix cannot lower.
- **Comparability and the fingerprint**, and the two modes below.
- **Stratify**: group a side's runs by a recorded property — shots in the selected plan, planned image calls,
  subjects per shot, picture role, image-to-video share — and report each stratum with its band. This is how
  session 82 found the engine's largest defect (42% / 70% / 100% refused by subjects per shot) and it needs no
  matched pairs at all, so it is the one view that answers _which config is good_ over the runs already made.

## The two modes, which are one mechanism

| mode                | what differs between the sides                                                                                                | what refuses a verdict                 |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| a change under test | nothing recorded; the change is declared                                                                                      | any recorded difference                |
| a config comparison | the fields the caller **declares** as the axis — planned shots, planned image calls, the picture rule, the model, the ceiling | a difference that was **not** declared |

The owner asked for the second: _"i would want to compare the reels if they have different number of planned shots,
or less number of shots or anything, we would want to know which config is good no?"_ So the refusal is not "anything
differs" but "something differs that nobody accounted for", and the first mode is the second with an empty declared
set. **In config mode, cost per run and wall clock per run are reported and not judged** unless the caller declares
them the measure of interest: a richer config is supposed to cost more, and judging it as a regression would fail
every better configuration.

## What is already settled, and binds these gates

From S-182, unchanged by the split: the brief key's construction; two runs a side in a group and three shared groups
at the least; the same direction in two thirds of the surviving groups; a zero delta counts as not moved; a group
where the measure is undefined on one side is dropped; the fingerprint's fields; and that **the engine's code
version and the picture rule are reported "not recorded"** on every comparison until `run-provenance` records them.

Measured in session 83, read-only: **5 of the 25 brief groups hold two or more runs whose fingerprints match**, the
largest matching set being five runs in group `4ce40e14`. A verdict needs four matching runs in each of three
groups, and only one group reaches four — **so no verdict is available from the 52 runs already made**, and the
first ones come from runs made after the scoring half exists.

## What the gates must settle, each a real choice

- **The band's wording, in one place.** S-182 says a measure moves "beyond twice its own band" while the band is
  defined as `2 × SE`, which reads as `4 × SE`; and one draft said "pooled" where the formula was the unpooled Wald
  form. One wording, and the check must quote the formula it checks.
- **The arithmetic's scope**: whether a delta and its band are pooled over the whole side or averaged over the
  surviving groups; whether a group dropped for one measure leaves that measure's pooled counts; whether a group
  with fewer than two runs a side is dropped. Pooling across groups of 8/5/4/4/4 runs can reverse the sign the
  per-group test sees.
- **The credit guard's quantities.** Three were chosen — shots the plan asked a picture for, accepted pictures per
  shot, shots degraded — and a reviewer showed they miss a change that plans **fewer or shorter shots**, which
  lowers cost and wall clock and raises reels made. The plan's shot count and its total planned seconds go into the
  guard or into the fingerprint, and the gates say which.
- **Which comparability conditions are not vacuous.** Style id and version, `depictionPolicyVersion` and the
  contract version all sit inside the brief key by construction and can never refuse anything; the "measures
  version" cannot differ inside one invocation; and "standalone pictures exist" reveals the picture rule in one
  direction only. The request's **ceiling** and `options.planVaryOn` are in no condition at all and decide,
  respectively, when a run stops and what the two fork plans differ on.
- **The verdict's unit.** Eight measures can disagree; whether an overall verdict is printed, and how it composes.
- **What a malformed side is**: overlapping sides, a run named twice, a run id absent from the record.
- **The null comparison as a check**: the five same-fingerprint runs of `4ce40e14`, split two against two, where
  nothing differs — every measure must come back inside the noise, and if one ever claims a winner the arithmetic
  is wrong.

## What it must not do

Change any engine behaviour; weaken a check; write to the engine's record; spend. It reads the same rows the scoring
half reads, through the same pure package, and it may not reach a provider or a key.
