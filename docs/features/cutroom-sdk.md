---
status: current
authority: plan
---

# cutroom-sdk — a typed local client that connects to one Cutroom engine, or starts the one it owns

Status: planned
Gates: product approved · architecture approved · program-design approved · slices approved

> **Created 2026-09-28 at the owner's request** (S-173), after `resume-failed`'s journey and its ten
> affected-feature re-journeys completed. S-173 chose the outcome: KnowScroll calls `@cutroom/sdk`; the
> engine remains its own loopback-HTTP process; the SDK connects first and starts the service only when
> none answers. The caller that started a child stops that child when it closes.
>
> **All four gates passed adversarial review on 2026-09-28.** No implementation file, package, dependency, route,
> boundary exception, or test change belongs to this feature until the repository has a genuinely green full
> pre-code check.
> The full code baseline also failed on 2026-09-28 after its fast gates passed; that failure must be made
> legible and green before any implementation begins. It is not attributed to this unimplemented feature.

## Contract audit — Version 1 is amended, not frozen

`CONTRACT_VERSION` is still the literal `1`, but a client that implements only the original package commit
`b61f50f` is incomplete. The SDK validates the current schemas exported from `@cutroom/reel-contract`, not
a copied or remembered Version 1 shape.

| addition after the original package  | current SDK obligation                                                                                                                                                                                               |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `reel-stills`, Version 1 amendment   | Send `Criterion.type` (`presence` or `event`) on every criterion; reject an `event` in `mustNotShow`, exactly as `Criteria` does.                                                                                    |
| `reel-takes`, Version 1 amendment    | Read the required `RunRecord.takes` array, including every attempt, `used`, checks, and optional observation/reconciliation ids.                                                                                     |
| `resume-failed`, Version 1 amendment | Expose `Piece`, `ResumeRequest`, and all four `ResumeResponse` arms through `POST /v1/runs/:runId/resume`; return its free preview without treating it as a completed resume.                                        |
| `resume-failed`, Version 1 amendment | Preserve optional, absent-not-null lineage fields: `RunStatus.resumes`, `RunStatus.resumedBy`, and `RunRecord.pictures[]` / `takes[]`.`keptFrom`. Lookup by `requestId` can therefore return the newest resumed run. |

The existing routes are submit, lookup by request id, status by run id, numbered event follow, final result,
record, cancel, and resume. The SDK exposes all eight; S-173's shorter list does not license dropping the
two status routes. It does not invent a second contract, add a model client, or expose engine internals.

## Gate 1 — Product (approved)

**The problem.** KnowScroll needs one ordinary, typed local dependency through which it can submit a reel,
observe it, read its result and provenance, cancel it, and resume an eligible failed run. Today those actions
are HTTP calls a caller must assemble itself, while it must also know whether a local engine is already
running and how to stop one it happened to start. That leaks service-process work into every caller and risks
two workers sharing one database.

**The visible outcome.** `@cutroom/sdk` gives KnowScroll one client handle. It validates request data before
it crosses the boundary, validates every response received, and gives the caller the exact data types the
contract promises. It first joins the engine already listening at the configured loopback URL. If no eligible
engine answers, it launches the configured engine program, waits until that process is genuinely ready, then
uses it. A handle which joined an existing engine never stops it. A handle which launched the engine stops
only that child when the handle closes.

**Primary flows.**

1. **Existing engine.** KnowScroll creates a client. The SDK checks the local engine's readiness and its
   contract version. It creates no child, then accepts `submit`, `find`, `status`, `follow`, `result`,
   `record`, `cancel`, and `resume` calls.
2. **No engine.** The readiness check finds no listener. The SDK launches the configured engine program
   without a shell, waits for the engine's ready acknowledgement, rechecks the contract version, and returns
   an owning client. A caller may submit only after that acknowledgement.
3. **Engine already booting.** A `503` strict `{ contractVersion: 1, ready: false }` is a recognized
   Cutroom process whose worker is not ready. The SDK polls that same origin until it returns 200 ready or the
   deadline expires; it starts no child and never changes port. A deadline is a `ready` connection error.
4. **Two callers at once.** Both callers may initially find no engine. At most one service reaches ready;
   the other child loses the fixed loopback-port race before it can start a worker, exits, and its SDK waits
   for and joins the winner. Neither caller starts a second worker. A joining handle never gains ownership
   of that winner: closing it leaves the service running; closing the one handle that launched it stops it,
   even if another handle had joined. That is the creator-owned shutdown S-173 and S-175 chose, not a
   shared-lifecycle promise the SDK cannot keep across processes.
5. **Bad peer or failed start.** A listener that does not answer the Cutroom readiness schema, a different
   contract version, a child that exits, or a readiness deadline produces a named connection error. The SDK
   never submits work to that peer, never starts a second service on another port, and never reports a
   successful client.
6. **Closing.** `close()` is idempotent. It sends the existing stdin stop protocol to a child this handle
   owns and waits for it to exit; it closes no externally started engine. A close cannot cancel or alter an
   already accepted run merely because the SDK handle goes away.
7. **A contract call.** Each SDK method sends and receives JSON only. Contract refusals stay ordinary
   `SubmitResponse` or `ResumeResponse` values, including budget figures and resume previews. A transport
   failure, an HTTP error body, or a body that fails the expected schema is a named SDK error rather than
   an unvalidated object.

