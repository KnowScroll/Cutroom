import assert from 'node:assert/strict'
import { test } from 'node:test'
import { startEngine } from './engine/harness.ts'
import { PLANNED, described, killedMidStills, takenUp } from './engine/restart.ts'
import {
  RANK_ALL_HELD,
  RANK_ALL_HELD_PICS,
  THREE_RANKS,
  THREE_RANKS_PICS,
  assertDegraded,
  clipped,
  showsPerson,
  stillsRequest,
  stillsScript,
  type Pic,
  type Stilled,
} from './engine/stills.ts'

// reel-stills, Slice 5 — check 49 (docs/features/reel-stills.md): a restarted attempt's reserve
// (D-027, D-047, S-039, S-043, S-048). The reserve is 6 − the image calls earlier attempts made − the
// placement's calls, fixed when the attempt starts. Below 0, the run fails before any image call; a
// canonical repair that finds no slot fails the run before the call; any other repair with no slot
// degrades its shot. So no run makes more than six image calls, whatever attempt it is on.
//
// EVERY FIGURE IS WORKED OUT BY HAND BELOW. The first worker is held at a model call: the planner's
// two calls come first, then each picture's witness and reconcile — so call 5 is the second picture's
// witness, with 2 image calls made, and call 7 the third picture's witness, with 3 made.

const [a, b, barons, hall] = THREE_RANKS_PICS as [Pic, Pic, Pic, Pic]
const [heldA, heldB, heldSingle] = RANK_ALL_HELD_PICS as [Pic, Pic, Pic]

/** What every run that did not complete shares: nothing chosen, and the stage not finished. */
function assertNothingChosen(ran: Stilled): void {
  assert.ok(
    ran.pictures.every((p) => !p.chosen),
    `${ran.runId}: a picture is chosen`,
  )
  assert.ok(
    !ran.events.some((e) => e.type === 'stage.finished' && e.stage === 'stills'),
    `${ran.runId}: stage.finished for stills`,
  )
}

// ---------------------------------------------------------------- 49

test('49. after a first attempt killed having made 2 image calls of a plan of 4, the second attempts reserve is 0: a derived picture failing Gate 1 is degraded and the run makes 6 calls in all', async () => {
  // Held at call 5, candidate b's witness: a and b made. Reserve 6 − 2 − 4 = 0.
  const engine = await startEngine({ worker: false })
  try {
    const killed = await killedMidStills(engine, stillsRequest('r49a'), {
      script: stillsScript(THREE_RANKS, [a]),
      holdAtCall: 5,
      made: ['a1-shot-0-a', 'a1-shot-0-b'],
    })
    // The second attempt: the barons' picture shows a person, and fails Gate 1.
    const ran = await takenUp(
      engine,
      killed,
      stillsScript(THREE_RANKS, [a, b, barons, hall], {
        reconciler: { [barons.key]: showsPerson(barons) },
      }),
    )

    assert.deepEqual(
      engine.image.calls.map((c) => c.pictureId),
      ['a2-shot-0-a', 'a2-shot-0-b', 'a2-shot-1-single', 'a2-shot-2-single'],
      'the second attempt repaired a shot with no reserve slot free',
    )
    assert.equal(ran.result.status, 'completed', JSON.stringify(ran.result))
    assert.deepEqual(
      ran.generations.map((g) => g.picture_id),
      [
        'a1-shot-0-a',
        'a1-shot-0-b',
        'a2-shot-0-a',
        'a2-shot-0-b',
        'a2-shot-1-single',
        'a2-shot-2-single',
      ],
    )
    const reason = assertDegraded(ran, {
      shotId: 'shot-1',
      gate: '1',
      last: 'a2-shot-1-single',
      pictures: ['a2-shot-1-single'],
      attempt: 2,
    })
    assert.match(reason, /no reserve slot is free/)
    assert.deepEqual(
      (ran.result.stills as Array<{ shotId: string; pictureId: string }>).map(
        (s) => `${s.shotId} ${s.pictureId}`,
      ),
      ['shot-0 a2-shot-0-a', 'shot-2 a2-shot-2-single'],
    )
  } finally {
    await engine.stop()
  }
})

