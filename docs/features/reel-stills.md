---
status: current
authority: plan
---

> **Moved here on 2026-09-15** from the KnowScroll repository's `steering/features/reel-stills.md`, **before its
> gates were written**, under **S-033**; the last steering commit holding it is `e05e9f0`. Where this file says "this
> repository" about git history or the reviews file, it means the steering repository, readable at `steering-ref/`.
> Decisions it needs from now on are written here (**D-115**, **S-017**), and its gates are written and reviewed here.

# reel-stills — a chosen plan becomes approved still pictures, for $0

Status: verified
Decisions: D-001, D-002, D-005, D-006, D-014, D-020, D-025, D-026, D-027, D-028, D-029, D-030, D-031, D-032, D-035, D-038, D-041, D-042, D-043, D-044, D-045, D-046, D-047, D-048, D-049, D-050, D-061, D-063, D-064, D-065, D-069, D-081, D-083, D-084, D-086, D-087, D-094, D-097, D-098, D-099, D-100, D-106, D-108, D-110, I-4, I-6, I-7, I-8, I-10, I-15, I-16, I-17, I-20, S-010, S-016, S-021, S-025, S-026, S-027, S-028, S-029, S-030, S-031, S-032, S-033, S-034, S-035, S-036, S-037, S-038, S-039, S-040, S-041, S-042, S-043, S-044, S-045, S-046, S-047, S-048
Named only in the deferral list: D-008, D-024, D-033, D-034, D-036, D-037, D-040, D-071, I-9, I-19, S-019
Gates: product APPROVED 2026-09-16 adversarial-reviewer · architecture APPROVED 2026-09-16 adversarial-reviewer · program-design APPROVED 2026-09-16 adversarial-reviewer · slices APPROVED 2026-09-16 adversarial-reviewer

> **Created 2026-09-14 by D-108**, which replaced `reel-engine` with `reel-plan` and this feature. It starts where
> `reel-plan` ends — a chosen plan — and ends with approved still pictures. `reel-render` starts there.
>
> **Written by removing promises, not by copying.** `reel-engine`'s last plan (git, `7e50f79`) and its four reviews
> (`docs/founding/reel-creation-engine/reel-engine-reviews.md`) were read; what a picture-only engine does not need
> is cut and listed under **Deferred**, with where it goes. A reviewer should treat that list as known and chosen, not
> as findings.
>
> **The owner's answers this depends on:** S-029 to S-033 (session 13), and S-040 to S-043 and S-048, asked while
> these gates were written (session 14).
>
> **One word of the approved gates was changed after approval, on 2026-09-16, by the owner's answer in
> `reel-stills`' Slice 1: the sensor measure and score term `exposure` are named `brightness` (S-050).**
> D-096's `Confirmed-by` bans a field named `exposure` anywhere in this repository and `reel-plan`'s check 5
> enforces it, so the gates as written could not be built without weakening that check. Gate 2's three prose lines and
> Gate 3's signature say `brightness`; the `Gates:` line above was not touched, and nothing else changed.
>
> **Amended by `yield-benchmark` on 2026-10-14, Slice 1 — the gates below are not edited, and no assertion is removed**
> (**S-184**, **S-185**). **Check 3's printed line counts twenty-five rules, not twenty-two.**
> `yield-benchmark` adds `benchmark-no-engine`, `benchmark-no-io` and `benchmark-npm-only-zod` in one change —
> three and not one, because dependency-cruiser ANDs a `to`'s attributes and a single rule cannot say both "any
> builtin" and "any npm package but `zod`". `tests/reel-stills-rules.test.ts` keeps check 3 in its exact form with
> its number corrected: `assert.match(prove.out, /25 rules proven to fire/)`, and the comment naming each rule and
> its ordinal gains the three, as every count change has (S-078). **The count stays EXACT**, so cases for a
> twenty-sixth still fail here. Nothing else in this feature changes: no contract, stand-in, helper, provider,
> setting or other check, and `worker-no-providers` — check 2's subject — is untouched. This feature's journey
> re-runs in `yield-benchmark`'s last slice (S-099's form, S-178's order).

