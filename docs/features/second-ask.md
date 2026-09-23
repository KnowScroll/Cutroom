---
status: current
authority: plan
---

# second-ask — a witness whose answer the gate cannot read is asked once more, and only once

Status: planned
Decisions: D-005, D-031, D-033, D-041, D-042, D-044, D-045, D-051, D-053, D-084, D-086, I-8, I-15, S-028, S-031, S-037, S-038, S-042, S-046, S-072, S-096, S-099, S-111, S-113, S-125, S-126, S-129, S-130, S-136, S-137, S-139, S-142, S-144, S-146, S-147
Named only in the deferral list: D-023, S-115
Gates: product APPROVED 2026-09-23 adversarial-reviewer · architecture APPROVED 2026-09-23 adversarial-reviewer · program-design APPROVED 2026-09-23 adversarial-reviewer · slices APPROVED 2026-09-23 adversarial-reviewer

> **Created 2026-09-23 by S-147**, out of the owner's decision of 2026-09-22 (S-146): _an observation the gate cannot
> parse is asked again ONCE, and that needs its gates before its code._ The measurement it answers to is S-144's: on
> the clip that killed a finished run, the witness answered outside a closed set in **2 of 14** calls as shipped and
> **1 of 12** with the sets said in the question.
>
> **The owner answered two questions before any gate was written** (S-147): the retry lives **at the gate that
> parses** — `packages/pipeline`, not a new arm on the model port — and it covers **both witnesses**, Gate 1's on a
> still and Gate 4's on a clip.
>
> **What this feature is not.** It widens no closed set, repairs no answer, and asks no new question: the witness is
> asked the same thing, the same way, a second time. It does not touch any adapter, and every gate's verdict on an
> answer that parses is exactly what it is today.

## Gate 1 — Product (no technical language)

**The problem.** Before a reel keeps a picture or a clip, the engine asks a second model to describe it, in a fixed
vocabulary — whether it is bright or dim, whether a thing sits left, centre or right. Now and then that model answers
in its own words instead: _"scattered between the tall pillars"_ where it was asked for left, centre or right. The
engine rightly refuses to read that as an answer — and today **a refusal ends the whole reel on the spot**. On the one
clip it was measured on, it happened about one call in twelve; it happens after the clip has been paid for, because a
clip is described only once it exists; and a reel describes four clips, so at that rate **about one reel in three**
dies this way with everything already bought. Asked once more, and if the two answers are independent, that becomes
**about one reel in thirty-five**. These are clip figures; how often it happens on pictures has not been measured.

**The visible outcome.** Nothing a caller asks for changes, and the answers are the same kinds as today. What is
different:

- **a description the engine cannot read is asked for once more**, exactly as it was asked the first time, and the
  second description is the one that counts if it can be read;
- **two descriptions in a row that cannot be read still end the reel**, giving the reasons the second was refused,
  exactly as one does today — there is never a third ask;
- **both asks are on the record**, so how often the describing model answered in its own words stays countable;
- **nothing else is asked again**: a service that is down, a call that was wrong, and an answer that is not even a
  description behave exactly as they do today.

**What does not change.** No picture or clip that would be refused today is accepted: the vocabulary is exactly what
it was, and an answer outside it is never translated into a word inside it. No reel costs more money, because asking
this model is covered by the plan it runs on; a reel whose description is asked twice takes a little longer.

## Gate 2 — Architecture

**Where each part of this lives, and what it may not do.**

| package              | what it gains                                                                                                    | what it still may not do                                                       |
| -------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `packages/pipeline`  | `askWitness` in `gates/witness.ts`, which Gates 1 and 4 call: `observe`, parse, and on a refusal `observe` again | reach for a port, do I/O, import an npm package but `zod` (it imports no more) |
| `packages/contracts` | **doc comments only**: `ModelReceipt`'s `pictureIds` and `takeIds` tie an observation to _"the last"_ receipt    | import anything internal                                                       |
| `packages/providers` | **nothing**: every adapter still sends each call once and parses no observation (S-096, S-042)                   | —                                                                              |
| `apps/worker`        | **a doc comment only** in `recording-port.ts`, the same sentence; no code                                        | import `packages/providers` (`worker-no-providers`, S-038)                     |
| `packages/domain`    | **nothing**: no table, no column, no migration                                                                   | —                                                                              |

