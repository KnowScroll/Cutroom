---
status: current
authority: plan
---

# reel-takes — a clip that fails its checks is tried again, and at the cap its shot is held on its picture or the reel stops

Status: verified
Decisions: D-001, D-005, D-014, D-015, D-018, D-020, D-024, D-025, D-027, D-028, D-030, D-033, D-043, D-047, D-050, D-054, D-055, D-056, D-058, D-059, D-072, D-080, D-081, D-083, D-086, D-094, D-095, D-099, D-108, I-2, I-4, I-5, I-8, I-11, I-12, I-15, I-17, S-010, S-016, S-021, S-027, S-028, S-029, S-033, S-034, S-035, S-036, S-038, S-040, S-046, S-048, S-051, S-055, S-058, S-059, S-060, S-066, S-068, S-069, S-070, S-071, S-072, S-073, S-074, S-075, S-076, S-077, S-087, S-089, S-090, S-091, S-092, S-093, S-094, S-095, S-096, S-097, S-098, S-099
Named only in the deferral list: D-002, D-037, S-032
Gates: product APPROVED 2026-09-19 adversarial-reviewer · architecture APPROVED 2026-09-19 adversarial-reviewer · program-design APPROVED 2026-09-19 adversarial-reviewer · slices APPROVED 2026-09-19 adversarial-reviewer

> **Amended by `paid-failures` on 2026-09-22 — the gates below are not edited, and no assertion is removed**
> (**S-143**). **Check 1's video arm reads `'kind' | 'detail' | 'spent'`**, and it is pinned as a whole object type
> rather than as a key list alone, so it is NARROWER than what it replaced: a third key still fails it, and now a
> `spent` of the wrong type fails it too. `spent` is optional, is a `LostCall`, and is set in exactly one case — a
> clip fal made and billed whose DOWNLOAD was then answered 429 or 5xx, which S-125 re-buys — so the clip already
> paid for is on the record before the second one is bought. **The narration arm is unchanged**: T2A's re-buy is
> plan-covered and there is no figure to lose. Nothing else in this feature moves, and its journey is run again in
> `paid-failures`' last slice.
>
> **Created 2026-09-16 by S-066**, at the owner's choice, when `reel-render` was cut in two while its gates were
> written. `reel-render` makes a gated video with **one take a shot**: a take that fails a gate stops the reel. This
> feature deepens that without changing what the finished video is.
>
> **Its gates were written on 2026-09-19**, after `reel-render` was verified at `8819d13`, against the code as it stands
> there. The owner answered four questions before any gate was written, and a fifth that followed from one of them
> (S-090 to S-093): **at the cap a shot is held on its approved picture when a hold would pass, and the reel stops
> otherwise, and nothing is "soft" in this build**; **a shot's takes are all made its own way**; **a clips job run again
> keeps every finished result — checkpoints — and a take a crash cut off is made again and counts against nothing**;
> and **the takes go in the record, in contract version 1**. A sixth, raised by the first review, settled that the
> transient counter covers **the clip and voice calls now**, and picture and model calls with their real adapters
> (S-096).
>
> **Written by removing promises, not by copying.** The six things this file listed to settle, S-066, `reel-render`'s
> Deferred items 1 to 4, `reel-engine`'s last plan (git `7e50f79`, which had already moved the take ladder to
> `reel-render`) and its reviews were read; what this feature does not build is listed under **Deferred**, with where it
> goes. A reviewer should treat that list as known and chosen, not as findings.
>
> **The six things to settle, answered.** 1 — S-099, check by check. 2 and 3 — S-090: a failure is in the class a hold
> would cure, or it is not; a shot with no approved picture has nothing to hold, which is D-025 rung 3's _"keyframe
> never passed"_. 4 — S-091: one strategy, the shot's own. 5 — S-092: checkpoints. 6 — S-093: version 1, amended.

## Gate 1 — Product (no technical language)

**The problem.** The engine now makes a finished video, but it gives each shot one try. A clip that comes out black,
frozen, with a voice in its sound, or missing what the shot must show stops the whole reel — even when the approved
picture for that shot is right and only the moving version of it went wrong. And a reel interrupted partway is made
again from its first shot, paying again for every clip it had already made and checked.

**The visible outcome.** Something asks the engine for a reel as it does today. The answers are the same kinds as today
— the finished video, a budget answer with its figures, the rule and step that stopped it, cancelled, or something went
wrong inside the engine — and more reels reach the first:

- **a clip that fails its checks is tried again**, up to **three tries for a shot**. Each new try is told what was wrong
  with every try before it, so it is a correction and not a re-roll;
- **when a shot's three tries all fail**, the shot is **held on its approved picture** for as long as its narration
  lasts, with a slow push in, **if that picture shows everything the shot needs** — it was already checked for it. The
  reel goes on, and the held shot is written down in every place a shot made worse is written down;
- **otherwise the reel stops**, naming the three tries and why the shot could not be held: it had no approved picture —
  it was made from words — or it must show something happening, which a still picture cannot show;
- **the service that makes a clip or a voice, failing for a moment** — busy, unreachable — is asked again after a short
  wait, a few times, **and that never uses up one of the shot's three tries**. The services that make pictures and look
  at them get the same, later, when real ones are connected: until then a moment's failure there still stops the reel;
- **if the engine stops partway and starts again**, it **keeps everything it had finished** — every narration it had
  made and measured, every clip it had made and checked — and carries on from the first shot not finished, paying
  only for what it had not finished. A clip it was part way through checking is made again, and costs the shot none of
  its three tries.

Behind the answer, the record of how a reel was made now lists **every clip made**, beside every picture: its shot,
which try it was, each check it reached and what the check found, and whether the finished video shows it.

**What "approved" means.** Unchanged for a clip and for a reel (`reel-render`). A held shot is **not** an approved
clip: it is a shot made worse, on purpose, by a written rule, and it says so.

**When something fails.**

- **A clip that fails** is followed by the shot's next try, up to three. The first clip that passes is the shot's.
- **Three failed tries** hold the shot on its picture, or stop the reel, as above. Nothing in this build accepts a clip
  that failed with a note attached — no check here looks at style or camera, which is where that would apply.
- **A try that would pass a spending limit is not made**: the reel stops for budget, as any clip would. A shot is never
  held to save money.
- **Something the reel must show that no approved clip shows** stops the reel once every shot is done. A held shot's
  failed clips count for nothing there.
- **A finished reel that fails its last check stops**, as today. Choosing another clip for a shot after that is a later
  feature's (`video-edits`).

**Surfaces.** None. A service other programs call.

**The one measure allowed.** Whether a shot that should be tried again is, one that should be held is held, and one that
should stop the reel stops it **at the try the design says**.

**What must NOT happen.**

- **Nothing may cost money, nothing may read a secret, and nothing may reach out of this machine.** Structural, as in
  `reel-render`: the only clip, voice and model makers are stand-ins on this machine, and it is proven by running the
  whole thing with no secrets in its surroundings.
- **No shot gets a fourth checked try.** A try lost to a crash, or a clip or voice service failing for a moment, is not
  a checked try.
- **The step that describes a clip is never told what the clip should show, nor why an earlier try failed.**
- **A shot is held only on a picture that passed its checks**, and never on one that failed or was never made.
- **No shot is dropped to fix a failure**, and nothing is bought once the reel is being put together.
- **Nothing is quietly made worse**: every held shot is labelled on the shot, in its checks, in its receipts, in the
  updates a caller follows, and in the record — and can be found by asking.
- **Nothing finished is bought twice** because the engine stopped and started again.

## Gate 2 — Architecture

**Where the code goes** — the engine repository's existing packages (S-010). Only what this feature touches:

| Package                  | This feature adds                                                                                                                                                                                                                                                                          | May not                                                                            |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| `packages/reel-contract` | a record entry per take (S-093), in version 1                                                                                                                                                                                                                                              | import any other engine package (D-094)                                            |
| `packages/contracts`     | `TakeNumber`; the `unavailable` answer on the video and narration ports (S-096); `StillHold`; `RenderShot` as a clip shot or a still-hold shot (S-097); `RenderSettings.transient` and `stillPush`                                                                                         | import anything internal except `@cutroom/reel-contract` (D-099)                   |
| `packages/pipeline`      | three takes a shot and the retry prompt (S-094); the ladder at the cap (S-090); picking up from kept work (S-092); the still-hold shot in the render manifest (S-097) — **pure functions handed their ports**                                                                              | import `domain`, `providers`, `apps`, any I/O module, or any npm package but `zod` |
| `packages/providers`     | `unavailable` answers scripted on the stand-in video and narration ports; a bordered stand-in picture; the still-hold in the assembler's one pass, and `zoompan` among the filters `ready()` requires (S-097)                                                                              | import `domain` or `pipeline`                                                      |
| `packages/domain`        | the `still_hold` table; `transient_errors` on the video and speech receipts; the kept work a clips attempt reads; the rows a render is read from; a held shot's labels; takes in the record                                                                                                | import `pipeline` or `providers`                                                   |
| `apps/api`               | nothing but the record's takes, which `readRecord` returns                                                                                                                                                                                                                                 | import `providers` (D-005)                                                         |
| `apps/worker`            | the take number on a take's row; sending a call again on `unavailable`, with backoff, inside the guarded ports (S-096); handing the stage its kept work and writing a held shot's labels with the clips job's ending; refusing to start on a transient or push setting that could not work | import `providers` (S-038) or `child_process` (S-075)                              |

**No real adapter is built here**, and no new boundary rule: nineteen stay nineteen. The only video, narration, image and
model ports are stand-ins, and the worker is handed every port (S-021, S-038, S-075). **ffmpeg stays the one real
adapter**, and the still-hold is one more thing its one pass draws.

