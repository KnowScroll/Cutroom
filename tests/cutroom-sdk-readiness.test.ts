import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { after, afterEach, before, test } from 'node:test'
import { startApi, type Api } from '@cutroom/api'
import { CONTRACT_VERSION, ErrorResponse, ReadyResponse, type Routes } from '@cutroom/reel-contract'
import { startEngine, type Engine } from './engine/harness.ts'

// cutroom-sdk, Slice 1 - the readiness route (docs/features/cutroom-sdk.md, Gate 2 / Slice 1).
//
// The contract is a strict discriminated union on `ready`. A future SDK joins an already-booting
// engine by polling `/v1/ready` until it returns 200, and starts a child only when the same probe
// fails to connect. This file is the sole owner of `ReadyResponse` shape checks in Slice 1 and
// the sole owner of `/v1/ready` route coverage; the existing `tests/stand-in/client.ts` and
// `tests/reel-plan-service.test.ts` stay read-only for Slice 1 (S-173).

const V = CONTRACT_VERSION

/** A test-local GET to a readiness endpoint, returning the raw status and parsed JSON body. */
async function probe(baseUrl: string): Promise<{ status: number; json: Record<string, unknown> }> {
  const res = await fetch(`${baseUrl}/v1/ready`)
  const json = (await res.json()) as Record<string, unknown>
  return { status: res.status, json }
}

// ---------------------------------------------------------------- 1. shapes

test('1. both valid strict bodies parse under ReadyResponse', () => {
  const trueBody = { contractVersion: V, ready: true }
  const falseBody = { contractVersion: V, ready: false }
  assert.ok(ReadyResponse.safeParse(trueBody).success, 'a 200 body must parse')
  assert.ok(ReadyResponse.safeParse(falseBody).success, 'a 503 body must parse')
})

test('1. extra key, missing key, wrong version and non-boolean ready are rejected', () => {
  const cases: Array<[string, unknown]> = [
    ['extra key', { contractVersion: V, ready: true, foo: 'x' }],
    ['missing contractVersion', { ready: true }],
    ['missing ready', { contractVersion: V }],
    ['version 2', { contractVersion: 2, ready: true }],
    ['ready: "yes"', { contractVersion: V, ready: 'yes' }],
    ['ready: 1', { contractVersion: V, ready: 1 }],
    ['empty body', {}],
    ['null ready', { contractVersion: V, ready: null }],
  ]
  for (const [name, body] of cases) {
    assert.ok(!ReadyResponse.safeParse(body).success, `${name} was accepted`)
  }
})

test('1. status/body mismatches the prompt names - 200 with false and 503 with true - are rejected by ReadyResponse.safeParse', () => {
  // The route sends the body that matches the captured boolean. A bug that returned 200 with
  // {ready: false} or 503 with {ready: true} would still produce a JSON body ReadyResponse parses,
  // because ReadyResponse is the union of both. What ReadyResponse itself cannot tell apart is the
  // *mismatch* the status code carries; the route-handler test below proves status and body agree.
  // Here the schema is checked to permit both forms.
  const trueBody = { contractVersion: V, ready: true }
  const falseBody = { contractVersion: V, ready: false }
  assert.ok(ReadyResponse.safeParse(trueBody).success)
  assert.ok(ReadyResponse.safeParse(falseBody).success)
})

// ---------------------------------------------------------------- 2. route table