**THE RETRY IS AT THE GATE BECAUSE THE SCHEMA THAT REFUSES IS THERE, AND THAT IS THE LOAD-BEARING SENTENCE.** Gate 1
parses a still's answer under `witnessObservation` and Gate 4 parses a clip's under `clipObservation`; those two
schemas are the only things in this repository that say an answer is refused (D-041, S-042). The adapter holds shapes
too, but only to ASK for one (S-130), and is written never to parse with them, so that the gate's refusal stays
reachable. A retry anywhere else would need a second copy of the closed sets to know when to fire.

**What `askWitness` does, whole.**

```text
askWitness<T>(call, observe, schema, id, noun)
  call     the observe argument, built ONCE by the gate: { picture, temperature: 0 } or { clip, temperature: 0 }
  observe  the port's observe, bound: (call) => model.observe(call)
  schema   witnessObservation (Gate 1) or clipObservation (Gate 4)
  id       the picture id or take id;  noun  'an observation' or 'a clip observation'

  first = await observe(call)                a throw propagates unchanged, and nothing is asked again
  one   = schema.safeParse(first.value);     success → return one.data
  second = await observe(call)               THE SAME OBJECT: nothing added, nothing removed
  two   = schema.safeParse(second.value);    success → return two.data
  throw new Error(`the witness's answer for ${id} is not ${noun}: ${issues(two)}`)
        issues(r) = r.error.issues.map(i => `${i.path.join('.') || '(answer)'}: ${i.message}`).join('; ')
```

- **The same call, not a similar one.** The gate builds the argument once and `askWitness` passes that object twice:
  nothing is added to the second ask — no "you answered wrongly", no quoted first answer, no hint — because the
  witness must never be told anything about what the picture is meant to be (I-8), and a message about its first
  answer is a field a brief could ride in.
- **Once.** There is no loop and no counter. The only way to reach a third `observe` for one picture or take is a
  second picture or take.
- **A throw is not a refusal**, on either ask. `Unavailable` already has the worker's counter around the model port
  (S-137, S-142); a `Spent` is the adapter failing to READ a 200 — not JSON, the schema echoed, cut off — which has
  its `lost_call` row and fails the run; a plain fault is a request that was wrong. **A throw on the first ask
  propagates after one call, and a throw on the second after two**, unchanged either way.
- **The error keeps today's words and today's format** — `the witness's answer for <id> is not an observation: …`
  and `… is not a clip observation: …`, each issue `<path or (answer)>: <message>`, joined by `; ` — with the SECOND
  answer's issues and none of the first's.

**Why asking the same thing twice at temperature 0 can give a different answer.** D-045 argued the opposite: _"At
temperature 0 a duplicate call returns a duplicate answer."_ **On this wire that is measured false** (S-144): fourteen
identical calls on one clip at temperature 0 gave twelve answers inside the sets and two outside, with different
words. S-147 records D-045's premise as superseded by the measurement. What D-031 rule 5 needs from temperature 0 is
a REPLAYABLE score, and the score is replayed from the one stored observation — never by asking the witness again —
so that stands.

**What is on the record, and why the join is not the silent corruption S-126 feared.** The worker hands the pipeline
its recording port, which writes each call's `model_receipt` as the call returns — before the gate parses the value
(D-084). So:

- an answer that parses first time leaves **one** `observe` receipt, exactly as today;
- a refusal and then a parse leaves **two**, and the observation row is written once, from the second;
- two refusals leave **two** receipts, no observation row, and a failed run;
- a refusal and then a throw leaves **one** receipt (and, for a `Spent`, the `lost_call` row paid-failures writes —
  proven by paid-failures' verified `recordingSpend` checks and by check 4's same-error-object rethrow here, not by a
  worker check of this feature, because the stand-in can throw only a plain `Error`).

