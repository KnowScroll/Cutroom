# 047 — the observation's second ask, gates first; then the reel with one recurring subject

- **For:** session 47
- **Feature:** a new one — the second ask (S-146) — and then `paid-path`'s Slice 8
- **Work:** **B** (the gates and the code for asking an unparseable observation again, free), then **A** (the
  reel, ~200¢). **`parallel-shots` is still held.**
- **Written:** 2026-09-22, at the end of session 46
- **Run:** not yet

**Session 46 closed the two gaps and made the reel, and the reel died somewhere new.** `paid-failures` is
built and verified — a call that has already spent leaves its row, and the model port has the transient
counter every other paying port had. Then the reel ran: **152¢, no picture at all, and a failure at the last
shot's Gate 5.**

**The owner's two answers, 2026-09-22, with the figures in front of them (S-146):**

1. **An unparseable observation is asked again ONCE.** Measured at zero cost on the clip that killed the run:
   an answer outside a rendered closed set in **2 of 14** calls as shipped, **1 of 12** with the sets also
   said in the question (S-144). The draws look independent, so one retry takes a four-clip run's chance of
   dying there from about **one in three to about one in fifty** — and it buys nothing, because model calls
   are plan-covered (S-129).
2. **The next brief keeps one subject recurring across two of its four shots**, with the four scenes still
   different in place, object and hour (S-145).

---

## B — the second ask. Gates before code, and nothing is spent

**It breaks a written rule, which is why it needs gates.** S-096 says an adapter never sends again, and it
says so for reasons that do not hold here: a model call costs nothing under the Token Plan, and the thing a
retry would hide — how often this wire answers outside a rendered set — is now measured and written down
(S-144). **That argument belongs in a Gate 2, read by an adversarial reviewer, not in a commit message.**

**The first thing to settle is where the retry lives**, and it is a real choice:

- **a new arm on the model port** — `packages/contracts` and `packages/providers`, the adapter parsing its
  own rendered shape and asking again; or
- **the stage that parses** — `packages/pipeline`, which is a **verified feature**, so `reel-stills`' and
  `reel-render`'s journeys re-run.

Put it to the owner with `AskUserQuestion` if the alternatives are real, and write the `S-` entry with what
was rejected before any implementation file is opened.

