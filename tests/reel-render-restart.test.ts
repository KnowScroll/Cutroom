import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { test } from 'node:test'
import { closeDatabase, openDatabase, readRenderInputs } from '../packages/domain/src/index.ts'
import { TEST_RENDER_SETTINGS, startEngine, type Engine } from './engine/harness.ts'
import { bandColours, bandOf, renderOf, type Rgb } from './engine/render.ts'
import { PLANNED, killedMidVideo, takenUpVideo } from './engine/restart.ts'
import { THREE_RANKS, THREE_RANKS_PICS } from './engine/stills.ts'
import {
  clipsScript,
  described,
  takesOf,
  videoRequest,
  videoScript,
  type Take,
  type Videoed,
} from './engine/video.ts'

// reel-render, Slice 6 — check 48 (docs/features/reel-render.md): a restart in the clips stage (S-027,
// S-092, D-081). A clips job whose worker was killed is claimed again when its lease runs out and run
// from the start, and ITS STAGE PICKS UP AT WHAT THE FIRST ATTEMPT FINISHED (reel-takes' S-092,
// superseding S-076's start-over and S-089's attempt filter; moved here as S-099 says, no assertion
// removed): every narration it finished and every take it decided is kept and not bought again, and
// the take it cut off is made again under the next attempt's id. The killed attempt's narrations and
// takes stay in the tables with the gates each reached — no outcome where one was cut off — and its
// receipts, files and cost stay, and the guard counts them. The keyframes job before it is not run
// again.
//
// THE FIRST WORKER IS HELD AT A TAKE'S WITNESS CALL (S-062's form): the planner's two calls, the stills
// stage's eight, then two a take, so take k's witness is call 11 + 2k. A take held there has been
// made, measured and heard — Gates 2 and 3 — and never seen: cut off inside its gates. What the first
// attempt made by then is asserted from the receipts before the kill, not from the count.

const takes = takesOf(THREE_RANKS)
const UNITS = [0, 1, 2, 3, 4, 5]

const N = (attempt: number, unit: number) => `a${attempt}-shot-${unit}-narration`
const T = (attempt: number, unit: number) => `a${attempt}-shot-${unit}-take-1`

/** THREE_RANKS' stills stage, completed: Gate 1 on each picture as made, then Gate 1S rank by rank. */
const STILLS = [
  'stage.started stills',
  'verdict 1 shot-0 accept',
  'verdict 1 shot-0 accept',
  'verdict 1 shot-1 accept',
  'verdict 1 shot-2 accept',
  'verdict 1S shot-1 accept',
  'verdict 1S shot-2 accept',
  'stage.finished stills',
]

/** Each shot's four gates, in plan order, all accepted. */
const TAKES = UNITS.flatMap((unit) =>
  ['2', '3', '4', '5'].map((gate) => `verdict ${gate} shot-${unit} accept`),
)

/**
 * Where each shot of the fixture begins in the output, by hand: narrations of 9, 7, 3, 3, 2 and 5
 * seconds at 24 frames a second (reel-render's check 31).
 */
const STARTS = [0, 216, 384, 456, 528, 576]

/** The chosen pictures, as the result lists them: the keyframes job's only attempt's. */
function chosenStills(engine: Engine, runId: string) {
  const chosen = engine.query<{ picture_id: string; shot_unit: number; path: string }>(
    'SELECT picture_id, shot_unit, path FROM picture WHERE run_id = ? AND chosen = 1 ORDER BY shot_unit',
    runId,
  )
  assert.deepEqual(
    chosen.map((p) => p.picture_id),
    ['a1-shot-0-a', 'a1-shot-1-single', 'a1-shot-2-single'],
  )
  return chosen.map((p) => ({
    pictureId: p.picture_id,
    shotId: `shot-${p.shot_unit}`,
    path: p.path,
  }))
}

const distance = (x: Rgb, y: Rgb) => Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2])

/**
 * WHICH OF THESE TAKES EACH FRAME OF THE OUTPUT CARRIES, measured: the index of the take whose band
 * colour the frame's band is nearest, within the tolerance reel-render's check 31 reads bands with.
 * A frame near none of them — a clip of another attempt — fails.
 */
