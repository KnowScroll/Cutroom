# 06 — Gates

This document is a reference for the gates — the checks that decide whether a plan, a picture,
a take or an assembled reel passes. Read it when you need to know what a gate looks for, why
a run stopped at a given gate, or what a gate's failure reasons mean.

## The gate order

```
['0', '1', '1S', '2', '3', '4', '5', '7']
```

There is no `6` — there is no chain, and every reel is a cut (S-067). There is no `8` — Gate
8 belongs to KnowScroll; the engine never holds what Gate 8 would judge (S-068).

## Gate 0 — `gate0`

`packages/pipeline/src/gates/gate0.ts`. Pure, counting only — no model call, no port import.

Input: a `Plan`, the request, the per-reel cap, the `PlanSettings`. Output: a
`Gate0Verdict`:

```ts
{ outcome: 'accept' | 'fail', failed: Gate0Condition[] }
```

The four conditions (D-014, D-063, D-111, D-114):

1. **`coverage`** — every claim in the request is referenced by a sentence in some shot's unit.
   `coverage` is computed from the plan's shots and units, not by inference.
2. **`criteria`** — every supplied criterion is on the plan, in the same list, with the same
   id and text (D-034, D-096).
3. **`shape`** — shot count in `[4, 6]`; total duration in `settings.totalSecondsBounds`
   (default `[35, 45]`); every shot in `[5, 15]` seconds.
4. **`cost`** — `plan.estimateCents <= capCents`.

A plan that fails any condition is recorded with every condition it failed. That is how
D-114 counts them.

`gate0` runs on each plan of the fork and (if both fail) on the repair.

## Gate 1 — `gate1`

`packages/pipeline/src/gates/gate1.ts`. One call to the model (reconciler role, temperature 0)
on a picture by itself. The picture's pixels come from the sensor port; the criteria come
from the shot.

The picture fails Gate 1 if any of the supplied `mustShow` criteria is not visible, or any of
the supplied `mustNotShow` criteria is visible. A canonical that fails Gate 1 has the reserve
slot for one repair (D-048); a derived that fails Gate 1 has the same.

Output: `Gate1Verdict` with `outcome: 'accept' | 'fail'` and the failed criteria, plus
suspicion data feeding Gate 1S.

## Gate 1S — `gate1s`

`packages/pipeline/src/gates/gate1s.ts`. A derived picture against the canonical. Asks the
model: do the two pictures look like they are of the same subject, in the same style, at the
same level of detail? (D-049, S-041, S-042.)

The suspicion threshold (`settings.suspicionThreshold`, default `0.25`) gates the call: a
derived whose Gate 1 suspicion is below the threshold skips the witness call entirely (D-049).

A derived that fails 1S gets one repair from the reserve slot.

## Gate 2 — `gate2`

`packages/pipeline/src/gates/gate2.ts`. Technical check on the assembled take. Uses the media
port to read the file. Checks:

- Codec matches the manifest's `videoCodec`.
- Geometry matches the manifest's `width`, `height`.
- Frame rate matches `fps`.
- Aspect is within `settings.technical.aspectTolerance` (default `0.01`).
- No black or frozen frames beyond `blackSeconds` / `frozenSeconds` (default `0.5` / `1.0`).

Output: `Gate2Verdict`.

## Gate 3 — `gate3`

`packages/pipeline/src/gates/gate3.ts`. Sound check on the take. Uses the media port to read
the audio. Checks:

- Audio duration vs. the narration's words.
- No silence beyond the threshold.

Output: `Gate3Verdict`.

## Gate 4 — `gate4`

`packages/pipeline/src/gates/gate4.ts`. Witness check. Asks the model: does the take show
what the picture was meant to show? The witness is `MiniMax-M3` (the only model in the family
that accepts images — D-006).

Output: `Gate4Verdict` with `outcome: 'accept' | 'fail'` and the reason.

## Gate 5 — `gate5`

`packages/pipeline/src/gates/gate5.ts`. Brief check. Asks the model: does the take match
the narration's intent? The brief is supplied as the take's text plus the planned picture's text
plus the request's `mustShow` / `mustNotShow` criteria.

Output: `Gate5Verdict`. The first accepted take is the shot's (D-030); three failed takes
send the shot to a hold (D-055, S-097, S-098).

After every shot is done, a final gate-5 check fires: a `mustShow` criterion with no accepted
take that shows it stops the reel for `rule: 'gate-5'` (S-072, S-090).

## Gate 7 — `gate7`

`packages/pipeline/src/gates/gate7.ts`. The cut check. Asks the model four questions against
the frame strip (three frames per shot — first, middle, last; D-051):

1. "Are the shots in a sensible order?"
2. "Does the pacing work?"
3. "Does every shot sit well beside the shot that follows it?"
4. "Do the burned captions follow the narration?"

Any `no` fails Gate 7 (S-074). A reel that fails Gate 7 has no edit to try, so the reel
stops (S-066).

The four questions are the only Gate 7 questions (S-158). The fifth question — "does every
shot show something no other shot repeats?" — was removed because a reel that shows how a
thing works shows that thing again and again.

## Failure kinds vs. test kinds

The gates are checks on a stage's output. They are not the same as `FailureKind`. A gate
that returns `outcome: 'fail'` means the stage stopped, not crashed. `FailureKind` is decided
from the exception's class at the moment it is caught (`failureKindOf`).

A gate that fails is `status: 'stopped'`, `reason: 'rule'`, `rule: <gate-name>`. A thrown
exception is `status: 'failed'`, `failure: <FailureKind>`. The two never overlap.

## The question event vs. the verdict event

Every gate's verdict becomes a `verdict` event in `run_event`:

```ts
{ type: 'verdict', gate: '0' | '1' | '1S' | '2' | '3' | '4' | '5' | '7', outcome: 'accept' | 'fail', shotId?, … }
```

`gate: '0'` is the plan gate. `gate: '1'` is each picture's Gate 1. `gate: '1S'` is each
derived picture's Gate 1S. The rest are per-take.

A held shot's `degraded` event is:

```ts
{
  type: ('degraded', shotId, reason)
}
```

A `gate: '5'` verdict event on a held shot is its third take's outcome.

## How gates are recorded in the engine's database

- Plan stage: each `PlanRow` carries its Gate 0 verdict.
- Stills stage: each `PictureRecord` carries its Gate 1 verdict (and Gate 1S for derived).
- Clips stage: each `TakeRecord` carries its Gate 2 / 3 / 4 / 5 verdicts.
- Render stage: the `render.gate7` JSON column carries Gate 7's verdict.

The `RunRecord` carries every picture, take and verdict, in `seq` order, with each check it
reached (S-046). A resumed run's kept pictures' verdicts are events **once**, when the ladder
reaches them.
