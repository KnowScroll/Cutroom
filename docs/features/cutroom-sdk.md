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
