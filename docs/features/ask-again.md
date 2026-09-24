---
status: current
authority: plan
---

# ask-again — the witness is shown the shape it is judged by; an answer that cannot be read is asked once more, told why; and every one is kept

Status: planned
Decisions: D-005, D-022, D-035, D-041, D-045, D-061, D-064, D-084, D-086, I-8, I-15, S-028, S-037, S-038, S-040, S-042, S-046, S-070, S-072, S-096, S-099, S-109, S-111, S-116, S-129, S-130, S-131, S-135, S-136, S-137, S-139, S-140, S-142, S-143, S-144, S-146, S-147, S-156
Named only in the deferral list: D-023, S-115
Gates: product APPROVED 2026-09-24 adversarial-reviewer · architecture APPROVED 2026-09-24 adversarial-reviewer · program-design APPROVED 2026-09-24 adversarial-reviewer · slices APPROVED 2026-09-24 adversarial-reviewer

> **Created 2026-09-24 by S-156**, out of session 48's four black-holes runs (`docs/reel-pitfalls.md`, P-001 and
> P-004) and `PROMPTS/049`. **The owner answered seven questions before the gates were approved** (S-156): the
> witness's second ask is **told what was wrong**; the **planner, the plan scorer and the reconcilers** are asked once
> more too, **but only when the model wrote an answer** that could not be read; every refused answer is kept **in a
> table row**; the witness's shape is kept **in one copy, in `packages/contracts`**; it was **measured before
> anything was built**; and the slug is `ask-again`.
>
> **What the runs showed, read from their rows.** P-004's two runs (`c9f3df47…`, `c52d418a…`) each left two `observe`
> receipts on shot 1's picture (ids 253–254, 266–267): `second-ask` (S-147) asked again both times and both second
> answers were refused as well. **The first review of these gates found why**: the witness is SHOWN the adapter's own
> copy of the shape (`packages/providers/src/minimax/model.ts`, `observedEntity`), where `count` is any integer, a
> `label` may be empty and no object is strict — while the gate parses under `count > 0`, `label` of one character or
> more, and strict objects. **A count of 0 was an answer the witness had been told was fine.** That is S-139's lesson
> — _"the answerer never sees the constraint it is judged by"_ — on a field S-139 did not reach.
>
> **What the measurement showed** (Gate 1, 0¢, `.tmp/ask-again-measure.mjs`, never committed): on reel 4's picture
> the witness shown today's shape was refused **3 of 4** times — counts of −1, "many" and −1 for the background stars
> — and shown the gate's shape **0 of 4**, counting the stars as 1 each time; on reel 3's picture 0 of 4 either way.
>
> **What this feature is not.** It widens no shape and repairs no answer: an answer outside the shape is still refused,
> and nothing is translated into a value inside it. It asks no model a third time. It does not ask the narration again
> (P-001) — the owner kept that to one call — but it keeps the timings it could not read.

## Gate 1 — Product (no technical language)

**The problem.** A reel is made by asking models for things in a fixed shape: a plan, a score for each plan, a
description of each picture and clip, a judgement of whether the description matches what was asked for, and the
timing of each spoken word. **When one answer comes back in the wrong shape, the whole reel stops** — and in session
48 that is how three of four runs ended, each with money already spent: 15¢, 10¢ and 15¢. Two of those were two pictures
of the same shot — a black hole ringed by glowing gas — each described twice and refused all four times — a count that was not a number once,
and a count of zero once. **And the describing model had been shown a looser rule than the one it was judged by**: it
was told a count could be any whole number, and zero is one. Nobody could read what it wrote, because a refused
answer was thrown away.

**The visible outcome.** Nothing a caller asks for changes. What is different:

- **the describing model is shown exactly the rule it is judged by**, from the first time it is asked — a count is a
  number above zero, a name is not empty, and nothing is added that was not asked for;
- **asked again, it is told why its first description was refused** — which part of it, and what that part must be —
  and nothing else: never what the picture was meant to show, and never anything from the request;
- **a plan, a plan's score, or a match judgement the model wrote in the wrong shape is asked for once more, and told
  why**, where today it ends the reel on the spot; an answer cut short, or a reply that is not an answer at all, still
  ends it as today;
- **two answers in a row that cannot be read still end the reel**, with the reasons the second was refused — there is
  never a third ask;
- **every answer the model wrote that could not be read is kept, with why**, so a person can read it afterwards: a
  description, a plan, a score, a match judgement, or a word timing the reel stopped on. (Three other kinds — the
  comparison of two pictures, the judgement of the finished cut, and the reading of text in a picture — are kept when
  the reply cannot be read at all, and not yet when it is read and refused; see Deferred.)
- **nothing else is asked again**: the narration, a service that is down, a request that was wrong, and the final
  judgement of the finished cut behave exactly as they do today.

**The measurement** (0¢, before anything was built; the real describing model, P-004's two pictures, four asks
each, the way it is asked today against the way it will be asked):

| shown                                     | reel 4's picture | reel 3's picture | refused in all |
| ----------------------------------------- | ---------------- | ---------------- | -------------- |
| today's rule: a count is any whole number | 3 of 4 refused   | 0 of 4 refused   | **3 of 8**     |
| the gate's rule: a count is above zero    | 0 of 4 refused   | 0 of 4 refused   | **0 of 8**     |

**And for the first time, what it wrote.** Every refusal was the same entity — the background stars — answered with a
count of **−1** twice and **"many"** once: the model's way of saying "too many to count", which the rule it was shown
allowed (−1 is a whole number). **Shown the gate's rule, it wrote 1 for the stars of reel 4's picture, all four
times** — a count that is accepted and is not true — and 1, 100 or 150 on reel 3's. The rule has no way to say "too
many to count", so showing it turns that answer into a count of one. A count only fails a picture when the thing
counted is one of its shot's subjects (the match S-040 describes), and background stars are no subject in this brief;
a subject that is uncountable would be judged on a false count. Eight asks an arm cannot prove a rate, but they show
the mechanism, on the pictures that stopped two reels.

