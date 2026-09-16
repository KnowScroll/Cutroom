import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Plan } from '@cutroom/contracts'
import { criteriaFor } from '@cutroom/pipeline'
import { NEVER, stillsRequest } from './engine/stills.ts'

// reel-stills, Slice 3 — check 28 (docs/features/reel-stills.md): which criteria a picture is held
// against (S-040, the owner's answer). A criterion is routed to a shot BY ITS CLAIM, through the
// sentences the shot's unit holds — the only structural link from a criterion to a shot. Every
// expectation below is written by hand from the request's claims, never by the code under test.

const request = stillsRequest('criteria')

/** A plan with these units; criteriaFor reads its units and nothing else. */
const planOf = (units: number[][]): Pick<Plan, 'units'> => ({ units })

/** The 6-unit grouping of eight sentences: units 0 and 1 hold two sentences each. */
const SIX = [[0, 1], [2, 3], [4], [5], [6], [7]]
/** The 4-unit grouping: two sentences each. */
const FOUR = [
  [0, 1],
  [2, 3],
  [4, 5],
  [6, 7],
]

const ids = (list: ReadonlyArray<{ id: string }>) => list.map((c) => c.id)

// ---------------------------------------------------------------- 28

test('28. a mustShow presence criterion is given to the pictures of shots whose sentences carry its claim and to no other, every mustNotShow to every picture, and a mustShow with no claim to none', () => {
  // Sentences 0-1 carry c1, 2 and 5 carry c2, 4 carries c3, 7 carries c4; 3 and 6 carry none.
  const six: Record<number, string[]> = {
    0: ['show-seal'], // c1
    1: ['show-crowd'], // c2, from sentence 2
    2: [], // c3: no criterion names it
    3: ['show-crowd'], // c2, from sentence 5
    4: [], // no claim
    5: ['show-law'], // c4 — no fixture plan gives this shot a picture, which is the run's to decide
  }
  for (const [unit, mustShow] of Object.entries(six)) {
    const got = criteriaFor(Number(unit), planOf(SIX), request)
    assert.deepEqual(
      ids(got.mustShow),
      mustShow,
      `the 6-unit plan's shot ${unit} got the wrong mustShow`,
    )
    assert.deepEqual(
      ids(got.mustNotShow),
      NEVER,
      `the 6-unit plan's shot ${unit} did not get every mustNotShow`,
    )
  }

  // The same request cut into four units routes differently: the claims follow the sentences, so
  // a function that keyed criteria by unit number rather than by the unit's sentences fails here.
  const four: Record<number, string[]> = {
    0: ['show-seal'],
    1: ['show-crowd'],
    2: ['show-crowd'], // sentences 4 (c3) and 5 (c2)
    3: ['show-law'], // sentence 7 (c4)
  }
  for (const [unit, mustShow] of Object.entries(four)) {
    const got = criteriaFor(Number(unit), planOf(FOUR), request)
    assert.deepEqual(
      ids(got.mustShow),
      mustShow,
      `the 4-unit plan's shot ${unit} got the wrong mustShow`,
    )
    assert.deepEqual(ids(got.mustNotShow), NEVER)
  }

  // Never: the event criterion (D-043), and the presence criterion with no claim (S-040).
  for (const plan of [SIX, FOUR]) {
    plan.forEach((_, unit) => {
      const got = criteriaFor(unit, planOf(plan), request)
      const all = [...got.mustShow, ...got.mustNotShow]
      assert.ok(!ids(all).includes('show-pressing'), `an event criterion reached shot ${unit}`)
      assert.ok(!ids(all).includes('show-meadow'), `a mustShow with no claim reached shot ${unit}`)
      assert.ok(
        all.every((c) => c.type === 'presence'),
        `a criterion not typed presence reached shot ${unit}`,
      )
    })
  }

  // The criteria are the request's, whole: id, text, type and claim, not a copy with a field lost.
  const [seal] = criteriaFor(0, planOf(SIX), request).mustShow
  assert.deepEqual(seal, request.criteria.mustShow[0])
})
