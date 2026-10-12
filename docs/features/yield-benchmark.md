---
status: current
authority: plan
---

# yield-benchmark — every run scored part by part, and two sides compared under a rule fixed in advance

Status: planned
Decisions: D-001, D-014, D-022, D-025, D-027, D-028, D-031, D-042, D-044, D-046, D-047, D-050, D-055, D-059, D-083, D-086, D-094, D-100, D-111, D-113, S-016, S-020, S-028, S-035, S-040, S-046, S-066, S-070, S-071, S-072, S-073, S-074, S-096, S-098, S-099, S-109, S-111, S-124, S-126, S-129, S-141, S-149, S-150, S-153, S-155, S-156, S-158, S-159, S-161, S-162, S-163, S-164, S-172, S-176, S-177, S-182
Named only as what it cannot see, or as what waits: S-115, S-154
Gates: product pending · architecture pending · program-design pending · slices pending

> **Created 2026-10-12 at the owner's request**, in session 83, out of `PROMPTS/077-benchmark-design.md`. Session 82
> measured the engine's first 52 runs (`docs/research/yield-baseline.md`): 8 of 52 produced a reel, and the picture
> check refused 53% of all pictures. The first fix is scoped (`docs/features/picture-prompt.md`) and cannot be
> judged, because the baseline it would be judged against was never a controlled measurement.
>
> **The owner settled this feature's shape three times in the session itself.** On what a run is: _"whole reel, each
> part should have their own benchmarks, ratings, numbers, timings, everything"_ and _"one number, internal numbers,
> everything will be needed so we have full control and observability on each and every aspect of the system"_, plus
> _"it should be so that the benchmark can be run on individual things as well"_. On the money: _"we can keep the
> money eval for later once this benchmark is made"_ — so buying a batch of reels on frozen briefs is Deferred 1.
> And on the comparison, when it was offered as a deferral: _"No we need job 2 as well, this is also the most
> important or else how would we know whether the new engine or new thing in the engine worked, so no we need job 2
> as well, even if it takes more time and brainstorming and decision making to close."_ **So the comparison is in**,
> fully specified, and the owner also asked that runs become identifiable — _"it should be named, we should have
> this so each run is specifiable"_ — which is `docs/features/run-provenance.md`, named and not built here.
>
> **Revised twice before approval**, against two adversarial rounds and 40 findings, all recorded at the end of this
> file.
>
> **It changes no engine behaviour at all**, and it never weakens a gate, loosens a check, raises a cap or edits a
> brief to make a number look better (CLAUDE.md rule 3).

## Gate 1 — Product (no technical language)

**The problem.** 52 real runs have been made and 8 produced a reel. Everything about them was written down as it
happened — every check's words, every cost, every retry, every measurement of every file — and **none of it can be
read without writing a fresh query**, so nobody can ask what a run cost at each stage, how many retries it burned,
which check refused what, or where it died. Worse, when we change the engine next week there is **no way to tell
whether the change helped**: the 52 runs were made from 25 different briefs while the engine itself changed, and
nothing recorded which version made which run.

**The two jobs.**

1. **Scoring — what happened.** Every run gets a scorecard: five parts — the plan, the pictures, the narration, the
   clips, the finished cut — each with its own counts, timings, costs, retries, what each check said, and **a rating
   out of 100**; and one rating for the whole run. Beside the rating, always, whether a watchable reel came out,
   which no single number is allowed to hide. Ask for one part and it goes as deep as it goes.
2. **Comparing — did a change help.** Two **sides**, each a named set of runs, compared measure by measure, with a
   verdict: **helped**, **inside the noise**, or **no verdict**, and the condition that decided it.

**It costs nothing and it works on everything already made** — all 52 runs today, including the 44 that failed or
stopped, because where a run died is the measurement. New runs come the way they come now: a reel made by hand, with
the owner's confirmation, by the one script that spends. **This feature adds no way to spend money.**

**What a side is, said once.** A side is **a label and an explicit list of runs**. Runs are grouped by **brief** —
the same request, ignoring its identifier — and compared group by group, then across groups. **A side of one run
gets numbers and never a verdict**, because the services are not deterministic: one run of a brief refused nothing
while four runs of an almost identical brief refused 5 of 12 pictures. **Two sides must have asked the engine for
the same thing** — a plan-only run and a whole reel are never pooled.

**What makes a verdict possible, and what it still cannot prove.** The honest limit first: **nothing in the record
says which version of the engine made a run.** So the benchmark does three things instead of pretending.

- It computes a **fingerprint** of each side from what the record does hold — every call's rate, the style and its
  version, the depiction policy version, how many pictures the plan meant to make, the final check's question set,
  and whether the run made standalone pictures — and **refuses a verdict when the two sides' fingerprints differ**.
- It requires the person to **declare the change under test**, which is printed with the verdict.
- It prints **"engine version: not recorded"** on every comparison, so no verdict is ever read as more than it is.

Making that airtight is `run-provenance`: every run records what made it. Until then a verdict means _"these two
sets of runs differ this much, and nothing we can see other than your declared change differs between them."_

**The rule, written now, before any number is read.** Comparison is by rate, never by total, so a four-shot run and
a six-shot run compare at all. The measures that decide: **reels made**, **the share of pictures refused**, **the
share of takes refused**, **the share of finished cuts refused**, **shots degraded per run**, **shots held at the
take cap per run**, **cost per run** and **wall clock per run**.

- **A measure has moved** only when its change is **more than twice the uncertainty the two sides' own numbers
  allow**. That figure is computed, never typed here, and **how it is computed depends on the kind of measure**: a
  share uses the counts behind it; a per-run average uses how much the runs varied. An average needs **at least two
  runs a side** or it has no uncertainty at all, and then that measure gets no verdict.
- **A verdict needs at least two runs a side in a brief group, and at least three groups in common** — six runs a
  side at the least. Below that: numbers, no verdict.
- **A measure must move the same way in at least two thirds of the shared groups.** A group where it did not move
  at all counts as not moved. A group where the measure does not exist on one side — no picture judged, no take
  made — is dropped, and if fewer than three groups remain, that measure gets no verdict.
