# 032 — reel-takes: Slice 3

- **For:** session 32
- **Feature:** `reel-takes` — [`docs/features/reel-takes.md`](../docs/features/reel-takes.md)
- **Work:** Slice 3 of 6 — the hold at the cap; checks 13–15, tests first; no journey
- **Written:** 2026-09-19, at the end of session 31, after `reel-takes`' Slice 2 was committed (7d5f264) and pushed
- **Run:** session 32

Paste everything inside the block below as the session's first message.

```text
Build reel-takes' Slice 3 — the hold at the cap — and nothing from Slice 4 or later. It proves checks 13, 14 and 15 of
docs/features/reel-takes.md. Tests first: write each check's test, watch it fail for the reason it exists, then write
the code. reel-takes has six slices; this is the third, and no journey runs until Slice 6.

Start:
1. Run `node scripts/decisions.mjs`. If it says commits are unpushed in the steering repository, say so and stop.
2. Read CLAUDE.md; then JOURNAL.md's session 31 entry in full (Slice 2: the retries, the ladder and its Slice 2 stand-in
   for a hold, S-101 and S-102, the campaign's table, what was caught by nothing, and the two red suite runs on a loaded
   machine), session 30's (Slice 1: the still_hold table and its migration, and what no Slice 1 check asserts), and
   session 29's (the owner's answers — above all the hold rule — and the three reviews).
3. Read docs/features/reel-takes.md: Gate 2 in full — above all "At the cap", "A held shot's labels", "The still-hold,
   in the one pass" (for what is Slice 4's, not yours), "Events and endings", "Storage" and "What this feature changes in
   verified features" — Gate 3's file locations, signatures (StillHold, ClipsEvent, ClipsRecord.stillHolds,
   advanceClips, finishVideo, readRecord) and checks 13–15, and Gate 4's Slice 3 and the slices after it, so you know
   what is NOT yours: no RenderShot union, no still-hold shot in the manifest or its schema, no zoompan in any
   filtergraph, no bordered stand-in picture, no change to the completed result's degradations beyond what readRecord
   lists (Slice 4); no kept work, no checkpoint (Slice 5). A render is not made of a held shot in this slice:
   renderManifest fails such a run "has no accepted take to render" — reel-render's own fault, which no check of this
   slice asserts, and Slice 4 replaces.
4. Decisions. In DECISIONS.md: S-090, S-097, S-098 in full, and S-101 and S-102; then what they lean on or supersede —
   S-058 (a degraded shot's four labels with every ending, and its order), S-046 (a thrown call, and the events), S-069
   (the clips job's events and the order of degradations), S-072 (the unclaimed mustShow), S-073 (a hold, which a
   still-hold is not), S-081 (the clips job's ending keeping its cost), S-087 and S-095 (a stop for budget), S-055 and
   S-093 (the record). In steering-ref/steering/DECISIONS.md: D-025, D-043, D-050, D-055, D-059; and I-4, I-12 and I-17
   in steering-ref/docs/founding/reel-creation-engine/contentions.md. Read each decision whole: sessions 20 and 29 found
   every bar-(a) finding in a clause the quote left out.
5. Read the real code Slice 3 touches: packages/pipeline/src/clips/index.ts (makeClips — the cap, and Slice 2's stand-in
   for a hold: `{ kind: 'failed', detail: `${capped.reason}; but a held shot is not built` }`), clips/ladder.ts
   (atTheCap and its hold reason); packages/contracts/src/clip.ts (no StillHold yet); packages/domain/src/schema.ts
   (still_hold, made by Slice 1's migration 0004), runs.ts (advanceClips, finishVideo, their private endRun), pictures.ts
   (readRecord and its degradations), clips.ts; apps/worker/src/clips-job.ts and clips-recorder.ts;
   packages/providers/src/ffmpeg/media.ts (probe, and how a test scripts it to throw — keyed by the id it is handed, a
   picture's `shot-<unit>-<label>`); and the tests that build or read what changes: tests/engine/video.ts (videoScript,
   retake — a take failing Gate 2 makes no model call and is left out of a script), tests/reel-takes-guard.test.ts
   (check 9's still-hold clause, green before this slice by construction and live from it), tests/reel-takes-cap.test.ts
   (check 12, whose runs must still stop), tests/reel-takes-record.test.ts (check 4), and reel-stills' and reel-render's
   tests of a degraded shot's labels (S-058's form, which S-098 copies).
6. Baseline: `node scripts/check.mjs` green, 322 tests by a TAP count (7d5f264). The suite takes about 220 s here, most
   of it reel-render's check 50 child — which overran its 300-second bound twice in session 31 while something outside
   this repository held the CPU. Check the machine is quiet before timing anything.

What Slice 3 builds (Gate 4, Gate 3's signatures, S-090, S-097, S-098):
- A `hold` from atTheCap goes on to the next shot, in place of Slice 2's stand-in. The held shot's StillHold — its unit,
  its chosen picture's id and path, its probe, its three take ids and the reason — recorded by the stage in the order
  the ladders reached them (ClipsRecord.stillHolds), and a `degraded` event with the shot and the reason after its third
  take's verdicts (ClipsEvent gains that member, S-098).
- The picture probed by the media port when the ladder holds the shot (D-055, S-097). A probe that throws fails the run
  with the throw's message; a picture that does not probe as a readable picture fails it with a detail naming the
  picture — neither writes a still_hold row, and the clips job makes no reel.assemble row.
- The four labels (S-098), written with whatever ending the clips job reaches, in the transaction that ends its stage or
  its run — advanceClips for a completed stage, finishVideo for a stop or a failure: the still_hold row (run, shot, the
  attempt that decided it, picture, probe, the three take ids, reason); the third take's row carrying the reason in
  `degradation`; the video receipt of each of its three takes marked degraded; the degraded event.
- readRecord listing the stills' degradations in the order reached, then the still-holds in the order reached, then the
  latest render's holds (S-098); a still-hold's reason beginning that the shot "is held on its approved picture" and
  citing D-025 — kept apart from a hold's (S-073).
- The reel's unclaimed mustShow checked once every shot is done — accepted or held — over accepted takes alone (S-090):
  a held shot's failed takes show nothing for it.
- The checks, in tests/reel-takes-*.test.ts, each test titled with its check's number and words as Gate 3 writes them:
  13 (a hold on each of Gates 2, 3 and 5 failing its three takes, the stage going on and completing with a
  reel.assemble row; the probe that throws and the picture replaced with other bytes before the third take is decided —
  neither green before this slice's code, as the check says); 14 (the four labels with the clips stage completed, with
  the run stopped for budget at a later shot, and with it failed at a later shot; no other shot, take or receipt
  carrying one; and the query for runs holding a shot); 15 (a held shot's take the only one reconciled as showing the
  unclaimed mustShow: the run stops for gate-5 once every shot is done).

How to work:
- Red first, per check, and write down what each red said. Check 9's still-hold clause goes live with this slice:
  run check 9 once the hold is built, and say whether it stayed green for the right reason.
- The holdable shots are THREE_RANKS' shot 1 (the barons, a chosen picture, presence mustShow `show-crowd`) and shot 2
  (seal and hall, a chosen picture, no claim). Shot 0 claims an event and shots 3 to 5 are made from words: check 12's
  runs must still stop. The stand-in answers the model in call order — list each take a run makes, retakes included,
  with `retake`, and leave out a take that fails Gate 2.
- A choice between real alternatives the gates leave open — where the stage probes the picture, how a picture that
  does not probe as readable is told from one that throws, the order labels are written in the ending's transaction —
  is recorded as an S-entry only if it is a real choice with a rejected option and a way it is caught. The next free
  number is S-103.
- If building finds a verified check or a gate that cannot hold as written — a reel-render or reel-stills check that a
  held shot turns red, a check 4 run that stops staying green (S-100) — STOP on that point: record it, and ask the owner
  with AskUserQuestion, a recommended option first, rather than weakening a check or editing an approved gate. The
  approved Gates: line does not change.
- Once green, run a break campaign as sessions 30 and 31 did — the runner in .tmp/campaign/ (move session 31's
  breaks.mjs, chunk logs and results.jsonl aside to s31/ first; the break list exports its default TESTS and each file's
  COUNTS since session 31): each break's files saved as bytes and fsync'd to a record before touching them, restored
  from those bytes and read back, the record removed; every modified and untracked file fingerprinted after each
  restore; a refusal to start while a record exists; each break's own tests run, and counted. Break each clause at
  least once — among them: a hold that does not go on to the next shot; a held shot's later take made; the probe
  skipped, or its `readable` ignored; the still_hold row written before the probe, or with no picture; a label missing
  from each of the four places in turn; a receipt marked on only the third take; labels written only when the stage
  completes; the degraded event before the third take's verdicts; readRecord listing still-holds before the stills'
  degradations; a hold's reason worded as a still-hold's; the unclaimed mustShow counted from a held shot's take; a
  refused retry holding its shot (check 9) — plus a control caught by nothing. Record what each break was caught by, and
  fix — by ADDING — any break caught by nothing that a check's words promise to catch. Run the campaign inside one turn:
  the stop-gate runs check.mjs --code when a turn ends.
- Tick Slice 3 in docs/features/reel-takes.md only when checks 13–15 pass by number, 1–12 and every moved reel-render
  check still pass, and check.mjs is green.

Traps, each already paid for:
- A heredoc or `node -e` text holding backticks, apostrophes or backslashes can end early, run nothing, or arrive cut.
  Write such text with the editing tool; a generated list that refers to itself is written as a plain loop after it.
- Shell tooling halves backslashes, and sed/grep in Git Bash strip `\r`. Verify a file's bytes, not the command typed.
- A timer can end before its time (S-102): measure waits, never assume them.
- The fake model's `calls` list is its `structured` calls; its verdict events for a shot include the stills stage's
  Gate 1 and 1S verdicts, which carry the same shot id (session 31's fault in check 8).
- SQLite adds a NOT NULL column with no default to an empty table without complaint: a fresh test database never shows a
  migration's default.
- `@cutroom/domain` does not resolve from tests/; a test importing it uses the package's src/index.ts by relative path.
- node:sqlite's rows have a null prototype: hand plain objects to a deepEqual.
- D-096 bans the field names source, sources, truthState, claimText and exposure anywhere; reel-render's check 5 bans a
  type or field named manifest or endCard.
- Leave no untracked file at the repository root; journey.mjs refuses a dirty tree.

Out of scope: anything from Slices 4–6 (above); the narration guard's every-send rule (S-101's Not handled); check 4's
second restart, which Slice 5 moves (S-100); video-edits' gates; the paid-path feature; the steering stubs and the pin
(S-033); reel-script's criterion type (S-029).

Finish:
- `node scripts/check.mjs` green, with the new test count stated by a TAP count.
- A JOURNAL.md entry: intent; what changed (files, S-entries, the test support that changed, +N tests); observed — each
  red and what it said, the clauses green before code and check 9's clause going live, the break campaign's table with
  what each was caught by, anything caught by nothing and what was done, any collision with a verified feature; next
  (Slice 4 — the still-hold, rendered: checks 16–20).
- Set this prompt's Run line to session 32 in PROMPTS/032-reel-takes-slice-3.md and in PROMPTS/README.md (S-065).
- Commit as `feat(reel-takes): Slice 3 — the hold at the cap`.
- If the owner asks for Slice 4's prompt, write it in PROMPTS/ as S-065 says.
```
