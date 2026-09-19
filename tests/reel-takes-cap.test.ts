import assert from 'node:assert/strict'
import { join } from 'node:path'
import { test } from 'node:test'
import { REPO } from './_repo.ts'
import { errorsIn } from './engine/compile.ts'
import { startEngine, type EngineOptions } from './engine/harness.ts'
import { THREE_RANKS, THREE_RANKS_PICS } from './engine/stills.ts'
import {
  DEGRADED,
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

// reel-takes, Slice 2 — check 12 (docs/features/reel-takes.md): at the cap, the shots a hold cannot
// cure (S-090, D-025, D-043, D-050, I-5). When a shot's third decided take fails, `atTheCap` decides:
// a shot with a chosen picture that claims no event is held on it (Slice 3); a shot with no chosen
// picture — the plan gave it none, or its picture was degraded — has nothing to hold, and a shot that
// claims an event mustShow cannot show it in a still, so each stops the run for the rule of its THIRD
// take's LOWEST failing gate, at step video, the detail naming the three takes, their reasons and why
// the shot cannot be held. Nothing is soft in this build: the ladder's answer has no label member.

const takes = takesOf(THREE_RANKS)
const [t0, t1, t2, t3] = takes as [Take, Take, Take, Take, Take, Take]

const T = (unit: number, n = 1) => `a1-shot-${unit}-take-${n}`
const N = (unit: number) => `a1-shot-${unit}-narration`

interface Ended {
  ran: Videoed
  videoCalls: string[]
  narrationCalls: string[]
  stillHolds: number
}

/** One video run on an engine of its own, to its end, read before the engine is stopped. */
async function ended(requestId: string, options: Omit<EngineOptions, 'worker'>): Promise<Ended> {
  const engine = await startEngine({ worker: true, ...options })
  try {
    const ran = await video(engine, videoRequest(requestId))
    return {
      ran,
      videoCalls: engine.video.calls.map((c) => c.takeId),
      narrationCalls: engine.narration.calls.map((c) => c.narrationId),
      stillHolds:
        engine.query<{ n: number }>(
          'SELECT COUNT(*) AS n FROM still_hold WHERE run_id = ?',
          ran.runId,
        )[0]?.n ?? -1,
    }
  } finally {
    await engine.stop()
  }
}

/** The run stopped at `unit`'s cap for `rule`, naming its three takes and every reason each failed. */
function stoppedAtTheCap(end: Ended, unit: number, rule: string, why: RegExp[], what: string) {
  const { ran } = end
  assert.equal(ran.result.status, 'stopped', `${what}: ${JSON.stringify(ran.result)}`)
  assert.equal(ran.result.reason, 'rule', what)
  assert.equal(ran.result.rule, rule, `${what}: not the third take's lowest failing gate`)
  assert.equal(ran.result.step, 'video', what)

  const detail = String(ran.result.detail)
  assert.match(detail, /three takes/i, `${what}: ${detail}`)
  const three = [1, 2, 3].map((n) => T(unit, n))
  for (const takeId of three) {
    assert.ok(detail.includes(takeId), `${what}: the detail does not name ${takeId}: ${detail}`)
    const row = ran.takes.find((t) => t.take_id === takeId)
    assert.ok(row !== undefined, `${what}: no row for ${takeId}`)
    assert.equal(row.outcome, 'fail', `${what}: ${takeId}`)
    for (const verdict of row.verdicts.filter((v) => v.outcome === 'fail')) {
      for (const reason of verdict.reasons) {
        assert.ok(detail.includes(reason), `${what}: the detail leaves out ${takeId}'s "${reason}"`)
      }
    }
  }
  for (const pattern of why) assert.match(detail, pattern, `${what}: why it cannot be held`)

  // Nothing after the third take: no later shot's narration or clip, and nothing held.
  assert.equal(end.narrationCalls.at(-1), N(unit), `${what}: a later shot's narration was made`)
  assert.deepEqual(end.videoCalls.slice(-3), three, `${what}: a later clip was made`)
  assert.equal(end.stillHolds, 0, `${what}: a still_hold row`)
  assert.ok(!ran.jobs.some((j) => j.kind === 'reel.assemble'), `${what}: a reel.assemble row`)
  assert.equal(described(ran.events).at(-1), 'run.finished stopped', what)
}

const CHECK_12 =
  "12. at the cap, a shot the plan gave no picture, a shot whose picture was degraded, and a shot with a chosen picture that claims an event mustShow each stop the run for the rule of the third take's lowest failing gate at step video, the detail naming the three takes, their reasons and why the shot cannot be held; no later shot's narration or clip is made, and there is no still-hold row; and atTheCap, compiled in the test, answers hold or fail — one of kind accept_with_label is a type error"

// ---------------------------------------------------------------- 12

test(`${CHECK_12} — a shot the plan gave no picture`, async () => {
  // Shot 3 of THREE_RANKS is made from words. Its first take is black — Gate 2; its second shows a
  // person — Gate 5; its third carries music AND shows a person — Gates 3 and 5, so its lowest
  // failing gate is 3, where the first take's, and the lowest of all three, is 2.
  const person = turned(t3, 'never-person')
  const end = await ended('r12-words', {
    video: { 'shot-3-take-1': { black: 'whole' } },
    media: { 'shot-3-take-3': { music: true } },
    script: videoScript(THREE_RANKS, THREE_RANKS_PICS, {
      takes: [t0, t1, t2, retake(t3, 2), retake(t3, 3)],
      reconciler: { 'shot-3-take-2': person, 'shot-3-take-3': person },
    }),
  })
  stoppedAtTheCap(end, 3, 'gate-3', [/no approved picture/i, /plan gave it no picture/i], 'words')
  assert.deepEqual(end.videoCalls, [T(0), T(1), T(2), T(3, 1), T(3, 2), T(3, 3)])
})

test(`${CHECK_12} — a shot whose picture was degraded`, async () => {
  // DEGRADED's shot 2 lost its picture to Gate 1S with no slot left, so it is made from words. Each of
  // its three takes carries speech: Gate 3.
  const end = await ended('r12-degraded', {
    sensors: DEGRADED.sensors,
    media: {
      'shot-2-take-1': { speech: true },
      'shot-2-take-2': { speech: true },
      'shot-2-take-3': { speech: true },
    },
    script: videoScript(DEGRADED.shape, DEGRADED.pics, {
      stills: DEGRADED.stills,
      takes: [t0, t1, t2, retake(t2, 2), retake(t2, 3)],
    }),
  })
  stoppedAtTheCap(end, 2, 'gate-3', [/no approved picture/i, /degraded/i], 'degraded')
  assert.deepEqual(
    end.ran.takes.slice(2).map((t) => [t.take_id, t.mode, t.degraded]),
    [
      [T(2, 1), 'text-to-video', true],
      [T(2, 2), 'text-to-video', true],
      [T(2, 3), 'text-to-video', true],
    ],
  )
})

test(`${CHECK_12} — a shot with a chosen picture that claims an event`, async () => {
  // Shot 0 of THREE_RANKS opens on its chosen picture and claims show-pressing, an event. Each of its
  // three takes fails to show it: Gate 5.
  const pressing = turned(t0, 'show-pressing')
  const end = await ended('r12-event', {
    script: videoScript(THREE_RANKS, THREE_RANKS_PICS, {
      takes: [t0, retake(t0, 2), retake(t0, 3)],
      reconciler: {
        'shot-0-take-1': pressing,
        'shot-0-take-2': pressing,
        'shot-0-take-3': pressing,
      },
    }),
  })
  stoppedAtTheCap(
    end,
    0,
    'gate-5',
    [/show-pressing/, /event/i, /still picture cannot show/i],
    'event',
  )
  assert.doesNotMatch(
    String(end.ran.result.detail),
    /no approved picture/i,
    'the detail says a shot with a chosen picture has none',
  )
  assert.deepEqual(end.videoCalls, [T(0, 1), T(0, 2), T(0, 3)])
  assert.deepEqual(end.narrationCalls, [N(0)])
})

/** Where a snippet pretends to live: inside the repository, so its relative imports resolve. */
const DIR = join(REPO, '.tmp', `takes-cap-${process.pid}`)

const PREAMBLE = [
  "import type { TakeRecord } from '../../packages/contracts/src/index.ts'",
  "import { atTheCap, type AtTheCap } from '../../packages/pipeline/src/index.ts'",
  '',
  'declare const takes: readonly TakeRecord[]',
  '/** True only when A and B are the same type. */',
  'type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false',
  '',
].join('\n')

const snippet = (body: string) => `${PREAMBLE}export function call(): void {\n${body}\n}\n`

test(`${CHECK_12} — atTheCap's answer, compiled`, () => {
  const legal = snippet(
    [
      "  const hold: AtTheCap = { kind: 'hold', reason: 'held on its picture' }",
      "  const fail: AtTheCap = { kind: 'fail', why: 'no picture to hold' }",
      '  const answered: AtTheCap = atTheCap({ shotUnit: 3, picture: null, events: [] }, takes)',
      "  const kinds: Same<ReturnType<typeof atTheCap>['kind'], 'hold' | 'fail'> = true",
      '  void [hold, fail, answered, kinds]',
    ].join('\n'),
  )
  assert.deepEqual(errorsIn(DIR, legal), [], 'a hold or a fail from the ladder did not compile')

  for (const [what, body] of [
    [
      'an answer of kind accept_with_label',
      "  const a: AtTheCap = { kind: 'accept_with_label', reason: 'labelled' }\n  void a",
    ],
    [
      "a kind accept_with_label read off atTheCap's own answer",
      "  const k: ReturnType<typeof atTheCap>['kind'] = 'accept_with_label'\n  void k",
    ],
  ] as const) {
    const errors = errorsIn(DIR, snippet(body))
    assert.ok(errors.length > 0, `${what} compiled`)
    assert.ok(
      errors.some((e) => e.includes('accept_with_label')),
      `${what} was refused, but not for its kind: ${errors.join(' | ')}`,
    )
  }
})
