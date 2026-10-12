---
status: current
authority: plan
---

# picture-prompt — ask for a picture that can be made, in the words the generator answers to

Status: planned
Gates: product pending · architecture pending · program-design pending · slices pending

> **Created 2026-10-12 at the owner's request**, in session 82, after the engine's first 52 runs were measured:
> `docs/research/yield-baseline.md`. 8 of 52 runs produced a reel, and Gate 1 refused 53% of all pictures.
>
> **Its gates are not written.** This file records what was found, what the owner chose, what was rejected and why,
> and what the gates must settle. No implementation file until all four are approved by an adversarial reviewer.
> **No `S-` entry has been written yet**: the owner asked first for a benchmark to compare fixes against, and the
> decision is theirs to write once this feature's shape is settled.

## What this feature covers, and what it does not

**In:** the words sent to the image provider — `pictureEntry` in `packages/pipeline/src/stills/prompts.ts`, and
whatever the gates decide must change beside it to make those words honest.

**Not in, and not started:** the cap on how many subjects a shot may name, and giving every shot its own picture.
Both are the larger lever and both touch `reel-plan` and placement (D-027, D-029), so they are their own feature.
Named here only so they are not lost.

## The finding

Three facts from `docs/research/yield-baseline.md`, in the order they were established.

1. **Clipping is the largest single cause of refusal in the engine** — 45 reason strings across 43 pictures, 8 of the
   15 degraded shots, and 4 run endings.
2. **It tracks subject count almost perfectly.** Grouping the 127 judged pictures by how many subjects their shot
   asked one 9:16 frame to hold: one subject refuses 42% (23% for clipping), two refuses 70% (49%), three or more
   refuses 100% (100%, six pictures of six).
3. **The prompt is what asks for the impossible.** A real prompt from a run that stopped on it:

   ```
   Shape: a vertical picture, 9:16.
   Framing: medium.
   It shows: Lighthouse Keeper; Handwritten Logbook; Line Being Written; Lighthouse Lamp at Night.
   ```

   Four subjects demanding incompatible framings. The repair prompt fed the failure back verbatim —
   _"Correct what failed: subject keeper is clipped by the edge of the frame"_ — and the repair failed the same way,
   because the instruction cannot be obeyed.

The baseline at one subject is still 42%, so the prompt carries its own share of the fault independent of count:
`Framing: medium` is the entire framing instruction, and nothing in the prompt ever asks for the subject to sit
inside the frame.

## What was rejected, and why

**Changing the clipping veto at `packages/pipeline/src/gates/gate1.ts`.** First proposed in this session: stop
failing a picture on `clippedByEdge` alone, on the argument that subjects like a galaxy, a lava flow or a swarm have
no "whole" that fits a 9:16 frame.

**The owner rejected it the same day** by producing a 9:16 image of a spiral galaxy read as whole — core, full
spiral, structure complete. The premise was wrong: these subjects can be framed, and the gate was reporting
accurately. **D-044 and D-046 stand unchanged.** The defect is upstream, in what is asked for.

This is recorded because it was a real alternative that was considered and lost on evidence, and because the
temptation to reach for the gate will return the next time the number is large. Weakening a check to reach green is
forbidden (CLAUDE.md rule 3); this would have been that.

## What the owner chose

The owner's reading, 2026-10-12: the engine is _"asking for an image as if we are generating a video, which is not
the case"_ — one frame is made to carry a whole clip's worth of content, so it crams, and the crammed frame burns
the retries. Instead it should ask for pictures that make sense on their own, accepting more pictures per reel if
that is what it takes.

Two things follow, and the second corrects a premise in the first.

- **Ask for a picture that can be made.** The prompt describes one frame honestly, with framing it can satisfy.
- **More pictures need not cost wall time.** The owner's reason was that pictures can be generated in parallel; that
  is true in principle but not built (`parallel-shots`, S-115), and pictures are generated serially today. The
  conclusion survives for a different reason: **more pictures does not mean more clips.** Clip count is fixed by shot
  count, and clips are 53% to 87% of a run's wall clock. Going from 3.1 to roughly 4.8 pictures adds about 85 seconds
  of serial image time to a run whose video stage runs 418 s to 2138 s.

## What this feature changes

Three defects in one file, all the same mistake — the prompt does not describe the picture that is wanted.

1. **Framing discipline.** The instruction today is the bare word `medium`. It should say that the named subject sits
   fully within the frame, with space around it.
2. **Stop naming what is forbidden.** `pictureEntry` appends `It must never show: written words or labels`, and the
   generator draws words. The fal adapter sends one field, `prompt`; **FLUX.2 has no negative-prompt parameter**, and
   Black Forest Labs' own guidance is to describe what should be seen instead. Lettering is 38 refusals across
   Gates 1 and 5. The gate goes on checking `mustNotShow` exactly as it does today — only what is _told to the
   generator_ changes.
3. **Remove the contradictions.** One prompt carried both `It must show: a lighthouse keeper` and
   `It must never show: any real living person`, and the repair was refused for showing a person. `never-person`
   means no identifiable real human being and reads as no realistic person.

## What the gates must settle

- **Where a positive rendering of a `mustNotShow` comes from.** A fixed lexicon in the pipeline for the criteria that
  recur (`never-text`, `never-character`, `never-person`); the planner emitting one beside each criterion; or
  omitting the block from the prompt entirely and leaving the gate to check it. Each is a real alternative and the
  choice is an `S-` entry.
- **Whether the repair prompt should still quote a gate reason verbatim.** It feeds `clipped by the edge of the
frame` back to the generator today, and the repair failed identically in 5 of 6 consecutive failing pairs.
- **What the framing sentence says exactly**, and whether it differs by role — canonical names a framing, derived is
  held to its reference, standalone has neither.
- **Whether a contradiction between `mustShow` and `mustNotShow` should be caught before a call is made** rather than
  paid for and refused.
- Which verified checks the change turns red or wrongly green — `reel-stills` and `reel-plan` are both verified, and
  the prompt's exact text is asserted in tests.

## How it will be measured

Not claimed as a fix until measured, the way S-149 set the pattern.

- The primary measure is **the Gate 1 refusal rate on the same briefs**, against the baseline in
  `docs/research/yield-baseline.md`: 53% overall, and 42% / 70% / 100% by subject count.
- The clipping share is the secondary measure: 45 strings across 43 pictures today.
- A planner call costs nothing under the Token Plan (S-129) and a picture is 5¢, so a stills-only comparison is
  affordable before any reel is bought.
- The threshold is written into Gate 2 of this feature **before the first call**, not chosen after the numbers land.

The owner has asked for a benchmark harness to hold this comparison. That is not started and is not part of this
feature.
