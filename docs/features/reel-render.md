---
status: current
authority: plan
---

> **Moved here on 2026-09-15** from the KnowScroll repository's `steering/features/reel-render.md`, **before its
> gates were written**, under **S-033**; the last steering commit holding it is `e05e9f0`. Text below is unchanged
> but for formatting and the Evidence heading, which named `pnpm journey`: `pnpm state` and `pnpm journey` are the
> steering repository's tools, and here the journey is `node scripts/journey.mjs`. **Item 5 below has since been
> answered by D-100** — the engine's admission is generation-only, against the per-reel cap and the caller's ceiling.
> Its gates are written and reviewed here.

# reel-render — approved stills become a finished video, for $0

Status: planned
Decisions: D-001, D-005, D-007, D-008, D-014, D-015, D-018, D-019, D-020, D-023, D-025, D-026, D-027, D-028, D-029, D-033, D-036, D-037, D-041, D-042, D-043, D-044, D-047, D-049, D-050, D-051, D-052, D-053, D-054, D-055, D-056, D-057, D-058, D-059, D-063, D-064, D-069, D-071, D-072, D-076, D-080, D-081, D-083, D-086, D-087, D-094, D-098, D-099, D-100, D-101, D-108, D-110, I-4, I-6, I-7, I-8, I-10, I-12, I-15, I-16, I-17, I-18, I-19, S-010, S-016, S-021, S-023, S-025, S-026, S-027, S-028, S-029, S-031, S-033, S-035, S-036, S-037, S-038, S-040, S-041, S-042, S-046, S-048, S-051, S-052, S-053, S-055, S-056, S-058, S-059, S-066, S-067, S-068, S-069, S-070, S-071, S-072, S-073, S-074, S-075, S-076, S-077
Named only in the deferral list: D-022, D-024, D-035, D-040, D-048, I-5, I-9, I-11, S-019, S-032
Gates: product APPROVED 2026-09-16 adversarial-reviewer · architecture APPROVED 2026-09-16 adversarial-reviewer · program-design APPROVED 2026-09-16 adversarial-reviewer · slices APPROVED 2026-09-16 adversarial-reviewer

> **Created 2026-09-12 by D-080**, which cut the engine in two; since **D-108** the half before this one is
> `reel-plan` and `reel-stills`. This feature starts where `reel-stills` ends — approved still pictures — and ends with
> a video file.
>
> **Cut in two while its gates were written, at the owner's choice (S-066).** Written whole it was about twice
> `reel-stills`' size. This file builds a gated video with **one take a shot**; **`reel-takes`** owns D-024's three
> takes, I-11's transient-error counter and D-025's ladder at the take cap. The owner also chose that **L4 SELECT and
> Gate 6 are not built while every reel is a cut** (S-067) and that **Gate 8 is KnowScroll's** (S-068).
>
> **Written by removing promises, not by copying.** The stub's five needs, `reel-engine`'s last plan (git `7e50f79`)
> and its four reviews (`docs/founding/reel-creation-engine/reel-engine-reviews.md`) were read; what this feature does
> not build is listed under **Deferred**, with where it goes. A reviewer should treat that list as known and chosen, not
> as findings.
>
> **The stub's five needs, answered.** 1 — `reel-stills` was verified at `e42bc3f`. 2 — a stand-in voice writing real
> audio and word timings (S-070). 3 — stand-in clips carrying a tone, mixed and conformed by a real pass (S-071, S-073).
> 4 — S-067. 5 — D-100: admission and every guard are generation-only, and no research spend exists in the engine
> (S-069).

## Gate 1 — Product (no technical language)

**The problem.** A reel's plan and its approved pictures can now be asked for. Nothing yet makes the reel itself — the
moving pictures, the voice, the words on screen — and nothing checks what is made. The agreement callers work from
already promises a finished video; asked for one, the engine says "not built yet".

**The visible outcome.** Something asks the engine for a reel — the same request as for pictures, asking to go as far
as the video, with the most it may spend. It hears at once that the request was taken, or why not. A while later it
gets one of these answers:

- **the finished video** — one file in which every planned shot moves, in order; the narration is spoken shot by shot;
  each word appears on screen as it is spoken; and each clip's own sound stays low under the voice. Beside it, the
  approved pictures, and every shot that was made worse, and why;
- **that the reel would cost more than its limit**, with the figures, before anything is made;
- **that making it stopped** because the next paid step would pass a limit, with the figures and what was spent;
- **which rule stopped it and at which step** — a picture that failed, as today; a clip that failed one of its checks;
  something the reel had to show that no clip showed; or the finished reel failing its last check;
- that it was cancelled; or that something went wrong inside the engine, said plainly;
- and, as for pictures: that every plan was over the per-reel limit, or which rule stopped the plan or the pictures.

Behind the answer the engine keeps a record of **every clip and every narration it made** — those of an attempt it had
to start again included — with each check a clip reached and what that check found, and **the one document each
finished file was made from**.

**What "approved" means for a clip.** It is a readable moving picture of the right shape, with no long black or frozen
stretch; its own sound holds no speech and no music; it has been described by a step that was never told what it should
show; and that description, held against what its shot must show and must never show, agrees. **For the reel:**
everything it must show appears in some clip, and the finished file is judged to be in a sensible order and pace, with
nothing badly placed beside anything else, no shot repeating another, and the words on screen following the voice.

**When something fails.**

- **A shot gets one clip.** A clip that fails its checks stops the reel, before anything more is bought. Trying a clip
  again, and holding a shot's picture when its tries run out, come later, in a feature of their own.
- **Something the reel must show that no clip shows** stops the reel once every clip is made.
- **A finished reel that fails its last check stops**, and no video is given back.
- **A shot whose picture was not approved** is filmed from its words alone, and that is written down.
- **A clip shorter than its narration** shows its last moment until the voice finishes, and that is written down with
  for how long.
- **If the engine stops partway and starts again**, it makes the clips and the narration again from the start and pays
  again; putting the reel together again costs nothing.

**Asked for a plan, pictures or a video, it answers each.** Asking the two plans to differ in anything but their number
of shots is still "not built yet".

**Surfaces.** None. A service other programs call.

**The one measure allowed.** Whether a clip and a reel that should be approved are, and one that should fail fails **at
the check the design says it fails at**.

**What must NOT happen.**

- **Nothing may cost money, and nothing may read a secret.** This is structural, not a setting: this feature builds
  **no connection to any paid service** — its clips, its voice and the steps that look at clips are stand-ins that run
  on this machine, and the one real tool it uses, which puts video and sound together, reads and writes files here and
  nothing else. It is proven by running the whole thing with no secrets in its surroundings.
- **Nothing may reach out of this machine.**
- **The step that describes a clip is never told what the clip should show.**
- **No clip is made from a picture that did not pass its checks.**
- **Nothing is bought once the reel is being put together.**
- **No shot is dropped to fix a failure.**
- **Nothing is quietly made worse, and nothing is given back looking finished when it is not**: a video comes back only
  after its last check.

## Gate 2 — Architecture

**Where the code goes** — the engine repository's existing packages (S-010). Only what this feature touches:

| Package                  | This feature adds                                                                                                                                                                                                                                                                                          | May not                                                                            |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `packages/reel-contract` | nothing — imported as it is                                                                                                                                                                                                                                                                                | import any other engine package (D-094)                                            |
| `packages/contracts`     | `ClipRef`, `VideoPort`, `NarrationPort`, `MediaPort`, `AssemblerPort`, `TakeRecord`, `NarrationRecord`, `ClipsRecorder`, `ClipObservation`, `RenderManifest`, `OutputProfile`, `GateProfile`, `CutVerdict`; `observe` on a clip, `judgeCut` and `ModelReceipt.takeIds` on the model port; `RenderSettings` | import anything internal except `@cutroom/reel-contract` (D-099)                   |
| `packages/pipeline`      | a video run's admission; the clips stage — narration, requests, prompts, the validator, Gates 2 to 5 and the reel's unclaimed criteria; the render manifest; the cut stage and Gate 7 — **pure functions handed their ports**                                                                              | import `domain`, `providers`, `apps`, any I/O module, or any npm package but `zod` |
| `packages/providers`     | **stand-ins** for the video and narration ports, and `observe` on a clip and `judgeCut` on the model stand-in; **the local ffmpeg adapters**, the media port and the assembler (S-075)                                                                                                                     | import `domain` or `pipeline`                                                      |
| `packages/domain`        | the narration, take, render and hold tables with their receipts; the chain's third and fourth jobs; a render's holds in the record                                                                                                                                                                         | import `pipeline` or `providers`                                                   |
| `apps/api`               | `until: 'video'` accepted                                                                                                                                                                                                                                                                                  | import `providers` (D-005)                                                         |
| `apps/worker`            | a video run's admission; advancing a completed stills stage; the `reel.clips` and `reel.assemble` runners; the validating, guarded video port and the guarded narration port; the clips recorder; recording `judgeCut`; refusing to start without ffmpeg                                                   | import `providers` (S-038), or `child_process` — **new rule** (S-075)              |

**No real video, voice, text-reading or sound-classifying adapter is built here.** fal's H3, MiniMax's T2A and every
OCR or audio classifier are deferred. **The one real adapter is ffmpeg on this machine** (S-075): it reads and writes
files under the artifact root, costs nothing, reads no secret and reaches no network. That is what makes Gate 1's "no
connection to any paid service" structural: the only video port, the only narration port and the only model port in the
repository are stand-ins, **and the worker cannot import one** — it is handed every port by whoever starts it (S-021,
S-038).

**How a run goes.**

```mermaid
sequenceDiagram
  Caller->>API: POST /v1/runs (until = video)
  API->>Domain: store run, job reel.plan, run.accepted
  Worker->>Pipeline: planReel — unchanged (reel-plan)
  Worker->>Pipeline: admitVideo(selected plan, budgetCents) (S-069)
  alt no plan selected, or the estimate over the ceiling
    Worker->>Domain: reel-plan's endings, or refused(ceiling) with the plan's estimate
  else admitted
    Worker->>Domain: admitStills — plans, verdicts, stage.finished plan, job reel.keyframes (S-052)
    Worker->>Pipeline: makeStills — unchanged (reel-stills)
    alt the stills stage did not complete
      Worker->>Domain: reel-stills' endings, and no next row (S-046)
    else completed
      Worker->>Domain: advanceStills — chosen flags, labels, stage.finished stills, job reel.clips (S-069)
      Worker->>Domain: claim reel.clips; cancel flag + stage.started video (S-027, S-051)
      Worker->>Pipeline: makeClips(request, plan, stills, validated guarded video, guarded narration, media, recording model, recorder)
      loop each shot, in plan order
        Pipeline->>Pipeline: narration, measured, its timings parsed (S-070)
        Pipeline->>Pipeline: the clip's request and prompt, from the shot and Gate 1's observation (S-071)
        Worker->>Worker: validate the request, then spend + figure vs cap, then ceiling (S-071, S-059)
        Pipeline->>Pipeline: Gates 2, 3, 4, 5 — or stop for the gate's rule (S-072, S-066)
      end
      Pipeline->>Pipeline: every unclaimed mustShow shown by some take, or stop for gate-5 (S-072)
      Pipeline-->>Worker: ClipsOutcome — never thrown
      Worker->>Domain: advanceClips — events, job reel.assemble (S-069)
      Worker->>Domain: claim reel.assemble; cancel flag (S-027)
      Worker->>Pipeline: renderManifest(the run's rows) (S-073)
      Worker->>Domain: the render row, with the manifest and its hash — assembly begins (I-18)
      Worker->>Pipeline: cutReel(manifest, assembler, media, recording model) — no paid port
      Pipeline->>Pipeline: one ffmpeg pass, the output measured, a frame strip, Gate 7 (S-073, S-074)
      Pipeline-->>Worker: CutOutcome — never thrown
      Worker->>Domain: one transaction: the holds' labels, events, the render row, the result
    end
  end
  Caller->>API: GET events / result / record
```

**Beside `reel-plan`'s and `reel-stills`' functions, the worker calls five pipeline functions: `admitVideo`;
`validateVideoRequest`, in its video port; `makeClips`; `renderManifest`; and `cutReel`.**

### What a request becomes (S-069, S-077)

**Accepted at submit:** `until: 'plan'`, `'stills'` and **`'video'`**. **Refused `422 'unsupported'`, no run:**
`planVaryOn` other than `shotCount` (D-110) — unchanged. **A `video` run's plan stage is exactly `reel-plan`'s, and its
stills stage exactly `reel-stills'`**, up to what happens when its stills stage completes.

### Admission (S-069, D-083, D-100)