S-037 made the tie _"the one `observe` receipt whose `pictureIds` is its picture's … since picture ids never repeat"_,
and S-126 refused a second `observe` per picture because _"two would make that key ambiguous — a silent corruption, not
a failing test"_. **S-126's case was two answers that each become a record**, with nothing to say which. Here only
one answer can ever become a record — a refused one writes no observation, no verdict step and nothing downstream —
so the key still names exactly one observation; what it names is up to two receipts, and **the last of them is the
observation's** (`model_receipt.id` is an autoincrement, so the last is well defined). **And it is not silent**:
checks 6, 7 and 8 assert the receipt count for every case above, so a third receipt, or a second one where the first
answer parsed, fails a test. S-147 supersedes S-037's _"exactly one"_ and S-072's _"one `observe` call"_ for Gate 4
in these words. Nothing in `packages/domain` or `apps/worker` reads the join today, so no code moves with the
sentence.

**I-15, in its count and not its reason (S-147).** I-15 says _"one vision call per generated image"_ because _"a
second pass over one image produces a second record that can disagree with the first, with no rule for which wins"_.
The COUNT is superseded: one observation per image or clip, from at most two calls. The REASON is not: there is still
one record, and the rule for which counts is that only one can parse and be kept. Every downstream reader — the score,
the reconcile step, the clip prompt, Gate 5 — reads that one record, as today (D-033, D-045).

**What the words of a refused answer become: nothing, today and after.** A zod issue does not carry the value it
refused — S-144's own failure reads `lighting: Invalid option: expected one of …`, with no word of what was answered
— so a refused answer's words are not printed now and are not printed after this feature, for either ask. S-144's
words were found by asking the clip again by hand. The second receipt is what keeps the RATE countable; keeping the
WORDS needs a place on a verdict or a row of its own, a change of shape to a verified contract — Deferred item 1.

**Time, and the lease.** A second ask costs one more model call's time, only after an ask that was refused. Its worst
case is not one timeout: the adapter turns a 600 s timeout into `Unavailable`, and the worker's counter around the
model port sends it again up to `maxAttempts` (3) times with backoff (`retryingModelPort`, S-137, S-142) — **about
thirty minutes for one ask at the defaults**. The counter LENGTHENS that worst case; it does not shorten it. The lease
floor, which is the default lease of a real run, is `CLIPS_A_JOB` takes' video waits plus one hour of slack for
everything else (`DEFAULT_LEASE_FLOOR_MS`, S-113, S-125); a take whose second ask runs the whole thirty minutes spends
half of that hour, and an expired lease re-buys the take in flight. **A first ask carries exactly this exposure
today**, so the second ask doubles an existing exposure on the one ask in about twelve that is refused; it does not
create one. That is not measured and is not expected, so **the lease is not changed here**, and Deferred item 5 names
it with these figures.

**What this feature changes in verified features.** Three, each by addition, all three journeys re-run in the last
slice. **Each amended check is made to prove the refusal it names, not just a failed run**: after this change, a run
whose refused witness has only ONE scripted answer still fails — the stand-in throws _"the stand-in's script has no
answer for witness call N"_ on the second ask — so a check asserting only `failed`, or a detail matching `/witness/`,
would stay green while testing a thrown call. Each amended check therefore gives the refused witness TWO answers and
asserts **both** today's exact words and **two** `observe` receipts for that picture or take.

- **`reel-stills`, check 46** (`tests/reel-stills-faults.test.ts`): the barons' picture gets two malformed answers;
  its detail is asserted `/is not an observation: /`; its kept receipts show `observe witness a1-shot-1-single`
  twice.
- **`reel-render`, check 23** (`tests/reel-render-gates.test.ts`, run `r23-unparsed`): take t1 gets its still-shaped
  answer twice; its detail is asserted `/is not a clip observation: /`, and two `observe` receipts for t1.
- **`reel-takes`, the labels check's `r14-failed`** (`tests/reel-takes-labels.test.ts`): shot 3's take gets its
  wrong answer twice; the detail and the two receipts are asserted the same way.

