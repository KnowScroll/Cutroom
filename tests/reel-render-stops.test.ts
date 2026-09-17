import assert from 'node:assert/strict'
import { test } from 'node:test'
import { startEngine } from './engine/harness.ts'
import { CRITERION_IDS, THREE_RANKS, THREE_RANKS_PICS } from './engine/stills.ts'
import {
  UNCLAIMED,
  described,
  passesTake,
  takesOf,
  turned,
  video,
  videoRequest,
  videoScript,
  type Take,
  type TakeAnswer,
} from './engine/video.ts'

// reel-render, Slice 3 — checks 25 and 26 (docs/features/reel-render.md): what stops a reel in its
// clips stage (S-066, S-072). A shot gets one take in this build, so a take failing Gate 2, 3 or 5
// stops the run for the rule of its lowest failing gate, and nothing later is made. Every criterion of
// the request is put to some take's Gate 5 (D-043), and a mustShow no shot claims, shown by no take
// once every take is accepted, stops the reel for gate-5 — D-025 rung 3's "mustShow unmet".

const takes = takesOf(THREE_RANKS)
const [, , t2] = takes as [Take, Take, Take, Take, Take, Take]

// ---------------------------------------------------------------- 25

test('25. every criterion of the request is in the Gate 5 answer of some take', async () => {
  const engine = await startEngine({
    worker: true,
    script: videoScript(THREE_RANKS, THREE_RANKS_PICS),
  })
  try {
    const ran = await video(engine, videoRequest('r25'))
    assert.ok(
      ran.jobs.some((j) => j.kind === 'reel.assemble'),
      JSON.stringify(ran.result),
    )
    const answered = new Set(
      ran.takeReconciliations.flatMap((r) => (r.answer as TakeAnswer).criteria.map((c) => c.id)),
    )
    assert.deepEqual([...answered].sort(), [...CRITERION_IDS].sort())
    // The reel's unclaimed mustShow is in every take's answer, failing none of them.
    for (const reconciliation of ran.takeReconciliations) {
      const ids = (reconciliation.answer as TakeAnswer).criteria.map((c) => c.id)
      for (const id of UNCLAIMED) assert.ok(ids.includes(id), `${reconciliation.take_id}: ${id}`)
    }
    assert.ok(ran.takes.every((t) => t.outcome === 'accept'))
  } finally {
    await engine.stop()
  }
})

test('25. an unclaimed mustShow shown by no accepted take stops the run for rule gate-5 at step video, naming it, with a verdict for gate 5 with no shotId and no reel.assemble row', async () => {
  // Every take passes, and not one shows the meadow.
  const reconciler = Object.fromEntries(takes.map((t) => [t.key, turned(t, 'show-meadow')]))
  const engine = await startEngine({
    worker: true,
    script: videoScript(THREE_RANKS, THREE_RANKS_PICS, { reconciler }),
  })
  try {
    const ran = await video(engine, videoRequest('r25-unmet'))
    assert.equal(ran.result.status, 'stopped', JSON.stringify(ran.result))
    assert.equal(ran.result.reason, 'rule')
    assert.equal(ran.result.rule, 'gate-5')
    assert.equal(ran.result.step, 'video')
    assert.match(String(ran.result.detail), /show-meadow/, 'the stop does not name the criterion')
    assert.deepEqual(
      ran.takes.map((t) => t.outcome),
      ['accept', 'accept', 'accept', 'accept', 'accept', 'accept'],
      'every take was not accepted',
    )
    const events = described(ran.events)
    const stage = events.slice(events.indexOf('stage.started video') + 1)
    assert.deepEqual(stage.slice(-2), ['verdict 5 fail', 'run.finished stopped'])
    assert.equal(stage.length, 24 + 2, 'the takes did not all reach Gate 5 before the stop')
    const reelVerdict = ran.events.filter(
      (e) => e.type === 'verdict' && e.shotId === undefined && e.gate === '5',
    )
    assert.equal(reelVerdict.length, 1)
    assert.equal(reelVerdict[0]?.outcome, 'fail')
    assert.ok(!events.includes('stage.finished video'))
    assert.ok(!ran.jobs.some((j) => j.kind === 'reel.assemble'), 'a reel.assemble row was created')
  } finally {
    await engine.stop()
  }
})

// ---------------------------------------------------------------- 26