**What does not change.** No picture, clip or plan that would be refused today is accepted: every rule is exactly
what it was — the model is only SHOWN it now. **No reel costs more money**: asking these models is covered by the plan
they run on, and the reel's estimate and its ceiling count exactly what they count today. **It can take longer**: a
second ask is one more wait for a model, usually under a minute; if that model does not answer at all, the wait can
reach about half an hour before the reel stops, as a first ask's can today.

## Gate 2 — Architecture

### One shape, in one place

**The witness's two schemas move to `packages/contracts/src/observation.ts`** — `witnessObservation` and
`clipObservation`, exactly as `packages/pipeline/src/stills/observation.ts` and `clips/observation.ts` declare them
today, and those two files become re-exports so every import keeps its path. **The MiniMax adapter asks with the SAME
objects** — `observedEntity`, `observationShape` and `clipObservationShape` are deleted from
`packages/providers/src/minimax/model.ts` — and still never parses with them (D-041, S-042): the gate parses. So the
first ask renders `count` as `exclusiveMinimum: 0`, `label` with `minLength: 1`, and `additionalProperties: false` on
every object (S-131 keeps that one boolean); S-144's closed-set sentences are computed from the same enums and do not
move. `packages/contracts` already depends on `zod` and already holds runtime code (`failures.ts`); its rule,
`contracts-are-a-leaf`, forbids internal imports only. **Checks 1 and 2 are what catch a second copy**: the adapter's
rendering equals the gate schema's, and a scan finds the entity's fields declared once. **Holding the gate's own
objects, the adapter could now parse with them, and must not**: an adapter that refused an observation itself would
make D-041's and S-042's refusal path unreachable. Check 1 holds it with recorded wire: an answer the gate refuses — a
count of −1 — comes back from `observe` as its value, not thrown.

`compare` and `judgeCut` are not in this move: their gate schemas are built per call from the subjects and questions
(`compareAnswer(pair.shared)`, `cutAnswer(questions)`), so the adapter cannot hold them; S-138 and S-139 already say
their strings in the question. Deferred item 2.

### Two kinds of refusal, told apart by WHERE the answer is refused — the load-bearing sentence

1. **The gate refused a value it could read.** The witness's observation (Gates 1 and 4) and a narration's word
   timings reach the pipeline as `unknown` and are parsed there (D-041, S-042, S-070). Only the pipeline knows they
   were refused, so **the pipeline reports them**, through the `refusals` port its stage is handed.
2. **The adapter could not read the answer.** A `structured` call is parsed inside the adapter under the caller's
   schema; a refusal there, or an answer that is not JSON, is the schema, or is cut off, is `Spent` (S-142). **The
   adapter carries the answer text on the `Spent`**, and the worker's recording port — which already writes that
   call's `lost_call` row — writes it down. The pipeline sees the `Spent` too (`askStructured` catches it), but never
   writes it.

Both land in **one table, `refused_answer`**, through one domain function. The pipeline still does no I/O and the
worker still constructs no adapter.

| package              | what it gains                                                                                                                                                                                                                                                                                                                              | what it still may not do                                                           |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| `packages/contracts` | `observation.ts` (the two schemas); `brands.ts` (the types `Refusals` and `WitnessRefusals`, importing nothing); `refusals.ts` (their only builders); `refused.ts` (`RefusedAnswer`, `RefusalRecorder`); `LostCall.answer?`, `LostCall.refused?: Refusals`; `refused?: Refusals` on `structured`, `refused?: WitnessRefusals` on `observe` | import anything internal; import in a cycle (`no-circular` counts type imports)    |
| `packages/pipeline`  | `askStructured` (`gates/structured.ts`), which every `structured` call site uses; `askWitness` builds the second ask with `refused` and reports each refusal; the clips stage reports refused timings; `StillsPorts` and `ClipsPorts` gain `refusals: RefusalRecorder`; the two observation files become re-exports                        | reach for a port, do I/O, import an npm package but `zod`                          |
| `packages/providers` | the adapter asks with the contracts' schemas; renders `refused`; puts the answer text, and for a refusal of the ANSWER its `Refusals`, on a `Spent` it raises while reading one; the stand-in throws `Spent` when its scripted `structured` value is refused                                                                               | keep durable state; send a call twice (S-096 stands: the PIPELINE asks the second) |
| `packages/domain`    | the `refused_answer` table, its migration, `recordRefusedAnswer` (which redacts, then caps)                                                                                                                                                                                                                                                | import the pipeline or providers                                                   |
| `apps/worker`        | `recordingPort` writes a `refused_answer` row for every `Spent` that carries an answer; `refusalRecorder(db, runId)`, handed to the stills and clips stages as `refusals`, writes one for every refusal the pipeline reports                                                                                                               | import `packages/providers` (`worker-no-providers`)                                |

`scripts/refused.mjs <run-id or prefix> [--db <path>]` is the reader: it opens the database with `node:sqlite`'s own
`DatabaseSync(path, { readOnly: true })` — the library `real-reel.mjs` reads with, never `openDatabase`, which opens
for writing, migrates and creates a missing file — so the database file's bytes do not change and a wrong path creates
nothing. (SQLite itself may leave its `-shm` and `-wal` side files beside a WAL database it opened; they are its own,
and gitignored with it.) The
path is `--db`, else `CUTROOM_DB_PATH`, else `apps/service`'s `DEFAULT_DB_PATH` (D-086). It reads no environment
file and spends nothing.
`scripts/real-reel.mjs` is unchanged in what it loads (the environment file, handed on whole, S-109) and gains one
printed figure: how many answers were refused.

### Which refusals are asked again

| what could not be read                                                     | asked again? | told                            | kept                                     |
| -------------------------------------------------------------------------- | ------------ | ------------------------------- | ---------------------------------------- |
| a witness observation the gate refuses (Gates 1, 4)                        | yes, once    | the issues, `<path>: <message>` | the value, as JSON — ask 1 and ask 2     |
| a `structured` answer the caller's schema refuses (plan, score, reconcile) | yes, once    | the issues, `<path>: <message>` | the answer text                          |
| a `structured` answer that is not JSON, or is the schema itself            | yes, once    | one fixed sentence naming which | the answer text                          |
| a `structured` answer cut off by the token budget (S-140)                  | no           | —                               | the answer text                          |
| a `structured` reply with reasoning and nothing after it (S-135, D-019)    | no           | —                               | nothing: there is no answer text         |
| a body that is not JSON, or not this wire                                  | no           | —                               | nothing: that is the wire, not an answer |
| a narration's word timings the stage refuses (P-001)                       | no           | —                               | the timings, as JSON                     |
| a witness `Spent`; `compare`, `judgeCut`, `readText` `Spent`               | no           | —                               | the answer text, when there is one       |

