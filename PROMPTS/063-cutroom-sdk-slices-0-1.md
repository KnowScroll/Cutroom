# 063 — `cutroom-sdk`: Slice 0 impact record, then Slice 1 readiness contract

- **For:** the next `cutroom-sdk` implementation session
- **Feature:** `cutroom-sdk` (S-173, S-175, S-176)
- **Work:** complete Slice 0's written impact record, then build only Slice 1's readiness contract
- **Written:** 2026-09-28, after all four gates were adversarially approved and the pre-code full check passed
- **Run:** not yet run

## Starting fact — do not repeat the preflight in this plan

The required pre-code `node scripts/check.mjs --code` already passed on 2026-09-28 after S-176 serialized
the outer test runner: typecheck, lint, format, boundaries, boundary proof, dead-rule audit and every test
were green; the test step took **1,476,701 ms**. That is the baseline for these two slices. This plan does
not schedule another preflight before Slice 0 or Slice 1.

If a later session begins from a different commit or with unknown changes, repository startup rules still
apply; that is not permission to treat a stale pass as a green baseline. Do not run a second full check merely
because this plan mentions the first one.

The feature remains `Status: planned`; no `packages/sdk` source exists. Slice 0 adds no runtime code. Slice 1
adds readiness to the existing contract/API/service only; it does not create the SDK client, launcher,
boundary exception, database migration, provider call, credential read, paid run or media artifact.

## Fixed contract for Slice 1

```text
Name: readiness
Type: REST
Method: GET
Path: /v1/ready
Auth: none — loopback-only Phase 1 API (D-098)
Request Schema (JSON): no body
Response Schema (JSON):
  200 { "contractVersion": 1, "ready": true }
  503 { "contractVersion": 1, "ready": false }
  500 ErrorResponse
Idempotency: read-only; no database row, setting, job, event, provider call or side effect
Rate limits: none; later SDK polling is bounded in Slice 3, not here
```

`ReadyResponse` is one strict discriminated union on `ready`: exactly the 200 and 503 bodies above. A
different contract version, an extra key, a missing key, or `ready` with the wrong literal must fail parsing.
The status code is part of the protocol: `true` is never sent with 503 and `false` is never sent with 200.

`startService` owns the mutable readiness state. It passes `startApi` a getter initially returning false,
starts exactly one worker, then changes the state to true. A worker-start failure stops the API and never
leaves a ready listener. The existing test harness must pass a live readiness getter tied to its worker:
after `restart()` and before `startWorker()`, it reports 503; after the worker starts, it reports 200.

## Slice 0 — impact and baseline record

### Objective

Turn the approved Gate 4 assumptions into a file-by-file impact record before any runtime change. The record
must distinguish work Slice 1 can affect now from work deferred to SDK Slices 2–4. It is not an opportunity
to widen the feature or change checks that the readiness route does not affect.

### Inputs to read

1. `docs/features/cutroom-sdk.md`: Gate 2 readiness protocol, Gate 3 checks 1–8 and Gate 4.
2. `packages/reel-contract/src/version.ts`, `routes.ts`, `index.ts` and the existing strict schema style in
   `request.ts`, `responses.ts` and `errors.ts`.
3. `apps/api/src/server.ts`, especially `ApiOptions`, `handle`, `send` and `startApi`.
4. `apps/service/src/service.ts`, especially the API-before-worker sequence and its worker-start cleanup.
5. `tests/engine/harness.ts`, `tests/stand-in/client.ts`, `tests/reel-contract-shapes.test.ts` and
   `tests/reel-plan-service.test.ts`.
6. `tests/boundaries.test.ts`, `scripts/drift.mjs`, workspace manifests and every `startApi(` caller found by
   `rg -n "startApi\\(" apps tests packages`.

### Required output

Add a `## Slice 0 impact record` section to `docs/features/cutroom-sdk.md`, immediately before Gate 4. It must
name the baseline command and green duration above, the commit it actually ran from, and each entry below with
one of **amend**, **new**, **read-only**, or **deferred** plus a reason:

