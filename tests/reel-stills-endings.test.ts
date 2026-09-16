import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { LanguageModelPort } from '@cutroom/contracts'
import { finished, startEngine } from './engine/harness.ts'
import {
  BOTH_SHARE,
  BOTH_SHARE_PICS,
  THREE_RANKS,
  THREE_RANKS_PICS,
  again,
  assertDegraded,
  clipped,
  judged,
  showsPerson,
  stills,
  stillsRequest,
  stillsScript,
  type Pic,
  type Stilled,
} from './engine/stills.ts'

// reel-stills, Slice 4 — check 41 (docs/features/reel-stills.md): every ending of a stills run, and
// its events exactly as S-046 lists them, in the order the checks ran. Each list below is typed by
// hand. A run stopped or failed in the stills stage has no stage.finished for stills (S-025's rule).
//
// The order of the ladders is S-057's: a shot's ladder at a step is finished before the next shot's
// begins — a derived picture's Gate 1 repair is made before the next derived picture, and a Gate 1S
// repair goes through Gate 1 and Gate 1S before the next shot's Gate 1S.

const [a, b, barons, hall] = THREE_RANKS_PICS as [Pic, Pic, Pic, Pic]

type Event = Record<string, unknown> & { type: string }
const described = (events: readonly Event[]) =>
  events.map((e) => {
    if (e.type === 'verdict') {
      return `verdict ${String(e.gate)}${e.shotId === undefined ? '' : ` ${String(e.shotId)}`} ${String(e.outcome)}`
    }
    if (e.type === 'degraded') return `degraded ${String(e.shotId)}`
    if (e.type === 'run.finished') return `run.finished ${String(e.status)}`
    return e.stage === undefined ? e.type : `${e.type} ${String(e.stage)}`
  })

/** The plan stage's events of every admitted fixture run: plan a fails Gate 0, plan b survives. */
const PLANNED = [
  'run.accepted',
  'stage.started plan',
  'verdict 0 fail',
  'verdict 0 accept',
  'stage.finished plan',
]

// ---------------------------------------------------------------- 41

