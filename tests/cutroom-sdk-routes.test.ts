import assert from 'node:assert/strict'
import {
  CONTRACT_VERSION,
  EventsPage,
  ResumeRequest,
  RunRecord,
  RunResult,
  RunStatus,
  SubmitRequest,
} from '@cutroom/reel-contract'
import { afterEach, test } from 'node:test'
import {
  createCutroom,
  type CreateCutroomOptions,
  type Cutroom,
  type SdkApiError,
  type SdkConnectionError,
  type SdkError,
  type SdkProtocolError,
} from '@cutroom/sdk'
import type { AddressInfo } from 'node:net'
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'

// cutroom-sdk, Slice 2 — the typed local client and its import boundary
// (docs/features/cutroom-sdk.md, Gate 2 / Slice 2; S-173, S-175). The stand-in engine below
// is the single owner of every SDK behavior named in the Slice 2 inventory: it records
// requests, replies with a scripted status/body pair, never starts a real service, worker,
// provider, database or child process. The import boundary itself is owned by
// `tests/boundaries.test.ts`, which runs `drift`, `drift --prove`, and `drift --audit`.

const V = CONTRACT_VERSION

// ---------------------------------------------------------------- the stand-in

/**
 * One scripted reply, with the optional request-shape checks the slice cares about: the
 * method, the path (regex over the raw path string), the parsed query, and an optional
 * JSON body that the request must carry.
 */
type Script = {
  status: number
  body: unknown
  expect?: {
    method?: string
    path?: RegExp
    body?: unknown
    /** When present, every recorded header matching this name must equal this value. */
    header?: { name: string; value: string }
  }
}

type Recorded = {
  method: string
  rawPath: string
  query: URLSearchParams
  body: unknown
  headers: Record<string, string | string[] | undefined>
}

/**
 * A small HTTP server bound to an ephemeral loopback port. It returns the next scripted
 * reply (FIFO) on every request, records what arrived, and exposes `received()` so the
 * tests can assert the SDK made the request the slice said it would. The stand-in never
 * makes an HTTP request of its own — no real engine, no real worker — so it cannot
 * accidentally exercise any engine code path the slice forbids.
 */
class StandIn {
  readonly server: Server
  readonly scripts: Script[] = []
  private readonly recorded: Recorded[] = []
  baseUrl: string = ''

  constructor() {
    this.server = createServer((req, res) => {
      void this.handle(req, res)
    })
  }

  script(reply: Script): this {
    this.scripts.push(reply)
    return this
  }

  received(): Recorded[] {
    return [...this.recorded]
  }

  /** Bind to an ephemeral port on the loopback interface and resolve when listening. */
  start(): Promise<void> {
    return new Promise((resolveStart) => {
      // Bind on the unspecified IPv6 address `::`, which on every supported Node version
      // also accepts IPv4 connections when the host resolves to both `::1` and `127.0.0.1`.
      // That makes `localhost` work the same way `127.0.0.1` does on this machine.
      this.server.listen(0, '::', () => resolveStart())
    })
  }

  stop(): Promise<void> {
    return new Promise((resolveStop, rejectStop) => {
      this.server.close((err) => (err ? rejectStop(err) : resolveStop()))
    })
  }

  /** Set `baseUrl` after `start()` — the port is only known once the OS has assigned it. */
  baseUrlOf(): string {
    const address = this.server.address()
    if (address === null || typeof address === 'string') {
      throw new Error('stand-in server has no ephemeral port assigned')
    }
    const info = address as AddressInfo
    return `http://127.0.0.1:${info.port}`
  }

  /** Like `baseUrlOf` but for tests that bind on a non-default address (e.g. `::1`). */
  baseUrlFor(host: string): string {
    const address = this.server.address()
    if (address === null || typeof address === 'string') {
      throw new Error('stand-in server has no ephemeral port assigned')
    }
    const info = address as AddressInfo
    return `http://${host}:${info.port}`
  }

  private async handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    // Slice 3 construction probes readiness before returning a route-capable handle. Keep this
    // handshake outside the Slice 2 FIFO and request log so every existing route assertion still
    // owns exactly one route request.
    if (req.method === 'GET' && req.url === '/v1/ready') {
      res.statusCode = 200
      res.setHeader('content-type', 'application/json')
      res.end(JSON.stringify({ contractVersion: V, ready: true }))
      return
    }

    const chunks: Buffer[] = []
    for await (const chunk of req) chunks.push(chunk as Buffer)
    const raw = Buffer.concat(chunks).toString('utf8')
    let parsed: unknown
    if (raw.length > 0) {
      try {
        parsed = JSON.parse(raw)
      } catch {
        parsed = raw
      }
    }