test("26. a take failing Gate 2, 3 or 5 stops the run for rule gate-2, gate-3 or gate-5 at step video, the detail naming the take and each failed gate's reasons; no later shot's narration or clip is made; there is no stage.finished for video and no reel.assemble row; and every narration and take made is in the tables with the gates it reached", async () => {
  const both: TakeAnswer = turned(t2, 'never-person')
  const cases = [
    {
      what: 'Gate 2',
      rule: 'gate-2',
      failed: ['2'],
      over: { video: { [t2.key]: { black: { atSeconds: 1, seconds: 1 } } } },
    },
    {
      what: 'Gate 3',
      rule: 'gate-3',
      failed: ['3'],
      over: { media: { [t2.key]: { music: true } } },
    },
    { what: 'Gate 5', rule: 'gate-5', failed: ['5'], over: { reconciler: { [t2.key]: both } } },
    {
      what: 'Gates 3 and 5 together',
      rule: 'gate-3',
      failed: ['3', '5'],
      over: { media: { [t2.key]: { speech: true } }, reconciler: { [t2.key]: both } },
    },
  ] as const
  for (const { what, rule, failed, over } of cases) {
    const { reconciler, ...options } = { reconciler: undefined, ...over } as {
      reconciler?: Record<string, unknown>
      video?: Record<string, object>
      media?: Record<string, object>
    }
    const engine = await startEngine({
      worker: true,
      ...options,
      script: videoScript(THREE_RANKS, THREE_RANKS_PICS, {
        takes: takes.slice(0, 3),
        ...(reconciler === undefined ? {} : { reconciler }),
      }),
    })
    try {
      const ran = await video(engine, videoRequest(`r26-${rule}`))
      assert.equal(ran.result.status, 'stopped', `${what}: ${JSON.stringify(ran.result)}`)
      assert.equal(ran.result.reason, 'rule', what)
      assert.equal(ran.result.rule, rule, what)
      assert.equal(ran.result.step, 'video', what)

      // The detail names the take and every reason of every gate it failed.
      const take = ran.takes[2]
      assert.ok(take !== undefined, `${what}: shot 2 has no take`)
      const detail = String(ran.result.detail)
      assert.ok(detail.includes(take.take_id), `${what}: the detail does not name ${take.take_id}`)
      const failing = take.verdicts.filter((v) => v.outcome === 'fail')
      assert.deepEqual(
        failing.map((v) => v.gate),
        [...failed],
        `${what}: the failed gates`,
      )
      for (const verdict of failing) {
        assert.ok(verdict.reasons.length > 0)
        for (const reason of verdict.reasons) {
          assert.ok(detail.includes(reason), `${what}: the detail leaves out "${reason}"`)
        }
      }
      assert.match(detail, /one take/i, `${what}: the detail does not say a shot gets one take`)

      // Nothing after the failing take was made.
      assert.deepEqual(
        engine.narration.calls.map((c) => c.narrationId),
        ['a1-shot-0-narration', 'a1-shot-1-narration', 'a1-shot-2-narration'],
        `${what}: a later shot's narration was made`,
      )
      assert.deepEqual(
        engine.video.calls.map((c) => c.takeId),
        ['a1-shot-0-take-1', 'a1-shot-1-take-1', 'a1-shot-2-take-1'],
        `${what}: a later shot's clip was made`,
      )
      const events = described(ran.events)
      assert.ok(!events.includes('stage.finished video'), `${what}: stage.finished for video`)
      assert.equal(events.at(-1), 'run.finished stopped')
      assert.ok(!ran.jobs.some((j) => j.kind === 'reel.assemble'), `${what}: a reel.assemble row`)

      // Every narration and take made is in the tables, with the gates it reached.
      assert.deepEqual(
        ran.narrations.map((n) => [n.narration_id, n.words !== null]),
        [0, 1, 2].map((u) => [`a1-shot-${u}-narration`, true]),
      )
      assert.deepEqual(
        ran.takes.map((t) => [t.take_id, t.outcome]),
        [
          ['a1-shot-0-take-1', 'accept'],
          ['a1-shot-1-take-1', 'accept'],
          ['a1-shot-2-take-1', 'fail'],
        ],
      )
      assert.deepEqual(
        take.verdicts.map((v) => v.gate),
        rule === 'gate-2' ? ['2'] : ['2', '3', '4', '5'],
        `${what}: the gates the failing take reached`,
      )
      assert.equal(ran.takeReconciliations.length, rule === 'gate-2' ? 2 : 3, what)
      if (rule === 'gate-3' && failed.length === 1) {
        assert.deepEqual(
          (ran.takeReconciliations.at(-1)?.answer as TakeAnswer).criteria,
          passesTake(t2).criteria,
        )
      }
    } finally {
      await engine.stop()
    }
  }
})
