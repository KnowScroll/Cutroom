import assert from 'node:assert/strict'
import { test } from 'node:test'
import { startEngine } from './engine/harness.ts'
import {
  THREE_RANKS,
  THREE_RANKS_PICS,
  again,
  assertDegraded,
  clipped,
  judged,
  pictureOf,
  showsPerson,
  stills,
  stillsRequest,
  stillsScript,
  type Pic,
} from './engine/stills.ts'

// reel-stills, Slice 4 — check 40 (docs/features/reel-stills.md): the reserve (D-027, D-048, S-043).
// A placement of four calls leaves two of the six. The stage runs in order, so the canonical's
// repair has first claim (D-048); any repair may take any free slot (S-043); and once both are
// spent, a shot that fails is degraded rather than making a seventh call.

const [a, b, barons, hall] = THREE_RANKS_PICS as [Pic, Pic, Pic, Pic]

// ---------------------------------------------------------------- 40

test('40. on a script where both canonical candidates fail and its repair passes, rank 2s picture fails Gate 1 and passes its repair, and rank 3s fails Gate 1S: the reserve of 2 goes to the canonical and to rank 2, rank 3s shot is degraded, and the run makes exactly 6 image calls and plans 4', async () => {
  const canonicalRepair = again(a, 'repair')
  const baronsRepair = again(barons, 'repair')
  const engine = await startEngine({
    worker: true,
    sensors: { [hall.key]: { similarity: 0.5 } },
    script: stillsScript(THREE_RANKS, [a, b, canonicalRepair, barons, baronsRepair, hall], {
      witness: { [a.key]: clipped(a), [b.key]: clipped(b) },
      reconciler: { [barons.key]: showsPerson(barons) },
      judge: [judged(['a wax seal'], ['a wax seal'])],
    }),
  })
  try {
    const ran = await stills(engine, stillsRequest('r40'))
    assert.equal(ran.result.status, 'completed', JSON.stringify(ran.result))

    // Plans 4 (D-027): the selected plan's planned image calls, and the four the placement makes.
    assert.equal(ran.plan.plannedImageCalls, 4)

    // Exactly 6 image calls, the reserve's two being the canonical's repair and rank 2's.
    assert.deepEqual(
      engine.image.calls.map((c) => c.pictureId),
      [
        'a1-shot-0-a',
        'a1-shot-0-b',
        'a1-shot-0-repair',
        'a1-shot-1-single',
        'a1-shot-1-repair',
        'a1-shot-2-single',
      ],
    )
    assert.equal(ran.generations.length, 6)

    assert.equal(pictureOf(ran, canonicalRepair.key).chosen, true)
    assert.equal(pictureOf(ran, barons.key).gate1?.outcome, 'fail')
    assert.equal(pictureOf(ran, baronsRepair.key).gate1?.outcome, 'accept')
    assert.equal(pictureOf(ran, baronsRepair.key).chosen, true)

    // Rank 3 passed Gate 1 and failed Gate 1S with no slot left: degraded, with no repair.
    const rank3 = pictureOf(ran, hall.key)
    assert.equal(rank3.gate1?.outcome, 'accept')
    assert.equal(rank3.gate1s?.outcome, 'fail')
    assertDegraded(ran, {
      shotId: 'shot-2',
      gate: '1S',
      last: rank3.picture_id,
      pictures: ['a1-shot-2-single'],
    })
    assert.deepEqual(
      (ran.result.stills as Array<{ shotId: string; pictureId: string }>).map(
        (s) => `${s.shotId} ${s.pictureId}`,
      ),
      ['shot-0 a1-shot-0-repair', 'shot-1 a1-shot-1-repair'],
    )
  } finally {
    await engine.stop()
  }
})
