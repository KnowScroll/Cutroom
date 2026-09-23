---
status: current
authority: plan
---

# one-subject — the planner is told that one object seen twice is one subject

Status: stopped — the sentence did not meet the threshold set in advance (0 of 6, as the baseline); S-149 as amended
Decisions: D-026, D-027, D-029, D-034, D-035, D-061, D-062, D-064, S-028, S-039, S-099, S-111, S-129, S-134, S-136, S-144, S-145, S-146, S-148, S-149
Named only in the deferral list: D-023, S-115
Gates: product APPROVED 2026-09-23 adversarial-reviewer · architecture APPROVED 2026-09-23 adversarial-reviewer · program-design APPROVED 2026-09-23 adversarial-reviewer · slices APPROVED 2026-09-23 adversarial-reviewer

> **Created 2026-09-23 by S-149**, out of the owner's answer to S-148: the reel of 2026-09-23 passed Gate 7 and made
> no picture, because the planner named one recurring logbook as two subjects — "Open Logbook" and "Archive Logbook",
> one per criterion — so nothing recurred and the stills stage had nothing to make. **The owner chose to change the
> planner's instructions**, over rewording the brief and over changing the plan score.
>
> **Chosen three times, each time on a corrected description** (S-149). The owner was first told that pictures keep a
> thing looking the same across shots; review 1 found that a recurring subject gets ONE picture, on its first shot, and
> the owner chose again. They were then told the picture step had never run on real providers; review 2 found it had —
> session 45's run `ffbd04b5…` made five pictures, three accepted at Gate 1 and two pairs at Gate 1S — and the owner
> chose again, **on the real gap: no reel has yet had pictures AND passed Gate 7.** Session 45's had pictures and was
> refused for repeating itself; session 47's passed and had none.
>
> **What this feature is not.** It changes no schema, no score, no gate and no stage. It adds one sentence to what
> the planner is told, and it is **measured on the real planner and scorer, for nothing, against a threshold written
> before the first call**, and kept only if the threshold is met.

## Gate 1 — Product (no technical language)

**The problem.** The engine has made approved pictures on the real services, and it has made a finished reel that its
own last check accepted — but never both in one reel. When a brief shows the same things in several shots, the engine
makes pictures of them, and the finished reel repeats itself and is refused. When a brief shows a different thing in
every shot, the reel is accepted, and no picture is made. The last brief tried the middle: one logbook in two shots,
the other shots different. The engine's planner treated the logbook's two appearances as two different things, so
nothing appeared twice and no picture was made.

**The visible outcome.** Nothing a caller asks for changes. What changes is one instruction to the planner: **the same
object in a different place, state or time is one thing**, named for what it is. If the planner follows it, and the plan
that follows it is chosen, the engine makes **one approved picture** of the logbook and **the logbook's first shot is
made from it**; its second shot is still made from words. And because only one thing repeats, the plan can still show
something new in every shot — which is what the reel's last check asks.

**The risks, said before anything is measured.**

- **The planner may not follow it.** Two earlier wordings, on other questions, changed nothing (S-136, S-144).
- **A plan that follows it may lose.** The engine picks between two plans by asking a scorer four questions, one of
  which is _"does every shot show something no other shot has already shown?"_ A plan naming "Logbook" twice may be
  answered no. The same question is asked of the finished reel.
- **It may merge things that are really different.** That is measured too.

**How we will know, before spending anything.** Asking the planner and the scorer costs nothing, so the planning stage
is run six times on the last reel's brief with today's instruction and six times with the new one, and held to a rule
written down now, before the first ask. **The rule is the real goal**: a run counts when the plan it chooses would make
a picture AND the scorer says every shot shows something new. **If the rule is not met, the sentence is not kept** and
the owner decides again. Only if it is met is another reel worth buying, and only with the owner's go-ahead.

**What does not change.** Every rule a plan is judged by, every price, and how the better of two plans is chosen.

## Gate 2 — Architecture

**Where each part lives.**

| package             | what it gains                                                                                | what it still may not do              |
| ------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------- |
| `packages/pipeline` | `SUBJECT_IS_A_THING`, one line, in `plan/prompts.ts`'s `planningBody`, after the naming line | import anything but `zod`, do any I/O |
| everything else     | **nothing**                                                                                  | —                                     |

**The sentence, exactly — ONE line, no newline in it:**

```text
A subject is a thing, not one view of it: the same object seen in another place, state or time — a car parked or moving, a tree in summer or in winter, a house by day or by night — is ONE subject. Name it once, for what it is rather than how it looks in one shot, and give its id to every shot that shows it.
```

- **Its own element of `planningBody`'s array, directly after element 0** — the line that ends _"a subject shown in
  several shots is named once and referred to by its id each time."_ — which it completes: that line says to reuse an
  id and never says what makes two appearances one subject.
