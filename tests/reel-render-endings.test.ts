import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import type { AssemblerPort } from '@cutroom/contracts'
import { REPO } from './_repo.ts'
import { TEST_RENDER_SETTINGS, startEngine, type EngineOptions } from './engine/harness.ts'
import { holdRows } from './engine/render.ts'
import { THREE_RANKS, THREE_RANKS_PICS, again, clipped, type Pic } from './engine/stills.ts'
import {
  cutAnswer,
  described,
  holding,
  readVideo,
  reconcilesTake,
  retake,
  takesOf,
  turned,
  video,
  videoFinished,
  videoRequest,
  videoScript,
  whenHeld,
  type Take,
  type Videoed,
} from './engine/video.ts'

// reel-render, Slice 5 — check 47 (docs/features/reel-render.md): every ending of a video run, and
// its events EXACTLY as S-069 lists them, in the order the gates ran. Each list below is typed by
// hand; each ending is one run of THREE_RANKS, whose plan stage and stills stage are the same in every
// run that gets past them. Pieces of several endings are asserted by Slices 2 to 4 — checks 8, 10,
// 11, 25, 26, 38, 39 and 41 — and none of those is changed: this check holds each whole, in one place.
//
// Gate 4 says this check may be green before Slice 5's code, since Slices 3 and 4 write each ending's
// events — but for the one ending Slice 5 builds, a stop for budget in the clips stage, which ended
// `failed` until this slice. The breaks recorded with the slice are what show the rest can fail.

const [a, b] = THREE_RANKS_PICS as [Pic, Pic, Pic, Pic]
const takes = takesOf(THREE_RANKS)

/** The plan stage of every run here: plan a fails Gate 0, plan b survives. */
const PLANNED = [
  'run.accepted',
  'stage.started plan',
  'verdict 0 fail',
  'verdict 0 accept',
  'stage.finished plan',
]

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

/** The first `shots` shots' takes, each accepted at Gates 2, 3, 4 and 5, in plan order. */
const TAKES = (shots: number) =>
  Array.from({ length: shots }, (_, unit) =>
    ['2', '3', '4', '5'].map((gate) => `verdict ${gate} shot-${unit} accept`),
  ).flat()

const title = (ending: string) =>
  `47. the events of each video ending are exactly those S-069 lists, in the order the gates ran, for each of: refused at the ceiling; the stills stage stopped; cancelled before the clips job; cancelled before the assemble job; a take failing; an unclaimed mustShow unmet; stopped for budget in the clips stage; failed in the clips stage; stopped at Gate 7; failed in the assemble job; and completed — ${ending}`

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

/** Shot 3's clip is 2 seconds under a narration of 3: the render holds its last frame for one. */
const HELD = { 'shot-3-take-1': { seconds: 2 } }

// ---------------------------------------------------------------- 47

test(title('refused at the ceiling'), async () => {
  // The plan's estimate is 220: one cent less refuses the run at the end of its plan stage.
  const ran = await ended(
    'r47-refused',
    { script: videoScript(THREE_RANKS, THREE_RANKS_PICS) },
    219,
  )
  assert.equal(ran.result.limit, 'ceiling', JSON.stringify(ran.result))
  assertEnded(ran, 'refused', [...PLANNED, 'run.finished refused'])
})

test(title('the stills stage stopped'), async () => {
  // The canonical fails Gate 1 three times (D-047): a rule stop at step stills.
  const ran = await ended('r47-stills', {
    script: videoScript(THREE_RANKS, [a, b, again(a, 'repair')], {
      stills: {
        witness: { [a.key]: clipped(a), [b.key]: clipped(b), 'shot-0-repair': clipped(a) },
      },
      takes: [],
    }),
  })
  assert.equal(ran.result.step, 'stills', JSON.stringify(ran.result))
  assertEnded(ran, 'stopped', [
    ...PLANNED,
    'stage.started stills',
    'verdict 1 shot-0 fail',
    'verdict 1 shot-0 fail',
    'verdict 1 shot-0 fail',
    'run.finished stopped',
  ])
})

test(title('cancelled before the clips job'), async () => {
  // Held at the stills stage's first witness call; a cancel during a stage does not stop it.
  const hold = holding({ call: 'observe', matches: () => true })
  const engine = await startEngine({
    worker: true,
    script: videoScript(THREE_RANKS, THREE_RANKS_PICS),
    wrapModel: hold.wrap,
  })
  try {
    const submitted = await engine.http.submit(videoRequest('r47-cancel-clips'))
    const runId = String(submitted.json.runId)
    await whenHeld(engine, runId, hold.reached)
    await engine.http.cancel(runId)
    hold.release()
    await videoFinished(engine, runId)
    assertEnded(await readVideo(engine, runId), 'cancelled', [
      ...PLANNED,
      ...STILLS,
      'run.finished cancelled',
    ])
  } finally {
    hold.release()
    await engine.stop()
  }
})

