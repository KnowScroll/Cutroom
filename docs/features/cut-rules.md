---
status: current
authority: plan
---

# cut-rules — a reel may show one thing in every shot, and its only sound is its narration

Status: planned
Decisions: D-008, D-027, D-055, D-059, D-064, D-084, I-6, I-16, S-028, S-072, S-073, S-074, S-075, S-097, S-099, S-111, S-112, S-148, S-149, S-158
Named only in the deferral list: D-023, S-115
Gates: product APPROVED 2026-09-24 adversarial-reviewer · architecture APPROVED 2026-09-24 adversarial-reviewer · program-design APPROVED 2026-09-24 adversarial-reviewer · slices APPROVED 2026-09-24 adversarial-reviewer

> **Created 2026-09-24 by S-158**, out of run `12a097bf…` — the first black-holes cut ever assembled, 45¢ — and what
> the owner said of it: its Gate 7 refusal was wrong in principle (P-006), and a male voice could be heard under the
> narration (P-007). **The owner answered both questions before these gates were written** (S-158): the repetition
> question leaves **both** Gate 7 and the plan score; and the clips are **muted**, so a reel's only sound is its
> narration.
>
> **What this feature is not.** It adds no gate and no question. It builds no listener for Gate 3 — nothing here can
> hear a clip, and Gate 3's `listen` stays the stand-in it has always been, recorded as one in P-007 and S-158. It does not
> touch a picture, a clip's making, or any other closed question.

## Gate 1 — Product (no technical language)

**The problem.** Two things the owner found in the first black-holes reel that reached its end.

1. **The engine refused a reel for showing its subject more than once.** Its last check asks whether every shot shows
   something no other shot repeats, and a reel about black holes shows black holes — three shots of a dark disc ringed
   by glowing gas, each for a different sentence. A reel that explains how a thing works must show that thing again and
   again. The same question is asked earlier, when two plans are compared, and there it marks down every plan in which a
   subject comes back — which is also the kind of plan that earns checked pictures.
2. **A man's voice could be heard under the narration.** The video model makes each clip with its own sound, meant to
   be background ambience; it made speech, which it is told not to, and the engine mixed every clip's sound under the
   narration. The check that should have caught the speech has never actually listened: nothing in this engine can
   hear a clip.

**The visible outcome.**

- **A reel is never refused, and a plan never marked down, for showing the same thing in more than one shot.** Every
  other judgement of the finished cut and of a plan stays exactly as it is: the order, the pacing, what sits beside
  what, and whether the captions follow the narration.
- **A reel's only sound is its narration.** No clip's sound is heard, so no voice the video model makes can reach a
  viewer. The reel loses its background ambience.

**What does not change, and what can.** Removing a question and a sound costs nothing in itself. But **which of two
plans is chosen can change**, because one judgement fewer is weighed — by design: it is the one that pushed plans away
from recurring subjects, and a plan with a recurring subject is one that earns checked pictures. So the chosen plan,
and with it the reel's cost and time, can change — always within the reel's ceiling and cap, which do not move. And if the judge answers the four remaining questions the same way, a cut refused only for repetition passes, and one that passed still passes; a real judge asked four questions instead of five is not bound to answer the four the same way.

## Gate 2 — Architecture

**Three removals, each where the thing lives, and nothing added.**

| package              | what changes                                                                                                                                                                                                                                     | what it still may not do                                  |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------- |
| `packages/contracts` | `PlanSettings.score.questions` becomes a 3-tuple; `RenderSettings.cutQuestions` a 4-tuple; `duckDb` leaves `RenderSettings` and `RenderManifest`                                                                                                 | import anything internal                                  |
| `packages/pipeline`  | `SCORE_QUESTIONS` loses its fourth, `scoreAnswer` becomes a 3-tuple, `QUESTION_TERMS` loses `distinct` and the default weights lose it; `cutQuestions` loses its fifth; `duckDb` leaves the defaults and the manifest (its schema and its build) | reach for a port, do I/O, import an npm package but `zod` |
| `packages/providers` | the ffmpeg assembler's `soundOf` gives EVERY shot's clip the silence it already gives a held shot, and mixes the narration over it                                                                                                               | keep durable state                                        |

`gate7.ts` is generic over its questions and does not change but for its header comment; nor does the scorer's call, which asks whatever
`settings.score.questions` holds. No table, migration, route, job or port moves.

