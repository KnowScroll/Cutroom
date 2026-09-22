# 046 — paid-path: the two gaps, then the reel that passes Gate 7

- **For:** session 46
- **Feature:** `paid-path` — [`docs/features/paid-path.md`](../docs/features/paid-path.md)
- **Work:** the six owed journeys, then **B** (the two gaps, free), then **A** (the reel, ~200¢). **C is
  held.**
- **Written:** 2026-09-22, at the end of session 45
- **Run:** session 46, 2026-09-22

**Session 45 made the reel and the engine refused it.** Fifteen attempts, twelve blockers, **S-130 to
S-140**, about **$4.09**. The last run — `ffbd04b5-a00f-4675-bb67-36e90f69c417` — planned four shots, took
three canonical pictures through Gate 1 and Gate 1S, spoke four narrations, bought five clips through Gates 2
to 5, assembled `a1-render.mp4` with ffmpeg, and then **Gate 7 answered no to _"Does every shot show
something no other shot repeats?"_** — **202¢ against a 250¢ ceiling and an estimate of 155–210¢**.

**The owner's decision, 2026-09-22: B first, then A, and C is held for later.** The reason is the order's
whole point: **A costs ~200¢ every time it is tried, and B is what makes that 200¢ visible to the budget
guard.** A paid call that leaves no receipt is spend the guard reads as zero, and A is the only thing in this
repository that spends at that scale.

---

## 0 — the six journeys, owed

Session 45 started `node scripts/journey.mjs reel-stills` at `4825530` and **the harness stopped it because
the machine was low on memory** — not a journey failure. Nothing was written: the tree was clean afterwards
and no evidence, status or divergence line moved. The other five were never started.

**Run all six before anything else, ONE AT A TIME rather than together** — running them together is what ran
the machine out of memory. `paid-path`, `reel-stills`, `reel-plan`, `reel-render`, `reel-takes`,
`reel-contract` (S-099's form). Never type the evidence, the status or the divergence by hand.

**Known fragility, recorded in session 41 and still unresolved:** `reel-render`'s check 50 runs its whole
journey four files at a time with a 300 s bound (S-107). Measured alone it takes 97 s; inside a loaded suite
it was killed at 300 s once. If it fails, **run it alone before concluding anything, and do NOT raise the
bound** — that would be a fourth change to a verified feature, which paid-path's own _"What this feature
changes in verified features"_ exists to prevent.

---

## B — the two gaps. No reel is made and nothing is spent

Both were named in session 45 and neither was closed. **They are the same shape twice: a call that happened,
and a run that cannot carry on from it.**

### B1 — a call that completes and then fails to parse leaves NO RECEIPT (S-133)

`structured` and `generate` both build their receipt **after** the answer is parsed, so a call that answered
200 and then failed a schema leaves no row at all. **Two image calls in session 45 did exactly that** — one
on `width: null`, one on seedream's refused frame — and both are real calls fal may have billed.

**Why it matters, and it is not bookkeeping.** The budget guard reads the chain's spend **from the receipts**
before every call and every send, and compares it with the cap and then the ceiling (S-059, S-087, S-095).
**A paid call that leaves no row is spend the guard reads as zero.** Under the token plan the model calls
cost nothing, so nothing was lost in session 45; at A's scale it is 200¢ a run.

**The shape of the fix is NOT settled and is this session's to decide**, with an `S-` entry naming what was
rejected. What is already fixed and must not be broken: **`packages/providers` holds no durable state**, so
an adapter cannot write the row itself — the receipt has to reach the worker, which is the only place that
knows both a stage and a table. One candidate is a typed error that CARRIES its receipt, the way `Unavailable`
carries its classification (S-122); there will be others. Put the choice to the owner with `AskUserQuestion`
if the alternatives are real.

### B2 — the model port has no transient retry (S-137)

Every other port has one (S-096). `packages/providers/src/transient.ts` says in as many words that the
counter and the backoff are the worker's guarded ports', and that **for the model port it is not built**.
**A timeout on any model call stops the run outright**, and the later the call, the more it has already
spent — session 45 had exactly that at 180 s, before S-137 raised the timeout to 600 s. A run that timed out
after the stills stage would lose its pictures.

### What B has to settle before it writes code

**Gates before code.** `docs/features/paid-path.md` has eight slices and every check from 1 to 22 assigned to
one of them. B is neither trivial (it crosses `contracts`, `providers`, `domain` and `apps/worker`) nor
covered by an existing slice. **So the first thing B does is decide where it lives** — a Slice 9 of
`paid-path` with new checks, or a feature of its own with its four gates — and that decision is itself an
`S-` entry. Do not open an implementation file before it is settled.

---

## A — the reel that passes Gate 7. ~200¢ a try

**Only after B is committed and green.** Gate 7 judges the FINISHED cut, so it cannot be reached without
buying the clips: **a failed attempt costs the full ~200¢**, where every Gate 1 failure in session 45 cost
15¢.

What session 45 learned about writing this brief, every line of it from a refusal:

- **A criterion violated by satisfying another criterion cannot be met by any picture.** `show-keeper`
  required a lighthouse keeper while `never-person` forbade "any real living person".
- **A subject that does not fit a vertical frame is clipped, every time.** "a shelf of bound volumes".
- **Saying "seen whole within the frame" in a criterion makes it STRICTER, not the framing looser** — it
  becomes part of what the criterion requires.
- **And the one that stopped the finished reel: four shots on one subject repeat one another**, whatever the
  criteria say. Gate 7 asked whether every shot shows something no other shot repeats, and four shots of a
  keeper, a logbook and bound volumes do not.

**What has not been tried is a brief whose four units are genuinely different scenes** — different place,
different object, different time of day — so that "something no other shot repeats" is true of the cut by
construction rather than by luck. The narration is the caller's to write and lives in
`scripts/real-reel.mjs`; changing it is S-134's kind of change, in the caller's request, with **no gate, no
check and no policy touched**.

---

## C — held

`parallel-shots` (S-115) now has the figures it was waiting for — the whole run **795.4 s**, one clip
**21.2 s to 111.1 s** speech-receipt to video-receipt, the plan stage **116.3 s**. **The owner is holding it
for later.** Do not start it, and do not fold any of it into B: B2 touches the guarded ports and S-115 names
the budget guard racing as the first thing concurrency costs here, so the two must not be done in one
feature.

---

## What is owed whichever is done

**Three figures, and none of them is in a receipt**, because every cent session 45 recorded is **our
configured rate applied to what we asked for**:

1. **D-007's Q9, the observed video rate, IS STILL OPEN.** One read of fal's dashboard beside run
   `ffbd04b5-a00f-4675-bb67-36e90f69c417` closes it. **Owed upstream** (D-115, S-017). **It needs the
   owner's account, not this session's.**
2. **Whether a failed call bills** — Gate 2 says this is read, never assumed, and it was not read. The same
   dashboard read answers it, against the two image calls that left no receipt. **B1 is worth doing whatever
   the answer is**, because the guard cannot see a row that does not exist either way.
3. **The corrected image rate is TWO figures**: flux came to **5¢ on the text wire and 8¢ on the edit wire**
   — S-128's two wires showing up in the money. BUDGET.md records one figure per entry. **Owed upstream.**

And one line worth putting to the owner, not owed: **seedream's 1920x3416 is within Gate 2's 0.01 tolerance
and is refused by the stills adapter's exact rule.** Both are deliberate (D-028 judges the produced frame
because the requirement fails silently), and nothing says so in one place.