test(title('cancelled before the assemble job'), async () => {
  // Held at the last take's reconcile call, as reel-render's check 11 holds it.
  const hold = holding({ call: 'structured', matches: reconcilesTake('shot-5-take-1') })
  const engine = await startEngine({
    worker: true,
    script: videoScript(THREE_RANKS, THREE_RANKS_PICS),
    wrapModel: hold.wrap,
  })
  try {
    const submitted = await engine.http.submit(videoRequest('r47-cancel-assemble'))
    const runId = String(submitted.json.runId)
    await whenHeld(engine, runId, hold.reached)
    await engine.http.cancel(runId)
    hold.release()
    await videoFinished(engine, runId)
    assertEnded(await readVideo(engine, runId), 'cancelled', [
      ...PLANNED,
      ...STILLS,
      'stage.started video',
      ...TAKES(6),
      'run.finished cancelled',
    ])
  } finally {
    hold.release()
    await engine.stop()
  }
})

test(title('a take failing'), async () => {
  // Each of shot 3's three clips carries music: each fails Gate 3, and Gates 4 and 5 still run
  // (S-072). Shot 3 is made from words, so a hold cannot cure it, and the shot's three failed takes
  // stop the reel (reel-takes, S-090, S-099: it was shot 2's one take).
  const t3 = takes[3] as Take
  const shot3 = [t3, retake(t3, 2), retake(t3, 3)]
  const ran = await ended('r47-take', {
    media: Object.fromEntries(shot3.map((t) => [t.key, { music: true }])),
    script: videoScript(THREE_RANKS, THREE_RANKS_PICS, {
      takes: [...takes.slice(0, 3), ...shot3],
    }),
  })
  assert.equal(ran.result.rule, 'gate-3', JSON.stringify(ran.result))
  const failing = [
    'verdict 2 shot-3 accept',
    'verdict 3 shot-3 fail',
    'verdict 4 shot-3 accept',
    'verdict 5 shot-3 accept',
  ]
  assertEnded(ran, 'stopped', [
    ...PLANNED,
    ...STILLS,
    'stage.started video',
    ...TAKES(3),
    ...failing,
    ...failing,
    ...failing,
    'run.finished stopped',
  ])
})

test(title('an unclaimed mustShow unmet'), async () => {
  // Every take passes, and not one shows the meadow.
  const reconciler = Object.fromEntries(takes.map((t: Take) => [t.key, turned(t, 'show-meadow')]))
  const ran = await ended('r47-unmet', {
    script: videoScript(THREE_RANKS, THREE_RANKS_PICS, { reconciler }),
  })
  assert.equal(ran.result.rule, 'gate-5', JSON.stringify(ran.result))
  assertEnded(ran, 'stopped', [
    ...PLANNED,
    ...STILLS,
    'stage.started video',
    ...TAKES(6),
    'verdict 5 fail',
    'run.finished stopped',
  ])
})

test(title('stopped for budget in the clips stage'), async () => {
  // Check 43's run: shot 1's clip costs 250, so shot 2's narration — 250 + 34 × 0.5 = 267 — passes
  // the ceiling of 240 and is not made.
  const ran = await ended(
    'r47-budget',
    {
      renderSettings: { ...TEST_RENDER_SETTINGS, narrationRateCentsPerCharacter: 0.5 },
      video: { 'shot-1-take-1': { costCents: 250 } },
      script: videoScript(THREE_RANKS, THREE_RANKS_PICS, { takes: takes.slice(0, 2) }),
    },
    240,
  )
  assert.equal(ran.result.reason, 'budget', JSON.stringify(ran.result))
  assertEnded(ran, 'stopped', [
    ...PLANNED,
    ...STILLS,
    'stage.started video',
    ...TAKES(2),
    'run.finished stopped',
  ])
})

test(title('failed in the clips stage'), async () => {
  // The witness cannot be reached on shot 2's take, after its Gates 2 and 3 completed.
  const script = videoScript(THREE_RANKS, THREE_RANKS_PICS, { takes: takes.slice(0, 3) })
  const witness = [...(script.witness ?? [])]
  witness[4 + 2] = { throws: 'the witness is unreachable' }
  const ran = await ended('r47-failed', { script: { ...script, witness } })
  assert.match(String(ran.result.detail), /the witness is unreachable/)
  assertEnded(ran, 'failed', [
    ...PLANNED,
    ...STILLS,
    'stage.started video',
    ...TAKES(2),
    'verdict 2 shot-2 accept',
    'verdict 3 shot-2 accept',
    'run.finished failed',
  ])
})