**Sentences that go stale, and are amended in the same slice as the code — Slice 1, with the amendment blocks:** `ModelReceipt`'s `pictureIds` and
`takeIds` doc comments (`packages/contracts/src/model.ts`); `recordingPort`'s header (`apps/worker/src/recording-port.ts`);
`gate4.ts`'s and `gate1.ts`'s comments naming S-042; and `docs/features/reel-stills.md`'s _"exactly one `observe`
receipt per picture"_ and _"picture ids never repeat, so each key names one receipt"_, quoted in its amendment block.
Each of `reel-stills`, `reel-render` and `reel-takes` gains an amendment block above its gates, in S-143's form; no
gate below it is edited.

**Nothing else moves**: not the adapter, not the question, not the rendered shape, not S-144's sentence, and not any
closed set.

## Gate 3 — Program design

**File locations.**

```text
packages/pipeline/src/gates/witness.ts     askWitness — new; not exported from the package's index
packages/pipeline/src/gates/gate1.ts       the witness step calls askWitness with witnessObservation
packages/pipeline/src/gates/gate4.ts       calls askWitness with clipObservation
packages/contracts/src/model.ts            ModelReceipt's two doc comments: "the last observe receipt"
apps/worker/src/recording-port.ts          its header comment, the same sentence
tests/engine/stills.ts, video.ts           twice(first, second): a witness override queued as two SCRIPTED answers —
                                           each a FakeAnswer, { value } or { throws }, so check 8 can script its throw
tests/reel-stills-faults.test.ts           check 46 — two answers, the words, two receipts
tests/reel-render-gates.test.ts            check 23 — the same
tests/reel-takes-labels.test.ts            r14-failed — the same
docs/features/reel-{stills,render,takes}.md   amendment blocks
tests/second-ask-*.test.ts                 the checks below
```

`askWitness` is not exported from `packages/pipeline`'s index: nothing outside the package should ask a witness
without the gate's schema beside it. The tests import `gates/witness.ts` and `gates/gate4.ts` by path, as
`tests/reel-plan-planning.test.ts` already imports `split/index.ts`. **Gate 1 is not run by checks 1 to 5**: it needs a
sensor and a measure beside the model, and its wiring — `witnessObservation`, the noun _"an observation"_, the picture
id — is proven through the worker by checks 6, 7 and 8, deliberately, where check 7 asserts its exact words.

**The checks.** Each is one test, named by its number.

_The gate, with a hand-written port_ — a port that records, AT CALL TIME, the argument's identity and a
`structuredClone` of it, so a key added for one ask and removed after it is still seen.

1. `a witness answer that parses is asked for once: askWitness and gate4 each make exactly one observe call and return its observation` — S-042, D-041.
2. `a first answer the schema refuses is asked for once more with the SAME argument object — identical by reference and, snapshotted at each call, holding only the picture or clip ref and temperature 0 — and the second answer, parsing, is the observation returned` — S-146, S-147, I-8.
3. `two refused answers, refused on DIFFERENT paths (lighting, then entities.0.position), throw after exactly two observe calls with exactly "the witness's answer for <id> is not <noun>: " followed by the second's issues in today's format; the first's path appears nowhere in the message; no third call is made` — S-146, S-042.
4. `an observe that throws — a plain fault, Unavailable, or Spent — on the FIRST ask is called once, and on the SECOND ask after a refusal is called twice; the same error object comes out unchanged either way` — S-096, S-137, S-142.
5. `the two schemas are exactly what they were: witnessObservation's and clipObservation's full JSON Schema equal a hand-typed snapshot — every closed set (framing, lighting, entities.position, entities.prominence, entities.faceVisible), every strict object, every minimum — and "center", "top" or a phrase answered twice fails the gate rather than being mapped into a set` — S-144.

_Through the worker, with the stand-in_