> **Amended by `resume-failed` on 2026-09-27, Slice 5 — the gates below are not edited, and no assertion is removed**
> (**S-163**, **S-164**). **`finishStills` takes the engine's own resume**, run after `endStills` — the chosen flags,
> every degraded shot's labels and the stage's events — and before `run.finished`, in a savepoint
> (`packages/domain/src/runs.ts`): so a picture the resume copies carries the degradation the failing attempt just
> wrote, and the resumed run keeps that shot degraded with its reason and no image call, whatever its reserve now holds
> (`resume-failed` check 40). **The keyframes job's failed ending goes through `finishFailed`**
> (`apps/worker/src/resume.ts`), and `KeyframesJobContext` gains the one key `resume`; its stopped and completed endings
> do not change. With the switch off — the worker's default, and every verified test — every stills ending reads as
> it did.
>
> **Amended by `resume-failed` on 2026-09-26, Slice 4 — the gates below are not edited, and no assertion is removed**
> (**S-162**, **S-171**, superseding **D-047** steps 1 and 3 for one case). **A resumed run's canonical with no reserve
> slot for its repair stops; it does not fail.** `readStillsInputs` answers `{ kept, copiedPictures }` —
> `copiedPictures` the run's picture rows with `kept_from` set — and the stills stage's input carries it
> (`StillsInput.copiedPictures`, 0 for every run that resumes nothing). When both canonical candidates fail with no slot
> free, a run holding copied pictures ends `stopped-rule`, rule `gate-1`, with no repair call, no `run.failure` and
> _"the canonical picture of shot-S failed Gate 1 twice and no reserve slot is free for its repair: the run having made
> or kept E image calls before it and its placement making U more of the 6 (D-047, S-161, S-171). …"_, the two
> candidates' reasons after it; a run holding none fails `crashed` in S-048's words as before, so check 49b
> (`reel-stills-restart-reserve.test.ts`) stands exactly as written. The comment at the canonical's repair names both
> cases (`packages/pipeline/src/stills/index.ts`). **`readRecord`'s pictures carry `keptFrom`** on a picture copied
> from the run it resumes, and none on any other (`reel-contract`'s block), so every verified record reads as it did.
>
> **Amended by `resume-failed` on 2026-09-26, Slice 3 — the gates below are not edited, and no assertion is removed**
> (**S-157**, **S-162**, **S-164**). **The image guard compares the reel's spend** — `reelSpentCents`, the run's chain
> and, for a resumed run, the chain of the run it resumes (D-081 and S-036 read across both) — and a stop's question
> reports it as _"Spent"_; for a run that resumes nothing it is `spentCents`, so no guard figure in
> `reel-stills-spending` moves, and a run's `costCents` stays its own. **`imageCallCount` counts a resumed run's copied
> pictures** (`kept_from` set) beside its receipts and image lost calls, so a copied picture is an earlier call and
> never a first call still to make. **`markDegraded` marks receipts in the run and in the run it resumes**: a kept
> picture's receipt stays where it was paid for (S-058 as S-164 reads it). The keyframes job is otherwise unchanged: a
> resumed run's copied pictures reach it through `readStillsInputs`, as an earlier attempt's do (Slice 2).
>
> **Amended by `resume-failed` on 2026-09-26, Slice 2 — the gates below are not edited, and no assertion is
> removed** (**S-164**, superseding **S-048** in part). **A keyframes job run again keeps every picture an earlier
> attempt decided** — accepted or failed, read back by `readStillsInputs` — and makes again only a picture whose
> checks were cut off: no call, no check and no receipt for a kept picture, its verdicts events once, the canonical best
> of two (two kept survivors ranked by their stored totals), a kept failed picture's stored reasons told to its repair,
> a kept repair counted and taking no slot again, a kept degradation ending its shot. **The reserve is 6 − earlier −
> unmade** (`reserveOf(placements, earlier, kept)`), and S-061's two details read _"its placement makes U more, E+U in
> all"_ and _"its placement making U more of the 6"_. **`seq` is the run's greatest plus one**, the same number
> wherever no picture is copied. **Check 48 is amended** as `resume-failed`'s Gate 3 works it: its crash point kept,
> the second attempt's calls `a2-shot-0-b`, `a2-shot-1-single`, `a2-shot-2-single`, the kept `a1-shot-0-a`
> chosen, five generations, the seqs 1 to 5, and — added — the model receipts and the sensors' measures of the second
> attempt; its budget case gains the kept picture's verdict event. **Check 49 is amended**: each test keeps its first
> kill and kills the same run again at call 1 of each further attempt (`killedAgain`, `tests/engine/restart.ts`),
> so the new formula is the one reached; each failure also asserts `run.failure` `crashed`. `takenUp` reads the
> attempt it expects.
>
> **Amended by `resume-failed` on 2026-09-26, Slice 1 — the gates below are not edited, and no assertion is
> removed** (**S-163**). **Gate 1S's unparsable judge answer throws an `Unanswered`** (`gates/gate1s.ts`), today's
> words. **The stills stage's failed ending carries its kind**: the catch-all's from the thrown thing's class, S-061's
> two reserve failures `crashed`; `finishStills` takes a `RunEnding`; the keyframes job's unreadable cap is `engine`.
> `picture` gains `kept_from`, null on every row until a resume copies one. The failed result's keys
> (`reel-stills-faults.test.ts:57-65`) hold. The stand-in image port's scripted throw may name its class (`as`); without
> one it throws a plain Error as before, and a class outside the six refuses to build the stand-in.
>
> **Amended by `cut-rules` on 2026-09-24, Slice 1 — the gates below are not edited, and no assertion is removed**
> (**S-158**). The plan score asks three questions where it asked four, so this feature's admission check's
> `forkOfTwo()` scripts three answers a plan — its only `no` is still the third, so plan b still wins. This
> feature's journey is run again in `cut-rules`' last slice.
>
> **Amended by `ask-again` on 2026-09-24, Slice 4 — the gates below are not edited, and no assertion is
> removed** (**S-156**). **Gate 1's witness, asked again, is told why** — its first answer's issues, and nothing from the brief — and **every refused answer is kept**: `StillsPorts` gains `refusals`, which the worker fills with `refusalRecorder`, one `refused_answer` row a refusal. No verdict, observation or receipt count moves; check 46's words and its two `observe` receipts hold. This feature's journey is run again in `ask-again`'s last slice.
>
> **Amended by `ask-again` on 2026-09-24, Slice 3 — the gates below are not edited, and no assertion is
> removed** (**S-156**). **Gate 1's reconcile goes through `askStructured`**: an answer refused for its shape is asked once more,
> told why, so check 27's _"one structured call"_ reads _"one, or two when the first answer's shape was refused"_.
> The check runs on answers that parse and holds as written; `ask-again`'s check 15 holds the second ask, with one
> `refused_answer` row and one reconciler receipt — the second — for that id. The engine's reconciler scripts may now
> queue two answers for one id (`refusedThen`), as its witness scripts already could; with one, nothing changes.
>
> **Amended by `ask-again` on 2026-09-24 — the gates below are not edited, and no assertion is removed**
> (**S-156**). **The witness's schemas moved to `packages/contracts/src/observation.ts`**, unchanged, so that the
> MiniMax adapter asks with the very objects the gate parses under; `packages/pipeline/src/stills/observation.ts` and
> `clips/observation.ts` re-export them, so every import keeps its path. No field, closed set, minimum or strictness
> moves — `second-ask`'s check 5 snapshots both schemas and holds unchanged. This feature's journey is run again in
> `ask-again`'s last slice.
>
> **Amended by `three-pictures` on 2026-09-23 — the gates below are not edited, and no assertion is removed**
> (**S-150**). A picture has a third role, **`standalone`**, placed only under a plan's own `pictures: 'upToThree'`: on
> the earliest shots holding no picture and naming no pictured subject, up to three pictures in all, each made once
> from scratch (no reference, no framing), through Gate 1 with one repair from the reserve, never Gate 1S, never
> stopping the run. **The stage now splits its placements by ROLE, not by position** — a lone standalone is no
> canonical — and runs the canonical, derived and Gate 1S blocks only when a canonical is placed, exactly as before;
> standalones come after, in shot order. `placePictures` reads the rule from the PLAN, so a keyframes job makes the
> pictures its plan was priced under whichever worker runs it. With the rule absent, every check here is unchanged.
>
> **Amended by `second-ask` on 2026-09-23 — the gates below are not edited, and no assertion is removed**
> (**S-147**). **Gate 1's witness step asks once more when its answer is refused**: the same `observe` call, sent a
> second time, and only a second refusal fails the run (S-042 in part). So Gate 2's _"exactly one `observe` receipt per
> picture"_ and _"Picture ids never repeat, so each key names one receipt"_ now read: **one `observe` receipt per
> picture whose answer parsed first time, two when the first was refused, and the observation is tied to the LAST**.
> Only an answer that parses ever becomes a record, so the one record of what a picture shows is still its one
> observation (I-15's reason, whose count S-147 supersedes). **Check 46's fixture gives the barons' picture TWO
> malformed answers** — with one, the second ask would read the next picture's answer — and it gains two assertions:
> the detail is _"the witness's answer for a1-shot-1-single is not an observation: …"_, and the kept receipts show
> that picture's `observe` twice. Every other check is on witnesses that parse, and its counts of one stand. This
> feature's journey is run again in `second-ask`'s last slice.
>
> **Amended by `reel-render` on 2026-09-16 and 2026-09-17 — the gates below are not edited, and no assertion is
> removed** (**S-077**, **S-078**). Where Gate 1 says a video is "not built yet", that is no longer true:
>
> - **`until: 'video'` is accepted.** **Check 8's `video` clause asserts acceptance with a `runId`**, and every
>   assertion it made of the refusal is made of `planVaryOn: 'order'`, the one request still refused as `unsupported`
>   (D-110), in the same test (`reel-render`'s Slice 2).
> - **A `video` run's stills stage is exactly the one below**, but for what follows a stage that completes: the
>   keyframes job writes the same chosen flags, labels and events, is done with its cost kept, and makes the chain's
>   `reel.clips` row instead of finishing the run (**S-069**). Every other ending ends a `video` run exactly as a
>   `stills` run's, with no further row.
> - **Check 5** asserts `GATE_ORDER` with Gates 2 to 5 and 7, and **check 3** counts nineteen rules
>   (`reel-render`'s Slice 1). Both stay exact.
> - This journey is run again in `reel-render`'s last slice.

## Gate 1 — Product (no technical language)

**The problem.** A plan of a reel can now be asked for and answered. Nothing yet makes a picture, and nothing checks
one — and most of the rules about making a reel are rules about checking a picture before anything dearer is made from
it.

**The visible outcome.** Something asks the engine for the pictures of a reel — the same request as for a plan, asking
to go as far as pictures, with the most it may spend. It hears at once that the request was taken, or why not. A
little later it gets one of these answers:

- **the approved pictures** — one for a shot of the subject the reel shows most, chosen from two tries, and one each
  for up to two more subjects the reel shows more than once. **At most three pictures: the reel's other shots have
  none, by design**, and a reel in which no subject appears twice gets none at all. Beside them, every shot that should
  have had a picture and has none, and why;
- **that the pictures would cost more than its limit**, with the figures, before any picture is made;
- **that making them stopped** because the next picture would pass a limit, with the figures and what was spent;
- **which rule stopped it and at which step** — the main picture failed its checks three times;
- that it was cancelled; or that something went wrong inside the engine, said plainly;
- and, as for a plan: that every plan was over the per-reel limit, or which rule stopped the plan.

Behind the answer the engine keeps a record of **every picture made** — the one not chosen, every try that failed, and
the pictures of an attempt the engine had to start again included — with each check it reached and what that check
found, what the describing step saw in it, and why it was or was not chosen.

**What "approved" means.** A picture is approved when it is a readable picture of the right shape; when it has been
described by a step that was never told what the picture should show; and when that description, held against what
its shot must show and must never show, agrees. **A picture made from the main picture** must also, where its shot and
the main picture's share a subject and the two look different enough to be in doubt, be judged to show the same one.

**When a picture fails.**

- **The main picture** is tried twice. If both tries fail, it gets one more try that is told why they failed. **Only
  if that fails too does the reel stop**, before any other picture is made.
- **Any other picture** that fails gets another try, told why, while the reel still has a try in hand. A try that fails
  the picture's own checks is its last; a try that passes them but does not look like the main picture's subject may
  get one more — never more than two extra tries for one shot. When no try is left, or the last one fails, **that shot
  goes on without a picture**, it is written down with the reason, and the reel carries on.
- **If the engine stops partway and starts the pictures again**, it makes them again from the start, and the tries it
  already spent count against what the reel has left. If what is left cannot make the pictures planned — or the main
  picture's extra try — it says something went wrong inside the engine, rather than make more than six.

**Asked for a video, it says "not built yet."**

**Surfaces.** None. A service other programs call.

**The one measure allowed.** Whether a picture that should be approved is, and one that should fail fails **at the
check the design says it fails at**.

**What must NOT happen.**

- **Nothing may cost money, and nothing may read a secret.** This is structural, not a setting: this feature builds
  **no connection to any paid service** — its pictures are made, and looked at, by stand-ins that run on this
  machine. It is proven by running the whole thing with no secrets in its surroundings.
- **Nothing may reach out of this machine.**
- **The step that describes a picture is never told what the picture should show.**
- **No picture is made from a main picture that has not passed its checks.**
- **Nothing is quietly made worse.** A shot that should have had a picture and has none is written down, with why.
- **Nothing is chosen without a record of why.** The try that was not chosen is kept, and never used instead.

## Gate 2 — Architecture

**Where the code goes** — the engine repository's existing packages (S-010). Only what this feature touches:

| Package                  | This feature adds                                                                                                                                                                   | May not                                                                            |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `packages/reel-contract` | a required `type` on `Criterion`, `presence` only in `mustNotShow` (S-029), in **version 1** (S-034)                                                                                | import any other engine package (D-094)                                            |
| `packages/contracts`     | `PictureRef`, `ImagePort`, `PictureSensorPort`, `StillsRecorder`, `PictureRecord`, the observation, reconciliation and score shapes; `observe` and `compare` on the model port      | import anything internal except `@cutroom/reel-contract` (D-099)                   |
| `packages/pipeline`      | admission's figure, where pictures go, the image prompts, Gate 1, the keyframe score, Gate 1S, the ladders; `witness` and `judge` model ids — **pure functions handed their ports** | import `domain`, `providers`, `apps`, any I/O module, or any npm package but `zod` |
| `packages/providers`     | **stand-ins only**: the image port, the sensor port, and `observe` and `compare` on the model stand-in                                                                              | import `domain` or `pipeline`                                                      |
| `packages/domain`        | the picture tables and receipts, the chain's second job, the spend and image-call count of a run                                                                                    | import `pipeline` or `providers`                                                   |
| `apps/api`               | `until: 'stills'` accepted; the record route reads pictures                                                                                                                         | import `providers` (D-005)                                                         |
| `apps/worker`            | admission at the end of `reel.plan`; the `reel.keyframes` runner; the guarded image port; the recorder; recording `observe` and `compare`                                           | import `providers` — **new rule** (S-038)                                          |

**No real image, vision or sensor adapter is built here.** fal, MiniMax and every picture sensor library are deferred.
That is what makes Gate 1's "no connection to any paid service" structural: the only image port, the only vision calls
and the only sensors in the repository are stand-ins, **and the worker cannot import one** — it is handed its ports by
whoever starts it (S-021, S-038).

**How a run goes.**

```mermaid
sequenceDiagram
  Caller->>API: POST /v1/runs (until = stills)
  API->>Domain: store run, job reel.plan, run.accepted
  Worker->>Pipeline: planReel — unchanged (reel-plan)
  Worker->>Pipeline: admitPictures(selected plan, budgetCents) (S-030, S-035)
  alt no plan selected
    Worker->>Domain: reel-plan's endings, unchanged (S-025, S-026)
  else pictures over the ceiling
    Worker->>Domain: one transaction: plans, verdicts, stage.finished plan, refused(ceiling), no question
  else admitted
    Worker->>Domain: one transaction: plans, verdicts, stage.finished plan, job reel.keyframes (D-083)
    Worker->>Domain: claim reel.keyframes; cancel flag + stage.started stills (S-027)
    Worker->>Domain: at attempt start: earlier attempts' image calls (S-048)
    Worker->>Pipeline: makeStills(request, selected plan, attempt, earlier calls, guarded image, recording model, sensors, recorder)
    Pipeline->>Pipeline: place pictures on shots (S-039)
    Pipeline->>Pipeline: canonical a, b → Gate 1 each → score survivors (D-030, D-031, D-042)
    Pipeline->>Pipeline: no survivor → one repair → Gate 1, or stop for a rule (D-047)
    Pipeline->>Pipeline: derived pictures from the chosen canonical → Gate 1 → repair (S-043)
    Pipeline->>Pipeline: Gate 1S on each derived picture → repair or degrade (D-049, D-050, S-045)
    Worker->>Domain: before every image call: spend + rate vs cap, then ceiling (S-035, S-036)
    Worker->>Domain: as each image call returns: receipt, job cost and the picture's row, one transaction
    Worker->>Domain: as each check completes: the picture's row, through the recorder (S-046)
    Pipeline-->>Worker: StillsOutcome — never thrown (S-046)
    Worker->>Domain: one transaction: chosen flags, degradations, events, result
  end
  Caller->>API: GET events / result / record
```

**The worker calls four pipeline functions: `planReel`, `admitPictures`, `makeStills`, and `placePictures`** — the
last so its guarded image port can write each picture's row with its shot, subject and role (S-039).

### What a request becomes

**Accepted at submit:** `until: 'plan'` and **`until: 'stills'`**. **Refused `422 'unsupported'`, no run:** `until:
'video'` (D-108), and `planVaryOn` other than `shotCount` (D-110) — unchanged. **The plan stage of a `stills` run is
exactly `reel-plan`'s**: the same two plans, Gate 0, score and repair; and when no plan is selected, the same endings —
refused for budget with `limit: 'reel'` and its question, or stopped for rule `gate-0` or `split` — with S-025's events
and **no `reel.keyframes` row**.

**Criteria carry their type** (S-029). `Criterion.type` is `presence` or `event`, required; `mustNotShow` accepts only
`presence`. **This amends contract version 1; `CONTRACT_VERSION` stays 1** (S-034, D-106).

### Admission (S-030, S-035, D-083, D-100)

When planning selects a plan and the request's `until` is `stills`, the plan job compares **the pictures' figure —
the selected plan's planned image calls × the image rate** — with the request's `budgetCents`:

- **above it** → the run finishes **refused for budget, `limit: 'ceiling'`**, `estimateCents` the pictures' figure
  (S-030), `ceilingCents` the ceiling, `capCents` the cap the job read. **No question is written** (D-100), and **no
  second job row** is created (D-083). The plan stage produced a plan, so it has `stage.finished` (S-025, S-046);
- **at or below it** → **admitted**: in one transaction, the plan rows, the verdicts, `stage.finished` for `plan`, the
  plan job marked done at cost 0, and **one job row of kind `reel.keyframes`**, with the run id as `correlation_id` and
  the plan job as `parent_id` (D-081). The run is not finished.

**The reserve is not in the admitted figure** (S-035): D-027 plans four calls and holds two _"unspent at plan time"_,
and an estimate is _"what the reel would cost to generate as planned"_ (D-083). **The per-reel cap is compared before
every image call instead of before the enqueue** (S-035, superseding D-081 on that clause): the chain's only spend is
image calls, and Gate 0 has already compared the whole reel's estimate with the cap (S-030).

### Where the pictures go (S-039, D-027, D-029)

Code places pictures on the selected plan's shots before any image call, from `rankSubjects` (D-029) and
`plannedImageCalls` (D-027), unchanged:

- **rank 1**, if any, is the **canonical**, on **the first shot that shows it** (D-029 part 4);
- **ranks 2 and 3**, where they exist, are **derived**, each on **the earliest shot showing it that no higher rank
  holds**;
- **a rank whose every shot is held gets no picture and no call**: each of its shots already opens with a checked
  picture, and a picture that opens no shot is what D-029 part 2 forbids (S-039, superseding D-029 part 3 step 5 and
  D-030's check for that case). It is not a degradation: no shot loses its opening picture;
- **every other shot has no picture** (D-027: the remaining shots are `text-to-video`, which is `reel-render`'s);
- **no rank at all** — no subject in two shots — places nothing: the run completes with no picture, no Gate 1 verdict
  and no image call.

A picture is **frame 1 of exactly one shot**. Shot ids are `shot-<unit>`. **Picture ids carry the job's attempt**:
`a<attempt>-shot-<unit>-<label>`, the label `a`, `b` or `repair` for the canonical and `single`, `repair`, `repair-2`
for a derived shot — so a restarted attempt never reuses an id or a path (S-046).

### Making a picture (D-026, D-030, D-032, D-038, D-069, D-086, D-087)

**The image prompt** is built by code from **the entry** for the picture's shot: the style contract's text (D-069),
the names of every subject the shot shows, the shot's sentences, the presence criteria S-040 assigns it — what it must
show and must never show — and the shape, 9:16. **The canonical's entry declares its axis**, `framing`, and its two
candidates render **the same entry with two framing values** from a setting, default `medium` and `wide`, and **differ
in their framing line and in nothing else** (D-032, S-044). An entry for the canonical without an axis fails
validation, and **a worker whose two framing values are equal refuses to start**. The planning call authors no framing,
which is where D-032 permits variation.

- **The canonical** is made twice, `a` then `b`, **with no reference picture** (D-030).
- **A derived picture** is made once, **with the chosen canonical as its only reference** (D-026, D-038: one hop).
- **A repair** renders its picture's entry again with **the reasons of every verdict it consumes** appended: both
  candidates' Gate 1 reasons for the canonical (D-047); a derived picture's Gate 1 reasons (S-043), or its Gate 1S
  reasons — each shared subject the judge answered `no` (D-050). A canonical repair takes candidate `a`'s framing; a
  derived repair keeps the canonical as its reference.

**Files.** The stand-in image port writes **a real PNG** at `<artifact root>/<runId>/<pictureId>.png` (D-087), and
refuses a `pictureId` whose path would leave the root. **The artifact root is one setting of the stand-in**,
defaulting to `.artifacts/` at this repository's root, which `.gitignore` names (D-086); every test points it at a
temporary folder but check 17's second half. `StillRef.path` is the absolute path. **No file is removed**: an
interrupted attempt's pictures stay where they are.

### Gate 1 — four steps on each picture (D-042, S-031, I-7)

Run in order on every picture made, as soon as it is made. **Deterministic steps first** (I-7):

1. **technical** — the sensor port **measures the file** (I-17): **fails** when the file is not a readable image or its
   width × 16 ≠ its height × 9 (D-028's dimension assertion). **A picture that fails here stops** (S-031): no other
   step, no `observe`, no reconcile, no observation.
2. **text** — the sensor port reads the picture's words; **the step records them and never fails** (S-041, the owner's
   answer: no text policy exists).
3. **witness** — **one `observe` call**, role `witness`, temperature 0, given **the picture and nothing else** (I-8,
   D-045). Its answer is parsed at the gate boundary under the `WitnessObservation` schema — D-041's fields and D-044's
   `clippedByEdge`, **no `actions` or `eventOrder` on a still** (D-041). **An answer that parses** is recorded, and
   **carried on accept and on fail** (D-041, I-15); the step's outcome is `accept`. **An answer that does not parse
   finishes the run `failed`** (S-042, the owner's answer): the step did not complete, so the picture's record has
   technical and text only, and no observation id; nothing malformed reaches a consumer.
4. **reconcile** — **one `structured` call**, role `reconciler` (D-064's role), temperature 0, naming the picture's id
   for its receipt, given the observation, the shot's subjects by id and name, and **the picture's presence criteria**
   — **never an `event` criterion** (D-043). It answers, for each subject, the index of the entity that is it or none,
   and whether that entity's `count` matches **the number the subject's name states; or, when it states none, one for a
   singular name and two or more for a plural one** — _"the barons"_ matches any count above one; a collective name such as
   _"a flock"_ is the reconciler's to read (S-040, least confident 3); for
   each criterion, whether it is shown and by which entity. The answer must name every subject and every
   criterion given, or it does not parse and the run fails. **Code fails the picture** (S-040) when:
   - a subject the shot shows is not shown;
   - a shown subject's entity has `clippedByEdge` — D-031's first veto, in Gate 1 by D-044 and D-046;
   - a shown subject's count does not match — D-031's second veto, by D-046;
   - a `mustShow` criterion is not shown;
   - a `mustNotShow` criterion is shown.

**Which criteria a picture gets** (S-040, the owner's answer): a **`mustShow` presence criterion** goes to the pictures
of shots whose sentences carry its `claimId`; **every `mustNotShow`** goes to every picture; a `mustShow` with no
`claimId`, or whose shots have no picture, goes to none — **the clip's Gate 5 checks every criterion** (D-043), so the
still check stays pure addition. S-040 supersedes D-043's table row and `Confirmed-by` for those criteria.

**A picture's Gate 1 verdict has no outcome until it is decided**: `fail` as soon as technical fails, or once
reconcile completes with a step failed; `accept` **only when all four steps completed and accepted** — so every
accepted verdict carries an observation (D-041) and four step outcomes (D-042). A picture whose steps were cut off —
by a thrown call, an answer that did not parse, or a killed worker — keeps the steps it completed and **no verdict
outcome**, and has no `verdict` event. The verdict records its **coverage — `whole picture`** (I-6). Its completed
steps' outcomes are the record's `checks`, gate `'1'`, with their step names.

### Choosing the main picture (D-030, D-031, D-042, D-045, D-046, S-044)

Both candidates go through Gate 1; **only survivors are scored** (D-042).

- **Two survivors** → both are scored; **higher wins; a tie goes to `a`**, the first made (D-031 rule 4).
- **One survivor** → it is chosen, **with no score** — nothing to rank (D-047 step 2's shape).
- **None** → the ladder below.

**The keyframe score reads Gate 1's verdict and makes no call** (D-045). It is a weighted sum over five terms of the
canonical subject's reconciled entity and the technical measure, every term in (0, 1] (S-044): **reference terms** —
`faceVisible` (`yes` and `noFace` 1, `partial` ⅔, `no` ⅓), `unoccluded` (1, or ½ when occluded), `prominence`
(foreground 1, midground ⅔, background ⅓) — and **technical terms** — `sharpness` and `brightness`, the sensor's values
clamped to [0.01, 1]. **Weights are settings, provisional until M-1** (D-031 rule 3), defaulting to **2 for each
reference term and 1 for each technical term** — reference quality above composition, D-031's one fixed ordering. A
weight that is missing or not a positive finite number counts as its default, and **the total is capped at the largest
finite number**. So **every score is finite and above 0** (D-046), and the score **has no path that rejects** (I-16).
**Each scored candidate records its terms, the weights used and its total** (D-031 rule 5), so a score replays.

### Gate 1S — set consistency (D-049, S-045)

Runs **once every derived picture has been through Gate 1**, on each derived picture that passed it, **in rank order**,
against the chosen canonical:

- **the subjects both shots show**, from the selected plan. **None** → the pair is **accepted uncompared**, recorded so;
- **else**, the sensor port's **similarity** of the two whole pictures (a cosine); **suspicion is 1 − similarity**;
- **at or below the suspicion threshold** — a setting, provisional until M-1 (D-049) — **accepted with no call**;
- **above it** → **one `compare` call**, role `judge`, temperature 0, given **the two pictures and the names of the
  shared subjects**. Its answer must name every shared subject with `yes` or `no`, or it does not parse and the run
  fails. **Any `no` fails the picture**, and the verdict's **reasons** are the subjects answered `no`. A similarity never
  fails a picture on its own (I-16).

S-045 supersedes D-049 on taking embeddings _"over the shared subject"_ and on _"one grid model call"_ over _"a contact
sheet of the pool"_. No declared state change exists (S-032), so D-049's exclusion of an FLF2V pair has nothing to
exclude. Every Gate 1S verdict records its coverage — `pair` — is a record check, gate `'1S'`, and is a `verdict` event.

### The ladders and the reserve (D-027, D-047, D-048, D-050, S-043)

**The placement's calls** are the image calls the placement will make before any repair: 2 for a placed canonical and 1
for each placed derived picture — `plannedImageCalls` less any rank with no free shot (S-039). **The reserve is 6 − the
image calls earlier attempts of the job made − the placement's calls**, fixed when an attempt starts (S-043, S-048). A
placement with a rank left out therefore has a reserve larger than D-027's two; S-043 supersedes D-027's _"Two of the
six permitted image calls … held as reserve"_ and D-029 part 3 step 7's _"two held in reserve"_ for that case.
**If that is below 0 — a restarted attempt cannot make its pictures within six calls — the run finishes `failed` before
any image call**, with the detail naming the counts: a crash is a fault. **Every repair takes one slot**, any free slot
(S-043, the owner's answer — no slot is held for Gate 1S). So **no run makes more than six image calls** (D-027), and no
plan plans more than four (S-032). The stage runs in this order, so **the canonical's repair always has first claim**
(D-048):

1. **No canonical survivor** → **one repair** (D-047), **which needs a free slot**. With none — only a restarted
   attempt can have none — the run finishes **`failed`**, a restart fault, before the call; S-048 supersedes D-047 step
   1, _"One informed repair call"_, for that attempt. **Passes** Gate 1 →
   chosen outright, no score. **Fails** → the run is **stopped for a rule**: `rule: 'gate-1'`, `step: 'stills'`, the
   detail naming each of its canonical pictures' failed steps and reasons. **No derived picture is attempted** (I-10),
   and no plan is made again (D-065).
2. **Derived pictures, in rank order.** One whose picture **fails Gate 1** takes **one repair if a slot is free**,
   consuming its verdict; the repair goes through Gate 1. With no slot free, **or if the repair fails Gate 1**, its
   shot is **degraded** (S-043, the owner's answer).
3. **Gate 1S.** A derived picture that **fails Gate 1S** takes **one repair if a slot is free and its shot has had fewer
   than two**, consuming that verdict (D-050 step 1); the repair goes through **Gate 1, then Gate 1S**. A repair that
   fails Gate 1 degrades its shot (step 2's rule); one that fails Gate 1S is a derived picture failing Gate 1S, and this
   step applies to it again. With **no slot free, or two repairs already made for the shot**, its shot is **degraded**
   (D-050 step 3).

**No shot takes more than two repairs** — D-014's _"retries ≤ 2 per shot"_. S-043 supersedes D-050 step 1, _"Repair it,
if a reserve slot is free"_, for a shot that has had two repairs. With a placement of four calls the reserve is two, so
the cap binds only on smaller placements, whose reserve is larger.

**A degraded shot** has no approved picture: its pictures are in the record, none chosen. **It is labelled in four
places** (I-4, D-025): a `degradation` row naming the shot, the gate that failed last and why; that last failing
verdict, which carries the degradation's reason; every `generation_receipt` of the shot's pictures, marked degraded;
and a `degraded` event. **The run does not fail and the shot is never cut** (D-050 step 3). Its `text-to-video` clip is
`reel-render`'s (D-050 step 2).

### Spending while pictures are made (S-035, S-036, D-081, D-100)

**Every image call goes through the worker's guarded image port**, which the pipeline cannot bypass: it is the only
image port it is handed (S-021).

- **Before each call**: `spent` is **`SUM(cost_cents)` over every job row with the run's `correlation_id`** (D-081).
  If `spent + image rate` is above **the per-reel cap** the job read, the call is **refused with `limit: 'reel'`**;
  else if above **the request's ceiling**, **refused with `limit: 'ceiling'`**. `estimateCents` is `spent + rate`.
  Planned calls and reserve calls alike. The six-call ceiling is kept by the reserve, above, not by the guard.
- **A call refused for budget is not made.** The stage returns **stopped for budget** with every picture made so far;
  the run finishes **`stopped`, `reason: 'budget'`**, with the limit, `estimateCents`, the ceiling, the cap, and
  **`costCents` the spend**. **A stop at the per-reel cap appends one entry to the questions file** after the run
  finishes (D-100, S-026's form, S-035); a stop at the ceiling writes none.
- **After each call**, in one transaction: its `generation_receipt` row — with the rate applied (D-028) — its
  `costCents` **added to the running job row's `cost_cents`**, and **the picture's row**, made and not yet checked.

**What a stand-in picture costs** (S-036): **0 cents, unless a test scripts a cost on it**. So a default run's
`costCents` is 0, and every limit above is exercised by scripting costs, not by pretending money was spent.

### How a stills run ends (S-046)

`makeStills` **never rejects**: a thrown port call, a refused parse or a bug becomes `failed`, with the detail. **The
pictures are written as they go**: the guarded port writes each picture's row as the call returns, and the stage hands
**the `StillsRecorder`** each picture's record again as each of its checks, its score or its Gate 1S verdict completes;
the worker's recorder writes the row, and the observation or reconciliation. So the record keeps _"one entry per
picture made"_ with each check it reached, whatever ends the run. The keyframes job then writes the chosen flags, the
degradations and their labels, the events, `run.finished` and the result **in one transaction**.

- **Completed** → `status: 'completed'`, `until: 'stills'`, `estimateCents` the selected plan's, `costCents` the spend,
  `stills` the chosen pictures in shot order, `degradations`.
- **Stopped for a rule, for budget, or failed** → the result as above; the pictures made are in the record.
- **Events** — S-046 lists them for every ending, **in the order the checks ran**. **A run stopped or failed in the
  stills stage has no `stage.finished` for `stills`** (S-025's rule).

**Cancel** — the flag is read with `stage.started` for `stills`, in one transaction before every attempt of the
keyframes job (S-027). Set → the run finishes `cancelled`, `costCents` the spend, no stage started, no image call. A
cancel during the stage does not stop it.

**A restart** — a keyframes job claimed and not finished is claimed again when its lease runs out and **run from the
start** (S-027), with the next attempt number — **making every picture again and paying again**, the owner's answer
(S-048): `stage.started` for `stills` is not written twice; **the earlier attempt's pictures stay in the record** under
their own ids, with the checks they completed, no verdict outcome where one was cut off, and none chosen; its receipts,
files and cost stay; **its cost is counted by the next attempt's guard, and its image calls come out of the next
attempt's reserve** (above). A restarted attempt may make the canonical's two candidates again, which S-048 allows by
superseding D-047's and D-030's one-call checks for a restarted attempt. Only the finishing attempt's verdicts become
events.

### The ports (D-006, D-084, S-037, S-038)

**`LanguageModelPort` carries three calls, and pictures enter it through two** (S-037):

- **`structured`** — prompt, schema, role `planner` or `reconciler`, temperature 0, and optionally the ids of the
  pictures a call is about, for its receipt. **It carries no picture.**
- **`observe`** — **a picture and temperature 0, nothing else**; role `witness`; its answer is typed `unknown` and
  parsed by the pipeline. **The witness question and answer shape are fixed inside the adapter**, so there is no field a
  brief could be written into (D-042, I-8).
- **`compare`** — two pictures, the names of the subjects they share, temperature 0; role `judge`; the closed question
  fixed inside the adapter. It is Gate 1S's adjudication (D-049) and **records no observation**, so the one record of
  what a picture shows is still its one `observe` (I-15). S-037 supersedes D-045's `Confirmed-by` on _"exactly one
  vision call … per generated image"_: exactly one `observe` receipt per picture.

**`ModelReceipt`** gains **`call`** (`structured`, `observe`, `compare`) and **`pictureIds`**. **An observation is tied
to its receipt by key, not by a stored receipt id**: the one `observe` receipt whose `pictureIds` is that picture's; a
reconciliation, the one `reconciler` receipt whose `pictureIds` is that picture's. Picture ids never repeat, so each
key names one receipt. Model ids per role are settings: `MiniMax-M3` for `witness`, `judge` and `reconciler` (D-006).

**Review 4's finding that the witness could be sighted through `structured`** is closed by three things together: the
type — `structured` has no picture field and its role cannot be `witness`; the stand-in — it records every `observe`
call as made, and a check asserts **every one holds only a picture of that run and a temperature** (a spread manifest
fails it); and the record — **every observation has its `observe` receipt**.

**`ImagePort`** — `generate({ runId, pictureId, prompt, references, aspectRatio: '9:16' })` answers **`made`**, with the
picture and an `ImageReceipt` (model, `costCents`, `fake`), or **`refused`**, with a limit and an estimate — which only
the worker's guard answers. It declares **`acceptsReferences`**; **a worker handed one that does not refuses to start**
(D-026).

**`PictureSensorPort`** (S-038) — the pixel work `pipeline-no-io` forbids inside the pipeline, behind a port:
**`measure`** (readable, width, height, sharpness, brightness — D-031's "exposure", renamed by
**S-050**), **`readText`**, **`similarity`**. Review 4 found these
had no port; this is it.

**`StillsRecorder`** — `record(picture: PictureRecord)`: the stage's one way to make its progress durable, handed to it
like every port. The worker's recorder upserts the picture's row.

**The stand-ins** (`packages/providers/src/fake/`), each answering from a script a test supplies and holding no durable
state:

- **image** — writes the PNG; scripted per picture label and shot to write a wrong size or unreadable bytes, to cost
  some cents, or to throw. `fake: true`. `acceptsReferences: true`, or `false` when told.
- **sensors** — **`measure` reads the real file** — its PNG signature and header — for readable, width and height;
  sharpness, brightness, words and similarity come from the script, with defaults 1, 1, none and 1; any method can be
  scripted to throw.
- **model** — `structured` as `reel-plan` built it, its received calls kept where `reel-plan`'s tests read them;
  `observe` and `compare` answered from the script and **kept in their own lists**, exactly as made; receipts
  `fake: true`, zero usage.

### Storage (D-001, D-002, D-005, D-028, D-081, I-4, I-6)

One migration adds:

- `picture` — run id, picture id, **`seq`** — the run's image-call number, 1 to 6, taken from the run's receipts in
  the transaction that writes the row — job attempt, shot unit, subject id, role `canonical` or `derived`, label, path,
  prompt, framing or none, reference picture ids, the measure, the words read, the Gate 1 verdict with its coverage,
  outcome or none, step outcomes and reasons, the score with its terms and weights or none, the Gate 1S verdict with its
  coverage, suspicion, answer and reasons or none, the degradation reason or none, chosen. Primary key run id and picture
  id;
- `observation` — id `obs-<pictureId>`, run id, picture id, the observation;
- `reconciliation` — id `rec-<pictureId>`, run id, picture id, the answer and the failure reasons;
- `generation_receipt` — id, run id, picture id, model, prompt, reference picture ids, style id and version (D-069),
  **rate applied** (D-028), cost cents, `fake`, degraded, time;
- `degradation` — run id, shot id, gate, reason — **its own table, so "every run with a degraded shot" is a query**
  (I-4, D-025);
- `model_receipt` gains `call` and `picture_ids`.

**The record route** reads `picture`, `observation`, `reconciliation` and `degradation`: one entry per picture made,
every attempt, **in `seq` order**; `observationId` and `reconciliationId` the ids of its `observation` and
`reconciliation` rows, where they exist; `checks` for each completed gate `'1'` step and for gate `'1S'`.

### The boundary rules (S-038)

**One rule added, `worker-no-providers`**: nothing under `apps/worker` imports `packages/providers`. S-021 recorded this
as uncaught; with an image port in reach, a worker constructing an adapter is how a run would come to spend. It gets a
`drift:prove` case by path and by package name; seventeen rules become **eighteen**, and `CLAUDE.md`'s count follows.

**No folder rule names `stills/`**, so `drift --audit` is unaffected. **What the rules do not catch, stated:** a value
passed as an argument — a brief handed to `observe` in a spread object compiles against a variable. That is what the
stand-in's list of `observe` calls is for (above).

### What this feature changes in verified features (S-047)

- **`reel-contract`**: its schema's `Criterion.type` (S-034), and its rule _"`estimateCents` is the figure that was
  compared with the limit: the chosen plan's estimate"_, which for a `stills` refusal is the pictures' figure (S-030).
  Its fixtures gain a type. **Its gates are not edited**; its file gains a note naming S-030 and S-034.
- **`reel-plan`**: its check 10 — _"until 'stills' or 'video' is refused"_ — narrows to `video`, since D-108 scoped the
  stills refusal to _"a `reel-plan` build"_; its check 29, `GATE_ORDER` equal to `['0']`, becomes `['0', '1', '1S']`, as
  its Gate 2 said (_"`reel-stills` appends its gates"_); every test that sends `until: 'stills'` to be refused sends
  `video`; its fixtures gain a type. Its Gate 1 and Outcome say pictures are "not built yet"; **its file gains a note
  naming S-047**. **No assertion is removed.**
- **Code and test support that must follow the ports**, none of it an assertion: `recording-port.ts` records `observe`
  and `compare`; `tests/engine/worker-process.ts` and `harness.ts` build ports with `observe`, `compare`, an image
  stand-in and a sensor stand-in; `DEFAULT_PLAN_SETTINGS.models` names `witness` and `judge`.

Each is made in the slice that forces it.

## Gate 3 — Program design

**File locations**, in the engine repository.

- `packages/reel-contract/src/request.ts` — `Criterion.type`; `mustNotShow` presence only.
- `packages/contracts/src/picture.ts` — `PictureRef`, `ImageRequest`, `ImageReceipt`, `ImageAnswer`, `ImagePort`,
  `PictureMeasure`, `PictureSensorPort`, `Framing`, `WitnessObservation`, `Reconciliation`, `KeyframeTerm`,
  `KeyframeScore`, `PictureRecord`, `StillsRecorder`.
- `packages/contracts/src/model.ts` — `ModelRole`, `ModelCall`, `ModelReceipt`, `LanguageModelPort` with `observe` and
  `compare`.
- `packages/contracts/src/settings.ts` — `StillsSettings`; `PlanSettings.models` over the four roles.
- `packages/pipeline/src/admit.ts` — `admitPictures`.
- `packages/pipeline/src/stills/index.ts` — `makeStills`; `stills/place.ts` — S-039, `placePictures` exported from the
  package's index for the worker; `stills/criteria.ts` — S-040;
  `stills/prompts.ts` — the image prompts, the canonical entry's schema, the reconcile and compare prompts and answer
  schemas; `stills/observation.ts` — the observation schema; `stills/score.ts` — the keyframe score; `stills/ladder.ts`
  — the reserve.
- `packages/pipeline/src/gates/index.ts` — `GATE_ORDER`; `gates/gate1.ts` — Gate 1; `gates/gate1s.ts` — Gate 1S.
- `packages/providers/src/fake/image.ts` — the image stand-in and `DEFAULT_ARTIFACT_ROOT`; `fake/sensors.ts`;
  `fake/model.ts` — `observe` and `compare` added.
- `packages/domain/src/schema.ts` and `db/migrations/0001_*` — the tables; `ledger.ts` — `spentCents`,
  `imageCallCount`, `recordGeneration`; `pictures.ts` — `upsertPicture`, `readRecord`; `runs.ts` — `admitStills`,
  `startStage`, `finishStills`, `readSelectedPlan`.
- `apps/api/src/server.ts` — `stills` accepted; the record route.
- `apps/worker/src/plan-job.ts` — admission; `keyframes-job.ts` — the runner; `guarded-image-port.ts`;
  `recorder.ts`; `recording-port.ts` — `observe` and `compare`; `questions.ts` — the stop entry; `worker.ts` — `image`,
  `sensors` and `stillsSettings` options, both job kinds.
- `.dependency-cruiser.cjs` and `scripts/drift.mjs` — `worker-no-providers` and its `--prove` cases.
- `tests/reel-stills-*.test.ts` — the journey's tests (S-016).

**Signatures.**

```ts
// packages/reel-contract/src/request.ts — S-029, S-034 (version 1)
export const Criterion = z.strictObject({
  id: z.string().min(1),
  text: z.string().min(1),
  type: z.enum(['presence', 'event']),
  claimId: ClaimId.optional(),
})
// Criteria.mustNotShow: every criterion's type is 'presence' (D-043)

// packages/contracts/src/picture.ts
import type { RunResult } from '@cutroom/reel-contract'
export interface PictureRef {
  pictureId: string // a<attempt>-shot-<unit>-<label>
  path: string // absolute, under the artifact root (D-086)
}
export interface ImageRequest {
  runId: string
  pictureId: string
  prompt: string
  references: readonly PictureRef[] // the chosen canonical, or none (D-026, D-038)
  aspectRatio: '9:16'
}
export interface ImageReceipt {
  model: string
  costCents: number // 0 from the stand-in unless scripted (S-036)
  fake: boolean
}
export type ImageAnswer =
  | { kind: 'made'; picture: PictureRef; receipt: ImageReceipt }
  | {
      kind: 'refused' // only the worker's guard refuses (S-035)
      limit: Extract<RunResult, { reason: 'budget' }>['limit']
      estimateCents: number
    }
export interface ImagePort {
  readonly acceptsReferences: boolean // D-026
  generate(request: ImageRequest): Promise<ImageAnswer>
}
export interface PictureMeasure {
  readable: boolean
  width: number
  height: number
  sharpness: number // 0..1
  brightness: number // 0..1 — D-031's "exposure" (S-050)
}
export interface PictureSensorPort {
  measure(picture: PictureRef): Promise<PictureMeasure>
  readText(picture: PictureRef): Promise<string[]>
  similarity(a: PictureRef, b: PictureRef): Promise<number> // cosine, -1..1
}
export type Framing = 'closeUp' | 'medium' | 'wide' | 'extremeWide'
export interface WitnessObservation {
  // D-041 as amended by D-044; no temporal block on a still
  entities: Array<{
    label: string
    count: number
    position: 'left' | 'centre' | 'right'
    prominence: 'foreground' | 'midground' | 'background'
    faceVisible: 'yes' | 'partial' | 'no' | 'noFace'
    occluded: boolean
    clippedByEdge: boolean
  }>
  framing: Framing
  setting: string
  lighting: 'bright' | 'dim' | 'mixed' | 'silhouette'
  readableTextPresent: boolean
  ambiguities: string[]
  unsafeDepictions: string[]
}
export interface Reconciliation {
  subjects: Array<{ id: string; entity: number | null; countMatches: boolean }>
  criteria: Array<{ id: string; shown: boolean; entity: number | null }>
  failed: string[] // computed by code (S-040)
}
export type KeyframeTerm = 'faceVisible' | 'unoccluded' | 'prominence' | 'sharpness' | 'brightness'
export interface KeyframeScore {
  terms: Record<KeyframeTerm, number> // each in (0, 1]
  weights: Record<KeyframeTerm, number> // as used, after defaults (D-031 rule 5)
  total: number // finite, > 0 (D-046)
}
type Outcome = 'accept' | 'fail'
export interface PictureRecord {
  pictureId: string
  attempt: number // the keyframes job's attempt
  shotUnit: number
  subjectId: string
  role: 'canonical' | 'derived'
  label: string
  path: string
  prompt: string
  framing: Framing | null
  references: string[]
  seq: number // the run's image-call number, 1..6 (S-046)
  gate1: {
    outcome: Outcome | null // null until technical fails or reconcile completes (D-041, D-042)
    coverage: 'whole picture' // I-6
    steps: Array<{
      step: 'technical' | 'text' | 'witness' | 'reconcile'
      outcome: Outcome
      reasons: string[]
    }>
  } | null
  measure: PictureMeasure | null
  text: string[] | null
  observation: WitnessObservation | null
  reconciliation: Reconciliation | null
  score: KeyframeScore | null
  gate1s: {
    outcome: Outcome
    coverage: 'pair' // I-6
    compared: boolean
    suspicion: number | null
    answer: Array<{ subject: string; same: 'yes' | 'no' }> | null
    reasons: string[] // the shared subjects answered no
  } | null
  degradation: string | null // on the shot's last failing picture (I-4)
  chosen: boolean
}
export interface StillsRecorder {
  record(picture: PictureRecord): Promise<void> // upsert, after every change (S-046)
}

// packages/contracts/src/model.ts — S-037
export type ModelRole = 'planner' | 'reconciler' | 'witness' | 'judge'
export type ModelCall = 'structured' | 'observe' | 'compare'
export interface ModelReceipt {
  model: string
  role: ModelRole
  call: ModelCall
  temperature: number
  usage: { inputTokens: number; outputTokens: number }
  fake: boolean
  pictureIds: readonly string[]
}
export interface LanguageModelPort {
  structured<T>(call: {
    prompt: string
    schema: z.ZodType<T>
    role: 'planner' | 'reconciler'
    temperature: 0
    pictureIds?: readonly string[] // ids for the receipt; never a picture
  }): Promise<{ value: T; receipt: ModelReceipt }>
  observe(call: {
    picture: PictureRef
    temperature: 0
  }): Promise<{ value: unknown; receipt: ModelReceipt }>
  compare(call: {
    pictures: readonly [PictureRef, PictureRef] // the canonical, then the derived picture
    subjects: readonly string[] // the names of the subjects both shots show
    temperature: 0
  }): Promise<{ value: unknown; receipt: ModelReceipt }>
}

// packages/contracts/src/settings.ts
export interface StillsSettings {
  canonicalFraming: readonly [Framing, Framing] // D-032, default ['medium', 'wide']; equal values refused
  scoreWeights: Record<KeyframeTerm, number> // D-031, provisional; default 2, 2, 2, 1, 1
  suspicionThreshold: number // D-049, provisional; default 0.25
}

// packages/pipeline/src/admit.ts — S-030, S-035
export function admitPictures(
  plan: Pick<Plan, 'plannedImageCalls'>,
  budgetCents: number,
  s: Pick<PlanSettings, 'imageRateCents'>,
): { admitted: boolean; picturesCents: number }

// packages/pipeline/src/stills/place.ts — S-039
export interface Placement {
  subjectId: string
  shotUnit: number
  role: 'canonical' | 'derived'
}
export function placePictures(plan: Pick<Plan, 'shots' | 'subjects'>): Placement[]

// packages/pipeline/src/stills/criteria.ts — S-040
export function criteriaFor(
  shotUnit: number,
  plan: Pick<Plan, 'units'>,
  request: SubmitRequest,
): { mustShow: Criterion[]; mustNotShow: Criterion[] } // presence only

// packages/pipeline/src/stills/score.ts — S-044; no throw
export function keyframeScore(
  entity: WitnessObservation['entities'][number],
  measure: PictureMeasure,
  weights: Record<string, number>,
): KeyframeScore

// packages/pipeline/src/gates/
export const GATE_ORDER = ['0', '1', '1S'] as const

// packages/pipeline/src/stills/index.ts — S-046
type Verdict = Extract<RunEvent, { type: 'verdict' }>
type Degraded = Extract<RunEvent, { type: 'degraded' }>
export type StillsEvent =
  | Pick<Verdict, 'type' | 'gate' | 'outcome' | 'shotId'>
  | Pick<Degraded, 'type' | 'shotId' | 'reason'>
export interface StillsRecord {
  pictures: PictureRecord[] // this attempt's, in the order made
  degradations: Array<{ shotId: string; gate: '1' | '1S'; reason: string }>
  events: StillsEvent[] // in the order the checks ran
}
export type StillsOutcome = StillsRecord &
  (
    | { kind: 'completed' }
    | { kind: 'stopped-rule'; rule: 'gate-1'; detail: string }
    | ({ kind: 'stopped-budget' } & Pick<
        Extract<ImageAnswer, { kind: 'refused' }>,
        'limit' | 'estimateCents'
      >)
    | { kind: 'failed'; detail: string }
  )
export function makeStills(
  input: {
    runId: string
    attempt: number
    earlierImageCalls: number // imageCallCount before this attempt (S-048)
    request: SubmitRequest
    plan: Plan
  },
  ports: {
    image: ImagePort
    model: LanguageModelPort
    sensors: PictureSensorPort
    recorder: StillsRecorder
  },
  settings: { plan: PlanSettings; stills: StillsSettings },
): Promise<StillsOutcome> // never rejects

// packages/domain/src/ledger.ts — D-027, D-081, S-036
export function spentCents(db: Db, correlationId: string): number // SUM(cost_cents) over the chain
export function imageCallCount(db: Db, runId: string): number // generation_receipt rows, every attempt; read at attempt start
export function recordGeneration(
  db: Db,
  entry: {
    jobId: number
    runId: string
    picture: PictureRecord
    rateCents: number
    style: { id: string; version: number }
    receipt: ImageReceipt
  },
): void // the receipt, the job row's cost and the picture's row, in one transaction

// packages/providers/src/fake/image.ts
export const DEFAULT_ARTIFACT_ROOT: string // .artifacts/ at the repository root (D-086)
export function fakeImage(
  script: FakeImageScript,
  options?: { artifactRoot?: string; acceptsReferences?: boolean },
): ImagePort & { readonly calls: readonly ImageRequest[] }

// apps/worker/src/worker.ts — S-021, S-038
export interface WorkerOptions {
  // … as reel-plan built it, and, required from Slice 3:
  image: ImagePort
  sensors: PictureSensorPort
  stillsSettings?: StillsSettings
}
```

A `stopped-budget` outcome carries the guard's limit and estimate, typed from `ImageAnswer`, which types them from the
contract's `RunResult` — no budget type is declared outside `@cutroom/reel-contract` (D-094); the worker adds the
ceiling and the cap it read. The worker builds its guarded image port per job, knowing the placement and the attempt,
so the picture row it writes with each receipt carries the shot, subject, role and label.

**Checks, written before the code.** One journey, `reel-stills` (D-020), counting `tests/reel-stills-*.test.ts`
(S-016). **Each check is owned by the slice that produces it** (Gate 4). Every test that starts the service points its
database, questions file and artifact root at a temporary folder, but check 17's second half.

_The contract, the ports and the rules_

1. `a criterion without type fails validation, a mustNotShow criterion typed event fails validation, mustShow accepts presence and event, and CONTRACT_VERSION is still 1` — S-029, D-043, S-034.
2. `compiled by TypeScript in the test: a picture passed to structured, role witness on structured, and a prompt, schema or criterion passed to observe or compare are each a type error, while the calls as Gate 3 writes them compile` — I-8, D-042, S-037.
3. `worker-no-providers fires in drift:prove on an import by path and by package name, and drift, drift:prove and drift --audit pass` — S-021, S-038.
4. `every model_receipt names its call and role: every observe receipt is role witness, every compare receipt role judge, and no structured receipt is role witness` — D-006, D-064, D-084, S-037.
5. `GATE_ORDER equals ['0', '1', '1S'], asserted as data` — D-063, D-049, I-7.
6. `the observation schema requires clippedByEdge on every entity and refuses actions or eventOrder on a still's observation` — D-041, D-044.
7. `a canonical entry without a declared axis fails validation` — D-032.

_Asking for pictures_

8. `a submit with until 'stills' is accepted; one with until 'video' is refused 422 'unsupported' with no runId` — D-108, S-047.
9. `a stills run whose chosen plan's pictures cost more than its ceiling finishes refused for budget with limit 'ceiling', the pictures' figure as estimateCents, the ceiling and the cap; its events end stage.finished for plan, run.finished, with no stills event; it writes no question and leaves one job row` — S-030, D-083, D-100, S-046.
10. `a stills run whose pictures fit its ceiling while its whole estimate does not is admitted, with a second job row of kind reel.keyframes, the run's correlation_id and the plan job as parent; a ceiling of exactly planned calls × rate is admitted and one cent less is refused` — S-030, S-035, D-081, D-083.
11. `a stills run in which no plan is selected — every plan over the per-reel cap, a gate-0 stop, a split stop — ends as reel-plan's run does, with S-025's events and, for the cap, one question, and has no reel.keyframes row` — D-083, S-025, S-026.

_Where pictures go, and the files_

12. `a cancel that lands between the plan job and the keyframes job finishes the run cancelled, costCents 0, with no stage.started for stills and no image call` — the contract's rule, S-027.
13. `a completed stills run approves a picture on rank 1's first shot and on each of ranks 2 and 3's earliest shot no higher rank holds; a rank whose every shot is held gets no call; no other shot has a picture` — D-027, D-029, S-039.
14. `every picture's shot is a shot of the selected plan that shows the picture's subject` — D-061, D-065, I-20.
15. `a stills run whose selected plan has no subject in two shots completes with no stills, no Gate 1 verdict and no image call` — D-029, S-039.
16. `each picture is a readable 9:16 PNG, under the artifact root in a folder for the run, at the absolute path its row records — for a chosen picture, the path the result gives — and its id carries the job's attempt` — D-086, D-087, S-046, the contract.
17. `the stand-in refuses a pictureId whose path would leave the root; and a run with the root unset writes its pictures under the repository's .artifacts/, which .gitignore names` — D-086.
18. `no file with an image extension is tracked by git, and none exists under tests/` — D-087.
19. `the canonical is made twice from prompts that differ in their framing line and in nothing else, recorded with the axis; each derived picture is made once with the chosen canonical as its only reference; the canonical is made with none` — D-030, D-032, D-038, D-026.
20. `every image prompt contains the style contract's text, and every generation_receipt records the style id and version, the model, the rate applied, the cost and fake` — D-069, D-028.
21. `a worker refuses to start when handed an image port that does not accept references, or two equal canonical framing values` — D-026, D-032.

_Gate 1_

22. `every picture's Gate 1 checks are technical, text, witness and reconcile, in that order, each with an outcome; every Gate 1 verdict records coverage whole picture and every Gate 1S verdict coverage pair` — D-042, S-031, I-6, I-7.
23. `a picture that is not a readable 9:16 image — a wrong size, and unreadable bytes, each built — fails technical and has no other step, no observe or reconcile call, and no observation or reconciliation id` — S-031, I-17.
24. `the text step records every word the sensor read, and its outcome is accept when words were read` — S-041.
25. `every picture past technical has exactly one observe receipt with its id, at temperature 0, and an observation, when its verdict is accept and when it is fail; every reconciliation has exactly one reconciler receipt with its picture's id` — D-041, D-045, I-15, S-037.
26. `every observe call the stand-in received holds only the temperature and a picture whose id and path are a picture of that run` — I-8, D-042, S-037.
27. `reconcile is one structured call per picture past technical, role reconciler, temperature 0, given every subject the shot shows and the criteria S-040 assigns, never an event criterion; and its prompt states that a count is matched against the number a name states, or one for a singular name and two or more for a plural one — a prompt stating one when the name states no number fails` — D-042, D-043, S-040.
28. `a mustShow presence criterion is given to the pictures of shots whose sentences carry its claim and to no other, every mustNotShow to every picture, and a mustShow with no claim to none` — S-040.
29. `a picture fails reconcile, and keeps its observation and reconciliation, for each of: a shot subject not shown, a shown subject clipped by the edge, a shown subject whose count does not match, a mustShow not shown, a mustNotShow shown — each built alone` — D-042, D-044, D-046, S-031, S-040.

_Choosing the main picture_

30. `with both candidates past Gate 1 the higher score is chosen and a tie goes to a; both keep their terms, weights and totals; a candidate failing Gate 1 has no score; a sole survivor is chosen with none` — D-031, D-042, D-046.
31. `the keyframe score returns a finite number above 0 for every combination of entity answers and measures, and for missing, zero, negative, NaN, infinite and huge weights, and its file holds no throw` — D-046, I-16, S-044.
32. `scoring a run's recorded terms with its recorded weights reproduces its recorded totals and winner, and changing a weight changes the winner on a fixture whose terms differ` — D-031, D-045.

_Gate 1S, and a completed run_

33. `Gate 1S runs on every run with a derived picture past Gate 1 and on no other; a pair sharing no subject, and a pair at or below the threshold, is accepted with no call; above it one compare call, role judge, temperature 0, given the two pictures and the shared subjects' names, decides; no Gate 1S fail exists without that call's receipt; its answer's reasons are the subjects answered no` — D-049, I-16, S-045.
34. `the result's stills are exactly the pictures the record marks chosen, with the same pictureIds and shots, and estimateCents the selected plan's; every body on every route of a stills run parses under its contract schema` — the contract, D-098.
35. `with the stand-in's default script every generation_receipt and job row costs 0, and a completed run's costCents is 0` — S-036, Gate 1.

_The ladders_

36. `when both canonical candidates fail Gate 1 — including a pair that both show a clipped subject — one repair call is made, its prompt carrying both verdicts' reasons; a repair that passes is chosen without a score and derived pictures follow` — D-047, D-046.
37. `a repair that fails too finishes the run stopped for a rule, gate-1 at the stills step, with three image receipts, no derived call, three Gate 1 verdicts, three pictures in the record, no stage.finished for stills, no planner receipt after the plan stage's and one reel.plan job` — D-047, D-065, S-046.
38. `a derived picture failing Gate 1 takes one repair, its prompt carrying the verdict's reasons, when any reserve slot is free; with none free, or when the repair fails Gate 1, its shot has no picture and is labelled in four places — a degradation row, its last verdict, its generation receipts and a degraded event — and the run completes` — S-043, I-4, D-025.
39. `a derived picture failing Gate 1S takes one repair when a slot is free, its prompt carrying the shared subjects answered no; the repair goes through Gate 1 then Gate 1S; a repair that fails Gate 1S is repaired again, as repair-2, while a slot is free; on a plan of 3, a shot whose repair-2 fails Gate 1S is degraded with a slot still free; with no slot free, its shot is degraded and labelled in the same four places, no picture of it is chosen or in the stills, and the run completes` — D-050, D-014, S-043, S-045, I-4.
40. `on a script where both canonical candidates fail and its repair passes, rank 2's picture fails Gate 1 and passes its repair, and rank 3's fails Gate 1S: the reserve of 2 goes to the canonical and to rank 2, rank 3's shot is degraded, and the run makes exactly 6 image calls and plans 4` — D-027, D-048, S-032, S-043.
41. `each stills ending's events are exactly those S-046 lists, in the order the checks ran` — S-046.

_Spending while pictures are made, and faults_

42. `spentCents sums cost_cents over every job row with the correlation_id and over no other, and the guard compares spent plus the rate with the cap, then the ceiling, before every image call` — D-081, S-035, S-036.
43. `a picture scripted to cost more than the rate stops the run for budget before the next call, with limit ceiling, estimateCents the spend plus the rate, the ceiling, the cap, costCents the spend, and every picture made so far in the record with the checks it reached; no question is written` — S-035, S-036, D-100.
44. `a reserve call that would pass the ceiling is not made, and the run stops for budget` — S-035.
45. `a call that would pass the per-reel cap stops the run with limit reel and appends one question entry after the run is finished` — D-100, D-097, S-026, S-035.
46. `a witness answer that does not parse finishes the run failed with a detail, and that picture's record has technical and text checks only, no Gate 1 verdict outcome, no verdict event and no observation id` — D-041, D-042, S-042.
47. `a stand-in throwing on an image, observe, reconcile or compare call, or on measure, readText or similarity, and a compare answer that leaves out a shared subject, each finish the run failed with a detail; every receipt of a call that returned is kept, and every picture made before it is in the record with the checks it completed and, where its steps were cut off, no Gate 1 verdict outcome` — D-005, D-041, S-046, the contract's rule.

_Restart, and no secrets_

48. `after a worker is killed mid-stills and a new one started, the run completes; stage.started for stills appears once; the first attempt's pictures are in the record under attempt-1 ids with the checks they completed, no verdict outcome where one was cut off, and none chosen, and the record lists every picture in seq order, attempt 1's before attempt 2's; its receipts and cost are kept; and when the first attempt's scripted cost leaves the second attempt's next call above the ceiling, the run stops for budget` — S-027, D-002, S-036, S-046, S-048.
49. `after a first attempt killed having made 2 image calls of a plan of 4: the second attempt's reserve is 0, a derived picture failing Gate 1 is degraded and the run makes 6 calls in all; or, when both canonical candidates fail, the run finishes failed with 4 calls in all and no repair. After one killed having made 3, the run finishes failed before the second attempt makes any call; and a plan of 4 whose rank 3 has no free shot, restarted after 3 calls, fits and completes` — D-027, D-047, S-039, S-048.
50. `every other test of the journey passes in a child process whose environment holds only PATH and what the operating system needs to start Node` — Gate 1, S-028.

**The four least confident decisions.**

1. **Gate 1S compares whole pictures, not the shared subject** (S-045). A threshold that routes a pair to the judge —
   never fails one — is less sensitive over a whole frame. _Rejected:_ a detector port now — a second vision dependency
   for one input of one gate (C-12). **Named seam:** `similarity` is one port method.
2. **A picture must show every subject its shot shows** (S-040). A derived picture for rank 2 on a shot that also shows
   rank 1 fails if rank 1 is missing. _Rejected:_ only the picture's own subject — a shot's opening frame without a
   subject the plan put in it is a frame of a different shot.
3. **A subject's count is judged from its name** (S-040): the number it states, or singular one and plural two or
   more, decided by the reconciler. A collective name like _"a flock"_ or _"the committee"_ can be read either way —
   and the witness may count a flock as one entity — so a wrong reading fails a true picture, bounded by the repairs. _Rejected:_ a count field in the planning call — a change to `reel-plan`'s one
   call (D-035) for one veto; one when the name states none — fails every true picture of a plural subject.
4. **A stand-in picture costs 0 unless scripted** (S-036). Every budget path is tested with made-up costs, so nothing
   has proven the guard against a real invoice. _Rejected:_ charging the rate on every stand-in call — a result
   reporting spend that never happened.

## Gate 4 — Slices

- [x] **Slice 1 — the criterion's type, the ports, and one rule.** `Criterion.type` in the contract, a type on every
      fixture criterion in `reel-contract`'s and `reel-plan`'s tests, and the note in `reel-contract.md` (S-047);
      `picture.ts`, `model.ts` and `settings.ts` as Gate 3 writes them; the model stand-in's `observe` and `compare`
      answering from a script, kept in their own lists; `recording-port.ts` recording both; `DEFAULT_PLAN_SETTINGS.models`
      naming `witness` and `judge`; `tests/engine/worker-process.ts` building a port with all three calls;
      `worker-no-providers` with its `--prove` cases, and `CLAUDE.md`'s rule count. `reel-plan`'s behaviour is unchanged.
      **No `stills/` folder yet.**
      **Proves: 1, 2, 3.**
- [x] **Slice 2 — asking for pictures, and the chain.** `until: 'stills'` accepted, `reel-plan`'s check 10 and
      `reel-plan-run.test.ts` sending `video`, and the note in `reel-plan.md` (S-047); `admitPictures`; the refusal at
      the ceiling; `admitStills` and the `reel.keyframes` job row; the worker claiming both kinds; `startStage` for
      `stills` with the cancel flag. Pictures do not exist yet, so a started keyframes job finishes the run `failed` with
      the detail _"pictures are not built"_ — a contract-valid answer no check asserts, which Slice 3 replaces.
      **Proves: 8, 9, 10, 11.**
- [x] **Slice 3 — pictures, both gates, and a completed stills run.** The image and sensor stand-ins, required on the
      worker, and the harness passing them; the migration; placing pictures; the image prompts; Gate 1's four steps;
      the keyframe score and choosing the canonical; derived pictures; Gate 1S with its judge call; the guarded image
      port with its receipts, costs and picture rows (its refusals are Slice 4's); the recorder; the record
      route; `GATE_ORDER` and `reel-plan`'s check 29 (S-047). A run whose pictures all pass completes. Until Slice 4, a
      failure that needs a ladder finishes the run `failed` with the detail _"the ladder is not built"_, which no check
      asserts.
      **Proves: 4, 5, 6, 7, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35.**
- [x] **Slice 4 — the ladders, and every ending that is not a completed run.** The canonical repair and the rule stop;
      the reserve from the placement's calls, and the two-repair cap; derived repairs and degraded shots with their four
      labels; the Gate 1S repair; the
      guard's refusals, the budget stop and its question; a thrown call and a malformed answer.
      **Proves: 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47.**
- [x] **Slice 5 — restart, no secrets, and the journey.** A worker killed mid-stills; `imageCallCount` read at attempt
      start, a restarted attempt's reserve reduced by the calls before it, a restart that cannot fit its plan, and a
      restart whose canonical repair finds no slot. **Proves: 48, 49, 50, and re-runs 1–47.**

Every check appears in exactly one slice: 3 + 4 + 28 + 12 + 3 = 50.

## Outcome

- [ ] A request for pictures gets its approved pictures — one per shot the plan gives one — or a budget answer with its
      figures, or the rule and step that stopped it, from the real service, parsing under the contract
- [ ] Every picture made is in the record with each check it reached; the try not chosen is kept; every shot left
      without a picture is recorded with why
- [ ] The step that describes a picture is shown the picture and nothing else
- [ ] The whole journey passes with no secrets in its environment, and no connection to a paid service exists

## Evidence (newest first; appended by the journey, never typed by hand)

- 2026-09-28 journey=PASS at 860b7f7 — every check green; 63 tests in tests/reel-stills-*.test.ts pass
- 2026-09-24 journey=PASS at 3b3adab — every check green; 63 tests in tests/reel-stills-*.test.ts pass
- 2026-09-24 journey=PASS at d8e2b80 — every check green; 63 tests in tests/reel-stills-*.test.ts pass
- 2026-09-23 journey=PASS at 191a303 — every check green; 63 tests in tests/reel-stills-*.test.ts pass
- 2026-09-23 journey=PASS at ecdab8d — every check green; 63 tests in tests/reel-stills-*.test.ts pass
- 2026-09-22 journey=PASS at d72b117 — every check green; 63 tests in tests/reel-stills-*.test.ts pass
- 2026-09-22 journey=PASS at 322ac6a — every check green; 63 tests in tests/reel-stills-*.test.ts pass
- 2026-09-22 journey=PASS at 5b640dc — every check green; 63 tests in tests/reel-stills-*.test.ts pass
- 2026-09-20 journey=PASS at 29d8ff9 — every check green; 63 tests in tests/reel-stills-*.test.ts pass
- 2026-09-19 journey=PASS at e39734b — every check green; 63 tests in tests/reel-stills-*.test.ts pass
- 2026-09-16 journey=PASS at e42bc3f — every check green; 63 tests in tests/reel-stills-*.test.ts pass

## Divergence (the first broken boundary, or "none")

none

## Pending human decisions

**None blocking the gates.** The owner's answers are S-029 to S-033 and S-040 to S-043 (2026-09-15), and S-043's
reserve rule and S-048 (2026-09-16), which settled review 2's N3 and N2.

**Owed outside this repository:** `reel-script` emitting each criterion's type (S-029); deleting the two stubs in the
steering repository and bumping the pin (S-033).

### Deferred — cut on purpose, with where each goes

**To `reel-render`:**

1. **The refusing validator at the provider boundary** (D-071, I-19). Its two rules — D-008's negative audio block and
   `aspect_ratio: 9:16` on `text-to-video` — are both about video calls; built here it would refuse nothing.
2. **D-050 step 2's clip**: the `text-to-video` call for a degraded shot. This feature records the degradation.
3. **The clip prompt from Gate 1's observations** (D-033), and **Gate 5 checking every criterion** — including the
   ones S-040 gives no picture (D-043).

**To the paid-path feature:** the real image adapter (fal) and **the image-model registry with its admission gates**
(D-026's capability of a real entry, D-028) — with no real model to choose, a registry selects nothing, and the image
rate stays one setting, recorded on every receipt; the real `observe`, `compare` and `structured` adapter (D-005,
D-006); **O-4**, **M-1**, **Q9**.

**Chosen, not assigned:**

4. **A declared within-shot state change** — D-037's end-frame pin, D-048's fifth planned call and its reserve
   remainder, and D-049's exclusion of an FLF2V pair (S-032).
5. **Real picture sensors** — sharpness, brightness, words and similarity. Only `measure`'s readable, width and height
   read the file; the rest are scripted.
6. **The planning call's cinematic fields** — `camera` (D-033), framing, join mode (D-036), text and audio policies (I-9)
   — and the planner adding cinematic criteria (D-034). The call is unchanged from `reel-plan` (D-035).
7. **Reusing a picture down a branch lineage** (D-040) — Phase 2.
8. **D-024's take counters and D-025's ladder** — clips.

**Known limits of this feature, not assigned:**

9. **A restarted attempt pays again**, and its earlier image calls come out of its reserve; after three or more, a
   placement of four calls cannot be made again and the run fails (S-048).
10. **A rank whose every shot is held** was counted in the plan's estimate but makes no call, and is left out of the placement's calls (S-039).
11. **The score's terms and weights and Gate 1S's threshold are unmeasured** — provisional until M-1 (D-031, D-049).
12. **`reel-plan`'s known limits stand**: a global `fetch` in the pipeline; a lease that outlasts a live job; no attempt
    limit; S-019's brand-new-file migration race (S-027).
13. **A picture made in the moment between an image call returning and its transaction** — a crash there loses the
    receipt with the picture's row; the file stays.

## Gate review 1 — 2026-09-15, adversarial reviewer, evidence pack only

**Verdict: CHANGES REQUIRED on all four gates. Bars (a) and (d) fire; (b) and (c) do not.** Run on an evidence pack —
this file, both decision files, the invariants, `reel-engine`'s four reviews, both verified feature files and the real
engine code named in them — against four bars: contradicts a decision; spends; depends on an open question; buildable
with checks that can fail. No finding needed the owner.

**Twenty-seven findings, all fixed in this file the same day:**

1. **A restart broke _"one entry per picture made"_**: fixed picture ids meant a second attempt overwrote the first's
   files and reused its receipts' ids. Picture ids now carry the job's attempt; a picture's row is written with its
   receipt and updated through a recorder as each check completes (S-046); check 48 asserts the first attempt's
   pictures in the record.
2. **A Gate 1S repair could not be informed** — the Gate 1S verdict had no reasons, and no check read that repair's
   prompt. `gate1s` now holds the judge's answer and reasons; check 39 asserts the prompt carries them.
3. **The six-call ceiling could not fail** — _"every picture fails"_ stops at three calls — and the seventh-call fault
   had no mechanism or check. Check 40's script now reaches six; `imageCallCount` is named; check 49 forces a seventh.
4. **S-043 narrowed D-050 step 1 and broke D-027's check** without naming either. Gate 1S repairs now follow D-050
   step 1 as written; a Gate 1 repair of a derived picture may not take the last slot, which D-027 holds for a
   consistency repair; the owner quote is attributed only to the Gate 1 rule.
5. **S-045 replaced D-049's mechanism without naming it** — now superseded by name.
6. **S-037 rewrote D-045's `Confirmed-by` as a reading** — now superseded by name.
7. **An unplaceable rank was dropped silently**, against D-029 part 3 step 5 and D-030's check. S-039 now supersedes
   both for that case, by D-029 part 2's rule that no picture opens no shot, and says why it is not a degradation.
8. **Gate 1 put Gate 1S on the main picture**; it judges the pictures made from it, and only in doubt.
9. **Coverage had no field** — `coverage` is on both verdicts and check 22 asserts both.
10. **Nothing could fill a receipt id** on an observation or reconciliation, as `reel-plan`'s review N1 found for plan
    ids. Receipts are tied by key — call, role and picture id — and `structured` carries picture ids for its receipt;
    check 25.
11. **"Count matches" had nothing to match** — S-040 states the number the subject's name states, or one; check 27.
12. **Check 46's guard clause could not fail in a completing run** — check 48 adds a budget stop across attempts.
13. **Check 11 (cancel between jobs) sat in Slice 2**, which has no image call to count — now check 12, in Slice 3.
14. **Slices 1–3 forced edits to verified code and tests that nothing listed** — Gate 2 and S-047 list them; the
    stand-in keeps `observe` and `compare` calls in their own lists so `reel-plan`'s check 37 is untouched.
15. **The judge's answer had no shape**, and throwing `compare` or sensor calls had no check — an answer schema naming
    every shared subject; check 47 covers each call and a short answer.
16. **The event order with a Gate 1S repair was ambiguous** — S-046 and check 41: in the order the checks ran.
17. **No check covered a `stills` run ending at the plan stage** — check 11.
18. **A plan with no recurring subject was unspecified** — Gates 1 and 2 state it; check 15.
19. **Huge weights made the score infinite, and replay could not see a weight change** — the total is capped and the
    weights recorded; checks 31 and 32.
20. **Two equal framing values made the canonical's prompts identical** — refused at worker start; checks 19 and 21.
21. **D-081's comparison before each enqueue was declined without naming it** — S-035 supersedes it by name.
22. **The image receipt dropped D-028's rate applied** — a column; check 20.
23. **A degradation was not labelled on its verdict and receipts** (I-4, D-025) — four labels; checks 38 and 39.
24. **S-040 changed D-043's table while saying its _Chose_ stands** — the supersession now names the table row.
25. **Two verified files would describe what the build no longer does** — notes in `reel-contract.md` (S-030, S-034) and
    `reel-plan.md` (S-047).
26. **Under S-042 a picture reached the witness step with no observation id** — the step is recorded only when its
    answer parses; check 46.
27. **Check 36 left out D-065's _"no second plan attempt"_** — now check 37.

**Considered, not findings:** the placeholder endings of Slices 2 and 3 (`reel-plan`'s Slice 1 pattern); the reserve's
size for smaller plans; the global `fetch`; deferring the validator; D-050's own check contradicting itself for a Gate
1S failure; D-038's waves; S-034 amending version 1; the stand-in's zero cost.

## Gate review 2 — 2026-09-16, the same reviewer, checking round 1's fixes against the gates

**Verdict: CHANGES REQUIRED on all four gates. Gate 1 bar (a); Gates 2 and 3 bars (a) and (d); Gate 4 bar (d). Bars (b)
and (c) clean.** Of round 1's 27 findings, 23 fixed and 4 partly (1, 4, 10, 26); none unfixed. Nine new defects, all
introduced by the revision. **Not yet fixed: two need the owner**, asked on 2026-09-16; the owner asked to clarify the
questions before answering.

**Needs the owner:**

- **N3 — the held reserve slot narrows the owner's answer.** S-043 holds the last slot for a Gate 1S repair, reading _"a
  free slot"_ through D-027's allocation, and Gate 2 still attributes that rule to the owner. It is held even when no
  Gate 1S repair is possible. Either the owner's literal answer supersedes D-027's allocation and its check _"a 6th
  remains available to a consistency repair"_, or the owner chooses the hold.
- **N2 — a restart's reserve ignores the calls the guard counts**, so a restarted attempt can ask for a seventh call
  and fail a run the ladder says completes (against S-043, D-050 step 3 and the contract's _"failed is only for
  faults"_); and re-making the canonical pair breaks D-047's _"No run produces four image calls against one canonical
  entry"_ and D-030's one-call check. The arithmetic is the author's; **whether a crash may pay twice** is the owner's.

**Author-fixable, not yet fixed:**

- **N1** — a Gate 1 verdict with unfinished steps reads `accept`, against D-041's _"Every Gate 1 verdict with outcome:
  'accept' carries a non-empty evidence.observation"_ and D-042's four step outcomes.
- **N4** — Gate 1's _"one more try … or that try fails too, that shot goes on without a picture"_ disagrees with Gate 2's
  repeated Gate 1S repairs and its held slot.
- **N5** — repeated Gate 1S repairs have no check, no label past `repair-2`, and no word on D-014's _"retries ≤ 2 per
  shot"_ or D-024's keyframe counter.
- **N6** — the worker needs `placePictures` to write a picture's row, but only three pipeline calls are declared.
- **N7** — the record route's `observationId`, `reconciliationId` and _"in the order made"_ have no stated source.
- **N8** — _"one when it states none"_ fails every true picture of a plural subject, the doom loop D-043 exists against.
- **N9** — check 16's _"the path the result gives"_ is vacuous for pictures not chosen.

**Fixed the same day, after the owner's answers of 2026-09-16:**

- **N3** — the owner chose **any free slot**: no slot is held; S-043 supersedes D-027's allocation and its _"a 6th
  remains available to a consistency repair"_ by name; check 40's script now spends the reserve on the canonical and a
  Gate 1 repair and degrades a Gate 1S failure.
- **N2** — the owner chose **start over and pay again** (S-048): an attempt's reserve is 6 less the run's earlier image
  calls less the planned calls; a restart that cannot fit its plan fails before any call; the guard no longer counts
  calls; S-048 supersedes D-047's and D-030's one-call checks for a restarted attempt; check 49.
- **N1** — a Gate 1 verdict has no outcome until technical fails or reconcile completes; checks 46, 47 and 48 assert no
  outcome for a cut-off picture.
- **N4** — Gate 1's failure paragraph now describes Gate 2's ladder, and the restart.
- **N5** — labels `repair-<n>`; check 39 asserts a second Gate 1S repair; Gate 2 and S-043 state the reserve as the only
  bound on one shot's tries, against D-014 and D-024.
- **N6** — the worker calls `placePictures`, exported.
- **N7** — `seq` on `picture`; observation and reconciliation ids `obs-` and `rec-` with the picture id.
- **N8** — a count matches the number the name states, or one for a singular name and two or more for a plural; check 29
  passes a plural subject; least confident 3.
- **N9** — check 16 reads the path from the picture's row, and from the result for a chosen picture.

## Gate review 3 — 2026-09-16, the same reviewer, after the owner's answers

**Verdict: CHANGES REQUIRED on all four gates. Gates 1–3 bars (a) and (d); Gate 4 bar (d). Bars (b) and (c) clean.**
N1–N9 and round 1's partly fixed 1, 4, 10 and 26 all verified fixed against the gate text — including check 40's and
check 49's arithmetic, each shown able to fail. Seven new defects; none needed the owner.

**Seven findings, all fixed in this file the same day:**

- **R1 — a restart with no reserve could still repair the canonical**, and the derived pictures after it made a
  seventh call. A canonical repair now needs a free slot; with none — only a restart — the run fails before the call
  (S-048); Gate 1 says so; check 49 builds it: four calls, failed.
- **R2 — the plural count rule had no check that could fail, and its example contradicted it** (_"a flock"_ is a
  singular name). Check 27 asserts the prompt carries the rule in its words, so the rejected rule's prompt fails; the
  example is _"the barons"_; a collective name is least confident 3.
- **R3 — D-024's _"unconditional, not retries"_ was quoted to allow uncapped repairs**, against its sense and D-014's
  _"retries ≤ 2 per shot"_. A shot now takes at most two repairs; check 39 builds the cap on a plan of three.
- **R4 — Gate 4 still named the held slot and a guard call count** — Slices 3, 4 and 5 rewritten.
- **R5 — S-048 superseded too little for a restart** — it now also names D-047's _"exactly three image receipts"_ and
  D-065's _"terminates with three image calls"_.
- **R6 — a restart that fits within six calls could fail**, since the reserve counted a planned call for a rank with no
  free shot. The reserve now comes from the placement's calls; check 49 builds a restart that fits for that reason.
- **R7 — the record's `seq` order had no check** — check 48 asserts it across attempts.

## Gate review 4 — 2026-09-16, the same reviewer

**Verdict: Gates 1, 3 and 4 APPROVED; Gate 2 CHANGES REQUIRED, bars (a) and (d). Bars (b) and (c) clean.** R1–R7 all
verified fixed against the gate text, and checks 39 and 49 shown able to fail case by case. Five new defects, four
touching Gate 2 and one in `DECISIONS.md` only; none needed the owner. The reviewer's condition: Gates 3 and 4 stay
approved only if T2 is fixed by naming supersessions, not by changing the reserve formula.

**Five findings, all fixed the same day, T2 by supersession:**

- **T1 — the two-repair cap narrowed D-050 step 1 without naming it** — S-043 supersedes it for a shot that has had two
  repairs, by D-014; Gate 2 says so.
- **T2 — the reserve from the placement's calls gave a four-call plan with a rank left out three slots**, against
  D-027's _"Two of the six … held as reserve"_ and D-029 part 3 step 7 — S-043 supersedes both for that case; Gate 2
  says so. The formula is unchanged.
- **T3 — two sentences still described the old reserve**, and a stray comma — "a placement of four calls" in Gate 2 and
  known limit 9.
- **T4 — failing a restart before the canonical's repair skipped D-047 step 1 without naming it** — S-048 supersedes it
  for that attempt; Gate 2 says so.
- **T5 — S-048's owner confirmation covered the author's later additions** — its `Confirmed-by` is scoped to what the
  owner answered, and S-043's likewise.

## Gate review 5 — 2026-09-16, final confirmation

**Verdict: APPROVED on all four gates. No bar fires.** The reviewer confirmed T1–T5 fixed against the gate text and
`DECISIONS.md`; checked every new quotation character for character against the steering repository's decisions
(D-014, D-024, D-027 twice, D-029 part 3 step 7, D-030, D-047 three times, D-050 step 1, D-065); confirmed Gates 1, 3 and
4 unchanged by the round and uncontradicted by it; and found no new defect. **The reviewer wrote the `Gates:` line
itself**, as the one edit it was allowed.

**Considered, not findings:** _"With a placement of four calls the reserve is two"_ holds for a first attempt, and the
formula two paragraphs above governs a restart; S-048 argues the rule-stop alternative in its _Why_ rather than its
_Rejected_; _"S-043's reserve rule"_ in Pending is settled by S-043's scoped `Confirmed-by`.

**Findings by round: 27, 9, 7, 5, 0.**
