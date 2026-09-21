import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { planRequest } from './engine/plans.ts'
import { startService, waitFor, type Service } from './engine/service.ts'
import { described, type Event } from './engine/video.ts'
import { wireServer } from './engine/wire.ts'

// paid-path, Slice 3 — check 3 (docs/features/paid-path.md): the service loads its environment
// from the file its setting names; a key in that file reaches its adapter and appears in no row,
// receipt, event, question, log line or fault message of a completed run (S-109, D-022).
//
// This check could not fail until a real adapter existed, because a stand-in reads no key — which
// is why it moved here (S-120). It is proven in the only arrangement in which it has teeth: the
// SERVICE AS A PROCESS, with the model port told 'minimax', its key read from the environment
// file and nowhere else, and its wire served by a loopback server this test starts (S-121).
//
// Nothing here spends and nothing here needs a real key: the two planner calls a plan run makes
// are answered from tests/fixtures/wire, and the key below is a canary that exists to be hunted.

/** The canary. Distinctive enough that a single occurrence anywhere is unambiguous. */
const KEY = 'canary38-minimax-not-a-real-key'

/** The one recorded exchange a plan run needs: one answer per grouping (S-121). */
const PLAN_WIRE = ['minimax-chat-plan4', 'minimax-chat-plan6']

/** The events a completed plan run writes: the 4-unit fork survives, the 6-unit fork fails. */
const COMPLETED = [
  'run.accepted',
  'stage.started plan',
  'verdict 0 accept',
  'verdict 0 fail',
  'stage.finished plan',
  'run.finished completed',
]

/** Every file under a folder, as bytes. A key written anywhere is a key written down. */
function filesUnder(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const child = join(dir, entry)
    if (statSync(child).isDirectory()) out.push(...filesUnder(child))
    else out.push(child)
  }
  return out
}

// ---------------------------------------------------------------- 3

test('3. the service loads its environment from the file its setting names, a key in that file reaches its adapter, and the completed run holds it in no row, receipt, event, question, log line or fault message', async () => {
  const wire = await wireServer(PLAN_WIRE)
  // `started` is what the finally closes; `service` is the narrowed value the test reads, so a
  // refusal still closes the loopback server rather than leaving it listening.
  let started: Service | undefined
  try {
    const service = await startService({
      // The key is in the FILE and nowhere else: the process is started without it, so a service
      // that ignored the file it was pointed at could not make a call at all (S-109).
      envFileText: `MINIMAX_API_KEY=${KEY}\n`,
      env: {
        CUTROOM_PROVIDER_MODEL: 'minimax',
        CUTROOM_MINIMAX_BASE_URL: wire.baseUrl,
      },
    })
    started = service

    const submitted = await service.http.submit(planRequest('paid-3'))
    assert.equal(submitted.status, 202, JSON.stringify(submitted.json))
    const runId = String(submitted.json.runId)

    await waitFor(`run ${runId} to finish`, async () => {
      const { json } = await service.http.status(runId)
      return json.state === 'finished'
    })

    const result = (await service.http.result(runId)).json
    assert.equal(result.status, 'completed', JSON.stringify(result))

    const events = (await service.http.events(runId)).json.events as Event[]
    assert.deepEqual(described(events), COMPLETED)

    // THE KEY REACHED ITS ADAPTER. Without this the rest of the check is satisfied by a service
    // that never made a call — which is the failure mode check 3 exists to rule out.
    assert.equal(wire.sent.length, 2, `the run made ${wire.sent.length} model calls, not two`)
    for (const sent of wire.sent) {
      assert.equal(sent.headers.authorization, `Bearer ${KEY}`, JSON.stringify(sent.headers))
    }
    assert.deepEqual(wire.left(), [], 'a recorded answer was never asked for')

    // The receipts are a real adapter's, so `fake` is false — the one thing a real run changes
    // in a record (S-036). Anything else here would mean the stand-in answered.
    const receipts = service.query<{ model: string; role: string; fake: number }>(
      'SELECT model, role, fake FROM model_receipt',
    )
    assert.equal(receipts.length, 2, JSON.stringify(receipts))
    assert.deepEqual(
      receipts.filter((r) => r.fake !== 0),
      [],
      'a real adapter wrote a receipt saying it was a stand-in',
    )
    assert.deepEqual(
      receipts.map((r) => `${r.role} ${r.model}`),
      ['planner MiniMax-M2.7', 'planner MiniMax-M2.7'],
      'D-006 routing did not reach the receipt',
    )

    // ---- and now the key appears NOWHERE.

    // Every row of every table, whatever a later migration adds: the tables are read from the
    // database itself, so a column this check has never heard of is read too.
    const tables = service
      .query<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table'")
      .map((t) => t.name)
    assert.ok(tables.length > 0, 'the service opened no database, so no row proves anything')
    for (const table of tables) {
      const rows = service.query<Record<string, unknown>>(`SELECT * FROM "${table}"`)
      assert.doesNotMatch(JSON.stringify(rows), new RegExp(KEY), `the key is in a ${table} row`)
    }

    // The events and the answer a caller reads.
    assert.doesNotMatch(JSON.stringify(events), new RegExp(KEY), 'the key is in an event')
    assert.doesNotMatch(JSON.stringify(result), new RegExp(KEY), "the key is in the run's answer")

    // Every log line the process wrote, which is where a banner or a thrown message would put it.
    assert.doesNotMatch(service.output(), new RegExp(KEY), 'the key is in a log line')

    // Every file the service owns EXCEPT the environment file it was given — the database's bytes
    // (a value written and deleted is still in the file), the questions file, and anything a run
    // wrote under the artifact root.
    for (const file of filesUnder(service.dir)) {
      if (file === service.envFile) continue
      assert.doesNotMatch(
        readFileSync(file).toString('latin1'),
        new RegExp(KEY),
        `the key is in ${file}`,
      )
    }
  } finally {
    if (started !== undefined) {
      await started.stop()
      started.clean()
    }
    await wire.close()
  }
})

