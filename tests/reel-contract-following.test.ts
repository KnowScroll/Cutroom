import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { isAbsolute, join } from 'node:path'
import { after, before, test } from 'node:test'
import { client } from './stand-in/client.ts'
import { validRequest } from './stand-in/fixtures.ts'
import { startStandIn, type StandIn, type Until } from './stand-in/reel-engine-stand-in.ts'

// reel-contract, Slice 3 — following a run and receiving it (docs/features/reel-contract.md,
// checks 17–21). Behaviour checks against a stand-in; they prove nothing about the real engine.
// Every reply passes through ./stand-in/client.ts, which fails the test on any body the
// contract does not describe for that route and status — that is check 18.

let service: StandIn
let storageDir: string
let api: ReturnType<typeof client>

before(async () => {
  storageDir = mkdtempSync(join(tmpdir(), 'reel-contract-slice3-'))
  service = await startStandIn({ storageDir, canProduce: ['plan', 'stills', 'video'] })
  api = client(service.baseUrl)
})

after(async () => {
  await service.stop()
  rmSync(storageDir, { recursive: true, force: true })
})

async function accepted(requestId: string, until: Until = 'video') {
  const request = validRequest(requestId)
  request.options.until = until
  const { status, json } = await api.submit(request)
  assert.equal(status, 202)
  return String(json.runId)
}

const eventsOf = (json: Record<string, unknown>) =>
  json.events as Array<{ seq: number; type: string; at: string; stage?: string }>

// ---------------------------------------------------------------- 17

test('17. an accepted submit returns 202 before any stage finishes', async () => {
  const runId = await accepted('r17-early')
  const page = await api.events(runId)
  const types = eventsOf(page.json).map((e) => e.type)
  assert.deepEqual(types, ['run.accepted'], 'a stage had already progressed when submit returned')
  const status = await api.status(runId)
  assert.equal(status.json.state, 'running')
})

test('17. events are numbered from 1, never renumbered, and since=n returns exactly those after n', async () => {
  const runId = await accepted('r17-seq')
  service.advance(runId)
  service.advance(runId)
  const firstLook = eventsOf((await api.events(runId)).json)
  assert.deepEqual(
    firstLook.map((e) => e.seq),
    firstLook.map((_, i) => i + 1),
    'events are not numbered 1..n',
  )

  service.runToEnd(runId)
  const all = eventsOf((await api.events(runId)).json)
  assert.deepEqual(
    all.slice(0, firstLook.length),
    firstLook,
    'earlier events changed after more arrived',
  )

  const after2 = await api.events(runId, 2)
  assert.deepEqual(
    eventsOf(after2.json).map((e) => e.seq),
    all.filter((e) => e.seq > 2).map((e) => e.seq),
  )
  assert.equal(after2.json.nextSince, all.at(-1)?.seq)

  const pastTheEnd = await api.events(runId, all.length + 5)
  assert.deepEqual(eventsOf(pastTheEnd.json), [])
  assert.equal(
    pastTheEnd.json.nextSince,
    all.length + 5,
    'nextSince must echo since when nothing is returned',
  )

  const absent = await api.events(runId)
  assert.equal(eventsOf(absent.json)[0]?.seq, 1, 'since absent must mean 0')
})

test('17. a since that is not a whole number ≥ 0 is 400', async () => {
  const runId = await accepted('r17-bad-since')
  for (const since of ['-1', 'abc', '1.5', '']) {
    const { status, json } = await api.call('GET', `/v1/runs/${runId}/events?since=${since}`)
    assert.equal(status, 400, `since="${since}"`)
    assert.equal(json.error, 'invalid')
  }
})

test('17. an unknown runId is 404 on events, result and record — and a known one is not', async () => {
  // The second half is what makes the first mean something: a service that answers 404 to every
  // path it does not recognise would pass the first half without implementing any of the three.
  const runId = await accepted('r17-known')
  for (const reply of [await api.events(runId), await api.result(runId), await api.record(runId)]) {
    assert.notEqual(reply.status, 404, 'a known run was answered as not found')
  }
  for (const reply of [
    await api.events('no-such-run'),
    await api.result('no-such-run'),
    await api.record('no-such-run'),
  ]) {
    assert.equal(reply.status, 404)
    assert.equal(reply.json.error, 'not-found')
  }
})

// ---------------------------------------------------------------- 18

