# 04 — Pipeline stages

This document is a reference for the four pure stages that live in `packages/pipeline`. Read it
when you need to know what a stage does, what it returns, what ports it expects, and how the
gates fit in.

## The principle

The pipeline is **pure**. It imports no `domain`, no `providers`, no app, and **no I/O at all**
(no `node:fs`, no `node:net`, no `fetch`). The planner calls the model port it is handed.
Nothing else does I/O.

This is the rule that lets the pipeline be tested without a database, lets `node scripts/drift.mjs`
prove the boundary, and lets the same stage run on real providers and on stand-ins without
changing its code.

## The four stages and the gates

```
  plan      stills      clips      render
   │          │           │           │
   ▼          ▼           ▼           ▼
 Gate 0    Gates 1, 1S  Gates 2-5  Gate 7
```

| Stage    | File                                                     | Inputs                                    | Outputs                                                          |
| -------- | -------------------------------------------------------- | ----------------------------------------- | ---------------------------------------------------------------- |
| Plan     | `plan/index.ts` — `planReel`                              | `SubmitRequest`, `LanguageModelPort`, cap, `PlanSettings` | `PlanOutcome` (selected / refused-budget / stopped-rule)         |
| Stills   | `stills/index.ts` — `makeStills`                         | `StillsInput`, ports (`image`, `sensors`, `model`), `StillsSettings` | `StillsOutcome` (completed / stopped-rule / stopped-budget / failed) |
| Clips    | `clips/index.ts` — `makeClips`                           | `ClipsInput`, ports (`video`, `narration`, `media`, `model`), `RenderSettings` | `ClipsOutcome` (completed / stopped-rule / stopped-budget / failed) |
| Render   | `render/index.ts` — `cutReel`                            | `RenderManifest`, ports (`assembler`, `media`, `model`), `RenderSettings` | `CutOutcome` (completed / stopped-rule / failed)                 |