- **Nothing is credited while the work got smaller.** The guard is on quantities a real fix cannot lower: **shots
  the plan asked a picture for**, **accepted pictures per shot**, and **shots degraded**. **Fewer pictures judged is
  not by itself a withholding** — a better prompt wins by not burning retries, so judged pictures fall for the right
  reason. What is caught is fewer pictures _with_ fewer acceptances per shot.
- **Every comparison of runs made before `run-provenance` exists is stamped "engine version not recorded"**, with
  its fingerprint comparison beside it.
- **A part not reached has no numbers**, never zeros, and only the parts both sides reached are compared.

**What a rating is, and what it is not allowed to be.** A part's rating is built **only from what the engine's own
checks said**. **Never from a theory about what makes a good picture**, because the change we are about to make
would then raise the rating by definition. Two terms were removed by review for exactly that: how many image calls a
run spent of its six, which rewards spending less while two of the six are reserve on purpose; and how many shots
were backed by a picture, which a setting decides rather than a fix. Both are still reported as figures. **An absent
part scores zero against its weight** — renormalising made two runs that died on their first picture score 100 and
outrank every finished reel — and a run that reached no part has **no rating at all**. **No rating ever decides
anything**; the measures above decide.

**The risks, said before anything is read.**

- **Six runs a side is the floor, not a comfortable sample.** The benchmark prints what it cannot resolve rather
  than hiding it, and a 10-point move on six runs will honestly read as noise.
- **A scorecard can be read as a judgement of quality.** It is not: the engine has no measure of how good anything
  looks, only of whether its own checks passed.
- **Some things the record does not hold** — the engine version, the picture rule a run used, whether an image call
  failed for a moment. Each reads as **not recorded**, never as zero.

**What does not change.** Every check, cap, gate, brief and price, and what the engine does with any of them.
Nothing is written to the engine's record: it is opened to read and never to write.

## Gate 2 — Architecture

### Where each part lives

