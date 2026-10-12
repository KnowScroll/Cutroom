---
status: current
authority: a measurement of what the engine produced in its first 52 runs, read from data/cutroom.sqlite — not a plan; nothing here binds
---

# Yield baseline — what the engine produced in its first 52 runs

The owner asked in session 82 (2026-10-12) for the numbers from the start: what fails, what fails most, and what
fails inside each of those. This file is that measurement, and it is **the number later fixes are compared against**.
It was read, read-only, from `data/cutroom.sqlite` over **all 52 runs** (2026-09-21 to 2026-09-26).

Nothing here is a plan. A fix to the engine is a feature with its gates; a choice is an `S-` entry in `DECISIONS.md`.

**Two files already hold neighbouring records, and this one does not repeat them.** `docs/research/refusals.md` is
the ledger of every individual refusal with its verbatim reason. `docs/reel-pitfalls.md` is what each pitfall was and
what was done about it. This file is rates, where runs die, and the causes found in the code rather than in the rows.

## The headline

**8 of 52 runs produced a reel — 15.4%.** 17 stopped, 27 failed.

Every run is a real run. The three with no receipt at all died before one could be written: a 401, a 402, and a
planner answer of the wrong shape.

## What each gate refused

| gate                 | judged | refused | rate                |
| -------------------- | -----: | ------: | ------------------- |
| 0 — the plan         |     86 |       0 | 0%                  |
| 1 — each picture     |    127 |      67 | **53%**             |
| 1S — set consistency |      8 |       0 | 0%                  |
| 2 — take, technical  |    118 |       3 | 3%                  |
| 3 — take, sound      |    115 |       0 | 0%                  |
| 4 — take, witness    |    113 |       0 | 0% — it cannot fail |
| 5 — take, the brief  |    112 |      29 | **26%**             |
| 7 — the finished cut |     12 |       4 | **33%**             |

132 picture rows exist; 127 reached a decided Gate 1 outcome. The rest were cut off mid-gate (S-046).

**Four gates have never refused anything.** Gate 0 in 86 plans, Gate 1S in 8 pairs, Gate 3 in 115 takes, and Gate 4
in 113 — the last by construction: `packages/pipeline/src/gates/gate4.ts` returns `outcome: 'accept'` unconditionally.
It witnesses; it does not judge.

## What fails inside each gate

### Gate 1 — 94 reason strings behind 67 refused pictures

Every one at the **reconcile** step. Technical, text and witness have never refused a picture.

| family                                      | strings |
| ------------------------------------------- | ------: |
| a named subject clipped by the frame's edge |  **45** |
| a `mustNotShow` was shown                   |      28 |
| a `mustShow` was not shown                  |      10 |
| a count that does not match the name        |       8 |
| a named subject not shown                   |       3 |

The 45 clipping strings fall on 43 pictures — a picture can carry two. Of the 28 `mustNotShow`, 24 are `never-text`
(lettering), 3 `never-character`, 1 `never-person`.

### Gate 5 — 39 reason strings behind 29 refused takes

| family                      | strings |
| --------------------------- | ------: |
| a `mustNotShow` was shown   |      15 |
| a count that does not match |      11 |
| a `mustShow` was not shown  |      10 |
| a named subject not shown   |       3 |

14 of the 15 `mustNotShow` are `never-text`. Across both gates, lettering is **38 refusals** — the single most
expensive string in the engine.

### Gate 2 — 4 strings, and all of them are one artifact

```
it is black for 0.917 s from 12.708 s, at least 0.5 s
it is black for 2 s     from 11.625 s, at least 0.5 s
it is black for 0.667 s from 12.958 s, at least 0.5 s
it is frozen for 1.283 s from 12.417 s, at least 1 s
```

Every one between 11.6 s and 13.0 s — the tail of the clip. This is the provider's closing fade, not a defect in the
shot, and it stopped one reel.

### Gate 7 — 4 finished reels thrown away

```
2x  Does every shot show something no other shot repeats?
1x  Do the burned captions follow the narration?
1x  Does every shot sit well beside the shot that follows it?
```

Each stops with _"No edit exists to try, so the reel stops (S-066, S-074)."_ Everything is paid for first.

## The finding that explains the biggest number

Clipping is the largest cause in the engine. It is **not** the gate misfiring. Grouping the 127 judged pictures by how
many subjects their shot asked one 9:16 frame to hold:

| subjects in the shot | pictures |  refused | refused for clipping |
| -------------------: | -------: | -------: | -------------------: |
|                    1 |       84 |      42% |                  23% |
|                    2 |       37 |  **70%** |              **49%** |
|                    3 |        3 | **100%** |             **100%** |
|                    4 |        3 | **100%** |             **100%** |

Every picture whose shot named three or more subjects was refused, all of them for clipping. Two subjects doubles the
clipping rate against one.

A real prompt, from the run that stopped on it:

```
Shape: a vertical picture, 9:16.
Framing: medium.
It shows: Lighthouse Keeper; Handwritten Logbook; Line Being Written; Lighthouse Lamp at Night.
```

Four subjects demanding incompatible framings — a person, a desk object, a macro pen stroke, and a lamp up a tower at
night. No vertical frame holds all four whole, so the generator crops, and the gate correctly reports it. The repair
prompt fed the failure back verbatim and the repair failed the same way, because the instruction cannot be obeyed.

