# JOURNAL

Append one entry per session: what changed, what was observed, why, and what is next. The
stop-gate hook refuses to end a session that leaves no entry. Newest at the bottom.

---

## 2026-09-12 — session 01, the room is built and nothing is furnished

**Changed.** The repository: `.gitattributes` first, then the toolchain (pnpm workspace, Node 22,
TypeScript ESM strict), six empty packages, eleven boundary rules with a self-proving mode, five
test files, five scripts, the Claude Code setup, `README.md`, `CLAUDE.md`, `AGENTS.md`,
`DECISIONS.md` with twelve `S-` entries, `docs/SETUP_SURVEY.md`, and the three design documents
copied to `docs/design/` with a provenance manifest. The steering repository is pinned as the
`steering-ref` submodule. **No feature code: no contracts, no tables, no stages, no providers.**

**Observed.**

- **The pin can see 76 decisions; 89 exist.** The steering repository is 11 commits ahead of its
  remote, and a submodule can only pin what the remote has — so `D-077` to `D-089`, which include
  the three that describe this repository's own reason to exist, are invisible here until someone
  pushes. `scripts/decisions.mjs` reports it and exits non-zero rather than letting the gap be
  silent. This is the one red light in `node scripts/check.mjs`, and it is not fixable here.
- **ESLint found a real defect in a boundary regex on its first run.** `'\.'` in a JavaScript
  string collapses to `.`, so two patterns were matching any character instead of a literal dot.
  The cause was upstream of the linter: **a shell heredoc halved the backslashes in transit.** A
  rule can be wrong in a way that reads correctly; `--prove` is what makes that survivable.
- **`node --test <dir>` does not work on Node 22.14** — a bare directory is resolved as a module
  path and fails with `MODULE_NOT_FOUND`. A quoted glob works, and **Node** expands it, so the
  same command behaves identically in bash and in cmd.exe.
- **`contentions.md` contains a lone carriage return inside a code span**, at line 550, as prose
  about this exact class of bug. Every comparison here normalises `\r\n` and never a lone `\r`.
- **The steering repository gained two commits while this session ran** — a second adversarial
  review of `reel-engine`, with findings. Nothing here depended on its outcome, because nothing
  here is feature code.

**Why.** Every choice that had a real alternative is an `S-` entry with what was rejected and how
a violation gets caught. The four that were the owner's to make — how the decisions are read, how
much ritual this repository runs, the package scope, and copy-versus-move for the design documents
— were put to him before any file was written, rather than reported afterwards.

**Next.** Three things, in order. **(1) Push the steering repository**, then
`git submodule update --remote steering-ref && git add steering-ref` — until then this repository
cannot read the decisions that govern it. **(2) A decision about CI**, because every check here
runs locally and nothing enforces them on a push. **(3) `reel-engine`'s gates**, which are being
reviewed there; when they are approved, their feature files move here (D-089) and slice 1 is the
schemas. Not before.

---

## 2026-09-12 — session 02, four rules that the other repository's checker could not express

