import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { test } from 'node:test'
import type { PictureRecord } from '@cutroom/contracts'
import { closeDatabase, openDatabase, upsertPicture } from '../packages/domain/src/index.ts'
import { startEngine } from './engine/harness.ts'
import { PLANNED, described, killedMidStills, takenUp } from './engine/restart.ts'
import {
  THREE_RANKS,
  THREE_RANKS_PICS,
  stillsRequest,
  stillsScript,
  type Pic,
} from './engine/stills.ts'

// reel-stills, Slice 5 — check 48 (docs/features/reel-stills.md): a restart (S-027, S-046, S-048).
// A keyframes job whose worker was killed is claimed again when its lease runs out and run from the
// start: every picture is made again and paid for again, under the new attempt's ids. The killed
// attempt's pictures stay in the record with the checks they completed — no verdict outcome where
// one was cut off, none chosen — and its receipts, files and cost stay, and are counted.
//
// In both runs the first worker is held at MODEL CALL 5: the planner's two calls, then candidate a's
// witness (3) and reconcile (4), then candidate b's witness. So candidate a has been through all of
// Gate 1, candidate b has been measured and read but never seen, and two image calls have returned.

const [a] = THREE_RANKS_PICS as [Pic, Pic, Pic, Pic]

const GATE1 = ['technical', 'text', 'witness', 'reconcile']
const accepted = (steps: readonly string[]) =>
  steps.map((step) => ({ gate: '1', step, outcome: 'accept' }))

// ---------------------------------------------------------------- 48