The baseline rate at one subject is still 42%, so subject count is the amplifier rather than the whole cause. The rest
sits in the prompt: `Framing: medium` is the entire framing instruction, and nothing ever asks for the subject to be
inside the frame.

## Capacity the engine is not using

```
avg shots per run      4.8
avg subjects per plan  4.0
avg pictures per run   3.1      of a ceiling of 6 (D-027)
avg takes per run      2.7      of which 1.7 are text-to-video
```

**Half the image budget is unspent**, while **63% of clips are made from words with no keyframe at all.** A shot with
no picture cannot be held at the take cap — the ladder has nothing to fall back on — so the run dies instead of
degrading. Several of the stopped runs read _"it has no approved picture to hold, being made from words because its
picture was degraded (D-050)."_

## Where runs die

**17 stopped** — the engine judged the work and had no remedy:

| cause                                                   | runs |
| ------------------------------------------------------- | ---: |
| the canonical picture failed Gate 1 three times (D-047) |    6 |
| a shot's three takes all failed                         |    6 |
| Gate 7 refused the assembled reel                       |    4 |
| no detail recorded                                      |    1 |

Of the six take exhaustions: one was Gate 2's black tail, five were Gate 5 — lettering, a count, and `mustShow`.

**27 failed** — something broke:

| cause                                                                 | runs |
| --------------------------------------------------------------------- | ---: |
| a judge answered in the wrong shape, or not JSON                      |    7 |
| a transient fault on an image call                                    |    6 |
| the provider's account or a 4xx/timeout                               |    4 |
| the transient counter spent on 3 sends                                |    2 |
| a provider returned the wrong frame shape                             |    2 |
| the reconciler answered names where ids were asked                    |    2 |
| a wire mismatch, a planner shape, a token overflow, narration timings |    4 |

## Which causes are still live

All 52 runs fall in one six-day burst, so the last date a cause appears is a fair signal.

**Live to the final run days (2026-09-25/26):** Gate 1 three times · takes three times · the image transient ·
the judges' answer shape · Gate 7 · the transient counter.

**Seen only on 2026-09-21/22, and since addressed:** the 401 and 402, the planner's token overflow (S-135 raised
`max_tokens` to 26624), the reconciler answering names not ids, a model 400, a wire mismatch, a model timeout.

**Abandoned providers:** both wrong-frame-shape failures are `seedream` and `nano-banana`, not the verified path.

## Causes found in the code, not in the rows

Five things the rows imply and the source confirms.

1. **The image port cannot report a transient fault.** `PictureAnswer` in `packages/contracts/src/picture.ts` has only
   `made` and `refused` — no `unavailable`. `sentUntilAvailable` (`apps/worker/src/transient.ts`) is wired into the
   model, narration and video ports; `apps/worker/src/guarded-image-port.ts` does not mention it. So a fal `504` or a
   failed fetch on an image must throw, and a throw fails the run (S-046). Six runs died this way. Video and narration
   got D-024/I-11/S-096; images were left out by construction.
2. **A plural subject can never match its count.** `reconcileAnswer`
   (`packages/pipeline/src/stills/prompts.ts`) gives each subject one `entity` index, and `COUNT_RULE` requires "two
   or more for a plural one". When the witness lists instances separately — `"left pyramid" count:1`,
   `"centre pyramid" count:1` — the reconciler must point at one of them, so `countMatches` must be false. The clips
   gate imports the same schema. 19 refusals.
3. **Gate 4 cannot fail**, as above.
4. **Nothing caps subjects per shot.** `packages/pipeline/src/plan/prompts.ts` tells the planner _"For each unit, give
   one shot ... and the ids of the subjects it shows"_, with no limit and nothing about framing. `subjectIds` is an
   unbounded array.
5. **The picture prompt names what it forbids.** `pictureEntry` appends `It must never show: written words or labels`,
   and the fal adapter sends one field, `prompt`. FLUX.2 has no negative-prompt parameter, so the forbidden thing is
   described to the generator in the positive. 38 refusals.

The witness's own `count` field is also the most fragile field in the engine: 7 of the 10 recorded refused answers are
`count` arriving as a string or as zero.

## What the time actually goes on

Stage seconds for the three newest runs, from `run_event`:

| run        | plan | stills | video | total | ending    |
| ---------- | ---: | -----: | ----: | ----: | --------- |
| `a1b8f2ee` |   66 |    243 |  2138 |  2448 | completed |
| `8d233d6e` |   56 |    138 |   615 |   810 | stopped   |
| `d12931e1` |   94 |    270 |   418 |   782 | completed |

The slowest run retried nothing — six first takes, one of them spanning 872 s alone. Clips are 53% to 87% of a run's
wall clock. Retries are not what makes a reel slow; serial clip generation is (`parallel-shots`, S-115, not built).

## How this was measured, so it can be run again

Read-only, with Node's built-in SQLite, from the repository root:

```bash
node --experimental-sqlite <script> data/cutroom.sqlite
```

Sources: `run.result` for endings; `picture.gate1` and `picture.gate1s` for picture verdicts; `take.verdicts` for take
verdicts; `render.gate7` for cuts; `degradation`, `refused_answer`, `lost_call`; `plan.plan` where `selected=1` for
shots and subjects; `generation_receipt`, `video_receipt`, `speech_receipt`, `model_receipt` for calls and cost;
`run_event.at` for stage times. Subject counts per shot were taken from the `It shows:` line of the stored
`picture.prompt`, which is what was actually sent.
