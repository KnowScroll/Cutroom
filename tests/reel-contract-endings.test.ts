import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, before, test } from 'node:test'
import { client } from './stand-in/client.ts'
import { validRequest } from './stand-in/fixtures.ts'
import { startStandIn, type StandIn, type Until } from './stand-in/reel-engine-stand-in.ts'

// reel-contract, Slice 4 — the answers that are not a reel (docs/features/reel-contract.md,
// checks 22–26). Each outcome is forced through the stand-in; these prove the contract's
// answers are complete and consistent, not that the real engine gives them.

const CAP = 300

let service: StandIn
let storageDir: string
let api: ReturnType<typeof client>

before(async () => {
  storageDir = mkdtempSync(join(tmpdir(), 'reel-contract-slice4-'))
  service = await startStandIn({
    storageDir,
    canProduce: ['plan', 'stills', 'video'],
    capCents: CAP,
  })
  api = client(service.baseUrl)
})

after(async () => {
  await service.stop()
  rmSync(storageDir, { recursive: true, force: true })
})

async function run(requestId: string, until: Until, budgetCents: number) {
  const request = validRequest(requestId)
  request.options.until = until
  request.options.budgetCents = budgetCents
  const { status, json } = await api.submit(request)
  assert.equal(status, 202)
  return String(json.runId)
}

async function finish(runId: string) {
  service.runToEnd(runId)
  const result = await api.result(runId)
  assert.equal(result.status, 200)
  return result.json
}

const types = async (runId: string, since = 0) =>
  (await api.events(runId, since)).json.events as Array<{ type: string; stage?: string }>

// ---------------------------------------------------------------- 22

test('22. a plan-only request above its ceiling still completes, with an estimate and costCents 0', async () => {
  service.script('r22-over-ceiling', { kind: 'complete', estimateCents: 250 })
  const runId = await run('r22-over-ceiling', 'plan', 100)
  const result = await finish(runId)
  assert.equal(result.status, 'completed')
  assert.equal(result.until, 'plan')
  assert.equal(result.estimateCents, 250)
  assert.equal(result.costCents, 0)
})

test("22. a plan-only request whose plans all exceed the per-reel cap is refused for budget, limit 'reel'", async () => {
  service.script('r22-over-cap', { kind: 'allPlansOverCap', lowestEstimateCents: 420 })
  const runId = await run('r22-over-cap', 'plan', 1000)
  const result = await finish(runId)
  assert.equal(result.status, 'refused')
  assert.equal(result.reason, 'budget')
  assert.equal(result.limit, 'reel')
  assert.equal(result.estimateCents, 420, 'estimateCents must be the lowest plan estimate')
  assert.equal(result.capCents, CAP)
  assert.equal(result.ceilingCents, 1000)
})

// ---------------------------------------------------------------- 23

test('23. a full run over its ceiling is refused for budget with all four figures, and no stills stage', async () => {
  service.script('r23', { kind: 'complete', estimateCents: 250 })
  const runId = await run('r23', 'stills', 200)
  const result = await finish(runId)
  assert.equal(result.status, 'refused')
  assert.equal(result.reason, 'budget')
  assert.equal(result.limit, 'ceiling')
  assert.equal(result.estimateCents, 250)
  assert.equal(result.ceilingCents, 200)
  assert.equal(result.capCents, CAP)
  const stages = (await types(runId)).filter((e) => e.stage === 'stills')
  assert.deepEqual(stages, [], 'a stills stage started for a run refused before any picture')
})

// ---------------------------------------------------------------- 24

test('24. a run stopped for budget carries the same figures, and what it spent', async () => {
  service.script('r24', {
    kind: 'stopBudget',
    estimateCents: 250,
    spentCents: 180,
    limit: 'ceiling',
  })
  const runId = await run('r24', 'video', 280)
  const result = await finish(runId)
  assert.equal(result.status, 'stopped')
  assert.equal(result.reason, 'budget')
  assert.equal(result.limit, 'ceiling')
  assert.equal(result.estimateCents, 250)
  assert.equal(result.ceilingCents, 280)
  assert.equal(result.capCents, CAP)
  assert.equal(result.costCents, 180, 'what was spent is costCents')
})

// ---------------------------------------------------------------- 25

test('25. a rule stop — here, narration that cannot be planned — names the rule and the step', async () => {
  service.script('r25-rule', {
    kind: 'stopRule',
    rule: 'D-063',
    step: 'plan',
    detail: 'the narration cannot be planned into 4–6 shots',
  })
  const result = await finish(await run('r25-rule', 'video', 300))
  assert.equal(result.status, 'stopped')
  assert.equal(result.reason, 'rule')
  assert.equal(result.rule, 'D-063')
  assert.equal(result.step, 'plan')
})

test('25. an internal failure finishes as failed, with a detail', async () => {
  service.script('r25-fail', { kind: 'fail', detail: 'provider outage' })
  const result = await finish(await run('r25-fail', 'stills', 300))
  assert.equal(result.status, 'failed')
  assert.equal(result.detail, 'provider outage')
})

test('25. a request the engine cannot serve at all is 500 ErrorResponse "internal"', async () => {
  const runId = await run('r25-500', 'plan', 300)
  service.failNextRequest()
  const broken = await api.status(runId)
  assert.equal(broken.status, 500)
  assert.equal(broken.json.error, 'internal')
  const recovered = await api.status(runId)
  assert.equal(recovered.status, 200, 'the failure was not limited to one request')
})

// ---------------------------------------------------------------- 26

test('26. cancel: running at first, finished later, no stage after it, and the result is cancelled', async () => {
  const runId = await run('r26', 'video', 300)
  service.advance(runId)
  const cancelled = await api.cancel(runId)
  assert.equal(cancelled.status, 200)
  assert.equal(
    cancelled.json.state,
    'running',
    'cancel must answer running until the stop takes effect',
  )
  const seqAtCancel = Number(cancelled.json.lastSeq)

  service.runToEnd(runId)
  const status = await api.status(runId)
  assert.equal(status.json.state, 'finished')
  const later = await types(runId, seqAtCancel)
  assert.deepEqual(
    later.filter((e) => e.type === 'stage.started'),
    [],
    'a stage started after the cancel',
  )
  assert.equal((await api.result(runId)).json.status, 'cancelled')
})

test('26. cancelling a finished run returns 200 with its finished status; an unknown run is 404', async () => {
  const runId = await run('r26-finished', 'plan', 300)
  service.runToEnd(runId)
  const reply = await api.cancel(runId)
  assert.equal(reply.status, 200)
  assert.equal(reply.json.state, 'finished')
  assert.equal(
    (await api.result(runId)).json.status,
    'completed',
    'cancel changed a finished result',
  )

  const unknown = await api.cancel('no-such-run')
  assert.equal(unknown.status, 404)
  assert.equal(unknown.json.error, 'not-found')
})
