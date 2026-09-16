import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { LanguageModelPort } from '@cutroom/contracts'
import { placePictures } from '@cutroom/pipeline'
import { finished, startEngine } from './engine/harness.ts'
import {
  CANONICAL_ONLY,
  FIRST_SHOT_HELD,
  FIRST_SHOT_HELD_PICS,
  FOUR_RANKS,
  NO_RECURRENCE,
  RANK_ALL_HELD,
  RANK_ALL_HELD_PICS,
  THREE_RANKS,
  THREE_RANKS_PICS,
  inTurn,
  plannerFor,
  stills,
  stillsRequest,
  stillsScript,
  type Shape,
  type Stilled,
} from './engine/stills.ts'

// reel-stills, Slice 3 — checks 12 to 15 (docs/features/reel-stills.md): where pictures go. A
// picture is frame 1 of exactly one shot (S-039): rank 1 on its first shot, ranks 2 and 3 each on
// the earliest shot showing it that no higher rank holds, and a rank whose every shot is held gets
// no picture and no call.

const planOf = (shape: Shape) => ({
  shots: shape.shown.map((subjectIds, unit) => ({ unit, durationSeconds: 7, subjectIds })),
  subjects: shape.subjects,
})

type Event = Record<string, unknown> & { type: string }
const described = (events: Event[]) =>
  events.map((e) =>
    e.type === 'verdict'
      ? `verdict ${String(e.gate)} ${String(e.outcome)}`
      : e.stage === undefined
        ? e.type
        : `${e.type} ${String(e.stage)}`,
  )

// ---------------------------------------------------------------- 12

test('12. a cancel that lands between the plan job and the keyframes job finishes the run cancelled, costCents 0, with no stage.started for stills and no image call', async () => {
  // The worker's last planning call is held open, the worker is told to stop — which it does once
  // the job in hand is done — and only then is the call answered. So the plan job admits the run
  // and ends, the keyframes row is queued, and no worker is running when the cancel lands.
  let planned = 0
  let reached!: () => void
  const reachedLast = new Promise<void>((resolve) => (reached = resolve))
  let release!: () => void
  const released = new Promise<void>((resolve) => (release = resolve))
  const hold = (model: LanguageModelPort): LanguageModelPort => ({
    async structured(call) {
      if (call.role === 'planner' && ++planned === 2) {
        reached()
        await released
      }
      return model.structured(call)
    },
    observe: (call) => model.observe(call),
    compare: (call) => model.compare(call),
  })

  const engine = await startEngine({
    worker: true,
    script: stillsScript(THREE_RANKS, THREE_RANKS_PICS),
    wrapModel: hold,
  })
  try {
    const submitted = await engine.http.submit(stillsRequest('r12'))
    assert.equal(submitted.status, 202)
    const runId = String(submitted.json.runId)

    await reachedLast
    const stopping = engine.stopWorker()
    release()
    await stopping

    const jobs = () =>
      engine
        .query<{ kind: string; state: string }>('SELECT kind, state FROM job ORDER BY id')
        .map((j) => `${j.kind} ${j.state}`)
    assert.deepEqual(
      jobs(),
      ['reel.plan done', 'reel.keyframes queued'],
      'the run was not admitted and left between its jobs',
    )

    const cancel = await engine.http.cancel(runId)
    assert.equal(cancel.status, 200)
    assert.equal(cancel.json.state, 'running')

    await engine.startWorker()
    await finished(engine, runId)

    assert.deepEqual((await engine.http.result(runId)).json, {
      contractVersion: 1,
      runId,
      requestId: 'r12',
      costCents: 0,
      status: 'cancelled',
    })
    const events = (await engine.http.events(runId)).json.events as Event[]
    assert.deepEqual(described(events), [
      'run.accepted',
      'stage.started plan',
      'verdict 0 fail',
      'verdict 0 accept',
      'stage.finished plan',
      'run.finished',
    ])
    assert.equal(engine.image.calls.length, 0, 'an image call was made for a cancelled run')
    assert.equal(engine.model.observeCalls.length, 0)
    assert.deepEqual(engine.query('SELECT picture_id FROM picture'), [])
    assert.deepEqual(engine.query('SELECT id FROM generation_receipt'), [])
    assert.deepEqual(jobs(), ['reel.plan done', 'reel.keyframes done'])
    assert.deepEqual(
      engine.query<{ cost_cents: number }>('SELECT cost_cents FROM job').map((j) => j.cost_cents),
      [0, 0],
    )
  } finally {
    release()
    await engine.stop()
  }
})