**Changed.** Four boundary rules added, bringing the set to **fifteen**: `plan-no-epistemic`
(D-085's backstop), and `split-no-cinematic`, `split-imported-only-by-plan`,
`split-entered-through-its-index` (D-073, whose stated check had no buildable form before now).
A third mode, `drift --audit`, reports every rule as live, inert or **DEAD**. New checks: `no dead
rule` in `check.mjs`, and three assertions in `tests/boundaries.test.ts` — one of which simply
asserts dependency-cruiser is installed. **S-013** and **S-014** in `DECISIONS.md`. Still no
feature code.

**Observed.**

- **The owner's correction was right, and the state next door is worse than he said.**
  `node_modules` in the steering repository is **empty — nothing is installed at all**, and
  `scripts/drift.mjs:115` wraps the whole dependency-cruiser invocation in
  `existsSync(node_modules/.bin/depcruise)`. So its seven rules, `contracts-are-a-leaf` and
  `no-circular` among them, have **never executed once**, and the config reads as coverage.
- **All four new rules are between two folders of ONE package**, so every import they forbid is
  relative — `'../epistemic/index.ts'`, not `'@cutroom/pipeline'`. Specifier-prefix matching
  cannot see any of them. This is not a shortcoming anyone has to argue about: **D-085 exists
  precisely because the rule D-034 demanded could not be built**, and D-073's `Confirmed-by` asks
  for an edge in the same unbuildable shape. On resolved paths all four are ordinary, and all four
  are proven firing against relative-import violations.
- **A rule can read correctly and guard nothing.** The four name folders that do not exist yet,
  because the gates that create them are in review. So `--audit` distinguishes _inert_ (the folder
  is not written yet — fine) from _DEAD_ (the folder is missing from a package that already has
  source — a rename). Demonstrated: one `.ts` file dropped into `packages/pipeline/src/` turns all
  four DEAD and exits 1; removing it returns to 0 dead.
- **The audit found a bug in itself first.** Its first version cut every literal path back to its
  parent, so the nine package-level rules all reported `n/a` — an audit that could not see the
  rules it was auditing. Fixed by cutting only patterns that actually contain a metacharacter.

**Why.** The correction came with the reason already attached: configured-but-dead is worse than
absent, because it reads as covered. `--prove` answers _can this rule fire_, and `--audit` answers
_does it still apply to anything_. Neither question is answerable by reading the config, which is
the only thing anyone was doing next door.

**Next.** Unchanged and still first: **push the steering repository** — the pin reads 76 of 89
decisions. Then the CI decision. **One offer standing for the owner**: a one-line change to the
steering repository's `drift.mjs` so a missing dependency-cruiser is a loud failure instead of a
silent skip. Not applied — it is that repository's script, another session is active in it, and it
would turn its `pnpm drift` red until someone installs there.

## 2026-09-14 — session 03, the resolver could not see package names, and the contract arrives

**Intent.** Work from a session in the steering repository, at the owner's instruction to do three things:
fix this repository's boundary resolver, receive the approved `reel-contract` under D-105, and bump the pin.

**Changed.** Commit `efd2a4e`: `.dependency-cruiser.cjs` gains `enhancedResolveOptions.exportsFields`, and
`scripts/drift.mjs --prove` gains a by-package-name probe. This commit: `docs/features/reel-contract.md`,
**S-015**, and `steering-ref` moved from `a93a65a` to `e874bb6`.

**Observed.**

- **Every cross-package rule was silent on the import real code will write.** Packages here declare only
  `exports`; the resolver was not reading it, so `import ... from '@cutroom/domain'` stayed unresolved and no
  rule fired. `--prove` passed throughout because all fifteen of its cases import by relative path. **Proven,
  and still dead** — the exact failure this repository was built to prevent, one layer deeper than `--audit`
  looks.
- **The new probe was run against the old config first.** All 8 by-name cases reported SILENT and `--prove`
  exited 1. With the setting added: all 15 rules caught, 8 again by package name, and the legal shape clean
  both ways. A check is only trusted after it has been seen to fail.
- **The pin had fallen 34 commits behind** — 76 decisions visible of 106, and none of D-093–D-106, which define
  the contract now in `docs/features/`. `decisions.mjs` reads the pin from `HEAD`, so staging the submodule is
  not enough; it goes green only once committed.
- **The contract arrived with a formatter in the way.** Markdown outside `docs/design/` is formatted here. The
  moved file was checked against the original for headings, checks and words before committing.

**Why.** The resolver gap would have stayed invisible until the first cross-package import landed and nothing
flagged it — the one moment a boundary rule matters.

**Next.** The contract's Slice 1 is now allowed: `@cutroom/reel-contract`, its schemas, and a new
`reel-contract-is-a-leaf` rule with a by-name `--prove` case. `plan-no-epistemic` names a folder D-096 moved to
KnowScroll; re-examine it against D-034's drift test when `reel-engine`'s gates are next revised, not before.

## 2026-09-14 — session 04, the first engine code: reel-contract Slice 1

**Intent.** The owner chose to build the approved contract as real code before revising `reel-engine`'s plan.
Slice 1 of `docs/features/reel-contract.md`: the package, its schemas, and the boundary rule that keeps it
free of the engine.

**Changed.** New `packages/reel-contract/` — `version.ts`, `request.ts`, `events.ts`, `responses.ts`,
`record.ts`, `errors.ts`, `routes.ts` (types only), `index.ts`. One runtime dependency, `zod` 4.6.5. New
`tests/reel-contract-shapes.test.ts` (checks 1–9). New rule `reel-contract-is-a-leaf`, with a relative and a
by-package-name `--prove` case (check 10). Root and tooling `tsconfig` reference the package; the root
`package.json` links it as a workspace dev dependency so tests import it by name, the way a caller will.
Slice 1 ticked.

**Observed.**

- **Tests before code, and seen failing.** The shape tests ran against no package and failed. Then, with the
  package written, four deliberate breaks were made and each was caught by the test meant to catch it:
  removing the claim cross-reference checks (checks 6, 7, 8), making a sentence non-strict (checks 1, 5),
  loosening an event's version and removing the page check (check 1's mismatch clause), and adding a
  `sources` field to the request (checks 4, 5). Restored; 11 of 11 pass.
- **The boundary rule was seen silent before it existed.** With only the `--prove` cases added, both reported
  SILENT and the run exited 1; with the rule, both are caught — including the by-package-name case this
  repository could not see until `efd2a4e`. `--prove` now proves 16 rules, 9 of them again by package name.
- **Every schema is strict**, so a caller that sends a field the contract does not define — `sources`, a
  truth state inside a sentence — is rejected, not quietly stripped. That is what makes D-096's "never handed
  the evidence" enforceable at the boundary rather than a matter of the caller's care.
- **One layout choice avoided a cycle the rules forbid.** `RunEvent`'s `run.finished` needs the result statuses,
  and `responses.ts` needs `RunEvent`; the statuses live in `events.ts` so `responses.ts` depends on it and not
  the reverse. `no-circular` would have caught the other way.
- `node scripts/check.mjs`: everything green.

**Why.** It is the first code in the engine repository, and it is the one piece the orchestrator can use
directly — the exact messages, with their checks built in, instead of copying shapes from a document.

**Next.** Slices 2–5: a stand-in service in `tests/` with durable storage, and the behaviour checks 11–27 —
answered-at-once refusals and asking twice, following events, the answers that are not a reel, and surviving a
restart.

## 2026-09-14 — session 05, reel-contract Slice 2: asking, and being answered at once

**Intent.** The owner said carry on with the contract. Slice 2: a stand-in service in `tests/` with durable
storage, answering submit, lookup by `requestId` and status — checks 11–16.

**Changed.** `tests/stand-in/reel-engine-stand-in.ts` — an HTTP service on the loopback address over a real
SQLite file (`node:sqlite`, no new dependency), with `runs` and `events` tables from the start so Slice 5 can
restart it on the same storage. `tests/stand-in/fixtures.ts`. `tests/reel-contract-asking.test.ts` — checks
11–16 over real HTTP. Slice 2 ticked.

**Observed.**

- **Tests first, seen failing.** The new test file ran against no stand-in and failed; with the stand-in, 11 of
  11 pass.
- **Five deliberate breaks; four caught at once, and the fifth taught something.** Checking a reused
  `requestId` before validity (check 11), stripping `sources` instead of refusing (check 12), accepting any
  `until` (check 14) and answering an empty lookup with 404 (check 15) were each caught by the intended test.
  **Removing the key-sorting from the request fingerprint was caught by nothing** — because the fingerprint is
  taken over the _parsed_ request, and zod rebuilds a strict object in its schema's key order, so key order is
  normalised before the sorting runs. That mutation was not a realistic bug. The realistic one — fingerprinting
  the raw body as sent — was then made, and check 13 caught it. The sorting is kept, with a comment saying why,
  so the rule does not rest on one library's output order.