    const url = req.url ?? '/'
    const queryIndex = url.indexOf('?')
    const rawPath = queryIndex === -1 ? url : url.slice(0, queryIndex)
    const queryString = queryIndex === -1 ? '' : url.slice(queryIndex + 1)
    const query = new URLSearchParams(queryString)

    const headers: Record<string, string | string[] | undefined> = {}
    for (const [name, value] of Object.entries(req.headers)) headers[name] = value

    this.recorded.push({
      method: req.method ?? '',
      rawPath,
      query,
      body: parsed,
      headers,
    })

    const reply = this.scripts.shift()
    if (reply === undefined) {
      res.statusCode = 599
      res.end()
      return
    }

    if (reply.expect?.header !== undefined) {
      const got = headers[reply.expect.header.name.toLowerCase()]
      assert.equal(
        got,
        reply.expect.header.value,
        `stand-in: header ${reply.expect.header.name} expected ${reply.expect.header.value}, got ${String(got)}`,
      )
    }
    if (reply.expect?.body !== undefined) {
      assert.deepEqual(
        parsed,
        reply.expect.body,
        `stand-in: request body did not match; got ${JSON.stringify(parsed)}`,
      )
    }

    res.statusCode = reply.status
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify(reply.body))
  }
}

// ---------------------------------------------------------------- helpers

/** A minimal valid `SubmitRequest`. The values are not meaningful; the schema is the test. */
function makeSubmitRequest(extra: Record<string, unknown> = {}): SubmitRequest {
  return SubmitRequest.parse({
    contractVersion: V,
    requestId: 'req-test',
    worldId: 'world-test',
    narration: [
      { text: 'Sentence one with claims.', claimIds: ['c1'] },
      { text: 'Sentence two with claims.', claimIds: ['c1'] },
      { text: 'Sentence three with claims.', claimIds: ['c1'] },
      { text: 'Sentence four with claims.', claimIds: ['c1'] },
    ],
    claims: [{ id: 'c1', role: 'main' }],
    criteria: {
      mustShow: [{ id: 'm1', text: 'present', type: 'presence', claimId: 'c1' }],
      mustNotShow: [{ id: 'm2', text: 'absent', type: 'presence' }],
      depictionPolicyVersion: 'v1',
    },
    style: { id: 's', version: 1, text: 'plain' },
    options: { until: 'video', budgetCents: 100 },
    ...extra,
  })
}

/** A minimal valid `ResumeRequest`. */
function makeResumeRequest(): ResumeRequest {
  return ResumeRequest.parse({ contractVersion: V, remake: [] })
}

/** A minimal `RunStatus` for `find`, `status`, `cancel`, and the `result`/`record` 409 arm. */
function makeRunStatus(): RunStatus {
  return {
    contractVersion: V,
    runId: 'run-1',
    requestId: 'req-1',
    state: 'running',
    lastSeq: 0,
  }
}

/** A minimal `EventsPage` for `follow`. */
function makeEventsPage(): EventsPage {
  return {
    contractVersion: V,
    runId: 'run-1',
    events: [],
    nextSince: 0,
  }
}

/** A minimal `RunResult` (the `plan` completion arm) for the `result` 200 case. */
function makeRunResult(): RunResult {
  return {
    contractVersion: V,
    runId: 'run-1',
    requestId: 'req-1',
    costCents: 0,
    status: 'completed',
    until: 'plan',
    estimateCents: 0,
  }
}

/** A minimal `RunRecord` for the `record` 200 case. */
function makeRunRecord(): RunRecord {
  return {
    contractVersion: V,
    runId: 'run-1',
    pictures: [],
    takes: [],
    degradations: [],
  }
}

// ---------------------------------------------------------------- shared fixtures

let standIn: StandIn
let client: Cutroom

afterEach(async () => {
  await client?.close().catch(() => undefined)
  client = undefined as unknown as Cutroom
  if (standIn !== undefined) await standIn.stop()
  standIn = undefined as unknown as StandIn
})

async function newClient(): Promise<Cutroom> {
  standIn = new StandIn()
  await standIn.start()
  client = await createCutroom({ baseUrl: standIn.baseUrlOf() })
  return client
}

// ---------------------------------------------------------------- 1. public surface

test('1. the public entry exports every method, every error type, and the handle interface', () => {
  // Compile-time check that the public surface is intact. Every required public export is
  // named in the literal type below; removing any of them makes this file stop compiling,
  // which is what the public-surface proof requires. The runtime assertions then pin the
  // error kinds/stages the contract promises and reject any future drift that drops an
  // error field, an error kind, or an error stage.
  const api: {
    createCutroom: typeof createCutroom
    options: CreateCutroomOptions
    handle: Cutroom
    SdkApiError: SdkApiError['kind']
    SdkProtocolError: SdkProtocolError['stage']
    SdkConnectionError: SdkConnectionError['stage']
    SdkError: SdkError['kind']
  } = {
    createCutroom,
    options: {},
    handle: undefined as unknown as Cutroom,
    SdkApiError: 'api',
    SdkProtocolError: 'request',
    SdkConnectionError: 'connect',
    SdkError: 'protocol',
  }
  assert.equal(typeof api.createCutroom, 'function')
  assert.equal(api.SdkApiError, 'api')
  assert.equal(api.SdkProtocolError, 'request')
  assert.equal(api.SdkConnectionError, 'connect')
  assert.equal(api.SdkError, 'protocol')
})