test("18. every event's at is ISO 8601 in UTC", async () => {
  const runId = await accepted('r18')
  service.runToEnd(runId)
  for (const event of eventsOf((await api.events(runId)).json)) {
    assert.match(event.at, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/, event.at)
    assert.equal(new Date(event.at).toISOString().slice(0, 19), event.at.slice(0, 19))
  }
})

// Since resume-failed's Slice 4 (S-161, S-162): the resume route is served, and every body it
// answers parses under the schema the contract gives that status — which ./stand-in/client.ts checks.
// The stand-in never resumes: a known run is refused as unsupported, and an unknown one is 404.
test('18. every body the stand-in serves on the resume route parses under its schema: a resume of a known run parses as refused, reason unsupported, its runId the run; of an unknown one, 404 not-found', async () => {
  const runId = await accepted('r18-resume')
  service.runToEnd(runId)
  const known = await api.resume(runId, { remake: [{ kind: 'still', shot: 'shot-0' }] })
  assert.equal(known.status, 422)
  assert.equal(known.json.outcome, 'refused')
  assert.equal(known.json.reason, 'unsupported')
  assert.equal(known.json.runId, runId)
  const unknown = await api.resume('no-such-run')
  assert.equal(unknown.status, 404)
  assert.equal(unknown.json.error, 'not-found')
})

// ---------------------------------------------------------------- 19

test('19. result and record before the run finishes are 409 with RunStatus', async () => {
  const runId = await accepted('r19-early')
  service.advance(runId)
  for (const reply of [await api.result(runId), await api.record(runId)]) {
    assert.equal(reply.status, 409)
    assert.equal(reply.json.state, 'running')
  }
})

test('19. after it finishes, a RunResult matching its until and a RunRecord', async () => {
  for (const until of ['plan', 'stills', 'video'] as const) {
    const runId = await accepted(`r19-${until}`, until)
    service.runToEnd(runId)

    const status = await api.status(runId)
    assert.equal(status.json.state, 'finished')
    const last = eventsOf((await api.events(runId)).json).at(-1)
    assert.equal(last?.type, 'run.finished', 'the last event does not say the run finished')

    const result = await api.result(runId)
    assert.equal(result.status, 200)
    assert.equal(result.json.status, 'completed')
    assert.equal(result.json.until, until)
    assert.equal('stills' in result.json, until !== 'plan', `${until}: stills present-ness wrong`)
    assert.equal('video' in result.json, until === 'video', `${until}: video present-ness wrong`)
    if (until === 'plan')
      assert.equal(result.json.costCents, 0, 'a plan-only run spent on generation')

    const record = await api.record(runId)
    assert.equal(record.status, 200)
  }
})

// ---------------------------------------------------------------- 20

test('20. stills and video are absolute paths, never bytes', async () => {
  const runId = await accepted('r20', 'video')
  service.runToEnd(runId)
  const { json } = await api.result(runId)
  const stills = json.stills as Array<{ path: string }>
  assert.ok(stills.length > 0)
  for (const still of stills) assert.ok(isAbsolute(still.path), still.path)
  assert.ok(isAbsolute((json.video as { path: string }).path))
})

// ---------------------------------------------------------------- 21

test("21. record has one entry per picture made, both candidates of a shot, and every chosen picture is in the result's stills", async () => {
  const runId = await accepted('r21', 'stills')
  service.runToEnd(runId)
  const result = (await api.result(runId)).json
  const record = (await api.record(runId)).json
  const pictures = record.pictures as Array<{ pictureId: string; shotId: string; chosen: boolean }>

  const perShot = new Map<string, number>()
  for (const p of pictures) perShot.set(p.shotId, (perShot.get(p.shotId) ?? 0) + 1)
  assert.ok(
    [...perShot.values()].some((n) => n >= 2),
    'no shot shows both of its candidates',
  )

  const ids = pictures.map((p) => p.pictureId)
  assert.equal(new Set(ids).size, ids.length, 'a picture is listed twice')

  const chosen = new Set(pictures.filter((p) => p.chosen).map((p) => p.pictureId))
  const inResult = new Set((result.stills as Array<{ pictureId: string }>).map((s) => s.pictureId))
  assert.deepEqual(
    [...inResult].sort(),
    [...chosen].sort(),
    'chosen pictures and result stills disagree',
  )
})