**The rule under the table, in the adapter's terms**: `LostCall.answer` is set whenever the adapter holds the model's
answer text — after the reasoning block, a whole-answer fence unwrapped (S-132) — and `LostCall.refused` is set only
when the ANSWER is at fault and asking again could change it: the caller's schema refused it, it is not JSON (and was
not cut off), or it is the schema. **`askStructured` asks again exactly when `refused` is present.** A budget or a wire
failure stays one send (S-135, S-140 stand).

### `askStructured`, whole

```text
askStructured<T>(model, call)                          call = { prompt, schema, role, temperature: 0, pictureIds?, takeIds? }
  try   return await model.structured(call)           the first ask: exactly the call the site built, no `refused` key
  catch first:
    not a Spent, or a Spent with no `refused`  →  rethrow the same object — a fault, an Unavailable the worker's counter
                                                  already sent maxAttempts times, a budget or a wire failure
    a Spent with `refused`                     →  return await model.structured({ ...call, refused: first.receipt.refused })
                                                  a NEW object: the same prompt, schema, role, temperature and ids, and
                                                  the reasons. A throw from it propagates unchanged; no third ask.
```

### `askWitness`, as it changes

As S-147 built it, with three differences: **the second ask is a new object** — `{ picture | clip, temperature: 0,
refused }`, `refused` built by `witnessRefusalsOf(first.value, schema)`; **each refused answer is handed to the
`refusals` port** before anything else happens — `{ port: 'model', role: 'witness', call: 'observe', about: [id], ask,
reasons, answer: JSON.stringify(value) ?? String(value) }`; and it takes that port as a parameter, so Gates 1 and 4
do. A second refusal throws today's words with the second answer's issues — built as
`witnessRefusalsOf(second.value, schema).join('; ')`, so the `<path>: <message>` format has one copy, in
`refusals.ts`, and `witness.ts`' own `issuesOf` is deleted. A throw on either ask propagates unchanged
and is never asked again, a witness `Spent` included (the owner's choice; `second-ask`'s check 4 as it stands).

### What the second ask says, and why it is not a door for the brief (I-8)

**Two brands, because two callers.** `observe`'s `refused` is **`WitnessRefusals`** and `structured`'s is
**`Refusals`**, each a branded `readonly string[]` declared in `packages/contracts/src/brands.ts`, which imports
nothing. Only `packages/contracts/src/refusals.ts` builds them:

- **`witnessRefusalsOf(value, schema)`** parses `value` itself, under `schema`, which must be `witnessObservation` or
  `clipObservation` BY IDENTITY — any other schema throws — and returns that parse's issues as `<path or (answer)>:
