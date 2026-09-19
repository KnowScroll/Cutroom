# 031 — reel-takes: Slice 2

- **For:** session 31
- **Feature:** `reel-takes` — [`docs/features/reel-takes.md`](../docs/features/reel-takes.md)
- **Work:** Slice 2 of 6 — three takes, informed retries, transient errors, and the cap's stop; checks 5–12, tests first;
  `reel-render`'s checks 20–24, 26 and 47 moved as S-099 says; no journey
- **Written:** 2026-09-19, at the end of session 30, after `reel-takes`' Slice 1 was committed (d6ae1f1) and pushed
- **Run:** not yet

Paste everything inside the block below as the session's first message.

```text
Build reel-takes' Slice 2 — three takes, informed retries, transient errors, and the cap's stop — and nothing from
Slice 3 or later. It proves checks 5 to 12 of docs/features/reel-takes.md, and moves reel-render's checks 20, 21, 22,
23, 24, 26 and 47 onto the paths that still stop, as S-099 says. Tests first: write each check's test, watch it fail for
the reason it exists, then write the code. reel-takes has six slices; this is the second, and no journey runs until
Slice 6.

Start:
1. Run `node scripts/decisions.mjs`. If it says commits are unpushed in the steering repository, say so and stop.
2. Read CLAUDE.md; then JOURNAL.md's session 30 entry in full (Slice 1: what it built that no Slice 1 check asserts,
   the campaign's table, S-100 and the check-4 runs chosen to outlast later slices), session 29's (the six owner answers
   and the three reviews), and session 22's and 23's (reel-render's Slices 2 and 3: the clips stage, the guards and
   Gates 2 to 5 as they were built — and the collisions each found only while building).
3. Read docs/features/reel-takes.md: Gate 2 in full — above all "Takes", "A retry's prompt", "At the cap", "Transient
   errors", "Spending" and "What this feature changes in verified features" — Gate 3's file locations, signatures and
   checks 5–12, Gate 4's Slice 2 and the slices after it, so you know what is NOT yours: no hold — a `hold` answer from
   atTheCap finishes the run failed, "a held shot is not built", a contract-valid answer no check asserts (Gate 4); no
   StillHold row, label, event or probe; no RenderShot union, no still-hold schema, no zoompan in any filtergraph; no
   kept work, no checkpoint, no `kept` on ClipsInput. Read the three Gate review sections, and what the third could not
   check: three-take runs against the 60-second lease (known limit 14) is yours to measure.
4. Decisions. In DECISIONS.md: S-090, S-091, S-094, S-095, S-096 and S-099 in full, and S-100; then the entries they
   supersede or lean on — S-066, S-069 (the events), S-071 (a clip's prompt and ids), S-072 (Gates 2 to 5 and the stop),
   S-080 and S-083 (the validator and the port the stage is handed), S-035, S-059 and S-087 (the guards and a stop's
   question), S-046 (a thrown call), S-060 (a repair prompt's form) and S-036. In steering-ref/steering/DECISIONS.md:
   D-014, D-018, D-024, D-025, D-030, D-033, D-043, D-047, D-050; and I-5, I-8, I-11 and I-15 in
   steering-ref/docs/founding/reel-creation-engine/contentions.md. Read each decision whole: sessions 20 and 29 found
   every bar-(a) finding in a clause the quote left out.
5. Read the real code Slice 2 touches: packages/contracts/src/clip.ts (TakeNumber, VideoAnswer, TakeRecord) and
   narration.ts; packages/pipeline/src/clips (index.ts — makeClips, its stop and its Slice 1 `unavailable` fault;
   ids.ts — takeIdOf and readTakeId; prompts.ts — clipPrompt and NEGATIVE_AUDIO; validate.ts); packages/pipeline/src/
   gates (gate2 to gate5); packages/providers/src/fake/video.ts and narration.ts (FakeVideoEntry, FakeNarrationEntry,
   key.ts' entryFor); packages/domain/src/clips.ts (recordClip, recordNarration, readRenderInputs, which still writes
   `number: 1`); apps/worker/src (video-port.ts and narration-port.ts — the guards, `transientErrors: 0`; clips-job.ts;
   questions.ts' appendClipsStopQuestion); and the tests that build or read what changes: tests/engine/video.ts
   (videoScript and clipsScript, which answer the model stand-in in call order), tests/engine/harness.ts
   (TEST_RENDER_SETTINGS' backoff of 20 ms), tests/reel-render-gates.test.ts (checks 20, 22, 23, 24),
   tests/reel-render-gate2.test.ts (21), tests/reel-render-stops.test.ts (26), tests/reel-render-endings.test.ts (47),
   tests/reel-render-faults.test.ts (46, which stands), tests/reel-render-spending.test.ts (the guards), and
   tests/reel-takes-record.test.ts (check 4, which must stay green — its clips-stage stop becomes a budget stop from this
   slice, by design, S-100).
6. Baseline: `node scripts/check.mjs` green, 302 tests by a TAP count (d6ae1f1). The suite takes about 185 s here, most
   of it reel-render's check 50 child.

What Slice 2 builds (Gate 4, Gate 3's signatures, and S-099 for the verified side):
- The take number on ids, rows and seeds: `a<attempt>-shot-<unit>-take-<n>`, n the take's number among the shot's
  decided takes, 1 to 3; the seed the CRC-32 of that id; the guarded video port writing the row's number from the id;
  readRenderInputs reading the row's number (S-094, S-099).
- makeClips: a take that fails is followed by the shot's next, in the first take's mode (S-091), with its criteria and
  requested seconds; the first accepted take is the shot's; after the third decided failure no video call names the
  shot. A take is counted once decided — Gate 2 failed, or Gate 5 completed — never when refused, unavailable to the
  last send, or thrown (S-094). Each take's verdicts are events, take after take (S-094, S-069).
- packages/pipeline/src/clips/prompts.ts: `retryPrompt(first, failed)` — the first take's prompt with, before the
  negative audio block, a line saying the takes before this one failed their checks, then every earlier failed take's
  reasons under `Take 1:` / `Take 2:` and `Gate 2:` / `Gate 3:` / `Gate 5:`; the block stays last, so every retry passes
  the validator; never a failed take's path, observation or expanded prompt (S-094, D-033, D-072). Gates 4 and 5 of a
  take are told nothing of an earlier take.
- packages/pipeline/src/clips/ladder.ts: `TAKES_A_SHOT = 3` and `atTheCap(shot, takes)` answering `hold` or `fail`,
  with no label member (S-090). A `fail` stops the run for the rule of the third take's lowest failing gate at step
  video, the detail naming the three takes, their reasons, and why the shot cannot be held (no chosen picture — made
  from words, the plan gave none or its picture was degraded — or an event mustShow). A `hold` finishes the run failed
  until Slice 3.
- Every send guarded, and a refused retry stopping the run for budget, the shot not held; a stop at the per-reel cap
  appending S-087's question naming the take by its id (S-095).
- The guarded video and narration ports sending again on `unavailable`: the same request, up to maxAttempts sends,
  waiting backoffMs and then twice the last wait, every send guarded; nothing written for an unavailable answer; made
  after N, the receipt's transient_errors N and the take counter unchanged; still unavailable at the last send, a throw
  naming the call, the sends and I-11, no row, no receipt, no take (S-096). A thrown call is still sent once.
- The stand-ins' `transient?: number` on FakeVideoEntry and FakeNarrationEntry: `unavailable` for the first n sends of
  that id, then made (S-096, Gate 3).
- reel-render (S-099): checks 21, 22, 23, 24 and 26, and check 47's "a take failing", build their failing take on each
  of a shot's three takes on a shot that cannot be held — shot 0 of NO_RECURRENCE, shot 3 of THREE_RANKS (made from
  words) or shot 0 of THREE_RANKS (it claims an event) — and assert of the three what they asserted of the one; check
  26's /one take/i becomes /three takes/i and /no approved picture/i; check 20's held case gains shot 1's retake answers
  and changes no assertion. S-099 lists every one, file by file — follow it exactly, and remove no assertion.
  docs/features/reel-render.md gains a note naming S-099 and checks 13 and 18; its gates and Evidence are not edited.
- Test support, no assertion: videoScript and clipsScript answering the model stand-in for each take made, retakes
  included, in call order (S-099).
- The checks, in tests/reel-takes-*.test.ts, each test titled with its check's number and words as Gate 3 writes them:
  5 (the next take, its mode on a pictured shot and one made from words, its id, number and seed; none after an
  accepted take; none after the third); 6 (the retry prompt, and take 3's differing from take 2's when both failed
  alike); 7 (Gates 4 and 5 told nothing of an earlier take — green once retries exist, and the check's breaks show it
  can fail); 8 (the events, eight for a shot accepted on its second take); 9 (every take guarded — its clause that a
  refused retry leaves no still-hold row green before Slice 3's code, said so in the check); 10 (unavailable N below
  maxAttempts, the waits measured, the take's number unchanged, for a video and a narration call); 11 (the last send,
  a throw sent once, and makeClips read directly failing on an unavailable that reaches it — the last two clauses green
  before this slice's code, as the check says); 12 (the three stops at the cap, and atTheCap compiled in the test with
  a label member a type error).

How to work:
- Red first, per check, and write down what each red said. Where a clause cannot be red before its code (checks 7, 9
  and 11 name theirs), say so; the breaks below are what show it can fail.
- The waits in check 10 are measured, not assumed: a wrapped port (the harness's wrapVideo and wrapNarration) can
  time each send. Keep TEST_RENDER_SETTINGS' short backoff; a test that needs another passes its own settings.
- Measure three-take runs against the 60-second lease (known limit 14): the slowest run a check makes, its clips job's
  seconds, stated in the journal.
- A choice between real alternatives the gates leave open — the retry prompt's exact wording, how the guard's wait is
  scheduled, where the stage keeps a shot's failed takes, the order of a take's receipts when it is sent again — is
  recorded as an S-entry only if it is a real choice with a rejected option and a way it is caught. The next free number
  is S-101.
- If building finds a verified check or a gate that cannot hold as written — a moved reel-render check whose premise
  S-099 got wrong, or a check 4 run that stops staying green — STOP on that point: record it, and ask the owner with
  AskUserQuestion, a recommended option first, rather than weakening a check or editing an approved gate. The approved
  Gates: line does not change.
- Once green, run a break campaign as sessions 28 and 30 did — the runner in .tmp/campaign/ (move session 30's
  breaks.mjs, chunk logs and results.jsonl aside to s30/ first; point TESTS and COUNTS at this slice's files and the
  moved reel-render files): each break's files saved as bytes and fsync'd to a record before touching them, restored
  from those bytes and read back, the record removed; every modified and untracked file fingerprinted after each
  restore; a refusal to start while a record exists; each break's own tests run, and counted. Break each clause at
  least once — among them: a retry in the other mode; the take number left at 1, or counted when made; a fourth take;
  a take after an accepted one; the seed of take 1 reused; the retry prompt consuming only the last failed take, or
  none, or placing its reasons after the block, or holding a failed take's path or observation; Gate 5's prompt given
  an earlier take's reasons; a take's verdict events grouped by gate; a refused retry holding its shot; only a call's
  first send guarded; an unavailable answer counted as a take, or written as a row; no backoff, or a constant one; the
  last send not throwing; a throw sent again; atTheCap holding a shot made from words, or one claiming an event; the
  cap's stop naming the wrong rule — plus a control caught by nothing. Record what each break was caught by, and fix —
  by ADDING — any break caught by nothing that a check's words promise to catch. Run the campaign inside one turn: the
  stop-gate runs check.mjs --code when a turn ends.
- Tick Slice 2 in docs/features/reel-takes.md only when checks 5–12 pass by number, 1–4 and every moved reel-render
  check still pass, and check.mjs is green.

Traps, each already paid for:
- A heredoc or `node -e` text holding backticks, apostrophes or backslashes can end early, run nothing, or arrive cut —
  session 30 had two. Write such text with the editing tool; a generated list that refers to itself is written as a
  plain loop after it.
- Shell tooling halves backslashes, and sed/grep in Git Bash strip `\r`. Verify a file's bytes, not the command typed.
- The model stand-in answers in call order: a retake shifts every later answer, so a script built for one take a shot
  misaligns silently. Session 28 found band colours too alike to tell apart; choose fixtures so the colours a check
  tells apart differ.
- SQLite adds a NOT NULL column with no default to an empty table without complaint (session 30): a fresh test
  database never shows a migration's default.
- `@cutroom/domain` does not resolve from tests/; a test importing it uses the package's src/index.ts by relative path.
- node:sqlite's rows have a null prototype: hand plain objects to a deepEqual (session 28).
- D-096 bans the field names source, sources, truthState, claimText and exposure anywhere; reel-render's check 5 bans a
  type or field named manifest or endCard.
- Leave no untracked file at the repository root; journey.mjs refuses a dirty tree.

Out of scope: anything from Slices 3–6 (above); check 4's second restart, which Slice 5 moves (S-100); video-edits'
gates; the paid-path feature — a real adapter answering `unavailable`, and transient errors on image and model calls;
the steering stubs and the pin (S-033); reel-script's criterion type (S-029).

Finish:
- `node scripts/check.mjs` green, with the new test count stated by a TAP count.
- A JOURNAL.md entry: intent; what changed (files, S-entries, the reel-render checks moved and how, the test support
  that changed, +N tests); observed — each red and what it said, the clauses green before code, the lease measured, the
  break campaign's table with what each was caught by, anything caught by nothing and what was done, any collision with
  a verified feature; next (Slice 3 — the hold at the cap: checks 13–15).
- Set this prompt's Run line to session 31 in PROMPTS/031-reel-takes-slice-2.md and in PROMPTS/README.md (S-065).
- Commit as `feat(reel-takes): Slice 2 — three takes, informed retries, transient errors, and the cap's stop`.
- If the owner asks for Slice 3's prompt, write it in PROMPTS/ as S-065 says.
```
