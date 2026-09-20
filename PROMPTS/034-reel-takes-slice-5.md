# 034 — reel-takes: Slice 5

- **For:** session 34
- **Feature:** `reel-takes` — [`docs/features/reel-takes.md`](../docs/features/reel-takes.md)
- **Work:** Slice 5 of 6 — a restart picks up where it stopped; checks 21–24, tests first; no journey
- **Written:** 2026-09-20, at the end of session 33, after `reel-takes`' Slice 4 was committed (e4bc94a)
- **Run:** session 34

Paste everything inside the block below as the session's first message.

```text
Build reel-takes' Slice 5 — a restart picks up where it stopped — and nothing from Slice 6. It proves checks 21, 22, 23
and 24 of docs/features/reel-takes.md. Tests first: write each check's test, watch it fail for the reason it exists,
then write the code. reel-takes has six slices; this is the fifth, and no journey runs until Slice 6.

Start:
1. Run `node scripts/decisions.mjs`. If it says commits are unpushed in the steering repository, say so and stop.
2. Read CLAUDE.md; then JOURNAL.md's session 33 entry in full (Slice 4: the render shot union, the manifest's
   still-hold shot and its schema by branch, zoompan and the silence, S-104 and S-105, check 37 widened, the campaign
   and the five breaks caught by nothing), session 32's (Slice 3: the hold going on, StillHold, the probe at the ladder,
   the four labels, S-103, and break 14q — the still_hold row's attempt, which THIS SLICE's check 22 must catch), and
   session 31's (Slice 2: the retries, the ladder, the ids and seeds, S-101 and S-102).
3. Read docs/features/reel-takes.md: Gate 2's "A restart picks up where it stopped" in full — every clause of kept,
   not made again, made again, the cap across attempts, the events, the spend, the still-holds, and the paragraph on
   the rows a render is read from — then "Takes", "A retry's prompt", "Spending" and "A held shot's labels"; Gate 3's
   file locations, the signatures for ClipsInput.kept, readClipsInputs and readRenderInputs, and checks 21–24; and
   Gate 4's Slice 5 and Slice 6, so you know what is NOT yours: no endings sweep, no child-with-PATH test, no journey,
   no re-run of 1–24 (Slice 6).
4. Decisions. In DECISIONS.md: S-092 in full — it is this slice's spine, and its Supersedes names four entries and
   two D-entries — then S-089 (above all its check 48 bullet, which S-092 supersedes and this slice rewrites, and its
   "the first kept" reading, which is check 49's and stays), S-100 (check 4's SECOND restart, which this slice MOVES
   onto checkpoints — typed today for S-076's start-over, so it goes red here until it is moved), S-099 (its check 48
   bullet, which is yours; every other bullet is already done), S-098 (a held shot held again marks the receipts of its
   three takes, whichever attempt made them), S-094 (the take number, the retry prompt), S-095 and S-087 (every send
   guarded, the ceiling), S-076 and S-048 (what still starts over), S-027 and S-062 (the lease, and holding a worker at
   a model call). In steering-ref/steering/DECISIONS.md: D-002 (the lease), D-024 (three takes), D-014 (the ceiling and
   retries), D-081 (the chain and its cost), D-015; and I-11 and I-15 in
   steering-ref/docs/founding/reel-creation-engine/contentions.md. Read each decision whole: sessions 20, 29, 32 and 33
   each found a bar-(a) finding in a clause a quote left out.
5. Read the real code Slice 5 touches: packages/domain/src/clips.ts (ClipsInputs and readClipsInputs today — no kept;
   readRenderInputs, which now reads the still-holds and filters takes and narrations to the FINISHING attempt, the
   filter this slice replaces) and src/runs.ts (advanceClips, finishVideo, markStillHeld — whose row takes the attempt
   off the clips job's own row); packages/pipeline/src/clips/index.ts (makeClips' per-shot loop, the ladder, the
   record's events) and clips/ids.ts (takeIdOf, readTakeId) and clips/prompts.ts (retryPrompt);
   packages/pipeline/src/render/manifest.ts (renderManifest, which takes each shot's LAST accepted take and narration —
   the place the new fault goes); apps/worker/src/clips-job.ts (what it reads and hands the stage). And the tests that
   read or build what changes: tests/engine/restart.ts (LEASE_MS, killedMidVideo, takenUpVideo — how a worker is killed
   at a model call and a new one started), tests/reel-render-restart.test.ts (check 48, the source read),
   tests/reel-takes-record.test.ts (check 4's two restarts, the second of which moves), tests/reel-takes-takes.test.ts
   and tests/reel-takes-retry.test.ts (the numbers and the prompts, which must stay green), and
   tests/reel-takes-labels.test.ts and tests/reel-takes-still-manifest.test.ts (Slice 3's and Slice 4's).
6. Baseline: `node scripts/check.mjs` green, 339 tests by a TAP count (e4bc94a). The suite takes about 230–250 s here,
   most of it reel-render's check 50 child. Check the machine is quiet before timing anything.

What Slice 5 builds (Gate 4, Gate 3's signatures, S-092, S-099):
- `readClipsInputs` returning `kept` — every earlier attempt's FINISHED narrations and DECIDED takes, in the order
  made — and the clips job handing them to `makeClips` as `ClipsInput.kept`.
- The stage skipping kept work and looking at none of it again: a shot with a kept accepted take is finished; a kept
  narration is the shot's; the next take's number is the shot's kept decided takes PLUS ONE; a retry after kept failed
  takes is told every one's reasons; no narration, video, observe or reconcile call and no receipt for anything kept.
  A take a crash cut off is NOT resumed: its row, receipt, file and cost stay with the gates it reached and no outcome,
  and the shot's take of that number is made again under the next attempt's id, counting against no cap.
- The cap across attempts: a shot's decided takes, every attempt's, are at most three; a shot with three kept failed
  takes goes to `atTheCap` WITH NO CALL and is held again — its still-hold's labels marking the receipts of the three
  takes it consumed, whichever attempt made them, and its `still_hold` row carrying the attempt that decided it, which
  is session 32's break 14q, uncaught until now.
- The events: the finishing attempt emits each KEPT take's verdicts when it reaches the shot, so every decided take's
  verdicts are events once, in shot and take order, and a cut-off take's never.
- `readRenderInputs` reading each shot's finished narration and accepted take, whichever attempt made them — the
  attempt filter goes — with the still-holds and each held shot's three takes; and `renderManifest` REFUSING rows that
  hold two accepted takes of one shot, or two finished narrations, naming the shot, so the assemble job fails the run
  rather than choosing one (S-092, superseding S-089's filter).
- `reel-render`'s check 48 rewritten exactly as S-099's bullet says — the completed restart's calls, rows, receipts,
  manifest shots, measured takes and `readRenderInputs`, and the budget stop's two guards with the ceiling and
  narration rate the slice chooses. No assertion is removed.
- `reel-takes`' check 4's second restart moved onto checkpoints as S-100 says: the new worker's script from shot 2's
  take on, the second attempt's four takes, shots 0 and 1's first-attempt takes used; every clause kept, none removed.
- The checks, in tests/reel-takes-*.test.ts, each test titled with its check's number and words as Gate 3 writes them:
  21 (kept work not made or looked at again, the cut-off take made again with the same number, the run completing, the
  events once in shot and take order), 22 (take 2 told take 1's reasons across the kill; two failed then one more; a
  held shot held again with no call, its labels marking three receipts; no shot's decided takes passing three), 23 (the
  render's rows, `readRenderInputs` read directly AND every frame of the output measured to carry the take its shot's
  narration puts there; and `renderManifest` read directly refusing two accepted takes or two finished narrations,
  naming the shot), 24 (a budget stop across attempts, for the cut-off take made again and for the next shot's
  narration).

How to work:
- Red first, per check, and write down what each red said. Check 23's second half is a MEASUREMENT, not a manifest
  read (S-073): assert what the extracted frames say, never what the manifest claims.
- Check 4's second restart is typed for start-over today and WILL go red the moment the stage keeps work. That is the
  expected red S-100 names, not a finding: move it in this slice, and say in the journal what each of its clauses
  became.
- A worker is held at a model call and killed by tests/engine/restart.ts' `killedMidVideo`; the call numbers move with
  the fixtures (S-089: for THREE_RANKS the planner makes two calls and the stills stage eight, so take k's witness is
  call 11 + 2k). Count them from the fixture, in the test, and say which call each hold is.
- A choice between real alternatives the gates leave open — where `kept` is read and how the stage tells a kept take
  from one it made, how a cut-off take's number is found, which row the fault in `renderManifest` names — is recorded
  as an S-entry only if it is a real choice with a rejected option and a way it is caught. The next free number is
  S-106.
- If building finds a verified check or a gate that cannot hold as written — a reel-render or reel-takes check the
  checkpoints turn red beyond S-099's and S-100's lists — STOP on that point: record it, and ask the owner with
  AskUserQuestion, a recommended option first, rather than weakening a check or editing an approved gate. The
  approved Gates: line does not change.
- Once green, run a break campaign as sessions 30–33 did — the runner in .tmp/campaign/ (move session 33's breaks.mjs,
  chunk logs and results.jsonl aside to s33/ first; the break list exports its default TESTS and each file's COUNTS,
  and the runner takes `--only=<ids>`): each break's files saved as bytes and fsync'd to a record before touching them,
  restored from those bytes and read back, the record removed; every modified and untracked file fingerprinted after
  each restore; a refusal to start while a record exists; each break's own tests run, and counted. COUNT EACH TEST FILE
  BEFORE WRITING COUNTS — session 33's first pass reported a runner fault on every FULL break because one file's count
  was typed from memory. Break each clause at least once — among them: kept narrations or kept takes not read; a kept
  take made again; a kept take witnessed or reconciled again; the next take numbered from one rather than after the
  kept; a retry not told a kept take's reasons; a cut-off take treated as decided, so it counts against the cap; a
  cut-off take resumed rather than made again; a shot with three kept failed takes calling the provider once more; a
  held shot's labels marking only the finishing attempt's receipts; the still_hold row's attempt not the deciding job's
  (break 14q, which check 22 must now catch); kept verdicts emitted twice, or not at all, or out of take order;
  readRenderInputs keeping the finishing-attempt filter; renderManifest choosing the last of two accepted takes instead
  of failing; the fault not naming the shot — plus a control caught by nothing. Record what each break was caught by,
  and fix — by ADDING — any break caught by nothing that a check's words promise to catch.
  Run the campaign inside one turn: the stop-gate runs check.mjs --code when a turn ends.
- Tick Slice 5 in docs/features/reel-takes.md only when checks 21–24 pass by number, 1–20 and every reel-render,
  reel-stills, reel-plan and reel-contract check still pass, and check.mjs is green.

Traps, each already paid for:
- A heredoc or `node -e` text holding backticks, apostrophes or backslashes can end early, run nothing, or arrive cut —
  session 33 lost two edits that way. Write such text with the editing tool and verify the file's bytes.
- Shell tooling halves backslashes, and sed/grep in Git Bash strip `\r`. Count bytes: `tr -cd '\r' < file | wc -c`.
- node:sqlite's rows have a null prototype: hand plain objects to a deepEqual. `@cutroom/domain` does not resolve from
  tests/; a test importing it uses the package's src/index.ts by relative path.
- No absolute path is written anywhere (D-086). D-096 bans the field names source, sources, truthState, claimText and
  exposure; reel-render's check 5 bans a type or field named manifest or endCard.
- A take that fails Gate 2 makes no model call, so a script leaves it out: `videoScript` answers in call order, and
  `retake(take, n)` gives a retake its own key.
- Leave no untracked file at the repository root; journey.mjs refuses a dirty tree.

Out of scope: anything from Slice 6 — checks 25 and 26, the re-runs of 1–24, the reel-takes journey and the four
journeys S-099 runs again; the narration guard's every-send rule (S-101's Not handled); a keyframes job run again,
which still starts over (S-048); an assemble job run again, which still renders and buys nothing (S-076);
video-edits' gates; the paid-path feature; the steering stubs and the pin (S-033); reel-script's criterion type
(S-029).

Finish:
- `node scripts/check.mjs` green, with the new test count stated by a TAP count.
- A JOURNAL.md entry: intent; what changed (files, S-entries, the test support that changed, the two moved checks,
  +N tests); observed — each red and what it said, the call numbers each hold used, what the measurements gave, check
  48's and check 4's moves clause by clause, the break campaign's table with what each was caught by, anything caught
  by nothing and what was done; next (Slice 6 — endings, no secrets, and the journeys: checks 25 and 26, then five
  journeys).
- Set this prompt's Run line to session 34 in PROMPTS/034-reel-takes-slice-5.md and in PROMPTS/README.md (S-065).
- Commit as `feat(reel-takes): Slice 5 — a restart picks up where it stopped`.
- If the owner asks for Slice 6's prompt, write it in PROMPTS/ as S-065 says.
```
