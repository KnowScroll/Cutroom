---
status: current
authority: plan
---

# paid-failures — a call the provider has already answered leaves its row, and a moment's failure does not end the run

Status: planned
Decisions: D-002, D-005, D-006, D-007, D-008, D-019, D-022, D-024, D-025, D-026, D-027, D-028, D-081, D-083, D-084,
D-086, D-094, D-100, I-4, I-11, S-021, S-035, S-036, S-038, S-043, S-046, S-048, S-053, S-059, S-070, S-075, S-087,
S-095, S-096, S-099, S-108, S-109, S-111, S-114, S-122, S-124, S-125, S-128, S-133, S-137, S-141, S-142
Named only in the deferral list: D-023, S-115
Gates: product APPROVED 2026-09-22 adversarial-reviewer · architecture APPROVED 2026-09-22 adversarial-reviewer · program-design APPROVED 2026-09-22 adversarial-reviewer · slices APPROVED 2026-09-22 adversarial-reviewer

> **Created 2026-09-22 by S-142**, at the owner's choice, out of the two gaps `paid-path`'s Slice 8 found on a real
> reel and deliberately did not close: **a call that completes and then fails to parse leaves no receipt** (S-133),
> and **the model port has no transient retry** (S-137). They are one shape twice — _a call that happened, and a run
> that cannot carry on from it_ — and S-142 records why they are a feature rather than a ninth slice of `paid-path`:
> that feature's approved Gate 1 says it _"builds no new stage, gate, table or route"_, and this one adds a table.
>
> **The owner answered three questions before any gate was written** (S-142): a feature of its own; the receipt
> carried by a typed error the worker catches; and a table of its own rather than a widened `generation_receipt`.
>
> **What this feature is not.** It makes no new kind of reel, asks no new question of any provider, and moves no
> gate. Every verdict a reel gets, every figure a cap is compared with and every picture, take and clip a run makes
> are exactly what they are today. **It changes what is written down when a call goes wrong, and how long a run
> survives a provider having a bad minute.**

## Gate 1 — Product (no technical language)

**The problem.** The engine now spends real money, and two things it does when a call goes wrong are wrong.

- **When it pays for something and cannot use what came back, it forgets that it paid.** The engine works out how
  much of its allowance is left by adding up what it has written down; so money it forgot is money it will spend
  again. On the one real reel made so far this happened twice, on two pictures, and the only reason nothing was lost
  is that the thinking service was on a plan that charges nothing. At the price of a finished reel it is about two
  dollars a run that nobody can see.
- **When the service it thinks with stumbles for a moment, the whole reel stops.** Every other service it uses is
  asked again after a short wait; this one is not. The later the stumble, the more the reel has already paid for —
  and a reel that stops after its pictures are made has thrown all of them away.

**The visible outcome.** Nothing asks for anything differently, and the answers are the same kinds as today: the
finished video, a budget answer with its figures, the rule and step that stopped it, cancelled, or something went
wrong inside the engine. What changes is what is true while that happens:

- **everything the engine pays for is written down**, whether or not what came back could be used — so its own
  spending limit counts it, and a reel stops at the limit instead of quietly going past it;
- **a picture that was paid for and could not be used costs one of the six tries** a reel is allowed at pictures, so
  a reel cannot pay for more pictures than it is allowed by failing at them;
- **the service the engine thinks with, failing for a moment, is asked again** after a short wait, a few times,
  exactly as the services that make clips and voices already are — and that costs a shot none of its tries;
- **a failure that asking again cannot fix still stops the reel at once**, and so does a call that has already been
  paid for: nothing that cost money is ever sent a second time by this.

**What does not change.** No reel becomes cheaper, more expensive, or worse. Nothing that was refused is now
accepted: every gate, every criterion and every limit is exactly what it was. A run that fails still fails, at the
same moment, with the same words — the difference is that the money it spent on the way is on the record.

## Gate 2 — Architecture

**Where each part of this lives, and what it may not do.**

