# 053 — `parallel-shots`' gates, on the figures real reels measured

- **For:** session 53
- **Feature:** `parallel-shots` (S-115: D-023's one latency lever, unbuilt and named)
- **Work:** write `parallel-shots`' four gates and have them reviewed; the owner's questions before the product gate.
  **`resume-failed`'s build is 054**, in a session of its own (S-160: one phase a session).
- **Written:** 2026-09-25, at the end of session 52, at the owner's word in session 51 that `parallel-shots`' gates
  follow `resume-failed`'s
- **Run:** not yet

**Where things stand.** Session 52 wrote `resume-failed`'s four gates on sixteen owner answers and three more the first
review raised (S-161 to S-164), and took them through adversarial review (their state: `docs/features/resume-failed.md`,
its `Gates:` line and its review sections). It put the three open reviews to the owner (S-165): Gate 7's caption
question is answered by an exact comparison, a feature with its gates (`docs/features/caption-match.md`); nano-banana-2
and seedream leave the image registry, planned with their amended checks; P-003 is accepted for now. And step 4
(S-166): the composed hold and diagram shots become features — `docs/features/composed-hold.md` first, then
`docs/features/diagram-shots.md` — with words on screen from the narration and the criteria only, and Chrome a machine
dependency like ffmpeg.

**The figures `parallel-shots` is planned against** (`docs/research/hyperframes.md`, session 51; `docs/context.md`'s
runs): run `74bb96a0…` completed in 10.9 minutes — plan 97 s, stills 197 s, **video 359 s, six shots in turn, about 55 s
each** — every shot accepted on its first take. The video stage is the long pole the lever is for. A retake adds a
clip's minute to its shot; the first real reels' clips took 1.5 to 2 minutes each (`resume-failed.md`).

Paste everything inside the block below as the session's first message.

```text
Write parallel-shots' gates, on the figures real reels measured.

1. `node scripts/decisions.mjs`. If it says commits are unpushed in the steering repository, say so and stop.
   Read docs/context.md first, then CLAUDE.md; open JOURNAL.md, DECISIONS.md and docs/research/hyperframes.md only by
   the headings they name, never whole (S-160). `node scripts/check.mjs --changed` once (S-159).
2. parallel-shots: its feature file does not exist. Create docs/features/parallel-shots.md and write its four gates on
   S-115's direction and its three named costs: (1) the budget guard races — two takes in flight can each pass the
   spend read and together cross the cap, so a reservation or a serialised guard; (2) event order is asserted by name
   everywhere — buffer per shot and emit in plan order, or change the order's rule; (3) the provider's limits and this
   machine's — fal's concurrency arrives as unavailable (S-096), and every take runs ffmpeg probes and scans beside the
   others (S-107). Plan against the measured figures above, and against resume-failed's gates as they stand (S-092's
   kept takes, attempts numbered on from a failed run, still-holds, the reel's spend across two runs).
   Before the product gate, put to me with AskUserQuestion, each with its figures:
   (a) what runs at once — the clips stage's shots only (S-115 rejected the stills stage), narrations too;
   (b) how many at once, and whether that is a setting, against fal's limits;
   (c) the guard — a reservation per call in flight, or one guard that serialises the spend check;
   (d) event order — buffered and emitted in plan order, or a new rule a caller follows;
   (e) a shot that stops the reel while others are in flight — wait for them and pay, or abandon them.
   Each answer an S- entry. Put every real choice to me. Have the gates reviewed by the gate-reviewer agent until
   approved or a finding needs me — continued through SendMessage after round one, a fresh reviewer for the round that
   would approve all four (S-160) — and after three rounds, stop and ask me whether to go on; use the test-impact agent for the amended-check list first — every check that
   asserts a call or event order is in it.
3. If there is time: caption-match's gates (S-165, docs/features/caption-match.md, its four questions), or the
   registry change S-165 decided — its test-impact list first.

How to work:
- --changed between steps; the full check.mjs before committing code, and before a journey (S-159).
- S-160: one phase in this session — gates and reviews. Hand an agent its facts and the lines of docs/context.md that
  matter, not a search. Agents working at once run as one workflow.
- Add every new pitfall to docs/reel-pitfalls.md, and keep its short list current.
- Before recommending a different model or provider, read its history in JOURNAL.md and DECISIONS.md (P-010).
- Never change a check or a test to reach green. Never raise the 250c ceiling. Never print a key or read .env.
- No absolute path in any committed file (D-086).
- Close out with a JOURNAL.md entry and docs/context.md's entry for this session (S-160), this prompt's Run line set
  here and in PROMPTS/README.md (S-065), and PROMPTS/054 — resume-failed: one fresh approving read of its gates (a
  finding fixed, not another open round), then its build, slice by slice.
```
