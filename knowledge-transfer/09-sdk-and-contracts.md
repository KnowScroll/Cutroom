# 09 — The SDK and contracts

This document explains the two packages an external consumer can depend on:
`@cutroom/reel-contract` and `@cutroom/sdk`. The first is the contract; the second is the
typed client.

## The public surface

A consumer installs **two packages** — `@cutroom/reel-contract` (the types) and `@cutroom/sdk`
(the client). Neither imports the engine's internals. The engine is not on npm.

The contract is version `1`. Changing it is gated and reviewed (`docs/features/reel-contract.md`).
The SDK is version `1.0.0`. Both are ESM packages with TypeScript declarations for Node
`22.14` or newer.

Build with:

```
node scripts/package-sdk.mjs
```

This produces two gitignored tarballs in `.package-staging/`:
- `.package-staging/cutroom-reel-contract-1.0.0.tgz`
- `.package-staging/cutroom-sdk-1.0.0.tgz`

## `@cutroom/reel-contract`

`packages/reel-contract/src/`. The leaf of the system — it imports nothing from the engine.

Files:

- `request.ts`: `SubmitRequest`, `ResumeRequest`, `Piece`.
- `responses.ts`: `SubmitResponse`, `ResumeResponse`, `RunResult`, `RunStatus`,
  `RunRecord`, `EventsPage`, `ErrorResponse`.
- `events.ts`: every `RunEvent` (`stage.started`, `stage.finished`, `verdict`, `degraded`,
  `run.accepted`, `run.finished`).
- `record.ts`: `RunRecord`, with every picture, take and receipt.
- `routes.ts`: the routes table — `/v1/runs`, `/v1/runs/:runId`,
  `/v1/runs/:runId/events`, `/v1/runs/:runId/result`, `/v1/runs/:runId/record`,
  `/v1/runs/:runId/cancel`, `/v1/runs/:runId/resume`, `/v1/ready`.
- `ready.ts`: `ReadyResponse` (`{ contractVersion: 1, ready: true | false }`).
- `errors.ts`: the error response shape.
- `version.ts`: `CONTRACT_VERSION` (`1`).

Every type's `.safeParse` is exported alongside it. The same schemas are used by the API
server and the SDK to validate both sides of the boundary, so a body that is valid in the
SDK is the same body the API accepts.

### Submitting a brief

`SubmitRequest`:

```ts
{
  contractVersion: 1,
  requestId: string,
  style: 'feature' | 'still' | '…',
  claims: { id: string, text: string }[],
  narration: { text: string, claimIds: string[] }[],
  criteria: { mustShow: Criterion[], mustNotShow: Criterion[] },
  options: {
    budgetCents: number,        // caller's ceiling
    until: 'plan' | 'stills' | 'video',
    planVaryOn?: 'shotCount',
  },
}
```

### Reading the result

The responses are typed unions. `RunStatus` is the same for any run, finished or running;
`RunResult` is the discriminated result kind. `RunRecord` is the full audit trail.

`RunStatus` carries `resumes` (the run this one resumes) and `resumedBy` (the run that
resumes this one), each absent on a run it does not apply to. Both are read from the rows
each time, so they are never stale.

## `@cutroom/sdk`

`packages/sdk/src/`. Imports `@cutroom/reel-contract` only. The private `launcher.ts` may
spawn a process.

### Creating a handle

```ts
import { createCutroom } from '@cutroom/sdk'

const cutroom = await createCutroom({
  baseUrl: 'http://127.0.0.1:8787',  // default
  launcher: {                        // optional; used only if no engine is listening
    command: 'node',
    args: ['--experimental-strip-types', '--no-warnings', 'apps/service/src/main.ts'],
  },
  readyTimeoutMs: 30_000,            // default 30 s
})
```

`baseUrl` is validated at construction: loopback only (`127.0.0.1`, `[::1]`, or `localhost`),
explicit port, no credentials, no path, no query string, no fragment, `http:` (not `https:`).
A non-loopback host, an HTTPS URL, a missing port or a path all throw `TypeError` before any
HTTP request exists (S-111, S-173, D-098).

The handle is **joined** if an engine was already listening at `baseUrl`, or **owned** if the
SDK started one itself. The distinction matters at `close()`:

- `joined` → `close()` is local-only. The engine continues running.
- `owned` → `close()` writes `stop` on the child's stdin and waits for its exit.

`close()` is idempotent. After `close()`, every other method throws `SdkProtocolError { stage:
'request' }` and no HTTP request is made.

### Methods

| Method                                                | Route                                              | Returns                                |
| ----------------------------------------------------- | -------------------------------------------------- | -------------------------------------- |
| `submit(request)`                                     | `POST /v1/runs`                                    | `SubmitResponse`                       |
| `find(requestId)`                                     | `GET /v1/runs?requestId=`                          | `RunStatus`                             |
| `status(runId)`                                       | `GET /v1/runs/:runId`                              | `RunStatus`                            |
| `follow(runId, since?)`                                | `GET /v1/runs/:runId/events?since=`                | `EventsPage`                            |
| `result(runId)`                                       | `GET /v1/runs/:runId/result`                       | `RunResult | RunStatus` (409 if active) |
| `record(runId)`                                       | `GET /v1/runs/:runId/record`                       | `RunRecord | RunStatus` (409 if active) |
| `cancel(runId)`                                       | `POST /v1/runs/:runId/cancel`                      | `RunStatus`                            |
| `resume(runId, request)`                              | `POST /v1/runs/:runId/resume`                      | `ResumeResponse`                        |
| `close()`                                              | —                                                  | —                                       |