**The plan score (D-064 as S-158 amends it).** Six terms become five: coverage, recurrence, and one for each of three
closed questions — order, pacing, juxtaposition — each weighted 1 as today. A plan whose answers were all yes scored at
most 6 and now scores at most 5; a plan whose only `no` was the removed question now scores as a plan with none. **Which of two plans
wins can change**, and that is the point: the removed term is the one S-148 and S-149 measured marking down every plan
whose subject recurs.

**Gate 7 (S-074 as S-158 amends it).** Four closed questions, every one named once, any `no` fails (I-16), one
`judgeCut` call on the frame strip — unchanged but for the count.

**The sound (D-008 and S-073 as S-158 amends them).** In `soundOf`, the clip branch — _"`[i:a]` fitted and lowered by
the duck level"_ — goes, so every shot's clip stream is the `anullsrc` silence a held shot has had since S-097, and the
narration is mixed over it exactly as before; the video inputs are unchanged, and ffmpeg ignores a clip's unused
audio stream (measured by the first review: exit 0, the 220 Hz band at −73 dB). **`duckDb` is removed rather than left
unread**: a field in the manifest that nothing reads would claim a mix that does not happen, and the manifest is the
record of what the assembler did (D-059). **`volume` leaves `PASS_FILTERS`** (`packages/providers/src/ffmpeg/tools.ts`):
nothing writes it any more, and `ready()` should not require a filter the pass does not use (S-075).

**The clips' measured audio facts stay on the manifest, as the record of what was made; nothing reads them to mix.**
The conform note `silence: the clip has no sound, so silence is added` (`render/manifest.ts`) **keeps its text and
becomes the record of an input fact** — this clip had no sound stream — since every clip shot's sound is now silence
under the narration, noted or not. So no note moves and no check of notes moves; S-158 supersedes, in those words,
S-073's _"A conform note is recorded for … added silence"_ and D-055's audio conform — _"resampled — including the
provider's own clips"_, _"Audio is conformed for the same reason video is"_ — for a clip's sound, which is not used.

**What stays a stand-in.** Gate 3's `listen` (P-007): with no clip sound in the reel, a voice it misses can no longer
reach a viewer. Nothing the engine writes changes — Gate 3's verdict still records its coverage as `whole file` — and
the stand-in is recorded in P-007 and S-158, not in a row. S-072's rule that speech or music fails a take stands.

**What this feature changes in verified features** — each by amendment, named in a block above that feature's gates in
the slice that makes the change. Where S-158 retires a property, the block says so in place of the standing _"no
assertion is removed"_, and the check keeps every assertion that still holds and gains its successor (the impact
search of 2026-09-24, and the first review):

- **`reel-plan`**: check 34 (`reel-plan-score.test.ts:69`, `:75`) scripts three answers, refuses four, and its
  `maybe` input is three long so it is refused for `maybe` and not for its length; check 35's `EVERY_ANSWER` becomes
  the eight combinations of three, its count `7 * 4 * 11`, its all-`no` input three long (the total stays `1 + 3/4`,
  because the removed answer was `no` and weighed nothing), and its tie-break pair becomes two three-answer sets that
  tie; check 36's input three long. The engine's `answers(...)` helper takes three, and every script built on it —
  `twoSurvivors()`, `reel-render-admission`'s and `reel-stills-admission`'s `forkOfTwo()` — answers three (the only
  `no` in each is the third answer and both fourth answers were yes, so plan b still wins by one).
- **`reel-render`**: check 38's title says four questions and its recorded answer is four long; check 46's _"a judge
  answer leaving out a question"_ answers three of the four and names the fourth; `tests/engine/video.ts`'
  `CUT_QUESTIONS` is the four; `gate7.ts`' header says four. **Check 37**, which required the assembler's source to
  read `shot.clip.audio === null`, gains its successor: the source reads no `shot.clip.audio` at all, and the one
  invocation's filtergraph for its `lying` manifest — whose facts say its clip has sound — takes no clip input's audio
  (no `[<even>:a]` label); its fixture drops `duckDb`. **Check 34 is rewritten to its successor**, S-158 retiring its
  _"18 dB lower"_: each clip file's own 220 Hz band is above −30 dB (its positive control); the as-made reel's 220 Hz band is
  within 1 dB of the same manifest assembled over `-an` copies of its clips; and the narration's 660 Hz band moves by
  under 1 dB between the two (its narration invariance, kept). **Check 32's** _"220 Hz loud in shot 2, silent in shot 3"_ becomes: shot 2's clip file is above −30 dB at 220 Hz, and the reel's 220 Hz band in shot 2 is at least 30 dB below that clip file's own. The manifest
  check (`reel-render-manifest.test.ts:237`) asserts `duckDb` is absent; the typed fixture in
  `reel-render-shapes.test.ts` drops it.