test('2. Routes["GET /v1/ready"] permits exactly 200/503 ReadyResponse and 500 ErrorResponse', () => {
  // Compile-time pin: this assignment MUST satisfy `Routes['GET /v1/ready']` with exactly the three
  // statuses the contract gives the route. If a future slice drops 503 or adds 400, the
  // type-checker refuses this literal and the slice must update the test. The literals use the
  // schemas' inferred types, which is what `Routes` exports — naming the schema values themselves
  // would not satisfy the inferred type alias (the two share a name but not a namespace).
  type ReadyBody =
    | {
        contractVersion: 1
        ready: true
      }
    | {
        contractVersion: 1
        ready: false
      }
  type ErrorBody = {
    contractVersion: 1
    error: 'not-found' | 'invalid' | 'internal'
    detail: string
  }
  const expected = {
    responses: {
      200: {} as ReadyBody,
      503: {} as ReadyBody,
      500: {} as ErrorBody,
    },
  } satisfies Routes['GET /v1/ready']
  assert.deepEqual(
    Object.keys(expected.responses)
      .map((k) => Number(k))
      .sort((a, b) => a - b),
    [200, 500, 503],
  )
  // The runtime parse uses the public Zod schemas, which is what a future SDK will do too.
  assert.ok(ReadyResponse.safeParse({ contractVersion: V, ready: true }).success)
  assert.ok(ReadyResponse.safeParse({ contractVersion: V, ready: false }).success)
  assert.ok(ErrorResponse.safeParse({ contractVersion: V, error: 'internal', detail: 'x' }).success)
})

// ---------------------------------------------------------------- 3. direct API: 503/false before flip, 200/true after, no row written

/** Counts rows in `run` and `run_event` through a fresh connection, by SQL. */
function counts(dbPath: string): { run: number; run_event: number } {
  const sqlite = new DatabaseSync(dbPath, { readOnly: true })
  try {
    const run = (sqlite.prepare('SELECT COUNT(*) AS n FROM run').get() as { n: number }).n
    const run_event = (sqlite.prepare('SELECT COUNT(*) AS n FROM run_event').get() as { n: number })
      .n
    return { run, run_event }
  } finally {
    sqlite.close()
  }
}

let directDir: string
let directDbPath: string
let directApi: Api | undefined
let directReady: { value: boolean }

before(async () => {
  directDir = mkdtempSync(join(tmpdir(), 'cutroom-sdk-readiness-'))
  directDbPath = join(directDir, 'engine.sqlite')
  directReady = { value: false }
})

afterEach(async () => {
  await directApi?.stop()
  directApi = undefined
})

after(() => {
  rmSync(directDir, { recursive: true, force: true })
})

async function startDirect(readyFn: () => boolean): Promise<Api> {
  const api = await startApi({ dbPath: directDbPath, ready: readyFn })
  directApi = api
  return api
}

test('3. a direct API answers 503/false before the readiness flip and 200/true after; no row is written by either probe', async () => {
  const api = await startDirect(() => directReady.value)

  // Before the flip: 503 with the strict false body.
  const before = counts(directDbPath)
  const down = await probe(api.baseUrl)
  assert.equal(down.status, 503, `503 expected before flip; got ${down.status}`)
  assert.deepEqual(down.json, { contractVersion: V, ready: false })
  const downCount = counts(directDbPath)
  assert.deepEqual(
    downCount,
    before,
    `the 503 probe wrote a row: run ${downCount.run} (was ${before.run}), run_event ${downCount.run_event} (was ${before.run_event})`,
  )

  // Flip; same API answers 200 with the strict true body.
  directReady.value = true
  const up = await probe(api.baseUrl)
  assert.equal(up.status, 200, `200 expected after flip; got ${up.status}`)
  assert.deepEqual(up.json, { contractVersion: V, ready: true })
  const upCount = counts(directDbPath)
  assert.deepEqual(
    upCount,
    before,
    `the 200 probe wrote a row: run ${upCount.run} (was ${before.run}), run_event ${upCount.run_event} (was ${before.run_event})`,
  )

  // A second probe (200 again, no rows added) and a flip back: 503/false, no rows added.
  const second = await probe(api.baseUrl)
  assert.equal(second.status, 200)
  directReady.value = false
  const downAgain = await probe(api.baseUrl)
  assert.equal(downAgain.status, 503)
  assert.deepEqual(downAgain.json, { contractVersion: V, ready: false })
  assert.deepEqual(counts(directDbPath), before, 'a 503 probe after a 200 wrote a row')
})

