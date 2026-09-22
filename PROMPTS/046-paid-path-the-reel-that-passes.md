# 046 — paid-path: the reel that passes Gate 7, and the two gaps session 45 named

- **For:** session 46
- **Feature:** `paid-path` — [`docs/features/paid-path.md`](../docs/features/paid-path.md)
- **Work:** the owner picks one of three; each is written out below
- **Written:** 2026-09-22, at the end of session 45
- **Run:** not yet

**Session 45 made the reel and the engine refused it.** Fifteen attempts, twelve blockers, **S-130 to
S-140**, about **$4.09**. The last run — `ffbd04b5-a00f-4675-bb67-36e90f69c417` — planned four shots, made
three canonical pictures through Gate 1 and Gate 1S, spoke four narrations, bought five clips through Gates
2 to 5, assembled `a1-render.mp4` with ffmpeg, and then **Gate 7 answered no to _"Does every shot show
something no other shot repeats?"_**, for **202¢ against a 250¢ ceiling and an estimate of 155–210¢**.

**So the engine is proven end to end on real providers, and the reel does not exist.** Read session 45's
`JOURNAL.md` entry whole before choosing — especially _"The figures"_, because **the provider's own figures
were never read** and three things are owed on that alone.

---

## The choice

### A — the reel that passes Gate 7

**One more brief, written so the four shots do not repeat one another**, and one run. Gate 7's question is
about the finished cut, so it cannot be answered before the clips are bought: **a failed attempt costs the
full ~200¢**, unlike every Gate 1 failure, which cost 15¢.

What session 45 learned about writing this brief, all of it from refusals:

- **A criterion that is violated by satisfying another criterion cannot be met by any picture.** "a
  lighthouse keeper" with "any real living person" forbidden.
- **A subject that does not fit a vertical frame is clipped, every time.** "a shelf of bound volumes".
- **Saying "seen whole within the frame" in a criterion makes it STRICTER, not the framing looser.**
- **And now: four shots on one subject repeat one another**, whatever the criteria say.

A brief whose four units are genuinely different scenes — different place, different object, different time
of day — is what has not been tried.

### B — the two gaps, which are the same shape twice

Neither was closed in session 45, both are named in its decisions, and **both are about a call that happened
and a run that cannot carry on from it**:

1. **A call that completes and then fails to parse leaves NO RECEIPT** (S-133). `structured` and `generate`
   both build their receipt after the answer is parsed. Two image calls in session 45 were made, answered
   200, and left no row. **The budget guard reads the chain's spend from receipts before every call**
   (S-059, S-087, S-095), so a paid call that leaves no row is spend the guard cannot see.
2. **The model port has no transient retry** (S-137). Every other port has one (S-096). `../transient.ts`
   says in as many words that for the model port it is not built. A timeout on any model call stops the run
   outright — and session 45 had one, at 180 s, before the timeout was raised.

This is the cheapest of the three: **no reel is made and nothing is spent.**

### C — `parallel-shots`, which now has its figures

S-115 deferred it until a real reel's latency existed. **It exists**: the whole run **795.4 s**, one clip
**21.2 s to 111.1 s** speech-receipt to video-receipt, the plan stage **116.3 s**. S-115 names the three
things concurrency costs here — the budget guard racing, event order asserted by name everywhere, and the
provider's own limits — and they have not moved.

---

## What is owed whichever is chosen

**Three figures, and none of them is in a receipt**, because every cent session 45 recorded is **our
configured rate applied to what we asked for**:

1. **D-007's Q9, the observed video rate, IS STILL OPEN.** One read of fal's dashboard beside run
   `ffbd04b5-a00f-4675-bb67-36e90f69c417` closes it. **Owed upstream** (D-115, S-017).
2. **Whether a failed call bills** — Gate 2 says this is read, never assumed, and it was not read. The same
   dashboard read answers it, against the two image calls that left no receipt.
3. **The corrected image rate is TWO figures**: flux came to **5¢ on the text wire and 8¢ on the edit wire**,
   which is S-128's two wires showing up in the money. BUDGET.md records one figure per entry. **Owed
   upstream.**

And, not owed but worth one line to the owner: **seedream's 1920x3416 is within Gate 2's 0.01 tolerance and
is refused by the stills adapter's exact rule.** Both are deliberate (D-028), and nothing says so in one
place.

Paste everything inside the block below as the session's first message, after replacing `<A, B or C>`.

```text
Work on paid-path: <A, B or C> from PROMPTS/046-paid-path-the-reel-that-passes.md. Session 45 proved the
engine end to end on real providers and Gate 7 refused the cut; this session does one of the three things
that prompt sets out.

WHAT IS ALREADY SETTLED, so do not ask any of it again:
- Both keys are in .env and both work. The MiniMax one is the Token Plan SUBSCRIPTION key (S-129). Never
  print a key and never read .env to show one — a service's own refusal names the KEY NAME, never its value.
- The image entry is fal-ai/flux-2-pro/edit, named with CUTROOM_FAL_IMAGE_MODEL. Seedream is ANSWERED and the
  answer is no: asked for 864x1536 it produced 1920x3416 and check 12 refused it (S-133). Do not run on it.
- The voice is English_Graceful_Lady.
- THE CEILING IS 250 CENTS. It is a constant in the script that --ceiling can only lower. A run that would
  exceed it is stopped by the budget guard, and that is the guard working.
- A run that reaches the video stage costs about 200c. A run that fails at Gate 1 costs about 15c. Gate 7
  cannot be reached without paying for the clips.

Start:
1. `node scripts/decisions.mjs`. If it says commits are unpushed in the steering repository, say so and stop.
2. Read CLAUDE.md; then JOURNAL.md's session 45 entry IN FULL — it is what this session continues, and its
   "The figures" section is the part that is owed upstream.
3. Read DECISIONS.md's S-130 to S-140. S-139 and S-130 are the two that explain why this engine's answers
   parse at all; S-133 and S-137 are the two gaps.
4. `node scripts/check.mjs` — confirm green before anything spends.

How to work:
- Never weaken a check or a test to reach green. Session 45 found twelve blockers and weakened nothing; every
  fix was by addition, and every break campaign break was written from a FILE rather than through a shell,
  because the backslash trap has now fired in four consecutive sessions.
- Any choice between real alternatives becomes a written S- entry with what was rejected and how a violation
  is caught. Put it to the owner with AskUserQuestion when an assertion cannot hold as written.
- No test calls a provider, no test needs a key, and no npm dependency is added (S-111, S-114).
- No absolute path anywhere (D-086).
- A run that fails partway HAS ALREADY SPENT: read its receipts before running anything again.

Finish:
- `node scripts/check.mjs` green.
- If a reel is made and PASSES: tick Slice 8 and the "One real reel exists" Outcome line in
  docs/features/paid-path.md, then run the six journeys (S-099's form): paid-path, reel-stills, reel-plan,
  reel-render, reel-takes, reel-contract. Never type the evidence, the status or the divergence by hand.
  KNOWN FRAGILITY: reel-render's check 50 runs its whole journey four files at a time with a 300 s bound
  (S-107) — measured alone it takes 97 s, and it was killed at 300 s once inside a loaded suite. If it fails,
  run it alone before concluding anything, and do NOT raise the bound.
- A JOURNAL.md entry: intent; what changed; observed; next.
- Set this prompt's Run line and write PROMPTS/047.
```