| place                             | what it gains                                                                                                                                                                                             | what it still may not do                                                                                                  |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `packages/benchmark`              | **the arithmetic, pure**: parse a stored verdict, classify a reason, compute every measure from arrays of rows, the five part ratings and the run rating, the comparison, its uncertainty and its verdict | any I/O, `domain`, `providers`, any app, any npm package but `zod`                                                        |
| `scripts/benchmark.mjs`           | **the reader**: open a database read-only, select rows, hash the brief and the fingerprint, hand plain rows to the package, print, write the record and the ledger                                        | open a database for writing, reach a provider, spend, start the engine, start any process but `git rev-parse`, read a key |
| `docs/research/benchmark.md`      | the ledger: every run scored, one row each, written by the script                                                                                                                                         | be typed by hand (S-016's rule, as `journey.mjs` has it); hold a path of any kind                                         |
| `tests/yield-benchmark-*.test.ts` | the checks below, all free, all provider-free                                                                                                                                                             | call a provider; contain the literal text of the script name `paid-path`'s check 20 forbids                               |
| **the engine**                    | **nothing**                                                                                                                                                                                               | —                                                                                                                         |

**Why a package and not one script.** `check.mjs` holds every `scripts/` path to the full suite (`FULL_ONLY`,
`/^scripts\//`), so a feature built entirely in a script makes every slice a full run. With the arithmetic in a
package, two slices are ordinary targeted slices and every pure function is checked from committed row fixtures with
no database and no engine.

**Three new boundary rules, not one.** A single blanket rule is not expressible: dependency-cruiser ANDs a `to`'s
attributes, so "any builtin" and "any npm package but `zod`" cannot share one rule, and a bare-name regex for
builtins also matches an unresolved `zod` and would report a legal import. So, mirroring `pipeline`'s own set:

| rule                     | forbids                                                                        |
| ------------------------ | ------------------------------------------------------------------------------ |
| `benchmark-no-engine`    | `to.path` `^(packages/(domain\|providers)\|apps)/` — one regex, three targets  |
| `benchmark-no-io`        | the enumerated I/O builtins `pipeline-no-io` already names, plus `node:sqlite` |
| `benchmark-npm-only-zod` | a `node_modules/` resolution other than `zod`                                  |

**Hashing lives in the reader, not the package**, which is what lets `benchmark-no-io` forbid `node:crypto` outright:
the brief key and the fingerprint are computed in `scripts/benchmark.mjs` with `createHash` and handed in as opaque
strings. **The rule count becomes 25**, and the five places that say 22 are amended in Slice 1 — see "What this
feature changes in verified features".

The package is entered through `src/index.ts`, carries its own `tsconfig.json`
(`tests/workspace.test.ts` requires one), is referenced from the root `tsconfig.json`, and is a workspace
dependency of the root so the script can import it by name as `scripts/refused.mjs` imports `@cutroom/service`.

**How the reader opens the record.** `node:sqlite` with `readOnly: true`, never the domain's opener — which opens
for writing, migrates and creates a missing file — exactly as `scripts/refused.mjs` does. The database is `--db`,
else `CUTROOM_DB_PATH`, else the service's default, which is `refused.mjs`' own order (D-086). A missing path exits
non-zero and creates nothing. It imports `@cutroom/service` only for that setting name and default, which
transitively reaches `providers`, so the rule here is **it constructs no port, makes no call and reads no key** —
held by a PATH-only child in S-028's form, because a key read that returns nothing leaves a successful run looking
identical.

**Three views.** The **scorecard** on screen, figures only. The **full record**, one JSON file per scoring run,
holding every field below including the blobs — each prompt sent, each witness observation, each reconciler answer,
each take's scan and probe, the render manifest, the ffmpeg invocations, every reason string. The **ledger**, one
committed row per run. **Model text and blobs print only when asked for**, a flag this feature adds; `refused.mjs`
prints its answers unconditionally, so it is the precedent for keeping model text readable, not for hiding it. No
key, URL or query string anywhere (D-022).

**Two paths, one gitignored and one tracked.** `--out` for the full record, defaulting under `.artifacts/benchmark/`
— D-086's form, already ignored, no `.gitignore` change. `--ledger` for the ledger, **defaulting to the committed
`docs/research/benchmark.md`**, which is tracked on purpose and is not a D-086 path; the setting exists so a check
writes a fixture ledger to a temporary directory. **No artifact path ever reaches the committed ledger**: every
stored path is absolute by construction (the artifact root resolves from the module URL), the full record stores
them relative to that root, and the ledger holds no path at all — asserted by a check, because
`tests/no-absolute-paths.test.ts` skips `docs/`.

### What the scorecard holds, part by part

Each field names the column it is read from. **Two different rules, said once here:** a row the record does not
hold is reported **absent**; a fact the record cannot hold — the engine version, the picture rule, an image-port
transient — is reported **not recorded**; and **inside a part that was reached, a share with an empty denominator
scores 0** in the rating. Absent in the record, zero in the rating.

**Inherited pieces are counted once, in the run that made them.** A resume copies pictures, narrations and takes
into the new run with `kept_from` set and copies no receipt, so a `kept_from` row is **excluded from every
numerator and denominator of the run that inherited it** and counted in the run that paid for it; a resumed run's
inherited plan stage, whose copied events share one instant, is reported as **inherited, not measured** rather than
as 0 seconds (S-162, S-164).

**The run.** Run id, request id, `worldId` from the stored request; **the brief key** — the SHA-256 of
`request_canonical` with `requestId` and `options` removed, computed in the reader and stored nowhere, which is what
"the same brief" means everywhere below; **`until` and the request's ceiling**, which are never folded into the
brief key and are compared separately, because `until` decides which parts can exist and the ceiling decides when a
run stops; which run it resumes and which resumed it; the ending (`completed`, `stopped`, `failed`, `refused`,
`cancelled`) with its rule, step and detail, and its failure class (S-163); **whether a watchable file came out**,
its duration and frames; cost by kind — image, video and speech from their receipts, and **model calls are not
billed per call (S-129), so `model_receipt` has no cost column and tokens are reported instead**; cents paid for
calls that produced nothing; the run's own ceiling from its stored request, which is what spend is compared against,
since **the per-reel cap is parsed from `BUDGET.md` at run time and stored nowhere**, so no historical run can be
measured against the cap it ran under; the selected plan's estimate beside the actual, labelled with what the
estimate excludes (the reserve, S-035, and narration, S-070), so a conforming run reads as an under-estimate by
design; total wall clock; per job — `run_at` to `locked_at`, attempts, `lease_until`, error; lost calls by port;
answers that could not be read, by role, call and ask; **transient faults for the speech and video ports only,
because only their receipts carry the column — the image and model ports read "not recorded", and the image port
cannot report a transient at all**, since `ImageAnswer` in `packages/contracts/src/picture.ts` has only `made` and
`refused` (six runs died of it).

**Seconds per stage, and the convention it needs.** A stage's seconds run from its `stage.started` to its
`stage.finished`; S-046 deliberately writes no `stage.finished` for a stopped stills stage, which is why the record
holds 118 starts against 74 finishes. When the finish is absent the end is taken from the next stage's start, else
from `run.finished`, and **the row says which of the three rules it used**. There is no per-call duration anywhere:
every receipt carries one `at`, so **what can be computed is the gap between consecutive receipts of a run —
reported as a gap, never as a latency, the first call's gap absent**. The one true duration is the render's
`started_at` to `finished_at`.

**Part 1 — the plan.** Both fork plans with unit count, axis, planned image calls, estimate, Gate 0's verdict and
the scorer's total; which was selected; whether a repair plan was needed; the chosen plan's shots, seconds per shot,
total seconds, subjects, **subjects per shot and the maximum**, and which criteria each unit carries; every model
call's role, model, temperature and tokens; admission's figure against the ceiling.

**Part 2 — the pictures.** Pictures planned, attempted and chosen; per picture its role (canonical, derived,
standalone), shot, subject, label, framing, reference pictures, the exact prompt sent, its attempt number; **Gate 1
step by step** — technical, text, witness, reconcile — with each outcome, coverage and every reason string,
classified; Gate 1S's coverage, suspicion, answer and its reasons, which are shared-subject names reported verbatim;
the keyframe score's terms, weights and total; the technical measure; the words the text step read; the witness's
own detail — how many things it listed, how many it called clipped, which named subject each clip fell on; the
reconciler's answer and what code made of it; retries per shot and repair pictures; shots degraded with gate (`1` or
`1S`) and reason; **image calls used of six** as a reported figure; calls lost; cost per picture from each receipt's
own `rate_cents` and `cost_cents`, so a rate change is visible rather than assumed.

**Part 3 — the narration.** Per shot the text spoken, its characters, its probed duration, whether word timings
parsed; each speech receipt's model, characters, rate, cost and transient faults; refused timing answers.

**Part 4 — the clips.** Takes per shot with number and mode (**image-to-video against text-to-video, and the
share**), which picture a take was held to, its seed, the seconds asked for, the prompt, the provider's expanded
prompt and the expansion mode; the probe — readable, duration delivered against asked, codec, size, fps, frames,
audio, `moovFirst`; the scan — black stretches, frozen stretches, silent stretches and loudness in LUFS, of which
**only black and frozen can fail Gate 2, while silence and loudness are recorded and fail nothing** (S-072);
whether its sound is speech or music, which is what Gate 3 judges; **Gates 2, 3, 4 and 5** per take with outcome,
reasons and coverage strategy, including Gate 4's recorded limitation; ladder depth per shot; shots held on their
picture at the cap with the picture, the three takes it consumed and the reason (S-098); degradations; clips
re-bought after a transient fault; cost per clip with its own rate and resolution.

**Part 5 — the cut.** The render manifest and its hash; the output profile; how many ffmpeg invocations ran; the
output measured — readable, duration, frames, audio — against the plan's total seconds; **Gate 7's coverage, every
question with its yes or no, the questions answered no, and how many questions were asked**; holds, with the shot,
the seconds and the reason; assembly seconds; cost.