<message>` lines (today's `issuesOf` format), or `null` when it parses. So every line in a `WitnessRefusals` is an
  issue of the witness's own two schemas over the witness's own answer.
- **`refusalsOf(error: z.ZodError)`** and **`answerRefusal('not-json' | 'schema')`** build `Refusals`, for
  `structured` only: its prompt already carries the whole brief, so a refusal quoting the brief — as the planning,
  reconcile and timings schemas' messages do (`plan/prompts.ts`, `stills/prompts.ts`, `clips/narration.ts`) — adds
  nothing the call did not already hold.

**A `Refusals` is not a `WitnessRefusals`**, so `observe({ clip, temperature: 0, refused: refusalsOf(timingsError) })`
does not compile, and neither does `refused: [criterion.text]`. What the witness's schemas can put in an issue: zod's
messages, which name a field and what it must be and never the value refused (zod 4.6.5: `invalid_type`,
`invalid_value`, `too_small`, `invalid_format`, read by the first review) — except `unrecognized_keys`, which quotes a
key the WITNESS wrote, its own words. The two schemas are constants with no refinement, so no brief text can reach
an issue. **What the type cannot stop, a scan does** — this repository's lint is not type-checked, so an `any` could
be assigned to a brand: check 6 finds no cast to either brand outside `refusals.ts`, and, reading the pipeline's
syntax tree, finds an object property named `refused` — written out or shorthand — only in `gates/witness.ts`, bound
to `witnessRefusalsOf`'s result, and in `gates/structured.ts`, bound to a caught `Spent`'s `receipt.refused`. **Check
19 holds it end-to-end**, with markers in every sentence, criterion text and id, subject name and id, claim id and
the style.

The MiniMax adapter renders `refused`, when present, as **one fixed sentence and the reasons, one per line**:

```text
Your previous answer to this was refused, for these reasons:
- <reason>
- <reason>
Answer again, with every field exactly as the shape below says.
```

— for `observe`, appended to the question's own text part after S-144's closed sets, so the parts are still the
question, the media, and the shape (two text parts); for `structured`, after the prompt and before the shape (S-130's
order). **Without `refused`, a `structured` body is byte-for-byte today's, and an `observe` body differs from today's
only in its rendered shape**: check 1 pins both from Slice 1 on, against a digest of the structured body and the
observe question part's exact text, both computed at `046ad37` — before any file of this feature — and written into
the test.

### What is kept, and where (D-022, D-084, D-086)

- **`refused_answer`**: `id` (autoincrement), `run_id`, `at`, `port` (`model` or `speech`), `role` and `call` (the
  model's; null for a timing), `about` (JSON: the picture, take or narration ids, as the receipt names them), `ask` (1
  or 2), `reasons` (JSON array), `answer` (text).
- **Redacted, then capped, in `recordRefusedAnswer`** — the recording boundary D-022 asks for, the one function both
  writers call: every URL's whole query string is dropped, `\/`-escaped URLs too; `sk-…`, `sd_live_…` and JWT-shaped
  strings are masked; the value of any JSON key with a credential-shaped name (key, token, secret, signature, sig,
  credential, password, auth) is masked whatever it looks like; and only then is an answer longer than 32 000
  characters cut, with a marker naming its full length. A model's answer holds no key of ours — none is ever in a
  prompt — so this is D-022's rule for what a provider hands back. **`LostCall`'s doc comment** (_"never holds a key, a
  presigned URL or a query string"_) is amended: its `detail` still never does; its `answer` is the model's text and is
  redacted where it is written. `paid-path`'s env checks already scan every table's every row for the key, so the new
  table is covered by a verified check as well as by check 5.
- **What reads it**: `scripts/refused.mjs`, which prints each row of one run — when, role and call, about, ask,
  reasons and the answer; and `real-reel.mjs`, which prints **only the count** (S-111). No engine code reads the table.

### The receipts (D-005, D-084), per case

Port layering is `recordingPort(retryingModelPort(adapter))` (`apps/worker/src/worker.ts`), so a `Spent` passes the
counter untouched and reaches `recordingSpend`:

| case                                            | `model_receipt` | `lost_call` | `refused_answer`           | the run                       |
| ----------------------------------------------- | --------------- | ----------- | -------------------------- | ----------------------------- |
| structured: parses first time                   | 1               | 0           | 0                          | as today                      |
| structured: refused, then parses                | 1 (the second)  | 1           | 1 (ask 1)                  | goes on                       |
| structured: refused, then refused               | 0               | 2           | 2 (ask 1, ask 2)           | fails, the second's words     |
| structured: refused, then a budget/wire `Spent` | 0               | 2           | 1 or 2 (2 if it held text) | fails, the second's words     |
| structured: budget or wire `Spent` first        | 0               | 1           | 0 or 1 (1 if it held text) | fails, as today               |
| witness: refused, then parses                   | 2               | 0           | 1 (ask 1)                  | goes on; observation = second |
| witness: refused twice                          | 2               | 0           | 2 (ask 1, ask 2)           | fails, today's words          |
| witness: refused, then a `Spent`                | 1               | 1           | 1 or 2 (2 if it held text) | fails, the `Spent`'s words    |
| narration timings refused                       | —               | 0           | 1 (ask 1, `speech`)        | fails, today's words          |

### Cost, the estimate and the ceiling

A model call and a narration cost 0¢ under the Token Plan (S-129), so a second ask costs 0¢ and its `lost_call` row,
if any, carries 0¢ (`MODEL_LOST_CENTS`). **`estimate()` has no model term and gains none**: S-129 says that is right
only while the plan covers these calls — S-129's condition, not this feature's. The ceiling guard reads the chain's
spend — the sum of its job rows' `cost_cents`, to which every receipt and `lost_call` adds its figure — before each
image, clip and narration send, so a second ask's rows count exactly as a first ask's do.

### Time, and the lease

A second ask is one more call, only after a refusal. Its worst case is `second-ask`'s Deferred item 5: a timed-out
call sent `maxAttempts` (3) times, about thirty minutes — and a reconcile whose two asks both time out, about an hour.
**In a plan job** that is before anything is bought. **In a clips job** a Gate 5 reconcile's second ask spends the same
lease slack a Gate 4 second ask does (`LEASE_SLACK_MS`, one hour), and an expired lease re-buys the take in flight.
A first ask carries the same exposure today. Not measured, not expected; Deferred item 3.

### Decisions superseded in part (S-156), each in S-147's form

- **S-042** as S-147 left it: _"one that does not parse is asked once more, and a second that does not parse finishes
  the run `failed`"_ now covers `structured` answers refused for their shape, and the second ask is told why.
- **S-142**'s _"The call is PAID FOR, so it is never sent again"_ (`LostCall`'s class comment): for a model
  `structured` call whose ANSWER was refused, the pipeline makes one new call carrying the reasons. `retryingModelPort`
  still never sends a `Spent` again, and every other port's `Spent`, and a budget or wire `Spent`, is one send.
- **S-147**: _"nothing is added to the second ask — no hint, no quoted first answer"_ becomes _"the second ask carries
  the first answer's issues, as `WitnessRefusals`, and nothing else"_; and its rejection of _"asking again on a thrown
  call — `Spent`"_ is superseded for a `structured` `Spent` that carries `refused`, and stands for every other.
- **S-037** — `observe` takes _"a picture and temperature 0, and nothing else"_ — and **S-072** — Gate 4 _"given the
  clip and nothing else"_ — become _"…and, on a second ask only, `WitnessRefusals`"_. Their reason, a call with no
  text field cannot carry the brief, is kept by that brand: a `WitnessRefusals` is built only by `witnessRefusalsOf`,
  from the witness's own two schemas over the answer the witness just gave, and check 6 holds every part of that.
- **D-035's and D-061's** _"one structured model call"_ per manifest and grouping, **D-064's** _"one informed repair
  call"_, **S-040's** reconcile as _"one structured call per picture"_ (`reel-stills`' check 27) and **S-072's** Gate
  5 as _"One `structured` call"_ (`reel-render`'s check 24) each become _"one, or two when the first answer's shape
  was refused"_. The manifest still comes whole from one call — the one that parses — so D-035's reason, a manifest
  never split across calls, stands. `reel-plan`'s check 21, _"exactly two planning calls"_, is on answers that parse
  and stands as written.
- **S-130**'s rejection of _"retrying a failed parse with the names supplied"_ — _"A second call for every first
  one"_ — and **S-136**'s of _"retrying on an echo"_ — _"it would have hidden this"_: this is a second call only after
  a refusal, and the refused answer is kept and counted (`lost_call`, `refused_answer`), so neither reason holds of it.
  **S-135 and S-140 stand**: a budget failure is not asked again.
- **S-116**'s _"without one the engine still behaves exactly as it always has"_ holds for an absent script; a scripted
  `structured` answer that its schema refuses now throws `Spent`, as the real adapter does (S-142), where it threw the
  schema's own error.
- **The adapter's comment** _"The schemas below are used for ONE thing: to ask for the answer's shape"_ stays true —
  it now asks with the contracts' schemas rather than its own copies.

## Gate 3 — Program design

**File locations.**

```text
packages/contracts/src/observation.ts       witnessObservation, clipObservation — moved from the pipeline, unchanged
packages/contracts/src/brands.ts            the types Refusals and WitnessRefusals — imports nothing, so no cycle
packages/contracts/src/refusals.ts          witnessRefusalsOf, refusalsOf, answerRefusal — the brands' only builders;
                                            imports brands.ts, observation.ts and zod