- **Validity comes before identity, in code order, not by accident.** Version, then schema, then producibility,
  and only then the `requestId` comparison — so an invalid body is 422 even when its id was used before, which
  the contract's route table states and check 11 now proves.
- `node scripts/check.mjs`: everything green.

**Why.** A stand-in that stores to a real file from the first slice is what lets Slice 5 prove "a run survives
a restart" without rebuilding it.

**Next.** Slice 3: events, status, result and record for a completed run of each `until` — checks 17–21.

## 2026-09-14 — session 05, reel-contract Slice 3: following a run and receiving it

**Changed.** The stand-in now progresses runs step by step — each run's planned steps are decided at acceptance
and stored in its database row, so a restarted stand-in continues the same run. New routes: events, result,
record. New `tests/stand-in/client.ts`, which checks every reply against the schema the contract assigns to
that route and status. New `tests/reel-contract-following.test.ts` (checks 17–21); Slice 2's tests now use the
same client. Slice 3 ticked.

**Observed.**

- **One test passed before any code existed, and was rewritten.** "Unknown run → 404 on events, result and
  record" passed against a stand-in with none of those routes, because it answered 404 to every path it did not
  know. It now also requires a _known_ run not to get 404 on the same routes, which the old code fails. All 9
  failed before the code; all 9 pass after.
- **Six deliberate breaks, six caught**: ignoring `since`, serving a result before the run finishes, leaving a
  chosen picture out of the result, timestamps with an offset instead of UTC, accepting a negative `since`, and
  relative artifact paths. The UTC break was caught by five tests at once — the shared client rejects a
  non-UTC `at` on every reply, not only in check 18.
- **Slice 2's tests gained check 18 for free** by moving onto the client, so submit, lookup and status replies
  are now schema-checked too.
- **Writing a long script through the shell failed on quoting** — the trap this repository's `CLAUDE.md` names.
  Nothing was written; the file was written directly instead, and its regexes were checked on disk afterwards.
- `node scripts/check.mjs`: everything green.

**Next.** Slice 4: the answers that are not a reel — plan-only estimates, budget refusal and stop, rule stop,
failure, cancel — checks 22–26.

## 2026-09-14 — session 05, reel-contract Slice 4: the answers that are not a reel

**Changed.** The stand-in can be scripted per request — `complete` (with the contract's budget rules applied to
its estimate), `allPlansOverCap`, `stopBudget`, `stopRule`, `fail` — can cancel a run through
`POST /v1/runs/:runId/cancel`, and can be told to fail the next request with 500. Its per-reel cap is an option.
New `tests/reel-contract-endings.test.ts` (checks 22–26). Slice 4 ticked.

**Observed.**

- **All 9 failed before the code, all 9 pass after**, and Slices 1–3 still pass (31 tests).
- **Eight deliberate breaks, eight caught**: refusing a plan-only request against the caller's ceiling, reporting
  every-plan-over-cap as limit `ceiling`, starting a stills stage before a ceiling refusal, a budget stop
  forgetting its spend, a rule stop losing its step, a forced failure that never switched off, ignoring cancel,
  and refusing to cancel a finished run.
- **The budget rules live in one function**, `stepsFor`, in the order the contract states them: every plan over
  the per-reel cap is refused with `limit: 'reel'` for any `until`; a full run over the caller's ceiling is
  refused with `limit: 'ceiling'` before any picture; a plan-only request is never refused against the ceiling.
  Reading that function is reading the contract's "Budget answers".
- **Cancel takes effect at the next step, not instantly** — the cancel reply says `running`, and the run finishes
  as `cancelled` when it next advances, with no stage started after the cancel. That is the contract's wording,
  and the test pins it by reading events after the cancel's `lastSeq`.
- `node scripts/check.mjs`: everything green.

**Next.** Slice 5: stop and restart the stand-in on the same storage, find the run by `requestId`, resume events
without gaps or repeats — check 27 — then every check together.

## 2026-09-14 — session 05, reel-contract Slice 5: restart, and every check together

**Changed.** New `tests/reel-contract-restart.test.ts` (check 27). No change to the stand-in. Slice 5 ticked — all
five slices of `reel-contract` are now done.

**Observed.**

- **The restart test passed the first time it ran, before any change.** That was expected, not luck: Slice 2
  gave the stand-in durable storage from the start, precisely so this slice would need none. A test that has
  never failed proves nothing, so it was made to fail instead.
- **Six deliberate breaks to the storage, six caught.** Keeping the database in memory, opening a new file on
  each start, wiping the tables on start, and keeping `requestId` lookups in memory were each caught as "the run
  was not found by requestId after the restart". Keeping the step cursor in memory was caught as "the run started
  again from the beginning". Counting event numbers in memory was caught by the database itself refusing a second
  event 1 — a crash, not a wrong answer, and the test still fails.
- **The test also replays the same request after the restart** and gets the same run back. Check 27 names only
  the lookup; a caller recovering from a crash will resubmit, so the replay is where it would really be hurt.
- **Every check, together:** `node scripts/check.mjs` green, which includes `drift --prove` with the
  by-package-name probe that is check 10. **55 tests, 55 pass** — checks 1–27.

**Gap, not closed here.** The feature file says its Evidence is "appended by the journey, never typed by hand",
and that the journey flips its status. This repository has no journey runner (S-002 declined to port one), and
D-089 says no proof goes back to the steering repository. So nothing is allowed to write Evidence or flip
`Status: planned`, and neither was done by hand. Put to the owner.

**Next.** The owner decides how a finished feature is marked verified here. Then `reel-engine`'s plan, in the
steering repository, against today's decisions and this contract.

## 2026-09-14 — session 05, a journey for this repository, and reel-contract verified

