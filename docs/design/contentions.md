---
status: draft — live register, updated as decisions land
authority: none until ratified
date: 2026-09-10
project: KnowScroll video generation (harness working name: Cutroom)
scope: Design only. No implementation and no paid generation authorized by this document.
---

# Contentions

The companion to `VideoGenerationFlow.md`. That file records **what was decided**. This one
records **what must never break**, **what is still genuinely open**, and **what will bite us**.

Three registers:

- **§1 Invariants** — hold regardless of which way any open question goes. Breaking one is a bug,
  not a trade-off.
- **§2 Contentions** — real forks. Both directions are defensible; the choice is not made.
- **§3 Traps** — live hazards. Known, unfixed, easy to walk into.
- **§4** — the full cost and latency model behind every number quoted anywhere else.

---

## 1. Invariants

Numbered `I-n`. If a design change violates one of these, the design change is wrong.

### Money

**I-1 · The per-reel cap is enforced before spend, never reported after.**
$3.00 all-in, refused at pre-flight, with a question written to `QUESTIONS.md`. D-014. The
worker refuses the job; it does not overspend and apologise.

**Amended by D-076 (2026-09-12): "all-in" no longer includes research.** Research spend sits in a
**second envelope** with its own per-reel and per-day ceilings, refused pre-flight by the same
mechanism. The reason is that the two are different kinds of number: generation cost is a function
of a plan and is estimable before it happens, which is what makes this invariant possible at all;
research cost is a function of what the material turns out to need. **D-014's $40 seed total and
$10/day still bind both envelopes together at the top**, so "separate" never means "unbounded".

**I-2 · The per-reel cap binds before any per-shot cap does.**
At $0.32 per 8 s clip take, a reel affords roughly two clip retries *in total across all
shots*. The per-shot cap of 3 would permit ten. Any design that reasons about affordability
from the take cap is reasoning from the wrong control.

**I-3 · A shot costs the same with or without a keyframe.**
Both `text-to-video` and `image-to-video` bill at $0.04/s. A keyframe is pure addition. It is
therefore never bought to save clip cost — only for consistency and for the cheap kill.

### Honesty

**I-4 · Degradation is recorded or it does not happen.**
`BUDGET.md`: the system "never silently degrades quality". A still-hold, an
`accept_with_label`, a dropped shot — each is labelled on the shot, in the verdict, in the
receipt, and queryable afterwards. Degradation that is logged is a decision. Degradation that
is not is a lie.

**I-5 · `accept_with_label` cannot rescue a failed `mustShow`.**
A label fixes framing, not substance.

**I-6 · Coverage is recorded on every verdict.**
A witness that sampled 8 frames says so. "Passed" means the configured gates passed within
their stated limits — never more.

### Gates

**I-7 · Deterministic sensors run before model judgment, and that is correctness, not
optimization.**
Multimodal judges score under 10% on fine-grained artifact detection (47.5% best model vs
87.7% human; `research/03-*` Part 4). Duration, resolution, fps, black frames, frozen
stretches, loudness and silence come from ffprobe and ffmpeg filters and **never** through a
model. The model is asked only closed semantic questions.

**I-8 · The witness is blind.**
It never sees the brief. It reports what it observes; a separate brief gate compares
observation against criteria. A witness that knows what it is looking for will find it.

**I-9 · Acceptance criteria are written before generation.**
`mustShow`, `mustNotShow`, `textPolicy`, `audioPolicy`, `duration`, `camera` are authored at
plan time, executed by gates afterwards. This is the only honest transfer of test-first, and it is
what keeps I-8 possible.

**Amended by D-034 (2026-09-11): "by the planner" was too loose.** The **epistemic layer** authors
`mustNotShow` and the claim-derived `mustShow` (computed from the script, not hand-written twice)
*before* planning runs; the **cinematic layer** authors `camera`, `duration` and framing and may
**add** criteria but never weaken one. If the layer that writes a shot also wrote its grading, weak
criteria would pass forever and nothing would detect it — I-8's blind witness protects the
*observation*, not the *standard*.

**I-10 · Never generate wave N+1 from an ungated wave N.**
The gate between waves is what stops a bad canonical from being multiplied into derived
keyframes that must then be thrown away. It is also why a canonical failure costs one repair
call rather than a cascade.

**I-15 · One vision call per generated image, and everything downstream cites it.**
Established by D-045, and the same rule D-033 already applied to prompt composition. The witness
looks once; the scorer reads that verdict, the reconcile step reads that verdict, the clip prompt
is composed from that verdict. A second pass over one image produces a second record that can
disagree with the first, with no rule for which wins. Two consequences that are easy to lose:
Gate 1's verdict must carry its `WitnessObservation` on **`accept`**, not only on failure (D-041),
and Gate 1's witness runs at **temperature 0**, because D-031 rule 5 requires the score built from
it to be replayable.

