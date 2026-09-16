import assert from 'node:assert/strict'
import { test } from 'node:test'
import { startEngine, type Engine } from './engine/harness.ts'
import {
  THREE_RANKS,
  THREE_RANKS_PICS,
  first,
  judged,
  passes,
  pictureOf,
  seen,
  stills,
  stillsRequest,
  stillsScript,
  type Pic,
  type Stilled,
} from './engine/stills.ts'

// reel-stills, Slice 3 — checks 4 and 22 to 26 (docs/features/reel-stills.md): Gate 1's four steps
// on every picture (D-042), deterministic steps first (I-7); a picture failing technical stops there
// (S-031); the text step never fails (S-041); and the witness is shown the picture and nothing else
// (I-8), with exactly one observe receipt for every picture that reached it (D-045, S-037).

const [a, b, barons, hall] = THREE_RANKS_PICS as [Pic, Pic, Pic, Pic]
const STEPS = ['technical', 'text', 'witness', 'reconcile']

/** A run in which the hall's pair with the canonical is suspicious enough to be judged, and passes. */
async function judgedRun(engine: Engine, requestId: string): Promise<Stilled> {
  return stills(engine, stillsRequest(requestId))
}

// ---------------------------------------------------------------- 22

test('22. every pictures Gate 1 checks are technical, text, witness and reconcile, in that order, each with an outcome; every Gate 1 verdict records coverage whole picture and every Gate 1S verdict coverage pair', async () => {
  const engine = await startEngine({
    worker: true,
    sensors: { [hall.key]: { similarity: 0.5 } },
    script: stillsScript(THREE_RANKS, THREE_RANKS_PICS, { judge: [judged(['a wax seal'])] }),
  })
  try {
    const ran = await judgedRun(engine, 'r22')
    assert.equal(ran.result.status, 'completed', JSON.stringify(ran.result))
    assert.equal(ran.pictures.length, 4)

    for (const picture of ran.pictures) {
      const gate1 = picture.gate1
      assert.ok(gate1 !== null, `${picture.picture_id} has no Gate 1 verdict`)
      assert.deepEqual(
        gate1.steps.map((s) => s.step),
        STEPS,
        `${picture.picture_id}'s steps are not Gate 1's four, in order`,
      )
      for (const step of gate1.steps) {
        assert.ok(
          ['accept', 'fail'].includes(step.outcome),
          `${picture.picture_id}'s ${step.step} has outcome ${step.outcome}`,
        )
        assert.ok(Array.isArray(step.reasons))
      }
      assert.equal(
        gate1.coverage,
        'whole picture',
        `${picture.picture_id}'s Gate 1 verdict coverage`,
      )
      assert.equal(gate1.outcome, 'accept')

      // The record says the same, check by check, and adds Gate 1S where it ran.
      const entry = ran.record.pictures.find((p) => p.pictureId === picture.picture_id)
      const expected: Array<{ gate: string; step?: string; outcome: string }> = gate1.steps.map(
        (s) => ({ gate: '1', step: s.step, outcome: s.outcome }),
      )
      if (picture.gate1s !== null) expected.push({ gate: '1S', outcome: picture.gate1s.outcome })
      assert.deepEqual(entry?.checks, expected, `${picture.picture_id}'s record checks`)
    }

    const pairs = ran.pictures.filter((p) => p.role === 'derived')
    assert.equal(pairs.length, 2)
    for (const picture of pairs) {
      assert.equal(
        picture.gate1s?.coverage,
        'pair',
        `${picture.picture_id}'s Gate 1S verdict coverage`,
      )
    }
    assert.ok(
      pairs.some((p) => p.gate1s?.compared === true),
      'the fixture no longer asks the judge',
    )
    assert.ok(pairs.some((p) => p.gate1s?.compared === false))
    for (const picture of ran.pictures.filter((p) => p.role === 'canonical')) {
      assert.equal(
        picture.gate1s,
        null,
        `the canonical ${picture.picture_id} has a Gate 1S verdict`,
      )
    }

    // Each verdict is an event, gate by gate, in the order the checks ran (S-046).
    const verdicts = ran.events
      .filter((e) => e.type === 'verdict' && e.gate !== '0')
      .map((e) => `${String(e.gate)} ${String(e.shotId)} ${String(e.outcome)}`)
    assert.deepEqual(verdicts, [
      '1 shot-0 accept',
      '1 shot-0 accept',
      '1 shot-1 accept',
      '1 shot-2 accept',
      '1S shot-1 accept',
      '1S shot-2 accept',
    ])
  } finally {
    await engine.stop()
  }
})

