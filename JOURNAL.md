# JOURNAL

The operational journal stays short. Sessions 01–64, including their full reasoning and raw verification notes, are
preserved byte-for-byte in [the historical journal](docs/history/JOURNAL-through-session-64.md). Read that archive only
by its session heading. New entries state the decision, commit/evidence reference and next action; feature files,
commit messages and verification trailers carry the durable detail (S-177).

## 2026-09-29 — session 67, cutroom-sdk Slice 2 built and verified

**Changed.** Created `packages/sdk` (the typed local client and its single `src/index.ts` exporting `createCutroom`, the `Cutroom` interface, and the three stable error shapes — `SdkApiError`, `SdkProtocolError`, `SdkConnectionError`); added the `sdk-no-engine-internals` boundary rule in `.dependency-cruiser.cjs` with five relative-path and three by-name prove cases in `scripts/drift.mjs`; added `packages/sdk` to `PACKAGE_FOLDERS`, the legal `@cutroom/reel-contract` by-name case, and per-package stubs in `scripts/drift.mjs` `build()` so relative imports resolve inside the probe; referenced `packages/sdk` from the root `tsconfig.json` and declared it as a workspace link in `package.json`. Created the new behavior owner `tests/cutroom-sdk-routes.test.ts` (30 tests) and ticked Slice 2 in `docs/features/cutroom-sdk.md`. Updated three existing drift rule-count pin tests (`tests/paid-path-keys.test.ts`, `tests/reel-render-rules.test.ts`, `tests/reel-stills-rules.test.ts`) from `20 rules proven to fire` to `21`, recording that cutroom-sdk's Slice 2 added the twenty-first rule alongside the twentieth keys-only-in-providers pin those tests keep cross-feature consistent.

**Observed.** Every step green on `node scripts/check.mjs`: typecheck (1.9 s), lint (5.6 s), format (13.0 s), boundaries (1.3 s), boundaries proven (3.8 s), no dead rule (67 ms), tests (1,455,704 ms — 650 tests, 644 + 6 already counted by the rule-count pin tests that this slice updates; the 6 failures during the first run were exactly the three rule-count pin tests above and the cross-file agreement check, all fixed by the same `20` → `21` update), decisions pin (221 ms), copied docs (72 ms). Slice 1's targeted evidence at `98930f8` stays valid because this slice does not touch its files. The eight deliberate breaks (request validation-before-fetch, runId encoding, 409-as-error misread, ErrorResponse parsing skipped, wrong-schema JSON swallowed, https:// URL allowed, closed-flag ignored, and the forbidden `import { tables } from '../../domain/src/index.ts'`) each took exactly one named test red and the boundary case tripped `drift` with `sdk-no-engine-internals  packages/sdk/src/index.ts -> packages/domain/src/index.ts` before restore.

**Why.** The Slice 2 prompt recorded the rule-count change as something the prompt itself authorizes ("If another test changes, add it to this command and record why in the feature entry and `Verification` trailer"). The pin tests are verified feature tests that hard-code a printed number for cross-feature consistency; the number is updated, the rationale comment is rewritten to name the new rule, and the affected tests are added to the slice command. The slice changes the workspace solution (new package reference), the root TypeScript project references, and the boundary configuration — which is why the targeted `check.mjs --slice` is refused and the full check runs once at the end, per the prompt's standing rule.

**Next.** Commit Slice 2 alone with `Verification: full`, `Verification-Tree: <exact tree>`, `Verification-Tests: tests/cutroom-sdk-routes.test.ts tests/workspace.test.ts tests/boundaries.test.ts tests/paid-path-keys.test.ts tests/reel-render-rules.test.ts tests/reel-stills-rules.test.ts`; run `node scripts/verification-status.mjs` against the committed tree. Slice 3 (launcher lifecycle) is a separate session.

## 2026-09-29 — session 66, Slice 2 SDK handoff made test-explicit

**Changed.** Added `PROMPTS/065-cutroom-sdk-slice-2.md`, the implementation handoff for the SDK package and typed
route-client slice.

**Observed.** Slice 1 is complete and its current-tree targeted verification is recorded at `98930f8`. Its readiness
test and compile-support amendment remain read-only in Slice 2. Slice 2 creates one new behavior owner,
`tests/cutroom-sdk-routes.test.ts`; existing `tests/workspace.test.ts` and `tests/boundaries.test.ts` prove its
workspace/package and resolved-path rule changes. This is a full-check slice only at the end because it changes the
workspace solution and boundary enforcement; S-177 does not require a redundant historical full-suite preflight.

**Why.** The next builder needs an exact test inventory, route/error behavior, scope boundary, and verification command
before implementation starts, rather than re-opening Slice 1's evidence or guessing what the suite owns.

**Next.** Build `cutroom-sdk` Slice 2 from `PROMPTS/065-cutroom-sdk-slice-2.md`; after its verified commit, start
Slice 3 only in a separate session.

## 2026-09-29 — session 65, verification made commit-bound and targeted

**Changed.** Replaced automatic aggregate verification for ordinary code slices with explicit `check.mjs --slice`
tests, added commit-tree verification evidence, compacted this journal and archived sessions 01–64, and tightened
Slice 1’s readiness getter test to assert the exact call count.

**Observed.** Slice 1 already recorded a full green run at `127adc5`; rerunning it during review consumed time without
adding evidence. This migration's required full run completed its tests green in 2,654,890 ms; its only initial red was
Prettier on five newly edited files. After formatting, typecheck, lint, format, boundary proof, authority and the four
focused policy/Slice 1 test files were green. The aggregate phase is approximately 44 minutes on this machine, while
typecheck and boundary proofs are seconds.

**Why.** Fast feedback must not mean untested code. A slice names its approved affected tests; an unlisted changed test,
unknown path, or verification-tool change fails closed to a full check. A commit trailer binds completed evidence to the
exact Git tree, so a clean later session can reuse it safely.

**Next.** Commit and push this policy migration with its focused final-tree evidence and the recorded aggregate-test
pass. Future ordinary slices use the targeted command recorded in their commit trailer; feature journeys and
verification infrastructure still use the full suite.