**I-16 · A gate rejects; a score ranks. Neither does the other's job.**
Established by D-046. A veto that zeroes a score is a rejection wearing a ranker's costume, and it
was reachable as a bug: two vetoed candidates both scored 0, 0 vs 0 is a tie, and D-031 rule 4
resolves ties as *first-generated wins* — so a vetoed image could become the canonical and
propagate into three of five shots. The score now contains **no term that can reject anything**,
which is what makes D-031 rule 2 ("the score ranks; it never admits") literally rather than nearly
true. Any future rule about thresholds or ties inherits this: if it can reject, it belongs in a
gate.

**I-17 · A provider's output is measured, never inferred from the request that produced it.**
Established by D-055, and D-019 already paid for it once: `image-to-video` has no `aspect_ratio`
field, which D-019 calls *"the trap that would have shipped a 16:9 clip into a 9:16 product"* —
an assumption about output geometry drawn from an input parameter. The general form is worse than
that instance, because **`fps` exists on no fal H3 endpoint** and the output frame rate is
documented nowhere: there is no request field to be wrong about, only a number we would have
invented. Geometry, frame rate, sample rate, channel layout and duration come from ffprobe of the
file. The failure this prevents is the silent kind — the reel still plays.

**I-18 · Nothing is bought after assembly begins.**
Established by D-058. I-1 enforces the per-reel cap **before** spend, which is only meaningful if
the reel's cost is known by then. A gate downstream of assembly that can order a new take makes the
final cost a function of a judgment made after the money is gone, and makes the pre-flight estimate
a fiction. Gates 7 and 8 repair with edit ops or they fail the reel. This is the same shape as I-10
read backwards: I-10 forbids generating from an ungated wave, I-18 forbids generating after the
last gate.

**I-19 · A rule that must hold on every provider call is refused at the boundary, not remembered at each call site.**
Established by D-071. D-008's negative audio block and the explicit `aspect_ratio: 9:16` on
`text-to-video` are both mandatory and both **silent** when missing: the call succeeds, the output
generates, and only the result is wrong. D-019 records the second one as *"the trap that would have
shipped a 16:9 clip into a 9:16 product"*. A template in the compiler holds until someone adds a
call site — a repair, a retry, a Phase 2 branch — and a test holds only for the paths the test knows
about. One validator that every outgoing call passes is the only version of this that survives code
nobody has written yet.

**I-20 · Planning may fork; generating may not.**
Established by D-061. Two storyboards are planned because a plan call is ~$0 and the plan is the
earliest point a reel can be wrong. **Exactly one of them generates anything.** The moment a fork
survives past L2 it multiplies image calls against Config A's four-call plan and six-call ceiling
(D-027), which D-048 has already spent one reserve slot of. Any future selection point inherits this
shape: fork where it is free, converge before it is not.

### Structure

**I-11 · Provider transient errors never decrement the take cap.**
A 500 is not a bad picture and is often unbilled. Transient failures retry on `maxAttempts`
with backoff, on their own counter.

**I-12 · Never cut a shot to fix a failure.**
Narration is a separate T2A track (D-008). Removing picture desynchronises every downstream
beat from the audio. That is a broken reel, not graceful degradation.

**Its mechanism is narrower than its text after D-057 (2026-09-12), and the rule stands.** Narration
is now generated **per shot** and no narration unit spans a shot boundary, so removing a shot no
longer desynchronises the audio of the shots after it — it changes the *ordering* and drops the
words that shot carried. That is still a broken reel: the script is claim-referenced, and dropping a
shot drops sentences that cite sources. The prohibition is unchanged; only the reason it gives is
now the smaller of two. **Tail-trimming a clip to its narration's length is not this** — it removes
no content, and D-057 makes it the ordinary case rather than a repair.

**I-13 · Props and subjects are declared in the plan, never created at generation time.**
A shot that mints a keyframe mid-run and offers it to the pool cannot help shots that already
generated. Everything is named in L1's manifest and deduped there.

**I-14 · Nothing epistemic enters the harness.**
Claims, sources, truth states and exposure stay in KnowScroll, reaching the harness only as
opaque metadata plus the `ks:epistemic` gate plugin. Otherwise every future consumer inherits
KnowScroll's epistemology.

**Restated by D-034 (2026-09-11): this is a boundary between two layers of one engine, not between
two products.** C-11 is parked — the harness may never be extracted — so the invariant is enforced
by `pnpm drift` inside this repo, the same mechanism `CLAUDE.md` already uses for
`apps/api → providers`. It holds either way C-11 falls, and the seam is pre-cut if extraction ever
happens.

---

## 2. Contentions

Numbered `C-n`. Each states the fork, both sides, and what would settle it.

### C-1 · How many canonical keyframes — and does the 6-call cap survive it?