test('1. invalid SubmitRequest fails at the schema boundary and sends zero calls', async () => {
  await newClient()
  // Three requests enqueued so any "phantom" fetch by the SDK would be visible at the end.
  standIn.script({ status: 202, body: {} })
  standIn.script({ status: 202, body: {} })
  standIn.script({ status: 202, body: {} })

  // `narration` is min(4); three sentences is too few. The SDK must refuse this at the
  // schema boundary, BEFORE the stand-in sees a request, because the value is in fact
  // invalid under `SubmitRequest`. We build the bad payload directly (rather than parsing
  // it ourselves) so the test exercises the SDK's own schema rejection.
  const tooFew = {
    contractVersion: V,
    requestId: 'req-bad',
    worldId: 'world-bad',
    narration: [
      { text: 'one', claimIds: ['c1'] },
      { text: 'two', claimIds: ['c1'] },
      { text: 'three', claimIds: ['c1'] },
    ],
    claims: [{ id: 'c1', role: 'main' }],
    criteria: {
      mustShow: [{ id: 'm1', text: 'present', type: 'presence', claimId: 'c1' }],
      mustNotShow: [],
      depictionPolicyVersion: 'v1',
    },
    style: { id: 's', version: 1, text: 'plain' },
    options: { until: 'video', budgetCents: 100 },
  } as unknown as SubmitRequest
  await assert.rejects(
    client.submit(tooFew),
    (err: unknown) =>
      err instanceof Error && 'kind' in err && (err as { kind: string }).kind === 'protocol',
  )
  assert.equal(
    standIn.received().length,
    0,
    `invalid SubmitRequest sent ${standIn.received().length} requests; expected 0`,
  )
})

test('1. invalid ResumeRequest fails at the schema boundary and sends zero calls', async () => {
  await newClient()
  standIn.script({ status: 202, body: {} })
  standIn.script({ status: 202, body: {} })

  // A `Piece.kind` outside its closed enum — the schema is strict and refuses the value.
  const bad = {
    contractVersion: V,
    remake: [{ kind: 'audio', shot: 'shot-1' }],
  }
  await assert.rejects(client.resume('run-x', bad as unknown as ResumeRequest))
  assert.equal(standIn.received().length, 0)
})

// ---------------------------------------------------------------- 2. happy paths

test('2. submit: POST /v1/runs, JSON body, parsed SubmitResponse (202 accepted)', async () => {
  await newClient()
  const request = makeSubmitRequest()
  standIn.script({
    status: 202,
    body: {
      contractVersion: V,
      outcome: 'accepted',
      requestId: 'req-test',
      runId: 'run-1',
      replayed: false,
    },
    expect: {
      method: 'POST',
      path: /^\/v1\/runs$/,
      header: { name: 'content-type', value: 'application/json' },
    },
  })

  const reply = await client.submit(request)
  assert.equal(reply.outcome, 'accepted')
  if (reply.outcome === 'accepted') {
    assert.equal(reply.runId, 'run-1')
    assert.equal(reply.replayed, false)
  }

  const recorded = standIn.received()
  assert.equal(recorded.length, 1)
  const first = recorded[0] as Recorded
  assert.equal(first.method, 'POST')
  assert.equal(first.rawPath, '/v1/runs')
  // Every key the contract requires is round-tripped; no extra field is dropped, none is
  // added.
  assert.deepEqual(first.body, JSON.parse(JSON.stringify(request)))
})

test('2. find: GET /v1/runs?requestId= with the value URL-encoded once', async () => {
  await newClient()
  standIn.script({
    status: 200,
    body: makeRunStatus(),
    expect: { method: 'GET', path: /^\/v1\/runs$/ },
  })

  const status = await client.find('req with space/and?query')
  assert.equal(status.runId, 'run-1')

  const recorded = standIn.received()
  assert.equal(recorded.length, 1)
  const first = recorded[0] as Recorded
  assert.equal(first.method, 'GET')
  assert.equal(first.rawPath, '/v1/runs')
  // The exact encoding: space, slash and question mark are all escaped, the question
  // mark does NOT split the path because it is inside the encoded value.
  assert.equal(first.query.get('requestId'), 'req with space/and?query')
})