test('48. after a worker is killed mid-stills and a new one started, the run completes; stage.started for stills appears once; the first attempts pictures are in the record under attempt-1 ids with the checks they completed, no verdict outcome where one was cut off, and none chosen, and the record lists every picture in seq order, attempt 1s before attempt 2s; its receipts and cost are kept', async () => {
  // Candidate a of the FIRST attempt costs 7 — keyed by its whole id, so the second attempt's a
  // costs nothing, and 7 is what the first attempt spent.
  const engine = await startEngine({ worker: false, images: { 'a1-shot-0-a': { costCents: 7 } } })
  try {
    const killed = await killedMidStills(engine, stillsRequest('r48'), {
      script: stillsScript(THREE_RANKS, [a]),
      holdAtCall: 5,
      made: ['a1-shot-0-a', 'a1-shot-0-b'],
    })
    assert.deepEqual(
      killed.before.generations.map((g) => g.cost_cents),
      [7, 0],
    )
    assert.equal(killed.before.keyframes.cost_cents, 7)
    const firstRows = engine.query<{ picture_id: string; path: string }>(
      'SELECT picture_id, path FROM picture WHERE run_id = ? ORDER BY seq',
      killed.runId,
    )

    const ran = await takenUp(engine, killed, stillsScript(THREE_RANKS, THREE_RANKS_PICS))
    const pathOf = (id: string) => ran.pictures.find((p) => p.picture_id === id)?.path

    // The run completes, with the second attempt's pictures, and the first attempt's cost.
    assert.equal(ran.result.status, 'completed', JSON.stringify(ran.result))
    assert.deepEqual(ran.result, {
      contractVersion: 1,
      runId: ran.runId,
      requestId: 'r48',
      costCents: 7,
      status: 'completed',
      until: 'stills',
      estimateCents: 220,
      stills: [
        { pictureId: 'a2-shot-0-a', shotId: 'shot-0', path: pathOf('a2-shot-0-a') },
        {
          pictureId: 'a2-shot-1-single',
          shotId: 'shot-1',
          path: pathOf('a2-shot-1-single'),
        },
        {
          pictureId: 'a2-shot-2-single',
          shotId: 'shot-2',
          path: pathOf('a2-shot-2-single'),
        },
      ],
      degradations: [],
    })

    // Every picture made again from the start, and paid for again (S-048).
    assert.deepEqual(
      engine.image.calls.map((c) => c.pictureId),
      ['a2-shot-0-a', 'a2-shot-0-b', 'a2-shot-1-single', 'a2-shot-2-single'],
    )

    // stage.started for stills once; only the finishing attempt's verdicts are events.
    assert.deepEqual(described(ran.events), [
      ...PLANNED,
      'stage.started stills',
      'verdict 1 shot-0 accept',
      'verdict 1 shot-0 accept',
      'verdict 1 shot-1 accept',
      'verdict 1 shot-2 accept',
      'verdict 1S shot-1 accept',
      'verdict 1S shot-2 accept',
      'stage.finished stills',
      'run.finished completed',
    ])
    assert.equal(
      ran.events.filter((e) => e.type === 'stage.started' && e.stage === 'stills').length,
      1,
      'stage.started for stills was written twice',
    )

    // The record: every picture made, in seq order, attempt 1's before attempt 2's. Attempt 1's
    // candidate a completed Gate 1; b was cut off after text, so it has two checks and no
    // observation; neither is chosen.
    assert.deepEqual(
      ran.record.pictures.map((p) => ({
        pictureId: p.pictureId,
        shotId: p.shotId,
        chosen: p.chosen,
        checks: p.checks,
        ids: [p.observationId ?? null, p.reconciliationId ?? null],
      })),
      [
        {
          pictureId: 'a1-shot-0-a',
          shotId: 'shot-0',
          chosen: false,
          checks: accepted(GATE1),
          ids: ['obs-a1-shot-0-a', 'rec-a1-shot-0-a'],
        },
        {
          pictureId: 'a1-shot-0-b',
          shotId: 'shot-0',
          chosen: false,
          checks: accepted(['technical', 'text']),
          ids: [null, null],
        },
        {
          pictureId: 'a2-shot-0-a',
          shotId: 'shot-0',
          chosen: true,
          checks: accepted(GATE1),
          ids: ['obs-a2-shot-0-a', 'rec-a2-shot-0-a'],
        },
        {
          pictureId: 'a2-shot-0-b',
          shotId: 'shot-0',
          chosen: false,
          checks: accepted(GATE1),
          ids: ['obs-a2-shot-0-b', 'rec-a2-shot-0-b'],
        },
        {
          pictureId: 'a2-shot-1-single',
          shotId: 'shot-1',
          chosen: true,
          checks: [...accepted(GATE1), { gate: '1S', outcome: 'accept' }],
          ids: ['obs-a2-shot-1-single', 'rec-a2-shot-1-single'],
        },
        {
          pictureId: 'a2-shot-2-single',
          shotId: 'shot-2',
          chosen: true,
          checks: [...accepted(GATE1), { gate: '1S', outcome: 'accept' }],
          ids: ['obs-a2-shot-2-single', 'rec-a2-shot-2-single'],
        },
      ],
    )
    assert.deepEqual(
      ran.pictures.map((p) => [p.picture_id, p.seq, p.attempt]),
      [
        ['a1-shot-0-a', 1, 1],
        ['a1-shot-0-b', 2, 1],
        ['a2-shot-0-a', 3, 2],
        ['a2-shot-0-b', 4, 2],
        ['a2-shot-1-single', 5, 2],
        ['a2-shot-2-single', 6, 2],
      ],
    )
    // Cut off: b's verdict has its completed steps and no outcome; a's was decided.
    const firstA = ran.pictures.find((p) => p.picture_id === 'a1-shot-0-a')
    const firstB = ran.pictures.find((p) => p.picture_id === 'a1-shot-0-b')
    assert.equal(firstA?.gate1?.outcome, 'accept')
    assert.equal(firstB?.gate1?.outcome, null, 'a cut-off picture has a verdict outcome')
    assert.deepEqual(
      firstB?.gate1?.steps.map((s) => s.step),
      ['technical', 'text'],
    )
    assert.equal(firstB?.gate1?.coverage, 'whole picture')
    assert.equal(firstB?.score, null)

    // Its receipts are kept, under the same row ids, beside the second attempt's; and its cost.
    assert.deepEqual(
      ran.generations.map((g) => [g.picture_id, g.cost_cents]),
      [
        ['a1-shot-0-a', 7],
        ['a1-shot-0-b', 0],
        ['a2-shot-0-a', 0],
        ['a2-shot-0-b', 0],
        ['a2-shot-1-single', 0],
        ['a2-shot-2-single', 0],
      ],
    )
    assert.deepEqual(
      ran.generations.slice(0, 2).map((g) => g.id),
      killed.before.generations.map((g) => g.id),
    )
    const pictureReceipts = ran.receipts.filter((r) => r.role !== 'planner')
    assert.deepEqual(
      pictureReceipts.slice(0, 2).map((r) => [r.id, `${r.call} ${r.role} ${r.picture_ids.join()}`]),
      killed.before.receipts
        .filter((r) => r.role !== 'planner')
        .map((r) => [
          r.id,
          `${r.call} ${r.role} ${(JSON.parse(r.picture_ids) as string[]).join()}`,
        ]),
    )
    assert.deepEqual(
      pictureReceipts.slice(0, 2).map((r) => `${r.call} ${r.role} ${r.picture_ids.join()}`),
      ['observe witness a1-shot-0-a', 'structured reconciler a1-shot-0-a'],
    )
    assert.deepEqual(
      ran.jobs.map((j) => [j.kind, j.state, j.attempts, j.cost_cents]),
      [
        ['reel.plan', 'done', 1, 0],
        ['reel.keyframes', 'done', 2, 7],
      ],
    )

    // Its files stay where they were written, beside the second attempt's — read before the engine
    // is stopped, since stopping it removes its folder.
    assert.deepEqual(
      firstRows.map((r) => r.picture_id),
      ['a1-shot-0-a', 'a1-shot-0-b'],
    )
    for (const row of [...firstRows, ...ran.pictures.filter((p) => p.attempt === 2)]) {
      assert.ok(existsSync(row.path), `${row.picture_id}'s file is gone: ${row.path}`)
    }
    assert.notEqual(
      pathOf('a2-shot-0-b'),
      firstRows[1]?.path,
      'the second attempt wrote over the first attempts file',
    )

    // A picture's seq is the receipts', written once with its receipt; the recorder rewrites only
    // what its checks found (S-055). Counted from the earlier attempt's calls, the stage's own number
    // agrees with the receipts' on this run, so the run alone cannot tell a recorder that rewrites
    // seq from one that does not (S-063). Handed the second attempt's first picture numbered as a
    // stage told of no earlier call would number it — 1 — the recorder leaves the row at 3.
    const second = ran.pictures.find((p) => p.picture_id === 'a2-shot-0-a')
    assert.ok(second !== undefined)
    const db = openDatabase(engine.dbPath)
    try {
      upsertPicture(db, ran.runId, {
        pictureId: second.picture_id,
        attempt: second.attempt,
        shotUnit: second.shot_unit,
        subjectId: second.subject_id,
        role: second.role as PictureRecord['role'],
        label: second.label,
        path: second.path,
        prompt: second.prompt,
        framing: second.framing as PictureRecord['framing'],
        references: second.reference_ids,
        seq: 1,
        gate1: second.gate1 as PictureRecord['gate1'],
        measure: second.measure,
        text: second.words,
        observation: null,
        reconciliation: null,
        score: second.score as PictureRecord['score'],
        gate1s: second.gate1s as PictureRecord['gate1s'],
        degradation: second.degradation,
        chosen: second.chosen,
      })
    } finally {
      closeDatabase(db)
    }
    assert.deepEqual(
      engine
        .query<{ picture_id: string; seq: number }>(
          'SELECT picture_id, seq FROM picture WHERE run_id = ? ORDER BY seq',
          ran.runId,
        )
        .map((r) => [r.picture_id, r.seq]),
      [
        ['a1-shot-0-a', 1],
        ['a1-shot-0-b', 2],
        ['a2-shot-0-a', 3],
        ['a2-shot-0-b', 4],
        ['a2-shot-1-single', 5],
        ['a2-shot-2-single', 6],
      ],
      'the recorder rewrote a pictures seq',
    )
  } finally {
    await engine.stop()
  }
})

