---
status: current
authority: plan
---

# three-pictures — up to three pictures a reel, by a setting, so a reel whose shots all differ still has pictures

Status: verified
Decisions: D-014, D-026, D-027, D-029, D-030, D-032, D-035, D-038, D-041, D-042, D-043, D-047, D-048, D-049, D-050, D-064, D-083, D-086, D-114, S-028, S-035, S-036, S-039, S-043, S-046, S-048, S-058, S-061, S-075, S-099, S-111, S-126, S-128, S-134, S-145, S-148, S-149, S-150
Named only in the deferral list: D-023, S-115
Gates: product APPROVED 2026-09-23 adversarial-reviewer · architecture APPROVED 2026-09-23 adversarial-reviewer · program-design APPROVED 2026-09-23 adversarial-reviewer · slices APPROVED 2026-09-23 adversarial-reviewer

> **Amended on 2026-09-23 by S-153 — no gate below is edited, and no assertion is removed.** The owner asked for
> the picture rule as the default. **The SERVICE's default is now `'upToThree'`** (`CUTROOM_PICTURES` absent), so
> every real reel makes up to three pictures; **the pipeline's own default stays `'recurring'`**, so the engine harness
> and every verified test go on proving D-027's rule, which remains a supported value. Measured first: flipping the
> pipeline's default fails 26 of 512 tests, the service's fails only check 5, which names the default. **Check 5 now
> reads `'upToThree'` absent and `'recurring'` accepted**; check 1 is unchanged.
>
> **Created 2026-09-23 by S-150**, out of the owner's answer to S-149's finding: a reel whose shots are all different
> passes Gate 7 and makes no picture, because D-027 makes a picture only for a subject that recurs; a plan whose
> subject recurs makes pictures and is read as repeating itself. The owner chose four things, each of two or three put
> to them: **pictures for shots that hold no picture today** (not a rewording of the fourth question, not text-made
> reels); **up to three pictures, D-027's cap kept** (not every shot); **a setting, default off, on for real reels**
> (not the new default); and **a new picture only on a shot none of whose subjects is pictured yet** (not a
> reference-carrying picture, not a redraw).
>
> **What this feature is not.** It changes no gate, no check's threshold and no score. With the setting off, which is
> the default, the engine does exactly what it does today and every verified test runs on that.

## Gate 1 — Product (no technical language)

**The problem.** The engine can make approved pictures and turn them into clips, and it can make a reel that its own
last check accepts — but not both at once. It makes a picture only for a thing that appears in more than one shot, and
its last check reads a thing appearing twice as the reel repeating itself. So a reel of different scenes passes and is
made from words, and a reel with a recurring thing gets pictures and is refused.

**The visible outcome.** One new setting. With it on, the engine still pictures recurring things first, exactly as
today, and then gives **its free picture places — up to three pictures a reel in all — to the earliest shots that
have none and show nothing already pictured**, one picture each, of everything that shot shows, made from scratch.
Each is checked the way every picture is, may be remade once if it fails, and if it fails again its shot goes ahead
made from words, as today. A four-shot reel of four different scenes then has **three shots made from checked
pictures and one from words**. A reel may get fewer than three: a shot that shows something already pictured is
passed over rather than drawn again from nothing.

**What it costs.** Up to three more picture calls a reel. **The estimate prices each at 7.5¢** — the rate the engine
plans with — so about 22.5¢ more; **the receipt for a picture made from scratch is 5¢** on today's picture service,
so about 15¢ actually spent, or up to 30¢ if every picture needs its repair. All inside the same cap of six picture
calls a reel, which still leaves at least two for repairs.

**What does not change.** Nothing with the setting off. With it on: every check and threshold, the six-call cap, the
repair rules, and the questions a plan is scored on. **What can move is cost**: a reel's estimate rises by the pictures
it will make, and the engine's choice between two plans, whether it asks for a repaired plan, and whether it admits a
reel under its cap all read that estimate — so a reel close to its cap can be refused or re-planned where today it
would not. The last check on the finished reel is unchanged: this does not make a reel easier to pass.

**The risk, said before anything is built.** Whether a real reel of different scenes, made from pictures, still passes
the last check is not known until one is made — about 190–240¢, and only with the owner's go-ahead.

## Gate 2 — Architecture

**Where each part lives.**