test('2. status: GET /v1/runs/:runId with the runId URL-encoded once', async () => {
  await newClient()
  standIn.script({
    status: 200,
    body: makeRunStatus(),
    expect: { method: 'GET', path: /^\/v1\/runs\/run-1$/ },
  })

  const status = await client.status('run-1')
  assert.equal(status.runId, 'run-1')

  const recorded = standIn.received()
  const first = recorded[0] as Recorded
  assert.equal(first.rawPath, '/v1/runs/run-1')
  // Plain runIds are unescaped; the encoded character round-trip is exercised in the next test.
})

test('2. status: a runId that needs encoding round-trips correctly', async () => {
  await newClient()
  standIn.script({
    status: 200,
    body: { ...makeRunStatus(), runId: 'r/1' },
    expect: { method: 'GET', path: /^\/v1\/runs\/r%2F1$/ },
  })

  const status = await client.status('r/1')
  assert.equal(status.runId, 'r/1')

  const recorded = standIn.received()
  const first = recorded[0] as Recorded
  assert.equal(first.rawPath, '/v1/runs/r%2F1')
})

test('2. follow: GET /v1/runs/:runId/events, optional since query, encoded runId', async () => {
  await newClient()
  standIn.script({
    status: 200,
    body: makeEventsPage(),
    expect: { method: 'GET', path: /^\/v1\/runs\/run-1\/events$/ },
  })

  const page = await client.follow('run-1')
  assert.equal(page.runId, 'run-1')
  const first = standIn.received()[0] as Recorded
  assert.equal(first.query.size, 0, 'follow without `since` carries no query')

  standIn.script({
    status: 200,
    body: makeEventsPage(),
    expect: { method: 'GET', path: /^\/v1\/runs\/run-1\/events$/ },
  })
  await client.follow('run-1', 7)
  const second = standIn.received()[1] as Recorded
  assert.equal(second.query.get('since'), '7')
})

test('2. result: GET /v1/runs/:runId/result returns RunResult on 200', async () => {
  await newClient()
  standIn.script({
    status: 200,
    body: makeRunResult(),
    expect: { method: 'GET', path: /^\/v1\/runs\/run-1\/result$/ },
  })

  const out = await client.result('run-1')
  assert.ok(out !== null && typeof out === 'object' && 'status' in out)
  if ('status' in out && out.status === 'completed') {
    assert.equal(out.until, 'plan')
  } else {
    assert.fail('expected RunResult with status="completed"')
  }
})

test('2. record: GET /v1/runs/:runId/record returns RunRecord on 200', async () => {
  await newClient()
  standIn.script({
    status: 200,
    body: makeRunRecord(),
    expect: { method: 'GET', path: /^\/v1\/runs\/run-1\/record$/ },
  })

  const out = await client.record('run-1')
  assert.equal(out.runId, 'run-1')
  if ('takes' in out) {
    assert.deepEqual(out.takes, [])
  } else {
    assert.fail('expected RunRecord with a takes array')
  }
})

test('2. cancel: POST /v1/runs/:runId/cancel returns RunStatus on 200', async () => {
  await newClient()
  standIn.script({
    status: 200,
    body: { ...makeRunStatus(), state: 'finished' },
    expect: { method: 'POST', path: /^\/v1\/runs\/run-1\/cancel$/ },
  })

  const status = await client.cancel('run-1')
  assert.equal(status.state, 'finished')
})

test('2. resume: POST /v1/runs/:runId/resume with JSON body, parsed ResumeResponse (202 accepted)', async () => {
  await newClient()
  const request = makeResumeRequest()
  standIn.script({
    status: 202,
    body: {
      contractVersion: V,
      outcome: 'accepted',
      runId: 'run-2',
      resumes: 'run-1',
      replayed: false,
    },
    expect: {
      method: 'POST',
      path: /^\/v1\/runs\/run-1\/resume$/,
      header: { name: 'content-type', value: 'application/json' },
    },
  })

  const reply = await client.resume('run-1', request)
  assert.equal(reply.outcome, 'accepted')

  const recorded = standIn.received()
  const first = recorded[0] as Recorded
  assert.equal(first.method, 'POST')
  assert.equal(first.rawPath, '/v1/runs/run-1/resume')
  assert.deepEqual(first.body, JSON.parse(JSON.stringify(request)))
})

// ---------------------------------------------------------------- 3. defined refusals

test('3. submit 409 is a parsed SubmitResponse (refused), never an error', async () => {
  await newClient()
  standIn.script({
    status: 409,
    body: {
      contractVersion: V,
      outcome: 'refused',
      requestId: 'req-1',
      reason: 'conflict',
      detail: 'dup',
    },
  })
  const reply = await client.submit(makeSubmitRequest())
  assert.equal(reply.outcome, 'refused')
  if (reply.outcome === 'refused') {
    assert.equal(reply.reason, 'conflict')
    assert.equal(reply.detail, 'dup')
  }
})

