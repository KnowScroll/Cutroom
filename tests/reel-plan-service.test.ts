import assert from 'node:assert/strict'
import { connect } from 'node:net'
import { networkInterfaces } from 'node:os'
import { after, before, test } from 'node:test'
import { EXPECTED, type Reply, type Route } from './stand-in/client.ts'
import { finished, startEngine, type Engine } from './engine/harness.ts'
import { validRequest } from './stand-in/fixtures.ts'

// reel-plan, Slice 1 — the service itself (docs/features/reel-plan.md, checks 12 and 13): where it
// listens, and whether every answer it gives is one the contract describes.

let engine: Engine

before(async () => {
  engine = await startEngine({ worker: true })
})

after(async () => {
  await engine.stop()
})

// ---------------------------------------------------------------- 12

function isLoopback(address: string): boolean {
  return address === '::1' || /^127\./.test(address) || /^::ffff:127\./.test(address)
}

/** Resolves true if a TCP connection to host:port is accepted, false if it is refused or hangs. */
function accepts(host: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = connect({ host, port })
    const done = (ok: boolean) => {
      socket.destroy()
      resolve(ok)
    }
    socket.setTimeout(2000, () => done(false))
    socket.once('connect', () => done(true))
    socket.once('error', () => done(false))
  })
}

test('12. the API binds to a loopback address', async () => {
  const { address, port } = engine.api.address
  assert.ok(isLoopback(address), `the API is listening on ${address}, which is not loopback`)
  assert.ok(await accepts('127.0.0.1', port), 'the API does not answer on loopback at all')

  // Listening on every interface and reporting loopback would pass the line above; a connection
  // through this machine's own non-loopback address is what tells them apart.
  const external = Object.values(networkInterfaces())
    .flat()
    .filter((i) => i !== undefined && i.family === 'IPv4' && !i.internal)
    .map((i) => i?.address as string)
  for (const host of external) {
    assert.equal(await accepts(host, port), false, `the API accepted a connection on ${host}`)
  }
})

// ---------------------------------------------------------------- 13

// Every reply below goes through ../stand-in/client.ts, which fails on a body that does not parse
// under the schema the contract gives that route and status. This test's own job is coverage:
// that every status the contract gives every route was actually produced, so no answer went
// unchecked because nothing asked for it.

test('13. every body the service sends on every route parses under its @cutroom/reel-contract schema', async () => {
  const seen = new Set<string>()
  const hit = (route: Route, reply: Reply, status: number) => {
    assert.equal(reply.status, status, `${route}: ${JSON.stringify(reply.json)}`)
    seen.add(`${route} ${status}`)
    return reply
  }
  const { http } = engine

  // submit
  const accepted = hit('submit', await http.submit(validRequest('r13')), 202)
  const runId = String(accepted.json.runId)
  hit('submit', await http.submit(validRequest('r13')), 202)
  const changed = validRequest('r13')
  changed.options.budgetCents = 999
  hit('submit', await http.submit(changed), 409)
  hit('submit', await http.submit({ ...validRequest('r13-v'), contractVersion: 2 }), 422)
  hit('submit', await http.call('POST', '/v1/runs', undefined, '{ not json'), 422)
  hit('submit', await http.call('POST', '/v1/runs', undefined, '[1, 2]'), 422)
  hit('submit', await http.submit({ ...validRequest('r13-s'), sources: ['a book'] }), 422)
  const video = validRequest('r13-video')
  video.options.until = 'video'
  hit('submit', await http.submit(video), 422)

  // lookup and status
  hit('lookup', await http.lookup('r13'), 200)
  hit('lookup', await http.lookup('never-sent'), 404)
  hit('lookup', await http.call('GET', '/v1/runs'), 400)
  hit('lookup', await http.call('GET', '/v1/runs?requestId='), 400)
  hit('status', await http.status(runId), 200)
  hit('status', await http.status('no-such-run'), 404)

  // events, before and after the run finishes
  hit('events', await http.events(runId), 200)
  hit('events', await http.events(runId, 0), 200)
  hit('events', await http.events(runId, 1), 200)
  hit('events', await http.events(runId, -1), 400)
  hit('events', await http.events(runId, 'abc'), 400)
  hit('events', await http.events('no-such-run'), 404)

  // result and record, on a run that has not finished — a second engine with no worker, so the
  // run is certain still to be running when asked
  const idle = await startEngine({ worker: false })
  try {
    const waiting = await idle.http.submit(validRequest('r13-waiting'))
    const waitingId = String(waiting.json.runId)
    hit('result', await idle.http.result(waitingId), 409)
    hit('record', await idle.http.record(waitingId), 409)
  } finally {
    await idle.stop()
  }

  await finished(engine, runId)
  hit('events', await http.events(runId), 200)
  hit('result', await http.result(runId), 200)
  hit('result', await http.result('no-such-run'), 404)
  hit('record', await http.record(runId), 200)
  hit('record', await http.record('no-such-run'), 404)

  hit('cancel', await http.cancel(runId), 200)
  hit('cancel', await http.cancel('no-such-run'), 404)

  // 500 on every route: a second engine whose tables are removed underneath it, so every read and
  // write the service makes fails inside the engine, not in the request.
  const broken = await startEngine({ worker: false })
  try {
    const doomed = await broken.http.submit(validRequest('r13-doomed'))
    const doomedId = String(doomed.json.runId)
    for (const table of ['run_event', 'plan', 'model_receipt', 'job', 'run']) {
      broken.query(`DROP TABLE ${table}`)
    }
    hit('submit', await broken.http.submit(validRequest('r13-after')), 500)
    hit('lookup', await broken.http.lookup('r13-doomed'), 500)
    hit('status', await broken.http.status(doomedId), 500)
    hit('events', await broken.http.events(doomedId), 500)
    hit('result', await broken.http.result(doomedId), 500)
    hit('record', await broken.http.record(doomedId), 500)
    hit('cancel', await broken.http.cancel(doomedId), 500)
  } finally {
    await broken.stop()
  }

  const everyStatus = Object.entries(EXPECTED).flatMap(([route, statuses]) =>
    Object.keys(statuses).map((status) => `${route} ${status}`),
  )
  assert.deepEqual(
    everyStatus.filter((pair) => !seen.has(pair)),
    [],
    'a status the contract gives a route was never produced, so its body was never checked',
  )
})
