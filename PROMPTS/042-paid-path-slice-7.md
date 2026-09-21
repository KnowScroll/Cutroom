# 042 — paid-path: Slice 7

- **For:** session 42
- **Feature:** `paid-path` — [`docs/features/paid-path.md`](../docs/features/paid-path.md)
- **Work:** Slice 7 of 8 — the real sensor; checks 18 and 19
- **Written:** 2026-09-21, at the end of session 41, after Slice 6 was green and S-125 was recorded
- **Run:** session 42

Paste everything inside the block below as the session's first message.

```text
Build paid-path's Slice 7 — the real SENSOR, on the ffmpeg this machine already has, and its text step through the
model port. It is the FIFTH and LAST real adapter, and the only one that costs nothing and reads no key. It proves
checks 18 and 19 of docs/features/paid-path.md.

NOTHING IN THIS SLICE SPENDS MONEY AND NO TEST NEEDS A KEY. The measures are local ffmpeg (S-112); the text step is
one vision call through the model port, proven against recorded wire (S-111). Every default stays 'fake' (S-108);
reel-takes' check 26 and reel-render's check 50 keep their exact form and stay green.

Start:
1. Run `node scripts/decisions.mjs`. If it says commits are unpushed in the steering repository, say so and stop.
2. Read CLAUDE.md; then JOURNAL.md's sessions 36 to 41 entries in full — Slice 1 built apps/service and
   packages/providers/src/env.ts, Slice 2 the twentieth rule and the recorded-wire harness, Slice 3 the model
   adapter, Slice 4 the narration adapter, Slice 5 the fal image adapter with D-028's registry, and Slice 6 the fal
   video adapter, the split between a per-request timeout and a whole-job wait, and the lease floor computed from
   that wait.
3. Read docs/features/paid-path.md whole, and especially Gate 2's "The sensor" paragraph and checks 18, 19, 20 and
   22.
4. Decisions, each read whole, in DECISIONS.md: S-112 (THE SENSOR MEASURES WITH FFMPEG AND READS TEXT WITH ONE
   VISION CALL — read every word, including why a text step that always passes is weakening a gate), S-125, S-124,
   S-122 (the carrier for a MODEL call is a thrown type, which the text step's failure rides on), S-111, S-110,
   S-075 (ffmpeg on PATH, the ready() gate, and why a process starts only behind a port), S-050, S-044. In
   steering-ref/steering/DECISIONS.md: D-086, D-087, and whatever S-112 cites for the three measures.
5. Read the code this slice changes: packages/providers/src/fake/sensors.ts (the stand-in whose contract the real
   one must meet), packages/providers/src/ffmpeg/{media,tools}.ts (how a process is started, how a filter's log is
   parsed, and what `ready()` already demands), packages/providers/src/ports.ts (sensorPort, which refuses today),
   packages/contracts' PictureSensorPort, and the stills stage's use of it.

What Slice 7 builds:
- `packages/providers/src/ffmpeg/sensors.ts` — sharpness from `blurdetect`, brightness from `signalstats`,
  similarity from `ssim`, each in the range the port declares, and a file that is not a picture measuring
  UNREADABLE rather than throwing. No new dependency, no spend, no key. The detectors report on stderr at info
  level, so no quieter log level (CLAUDE.md).
- The TEXT STEP as ONE vision call through the model port, whose strings are the sensor's answer — and a failed
  call THROWS rather than answering "no text", because a text step that always passes is a gate weakened (S-112).
  Decide and record how the sensor is handed the model port, since `PortOptions` carries neither one today and the
  image port was deliberately handed no tools while the video port was handed a probe (S-125).
- `packages/providers/src/ports.ts` — `sensorPort('local', …)` stops refusing. It is the LAST adapter that refuses
  by name, so `tests/paid-path-refusals.test.ts`'s "named and not built" assertion has nothing left to point at:
  decide what that test becomes and say so, rather than deleting it.
- Whatever `ready()` must gain, if the three filters are not already among `REQUIRED_FILTERS` (S-075).
- tests/paid-path-sensor.test.ts (18, 19) — red first.

How to work:
- Never weaken a check or a test to reach green. If an assertion cannot hold as written, that is a finding to put
  to the owner with AskUserQuestion, as sessions 36 to 41 did — not something to re-aim quietly.
- No test calls a provider, no test needs a key, and no npm dependency is added (S-111, S-114).
- Nothing outside packages/providers/src may read a key — `node scripts/drift.mjs` reads the source for that.
- No absolute path anywhere (D-086). No filter name or endpoint spelled at a call site that a test can find.
- Once green, run a break campaign as sessions 30 to 41 did — the runner in .tmp/campaign/ (move session 41's
  breaks.mjs and results.jsonl aside to s41/ first). Break at least: a measure read from the wrong filter's log; a
  range that lets a value outside it through; an unreadable file measuring as a good one; a file that is not a
  picture throwing instead of measuring unreadable; the text step answering "no text" on a failed call; the text
  step making more than one call; the sensor starting a process outside packages/providers; a quieter log level, so
  the detectors report nothing; and a key read where the sensor runs. Add a control caught by nothing. Record what
  each break was caught by, and fix — by ADDING — any break caught by nothing that a check's words promise to catch.
  Run the campaign inside one turn.
- Tick Slice 7 in docs/features/paid-path.md only when checks 18 and 19 pass by number and check.mjs is green.

Do NOT in this slice: write scripts/real-reel.mjs or make the real reel (Slice 8); make anything concurrent (S-115);
build lease renewal; run any journey — paid-path's is Slice 8's, and the re-runs of the five verified features'
journeys are Slice 8's too (S-099's form).

Finish:
- `node scripts/check.mjs` green, with the new test count stated by a TAP count. NO journey.
- A JOURNAL.md entry: intent; what changed (files, S-entries, +N tests); observed — what was red first and why, the
  break campaign's table with what each break was caught by, anything caught by nothing and what was done; next.
- Set this prompt's Run line to session 42 in PROMPTS/042-paid-path-slice-7.md and in PROMPTS/README.md (S-065), and
  write PROMPTS/043 for Slice 8 — the one slice that SPENDS, so its prompt must name the fal credit the owner still
  owes and the ceiling the run is bounded by (S-110).
```