When planning selects a plan and the request's `until` is `video`, the plan job compares **the selected plan's
`estimateCents`** — D-083's figure, unchanged — with the request's `budgetCents`:

- **above it** → the run finishes **refused for budget, `limit: 'ceiling'`**, `estimateCents` the plan's estimate — the
  contract's _"the chosen plan's estimate"_ — `ceilingCents` the ceiling and `capCents` the cap the job read. **No
  question is written** (D-100) and **no second job row** is created (D-083). The plan stage produced a plan, so it has
  `stage.finished` (S-025);
- **at or below it** → **admitted by `admitStills`, unchanged** (S-052): in one transaction, the plan rows, the
  verdicts, `stage.finished` for `plan`, the plan job done at cost 0, and one `reel.keyframes` row.

**The reserve is not counted** (S-035), and **narration is not in the estimate** (S-070). **The stub's need 5:** the
engine's admission and every guard are generation-only — the spend is `SUM(cost_cents)` over the chain's job rows,
which only image, narration and clip calls add to (D-081, S-036) — and no port, table or setting for research spend
exists in the engine (D-076, D-100).

### The chain (S-069, D-081, D-083)

A `video` run is **four job rows** — `reel.plan` → `reel.keyframes` → `reel.clips` → `reel.assemble` — each with the
run as `correlation_id` and the job before it as `parent_id`, **each created in the transaction that ends its parent's
stage successfully**:

- **the keyframes job of a `video` run whose stills stage completes** writes, in one transaction (`advanceStills`), the
  chosen flags, the degradations' four labels (S-058), its verdict and `degraded` events and `stage.finished` for
  `stills`, itself done with its cost kept (S-055), and **the `reel.clips` row**. The run is not finished. **Any other
  stills ending** ends the run exactly as a `stills` run's does (S-046), and creates no row. A plan that places no
  picture completes its stills stage with none and advances the same way;
- **the clips job** settles the cancel flag and `stage.started` for `video` in one transaction before every attempt
  (`startStage`, S-027, S-051). Its stage completed, it writes, in one transaction (`advanceClips`), its events, itself
  done with its cost kept, and **the `reel.assemble` row**. Any other ending finishes the run;
- **the assemble job** settles the cancel flag the same way — `stage.started` for `video` is already written, so none is
  added — and **is handed no image, narration or video port**. It is the chain's last job.

**I-18 by structure.** Nothing can be bought once assembly begins, because the job that assembles holds no port that
buys, and no job follows it. The render row is written, with its start time, before the assembler is called; a check
compares every receipt's time with the first render row's.

