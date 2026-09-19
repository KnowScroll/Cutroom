import assert from 'node:assert/strict'
import { test } from 'node:test'
import { startEngine } from './engine/harness.ts'
import { THREE_RANKS, THREE_RANKS_PICS } from './engine/stills.ts'
import {
  described,
  passesTake,
  retake,
  takesOf,
  turned,
  video,
  videoRequest,
  videoScript,
  type Take,
} from './engine/video.ts'

// reel-takes, Slice 3 — check 15 (docs/features/reel-takes.md): a held shot's failed takes show no
// unclaimed mustShow (S-090, S-072, S-069, D-025). The reel's mustShow that no sentence claims —
// `show-meadow` in the fixtures — is recorded on every take and fails none; it is checked ONCE EVERY
// SHOT IS DONE, accepted or held, OVER ACCEPTED TAKES ALONE. A held shot shows its picture, not its
// clips, so what its failed takes were reconciled as showing counts for nothing, and a reel whose only
// take showing the meadow was one of them stops for rule gate-5.
//
// Shot 1 of THREE_RANKS is held: each of its three takes speaks, so each fails Gate 3, and Gates 4 and
// 5 still run on it. Its SECOND take alone is reconciled as showing the meadow; every accepted take,
// shots 0 and 2 to 5, is reconciled as not showing it. Not green before this slice's code, whose Slice 2
// stand-in fails the run at shot 1.

const takes = takesOf(THREE_RANKS)
const [t0, t1, t2, t3, t4, t5] = takes as [Take, Take, Take, Take, Take, Take]

const T = (unit: number, n = 1) => `a1-shot-${unit}-take-${n}`
const N = (unit: number) => `a1-shot-${unit}-narration`

const CHECK_15 =
  "15. a held shot's failed takes show no unclaimed mustShow: when only a held shot's take was reconciled as showing it, the run stops for rule gate-5 once every shot is done"

// ---------------------------------------------------------------- 15

test(CHECK_15, async () => {
  const unseen = (take: Take) => turned(take, 'show-meadow')
  const engine = await startEngine({
    worker: true,
    media: {
      'shot-1-take-1': { speech: true },
      'shot-1-take-2': { speech: true },
      'shot-1-take-3': { speech: true },
    },
    script: videoScript(THREE_RANKS, THREE_RANKS_PICS, {
      takes: [t0, t1, retake(t1, 2), retake(t1, 3), t2, t3, t4, t5],
      reconciler: {
        'shot-0-take-1': unseen(t0),
        'shot-1-take-1': unseen(t1),
        // The one take reconciled as showing the meadow: shot 1's second, which fails Gate 3.
        'shot-1-take-2': passesTake(retake(t1, 2)),
        'shot-1-take-3': unseen(retake(t1, 3)),
        'shot-2-take-1': unseen(t2),
        'shot-3-take-1': unseen(t3),
        'shot-4-take-1': unseen(t4),
        'shot-5-take-1': unseen(t5),
      },
    }),
  })
  try {
    const ran = await video(engine, videoRequest('r15-unclaimed'))
    const { result } = ran

    // The premise: only shot 1's second take was reconciled as showing the meadow, and it failed.
    const showing = ran.takeReconciliations
      .filter((r) =>
        (r.answer as { criteria: Array<{ id: string; shown: boolean }> }).criteria.some(
          (c) => c.id === 'show-meadow' && c.shown,
        ),
      )
      .map((r) => r.take_id)
    assert.deepEqual(showing, [T(1, 2)], 'the takes reconciled as showing the meadow')
    assert.equal(ran.takes.find((t) => t.take_id === T(1, 2))?.outcome, 'fail')
    assert.equal(ran.stillHolds.length, 1, 'shot 1 was not held')

    // Stopped for rule gate-5, at step video, naming what no accepted take showed.
    assert.equal(result.status, 'stopped', JSON.stringify(result))
    assert.equal(result.reason, 'rule', JSON.stringify(result))
    assert.equal(result.rule, 'gate-5', JSON.stringify(result))
    assert.equal(result.step, 'video', JSON.stringify(result))
    assert.match(String(result.detail), /show-meadow/, String(result.detail))

    // Once every shot was done: each narrated, the held shot's three takes, every other shot's one.
    assert.deepEqual(
      engine.narration.calls.map((c) => c.narrationId),
      [0, 1, 2, 3, 4, 5].map(N),
    )
    assert.deepEqual(
      engine.video.calls.map((c) => c.takeId),
      [T(0), T(1, 1), T(1, 2), T(1, 3), T(2), T(3), T(4), T(5)],
    )
    assert.deepEqual(described(ran.events).slice(-6), [
      'verdict 2 shot-5 accept',
      'verdict 3 shot-5 accept',
      'verdict 4 shot-5 accept',
      'verdict 5 shot-5 accept',
      'verdict 5 fail',
      'run.finished stopped',
    ])
    assert.ok(!ran.jobs.some((j) => j.kind === 'reel.assemble'), 'a reel.assemble row')
  } finally {
    await engine.stop()
  }
})
