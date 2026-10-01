---
status: current
date: 2026-10-01
audience: operators and SDK consumers
---

# Using Cutroom

This guide covers everything currently intended for a person outside the implementation team to
try. Cutroom is a local engine, not a website: the engine and its consumer run on the same machine,
communicate over loopback HTTP, and return filesystem paths on that machine.

## Choose what you want to try

| Goal                                         |                              Cost | What it proves                                                                                       |
| -------------------------------------------- | --------------------------------: | ---------------------------------------------------------------------------------------------------- |
| Start the service and read readiness         |                              none | The checkout, settings, database migrations, ffmpeg, API, and worker can start.                      |
| Run the free service integration test        |                              none | A process-level stand-in run creates a complete synthetic MP4 and spends nothing.                    |
| Build and install the SDK tarballs elsewhere |                              none | An unrelated Node project can import the public runtime and types without Cutroom source resolution. |
| Connect through the SDK                      |                    none by itself | A consumer can submit, follow, inspect, cancel, and resume runs through the public contract.         |
| Make the repository's real reel              |        about 49–58 cents recently | The full paid path calls MiniMax and fal and creates a judged, narrated MP4.                         |
| Preview or resume a failed run               | preview is free; remake may spend | Cutroom can reuse kept work and remake only selected pieces.                                         |

The package and SDK checks are verification, not registry publication. Today, another user needs a
Cutroom checkout for the engine and either the checkout or copies of the two generated tarballs for
the SDK.

## Requirements

- Node.js 22.14 or newer.
- Corepack and the repository-pinned pnpm 10.15.1.
- ffmpeg and ffprobe 8.x on `PATH`.
- Git with the `steering-ref` submodule initialized.
- For a paid reel only: valid `MINIMAX_API_KEY` and `FAL_KEY` values.

From the repository root:

```bash
git submodule update --init
corepack pnpm install
node scripts/decisions.mjs --fetch
node scripts/drift.mjs
```

`pnpm` is not expected to be globally available; use `corepack pnpm` in every command.

## Try the local service for free

Start Cutroom with every provider left at its safe default, `fake`:

```bash
corepack pnpm service
```

The banner names the database, artifact folder, providers, rates, voice, and listening origin. It
must not print a secret. The default origin is `http://127.0.0.1:8787`.

Check readiness:

```bash
curl http://127.0.0.1:8787/v1/ready
```

Expected shape:

```json
{ "contractVersion": 1, "ready": true }
```

Stop with `Ctrl+C` or write a line containing `stop` to the process's standard input.

The default stand-in model is intentionally scripted rather than generative. With no
`CUTROOM_STAND_IN_SCRIPT`, the service can start and answer readiness, but it cannot invent the
planning and gate answers needed to finish a submitted reel. To exercise the already-verified free
end-to-end path, run its process-level test:

```bash
node --experimental-strip-types --test --test-concurrency=1 tests/paid-path-service.test.ts
```

That test starts the service as a separate process, gives its stand-ins a complete script, submits
a video run, and verifies the finished MP4, records, receipts, shutdown, and zero spend. Its files
live under an owned temporary directory and are removed when the test finishes.

## Build the public packages

From the Cutroom repository:

```bash
node scripts/package-sdk.mjs
```

The command replaces `.package-staging/` and produces:

```text
.package-staging/cutroom-reel-contract-1.0.0.tgz
.package-staging/cutroom-sdk-1.0.0.tgz
```

Both are standard npm-format ESM archives for Node 22.14 or newer. The contract archive depends on
`zod`; the SDK archive depends on `@cutroom/reel-contract` version `1.0.0`. They include JavaScript
and `.d.ts` files. They do not include providers, ffmpeg, a database, media, secrets, the engine, or
a launcher command.

## Install the SDK in another project

Copy both tarballs into the consumer's `vendor/` directory. A tested pnpm manifest looks like this:

```json
{
  "name": "cutroom-consumer",
  "private": true,
  "type": "module",
  "packageManager": "pnpm@10.15.1",
  "dependencies": {
    "@cutroom/reel-contract": "file:vendor/cutroom-reel-contract-1.0.0.tgz",
    "@cutroom/sdk": "file:vendor/cutroom-sdk-1.0.0.tgz"
  },
  "pnpm": {
    "overrides": {
      "@cutroom/reel-contract": "file:vendor/cutroom-reel-contract-1.0.0.tgz"
    }
  }
}
```

Install it:

```bash
corepack pnpm install --ignore-workspace
```