The gate order is `['0', '1', '1S', '2', '3', '4', '5', '7']` (`packages/pipeline/src/gates/index.ts`).
There is no `6` (no chain — S-067) and no `8` (KnowScroll's — S-068).

## Plan stage — `planReel`

`packages/pipeline/src/plan/index.ts:138-235`. The worker calls this; nothing else does.

Inputs:
- `request: SubmitRequest`.
- `model: LanguageModelPort`.
- `capCents: number` (read from `BUDGET.md`'s `Per reel, all-in` row, D-100).
- `settings: PlanSettings`.

Default settings (`DEFAULT_PLAN_SETTINGS`):
- `shotCountUnits: [4, 6]` (D-112).
- `totalSecondsBounds: [35, 45]` (D-111).
- `imageRateCents: 15` (BUDGET.md: nano-banana-pro/edit, the dearest candidate — O-4).
- `videoRateCentsPerSecond: 4` (BUDGET.md: H3 Turbo 768P).
- `models`: `planner: 'MiniMax-M2.7'`, `reconciler: 'MiniMax-M3'`, `witness: 'MiniMax-M3'`,
  `judge: 'MiniMax-M3'`. M3 is the only model that accepts images (D-006).
- `score.weights`: `{ coverage: 1, recurrence: 1, order: 1, pacing: 1, juxtaposition: 1 }`.
- `pictures: 'recurring'` (D-027's rule; `'upToThree'` only by setting — S-150).

Algorithm:

1. Pick the fork's axis from `request.options.planVaryOn` (closed list; only `'shotCount'` is
   built — D-110).
2. Group the narration's sentences into the two counts. A sentence is never divided.
3. Call the model twice (planner role, temperature 0) to get two structured `PlanningAnswer`s.
4. Build two `Plan`s, with `criteria` copied from the request's (D-034, D-096).
5. Run `gate0` on each (`packages/pipeline/src/gates/gate0.ts`).
6. If both survive: score each (reconciler role, temperature 0, **one call per plan, never two
   at once** — D-064) and pick the higher total. Tie → the 4-unit plan.
7. If exactly one survives: pick it. (D-113.)
8. If neither survives: `repairBasis` picks the grouping, the planner makes one repair call
   (temperature 0), Gate 0 runs on the repair. If the repair survives, pick it. Otherwise the
   outcome is `refused-budget` (every plan over the cap, the refused figure is the lowest
   estimate) or `stopped-rule` (gate-0).

Outcome shapes:

```
{ kind: 'selected', selected: 'a' | 'b' | 'repair', estimateCents, … }
{ kind: 'refused-budget', estimateCents, … }   // lowest of the three plans
{ kind: 'stopped-rule', rule: 'gate-0' | 'split', detail }
```

The runner (`apps/worker/src/plan-job.ts`) handles each outcome:

- `selected` + `until: 'plan'` → `finishRun` with `status: 'completed', until: 'plan'`.
- `selected` + `until: 'stills' | 'video'` → compare the *whole estimate* (video) or *just the
  pictures* (stills) to `request.options.budgetCents`. Admitted: `admitStills`; refused:
  `finishRun` with `limit: 'ceiling'`.
- `refused-budget` → `finishRun` with `limit: 'reel'` and an appended question to
  `QUESTIONS.md`.
- `stopped-rule` → `finishRun` with `status: 'stopped'`.

`PlanAdmission` (`packages/pipeline/src/admit.ts`):

- `admitPictures(plan, ceilingCents, settings)`: ceiling comparison is against the pictures'
  estimate (`plan.plannedImageCalls * settings.imageRateCents`).
- `admitVideo(plan, ceilingCents)`: ceiling comparison is against the whole estimate.

## Stills stage — `makeStills`

`packages/pipeline/src/stills/index.ts`. The worker calls this with the selected plan and the
ports it built.

Inputs (`StillsInput`):
- `runId`, `attempt`.
- `earlierImageCalls`: the run's image calls before this attempt (receipts + lost calls — S-048,
  S-142).
- `request: SubmitRequest`.
- `plan: Plan`.
- `kept: readonly PictureRecord[]`: every picture whose Gate 1 decided (S-164). On a first
  attempt, this is empty. On a resume, this carries the pictures the failed run kept.
- `copiedPictures: number`: how many pictures the run inherited from the run it resumes
  (S-162). Zero for a first run.

Ports (`StillsPorts`):
- `image: ImagePort` (with `acceptsReferences: true` — D-026).
- `sensors: PictureSensorPort`.
- `model: LanguageModelPort`.
- `recorder: StillsRecorder` (the worker wraps the model port in `recordingPort`).
- `refusalRecorder: RefusalRecorder`.

Default settings (`DEFAULT_STILLS_SETTINGS`):
- `canonicalFraming: ['medium', 'wide']` (D-032, S-044). Two equal canonical framing values
  would render one prompt twice — the worker refuses to start with them (D-032).
- `scoreWeights`: from `DEFAULT_SCORE_WEIGHTS`.
- `suspicionThreshold: 0.25` (D-049).

Algorithm:

For each shot in plan order:

1. **The canonical picture**. Two candidates are generated, one per framing. The first that
   passes Gate 1 is kept; if both fail, the **repair** is run from the reserve slot. The
   canonical is fixed.
2. **Derived pictures**. One per distinct subject (ranked by `rankSubjects`). Each goes through
   the image ladder, then Gates 1 and 1S. Gate 1 (`image alone`) is in `gates/gate1.ts`. Gate 1S
   (`against the canonical`) is in `gates/gate1s.ts`.
3. **Ladders are shot-by-shot** (S-057). The next shot does not start until the current shot's
   reserve decisions are made.
4. **Suspicion**: a derived picture's witness observation above `suspicionThreshold` (default
   `0.25`) sends it to the reconciler (D-049).

The stage records:

