---
status: current
authority: plan
---

# yield-compare — two sides of runs, compared under a rule fixed before any number is read

Status: planned
Decisions: D-022, D-025, D-027, D-043, D-047, D-050, D-062, D-086, D-088, D-094, D-096, D-100, D-102, S-016, S-017, S-020, S-028, S-035, S-046, S-070, S-072, S-090, S-098, S-099, S-111, S-115, S-129, S-149, S-150, S-153, S-155, S-158, S-161, S-162, S-163, S-164, S-172, S-176, S-177, S-178, S-182, S-184, S-185, S-186, S-188, S-191, S-192, S-193, S-196, S-197, S-198, S-199
Gates: product pending · architecture pending · program-design pending · slices pending

> **Created 2026-10-12 at the owner's request**, in session 83, by S-184: the benchmark is three features, and this
> is the second. The owner refused to defer it — _"No we need job 2 as well, this is also the most important or else
> how would we know whether the new engine or new thing in the engine worked, so no we need job 2 as well, even if
> it takes more time and brainstorming and decision making to close"_ — so it is the next feature after the scoring
> half, not a later maybe.
>
> **The four gates were written on 2026-10-16, in session 91** (`PROMPTS/084-yield-compare-gates.md`), against the
> scoring half as BUILT rather than as planned, and **revised the same session against round 1's twenty-two
> findings** — every one of which is recorded at the end of this file with what was done about it. **What these
> gates settle beyond S-182 is written down as S-199**, which names what it supersedes.
>
> Writing them corrected three clauses this file had inherited, and each correction is named where it is made
> rather than quietly applied:
>
> 1. **The picture rule is READ, not "not recorded".** S-182 said the engine's code version and the picture rule
>    both read "not recorded" until `run-provenance` exists, and this file's "What is already settled" repeated it.
>    `yield-benchmark`'s Gate 2 already corrected it for the scoring half — `Plan.pictures`
>    (`packages/contracts/src/cinematic.ts:38`) carries the rule the plan was priced and admitted under, and
>    `scorecard().run.pictureRule` reads it (`packages/benchmark/src/measures.ts:1063`), an absent field meaning
>    `recurring` and never "not recorded". **Only the engine's code version reads "not recorded" here.** So the
>    picture rule is a comparability condition in its own right, and S-182's _"whether standalone pictures exist"_ —
>    which reveals the rule in one direction only — is dropped as redundant rather than kept as a weaker proxy.
> 2. **"Shots degraded per run" and "shots held at the take cap per run" are not per-unit rates**, and this
>    feature's own first rule is _"per-unit rates, never totals, so a four-shot run and a six-shot run compare at
>    all"_. A count per run is a total divided by runs, and it breaks exactly where the config mode is pointed —
>    two sides whose plans hold different numbers of shots. Both become **per-run rates over the shots that
>    attempted the thing**, in Gate 2's measure table.
> 3. **The limit on the runs already made is measured, not typed.** Session 83 measured 5 of 25 brief groups
>    holding two or more fingerprint-matching runs, the largest matching set being five runs in group `4ce40e14`,
>    under S-182's field set. **How many groups reach four matched runs was never measured**, and this feature's
>    comparability rule is looser in one direction (an absent observed field does not refuse, Gate 2), so the
>    matching sets can only grow. Gate 1 therefore states what is known and **the reader prints the count; no gate
>    pins it.**
>
> **Its gates were not written before this.** The sections above them record what the feature owns, what three
> adversarial rounds in session 83 settled or left open, and the nine choices the gates had to make. No
> implementation file until all four are approved (CLAUDE.md rule 1).

## What it owns

Everything about putting two sets of runs beside each other, which `yield-benchmark` deliberately does not do:

- **A side**: a label and an explicit list of runs, grouped by the **brief key** the scoring half already computes
  (the request with its id and options removed).
- **Per-unit rates, never totals**, so a four-shot run and a six-shot run compare at all.
- **The eight deciding measures**: reels made, the shares of pictures, takes and finished cuts refused, shots
  degraded, shots held at the take cap, cost per run, wall clock per run.
- **Two uncertainty bands** — one from the counts for a share over runs, and one from the two sides' sample
  variances for a per-run figure, which needs at least two runs a side.
- **Four verdict words: helped, hurt, inside the noise, no verdict**, one per measure, each naming the condition
  that decided it — and a fifth state, **reported, not judged**, for a measure the caller declined to judge.
- **The credit guard**: credit is withheld when the work got smaller, on quantities a real fix cannot lower.
- **Comparability and the fingerprint**, and the two modes below.
- **Stratify**: group runs or pictures by a recorded property — shots in the selected plan, planned image calls,
  subjects per shot, the picture rule, the image-to-video share — and report each stratum with its band. This is
  how session 82 found the engine's largest defect (42% / 70% / 100% refused by subjects per shot) and it needs no
  matched pairs at all, so it is the one view that answers _which config is good_ over the runs already made.

## The two modes, which are one mechanism

| mode                | what differs between the sides                                                                                     | what refuses a verdict                      |
| ------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------- |
| a change under test | nothing the comparison checks; the change is declared                                                              | a difference in any of Gate 2's conditions  |
| a config comparison | the names the caller **declares** as the axis — any comparability condition or any guard quantity, by its own name | a difference the caller did **not** declare |

The owner asked for the second: _"i would want to compare the reels if they have different number of planned shots,
or less number of shots or anything, we would want to know which config is good no?"_ So the refusal is not "anything
differs" but "something differs that nobody accounted for", and the first mode is the second with an empty declared
set. **In config mode, cost per run and wall clock per run are reported and not judged** unless the caller declares
them the measure of interest: a richer config is supposed to cost more, and judging it as a regression would fail
every better configuration.

