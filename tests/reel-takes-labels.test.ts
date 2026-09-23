import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { FakeScript } from '@cutroom/providers'
import { startEngine, type Engine } from './engine/harness.ts'
import { THREE_RANKS, THREE_RANKS_PICS, observation, twice } from './engine/stills.ts'
import {
  described,
  retake,
  takesOf,
  turned,
  video,
  videoRequest,
  videoScript,
  type Take,
  type Videoed,
} from './engine/video.ts'

// reel-takes, Slice 3 — check 14 (docs/features/reel-takes.md): a held shot's labels (S-098, I-4,
// D-025, S-058's form). A shot held on its chosen picture at its take cap is labelled in FOUR places,
// written with WHATEVER ENDING the clips job reaches, in the transaction that ends its stage or its run:
//
// 1. a still_hold row — its shot, the attempt that decided it, its picture, that picture's probe, the
//    three takes it consumed and the reason — its own table, so "every run with a held shot" is a query;
// 2. its third take's row, whose degradation carries the reason;
// 3. the video receipt of each of its three takes, marked degraded;
// 4. a degraded event with the shot and the reason, after its third take's verdicts.
//
// Four runs on ONE engine, one after another, so one query can be asked of all of them: shot 1 of
// THREE_RANKS held — its three takes fail Gate 5, none showing show-crowd — and the clips stage
// completed; nothing held; shot 1 held and the run stopped for budget at shot 3; shot 1 held and the run
// failed at shot 3. Between two runs the worker and the API are started again on the same database,
// with a model stand-in answering from the next run's script alone.
//
// The spend, by hand: shot 2's first take costs 230, in every run of the engine. Shot 3's narration is
// six words, 2.8 seconds, so its clip asks for 5 seconds, 20 cents at the default rate: 230 + 20 = 250,
// under a ceiling of 300 and over one of 240. The plan's estimate is 220, so 240 admits the run.
//
// What the assemble job does with a held shot is Slice 4's, and no clause here reads it. Every
// expectation is typed by hand; the probe is ffprobe 8.1.1's account of the stand-in's 90 × 160 PNG,
// measured on this machine.

const takes = takesOf(THREE_RANKS)
const [t0, t1, t2, t3, t4, t5] = takes as [Take, Take, Take, Take, Take, Take]

const T = (unit: number, n = 1) => `a1-shot-${unit}-take-${n}`
const HELD = [T(1, 1), T(1, 2), T(1, 3)]

/** ffprobe of the stand-in's picture: a PNG of 90 × 160, one frame, at image2's rate of 25. */
const PICTURE_PROBE = {
  readable: true,
  durationSeconds: 0,
  video: { codec: 'png', width: 90, height: 160, fps: 25, frames: 1 },
  audio: null,
  moovFirst: null,
}

/** Shot 1's three takes, none showing show-crowd: each fails Gate 5. */
const crowd = turned(t1, 'show-crowd')
const HOLD_SHOT_1 = {
  'shot-1-take-1': crowd,
  'shot-1-take-2': crowd,
  'shot-1-take-3': crowd,
}
const SHOT_1 = [t1, retake(t1, 2), retake(t1, 3)]

interface Labelled {
  ran: Videoed
  degradations: unknown[]
}

interface Runs {
  completed: Labelled
  none: Labelled
  budget: Labelled
  failed: Labelled
  /** `SELECT DISTINCT run_id FROM still_hold`, asked once all four had finished. */
  holding: string[]
}

let memo: Promise<Runs> | undefined

/** The four runs, made once for every test below. */
function runs(): Promise<Runs> {
  memo ??= (async () => {
    const engine = await startEngine({
      worker: true,
      video: { 'shot-2-take-1': { costCents: 230 } },
      script: videoScript(THREE_RANKS, THREE_RANKS_PICS, {
        takes: [t0, ...SHOT_1, t2, t3, t4, t5],
        reconciler: HOLD_SHOT_1,
      }),
    })
    try {
      /**
       * One run to its end, and its record. Given a script, the worker and the API are started again
       * on the same database first, with a model stand-in answering from that script alone — so no
       * run's answers depend on how many an earlier run asked for.
       */
      const labelled = async (
        requestId: string,
        budgetCents: number,
        script?: FakeScript,
      ): Promise<Labelled> => {
        if (script !== undefined) {
          await engine.restart({ script })
          await engine.startWorker()
        }
        const ran = await video(engine, videoRequest(requestId, budgetCents))
        return { ran, degradations: await degradationsOf(engine, ran.runId) }
      }
      const completed = await labelled('r14-completed', 300)
      const none = await labelled('r14-none', 300, videoScript(THREE_RANKS, THREE_RANKS_PICS))
      const budget = await labelled(
        'r14-budget',
        240,
        videoScript(THREE_RANKS, THREE_RANKS_PICS, {
          takes: [t0, ...SHOT_1, t2],
          reconciler: HOLD_SHOT_1,
        }),
      )
      // A still's observation for shot 3's take — no actions and no event order, which a clip's
      // requires (D-041) — does not parse, TWICE, and fails the run (S-042 as S-147 amends it: a
      // refused answer is asked for once more, so a single one would run off the script's end).
      const failed = await labelled(
        'r14-failed',
        300,
        videoScript(THREE_RANKS, THREE_RANKS_PICS, {
          takes: [t0, ...SHOT_1, t2, t3],
          reconciler: HOLD_SHOT_1,
          witness: {
            'shot-3-take-1': twice({ value: observation([]) }, { value: observation([]) }),
          },
        }),
      )
      const holding = engine
        .query<{ run_id: string }>('SELECT DISTINCT run_id FROM still_hold ORDER BY run_id')
        .map((r) => r.run_id)
      return { completed, none, budget, failed, holding }
    } finally {
      await engine.stop()
    }
  })()
  return memo
}

