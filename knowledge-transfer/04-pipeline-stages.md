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

| Stage  | File                             | Inputs                                                                         | Outputs                                                              |
| ------ | -------------------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| Plan   | `plan/index.ts` — `planReel`     | `SubmitRequest`, `LanguageModelPort`, cap, `PlanSettings`                      | `PlanOutcome` (selected / refused-budget / stopped-rule)             |
| Stills | `stills/index.ts` — `makeStills` | `StillsInput`, ports (`image`, `sensors`, `model`), `StillsSettings`           | `StillsOutcome` (completed / stopped-rule / stopped-budget / failed) |
| Clips  | `clips/index.ts` — `makeClips`   | `ClipsInput`, ports (`video`, `narration`, `media`, `model`), `RenderSettings` | `ClipsOutcome` (completed / stopped-rule / stopped-budget / failed)  |
| Render | `render/index.ts` — `cutReel`    | `RenderManifest`, ports (`assembler`, `media`, `model`), `RenderSettings`      | `CutOutcome` (completed / stopped-rule / failed)                     |

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
- `imageRateCents: 15` (BUDGET.md: nano-banana-pro/edit, the dearest candidate — O-4). With a
  real image port the service replaces it with the configured registry entry's own rate (S-124).
- `videoRateCentsPerSecond: 4` (BUDGET.md: H3 Turbo 768P). With a real video port the service
  replaces it with H3's 0.5¢ a second (S-125, S-155).
- `models`: `planner: 'MiniMax-M2.7'`, `reconciler: 'MiniMax-M3'`, `witness: 'MiniMax-M3'`,
  `judge: 'MiniMax-M3'`. M3 is the only model that accepts images (D-006).
- `score.weights`: `{ coverage: 1, recurrence: 1, order: 1, pacing: 1, juxtaposition: 1 }`.
- `pictures: 'recurring'` (D-027's rule). The **service** overrides this: `CUTROOM_PICTURES`
  defaults to `'upToThree'` there (S-153), and `'recurring'` must be asked for (S-150).

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
- `selected` + `until: 'stills' | 'video'` → compare the _whole estimate_ (video) or _just the
  pictures_ (stills) to `request.options.budgetCents`. Admitted: `admitStills`; refused:
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
- `recorder: StillsRecorder` (makes each picture's progress durable as each check completes).
- `refusals: RefusalRecorder` (keeps every answer a gate refused).

The worker hands the stage the image port wrapped in `guardedImagePort` and the model port wrapped
in `recordingPort`; the sensor port is passed as it was built.

Default settings (`DEFAULT_STILLS_SETTINGS`):

- `canonicalFraming: ['medium', 'wide']` (D-032, S-044). Two equal canonical framing values
  would render one prompt twice — the worker refuses to start with them (D-032).
- `scoreWeights`: from `DEFAULT_SCORE_WEIGHTS`.
- `suspicionThreshold: 0.25` (D-049).

Algorithm:

1. **Placement** (`stills/place.ts`, `placePictures`), by the rule stored with the plan: the
   rank-1 recurring subject gets the **canonical** on the first shot showing it; ranks 2 and 3
   get one **derived** picture each on the earliest free shot showing them; under `upToThree`,
   free slots (up to three pictures in all) go to early shots with no picture and no pictured
   subject as **standalone** pictures. Nothing placed → `completed` at once.
2. **The reserve** (`stills/ladder.ts`): six image calls a run (`IMAGE_CALLS`) less the run's
   earlier calls less the first calls still to make. Every repair takes one slot; at most two
   repairs a shot. Below 0 (only after a crash re-claim) the stage returns `failed`, kind
   `crashed`.
3. **The canonical**. Two candidates, one per framing, made from no reference, each through Gate 1
   as soon as it is made. Two survivors are ranked by the keyframe score (tie → `a`); one
   survivor is chosen outright; none gets **one repair**, told both candidates' reasons. A repair
   that fails Gate 1 too stops the run for rule `gate-1`.
4. **Derived pictures**, in rank order, made with the canonical as a reference (D-026), each
   through Gate 1 (`gates/gate1.ts`); a failure takes a repair if a slot is free, otherwise the
   shot is **degraded**. Then **Gate 1S** (`gates/gate1s.ts`) on each derived picture that passed:
   suspicion = 1 − the pixel similarity of canonical and derived (sensor port). No shared
   subject, or suspicion ≤ `suspicionThreshold` (0.25), is accepted with no call; above it, one
   judge `compare` call decides (D-049). A 1S failure is repaired or degraded the same way.
5. **Standalones** go through Gate 1 only, with the same repair-or-degrade rule.
6. **Ladders are shot-by-shot** (S-057): one shot's ladder finishes before the next begins.

The stage records:

- `pictures`: every picture made or kept, with its `pictureId`, its `shotUnit`, its `role`
  (`canonical`, `derived`, `standalone`), its Gate 1 and Gate 1S verdicts, its `chosen` flag, its
  `degradation` reason if any.
- `degradations`: every shot that the ladders degraded, with the gate and reason.
- `events`: the verdict and `degraded` events the stage produced.

Outcome (`StillsOutcome`):

```
{ kind: 'completed' }
{ kind: 'stopped-rule', rule: 'gate-1', detail }
{ kind: 'stopped-budget', limit: 'reel' | 'ceiling', estimateCents }
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
2. **Takes**. Up to 3 per shot: image-to-video from the shot's chosen picture, or text-to-video
   for a shot with none (no picture placed, or degraded). The seed is the CRC-32 of the take id.
   Takes 2 and 3 are told every earlier failed take's reasons (D-033). Each take runs:
   - **Gate 2** (`gates/gate2.ts`): technical — the media port probes and scans the file. Fails
     when it is unreadable or has no video, when width/height is more than 0.01 from 9/16, or on
     a black stretch ≥ 0.5 s or a frozen stretch ≥ 1 s. Length, frame rate, sample rate,
     silence and loudness are recorded and fail nothing. A Gate 2 failure decides the take.
   - **Gate 3** (`gates/gate3.ts`): text and sound — the words read off the clip are recorded and
     never fail; sound classified as speech or as music fails. (On the ffmpeg media port both
     answers come from its script, defaulting to none, so on a real run Gate 3 has never heard a
     clip — P-007.)
   - **Gate 4** (`gates/gate4.ts`): the witness, shown the whole clip and nothing else; accepts
     once its answer parses (a refused answer is asked once more).
   - **Gate 5** (`gates/gate5.ts`): the brief — the reconciler holds the observation against the
     shot's subjects and criteria, and code fails the take on a subject not shown, a count that
     does not match, a claimed `mustShow` not shown, or a `mustNotShow` shown.
3. **At the cap** (`clips/ladder.ts`, `atTheCap`). After three failed takes, a shot that has a
   chosen picture and claims no `event` mustShow is **held** on that picture (D-055, S-097,
   S-098): the media port probes the picture, a `degraded` event is appended, and the stage goes
   on. Otherwise the reel stops for the rule of the third take's lowest failing gate.
4. **Final gate-5 check**. Once every shot is done, if a `mustShow` that no sentence claims was
   shown by no accepted take (held shots show nothing — S-072, S-090), the stage stops
   `rule: 'gate-5'`.

Outcome (`ClipsOutcome`):

```
{ kind: 'completed' }
{ kind: 'stopped-rule', rule: 'gate-2' | 'gate-3' | 'gate-5', detail }
{ kind: 'stopped-budget', limit: 'reel' | 'ceiling', estimateCents }
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