packages/contracts/src/refused.ts           RefusedAnswer, RefusalRecorder — imports model.ts' ModelRole and ModelCall
packages/contracts/src/model.ts             refused?: Refusals on structured, refused?: WitnessRefusals on observe
packages/contracts/src/failures.ts          LostCall.answer?, LostCall.refused?: Refusals; the class and interface comments
                                            (the import graph, type imports included: brands ← failures ← clip ← model;
                                            observation → picture, clip; refusals → brands, observation; refused → model)
packages/pipeline/src/stills/observation.ts, clips/observation.ts   re-exports of the contracts' schemas
packages/pipeline/src/gates/structured.ts   askStructured — new; not exported from the package's index
packages/pipeline/src/gates/witness.ts      askWitness(call, observe, schema, id, noun, refusals)
packages/pipeline/src/gates/gate1.ts, gate4.ts, gate5.ts, plan/index.ts   every structured call through askStructured;
                                            gate1 and gate4 hand askWitness the refusals port
packages/pipeline/src/stills/index.ts, clips/index.ts   StillsPorts and ClipsPorts gain refusals: RefusalRecorder; the
                                            clips stage reports refused timings before it returns `failed`
packages/providers/src/minimax/model.ts     the contracts' schemas; REFUSED_SAID; `read` sets answer and refused
packages/providers/src/fake/model.ts        a refused scripted `structured` value throws Spent, with answer and refused
packages/domain/src/refused.ts              recordRefusedAnswer: redaction, then the cap
packages/domain/src/schema.ts               refusedAnswer;  db/migrations/0006_refused_answer.sql (drizzle-kit)
apps/worker/src/recording-port.ts           a Spent carrying an answer → one refused_answer row, ask from `call.refused`
apps/worker/src/refusal-recorder.ts         refusalRecorder(db, runId) → recordRefusedAnswer; keyframes-job.ts and
                                            clips-job.ts hand it to their stage as refusals
tests/engine/plans.ts, stills.ts, video.ts  refusedThen(first, second): a planner, reconciler or witness answer refused,
                                            then the one that parses, keyed to one call, picture or take