- **`reel-takes`**: check 18's clip shot — _"220 Hz loud in shot 0, silent in the hold"_ — becomes: shot 0's clip file is above −30 dB at 220 Hz, and the reel's 220 Hz band in shot 0 is at least 30 dB below that clip file's own; check 16's manifest fixture drops `duckDb`.
- **`reel-stills`**: its admission check's `forkOfTwo()` answers three.

Unchanged and read: `paid-path`'s check 6 keeps its own four-answer schema over a recorded fenced answer — a test of
unwrapping, not of the question count; `one-subject` (stopped) named the removed question and `terms.distinct` in its
method, never in code, and is not reopened; `scripts/real-reel.mjs`' brief comment quotes the removed Gate 7 question
as history and is left as prose. No stored render manifest is re-read under the strict schema (the first review read
every reader), so old rows holding `duckDb` are inert.

## Gate 3 — Program design

**File locations.**

```text
packages/contracts/src/settings.ts         score.questions 3-tuple; cutQuestions 4-tuple; no duckDb
packages/contracts/src/render.ts           RenderManifest without duckDb
packages/pipeline/src/plan/prompts.ts      SCORE_QUESTIONS (three), scoreAnswer (3-tuple)
packages/pipeline/src/plan/score.ts        QUESTION_TERMS without distinct
packages/pipeline/src/plan/index.ts        default weights without distinct
packages/pipeline/src/render/index.ts      cutQuestions (four), no duckDb default
packages/pipeline/src/render/manifest.ts   the schema and the build, without duckDb
packages/providers/src/ffmpeg/assemble.ts  soundOf: every clip silent under the narration; no clip audio read
packages/providers/src/ffmpeg/tools.ts     PASS_FILTERS without volume
packages/pipeline/src/gates/gate7.ts       its header: four closed questions
tests/cut-rules-*.test.ts                  the checks below
tests/engine/plans.ts, video.ts            answers(...) takes three; CUT_QUESTIONS is four
tests/reel-plan-score.test.ts              checks 34, 35, 36 amended
tests/reel-render-admission.test.ts, tests/reel-stills-admission.test.ts   forkOfTwo() answers three
tests/reel-render-cut.test.ts              checks 37, 38 amended
tests/reel-render-faults.test.ts           check 46's left-out-question case amended
tests/reel-render-pass.test.ts             checks 32, 34 amended
tests/reel-render-manifest.test.ts, reel-render-shapes.test.ts   duckDb absent / dropped
tests/reel-takes-still-render.test.ts, reel-takes-still-shapes.test.ts   checks 18, 16 amended
docs/features/reel-plan.md, reel-stills.md, reel-render.md, reel-takes.md   amendment blocks
```

**The checks.** Each is one test, named by its number.

1. `the plan score asks three closed questions — order, pacing, juxtaposition — and none about repetition: the settings' questions are exactly those three; every score prompt carries each, and neither the removed sentence nor "already shown"; its answer schema accepts three yes/no and refuses four; the default weights hold no distinct; and a plan's terms are exactly coverage, recurrence, order, pacing and juxtaposition, with order, pacing and juxtaposition the answers in that order — (yes, yes, no) gives 1, 1, 0 and (no, yes, no) gives 0, 1, 0` — S-158, D-064.
2. `Gate 7 asks four closed questions — order, pacing, what sits beside what, the captions — and none about repetition: the settings' cutQuestions are exactly those four; through the worker every judgeCut call carries exactly them; and a judge answer naming the four, all yes, accepts the cut` — S-158, S-074, I-16.
3. `a reel's only sound is its narration: for a completed run's render manifest, each clip file's own 220 Hz band is above −30 dB (the premise); the manifest assembled as made and the same manifest assembled over -an copies of its clips, their audio facts null, give a 220 Hz band within 1 dB of each other in every shot's span, and a 660 Hz narration band above −30 dB and within 1 dB of each other in every span; and the as-made invocation's filtergraph takes no clip input's audio — no [<even>:a] label` — S-158, D-008, S-073.
4. `no duck level is left: renderManifestSchema refuses a manifest holding duckDb, and a RenderManifest or RenderSettings literal holding one is a type error (a compile check)` — S-158, S-073, D-059.
5. `every other test of this feature passes in a child process whose environment holds only PATH and what the operating system needs to start Node, in S-028's form` — S-028, S-111.

