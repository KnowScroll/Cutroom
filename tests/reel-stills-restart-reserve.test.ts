import assert from 'node:assert/strict'
import { test } from 'node:test'
import { startEngine, type Engine } from './engine/harness.ts'
import { PLANNED, described, killedAgain, killedMidStills, takenUp } from './engine/restart.ts'
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
// (D-027, D-047, S-039, S-043, S-048), AMENDED BY resume-failed, Slice 2 (S-164). The reserve is
// 6 − earlier − unmade, fixed when the attempt starts: `earlier` the run's image calls every attempt
// before it made, and `unmade` the first calls of the placements no kept picture satisfies — a kept
// picture is counted once, as an earlier call; a picture a crash cut off twice, as an earlier call
// and as a first call still to make. Below 0, the run fails before any image call; a canonical repair
// that finds no slot fails the run before the call; any other repair with no slot degrades its shot.
// So no run makes more than six image calls, whatever attempt it is on.
//
// ONE KILL CUTS OFF EXACTLY ONE PICTURE, so under S-164 a single kill leaves every reserve at least 1.
// Each test therefore kills the same run again at call 1 of each further attempt — the witness of the
// picture that attempt makes — each kill adding one to `earlier` and nothing to `unmade`, so the new
// formula is the one reached, and the old one would give a different answer in every test.
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

/** A failed run's kind, read from its row (resume-failed, S-163). */
const failureOf = (engine: Engine, runId: string) =>
  engine.query<{ failure: string | null }>('SELECT failure FROM run WHERE run_id = ?', runId)[0]
    ?.failure

/** THREE_RANKS killed three times inside the barons' picture's checks: attempts 1, 2 and 3. */
async function killedThrice(engine: Engine, requestId: string, shape: 'three' | 'held') {
  const script =
    shape === 'three'
      ? stillsScript(THREE_RANKS, [a, b])
      : stillsScript(RANK_ALL_HELD, [heldA, heldB])
  // Held at call 7, the third picture's witness: a, b and shot 1's picture made.
  const first = await killedMidStills(engine, stillsRequest(requestId), {
    script,
    holdAtCall: 7,
    made: ['a1-shot-0-a', 'a1-shot-0-b', 'a1-shot-1-single'],
  })
  // Attempt 2 keeps a and b, chooses from their stored scores with no call, and makes shot 1's
  // picture again: killed at its witness, its own first call. Attempt 3 the same.
  const second = await killedAgain(engine, first, {
    script: {},
    holdAtCall: 1,
    made: ['a1-shot-0-a', 'a1-shot-0-b', 'a1-shot-1-single', 'a2-shot-1-single'],
  })
  return killedAgain(engine, second, {
    script: {},
    holdAtCall: 1,
    made: [
      'a1-shot-0-a',
      'a1-shot-0-b',
      'a1-shot-1-single',
      'a2-shot-1-single',
      'a3-shot-1-single',
    ],
  })
}

// ---------------------------------------------------------------- 49

test('49. after a first attempt killed having made 2 image calls of a plan of 4, and a second killed having made 1, the third attempts reserve is 0: a derived picture failing Gate 1 is degraded and the run makes 6 calls in all', async () => {
  // Held at call 5, candidate b's witness: a decided, b cut off. Attempt 2 keeps a, makes b again and
  // is killed at its witness. Attempt 3: earlier 3, unmade b + barons + hall = 3, reserve 6 − 3 − 3 =
  // 0 — where the old formula, 6 − 3 − 4, would be −1 and fail the run.
  const engine = await startEngine({ worker: false })
  try {
    const first = await killedMidStills(engine, stillsRequest('r49a'), {
      script: stillsScript(THREE_RANKS, [a]),
      holdAtCall: 5,
      made: ['a1-shot-0-a', 'a1-shot-0-b'],
    })
    const second = await killedAgain(engine, first, {
      script: {},
      holdAtCall: 1,
      made: ['a1-shot-0-a', 'a1-shot-0-b', 'a2-shot-0-b'],
    })
    // The third attempt: the barons' picture shows a person, and fails Gate 1.
    const ran = await takenUp(
      engine,
      second,
      stillsScript(THREE_RANKS, [b, barons, hall], {
        reconciler: { [barons.key]: showsPerson(barons) },
      }),
    )

    assert.deepEqual(
      engine.image.calls.map((c) => c.pictureId),
      ['a3-shot-0-b', 'a3-shot-1-single', 'a3-shot-2-single'],
      'the third attempt repaired a shot with no reserve slot free',
    )
    assert.equal(ran.result.status, 'completed', JSON.stringify(ran.result))
    assert.deepEqual(
      ran.generations.map((g) => g.picture_id),
      [
        'a1-shot-0-a',
        'a1-shot-0-b',
        'a2-shot-0-b',
        'a3-shot-0-b',
        'a3-shot-1-single',
        'a3-shot-2-single',
      ],
    )
    const reason = assertDegraded(ran, {
      shotId: 'shot-1',
      gate: '1',
      last: 'a3-shot-1-single',
      pictures: ['a3-shot-1-single'],
      attempt: 3,
    })
    assert.match(reason, /no reserve slot is free/)
    assert.deepEqual(
      (ran.result.stills as Array<{ shotId: string; pictureId: string }>).map(
        (s) => `${s.shotId} ${s.pictureId}`,
      ),
      ['shot-0 a1-shot-0-a', 'shot-2 a3-shot-2-single'],
    )
  } finally {
    await engine.stop()
  }
})

