import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { test } from 'node:test'
import { startEngine } from './engine/harness.ts'
import {
  CANONICAL_ONLY,
  CANONICAL_ONLY_PICS,
  THREE_RANKS,
  THREE_RANKS_PICS,
  again,
  clipped,
  pictureOf,
  showsPerson,
  stills,
  stillsRequest,
  stillsScript,
  type Pic,
  type PictureRow,
} from './engine/stills.ts'

// reel-stills, Slice 4 — checks 36 and 37 (docs/features/reel-stills.md): when best-of-2 yields no
// survivor (D-047). One repair call, told why both candidates failed; a repair that passes is the
// canonical outright, with no score; a repair that fails too stops the run for a rule, before any
// derived picture, and no plan is made again (D-065).

const [a, b, barons, hall] = THREE_RANKS_PICS as [Pic, Pic, Pic, Pic]
const repair = again(a, 'repair')

/** Every reason a picture's Gate 1 verdict failed on, step by step. */
const failedReasons = (row: PictureRow) =>
  (row.gate1?.steps ?? []).filter((s) => s.outcome === 'fail').flatMap((s) => s.reasons)

/** What a repair's prompt appends to the prompt it renders again (Gate 2: "appended"). */
function appended(repairPrompt: string, base: string, what: string): string {
  assert.ok(
    repairPrompt.startsWith(`${base}\n`),
    `${what}: the repair's prompt is not its entry's prompt with the reasons appended`,
  )
  const tail = repairPrompt.slice(base.length)
  assert.ok(tail.trim().length > 0, `${what}: nothing is appended`)
  return tail
}

// ---------------------------------------------------------------- 36

test("36. when both canonical candidates fail Gate 1 — including a pair that both show a clipped subject — one repair call is made, its prompt carrying both verdicts' reasons; a repair that passes is chosen without a score and derived pictures follow", async () => {
  // Both candidates show the seal cut off by the edge of the frame; the repair shows it whole.
  const engine = await startEngine({
    worker: true,
    script: stillsScript(THREE_RANKS, [a, b, repair, barons, hall], {
      witness: { [a.key]: clipped(a), [b.key]: clipped(b) },
    }),
  })
  try {
    const ran = await stills(engine, stillsRequest('r36'))
    assert.equal(ran.result.status, 'completed', JSON.stringify(ran.result))

    // Exactly one repair call, and then the derived pictures.
    assert.deepEqual(
      engine.image.calls.map((c) => c.pictureId),
      ['a1-shot-0-a', 'a1-shot-0-b', 'a1-shot-0-repair', 'a1-shot-1-single', 'a1-shot-2-single'],
    )

    const rowA = pictureOf(ran, a.key)
    const rowB = pictureOf(ran, b.key)
    for (const row of [rowA, rowB]) {
      assert.equal(row.gate1?.outcome, 'fail', `${row.picture_id} did not fail Gate 1`)
      assert.match(failedReasons(row).join(' | '), /seal.*clipped/i)
      // A clipped subject never reaches the scorer (D-046).
      assert.equal(row.score, null, `${row.picture_id} failed Gate 1 and was scored`)
      assert.equal(row.chosen, false)
    }

    // The repair renders the canonical's entry again with candidate a's framing, no reference, and
    // both verdicts' reasons appended — the same reason twice here, once for each verdict.
    const repairRow = pictureOf(ran, repair.key)
    const repairCall = engine.image.calls[2]
    assert.equal(repairRow.framing, 'medium', "the repair did not take candidate a's framing")
    assert.deepEqual(repairCall?.references, [])
    const tail = appended(repairCall?.prompt ?? '', rowA.prompt, 'the clipped pair')
    const reason = failedReasons(rowA)[0] as string
    assert.equal(
      tail.split(reason).length - 1,
      2,
      `the repair's prompt does not carry both verdicts' reason:\n${tail}`,
    )

    // It passes, and is the canonical outright: chosen, with no score (D-047 step 2).
    assert.equal(repairRow.gate1?.outcome, 'accept')
    assert.equal(repairRow.chosen, true, 'the passing repair was not chosen')
    assert.equal(repairRow.score, null, 'a sole survivor was scored')
    assert.equal(
      (ran.result.stills as Array<{ pictureId: string; shotId: string }>)[0]?.pictureId,
      repairRow.picture_id,
    )

    // Derived pictures follow, each from the repair alone.
    for (const call of engine.image.calls.slice(3)) {
      assert.deepEqual(
        call.references,
        [{ pictureId: repairRow.picture_id, path: repairRow.path }],
        `${call.pictureId} was not made from the chosen repair`,
      )
    }
    assert.deepEqual(
      (ran.result.stills as Array<{ shotId: string }>).map((s) => s.shotId),
      ['shot-0', 'shot-1', 'shot-2'],
    )
  } finally {
    await engine.stop()
  }

  // Two different failures, so "both verdicts' reasons" cannot be met by one: a shows a person it
  // must never show, and b is the wrong shape. Each reason is appended.
  const [onlyA, onlyB] = CANONICAL_ONLY_PICS as [Pic, Pic]
  const distinct = await startEngine({
    worker: true,
    images: { [onlyB.key]: { shape: 'wrong-size' } },
    script: stillsScript(CANONICAL_ONLY, [onlyA, again(onlyA, 'repair')], {
      reconciler: { [onlyA.key]: showsPerson(onlyA) },
    }),
  })
  try {
    const ran = await stills(distinct, stillsRequest('r36-distinct'))
    assert.equal(ran.result.status, 'completed', JSON.stringify(ran.result))
    const rowA = pictureOf(ran, onlyA.key)
    const rowB = pictureOf(ran, onlyB.key)
    const reasonsA = failedReasons(rowA)
    const reasonsB = failedReasons(rowB)
    assert.match(reasonsA.join(' | '), /never-person/, 'the fixture no longer fails a at reconcile')
    assert.match(reasonsB.join(' | '), /160x160/, 'the fixture no longer fails b at technical')
    assert.equal(distinct.image.calls.length, 3)
    const repairRow = pictureOf(ran, 'shot-0-repair')
    const tail = appended(repairRow.prompt, rowA.prompt, 'two different failures')
    for (const reason of [...reasonsA, ...reasonsB]) {
      assert.ok(tail.includes(reason), `the repair's prompt does not carry "${reason}":\n${tail}`)
    }
    assert.equal(repairRow.chosen, true)
    assert.equal(repairRow.score, null)
  } finally {
    await distinct.stop()
  }
})