**The least confident decisions.** Whether a reel without ambience reads as too quiet between words — the owner chose
it knowing it loses the ambience. Whether the three remaining score questions still separate two plans often enough
to matter; a tie goes to the 4-unit plan, as today (D-064's tie rule).

## Gate 4 — Slices

- [x] **Slice 1 — the plan score.** Contracts' 3-tuple, `SCORE_QUESTIONS`, `scoreAnswer`, `QUESTION_TERMS`, the
      weights; `answers(...)` and every script on it; `reel-plan`'s checks 34–36 amended. Amendment blocks:
      `reel-plan`, `reel-stills`, `reel-render` (their admission fixtures). **Proves: 1.**
- [ ] **Slice 2 — Gate 7.** Contracts' 4-tuple, `cutQuestions`, `CUT_QUESTIONS`, `gate7.ts`' header; `reel-render`'s
      checks 38 and 46 amended. Amendment block: `reel-render`. **Proves: 2.**
- [ ] **Slice 3 — the sound.** `soundOf`; `duckDb` out of contracts, defaults, schema and build; `volume` out of
      `PASS_FILTERS`; `reel-render`'s checks 32, 34 and 37, its manifest check and typed fixture, and `reel-takes`'
      checks 16 and 18 amended. Amendment blocks: `reel-render`, `reel-takes`. **Proves: 3, 4.**
- [ ] **Slice 4 — the journey.** Check 5; this feature's journey, and `reel-plan`'s, `reel-stills`', `reel-render`'s
      and `reel-takes`' again (S-099's form). **Proves: 5.**

Every check appears in exactly one slice: 1 + 1 + 2 + 1 = 5.

## Outcome

1. **No reel is refused, and no plan marked down, for showing one thing in more than one shot.**
2. **A reel's only sound is its narration**, so no voice a video model makes can reach a viewer.

## Evidence (newest first; appended by the journey, never typed by hand)

## Divergence (the first broken boundary, or "none")

## Deferred

1. **A real listener for Gate 3** (P-007) — needed before any clip sound comes back.
2. **Parallel shots** (D-023, S-115) — held by the owner.

## Gate review 1 — 2026-09-24, adversarial reviewer

**Nine findings; all four gates NOT APPROVED. All fixed:**

1. **`reel-render`'s check 37 requires the assembler to read `shot.clip.audio === null`**, which muting removes — Slice 3
   would have left the suite red. **Fixed:** named, with its successor (no clip audio read; no clip `:a` in the graph).
2. **Check 3 could pass for the wrong reason** — no positive control, "audio removed" undefined, the narration not
   compared. **Fixed:** each clip file's own tone asserted loud; `-an` copies; the graph asserted; the narration within
   1 dB. Checks 32, 34 and 18 carry the same control; check 34 keeps its narration invariance.
3. **"The conform still reads" the clips' audio facts was false**, and the silence note would misrecord the mix.
   **Fixed:** the note keeps its text as an input fact; S-073's note clause and D-055's audio conform superseded by name.
4. **"No reel costs more, and none takes longer"** was false: the chosen plan can change. **Fixed** in Gate 1.
5. **S-073's manifest bullet and S-149's rejection of changing the score were unnamed.** **Fixed** in S-158.
6. **Check 1 could not be built** ("none of the removed question's words") **and checked term names only.** **Fixed.**
7. **`reel-plan`'s `maybe` input stayed four long** — refused for its length. **Fixed.**
8. **`gate7.ts`' header, `volume` in `PASS_FILTERS`, and the amended files were unlisted.** **Fixed.**
9. **Wording**: "scored 6", and "recorded as a stand-in". **Fixed.**

## Gate review 2 — 2026-09-24, the same reviewer

**Round 1's nine fixes verified; slices APPROVED; four one-line findings, all fixed:** check 1's one answer vector
could not place order against pacing — a second, (no, yes, no), added; checks 32, 34 and 18 now state their tolerance
and threshold (within 1 dB, above −30 dB); `gate7.ts` changes only in its header comment, said so; and Gate 1's
sentence on a cut that passes, made true for a cut that also failed another question.

## Gate review 3 — 2026-09-24, the same reviewer

**Product, program design and slices APPROVED; architecture held on one finding — the reviewer's own round-2 advice,
measured wrong:** checks 32 and 18 compare two DIFFERENT spans of one muted file, whose noise floors (the AAC encoder,
the narration's leak through the band filters) differ by 1.5 to 1.8 dB, so _"within 1 dB"_ would fail on correct code.
**Fixed:** each reel band is _"at least 30 dB below that clip file's own"_ — correct code measured about 52 dB below
(−76 against −24), the retired 18 dB duck about 18. Checks 3 and 34 compare the SAME span across two renders and stay
_"within 1 dB"_: measured bit-identical on correct code.