| area                                                                             | expected Slice 1 disposition                  | required question                                                              |
| -------------------------------------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------ |
| `packages/reel-contract` schemas, exports and `Routes`                           | amend                                         | Which strict schema exports and route statuses must be added?                  |
| `apps/api/src/server.ts`                                                         | amend                                         | How does `/v1/ready` read readiness without touching a run or settings?        |
| `apps/service/src/service.ts`                                                    | amend                                         | Where does false become true, and what happens if worker start throws?         |
| `tests/engine/harness.ts`                                                        | amend                                         | Which live getter reflects no worker after restart and one worker after start? |
| `tests/stand-in/client.ts`                                                       | amend only if the route-coverage test uses it | How will the helper parse 200, 503 and 500?                                    |
| `tests/reel-contract-shapes.test.ts`                                             | amend                                         | Which positive and strict-invalid bodies prove the contract?                   |
| `tests/reel-plan-service.test.ts` or a new `tests/cutroom-sdk-readiness.test.ts` | amend/new                                     | Which test proves status, startup order and no side effects?                   |
| `scripts/drift.mjs`, `tests/boundaries.test.ts`, workspace manifests             | read-only                                     | Why is no SDK package or boundary exception allowed in Slice 1?                |
| PATH-only secrets tests, providers, database migrations, media                   | deferred                                      | Why does a read-only route require none of them?                               |

The report must name every verified feature test the static read proves Slice 1 can turn red, including its
check number where that feature numbers checks. It must also state the exact re-journeys the full feature will
require because of this contract/API amendment, or explicitly say **none beyond the named features** with the
file-level evidence. Do not guess a broad re-journey list: use imports, route coverage and assertions to justify
each name. Re-evaluate the list in every later slice when a new package or lifecycle behavior is added.

### Slice 0 acceptance criteria

- [ ] The impact record has an immutable baseline command, duration and commit.
- [ ] Every `startApi` caller is named and classified.
- [ ] Each affected test has a concrete expected red condition, not merely a filename.
- [ ] Contract/API/service/harness changes are separated from deferred SDK/launcher/boundary work.
- [ ] The re-journey list is exact and evidenced, not inferred from feature names.
- [ ] No runtime source, test behavior, gate status, timeout, concurrency or feature Evidence/Divergence text changes.

### Slice 0 stop condition

If the static impact review finds a new product choice — for example a remote readiness endpoint, an authentication
rule, a second service process, a database write, or a different ownership model — stop and ask the owner. Do not
write Slice 1 code under a changed contract.

## Slice 1 — readiness contract

### Feature summary

The future SDK must distinguish an absent listener from a Cutroom process whose API has bound but whose sole worker
is not ready. Slice 1 introduces exactly that proof as a typed, loopback HTTP endpoint. It lets a later SDK poll and
join an existing booting engine without launching a second child.

### Deterministic flows

1. A service begins startup. It creates the API with its readiness getter false; `GET /v1/ready` answers 503 with
   the strict false body while no worker has completed startup.
2. The one `startWorker` call resolves. The service flips its private readiness flag true; `GET /v1/ready` answers
   200 with the strict true body.
3. Worker startup rejects. The service stops the API, propagates the error and never exposes a ready response.
4. The engine harness has no worker after a restart. Its readiness response is 503 until its explicit
   `startWorker()` resolves, then 200. Existing non-readiness route tests retain their current behavior.
5. A malformed route implementation, mismatched version or side-effecting probe is caught by a schema/API test;
   a later SDK is not part of this slice.

### Data model and non-goals

There are no new tables, fields, migrations, indexes, settings or retained artifacts. The endpoint reads one
in-memory boolean through a getter; it never opens a second database connection beyond the API's existing one and
never writes a run, event, receipt or configuration.

Do not add `packages/sdk`, `node:child_process`, polling, a launcher, a port setting, authentication, a remote host,
or a provider/model dependency. Do not change `CONTRACT_VERSION`: this is an additive Version 1 amendment, as the
earlier contract additions were.

### Exact file plan

1. **Tests first — `tests/cutroom-sdk-readiness.test.ts` (new).**
   - Import public `ReadyResponse`, `CONTRACT_VERSION`, `Routes`, `ErrorResponse` and `startApi`/the engine harness
     only through package entrypoints.
   - Prove both valid strict bodies; reject extra fields, missing `contractVersion`, version 2, `200/false` and
     `503/true` when paired with the route assertion.
   - Start an API against a temporary database with a mutable `ready` getter. Assert 503/false before flipping it
     and 200/true after flipping it; compare the run/event tables before and after both probes to prove no write.
   - Start the standard engine with a worker and assert the public client reads 200/true. Restart it, assert 503/false
     before `startWorker()`, then assert 200/true after it. Always stop in `after`/`finally`.
   - Add only the route-coverage assertion needed to ensure `Routes['GET /v1/ready']` permits 200, 503 and 500 and
     no other success status. Do not copy schemas into the test.
