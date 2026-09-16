import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { startEngine, type Engine } from './engine/harness.ts'
import { validRequest } from './stand-in/fixtures.ts'

// reel-stills, Slice 2 — check 8 (docs/features/reel-stills.md): what this engine now answers.
// D-108 scoped the stills refusal to "a reel-plan build"; with the chain built, `stills` is
// accepted and `video` alone is still refused (S-047). No worker runs here: both answers are
// given at submit, before any job is claimed.

let engine: Engine

before(async () => {
  engine = await startEngine({ worker: false })
})

after(async () => {
  await engine.stop()
})

// ---------------------------------------------------------------- 8

test("8. a submit with until 'stills' is accepted; one with until 'video' is refused 422 'unsupported' with no runId", async () => {
  const stills = validRequest('r8-stills')
  stills.options.until = 'stills'
  const accepted = await engine.http.submit(stills)
  assert.equal(accepted.status, 202, JSON.stringify(accepted.json))
  assert.equal(accepted.json.outcome, 'accepted')
  assert.equal(accepted.json.requestId, 'r8-stills')
  assert.equal(typeof accepted.json.runId, 'string')
  assert.equal(accepted.json.replayed, false)

  // It is a run, not an answer given and forgotten: it is found by its requestId, with one job.
  const lookup = await engine.http.lookup('r8-stills')
  assert.equal(lookup.status, 200, 'the accepted stills request was not stored as a run')
  assert.equal(lookup.json.runId, accepted.json.runId)
  const jobs = engine.query<{ kind: string; correlation_id: string }>(
    'SELECT kind, correlation_id FROM job WHERE correlation_id = ?',
    String(accepted.json.runId),
  )
  assert.deepEqual(
    jobs.map((j) => ({ ...j })),
    [{ kind: 'reel.plan', correlation_id: String(accepted.json.runId) }],
    'an accepted stills request does not begin with exactly one reel.plan job',
  )

  // Video is reel-render's, and is refused before anything is stored (D-108).
  const video = validRequest('r8-video')
  video.options.until = 'video'
  const refused = await engine.http.submit(video)
  assert.equal(refused.status, 422, JSON.stringify(refused.json))
  assert.equal(refused.json.outcome, 'refused')
  assert.equal(refused.json.reason, 'unsupported')
  assert.equal(refused.json.requestId, 'r8-video')
  assert.match(String(refused.json.detail), /not built yet/, 'Gate 1: it says "not built yet"')
  assert.ok(!('runId' in refused.json), 'a refusal carried a runId')
  assert.equal(
    (await engine.http.lookup('r8-video')).status,
    404,
    'the refused video request was stored as a run anyway',
  )

  // And a plan-only request is still answered as reel-plan answers it.
  const plan = await engine.http.submit(validRequest('r8-plan'))
  assert.equal(plan.status, 202, "until 'plan' must still be accepted")
})