| package              | what it gains                                                                                                                        | what it still may not do                                   |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| `packages/contracts` | `Spent`, a class carrying the row a paid call owes; `isSpent`; and `Unavailable` and `isUnavailable`, moved here from `providers`    | import anything internal                                   |
| `packages/providers` | every real adapter throws `Spent` once the provider has made something; `transient.ts` re-exports the two moved names                | keep durable state, or write a row                         |
| `packages/domain`    | the `lost_call` table and its migration; `recordLostCall`; `imageCallCount` counting both tables                                     | know which provider a row came from                        |
| `apps/worker`        | the recording port and the three guarded ports catch `Spent`, write, and rethrow; the model port is wrapped in the transient counter | import `packages/providers` (`worker-no-providers`, S-038) |
| `packages/pipeline`  | **nothing**                                                                                                                          | see any of this: a thrown call still fails the run (S-046) |

**THE CLASS LIVES IN `packages/contracts`, AND THAT IS THE LOAD-BEARING SENTENCE.** `worker-no-providers` forbids
`apps/worker` importing `packages/providers`, so the worker cannot name a class declared there. That is not a detail:
it is **why `Unavailable` has never been seen by the worker, and why the model port has no retry today.** The worker
is the only place that knows both a stage and a table (CLAUDE.md), so the name it catches has to come from a package
both sides already import. Contracts imports nothing internal and already holds runtime values beside its types —
`PROVIDER_ADAPTERS`, `anyReal`, `DEFAULT_PROVIDER_SETTINGS` — so this needs no new package and no new boundary rule.

**What `Spent` carries, and when an adapter throws one.**

```text
class Spent extends Error       kind: 'spent'
  receipt: {
    port      'image' | 'video' | 'speech' | 'model'
    model     THE WIRE THAT WAS ACTUALLY CALLED, as every receipt records it (S-128)
    costCents the configured rate applied to what was asked for, rounded as the guard rounds (S-059)
    detail    what went wrong, in the adapter's own words — never a key, never a URL (D-022, S-109)
  }
```

**The line an adapter draws is "has the provider made something yet".** It is not a guess about billing and does not
need to be: everything after that line is a failure of ours to use what we asked for and paid for.

