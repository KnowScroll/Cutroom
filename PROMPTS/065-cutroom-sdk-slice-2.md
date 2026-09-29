# 065 — `cutroom-sdk`: build Slice 2, typed client and package boundary

- **For:** the next implementation session
- **Feature:** `cutroom-sdk` (S-173, S-175, S-176, S-177)
- **Work:** Slice 2 only — the public `@cutroom/sdk` package, strict typed routes, and its import boundary
- **Written:** 2026-09-29, after Slice 1 and the verification-policy migration were committed and evidence-bound
- **Run:** session 66, 2026-09-29 — Slice 2 committed as `4f98698`; its scope-bound review corrections followed in `45b9de9`

## Starting facts — do not repeat historical work

Slice 1 is complete at current HEAD `98930f8`: strict `GET /v1/ready`, `ReadyResponse`, the API/service/harness
readiness wiring, and `tests/cutroom-sdk-readiness.test.ts` are implemented and verified. They are read-only in this
slice. `node scripts/verification-status.mjs` reports exact-tree targeted evidence for this commit.

At the start of the session, run the required orientation checks, in this order:

```powershell
node scripts/decisions.mjs
node scripts/drift.mjs
Get-Content JOURNAL.md -Tail 40
node scripts/verification-status.mjs
```

If the decisions command reports unpushed steering commits, stop: authority is newer. Do not rerun Slice 1's full
suite or the verification-policy aggregate suite merely as a preflight. Their green results are recorded evidence.
S-177 replaces that startup ritual with an approved affected-test list. This slice still needs one final full check,
because it changes the workspace solution and boundary enforcement.

## Slice 2 outcome

Create `packages/sdk` as Cutroom's typed loopback HTTP client. It may import only `@cutroom/reel-contract` and Node
built-ins. It validates input before `fetch`, validates every response after it, and exports:

```text
createCutroom(options) -> Promise<Cutroom>
submit(request)        -> Promise<SubmitResponse>
find(requestId)        -> Promise<RunStatus>
status(runId)          -> Promise<RunStatus>
follow(runId, since?)  -> Promise<EventsPage>
result(runId)          -> Promise<RunResult | RunStatus>
record(runId)          -> Promise<RunRecord | RunStatus>
cancel(runId)          -> Promise<RunStatus>
resume(runId, request) -> Promise<ResumeResponse>
close()                -> Promise<void>
```

This is client/package work only. Do **not** build a child process, launcher, readiness polling, a `503` wait,
port-race handling, ownership tracking, `CUTROOM_API_PORT`, or process shutdown. Those are Slice 3. `GET /v1/ready`
already exists in Contract V1, but probing it is Slice 3 rather than a reason to add a timer or retry here.

## Required public behavior

- Default origin: `http://127.0.0.1:8787`; only loopback HTTP origins with an explicit port are accepted. Reject
  HTTPS, remote hosts, credentials, paths, query strings, fragments, and a missing port. Normalize one valid origin.
- Use public Contract V1 Zod schemas for request and response validation. Invalid input makes no HTTP request.
- Encode every `runId` path segment and `requestId`/`since` query value once.
- Defined refusal bodies are normal returns: submit `409`/`422`; result/record `409` as `RunStatus`; and resume
  `200`/`202`/`409`/`422` as `ResumeResponse`. Never treat `202` as a completed result.
- Export structured errors without an unparsed body:
  - `SdkApiError`: `{ kind: 'api', status, body: ErrorResponse }` for schema-valid `400`, `404`, and `500` errors.
  - `SdkProtocolError`: `{ kind: 'protocol', status?: number, stage: 'ready' | 'request' }` for unexpected status,
    malformed JSON, or a body that fails the expected schema.
  - Export the stable `SdkConnectionError` shape now, but implement launcher/connection-retry behavior only in Slice 3.
- `close()` is local and safe in Slice 2: it starts/stops no process and makes later calls reject locally.

## Expected files and boundary decision

Create the minimal package and one new behavior test:

```text
packages/sdk/package.json
packages/sdk/tsconfig.json
packages/sdk/src/index.ts
packages/sdk/src/<private client modules, if needed>
tests/cutroom-sdk-routes.test.ts
```

Add `packages/sdk` to root `tsconfig.json` references and declare only the workspace dependency on
`@cutroom/reel-contract`. Match the existing metadata, TypeScript setup, and exactly-one-`src/index.ts` export rule.

Add `sdk-no-engine-internals` plus a resolved-path `drift --prove` case. It forbids any SDK import resolving below
`apps/` or `packages/`, except `packages/sdk` itself and `packages/reel-contract`. Prove a forbidden SDK import of
`@cutroom/domain` is caught and a legal contract import is clean.