2. **Contract — `packages/reel-contract/src/ready.ts` (new).**
   - Define strict `ReadyFalse` and `ReadyTrue` Zod objects using `ContractVersion` and literal `ready` values.
   - Export `ReadyResponse` as their discriminated union; do not use a permissive object, an optional `ready`, or a
     bare TypeScript type with no runtime parser.
   - Re-export it from `packages/reel-contract/src/index.ts` and add the route to `src/routes.ts` with exactly
     200/503 `ReadyResponse` and 500 `ErrorResponse`.
3. **API — `apps/api/src/server.ts`.**
   - Add a required read-only readiness getter to `ApiOptions`; all callers supply it. Handle `GET /v1/ready` before
     the run route matching and send the body/status derived from that getter.
   - Construct bodies with `CONTRACT_VERSION` and the exact literal. Do not parse request data, call a domain helper,
     inspect settings or touch a run table for this route.
   - Preserve existing 500 behavior if an unexpected handler error occurs.
4. **Service — `apps/service/src/service.ts`.**
   - Create `let ready = false` before `startApi`; pass `ready: () => ready`.
   - Leave every port/migration/API/one-worker ordering intact. Assign `ready = true` only after the awaited
     `startWorker` succeeds. In the existing `catch`, stop the API; do not set ready true in `finally` or cleanup.
5. **Harness and route helper — only where Slice 0 proved needed.**
   - In `tests/engine/harness.ts`, declare the mutable worker reference before calling `startApi`, pass
     `ready: () => worker !== undefined`, and preserve restart's `worker = undefined` before starting the replacement
     API. This lets tests observe the same lifecycle rather than a test-only constant.
   - In `tests/stand-in/client.ts`, add `ready` to the route union, schema table and helper only if the existing
     comprehensive service route test is used for the readiness assertion. Its 503 body must validate under
     `ReadyResponse`, not `ErrorResponse`.
6. **Deliberate break campaign.** Apply and restore each break from a file-backed edit with `finally`: make the API
   report true while the getter is false; make a schema permit an extra key or version 2; remove the readiness route
   from `Routes`; and add a test-only write in the readiness handler. Each must turn its named new/changed test red.

### Validation and error cases

- 200 only means `ready: true`; 503 only means `ready: false`.
- The route accepts no body and has no query semantics; an unsupported method falls through to the existing 404
  `ErrorResponse` path.
- `ReadyResponse.safeParse` rejects a response with the wrong literal version or unrecognized keys.
- A worker-start failure closes the API; the listener cannot remain available as false-ready indefinitely.
- A readiness probe cannot create a run, alter `lastSeq`, append an event, modify settings or call a provider.

### Slice 1 acceptance criteria

- [ ] `ReadyResponse` is publicly exported, runtime-validated and listed in the public `Routes` table.
- [ ] `/v1/ready` returns only the specified strict 200/503 bodies and existing schema-valid 500 errors.
- [ ] A real service/harness is not ready before its worker and is ready after exactly one worker starts.
- [ ] A failed worker start closes the API instead of leaving a listener behind.
- [ ] Readiness probes produce no database row, settings change, provider call or media artifact.
- [ ] The deliberate breaks all fail their intended tests and are restored.
- [ ] The full repository check is green after the slice, the Slice 1 box is ticked, and the slice is committed alone.

### Build order and handoff

1. Complete and commit the Slice 0 impact record only after its classifications and re-journey list are reviewed.
2. Hand this fixed Slice 1 contract and the Slice 0 findings to one slice builder. Tests precede implementation.
3. Read the resulting diff independently; reject scope growth into `packages/sdk` or launcher behavior.
4. Run the required post-slice full check, complete the deliberate-break record, tick only Slice 1, and commit it.
5. Stop at the Slice 1 boundary. Slice 2 begins `packages/sdk`; it must start with a fresh impact read because it adds
   workspace, boundary and public-client changes.

## Operational constraints

- Expected load: local loopback probes only; Slice 1 adds no polling loop.
- Latency: a ready handler is synchronous and should complete without I/O beyond the existing HTTP response.
- Security: loopback only, no credentials logged/read, no new environment variable and no remote binding.
- Observability: normal API behavior only; do not log settings, environments or request bodies to make readiness visible.
- Rollout/rollback: additive Contract V1 route; rolling back removes the route and makes a future SDK fail its required
  readiness probe rather than silently connecting to an unready engine.

## Out of scope

No SDK client/launcher implementation, API authentication, readiness polling, new database schema, provider work,
real reel, paid call, journey, re-journey, version bump or source-tree launcher default belongs to these two slices.