**One stage, `video`** — the contract's — spans both jobs: `stage.started` from the clips job's first attempt, and
`stage.finished` only when the assemble job completes (S-025's reading: the stage produced its output).

**The gate profile is config** (S-067, D-052): `RenderSettings.gateProfile`, defaulting to `{ id: 'phase-1', gates:
GATE_ORDER }`. Exactly one profile is defined, so a worker handed one whose gates are not `GATE_ORDER` refuses to start;
every render manifest records the profile that ran.

**What the take ladder, the edits and Gate 8 would have been** are not here: D-080 and D-108 gave this feature _"the
take ladder"_ and _"Gates 7 and 8"_, and S-066 and S-068 move the ladder to `reel-takes`, D-058's edit ops to
`video-edits` and Gate 8 to KnowScroll, superseding both by name.

### Narration (S-070, D-008, D-019, D-057)

- **One narration call a shot, in plan order, immediately before that shot's clip.** `NarrationPort.speak` is given the
  run, a narration id `a<attempt>-shot-<unit>-narration`, **the text — its unit's sentences in order, joined by one
  space** — and a voice, a setting.
- It answers **`made`**, with the audio file, **word timings typed `unknown`**, and a receipt — model, characters, cost,
  `fake` — or **`refused`**, which only the worker's guard answers.
- **The file is measured, and its measured duration is the narration's** (I-17): the media port probes it.
- **The timings are parsed at the stage's boundary**: every word of the text, split on white space, exactly once, in
  order, each ending after it starts and none overlapping the next, the last ending at or before the measured duration.
  **An answer that does not parse finishes the run `failed`** — S-042's form — with the narration's row kept.
- **The clip's requested duration is the measured narration rounded up to a whole second, at least 5 and at most 15**
  (D-019, S-023). The clips stage asks for it, not the planning call, which runs before any narration exists; a
  narration over 15 seconds gets a 15-second clip whose last frame is held (S-070 supersedes D-057 on both clauses).

### Clips (S-071, D-026, D-029, D-033, D-050, D-069, D-071)

- **Take ids** are `a<attempt>-shot-<unit>-take-1` — the take number is 1 in this feature (S-066).
- **`image-to-video` from the shot's chosen picture** (D-026) where the stills stage chose one — the canonical's shot
  and each approved derived picture's shot. **`text-to-video` with `aspectRatio: '9:16'`** for every other shot: one the
  plan never gave a picture (D-027; D-029 part 3 step 6), and one whose picture was degraded (D-050 step 2) — whose take
  row and video receipt are marked `degraded`. **No clip is made from a picture that was not chosen.**
- **The request** carries the run, the take, the prompt, the requested duration, `resolution: '768P'` (D-007, D-014), a
  seed — the CRC-32 of the take id, made by the caller and recorded (D-018) — and the expansion mode, a setting
  defaulting to `balanced`, the only value the research read (D-072; the least-rewriting value is O-20, deferred). Its
  type has no `reference-to-video` mode and no end image (D-026, D-037).
- **The prompt is composed by code after the stills are approved** (D-033, D-069, D-008):
  1. the style contract's text;
  2. the shot's sentences;
  3. the names of every subject the shot shows;
  4. the take's criteria (below) — each claimed `mustShow` and every `mustNotShow` — and every unclaimed `mustShow`
     under a line saying the reel must show it in some shot;
  5. for an `image-to-video` shot, **its picture's recorded observation** — framing, setting, lighting, and each
     entity's label and position — read from Gate 1's verdict and never looked at again (D-033, I-15);
  6. last, **the negative audio block**: `No dialogue, no speech, no music.`, then `non_diegetic_music: N/A` (D-008).

  No camera — none is planned (`reel-stills`' deferred item 6). No `[Shot` marker (D-071).

- **The validator** (D-071, I-19) is a pure function in the pipeline, **run by the worker's video port before the guard
  and before the port it wraps**. It refuses — by throwing, so the run fails as a fault — a request whose prompt lacks
  the negative audio block, and a `text-to-video` request without `aspectRatio: '9:16'`. **The clips stage is handed
  only that port**, and **only two files call a video port's `generate`**: `apps/worker/src/video-port.ts`, on the
  port it wraps once the request passes, and `packages/pipeline/src/clips/index.ts`, on the port it is handed; the clips
  job hands `makeClips` only what `video-port.ts` builds. Image, narration and model calls do not pass the validator
  (S-071 supersedes D-071 and I-19 on that clause).
- **Each video receipt** records the model, the mode, the resolution, the requested duration, **the aspect ratio a
  `text-to-video` call asked for** (none for `image-to-video`, whose ratio follows its picture), the seed, the
  provider's request id, the prompt, the expanded prompt, the expansion mode, **the style contract's id and version**
  (D-069), the rate applied, the cost, `fake`, and whether it is degraded (D-028, D-050, D-072).
- **The stand-in video port** writes **a real MP4 through ffmpeg** (S-075) at `<artifact root>/<runId>/<takeId>.mp4`: a
  moving test pattern with **a band whose colour is keyed from the take id** — so one shot's frames can be told from the
  next shot's in an output — darkened across its lower third where captions go, with **a steady 220 Hz tone** as its
  sound, at the requested duration and, by default, a small 9:16 size. **A script** keyed by `shot-<unit>-take-<n>`, or
  by a whole take id, gives a take a black or frozen stretch at a given time and length, or a wholly black or frozen
  picture; another size, frame rate or sample rate; no sound or no picture; unreadable bytes; a shorter duration; a
  cost; an expanded prompt; or a throw.

### The take's criteria (S-072, D-043, S-040)

A take is held against:

- **each `mustShow`, presence or event, whose `claimId` a sentence of its shot's unit carries** — an event can be seen
  in a clip (D-043);
- **every `mustNotShow`**;
- **every `mustShow` with no `claimId`, marked as the reel's**: recorded on every take, failing none. **Once every
  shot's take is accepted, one that no take shows stops the reel for rule `gate-5`** at step `video`, naming it — D-025
  rung 3's _"`mustShow` unmet"_.

So **every criterion of the request appears in a Gate 5 answer** — D-043's _"Gate 5 still runs every criterion on the
clip"_, and S-040's _"every presence criterion appears in a Gate 5 verdict"_.

### Gates 2 to 5 on each take (S-072, I-7, D-042, D-051, D-052, D-053)

Run in order on every take, as soon as it is made:

1. **Gate 2, technical** — the media port measures the file (I-17): ffprobe for its streams, codecs, duration, width,
   height, frame rate, frame count, sample rate and channels; one ffmpeg pass of `blackdetect`, `freezedetect`,
   `silencedetect` and `ebur128`, **handed `blackSeconds` and `frozenSeconds` as the shortest stretch each reports** —
   ffmpeg's own defaults are two seconds. **It fails** when the file is not readable or has no video stream; when its
   width over its height differs from 9/16 by more than the aspect tolerance, default 0.01 (D-019's 16:9 trap); when a
   black stretch of at least `blackSeconds`, default 0.5, is reported; or when a frozen stretch of at least
   `frozenSeconds`, default 1.0, is reported. `freezedetect` measures a freeze a few frames short, so the checks keep a
   margin either side of each threshold. **Recorded, never failing:** duration, frame rate, sample rate, channels, a missing audio stream, silence and
   loudness — a short clip is held and the rest are conformed (below). Thresholds are settings, provisional until M-1.
   **A take failing Gate 2 has no later gate** (S-031's reason: nothing to witness in a file that cannot be measured
   as a clip).
2. **Gate 3, text and sound** — the media port reads the clip's words and classifies its sound as speech or music,
   **from a script** in this feature. **Words are recorded and never fail** (S-041's reading). **Speech or music fails
   the take** (D-008: H3's sound is ambience only, and every prompt forbids both).
3. **Gate 4, the witness** — **one `observe` call, role `witness`, temperature 0, given the clip and nothing else**
   (I-8, D-051, D-053: one witness, whose input is here a clip). Its answer is parsed under **`ClipObservation`** —
   D-041's fields, D-044's `clippedByEdge`, and **the temporal block `actions` and `eventOrder`, required on a clip**.
   An answer that does not parse finishes the run `failed` (S-042). Its coverage is **`full`**, with the limitation that
   how the model samples a supplied clip is undocumented (D-051, I-6). It accepts once parsed.
4. **Gate 5, the brief** — **one `structured` call, role `reconciler`, temperature 0**, naming the take for its receipt,
   given the clip observation, the subjects the shot shows by id and name, and the take's criteria. It answers as
   S-040's reconciler does — each subject's entity or none and whether its count matches; each criterion shown or not,
   and by which entity — naming every subject and criterion given exactly once, with entities the witness gave (S-056),
   or it does not parse and the run fails. **Code fails the take** when:
   - a subject the shot shows is not shown;
   - a shown subject's count does not match (S-040's rule);
   - a claimed `mustShow` of either type is not shown;
   - a `mustNotShow` is shown.

   **A clipped entity does not fail a clip**: D-044's veto is the keyframe's, and a subject leaving a moving frame is
   motion. No Gate 4 or 5 input includes the expanded prompt (D-072).

**A take's outcome** is decided when Gate 2 fails or Gate 5 completes; **`accept` only when all four completed and
accepted**. A take whose gates were cut off keeps the gates it completed and no outcome. After Gate 3 fails, Gates 4 and
5 still run, so the record holds every reason (S-031's rule after the technical step). **Coverage** is on every verdict
(I-6): Gates 2 and 3 `whole file`, Gate 4 `full` with its limitation, Gate 5 `observation`.

### A take that fails (S-066, D-025)

**A take that fails Gate 2, 3 or 5 stops the run for a rule**: `rule` is `gate-2`, `gate-3` or `gate-5` — its lowest
failing gate — `step` is `video`, and the detail names the take and each failed gate's reasons, and says a shot gets one
take in this build. **No later shot's narration or clip is made**, and no `reel.assemble` row is created. Every
narration and take made is in the tables with the gates it reached.

### The render manifest (S-073, D-059, D-101)

Built by code (`renderManifest`) from the run's rows once the clips job has completed; **validated by its schema**; and
**written, with its hash, on the render row before the assembler is called**. With the files it names, it is **the
assembler's only input** — no database read, no settings read, no network. It holds:

- the run, a render id `a<attempt>-render`, **the output profile**, **the gate profile that ran** (S-067), the caption
  style, the duck level, and **a cost ledger** — image, narration and video cents;
- **every shot of the selected plan, in plan order, none removed** (I-12, D-025), each with: its shot id; its join mode,
  `cut` (S-067); its take, the provider's request id, the expanded prompt and the clip's path; **its opening** —
  `keyframe` with the picture's id; `text-to-video`, **not placed**, for a shot the plan gave no picture, with no
  reason; or `text-to-video`, **placed**, for a shot whose picture was degraded, with its degradation reason; its
  narration id, audio path and word timings; **the clip's measured facts**; its span, the picture frames used, and its
  hold; its conform notes; and **every verdict decided before assembly** — Gate 1 and 1S where its picture had them,
  Gates 2 to 5 — with coverage;
- **the captions**, in reel time.

**No end card** (D-101). **No type or field is named `manifest` alone** (D-059): a field holding one is
`renderManifest`. **The schema refuses** a manifest in which two shots hold one narration id (D-057), a shot with no
join mode (D-036), a placed `text-to-video` opening with no reason, and an unplaced one with a reason (S-073).
**Gate 7's verdict and the output's measure** are decided on the file the manifest made, so they are on the render row
beside it; **the reel's record is the render row with its manifest** (S-073 supersedes D-059 on both clauses).

### Spans, trims and holds (S-073, D-057, I-4, I-12)

- **A shot's span is its measured narration in frames**, `ceil(seconds × fps)`, starting where the shot before ends.
- **A clip with at least that many frames is trimmed at the tail** to the span — the ordinary case, no label.
- **A clip with fewer holds its last frame for the rest: a hold**, labelled in four places (I-4, S-058's form) — a
  `hold` row with its seconds and reason; **the take's row, whose degradation reason sits beside its verdicts**, as a
  degraded picture's does; the take's video receipt, marked degraded; and a `degraded` event — and carried on the shot's
  manifest entry, and listed after the stills' degradations in a completed result's `degradations` and in the record.

### The one pass (S-073, D-054, D-055, D-056, D-008)

**The assembler runs one ffmpeg invocation** that reads every clip and narration file the manifest names and writes one
MP4 at `<artifact root>/<runId>/<renderId>.mp4`:

- **the conform** reads each clip's geometry, frame rate, sample rate and channels **only from its measured facts in the
  manifest** — a video request carries none of them (D-055): scaled to fit the profile keeping its aspect, padded, its
  frame rate converted, its sound resampled to the profile's rate and layout. **A conform note is recorded for a pad, a
  frame-rate conversion and added silence**; a scale alone or a resample alone records none;
- **each shot**: its picture trimmed or held to its span; its clip's sound fitted to the span, silence where it has
  none, **lowered by the duck level** — a setting, default 18 dB — for the whole span, since the narration fills every
  span (D-008); its narration fitted to the span; the two mixed;
- **the shots joined by the `concat` filter inside that one filtergraph** — one decode, one encode; no concat demuxer
  or protocol, and nothing stream-copied (D-054);
- **captions burned** by the `ass` filter from a subtitles file the assembler writes beside the output from the
  manifest's captions: **one caption a narrated word, from its start to its end, offset by its shot's start** (D-008,
  D-057);
- **H.264 and AAC at the profile's geometry, frame rate, sample rate and channels, with `-movflags +faststart`** (D-055,
  D-056).

**The profile** is a setting defaulting to **768 × 1366 at 24 frames a second, 48 kHz, two channels**, provisional
until M-7. **The output is measured** (I-17) by the media port's probe — codecs, geometry, frame rate, sample rate,
channels, decoded frame count, and whether `moov` comes before `mdat` — and **a difference from the profile or from the
manifest's total frames, or `mdat` first, finishes the run `failed`**, naming it. No `.m3u8` or segment is written
(D-056); the engine returns the file's absolute path, and serving it to a viewer is the player's (S-073 supersedes D-056
on the `/media` route). **The assembler and the frame strip refuse a run or render id whose path would leave the
artifact root** (D-086).

**Checked by measurement, not by reading the manifest back** (S-073): each stand-in take carries a band keyed from its
take id, so **a shot boundary is the frame at which that band changes** in the output. A replay renders a stored
manifest again **under another artifact root**, never over the file it is compared with; and a manifest whose captions'
text alone is changed renders with the same boundaries — D-054's caption test, which needs no edit op.

### Gate 7 (S-074, D-058, D-051, D-064)

Once the output is measured:

- **the media port extracts a frame strip** — for each shot, the frames at the start, the middle and the end of its
  span — as PNGs `<artifact root>/<runId>/<renderId>-frame-<n>.png`;
- **one `judgeCut` call, role `judge`, temperature 0**, given each shot in timeline order with its frames and its
  sentences, and **five closed questions**, a setting provisional until M-1: whether the shots are in a sensible order;
  whether the pacing works; whether anything is badly placed beside what follows it; whether the burned captions follow
  the narration; and whether no shot repeats what another shows;
- its answer names every question once, `yes` or `no`, or it does not parse and the run fails. **Any `no` fails Gate
  7** (I-16). The verdict records coverage `frames` with their number, the answer, and the questions answered `no`;
- **a failure stops the run for rule `gate-7` at step `video`**: the file and render row stay, the result carries no
  video, and no question is written. No edit op exists to try first (S-066) — they are `video-edits`'.

### Spending (S-035, S-036, S-059, S-070, S-071)

**Every narration and clip call goes through a guarded port**, the only one the clips stage is handed (S-021):

- **before each call**, the chain's spend is read again (D-081), and the spend plus the call's figure — the text's
  characters × the narration rate, or the requested seconds × the video rate — rounded up (S-053), is compared with
  **the per-reel cap the job read, then the ceiling**; above either, the call is **refused** with that limit and figure
  (S-035). Exactly equal is made;
- **a call refused is not made**: the stage returns stopped for budget with everything made so far; the run finishes
  **`stopped`, `reason: 'budget'`**, with the limit, `estimateCents`, the ceiling, the cap and `costCents` the spend. **A
  stop at the cap appends one entry to the questions file** after the run finishes, under its own heading naming the
  clip or the narration (S-026, S-035); a stop at the ceiling writes none;
- **after each call**, in one transaction: its receipt with the rate applied, its cost added to the job row, and its
  take's or narration's row (S-036).

**What a stand-in costs** (S-036): 0 cents unless a test scripts a cost. **The narration rate defaults to 0** — T2A is
covered by the token plan (D-019) — and **the video rate is `PlanSettings.videoRateCentsPerSecond`**, the rate the
estimate used. The assemble job buys nothing, and Gate 7's model call, like every gate's, is plan-covered (D-052).

### How a video run ends (S-069, S-046)

`makeClips` and `cutReel` **never reject**: a thrown call, a refused parse or a bug becomes `failed`, with the detail.
**Takes and narrations are written as they go** — each row with its receipt, then updated through the clips recorder as
each measure and gate completes — so the tables keep every clip and narration made, with each gate reached, whatever
ends the run.

- **Completed** → `status: 'completed'`, `until: 'video'`, `estimateCents` the selected plan's, `costCents` the spend,
  `stills` the chosen pictures in shot order, **`video` the render's absolute path under the artifact root**, and
  `degradations` — the stills' in the order reached, then the holds' in shot order.
- **Stopped for a rule** → `step: 'video'`, `rule` one of `gate-2`, `gate-3`, `gate-5`, `gate-7`. **Stopped for budget,
  failed, cancelled** → as above and as `reel-stills`.
- **Events of an admitted `video` run**, after the plan stage's:
  - from the keyframes job: S-046's for `stills`; if the stills stage completes, `stage.finished` for `stills`;
  - from the clips job: cancelled — `run.finished`; otherwise `stage.started` for `video`, then for each shot in plan
    order a `verdict` for gates `'2'`, `'3'`, `'4'` and `'5'` with its `shotId`, each once its gate completes; then — a
    take failing, a stop for budget, or a failure: `run.finished`; an unclaimed `mustShow` no take shows: a `verdict`
    for gate `'5'`, outcome `fail`, with no `shotId`, then `run.finished`; completed: nothing more from this job;
  - from the assemble job: cancelled — `run.finished`; otherwise a `degraded` event for each hold in shot order once
    the manifest is built, a `verdict` for gate `'7'` with no `shotId` once decided, then `stage.finished` for `video`
    and `run.finished` if it accepts, or `run.finished` if it fails or the job fails.
- **A stage that did not complete has no `stage.finished`** (S-025). **Only the finishing attempt's verdicts become
  events.** A hold's four labels are written with whatever ending the assemble job reaches (S-058).

### Cancel, and a restart (S-027, S-076, D-081)

- **Cancel** is read with the stage's start, in one transaction, before every attempt of the clips job and of the
  assemble job. Set → the run finishes `cancelled`, `costCents` the spend, and no further call is made. A cancel during a
  stage does not stop it.
- **A clips job claimed again** after its lease runs out **runs from the start with the next attempt, making every
  narration and take again and paying again** (S-048's answer, applied to clips): the earlier attempt's rows, receipts,
  files and cost stay, with the gates each take reached and no outcome where one was cut off; the guard counts its
  cost; `stage.started` for `video` is not written twice.
- **An assemble job claimed again** builds its manifest again from the same rows under the next attempt's render id,
  and writes a new render row and file; the earlier ones stay, and no paid call can be made.
- **A worker that dies between two jobs** leaves the next row queued; the next worker claims it, and the job before is
  not run again (D-081).

### The ports (S-070 to S-075)

- **`VideoPort`** — `generate(request)`, where the request is `image-to-video` with the chosen picture, or
  `text-to-video` with `aspectRatio: '9:16'`, answers **`made`** with the clip and a receipt — model, the provider's
  request id, cost, `fake`, expanded prompt — or **`refused`**, which only the guard answers.
- **`NarrationPort`** — `speak(request)` answers **`made`** with the audio, timings typed `unknown`, and a receipt, or
  **`refused`**.
- **`MediaPort`** (S-075) — `ready`; **`probe`** any file, including whether an MP4's `moov` precedes its `mdat`;
  **`scan`** a clip for black and frozen stretches at least as long as the thresholds it is handed, silent stretches and
  loudness; **`readText`** and **`listen`** a clip; **`frames`** from the output. The ffmpeg adapter's probe, scan and
  frames are real; its `readText` and `listen` answer from a script, defaulting to no words and neither speech nor
  music, and any method can be scripted to throw.
- **`AssemblerPort`** (S-075) — `ready`; **`assemble(manifest)`**, answering the output's path and the invocations it
  ran.
- **`LanguageModelPort`** carries **four calls**: `structured` gains optional `takeIds` for its receipt; **`observe`
  takes a picture or a clip, and a temperature, and nothing else** (S-072); **`judgeCut`** takes the shots' frames and
  sentences, the questions and a temperature, role `judge` (S-074). **`ModelReceipt`** gains **`takeIds`**: a take's
  observation and reconciliation are tied to the one `witness` and the one `reconciler` receipt whose `takeIds` is
  that take's (S-037's form). The model stand-in keeps `observe` calls on clips in their own list, so `reel-stills`'
  check 26 reads what it always did.
- **`ClipsRecorder`** — `take(take)` and `narration(narration)`: the clips stage's way to make its progress durable,
  handed to it like every port.

**The stand-ins**, each answering from a script a test supplies and holding no durable state: **video** (above);
**narration** — a WAV of a steady 660 Hz tone, each word 300 ms of timing followed by a 200 ms gap, the file as long as
its timings, scriptable per shot for the word and gap lengths, the timings it reports, a cost and a throw; **model** —
`observe` on a clip from the `witness` script and `judgeCut` from the `judge` script, in call order.

### ffmpeg and ffprobe (S-075)

- **Found on PATH by name** — the adapters' `ffmpeg` and `ffprobe` settings default to `'ffmpeg'` and `'ffprobe'`. No
  path is written in the repository (D-086). Nothing here installs them.
- **`ready()`** on the media port and on the assembler runs both tools, reads their encoders and filters, and **rejects
  naming the first thing missing**: a tool that cannot be run, `libx264`, `aac`, or a filter the scan, the pass or the
  strip uses. **`startWorker` awaits both before opening its database, and refuses to start with that reason** — no job
  is claimed. **What is remembered, once per process for a pair of tool names, is what the tools said** — each one's
  `-version`, `-encoders` and `-filters` output, or that it could not be run — so the many workers a suite starts do not
  each spawn the tools again; **every `ready()` compares its own required encoders and filters against that**, so a port
  asking for a filter the tools lack is refused whatever passed before it.
- **The worker requires the video, narration and media ports and the assembler from Slice 3**, when their stand-ins and
  adapters exist, as `reel-stills` required its image and sensor ports from its third slice.
- **The pipeline never touches them**: `pipeline-no-io` forbids `child_process` there, and **only `packages/providers`
  may import it at all** (below).

### Media files (D-086, D-087)

Every file this feature writes — narration audio, clips, subtitles, the output and its frames — is **real** and lies
under **the one artifact root, in a folder for the run**. The root is one setting each adapter and stand-in is built
with, defaulting to `.artifacts/` at this repository's root, which `.gitignore` names; **every test points it at a
temporary folder** but one case of check 19. Each refuses an id whose path would leave the root. **No file is
removed**: an interrupted attempt's files stay. Paths in rows, receipts, manifests and results are absolute. **Nothing
media is committed** (D-087).

### Storage (D-001, D-005, D-028, D-059, I-4)

**Slice 1's migration** adds `model_receipt.take_ids`, default `'[]'` — every row before it names no take (S-055's
form) — so the port's new field is never recorded without a column. **Slice 3's migration** adds:

- `narration` — run id, narration id, attempt, shot unit, text, path, word timings or none, the measure or none;
- `speech_receipt` — id, run id, narration id, model, characters, rate applied, cost cents, `fake`, time;
- `take` — run id, take id, attempt, shot unit, take number, mode, picture id or none, degraded, prompt, requested
  seconds, seed, request id, expanded prompt, path, the probe, the scan, words, sound, each gate's verdict with coverage,
  outcome or none, **the degradation reason of a hold or none**;
- `video_receipt` — id, run id, take id, model, mode, resolution, requested seconds, **aspect ratio or none**, seed,
  request id, prompt, expanded prompt, expansion mode, **style id and version**, rate applied, cost cents, `fake`,
  degraded, time;
- `take_observation` — id `obs-<takeId>`, run id, take id, the observation;
- `take_reconciliation` — id `rec-<takeId>`, run id, take id, the answer and the failure reasons;
- `render` — run id, render id, attempt, the render manifest and its hash, the output path, the profile, the
  invocations, the measure, started and finished times, Gate 7's verdict;
- `hold` — run id, render id, shot id, seconds, reason — **its own table, so "every run with a held shot" is a query**
  (I-4, D-025).

**The record route** is unchanged but for its degradations: the `degradation` rows in the order written, then the holds
of the run's latest render in shot order. **The contract's record lists pictures only**; takes are in the tables above
(`reel-contract`'s _Pending_ item 1 goes to `reel-takes`).

### The boundary rules (S-075)

**One rule added, `processes-only-in-providers`**: nothing under `packages/` or `apps/` outside `packages/providers`
imports `child_process`. Its `drift:prove` cases import the module under both its spellings, `child_process` and
`node:child_process`, from `apps/worker`, `apps/api` and `packages/domain` — in `drift.mjs`' list of cases by file,
beside `pipeline-no-io`'s `node:fs`, since a built-in module has no package for the by-name cases to place. Eighteen
rules become **nineteen**, and `CLAUDE.md`'s count follows. **No folder rule names a new folder**, so
`drift --audit` is unaffected. **What the rules do not catch, stated:** a request built from a value typed `any` —
which is why the validator runs at the port, not only in the type.

### What this feature changes in verified features (S-077)

- **`reel-plan`**: check 10, _"until 'video' is refused"_, asserts `video` accepted, and **keeps every assertion it made
  of its refusal** — `422`, `unsupported`, the `requestId` echoed, _"not built yet"_, no `runId`, nothing stored — made
  of `planVaryOn: 'order'`, the one request still refused as `unsupported`; check 29, `GATE_ORDER`, asserts
  `['0', '1', '1S', '2', '3', '4', '5', '7']`; check 3 asserts four calls; `reel-plan-run.test.ts` and
  `reel-plan-service.test.ts` send `planVaryOn: 'order'` for their refusal. Its file gains a note naming S-077 (Slice 2).
- **`reel-stills`**: check 8's `video` clause asserts acceptance; check 5 asserts the new `GATE_ORDER`. Its file gains
  a note (Slice 2).
- **`reel-contract`**: nothing in its package; its file gains a note in Slice 4, when the real engine first answers
  `until: 'video'`.
- **Code and test support, none of it an assertion**: `ModelReceipt.takeIds` in the model stand-in, `recordReceipt`
  writing `take_ids`, `recording-port.ts` recording `judgeCut`, and `worker-process.ts`' port carrying `judgeCut` with
  its held call counted over four calls (Slice 1 — `tests/` is type-checked, so the port that grows a call and every
  implementation of it change together); the keyframes and plan jobs and the API (Slice 2); the worker's required
  ports, and the harness and the child worker building them with a small test profile (Slice 3); `readRecord` listing
  holds (Slice 4); `CLAUDE.md`'s rule count (Slice 1) and its ports and ffmpeg (Slice 3).

**No assertion is removed**; each change is made in the slice that forces it, and the three verified journeys are run
again in Slice 6.

## Gate 3 — Program design

**File locations**, in the engine repository.

- `packages/contracts/src/clip.ts` — `ClipRef`, `VideoRequest`, `VideoReceipt`, `VideoAnswer`, `VideoPort`,
  `MediaProbe`, `ClipScan`, `ClipSound`, `MediaPort`, `ClipObservation`, `ClipReconciliation`, `TakeVerdict`,
  `TakeRecord`, `ClipsRecorder`.
- `packages/contracts/src/narration.ts` — `WordTiming`, `NarrationRequest`, `NarrationReceipt`, `NarrationAnswer`,
  `NarrationPort`, `NarrationRecord`.
- `packages/contracts/src/render.ts` — `OutputProfile`, `GateProfile`, `Caption`, `RenderShot`, `RenderManifest`,
  `AssembledFile`, `AssemblerPort`, `CutVerdict`.
- `packages/contracts/src/model.ts` — `observe` on a clip, `judgeCut`, `ModelCall`, `ModelReceipt.takeIds`.
- `packages/contracts/src/settings.ts` — `RenderSettings`.
- `packages/pipeline/src/admit.ts` — `admitVideo`.
- `packages/pipeline/src/clips/index.ts` — `makeClips`; `clips/criteria.ts` — `takeCriteria`; `clips/prompts.ts` —
  `clipPrompt`, `NEGATIVE_AUDIO`, the reconcile prompt and answer schema for a take; `clips/validate.ts` —
  `validateVideoRequest`; `clips/narration.ts` — `narrationText`, `wordTimings`, `requestedSeconds`;
  `clips/observation.ts` — `clipObservation`.
- `packages/pipeline/src/gates/index.ts` — `GATE_ORDER`; `gates/gate2.ts`, `gates/gate3.ts`, `gates/gate4.ts`,
  `gates/gate5.ts` — the take's gates; `gates/gate7.ts` — Gate 7.
- `packages/pipeline/src/render/manifest.ts` — `renderManifest`, `renderManifestSchema`; `render/index.ts` — `cutReel`
  and **`DEFAULT_RENDER_SETTINGS`**, whose gate profile is `{ id: 'phase-1', gates: GATE_ORDER }` — as
  `DEFAULT_STILLS_SETTINGS` sits beside `makeStills` — and which the worker defaults to.
- `packages/providers/src/fake/video.ts` — `fakeVideo`; `fake/narration.ts` — `fakeNarration`; `fake/model.ts` —
  `observe` on a clip and `judgeCut`.
- `packages/providers/src/ffmpeg/tools.ts` — `ffmpegTools`; `ffmpeg/media.ts` — `ffmpegMedia`; `ffmpeg/assemble.ts` —
  `ffmpegAssembler`.
- `packages/domain/src/schema.ts`; `db/migrations/0002_*` — `model_receipt.take_ids` (Slice 1); `db/migrations/0003_*`
  — the narration, take, render and hold tables and their receipts (Slice 3); `clips.ts` — `recordNarration`,
  `recordClip`, `upsertNarration`, `upsertTake`, `readClipsInputs`, `readRenderInputs`; `runs.ts` — `recordReceipt`
  writing `take_ids`, `CLIPS_JOB`, `ASSEMBLE_JOB`, `advanceStills`, `advanceClips`, `startRender`, `finishVideo`;
  `pictures.ts` — `readRecord` listing holds.
- `apps/api/src/server.ts` — `video` accepted.
- `apps/worker/src/plan-job.ts` — admission of a `video` run; `keyframes-job.ts` — advancing; `clips-job.ts`;
  `assemble-job.ts`; `video-port.ts` — the validating, guarded video port; `narration-port.ts` — the guarded narration
  port; `clips-recorder.ts`; `recording-port.ts` — `judgeCut`; `questions.ts` — the clip and narration stop entry;
  `worker.ts` — the four ports, `renderSettings`, `ready`, four job kinds.
- `.dependency-cruiser.cjs` and `scripts/drift.mjs` — `processes-only-in-providers` and its `--prove` cases.
- `tests/reel-render-*.test.ts` — the journey's tests (S-016); `tests/engine/` — media fixtures and readers.

**Signatures.**

```ts
// packages/contracts/src/clip.ts — S-071, S-072
import type { RunResult } from '@cutroom/reel-contract'
import type { PictureRef, WitnessObservation } from './picture.ts'

export interface ClipRef {
  takeId: string // a<attempt>-shot-<unit>-take-<n>
  path: string // absolute, under the artifact root (D-086)
}
interface VideoRequestFields {
  runId: string
  takeId: string
  prompt: string
  durationSeconds: number // whole, 5..15 (D-019, S-023, S-070)
  resolution: '768P' // D-007, D-014
  seed: number // the take id's CRC-32, made by the caller (D-018)
  promptExpansionMode: string // recorded on every receipt (D-072)
}
export type VideoRequest =
  | (VideoRequestFields & { mode: 'image-to-video'; image: PictureRef; aspectRatio?: never })
  | (VideoRequestFields & { mode: 'text-to-video'; aspectRatio: '9:16'; image?: never })
export interface VideoReceipt {
  model: string
  requestId: string
  costCents: number // 0 from the stand-in unless scripted (S-036)
  fake: boolean
  expandedPrompt: string
}
export type VideoAnswer =
  | { kind: 'made'; clip: ClipRef; receipt: VideoReceipt }
  | {
      kind: 'refused' // only the worker's guard refuses (S-035)
      limit: Extract<RunResult, { reason: 'budget' }>['limit']
      estimateCents: number
    }
export interface VideoPort {
  generate(request: VideoRequest): Promise<VideoAnswer>
}

export interface MediaProbe {
  readable: boolean
  durationSeconds: number
  video: { codec: string; width: number; height: number; fps: number; frames: number } | null
  audio: { codec: string; sampleRate: number; channels: number } | null
  moovFirst: boolean | null // for an MP4: does moov precede mdat (D-056); null otherwise
}
export interface ClipScan {
  black: Array<{ startSeconds: number; seconds: number }> // each at least the blackSeconds handed in
  frozen: Array<{ startSeconds: number; seconds: number }> // each at least the frozenSeconds handed in
  silent: Array<{ startSeconds: number; seconds: number }>
  loudnessLufs: number | null
}
export interface ClipSound {
  speech: boolean
  music: boolean
}
export interface MediaPort {
  ready(): Promise<void> // rejects naming a missing tool, encoder or filter (S-075)
  probe(file: { id: string; path: string }): Promise<MediaProbe>
  scan(clip: ClipRef, shortest: { blackSeconds: number; frozenSeconds: number }): Promise<ClipScan>
  readText(clip: ClipRef): Promise<string[]>
  listen(clip: ClipRef): Promise<ClipSound>
  frames(
    file: { runId: string; renderId: string; path: string },
    atSeconds: readonly number[],
  ): Promise<PictureRef[]> // PNGs under the artifact root; refuses an id leaving it
}

export type ClipObservation = WitnessObservation & {
  actions: Array<{ entity: string; verb: string; completes: boolean }> // required on a clip (D-041)
  eventOrder: string[]
}
export interface ClipReconciliation {
  subjects: Array<{ id: string; entity: number | null; countMatches: boolean }>
  criteria: Array<{ id: string; shown: boolean; entity: number | null }>
  failed: string[] // computed by code (S-072)
}
type Outcome = 'accept' | 'fail'
export interface TakeVerdict {
  gate: '2' | '3' | '4' | '5'
  outcome: Outcome
  reasons: string[]
  coverage:
    | { strategy: 'whole file' }
    | { strategy: 'full'; limitations: string[] } // Gate 4 (D-051)
    | { strategy: 'observation' }
}
export interface TakeRecord {
  takeId: string
  attempt: number // the clips job's attempt
  shotUnit: number
  number: 1 // one take a shot in this feature (S-066)
  mode: VideoRequest['mode']
  pictureId: string | null // the chosen picture of an image-to-video take
  degraded: boolean // text-to-video because the shot's picture was degraded (D-050 step 2)
  prompt: string
  durationSeconds: number
  seed: number
  requestId: string
  expandedPrompt: string
  path: string
  probe: MediaProbe | null
  scan: ClipScan | null
  words: string[] | null
  sound: ClipSound | null
  observation: ClipObservation | null
  reconciliation: ClipReconciliation | null
  verdicts: TakeVerdict[] // in gate order, each once completed
  outcome: Outcome | null // null until Gate 2 fails or Gate 5 completes
  degradation: string | null // a hold's reason, written with the assemble job's ending (S-073)
}
export interface ClipsRecorder {
  take(take: TakeRecord): Promise<void> // upsert, after every change
  narration(narration: NarrationRecord): Promise<void>
}

// packages/contracts/src/narration.ts — S-070
export interface WordTiming {
  word: string
  startMs: number
  endMs: number
}
export interface NarrationRequest {
  runId: string
  narrationId: string // a<attempt>-shot-<unit>-narration
  text: string // the unit's sentences, in order, joined by one space
  voice: string
}
export interface NarrationReceipt {
  model: string
  characters: number
  costCents: number
  fake: boolean
}
export type NarrationAnswer =
  | {
      kind: 'made'
      audio: { narrationId: string; path: string }
      timings: unknown // parsed by the pipeline (S-070)
      receipt: NarrationReceipt
    }
  | {
      kind: 'refused'
      limit: Extract<RunResult, { reason: 'budget' }>['limit']
      estimateCents: number
    }
export interface NarrationPort {
  speak(request: NarrationRequest): Promise<NarrationAnswer>
}
export interface NarrationRecord {
  narrationId: string
  attempt: number
  shotUnit: number
  text: string
  path: string
  words: WordTiming[] | null // once parsed
  probe: MediaProbe | null // once measured
}

// packages/contracts/src/render.ts — S-067, S-073, S-074
export interface OutputProfile {
  container: 'mp4'
  videoCodec: 'h264'
  audioCodec: 'aac'
  width: number
  height: number
  fps: number
  sampleRate: number
  channels: number
}
export interface GateProfile {
  id: string // 'phase-1'
  gates: readonly string[] // GATE_ORDER; a worker handed other gates refuses to start (S-067)
}
export interface Caption {
  text: string
  startMs: number // reel time
  endMs: number
}
export interface RenderShot {
  shotId: string
  joinMode: 'cut' // required (S-067)
  takeId: string
  requestId: string
  expandedPrompt: string
  clipPath: string
  opening:
    | { kind: 'keyframe'; pictureId: string }
    | { kind: 'text-to-video'; placed: false } // the plan gave the shot no picture (D-027)
    | { kind: 'text-to-video'; placed: true; degradation: string } // its picture was degraded (D-050)
  narrationId: string
  narrationPath: string
  words: WordTiming[] // unit time
  clip: MediaProbe // measured (D-055)
  startFrame: number
  frames: number // the span: ceil(narration seconds × fps) (S-073)
  pictureFrames: number // at most frames
  hold: { frames: number; seconds: number; reason: string } | null
  conform: string[]
  verdicts: Array<{ gate: string; outcome: Outcome; coverage: unknown }> // decided before assembly
}
export interface RenderManifest {
  runId: string
  renderId: string // a<attempt>-render
  profile: OutputProfile
  gateProfile: GateProfile // the profile that ran (D-052)
  captionStyle: { id: string; fontName: string; fontSize: number; marginV: number }
  duckDb: number
  ledger: { imageCents: number; narrationCents: number; videoCents: number }
  shots: RenderShot[] // every shot of the selected plan, in plan order (I-12)
  captions: Caption[]
  totalFrames: number
}
export interface AssembledFile {
  path: string // <artifact root>/<runId>/<renderId>.mp4
  invocations: ReadonlyArray<readonly string[]> // exactly one (D-054)
}
export interface AssemblerPort {
  ready(): Promise<void>
  assemble(renderManifest: RenderManifest): Promise<AssembledFile> // refuses an id leaving the root
}
export interface CutVerdict {
  outcome: Outcome
  coverage: { strategy: 'frames'; frames: number } // I-6
  answer: Array<{ question: string; answer: 'yes' | 'no' }>
  reasons: string[] // the questions answered no
}

// packages/contracts/src/model.ts — S-072, S-074
export type ModelCall = 'structured' | 'observe' | 'compare' | 'judgeCut'
export interface ModelReceipt {
  // … as reel-stills built it, and:
  takeIds: readonly string[] // the takes a call was about (S-072)
}
export interface LanguageModelPort {
  structured<T>(call: {
    prompt: string
    schema: z.ZodType<T>
    role: 'planner' | 'reconciler'
    temperature: 0
    pictureIds?: readonly string[]
    takeIds?: readonly string[] // ids for the receipt; never a clip
  }): Promise<{ value: T; receipt: ModelReceipt }>
  observe(
    call:
      | { picture: PictureRef; clip?: never; temperature: 0 }
      | { clip: ClipRef; picture?: never; temperature: 0 },
  ): Promise<{ value: unknown; receipt: ModelReceipt }>
  compare(call: {
    pictures: readonly [PictureRef, PictureRef]
    subjects: readonly string[]
    temperature: 0
  }): Promise<{ value: unknown; receipt: ModelReceipt }>
  judgeCut(call: {
    shots: ReadonlyArray<{
      shotId: string
      sentences: readonly string[]
      frames: readonly PictureRef[]
    }>
    questions: readonly string[]
    temperature: 0
  }): Promise<{ value: unknown; receipt: ModelReceipt }> // role judge; pictureIds the frames' (S-074)
}

// packages/contracts/src/settings.ts
export interface RenderSettings {
  profile: OutputProfile // default 768 × 1366, 24 fps, 48 kHz, 2 channels; provisional until M-7
  gateProfile: GateProfile // default { id: 'phase-1', gates: GATE_ORDER } (S-067)
  narrationRateCentsPerCharacter: number // default 0 (D-019)
  voice: string
  promptExpansionMode: string // default 'balanced' (D-072, O-20)
  technical: { aspectTolerance: number; blackSeconds: number; frozenSeconds: number } // 0.01, 0.5, 1.0 — until M-1
  captionStyle: { id: string; fontName: string; fontSize: number; marginV: number }
  duckDb: number // default 18
  cutQuestions: readonly [string, string, string, string, string] // provisional until M-1
}

// packages/pipeline/src/admit.ts — S-069
export function admitVideo(
  plan: Pick<Plan, 'estimateCents'>,
  budgetCents: number,
): { admitted: boolean; estimateCents: number }

// packages/pipeline/src/gates/
export const GATE_ORDER = ['0', '1', '1S', '2', '3', '4', '5', '7'] as const

// packages/pipeline/src/clips/ — S-070, S-071, S-072
export const NEGATIVE_AUDIO: string // 'No dialogue, no speech, no music.\nnon_diegetic_music: N/A'
export function narrationText(
  shotUnit: number,
  plan: Pick<Plan, 'units'>,
  request: SubmitRequest,
): string
export function wordTimings(text: string, measuredSeconds: number): z.ZodType<WordTiming[]>
export function requestedSeconds(measuredSeconds: number): number // ceil, clamped to 5..15
export function takeCriteria(
  shotUnit: number,
  plan: Pick<Plan, 'units'>,
  request: SubmitRequest,
): { mustShow: Criterion[]; mustNotShow: Criterion[]; unclaimed: Criterion[] }
export function validateVideoRequest(request: VideoRequest): string[] // reasons; empty passes (D-071)
export const clipObservation: z.ZodType<ClipObservation>

type Verdict = Extract<RunEvent, { type: 'verdict' }>
type Refused = Extract<VideoAnswer, { kind: 'refused' }>
export type ClipsEvent = Pick<Verdict, 'type' | 'gate' | 'outcome' | 'shotId'>
export interface ClipsRecord {
  narrations: NarrationRecord[] // this attempt's, in the order made
  takes: TakeRecord[]
  events: ClipsEvent[] // in the order the gates ran
}
export type ClipsOutcome = ClipsRecord &
  (
    | { kind: 'completed' }
    | { kind: 'stopped-rule'; rule: 'gate-2' | 'gate-3' | 'gate-5'; detail: string }
    | ({ kind: 'stopped-budget' } & Pick<Refused, 'limit' | 'estimateCents'>)
    | { kind: 'failed'; detail: string }
  )
export function makeClips(
  input: {
    runId: string
    attempt: number
    request: SubmitRequest
    plan: Plan
    stills: ReadonlyArray<{
      pictureId: string
      shotUnit: number
      path: string
      observation: WitnessObservation
    }> // the chosen pictures
    degradedShots: readonly number[] // D-050 step 2
  },
  ports: {
    video: VideoPort // validating and guarded
    narration: NarrationPort // guarded
    media: MediaPort
    model: LanguageModelPort // recording
    recorder: ClipsRecorder
  },
  settings: { plan: PlanSettings; render: RenderSettings },
): Promise<ClipsOutcome> // never rejects

// packages/pipeline/src/render/ — S-073, S-074
export const renderManifestSchema: z.ZodType<RenderManifest>
export function renderManifest(
  input: {
    runId: string
    attempt: number
    plan: Plan
    request: SubmitRequest
    stills: ReadonlyArray<{ pictureId: string; shotUnit: number; verdicts: RenderShot['verdicts'] }>
    degradations: ReadonlyArray<{ shotId: string; reason: string }> // the stills stage's
    takes: readonly TakeRecord[] // the finishing clips attempt's, one accepted a shot
    narrations: readonly NarrationRecord[] // the same attempt's
    ledger: RenderManifest['ledger']
  },
  settings: RenderSettings,
): RenderManifest // throws on rows that cannot make one; the worker fails the run
export type CutOutcome = {
  assembled: AssembledFile | null
  measured: MediaProbe | null
  frames: PictureRef[]
  gate7: CutVerdict | null
} & (
  | { kind: 'completed' }
  | { kind: 'stopped-rule'; rule: 'gate-7'; detail: string }
  | { kind: 'failed'; detail: string }
)
export function cutReel(
  input: { renderManifest: RenderManifest },
  ports: { assembler: AssemblerPort; media: MediaPort; model: LanguageModelPort },
  settings: RenderSettings,
): Promise<CutOutcome> // never rejects; handed no paid port (I-18)

// packages/providers/src/ffmpeg/ — S-075
export function ffmpegTools(options?: {
  ffmpeg?: string // default 'ffmpeg', found on PATH
  ffprobe?: string // default 'ffprobe'
  requiredFilters?: readonly string[] // default: every filter the scan, the pass and the strip use
}): FfmpegTools // the tools' answers remembered per process by name; each ready() checks its own list
export function ffmpegMedia(
  tools: FfmpegTools,
  options?: { artifactRoot?: string; script?: FakeMediaScript },
): MediaPort & { readonly calls: readonly MediaCall[] }
export function ffmpegAssembler(
  tools: FfmpegTools,
  options?: { artifactRoot?: string },
): AssemblerPort & { readonly renderManifests: readonly RenderManifest[] }

// packages/providers/src/fake/
export function fakeVideo(
  tools: FfmpegTools,
  script: FakeVideoScript,
  options?: { artifactRoot?: string },
): VideoPort & { readonly calls: readonly VideoRequest[] }
export function fakeNarration(
  script: FakeNarrationScript,
  options?: { artifactRoot?: string },
): NarrationPort & { readonly calls: readonly NarrationRequest[] }

// packages/domain/src/runs.ts — S-069
export const CLIPS_JOB = 'reel.clips'
export const ASSEMBLE_JOB = 'reel.assemble'
export function advanceStills(
  db: Db,
  a: {
    runId: string
    jobId: number
    chosen: readonly string[]
    degraded: readonly DegradedShot[]
    events: readonly EventBody[]
  },
): number // the reel.clips row
export function advanceClips(
  db: Db,
  a: { runId: string; jobId: number; events: readonly EventBody[] },
): number // the reel.assemble row
export function startRender(
  db: Db,
  r: {
    runId: string
    jobId: number
    attempt: number
    renderManifest: RenderManifest
    hash: string
  },
): void // the start time I-18's check reads
export function finishVideo(
  db: Db,
  f: {
    runId: string
    jobId: number
    result: RunResult
    events?: readonly EventBody[]
    render?: {
      renderId: string
      holds: ReadonlyArray<{ shotId: string; takeId: string; seconds: number; reason: string }>
      assembled: AssembledFile | null
      measured: MediaProbe | null
      gate7: CutVerdict | null
    }
  },
): void // the job done, its cost kept; a hold's four labels with any ending

// packages/domain/src/clips.ts — S-070, S-071, S-072
export function recordNarration(
  db: Db,
  e: {
    jobId: number
    runId: string
    narration: NarrationRecord
    rateCentsPerCharacter: number
    receipt: NarrationReceipt
  },
): void // receipt, job cost and row, in one transaction
export function recordClip(
  db: Db,
  e: {
    jobId: number
    runId: string
    take: TakeRecord
    request: VideoRequest // its aspect ratio and expansion mode, for the receipt
    style: { id: string; version: number } // D-069
    rateCents: number
    receipt: VideoReceipt
  },
): void // receipt, job cost and row, in one transaction
export function upsertNarration(db: Db, runId: string, n: NarrationRecord): void
export function upsertTake(db: Db, runId: string, t: TakeRecord): void // measures, gates, rows; never its identity
export function readClipsInputs(
  db: Db,
  runId: string,
): Pick<Parameters<typeof makeClips>[0], 'stills' | 'degradedShots'>
export function readRenderInputs(
  db: Db,
  runId: string,
): Omit<Parameters<typeof renderManifest>[0], 'runId' | 'attempt' | 'plan' | 'request'>

// apps/worker/src/worker.ts — S-021, S-038, S-067, S-075
export interface WorkerOptions {
  // … as reel-stills built it; from Slice 1:
  renderSettings?: RenderSettings // a gate profile other than GATE_ORDER refuses to start
  // and, required from Slice 3:
  video: VideoPort
  narration: NarrationPort
  media: MediaPort
  assembler: AssemblerPort
}
```

A `stopped-budget` outcome carries the guard's limit and estimate, typed from `VideoAnswer` and `NarrationAnswer`, which
type them from the contract's `RunResult` — **no budget type is declared outside `@cutroom/reel-contract`** (D-094). The
worker builds its guarded ports per job attempt, knowing the cap it read and the ceiling, so the row each writes with its
receipt carries the take's or the narration's identity. `FfmpegTools`, `FakeMediaScript`, `MediaCall`,
`FakeVideoScript` and `FakeNarrationScript` are declared beside their adapters and exported from `@cutroom/providers`
for whoever starts the worker. **The pipeline is not imported by the domain**: `readClipsInputs` and
`readRenderInputs` are typed from `@cutroom/contracts` in the code, and `Parameters<…>` above only says what they
return.

**Checks, written before the code.** One journey, `reel-render` (D-020), counting `tests/reel-render-*.test.ts` (S-016).
**Each check is owned by the slice that produces it** (Gate 4). Every test that starts the service points its database,
questions file and artifact root at a temporary folder, but check 19's second half; every test but check 31's last case
sets a small output profile. **Where a check reads the output, it measures the file** — a shot boundary is the frame at
which the stand-in's take-keyed band changes — and never reads the manifest back as its own evidence.

_The ports, the shapes and the rule_

1. `compiled by TypeScript in the test: a text-to-video request without aspectRatio, an image-to-video request without an image or with an aspectRatio, a reference-to-video mode, a resolution other than 768P and an end image are each a type error; observe given a clip and a prompt, or a picture and a clip together, and judgeCut given a schema or a role, are each a type error; and the calls as Gate 3 writes them compile` — D-007, D-018, D-026, D-037, D-053, I-8, S-071, S-072, S-074.
2. `processes-only-in-providers fires in drift:prove on an import of child_process and of node:child_process from each of apps/worker, apps/api and packages/domain, and drift, drift:prove and drift --audit pass` — S-075.
3. `GATE_ORDER equals ['0', '1', '1S', '2', '3', '4', '5', '7'], asserted as data; the default gate profile is phase-1 with exactly those gates, and a worker handed a profile with other gates refuses to start and claims no job; and LanguageModelPort's calls are exactly structured, observe, compare and judgeCut` — D-049, D-052, D-063, S-067, S-068, S-074, S-077.
4. `the clip observation schema requires actions, eventOrder and clippedByEdge, and the still's observation schema still refuses actions and eventOrder` — D-041, D-044, D-053.
5. `the render manifest schema refuses a manifest in which two shots hold one narration id, a shot with no join mode, a placed text-to-video opening with no degradation reason, and an unplaced one with a reason; and no type or field in packages/ or apps/ is named manifest or endCard — green before any code, since nothing is named either yet` — D-036, D-057, D-059, D-101, S-067, S-073.
6. `the validator refuses a video request whose prompt lacks the negative audio block, and a text-to-video request without aspectRatio 9:16 — the worker's video port throws, and a recording port it wraps receives no call — and passes a request carrying both` — D-008, D-071, I-19, S-071.

_Asking for a video, and the chain_

7. `a submit with until 'video' is accepted with a runId; and one with planVaryOn 'order' is refused 422 'unsupported', with its requestId, a detail saying not built yet, no runId, and no run stored` — D-108, D-110, S-077.
8. `a video run whose selected plan's estimate is above its ceiling finishes refused for budget with limit 'ceiling', the plan's estimate as estimateCents, the ceiling and the cap; its events end stage.finished for plan, run.finished; it writes no question and leaves one job row; and a ceiling of exactly the estimate is admitted while one cent less is refused` — D-083, D-100, S-069.
9. `an admitted video run whose stills stage completes has stage.finished for stills and no run.finished from it; its keyframes job is done with its cost kept, and one reel.clips row carries the run's correlation_id and the keyframes job as its parent — also for a plan that places no picture` — D-081, D-083, S-069.
10. `a video run whose stills stage stops for a rule, stops for budget or fails ends exactly as a stills run does, with no reel.clips row` — D-047, D-083, I-10, S-069.

_Narration, clips and Gates 2 to 5_

11. `a cancel that lands before the clips job starts finishes the run cancelled with costCents the spend, no stage.started for video, and no narration or clip call; and one that lands before the assemble job starts finishes it cancelled with no stage.finished for video and no render row — the render-row clause green before any code, since nothing writes a render row until Slice 4` — S-027, S-069.
12. `a worker handed a media port or an assembler whose ffmpeg or ffprobe cannot be run, or that needs a filter the tools lack, refuses to start with a reason naming it, and claims no job — the filter case built after a worker with the same tool names has started in the same process` — S-075.
13. `every shot gets one narration call in each attempt, in plan order and before its own clip, whose text is its unit's sentences joined by one space; its audio is a readable file under the artifact root at the path its row records; its measured duration is the file's; and its word timings are every word of the text, in order, within it` — D-008, D-057, D-087, I-17, S-070.
14. `a narration answer whose timings leave a word out, repeat one, reorder two, overlap, or end after the measured duration finishes the run failed with a detail, each built alone, the narration's row kept` — S-042, S-070.
15. `each shot's clip is image-to-video from its chosen picture's path where the stills chose one, its receipt with no aspect ratio, and text-to-video otherwise with aspectRatio 9:16 in its request and on its receipt — a shot the plan gave no picture and a degraded shot each built, the degraded shot's take and video receipt marked degraded; and no clip is made from a picture not chosen` — D-018, D-026, D-029, D-050, S-071.
16. `each clip's requested duration is its narration's measured seconds rounded up, at least 5 and at most 15: narrations of 3.2, 7.4 and 16.1 seconds ask for 5, 8 and 15` — D-019, D-057, S-023, S-070.
17. `every clip prompt holds the style contract's text, its shot's sentences, the names of the subjects the shot shows, its claimed mustShow of both types, every mustNotShow and every unclaimed mustShow, and ends with the negative audio block, with no [Shot marker; an image-to-video prompt holds its picture's recorded framing, setting, lighting and entity labels; every request the stage builds passes the validator; the clips job makes no observe call on a picture and no compare call; and in apps/ and packages/ a video port's generate is called only in apps/worker/src/video-port.ts and packages/pipeline/src/clips/index.ts, and clips-job.ts hands makeClips only the port video-port.ts builds` — D-008, D-033, D-069, D-071, I-15, I-19, S-071.
18. `every video receipt records the model, the mode, 768P, the requested duration, the seed, the request id, the prompt, the expanded prompt, the expansion mode — one mode for every call of a run — the style contract's id and version, the rate applied, the cost and fake; every seed is its take id's CRC-32; no receipt names reference-to-video; and an attempt of a plan of N shots that completes makes N video receipts` — D-007, D-018, D-023, D-026, D-069, D-072, S-071.
19. `each clip is a readable MP4 with a video and an audio stream, under the artifact root in the run's folder at the path its take row records, its id carrying the attempt; the stand-ins refuse an id whose path would leave the root; with the root unset, clips and narrations are written under the repository's .artifacts/; and no audio, video or subtitles file is tracked by git, and none exists under tests/` — D-086, D-087, S-075.
20. `every take's verdicts are gates 2, 3, 4 and 5 in order, each with an outcome and its coverage — Gate 4's strategy full with its limitation — and its outcome is set only once decided` — D-042, D-051, D-052, I-6, I-7, S-072.
21. `Gate 2, measuring the file the stand-in wrote, fails a take for each of unreadable bytes, no video stream, a 16:9 picture, a black second and a frozen two seconds, each built alone, with no later gate and no observe or reconcile call; passes a quarter second of black and three quarters of a second frozen at the default thresholds, and fails those two once blackSeconds is 0.2 and frozenSeconds 0.4; and passes a take shorter than its narration, one of another 9:16 size within the tolerance, one at another frame rate, one at another sample rate, and one with no audio stream` — D-019, D-025, I-7, I-17, S-072.
22. `Gate 3 records every word read and never fails on words, and fails a take whose sound is classified as speech, and one classified as music, with Gates 4 and 5 still run` — D-008, S-041, S-072.
23. `every take past Gate 2 has exactly one observe receipt, role witness, temperature 0, whose takeIds are its own, and a clip observation, whether it is accepted or fails; every observe call on a clip holds only a clip of that run and a temperature; and a witness answer that does not parse finishes the run failed, that take with Gates 2 and 3 only and no outcome` — D-041, D-051, D-053, I-8, I-15, S-042, S-072.
24. `Gate 5 is one structured call per take past Gate 2, role reconciler, temperature 0, takeIds its own, given every subject its shot shows and the take's criteria with the unclaimed mustShow marked, and never the expanded prompt; it fails a take, each built alone, for a subject not shown, a count that does not match, a claimed presence mustShow not shown, a claimed event mustShow not shown, and a mustNotShow shown; a clipped entity does not fail it; and every take past Gate 5 has one take_observation and one take_reconciliation row, each tied to its receipt by the take id, kept whether the take is accepted or fails` — D-015, D-043, D-044, D-072, I-15, S-040, S-072.
25. `every criterion of the request is in the Gate 5 answer of some take; and an unclaimed mustShow shown by no accepted take stops the run for rule gate-5 at step video, naming it, with a verdict for gate 5 with no shotId and no reel.assemble row` — D-025, D-043, S-072.
26. `a take failing Gate 2, 3 or 5 stops the run for rule gate-2, gate-3 or gate-5 at step video, the detail naming the take and each failed gate's reasons; no later shot's narration or clip is made; there is no stage.finished for video and no reel.assemble row; and every narration and take made is in the tables with the gates it reached` — D-025, S-066, S-072.
27. `a completed clips stage leaves the clips job done with its cost kept and one reel.assemble row carrying the run's correlation_id and the clips job as its parent` — D-081, D-083, S-069.
28. `with the stand-ins' default scripts, every speech receipt, video receipt and job row of a video run costs 0; and a video run whose stills stage stops has no speech or video receipt — green before this slice's code, since only a reel.clips job makes either and Slice 2 creates none for such a run` — D-042, D-047, S-036.

_Assembly, Gate 7 and a video_

29. `a completed run's render manifest holds every shot of the selected plan in plan order, none removed, each with its take, its narration, join mode cut, an opening that is its chosen picture, text-to-video unplaced for a shot the plan gave no picture, or text-to-video placed with its reason for a degraded shot, its conform notes and every verdict decided before assembly with coverage; and the profile, the gate profile, the caption style and the cost ledger; every path in it is under the artifact root and none is a URL; it parses under its schema; the render row's hash is its hash; and the assembler and the frame strip refuse a run or render id whose path would leave the root` — D-025, D-036, D-052, D-059, D-086, I-12, S-067, S-073.
30. `each shot's span is its narration's measured seconds in frames, rounded up, starting where the last ends; a clip longer than its narration is trimmed with no label; and a clip shorter holds its last frame, labelled in four places — a hold row with its seconds, the take's row with the reason, its video receipt and a degraded event — carried on the manifest's shot, and listed after the stills' degradations in the result and in the record` — D-057, I-4, S-058, S-073.
31. `the output is one MP4 made by one ffmpeg invocation; its measured codecs, geometry, frame rate, sample rate and channels equal the profile's; its frame count equals the manifest's total frames exactly, and each shot's take-keyed band begins exactly at its start frame; its moov precedes its mdat; no .m3u8 or segment file is written; two runs' render rows report identical profile fields; and a run at the default profile is measured at 768 × 1366, 24 fps, 48 kHz, two channels` — D-054, D-055, D-056, D-101, I-17, S-073.
32. `clips of another 9:16 size within the tolerance, at another frame rate, at another sample rate, and with no audio stream each render to the profile, with a conform note for the pad, the frame-rate conversion and the added silence, and none for a scale or a resample alone` — D-055, S-073.
33. `every narrated word is one caption from its start to its end, offset by its shot's start; and captions are burned: a frame inside a word's caption is brighter in the caption band than a frame in the gap before that word` — D-008, D-057, S-073.
34. `the clips' sound sits under the narration: one manifest rendered with the duck level at 18 and at 0 gives a clip-tone band 18 dB lower, within 1.5 dB, and a narration-tone band that moves by under 1 dB` — D-008, S-073.
35. `lengthening one shot's measured narration changes that shot's span and every later shot's start, and no caption's offset from its own shot's start` — D-057, S-073.
36. `running the assembler again over a render row's stored manifest, under another artifact root, gives the same measured duration and frame count and the same shot boundaries, measured by the take-keyed band; the stored manifest's hash is unchanged; and a manifest whose captions' text alone is changed renders with the same boundaries` — D-054, D-059, S-073.
37. `the assembler's source imports no domain, settings or network module and calls no fetch, and reads a clip's width, height, frame rate, sample rate and channels only from the shot's measured facts; and no live source in apps/ or packages/ holds -f concat, the concat demuxer or protocol, -c copy, -c:v copy, hls, m3u8 or -hls_segment_type` — D-054, D-055, D-056, D-059.
38. `Gate 7 is one judgeCut call per render, role judge, temperature 0, given every shot in timeline order with the frames of its span's start, middle and end and its sentences, and the five questions; its verdict records coverage frames and their number; and any answer no stops the run for rule gate-7 at step video, with the file and the render row kept, no video in the result and no question written` — D-051, D-058, D-064, I-6, I-16, S-074.
39. `a completed video run's result has until video, the chosen stills in shot order, the video's absolute path under the artifact root — the render row's — estimateCents the plan's, costCents the spend, and degradations in the order reached; its events are exactly S-069's, with no verdict for gate 6 or 8; and every body on every route parses under its contract schema` — D-098, S-067, S-068, S-069, the contract.
40. `no image, narration or video receipt of a run is later than its first render row's start, and the assemble job's context holds no image, narration or video port` — D-058, I-18, S-069.
41. `an assembled file whose measured frame count or profile differs from its manifest, or whose mdat precedes its moov, finishes the run failed, naming the difference` — D-054, D-056, I-17, S-073.

_Spending and faults_

42. `before every narration and clip call the guard reads the chain's spend again and compares it plus the call's figure — characters × the narration rate, or seconds × the video rate, rounded up — with the cap, then the ceiling; exactly equal is made, and one cent over is refused` — S-035, S-059, S-070, S-071.
43. `a clip scripted to cost more than its rate stops the run for budget before the next call, with limit ceiling, estimateCents the spend plus the next call's figure, the ceiling, the cap and costCents the spend, every narration and take made in the tables; no question is written` — D-100, S-035, S-036.
44. `a narration call whose figure, at a scripted narration rate, would pass the ceiling is not made, and the run stops for budget` — S-070.
45. `a clip or narration call that would pass the per-reel cap stops the run with limit reel and appends one question entry naming it after the run is finished` — D-100, S-026, S-035.
46. `a port throwing on a narration, clip, probe, scan, readText, listen, observe, reconcile, frames, assemble or judgeCut call, and a judge answer leaving out a question, each finish the run failed with a detail, every receipt of a call that returned kept` — D-005, S-046, S-066, S-074.
47. `the events of each video ending are exactly those S-069 lists, in the order the gates ran, for each of: refused at the ceiling; the stills stage stopped; cancelled before the clips job; cancelled before the assemble job; a take failing; an unclaimed mustShow unmet; stopped for budget in the clips stage; failed in the clips stage; stopped at Gate 7; failed in the assemble job; and completed` — S-069.

_Restart, and no secrets_

48. `after a worker is killed mid-clips and a new one started, the run completes; stage.started for video appears once; the first attempt's narrations and takes are in the tables under attempt-1 ids with the gates they reached and no outcome where one was cut off; their receipts and cost are kept; no picture is made again — the job before is not run again; and when the first attempt's scripted cost leaves the second attempt's next call above the ceiling, the run stops for budget` — D-081, S-027, S-048, S-076.
49. `after a worker is killed at Gate 7 and a new one started, the run completes with a second render row and file, the first kept, no narration, video or image receipt added, and the result's video at the second render's path` — I-18, S-076.
50. `every other test of the journey passes in a child process whose environment holds only PATH and what the operating system needs to start Node` — Gate 1, S-028, S-075.

**The four least confident decisions.**

1. **One take a shot** (S-066). A reel that three takes would rescue stops at its first failing clip. With stand-ins
   nothing is lost, and **no real video adapter should be built before `reel-takes` is verified**. _Rejected:_ the
   retries in this feature — the owner's choice of the smaller first half. **Named seam:** the clips stage makes a shot's
   take in one function, which `reel-takes` widens.
2. **What fails a clip at Gates 2 and 3** (S-072). Half a second of black, a second frozen and a 1% aspect tolerance are
   unmeasured (M-1); a real shot of a still scene may freeze for a second. _Rejected:_ failing silence or a missing
   sound stream — H3's sound is ambience only, and the conform supplies silence.
3. **A span is its narration** (S-073). The reel's length is the narration's, which Gate 0 never saw: it planned 35 to
   45 seconds of picture, and a short narration makes a short reel. _Rejected:_ spans from the plan's durations —
   picture and voice drift apart.
4. **Real ffmpeg measures on stand-in files; scripted words and sound** (S-072, S-075). A stand-in black clip proves
   `blackdetect` runs and is read, not that its threshold fits H3's output; words and sound prove only that Gate 3 reads
   what it is told. _Rejected:_ scripting every measure — the files would never be read (D-087's reason).

## Gate 4 — Slices

- [x] **Slice 1 — the ports, the shapes and one rule.** `clip.ts`, `narration.ts`, `render.ts`, `model.ts` and
      `settings.ts` as Gate 3 writes them; `GATE_ORDER` and the default gate profile, with the worker refusing another;
      the clip observation schema; the render manifest schema; the validator, and the worker's `video-port.ts`
      validating the requests it passes on (its guard and receipts are Slice 3's); the model stand-in's `observe` on a
      clip and `judgeCut`, in their own lists, and `ModelReceipt.takeIds`; `recording-port.ts` recording `judgeCut`;
      the child worker's port in `tests/engine/worker-process.ts` carrying `judgeCut`, its held call counted over the
      four calls; `DEFAULT_RENDER_SETTINGS`; **the migration adding `model_receipt.take_ids`**, and `recordReceipt`
      writing it; `reel-plan`'s checks 3 and 29 and `reel-stills`' check 5
      (S-077); `processes-only-in-providers` with its `--prove` cases, and `CLAUDE.md`'s count. The worker is handed no
      new port yet. **Check 5's name clause is green before any code** (it says so).
      **Proves: 1, 2, 3, 4, 5, 6.**
- [x] **Slice 2 — asking for a video, and the chain.** `until: 'video'` accepted; `reel-plan`'s check 10 keeping its
      refusal's assertions on `planVaryOn: 'order'`, `reel-stills`' check 8, and the two tests that sent `video` to be
      refused (S-077), with the notes in `reel-plan.md` and `reel-stills.md`; `admitVideo` and the refusal at the
      ceiling; `advanceStills` and the `reel.clips` row; the worker claiming it; `startStage` for `video` with the cancel
      flag. Clips do not exist yet, so a started clips job finishes the run `failed` with the detail _"clips are not
      built"_ — a contract-valid answer no check asserts, which Slice 3 replaces.
      **Proves: 7, 8, 9, 10.**
- [x] **Slice 3 — narration, clips and Gates 2 to 5.** The migration of the narration, take, render and hold tables and
      their receipts; `ffmpegTools` and its readiness; `fakeNarration` and `fakeVideo`; the media port's `probe`,
      `scan`, `readText` and `listen`, and the assembler with `ready` alone — its `assemble` throws _"not built"_, which
      nothing reaches; **the worker requiring the four ports** and refusing to start without ffmpeg, with the harness
      and the child worker building them, and a small test profile; the
      narration text, timings and requested duration; the take's criteria; the clip prompt; the guarded narration and
      video ports with their receipts, costs and rows (their refusals are Slice 5's); the clips recorder; Gates 2 to 5;
      the unclaimed criteria; the stops for a rule; `advanceClips` and the `reel.assemble` row; the assemble job's
      cancel read. Assembly does not exist yet, so a started assemble job that is not cancelled finishes the run
      `failed` with the detail _"assembly is not built"_, which no check asserts. `CLAUDE.md`'s ports and ffmpeg trap.
      **Check 11's render-row clause and check 28's second half are green before this slice's code** (each says why).
      **Proves: 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28.**
- [ ] **Slice 4 — assembly, Gate 7 and a video.** `renderManifest` with spans, holds, conform notes and captions;
      `startRender`; `ffmpegAssembler` — the one pass, the conform, the mix, the captions, the root refusal; the output
      measured, and the output check naming its difference; the media port's `frames`; Gate 7 and `judgeCut`;
      `finishVideo` with the holds' labels, the events and the result; `readRecord` listing holds; the note in
      `reel-contract.md` (S-077). A run whose clips and cut all pass completes.
      **Proves: 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41.**
- [ ] **Slice 5 — spending and faults.** The guards' refusals; the budget stops and their question entries; thrown
      calls at every port; a short judge answer; every ending's events. **Checks 46 and 47 may be green before this
      slice's code** — Slices 3 and 4 already turn a throw into `failed` and write each ending's events; the breaks
      recorded when the slice is built are what show they can fail.
      **Proves: 42, 43, 44, 45, 46, 47.**
- [ ] **Slice 6 — restart, no secrets, and the journeys.** A worker killed mid-clips and one killed at Gate 7; the child
      process with PATH alone. **Proves: 48, 49, 50, and re-runs 1–47**; then the `reel-render` journey, and the
      `reel-stills`, `reel-plan` and `reel-contract` journeys again (S-077).

Every check appears in exactly one slice: 6 + 4 + 18 + 13 + 6 + 3 = 50.

## Outcome

- [ ] A request for a video gets a finished, gated video — or a budget answer with its figures, or the rule and step
      that stopped it — from the real service, parsing under the contract
- [ ] Every clip and narration made is in the tables with each check it reached, and every shot made worse is recorded
      with why
- [ ] The step that describes a clip is shown the clip and nothing else, and nothing is bought once assembly begins
- [ ] The whole journey passes with no secrets in its environment, and no connection to a paid service exists

## Evidence (newest first; appended by the journey, never typed by hand)

## Divergence (the first broken boundary, or "none")

none

## Pending human decisions

**None blocking the gates.** The owner's answers are S-066, S-067 and S-068 (2026-09-16), asked before any gate was
written.

**Owed outside this repository:** KnowScroll's epistemic check of a returned video (S-068); how a viewer is served the
file (S-073, D-056); `reel-script` emitting a criterion's type (S-029); deleting the two stubs in the steering
repository and bumping the pin (S-033).

### Deferred — cut on purpose, with where each goes

**To `reel-takes` (S-066):**

1. **D-024's three takes a shot**, counted in takes, with informed retries, D-033's rider that a retry consumes the
   failed take's verdict, and D-024's _"two failures on one strategy trigger at most one alternative"_.
2. **I-11's counter for provider transient errors**, with `maxAttempts` and backoff; here a thrown call fails the run.
3. **D-025 at the take cap** — `accept_with_label` (I-5), holding the gated keyframe as a still with a slow push, and
   their labels — and D-059's `still-hold` shot.
4. **The takes in the contract's record** — `reel-contract`'s _Pending_ item 1.

**To `video-edits`:**

5. **D-058's closed set of free edits** — `reorder`, `retime`, `recaption`, `reselect-take` — its op vocabulary as a
   closed enum, and re-running the pass and Gate 7 after an edit (S-066 supersedes D-058 on them for this build). Until
   then a Gate 7 failure is terminal. D-054's caption-text test needs no edit op, and is check 36 here.

**To the paid-path feature:**

6. The real video adapter — fal's `minimax-h3-turbo` (D-007, D-018, D-019) — with **O-20**, the least-rewriting
   expansion mode (D-072), and **Q9**, the real video rate.
7. The real narration adapter — MiniMax T2A with word timings (D-008, D-019) — and **D-022's redaction** of the
   presigned `subtitle_file` URL it returns.
8. **D-051's frames fallback** for a clip over the inline limit or a refused format (S-072).
9. Real OCR and sound classification for Gate 3.
10. **M-7 and O-19** — measuring a real clip's geometry and frame rate, which sets the profile's values.

**To KnowScroll, decided in the steering repository:**

11. **Gate 8, `ks:epistemic`** (S-068), and **how a viewer is served the file** — D-056's `/media` route (S-073).

**Chosen, not assigned:**

12. **Chains, L4 SELECT and Gate 6** (S-067) — D-036's join mode in the planning call (D-035), last-frame extraction,
    re-anchoring, and D-037's FLF2V pair with D-048's call (S-032).
13. **The planning call's cinematic fields** — `camera` as D-033's closed enum, and text and audio policies (I-9).
14. **A shot on a solid background** — D-029 part 2's ffmpeg `color` source, with no image call.
15. **A loudness target** — loudness is measured and never normalised.
16. **Reusing a clip down a branch lineage** (D-040).

**Known limits of this feature, not assigned:**

17. **Narration is not in the estimate**, and a clip's seconds follow its narration rather than the plan, so a run's
    spend can differ from its estimate either way; the guard stops one that would pass a limit.
18. **The reel is as long as its narration**, which Gate 0 never saw (`reel-plan`'s known limit 10).
19. **Gate 2's thresholds, the duck level, the profile and Gate 7's questions are unmeasured** (M-1, M-7).
20. **A restarted clips attempt pays again** for every narration and clip (S-076).
21. **Captions use a font the machine has**: the caption style names one, and libass falls back when it is missing.
22. **ffmpeg and ffprobe must be on PATH**, and nothing here installs them (S-075); the suite needs them.
23. **A clip or narration made in the moment between its call returning and its transaction** — a crash there loses the
    receipt with the row; the file stays.
24. **`reel-plan`'s and `reel-stills`' known limits stand**: a global `fetch` in the pipeline; a lease that outlasts a
    live job; no attempt limit; S-019's brand-new-file migration race.

## Gate review 1 — 2026-09-16, adversarial reviewer, evidence pack only

**Verdict: Gate 1 APPROVED; Gates 2 and 3 CHANGES REQUIRED, bars (a) and (d); Gate 4 CHANGES REQUIRED, bar (d). Bars (b)
and (c) clean.** Run on an evidence pack — this file, both decision files, `contentions.md`, `reel-engine`'s reviews, the
verified feature files, `reel-takes.md`, `video-edits.md`, `CLAUDE.md` and the code the gates name — against four bars:
contradicts a decision; spends; depends on an open question; buildable with checks that can fail. **Every supersession
quote was checked character for character and every one was accurate; the findings are clauses the quotes left out, and
checks that could not fail.** No finding needed the owner.

**Twenty-one findings, all fixed the same day:**

1. **D-080 and D-108 gave this feature the take ladder and Gate 8**, and no entry named them — S-066 and S-068 now
   supersede both, and D-052's _"Gates 7–8 on the cut"_ for Gate 8.
2. **D-058's edit-op vocabulary was deferred without supersession** — S-066 names its repair clause and `Confirmed-by`.
3. **The gate profile was a code constant, where D-052 requires config** — `RenderSettings.gateProfile`, one profile,
   a worker refusing another (S-067; checks 3, 29).
4. **A video receipt carried no style id** (D-069) — the receipt records the style contract's id and version (check 18).
5. **A `text-to-video` receipt did not record its 9:16** (D-050) — it records the aspect ratio asked for (check 15).
6. **D-055's _Chose_ clause on the profile in every receipt** was left standing — S-073 names it.
7. **Check 16 asserted what D-057's `Confirmed-by` forbids** — S-070 supersedes that clause too.
8. **The manifest could not hold Gate 7's verdict**, against D-059's _"Gates 1 through 8"_ and _"the reel's record"_ —
   S-073 supersedes both: the render row holds Gate 7's verdict and the output's measure beside the manifest.
9. **A hold was labelled in no verdict** (I-4) — the take's row carries the hold's reason beside its verdicts (check 30).
10. **Model calls did not pass the validator, unnamed, and I-19 was not named** — S-071 extends its supersession.
11. **D-024's transient counter and I-11 were said to stand and were not built** — S-066 supersedes them: a thrown call
    fails the run and counts as no take.
12. **D-036's _"The manifest carries a join mode"_ check** — S-067 supersedes it for the plan; the render manifest's
    schema refuses a shot without one (check 5).
13. **Gate 2's thresholds could not be reached**: ffmpeg reports black and frozen stretches of two seconds or more by
    default, and whole-clip fixtures pass at any threshold — the scan is handed the thresholds, and check 21 builds
    stretches either side of both defaults and under changed settings. Settled by running ffmpeg: `freezedetect`
    measures a freeze about 0.2 s short, so the cases keep a margin.
14. **Nothing measured `moov` before `mdat`** — `MediaProbe.moovFirst` (checks 31, 41).
15. **Check 5 would fail on Gate 3's own `manifest` fields, and its schema clause could not be built** — the fields are
    `renderManifest`; an opening is `keyframe`, unplaced `text-to-video`, or placed `text-to-video` with a reason; the
    name clause is declared green before code.
16. **Check 6's source clause could not tell a bypass from a correct call** — it names the two files that may call
    `generate` and what the clips job hands the stage, and moves to check 17 in Slice 3.
17. **Check 36's boundaries had no measurement, and the replay overwrote its file** — stand-in takes carry a band keyed
    from the take id, a boundary is where it changes, and the replay renders under another root; D-054's caption-text
    test joins it and leaves the Deferred list.
18. **A budget type was declared in `contracts` while the gate said none was** — each answer's refusal is typed from
    `RunResult`, and the pipeline extracts it.
19. **Slices 1 and 2 required ports no slice had built** — the worker requires them from Slice 3 (S-075).
20. **Four checks sat in slices that could not produce them or were green undeclared** — the cancel and ffmpeg checks
    move to Slice 3; the stills-stop receipt clause moves to check 28, declared green; the take rows the old check 41 asserted join check 24.
21. **Loose ends** — `reel-contract.md`'s note placed in Slice 4; the record listing holds asserted (check 30); the
    readiness list names the strip; check 2 names both spellings of `child_process` and the file-case list; check 10's
    refusal assertions kept on `planVaryOn: 'order'` and in check 7; D-055's geometry grep (check 37), D-081's
    between-jobs clause (check 48), D-086's root refusal for the assembler and the strip (check 29), a cancel before the
    assemble job (check 11), and every ending check 47 builds named. **Also settled by running ffmpeg:** captions burn
    in a PATH-only environment. **The check-50 child's time:** readiness is checked once per process.

**Considered, not findings:** the placeholder endings of Slices 2 and 3; the stand-in ignoring the picture's pixels;
`balanced` while O-20 is open; D-045 against `judgeCut`; coverage names beyond D-051's; `ClipObservation` as the still's
type plus its temporal block; I-18 with two live workers (known limit 24); a URL handed to ffmpeg; D-023's accepted
assets; no conform note for a scale; word timings in place of T2A's `subtitle_file`.

**Checks renumbered: 51 became 50.**

## Gate review 2 — 2026-09-16, the same reviewer, checking round 1's fixes against the gates

**Verdict: Gate 1 APPROVED; Gate 2 CHANGES REQUIRED, bars (a) and (d); Gate 3 CHANGES REQUIRED, bar (d); Gate 4
CHANGES REQUIRED, bar (d). Bars (b) and (c) clean.** All twenty-one of round 1's findings verified fixed against the gate text and `DECISIONS.md`, not
against the review record. Every new or changed quote extracted by script and checked against its source, and read by
eye: all exact. Every check number in this file, in S-066 to S-077 and in `reel-takes.md` checked after the
renumbering. Six new findings, all low or moderate; none needed the owner.

**Six findings, all fixed the same day:**

1. **Three supersessions were wider or narrower than their change** — S-066 quoted D-024's whole counters sentence,
   superseding the keyframe counter too: it now quotes only the transient-error clause, and says the keyframe counter
   stands. S-073 quoted D-055's _"identical for every Phase 1 reel"_ while check 31 asserts identity: it now quotes only
   _"and in every receipt"_. S-067 named D-036's check but not its _Chose_: it now names both, and says the render
   manifest is where the join mode is declared.
2. **A readiness remembered by tool names could make check 12's filter case depend on test order** — what is remembered
   is the tools' answers, and every `ready()` checks its own required encoders and filters; check 12 builds the filter
   case after a passing start in the same process.
3. **Check 11's render-row clause could not fail in Slice 3** — declared green before code, in the check and in Gate 4.
4. **The child worker's port lacked `judgeCut` until Slice 3**, and `tests/` is type-checked — the port and its held
   count over four calls move to Slice 1 (S-077).
5. **The file list lagged** — two migrations named, `recordReceipt` writing `take_ids`, `GateProfile` in `render.ts`'
   list and Gate 2's table, and `DEFAULT_RENDER_SETTINGS` beside `cutReel`, which the worker defaults to.
6. **One old check number survived in review 1's record** — reworded.

**Considered, not findings:** a gate profile whose only accepted value is `GATE_ORDER` (it meets D-052's one profile);
decision titles restating superseded bodies; S-066 and S-068 both naming D-080 on Gate 8, and agreeing; check 17's
two-file clause needing the type checker, since `ImagePort` also has `generate`; check 21's 0.75-second freeze at 0.4
extrapolated to a margin of about 0.14 s; adjacent shots' band colours, fixable by the fixture; check 19's tracked-media
clause and check 37's grep green before code, as `reel-stills`' approved check 18 was; D-081's between-jobs clause in
check 48; `assemble(manifest)` as a parameter name, not a field.

## Gate review 3 — 2026-09-16, final confirmation

**Verdict: APPROVED on all four gates. No bar fires.** The reviewer verified R2-1 to R2-6 fixed against the gate text
and `DECISIONS.md`; checked the three changed quotes — D-024's transient-error clause, D-036's _Chose_ clause and
D-055's _"and in every receipt"_ — character for character, each occurring once at its source; re-ran its extraction
over S-066 to S-077 and Gates 1–4, 64 quotes, all exact; confirmed every check number in this file, in S-066 to S-077 and
in `reel-takes.md`, and the slices' counts, 6 + 4 + 18 + 13 + 6 + 3 = 50; and found Gate 2, S-075, S-077 and Gate 4
consistent. **The reviewer wrote the `Gates:` line itself**, as the one edit it was allowed, and checked it against
`journey.mjs`' own pattern.

**Three notes, no bar, fixed the same day outside the gates:** S-067's `Confirmed-by` now scopes the supersession of
D-036's _Chose_ clause as the entry's reading (R3-1, `reel-stills` review 4's T5); review 2's record gives Gate 3 bar (d)
alone (R3-2); and the header's deferral field no longer counts a decision named only in a review record (R3-3).

**From what the reviewer could not check**, the author read the tests outside the pack: `reel-stills-endings` and
`reel-stills-placing` wrap the model port call by call, and `reel-stills-prompts` calls `startWorker` itself. Each is
code support that changes with the port or the worker's options, and **S-077 records them by addition**, with the order
of `startWorker`'s refusals before `ready()`. No gate text changed for it, and no assertion changes.

**Considered, not findings:** the keyframe counter standing in S-066; `render/index.ts` holding only
`DEFAULT_RENDER_SETTINGS` until Slice 4; `recordReceipt` writing `take_ids` in Slice 1 with no check until Slice 3,
declared as code support, as S-049 recorded for `call` and `picture_ids`.

**Findings by round: 21, 6, 0.**