test('3. submit 422 is a parsed SubmitResponse (refused), never an error', async () => {
  await newClient()
  standIn.script({
    status: 422,
    body: { contractVersion: V, outcome: 'refused', reason: 'invalid', detail: 'shape' },
  })
  const reply = await client.submit(makeSubmitRequest())
  assert.equal(reply.outcome, 'refused')
  if (reply.outcome === 'refused') assert.equal(reply.reason, 'invalid')
})

test('3. result 409 is RunStatus (the still-running refusal), not RunResult', async () => {
  await newClient()
  standIn.script({
    status: 409,
    body: { ...makeRunStatus(), state: 'running' },
  })
  const out = await client.result('run-1')
  // The discriminated tag the caller uses to tell the two cases apart: 409 has no
  // `status`, only `state`.
  assert.ok(!('status' in out))
  assert.equal(out.state, 'running')
})

test('3. record 409 is RunStatus (the still-running refusal), not RunRecord', async () => {
  await newClient()
  standIn.script({
    status: 409,
    body: makeRunStatus(),
  })
  const out = await client.record('run-1')
  assert.ok(!('pictures' in out))
  assert.equal(out.runId, 'run-1')
})

test('3. resume 200, 202, 409 and 422 are all parsed ResumeResponse values, never errors', async () => {
  await newClient()
  // 200 — the preview arm.
  standIn.script({
    status: 200,
    body: {
      contractVersion: V,
      outcome: 'preview',
      runId: 'run-1',
      remake: [],
      estimateCents: 0,
      spentCents: 0,
      capCents: 1000,
      ceilingCents: 1000,
    },
  })
  const preview = await client.resume('run-1', makeResumeRequest())
  assert.equal(preview.outcome, 'preview')

  // 202 — accepted arm.
  standIn.script({
    status: 202,
    body: {
      contractVersion: V,
      outcome: 'accepted',
      runId: 'run-2',
      resumes: 'run-1',
      replayed: false,
    },
  })
  const accepted = await client.resume('run-1', makeResumeRequest())
  assert.equal(accepted.outcome, 'accepted')

  // 409 — refused arm.
  standIn.script({
    status: 409,
    body: {
      contractVersion: V,
      outcome: 'refused',
      runId: 'run-1',
      reason: 'not-resumable',
      detail: 'finished',
    },
  })
  const notResumable = await client.resume('run-1', makeResumeRequest())
  assert.equal(notResumable.outcome, 'refused')
  if (notResumable.outcome === 'refused') {
    assert.equal(notResumable.reason, 'not-resumable')
  }

  // 422 — refused arm with a different reason.
  standIn.script({
    status: 422,
    body: {
      contractVersion: V,
      outcome: 'refused',
      runId: 'run-1',
      reason: 'version',
      detail: 'old',
    },
  })
  const version = await client.resume('run-1', makeResumeRequest())
  assert.equal(version.outcome, 'refused')
  if (version.outcome === 'refused') assert.equal(version.reason, 'version')
})

// ---------------------------------------------------------------- 4. SdkApiError

test('4. 400 ErrorResponse becomes SdkApiError with the parsed body, status, and only the validated fields', async () => {
  await newClient()
  standIn.script({
    status: 400,
    body: { contractVersion: V, error: 'invalid', detail: 'bad runId' },
  })
  const err = await client.find('bad?').catch((e: unknown) => e)
  assert.equal((err as SdkApiError).kind, 'api')
  assert.equal((err as SdkApiError).status, 400)
  assert.deepEqual((err as SdkApiError).body, {
    contractVersion: V,
    error: 'invalid',
    detail: 'bad runId',
  })
})

test('4. 404 ErrorResponse becomes SdkApiError with the parsed body', async () => {
  await newClient()
  standIn.script({
    status: 404,
    body: { contractVersion: V, error: 'not-found', detail: 'no run' },
  })
  const err = await client.status('nope').catch((e: unknown) => e)
  assert.equal((err as SdkApiError).kind, 'api')
  assert.equal((err as SdkApiError).status, 404)
  assert.deepEqual((err as SdkApiError).body, {
    contractVersion: V,
    error: 'not-found',
    detail: 'no run',
  })
})

test('4. 500 ErrorResponse becomes SdkApiError with the parsed body', async () => {
  await newClient()
  standIn.script({
    status: 500,
    body: { contractVersion: V, error: 'internal', detail: 'boom' },
  })
  const err = await client.status('run-1').catch((e: unknown) => e)
  assert.equal((err as SdkApiError).kind, 'api')
  assert.equal((err as SdkApiError).status, 500)
  assert.deepEqual((err as SdkApiError).body, {
    contractVersion: V,
    error: 'internal',
    detail: 'boom',
  })
})

