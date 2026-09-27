# 059 — `resume-failed`: the build from Slice 5, slice by slice, to its journey

- **For:** session 59
- **Feature:** `resume-failed` (S-157, S-161 to S-164, S-171)
- **Work:** Slices 5 to 7 in the gates' order, each built by one `slice-builder` agent (S-172) and committed after the
  full check; Slice 7 runs the journey.
- **Written:** 2026-09-27, at the end of session 58, which built Slice 4 and stopped at its boundary at the owner's word.
- **Run:** session 59 — Slice 5 built and committed; Slices 6 and 7 remain

**Where things stand.** The four gates are APPROVED (Gate review 12). Slices 1 (`e67ec6f`), 2 (`0f73e5d`), 3
(`395dc40`) and 4 are built, each after a full `check.mjs` green. Slice 4 made the call: `reel-contract`'s
`POST /v1/runs/:runId/resume` with `Piece`, `ResumeRequest` and `ResumeResponse` (`packages/reel-contract/src/resume.ts`);
`RunStatus`'s `resumes` and `resumedBy`, the record's `keptFrom`, each absent — never null — on a run that resumes
nothing; lookup and replay answering the newest run of a request; the API's route handed a `ResumeService`
(`decide`, `askOwner`) and `budgetPath`, both optional, 422 `unsupported` without them; `resumeService(...)` in
`apps/service/src/service.ts`, exported from `@cutroom/service`, handed to `startApi` with the worker's settings,
questions file and cap file; `appendResumeQuestion` exported from `@cutroom/worker`; S-171's stop by
`readStillsInputs`' `copiedPictures`; the stand-in engine and client. Checks 26 to 34 in
`tests/resume-failed-contract.test.ts`. Slice 5 is the engine's own resume: six checks (35 to 40).

**What Slice 4 left for Slice 5 to build on.** `ResumeService.decide` plans for the CALLER only (`planResume(...,
'caller')`); the engine's resume is planned in `apps/worker/src/resume.ts` (new), which imports `domain` and `pipeline`
and uses the same `planResume` and `admitResume` with `'engine'`. `appendResumeQuestion(path, ResumeQuestion, now)`
already takes `by: 'engine'` and an empty `named` ("none: every piece the run checked is kept"); Slice 5 asks it from
the engine and adds `appendResumeUnmade(path, runId, why, now)`. `resumeRun(tx, runId, plan, { now, delayMs,
resumeRequest })` is what the API calls with `delayMs: 0` and the normalised list; the engine's resume passes
`resumeDelayMs` and `resumeRequest: null`. `ApiOptions.resume` and `budgetPath` are optional and must stay so.

**Slice 4's lessons for the brief.** A deliberate break a stand-in cannot tell apart is a check green for the wrong
reason: Slice 4's check 34 ran the service as a child process configured by environment alone, so its rates always
equalled the defaults and a service pricing with `DEFAULT_PLAN_SETTINGS` stayed green (break B31) until an in-process
part with other rates was added. Ask the builder, before it writes a test, whether each property's break is observable
under stand-ins. And the builder took about an hour for nine checks; the test-impact pass about eleven minutes.

Paste everything inside the block below as the session's first message.

```text
resume-failed: the build from Slice 5, slice by slice, to its journey.

1. `node scripts/decisions.mjs`. If it says commits are unpushed in the steering repository, say so and stop.
   Read docs/context.md first, then CLAUDE.md; open JOURNAL.md, DECISIONS.md and docs/features/resume-failed.md only by
   the headings they name, never whole (S-160). `node scripts/check.mjs --changed` once (S-159).
2. The build, from Slice 5, in the gates' order (Gate 4), ONE SLICE AT A TIME, EACH BY ONE `slice-builder` AGENT
   (S-172). Per slice, in this session: read its Gate 4 box and the Gate 3 checks and amended checks it proves; the
   test-impact agent on anything the slice touches that a verified check asserts — handed the exact changes and told
   what Gate 3 already lists, so it does not repeat that pass; then brief the builder with those facts, this prompt's
   "What Slice 4 left" lines, and one test of done — the slice's test file and `check.mjs --changed` green — and ask it
   to confirm each property's break is observable under stand-ins before it writes the test (Slice 4's B31). Then read
   its diff, the full `node scripts/check.mjs` green (the check-runner agent), tick its box in Gate 4, and one commit
   naming the slice, the checks it proves and the builder's breaks. Slice 5 is the engine's own resume: the worker's
   switch, off by default; one `resume` key on every job's context; reel-render's amended check 40; the finishing
   functions' fixed order — labels, the resume's savepoint, then `endRun`; `appendResumeQuestion` asked by the engine
   and `appendResumeUnmade`; the service's switch and `resumeDelayMs` (CUTROOM_RESUME_DELAY_MS). Checks 35 to 40. A
   choice the gates leave open that a builder reports goes to me with AskUserQuestion.
3. Slice 7: `node scripts/journey.mjs resume-failed` after its commit, and the other features' journeys Gate 4 names.
   A FAIL is the finding: stop and report.
4. Go on to the next slice after each commit. Stop only at a slice boundary, when this session's own context grows
   heavy or I say so — never inside a slice. The journal and docs/context.md hand the next slice over.

How to work:
- --changed between steps; the full check.mjs before every commit of code, and before a journey (S-159).
- S-160: hand an agent its facts and the lines of docs/context.md that matter, not a search. Agents working at once
  run as one workflow.
- Every provider stays a stand-in in tests; no real run in this session, and nothing spent.
- Never change a check or a test to reach green. Never raise the 250c ceiling. Never print a key or read .env.
- No absolute path in any committed file (D-086).
- A choice between real alternatives the gates do not settle goes to me with AskUserQuestion, then into DECISIONS.md.
- Close out with a JOURNAL.md entry and docs/context.md's entry for this session (S-160), this prompt's Run line set
  here and in PROMPTS/README.md (S-065), and PROMPTS/060 — the next slice of resume-failed, or, when Slice 7's journey
  has passed, cutroom-sdk's gates (S-173: KnowScroll calls the engine through @cutroom/sdk, which connects to it or
  starts it when none answers), then self-heal's (S-169, S-170), then caption-match's (S-165, S-168).
```
