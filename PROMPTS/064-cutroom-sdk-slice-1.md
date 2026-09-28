# 064 — `cutroom-sdk`: correct Slice 0, then build Slice 1 readiness

- **For:** the next `cutroom-sdk` implementation session
- **Feature:** `cutroom-sdk` (S-173, S-175, S-176)
- **Work:** correct Slice 0's contradictory impact record, then build only Slice 1's readiness contract
- **Written:** 2026-09-28, after an independent read of Slice 0 and a green current-HEAD code check
- **Run:** not yet run

## Starting verdict

Do not start Slice 1 from the committed Slice 0 record as written. Its checklist is ticked, but its body gives
mutually incompatible instructions:

1. The disposition table assigns readiness to a new `tests/cutroom-sdk-readiness.test.ts` and says not to amend
   `tests/reel-plan-service.test.ts`; the affected-test section later requires two amendments to that file.
2. Gate 2 says readiness reads one in-memory getter and no database row. The affected-test section nevertheless
   requires dropped run tables to make `/v1/ready` return 500. A database-independent readiness route must keep
   returning its 200/503 state when those tables are dropped.
3. The caller inventory correctly says `tests/resume-failed-contract.test.ts` must change, while the re-journey
   section later says no `resume-failed` file references `ApiOptions.ready`.
4. The record says Slice 1's builder reruns compatibility journeys, while approved Gate 4 puts the exact
   re-journeys in Slice 4.

The approved architecture settles the first two points without a product choice: the new dedicated readiness
test owns this route; `tests/reel-plan-service.test.ts` and `tests/stand-in/client.ts` remain unchanged; and a
schema-valid 500 is proved with a readiness getter that throws, not by breaking unrelated database tables. The
third point needs a precise amendment/re-journey classification under the existing feature precedent before code.

The repository is otherwise ready. On current HEAD `d0b75b6`, `node scripts/decisions.mjs` read all 115 pinned
decisions with none unpushed; `node scripts/drift.mjs` reported 143 modules and no violation; and
`node scripts/check.mjs --code` was fully green, with the serial test step taking 2,065,804 ms. Startup rules still
apply in the implementation session; never infer around a newer authority or a red check.

## Phase A — correct the Slice 0 record before code

Edit only `docs/features/cutroom-sdk.md`, preserving its approved gates and Evidence/Divergence blocks:

1. Make `tests/cutroom-sdk-readiness.test.ts` the sole new readiness behavior test.
2. Classify `tests/stand-in/client.ts` and `tests/reel-plan-service.test.ts` as read-only for Slice 1. The dedicated
   test may use a small local fetch helper that validates each body with public `ReadyResponse`/`ErrorResponse`.
3. Remove both claimed `reel-plan` check-13 amendments, especially the impossible dropped-table 500 assertion.
4. State that the 500 arm is exercised by a direct `startApi` whose test-only readiness getter throws. The normal
   route remains independent of database health and performs no database read or write.
5. Keep the required compile-support amendment to `tests/resume-failed-contract.test.ts`: its direct API uses
   `ready: () => true`. Classify it honestly under the repository's amendment precedent and name whether
   `resume-failed` must re-journey in Slice 4. Do not call a changed verified test file unaffected.
6. The exact Slice 4 re-journey list must follow the corrected file impact. It includes `reel-contract`; it excludes
   `reel-plan` unless this correction finds a separate assertion that truly changes. Resolve `resume-failed` from
   the precedent, with the cited file/decision evidence. Do not run any re-journey in Slice 1.
7. Correct the sample handler so it calls `options.ready()` exactly once per request and reuses the captured boolean
   for both status and body.

Run `node scripts/check.mjs --changed`, review the document diff, and commit this correction alone before handing
Slice 1 to a builder. If the re-journey precedent does not yield one exact answer, stop and ask the owner; do not
hide the uncertainty in an implementation commit.

## Slice 1 feature summary

Add one typed, loopback-only readiness endpoint so a later SDK can distinguish no listener, a Cutroom API that is
still waiting for its sole worker, and a ready engine. The endpoint is an additive Contract V1 amendment and has no
database, provider, media, launcher, polling, authentication, or remote-host behavior.

## Deterministic user/system flows

1. `startService` starts the API with readiness false. `GET /v1/ready` returns 503 and the strict false body.
2. Its single awaited `startWorker` succeeds. The service flips the same private flag true; the route returns 200
   and the strict true body.
3. Worker startup rejects. The existing cleanup stops the API and propagates the error; no listener remains ready.
4. The test harness starts or restarts without a worker. Its live getter returns false until `startWorker()` resolves,
   then true; `stopWorker()` makes it false before awaiting worker shutdown.
5. The readiness getter throws unexpectedly. The existing top-level API catch returns schema-valid 500
   `ErrorResponse`; this case does not manufacture a database dependency.

## API definition

- Name: readiness
- Type: REST
- Method: GET
- Path: `/v1/ready`
- Auth: none; Phase 1 remains fixed to loopback under D-098
- Request Schema (JSON): no body
- Response Schema (JSON):

```json
{
  "200": { "contractVersion": 1, "ready": true },
  "503": { "contractVersion": 1, "ready": false },
  "500": "ErrorResponse"
}
```

