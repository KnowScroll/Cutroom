import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { KeyframeTerm, PictureMeasure } from '@cutroom/contracts'
import { DEFAULT_STILLS_SETTINGS, keyframeScore } from '@cutroom/pipeline'
import { startEngine } from './engine/harness.ts'
import { throwStatements } from './engine/source.ts'
import {
  CANONICAL_ONLY,
  CANONICAL_ONLY_PICS,
  entity,
  first,
  inTurn,
  passes,
  pictureOf,
  seen,
  stills,
  stillsRequest,
  stillsScript,
  type Entity,
  type Pic,
  type PictureRow,
  type ReconcileAnswer,
  type Stilled,
} from './engine/stills.ts'

// reel-stills, Slice 3 — checks 30, 31 and 32 (docs/features/reel-stills.md): the keyframe score
// and choosing the canonical. The score RANKS two survivors and can reject nothing (D-046, I-16):
// every term is in (0, 1], a bad weight counts as its default, and the total is capped — so every
// score is finite and above 0, and the file that computes it has no throw.

const TERMS: KeyframeTerm[] = ['faceVisible', 'unoccluded', 'prominence', 'sharpness', 'brightness']
const DEFAULTS: Record<KeyframeTerm, number> = {
  faceVisible: 2,
  unoccluded: 2,
  prominence: 2,
  sharpness: 1,
  brightness: 1,
}

const measure = (sharpness: number, brightness: number): PictureMeasure => ({
  readable: true,
  width: 90,
  height: 160,
  sharpness,
  brightness,
})

const every = (value: number): Record<KeyframeTerm, number> =>
  Object.fromEntries(TERMS.map((t) => [t, value])) as Record<KeyframeTerm, number>

// ---------------------------------------------------------------- 31

test('31. the keyframe score returns a finite number above 0 for every combination of entity answers and measures, and for missing, zero, negative, NaN, infinite and huge weights, and its file holds no throw', () => {
  const faces: Entity['faceVisible'][] = ['yes', 'partial', 'no', 'noFace']
  const prominences: Entity['prominence'][] = ['foreground', 'midground', 'background']
  const values = [0, 0.5, 1, -1, 2, Number.NaN, Infinity, -Infinity, 1e308, -0]
  const weightings: Array<[string, Record<string, number>]> = [
    ['missing', {}],
    ['zero', every(0)],
    ['negative', every(-1)],
    ['NaN', every(Number.NaN)],
    ['infinite', every(Infinity)],
    ['negative infinite', every(-Infinity)],
    ['huge', every(1e308)],
    ['largest', every(Number.MAX_VALUE)],
    ['smallest', every(Number.MIN_VALUE)],
    ['default', { ...DEFAULTS }],
    ['one missing', { faceVisible: 5, unoccluded: 5, prominence: 5, sharpness: 5 }],
  ]

  let scored = 0
  for (const faceVisible of faces)
    for (const prominence of prominences)
      for (const occluded of [false, true])
        for (const clippedByEdge of [false, true])
          for (const sharpness of values)
            for (const brightness of values)
              for (const [name, weights] of weightings) {
                const e = entity('a figure', { faceVisible, prominence, occluded, clippedByEdge })
                const score = keyframeScore(e, measure(sharpness, brightness), weights)
                const what = `${JSON.stringify({ faceVisible, prominence, occluded, sharpness, brightness })} under ${name} weights`
                assert.ok(
                  Number.isFinite(score.total) && score.total > 0,
                  `total ${score.total} for ${what}`,
                )
                for (const term of TERMS) {
                  const v = score.terms[term]
                  assert.ok(v > 0 && v <= 1, `term ${term} is ${v} for ${what}`)
                  const w = score.weights[term]
                  assert.ok(
                    Number.isFinite(w) && w > 0,
                    `weight ${term} recorded as ${w} for ${what}`,
                  )
                }
                scored += 1
              }
  assert.equal(scored, 4 * 3 * 2 * 2 * values.length * values.length * weightings.length)

  // Inputs that are not what the port types: still a number, and still above 0.
  const broken = keyframeScore(undefined as never, undefined as never, undefined as never)
  assert.ok(
    Number.isFinite(broken.total) && broken.total > 0,
    `total ${broken.total} for no inputs`,
  )

  // A weight that is missing or not a positive finite number counts as its DEFAULT — not as 0, which
  // could zero a total (S-044, unlike the plan score's S-022).
  const e = entity('a figure', { faceVisible: 'partial', prominence: 'midground', occluded: true })
  const m = measure(0.4, 0.7)
  const byDefault = keyframeScore(e, m, DEFAULTS)
  for (const [name, weights] of weightings.slice(0, 6)) {
    const score = keyframeScore(e, m, weights)
    assert.deepEqual(score.weights, DEFAULTS, `${name} weights were not replaced by their defaults`)
    assert.equal(score.total, byDefault.total, `${name} weights did not score as the defaults do`)
  }
  assert.equal(
    keyframeScore(e, m, every(1e308)).total,
    Number.MAX_VALUE,
    'a huge total was not capped',
  )

  // S-044's numbers, exactly.
  assert.deepEqual(byDefault.terms, {
    faceVisible: 2 / 3,
    unoccluded: 1 / 2,
    prominence: 2 / 3,
    sharpness: 0.4,
    brightness: 0.7,
  })
  const terms = (over: Partial<Entity>) =>
    keyframeScore(entity('x', over), measure(1, 1), DEFAULTS).terms
  assert.equal(terms({ faceVisible: 'yes' }).faceVisible, 1)
  assert.equal(terms({ faceVisible: 'noFace' }).faceVisible, 1)
  assert.equal(terms({ faceVisible: 'no' }).faceVisible, 1 / 3)
  assert.equal(terms({ occluded: false }).unoccluded, 1)
  assert.equal(terms({ prominence: 'foreground' }).prominence, 1)
  assert.equal(terms({ prominence: 'background' }).prominence, 1 / 3)
  assert.equal(
    keyframeScore(e, measure(0, 5), DEFAULTS).terms.sharpness,
    0.01,
    'sharpness 0 not clamped to 0.01',
  )
  assert.equal(
    keyframeScore(e, measure(0, 5), DEFAULTS).terms.brightness,
    1,
    'brightness 5 not clamped to 1',
  )
  // Reference quality above composition (D-031): the defaults weigh every reference term above
  // every technical one.
  assert.equal(
    byDefault.total,
    2 * (2 / 3) + 2 * (1 / 2) + 2 * (2 / 3) + 1 * 0.4 + 1 * 0.7,
    'the total is not the weighted sum of its terms',
  )

  // No path that rejects: not a throw anywhere in the file (I-16).
  assert.deepEqual(throwStatements('packages/pipeline/src/stills/score.ts'), [])
})