/** The record's degradations, as a caller reads them from the record route. */
async function degradationsOf(engine: Engine, runId: string): Promise<unknown[]> {
  const reply = await engine.http.record(runId)
  assert.equal(reply.status, 200, JSON.stringify(reply.json))
  return reply.json.degradations as unknown[]
}

/**
 * Shot 1 held, labelled in its four places, and nothing else labelled: the still_hold row; its third
 * take's row carrying the reason, and no other take's; each of its three takes' video receipts marked,
 * and no other; one degraded event, right after its third take's verdicts. The record lists it.
 */
function labelledInFourPlaces({ ran, degradations }: Labelled, what: string): void {
  // 1. The still_hold row: its shot, attempt, picture, probe and three takes, and its reason — which
  //    says what a still-hold is, not what a hold is (S-073, S-098).
  assert.equal(ran.stillHolds.length, 1, `${what}: ${ran.stillHolds.length} still_hold rows`)
  const row = ran.stillHolds[0]
  assert.ok(row !== undefined)
  const { reason } = row
  assert.deepEqual(
    { ...row },
    {
      shot_id: 'shot-1',
      attempt: 1,
      picture_id: 'a1-shot-1-single',
      probe: PICTURE_PROBE,
      take_ids: HELD,
      reason,
    },
    `${what}: the still_hold row`,
  )
  assert.match(reason, /^shot-1 is held on its approved picture/, `${what}: ${reason}`)
  assert.match(reason, /D-025/, `${what}: the reason cites no D-025: ${reason}`)
  assert.doesNotMatch(reason, /last frame is held|S-073/, `${what}: a hold's words: ${reason}`)

  // 2. The third take's row carries the reason; no other take's row carries a label.
  assert.deepEqual(
    ran.takes.map((t) => [t.take_id, t.degradation]),
    ran.takes.map((t) => [t.take_id, t.take_id === T(1, 3) ? reason : null]),
    `${what}: the take rows' degradations`,
  )

  // 3. Each of its three takes' video receipts is marked; no other receipt is.
  assert.deepEqual(
    ran.videoReceipts.filter((r) => HELD.includes(r.take_id)).map((r) => r.take_id),
    HELD,
    `${what}: the held takes' receipts`,
  )
  assert.deepEqual(
    ran.videoReceipts.map((r) => [r.take_id, r.degraded]),
    ran.videoReceipts.map((r) => [r.take_id, HELD.includes(r.take_id)]),
    `${what}: the receipts marked`,
  )

  // 4. One degraded event, with the shot and the reason, after its third take's verdicts and before
  //    the next shot's.
  assert.deepEqual(
    ran.events.filter((e) => e.type === 'degraded').map((e) => [e.shotId, e.reason]),
    [['shot-1', reason]],
    `${what}: the degraded events`,
  )
  const lines = described(ran.events)
  const at = lines.indexOf('degraded shot-1')
  const take = ['verdict 2 shot-1 accept', 'verdict 3 shot-1 accept', 'verdict 4 shot-1 accept']
  assert.deepEqual(
    lines.slice(at - 13, at + 2),
    [
      'verdict 5 shot-0 accept',
      ...[1, 2, 3].flatMap(() => [...take, 'verdict 5 shot-1 fail']),
      'degraded shot-1',
      'verdict 2 shot-2 accept',
    ],
    `${what}: where the degraded event is`,
  )

  // Listed in the record, with its reason.
  assert.deepEqual(degradations, [{ shotId: 'shot-1', reason }], `${what}: the record`)
}