test('49. after a first attempt killed with its candidate a decided failed, and a second killed having made b again, when b fails too the run finishes failed, crashed, with 4 calls in all and no repair — the kept candidates reasons read from its stored steps', async () => {
  // Held at call 5, as above, with a1-shot-0-a clipped: kept DECIDED FAILED. Attempt 2 makes b again
  // and is killed at its witness. Attempt 3: earlier 3, unmade 3, reserve 0; a3-shot-0-b is clipped
  // too, and the canonical's repair needs a slot: the run fails before the call — a restart fault,
  // not the rule stop a repair failing Gate 1 would be (S-048).
  const engine = await startEngine({ worker: false })
  try {
    const first = await killedMidStills(engine, stillsRequest('r49b'), {
      script: stillsScript(THREE_RANKS, [a], { witness: { [a.key]: clipped(a) } }),
      holdAtCall: 5,
      made: ['a1-shot-0-a', 'a1-shot-0-b'],
    })
    const second = await killedAgain(engine, first, {
      script: {},
      holdAtCall: 1,
      made: ['a1-shot-0-a', 'a1-shot-0-b', 'a2-shot-0-b'],
    })
    const ran = await takenUp(
      engine,
      second,
      stillsScript(THREE_RANKS, [b], { witness: { [b.key]: clipped(b) } }),
    )

    assert.deepEqual(
      engine.image.calls.map((c) => c.pictureId),
      ['a3-shot-0-b'],
      'the third attempt made a call it had no slot for',
    )
    assert.deepEqual(ran.result, {
      contractVersion: 1,
      runId: ran.runId,
      requestId: 'r49b',
      costCents: 0,
      status: 'failed',
      detail:
        'attempt 3 cannot repair the canonical picture of shot-0: no reserve slot is free, the run having made 3 image calls before it and its placement making 3 more of the 6 (S-048). ' +
        'a1-shot-0-a failed Gate 1 at reconcile: subject "seal" (a wax seal) is clipped by the edge of the frame. ' +
        'a3-shot-0-b failed Gate 1 at reconcile: subject "seal" (a wax seal) is clipped by the edge of the frame',
    })
    assert.equal(failureOf(engine, ran.runId), 'crashed')
    assert.deepEqual(
      ran.generations.map((g) => g.picture_id),
      ['a1-shot-0-a', 'a1-shot-0-b', 'a2-shot-0-b', 'a3-shot-0-b'],
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

test('49. after three attempts each killed inside shot 1s picture of a plan of 4, the run finishes failed, crashed, before the fourth attempt makes any call', async () => {
  // Held at call 7, the barons' witness: a, b and the barons' picture made; then twice more at the
  // barons' picture made again. Attempt 4: earlier 5, unmade barons + hall = 2, reserve 6 − 5 − 2 = −1.
  const engine = await startEngine({ worker: false })
  try {
    const killed = await killedThrice(engine, 'r49c', 'three')
    const ran = await takenUp(engine, killed, stillsScript(THREE_RANKS, THREE_RANKS_PICS))

    assert.deepEqual(
      engine.image.calls.map((c) => c.pictureId),
      [],
      'the fourth attempt made an image call',
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
        'attempt 4 cannot make its pictures within 6 image calls: the run made 5 before it and its placement makes 2 more, 7 in all (S-048)',
    })
    assert.equal(failureOf(engine, ran.runId), 'crashed')
    assert.deepEqual(
      ran.generations.map((g) => g.picture_id),
      ['a1-shot-0-a', 'a1-shot-0-b', 'a1-shot-1-single', 'a2-shot-1-single', 'a3-shot-1-single'],
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
        ['a2-shot-1-single', 2],
        ['a3-shot-1-single', 2],
      ],
    )
    assertNothingChosen(ran)
  } finally {
    await engine.stop()
  }
})

test('49. a plan of 4 whose rank 3 has no free shot, restarted after three attempts each killed inside shot 1s picture, fits and completes: the placement, not the plan, is counted', async () => {
  // RANK_ALL_HELD plans 4 image calls, but the king's every shot is held: the placement makes 3.
  // Attempt 4: earlier 5, unmade shot 1's picture = 1, reserve 6 − 5 − 1 = 0 — where the plan's four
  // calls, less the two kept, would give −1.
  const engine = await startEngine({ worker: false })
  try {
    const killed = await killedThrice(engine, 'r49d', 'held')
    const ran = await takenUp(engine, killed, stillsScript(RANK_ALL_HELD, [heldSingle]))

    assert.equal(ran.plan.plannedImageCalls, 4)
    assert.equal(ran.result.status, 'completed', JSON.stringify(ran.result))
    assert.deepEqual(
      engine.image.calls.map((c) => c.pictureId),
      ['a4-shot-1-single'],
    )
    assert.equal(ran.generations.length, 6)
    assert.deepEqual(
      (ran.result.stills as Array<{ shotId: string; pictureId: string }>).map(
        (s) => `${s.shotId} ${s.pictureId}`,
      ),
      ['shot-0 a1-shot-0-a', 'shot-1 a4-shot-1-single'],
    )
    assert.deepEqual(ran.result.degradations, [])
  } finally {
    await engine.stop()
  }
})

test('49. a plan of 4 whose rank 3 has no free shot, restarted after three attempts each killed inside shot 1s picture, fits: its reserve is 0, so the fourth attempts picture failing Gate 1 is degraded, and only its receipt of the shot is marked', async () => {
  // As above, but the fourth attempt's picture shows a person. Reserve 0: no repair, the shot is
  // degraded, and the run completes with 6 calls. The cut-off pictures of that shot were used by no
  // ladder, so their receipts are not marked (S-058, S-063).
  const engine = await startEngine({ worker: false })
  try {
    const killed = await killedThrice(engine, 'r49d-degraded', 'held')
    const ran = await takenUp(
      engine,
      killed,
      stillsScript(RANK_ALL_HELD, [heldSingle], {
        reconciler: { [heldSingle.key]: showsPerson(heldSingle) },
      }),
    )

    assert.deepEqual(
      engine.image.calls.map((c) => c.pictureId),
      ['a4-shot-1-single'],
      'the fourth attempt repaired a shot with no reserve slot free',
    )
    assert.equal(ran.result.status, 'completed', JSON.stringify(ran.result))
    assert.equal(ran.generations.length, 6)
    const reason = assertDegraded(ran, {
      shotId: 'shot-1',
      gate: '1',
      last: 'a4-shot-1-single',
      pictures: ['a4-shot-1-single'],
      attempt: 4,
    })
    assert.match(reason, /no reserve slot is free/)
    assert.deepEqual(
      ran.generations
        .filter((g) => g.picture_id.endsWith('-shot-1-single'))
        .map((g) => [g.picture_id, g.degraded]),
      [
        ['a1-shot-1-single', false],
        ['a2-shot-1-single', false],
        ['a3-shot-1-single', false],
        ['a4-shot-1-single', true],
      ],
    )
    assert.deepEqual(
      (ran.result.stills as Array<{ shotId: string; pictureId: string }>).map(
        (s) => `${s.shotId} ${s.pictureId}`,
      ),
      ['shot-0 a1-shot-0-a'],
    )
  } finally {
    await engine.stop()
  }
})