function framesOf(path: string, takeIds: readonly string[]): number[] {
  const expected = takeIds.map(bandOf)
  return bandColours(path).map((colour, frame) => {
    const ranked = expected.map((e, i) => ({ i, d: distance(colour, e) })).sort((x, y) => x.d - y.d)
    const nearest = ranked[0]
    assert.ok(
      nearest !== undefined && nearest.d < 40,
      `frame ${frame}'s band [${colour.join(', ')}] is none of ${takeIds.join(', ')} (nearest ${nearest?.d})`,
    )
    return nearest.i
  })
}

/** Each take's receipts of a model call, as `call role takeIds`, in the order written. */
const takeReceipts = (receipts: ReadonlyArray<{ call: string; role: string; take_ids: unknown }>) =>
  receipts
    .map((r) => ({
      ...r,
      ids: (typeof r.take_ids === 'string' ? JSON.parse(r.take_ids) : r.take_ids) as string[],
    }))
    .filter((r) => r.ids.length > 0)
    .map((r) => `${r.call} ${r.role} ${r.ids.join()}`)

// ---------------------------------------------------------------- 48

test("48. after a worker is killed mid-clips and a new one started, the run completes; stage.started for video appears once; the first attempt's narrations and takes are in the tables under attempt-1 ids with the gates they reached and no outcome where one was cut off; their receipts and cost are kept; no picture is made again — the job before is not run again", async () => {
  // The FIRST attempt's shot-0 clip costs 7 and its shot-1 narration 3 — each keyed by its whole id,
  // so the second attempt's cost nothing, and 10 is what the first attempt spent (S-062's form).
  const engine = await startEngine({
    worker: false,
    video: { [T(1, 0)]: { costCents: 7 } },
    narration: { [N(1, 1)]: { costCents: 3 } },
  })
  try {
    // Held at call 15: take 2's witness. Shots 0 and 1 have been through every gate; shot 2's
    // narration and clip are made, and its clip measured and heard.
    const killed = await killedMidVideo(engine, videoRequest('r48'), {
      script: videoScript(THREE_RANKS, THREE_RANKS_PICS),
      holdAtCall: 15,
      running: 'reel.clips',
      made: { narrations: [N(1, 0), N(1, 1), N(1, 2)], takes: [T(1, 0), T(1, 1), T(1, 2)] },
    })
    assert.deepEqual(killed.before.events, [...PLANNED, ...STILLS, 'stage.started video'])
    assert.deepEqual(takeReceipts(killed.before.receipts), [
      `observe witness ${T(1, 0)}`,
      `structured reconciler ${T(1, 0)}`,
      `observe witness ${T(1, 1)}`,
      `structured reconciler ${T(1, 1)}`,
    ])
    assert.deepEqual(
      killed.before.speech.map((s) => s.cost_cents),
      [0, 3, 0],
    )
    assert.deepEqual(
      killed.before.clips.map((c) => c.cost_cents),
      [7, 0, 0],
    )
    assert.equal(killed.before.job.cost_cents, 10)

    // The new worker's script answers FROM SHOT 2'S TAKE ON: shots 0 and 1 are kept, so the second
    // attempt's first model call is the cut-off take's witness (S-092, S-099).
    const ran = await takenUpVideo(engine, killed, clipsScript(takes.slice(2)))
    const row = renderOf(engine, ran.runId)

    // The run completes, with the second attempt's clips and the first attempt's cost.
    assert.deepEqual(ran.result, {
      contractVersion: 1,
      runId: ran.runId,
      requestId: 'r48',
      costCents: 10,
      status: 'completed',
      until: 'video',
      estimateCents: 220,
      stills: chosenStills(engine, ran.runId),
      video: { path: row.path },
      degradations: [],
    })

    // What the first attempt finished is KEPT and not made again (S-092): the new worker's stand-ins
    // are asked for the narrations of the shots it never reached, and for the take it cut off — made
    // again under the next attempt's id — and the takes of those shots.
    assert.deepEqual(
      engine.narration.calls.map((c) => c.narrationId),
      [3, 4, 5].map((u) => N(2, u)),
    )
    assert.deepEqual(
      engine.video.calls.map((c) => c.takeId),
      [2, 3, 4, 5].map((u) => T(2, u)),
    )

    // No picture is made again: the keyframes job ran once, its receipts are the ones it wrote, and
    // the new worker's image stand-in was asked for nothing (D-081).
    assert.deepEqual(engine.image.calls, [], 'a picture was made again')
    assert.deepEqual(
      engine
        .query<{ id: number; picture_id: string; cost_cents: number }>(
          'SELECT id, picture_id, cost_cents FROM generation_receipt WHERE run_id = ? ORDER BY id',
          ran.runId,
        )
        .map((r) => ({ ...r })),
      killed.before.generations,
    )
    assert.deepEqual(
      ran.jobs.map((j) => [j.kind, j.state, j.attempts, j.cost_cents]),
      [
        ['reel.plan', 'done', 1, 0],
        ['reel.keyframes', 'done', 1, 0],
        ['reel.clips', 'done', 2, 10],
        ['reel.assemble', 'done', 1, 0],
      ],
    )

    // stage.started for video once; only the finishing attempt's verdicts are events (S-069).
    assert.deepEqual(described(ran.events), [
      ...PLANNED,
      ...STILLS,
      'stage.started video',
      ...TAKES,
      'verdict 7 accept',
      'stage.finished video',
      'run.finished completed',
    ])
    assert.equal(
      ran.events.filter((e) => e.type === 'stage.started' && e.stage === 'video').length,
      1,
      'stage.started for video was written twice',
    )

    // The first attempt's narrations, under attempt-1 ids, measured and timed, beside the second's —
    // the three shots the first attempt never reached.
    assert.deepEqual(
      ran.narrations.map((n) => [
        n.narration_id,
        n.attempt,
        n.words?.length,
        n.probe?.durationSeconds,
      ]),
      [
        [N(1, 0), 1, 18, 9],
        [N(1, 1), 1, 14, 7],
        [N(1, 2), 1, 6, 3],
        [N(2, 3), 2, 6, 3],
        [N(2, 4), 2, 4, 2],
        [N(2, 5), 2, 10, 5],
      ],
    )

    // Its takes, with the gates each reached: shots 0 and 1 decided; shot 2 cut off after Gates 2 and
    // 3, with no outcome, no observation and no reconciliation.
    const all = ['2', '3', '4', '5']
    assert.deepEqual(
      ran.takes.map((t) => [
        t.take_id,
        t.attempt,
        t.verdicts.map((v) => `${v.gate} ${v.outcome}`),
        t.outcome,
      ]),
      [
        [T(1, 0), 1, all.map((g) => `${g} accept`), 'accept'],
        [T(1, 1), 1, all.map((g) => `${g} accept`), 'accept'],
        [T(1, 2), 1, ['2 accept', '3 accept'], null],
        ...[2, 3, 4, 5].map((u) => [T(2, u), 2, all.map((g) => `${g} accept`), 'accept']),
      ],
    )
    const cutOff = ran.takes.find((t) => t.take_id === T(1, 2))
    assert.ok(cutOff !== undefined && cutOff.probe !== null && cutOff.scan !== null)
    assert.deepEqual(
      ran.takeObservations.map((o) => o.take_id).sort(),
      [T(1, 0), T(1, 1), ...[2, 3, 4, 5].map((u) => T(2, u))].sort(),
    )
    assert.deepEqual(
      ran.takeReconciliations.map((r) => r.take_id).sort(),
      [T(1, 0), T(1, 1), ...[2, 3, 4, 5].map((u) => T(2, u))].sort(),
    )

    // Their receipts are kept, under the same row ids and costs, before the second attempt's.
    const speech = (r: Videoed['speechReceipts'][number]) => ({
      id: r.id,
      narration_id: r.narration_id,
      cost_cents: r.cost_cents,
    })
    const clip = (r: Videoed['videoReceipts'][number]) => ({
      id: r.id,
      take_id: r.take_id,
      cost_cents: r.cost_cents,
    })
    assert.deepEqual(ran.speechReceipts.slice(0, 3).map(speech), killed.before.speech)
    assert.deepEqual(ran.videoReceipts.slice(0, 3).map(clip), killed.before.clips)
    assert.deepEqual(
      ran.speechReceipts.slice(3).map((r) => [r.narration_id, r.cost_cents]),
      [3, 4, 5].map((u) => [N(2, u), 0]),
    )
    assert.deepEqual(
      ran.videoReceipts.slice(3).map((r) => [r.take_id, r.cost_cents]),
      [2, 3, 4, 5].map((u) => [T(2, u), 0]),
    )
    const firstTakeReceipts = killed.before.receipts.filter((r) => r.take_ids !== '[]')
    assert.deepEqual(
      ran.receipts.filter((r) => firstTakeReceipts.some((f) => f.id === r.id)).map((r) => r.id),
      firstTakeReceipts.map((r) => r.id),
    )

    // Their files stay where they were written, beside the second attempt's.
    for (const made of [...ran.narrations, ...ran.takes]) {
      assert.ok(existsSync(made.path), `${made.path} is gone`)
    }
    const firstPaths = new Set(
      [...ran.narrations, ...ran.takes].filter((m) => m.attempt === 1).map((m) => m.path),
    )
    for (const made of [...ran.narrations, ...ran.takes].filter((m) => m.attempt === 2)) {
      assert.ok(!firstPaths.has(made.path), `the second attempt wrote over ${made.path}`)
    }

    // The video is made of ROWS FROM BOTH ATTEMPTS, by design (S-092): the first attempt's narration
    // and take for shots 0 and 1, its narration and the second's take for shot 2, the second's for
    // shots 3 to 5 — and every frame of the output, measured, carries that shot's clip.
    const shown = [T(1, 0), T(1, 1), ...[2, 3, 4, 5].map((u) => T(2, u))]
    assert.deepEqual(
      row.renderManifest.shots.map((s) => [s.takeId, s.narrationId]),
      [
        [T(1, 0), N(1, 0)],
        [T(1, 1), N(1, 1)],
        [T(2, 2), N(1, 2)],
        ...[3, 4, 5].map((u) => [T(2, u), N(2, u)]),
      ],
    )
    const frames = framesOf(String(row.path), shown)
    assert.equal(frames.length, 696)
    assert.deepEqual(
      STARTS.map((start) => frames[start]),
      UNITS,
    )
    frames.forEach((shot, frame) => {
      const expected = STARTS.findLastIndex((start) => start <= frame)
      assert.equal(shot, expected, `frame ${frame} carries shot ${shot}'s clip, not ${expected}'s`)
    })

    // What a render is built from is EACH SHOT'S FINISHED NARRATION AND ACCEPTED TAKE, whichever
    // attempt made them, and never the take a crash cut off (S-092, superseding S-089's filter). The
    // run's own output cannot tell that from a filter on the finishing attempt alone, so the rows the
    // render is read from are asked for directly (S-089's form).
    const db = openDatabase(engine.dbPath)
    try {
      const inputs = readRenderInputs(db, ran.runId)
      assert.deepEqual(
        {
          takes: inputs.takes.map((t) => t.takeId),
          narrations: inputs.narrations.map((n) => n.narrationId),
        },
        {
          takes: shown,
          narrations: [N(1, 0), N(1, 1), N(1, 2), ...[3, 4, 5].map((u) => N(2, u))],
        },
        "the render is read from rows beside each shot's finished narration and accepted take",
      )
      assert.ok(
        !inputs.takes.some((t) => t.takeId === T(1, 2)),
        'the render is read from the take the crash cut off',
      )
      // Every attempt's spend is in its ledger (D-081).
      assert.deepEqual(inputs.ledger, { imageCents: 0, narrationCents: 3, videoCents: 7 })
    } finally {
      closeDatabase(db)
    }
  } finally {
    await engine.stop()
  }
})