test('48. when the first attempts scripted cost leaves the second attempts next call above the ceiling, the run stops for budget', async () => {
  // A ceiling of 100. The first attempt's candidate b costs 90 — its call was made at 0 + 15 — and
  // the worker is killed before its next call. The second attempt's first call would be 90 + 15 =
  // 105: the guard counts what the first attempt spent (S-036, S-048), so it is not made.
  const engine = await startEngine({ worker: false, images: { 'a1-shot-0-b': { costCents: 90 } } })
  try {
    const killed = await killedMidStills(engine, stillsRequest('r48-budget', 100), {
      script: stillsScript(THREE_RANKS, [a]),
      holdAtCall: 5,
      made: ['a1-shot-0-a', 'a1-shot-0-b'],
    })
    assert.equal(killed.before.keyframes.cost_cents, 90)

    const ran = await takenUp(engine, killed, stillsScript(THREE_RANKS, THREE_RANKS_PICS))
    assert.deepEqual(ran.result, {
      contractVersion: 1,
      runId: ran.runId,
      requestId: 'r48-budget',
      costCents: 90,
      status: 'stopped',
      reason: 'budget',
      limit: 'ceiling',
      estimateCents: 105,
      ceilingCents: 100,
      capCents: 300,
    })
    assert.deepEqual(
      engine.image.calls.map((c) => c.pictureId),
      [],
      'the second attempt made a call above the ceiling',
    )
    assert.deepEqual(
      ran.generations.map((g) => [g.picture_id, g.cost_cents]),
      [
        ['a1-shot-0-a', 0],
        ['a1-shot-0-b', 90],
      ],
    )
    assert.deepEqual(described(ran.events), [
      ...PLANNED,
      'stage.started stills',
      'run.finished stopped',
    ])
    assert.deepEqual(
      ran.record.pictures.map((p) => [p.pictureId, p.chosen, p.checks.length]),
      [
        ['a1-shot-0-a', false, 4],
        ['a1-shot-0-b', false, 2],
      ],
    )
    assert.deepEqual(
      ran.jobs.map((j) => [j.kind, j.state, j.attempts, j.cost_cents]),
      [
        ['reel.plan', 'done', 1, 0],
        ['reel.keyframes', 'done', 2, 90],
      ],
    )
  } finally {
    await engine.stop()
  }
})
