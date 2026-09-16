import assert from 'node:assert/strict'
import { test } from 'node:test'
import { finished, startEngine } from './engine/harness.ts'
import {
  RANK_NOT_SHOT,
  RANK_NOT_SHOT_PICS,
  THREE_RANKS,
  THREE_RANKS_PICS,
  inTurn,
  readStills,
  stills,
  stillsRequest,
  stillsScript,
} from './engine/stills.ts'

// reel-stills, Slice 3 — checks 34 and 35 (docs/features/reel-stills.md): a completed stills run as
// a caller sees it. Every reply below goes through the test client, which fails the test on any body
// its route's contract schema refuses (D-098) — so "every body on every route parses" is asserted by
// calling every route, before the run is finished and after.

// ---------------------------------------------------------------- 34

test("34. the result's stills are exactly the pictures the record marks chosen, with the same pictureIds and shots, and estimateCents the selected plan's; every body on every route of a stills run parses under its contract schema", async () => {
  const engine = await startEngine({
    worker: false,
    script: stillsScript(THREE_RANKS, THREE_RANKS_PICS),
  })
  try {
    const request = stillsRequest('r34')
    const submitted = await engine.http.submit(request)
    assert.equal(submitted.status, 202)
    const runId = String(submitted.json.runId)
    assert.equal((await engine.http.submit(request)).json.replayed, true)

    // Before the run is finished: its status, its events, and 409 for its result and its record.
    assert.equal((await engine.http.lookup('r34')).status, 200)
    assert.equal((await engine.http.status(runId)).json.state, 'running')
    assert.equal((await engine.http.events(runId)).status, 200)
    assert.equal((await engine.http.result(runId)).status, 409)
    assert.equal((await engine.http.record(runId)).status, 409)
    assert.equal((await engine.http.record('no-such-run')).status, 404)

    await engine.startWorker()
    await finished(engine, runId)
    const result = await engine.http.result(runId)
    assert.equal(result.status, 200)
    const ran = await readStills(engine, runId, result.json)()
    assert.equal(ran.result.status, 'completed', JSON.stringify(ran.result))

    // After: every route again, including a later page of events and a cancel of a finished run.
    assert.equal((await engine.http.record(runId)).status, 200)
    assert.equal((await engine.http.events(runId, 3)).status, 200)
    assert.equal(
      (await engine.http.events(runId, ran.events.length)).json.events instanceof Array,
      true,
    )
    assert.equal((await engine.http.status(runId)).json.state, 'finished')
    assert.equal((await engine.http.lookup('r34')).json.state, 'finished')
    assert.equal((await engine.http.cancel(runId)).json.state, 'finished')

    // The stills are the chosen pictures, the same ids and shots, in shot order.
    const chosen = ran.record.pictures.filter((p) => p.chosen)
    assert.equal(chosen.length, 3)
    const stilled = ran.result.stills as Array<{ pictureId: string; shotId: string; path: string }>
    assert.deepEqual(
      stilled.map((s) => ({ pictureId: s.pictureId, shotId: s.shotId })),
      chosen.map((p) => ({ pictureId: p.pictureId, shotId: p.shotId })),
    )
    assert.deepEqual(
      stilled.map((s) => s.shotId),
      ['shot-0', 'shot-1', 'shot-2'],
    )
    // The record's `chosen` is the picture rows' own.
    assert.deepEqual(
      ran.pictures.filter((p) => p.chosen).map((p) => p.picture_id),
      chosen.map((p) => p.pictureId),
    )
    // Every picture made is in the record, in the order made, each with its shot.
    assert.deepEqual(
      ran.record.pictures.map((p) => [p.pictureId, p.shotId]),
      ran.pictures.map((p) => [p.picture_id, `shot-${p.shot_unit}`]),
    )
    assert.deepEqual(ran.record.degradations, [])

    // estimateCents is the selected plan's: 4 image calls at 15 and 40 seconds at 4.
    assert.equal(ran.result.estimateCents, ran.plan.estimateCents)
    assert.equal(ran.result.estimateCents, 220)
    assert.deepEqual(Object.keys(ran.result).sort(), [
      'contractVersion',
      'costCents',
      'degradations',
      'estimateCents',
      'requestId',
      'runId',
      'status',
      'stills',
      'until',
    ])
    assert.equal(ran.result.until, 'stills')
    assert.deepEqual(ran.result.degradations, [])

    // A completed run's stills stage finished: its events end so (S-046).
    const tail = ran.events.slice(-2).map((e) => `${e.type} ${String(e.stage ?? e.status)}`)
    assert.deepEqual(tail, ['stage.finished stills', 'run.finished completed'])
  } finally {
    await engine.stop()
  }

  // A plan whose rank order is not its shot order: the pictures are made shot 0, shot 3, shot 1. The
  // stills are the chosen pictures IN SHOT ORDER (Gate 2, "How a stills run ends"), and the record
  // holds every picture in the order made — so the two lists are the same pictures in different
  // orders, which an engine that sorted either by the other would not give.
  const reordered = await startEngine({
    worker: true,
    script: stillsScript(RANK_NOT_SHOT, RANK_NOT_SHOT_PICS),
  })
  try {
    const ran = await stills(reordered, stillsRequest('r34-rank-not-shot'))
    assert.equal(ran.result.status, 'completed', JSON.stringify(ran.result))
    const stilled = ran.result.stills as Array<{ pictureId: string; shotId: string }>
    assert.deepEqual(
      stilled.map((s) => s.pictureId),
      ['a1-shot-0-a', 'a1-shot-1-single', 'a1-shot-3-single'],
      'the stills are not the chosen pictures in shot order',
    )
    assert.deepEqual(
      ran.record.pictures.map((p) => p.pictureId),
      ['a1-shot-0-a', 'a1-shot-0-b', 'a1-shot-3-single', 'a1-shot-1-single'],
      'the record does not list the pictures in the order made',
    )
    assert.deepEqual(
      ran.record.pictures
        .filter((p) => p.chosen)
        .map((p) => p.pictureId)
        .sort(),
      stilled.map((s) => s.pictureId).sort(),
      'the stills are not exactly the pictures the record marks chosen',
    )
  } finally {
    await reordered.stop()
  }
})