**RESOLVED for Phase 1 by D-027 (2026-09-11): Config A.** Phase 2 remains open. The cap stays at 6.

**The fork.** One canonical (Config A) or two (Config B).

**For one.** Cheapest ($2.20 best case), and the only keyframed config whose worst case leaves
room for **two** clip retries. Single source of truth is simpler to reason about.

**For two.** Same latency — 41 s either way, because the second canonical sits inside an
existing wave. $0.30 buys a second independently pinned subject at zero time cost.

**The problem.** Config B's worst case needs **7 image calls against a cap of 6** (see T-1). It
is only safe when nothing fails.

**What settles it.** Either the cap moves to 8, or B is ruled out, or B is allowed with an
explicit "no repair available" acceptance. Undecided.

### C-2 · Price-optimal and time-optimal are different answers — build one or both?

Phase 1 seeds generate **offline** (D-015), so latency is free and price wins outright:
Config A. Phase 2 branches are on-demand, where 41 s versus 19 s is the difference between a
feed that flows and one that stalls.

**The fork.** Commit to one policy across both phases, or carry two and switch.

**For one.** Half the implementation, half the surface to keep straight.

**For two.** Each phase gets the policy its actual constraint demands, and neither is
compromised for the other.

**What settles it.** Real latency histograms, which do not exist. Everything currently known
about timing rests on **one 7-second sample**.

### C-3 · `reference-to-video` is parked, not dead

The endpoint that treats an image as a loose reference rather than as frame 1 does exactly what
"pass the look on to other cuts" wants. Ruled out on arithmetic: $0.08/s puts a 40 s reel at
$3.20 before any keyframe, plus unquantified token-billed refs, and it is off D-007's path.

If the per-reel cap ever rises, or if h3-max pricing moves, this reopens and changes the shape
of S-5 and S-6 substantially. Recorded so a later session knows it was priced out rather than
overlooked.

### C-4 · Max depth 2 — proposed, not confirmed

**CONFIRMED by D-038 (2026-09-11), for Phase 1.** Canonical at depth 0, derived at depth 1, no
grandchildren — which is what Config A already is, so binding it costs nothing. **Cost scales with
count, latency with depth** (§4.5): a sibling keyframe is +$0.15/+0 s, a *level* is +$0/+~9 s, and
D-027's four-call budget has no room for a third. It also compounds **T-8** — a frame two hops out
inherits the canonical's untested reference quality twice, through an intermediate never checked
for it. Phase 2 left open.

Every keyframe is a root or a direct child of one root; no grandchildren. Caps latency at two
image waves and caps invalidation blast radius at one level.

**Against it.** A genuine three-level dependency (scene → character in scene → character in
scene mid-action) would have to be flattened, possibly losing fidelity.

**What settles it.** The owner. Proposed 2026-09-10, unanswered.

### C-5 · Does a repair call come out of the 6?

If the canonical fails best-of-2 and needs an informed third call, that call has to be paid for
somewhere. If it comes from the 6, planning all six leaves zero room to repair anything.

**Option.** Plan ≤5, hold 1 in reserve. Six stays the hard ceiling, five is the planning budget.

**Problem with it.** The same single reserve slot has to cover *both* a consistency repair and
a both-failed canonical. It can only cover one.

**RESOLVED by D-027 (2026-09-11).** Config A plans 4, not 5, so two slots are held, not one —
one for a both-failed canonical, one for a consistency repair. The "can only cover one" problem
was an artefact of a 5-call plan. Reopens if Phase 2 takes a config that plans 5 or 6.

**REOPENED IN PHASE 1, AND RESOLVED AGAIN BY D-048 (2026-09-11).** The line above named the wrong
phase. **D-037 was ratified after D-027** and adds +1 image call to any reel declaring a discrete
state change, so such a reel plans **5 in Phase 1** and holds **one** slot — exactly the option
rejected here, with exactly the problem stated against it. Neither decision was wrong alone; their
interaction was never priced. **D-048 gives the canonical repair first claim on the reserve**, on
the grounds that a both-failed canonical fails the whole reel (D-047) while an unfunded consistency
repair degrades one derived frame. What happens to that unfunded consistency repair is the live
remainder, deliberately left to its own entry.

### C-6 · Within-shot state change: prompt-driven or FLF2V?

A change across a cut costs a keyframe. A change inside one shot costs a sentence in the motion
prompt — or, with tighter control over the end state, a first-and-last-frame call.

FLF2V is **unverified on our endpoint** (D-019 records only `text-to-video` and
`image-to-video` for h3-turbo). One check settles whether this fork exists at all.

**RESOLVED by D-037 (2026-09-11): FLF2V, for discrete changes.** The check was run —
`fal-ai/minimax-h3-turbo/image-to-video` **does** expose `end_image_url`, so the fork is real
(O-15; D-019 was incomplete). A shot whose brief requires a visible **discrete** change pins both
ends at one extra image call; prompt-driven change stays the path for **continuous or ambient**
movement with no before-and-after to pin.