test('3. a fault message from a real adapter holds no key either: the run fails, says why, and says nothing about the key', async () => {
  // The completed run above cannot exercise a fault, and "no fault message holds the key" is half
  // of what check 3 asks. So the same service is given wire that refuses: the second planner call
  // is answered 401, which throws, fails the run, and is written into the run's own record.
  const wire = await wireServer(['minimax-chat-plan4', 'minimax-chat-denied'])
  // `started` is what the finally closes; `service` is the narrowed value the test reads, so a
  // refusal still closes the loopback server rather than leaving it listening.
  let started: Service | undefined
  try {
    const service = await startService({
      envFileText: `MINIMAX_API_KEY=${KEY}\n`,
      env: {
        CUTROOM_PROVIDER_MODEL: 'minimax',
        CUTROOM_MINIMAX_BASE_URL: wire.baseUrl,
      },
    })
    started = service

    const submitted = await service.http.submit(planRequest('paid-3-fault'))
    assert.equal(submitted.status, 202, JSON.stringify(submitted.json))
    const runId = String(submitted.json.runId)

    await waitFor(`run ${runId} to finish`, async () => {
      const { json } = await service.http.status(runId)
      return json.state === 'finished'
    })

    const result = (await service.http.result(runId)).json
    assert.equal(result.status, 'failed', JSON.stringify(result))
    assert.doesNotMatch(JSON.stringify(result), new RegExp(KEY), 'the key is in a fault message')

    const events = (await service.http.events(runId)).json.events as Event[]
    assert.doesNotMatch(JSON.stringify(events), new RegExp(KEY), 'the key is in a fault event')
    assert.doesNotMatch(service.output(), new RegExp(KEY), 'the key is in a log line')

    const tables = service
      .query<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table'")
      .map((t) => t.name)
    for (const table of tables) {
      const rows = service.query<Record<string, unknown>>(`SELECT * FROM "${table}"`)
      assert.doesNotMatch(JSON.stringify(rows), new RegExp(KEY), `the key is in a ${table} row`)
    }
    for (const file of filesUnder(service.dir)) {
      if (file === service.envFile) continue
      assert.doesNotMatch(
        readFileSync(file).toString('latin1'),
        new RegExp(KEY),
        `the key is in ${file}`,
      )
    }
  } finally {
    if (started !== undefined) {
      await started.stop()
      started.clean()
    }
    await wire.close()
  }
})