The override is required while the contract is distributed as a tarball rather than from a
registry: it satisfies the SDK's ordinary `@cutroom/reel-contract@1.0.0` dependency with the local
artifact.

CommonJS `require()` is not supported in v1. Use ESM `import` and Node 22.14 or newer.

## Connect to the engine

Join a service that is already running:

```js
import { createCutroom } from '@cutroom/sdk'

const cutroom = await createCutroom({
  baseUrl: 'http://127.0.0.1:8787',
})

try {
  console.log('connected to Cutroom')
} finally {
  await cutroom.close()
}
```

`baseUrl` must be an explicit loopback HTTP origin and port. Remote hosts, HTTPS, credentials,
paths, queries, fragments, and redirects are rejected.

To start the engine when no listener exists, supply an exact program and argument vector:

```js
import { createCutroom } from '@cutroom/sdk'

const cutroom = await createCutroom({
  baseUrl: 'http://127.0.0.1:8787',
  launcher: {
    command: process.execPath,
    args: [
      '--experimental-strip-types',
      '--no-warnings',
      '<CUTROOM_CHECKOUT>/apps/service/src/main.ts',
    ],
  },
  readyTimeoutMs: 30000,
})
```

Replace `<CUTROOM_CHECKOUT>` with the engine checkout's path. The SDK starts the command with
`shell: false`, inherits the caller's ordinary environment, and supplies `CUTROOM_API_PORT`. When
the SDK started the child, `close()` writes `stop` and waits for it. When it joined an existing
service, `close()` affects only the SDK handle.

## Submit and follow a run

The SDK validates the request before sending it and validates every response before returning it.
The request needs at least four narration sentences and an explicit positive budget in cents:

```js
const submission = await cutroom.submit({
  contractVersion: 1,
  requestId: 'demo-hurricane-001',
  worldId: 'demo-hurricane',
  narration: [
    { text: 'A hurricane begins above a warm tropical sea.', claimIds: ['c1'] },
    { text: 'Warm wet air rises and builds a tall storm cloud.', claimIds: ['c1'] },
    { text: 'More air moves inward and the storm begins to spin.', claimIds: ['c2'] },
    { text: 'The spinning storm forms a calm eye at its centre.', claimIds: ['c2'] },
  ],
  claims: [
    { id: 'c1', role: 'main' },
    { id: 'c2', role: 'main' },
  ],
  criteria: {
    mustShow: [
      {
        id: 'warm-sea',
        text: 'a storm cloud above a warm tropical sea',
        type: 'presence',
        claimId: 'c1',
      },
      {
        id: 'storm-eye',
        text: 'the calm eye at the centre of the storm',
        type: 'presence',
        claimId: 'c2',
      },
    ],
    mustNotShow: [
      {
        id: 'labels',
        text: 'letters, words, numbers, logos or watermarks',
        type: 'presence',
      },
    ],
    depictionPolicyVersion: 'demo-v1',
  },
  style: {
    id: 'realistic-footage',
    version: 1,
    text: 'realistic vertical documentary footage with natural light',
  },
  options: {
    until: 'video',
    budgetCents: 250,
  },
})

if (submission.outcome === 'refused') {
  console.error(submission.reason, submission.detail)
} else {
  const runId = submission.runId
  let since = 0

  while (true) {
    const page = await cutroom.follow(runId, since)
    for (const event of page.events) console.log(event)
    since = page.nextSince

    const status = await cutroom.status(runId)
    if (status.state === 'finished') break
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }

  console.log(await cutroom.result(runId))
  console.log(await cutroom.record(runId))
}
```

Use `until: 'plan'`, `'stills'`, or `'video'` to stop at each useful boundary. A completed video
result contains a local MP4 path, still paths, spend, estimate, and any degradations. Other terminal
results explain a budget refusal, rule stop, failure, or cancellation.

## Every public SDK operation

| Method                   | Use                                                                      |
| ------------------------ | ------------------------------------------------------------------------ |
| `submit(request)`        | Validate and submit one idempotent request.                              |
| `find(requestId)`        | Find the run associated with a caller's request ID.                      |
| `status(runId)`          | Read whether a run is still running or finished, including resume links. |
| `follow(runId, since?)`  | Read ordered events after a sequence number.                             |
| `result(runId)`          | Read the terminal result, or the current status while it is active.      |
| `record(runId)`          | Inspect the retained plan, pictures, takes, render, and receipts.        |
| `cancel(runId)`          | Request cancellation.                                                    |
| `resume(runId, request)` | Preview or submit a selective resume.                                    |
| `close()`                | Close the handle and, only when owned, stop the launched service.        |

