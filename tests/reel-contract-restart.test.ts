import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, before, test } from 'node:test'
import { client } from './stand-in/client.ts'
import { validRequest } from './stand-in/fixtures.ts'
import { startStandIn, type StandIn } from './stand-in/reel-engine-stand-in.ts'

// reel-contract, Slice 5 — restart (docs/features/reel-contract.md, check 27). The stand-in is
// stopped mid-run and a new one is started on the same storage, as a caller would meet an engine
// that crashed and came back. It proves the contract's answers survive a restart, not that the
// real engine's do.

let storageDir: string
const running: StandIn[] = []

async function start() {
  const service = await startStandIn({ storageDir, canProduce: ['plan', 'stills', 'video'] })
  running.push(service)
  return service
}

async function stop(service: StandIn) {
  await service.stop()
  running.splice(running.indexOf(service), 1)
}

before(() => {
  storageDir = mkdtempSync(join(tmpdir(), 'reel-contract-slice5-'))
})

after(async () => {
  for (const service of [...running]) await service.stop()
  rmSync(storageDir, { recursive: true, force: true })
})

type Event = { seq: number; type: string }
const eventsOf = (json: Record<string, unknown>) => json.events as Event[]

test('27. after a restart the run is found by requestId, and events resume after the last seen number without gaps or repeats', async () => {
  const first = await start()
  const before = client(first.baseUrl)
  const request = validRequest('r27')
  request.options.until = 'stills'

  const submitted = await before.submit(request)
  assert.equal(submitted.status, 202)
  const runId = String(submitted.json.runId)
  first.advance(runId)
  first.advance(runId)
  first.advance(runId)
  const seenPage = await before.events(runId)
  const seen = eventsOf(seenPage.json)
  const lastSeen = Number(seenPage.json.nextSince)
  assert.ok(lastSeen > 1, 'the run had not progressed before the restart')

  await stop(first)
  const second = await start()
  assert.notEqual(second.baseUrl, first.baseUrl, 'the restart did not start a new service')
  const afterRestart = client(second.baseUrl)

  const found = await afterRestart.lookup('r27')
  assert.equal(found.status, 200, 'the run was not found by requestId after the restart')
  assert.equal(found.json.runId, runId)
  assert.equal(found.json.state, 'running')
  assert.equal(found.json.lastSeq, lastSeen, 'events were lost or added across the restart')

  const replay = await afterRestart.submit(request)
  assert.equal(replay.status, 202)
  assert.equal(replay.json.runId, runId, 'the same request started a second run after the restart')
  assert.equal(replay.json.replayed, true)

  const nothingNew = await afterRestart.events(runId, lastSeen)
  assert.deepEqual(eventsOf(nothingNew.json), [])
  assert.equal(nothingNew.json.nextSince, lastSeen)

  second.runToEnd(runId)
  const resumed = eventsOf((await afterRestart.events(runId, lastSeen)).json)
  assert.ok(resumed.length > 0, 'the run did not carry on after the restart')
  assert.deepEqual(
    resumed.map((e) => e.seq),
    resumed.map((_, i) => lastSeen + 1 + i),
    'events after the restart do not follow on from the last seen number',
  )

  const all = eventsOf((await afterRestart.events(runId)).json)
  assert.deepEqual(all, [...seen, ...resumed], 'the event history changed across the restart')
  assert.equal(
    all.filter((e) => e.type === 'stage.started' && 'stage' in e && e.stage === 'plan').length,
    1,
    'the run started again from the beginning',
  )

  const result = await afterRestart.result(runId)
  assert.equal(result.status, 200)
  assert.equal(result.json.status, 'completed')
  assert.equal(result.json.until, 'stills')
})