**The deciding argument is verifiability, not cost.** With a prompt-driven change the witness sees
the end state and **cannot confirm the start state was ever shown** — a clip that simply opens on
a broken vase passes a gate looking for a broken vase. Pinning both ends makes the change checkable
by construction: both frames are gated before any video exists, and the clip only has to carry the
transition.

**It also does T-2's job.** A declared FLF2V pair *is* the declaration of an intended difference,
so the set-consistency gate excludes it rather than needing a second schema field for the same
fact. This is §4.2's Config C, confirmed rather than hypothesised.

### C-7 · How much should the two best-of-2 prompts differ?

**RESOLVED by D-032 (2026-09-11).** Both prompts are **two renderings of one L1 manifest entry**:
identical on every field the manifest constrains, varying only where it is silent, and only along
**one axis declared in the manifest entry** (a `varyOn` field; framing expected). An entry without
a declared axis fails schema validation. This replaces the judgement below — "small variation is
probably right" — with something a test can check: drifting into two *ideas* is exactly a prompt
violating the manifest. The declared axis also guarantees the variation lands where **D-031's
score can see it**, which is what stops the score sorting noise. Same mechanism as **T-2**: the
manifest states what is supposed to differ, everything else is held. Costs $0 — plan calls are
free. **Still open:** which axis is the right default is unmeasured; who renders the prompts is
O-2/O-3.

**Scope narrowed by D-030 (2026-09-11):** best-of-2 now runs on the **canonical only**, so this
is one decision per reel rather than one per shot. **Paired with O-16** — C-7 asks how the two
candidates should differ, O-16 asks what picks between them, and neither is answerable alone: a
criterion that cannot see the axis the prompts vary on selects at random.

Identical prompts risk both candidates failing the same way — which is the failure mode
best-of-2 cannot rescue. Deliberate variation lowers that risk at zero cost.

**But.** Vary too much and you are choosing between two *ideas* rather than the better
execution of one. For a canonical image that defines the look, small variation is probably
right; "probably" is doing real work in that sentence.

**A second half, added 2026-09-12 (D-062).** The plan layer now has the identical question. `planVaryOn` declares which axis the two storyboards differ on — `shotCount`, `order`, `canonicalSubject`, `angle` — and **which of those is the right default is equally unmeasured**. The two halves are likely not independent: a reel whose storyboards differ on `canonicalSubject` has already moved the thing D-032's image-layer `varyOn` would vary. Recorded as **O-21**.

### C-8 · Which image model, and the requirement it now carries

No decision exists anywhere. `BUDGET.md` pencils nano-banana-pro at $0.15/image and marks it
UNVERIFIED. S-6 attaches a hard requirement: **it must accept reference images**, or the whole
derive-from-canonical design collapses.

**NARROWED by D-028 (2026-09-11), not closed.** The model is now a registry with a configured
default, so this stopped being "which model forever" and became "which default first". All four
candidate rates are READ off fal and recorded in `BUDGET.md`; nano-banana-pro's $0.15 is
confirmed, and `nano-banana-2` turns out to be **$0.08** with the same 14 references and the same
explicit 9:16. D-028 also adds a **second** hard requirement S-6 did not notice: the model must
emit true 9:16, because `image-to-video` has no `aspect_ratio` field and a non-vertical
`image_url` yields a 16:9 video **with no error**. Seedream documents no 9:16 at all.

**What still settles it.** A bake-off, ~$1.06 across the three plausible candidates. Price no
longer separates them — flux beats nano-banana-2 by $0.11 a reel, a third of one clip take — so
the live question is identity retention, which is **M-1**, never measured.

### C-9 · "Reel type"

**CLOSED by D-039 (2026-09-11): dropped, not defined.** D-029 scoped keyframes **per reel**, which
was the phrase's only job. Defining it afterwards so the sentence containing it stays true is how
an undefined concept becomes load-bearing without anyone deciding it should. A format-preset
concept may be designed later on its own terms — D-036's join mode and D-033's camera enum are the
kind of fields it would carry.

The owner's scoping ruling was "per reel type or per reel, not per world". *Reel type* is not a
defined concept anywhere in the repo. Needs a definition or dropping.

### C-10 · Who pays for a reference shared across reels

**RESOLVED by D-040 (2026-09-11): the generating reel pays in full; reuse is $0.** "Charging a
shared asset fully to the first reel is wrong" — stated below — turns out to be the only option
pre-flight can actually compute: **amortising requires pricing a reel against reels that do not
exist yet.** The accounting is uneven and the constraint is not violated, because every reel still
passes its own $3.00 check (I-1), which is the invariant that matters. Accepted consequence: the
**first reel in a lineage is the most expensive**, and is refused if it alone breaches — correct
under a per-reel cap. **No conflict with D-029:** per-reel scoping exists because *unrelated* reels
go stale, while a branch is derived from its parent by construction and continuity down it is the
point.

