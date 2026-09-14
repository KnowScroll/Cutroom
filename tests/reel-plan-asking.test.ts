import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { startEngine, type Engine } from './engine/harness.ts'
import { validRequest } from './stand-in/fixtures.ts'

// reel-plan, Slice 1 — asking the real engine, and being answered at once
// (docs/features/reel-plan.md, checks 10, 11 and 14). These drive the engine's own API over real
// HTTP on a database file in a temporary folder. No worker runs: every answer here is given at
// submit, before any job is claimed.

let engine: Engine

before(async () => {
  engine = await startEngine({ worker: false })
})

after(async () => {
  await engine.stop()
})

/** The same object with every key inserted in reverse order, at every depth. */
function reversedKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(reversedKeys)
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).reverse()
    return Object.fromEntries(entries.map(([k, v]) => [k, reversedKeys(v)]))
  }
  return value
}

// ---------------------------------------------------------------- 10

test("10. a submit with until 'stills' or 'video' is refused 422 'unsupported' with no runId", async () => {
  for (const until of ['stills', 'video'] as const) {
    const requestId = `r10-${until}`
    const request = validRequest(requestId)
    request.options.until = until

    const { status, json } = await engine.http.submit(request)
    assert.equal(status, 422, until)
    assert.equal(json.outcome, 'refused')
    assert.equal(json.reason, 'unsupported')
    assert.equal(json.requestId, requestId)
    assert.match(String(json.detail), /not built yet/, 'Gate 1: it says "not built yet"')
    assert.ok(!('runId' in json), 'a refusal carried a runId')

    const lookup = await engine.http.lookup(requestId)
    assert.equal(lookup.status, 404, `the refused ${until} request was stored as a run anyway`)
  }

  const plan = await engine.http.submit(validRequest('r10-plan'))
  assert.equal(plan.status, 202, "until 'plan' must still be accepted")
})

// ---------------------------------------------------------------- 11

test("11. a submit with planVaryOn order, canonicalSubject or angle is refused 422 'unsupported' with no runId", async () => {
  for (const axis of ['order', 'canonicalSubject', 'angle'] as const) {
    const requestId = `r11-${axis}`
    const request = validRequest(requestId)
    request.options.planVaryOn = axis

    const { status, json } = await engine.http.submit(request)
    assert.equal(status, 422, axis)
    assert.equal(json.outcome, 'refused')
    assert.equal(json.reason, 'unsupported')
    assert.match(String(json.detail), /not built yet/)
    assert.ok(!('runId' in json), 'a refusal carried a runId')

    const lookup = await engine.http.lookup(requestId)
    assert.equal(lookup.status, 404, `the refused ${axis} request was stored as a run anyway`)
  }
})

test('11. a submit with planVaryOn absent or shotCount is accepted', async () => {
  const absent = validRequest('r11-absent')
  assert.equal(absent.options.planVaryOn, undefined)
  const shotCount = validRequest('r11-shotCount')
  shotCount.options.planVaryOn = 'shotCount'

  for (const request of [absent, shotCount]) {
    const { status, json } = await engine.http.submit(request)
    assert.equal(status, 202, request.requestId)
    assert.equal(json.outcome, 'accepted')
    assert.equal(json.replayed, false)
    assert.equal(typeof json.runId, 'string')
  }
})

// ---------------------------------------------------------------- 14

test('14. the same requestId and content in a different key order returns the same runId with replayed true', async () => {
  const first = await engine.http.submit(validRequest('r14'))
  assert.equal(first.status, 202)
  assert.equal(first.json.replayed, false)

  const again = await engine.http.submit(reversedKeys(validRequest('r14')))
  assert.equal(again.status, 202)
  assert.equal(again.json.outcome, 'accepted')
  assert.equal(again.json.runId, first.json.runId)
  assert.equal(again.json.replayed, true)
})

test("14. the same requestId with different content is refused 409 'conflict'", async () => {
  const first = await engine.http.submit(validRequest('r14-conflict'))
  assert.equal(first.status, 202)

  const changed = validRequest('r14-conflict')
  changed.options.budgetCents = 301
  const { status, json } = await engine.http.submit(changed)
  assert.equal(status, 409)
  assert.equal(json.outcome, 'refused')
  assert.equal(json.reason, 'conflict')
  assert.ok(!('runId' in json), 'a conflict carried a runId')

  const lookup = await engine.http.lookup('r14-conflict')
  assert.equal(lookup.json.runId, first.json.runId, 'the conflicting request replaced the run')
})
