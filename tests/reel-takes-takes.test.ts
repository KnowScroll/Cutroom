import assert from 'node:assert/strict'
import { test } from 'node:test'
import { crc32 } from 'node:zlib'
import type { VideoRequest } from '@cutroom/contracts'
import { startEngine, type EngineOptions } from './engine/harness.ts'
import { THREE_RANKS, THREE_RANKS_PICS } from './engine/stills.ts'
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

// reel-takes, Slice 2 — checks 5 and 8 (docs/features/reel-takes.md): three takes a shot, counted when
// decided (D-024, S-094). A take that fails Gate 2, 3 or 5 is followed by its shot's next take, made
// the shot's own way — from its chosen picture, or from words at 9:16 (S-091) — under its own id and
// seed (D-018). The first take accepted is the shot's, and none follows it (D-030); after a shot's third
// decided take no video call names it, and the ladder decides (S-090). Each take's verdicts are events,
// take after take (S-069, S-094).
//
// THREE_RANKS' shot 0 has a chosen picture and claims the event `show-pressing`; its shot 3 was given
// no picture and is made from words. A hold can cure neither (S-090), so a failure built on either
// stops the reel at the cap rather than holding it. Every expectation is typed by hand.

const takes = takesOf(THREE_RANKS)
const [t0, t1, t2, t3, t4, t5] = takes as [Take, Take, Take, Take, Take, Take]

const T = (unit: number, n = 1) => `a1-shot-${unit}-take-${n}`

interface Entry {
  takeId: string
  shotId: string
  number: number
  used: boolean
  observationId?: string
  reconciliationId?: string
  checks: Array<{ gate: string; outcome: string }>
}

const ALL_ACCEPTED = ['2', '3', '4', '5'].map((gate) => ({ gate, outcome: 'accept' }))

/** A take's record entry that reached Gate 5: both its ids and its checks. */
const decided = (
  unit: number,
  n: number,
  used: boolean,
  checks: Entry['checks'] = ALL_ACCEPTED,
): Entry => ({
  takeId: T(unit, n),
  shotId: `shot-${unit}`,
  number: n,
  used,
  observationId: `obs-${T(unit, n)}`,
  reconciliationId: `rec-${T(unit, n)}`,
  checks,
})

/** One video run of THREE_RANKS on an engine of its own, to its end, with what a caller reads. */
async function ended(
  requestId: string,
  options: Omit<EngineOptions, 'worker'>,
): Promise<{ ran: Videoed; record: { takes: Entry[] }; calls: VideoRequest[] }> {
  const engine = await startEngine({ worker: true, ...options })
  try {
    const ran = await video(engine, videoRequest(requestId))
    const record = (await engine.http.record(ran.runId)).json as { takes: Entry[] }
    return { ran, record, calls: [...engine.video.calls] }
  } finally {
    await engine.stop()
  }
}

/** Every call's seed is its own take id's CRC-32 (D-018), and a shot's takes each have their own. */
function seeded(calls: readonly VideoRequest[], shotTakes: readonly string[]) {
  for (const call of calls) {
    assert.equal(call.seed, crc32(call.takeId), `${call.takeId}'s seed is not its id's CRC-32`)
  }
  const seeds = calls.filter((c) => shotTakes.includes(c.takeId)).map((c) => c.seed)
  assert.equal(seeds.length, shotTakes.length)
  assert.equal(new Set(seeds).size, seeds.length, `a take's seed is another's: ${seeds.join(', ')}`)
}

const CHECK_5 =
  "5. a take failing Gate 2, 3 or 5 — each built alone, on a shot a hold cannot cure — is followed by the shot's next take, in the first take's mode — image-to-video from its picture on shot 0 of THREE_RANKS, which claims an event, and text-to-video at 9:16 on its shot 3, made from words — its id a<attempt>-shot-<unit>-take-<n> with n its number, its seed that id's CRC-32 and so unlike the last; a shot accepted on its second take makes no third; after a shot's third decided take no video call names it; the record lists each take with its number; and every take's row, receipt and verdicts are kept"

// ---------------------------------------------------------------- 5