Per-reel scoping mostly removes this, but a reference reused across reels in one branch lineage
still needs an owner. D-014's cap is per reel and pre-flight is per job; charging a shared asset
fully to the first reel is wrong and charging it to none is worse.

### C-11 · Which harness, if any, is adopted rather than built

Parked earlier in the same session. The forkable layer (session loop, event log, tool registry,
context assembly) lands in Phase 2; the layer Phase 0 and Phase 1 need — the Cut, the scheduler,
incremental render, gates, continuity — exists in no surveyed harness. pi is the best seam
candidate (MIT, TypeScript, `packages/agent` knows nothing about files or sessions), and may be
usable as a pinned dependency rather than a fork.

**REWEIGHTED 2026-09-11 by the owner, who stated the goal the survey did not have.** The target is
**Cutroom — an interactive video agent, "Claude Code for video".** The reel pipeline is **one
consumer of that engine, not the engine.** `video-harness/03-HOW-IT-WORKS` §4 already describes it:
a director loop, an op vocabulary, the inspection ladder, a `finish` a Stop hook can refuse,
doom-loop detection, interactive and headless modes. Nothing about this is new to the repo; what
was missing is that the harness question was being judged against Phase 1's batch job.

**What that changes.** `harness-sdks.md` §8 recommends the AI SDK partly because every agent harness
*"re-implements exactly this (sessions, compaction, retries) for an **interactive coding** context
you do not have"* — **that premise is false for Phase 2.** In an interactive product pi's strengths
*are* the product: steering queues, compaction, abort, session forking, the event log, the tool
registry. The "too big to strip" objection inverts too — `pi-tui`, `pi-protocol`, `pi-client` and
`pi-session-backend-sqlite-node` become relevant rather than dead weight for a CLI product.
**pi moves from fallback to genuine architectural candidate for Phase 2's shell.**

**What it does not change, and this is the load-bearing half.** **pi gives the shell; it never gives
the core.** The paragraph above still holds: the Cut and its op vocabulary, the scheduler,
incremental render, gates and continuity exist in no surveyed harness, and they are what makes a
video agent possible. That work is ours under any harness. Adopting pi buys the session loop
*around* it.

**Three things still weigh against, unchanged.** pi is **mid-rewrite**, so a fork today chooses
between the version its authors are abandoning and the version they have not finished. **Structured
output is not first-class** (`sdk.md` has no JSON-schema output option; the workaround is an
*inferred* terminal `submit_result` tool), and the planner and gates stay schema-shaped whatever runs
the loop. And **D-002 does not transfer** — pi's session is in-process with a JSONL log, while media
jobs run for minutes and must survive a restart (`07-BUILD` §1.1), so the job table stays.

**What would settle it — a bounded source-reading spike, not an argument.** Nobody has read pi's
internals; `harness-sdks.md` surveyed its API surface. Three questions: can `pi-ai`'s
`constrainedSampling` produce D-035's manifest against MiniMax-M3 (one call proves or kills it); what
is `pi-agent-core` minus the coding agent, in files and in filesystem assumptions; and does the JSONL
session tree (`id`/`parentId`, `branch`, `fork`) genuinely map onto the Cut and branch lineages, or
only resemble them. **It does not block L5 and it is not due until Phase 2.**

### C-12 · A subject detector for the clipping veto — parked, not dead

**Parked by D-044 (2026-09-11), which chose the witness for now.** D-031's first veto asks whether
the subject is clipped by the frame edge. D-044 answers it with a closed yes/no to the witness, on
the grounds that a detector is also a model and edge-clipping is the same question as occlusion,
which D-031 already gave to the model.

**What would reopen it.** A detector genuinely good at this — an open-vocabulary grounding model
(Grounding DINO / OWLv2 class) that takes the manifest's subject description and returns a box —
gives something the witness cannot: a **number** rather than a boolean. Box-completeness as a
continuous 0–1 term feeds D-031's weighted sum directly, where a boolean can only veto. That is a
strictly richer signal for the same veto.

**What it would cost.** A model dependency in the hot path, self-hosted or a second provider, for
one term. D-006 routes all vision through one port to one model; this is the first thing that would
put a second vision model in the pipeline.

**What decides it.** **M-1.** If witness edge-clipping disagrees with human judgement often enough
to matter, the detector earns its dependency. The field name `clippedByEdge` is deliberately
mechanism-neutral, so swapping the producer changes no consumer.

---

## 3. Traps

Live hazards. Each is known and currently unfixed.

**T-1 · Config B's worst case breaches the image cap.**
Two canonicals is 6 calls at plan time. One of them failing best-of-2 needs a 7th. Pre-flight
refuses it, and the reel dies with no repair path. See C-1.

