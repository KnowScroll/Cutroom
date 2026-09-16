import assert from 'node:assert/strict'
import { test } from 'node:test'
import { startEngine } from './engine/harness.ts'
import {
  RANK_ALL_HELD,
  RANK_ALL_HELD_PICS,
  RANK_NOT_SHOT,
  RANK_NOT_SHOT_PICS,
  THREE_RANKS,
  THREE_RANKS_PICS,
  TWO_SHARED,
  TWO_SHARED_PICS,
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
  type PictureRow,
  type Stilled,
} from './engine/stills.ts'

// reel-stills, Slice 4 — checks 38 and 39 (docs/features/reel-stills.md): a derived picture's
// ladders (S-043, D-050, D-014). A picture failing Gate 1 takes one repair from any free reserve
// slot; a picture failing Gate 1S takes a repair while a slot is free and its shot has had fewer than
// two. A shot left with no approved picture goes on without one, labelled in four places (I-4,
// D-025), and the run completes.

const [a, b, barons, hall] = THREE_RANKS_PICS as [Pic, Pic, Pic, Pic]
const canonicalRepair = again(a, 'repair')

/** Every reason a picture's Gate 1 verdict failed on. */
const failedReasons = (row: PictureRow) =>
  (row.gate1?.steps ?? []).filter((s) => s.outcome === 'fail').flatMap((s) => s.reasons)

/** What a repair's prompt appends to its entry's prompt. */
function appended(repair: PictureRow, base: PictureRow): string {
  assert.ok(
    repair.prompt.startsWith(`${base.prompt}\n`),
    `${repair.picture_id}'s prompt is not ${base.picture_id}'s with the reasons appended`,
  )
  return repair.prompt.slice(base.prompt.length)
}

const calls = (engine: { image: { calls: ReadonlyArray<{ pictureId: string }> } }) =>
  engine.image.calls.map((c) => c.pictureId)

const stilled = (ran: Stilled) =>
  (ran.result.stills as Array<{ pictureId: string; shotId: string }>).map(
    (s) => `${s.shotId} ${s.pictureId}`,
  )

// ---------------------------------------------------------------- 38

