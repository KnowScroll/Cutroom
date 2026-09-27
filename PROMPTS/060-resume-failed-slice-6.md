# 060 — `resume-failed`: Slice 6, the owner's script

- **For:** session 60
- **Feature:** `resume-failed` (S-157, S-161 to S-164, S-171 to S-174)
- **Work:** build Slice 6 only — the owner-facing resume script and its service helpers — with one `slice-builder` agent (S-172); commit only after the full check is green
- **Written:** 2026-09-27
- **Run:** session 60

**Where things stand.** The four gates are APPROVED (Gate review 12). Slices 1 through 5 are built and committed:
`e67ec6f`, `0f73e5d`, `395dc40`, `7315af0`, and `7835849`. Slice 5's production path was read end to end: all four
jobs hand failed provider endings to `finishFailed`; the finishing transactions write labels, run the engine resume in a
savepoint, then write `run.finished`; the service enables the switch at a validated 900000 ms default. Its checks 35 to
40 and the amended `reel-render` context checks passed together, 9/9. The full aggregate test command is currently
marginal: its wrapper reports a test-phase failure after several minutes without naming the failing test, while the
focused Slice 5 checks pass. Do not weaken, skip or lengthen a check to reach green; a full-check failure is a finding
that must be understood before a code commit.

**What Slice 6 starts from.** `scripts/real-reel.mjs` has one direct `fetch` submission path, reads one confirmation,
follows only that submitted run, and stops the service when it ends. It has no resume CLI, no preview, no hand-off to
`resumedBy`, and no protection against a waiting run being claimed by its next start. `apps/service` has neither
`waitingRuns` nor `cancelRuns`; `scripts/_answers.mjs` and its declaration do not exist. The resume API, its strict
request shapes, `ResumeService`, automatic engine resume, and `RunStatus.resumedBy` already exist. The root package
does not depend on `@cutroom/domain`: the spending script must use `@cutroom/service` for the waiting-run operations.

**Slice 6's fixed contract.** It proves Gate 3 checks 41, 42 and 43:

- `real-reel.mjs --resume <runId>` first posts a literal `{ preview: true }` to that run's resume route, prints every
  normalised piece and the resume figure, then requires the exact confirmation for that printed figure. A wrong answer
  exits before the paid resume post. The paid post has no `preview` key.
- `--remake <kind[:shot],…>` supplies the requested remake pieces to that preview and call. The script keeps its
  existing new-reel path; `makeReel` owns the one `/v1/runs` post and `resumeReel` owns the resume posts. One shared
  `post(path, body)` owns the sole `method: 'POST'` spelling.
- Polling a followed run reads `resumedBy`; when the engine has made a successor, the script names the wait, follows
  that new run, and keeps the service alive until the final run ends.
- Before `startService`, the script asks `@cutroom/service` for every running run with a queued or running job, names
  them, and defaults to cancelling them. `cancelRuns` sets only their cancel flags before the worker can claim them;
  choosing to leave them alone is explicit.
- All questions consume answers from one read of stdin. `scripts/_answers.mjs` is pure and imports nothing; its
  declaration preserves strict typechecking. Redirected input is split once and successive questions receive successive
  lines; the terminal path still works for a person typing answers.
- `waitingRuns(dbPath)` opens no database and creates no file when the path does not exist. When it does exist, it is
  read-only: it reports every running run with a queued or running job and changes neither rows nor `PRAGMA data_version`.
  `cancelRuns(dbPath, runIds)` changes only `cancel_requested` on the named runs. Both are exported from
  `@cutroom/service`.

Paste everything inside the block below as the session's first message.

```text
resume-failed: build Slice 6, the owner's script, then stop at its boundary.

1. `node scripts/decisions.mjs`. If it says commits are unpushed in the steering repository, say so and stop.
   Read docs/context.md first, then CLAUDE.md; open JOURNAL.md, DECISIONS.md and docs/features/resume-failed.md only by
   the headings they name (S-160). Run `node scripts/check.mjs --changed` once. The gates are approved; build no work
   outside Slice 6.
2. Read Slice 6's Gate 4 box and Gate 3 checks 41–43, including paid-path check 20's Slice-6 amendment. First run the
   test-impact pass on `scripts/real-reel.mjs`, `apps/service`, `tests/paid-path-real-reel.test.ts`, and the new
   `tests/resume-failed-script.test.ts`; hand it the fixed contract in PROMPTS/060 so it reports only verified checks
   the slice can turn red. Then brief ONE `slice-builder` agent (S-172) with that report, this prompt's “What Slice 6
   starts from” and “fixed contract” sections, and one test of done: checks 41–43 plus `check.mjs --changed` green.
   Before writing tests, have the builder state how every deliberate break will be observable without running a real
   provider or spending money.
3. Build only this:
   - `scripts/_answers.mjs` and its declaration: a pure, import-free way to hand successive lines from one redirected
     input to successive questions. Test it directly; no test helper may name or execute `real-reel.mjs`.
   - `waitingRuns` and `cancelRuns` in `@cutroom/service`, exported through its public index. The script imports neither
     `@cutroom/domain` nor a model/provider. A missing DB must be observed without creating it; an existing DB is read
     through a read-only connection; cancelling mutates only the requested cancel flags.
   - The real-reel script: one `post()` helper; `makeReel`; `resumeReel`; `--resume <runId>` and `--remake
     <kind[:shot],…>`; a literal preview request and printed figures/pieces; the second confirmation gate before the
     non-preview resume post; waiting-run question before `startService`; and polling that follows `resumedBy` to the
     final ending. Preserve the 250c ceiling, the existing first confirmation, no-key rule, one real reel per new-run
     invocation, and the receipt report.
4. Amend paid-path check 20 exactly as Gate 3 says: it must read source only, retain every existing assertion, prove
   that `post()` owns the only POST spelling, distinguish the new-reel confirmation from the resume confirmation, prove
   each function owns only its route, and prove check 20's local imports cannot start a process. Add checks 41–43 in
   `tests/resume-failed-script.test.ts` and `tests/paid-path-real-reel.test.ts`. Do not run `real-reel.mjs`, read an
   environment key, or make a real provider call.
5. Read the builder diff and each deliberate break. Run the full `node scripts/check.mjs` before committing. A failure
   is the finding: do not weaken a test, extend a timeout, or commit around it. When it is green, tick Slice 6, write
   its `paid-path` amendment block, update JOURNAL.md and docs/context.md, set this prompt's Run line and PROMPTS/README,
   and make one commit naming Slice 6, checks 41–43, and the observed breaks.
6. Stop at the Slice 6 boundary. Write PROMPTS/061 for Slice 7 — check 44 and the required journeys — but do not start
   that slice in this session.

How to work:
- Providers remain stand-ins in tests. No real run, no spend, no key printed or read by the script.
- `--changed` runs between steps; the full check is required before the code commit and before Slice 7's journeys.
- Never alter a test or boundary rule to reach green. No absolute path in a committed file (D-086).
- If the gates leave a real choice open, ask the owner and write the answer into DECISIONS.md before building it.
```