// ---------------------------------------------------------------- 13

test('13. placing pictures, as a function: rank 1 on its first shot, ranks 2 and 3 on the earliest shot no higher rank holds, a rank with every shot held left out, and nothing when no subject recurs', () => {
  assert.deepEqual(placePictures(planOf(THREE_RANKS)), [
    { subjectId: 'seal', shotUnit: 0, role: 'canonical' },
    { subjectId: 'barons', shotUnit: 1, role: 'derived' },
    { subjectId: 'hall', shotUnit: 2, role: 'derived' },
  ])
  // The hall's first shot is the canonical's; it opens its next one.
  assert.deepEqual(placePictures(planOf(FIRST_SHOT_HELD)), [
    { subjectId: 'seal', shotUnit: 0, role: 'canonical' },
    { subjectId: 'hall', shotUnit: 2, role: 'derived' },
    { subjectId: 'barons', shotUnit: 4, role: 'derived' },
  ])
  // The king is in shots 0 and 1, which ranks 1 and 2 already open.
  assert.deepEqual(placePictures(planOf(RANK_ALL_HELD)), [
    { subjectId: 'seal', shotUnit: 0, role: 'canonical' },
    { subjectId: 'hall', shotUnit: 1, role: 'derived' },
  ])
  assert.deepEqual(placePictures(planOf(CANONICAL_ONLY)), [
    { subjectId: 'seal', shotUnit: 0, role: 'canonical' },
  ])
  assert.deepEqual(placePictures(planOf(NO_RECURRENCE)), [])
})

/** Four completed runs, one per placement worth telling apart, in one engine. */
async function placedRuns(): Promise<{
  three: Stilled
  held: Stilled
  all: Stilled
  four: Stilled
  imageCalls: number
}> {
  const engine = await startEngine({
    worker: true,
    script: inTurn(
      stillsScript(THREE_RANKS, THREE_RANKS_PICS),
      stillsScript(FIRST_SHOT_HELD, FIRST_SHOT_HELD_PICS),
      stillsScript(RANK_ALL_HELD, RANK_ALL_HELD_PICS),
      stillsScript(FOUR_RANKS, THREE_RANKS_PICS),
    ),
  })
  try {
    const three = await stills(engine, stillsRequest('r13-three'))
    const held = await stills(engine, stillsRequest('r13-first-held'))
    const all = await stills(engine, stillsRequest('r13-all-held'))
    const four = await stills(engine, stillsRequest('r13-four-ranks'))
    return { three, held, all, four, imageCalls: engine.image.calls.length }
  } finally {
    await engine.stop()
  }
}

let runs: ReturnType<typeof placedRuns> | undefined
const placed = () => (runs ??= placedRuns())

const shotsOf = (ran: Stilled) =>
  (ran.result.stills as Array<{ shotId: string }> | undefined)?.map((s) => s.shotId)