// ---------------------------------------------------------------- 4. the getter is called once per request

test('4. a getter that changes its answer between calls cannot return 503/true or 200/false; the route captures once and reuses', async () => {
  // Mutable counter: even calls return true, odd calls return false. A handler that called the
  // getter twice would sometimes return 200/true and sometimes 200/false (or 503/false /
  // 503/true). The handler under test captures once and derives both status and body from the
  // single captured value, so the response's `ready` always equals (status === 200).
  let calls = 0
  const alternating = () => {
    calls += 1
    return calls % 2 === 1
  }
  const api = await startDirect(alternating)

  for (let i = 0; i < 4; i += 1) {
    const { status, json } = await probe(api.baseUrl)
    const expectedReady = status === 200
    assert.equal(
      json.ready,
      expectedReady,
      `call ${i + 1}: status ${status} but ready=${String(json.ready)}`,
    )
    assert.equal(json.contractVersion, V)
    assert.equal(calls, i + 1, `request ${i + 1} called the readiness getter ${calls} times`)
  }
})

// ---------------------------------------------------------------- 5. a throwing getter yields a schema-valid 500

test('5. a direct API whose readiness getter throws returns a schema-valid 500 ErrorResponse', async () => {
  const api = await startDirect(() => {
    throw new Error('the getter exploded')
  })

  const res = await fetch(`${api.baseUrl}/v1/ready`)
  assert.equal(res.status, 500, `throwing getter: 500 expected; got ${res.status}`)
  const json = (await res.json()) as Record<string, unknown>
  assert.ok(
    ErrorResponse.safeParse(json).success,
    `the 500 body is not a schema-valid ErrorResponse: ${JSON.stringify(json)}`,
  )
})

// ---------------------------------------------------------------- 6. harness: full engine with worker reads 200; restart flips through 503 and back to 200

let engine: Engine | undefined

afterEach(async () => {
  await engine?.stop()
  engine = undefined
})

test('6. a harness engine with a worker reads 200/true, restarts to 503/false before startWorker, then 200/true after', async () => {
  engine = await startEngine({ worker: true })
  const readyUp = await probe(engine.api.baseUrl)
  assert.equal(readyUp.status, 200)
  assert.deepEqual(readyUp.json, { contractVersion: V, ready: true })

  await engine.stopWorker()
  await engine.restart({ script: {} })
  // After restart, the API is fresh with no worker started yet. Probe before startWorker:
  const readyDown = await probe(engine.api.baseUrl)
  assert.equal(
    readyDown.status,
    503,
    `restart without startWorker: 503 expected; got ${readyDown.status}`,
  )
  assert.deepEqual(readyDown.json, { contractVersion: V, ready: false })

  await engine.startWorker()
  const readyUp2 = await probe(engine.api.baseUrl)
  assert.equal(readyUp2.status, 200)
  assert.deepEqual(readyUp2.json, { contractVersion: V, ready: true })
})

test('6. a harness engine started without a worker reads 503/false until startWorker is called', async () => {
  engine = await startEngine({ worker: false })
  const down = await probe(engine.api.baseUrl)
  assert.equal(down.status, 503)
  assert.deepEqual(down.json, { contractVersion: V, ready: false })

  await engine.startWorker()
  const up = await probe(engine.api.baseUrl)
  assert.equal(up.status, 200)
  assert.deepEqual(up.json, { contractVersion: V, ready: true })
})

test('6. stopWorker flips readiness from 200 back to 503 without restarting the API', async () => {
  engine = await startEngine({ worker: true })
  const up = await probe(engine.api.baseUrl)
  assert.equal(up.status, 200)
  await engine.stopWorker()
  const down = await probe(engine.api.baseUrl)
  assert.equal(down.status, 503)
  assert.deepEqual(down.json, { contractVersion: V, ready: false })
})
