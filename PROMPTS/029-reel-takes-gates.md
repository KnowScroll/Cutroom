# 029 — reel-takes: gates 1–4

- **For:** session 29
- **Feature:** `reel-takes` — [`docs/features/reel-takes.md`](../docs/features/reel-takes.md)
- **Work:** write its four planning gates and have them reviewed adversarially until approved; no code, no test
- **Written:** 2026-09-19, at the end of session 28, after `reel-render` was verified (8819d13) and pushed
- **Run:** not yet

Paste everything inside the block below as the session's first message.

```text
Write reel-takes' four planning gates — Gate 1 (product), Gate 2 (architecture), Gate 3 (program design) and Gate 4
(slices) — in docs/features/reel-takes.md, and have an adversarial reviewer review them until all four are approved or
a finding needs the owner. No code and no test in this session: gates before code (CLAUDE.md rule 1). One feature only.

reel-takes deepens verified reel-render without changing what the finished video is: D-024's three paid takes a shot
with informed retries, I-11's counter for provider transient errors, and D-025 at the take cap — accept with a label,
hold the gated keyframe as a still, or fail the reel — with their labels, and the takes in the contract's record
(S-066). S-066 sized it at about thirty checks. If it does not fit one session, that is expected: commit what is
written, leave the Gates: line honest, and write a JOURNAL.md entry before you stop, finished or not.

Start:
1. Run `node scripts/decisions.mjs`. If it says commits are unpushed in the steering repository, say so and stop.
2. Read CLAUDE.md; then JOURNAL.md's session 20 entry in full — how reel-render's gates were written: three owner
   questions before any gate, findings of 21, 6 and 0 by round, and the lesson that quoting was not enough, COVERAGE
   was (a quote beside an unnamed Chose saying the same thing, a quote wider than its change) — and session 14's
   "recorded pattern" paragraph. Then session 28's entries (Slice 6, and "what is next").
3. Read docs/features/reel-takes.md in full: what it holds and its six things to settle. Then
   docs/features/reel-render.md in full as the feature this one changes and as the model for shape and depth: Gate 2's
   "A take that fails", "Spans, trims and holds", "The one pass", "Spending", "How a video run ends" and "Cancel, and a
   restart"; Gate 3's signatures (the take record, `ClipsOutcome`, `RenderShot`'s openings and hold, the recorder);
   checks 13–28, 38, 42–47 and 48; the four least confident decisions — decision 1 names the seam, "the clips stage
   makes a shot's take in one function, which reel-takes widens"; Deferred items 1–4, which are this feature's, and 5,
   which stays video-edits'; the known limits; and Gate reviews 1–3. Read docs/features/reel-stills.md's keyframe
   ladder too — the closest thing built to a take ladder: the reserve, the informed repair, the ladder order and the
   degradation labels. And docs/features/reel-contract.md's Pending item 1: clips are not in the record, and its text
   says adding clip entries is compatible with version 1.
4. Decisions. In DECISIONS.md: S-066 above all — what it supersedes, for reel-render's build "until reel-takes
   supersedes this entry in turn", and its "Owed by reel-takes" clause (checks 21 to 26 and 38 named as premises this
   feature changes, in S-047's form) — then S-034, S-035, S-036, S-043, S-046, S-047, S-048, S-055, S-057, S-058,
   S-059, S-060, S-061, S-069 to S-077, S-081, S-087 and S-089. In steering-ref/steering/DECISIONS.md: D-014, D-024,
   D-025, D-030, D-033, D-047, D-050, D-051, D-052, D-058, D-059, D-083, D-093, D-094, D-100 — each read WHOLE, Chose
   and Confirmed-by. steering-ref/docs/founding/reel-creation-engine/contentions.md: the invariants (§1 — I-4, I-5,
   I-11, I-12, I-15 and I-18 above all) and §4's cost and latency model; VideoGenerationFlow.md in the same folder, its
   §2 S-3 (three takes, "up to two strategies") and S-4 (label, still-hold, fail — why the still-hold works) and its §3
   cost model.
5. What was promised before the split: `git -C steering-ref show 7e50f79:steering/features/reel-engine.md` and
   steering-ref/docs/founding/reel-creation-engine/reel-engine-reviews.md, for what they said of takes, retries and the
   hold. Write by REMOVING promises rather than copying: what this feature does not need goes in Deferred, with where
   it goes.
6. Read the real code the gates will design against — Gate 2 is never written against an imagined codebase:
   packages/contracts (clip.ts, render.ts, model.ts, settings.ts), packages/pipeline/src/clips (index.ts —
   `makeClips`, and where a shot's take is made), src/gates/gate2.ts to gate5.ts, src/render (manifest.ts — spans,
   holds, the `.at(-1)` accepted take; index.ts — `cutReel`), apps/worker (clips-job.ts, video-port.ts,
   narration-port.ts, clips-recorder.ts, assemble-job.ts, questions.ts, worker.ts), packages/domain (schema.ts — the
   take table's `number` column; clips.ts — `readRenderInputs`; runs.ts; ledger.ts; queue.ts), packages/providers
   (fake/video.ts — the stand-in's per-take script, including `throws`; ffmpeg/assemble.ts and tools.ts — the pass and
   REQUIRED_FILTERS, which a still-hold with a slow push would grow), packages/reel-contract (responses.ts and the
   record), and tests/engine (harness.ts, worker-process.ts, restart.ts, video.ts, render.ts).
7. Baseline: `node scripts/check.mjs` green, 288 tests by a TAP count (8819d13 was the last commit to change a test).
   The suite takes about 170 s here, most of it reel-render's check 50 child.

What the gates must settle, at the least:
- reel-takes.md's six items:
    1. which of reel-render's checks change — S-066 names 21 to 26 and 38; check 46 (a thrown clip call fails the run)
       meets I-11's counter, and 48 (a restart) meets item 5. Say what each assertion becomes, in S-047's and S-077's
       form: NO ASSERTION IS REMOVED, a premise a take turns into a retry is kept on the path that still stops, and
       reel-render's journey runs again in the last slice (and reel-stills', reel-plan's and reel-contract's, as S-077
       did);
    2. what "soft", "motion broken" and "never passed" are, as outcomes of Gates 2 to 5 — no decision maps a gate's
       failure to D-025's classes;
    3. a still-hold for a shot with no gated keyframe — a text-to-video shot (D-050 step 2) has no picture to hold;
    4. D-024's "two failures on one strategy trigger at most one alternative" — what a strategy is;
    5. a restart's takes against the cap — S-076 counts one take a shot per attempt; S-048 is the precedent (a
       keyframes job run again pays again, and its earlier calls come out of the reserve);
    6. the takes in the record — whether they amend contract version 1, as S-034 did for a criterion's type, given
       reel-contract's Pending item 1.
- Spending. Every retry is a paid call through the guard (S-035, S-059, S-087). Say what a video run is admitted
  against now that a shot may cost three clips — the plan's estimate counts one (S-069, D-083) — and how the per-reel
  cap and the ceiling bound the retries; D-014's "retries ≤ 2 per shot" stands. Nothing may cost money, read a secret
  or reach out of this machine: stand-ins only, costing 0 unless a test scripts a cost (S-036); the worker handed every
  port (S-021, S-038, S-075); a check-50-style child with PATH alone.
- Informed retries. D-033's rider: a retry's prompt consumes the failed take's verdict, and take 2's prompt differs
  from take 1's. S-060 is the stills precedent for a repair prompt. Say what a retry is shown and what it is never
  shown (I-15: the witness sees the clip and nothing else).
- The still-hold. D-025 rung 2 holds the gated keyframe for the shot's span with a slow push, rendered in reel-render's
  one pass (D-059's still-hold shot, S-073). Say what the render manifest carries for it, how the pass makes it from a
  picture rather than a clip, what is measured to show it (a check reads the file, never the manifest back), and which
  filters ready() must now find. A hold for a clip shorter than its narration (S-073) is a different thing: keep the two
  apart in names and labels.
- Labels. D-025's outcomes are labelled on the shot, in the verdict and in the receipt, and queryable (I-4, S-058's
  four places for a degradation).
- Transient errors. I-11's counter is separate from the take counter; S-066 superseded it for reel-render's build.
  Say which calls it covers, what counts as transient on a stand-in, and what a check scripts to show N transient
  errors leave the take counter unchanged.
- The boundary with video-edits. D-058's free edits after assembly, and "reselect-take" among them, stay
  video-edits'; a Gate 7 failure stays terminal here unless the gates say otherwise with the decision that allows it.
  Do not write video-edits' gates.
- Supersessions. This feature supersedes S-066 in turn where it builds what S-066 withheld; quote each clause of S-066
  and of the D-entries it restores exactly, and say what is kept.
- The size. If Gate 4 cannot be sliced so each slice proves its own checks, STOP and put a split to the owner as a
  question, with a recommendation, rather than writing an oversized plan.

How to work:
- Owner questions first, before any gate is written, as session 20 did. Of the six items, 2 (the failure classes), 5
  (a restart's takes against the cap) and 6 (the takes in the record) are likely the owner's: settle each from the
  decisions if they settle it, and ask only when the answer changes what "approved", "spent" or "failed" means. Ask
  with AskUserQuestion, a recommended option first, and record each answer as an S-entry with Rejected and Caught by.
  The next free number is S-090.
- Write all four gates, then review them as a set. Approvals may land gate by gate.
- The reviewer is a subagent given an EVIDENCE PACK ONLY — this feature file, reel-render.md, reel-stills.md,
  reel-contract.md, both decision files, contentions.md, reel-engine's reviews, and the real code the gates name — not
  the whole repository. It judges against four bars:
    (a) contradicts a D- or S-entry without superseding it by name;
    (b) spends money, or reaches a paid service or a secret;
    (c) depends on an open question;
    (d) not buildable, or a check that cannot fail.
  Its findings are numbered and recorded as "Gate review N" sections in the feature file, with what was fixed. Keep
  the same reviewer across rounds, each round checking the last round's fixes against the gates. THE REVIEWER WRITES
  THE `Gates:` LINE ITSELF, as its one allowed edit, so no approval is ever typed by the author.
- Quote every superseded clause exactly, as `**Supersedes:** **D-xxx**, on _"…"_`, have the reviewer check each quote
  character by character against steering-ref, and read each decision WHOLE, not the clause in view — session 20's
  round 1 found every bar-(a) finding in a clause the quotes left out. Scope an owner's `Confirmed-by` to what was
  asked, and mark everything else as the entry's reading.
- Design every check with how it fails. Lessons already paid for:
    - a check that reads its own input back proves nothing: read the file, measure the output (reel-render, S-073);
    - a fixture whose order equals the order under test hid order bugs; one run per engine hid "summed over every job";
    - a check whose premise a later slice changes goes dead (S-055, then S-063);
    - a restart check holds a child worker at a model call and asserts from the receipts, never the count (S-062,
      S-089); a cost keyed by a whole id — `a1-shot-0-take-1` — lands on one attempt alone;
    - two behaviours that no one-worker run can tell apart need a direct read of the function (S-063, S-089);
    - the stand-in video's bands are keyed by the take id's CRC-32, and two takes can be too alike to tell apart
      (session 28): a check measuring which take a frame carries must pick fixtures whose colours differ.
  Where a check will be green before its slice's code exists, say so in Gate 4 and why.
- Keep the front matter and the "Created 2026-09-16 by S-066" note as they are: tests/feature-files.test.ts (S-064)
  fails without them. Add a `Decisions:` line to what the gates cite and a "Named only in the deferral list" line, as
  reel-render.md has, and leave `Status: planned`.
- Traps, each already paid for:
    - A heredoc or `node -e` text holding backticks, apostrophes or backslashes can end early, run nothing, or arrive
      with `\n` turned into a real newline. Write such text with the editing tool, and check it.
    - Shell tooling halves backslashes, and sed/grep in Git Bash strip `\r`. Verify the file's bytes.
    - D-096 bans the field names source, sources, truthState, claimText and exposure anywhere; reel-render's check 5
      bans a type or field named manifest or endCard.
    - Leave no untracked file at the repository root: journey.mjs refuses a dirty tree.
    - The stop-gate hook runs `check.mjs --code` when a turn ends.
- Out of scope: any code or test; video-edits' gates; the paid-path feature — a real video or narration adapter
  (reel-render's Deferred 6–10); KnowScroll's check of a returned video (S-068) and serving the file (S-073); the
  steering stubs and the pin (S-033); reel-script's criterion type (S-029).

Finish (finished or not):
- `node scripts/check.mjs` green. Nothing but markdown changed, so still 288 tests.
- A JOURNAL.md entry:
    - intent;
    - what changed (gates, S-entries);
    - observed: the owner's answers and why each was asked, findings by review round with what each round found, and
      any pattern across rounds;
    - next.
- Set this prompt's `Run` line to session 29 in PROMPTS/029-reel-takes-gates.md and in PROMPTS/README.md (S-065).
- Commit as `docs(reel-takes): gates 1–4` if all four are approved. Otherwise commit what is written, with a message
  naming the round reached, and leave the Gates: line as the reviewer left it.
- If all four are approved, next is reel-takes Slice 1, in its own session. If the owner asks for its prompt, write it
  in PROMPTS/ as S-065 says.
```
