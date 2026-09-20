# 035 — reel-takes: Slice 6

- **For:** session 35
- **Feature:** `reel-takes` — [`docs/features/reel-takes.md`](../docs/features/reel-takes.md)
- **Work:** Slice 6 of 6 — endings, no secrets, and the journeys; checks 25–26, then five journeys
- **Written:** 2026-09-20, at the end of session 34, after `reel-takes`' Slice 5 was committed (3c263fa)
- **Run:** not yet

Paste everything inside the block below as the session's first message.

```text
Build reel-takes' Slice 6 — endings, no secrets, and the journeys. It proves checks 25 and 26 of
docs/features/reel-takes.md, re-runs 1 to 24, and then runs FIVE journeys: reel-takes' own, and reel-render's,
reel-stills', reel-plan's and reel-contract's again (S-099). This is the LAST slice: the feature is verified by its
journey, not by this slice.

Start:
1. Run `node scripts/decisions.mjs`. If it says commits are unpushed in the steering repository, say so and stop.
2. SETTLE docs/STATUS.md BEFORE ANYTHING ELSE. It is untracked in this repository, it appeared during session 34,
   nothing in this repository writes it, and `journey.mjs` refuses on any non-empty `git status --porcelain` — so every
   journey of this slice will refuse while it sits there. Ask the owner with AskUserQuestion what it is and what to do
   with it — commit it, move it out of the repository, or delete it — with a recommended option first. Do not decide
   for them, and do not delete it yourself. Session 19 hit the same thing with `nextPrompt.txt` and the owner chose.
3. Read CLAUDE.md; then JOURNAL.md's session 34 entry in full (Slice 5: the kept work, the two moved checks, S-106,
   the fixture collision, the three breaks caught by nothing and fixed by adding), session 33's (Slice 4) and session
   28's — reel-render's own Slice 6, which is the shape of this one: checks 48–50, then four journeys, each on a clean
   tree and committed on its own.
4. Read docs/features/reel-takes.md: Gate 1 in full (the last Outcome line is this slice's), Gate 2's "Events and
   endings" and "The takes in the record", Gate 3's checks 25 and 26, and Gate 4's Slice 6. Note what Gate 4 says of
   check 25: it is GREEN BEFORE THIS SLICE'S CODE, since Slices 2 to 5 write every one of these endings' events — so
   the break campaign is the only thing that shows each can fail, exactly as reel-render's check 47 was.
5. Decisions. In DECISIONS.md: S-069 in full (the events of a video run and their order — this check's spine), then
   S-094 (each take's verdicts, take after take), S-098 (the degraded event after the third take's verdicts, and the
   order of degradations), S-092 and S-106 (a restart's events: every kept and made take's verdicts once), S-096 (a
   call unavailable to the last send), S-095 and S-087 (a refused retry), S-090 (a shot failing at its cap), S-028 in
   full (the PATH-alone child and the eleven variables libuv adds on Windows), S-075 (ffmpeg from PATH), S-016 (the
   journey writes the evidence, the status and the divergence; never typed by hand), S-099 (the four journeys run
   again here). In steering-ref/steering/DECISIONS.md: D-020 (one journey a feature), D-015, D-097 and D-100 where
   they bear on it. Read each decision whole.
6. Read the two tests this slice copies the form of, and the script it ends with:
   - tests/reel-render-endings.test.ts — check 47: each ending one run of THREE_RANKS, each event list typed by hand,
     the plan and stills stages as shared constants. 12 tests.
   - tests/reel-render-secrets.test.ts — check 50: the probe that reads what a child started with `env: { PATH }`
     ACTUALLY holds, the eleven allowed names, the canary shaped like a key, the roll call that every check of the
     journey ran and passed in the child and that the check did not run itself, and the concurrency bound and the
     300-second timeout its comment records as test support, with the numbers measured on 2026-09-19.
   - scripts/journey.mjs — what it refuses on (a gate not approved, a slice not ticked, no test named for the feature,
     a dirty tree), and what it writes (an Evidence line, Status, Divergence).
   And the reel-takes tests as they stand: 19 files, 59 tests, tests/reel-takes-*.test.ts.

What Slice 6 builds (Gate 4, Gate 3's checks):
- `tests/reel-takes-endings.test.ts` — check 25. SIX endings, each one run, each event list typed by hand, in the
  order the gates ran: a shot accepted on a RETRY, completed; a shot HELD, completed; a shot failing AT ITS CAP; a
  RETRY STOPPED FOR BUDGET; a call UNAVAILABLE to the last send; and a run PICKED UP FROM ITS CHECKPOINTS, completed.
  Pieces of each are asserted by Slices 2 to 5 — checks 8, 12, 13, 14, 9, 11 and 21 — and none of those is changed:
  this check holds each whole, in one place, as check 47 does for reel-render's endings.
- `tests/reel-takes-secrets.test.ts` — check 26. Every other test of the journey in one child whose environment is
  PATH and nothing else this process holds, in S-028's form: the probe first, the canary, the allowed names, then the
  suite, then the roll call of checks 1 to 25 passing and 26 not running. The restart checks' own worker processes
  inherit that environment, and so does every ffmpeg and ffprobe they start (S-075).
- Nothing else. No production code is expected to change. If a check turns red and the fix is in the engine, that is
  the finding: record it, and say so plainly rather than changing the check.

How to work:
- Check 25 first, then 26. Say for each of check 25's six endings whether it was green before the code and why — Gate
  4 says all six are, since Slices 2 to 5 write them — and do not treat that as nothing: the BREAK CAMPAIGN is what
  shows each can fail, so this slice's campaign matters more than its tests.
- MEASURE check 26's child before you bound it. reel-takes now holds SIX restart runs, each spawning a worker process
  of its own, and the suite already runs about 220 s. Time the child at Node's default concurrency and at a bound,
  read the memory left, and write the numbers into the test's comment as check 50's are written. A bound and a timeout
  are test support and change no assertion — but if choosing them is a real choice with a rejected option and a way a
  wrong one is caught, record it as an S-entry. The next free number is S-107.
- Watch reel-render's check 50 child too: it was 169–170 s inside the suite in session 32, under its 300-second bound,
  and session 31 saw it overrun twice on a loaded machine. Two PATH-alone children now run in one suite. Say what you
  measure. Do not widen either bound to reach green without recording why.
- A choice between real alternatives becomes an S-entry with what was rejected and how a violation will be caught.
- If building finds a verified check or a gate that cannot hold as written, STOP on that point: record it, and ask the
  owner with AskUserQuestion, a recommended option first, rather than weakening a check or editing an approved gate.
- Once green, run a break campaign as sessions 30–34 did — the runner in .tmp/campaign/ (move session 34's breaks.mjs,
  chunk logs and results.jsonl aside to s34/ first; the break list exports its default TESTS and each file's COUNTS,
  and the runner takes `--only=<ids>`): each break's files saved as bytes and fsync'd to a record before touching
  them, restored from those bytes and read back, the record removed; every modified and untracked file fingerprinted
  after each restore; a refusal to start while a record exists; each break's own tests run, and counted. COUNT EACH
  TEST FILE BEFORE WRITING COUNTS. Break each of check 25's six endings at least once — among them: a verdict event
  dropped from a retry's take; the events of a held shot's three takes grouped by gate; the degraded event before the
  third take's verdicts, or after run.finished; stage.finished video written on a budget stop; a run.finished missing
  its status; a checkpoint restart emitting the kept takes' verdicts twice or not at all — plus, for check 26, a
  variable beyond PATH reaching the child, the canary passed through, a test file left out of the child's list, and
  the roll call not asserting that every check ran. Add a control caught by nothing. Record what each break was caught
  by, and fix — by ADDING — any break caught by nothing that a check's words promise to catch.
  Run the campaign inside one turn: the stop-gate runs check.mjs --code when a turn ends.
- Tick Slice 6 in docs/features/reel-takes.md only when checks 25 and 26 pass by number, 1–24 still pass, and
  check.mjs is green.

Then THE JOURNEYS, and only then — each needs a clean tree (S-016):
- Commit the slice first, as `feat(reel-takes): Slice 6 — endings, no secrets, and the journeys`.
- `node scripts/journey.mjs reel-takes`. A FAIL is the finding: stop and report it, do not edit the evidence.
- Then `reel-render`, `reel-stills`, `reel-plan` and `reel-contract`, in that order (S-099), each on a clean tree.
- COMMIT EACH JOURNEY ON ITS OWN, as session 28 did, so each evidence line names the commit it was run at.
- Never type an Evidence line, a Status or a Divergence by hand.

Traps, each already paid for:
- A heredoc or `node -e` text holding backticks, apostrophes or backslashes can end early, run nothing, or arrive cut —
  sessions 33 and 34 both lost an edit that way. Write such text with the editing tool and verify the file's bytes.
- Shell tooling halves backslashes, and sed/grep in Git Bash strip `\r`. Count bytes: `tr -cd '\r' < file | wc -c`.
- node:sqlite's rows have a null prototype: hand plain objects to a deepEqual. `@cutroom/domain` does not resolve from
  tests/; a test importing it uses the package's src/index.ts by relative path.
- Two takes of one fixture can be too alike to tell apart: `takeOfFrames` refuses adjacent bands within 80, and
  session 34 hit that twice. Compute the colours before writing a fixture that measures frames.
- No absolute path is written anywhere (D-086). D-096 bans the field names source, sources, truthState, claimText and
  exposure.
- A take that fails Gate 2 makes no model call, so a script leaves it out: `videoScript` answers in call order, and
  `retake(take, n)` gives a retake its own key.
- Leave no untracked file at the repository root, or anywhere: journey.mjs refuses on a dirty tree, untracked files
  included. That is why docs/STATUS.md is settled first.

Out of scope: anything the journeys do not need; the narration guard's every-send rule (S-101's Not handled); a
keyframes job run again, which still starts over (S-048); an assemble job run again, which still renders and buys
nothing (S-076); video-edits' gates; the paid-path feature; the steering stubs and the pin (S-033); reel-script's
criterion type (S-029).

Finish:
- `node scripts/check.mjs` green, with the new test count stated by a TAP count.
- Five journeys run, each PASS or its FAIL reported, each committed on its own.
- A JOURNAL.md entry: intent; what changed (files, S-entries, +N tests); observed — which of check 25's six endings
  were green before the code and why, what check 26's child measured (its time, its concurrency, the memory left) and
  what reel-render's check 50 child measured beside it, the break campaign's table with what each was caught by,
  anything caught by nothing and what was done, and each journey's result with its commit and test count; next.
- Set this prompt's Run line to session 35 in PROMPTS/035-reel-takes-slice-6.md and in PROMPTS/README.md (S-065).
- If the owner asks what is next after this, the answer is theirs to make: `video-edits`, whose gates are not written,
  or the paid path, which is not planned. Say what each would need.
```