- **fal, image and video** — once `runQueued` returns a COMPLETED job. Everything after it is `Spent`: a result body
  that does not parse (S-133's `width: null`), a result carrying no picture at all, a download that fails, bytes that
  are no readable picture, a frame the entry's rule refuses (S-124), a clip `ffprobe` cannot read (S-125).
- **MiniMax, model and narration** — once a 200 body is in hand. Everything after it is `Spent`: an answer consumed
  by reasoning (S-135), an answer that is the schema (S-136), one cut off mid-JSON (S-140), one that is not JSON, one
  the caller's schema refuses, and timings that are not the text's words (S-129).
- **Everything BEFORE that line is unchanged**: a slug outside the registry, too many references for the entry, a
  400, a 401, a 422, a rejected submit — a plain fault, as today. And a 429, a 5xx, a connection error or a timeout
  is `Unavailable`, as today (S-096): the provider made nothing, so there is nothing to record.

**The cost is known without the answer.** `imageCostCents(entry, …)` and `videoCostCents(entry, seconds)` are our
configured rate applied to what we asked for — the same arithmetic admission's estimate uses (D-083, S-059) — so a
receipt for a call whose answer we could not read is computed from exactly what a successful one would have been. A
model call's cost is its tokens, and under the Token Plan it is nothing (S-129); its row carries the port, the model
and a zero, because **a row that exists is what the next session needs, and the figure can be corrected without
inventing the row.**

**Where the row goes, and why not in `generation_receipt`.** Every row of `generation_receipt` has a `picture_id` and
a picture row written in the same transaction (S-036). A call that made nothing has neither. `lost_call` is its own
table for that reason (S-142), and it is written the way a generation is: **one immediate transaction** that inserts
the row and adds its cost to the running job row's `cost_cents`, which is what `spentCents` sums over the chain
(D-081). **That is the whole point of the feature**: the budget guard reads the chain's spend before every call and
every send (S-035, S-087, S-095), and it reads it from the job rows.

**And the six-call cap counts them.** `imageCallCount` — D-027's bound, read by the keyframes job to size each
attempt's reserve (S-043, S-048) — counts `generation_receipt` today. It counts both tables after this. **A paid call
that made no picture spends one of the six**, which makes the cap stricter and can never make it looser.

**The model port's retry.** The worker wraps the port it was handed in the same counter and backoff the video and
narration ports already have (S-096): a send answered `Unavailable` waits and is sent again, up to `maxAttempts`
sends in all, doubling the wait; still unavailable at the last send it throws, naming the call and the sends. Two
things it must not do, and both are checks: **a `Spent` is never sent again** — it has been paid for — and a plain
fault is never sent again, because a second identical request cannot fix a request that was wrong.

**The order of the wrappers is part of the design, and what it has to deliver is three invariants**: a send that
answers writes exactly one receipt; an `unavailable` send writes nothing at all; and a `Spent` reaches the code that
records it. The counter goes INSIDE the recording port — the model port is wrapped once, where the worker receives
it, so no job can forget it — and a `Spent` thrown through the counter is passed straight out to `recordingSpend`,
which writes its row. The guarded ports keep their present order — the budget comparison first, then the call — so
that every send is still guarded (S-095).

**What this feature changes in verified features.** Two, both by addition, each in the slice that forces it, and
every affected journey re-run in the last slice:

- **`reel-stills`' six-call bound now counts a paid call that made no picture.** `imageCallCount` is read by the
  keyframes job; its meaning widens from _"the pictures this run made"_ to _"the image calls this run paid for"_,
  which is what D-027 says in words. **The bound gets tighter, never looser**, and `reel-stills`' own checks are
  unchanged: with no lost call the count is the same number it was.
- **`reel-render` and `reel-takes` see the model port wrapped one layer deeper.** Neither asserts what wraps it;
  both assert what a thrown call does to a run, and a thrown call still fails the run. Their journeys re-run because
  the worker's composition moved, not because either was edited.
- **`reel-takes`' check 1 names the video arm's new optional `spent`** (S-143). It was
  `Same<keyof VideoUnavailable, 'kind' | 'detail'>` and is now the whole arm pinned as an object type, which is
  NARROWER: a third key still fails it, and a `spent` of the wrong type fails it too. The narration arm is
  unchanged. `reel-takes` gains an amendment block above its gates saying so; no assertion is removed.

**Nothing else.** `Unavailable` moving to `packages/contracts` keeps its name and its meaning, and
`packages/providers/src/transient.ts` re-exports both names, so every adapter's import line is what it was.

**TWO THINGS THE BUILD FOUND, both recorded here rather than worked around** (Gate review 2, below):

- **A clip re-bought after a transient DOWNLOAD was the largest leak of all, and it is not a thrown failure.** S-125
  answers a 429 or 5xx on the download `unavailable`, which re-buys the clip — and that transient comes AFTER the
  job completed, so fal has already made and billed the first one. The re-buy stands, because failing a reel that
  has paid for every earlier shot is worse; what changes is that the clip already paid for goes on the record before
  the second is bought. `VideoAnswer`'s `unavailable` arm gains an optional `spent`, which only that one case sets,
  and the guarded video port writes it before it sends again. **Narration's arm does not gain one**: T2A is
  plan-covered, so its re-buy costs nothing and there is no figure to lose (S-123, S-129).
- **`recordingPort` had no job id, and a model call's row needs one.** The cost is zero today, so the job row's
  figure does not move — but a row written against no job would be a row whose cost could never be attributed when
  model calls cost money. The id is passed in by each of the four jobs, which all hold it.

## Gate 3 — Program design

**File locations.**

```text
packages/contracts/src/failures.ts     Spent, isSpent, Unavailable, isUnavailable — the two names both sides say
packages/providers/src/transient.ts    re-exports them, and keeps transientStatus, which is the providers' own
packages/providers/src/fal/{image,video}.ts    Spent after a completed job
packages/providers/src/minimax/{model,narration}.ts   Spent after a 200 body
packages/domain/src/schema.ts          the lost_call table
packages/domain/src/ledger.ts          recordLostCall, and imageCallCount over both tables
db/migrations/0005_lost_call.sql       drizzle-kit's, never typed by hand (S-012)
apps/worker/src/recording-port.ts      catches Spent on all five calls, records, rethrows
apps/worker/src/guarded-image-port.ts  the same, around the call it already guards
apps/worker/src/video-port.ts          the same
apps/worker/src/narration-port.ts      the same
apps/worker/src/model-port.ts          the transient counter around the model port (S-096's figures)
tests/paid-failures-*.test.ts          the checks below
```

**The checks.** Each is one test, named by its number.

_What an adapter throws_

1. `every real adapter with an answer in hand throws Spent rather than a plain fault, carrying the wire it called and the configured rate applied to what it asked for: a fal image body that does not parse, one carrying no picture, bytes that are no picture, a frame the entry refuses, a fal video download ffprobe cannot read as a clip, a MiniMax answer that is not JSON, one cut off on length, one that is the schema, one the caller's schema refuses, and narration timings that are not the text's words` — S-133, S-124, S-125, S-129, S-136, S-140.
2. `a failure BEFORE the provider made anything is not Spent and is what it was: a slug outside the registry, more references than the entry takes, a 400, a 401, a 422 and a rejected submit throw a plain fault, and a 429, a 5xx, a connection error and a timeout are still Unavailable — no lost_call row is written for any of them` — S-096, S-122, D-026.
3. `no Spent carries a key, a presigned URL or a query string in its detail, asserted over every recorded fixture the adapters fail on` — D-022, S-109.

_What the worker writes_

4. `a Spent thrown by any of the four paying ports writes exactly one lost_call row and adds its costCents to the job row, in one transaction, and the same error is rethrown unchanged — the stage still fails the run, with no picture row, no take, no narration and no file left under the artifact root` — S-036, S-046, D-086.
5. `spentCents over the chain includes a lost call, and the guarded image port's next comparison refuses the call that the lost call pushes past the cap — the cap first, then the ceiling` — D-081, S-035, D-100.
6. `imageCallCount counts a lost image call: a run whose six calls include one that made no picture makes five pictures and is refused the seventh call` — D-027, S-043, S-048.
7. `the migration applies to a database already holding a run's rows, changes none of them, and a run recorded before it reads back exactly as it did` — S-012.

_The model port's retry_

8. `the model port is sent again while it answers Unavailable — the settings' attempts, the same backoff as the video and narration ports, waiting at least the figure by the monotonic clock — and nothing is recorded for an unavailable send; still unavailable at the last send it throws naming the call and the sends` — S-096, S-102, I-11.
9. `a Spent is sent ONCE and never again, and a plain fault is sent once and never again: a call that has been paid for is not paid for twice, and a request that was wrong is not repeated` — S-142, S-096.
10. `one send that answers writes one model receipt, whatever number of unavailable sends came before it` — D-084.

_The boundary_

11. `apps/worker imports no packages/providers, proven against the real dependency graph and by drift --prove building the violation; Spent and Unavailable are packages/contracts', and packages/providers re-exports them so no adapter's import line moved` — S-038, S-142.
12. `every other test of this feature passes in a child process whose environment holds only PATH and what the operating system needs to start Node, in S-028's form` — S-028, S-111.

**The four least confident decisions.** Whether a failed fal job actually bills, which is read from the dashboard and
not assumed — **the row is right either way**, because the guard cannot see a row that does not exist. Whether the
model port's transient figures should be the render settings' (they are, until something measures otherwise). Whether
`lost_call` will want the provider's request id — it carries one where the adapter has one, and nothing reads it yet.
Whether a `Spent` on the narration path should cost a take (it does not: it costs money, and takes are D-024's).

## Gate 4 — Slices

- [x] **Slice 1 — the two names, and the table.** `packages/contracts/src/failures.ts`; `Unavailable` moved and
      re-exported; the `lost_call` table, its migration, `recordLostCall`, and `imageCallCount` over both tables.
      **Proves: 7, 11.**
- [x] **Slice 2 — the adapters throw it.** fal's image and video after a completed job; MiniMax's model and narration
      after a 200 body. **Proves: 1, 2, 3.**
- [x] **Slice 3 — the worker writes it.** The recording port and the three guarded ports. **Proves: 4, 5, 6.**
- [x] **Slice 4 — the model port's retry.** `apps/worker/src/model-port.ts`, the counter and the backoff the other
      ports already have. **Proves: 8, 9, 10.**
- [x] **Slice 5 — the journey.** Check 12, this feature's journey, and `reel-stills`', `reel-render`'s and
      `reel-takes`' again (S-099's form, for the six-call bound and the worker's composition). **Proves: 12.**

Every check appears in exactly one slice: 2 + 3 + 3 + 3 + 1 = 12.

## Outcome

1. **A paid call the engine could not use is on the record**, in the run's own rows, with the cost the configured
   rate gives it — so the budget guard's next comparison counts it and no run can spend past its cap by failing.
2. **A moment's failure on the thinking service does not end a reel**, and nothing that has been paid for is ever
   sent again.
3. **The six-call bound counts what was paid for**, not what came out well.

## Evidence (newest first; appended by the journey, never typed by hand)

## Divergence (the first broken boundary, or "none")

## Deferred

1. **Parallel shots** (D-023, S-115) — held by the owner, and deliberately not folded in here: S-115 names the
   budget guard racing as the first thing concurrency costs, and this feature touches the guarded ports.
2. **Correcting a model call's cost** — every model receipt's figure is tokens under a plan that charges nothing
   (S-129). When a model call costs money, the rate belongs beside the other rates, and a `lost_call` of port
   `model` gains a figure rather than a row.
3. **Reading the provider's own figures** — D-007's Q9 and whether a failed fal job bills are owed upstream from
   `paid-path`'s Slice 8, and neither is this feature's to close.

## Gate review 1 — 2026-09-22, adversarial reviewer, same session

Read against the gates themselves, the decisions they cite, and the code as it stands at `9a8ffa0`. **Six findings,
all fixed before the gates were marked APPROVED.** Recorded here because a review that finds nothing is a review that
was not adversarial.

1. **The class could not have been caught where Gate 2 first put it.** The first draft declared `Spent` in
   `packages/providers` beside `Unavailable`, and had `apps/worker` catch it — which `worker-no-providers` forbids
   and which typechecks only because a catch clause takes `unknown`. **Fixed:** the class is `packages/contracts`',
   which is also the reason S-137's retry was never built, and Gate 2 now says so as its load-bearing sentence.
2. **"A call that fails to parse" was narrower than the failures that were actually seen.** S-133's two calls failed
   on a body schema and on a frame rule — one is a parse and the other is not. **Fixed:** the line is _"has the
   provider made something yet"_, and Gate 2 lists both sides of it for all four ports.
3. **The six-call bound was going to leak the same way the budget does, and nothing said so.** `imageCallCount`
   reads one table; a lost call would have counted for nothing and a run could have paid for eight pictures.
   **Fixed:** check 6, and the verified-features list.
4. **Nothing said what must NOT be retried.** A feature that adds a retry beside a feature that records paid calls
   has to say that the paid ones are not sent again. **Fixed:** check 9, and Gate 2's two sentences.
5. **A model receipt's cost is zero, and the first draft read as though the row carried money.** **Fixed:** Gate 2
   says why the row exists anyway, and Deferred item 2 says what happens when a model call costs something.
6. **Check 4 did not say the error is rethrown unchanged.** Without it, the worker could swallow a `Spent` and let a
   run continue past a failure — the recording turning into a repair. **Fixed:** the check says rethrown unchanged,
   and that the stage still fails the run.

**Considered, not findings:** `Unavailable` moving packages, which keeps its name and its meaning; naming the class
`Spent` beside `spentCents`; the narration port's `Spent` not costing a take; `lost_call` carrying a request id
nothing reads yet.