/**
 * One run whose first attempt's shot-0 clip costs 210 — made at 0 + 36, since its 9 seconds are 36 at
 * 4 cents a second — killed at that take's witness, call 11, before any next call; then taken up by a
 * new worker, whose attempt stops for budget under `ceiling` (the plan's estimate is 220). The guard
 * counts what the first attempt spent (S-036, S-092). Shot 0's narration is KEPT, so the second
 * attempt's first call is that take, made again. `made` is what it makes before its refused call.
 */
async function budgetStop(
  requestId: string,
  ceiling: number,
  narrationRateCentsPerCharacter: number,
  expected: {
    estimate: number
    made: { narrations: string[]; clips: string[] }
    script: readonly Take[]
    takes: Array<[string, string[], string | null]>
    verdicts: string[]
  },
) {
  const engine = await startEngine({
    worker: false,
    renderSettings: { ...TEST_RENDER_SETTINGS, narrationRateCentsPerCharacter },
    video: { [T(1, 0)]: { costCents: 210 } },
  })
  try {
    const killed = await killedMidVideo(engine, videoRequest(requestId, ceiling), {
      script: videoScript(THREE_RANKS, THREE_RANKS_PICS),
      holdAtCall: 11,
      running: 'reel.clips',
      made: { narrations: [N(1, 0)], takes: [T(1, 0)] },
    })
    assert.equal(killed.before.job.cost_cents, 210)

    const ran = await takenUpVideo(engine, killed, clipsScript([...expected.script]))
    const questioned = existsSync(engine.questionsPath)
    assert.deepEqual(ran.result, {
      contractVersion: 1,
      runId: ran.runId,
      requestId,
      costCents: 210,
      status: 'stopped',
      reason: 'budget',
      limit: 'ceiling',
      estimateCents: expected.estimate,
      ceilingCents: ceiling,
      capCents: 300,
    })
    assert.deepEqual(
      {
        narrations: engine.narration.calls.map((c) => c.narrationId),
        clips: engine.video.calls.map((c) => c.takeId),
      },
      expected.made,
      'the second attempt made a call above the ceiling',
    )
    assert.deepEqual(
      ran.speechReceipts.map((r) => [r.narration_id, r.cost_cents]),
      [N(1, 0), ...expected.made.narrations].map((id) => [id, 0]),
    )
    assert.deepEqual(
      ran.videoReceipts.map((r) => [r.take_id, r.cost_cents]),
      [[T(1, 0), 210], ...expected.made.clips.map((id) => [id, 0])],
    )
    assert.deepEqual(
      ran.takes.map((t) => [t.take_id, t.verdicts.map((v) => v.gate), t.outcome]),
      expected.takes,
    )
    assert.deepEqual(described(ran.events), [
      ...PLANNED,
      ...STILLS,
      'stage.started video',
      ...expected.verdicts,
      'run.finished stopped',
    ])
    assert.deepEqual(
      ran.jobs.map((j) => [j.kind, j.state, j.attempts, j.cost_cents]),
      [
        ['reel.plan', 'done', 1, 0],
        ['reel.keyframes', 'done', 1, 0],
        ['reel.clips', 'done', 2, 210],
      ],
    )
    // The caller's ceiling fired, not the engine's cap: no question (D-100).
    assert.equal(questioned, false, 'a stop at the ceiling wrote a question')
  } finally {
    await engine.stop()
  }
}

test("48. when the first attempt's scripted cost leaves the second attempt's next call above the ceiling, the run stops for budget", async () => {
  // The clip guard, under a ceiling of 240: shot 0's narration is kept and not spoken again, so the
  // second attempt's first call is the take the kill cut off, made again — 210 + 36 = 246, and it is
  // not made. The attempt makes nothing at all.
  await budgetStop('r48-clip', 240, 0, {
    estimate: 246,
    made: { narrations: [], clips: [] },
    script: [],
    takes: [[T(1, 0), ['2', '3'], null]],
    verdicts: [],
  })
  // The narration guard, under a ceiling of 250 at 0.5 cents a character: that take is made, 246
  // being under it; the next narration the attempt needs is shot 1's — 83 characters, 41.5 — which
  // would be 252, and is not spoken.
  await budgetStop('r48-narration', 250, 0.5, {
    estimate: 252,
    made: { narrations: [], clips: [T(2, 0)] },
    script: [takes[0] as Take],
    takes: [
      [T(1, 0), ['2', '3'], null],
      [T(2, 0), ['2', '3', '4', '5'], 'accept'],
    ],
    verdicts: ['2', '3', '4', '5'].map((gate) => `verdict ${gate} shot-0 accept`),
  })
})