| package                 | what it gains                                                                                                                                             | what it still may not do              |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| `packages/contracts`    | `PlanSettings.pictures: 'recurring' \| 'upToThree'`; `Plan.pictures?: 'upToThree'`; `PictureRecord.role` gains `'standalone'`                             | import anything internal              |
| `packages/pipeline`     | the default; `placePictures(plan, rule)` and the standalone fill; `plannedImageCallsFor` in `stills/ladder.ts`; the stills stage split by role; the entry | import anything but `zod`, do any I/O |
| `packages/domain`       | the `picture.role` enum's TYPE gains `'standalone'` — a text column with no CHECK, so no migration (S-126's form)                                         | know which provider made a picture    |
| `apps/service`          | `CUTROOM_PICTURES`, read, refused and printed in the banner                                                                                               | —                                     |
| `apps/worker`           | the startup refusal checks the rule; the keyframes job and the guarded image port place by **the plan's** rule                                            | import `packages/providers`           |
| `scripts/real-reel.mjs` | sets the setting on, prints it, and its estimate corners follow it                                                                                        | —                                     |

**THE RULE IS STORED WITH THE PLAN, AND THAT IS THE LOAD-BEARING SENTENCE** (review 1, finding 1). The plan stage
prices the pictures a plan will make, and the keyframes job makes them — in another job, possibly in another worker,
possibly after a restart. If each read the rule from its own settings, a plan admitted under `recurring` at 0¢ of
pictures could be resumed by a worker set to `upToThree` and make three pictures nobody admitted (D-083, S-035). So:

- **`build()` writes `pictures: 'upToThree'` into a plan made while the setting is on**, and writes nothing when it is
  off — so every plan row made today, and every plan made with the setting off, is byte-identical to what it was, and
  `planSchema` stays strict with the field optional.
- **Placement reads `plan.pictures ?? 'recurring'`, never `context.settings`** — in the keyframes job, in the stills
  stage, and in the guarded image port's placement. A worker's own setting decides only how the plans IT makes are
  built.

**Placement, whole** (`stills/place.ts`):

```text
placePictures(plan)                       rule = plan.pictures ?? 'recurring'
  placed = today's placement: rank 1 canonical on its first shot; ranks 2 and 3 derived, each on the
           earliest shot showing it that no higher rank holds (D-029 part 4, S-039)
  rule 'recurring' → return placed                                                       exactly today
  rule 'upToThree' → pictured = every subjectId named by a shot that holds a placement
      for each shot in plan order, while placed.length < 3:
        skip it if it holds a picture, names no subject, or names ANY subject in pictured
        placed += { subjectId: its first subjectId, shotUnit, role: 'standalone' }
        pictured += every subjectId the shot names
```

- **Skipped, never redrawn** — the owner's answer. A picture shows every subject its shot names (`briefOf`, "It
  shows: …"), so a standalone on a shot that also shows a pictured subject would draw that subject again from nothing,
  with no reference and no Gate 1S. Such a shot is passed over, and a reel may get fewer than three pictures.
- **`rankSubjects` is not touched**, so the plan score's recurrence term, which reads rank 1, is unchanged.
- **`plannedImageCallsFor(plan)`** lives in `stills/ladder.ts` as `placementCalls(placePictures(plan))` — not in
  `rank.ts`, which `stills/place.ts` imports (a cycle `no-circular` refuses). The plan stage calls it **only when the
  setting is on**; off, it calls exactly today's `plannedImageCalls(rankSubjects(…))`, which differs from the
  placement's calls in S-039's case (`RANK_ALL_HELD`) and must go on differing. On, it is at most 3 with no
  canonical and at most 4 with one — and as few as 0, because the skip rule can leave shots unpictured (a canonical
  subject named in every shot, or shots naming no subject) — never above 4, so `planForkSchema`'s `max(4)` holds and
  the reserve is at least 2.
- **`placementCalls` needs no change**: a standalone already falls into its "1" branch. Check 3 pins it, so a later role
  cannot fall into that branch silently.