**What changes and what does not.** The plan and stills stages are `reel-stills'`, unchanged. The chain is
`reel-render's` four jobs, unchanged (S-069). **What changes is inside the clips job — takes, the ladder, transient
errors, checkpoints — and what the assemble job renders for a held shot.** Admission, Gates 2 to 5 on a take, the
narration, the one pass for a clip shot, Gate 7 and the ending of an assemble job are `reel-render's`.

**How a clips attempt goes.**

```mermaid
sequenceDiagram
  Worker->>Domain: claim reel.clips; cancel flag + stage.started video (S-027, S-051)
  Worker->>Domain: readClipsInputs — the chosen pictures, the degraded shots, and the kept work of earlier attempts (S-092)
  Worker->>Pipeline: makeClips(… kept …, validated guarded video, guarded narration, media, recording model, recorder)
  loop each shot, in plan order
    alt a finished narration is kept
      Pipeline->>Pipeline: use it — no call, no measure (S-092)
    else
      Pipeline->>Pipeline: narration, measured, its timings parsed (S-070)
    end
    Pipeline->>Pipeline: the kept decided takes of the shot, their verdicts as events (S-092)
    loop until a take is accepted, up to three decided takes (D-024, S-094)
      Pipeline->>Pipeline: the take's prompt — a retry's with every earlier failed take's reasons (D-033, S-094)
      Worker->>Worker: validate; then send, guarded, again on unavailable with backoff (S-096)
      Pipeline->>Pipeline: Gates 2, 3, 4, 5 (S-072)
    end
    alt three decided takes failed
      Pipeline->>Pipeline: atTheCap — hold on the chosen picture, or stop for the rule (S-090)
    end
  end
  Pipeline->>Pipeline: every unclaimed mustShow shown by some accepted take, or stop for gate-5 (S-072)
  Pipeline-->>Worker: ClipsOutcome, with its still-holds — never thrown
  Worker->>Domain: advanceClips or finishVideo — the events and the held shots' labels, one transaction (S-098)
```

### Takes (S-094, D-024, D-033, D-018)

- **A shot gets up to three takes, counted when they are decided** (D-024): a take counts once its outcome is
  decided — Gate 2 failed, or Gate 5 completed. **A take that fails is followed by the shot's next take**, and the
  first one accepted is the shot's: no take follows it (D-030's _"retried only on gate failure"_). **After the third
  decided failure no video call is made for the shot** (D-024's check), and the ladder decides (below).
- **A take is not counted** when it was never made — its call was refused by the guard, or answered `unavailable` until
  the worker gave up (S-096) — or when it was **cut off** by a crash inside its gates: that take is made again by the
  next attempt under the same number (S-092).
- **Take ids** are `a<attempt>-shot-<unit>-take-<n>`, **`n` the take's number among the shot's decided takes, 1 to 3**;
  the attempt is the clips job's that makes it. The seed is **the CRC-32 of the take id**, made by the caller and
  recorded (D-018), so every take of a shot has its own seed.
- **One strategy: the shot's own** (S-091, the owner's answer). Every take of a shot is made as `reel-render` makes its
  first — `image-to-video` from its chosen picture, or `text-to-video` at 9:16 — and a retry changes its prompt and its
  seed, never its mode. D-024's _"at most one alternative"_ allows none; the one alternative that exists, words for a
  pictured shot, gives up the identity its picture was bought for, and the hold at the cap covers that shot for $0.
- **The criteria, the duration and the gates of a retry are its first take's**: the same take criteria, the same
  requested seconds — the shot's narration is measured once — and Gates 2 to 5 as `reel-render` runs them (S-072).

### A retry's prompt: what it is shown, and what it is never shown (S-094, D-033, S-060's form, I-8, I-15)

**A retry's prompt consumes the failed take's verdict** (D-033's rider). It is **the shot's first take's prompt** — the
style contract's text, the shot's sentences, the subjects, the criteria, the picture's recorded observation and the
negative audio block (S-071) — **with a section inserted before the negative audio block**: a line saying the takes
before this one failed their checks, then **every earlier failed take's reasons, each under `Take 1:` or `Take 2:`**,
gate by gate — `Gate 2:`, `Gate 3:`, `Gate 5:` — as bullets. **The negative audio block stays last** (S-071), so every
retry passes the validator unchanged. S-094 adds this section to S-071's list of what a clip prompt is made of.

- **It consumes every earlier failed take of the shot**, as the canonical's repair consumes both candidates' verdicts
  (D-047, S-060): take 3 is told take 1's and take 2's reasons. So **take 3's prompt differs from take 2's even when
  take 2 failed for take 1's reasons** — the case a single verdict would leave a re-roll with a new seed, which D-033
  rejects.
- **It is never shown** the failed clip, its path, its observation or its expanded prompt (D-072), nor looked at by any
  model in order to be written. It cites the recorded verdict (I-15, D-033: _"No second vision call is made"_).
- **The witness is never told anything of an earlier take**: Gate 4 is one `observe` call given the take's clip and a
  temperature, and nothing else (I-8, S-072). **Gate 5's prompt is built from the take's own observation and its
  shot's brief alone** — no earlier take's reasons, observation or id reaches it.

So take 2's prompt differs from take 1's whenever take 1 failed a gate — D-033's check — and take 3's from take 2's
whatever take 2 failed on; the difference is the failed takes' reasons, before the block.

### At the cap: hold on the picture, or stop the reel (S-090, D-025)

When a shot's third decided take fails, **`atTheCap`** — a pure function of the shot and its three takes — decides, by
D-025's classes as the owner answered them:

- **Picture right, motion broken — hold** (rung 2): **the shot has a chosen picture, and claims no `event` mustShow.**
  Such a picture passed Gate 1 against **every subject its shot shows, every `mustShow` of presence its shot's sentences
  claim, and every `mustNotShow`** (S-040), and Gate 1S where it ran. **Every failure Gates 2, 3 and 5 can find in one of
  its takes is one that picture was checked against, or is in the clip alone** — black, frozen, the wrong shape,
  unreadable, speech or music in its sound, a subject lost or doubled, a presence missing, something forbidden seen. So
  holding it cures whatever the three takes failed on, and the class is **a property of the shot**, not of which gate
  failed. That is wider than D-025's words — _"by failure class"_, _"picture right, motion broken (freeze, morph,
  artifact)"_ — and holds a shot whose clips missed a presence `mustShow` its picture shows, which on the clips alone
  would be rung 3's _"`mustShow` unmet"_: **S-090 supersedes D-025 on all three**, as the owner's answer.
- **Keyframe never passed, or `mustShow` unmet — stop the reel** (rung 3): **a shot with no chosen picture** — one the
  plan gave none (D-027) or whose picture was degraded (D-050): there is no gated picture to hold; and **a shot that
  claims an `event` mustShow**: a still cannot show an event (D-043), so a hold would leave it unmet. The run stops for
  **the rule of the third take's lowest failing gate**, `gate-2`, `gate-3` or `gate-5`, at step `video`, **the detail
  naming the three takes, each one's failed gates and reasons, and why the shot cannot be held**. No later shot's
  narration or clip is made.