**Intent.** The owner chose a small script here to mark a finished feature verified, over counting ticked slices
as done.

**Changed.** `scripts/journey.mjs` and `tests/journey.test.ts` (S-016). `CLAUDE.md` says how a feature is verified;
`.claude/settings.json` allows the script. The `steering-ref` pin bumped to `8bac8a8`. `reel-contract` run through
it: **Status: verified**.

**Observed.**

- **Tests first, then breaks.** All eleven cases failed with no script; after it, eleven deliberate breaks —
  loosening the gate match, allowing an unticked slice, a dirty tree, trusting the check alone, flipping status on
  a fail, replacing old evidence, dropping CRLF, and others — were each caught by the case meant for it.
- **One trap, found by the tests.** Under Node's test runner a child gets `NODE_TEST_CONTEXT`, and a nested
  `node --test` that inherits it reports to the runner in its own format and prints no TAP — so the count found
  nothing and every pass read as "ran no tests". The script clears it.
- **The tests never run the journey against this repository.** Its check runs the tests, which would run the
  journey again. They build throwaway git repositories with a check that passes or fails on command, and pass
  `--repo`.
- **The first real run was a FAIL, and a true one.** `decisions pin` was red: two journal-only commits in the
  steering repository had left the pin two behind. No decision had changed — 106 either way — but the check cannot
  know that, and should not guess. Bumped, committed, run again: **PASS at `0ae20f8`, 41 tests in
  `tests/reel-contract-*.test.ts`**. The FAIL line stays, below the PASS; evidence is never
  cleaned up.
- **This will recur.** Any push to the steering repository — even a journal entry about work done here — turns this
  repository's check red until the pin is bumped. That is D-090 working, not a fault, and it means a journey run
  soon after a steering push will fail first.

**Next.** `reel-engine`'s plan fix pass, in the steering repository.

## 2026-09-14 — session 05, pin bumped after the steering repository's handoff

**Changed.** `steering-ref` pinned to the steering repository's handoff commit. Nothing else.

**Observed.** The steering repository rewrote `docs/founding/reel-creation-engine/handoff.md` for the `reel-engine`
fix pass. No decision changed. The bump keeps `decisions pin` green, as the previous entry said every steering
push would require.

**Next.** Unchanged: `reel-engine`'s plan, in the steering repository, once the owner picks the method.

## 2026-09-14 — session 06, engine decisions move here, and a first native feature

**Intent.** The owner asked to stop making Cutroom decisions in the steering repository and do the work here,
and to add a video-editing feature among the first.

**Changed.** `DECISIONS.md` — **S-017**: decisions about the engine and Cutroom are written here now; the
steering repository's D-001…D-114 bind until an entry here supersedes one by name (the steering side is
**D-115**). `CLAUDE.md` — says so, says new features are planned here, and corrects two stale facts (sixteen
rules, not fifteen; `reel-contract` has source). `docs/features/video-edits.md` — a stub: free edits instead of
paying for new generation, what D-058, D-057, D-025, D-036, D-054/55/59 and I-12 already decide, and five
questions to settle before its gates. Its gates come next after `reel-plan`'s are approved.

**Observed.**

- **The old decisions are not copied.** They stay in the steering repository and are read through the pin, as
  the owner chose; only new ones are written here.
- **`reel-plan`, `reel-stills` and `reel-render` stay in the steering repository until approved** — the owner kept
  D-089's timing — so for a while a plan there will cite decisions here.
- **An experiment against this repository's installed dependency-cruiser, for `reel-plan`'s review, found the
  config cannot see npm imports at all**: `options.exclude` drops every `node_modules` path from the graph, so a
  rule about `ai` or `drizzle-orm` never fires. With `node_modules` out of `exclude` (and `doNotFollow` kept),
  two proposed rules fired on all six violating imports and stayed silent on `zod` in pnpm's store and on
  workspace links; this repository's real source stayed clean. The tool also refuses a pattern with a repeat
  inside a repeated group. Nothing in the config was changed — that is `reel-plan`'s Slice 2.

**`reel-plan` moved here.** Its gates were approved in the steering repository after three narrow checks, and
under D-089, D-105 and S-015 it now lives at `docs/features/reel-plan.md`, with a move note. Checked against the
steering copy: all 24 headings, every numbered check, and every letter and digit kept through the formatter.

**Next.** Push the steering repository, then bump the `steering-ref` pin here — `decisions pin` stays red until
then. Then `reel-plan` Slice 1. After `reel-plan`, `video-edits`' gates.

## 2026-09-14 — session 07, reel-plan Slice 1: the service answers, and a run finishes

**Intent.** The owner asked for `reel-plan` Slice 1 only — checks 10–16 — tests first, each seen failing, each
broken on purpose once after it passed.

**Changed.**

- `packages/domain` — its first source. `schema.ts`: the five tables, `run`, `run_event`, `job` (D-002's full
  column list), `plan`, `model_receipt`. The migration, `db/migrations/0000_reel_plan_tables.sql`, by drizzle-kit. `db.ts` opens the file (WAL, foreign keys, busy timeout) and migrates it (**S-019**). `runs.ts`:
  submit, asking twice by canonical JSON, the event record numbered inside immediate transactions, finishing a run
  in one transaction with its job. `queue.ts`: enqueue, claim by one `UPDATE … RETURNING`, complete, bury.
  Dependencies `better-sqlite3` 13 and `drizzle-orm` 0.45 (D-001); the native build compiled on this machine.
- `apps/api/src/server.ts` — the contract's seven routes on `127.0.0.1`, on `node:http` (**S-018**); refuses
  `until` other than `plan` (D-108) and `planVaryOn` other than `shotCount` (D-110) as `unsupported`, saying "not
  built yet".
- `apps/worker` — `worker.ts` polls and claims `reel.plan`; `plan-job.ts` starts the plan stage and finishes the
  run `failed`, _"planning is not built"_, which Slice 3 replaces.