- **Its examples are not the measured brief's.** A car, a tree and a house appear in no criterion of the brief the
  measurement uses, so a positive result measures the rule, not an example's overlap with the brief, and no caller's
  words become the engine's instruction.
- **`planningBody` builds both the planning prompt and the repair prompt** (`repairPrompt` calls it); nothing else
  calls it.
- **A constant**, so the prompt is still built from its inputs alone and a call at temperature 0 replays (D-062,
  D-064).
- **The boundary does not move**: no import is added, and the three `split` folder rules are untouched.

**The measurement, which is the evidence this feature stands on.**

_Where it runs._ `.tmp/one-subject-measure.mjs`. `.tmp/` is ignored by git, prettier, eslint, dependency-cruiser and
`drift.mjs`' key scan (`KEY_SKIP`), so the script can exist while checks run and is never committed — it calls a
provider, which no committed test may (S-111). It resolves `@cutroom/*` through the root `node_modules`.

_How it is composed — as the service composes it, and the key never in its hands._

- **The environment `scripts/real-reel.mjs` builds**: the loaded `.env`, with all five `CUTROOM_PROVIDER_*` set real
  (`minimax`, `minimax`, `fal`, `fal`, `local`) and `CUTROOM_FAL_IMAGE_MODEL=fal-ai/flux-2-pro/edit`, as run
  `f895e76d…` had them — because `readSettings` switches `planSettings`' image and video rates to fal's only when those
  adapters are real, and the rates decide the estimate and Gate 0's cost verdict.
- **`readSettings(env)` from `@cutroom/service`**, and its `planSettings`; **the cap from
  `readReelCapCents(settings.budgetPath)`** from `@cutroom/domain` — the worker's own path, which defaults to the
  steering repository's `BUDGET.md`. Both are recorded in the output.
- **The port from `modelPort('minimax', { env, models: DEFAULT_PLAN_SETTINGS.models, artifactRoot, tools })`** from
  `@cutroom/providers`, so the key is read inside `packages/providers` and nowhere else, and never printed.
- **The port wrapped** so every call records its role, the time, its token usage, a hash of its prompt, **whether the
  prompt contains `SUBJECT_IS_A_THING`'s text**, and a hash of its answer. A planner call whose prompt disagrees with
  its arm — carrying the sentence in the baseline, or lacking it in the sentence arm — **voids that run.**
- **The request copied verbatim** from `request()` in `scripts/real-reel.mjs` as committed at `de17dbb`. The copy is
  checked by hashing the function's text taken from `git show de17dbb:scripts/real-reel.mjs` — LF, from the object
  store — against the copy's own text with `\r\n` normalised, so the CRLF working tree cannot break it.

_What it records, per run._ Both plans, each with its grouping (4 units or 6), its shots' `subjectIds` and names, and
its `plannedImageCalls`; any repair plan, separately; for each plan the scorer's four answers and total; which plan was
`selected`; and a run that throws — on budget, a schema echo, a refused answer — as a failed run.

_THE PRIMARY MEASURE — the owner's goal (S-149): a run COUNTS when the plan it SELECTS has `plannedImageCalls` of 1 or
more AND the scorer answered **yes** to its fourth question,_ _"Does every shot show something that no other shot has
already shown?"_ _— identified by that text in `SCORE_QUESTIONS`, not by position._ A run that throws, or selects no
plan, does not count, and stays in the denominator of 6. **A run whose selected plan was not scored** — the sole plan to
survive Gate 0, or a repair, both selected with `scores: null` — **does not count either**, stays in the denominator,
and the number of such runs is reported per arm.