**Gate 7's question set is recorded per run and carried in the rating stamp.** S-158 removed Gate 7's fifth question
and the plan score's fourth term, and **two of the four historical Gate 7 refusals are that removed question**, so
the share of cuts refused is not one scale across the record and nothing in the engine marks the change. Each run's
question count and a hash of its question list are taken from `render.gate7`'s own answers, the cut rating and the
run rating carry that hash beside the rating version, and **two ratings compare only when both match**.

**The count of subjects in a shot is taken from the plan, never from the picture's prompt.** `picture-prompt` is
about to rewrite that prompt, and a measure parsed out of its wording would break on the change it exists to judge.
The two agree exactly on the stored corpus: **132 of 132 pictures, zero disagreements**.

### The reason families, scoped to the gates whose strings they are

**Only Gate 1's and Gate 5's reconcile reasons are classified.** Everything else is counted and reported
**verbatim, unclassified**: Gate 0's four tokens (`coverage`, `criteria`, `shape`, `cost`), Gate 1S's shared-subject
names, Gate 2's five, Gate 3's two, Gate 7's question strings, **the degradation reasons composed in
`packages/pipeline/src/stills/index.ts`**, **the hold and still-hold reasons from `clips/ladder.ts` and
`clips/index.ts`**, and **`lost_call.detail`**. A classifier that claimed them all would put a legal string into
`other` the first day it appeared.

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

Gate 5, from `gates/gate5.ts`, writes **four** of those and **no clipping one**: a clipped entity fails no take,
because D-044's veto is the keyframe's and a subject leaving a moving frame is motion (S-072). The check below
asserts that **no clipping template is among the strings `takeFailures` pushes** — read from the pushed templates
and not from the file's text, since the word _clipped_ appears in that function's own docstring.