test("38. a derived picture failing Gate 1 takes one repair, its prompt carrying the verdict's reasons, when any reserve slot is free; with none free, or when the repair fails Gate 1, its shot has no picture and is labelled in four places — a degradation row, its last verdict, its generation receipts and a degraded event — and the run completes", async () => {
  // A slot is free: the barons show a person, their repair does not, and it is chosen.
  const bRepair = again(barons, 'repair')
  const repaired = await startEngine({
    worker: true,
    script: stillsScript(THREE_RANKS, [a, b, barons, bRepair, hall], {
      reconciler: { [barons.key]: showsPerson(barons) },
    }),
  })
  try {
    const ran = await stills(repaired, stillsRequest('r38-repaired'))
    assert.equal(ran.result.status, 'completed', JSON.stringify(ran.result))
    assert.deepEqual(calls(repaired), [
      'a1-shot-0-a',
      'a1-shot-0-b',
      'a1-shot-1-single',
      'a1-shot-1-repair',
      'a1-shot-2-single',
    ])
    const single = pictureOf(ran, barons.key)
    const repair = pictureOf(ran, bRepair.key)
    const canonical = pictureOf(ran, a.key)
    assert.equal(single.gate1?.outcome, 'fail')
    const reasons = failedReasons(single)
    assert.match(reasons.join(' | '), /never-person/)
    const tail = appended(repair, single)
    for (const reason of reasons) {
      assert.ok(tail.includes(reason), `the repair's prompt does not carry "${reason}":\n${tail}`)
    }
    // It keeps the canonical as its reference, goes through Gate 1, and is chosen.
    assert.equal(canonical.chosen, true, 'the fixture no longer chooses candidate a')
    assert.deepEqual(repaired.image.calls[3]?.references, [
      { pictureId: canonical.picture_id, path: canonical.path },
    ])
    assert.deepEqual(
      repair.gate1?.steps.map((s) => s.step),
      ['technical', 'text', 'witness', 'reconcile'],
    )
    assert.equal(repair.gate1?.outcome, 'accept')
    assert.deepEqual([single.chosen, repair.chosen], [false, true])
    assert.deepEqual(stilled(ran), [
      'shot-0 a1-shot-0-a',
      'shot-1 a1-shot-1-repair',
      'shot-2 a1-shot-2-single',
    ])
    assert.deepEqual(ran.degradations, [])
    assert.deepEqual(ran.result.degradations, [])
    assert.ok(ran.generations.every((g) => !g.degraded))
  } finally {
    await repaired.stop()
  }

  // The repair fails Gate 1 too: the wrong shape. Its shot goes on without a picture.
  const failing = await startEngine({
    worker: true,
    images: { [bRepair.key]: { shape: 'wrong-size' } },
    script: stillsScript(THREE_RANKS, [a, b, barons, hall], {
      reconciler: { [barons.key]: showsPerson(barons) },
    }),
  })
  try {
    const ran = await stills(failing, stillsRequest('r38-repair-fails'))
    assert.equal(ran.result.status, 'completed', JSON.stringify(ran.result))
    assert.deepEqual(calls(failing), [
      'a1-shot-0-a',
      'a1-shot-0-b',
      'a1-shot-1-single',
      'a1-shot-1-repair',
      'a1-shot-2-single',
    ])
    const repair = pictureOf(ran, bRepair.key)
    assert.equal(repair.gate1?.outcome, 'fail')
    const reason = assertDegraded(ran, {
      shotId: 'shot-1',
      gate: '1',
      last: repair.picture_id,
      pictures: ['a1-shot-1-single', 'a1-shot-1-repair'],
    })
    for (const why of failedReasons(repair)) {
      assert.ok(reason.includes(why), `the degradation does not say why: ${reason}`)
    }
    // Gate 1S never ran on the degraded shot, and the run went on to the next.
    assert.equal(pictureOf(ran, barons.key).gate1s, null)
    assert.equal(repair.gate1s, null)
    assert.deepEqual(stilled(ran), ['shot-0 a1-shot-0-a', 'shot-2 a1-shot-2-single'])
  } finally {
    await failing.stop()
  }

  // No slot free: the canonical's repair takes one and the barons' repair the other — a Gate 1
  // repair may take the slot D-027 held for consistency (S-043) — so the hall, failing Gate 1, has
  // none, and is degraded with no repair.
  const hRepair = again(hall, 'repair')
  const none = await startEngine({
    worker: true,
    script: stillsScript(THREE_RANKS, [a, b, canonicalRepair, barons, bRepair, hall], {
      witness: { [a.key]: clipped(a), [b.key]: clipped(b) },
      reconciler: { [barons.key]: showsPerson(barons), [hall.key]: showsPerson(hall) },
    }),
  })
  try {
    const ran = await stills(none, stillsRequest('r38-no-slot'))
    assert.equal(ran.result.status, 'completed', JSON.stringify(ran.result))
    assert.deepEqual(calls(none), [
      'a1-shot-0-a',
      'a1-shot-0-b',
      'a1-shot-0-repair',
      'a1-shot-1-single',
      'a1-shot-1-repair',
      'a1-shot-2-single',
    ])
    assert.ok(!calls(none).includes(`a1-${hRepair.key}`), 'a seventh image call was made')
    const single = pictureOf(ran, hall.key)
    const reason = assertDegraded(ran, {
      shotId: 'shot-2',
      gate: '1',
      last: single.picture_id,
      pictures: ['a1-shot-2-single'],
    })
    for (const why of failedReasons(single)) {
      assert.ok(reason.includes(why), `the degradation does not say why: ${reason}`)
    }
    assert.deepEqual(stilled(ran), ['shot-0 a1-shot-0-repair', 'shot-1 a1-shot-1-repair'])
  } finally {
    await none.stop()
  }

  // Two shots degraded in one run, where rank order is not shot order: rank 2 opens shot 3 and rank 3
  // shot 1, and each picture and its repair fail Gate 1. Both shots are labelled, and the result and
  // the record list them alike, in the order the ladders reached them (S-058).
  const [twoA, twoB, rank2, rank3] = RANK_NOT_SHOT_PICS as [Pic, Pic, Pic, Pic]
  const two = await startEngine({
    worker: true,
    images: {
      [again(rank2, 'repair').key]: { shape: 'wrong-size' },
      [again(rank3, 'repair').key]: { shape: 'unreadable' },
    },
    script: stillsScript(RANK_NOT_SHOT, [twoA, twoB, rank2, rank3], {
      reconciler: { [rank2.key]: showsPerson(rank2), [rank3.key]: showsPerson(rank3) },
    }),
  })
  try {
    const ran = await stills(two, stillsRequest('r38-two'))
    assert.equal(ran.result.status, 'completed', JSON.stringify(ran.result))
    assert.deepEqual(calls(two), [
      'a1-shot-0-a',
      'a1-shot-0-b',
      'a1-shot-3-single',
      'a1-shot-3-repair',
      'a1-shot-1-single',
      'a1-shot-1-repair',
    ])
    const three = assertDegraded(ran, {
      shotId: 'shot-3',
      gate: '1',
      last: 'a1-shot-3-repair',
      pictures: ['a1-shot-3-single', 'a1-shot-3-repair'],
    })
    const one = assertDegraded(ran, {
      shotId: 'shot-1',
      gate: '1',
      last: 'a1-shot-1-repair',
      pictures: ['a1-shot-1-single', 'a1-shot-1-repair'],
    })
    const listed = [
      { shotId: 'shot-3', reason: three },
      { shotId: 'shot-1', reason: one },
    ]
    assert.deepEqual(ran.result.degradations, listed, "the result's degradations")
    assert.deepEqual(ran.record.degradations, listed, "the record's degradations")
    assert.deepEqual(stilled(ran), ['shot-0 a1-shot-0-a'])
  } finally {
    await two.stop()
  }
})

