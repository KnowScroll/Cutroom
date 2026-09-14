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