- `pictures`: every picture made or kept, with its `pictureId`, its shot's `unit`, its `role`
  (`canonical`, `derived`), its Gate 1 verdict(s), its `chosen` flag, its `degradation` reason
  if any.
- `degradations`: every shot that the ladders degraded, with the gate and reason.
- `events`: the verdict and `degraded` events the stage produced.

Outcome (`StillsOutcome`):

```
{ kind: 'completed' }
{ kind: 'stopped-rule', rule: 'gate-1', detail }
{ kind: 'stopped-budget', limit: 'caller' | 'reel', estimateCents }
{ kind: 'failed', detail, failure: FailureKind }
```

The worker:

- `completed` + `until: 'stills'` → `finishStills`.
- `completed` + `until: 'video'` → `advanceStills` (enqueue `reel.clips`).
- `stopped-*` → `finishStills`.
- `failed` → `finishStills` with `status: 'failed'` and the kind from `failureKindOf(error)`.

## Clips stage — `makeClips`

`packages/pipeline/src/clips/index.ts`. The worker calls this with the chosen stills and the
ports it built.

Inputs (`ClipsInput`):
- `runId`, `attempt`.
- `request: SubmitRequest`.
- `plan: Plan`.
- `stills`: the chosen pictures, each with Gate 1's observation (D-033).
- `kept`: every narration an earlier attempt finished and every take it decided (S-092). On a
  first attempt, empty. On a resume, populated.

Ports (`ClipsPorts`):
- `video: VideoPort`.
- `narration: NarrationPort`.
- `media: MediaPort`.
- `model: LanguageModelPort`.
- `recorder: ClipsRecorder`.

Algorithm (per shot, in plan order):

1. **Narration**. The shot's sentences are joined; the narration port returns audio or throws.
   The media port probes the file and parses `wordTimings`. A take that crashes mid-way is not
   kept and not resumed — it is made again under this attempt's id (I-15).
2. **Takes**. Up to 3 per shot. Take 1 is the first try; takes 2 and 3 retry with the failed
   take's reasons (D-033). Each take runs:
   - **Gate 2** (`gates/gate2.ts`): technical (codec, geometry, fps, audio sample rate).
   - **Gate 3** (`gates/gate3.ts`): sound (audio duration vs. narration's words, silence
     detection).
   - **Gate 4** (`gates/gate4.ts`): witness — does the take show what the picture was meant to.
   - **Gate 5** (`gates/gate5.ts`): brief — does the take match the narration's intent.
3. **Hold**. After three failed takes, the shot is held on its chosen picture (D-055, S-097,
   S-098). The media port confirms the picture is readable; a `degraded` event is appended;
   the stage goes on to the next shot.
4. **Final gate-5 check**. Once every shot is done, if a `mustShow` criterion has no accepted
   take that shows it (held shots show nothing — S-072, S-090), the stage stops `rule:
   'gate-5'`.

Outcome (`ClipsOutcome`):

```
{ kind: 'completed' }
{ kind: 'stopped-rule', rule: 'gate-2' | 'gate-3' | 'gate-5', detail }
{ kind: 'stopped-budget', limit: 'caller' | 'reel', estimateCents }
{ kind: 'failed', detail, failure: FailureKind }
```

The worker:

- `completed` → `advanceClips` (write held labels, enqueue `reel.assemble`).
- `stopped-*` → `finishVideo` with `status: 'stopped'`.
- `failed` → `finishVideo` with `status: 'failed'`.

## Render stage — `cutReel`

`packages/pipeline/src/render/index.ts`. The worker calls this with the manifest it built and
the ports it built. **No port that buys** is handed in (I-18).

Inputs:
- `renderManifest: RenderManifest` — `runId`, `renderId`, `attempt`, `profile`, every shot's
  `startFrame`, `frames`, `captions`, `words`.

Ports (`CutPorts`):
- `assembler: AssemblerPort` (ffmpeg).
- `media: MediaPort` (ffmpeg).
- `model: LanguageModelPort` (for Gate 7).