test('13. a completed stills run approves a picture on rank 1s first shot and on each of ranks 2 and 3s earliest shot no higher rank holds; a rank whose every shot is held gets no call; no other shot has a picture', async () => {
  const { three, held, all, four, imageCalls } = await placed()

  for (const ran of [three, held, all, four]) {
    assert.equal(ran.result.status, 'completed', JSON.stringify(ran.result))
  }
  assert.deepEqual(shotsOf(three), ['shot-0', 'shot-1', 'shot-2'])
  assert.deepEqual(
    three.pictures.map((p) => [p.picture_id, p.subject_id]),
    [
      ['a1-shot-0-a', 'seal'],
      ['a1-shot-0-b', 'seal'],
      ['a1-shot-1-single', 'barons'],
      ['a1-shot-2-single', 'hall'],
    ],
  )

  // The hall's first shot is shot 0, which the canonical holds: it opens shot 2, not shot 0.
  assert.deepEqual(shotsOf(held), ['shot-0', 'shot-2', 'shot-4'])
  assert.deepEqual(
    held.pictures.map((p) => [p.picture_id, p.subject_id]),
    [
      ['a1-shot-0-a', 'seal'],
      ['a1-shot-0-b', 'seal'],
      ['a1-shot-2-single', 'hall'],
      ['a1-shot-4-single', 'barons'],
    ],
  )

  // The king's two shots are both held: no picture of it, and no call for it, although the plan
  // counted one (S-039).
  assert.deepEqual(shotsOf(all), ['shot-0', 'shot-1'])
  assert.deepEqual(
    all.pictures.map((p) => [p.picture_id, p.subject_id]),
    [
      ['a1-shot-0-a', 'seal'],
      ['a1-shot-0-b', 'seal'],
      ['a1-shot-1-single', 'hall'],
    ],
  )
  assert.equal(all.generations.length, 3, 'a call was made for a rank whose every shot is held')
  assert.equal(
    all.plan.plannedImageCalls,
    4,
    'the fixture no longer plans a call for the rank it leaves out',
  )
  // A fourth recurring subject gets no picture, though shot 3 shows it and no rank holds shot 3: D-029
  // buys derived pictures for ranks 2 and 3 only.
  assert.deepEqual(shotsOf(four), ['shot-0', 'shot-1', 'shot-2'])
  assert.ok(!four.pictures.some((p) => p.subject_id === 'king'), 'rank 4 was given a picture')
  assert.equal(four.generations.length, 4, 'a call was made for rank 4')

  assert.equal(
    imageCalls,
    4 + 4 + 3 + 4,
    'the image stand-in was called for a picture no run records',
  )

  // No other shot has a picture: every picture row, every receipt and every still is on a placed shot.
  for (const [ran, units] of [
    [three, [0, 1, 2]],
    [held, [0, 2, 4]],
    [all, [0, 1]],
    [four, [0, 1, 2]],
  ] as const) {
    assert.deepEqual([...new Set(ran.pictures.map((p) => p.shot_unit))], units)
    assert.deepEqual(
      [...new Set(ran.generations.map((g) => Number(/shot-(\d+)-/.exec(g.picture_id)?.[1])))],
      units,
    )
  }
})

// ---------------------------------------------------------------- 14

test("14. every picture's shot is a shot of the selected plan that shows the picture's subject", async () => {
  const { three, held, all, four } = await placed()
  let checked = 0
  for (const ran of [three, held, all, four]) {
    for (const picture of ran.pictures) {
      const shot = ran.plan.shots.find((s) => s.unit === picture.shot_unit)
      assert.ok(
        shot !== undefined,
        `${picture.picture_id} opens shot ${picture.shot_unit}, which the selected plan does not have`,
      )
      assert.ok(
        shot.subjectIds.includes(picture.subject_id),
        `${picture.picture_id} is of ${picture.subject_id}, which shot ${picture.shot_unit} does not show`,
      )
      assert.equal(picture.picture_id.split('-').slice(1, 3).join('-'), `shot-${picture.shot_unit}`)
      checked += 1
    }
    for (const still of ran.result.stills as Array<{ pictureId: string; shotId: string }>) {
      const row = ran.pictures.find((p) => p.picture_id === still.pictureId)
      assert.equal(
        still.shotId,
        `shot-${row?.shot_unit}`,
        `${still.pictureId} is given as a still of another shot`,
      )
    }
  }
  assert.equal(checked, 4 + 4 + 3 + 4)
})

// ---------------------------------------------------------------- 15

test('15. a stills run whose selected plan has no subject in two shots completes with no stills, no Gate 1 verdict and no image call', async () => {
  const engine = await startEngine({ worker: true, script: { planner: plannerFor(NO_RECURRENCE) } })
  try {
    const ran = await stills(engine, stillsRequest('r15'))
    assert.deepEqual(ran.result, {
      contractVersion: 1,
      runId: ran.runId,
      requestId: 'r15',
      costCents: 0,
      status: 'completed',
      until: 'stills',
      // No image call planned: forty seconds of video at 4 cents is the whole estimate.
      estimateCents: 160,
      stills: [],
      degradations: [],
    })
    assert.equal(engine.image.calls.length, 0, 'an image call was made')
    assert.equal(engine.model.observeCalls.length, 0)
    assert.deepEqual(ran.pictures, [])
    assert.deepEqual(ran.generations, [])
    assert.deepEqual(ran.record.pictures, [])
    assert.deepEqual(
      ran.events.filter((e) => e.type === 'verdict' && e.gate !== '0'),
      [],
      'a picture verdict for a run with no picture',
    )
    assert.deepEqual(described(ran.events), [
      'run.accepted',
      'stage.started plan',
      'verdict 0 fail',
      'verdict 0 accept',
      'stage.finished plan',
      'stage.started stills',
      'stage.finished stills',
      'run.finished',
    ])
  } finally {
    await engine.stop()
  }
})