test(`${CHECK_5} — Gate 2 on shot 0, whose next take is made from the same picture`, async () => {
  // Shot 0's first clip is black from its first frame to its last. It fails Gate 2 and makes no model
  // call, so the script answers its second take and every take after it.
  const { ran, record, calls } = await ended('r5-gate2', {
    video: { 'shot-0-take-1': { black: 'whole' } },
    script: videoScript(THREE_RANKS, THREE_RANKS_PICS, {
      takes: [retake(t0, 2), t1, t2, t3, t4, t5],
    }),
  })
  assert.equal(ran.result.status, 'completed', JSON.stringify(ran.result))

  // Accepted on its second take: no third, and every later shot made once.
  assert.deepEqual(
    calls.map((c) => c.takeId),
    [T(0, 1), T(0, 2), T(1), T(2), T(3), T(4), T(5)],
  )
  // In the first take's mode: image-to-video from shot 0's chosen picture, the canonical's a.
  const [first, second] = calls as [VideoRequest, VideoRequest]
  for (const call of [first, second]) {
    assert.equal(call.mode, 'image-to-video', `${call.takeId} is not made from its picture`)
    assert.equal(call.image?.pictureId, 'a1-shot-0-a', `${call.takeId}'s picture`)
    assert.equal(call.aspectRatio, undefined)
  }
  assert.deepEqual(second.image, first.image, 'the retry is made from another file')
  assert.equal(second.durationSeconds, first.durationSeconds)
  assert.equal(second.durationSeconds, 9)
  seeded(calls, [T(0, 1), T(0, 2)])

  // Every take's row, receipt and verdicts kept.
  assert.deepEqual(
    ran.takes.map((t) => [t.take_id, t.number, t.mode, t.outcome]),
    [
      [T(0, 1), 1, 'image-to-video', 'fail'],
      [T(0, 2), 2, 'image-to-video', 'accept'],
      [T(1), 1, 'image-to-video', 'accept'],
      [T(2), 1, 'image-to-video', 'accept'],
      [T(3), 1, 'text-to-video', 'accept'],
      [T(4), 1, 'text-to-video', 'accept'],
      [T(5), 1, 'text-to-video', 'accept'],
    ],
  )
  assert.deepEqual(
    ran.takes[0]?.verdicts.map((v) => [v.gate, v.outcome]),
    [['2', 'fail']],
  )
  assert.deepEqual(
    ran.videoReceipts.map((r) => [r.take_id, r.seed]),
    calls.map((c) => [c.takeId, crc32(c.takeId)]),
  )

  // The record lists each take with its number; the video shows shot 0's second.
  assert.deepEqual(record.takes, [
    {
      takeId: T(0, 1),
      shotId: 'shot-0',
      number: 1,
      used: false,
      checks: [{ gate: '2', outcome: 'fail' }],
    },
    decided(0, 2, true),
    ...[1, 2, 3, 4, 5].map((u) => decided(u, 1, true)),
  ])
})

test(`${CHECK_5} — Gate 3 on shot 3, whose next take is made from words at 9:16`, async () => {
  // Shot 3's first clip carries speech: it fails Gate 3, and Gates 4 and 5 still run on it (S-072).
  const engine = await startEngine({
    worker: true,
    media: { 'shot-3-take-1': { speech: true } },
    script: videoScript(THREE_RANKS, THREE_RANKS_PICS, {
      takes: [t0, t1, t2, t3, retake(t3, 2), t4, t5],
    }),
  })
  try {
    const ran = await video(engine, videoRequest('r5-gate3'))
    assert.equal(ran.result.status, 'completed', JSON.stringify(ran.result))
    const calls = engine.video.calls
    assert.deepEqual(
      calls.map((c) => c.takeId),
      [T(0), T(1), T(2), T(3, 1), T(3, 2), T(4), T(5)],
    )
    const [first, second] = calls.slice(3, 5) as [VideoRequest, VideoRequest]
    for (const call of [first, second]) {
      assert.equal(call.mode, 'text-to-video', `${call.takeId} is not made from words`)
      assert.equal(call.aspectRatio, '9:16', `${call.takeId} has no 9:16`)
      assert.equal(call.image, undefined)
    }
    assert.equal(second.durationSeconds, first.durationSeconds)
    assert.equal(second.durationSeconds, 5)
    seeded(calls, [T(3, 1), T(3, 2)])

    // The retry is held to its first take's criteria: the two reconcile prompts are one text.
    const reconciled = (takeId: string) =>
      engine.model.calls.filter((c) => c.role === 'reconciler' && c.takeIds?.includes(takeId))
    const [once] = reconciled(T(3, 1))
    const [again] = reconciled(T(3, 2))
    assert.ok(once !== undefined && again !== undefined)
    assert.equal(
      again.prompt,
      once.prompt,
      "the retry was held to other criteria than its first take's",
    )

    assert.deepEqual(
      ran.takes.map((t) => [t.take_id, t.number, t.outcome]),
      [
        [T(0), 1, 'accept'],
        [T(1), 1, 'accept'],
        [T(2), 1, 'accept'],
        [T(3, 1), 1, 'fail'],
        [T(3, 2), 2, 'accept'],
        [T(4), 1, 'accept'],
        [T(5), 1, 'accept'],
      ],
    )
    const failed = ran.takes[3]
    assert.deepEqual(
      failed?.verdicts.map((v) => [v.gate, v.outcome]),
      [
        ['2', 'accept'],
        ['3', 'fail'],
        ['4', 'accept'],
        ['5', 'accept'],
      ],
    )
    assert.deepEqual(
      ran.videoReceipts.map((r) => [r.take_id, r.aspect_ratio]),
      [
        [T(0), null],
        [T(1), null],
        [T(2), null],
        [T(3, 1), '9:16'],
        [T(3, 2), '9:16'],
        [T(4), '9:16'],
        [T(5), '9:16'],
      ],
    )
    const record = (await engine.http.record(ran.runId)).json as { takes: Entry[] }
    assert.deepEqual(record.takes, [
      decided(0, 1, true),
      decided(1, 1, true),
      decided(2, 1, true),
      decided(3, 1, false, [
        { gate: '2', outcome: 'accept' },
        { gate: '3', outcome: 'fail' },
        { gate: '4', outcome: 'accept' },
        { gate: '5', outcome: 'accept' },
      ]),
      decided(3, 2, true),
      decided(4, 1, true),
      decided(5, 1, true),
    ])
  } finally {
    await engine.stop()
  }
})

