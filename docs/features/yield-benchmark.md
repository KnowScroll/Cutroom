---
status: current
authority: plan
---

# yield-benchmark — every run scored, part by part, from what the engine already wrote down

Status: planned
Decisions: D-001, D-014, D-022, D-025, D-027, D-028, D-031, D-042, D-044, D-046, D-050, D-055, D-059, D-083, D-086, D-094, D-100, D-111, D-113, S-016, S-020, S-035, S-040, S-046, S-066, S-070, S-071, S-072, S-073, S-074, S-096, S-098, S-109, S-111, S-124, S-126, S-129, S-141, S-149, S-150, S-153, S-155, S-156, S-158, S-159, S-161, S-163, S-164, S-172, S-176, S-177, S-182
Named only as what it cannot see, or as what waits: S-115, S-154
Gates: product pending · architecture pending · program-design pending · slices pending

> **Created 2026-10-12 at the owner's request**, in session 83, out of `PROMPTS/077-benchmark-design.md`. Session 82
> measured the engine's first 52 runs (`docs/research/yield-baseline.md`): 8 of 52 produced a reel, and the picture
> check refused 53% of all pictures. The first fix is scoped (`docs/features/picture-prompt.md`) and cannot be
> judged, because the baseline it would be judged against was never a controlled measurement.
>
> **The owner settled this feature's shape in the session itself**, twice. Against a narrower stills-only draft:
> _"whole reel, each part should have their own benchmarks, ratings, numbers, timings, everything"_; _"one number,
> internal numbers, everything will be needed so we have full control and observability on each and every aspect of
> the system"_; _"it should be so that the benchmark can be run on individual things as well"_. Then on the paid
> half: _"we can keep the money eval for later once this benchmark is made, ill get the numbers and then build that
> later once its built."_
>
> **So this feature is the reading half only, and it spends nothing.** Every number comes from rows the engine has
> already written. **The paid pass — a frozen brief set bought on purpose, with its ceilings, its typed
> confirmation and its containment — is Deferred 1**, its own feature with its own four gates, after this one is
> built and its numbers have been read.
>
> **Revised once before approval**, against the first adversarial review's 20 findings (recorded at the end of this
> file). Four of them changed the design rather than its wording: the comparison no longer claims a binding to the
> engine version, because no row records one; an absent part now scores zero against its weight, because
> renormalising made a run that died at its first picture outrank a finished reel; the arithmetic moved into a
> package, because `check.mjs` holds every `scripts/` diff to the full suite; and the reason classifier is scoped
> to the two gates whose strings it actually knows.
>
> **It changes no engine behaviour at all**, and it never weakens a gate, loosens a check, raises a cap or edits a
> brief to make a number look better (CLAUDE.md rule 3).

## Gate 1 — Product (no technical language)

**The problem.** 52 real runs have been made and 8 produced a reel. Everything about them was written down as it
happened — every check's words, every cost, every retry, every measurement of every file — and **none of it can be
read without writing a fresh query**. Nobody can ask "what did that run cost at each stage, how many retries did it
burn, which check refused what, and where did it die" and get an answer. Session 82 answered a version of that
question by hand, once, as research; the answer went stale the moment the next reel was made.

**What this answers, and what it does not.** This answers **what happened** — to one run, to a part of one run, to
all of them. It does **not** answer **did a change help**: that needs the same briefs asked twice, which is the
paid pass, deferred. So the first fix still cannot be credited by this feature, and `picture-prompt` must settle
its own threshold in its own gates rather than leaning on this one. Said here because the owner's prompt asked for
attribution, and half of it is deliberately deferred.

**The visible outcome.** Every run gets a **scorecard**: five parts — the plan, the pictures, the narration, the
clips, the finished cut — each with its own counts, timings, costs, retries, what each check said, and **a rating
out of 100**; and one rating for the whole run. Beside the rating, always, whether a watchable reel came out, which
no single number is allowed to hide. Ask for one part and it goes as deep as it goes: every picture with the exact
words that asked for it and each check's reasons, every clip with its measurements and each check's verdict.

**It costs nothing and it works on everything already made** — all 52 runs today, including the 44 that failed or
stopped, because where a run died is the measurement.

**Where new numbers come from, until the paid pass exists.** The way they come today: a reel made by hand, with the
owner's confirmation, by the one script that spends. Each one lands in the engine's record and is scored the moment
it ends. **This feature adds no way to spend money.**

**What a rating is, and what it is not allowed to be.** A part's rating is built **only from what the engine's own
checks said** — was the plan admitted, did a picture pass, did a take pass, did the final check answer yes, was a
shot degraded or held. **Never from a theory about what makes a good picture**, because the change we are about to
make would then raise the rating by definition. Two terms were removed by review for exactly this: how many image
calls a run spent of its six, which rewards spending less while D-027 holds two calls as reserve on purpose; and
how many shots were backed by a picture, which a service setting decides rather than a fix. Both are still
reported as figures. **No rating ever decides anything.**