// ---------------------------------------------------------------- 23

test('23. a picture that is not a readable 9:16 image — a wrong size, and unreadable bytes, each built — fails technical and has no other step, no observe or reconcile call, and no observation or reconciliation id', async () => {
  for (const [shape, pic, other] of [
    ['wrong-size', a, b],
    ['unreadable', b, a],
  ] as const) {
    // The other candidate passes alone, so the run completes and the failure is only this picture's.
    const pics = THREE_RANKS_PICS.filter((p) => p !== pic)
    const engine = await startEngine({
      worker: true,
      images: { [pic.key]: { shape } },
      script: stillsScript(THREE_RANKS, pics),
    })
    try {
      const ran = await stills(engine, stillsRequest(`r23-${shape}`))
      assert.equal(ran.result.status, 'completed', `${shape}: ${JSON.stringify(ran.result)}`)
      const id = first(pic.key)
      const row = pictureOf(ran, pic.key)

      assert.equal(row.gate1?.outcome, 'fail', `${shape}: the verdict is not a fail`)
      assert.deepEqual(
        row.gate1?.steps.map((s) => [s.step, s.outcome]),
        [['technical', 'fail']],
        `${shape}: a step after technical ran`,
      )
      assert.ok(
        (row.gate1?.steps[0]?.reasons.length ?? 0) > 0,
        `${shape}: technical failed with no reason`,
      )
      if (shape === 'wrong-size') {
        // The sensor read the real file: readable, and not 9:16.
        assert.equal(row.measure?.readable, true)
        assert.notEqual((row.measure?.width ?? 0) * 16, (row.measure?.height ?? 0) * 9)
      } else {
        assert.equal(row.measure?.readable, false)
      }
      assert.equal(row.words, null, `${shape}: the text step ran`)
      assert.equal(row.score, null)
      assert.equal(row.chosen, false)

      assert.ok(
        !engine.sensors.calls.some(
          (c) => c.method === 'readText' && c.pictures.some((p) => p.pictureId === id),
        ),
        `${shape}: its words were read`,
      )
      assert.ok(
        !engine.model.observeCalls.some((c) => c.picture.pictureId === id),
        `${shape}: it was shown to the witness`,
      )
      assert.ok(
        !engine.model.calls.some((c) => c.pictureIds?.includes(id)),
        `${shape}: it was reconciled`,
      )
      assert.ok(
        !ran.receipts.some((r) => r.picture_ids.includes(id)),
        `${shape}: a model receipt names it`,
      )
      assert.ok(!ran.observations.some((o) => o.picture_id === id))
      assert.ok(!ran.reconciliations.some((r) => r.picture_id === id))

      const entry = ran.record.pictures.find((p) => p.pictureId === id)
      assert.ok(entry !== undefined, `${shape}: the record does not hold the failed picture`)
      assert.ok(!('observationId' in entry), `${shape}: the record gives it an observation id`)
      assert.ok(!('reconciliationId' in entry), `${shape}: the record gives it a reconciliation id`)
      assert.deepEqual(entry.checks, [{ gate: '1', step: 'technical', outcome: 'fail' }])

      // The other candidate is chosen, alone.
      assert.equal(
        (ran.result.stills as Array<{ pictureId: string }>)[0]?.pictureId,
        first(other.key),
      )
    } finally {
      await engine.stop()
    }
  }
})

// ---------------------------------------------------------------- 24

