import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { LanguageModelPort } from '@cutroom/contracts'
import { startEngine, waitFor, type Engine } from './engine/harness.ts'
import {
  NO_RECURRENCE,
  THREE_RANKS,
  THREE_RANKS_PICS,
  again,
  clipped,
  judged,
  plannerFor,
  showsPerson,
  stills,
  stillsRequest,
  stillsScript,
  type Pic,
} from './engine/stills.ts'
import { described, eventsOf, jobRows, videoRequest } from './engine/video.ts'

// reel-render, Slice 2 — check 9 (docs/features/reel-render.md): the chain's third row. The keyframes
// job of a video run whose stills stage completes does NOT end the run: in one transaction it writes
// what a stills run's completed stage writes — the chosen flags, the degradations' labels, the
// events and stage.finished for stills, itself done with its cost kept — and the reel.clips row, with
// the run as correlation_id and itself as parent (D-081, D-083, S-069).
//
// "No run.finished from it" is about the keyframes job's own writes, so they are read with no clips
// job run after them, where that can be arranged: the worker is held inside the keyframes job and told
// to stop, so it finishes that job and claims nothing more. A plan that places no picture makes no
// call in its stills stage, so nothing can hold the worker there; its run is read by which job wrote
// what instead — the worker runs one job at a time, the clips job is claimed only once the keyframes
// job's transaction is committed, and the first thing the clips job writes is its stage.started for
// video, so every event before that one is the plan and keyframes jobs' (S-082).

const [a, b, barons, hall] = THREE_RANKS_PICS as [Pic, Pic, Pic, Pic]

/** The plan stage's events of every fixture run here: plan a fails Gate 0, plan b survives. */
const PLANNED = [
  'run.accepted',
  'stage.started plan',
  'verdict 0 fail',
  'verdict 0 accept',
  'stage.finished plan',
]

/**
 * A completed stills stage with something in every label S-058 names: the canonical's repair, the
 * barons' Gate 1 repair — both chosen — and the hall's shot degraded at Gate 1S with no slot left.
 * Two pictures carry a scripted cost, so a job cost reset to 0 or to anything else is seen.
 */
const DEGRADED = {
  sensors: { [hall.key]: { similarity: 0.5 } },
  images: { [b.key]: { costCents: 6 }, 'shot-1-repair': { costCents: 3 } },
  script: () =>
    stillsScript(THREE_RANKS, [a, b, again(a, 'repair'), barons, again(barons, 'repair'), hall], {
      witness: { [a.key]: clipped(a), [b.key]: clipped(b) },
      reconciler: { [barons.key]: showsPerson(barons) },
      judge: [judged(['a wax seal'], ['a wax seal'])],
    }),
}
const KEYFRAMES_COST = 6 + 3

/** A run's pictures, degradations and image receipts, as the labels S-058 puts on them. */
function labels(engine: Engine, runId: string) {
  return {
    pictures: engine
      .query<{ picture_id: string; chosen: number; degradation: string | null }>(
        'SELECT picture_id, chosen, degradation FROM picture WHERE run_id = ? ORDER BY seq',
        runId,
      )
      .map((r) => ({ ...r })),
    degradations: engine
      .query<{ shot_id: string; gate: string; reason: string }>(
        'SELECT shot_id, gate, reason FROM degradation WHERE run_id = ? ORDER BY rowid',
        runId,
      )
      .map((r) => ({ ...r })),
    receipts: engine
      .query<{ picture_id: string; cost_cents: number; degraded: number }>(
        'SELECT picture_id, cost_cents, degraded FROM generation_receipt WHERE run_id = ? ORDER BY id',
        runId,
      )
      .map((r) => ({ ...r })),
  }
}

// ---------------------------------------------------------------- 9

