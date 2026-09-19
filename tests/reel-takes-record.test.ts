import assert from 'node:assert/strict'
import { test } from 'node:test'
import { finished, startEngine, type Engine, type EngineOptions } from './engine/harness.ts'
import { planRequest, twoSurvivors } from './engine/plans.ts'
import { renderOf } from './engine/render.ts'
import { killedMidVideo, takenUpVideo } from './engine/restart.ts'
import {
  THREE_RANKS,
  THREE_RANKS_PICS,
  inTurn,
  stills,
  stillsRequest,
  stillsScript,
} from './engine/stills.ts'
import {
  clipsScript,
  cutAnswer,
  takesOf,
  video,
  videoRequest,
  videoScript,
  type Videoed,
} from './engine/video.ts'

// reel-takes, Slice 1 — check 4 (docs/features/reel-takes.md): the takes in a run's record, as a
// caller reads them from the record route (D-015, I-4, S-055, S-093).
//
// Every take made is listed — every attempt's, in the order made, a cut-off take too — with its shot,
// its number, each check it reached with its outcome, and its observation's and reconciliation's ids
// where it reached them. `used` is true EXACTLY for the takes a completed video run's video shows —
// the takes its latest render manifest names — as `chosen` is for a picture (S-055): a run that
// stopped, in its clips stage or at Gate 7, used none, though the Gate 7 stop has a render naming six.
// A plan run's record and a stills run's list no take.
//
// Built on the rows reel-render already writes: one take a shot, and its restart's two attempts. Every
// `number` is 1 in this slice; Slice 2's check 5 reads the others. Each run but one is chosen so that
// the ladders later slices build leave its record as it is here (S-100):
//
// - the clips stage stops on shot 3's first take, which fails Gate 2 at a cost of 230 under a ceiling
//   of 240 — so a retry, which would cost at least 20 more, could not be made either (S-095);
// - the restart kills its first worker at shot 0's reconcile call, so its first attempt decided no
//   take, and the second attempt makes all six whether it starts over (S-076) or picks up where the
//   first stopped (S-092);
// - the plan and stills runs share an engine with a video run.
//
// The one that is not — a restart whose first attempt decided takes, added after the break campaign —
// is typed for S-076's start-over, and Slice 5 moves it onto its checkpoints.
//
// Every expectation is typed by hand.

const takes = takesOf(THREE_RANKS)
const UNITS = [0, 1, 2, 3, 4, 5]

const T = (attempt: number, unit: number) => `a${attempt}-shot-${unit}-take-1`
const N = (attempt: number, unit: number) => `a${attempt}-shot-${unit}-narration`

type Check = { gate: string; outcome: string }
const accepted = (...gates: string[]): Check[] => gates.map((gate) => ({ gate, outcome: 'accept' }))
const ALL = accepted('2', '3', '4', '5')

/** A take's entry that reached every gate: both its ids, and its checks. */
const decided = (takeId: string, unit: number, used: boolean, checks: Check[] = ALL) => ({
  takeId,
  shotId: `shot-${unit}`,
  number: 1,
  used,
  observationId: `obs-${takeId}`,
  reconciliationId: `rec-${takeId}`,
  checks,
})

/** The record a caller reads for a run, through the contract's route. */
async function recordOf(engine: Engine, runId: string) {
  const reply = await engine.http.record(runId)
  assert.equal(reply.status, 200, JSON.stringify(reply.json))
  return reply.json as { pictures: unknown[]; takes: unknown[]; degradations: unknown[] }
}

/** One video run on an engine of its own, to its end, and the record a caller reads for it. */
async function recorded(
  requestId: string,
  options: Omit<EngineOptions, 'worker'>,
  budgetCents = 300,
): Promise<{ ran: Videoed; record: Awaited<ReturnType<typeof recordOf>>; renders: string[][] }> {
  const engine = await startEngine({ worker: true, ...options })
  try {
    const ran = await video(engine, videoRequest(requestId, budgetCents))
    const renders = engine
      .query<{ render_manifest: string }>(
        'SELECT render_manifest FROM render WHERE run_id = ? ORDER BY attempt',
        ran.runId,
      )
      .map((r) =>
        (JSON.parse(r.render_manifest) as { shots: Array<{ takeId: string }> }).shots.map(
          (s) => s.takeId,
        ),
      )
    return { ran, record: await recordOf(engine, ran.runId), renders }
  } finally {
    await engine.stop()
  }
}