**"Any recorded difference" is not what refuses.** Seven named conditions refuse (Gate 2, "Comparability, field by
field"). The record holds more that no condition reads — a take's `seed`, its `expansion_mode`, a receipt's
`resolution`, a model's `temperature` — and a change that moves only those is invisible to the comparison. That is
why the declared change is printed beside every verdict.

## What is already settled, and binds these gates

From S-182, unchanged by the split: the brief key's construction; two runs a side in a group and three shared groups
at the least; a zero delta counts as not moved; a group where the measure is undefined on one side is dropped; the
fingerprint's fields; and that **the engine's code version is reported "not recorded"** on every comparison until
`run-provenance` records it. (S-182's companion clause about the picture rule is corrected above, by the scoring
half as built.)

**S-182's exact words on the two clauses these gates change** — quoted so the departure is visible rather than
hidden: _"A measure moves only beyond **twice its own band**: binomial from the counts for a share, and from the two
sides' sample variances for a per-run average, which needs two runs a side"_, and _"the same direction in two thirds
of **the groups**"_ (`DECISIONS.md:7839-7843`). S-182 defines no standard error and no multiplier of its own; the
`4 × SE` reading comes from a session-83 draft and from `PROMPTS/084`, not from the entry's text. What these gates
settle — one standard error with a multiplier of two, the direction counted over **surviving** groups rather than
all of them, and the guard's _"only when"_ three quantities becoming five — is recorded as **S-199**, which names
each departure and what catches a violation.

Measured in session 83, read-only: **5 of the 25 brief groups hold two or more runs whose fingerprints match**, the
largest matching set being five runs in group `4ce40e14`. The 25 groups hold 8, 5, 4, 4, 4 runs and then fewer. A
verdict needs two runs a side in each of three groups; **how many groups can supply that was never measured**, and
the reader is what answers it.

## The nine choices, and where each one is settled

Each was a real choice with real alternatives. None is settled in prose alone: every row names the gate section
that chooses and the numbered check that catches a violation.

|   # | the choice                                     | settled in                                       | checked by |
| --: | ---------------------------------------------- | ------------------------------------------------ | ---------: |
|   1 | the band's wording, in one place               | Gate 2, "The band, said once"                    |          1 |
|   2 | the arithmetic's scope — pooled or per group   | Gate 2, "Per group, and never across groups"     |       2, 3 |
|   3 | the credit guard's quantities                  | Gate 2, "The credit guard, and its five"         |          5 |
|   4 | which comparability conditions are not vacuous | Gate 2, "Comparability, field by field"          |          6 |
|   5 | the verdict's unit                             | Gate 2, "The verdict's unit, and what prints"    |          7 |
|   6 | what a malformed side is                       | Gate 2, "A malformed side, and a thin one"       |      8, 11 |
|   7 | the null comparison as a check                 | Gate 2, "The null comparison, and its control"   |          9 |
|   8 | where the code lives                           | Gate 2, "Where each part lives"; Gate 3's files  |     12, 13 |
|   9 | what it must not do                            | Gate 1; Gate 2's table and "What it must not do" |     11, 13 |

## Gate 1 — Product (no technical language)

**The problem.** Every change to the engine from here on is a claim that runs got better: the picture prompt
rewritten, a shot that heals itself, a caption matched. The scoring half now says how well each run went, part by
part, out of what the engine already wrote — and it deliberately puts **no two sets of runs beside each other**, so
there is still no way to say whether a change helped. The owner's reason for refusing to defer this is the whole
feature: _"this is also the most important or else how would we know whether the new engine or new thing in the
engine worked."_

**The job.** Name two sets of runs — a label and a list for each — and get back, for each of eight things, one of
four words, with the figures and the uncertainty beside it. The eight are: how often a reel came out at all; how
much of the pictures, the filmed takes and the finished cuts were refused; how often a shot fell back to a still;
how often a shot ran out of attempts at the camera; what a run cost; and how long a run took. Every one of them is
**a rate per unit of work, averaged over runs**, never a total, so a run that planned four shots and a run that
planned six can appear in the same comparison without the bigger one looking worse.

**The four words, and why one of them is "no verdict".** _Helped_, _hurt_, _inside the noise_, _no verdict_. The
first two are claims. The third says the two sides differ by less than the measurement can see. The fourth says the
runs in hand cannot answer the question at all — too few, or not the same brief, or something differed that nobody
accounted for, or the measurement cannot see anything because the runs on a side are identical. A verdict reached
wrongly is worse than no verdict, because the whole point of the thing is to tell the owner whether to keep a
change, so the rule is written down before any number is read and the fourth word is always available. **There is a
fifth state and it is not a verdict**: a measure the caller asked to have reported and not judged says exactly
that.

**What it will say about the runs we already have.** 52 runs have been made, over 25 different briefs. To say
anything about one brief, this needs at least two runs on each side, matched on everything the comparison checks;
and to say anything at all, it needs three briefs like that. **Five briefs hold two or more matched runs and the
largest holds five, and nobody has yet counted how many hold four** — so the first thing this feature does on the
record is print that count and, if it is short, say that it cannot answer. The honest expectation is that it cannot,
and the first real verdicts come from runs made deliberately after this exists.

**The two ways it gets used, which are one mechanism.** Either nothing the comparison checks was supposed to differ
between the sides and the change is simply declared — then a difference in any of the things it checks refuses the
comparison; or the caller says in advance what the sides differ on, because the question is which configuration is
better — then only an **undeclared** difference refuses. In the second way, cost and time are reported and not
judged, because a richer configuration is meant to cost more and judging that as a regression would reject every
better configuration.

**Credit is withheld when the work got smaller.** The cheapest way to make every number improve is to attempt
less: plan fewer shots, make them shorter, ask for fewer pictures, give up on a shot earlier. All of those lower
cost and time and raise the share of runs that finish. So five quantities about how much work was attempted are
watched alongside the eight; if any of them moved in the direction of less work, a "helped" becomes "no verdict"
and says which quantity did it. A "hurt" is never withheld — a regression is still a regression. In the second way
of using this, a quantity the caller named as the thing being changed does not withhold anything: that is what
asking "which configuration is good" means.

**The one view that already works.** Instead of two sides, group what the record holds by one of its own properties
— how many shots the plan asked for, how many subjects a shot named, which picture rule was in force — and report
each group with its own uncertainty. That needs no matched runs at all, and it is how the engine's largest defect
was found: pictures were refused 42% of the time with one subject in a shot, 70% with two, and 100% with three.
This view prints figures and bands and **no verdict word**, because a verdict needs two sides.

**The risks, said before anything is read.**

- **A band is not a promise, and at these run counts it is wide.** Two deliberately plain cases are pinned as
  checks: a side where no run made a reel against a side where every run did, with **two** runs each, comes back
  _inside the noise_; and a side whose runs each had a fifth of their pictures refused against one at two fifths,
  four runs each, also comes back _inside the noise_ — because four runs is four pieces of evidence, however many
  pictures they contain. Only an effect as large as none-against-all over four runs a side moves a measure.
- **Nothing records which engine made a run.** That reads as _not recorded_ and is printed beside the declared
  change, never as "the same". Making it airtight is `run-provenance`, which is not built.
- **It checks seven things about whether two sides are alike, not everything the record holds.** A change that
  moves only something it does not check — a different model at the same price, a different seed — is invisible to
  it. The declared change is printed beside every verdict for exactly this reason.
- **A comparison is only as good as the two sides being the same brief.** Runs are grouped by the brief with its
  identifier and its options removed, and two different briefs never meet in one group.
- **The ratings are not compared.** A rating out of 100 ranks runs and decides nothing; a verdict is built from the
  eight measures and never from a rating.

**What does not change.** No gate, cap, brief, price or engine behaviour. Nothing is written to the engine's
record: it is opened to read and never to write. **This feature adds no way to spend money**, reaches no provider
and reads no key.

## Gate 2 — Architecture

### Where each part lives

| place                                     | what it gains                                                                                                                                                                    | what it still may not do                                                                                                       |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `packages/benchmark/src/compare.ts`       | sides, grouping by brief key, the fingerprint's fields, the eight measures, both bands, the per-group vote, each measure's word, the credit guard, stratify, the sides validator | no I/O, no database, no engine package, no app, **no npm package at all**, and no `node:crypto` — the hash is handed in        |
| `packages/benchmark/src/measures.ts`      | one field: `planVaryOn` on the scorecard's run block, with its `FIELD_COLUMNS` entry                                                                                             | nothing else; this is an amendment to a verified feature and is listed below                                                   |
| `packages/benchmark/src/index.ts`         | the new exports, since a package is entered only through it (D-094)                                                                                                              | nothing else; it re-exports and holds no logic                                                                                 |
| `scripts/_benchmark-rows.mjs`             | the read-only open, the held-column read, one run's rows, and the run-id prefix resolution — **moved out of `scripts/benchmark.mjs`**, which imports them back                   | no measure, no verdict, no printing, no `process.exit` of its own — it returns rows and faults                                 |
| `scripts/benchmark-compare.mjs`           | the reader: flags, the sides document, SHA-256 for the brief key and the fingerprint's label, redaction, the printed comparison, the written record                              | compute no measure of its own, write to the record, start any process but `git rev-parse`, construct a port, read a key, spend |
| `tests/fixtures/benchmark/compare/*.json` | the constructed run sets the checks read                                                                                                                                         | hold any path but the literal placeholder, which `yield-benchmark`'s check 12 already enforces here because its glob recurses  |
| `tests/yield-compare-*.test.ts`           | the fourteen checks                                                                                                                                                              | read `data/cutroom.sqlite`, need a key, or start the engine                                                                    |

**What `compare.ts` is handed, stated because it is the most basic open question of choice 8.** Each side arrives as
a label and a `readonly RunRows[]` — the same row shape `scorecard()` takes — together with **a `HashFn`**, exactly
as `ScorecardOptions` already requires one (`measures.ts:855-861`). It calls `scorecard()` and `termInputs()`
itself, so no column is read twice in two ways, and it imports no hashing of its own, which is what
`benchmark-no-io`'s denial of `node:crypto` means here.

**No npm dependency is added, and the sides document is validated by hand.** `packages/benchmark/package.json`
declares `@cutroom/contracts` and `@cutroom/reel-contract` and **no `zod`**, so a `zod` schema would need that
manifest and the root `pnpm-lock.yaml` — both in `check.mjs`'s `FULL_ONLY` (`scripts/check.mjs:229-233`), which
would make the slice carrying it a full suite. A five-field document's shape is thirty lines of pure TypeScript and
reports every fault in one pass, which is what this feature needs anyway and what `zod` would have to be coaxed
into. `benchmark-npm-only-zod` therefore stays exactly as it is, unexercised by this feature and already proven.

**Why the arithmetic is in the package and not the script.** The three rules that hold `packages/benchmark` pure
already exist — `benchmark-no-engine`, `benchmark-no-io`, `benchmark-npm-only-zod` — so **no new boundary rule is
added and `drift --prove` still fires 25** (S-182's count, taken from 22 in `yield-benchmark`'s Slice 1). It is
also what the verification costs decide: `check.mjs`'s `FULL_ONLY` holds `/^scripts\//`, so **any** change under
`scripts/` owes the full 617-second suite under both `--changed` and `--slice` (S-192, S-196), while a change
confined to `packages/benchmark` can be verified by `--slice` over named test files. Putting the arithmetic in the
script would make every slice of this feature a full run.

**What the impact map cannot do for this feature, stated so no slice claims otherwise.** Every slice here **adds** a
source file, and `scripts/_impact.mjs` answers an uncovered path with a reason rather than a set, which
`check.mjs` turns into the full run. So `--changed` owes 617 s on every slice of this feature until the map is
re-recorded (`node scripts/impact-map.mjs`, 402 s), and the targeted route is `--slice` with the feature's own test
files named. S-196's 46–48 s figure is what the map says about files it has already seen, and it is not this
feature's cost.

**Why the row loader moves rather than being copied.** `scripts/benchmark.mjs` already opens the record read-only,
reads which columns this record holds from `sqlite_master` and `pragma_table_info`, and selects one run's rows with
`SELECT *` so a column migration 0007 added can simply be absent. A second copy of that in a second script is two
places that know the schema, which is the drift D-088 and S-017 exist to catch and the reason S-182 refused a
separate benchmark repository. So it moves into a shared module both scripts import. **That is not free and the
cost is named below**: the check that holds the reader read-only reads the reader's own source text, so it has to
grow to the three files, and a verified feature's test file is edited.

### The eight measures, each read positively, each per unit

Every measure is computed from the scoring half's own reading of the rows — `scorecard()` and `termInputs()`.
**Measure 1 is a share over runs. Measures 2 to 6 are per-run rates averaged over the side's runs. Measures 7 and 8
are per-run figures averaged the same way.** The run is the unit of evidence in all eight.

|   # | measure               | the figure one run contributes                                             | its denominator                        | better |
| --: | --------------------- | -------------------------------------------------------------------------- | -------------------------------------- | ------ |
|   1 | reels made            | made a watchable file, or did not — one count per run                      | the side's runs in the group           | up     |
|   2 | pictures refused      | pictures Gate 1 decided that it did **not** accept, over those it decided  | pictures with a decided Gate 1 outcome | down   |
|   3 | takes refused         | takes whose `take.outcome` is `fail`, over those with an outcome           | takes whose `outcome` is not null      | down   |
|   4 | finished cuts refused | this run's Gate 7 outcome was not `accept`, with `render.finished_at` set  | one figure per finished run            | down   |
|   5 | shots degraded        | **distinct shots** with a degradation row this run wrote, over shots tried | shots a picture was attempted for      | down   |
|   6 | shots held at the cap | distinct shots with a `still_hold` this run wrote, over shots tried        | shots a take was made for              | down   |
|   7 | cost per run          | this run's own receipts — image, video, speech and lost calls              | one figure per run                     | down   |
|   8 | wall clock per run    | the run's created-to-last-event seconds                                    | one figure per run                     | down   |

**Why measures 2 to 6 are averaged over runs rather than pooled over items.** Twenty pictures made by four runs are
not twenty independent trials: one brief, one prompt, one model state and one picture rule produced all five
pictures of a run, and the repository's own evidence is that refusals cluster inside a run — session 82's 42% / 70%
/ 100% by subjects per shot is a within-run property. Pooling the items would shrink the band like
`1/sqrt(items)` while the evidence grows like `sqrt(runs)`, and the claim would be anti-conservative by about the
square root of the items per run. It is also what this feature's own first rule says in as many words: _per-unit
rates, never totals._ **Pinned, because the two forms disagree:** four runs with none of five pictures refused
against four runs with two of five refused is, pooled over items, 0 of 20 against 8 of 20 — delta +0.3636, band
0.1138, `2 × band` 0.2277, **moved**; as per-run rates it is delta +0.4000, band 0.2531, `2 × band` 0.5063,
**inside the noise**. The same rows, two answers, and the second is the true one.

**Measures 5 and 6 count distinct shots, not rows.** `scorecard().parts.pictures.shotsDegradedThisRunMade` counts
degradation **rows** (`measures.ts:1192`), and a shot can carry more than one, which would put the share above 1
with nothing to notice. The numerator is the distinct shots those rows name.

**Measure 4 reads the gate's own word.** `scorecard().parts.cut.gate7.outcome` (`measures.ts:1247`) is Gate 7's
verdict; the scorecard's `answeredNo` list counts anything that is not `yes`, so an **unanswered** question reads as
a no there, and it is computed without the `finished` guard. The measure reads the outcome, with
`render.finished_at` set, and a run with no finished render contributes nothing.

**Measures 5 and 6's denominators are the ratings' own attempted-work denominators** — `pictureShots` and
`takeShots` (`measures.ts:761, 782`), `yield-benchmark` Gate 2's pictures 2 and clips 2 — so one reading serves
both.

**Inherited rows belong to the run that paid for them** (S-162, S-164), in every numerator and denominator here,
exactly as in the ratings: a resumed run's copied pictures, narrations and takes are excluded, and so are the
degradation, `still_hold` and `hold` rows an inherited failure writes again under the new run. Measure 7 needs no
such filter: a resume copies no receipt (`packages/domain/src/resume.ts:226-320`), so the cost sum is already the
run's own.

**A run contributes nothing to a measure whose denominator is zero for it, and nothing to an average whose value
reads `absent`.** `wallClockSeconds` is `absent` for a run with no events (`measures.ts:393-399, 1097`), and
reading an absent figure as 0 would lower a down-is-better mean, which is "helped" — the bias this feature refuses
two sections below. So: such a run is excluded from that measure, **its count is printed**, and a side left with
fewer than two contributing runs drops the group for that measure.

**A measure is undefined on a side when no run there contributes**, and a group where either side is undefined is
**dropped for that measure only** (S-182, settled). Measure 1 is never undefined — its denominator is the side's run
count — but like every other measure it is still dropped by the two-runs-a-side minimum.

**Cost per reel is reported beside measure 7 and is not a measure.** It is undefined on a side where no reel came
out, which is exactly the side where cost matters most, so judging it would drop the comparison where it is needed.

### The band, said once

**A measure has moved when the two sides' difference is larger than twice the band, where the band is one standard
error of that difference.** One line, which is the whole point of settling it: `moved ⇔ |delta| > 2 × band`. The
band is **one** standard error and the multiplier is **two**, and nothing else in this feature multiplies a band.

**For measure 1, a share over runs**, the band is the unpooled Wald standard error of a difference of two
proportions, computed from **adjusted** counts — one success and one failure added to each side, the Agresti–Caffo
adjustment for a difference of proportions:

```text
pA' = (a + 1) / (nA + 2)        pB' = (b + 1) / (nB + 2)
band  = sqrt( pA'(1 - pA') / (nA + 2) + pB'(1 - pB') / (nB + 2) )
delta = pB' - pA'               moved  ⇔  |delta| > 2 x band
printed: each side's RAW share with its counts, the raw delta, the adjusted delta, the band
```

**Unpooled, and why.** The pooled form estimates one shared proportion under the hypothesis that the two sides are
equal; it belongs to a p-value, not to an interval around the difference that was actually observed. One draft in
session 83 said "pooled" over this unpooled form, and this is the sentence that settles it.

**Adjusted, and why.** With raw counts a side observed at 0 of 4 or 4 of 4 has a variance of exactly zero, so
`band = 0` and **any** difference reads as moved: four runs would license a claim with no uncertainty. The
adjustment costs two integers. Four worked values, pinned by check 1:

| side A | side B | raw delta | adjusted delta | band   | 2 × band | verdict          |
| ------ | ------ | --------- | -------------- | ------ | -------- | ---------------- |
| 2 / 4  | 4 / 4  | +0.5000   | +0.3333        | 0.2546 | 0.5092   | inside the noise |
| 1 / 4  | 4 / 4  | +0.7500   | +0.5000        | 0.2453 | 0.4907   | moved            |
| 0 / 4  | 4 / 4  | +1.0000   | +0.6667        | 0.2152 | 0.4303   | moved            |
| 0 / 2  | 2 / 2  | +1.0000   | +0.5000        | 0.3062 | 0.6124   | inside the noise |

The last row is the one Gate 1 promises: **at two runs a side, even none-then-all does not move.** The third says a
clean sweep at four runs a side does. The first says two-of-four against four-of-four does not, which is the shape a
hopeful reader would most like to call a win.

**For measures 2 to 8, a per-run figure**, the band is Welch's unpooled standard error of a difference of means,
from the two sides' **sample** variances (the `n − 1` denominator), **floored at the run-level share band** for
measures 2 to 6:

```text
welch = sqrt( sA^2 / nA + sB^2 / nB )
floor = the share band above, with a = meanA x nA, nA runs, and b = meanB x nB, nB runs   (measures 2-6 only)
band  = max(welch, floor)                delta = meanB - meanA        moved  <=>  |delta| > 2 x band
```

**Why a floor.** Four runs that each refused exactly the same fraction have a sample variance of zero, and the
Welch band is then zero — the same hole the adjustment closes for counts, arriving by another road. The floor says
the spread of a bounded rate across `n` runs is never known to be smaller than the spread of `n` runs at that rate,
which is the same epistemic claim the adjustment makes. Rejected: bare Welch, which hands a claim with no
uncertainty to four identical runs; and refusing every zero band, which would make none-then-all unclaimable
forever. **Pinned, by check 1:** `(0,0,0,0)` against `(0.4,0.4,0.4,0.4)` is delta +0.4000, Welch 0.0000, floor
0.2531, `2 × band` 0.5063 — inside the noise; `(0,0,0,0)` against `(1,1,1,1)` is delta +1.0000, Welch 0.0000,
floor 0.2152, `2 × band` 0.4303 — **moved**; and `(0.2,0.4,0,0.6)` against `(0.8,0.6,1,0.8)` is delta +0.5000,
Welch 0.1528, floor 0.2715, `2 × band` 0.5430 — inside the noise. The floor binds in all three, which is the
honest consequence of four runs a side.

**The multiplier is a flat 2 and this is not a confidence interval.** A Student's t quantile at these sizes is 2.8
to 4.3, and using one would make the rule far stricter than S-182's words; computing one needs an inverse t in a
package with no npm dependency at all. So the flat 2 is kept and is named as **anti-conservative**, and the
conservatism is carried by the floor above and by the group rules below — three surviving groups, two thirds
agreeing, and no group allowed to disagree.

**A band of exactly zero is no verdict, not inside the noise.** Measures 7 and 8 have no floor: two runs that cost
the same integer cents give a variance of zero, and the record holds three runs at 15¢, so this is a real shape.
_Inside the noise_ means "the two sides differ by less than the measurement can see", and with a band of zero the
measurement sees everything — reporting 15¢ against 75¢ as inside the noise would be a false claim. **A zero band
votes no verdict** with its reason: two runs with no spread leave the band undefined rather than zero. Pinned by
check 1: `(0,0)` against `(2,2)` is delta 2.000, band 0.000, **no verdict**.

### Per group, and never across groups

**Nothing is pooled across brief groups.** Within one group, a measure's per-run figures are averaged over that
side's runs; across groups, only the **direction** of the answer is combined. Pooling across groups of 8, 5, 4, 4
and 4 runs can reverse the sign every per-group test sees — different briefs are different populations — and this is
the one place in the feature where a wrong answer would look most like a strong one.

That also answers S-182's second open question by removing it: _"whether a group dropped for one measure keeps its
counts in that measure's pool"_ cannot arise, because that measure has no pool. A group is dropped for one measure
and keeps every other.

**How a group votes, for one measure.**

1. The group is **dropped** when either side has fewer than two runs in it, or when fewer than two of a side's runs
   contribute to that measure.
2. A surviving group votes **helped** or **hurt** when `|delta| > 2 × band` and the direction is the better or the
   worse one for that measure (the measure table's last column). Otherwise it votes **inside the noise**.
3. A raw delta of exactly zero votes inside the noise, whatever the band (S-182, settled).
4. A band of exactly zero votes **no verdict**, with its reason.

**How a measure gets its word, from the groups' votes.**

1. Fewer than three surviving groups ⇒ **no verdict**, naming how many survived and why each one dropped.
2. **helped** when at least `ceil(2/3 × surviving)` groups vote helped **and no group votes hurt**.
3. **hurt** when at least `ceil(2/3 × surviving)` groups vote hurt **and no group votes helped**.
4. Otherwise **inside the noise** — and where both directions are voted, **no verdict**, naming the groups that
   disagree. A group voting no verdict is counted as surviving and agrees with nothing.

The ceiling makes the two-thirds rule exact: 2 of 3, 3 of 4, 4 of 5, 4 of 6. Clause 2's second half is stricter
than S-182's words and deliberately so: two groups helped and one hurt is a sign reversal across briefs, and
calling that "helped" is the wrong-verdict failure the owner's reason rules out.

### The credit guard, and its five quantities

**Credit is withheld when the work got smaller.** Each guard quantity is measured with the same arithmetic as a
measure — per group, same band, same vote rule — and fires when it has **moved in the direction of less work**.

|   # | quantity                                       | the figure one run contributes                         | less work is | why it is in the guard                                                          |
| --: | ---------------------------------------------- | ------------------------------------------------------ | ------------ | ------------------------------------------------------------------------------- |
|   1 | shots the plan asked a picture for             | `parts.pictures` — shots with at least one own picture | down         | fewer pictures attempted lowers cost and lowers the refusal rates               |
|   2 | accepted pictures per shot that ended accepted | own accepted pictures over those shots                 | down         | the picture rule's reach; S-182's own quantity                                  |
|   3 | shots degraded (measure 5)                     | the same figure as measure 5                           | up           | a degraded shot is a shot not filmed: it lowers cost and raises reels made      |
|   4 | the selected plan's shot count                 | `parts.plan.shots` (`measures.ts:1158`)                | down         | **the missing quantity** — fewer shots lowers cost, time and every refusal rate |
|   5 | the selected plan's total planned seconds      | `parts.plan.totalSeconds` (`measures.ts:1160`)         | down         | **the missing quantity** — shorter shots do the same without changing the count |

**Quantities 4 and 5 are the reviewer's finding, and they go in the guard rather than the fingerprint.** A change
that plans fewer or shorter shots lowers cost and wall clock and raises reels made, and S-182's three quantities
cannot see it. Putting the plan's shot count and planned seconds in the **fingerprint** would instead make the two
sides incomparable, which hides a real regression behind "no verdict" and — worse — forbids the comparison the
owner asked for in as many words: _"i would want to compare the reels if they have different number of planned
shots."_ The guard withholds credit; it never refuses a comparison.

**Quantity 3 is also measure 5, with the same arithmetic in the opposite role.** As a measure, more degradation is
_hurt_; as a guard, more degradation is the reason another measure's _helped_ does not count. One reading, two
roles, stated so neither is mistaken for a second opinion. **Quantity 1 and quantity 4 coincide under the default
picture rule**, where every shot is asked for a picture; they are kept apart because `recurring` is not the only
rule and `CUTROOM_PICTURES` (S-150, S-153) moves one without the other, and the output prints both figures so a
reader can see when they agree.

**What firing does.** Every measure that would read **helped** reads **no verdict** instead, with the reason _"the
work got smaller"_ and the firing quantity's own figures. A **hurt** is never withheld. A measure already reading
inside the noise or no verdict is unchanged.

**In config mode, a quantity the caller declared as the axis does not fire** — it is reported with its figures.
Declaring that the sides differ in planned shots is exactly saying "I know the work is smaller; tell me whether it
is better", and the cost and wall-clock measures are already reported-not-judged in that mode.

### Comparability, field by field

**A fingerprint is a record of fields, compared field by field, and never a hash compared as a whole.** A
whole-hash mismatch names no field, and "no verdict" with no reason is unusable. An 8-character SHA-256 of the
canonical field set is printed as a **label** only, hashed in the reader, because `benchmark-no-io` denies the
package `node:crypto` (S-182, S-186).

**Vacuous by construction, and therefore not conditions at all.** The brief key is the SHA-256 of
`request_canonical` with `requestId` and `options` removed, so **every field of the request outside `options` is
identical within a group by definition**: `contractVersion`, `worldId`, `narration`, `claims`, `criteria` with its
`depictionPolicyVersion`, and `style` with its `id`, `version` and `text`
(`packages/reel-contract/src/request.ts:79-90`). S-182 named four of them as comparability conditions; they can
refuse nothing, and keeping them would read as coverage. They are printed under the heading **held by the brief
key** and decide nothing.

**The seven real conditions.** Three live in `options`, which is outside the brief key, so they can and do differ
inside one group; four are observed on the run.

|   # | condition                               | where it is read                       | why it is not vacuous                                                               |
| --: | --------------------------------------- | -------------------------------------- | ----------------------------------------------------------------------------------- |
|   1 | `until`                                 | the stored request's options           | it decides which parts can exist, so it decides which measures are even defined     |
|   2 | the ceiling (`budgetCents`)             | the stored request's options           | it decides when a run stops; S-182 named no condition for it at all                 |
|   3 | `planVaryOn`                            | the stored request's options (D-062)   | it decides what the two fork plans differ on, so it changes what was selected       |
|   4 | each receipt kind's rates               | `rate_cents` on each receipt, as a set | a price change moves cost per run with nothing about the engine having changed      |
|   5 | **each port's models**                  | `model` on each receipt kind, as a set | a model swap at an unchanged price — nano-banana-2 to flux-2-pro happened here      |
|   6 | the selected plan's `plannedImageCalls` | the selected plan                      | a service setting (`CUTROOM_PICTURES`, S-150, S-153) changes how many are attempted |
|   7 | the picture rule                        | `Plan.pictures` on the selected plan   | **read, not "not recorded"** — the correction at the top of this file               |

**Condition 5 is new here, and it is why the modes table may say "the model".** The engine has already changed
image model once at a comparable rate, and a swap that no condition reads would let a comparison proceed as though
nothing differed.

**Condition 3 needs one field the scorecard does not expose.** `planVaryOn` appears in `measures.ts` only inside a
private blob type and is in no scorecard field, so `compare.ts` would have to parse `run.request_canonical` itself —
a second reading of a column, which this feature forbids. Instead the scorecard gains it, with its `FIELD_COLUMNS`
entry, as an amendment to a verified feature listed below.

**Dropped as redundant: "whether standalone pictures exist".** S-182 named it because the picture rule was thought
unreadable; it reveals the rule in one direction only. The rule itself is read, so the proxy goes rather than being
kept as a weaker second condition.

**Printed, not conditions.** This feature's own comparison-rule version (`c1`) cannot differ inside one invocation.
The rating version `r1` is printed because the ledger carries it; **no comparison is built from a rating.** The
scoring half's `MEASURES_VERSION` is **not** restamped here: it is a top-level constant of an unimportable script
and it names a different selection of figures, so claiming it would claim a sameness that is false (S-197's third
finding, inherited and refused here).

**One condition is scoped to one measure.** Gate 7's question set changed (S-158), and two of the four historical
cut refusals are the removed question, so **a group whose two sides hold different Gate 7 question-set hashes drops
measure 4 and keeps the other seven.** This is `yield-benchmark`'s check 10 in the same shape: the refusal to
compare is scoped to the thing the change moved, not to the whole run.

**An absent observed field does not refuse; two present and different values do.** The four observed conditions
exist only as far as a run got: a run that died in the plan stage has no selected plan and no receipts at all.
Refusing on absence would drop exactly the runs that died early, which are the runs measures 1 to 6 are about, and
**every verdict would be biased toward "helped" by construction**. So `absent` matches any value, the output says
which fields were absent on which side, and the fingerprint stays strict wherever it can be read. Rejected: treating
`absent` as a distinct value, which is the same bias written differently.

**The engine's code version reads "not recorded"**, printed beside the declared change under test, until
`run-provenance` exists (S-182, unchanged).

### The verdict's unit, and what prints

**No overall verdict word is composed, and none is printed.** The eight measures can disagree; composing them needs
weights, and S-182 already refused a number people optimise on the grounds that it stops measuring. Seven of the
eight are also explanations of the first, so a majority vote across measures would double-count one effect.

What prints instead:

1. **Reels made first, named as the headline.** It is the only measure that says a reel came out, which is what the
   engine is for.
2. **The other seven in the measure table's order**, each with its word or with **reported, not judged**, its
   surviving and dropped group counts, and each group's figures, band and contributing-run count.
3. **A tally that composes nothing**: _helped on n, hurt on m, inside the noise on k, no verdict on j — of the
   measures judged_, with the judged count printed and the reported-not-judged measures named beside it. In the
   change-under-test mode that count is 8; in config mode it is 8 less the measures the caller declined, which is
   6 by default.
4. **One stated rule of reading, printed with the tally**: when reels made reads _hurt_, no other measure's
   _helped_ cancels it.
5. **The limits**: the declared change, the engine version as _not recorded_, every comparability field that
   refused and every one that was absent, every group that dropped and why, the guard's quantities with their
   figures, and the count of brief groups that could supply two runs a side.

### A malformed side, and a thin one

They are different answers and must not be the same one. And they split again by what can know them: a **shape**
fault needs no record, a **record** fault needs the resolved run set.

**Shape faults — pure, decided by the sides validator with no database:**

- a missing or empty label, or the two labels equal;
- a side with no runs;
- a run id that is not a string, or is empty;
- the same id written twice **verbatim** in one side, or verbatim in both;
- an unknown name in `declaredAxis` or in `judge`.

**Record faults — decided by a pure function over the resolved run set, which the reader supplies:**

- an id matching no run;
- **an id matching more than one run** — the ambiguous prefix, which nothing in the first draft of these gates gave
  a behaviour at all;
- two ids that resolve to the same run, in one side or across both — which is the only way a prefix duplicate can
  be seen.

**Either kind is exit 2, nothing scored, with every fault of both kinds named in one pass** rather than the first
one found. That is why the resolution moves into `scripts/_benchmark-rows.mjs` with a variant that **returns** its
faults instead of exiting on the first, as `scripts/benchmark.mjs`' own `unusable()` does.

**Thin is a result: the exit code is 0 and the word is "no verdict"**, with what is missing named — fewer than two
runs a side in every group, fewer than three surviving groups, every group dropped for one measure. A typo in a run
id must never read as thin evidence, which is why an unknown id is a fault rather than a skip.

### Stratify

One set, grouped by one recorded property, each stratum reported with its own figure and band, **and no verdict
word**, because a stratum is one set and a verdict needs two sides. A stratum's band is the single-side form of the
share band above (the same adjusted counts); a stratum with fewer than two members is reported with its count and
no band.

**The unit is per property, because the record's properties are not all per run.** Session 82's finding strata
**pictures**, not runs: `scorecard().parts.plan.subjectsPerShot` is an array with one entry per shot
(`measures.ts:717-720`), so a run is in no single such stratum.

| property            | the unit | the strata                                                        | the figure                      |
| ------------------- | -------- | ----------------------------------------------------------------- | ------------------------------- |
| `subjectsPerShot`   | pictures | the subject count of the shot each picture belongs to             | share of those pictures refused |
| `pictureRule`       | pictures | the rule the run's selected plan carried                          | share of those pictures refused |
| `shots`             | runs     | the selected plan's shot count                                    | each measure, over those runs   |
| `plannedImageCalls` | runs     | the selected plan's planned image calls                           | each measure, over those runs   |
| `imageToVideo`      | runs     | `none` (0), `mixed` (between), `all` (1) — stated, not continuous | each measure, over those runs   |

This is the view that answers _which config is good_ over the runs already made, and session 82's 42% / 70% / 100%
is the first row's shape.

### The null comparison, and its control

**Fifteen constructed runs over three brief keys — three groups of five — each group's five sharing one
fingerprint, each split two against two with the fifth left out and the split stated in the fixture, must return no
claim at all**: every one of the eight measures reads _inside the noise_ or _no verdict_, none reads helped or hurt,
**and every one of the three groups' own votes is asserted**, not only the measure words.

**Three groups, because one group cannot fail.** Five runs sharing one brief key are one group, and one surviving
group is already "fewer than three ⇒ no verdict" — so a one-group null would pass with the band hard-coded to zero,
with the multiplier at 0.001, or with the sign of the delta reversed. The group vote is the only place the band is
exercised, so that is what the check reads.

**And a positive control in the same check**, because a green null alone proves only that nothing was computed: one
fixture of three groups where every group's runs differ by none-against-all, which must read **helped** on reels
made. A null that passes while the control fails is an arithmetic that answers nothing; a control that passes while
the null fails is an arithmetic that over-claims.

**It runs over constructed rows, not over the live record.** The record's own candidate is group `4ce40e14`'s five
same-fingerprint runs, and a check that read `data/cutroom.sqlite` would fail on a clean checkout and in the
PATH-only child (S-028). The reader's own behavioural check runs the same split against a temporary database.

**One group of real rows is already committed and is used too.** Of the ten run fixtures in
`tests/fixtures/benchmark/`, two share brief key `f984199a` — `cd9648c9` (`taken-dead-in-plan`) and `fdff208b`
(`taken-dead-on-first-picture`), both real `cutroom-game-graphics` runs. Split one against one, that group must be
**dropped** by the two-runs-a-side minimum and the answer must be _no verdict_: the thinness rule firing on real
rows. Every taken fixture carries `options` of `{ budgetCents: 250, until: 'video' }`, so the ceiling and `until`
conditions can only be exercised by constructed rows, which is why both kinds exist.

### What this feature changes in verified features (S-099's form)

**Two verified features are touched, and one of them has an assertion edited.** The first draft of these gates
claimed "no test file of `yield-benchmark` changes"; that was false, and round 1 proved it.

**`yield-benchmark` — one test assertion must move and grow.** `tests/yield-benchmark-reader.test.ts` reads
`scripts/benchmark.mjs`' **source text** (`:233-261`) and asserts, among other things, that it holds exactly one
`new DatabaseSync(` and that the open is `{ readOnly: true }`. With the open in `scripts/_benchmark-rows.mjs` the
count is 0 and both assertions go red — and worse than red: every other clause in that block is a scan of that one
file, so code moved out of it would be **scanned by nothing** while the check stayed green. That is a check whose
property is unguarded, which CLAUDE.md rule 3 exists to prevent.

| where                                            | what changes                                                                                                                                                                                                                       |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tests/yield-benchmark-reader.test.ts:233`       | `READER` becomes the three reader files; the source read becomes their concatenation, each clause asserted per file                                                                                                                |
| `tests/yield-benchmark-reader.test.ts:234-239`   | the `new DatabaseSync(` count of **1** is asserted over the three files together, and the `readOnly` match against the one holding it                                                                                              |
| `tests/yield-benchmark-reader.test.ts:240-261`   | every other clause — `openDatabase`, `@cutroom/domain`, `@cutroom/providers`, the five process starters, `run('git', ['rev-parse'`, the four environment names, the `.env` regex, the spender's name — runs over each of the three |
| `packages/benchmark/src/measures.ts`             | the scorecard's run block gains `planVaryOn` from the stored request's options, with its `FIELD_COLUMNS` entry                                                                                                                     |
| `tests/yield-benchmark-measures.test.ts:177-183` | unchanged in form; it asserts every scorecard field has a column named for it, and the new field's entry is what keeps it green                                                                                                    |
| `docs/features/yield-benchmark.md`               | an amendment block recording both, in the form S-197 set — **its gates are not edited**                                                                                                                                            |

**The scan gets strictly wider, not narrower**: one file scanned today, three after. No assertion is removed, no
regex loosened, no count lowered.

**The thirteenth PATH-only child.** `tests/yield-compare-secrets.test.ts` joins the secrets pool by name alone
(`SECRETS_FILE` in `scripts/_pools.mjs:21`), and `tests/check-pools.test.ts:165` asserts `secrets.length >= 12`, so
no bound breaks. Two things do:

- **`tests/check-pools.test.ts:170-180` asserts every file in that pool contains `function bareEnvironment`.** A
  child written in S-028's form without that exact function name turns a verified check red. Check 13 names the
  requirement.
- **The prose count of twelve becomes thirteen**, and the ordinary-file count rises by this feature's four other
  test files. The claims about today:

| where                                          | occurrences |
| ---------------------------------------------- | ----------: |
| `CLAUDE.md:184`, `:196`                        |           2 |
| `docs/context.md:151`, `:164`, `:171`          |           3 |
| `scripts/run-tests.mjs:4`                      |           1 |
| `scripts/impact-map.mjs:133`                   |           1 |
| `tests/check-pools.test.ts:170` (its comment)  |           1 |
| `docs/research/test_fixes_and_research.md:252` |           1 |

**What is deliberately NOT amended, each for a stated reason.** `DECISIONS.md`'s five occurrences (`:8611`,
`:8632`, `:8654`, `:8694`, `:8964`) and `docs/research/test_fixes_and_research.md:98` and `:108` are **measurements
at their date**, and S-197 refused editing a record to match a later state — S-199 records that the count is now
thirteen instead. `tests/reel-render-pass.test.ts:139`' "each of the twelve" is twelve inputs to one ffmpeg
invocation, not twelve children, and `docs/research/refusals.md:80`' twelve is a refusal count: neither is ours,
and both are named here so the next reader need not re-derive it.

**What needs no change, verified rather than assumed.** `scripts/impact-map.mjs:140-147` derives a PATH-only child's
coverage from its feature's siblings by name, so `tests/yield-compare-secrets.test.ts` is derived from
`tests/yield-compare-*` with no edit. `paid-path`'s check 20 already scans every `scripts/*.mjs` for the spender's
name (`tests/paid-path-real-reel.test.ts:132-135`), so both new scripts are covered there without an amendment. The
two-pool classifier needs no edit for a new child. No contract, stand-in, shared helper, provider, setting or
boundary rule changes, and the proven rule count stays **25**.

**The slice that does all of this runs the full suite** (`scripts/` is `FULL_ONLY`), and `yield-benchmark`'s journey
re-runs in the last slice (S-099's form, S-178's order).

### What it must not do

Change any engine behaviour; weaken a check; write to the engine's record; spend. It reads the same rows the scoring
half reads, through the same pure package, and it may not reach a provider or a key. No absolute path, one setting
per generated path defaulting inside the repository (D-086); no key, URL or query string printed or written
(D-022) — **including the caller's own prose**, which is why every string taken from the sides document passes the
reader's `redact()` before it is printed or written; no path in anything committed.

## Gate 3 — Program design

### File locations

```text
packages/benchmark/src/compare.ts            sides, groups, the fingerprint's fields, the eight measures, both bands,
                                             the votes, the words, the guard, stratify, the sides validator (no npm)
packages/benchmark/src/measures.ts           one field added: planVaryOn, with its FIELD_COLUMNS entry
packages/benchmark/src/index.ts              the new exports; the package's only entrance (D-094)
scripts/_benchmark-rows.mjs                  the read-only open, the held columns, one run's rows, prefix resolution
scripts/benchmark.mjs                        imports the above and is otherwise unchanged
scripts/benchmark-compare.mjs                the reader: flags, the sides document, SHA-256, redaction, the printer
tests/yield-benchmark-reader.test.ts         its source scan grows from one reader file to three
tests/yield-compare-arithmetic.test.ts       checks 1, 2, 3, 4
tests/yield-compare-comparability.test.ts    checks 5, 6, 8, 9, 10, 14
tests/yield-compare-reader.test.ts           checks 7, 11
tests/yield-compare-boundary.test.ts         check 12
tests/yield-compare-secrets.test.ts          check 13
tests/fixtures/benchmark/compare/*.json      the constructed run sets, every path the literal placeholder
```

No new boundary rule, no new package, and **no new npm dependency**, so neither `package.json` nor `pnpm-lock.yaml`
is touched. **The fixtures live under `tests/fixtures/benchmark/compare/` deliberately**: `yield-benchmark`'s check
12 reads that tree with `readdirSync(..., { recursive: true })` (`tests/yield-benchmark-schema.test.ts:140`), so
every path-shaped value in these files is already held to the placeholder, and a second scan would be a second
place to maintain.

Both scripts run as every script here does:
`node --experimental-strip-types --no-warnings scripts/benchmark-compare.mjs`.

### The sides document

Sides are a **file**, not a command line: a comparison of eight run ids a side must be re-runnable and quotable,
and the declared change and axis are prose a flag cannot carry.

```json
{
  "a": { "label": "before", "runs": ["a1b8f2ee", "8d233d6e"] },
  "b": { "label": "after", "runs": ["d12931e1", "a5b76d45"] },
  "declaredChange": "the picture prompt rewritten (picture-prompt)",
  "declaredAxis": [],
  "judge": []
}
```

- `declaredAxis` — the names the sides are **meant** to differ on, each from the one table below. Empty is the
  change-under-test mode; non-empty is config mode. An unknown name is a shape fault.
- `judge` — measures to judge although config mode would report them, by name: `costPerRun`, `wallClockPerRun`.
  Empty by default. This is the file's _"unless the caller declares them the measure of interest"_.
- `declaredChange` and both labels are free text, and **every string here passes the reader's `redact()`** before
  it is printed or written.
- A run id may be any unique prefix, as this repository's own documents write them.

**The names `declaredAxis` accepts, which is the union of the conditions and the guard quantities** — written out
once, here, because Gate 2's conditions alone could not express the owner's own use case:

```text
until  ceilingCents  planVaryOn  receiptRates  portModels  plannedImageCalls  pictureRule
shotsAskedAPictureFor  acceptedPicturesPerShot  shotsDegraded  plannedShots  plannedSeconds
```

The first seven are Gate 2's conditions, and declaring one stops it refusing. The last five are the guard's
quantities, and declaring one stops it withholding. `plannedShots` is the name the owner's _"different number of
planned shots"_ needs.

### The reader's flags, their defaults and its exit codes

Every path setting defaults inside the repository and none is absolute (D-086).

| flag                    | default                               | what it does                                                                                                |
| ----------------------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `--db <path>`           | `CUTROOM_DB_PATH`, else the service's | the record to read, opened `readOnly`, in `scripts/benchmark.mjs`' own order                                |
| `--sides <path>`        | none; required unless `--stratify`    | the sides document above                                                                                    |
| `--stratify <property>` | off                                   | `subjectsPerShot`, `pictureRule`, `shots`, `plannedImageCalls` or `imageToVideo`; prints strata, no verdict |
| `--out <path>`          | `.artifacts/compare/<instant>.json`   | the full comparison, always written, in `scripts/benchmark.mjs`' instant form                               |

`--stratify` with `--sides` strata that pair's runs; `--stratify` alone strata every run in the record. There is no
`--rescore` and **no tracked ledger**: the sides are an argument rather than a property of the record, so a
committed file would hold one arbitrary pair and rot. `benchmark-view` reads the `--out` record (S-184), and
nothing about that page is designed here.

| exit | when                                                                                                                                                                                                                                                          |
| ---: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|    0 | the comparison was computed and written — including when every measure reads `no verdict`                                                                                                                                                                     |
|    1 | the database could not be opened read-only — missing, unreadable, or not a database. **Nothing is created.**                                                                                                                                                  |
|    2 | a flag, the sides document's shape, or the resolved run set is unusable: no `--sides` and no `--stratify`, an unreadable document, an unknown `--stratify` property, or any shape or record fault of Gate 2 — **every fault of both kinds named in one pass** |
|    3 | an output could not be written                                                                                                                                                                                                                                |

### The checks

1. `the band is one standard error and the multiplier is two — moved means |delta| > 2 x band — with measure 1's band the unpooled Wald form over counts of RUNS adjusted by one success and one failure a side, and measures 2 to 8's band Welch's over per-run figures, floored for measures 2 to 6 at the run-level share band; the four pinned measure-1 cases return 2/4 against 4/4 adjusted +0.3333 band 0.2546 inside the noise, 1/4 against 4/4 adjusted +0.5000 band 0.2453 moved, 0/4 against 4/4 adjusted +0.6667 band 0.2152 moved, and 0/2 against 2/2 adjusted +0.5000 band 0.3062 inside the noise; the four pinned per-run cases return (0,0,0,0) against (0.4,0.4,0.4,0.4) delta +0.4000 welch 0.0000 floor 0.2531 inside the noise, (0,0,0,0) against (1,1,1,1) delta +1.0000 welch 0.0000 floor 0.2152 MOVED, (0.2,0.4,0,0.6) against (0.8,0.6,1,0.8) delta +0.5000 welch 0.1528 floor 0.2715 inside the noise, and (53,52,58,73) against (49,53,54,51) delta -7.250 band 4.973 inside the noise; (75,71,73,58) against (53,52,49,51) delta -18.000 band 3.932 moved; (0,0) against (2,2) delta 2.000 band 0.000 NO VERDICT by the zero-band rule; and the check quotes the three formulas it checks`.
2. `the same rows pooled over items and averaged over runs give different answers, and the run form is what is computed: four runs with none of five pictures refused against four runs with two of five refused is 0/20 against 8/20 pooled — delta +0.3636 band 0.1138 moved — and delta +0.4000 band 0.2531 inside the noise as per-run rates, which is what the measure returns; the Simpson case holds too, a three-group fixture whose per-group deltas all point one way while the figures summed across groups point the other returning the per-group direction; and nothing cross-group is computed, asserted over the output's own shape — every figure sits under a named group key, the record holds no field aggregating two groups, and each per-group figure equals the figure recomputed from that group's runs alone`.
3. `the minimums and the vote rule, each case separately: a group with fewer than two runs on a side is dropped; a group where fewer than two of a side's runs contribute to a measure is dropped for that measure only and keeps the other seven; a run whose value reads absent contributes nothing and its count is printed; fewer than three surviving groups is no verdict naming the count; helped needs at least ceil(2/3 x surviving) helped votes AND no hurt vote, and 2 helped with 1 hurt is no verdict naming the disagreeing groups; a group voting no verdict counts as surviving and agrees with nothing; a raw delta of exactly zero votes inside the noise; a band of exactly zero votes no verdict; and ceil(2/3 x n) is 2, 3, 4, 4 for 3, 4, 5, 6 surviving groups`.
4. `each of the eight measures is read from the per-run figure and denominator Gate 2 names for it, measure 1 as a share over runs and the other seven as per-run figures averaged over the side's runs, and every one is a rate per unit rather than a total: two sides whose plans hold four and six shots return the same figure when the same fraction degraded; measure 5's and 6's numerators are DISTINCT SHOTS, so a shot carrying two degradation rows cannot push the share above 1; measure 4 reads Gate 7's own outcome with render.finished_at set, never the answeredNo list, and a run with no finished render contributes nothing; an inherited picture, narration, take, degradation, still_hold or hold is excluded from the inheriting run and counted in the run that paid for it, while measure 7 needs no such filter because a resume copies no receipt; measure 1 is never undefined but is still dropped by the two-runs-a-side minimum; and cost per reel is reported beside cost per run and is not a measure`.
5. `the credit guard's five quantities are exactly shots the plan asked a picture for, accepted pictures per accepted shot, shots degraded, the selected plan's shot count and the selected plan's total planned seconds, each measured with the same band and vote rule; when any of them moves in the less-work direction every helped becomes no verdict naming that quantity and its figures, a hurt is never withheld, a measure already inside the noise is unchanged, and a quantity named in declaredAxis does not fire and is reported; a constructed side that plans 4 shots against one that plans 6 withholds credit for reels made although reels made moved; and quantities 1 and 4 are reported separately on a run whose picture rule makes them differ`.
6. `the fingerprint's exported field list is deep-equal to Gate 2's seven conditions, so a vacuous member cannot be added without the check failing; each of the seven refuses when both sides hold a value and the values differ, each case separately, including each port's models; an absent observed field refuses nothing and is named in the output; a differing Gate 7 question-set hash drops the finished-cuts-refused measure and keeps the other seven; the engine version reads not recorded; the picture rule is READ from the selected plan and never reads not recorded; whether standalone pictures exist is in no condition; the scoring half's measures version is not restamped; no comparison reads a rating; and two runs differing only in style version land in different brief groups, which is why the fields outside options are not conditions`.
7. `the verdict's unit: one word per measure and NO composed overall word anywhere in the output; reels made prints first and is labelled the headline; a measure the caller declined to judge reads reported, not judged, which is not one of the four words; the tally counts only the judged measures, prints that count — 8 in the change-under-test mode and 6 by default in config mode — and names the declined ones; the stated reading rule is printed with it; and the limits block names the declared change, the engine version, every field that refused, every field that was absent, every dropped group with its reason, the guard's quantities, and the count of brief groups that could supply two runs a side`.
8. `the sides validator refuses every SHAPE fault with no record at all and names them in one pass, not the first: a missing or empty label, two equal labels, a side with no runs, a non-string or empty run id, the same id written twice verbatim in one side or in both, an unknown declaredAxis name and an unknown judge name; the record faults are decided over a resolved run set and named in the same pass — an id matching no run, AN ID MATCHING MORE THAN ONE RUN, and two ids resolving to the same run in one side or across both; and a thin comparison is NOT a fault, returning no verdict with what is missing named`.
9. `the null comparison and its control: fifteen constructed runs over three brief keys, each group's five sharing one fingerprint, split two against two with the fifth left out and the split stated in the fixture, return inside the noise or no verdict on every one of the eight measures, helped or hurt on none, AND every one of the three groups' own votes asserted; the control fixture, three groups whose runs differ by none-against-all, returns helped on reels made; and a one-group null is rejected by the check's own construction, because three surviving groups are what the band is read through`.
10. `the two committed real runs sharing brief key f984199a — cd9648c9 and fdff208b — form one group with one run a side, are dropped by the two-runs-a-side minimum, and yield no verdict with that reason named, on rows taken from the record rather than constructed`.
11. `the reader: every flag behaves and defaults as Gate 3 states; --stratify prints strata with bands and no verdict word; --stratify alone covers every run in the record; no --sides and no --stratify exits 2; an unreadable document, a shape fault and a record fault each exit 2 naming every fault of both kinds; a missing --db exits 1 and creates no file; --out is written on every successful run, including an all-no-verdict one; the record's bytes are unchanged; it starts no process but git rev-parse, constructs no port and reads no key; a key-shaped and a query-string-shaped declaredChange are redacted in both the printed output and the written record; it writes no path into anything committed; and it contains no occurrence of the spending script's name, which this check BUILDS rather than writes` — behavioural, against a temporary database in `tests/yield-benchmark-reader.test.ts`' shape.
12. `compare.ts is inside packages/benchmark and the three rules still hold on the real dependency graph — no engine package, no I/O, no npm package at all, node:crypto denied under both spellings — drift --prove still fires 25 rules with no rule added; packages/benchmark/package.json gains no dependency; and the moved loader leaves yield-benchmark's checks 6, 7 and 13 green while its check 5 holds the SAME assertions over three reader files instead of one, the new DatabaseSync count of 1 asserted over the three together`.
13. `every other check of this feature passes in a child process whose environment holds only PATH and what the operating system needs to start Node, in S-028's form, and this file builds its environment through a function named as tests/check-pools.test.ts requires of every member of that pool`.
14. `stratify: the unit is per property as Gate 2's table states — pictures for subjectsPerShot and pictureRule, runs for shots, plannedImageCalls and imageToVideo; imageToVideo's three strata are none, mixed and all; each stratum carries its own single-side band; no stratum carries a verdict word; a stratum of fewer than two members is reported with its count and no band; and a picture-unit fixture built in session 82's shape reproduces a refusal share rising with the subject count of the shot each picture belongs to`.

Checks 1 to 10, 12 and 14 need no database at all; none of them starts the engine or needs a key.

### The least confident decisions

- **The floor under the per-run band.** It binds in every worked case, which means at four runs a side only an
  effect near none-against-all moves a measure. That is the honest consequence of the evidence available, and the
  alternative — bare Welch — hands a claim with no uncertainty to four identical runs. If the control fixture ever
  needs weakening to pass, this is the first thing to look at.
- **The flat multiplier of 2.** Anti-conservative at four runs a side, named as such, with the floor and the group
  rules carrying the conservatism. An inverse Student t is the alternative and needs an npm dependency this package
  does not have.
- **Moving the loader out of a verified feature's script.** It is the one place this feature can break something
  that already works, and round 1 showed the first draft was wrong about what it cost. The scan grows from one file
  to three rather than an assertion being dropped, the slice is a full suite, and `yield-benchmark` re-journeys.
- **Adding `planVaryOn` to the scoring half's scorecard.** The alternative is parsing the request twice, which is
  worse; the cost is one field in a verified feature's source and one `FIELD_COLUMNS` entry.
- **Whether "no overall verdict" is too little.** The owner asked whether a change worked, and the answer is eight
  words and a tally rather than one word. Kept, because the composition needs weights and S-182 refused a number
  people optimise; the headline measure and the printed reading rule are what make the eight readable.

## Gate 4 — Slices

- [ ] **Slice 1 — the arithmetic.** `packages/benchmark/src/compare.ts` and its exports: sides as a data shape and
      their grouping by brief key, the eight measures with their per-run figures and denominators, both bands with
      every pinned worked value, the floor, the per-group vote and each measure's word — and the fixtures its own
      checks read, including the three-group Simpson fixture. Checks 1, 2, 3, 4. **Targeted**, by
      `--slice tests/yield-compare-arithmetic.test.ts`: `--changed` owes the full run for a new source file until
      the map is re-recorded. **Proves: 1, 2, 3, 4.**
- [ ] **Slice 2 — the guard, comparability, the sides validator, stratify and the null comparison.** The five guard
      quantities and their withholding, the fingerprint's exported field list compared one by one with the absent
      rule and the question-set scoping, the hand-written sides validator with its shape and record faults, the
      stratify units, and the fixtures under `tests/fixtures/benchmark/compare/` — the fifteen-run null, its
      control, and the picture-unit stratify set. Checks 5, 6, 8, 9, 10, 14. **Targeted**, the same way.
      **Proves: 5, 6, 8, 9, 10, 14.**
- [ ] **Slice 3 — the reader, the shared loader, the amendments and the boundary.**
      `scripts/benchmark-compare.mjs` with its flags, exit codes, redaction and printed output;
      `scripts/_benchmark-rows.mjs` extracted from `scripts/benchmark.mjs` with the one-pass prefix resolution;
      `planVaryOn` and its `FIELD_COLUMNS` entry; `tests/yield-benchmark-reader.test.ts`' scan grown to three
      files; the thirteen-child enumeration; `yield-benchmark`'s amendment block. Checks 7, 11, 12, 13.
      **Full suite** — `scripts/` is `FULL_ONLY` under both `--changed` and `--slice`, and this slice edits a
      verified feature's test file. **Proves: 7, 11, 12, 13.**
- [ ] **Slice 4 — the journeys.** `node scripts/journey.mjs yield-compare`, then `yield-benchmark` again for the
      moved loader and the new field (S-099's form, S-178's order). **Proves: none** — it is the feature's proof.

Every check appears in exactly one slice: 4 + 6 + 4 + 0 = 14.

## Outcome

1. **Two named sets of runs get one of four words for each of eight per-unit measures**, with the figures, the
   band, the contributing-run counts, every dropped group and every refusing field printed beside them — under a
   rule written before any number was read.
2. **The unit of evidence is the run**, so twenty pictures made by four runs are four pieces of evidence and the
   band says so.
3. **Credit is withheld when the work got smaller**, on five quantities, so a change that plans fewer or shorter
   shots cannot buy a better number.
4. **The record's own answer is printed rather than assumed** — how many brief groups can supply two runs a side,
   and what is missing when none can.
5. **Stratify answers which configuration is good over the runs already made**, at the unit each property has, with
   no matched pairs at all.
6. **Nothing in the engine changes, nothing is written to the record, and nothing spends.**

## Evidence (newest first; appended by the journey, never typed by hand)

_none yet_

## Divergence (the first broken boundary, or "none")

_not run_

## Deferred

- **A verdict over the 52 existing runs.** Not deferred by choice: the record holds five brief groups with two or
  more matched runs and nobody has counted how many hold four. The reader prints the count; the gates pin no
  number.
- **The engine's code version** — `run-provenance`, named and not built. Until it exists it reads "not recorded"
  beside the declared change.
- **Conditions over what no condition reads today** — a take's seed, its expansion mode, a receipt's resolution, a
  model's temperature. Named in Gate 1's risks and printed nowhere as "the same".
- **The page.** `benchmark-view` reads this feature's written record (S-184, S-198) and is the phase after this
  one. Nothing about it is designed here.

## Gate review 1 — 2026-10-16, adversarial reviewer, session 91

**All four gates NOT APPROVED, twenty-two findings.** Every one is answered below; **none was refused**. Six were
named sufficient on their own, and three of those were verified against the code in the main session before being
applied: the reader's source-text assertions, the absent `zod` dependency, and the `bareEnvironment` requirement.

|   # | the finding                                                                | answer                                                                                                                               |
| --: | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
|   1 | the null comparison cannot fail — one brief key is one group               | applied: fifteen runs over three groups, the group votes asserted, and a positive control added (Gate 2; check 9)                    |
|   2 | the share band treats items inside a run as independent trials             | applied: measures 2–6 become per-run rates with the Welch band and a floor; the disagreeing case is pinned (check 2)                 |
|   3 | the loader move turns `yield-benchmark`'s check 5 red and blinds its scan  | applied: the scan grows from one reader file to three, listed with its exact new form; the "no test file changes" claim is withdrawn |
|   4 | checks 4 and 10 contradict on whether reels made can be dropped            | applied: never undefined, still dropped by the two-runs-a-side minimum                                                               |
|   5 | Slice 1 cannot prove check 7 and needs Slice 2's fixtures                  | applied: check 7 moved to Slice 3, Slice 1 owns its fixtures, the count is now 4 + 6 + 4 + 0                                         |
|   6 | `zod` is not a dependency of `packages/benchmark`                          | applied by removing the need: the sides validator is hand-written, no manifest or lockfile is touched                                |
|   7 | `declaredAxis` cannot name planned shots or the model                      | applied: one table of twelve names, conditions plus guard quantities                                                                 |
|   8 | "any recorded difference" and "matched on everything recorded" overstate   | applied: seven named conditions, the model made the fifth, and the unread fields named in Gate 1's risks and Deferred                |
|   9 | stratify is specified over runs; its flagship case is per picture          | applied: a unit per property, `imageToVideo`'s three strata stated, "picture role" corrected to "picture rule"                       |
|  10 | a zero band votes "inside the noise", the one word it cannot be            | applied: a zero band votes no verdict, in the vote rule and in check 1's pinned case                                                 |
|  11 | a schema cannot refuse record faults; an ambiguous prefix has no behaviour | applied: shape faults and record faults split, the ambiguous prefix named in both, one pass over both kinds                          |
|  12 | check 6's "proves by construction" asserts nothing                         | applied: the exported field list is asserted deep-equal to the seven conditions                                                      |
|  13 | check 2's "no figure computed over more than one group" is not observable  | applied: asserted over the output's shape and by recomputation from each group alone                                                 |
|  14 | an absent value inside a defined average has no rule                       | applied: such a run contributes nothing, its count prints, and a side under two contributors drops the group                         |
|  15 | `planVaryOn` is in no scorecard field; `compare.ts`' input is unstated     | applied: the scorecard gains the field with its `FIELD_COLUMNS` entry; the input is `RunRows[]` plus a `HashFn`                      |
|  16 | the tally is "of 8" in a mode that judges six                              | applied: the fifth state is named, and the tally counts the judged measures and prints that count                                    |
|  17 | "exactly one brief reaches four matched runs" was never measured           | applied: Gate 1 states what is known and the reader prints the count                                                                 |
|  18 | S-182 is misquoted twice, and no decision entry is named                   | applied: both quoted exactly from `DECISIONS.md:7839-7843`, the `4 × SE` reading attributed to its real source, S-199 named          |
|  19 | the thirteenth PATH-only child, and `bareEnvironment`                      | applied: the requirement is in check 13 and nine occurrences are enumerated with the seven deliberately left                         |
|  20 | the two readers cannot share the version stamp or the resolution           | applied: the resolution moves into the shared module with a one-pass variant; this feature stamps `c1` alone                         |
|  21 | the impact map cannot select for a new file                                | applied: `--slice` with named files, and the map's 46–48 s figure named as not this feature's cost                                   |
|  22 | caller prose unredacted; measure 4's field; measure 5's rows               | applied, all three: `redact()` over every string from the document, Gate 7's own outcome, distinct shots                             |

**What the reviewer verified and did not fault**, recorded so a later round need not redo it: all seven originally
pinned band values recompute exactly; `ceil(2/3 × n)` matches its stated table; the vacuous-by-construction list is
exact field for field against `request.ts:79-90` and `measures.ts:519-529`; the picture-rule correction is right;
measure 7 needs no inheritance filter because a resume copies no receipt; measures 5 and 6 reuse the ratings' own
denominators; the three boundary rules carry `compare.ts` with no rule added; `yield-benchmark`'s recursing fixture
glob already covers the new fixture directory; `scripts/` being `FULL_ONLY` makes Slice 3 right to be a full suite;
`paid-path`'s check 20 already covers both new scripts; and Gate 1's register is within the house standard.