tests/fixtures/wire/minimax-chat-uncountable.json   an observe answer counting stars −1, from the measurement's kept
                                            answer — named, with its note and no query string (paid-path's check 21)
scripts/refused.mjs                         the reader
scripts/real-reel.mjs                       the count of refused answers, beside the receipts
tests/ask-again-*.test.ts                   the checks below; check 23 in tests/paid-path-real-reel.test.ts (why: below)
```

**The checks.** Each is one test, named by its number.

_One shape — `tests/ask-again-shape.test.ts`_

1. `the MiniMax adapter asks with the gate's own schemas: an observe body's response_format schema and its shape part are exactly z.toJSONSchema(witnessObservation) — clipObservation for a clip — sanitised as S-131 says, so count is exclusiveMinimum 0, label minLength 1 and every object additionalProperties false; the observe question part is byte for byte, and a structured body hashes to, what they were at 046ad37, written into the test; and an answer the gate refuses — a count of −1, on recorded wire — comes back from observe as its value, never thrown` — S-156, S-139, S-130, D-041, S-042.
2. `the observation's fields are declared once: a scan of packages/*/src finds the declaration faceVisible: z.enum( in packages/contracts/src/observation.ts and nowhere else, and the pipeline's witnessObservation and clipObservation are the contracts' objects by identity` — S-156, S-147.

_The record — `tests/ask-again-record.test.ts`_

3. `the MiniMax adapter, on recorded wire, puts on a Spent it raises while reading an answer: answer, exactly the text after the reasoning block with a whole-answer fence unwrapped — holding no <think>, no fence and none of the HTTP body — for a schema refusal, not JSON, the schema echoed and a cut-off answer; refused for the first three only, the schema refusal's as <path>: <message> lines; and neither on a body that is not JSON, not this wire, or reasoning with no answer — read off receipt.answer and receipt.refused directly` — S-156, S-142, S-140.
4. `recordingPort writes one refused_answer row for each Spent carrying an answer, on each of the five calls — ask 2 when the call carried refused, ask 1 otherwise, reasons its refused or else its detail — and none for a Spent without one; the lost_call row is written exactly as before` — S-156, S-142.
5. `recordRefusedAnswer drops a URL's whole query string, \/-escaped ones too; masks sk-, sd_live_ and JWT-shaped strings and the value of a credential-named JSON key; redacts before it cuts, so a key straddling 32 000 characters is masked; cuts a longer answer there with a marker naming its full length; and keeps a short clean answer byte for byte` — D-022.
6. `only the witness's own schemas can fill observe's refused: a compile check finds observe({ picture, temperature: 0, refused: [criterion.text] }), observe({ clip, temperature: 0, refused: refusalsOf(anyZodError) }) and structured({ …, refused: ['x'] }) are type errors while witnessRefusalsOf's result compiles for observe and refusalsOf's and answerRefusal's for structured; witnessRefusalsOf throws for any schema but the two, by identity; and, reading syntax trees, no cast to either brand exists outside packages/contracts/src/refusals.ts; with the type checker, an object property named refused — written out or shorthand — that lands in either brand, or in nothing typed, exists only in gates/witness.ts, bound to witnessRefusalsOf's result, in gates/structured.ts, bound to a caught Spent's receipt.refused, and in the MiniMax adapter and the stand-in, bound to refusalsOf's or answerRefusal's result — the worker writes none; and witnessRefusalsOf is called only in gates/witness.ts, and only on the value of the observe answer just received` — I-8, S-037, S-072, S-156.

_The structured calls — `tests/ask-again-structured.test.ts`_

7. `a structured answer that parses is asked for once, with exactly the call the site built — no refused key` — S-042.
8. `a structured ask that throws a Spent carrying refused is asked once more with a NEW object equal to the first plus those refused — snapshotted at each call — and the second answer is returned` — S-156.
9. `two such Spents throw the SECOND Spent object unchanged after exactly two calls; no third` — S-156.
10. `a Spent with no refused (budget, wire), a plain fault and an Unavailable on the first ask are called once and come out unchanged; the same on the second ask after a refusal, twice` — S-135, S-140, S-137, S-142.
11. `no structured call is made in packages/pipeline/src except through askStructured: a scan finds .structured, ['structured'] and a destructured structured only in gates/structured.ts, and the five sites that called it — planReel's plan, score and repair, Gate 1's reconcile, Gate 5 — import askStructured` — S-156.
12. `the stand-in: a scripted structured value its schema refuses throws Spent — port model, 0¢, answer the value as JSON, refused its issues — and a { throws } entry still throws a plain Error` — S-156, S-116.
13. `through the worker, a plan run whose planner's first answer is refused and second parses completes; the second planner call carries refused equal to the first's issues; one lost_call row at 0¢ and one refused_answer row — planner, structured, ask 1, those issues, the scripted answer; a scorer refused once the same, role reconciler; and a refused planner answer holding a URL with a query string and an sk- string is kept masked` — S-156, D-084, D-022.
14. `through the worker, a plan run whose planner is refused twice fails with the second Spent's words; two lost_call rows, two refused_answer rows (ask 1, ask 2), and no third planner call` — S-156.
15. `through the worker, a Gate 1 reconcile refused once and a Gate 5 reconcile refused once each decide their picture or take; one refused_answer row about that id, and one reconciler receipt for it — the second` — S-156, S-040, S-072.

_The witness, told — `tests/ask-again-witness.test.ts`_

16. `a refused witness answer is asked once more with a NEW object — the first ask's snapshot exactly { picture | clip, temperature: 0 }, the second's that and refused, the first's issues — and the refusals port is handed one refusal: witness, observe, about the id, ask 1, those reasons, the answer as JSON` — S-156, S-147.
17. `two refused witness answers throw today's words with the second's issues after two calls, and the refusals port is handed two refusals, ask 1 and ask 2, each its own reasons and answer; a Spent on the second ask propagates unchanged and is not recorded by the gate` — S-156, S-042.
18. `the MiniMax adapter renders refused: an observe call's question part holds REFUSED_SAID and each reason after the closed sets, still two text parts, the media between them; a structured call's content is the prompt, then REFUSED_SAID and the reasons, then the shape; and a body with refused differs from the same call's body without it only by that text` — S-156, S-130, S-144.
19. `I-8: with markers in every narration sentence, criterion text and id, subject name and id, claim id and the style, and the witness refused once on a still and once on a take, no observe call — first or second — holds a marker, and every observe call's keys are picture or clip, temperature and, on a second ask only, refused` — I-8, S-037, S-072.
20. `through the worker, a still refused twice fails with today's words and two refused_answer rows about its picture, ask 1 and ask 2, each with the answer it gave; and a take refused once and then parsing leaves one row about the take` — S-156, S-147.
21. `through the worker, a narration whose timings do not parse fails with today's words, spoken once, and one refused_answer row — speech, about its narration id, ask 1, the timings as JSON` — S-156, S-070.

_The reader, and the journey_

22. `scripts/refused.mjs, against a temporary database holding two runs and named by --db, prints each refused answer of the named run — role, call, about, ask, reasons, answer — and nothing of the other; leaves the database file's bytes unchanged; given a --db path that does not exist, exits non-zero and creates nothing; and names no environment file` — D-022, D-086.
23. `real-reel.mjs prints the count of refused answers, and never reads the answer column` — S-111. **In `tests/paid-path-real-reel.test.ts`**, because `paid-path`'s check 20 fails when any other test file names that script — the precedent is `three-pictures`' check 12 in the same file.
24. `every other test of this feature passes in a child process whose environment holds only PATH and what the operating system needs to start Node, in S-028's form` — S-028, S-111.

**Amended checks in verified features**, each in the slice whose code would otherwise leave it red or wrongly green,
each asserting the refusal it names and not just a failed run (`second-ask`'s rule):

- **`second-ask`, checks 1 to 5** (`tests/second-ask-gate.test.ts`, Slice 4): `gate4` and `askWitness` are handed a
  `refusals` port. Check 2's _"the SAME argument object … holding only the picture or clip ref and temperature 0"_ becomes:
  the first ask's snapshot is exactly that, the second's is that and `refused` equal to the first answer's issues, and
  they are two objects. Check 5's snapshot of the two schemas does not change: the schemas move, they do not change.
- **`reel-plan`, check 7** (`tests/reel-plan-shapes.test.ts`, Slice 3): its script `[withUnits([0,1,1,2,3]),
evenAnswer(6)]` has grouping a's second ask read `evenAnswer(6)` — the answer meant for grouping b — which the
  4-unit schema also refuses, so the rejection is still a refusal. It gains the assertions that make that visible: the
  rejection is a `Spent` whose message names the 4-unit schema's refusal of `evenAnswer(6)`, and exactly two `planner`
  calls were made, the second carrying `refused` that names the check's own refusal — _"unit 1 has 2 shots"_
  (`plan/prompts.ts`) — so the check still proves what its title says.
- **`reel-takes`' hand-written `ClipsPorts`** (`tests/reel-takes-transient.test.ts`, Slice 4) gains a `refusals`
  port, so it still typechecks; it is never called on that test's scripts.
- **`paid-path`, check 20's file** gains check 23 (Slice 5).

No other verified test scripts a `structured` answer its schema refuses, asserts the stand-in's schema error text, or
counts `lost_call` rows on a stand-in run (read statically, file by file, on 2026-09-24). The counts that name one
call per site — `reel-plan`'s check 21, `reel-stills`' check 27, `reel-render`'s check 24 — run on answers that parse
and stay exact. The witness key-set checks (`reel-stills-gate1:302`, `reel-render-gates:284`, `reel-takes-retry:245`)
run on scripts with no refusal and stay exact.

**Sentences that go stale, amended in the slice that makes them stale**: `failures.ts` — `LostCall`'s _"never holds a
key, a presigned URL or a query string"_ and `Spent`'s _"never sent again … fails the run exactly as it did"_ (Slice
2, Slice 3); `apps/worker/src/spend.ts`' _"A caller that swallowed a `Spent`…"_ (Slice 3: `askStructured` catches one
and asks again, and never swallows it); `packages/domain/src/ledger.ts`' `recordLostCall` comment (Slice 2);
`apps/worker/src/model-port.ts`' _"A `Spent` is passed straight through and NEVER sent again"_ (Slice 3: still true of
the counter, and says who does ask again); `packages/contracts/src/model.ts`' `observe` and `structured` comments —
_"nothing else"_, _"no field a brief could be written into"_ (Slice 4); `gate1.ts`, `gate4.ts`, `witness.ts`' header
(Slice 4); `recording-port.ts`' header (Slice 2); the adapter's comment over the deleted shapes and `observation.ts`'
headers (Slice 1). Each feature whose code or tests a slice touches gains an amendment block above its gates, in
S-143's form, in that slice.