const CHECK_4 =
  "4. the record of a completed video run lists one take entry per take made, in the order made, each with its shot, number, the checks it reached and its observation and reconciliation ids, and used true for every take its video shows; a run stopped in its clips stage or at Gate 7 has none used; a restarted run's record lists every attempt's takes, the cut-off one with the checks it reached and no reconciliation id; and a plan run's and a stills run's record has no take"

// ---------------------------------------------------------------- 4

test(`${CHECK_4} — a completed video run`, async () => {
  const { ran, record, renders } = await recorded('r4-completed', {
    script: videoScript(THREE_RANKS, THREE_RANKS_PICS),
  })
  assert.equal(ran.result.status, 'completed', JSON.stringify(ran.result))
  // Its video shows the six takes, one a shot: each is used.
  assert.deepEqual(renders, [UNITS.map((u) => T(1, u))])
  assert.deepEqual(
    record.takes,
    UNITS.map((u) => decided(T(1, u), u, true)),
  )
})

test(`${CHECK_4} — a run stopped in its clips stage`, async () => {
  // Shot 3's clip is black from its first frame to its last: it fails Gate 2 and goes no further, so
  // it reached one check and has neither id. It costs 230, under a ceiling of 240.
  const { ran, record, renders } = await recorded(
    'r4-clips-stop',
    {
      video: { 'shot-3-take-1': { black: 'whole', costCents: 230 } },
      script: videoScript(THREE_RANKS, THREE_RANKS_PICS, { takes: takes.slice(0, 3) }),
    },
    240,
  )
  assert.equal(ran.result.status, 'stopped', JSON.stringify(ran.result))
  assert.deepEqual(renders, [], 'a run stopped in its clips stage has a render')
  assert.deepEqual(
    ran.narrations.map((n) => n.narration_id),
    [0, 1, 2, 3].map((u) => N(1, u)),
  )
  assert.deepEqual(record.takes, [
    decided(T(1, 0), 0, false),
    decided(T(1, 1), 1, false),
    decided(T(1, 2), 2, false),
    {
      takeId: T(1, 3),
      shotId: 'shot-3',
      number: 1,
      used: false,
      checks: [{ gate: '2', outcome: 'fail' }],
    },
  ])
})

test(`${CHECK_4} — a run stopped at Gate 7`, async () => {
  // The judge answers no to one question: the reel stops at its last check, with a render whose
  // manifest names all six takes — none of which a caller is shown.
  const { ran, record, renders } = await recorded('r4-gate7', {
    script: videoScript(THREE_RANKS, THREE_RANKS_PICS, { cut: cutAnswer([1]) }),
  })
  assert.equal(ran.result.status, 'stopped', JSON.stringify(ran.result))
  assert.equal(ran.result.rule, 'gate-7', JSON.stringify(ran.result))
  assert.deepEqual(renders, [UNITS.map((u) => T(1, u))], 'the stopped run has no render of six')
  assert.deepEqual(
    record.takes,
    UNITS.map((u) => decided(T(1, u), u, false)),
  )
})

test(`${CHECK_4} — a restarted run`, async () => {
  const engine = await startEngine({ worker: false })
  try {
    // Held at call 12: shot 0's reconcile call. Its take has been made, measured, heard and seen —
    // Gates 2, 3 and 4 — and never reconciled: cut off inside its gates, with an observation and no
    // reconciliation.
    const killed = await killedMidVideo(engine, videoRequest('r4-restart'), {
      script: videoScript(THREE_RANKS, THREE_RANKS_PICS),
      holdAtCall: 12,
      running: 'reel.clips',
      made: { narrations: [N(1, 0)], takes: [T(1, 0)] },
    })
    const ran = await takenUpVideo(engine, killed, clipsScript(takes))
    assert.equal(ran.result.status, 'completed', JSON.stringify(ran.result))
    // The video shows the second attempt's six takes.
    assert.deepEqual(
      renderOf(engine, ran.runId).renderManifest.shots.map((s) => s.takeId),
      UNITS.map((u) => T(2, u)),
    )
    assert.deepEqual((await recordOf(engine, ran.runId)).takes, [
      {
        takeId: T(1, 0),
        shotId: 'shot-0',
        number: 1,
        used: false,
        observationId: `obs-${T(1, 0)}`,
        checks: accepted('2', '3', '4'),
      },
      ...UNITS.map((u) => decided(T(2, u), u, true)),
    ])
  } finally {
    await engine.stop()
  }
})