- **Soft — `accept_with_label`** (rung 1): **no failure of Gates 2 to 5 is in this class.** D-025's soft failures are
  _"style adherence, camera not exactly as asked"_; no gate here checks style, and no plan asks for a camera
  (`reel-stills`' deferred item 6). So **no take is ever accepted with a label**, and `atTheCap`'s answer has no such
  member: rung 1 arrives with the first check of style or camera, which is where D-025's own check — a label refused over
  a failed `mustShow` (I-5) — can be built (S-090 supersedes that check for this build).

**A held shot shows no clip.** Its takes stay in the tables with their verdicts, all `fail`, and none is used. **The
reel's unclaimed `mustShow`** is checked **once every shot is done — accepted or held — over accepted takes alone**: a
held shot's failed takes show nothing for it. S-090 supersedes S-072's _"once every shot's take is accepted"_ and
S-069's _"an unclaimed `mustShow` no take shows"_ on it.

**S-090 also supersedes S-066's allocation** of _"`accept_with_label`, holding the gated keyframe as a still, and
failing the reel"_ to this feature, on its first part: no label is built here.

### A held shot's labels (S-098, I-4, S-058's form)

A still-hold is **labelled in four places** (I-4), written **with whatever ending the clips job reaches** — completed,
stopped or failed — in the transaction that ends its stage or its run:

1. **a `still_hold` row** — the run, the shot, the attempt that decided it, the chosen picture and its probe (S-097),
   the three takes it consumed and the reason — **its own table, so "every run with a held shot" is a query** (D-025's check);
2. **the third take's row**, whose `degradation` carries the reason, beside its verdicts, as the last failing picture of
   a degraded shot carries it (S-058);
3. **the video receipt of each of the three takes**, marked `degraded` — whichever attempt made it (S-092). This
   departs from S-058's rule for pictures, _"The receipts marked are the shot's pictures this attempt made"_, whose
   reason — an earlier attempt's pictures belong to a ladder that degraded nothing — does not hold here: with
   checkpoints an earlier attempt's decided takes are this ladder's;
4. **a `degraded` event**, with the shot and the reason, **after the third take's verdicts**, in the order the ladders
   reached them.

It is also **carried on the render manifest's still-hold shot**, and **listed in a completed result's `degradations`
and in the record's**: the stills stage's in the order reached, **then the still-holds in the order reached**, then the
latest render's holds in shot order (S-073).

**A still-hold is not a hold.** `reel-render's` hold (S-073) is a clip shorter than its narration showing its last
frame for the rest: a `hold` row, the accepted take's `degradation`, written by the assemble job. A still-hold is a shot
shown on its picture because its takes failed: a `still_hold` row, the third failed take's `degradation`, written by the
clips job. **Each reason names which it is** — a still-hold's begins with the shot _"is held on its approved picture"_ and
cites D-025; a hold's says the take's _"last frame is held"_ and cites S-073 — and no shot has both, since a held shot
shows no clip.

### Transient errors (S-096, D-024, I-11)

**A provider that fails for a moment answers `unavailable`**, with a detail — a new answer on `VideoPort` and on
`NarrationPort`, beside `made` and `refused`. **Only a provider answers it** — on a stand-in, only when a test scripts it
— as only the guard answers `refused` (S-035).

- **The worker's guarded port sends the call again**, the same request, **up to `maxAttempts` sends in all**, waiting
  **`backoffMs`, then twice that, and so on** between them — `RenderSettings.transient`, defaulting to **3 sends and
  1000 ms**. **Every send is guarded** — the chain's spend read again and compared with the cap, then the ceiling
  (S-087) — and nothing is written for an `unavailable` answer: it made nothing and, in this build, costs nothing.
- **Made after N `unavailable` answers**, the call's receipt records **`transient_errors` N**, and the take or narration
  is what it would have been with none: **the take counter is unchanged** (D-024's check, I-11). A take of number 2
  made after three sends is take 2.
- **Still `unavailable` after the last send**, the port **throws**, naming the call, the sends and I-11, and the stage
  fails the run as it fails on any thrown call (S-046): **no row and no receipt for the call, and no take counted.**
- **A call that throws is a fault, not a transient error**: it is sent once and fails the run, as in `reel-render`
  (check 46). Only `unavailable` is sent again.
- **The pipeline never sees `unavailable`**: the guarded port is the only video and narration port the stage is
  handed. The stage treats one that reaches it as a fault, so the take counter cannot be touched by a transient error
  even through a port built wrong.
- **Which calls**: **video and narration calls**, the clips stage's two paid calls. **Image calls and model calls are
  not covered** — the owner's answer (S-096, superseding I-11, D-024 and S-066's _"I-11's counter for provider transient
  errors"_ for them): a thrown one fails the run, as `reel-plan` and `reel-stills` were verified; their real adapters,
  which are what fail transiently, are the paid path's.

A worker handed **a `maxAttempts` that is not a whole number of at least 1, or a `backoffMs` that is not a finite number
of at least 0, refuses to start** and claims no job.

### Spending (S-095, S-035, S-059, S-087, D-014, D-083)

- **A video run is admitted on its plan's estimate, unchanged** (S-069, D-083): the estimate counts one clip a shot at
  the plan's durations, and **a retry is not in it**, as the stills reserve is not (S-035): D-083's plan job _"estimates
  what the reel would cost to generate"_ from the winning storyboard, and a retry is in no storyboard. Counting three
  clips a shot would refuse nearly every reel for a spend most never make — the per-reel cap binds before the take cap
  does (I-2, D-024's note).
- **Every take is a paid call through the guard**, and **every send of it** (S-096): before each, the chain's spend read
  again plus the requested seconds × the video rate, rounded up, against **the cap the job read, then the ceiling**
  (S-059, S-087). A narration kept from an earlier attempt is not sent, so not guarded.
- **A retry the guard refuses is not made, and the shot is not held**: the stage stops for budget and the run finishes
  `stopped`, `reason: 'budget'`, as for any call (S-035, S-087) — D-014: _"Exceeding any cap stops the job"_, and _"it
  never silently degrades quality or silently overspends"_. A stop at the cap appends S-087's question, naming the take
  by its id, with its number.
- **D-014's _"retries ≤ 2 per shot"_ stands for decided takes**: three decided takes is one and two retries. A take a
  crash cut off is made again beyond them — a further paid clip, the owner's answer, which S-092 supersedes D-014 and
  D-024 for. **The per-reel cap and the ceiling bound what every take spends**, compared before every send.
- **What a stand-in costs**: 0 unless a test scripts a cost (S-036), on any take.

### A restart picks up where it stopped (S-092, S-027, D-081, I-15)

**A clips job claimed again** after its lease runs out (S-027) **runs its code from the start, and its stage skips what
an earlier attempt finished** — the owner's answer:

- **Kept**: every narration an earlier attempt **finished** — made, measured and its timings parsed — and every take an
  earlier attempt **decided** — its outcome `accept` or `fail`, with every verdict it reached. `readClipsInputs` reads
  them, every earlier attempt's, in the order made, and the worker hands them to `makeClips` as **`kept`**.
- **Not made again, and not looked at again**: a kept narration is not spoken, probed or parsed again; a kept take is not
  made, measured, heard, witnessed or reconciled again — **no second look at one clip** (I-15), and no receipt is added
  for it. The stage **takes each shot in plan order**: a shot with a kept accepted take is finished; a shot with a kept
  narration makes its takes with it; **the next take's number is the shot's kept decided takes plus one**, and a retry
  after kept failed takes is told every one's reasons (S-094).
- **Made again**: a take a crash **cut off inside its gates** — made, and some of Gates 2 to 5 run, no outcome — is
  **not resumed**: its row, receipt, file and cost stay as they were, with the gates it reached and no outcome, and the
  shot's take of **that number** is made again under the next attempt's id. It is not a decided take, so **it counts
  against no cap** — a crash is not a bad clip, as a provider's `unavailable` is not (I-11's reason). It is a further
  paid clip beyond D-024's _"3 paid clip takes"_ and outside D-014's _"retries ≤ 2 per shot"_, each crash one more,
  bounded by the per-reel cap and the ceiling: **S-092 supersedes both for it**, as the owner's answer. A narration made
  and not finished is likewise made again.
- **The cap across attempts**: **a shot's decided takes, every attempt's, are at most three.** A shot with three kept
  failed takes goes to the ladder with **no call**, and is held again — or stops the reel — as its first attempt had
  decided.
- **The events** are the finishing attempt's, and it **emits every kept take's verdicts when it reaches the shot**, in
  shot and take order, as if it had made them: a caller sees each decided take's verdicts once, and a cut-off take's
  never.
- **The spend**: every attempt's cost is kept on the one job row and counted by every guard (S-036, S-059); kept work
  is not bought again; the take a crash cut off is bought again.
- **The still-holds**: a shot held by an earlier attempt that did not end is held again, from its kept takes, and its
  labels are written with the finishing attempt's ending, marking the receipts of the three takes it consumed, whichever
  attempt made them.

**The rows a render is read from** (`readRenderInputs`) are **each shot's finished narration and accepted take, whichever
attempt made them**, the still-holds, and **each held shot's three failed takes**, whose verdicts its still-hold shot
carries; never a cut-off take or a narration left unfinished. So **a render is made of rows from more than one attempt
by design** — what S-076 rejected as _"Resuming the accepted takes"_ and S-089 as _"a mix of attempts"_, S-092
supersedes on both: the take S-076 feared would be looked at twice is the cut-off one, which is never resumed. **What
S-089 guarded — a render quietly choosing among rows — is kept by a fault**: with checkpoints a shot has at most one
finished narration and at most one accepted take, so **`renderManifest` refuses rows holding two of either for one
shot**, naming it, and the assemble job fails the run rather than choosing (S-092; check 23).

**Unchanged:** a keyframes job run again starts over and pays again (S-048), and an assemble job run again renders again
and buys nothing (S-076). `stage.started` for `video` is written once.

### The still-hold, in the one pass (S-097, D-025, D-059, S-073, D-054, D-055)

**The render manifest** holds, **for a held shot, a still-hold shot** in its place in plan order — none removed (I-12):
its shot id, `joinMode: 'cut'`, its narration, words, span and conform notes as any shot's, and a **`stillHold`** block:

- the chosen picture's **id and path** under the artifact root, never a URL (D-059, D-086);
- **its probe** — ffprobe of the file, **taken by the media port when the ladder held the shot** (I-17, D-055: _"Every
  input is measured with ffprobe"_), and recorded on the `still_hold` row: the conform's only source for its geometry,
  as a clip's measured facts are for a clip. A picture that does not probe as a readable picture is a fault, and fails
  the run — it passed Gate 1;
- **the three takes** its ladder consumed, and **the reason** (I-4, D-059);
- **the push**: `endZoom`, from `RenderSettings.stillPush`, **default 1.1**, provisional until M-1.

It has **no take, request id, expanded prompt, clip path, opening, clip measure, picture frames or hold** — S-097
supersedes D-059's _"the selected take id"_ and S-073's _"its take, the provider's request id, the expanded prompt and
the clip's path"_, _"its opening"_, _"the clip's measured facts"_ and _"its hold"_ for it. Its **verdicts** are its picture's — Gate 1, and 1S
where it ran — **then its three takes'**, Gates 2 to 5 in order, with coverage: the evidence for the hold travels with
it. A clip shot's verdicts are its picture's and **its accepted take's**, as in `reel-render`; a failed take before an
accepted one is in the tables and the record, not in the manifest. **The schema refuses a still-hold shot with no reason
— D-059's check, which S-073 left to this feature — with other than three takes, or with any clip field; and a clip shot
with a `stillHold`.**

**The one pass** reads, for a still-hold shot, **its picture's file in place of a clip**, and:

- **the picture**: scaled to fit the profile keeping its aspect and padded, as a clip is, from its probe (D-055) —
  then **`zoompan`**, which makes **exactly the span's frames** from the one picture, **zooming from 1 at the span's first
  frame to `endZoom` at its last, centred**, at the profile's frame rate: D-025's _"slow push"_, with ffmpeg's `zoompan`
  as D-025 names it;
- **the sound**: **silence** for the span, as for a clip with no sound, lowered by nothing, **with the shot's narration
  mixed over it**: the voice stays in sync because the span is exact (D-025's reason);
- joined with the other shots by the `concat` filter in the one filtergraph, captions burned over it — one decode, one
  encode (D-054).

**Ready.** `zoompan` joins the filters the pass uses (`PASS_FILTERS`), so the media port's and the assembler's
`ready()` require it, and a worker whose tools lack it refuses to start (S-075). **Run on this machine before the gates
were fixed**, in the scratchpad: a 90 × 160 PNG through `scale`, `setsar` and `zoompan` with `d` of 50 gave **exactly
50 frames** at the asked size and rate, and a four-pixel border at the picture's edge showed at frame 0 and was only
mostly pushed out by frame 49 at a zoom of 1.1. The first review ran it again: **four pixels still read as the border at
the last frame's edge, and two are gone** — a push to 1.1 takes about 4.1 of the stand-in's 90 pixels from each side.
So the stand-in's border is **2 pixels**.

**Checked by measurement, not by reading the manifest back** (S-073): the stand-in picture is a solid colour keyed from
its id, so **every frame of a held span carries its picture's colour, and none carries the band of any of its takes**;
a **bordered** stand-in picture — a 2-pixel border of another colour, scripted by a test — shows its border at the
span's first frame and not at its last; the span's frames are counted in the file; and its clip tone is absent under the
narration's.

### The takes in the record (S-093, D-015, I-4)

**The record gains `takes`**: **one entry per take made, every attempt's, in the order made** — the cut-off one too — each
with its **take id**, its **shot**, its **number**, **each check it reached** — gate `'2'` to `'5'` with its outcome —
the ids of its **observation** and **reconciliation** where it reached them (`obs-<takeId>`, `rec-<takeId>`), and
**`used`**: **true exactly for the take each shot of a completed video run's video shows**, as `chosen` is for a picture
(S-055). A plan or stills run's record has `takes: []`. **`CONTRACT_VERSION` stays 1**: no caller exists, and
`reel-contract`'s _Pending_ item 1 says clip entries are compatible with version 1 — S-034's reasoning, the owner's
answer. `reel-contract.md` gains a note naming S-093, and its gates are not edited.

### Events and endings (S-094, S-098, S-069)

`reel-render's` events (S-069), with these things changed, each by the entry that supersedes S-069's clause:

- **from the clips job**: for each shot in plan order, **each take's verdicts** for gates `'2'`, `'3'`, `'4'` and
  `'5'` with the shot's id, **take after take**, each once its gate completes (S-094) — kept takes' when the stage
  reaches the shot (S-092, on _"Only the finishing attempt's verdicts become events."_); **a `degraded` event** after a
  held shot's third take's verdicts (S-098, on the clips job's list ending _"completed: nothing more from this job"_);
- **a shot that fails at its cap** ends the stage as a failing take did: `run.finished`, stopped for its rule (S-094);
- **an unclaimed `mustShow`** is checked once every shot is done, accepted or held (S-090);
- **a completed result's `degradations`**: the stills' in the order reached, **the still-holds in the order reached**,
  then the holds' in shot order (S-098).

Everything else — the plan and stills stages, the assemble job's `degraded` events for holds, Gate 7's verdict,
`stage.finished` for `video` only when it completes — is S-069's.

### Storage (D-001, D-028, I-4)

**One migration**, `0004_*`:

- `still_hold` — run id, shot id, the clips attempt that decided it, picture id, the picture's probe, the three take ids,
  reason; its key the run and the shot;
- `video_receipt.transient_errors` and `speech_receipt.transient_errors`, default 0 — every row before it was made at its
  first send (S-055's form).

`take.number`, which `reel-render` created, now holds 1 to 3. **The record route** returns `takes`.

### The boundary with `video-edits`

**D-058's free edits after assembly** — `reorder`, `retime`, `recaption`, `reselect-take` — and re-running the pass and
Gate 7 after one, **stay `video-edits'`**: S-066's supersession of D-058 continues, and **a Gate 7 failure stays
terminal here** (`reel-render`'s check 38 stands). Takes stop at a shot's first accepted one (D-030: _"retried only on
gate failure"_), so **every shot has at most one accepted take**, and `reselect-take` — _"choosing a different
already-accepted take of the same shot"_ — has nothing to choose among in this build. That is `video-edits'` to settle,
and is listed under Deferred.

### What S-066 withheld, and what this feature supersedes in turn (S-090 to S-098)

S-066 superseded six things _"for `reel-render`'s build, until `reel-takes` supersedes this entry in turn"_. This
feature builds four of them, so **S-094 supersedes S-066** on _"A shot gets one take in each attempt of the clips job."_
and on _"A take that fails Gate 2, 3 or 5 stops the reel for that gate's rule"_, and **ends S-066's supersessions** of:

- **D-024**, on _"A shot may consume 3 paid clip takes — one initial plus two retries — before it is marked `failed`"_
  and its `Confirmed-by` _"A test that a shot with three failed takes is marked `failed` and that no fourth video job is
  submitted for it"_ — **built** (S-094), and superseded again, by S-092 — the owner's answer — for a take a crash cut
  off;
- **D-025**, on rung 1 and rung 2 — **rung 2 built** (S-090); **rung 1 stands, with no failure in its class** in this
  build (S-090);
- **D-033**, on its `Confirmed-by` _"A test that take 2's prompt differs from take 1's whenever take 1 failed a gate"_ —
  **built** (S-094), whose retry also consumes take 1's verdict in take 3 — S-094 supersedes D-033's rider by addition;
- **D-024**, on _"and provider transient errors (`maxAttempts` with backoff)"_ and its `Confirmed-by` _"A test that N
  consecutive provider transient errors leave the take counter unchanged"_, and **I-11**, on _"Transient failures retry
  on `maxAttempts` with backoff, on their own counter"_ — **built for video and narration calls** (S-096), and superseded
  again, by S-096 — the owner's answer — for image and model calls.

**S-066's supersessions of D-058, D-080 and D-108 continue** (S-099 says so by name): the edits are `video-edits'`, and
Gate 8 is KnowScroll's; the take ladder D-080 and D-108 gave `reel-render` is this feature's, and is built here. What
S-066 kept standing still stands: D-024's rule that a take is counted in takes and never in retries, its keyframe
counter, D-025 rung 3 and its labels, and D-014's two retries a shot — now reached, for decided takes; S-092 supersedes
D-014 for a take a crash cut off.

Each supersession is quoted in full in its S-entry:

- **S-090** — D-025 on _"by failure class"_, rung 2's words and rung 3's _"`mustShow` unmet"_ for a presence criterion
  the held picture shows, and D-025's check on a label; S-066's allocation of `accept_with_label`; S-072's and S-069's
  clauses on an unclaimed `mustShow`;
- **S-092** — S-076's start-over, its events clause and its rejection of resuming accepted takes; S-069's _"Only the
  finishing attempt's verdicts become events."_; S-089's _"the second attempt's six takes and six narrations alone"_ and
  its _"a mix of attempts"_; D-024's _"3 paid clip takes"_ and _"no fourth video job"_, and D-014's _"retries ≤ 2 per
  shot"_, for a take a crash cut off;
- **S-094** — S-066's one take and its stop; S-071's take ids and, by addition, its list of what a prompt is made of;
  S-072's stop; S-069's verdict clause and _"a take failing"_;
- **S-096** — I-11, D-024 and S-066's _"I-11's counter for provider transient errors"_, for image and model calls;
- **S-097** — D-059 and S-073 for a still-hold shot;
- **S-098** — S-069's clips-job events and its order of `degradations`;
- **S-099** — continues S-066 on D-058, D-080 and D-108.

### What this feature changes in verified features (S-099)

**No assertion is removed.** A premise that three takes turn into a retry is **kept on the path that still stops** — the
failing take built on each of a shot's three takes, on a shot that cannot be held — and each change is made in the slice
that forces it. S-099 lists every one; in short:

- **`reel-render`** — checks **21, 22, 23, 24 and 26** and check **47's** _"a take failing"_ build their failing take on
  each of a shot's three takes, on a shot that cannot be held — shot 0 of `NO_RECURRENCE` (made from words), shot 3 of
  `THREE_RANKS` (made from words) or shot 0 of `THREE_RANKS` (it claims an event) — and assert of the three what they
  asserted of the one; check 26's _"a shot gets one take"_ becomes _"the shot's three takes failed, and why it cannot be
  held"_ (Slice 2). Check **20**'s held Gate 3 case is on shot 1, which a retry now follows: its script gains the retake's
  answers, and no assertion changes (Slice 2). Check **37** reads a still's geometry from its probe as a second measured
  source beside a clip's (Slice 4). Check **48** asserts a checkpointed restart: the kept work not made again, the
  cut-off take made again, and the render made from kept and made rows (Slice 5). **Checks 13 and 18** stand on their
  fixtures, one attempt with no failing take; **checks 25, 38, 46 and 49** stand as written — Gate 7's failure is
  terminal, and a throw is still a fault. `reel-render.md` gains a note naming S-099 and these checks (Slice 2).
- **`reel-contract`** — `RunRecord` gains `takes`: its shape check's example record and the stand-in service's records
  carry `takes` (test support, S-034's form); `reel-contract.md` gains a note (Slice 1).
- **`reel-stills`** and **`reel-plan`** — nothing asserted changes: the stand-in picture's border is an option no stills
  test sets, and the model port keeps its four calls.
- **Code and test support, none of it an assertion**: `TakeRecord.number` widened, and `readRenderInputs` and the guarded
  video port writing the take's number; the pipeline handling `unavailable` as a fault; the assembler, the assemble job
  and `cutReel` taking both kinds of render shot (Slice 4), and two verified tests typed for the union —
  `tests/reel-render-shapes.test.ts`' shot builder taking a clip shot's opening, `tests/reel-render-manifest.test.ts`'
  rows carrying `stillHolds: []` (Slice 4); `tests/engine/video.ts`' `videoScript` and `clipsScript` answering the model
  stand-in for each take made, retakes included, in call order;
  `TEST_RENDER_SETTINGS` and the child worker carrying `transient` and `stillPush`, with a short backoff.

`reel-render's`, `reel-stills'`, `reel-plan's` and `reel-contract's` Evidence lines are not touched; **their four
journeys are run again in the last slice**, as S-077 ran three.

## Gate 3 — Program design

**File locations**, in the engine repository.

- `packages/reel-contract/src/record.ts` — `RunRecord.takes` (S-093).
- `packages/contracts/src/clip.ts` — `TakeNumber`, `TakeRecord.number`, `VideoAnswer`'s `unavailable`, `StillHold`.
- `packages/contracts/src/narration.ts` — `NarrationAnswer`'s `unavailable`.
- `packages/contracts/src/render.ts` — `ClipShot`, `StillHoldShot`, `RenderShot`.
- `packages/contracts/src/settings.ts` — `RenderSettings.transient`, `RenderSettings.stillPush`.
- `packages/pipeline/src/clips/index.ts` — `makeClips` with `kept`, three takes and the ladder; `clips/ladder.ts` —
  `TAKES_A_SHOT`, `atTheCap`; `clips/prompts.ts` — `retryPrompt`.
- `packages/pipeline/src/render/manifest.ts` — the still-hold shot and its schema; `render/index.ts` —
  `DEFAULT_RENDER_SETTINGS.transient` and `stillPush`.
- `packages/providers/src/fake/video.ts` and `fake/narration.ts` — `transient`; `fake/image.ts` — `border`;
  `ffmpeg/tools.ts` — `zoompan` in `PASS_FILTERS`; `ffmpeg/assemble.ts` — the still-hold shot.
- `packages/domain/src/schema.ts`; `db/migrations/0004_*`; `clips.ts` — `readClipsInputs` with `kept`,
  `readRenderInputs` with the still-holds, `recordClip` and `recordNarration` with `transientErrors`; `runs.ts` —
  `advanceClips` and `finishVideo` with `stillHolds`; `pictures.ts` — `readRecord` with `takes`.
- `apps/worker/src/video-port.ts` and `narration-port.ts` — the take number, sending again; `clips-job.ts` — `kept`,
  the still-holds with every ending; `worker.ts` — the transient and push refusals.
- `tests/reel-takes-*.test.ts` — the journey's tests (S-016); `tests/engine/` — fixtures and readers.

**Signatures.**

```ts
// packages/reel-contract/src/record.ts — S-093
export const RunRecord = z.strictObject({
  // … as reel-contract built it, and:
  takes: z.array(
    z.strictObject({
      takeId: z.string().min(1),
      shotId: z.string().min(1),
      number: z.number().int().positive(),
      /** True exactly for the take each shot of a completed video run's video shows. */
      used: z.boolean(),
      observationId: z.string().min(1).optional(),
      reconciliationId: z.string().min(1).optional(),
      checks: z.array(
        z.strictObject({
          gate: z.string().min(1),
          outcome: z.enum(['accept', 'accept_with_label', 'fail']),
        }),
      ),
    }),
  ),
})

// packages/contracts/src/clip.ts — S-090, S-094, S-096
export type TakeNumber = 1 | 2 | 3 // D-024: three takes a shot, counted when decided
export type VideoAnswer =
  | { kind: 'made'; clip: ClipRef; receipt: VideoReceipt }
  | {
      kind: 'refused'
      limit: Extract<RunResult, { reason: 'budget' }>['limit']
      estimateCents: number
    }
  | { kind: 'unavailable'; detail: string } // only a provider answers it; sent again, never a take (I-11)
export interface TakeRecord {
  // … as reel-render built it, but:
  number: TakeNumber
}
/** A shot held on its chosen picture at its cap (D-025 rung 2, S-090). */
export interface StillHold {
  shotUnit: number
  pictureId: string
  path: string // the chosen picture's file
  probe: MediaProbe // that file, probed by the media port when the ladder held the shot (D-055)
  takeIds: readonly string[] // the three takes its ladder consumed, in order
  reason: string
}

// packages/contracts/src/narration.ts — S-096
export type NarrationAnswer =
  | {
      kind: 'made'
      audio: { narrationId: string; path: string }
      timings: unknown
      receipt: NarrationReceipt
    }
  | {
      kind: 'refused'
      limit: Extract<RunResult, { reason: 'budget' }>['limit']
      estimateCents: number
    }
  | { kind: 'unavailable'; detail: string }

// packages/contracts/src/render.ts — S-097
interface ShotSpan {
  shotId: string
  joinMode: 'cut'
  narrationId: string
  narrationPath: string
  words: WordTiming[]
  startFrame: number
  frames: number
  conform: string[]
  verdicts: Array<{ gate: string; outcome: Outcome; coverage: unknown }>
}
/** reel-render's shot, unchanged: its accepted take's clip. */
export type ClipShot = ShotSpan & {
  takeId: string
  requestId: string
  expandedPrompt: string
  clipPath: string
  opening:
    | { kind: 'keyframe'; pictureId: string }
    | { kind: 'text-to-video'; placed: false }
    | { kind: 'text-to-video'; placed: true; degradation: string }
  clip: MediaProbe
  pictureFrames: number
  hold: { frames: number; seconds: number; reason: string } | null
  stillHold?: never
}
/** A shot held on its chosen picture (D-025 rung 2, D-059's still-hold). */
export type StillHoldShot = ShotSpan & {
  stillHold: {
    pictureId: string
    path: string // the chosen picture's, under the artifact root (D-086)
    probe: MediaProbe // ffprobe of the file, taken when the shot was held (I-17, D-055)
    takeIds: readonly string[] // the three takes its ladder consumed
    degradation: string // I-4
    endZoom: number // the push: 1 at the span's first frame to this at its last
  }
  takeId?: never
  requestId?: never
  expandedPrompt?: never
  clipPath?: never
  opening?: never
  clip?: never
  pictureFrames?: never
  hold?: never
}
export type RenderShot = ClipShot | StillHoldShot

// packages/contracts/src/settings.ts
export interface RenderSettings {
  // … as reel-render built it, and:
  transient: { maxAttempts: number; backoffMs: number } // default 3 and 1000 (D-024, I-11)
  stillPush: { endZoom: number } // default 1.1 — provisional until M-1 (D-025)
}

// packages/pipeline/src/clips/ladder.ts — S-090
export const TAKES_A_SHOT = 3 // D-024
export type AtTheCap = { kind: 'hold'; reason: string } | { kind: 'fail'; why: string } // no label (S-090)
export function atTheCap(
  shot: {
    shotUnit: number
    picture: { pictureId: string } | null // the chosen picture, or none
    events: readonly Criterion[] // the event mustShow its sentences claim
  },
  takes: readonly TakeRecord[], // its three decided takes, every one failed
): AtTheCap

// packages/pipeline/src/clips/prompts.ts — S-094
/** The first take's prompt, with every earlier failed take's reasons inserted before NEGATIVE_AUDIO. */
export function retryPrompt(
  first: string,
  failed: ReadonlyArray<Pick<TakeRecord, 'number' | 'verdicts'>>, // the shot's failed takes, in order
): string

// packages/pipeline/src/clips/index.ts — S-090, S-092, S-094
export interface ClipsInput {
  // … as reel-render built it, and:
  kept: {
    narrations: readonly NarrationRecord[] // earlier attempts' finished narrations
    takes: readonly TakeRecord[] // earlier attempts' decided takes
  }
}
type Degraded = Extract<RunEvent, { type: 'degraded' }>
export type ClipsEvent =
  | Pick<Verdict, 'type' | 'gate' | 'outcome' | 'shotId'>
  | Pick<Degraded, 'type' | 'shotId' | 'reason'>
export interface ClipsRecord {
  narrations: NarrationRecord[] // this attempt's, in the order made
  takes: TakeRecord[] // this attempt's
  stillHolds: StillHold[] // in the order the ladders reached them
  events: ClipsEvent[]
}
// ClipsOutcome, makeClips' ports, settings and never rejecting: as reel-render built them.

// packages/pipeline/src/render/manifest.ts — S-097
export interface RenderInput {
  // … as reel-render built it, but:
  takes: readonly TakeRecord[] // each shot's accepted take, and each held shot's three
  narrations: readonly NarrationRecord[] // each shot's finished narration
  stillHolds: readonly StillHold[]
}

// packages/providers
export interface FakeVideoEntry {
  // … as reel-render built it, and:
  transient?: number // answer unavailable this many times for the take id, then make it
}
export interface FakeNarrationEntry {
  // … and:
  transient?: number
}
export interface FakeImageEntry {
  // … and:
  border?: true // a 2-pixel border of another colour: a push to 1.1 crops about 4 of 90 from each side
}
// PASS_FILTERS gains 'zoompan'.

// packages/domain
export function readClipsInputs(db: Db, runId: string): ClipsInputs // + kept: earlier attempts' finished and decided
export function readRenderInputs(db: Db, runId: string): RenderInputs // + stillHolds, each with its probe
export function recordClip(db: Db, e: { /* … */ transientErrors: number }): void
export function recordNarration(db: Db, e: { /* … */ transientErrors: number }): void
export function advanceClips(
  db: Db,
  a: {
    runId: string
    jobId: number
    events: readonly EventBody[]
    stillHolds: readonly StillHold[]
  },
): number
export function finishVideo(
  db: Db,
  f: { /* … as reel-render built it, and: */ stillHolds?: readonly StillHold[] },
): void
export function readRecord(
  db: Db,
  runId: string,
): Pick<RunRecord, 'pictures' | 'takes' | 'degradations'>

// apps/worker/src/video-port.ts and narration-port.ts — S-096
export function guardedVideoPort(
  video: VideoPort,
  db: Db,
  job: { /* … as reel-render built it, and: */ transient: RenderSettings['transient'] },
): VideoPort
export function guardedNarrationPort(
  narration: NarrationPort,
  db: Db,
  job: { /* … and: */ transient: RenderSettings['transient'] },
): NarrationPort
```

`StillHold` is recorded by the stage and written by the worker; `readClipsInputs` and `readRenderInputs` are typed from
`@cutroom/contracts` in the code, as in `reel-render`. **No budget type is declared outside `@cutroom/reel-contract`**
(D-094): `unavailable` carries a detail and nothing else.

**Checks, written before the code.** One journey, `reel-takes` (D-020), counting `tests/reel-takes-*.test.ts` (S-016).
**Each check is owned by the slice that produces it** (Gate 4). Every test that starts the service points its database,
questions file and artifact root at a temporary folder, and sets a small output profile and a short backoff. **Where a
check reads the output, it measures the file**, and **fixtures are chosen so the colours a check tells apart differ** —
the stand-in's band and picture colours are keyed from ids, and two can be too alike to tell apart (session 28).

_The shapes, the ports and the record_

1. `compiled by TypeScript in the test: a take record whose number is 0 or 4 is a type error and 1, 2 and 3 compile; and a video and a narration answer of kind unavailable carry a detail and nothing else` — D-024, I-11, S-094, S-096.
2. `DEFAULT_RENDER_SETTINGS' transient is 3 sends and 1000 ms and its still push ends at 1.1; a worker handed maxAttempts that is not a whole number of at least 1, a backoffMs that is not a finite number of at least 0, or an endZoom that is not a finite number above 1, refuses to start and claims no job; and REQUIRED_FILTERS holds zoompan` — D-024, D-025, I-11, S-075, S-096, S-097.
3. `RunRecord requires takes, each with its takeId, shotId, number, used and checks, and its observation and reconciliation ids optional; refuses a take entry with any other field; and CONTRACT_VERSION is 1 — that clause green before this slice's code, since nothing here changes the version` — D-095, S-034, S-093.
4. `the record of a completed video run lists one take entry per take made, in the order made, each with its shot, number, the checks it reached and its observation and reconciliation ids, and used true for every take its video shows; a run stopped in its clips stage or at Gate 7 has none used; a restarted run's record lists every attempt's takes, the cut-off one with the checks it reached and no reconciliation id; and a plan run's and a stills run's record has no take` — D-015, I-4, S-055, S-093.

_Three takes, informed retries, transient errors, and the cap's stop_

5. `a take failing Gate 2, 3 or 5 — each built alone, on a shot a hold cannot cure — is followed by the shot's next take, in the first take's mode — image-to-video from its picture on shot 0 of THREE_RANKS, which claims an event, and text-to-video at 9:16 on its shot 3, made from words — its id a<attempt>-shot-<unit>-take-<n> with n its number, its seed that id's CRC-32 and so unlike the last; a shot accepted on its second take makes no third; after a shot's third decided take no video call names it; the record lists each take with its number; and every take's row, receipt and verdicts are kept` — D-018, D-024, D-030, S-091, S-094.
6. `a retry's prompt is the first take's prompt with every earlier failed take's reasons inserted before the negative audio block, each under its take and its gates — so take 2's prompt differs from take 1's whenever take 1 failed, and take 3's from take 2's even when take 2 failed for take 1's reasons; every retry prompt ends with the negative audio block and passes the validator; and no prompt holds a failed take's path, observation or expanded prompt` — D-033, D-047, D-072, I-15, S-071, S-094.
7. `every take's observe call holds its clip and a temperature and nothing else, and its reconcile prompt is the one takeReconcilePrompt makes of its own observation and its shot's brief — no earlier take's reason, observation or id reaches Gate 4 or 5; and each take has one witness and one reconciler receipt, its takeIds its own` — I-8, I-15, S-072, S-094.
8. `each take's verdicts are events with the shot's id, take after take in the order the gates ran: a shot accepted on its second take has eight verdict events, the first four take 1's` — S-069, S-094.
9. `every take is sent through the guard: a retry on a shot a hold would cure — shot 1 of THREE_RANKS — whose figure would pass the ceiling is not made, and the run stops for budget with that figure, the shot not held and no still-hold row — that clause green before Slice 3's code, since nothing is held until then, and failing after it if a refused retry held its shot; one that would pass the per-reel cap appends one question naming the take by its id; and exactly equal is made` — D-014, S-035, S-087, S-095.
10. `a video call answered unavailable N times running, N below maxAttempts, is sent again with the same request after waits of at least backoffMs and then twice that, and is made: the take keeps its number — take 1 of its shot, one take row and one video receipt recording N; a take 2 made after two unavailable answers is take 2; and a narration call answered unavailable is sent again the same way, its speech receipt recording N` — D-024, I-11, S-096.
11. `a video call, and a narration call, answered unavailable maxAttempts times finishes the run failed with a detail naming the call and I-11, with no row or receipt for it and no take counted; a call that throws is sent once and fails the run; and makeClips, read directly and handed a video port, then a narration port, that answers unavailable, finishes failed naming the answer, with nothing counted — the last two clauses green before this slice's code, as reel-render's check 46 and Slice 1's handling of the new answer make them` — D-024, I-11, S-046, S-096.
12. `at the cap, a shot the plan gave no picture, a shot whose picture was degraded, and a shot with a chosen picture that claims an event mustShow each stop the run for the rule of the third take's lowest failing gate at step video, the detail naming the three takes, their reasons and why the shot cannot be held; no later shot's narration or clip is made, and there is no still-hold row; and atTheCap, compiled in the test, answers hold or fail — one of kind accept_with_label is a type error` — D-025, D-043, D-050, I-5, S-090.

_The hold at the cap_

13. `at the cap, a shot with a chosen picture that claims no event mustShow is held — its three takes failing Gate 2, Gate 3 or Gate 5, each built — and the clips stage goes on to the next shot and completes, with a reel.assemble row; the held shot's takes all fail and no later take of it is made; and, each built alone, a held shot whose picture's probe is scripted to throw, and one whose picture's file is replaced with other bytes before its third take is decided, finish the run failed in the clips job — no reel.assemble row and no still_hold row — the first with the throw's message as its detail and the second with a detail naming the picture and saying it did not probe as a readable picture — neither green before this slice's code, whose Slice 2 stand-in fails a held shot's run with another detail and makes no probe` — D-025, D-055, I-12, I-17, S-046, S-090, S-097.
14. `a held shot is labelled in four places — a still_hold row with its shot, attempt, picture, probe, three takes and reason; the third take's row carrying the reason; the video receipt of each of its three takes marked degraded; and a degraded event after its third take's verdicts — with the clips stage completed, with the run stopped for budget at a later shot, and with the run failed at a later shot; no other shot, take or receipt carries one; and a query for runs holding a shot returns exactly those that did` — D-025, I-4, S-058, S-098.
15. `a held shot's failed takes show no unclaimed mustShow: when only a held shot's take was reconciled as showing it, the run stops for rule gate-5 once every shot is done` — D-025, S-069, S-072, S-090.

_The still-hold, rendered_

16. `compiled by TypeScript in the test: a render shot with a stillHold and a take id, a clip path, an opening, a clip measure or a hold is a type error, as is a clip shot with a stillHold; and the render manifest schema refuses a still-hold shot with no degradation reason, one with other than three takes, one carrying any clip field, and a clip shot carrying a stillHold, and parses a manifest holding both kinds` — D-059, S-073, S-097.
17. `the render manifest of a run with a held shot holds, in its place in plan order, a still-hold shot — its picture's id and path under the artifact root, the probe of that file the stage took when it held the shot, its three takes, its reason and the push — with its picture's verdicts then its three takes' and no clip field; every other shot as it would be without it; and it parses under its schema` — D-025, D-059, D-086, I-12, S-097.
18. `the output, measured: the held shot's span is its narration's frames exactly, starting where the shot before ends; every frame of it carries its picture's colour and none the band of any of its three takes; the 2-pixel border of a bordered picture is at the span's first frame and pushed out by its last; its clip tone is absent under the narration's; and the file's frame count is the manifest's total` — D-025, D-054, D-055, I-17, S-073, S-097.
19. `a completed run with a held shot and a clip held to its narration lists in its result's degradations and in its record's the stills' degradations, then the still-hold, then the hold, each with its reason; the still-hold's reason says the shot is held on its picture and the hold's that a take's last frame is held; one is a still_hold row and the other a hold row; and no shot has both` — I-4, S-069, S-073, S-098.
20. `running the assembler again over the stored manifest of a render with a held shot, under another artifact root, gives the same duration, frame count and shot boundaries, measured; and Gate 7 is shown the held shot's span's first, middle and last frames` — D-059, S-073, S-074, S-097.

_A restart picks up where it stopped_

21. `after a worker is killed mid-clips and a new one started, every narration the first attempt finished and every take it decided is kept — no narration, video, observe or reconcile call and no receipt is made for it again — and the take it cut off is made again under the next attempt's id with the same number, the cut-off row keeping its gates and no outcome; the run completes; and its events hold every kept and made take's verdicts once, in shot and take order` — I-15, S-027, S-092.
22. `a first attempt killed with a shot's first take failed and its second cut off: the second attempt makes that shot's take 2, told take 1's reasons; killed with two failed: one more take; killed after a held shot's three: that shot is held again with no call, its labels marking the three receipts, whichever attempt made them; and no shot's decided takes pass three across the attempts` — D-024, S-092, S-098.
23. `the render of a restarted run is made from each shot's finished narration and accepted take, whichever attempt made them, and never a cut-off take or an unfinished narration — readRenderInputs read directly, and every frame of the output measured to carry the take its shot's narration puts there; and renderManifest, read directly, refuses rows holding two accepted takes of one shot, or two finished narrations, naming the shot, so the assemble job fails the run rather than choosing one` — S-076, S-089, S-092.
24. `when the first attempt's spend leaves the second attempt's next call above the ceiling, the run stops for budget — for the cut-off take made again, and, once that is made, for the next shot's narration` — S-036, S-087, S-092.

_Endings, and no secrets_

25. `the events of each ending this feature adds are exactly: a shot accepted on a retry, completed; a shot held, completed; a shot failing at its cap; a retry stopped for budget; a call unavailable to the last send; and a run picked up from its checkpoints, completed — each typed by hand; green before this slice's code, since Slices 2 to 5 write every one of these endings' events, as reel-render's check 47 was — the breaks recorded with the slice show each can fail` — S-069, S-094, S-098.
26. `every other test of the journey passes in a child process whose environment holds only PATH and what the operating system needs to start Node` — Gate 1, S-028, S-075.

**The four least confident decisions.**

1. **The hold class is a property of the shot** (S-090). A take that failed because its clip showed the wrong subject
   is cured by a hold only because the picture was checked for that subject — so the rule trusts Gate 1 for everything
   Gate 5 finds but an event. A picture that passed Gate 1 by a reconciler's slip would be held where a clip might later
   have passed. _Rejected:_ holding on picture faults only — D-025's literal _"freeze, morph, artifact"_ — which stops
   reels a hold would cure; labelling sound failures as soft (the owner's choice).
2. **Checkpoints** (S-092). Picking up from kept rows means the stage reads work it did not make, and a kept take is
   trusted as recorded. _Rejected:_ starting over (S-076, the owner's choice against it); keeping finished shots only —
   pays again for failed takes and forgets their reasons. **Named seam:** the stage's per-shot loop reads `kept` in one
   place, which a checkpoint for stills would copy.
3. **Transient errors only on the clips stage's paid calls** (S-096). A real model or image provider will fail
   transiently too, and here a thrown one fails the run. _Rejected:_ every port now — changes verified `reel-plan` and
   `reel-stills` for adapters that do not exist.
4. **No retry in the estimate** (S-095). A reel admitted at its estimate can spend up to three times its clips' share
   before the cap stops it; with stand-ins nothing is spent. _Rejected:_ admitting on three clips a shot — refuses nearly
   every reel for a spend most never make.

## Gate 4 — Slices

- [x] **Slice 1 — the ports' answers, the settings and the record.** `TakeNumber`; `unavailable` on both answers, with
      the stage treating one that reaches it as a fault; `RenderSettings.transient` and `stillPush`, with their defaults
      and the worker's refusals; `zoompan` in `PASS_FILTERS`; **the migration** — `still_hold`, `transient_errors` — and
      `recordClip` and `recordNarration` writing 0; `RunRecord.takes`, `readRecord` returning them, the contract's
      example and the stand-in service's records with `takes`, and `reel-contract.md`'s note (S-099). **Check 4 is built
      on rows `reel-render` already writes** — one take a shot, and its restart's two attempts — and every number is 1
      until Slice 2, whose check 5 reads the others.
      **Proves: 1, 2, 3, 4.**
- [x] **Slice 2 — three takes, informed retries, transient errors, and the cap's stop.** The take number on ids, rows and
      seeds; the loop to three decided takes; `retryPrompt`; every send guarded and a refused retry stopping the run;
      `unavailable` sent again with backoff in both guarded ports, `transient_errors` recorded, the last send throwing;
      the stand-ins' `transient`; **`atTheCap`**, whose `fail` stops the run for its rule with its detail — **a `hold`,
      until Slice 3, finishes the run `failed`**, _"a held shot is not built"_, a contract-valid answer no check asserts;
      `reel-render`'s checks 20 to 24, 26 and 47 moved onto their paths that still stop, with the test support that
      answers retakes, and `reel-render.md`'s note (S-099). **Check 7 is green once retries exist**: Gates 4 and 5 are
      handed only a take's own clip and brief by construction (S-072) — the breaks recorded with the slice show it can
      fail. **Checks 9 and 11 say which of their clauses are green before code.**
      **Proves: 5, 6, 7, 8, 9, 10, 11, 12.**
- [x] **Slice 3 — the hold at the cap.** A `hold` goes on to the next shot; the held shot's `StillHold`, its picture
      probed by the media port, and its `degraded` event; its four labels with every clips-job ending, through
      `advanceClips` and `finishVideo`; `readRecord` listing still-holds after the stills' degradations. A render is not
      yet made of a held shot: `renderManifest` fails such a run _"has no accepted take to render"_ — `reel-render`'s own
      fault, which no check of this slice asserts, and Slice 4 replaces.
      **Proves: 13, 14, 15.**
- [x] **Slice 4 — the still-hold, rendered.** `RenderShot` as `ClipShot | StillHoldShot` and the manifest's schema; the
      manifest's still-hold shot from its `still_hold` row and the probe it holds; `readRenderInputs` with the
      still-holds; the assembler, the assemble job and `cutReel` taking both kinds of shot — the pass's picture input,
      `zoompan` and silence; the stand-in picture's 2-pixel border; the completed result's order of `degradations`;
      `reel-render`'s check 37 widened as S-099 says, and the type-only support in two of its test files.
      **Proves: 16, 17, 18, 19, 20.**
- [x] **Slice 5 — a restart picks up where it stopped.** `readClipsInputs`' kept work; the stage skipping it, numbering
      after it and re-emitting its verdicts; `readRenderInputs` reading each shot's finished and accepted rows, and
      `renderManifest` refusing two of either for one shot; `reel-render`'s check 48 as S-099 says.
      **Proves: 21, 22, 23, 24.**
- [x] **Slice 6 — endings, no secrets, and the journeys.** Every ending's events; the child with PATH alone.
      **Proves: 25, 26, and re-runs 1–24**; then the `reel-takes` journey, and the `reel-render`, `reel-stills`,
      `reel-plan` and `reel-contract` journeys again (S-099).

Every check appears in exactly one slice: 4 + 8 + 3 + 5 + 4 + 2 = 26.

## Outcome

- [ ] A shot whose clip fails its checks is tried again, told why, up to three times — and a provider failing for a
      moment costs it none of them
- [ ] At the cap a shot is held on its approved picture where that cures it, labelled wherever a shot made worse is, and
      the reel stops otherwise, at the try the design names
- [ ] A reel interrupted partway keeps what it finished and buys nothing twice but the clip it was checking
- [ ] Every clip made is in the record, and the whole journey passes with no secrets in its environment

## Evidence (newest first; appended by the journey, never typed by hand)

- 2026-09-22 journey=PASS at ce9e0ab — every check green; 66 tests in tests/reel-takes-*.test.ts pass
- 2026-09-22 journey=PASS at c5520b0 — every check green; 66 tests in tests/reel-takes-*.test.ts pass
- 2026-09-22 journey=PASS at b261e72 — every check green; 66 tests in tests/reel-takes-*.test.ts pass
- 2026-09-20 journey=PASS at 6fe85b8 — every check green; 66 tests in tests/reel-takes-*.test.ts pass

## Divergence (the first broken boundary, or "none")

none

## Pending human decisions

**None blocking the gates.** The owner's answers are S-090 to S-093 (2026-09-19), asked before any gate was written;
S-092's checkpoint rule was asked as a fifth question, because the owner's answer to the third — the restart question —
asked for checkpoints. A sixth, on which calls the transient counter covers, was asked after the first review, which
found that narrowing S-066's owner-confirmed allocation needed the owner (S-096).

**Owed outside this repository:** KnowScroll's epistemic check of a returned video (S-068); how a viewer is served the
file (S-073, D-056); `reel-script` emitting a criterion's type (S-029); deleting the two stubs in the steering
repository and bumping the pin (S-033).

### Deferred — cut on purpose, with where each goes

**To `video-edits`:**

1. **D-058's closed set of free edits** — `reorder`, `retime`, `recaption`, `reselect-take` — and re-running the pass and
   Gate 7 after one (S-066's supersession of D-058 continues). **`reselect-take` has nothing to choose among in this
   build**: a shot's takes stop at its first accepted one (D-030), so no shot has two accepted takes; whether it should
   is `video-edits'` to settle.

**To the paid-path feature:**

2. **Real adapters answering `unavailable`** — which provider errors are transient, and **whether a provider bills one**:
   here an `unavailable` answer costs nothing.
3. **Transient errors on image and model calls** (S-096, the owner's answer, supersedes I-11, D-024 and S-066's
   allocation for them until then): a thrown call fails the run, as `reel-plan` and `reel-stills` were verified.

**Chosen, not assigned:**

4. **D-025 rung 1, `accept_with_label`**, and D-025's check that a label over a failed `mustShow` is refused (I-5) — with
   the first check of style or camera: the planning call's `camera` (`reel-render`'s deferred item 13, D-033's rider).
5. **An alternative strategy for a take** — `text-to-video` for a pictured shot, or D-037's FLF2V pair (S-032) — which
   D-024's _"at most one alternative"_ allows and S-091 does not build.
6. **Checkpoints for the stills stage** — a keyframes job run again still starts over and pays again (S-048).
7. **Narrations and renders in the record** — the owner asked for clips; both stay in the engine's tables.

**Known limits of this feature, not assigned:**

8. **The push is unmeasured** (M-1): `endZoom` 1.1 over any span, and nothing checks it reads as slow on a real picture.
9. **A hold trusts Gate 1** for everything but an event: a picture that passed by a reconciler's slip is held.
10. **A take a crash cut off is paid for again**, once, by the attempt that makes it again.
11. **Retries are not in the estimate**: a run can spend up to three times its clips' share before the per-reel cap or
    the ceiling stops it (S-095).
12. **A backoff holds the worker**: it runs one job at a time (D-002), so a wait between sends delays every other run.
13. **`reel-render`'s known limits stand**, except its 20th — a restarted clips attempt paying again for every narration
    and clip — which S-092 narrows to the take a crash cut off.
14. **A clips job runs longer under the same lease**: three takes a shot and the backoff lengthen it, and nothing renews
    a lease (`reel-render`'s known limit 24). A job whose lease runs out while it is still live can meet a second
    attempt; a second accepted take or finished narration that gives a shot then fails the run at its render (S-092).

## Gate review 1 — 2026-09-19, adversarial reviewer, evidence pack only

**Verdict: CHANGES REQUIRED on all four gates.** Gate 1 bar (a); Gate 2 bars (a) and (d); Gate 3 bars (a) and (d); Gate
4 bar (d). **Bars (b) and (c) clean on every gate.** Run on an evidence pack — this file, `reel-render.md`,
`reel-stills.md`, `reel-contract.md`, `video-edits.md`, both decision files, `contentions.md`, `VideoGenerationFlow.md`,
`reel-engine`'s reviews, and the code and tests the gates name — against four bars. **Every quote, more than a hundred,
was checked by script against its source and was exact**; as in `reel-render`'s round 1, the findings are clauses the
quotes left out, and checks that could not fail or sat in the wrong slice. The reviewer compiled Gate 3's render shot
types against the repository's settings, and ran the still-hold's `zoompan` again.

**Seventeen findings, all fixed the same day; one needed the owner:**

1. **S-090 widened D-025's rung 2 and overrode rung 3 unnamed** — it now supersedes D-025 on _"by failure class"_, on
   rung 2's words and on rung 3's _"`mustShow` unmet"_ for a presence criterion the held picture shows, the substance the
   owner's.
2. **A take a crash cut off is a fourth paid clip, against D-024's Chose and D-014** — S-092 supersedes both for it, as
   the owner's answer, and S-094's _"apply as written"_ is narrowed to match.
3. **S-092 chose what S-076 and S-089 rejected, and its safeguard was in no decision or check** — S-092 names S-076's
   rejection of resuming accepted takes and S-089's _"a mix of attempts"_; `renderManifest` refusing two accepted takes
   or two finished narrations of one shot is in S-092, and in check 23.
4. **The clips job's `degraded` event contradicted S-069's list** — S-098 supersedes it by name.
5. **The unclaimed `mustShow` rule changed unnamed** — S-090 supersedes S-072's and S-069's clauses.
6. **S-097's quote of S-073 was narrower than its change** — it now names the opening, the clip's measured facts and the
   hold.
7. **S-066's continuing supersessions, and its allocation of I-11's counter, were in no entry** — S-099 continues S-066
   on D-058, D-080 and D-108 by name; **the owner was asked** which calls the counter covers and chose _"Clip and voice
   calls now"_, so S-096 supersedes S-066's allocation for image and model calls with the owner's confirmation.
8. **Slice 1 could not be built: the render shot union broke code and verified tests it did not touch** — the union,
   its schema and the code and test support it forces move to Slice 4, which changes that code anyway; S-099 lists the
   two verified test files' type-only changes.
9. **`reel-render`'s check 37 would go red once a still's geometry is read** — S-099 widens it by one measured source.
10. **Check 1 held a Slice 3 type, and S-091 was caught by nothing** — `atTheCap`'s type is check 12's, in the slice that
    builds it; check 5 asserts each take's mode on a pictured shot and one made from words.
11. **Clauses green before their code were undeclared, and one could never fail** — check 9's refused retry is on a shot
    a hold would cure, its clause declared green before Slice 3; checks 3, 11 and 25 say which clauses are green early.
    `atTheCap` moves to Slice 2, so the cap's stop is built and checked (check 12) where `reel-render`'s check 26 needs
    it.
12. **Take 3's prompt could repeat take 2's** — a retry now consumes every earlier failed take, as D-047's repair does,
    and check 6 asserts take 3's differs from take 2's when both failed alike.
13. **S-071's list of what a prompt is made of was extended unnamed** — S-094 names it, by addition.
14. **The border's width was unfixed, and two faults had no check** — the stand-in border is 2 pixels, the width the
    reviewer's run pushed out; a picture that cannot be probed (check 13) and an `unavailable` reaching the stage (check 11) are asserted.
15. **Two statements were inaccurate** — the supersession summary is rewritten entry by entry, and the checkpoint question
    followed the third question, not the fourth.
16. **Gate 1 promised transient retries for every provider** — it names the clip and voice services, and says picture
    and model services come later.
17. **S-099's test changes were incomplete** — check 26's narration rows, check 48's model script and check 20's held
    case are named.

**Considered, not findings:** every quote; S-091's reading of _"at most one alternative"_; S-093 in version 1; S-095's
estimate; I-15 under checkpoints; I-8; I-18; the guard under retries; the hold rule held against S-040; the union and
its schema; the `unavailable` answer's reach; S-099's fixtures and counts; band colours in the restated check 48 (at
least 72 apart) and the held pictures against the take bands (at least 102); `zoompan`'s frame count; checkpoints
needing no new column; S-098 marking receipts across attempts (now said as a departure from S-058's rule for pictures);
the lease under longer jobs (now known limit 14).

**Checks renumbered, 26 still: 4 + 8 + 3 + 5 + 4 + 2.**

## Gate review 2 — 2026-09-19, the same reviewer, checking round 1's fixes against the gates

**Verdict: Gates 1 and 4 APPROVED; Gate 2 CHANGES REQUIRED, bar (a); Gate 3 CHANGES REQUIRED, bar (d). Bars (b) and (c)
clean.** All seventeen of round 1's findings verified fixed against the gate text and `DECISIONS.md`, not against the
review record, and the sixth owner answer against its relay. The quote extraction run again over all 169 quotes in this
file and S-090 to S-099: every quote that claims a source is exact, and each new one was checked by hand. Every check
number cited was checked after the renumbering, and the slices' counts, 4 + 8 + 3 + 5 + 4 + 2 = 26. **The reviewer
wrote the `Gates:` line for product and slices**, as its one allowed edit.

**Five findings, all fixed the same day:**

1. **Check 13's unreadable-picture clause could not fail** — every run with a held shot ended `failed` in every slice.
   The two cases are built alone, each asserting the clips job fails with no `reel.assemble` or `still_hold` row and its
   own detail — the throw's message, or a detail naming the picture as not probed as a readable picture — so neither is
   green before Slice 3, whose stand-in fails such a run with another detail.
2. **S-093's `Caught by` kept the old check numbers** — checks 3 and 4.
3. **S-094 widened D-033's rider unnamed** — it supersedes D-033 by addition on _"A retry prompt additionally consumes
   the failed take's verdict."_, and says, as its reading, that it widens the owner's S-091 option's _"each retry told
   why the last take failed"_.
4. **Gate 2 and S-092 lagged the fixes** — the sequence diagram, the restart bullet and S-092's Chose say every earlier
   failed take's reasons; the supersession summary says S-092 supersedes D-024 and D-014 for a take a crash cut off;
   Gate 1 says every try before it.
5. **S-099's sentence on check 20 was false** — its script answers shot 1's take 2 and every take after it.

**Considered, not findings:** S-094 departing from S-060's form for pictures; S-090's D-025 quote with the order kept;
S-090 superseding _"`mustShow` unmet"_ for a presence criterion only; check 37 widened by one measured source; check 11's
direct read produced by Slice 1 and owned by Slice 2; D-024's rejected cap of 4, not adopted; S-096's `Confirmed-by`;
Slice 2's stand-in for a hold; the 2-pixel border; Gate 1's picture and model sentence; the `Decisions:` line.

## Gate review 3 — 2026-09-19, final confirmation

**Verdict: APPROVED on all four gates. No bar fires.** The reviewer verified round 2's five findings fixed against the
gate text and `DECISIONS.md`: check 13's two probe cases each fail the clips job with their own detail and can fail —
a stage that never probes, ignores `readable` or writes the still-hold first each leaves the stage completing or a row
behind; S-093 names checks 3 and 4; S-094 supersedes D-033's rider by addition and marks the widening of the owner's
wording as its reading; the diagram, the restart bullet, S-092's Chose, the supersession summary and Gate 1 say every
earlier failed take; S-099's check 20 script answers every take from shot 1's second on. It re-ran its extraction over
175 quotes, all exact but the owner's answers and wording that claims no source; checked the three new quotes by hand;
and confirmed every check number in this file and in S-090 to S-099, and the slices' counts, 4 + 8 + 3 + 5 + 4 + 2 = 26.
**The reviewer wrote the `Gates:` line itself**, as its one allowed edit, and tested each gate against `journey.mjs`'
own pattern.

**Considered, not findings:** the supersession summary's S-094 line leaving out the D-033 addition, which its D-033
bullet states; S-092's `Confirmed-by` quoting the owner's _"told why the last judged clip failed"_ beside a Chose saying
every one's reasons, the widening being S-094's reading; S-091's _"carries that take's reasons"_, still true; D-033's two
inputs standing beside its rider.

**Could not check, carried to the slices:** whether `reel-render`'s check 37, which keys the assembler's declarations
by name, can take a second measured source without two variables named `video` colliding (Slice 4); three-take runs
against the 60-second lease (Slices 2 and 5); `zoompan` at the full 768 × 1366 profile (Slice 4).

**Findings by round: 17, 5, 0.**