// ---------------------------------------------------------------- 30

const [candidateA, candidateB] = CANONICAL_ONLY_PICS as [Pic, Pic]

/** The reconciler's answer that the canonical subject is not shown: a Gate 1 failure. */
function notShown(pic: Pic): ReconcileAnswer {
  const answer = passes(pic)
  answer.subjects = answer.subjects.map((s) => ({ ...s, entity: null }))
  return answer
}

const chosenOf = (ran: Stilled) => (ran.result.stills as Array<{ pictureId: string }>)[0]?.pictureId

test('30. with both candidates past Gate 1 the higher score is chosen and a tie goes to a; both keep their terms, weights and totals; a candidate failing Gate 1 has no score; a sole survivor is chosen with none', async () => {
  const engine = await startEngine({
    worker: true,
    script: inTurn(
      // b higher: a is seen in the middle distance.
      stillsScript(CANONICAL_ONLY, CANONICAL_ONLY_PICS, {
        witness: { [candidateA.key]: seen(candidateA, () => ({ prominence: 'midground' })) },
      }),
      // A tie: both seen alike.
      stillsScript(CANONICAL_ONLY, CANONICAL_ONLY_PICS),
      // a fails Gate 1; b survives alone.
      stillsScript(CANONICAL_ONLY, CANONICAL_ONLY_PICS, {
        reconciler: { [candidateA.key]: notShown(candidateA) },
      }),
      // b fails Gate 1; a survives alone.
      stillsScript(CANONICAL_ONLY, CANONICAL_ONLY_PICS, {
        reconciler: { [candidateB.key]: notShown(candidateB) },
      }),
    ),
  })
  try {
    const higher = await stills(engine, stillsRequest('r30-higher'))
    const tie = await stills(engine, stillsRequest('r30-tie'))
    const onlyB = await stills(engine, stillsRequest('r30-only-b'))
    const onlyA = await stills(engine, stillsRequest('r30-only-a'))
    for (const ran of [higher, tie, onlyB, onlyA]) {
      assert.equal(ran.result.status, 'completed', JSON.stringify(ran.result))
    }

    // Both scored, each with every term, the weights it used and its total.
    for (const ran of [higher, tie]) {
      for (const key of [candidateA.key, candidateB.key]) {
        const score = pictureOf(ran, key).score
        assert.ok(score !== null, `${ran.runId}: ${key} survived Gate 1 and has no score`)
        assert.deepEqual(Object.keys(score.terms).sort(), [...TERMS].sort())
        assert.deepEqual(score.weights, DEFAULTS)
        assert.ok(Number.isFinite(score.total) && score.total > 0)
      }
    }

    // The higher is chosen.
    const aHigher = pictureOf(higher, candidateA.key)
    const bHigher = pictureOf(higher, candidateB.key)
    assert.ok(
      (bHigher.score?.total ?? 0) > (aHigher.score?.total ?? 0),
      'the fixture no longer scores b higher',
    )
    assert.equal(chosenOf(higher), first(candidateB.key), 'the higher score was not chosen')
    assert.deepEqual([aHigher.chosen, bHigher.chosen], [false, true])

    // A tie goes to a, the first made (D-031 rule 4).
    assert.equal(
      pictureOf(tie, candidateA.key).score?.total,
      pictureOf(tie, candidateB.key).score?.total,
    )
    assert.equal(chosenOf(tie), first(candidateA.key), 'a tie did not go to a')

    // A candidate failing Gate 1 is never scored; the sole survivor is chosen with no score.
    for (const [ran, failed, survivor] of [
      [onlyB, candidateA, candidateB],
      [onlyA, candidateB, candidateA],
    ] as const) {
      assert.equal(pictureOf(ran, failed.key).gate1?.outcome, 'fail')
      assert.equal(
        pictureOf(ran, failed.key).score,
        null,
        `${failed.key} failed Gate 1 and was scored`,
      )
      assert.equal(
        pictureOf(ran, survivor.key).score,
        null,
        `the sole survivor ${survivor.key} was scored`,
      )
      assert.equal(
        chosenOf(ran),
        first(survivor.key),
        `the sole survivor ${survivor.key} was not chosen`,
      )
      assert.equal(pictureOf(ran, survivor.key).chosen, true)
    }
  } finally {
    await engine.stop()
  }
})

