---
status: current
authority: plan
---

# resume-failed — a run a provider failed is made again once, as a new run that keeps every piece already checked; and a caller may name pieces not to keep

Status: planned
Decisions: D-005, D-014, D-018, D-022, D-024, D-025, D-027, D-030, D-031, D-042, D-045, D-047, D-058, D-065, D-081,
D-083, D-084, D-086, D-094, D-095, D-097, D-099, D-100, D-106, I-1, I-4, I-11, I-15, I-18, S-012, S-027, S-028, S-034,
S-035, S-036, S-037, S-039, S-043, S-046, S-048, S-055, S-058, S-059, S-061, S-063, S-066, S-069, S-070, S-071, S-073,
S-090, S-092, S-093, S-096, S-098, S-099, S-110, S-111, S-113, S-116, S-122, S-124, S-140, S-142, S-143, S-145, S-147,
S-150, S-151, S-153, S-155, S-156, S-157, S-160, S-161, S-162, S-163, S-164
Named only in the deferral list: D-023, S-115
Gates: product pending · architecture pending · program-design pending · slices pending

> **Created 2026-09-24 at the owner's request**, in session 48, after run `ee63e617…` failed. It had a plan accepted by
> Gate 0 and three pictures accepted by Gate 1, then failed 6 s into the video stage, before any clip was bought:
> MiniMax's word timings for shot 0's narration repeated a word ("Sun. Sun."), and the stage's parse refused them
> (S-070). A second run of the same brief planned again, drew again and paid again for the pictures. The owner: _"keep
> the assets saved from a run, if it fails find out what failed and re run for that and use the ones that were fine for
> that run."_ And on 2026-09-25, before the gates: _"if we retry a run we should be able to tell the system to
> regenerate the asset (with type) that is which asset we dont want reused"_.
>
> **The owner answered five questions on 2026-09-24 (S-157), sixteen on 2026-09-25 in four rounds before these gates
> were written, and three more that the first review raised** (S-161 to S-164): a named piece takes down **everything
> made from it**, the canonical's picture every derived picture too; naming rides **inside** the provider-fault rule
> and **spends the one resume**; a run **stopped at Gate 7** may be resumed by its caller; a **completed** run is a
> feature of its own; the caller asks through **a contract route with a free preview**; the resume carries **the same
> requestId**, and each run's status names the other; a **named piece's shot starts its own bounds afresh, and the
> reel's six picture calls stay one bound**; the engine judges a provider's fault as **the provider made nothing,
> answered unreadably, or reported its job failed**; a stills stage keeps **every decided picture**, and **a crash
> keeps them too**; each run reports **its own spend**; a **plan-stage** provider fault is resumed by planning again;
> the engine's resume waits **15 minutes**, a setting, **on in the service and off in the worker's default**; kept
> pieces carry **`keptFrom`** in the record; a run left running by a buried job is **deferred**; the owner's script
> **asks at its start** about any run still waiting; and a run whose caller asked to cancel is **never resumed by the
> engine, and resumed only if its caller asks**.
>
> **What the runs showed, read from their rows.** Run `ee63e617…` lost 15¢ of pictures and about 3.6 minutes to its
> rerun. Runs `124f1124…` and `9b23d24a…` (P-009) failed on fal's 504 in the stills stage; fal's upstream failed on
> and off for about ten minutes, and the next flux run, fifteen minutes on, made all four pictures. Run `bf8f4444…`
> (P-011) stopped at Gate 7 on a correct cut with every clip accepted, 55¢; run `74bb96a0…` answered the same caption
> question yes. `refused_answer` holds four rows, every one a witness's first ask that parsed on its second: no run has
> yet failed on an answer refused twice since S-156. **None of the failed runs can be resumed**: each failed
> before `run.failure` existed, so its kind is unknown, and a run whose kind is unknown is not resumable. Run `bf8f4444…`
> did not fail — it stopped at Gate 7 — so its caller may resume it (S-161), with or without pieces named.
>
> **What this feature is not.** It does not remake pieces of a completed reel (S-161, its own feature). It does not
> resume a stop on the brief's terms: every stop but Gate 7's is a new request. It is not a retry inside a run — the
> transient counter is that (S-096). It does not finish a run whose job was buried (Deferred 2). It does not change
> what a failed run reports, and it never raises the cap or the ceiling.

## Gate 1 — Product (no technical language)

**The problem.** A reel is made in steps — a plan, pictures, narration, clips, the finished cut — and each step pays a
service to make something. **When one of those services fails partway, everything the reel already made is thrown
away**: the next try plans again, draws again and pays again for pictures and clips that had passed every check.
Session 48 lost 15¢ and about four minutes that way on one run; on 2026-09-24 the picture service answered "busy" for
about ten minutes and two runs threw away their plans and 10¢ of pictures. And one reel whose every clip had passed was
refused at the very last check, on a question the same check answered yes to the next day — with no way to ask it
again. **And there is no way to say "make this one piece again"**: a person who does not want a picture, a narration or
a clip reused has to start the whole reel over.

**The visible outcome.**

- **A reel that fails because a service let it down is made again by itself, once**: a new try of the same request
  starts about fifteen minutes later (the wait is a setting), keeping every piece the failed try had finished checking
  — the plan, every picture, every narration, every clip — and making only what is missing. A shot the failed try had
  finished deciding stays decided: its picture, or its going on without one. The failed try stays failed. Each says
  where the other is: the new try names the one it continues, and the failed one names the try that continued it.
  Looking a request up by its own name finds the newest try.
- **A service let it down** means: the service made nothing (busy, down, too slow, still down after the retries a
  reel already makes); it answered with something that cannot be used (a file that is no picture or clip, words that
  do not read, an answer refused even after it was asked again and told why); it accepted the work and then reported
  it failed; or the machine stopped so often that a reel ran out of its picture tries. **Never**: a request the service
  refused as ours, a picture service that never makes the right size of picture, the video tool on this machine, the
  engine's own mistakes, or a check refusing what the request asked for. A reel that failed before this feature
  recorded why is never continued.
- **A reel that fails after its caller asked to stop it is never continued by the engine**; its caller may still ask
  for it. A reel that did stop at its caller's asking is never continued.
- **A person may ask for the new try instead**, once, of a reel the engine did not continue itself: a failed reel whose
  service let it down, or **a reel refused by the last check** (the one that watches the finished cut) — then the cut
  is made again and watched again, which costs nothing unless pieces are named.
- **A person asking may name pieces not to keep**: a picture, a narration or a clip, of one shot or every shot. The
  engine works out everything made from them — a picture's clip; the reel's first picture of its recurring subject
  takes with it every picture drawn from it and their clips; a narration its shot's clip, since a clip is made to the
  narration's length; any piece, the finished cut — and **before anything is spent the person is shown the whole list
  and what it is expected to cost**. The person then says go. Nothing else is made again. The plan cannot be named: a
  new plan is a new request.
- **A named piece is made as if for its shot's first time**: a shot whose clip is named gets its three tries again; a
  shot whose picture is named gets its picture tries again, **as far as the reel's six picture tries allow** once the
  pictures it keeps are counted. Pieces not named keep the tries they already used.
- **One new try in all**: a new try is never continued again, and the engine's and a person's are the same one.
- **Money**: the reel's own limit and the caller's limit count both tries together. A new try that would cross either
  is not started; a person is shown the figures instead, and whenever a new try — the engine's or a person's — cannot
  fit the reel's own limit, or the engine's cannot be made at all, the owner is asked, as when any reel reaches its
  limit. **Each try reports only what
  it spent**, so adding up tries never counts a cent twice.
- **A machine stopping mid-reel keeps pictures too**: the step that makes pictures, run again after its machine
  stopped, keeps every picture whose checks finished instead of drawing them all again — as clips already do.
- **The owner's own reel-making script** can ask for a new try, name pieces, show what would be made again and its cost,
  ask before spending — and it follows a new try the engine starts, saying it is waiting. **Before it spends anything,
  it names any reel still waiting from an earlier start and asks whether to cancel it**, so nothing left waiting is paid
  for unasked.

**What it costs.** **Nothing more for a reel that neither fails nor stops.** A new try costs what it makes again, at
today's rates about 5–8¢ a picture, 3–8¢ a clip, nothing for a narration, the cut or the checks' questions. The failed
tries of the record would each have kept what they had: 15¢ and about 3.6 minutes (the narration failure), 10¢ of
pictures and a minute and a half of planning (the busy picture service), and a new try after the last check's refusal
costs 0¢ and a few minutes. Naming pieces costs what they take down: in a four-shot reel whose first shot's picture
recurs in two others, naming that picture remakes four pictures — its two tries and the two drawn from it — and three clips, about 41¢; naming one narration,
about 5¢; naming every clip, about 20¢. **The engine's own new try adds a fifteen-minute wait** to the reel it saves.

**What does not change.** A failed reel's result, its updates and what it reports spent never change after it fails.
A reel that neither fails, stops nor has its machine stop makes exactly what it made before, and is refused, stopped or
completed exactly as before. **Every check a kept piece passed is the one it passed** — a kept piece is not checked
again — and a named piece is checked like any new one. Every cent keeps its receipt in the try that spent it. The
reel's limit and the caller's limit are not raised. A reel stopped on its own request's terms — a picture refused three
times, a clip failing three times, too costly to make — is still a new request to fix.

**The risk, said before anything is built.** A new try may meet the same failure: fifteen minutes is measured on one
outage. A failure whose real cause was the engine's own question to a model (P-004's count, P-005) is judged the
service's and tried once more — bounded by the one new try. The cost shown before a new try counts first attempts, not
repairs or retries, as every estimate here does; the two limits bound the rest.

## Gate 2 — Architecture

**Where each part lives.**

| package                  | what it gains                                                                                                                                                                                                  | what it still may not do                                  |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `packages/contracts`     | `FailureKind`, `failureKindOf`, five classes beside `Spent` and `Unavailable`; the resume's internal shapes (`ResumeInputs`, `ResumePlan`, `ResumeDecision`); the stills stage's kept input                    | import anything internal but `@cutroom/reel-contract`     |
| `packages/reel-contract` | the resume route, `ResumeRequest`, `ResumeResponse`, `Piece`; `RunStatus.resumes?`/`resumedBy?`; `RunRecord`'s `keptFrom?` — version 1 amended (S-034)                                                         | import anything internal; depend on anything but `zod`    |
| `packages/pipeline`      | `planResume` and `admitResume`, pure; the stills stage's kept input and its reserve; each stage's failed ending carries its kind                                                                               | reach for a port, do I/O, import an npm package but `zod` |
| `packages/providers`     | four throw sites raise the new classes; the stand-ins' scripted throw may name a class (`as`), checked when the stand-in ports are built                                                                       | keep durable state                                        |
| `packages/domain`        | migration 0007; `resumeRun`; `readResumeInputs`, `readStillsInputs`; `reelSpentCents`; `failure` written by `endRun`; lookup and replay answer the newest; labels reach the run it resumes; the planner's type | import the pipeline or providers                          |
| `apps/worker`            | the kind carried to the run; the engine's own resume, behind a switch off by default; the keyframes job's kept input                                                                                           | import `packages/providers` (`worker-no-providers`)       |
| `apps/api`               | the resume route, handed one function that plans and admits                                                                                                                                                    | call a provider                                           |
| `apps/service`           | the switch on, `resumeDelayMs` 15 minutes, that function built and handed to the API                                                                                                                           | —                                                         |

**A RESUME IS A NEW RUN OF THE SAME REQUEST THAT COPIES THE FAILED RUN'S KEPT ROWS INTO ITSELF, IN THE ONE TRANSACTION
THAT CREATES IT — SO EVERY STAGE, EVERY READER AND EVERY LABEL GOES ON READING ONE RUN'S ROWS, AND FINDS A KEPT PIECE
EXACTLY WHERE IT ALREADY FINDS AN EARLIER ATTEMPT'S.** Receipts are never copied: every cent stays with the run that
spent it (D-084). Files are never copied: a copied row keeps its stored absolute path, and no reader resolves a file by
run id (every read is of the stored `path`: `fal/upload.ts`, `fal/video.ts`, the sensors, `media.probe`, the
assembler). The rejected alternative — readers that read two runs' rows through a lineage — would change
`readClipsInputs`, `readRenderInputs`, `readRecord`, `readTakes`, `readNarrations` and the still-hold join, each a place
for S-092's "two of either for one shot" to become two runs' rows, and `still_hold`'s foreign key to `picture` would
refuse a hold on an inherited picture.

### Which endings are resumed, and who judges

| ending                                             | kind (`run.failure`) | the engine resumes it | a caller may resume it |
| -------------------------------------------------- | -------------------- | --------------------- | ---------------------- |
| `failed`: the provider made nothing                | `unavailable`        | yes, switch on        | yes                    |
| `failed`: an answer that cannot be used            | `unreadable`         | yes, switch on        | yes                    |
| `failed`: fal reported its job FAILED              | `provider-failed`    | yes, switch on        | yes                    |
| `failed`: the reserve, after crashes               | `crashed`            | yes, switch on        | yes                    |
| any of the four, its caller having asked to cancel | as above             | **no**                | yes (S-163)            |
| `failed`: the frame never made (P-010)             | `off-spec`           | no                    | no                     |
| `failed`: anything else                            | `engine`             | no                    | no                     |
| `failed` before migration 0007                     | null — unknown       | no                    | no                     |
| `stopped`, rule `gate-7`                           | —                    | no                    | yes (S-161)            |
| every other stop, a refusal, a cancel              | —                    | no                    | no                     |
| `completed`                                        | —                    | no                    | no (S-161: a feature)  |
| a run that resumes another                         | any                  | no                    | no (one in all)        |
| a run already resumed                              | any                  | no                    | no (one in all)        |