**CLOSED by D-027 (2026-09-11).** Config B is rejected for Phase 1, so the breach has no live
path. It returns as a live hazard only if Phase 2 adopts B.

**T-2 · The consistency gate will flag intended state changes as defects.**
**Largely closed by D-037 (2026-09-11)** — a declared FLF2V pair is the declaration of intent, and
the gate excludes those pairs. What remains is intended difference that is *not* a within-shot
state change (a subject legitimately restyled between two distant shots), which still has no
declaration mechanism.

**The gate this trap is about did not exist until D-049 (2026-09-11).** It was depended on by
D-027/C-5 (which held a reserve call for its repair), by D-037 (which carries a `Confirmed-by` test
asserting it excludes FLF2V pairs), by this trap, and by §4.1's cost table — and appeared nowhere
in the L0→L6 flow. It is now **Gate 1S**, at L2, across the pool. D-049 also blunts a second
version of this trap: **embeddings rank suspicion and never reject alone**, because two honest
shots of one subject differ in pose and framing and a bare cosine threshold would flag correct
frames — the same false-defect failure as T-2, arriving from the sensor rather than from the
storyboard.
"The vase differs between keyframe 2 and keyframe 4" is exactly what the set check is built to
catch — and when the storyboard *asked* for that change, it is correct behaviour producing a
wrong answer. The manifest must declare intended differences and the gate must check everything
except those. Without it the gate fights the design on every reel containing any change at all.

**T-3 · Takes versus retries is an off-by-one waiting to happen.**
`BUDGET.md` says "Retries per shot: 2". The Cutroom docs say "3 paid takes". Same policy. Anyone
reading "3" and implementing three *retries* gets four takes and breaks the reel budget. Always
write **takes**.

**T-4 · `04-FAST` §2's reel is an illustration, not the reel.** **FIXED 2026-09-11** — a caveat is
now at the top of that section naming D-014's shape. The trap is kept as the record of why.
It models 3 shots at 15 s. D-014 binds **4–6 shots and ~40 s**. Four decisions in this session
were briefly built on the wrong shape before it was caught. Anything quoting `04-FAST`'s
per-reel arithmetic is suspect.

**T-5 · `03-HOW-IT-WORKS` §7.1's "~1.15×" is wrong.** **FIXED 2026-09-11** — the table now reads
~1.43× with a correction naming D-030's real justification (selection, not cost) and D-031's
criterion. The trap is kept as the record of why.
At recorded rates a keyframe is $0.15 and a 5 s clip is $0.20 — 75% of a clip, not 15%. The real
figure is ~1.43×, and the policy's justification is latency and blast radius, not cost. The
source document still says otherwise.

**T-6 · Every latency figure descends from one sample.**
One 5-second clip, 2026-09-03, 7 s wall / 2.5 s inference. Image-generation latency has **never
been measured**. The 8 s-clip figure of ~9 s is extrapolation. No histograms exist.

**T-7 · Q9 gates all of it.**
The real fal charge is unread; fal exposes no billing endpoint (`/billing/user_spending` and
`/billing/balance` both 404). D-014 blocks the seed library until the owner reads the dashboard.
If the true rate differs from $0.04/s, every table in §4 moves.

**T-8 · The canonical serves two masters.**
D-029 collapses the two tiers: every image is frame 1 of a real shot, so the canonical is *both*
its own shot's opening frame *and* the reference every derived keyframe is composed from. A
composition that is strong as an opening — tight, off-centre, subject partly occluded — can be a
poor reference. §3 of `VideoGenerationFlow.md` flagged this as "an optimization to measure, not an
assumption"; D-027 assumed it and D-029 made it structural. **Nothing has measured it.** If it
fails, the fix is one extra call to separate the roles, which is what the two held reserve slots
would have to pay for. **Narrowed by D-048 (2026-09-11):** a reel declaring a discrete state change
holds **one** slot, not two, and the canonical repair has first claim on it — so on that class of
reel there is no slot left to buy the separation this trap would need.

**Which way the conflict resolves is now decided (D-031): reference quality outranks composition**
— composition affects one shot, reference quality affects three of five. That settles the
*tiebreak*; it does not settle whether one image can serve both roles well at all, which remains
unmeasured and is why this stays a trap rather than becoming a closed question.

**T-9 · A build question was leaning on a client that was never ratified.**
`07-BUILD` Q22 answers "progressive MP4 or HLS" with *"HLS/fMP4 manifest plus a final MP4; the
Android/Media3 client plays HLS natively"*. **There is no Android client decision.** The Media3
recommendation lives in `docs/design/2026-09-06-zoom-ladder-talk.md`, whose front matter reads *"a
discussion document, not a decision. Nothing here supersedes DECISIONS.md until a D-entry says
so"*, and whose closing line asks for exactly that entry — proposing the id **`D-023`**, which
`DECISIONS.md` had already given to the unit of generation. `apps/web` is a React + Vite PWA.

