---
status: current
authority: plan
---

# yield-compare — two sides of runs, compared under a rule fixed before any number is read

Status: stopped — the owner stopped it after three adversarial rounds refused all four gates; S-200
Decisions: D-022, D-025, D-027, D-043, D-047, D-050, D-062, D-086, D-088, D-094, D-096, D-100, D-102, S-016, S-017, S-020, S-028, S-035, S-046, S-070, S-072, S-090, S-098, S-099, S-111, S-115, S-129, S-149, S-150, S-153, S-155, S-158, S-161, S-162, S-163, S-164, S-172, S-176, S-177, S-178, S-182, S-184, S-185, S-186, S-188, S-191, S-192, S-193, S-196, S-197, S-198, S-199, S-200
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
>    (`packages/contracts/src/cinematic.ts:39`) carries the rule the plan was priced and admitted under, and
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
> **Round 2, in session 92, refused all four again on twenty-four findings** — every one recorded at the end of
> this file, twenty-three applied and one refused, with **S-199 amended** for the eight choices that moved. It
> corrected two further facts about the engine that the first draft had wrong, and they are named here for the same
> reason as the three above:
>
> 4. **A degraded shot IS filmed, from words.** `packages/pipeline/src/clips/index.ts:104` — _"the shots whose
>    picture was degraded, which are made from words (D-050 step 2)"_ — and `packages/contracts/src/render.ts:66-67`
>    gives it `{ kind: 'text-to-video', placed: true, degradation }`. It pays its video call. **The still fallback is
>    measure 6**, `StillHoldShot` (`render.ts:76-91`, D-025 rung 2), a shot held on its gated keyframe with no take
>    at all. Gate 1 described measure 6 twice and measure 5 not at all, and guard quantity 3's _"a degraded shot is
>    a shot not filmed"_ rested on a mechanism the engine does not have.
> 5. **A shot cannot carry two degradation rows.** `packages/domain/src/schema.ts:318` keys `degradation`
>    `primaryKey({ columns: [runId, shotId] })` and `:559` keys `still_hold` the same way, so there is at most one
>    row per shot per run. The distinct-shot numerator is kept as a defence, its stated reason is corrected, and the
>    hazard that is real — a row whose shot is **outside** the denominator, which is the inherited case — is what
>    check 4 pins instead of a fixture the record cannot hold.
>
> **Round 3, in session 93, refused all four again on eleven findings** — every one recorded at the end of this
> file, **all eleven applied and none refused**, with **S-199 amended a second time** for the five choices that
> moved. Seven were sufficient on their own. It corrected two more facts about this repository, named here for the
> same reason as the five above:
>
> 6. **A run that died in the plan stage HAS a receipt, so only three observed conditions go absent.**
>    `tests/fixtures/benchmark/taken-dead-in-plan.json` holds zero `plan` rows and **one `model_receipt`** whose
>    `model` is `MiniMax-M2.7`, and `lost_call.model` is `notNull` (`packages/domain/src/schema.ts:273`), so even
>    the planner-fetch-failed shape carries one. Condition 5 (`portModels`) is therefore **present and strict on a
>    plan-stage death**, and a planner model swap DOES refuse. Gate 1's risk said four conditions go absent and that
>    "a model swap on the other side refuses nothing"; three go absent, and the hazard that is real is a price
>    change, or a model swap on a port the run never reached.
> 7. **`redact()` is applied to every string of the written record, not only to prose.**
>    `scripts/benchmark.mjs:912-916` writes `--out` through
>    `JSON.stringify(record, (_key, value) => (typeof value === 'string' ? redact(value) : value), 2)`, and `:900`
>    puts `run: card.run.runId` in it. A run id is a 36-character UUID and `run.briefKey` is a full 64-character
>    SHA-256 (`measures.ts:1055`) — **both match "20 or more `[A-Za-z0-9_-]` with no space" exactly**. Widening
>    `redact()` itself would have rewritten the verified reader's own run ids, brief keys, picture ids and take ids
>    into the placeholder, with no check noticing: the committed ledger is built without `redact()`
>    (`benchmark.mjs:790-806`), so check 7 would have stayed green while `--out` was silently mangled. The widening
>    moves to a **second entry point used on caller prose alone**, and `redact()` is left exactly as it is.
>
> **Its gates were not written before this.** The sections above them record what the feature owns, what three
> adversarial rounds in session 83 settled or left open, and the nine choices the gates had to make. No
> implementation file until all four are approved (CLAUDE.md rule 1).
>
> ---
>
> **STOPPED 2026-10-16 by the owner, in session 93 — S-200.** After three fresh adversarial rounds refused all
> four gates (22, 24 and 11 findings; 57 in all, 56 applied and 1 refused), the owner stopped the feature rather
> than approve it by decision or run a fourth round: _"No just leave it, we should just build the view part of it
> and end the benchmark."_ **No implementation file of this feature is ever written.** Everything below this line
> is kept as the record of what the comparison would have been and of 57 real faults found in a specification,
> several of which are facts about the engine that cost a reviewer each to establish — a degraded shot is filmed
> from words, a shot cannot carry two degradation rows, a plan-stage death still writes a `model_receipt`, and a
> widened `redact()` would have erased the scoring half's own run ids.
>
> **What stopping costs is in S-200 and is not softened here**: nothing in this repository will say whether an
> engine change helped, and the engine's own spread on one brief with nothing changed is wider than most real
> improvements — brief `f984199a` rates 3.0, 10.0, 10.0, 38.5 and 45.7 over five runs, and brief `db460dea`'s
> higher-rated run made no reel while its lower-rated one did. **A later session that wants that claim back
> reopens these gates**, which is why they are kept rather than deleted.
>
> **Two sections below are now void**, and are left in place rather than edited so the record reads as it was
> reviewed: the Deferred section's claim that `benchmark-view` reads **this feature's** written record — it reads
> the scoring half's `--out` instead (S-200) — and Gate 4's four slices, which will not be built. **The stratify
> view survives as `benchmark-view`'s**, figures and all; only its uncertainty band was this feature's arithmetic,
> and whether the page carries one is that feature's gates to settle.

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
at the least; a zero delta counts as not moved; a group where the measure is undefined on one side is dropped; and
that **the engine's code version is reported "not recorded"** on every comparison until `run-provenance` records it.
(S-182's companion clause about the picture rule is corrected above, by the scoring half as built.)

**The fingerprint's fields are NOT in that list, and round 2 was right that listing them was a contradiction.**
S-199 part 6 supersedes exactly them: four of S-182's conditions are dropped as vacuous, _"whether standalone
pictures exist"_ is dropped as redundant, and each port's models are added. Two more of S-182's comparability
items go the same way and are named here rather than dropped in silence: its sentence reads _"Comparability is
what the record holds: `until`, **the measures version, the rating stamp**, and a fingerprint of …"_
(`DECISIONS.md:7846-7847`), and **neither is a condition here** — a comparison is one invocation of one reader, so
this feature's own `c1` and the scoring half's stamps cannot differ between its two sides. They are printed, which
is what the "Printed, not conditions" section below says. S-199's amendment records this as a seventh superseded
part rather than letting "in six named parts, and in nothing else" stand while nine fields moved.

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
much of the pictures, the filmed takes and the finished cuts were refused; how often a shot was filmed from words
instead of from a picture of its own; how often a shot ran out of attempts at the camera and was held on its picture
as a still; what a run cost; and how long a run took. Every one of them is
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
  pictures they contain. **What does move at four runs a side is one run in four against four in four**; two in
  four against four in four does not. All three are pinned beside each other, so the line between a claim and no
  claim is a check rather than a sentence.
- **A side whose runs died early is comparable on almost everything, by construction.** Four of the seven
  comparability conditions are read off what a run produced, and a run that died in the plan stage produced **three
  of the four**: it has no selected plan and no priced receipt, so the price set, the planned image calls and the
  picture rule are all absent — but **it has asked a model, so the models set is present and strict**. An absent
  field matches any value, because refusing on absence would drop exactly the runs the first six measures are
  about. The honest consequence, corrected by round 3, is that **a price change refuses nothing when one side died
  early, and neither does a model swap on a port the run never reached — while a swap of the planner's own model
  does refuse.** The output says which fields were absent on which side, and the declared change is printed beside
  every verdict.
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

| place                                     | what it gains                                                                                                                                                                                                                                                            | what it still may not do                                                                                                           |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| `packages/benchmark/src/compare.ts`       | sides, grouping by brief key, the fingerprint's fields, the eight measures, both bands, the per-group vote, each measure's word, the credit guard, stratify, the sides validator                                                                                         | no I/O, no database, no engine package, no app, **no npm package at all**, and no `node:crypto` — the hash is handed in            |
| `packages/benchmark/src/measures.ts`      | one field: `planVaryOn` on the scorecard's run block, with its `FIELD_COLUMNS` entry                                                                                                                                                                                     | nothing else; this is an amendment to a verified feature and is listed below                                                       |
| `packages/benchmark/src/index.ts`         | the new exports, since a package is entered only through it (D-094)                                                                                                                                                                                                      | nothing else; it re-exports and holds no logic                                                                                     |
| `scripts/_benchmark-rows.mjs`             | the read-only open, the held-column read, one run's rows, **every run's ids for the record-wide pass**, the run-id prefix resolution, **`redact()` unchanged** and **`redactProse()` beside it** — all **moved out of `scripts/benchmark.mjs`**, which imports them back | no measure, no verdict, no printing, no `process.exit` of its own — it returns rows and faults; **start no process**               |
| `scripts/benchmark-compare.mjs`           | the reader: flags, the sides document, SHA-256 for the brief key and the fingerprint's label, **the record-wide count of brief groups that could supply two runs a side**, the printed comparison, the written record                                                    | compute no measure of its own, write to the record, **start ANY process at all**, construct a port, read a key, spend              |
| `scripts/check.mjs`, `scripts/_pools.mjs` | one comment each: the PATH-only children become **thirteen**, and `_pools.mjs`' "274 file executions of 153 files — 153 direct and 121 nested" is recomputed for the thirteenth child and this feature's four ordinary files                                             | nothing else — both are `VERIFY_INFRASTRUCTURE` (`scripts/check.mjs:211-228`), which is one of the reasons Slice 3 is a full suite |
| `tests/fixtures/benchmark/compare/*.json` | the constructed run sets the checks read                                                                                                                                                                                                                                 | hold any path but the literal placeholder, which `yield-benchmark`'s check 12 already enforces here because its glob recurses      |
| `tests/yield-compare-*.test.ts`           | the fourteen checks                                                                                                                                                                                                                                                      | read `data/cutroom.sqlite`, need a key, or start the engine                                                                        |

**What `compare.ts` is handed, stated because it is the most basic open question of choice 8.** Each side arrives as
a label and a `readonly RunRows[]` — the same row shape `scorecard()` takes — together with **a `HashFn`**, exactly
as `ScorecardOptions` already requires one (`measures.ts:855-861`). It calls `scorecard()` and `termInputs()`
itself, so no column is read twice in two ways, and it imports no hashing of its own, which is what
`benchmark-no-io`'s denial of `node:crypto` means here. **The record-fault function takes one thing more**: the
resolution the reader performed — each written id with the run ids it matched — because a record fault is "this id
matched none" or "these two ids matched one run" and neither is decidable from the rows of two sides alone. Round 3
found that sentence missing while the faults themselves were specified three sections later.

**The compare reader starts NO process, and that is stricter than the first two rounds left it — round 3's
finding.** Gate 2 had permitted it `git rev-parse`, which looks harmless and is not:
`tests/yield-benchmark-reader.test.ts:249-250` does not build a set, it builds an order- and count-exact list —
`const processes = [...source.matchAll(/\brun\('([^']*)'/g)].map(...)` then `assert.deepEqual(processes, ['git'])` —
and S-199's amendment runs that clause over the **concatenation** of the three reader files precisely so that
"starts no process but git" stays exhaustive rather than exemplary. `scripts/benchmark.mjs:850` is the one existing
`run('git', ['rev-parse', '--short', 'HEAD'])`. A second one in the compare reader makes the concatenation
`['git', 'git']` and the clause **red**, and the only ways to make it green again are to forbid the compare reader
a process or to make the assertion set-based — and lowering an exhaustive count to pass is exactly what CLAUDE.md
rule 3 forbids and what this feature's own amendment list promises not to do. **So the permission goes, not the
assertion.** The comparison record carries no commit stamp; nothing asked for one, and `benchmark-view` reads the
record's figures (S-184).

**The record-wide count is the READER's, and it is not the surviving-group count in disguise.** Gate 1 promises
that the first thing this feature does on the record is print how many brief groups could supply two runs a side,
and `compare.ts` cannot answer it: it is handed two sides' rows and knows nothing of the runs on neither side.
So the count is a pass of the reader's own, over every run in the record — the same enumeration `--stratify` with
no `--sides` already needs — which asks the package for each run's brief key and fingerprint fields and counts the
groups holding two or more runs whose fingerprints match, and the groups holding four or more beside it. It is
printed on every comparison, in the limits block, labelled as being about **the record** and not about the sides.
Check 11 pins it against a temporary database whose groups are known, which is the one place it can be shown not
to be a restatement of the surviving groups.

**`redact()` moves into the shared module with the loader, and the widening is a SECOND function beside it —
round 3's finding, and the one place this feature could have silently broken a verified feature's output.**
`redact()` exists once today, at `scripts/benchmark.mjs:187-191`: it strips the artifact and repository roots and
replaces `/\bhttps?:\/\/\S*/g` with `<url>`. **It matches no key shape and no bare query string**, so a second copy
in a second reader would be a second place that knows D-022 — the argument that moves the loader, applied to the
same file. It moves, both readers import it, and the three-file scan then covers it.

**What it may NOT do is gain a key shape, because its call site is total.**
`scripts/benchmark.mjs:912-916` writes the `--out` record through
`JSON.stringify(record, (_key, value) => (typeof value === 'string' ? redact(value) : value), 2)` — **every string
the record holds** — and `:900` puts `run: card.run.runId` in it. A run id is a 36-character UUID
(`9cdadf20-5114-401f-b9e2-edb9b555403c`, `docs/research/benchmark.md:21`) and `run.briefKey` is a full
64-character SHA-256 hex (`measures.ts:1055`); both are 20 or more characters of `[A-Za-z0-9_-]` with no space. A
widened `redact()` would rewrite the scoring half's own identifiers into the placeholder, and **nothing would
catch it**: the only assertion over the written record is a prose prompt (`tests/yield-benchmark-reader.test.ts:222-226`,
which has spaces and survives) and the committed ledger is built without `redact()` at all
(`benchmark.mjs:790-806`), so check 7 would stay green. This feature's own comparison must name the runs on each
side, so it would have mangled itself too.

**So the shared module exports two functions, and the gates say which string gets which.** `redact()` is
**unchanged, byte for byte** — the record's redactor, applied by both readers' `JSON.stringify` replacer exactly as
`benchmark.mjs` applies it today. **`redactProse()` is new**: it calls `redact()` and then also replaces a bare
`?`-introduced query string and a run of 20 or more characters from `[A-Za-z0-9_-]` carrying no space, which is what
every key this repository has seen looks like. It is applied **only to the strings this feature takes from the
sides document** — both labels and `declaredChange` — and it is applied **as the document is read**, so what enters
the record is already redacted and the record's own replacer never sees a key. One module, two scopes, one place
that knows D-022. **Nothing is widened that was not widened before, and nothing is narrowed**: check 11 asserts
`redact()`'s two replacements unchanged, the three shapes firing on caller prose, **and a run id and a brief key
surviving the written record intact** — which is the assertion that would have failed.

**No npm dependency is added, and the sides document is validated by hand.** `packages/benchmark/package.json`
declares `@cutroom/contracts` and `@cutroom/reel-contract` and **no `zod`**, so a `zod` schema would need that
manifest and the root `pnpm-lock.yaml` — both in `check.mjs`'s `FULL_ONLY` (`scripts/check.mjs:229-235`), which
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

|   # | measure               | the figure one run contributes                                                       | its denominator                        | better |
| --: | --------------------- | ------------------------------------------------------------------------------------ | -------------------------------------- | ------ |
|   1 | reels made            | `run.reel.madeAFile` (`measures.ts:1077`): a result video path AND a readable render | the side's runs in the group           | up     |
|   2 | pictures refused      | pictures Gate 1 decided that it did **not** accept, over those it decided            | pictures with a decided Gate 1 outcome | down   |
|   3 | takes refused         | takes whose `take.outcome` is `fail`, over those with an outcome                     | takes whose `outcome` is not null      | down   |
|   4 | finished cuts refused | this run's Gate 7 outcome was not `accept`, with `render.finished_at` set            | one figure per finished run            | down   |
|   5 | shots degraded        | **distinct shots** with a degradation row this run wrote, over shots tried           | shots a picture was attempted for      | down   |
|   6 | shots held at the cap | distinct shots with a `still_hold` this run wrote, over shots tried                  | shots a take was made for              | down   |
|   7 | cost per run          | this run's own receipts — image, video, speech and lost calls                        | one figure per run                     | down   |
|   8 | wall clock per run    | the run's created-to-last-event seconds                                              | one figure per run                     | down   |

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

**Measures 5 and 6 count distinct shots, not rows — and the reason the first draft gave was false.** It said a
shot can carry more than one degradation row. It cannot: `packages/domain/src/schema.ts:318` keys `degradation`
`primaryKey({ columns: [runId, shotId] })` and `:559` keys `still_hold` the same way, so there is **at most one row
per shot per run** and rows and distinct shots are equal today. The distinct-shot numerator is kept anyway, as a
defence that costs nothing against a migration that relaxes either key, and `scorecard().parts.pictures.shotsDegradedThisRunMade`
counts rows (`measures.ts:1204`). **The hazard that is real is the other one**: a `degradation` or `still_hold` row
whose shot is **outside** the measure's denominator, which is exactly what an inherited failure rewritten under the
new run produces — the row is the new run's, the shot's pictures are not. The numerator is the distinct shots those
rows name **that the denominator holds**, and check 4 pins that case instead of a fixture the record cannot hold.

**Measure 4 reads the gate's own word.** `scorecard().parts.cut.gate7.outcome` (`measures.ts:1255`) is Gate 7's
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
reads `absent`.** `wallClockSeconds` is `absent` for a run with no events (`measures.ts:393-399, 1096`), and
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

**Two deltas exist for measure 1, and which one decides is one sentence: the ADJUSTED delta decides both `moved`
and the direction; the RAW delta decides the zero rule alone.** Both are printed. The adjusted delta is what the
band is an interval around, so comparing the raw delta against it would mix two estimates; and the raw delta is
what "the two sides are the same" means to a reader, so the zero rule belongs to it. For measures 2 to 8 there is
one delta — a difference of means — and nothing to choose.

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

That also answers **the second of the five open questions S-182's amendment hands this feature — the pooling
scope** (`DECISIONS.md:7915-7916`: _"the band's wording, the pooling scope, the guard's missing quantity, which
comparability conditions are not vacuous, the verdict's unit"_) — by removing the question behind it. Whether a
group dropped for one measure keeps its counts in that measure's pool cannot arise, because that measure has no
pool. **Those words are this file's, not S-182's**: round 2 found them set as a quotation of an entry that does not
contain them, which is round 1's finding 18 recurring, so they are stated plainly here instead. A group is dropped
for one measure and keeps every other.

**How a group votes, for one measure.**

0. **The sign convention, once, because the guard reads it too**: `delta = B − A`, where A is the first side of the
   sides document. The measure table's `better` column says which sign is the better one for that measure.
1. The group is **dropped** when either side has fewer than two runs in it, or when fewer than two of a side's runs
   contribute to that measure.
2. A surviving group votes **helped** or **hurt** when `|delta| > 2 × band` and the direction is the better or the
   worse one for that measure. Otherwise it votes **inside the noise**.
3. A raw delta of exactly zero votes inside the noise, whatever the band (S-182, settled).
4. A band of exactly zero **with a non-zero delta** votes **no verdict**, with its reason.

**Clause 3 wins over clause 4, and that is the whole precedence.** A zero band with a zero delta is two sides that
produced identical figures — two sides each `(15, 15)` on cost, which the record's three 15¢ runs make a real shape
— and `|0| > 2 × 0` is false, so the arithmetic and S-182's settled rule already agree on _inside the noise_
without clause 4 being consulted. Clause 4 exists for the other case alone: a zero band with a delta that is not
zero, where the strict inequality would read **moved** on no uncertainty at all. Written as one rule: clause 4
fires when `band = 0` and `delta ≠ 0`.

**How a measure gets its word, from the groups' votes.**

1. Fewer than three surviving groups ⇒ **no verdict**, naming how many survived and why each one dropped.
2. A group voting **no verdict** is surviving but **not comparable**. When fewer than `ceil(2/3 × surviving)` groups
   cast a comparable vote — helped, hurt or inside the noise — the measure reads **no verdict**, naming the groups
   whose band bounded nothing.
3. **helped** when at least `ceil(2/3 × surviving)` groups vote helped **and no group votes hurt**.
4. **hurt** when at least `ceil(2/3 × surviving)` groups vote hurt **and no group votes helped**.
5. Otherwise **inside the noise** — and where both directions are voted, **no verdict**, naming the groups that
   disagree.

**Clause 2 is round 1's finding 10 one level up, and round 2 found it surviving there.** Without it, three
surviving groups voting {helped, no verdict, no verdict} fail the two-thirds test and fall through to _inside the
noise_ — "the two sides differ by less than the measurement can see" — although two of the three had a band of
zero, where this feature's own words are that "the measurement sees everything". The zero-band rule would have been
fixed at the group level and undone at the measure level. **Rejected: any zero-band group forcing the measure to no
verdict**, which would make cost and wall clock unanswerable whenever one group of runs happened to cost the same
integer cents; the two-thirds-of-comparable rule keeps the answer where two thirds of the groups could be compared
and names the ones that could not.

The ceiling makes the two-thirds rule exact: 2 of 3, 3 of 4, 4 of 5, 4 of 6. Clause 2's second half is stricter
than S-182's words and deliberately so: two groups helped and one hurt is a sign reversal across briefs, and
calling that "helped" is the wrong-verdict failure the owner's reason rules out.

### The credit guard, and its five quantities

**Credit is withheld when the work got smaller.** Each guard quantity is measured per group, over the same runs,
with the band stated two paragraphs below — and fires when it has **moved in the direction of less work**, which by
the sign convention above means `delta` has the sign the quantity's `less work is` column names.

|   # | quantity                                       | the figure one run contributes                         | less work is | why it is in the guard                                                          |
| --: | ---------------------------------------------- | ------------------------------------------------------ | ------------ | ------------------------------------------------------------------------------- |
|   1 | shots the plan asked a picture for             | `parts.pictures` — shots with at least one own picture | down         | fewer pictures attempted lowers cost and lowers the refusal rates               |
|   2 | accepted pictures per shot that ended accepted | own accepted pictures over those shots                 | down         | the picture rule's reach; S-182's own quantity                                  |
|   3 | shots degraded (measure 5)                     | the same figure as measure 5                           | up           | a degraded shot is filmed **from words**: no image spend, no gated keyframe     |
|   4 | the selected plan's shot count                 | `parts.plan.shots` (`measures.ts:1159`)                | down         | **the missing quantity** — fewer shots lowers cost, time and every refusal rate |
|   5 | the selected plan's total planned seconds      | `parts.plan.totalSeconds` (`measures.ts:1161`)         | down         | **the missing quantity** — shorter shots do the same without changing the count |

**The guard's band, which is not the measures' band, and round 2 showed why it cannot be.** Quantities 1, 2, 4 and
5 are **not bounded rates**: a shot count, a seconds total and a pictures-per-shot ratio are unbounded above. So:

- **Their band is bare Welch, never the floor.** The floor is the share band built from `a = mean × n`, which is
  defined only for a mean in `[0, 1]`: four runs each planning six shots give `pA' = (24 + 1) / 6 = 4.17`, whose
  `pA'(1 − pA')` is negative and whose band is `NaN`. A rule that silently produces `NaN` is worse than a wrong
  rule, because `NaN > x` is false and the guard would never fire while every check passed.
- **A band of exactly zero FIRES the guard, where it votes no verdict for a measure.** This is the one place the
  two arithmetics part, deliberately, and the asymmetry is the conservative direction in both halves: claiming a
  verdict on no uncertainty over-claims, which is why clause 4 exists; **withholding credit on no uncertainty
  under-claims**, which is the safe side of a guard whose whole purpose is to refuse a credit. Round 2's finding is
  exactly this case and it is the guard's most important one: a side whose every run plans six shots against a side
  whose every run plans four has a sample variance of zero on both sides, so bare Welch is zero, and under the
  measures' clause 4 the group would vote _no verdict_ — **the guard would never fire on `plannedShots` or
  `plannedSeconds` at all**, which are the two quantities that exist to catch a change that simply does less work.
- **Quantity 3 keeps measure 5's own band**, floor included, because it is the same bounded rate read twice.

**The guard's vote across groups, clause by clause, because "the measure rule's" left two things undecided and
round 3 showed both change the answer.** A guard quantity does not survive in the same groups as the measure it
guards: `parts.plan.shots` is `ABSENT` with no selected plan (`measures.ts:1159`, `plan?.shots.length ?? ABSENT`),
so a side holding two plan-stage deaths drops the group for `plannedShots` while measure 1 — never undefined —
keeps it.

1. **The group-dropping minimum applies**, exactly as it does to a measure: fewer than two runs a side contributing
   to the quantity drops that group for that quantity, and the output names how many groups it survived in.
2. **The three-surviving-group minimum does NOT apply, and this is a choice.** Read as "the measure rule's", a
   quantity surviving in two groups would read no verdict and the guard would **never fire** — so a change that
   plans fewer shots buys its credit by dying early on one side, which is the precise failure quantities 4 and 5
   were added to catch. **The guard fires on at least `ceil(2/3 × surviving)` of its OWN surviving groups, whatever
   that number is, including one**, and the count is printed beside the firing quantity's figures. This is the same
   asymmetry as the zero band, read the same way: claiming a verdict on thin evidence over-claims, while
   **withholding credit on thin evidence under-claims**, and "no verdict" is the word a withheld credit reads.
3. **"And none moving the other way" does NOT carry over, and that too is a choice rather than an import.** Its
   justification at measure level is that a sign reversal across briefs makes a "helped" the wrong verdict. Inside
   a guard it reverses: two groups planning fewer shots and one planning more would leave the guard silent and the
   credit standing, on evidence that the work got smaller in most of the briefs. So **a group moving the other way
   is named in the output and does not silence the guard.** Rejected: importing the clause unexamined, which is
   what the first two rounds did; and firing on a single less-work group out of many, which clause 2's two-thirds
   threshold already excludes.
4. A group that cannot be compared at all does not fire and is named.

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

|   # | condition                               | where it is read                                                                                                                                           | why it is not vacuous                                                               |
| --: | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
|   1 | `until`                                 | the stored request's options                                                                                                                               | it decides which parts can exist, so it decides which measures are even defined     |
|   2 | the ceiling (`budgetCents`)             | the stored request's options                                                                                                                               | it decides when a run stops; S-182 named no condition for it at all                 |
|   3 | `planVaryOn`                            | the stored request's options (D-062)                                                                                                                       | it decides what the two fork plans differ on, so it changes what was selected       |
|   4 | each priced receipt kind's rates        | `rate_cents`, as a set, on the **three** kinds that carry one: `generation_receipt` (`schema.ts:245`), `speech_receipt` (`:365`), `video_receipt` (`:441`) | a price change moves cost per run with nothing about the engine having changed      |
|   5 | **each port's models**                  | `model`, as a set, on the **five** kinds that carry one: those three plus `model_receipt` (`:137`) and `lost_call` (`:273`)                                | a model swap at an unchanged price — nano-banana-2 to flux-2-pro happened here      |
|   6 | the selected plan's `plannedImageCalls` | the selected plan                                                                                                                                          | a service setting (`CUTROOM_PICTURES`, S-150, S-153) changes how many are attempted |
|   7 | the picture rule                        | `Plan.pictures` on the selected plan                                                                                                                       | **read, not "not recorded"** — the correction at the top of this file               |

**The seven identifiers, written once, because check 6 asserts a list deep-equal to them.** Four of the seven exist
in the table above only as English, and a check cannot be deep-equal to a sentence. The exported field list is
exactly, in this order:

```text
until  ceilingCents  planVaryOn  receiptRates  portModels  plannedImageCalls  pictureRule
```

These are the same seven names `declaredAxis` accepts, which is the point: one list, two readers. `ceilingCents` is
the scorecard's own name for the request's ceiling (`measures.ts:1057`), not `budgetCents`, which is what the
request calls it.

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
exist only as far as a run got. Refusing on absence would drop exactly the runs that died early, which are the runs
measures 1 to 6 are about, and **every verdict would be biased toward "helped" by construction**. So `absent`
matches any value, the output says which fields were absent on which side, and the fingerprint stays strict wherever
it can be read. Rejected: treating `absent` as a distinct value, which is the same bias written differently.

**Which of the four actually go absent on a plan-stage death is measured, not assumed — round 3's finding, because
it is the premise of check 6's absent case.** The first two rounds let stand "a run that died in the plan stage has
no selected plan and no receipts at all", and the committed corpus says otherwise:
`tests/fixtures/benchmark/taken-dead-in-plan.json` (the real run `cd9648c9`) holds **zero `plan` rows and one
`model_receipt`**, role `planner`, `model` `MiniMax-M2.7`. Condition 5 reads `model` on `model_receipt`
(`measures.ts:1171`, its `FIELD_COLUMNS` entry at `:1380`) and on `lost_call`, whose `model` column is `notNull`
(`packages/domain/src/schema.ts:273`) — so a run that only ever lost its planner call carries one too. **Three
conditions go absent on an early death — `receiptRates`, `plannedImageCalls`, `pictureRule` — and `portModels`
does not.** Check 6's absent case is built on those three, and a fixture built on "no receipts at all" would have
exercised `portModels` as absent where the record makes it present.

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
   figures, and **the record-wide count** of brief groups that could supply two runs a side with the count reaching
   four beside it — the reader's own pass over every run in the record, labelled as such, because the surviving
   groups of this comparison are a different number and printing one as the other would answer Gate 1's promise
   with the wrong figure.

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
word**, because a stratum is one set and a verdict needs two sides. A stratum with fewer than two members is
reported with its count and no band.

**One band per figure KIND, not one band for stratify, because three of the five properties stratify per-run
figures that are not shares.** Round 2 found the single rule produced `NaN`: the adjusted-count form on a mean of
53¢ over four runs gives `p' = (212 + 1) / 6 = 35.5` and a negative variance under the root. So:

- **a share** — the two picture-unit properties, and `reels made` wherever a run-unit stratum reports it — carries
  the single-side adjusted band, `p' = (x + 1) / (n + 2)` and `band = sqrt( p'(1 − p') / (n + 2) )`, the same two
  integers the comparison's share band adds;
- **a per-run figure** — every other measure inside a run-unit stratum, cost and wall clock among them — carries
  the standard error of its own mean, `s / sqrt(n)`, from the sample variance with the `n − 1` denominator;
- **a band of exactly zero prints as zero with its reason**, never as absent and never suppressed: a stratum
  carries no verdict word, so there is nothing for a zero band to over-claim, and hiding it would hide that every
  member of the stratum held the same figure.

**The unit is per property, because the record's properties are not all per run.** Session 82's finding strata
**pictures**, not runs: `scorecard().parts.plan.subjectsPerShot` is an array with one entry per shot
(`measures.ts:717-720`), so a run is in no single such stratum.

| property            | the unit | the strata                                                       | the figure                      |
| ------------------- | -------- | ---------------------------------------------------------------- | ------------------------------- |
| `subjectsPerShot`   | pictures | the subject count of the shot each picture belongs to            | share of those pictures refused |
| `pictureRule`       | pictures | the rule the run's selected plan carried                         | share of those pictures refused |
| `shots`             | runs     | the selected plan's shot count                                   | each measure, over those runs   |
| `plannedImageCalls` | runs     | the selected plan's planned image calls                          | each measure, over those runs   |
| `imageToVideo`      | runs     | `none` (0), `mixed` (between), `all` (1), `no takes` — see below | each measure, over those runs   |

**`imageToVideo`'s strata are a share this feature computes, and the scorecard exposes no such share.**
`parts.clips.imageToVideo` (`measures.ts:1222`) is a **count** of the run's own takes whose mode is
`image-to-video`, with `textToVideo` beside it at `:1223`. The share is that count over the sum of the two, and the
four strata are `none` at exactly 0, `all` at exactly 1, `mixed` strictly between — and **`no takes` for a run
where the sum is zero**, which is a stratum of its own rather than a division by zero or a silent exclusion,
because a run that made no take is a real and common ending and the strata are supposed to cover the record.

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

**And a positive control in the same check**, because a green null alone proves only that nothing was computed: a
fixture of three groups where every group's runs differ by none-against-all, which must read **helped** on reels
made. A null that passes while the control fails is an arithmetic that answers nothing; a control that passes while
the null fails is an arithmetic that over-claims.

**The control is its own fixture, at FOUR runs a side, and round 2 is why the size is stated.** The null's groups
split two against two, and at two runs a side this feature's own check 1 pins `0/2` against `2/2` as _inside the
noise_ (adjusted +0.5000, band 0.3062) — so a control built by re-reading the null's fixture could not read
_helped_ whatever the arithmetic did, and the check would have been green with the control proving nothing. The
control is therefore **twenty-four constructed runs over three brief keys, eight to a group, split four against
four**, where check 1's third row (`0/4` against `4/4`, adjusted +0.6667, `2 × band` 0.4303) is what makes _helped_
reachable. **Its two sides hold identical attempted work**, so no guard quantity moves and the guard cannot turn
its _helped_ into _no verdict_: side A's runs plan the same shots and seconds, attempt the same pictures and takes
and reach a finished render whose `output.readable` is `false`, which is the one way `run.reel.madeAFile`
(`measures.ts:1077`) reads false on a run that attempted everything. That shape is the control's whole
construction, and check 9 asserts the guard did not fire in it.

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

**`yield-benchmark` — one test assertion must move and grow, one fixture gains a field, and three scans split by
clause.** `tests/yield-benchmark-reader.test.ts` reads `scripts/benchmark.mjs`' **source text** (`:234-266`) and
asserts, among other things, that it holds exactly one `new DatabaseSync(` and that the open is
`{ readOnly: true }`. With the open in `scripts/_benchmark-rows.mjs` the count is 0 and both assertions go red —
and worse than red: every other clause in that block is a scan of that one file, so code moved out of it would be
**scanned by nothing** while the check stayed green. That is a check whose property is unguarded, which CLAUDE.md
rule 3 exists to prevent.

**Round 2 found three things wrong with the first revision of this list, each verified in the source.**

1. **`READER` is the entry script, not the scanned set.** It is defined at `:41` and used four times: `:82` spawns
   it, `:234` scans it, and `:412` and `:424` pass its own path as a not-a-database `--db` and read it back.
   Turning `READER` itself into a list reddens the three behavioural uses. So the scan gets **its own constant**
   and `READER` is left exactly as it is.
2. **Three clauses are POSITIVE assertions and cannot run per file.** `:240`'s `readOnly` match, `:250`'s
   `assert.deepEqual(processes, ['git'])` and `:251`'s `run('git', ['rev-parse'` match all fail against
   `scripts/_benchmark-rows.mjs`, which starts no process at all and must not start one. Each clause therefore
   states its own scope, and the strongest of the three — the `processes` deep-equal, which makes "starts no
   process but git" exhaustive rather than exemplary — **was missing from the first revision's list entirely**,
   which is how a clause is lost.
3. **The `planVaryOn` field cannot be proved by the corpus as it stands, so `yield-benchmark`'s check 1 goes red.**
   That check (`tests/yield-benchmark-measures.test.ts:155`) proves every `FIELD_COLUMNS` entry against its
   columns: mutating the named column must move the field somewhere in the corpus. **No committed fixture carries
   `planVaryOn`** (measured: zero occurrences under `tests/fixtures/`; every taken fixture's options are
   `{"budgetCents":250,"until":"video"}`), each mutation in the ladder (`:131`) makes the blob unparseable so the
   field reads `ABSENT` before and after, and the `undefined` rung cannot drop the single `run` row because
   `mutate` (`:134-141`) requires an array and `rows.run` is one object (`measures.ts:291`). An empty column list
   fails too: the no-column branch (`:186-200`) allows only `NOT_RECORDED`, `ESTIMATE_EXCLUDES`, `SHARED_SPAN`,
   `REACHED_BY.*` and `undefined`, and not `ABSENT`.

| where                                                       | what changes                                                                                                                                                                                                                                                                                                                                                                                           |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `tests/yield-benchmark-reader.test.ts:41`                   | `READER` is **unchanged**; a new constant beside it names the three reader files, and `:234`'s read becomes a read of each                                                                                                                                                                                                                                                                             |
| `tests/yield-benchmark-reader.test.ts:235-240`              | the `new DatabaseSync(` count of **1** is asserted over the three files **together**, and `:240`'s `readOnly` match against the one that holds the open                                                                                                                                                                                                                                                |
| `tests/yield-benchmark-reader.test.ts:241-246`, `:252-255`  | every NEGATIVE clause runs over **each** of the three: `openDatabase`, `@cutroom/providers`, `@cutroom/domain`, the five process starters, the four environment names, the `.env` regex                                                                                                                                                                                                                |
| `tests/yield-benchmark-reader.test.ts:249-251`              | `assert.deepEqual(processes, ['git'])` and `:251`'s `run('git', ['rev-parse'` match run over the **concatenation** of the three, so the set of processes stays exhaustive and the pure loader is not forced to start one                                                                                                                                                                               |
| `tests/yield-benchmark-reader.test.ts:260-267`              | the spender's name, built rather than written, runs over **each** of the three and over this feature's reader test too                                                                                                                                                                                                                                                                                 |
| `packages/benchmark/src/measures.ts`                        | the scorecard's run block gains `planVaryOn` from the stored request's options, with its `FIELD_COLUMNS` entry                                                                                                                                                                                                                                                                                         |
| **one committed fixture under `tests/fixtures/benchmark/`** | its `request_canonical` options gain a `planVaryOn`, which is what lets `yield-benchmark`'s check 1 prove the new field. **An eleventh fixture is refused**: check 4 pins `groups.size` at **9** and the shared pair by name (`tests/yield-benchmark-measures.test.ts:693-694`), so a new file breaks it either way, while `options` sits outside the brief key and an edit there moves neither number |
| `tests/yield-benchmark-measures.test.ts`                    | **not edited.** Check 1 and check 4 both stay exactly as written; the fixture edit is what keeps them green. It is **named in Slice 2's `--slice` list**, because round 3 moved the field and the fixture there                                                                                                                                                                                        |
| `packages/benchmark/src/index.ts:8`                         | one comment sentence: _"It computes no band, no delta and no verdict: those are `yield-compare`'s (S-184)"_ is falsified the moment Slice 1 lands `compare.ts` in the package. **Round 3's finding** — the same class of live claim this file enumerates so carefully for "twelve", in the file the first slice edits. `ratings.ts:9`'s identical sentence is about `ratings.ts` and stays true        |
| `docs/features/yield-benchmark.md`                          | an amendment block recording all of it, in the form S-197 set — **its gates are not edited**                                                                                                                                                                                                                                                                                                           |

**The scan gets strictly wider, not narrower**: one file scanned today, three after, with the exhaustive clause
still exhaustive over all three. No assertion is removed, no regex loosened, no count lowered, and no pinned value
of a verified check is touched — the fixture is edited so that the checks can stay as they are. **The exhaustive
clause is what forbids the compare reader a process**, two sections above: it is an order-exact list, not a set,
and this feature answers it by starting nothing rather than by loosening it.

**One disagreement with S-199's amendment is recorded rather than resolved in silence.** Its item 6 puts all three
positive assertions, the `readOnly` match included, over the three files' **concatenation**; the table above puts
the `readOnly` match **against the one file that holds the open**. The table's form is the stronger of the two — a
concatenation would pass if any of the three held a `readOnly` open, while naming the file pins which one does — so
the gates keep it and the second amendment to S-199 records the correction.

**`scripts/benchmark.mjs` is NOT "otherwise unchanged", and Gate 3's file table said it was.** The open
(`:234`), `heldColumns()` (`:244`), `absentColumns()` (`:274`), `rowsOf()` (`:288`) and the `--run` prefix
resolution (`:306-319`) are top-level and fault through `process.exit(1)` and `unusable()` (`:116-118`). A module
that returns rows and faults instead of exiting means every call site and both fault paths are rewritten, and
**`yield-benchmark`'s check 6 — `--run` on a prefix matching two runs exits 2 — is what must stay green through
it**, along with its exit codes and messages unchanged.

**The thirteenth PATH-only child.** `tests/yield-compare-secrets.test.ts` joins the secrets pool by name alone
(`SECRETS_FILE` in `scripts/_pools.mjs:21`), and `tests/check-pools.test.ts:167` asserts `secrets.length >= 12`, so
no bound breaks. Two things do:

- **`tests/check-pools.test.ts:174-187` asserts the `function bareEnvironment` marker in BOTH directions**, and the
  first revision of these gates named one. Every file in the secrets pool must contain it, **and** `pathOnly` — the
  ordinary files that contain it — must be deep-equal to `[]` (`:183-187`). So this feature's secrets child must
  hold a function of exactly that name, and its **four ordinary test files must not**. Check 13 names both.
- **The prose count of twelve becomes thirteen**, and the ordinary-file count rises by this feature's four other
  test files. **Round 2 found the first revision's enumeration incomplete and three of its line numbers stale**,
  which matters more here than anywhere else in this file: S-197 already established that no mechanical check can
  read an English count, so **the enumeration IS the instrument**. **Round 2's own count was then wrong in three
  ways, and session 93 re-measured it before round 3 rather than handing the round an instrument to recount** — the
  same thing session 92 did with the eleven band values. Re-measured by `grep -rin twelve` over the repository,
  excluding `.git`, `node_modules`, `steering-ref` and the gitignored `.artifacts/`:

| where                                          | occurrences | what it claims                                                                                                                                             |
| ---------------------------------------------- | ----------: | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CLAUDE.md:184`, `:196`                        |           2 | the children, in both suite paragraphs                                                                                                                     |
| `docs/context.md:204`, `:217`, `:224`          |           3 | the children; **round 2 cited `:183`/`:196`/`:203`, stale by 21 lines against its own appended entry** — the third carries the 274/153/121 figures as well |
| `scripts/run-tests.mjs:4`                      |           1 | the children, in the runner's own comment                                                                                                                  |
| `scripts/impact-map.mjs:133`                   |           1 | the children, in the derivation comment                                                                                                                    |
| `scripts/check.mjs:57`                         |           1 | **found by round 2** — the `tests` step's own comment                                                                                                      |
| `scripts/_pools.mjs:4`                         |           1 | **found by round 2** — the classifier that defines the pool                                                                                                |
| `tests/check-pools.test.ts:170` (its comment)  |           1 | the children, beside the assertion                                                                                                                         |
| `docs/research/test_fixes_and_research.md:252` |           1 | the children, and its "142 ordinary files" beside them                                                                                                     |

**Eleven live claims — not round 2's twelve and not round 1's nine.** Round 2 counted `scripts/_pools.mjs:7` as a
twelfth, and **that line holds no occurrence of "twelve"**: it reads _"One full suite is therefore 274 file
executions of 153 files — 153 direct and 121 nested."_ It is a live claim that this feature falsifies and it is
amended for that reason, but it is **a figure claim, not a count claim**, and counting it inside an instrument
defined as `grep -ri twelve` inflated the instrument by one — which is the same failure mode as a stale citation.
`docs/context.md:224` carries those three figures **and** the word, so it is the one line that appears in both
lists. The two `scripts/` files matter most, because they are the runner and the classifier: a comment there that
says twelve while thirteen run is the kind of wrong that reads as coverage. `scripts/check.mjs` and
`scripts/_pools.mjs` are named in Gate 2's place table for exactly this, and both are `VERIFY_INFRASTRUCTURE`, so
Slice 3 is a full suite on their account as well as on `scripts/`'.

**Why `docs/context.md`'s three are live where `DECISIONS.md`' are measurements at their date**, which round 2
applied without stating: that file's own header makes every session keep _"any row or line below its work made
untrue"_ (`docs/context.md:13-14`), so a Changes entry there is a digest that is maintained, not a record that is
frozen. A decision entry is the opposite by S-197's instrument. The one context.md occurrence that is **not**
amended is `:138`, session 92's own Changes entry recording that round's finding; it is named here because the next
reader greps and finds four.

**The two places carrying the 274/153/121 figures are recomputed, not edited away**: `scripts/_pools.mjs:7` and
`docs/context.md:224`. One full suite today is 274 file executions of 153 files, 153 direct and 121 nested; this
feature adds one secrets child (whose nested suite re-runs its four siblings) and four ordinary files, so both
recorded figures move and the slice recomputes them **from the run** rather than by arithmetic in a gate — the same
rule as every other measured figure here.

**`docs/research/test_fixes_and_research.md:252`'s "142 ordinary files" is amended with the "twelve" beside it**,
because that sentence states what the runner does **now**, unlike `:98` and `:108`, which state what was measured
on a date.

**What is deliberately NOT amended, each for a stated reason.** `DECISIONS.md`'s occurrences about the children
(`:8611`, `:8632`, `:8654`, `:8671`, `:8694`, `:8964`, `:8966`, and S-199's own `:9209` superseded by its
amendment at `:9311-9318`) and `docs/research/test_fixes_and_research.md:98` and `:108` are **measurements at their
date**, and S-197 refused editing a record to match a later state — S-199's amendment records that the count is now
thirteen instead. **`:8671` is session 93's addition to this list**: round 2's enumeration named six DECISIONS.md
lines and that one is a seventh about the children — S-192's Rejected clause _"a change to twelve verified test
files"_, which is the twelve secrets files themselves. `tests/reel-render-pass.test.ts:139`' "each of the twelve" is twelve inputs to one
ffmpeg invocation, not twelve children, and `docs/research/refusals.md:80`' twelve is a refusal count: neither is
ours, and both are named here so the next reader need not re-derive it. `DECISIONS.md:9032-9033`' twelve is
`tests/check-receipt.test.ts`' check count.

**The rest of the account, completed by round 3**, which found the closing sentence claiming more than it had read.
Not about the children, each checked: `DECISIONS.md:5491` (probe calls), `:6867-6868` (agents), `:7330` (real
runs), `:8187` and `:8191` (findings of a review round), `:8476` (seconds a run); `JOURNAL.md:55` and `:79`
(session entries); `docs/reel-pitfalls.md:58` and `docs/research/hyperframes.md:599` (frames and agents);
`tests/fixtures/wire/minimax-chat-echo.json:2` (a fixture's note); and the hits across `docs/design/`,
`docs/history/`, `docs/features/`, `PROMPTS/` and `packages/providers`, which are about reels, seeds, probe calls,
blockers and agents. **Nothing live is missed** — which is the point of completing the account rather than
gesturing at a remainder, since the enumeration IS the instrument.

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
shared module's `redactProse()` as the document is read, and why `redact()` itself is left unchanged so that the
record's own run ids and brief keys survive it; no path in anything committed.

## Gate 3 — Program design

### File locations

```text
packages/benchmark/src/compare.ts            sides, groups, the fingerprint's fields, the eight measures, both bands,
                                             the votes, the words, the guard, stratify, the sides validator (no npm)
packages/benchmark/src/measures.ts           one field added: planVaryOn, with its FIELD_COLUMNS entry
packages/benchmark/src/index.ts              the new exports; the package's only entrance (D-094)
scripts/_benchmark-rows.mjs                  the read-only open, the held columns, one run's rows, every run's ids,
                                             prefix resolution, redact() unchanged, and redactProse() beside it
scripts/benchmark.mjs                        imports the above; its call sites and both fault paths are rewritten
                                             around a module that returns faults, its exit codes unchanged
scripts/benchmark-compare.mjs                the reader: flags, the sides document, SHA-256, the record-wide group
                                             count, the printer. It starts no process at all
packages/benchmark/src/index.ts:8            its "no band, no delta and no verdict" sentence, falsified by Slice 1
scripts/check.mjs, scripts/_pools.mjs        one comment each: thirteen children, and _pools.mjs:7's recomputed
                                             274 / 153 / 121 figures
scripts/run-tests.mjs:4                      thirteen children, in the runner's own comment
scripts/impact-map.mjs:133                   thirteen children, in the derivation comment
tests/check-pools.test.ts:170                thirteen children, in the comment beside the assertion
CLAUDE.md:184, :196                          thirteen children, in both suite paragraphs
docs/context.md:204, :217, :224              thirteen children, and :224's 274 / 153 / 121 figures
docs/research/test_fixes_and_research.md:252 thirteen children, beside its "142 ordinary files"
tests/yield-benchmark-reader.test.ts         its source scan grows from one reader file to three, clause by clause
tests/fixtures/benchmark/<one>.json          its request options gain planVaryOn, so check 1 can prove the field
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

**The order when two of them are true at once, because round 2 found it unstated.** The database is opened
**first**: a missing or unreadable record is exit 1 and nothing is created, even when the sides document is also
malformed, because every record fault is decided over a resolved run set and there is nothing to resolve against.
The document's shape faults are collected on the way, and if the record then opens, exit 2 names the shape and
record faults of both kinds in one pass. So exit 1 outranks exit 2, and the one-pass promise is a promise about
exit 2's own faults.

### The checks

1. `the band is one standard error and the multiplier is two — moved means |delta| > 2 x band, where measure 1's delta is the ADJUSTED one and the raw delta decides the zero rule alone — with measure 1's band the unpooled Wald form over counts of RUNS adjusted by one success and one failure a side, and measures 2 to 8's band Welch's over per-run figures, floored for measures 2 to 6 at the run-level share band and NEVER floored elsewhere, since the floor's adjusted counts are defined only for a mean in [0,1]; the four pinned measure-1 cases return 2/4 against 4/4 adjusted +0.3333 band 0.2546 inside the noise, 1/4 against 4/4 adjusted +0.5000 band 0.2453 moved, 0/4 against 4/4 adjusted +0.6667 band 0.2152 moved, and 0/2 against 2/2 adjusted +0.5000 band 0.3062 inside the noise; the four pinned per-run RATE cases return (0,0,0,0) against (0.4,0.4,0.4,0.4) delta +0.4000 welch 0.0000 floor 0.2531 inside the noise, (0,0,0,0) against (1,1,1,1) delta +1.0000 welch 0.0000 floor 0.2152 MOVED, (0.2,0.4,0,0.6) against (0.8,0.6,1,0.8) delta +0.5000 welch 0.1528 floor 0.2715 inside the noise, and (0.2,0.2,0.2,0.2) against (0.4,0.4,0.4,0.4) delta +0.2000 welch 0.0000 floor 0.2755 inside the noise, which is the case Gate 1's first risk states in words; the three pinned per-run FIGURE cases return (53,52,58,73) against (49,53,54,51) delta -7.250 band 4.973 inside the noise, (75,71,73,58) against (53,52,49,51) delta -18.000 band 3.932 moved, and (0,0) against (2,2) delta 2.000 band 0.000 NO VERDICT by the zero-band rule; eleven worked values in all; and the check quotes the three formulas it checks`.
2. `the same rows pooled over items and averaged over runs give different answers, and the run form is what is computed: four runs with none of five pictures refused against four runs with two of five refused is 0/20 against 8/20 pooled — delta +0.3636 band 0.1138 moved — and delta +0.4000 band 0.2531 inside the noise as per-run rates, which is what the measure returns; the Simpson case holds too, a three-group fixture whose per-group deltas all point one way while the figures summed across groups point the other returning the per-group direction; and nothing cross-group is computed, asserted over the output's own shape — every figure sits under a named group key, the record holds no FIGURE aggregating two groups, which is the observable form of the claim — each measure's word, the tally and the limits aggregate the groups' votes by construction, and a literal reading of "no field" would have been dropped by whoever built it, and each per-group figure equals the figure recomputed from that group's runs alone`.
3. `the minimums and the vote rule, each case separately: a group with fewer than two runs on a side is dropped; a group where fewer than two of a side's runs contribute to a measure is dropped for that measure only and keeps the other seven; a run whose value reads absent contributes nothing and its count is printed; fewer than three surviving groups is no verdict naming the count; helped needs at least ceil(2/3 x surviving) helped votes AND no hurt vote, and 2 helped with 1 hurt is no verdict naming the disagreeing groups; a group voting no verdict counts as surviving and is NOT comparable, so three groups voting helped, no verdict, no verdict read no verdict and never inside the noise, naming the two whose band bounded nothing; AND three groups voting helped, helped, no verdict read HELPED, naming the group whose band bounded nothing, which is the case that distinguishes the chosen rule from the one Gate 2 rejects by name — any zero-band group forcing the measure to no verdict — since {helped, no verdict, no verdict} reads no verdict under both; a raw delta of exactly zero votes inside the noise even where the band is also zero, because clause 3 outranks clause 4; a band of exactly zero with a non-zero delta votes no verdict; and ceil(2/3 x n) is 2, 3, 4, 4 for 3, 4, 5, 6 surviving groups`.
4. `each of the eight measures is read from the per-run figure and denominator Gate 2 names for it, measure 1 as a share over runs from run.reel.madeAFile and the other seven as per-run figures averaged over the side's runs, and every one is a rate per unit rather than a total: two sides whose plans hold four and six shots return the same figure when the same fraction degraded; measure 5 counts the shots FILMED FROM WORDS and measure 6 the shots HELD ON THEIR PICTURE as a still, which are two different endings and not one described twice; each numerator is the distinct shots its rows name THAT ITS DENOMINATOR HOLDS, so a degradation or still_hold row the run rewrote for an inherited failure — whose shot ownPictures() excludes — cannot push the share above 1, while two rows for one shot is an impossible state because both tables are keyed (run_id, shot_id); measure 4 reads Gate 7's own outcome with render.finished_at set, never the answeredNo list, and a run with no finished render contributes nothing; an inherited picture, narration, take, degradation, still_hold or hold is excluded from the inheriting run and counted in the run that paid for it, while measure 7 needs no such filter because a resume copies no receipt; measure 1 is never undefined but is still dropped by the two-runs-a-side minimum; and cost per reel is reported beside cost per run and is not a measure`.
5. `the credit guard's five quantities are exactly shots the plan asked a picture for, accepted pictures per accepted shot, shots degraded, the selected plan's shot count and the selected plan's total planned seconds; quantities 1, 2, 4 and 5 are banded by BARE WELCH and never by the floor, asserted by reading a finite band where the floor's adjusted counts would return NaN; a band of exactly zero FIRES the guard where it would vote no verdict for a measure — side A four runs planning 6 shots against side B four runs planning 4 is delta -2.000, both variances 0, band 0.000, and the guard FIRES on plannedShots; the same two sides exchanged, A planning 4 against B planning 6, is delta +2.000 and does NOT fire, so an implementation reading |delta| fails this check; the WITHHOLDING half is pinned over its own fixture of three groups of eight runs, four a side, reels made none-against-all so the measure reads helped, with side B planning four shots against side A's six, where the guard fires on plannedShots and turns reels made's helped into no verdict naming that quantity, its figures and the number of groups it survived in, although reels made moved; the guard's cross-group clauses are each pinned separately — a group where fewer than two runs a side contribute is dropped for that quantity alone while the measure keeps it, a quantity surviving in only two groups STILL fires at ceil(2/3 x 2) = 2 where the measure rule's three-group minimum would have silenced it, and a group moving the other way is named without silencing the guard; quantity 3 keeps measure 5's own floored band; a hurt is never withheld, a measure already inside the noise or no verdict is unchanged, and a quantity named in declaredAxis does not fire and is reported; and quantities 1 and 4 are reported separately on a run whose picture rule makes them differ`.
6. `the fingerprint's exported field list is deep-equal to the seven identifiers Gate 2 writes out — until, ceilingCents, planVaryOn, receiptRates, portModels, plannedImageCalls, pictureRule — so a vacuous member cannot be added without the check failing; each of the seven refuses when both sides hold a value and the values differ, each case separately, with receiptRates a set over the three receipt kinds that carry rate_cents and portModels a set over the five that carry a model; an absent observed field refuses nothing and is named in the output, over a plan-stage death's THREE absent conditions — receiptRates, plannedImageCalls and pictureRule — with portModels asserted PRESENT and strict on that same run, since a run that only asked its planner still wrote a model_receipt; a differing Gate 7 question-set hash drops the finished-cuts-refused measure and keeps the other seven; the engine version reads not recorded; the picture rule is READ from the selected plan and never reads not recorded; whether standalone pictures exist is in no condition; neither the scoring half's measures version nor its rating stamp is a condition, because one invocation cannot differ from itself; no comparison reads a rating; and two runs differing only in style version land in different brief groups, which is why the fields outside options are not conditions`.
7. `the verdict's unit: one word per measure and NO composed overall word anywhere in the output; reels made prints first and is labelled the headline; a measure the caller declined to judge reads reported, not judged, which is not one of the four words; the tally counts only the judged measures, prints that count — 8 in the change-under-test mode and 6 by default in config mode — and names the declined ones; the stated reading rule is printed with it; and the limits block names the declared change, the engine version, every field that refused, every field that was absent, every dropped group with its reason, the guard's quantities, and the count of brief groups THE RECORD holds that could supply two runs a side, with the count reaching four beside it, both labelled as being about the record and not about the two sides`.
8. `the sides validator refuses every SHAPE fault with no record at all and names them in one pass, not the first: a missing or empty label, two equal labels, a side with no runs, a non-string or empty run id, the same id written twice verbatim in one side or in both, an unknown declaredAxis name and an unknown judge name; the record faults are decided over a resolved run set and named in the same pass — an id matching no run, AN ID MATCHING MORE THAN ONE RUN, and two ids resolving to the same run in one side or across both; and a thin comparison is NOT a fault, returning no verdict with what is missing named`.
9. `the null comparison and its control: fifteen constructed runs over three brief keys, each group's five sharing one fingerprint, split two against two with the fifth left out and the split stated in the fixture, return inside the noise or no verdict on every one of the eight measures, helped or hurt on none, AND every one of the three groups' own votes asserted; the control is its OWN fixture of twenty-four runs over three brief keys, eight to a group, split FOUR against four, with identical attempted work on both sides and side A's runs reaching a finished render whose output is unreadable, and it returns helped on reels made with the guard asserted not to have fired; a control re-read from the null's two-against-two split is refused by name, because 0/2 against 2/2 is pinned inside the noise and such a control could not fail whatever the arithmetic did; and a one-group null is rejected by the check's own construction, because three surviving groups are what the band is read through`.
10. `the two committed real runs sharing brief key f984199a — cd9648c9 and fdff208b — form one group with one run a side, are dropped by the two-runs-a-side minimum, and yield no verdict with that reason named, on rows taken from the record rather than constructed`.
11. `the reader: every flag behaves and defaults as Gate 3 states; --stratify prints strata with bands and no verdict word; --stratify alone covers every run in the record; no --sides and no --stratify exits 2; an unreadable document, a shape fault and a record fault each exit 2 naming every fault of both kinds; a missing --db exits 1 and creates no file; --out is written on every successful run, including an all-no-verdict one; the record's bytes are unchanged; it starts NO PROCESS AT ALL, constructs no port and reads no key; a key-shaped declaredChange (a run of 20 or more characters of [A-Za-z0-9_-] with no space), a URL-shaped one and a query-string-shaped one are redacted in both the printed output and the written record, by the shared module's redactProse() applied as the sides document is read; redact() itself is asserted UNCHANGED — its two replacements, and no key shape — and a 36-character run id and a 64-character brief key are asserted to SURVIVE INTACT in the written record of both readers, which is what a widened redact() would have mangled; the record-wide count of brief groups that could supply two runs a side is printed and pinned against a temporary database whose groups are known, and is asserted to differ from the same invocation's surviving-group count; it writes no path into anything committed; and it contains no occurrence of the spending script's name, which this check BUILDS rather than writes` — behavioural, against a temporary database in `tests/yield-benchmark-reader.test.ts`' shape.
12. `compare.ts is inside packages/benchmark and the three rules still hold on the real dependency graph — no engine package, no I/O, node:crypto denied under both spellings — while benchmark-npm-only-zod PERMITS zod, so this feature's stricter no-npm-at-all is its own design rule and what enforces it is the assertion that packages/benchmark/package.json gains no dependency and compare.ts imports none; drift --prove still fires 25 rules with no rule added; and the moved loader leaves yield-benchmark's checks 6, 7 and 13 green, its CHECK 1 green through the one committed fixture whose options gain planVaryOn, its check 4's pinned groups.size of 9 and named shared pair untouched, and its check 5 holding the SAME assertions over three reader files — every negative per file, the new DatabaseSync count of 1 and the processes deepEqual over the three together, still exactly ['git'] because the compare reader starts nothing and the loader starts nothing, which is the assertion that stays exhaustive rather than being made set-based`.
13. `every other check of this feature passes in a child process whose environment holds only PATH and what the operating system needs to start Node, in S-028's form; this file builds its environment through a function named exactly as tests/check-pools.test.ts requires of every member of that pool; and none of this feature's four ordinary test files holds that function name, which the same check asserts in the other direction over the ordinary pool`.
14. `stratify: the unit is per property as Gate 2's table states — pictures for subjectsPerShot and pictureRule, runs for shots, plannedImageCalls and imageToVideo; imageToVideo's four strata are none at exactly 0, all at exactly 1, mixed strictly between, and no takes where the run made none, over the share of the run's own takes whose mode is image-to-video; a share stratum carries the single-side adjusted band and a per-run-figure stratum carries s/sqrt(n), asserted by reading a finite band for a cost stratum where the adjusted form would be NaN; no stratum carries a verdict word; a stratum of fewer than two members is reported with its count and no band; a band of exactly zero prints as zero with its reason; and a picture-unit fixture built in session 82's shape reproduces a refusal share rising with the subject count of the shot each picture belongs to`.

Checks 1 to 10, 12 and 14 need no database at all; none of them starts the engine or needs a key.

### The least confident decisions

- **The floor under the per-run band.** It binds in every worked case, which means at four runs a side only an
  effect near none-against-all moves a measure. That is the honest consequence of the evidence available, and the
  alternative — bare Welch — hands a claim with no uncertainty to four identical runs. **The first revision of this
  bullet said that if the control fixture ever needed weakening to pass, the floor was the first thing to look at.
  That sentence is withdrawn**: round 2 found it pre-authorising exactly what CLAUDE.md rule 3 forbids, and it was
  wrong about the cause as well — the control could not read _helped_ because it had **two runs a side**, not
  because the floor was too wide. If a control ever fails, the run count is what to read first, and the band is not
  to be touched to make a check green.
- **The guard firing on a band of exactly zero**, where a measure votes no verdict on the same band. The asymmetry
  is stated and argued — withholding on no uncertainty is the safe side of a guard — but it is the one place where
  two parts of this feature read one number two ways, and it is where to look first if the guard ever withholds
  credit that should have been given.
- **The flat multiplier of 2.** Anti-conservative at four runs a side, named as such, with the floor and the group
  rules carrying the conservatism. An inverse Student t is the alternative and needs an npm dependency this package
  does not have.
- **The guard's cross-group clauses, both chosen against the measure rule they were imported from.** The
  three-surviving-group minimum does not withhold a fire, and a contrary group does not silence one. Both are the
  conservative direction for a guard and both make the guard fire **more** often than the imported rule would, so
  the failure they risk is a withheld credit that should have been given — which reads "no verdict" and is the same
  risk the zero-band asymmetry already carries. **This is where to look if the guard ever withholds too much**, and
  the printed count of groups a quantity survived in is what makes that visible.
- **Two redactors in one module rather than one widened one.** It is a scope split, and a reader has to know which
  string is prose and which is an identifier. The alternative — one widened `redact()` — was the first two rounds'
  reading and it would have silently rewritten the scoring half's own run ids and brief keys in every `--out`
  record, with check 7 staying green. Check 11 asserts both halves: the shapes firing on prose, and an identifier
  surviving the record.
- **Moving the loader out of a verified feature's script.** It is the one place this feature can break something
  that already works, and round 1 showed the first draft was wrong about what it cost. The scan grows from one file
  to three rather than an assertion being dropped, the slice is a full suite, and `yield-benchmark` re-journeys.
  **The permission to start `git rev-parse` went with it**: the scan's exhaustive clause is an order-exact list, so
  a second `git` would have forced the choice between a red check and a loosened one.
- **Adding `planVaryOn` to the scoring half's scorecard.** The alternative is parsing the request twice, which is
  worse; the cost is one field in a verified feature's source and one `FIELD_COLUMNS` entry.
- **Whether "no overall verdict" is too little.** The owner asked whether a change worked, and the answer is eight
  words and a tally rather than one word. Kept, because the composition needs weights and S-182 refused a number
  people optimise; the headline measure and the printed reading rule are what make the eight readable.

## Gate 4 — Slices

- [ ] **Slice 1 — the arithmetic.** `packages/benchmark/src/compare.ts` and its exports: sides as a data shape and
      their grouping by brief key, the eight measures with their per-run figures and denominators, both bands with
      every pinned worked value, the floor, the per-group vote and each measure's word — and the fixtures its own
      checks read, including the three-group Simpson fixture; and
      **`packages/benchmark/src/index.ts:8`'s "no band, no delta and no verdict" sentence, which this slice
      falsifies**. Checks 1, 2, 3, 4. **Targeted**:
      `--slice tests/yield-compare-arithmetic.test.ts tests/yield-benchmark-schema.test.ts tests/line-endings.test.ts tests/no-absolute-paths.test.ts tests/feature-files.test.ts tests/context-file.test.ts tests/file-scans.test.ts`.
      **`tests/yield-benchmark-schema.test.ts` is named here too, not only in Slice 2** — round 3's finding: this
      is the slice that CREATES `tests/fixtures/benchmark/compare/`, and that check's recursing
      `readdirSync(FIXTURES, { recursive: true })` (`tests/yield-benchmark-schema.test.ts:140`, the test at `:125`)
      is the only thing holding every path-shaped value in it to the placeholder.
      `--changed` owes the full run for a new source file until the map is re-recorded. **Proves: 1, 2, 3, 4.**
- [ ] **Slice 2 — the guard, comparability, the sides validator, stratify and the null comparison.** The five guard
      quantities with their own band, their cross-group clauses and their withholding, the fingerprint's exported
      field list compared one by one with the absent rule and the question-set scoping, the hand-written sides
      validator with its shape and record faults, the stratify units and their two band forms, and the fixtures
      under `tests/fixtures/benchmark/compare/` — the fifteen-run null, the twenty-four-run control, **the guard's
      own withholding fixture** (the control's shape with side B planning four shots against side A's six, so a
      measure-level _helped_ exists for the guard to withhold — round 3's finding, since check 5's withholding half
      was constructible from no fixture any slice listed) and the picture-unit stratify set. **And `planVaryOn`
      with its `FIELD_COLUMNS` entry and the one committed fixture whose `options` gain it, moved here from
      Slice 3**: check 6 asserts that each of the seven conditions refuses, `planVaryOn` is one of the seven, and
      it is in no scorecard field — the only occurrence in the package is `packages/benchmark/src/measures.ts:436`,
      inside the private options blob — while Gate 2 forbids `compare.ts` a second reading of
      `request_canonical`. Without the field in this slice, check 6's `planVaryOn` case cannot be built and
      `card.run.planVaryOn` does not typecheck, so `--slice`'s own typecheck step fails. Checks 5, 6, 8, 9, 10, 14.
      **Targeted**, the same way, with `tests/yield-compare-comparability.test.ts` added **and
      `tests/yield-compare-arithmetic.test.ts` kept, not replaced** — round 3's finding: this slice edits
      `packages/benchmark/src/compare.ts`, whose only checks are 1 to 4, and under-selection is the one failure
      `scripts/_impact.mjs` exists to prevent. Also named: **`tests/yield-benchmark-schema.test.ts`**, whose
      recursing glob holds this slice's new fixtures to the path placeholder, and
      **`tests/yield-benchmark-measures.test.ts`**, which is where check 1 proves the new field and check 4 pins
      `groups.size` at 9 — the two verified checks the fixture edit is chosen to keep green, and the only way the
      slice that makes the edit also runs them. **It stays targeted rather than becoming a full suite**: neither
      `packages/benchmark/src/measures.ts` nor `tests/fixtures/benchmark/` is under `FULL_ONLY`'s `/^scripts\//` or
      in `VERIFY_INFRASTRUCTURE`, every verified check that reads either is named above, and `yield-benchmark`'s own
      journey re-runs in Slice 4 for the field and the fixture (S-099's form). **Proves: 5, 6, 8, 9, 10, 14.**
- [ ] **Slice 3 — the reader, the shared loader, the amendments and the boundary.**
      `scripts/benchmark-compare.mjs` with its flags, exit codes, the record-wide group count and printed output;
      `scripts/_benchmark-rows.mjs` extracted from `scripts/benchmark.mjs` with the one-pass prefix resolution,
      **`redact()` moved unchanged and `redactProse()` added beside it**, and `scripts/benchmark.mjs`' call sites
      and fault paths rewritten around it with its exit codes unchanged;
      `tests/yield-benchmark-reader.test.ts`' scan grown to three files clause by clause; the
      **eleven-claim** thirteen-child enumeration and the two places carrying the 274/153/121 figures, including
      `scripts/check.mjs`, `scripts/_pools.mjs` and `tests/check-pools.test.ts`' own comment; `yield-benchmark`'s
      amendment block. Checks 7, 11, 12, 13.
      **Full suite**, on three counts now that round 3 has moved the fixture to Slice 2 — `scripts/` is
      `FULL_ONLY`; `scripts/check.mjs`, `scripts/_pools.mjs`, `scripts/run-tests.mjs` and
      `tests/check-pools.test.ts` are `VERIFY_INFRASTRUCTURE` (`scripts/check.mjs:211-228`); and it edits a
      verified feature's test file. **Proves: 7, 11, 12, 13.**
- [ ] **Slice 4 — the journeys.** `node scripts/journey.mjs yield-compare`, then `yield-benchmark` again for the
      moved loader, the new field and the edited fixture (S-099's form, S-178's order). **Proves: none** — it is
      the feature's proof.

**The five always-run scans are named in both slices deliberately** (`scripts/_impact.mjs:39-45`, `ALWAYS_RUN`).
`--slice` runs `CODE` without its `tests` step, the files it is handed, and `AUTHORITY` (`sliceSteps`,
`scripts/check.mjs:138-157`): `SCANS` is a step of its own that only the full suite and `--documents` run, so a
targeted slice would otherwise add a source file, four test files and a directory of JSON fixtures **without any of
D-086's absolute-path scan, the CRLF scan, the feature-file scan or the tracked-file scan running at all**. This
repository has already paid for that hole once: S-195 records a full suite passing with a D-086 violation in
`scripts/benchmark.mjs` because the scans read tracked files and the file was untracked. **Round 3 found the fixture
scan one slice short of the same hole** — Slice 1 creates the fixture directory and only Slice 2 named the check
that governs it — so `tests/yield-benchmark-schema.test.ts` is in both lists. Slice 1 names seven files and Slice 2
nine; every one of them is seconds.

Every check appears in exactly one slice: 4 + 6 + 4 + 0 = 14. **Round 3 moved `planVaryOn`, its `FIELD_COLUMNS`
entry and the fixture edit from Slice 3 to Slice 2, and no check moved with them**: check 6 was already Slice 2's,
and it is the check that could not be built without the field.

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

## Gate review 2 — 2026-10-16, a FRESH adversarial reviewer, session 92

**All four gates NOT APPROVED, twenty-four findings** (CLAUDE.md rule 4: the round that would approve all four is a
fresh reviewer, and this one might have been). **Twenty-three are applied and one is refused**, below. Eleven were
named sufficient on their own. The main session recomputed all eleven pinned band values before the round and
handed them over as measured, so the round was spent on the design rather than on the arithmetic; the reviewer
re-derived six of them independently and agreed.

|   # | the finding                                                                   | answer                                                                                                                                                                                                                                                                                                                                                                                                                     |
| --: | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|   1 | the `planVaryOn` amendment turns `yield-benchmark`'s **check 1** red          | applied, and verified first: no fixture carries `planVaryOn`, so the field reads `ABSENT` before and after every mutation. **One committed fixture's `options` gain it**; an eleventh fixture is refused because check 4 pins `groups.size` at 9 and the shared pair by name                                                                                                                                               |
|   2 | guard quantities 4 and 5 can never fire: zero variance, zero band             | applied: the guard gets **its own band** — bare Welch, never the floor (whose adjusted counts return `NaN` on a shot count), and **a zero band FIRES the guard** where it votes no verdict for a measure, with the asymmetry argued                                                                                                                                                                                        |
|   3 | check 5's pinned guard case has the sides the wrong way round                 | applied: side A and side B named with the sign, and the exchanged case pinned as NOT firing, so an implementation reading `abs(delta)` fails                                                                                                                                                                                                                                                                               |
|   4 | the positive control cannot read _helped_ at two runs a side                  | applied: the control is **its own fixture, twenty-four runs, four a side**, with identical attempted work so the guard cannot withhold; a control re-read from the null's split is refused by name                                                                                                                                                                                                                         |
|   5 | no precedence between the zero-delta and zero-band clauses                    | applied: **clause 3 outranks clause 4**, and clause 4 is restated as `band = 0` **and** `delta != 0`                                                                                                                                                                                                                                                                                                                       |
|   6 | the measure word re-admits "inside the noise" over zero-band groups           | applied: a no-verdict group is surviving but **not comparable**, and fewer than `ceil(2/3 × surviving)` comparable votes reads no verdict                                                                                                                                                                                                                                                                                  |
|   7 | the record-wide group count has no input, no owner and no check               | applied: it is the **reader's** own pass over every run, the loader returns every run's ids, and check 11 pins it against a known database and asserts it differs from the surviving-group count                                                                                                                                                                                                                           |
|   8 | the three-file scan drops the exhaustive clause and cannot run per file       | applied: the `processes` deep-equal `:250` is named at last, and each clause states its own scope: negatives per file, the three positives over the concatenation                                                                                                                                                                                                                                                          |
|   9 | `READER` is used four times; "otherwise unchanged" is false                   | applied: `READER` is left as the entry script and a new constant names the scanned set; `scripts/benchmark.mjs`' call sites and both fault paths are named, with check 6 the thing that must stay green                                                                                                                                                                                                                    |
|  10 | two copies of the D-022 instrument; `redact()` has no key shape               | applied: `redact()` **moves** into the shared module with the loader and is **widened** — its two existing replacements unchanged, a key shape and a bare query string added, both pinned in check 11                                                                                                                                                                                                                      |
|  11 | Slices 1 and 2 omit the five always-run scans and the fixture scan            | applied: all six named in both `--slice` lists, with S-195 cited as what this hole already cost once                                                                                                                                                                                                                                                                                                                       |
|  12 | a degraded shot IS filmed, from words; the still fallback is measure 6        | applied: Gate 1's eight restated, guard quantity 3's reason corrected, and the correction named in the file's header block                                                                                                                                                                                                                                                                                                 |
|  13 | "a shot can carry two degradation rows" is false; check 4 pins the impossible | applied: both tables are keyed `(run_id, shot_id)`; the distinct-shot numerator is kept as a defence with the true reason, and check 4 pins the **inherited row outside the denominator** instead                                                                                                                                                                                                                          |
|  14 | the "twelve" enumeration is incomplete and three citations are stale          | applied: **twelve live claims, not nine** — `scripts/check.mjs:57` and `scripts/_pools.mjs:4` and `:7` added, `docs/context.md` re-cited at `:183`/`:196`/`:203`, and both `scripts/` files put in Gate 2's place table                                                                                                                                                                                                    |
|  15 | check 13 names one direction of a two-directional assertion                   | applied: the secrets child must hold `bareEnvironment` and the four ordinary files must not                                                                                                                                                                                                                                                                                                                                |
|  16 | "the fingerprint's fields" is listed as unchanged while S-199 supersedes it   | applied: struck from the list, and S-182's measures-version and rating-stamp items named as a seventh superseded part                                                                                                                                                                                                                                                                                                      |
|  17 | Gate 1 contradicts check 1 twice                                              | applied: the none-against-all sentence corrected to what is pinned, and the 0.2-against-0.4 case **added to check 1**, which takes its pinned values from ten to the eleven S-199's Caught-by already claimed                                                                                                                                                                                                              |
|  18 | stratify's band is unspecified or `NaN` for three of five properties          | applied: one band per figure KIND — adjusted share band for a share, `s/sqrt(n)` for a per-run figure — with the zero case stated                                                                                                                                                                                                                                                                                          |
|  19 | `imageToVideo` is a count, not a share; `0/0` has no rule                     | applied: the share's denominator named, and `no takes` made a fourth stratum rather than a division by zero                                                                                                                                                                                                                                                                                                                |
|  20 | which delta decides is stated two ways for measure 1                          | applied: the adjusted delta decides `moved` and the direction, the raw delta decides the zero rule, both printed                                                                                                                                                                                                                                                                                                           |
|  21 | check 12's "no npm package at all" misstates `benchmark-npm-only-zod`         | applied: the rule **permits** zod; the stricter claim is named as this feature's design rule and the manifest assertion is what enforces it                                                                                                                                                                                                                                                                                |
|  22 | check 2's "no field aggregating two groups" is false of its own output        | applied: "no **figure**", with the reason the literal reading would have been dropped                                                                                                                                                                                                                                                                                                                                      |
|  23 | nine wrong `file:line` claims                                                 | applied for eight — `measures.ts` 1096, 1159, 1161, 1204, 1255, the reader block's `:234-266` and its sub-rows, `check.mjs:229-235`. **REFUSED for one**: `packages/reel-contract/src/request.ts:79-90` is exactly the `SubmitRequest` declaration, re-counted in the source; the reviewer's `:78-87` is the wrong span                                                                                                    |
|  24 | seven smaller precision faults                                                | applied, all seven: three receipt kinds carry `rate_cents` and **five** carry a `model` (re-measured, not four); the seven condition identifiers written out once; measure 1 names `run.reel.madeAFile`; check 1's count of its own cases fixed at eleven; the invented S-182 quotation replaced by the entry's real five open questions with its line; Gate 1 gains the absent-field risk; and the exit-code order stated |

**What the reviewer verified and did not fault**, recorded so a later round need not redo it: all eleven pinned band
values recompute exactly, six re-derived independently, and the two thin margins (0.0093 and 0.0430) survive
rounding at four decimals; measures 2 to 6 can never have a zero band, since `p' = (mean×n + 1)/(n + 2)` is strictly
inside `(0, 1)`; the zero-band case is exactly satisfiable for integer cents; `ceil(2/3 × n)` matches its table; the
vacuous-by-construction list is exact field for field against `request.ts`; `planVaryOn` really is in no scorecard
field, so the amendment's premise is right even though its cost was wrong; check 10's committed group recomputes to
brief key `f984199a` from the two fixtures; measures 5 and 6 reuse the ratings' own denominators with no second
reading; measure 7 needs no inheritance filter; measure 3's `fail` and measure 4's Gate 7 outcome read as described;
`paid-path`'s check 20 covers both new scripts with no amendment; `impact-map.mjs` derives the new secrets child from
its siblings; the three boundary rules carry `compare.ts` with no rule added and `benchmark-no-io` denies `crypto`
under both spellings; `scripts/` being `FULL_ONLY` makes Slice 3 right to be a full suite; every check is in exactly
one slice and Gate 3's file-to-check mapping agrees with Gate 4; round 1's finding 5 is genuinely answered, since
Slice 1's four checks need no later slice's code; the decisions pin is current; both S-182 quotations are
character-exact; and no implementation file of this feature exists.

## Gate review 3 — 2026-10-16, a FRESH adversarial reviewer, session 93

**All four gates NOT APPROVED, eleven findings** (CLAUDE.md rule 4). **All eleven are applied and none is refused**,
below. Seven were sufficient on their own. The main session recomputed all eleven pinned band values and both `NaN`
cases before the round and handed them over as measured, and **re-measured the "twelve" instrument itself,
correcting three faults in round 2's own count before the reviewer read the file** — so the round was spent on the
design. The reviewer re-derived nine of the eleven band values independently and agreed, including both thin margins
at four decimals.

|   # | the finding                                                                                           | answer                                                                                                                                                                                                                                                                                                                                                                   |
| --: | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
|   1 | a widened `redact()` eats the record's own run ids and brief keys                                     | applied, and verified first: the `--out` replacer passes **every string** (`scripts/benchmark.mjs:912-916`) and `:900` holds `run: card.run.runId`. `redact()` stays unchanged; the key and query shapes move to **`redactProse()`**, applied to the sides document's strings as they are read. Check 11 pins an identifier **surviving** the written record             |
|   2 | Slice 2 proves check 6, which needs a field Slice 3 adds                                              | applied: `planVaryOn`, its `FIELD_COLUMNS` entry and the fixture edit **move to Slice 2**, which also names `tests/yield-benchmark-measures.test.ts`. Without the field `card.run.planVaryOn` does not typecheck and `--slice`'s own typecheck step fails; the workaround the gates left open would have reddened `yield-benchmark`'s check 1 with nobody running it     |
|   3 | the exhaustive `processes` deep-equal forbids the new reader the one process Gate 2 permits it        | applied: `assert.deepEqual(processes, ['git'])` (`tests/yield-benchmark-reader.test.ts:249-250`) is an **order-exact list, not a set**, so a second `git` makes the concatenation `['git', 'git']` and the clause red. **The permission goes, not the assertion**: the compare reader starts no process at all, and its record carries no commit stamp                   |
|   4 | "a run that died in the plan stage has no receipts at all" is false                                   | applied: `taken-dead-in-plan.json` holds zero `plan` rows and **one `model_receipt`** (`MiniMax-M2.7`), and `lost_call.model` is `notNull` (`schema.ts:273`). **Three conditions go absent, not four**, and `portModels` is present and strict; the consequence is restated in Gate 1 and Gate 2 and pinned in check 6                                                   |
|   5 | check 3 cannot tell the chosen vote rule from the one Gate 2 rejects                                  | applied: {helped, no verdict, no verdict} reads no verdict under **both** rules, so the discriminating case — **{helped, helped, no verdict} ⇒ helped**, naming the group whose band bounded nothing — is added to check 3                                                                                                                                               |
|   6 | the guard's cross-group vote is "the measure rule's" with two clauses undecided                       | applied, all three parts: the group-dropping minimum applies, the **three-surviving-group minimum does not** (`parts.plan.shots` is `ABSENT` with no selected plan, `measures.ts:1159`, so the import would have silenced the guard exactly where a side died early), **"none moving the other way" does not carry over**, and check 5 gains its withholding fixture     |
|   7 | Slice 1 creates the fixture tree without the check that governs it; Slice 2 drops the arithmetic file | applied: `tests/yield-benchmark-schema.test.ts` is named in **both** slices, and `tests/yield-compare-arithmetic.test.ts` is **kept** in Slice 2, which edits `compare.ts`. This is round 2's finding 11 one file short, and the hole S-195 already paid for once                                                                                                        |
|   8 | `packages/benchmark/src/index.ts:8` states a property Slice 1 falsifies                               | applied: _"It computes no band, no delta and no verdict"_ joins the amendment list and Slice 1. `ratings.ts:9`'s identical sentence is about `ratings.ts` and stays true                                                                                                                                                                                                 |
|   9 | S-199's amendment records twelve live claims; the gates now say eleven                                | applied: the second amendment to S-199 records eleven, and the reviewer re-ran the measurement independently and confirmed the eleven-row table **correct and complete**                                                                                                                                                                                                 |
|  10 | two wrong citations                                                                                   | applied, both: `cinematic.ts:38` becomes **`:39`** (`:38` is the comment's closing `*/`), and `check.mjs:213-228` becomes **`:211-228`**, which is what Gate 4 already cited while Gate 2 disagreed with it                                                                                                                                                              |
|  11 | four smaller incompletenesses                                                                         | applied, all four: Gate 3's file list gains the six claim sites it must edit; the closing account of the remaining "twelve" hits is completed rather than gestured at; `compare.ts`' stated input gains **the reader's resolution**, which the record-fault function needs; and S-199's item 6 is corrected on the `readOnly` match, the gates keeping the stronger form |

**What the reviewer verified and did not fault**, recorded so a later round need not redo it: nine of the eleven
pinned band values re-derived independently, every delta, Welch, floor and `2 × band` matching to four decimals
including the 0.0093 and 0.0430 margins, and `ceil(2/3 × n)` matching its table; clause 3 over clause 4 is right,
since `|0| > 2 × 0` is false, and the threshold taken over _surviving_ rather than _comparable_ groups is the
stricter of the two and cannot manufacture a `helped`; the guard's zero-band asymmetry is the conservative direction
as argued, and quantity 3's band can never be zero so it never meets that rule; **the positive control can fail for
the right reason** — `measures.ts:1077` is `ended?.video?.path !== undefined && output?.readable === true`, the
adjusted delta 0.6667 clears `2 × band` 0.4303 in all three groups, and no guard quantity moves under identical
attempted work — and the null fails only through its asserted group votes, which is why the gate requires them;
`compare.ts`' stated input suffices for all eight measures, the five guard quantities, all seven conditions and the
five stratify properties, with `take.outcome` enumerated `['accept','fail']` (`schema.ts:411`), the four `shotId`
intersections carrying their `inherited` flags, and `Tolerances` in-package; `text('model')` appears five times and
`'rate_cents'` three; the fixture edit moves no pinned value, since `briefKeyInput` removes `options`
(`measures.ts:519-529`) and the ledger row carries no scorecard hash; the three-file scan's clause list is
**complete** against `:234-267`, and `READER` is used behaviourally at `:82`, `:412` and `:424`; the S-195 hole is
real and the fix the right shape, with `ALWAYS_RUN` exactly the five files both slices name and
`tests/fixtures/**.json` classified `code` rather than unknown; `scripts/` is `FULL_ONLY` under both modes, so
Slice 3 is right to be a full suite, and `tests/check-pools.test.ts:167`'s `>= 12` takes a thirteenth child without
moving; all four quoted S-182 and S-199 spans are character-exact; the eleven-row "twelve" table is correct and
complete and `_pools.mjs:7` indeed holds no occurrence of the word; no boundary rule is needed and none breaks; no
export-enumeration or impact-map check reddens on five new test files; and **no second sentence of the kind round 2
withdrew exists** — that withdrawal reads as complete.