**The kind is decided where the error is caught, from its CLASS, by one function — never from a message**
(`failures.ts`'s rule, S-096's rejection of a marker). `failureKindOf(error)` in `packages/contracts/src/failures.ts`:

```text
failureKindOf(error)
  OffSpec          → 'off-spec'         checked before Spent: an OffSpec IS a Spent, so its lost call is still written
  RefusedRequest   → 'engine'           checked before Spent too: the provider answered that it refused OUR request
  Spent            → 'unreadable'       every provider answer we could not use, a model answer refused twice included
  Unanswered       → 'unreadable'       a model answer a GATE refused after its last ask
  Unavailable      → 'unavailable'      StillUnavailable (the counter spent) included
  ProviderFailed   → 'provider-failed'
  anything else    → 'engine'           a plain Error, a ZodError, a string, fs, ffmpeg, 4xx, the stand-in out of script
```

Two kinds are set by a return, not a throw, at the place that knows: **`crashed`** by the stills stage's two reserve
failures (`stills/index.ts:299-305`, `:357-363`), reachable only on a job run again after a crash (S-048, S-061); and
**`unreadable`** by the clips stage's refused word timings (`clips/index.ts:287-306`, P-001), which never throws.

**Five classes are new, beside `Spent` and `Unavailable`, each thrown where today a plain `Error` loses the fact, and
each with its message character for character what it is today** (so every verified assertion on a failure's detail
holds; the `test-impact` report found every one asserted by message, never by class):

- **`OffSpec extends Spent`** — `fal/image.ts:277`'s frame refusal (P-010). A `Spent` still, so `recordingSpend` writes
  its lost call as today (S-142).
- **`Unanswered extends Error`** — a model answer a gate refused at its last ask: the witness's second refusal
  (`gates/witness.ts:61`), Gate 1S's and Gate 7's unparsable judge answers (`gate1s.ts:48`, `gate7.ts:69`), and the text
  step's unparsable reading (`providers/src/ffmpeg/sensors.ts:171`).
- **`ProviderFailed extends Error`** — a job fal accepted and then reported FAILED, today the private `FalFault`, which
  passes unwrapped through `fal/video.ts:200-208`. **Both of the FAILED branch's shapes** (`fal/queue.ts:257-270`):
  the result read answering 200 (`:269`, the recorded `fal-video-silent`), and the result read answering a
  non-transient error (`send()`'s `FalFault` at `:143-146`, the recorded `fal-video-broken` and `fal-image-broken`, the
  usual shape) — the branch turns that fault into a `ProviderFailed` with the same message. Not an `Unavailable`:
  nothing sends it again inside the run, as nothing does today.
- **`RefusedRequest extends Spent`** — MiniMax's narration answering 200 with a non-transient `base_resp` status, the
  request refused as ours (auth, balance, a bad parameter): `minimax/narration.ts:309-329` sets `answered` before that
  check, so today it becomes a `Spent` (`:392-404`) and would read as `unreadable`. A `Spent` still, so its lost call is
  written as today (S-142); `engine`, as the model adapter's same case (`model.ts:646`) already is (S-163, the owner).
- **`StillUnavailable extends Unavailable`** — `apps/worker/src/transient.ts:45`, the counter spent. It is thrown by
  `sentUntilAvailable` itself, outside its own loop, and nothing above the counter catches an `Unavailable` to send
  again — `retryingModelPort` is the only thing that does, and it wraps the adapter, not itself (`worker.ts:177`);
  `askStructured` catches only a `Spent` carrying `refused`. Check 3 holds it.

`FalFault`'s other throws (4xx outside the FAILED branch, a body that is not the wire), the model's non-transient HTTP
answers (`model.ts:616`, `:646`) and the narration's private `Fault` before the provider answered stay plain errors, so
they are `engine`: a request that was wrong is wrong the second time (S-096). After it answered, the narration
adapter's `Spent` is `unreadable` — a body or timings it could not use — unless it is the `RefusedRequest` above.

**The stand-ins.** A scripted `throws` still throws a plain `Error` with that message, so a verified test that fails a
run with one still fails it as `engine`. The stand-in model's `Spent` for an answer its schema refuses
(`fake/model.ts:124-133`) is `unreadable`, as a real one is. No verified test switches the engine's resume on (S-163),
so neither resumes anything. An entry of the stand-in script file (S-116, parsed as `StandInScripts` at
`apps/service/src/service.ts:42-50`) may add **`as: 'unavailable' | 'spent' | 'off-spec' | 'unanswered' |
'provider-failed' | 'refused-request'`**: the stand-in then throws that class with `throws` as its detail, so its message is that class's
own for that detail — `Unavailable`'s _"the provider is unavailable: …"_, `Spent`'s _"… — and the call had already
spent (S-142)"_ (`failures.ts:74`, `:98`).

**Where the class becomes the kind**: the three stage catch-alls (`stills/index.ts:126-127`, `clips/index.ts:188-189`,
`render/index.ts:184-185`), where a thrown call already becomes a failed outcome (S-046), and the plan job's catch
(`plan-job.ts:113-117`; the plan stage has no catch of its own). Each stage's `failed` ending gains `failure:
FailureKind`. The job-level catches — the cap unreadable, `readClipsInputs`, `renderManifest` — are `engine`. The kind
reaches the row through the finishing functions' `failure` field, written by `endRun` into `run.failure` beside the
result. **The failed result does not change**: `RunResult`'s `failed` arm keeps exactly `contractVersion, costCents,
detail, requestId, runId, status` (S-157: the orchestrator reads nothing new of it).

**How ask-again's kept answers inform the judgement** (S-156): **by class, not by reading them.** A refused answer's
rows are written before its throw, and the throw carries the fact: a structured answer refused twice is the second
`Spent` (`structured.ts:35`), a witness answer refused twice an `Unanswered` — both `unreadable`. No engine code reads
`refused_answer` (S-156 stands); `scripts/refused.mjs <run>` is how a person reads what was refused before naming pieces.
The record says the question can be the cause — P-004's counts were P-005's shape — so an answer refused twice is
resumed once and never twice.

### How a resume is planned, admitted and made

```text
readResumeInputs(reader, origin, ending?)        domain, reads only — a caller's through the API's connection; the
                                                 engine's INSIDE the failing transaction, handed the ending and the
                                                 kind that transaction is about to write, after the stage's labels
  the origin's request, result and failure kind (or the ending handed in), cancel flag, its resumes / resumedBy and
  the resuming run's resume_request, its
  selected plan and every
  plan row, every DECIDED picture (gate1 outcome set) with its observation, reconciliation and degradation — of two
  decided pictures of one shot and label (a run from before S-164 restarted), the later attempt's only — every FINISHED
  narration (words and probe set), every DECIDED take (outcome set) with its observation and reconciliation, and
  reelSpentCents(origin)

planResume(inputs, remake, rates, by)            pipeline, pure — one planner for the preview, the call and the engine
  named   ← FIRST, the remake list normalised (below) — so a replay is recognised before anything is refused
  by 'caller', the origin already resumed: the resuming run's stored remake list equal to named → 'replayed', naming
            it; different, or the engine's (stored null) → 'resumed', naming it
  by 'engine': refuse unless the table's engine column says yes for the ending handed in (the cancel flag refuses)
  by 'caller': refuse 'not-resumable' unless the table's caller column says yes
  no selected plan (a plan-stage failure): any named piece → 'invalid' (there is no plan to name it by); else
            start 'plan', keep nothing, remade [], estimate 0                                   (S-163)
  normalised: each piece with no shot expanded to every shot that has that piece BY THE PLAN — a still where the
            plan places a picture, a narration and a clip on every shot of a video run — duplicates dropped, ordered
            by shot then still, narration, clip; a shot outside the plan, a still on a shot the plan places no
            picture on, or a narration or clip on a stills run → 'invalid'. By the plan, never the rows, so the
            list stored and compared does not depend on what the failed run happened to finish
  down    ← takedown(named):   still(s)      → still(s), clip(s); and if s is the canonical's shot, every derived shot's
                                               still and clip
                               narration(s)  → narration(s), clip(s)
                               clip(s)       → clip(s)                         (the cut and Gate 7 are always made again)
  keep.pictures   ← decided pictures whose shot's still is not down
  keep.narrations ← finished narrations whose shot's narration is not down
  keep.takes      ← decided takes whose shot's clip is not down
  keep.plans      ← every plan row
  estimate ← ceil( imageRate × Σ first calls of placements with no kept picture of that label ('a','b' | 'single')
                 + ONLY FOR A VIDEO RUN (until 'video' — a stills run was admitted on its pictures alone, and has no
                   clip or narration to make):
                   videoRate × Σ requestedSeconds(shot) over shots with no kept accepted take and not held on three
                              kept failed takes — its kept narration's measure, else the plan shot's durationSeconds
                 + narrationRate × Σ characters of narrations not kept )
  → { start: 'plan' | 'keyframes', keep, remade: the normalised takedown, estimateCents }

admitResume(spent, estimate, cap, ceiling)       pipeline, pure
  figure = spent + estimate;   figure > cap → 'reel';  else figure > ceiling → 'ceiling';  else admitted
  (exactly equal is admitted, as every guard here; S-059)