6. `a still whose witness is refused once and then parses is accepted on the second observation — two observe receipts for that picture, one observation row equal to the second answer — and a take the same, two observe receipts for that take and one take observation; every other picture and take in the run has exactly one` — S-147, D-084, I-15.
7. `a still whose witness is refused twice fails the run with a detail matching "is not an observation: ", two observe receipts for that picture and no observation row; a take the same, "is not a clip observation: ", two receipts, no take observation` — S-147, S-042.
8. `a still whose witness is refused and whose second ask throws fails the run with the thrown error's words, one observe receipt for that picture and no observation row; a take the same, one observe receipt for that take and no take observation` — S-147, D-084.

_The journey_

9. `every other test of this feature passes in a child process whose environment holds only PATH and what the operating system needs to start Node, in S-028's form` — S-028, S-111.

**The four least confident decisions.** Whether the draws really are independent — S-144's figures cannot tell, and a
witness that refuses the same clip every time turns this into a delay rather than a fix; the second receipt is what
will show it. Whether the words of a refused answer should be stored (Deferred item 1). Whether `Spent` answers deserve
the same second ask; they are a different failure. Whether the lease slack is enough in the compound worst case
(Deferred item 5).

## Gate 4 — Slices

- [x] **Slice 1 — the gates ask again.** `packages/pipeline/src/gates/witness.ts`; Gates 1 and 4 call it; the three
      doc comments; `twice` in the engine's scripts; checks 46, 23 and `r14-failed` amended in the same commit,
      because without them the suite is red (check 46) or silently green on the wrong failure (23, `r14-failed`); and
      the three amendment blocks that record those changes, beside them. **Proves: 1, 2, 3, 4, 5.**
- [ ] **Slice 2 — through the worker.** `tests/second-ask-worker.test.ts`. **Proves: 6, 7, 8.**
- [ ] **Slice 3 — the journey.** Check 9, this feature's journey, and `reel-stills`', `reel-render`'s and
      `reel-takes`' again (S-099's form). **Proves: 9.**

Every check appears in exactly one slice: 5 + 3 + 1 = 9.

## Outcome

1. **A witness answering outside its vocabulary once no longer ends a reel**: it is asked once more, the same way.
2. **Twice still ends it**, with the same words as today, and nothing outside a closed set is ever accepted.
3. **Every ask is on the record**, so the rate S-144 measured stays countable from the receipts of real runs.

## Evidence (newest first; appended by the journey, never typed by hand)

## Divergence (the first broken boundary, or "none")

none

## Deferred

1. **Storing the words of a refused answer** — neither ask's words are kept or printed today, because a zod issue
   does not carry the value it refused. A field on a verdict or a row of its own, either a change of shape to a
   verified contract.
2. **A second ask for a `Spent` observation** — an answer the adapter could not read at all. Different failure, and
   S-147 keeps it one send.
3. **`compare`, `judgeCut` and `readText`** — Gate 1S, Gate 7 and Gate 1's text step also parse an answer. None has
   been measured failing a closed set, and each is its own decision if one does.
4. **Parallel shots** (D-023, S-115) — held by the owner.
5. **The lease slack in the worst case** — a refused ask whose second ask times out on every one of `maxAttempts` (3)
   sends, about thirty minutes, is half of `LEASE_SLACK_MS`' hour; two such takes in one job exhaust it (S-113,
   S-125). A first ask has the same exposure today. Not measured and not expected; re-sized from a measurement if a
   real run shows it.

## Gate review 1 — 2026-09-23, adversarial reviewer, same session

Read against the gates, the decisions they cite, and the code at `1966348`. **Fourteen findings, all fixed before the
gates were marked APPROVED.**

1. **`reel-render`'s check 23 gives a take an unparseable observation, and the first draft said none did.** After the
   change it would have stayed green on a thrown stand-in call. **Fixed:** listed, amended, and asserting the words
   and two receipts.
2. **`r14-failed` and check 46 would pass on the wrong failure**: neither read the detail closely enough to tell a
   refusal from the stand-in running out of answers. **Fixed:** every amended check asserts today's exact words and
   two receipts, and Gate 2 says why.