The two technical shapes are counted although they have never fired: a run whose pictures come back the wrong shape
is a finding about the provider, not a cleaner rate (P-010's failure). **`other` is asserted empty over the
committed fixture corpus only.** In live scoring an unknown string is **reported as a finding and fails nothing** —
a gate may legally gain a reason tomorrow, and a scorer that refused to run would be worse than one that says what
it has not seen before. A check reads the gate sources so a reworded template turns a check red instead of emptying
a family (S-124's rule, applied to strings).

### The ratings, with their arithmetic

Each term is a **share in 0 to 1** or a **yes/no read as 1 or 0**; a part's rating is `100 × Σ(term × weight)`; the
run rating is `Σ(part rating × part weight)`, shown to one decimal. **Weights and tolerances live in S-182** and are
carried as **rating version `r1`** beside the Gate 7 question-set hash.

| part      | terms and weights inside the part                                                                                                                 | run weight |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ---------: |
| plan      | Gate 0 admitted 0.5 · no repair plan needed 0.2 · every planner and scorer answer readable at the first ask 0.3 — **0 when no plan was selected** |        0.1 |
| pictures  | share of judged pictures accepted 0.7 · share of the plan's shots not degraded at Gate 1 or 1S 0.3                                                |        0.3 |
| narration | share of the plan's units spoken 0.5 · share of narrations whose word timings parsed at the first ask 0.5                                         |        0.1 |
| clips     | share of takes accepted 0.5 · share of shots not held at the take cap 0.3 · share of takes delivered within 0.25 s of the seconds asked 0.2       |        0.3 |
| cut       | share of Gate 7's questions answered yes 0.6 · no holds 0.2 · output duration within 0.5 s of the plan's total 0.2                                |        0.2 |

- **A part is reached** when its stage started. **An absent part scores 0 against its weight**; a run that reached
  no part has **no run rating**; and **a run whose `until` asked for fewer parts is rated over the parts it asked
  for**, labelled `plan-only` or `stills-only`, never pooled with a whole reel.
- **Three worked values, so the arithmetic is independent of the code** (the fixtures of check 7):
  - `dead-in-plan` — no plan selected: plan 0, four parts absent ⇒ **run rating 0.0**.
  - `dead-on-first-picture` — plan admitted, no repair, answers first ask ⇒ plan 100; pictures reached with nothing
    judged ⇒ both shares empty ⇒ pictures 0; three parts absent ⇒ **run rating 10.0**.
  - `stopped-at-gate-1` — plan 100; 6 judged, 2 accepted (0.333) and 4 shots with 2 degraded (0.5) ⇒ pictures
    `100 × (0.7 × 0.333 + 0.3 × 0.5) = 38.3` ⇒ **run rating 21.5**.
  - `completed` — plan 100; 5 judged, 4 accepted (0.8), 5 shots 1 degraded (0.8) ⇒ pictures 80.0; 5 of 5 spoken and
    parsed ⇒ narration 100; 7 takes 6 accepted (0.857), no held shot, all within tolerance ⇒ clips 92.9; Gate 7 four
    of four yes, no hold, duration within 0.5 s ⇒ cut 100 ⇒ **run rating 91.9**.
  - So `dead-in-plan` < `dead-on-first-picture` < `stopped-at-gate-1` < `completed`, which is the ranking check 8
    holds.
- **No rating decides anything.** The measures below decide.

### How two sides are compared

1. **A side is a label and an explicit list of runs**, grouped by brief key; runs are pooled only within a group,
   and groups are then counted. A side of one run yields numbers and no verdict.
2. **Rates, not totals** — refusals per judged picture, takes per shot, cents per run, retries per picture. Totals
   are printed, never compared.
3. **Field by field inside each part, with a direction** each field declares. Nothing is averaged away. Only the
   parts both sides reached are compared; a part one side never reached is listed as such.
4. **The uncertainty band, computed per kind of measure** — this is the arithmetic, stated so one implementation is
   possible:
   - **a share** (pictures refused, takes refused, cuts refused, reels made): `2 × √(p₁(1−p₁)/n₁ + p₂(1−p₂)/n₂)`,
     where `n` is the judged items on that side (runs, for reels made);
   - **a per-run average** (cost per run, wall clock per run, shots degraded per run, shots held per run):
     `2 × √(s₁²/n₁ + s₂²/n₂)`, where `s²` is the sample variance over that side's runs, which **needs at least two
     runs a side** — with one, the measure has no band and gets no verdict;
   - every band is printed beside its delta, and its weakness is printed with it: refusals inside one run are
     correlated, so the true uncertainty is larger, which is what the two-thirds-of-groups condition answers.
5. **Comparability is what is recorded, and no more.** Two sides are comparable when `until` matches, the measures
   version matches, the rating stamp matches (rating version **and** Gate 7 question-set hash), and the
   **fingerprints** match: every receipt kind's `rate_cents`, style id and version, `depictionPolicyVersion`,
   `plannedImageCalls`, the contract version, and whether standalone pictures exist (which reveals the picture
   rule). A mismatch refuses the verdict and names the field. **The engine's code version and the picture rule
   setting are reported as "not recorded"**, always, and the declared change under test is printed with the
   verdict — until `run-provenance` records them.
6. **The verdict** — `helped`, `inside the noise`, or `no verdict` — against Gate 1's rule, naming the condition
   that decided it, the groups it rested on, and the guard quantities.

### What is already there to score

Read this session from the real record: **52 runs over 25 brief groups** (largest 8 runs, then 5, 4, 4, 4), 43
selected plans, 132 pictures, 128 witness observations, 127 reconciliations, 118 takes, 95 narrations, 12 renders,
15 degradations, 3 lost calls, 10 refused answers, 691 verdict events; jobs `reel.plan` 52, `reel.keyframes` 43,
`reel.clips` 23, `reel.assemble` 12, with attempts equal to row count in every kind — **no job has ever been
retried**. So the ledger is populated the day this is built, over every run including the 44 that failed or stopped.
**No two of those 25 groups hold two runs on one engine version**, which is why the first real verdict waits on
runs made after this exists.

**Once this exists, its output is the authority on what the runs did**, and `docs/research/refusals.md` and
`docs/research/yield-baseline.md` become frozen snapshots, each naming the date and the commit it was read at —
three live documents counting the same refusals is the drift CLAUDE.md refuses for the decisions, and the two
existing files already disagree with a hand count (45 strings on 43 pictures).

### Fixtures, and what stands in for a database

**Committed row fixtures, not stand-in engine runs.** The arithmetic is pure, so each check hands the package arrays
of rows shaped as the schema stores them, with every artifact path replaced by a placeholder; the package never
touches a file. `tests/fixtures/wire/` is the precedent, and `tests/no-absolute-paths.test.ts` already covers
`tests/**/*.json`, so the placeholder rule is enforced by an existing check.

**Taken from the record** (read read-only, paths replaced): one run per real ending — died in the plan stage, died
on its first picture, stopped at Gate 1 three times (D-047), stopped at a shot's take cap, stopped at Gate 7, and
completed — plus a hold, a still-hold, a lost call, a refused answer, and a stopped stills stage with no
`stage.finished`.

**Constructed by hand, because the record holds no such run, and each says what it exercises:** a degradation at
Gate 1S (Gate 1S has judged 8 pairs and refused none); a resumed run with `kept_from` pictures, narrations and takes
and no `reel.plan` job (no run has been resumed); **two runs with equal rates and different shot counts**, which is
what the per-unit check needs; and **two sides of three brief groups with two runs each**, which is what the verdict
and the band need.

### Buying one part, for when the paid pass is built

The engine's `until` takes exactly `plan`, `stills` and `video`, so a plan can be bought alone (0¢ under S-129) and
the pictures alone (about 20¢ a run, bounded by six image calls at 5¢ or 8¢), while **there is no clips-only or
cut-only run**. What exists instead is the engine's own resume: one named picture or clip of a run already made can
be re-made (S-161), which this scorer treats as a new run that inherited kept pieces.

### How this differs from `scripts/journey.mjs`

`journey.mjs` answers _did this feature's checks pass at this commit_ — binary, run by the suite's own tooling. This
answers _how well did the engine work, and did a change help_ — rates, ratings and a verdict over runs already made.
Two rules are shared and copied rather than imported: name the commit the reading was done at, and write the result
down instead of typing it. This is never run by a check: not because it spends — it cannot — but because its output
is a measurement of history, and a check that failed on how a past run went is a check nobody could fix.
**`paid-path`'s check 20 already binds this script**: it reads every `.mjs` in `scripts/` and fails if one contains
the text of the spending script's name, so `scripts/benchmark.mjs` may not name it even in a comment — and check 5
below, which asserts that, **builds the forbidden string rather than containing it**, since that same check forbids
any other test file from holding it.

### What this feature changes in verified features (S-099's form)

Three new boundary rules take the count from 22 to **25**, and five places assert the old number. **All five are
amended in Slice 1**, and no check is weakened — each keeps its exact form with its number corrected:

| where                                     | what changes                                                   |
| ----------------------------------------- | -------------------------------------------------------------- |
| `tests/reel-stills-rules.test.ts` check 3 | `22 rules proven to fire` → `25`                               |
| `tests/reel-render-rules.test.ts` check 2 | the same assertion                                             |
| `tests/paid-path-keys.test.ts` check 4    | the same assertion, and its cross-reads of the other two files |
| `CLAUDE.md`                               | "**Twenty-two** boundary rules are enforced" → twenty-five     |
| `AGENTS.md`                               | the same count                                                 |

`paid-path`'s check 20 is unchanged in form and subject. `reel-stills`, `reel-render` and `paid-path` each get an
amendment block saying so, and their journeys re-run in the last slice (S-099's form). Nothing else is touched: no
contract, stand-in, shared helper, provider or setting changes.

## Gate 3 — Program design

### File locations

```text
packages/benchmark/src/index.ts              the package's only entrance
packages/benchmark/src/measures.ts           every measure, from arrays of rows
packages/benchmark/src/reasons.ts            the Gate 1 / Gate 5 reconcile classifier, and the verbatim buckets
packages/benchmark/src/ratings.ts            the five part ratings, the run rating, the stamp (r1 + question-set hash)
packages/benchmark/src/compare.ts            sides, rates, deltas, the two bands, the verdict, the refusals
packages/benchmark/package.json              @cutroom/benchmark, private, exports src/index.ts
packages/benchmark/tsconfig.json             required of every package (tests/workspace.test.ts)
tsconfig.json                                the new package's reference
package.json, pnpm-lock.yaml                 @cutroom/benchmark as a workspace dependency, so the script imports it by name
.dependency-cruiser.cjs                      benchmark-no-engine, benchmark-no-io, benchmark-npm-only-zod
scripts/drift.mjs                            a deliberate violation of each of the three, in --prove
scripts/benchmark.mjs                        the reader: read-only SQL, the two hashes, the printer, the record, the ledger
docs/research/benchmark.md                   the ledger: every run scored, ordered, no paths
docs/research/refusals.md                    frozen: the date and commit it was read at (Slice 4)
docs/research/yield-baseline.md              frozen the same way, and `PictureAnswer` corrected to `ImageAnswer` (Slice 4)
tests/yield-benchmark-measures.test.ts       checks 1–4
tests/yield-benchmark-ratings.test.ts        checks 7–9
tests/yield-benchmark-compare.test.ts        checks 10–12
tests/yield-benchmark-reader.test.ts         checks 5–6
tests/yield-benchmark-boundary.test.ts       check 13
tests/yield-benchmark-schema.test.ts         check 14
tests/yield-benchmark-secrets.test.ts        check 15
tests/fixtures/benchmark/*.json              the row corpus, every path a placeholder
```

The reader runs as every script here does: `node --experimental-strip-types --no-warnings scripts/benchmark.mjs`.

### The checks

1. `every field the scorecard names is computed from the column Gate 2 names for it, over the fixture corpus; a part whose stage never started is ABSENT; a share with an empty denominator inside a reached part is 0; the engine version, the picture rule and an image-port transient read 'not recorded'; a stage with no stage.finished reports its seconds by the stated fallback and names which rule it used; and a kept_from row is excluded from the inheriting run's every numerator and denominator while an inherited plan stage reads 'inherited, not measured'`.
2. `gate1.ts still builds its five reconcile templates and its two technical templates while its text and witness steps write no reason; the strings takeFailures pushes in gate5.ts are exactly four and none of them is the clipping one; and the verbatim buckets name every other reason-writing site — gate0.ts's four tokens, gate1s.ts's shared-subject names, gate2.ts's five, gate3.ts's two, gate7.ts's questions, stills/index.ts's degradation reasons, clips/ladder.ts's and clips/index.ts's hold reasons, and lost_call.detail`.
3. `the classifier puts each committed historical string in its stated family and leaves 'other' empty over the corpus; an unknown string is reported as a finding and fails nothing; and a Gate 0, 1S, 2, 3, 7, degradation, hold or lost-call reason is never classified, only counted and reported verbatim` — with each string's unit: 45 clipping strings on 43 pictures.
4. `subjects per shot is read from the selected plan and does not move when a picture's prompt wording changes; the brief key is the SHA-256 of request_canonical with requestId and options removed, which puts the corpus's runs in the groups this session measured; and until and the request's ceiling are carried outside that key`.
5. `the reader opens every database read-only and leaves its bytes unchanged; refuses a missing path non-zero, creating nothing; starts no process but git rev-parse; constructs no port and reads no key; prints blobs and model text only when asked; and contains no occurrence of the spending script's name, which this check BUILDS rather than writes` — behavioural, in `tests/ask-again-reader.test.ts`' shape; the containment check.
6. `the ledger: scoring the same fixture rows twice writes byte-identical rows; rows are ordered by created_at then run_id; the columns are exactly those Gate 2 lists, each in its stated format — integer cents, seconds to one decimal, shares and ratings to one decimal; no row holds a path of any kind; and the file carries its front matter, LF line endings and exactly one trailing newline`.
7. `each part's rating is built only from the engine's own verdicts — the rating function handed a plan whose shots name four subjects and the same plan with one returns the same rating — and the four worked fixtures rate exactly 0.0, 10.0, 21.5 and 91.9, term by term as Gate 2 states them`.
8. `an absent part scores 0 against its weight; a run that reached no part has no run rating; a run rated over a shorter until is labelled and never pooled with a whole reel; the four fixtures rank dead-in-plan < dead-on-first-picture < stopped-at-gate-1 < completed; and two runs with identical verdicts and different endings have identical part ratings and different reported yield`.
9. `a rating carries version r1 and its run's Gate 7 question-set hash, and the rating module refuses to compare two ratings whose version or question-set hash differ`.
10. `comparison is per unit: two runs with the same rates and different shot counts compare equal on every rate, and no total is ever compared`.
11. `the band for a share is twice the pooled binomial standard error of the difference and the band for a per-run average is twice the standard error from the two sides' sample variances; a side of one run gets no band and no verdict on an average; a move inside a band is 'inside the noise'; a verdict needs two runs a side in a group and three shared groups; a group whose delta is zero counts as not moved; a group where the measure is undefined on one side is dropped, and fewer than three remaining groups means no verdict for that measure; and the guard withholds credit only when shots asked a picture for, accepted pictures per shot, or shots degraded moved the wrong way — never on judged pictures alone`.
12. `a comparison refuses, naming what differs, when until, the measures version, the rating stamp or any fingerprint field differ — every receipt kind's rate_cents, style id and version, depictionPolicyVersion, plannedImageCalls, the contract version, and whether standalone pictures exist; it reports the engine version and the picture rule as 'not recorded' on every comparison; and it prints the declared change under test with the verdict`.
13. `benchmark-no-engine, benchmark-no-io and benchmark-npm-only-zod hold on the real dependency graph, and drift --prove builds a deliberate violation of each — an import of domain, of providers, of an app, of each enumerated I/O builtin, and of an npm package other than zod — each seen red, every legal import still resolving, and the proof's count now 25`.
14. `every column the scorecard names exists in packages/domain/src/schema.ts and in db/migrations/` — the fixtures are committed JSON and the package may not import the domain, so without this a column rename leaves every other check green while the reader breaks.
15. `every other check of this feature passes in a child process whose environment holds only PATH and what the operating system needs to start Node, in S-028's form` — the reader imports a module that transitively reaches providers, and a key read that returns nothing leaves a successful run looking identical.

Checks 1–4 and 7–14 need no database at all; none of them starts the engine or needs a key.

### The least confident decisions

- **The rating weights and the two tolerances** (0.25 s on a take's delivered seconds, 0.5 s on the cut's duration).
  Judgements, written in S-182, version-stamped, and pinned to four exact values by check 7.
- **Six runs a side as the floor for a verdict.** It is S-149's six-run arm reused, and at about 55¢ a reel it is
  about $3.30 a side — affordable, and still weak. The band is printed so the weakness is never hidden.
- **Whether the fingerprint is enough to call two sides comparable.** It catches a rate change, a policy change, a
  question-set change and a picture-rule change; it cannot see a prompt rewrite. `run-provenance` is the answer, and
  until it exists every verdict says so.
- **Whether the gap between consecutive receipts is worth reporting**, given it is queue time plus gate time and not
  a provider's latency. Kept, named as a gap, because it is the only timing the record allows below a stage.

## Gate 4 — Slices

- [ ] **Slice 1 — the package, its boundary, and the count.** `packages/benchmark` with its index, measures and
      reasons; its `package.json` and `tsconfig.json`; the root reference and workspace dependency; the row fixtures;
      the three rules in `.dependency-cruiser.cjs` with their `--prove` cases; and the five amendments taking 22 to
      25 (`reel-stills` check 3, `reel-render` check 2, `paid-path` check 4, `CLAUDE.md`, `AGENTS.md`) with the three
      features' amendment blocks. Checks 1, 2, 3, 4, 13, 14. **Full suite** — boundary and workspace configuration
      are both integrity boundaries. **Proves: 1, 2, 3, 4, 13, 14.**
- [ ] **Slice 2 — the ratings.** `ratings.ts`: the terms, the weights, the tolerances, the stamp, absent parts, the
      shorter-`until` label, the four worked values. Checks 7, 8, 9. **Targeted.** **Proves: 7, 8, 9.**
- [ ] **Slice 3 — the comparison.** `compare.ts`: sides, grouping, rates, per-field deltas, both bands, the
      minimums, ties, dropped groups, the guard, the fingerprint refusals, the verdict. Checks 10, 11, 12.
      **Targeted.** **Proves: 10, 11, 12.**
- [ ] **Slice 4 — the reader, the ledger and the freeze.** `scripts/benchmark.mjs`, the scorecard, the drill-down,
      the two hashes, the full record under `--out`, `--rescore` writing the ledger over the real record read-only;
      `docs/research/refusals.md` and `docs/research/yield-baseline.md` frozen with their date and commit, and
      `PictureAnswer` corrected to `ImageAnswer` there. Checks 5, 6, 15. **Full suite** — `scripts/` is full-only.
      **Proves: 5, 6, 15.**
- [ ] **Slice 5 — the journeys.** `node scripts/journey.mjs yield-benchmark`, then `reel-stills`, `reel-render` and
      `paid-path` again, serially, for the rule count (S-099's form, S-178's order). **Proves: none** — it is the
      feature's proof.

Every check appears in exactly one slice: 6 + 3 + 3 + 3 + 0 = 15.

## Outcome

1. **Every run the engine has ever made is scored, part by part** — counts, timings, costs, retries, every check's
   verdict, a rating a part and a rating a run — for nothing, and the 52 already in the record are in the ledger the
   day it is built.
2. **Any part of any run can be read as deep as it goes**, and what the record cannot hold is named as not recorded
   rather than passed off as zero.
3. **Two sides of runs get a verdict under a rule fixed before any number was read** — with the band it cannot
   resolve printed, the groups it rested on named, and the engine version reported as not recorded until
   `run-provenance` records it.

## Evidence (newest first; appended by the journey, never typed by hand)

## Divergence (the first broken boundary, or "none")

none

## Deferred

1. **The paid pass — its own feature, with its own four gates** (the owner's, 2026-10-12: _"we can keep the money
   eval for later once this benchmark is made"_). It carries: the frozen brief set, taken verbatim from stored
   request bodies and hashed in a manifest, spanning the families the record holds — many things in one frame
   (`4ce40e14`, 8 runs, 3 judged, 100% refused), clipping (`396a6ae3`, 13 judged, 62%), lettering and screens
   (`f984199a`, 12 judged, 83%), a plural subject's count (`f7804542`, 4 judged, 50%), a crowded many-thing subject
   (`872e59f1`, 3 judged, 100%) and one already-clean control (`6763176f`, 4 judged, 0%); the per-reel ceiling
   (150¢ — every plan at today's rates estimates 40¢ to 51¢ and the dearest run cost 75¢, so Gate 0 can never
   refuse a benchmark reel and no reel can die on its limit); the pass ceiling as a constant a dial may only lower;
   one typed confirmation for a pass; its own database file and artifact root under already-ignored paths; serial
   submission and continuation by pass id through the service's own `waitingRuns` and `cancelRuns` (S-163); the
   engine's resume delay set beyond the pass's life; and a containment check in `paid-path` check 20's shape.
   Sizing, at $17.98 left of the $40 total: six reels a side about 330¢, eighteen about 990¢, and the dense version
   needs the total in `BUDGET.md` raised, in the repository that owns it.
2. **`run-provenance` — every run records what made it**, named at the owner's request (_"it should be named, we
   should have this so each run is specifiable"_) and now `docs/features/run-provenance.md`. It is what turns this
   feature's fingerprint into a binding, and it is an engine change with a migration, so it is its own feature with
   its own gates.
3. **Re-judging stored artifacts instead of regenerating them.** All 132 pictures are still on disk with 128
   observations and 127 reconciliations, so a change downstream of a model's answer — the reconciler's plural-count
   defect, a gate's combining logic — can be rescored for nothing, and a change to what a judge is asked for the
   price of model calls (S-129). It catches nothing about a picture prompt, since a different prompt makes a
   different picture.
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

Read against the gates, the schema, the gate sources and `check.mjs`. **Twenty findings, all four gates refused**,
every one applied. The four that changed the design rather than its wording:

1. **Gate 5 was said to write five reconcile templates.** It writes four and deliberately no clipping one (S-072),
   so the check would have been red the day it was written and green only by subtraction. **Fixed:** four, named,
   and the check asserts the clipping template's absence among the strings `takeFailures` pushes.
2. **Gate 2 was said to write a silence reason.** It writes five, none about silence; Gate 3 writes the two sound
   reasons. **Fixed:** the classifier is scoped to Gate 1 and Gate 5 reconcile; every other site is counted
   verbatim and enumerated.
3. **The comparability rule rested on a commit no row records.** **Fixed:** the git-diff rule is gone; comparability
   is the recorded fingerprint, the engine version reads "not recorded", and `run-provenance` is named as what would
   bind it.
4. **The run rating inverted the ranking** — renormalising over the parts reached made two runs that died on their
   first picture score 100 and outrank every finished reel. **Fixed:** an absent part scores 0 against its weight,
   no part reached means no rating, and check 8 holds the ranking.

The other sixteen, each applied: uncomputable or silently-zero fields (per-call latency, image-port transients,
model cost, the per-reel cap, the brief key, estimate against actual, stage seconds with no `stage.finished`);
S-158's two Gate 7 question sets in one flat ledger; check 5 forbidding the process the comparison needed and
overclaiming "imports no provider"; every slice being full-suite because `scripts/` is full-only; the full record
having no declared path, setting or gitignore while every stored path is absolute; "byte-identical" being
unachievable as stated; S-182 not existing and the rating arithmetic being undefined; "accepted pictures per image
call used" rewarding the measured defect; "shots backed by a picture" conflating a setting with a failure; the
deciding condition being undecidable for runs sharing no brief; the 13-shapes-versus-7-templates confusion and
`other` having to be empty against other gates' legal strings; the stand-in-runs-versus-fixed-rows contradiction;
two checks proving one property; the outcome overclaiming; the ledger becoming a third live copy of the refusal
counts; and three misattributions — `refused.mjs` prints model text unconditionally, its database order includes
`CUTROOM_DB_PATH`, and `paid-path`'s check 20 already binds this script's text.

## Gate review 2 — 2026-10-12, adversarial reviewer, fresh, session 83

Verified round 1's four design-changing fixes against source and **confirmed all four hold** — including proving
arithmetically that a run which died on its first picture can no longer outrank a completed reel. **Twenty further
findings, all four gates refused**, every one applied:

1. **The 23rd rule turned three verified features' checks red** — `reel-stills` check 3, `reel-render` check 2 and
   `paid-path` check 4 each assert `22 rules proven to fire`, and `CLAUDE.md` and `AGENTS.md` say twenty-two — with
   no amendment list written. **Fixed:** an S-099-form section, all five amendments in Slice 1, and the count stated
   at 25 now that the rule is three rules.
2. **S-182 did not exist** while every weight and tolerance cited it. **Fixed:** written this session.
3. **Check 7's "stated exact values" were stated nowhere.** **Fixed:** four fixtures rated term by term in Gate 2 —
   0.0, 10.0, 21.5, 91.9.
4. **The purity rule forbade the `node:crypto` the brief key needs, and was not expressible as one rule.**
   **Fixed:** hashing moved to the reader; three enumerated rules mirroring `pipeline`'s own.
5. **The brief key erased `until` and `budgetCents`.** **Fixed:** both carried outside the key, `until` a
   comparability condition, and a run rated over a shorter `until` labelled and never pooled.
6. **The band was undefined for the measures that are averages.** **Fixed:** two formulas, named per measure, with
   the two-runs-a-side floor.
7. **The credit guard blocked the honest fix**, since a better prompt also lowers pictures judged. **Fixed:** the
   guard is on shots asked a picture for, accepted pictures per shot, and shots degraded.
8. **No minimum runs a group, and ties undecided.** **Fixed:** two runs a side a group, three groups, a zero delta
   counts as not moved, an undefined group is dropped.
9. **`kept_from` rows were counted twice.** **Fixed:** excluded from the inheriting run, counted in the run that
   made them, and an inherited plan stage reported as inherited.
10. **The ledger's columns and formats were unspecified.** **Fixed:** both stated, and check 6 names them.
11. **Check 2's enumeration was incomplete** and its Gate 5 half would have been red against the file's text.
    **Fixed:** the degradation, hold, still-hold and lost-call sites added; the Gate 5 assertion reads the pushed
    templates.
12. **The fixture corpus claimed two rows the record does not hold.** **Fixed:** the corpus is split into taken and
    constructed, each constructed one saying what it exercises, including the pairs the per-unit and verdict checks
    need.
13. **The ledger's default was called gitignored.** **Fixed:** one gitignored path (`--out`), one tracked
    (`--ledger`).
14. **`PictureAnswer` is not a type here.** **Fixed:** `ImageAnswer`, and `yield-baseline.md`'s line corrected in
    Slice 4.
15. **Gate 3's file list was missing five paths.** **Fixed:** the package manifest and tsconfig, the root
    dependency and lock, the node invocation, and the two research documents to freeze.
16. **Check 5's own file could not contain the string it checks for.** **Fixed:** it builds the string.
17. **No PATH-only secrets check.** **Fixed:** check 15, in S-028's form.
18. **The cut rating was on two scales at one version, and nothing bound the fixtures to the real schema.**
    **Fixed:** the Gate 7 question-set hash joins the rating stamp, and check 14 reads the schema and the
    migrations.
19. **"A comparison" was never defined, and two of its rules contradicted.** **Fixed:** a side is a label and a
    list of runs; parts are intersected; refusal is for the stamp and the fingerprint.
20. **Smaller corrections.** D-047 on the `Decisions:` line, `lease_until`, `worldId` from the request, Gate 1S's
    reasons as shared-subject names, and absent-in-the-record against zero-in-the-rating said once, in one place.