**The four least confident decisions.** Whether telling the witness why moves the rate beyond what showing it the
shape does — the measurement says how often the aligned shape alone parses on P-004's pictures, and nothing yet about
the told ask. Whether 32 000 characters is enough to read a whole answer (an observation is about 4 000). Whether a
schema echo, asked again, echoes again. Whether the witness's `Spent` should be asked again too — the owner said not
yet. **And the cost of a rule with no way to say "too many to count"**: shown it, the witness counted reel 4's stars
as 1, a count that parses and is false; it matters only when the uncountable thing is a shot's subject.

## Gate 4 — Slices

- [x] **Slice 1 — one shape.** `packages/contracts/src/observation.ts`; the pipeline's two files re-export it; the
      adapter asks with it and its copies are deleted. Amendment blocks: `paid-path` (the adapter's asked shape),
      `reel-stills` and `reel-render` (where their schemas now live). **Proves: 1, 2.**
- [x] **Slice 2 — the record.** `brands.ts`, `refusals.ts` and `refused.ts` in contracts, `LostCall.answer?`/`refused?`,
      `refused?` on both calls; the table, its migration and `recordRefusedAnswer`; the adapter's `answer`/`refused` on
      `Spent`; `recordingPort`'s rows. Amendment blocks: `paid-failures` (`LostCall`, the recording port), `paid-path`
      (the adapter). **Proves: 3, 4, 5, 6.**
- [ ] **Slice 3 — the structured calls ask again.** `askStructured` at all five sites; the stand-in's `Spent`; the
      engine's `refusedThen`; `reel-plan`'s check 7 amended. Amendment blocks: `reel-plan`, `reel-stills` (check 27's
      count), `reel-render` (check 24's count). **Proves: 7 to 15.**
- [ ] **Slice 4 — the witness is told, and the gates' refusals are kept.** `askWitness`' new object and `refusals`
      port; Gates 1 and 4 wired; `StillsPorts` and `ClipsPorts` gain `refusals`, and the worker's `refusalRecorder`
      fills it; refused timings in the clips stage; the adapter's rendering of `refused`; `second-ask`'s checks 1 to 5
      and `reel-takes`' hand-written ports amended. Amendment blocks: `second-ask`, `reel-stills`, `reel-render`,
      `reel-takes`. **Proves: 16 to 21.**
- [ ] **Slice 5 — the reader and the journey.** `scripts/refused.mjs`, `real-reel.mjs`' count, check 23 in
      `paid-path`'s file, check 24; this feature's journey, and every amended feature's again — `paid-path`,
      `paid-failures`, `reel-plan`, `reel-stills`, `reel-render`, `reel-takes`, `second-ask` (S-099's form).
      **Proves: 22, 23, 24.**

Every check appears in exactly one slice: 2 + 4 + 9 + 6 + 3 = 24.

## Outcome

1. **The witness is shown exactly the rule it is judged by**, from its first ask.
2. **Asked again, it is told why its first answer was refused**, and nothing from the brief.
3. **A plan, a score or a reconcile answer the model wrote in the wrong shape is asked once more**, where today it ends
   the reel.
4. **Twice still ends it**, and nothing outside a shape is ever accepted.
5. **Every answer the model wrote that could not be read is kept, with why**, and `scripts/refused.mjs` prints them —
   except the three gate-level refusals Deferred item 2 names.

## Evidence (newest first; appended by the journey, never typed by hand)

## Divergence (the first broken boundary, or "none")

## Deferred

1. **Asking the narration again** when its timings do not parse (P-001). The owner kept it to one call; its timings
   are kept by this feature, so the next one can be read before deciding.
2. **A second ask for a witness `Spent`, and for `compare`, `judgeCut` and `readText`** — `second-ask`'s Deferred items
   2 and 3. Their `Spent` answers ARE kept (checks 3, 4); their gate-level refusals — Gate 1S's, Gate 7's and the text
   step's — are neither asked again nor kept yet, and their adapter shapes stay the adapter's (they are built per call
   at the gate).
3. **The lease in the compound worst case** — `second-ask`'s Deferred item 5, now reachable from a `structured` call
   in a clips job (Gate 5).
4. **Parallel shots** (D-023, S-115) — held by the owner.

## Found while building

1. **Slice 2 — check 6, as approved, could not be built.** It forbade any object property named `refused` in
   `packages/providers/src` and `apps/`, and the budget guard has had its own since S-035: `ClipsLimits.refused`, the
   calls a guard refused, in `clips-job.ts` and `questions.ts`. A name scan cannot tell them apart. **The scan now uses
   the type checker** over every package and app: a `refused` property that lands in either brand — or in nothing typed
   at all, which is how an `any` would carry one — is allowed only where the design puts it, bound to its one source.
   That is the property the check exists for, and it is stricter where it matters: broken deliberately with a worker
   passing `{ ...call, refused: JSON.parse('[]') }` to `observe`, it names `recording-port.ts` and the `WitnessRefusals`
   it lands in. The check's title in Gate 3 reads accordingly; nothing else in the gates moved.

## Gate review 1 — 2026-09-24, adversarial reviewer, same session

Read against the gates, S-156 and the code at `046ad37`. **Fifteen findings; all four gates NOT APPROVED.** Three
became owner questions, answered before this revision (S-156): the shape in one copy, in contracts (finding 1);
measure first (finding 1); ask again only when an answer was held (finding 9).

1. **The witness is shown a looser shape than the gate parses** — the adapter's own copy: `count` any integer, `label`
   possibly empty, no strict object. **Fixed:** Slice 1 moves the schemas to contracts; checks 1 and 2; measured.
2. **Binding decisions contradicted and unnamed** — S-037, S-072, D-035/D-061, D-064, S-040, reel-render check 24,
   S-130's and S-136's rejections, S-116. **Fixed:** named in Gate 2's last section and in S-156.
3. **The type-level I-8 guard replaced by one run.** **Fixed:** `Refusals` is branded; check 6 compiles the misuse
   and scans for casts; check 19's markers widened.
4. **Check 18 (now 23) could not live in an `ask-again` file**, and the `.env` clause checked nothing. **Fixed:** in
   `paid-path`'s file, three-pictures' precedent; the scripts row restated per script.
5. **`second-ask`'s check 5 was missed.** **Fixed:** amended in Slice 4.
6. **The amended-check list was deferred to a run that cannot find shifted answers.** **Fixed:** read statically; `reel-plan`'s check 7 listed with the assertions that make its refusal visible.
7. **"Byte-for-byte, which paid-path already asserts" was false.** **Fixed:** check 18 pins a digest; the observe body's change is Slice 1's and pinned by check 1.
8. **Redaction short of D-022, unordered, untested at the worker; `LostCall`'s comment made false; paid-failures'
   check 3 cannot see `receipt`.** **Fixed:** check 5's list, redact-then-cut, the escaped URL; check 13 through the
   worker; check 3 reads `receipt.answer` directly; the comment amended.
9. **Every `Spent` was asked again, told operator text, and a zod message is a JSON dump.** **Fixed:** only a `Spent`
   carrying `refused` is asked again, told `<path>: <message>` lines (the owner's choice).
10. **"Every answer is kept" was false by Deferred item 2.** **Fixed:** scoped in Gate 1 and the Outcome.
11. **Stale sentences unlisted.** **Fixed:** listed by slice.
12. **Amendment blocks in the wrong slices.** **Fixed:** each in the slice that touches the feature.
13. **Check 14 (now 3) and check 5 (now 11) weaker than their property.** **Fixed:** both widened.
14. **Engine helpers missing from the file list.** **Fixed:** `refusedThen` in `tests/engine/`.
15. **Minor** — the S-147 bullet's scope, "written as a word", the time, the clips-job lease, "the pipeline never sees
    it", the reader's database, `JSON.stringify(undefined)`, the Decisions line. **Fixed**, each.

## Gate review 2 — 2026-09-24, the same reviewer, reading the revision

**Round 1's fixes held, all but the `Refusals` design; eight findings; still NOT APPROVED.** All fixed:

1. **One brand let the brief through**: `refusalsOf` takes any ZodError, and the planning, reconcile and timings
   schemas write subject ids, criterion ids and the narration's words into their messages. **Fixed:** two brands —
   `WitnessRefusals`, built only by `witnessRefusalsOf`, which parses under the witness's own two schemas by identity;
   `Refusals` for `structured` only. Check 6 compiles `observe({ …, refused: refusalsOf(anyError) })` as an error and
   reads syntax trees, not the text `refused:`, so a shorthand property and an `any` are caught.
2. **The layout made an import cycle** (`no-circular` counts type imports). **Fixed:** `brands.ts` imports nothing;
   the recorders stay as they are and the stages gain a `refusals` port instead, so `picture.ts` and `clip.ts` import
   nothing new; the graph is written in Gate 3.
3. **The measurement was told too kindly**: on reel 4's picture the aligned shape made the witness count the stars as
   1 every time. **Fixed:** said in Gate 1, S-156 and the least-confident decisions, with when it matters.
4. **"The adapter still never parses" had no check.** **Fixed:** check 1's recorded-wire case.
5. **The reader could not be read-only through the domain's opener.** **Fixed:** `node:sqlite` read-only, as
   `real-reel.mjs` reads; check 22 asserts unchanged bytes and a missing path creating nothing.
6. **Check 2's scan target was ambiguous.** **Fixed:** the declaration `faceVisible: z.enum(`.
7. **`reel-plan`'s check 7 would prove a different refusal.** **Fixed:** the second call's `refused` names _"unit 1
   has 2 shots"_.
8. **The digest came late and the observe question was unpinned.** **Fixed:** both pinned in check 1, from Slice 1,
   at `046ad37`.

## Gate review 3 — 2026-09-24, the same reviewer

**Product and slices APPROVED; architecture and program design held on two findings, then fixed:**

1. **The supersession bullets still named `Refusals`** — the brand that can carry the brief — where the design gives
   `observe` `WitnessRefusals`. **Fixed** here and in S-156.
2. **Check 6 pinned the schema `witnessRefusalsOf` is handed, not the value**: `unrecognized_keys` quotes a key, so a
   brief-built object would do. **Fixed:** called only in `gates/witness.ts`, only on the observe answer's value.
3. **Check 6's property scan covered only the pipeline**; the worker wraps every `observe`. **Fixed:** `apps/` and
   `packages/providers/src` too — a `refused` property is written only on a `Spent`'s receipt, from the builders.
4. **Minor**: SQLite's `-shm`/`-wal` side files, and "as `real-reel.mjs` reads" (it opens read-write); the recorded
   wire's fixture; two copies of the `<path>: <message>` format. **Fixed**, each.

## Gate review 4 — 2026-09-24, the same reviewer

**All four gates APPROVED**; the `Gates:` line written by the reviewer itself, its one edit. Two notes, not findings:
the `RefusalRecorder`'s one method is named `keep`, not `refused`, so check 6's scan of `apps/` — no `refused` property
written there — stays exact; and the claim that no other verified test scripts a refused `structured` answer is
tested by Slice 3's run of the whole suite, beside `reel-plan`'s amended check 7.