3. **Binding decisions were in conflict and unnamed**: S-037's _"exactly one"_, S-072's _"one `observe` call"_,
   D-045's temperature-0 premise, and S-126's silent-corruption argument. **Fixed:** S-147 supersedes the first three
   in words, and Gate 2 answers S-126 and says what "replayable" means now.
4. **"The words are printed when a run fails" was false**: a zod issue carries no value. **Fixed:** Gate 1, Gate 2
   and Deferred item 1 say the words are lost today and stay lost.
5. **Slice 1 left the suite red** until Slice 2's fixture change. **Fixed:** `twice` and all three amendments are in
   Slice 1.
6. **The pseudocode built a new argument on every call**, contradicting check 2, and had no noun for the message.
   **Fixed:** `askWitness(call, observe, schema, id, noun)`, the call built once.
7. **Check 3 could not tell whose issues it reported.** **Fixed:** refused on different paths, exact message, the
   first's path absent.
8. **A refusal followed by a throw, and two refusals through the worker, had no check.** **Fixed:** checks 4, 7, 8.
9. **Check 5 missed `faceVisible`, strictness and minimums.** **Fixed:** a full JSON Schema snapshot.
10. **"No other key" read from calls stored by reference could miss a key added and removed.** **Fixed:** snapshotted
    at call time.
11. **Stale sentences in `recording-port.ts`, both `ModelReceipt` comments and `reel-stills.md` were not listed.**
    **Fixed:** listed in Gate 2 and Gate 3, and quoted in the amendment blocks.
12. **The lease was not addressed.** **Fixed:** Gate 2's arithmetic, and Deferred item 5.
13. **The failure figures were one in fifty for both witnesses**; they are clip figures, and one in fifty needs a
    lower rate than was measured. **Fixed:** Gate 1 gives one in three to about one in thirty-five, at 1 in 12, clips only.
14. **Minor**: the pipeline already imports `@cutroom/reel-contract`, so the table no longer says "zod and contracts
    only"; the tests import `gate4` and `witness.ts` by path; the Decisions line gains S-038, S-126, S-130.

**Considered, not findings:** a restart between the two asks leaves one refused receipt on an attempt id never
witnessed again, so "the last" still holds; nothing reads the join; the boundary is clean; throws are not retried;
the restart helpers' call counts and check 47's indices are on scripts with no refusal and do not move.

## Gate review 2 — 2026-09-23, adversarial reviewer, same session

The same reviewer, reading the revision. **All fourteen first-pass fixes verified in the text; seven more findings, all
fixed; then a third pass verified those and APPROVED all four gates.**

1. **The lease arithmetic was a single timeout**; the worker's counter sends a timed-out call again up to three
   times, so a second ask's worst case is about thirty minutes, and the counter lengthens it. **Fixed:** Gate 2 and
   Deferred item 5, with the lease floor named as the default lease and a first ask's identical exposure stated.
2. **Check 8 needed `twice` to take a scripted throw, a take case, and an honest source for the `lost_call` claim.**
   **Fixed:** `twice` takes a `FakeAnswer`; check 8 covers a take; the `Spent` row is credited to paid-failures'
   verified checks and check 4's rethrow.
3. **S-147 was behind the file**: check 23, `faceVisible`, the second doc comment and the worker header, three
   features not two, and the throw-once-or-twice rule. **Fixed** in S-147.
4. **The receipt-count sentence credited checks 6 and 7**; the refusal-then-throw case is check 8's. **Fixed.**
5. **The amendment blocks sat in Slice 2** while the test changes they record were in Slice 1. **Fixed:** Slice 1.
6. **"One in forty" rounded the favourable way**: 1 − (143/144)⁴ is about one in thirty-six. **Fixed:** thirty-five.
   S-146's _"one in fifty"_ is the owner's confirmed entry and is not edited; S-147 records the correction.
7. **Gate 1's wiring had no check that runs it directly.** **Fixed:** Gate 3 says it is proven through the worker by
   checks 6 to 8, deliberately, where check 7 asserts its exact words.