// ---------------------------------------------------------------- 37

test('37. a repair that fails too finishes the run stopped for a rule, gate-1 at the stills step, with three image receipts, no derived call, three Gate 1 verdicts, three pictures in the record, no stage.finished for stills, no planner receipt after the plan stages and one reel.plan job', async () => {
  // Three different failures: a is clipped, b is the wrong shape, and the repair shows a person.
  const engine = await startEngine({
    worker: true,
    images: { [b.key]: { shape: 'wrong-size' } },
    script: stillsScript(THREE_RANKS, [a, repair], {
      witness: { [a.key]: clipped(a) },
      reconciler: { [repair.key]: showsPerson(repair) },
    }),
  })
  try {
    const ran = await stills(engine, stillsRequest('r37'))
    const detail = String(ran.result.detail)
    assert.deepEqual(ran.result, {
      contractVersion: 1,
      runId: ran.runId,
      requestId: 'r37',
      costCents: 0,
      status: 'stopped',
      reason: 'rule',
      rule: 'gate-1',
      step: 'stills',
      detail,
    })

    // The detail names each canonical picture's failed steps and their reasons.
    const rows = ['shot-0-a', 'shot-0-b', 'shot-0-repair'].map((key) => pictureOf(ran, key))
    for (const row of rows) {
      assert.equal(row.gate1?.outcome, 'fail')
      assert.ok(detail.includes(row.picture_id), `the detail does not name ${row.picture_id}`)
      for (const step of row.gate1?.steps.filter((s) => s.outcome === 'fail') ?? []) {
        assert.ok(detail.includes(step.step), `the detail does not name ${step.step}: ${detail}`)
        for (const reason of step.reasons) {
          assert.ok(detail.includes(reason), `the detail does not carry "${reason}": ${detail}`)
        }
      }
    }
    assert.deepEqual(
      rows.map((r) => r.gate1?.steps.find((s) => s.outcome === 'fail')?.step),
      ['reconcile', 'technical', 'reconcile'],
      'the fixture no longer fails the three pictures at different steps',
    )

    // Three image receipts and no derived call.
    assert.deepEqual(
      ran.generations.map((g) => g.picture_id),
      ['a1-shot-0-a', 'a1-shot-0-b', 'a1-shot-0-repair'],
    )
    assert.deepEqual(
      engine.image.calls.map((c) => c.pictureId),
      ['a1-shot-0-a', 'a1-shot-0-b', 'a1-shot-0-repair'],
      'a derived picture was attempted after the canonical failed three times',
    )

    // Three Gate 1 verdicts, and three pictures in the record, none chosen.
    const verdicts = ran.events.filter((e) => e.type === 'verdict' && e.gate === '1')
    assert.deepEqual(
      verdicts.map((e) => `${String(e.shotId)} ${String(e.outcome)}`),
      ['shot-0 fail', 'shot-0 fail', 'shot-0 fail'],
    )
    assert.deepEqual(
      ran.record.pictures.map((p) => [p.pictureId, p.chosen]),
      [
        ['a1-shot-0-a', false],
        ['a1-shot-0-b', false],
        ['a1-shot-0-repair', false],
      ],
    )

    // No stage.finished for stills (S-025's rule, S-046).
    assert.deepEqual(
      ran.events.filter((e) => e.type === 'stage.finished').map((e) => e.stage),
      ['plan'],
    )

    // No plan made again (D-065): the planner's two receipts, both before the first picture's.
    const planner = ran.receipts.filter((r) => r.role === 'planner')
    assert.equal(planner.length, 2, `${planner.length} planner receipts`)
    const firstPicture = Math.min(
      ...ran.receipts.filter((r) => r.role !== 'planner').map((r) => r.id),
    )
    assert.ok(
      planner.every((r) => r.id < firstPicture),
      'a planner receipt was written after the plan stage',
    )
    assert.equal(engine.model.calls.filter((c) => c.role === 'planner').length, 2)
    assert.deepEqual(
      ran.jobs.map((j) => j.kind),
      ['reel.plan', 'reel.keyframes'],
    )
    assert.deepEqual(ran.degradations, [])
    assert.equal(existsSync(engine.questionsPath), false, 'a rule stop wrote a question')
  } finally {
    await engine.stop()
  }
})