/** No label anywhere: no still_hold row, no take's degradation, no receipt marked, no degraded event. */
function labelledNowhere({ ran, degradations }: Labelled, what: string): void {
  assert.deepEqual(ran.stillHolds, [], `${what}: a still_hold row`)
  assert.ok(
    ran.takes.every((t) => t.degradation === null),
    `${what}: a take's degradation`,
  )
  assert.ok(
    ran.videoReceipts.every((r) => !r.degraded),
    `${what}: a receipt marked`,
  )
  assert.ok(!ran.events.some((e) => e.type === 'degraded'), `${what}: a degraded event`)
  assert.deepEqual(degradations, [], `${what}: the record's degradations`)
}

const CHECK_14 =
  "14. a held shot is labelled in four places — a still_hold row with its shot, attempt, picture, probe, three takes and reason; the third take's row carrying the reason; the video receipt of each of its three takes marked degraded; and a degraded event after its third take's verdicts — with the clips stage completed, with the run stopped for budget at a later shot, and with the run failed at a later shot; no other shot, take or receipt carries one; and a query for runs holding a shot returns exactly those that did"

// ---------------------------------------------------------------- 14

test(`${CHECK_14} — with the clips stage completed`, async () => {
  const { completed } = await runs()
  const { ran } = completed
  // The clips stage completed: its job done, the chain's reel.assemble row after it, and every shot
  // after the held one made and accepted.
  const clips = ran.jobs.find((j) => j.kind === 'reel.clips')
  assert.equal(clips?.state, 'done', JSON.stringify(ran.jobs))
  assert.ok(
    ran.jobs.some((j) => j.kind === 'reel.assemble' && j.parent_id === clips?.id),
    `no reel.assemble row: ${JSON.stringify(ran.result)}`,
  )
  assert.deepEqual(
    ran.takes.map((t) => [t.take_id, t.outcome]),
    [
      [T(0), 'accept'],
      [T(1, 1), 'fail'],
      [T(1, 2), 'fail'],
      [T(1, 3), 'fail'],
      [T(2), 'accept'],
      [T(3), 'accept'],
      [T(4), 'accept'],
      [T(5), 'accept'],
    ],
  )
  labelledInFourPlaces(completed, 'completed')
})

test(`${CHECK_14} — with the run stopped for budget at a later shot`, async () => {
  const { budget } = await runs()
  const { ran } = budget
  assert.equal(ran.result.status, 'stopped', JSON.stringify(ran.result))
  assert.equal(ran.result.reason, 'budget', JSON.stringify(ran.result))
  assert.equal(ran.result.estimateCents, 250, JSON.stringify(ran.result))
  // Shot 3's narration was made, and its clip was not.
  assert.deepEqual(
    ran.takes.map((t) => t.take_id),
    [T(0), ...HELD, T(2)],
  )
  assert.deepEqual(
    ran.narrations.map((n) => n.shot_unit),
    [0, 1, 2, 3],
  )
  assert.ok(!ran.jobs.some((j) => j.kind === 'reel.assemble'), 'a reel.assemble row')
  assert.equal(described(ran.events).at(-1), 'run.finished stopped')
  labelledInFourPlaces(budget, 'stopped for budget')
})

test(`${CHECK_14} — with the run failed at a later shot`, async () => {
  const { failed } = await runs()
  const { ran } = failed
  assert.equal(ran.result.status, 'failed', JSON.stringify(ran.result))
  // Shot 3's take was made, and cut off at Gate 4: its witness answer did not parse.
  assert.deepEqual(
    ran.takes.map((t) => [t.take_id, t.outcome]),
    [
      [T(0), 'accept'],
      [T(1, 1), 'fail'],
      [T(1, 2), 'fail'],
      [T(1, 3), 'fail'],
      [T(2), 'accept'],
      [T(3), null],
    ],
  )
  // It failed on the REFUSAL, asked twice — not on the stand-in running out of answers (S-147).
  assert.match(
    String(ran.result.detail),
    new RegExp(`the witness's answer for ${T(3)} is not a clip observation: `),
  )
  assert.equal(
    ran.receipts.filter((r) => r.call === 'observe' && r.take_ids.includes(T(3))).length,
    2,
    'the refused take has two observe receipts',
  )
  assert.ok(!ran.jobs.some((j) => j.kind === 'reel.assemble'), 'a reel.assemble row')
  assert.equal(described(ran.events).at(-1), 'run.finished failed')
  labelledInFourPlaces(failed, 'failed')
})

test(`${CHECK_14} — no other shot, take or receipt carries one, and the query`, async () => {
  const { completed, none, budget, failed, holding } = await runs()
  // The run that held nothing, on the same engine: it completed, and nothing in it is labelled.
  assert.equal(none.ran.result.status, 'completed', JSON.stringify(none.ran.result))
  labelledNowhere(none, 'nothing held')

  // The query for runs holding a shot returns exactly the three that held one.
  assert.deepEqual(
    holding,
    [completed.ran.runId, budget.ran.runId, failed.ran.runId].sort(),
    'the runs holding a shot',
  )
  assert.ok(!holding.includes(none.ran.runId), 'the run that held nothing is returned')
})