- `tests/engine/harness.ts` starts the real API and worker on a temporary file. `tests/reel-plan-asking.test.ts`
  (10, 11, 14), `tests/reel-plan-service.test.ts` (12, 13), `tests/reel-plan-run.test.ts` (15, 16).
  `tests/stand-in/client.ts` now exports its route table, so check 13 can require every status in it.
- Wiring: workspace dependencies, project references in the root, tooling and package `tsconfig`s, the four
  `.gitkeep`s removed. `eslint.config.mjs` ignores `**/dist/**` instead of `dist/**`.
- Slice 1 ticked.

**Observed.**

- **Tests first, seen failing** — but only at the import: all three files failed on the missing package
  `@cutroom/api`. Written whole, the code then passed 9 of 9 at the first run, so no assertion had been seen red
  before the breaks. The breaks are what show each assertion can fail.
- **Seven deliberate breaks, seven caught, each by its own check and by no other test in its file:** accepting any
  `until` (10); accepting `planVaryOn 'order'` (11); listening on `0.0.0.0` while reporting loopback (12 — caught
  by the address the operating system reports, and this machine has two LAN addresses the test also connects
  through); answering a 500 with `error: 'server'` (13 — caught only by the part of the test that drops the tables
  under a running service, which is how the real service is made to produce a 500 on every route with no hook in
  its code); comparing the raw body instead of canonical content (14); `since=n` including event `n` (15); asking
  twice enqueuing a second job (16).
- **Check 13 now requires coverage, not only validity.** It fails if any status the contract gives any route was
  never produced — so an answer cannot go unchecked because no test asked for it. All 26 are produced.
- **Lint scanned generated declarations.** `tsc -b` writes `packages/domain/dist/*.d.ts`, and Drizzle's inferred
  types there contain `{}`, which lint refused in 57 places. The ignore said `dist/**`, which matched only the root's;
  the intent — never lint tsc output — is unchanged, and no source file is newly ignored.
- **A deleted `.gitkeep` fails the line-endings test until the deletion is staged**: the test reads every path git
  still tracks.
- **Not built, on purpose:** re-claiming a job whose lease expired, reading the cancel flag, and writing
  `stage.started` once across a restart — checks 45 and 46, Slice 5. The API and worker have no process entry
  point yet; nothing outside the tests starts them, and Gate 3 names none. Two processes migrating a brand-new file
  at once is not handled (S-019).
- **Two files Gate 3 does not name:** `packages/domain/src/db.ts` and `apps/worker/src/worker.ts`. Opening the file
  and the polling loop had to live somewhere; neither is a stage or a route.
- `node scripts/check.mjs`: everything green, 75 tests.

**Next.** `reel-plan` Slice 2: `cinematic.ts`, `model.ts`, `settings.ts`, and the boundary-rule changes with their
`drift:prove` cases — checks 1–5, 8, 9.

## 2026-09-14 — session 08, reel-plan Slice 2: the shapes and the rules

**Intent.** The owner asked for `reel-plan` Slice 2 only, tests first, each broken on purpose once. The request
named it _"the service answers, and a run finishes"_, which is Slice 1's title, already ticked at `8be3583`; the
next unticked slice, _"the shapes and the rules"_ — checks 1–5, 8, 9 — is what was built.

**Changed.**

- `packages/contracts` — its first source. `cinematic.ts`: `DEFAULT_PLAN_VARY_ON`, `Plan`, `PlanShot`,
  `PlanSubject`, `PlanFork`, `Gate0Condition`, `Gate0Verdict`, `PlanScore`, reusing `PlanVaryOn` and `Criterion`
  from the contract. `model.ts`: `LanguageModelPort` with one call, `structured`; `ModelRole`; `ModelReceipt`.
  `settings.ts`: `PlanSettings`. Types only, plus the one constant. Dependencies `@cutroom/reel-contract` and `zod`
  (type import); project references in the root and tooling `tsconfig`s; root dev dependency so tests import it.
- `.dependency-cruiser.cjs` — Gate 2's changes, and two it does not list (**S-020**): `conditionNames` for the
  resolver, and `dist` in `exclude` anchored to this repository's own output. Seventeen rules.
- `scripts/drift.mjs --prove` — cases carry their specifier and count only when the rule fires on that edge; npm
  packages built in pnpm's layout with real manifests' shapes; legal imports must resolve; one temporary folder
  per process. 38 cases, 22 by name.
- `tests/engine/source.ts` — declarations and field names read with TypeScript's parser.
  `tests/reel-plan-shapes.test.ts` (1, 3, 4, 5), `tests/reel-plan-rules.test.ts` (2, 8, 9).
- `tests/boundaries.test.ts` — its intra-package test names the three folder rules that exist now, instead of
  `plan-no-epistemic` and `split-no-cinematic`. The gate deletes one and replaces the other; check 8 asserts both
  are gone. `CLAUDE.md`, `README.md`, `AGENTS.md` — the rule count and the folder rules.
- Slice 2 ticked.

**Observed.**

- **The finding: Gate 2's npm rules, as approved, were silent on `ai`.** The gate's experiment used miniature
  packages; the `--prove` cases here copy real manifests. Two independent holes, seen one after the other:
  zod and ai declare `exports` with only `types`/`import`/`require`, so without `conditionNames` they never
  resolve and no `node_modules` path reaches `pipeline-npm-only-zod`; and once resolved, `ai`'s entry is under
  `dist/`, which the unanchored `exclude` removed from the graph, silencing `model-client-only-in-providers` on
  three cases. `drift` on the real repository reported 0 violations throughout — the shape S-014 warns about.
  Gate 2's patterns themselves are unchanged. Recorded in S-020 rather than by editing the approved gate.