**D-056 (2026-09-12) neutralises this instance** by choosing the form that is native to both
candidate clients, so the answer does not depend on the open question. **The trap is the pattern,
not the instance.** That talk proposes nine other changes in its §L — bearer tokens over session
cookies, Maestro over Playwright for the client, removing `vite-plugin-pwa`, the SVG sheet becoming
a Compose canvas — each written as *"change now"*, none ratified. Any of them can be picked up by a
later document as settled the same way Q22 picked up the client. **Nothing enumerates which
documents currently assume an Android client**, and until something does, the next design that needs
the answer will find the same false premise waiting.

**T-10 · The provider rewrites our prompt and nothing in the design reacted to it for nine days.**
`prompt_expansion_mode` is **required** on every fal H3 call and the provider rewrites the prompt
server-side, returning `expanded_prompt`. So **the text the model generates from is not the text we
wrote**. D-033 recorded the expansion; nothing else acknowledged it existed.

**D-072 makes it survivable rather than fixed**, and the reason it is survivable is worth keeping:
the gates judge the **output**, never the prompt — criteria are authored before generation (I-9) and
the witness observes the clip (I-8) — so an expansion can waste a take but can never argue for its
own output. What remains live: **nobody knows what values the mode accepts.** Only `balanced`
appears anywhere in the repo's research, so "configure the least-rewriting value" currently names a
setting we cannot select. **O-20**, closed by one schema read. Until then a batch could silently
contain reels generated under different expansion behaviour, which would make M-1's pass rate
measured across inconsistent conditions.

**T-11 · Two decisions now depend on a `pnpm drift` edge that does not exist.**
**D-034**'s `Confirmed-by` requires *"a `pnpm drift` rule that the planning layer's module cannot
import or write the epistemic fields"*. `scripts/drift.mjs` has five edges and this is not one of
them. **D-067** then placed the epistemic layer **inside `reel-engine`**, which makes that module
boundary the only thing separating the layer that grades a shot from the layer that writes it —
the separation D-034 exists to enforce, now resting entirely on an unimplemented check.

It was a documentation-level gap while the layers were notional. It is a live hazard now, because
both modules will live in one package and an ordinary import will compile.
`steering/features/reel-engine.md` slice 4 adds the edge; until it lands, D-034 is a wish in its own
file's words.

**Worse, found the same day: the mechanism itself does not run on this machine.** `pnpm drift`
fails on **every** document with *"front matter has no status:"*, including files that plainly have
one, because `_lib.mjs#frontMatter` matches a line with `(.*)$` and every line of a CRLF checkout
ends ``. 139 false problems, non-zero exit, and the module-boundary checks never get read. So the
edge D-034 requires is not merely unwritten — **the tool that would enforce it is red before it
starts**. Recorded under Q15 with the rest of that regex family.

---

## 4. The full cost and latency model

Everything below is **budgeted, not observed** — see T-6 and T-7.

### 4.1 Unit values — **generation only**

> **Scope, from D-076 (2026-09-12): every figure in §4 is GENERATION ONLY.** Research spend is a
> separate envelope with its own ceilings and is not included in $2.20, $2.52 or $0.45. Its own
> rates are partly unknown — SERPdive gives 1,000 free credits a month and `moby` costs 1.5 each
> (D-010), and **Exa's rate is recorded nowhere in this repo** (**M-9**). A reel's true all-in cost
> is this table plus that envelope, and nothing here should be quoted as "all-in" again.


| Unit | Cost | Wall | Notes |
|---|---|---|---|
| image call | $0.15 | ~6 s | parallel within a wave |
| clip, 8 s | $0.32 | ~9 s | parallel across shots; t2v and i2v identical |
| plan | ~$0 | ~3 s | token plan, no marginal cost |
| **second plan call** | **~$0** | ~3 s | D-061 — two storyboards, parallel; the plan is the only stage where an alternative is free |
| **Gate 0** | **$0** | <1 s | D-063 — deterministic, no model call at all |
| **plan score** | ~$0 | ~3 s | D-064 — one reconciler call per surviving storyboard, plan-covered |
| keyframe gate | ~$0 | ~3 s | ffprobe/OCR free; witness on plan-covered tokens |
| set-consistency gate | ~$0 | ~4 s | local embeddings + one grid model call |
| clip gates | ~$0 | ~5 s | |
| select · anchors · render | ~$0 | ~2 s | |
| narration, whole reel | ~$0.01 | ~3 s | T2A bills **per character**, so D-057's one call per shot costs what one call for the whole script would |
| assembly, one ffmpeg pass | $0 | unmeasured | D-054 — local CPU, no provider; the wall figure has never been measured and D-015 makes it worth $0 anyway |
| cut gates (7, 8) | ~$0 | ~4 s | on the assembled file; **cannot spend** (I-18) |

