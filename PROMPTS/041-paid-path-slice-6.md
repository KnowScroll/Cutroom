# 041 — paid-path: Slice 6

- **For:** session 41
- **Feature:** `paid-path` — [`docs/features/paid-path.md`](../docs/features/paid-path.md)
- **Work:** Slice 6 of 8 — the fal video adapter and the lease; checks 14, 15, 16 and 17
- **Written:** 2026-09-21, at the end of session 40, after Slice 5 was green and S-124 was recorded
- **Run:** session 41

Paste everything inside the block below as the session's first message.

```text
Build paid-path's Slice 6 — the fal VIDEO adapter, the download, the classification, the lease floor and the one
worker. It is the FOURTH real adapter and the SECOND on fal's queue, and it proves checks 14, 15, 16 and 17 of
docs/features/paid-path.md.

NOTHING IN THIS SLICE SPENDS MONEY AND NO TEST NEEDS A KEY. Every test runs against recorded wire (S-111); every
default stays 'fake' (S-108); reel-takes' check 26 and reel-render's check 50 keep their exact form and stay green.
The owner's fal credit is owed before Slice 8 and is NOT needed here.

Start:
1. Run `node scripts/decisions.mjs`. If it says commits are unpushed in the steering repository, say so and stop.
2. Read CLAUDE.md; then JOURNAL.md's sessions 36 to 40 entries in full — Slice 1 built apps/service and
   packages/providers/src/env.ts, Slice 2 the twentieth rule and the recorded-wire harness, Slice 3 the first real
   adapter and the loopback wire server, Slice 4 the narration adapter and the presigned-URL sweep, Slice 5 the fal
   image adapter, D-028's closed registry, the queue driver in packages/providers/src/fal/queue.ts and the frame
   read off the file in packages/providers/src/fal/frame.ts.
3. Read docs/features/paid-path.md whole, and especially Gate 2's "The video" paragraph, "Getting a local picture to
   fal", "What is transient, and what is a fault", "The lease a real job needs", and checks 14, 15, 16, 17 and 21.
4. Decisions, each read whole, in DECISIONS.md: S-124 (THE QUEUE DRIVER, the two base URLs, the thrown carrier and
   why the frame is read off the file — Slice 6 reuses all four), S-123, S-122, S-114 (fetch and zod, no SDK, and
   its escape hatch, still attached to uploadReference alone), S-113 (THE LEASE FLOOR AND THE ONE WORKER), S-111,
   S-110, S-096, S-115 (sequential — do not make anything concurrent), S-080, S-059. In
   steering-ref/steering/DECISIONS.md: D-007 (H3 Turbo is the ONLY video path, hard-locked — read every word),
   D-018 (the caller's seed), D-019 (image-to-video has NO aspect_ratio field, 768P, whole seconds 5 to 15,
   prompt_expansion_mode REQUIRED, and NO seed returned), D-022, D-072 (expanded_prompt reaches the receipt and no
   gate), D-086, D-087, D-002 (the lease).
5. Read the code this slice changes: packages/providers/src/fal/{queue,image,upload,registry,frame}.ts — the queue
   driver, its classification and its receipts are the pattern, and the video adapter is its second caller;
   packages/providers/src/ports.ts (videoPort, which refuses today); packages/providers/src/fake/video.ts (the
   stand-in whose contract the real one must meet); packages/pipeline/src/clips/validate.ts (S-080's validator,
   which already encodes the no-aspect_ratio rule); apps/service/src/settings.ts and service.ts; and
   steering-ref/scripts/spikes/h3-video.mjs, which is the wire D-019 drove LIVE on 2026-09-03.

What Slice 6 builds:
- `packages/providers/src/fal/video.ts` — the real VideoPort over fal's queue, through the SAME `runQueued` Slice 5
  wrote. 768P ALWAYS, whole seconds 5 to 15, the caller's seed, `prompt_expansion_mode`, and NO `aspect_ratio` on
  image-to-video — the trap that would ship a 16:9 clip into a 9:16 product. The answer's `expanded_prompt` goes on
  the receipt and is shown to no gate (D-072).
- The clip DOWNLOADED under the artifact root, PROBED before the answer returns, and recorded BY ITS LOCAL PATH —
  no provider URL is stored, and a fal result URL expires (D-022, D-086, D-087). The probe is the ffmpeg MediaPort
  this repository already has; decide and record how the video adapter is given it, since `PortOptions` carries the
  tools but the image port was deliberately not handed them.
- A local reference picture uploaded through the ONE `uploadReference` function Slice 5 wrote, and no second one.
- The receipt's cost: the CONFIGURED RATE applied to THE SECONDS ASKED FOR, rounded up as the guard rounds (S-059)
  — fal's answer carries no price. Decide where that rate lives: the image rate is D-028's registry entry, and
  D-007 hard-locks ONE video path, so there is no registry to read it from. Record what you choose.
- The CARRIER: `VideoAnswer` HAS an `unavailable` arm that S-096 built and reel-takes verified, so this adapter
  ANSWERS its transients where the image adapter throws them (S-123's rule, S-124's reading of it). A queued job
  answering 429 or 5xx, and a poll that times out, are unavailable; a rejected request throws; and a job the
  provider accepted and then failed throws CARRYING THE PROVIDER'S MESSAGE.
- Check 17's other half: a service given any real adapter refuses a lease shorter than the floor, naming the
  figure, AND IT STARTS EXACTLY ONE WORKER (S-113, D-002). Slice 1 proved the refusal against an adapter that did
  not exist; prove it now against one that does, and prove the one worker.
- The fixtures checks 14, 15 and 16 need, each REDACTED BEFORE IT IS COMMITTED (check 21 reads them all, and it
  forbids a query string — a fal result URL is exactly the shape that must not be recorded).
- tests/paid-path-video.test.ts (14, 15, 16, 17) — red first.

How to work:
- Never weaken a check or a test to reach green. If an assertion cannot hold as written, that is a finding to put
  to the owner with AskUserQuestion, as sessions 36 to 40 did — not something to re-aim quietly.
- No test calls a provider, no test needs a key, and no npm dependency is added (S-111, S-114).
- Nothing outside packages/providers/src may read a key — `node scripts/drift.mjs` reads the source for that.
- No absolute path anywhere (D-086). No slug or endpoint spelled at a call site that a test can find.
- Once green, run a break campaign as sessions 30 to 40 did — the runner in .tmp/campaign/ (move session 40's
  breaks.mjs and results.jsonl aside to s40/ first). Break at least: `aspect_ratio` sent on image-to-video;
  480P accepted; a duration outside 5 to 15, and a fractional one; the caller's seed replaced by the provider's or
  by a fresh one; `prompt_expansion_mode` dropped; the clip's provider URL recorded instead of its local path; the
  clip written outside the artifact root; the clip not probed before the answer returns; `expanded_prompt` shown to
  a gate; the rate hardcoded at the call site; a 429 THROWN instead of answered unavailable; a failed job's message
  swallowed; the lease floor not applied to a real adapter; two workers started. Add a control caught by nothing.
  Record what each break was caught by, and fix — by ADDING — any break caught by nothing that a check's words
  promise to catch. Run the campaign inside one turn.
- Tick Slice 6 in docs/features/paid-path.md only when checks 14 to 17 pass by number and check.mjs is green.

Do NOT in this slice: build the sensor adapter (Slice 7); write scripts/real-reel.mjs; make anything concurrent
(S-115); build lease renewal, which is deferred and named; run any journey — paid-path's is Slice 8's, and the
re-runs of the five verified features' journeys are Slice 8's too (S-099's form).

Finish:
- `node scripts/check.mjs` green, with the new test count stated by a TAP count. NO journey.
- A JOURNAL.md entry: intent; what changed (files, S-entries, +N tests); observed — what was red first and why, the
  break campaign's table with what each break was caught by, anything caught by nothing and what was done; next.
- Set this prompt's Run line to session 41 in PROMPTS/041-paid-path-slice-6.md and in PROMPTS/README.md (S-065), and
  write PROMPTS/042 for Slice 7.
```