_Where the fourth answer is read._ `PlanOutcome`'s scores carry only terms and totals, so the wrapped port records every
score call's prompt and its `value.answers`. The script finds the numbered line `N. Does every shot show something
that no other shot has already shown?` in that prompt and reads `answers[N-1]`; the two score calls come in order,
plan a then plan b, which matches each answer to its plan. **That answer is checked against the selected plan's
`scores[selected].terms.distinct`; if they disagree, the run is void.** `plannedImageCalls` is on every `Plan`, read
from the selected fork plan or the repair.

_The threshold, written now, before the first call._

- **Kept** if the sentence arm has **at least 3 of 6 runs that count AND at least the baseline's count plus 3.**
- **Premise not reproduced** if the baseline has **4 or more of 6** runs that count: today's prompt already reaches the
  goal, the sentence is not tested, and the owner decides.
- **Anything else is "not moved"**: the sentence is not kept, and the owner decides.
- **An arm with 2 or more failed runs is void** and is run once more; void twice, the owner is told. **A run voided —
  by a prompt that disagrees with its arm, or a fourth answer that disagrees with its terms — counts as a failed run.**

_The diagnostic measures, recorded beside the primary and deciding nothing on their own._

- **The logbook as one subject.** Let **L** be the shots whose unit's sentences carry `c2` (`show-log`) and **A** those
  whose units carry `c4` (`show-archive`) — plan a (4 units) L = {1}, A = {3}; plan b (6 units) L = {1}, A = {4, 5}. A
  plan has the logbook as one subject if some subject id is in at least one shot of L and at least one of A, and its
  name matches `/log|book/i`. Reported for 4-unit and 6-unit plans **separately**, never pooled; the shared id's name
  printed each time. This is what says whether the sentence did what it says, whatever the score then chose.
- **Distinct answers.** The planner is at temperature 0, and nothing has shown whether it varies there. Each arm
  reports how many distinct planner answers it got per grouping. **An arm with one distinct answer is one outcome, not
  a rate**, and the threshold reads its count as 0 or 6.
- **Merging, as a control.** For each 4-unit plan: whether any subject id is shared by shots of any pair of the four
  `mustShow` criteria **other than** `show-log`↔`show-archive`. Reported as a count of 6 per arm. **If the sentence
  arm's count is greater than the baseline's, the sentence is merging different things — a finding against it that
  stops it from being kept, whatever the primary says.**

_Drift._ After the sentence arm, `packages/pipeline/src/plan/prompts.ts` is set aside with
`git stash push -- packages/pipeline/src/plan/prompts.ts`, one baseline run is made, and the stash is popped; the
prompt hash proves which prompt went out. **If that run's selected plan and primary result differ from the baseline
arm's commonest outcome while the baseline had one distinct answer**, the comparison is void and the owner is told.

_What it does not act on._ The score. It records which plan the score selects and why, and changes nothing about it
(Deferred 1).

**What this changes in a verified feature.** `reel-plan`'s planning and repair prompts gain one line. No check of
`reel-plan` pins the prompt's text — they read its units, its sentences and its verdict lines — so none moves, and
`reel-plan` gains an amendment block saying so. Its journey re-runs in the last slice.

**Also corrected, whatever the measurement says:** `scripts/real-reel.mjs`' brief comment claims the recurring logbook
gives _"Gate 1S … a pair to compare"_. One recurring subject makes no derived picture, so Gate 1S compares nothing.
The caller's own text (S-134); corrected in Slice 1, which is committed in every branch.

## Gate 3 — Program design

**File locations.**

```text
packages/pipeline/src/plan/prompts.ts   SUBJECT_IS_A_THING, exported from the file; planningBody's element 1
tests/one-subject-*.test.ts             the checks below
docs/features/reel-plan.md              an amendment block
scripts/real-reel.mjs                   the one wrong comment, corrected
.tmp/one-subject-measure.mjs            the measurement — never committed
```

The constant is not exported from `packages/pipeline`'s index; the tests import `plan/prompts.ts` by path, as
`tests/reel-plan-planning.test.ts` already imports `split/index.ts`.

**The checks.**

1. `SUBJECT_IS_A_THING is one line with no newline, and every planning prompt and every repair prompt the stand-in receives, split on newlines, holds it exactly once, at the index directly after the line containing "referred to by its id each time"` — S-149, D-029.
2. `the same request planned twice sends byte-identical planner prompts, each carrying the sentence — restating reel-plan's own replay check for the prompt this feature changes` — D-062, D-064.
3. `every other test of this feature passes in a child process whose environment holds only PATH and what the operating system needs to start Node, in S-028's form` — S-028, S-111.

**The least confident decisions.** Whether any wording moves this planner. Whether six runs an arm show anything, if
the planner is not deterministic. Whether a plan that recurs then wins on score.

## Gate 4 — Slices

- [x] **Slice 1 — the baseline.** The measurement script under `.tmp/`; its first arm on today's prompt, before any
      file under `packages/` changes; `real-reel.mjs`' comment corrected; the figures in `JOURNAL.md`. Committed in
      every branch. **If the premise is not reproduced** (4 or more of 6 runs count), stop: S-149 is amended with the
      figures, this file's `Status:` reads `stopped` with the reason, and the owner decides. **Proves: none** — it is
      evidence, not a check.
- [ ] **Slice 2 — the sentence.** `SUBJECT_IS_A_THING` and `planningBody`; checks 1 and 2; `reel-plan`'s amendment
      block; the second arm and the drift run; S-149 amended with both arms' figures. **If the threshold is not met**,
      the code, the checks and the amendment block are not committed: one commit carries S-149 amended with both arms,
      `JOURNAL.md`, and this file's `Status:` set to `stopped` with the reason, and the owner decides. **Proves: 1, 2.**
