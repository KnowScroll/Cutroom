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

`packages/pipeline/src/gates/gate1.ts`. Four steps on one picture, in order, each recorded on the
picture's row as it completes (D-042, S-040, S-041):

1. **technical** — the sensor port measures the file. It fails if the file is not a readable
   image or is not exactly 9:16. A technical failure stops the gate there.
2. **text** — the words on the picture are read with the model's `readText` call (role witness,
   handed to the sensor) and recorded. This step never fails.
3. **witness** — one `observe` call (role witness, `MiniMax-M3`) is shown the picture and a
   temperature, nothing else — never the brief (I-8). Its answer is parsed at the gate; an answer
   the schema refuses is kept and asked once more, told only the schema's issues, and a second
   refusal fails the run (S-156).
4. **reconcile** — one `structured` call (role reconciler) holds the observation against the
   shot's subjects and its **presence** criteria (D-043). The reconciler answers fixed fields and
   code decides: the picture fails if a subject the shot shows is not shown, a shown subject is
   clipped by the edge of the frame, a subject's count does not match, a `mustShow` is not shown,
   or a `mustNotShow` is shown.

The verdict (`picture.gate1`) is `accept` only if every step accepted. A canonical whose two
candidates both fail gets one repair; if that fails too, the run stops for rule `gate-1`. A derived
or standalone picture that fails takes a repair if a reserve slot is free (at most two a shot);
otherwise its shot is degraded.

## Gate 1S — `gate1s`

`packages/pipeline/src/gates/gate1s.ts`. A derived picture that passed Gate 1, held against the
chosen canonical (D-049, S-045). The pixel similarity of the two pictures only **routes** it:

- if the two shots share no subject, the picture is accepted with no call;
- otherwise suspicion = 1 − the sensor port's similarity of the two whole pictures; at or below
  `suspicionThreshold` (default `0.25`) the picture is accepted with no call;
- above it, one `compare` call (role judge) is shown both pictures and the names of the shared
  subjects, and decides. Only the judge can fail a picture here (I-16).

A derived picture that fails 1S gets a repair if a slot is free and its shot has had fewer than
two; otherwise its shot is degraded. The verdict is stored in `picture.gate1s`.

## Gate 2 — `gate2`

`packages/pipeline/src/gates/gate2.ts`. Technical check on a take. The media port probes the clip
and scans it once for black, frozen and silent stretches and loudness. The take fails when:

- the file is not readable or has no video stream (it is then not scanned);
- its width over its height differs from 9/16 by more than `settings.technical.aspectTolerance`
  (default `0.01`);
- it has a black stretch of at least `blackSeconds` (`0.5`) or a frozen stretch of at least
  `frozenSeconds` (`1.0`).

Its length, frame rate, sample rate and channels, a missing sound track, silence and loudness are
recorded and fail nothing — the render conforms them later. A Gate 2 failure decides the take:
Gates 3 to 5 do not run on it.

## Gate 3 — `gate3`

`packages/pipeline/src/gates/gate3.ts`. Text and sound on a take, through the media port:

- the words read off the clip are recorded and never fail a take (no text policy exists — S-041);
- sound classified as **speech** fails the take, and so does sound classified as **music**: the
  video model's sound must be ambience only, and every clip prompt forbids both.

On the ffmpeg media port these two readings come from the stand-in script (default: no words,
neither speech nor music), so on a real run Gate 3 has not yet heard a clip (P-007).

## Gate 4 — `gate4`

`packages/pipeline/src/gates/gate4.ts`. The witness on a take: one `observe` call (role witness,
`MiniMax-M3`, the only model in the family that accepts images — D-006) shown the whole clip and
a temperature, nothing else. Its answer is parsed as a clip observation; a refused answer is kept
and asked once more, and a second refusal fails the run. Once it parses, Gate 4 accepts; the
observation is what Gate 5 judges. Each verdict records the sampling limitation of D-051.

## Gate 5 — `gate5`

`packages/pipeline/src/gates/gate5.ts`. The brief on a take: one `structured` call (role
reconciler) holds Gate 4's observation against the shot's subjects and the take's criteria, and the
reel's unclaimed `mustShow`. Code decides: the take fails when a subject the shot shows is not
shown, a subject's count does not match, a claimed `mustShow` (presence or event) is not shown, or
a `mustNotShow` is shown. A clipped entity fails nothing here (a subject leaving a moving frame is
motion).

The first accepted take is the shot's (D-030). After three failed takes the ladder decides
(`clips/ladder.ts`): a shot with a chosen picture and no `event` mustShow is held on that picture
(D-055, S-097, S-098); any other shot stops the reel for the rule of the third take's lowest
failing gate.

After every shot is done, a final gate-5 check fires: a `mustShow` that no sentence claims, shown by
no accepted take, stops the reel for `rule: 'gate-5'` (S-072, S-090).

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
{ type: 'verdict', gate: '0' | '1' | '1S' | '2' | '3' | '4' | '5' | '7', outcome: 'accept' | 'accept_with_label' | 'fail', shotId? }
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
