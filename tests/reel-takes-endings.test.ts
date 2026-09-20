import assert from 'node:assert/strict'
import { test } from 'node:test'
import { startEngine, type EngineOptions } from './engine/harness.ts'
import { PLANNED, killedMidVideo, takenUpVideo } from './engine/restart.ts'
import { THREE_RANKS, THREE_RANKS_PICS } from './engine/stills.ts'
import {
  clipsScript,
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

// reel-takes, Slice 6 — check 25 (docs/features/reel-takes.md): every ending this feature adds, and
// its events EXACTLY as S-069 lists them with S-094's and S-098's changes, in the order the gates ran.
// Each list below is typed by hand; each ending is one run of THREE_RANKS, whose plan stage and stills
// stage are the same in every run that gets past them. Pieces of each are asserted by Slices 2 to 5 —
// checks 8, 12, 13, 14, 9, 11 and 21 — and none of those is changed: this check holds each whole, in
// one place, as reel-render's check 47 does for reel-render's endings.
//
// Gate 4 says this check is GREEN BEFORE THIS SLICE'S CODE, since Slices 2 to 5 write every one of
// these endings' events. The breaks recorded with the slice are what show each can fail.
//
// What each ending changes, against S-069's list of an admitted video run's events:
//
//   a shot accepted on a retry     each take's verdicts, take after take (S-094)
//   a shot held                    a degraded event after the third take's verdicts (S-098)
//   a shot failing at its cap      the stage ends as a failing take did, stopped for its rule (S-094)
//   a retry stopped for budget     the refused retry makes nothing, and its shot is not held (S-095)
//   a call unavailable             the port throws at its last send; nothing of that call is written (S-096)
//   picked up from its checkpoints every kept and made take's verdicts once, in shot and take order (S-092)

const takes = takesOf(THREE_RANKS)
const [t0, t1, t2, t3, t4, t5] = takes as [Take, Take, Take, Take, Take, Take]

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

/** A take's four verdict events, in gate order, each accepted unless `outcomes` says otherwise. */
const verdicts = (unit: number, ...outcomes: string[]) =>
  ['2', '3', '4', '5'].map((gate, i) => `verdict ${gate} shot-${unit} ${outcomes[i] ?? 'accept'}`)

/** The first take of each shot in `units`, accepted at Gates 2, 3, 4 and 5, in plan order. */
const accepted = (units: readonly number[]) => units.flatMap((unit) => verdicts(unit))

const title = (ending: string) =>
  `25. the events of each ending this feature adds are exactly those S-069, S-094 and S-098 list, in the order the gates ran, for each of: a shot accepted on a retry, completed; a shot held, completed; a shot failing at its cap; a retry stopped for budget; a call unavailable to the last send; and a run picked up from its checkpoints, completed — ${ending}`

/** One run on an engine of its own, to its end. */
async function ended(
  requestId: string,
  options: Omit<EngineOptions, 'worker'>,
  budgetCents = 300,
): Promise<Videoed> {
  const engine = await startEngine({ worker: true, ...options })
  try {
    return await video(engine, videoRequest(requestId, budgetCents))
  } finally {
    await engine.stop()
  }
}

/** Every event of a run as one line, and the status its result names. */
function assertEnded(ran: Videoed, status: string, events: readonly string[]): void {
  assert.equal(ran.result.status, status, JSON.stringify(ran.result))
  assert.deepEqual(described(ran.events), events)
  ran.events.forEach((event, i) => assert.equal(event.seq, i + 1, 'the events have a gap'))
}

// ---------------------------------------------------------------- 25

test(title('a shot accepted on a retry, completed'), async () => {
  // Shot 1's first take is reconciled as showing never-person, a mustNotShow: it fails Gate 5, and its
  // second take is the shot's. Both takes' verdicts are events, take after take (S-094).
  const ran = await ended('r25-retry', {
    script: videoScript(THREE_RANKS, THREE_RANKS_PICS, {
      takes: [t0, t1, retake(t1, 2), t2, t3, t4, t5],
      reconciler: { 'shot-1-take-1': turned(t1, 'never-person') },
    }),
  })
  assertEnded(ran, 'completed', [
    ...PLANNED,
    ...STILLS,
    'stage.started video',
    ...verdicts(0),
    ...verdicts(1, 'accept', 'accept', 'accept', 'fail'),
    ...verdicts(1),
    ...accepted([2, 3, 4, 5]),
    'verdict 7 accept',
    'stage.finished video',
    'run.finished completed',
  ])
  assert.deepEqual(ran.result.degradations, [], JSON.stringify(ran.result))
})

test(title('a shot held, completed'), async () => {
  // Shot 1 claims show-crowd, a presence its picture was checked for at Gate 1; none of its three
  // clips shows it, so each fails Gate 5 and the shot is held on its picture at the cap (S-090). Its
  // degraded event comes AFTER its third take's verdicts, and the stage goes on to shot 2 (S-098).
  const crowd = turned(t1, 'show-crowd')
  const ran = await ended('r25-held', {
    script: videoScript(THREE_RANKS, THREE_RANKS_PICS, {
      takes: [t0, t1, retake(t1, 2), retake(t1, 3), t2, t3, t4, t5],
      reconciler: {
        'shot-1-take-1': crowd,
        'shot-1-take-2': crowd,
        'shot-1-take-3': crowd,
      },
    }),
  })
  const failed = verdicts(1, 'accept', 'accept', 'accept', 'fail')
  assertEnded(ran, 'completed', [
    ...PLANNED,
    ...STILLS,
    'stage.started video',
    ...verdicts(0),
    ...failed,
    ...failed,
    ...failed,
    'degraded shot-1',
    ...accepted([2, 3, 4, 5]),
    'verdict 7 accept',
    'stage.finished video',
    'run.finished completed',
  ])
  // The degraded event carries the still-hold's reason, and the result lists that one degradation.
  const reason = ran.stillHolds[0]?.reason
  assert.deepEqual(
    ran.stillHolds.map((h) => h.shot_id),
    ['shot-1'],
  )
  assert.equal(ran.events.find((e) => e.type === 'degraded')?.reason, reason)
  assert.deepEqual(ran.result.degradations, [{ shotId: 'shot-1', reason }])
})

test(title('a shot failing at its cap'), async () => {
  // Shot 0 opens on its chosen picture and claims show-pressing, an EVENT: a still cannot show one, so
  // a hold cannot cure it (S-090). Each of its three takes fails Gate 5, and the third ends the stage
  // as a failing take did — stopped for the rule of its lowest failing gate, at step video (S-094).
  const pressing = turned(t0, 'show-pressing')
  const ran = await ended('r25-cap', {
    script: videoScript(THREE_RANKS, THREE_RANKS_PICS, {
      takes: [t0, retake(t0, 2), retake(t0, 3)],
      reconciler: {
        'shot-0-take-1': pressing,
        'shot-0-take-2': pressing,
        'shot-0-take-3': pressing,
      },
    }),
  })
  assert.equal(ran.result.rule, 'gate-5', JSON.stringify(ran.result))
  assert.equal(ran.result.step, 'video', JSON.stringify(ran.result))
  const failed = verdicts(0, 'accept', 'accept', 'accept', 'fail')
  assertEnded(ran, 'stopped', [
    ...PLANNED,
    ...STILLS,
    'stage.started video',
    ...failed,
    ...failed,
    ...failed,
    'run.finished stopped',
  ])
  assert.deepEqual(ran.stillHolds, [], 'a shot that cannot be held was held')
})

test(title('a retry stopped for budget'), async () => {
  // Check 9's run: shot 1's first take costs 213 and speaks, so it fails Gate 3; its retry asks for 7
  // seconds at 4 cents a second — 213 + 28 = 241 — one cent over a ceiling of 240. The retry is not
  // made, and the shot is NOT held to save money (S-095, D-014): nothing follows the first take's
  // verdicts but the ending.
  const ran = await ended(
    'r25-budget',
    {
      video: { 'shot-1-take-1': { costCents: 213 } },
      media: { 'shot-1-take-1': { speech: true } },
      script: videoScript(THREE_RANKS, THREE_RANKS_PICS, { takes: [t0, t1] }),
    },
    240,
  )
  assert.equal(ran.result.reason, 'budget', JSON.stringify(ran.result))
  assert.equal(ran.result.estimateCents, 241, JSON.stringify(ran.result))
  assertEnded(ran, 'stopped', [
    ...PLANNED,
    ...STILLS,
    'stage.started video',
    ...verdicts(0),
    ...verdicts(1, 'accept', 'fail'),
    'run.finished stopped',
  ])
  assert.deepEqual(ran.stillHolds, [], 'a refused retry held its shot')
})

test(title('a call unavailable to the last send'), async () => {
  // Shot 1's first take is answered unavailable at each of its three sends: the guarded port throws,
  // and the stage fails the run as it fails on any thrown call (S-096, S-046). Nothing of that call is
  // written, so its shot has no verdict of any gate.
  const ran = await ended('r25-unavailable', {
    video: { 'shot-1-take-1': { transient: 3 } },
    script: videoScript(THREE_RANKS, THREE_RANKS_PICS, { takes: [t0] }),
  })
  assert.match(String(ran.result.detail), /I-11/, JSON.stringify(ran.result))
  assertEnded(ran, 'failed', [
    ...PLANNED,
    ...STILLS,
    'stage.started video',
    ...verdicts(0),
    'run.finished failed',
  ])
  assert.deepEqual(
    ran.takes.map((t) => t.take_id),
    ['a1-shot-0-take-1'],
    'a row was written for an unavailable call',
  )
})

test(title('a run picked up from its checkpoints, completed'), async () => {
  // Held at model call 17 — counted over every model call from 1: the planner's two, the stills
  // stage's eight, then two a take. Shot 0's take 1 (11, 12), shot 1's (13, 14), shot 2's take 1
  // (15, 16), which carries speech and fails GATE 3, and shot 2's take 2, whose WITNESS is call 17.
  // So the first attempt leaves shots 0 and 1 accepted, shot 2's take 1 decided and failed, its take 2
  // cut off after Gates 2 and 3, and three finished narrations. What it made is asserted from its
  // receipts before the kill, never from the count (S-062).
  const engine = await startEngine({
    worker: false,
    media: { 'shot-2-take-1': { speech: true } },
  })
  try {
    const killed = await killedMidVideo(engine, videoRequest('r25-checkpoints'), {
      script: videoScript(THREE_RANKS, THREE_RANKS_PICS, {
        takes: [t0, t1, t2, retake(t2, 2)],
      }),
      holdAtCall: 17,
      running: 'reel.clips',
      made: {
        narrations: ['a1-shot-0-narration', 'a1-shot-1-narration', 'a1-shot-2-narration'],
        takes: ['a1-shot-0-take-1', 'a1-shot-1-take-1', 'a1-shot-2-take-1', 'a1-shot-2-take-2'],
      },
    })
    // The new worker's script answers from shot 2's take 2 — made again in the cut-off take's place —
    // and then shots 3 to 5, each accepted on its first take.
    const ran = await takenUpVideo(engine, killed, clipsScript([retake(t2, 2), t3, t4, t5]))

    // Every KEPT and MADE take's verdicts, once, in shot and take order: shots 0 and 1's kept takes,
    // shot 2's kept failed take 1, then the take made in the cut-off one's place — and the cut-off
    // take's never. stage.started for video is written once (S-027).
    assertEnded(ran, 'completed', [
      ...PLANNED,
      ...STILLS,
      'stage.started video',
      ...verdicts(0),
      ...verdicts(1),
      ...verdicts(2, 'accept', 'fail'),
      ...verdicts(2),
      ...accepted([3, 4, 5]),
      'verdict 7 accept',
      'stage.finished video',
      'run.finished completed',
    ])
    assert.deepEqual(
      ran.takes.map((t) => [t.take_id, t.outcome]),
      [
        ['a1-shot-0-take-1', 'accept'],
        ['a1-shot-1-take-1', 'accept'],
        ['a1-shot-2-take-1', 'fail'],
        ['a1-shot-2-take-2', null],
        ['a2-shot-2-take-2', 'accept'],
        ['a2-shot-3-take-1', 'accept'],
        ['a2-shot-4-take-1', 'accept'],
        ['a2-shot-5-take-1', 'accept'],
      ],
      'the run does not hold the kept takes, the cut-off one and the takes made after it',
    )
  } finally {
    await engine.stop()
  }
})
