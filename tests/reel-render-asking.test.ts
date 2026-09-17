import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { startEngine, type Engine } from './engine/harness.ts'
import { validRequest } from './stand-in/fixtures.ts'

// reel-render, Slice 2 — check 7 (docs/features/reel-render.md): what the engine answers at submit
// once it makes video. `until: 'video'` is accepted (S-069); the one request it still refuses as
// `unsupported` is a planVaryOn other than shotCount (D-110), and that refusal keeps every assertion
// reel-plan's check 10 made of the video refusal (S-077). No worker runs: both answers are given at
// submit, before any job is claimed.

let engine: Engine

before(async () => {
  engine = await startEngine({ worker: false })
})

after(async () => {
  await engine.stop()
})

// ---------------------------------------------------------------- 7

test("7. a submit with until 'video' is accepted with a runId; and one with planVaryOn 'order' is refused 422 'unsupported', with its requestId, a detail saying not built yet, no runId, and no run stored", async () => {
  const video = validRequest('r7-video')
  video.options.until = 'video'
  const accepted = await engine.http.submit(video)
  assert.equal(accepted.status, 202, JSON.stringify(accepted.json))
  assert.equal(accepted.json.outcome, 'accepted')
  assert.equal(accepted.json.requestId, 'r7-video')
  assert.equal(typeof accepted.json.runId, 'string')
  assert.equal(accepted.json.replayed, false)
  const runId = String(accepted.json.runId)

  // A run, not an answer given and forgotten: found by its requestId, beginning with its plan job
  // alone — the chain's later rows are made by the jobs before them (D-081, D-083).
  const lookup = await engine.http.lookup('r7-video')
  assert.equal(lookup.status, 200, 'the accepted video request was not stored as a run')
  assert.equal(lookup.json.runId, runId)
  assert.deepEqual(
    engine
      .query<{ kind: string; correlation_id: string }>(
        'SELECT kind, correlation_id FROM job WHERE correlation_id = ?',
        runId,
      )
      .map((j) => ({ ...j })),
    [{ kind: 'reel.plan', correlation_id: runId }],
    'an accepted video request does not begin with exactly one reel.plan job',
  )

  // The axis refusal holds for a video request too: plans still differ on shotCount only (D-110).
  const order = validRequest('r7-order')
  order.options.until = 'video'
  order.options.planVaryOn = 'order'
  const refused = await engine.http.submit(order)
  assert.equal(refused.status, 422, JSON.stringify(refused.json))
  assert.equal(refused.json.outcome, 'refused')
  assert.equal(refused.json.reason, 'unsupported')
  assert.equal(refused.json.requestId, 'r7-order')
  assert.match(String(refused.json.detail), /not built yet/, 'Gate 1: it says "not built yet"')
  assert.ok(!('runId' in refused.json), 'a refusal carried a runId')
  assert.equal(
    (await engine.http.lookup('r7-order')).status,
    404,
    'the refused request was stored as a run anyway',
  )
  assert.deepEqual(
    engine.query<{ request_id: string }>('SELECT request_id FROM run').map((r) => r.request_id),
    ['r7-video'],
    'a run other than the accepted one is stored',
  )
})
