# Cutroom — where the engine stands, 2026-09-20

A status report, not a decision. Nothing here binds; the authority is `steering-ref/steering/DECISIONS.md`
(D-001 to D-115) and this repository's `DECISIONS.md` (S-001 to S-106).

## The short answer

The engine is **built end to end on the free path**: a caller can ask for a plan, for approved still
pictures, or for a finished MP4 with voice and captions, over HTTP, and get one back — for $0, because
every model, image, sensor, clip and voice provider is a **stand-in**. The one real tool is ffmpeg.

**Five of six known features are done or nearly done. The sixth — connecting real, paid providers — is
not planned yet, and it is the only thing between here and a real reel in KnowScroll.**

| Part            | What it is                              | State                             |
| --------------- | --------------------------------------- | --------------------------------- |
| `reel-contract` | How anything outside asks for a reel    | **verified** (41 tests)           |
| `reel-plan`     | A brief becomes a chosen plan           | **verified** (50 tests)           |
| `reel-stills`   | A plan becomes approved still pictures  | **verified** (63 tests)           |
| `reel-render`   | Approved stills become a finished video | **verified** (106 tests)          |
| `reel-takes`    | Retries, holds, restarts                | **5 of 6 slices**, gates approved |
| `video-edits`   | Free edits to a made video              | planned, gates not written        |
| paid path       | Real providers, real spend              | **not planned**                   |

Size: ~18,200 lines of source, ~27,100 lines of tests, 97 test files, 339 tests green as of session 33.
104 modules under 19 enforced boundary rules, 0 violations. 34 sessions, 221 written decisions.

## What each part does

### `reel-contract` — the agreement

The caller-facing types and the HTTP routes: `POST /v1/runs`, then `GET` status, events, result, record,
and `POST .../cancel`. One request shape carries the brief, the criteria, the claim labels, the style, the
spend ceiling and how far to go (`until: 'plan' | 'stills' | 'video'`). Answers are one of: the finished
video, the budget figures that stopped it, the rule and step that stopped it, cancelled, or an internal
error. The engine receives criteria and claim labels — **never evidence** — and returns no sources card.
Contract version 1, frozen. The `record` route returns how the reel was made: every picture chosen and,
since `reel-takes`, every clip attempted.

### `reel-plan` — the brief becomes a plan

Splits a script into shots, drafts candidate plans through the language-model port, ranks them, estimates
what each would cost, and admits or refuses the run against the per-reel cap and the caller's ceiling —
all for $0. Gate 0 checks the plan itself. A run that selects no plan ends with its reason written down.

### `reel-stills` — the plan becomes pictures

Makes at most three pictures — the reel's most-shown subject plus up to two recurring ones — two tries
each, and checks every one: brightness, the subject's presence, what the shot must show and must not
show. Refuses at the ceiling on the pictures' own figure, not the whole plan's. Approved pictures are the
only thing the video stage is allowed to start from.

### `reel-render` — pictures become a video

Narration with real word timings, a clip per shot, then one ffmpeg pass: every input conformed to one
profile, shots joined by cut, captions burned from the word timings, voice over the mix. Gates 2 to 5 and
7 check each clip and the finished file — black frames, frozen frames, a voice inside the clip's own
sound, and what the shot must show — and every output is **measured with ffprobe, never assumed**. A clip
too long for its narration is trimmed at the tail. The result carries the video path, the stills, and the
list of degradations in the order they happened.

### `reel-takes` — when a clip comes out wrong

Three takes a shot, each new take told every earlier take's failure so it is a correction and not a
re-roll. At the cap, the shot is **held on its approved picture** for the length of its narration with a
slow push in, when that picture already passed for everything the shot needs; otherwise the reel stops and
says which three takes failed and why a hold could not cure it. A provider failing for a moment is asked
again on its own counter and costs the shot none of its three takes. A run interrupted partway **keeps
every finished narration and clip** and carries on from the first shot not finished. Slices 1 to 5 are
built; **Slice 6 — every ending's events, the no-secrets check, and the journeys — is what remains.**

### The plumbing

- `apps/api` — the service. Stores what it is asked, reads what the worker wrote, **never calls a
  provider**. Loopback only, no authentication (Phase 1, deliberate).
- `apps/worker` — one job at a time: plan, keyframes, clips, assemble. Handed its ports, so it cannot
  construct anything that spends. Refuses to start without ffmpeg and ffprobe.
- `packages/domain` — tables, migrations, the job queue, the budget ledger.
- `packages/pipeline` — pure functions only: no I/O, no database, no provider, one npm dependency.
- `packages/providers` — the stand-ins, plus the two real ffmpeg adapters.

## What is NOT built

1. **Every provider but ffmpeg is a stand-in.** The language model writes canned plans; the image
   stand-in writes real PNGs of flat colour; the video stand-in writes real MP4s carrying a tone; the
   voice stand-in writes real WAVs. The files are real and measurable — the content is not a reel anyone
   would watch.
2. **The paid path has no feature file, no gates, no slices.** It owns: the real language-model adapter,
   the real image adapter and its model registry, real clip and voice adapters, which provider errors are
   transient, and whether a provider bills a failed call.
3. **`video-edits`** — reorder, retime, recaption, reselect-take — is a file of open questions, not a plan.
4. **Known limits carried on purpose:** the stills stage has no checkpoints (a restart pays for pictures
   again); retries are not in the estimate, so a run can spend up to three times its clips' share before a
   cap stops it; the push on a held shot is unmeasured; one job at a time, so a backoff delays every other
   run.

## When KnowScroll can start using it

**Now, for wiring.** The contract is frozen at version 1 and the service answers every route. KnowScroll's
caller — the Quartermaster — can be written and tested against the real engine today: submit a run, poll
status, stream events, fetch the result, fetch the record, cancel. Every code path KnowScroll will use in
production is the path it would use now. What comes back is a stand-in reel.

Requirements to run it that way: same machine (loopback, no auth, and the result's video path is a local
path under the engine's artifact root), and ffmpeg 8.x on PATH.

**For real reels, two things must happen, in order:**

1. **`reel-takes` Slice 6**, then its journey and `reel-render`'s, `reel-stills`' and `reel-plan`'s run
   again. One session's work, roughly.
2. **The paid-path feature** — four gates written and adversarially approved, then its slices. This is a
   feature the size of `reel-stills` or larger: five real adapters, a model registry with admission gates,
   transient-error classification per provider, and the first time the engine can actually spend money.
   Nothing about it is settled yet, so no honest date exists for it.

Until step 2 lands, the sensible plan is: **build the KnowScroll side against the stand-in engine now**,
so that when real adapters arrive, nothing on KnowScroll's side has to change.