**An absent part scores zero against its weight, and that is deliberate.** The first design renormalised over the
parts a run reached, which made the worst runs score best: two runs that died on their first picture reached only
the plan, scored 100 on it, and so outranked every finished reel, since only finished reels carry the final check
that refused 4 of 12. A run that reached no part at all gets **no rating**, not a zero.

**The rule for comparing two things, written now, before any number is read.** Comparison is by rate, never by
total, so a four-shot run and a six-shot run can be compared at all. The measures that decide: **reels made**,
**the share of pictures refused**, **the share of takes refused**, **the share of finished cuts refused**, **shots
degraded**, **shots held at the take cap**, **cost per run** and **wall clock per run** — each per run, and each
with the count it was computed from.

- **A measure has moved** only when its change is **bigger than twice the uncertainty the two sides' own counts
  allow**, computed from those counts and printed beside every number, never typed in here.
- **Two sides are comparable only through briefs they share.** A brief is the request with its identifier and its
  options removed; the 52 runs fall into 25 such groups, the largest holding 8 runs. **Below three shared groups
  there is no verdict at all**, and a measure must move the same way in at least two thirds of the shared groups.
- **Nothing is credited** while pictures judged per run, or shots per run, falls by more than its own uncertainty
  band allows: a number earned by making fewer pictures, or planning fewer shots, is not an improvement. No
  constant is typed in for this; it is the same band as everything else.
- **Every comparison of runs already made is stamped "not a controlled comparison"**, with its reason — 25 briefs
  under a changing engine, and **no row records which engine version made it** — and yields deltas, never a
  verdict. A verdict needs the frozen brief set the paid pass will bring. The rule is written now so that it is
  fixed before the first number is bought rather than chosen after the numbers land.
- **A part not reached has no numbers**, never zeros, and a comparison compares only the parts both sides reached.

**The risks, said before anything is read.**

- **A scorecard can be read as a judgement of a reel's quality.** It is not: the engine has no measure of how good
  anything looks, only of whether its own checks passed. Each rating is named for what it measures.
- **A single number invites being optimised.** Hence the ratings deciding nothing, and the two removed terms.
- **Two runs are never a comparison.** The services are not deterministic: one run of a brief refused nothing while
  four runs of an almost identical brief refused 5 of 12 pictures.
- **Some things the record simply does not hold** — which engine version made a run, which picture rule it ran
  under, whether an image call failed for a moment. Each is reported as **not recorded**, never as zero, and each
  is a finding for another feature rather than something to fix here.

**What does not change.** Every check, every cap, every gate, every brief, every price, and what the engine does
with any of them. Nothing is written to the engine's record: it is opened to read and never to write.

## Gate 2 — Architecture

### Where each part lives