- Error Codes: 500 only for an unexpected handler/getter error; unsupported methods retain the existing 404 path
- Idempotency: read-only and side-effect-free
- Rate Limits: none in Slice 1; bounded SDK polling belongs to Slice 3

## Data model changes

None. No table, column, migration, index, setting, retained artifact, event, receipt, job, or provider call is added.

## Exact implementation plan

Hand the corrected facts to one `slice-builder`; it returns an uncommitted diff. Tests precede production code.

1. Add `tests/cutroom-sdk-readiness.test.ts`.
   - Parse both valid strict bodies through public `ReadyResponse`.
   - Reject an extra key, a missing key, version 2, a non-boolean `ready`, and status/body mismatches.
   - Pin the compile-time `Routes['GET /v1/ready']` response map to exactly 200/503 `ReadyResponse` and 500
     `ErrorResponse`; do not try to enumerate the type at runtime.
   - Start a direct API with a mutable getter. Prove 503/false before the flip and 200/true after it.
   - Make a getter change its answer on a second call and prove one request calls it once, preventing 503/true or
     200/false races.
   - Snapshot `run` and `run_event` counts before and after probes and prove they do not change.
   - Start a direct API with a throwing getter and prove schema-valid 500.
   - Start the standard engine with a worker, fetch readiness from `engine.api.baseUrl`, restart, prove 503 before
     `startWorker()`, then 200 after it. Use a test-local fetch/parser rather than widening the old route matrix.
2. Add `packages/reel-contract/src/ready.ts`.
   - Define strict true and false Zod objects with `ContractVersion` and literal `ready` values.
   - Export the runtime `ReadyResponse` union and its inferred type following the package's existing schema style.
   - Re-export it from `src/index.ts`; add only `GET /v1/ready` to `Routes`, with 200/503/500 as above.
   - Keep `CONTRACT_VERSION` equal to 1 and add no dependency beyond existing `zod`.
3. Amend `apps/api/src/server.ts`.
   - Add required `ready: () => boolean` to `ApiOptions`.
   - Match `GET /v1/ready` before run-route handling. Capture `const ready = options.ready()` once, then derive both
     status and exact body from that value.
   - Read no request body, database helper, setting, environment, provider, or filesystem path.
   - Leave the existing catch responsible for schema-valid unexpected 500 errors.
4. Amend every direct API caller, and no others.
   - `apps/service/src/service.ts`: create `let ready = false` before `startApi`, pass the getter, and set true only
     after awaited worker startup. Preserve the existing stop-and-rethrow failure path.
   - `tests/engine/harness.ts`: declare `worker` before `startApi`; pass `ready: () => worker !== undefined`; preserve
     `worker = undefined` before replacement API startup and before awaited worker stop.
   - `tests/resume-failed-contract.test.ts`: pass `ready: () => true` to its standalone API, with no assertion removed.
5. Add the amendment notes required by the corrected Phase A classification. Do not edit an approved gate or
   generated Evidence/Divergence line. Tick only Slice 1 after independent review and a green full check.
6. Deliberately break and restore, one at a time: schema strictness; the public route entry; false-before-worker;
   single getter evaluation; no database write; and throwing-getter 500. Each break must be caught by its named test.

## Edge cases

1. 200/false and 503/true are invalid even though each body alone resembles the union.
2. A different contract version or extra field is a protocol error.
3. Dropped or unavailable run tables do not change readiness; the handler does not consult them.
4. A getter exception produces 500 without leaking settings, paths, environment values, or secrets.
5. A worker-start failure closes the API instead of leaving an indefinitely false listener.
6. Repeated readiness requests create no run and append no event.

## Verification and stop boundary

1. Run the new targeted test with Node 22's required strip-types flag.
2. Format and lint only changed files, then run `node scripts/check.mjs --changed` for the builder handoff.
3. Independently read the diff. Reject any `packages/sdk`, launcher, polling, boundary-rule, workspace, provider,
   migration, media, auth, port, timeout, or concurrency change.
4. Run `node scripts/check.mjs --code`; a red result stops the session and is recorded as the finding.
5. Tick Slice 1, add Journal/context/prompt bookkeeping, run the appropriate changed check, and commit Slice 1 alone.
6. Stop. Do not create `packages/sdk`, start Slice 2, run a feature journey, or run the Slice 4 re-journeys.

## Acceptance criteria

- [ ] The Slice 0 impact record is internally consistent and committed separately before runtime code.
- [ ] `ReadyResponse` is a strict public runtime schema and the public route type has exactly 200/503/500.
- [ ] One readiness request evaluates the getter once and cannot mismatch status with body.
- [ ] The service and harness are false before a worker, true only after worker startup, and false after worker loss.
- [ ] Probes write no database row and touch no provider, setting, secret, media, or artifact.
- [ ] Unexpected getter failure returns schema-valid 500 without coupling readiness to database health.
- [ ] Every deliberate break is observed red and restored.
- [ ] Targeted tests and the full code check pass; only Slice 1 is ticked and committed.

## Out of scope

No SDK package/client, launcher, child process, readiness polling, port-race handling, ownership/close behavior,
boundary rule, workspace reference, provider, paid call, real reel, journey, re-journey, migration, authentication,
remote binding, contract-version bump, timeout change, concurrency change, or check weakening belongs here.