test(`${CHECK_4} — a restarted run whose first attempt decided takes`, async () => {
  // Added after this slice's break campaign (S-100): two wrong records passed every run above — the
  // takes listed in shot order rather than the order made, and every accepted take of a completed run
  // marked used — since neither differs from the right record while a restart's first attempt decided
  // no take. Held at call 16, shot 2's reconcile call: shots 0 and 1 were decided, both accepted, and
  // shot 2's take was cut off with Gates 2, 3 and 4 and an observation. The second attempt starts over
  // and makes all six again (S-076), so the first attempt's two accepted takes are shown by nothing.
  //
  // Typed for S-076's start-over: reel-takes' Slice 5 keeps decided takes (S-092), and moves this
  // case onto its checkpoints, every clause kept (S-100).
  const engine = await startEngine({ worker: false })
  try {
    const killed = await killedMidVideo(engine, videoRequest('r4-restart-decided'), {
      script: videoScript(THREE_RANKS, THREE_RANKS_PICS),
      holdAtCall: 16,
      running: 'reel.clips',
      made: {
        narrations: [N(1, 0), N(1, 1), N(1, 2)],
        takes: [T(1, 0), T(1, 1), T(1, 2)],
      },
    })
    const ran = await takenUpVideo(engine, killed, clipsScript(takes))
    assert.equal(ran.result.status, 'completed', JSON.stringify(ran.result))
    assert.deepEqual(
      renderOf(engine, ran.runId).renderManifest.shots.map((s) => s.takeId),
      UNITS.map((u) => T(2, u)),
    )
    // In the order made — the first attempt's three, then the second's six — which is not shot order.
    assert.deepEqual((await recordOf(engine, ran.runId)).takes, [
      decided(T(1, 0), 0, false),
      decided(T(1, 1), 1, false),
      {
        takeId: T(1, 2),
        shotId: 'shot-2',
        number: 1,
        used: false,
        observationId: `obs-${T(1, 2)}`,
        checks: accepted('2', '3', '4'),
      },
      ...UNITS.map((u) => decided(T(2, u), u, true)),
    ])
  } finally {
    await engine.stop()
  }
})

test(`${CHECK_4} — a plan run and a stills run`, async () => {
  // One engine, three runs one after another: a plan run, a stills run, then a video run — so when
  // the first two records are read the database holds another run's six takes, and a record that
  // listed takes not its own would show them.
  const engine = await startEngine({
    worker: true,
    script: inTurn(
      twoSurvivors(),
      stillsScript(THREE_RANKS, THREE_RANKS_PICS),
      videoScript(THREE_RANKS, THREE_RANKS_PICS),
    ),
  })
  try {
    const submitted = await engine.http.submit(planRequest('r4-plan'))
    const planRun = String(submitted.json.runId)
    await finished(engine, planRun)
    assert.equal((await engine.http.result(planRun)).json.status, 'completed')

    const pictured = await stills(engine, stillsRequest('r4-stills'))
    assert.equal(pictured.result.status, 'completed', JSON.stringify(pictured.result))

    const ran = await video(engine, videoRequest('r4-beside'))
    assert.equal(ran.result.status, 'completed', JSON.stringify(ran.result))
    assert.equal(ran.takes.length, 6)

    assert.deepEqual(
      (await recordOf(engine, planRun)).takes,
      [],
      "a plan run's record lists a take",
    )
    const stillsRecord = await recordOf(engine, pictured.runId)
    assert.equal(stillsRecord.pictures.length, 4, "the stills run's record lists its pictures")
    assert.deepEqual(stillsRecord.takes, [], "a stills run's record lists a take")
    // And the video run's record lists its own six, used.
    assert.deepEqual(
      (await recordOf(engine, ran.runId)).takes,
      UNITS.map((u) => decided(T(1, u), u, true)),
    )
  } finally {
    await engine.stop()
  }
})