| place                             | what it gains                                                                                                                                                                                | what it still may not do                                                                                                  |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `packages/benchmark`              | **the arithmetic, pure**: parse a stored verdict, classify a reason, compute every measure from arrays of rows, the five part ratings and the run rating, the comparison and its uncertainty | do any I/O, import `domain`, `providers`, any app, any npm package but `zod`, read an environment variable                |
| `scripts/benchmark.mjs`           | **the reader**: open a database read-only, select rows, hand them to the package, print the scorecard, write the record and the ledger                                                       | open a database for writing, reach a provider, spend, start the engine, start any process but `git rev-parse`, read a key |
| `docs/research/benchmark.md`      | the ledger: every run scored, one row each, written by the script                                                                                                                            | be typed by hand (S-016's rule, as `journey.mjs` has it); hold a path of any kind                                         |
| `tests/yield-benchmark-*.test.ts` | the checks below, all free, all provider-free                                                                                                                                                | call a provider                                                                                                           |
| **the engine**                    | **nothing**                                                                                                                                                                                  | —                                                                                                                         |

**Why a package and not one script.** `check.mjs` holds every `scripts/` path to the full suite
(`FULL_ONLY`, `/^scripts\//`), so a feature built entirely in a script makes every slice a 1413-second run — the
opposite of what S-177 exists for. With the arithmetic in a package, two slices are ordinary targeted slices and
the pure functions are testable from committed row fixtures with no database and no engine at all.

**A twenty-third boundary rule, `benchmark-is-pure`**: nothing in `packages/benchmark` may import `domain`,
`providers`, an app, a node builtin, or any npm package but `zod`. It is added to `.dependency-cruiser.cjs` with a
deliberate violation of it in `scripts/drift.mjs --prove`, as the other twenty-two have (S-020). Without it the
package is one careless import away from being a second place that knows how to open a database. The package is
entered through `src/index.ts` and its reference is added to the root `tsconfig.json`, which
`tests/workspace.test.ts` requires.

**How the reader opens the record.** `node:sqlite` with `readOnly: true`, never the domain's opener — which opens
for writing, migrates and creates a missing file — exactly as `scripts/refused.mjs` does. The database is `--db`,
else `CUTROOM_DB_PATH`, else the service's default, which is `refused.mjs`' own order (D-086). A missing path exits
non-zero and creates nothing. It imports `@cutroom/service` only for the setting name and the default path, as
`refused.mjs` does — which transitively reaches `providers`, so the rule here is **it constructs no port, makes no
call and reads no key**, and `drift`'s key scan already covers `scripts/` with no new rule needed.

**Three views.** The **scorecard** on screen, figures only. The **full record**, one JSON file per scoring run,
holding every field below including the blobs — each prompt sent, each witness observation, each reconciler answer,
each take's scan and probe, the render manifest, the ffmpeg invocations, every reason string. The **ledger**, one
committed row per run. **Model text and blobs print only when asked for**, a flag this feature adds — and
`scripts/refused.mjs` prints its answers unconditionally, so it is the precedent for _keeping_ model text readable,
not for hiding it. No key, URL or query string anywhere (D-022).

**Two settings, each with a gitignored default** (D-086's form): `--out` for the full record, defaulting under
`.artifacts/benchmark/`, and `--ledger` for the ledger, defaulting to `docs/research/benchmark.md` so a check can
write a fixture ledger to a temporary path instead of the committed file. **No artifact path ever reaches the
committed ledger**: every stored path is absolute by construction (`providers`' artifact root resolves from the
module URL), the full record stores them relative to that root, and the ledger holds no path at all — which a check
asserts, because `tests/no-absolute-paths.test.ts` skips `docs/`.

### What the scorecard holds, part by part

Each field names the column it is read from. **An absent row is reported as absent, never as zero** (S-046's
rule), and **a fact the record does not hold is reported as "not recorded"**, never as zero.

**The run.** Run id, request id, world; **the brief group** — the SHA-256 of `request_canonical` with `requestId`
and `options` removed, computed here and stored nowhere, which is what "the same brief" means in every comparison;
which run it resumes and which resumed it; the ending (`completed`, `stopped`, `failed`, `refused`, `cancelled`)
with its rule, step and detail, and its failure class (S-163); **whether a watchable file came out**, its duration
and frames; cost by kind — image, video and speech from their receipts, and **model calls not billed per call
(S-129), so tokens are reported and no model cost exists to read**; cents paid for calls that produced nothing
(`lost_call`); the run's own ceiling from its stored request, which is what spend is compared against — **the
per-reel cap is parsed from `BUDGET.md` at run time and stored nowhere, so a historical run cannot be measured
against the cap it ran under**; the selected plan's estimate beside the actual, labelled with what the estimate
excludes (the reserve, S-035, and narration, S-070), so a conforming run reads as an under-estimate by design;
total wall clock; per job — `run_at` to `locked_at`, attempts, lease, error; lost calls by port; answers that could
not be read, by role, call and ask; **transient faults for the speech and video ports only, because only their
receipts carry the column — the image and model ports report "not recorded", and the image port cannot report a
transient at all** (`PictureAnswer` has no `unavailable` kind; six runs died of it).

**Seconds per stage, and the convention it needs.** A stage's seconds run from its `stage.started` to its
`stage.finished`; S-046 deliberately writes no `stage.finished` for a stopped stills stage, which is why the record
holds 118 starts against 74 finishes. When the finish is absent the end is taken from the next stage's start, else
from `run.finished`, and **the row says which of the three rules it used**. There is no per-call duration anywhere
in the record: every receipt has one `at`, so **what can be computed is the gap between consecutive receipts of a
run — reported as a gap, never as a latency, with the first call's gap absent**. The one true duration is the
render's `started_at` to `finished_at`.

**Part 1 — the plan.** Both fork plans with unit count, axis, planned image calls, estimate, Gate 0's verdict and
the scorer's total; which was selected; whether a repair plan was needed; the chosen plan's shots, seconds per
shot, total seconds, subjects, **subjects per shot and the maximum**, and which criteria each unit carries; every
model call's role, model, temperature and tokens; admission's figure against the ceiling.

**Part 2 — the pictures.** Pictures planned, attempted and chosen; per picture its role (canonical, derived,
standalone), shot, subject, label, framing, reference pictures, the exact prompt sent, its attempt number; **Gate 1
step by step** — technical, text, witness, reconcile — with each outcome, coverage and every reason string,
classified; Gate 1S's coverage, suspicion, answer and reasons, reported verbatim; the keyframe score's terms,
weights and total; the technical measure; the words the text step read; the witness's own detail — how many things
it listed, how many it called clipped, which named subject each clip fell on; the reconciler's answer and what code
made of it; retries per shot and repair pictures; shots degraded with gate (`1` or `1S`) and reason; **image calls
used of six** as a reported figure; calls lost; cost per picture from each receipt's own `rate_cents` and
`cost_cents`, so a rate change is visible rather than assumed.

**Part 3 — the narration.** Per shot the text spoken, its characters, its probed duration, whether word timings
parsed; each speech receipt's model, characters, rate, cost and transient faults; refused timing answers.

**Part 4 — the clips.** Takes per shot with number and mode (**image-to-video against text-to-video, and the
share**), which picture a take was held to, its seed, the seconds asked for, the prompt, the provider's expanded
prompt and the expansion mode; the probe — readable, duration delivered against asked, codec, size, fps, frames,
audio, `moovFirst`; the scan — black stretches, frozen stretches, silent stretches and loudness in LUFS, of which
**only black and frozen can fail Gate 2; silence and loudness are recorded and fail nothing** (S-072); whether its
sound is speech or music, which is what Gate 3 judges; **Gates 2, 3, 4 and 5** per take with outcome, reasons and
coverage strategy, including Gate 4's recorded limitation; ladder depth per shot; shots held on their picture at
the cap with the picture, the three takes it consumed and the reason (S-098); degradations; clips re-bought after a
transient fault; cost per clip with its own rate and resolution.

**Part 5 — the cut.** The render manifest and its hash; the output profile; how many ffmpeg invocations ran; the
output measured — readable, duration, frames, audio — against the plan's total seconds; **Gate 7's coverage, every
question with its yes or no, the questions answered no, and the number of questions asked**; holds, with the shot,
the seconds and the reason; assembly seconds; cost.

**Gate 7's question set is recorded per run, and a comparison across two sets is refused.** S-158 removed Gate 7's
fifth question and the plan score's fourth term; **two of the four historical Gate 7 refusals are that removed
question**. So the share of cuts refused is not one scale across the record, and nothing in the engine marks the
change. The ledger records each run's question count and a hash of its question list, taken from `render.gate7`'s
own answers, and a comparison that spans two sets says so instead of averaging them.

**The count of subjects in a shot is taken from the plan, never from the picture's prompt.** `picture-prompt` is
about to rewrite that prompt, and a measure parsed out of its wording would break on the change it exists to judge.
The two agree exactly on the stored corpus — read this session: **132 of 132 pictures, zero disagreements**.

### The reason families, scoped to the two gates whose strings they are

**Only Gate 1's and Gate 5's reconcile reasons are classified.** Every other gate's reasons are counted and
reported **verbatim, unclassified**: Gate 0's four tokens, Gate 1S's free text, Gate 2's five (not readable, no
video stream, the aspect string, black, frozen), Gate 3's two (speech, music) and Gate 7's question strings. A
classifier that claimed them all would put a legal string into `other` the first day it appeared.

Gate 1, from `packages/pipeline/src/gates/gate1.ts` — five at reconcile, two at technical, and its text and witness
steps write no reason at all:

```text
subject "<id>" (<name>) is clipped by the edge of the frame       clipping        45 strings on 43 pictures
subject "<id>" (<name>): the count seen does not match its name   count            8 strings
subject "<id>" (<name>) is not shown                              not shown        3 strings
must show "<id>" is not shown: <criterion text>                   must-show       10 strings
must never show "<id>" is shown: <criterion text>                 must-not-show   28 strings
the file is not a readable image                                  technical        never seen
the picture is <w>x<h>, not 9:16                                  technical        never seen
```

Gate 5, from `gates/gate5.ts` — **four, and no clipping one**: a clipped entity fails no take, because D-044's veto
is the keyframe's and a subject leaving a moving frame is motion (S-072). The check below asserts that **no
clipping template exists in `gate5.ts`**, so the rule itself is what is protected rather than a transcription of
it.

The two technical shapes are counted although they have never fired: a run whose pictures come back the wrong shape
is a finding about the provider, not a cleaner rate (P-010's failure). **`other` is asserted empty over the
committed fixture corpus only.** In live scoring an unknown string is reported as a finding and **never fails
anything** — a gate may legally gain a reason tomorrow, and a scorer that refused to run would be worse than one
that says what it has not seen before. A check reads the gate sources so a reworded template turns a check red
instead of emptying a family (S-124's rule, applied to strings).

### The ratings

Five part ratings and one run rating, each 0 to 100, **each term a share in 0 to 1 or a plain yes/no**, every
weight and tolerance written in S-182 and carried as **rating version `r1`**:

| part      | terms and weights inside the part                                                                                                           | weight in the run rating |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------- | -----------------------: |
| plan      | Gate 0 admitted 0.5 · no repair plan needed 0.2 · every planner and scorer answer readable at the first ask 0.3                             |                      0.1 |
| pictures  | share of judged pictures accepted 0.7 · share of the plan's shots not degraded at Gate 1 or 1S 0.3                                          |                      0.3 |
| narration | share of the plan's units spoken 0.5 · share of narrations whose word timings parsed at the first ask 0.5                                   |                      0.1 |
| clips     | share of takes accepted 0.5 · share of shots not held at the take cap 0.3 · share of takes delivered within 0.25 s of the seconds asked 0.2 |                      0.3 |
| cut       | share of Gate 7's questions answered yes 0.6 · no holds 0.2 · output duration within 0.5 s of the plan's total 0.2                          |                      0.2 |

- **An absent part scores 0 against its weight**; a run that reached no part has **no run rating**.
- **Whether a reel came out is reported beside the rating and never folded into it.**
- **Two ratings compare only at the same rating version**, refused inside the rating module itself.
- **No rating decides anything.** Gate 1's named measures decide.

### How two of anything are compared

1. **Rates, not totals** — refusals per judged picture, takes per shot, cents per shot, retries per picture. Totals
   are printed, never compared.
2. **Field by field inside each part, with a direction** each field declares. Nothing is averaged away.
3. **The ratings beside them**, at equal rating version.
4. **The uncertainty computed, not assumed** — twice the standard error of the difference from the two sides' own
   denominators, printed beside each delta; a move inside it is "inside the noise". Its weakness is stated with it:
   refusals inside one run are correlated, so the true uncertainty is larger, which is what the shared-brief
   condition answers.
5. **Comparability is what is recorded, and no more.** Two sides are comparable on the brief groups they share, at
   equal measures version, equal rating version, the same parts reached, and the same Gate 7 question set; the
   comparison also prints each side's recorded rates (`rate_cents` per receipt kind), style id and version,
   `depictionPolicyVersion` and `plannedImageCalls`. **It does not claim a binding to the engine's code**: no run,
   job, receipt or event records the commit that produced it, and the picture rule a run used is a service setting
   recorded on no row. Both are reported as **not recorded**, and every comparison of stored runs is stamped "not a
   controlled comparison".
6. **No verdict below three shared brief groups**, and a verdict only against Gate 1's rule. **The git-diff rule of
   the first draft is gone**: it pretended the commit a reader runs at says something about the engine that made
   the rows. It belongs to Deferred 1, which runs the engine and can record its commit. (And the first draft's
   exemption list was wrong anyway: `BUDGET.md` is Markdown and the engine parses the per-reel cap out of it at run
   time.)

### What is already there to score

Read this session from the real record: **52 runs, 43 selected plans, 132 pictures, 128 witness observations, 127
reconciliations, 118 takes, 95 narrations, 12 renders, 15 degradations, 3 lost calls, 10 refused answers, 691
verdict events**; jobs `reel.plan` 52, `reel.keyframes` 43, `reel.clips` 23, `reel.assemble` 12, with attempts
equal to row count in every kind — **no job has ever been retried**. So the ledger is populated the day this is
built, over every run including the 44 that failed or stopped.

**Once this exists, its output is the authority on what the runs did**, and
`docs/research/refusals.md` and `docs/research/yield-baseline.md` become frozen snapshots, each naming the date and
commit it was read at. Three live documents counting the same refusals is the drift CLAUDE.md refuses for the
decisions, and the two existing files already disagree with a hand count (45 strings on 43 pictures).

### Buying one part, for when the paid pass is built

Recorded so the deferred feature inherits it: the engine's `until` takes exactly `plan`, `stills` and `video`, so a
plan can be bought alone (0¢ under S-129) and the pictures alone (about 20¢ a run, bounded by six image calls at 5¢
or 8¢), while **there is no clips-only or cut-only run**. What exists instead is the engine's own resume: one named
picture or clip of a run already made can be re-made (S-161), which this scorer treats as a new run that inherited
kept pieces.

### Fixtures, and what stands in for a database

**Committed row fixtures, not stand-in engine runs.** The arithmetic is pure, so each check hands the package
arrays of rows shaped exactly as the schema stores them, with every artifact path replaced by a placeholder — the
package never touches a file. The corpus covers one run per ending the record actually holds: died in the plan
stage, died on its first picture, stopped at Gate 1 three times (D-047), stopped at a shot's take cap, stopped at
Gate 7, and completed; plus the awkward rows — a degradation at `1S`, a hold, a still-hold, a lost call, a refused
answer, a resumed run with `kept_from` pieces, and a stopped stills stage with no `stage.finished`. The reader's own
two checks are behavioural, in `tests/ask-again-reader.test.ts`' shape: run the script against a temporary
database and assert its bytes are unchanged, and that a missing path exits non-zero creating nothing.

### How this differs from `scripts/journey.mjs`

`journey.mjs` answers _did this feature's checks pass at this commit_ — binary, run by the suite's own tooling.
This answers _how well did the engine work_ — rates and ratings over runs already made. Two rules are shared and
copied rather than imported: name the commit the reading was done at, and write the result down instead of typing
it. This is never run by a check: not because it spends — it cannot — but because its output is a measurement of
history, and a check that failed on how a past run went is a check nobody could fix.

**`paid-path`'s check 20 already binds this script**: it reads every `.mjs` in `scripts/` and fails if one contains
the text `real-reel`. So `scripts/benchmark.mjs` may not name the spending script even in a comment, and check 5
below is this feature's own containment check — not an absence of one.

## Gate 3 — Program design

### File locations

```text
packages/benchmark/src/index.ts              the package's only entrance
packages/benchmark/src/measures.ts           every measure, from arrays of rows
packages/benchmark/src/reasons.ts            the Gate 1 / Gate 5 reconcile classifier, and the verbatim buckets
packages/benchmark/src/ratings.ts            the five part ratings, the run rating, rating version r1
packages/benchmark/src/compare.ts            rates, deltas, the uncertainty band, the verdict, the refusals
packages/benchmark/package.json              name @cutroom/benchmark, private, exports src/index.ts
tsconfig.json                                the new package's reference (tests/workspace.test.ts)
.dependency-cruiser.cjs                      the 23rd rule, benchmark-is-pure
scripts/drift.mjs                            that rule's deliberate violation, in --prove
scripts/benchmark.mjs                        the reader: read-only SQL, the printer, the record, the ledger
docs/research/benchmark.md                   the ledger: every run scored, ordered, no paths
tests/yield-benchmark-measures.test.ts       checks 1–4
tests/yield-benchmark-ratings.test.ts        checks 7–9
tests/yield-benchmark-compare.test.ts        checks 10–12
tests/yield-benchmark-reader.test.ts         checks 5–6
tests/yield-benchmark-boundary.test.ts       check 13
tests/fixtures/benchmark/*.json              the committed row corpus, every path a placeholder
```

### The checks

1. `every field the scorecard names is computed from the column Gate 2 names for it, over the fixture corpus; a part a run did not reach is ABSENT, not zero; a fact the record does not hold — the engine version, the picture rule, an image-port transient — is 'not recorded', not zero; and a stage with no stage.finished reports its seconds by the stated fallback, naming which rule it used` — S-046's rule, and the three "not recorded" fields that would otherwise read as clean.
2. `gate1.ts still builds its five reconcile templates and its two technical templates and its text and witness steps still write no reason; gate5.ts builds exactly four reconcile templates and NO clipping template; and the verbatim buckets name every other reason-writing site — gate0.ts's four tokens, gate1s.ts, gate2.ts's five, gate3.ts's two, gate7.ts's questions` — read from source, so a reworded reason or a clipping rule smuggled into Gate 5 turns this red.
3. `the classifier puts each committed historical string in its stated family and leaves 'other' empty over the corpus; an unknown string is reported as a finding and fails nothing; and a Gate 2, Gate 3, Gate 1S or Gate 7 reason is never classified, only counted and reported verbatim` — with the strings' units: 45 clipping strings on 43 pictures.
4. `subjects per shot is read from the selected plan, and a picture whose prompt wording changes does not change it; and the brief group is the SHA-256 of request_canonical with requestId and options removed, which puts the corpus's runs in the groups this session measured` — the two computed keys everything else leans on.
5. `the reader opens every database read-only and leaves its bytes unchanged, refuses a missing path non-zero creating nothing, starts no process but git rev-parse, constructs no port and reads no key, prints blobs and model text only when asked, and contains no occurrence of the text 'real-reel'` — behavioural, in ask-again check 22's shape; this is the containment check.
6. `the ledger: scoring the same fixture rows twice writes byte-identical rows; rows are ordered by created_at then run_id; every number has its stated fixed format; no row holds a path of any kind; and the file carries front matter, LF line endings and exactly one trailing newline` — the format invariant session 77 had to repair in `journey.mjs`, and the absolute-path hole `tests/no-absolute-paths.test.ts` leaves in `docs/`.
7. `each part's rating is built only from the engine's own verdicts — the rating function handed a plan whose shots name four subjects and the same plan with one returns the same rating — and the five part ratings and the run rating of three fixture runs equal their stated exact values` — the rule that stops the benchmark scoring its own hypothesis, plus the arithmetic pinned to a number.
8. `an absent part scores 0 against its weight; a run that reached no part has no run rating; a run that died on its first picture does not outrank a completed reel; and two runs with identical verdicts and different endings have identical part ratings and different reported yield` — the inversion the first review found, held by a check.
9. `a rating carries version r1, and the rating module refuses to compare two ratings of different versions` — inside the module, so Slice 2 stands alone.
10. `comparison is per unit: two runs with the same rates and different shot counts compare equal on every rate, and no total is ever compared`.
11. `the uncertainty band is twice the standard error of the difference from the two sides' own denominators; a move inside it is 'inside the noise'; below three shared brief groups there is no verdict; the credit guard uses the same band and no typed constant; a comparison of stored runs is stamped 'not a controlled comparison'; and the verdict arithmetic on fixed pass records is exactly Gate 1's rule with the deciding condition named`.
12. `a comparison refuses, naming what differs, when the measures version, the rating version, the set of parts reached or the Gate 7 question set differ; and it reports the engine version and the picture rule as 'not recorded' rather than comparing them` — S-158's two question sets, and the two facts no row holds.
13. `benchmark-is-pure holds on the real dependency graph, and drift --prove builds a deliberate violation of it — an import of domain, of providers, of an app, of a node builtin and of an npm package other than zod — each seen red and each legal import still resolving` — the 23rd rule, in the form the other 22 have.

Every check runs with no key, no provider and no engine; checks 1–4 and 7–13 need no database at all.

### The least confident decisions

- **The rating weights and the two tolerances** (0.25 s on a take's delivered seconds, 0.5 s on the cut's
  duration). Judgements, written in S-182, version-stamped so a change is visible and never retrospective, and
  pinned to exact fixture values by check 7.
- **Scoring the questions answered yes as a share** rather than all-or-nothing, now that Gate 7's set has changed
  size once: a 4-of-5 run and a 4-of-4 run are different, and the share plus the recorded question set is the
  honest form.
- **Whether the ledger should hold every run or only finished ones.** Every run, including the 27 that failed,
  because where a run died is the measurement; the cost is a long file.
- **Whether the gap between consecutive receipts is worth reporting at all**, given it is queue time plus gate
  time and not a provider's latency. Kept, named as a gap, because it is the only timing the record allows below a
  stage.

## Gate 4 — Slices

- [ ] **Slice 1 — the package and its boundary.** `packages/benchmark` with its index, measures and reasons; the
      committed row fixtures; the 23rd rule in `.dependency-cruiser.cjs` and its `--prove` case; the root
      `tsconfig.json` reference. Checks 1, 2, 3, 4, 13. **Full suite** — boundary configuration and workspace
      configuration are both integrity boundaries (S-177). **Proves: 1, 2, 3, 4, 13.**
- [ ] **Slice 2 — the ratings.** `ratings.ts`: the five part ratings, the run rating, the weights, the tolerances,
      version `r1`, absent parts, no-part-reached. Checks 7, 8, 9. **Targeted** (`--slice`). **Proves: 7, 8, 9.**
- [ ] **Slice 3 — the comparison.** `compare.ts`: rates, per-field deltas with direction, the uncertainty band, the
      shared-brief-group rule, the verdict arithmetic, every refusal. Checks 10, 11, 12. **Targeted.**
      **Proves: 10, 11, 12.**
- [ ] **Slice 4 — the reader and the ledger.** `scripts/benchmark.mjs`, the scorecard, the drill-down, the full
      record under its setting, and `--rescore` writing `docs/research/benchmark.md` over the real record
      read-only. Checks 5, 6. **Full suite** — `scripts/` is full-only. **Proves: 5, 6.**
- [ ] **Slice 5 — the journey.** `node scripts/journey.mjs yield-benchmark`. **Proves: none** — it is the feature's
      proof.

Every check appears in exactly one slice: 5 + 3 + 3 + 2 + 0 = 13.

## Outcome

1. **Every run the engine has ever made is scored, part by part** — counts, timings, costs, retries, every check's
   verdict, a rating a part and a rating a run — for nothing, and the 52 already in the record are in the ledger
   the day it is built.
2. **Any part of any run can be read as deep as it goes**, without writing a query, and what the record does not
   hold is named as not recorded rather than passed off as zero.
3. **The rule for deciding whether a change helped is fixed before the first number is bought** — and this feature
   says plainly that it cannot reach that verdict itself: it answers what happened, and Deferred 1's frozen brief
   set answers whether a change helped.

## Evidence (newest first; appended by the journey, never typed by hand)

## Divergence (the first broken boundary, or "none")

none

## Deferred

1. **The paid pass — its own feature, with its own four gates, after this one is built** (the owner's, 2026-10-12:
   _"we can keep the money eval for later once this benchmark is made"_). It carries: the frozen brief set, taken
   verbatim from stored request bodies and hashed in a manifest, spanning the families the record holds — many
   things in one frame (`4ce40e14`, 8 runs, 3 judged, 100% refused), clipping (`396a6ae3`, 13 judged, 62%),
   lettering and screens (`f984199a`, 12 judged, 83%), a plural subject's count (`f7804542`, 4 judged, 50%), a
   crowded many-thing subject (`872e59f1`, 3 judged, 100%) and one already-clean control (`6763176f`, 4 judged,
   0%); the per-reel ceiling (150¢ — every plan at today's rates estimates 40¢ to 51¢ and the dearest run cost
   75¢, so Gate 0 can never refuse a benchmark reel and no reel can die on its limit); the pass ceiling as a
   constant a dial may only lower; one typed confirmation for a pass; its own database file and artifact root under
   already-ignored paths; serial submission and continuation by pass id through the service's own `waitingRuns` and
   `cancelRuns` (S-163); the engine's resume delay set beyond the pass's life; **the commit and settings recorded
   per pass**, which is what makes the git-diff comparability rule buildable there and unbuildable here; and **a
   containment check of its own shape** — no test file but one naming it, no step of `check.mjs` naming it, no
   script a step runs naming it, and not containing the text `real-reel`. Sizing, at $17.98 left of the $40 total:
   6 reels an arm about 330¢, 18 about 990¢, and the dense version needs the total in `BUDGET.md` raised, in the
   repository that owns it.
2. **Re-judging stored artifacts instead of regenerating them.** All 132 pictures are still on disk with 128
   observations and 127 reconciliations, so a change downstream of a model's answer — the reconciler's
   plural-count defect, a gate's combining logic — can be rescored for nothing, and a change to what a judge is
   asked for the price of model calls (S-129). It catches nothing about a picture prompt, since a different prompt
   makes a different picture.
3. **Recording what produced a run.** No row holds the engine's commit or the picture rule a run ran under, so no
   comparison of stored runs can be controlled. Adding either is an engine change — a finding this feature reports
   and does not act on — and it is what would make a historical comparison mean anything.
4. **Running reels in parallel** — the engine runs one job at a time (`parallel-shots`, S-115, not built).
5. **Enforcing `BUDGET.md`'s per-day and total rows in code** — a new reader in `packages/domain` would put a
   benchmark inside a dozen verified features' amendment lists for a figure a person already reads before
   confirming a spend.
6. **Any judgement of how a reel looks.** The engine's only judges are Gates 1, 1S, 2, 3, 5 and 7; there is no
   measure of sharpness, motion quality or beauty anywhere in it, and the benchmark will not invent one.
7. **Real provider billing.** Every cent here is our configured rate; fal's own figures were read once and video
   billed about 190 times less than we charge ourselves (S-154). Costs are comparable between runs and are not an
   invoice.

## Gate review 1 — 2026-10-12, adversarial reviewer, session 83

Read against the gates, the schema, the gate sources and `check.mjs`. **Twenty findings, all four gates refused.**
Every one is applied above; the four that changed the design rather than its wording:

1. **Gate 5 was said to write five reconcile templates.** It writes four and deliberately no clipping one (S-072),
   so the check would have been red the day it was written and green only by subtraction. **Fixed:** four, named,
   and the check now asserts the absence of a clipping template there.
2. **Gate 2 was said to write a silence reason.** It writes five, none about silence; Gate 3 writes the two sound
   reasons. **Fixed:** the classifier is scoped to Gate 1 and Gate 5 reconcile, every other gate's reasons are
   counted verbatim, and the reason-writing sites are enumerated.
3. **The comparability rule rested on a commit no row records.** **Fixed:** the git-diff rule is gone, moved to
   Deferred 1 where a pass records its own commit; stored comparisons report the engine version and the picture
   rule as not recorded and are stamped not controlled.
4. **The run rating inverted the ranking.** Renormalising over the parts reached made two runs that died on their
   first picture score 100 and outrank every finished reel. **Fixed:** an absent part scores 0 against its weight,
   no part reached means no rating, and check 8 holds it.

The other sixteen, each applied: uncomputable or silently-zero fields (per-call latency, image-port transients,
model cost, the per-reel cap, the brief hash, estimate against actual, stage seconds with no `stage.finished`);
S-158's two Gate 7 question sets in one flat ledger; check 5 forbidding the process the comparison needed and
overclaiming "imports no provider"; every slice being full-suite because `scripts/` is full-only; the full record
having no declared path, no setting and no gitignore while every stored path is absolute; "byte-identical" being
unachievable as stated; S-182 not existing and the rating arithmetic being undefined; "accepted pictures per image
call used" rewarding the measured defect; "shots backed by a picture" conflating a setting with a failure; the
deciding condition being undecidable for runs sharing no brief; the 13-shapes-versus-7-templates confusion and
`other` having to be empty against other gates' legal strings; the stand-in-runs-versus-fixed-rows contradiction;
checks 9 and 12 proving the same property; the outcome overclaiming what this settles; the ledger becoming a third
live copy of the refusal counts; and three misattributions — `refused.mjs` prints model text unconditionally, its
database order includes `CUTROOM_DB_PATH`, and `paid-path`'s check 20 already binds this script's text.