resumeRun(tx, origin, plan, { now, delayMs, resumeRequest })   domain, inside the caller's immediate transaction;
                                                 `now` the time the caller stamps everything else it writes
  re-read the origin: resumed already, or itself a resume → throw
  insert run { new id, the origin's request_id, request and request_canonical, resumes: origin,
               resume_request: the normalised remake list as canonical JSON, or null for the engine's; state running }
  copy plan rows; picture rows (kept_from = origin, chosen false, degradation AS IT IS) then their observation and
       reconciliation rows; narration rows (kept_from); take rows (kept_from, degradation null) then their
       take_observation and take_reconciliation rows — ids, attempts, paths, verdicts and measures unchanged
  append run.accepted; with plan rows: stage.started plan, one Gate 0 verdict per plan row, stage.finished plan
  enqueue the first job — reel.plan with no plan, else reel.keyframes — run_at now + delayMs, parent_id null,
       attempts = the origin's greatest attempts for that kind (0 if it had none)
```

**Why a resumed run always starts at the keyframes job when it has a plan**, whatever stage failed: one path through
the chain (S-069), and a stage whose pieces are all kept makes no call. The stills stage re-decides every shot from its
kept pictures with no call — the same choice, because a shot's accepted picture is a pure function of the decided
verdicts and scores (D-031, tie to `a`), two kept survivors ranked by the score totals their rows already store, never
by today's weights — and **a shot the failed run's ladder ended is never reopened** — accepted, or gone on without a picture (D-025): a kept picture
carrying a degradation (`markDegraded` writes it on the last failing picture whatever the stage's ending, S-058) makes
its shot degraded again, with that reason and no call, whatever the reserve now holds — its gate `1S` if that picture's
Gate 1S failed, else `1`. Without that, a shot the failed run degraded for want of a free slot would find one in the
resumed run (whose reserve counts only what it keeps), buy a repair, and meet its own kept text-to-video take. The
stills stage then writes `chosen` and every degradation's labels on its own rows, and advances; the clips stage does
what S-092 already does for kept narrations and takes, a shot held on its picture (S-090) included; the assemble job
always cuts again and asks Gate 7 again. **Degradation and still-hold rows are therefore never copied**: they are
decisions, written again from the kept pieces with no call, under the resumed run (S-058, S-098), so their foreign keys
and labels land on its own rows. **The resumed run's first job has no parent**: its link to the failed run is
`run.resumes`, never a `parent_id` across two runs.

**The engine's own resume** is made **in the transaction that fails the run, from the rows as that transaction has
just labelled them**. When a stage ends `failed` with a kind the table resumes and the worker's switch is on, the job
reads the cap before the transaction (a file) — inside the same `try`, so a cap that cannot be read is a resume that
could not be made, never a job buried — and hands the finishing function (`finishRun`, `finishStills`,
`finishVideo`) a synchronous `resume(tx, now)` it built from `readResumeInputs`, `planResume` and `admitResume`, with the
ending and kind about to be written. The finishing function's order is fixed:

```text
finishing transaction (immediate)
  1. the stage's labels and events — endStills (chosen, markDegraded), markStillHeld, the holds, the verdict events
  2. SAVEPOINT resume   — resume(tx, now), `now` the finishing function's own, the one run.finished is stamped
                          with: readResumeInputs(tx, origin, ending) — the cancel flag, resumed-already and
                          is-a-resume all read HERE, inside the transaction the API's requestCancel must wait for —
                          then planResume (no names) and admitResume; admitted → resumeRun(tx, …) copies the rows AS
                          THEY STAND NOW, the degradation step 1 wrote included
                          any throw → ROLLBACK TO resume, and the reason kept for after the transaction
  3. endRun             — run.finished, then the state and the failed result, then run.failure
  4. the job done
after the transaction: over the cap → one question with the four figures (D-097, D-100); could not be made → one line
naming the run and why; over the ceiling, or refused by the table → nothing
```

So the resume row exists before `run.finished` is appended, and a caller polling the failed run never sees it
`finished` without its `resumedBy`; and a degradation the failing attempt reached is on the picture row it copies — the
same fact check 19 proves for a resume made later, now proved for the engine's (check 40). **A resume that cannot be made
never stops the run from failing**: step 2's savepoint is rolled back and steps 3 and 4 run exactly as they would without
this feature. A cancel that lands after the job's stage but before step 2 is read in step 2 and refuses the resume; one
that lands after the transaction finds a finished run, as today.

**Every job's context gains ONE key, `resume?: ResumeContext`**, written as a plain property even when off, so a
check that reads the literal's keys sees it (absent or `undefined` is off; the switch, `delayMs`, the plan and render settings the
rates come from, `budgetPath`, `questionsPath`). `AssembleJobContext` has none of the last three today (`worker.ts`
builds it at `:209-214` with only `model`, `media`, `assembler` and `render`), and a Gate 7 failure — the judge
unavailable, or its answer unreadable — is resumable, so it gains them; it still gets no image, narration or video port
(I-18, read per run as below: nothing is bought after a run's own assembly begins).

**A caller's resume** is `POST /v1/runs/:runId/resume` (below). **The API is handed one function that plans and
admits**, `ApiOptions.resume: ResumeService`, typed in `packages/domain` (which the API already imports) over shapes in
`packages/contracts`: `(inputs, remake, capCents) => ResumeDecision`, answering `replayed` or `resumed` (naming the
resuming run), `refused` (`not-resumable` or `invalid`, with its detail), `budget` (the four figures), or `admitted`
(the plan, the estimate and the figures). A preview of a run already resumed answers as the call would — `resumed`, or
`replayed` for its own list — and writes nothing. `apps/service`
builds it from `planResume` and `admitResume` with the worker's own plan and render settings, so the preview, the call
and the engine's resume are one planner and one rule, and the API imports neither the pipeline nor `contracts`
(`apps/api/package.json` stays `domain` and `reel-contract`). The API reads `readResumeInputs`, reads the cap
(`readReelCapCents`, `ApiOptions.budgetPath` defaulting to `BUDGET_MD`; the service hands it
`settings.budgetPath`, the worker's own, so a caller's preview and admission read the cap the worker's guards read), and
`settings.questionsPath`, so a resume CALL refused at the per-reel cap appends one question, as every refusal at the
cap does (D-097, D-100; a preview writes nothing),
calls the function, and for `admitted` calls
`resumeRun` in one immediate transaction with no delay. An API started without the function answers the route `422
refused`, reason `unsupported` — the contract's _"the engine is running but cannot yet"_ (`reel-contract.md:166-167`).

### What a resumed run's stages do with kept rows

**The stills stage gains a kept input** — the change `S-164` makes, **for a crash and for a resume alike**, because both
are "an earlier attempt's decided pictures" once the rows are copied. `readStillsInputs(db, runId)` returns every picture
row of the run whose Gate 1 decided, with its observation, reconciliation, measure, words, score, Gate 1S verdict and
degradation, in the order made. `makeStills` consults it at every ladder step, before `make`:

- **a kept picture of that shot and label is used, not made**: no image call, no check, no receipt; its verdicts are
  emitted as events when the ladder reaches it, once, whatever the stage's ending afterwards (S-092's rule, for stills);
- **the canonical is best of two exactly as today** (D-030, D-042): a kept `a` with `b` never decided makes `b`; two kept
  survivors are ranked by the score totals their rows store (`picture.score`, with the weights it was computed by,
  `contracts/src/picture.ts:127-129`), with no call, so a change of weights between the two runs cannot change the
  choice the derived pictures were made from and judged against; only a survivor with no stored score — a `b` made in
  this attempt beside a kept `a` — is scored now, and then both are scored with today's weights; **a kept derived
  picture whose references do not name the chosen canonical is refused before any call, as an engine fault**;
  **a kept ACCEPTED repair is chosen outright; a kept FAILED repair, both candidates failed, stops the stage for rule
  `gate-1`** with no call, as the repair's failure does today;
- **a kept derived picture whose Gate 1S never ran has Gate 1S run** against the chosen canonical — similarity, and at
  most one `compare` call, never a second witness look (D-045, I-15); one whose Gate 1S decided is not compared again;
- **a kept failed picture is evidence**: its stored steps are what `gate1Why` and `gate1Failure` tell its shot's repair
  (D-047) — they read the kept record, not only this attempt's — and **a kept repair counts toward its shot's repairs
  (`REPAIRS_PER_SHOT`) and never takes a reserve slot again**: its call is in `earlier` already;
- **a kept picture carrying a degradation ends its shot**, as above;
- **a picture whose checks were cut off is made again**, under this attempt's id, as S-048 says.

**The reserve** (S-061) becomes `6 − earlier − unmade`, where **`earlier`** is the run's image receipts, its image lost
calls, and its pictures copied from another run (`kept_from` set) — `imageCallCount`, widened — and **`unmade`** is the
first calls of placements no kept picture satisfies (`a` and `b` for the canonical, `single` for the others). A kept
picture is in `earlier` and not in `unmade`, so it is counted once; a picture a crash cut off is in both, so the crash's
call counts, as S-048 counts it. **A shot whose still is named is not copied at all, so its own calls are not counted**;
the reel's six still bind it together with the pictures kept (S-161). A call of the failed run that left nothing kept —
a lost call, a picture cut off — is not counted in the resumed run's six, and its money is, by the cap and the ceiling.

**S-061's two failures change their words, not their places**: the figure compared with six is now `earlier +
unmade`, not the placement's calls, so the details become _"attempt N cannot make its pictures within 6 image calls:
the run made E before it and its placement makes U more, E+U in all (S-048)"_ and _"attempt N cannot repair the
canonical picture of shot-S: no reserve slot is free, the run having made E image calls before it and its placement
making U more of the 6 (S-048). …"_. Their run's kind is `crashed`.

**`picture.seq`** becomes the run's greatest `seq` plus one, taken in `recordGeneration`'s transaction, instead of its
receipts counted plus one — the same number for every run without copied pictures, and after them for a run with.

**The clips stage is unchanged in its logic** (S-092): `readClipsInputs`' `kept` — the run's finished narrations and
decided takes — now includes copied rows, and a take the failed run cut off is not copied, so it is made again under the
resumed run's attempt and counts against no cap. **One check is added before any call**: a kept take whose picture is not
its shot's chosen picture, or a text-to-video take on a shot that now has one, is refused as an engine fault — the
takedown and the carried degradations make it unreachable, and this makes a planner bug cost nothing instead of a render
refused after the clips are paid for (`manifest.ts:373-381`).

**The assemble job is unchanged**: `readRenderInputs` reads the copies, and its ledger stays the run's own receipts.

### Ids, seeds and attempts

Every job a resumed run enqueues starts its `attempts` at the origin's greatest `attempts` for that kind, so the first
claim is the origin's plus one. **Every id the resumed run makes is therefore new** — `a<attempt>-shot-<n>-<label>`,
`…-narration`, `…-take-<n>`, `a<attempt>-render` — and never one a copied row holds, and **a take's seed, the CRC-32 of
its id (D-018, S-071), is never the failed run's**: a named clip made again with the failed run's id would be sent the
same seed, prompt and seconds — the same request — and could come back the same clip. A take's `number` is still its
shot's decided takes plus one, so a named clip's takes are numbered from 1 (its old takes are not copied), and an
unnamed shot's go on from its kept ones.

### What the caller sees — `reel-contract`, version 1 amended (S-034's form, S-162)

The route and its schemas live in `@cutroom/reel-contract`, the one engine package a caller depends on (D-094, D-099);
the preview is D-095's free estimate, for a resume. Every top-level message and no nested object carries
`contractVersion` (D-106). `CONTRACT_VERSION` stays 1: no caller exists (S-034's reason holds; `steering-ref` has no
`@cutroom/*` dependency).

```text
POST /v1/runs/:runId/resume
  body   ResumeRequest  { contractVersion, remake?: Piece[], preview?: true }         strict, top-level
         Piece          { kind: 'still' | 'narration' | 'clip', shot?: 'shot-<n>' }    strict, nested, no version
  200    ResumeResponse { contractVersion, outcome: 'preview', runId, remake: Piece[], estimateCents, spentCents,
                          capCents, ceilingCents, limit?: 'reel' | 'ceiling' }          — spends and writes nothing
         estimateCents is, as everywhere in this contract, the figure compared with the limit (reel-contract.md:185):
         what the reel has spent plus what the resume would make — so the resume's own cost is estimateCents −
         spentCents, and the script prints both
  202    ResumeResponse { contractVersion, outcome: 'accepted', runId, resumes, replayed }
  409    ResumeResponse { contractVersion, outcome: 'refused', runId, reason: 'not-resumable' | 'resumed', detail }
         ResumeResponse { contractVersion, outcome: 'refused', runId, reason: 'budget', limit, estimateCents,
                          spentCents, capCents, ceilingCents }                          — no run is made (D-100's figures)
  422    ResumeResponse { contractVersion, outcome: 'refused', runId, reason: 'version' | 'invalid' | 'unsupported',
                          detail }
  404    ErrorResponse (no such run)       500 ErrorResponse

RunStatus  gains  resumes?: runId      on a run that resumes another
                  resumedBy?: runId    on a run that was resumed — computed from the rows each time, never stored in
                                       the failed run's row, result or events
RunRecord  pictures[] and takes[] gain  keptFrom?: runId    on each copied piece — a resumed run's record holds every
                                       picture and take it made, every attempt's, and every one copied into it; a
                                       failed run's cut-off and named pieces stay in the failed run's own record
```

- **Idempotent on the failed run**: a second resume call whose normalised remake list is the one stored
  (`run.resume_request`) answers `accepted`, `replayed: true`, with the same new run — the same pieces in another order,
  or named twice, are the same list; a different list, or any call on a run the engine resumed, answers `resumed`, its
  detail naming the resuming run.
- **One run per requestId becomes one run per requestId and its one resume**: the unique index on `run.request_id`
  becomes partial, `WHERE resumes IS NULL`; `run.resumes` is unique. **Lookup by requestId answers the newest** (the
  resume when there is one), and so does a replayed submit — the caller's name for the reel reaches its current run.
- **The failed run's result, events and `costCents` never change.** Its status gains `resumedBy`, computed.
- **Each run reports its own spend** (S-162): `costCents` is `spentCents(run)`, the run's own job rows, as today; the
  record's `keptFrom` says which pieces another run paid for.
- **The contract's stand-in engine** (`tests/stand-in/reel-engine-stand-in.ts`) answers the route `422 refused`,
  reason `unsupported` — as an API with no planner does — and `404` for an unknown run; it keeps its own schema and never
  resumes (Deferred 6).

### Cost, the estimate and the ceiling

- **The guards compare the reel's spend**, the resumed run's and the run it resumes together (S-157): `reelSpentCents(db,
runId)` = `spentCents(runId)` + `spentCents(run.resumes)` when set. The image, video and narration guards and the
  budget-stop questions' _"Spent"_ read it; results keep `spentCents`. For a run that resumes nothing they are one
  number, so no verified guard figure moves.
- **The ceiling is the request's `budgetCents`**, the same request — one ceiling for the reel. **The cap is
  `BUDGET.md`'s**, read when the resume is admitted and once per attempt after, as today.
- **Admission** is `admitResume(reelSpentCents(origin), planResume's estimate, cap, ceiling)` — at the call for a
  caller, in the failing job for the engine. Gate 0's cap check is not run again: the plan is the same.
- **The estimate counts first calls only** — no repair, no retry, no reserve — as the plan's does (S-035); the guard
  before every call bounds the rest, the reel's spend included. It prices at the worker's own rates (the real image
  entry's, 0.5¢ a second of video in the real adapter, 0 for narration; S-124, S-155).
- **The render manifest's ledger stays the run's own receipts**, and so does `costCents`; a kept piece's cost is in its
  own run's.

### Time, and the lease

- **The engine's resume is due `resumeDelayMs` after the failure** — 15 minutes in the service, a setting that refuses
  anything but a whole number of milliseconds at least 0; the worker's own default is **no resume at all** (S-163). The
  run exists at once, `running`, with `run.accepted` and its plan's events; `claimJob` already skips a job whose
  `run_at` is in the future.
- **A caller's resume starts at once.**
- **A kept stage costs seconds**: no call, only reads and — for a derived picture whose Gate 1S never ran — Gate 1S.
- **The lease does not change**: the resumed run's jobs are the same jobs, and S-113's floor still covers the longest
  (the clips job). One worker runs (S-113).
- **The owner's script keeps the service up while it follows**: `real-reel.mjs` stops the service when the run it
  follows finishes (`:432-433`), which would leave the engine's resume queued. It reads `resumedBy` on each poll and
  follows the resume to its end, printing the wait. **And before it starts the service**, it reads — read-only — every
  run still `running` with a job queued or running, names each, and asks: **cancel them** (the default) or let them run.
  Cancelling sets each run's cancel flag through `@cutroom/service`'s `cancelRuns` — the domain's `requestCancel`,
  re-exported, since the script imports no `@cutroom/domain` (the root `package.json` has no `@cutroom/domain` dependency) — before the worker starts, so the worker's
  first claim of such a job answers `cancelled` at `startStage` (S-027) and buys nothing. So a resume left waiting by a
  stopped script is never paid for by the next start unasked.

### What is kept, and where (D-022, D-084, D-086)

| table                                                                                                           | copied                                  | reset on the copy | added column                           |
| --------------------------------------------------------------------------------------------------------------- | --------------------------------------- | ----------------- | -------------------------------------- |
| `run`                                                                                                           | —                                       | —                 | `resumes`, `failure`, `resume_request` |
| `plan`                                                                                                          | every row                               | —                 | —                                      |
| `picture`                                                                                                       | every decided picture not taken down    | `chosen` false    | `kept_from`                            |
| `observation`, `reconciliation`                                                                                 | each copied picture's                   | —                 | —                                      |
| `narration`                                                                                                     | every finished narration not taken down | —                 | `kept_from`                            |
| `take`                                                                                                          | every decided take not taken down       | `degradation`     | `kept_from`                            |
| `take_observation`, `take_reconciliation`                                                                       | each copied take's                      | —                 | —                                      |
| every receipt, `lost_call`, `refused_answer`, `degradation`, `still_hold`, `render`, `hold`, `run_event`, `job` | never                                   | —                 | —                                      |

No new text is written that a model or a provider produced: a copy is a copy of rows already redacted where D-022
requires it (`refused_answer` is not copied at all). `run.resume_request` is the caller's normalised remake list, a
closed vocabulary of three kinds and shot ids.

**Labels on kept pieces** (I-4, S-058, S-063, S-098): a degraded shot's receipts are those of **the shot's pictures the
deciding attempt used — made or kept** — never a picture cut off; a held shot's and a short clip's (S-073) are its takes'. Each is
marked degraded **in the run and in the run it resumes** — `markStillHeld`, `markDegraded` and `finishVideo`'s holds
update receipts by `run_id IN (run, resumes)` — because a kept piece's receipt lives in the run that paid for it. A
label is a fact about a piece; the failed run's result, events and status stay as they were.

### The receipts (D-005, D-084), per case

| case                                                                  | written                                                                                                                |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| the preview                                                           | nothing: no run, no job, no row, no receipt                                                                            |
| a caller's resume refused at the per-reel cap (a call, not a preview) | one question, as D-097 and D-100 require of every refusal at the cap; the rest nothing                                 |
| a resume refused for any other reason                                 | nothing                                                                                                                |
| a resume made                                                         | the run row, its copies, its events, its first job — no receipt                                                        |
| a kept piece reached by its stage                                     | its verdict events; no call, no receipt                                                                                |
| a piece made in the resumed run                                       | exactly what the same piece writes in any run, under the resumed run                                                   |
| the engine's resume refused at the cap                                | one question after the failing transaction; the failed run as it would be without this feature, plus `failure`         |
| the engine's resume that could not be made                            | one line in the questions file after the failing transaction; the failed run as it would be without it, plus `failure` |

### What this feature changes in verified features (S-099's form)

Each change lands in the slice whose code would otherwise leave that feature's checks red or wrongly green, with an
amendment block in S-143's form above that feature's gates, and each amended feature's journey is run again in this
feature's last slice: **`reel-contract`** (the route, three schemas, two status fields, one record field; version 1;
the stand-in's answer), **`reel-plan`** (the run table's index, lookup and replay), **`reel-stills`** (a restart keeps
decided pictures; the reserve and its words; `seq`), **`reel-render`** (I-18 and a Gate 7 stop read per run) and **`reel-takes`** (labels in two runs; the
kept-take check), **`paid-failures`** (the classes; `imageCallCount` widened), **`ask-again`** and **`second-ask`**
(the witness's second refusal is an `Unanswered`; `gates/witness.ts` is `second-ask`'s file),
**`paid-path`** (the service's switch and delay; the script), and **`three-pictures`** (the reserve over standalone
placements — its code, not its checks). Gate 3 lists every check.

### Decisions superseded in part, each in S-147's form (S-161 to S-164)

- **S-048**'s _"**makes every picture again from the start, and pays for them again**"_ becomes _"keeps every picture an
  earlier attempt decided — accepted or failed — and makes again only a picture whose checks were cut off, paying for
  that"_ (S-164); its _"and the attempt's reserve is 6 − those calls − the placement's calls"_ becomes S-061's new
  formula below. What stands: a picture whose checks were cut off is made again and never looked at twice (D-045,
  I-15), its earlier receipt, file and cost stay, and a restart that cannot fit fails before its call.
- **S-092**'s _"**S-048 stands for the stills stage**: a keyframes job run again still starts over and pays again"_
  becomes _"a keyframes job run again keeps its earlier attempts' decided pictures, as the clips job keeps its decided
  takes (S-164)"_; and S-092's _"its stage skips what earlier attempts finished"_ is read, in a resumed run, with the
  failed run's finished narrations and decided takes among them, because they are copied into it. Every other rule of
  S-092 stands, the cut-off take made again and counting against no cap included.
- **S-061**'s _"**`reserveOf(placements, earlierImageCalls)`** (`stills/ladder.ts`) is 6 − the earlier calls − the
  placement's calls"_ becomes _"6 − the earlier calls, the run's copied pictures among them, − the first calls of the
  placements no kept picture satisfies"_; its _"**`imageCallCount`** (`packages/domain/src/ledger.ts`) is the number of
  the run's `generation_receipt` rows, every attempt's"_ becomes _"… its `generation_receipt` rows and image `lost_call`
  rows, every attempt's, and its pictures copied from the run it resumes"_ (the lost calls already counted in code since
  `paid-failures`, `ledger.ts:24-50`); and its details _"the run made 3 before it and its placement makes 4, 7 in all
  (S-048)"_ and _"the run having made 2 image calls before it and its placement making 4 of the 6 (S-048)"_ become _"the
  run made E before it and its placement makes U more, E+U in all (S-048)"_ and _"the run having made E image calls
  before it and its placement making U more of the 6 (S-048)"_ (S-164). Its two failures, their places and their order
  stand; their run's kind is `crashed`. Its `Caught by` _"exactly 0 failed (also 48)"_: check 48's reserve is now 1, and
  checks 49a and 49d, amended, catch that break.
- **S-046**'s _"a restarted attempt's earlier pictures are none chosen"_ becomes _"a restarted attempt's earlier
  pictures are chosen when the ladder keeps them"_; its _"**A picture's row is written with its image receipt**"_
  stands for every picture a run makes, and a copied picture's receipt is in the run that made it (S-164). Its _"Only
  the finishing attempt's verdicts become events"_ stands: the finishing attempt emits its kept pictures' verdicts too,
  each once.
- **S-046**'s _"Each row carries **`seq`**, the run's image-call number, taken from the run's receipts in that
  transaction"_, and `reel-stills`' Gate 2 _"the run's image-call number, 1 to 6"_, become _"… the run's picture number,
  its greatest plus one — above 6 in a resumed run, whose copied pictures keep their numbers"_ (S-164).
- **S-046**'s _"**The record holds every picture made, every attempt's, in `seq` order**"_, **S-093**'s _"**one entry
  per take made, every attempt's, in the order made** — a cut-off take too"_, and **`reel-contract`'s** _"One entry **per
  picture made**"_ (Gate 2, and its check 21) become _"… made by the run, every attempt's, or copied into it, with
  `keptFrom`"_; a failed run's cut-off and named pieces stay in the failed run's own record (S-162).
- **S-055**'s _"taking **`seq`** there as the run's receipt count plus one"_ becomes _"… as the run's greatest `seq`
  plus one"_ — the same number wherever no picture is copied (S-164).
- **S-058**'s _"The receipts marked are the shot's pictures **this attempt made**"_ becomes _"… the shot's pictures the
  deciding attempt used, made or kept, in whichever run holds their receipts"_ (S-164). Its rejection of _"**Every
  attempt's pictures of the shot**"_ stands for a picture cut off, which no ladder used — and so does **S-063**'s _"the
  first attempt's picture of that shot has its receipt unmarked and no degradation"_, whose first-attempt picture is
  cut off.
- **S-157**'s _"**Pictures Gate 1 ACCEPTED are kept** — superseding S-048 for those only; a picture whose checks were cut
  off is made again, as S-048 says"_ becomes _"every picture whose checks finished is kept — accepted or failed, after a
  failure and after a crash"_ (S-164); its _"**Only provider faults are resumable**"_ and _"A gate refusing on the brief's
  own terms (S-145's Gate 7, S-151's Gate 5) would fail the same way"_ become _"… and a run stopped by Gate 7, by its
  caller, once"_ (S-161); and its _"the caller, by a new call on a failed run"_ becomes _"… on a failed run, or on one
  stopped by Gate 7"_; and its _"if it has not — it judged the failure not a provider's — the caller may ask once"_
  becomes _"if it has not, the caller may ask once — for a provider's fault or a Gate 7 stop, never an engine or
  off-spec failure"_ (S-163, the owner's answer to the third review). Everything else S-157 says stands.
- **D-058**'s _"**No provider call may follow the reel's first assembly.** If no edit op fixes the failure, the reel
  **fails and is labelled** — it does not re-enter L3"_, **I-18**'s _"Nothing is bought after assembly begins … Gates 7
  and 8 repair with edit ops or they fail the reel"_ (`steering-ref/docs/founding/reel-creation-engine/contentions.md`),
  **S-066**'s _"a reel that fails Gate 7 stops for rule `gate-7`: nothing more is bought"_ and **S-099**'s _"a Gate 7
  failure stays terminal"_ are read **per run** (the owner, after the ninth review): no provider call follows a run's
  first assembly, and a run that fails Gate 7 stays stopped and buys nothing more. A caller's resume of it is a new run,
  which buys only before its own first assembly — priced and admitted against the cap and the ceiling before any call,
  as I-1's check before spending requires — and its own Gate 7 is final for it. `reel-render`'s _"Until then a Gate 7
  failure is terminal"_ (`reel-render.md:1399`) is read the same way, in its amendment block (S-161).
- **D-047**'s `Confirmed-by` _"No run produces four image calls against one canonical entry"_ and _"A fixture manifest
  entry that cannot pass Gate 1 produces exactly three image receipts … with all three verdicts attached"_, **D-065**'s
  _"terminates with three image calls"_ and **D-030**'s _"a derived keyframe issues exactly one call unless its gate
  fails"_ — which S-048 superseded _"for a restarted attempt only"_ — are read per run with the pictures it keeps, for a
  restarted attempt and a resumed run alike: a resumed run's receipts for one entry, with its kept pictures, carry at
  most three; the reel's two runs together carry at most the failed run's cut-off calls beyond that (S-164).
- **S-043**'s _"**The reserve is 6 − the placement's calls** — 2 for a placed canonical and 1 for each placed derived
  picture, a rank with no free shot left out (S-039) — less a restarted attempt's earlier calls (S-048)"_ becomes S-061's
  new formula below, `6 − earlier − unmade` (S-164).
- **D-027**'s _"Two of the six permitted image calls are left unspent at plan time and held as reserve"_ is read with
  S-164's reserve, a shot whose still a caller names not counting its own old calls (S-161); and its `Confirmed-by`
  _"No Phase 1 reel's receipts carry more than 6 image calls"_ becomes _"No run's receipts, with the pictures it keeps
  from the run it resumes, carry more than 6 image calls; a resumed reel's two runs together carry at most its failed
  run's calls that left nothing kept, and its named shots' old calls, beyond that"_ (S-164, S-161).
- **D-024**'s _"A shot may consume **3 paid clip takes** — one initial plus two retries"_ and its `Confirmed-by` _"no
  fourth video job is submitted for it"_ are read per run, as S-092 read them across attempts: a shot whose clip, still
  or narration a caller names may take three more in the resumed run (S-161).
- **D-014**'s _"retries ≤ 2 per shot"_ becomes _"retries ≤ 2 per shot, counted over the kept takes of a resumed run —
  and a shot whose clip, still or narration a caller names starts its retries afresh"_ (S-161). `BUDGET.md`'s row is the
  steering repository's and is not edited; this entry is what it is read with here.
- **D-081**'s _"The $3.00 per-reel cap (I-1) is enforced against the sum of `cost_cents` across one `correlation_id`"_
  and **S-036**'s _"The spend the guard compares (S-035) is **`SUM(cost_cents)` over every job row sharing the run's
  `correlation_id`**"_ become _"… across the run's `correlation_id` and that of the run it resumes"_ (S-162). S-036's _"A
  run's `costCents` is that sum"_ stands, for the run's own.
- **D-081**'s `Confirmed-by` _"A test that a reel's rows share one `correlation_id`"_ becomes _"… a run's rows; a
  resumed reel's two runs each their own, linked by `run.resumes`"_ (S-162).
- **S-037**'s _"exactly one `observe` receipt per picture"_ (superseding D-045's _"Exactly one vision call appears in
  the receipts per generated image"_) is read per run that made the picture: a copied picture's one `observe` receipt
  is in the run that made it, and the resumed run adds none for it (S-164).
- **S-069**'s _"**The chain** is `reel.plan` → `reel.keyframes` → `reel.clips` → `reel.assemble`, each row created,
  with the run as `correlation_id` and the job before it as `parent_id`"_ is read, for a resumed run, with its chain
  starting at `reel.keyframes` (or `reel.plan`, after a plan-stage fault) with no parent (S-162). D-081's _"linked by
  `parent_id` and `correlation_id`"_ stands within each run.
- **`reel-contract`'s** _"The same `requestId` with the same content … returns the same run with `replayed: true`"_ and
  its lookup _"to find a run again by your own name"_, **`reel-plan`'s** _"equal returns the stored run with `replayed:
true`"_, and `packages/domain/src/schema.ts:16`'s _"One run per requestId"_ become _"… the newest run of the request —
  its resume, once there is one"_ and _"one run per requestId, and its one resume"_ (S-162).

## Gate 3 — Program design

**File locations.**

```text
packages/contracts/src/failures.ts        FailureKind, failureKindOf, OffSpec, RefusedRequest, Unanswered, ProviderFailed,
                                          StillUnavailable
packages/contracts/src/resume.ts          ResumeInputs, ResumePlan, ResumeDecision, the stills stage's kept picture (new)
packages/contracts/src/picture.ts         seq's comment (:150)
packages/contracts/src/index.ts           the exports
packages/reel-contract/src/resume.ts      Piece, ResumeRequest, ResumeResponse (new file)
packages/reel-contract/src/responses.ts   RunStatus.resumes?, resumedBy?
packages/reel-contract/src/record.ts      pictures[].keptFrom?, takes[].keptFrom?
packages/reel-contract/src/routes.ts      'POST /v1/runs/:runId/resume'
packages/reel-contract/src/index.ts       the exports
packages/pipeline/src/resume/index.ts     planResume, admitResume, takedown, normalise (new folder, entered through the index)
packages/pipeline/src/stills/index.ts     the kept input; the ladder consults it; gate1Why and gate1Failure read kept
                                          pictures; the carried degradation; the two failures' new words; failure on
                                          every failed ending
packages/pipeline/src/stills/ladder.ts    reserveOf(placements, earlier, kept)
packages/pipeline/src/clips/index.ts      failure on every failed ending; the kept-take check
packages/pipeline/src/render/index.ts     failure on its failed ending
packages/pipeline/src/gates/witness.ts, gate1s.ts, gate7.ts   throw Unanswered
packages/pipeline/src/index.ts            the exports
packages/providers/src/fal/image.ts       frameRefusal throws OffSpec
packages/providers/src/fal/queue.ts       a FAILED job throws ProviderFailed, its result read answering 200 or an error
packages/providers/src/minimax/narration.ts   a non-transient base_resp status throws RefusedRequest
packages/providers/src/ffmpeg/sensors.ts  the text step's unparsable reading throws Unanswered
packages/providers/src/fake/image.ts, video.ts, narration.ts, model.ts   a scripted throw's optional class (`as`)
packages/providers/src/ports.ts           StandInScripts' entries gain `as`; a value outside its six refuses to build the
                                          stand-in port, so a misspelt class is never a plain error in disguise
packages/domain/src/schema.ts             run.resumes, failure, resume_request; picture/narration/take.kept_from;
                                          the partial unique index; the comment at :16
db/migrations/0007_resume_failed.sql      drizzle-kit, never typed by hand (S-012)
packages/domain/src/resume.ts             readResumeInputs, resumeRun, the copy, the ResumeService type (new file)
packages/domain/src/runs.ts               endRun writes failure; the finishing functions take an optional resume(tx, now), run
                                          after the labels in a savepoint and before endRun; readRunByRequestId and submitRun answer the newest; statusOf's
                                          pointers; markStillHeld's labels in two runs
packages/domain/src/queue.ts              enqueue's optional starting attempts, which admitStills, advanceStills and
                                          advanceClips pass for a resumed run
packages/domain/src/ledger.ts             reelSpentCents; recordGeneration's seq; imageCallCount counts copies
packages/domain/src/pictures.ts           readStillsInputs; markDegraded's labels in two runs; readRecord's keptFrom
packages/domain/src/clips.ts              no query change; the comment at :404-407
packages/domain/src/index.ts              the exports
apps/worker/src/transient.ts              throws StillUnavailable
apps/worker/src/resume.ts                 the engine's resume: read, plan, admit, hand to the finishing function (new)
apps/worker/src/plan-job.ts, keyframes-job.ts, clips-job.ts, assemble-job.ts   failure carried; ResumeContext; the
                                          engine's resume; the keyframes job reads readStillsInputs
apps/worker/src/guarded-image-port.ts, video-port.ts, narration-port.ts   reelSpentCents
apps/worker/src/questions.ts              appendResumeQuestion (cap refused; could not be made); the stop questions'
                                          "Spent" from reelSpentCents
apps/worker/src/worker.ts                 WorkerOptions.resume { delayMs } — absent is off; every context built with it
apps/api/src/server.ts                    RESUME_ROUTE, the handler; ApiOptions.resume, budgetPath
apps/service/src/settings.ts, service.ts  resume on, resumeDelayMs 900000; the ResumeService built and handed to
                                          startApi (:101) with budgetPath: settings.budgetPath
apps/service/src/index.ts                 resumeService({ planSettings, renderSettings }), the ResumeService's one
                                          builder, taking the settings the worker prices with; waitingRuns(dbPath),
                                          through a read-only connection, and cancelRuns(dbPath, runIds), for the
                                          owner's script
scripts/_answers.mjs, _answers.d.mts     answers(input): pure, importing NOTHING — handed the whole redirected
                                          input, it hands out one line to each question; its declaration file keeps the
                                          strict typecheck green; neither names the script (check 20's third test reads
                                          every other script for it). Not in _lib.mjs, which imports child_process
tests/fixtures/wire/minimax-t2a-rejected.json   T2A answering HTTP 200 with a non-transient base_resp status (1004,
                                          the documented shape of an answer refusing the request), "case": "rejected" —
                                          three parts, as paid-path's check 21 requires of every fixture's name
scripts/real-reel.mjs                     one `post(path, body)`; makeReel and resumeReel; --resume <runId>,
                                          --remake <kind[:shot],…>; the start's question on waiting runs; follows
                                          resumedBy; redirected input read once, one line to each question
tests/engine/restart.ts                   killedAgain(engine, killed, next): a further kill of the same run; takenUp
                                          reads the attempt it expects
tests/engine/harness.ts, stills.ts, video.ts, plans.ts, service.ts   the resume switch; scripted classes; a helper that
                                          fails a run on purpose and resumes it the way the API does; startApi (:207,
                                          :312) handed @cutroom/service's resumeService built from the harness's own
                                          plan and render settings, and the harness's budgetPath (:194-197), so the
                                          API reads the same cap as its worker — never a second copy
tests/stand-in/client.ts                  the resume route in Route, EXPECTED and routeOf; a resume helper
tests/stand-in/reel-engine-stand-in.ts    the resume route answering 422 unsupported, 404 for an unknown run
tests/resume-failed-*.test.ts             the checks below
docs/features/reel-contract.md, reel-plan.md, reel-stills.md, reel-render.md, reel-takes.md, paid-failures.md,
ask-again.md, second-ask.md, paid-path.md, three-pictures.md   amendment blocks, S-143's form, each in its slice
```

**The import graph** (`no-circular` counts type imports): `reel-contract` ← `contracts` (`resume.ts` imports `Piece`)
← `pipeline/src/resume` ← `pipeline/src/index.ts`; `domain/src/resume.ts` imports `contracts` and `reel-contract`, never
the pipeline; `apps/worker/src/resume.ts` imports `domain` and `pipeline`; `apps/api` imports `domain` and
`reel-contract` only, and is handed the `ResumeService` its type names; `apps/service` imports `pipeline` to build it,
as it already imports `DEFAULT_PLAN_SETTINGS`. No file imports back up this chain.

**The checks.** Each is one test, named by its number, in the order of the slices.

_The kind — `tests/resume-failed-kinds.test.ts`_

1. `failureKindOf answers by class alone: an OffSpec is off-spec, a RefusedRequest engine, a Spent unreadable, an Unanswered unreadable, an Unavailable and a StillUnavailable unavailable, a ProviderFailed provider-failed; and a plain Error, a ZodError, a string, and a plain Error whose message is character for character each class's message are engine` — S-163.
2. `every site the closed list names throws its class with its message unchanged: fal's frame refusal an OffSpec on recorded wire, a job fal reports FAILED a ProviderFailed on recorded wire in both of its shapes — its result read answering 200 (fal-video-silent) and answering an error (fal-video-broken, fal-image-broken) — MiniMax's narration answering HTTP 200 with a non-transient base_resp status a RefusedRequest on recorded wire (minimax-t2a-rejected, new; the existing refused and denied fixtures fail before the answer and stay engine as plain errors), the witness's second refusal, Gate 1S's and Gate 7's unparsable answers and the text step's unparsable reading an Unanswered, and a spent counter a StillUnavailable — each message equal to the one a verified check pins today` — S-163, S-096, S-142.
3. `a StillUnavailable is sent no further time: a model, a video and a narration call answered unavailable at every send is sent exactly maxAttempts times in all, its run failed unavailable, and no receipt written` — S-096, I-11.
4. `a run failed through the worker carries its kind on its row and nowhere else: a scripted unavailable picture, a spent clip, a witness refused twice, refused word timings and a FAILED fal job each fail their run with that kind in run.failure and their detail pinned, and the failed result's keys are exactly contractVersion, costCents, detail, requestId, runId, status` — S-157, S-163.
5. `the stand-in running out of its script, a plain scripted throw, a cap file that cannot be read and a render manifest refused each fail their run engine, and an off-spec picture off-spec, each with its detail pinned` — S-163.

_What a crash keeps in the stills stage — `tests/resume-failed-stills.test.ts`_

6. `a stills stage failing on its reserve after crashes fails its run crashed, in S-164's words: killed three times inside a picture's checks, attempt 4 answers "attempt 4 cannot make its pictures within 6 image calls: the run made 5 before it and its placement makes 2 more, 7 in all (S-048)" before any call` — S-061, S-164.
7. `a keyframes attempt run again after a crash keeps every picture an earlier attempt decided, accepted or failed: no image call, no sensor measure, no witness or reconcile call and no receipt for it, its verdicts events once in the finishing attempt, and only the picture whose checks were cut off made again under the new attempt's id and paid again` — S-164, S-048.
8. `the canonical stays best of two: a kept a with b cut off makes b and chooses by score, tie to a; two kept survivors are ranked by their stored score totals with no call, and still so after the weights are changed between the runs; a kept derived picture whose references do not name the chosen canonical is refused before any call, engine; a kept accepted repair is chosen outright; a kept failed repair with both candidates failed stops for gate-1 with no call; and the choice over kept pictures equals the choice the first attempt would have made` — D-030, D-031, D-042, D-047.
9. `a kept derived picture whose Gate 1S never ran has Gate 1S run against the chosen canonical with no image call and no witness call; one whose Gate 1S decided is not compared again` — D-045, I-15.
10. `a kept failed picture's stored reasons reach its shot's repair prompt; a kept repair counts toward its shot's repairs and takes no reserve slot again; and the reserve is six less the run's image receipts and image lost calls, less the first calls of placements no kept picture satisfies — over a recurring placement and an upToThree placement with standalones` — S-061, S-150, D-047.
11. `a picture's seq is the run's greatest seq plus one: a run without copied pictures numbers them 1, 2, 3 as before, and a restarted run's new pictures follow its kept and cut-off ones` — S-164, S-055.

_The resume — `tests/resume-failed-resume.test.ts`_

12. `planResume keeps every plan row, every decided picture, every finished narration and every decided take, and nothing cut off; a narration measured and not timed (P-001) is made again; of two decided pictures of one shot and label, the later attempt's is kept` — S-157, S-164.
13. `the takedown: a still takes its shot's clip; the canonical's still every derived shot's still and clip; a standalone's still its own shot only; a narration its shot's clip; no shot means every shot that has that piece; the list is normalised — expanded, without duplicates, in shot and kind order; and a shot outside the plan, a shot with no such piece, a narration or clip on a stills run, and any piece on a run with no selected plan are refused invalid` — S-161.
14. `the estimate is the first calls of every placement with no kept picture at the image rate, plus the requested seconds of every shot with no kept accepted take and not held at the video rate — from its kept narration's measure, else the plan's — plus the characters of every narration not kept at the narration rate, rounded up once; and for a stills run's resume, its pictures alone` — S-161, D-083, S-035.
15. `admitResume admits a figure exactly equal to a limit and refuses one cent over, the cap before the ceiling` — D-100, S-059.
16. `resumeRun, in one transaction, makes a run of the same requestId and request that resumes the origin; copies the kept rows with kept_from set, chosen false, a picture's degradation as it was and a take's reset; copies no receipt, lost call, refused answer, degradation, still-hold or render; appends run.accepted and the plan's events; and enqueues one job with no parent, due after the delay, its attempts the origin's; a second resumeRun on the same origin, and one on a resume, throw and leave nothing` — S-162, S-157.
17. `a resumed run's jobs claim the origin's attempts plus one for each kind, so no picture, narration, take or render id it makes equals one the origin holds, and a named clip's first take is sent a different seed from the origin's first take of that shot` — S-162, D-018.
18. `a run failed at a derived picture by an unavailable image call completes on its resume: no image call for a kept picture, one call for each missing one, no narration or video call beyond its shots' own, its video shows the kept shots' chosen pictures, and its reserve counts each copied picture once, as an earlier call and never as a first call still to make` — S-157, S-164.
19. `an unnamed resume never reopens a shot the failed run's ladder ended: a shot the failed run degraded for want of a slot — its crash-cut picture not copied, so the resumed reserve has a slot — stays degraded with no image call and its gate and reason as they were, its kept text-to-video take is used, and the run completes` — S-164.
20. `a run failed in the clips stage resumes at the first shot not finished: a kept narration is not spoken, a kept decided take is not made, a take the origin cut off is made again under the resumed run's attempt counting against no cap, and a shot's next take is numbered from its kept decided takes` — S-092, S-164.
21. `a run failed in the plan stage by a provider fault resumes by planning again, keeping nothing and costing nothing: the resumed run writes its plan rows and stage.finished plan and completes, having used exactly the planner and scorer answers a first plan uses` — S-163.
22. `a shot held again in the resumed run from three kept failed takes is held with no call, and its four labels are written: its still_hold row under the resumed run, the reason on its third take's copy, each of its takes' receipts marked degraded in whichever run holds it, and its degraded event` — I-4, S-098.
23. `a kept take whose picture is not its shot's chosen picture, or a text-to-video take on a shot that has one — rows a test writes by hand, since the takedown never leaves one — is refused before any call with its detail pinned, its run failed engine, and no narration or video call made` — S-164.
24. `the resumed run's result reports only its own spend and its render manifest's ledger only its own receipts; the origin's row, result, events and job rows are byte for byte what they were before the resume, but for its receipts' degraded labels` — S-162.
25. `the guards compare the reel's spend: with a ceiling of 100, an origin that spent 55 and a resume admitted at 75 for one five-second clip at 4c a second, scripted to cost its estimate, a first retake after a Gate 2 failure is made at 95 and a second is refused at 115 with limit ceiling, estimate 115, ceiling 100 and cap 300` — S-157, S-162, D-100.

_The call — `tests/resume-failed-contract.test.ts`_

26. `ResumeRequest and each arm of ResumeResponse carry contractVersion and Piece does not; each is strict; a Piece refuses a kind outside still, narration and clip and a shot not shaped shot-<n>; and RunStatus's resumes and resumedBy and the record's keptFrom are optional and absent on a run that resumes nothing` — D-106, S-034, S-162.
27. `the preview names every piece made again in shot order with estimateCents — what the reel spent plus the resume's estimate, the figure compared with the limit — what the reel spent, the cap and the ceiling, and the limit it would cross; and it writes nothing — every table's rows, read through a second connection, and that connection's PRAGMA data_version are unchanged` — S-161.
28. `the route resumes once, with 202 and the new run, a failed run of each resumable kind — its caller's cancel flag set or not — and a run stopped at gate-7; the same call again, its pieces reordered or repeated, replays it, and so does its preview, writing nothing; a different list, a run the engine resumed, a resume, an off-spec, engine or unknown-kind failure, every other ending and a running run are refused with the reason named; an unknown run is 404` — S-161, S-162, S-163.
29. `a resume over the cap or the ceiling is refused with the limit, estimateCents — the figure compared, spent plus estimate — what the reel spent and both limits, and no run, job or row is made; a run of the same request with budgetCents one higher, failed the same way, is resumed; and a call refused at the per-reel cap appends one question to the questions file the service hands the API, a preview none, a refusal at the ceiling none` — D-100, D-097.
30. `lookup by requestId and a replayed submit answer the newest run of the request; the failed run's status names the run that resumed it and the resume's names the failed run` — S-162.
31. `the record of a resumed run lists each kept picture and take with keptFrom the origin and each one it made without; used is true exactly for the takes its video shows, kept ones included` — S-162, S-093.
32. `a resume after Gate 7's stop naming nothing makes the cut again and asks Gate 7 again with no image, narration or video call, using exactly one judge answer: the event verdict 7 accept, the run completed, its result's video the new cut` — S-161.
33. `naming a clip makes that shot's takes afresh, numbered from 1 under the resumed run's attempt with its three takes, and keeps every other shot's clip; naming the canonical's still makes it and every derived picture again, their old calls not counted; and a named derived shot gets the repairs the six still allow once the kept pictures are counted` — S-161, D-014, D-027.
34. `the service hands the API the ResumeService built from the worker's own settings, so the preview of a run stopped at gate-7 with a still named — a stop, which the service's own resume never takes, and a named piece, so the estimate is not 0 — gives estimateCents equal to the reel's spend plus planResume's estimate at those rates, and hands it the worker's budgetPath, so a preview's capCents equals a cap written to the file CUTROOM_BUDGET_PATH names; an API started without the service answers the route 422 unsupported` — S-162.

_The engine's own resume — `tests/resume-failed-engine.test.ts`_

35. `with the switch on, a run failed unavailable, unreadable, provider-failed or crashed is resumed once, its resume written before its run.finished event in one transaction — a trigger the test adds on that event's insert records that the resume row already exists; with the switch off, the worker's default, none is` — S-163.
36. `the engine never resumes a run that resumes another or a run whose caller asked to cancel — each failed with a resumable kind in run.failure and its detail pinned, so only the rule refuses it — nor an off-spec or engine failure — the stand-in out of its script included — a stop, a refusal, a cancel or a completion; each run's own ending is asserted, and no run resumes it` — S-157, S-163.
37. `the engine's resume that the cap cannot fit starts no run and appends one question naming the failed run and the four figures; one the ceiling cannot fit starts no run and writes nothing; each failed unavailable, its kind and detail pinned, and the same failure with a ceiling that fits is resumed` — D-100, D-097.
38. `a resume the engine cannot make — a trigger the test adds makes its run insert raise, or its cap file cannot be read — leaves the failed run failed with its kind and detail, its job done, no resume row, no copied row, and one line in the questions file naming the run and why` — S-163.
39. `the service turns the engine's resume on with a delay of 900000 ms by default and refuses a delay that is not a whole number of milliseconds at least 0; started with a stand-in script file failing a picture as unavailable and a short delay — CUTROOM_RESUME_DELAY_MS, SETTING_NAMES' new entry — it resumes that run — the resume's row exists, its resume_request null, its job's run_at the failed run's run.finished time plus the delay; the worker started without the option does not resume` — S-163, S-153, S-116.
40. `the engine's own resume copies the failing transaction's labels: after a crash cuts off a picture, a second attempt degrades shot-1 for want of a slot and then fails unavailable on a later picture; the engine's resume, made in that transaction, keeps shot-1 degraded with its reason and no image call` — S-163, S-164.

_The owner's script — `tests/paid-path-real-reel.test.ts`, which owns the script (paid-path's check 20)_

41. `real-reel.mjs --resume <runId> posts the preview with preview: true written as a literal, prints each piece and the estimate, asks for the figure the preview printed, exits before any paid post if it is not typed, then posts the resume with no preview key — resumeReel holding no post to /v1/runs and makeReel none to a resume; and its poll follows resumedBy to the resumed run's end` — S-162, S-110.
42. `before startService, real-reel.mjs reads the running runs with a job queued or running through a read-only connection, names each, asks, and on the default answer cancels each through @cutroom/service's cancelRuns — all before the service starts; and every question takes its answer from _answers.mjs's answers(input) — tested directly in tests/resume-failed-script.test.ts, which does not name the script: handed one input of three lines, three questions get one line each — while the script's text asks nothing any other way` — S-163.

_The owner's script's service half — `tests/resume-failed-script.test.ts`_

43. `@cutroom/service's waitingRuns answers none when the database does not exist yet, as on a fresh checkout's first run, and creates no file; names every run still running with a job queued or running and writes nothing — a second connection's PRAGMA data_version and every table's rows unchanged — and cancelRuns sets each named run's cancel flag and changes nothing else` — S-163.

_The journey_

44. `every other test of this feature passes in a child process whose environment holds only PATH and what the operating system needs to start Node, in S-028's form` — S-028, S-111.

**Amended checks in verified features**, each in the slice whose code would otherwise leave it red or wrongly green,
each asserting the failure it names and not only a failed run (`second-ask`'s rule). Found by the `test-impact` agent,
statically, file by file, on 2026-09-25 at `bd9a32f`, and worked through against the code for the two restart files:

- **`reel-stills`, check 48** (`tests/reel-stills-restart.test.ts`, Slice 2) — **red**. `r48` (`:34-294`) holds at model
  call 5, inside `a1-shot-0-b`'s Gate 1, after `a1-shot-0-a` DECIDED and accepted. **It keeps its crash point, which
  already proves both halves of S-164**, and asserts the new facts in place of S-048's: its finishing script leaves out
  the kept picture's answers — `stillsScript(THREE_RANKS, [b, barons, hall])`; `engine.image.calls` is `['a2-shot-0-b',
'a2-shot-1-single', 'a2-shot-2-single']` (`:86`); the stills name `a1-shot-0-a` (tie to `a`, the stand-in's sensors
  scoring both equal) (`:68`); the events are unchanged (`:90-101`), the first shot-0 verdict now the kept picture's,
  once; the record holds `a1-shot-0-a` chosen, `a1-shot-0-b` with checks `technical, text` and no ids, then
  `a2-shot-0-b`, `a2-shot-1-single`, `a2-shot-2-single` (`:111-163`); the seqs are `[a1-shot-0-a,1,1] [a1-shot-0-b,2,1]
[a2-shot-0-b,3,2] [a2-shot-1-single,4,2] [a2-shot-2-single,5,2]` (`:164-174`, `:281-288`, its recorder check reading
  `a2-shot-0-b` at seq 3, `:245`); five generations (`:188-198`); the job `['reel.keyframes', 'done', 2, 7]` (`:221`).
  **Added**: every model receipt after the planner's names only `a1-shot-0-a`, then `a2-shot-0-b`, `a2-shot-1-single`
  and `a2-shot-2-single`, witness then reconcile; the sensors' `measure` calls name exactly the three `a2-` pictures.
  `r48-budget` (`:296-356`) **keeps its 90¢ on `a1-shot-0-b`** — the property S-036's `Caught by` names, a restarted
  attempt stopped by its first attempt's cost — and is refused on `a2-shot-0-b` at 90 + 15 = 105 as before, its result,
  calls, generations, record and jobs unchanged; only its events gain `'verdict 1 shot-0 accept'` before
  `'run.finished stopped'`. Its title and the comments at `:17-24` and `:84-87` are reworded.
- **`reel-stills`, check 49** (`tests/reel-stills-restart-reserve.test.ts`, Slice 2) — **red**, all five tests: one kill
  cuts off exactly one picture, so under S-164 each reserve is at least 1 and none reaches its property. **Each keeps its
  first kill and adds kills of the same run at call 1 of each further attempt — the witness of the picture that attempt
  makes — through `killedAgain`**, each kill adding one to `earlier` and nothing to `unmade`, so the new formula is the
  one reached and the old one would give a different answer in every test:
  - **49a** (`:46-98`), two kills, the second `made ['a1-shot-0-a','a1-shot-0-b','a2-shot-0-b']`: attempt 3's reserve is 0
    (the old formula −1); calls `['a3-shot-0-b','a3-shot-1-single','a3-shot-2-single']`; six generations; shot-1
    degraded at gate `1`, last `a3-shot-1-single`, attempt 3, `/no reserve slot is free/`; stills `shot-0 a1-shot-0-a`,
    `shot-2 a3-shot-2-single`.
  - **49b** (`:100-150`), two kills, the first with `a1-shot-0-a` scripted clipped so it is kept DECIDED FAILED: attempt 3
    makes `a3-shot-0-b`, clipped too, and fails before the repair: _"attempt 3 cannot repair the canonical picture of
    shot-0: no reserve slot is free, the run having made 3 image calls before it and its placement making 3 more of the
    6 (S-048). a1-shot-0-a failed Gate 1 at reconcile: … a3-shot-0-b failed Gate 1 at reconcile: …"_ — the kept
    candidate's reasons read from its stored steps; four generations; events unchanged.
  - **49c** (`:152-201`), three kills cutting off `a1-`, `a2-` and `a3-shot-1-single`: attempt 4 fails before any call —
    every call list `[]` — with _"attempt 4 cannot make its pictures within 6 image calls: the run made 5 before it and
    its placement makes 2 more, 7 in all (S-048)"_; five generations.
  - **49d** (`:203-232`), the same three kills: attempt 4's reserve is 0 where the plan's four calls would give −1, so the
    placement, not the plan, is still what is counted; calls `['a4-shot-1-single']`; six generations; stills `shot-0
a1-shot-0-a`, `shot-1 a4-shot-1-single`.
  - **49d-degraded** (`:234-286`), the same three kills, the fourth attempt's picture failing: shot-1 degraded, last
    `a4-shot-1-single`, attempt 4; its receipts `[a1-…,false] [a2-…,false] [a3-…,false] [a4-…,true]` — the cut-off
    pictures unmarked, as S-063 says.
    Each also asserts `run.failure = 'crashed'` where it fails. `tests/engine/restart.ts` gains `killedAgain`, which
    asserts every receipt so far, the events `[...PLANNED, 'stage.started stills']`, the keyframes job `running` at one more
    attempt, and a claim after the lease; `takenUp` reads the attempt it expects (`:160`).
- **`paid-path`, check 20** (`tests/paid-path-real-reel.test.ts:112-178`, Slice 6) — **green for the wrong reason**
  under a script with one `post()` helper: `"method: 'POST'"` counted once would be the helper's definition, and
  `confirmed < submitted` a fact about where it is defined. **Amended, removing no assertion**: two markers are
  re-pointed — `confirmed` to the reel's own gate, the one comparing `confirmation(ceiling)`, and `submitted` to the
  SUBMIT call site — and the rest is
  added: `method:` appears
  once, inside `function post(`; `post('/v1/runs', request(requestId, ceiling))` appears once; the preview post, with
  `preview: true` as a literal, once; the resume post, with no `preview` key, once; no other call of `post(`; one
  `createInterface`, and two `!== confirmation(` gates, the second comparing the figure the preview printed; in source
  order either `[corners, range, gate, SUBMIT]` precedes `[PREVIEW, gate, RESUME]` or follows it, each gate exiting
  before its paid post; and `makeReel` and `resumeReel` each hold one path. Its existing ceiling, `CEILING_CENTS` and
  key assertions stand as written.
- **`reel-render`, check 40** (`tests/reel-render-completed.test.ts:228-289`, Slice 5) — **red**: it pins
  `AssembleJobContext` by the compiler (`type Asked = 'model' | 'media' | 'assembler' | 'render'`, `Same<keyof
AssembleJobContext, Asked>`, `:235-237`), by the worker's source (the literal handed to `runAssembleJob` has exactly
  `['assembler', 'media', 'model', 'render']`, `:284-288`) and by `runAssembleJob`'s three arguments (`:276`). **Amended
  by exactly one key**: `Asked` and the expected literal gain `'resume'`, the argument count stays three, and its other
  half — no port that buys, `Bought` never, and the source scan for ports that buy — stands as written.
- **`paid-path`, check 20's second test** (`tests/paid-path-real-reel.test.ts:78-100`, Slice 6) — **gains one
  assertion**: every local module the file imports reads no `child_process`, so the file that may name the spending
  script can never be handed a way to start it. It removes nothing.
- **`reel-plan`, check 13** (`tests/reel-plan-service.test.ts:149-156`, Slice 4) — **red** the moment
  `tests/stand-in/client.ts`' `EXPECTED` gains the resume route: every route and status in it must be produced by the
  real engine. Amended to produce the route's 200, 202, 404, 409, 422 and 500 — the 500 in its dropped-tables block
  (`:131-145`) like every other route's.
- **`reel-contract`, checks 1, 2 and 5** (`tests/reel-contract-shapes.test.ts:77-178`, Slice 4) — **green for the wrong
  reason**: `MESSAGES` and `NESTED` are hand-listed, so `ResumeRequest`, `ResumeResponse` and `Piece` would escape every
  check over them. `ResumeRequest` and each arm of `ResumeResponse` join `MESSAGES`, `Piece` joins `NESTED`, each with a
  valid example; `RunStatus`'s example gains `resumes` and `resumedBy`, `RunRecord`'s `keptFrom`.
- **`reel-contract`, check 18** (`tests/reel-contract-following.test.ts:118-125` and the client's parse on every reply,
  `tests/stand-in/client.ts:50-59`, Slice 4) — **green for the wrong reason** while the stand-in does not serve the
  route. The stand-in answers it (`422 unsupported`, `404` unknown), and check 18 gains a case: a resume of a known run
  parses as `refused`, reason `unsupported`, its `runId` the run; of an unknown one, `404 not-found`.

**Read and found green for the right reason** (the same report): every throw the new classes replace is asserted by
its message only, never its class — `paid-failures-retry.test.ts:120-129`, `reel-takes-transient.test.ts:238, 262`,
`second-ask-*`, `ask-again-witness`, `reel-stills-faults.test.ts:96`, `reel-render-faults.test.ts:241`,
`reel-render-gates.test.ts:316`, `reel-takes-labels.test.ts:311`, `paid-path-video.test.ts:787-789`; the failed
result's exact keys and whole value (`reel-stills-faults.test.ts:57-65`, `reel-render-faults.test.ts:261-268`,
`reel-plan-endings.test.ts:385-396`), because the failed arm does not change and no verified test switches the
engine's resume on; no test pins the migration list, the `run` table's columns or the unique index's name; no
`startService` test fails a run on a provider fault; `reel-stills-reserve.test.ts` (check 40), whose single-attempt
reserve is the same number under the new formula; every clips restart (`reel-render-restart*`,
`reel-takes-restart-budget`), which S-092 already governs; replay and lookup (`reel-plan-restart`, check 46;
`reel-contract-restart`, check 27), where one run holds its requestId; and every `parent_id` assertion
(`reel-render-advance.test.ts:78-121`, `reel-render-chain.test.ts:159-194`), made of one run. **Not read line by line**:
every numeric assertion in `reel-stills-spending`, `reel-render-spending` and `reel-takes-guard` (none makes a resumed
run, so `reelSpentCents` is `spentCents` in each), and every test of `reel-contract-endings`, `-asking` and
`-following` in full.

**Sentences that go stale, amended in the slice that makes them stale**: `schema.ts:16`'s _"One run per requestId"_
(Slice 1); `transient.ts`' _"Still `unavailable` at the last send, it THROWS"_ — now a class (Slice 1);
`fal/queue.ts:71`'s `FalFault` comment (Slice 1); `contracts/src/picture.ts:150`'s _"The run's image-call number,
1..6"_ (Slice 2); `stills/index.ts:294-297` and `:352-356`'s S-048 sentences, `schema.ts:117-121`'s and `ledger.ts:86-90`'s _"the
run's image-call number taken from the run's receipts"_, `ladder.ts:32-37`'s _"less the placement's calls"_,
`ledger.ts:24-28`'s `imageCallCount` comment, `keyframes-job.ts:52-55`'s _"every picture of it this attempt
made"_ and `:108-111`'s _"a job run again after its worker died makes every picture again"_ (Slice 2); `clips.ts:404-407`'s _"every row here is an earlier attempt's"_ (Slice 3);
`apps/api/src/server.ts`' header, which names the contract's routes (Slice 4); `worker.ts:208`'s context comment (Slice
5); `packages/reel-contract/src/record.ts:5-6`'s _"one entry per picture made"_ (Slice 4); `packages/contracts/src/failures.ts:3`'s _"Two classes"_, `:13`'s _"Both are CLASSES"_, `schema.ts:118`'s _"Written with
its image receipt"_, `:293`'s _"is a row, written with its receipt"_, `:297`'s _"One row per narration made, written
with its speech receipt"_ and `:338`'s _"Written with its video receipt"_ — each untrue of a copied row,
`fal/queue.ts:208-210` and `:260`'s FAILED job _"is a fault"_ and _"sending the same request again would buy the same
refusal"_ (Slice 1); `packages/domain/src/pictures.ts:263`'s `DegradedShot.pictureIds`, _"Every picture of the shot this
attempt made"_, `:22-23` and `:110`, and `packages/pipeline/src/stills/index.ts:50`'s _"This attempt's pictures"_ (Slice
2); `packages/reel-contract/src/record.ts:30` and `apps/api/src/server.ts:189` (Slice 4); `apps/worker/src/questions.ts:6-7`
and `:17`, whose header says entries come only from a cap's refusals (Slice 5); `real-reel.mjs`' header and its
_"this run's own receipts"_ (Slice 6). Each feature whose code or tests a slice
touches gains its amendment block in that slice.

**The four least confident decisions.**

1. **Copying rows rather than reading through a lineage.** Every reader stays as it is, but a copy is a second row of
   one fact: a later change to a copied table must remember `kept_from`. Checks 16 and 24 pin what is copied and what
   the origin keeps.
2. **Every `Spent` without `OffSpec` or `RefusedRequest` is `unreadable`, so resumable** — including an answer cut off at the token budget
   (`model.ts:547`), which S-140 says asking again at the same budget cuts again. One resume bounds it; if it recurs, it
   earns its own kind.
3. **Two things a ladder decided are carried, and nothing else**: a degradation, the one decision that depends on the
   reserve (check 19), and the canonical's ranking, by the score totals stored with the weights they were made by
   (check 8) — a change of weights would otherwise re-choose the picture every kept derived picture was drawn from. A
   third such decision would be a third carried field.
4. **Fifteen minutes** is one outage's measure (P-009). A setting, so the next outage can move it.

## Gate 4 — Slices

- [ ] **Slice 1 — the kind.** The five classes and `failureKindOf`; the throw sites; the stand-ins' `as`, checked
      where the stand-in ports are built; each stage's failed ending carries `failure`; migration 0007 with every column of this feature
      (unused until their slices) and the partial index; `endRun` writes `failure`. Amendment blocks: `paid-failures`,
      `ask-again`, `second-ask`, `reel-plan`, and — for the code this slice touches — `reel-stills` (`gate1s.ts`, the stills stage's
      failed ending), `reel-render` (`gate7.ts`, the render's and the clips stage's failed endings), `reel-takes`
      (`transient.ts`) and `paid-path` (`fal/image.ts`, `fal/queue.ts`, `ffmpeg/sensors.ts`,
      `minimax/narration.ts`). **Proves: 1 to 5.**
- [ ] **Slice 2 — what a crash keeps.** `readStillsInputs`; the stills stage's kept input, the ladder consulting it, the
      kept reasons, the carried degradation, the two failures' new words; `reserveOf`'s new formula; `seq`;
      `killedAgain`; the amended checks 48 and 49 of `reel-stills`. S-048 superseded. Amendment blocks: `reel-stills`,
      `three-pictures`. **Proves: 6 to 11.**
- [ ] **Slice 3 — the resume, made by a test.** `readResumeInputs`, `planResume`, `admitResume`, `resumeRun`; starting
      attempts; `reelSpentCents` in the guards and questions; `imageCallCount` counting copies; labels in two runs; the
      kept-take check. A test helper resumes a failed run the way the API will. Amendment blocks: `reel-render`,
      `reel-takes`, `reel-stills` (`guarded-image-port.ts`, `imageCallCount`, `markDegraded`), `paid-failures`
      (`imageCallCount`'s lost calls, widened) and `reel-plan` (`enqueue`, `admitStills`, `advanceStills`,
      `advanceClips`). **Proves: 12 to 25.**
- [ ] **Slice 4 — the call.** `reel-contract`'s route and schemas, version 1 amended; `RunStatus`'s pointers; the record's
      `keptFrom`; the API's route handed the `ResumeService`; the service building it; lookup and replay the newest;
      the stand-in engine's answer and the stand-in client; the amended checks 1, 2, 5 and 18 of `reel-contract` and 13
      of `reel-plan`. Amendment blocks: `reel-contract`, `reel-plan`, `reel-stills` (`readRecord`), `reel-takes` (the
      record's takes, S-093) and `paid-path` (`apps/service`, its composition root). **Proves: 26 to 34.**
- [ ] **Slice 5 — the engine's own resume.** The worker's switch, off by default; one `resume` key on every job's
      context; the amended check 40 of `reel-render`; the finishing functions' fixed order — labels, the resume's savepoint reading the rows as labelled,
      then `endRun`; `appendResumeQuestion`; the service's switch and
      `resumeDelayMs`. Amendment blocks: `paid-path`, `reel-plan` (`finishRun`, the plan job), `reel-stills`
      (`finishStills`, the keyframes job), `reel-render` and `reel-takes` (`finishVideo`, the clips and assemble jobs,
      the contexts in `worker.ts`). **Proves: 35 to 40.**
- [ ] **Slice 6 — the owner's script.** One `post()`; `makeReel` and `resumeReel`; `--resume`, `--remake`, the preview,
      the confirmation and the follow; the start's question on waiting runs, through `@cutroom/service`'s
      `waitingRuns` and `cancelRuns`; input read once; the amended check 20 of `paid-path`.
      Amendment block: `paid-path`. **Proves: 41, 42, 43.**
- [ ] **Slice 7 — the journey.** Check 44; this feature's journey, and `reel-contract`'s, `reel-plan`'s,
      `reel-stills`', `reel-render`'s, `reel-takes`', `paid-failures`', `ask-again`'s, `second-ask`'s, `paid-path`'s and
      `three-pictures`' again (S-099's form). **Proves: 44.**

Every check appears in exactly one slice: 5 + 6 + 14 + 9 + 6 + 3 + 1 = 44.

## Outcome

1. **A run failed by a provider's fault is resumed once** — by the engine in the service, fifteen minutes on, unless
   its caller asked to cancel it, or at its caller's asking — as a new run of the same request that keeps every piece
   already checked, never reopens a shot already decided, and makes only what is missing; the failed run's result never
   changes.
2. **A caller may name pieces not to keep**, sees what they take down and what it will cost before anything is spent,
   and each named piece is made as if for its shot's first time, within the reel's six picture calls.
3. **A run stopped by Gate 7 may be resumed by its caller**, making the cut again and asking again.
4. **A keyframes job run again after a crash keeps every picture it had decided**, as the clips job already did.
5. **The reel's cap and ceiling count the failed run and its resume together, and each run reports its own spend.**

## Evidence (newest first; appended by the journey, never typed by hand)

## Divergence (the first broken boundary, or "none")

none

## Deferred

1. **Remaking pieces of a completed run** (S-161) — a feature of its own; `video-edits` covers only free edits.
2. **A job whose runner throws outside its stage is buried and its run stays `running`** (`worker.ts:229-230`,
   `queue.ts:101-103`) — never failed, so never resumable, and never finished for its caller (S-163). Its own small
   feature.
3. **The image port has no transient counter** (S-096, S-122): one fal 504 fails a run where a clip's would be sent
   again. A resume is now the second chance; the counter is not built here.
4. **An engine resume the cap refused, or could not make, is not visible to the caller** — only to the owner, as a
   question; the failed run's result never changes (S-157).
5. **Parallel shots** (D-023, S-115) — held by the owner; `PROMPTS/053`.
6. **The contract's stand-in engine never resumes**: it answers the route `422 unsupported` and keeps its own schema,
   one run per requestId. When KnowScroll's orchestrator is built against it, the route is served for real.

## Gate review 1 — 2026-09-25, adversarial reviewer, same session

Read against the gates, S-157, S-161 to S-164 and the code at `bd9a32f`. **17 findings; all four gates NOT APPROVED.**
Three became owner questions, answered before this revision (S-161, S-163): the six stay shared (8), the script asks
at its start (13), and a caller may resume a run it asked to cancel (2).

1. **An unnamed resume could reopen a shot the failed run's ladder had ended**, buy a picture, and meet its own kept
   text-to-video take. **Fixed:** a kept picture carries its degradation, which ends its shot with no call (Gate 2);
   check 19.
2. **The engine would resume a run whose caller asked to cancel.** **Fixed:** never by the engine; by the caller when it
   asks (the owner); checks 28, 36.
3. **An error in the engine's resume would leave the run `running` forever.** **Fixed:** read, plan and admit in a
   `try`, `resumeRun` in a savepoint; the run always fails; check 38.
4. **Check 49's amendment could not be built; S-061's words could not stay.** **Fixed:** each case worked through with
   further kills (`killedAgain`); S-061's details superseded with the new figures; check 6 moved to Slice 2.
5. **Check 48's amendment misread the test and would have weakened `r48-budget`.** **Fixed:** worked from the test; the
   90¢ stays on `a1-shot-0-b`.
6. **Paid-path check 20 would be green for the wrong reason.** **Fixed:** amended, every call site named once.
7. **Decisions changed and not named.** **Fixed:** S-046, S-055, S-058 (S-063 standing), S-061's `imageCallCount`,
   S-092's stills sentence, D-027's `Confirmed-by`, S-069's chain, and the replay rules of `reel-contract` and
   `reel-plan`, each in S-147's form; the first job gets no parent rather than a link across runs.
8. **A named shot's "full tries" was not what the reserve gives.** **Fixed by the owner:** the six stay shared; Gate 1
   and check 33 say so.
9. **Check 29's unchanged bytes would miss a write in the WAL.** **Fixed:** check 27 reads every table and `PRAGMA
data_version`.
10. **Checks 22 and 26 could pass on the stand-in running out of script.** **Fixed:** checks 23 and 36 pin details,
    kinds, calls and each ending.
11. **Check 24 conflicted with admission.** **Fixed:** check 25 is a retake outside the estimate, with its figures.
12. **Slice 4 needed Slice 5's code.** **Fixed:** the call is Slice 4, the engine's resume Slice 5; check 35 observes
    the order by a trigger.
13. **A resume left queued is spent by the next start unasked.** **Fixed by the owner:** the script asks at its start;
    check 42.
14. **The API's admission was open.** **Fixed:** one `ResumeService` that plans and admits, typed in `domain`; the API's
    dependencies do not change.
15. **The assemble job could not admit or ask.** **Fixed:** `ResumeContext` in every job's context.
16. **Reel-contract check 18 would be green for the wrong reason.** **Fixed:** the stand-in answers `422 unsupported`;
    check 18 amended.
17. **Minor slips.** **Fixed:** line numbers; the stand-in script's parse site; `as` messages; the stand-in model's
    `Spent`; runs from before 0007 not resumable; the later of two decided pictures kept; kept repair wording and its
    slot; the remake list normalised; the 22¢ stop left out of Gate 1.

## Gate review 2 — 2026-09-25, the same reviewer, reading the revision

Read against the revision, S-161 to S-164 and the code at `bd9a32f`. **4 findings; product APPROVED, architecture,
program design and slices NOT APPROVED.** Every round-1 fix was checked and held, the amended checks 48 and 49 worked
again against the new formula, and every superseded quote checked character for character. None needed the owner.

1. **The engine's resume was planned from rows read before the run had failed**: a null kind would have refused every
   engine resume, `endRun` writes `run.finished` before the result, and a copy planned before the finishing transaction
   would drop the degradation that transaction writes — round 1's first finding again, on the engine's path.
   **Fixed:** the finishing transaction's order is fixed — labels, then the resume's savepoint reading the rows as
   labelled with the ending handed in, then `endRun`; check 40, the worked case.
2. **A cancel between the job's read and the finishing transaction would be resumed.** **Fixed:** the cancel flag is
   read inside the savepoint, as S-027 settles the flag and a stage's start in one transaction.
3. **The script could not import `requestCancel`, and redirected input answers one question.** **Fixed:**
   `@cutroom/service` exports `waitingRuns` and `cancelRuns`; the input is read once and each question takes the next
   line; check 42.
4. **Deferred 2 claimed the start's question names a run with a buried job.** **Fixed:** the sentence is gone.

## Gate review 3 — 2026-09-25, a fresh reviewer

Read whole, against S-157, S-161 to S-164, every superseded source character for character, and the code at
`bd9a32f`. **13 findings; all four gates NOT APPROVED** — product only on the owner's question, answered before this
revision: a caller resumes a provider's fault or a Gate 7 stop, never an engine or off-spec failure (S-163).

1. **A FAILED fal job whose result read answers an error — the recorded, usual shape — was `engine`.** **Fixed:** both
   shapes of the FAILED branch throw `ProviderFailed`; check 2 uses both recorded pairs.
2. **A replay could not be told from a different list without a second copy of the rule.** **Fixed:** `planResume`
   normalises first and answers `replayed` or `resumed` itself; `readResumeInputs` reads the resuming run's list; a
   preview of a resumed run answers as the call.
3. **S-157's clause letting a caller resume a failure the engine judged not a provider's still stood.** **Fixed by the
   owner:** superseded by name (S-163).
4. **D-024 was not named.** **Fixed:** its three takes and its `Confirmed-by`, read per run.
5. **A narration refused as ours would read `unreadable`.** **Fixed by the owner:** `RefusedRequest extends Spent`,
   `engine`.
6. **Check 42's redirected-input half could not be built from the script's text.** **Fixed:** `answers()` in
   `scripts/_lib.mjs`, tested directly.
7. **Check 36's "a run already resumed" was unreachable.** **Fixed:** dropped; checks 16 and 28 hold that rule.
8. **The harness's API was never handed a `ResumeService`.** **Fixed:** `@cutroom/service` exports its one builder, and
   the harness hands it to `startApi`.
9. **Slice 1 touched four features' code without their amendment blocks.** **Fixed:** listed.
10. **`seq` stops being the image-call number, and S-046's clause was not named.** **Fixed:** named, `seq` above 6 in a
    resumed run.
11. **D-081's `Confirmed-by` and S-037's one `observe` receipt were not named.** **Fixed:** both, read per run.
12. **An unreadable cap on the engine's path would bury the job.** **Fixed:** read inside the resume's `try`; check 38.
13. **Slips.** **Fixed:** I-18 and D-024 on the `Decisions:` line; `worker.ts:209-214`; the advancing functions pass the
    starting attempts; check 20's two re-pointed markers named; a shot "that has that piece" is by the plan.

## Gate review 4 — 2026-09-25, the round-3 reviewer, reading the revision

**Every round-3 fix held; 5 findings, all program design. Product, architecture and slices APPROVED; program design
NOT APPROVED.** None needed the owner.

1. **Check 2's narration case named a fixture that does not exist**, and `failures.ts`' entry left out
   `RefusedRequest`. **Fixed:** `minimax-t2a-refused-ok.json`, new, listed; the class listed.
2. **Check 20's `confirmed` marker could land on the resume's gate.** **Fixed:** it is the reel's own gate, the one
   comparing `confirmation(ceiling)`.
3. **Check 36's "no second run holds its requestId" was false for its first case.** **Fixed:** "no run resumes it".
4. **The harness's API would read the pinned cap, its worker a test's.** **Fixed:** the harness hands `startApi` its
   `budgetPath`; `resumeService` takes the plan and render settings.
5. **`answers()`, `_lib.mjs` and `waitingRuns`.** **Fixed:** `answers(input)` is pure and tested directly; `_lib.mjs`
   never names the script; check 43 proves `waitingRuns` writes nothing and `cancelRuns` only flags.

## Gate review 5 — 2026-09-25, a fresh reviewer

Read whole, against S-157, S-161 to S-164, every superseded source and the code at `bd9a32f`. **8 findings; product
APPROVED; architecture, program design and slices NOT APPROVED.** None needed the owner.

1. **The new fixture's name, `minimax-t2a-refused-ok.json`, fails paid-path check 21's three-part rule** — Slice 1 red.
   **Fixed:** `minimax-t2a-rejected.json`, case `rejected`.
2. **The estimate priced video and narration for a stills run**, which was admitted on its pictures alone. **Fixed:**
   those terms for a video run only; check 14.
3. **The service's API would read the pinned cap while its worker read `CUTROOM_BUDGET_PATH`'s.** **Fixed:** the
   service hands `startApi` `settings.budgetPath`; check 34.
4. **Check 39 stayed green if the service never switched the resume on.** **Fixed:** it resumes a stand-in failure
   through the service, the job's `run_at` asserted.
5. **Two kept survivors re-ranked with today's weights could re-choose the canonical** the kept derived pictures were
   made from. **Fixed:** ranked by their stored totals; a kept derived picture not referencing the chosen canonical is
   refused; check 8; least confident decision 3.
6. **Checks 21 and 32 could pass on the stand-in running out of answers.** **Fixed:** each pins its run's ending and
   the answers used.
7. **Amendment blocks missing** (Slices 1, 3, 4, 5; `second-ask`). **Fixed:** listed; `second-ask`'s journey in Slice 7.
8. **Naming pieces on a run with no plan was undefined.** **Fixed:** `invalid`; check 13.

## Gate review 6 — 2026-09-25, the round-5 reviewer, reading the revision

**Every round-5 fix held; 2 findings, program design. Product, architecture and slices APPROVED.** None needed the
owner.

1. **Check 39's exact `run_at` was not guaranteed**: `run.finished` is stamped with the finishing function's `now`, and
   `resume(tx)` was handed no time. **Fixed:** `resume(tx, now)` and `resumeRun`'s `now` are the finishing function's
   own, so `run_at` is exactly `run.finished`'s time plus the delay.
2. **Gate 3's file list left out `second-ask.md`.** **Fixed.**

## Gate review 7 — 2026-09-25, a fresh reviewer

Read whole, against S-157, S-161 to S-164, every superseded source and the code at `bd9a32f`. **8 findings; product
APPROVED; architecture, program design and slices NOT APPROVED.** None needed the owner.

1. **`reel-render`'s check 40 pins `AssembleJobContext`'s keys and would turn red in Slice 5.** **Fixed:** every context
   gains one `resume` key; check 40 amended by exactly that key.
2. **Check 34's preview could be of a run the service's own resume had taken by Slice 5.** **Fixed:** it previews a
   Gate 7 stop with a still named.
3. **Checks 36 and 37 proved some refusals only by absences.** **Fixed:** each case pins a resumable kind and its
   detail; the ceiling case has its positive control.
4. **What the record lists changed, unnamed.** **Fixed:** S-046's, S-093's and `reel-contract`'s record clauses
   superseded in S-147's form; `record.ts:5-6` listed as stale.
5. **The refusal's `estimateCents` was undefined against the contract's rule.** **Fixed:** it is the figure compared,
   spent plus estimate, in the preview and the refusal; checks 27, 29, 34.
6. **The stand-ins' `as` was placed in the service.** **Fixed:** in `packages/providers`, checked where the stand-in
   ports are built.
7. **Slice 4 touched `reel-takes`' code without its block.** **Fixed.**
8. **Slips.** **Fixed:** the stale comments at their real lines and slices; `fal/queue.ts:257-270`; `waitingRuns` on a
   missing database answers none; check 43.

## Gate review 8 — 2026-09-25, the round-7 reviewer, reading the revision

**Every round-7 fix held; 1 finding, program design. Product, architecture and slices APPROVED.** None needed the
owner.

1. **The stand-ins' `as` was still listed under `apps/service` in Gate 3, and `ports.ts`' closed set said "five" of six
   values.** **Fixed:** the service line no longer names it; "its six". And the one `resume` key is written as a plain
   property even when off, so `reel-render`'s check 40 reads it.

## Gate review 9 — 2026-09-25, a fresh reviewer

Read whole, against S-157, S-161 to S-164, every superseded source and the code at `bd9a32f`. **3 findings; all four
gates NOT APPROVED** — one needed the owner, answered before this revision.

1. **A caller's resume of a run that reached assembly could buy after the reel's first cut**, against D-058, I-18,
   S-066 and S-099, none superseded. **Fixed by the owner:** read per run — a resumed run buys only before its own first
   assembly, priced and admitted before any call; the four clauses and `reel-render`'s superseded by name (S-161).
2. **The list of sentences that go stale was incomplete.** **Fixed:** eight more, each in its slice.
3. **Three product statements were wrong**: run `bf8f4444…` is resumable by its caller; a reel that ended `cancelled`
   is not; and the 41¢ example remakes four pictures. **Fixed.**

## Gate review 10 — 2026-09-25, the round-9 reviewer, reading the revision

**No findings; would approve all four.** Every round-9 fix held: the per-run reading of D-058, I-18, S-066, S-099 and
`reel-render.md:1399` quoted character for character, in Gate 2 and in S-161; the eight stale sentences in their
slices; the three product statements corrected. The approving round goes to a fresh reviewer (S-160 rule 4).

## Gate review 11 — 2026-09-25, a fresh reviewer; the last round, at the owner's word

**5 findings; all four gates NOT APPROVED.** The owner, after ten rounds: fix what this round finds and stop — the
approving read opens `PROMPTS/054`, before any code. Every finding is fixed here; none needed the owner.

1. **Check 42's `answers()` in `_lib.mjs` would break the strict typecheck and hand check 20's file a way to start a
   process.** **Fixed:** `scripts/_answers.mjs` with its declaration, importing nothing, tested in
   `tests/resume-failed-script.test.ts`; check 20's second test gains an assertion that no imported local module reads
   `child_process`.
2. **A caller's resume refused at the per-reel cap wrote no question, against D-097 and D-100.** **Fixed without
   superseding them:** the service hands the API its questions path, and a resume call refused at the cap appends one;
   check 29.
3. **S-043's statement of the reserve was changed and not named.** **Fixed:** named; S-043 on the `Decisions:` line.
4. **D-047's, D-065's and D-030's call counts bind a resumed run**, which is no restarted attempt. **Fixed:** read per
   run with the pictures it keeps, named in S-147's form.
5. **Slips.** **Fixed:** least confident decision 2; five more stale sentences; the quotes' bold copied as their
   sources have it; the root `package.json` cited, not S-063; check 29's positive control buildable; the delay's
   setting named, `CUTROOM_RESUME_DELAY_MS`.