test(`${CHECK_5} — Gate 5 on each of shot 3's three takes, after which no video call names it`, async () => {
  const failing = turned(t3, 'never-person')
  const { ran, record, calls } = await ended('r5-gate5', {
    script: videoScript(THREE_RANKS, THREE_RANKS_PICS, {
      takes: [t0, t1, t2, t3, retake(t3, 2), retake(t3, 3)],
      reconciler: { 'shot-3-take-1': failing, 'shot-3-take-2': failing, 'shot-3-take-3': failing },
    }),
  })
  assert.equal(ran.result.status, 'stopped', JSON.stringify(ran.result))
  assert.equal(ran.result.rule, 'gate-5')

  // Three decided takes, then nothing: no fourth, and no later shot.
  assert.deepEqual(
    calls.map((c) => c.takeId),
    [T(0), T(1), T(2), T(3, 1), T(3, 2), T(3, 3)],
  )
  for (const call of calls.slice(3)) {
    assert.equal(call.mode, 'text-to-video')
    assert.equal(call.aspectRatio, '9:16')
  }
  seeded(calls, [T(3, 1), T(3, 2), T(3, 3)])

  assert.deepEqual(
    ran.takes.map((t) => [t.take_id, t.number, t.outcome]),
    [
      [T(0), 1, 'accept'],
      [T(1), 1, 'accept'],
      [T(2), 1, 'accept'],
      [T(3, 1), 1, 'fail'],
      [T(3, 2), 2, 'fail'],
      [T(3, 3), 3, 'fail'],
    ],
  )
  for (const take of ran.takes.slice(3)) {
    assert.deepEqual(
      take.verdicts.map((v) => [v.gate, v.outcome]),
      [
        ['2', 'accept'],
        ['3', 'accept'],
        ['4', 'accept'],
        ['5', 'fail'],
      ],
      `${take.take_id}'s verdicts`,
    )
    assert.deepEqual(take.verdicts[3]?.reasons, [
      'must never show "never-person" is shown: any real living person',
    ])
  }
  assert.deepEqual(
    ran.videoReceipts.map((r) => r.take_id),
    [T(0), T(1), T(2), T(3, 1), T(3, 2), T(3, 3)],
  )
  const fifth = ['2', '3', '4'].map((gate) => ({ gate, outcome: 'accept' }))
  assert.deepEqual(record.takes, [
    decided(0, 1, false),
    decided(1, 1, false),
    decided(2, 1, false),
    ...[1, 2, 3].map((n) => decided(3, n, false, [...fifth, { gate: '5', outcome: 'fail' }])),
  ])
})

// ---------------------------------------------------------------- 8

const CHECK_8 =
  "8. each take's verdicts are events with the shot's id, take after take in the order the gates ran: a shot accepted on its second take has eight verdict events, the first four take 1's"

/** The plan stage of every THREE_RANKS run: plan a fails Gate 0, plan b survives. */
const PLANNED = [
  'run.accepted',
  'stage.started plan',
  'verdict 0 fail',
  'verdict 0 accept',
  'stage.finished plan',
]

/** THREE_RANKS' stills stage, completed. */
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

const accepted = (unit: number) =>
  ['2', '3', '4', '5'].map((gate) => `verdict ${gate} shot-${unit} accept`)

test(CHECK_8, async () => {
  // Shot 1's first take fails Gate 5; its second is accepted.
  const { ran } = await ended('r8', {
    script: videoScript(THREE_RANKS, THREE_RANKS_PICS, {
      takes: [t0, t1, retake(t1, 2), t2, t3, t4, t5],
      reconciler: { 'shot-1-take-1': turned(t1, 'never-person') },
    }),
  })
  assert.equal(ran.result.status, 'completed', JSON.stringify(ran.result))
  assert.deepEqual(described(ran.events), [
    ...PLANNED,
    ...STILLS,
    'stage.started video',
    ...accepted(0),
    'verdict 2 shot-1 accept',
    'verdict 3 shot-1 accept',
    'verdict 4 shot-1 accept',
    'verdict 5 shot-1 fail',
    ...accepted(1),
    ...accepted(2),
    ...accepted(3),
    ...accepted(4),
    ...accepted(5),
    'verdict 7 accept',
    'stage.finished video',
    'run.finished completed',
  ])
  // Its takes' verdicts, Gates 2 to 5 — the stills stage's Gate 1 and 1S verdicts for its picture are
  // the shot's too, and are not its takes'.
  const shot1 = ran.events.filter(
    (e) =>
      e.type === 'verdict' &&
      e.shotId === 'shot-1' &&
      ['2', '3', '4', '5'].includes(String(e.gate)),
  )
  assert.equal(shot1.length, 8, 'shot 1 has not eight verdict events for its takes')
})