**What it does not do.** It does not run work in KnowScroll, import the worker, API, service, domain,
pipeline, providers, database driver, ffmpeg, or a model client. It does not decide a brief, budget, retry,
or resume eligibility. It does not add authentication to the loopback-only Phase 1 API, retain media, copy
files, expose a remote endpoint, or invent an alternate contract version.

**Product measure.** Against a stand-in service, a caller can complete every supported operation through
the SDK; joining a ready service creates no process; a caller-owned service is stopped by `close`; and two
concurrent SDK callers still leave exactly one worker. The journey uses no provider and spends nothing.

## Gate 2 — Architecture (approved)

### Boundaries and ownership

| location                 | responsibility                                                                                                                                       | forbidden                                                                                                                                                 |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/reel-contract` | Existing request, response, route, and schema definitions; a small readiness schema and route if the readiness protocol needs one.                   | Any internal engine import or dependency beyond `zod`.                                                                                                    |
| `apps/api`               | Serve the readiness response only when the engine is ready to accept work.                                                                           | Providers, launcher logic, or an SDK import.                                                                                                              |
| `apps/service`           | Keep the existing fixed loopback port, one-worker startup order, and stdin `stop` protocol.                                                          | Importing the SDK or accepting SDK-specific business rules.                                                                                               |
| `packages/sdk`           | Construct the typed client, make HTTP calls, validate both directions, launch one configured child, wait for readiness, and stop only its own child. | Every engine package except `@cutroom/reel-contract`; providers, pipeline, domain, database, ffmpeg, model clients, and direct access to generated files. |

The SDK is a client and a launcher, not a façade that re-exports engine code. This is S-173's limited
exception to D-099: external callers may depend on `@cutroom/reel-contract` and `@cutroom/sdk`; the SDK
itself imports only the former and Node built-ins. How KnowScroll obtains either package remains outside this
repository, as D-098 and S-173 require.

### Readiness and the one-worker guarantee

The current API begins listening before `startWorker` completes, so an arbitrary successful route response
does not prove that it is safe to submit work. The draft therefore adds one schema-validated, loopback-only
readiness route to the contract and API:

```text
GET /v1/ready
200  ReadyResponse { contractVersion: 1, ready: true }
503  ReadyResponse { contractVersion: 1, ready: false }
500  ErrorResponse
```

`ReadyResponse` is a strict discriminated union of exactly those two bodies. `startService` owns one mutable
readiness flag: it hands `startApi` a read-only getter initially returning `false`, starts the one worker,
then changes the flag to `true`; if worker startup fails, it stops the API and the process never reports
ready. This matches the current order, where the API listens before `startWorker`, without allowing the SDK
to submit in that interval. The route writes no row and exposes no configuration or secret. A ready body with
another version fails the SDK's literal ContractVersion parse and is a protocol error, not an engine to join.

The SDK probes that route before launch, after its child writes the existing ready banner, and after a child
loses the fixed-port race. A valid 503 non-ready body means "wait for this engine", never "launch another".
A listener whose body fails the readiness schema is a wrong peer, not an engine to join. A child that fails
`EADDRINUSE` is not retried as another independent engine: the SDK keeps probing the configured URL for the
winner until the same readiness deadline expires. This preserves S-113's one-worker rule without a second
database lock or a second port.

### Launch configuration — owner-confirmed

The SDK cannot safely assume this repository's TypeScript source entrypoint: D-098 leaves package delivery
to the orchestrator, and KnowScroll may install a packaged service rather than a source checkout. **The owner
chose an explicit `launcher` option containing a program and argument vector** (S-175), used only when the
configured engine is absent. Its process invocation has `shell: false`; it does not compose a command string,
inspect provider keys, or log environment values. The child inherits the caller's ordinary process environment
and is given the normalized URL's port as `CUTROOM_API_PORT`, so the current service and the SDK target one
fixed loopback origin. The launcher has piped stdin for the existing `stop` protocol and ignored stdout/stderr;
readiness, not a banner string, is the startup proof. The SDK never silently hard-codes
`apps/service/src/main.ts`.

```text
CreateCutroomOptions {
  baseUrl?: "http://127.0.0.1:8787" | another explicit loopback HTTP origin with a port
  launcher?: { command: string, args: readonly string[] }
  readyTimeoutMs?: positive whole milliseconds       // default 30000
}
```

The base URL defaults to the service's documented `127.0.0.1:8787`. It rejects credentials, paths, query,
fragments, HTTPS, non-loopback hosts, and a missing port. If the initial probe gets a connection refusal and
there is no launcher, construction fails at `connect` without spawning anything. A custom URL's parsed port
is the value injected for the child; a command that ignores it fails readiness rather than causing the SDK to
look elsewhere. Readiness polls only this origin every 100 ms until the deadline; that bounded poll is not a
reel retry.

### Boundary enforcement

The existing `processes-only-in-providers` rule cannot simply be relaxed. Its `pathNot` becomes the exact
alternation `^packages/providers/|^packages/sdk/src/launcher.ts$`; a new `sdk-processes-only-launcher` rule
forbids `node:child_process` from `^packages/sdk/(?!src/launcher\\.ts$)`; and `sdk-no-engine-internals` forbids
every SDK import resolved under `apps/` or `packages/` except its own files and `packages/reel-contract`.
`drift --prove` creates a global-rule violation, an SDK non-launcher child-process violation, and an SDK import
of `@cutroom/domain`; `drift --audit` names the new folder. The public package exports only `src/index.ts`, is
added to the root TypeScript project references when it gains source, and declares the workspace dependency in
its own `package.json`.

## Gate 3 — Program design (approved)

### Public surface

```text
createCutroom(options: CreateCutroomOptions) -> Promise<Cutroom>