// ---------------------------------------------------------------- 35

test("35. with the stand-in's default script every generation_receipt and job row costs 0, and a completed run's costCents is 0", async () => {
  const engine = await startEngine({
    worker: true,
    script: stillsScript(THREE_RANKS, THREE_RANKS_PICS),
  })
  try {
    const ran = await stills(engine, stillsRequest('r35'))
    assert.equal(ran.result.status, 'completed', JSON.stringify(ran.result))
    assert.equal(ran.generations.length, 4)
    assert.deepEqual(
      ran.generations.map((g) => g.cost_cents),
      [0, 0, 0, 0],
    )
    assert.deepEqual(
      ran.jobs.map((j) => [j.kind, j.cost_cents]),
      [
        ['reel.plan', 0],
        ['reel.keyframes', 0],
      ],
    )
    assert.equal(ran.result.costCents, 0)
  } finally {
    await engine.stop()
  }

  // The 0 is the sum of what was spent, not a constant: a cost scripted on one picture is its
  // receipt's, its job row's and its run's (S-036) — and only its run's, so two runs in one engine
  // each cost what their own chain spent.
  const costly = await startEngine({
    worker: true,
    images: { 'shot-1-single': { costCents: 7 } },
    script: inTurn(
      stillsScript(THREE_RANKS, THREE_RANKS_PICS),
      stillsScript(THREE_RANKS, THREE_RANKS_PICS),
    ),
  })
  try {
    const earlier = await stills(costly, stillsRequest('r35-costly-first'))
    assert.equal(earlier.result.costCents, 7, JSON.stringify(earlier.result))
    const ran = await stills(costly, stillsRequest('r35-costly'))
    assert.equal(ran.result.status, 'completed', JSON.stringify(ran.result))
    assert.deepEqual(
      ran.generations.map((g) => [g.picture_id, g.cost_cents]),
      [
        ['a1-shot-0-a', 0],
        ['a1-shot-0-b', 0],
        ['a1-shot-1-single', 7],
        ['a1-shot-2-single', 0],
      ],
    )
    assert.deepEqual(
      ran.jobs.map((j) => [j.kind, j.cost_cents]),
      [
        ['reel.plan', 0],
        ['reel.keyframes', 7],
      ],
    )
    assert.equal(ran.result.costCents, 7)
  } finally {
    await costly.stop()
  }
})