test('4. SdkApiError carries only the schema-validated body — no wire bytes leak through', async () => {
  await newClient()
  // The server (incorrectly) sends an extra field alongside a schema-valid ErrorResponse.
  // `ErrorResponse` is strict, so the extra key fails schema parsing and the SDK treats
  // this as SdkProtocolError (the body is not a valid ErrorResponse). The wire bytes are
  // never exposed — that is the "no unparsed body" rule from the prompt.
  standIn.script({
    status: 404,
    body: { contractVersion: V, error: 'not-found', detail: 'no run', stack: 'lib/x.ts:42' },
  })
  const err = await client.status('nope').catch((e: unknown) => e)
  assert.equal((err as SdkProtocolError).kind, 'protocol')
  assert.equal((err as SdkProtocolError).status, 404)
  assert.equal('body' in (err as object), false, 'wire bytes leaked through an unparsed body')

  // A schema-valid body, by contrast, surfaces ONLY the three contract fields.
  standIn.script({
    status: 404,
    body: { contractVersion: V, error: 'not-found', detail: 'no run' },
  })
  const err2 = await client.status('nope').catch((e: unknown) => e)
  assert.equal((err2 as SdkApiError).kind, 'api')
  assert.deepEqual(Object.keys((err2 as SdkApiError).body).sort(), [
    'contractVersion',
    'detail',
    'error',
  ])
})

// ---------------------------------------------------------------- 5. SdkProtocolError

test('5. malformed JSON body becomes SdkProtocolError carrying no body, with the status', async () => {
  // The shared StandIn JSON.stringifies every scripted body, so a literal non-JSON value
  // ends up as a JSON string the schema then rejects (the wrong-schema case). To send
  // bytes the SDK cannot parse, spin up a separate raw server that writes non-JSON.
  const rawServer = createServer((req, res) => {
    res.statusCode = 200
    res.setHeader('content-type', 'application/json')
    if (req.url === '/v1/ready') {
      res.end(JSON.stringify({ contractVersion: V, ready: true }))
      return
    }
    res.end('this is not JSON')
  })
  await new Promise<void>((resolveListen) => {
    rawServer.listen(0, '127.0.0.1', () => resolveListen())
  })
  const address = rawServer.address() as AddressInfo
  const url = `http://127.0.0.1:${address.port}/`
  const rawClient = await createCutroom({ baseUrl: url })
  try {
    const err = await rawClient.status('run-x').catch((e: unknown) => e)
    assert.equal((err as SdkProtocolError).kind, 'protocol')
    assert.equal((err as SdkProtocolError).stage, 'request')
    assert.equal((err as SdkProtocolError).status, 200)
  } finally {
    await rawClient.close()
    await new Promise<void>((resolveClose) => rawServer.close(() => resolveClose()))
  }
})

test('5. syntactically valid JSON that fails the route schema becomes SdkProtocolError, no raw body', async () => {
  await newClient()
  // 200 with a body that is NOT a RunStatus — the schema rejects it.
  standIn.script({
    status: 200,
    body: { not: 'a status' },
  })
  const err = await client.status('run-1').catch((e: unknown) => e)
  assert.equal((err as SdkProtocolError).kind, 'protocol')
  assert.equal((err as SdkProtocolError).stage, 'request')
  assert.equal((err as SdkProtocolError).status, 200)
  // No `body` field — the SDK drops the unparsed wire bytes.
  assert.equal('body' in (err as object), false)
})

test('5. an unexpected status becomes SdkProtocolError with the status, not a parsed value', async () => {
  await newClient()
  // 418 — not a status the contract defines for any route.
  standIn.script({
    status: 418,
    body: { contractVersion: V, error: 'invalid', detail: 'teapot' },
  })
  const err = await client.status('run-1').catch((e: unknown) => e)
  assert.equal((err as SdkProtocolError).kind, 'protocol')
  assert.equal((err as SdkProtocolError).stage, 'request')
  assert.equal((err as SdkProtocolError).status, 418)
})

test('5. submit treats 202 as the only success body; a 200 with a SubmitResponse body is protocol error', async () => {
  await newClient()
  standIn.script({
    status: 200,
    body: {
      contractVersion: V,
      outcome: 'accepted',
      requestId: 'req-1',
      runId: 'run-1',
      replayed: false,
    },
  })
  const err = await client.submit(makeSubmitRequest()).catch((e: unknown) => e)
  assert.equal((err as SdkProtocolError).kind, 'protocol')
  assert.equal((err as SdkProtocolError).status, 200)
})

