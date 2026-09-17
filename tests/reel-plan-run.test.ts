import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { finished, startEngine, type Engine } from './engine/harness.ts'
import { validRequest } from './stand-in/fixtures.ts'

// reel-plan, Slice 1 — a run finishes (docs/features/reel-plan.md, checks 15 and 16): the worker
// claims the run's one reel.plan job and finishes it, and the event record a caller follows is
// numbered without gaps. How the run ends is not asserted here: its request has four sentences, too
// few for two plans, and that answer — stopped for rule `split` — is check 20's.

let engine: Engine

before(async () => {
  engine = await startEngine({ worker: false })
})

after(async () => {
  await engine.stop()
})

type Event = { seq: number; type: string }
const eventsOf = (json: Record<string, unknown>) => json.events as Event[]
const range = (from: number, to: number) =>
  Array.from({ length: Math.max(0, to - from + 1) }, (_, i) => from + i)

// ---------------------------------------------------------------- 15

test('15. events are numbered from 1 without gaps, since=n returns exactly the events after n, and the last event is run.finished', async () => {
  const submitted = await engine.http.submit(validRequest('r15'))
  assert.equal(submitted.status, 202)
  const runId = String(submitted.json.runId)

  // Before any worker has claimed the job: the acceptance alone, numbered 1.
  const early = await engine.http.events(runId)
  assert.deepEqual(
    eventsOf(early.json).map((e) => [e.seq, e.type]),
    [[1, 'run.accepted']],
  )
  const idle = await engine.http.events(runId, 1)
  assert.deepEqual(eventsOf(idle.json), [])
  assert.equal(idle.json.nextSince, 1)

  await engine.startWorker()
  await finished(engine, runId)

  const all = eventsOf((await engine.http.events(runId)).json)
  const seqs = all.map((e) => e.seq)
  assert.ok(all.length >= 2, `a finished run has only ${all.length} event(s)`)
  assert.deepEqual(seqs, range(1, all.length), `events are not numbered 1..n: ${seqs.join(',')}`)
  assert.equal(all[0]?.type, 'run.accepted')
  assert.equal(all.at(-1)?.type, 'run.finished', 'the last event is not run.finished')
  assert.equal(
    all.filter((e) => e.type === 'run.finished').length,
    1,
    'run.finished appears more than once',
  )

  const last = all.length
  for (let n = 0; n <= last + 1; n += 1) {
    const page = (await engine.http.events(runId, n)).json
    assert.deepEqual(
      eventsOf(page).map((e) => e.seq),
      range(n + 1, last),
      `since=${n} did not return exactly the events after ${n}`,
    )
    assert.equal(page.nextSince, n < last ? last : n, `since=${n} returned the wrong nextSince`)
  }

  const status = await engine.http.status(runId)
  assert.equal(status.json.lastSeq, last, "the status's lastSeq is not the last event's seq")

  // Numbering is per run: a second run starts again from 1.
  const second = await engine.http.submit(validRequest('r15-second'))
  const secondId = String(second.json.runId)
  await finished(engine, secondId)
  const secondSeqs = eventsOf((await engine.http.events(secondId)).json).map((e) => e.seq)
  assert.deepEqual(secondSeqs, range(1, secondSeqs.length))
})

// ---------------------------------------------------------------- 16

test('16. a run has one job row, of kind reel.plan, whose correlation_id is the runId', async () => {
  await engine.startWorker()
  const submitted = await engine.http.submit(validRequest('r16'))
  const runId = String(submitted.json.runId)
  const replayed = await engine.http.submit(validRequest('r16'))
  assert.equal(replayed.json.replayed, true)

  // `stills` is accepted since reel-stills' Slice 2 and would leave job rows of its own (S-047), and
  // `video` since reel-render's Slice 2 (S-077); planVaryOn 'order' is the refusal that still stores
  // nothing.
  const refused = validRequest('r16-order')
  refused.options.planVaryOn = 'order'
  assert.equal((await engine.http.submit(refused)).status, 422)

  await finished(engine, runId)

  const rows = engine.query<{ kind: string; correlation_id: string }>(
    'SELECT kind, correlation_id FROM job WHERE correlation_id = ?',
    runId,
  )
  assert.deepEqual(
    rows.map((r) => ({ ...r })),
    [{ kind: 'reel.plan', correlation_id: runId }],
    'the run does not have exactly one reel.plan job row carrying its runId',
  )

  // Every job row in the database belongs to exactly one run, one each — none for the replay,
  // none for the refusal.
  const runs = engine.query<{ run_id: string }>('SELECT run_id FROM run ORDER BY run_id')
  const jobs = engine.query<{ correlation_id: string }>(
    'SELECT correlation_id FROM job ORDER BY correlation_id',
  )
  assert.deepEqual(
    jobs.map((j) => j.correlation_id),
    runs.map((r) => r.run_id),
  )
})