Keep `processes-only-in-providers` unchanged. No launcher or `child_process` import exists in Slice 2, so its future
`launcher.ts` exception and launcher-only companion rule are Slice 3 work. Do not create an empty launcher simply to
prepare a rule.

## Test inventory — this is the recorded ownership

Already complete, read-only, and not to be widened:

- `tests/cutroom-sdk-readiness.test.ts`: Slice 1 readiness shape/status/no-write/lifecycle proof.
- `tests/resume-failed-contract.test.ts`: Slice 1's compile-support `ready: () => true`; it changed no assertion.
- `tests/reel-plan-service.test.ts`, `tests/stand-in/client.ts`, and `tests/reel-contract-shapes.test.ts`: explicitly
  read-only under the corrected Slice 0 impact record. Do not add SDK routes to their matrices.

Create `tests/cutroom-sdk-routes.test.ts` as the sole Slice 2 SDK behavior owner. Use a small local stand-in HTTP
server that records requests and returns scripted status/body pairs. It must not start the real service, a worker,
provider, database, or child process. It must prove:

1. The public entry exports every method and public type; invalid public request data fails at the schema boundary.
2. Every current non-readiness route has the exact method, encoded path/query, request JSON where applicable, and
   schema-validated successful return: submit, find, status, follow, result, record, cancel, resume.
3. Defined refusals return normally: submit `409`/`422`, result/record `409`, resume `200`/`202`/`409`/`422`.
4. Schema-valid `ErrorResponse` bodies at `400`, `404`, and `500` become `SdkApiError` with only the validated body.
5. Malformed JSON, syntactically valid wrong-schema JSON, and unexpected status become `SdkProtocolError`, never a raw
   body.
6. An invalid request sends zero calls; invalid base URL variants are rejected before a request; a custom permitted
   loopback origin is normalized and used.
7. `close()` makes the handle reject locally without a request or process signal.

Existing test owners that must be run but not edited:

- `tests/workspace.test.ts`: package metadata, the only public entry point, and root project reference.
- `tests/boundaries.test.ts`: drift, `--prove`, and `--audit` for the new rule.

The approved Slice 2 targeted command is:

```powershell
node scripts/check.mjs --slice tests/cutroom-sdk-routes.test.ts tests/workspace.test.ts tests/boundaries.test.ts
```

If another test changes, add it to this command and record why in the feature entry and `Verification` trailer. If a
changed path requires a test not listed here, update the impact record before calling the slice complete; do not omit
it. Do not edit check/drift/test-policy tooling to reach green.

## Builder sequence

Use one fresh `slice-builder` context. It works tests-first and returns an uncommitted diff for independent review.

1. Read `docs/features/cutroom-sdk.md` Gates 2–4 completely after the four start checks.
2. Write the new SDK route test first; make each concern red before production code.
3. Add package metadata, solution reference, and only the single public entry point.
4. Implement strict client methods and error types with `fetch` and public contract schemas.
5. Add/prove the SDK import rule. Run `drift --audit` after the real SDK package exists.
6. Deliberately break and restore: request validation-before-fetch, encoding, a normal refusal, `ErrorResponse`,
   malformed JSON, wrong-schema JSON, URL rejection, post-close rejection, and the import boundary. Record each
   catching test/rule in the Slice 2 feature entry. Leave no test-only break in the final diff.
7. Independently review scope. Reject any launcher, child process, polling/timer, port/ownership change, API/service
   change, provider/pipeline/domain/database import, migration, secret/env read, media, journey, or version change.
8. Tick Slice 2 in `docs/features/cutroom-sdk.md` only after final verification; preserve approved gates and generated
   Evidence/Divergence sections.

## Verification and stop boundary

During development, run the new route test and `node scripts/drift.mjs --prove` for fast feedback. Before commit,
format changed files and run the targeted command above. It runs typecheck, lint, format, drift/prove/audit,
authority/docs checks, and exactly the named tests.

After that is green and the diff is reviewed, run exactly once:

```powershell
node scripts/check.mjs
```

That one final aggregate run is mandatory because this slice adds a workspace package, changes root TypeScript project
references, and changes boundary configuration. Do not run it earlier as a preflight or repeatedly after an unchanged
green result. If it fails, record the failure and stop; do not weaken a test, rule, timeout, or check.

On green: commit Slice 2 alone with `Verification` trailers naming the targeted tests and full check; run
`node scripts/verification-status.mjs` against the committed tree; then append the required `JOURNAL.md` entry.
Stop. Do not begin Slice 3, a journey/re-journey, or `self-heal`.
