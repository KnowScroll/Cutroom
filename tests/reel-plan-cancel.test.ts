import assert from 'node:assert/strict'
import { readdirSync } from 'node:fs'
import { test } from 'node:test'
import { finished, run, startEngine, waitFor, type Engine } from './engine/harness.ts'
import { answerA, planRequest, twoSurvivors } from './engine/plans.ts'

// reel-plan, Slice 5 — cancel (docs/features/reel-plan.md, check 45). The worker reads the cancel
// flag before the plan stage starts; if it is set, the run finishes `cancelled` and no stage starts.
// A cancel during the stage is not required to stop it (Gate review 2), and is not tested here.

type Event = { seq: number; type: string; status?: string }
const eventsOf = (json: Record<string, unknown>) => json.events as Event[]

/** Every file the engine left in its folder, apart from the database and its journal files. */
function written(engine: Engine): string[] {
  return readdirSync(engine.dir).filter((f) => !/^engine\.sqlite(-wal|-shm|-journal)?$/.test(f))
}

test('45. cancel before the plan stage starts finishes the run cancelled with no stage.started event; cancelling a finished run returns its finished status', async () => {
  // No worker yet, so the run is certain not to have started its stage when the cancel arrives.
  // The stand-in holds a whole run's answers: a worker that ignored the flag would complete it.
  const engine = await startEngine({ worker: false, script: twoSurvivors() })
  try {
    const submitted = await engine.http.submit(planRequest('r45'))
    assert.equal(submitted.status, 202)
    const runId = String(submitted.json.runId)

    const cancelled = await engine.http.cancel(runId)
    assert.equal(cancelled.status, 200)
    assert.deepEqual(cancelled.json, {
      contractVersion: 1,
      runId,
      requestId: 'r45',
      state: 'running',
      lastSeq: 1,
    })
    // Asking twice is the same request.
    assert.deepEqual((await engine.http.cancel(runId)).json, cancelled.json)

    await engine.startWorker()
    await finished(engine, runId)

    const result = await engine.http.result(runId)
    assert.equal(result.status, 200)
    assert.deepEqual(result.json, {
      contractVersion: 1,
      runId,
      requestId: 'r45',
      costCents: 0,
      status: 'cancelled',
    })
    const events = eventsOf((await engine.http.events(runId)).json)
    assert.deepEqual(
      events.map((e) => [e.seq, e.type, e.status]),
      [
        [1, 'run.accepted', undefined],
        [2, 'run.finished', 'cancelled'],
      ],
      'a cancelled run started its stage, or ended another way',
    )
    assert.equal(engine.model.calls.length, 0, 'a model was asked for a cancelled run')
    assert.deepEqual(engine.query('SELECT role FROM model_receipt WHERE run_id = ?', runId), [])
    assert.deepEqual(engine.query('SELECT role FROM plan WHERE run_id = ?', runId), [])
    assert.deepEqual(
      engine
        .query<{ state: string; cost_cents: number }>('SELECT state, cost_cents FROM job')
        .map((j) => ({ ...j })),
      [{ state: 'done', cost_cents: 0 }],
    )
    assert.deepEqual(written(engine), [], 'a question, or another file, was written')

    // Cancelling the finished run answers its finished status and changes nothing.
    const again = await engine.http.cancel(runId)
    assert.equal(again.status, 200)
    assert.deepEqual(again.json, {
      contractVersion: 1,
      runId,
      requestId: 'r45',
      state: 'finished',
      lastSeq: 2,
    })
    assert.deepEqual((await engine.http.result(runId)).json, result.json)
    assert.deepEqual(eventsOf((await engine.http.events(runId)).json), events)

    // The same for a run that completed: its status, and its result and events as they were.
    const done = await run(engine, planRequest('r45-done'))
    assert.equal(done.result.status, 'completed', JSON.stringify(done.result))
    const late = await engine.http.cancel(done.runId)
    assert.equal(late.status, 200)
    assert.deepEqual(late.json, {
      contractVersion: 1,
      runId: done.runId,
      requestId: 'r45-done',
      state: 'finished',
      lastSeq: done.events.length,
    })
    assert.deepEqual((await engine.http.result(done.runId)).json, done.result)
    assert.deepEqual((await engine.http.events(done.runId)).json.events, done.events)
  } finally {
    await engine.stop()
  }
})

// S-027: the flag is also read before a job interrupted mid-stage is run again. The stage has
// already started, so its one `stage.started` stays; nothing further starts and no model is asked.
test('45 (S-027). a cancel that arrives while the worker is down is read before the interrupted plan stage is run again', async () => {
  const engine = await startEngine({ worker: false })
  try {
    const submitted = await engine.http.submit(planRequest('r45-restart'))
    const runId = String(submitted.json.runId)

    const crashed = engine.spawnWorker({
      script: { planner: [{ value: answerA() }] },
      holdAtCall: 2,
      leaseMs: 1000,
    })
    await crashed.held
    await crashed.kill()

    await engine.restart({ script: twoSurvivors() })
    const cancel = await engine.http.cancel(runId)
    assert.deepEqual(
      [cancel.json.state, cancel.json.lastSeq],
      ['running', 2],
      'the interrupted run is not running with its stage started',
    )

    await engine.startWorker()
    await waitFor(`run ${runId} to finish after its lease`, async () => {
      return (await engine.http.status(runId)).json.state === 'finished'
    }).catch((error: unknown) => {
      const [job] = engine.query<{ attempts: number }>('SELECT attempts FROM job')
      assert.equal(
        job?.attempts,
        2,
        `the killed worker's job was never claimed again: ${String(error)}`,
      )
      throw error
    })
    assert.deepEqual((await engine.http.result(runId)).json, {
      contractVersion: 1,
      runId,
      requestId: 'r45-restart',
      costCents: 0,
      status: 'cancelled',
    })
    assert.deepEqual(
      eventsOf((await engine.http.events(runId)).json).map((e) => [e.seq, e.type]),
      [
        [1, 'run.accepted'],
        [2, 'stage.started'],
        [3, 'run.finished'],
      ],
    )
    assert.equal(engine.model.calls.length, 0, 'the interrupted stage was run again')
    // The receipt of the call that returned before the crash is kept (D-005).
    assert.equal(
      engine.query('SELECT role FROM model_receipt WHERE run_id = ?', runId).length,
      1,
      "the crashed worker's receipt was lost",
    )
  } finally {
    await engine.stop()
  }
})