// ---------------------------------------------------------------- 39

test('39. a derived picture failing Gate 1S takes one repair when a slot is free, its prompt carrying the shared subjects answered no; the repair goes through Gate 1 then Gate 1S; a repair that fails Gate 1S is repaired again, as repair-2, while a slot is free; on a plan of 3, a shot whose repair-2 fails Gate 1S is degraded with a slot still free; with no slot free, its shot is degraded and labelled in the same four places, no picture of it is chosen or in the stills, and the run completes', async () => {
  // A plan of 3 — the king on shot 0, the seal on shot 2, both shots showing both — so its reserve is
  // 3. The seal's picture, its repair and its repair-2 each fail Gate 1S, each for a different
  // subject: after two repairs the shot is degraded, with the third slot unspent (D-014).
  const [kingA, kingB, seal] = TWO_SHARED_PICS as [Pic, Pic, Pic]
  const sealRepair = again(seal, 'repair')
  const sealRepair2 = again(seal, 'repair-2')
  const both = ['a wax seal', 'a king']
  const capped = await startEngine({
    worker: true,
    sensors: {
      [seal.key]: { similarity: 0.1 },
      [sealRepair.key]: { similarity: 0.1 },
      [sealRepair2.key]: { similarity: 0.1 },
    },
    script: stillsScript(TWO_SHARED, [kingA, kingB, seal, sealRepair, sealRepair2], {
      judge: [judged(both, ['a king']), judged(both, ['a wax seal']), judged(both, ['a king'])],
    }),
  })
  try {
    const ran = await stills(capped, stillsRequest('r39-capped'))
    assert.equal(ran.result.status, 'completed', JSON.stringify(ran.result))
    assert.equal(ran.plan.plannedImageCalls, 3, 'the fixture is no longer a plan of 3')
    assert.deepEqual(calls(capped), [
      'a1-shot-0-a',
      'a1-shot-0-b',
      'a1-shot-2-single',
      'a1-shot-2-repair',
      'a1-shot-2-repair-2',
    ])
    const single = pictureOf(ran, seal.key)
    const repair = pictureOf(ran, sealRepair.key)
    const repair2 = pictureOf(ran, sealRepair2.key)
    const canonical = pictureOf(ran, kingA.key)
    assert.equal(canonical.chosen, true, 'the fixture no longer chooses candidate a')

    // Each repair's prompt carries the subjects its verdict answered no — and not the one answered
    // yes — appended to the entry's prompt; each keeps the canonical as its reference.
    const repairTail = appended(repair, single)
    assert.ok(repairTail.includes('a king'), repairTail)
    assert.ok(
      !repairTail.includes('a wax seal'),
      `a subject answered yes is carried:\n${repairTail}`,
    )
    const repair2Tail = appended(repair2, single)
    assert.ok(repair2Tail.includes('a wax seal'), repair2Tail)
    assert.ok(!repair2Tail.includes('a king'), `repair-2 carries a verdict it did not consume`)
    for (const call of capped.image.calls.slice(2)) {
      assert.deepEqual(call.references, [{ pictureId: canonical.picture_id, path: canonical.path }])
    }

    // Each repair went through Gate 1, then Gate 1S, in that order.
    for (const row of [repair, repair2]) {
      assert.equal(row.gate1?.outcome, 'accept', `${row.picture_id} did not pass Gate 1`)
      assert.equal(row.gate1s?.outcome, 'fail', `${row.picture_id} did not fail Gate 1S`)
      assert.equal(row.gate1s?.compared, true)
    }
    assert.deepEqual(
      ran.events
        .filter((e) => e.type === 'verdict' && e.shotId === 'shot-2')
        .map((e) => `${String(e.gate)} ${String(e.outcome)}`),
      ['1 accept', '1S fail', '1 accept', '1S fail', '1 accept', '1S fail'],
    )
    assert.deepEqual(
      capped.model.compareCalls.map((c) => c.pictures[1].pictureId),
      ['a1-shot-2-single', 'a1-shot-2-repair', 'a1-shot-2-repair-2'],
    )

    const reason = assertDegraded(ran, {
      shotId: 'shot-2',
      gate: '1S',
      last: repair2.picture_id,
      pictures: ['a1-shot-2-single', 'a1-shot-2-repair', 'a1-shot-2-repair-2'],
    })
    assert.ok(reason.includes('a king'), `the degradation does not say why: ${reason}`)
    assert.deepEqual(stilled(ran), ['shot-0 a1-shot-0-a'])
  } finally {
    await capped.stop()
  }

  // No slot free: the canonical's repair takes one, the hall's first Gate 1S repair the other, and
  // when that repair fails Gate 1S too, the shot — with one repair made — is degraded.
  const hRepair = again(hall, 'repair')
  const none = await startEngine({
    worker: true,
    sensors: { [hall.key]: { similarity: 0.5 }, [hRepair.key]: { similarity: 0.5 } },
    script: stillsScript(THREE_RANKS, [a, b, canonicalRepair, barons, hall, hRepair], {
      witness: { [a.key]: clipped(a), [b.key]: clipped(b) },
      judge: [judged(['a wax seal'], ['a wax seal']), judged(['a wax seal'], ['a wax seal'])],
    }),
  })
  try {
    const ran = await stills(none, stillsRequest('r39-no-slot'))
    assert.equal(ran.result.status, 'completed', JSON.stringify(ran.result))
    assert.deepEqual(calls(none), [
      'a1-shot-0-a',
      'a1-shot-0-b',
      'a1-shot-0-repair',
      'a1-shot-1-single',
      'a1-shot-2-single',
      'a1-shot-2-repair',
    ])
    const repair = pictureOf(ran, hRepair.key)
    assert.equal(repair.gate1?.outcome, 'accept')
    assert.equal(repair.gate1s?.outcome, 'fail')
    const reason = assertDegraded(ran, {
      shotId: 'shot-2',
      gate: '1S',
      last: repair.picture_id,
      pictures: ['a1-shot-2-single', 'a1-shot-2-repair'],
    })
    assert.ok(reason.includes('a wax seal'), `the degradation does not say why: ${reason}`)
    assert.deepEqual(stilled(ran), ['shot-0 a1-shot-0-repair', 'shot-1 a1-shot-1-single'])
    assert.ok(
      !ran.record.pictures.some((p) => p.shotId === 'shot-2' && p.chosen),
      'a picture of the degraded shot is chosen in the record',
    )
  } finally {
    await none.stop()
  }

  // A slot freed by the placement: the king's every shot is held, so the plan's 4 calls place 3 and
  // the reserve is 3 (S-043). The canonical's repair, the hall's Gate 1 repair and then its repair-2
  // — for the Gate 1S failure of its repair — take all three, and the run completes with the hall.
  const [heldA, heldB, heldHall] = RANK_ALL_HELD_PICS as [Pic, Pic, Pic]
  const heldRepair = again(heldHall, 'repair')
  const heldRepair2 = again(heldHall, 'repair-2')
  const freed = await startEngine({
    worker: true,
    sensors: { [heldRepair.key]: { similarity: 0.5 } },
    script: stillsScript(
      RANK_ALL_HELD,
      [heldA, heldB, again(heldA, 'repair'), heldHall, heldRepair, heldRepair2],
      {
        witness: { [heldA.key]: clipped(heldA), [heldB.key]: clipped(heldB) },
        reconciler: { [heldHall.key]: showsPerson(heldHall) },
        judge: [judged(['a king'], ['a king'])],
      },
    ),
  })
  try {
    const ran = await stills(freed, stillsRequest('r39-freed'))
    assert.equal(ran.result.status, 'completed', JSON.stringify(ran.result))
    assert.equal(ran.plan.plannedImageCalls, 4, 'the fixture no longer plans 4')
    assert.deepEqual(calls(freed), [
      'a1-shot-0-a',
      'a1-shot-0-b',
      'a1-shot-0-repair',
      'a1-shot-1-single',
      'a1-shot-1-repair',
      'a1-shot-1-repair-2',
    ])
    assert.equal(pictureOf(ran, heldRepair.key).gate1s?.outcome, 'fail')
    assert.equal(pictureOf(ran, heldRepair2.key).gate1s?.outcome, 'accept')
    assert.deepEqual(ran.degradations, [])
    assert.deepEqual(stilled(ran), ['shot-0 a1-shot-0-repair', 'shot-1 a1-shot-1-repair-2'])
  } finally {
    await freed.stop()
  }
})
