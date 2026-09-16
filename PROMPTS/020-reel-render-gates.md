# 020 — reel-render: gates 1–4

- **For:** session 20
- **Feature:** `reel-render` — [`docs/features/reel-render.md`](../docs/features/reel-render.md)
- **Work:** write its four planning gates and have them reviewed adversarially until approved; no code, no test
- **Written:** 2026-09-16, at the end of session 19, after `reel-stills` was verified
- **Run:** not yet

Paste everything inside the block below as the session's first message.

```text
Write reel-render's four planning gates — Gate 1 (product), Gate 2 (architecture), Gate 3 (program design) and Gate 4
(slices) — in docs/features/reel-render.md, and have an adversarial reviewer review them until all four are approved or
a finding needs the owner. No code and no test in this session: gates before code (CLAUDE.md rule 1). One feature only.

reel-render starts where reel-stills ends — approved still pictures — and ends with a finished video file, for $0. It
is the largest feature yet: the clips, Gates 2–5 and the take ladder, holding a shot as a still, the narration audio
and word timings, the one assembly pass, and Gates 7 and 8. If it does not fit one session, that is expected. Commit
what is written, leave the Gates: line honest, and write a JOURNAL.md entry before you stop, finished or not.

Start:
1. Run `node scripts/decisions.mjs`. If it says commits are unpushed in the steering repository, say so and stop.
2. Read CLAUDE.md; then JOURNAL.md's session 14 entry in full — it is how reel-stills' gates were written and reviewed
   five times, and its "recorded pattern" paragraph is the lesson — and session 19's entries (Slice 5, the S-015 test,
   and PROMPTS/).
3. Read docs/features/reel-render.md in full: what is in it, what is not, and its five needs. Then read
   docs/features/reel-stills.md in full as the model for shape and depth: Gate 2's sections, Gate 3's signatures,
   numbered checks each owned by one slice, the Deferred list with where each item goes, the Known limits, and Gate
   reviews 1–5. Its "Deferred — To reel-render" items are now this feature's to take or to defer again by name:
     - the refusing validator at the provider boundary (D-071, I-19);
     - D-050 step 2's text-to-video clip for a degraded shot;
     - the clip prompt built from Gate 1's observations (D-033);
     - Gate 5 checking every criterion, including the ones S-040 gives no picture (D-043).
   Also read reel-plan.md's Gates 2 and 3 (the job chain and the plan job), and reel-contract.md with
   packages/reel-contract/src/responses.ts: the completed `until: 'video'` result (`stills`, `video: VideoRef`,
   `degradations`) is already promised to callers.
4. Decisions. In DECISIONS.md: S-017, S-021, S-025 to S-028, S-030, S-032, S-033, S-035, S-036, S-038, S-043, S-046,
   S-047, S-048, S-055, S-058, S-059, S-061 to S-065. In steering-ref/steering/DECISIONS.md: D-008, D-014, D-015,
   D-019, D-023, D-024, D-025, D-027, D-033, D-036, D-037, D-038, D-043, D-050, D-051 to D-059, D-060, D-071, D-072,
   D-076, D-080, D-081, D-083, D-086, D-087, D-096, D-100, D-108. docs/design/contentions.md: the invariants (§1 —
   I-9, I-12, I-17, I-18 and I-19 above all), the contentions, the traps and §4's cost and latency model. Read
   docs/design/VideoGenerationFlow.md where it covers L3 to L5 and the gates after the stills (L4 and O-1, O-7 bear on
   need 4).
5. What was promised and found before the split: `git -C steering-ref show 7e50f79:steering/features/reel-engine.md`
   (reel-engine's last plan) and steering-ref/docs/founding/reel-creation-engine/reel-engine-reviews.md. As session 14
   did, write by REMOVING promises rather than copying: what this feature does not need goes in Deferred, with where it
   goes.
6. Read the real code the gates will design against — Gate 2 is never written against an imagined codebase:
   packages/contracts (picture.ts, model.ts, settings.ts), packages/pipeline/src/stills and gates, apps/worker
   (worker.ts, plan-job.ts, keyframes-job.ts, guarded-image-port.ts, recorder.ts, recording-port.ts), packages/domain
   (schema.ts, ledger.ts, pictures.ts, runs.ts, queue.ts) and db/migrations, packages/providers/src/fake,
   apps/api/src/server.ts, .dependency-cruiser.cjs with scripts/drift.mjs, and tests/engine (harness.ts,
   worker-process.ts, restart.ts, stills.ts).
7. Baseline: `node scripts/check.mjs` green, 182 tests (110f667 was the last commit to change a test).

What the gates must settle, at the least:
- reel-render.md's five needs. Need 1 is met: reel-stills was verified at e42bc3f. Need 5 is answered by D-100 (the
  engine's admission is generation-only, against the per-reel cap and the caller's ceiling), but say how D-076's
  research envelope stays outside this feature. Needs 2 and 3 are design:
    - a stand-in narration voice that returns audio AND word timings (D-019 gives the real T2A no fallback);
    - stand-in clips that have sound in them (an ffmpeg `color` source is silent, so D-055's audio conform and D-008's
      ducking would go untested).
  Need 4 — whether L4 and Gate 6 are built here, or D-036's `cut` default makes them unnecessary — is likely the
  owner's. Settle it from the decisions if they settle it; ask only if they do not.
- Nothing may cost money, read a secret or reach out of this machine. This is structural, as in reel-stills:
    - stand-ins only, every one costing 0 unless a test scripts a cost (S-036);
    - the worker is handed every port and can import no adapter (S-021, S-038);
    - a check-50-style child with PATH alone proves it (S-028).
- ffmpeg and ffprobe. Both are on this machine's PATH (8.1.1) and nothing in the repository installs them. Settle:
  where they come from; how a missing one is refused; that the pipeline never touches them (pipeline-no-io, so behind
  a port); and D-086's rule that no absolute path is written anywhere.
- The chain:
    - a job after reel.keyframes (D-081, D-083);
    - what a `video` run is admitted against, following S-030 and S-035's pattern for stills;
    - every paid call — clips and narration — guarded before it is made, following S-035 and S-059;
    - the take counters of D-024, with D-025's hold-then-fail at the cap and I-12's rule that no shot is ever cut to fix
      a failure;
    - I-18: nothing is bought after assembly begins;
    - what a restart does mid-clips and mid-assembly, with S-048 as the precedent.
- Media files. They are real (D-087), written under the artifact root (D-086), and never committed. Tests point the
  artifact root at a temporary folder.
- The boundary with video-edits. D-058's closed set of free edits (reorder, retime, recaption, reselect-take) is the
  first place the engine needs edits, and video-edits.md says that first use is reel-render's. Draw the line in the
  gates, and put what video-edits keeps in Deferred by name. Do not write video-edits' gates.
- Verified features that change. reel-plan's check 10 and reel-stills' check 8 assert that `until: 'video'` is
  refused. Say in an S-entry what changes and where, as S-047 did; NO ASSERTION IS REMOVED, and those journeys run
  again in the last slice. GATE_ORDER grows, and the contract's `stage` already includes `video`.
- The size. D-080 split reel-engine because its eleven slices proved nothing until the last one. If Gate 4 cannot be
  sliced so each slice proves its own checks, STOP and put a split of this feature to the owner as a question, with a
  recommendation, rather than writing an oversized plan.

How to work:
- Write all four gates, then review them as a set. Approvals may land gate by gate (reel-stills' review 4 approved
  Gates 1, 3 and 4 before 2).
- The reviewer is a subagent given an EVIDENCE PACK ONLY — this feature file, both decision files, contentions.md,
  reel-engine's reviews, the verified feature files, and the real code the gates name — not the whole repository. It
  judges against four bars:
    (a) contradicts a D- or S-entry without superseding it by name;
    (b) spends money, or reaches a paid service or a secret;
    (c) depends on an open question;
    (d) not buildable, or a check that cannot fail.
  Its findings are numbered and recorded as "Gate review N" sections in the feature file, with what was fixed. Keep
  the same reviewer across rounds, each round checking the last round's fixes against the gates. THE REVIEWER WRITES
  THE `Gates:` LINE ITSELF, as its one allowed edit, so no approval is ever typed by the author.
- Session 14's lesson: every fix added prose nobody re-read against the decisions it touched. So, for every
  supersession:
    - quote the superseded clause exactly, as `**Supersedes:** **D-xxx**, on _"…"_`;
    - have the reviewer check each quote character by character against steering-ref;
    - scope an owner's `Confirmed-by` to what was actually asked, and mark everything else as the entry's reading.
- Design every check with how it fails. Lessons from building reel-stills, each already paid for:
    - an assertion about a file made after `engine.stop()` is vacuous (stopping removes the folder);
    - a fixture whose rank order equals shot order hid order bugs;
    - one run per engine hid "summed over every job";
    - a check whose premise a later slice changes goes dead (S-055, then S-063);
    - a restart check needs a child worker held at a call, with the result asserted from receipts (S-062).
  Where a check will be green before its slice's code exists, say so in Gate 4 and why.
- Owner questions:
    - Ask only when the answer changes what "approved", "spent" or "failed" means.
    - Give a recommended option first, and ask with AskUserQuestion.
    - Record each answer as an S-entry. The next free number is S-066, and every entry has Rejected and Caught by.
- Keep the front matter, and the "Moved here on 2026-09-15" note before the title, as they are:
  tests/feature-files.test.ts (S-064) fails without them. Update the `Decisions:` line to what the gates cite, add a
  "Named only in the deferral list" line as reel-stills.md has, and leave `Status: planned`.
- Traps, each already paid for:
    - A heredoc holding backticks or apostrophes ends at end of file and nothing runs. The same goes for text passed to
      `node -e` in single quotes. Write such text with the editing tool.
    - Shell tooling halves backslashes, and sed/grep in Git Bash strip `\r`. Verify the file's bytes.
    - D-096 bans the field names source, sources, truthState, claimText and exposure anywhere.
    - Leave no untracked file at the repository root: journey.mjs refuses a dirty tree.
    - The stop-gate hook runs `check.mjs --code` when a turn ends.
- Out of scope: the steering stubs and the pin (S-033), reel-script's criterion type (S-029), video-edits' gates,
  and any code.

Finish (finished or not):
- `node scripts/check.mjs` green. Nothing but markdown changed, so still 182 tests.
- A JOURNAL.md entry:
    - intent;
    - what changed (gates, S-entries);
    - observed: the owner's answers and why each was asked, findings by review round with what each round found, and
      any pattern across rounds;
    - next.
- Set this prompt's `Run` line to session 20 in PROMPTS/020-reel-render-gates.md and in PROMPTS/README.md (S-065).
- Commit as `docs(reel-render): gates 1–4` if all four are approved. Otherwise commit what is written, with a message
  naming the round reached, and leave the Gates: line as the reviewer left it.
- If all four are approved, next is reel-render Slice 1, in its own session. If the owner asks for its prompt, write it
  in PROMPTS/ as S-065 says.
```