test("9. an admitted video run whose stills stage completes has stage.finished for stills and no run.finished from it; its keyframes job is done with its cost kept, and one reel.clips row carries the run's correlation_id and the keyframes job as its parent", async () => {
  // The same stills stage asked for as pictures alone, to hold the video run's stage to.
  const asStills = await startEngine({ worker: true, ...DEGRADED, script: DEGRADED.script() })
  const stilled = async () => {
    try {
      const ran = await stills(asStills, stillsRequest('r9-stills'))
      return { ran, labelled: labels(asStills, ran.runId) }
    } finally {
      await asStills.stop()
    }
  }
  const { ran: pictures, labelled: stillsLabels } = await stilled()
  assert.equal(pictures.result.status, 'completed', JSON.stringify(pictures.result))
  assert.equal((pictures.result.stills as unknown[]).length, 2, 'the fixture chooses two pictures')
  assert.equal((pictures.result.degradations as unknown[]).length, 1, 'the fixture degrades a shot')

  // Held at the stills stage's first witness call, told to stop, and let go: the worker finishes the
  // keyframes job and claims nothing after it.
  let reached!: () => void
  const reachedWitness = new Promise<void>((resolve) => (reached = resolve))
  let release!: () => void
  const released = new Promise<void>((resolve) => (release = resolve))
  let observed = 0
  const hold = (model: LanguageModelPort): LanguageModelPort => ({
    structured: (call) => model.structured(call),
    async observe(call) {
      if (++observed === 1) {
        reached()
        await released
      }
      return model.observe(call)
    },
    compare: (call) => model.compare(call),
    judgeCut: (call) => model.judgeCut(call),
  })
  const engine = await startEngine({
    worker: true,
    ...DEGRADED,
    script: DEGRADED.script(),
    wrapModel: hold,
  })
  try {
    const submitted = await engine.http.submit(videoRequest('r9'))
    assert.equal(submitted.status, 202, JSON.stringify(submitted.json))
    const runId = String(submitted.json.runId)
    await reachedWitness
    const stopping = engine.stopWorker()
    release()
    await stopping

    // The keyframes job has returned and nothing ran after it. The run is not finished.
    assert.equal((await engine.http.status(runId)).json.state, 'running', 'the run was finished')
    assert.equal((await engine.http.result(runId)).status, 409, 'the run has a result')
    const events = described(await eventsOf(engine, runId))
    assert.equal(events.at(-1), 'stage.finished stills', events.join(', '))
    assert.deepEqual(
      events.filter((e) => e.startsWith('run.finished')),
      [],
      'the keyframes job wrote run.finished',
    )
    // Everything the stage's checks wrote is a stills run's, to stage.finished for stills.
    assert.deepEqual(described(pictures.events).slice(0, -1), events)
    assert.equal(described(pictures.events).at(-1), 'run.finished completed')
    assert.deepEqual(events.slice(0, PLANNED.length), PLANNED)

    // The chain: three rows, one run. The keyframes job is done with what its image calls cost, and
    // the reel.clips row waits, its parent the keyframes job (D-081).
    const rows = jobRows(engine)
    const [plan, keyframes] = rows as [(typeof rows)[number], (typeof rows)[number]]
    assert.deepEqual(
      rows.map((row) => ({
        kind: row.kind,
        correlation_id: row.correlation_id,
        parent_id: row.parent_id,
        state: row.state,
        attempts: row.attempts,
        cost_cents: row.cost_cents,
      })),
      [
        {
          kind: 'reel.plan',
          correlation_id: runId,
          parent_id: null,
          state: 'done',
          attempts: 1,
          cost_cents: 0,
        },
        {
          kind: 'reel.keyframes',
          correlation_id: runId,
          parent_id: plan.id,
          state: 'done',
          attempts: 1,
          cost_cents: KEYFRAMES_COST,
        },
        {
          kind: 'reel.clips',
          correlation_id: runId,
          parent_id: keyframes.id,
          state: 'queued',
          attempts: 0,
          cost_cents: 0,
        },
      ],
    )

    // Its cost is its image calls', as the receipts record them (S-036, S-055).
    const receipts = labels(engine, runId).receipts
    assert.equal(
      receipts.reduce((sum, r) => sum + r.cost_cents, 0),
      KEYFRAMES_COST,
    )

    // The chosen flags and a degraded shot's labels are written by the transaction that advances,
    // exactly as a stills run's completed stage writes them (S-058, S-069).
    const mine = labels(engine, runId)
    assert.deepEqual(mine, stillsLabels)
    assert.deepEqual(
      mine.pictures.filter((p) => p.chosen === 1).map((p) => p.picture_id),
      (pictures.result.stills as Array<{ pictureId: string }>).map((s) => s.pictureId),
      "the video run's chosen pictures are not a stills run's",
    )
  } finally {
    release()
    await engine.stop()
  }
})

test("9. an admitted video run whose stills stage completes has stage.finished for stills and no run.finished from it; its keyframes job is done with its cost kept, and one reel.clips row carries the run's correlation_id and the keyframes job as its parent — also for a plan that places no picture", async () => {
  const engine = await startEngine({ worker: true, script: { planner: plannerFor(NO_RECURRENCE) } })
  try {
    const submitted = await engine.http.submit(videoRequest('r9-none'))
    assert.equal(submitted.status, 202, JSON.stringify(submitted.json))
    const runId = String(submitted.json.runId)

    // Read once the clips job has begun, and the worker stopped after the job in hand.
    await waitFor("the clips job's stage.started for video", async () =>
      described(await eventsOf(engine, runId)).includes('stage.started video'),
    )
    await engine.stopWorker()

    const events = described(await eventsOf(engine, runId))
    const clipsBegan = events.indexOf('stage.started video')
    assert.deepEqual(
      events.slice(0, clipsBegan),
      [...PLANNED, 'stage.started stills', 'stage.finished stills'],
      'the plan and keyframes jobs wrote other events — or a run.finished — before the clips job began',
    )
    assert.equal(engine.image.calls.length, 0, 'a picture was made for a plan that places none')

    const rows = jobRows(engine)
    const [plan, keyframes, clips] = rows as [
      (typeof rows)[number],
      (typeof rows)[number],
      (typeof rows)[number],
    ]
    assert.equal(rows.length, 3, `the run has ${rows.length} job rows, not three`)
    assert.deepEqual(
      [plan.kind, keyframes.kind, clips.kind],
      ['reel.plan', 'reel.keyframes', 'reel.clips'],
    )
    assert.equal(keyframes.state, 'done')
    assert.equal(keyframes.cost_cents, 0)
    assert.equal(keyframes.parent_id, plan.id)
    assert.equal(clips.correlation_id, runId, 'D-081: the chain shares the run id')
    assert.equal(clips.parent_id, keyframes.id, 'D-081: the keyframes job is the parent')
  } finally {
    await engine.stop()
  }
})