- [ ] **Slice 3 — the journey.** Check 3; this feature's journey and `reel-plan`'s again (S-099's form). **Proves: 3.**

Every check appears in exactly one slice: 0 + 2 + 1 = 3.

## Outcome

1. **The planner is told what makes two appearances one subject**, in every planning and repair prompt.
2. **Whether the chosen plan then makes a picture AND shows something new in every shot is measured against a rule
   set in advance**, for nothing, before any reel is bought.

## Evidence (newest first; appended by the journey, never typed by hand)

## Divergence (the first broken boundary, or "none")

none

## Deferred

1. **The plan score** — the owner chose not to change it. If the planner recurs and the score still chooses the plan
   that does not, that is a new decision.
2. **A recurring subject's later shots made from its picture** — `placePictures` gives a subject one picture, on its
   first shot (D-029 part 4, S-039); carrying it into the subject's later shots is a change to placement and to D-029,
   and is its own feature if the owner wants it.
3. **A reel on the new prompt** — about 160–210¢, and only with the owner's go-ahead once the threshold is met.
4. **A second brief as a negative control** — two genuinely different similar objects; the stronger form of the merge
   control, if the first result is positive.
5. **Parallel shots** (D-023, S-115) — held by the owner.

## Gate review 1 — 2026-09-23, adversarial reviewer, same session

Read against the gates, S-144 to S-149, and the code at `de17dbb`. **Eleven findings, all fixed.**

1. **Gate 1 overclaimed**: one recurring subject gets one picture, on its first shot; its later shots are text-made,
   and Gate 1S never runs. **Fixed:** said plainly; the owner told and re-chose; Deferred item 2.
2. **The metric was not computable, and pooling hid the case that matters.** **Fixed:** the L/A rule with a name check,
   plans reported apart.
3. **"Cannot tell" what the score selects was false.** **Fixed:** selection and answers recorded — and, after review 2,
   the primary measure.
4. **"Moved" was to be read after the figures.** **Fixed:** the threshold and the premise branch are set in advance.
5. **Temperature 0 may make six runs one sample.** **Fixed:** distinct answers reported.
6. **The script's place, request and settings were unspecified.** **Fixed:** `.tmp/`, and the composition above.
7. **Nothing measured merging.** **Fixed:** the merge control, which can stop the sentence being kept.
8. **The examples were this brief's.** **Fixed:** a car, a tree, a house.
9. **No failure branch.** **Fixed:** Slices 1 and 2 each say what is committed.
10. **The sentence's placement was ambiguous for check 1.** **Fixed:** one line, element 1, the index asserted.
11. **Check 2 restated `reel-plan`'s replay check.** Kept, and it says so.

## Gate review 2 — 2026-09-23, adversarial reviewer, same session

The same reviewer, on the revision. Gate 3 APPROVED; ten findings on the rest, all fixed.

1. **Gate 1's problem statement was false**: session 45's run made real pictures and passed Gate 1S. **Fixed:** the owner
   was told and chose a third time, on the real gap — pictures AND Gate 7 — which is now the primary measure.
2. **The cap path named a file that does not exist.** **Fixed:** `readReelCapCents(settings.budgetPath)`.
3. **`readSettings` gives fal's rates only with the providers set real.** **Fixed:** `real-reel.mjs`' environment.
4. **The key would have been in the script's hands.** **Fixed:** `modelPort('minimax', …)`.
5. **Nothing proved which prompt an arm sent.** **Fixed:** prompt hashes and the sentence's presence, voiding a run.
6. **The drift run had no mechanism and no consequence.** **Fixed:** `git stash push` of the one file, and when it voids.
7. **Failed runs had no place in the counts.** **Fixed:** they do not count, stay in the denominator, and void an arm at
   two.
8. **The merge control left out `show-archive` pairs and did not define "rise".** **Fixed:** every pair but one, a
   count of 6, greater than the baseline.
9. **The request hash would break on the CRLF tree.** **Fixed:** hashed from `git show`, `\r\n` normalised.
10. **The comment's correction was lost on "not moved".** **Fixed:** Slice 1, committed in every branch.

## Gate review 3 — 2026-09-23, adversarial reviewer, same session

The same reviewer, on the second revision: every earlier fix verified in the gate text; Gates 1, 3 and 4 APPROVED;
four findings on Gate 2, all fixed, and a confirmation pass APPROVED it.

1. **The primary measure was undefined when the selected plan was never scored** — a sole survivor of Gate 0, or a
   repair, both selected with `scores: null`. **Fixed:** such a run does not count, stays in the denominator, and is
   reported per arm.
2. **`PlanOutcome` carries no score answers and no question text**, so "identified by text" could not be read from it.
   **Fixed:** the wrapped port records each score call's prompt and answers; the fourth question is found by its
   numbered line, and checked against the selected plan's `terms.distinct`, a disagreement voiding the run.
3. **S-149 said "several" where the threshold says six.** **Fixed.**
4. **Whether a voided run counts as failed was unstated.** **Fixed:** it does.