Paste everything inside the block below as the session's first message.

```text
Work on paid-path, in this order: the six owed journeys, then B (the two gaps), then A (the reel that passes
Gate 7). C — parallel-shots — is HELD by the owner: do not start it. Everything is written out in
PROMPTS/046-paid-path-gaps-then-gate-7.md.

The owner's reason for this order, 2026-09-22: A costs about 200c every time it is tried, and B1 is what
makes that 200c visible to the budget guard. Do not run A until B is committed and green.

WHAT IS ALREADY SETTLED, so do not ask any of it again:
- Both keys are in .env and both work. The MiniMax one is the Token Plan SUBSCRIPTION key (S-129). Never
  print a key and never read .env to show one — a service's own refusal names the KEY NAME, never its value.
- The image entry is fal-ai/flux-2-pro/edit, named with CUTROOM_FAL_IMAGE_MODEL. SEEDREAM IS ANSWERED AND THE
  ANSWER IS NO: asked for 864x1536 it produced 1920x3416, and check 12 refused it (S-133). Do not run on it.
- The voice is English_Graceful_Lady.
- THE CEILING IS 250 CENTS. It is a constant in scripts/real-reel.mjs that --ceiling can only lower. A run
  that would exceed it is stopped by the budget guard, and that is the guard working (S-059, S-095).
- A run that reaches the video stage costs about 200c. A run that fails at Gate 1 costs about 15c. Gate 7
  judges the FINISHED cut and cannot be reached without paying for the clips.

Start:
1. `node scripts/decisions.mjs`. If it says commits are unpushed in the steering repository, say so and stop.
2. Read CLAUDE.md; then JOURNAL.md's session 45 entry IN FULL — it is what this session continues, and its
   "The figures" section is what is owed upstream.
3. Read DECISIONS.md's S-130 to S-140. S-133 and S-137 are the two gaps B closes; S-130 and S-139 are the two
   that explain why this engine's answers parse at all.
4. `node scripts/check.mjs` — confirm green before anything else.

0. THE SIX JOURNEYS, OWED. Session 45 started `node scripts/journey.mjs reel-stills` at 4825530 and the
   harness stopped it because the machine was low on memory — not a journey failure, and nothing was written.
   Run all six, ONE AT A TIME rather than together, since running them together is what ran the machine out
   of memory: paid-path, reel-stills, reel-plan, reel-render, reel-takes, reel-contract (S-099's form). Never
   type the evidence, the status or the divergence by hand. A FAIL is the finding: stop and report.
   KNOWN FRAGILITY: reel-render's check 50 runs its whole journey four files at a time with a 300 s bound
   (S-107) — measured alone it takes 97 s, and it was killed at 300 s once inside a loaded suite. If it
   fails, run it alone before concluding anything, and do NOT raise the bound.

B. THE TWO GAPS. No reel is made and nothing is spent.
   - GATES BEFORE CODE. B is not trivial — it crosses contracts, providers, domain and apps/worker — and no
     existing slice covers it. THE FIRST THING TO SETTLE is where it lives: a Slice 9 of paid-path with new
     checks, or a feature of its own with its four gates. That is itself an S- entry, and no implementation
     file is opened before it is approved.
   - B1: a call that completes and then FAILS TO PARSE leaves no receipt (S-133). `structured` and `generate`
     both build their receipt after the answer is parsed. Two image calls in session 45 answered 200 and left
     no row. The budget guard reads the chain's spend FROM THE RECEIPTS before every call (S-059, S-087,
     S-095), so a paid call with no row is spend it reads as zero. packages/providers holds no durable state,
     so an adapter cannot write the row itself — the receipt has to reach the worker. The shape of the fix is
     NOT settled; decide it, write the S- entry with what was rejected, and put it to the owner with
     AskUserQuestion if the alternatives are real.
   - B2: the model port has no transient retry (S-137). Every other port has one (S-096), and
     packages/providers/src/transient.ts says in as many words that for the model port it is not built. A
     timeout on any model call stops the run outright, and the later the call, the more it has already spent.

A. THE REEL THAT PASSES GATE 7. Only after B is committed and green.
   Gate 7 stopped session 45's finished reel with "the judge answered no to 'Does every shot show something
   no other shot repeats?'". Four shots of a keeper, a logbook and bound volumes repeat one another. What has
   NOT been tried is a brief whose four units are GENUINELY DIFFERENT SCENES — different place, different
   object, different time of day. The narration and criteria live in scripts/real-reel.mjs and are the
   CALLER'S request: changing them is S-134's kind of change, with no gate, no check and no policy touched.
   Three things session 45 learned the expensive way, all from refusals:
     - a criterion violated by satisfying another criterion cannot be met by any picture;
     - a subject that does not fit a vertical frame is clipped every time;
     - "seen whole within the frame" in a criterion makes it STRICTER, not the framing looser.
   Then: `node --experimental-strip-types --no-warnings scripts/real-reel.mjs --model fal-ai/flux-2-pro/edit
   --voice English_Graceful_Lady`, read the estimate before answering it, and type `spend 250`.
   A RUN THAT FAILS PARTWAY HAS ALREADY SPENT: read its receipts before running anything again.

How to work:
- Never weaken a check or a test to reach green. Session 45 found twelve blockers and weakened nothing: every
  fix was by addition, and every break campaign break was written from a FILE rather than through a shell,
  because CLAUDE.md's backslash trap has now fired in four consecutive sessions.
- Any choice between real alternatives becomes a written S- entry with what was rejected and how a violation
  is caught. Put it to the owner with AskUserQuestion when an assertion cannot hold as written.
- No test calls a provider, no test needs a key, and no npm dependency is added (S-111, S-114).
- No absolute path anywhere (D-086).

Finish:
- `node scripts/check.mjs` green, and the six journeys PASS.
- If a reel is made and PASSES Gate 7: tick Slice 8 and the "One real reel exists" Outcome line in
  docs/features/paid-path.md, and re-run the journeys the change touches. If it does not pass, leave them
  unticked and record what Gate 7 said — that is the finding, not an obstacle.
- A JOURNAL.md entry: intent; what changed; observed; next.
- Set this prompt's Run line in PROMPTS/046-paid-path-gaps-then-gate-7.md and in PROMPTS/README.md (S-065),
  and write PROMPTS/047. C — parallel-shots — is the standing candidate for it, and it now has its latency
  figures: the whole run 795.4 s, one clip 21.2 s to 111.1 s, the plan stage 116.3 s.
```
