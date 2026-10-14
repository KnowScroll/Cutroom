---
status: current
authority: plan
---

# yield-benchmark — every run the engine has made, scored part by part out of what it already wrote

Status: planned
Decisions: D-001, D-014, D-022, D-025, D-027, D-028, D-031, D-042, D-044, D-046, D-047, D-050, D-055, D-059, D-065, D-073, D-083, D-086, D-094, D-100, D-111, D-113, S-016, S-020, S-028, S-035, S-040, S-043, S-046, S-066, S-070, S-071, S-072, S-073, S-074, S-090, S-096, S-097, S-098, S-099, S-103, S-109, S-111, S-124, S-126, S-129, S-141, S-150, S-153, S-155, S-156, S-158, S-159, S-161, S-162, S-163, S-164, S-172, S-176, S-177, S-178, S-182, S-184, S-185
Named only as what it cannot see, or as what waits: S-115, S-149, S-154
Gates: product APPROVED 2026-10-14 owner-decision-S-185 · architecture APPROVED 2026-10-14 owner-decision-S-185 · program-design APPROVED 2026-10-14 owner-decision-S-185 · slices APPROVED 2026-10-14 owner-decision-S-185

> **Created 2026-10-12 at the owner's request**, in session 83, out of `PROMPTS/077-benchmark-design.md`. Session 82
> measured the engine's first 52 runs (`docs/research/yield-baseline.md`): 8 of 52 produced a reel, and the picture
> check refused 53% of all pictures. The first fix is scoped (`docs/features/picture-prompt.md`) and cannot be
> judged, because the baseline it would be judged against was never a controlled measurement.
>
> **The owner settled this feature's shape in the session itself.** On what a run is: _"whole reel, each part
> should have their own benchmarks, ratings, numbers, timings, everything"_ and _"one number, internal numbers,
> everything will be needed so we have full control and observability on each and every aspect of the system"_,
> plus _"it should be so that the benchmark can be run on individual things as well"_. On the money: _"we can keep
> the money eval for later once this benchmark is made"_ — so buying a batch of reels on frozen briefs is
> Deferred 1. And the owner asked that runs become identifiable — _"it should be named, we should have this so each
> run is specifiable"_ — which is `docs/features/run-provenance.md`, named and not built here.
>
> **Then the owner split the benchmark in three** (S-184, superseding S-182's scope and nothing else):
> _"Yes the comparison is its own feature that is right, and also the visualization also its own feature."_ **This
> file is the scoring half alone.** It computes no uncertainty band and reaches no verdict.
> `docs/features/yield-compare.md` owns the comparison; `docs/features/benchmark-view.md` owns the page, after this
> is built.
>
> **Revised three times before approval**, against three adversarial rounds and sixty findings, all recorded at the
> end of this file.
>
> **It changes no engine behaviour at all**, and it never weakens a gate, loosens a check, raises a cap or edits a
> brief to make a number look better (CLAUDE.md rule 3).

## Gate 1 — Product (no technical language)

**The problem.** 52 real runs have been made and 8 produced a reel. Everything about them was written down as it
happened — every check's words, every cost, every retry, every measurement of every file — and **none of it can be
read without writing a fresh query**, so nobody can ask what a run cost at each stage, how many retries it burned,
which check refused what, or where it died.

**The job: scoring — what happened.** Every run gets a scorecard: five parts — the plan, the pictures, the
narration, the clips, the finished cut — each with its own counts, timings, costs, retries, what each check said,
and **a rating out of 100**; and one rating for the whole run. Beside the rating, always, whether a watchable reel
came out, which no single number is allowed to hide. **Ask for one part of one run and it goes as deep as it
goes** — that is the owner's _"run on individual things"_, and it is a named flag with its own check, not a side
effect.

**It costs nothing and it works on everything already made** — all 52 runs today, including the 44 that failed or
stopped, because where a run died is the measurement. New runs come the way they come now: a reel made by hand,
with the owner's confirmation, by the one script that spends. **This feature adds no way to spend money.**

**What this feature deliberately does not do.** It never puts two sets of runs beside each other and says a change
helped. That is `yield-compare`'s whole job: sides, per-unit rates, the two uncertainty bands, the four verdict
words, the eight deciding measures, the credit guard, comparability and the fingerprint, the config mode, the
stratify view, and the null comparison. **Nothing here computes a band, a delta or a verdict**, and no check here
asserts one.

**The one thing this feature owes the comparison is the brief key.** Runs are grouped by **brief** — the same
request with its identifier and options removed — and that key is computed here, printed on every scorecard and
written into the ledger, so a later comparison can group runs without re-deriving what "the same brief" means. The
key is the only piece of the comparison that lives on this side, and it is here because it is a property of one
run, not of a pair.

**What a rating is, and what it is not allowed to be.** A part's rating is built **only from what the engine's own
checks said**. **Never from a theory about what makes a good picture**, because the change we are about to make
would then raise the rating by definition. Two terms were removed by review for exactly that: how many image calls
a run spent of its six, which rewards spending less while two of the six are reserve on purpose; and how many shots
were backed by a picture, which a setting decides rather than a fix. Both are still reported as figures.

**Every rating term is something achieved over something attempted, never an absence** (S-184). This is the rule
that removes a whole class of defect rather than its instances: three adversarial rounds each found a term that
paid a run full marks for work it never tried — an absent part renormalised into a perfect score, "shots not
degraded" paying a run that died on its first image call, "no holds" paying a run that assembled nothing. An
absence is free when nothing was attempted, so no term is phrased as one. **An absent part scores zero against its
weight**, a run that reached no part has **no rating at all**, and **no rating ever decides anything** — the
ratings rank runs and nothing more.

**The risks, said before anything is read.**

- **A scorecard can be read as a judgement of quality.** It is not: the engine has no measure of how good anything
  looks, only of whether its own checks passed.
- **Some things the record does not hold** — the engine version, and whether an image call failed for a moment.
  Each reads as **not recorded**, never as zero. Making that airtight is `run-provenance`. **The picture rule is
  NOT one of them**: `Plan.pictures` carries it on the plan the run was priced and admitted under, so it is read
  rather than guessed.
- **A rating compares with another rating only when both carry the same stamp.** S-158 changed Gate 7's question
  set, so two cuts judged under different sets are not on one scale, and the rating says so rather than averaging
  across the change.

**What does not change.** Every check, cap, gate, brief and price, and what the engine does with any of them.
Nothing is written to the engine's record: it is opened to read and never to write.

## Gate 2 — Architecture

### Where each part lives

| place                             | what it gains                                                                                                                                                    | what it still may not do                                                                                                  |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `packages/benchmark`              | **the arithmetic, pure**: parse a stored verdict, classify a reason, compute every measure from arrays of rows, the five part ratings, the run rating, the stamp | any I/O, `domain`, `providers`, any app, any npm package but `zod`; compute a band, a delta or a verdict                  |
| `scripts/benchmark.mjs`           | **the reader**: open a database read-only, select rows, hash the brief key, hand plain rows to the package, print, write the full record and the ledger          | open a database for writing, reach a provider, spend, start the engine, start any process but `git rev-parse`, read a key |
| `docs/research/benchmark.md`      | the ledger: every run scored, one row each, written by the script                                                                                                | be typed by hand (S-016's rule, as `journey.mjs` has it); hold a path of any kind                                         |
| `tests/yield-benchmark-*.test.ts` | the checks below, all free, all provider-free                                                                                                                    | call a provider; contain the literal text of the script name `paid-path`'s check 20 forbids                               |
| **the engine**                    | **nothing**                                                                                                                                                      | —                                                                                                                         |

**Why a package and not one script.** `check.mjs` holds every `scripts/` path to the full suite (`FULL_ONLY`,
`/^scripts\//`), so a feature built entirely in a script makes every slice a full run. With the arithmetic in a
package, the ratings slice is an ordinary targeted slice and every pure function is checked from committed row
fixtures with no database and no engine.

**Three new boundary rules, not one.** A single blanket rule is not expressible: dependency-cruiser ANDs a `to`'s
attributes, so "any builtin" and "any npm package but `zod`" cannot share one rule, and a bare-name regex for
builtins also matches an unresolved `zod` and would report a legal import. So, mirroring `pipeline`'s own set:

| rule                     | forbids                                                                       |
| ------------------------ | ----------------------------------------------------------------------------- |
| `benchmark-no-engine`    | `to.path` `^(packages/(domain\|providers)\|apps)/` — one regex, three targets |
| `benchmark-no-io`        | the builtins enumerated below, under either spelling                          |
| `benchmark-npm-only-zod` | a `node_modules/` resolution other than `zod`                                 |

**`benchmark-no-io` enumerates its own builtins, and `node:crypto` is the point of it.** `pipeline-no-io` matches
`^(node:)?(fs|fs/promises|child_process|net|http|https|http2|dgram|tls|dns|cluster|worker_threads|sqlite|repl|readline)$`
— so it already holds `sqlite` under **both** spellings, and it does **not** hold `crypto`. Round 2 moved hashing
into the reader precisely so the package could be denied `crypto`, and round 3 found the rule as specified did not
deny it. This rule's pattern is that enumeration **plus `crypto`**:

```text
^(node:)?(fs|fs/promises|child_process|net|http|https|http2|dgram|tls|dns|cluster|worker_threads|sqlite|repl|readline|crypto)$
```

**In, and why:** everything `pipeline-no-io` names, for the same reason it names it; `crypto`, because a pure
scorer that can hash can grow a key of its own and stop being a function of its rows. **Out, and why:** `path`,
`url`, `util`, `assert`, `buffer`, `events`, `string_decoder` and `querystring` — none of them reaches the outside
world, and `pipeline` uses several of them today. `node:test` is out of every source rule's reach by living only in
`tests/`. **`drift --prove` builds a violation of each enumerated builtin, `crypto` named among them**, so a
pattern that silently loses one case fails rather than reading as coverage.

**Hashing lives in the reader, and the package is handed the hash function.** The package exports the brief key's
**input** — `request_canonical` with `requestId` and `options` removed, canonicalised — which is pure and is where
every mistake about "the same brief" can be made; the reader passes `createHash('sha256')` and the package calls
it. This is what lets the key's check sit in the package's own slice with a stub hash, while the reader's check
asserts the real SHA-256 over a temporary database. Round 3 found the earlier arrangement needed Slice 4's code to
check Slice 1's property.

**The rule count becomes 25.** Three test assertions turn red and seven documents start contradicting the
repository — all of them amended in Slice 1, see "What this feature changes in verified features".

The package is entered through `src/index.ts`, carries its own `tsconfig.json` (`tests/workspace.test.ts` requires
one), is referenced from the root `tsconfig.json`, and is a workspace dependency of the root so the script can
import it by name as `scripts/refused.mjs` imports `@cutroom/service`.

**How the reader opens the record.** `node:sqlite` with `readOnly: true`, never the domain's opener — which opens
for writing, migrates and creates a missing file — exactly as `scripts/refused.mjs` does. The database is `--db`,
else `CUTROOM_DB_PATH`, else the service's default, which is `refused.mjs`' own order (D-086). A missing path exits
non-zero and creates nothing. It imports `@cutroom/service` only for that setting name and default, which
transitively reaches `providers`, so the rule here is **it constructs no port, makes no call and reads no key** —
held by a PATH-only child in S-028's form, because a key read that returns nothing leaves a successful run looking
identical.

**Three views.** The **scorecard** on screen, figures only, for every run or for one run, or for one part of one
run. The **full record**, one JSON file per scoring run, holding every field below including the blobs — each
prompt sent, each witness observation, each reconciler answer, each take's scan and probe, the render manifest, the
ffmpeg invocations, every reason string. The **ledger**, one committed row per run. **Model text and blobs print
only when asked for**, a flag this feature adds; `refused.mjs` prints its answers unconditionally, so it is the
precedent for keeping model text readable, not for hiding it. No key, URL or query string anywhere (D-022).

**Two paths, one gitignored and one tracked.** `--out` for the full record, defaulting under `.artifacts/benchmark/`
— D-086's form, already ignored, no `.gitignore` change. `--ledger` for the ledger, **defaulting to the committed
`docs/research/benchmark.md`**, which is tracked on purpose and is not a D-086 path; the setting exists so a check
writes a fixture ledger to a temporary directory. **No artifact path ever reaches the committed ledger**: every
stored path is absolute by construction (the artifact root resolves from the module URL), the full record stores
them relative to that root, and the ledger holds no path at all — asserted by a check of this feature, because
`tests/no-absolute-paths.test.ts` skips `docs/` outright.

### The five parts against the engine's three stages

**The parts are not the stages, and three of them share one.** `RunEvent`'s stage is `plan | stills | video`
(`packages/reel-contract/src/events.ts`), and narration, clips and the cut all happen inside `video`: the clips job
makes both the narrations and the takes, and the assemble job writes no `stage.started` at all because the clips
job already wrote the one for `video` (`apps/worker/src/clips-job.ts`, `apps/worker/src/assemble-job.ts`). The record bears
it out: **118 `stage.started` = 52 `plan` + 43 `stills` + 23 `video`**, against jobs `reel.plan` 52,
`reel.keyframes` 43, `reel.clips` 23, `reel.assemble` 12.

So "a part is reached when its stage started" is undefined for three of the five parts, and that is where round
3's free credit came from. **Reached is defined per part, from the evidence that part actually leaves:**

| part      | reached when                                    | the job that does it | its seconds                                                         |
| --------- | ----------------------------------------------- | -------------------- | ------------------------------------------------------------------- |
| plan      | a `stage.started` event with stage `plan`       | `reel.plan`          | that stage's own span                                               |
| pictures  | a `stage.started` event with stage `stills`     | `reel.keyframes`     | that stage's own span                                               |
| narration | a `job` row of kind `reel.clips` for the run    | `reel.clips`         | **not recorded separately** — see below                             |
| clips     | a `job` row of kind `reel.clips` for the run    | `reel.clips`         | **not recorded separately** — see below                             |
| cut       | a `job` row of kind `reel.assemble` for the run | `reel.assemble`      | the `render` row's `started_at` to `finished_at`, the one true span |

**A `job` row is joined to its run through `job.correlation_id`** (`schema.ts:88`, set to the run id at
`runs.ts:129, 324, 535, 621`), which is the column these three reach rows by — named here because check 12 pins
every column the scorecard names against the real schema.

**Narration and the clips share one figure, and it is labelled as shared.** The `video` stage's `stage.started` to
the `render` row's `started_at` is **the clips job plus the wait before assembly** — `render.started_at` is written
by a separately queued assemble job, and `job` carries no completion instant, so this is not the clips job's own
time and is never labelled as such. The record holds
nothing that splits it, so both parts report that one figure under the name **"narration and clips together"** and
each reports **"not recorded"** for a span of its own. With no render row the end is taken by the `video` stage's
own fallback below. **A job row has no finished time** — `job` holds `run_at`, `locked_at`, `lease_until`,
`attempts`, `error` and `cost_cents` and no completion instant — which is why the render row, and not the assemble
job, gives the cut its seconds.

**`render.finished_at` is nullable, and a cut that never finished says so.** A run killed mid-assembly has a
`render` row with `started_at` set and `finished_at` null; its cut seconds are then **absent**, not zero and not
guessed from `run.finished`, because the run's end is not the render's. The cut is still reached — the
`reel.assemble` job row exists — but **all three of its rating terms are 0 while `finished_at` is null**. That is
convention 3 applied to the whole part, and it has to be stated rather than derived: `render_manifest` is
**notNull and written before the assembler is called** (`schema.ts:487-500`), and the `hold` rows are written with
the job's ending, so such a run has a FULL manifest and no holds. Reading "manifest shots with no hold" there
would pay the cut 20.0 for assembling nothing — the exact figure S-184 was written to abolish.

### What the scorecard holds, part by part

Each field names the column it is read from. **Two different rules, said once here:** a row the record does not
hold is reported **absent**; a fact the record cannot hold — the engine version, an image-port
transient — is reported **not recorded**; **the picture rule is READ, from `Plan.pictures`**
(`contracts/src/cinematic.ts:38`), which carries the rule a plan was priced and admitted under and is present
only when it is not the default, so an absent field means `recurring` and never "not recorded"; and **inside a
part that was reached, a share with an empty denominator scores 0** in the rating. Absent in the record, zero in
the rating.

**Inherited pieces are counted once, in the run that made them.** A resume copies pictures, narrations and takes
into the new run with `kept_from` set and copies no receipt, so a `kept_from` row is **excluded from every
numerator and denominator of the run that inherited it** and counted in the run that paid for it; a resumed run's
inherited plan stage, whose copied events share one instant, is reported as **inherited, not measured** rather than
as 0 seconds (S-162, S-164).

**But only three tables carry `kept_from`, and an inherited failure writes a fresh row.** `picture`, `narration`
and `take` have the column; `degradation`, `hold` and `still_hold` do not
(`packages/domain/src/schema.ts`). Worse, a resumed run **writes a new `degradation` row for a degradation it
inherited**: `carried()` in `packages/pipeline/src/stills/index.ts` reads the kept picture's own degradation
reason and hands it straight to `degrade()`, which records it again under the new run. Shots degraded feeds the
pictures rating, so the double count reaches a rating term and not only a report. **The rule, stated so it can be
checked:** an inherited degradation is one whose shot's **last failing picture carries `kept_from`**, and it is
excluded from the inheriting run exactly as that picture is. An inherited `still_hold` is one whose three
`take_ids` all name takes carrying `kept_from`; an inherited `hold` is one whose shot's clip in the render manifest
came from such a take. Each is counted in the run that paid for it, and the measures check asserts that case on a
constructed resumed run.

**The run.** Run id, request id, `worldId` from the stored request; **the brief key** — the SHA-256 of
`request_canonical` with `requestId` and `options` removed, the input composed in the package and hashed in the
reader, which is what "the same brief" means everywhere below; **`until` and the request's ceiling**, which are
never folded into the brief key, because `until` decides which parts can exist and the ceiling decides when a run
stops; which run it resumes and which resumed it; the ending (`completed`, `stopped`, `failed`, `refused`,
`cancelled`) with its rule, step and detail, and its failure class (S-163); **whether a watchable file came out**,
its duration and frames; cost by kind — image, video and speech from their receipts, and **model calls are not
billed per call (S-129), so `model_receipt` has no cost column and tokens are reported instead**; cents paid for
calls that produced nothing; the run's own ceiling from its stored request, which is what spend is compared
against; **the per-reel cap, which is recorded only in a budget-limited result and absent otherwise** — a run the
cap stopped stores a budget answer in `run.result` carrying `capCents` beside `estimateCents` and `ceilingCents`
(`packages/reel-contract/src/responses.ts`, run `a08a9c9c` at 231¢), while every other run has no cap on any row,
because the cap is parsed from `BUDGET.md` at run time; the selected plan's estimate beside the actual; total wall
clock; per job — `run_at` to `locked_at`, attempts, `lease_until`, error; lost calls by port; answers that could
not be read, by role, call and ask; **transient faults for the speech and video ports only, because only their
receipts carry the column — the image and model ports read "not recorded", and the image port cannot report a
transient at all**, since `ImageAnswer` in `packages/contracts/src/picture.ts` has only `made` and `refused` (six
runs died of it).

**What the estimate excludes, stated in full, because the label is pinned by a check.** A selected plan's estimate
covers the plan's intended calls at their rates and nothing else. It excludes **the reserve image slots** (S-035),
**narration** (S-070), **every retake** — a shot's second and third takes, and every repair picture — and **every
lost call**, whose cents are paid and produce nothing. Retakes and lost calls are the larger part of the gap:
selected-plan estimates run 40–51¢ at today's rates while real runs cost 53–75¢, and a conforming run therefore
reads as an under-estimate **by design**.

**Seconds per stage, and the convention it needs.** A stage's seconds run from its `stage.started` to its
`stage.finished`; S-046 deliberately writes no `stage.finished` for a stopped stills stage, which is why the record
holds 118 starts against 74 finishes. When the finish is absent the end is taken from the next stage's start, else
from `run.finished`, and **the row says which of the three rules it used**. There is no per-call duration anywhere:
every receipt carries one `at`, so **what can be computed is the gap between consecutive receipts of a run —
reported as a gap, never as a latency, the first call's gap absent**. The one true duration is the render's
`started_at` to `finished_at`.

**Part 1 — the plan.** Both fork plans with unit count, axis, planned image calls, estimate, Gate 0's verdict and
the scorer's total; which was selected; whether a repair plan was needed; the chosen plan's shots, seconds per
shot, total seconds, subjects, **subjects per shot and the maximum**, and which criteria each unit carries; every
model call's role, model, temperature and tokens; admission's figure against the ceiling.

**Part 2 — the pictures.** Pictures planned, attempted and chosen; per picture its role (canonical, derived,
standalone), shot, subject, label, framing, reference pictures, the exact prompt sent, its attempt number; **Gate 1
step by step** — technical, text, witness, reconcile — with each outcome, coverage and every reason string,
classified; Gate 1S's coverage, suspicion, answer and its reasons, which are shared-subject names reported
verbatim; the keyframe score's terms, weights and total; the technical measure; the words the text step read; the
witness's own detail — how many things it listed, how many it called clipped, which named subject each clip fell
on; the reconciler's answer and what code made of it; retries per shot and repair pictures; shots degraded with
gate (`1` or `1S`) and reason, each marked inherited or not; **image calls used of six** as a reported figure;
calls lost; cost per picture from each receipt's own `rate_cents` and `cost_cents`, so a rate change is visible
rather than assumed.

**Part 3 — the narration.** Per shot the text spoken, its characters, its probed duration, whether word timings
parsed; each speech receipt's model, characters, rate, cost and transient faults; refused timing answers.

**Part 4 — the clips.** Takes per shot with number and mode (**image-to-video against text-to-video, and the
share**), which picture a take was held to, its seed, the seconds asked for, the prompt, the provider's expanded
prompt and the expansion mode; the probe — readable, duration delivered against asked, codec, size, fps, frames,
audio, `moovFirst`; the scan — black stretches, frozen stretches, silent stretches and loudness in LUFS, of which
**only black and frozen can fail Gate 2, while silence and loudness are recorded and fail nothing** (S-072);
whether its sound is speech or music, which is what Gate 3 judges; **Gates 2, 3, 4 and 5** per take with outcome,
reasons and coverage strategy, including Gate 4's recorded limitation; ladder depth per shot; **still holds** —
shots held on their picture at the take cap, from the `still_hold` table, with the picture, its probe, the three
takes it consumed and the reason (S-098); degradations; clips re-bought after a transient fault; cost per clip with
its own rate and resolution.

**Part 5 — the cut.** The render manifest and its hash; the output profile; how many ffmpeg invocations ran; the
output measured — readable, duration, frames, audio — against the plan's total seconds; **Gate 7's coverage, every
question with its yes or no, the questions answered no, and how many questions were asked**; **holds**, from the
`hold` table, with the shot, the seconds and the reason; assembly seconds; cost.

**A `hold` and a `still_hold` are two different things, and the scorecard keeps them apart.** `still_hold` is a
shot held on its chosen picture at its take cap (D-025 rung 2, S-090, S-098) and belongs to the clips part; `hold`
is **a clip shorter than its narration** (S-073) and belongs to the cut. The schema says so in as many words, and
one rating term reads each.

**Gate 7's question set is recorded per run and carried in the rating stamp.** S-158 removed Gate 7's fifth
question and the plan score's fourth term, and **two of the four historical Gate 7 refusals are that removed
question**, so the share of cuts refused is not one scale across the record and nothing in the engine marks the
change. Each run's question count and a hash of its question list are taken from `render.gate7`'s own answers, the
cut rating and the run rating carry that hash beside the rating version, and **two ratings compare only when both
match**.

**The count of subjects in a shot is taken from the plan, never from the picture's prompt.** `picture-prompt` is
about to rewrite that prompt, and a measure parsed out of its wording would break on the change it exists to judge.
The two agree exactly on the stored corpus: **132 of 132 pictures, zero disagreements**.

### The reason families, scoped to the gates whose strings they are

**Only Gate 1's and Gate 5's reconcile reasons are classified.** Everything else is counted and reported
**verbatim, unclassified**. A classifier that claimed them all would put a legal string into `other` the first day
it appeared.

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

**Every other reason-writing site, enumerated, because an incomplete list is what lets a double count hide.**
Round 2 named four and round 3 found five more; all of them are counted verbatim and none is classified:

| site                               | what it writes                                                                                                                                                                                                                                                                                                                                                    |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `gates/gate0.ts`                   | four tokens: `coverage`, `criteria`, `shape`, `cost`                                                                                                                                                                                                                                                                                                              |
| `gates/gate1s.ts`                  | shared-subject names, **and an `Unanswered` message** when the judge's one ask is unusable (S-163)                                                                                                                                                                                                                                                                |
| `gates/gate2.ts`                   | five technical reasons; **no silence reason** — Gate 3 writes the two sound ones                                                                                                                                                                                                                                                                                  |
| `gates/gate3.ts`                   | two sound reasons                                                                                                                                                                                                                                                                                                                                                 |
| `gates/gate7.ts`                   | the question strings, **and an `Unanswered` message** on the same rule                                                                                                                                                                                                                                                                                            |
| `stills/index.ts`                  | the degradation reasons, composed per shot                                                                                                                                                                                                                                                                                                                        |
| `clips/ladder.ts`                  | the hold reason, **and the "`<shot>` cannot be held" `why`** built from one or two clauses                                                                                                                                                                                                                                                                        |
| `clips/index.ts`                   | **every `detail:` it writes**: a shot's three failed takes (which embeds those takes' gate reasons verbatim), the word-timing detail, the unreadable held picture, "no take shows what the reel must show", and the catch-all `messageOf(error)` at `:195` with the `unavailable` message it wraps — the most common of all, carrying 14 of the record's failures |
| `stills/index.ts`, `plan/index.ts` | their run-ending `detail:` sites — `stills/index.ts:154, 408, 490, 498, 521` and `plan/index.ts:158`                                                                                                                                                                                                                                                              |
| `lost_call.detail`                 | whatever the port reported                                                                                                                                                                                                                                                                                                                                        |

**A run-ending `detail` is never classified, and never counted as a reason.** The three-takes-failed detail
composed in `clips/index.ts` embeds the failing takes' own Gate 2, 3 and 5 strings inside one sentence; classifying
it would count every one of them a second time, and an unknown-string finding would fire on every such run. A
detail is reported verbatim, as the ending's own text, and the reason counters never see it.

The two technical shapes are counted although they have never fired: a run whose pictures come back the wrong shape
is a finding about the provider, not a cleaner rate (P-010's failure). **`other` is asserted empty over the
committed fixture corpus only.** In live scoring an unknown string is **reported as a finding and fails nothing** —
a gate may legally gain a reason tomorrow, and a scorer that refused to run would be worse than one that says what
it has not seen before. A check reads the gate sources so a reworded template turns a check red instead of emptying
a family (S-124's rule, applied to strings).

### The ratings, with their arithmetic

Each term is a **share in 0 to 1** or a **yes/no read as 1 or 0**; a part's rating is `100 × Σ(term × weight)`; the
run rating is `Σ(part rating × part weight)`. **Weights and tolerances live in S-182**, unchanged by S-184, and are
carried as **rating version `r1`** beside the Gate 7 question-set hash.

| part      | terms and weights inside the part                                                                                                                                                                                                | run weight |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------: |
| plan      | Gate 0 admitted the selected plan 0.5 · the selected plan was admitted at its first round 0.2 · share of the plan stage's model asks answered readably at the first ask 0.3                                                      |        0.1 |
| pictures  | share of the pictures Gate 1 decided that it accepted 0.7 · share of the shots a picture was attempted for that ended with an accepted picture 0.3                                                                               |        0.3 |
| narration | share of the selected plan's units the run spoke 0.5 · share of the narrations made whose word timings parsed at the first ask 0.5                                                                                               |        0.1 |
| clips     | share of the takes judged that every take gate accepted 0.5 · share of the shots a take was made for that ended with an accepted take 0.3 · share of the takes probed that were delivered within 0.25 s of the seconds asked 0.2 |        0.3 |
| cut       | share of Gate 7's questions answered yes 0.6 · share of the cut's shots whose clip carried its narration without a hold 0.2 · the delivered file's measured duration is within 0.5 s of the selected plan's total seconds 0.2    |        0.2 |

Each part's weights sum to 1.0, and the five run weights sum to 1.0.

**Three conventions, and every term obeys all three.**

1. **Achieved over attempted, never an absence** (S-184). No numerator is "rows that do not exist". Each
   denominator is work the run actually attempted and the record can show: pictures judged, shots a picture was
   attempted for (a shot with at least one `picture` row), takes judged, shots a take was made for, takes probed,
   Gate 7's questions asked, the selected plan's units, the narrations made, the render manifest's shots, the plan
   stage's model asks.
2. **A share with an empty denominator, inside a part that was reached, is 0** — never 1, never dropped, never
   renormalised away.
3. **A yes/no term whose subject never existed inside a reached part is 0, not 1.** "Gate 0 admitted the selected
   plan" is 0 when no plan was selected; "the delivered file's duration is within 0.5 s" is 0 when no readable file
   exists.

**Which column each term reads, and every one of them is read POSITIVELY.** Round 4 found that three terms were
phrased as achievements while their stated column was still an absence, which puts S-184's defect straight back:
a shot that **stopped** the run writes no `degradation` row (`stills/index.ts:514-521` returns `stopped-rule`
without calling `degrade()`), a shot whose three takes failed writes no `still_hold` (`clips/index.ts:260-270`
ends the run instead), and `render_manifest` is **notNull and written before the assembler is called**
(`schema.ts:487-500`), so counting "manifest shots with no `hold` row" pays a run that assembled nothing. **No
term may be computed from the absence of a row.** Each reads the column that says the thing happened:

| term        | numerator, read positively                                                    | denominator                                       |
| ----------- | ----------------------------------------------------------------------------- | ------------------------------------------------- |
| pictures 1  | `picture` rows whose `gate1` outcome is `accept`                              | `picture` rows with a decided `gate1` outcome     |
| pictures 2  | shots with at least one such accepted `picture` row                           | shots with at least one `picture` row             |
| clips 1     | `take` rows whose **`take.outcome` is `'accept'`**                            | `take` rows whose `outcome` is not null           |
| clips 2     | shots with at least one `take.outcome = 'accept'`                             | shots with at least one `take` row                |
| clips 3     | takes whose probed duration is within 0.25 s of the seconds asked             | takes with a readable probe                       |
| cut 1       | `render.gate7`'s answers that are yes                                         | that answer list's length                         |
| cut 2       | manifest shots carried by a clip that ran long enough for its narration       | the render manifest's shots                       |
| cut 3       | `render.measure`'s duration within 0.5 s of the selected plan's total         | yes/no                                            |
| narration 1 | the selected plan's units with a `narration` row **this run wrote**           | the units this run was to speak (see inheritance) |
| narration 2 | those with no `refused_answer` at `ask = 1`                                   | the narrations this run made                      |
| plan 1, 2   | `plan.verdict` for Gate 0; a `plan` row with `role = 'repair'` for the second | yes/no                                            |
| plan 3      | the plan stage's asks that returned a readable answer at their first ask      | the plan stage's asks (below)                     |

**`take.outcome` is the column clips needs** (`packages/domain/src/schema.ts:412`, `'accept' | 'fail'`, null until
Gate 2 fails or Gate 5 completes), not `take.verdicts` and never `still_hold`'s absence.

**The cut scores nothing until its render finished.** `render.finished_at` is nullable and the `hold` rows are
written with the assemble job's ending, so a run killed mid-assembly has a full manifest, no holds and no Gate 7.
**All three cut terms are 0 unless `render.finished_at` is set** — convention 3, applied to the part: the subject
of every cut term is a delivered cut, and there is none.

**"At the first ask" is one column, and it is `refused_answer.ask`.** That table holds `port` (`model` or
`speech`), `role`, `call`, `about`, and **`ask`, which is 1 for a first ask and 2 for the ask after a refusal**.

**What "the plan stage's asks" is, given no row says which stage a model call belongs to.** `model_receipt` has
**no stage column** (`schema.ts:126-144`), the plan stage's roles are `planner` and `reconciler`
(`plan/index.ts:167, 189, 214`), and `(reconciler, structured)` is also written by Gate 1 for every picture
(`gate1.ts:154`) and Gate 5 for every take (`gate5.ts:70`) — so a stills-stage reconcile refusal would otherwise
zero the plan's term. Worse, **a refused answer leaves no `model_receipt` at all**: the receipt is recorded only
after a call returns (`recording-port.ts:46-66`), so counting receipts counts answered asks and an ask that never
answered would vanish instead of failing the term. So:

- **an ask** is a row of `model_receipt` **or** of `refused_answer` with `port = 'model'`, whose `role` is
  `planner`, **plus** `reconciler` rows whose `picture_ids` and `take_ids` are both empty — which is the only
  thing in the record that tells a plan-stage reconcile from Gate 1's and Gate 5's;
- the **denominator counts asks, not distinct `(role, call)` pairs**, so a second ask after a refusal is its own
  attempt;
- the **numerator** is the asks with no `refused_answer` row at `ask = 1`;
- a run that asked nothing has an empty denominator and scores 0.
- **the narration's second term** — denominator: the narrations made; numerator: those with no `refused_answer`
  row carrying `port = 'speech'`, `ask = 1` and that narration in `about`.

**An absent part scores 0 against its weight**; a run that reached no part has **no run rating**.

**A run that asked for fewer parts, and a resumed run, are PARTIAL — rated, labelled, and never ranked against a
whole reel.** S-182 rejected renormalising absent parts, so nothing is rescaled: a perfect `plan-only` run rates
`0.1 × 100 = 10.0` and not 100, and the label `plan-only` or `stills-only` is what stops that 10.0 being read as
a bad reel. The same mechanism carries a **resumed run**, which cannot be rated like a fresh one: a resume copies
the `plan` rows with `{ ...p, runId }` (`domain/src/resume.ts:240-252`) into a table that has **no `kept_from`
column**, and makes no model call, so the plan's third term would be 0/0 and every resumed run would rate 70.0
for inheriting a plan it did not pay for. **An inherited part is reported `inherited` and left out of the run
rating**, exactly as an inherited plan stage's seconds already read "inherited, not measured", and the run rating
is stamped `partial` with the parts it covers.

**Inheritance reaches a denominator that is not a row set.** Narration's first term counts the selected plan's
units, not rows, so the `kept_from` exclusion cannot apply to it directly: the clips job does not speak a
narration it inherited (`clips/index.ts:275-288`), so the denominator is **the units this run was to speak** —
the plan's units less those whose narration came in with `kept_from` — and not the plan's units outright.

**Precision.** Every term and every part rating is computed at full precision; **only the printed figure is
rounded, to one decimal**, and the run rating is computed from unrounded part ratings.

**Five worked values, so the arithmetic is independent of the code.** **All five fixtures are constructed by
hand**, each modelled on an ending the record holds and each stating every term's inputs here. They are
constructed and not taken, because a pinned value must be computed from stated inputs: a fixture lifted from the
record pins numbers nobody restated, and a later correction to how a row is read would move the expected value and
the computed one together, silently. The fixtures **taken** from the record stay in the corpus for the measures and
reason checks, where they are read for shape and not for a pinned rating.

- **`dead-in-plan`** — the plan stage started; one planner ask, its answer unreadable at that ask, no second ask,
  no plan selected; no other part reached.
  - plan: Gate 0 admitted **0** (no selected plan, convention 3) · first round **0** (same) · asks answered at the
    first ask **0 / 1 = 0** ⇒ plan `100 × (0.5×0 + 0.2×0 + 0.3×0)` = **0.0**
  - pictures, narration, clips, cut absent ⇒ 0 against each weight
  - **run rating 0.0**
- **`dead-on-first-picture`** — plan selected, admitted at its first round, 4 model asks all answered at the first
  ask; the stills stage started and the first image call threw, so **no `picture` row exists at all**; no other
  part reached.
  - plan: `100 × (0.5×1 + 0.2×1 + 0.3×(4/4))` = **100.0**
  - pictures reached: judged **0 / 0 empty ⇒ 0**; shots a picture was attempted for **0 / 0 empty ⇒ 0** ⇒
    pictures **0.0**
  - narration, clips, cut absent
  - **run rating 10.0** — and under the phrasing round 3 struck down this run scored pictures 30.0 and a run rating
    of 19.0, because "shots not degraded" had the plan's four shots as its denominator and no degradation row to
    subtract.
- **`stopped-at-gate-1`** — plan as above ⇒ 100.0. **The D-047 stop is the CANONICAL picture's, and it fires
  before any derived picture is attempted** (`stills/index.ts:514-521`: "Three failures on one entry: the run
  stops for the rule, before any derived picture is attempted (I-10)"); a _derived_ picture that fails takes one
  repair and then degrades, and never stops a run (`:572-580`, `:649-657`). So the ending the record actually
  holds is **one shot, three pictures judged, none accepted** — which is what the three 15¢ Gate-1 runs in the
  record are (`f44e960b`, `52c63f62`, `0ac13e84`: three image calls at 5¢). The earlier version of this fixture —
  two shots accepted and a third stopping the run — is a state the engine cannot produce, and the 24.4 and the
  strict ranking it was pinned to were therefore both unreachable.
  - pictures reached: judged **0 / 3 = 0** · shots with an accepted picture **0 / 1 = 0** ⇒ pictures **0.0**
  - narration, clips, cut absent
  - **run rating 10.0**
- **`entered-video-made-nothing`** — plan 100.0; pictures 5 judged, 4 accepted, 5 shots attempted, 4 ending
  accepted ⇒ `100 × (0.7×0.8 + 0.3×0.8)` = **80.0**. A `reel.clips` job row and a `reel.assemble` job row exist;
  **no narration row, no take row, no render row**.
  - narration reached: units spoken **0 / 5 = 0** · timings parsed **0 / 0 empty ⇒ 0** ⇒ **0.0**
  - clips reached: takes judged **0 / 0 ⇒ 0** · shots with a take **0 / 0 ⇒ 0** · takes probed **0 / 0 ⇒ 0** ⇒
    **0.0**
  - cut reached, **`render.finished_at` null ⇒ all three terms 0** ⇒ **0.0**
  - **run rating 34.0** — **this is the fixture that pins S-184's rule.** Under the old phrasing the same rows
    scored clips **30.0** ("shots not held at the take cap", denominator the plan's shots, no `still_hold` row to
    subtract) and the cut **20.0** ("no holds", no `hold` row), paying `0.3 × 30 + 0.2 × 20` = **13.0 points** of
    run rating — 47.0 instead of 34.0 — for work never attempted.
- **`completed`** — plan 100.0. Pictures: 5 judged, 4 accepted; 5 shots attempted, 4 ending with an accepted
  picture ⇒ **80.0**. Narration: the selected plan has 5 units, all 5 spoken; 5 narrations made, all 5 parsed at
  the first ask ⇒ **100.0**. Clips: 5 shots, 7 takes judged and 5 accepted (four shots accepted their first take,
  the fifth its third); 5 shots a take was made for, all 5 ending with an accepted take; 7 takes probed, all 7
  within 0.25 s ⇒ `100 × (0.5 × 5/7 + 0.3 + 0.2)` = **85.7** (85.714285…). Cut: `render.finished_at` set; Gate 7
  asked 4 questions and answered 4 yes; 5 manifest shots, no `hold` row; the delivered file within 0.5 s of the
  plan's total ⇒ **100.0**.
  - **run rating** `0.1×100 + 0.3×80 + 0.1×100 + 0.3×85.714285… + 0.2×100` = 89.714285… = **89.7**
- So **`dead-in-plan` 0.0 < `dead-on-first-picture` 10.0 = `stopped-at-gate-1` 10.0 <
  `entered-video-made-nothing` 34.0 < `completed` 89.7**.

**The tie between the two early deaths is correct, and the check holds `≤` where it ties.** Round 3 read a tie as
a defect and round 4 found it had been hidden behind an impossible fixture rather than fixed. It is neither: one
run made three pictures and had every one refused, the other made none, and **both achieved nothing in the part**
— which is exactly what an achieved-over-attempted rating is supposed to say. A rating that separated them would
be rewarding the attempt, which is the defect class S-184 names, pointing the other way. What distinguishes them
is **reported beside the rating and not folded into it**: pictures judged 3 against 0, image calls 3 against 1,
15¢ against 5¢. So check 9 holds `dead-in-plan < dead-on-first-picture = stopped-at-gate-1 <
entered-video-made-nothing < completed`, and asserts the two tied runs differ in their reported figures.

**No rating decides anything.** It ranks runs, it is allowed to tie, and `yield-compare` decides.

### What is already there to score

Read in session 83 from the real record: **52 runs over 25 brief groups** (largest 8 runs, then 5, 4, 4, 4), 43
selected plans, 132 pictures, 128 witness observations, 127 reconciliations, 118 takes, 95 narrations, 12 renders,
15 degradations, 3 lost calls, 10 refused answers, 691 verdict events; jobs `reel.plan` 52, `reel.keyframes` 43,
`reel.clips` 23, `reel.assemble` 12, with attempts equal to row count in every kind — **no job has ever been
retried**. So the ledger is populated the day this is built, over every run including the 44 that failed or
stopped.

**What the record can and cannot support about matched runs.** **5 of the 25 brief groups hold two or more runs
whose fingerprints match**, the largest matching set being five runs in group `4ce40e14`. `yield-compare` needs
four matching runs in each of three groups for a verdict, so **no verdict is available from the runs already
made** — which is `yield-compare`'s problem and not this feature's, and is recorded there. Nothing here asserts
anything stronger: **no row records an engine version**, so a claim that no two groups hold runs made by one engine
could not be known, and the earlier draft's version of that sentence was an overclaim about this feature's own
finding.

**Once this exists, its output is the authority on what the runs did**, and `docs/research/refusals.md` and
`docs/research/yield-baseline.md` become frozen snapshots, each naming the date and the commit it was read at —
three live documents counting the same refusals is the drift CLAUDE.md refuses for the decisions, and the two
existing files already disagree with a hand count (45 strings on 43 pictures).

### Fixtures, and what stands in for a database

**Committed row fixtures, not stand-in engine runs.** The arithmetic is pure, so each check hands the package
arrays of rows shaped as the schema stores them, with every artifact path replaced by the literal placeholder
`<artifact>`; the package never touches a file. `tests/fixtures/wire/` is the precedent.

**The placeholder rule is this feature's to enforce, not an existing check's.**
`tests/no-absolute-paths.test.ts` reads `tests/**/*.json`, but it matches four machine-path shapes only — a Windows
drive-letter path, a macOS volume path, and the two home-directory shapes — so it enforces "no machine path", which
is weaker than "every artifact path is a placeholder". A fixture holding `.artifacts/benchmark/a1/shot-0.png`
passes it. **Check 12 asserts the stronger rule** over `tests/fixtures/benchmark/*.json`: every value of a
path-shaped field is exactly the placeholder. Nothing in the existing check is weakened or skipped; a check is
added beside it.

**Taken from the record** (read read-only, paths replaced), for the measures, reason and schema checks: one run per
real ending — died in the plan stage, died on its first picture, stopped at Gate 1 three times (D-047), stopped at
a shot's take cap, stopped at Gate 7, and completed — plus a `hold`, a `still_hold`, a lost call, a refused answer,
and a stopped stills stage with no `stage.finished`.

**Constructed by hand, because the record holds no such run, and each says what it exercises:** the **five rating
fixtures** above, each with every term's inputs stated in this gate; a degradation at Gate 1S (Gate 1S has judged 8
pairs and refused none); and **a resumed run** with `kept_from` pictures, narrations and takes, no `reel.plan` job,
a fresh `degradation` row for a carried degradation, a `still_hold` over inherited takes and a `hold` over an
inherited clip — which is what the inherited-piece check needs and what no real run provides, since no run has been
resumed.

### Buying one part, for when the paid pass is built

The engine's `until` takes exactly `plan`, `stills` and `video`, so a plan can be bought alone (0¢ under S-129) and
the pictures alone (about 20¢ a run, bounded by six image calls at 5¢ or 8¢), while **there is no clips-only or
cut-only run**. What exists instead is the engine's own resume: one named picture or clip of a run already made can
be re-made (S-161), which this scorer treats as a new run that inherited kept pieces.

### How this differs from `scripts/journey.mjs`

`journey.mjs` answers _did this feature's checks pass at this commit_ — binary, run by the suite's own tooling. This
answers _how well did the engine work_ — counts, timings and ratings over runs already made. Two rules are shared
and copied rather than imported: name the commit the reading was done at, and write the result down instead of
typing it. This is never run by a check: not because it spends — it cannot — but because its output is a
measurement of history, and a check that failed on how a past run went is a check nobody could fix.
**`paid-path`'s check 20 already binds this script**: it reads every `.mjs` in `scripts/` and fails if one contains
the text of the spending script's name, so `scripts/benchmark.mjs` may not name it even in a comment — and check 5
below, which asserts that, **builds the forbidden string rather than containing it**, since that same check forbids
any other test file from holding it.

### What this feature changes in verified features (S-099's form)

Three new boundary rules take the count from 22 to **25**. Round 2 said five places assert the old number; round 3
found that was wrong, and the corrected list is **three test files, holding five assertions and two test titles,
plus seven documents holding thirteen occurrences**. **All of them are amended in Slice 1**, and no check is
weakened — each keeps its exact form with its number corrected.

**The three test files, which turn red:**

| where                                         | what changes                                                                                    |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `tests/reel-stills-rules.test.ts:77`          | `assert.match(prove.out, /22 rules proven to fire/)` → `/25 rules proven to fire/`              |
| `tests/reel-stills-rules.test.ts:72-76`       | the comment naming each rule and its ordinal gains the three, as every count change has (S-078) |
| `tests/reel-render-rules.test.ts:116`         | the same assertion                                                                              |
| `tests/reel-render-rules.test.ts:112-115`     | the same comment (S-120)                                                                        |
| `tests/paid-path-keys.test.ts:122`            | the same assertion                                                                              |
| `tests/paid-path-keys.test.ts:138`            | the cross-read of the other two files, `/22 .../` → `/25 .../`                                  |
| `tests/paid-path-keys.test.ts:139`            | `assert.doesNotMatch(source, /21 rules proven to fire/)` → `/22 rules proven to fire/`          |
| `tests/paid-path-keys.test.ts:115` and `:130` | the two test titles, which read "twenty-two", → "twenty-five"                                   |

**Line 139 is the one that would otherwise rot silently.** It guards against a file still counting twenty-one; once
every file says twenty-five it forbids a number nobody could write, and the guard is dead while reading as
coverage. Raised to twenty-two, it guards the change being made now, exactly as it guarded the last one.

**The seven documents, which turn nothing red and would leave the repository contradicting itself:**

| where                                                   | occurrences |
| ------------------------------------------------------- | ----------: |
| `CLAUDE.md` lines 56 and 69                             |           2 |
| `AGENTS.md` line 78                                     |           1 |
| `README.md` line 107                                    |           1 |
| `knowledge-transfer/README.md` line 11                  |           1 |
| `knowledge-transfer/02-repository-map.md` line 155      |           1 |
| `knowledge-transfer/11-development-workflow.md` line 76 |           1 |
| `knowledge-transfer/cutroom-kt.html`                    |           6 |

`cutroom-kt.html` also holds the rules themselves as data, listed in its Packages tab, so three entries join that
array beside the six counts; **line 7959 is NOT one of the six** — it quotes the numbered KT markdown's own wrong
sentence in the corrections tab and is left exactly as written, because it is a quotation of an error. Line 7960,
in the same entry, IS a claim about today and does change.

**Two further enumerations no count catches, each falsified by a new package rather than by the new rules.**

| where                                             | what it enumerates                                                        |
| ------------------------------------------------- | ------------------------------------------------------------------------- |
| `knowledge-transfer/02-repository-map.md:159-182` | **all 22 rules by name and ordinal** — three entries join the list        |
| `CLAUDE.md:37-45`, `README.md:93-105`             | the layout block, one line a workspace member                             |
| `knowledge-transfer/02-repository-map.md`         | its per-package sections                                                  |
| `knowledge-transfer/cutroom-kt.html:7960`         | "Nine workspace members (3 apps + 6 packages)", and its source-file count |

A tenth workspace member is what makes those wrong, and `packages/benchmark` is one. They are in Slice 1 with the
counts.

**Round 3 also named `docs/features/hosted-checks.md:337` as an eighth document. It is not one:** that file is 278
lines and holds no rule count at all (its only `22` is `Node 22.14.0`). Session 84 rewrote it after round 3 read
it. The finding is recorded here and no amendment is owed.

`paid-path`'s check 20 is unchanged in form and subject. `reel-stills`, `reel-render` and `paid-path` each get an
amendment block saying so, and their journeys re-run in the last slice (S-099's form, S-178's order). Nothing else
is touched: no contract, stand-in, shared helper, provider or setting changes.

## Gate 3 — Program design

### File locations

```text
packages/benchmark/src/index.ts              the package's only entrance
packages/benchmark/src/measures.ts           every measure, from arrays of rows; the brief key's input
packages/benchmark/src/reasons.ts            the Gate 1 / Gate 5 reconcile classifier, and the verbatim buckets
packages/benchmark/src/ratings.ts            the five part ratings, the run rating, the stamp (r1 + question-set hash)
packages/benchmark/package.json              @cutroom/benchmark, private, exports src/index.ts
packages/benchmark/tsconfig.json             required of every package (tests/workspace.test.ts)
tsconfig.json                                the new package's reference
package.json, pnpm-lock.yaml                 @cutroom/benchmark as a workspace dependency, so the script imports it by name
.dependency-cruiser.cjs                      benchmark-no-engine, benchmark-no-io, benchmark-npm-only-zod
scripts/drift.mjs                            a deliberate violation of each of the three, in --prove
scripts/benchmark.mjs                        the reader: read-only SQL, the brief key's hash, the printer, the record, the ledger
docs/research/benchmark.md                   the ledger: every run scored, ordered, no paths
docs/research/refusals.md                    frozen: the date and commit it was read at (Slice 3)
docs/research/yield-baseline.md              frozen the same way, and `PictureAnswer` corrected to `ImageAnswer` (Slice 3)
tests/yield-benchmark-measures.test.ts       checks 1–4
tests/yield-benchmark-ratings.test.ts        checks 8–10
tests/yield-benchmark-reader.test.ts         checks 5–7
tests/yield-benchmark-boundary.test.ts       check 11
tests/yield-benchmark-schema.test.ts         check 12
tests/yield-benchmark-secrets.test.ts        check 13
tests/fixtures/benchmark/*.json              the row corpus, every path the literal placeholder
```

There is no `compare.ts`: the comparison is `yield-compare`'s file, in `yield-compare`'s slice.

The reader runs as every script here does: `node --experimental-strip-types --no-warnings scripts/benchmark.mjs`.

### The reader's flags, their defaults and its exit codes

The owner's _"it should be so that the benchmark can be run on individual things as well"_ is this table, and
check 6 is its check. Every path setting defaults inside the repository and none is absolute (D-086).

| flag              | default                                                                                                                                                                                                                              | what it does                                                                                          |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| `--db <path>`     | `CUTROOM_DB_PATH`, else the service's default                                                                                                                                                                                        | the record to read, opened `readOnly` (`refused.mjs`' own order)                                      |
| `--run <id>`      | every run in the record                                                                                                                                                                                                              | score one run; the id may be any unique prefix, as the record's own documents write them              |
| `--part <name>`   | all five parts                                                                                                                                                                                                                       | `plan`, `pictures`, `narration`, `clips` or `cut`; repeatable; scores and prints only those parts     |
| `--out <path>`    | `.artifacts/benchmark/<instant>.json`, the instant in `real-reel.mjs:536`'s form — `toISOString()` with `-`, `:` and `.` stripped, since `:` is NTFS's alternate-data-stream separator and a path holding one cannot be created here | where the full record is written — always written, because a measurement nobody wrote down gets typed |
| `--ledger <path>` | `docs/research/benchmark.md`                                                                                                                                                                                                         | where the ledger is written, and **only with `--rescore`**                                            |
| `--rescore`       | off                                                                                                                                                                                                                                  | rewrite the ledger from the record; without it the tracked ledger is not touched                      |
| `--blobs`         | off                                                                                                                                                                                                                                  | print prompts, observations, reconciler answers, scans, manifests and every model's words on screen   |

**`--part` without `--run`** scores that part over every run, which is how a single part's history is read.
**`--run` without `--part`** is the whole scorecard of one run. **Both together** is the drill-down the owner
asked for.

| exit | when                                                                                                                                                                                                                                                                                                                       |
| ---: | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|    0 | every requested run scored, the full record written, and the ledger written if `--rescore` was given                                                                                                                                                                                                                       |
|    1 | the database could not be opened read-only — missing, unreadable, or not a database. **Nothing is created.**                                                                                                                                                                                                               |
|    2 | a flag's value is unusable: `--run` matches no run or more than one, `--part` names something other than the five, or **`--rescore` is given with `--run` or `--part`** — the ledger is the whole record or nothing, since a partial rescore would truncate a TRACKED file to one row or leave four part columns undefined |
|    3 | an output could not be written                                                                                                                                                                                                                                                                                             |

### The checks

1. `every field the scorecard names is computed from the column Gate 2 names for it, over the fixture corpus; a part is REACHED by the rule its row of the part-to-stage table states — plan and pictures by their stage.started, narration and clips by a reel.clips job row, the cut by a reel.assemble job row — and is ABSENT otherwise; narration and clips report one shared span, labelled clips-plus-the-wait-before-assembly, and 'not recorded' for a span of their own, while the cut's span is the render row's started_at to finished_at and is ABSENT when finished_at is null; the engine version and an image-port transient read 'not recorded' while the picture rule is READ from Plan.pictures and never reported 'not recorded'; the per-reel cap is reported only where a budget-limited result carries capCents and absent elsewhere; the estimate's label names the reserve, narration, every retake and every lost call; a stage with no stage.finished reports its seconds by the stated fallback and names which rule it used; and a kept_from row is excluded from the inheriting run's every numerator and denominator while an inherited plan stage reads 'inherited, not measured'`.
2. `an inherited failure is recognised although no failure table carries kept_from: on the constructed resumed run, the degradation whose shot's last failing picture carries kept_from is excluded from the inheriting run and counted in the run that made it, and so are a still_hold whose three take_ids all carry kept_from and a hold over an inherited clip; the same run's shots-degraded measure and its pictures rating both drop the inherited one`.
3. `gate1.ts still builds its five reconcile templates and its two technical templates while its text and witness steps write no reason; the strings takeFailures pushes in gate5.ts are exactly four and none of them is the clipping one; the verbatim buckets name every site Gate 2's table lists — gate0.ts's four tokens, gate1s.ts's shared-subject names AND its Unanswered message, gate2.ts's five, gate3.ts's two, gate7.ts's questions AND its Unanswered message, stills/index.ts's degradation reasons, ladder.ts's hold reason and its 'cannot be held' why, EVERY detail: site clips/index.ts writes including the messageOf(error) catch-all at :195, the run-ending detail: sites in stills/index.ts and plan/index.ts, and lost_call.detail; and a run-ending detail is never classified and never counted as a reason, so a three-takes-failed detail embedding its takes' gate strings adds nothing to any family`.
4. `the classifier puts each committed historical string in its stated family and leaves 'other' empty over the corpus; an unknown string is reported as a finding and fails nothing; subjects per shot is read from the selected plan and does not move when a picture's prompt wording changes; and the hash function is INJECTED into the package for both things that need one — the brief key's INPUT (request_canonical with requestId and options removed) and the rating stamp's Gate 7 question-set hash, since benchmark-no-io forbids the package node:crypto — and the key's input, computed in the package with a stub hash, puts the corpus's runs in the groups session 83 measured, and carries until and the request's ceiling outside itself` — with each string's unit: 45 clipping strings on 43 pictures.
5. `the reader opens every database read-only and leaves its bytes unchanged; refuses a missing path non-zero, creating nothing; starts no process but git rev-parse; constructs no port and reads no key; prints blobs and model text only when asked; hashes the brief key's input with SHA-256, so the key is 64 lowercase hex characters and two runs of one brief share it; and contains no occurrence of the spending script's name, which this check BUILDS rather than writes` — behavioural, against a temporary database in `tests/ask-again-reader.test.ts`' shape; the containment check.
6. `every flag in Gate 3's table behaves as it states and defaults as it states; --run with --part prints one part of one run and nothing else; --part without --run prints that part for every run; --run on a prefix matching two runs exits 2 and scores nothing; an unknown --part exits 2; --rescore with --run or with --part exits 2 and leaves the tracked ledger byte-identical; a missing --db exits 1 and creates no file; the tracked ledger is untouched without --rescore; and --out is written on every successful run` — the owner's "run on individual things".
7. `the ledger: scoring the same fixture rows twice writes byte-identical ROWS, the header's read date and commit being the only bytes that move; rows are ordered by created_at then run_id; the columns are exactly those Gate 3 lists, in that order, each in its stated format; no row holds a path of any kind; the written file is `prettier --check` clean, since docs/research/ is NOT in .prettierignore and format runs on every check; and the file carries its front matter, LF line endings and exactly one trailing newline`.
8. `each part's rating is built only from the engine's own verdicts — the rating function handed a plan whose shots name four subjects and the same plan with one returns the same rating — every term is a stated numerator over a stated attempted denominator with no term phrased as an absence, each part's weights sum to 1.0, NO term is computed from the absence of a row (the pictures and clips shot terms read an accepted picture and take.outcome = 'accept', never degradation's or still_hold's absence, and every cut term is 0 while render.finished_at is null), and the five worked fixtures rate exactly 0.0, 10.0, 10.0, 34.0 and 89.7, term by term as Gate 2 states them`.
9. `an absent part scores 0 against its weight; a run that reached no part has no run rating; a run rated over a shorter until is labelled and never pooled with a whole reel; the five fixtures rank dead-in-plan < dead-on-first-picture = stopped-at-gate-1 < entered-video-made-nothing < completed, the two early deaths TYING at 10.0 because both achieved nothing in the parts they reached while differing in their reported figures (3 pictures judged against 0), which the check also asserts; the stopped-at-gate-1 fixture is the canonical picture's three failures on ONE shot, the only shape stills/index.ts:514-521 can produce; entered-video-made-nothing scores clips 0.0 and cut 0.0 rather than the 30.0 and 20.0 the struck phrasing paid it; and two runs with identical verdicts and different endings have identical part ratings and different reported yield`.
10. `a rating carries version r1 and its run's Gate 7 question-set hash; the refusal to compare is scoped to the CUT rating, the only one S-158's change moved, so two runs whose cut question-sets differ cannot have their cut ratings compared while their run ratings still rank and still enter the ledger; and ranking is not comparing — check 9's five fixtures carry four r1/— stamps and one hashed stamp and rank regardless`.
11. `benchmark-no-engine, benchmark-no-io and benchmark-npm-only-zod hold on the real dependency graph, and drift --prove builds a deliberate violation of each — an import of domain, of providers, of an app, of EVERY builtin benchmark-no-io enumerates INCLUDING node:crypto under both spellings, and of an npm package other than zod — each seen red, every legal import still resolving, and the proof's count now 25`.
12. `every column the scorecard names exists in packages/domain/src/schema.ts and in db/migrations/, and every path-shaped value in tests/fixtures/benchmark/*.json is exactly the placeholder` — the fixtures are committed JSON and the package may not import the domain, so without the first half a column rename leaves every other check green while the reader breaks; the second half is stronger than `tests/no-absolute-paths.test.ts`, which matches four machine-path shapes only.
13. `every other check of this feature passes in a child process whose environment holds only PATH and what the operating system needs to start Node, in S-028's form` — the reader imports a module that transitively reaches providers, and a key read that returns nothing leaves a successful run looking identical.

Checks 1–4 and 8–12 need no database at all; none of them starts the engine or needs a key.

### The ledger's columns, in order, with their formats

One row per run, ordered by `created_at` then `run_id`.

|   # | column      | format                                                                                        |
| --: | ----------- | --------------------------------------------------------------------------------------------- |
|   1 | `run`       | the full run id, in backticks                                                                 |
|   2 | `brief`     | the brief key's first 8 hex characters                                                        |
|   3 | `until`     | `plan`, `stills` or `video`                                                                   |
|   4 | `ending`    | `completed`, `stopped`, `failed`, `refused` or `cancelled`                                    |
|   5 | `reel`      | `yes` or `no` — whether a watchable file came out                                             |
|   6 | `plan`      | the part rating to one decimal, or `absent`                                                   |
|   7 | `pictures`  | the same                                                                                      |
|   8 | `narration` | the same                                                                                      |
|   9 | `clips`     | the same                                                                                      |
|  10 | `cut`       | the same                                                                                      |
|  11 | `rating`    | the run rating to one decimal, or `none` when no part was reached                             |
|  12 | `stamp`     | `r1/` and the Gate 7 question-set hash's first 8 hex characters, or `r1/—` when no Gate 7 ran |
|  13 | `¢`         | integer cents, this run's own receipts                                                        |
|  14 | `s`         | total wall clock, seconds to one decimal                                                      |
|  15 | `created`   | the run's `created_at` as an ISO-8601 UTC instant to the second                               |

**The read date and the commit live in the file's header, never in a row**, with the front matter, the rating
version and the measures version. That is what makes "byte-identical on a second scoring" true of the rows: a row
holds nothing that moves between two scorings of the same record, and the header holds everything that does. **No
column holds a path**, and nothing reaches it that could.

### The least confident decisions

- **The rating weights and the two tolerances** (0.25 s on a take's delivered seconds, 0.5 s on the cut's
  duration). Judgements, written in S-182, version-stamped, and pinned to five exact values by check 8.
- **Whether narration and the clips should be one part or two**, given one job makes both and no row splits their
  seconds. Kept as two, because their rating terms read different tables and a reel can speak everything and film
  nothing; the shared span is labelled rather than divided.
- **Whether "shots a picture was attempted for" is the right denominator**, rather than the plan's shots. Chosen
  because the plan's shots would re-admit the term S-182 cut: a service setting that makes fewer pictures
  (`CUTROOM_PICTURES`, S-150, S-153) would lower the rating with nothing having got worse.
- **Whether the gap between consecutive receipts is worth reporting**, given it is queue time plus gate time and
  not a provider's latency. Kept, named as a gap, because it is the only timing the record allows below a stage.

## Gate 4 — Slices

- [ ] **Slice 1 — the package, its boundary, and the count.** `packages/benchmark` with its index, measures and
      reasons; its `package.json` and `tsconfig.json`; the root reference and workspace dependency; the row
      fixtures; the three rules in `.dependency-cruiser.cjs` with their `--prove` cases, `node:crypto` among them;
      and every amendment taking 22 to 25 — the three test files (five assertions, two titles, two ordinal
      comments) and the seven documents (thirteen occurrences, plus `cutroom-kt.html`'s rules array) — with
      `reel-stills`, `reel-render` and `paid-path` each gaining an amendment block. Checks 1, 2, 3, 4, 11, 12.
      **Full suite** — boundary and workspace configuration are both integrity boundaries.
      **Proves: 1, 2, 3, 4, 11, 12.**
- [ ] **Slice 2 — the ratings.** `ratings.ts`: the terms in their achieved-over-attempted phrasing, the weights,
      the tolerances, the three conventions, the stamp, absent parts, the shorter-`until` label, the five worked
      values and their ranking. Checks 8, 9, 10. **Targeted.** **Proves: 8, 9, 10.**
- [ ] **Slice 3 — the reader, the flags, the ledger and the freeze.** `scripts/benchmark.mjs`: the read-only open,
      the scorecard, the drill-down, the flag table and its exit codes, the brief key's SHA-256, the full record
      under `--out`, `--rescore` writing the ledger over the real record read-only; `docs/research/refusals.md` and
      `docs/research/yield-baseline.md` frozen with their date and commit, and `PictureAnswer` corrected to
      `ImageAnswer` there. Checks 5, 6, 7, 13. **Full suite** — `scripts/` is full-only. **Proves: 5, 6, 7, 13.**
- [ ] **Slice 4 — the journeys.** `node scripts/journey.mjs yield-benchmark`, then `reel-stills`, `reel-render` and
      `paid-path` again, serially, for the rule count (S-099's form, S-178's order). **Proves: none** — it is the
      feature's proof.

Every check appears in exactly one slice: 6 + 3 + 4 + 0 = 13.

## Outcome

1. **Every run the engine has ever made is scored, part by part** — counts, timings, costs, retries, every check's
   verdict, a rating a part and a rating a run — for nothing, and the 52 already in the record are in the ledger
   the day it is built.
2. **Any part of any run can be read as deep as it goes**, through a named flag with its own check, and what the
   record cannot hold is named as not recorded rather than passed off as zero.
3. **Every rating term pays only for work attempted**, so a run that died early can never outrank one that
   finished, and the brief key is computed and written down so `yield-compare` can group runs without re-deriving
   what one brief is.

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
   should have this so each run is specifiable"_) and now `docs/features/run-provenance.md`. It is what would turn
   `yield-compare`'s fingerprint into a binding, and it is an engine change with a migration, so it is its own
   feature with its own gates.
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

## Moved out of this feature by S-184

Not deferred — **the next features, with their own gates**, and nothing below is this file's to settle:

- **`docs/features/yield-compare.md`** — sides; per-unit rates; the two uncertainty bands; the four verdict words
  **helped, hurt, inside the noise, no verdict**; the eight deciding measures; the shared-brief minimums; the
  credit guard; comparability and the fingerprint; the config mode where a declared difference is the axis; the
  stratify view; and the null comparison. Six of round 3's findings went with it and are recorded there under
  "What the gates must settle": the band's wording stated a factor of two apart, the guard missing a change that
  plans fewer or shorter shots, the missing verdict word for **hurt**, the arithmetic's pooling scope, the vacuous
  comparability conditions with the missing ceiling and `planVaryOn`, and the verdict's ambiguous unit with
  malformed sides.
- **`docs/features/benchmark-view.md`** — one self-contained HTML page with its data inlined, after this is built.

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
   bind it. (Comparability is now `yield-compare`'s, S-184.)
4. **The run rating inverted the ranking** — renormalising over the parts reached made two runs that died on their
   first picture score 100 and outrank every finished reel. **Fixed:** an absent part scores 0 against its weight,
   no part reached means no rating, and the ranking check holds it.

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
   no amendment list written. **Fixed:** an S-099-form section, the amendments in Slice 1, and the count stated at
   25 now that the rule is three rules. (Round 3 then found the list of places was itself short.)
2. **S-182 did not exist** while every weight and tolerance cited it. **Fixed:** written this session.
3. **Check 7's "stated exact values" were stated nowhere.** **Fixed:** the worked fixtures rated term by term in
   Gate 2. (Round 3 found three of the four values wrong; they are recomputed above.)
4. **The purity rule forbade the `node:crypto` the brief key needs, and was not expressible as one rule.**
   **Fixed:** hashing moved to the reader; three enumerated rules mirroring `pipeline`'s own. (Round 3 found the
   rule as specified did not forbid `crypto` at all; it is enumerated above.)
5. **The brief key erased `until` and `budgetCents`.** **Fixed:** both carried outside the key, and a run rated
   over a shorter `until` labelled and never pooled.
6. **The band was undefined for the measures that are averages.** **Fixed:** two formulas, named per measure, with
   the two-runs-a-side floor. (Now `yield-compare`'s, S-184.)
7. **The credit guard blocked the honest fix**, since a better prompt also lowers pictures judged. **Fixed:** the
   guard is on shots asked a picture for, accepted pictures per shot, and shots degraded. (Now `yield-compare`'s.)
8. **No minimum runs a group, and ties undecided.** **Fixed**, and now `yield-compare`'s.
9. **`kept_from` rows were counted twice.** **Fixed:** excluded from the inheriting run, counted in the run that
   made them, and an inherited plan stage reported as inherited. (Round 3 found the rule could not reach
   degradations, holds or still-holds; that is answered above.)
10. **The ledger's columns and formats were unspecified.** **Claimed fixed and was not** — round 3 found them still
    unenumerated. They are enumerated in Gate 3 above, in order, with the header carrying the date and commit.
11. **Check 2's enumeration was incomplete** and its Gate 5 half would have been red against the file's text.
    **Fixed:** the degradation, hold, still-hold and lost-call sites added; the Gate 5 assertion reads the pushed
    templates. (Round 3 found five further sites; all are in Gate 2's table above.)
12. **The fixture corpus claimed two rows the record does not hold.** **Fixed:** the corpus is split into taken and
    constructed, each constructed one saying what it exercises.
13. **The ledger's default was called gitignored.** **Fixed:** one gitignored path (`--out`), one tracked
    (`--ledger`).
14. **`PictureAnswer` is not a type here.** **Fixed:** `ImageAnswer`, and `yield-baseline.md`'s line corrected in
    the reader's slice.
15. **Gate 3's file list was missing five paths.** **Fixed:** the package manifest and tsconfig, the root
    dependency and lock, the node invocation, and the two research documents to freeze.
16. **Check 5's own file could not contain the string it checks for.** **Fixed:** it builds the string.
17. **No PATH-only secrets check.** **Fixed:** check 13, in S-028's form.
18. **The cut rating was on two scales at one version, and nothing bound the fixtures to the real schema.**
    **Fixed:** the Gate 7 question-set hash joins the rating stamp, and check 12 reads the schema and the
    migrations.
19. **"A comparison" was never defined, and two of its rules contradicted.** **Fixed**, and now `yield-compare`'s.
20. **Smaller corrections.** D-047 on the `Decisions:` line, `lease_until`, `worldId` from the request, Gate 1S's
    reasons as shared-subject names, and absent-in-the-record against zero-in-the-rating said once, in one place.

## Gate review 3 — 2026-10-12, adversarial reviewer, fresh, session 83

**Twenty findings, all four gates refused again**, every one verified against source by the reviewer. Three were
defects in the rating arithmetic rather than its wording, and they are what caused the split and S-184's phrasing
rule. **Six of the twenty went to `yield-compare` with the comparison** (S-184) and are recorded in that file; the
rest are answered above, and this section is their record because round 3 was not written into this file when it
ran.

1. **The worked rating values were wrong and the check that pinned them would have been red on its own fixtures.**
   `dead-on-first-picture` computed to 19.0, not 10.0, because the pictures part's second term was a share of the
   plan's shots **not** degraded: the denominator is non-empty for an admitted plan, a run that died on its first
   image call wrote no degradation row, so the share was 1.0 and took its full 0.3. The Gate-1-stop fixture
   computed to 19.0 as well, so the two **tied** and the ranking check would have failed. **Answered, then
   answered again:** every term was rephrased and every value recomputed, but round 4 showed the recomputation
   had hidden the tie behind a fixture the engine cannot produce. The pinned values are now **0.0, 10.0, 10.0,
   34.0, 89.7**, and the tie between the two early deaths is kept and explained rather than engineered away.
   **Round 3's own arithmetic does not reproduce**: the text it reviewed stated the Gate-1 fixture as 6 judged /
   2 accepted with 4 shots and 2 degraded, which gives pictures 38.3 and a run rating of 21.5
   (`git show 731fafd:docs/features/yield-benchmark.md`, lines 314-315); 19.0 would need pictures 30.0. The tie
   it named was real; the figure it named was not.
2. **Three complement terms paid for work never attempted** — pictures' "shots not degraded", clips' "shots not
   held at the take cap", the cut's "no holds". A run that entered the video stage and made nothing scored clips 30
   and cut 20. **Answered by S-184's rule**, which fixes the class: every term is something achieved over something
   attempted, never an absence; the three conventions are stated in Gate 2; `entered-video-made-nothing` is now a
   fixture pinning exactly that case.
3. **The five parts do not map onto the engine's three stages.** `RunEvent`'s stage is `plan | stills | video`;
   narration, clips and the cut all live inside `video`, the clips job writes one `video` start and the assemble
   job writes none (118 starts = 52 + 43 + 23). **Answered:** the part-to-stage table, "reached" defined per part
   from its own job row, and the shared narration-and-clips span labelled as shared.
4. **`benchmark-no-io` as specified did not forbid `node:crypto`** — the only reason hashing had moved to the
   reader. **Answered:** the rule enumerates its own builtins, `crypto` among them, with what else is in and out,
   and `--prove` builds the `crypto` case.
5. **The brief key was hashed in the reader's slice while its only check sat in the package's slice.**
   **Answered:** the package composes the key's input and is handed the hash function; the package's check uses a
   stub, the reader's check asserts the real SHA-256.
6. **The ledger's columns were still not enumerated**, claimed fixed in round 2 and not. **Answered:** fifteen
   columns in order with their formats, and the read date and commit in the header, which is what makes
   "byte-identical" true of the rows.
7. **"Five places assert 22" was false; there are more.** **Answered:** three test files (five assertions, two
   titles, two ordinal comments) and seven documents (thirteen occurrences), each named with its line, including
   `paid-path-keys.test.ts:139`'s dead `doesNotMatch(/21 .../)`. Round 3's eighth document,
   `hosted-checks.md:337`, does not exist and is recorded as not owed.
8. **The inherited-piece rule could not reach degradations, holds or still-holds**, and a resumed run writes a
   **fresh** degradation row for a carried one. **Answered:** recognition stated per table and asserted by
   check 2.
9. **"The per-reel cap is stored nowhere" was false where it decided the ending.** **Answered:** recorded only in a
   budget-limited result's `capCents`, absent otherwise, and reported where it exists.
10. **The estimate's stated exclusions omitted the largest.** **Answered:** the reserve, narration, every retake
    and every lost call, which is most of the 40–51¢ against 53–75¢ gap.
11. **The owner's "run on individual things" had no interface, no check and no slice.** **Answered:** Gate 3's flag
    table with defaults and exit codes, and check 6.
12. **"Every other reason-writing site" was incomplete.** **Answered:** `clips/index.ts`'s four run-ending details,
    `ladder.ts`'s "cannot be held" `why`, and the two `Unanswered` messages added to the table — and a detail
    string is never classified, so the embedded gate strings are not double-counted.
13. **Two smaller ones.** `tests/no-absolute-paths.test.ts` enforces "no machine path", not "every artifact path is
    a placeholder" — **answered** by check 12's second half. And S-178 was cited in the slices and missing from the
    `Decisions:` line — **answered**.
14. **"Three worked values" headed four bullets that two checks called four.** **Answered:** five, said as five
    everywhere.
    15–20. **The six that went to `yield-compare`**: the band's wording stated three ways and a factor of two apart;
    the credit guard missing a change that plans fewer or shorter shots; no verdict word for **hurt**; the arithmetic's
    pooling scope; the vacuous comparability conditions with the missing ceiling and `planVaryOn`; and the verdict's
    ambiguous unit with malformed sides. Each is in that file's "What the gates must settle", and none is answered
    here.

**One owner change applied with them.** The claim _"No two of those 25 groups hold two runs on one engine
version"_ is deleted: it cannot be known, because no row records an engine version — this feature's own finding.
What was measured stands in its place: **5 of the 25 brief groups hold two or more runs whose fingerprints match,
the largest matching set being five runs in group `4ce40e14`**, and a verdict needs four matching runs in each of
three groups, so none is available from history.

## Gate review 4 — 2026-10-14, adversarial reviewer, fresh, session 86

Read against the shrunk scoring half. **Nineteen findings, all four gates refused again** — then the owner read
the round count and chose to build (S-185). **Every finding is applied above, before any implementation file**,
and five were verified against source by this session before being applied. What it confirmed, and what it broke:

**Confirmed, and worth recording as settled**: nothing of the comparison was left behind — no band, delta, side,
verdict word, deciding measure or credit guard survives, and all six moved findings are in `yield-compare`'s
file; every gate-source claim holds (`gate1.ts`'s five reconcile and two technical templates, `gate5.ts`'s four
pushed strings with no clipping one and _clipped_ only in its docstring, `gate0.ts`'s four tokens, `gate2.ts`'s
five with no silence reason); every schema claim holds (`kept_from` on three tables only, `render.finished_at`
nullable, `job` with no completion instant, `model_receipt` with no cost column, `refused_answer.ask` 1 or 2,
`capCents` in a budget-limited result, `hold` against `still_hold`); `pipeline-no-io`'s pattern is quoted
character-for-character and does not hold `crypto`; `drift --prove` counts distinct rule names, so three rules
give 25; the slice targeting is right against `check.mjs`'s `FULL_ONLY`; and the five worked values were each
recomputed correctly **from their stated inputs**.

**The three that mattered**, each verified here against source:

1. **The `stopped-at-gate-1` fixture was a state the engine cannot produce**, so the 24.4 it pinned and the strict
   ranking it supported were both unreachable. The D-047 stop is the **canonical** picture's and fires **before
   any derived picture is attempted** (`stills/index.ts:514-521`); a derived picture that fails takes one repair
   and degrades (`:572-580`, `:649-657`). The real ending is one shot, three judged, none accepted — **10.0, tied
   with `dead-on-first-picture`**. Round 3's tie had been hidden, not fixed. **Answered:** the fixture restated to
   the ending the record holds, and the tie **kept and explained** — both runs achieved nothing in the parts they
   reached, which is what an achieved-over-attempted rating is for, and what separates them is reported beside the
   rating rather than folded into it.
2. **Three terms were achievements whose stated column was still an absence**, which is S-184's defect class
   surviving in all three parts that can stop: a shot that stopped the run writes no `degradation`, a shot whose
   takes all failed writes no `still_hold` (`clips/index.ts:260-270` ends the run), and `render_manifest` is
   **notNull, written before the assembler** (`schema.ts:487-500`), so an unassembled cut has a full manifest and
   no holds and would score 20.0. **Answered:** a table of positive columns — an accepted `picture` row,
   `take.outcome = 'accept'` (`schema.ts:412`), and every cut term 0 while `render.finished_at` is null — and the
   rule that **no term may be computed from the absence of a row**.
3. **The plan's third term named no column that scopes a receipt to a stage.** `model_receipt` has no stage
   column, `(reconciler, structured)` is written by Gate 1 for every picture and Gate 5 for every take, and a
   refused answer leaves **no receipt at all**, so the denominator counted answered asks. **Answered:** an ask is
   a `model_receipt` or `refused_answer(port='model')` row whose role is `planner`, plus `reconciler` rows with
   both id lists empty; asks are counted, not distinct pairs.

**The other sixteen, each applied:** the picture rule **is** recorded (`Plan.pictures`), so three gates and check
1 asserted a falsehood; checks 9 and 10 contradicted, since four fixtures carry `r1/—` stamps and a module that
refuses to compare them cannot rank them — the refusal is now scoped to the cut rating and ranking is not
comparing; the inherited-piece rule could not reach narration's non-row denominator or the `plan` rows a resume
copies into a table with no `kept_from`, so an inherited part is now `inherited` and left out of a `partial` run
rating; the rating stamp's hash needed injecting as the brief key's does; the committed ledger would fail
`format`, since `docs/research/` is not in `.prettierignore`; the amendment list was short by
`02-repository-map.md`'s rule enumeration and by every layout enumeration a tenth workspace member falsifies, two
comment ranges were off by one, and the HTML's count is six to amend and not seven; the `--out` default held a
`:`, which NTFS reads as a stream separator; `--rescore` with `--run` or `--part` was undefined over a tracked
file and now exits 2; `clips/index.ts`'s `detail:` sites are five and not four, the `messageOf(error)` catch-all
being the most common, and `stills/index.ts` and `plan/index.ts` write their own; the shorter-`until` run rating
was undefined between renormalising and not, and is **not** renormalised (S-182) and labelled; the shared span is
the clips job **plus the wait before assembly**; the 30.0 and 20.0 cost 13.0 points of run rating, not 15; check 7
cited Gate 2 for columns Gate 3 lists, two worker paths were missing `src/`, and `job.correlation_id` is the
column the reach rule joins on and was unnamed; check 1 held a rating convention Slice 2 builds; S-184 said four
worked fixtures where this file pins five, now amended there; and round 3's own 19.0 figure does not reproduce
from the text it reviewed, which said 21.5.