test('24. the text step records every word the sensor read, and its outcome is accept when words were read', async () => {
  const engine = await startEngine({
    worker: true,
    sensors: { [a.key]: { words: ['MAGNA', 'CARTA', 'MCCXV'] }, [barons.key]: { words: ['LEX'] } },
    script: stillsScript(THREE_RANKS, THREE_RANKS_PICS),
  })
  try {
    const ran = await stills(engine, stillsRequest('r24'))
    assert.equal(ran.result.status, 'completed', JSON.stringify(ran.result))
    const expected: Record<string, string[]> = {
      [a.key]: ['MAGNA', 'CARTA', 'MCCXV'],
      [b.key]: [],
      [barons.key]: ['LEX'],
      [hall.key]: [],
    }
    for (const [key, words] of Object.entries(expected)) {
      const row = pictureOf(ran, key)
      assert.deepEqual(row.words, words, `${key}'s words`)
      const text = row.gate1?.steps.find((s) => s.step === 'text')
      assert.equal(text?.outcome, 'accept', `${key}'s text step did not accept (S-041)`)
      assert.equal(row.gate1?.outcome, 'accept')
    }
  } finally {
    await engine.stop()
  }
})

// ---------------------------------------------------------------- 25

test('25. every picture past technical has exactly one observe receipt with its id, at temperature 0, and an observation, when its verdict is accept and when it is fail; every reconciliation has exactly one reconciler receipt with its pictures id', async () => {
  // Candidate a fails reconcile — something it must never show is shown — and b passes alone.
  const failing = passes(a)
  failing.criteria = failing.criteria.map((c) =>
    c.id === 'never-person' ? { ...c, shown: true, entity: 0 } : c,
  )
  const engine = await startEngine({
    worker: true,
    script: stillsScript(THREE_RANKS, THREE_RANKS_PICS, { reconciler: { [a.key]: failing } }),
  })
  try {
    const ran = await stills(engine, stillsRequest('r25'))
    assert.equal(ran.result.status, 'completed', JSON.stringify(ran.result))
    assert.equal(
      pictureOf(ran, a.key).gate1?.outcome,
      'fail',
      'the fixture no longer fails candidate a',
    )
    assert.equal(pictureOf(ran, b.key).gate1?.outcome, 'accept')

    for (const pic of THREE_RANKS_PICS) {
      const id = first(pic.key)
      const observes = ran.receipts.filter(
        (r) => r.call === 'observe' && r.picture_ids.includes(id),
      )
      assert.equal(observes.length, 1, `${id} has ${observes.length} observe receipts`)
      assert.deepEqual(observes[0]?.picture_ids, [id])
      assert.equal(observes[0]?.role, 'witness')
      assert.equal(observes[0]?.temperature, 0)

      const observation = ran.observations.filter((o) => o.picture_id === id)
      assert.equal(observation.length, 1, `${id} has ${observation.length} observations`)
      assert.equal(observation[0]?.id, `obs-${id}`)
      assert.deepEqual(observation[0]?.observation, seen(pic))

      const entry = ran.record.pictures.find((p) => p.pictureId === id)
      assert.equal(entry?.observationId, `obs-${id}`)
      assert.equal(entry?.reconciliationId, `rec-${id}`)
    }

    assert.equal(ran.reconciliations.length, 4)
    for (const reconciliation of ran.reconciliations) {
      const id = reconciliation.picture_id
      assert.equal(reconciliation.id, `rec-${id}`)
      const receipts = ran.receipts.filter(
        (r) => r.role === 'reconciler' && r.picture_ids.includes(id),
      )
      assert.equal(
        receipts.length,
        1,
        `${id}'s reconciliation has ${receipts.length} reconciler receipts`,
      )
      assert.deepEqual(receipts[0]?.picture_ids, [id])
      assert.equal(receipts[0]?.call, 'structured')
      assert.equal(receipts[0]?.temperature, 0)
    }
    // The observe receipts are the pictures', and there are no others.
    assert.equal(ran.receipts.filter((r) => r.call === 'observe').length, 4)
  } finally {
    await engine.stop()
  }
})

// ---------------------------------------------------------------- 26