// ---------------------------------------------------------------- 32

test('32. scoring a runs recorded terms with its recorded weights reproduces its recorded totals and winner, and changing a weight changes the winner on a fixture whose terms differ', async () => {
  // a: a face partly turned, and sharp. b: a face fully seen, and soft. Under the default weights a
  // wins, 7.33 to 7.2; weigh the face at 10 and b wins, 12.67 to 15.2.
  const script = () =>
    stillsScript(CANONICAL_ONLY, CANONICAL_ONLY_PICS, {
      witness: {
        [candidateA.key]: seen(candidateA, () => ({ faceVisible: 'partial' })),
        [candidateB.key]: seen(candidateB, () => ({ faceVisible: 'yes' })),
      },
    })
  const sensors = { [candidateB.key]: { sharpness: 0.2 } }
  const faceHeavy = {
    ...DEFAULT_STILLS_SETTINGS,
    scoreWeights: { ...DEFAULTS, faceVisible: 10 },
  }

  const runs: Array<{ name: string; ran: Stilled; winner: string }> = []
  for (const { name, stillsSettings, winner } of [
    { name: 'the default weights', stillsSettings: undefined, winner: candidateA.key },
    { name: 'the face weighed at 10', stillsSettings: faceHeavy, winner: candidateB.key },
  ]) {
    const engine = await startEngine({
      worker: true,
      script: script(),
      sensors,
      ...(stillsSettings === undefined ? {} : { stillsSettings }),
    })
    try {
      const ran = await stills(engine, stillsRequest(`r32-${runs.length}`))
      assert.equal(ran.result.status, 'completed', JSON.stringify(ran.result))
      runs.push({ name, ran, winner })
    } finally {
      await engine.stop()
    }
  }

  for (const { name, ran, winner } of runs) {
    const scored = [pictureOf(ran, candidateA.key), pictureOf(ran, candidateB.key)] as const
    for (const row of scored) {
      const recorded = row.score
      assert.ok(recorded !== null, `${name}: ${row.picture_id} has no score`)

      // Replayed from the record alone: the entity the reconciler matched, the measure, the weights.
      const observed = ran.observations.find((o) => o.picture_id === row.picture_id)?.observation
      const reconciled = ran.reconciliations.find((r) => r.picture_id === row.picture_id)
        ?.answer as ReconcileAnswer | undefined
      const index = reconciled?.subjects.find((s) => s.id === 'seal')?.entity ?? -1
      const matched = observed?.entities[index]
      assert.ok(
        matched !== undefined && row.measure !== null,
        `${name}: ${row.picture_id}'s inputs are not in the record`,
      )
      assert.deepEqual(
        keyframeScore(matched, row.measure, recorded.weights),
        recorded,
        `${name}: ${row.picture_id}'s score does not replay`,
      )

      // And from its terms and weights alone: the total is their weighted sum.
      const sum = TERMS.reduce(
        (total, term) => total + (recorded.weights[term] ?? 0) * (recorded.terms[term] ?? 0),
        0,
      )
      assert.ok(
        Math.abs(sum - recorded.total) <= 1e-12 * Math.max(1, sum),
        `${name}: ${row.picture_id}'s total is not its terms times its weights`,
      )
    }
    const [rowA, rowB]: readonly [PictureRow, PictureRow] = scored
    const replayed = (rowB.score?.total ?? 0) > (rowA.score?.total ?? 0) ? rowB : rowA
    assert.equal(
      replayed.picture_id,
      first(winner),
      `${name}: the recorded totals name another winner`,
    )
    assert.equal(
      replayed.chosen,
      true,
      `${name}: the winner the record replays is not the one chosen`,
    )
  }

  const [byDefault, heavy] = runs as [(typeof runs)[number], (typeof runs)[number]]
  assert.equal(
    pictureOf(heavy.ran, candidateB.key).score?.weights.faceVisible,
    10,
    'the weight used is not the setting',
  )
  assert.notEqual(
    chosenOf(byDefault.ran),
    chosenOf(heavy.ran),
    'changing a weight did not change the winner',
  )
})