test('41. each stills endings events are exactly those S-046 lists, in the order the checks ran', async () => {
  const endings: Record<string, Stilled> = {}

  // Completed, with a Gate 1S repair on each of two shots.
  const s1 = BOTH_SHARE_PICS[2] as Pic
  const s2 = BOTH_SHARE_PICS[3] as Pic
  const [shareA, shareB] = BOTH_SHARE_PICS as [Pic, Pic]
  const repairs = await startEngine({
    worker: true,
    sensors: { [s1.key]: { similarity: 0.5 }, [s2.key]: { similarity: 0.5 } },
    script: stillsScript(
      BOTH_SHARE,
      [shareA, shareB, s1, s2, again(s1, 'repair'), again(s2, 'repair')],
      { judge: [judged(['a wax seal'], ['a wax seal']), judged(['a wax seal'], ['a wax seal'])] },
    ),
  })
  try {
    endings.repairs = await stills(repairs, stillsRequest('r41-repairs'))
  } finally {
    await repairs.stop()
  }
  assert.deepEqual(described(endings.repairs.events), [
    ...PLANNED,
    'stage.started stills',
    'verdict 1 shot-0 accept',
    'verdict 1 shot-0 accept',
    'verdict 1 shot-1 accept',
    'verdict 1 shot-2 accept',
    'verdict 1S shot-1 fail',
    'verdict 1 shot-1 accept',
    'verdict 1S shot-1 accept',
    'verdict 1S shot-2 fail',
    'verdict 1 shot-2 accept',
    'verdict 1S shot-2 accept',
    'stage.finished stills',
    'run.finished completed',
  ])

  // Completed, with the canonical's repair, a derived Gate 1 repair and a degraded shot (check 40's).
  const degraded = await startEngine({
    worker: true,
    sensors: { [hall.key]: { similarity: 0.5 } },
    script: stillsScript(
      THREE_RANKS,
      [a, b, again(a, 'repair'), barons, again(barons, 'repair'), hall],
      {
        witness: { [a.key]: clipped(a), [b.key]: clipped(b) },
        reconciler: { [barons.key]: showsPerson(barons) },
        judge: [judged(['a wax seal'], ['a wax seal'])],
      },
    ),
  })
  try {
    endings.degraded = await stills(degraded, stillsRequest('r41-degraded'))
  } finally {
    await degraded.stop()
  }
  assert.deepEqual(described(endings.degraded.events), [
    ...PLANNED,
    'stage.started stills',
    'verdict 1 shot-0 fail',
    'verdict 1 shot-0 fail',
    'verdict 1 shot-0 accept',
    'verdict 1 shot-1 fail',
    'verdict 1 shot-1 accept',
    'verdict 1 shot-2 accept',
    'verdict 1S shot-1 accept',
    'verdict 1S shot-2 fail',
    'degraded shot-2',
    'stage.finished stills',
    'run.finished completed',
  ])

  // Stopped for a rule: the canonical failed three times.
  const rule = await startEngine({
    worker: true,
    script: stillsScript(THREE_RANKS, [a, b, again(a, 'repair')], {
      witness: { [a.key]: clipped(a), [b.key]: clipped(b), 'shot-0-repair': clipped(a) },
    }),
  })
  try {
    endings.rule = await stills(rule, stillsRequest('r41-rule'))
  } finally {
    await rule.stop()
  }
  assert.equal(endings.rule.result.reason, 'rule', JSON.stringify(endings.rule.result))
  assert.deepEqual(described(endings.rule.events), [
    ...PLANNED,
    'stage.started stills',
    'verdict 1 shot-0 fail',
    'verdict 1 shot-0 fail',
    'verdict 1 shot-0 fail',
    'run.finished stopped',
  ])

  // Stopped for budget, after a shot was degraded: the barons' repair fails Gate 1 and costs 90, so
  // the hall's call — 90 + 15 against a ceiling of 100 — is not made. The degradation reached is
  // an event, and like every degradation it is labelled in all four places (S-058).
  const budget = await startEngine({
    worker: true,
    images: { 'shot-1-repair': { shape: 'wrong-size', costCents: 90 } },
    script: stillsScript(THREE_RANKS, [a, b, barons], {
      reconciler: { [barons.key]: showsPerson(barons) },
    }),
  })
  try {
    endings.budget = await stills(budget, stillsRequest('r41-budget', 100))
  } finally {
    await budget.stop()
  }
  assert.equal(endings.budget.result.reason, 'budget', JSON.stringify(endings.budget.result))
  assert.deepEqual(described(endings.budget.events), [
    ...PLANNED,
    'stage.started stills',
    'verdict 1 shot-0 accept',
    'verdict 1 shot-0 accept',
    'verdict 1 shot-1 fail',
    'verdict 1 shot-1 fail',
    'degraded shot-1',
    'run.finished stopped',
  ])
  assertDegraded(endings.budget, {
    shotId: 'shot-1',
    gate: '1',
    last: 'a1-shot-1-repair',
    pictures: ['a1-shot-1-single', 'a1-shot-1-repair'],
  })

  // Failed: the judge cannot be reached on the hall's pair, after the barons' pair was accepted
  // uncompared.
  const failed = await startEngine({
    worker: true,
    sensors: { [hall.key]: { similarity: 0.5 } },
    script: {
      ...stillsScript(THREE_RANKS, THREE_RANKS_PICS),
      judge: [{ throws: 'the judge cannot be reached' }],
    },
  })
  try {
    endings.failed = await stills(failed, stillsRequest('r41-failed'))
  } finally {
    await failed.stop()
  }
  assert.equal(endings.failed.result.status, 'failed', JSON.stringify(endings.failed.result))
  assert.deepEqual(described(endings.failed.events), [
    ...PLANNED,
    'stage.started stills',
    'verdict 1 shot-0 accept',
    'verdict 1 shot-0 accept',
    'verdict 1 shot-1 accept',
    'verdict 1 shot-2 accept',
    'verdict 1S shot-1 accept',
    'run.finished failed',
  ])

  // Cancelled between the plan job and the keyframes job: run.finished, and nothing of the stills
  // stage.
  let planned = 0
  let reached!: () => void
  const reachedLast = new Promise<void>((resolve) => (reached = resolve))
  let release!: () => void
  const released = new Promise<void>((resolve) => (release = resolve))
  const hold = (model: LanguageModelPort): LanguageModelPort => ({
    async structured(call) {
      if (call.role === 'planner' && ++planned === 2) {
        reached()
        await released
      }
      return model.structured(call)
    },
    observe: (call) => model.observe(call),
    compare: (call) => model.compare(call),
    judgeCut: (call) => model.judgeCut(call),
  })
  const cancelled = await startEngine({
    worker: true,
    script: stillsScript(THREE_RANKS, THREE_RANKS_PICS),
    wrapModel: hold,
  })
  try {
    const submitted = await cancelled.http.submit(stillsRequest('r41-cancelled'))
    const runId = String(submitted.json.runId)
    await reachedLast
    const stopping = cancelled.stopWorker()
    release()
    await stopping
    await cancelled.http.cancel(runId)
    await cancelled.startWorker()
    await finished(cancelled, runId)
    const events = (await cancelled.http.events(runId)).json.events as Event[]
    assert.deepEqual(described(events), [...PLANNED, 'run.finished cancelled'])
  } finally {
    release()
    await cancelled.stop()
  }

  // No ending but completed has stage.finished for stills.
  for (const [name, ran] of Object.entries(endings)) {
    const finishedStills = ran.events.some(
      (e) => e.type === 'stage.finished' && e.stage === 'stills',
    )
    assert.equal(
      finishedStills,
      ran.result.status === 'completed',
      `${name}: stage.finished for stills on a run ${String(ran.result.status)}`,
    )
  }
})