test('26. every observe call the stand-in received holds only the temperature and a picture whose id and path are a picture of that run', async () => {
  // One run in the engine, so every call the stand-in received was made for it.
  const engine = await startEngine({
    worker: true,
    script: stillsScript(THREE_RANKS, THREE_RANKS_PICS),
  })
  try {
    const ran = await stills(engine, stillsRequest('r26'))
    assert.equal(ran.result.status, 'completed', JSON.stringify(ran.result))
    assert.equal(engine.model.observeCalls.length, 4)
    for (const call of engine.model.observeCalls) {
      assert.deepEqual(
        Object.keys(call).sort(),
        ['picture', 'temperature'],
        `an observe call held ${Object.keys(call).join(', ')}`,
      )
      assert.equal(call.temperature, 0)
      assert.deepEqual(
        Object.keys(call.picture).sort(),
        ['path', 'pictureId'],
        `an observe call's picture held ${Object.keys(call.picture).join(', ')}`,
      )
      const row = ran.pictures.find((p) => p.picture_id === call.picture.pictureId)
      assert.ok(
        row !== undefined,
        `the witness was shown ${call.picture.pictureId}, which is no picture of the run`,
      )
      assert.equal(
        call.picture.path,
        row.path,
        `the witness was shown ${call.picture.pictureId} at another path`,
      )
    }
    assert.deepEqual(
      engine.model.observeCalls.map((c) => c.picture.pictureId),
      ran.pictures.map((p) => p.picture_id),
      'the witness was not shown each picture once, in the order made',
    )
  } finally {
    await engine.stop()
  }
})

// ---------------------------------------------------------------- 4

test('4. every model_receipt names its call and role: every observe receipt is role witness, every compare receipt role judge, and no structured receipt is role witness', async () => {
  const engine = await startEngine({
    worker: true,
    sensors: { [hall.key]: { similarity: 0.5 } },
    script: stillsScript(THREE_RANKS, THREE_RANKS_PICS, { judge: [judged(['a wax seal'])] }),
  })
  try {
    const ran = await judgedRun(engine, 'r4')
    assert.equal(ran.result.status, 'completed', JSON.stringify(ran.result))

    // All three calls were made, so each rule below has something to hold for.
    const calls = ran.receipts.map((r) => r.call)
    assert.equal(calls.filter((c) => c === 'structured').length, engine.model.calls.length)
    assert.equal(calls.filter((c) => c === 'observe').length, engine.model.observeCalls.length)
    assert.equal(calls.filter((c) => c === 'compare').length, engine.model.compareCalls.length)
    assert.equal(engine.model.observeCalls.length, 4)
    assert.equal(engine.model.compareCalls.length, 1)

    for (const receipt of ran.receipts) {
      assert.ok(
        ['structured', 'observe', 'compare'].includes(receipt.call),
        `receipt ${receipt.id} names call ${receipt.call}`,
      )
      assert.ok(
        ['planner', 'reconciler', 'witness', 'judge'].includes(receipt.role),
        `receipt ${receipt.id} names role ${receipt.role}`,
      )
      if (receipt.call === 'observe')
        assert.equal(receipt.role, 'witness', `observe receipt ${receipt.id}`)
      if (receipt.call === 'compare')
        assert.equal(receipt.role, 'judge', `compare receipt ${receipt.id}`)
      if (receipt.call === 'structured') {
        assert.notEqual(receipt.role, 'witness', `structured receipt ${receipt.id} is the witness`)
        assert.notEqual(receipt.role, 'judge', `structured receipt ${receipt.id} is the judge`)
      }
    }
    const compare = ran.receipts.find((r) => r.call === 'compare')
    const chosen = ran.pictures.find((p) => p.role === 'canonical' && p.chosen)
    assert.deepEqual(compare?.picture_ids, [chosen?.picture_id, first(hall.key)])
    // The plan stage's calls are about no picture.
    for (const receipt of ran.receipts.filter((r) => r.role === 'planner')) {
      assert.deepEqual(receipt.picture_ids, [])
    }
  } finally {
    await engine.stop()
  }
})