test('5. a schema-valid 400 body but with an unknown `error` enum value is SdkProtocolError, not SdkApiError', async () => {
  await newClient()
  standIn.script({
    status: 400,
    body: { contractVersion: V, error: 'gone', detail: 'left' }, // 'gone' is not in the enum
  })
  const err = await client.find('req-1').catch((e: unknown) => e)
  assert.equal((err as SdkProtocolError).kind, 'protocol')
  assert.equal((err as SdkProtocolError).stage, 'request')
  assert.equal((err as SdkProtocolError).status, 400)
})

// ---------------------------------------------------------------- 6. input validation

test('6. invalid base URLs are rejected before any request is made', async () => {
  // Each case is rejected synchronously by `createCutroom` (TypeError, before fetch).
  const cases: Array<[string, string]> = [
    ['https://127.0.0.1:8787', 'https'],
    ['http://127.0.0.1:8787/extra/path', 'path'],
    ['http://127.0.0.1:8787?x=1', 'query'],
    ['http://127.0.0.1:8787#frag', 'fragment'],
    ['http://user:pass@127.0.0.1:8787', 'credentials'],
    ['http://example.com:8787', 'remote host'],
    ['http://127.0.0.1', 'missing port'],
    ['http://:8787', 'no host'],
    ['not-a-url', 'malformed'],
    ['', 'empty'],
  ]
  for (const [bad, label] of cases) {
    await assert.rejects(
      createCutroom({ baseUrl: bad }),
      (err: unknown) => err instanceof TypeError,
      `${label}: ${JSON.stringify(bad)} was accepted`,
    )
  }
})

test('6. a permitted custom loopback origin is normalized and used', async () => {
  // Different loopback hosts (`localhost`, `127.0.0.1`) and a trailing slash all normalize to
  // the same `http://host:port/` form the SDK actually fetches against. The stand-in listens
  // on the unspecified IPv6 address `::`, which dual-stacks `127.0.0.1` and `::1`, so both
  // hosts answer the same stand-in on the SAME ephemeral port.
  standIn = new StandIn()
  await standIn.start()
  const customStandIn = standIn
  const port = (customStandIn.server.address() as AddressInfo).port
  for (const input of [
    `http://localhost:${port}`,
    `http://127.0.0.1:${port}`,
    `http://127.0.0.1:${port}/`,
  ]) {
    const c = await createCutroom({ baseUrl: input })
    customStandIn.script({ status: 200, body: makeRunStatus() })
    const status = await c.status('run-1')
    assert.equal(status.runId, 'run-1')
    // The recorded path comes from the same stand-in regardless of the URL spelling.
    const last = customStandIn.received().at(-1) as Recorded
    assert.equal(last.rawPath, '/v1/runs/run-1')
    await c.close()
  }
  client = undefined as unknown as Cutroom
  await customStandIn.stop()
  standIn = undefined as unknown as StandIn
})

test('6. [::1] is accepted as a loopback host (IPv6 literal)', async () => {
  // Bind a separate stand-in on `::1` so the SDK's IPv6 loopback request is answered.
  const ipv6StandIn = new StandIn()
  await new Promise<void>((resolveListen) => {
    ipv6StandIn.server.listen(0, '::1', () => resolveListen())
  })
  const ipv6Url = ipv6StandIn.baseUrlFor('[::1]')
  const c = await createCutroom({ baseUrl: ipv6Url })
  try {
    ipv6StandIn.script({ status: 200, body: makeRunStatus() })
    const status = await c.status('run-1')
    assert.equal(status.runId, 'run-1')
  } finally {
    await c.close()
    await ipv6StandIn.stop()
  }
})

test('6. an explicit default HTTP port (`:80`) is accepted as an origin', async () => {
  // WHATWG URL strips the default port from `URL.port` — `http://127.0.0.1:80` parses to
  // `URL.port === ''` — so a naïve loopback check that only inspects the parsed URL
  // would reject an explicit, well-formed :80 origin. The SDK must read the original
  // URL authority to decide whether a port was written.
  //
  // There is deliberately no listener on port 80. Reaching a connection/readiness outcome,
  // rather than TypeError input validation, proves the explicit default port was retained as
  // caller input. The ephemeral case additionally proves an accepted origin is usable.
  const customStandIn = new StandIn()
  await customStandIn.start()
  const port = (customStandIn.server.address() as AddressInfo).port
  const accepted: string[] = ['http://127.0.0.1:80', 'http://[::1]:80', `http://127.0.0.1:${port}`]
  try {
    for (const input of accepted) {
      const result = await createCutroom({ baseUrl: input }).catch((error: unknown) => error)
      assert.equal(result instanceof TypeError, false, `${input} failed explicit-port validation`)
      if (typeof result === 'object' && result !== null && 'close' in result) {
        await (result as Cutroom).close()
      }
    }
  } finally {
    await customStandIn.stop()
  }
})