**What must not move.** The closed sets stay exactly as they are — widening one so an answer passes is the
weakening this repository never does (S-144's first rejected option). A near-miss is not normalised into a
value. And the second ask is **once**: a third is a loop with a provider's bad day at the end of it.

---

## A — the reel, with one recurring subject. ~200¢ a try

**Only after B is committed and green.** The brief lives in `scripts/real-reel.mjs` and is the caller's
request: changing it is S-134's kind of change, with no gate, no check and no policy touched.

**What session 46 learned, and it is the whole reason the brief changes again.** Its four units were
genuinely different scenes — which is what Gate 7's refusal asked for — and **four different scenes share no
subject**, so D-027's ladder had nothing to carry: `stage.started stills` and `stage.finished stills` in the
same instant, **0 image calls**, four clips bought on **text-to-video**, and a reel made from words. Gate 7
wants no repetition; the stills stage exists to carry identity ACROSS shots. **One subject in two of the four
shots is the compromise neither run has tried**: the stills stage runs, Gate 1S has something to compare, and
the cut still shows four different things.

Everything session 45 learned about writing this brief still holds, and each line of it came from a refusal:

- a criterion violated by satisfying another criterion cannot be met by any picture;
- a subject that does not fit a vertical frame is clipped, every time;
- _"seen whole within the frame"_ in a criterion makes it STRICTER, not the framing looser;
- four shots on one subject repeat one another, whatever the criteria say.

Then: `node --experimental-strip-types --no-warnings scripts/real-reel.mjs --model fal-ai/flux-2-pro/edit
--voice English_Graceful_Lady`, read the estimate before answering it, and type `spend 250`. **A run that
fails partway has already spent: read its receipts before running anything again** — and since
`paid-failures`, a call that answered and could not be used has a row of its own in `lost_call`.

---

## What is owed whichever is done

1. **D-007's Q9, the observed video rate, IS STILL OPEN.** One read of fal's dashboard beside run
   `ad65acbe-4084-499d-ad86-03f364470eed` (152¢ by our own arithmetic) closes it. **Owed upstream** (D-115,
   S-017), and it needs the owner's account.
2. **Whether a failed call bills** — still read, never assumed, and still unread.
3. **The corrected image rate is TWO figures** — flux at 5¢ on the text wire and 8¢ on the edit wire (S-128).
   BUDGET.md records one figure per entry. **Owed upstream.**

Paste everything inside the block below as the session's first message.

```text
Work in this order: B (the second ask, gates first, nothing spent), then A (the reel with one recurring
subject, ~200c). parallel-shots is HELD by the owner: do not start it. Everything is written out in
PROMPTS/047-second-ask-then-the-reel.md.

WHAT IS ALREADY SETTLED, so do not ask any of it again:
- Both keys are in .env and both work; the MiniMax one is the Token Plan SUBSCRIPTION key (S-129). Never
  print a key and never read .env to show one.
- The image entry is fal-ai/flux-2-pro/edit, named with CUTROOM_FAL_IMAGE_MODEL. Seedream is answered and the
  answer is no (S-133). The voice is English_Graceful_Lady.
- THE CEILING IS 250 CENTS, a constant in scripts/real-reel.mjs that --ceiling can only lower.
- The owner decided on 2026-09-22 (S-146): an unparseable observation is asked again ONCE, and the next
  brief keeps one subject recurring across two of its four shots.

Start:
1. `node scripts/decisions.mjs`. If it says commits are unpushed in the steering repository, say so and stop.
2. Read CLAUDE.md; then JOURNAL.md's session 46 entry IN FULL.
3. Read DECISIONS.md's S-141 to S-146. S-144 is the measurement the retry answers to; S-142 and S-143 are
   what `paid-failures` built; S-145 is why the brief changes again.
4. `node scripts/check.mjs` — confirm green before anything else.

B. THE SECOND ASK. Nothing is spent.
   - GATES BEFORE CODE. It breaks S-096's "an adapter never sends again", and the argument for breaking it
     belongs in a Gate 2 an adversarial reviewer reads. THE FIRST THING TO SETTLE is where the retry lives: a
     new arm on the model port (contracts + providers), or the stage that parses (packages/pipeline, a
     VERIFIED feature whose journeys then re-run). That is itself an S- entry.
   - The retry is ONCE. The closed sets do not move, and a near-miss is never normalised into a value:
     widening a set so an answer passes is the weakening this repository does not do.

A. THE REEL. Only after B is committed and green.
   The brief in scripts/real-reel.mjs is the CALLER'S request (S-134). Give it one subject that recurs across
   two of its four shots, and keep the four scenes different in place, object and hour. Four different scenes
   share no subject, and session 46 measured what that does: the stills stage ran in 0.0s, made 0 pictures,
   and every clip was bought text-to-video — a reel made from words for 152c.
   Then: `node --experimental-strip-types --no-warnings scripts/real-reel.mjs --model fal-ai/flux-2-pro/edit
   --voice English_Graceful_Lady`, read the estimate, type `spend 250`.
   A RUN THAT FAILS PARTWAY HAS ALREADY SPENT: read its receipts, and its lost_call rows, before running
   anything again.

How to work:
- Never weaken a check or a test to reach green. Every fix by addition.
- Any choice between real alternatives becomes a written S- entry with what was rejected and how a violation
  is caught. Put it to the owner with AskUserQuestion when the alternatives are real.
- No test calls a provider, no test needs a key, and no npm dependency is added (S-111, S-114).
- No absolute path anywhere (D-086). Every break written from a FILE rather than through a shell — the
  backslash trap has now fired in five consecutive sessions, three times in session 46 alone.

Finish:
- `node scripts/check.mjs` green, and the journeys the change touches PASS.
- If a reel is made and PASSES Gate 7: tick Slice 8 and the "One real reel exists" Outcome line in
  docs/features/paid-path.md. If it does not, leave them unticked and record what stopped it — that is the
  finding, not an obstacle.
- A JOURNAL.md entry; this prompt's Run line set here and in PROMPTS/README.md (S-065); and PROMPTS/048.
```
