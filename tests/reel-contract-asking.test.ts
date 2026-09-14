import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, before, test } from 'node:test'
import { ErrorResponse, RunStatus, SubmitResponse } from '@cutroom/reel-contract'
import { client } from './stand-in/client.ts'
import { startStandIn, type StandIn } from './stand-in/reel-engine-stand-in.ts'
import { validRequest } from './stand-in/fixtures.ts'

// reel-contract, Slice 2 — asking, and being answered at once (docs/features/reel-contract.md,
// checks 11–16). Behaviour checks: they drive a stand-in service over real HTTP and prove the
// contract is complete and consistent. They do not prove the real engine keeps it.

let service: StandIn
let storageDir: string
let api: ReturnType<typeof client>

before(async () => {
  storageDir = mkdtempSync(join(tmpdir(), 'reel-contract-slice2-'))
  // Can plan and make stills, but not video yet — the shape a real engine has before its
  // second half exists, and what check 14 needs.
  service = await startStandIn({ storageDir, canProduce: ['plan', 'stills'] })
  api = client(service.baseUrl)
})

after(async () => {
  await service.stop()
  rmSync(storageDir, { recursive: true, force: true })
})

// Every reply goes through ./stand-in/client.ts, which fails the test on a body the contract
// does not describe for that route and status (check 18).
const call = (method: string, path: string, body?: unknown, raw?: string) =>
  api.call(method, path, body, raw)
const submit = (body: unknown) => api.submit(body)

/** The same object with every key inserted in reverse order, at every depth. */
function reversedKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(reversedKeys)
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).reverse()
    return Object.fromEntries(entries.map(([k, v]) => [k, reversedKeys(v)]))
  }
  return value
}

// ---------------------------------------------------------------- 11

test('11. an unsupported contractVersion is refused 422 "version", with no runId', async () => {
  const { status, json } = await submit({ ...validRequest('r11-a'), contractVersion: 2 })
  assert.equal(status, 422)
  assert.ok(SubmitResponse.safeParse(json).success, JSON.stringify(json))
  assert.equal(json.outcome, 'refused')
  assert.equal(json.reason, 'version')
  assert.ok(!('runId' in json), 'a refusal carried a runId')
})

test('11. an invalid body whose requestId was already used is refused 422, not 409', async () => {
  const first = await submit(validRequest('r11-b'))
  assert.equal(first.status, 202)

  const invalid = validRequest('r11-b')
  invalid.options.budgetCents = 0
  const { status, json } = await submit(invalid)
  assert.equal(status, 422, 'validity must be checked before the requestId is compared')
  assert.equal(json.reason, 'invalid')
})

// ---------------------------------------------------------------- 12

test('12. a body that is not JSON is refused 422 "invalid", with no requestId', async () => {
  const { status, json } = await call('POST', '/v1/runs', undefined, '{ this is not json')
  assert.equal(status, 422)
  assert.ok(SubmitResponse.safeParse(json).success, JSON.stringify(json))
  assert.equal(json.reason, 'invalid')
  assert.ok(!('requestId' in json))
})

test('12. a body missing its requestId is refused 422 "invalid"', async () => {
  const body: Record<string, unknown> = validRequest('ignored')
  delete body.requestId
  const { status, json } = await submit(body)
  assert.equal(status, 422)
  assert.equal(json.reason, 'invalid')
  assert.ok(!('requestId' in json))
})

test('12. a body carrying sources is refused, not stripped and accepted', async () => {
  const { status, json } = await submit({ ...validRequest('r12-sources'), sources: ['a book'] })
  assert.equal(status, 422)
  assert.equal(json.reason, 'invalid')
  assert.equal(json.requestId, 'r12-sources')

  const lookup = await call('GET', '/v1/runs?requestId=r12-sources')
  assert.equal(lookup.status, 404, 'the refused request was stored as a run anyway')
})

// ---------------------------------------------------------------- 13

test('13. the same requestId and content in a different key order is the same run, replayed', async () => {
  const first = await submit(validRequest('r13'))
  assert.equal(first.status, 202)
  assert.ok(SubmitResponse.safeParse(first.json).success)
  assert.equal(first.json.outcome, 'accepted')
  assert.equal(first.json.replayed, false)

  const again = await submit(reversedKeys(validRequest('r13')))
  assert.equal(again.status, 202)
  assert.equal(again.json.runId, first.json.runId)
  assert.equal(again.json.replayed, true)
})

test('13. the same requestId with different content is refused 409 "conflict"', async () => {
  const first = await submit(validRequest('r13-conflict'))
  assert.equal(first.status, 202)

  const changed = validRequest('r13-conflict')
  changed.options.budgetCents = 301
  const { status, json } = await submit(changed)
  assert.equal(status, 409)
  assert.ok(SubmitResponse.safeParse(json).success)
  assert.equal(json.reason, 'conflict')
  assert.ok(!('runId' in json))
})

// ---------------------------------------------------------------- 14

test('14. an until the service cannot produce is refused 422 "unsupported"', async () => {
  const request = validRequest('r14')
  request.options.until = 'video'
  const { status, json } = await submit(request)
  assert.equal(status, 422)
  assert.equal(json.reason, 'unsupported')

  const produceable = validRequest('r14-stills')
  produceable.options.until = 'stills'
  assert.equal((await submit(produceable)).status, 202)
})

// ---------------------------------------------------------------- 15

test('15. lookup by requestId: 200 for a known one, 404 for an unknown one', async () => {
  const accepted = await submit(validRequest('r15'))
  const found = await call('GET', '/v1/runs?requestId=r15')
  assert.equal(found.status, 200)
  assert.ok(RunStatus.safeParse(found.json).success, JSON.stringify(found.json))
  assert.equal(found.json.runId, accepted.json.runId)

  const unknown = await call('GET', '/v1/runs?requestId=never-sent')
  assert.equal(unknown.status, 404)
  assert.ok(ErrorResponse.safeParse(unknown.json).success)
  assert.equal(unknown.json.error, 'not-found')
})

test('15. lookup with an empty or missing requestId is 400 "invalid"', async () => {
  for (const path of ['/v1/runs?requestId=', '/v1/runs']) {
    const { status, json } = await call('GET', path)
    assert.equal(status, 400, path)
    assert.ok(ErrorResponse.safeParse(json).success)
    assert.equal(json.error, 'invalid')
  }
})

// ---------------------------------------------------------------- 16

test('16. status: 200 RunStatus for a known run, 404 ErrorResponse for an unknown one', async () => {
  const accepted = await submit(validRequest('r16'))
  const known = await call('GET', `/v1/runs/${String(accepted.json.runId)}`)
  assert.equal(known.status, 200)
  assert.ok(RunStatus.safeParse(known.json).success, JSON.stringify(known.json))
  assert.equal(known.json.requestId, 'r16')

  const unknown = await call('GET', '/v1/runs/no-such-run')
  assert.equal(unknown.status, 404)
  assert.ok(ErrorResponse.safeParse(unknown.json).success)
  assert.equal(unknown.json.error, 'not-found')
})