**The stills stage, split by role** (`stills/index.ts`; review 1, finding 2). Today it splits the placement list by
POSITION — `const [canonical, ...derived] = placements` — which would make a lone standalone the canonical (best-of-2,
D-047's stop) and put every standalone behind the canonical as a derived picture with its reference and Gate 1S. So:

```text
canonical  = placements.find(p => p.role === 'canonical')
derived    = placements.filter(p => p.role === 'derived')
standalone = placements.filter(p => p.role === 'standalone')
S-061's "slots < 0" refusal first, before every path, as today
no placement at all → completed, as today
canonical present → the canonical ladder, the derived loop, Gate 1S, exactly as today
canonical absent  → none of those blocks runs, and nothing is approved from them
then the standalone loop, in shot order
```

**A standalone picture.**

- **Made once, from scratch**: `references: []`, no framing axis, label `single`; its repair is labelled `repair`, as a
  derived shot's first repair is (S-046), so `pictureIdOf` and the stand-in scripts' `shot-<unit>-<label>` keys need
  nothing new. Its entry is a third arm of `pictureEntry`, strict, with no `varyOn`; its prompt has no framing line and
  no "keep every subject exactly as it appears in the reference picture" line.
- **Through Gate 1**, exactly as every picture (D-042).
- **One repair from the reserve if it fails**, the derived route (S-043): made from scratch again, told Gate 1's
  reasons (D-043); failing again, or with no slot free, **its shot is degraded to words** in S-058's four places, and
  the run goes on. **A standalone never stops the run** — D-047's stop is the canonical's.
- **No Gate 1S**: it compares a derived picture with its canonical (D-049), and a standalone shares no subject with any
  picture, by the placement rule above.
- **After the recurring subjects**: the canonical, its repair, the derived pictures and their repairs have the reserve
  first, as D-048 orders it.
- **Approved** with the others. The clips stage chooses image-to-video from `input.stills` by shot unit, whatever the
  role (`clips/index.ts`), and a still-hold reads no role — so check 10 proves it and no clips code changes.

**The setting.** `CUTROOM_PICTURES` in `readSettings`: absent → `'recurring'`; `'upToThree'` accepted; anything else
refused before anything is built (S-075's form); printed in the banner. **The worker's startup refusal checks the same
closed set**, so a worker handed settings directly, not through the service, cannot fall into a default silently.

**What moves with cost, said once.** With the setting on, a plan's estimate includes its standalone pictures, and Gate
0's cost condition, D-114's choice of which plan a repair keeps, and admission all read the estimate (D-083, D-014).
The repair prompt's cost words — _"fewer subjects shown in two or more shots, cost less"_ — are **left as they are**:
with the setting on a recurring subject still costs one call more than a standalone (a canonical is best-of-2), so
they stay true, if less complete. Recorded in `reel-plan`'s amendment block.

**`scripts/real-reel.mjs`.** Sets `CUTROOM_PICTURES: 'upToThree'` among its five provider defaults, **where an exported
value wins as every other one there does** — so a run with the old rule can be made without editing it — and prints
the rule in its header beside the model and the voice. Its estimate corners become **0 and 4 image
calls** — the fewest and the most a plan can carry under either rule — since only the high corner decides whether the
estimate can exceed the ceiling; the low corner moves from 2 to 0 because the skip rule can leave a plan unpictured.

**What this changes in verified features.** Only by addition, and only on the new value: `reel-plan` (a settings field
and an optional plan field; the new count only when on), `reel-stills` (the role, the split by role, the standalone
loop), `reel-render` (nothing in code; check 10). Each gains an amendment block; all three journeys re-run. **With the
setting off every verified test passes unchanged**, and check 1 proves the default path is today's rather than assuming
it.

## Gate 3 — Program design

**File locations.**

```text
packages/contracts/src/settings.ts         PlanSettings.pictures
packages/contracts/src/cinematic.ts        Plan.pictures?: 'upToThree'
packages/contracts/src/picture.ts          PictureRecord.role gains 'standalone'
packages/domain/src/schema.ts              picture.role's enum type gains 'standalone'
packages/pipeline/src/plan/index.ts        DEFAULT_PLAN_SETTINGS.pictures; planSchema's optional field; build()
packages/pipeline/src/stills/place.ts      placePictures(plan) reading plan.pictures; the fill
packages/pipeline/src/stills/ladder.ts     plannedImageCallsFor(plan)
packages/pipeline/src/stills/prompts.ts    the standalone entry and its prompt
packages/pipeline/src/stills/index.ts      the split by role; the standalone loop
apps/service/src/settings.ts               CUTROOM_PICTURES, refused and printed
apps/worker/src/worker.ts                  the startup refusal checks the rule
apps/worker/src/keyframes-job.ts           placement from the plan, not from settings
apps/worker/src/guarded-image-port.ts      no logic change; its placements include standalones
tests/engine/harness.ts                    startWorker and spawnWorker take an optional settings override (check 6)
scripts/real-reel.mjs                      the setting, its header line, its corners
tests/three-pictures-*.test.ts             the checks below
```

**The checks.**

_Placement and price — pure_

1. `with the setting off, placePictures and the plan stage's planned image calls equal today's on every fixture shape — THREE_RANKS, FIRST_SHOT_HELD, RANK_ALL_HELD, CANONICAL_ONLY, NO_RECURRENCE, FOUR_RANKS, RANK_NOT_SHOT, TWO_SHARED, BOTH_SHARE — including RANK_ALL_HELD's 4 planned calls against its placement's 3; DEFAULT_PLAN_SETTINGS.pictures is 'recurring'; and a plan built with it off carries no pictures field` — S-150, S-039 (reel-stills-placing's own guard, cited).
2. `with 'upToThree', a plan whose subjects never recur places three standalone pictures on its three earliest shots, each on the shot's first subject, and plans 3 image calls` — S-150, D-027.
3. `with 'upToThree', recurring subjects are placed exactly as with the setting off; standalone pictures fill only the earliest shots holding none and naming no pictured subject, up to three pictures; a shot naming no subject is skipped; placementCalls counts canonical 2, derived 1 and standalone 1 exactly; planned calls are never above 4 and the reserve never below 2` — S-150, S-039, D-048.
4. `a plan built under 'upToThree' carries pictures: 'upToThree' and the new planned calls, and its estimate, Gate 0's cost verdict and admission price them` — D-083, D-014, D-114.

_The setting and the stored rule_

5. `readSettings: CUTROOM_PICTURES absent is 'recurring', 'upToThree' is accepted, anything else is refused before anything is built, and the banner prints it; a worker handed a rule outside the closed set refuses to start` — S-075.
6. `a keyframes job run by a worker whose setting differs from the planning worker's places pictures by the PLAN'S rule, in both directions, and its image calls equal the plan's planned calls` — D-083, S-035.

_The standalone picture — through the worker, with the stand-ins_

7. `a standalone entry has no varyOn and renders with no framing line and no reference line; a standalone entry carrying varyOn is refused` — D-032, S-150.
8. `a stills run with 'upToThree' on a plan whose subjects never recur makes three standalone pictures, labelled single, each with references [], each through Gate 1, makes no compare call and no best-of-2, and approves each on its shot` — S-150, D-042, D-049, D-030.
9. `a standalone failing Gate 1 takes one repair from the reserve, labelled repair, made with references [] and told Gate 1's reasons; failing again, its shot is degraded in the four places and the run goes on; with no slot free it is degraded at once` — S-043, S-058, D-043.
10. `a stills run with 'upToThree' on a plan with one recurring subject makes its canonical best-of-2 first and its standalone pictures after, each standalone with references [] and no compare call made for it, and the image calls equal the placement's` — D-048, S-150.

_The clips stage and the real reel's switch_

11. `a video run with 'upToThree' opens each shot holding an approved standalone picture with image-to-video from it, and every other shot with text-to-video` — D-050, S-150.
12. `scripts/real-reel.mjs sets CUTROOM_PICTURES to 'upToThree' among its defaults, prints the rule, and prices its corners at 0 and 4 image calls — read from the script's source, in paid-path check 20's form` — S-150, S-134.

_The journey_

13. `every other test of this feature passes in a child process whose environment holds only PATH and what the operating system needs to start Node, in S-028's form` — S-028, S-111.

**The least confident decisions.** Whether a real reel of different scenes made from pictures still passes Gate 7.
Whether the first named subject is the right label for a many-subject shot's standalone (the picture shows them all).

**ONE THING THE BUILD FOUND, recorded rather than worked around.** Check 12 cannot live in a `three-pictures-*`
file: `paid-path`'s check 20 allows exactly one test file, `tests/paid-path-real-reel.test.ts`, to name the script
that spends, and a check that reads the script names it. So check 12 lives there, beside check 20, titled as this
feature's check 12, and this feature's journey runs checks 1 to 11 and 13 from its own files; check 12 is run by
every `check.mjs` like every other test. Check 13's child therefore expects checks 1 to 11.

## Gate 4 — Slices

- [x] **Slice 1 — the setting, the stored rule, placement and price.** `PlanSettings.pictures`, `Plan.pictures`,
      `PictureRecord.role` and the domain enum type (widened together, so the typecheck stays green); the fill;
      `plannedImageCallsFor`; `build()`; `CUTROOM_PICTURES`; the worker's refusal. **Proves: 1, 2, 3, 4, 5.**
- [x] **Slice 2 — the standalone picture.** The entry and prompt; the stills stage split by role and its loop; the
      keyframes job and guarded image port placing by the plan's rule; `reel-plan`'s and `reel-stills`' amendment
      blocks. **Proves: 6, 7, 8, 9, 10.**
- [x] **Slice 3 — the clips stage, and the real reel's switch.** Check 11; `reel-render`'s amendment block;
      `scripts/real-reel.mjs`. **Proves: 11, 12.**
- [x] **Slice 4 — the journey.** Check 13; this feature's journey, and `reel-plan`'s, `reel-stills`' and
      `reel-render`'s again (S-099's form). **Proves: 13.**

Every check appears in exactly one slice: 5 + 5 + 2 + 1 = 13.

## Outcome

1. **With the setting on, a reel whose shots all differ opens up to three of them from checked pictures.**
2. **With it off, nothing the engine does changes**, and every verified test proves it.
3. **The rule a plan was priced under is the rule its pictures are made under**, whichever worker makes them.

## Evidence (newest first; appended by the journey, never typed by hand)

- 2026-09-23 journey=PASS at 566b975 — every check green; 12 tests in tests/three-pictures-*.test.ts pass

## Divergence (the first broken boundary, or "none")

none

## Deferred

1. **The new rule as the default** — the owner chose a setting first; made the default once a real reel proves it.
2. **A real reel with the setting on** — about 190–240¢, only with the owner's go-ahead.
3. **A picture for every shot** — put to the owner and not chosen; a larger change to D-027's cap and the reserve.
4. **A reference-carrying picture for a shot that shows a pictured subject** — put to the owner and not chosen; such
   shots are skipped.
5. **The repair prompt's cost words under the setting** — left as they are, still true; revisited if a repair is seen
   to follow them the wrong way.
6. **Parallel shots** (D-023, S-115) — held by the owner.

## Gate review 1 — 2026-09-23, adversarial reviewer, same session

Read against the gates, S-148 to S-150, and the code at `36d8842`. **Twelve findings, all fixed.**

1. **The plan job and the keyframes job could read different rules**, so a resumed job could make pictures nobody
   admitted. **Fixed:** the rule is stored with the plan; placement reads only the plan; check 6.
2. **The stills stage splits placements by position**, so a lone standalone would become the canonical and every
   standalone a derived picture. **Fixed:** split by role; the canonical, derived and Gate 1S blocks skipped with no
   canonical; checks 8 and 10 assert `references: []` and no compare call.
3. **`plannedImageCallsFor` in `rank.ts` would make an import cycle.** **Fixed:** `stills/ladder.ts`.
4. **Slice 1 would leave the typecheck red.** **Fixed:** every role type widens in Slice 1; `guarded-image-port.ts`
   listed.
5. **A standalone could redraw a pictured subject from nothing.** **Fixed:** put to the owner — such shots are skipped.
6. **The supersession wording was not exact.** **Fixed** in S-150: D-029 parts 1 and 3 and D-030's table, in part.
7. **"How plans are chosen does not change" was false through cost.** **Fixed:** Gate 1 and Gate 2 say what moves;
   the repair's cost words are left, with the reason.
8. **Nothing proved real reels turn the setting on.** **Fixed:** check 12; the rule printed; the corners stated.
9. **Check 1's fixture list did not match the fixtures.** **Fixed:** every shape named, `RANK_ALL_HELD` included.
10. **The cost figures were wrong.** **Fixed:** estimate 7.5¢, receipt 5¢ from scratch, reserve at least 2.
11. **Only `readSettings` refused a bad rule.** **Fixed:** the worker's refusal too; check 5.
12. **Labels and `placementCalls` were unspecified.** **Fixed:** `single` and `repair`; check 3 pins the count.

## Gate review 2 — 2026-09-23, adversarial reviewer, same session

The same reviewer, on the revision: every first-round fix verified in the gate text; Gates 1 and 4 APPROVED; three
findings, all fixed, and a confirmation pass APPROVED Gates 2 and 3.

1. **"3 with no canonical or 4 with one" was false under the skip rule**, which can leave a plan with 2, 1 or 0
   pictures. **Fixed:** at most 3 or 4, as few as 0; the real reel's corners become 0 and 4; check 12 says so.
2. **Check 6 needed two workers with different settings, and the harness gives every worker one.** **Fixed:**
   `tests/engine/harness.ts` takes an optional settings override, listed in Gate 3.
3. **Two wording slips in S-150.** **Fixed.**