After `close()`, every other method rejects locally. Errors are classified as `SdkApiError`,
`SdkProtocolError`, or `SdkConnectionError`; each exposes stable fields through the exported
`SdkError` union.

## Make a real reel

The repository's paid command is intentionally separate from the service command and from every
test. Put the provider keys in the gitignored `.env` file:

```dotenv
MINIMAX_API_KEY=replace-with-your-key
FAL_KEY=replace-with-your-key
```

Then run:

```bash
node --experimental-strip-types --no-warnings scripts/real-reel.mjs
```

The command prints its estimate and waits for the exact confirmation text it displays. No paid
adapter is constructed and no request is submitted before that confirmation. It then asks how to
handle any waiting runs, makes one fixed example reel, follows automatic recovery, and prints every
receipt, cost, and latency.

Recent completed runs cost roughly 49–58 cents, but provider behavior and retries can change a
particular run. The hard command ceiling is 250 cents, below the repository's 300-cent per-reel
cap. Read [reel-pitfalls.md](reel-pitfalls.md) before changing the example brief: sentence and
criterion wording materially affect acceptance.

The current paid command contains one example brief rather than a general-purpose CLI argument for
arbitrary briefs. A separate product or consumer should submit its own request through the SDK.

## Preview or resume a failed run

Previewing is free:

```bash
node --experimental-strip-types --no-warnings scripts/real-reel.mjs --resume <runId>
```

The command shows which work can be reused and prints the resume estimate before asking for the
exact confirmation. To force selected work to be remade:

```bash
node --experimental-strip-types --no-warnings scripts/real-reel.mjs \
  --resume <runId> \
  --remake still:shot-1
```

The public SDK exposes the same operation by passing `{ contractVersion: 1, preview: true }` to
`resume(runId, request)` for a preview, then omitting `preview` to submit. The contract declarations
define the accepted remake selectors.

## Service settings

Settings may be exported in the process environment or placed in `.env`. An already-exported
value wins over the file. Do not commit `.env`.

The default for every provider is `fake`. Real adapter selections are:

```dotenv
CUTROOM_PROVIDER_MODEL=minimax
CUTROOM_PROVIDER_IMAGE=fal
CUTROOM_PROVIDER_SENSOR=local
CUTROOM_PROVIDER_VIDEO=fal
CUTROOM_PROVIDER_NARRATION=minimax
CUTROOM_NARRATION_VOICE=replace-with-an-admitted-minimax-voice
```

Provider keys are `MINIMAX_API_KEY` and `FAL_KEY`. The service refuses invalid adapter names,
missing required keys, an inadmissible image model, or an unsafe lease before opening the database
or claiming a job.

Operational settings include:

- `CUTROOM_API_PORT` — loopback port, default `8787`; use `0` for an OS-assigned port.
- `CUTROOM_DB_PATH` — SQLite file, default `data/cutroom.sqlite`.
- `CUTROOM_ARTIFACT_ROOT` — generated media root, default `.artifacts/`.
- `CUTROOM_ENV_FILE` — environment file, default `.env`.
- `CUTROOM_STAND_IN_SCRIPT` — scripted answers for fake providers.
- `CUTROOM_PICTURES` — which planned subjects receive pictures.
- `CUTROOM_RESUME_DELAY_MS` — delay before automatic recovery of eligible provider failures.
- `CUTROOM_LEASE_MS` and `CUTROOM_LEASE_FLOOR_MS` — advanced worker lease controls.
- `CUTROOM_MINIMAX_BASE_URL`, `CUTROOM_FAL_BASE_URL`, and
  `CUTROOM_FAL_STORAGE_BASE_URL` — transport endpoints, primarily for recorded-wire tests.

Generated paths are configurable but never committed. The defaults live inside the checkout and
are ignored by Git.

## What you cannot do yet

- Install either package from npm or another registry.
- Install the engine as a binary, operating-system service, container, or desktop application.
- Connect to an engine on another host; v1 is deliberately loopback-only.
- Use CommonJS or Node older than 22.14.
- Ask the repository's paid CLI for an arbitrary brief without editing or writing a consumer.
- Use Cutroom as the broader interactive “Claude Code for video” product; this repository is its
  reel engine.
- Expect every provider run to complete: gates can stop unsuitable output, and provider or network
  failures are preserved as explicit run results.

The next planned reliability feature is `self-heal`. See [STATUS.md](STATUS.md) for the queue and
[context.md](context.md) for exact evidence.
