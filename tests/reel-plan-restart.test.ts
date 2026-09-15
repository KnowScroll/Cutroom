import assert from 'node:assert/strict'
import { test } from 'node:test'
import { startEngine, waitFor } from './engine/harness.ts'
import { answerA, planRequest, twoSurvivors } from './engine/plans.ts'

// reel-plan, Slice 5 — restart (docs/features/reel-plan.md, check 46). The worker runs in a process
// of its own and is killed while its stand-in holds the second planning call open: the run's stage
// has started, the first call's receipt is written, and nothing else is. The API is stopped and
// started again on the same file, and a new worker takes the job up once its lease has run out
// (D-002, S-027) and runs it again from the start.

type Event = { seq: number; type: string; stage?: string }
const eventsOf = (json: Record<string, unknown>) => json.events as Event[]

interface JobRow {
  state: string
  attempts: number
  locked_at: string | null
  lease_until: string | null
}

test('46. after the API and worker restart mid-run, the run is found by requestId, events resume without gaps or repeats, and the run finishes', async () => {
  const engine = await startEngine({ worker: false })
  try {
    const request = planRequest('r46')
    const submitted = await engine.http.submit(request)
    assert.equal(submitted.status, 202)
    const runId = String(submitted.json.runId)

    // ---------------------------------------------------------------- mid-run, then a crash
    const crashed = engine.spawnWorker({
      script: { planner: [{ value: answerA() }] },
      holdAtCall: 2,
      leaseMs: 1000,
    })
    await crashed.held

    const seenPage = await engine.http.events(runId)
    const seen = eventsOf(seenPage.json)
    const lastSeen = Number(seenPage.json.nextSince)
    assert.deepEqual(
      seen.map((e) => [e.seq, e.type]),
      [
        [1, 'run.accepted'],
        [2, 'stage.started'],
      ],
      'the run was not in the middle of its plan stage when the worker was killed',
    )
    const [firstClaim] = engine.query<JobRow>(
      'SELECT state, attempts, locked_at, lease_until FROM job',
    )
    assert.equal(firstClaim?.state, 'running')
    assert.equal(firstClaim?.attempts, 1)
    const receiptsBefore = engine.query<{ id: number }>(
      'SELECT id FROM model_receipt WHERE run_id = ? ORDER BY id',
      runId,
    )
    assert.equal(receiptsBefore.length, 1, 'the call that returned before the crash has no receipt')

    await crashed.kill()

    // ---------------------------------------------------------------- the restart
    const oldBaseUrl = engine.api.baseUrl
    await engine.restart({ script: twoSurvivors() })
    assert.notEqual(engine.api.baseUrl, oldBaseUrl, 'the API was not started again')

    const found = await engine.http.lookup('r46')
    assert.equal(found.status, 200, 'the run was not found by requestId after the restart')
    assert.equal(found.json.runId, runId)
    assert.equal(found.json.state, 'running')
    assert.equal(found.json.lastSeq, lastSeen, 'events were lost or added across the restart')

    const replay = await engine.http.submit(request)
    assert.equal(replay.status, 202)
    assert.equal(
      replay.json.runId,
      runId,
      'the same request started a second run after the restart',
    )
    assert.equal(replay.json.replayed, true)

    await engine.startWorker()
    await waitFor(`run ${runId} to finish after the restart`, async () => {
      return (await engine.http.status(runId)).json.state === 'finished'
    }).catch((error: unknown) => {
      const [job] = engine.query<JobRow>('SELECT state, attempts, locked_at, lease_until FROM job')
      assert.equal(
        job?.attempts,
        2,
        `the killed worker's job was never claimed again: ${String(error)}`,
      )
      throw error
    })

    // ---------------------------------------------------------------- the run finished
    const result = await engine.http.result(runId)
    assert.deepEqual(result.json, {
      contractVersion: 1,
      runId,
      requestId: 'r46',
      status: 'completed',
      until: 'plan',
      estimateCents: 205,
      costCents: 0,
    })

    const resumed = eventsOf((await engine.http.events(runId, lastSeen)).json)
    assert.deepEqual(
      resumed.map((e) => e.seq),
      resumed.map((_, i) => lastSeen + 1 + i),
      'events after the restart do not follow on from the last seen number',
    )
    assert.deepEqual(
      resumed.map((e) => e.type),
      ['verdict', 'verdict', 'stage.finished', 'run.finished'],
    )
    const all = eventsOf((await engine.http.events(runId)).json)
    assert.deepEqual(all, [...seen, ...resumed], 'the event history changed across the restart')
    assert.equal(
      all.filter((e) => e.type === 'stage.started' && e.stage === 'plan').length,
      1,
      'stage.started was written twice',
    )

    // Run again from the start: both planning calls and both score calls, with a receipt each; the
    // receipt written before the crash stays (D-005). Extra receipts are allowed (Gate review 2).
    assert.equal(engine.model.calls.length, 4)
    const receipts = engine.query<{ id: number; role: string }>(
      'SELECT id, role FROM model_receipt WHERE run_id = ? ORDER BY id',
      runId,
    )
    assert.deepEqual(
      receipts.map((r) => r.role),
      ['planner', 'planner', 'planner', 'reconciler', 'reconciler'],
    )
    assert.equal(receipts[0]?.id, receiptsBefore[0]?.id)
    assert.deepEqual(
      engine
        .query<{ role: string; selected: number }>(
          'SELECT role, selected FROM plan WHERE run_id = ? ORDER BY role',
          runId,
        )
        .map((p) => [p.role, p.selected]),
      [
        ['a', 0],
        ['b', 1],
      ],
    )

    // One job row, claimed twice: the second claim no earlier than the first lease ran out, so a
    // job whose worker may still be alive is never taken from it (D-002).
    const [job] = engine.query<JobRow>('SELECT state, attempts, locked_at, lease_until FROM job')
    assert.equal(job?.state, 'done')
    assert.equal(job?.attempts, 2)
    assert.ok(
      String(job?.locked_at) >= String(firstClaim?.lease_until),
      `the job was claimed again at ${job?.locked_at}, before its lease ran out at ${firstClaim?.lease_until}`,
    )
  } finally {
    await engine.stop()
  }
})