- **Red first.** Before any code: 1, 2, 3, 8, 9 failed; 4 and 5 passed, since they assert absence — each was seen
  red only by its break. With the contracts files written, 2, 8 and 9 failed on their rule assertions; the new
  harness against the old config showed all 11 new cases SILENT (a twelfth, `pipeline-no-io`, was the harness
  fault below) and `contracts -> reel-contract` EAGER. The real `drift`
  also caught `contracts-are-a-leaf` on `cinematic.ts`'s import until the rule was amended.
- **Seven breaks, seven caught.** 1: the default `'order'`. 2: `Criterion` redeclared in `cinematic.ts`. 3: a
  `StructuredCall` type alias. 4: a `ScriptView` interface. 5: a `beats` field on `PlanShot`. Each of those failed
  its own check and no other. 8: `node_modules` back in `exclude` — check 8 on its own `exclude` assertion. 9: the
  zod allowance widened to all of `node_modules/.pnpm/` — three pipeline npm cases SILENT. Breaks 8 and 9 also
  fail check 2, which reads the same `--prove` run's exit status.
- **Two harness faults, found before they could hide anything:** the tool records `node:fs` as `fs`, so the new
  per-edge accounting first called `pipeline-no-io` SILENT; and two test files running `--prove` at once raced on
  one temporary folder.
- **A shell trap met again:** a `sed` and an inline `node -e` both halved backslashes while scripting the breaks;
  the config was checked by reading the file afterwards, and was intact.
- **`PlanScore`'s shape is not given by Gate 3** — only its name and file. Written as `terms` keyed like the
  settings' weights, and `total`; Slice 3, which computes it, may reshape it, since nothing reads it yet.
- `node scripts/check.mjs`: everything green, 82 tests.

**Next.** `reel-plan` Slice 3: the splitter and `plan/` together, the stand-in and the recording port, ranking,
the estimate, Gate 0, the plan score and plan rows — checks 6, 7, 17–19, 21–27, 29–37.

## 2026-09-15 — session 09, questions only: when the provider keys are needed, and why the AI SDK

**Intent.** The owner asked when the MiniMax M3 and H3 keys are first required, then why the Vercel AI SDK is.

**Changed.** Nothing but this entry. No code, no decision, no feature file.

**Observed.**

- **No key is needed by anything planned in this repository today.** `reel-plan` is keyless by structure (Gate 1;
  pending decision 4; check 47 in Slice 5). The first real key is the unplanned **paid-path feature** that
  `reel-plan.md` defers the real `LanguageModelPort` adapter to — `MINIMAX_API_KEY`, which the token plan makes
  cover M2.7 and M3 (D-019).
- **H3 is not a MiniMax key.** D-007 routes video through `fal-ai/minimax-h3-turbo/*`, so it is `FAL_KEY`, first
  read by a real `reel-render`, whose gates are unwritten and which must ship fakes first. Its narration (T2A) also
  reads `MINIMAX_API_KEY`, with no fallback (D-019). Real video spend also waits on Q9.
- **Cutroom has no way to receive a key.** The steering repository reads Keychain through `scripts/env.sh`; this
  machine is Windows and nothing here reads any key. The paid-path feature will need an `S-` decision for it.
- **The AI SDK is D-005's choice, not a technical requirement.** D-005 weighed agent frameworks, never a plain HTTP
  client against MiniMax's OpenAI- or Anthropic-compatible endpoints. Its strongest reason, the bounded tool loop,
  is the research episode — KnowScroll's side, not the engine's. The engine depends only on `LanguageModelPort`
  (D-078), so the choice is reversible inside `packages/providers`, but `model-client-only-in-providers` only
  recognises `ai` and `@ai-sdk/*`: a hand-written client would need that rule and its `--prove` case extended.

**Why.** Answering from the decisions rather than from memory; nothing was built because nothing was asked for.

- **No date exists for a first real reel.** Under the current order it needs `reel-plan`'s last three slices,
  `reel-stills`, `reel-render` and the paid path, and KnowScroll also needs `reel-script` and a client
  (`validation-gate`, Q16). Estimated from pace, not from any plan: roughly 25–40 sessions.
- **One H3 clip was already made**, 2026-09-02, by the steering repository's `h3-video.mjs` — 5 s, 768×1344,
  7 s wall. I first said no H3 output had been seen; that was wrong. Q9, the billed rate, is still unanswered.
- **Proposed and declined for now:** a throwaway, hand-run test reel (M2.7 plan, fal stills, M3 check, H3
  image-to-video, T2A, ffmpeg), about $1.20–3.00 with a $5 stop, to answer Q9 and test the keyframe design,
  Gate 1's judge and the image default against real output before `reel-stills`' gates. **The owner chose the
  current order and will return to it later.** No decision was written.

**Next.** Unchanged: `reel-plan` Slice 3. If the owner wants the AI SDK dropped for the engine, that is an `S-`
entry superseding D-005, written before the paid-path feature's gates. The test reel is open for a later talk.

## 2026-09-15 — session 10, reel-plan Slice 3: the splitter, two plans, Gate 0, the score, and a completed plan

**Intent.** The owner asked for `reel-plan` Slice 3 only — checks 6, 7, 17–19, 21–27, 29–37 — tests first, each
check broken on purpose once, nothing from Slices 4 or 5. `decisions.mjs`: pin current, 0 commits unpushed. Baseline
`check.mjs` green, 82 tests.

**Changed.**

- `packages/pipeline` — its first source, in Gate 3's locations: `split/index.ts` (`groupSentences`);
  `plan/index.ts` (`planReel`, `DEFAULT_PLAN_SETTINGS`, `planForkSchema`, `PlanRecord`, `PlanOutcome`);
  `plan/prompts.ts` (the planning prompt and its answer schema per unit count, the score prompt and its answer
  schema, the four default questions); `plan/score.ts`; `gates/index.ts` (`GATE_ORDER`), `gates/gate0.ts`; `rank.ts`;
  `estimate.ts`. Plus `src/index.ts`, which Gate 3 does not name and CLAUDE.md's one-entry rule and
  `tests/workspace.test.ts` require; it does not export the splitter, whose tests reach it by path.