test('49. after a first attempt killed having made 2 image calls of a plan of 4, when both canonical candidates fail the run finishes failed with 4 calls in all and no repair', async () => {
  // Held at call 5, as above. Reserve 0, and the canonical's repair needs a slot: the run fails
  // before the call — a restart fault, not the rule stop a repair failing Gate 1 would be (S-048).
  const engine = await startEngine({ worker: false })
  try {
    const killed = await killedMidStills(engine, stillsRequest('r49b'), {
      script: stillsScript(THREE_RANKS, [a]),
      holdAtCall: 5,
      made: ['a1-shot-0-a', 'a1-shot-0-b'],
    })
    const ran = await takenUp(
      engine,
      killed,
      stillsScript(THREE_RANKS, [a, b], {
        witness: { [a.key]: clipped(a), [b.key]: clipped(b) },
      }),
    )

    assert.deepEqual(
      engine.image.calls.map((c) => c.pictureId),
      ['a2-shot-0-a', 'a2-shot-0-b'],
      'the second attempt made a call it had no slot for',
    )
    assert.deepEqual(ran.result, {
      contractVersion: 1,
      runId: ran.runId,
      requestId: 'r49b',
      costCents: 0,
      status: 'failed',
      detail:
        'attempt 2 cannot repair the canonical picture of shot-0: no reserve slot is free, the run having made 2 image calls before it and its placement making 4 of the 6 (S-048). ' +
        'a2-shot-0-a failed Gate 1 at reconcile: subject "seal" (a wax seal) is clipped by the edge of the frame. ' +
        'a2-shot-0-b failed Gate 1 at reconcile: subject "seal" (a wax seal) is clipped by the edge of the frame',
    })
    assert.deepEqual(
      ran.generations.map((g) => g.picture_id),
      ['a1-shot-0-a', 'a1-shot-0-b', 'a2-shot-0-a', 'a2-shot-0-b'],
    )
    assert.deepEqual(described(ran.events), [
      ...PLANNED,
      'stage.started stills',
      'verdict 1 shot-0 fail',
      'verdict 1 shot-0 fail',
      'run.finished failed',
    ])
    assert.ok(!ran.pictures.some((p) => p.label === 'repair'))
    assertNothingChosen(ran)
  } finally {
    await engine.stop()
  }
})

test('49. after a first attempt killed having made 3 image calls of a plan of 4, the run finishes failed before the second attempt makes any call', async () => {
  // Held at call 7, the barons' witness: a, b and the barons' picture made. Reserve 6 − 3 − 4 = −1.
  const engine = await startEngine({ worker: false })
  try {
    const killed = await killedMidStills(engine, stillsRequest('r49c'), {
      script: stillsScript(THREE_RANKS, [a, b]),
      holdAtCall: 7,
      made: ['a1-shot-0-a', 'a1-shot-0-b', 'a1-shot-1-single'],
    })
    const ran = await takenUp(engine, killed, stillsScript(THREE_RANKS, THREE_RANKS_PICS))

    assert.deepEqual(
      engine.image.calls.map((c) => c.pictureId),
      [],
      'the second attempt made an image call',
    )
    assert.deepEqual(engine.sensors.calls, [])
    assert.deepEqual(engine.model.observeCalls, [])
    assert.deepEqual(engine.model.calls, [])
    assert.deepEqual(ran.result, {
      contractVersion: 1,
      runId: ran.runId,
      requestId: 'r49c',
      costCents: 0,
      status: 'failed',
      detail:
        'attempt 2 cannot make its pictures within 6 image calls: the run made 3 before it and its placement makes 4, 7 in all (S-048)',
    })
    assert.deepEqual(
      ran.generations.map((g) => g.picture_id),
      ['a1-shot-0-a', 'a1-shot-0-b', 'a1-shot-1-single'],
    )
    assert.deepEqual(described(ran.events), [
      ...PLANNED,
      'stage.started stills',
      'run.finished failed',
    ])
    assert.deepEqual(
      ran.record.pictures.map((p) => [p.pictureId, p.checks.length]),
      [
        ['a1-shot-0-a', 4],
        ['a1-shot-0-b', 4],
        ['a1-shot-1-single', 2],
      ],
    )
    assertNothingChosen(ran)
  } finally {
    await engine.stop()
  }
})