Default settings (`DEFAULT_RENDER_SETTINGS`):
- `profile`: `mp4 / h264 / aac / 768x1366 / 24fps / 48kHz / 2 channels`.
- `gateProfile: { id: 'phase-1', gates: GATE_ORDER }` — exactly one is defined (D-052, S-067).
- `narrationRateCentsPerCharacter: 0` (T2A is covered by the token plan — D-019).
- `voice: 'stand-in'` — a real voice is the paid path's to name.
- `promptExpansionMode: 'balanced'` (D-072: the only value the research read).
- `technical: { aspectTolerance: 0.01, blackSeconds: 0.5, frozenSeconds: 1.0 }` (S-072).
- `captionStyle: { id: 'word-captions-1', fontName: 'Arial', fontSize: 48, marginV: 200 }`.
- `cutQuestions`: four (S-074, S-158):
  - "Are the shots in a sensible order?"
  - "Does the pacing work?"
  - "Does every shot sit well beside the shot that follows it?"
  - "Do the burned captions follow the narration?"
- `transient: { maxAttempts: 3, backoffMs: 1000 }` (D-024, I-11, S-096).
- `stillPush: { endZoom: 1.1 }` (D-025, S-097).

Algorithm:

1. `ports.assembler.assemble(manifest)` → `AssembledFile`.
2. `ports.media.probe(file)` → `MediaProbe`. If the file differs from the manifest's profile,
   the stage fails `kind: 'failed', failure: 'engine'`.
3. `ports.media.frames(file, [startFrame, midFrame, endFrame] × shots)` → the frame strip.
4. `gate7(manifest, cutQuestions, model)` answers yes/no. Any `no` → `kind: 'stopped-rule',
   rule: 'gate-7'`.
5. `kind: 'completed'` otherwise.

Outcome (`CutOutcome`):

```
{ kind: 'completed' }
{ kind: 'stopped-rule', rule: 'gate-7', detail }
{ kind: 'failed', detail, failure: FailureKind }
```

The worker (`apps/worker/src/assemble-job.ts`) writes the render row, the held shots' four
labels (S-058, S-073), the events, and `finishVideo`.

## Resume planning — `planResume`, `admitResume`, `normalise`, `takedown`

`packages/pipeline/src/resume/index.ts`. The engine's one planner for a caller's preview, a
caller's call, and the engine's own resume — handed what the failed run holds and the rates
the worker prices at, so the three can never plan one resume two ways (S-161, S-174).

- `normalise(pieces, plan, until)`: the caller's named pieces as one list, in shot order then
  still / narration / clip (S-161). Refused pieces (a still on a shot the plan gives no picture,
  a narration or clip on a run that makes none, a run with no selected plan) answer `{ invalid:
  '…' }`.
- `takedown(named, plan, until)`: what the named pieces take down with them. A still takes down
  its shot's clip and the canonical's still every derived shot's still and clip drew from
  (D-026). A standalone's still takes down its shot only (S-150). A narration takes down its
  shot's clip. A clip takes itself. The cut and Gate 7 are always made again.
- `planResume(inputs, remake, rates, by)`: pure. Decides what is kept (every kept
  `PictureRecord` / `NarrationRecord` / `TakeRecord`) and what is made again (the rest). The
  output includes the resume's `estimateCents` and its `named` list.
- `admitResume(spentCents, estimateCents, capCents, ceilingCents)`: admits against the per-reel
  cap first (D-100), then the caller's ceiling. Outcomes: `{ admitted: true, estimateCents }`,
  `{ admitted: false, limit: 'reel', estimateCents }`, `{ admitted: false, limit: 'ceiling',
  estimateCents }`.

The engine's resume (`apps/worker/src/resume.ts`) calls these inside a savepoint in the
finishing transaction (S-163). The service's resume (`apps/service/src/service.ts:53-81`)
calls them through a `ResumeService` it builds from the worker's settings and questions file.