test(title('failed in the clips stage, its BUDGET.md unreadable'), async () => {
  // The clips job reads the per-reel cap once for its attempt, as the keyframes job does (S-059): a
  // BUDGET.md that cannot be read then fails the run before any narration or clip call. The file is
  // made unreadable while the stills stage is held at its last call — after the keyframes job read it.
  const budgetMd = readFileSync(join(REPO, 'steering-ref', 'steering', 'BUDGET.md'), 'utf8')
  const hold = holding({
    call: 'structured',
    matches: (call) => call.role === 'reconciler',
    nth: 4,
  })
  const engine = await startEngine({
    worker: true,
    budgetMd,
    script: videoScript(THREE_RANKS, THREE_RANKS_PICS),
    wrapModel: hold.wrap,
  })
  try {
    const submitted = await engine.http.submit(videoRequest('r47-budget-md'))
    const runId = String(submitted.json.runId)
    await whenHeld(engine, runId, hold.reached)
    writeFileSync(String(engine.budgetPath), '# BUDGET\n\nNo table here.\n')
    hold.release()
    await videoFinished(engine, runId)
    const ran = await readVideo(engine, runId)
    assert.match(String(ran.result.detail), /Per reel, all-in/)
    assertEnded(ran, 'failed', [
      ...PLANNED,
      ...STILLS,
      'stage.started video',
      'run.finished failed',
    ])
    assert.equal(engine.narration.calls.length, 0, 'a narration was asked for with no cap')
    assert.equal(engine.video.calls.length, 0, 'a clip was asked for with no cap')
  } finally {
    hold.release()
    await engine.stop()
  }
})

test(title('stopped at Gate 7'), async () => {
  // Shot 3 is held, so its degraded event comes before Gate 7's verdict (S-058, S-069).
  const ran = await ended('r47-gate7', {
    video: HELD,
    script: videoScript(THREE_RANKS, THREE_RANKS_PICS, { cut: cutAnswer([1]) }),
  })
  assert.equal(ran.result.rule, 'gate-7', JSON.stringify(ran.result))
  assertEnded(ran, 'stopped', [
    ...PLANNED,
    ...STILLS,
    'stage.started video',
    ...TAKES(6),
    'degraded shot-3',
    'verdict 7 fail',
    'run.finished stopped',
  ])
})

test(title('failed in the assemble job'), async () => {
  // The assembler fails, with shot 3 held: a hold's four labels are written with whatever ending the
  // assemble job reaches (S-058's form), this one too — its row, its take's row, its receipt and its
  // event, before run.finished.
  const engine = await startEngine({
    worker: true,
    video: HELD,
    script: videoScript(THREE_RANKS, THREE_RANKS_PICS),
    wrapAssembler: (assembler: AssemblerPort): AssemblerPort => ({
      ready: () => assembler.ready(),
      assemble: async () => {
        throw new Error('the assembler fell over')
      },
    }),
  })
  try {
    const ran = await video(engine, videoRequest('r47-assemble'))
    assert.match(String(ran.result.detail), /the assembler fell over/)
    assertEnded(ran, 'failed', [
      ...PLANNED,
      ...STILLS,
      'stage.started video',
      ...TAKES(6),
      'degraded shot-3',
      'run.finished failed',
    ])
    const holds = holdRows(engine, ran.runId)
    assert.deepEqual(
      holds.map((h) => [h.render_id, h.shot_id, h.seconds]),
      [['a1-render', 'shot-3', 1]],
    )
    const reason = String(holds[0]?.reason)
    assert.deepEqual(
      ran.takes.map((t) => t.degradation),
      [null, null, null, reason, null, null],
    )
    assert.deepEqual(
      ran.videoReceipts.map((r) => r.degraded),
      [false, false, false, true, false, false],
    )
    assert.equal(ran.events.find((e) => e.type === 'degraded')?.reason, reason)
    assert.deepEqual((await engine.http.record(ran.runId)).json.degradations, [
      { shotId: 'shot-3', reason },
    ])
  } finally {
    await engine.stop()
  }
})

test(title('completed'), async () => {
  const ran = await ended('r47-completed', {
    video: HELD,
    script: videoScript(THREE_RANKS, THREE_RANKS_PICS),
  })
  assertEnded(ran, 'completed', [
    ...PLANNED,
    ...STILLS,
    'stage.started video',
    ...TAKES(6),
    'degraded shot-3',
    'verdict 7 accept',
    'stage.finished video',
    'run.finished completed',
  ])
})