Cutroom.submit(request: SubmitRequest) -> Promise<SubmitResponse>
Cutroom.find(requestId: string) -> Promise<RunStatus>
Cutroom.status(runId: string) -> Promise<RunStatus>
Cutroom.follow(runId: string, since?: number) -> Promise<EventsPage>
Cutroom.result(runId: string) -> Promise<RunResult | RunStatus>
Cutroom.record(runId: string) -> Promise<RunRecord | RunStatus>
Cutroom.cancel(runId: string) -> Promise<RunStatus>
Cutroom.resume(runId: string, request: ResumeRequest) -> Promise<ResumeResponse>
Cutroom.close() -> Promise<void>
```

`follow` is one numbered-events page, not an unbounded polling loop. The caller chooses when to call it
again using `nextSince`; that preserves the contract's durable event cursor and does not create a second
worker or timer policy in the SDK. `result` and `record` return `RunStatus` while a known run is still
running, exactly as their 409 routes promise. Request schemas are parsed before fetch; all success, refusal,
and error schemas are parsed after fetch. The SDK never treats a 202 as a finished result.

### State transitions

```text
new -> probing
probing -> joined                 (ready peer and matching Version 1)
probing -> starting-owned         (connection refused or no listener)
probing -> waiting-existing       (recognized 503 non-ready peer)
waiting-existing -> joined        (that peer returns 200 ready)
starting-owned -> ready-owned     (child exits startup and readiness succeeds)
starting-owned -> joining-winner  (child loses fixed port race)
joining-winner -> joined          (winner becomes ready)
waiting-existing -> failed        (readiness deadline)
any non-closed state -> failed    (wrong peer, schema/version mismatch, child exit, deadline)
joined -> closed                  (close: no process stopped)
ready-owned -> closing -> closed  (close: stop the owned child only)
```

The only retry in this state machine is bounded readiness polling during one attempted launch or a port-race
join. It is not a retry of any reel request. Once `close()` starts, route methods reject locally and no new
child can be launched through that handle. A joined handle's close leaves the engine alone; a ready-owned
handle's close stops its own child and joined handles subsequently receive an ordinary connection error. The
SDK does not attempt cross-process ownership tracking or reference counting.

### Validation and error rules

- The base URL must be loopback HTTP and normalize to one origin. A non-loopback, HTTPS, credential-bearing,
  or path-bearing URL is refused at client construction; this SDK does not broaden D-098's Phase 1 surface.
- A known contract refusal remains a parsed return value: submit's 409/422 is `SubmitResponse`; resume's
  200/202/409/422 is `ResumeResponse`; result and record's 409 is `RunStatus`. No such body is thrown.
- `SdkApiError` is `{ kind: 'api', status, body: ErrorResponse }`: it carries a schema-validated contract
  error body only for a route's 400, 404, or 500 response. `SdkProtocolError` is `{ kind: 'protocol',
status?: number, stage: 'ready' | 'request' }` for unexpected status, malformed JSON, or a response that
  fails its expected schema; it carries no unparsed body. `SdkConnectionError` is `{ kind: 'connection',
stage: 'connect' | 'start' | 'ready' | 'close' }` for a connection refusal, child error/exit, or readiness
  deadline. Neither error prints the child environment or a provider key.
- URL path segments and the `requestId` query value are encoded once. No route input is interpolated into a
  shell command or a filesystem path.
- The launcher retains only its own child handle. An externally running engine is never inferred from a PID,
  killed by a signal, or stopped through `close`.

### Tests that define done

1. The SDK public entry exports the methods and types above, accepts every current Contract V1 amendment,
   and cannot be compiled with an untyped criterion, missing record `takes`, or an invalid resume shape.
2. Every existing route is exercised against a stand-in API: request JSON, method, path, query encoding,
   return schema, a normal refusal, `ErrorResponse`, malformed JSON, and a syntactically valid but wrong
   schema body are each distinguished.
3. `GET /v1/ready` returns only strict `{ contractVersion: 1, ready: false }` with 503 before the sole worker
   exists and strict `{ contractVersion: 1, ready: true }` with 200 after it exists; it writes no database row
   or settings. The SDK rejects a different version, a lookalike JSON body, and a custom-port child that never
   becomes ready at the configured origin.
   A recognized 503 starts no child: it is polled into a joined handle or fails only at the readiness deadline.
4. An already-ready service is joined with no child spawned and remains available after `close`.
5. An absent service is started once, is not usable before ready, becomes usable when ready, and the exact
   child is stopped through stdin by `close` on Windows and non-Windows test paths.
6. Two SDK processes launched together at the fixed port leave one ready service and one worker; the losing
   child exits before any worker starts and both clients join the same engine. Closing the joining handle does
   not stop it; closing the launching handle sends stop to its child, after which the joined handle receives a
   connection error. This proves S-173's creator-owned shutdown rather than an unimplemented shared lease.
7. The SDK import boundary and launcher-only child-process boundary both fail a deliberate `drift --prove`
   violation; the generic process rule remains enforced everywhere else.
8. The feature's PATH-only secrets child passes with canary keys absent from its test child and with no SDK
   log or error carrying either canary. The launcher test uses stand-ins only.

No database schema, migration, provider, pipeline stage, paid run, new environment key, or media artifact is
part of this feature.

## Slice 0 impact record (cutroom-sdk S-173, S-175, S-176)

**Baseline.** `node scripts/check.mjs --code` passed green on 2026-09-28 from commit
`019d2a95a87ab8e34350072de84e59bf7effcfa1` (short `019d2a9`, _"chore: stabilize preflight and plan sdk slices"_),
the commit that serialized the outer test runner (S-176). The test step alone took **1,476,701 ms**. The
decisions pin was current and 0 commits unpushed at that commit. The feature remained `Status: planned`,
no `packages/sdk` source existed, and no Slice 1 code was written before this record.

### startApi callers — every one named and classified

Four call sites of `startApi(` exist, exactly three of them are CALLERS of the function:

| caller                                                                            | options it supplies                                                        | classification under Slice 1                                                                                                                                                                                                                                  |
| --------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/api/src/server.ts:349`                                                      | The function's own definition; not a caller.                               | n/a — the function itself changes (mandatory `ready` getter added to `ApiOptions`).                                                                                                                                                                           |
| `apps/service/src/service.ts:145` (`startService`)                                | `{ dbPath, port, resume, budgetPath }`                                     | **amend** — must pass `ready: () => ready` with `let ready = false` set before `startApi` and flipped to `true` only after `await startWorker(...)` succeeds.                                                                                                 |
| `tests/engine/harness.ts:242` (`startEngine`, initial API)                        | `{ dbPath, resume, budgetPath }`                                           | **amend** — must pass `ready: () => worker !== undefined` and the mutable `worker` reference must be declared BEFORE `startApi` so the closure sees it.                                                                                                       |
| `tests/engine/harness.ts:350` (`startEngine.restart`, replacement API after stop) | The same `apiOptions` shape, reconstructed inside `restart()`.             | **amend** — same fix as line 242, and `restart()` must set `worker = undefined` before the new `startApi` call.                                                                                                                                               |
| `tests/resume-failed-contract.test.ts:1325`                                       | `{ dbPath: service.dbPath }` — bare, the minimum `ApiOptions` shape today. | **amend** — adding a required `ready` getter makes this call a TypeScript error. The test will be updated to supply `ready: () => true` for the lifetime of its single API (the run it queries has already finished and the engine's own worker has stopped). |

### Table — area, expected Slice 1 disposition, required question

| area                                                                             | expected Slice 1 disposition | required question, with file-level evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| -------------------------------------------------------------------------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/reel-contract/src/ready.ts` (new)                                      | **new**                      | Which strict Zod objects are exported? `ReadyTrue = z.strictObject({ contractVersion: ContractVersion, ready: z.literal(true) })` and `ReadyFalse = z.strictObject({ contractVersion: ContractVersion, ready: z.literal(false) })`, exported as `ReadyResponse = z.union([ReadyTrue, ReadyFalse])`. The union is the only exported schema; a permissive object, an optional `ready`, or a TypeScript-only type with no runtime parser is rejected by Gate 3's wording (the response is "one strict discriminated union on `ready`").                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `packages/reel-contract/src/routes.ts`                                           | **amend**                    | Which route statuses must be added? One new entry: `'GET /v1/ready'` with `responses: { 200: ReadyResponse, 503: ReadyResponse, 500: ErrorResponse }`. No existing route's response map moves. No request body is defined for it (the route has none). The `import type { ReadyResponse } from './ready.ts'` is the only new import line.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `packages/reel-contract/src/index.ts`                                            | **amend**                    | What must be re-exported? `export { ReadyResponse } from './ready.ts'`. Nothing else; no `ReadyTrue`/`ReadyFalse` leakage.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `apps/api/src/server.ts`                                                         | **amend**                    | How does `/v1/ready` read readiness without touching a run or settings, and how does a single request call the getter exactly once? `ApiOptions` gains one required field, `ready: () => boolean`. The handler matches `GET /v1/ready` before the `RUN_ROUTE` regex (line 272): it captures `const ready = options.ready()` once, then derives both status and exact body from that captured boolean - `ready ? { contractVersion: V, ready: true }` and 200, or `{ contractVersion: V, ready: false }` and 503. **A single request must never call `options.ready()` twice**, so a getter whose answer changes between calls cannot return 503 with `ready: true` or 200 with `ready: false`. No `db`, no `options.resume`, no `options.budgetPath`, no body is read; the route uses nothing but the captured `ready` value and `CONTRACT_VERSION`. The existing 500 fallback (the `.catch` on `handle`) still wraps an unexpected error, so a thrown getter yields a schema-valid 500 `ErrorResponse` - this is the only way the 500 arm is exercised, and a thrown getter does not couple readiness to database health. The `handle` signature still takes `db` and `options`; the new branch never calls them.                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `apps/service/src/service.ts`                                                    | **amend**                    | Where does false become true, and what happens if worker start throws? Before the `await startApi({...})` at line 145, declare `let ready = false` and pass `ready: () => ready`. The existing `try { worker = await startWorker(...) } catch (error) { await api.stop(); throw error }` (line 160–187) keeps the API stopped on a worker-start failure, so a thrown start never exposes a ready response. After `startWorker` resolves, assign `ready = true` before any later code. The `catch` is the same; no change to `shutDown`. No new environment variable, no port setting, no auth, no remote binding — the service still binds to `127.0.0.1` on a fixed loopback port (D-098) and the readiness route is unauthenticated exactly because Phase 1 is loopback-only.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `tests/engine/harness.ts`                                                        | **amend**                    | Which live getter reflects no worker after restart and one worker after start? Declare `let worker: Worker \| undefined` BEFORE the `await startApi(apiOptions)` call at line 242 (currently declared at line 243, after `startApi`); pass `ready: () => worker !== undefined`. In `startWorker(override)`, the existing `worker ??= await startWorker({...})` (line 269) is unchanged — `worker` is the same binding the getter reads. In `restart({script})` (line 346), `worker = undefined` must be set BEFORE `engine.api.stop()` and BEFORE the new `await startApi(apiOptions)`, so the window between stop and the new API's first request reads `worker === undefined` and answers 503. In `stopWorker()` (line 288), the existing `worker = undefined` precedes `await stopping?.stop()`, which already answers 503 during the brief window until the next start.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `tests/stand-in/client.ts`                                                       | **read-only**                | Why does the route-coverage helper stay as it is for Slice 1? The dedicated readiness test `tests/cutroom-sdk-readiness.test.ts` (new, see below) is the sole owner of readiness route coverage in Slice 1, and it uses a small local fetch helper that validates each body with public `ReadyResponse`/`ErrorResponse` rather than widening the comprehensive `Route` union, the `EXPECTED` schema table or the `routeOf` matcher. Amending `tests/stand-in/client.ts` would in turn force `tests/reel-plan-service.test.ts` check 13 to amend, which would force a `reel-plan` re-journey — a chain the prompt rules out: a contract V1 amendment by another feature (`S-034`, `S-093`, `S-099`'s form) does not open a verified feature's gates or rewrite its evidence. The 503 body, when one ever arrives through the public client in a later slice, must validate under `ReadyResponse` (the union — `ReadyTrue` ∪ `ReadyFalse`), not `ErrorResponse`; that rule is owned by the readiness test's local helper.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `tests/reel-contract-shapes.test.ts`                                             | **read-only**                | Why does the contract shape test stay as it is for Slice 1? The new dedicated `tests/cutroom-sdk-readiness.test.ts` is the sole owner of `ReadyResponse` shape checks (both valid strict bodies and the strict-invalid bodies the prompt names: extra key, missing `contractVersion`, version 2, `200/false` paired with 503, `503/true` paired with 200, and a non-boolean `ready`). Adding `ReadyResponse` to the shared `MESSAGES` map in `reel-contract-shapes.test.ts` would rewrite `reel-contract`'s evidence from another feature, which the repository's amendment precedent (`S-034`, `S-093`, `S-099`'s form) forbids - the same chain that rules out amending `tests/stand-in/client.ts` and `tests/reel-plan-service.test.ts` rules this out too. `reel-contract`'s own Slice 4 re-journey then runs unchanged from its prior verified evidence; it does not need to re-exercise a new `MESSAGES` entry.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `tests/reel-plan-service.test.ts` OR `tests/cutroom-sdk-readiness.test.ts` (new) | **new**                      | Which test proves status, startup order and no side effects? **`tests/cutroom-sdk-readiness.test.ts` is new**; it is the sole readiness test for Slice 1. It does NOT amend `tests/reel-plan-service.test.ts` — that file is `reel-plan`'s evidence, and a contract V1 amendment by a different feature (`S-034`, `S-093`, `S-099`'s form) does not open a verified feature's gates or rewrite its evidence, so its check 13 stays read-only and `reel-plan` is not on the Slice 4 re-journey list (below). The new file contains: (i) both valid strict bodies parse, and the strict-invalid bodies named in the prompt (extra key, missing `contractVersion`, version 2, `200/false` paired with 503, `503/true` paired with 200, a non-boolean `ready`) all reject under `ReadyResponse.safeParse`; (ii) a direct `startApi` against a temporary database with a mutable `ready` getter (test-local; not via the engine harness) answers 503/false before the flip and 200/true after, and a `SELECT COUNT(*) FROM run` / `run_event` before and after both probes is unchanged; (iii) `startEngine({ worker: true })` followed by `engine.http.ready()` reads 200/true; restart, before `startWorker`, reads 503/false; after `startWorker`, 200/true; (iv) the route-coverage assertion: every entry in `Routes` whose path begins with `/v1/ready` is exactly `Routes['GET /v1/ready']`, and its `responses` keys are exactly `{ 200, 503, 500 }`; (v) a test-only direct `startApi` whose readiness getter throws yields a schema-valid 500 `ErrorResponse` — the 500 arm, which is NOT proved by dropping unrelated run/event tables and must not couple readiness to database health. |
| `scripts/drift.mjs`, `tests/boundaries.test.ts`, workspace manifests             | **read-only**                | Why is no SDK package or boundary exception allowed in Slice 1? Slice 1 does NOT create `packages/sdk`, does NOT add a rule, and does NOT widen a `pathNot`. It amends existing rules' folder lists IF AND ONLY IF the readiness route forces it (it does not — the API gets one new `if` branch, not a new package). The drift script is read: its `--prove` cases import by relative path and by package name; adding `/v1/ready` to `Routes` does not add a new import shape, so no `--prove` case is added. `tests/boundaries.test.ts` reads `drift --audit` output and asserts no `DEAD` rule and the three intra-package rule names — Slice 1 touches no folder. The workspace manifests (`package.json`, `packages/reel-contract/package.json`, `apps/api/package.json`, `tests` and `apps/service`) are unchanged: no new dependency, no new devDependency, no new workspace link, no new `exports` map.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| PATH-only secrets tests, providers, database migrations, media                   | **deferred**                 | Why does a read-only route require none of them? The readiness handler is in `apps/api/src/server.ts`; `api-no-providers` and `processes-only-in-providers` (with `pathNot` `^packages/providers/`) forbid the API from touching a provider or starting a process — the new branch imports neither. No database read or write happens (the getter is in-memory). No migration: no new table, column, index or setting. No media: the response body is JSON, two fields, no file, no `path`. No secret read: the route carries no `Authorization` header, reads no environment, logs no setting.`reel-render`'s check 50 (the PATH-only secrets journey) and `reel-stills`' check 26 (its own) are read-only with respect to Slice 1. Paid-path's check 22 is read-only. The PATH-alone child in `tests/cutroom-sdk-readiness.test.ts` (if Slice 1 grew one) is out of scope: the prompt names this slice's tests as harness-driven, not path-alone, because readiness has no provider to read.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |

### Verified feature tests Slice 1 can turn red — exact list, with file/line evidence

The static impact review found **exactly one** verified test whose source Slice 1 forces to amend, plus an independent evidence question the prompt requires to be settled here:

1. **`tests/resume-failed-contract.test.ts` line 1325** — the one direct `startApi({ dbPath: service.dbPath })` call outside the engine harness. Adding a required `ready: () => boolean` to `ApiOptions` makes this call a TypeScript error. The amend is **compile-support only**: pass `ready: () => true`. The run it queries has already finished and the engine's own worker has stopped, so a constant `true` is correct for the lifetime of this test's API. No assertion is removed. Classified honestly under the repository's amendment precedent (`S-034`, `S-093`, `S-099`'s form): an amend to a verified test belongs to the feature that forces it, here `cutroom-sdk`. The Slice 4 re-journey list below names whether `resume-failed` reruns because of this amend.

**No other verified test will go red under Slice 1, by correction of the prior record:**

- **`tests/reel-plan-service.test.ts` check 13 (lines 66–179)** — the comprehensive route-coverage test. With `tests/stand-in/client.ts` and this file classified **read-only** for Slice 1 (rows 294 and 296 above), `EXPECTED` is not extended, the `Route` union and `routeOf` matcher are not widened, and check 13 does not probe `/v1/ready`. The check 13 500-block (lines 152–169) drops every run table; readiness does not depend on those tables, so proving the readiness 500 arm by dropping tables would couple readiness to database health, which the architecture forbids — the 500 arm is instead proved by a test-only direct `startApi` whose readiness getter throws (see row 296, point v).
- **`tests/reel-contract-shapes.test.ts`'s check 9 (line 455)** asserts the contract package's only runtime dependency is `zod`. Slice 1 adds no dependency.
- **`tests/reel-contract-shapes.test.ts`'s check 1 (line 318)** iterates `MESSAGES`. Slice 1 does NOT amend `tests/reel-contract-shapes.test.ts` (row 295 above is **read-only** in the corrected record); the readiness shape checks live in the new dedicated test. `reel-contract`'s own Slice 4 re-journey then runs its prior verified evidence unchanged.
- **`tests/reel-render-check-50`-style PATH-only children** are read-only with respect to Slice 1 (see "deferred" row above).
- **`tests/feature-files.test.ts`, `tests/line-endings.test.ts`, `tests/no-absolute-paths.test.ts`, `tests/context-file.test.ts`** are document-level scans; they read only files they already read. Slice 1 changes source under `packages/reel-contract/src/`, `apps/api/src/`, `apps/service/src/`, `tests/engine/`, and adds one test file under `tests/`. None of these paths violate the standing checks (line endings, no-absolute-paths, feature front-matter, context file).
- **`tests/boundaries.test.ts`** runs `drift`, `drift --prove`, and `drift --audit`; no rule touches the readiness route, so the tests hold.

### Re-journeys the full feature will require

The contract is amended at Version 1 (`D-106`, `S-034`, `S-093`, `S-099`'s form), which is the precedent for which journeys rerun. The corrected file impact gives the exact Slice 4 list:

- **`reel-contract` reruns.** `ReadyResponse` is a new exported schema from `@cutroom/reel-contract` and `Routes` gained an entry (`S-016`, `S-099`). The rerun verifies the public surface still parses and round-trips with the new export and route - the same reason every earlier contract V1 amendment reran `reel-contract`.
- **`reel-plan` does NOT rerun.** With `tests/reel-plan-service.test.ts` and `tests/stand-in/client.ts` classified read-only for Slice 1 (rows 294 and 296 above), neither the `EXPECTED` table nor the `Route` union nor `routeOf` is widened, and check 13 does not probe `/v1/ready`. `reel-plan`'s gates are not opened for a contract V1 amendment by another feature.
- **`resume-failed`'s rerun depends on the form of its amend.** The amend at `tests/resume-failed-contract.test.ts:1325` is **compile-support only** — adding `ready: () => true` to a bare-options `startApi({ dbPath })` call, with no assertion removed. By `S-093` and `S-099`'s form, a verified test's evidence changes when a feature rewrites assertions in that file. Adding a required option to one call site is not an evidence rewrite: the call still constructs the same engine, the test still proves what check 34 proves (the bare API's resume route is `422 unsupported`), and no assertion changes. **`resume-failed` does NOT rerun for Slice 1.** If a later session finds evidence that a strict reading of the precedent says otherwise, it must stop and ask the owner rather than silently widening the re-journey list — the prompt is explicit on this.
- **`reel-stills`, `reel-render`, `reel-takes`, `paid-path`, `paid-failures`, `second-ask`, `ask-again`, `cut-rules`, `three-pictures`** — Slice 1 touches none of their evidence files. None will go red (rows above); none is on the re-journey list.

**The re-journey list is exact:** the Slice 4 builder reruns **one** journey — `reel-contract`. Slice 2's boundary rules and `packages/sdk` may force additional reruns; the prompt says to re-evaluate in every later slice, which is repeated here as a rule for the Slice 2 builder.

### Slice 0 acceptance — checklist

- [x] Immutable baseline command (`node scripts/check.mjs --code`), duration (test step 1,476,701 ms), and commit (`019d2a9`).
- [x] Every `startApi(` caller named and classified (function definition plus three callers; one of the three is a bare-options caller that must be amended).
- [x] Each affected test has a concrete expected red condition, not merely a filename (see the "Verified feature tests Slice 1 can turn red" section above).
- [x] Contract / API / service / harness changes separated from deferred SDK / launcher / boundary work (the read-only and deferred rows make the boundary explicit).
- [x] Re-journey list is exact and evidenced (`reel-contract` only; `reel-plan` is excluded by the read-only classification, `resume-failed` is excluded by the compile-support form of its amend; per-feature file-level evidence given).
- [x] No runtime source, test behaviour, gate status, timeout, concurrency or feature Evidence/Divergence text changes were made — Slice 0 is a record only.

## Gate 4 — Slices (approved)

| slice                                 | deliverable                                                                                                                                                                                                                                              | proof before the next slice                                                                                                                                                                                              |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 0 — impact and baseline               | Run `test-impact` for the public-contract, API, service lifecycle, dependency-rule, workspace, and secrets checks; record the known `reel-render-secrets` load timeout without changing it. No full-suite rerun belongs to this planning/review session. | A written affected-check list, the exact re-journeys it requires, and the repository-required full green `check.mjs --code` before implementation; no SDK source. The current failure is not silently accepted as green. |
| 1 — readiness contract                | Add the minimal readiness schema, route typing, API readiness state, and contract/API checks. It is readable and false/non-ready until the worker is present.                                                                                            | Contract shapes round-trip; API checks show no row write and no premature ready response; amended `reel-contract` evidence names the addition.                                                                           |
| 2 — package boundary and typed routes | Create `packages/sdk` with its package metadata, project reference, single index entry, strict input/output validation, all current routes, and typed errors. Add and prove the narrow boundary rules.                                                   | SDK route tests pass against a stand-in; deliberate boundary breaks fail; full check green.                                                                                                                              |
| 3 — launcher lifecycle                | Add explicit launcher configuration, bounded readiness, port-race joining, ownership tracking, and stdin shutdown.                                                                                                                                       | Child-process integration tests prove both the existing-engine and absent-engine paths, the race, and close ownership; full check green.                                                                                 |
| 4 — journey and re-journeys           | Run a no-provider SDK journey with a stand-in service, append its generated evidence, and re-run the exact affected features that Slice 0's test-impact report named for the public-contract or lifecycle amendments.                                    | One generated result commit, the impact report's named journeys all PASS, clean tree, and a final full green check.                                                                                                      |

Each slice follows the approved builder arrangement: tests first, deliberate break and restoration, independent
diff review, full check, then one commit. A failure is recorded and stops the session. No slice begins before
the previous slice's full check is green.

### Slices built (newest first; ticked here after their full check is green)

- [x] **Slice 2 — package boundary and typed routes.** The new `packages/sdk` is the typed local client described in Gate 2 / Gate 3: a single `src/index.ts` exporting `createCutroom`, the `Cutroom` interface, and the three stable error shapes (`SdkApiError`, `SdkProtocolError`, `SdkConnectionError`); loopback URL normalisation with explicit rejection of HTTPS, remote hosts, credentials, paths, queries, fragments, and a missing port; `SubmitRequest` and `ResumeRequest` validated with the public contract schemas before fetch; every `runId` path segment and `requestId`/`since` query value URL-encoded once via `encodeURIComponent`; defined refusals (submit `409`/`422`, result/record `409`, resume `200`/`202`/`409`/`422`) returned as their parsed schema rather than thrown; `400`, `404`, `500` ErrorResponse bodies become `SdkApiError` with the schema-validated body and nothing else; unexpected status, malformed JSON, and wrong-schema bodies become `SdkProtocolError` with no wire bytes exposed; `close()` is local and rejects later calls with `SdkProtocolError { stage: 'request' }` without starting a process or sending a signal. The new `tests/cutroom-sdk-routes.test.ts` is the sole Slice 2 behaviour owner; `tests/workspace.test.ts` and `tests/boundaries.test.ts` prove the workspace and the import-boundary changes. The new boundary rule `sdk-no-engine-internals` (in `.dependency-cruiser.cjs`) forbids any `packages/sdk` import resolving under `apps/` or `packages/` other than `packages/sdk` itself and `packages/reel-contract`; `scripts/drift.mjs` gains eight `--prove` cases (five by relative path, three by package name) and the corresponding legal by-name case for `@cutroom/reel-contract`; `PACKAGE_FOLDERS` gains `packages/sdk` so the by-name probe links resolve. The root `tsconfig.json` references the new project, and `package.json` declares `@cutroom/sdk` as a workspace link.
      **Proves:** the seven test inventory items (public entry; every route's method/path/query/body/return schema; defined refusals as parsed returns; `SdkApiError` for schema-valid `400`/`404`/`500` with only the validated body; `SdkProtocolError` for malformed JSON, wrong-schema JSON, and unexpected status; invalid requests send zero calls, invalid base URLs are rejected, valid loopback origins normalize; `close()` rejects later calls locally). Eight deliberate breaks each take exactly one test red and are then restored: request validation-before-fetch (test `1. invalid SubmitRequest fails at the schema boundary`), `runId` encoding (test `2. status: a runId that needs encoding round-trips correctly`), the `409`-as-error misread (tests `3. submit 409`, `3. result 409`, `3. record 409`, `3. resume 200/202/409/422`), `ErrorResponse` parsing skipped (tests `4. 400 ErrorResponse`, `4. 404 ErrorResponse`, `4. 500 ErrorResponse`, `4. SdkApiError carries only the schema-validated body`), wrong-schema JSON swallowed (test `5. syntactically valid JSON that fails the route schema`), the `https://` URL allowed (test `6. invalid base URLs are rejected before any request is made`), and the closed-flag ignored (test `7. close() makes later calls reject locally`). The boundary rule is exercised end-to-end by adding a forbidden `import { tables } from '../../domain/src/index.ts'` to `packages/sdk/src/index.ts` — `node scripts/drift.mjs` exits with `sdk-no-engine-internals  packages/sdk/src/index.ts -> packages/domain/src/index.ts`, and `node scripts/drift.mjs --prove` proves the rule still fires on all eight cases after restore.

- [x] **Slice 1 — readiness contract.** `packages/reel-contract/src/ready.ts` exporting `ReadyResponse = z.union([ReadyTrue, ReadyFalse])`; the route entry `GET /v1/ready` with `{200, 503} -> ReadyResponse, 500 -> ErrorResponse`; re-export from the package index; `apps/api/src/server.ts` matches `/v1/ready` before run-route handling and captures `const ready = options.ready()` once; `apps/service/src/service.ts` flips `let ready = false` to `true` only after the awaited `startWorker` resolves; `tests/engine/harness.ts` declares the worker binding before `startApi` and passes `ready: () => worker !== undefined`, with `worker = undefined` set before replacement API startup and before awaited worker stop; `tests/resume-failed-contract.test.ts:1325` carries the compile-support `ready: () => true`; the new `tests/cutroom-sdk-readiness.test.ts` owns the shape checks, the route-coverage `satisfies Routes['GET /v1/ready']` literal, the direct-API no-write proofs, the single-getter evaluation proof, the throwing-getter 500 proof and the harness lifecycle proofs. **Proves:** both strict bodies parse and are rejected on extra/missing/wrong-version/non-boolean `ready`; the route entry has exactly 200/503/500; a direct `startApi` answers 503/false before the flip, 200/true after, writes no `run`/`run_event` row, and a getter that toggles each call cannot return 503/true or 200/false; a throwing getter returns a schema-valid 500; an engine with a worker reads 200, restarts to 503 before `startWorker`, then 200; `stopWorker` flips to 503 without restarting the API.
      `node scripts/check.mjs --code` PASS at this commit (test step 1413 s, every other step green).

## Adversarial review — 2026-09-28

All four gates are approved. The review first found four coupled gaps: creator ownership was inconsistent with
close behavior; readiness did not say exactly what its API returned or when it became true; launcher and typed-error
rules were underspecified; and the slice plan did not name the pre-code full-green requirement separately from this
planning session. The corrected gates now define creator-owned shutdown, the strict `GET /v1/ready` protocol,
explicit loopback/launcher/error rules, and the no-rerun-yet versus pre-code-green distinction. A second review
found the last port-race gap: a recognized `503` non-ready peer must be polled and joined, never replaced with a
second child. Gate 2 and Gate 3 approved after that wait/join-or-timeout state and its test were added.

## Owner-confirmed integration rule

KnowScroll supplies the SDK's stable engine program and argument vector whenever it expects the SDK to start
an absent engine (S-175). Distribution and the executable's location remain the orchestrator's concern; the
SDK's contract is the explicit `launcher` option, not this repository's source layout.

## Evidence (newest first; appended by the journey, never typed by hand)

## Divergence (the first broken boundary, or "none")

none