test('6. an origin whose port was not written at all is rejected', async () => {
  // The mirror of the previous test: an http://127.0.0.1 or http://[::1] with NO port
  // anywhere in the authority must still be rejected, because the loopback discipline
  // asks the caller to name the port. WHATWG parses both to `URL.port === ''`, and the
  // SDK must distinguish that from an explicit :80 by reading the original string.
  const cases: Array<[string, string]> = [
    ['http://127.0.0.1', 'no port for IPv4 loopback'],
    ['http://[::1]', 'no port for bracketed IPv6 loopback'],
    ['http://localhost', 'no port for hostname loopback'],
  ]
  for (const [bad, label] of cases) {
    await assert.rejects(
      createCutroom({ baseUrl: bad }),
      (err: unknown) => err instanceof TypeError,
      `${label}: ${JSON.stringify(bad)} was accepted`,
    )
  }
})

test('6. loopback confinement across redirects: a 3xx response is an SdkProtocolError, not followed', async () => {
  // The configured loopback server answers with a 307 redirect to a SECOND server, on a
  // different origin. The SDK must throw SdkProtocolError with the original 3xx status
  // and must not contact the second server — a request to an attacker-controlled peer
  // would let it read the request body, and that is the confinement gap the rule closes.
  //
  // The chosen route is `POST /v1/runs/:runId/resume` because it carries a JSON body: a
  // successful follow-through would forward the body to the second server, which is
  // exactly the leak this test prevents. The body here is a syntactically valid
  // `ResumeRequest`, so the schema check passes and the request reaches fetch.
  const secondServer = createServer((_req, res) => {
    // If this ever fires, the SDK followed the redirect and the test is failing.
    res.statusCode = 200
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify({ contractVersion: V, outcome: 'never' }))
  })
  let secondHits = 0
  secondServer.on('request', () => {
    secondHits += 1
  })
  await new Promise<void>((resolveListen) => {
    secondServer.listen(0, '127.0.0.1', () => resolveListen())
  })
  const secondAddress = secondServer.address() as AddressInfo
  const secondUrl = `http://127.0.0.1:${secondAddress.port}/`

  const firstServer = createServer((req, res) => {
    if (req.url === '/v1/ready') {
      res.statusCode = 200
      res.setHeader('content-type', 'application/json')
      res.end(JSON.stringify({ contractVersion: V, ready: true }))
      return
    }
    res.statusCode = 307
    res.setHeader('location', secondUrl)
    res.end()
  })
  await new Promise<void>((resolveListen) => {
    firstServer.listen(0, '127.0.0.1', () => resolveListen())
  })
  const firstAddress = firstServer.address() as AddressInfo
  const firstUrl = `http://127.0.0.1:${firstAddress.port}/`

  const c = await createCutroom({ baseUrl: firstUrl })
  try {
    const err = await c
      .resume('run-1', makeResumeRequest())
      .catch((e: unknown) => e as SdkProtocolError)
    assert.equal((err as SdkProtocolError).kind, 'protocol')
    assert.equal((err as SdkProtocolError).stage, 'request')
    assert.equal((err as SdkProtocolError).status, 307)
    assert.equal(secondHits, 0, 'SDK followed a redirect and contacted a peer outside its loopback')
  } finally {
    await c.close()
    await new Promise<void>((r) => firstServer.close(() => r()))
    await new Promise<void>((r) => secondServer.close(() => r()))
  }
})

// ---------------------------------------------------------------- 7. close()

test('7. close() makes later calls reject locally without a request or a process signal', async () => {
  await newClient()
  standIn.script({ status: 200, body: makeRunStatus() })

  // A normal call still works before close.
  assert.equal((await client.status('run-1')).runId, 'run-1')
  assert.equal(standIn.received().length, 1)

  await client.close()

  // Every subsequent method rejects with SdkProtocolError { stage: 'request' } and the
  // stand-in sees no further requests.
  const before = standIn.received().length
  const calls: Array<Promise<unknown>> = [
    client.submit(makeSubmitRequest()),
    client.find('req-1'),
    client.status('run-1'),
    client.follow('run-1'),
    client.result('run-1'),
    client.record('run-1'),
    client.cancel('run-1'),
    client.resume('run-1', makeResumeRequest()),
  ]
  const errors = await Promise.all(
    calls.map((p) =>
      p.then(
        () => undefined,
        (e: unknown) => e,
      ),
    ),
  )
  for (const err of errors) {
    assert.equal((err as SdkProtocolError).kind, 'protocol')
    assert.equal((err as SdkProtocolError).stage, 'request')
  }
  assert.equal(standIn.received().length, before, 'close() let extra requests through')

  // close() is idempotent.
  await client.close()
})