Gates are effectively free in money. **Only images and video cost.**

**The plan layer forked and the cost model did not move.** D-061 plans twice, D-063 gates both and D-064 ranks the survivors — three additions, all ~$0, because the token plan covers M3 and Gate 0 makes no model call. The reason this is worth stating rather than assuming: **every other selection point in this design had to be argued against its cost**, and a reader who meets the two-storyboard rule without this row will look for the money it spends. It spends none, and **I-20** is why it stays that way — only one storyboard ever generates.

**Two rows below the noise floor, stated so nobody re-derives them.** Narration is on the order of a
cent per reel — `speech-2.8-hd` is $100/1M characters and a 40-second script is a few hundred
characters — and assembly is local ffmpeg. Neither moves any figure in §4.3, and **neither is a
reason to prefer any assembly design over another**: that choice was made on the seam problem and on
what a cache actually buys (D-054), not on price.

### 4.2 The configurations

Reel is D-014's shape throughout: 5 shots, 8 s each, 40 s. Clips are always $1.60.

| | Canonical | Derived | t2v shots | Image calls | Image $ |
|---|---|---|---|---|---|
| **0** — no keyframes | — | — | 5 | 0 | $0 |
| **A** — 1 canonical | 1 × best-of-2 | 2 | 2 | 4 | $0.60 |
| **B** — 2 canonicals | 2 × best-of-2 | 2 | 1 | 6 | $0.90 |
| **C** — 1 canonical + 1 state | best-of-2 + 1 state | 2 | 2 | 5 | $0.75 |

### 4.3 Cost per case

*Best* = nothing fails. *Average* = one clip fails a gate, one retry. *Worst* = canonical fails
best-of-2 and needs an informed third call, then clip retries until pre-flight refuses.

| Config | Best | Average | Worst | 12 reels @ average |
|---|---|---|---|---|
| **0** | **$1.60** | $1.92 | $2.88 | $23.04 |
| **A** | $2.20 | $2.52 | $2.99 | $30.24 |
| **B** | $2.50 | $2.82 | $2.97 ⚠ | $33.84 |
| **C** | $2.35 | $2.67 | $2.82 | $32.04 |

⚠ Config B's worst case requires 7 image calls against a cap of 6 (T-1).

**All four fit $40 across twelve reels even at worst case.** The binding constraint is the
per-reel $3.00, never the $40 total (I-2).

### 4.4 Latency per case

| Config | Waves | Best | Average | Worst |
|---|---|---|---|---|
| **0** | 1 | **19 s** | 33 s | 47 s |
| **A** | 3 | 41 s | 55 s | 64 s |
| **B** | 3 | 41 s | 55 s | 64 s |
| **C** | 3 | 41 s | 55 s | 64 s |

Config A, best case, broken out:

```
plan                        3 s
wave 1   canonical x2       6 s     parallel
         gate               3 s
wave 2   derived x2         6 s     parallel
         gate               3 s
         set-consistency    4 s
wave 3   5 clips            9 s     parallel
         clip gates         5 s
         select + render    2 s
                          ------
                            41 s
```

### 4.5 The structural finding

**Cost scales with count. Latency scales with depth.**

A, B and C all complete in 41 s despite costing $2.20, $2.50 and $2.35, because extra keyframes
sit *inside* an existing wave and run alongside their siblings.

- Adding a keyframe: **+$0.15, +0 s**
- Adding a derivation level: **+$0, +~9 s** (generate plus gate)

They are orthogonal levers. Maximise breadth, minimise depth — which is the argument behind C-4.

### 4.6 What keyframes actually cost

Against Config 0, the bare baseline:

> Consistency is priced at **+$0.60 and +22 s** on a good run.

That is the whole trade, stated plainly. Everything else in this file is detail on how to spend
that $0.60 well.

### 4.7 Recommended pathway, by objective

**Price over time → Config A.** Cheapest keyframed option, single source of truth, and the only
one whose worst case still affords two clip retries.

**Time over price → Config B**, *if* C-1 resolves the cap. Identical latency to A; $0.30 buys a
second pinned subject for free in time. Unsafe until the 6-call cap moves to 8.

**Neither → Config 0.** $1.60 and 19 s, less than half the time of any keyframed config, and no
consistency, no cheap kill, no blast-radius protection.

**The honest split.** Phase 1 seeds are offline (D-015), so price wins outright — **take A**.
Twelve reels at A's worst case is about 13 minutes of unattended wall-clock. Phase 2 branches
are on-demand and the calculus genuinely flips. Nothing forces one answer now, and choosing one
before Phase 2 has latency histograms would be choosing on a single 7-second sample.
