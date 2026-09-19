# 027 — reel-render: Slice 5

- **For:** session 27
- **Feature:** `reel-render` — [`docs/features/reel-render.md`](../docs/features/reel-render.md)
- **Work:** Slice 5 of 6 — spending and faults; checks 42–47, tests first; no journey
- **Written:** 2026-09-19, in session 26, after `reel-render`'s Slice 4 was committed (7f337f1) and pushed
- **Run:** session 27

Paste everything inside the block below as the session's first message.

```text
Build reel-render's Slice 5 — spending and faults — and nothing from Slice 6. It proves checks 42 to 47 of
docs/features/reel-render.md. Tests first: write each check's test, watch it fail for the reason it exists, then write
the code. reel-render has six slices; this is the fifth — six checks: the guards' comparison before every narration and
clip call and their refusals, the budget stops and their question entries, a thrown call at every port, a short judge
answer, and every ending's events. Gate 4 says checks 46 and 47 may be green before this slice's code, because Slices 3
and 4 already turn a throw into `failed` and write each ending's events: the breaks are what show they can fail. No
journey runs until Slice 6.

Start:
1. Run `node scripts/decisions.mjs`. If it says commits are unpushed in the steering repository, say so and stop.
2. Read CLAUDE.md; then JOURNAL.md's session 25 entry in full (Slice 4: what it built that no check asserts — the output
   check's other differences, renderManifest's other throws, the failures "the render manifest could not be built" and
   "the cut completed with no file", `request` carried and unread; S-081's Not handled narrowed by check 39, a clips-job
   ending's job cost still checked by nothing; a hold's labels with a failed ending asserted only for a Gate 7 stop;
   break 34d caught by nothing and named by no check; the campaign narrowed to 123 tests a break and run from
   .tmp/campaign/ once the scratchpad was withdrawn), session 23's (the guarded narration and video ports built with
   their receipts, costs and rows, their refusals left to this slice; the campaign stopped by the system for low memory
   at break 77), session 22's (S-081, S-082), and session 18's (reel-stills' Slice 4: the image guard's comparison, the
   cap read once per attempt, the stills stop for budget and its question entry — S-059 — and every ending's events).
3. Read docs/features/reel-render.md: Gate 2's "Admission", "Spending", "How a video run ends", "Cancel, and a restart"
   and "The ports"; Gate 3's file locations (`questions.ts` — the clip and narration stop entry), VideoAnswer's and
   NarrationAnswer's `refused`, ClipsOutcome and makeClips, the paragraph under WorkerOptions (no budget type declared
   outside @cutroom/reel-contract; the guarded ports built per job attempt knowing the cap the job read and the
   ceiling), and checks 42–47; Gate 4's Slice 5; and Slice 6, so you know what is NOT yours: no worker killed mid-clips
   or at Gate 7 (48, 49) — the guard reading an earlier clips attempt's spend is check 48's clause; no PATH-alone child
   (50); no journey. The Status line is the journey's, not a slice's.
4. Decisions. In DECISIONS.md: S-035, S-036, S-053 and S-059 in full, above all — the guard's form, what a stand-in
   costs, rounding up, the spend read before every call, the cap read once per attempt, a stop at the cap asking in
   S-026's form; then S-026, S-046, S-069 (the endings and their events), S-070, S-071, S-074, S-081 and S-083; and
   S-021, S-025, S-027, S-051, S-058, S-066, S-076. In steering-ref/steering/DECISIONS.md: D-005, D-014, D-019, D-081,
   D-094, D-097 and D-100.
5. Read the real code Slice 5 touches or copies: apps/worker/src (narration-port.ts and video-port.ts — the two guards,
   which today make every call, and the comments saying the comparison is Slice 5's; guarded-image-port.ts — the stills
   guard, cap first, then ceiling, Math.ceil over the spend plus the figure: the pattern; clips-job.ts — its context
   holds no budgetPath or questionsPath, and its stopped-budget branch fails the run with "a stop for budget in the
   clips stage is not built", the placeholder this slice replaces; keyframes-job.ts — readReelCapCents once per
   attempt, a BUDGET.md that cannot be read failing the run, the stopped-budget ending and the question after it;
   questions.ts — appendBudgetStopQuestion, which this slice's entry sits beside; assemble-job.ts — its three endings
   and the holds' events; worker.ts — what the clips context is handed); packages/pipeline/src (clips/index.ts —
   makeClips already turns a refused answer into stopped-budget with everything made so far, built in Slice 3 and
   asserted by nothing; render/index.ts — cutReel's failures; gates/gate7.ts — cutAnswer, and a judge answer leaving
   out a question); packages/domain/src (ledger.ts — spentCents, a SUM over the chain's job rows; budget.ts —
   readReelCapCents, and BUDGET_MD, which is steering-ref/steering/BUDGET.md; runs.ts — finishVideo); packages/
   providers/src (fake/video.ts and fake/narration.ts — costCents and throws per entry; fake/model.ts — { throws } per
   answer, by role and call order; ffmpeg/media.ts — throws per method, keyed by take, narration or a whole id, and a
   render's id is `a<attempt>-render`); and the tests: tests/engine/harness.ts (budgetMd, questionsPath, settings,
   renderSettings, wrapMedia, wrapAssembler), video.ts, render.ts and stills.ts; tests/reel-stills-spending.test.ts
   (budgetWithCap and the stills guard's checks — the pattern for 42 to 45); reel-stills-faults.test.ts and
   reel-stills-endings.test.ts (the patterns for 46 and 47); and reel-render-admission, -stills-stops, -cancel, -stops,
   -cut and -completed .test.ts (what each video ending already asserts, which check 47 gathers).
6. Baseline: `node scripts/check.mjs` green, 254 tests (this prompt's commit). Then run `ffmpeg -version` and
   `ffprobe -version`: 8.1.1 on PATH on 2026-09-19. If either does not run, say so and stop (S-075).

What Slice 5 builds (Gate 4):
- apps/worker: narration-port.ts and video-port.ts — BEFORE each call, the chain's spend read again plus the call's
  figure — the text's characters × the narration rate, or the requested seconds × the video rate — rounded up (S-053),
  compared with the per-reel cap the job read, then the ceiling; above either, `refused` with that limit and figure and
  nothing called; exactly equal is made. The validator stays outermost (S-083): a request it refuses throws before the
  guard is asked. clips-job.ts — the cap read once per attempt from BUDGET.md as the keyframes job reads it, a file that
  cannot be read failing the run; the ceiling the request's budgetCents; both handed to the two guards; the
  stopped-budget ending — stopped, reason budget, the limit, estimateCents, ceilingCents, capCents, costCents the
  spend, the finishing attempt's events then run.finished — and for limit reel one question entry appended AFTER the
  run is finished, a stop at the ceiling writing none. questions.ts — the clip and narration stop entry, in S-026's
  form, under a heading of its own naming the clip or the narration. worker.ts — the clips context handed budgetPath
  and questionsPath.
- Anything check 46 or 47 finds failing where it should not — fixed by adding, never by loosening.
- Test support, no assertion: whatever the harness lacks to script a narration rate, a clip's cost, a throw at each
  port call, a short judge answer, or a cancel landing after the clips stage and before the assemble job.
- The checks, in tests/reel-render-*.test.ts, each test titled with its check's number and words as Gate 3 writes them.

How to work:
- Red first, per check, and write down what each red said. Checks 42 to 45 should be red against today's guards, which
  make every call. Checks 46 and 47 may be green first (Gate 4): say which were, and show each can fail by its breaks. A
  change that is test support only cannot be red: say which.
- A workable order: 42 (both guards, each limit, exactly equal and one cent over, cap before ceiling); 44 (a narration
  at a scripted rate); 43 (a clip over its rate, the next call refused at the ceiling); 45 (the cap, and the entry);
  46 (one throw per port call named, then the short judge answer); 47 (the eleven endings). If it becomes clear the
  slice will not fit in this session, stop at a green state and ask the owner with AskUserQuestion — do not tick the
  slice, commit it as done, or cut it yourself.
- Look for collisions while reading, before writing a test. Points checked on 2026-09-19, each worth a look:
  - ClipsOutcome's stopped-budget carries only the limit and estimateCents (Gate 3, typed from VideoAnswer's
    `refused`), yet check 45's entry names the clip or the narration that was refused. Where that name comes from — the
    guard, which holds the request it refused, or the stage's records — is a real choice. Widening ClipsOutcome,
    VideoAnswer or NarrationAnswer changes an approved Gate 3 signature: not yours without asking. No budget type is
    declared outside @cutroom/reel-contract (D-094).
  - "characters × the narration rate": a string's length counts UTF-16 units, not characters. Every fixture text is
    ASCII today, so no test tells the two apart. Decide, say how you count, and whether it is an S-entry.
  - the narration rate defaults to 0 (T2A is plan-covered, D-019), so a narration's figure is 0 by default. After a
    clip that cost more than its rate, the next call is refused only because the spend alone is over — which is what
    check 43's "the spend plus the next call's figure" reads. Each shot is narration then clip (check 13), so after the
    LAST shot's clip there is no next call and no guard fires: say what that run does, and record it if no check's
    words reach it rather than building past the gates.
  - the stills stage's pictures are in the chain's spend. A video run's exactly-equal boundary in check 42 is easiest
    to miss by a picture's cents: compute it from what the run's rows say was spent, not from a constant.
  - spentCents sums job rows' cost_cents, and each guard's after-call transaction adds its cost to the job row, so the
    read before the next call sees it. The image guard rounds Math.ceil(spent + rate); a video rate × seconds can be
    fractional — say whether the figure or the total is rounded up, and keep one rule across the three guards (S-053,
    S-059).
  - the clips job does not read BUDGET.md today. From this slice every video run reads it in the clips stage too —
    steering-ref/steering/BUDGET.md unless the test hands budgetMd, as the keyframes job already does. A test must
    never write the default file.
  - makeClips already answers stopped-budget on a refused call, with its events: the verdicts of the gates reached,
    then the clips job's run.finished — what check 47's "stopped for budget in the clips stage" case asserts.
  - check 46 names eleven port calls and a short judge answer. The stand-ins throw per entry (video, narration), per
    role and call order (model — observe on a clip is the witness script, reconcile the reconciler's structured call,
    judgeCut the judge script after the stills' judge answers), per method and id (media — frames and the output's
    probe by the render id); assemble has no script, only wrapAssembler. "Every receipt of a call that returned kept":
    count receipts from the tables before and after, not from a stand-in's own list.
  - a throw at assemble, frames or judgeCut fails the assemble job, and S-058 writes a hold's labels with whatever
    ending the job reaches. Check 47's "failed in the assemble job" lists a degraded event for each hold before
    run.finished: script a hold into that case (fakeVideo's scripted length) so it reads what session 25 left unread.
  - several of check 47's eleven endings are asserted in pieces by Slices 2 to 4 (admission, stills-stops, cancel,
    stops, cut, completed). Check 47 asserts each whole, exactly and in order, in one place; no earlier assertion is
    removed or loosened. Check 11's second test shows how a cancel lands after the clips stage.
  - time and memory: every case that reaches assembly encodes — 47's completed, Gate 7 stop and assemble failure, and
    46's frames, assemble and judgeCut throws. A longer wait is test support, not a weakened check — say where and why.
  - S-081: checks 43 and 45 read costCents, the result's. The clips job's own row cost at a budget ending is still
    promised by no check's words: say so again unless a Slice 5 check's words promise it.
  If building finds a verified check or a gate that cannot hold as written, STOP on that point: record it, and ask the
  owner with AskUserQuestion, a recommended option first, rather than weakening a check or editing an approved gate.
  Nothing about the approved Gates: line changes.
- A choice between real alternatives the gates leave open — where the refused call's name comes from, how characters
  are counted, what is rounded, the entry's wording — is recorded as an S-entry only if it is a real choice with a
  rejected option and a way it is caught. The next free number is S-087.
- Once green, run a break campaign as sessions 19 and 21 to 25 did, from a runner in .tmp/campaign/ (ignored) rather
  than the scratchpad, which was withdrawn mid-session 25: each file's bytes (fsync'd) saved to a record before touching
  it, restored from those bytes and read back; every modified and untracked file fingerprinted after each restore; a
  refusal to start while a record exists; every find checked to occur once before a chunk starts. Carried lessons: use
  the built-in TAP reporter or pass a custom one as a file:// URL, and require the counts — a suite that prints none is
  a runner fault, not a catch; always --test-timeout; BOUND THE MEMORY FROM THE START with --test-concurrency=6 and few
  chunks at once; after each chunk confirm no record is left and .artifacts/ is empty. Every break runs typecheck and
  the test files it can move; if you narrow them as session 25 did, say which. Break each rule of each check at least
  once — the spend read once per attempt instead of before each call; the figure not rounded up, or rounded down; the
  ceiling compared before the cap; only one of the two compared; exactly equal refused; one cent over made; the
  narration figure at the video rate or by words; the video figure at the narration rate or the plan's seconds; a
  refused call made anyway; a refusal writing a receipt or a row; the guard outside the validator; the stop ending
  failed; each result field wrong — the limit, estimateCents the spend alone or the figure alone, ceilingCents and
  capCents swapped, costCents the estimate; a question for a ceiling stop; none for a cap stop; one written before the
  run is finished; two entries; an entry not naming its call; the cap read per call or from settings; a BUDGET.md that
  cannot be read not failing the run; a throw at each port call swallowed, or ending anything but failed; an empty
  detail; a returned call's receipt dropped; a short judge answer accepted; in each of the eleven endings an event
  missing, an extra one, two reordered, run.finished twice, stage.finished for video on an ending that does not
  complete, a hold's degraded event missing on a failed assembly — plus a control that should be caught by nothing.
  Record what each break was caught by, fix by ADDING any break caught by nothing that a check's words promise to
  catch, and say which are owed to Slice 6. Run the campaign inside one turn: the stop-gate runs check.mjs --code when a
  turn ends, so never end a turn with a break applied — wait on each background chunk with a foreground waiter whose end
  condition is the runner's own completion line, not a pattern a test title can contain.
- Tick Slice 5 in docs/features/reel-render.md only when checks 42–47 pass by number and check.mjs is green.

Traps, each already paid for:
- A heredoc or `node -e` text holding backticks or apostrophes can end early and run nothing — session 25's did, and
  wrote nothing. Write such text with the editing tool, and check the file's line count.
- Shell tooling halves backslashes, and sed/grep in Git Bash strip `\r`. Verify a file's bytes, not the command typed.
- Start a tool with an argument array, never a shell string. A Windows path INSIDE a filtergraph needs its `:` and `\`
  escaped; one given as an input or output argument does not.
- ffmpeg's detectors report on stderr at info level: read what you parse, ignore the rest, do not quiet the log level.
- The questions file is created with its header on the first write: a test reads the harness's questionsPath, never a
  QUESTIONS.md at the root, and counts entries by their headings.
- TypeScript checks a fresh object literal for excess properties and a variable not at all (session 21's check 1).
- `@cutroom/domain` does not resolve from tests/; a test importing it uses the package's src/index.ts by relative path.
- A held call that never arrives hangs its file until the timeout: fail once the run finishes first, as whenHeld does.
- Leave no untracked file at the repository root; journey.mjs refuses a dirty tree.

Out of scope: anything from Slice 6 — restarts (48, 49), the PATH-alone child (50), the journeys; S-081's clips-job
ending cost (still unchecked — say so again unless a Slice 5 check's words promise it); break 34d, a level no check
names (deferred item 15); renderManifest's unread `request`; retrying a thrown call — I-11's counter is reel-takes'
(deferred item 2), and a thrown call here fails the run; reel-takes' and video-edits' gates; the steering stubs and the
pin (S-033); reel-script's criterion type (S-029).

Finish:
- `node scripts/check.mjs` green, with the new test count stated.
- A JOURNAL.md entry: intent; what changed (files, S-entries, the verified checks and test support that changed, +N
  tests); observed — each red and what it said, which of 46 and 47 were green first, what Slice 5 builds that no Slice
  5 check asserts, what was measured rather than assumed, the break campaign's table with what each was caught by,
  anything caught by nothing and what was done, any collision with a verified feature; next (Slice 6 — restart, no
  secrets, and the journeys; checks 48–50, then re-running 1–47).
- Set this prompt's Run line to session 27 in PROMPTS/027-reel-render-slice-5.md and in PROMPTS/README.md (S-065).
- Commit as `feat(reel-render): Slice 5 — spending and faults`.
- If the owner asks for Slice 6's prompt, write it in PROMPTS/ as S-065 says.
```