- `packages/providers` — `fake/model.ts`, the stand-in, and `src/index.ts`.
- `packages/domain` — `budget.ts` (`readReelCapCents`, default path the pinned `BUDGET.md`); `runs.ts` gains
  `readRequest`, `recordReceipt`, and `finishRun` now writes plan rows and the events before `run.finished` in its one
  transaction.
- `apps/worker` — `recording-port.ts`; `plan-job.ts` runs `planReel`; `startWorker` takes `model` (required),
  `settings`, `budgetPath`. `NOT_BUILT` is gone.
- Tests: `tests/reel-plan-planning.test.ts` (17–19, 21–27), `tests/reel-plan-gate0.test.ts` (29–33),
  `tests/reel-plan-score.test.ts` (34–37), and 6 and 7 in `tests/reel-plan-shapes.test.ts`. `tests/engine/plans.ts`
  holds the eight-sentence request, the scripts and a passing plan; the harness hands the worker a scripted stand-in;
  `tests/engine/source.ts` gains `importSpecifiers` and `throwStatements`.
- **S-021** (the worker is handed its port), **S-022** (the score's six terms and arithmetic; `PlanScore` keeps its
  Slice 2 shape), **S-023** (three more refusals in the planning schema). CLAUDE.md and README.md no longer say
  `pipeline` and `providers` are empty. Workspace dependencies, tsconfig references and the lockfile (links only,
  installed `--offline`). Slice 3 ticked. This commit also carries session 09's entry, which was never committed.

**Not built, on purpose.**

- **`plan/repair.ts` is not written**, though the request listed it with `plan/`. Gate 3 gives it D-114's choice,
  which only check 39 (Slice 4) exercises; `drift --audit` needs the folder `plan/`, not that file, and writing it now
  would be code with no failing test. The repair prompt is likewise absent.
- **The answers that are not a plan throw "not built".** Observed through the real engine: four sentences finish
  `failed`, _"stopping for too few sentences (4 for 4 and 6 units) is not built (reel-plan Slice 4)"_, 0 receipts;
  both plans failing Gate 0 finish `failed`, _"the repair after both plans fail Gate 0 is not built"_, 2 receipts, no
  plan rows. Contract-valid, asserted by no check — Slice 1's precedent — so Slice 4's checks start red.
- **A thrown call already finishes `failed` with its receipts kept** (a scripted throw on the second call: `failed`,
  _"stand-in down"_, 1 receipt). The catch exists because the placeholders throw; check 44 will probably pass when
  Slice 4 writes it, so it has to be seen red by a break.
- **One survivor is selected outright** — selection is Slice 3's, and check 34 needs that run to show no score call.

**Observed.**

- **Red first, twice.** With the tests written and no pipeline source, every new file failed on
  `ERR_MODULE_NOT_FOUND`, which proves nothing. Stubs in Gate 3's files returning wrong answers then gave 19
  assertion failures; check 23 first crashed on a `TypeError` (no call, so no schema) and got an assertion in front of
  it. **22 and 30 passed against the stubs** — one asserts sameness, the other absence — and were seen red only by
  their breaks. The three S-023 assertions in check 7 were added after the code, and seen red only by breaks.