The `runId` and `requestId` are URL-encoded once. `since` is `encodeURIComponent(String(since))`.

The schema for the body (`SubmitRequest`, `ResumeRequest`) is `.safeParse`'d on the SDK side
before fetch. A body that fails validation throws `SdkProtocolError { stage: 'request' }` —
no HTTP request is made.

### Error model

```ts
type SdkError = SdkApiError | SdkProtocolError | SdkConnectionError

type SdkApiError = { kind: 'api', status: number, body: ErrorResponse }
type SdkProtocolError = { kind: 'protocol', status?: number, stage: 'ready' | 'request' }
type SdkConnectionError = {
  kind: 'connection',
  stage: 'connect' | 'start' | 'ready' | 'close',
}
```

- **`SdkApiError`** is a `400`, `404`, `500`-class response that the server returned with a
  schema-valid `ErrorResponse`. The body is the parsed error; nothing else from the wire is
  exposed.
- **`SdkProtocolError`** is an unexpected HTTP status, malformed JSON, or a body that fails
  the expected schema for the route and status. The wire body is dropped.
- **`SdkConnectionError`** is thrown when:
  - `stage: 'connect'` — no listener and no launcher.
  - `stage: 'start'` — the child errored or exited before it became ready, with no eligible
    winner at the port.
  - `stage: 'ready'` — readiness deadline reached while polling a non-ready peer, or
    while waiting for a port-race winner.
  - `stage: 'close'` — failure while closing an owned child.

`SdkProtocolError { stage: 'request' }` is also thrown after `close()`.

### Readiness — `GET /v1/ready`

The API's `GET /v1/ready` returns `200 { contractVersion: 1, ready: true }` when the worker
has completed startup, `503 { contractVersion: 1, ready: false }` before (cutroom-sdk,
S-173). The API calls the readiness getter once per request, captures the result, and uses
the captured value for both status and body — so a getter whose answer changes between
calls cannot return 503 with `ready: true` or 200 with `ready: false`.

The SDK validates `ReadyResponse` strictly on every poll. A 200 with `ready: false`, an extra
key, a wrong version or malformed JSON is `SdkProtocolError { stage: 'ready' }` — the SDK
never falls back to a 503 with `ready: false`. A 503 with `ready: true`, an extra key, a
wrong version or malformed JSON is also `SdkProtocolError`.

### The launcher

`launcher.ts` is the only place a child process is started. The SDK does not depend on
`@cutroom/worker` or any internal module. The launcher is called with:

```ts
launcherOptions = {
  command,                          // from `options.launcher.command`
  args,                             // from `options.launcher.args`
  env: { CUTROOM_API_PORT: '8787' }, // SDK-owned override; everything else inherits
  baseUrl,
  timeoutMs,                        // from `options.readyTimeoutMs`
}
```

The child is started with `shell: false`. `CUTROOM_API_PORT` is the only environment value
the SDK injects — the SDK does not inspect or log individual environment values.

The SDK's "port-race winner" handling: when the child exits before ready, the SDK re-probes
the port — if a valid engine is now listening there (because another consumer raced and won
that port), the SDK returns a handle that points at it. This is what makes the launcher
idempotent across concurrent consumers.

### Example flow

```ts
import { createCutroom, type SubmitRequest } from '@cutroom/sdk'

const cutroom = await createCutroom({
  launcher: {
    command: 'node',
    args: ['--experimental-strip-types', '--no-warnings', 'apps/service/src/main.ts'],
  },
})

const submit: SubmitRequest = {
  contractVersion: 1,
  requestId: 'demo-001',
  style: 'feature',
  claims: [
    { id: 'a', text: 'A bee visits a flower.' },
    { id: 'b', text: 'The bee collects nectar.' },
  ],
  narration: [
    { text: 'A bee visits a flower.', claimIds: ['a'] },
    { text: 'The bee collects nectar.', claimIds: ['b'] },
  ],
  criteria: { mustShow: [], mustNotShow: [] },
  options: { budgetCents: 250, until: 'video' },
}

const accepted = await cutroom.submit(submit)
// accepted: { contractVersion: 1, outcome: 'accepted', requestId, runId, replayed: false }

// Follow events until finished.
let last = 0
while (true) {
  const page = await cutroom.follow(accepted.runId, last)
  for (const ev of page.events) console.log(ev.seq, ev.type, ev)
  last = page.nextSince
  const status = await cutroom.status(accepted.runId)
  if (status.state === 'finished') break
  await new Promise((r) => setTimeout(r, 500))
}

const result = await cutroom.result(accepted.runId)
const record = await cutroom.record(accepted.runId)

await cutroom.close()
```

`@cutroom/reel-contract` is the source of the type imports. The SDK never imports from
`@cutroom/contracts`, `@cutroom/domain`, `@cutroom/pipeline` or `@cutroom/providers`.