test('49. a plan of 4 whose rank 3 has no free shot, restarted after 3 image calls, fits and completes', async () => {
  // RANK_ALL_HELD plans 4 image calls, but the king's every shot is held: the placement makes 3.
  // Held at call 7, the hall's witness: a, b and the hall's picture made. Reserve 6 − 3 − 3 = 0.
  const engine = await startEngine({ worker: false })
  try {
    const killed = await killedMidStills(engine, stillsRequest('r49d'), {
      script: stillsScript(RANK_ALL_HELD, [heldA, heldB]),
      holdAtCall: 7,
      made: ['a1-shot-0-a', 'a1-shot-0-b', 'a1-shot-1-single'],
    })
    const ran = await takenUp(engine, killed, stillsScript(RANK_ALL_HELD, RANK_ALL_HELD_PICS))

    assert.equal(ran.plan.plannedImageCalls, 4)
    assert.equal(ran.result.status, 'completed', JSON.stringify(ran.result))
    assert.deepEqual(
      engine.image.calls.map((c) => c.pictureId),
      ['a2-shot-0-a', 'a2-shot-0-b', 'a2-shot-1-single'],
    )
    assert.equal(ran.generations.length, 6)
    assert.deepEqual(
      (ran.result.stills as Array<{ shotId: string; pictureId: string }>).map(
        (s) => `${s.shotId} ${s.pictureId}`,
      ),
      ['shot-0 a2-shot-0-a', 'shot-1 a2-shot-1-single'],
    )
    assert.deepEqual(ran.result.degradations, [])
  } finally {
    await engine.stop()
  }
})

test('49. a plan of 4 whose rank 3 has no free shot, restarted after 3 image calls, fits: its reserve is 0, so a derived picture failing Gate 1 is degraded, and only this attempts receipts of the shot are marked', async () => {
  // As above, but the second attempt's hall picture shows a person. Reserve 0: no repair, the shot is
  // degraded, and the run completes with 6 calls. The first attempt made a picture of that shot too;
  // its ladder degraded nothing, so its receipt is not marked (S-058, S-063).
  const engine = await startEngine({ worker: false })
  try {
    const killed = await killedMidStills(engine, stillsRequest('r49d-degraded'), {
      script: stillsScript(RANK_ALL_HELD, [heldA, heldB]),
      holdAtCall: 7,
      made: ['a1-shot-0-a', 'a1-shot-0-b', 'a1-shot-1-single'],
    })
    const ran = await takenUp(
      engine,
      killed,
      stillsScript(RANK_ALL_HELD, RANK_ALL_HELD_PICS, {
        reconciler: { [heldSingle.key]: showsPerson(heldSingle) },
      }),
    )

    assert.deepEqual(
      engine.image.calls.map((c) => c.pictureId),
      ['a2-shot-0-a', 'a2-shot-0-b', 'a2-shot-1-single'],
      'the second attempt repaired a shot with no reserve slot free',
    )
    assert.equal(ran.result.status, 'completed', JSON.stringify(ran.result))
    assert.equal(ran.generations.length, 6)
    const reason = assertDegraded(ran, {
      shotId: 'shot-1',
      gate: '1',
      last: 'a2-shot-1-single',
      pictures: ['a2-shot-1-single'],
      attempt: 2,
    })
    assert.match(reason, /no reserve slot is free/)
    assert.deepEqual(
      ran.generations
        .filter((g) => g.picture_id.endsWith('-shot-1-single'))
        .map((g) => [g.picture_id, g.degraded]),
      [
        ['a1-shot-1-single', false],
        ['a2-shot-1-single', true],
      ],
    )
    assert.deepEqual(
      (ran.result.stills as Array<{ shotId: string; pictureId: string }>).map(
        (s) => `${s.shotId} ${s.pictureId}`,
      ),
      ['shot-0 a2-shot-0-a'],
    )
  } finally {
    await engine.stop()
  }
})