- **Twenty-seven breaks, all caught.** Each applied by a script that restored the file; source hashes before and
  after all of them were identical.
  - 6: the fork schema's axis made optional — 6 only. Plan rows written with axis `'order'` — 6 only.
  - 7: two shots per unit allowed — 7. The stand-in not parsing its answer — 7. A subject named twice, an unnamed
    subject, and part-second durations, each allowed — 7 each, alone.
  - 17: positions reversed inside each unit — 17 and 19 (19 asserts the plans' positions in order).
  - 18: every second call with the same arguments gives the extras to the last units — 18, 22 and 36 (two plannings
    in one process get different groupings, so plans and score prompts differ).
  - 21: planning temperature 0.2 — 21 and 37 (the receipt's temperature).
  - 22: a random line in the planning prompt — 22 only.
  - 23: an optional `estimateCents` in the answer schema — 23 only.
  - 24: `rank.ts` importing `LanguageModelPort` — 24; the earliest-appearance tie-break dropped — 24.
  - 25: image calls uncapped — 25. 27: the image rate ignored — 27. 29: `['0', '1']` — 29. 30: `gate0.ts` importing
    `LanguageModelPort` — 30.
  - 26: criteria copied without `claimId` — 26 and 23 (23 also asserts the copied criteria).
  - 31: cost compared with `<` — 31. 32: the lower total bound made exclusive — 32. 33: return at the first failed
    condition — 33.
  - 34: scoring when either plan survives — 34. 35: the total divided by the weight sum — 35 (`NaN` at zero weights).
  - 36: a random line in the score prompt — 36 and 22. 37: receipts written for the planner only — 37.
  - Beyond the slice's checks: the cap read as dollars, not cents — 6 and 37 (both plans fail on cost and hit the
    unbuilt repair). Check 28, Slice 4's, is what owns the cap.
- **Two harness faults**: check 23's zod walker walked `undefined`; the deleted `.gitkeep` files were still tracked, so
  `tests/line-endings.test.ts` hit `ENOENT` until the deletion was staged.
- **The shell trap once more**: a heredoc turned `\n` into real newlines inside a string of the break script, which
  then failed to parse before touching anything. Fixed with the editor, and the script's run checked.
- `drift --audit`: 14 live, 0 inert, 0 dead — the three folder rules live for the first time. `drift`: 46 modules, 0
  violations; `zod` from `plan/` resolves to `node_modules/.pnpm/zod@4.6.5/…` and `pipeline-npm-only-zod` stays
  silent on it.
- **Small choices, recorded here rather than as decisions:** the estimate rounds up (no effect at integer rates); a
  plan row's `score` holds the total, not the terms; shots are stored in unit order; Gate 0's 4–6 shots and 5–15 s are
  constants in `gate0.ts`, since `PlanSettings` has no field for them, and the planning prompt reads them from there.
- `node scripts/check.mjs`: everything green, 103 tests.

**Next.** `reel-plan` Slice 4 — checks 20, 28, 38–44: the split stop, the repair ladder (`plan/repair.ts` and the
repair prompt), the budget refusal and its question (`apps/worker/src/questions.ts`), the gate-0 rule stop, the thrown
call. Both "not built" throws get replaced.

## 2026-09-15 — session 11, reel-plan Slice 4: the answers that are not a plan

**Intent.** The owner asked for `reel-plan` Slice 4 only — checks 20, 28, 38–44 — tests first, each check broken on
purpose, nothing from Slice 5. `decisions.mjs`: pin current, 0 commits unpushed. Baseline `check.mjs` green, 103 tests.

**Changed.**

- `packages/pipeline` — `plan/repair.ts` (`repairBasis`, D-114's choice; imports no port type). `plan/index.ts`: the
  split stop returns `{ kind: 'stopped-rule', rule: 'split' }` before any call; with no survivor, one repair call
  (planner, temperature 0, the picked grouping's schema), the repair built and put through Gate 0, then selected,
  refused for budget (every plan failed `cost`; lowest of three estimates) or stopped for rule `gate-0` (detail names
  each plan's unit count and failed conditions). `plan/prompts.ts`: `repairPrompt`; the planning prompt's body is
  shared, its text unchanged. `repairBasis` exported from the index. Both "not built" throws are gone.
- `apps/worker` — `questions.ts` (`QUESTIONS_MD`, `appendBudgetQuestion`); `plan-job.ts` maps every outcome to its
  contract result, writing plan rows (repair included) and one verdict event per plan in the finishing transaction,
  and appends a question after it on a per-reel refusal only; `startWorker` takes `questionsPath`.
- Tests: `tests/reel-plan-repair.test.ts` (38–40), `tests/reel-plan-endings.test.ts` (20, 28, 41–44). The harness
  always points `questionsPath` into its folder, takes `budgetMd` (a BUDGET.md written there), and gains `run()`, which
  submits, waits and reads result, events, plan rows and receipts. `plans.ts` gains `bare` and `shortRequest`.
- **S-024** (the repair is also shown the plan it corrects; every tie goes to `a`), **S-025** (no `stage.finished`
  when a run ends at the plan step without a plan — the contract's stand-in's shape), **S-026** (the question entry's
  Markdown form, created with `wx`, appended after the finishing transaction). Slice 4 ticked.
- **No file outside Gate 3's list was added.** Tests cannot import `@cutroom/domain` (not a root devDependency), so
  check 28 reads the pinned `BUDGET.md` by path and proves the default through a run's `capCents`, rather than adding a
  dependency.

**Observed.**

- **Red first.** With tests written and nothing else, both files failed on a missing export, which proves nothing.
  Stubs in Gate 3's files (`repairBasis` always `'a'`, a wrong `QUESTIONS_MD`) gave seven assertion failures: 20, 28,
  38, 39, 40, 41, 42. **43 and 44 passed before any Slice 4 code**: nothing compared the ceiling or wrote a question,
  and Slice 3's catch already failed a thrown run with its receipts. Both were seen red only by breaks, below. The
  S-024 shots assertion in 39 was added after the code, and seen red only by its breaks.
- **Twenty-nine breaks, all caught**, each applied by a script that ran every test and restored the file from the bytes it
  read; source hashes before and after were identical.
  - 20: a model call inside the split stop — 20 only. The result's step set to the rule — 20. (A first version put the
    call before the check; it consumed a scripted answer in every run and 19 checks failed. Replaced, not counted.)
  - 28: the cap read from the pinned file instead of `budgetPath` — 28 only. `capCents` hard-coded 300 — 28 only.
  - 38: the repair row always marked selected — 38. The unselected survivor's score dropped — 38.
  - 39: no fewer-conditions rule — 39. No lower-estimate rule — 39, 41 and 28 (their repairs then work from the other
    grouping). Tie to `b` — 39, 38, 40, 42. One verdict line only — 39. The kept plan's shots dropped — 39. The other
    plan's shots shown — 39. The repair row not written — 38–42.
  - 40: a surviving repair not selected — 40 only.
  - 41: `some` instead of `every` — 42 (its mixed cost/shape case). Only-cost instead of includes-cost — 41 (its
    shape-and-cost case). The repair's estimate instead of the lowest — 41. Ceiling set to the cap — 41. No append — 41.
    Overwrite instead of append — 41. The default one folder too high — 41.
  - 42: the detail without the repair — 42. A question on every non-selected ending — 41 and 42.
  - 43: a completed run refused against its ceiling — 43 only. A question for a completed run over its ceiling — 43.
  - 44: receipts buffered and written only when planning returns (Gate review 1's finding 4) — 44 only. A generic
    failure detail — 44 only.
  - S-025: `stage.finished` on every ending — 41, 42. No verdict events when nothing is selected — 41, 42.
- **The stop-gate fired twice mid-break**, running `check.mjs --code` while a break was applied, and reported red.
  That red was the break, not the tree: the break script restored every file and the next full check was green.
- `drift`: 48 modules, 0 violations. `drift --audit`: 14 live, 0 inert, 0 dead. No `QUESTIONS.md` exists at the root.
- **Small choices, here rather than as decisions:** the split detail names only the unit counts that could not be
  met; the repair plan is parsed under the plan schema, as the fork is; an append that throws after the commit leaves
  the job `dead` (S-026, not handled).
- `node scripts/check.mjs`: everything green, 112 tests.

**Next.** `reel-plan` Slice 5 — checks 45 (cancel before the stage), 46 (API and worker restart mid-run), 47 (every
other test in a child process with no secrets), then `node scripts/journey.mjs reel-plan`, which re-runs 1–44.
