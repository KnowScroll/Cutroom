import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { test } from 'node:test'
import { TEST_RENDER_SETTINGS, startEngine } from './engine/harness.ts'
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

// reel-takes, Slice 5 — check 24 (docs/features/reel-takes.md): a budget stop ACROSS ATTEMPTS
// (S-036, S-087, S-092). Every attempt's cost stays on the one job row and is counted by every guard,
// so what an earlier attempt spent can leave the next attempt's call above the caller's ceiling. Kept
// work is not bought again, and so is not guarded; the take a crash cut off IS bought again.
//
// ONE SHAPE, TWO RUNS. Both kill their first worker at model call 11 — the planner's two calls, the
// stills stage's eight, then shot 0's take 1's WITNESS — with that take scripted to cost 210, so it
// is made, measured and heard and never seen: cut off inside its gates. Shot 0's narration is
// finished, so the second attempt does not speak it again and its next call is that take, made again.
//
// The figures, by hand: shot 0's narration is 9 seconds, so its clip asks for 9, which is 36 at the
// default video rate of 4 cents a second; that narration is 82 characters. The plan's estimate is 220.
//
// - the clip guard, under a ceiling of 240: the take made again would be 210 + 36 = 246, and is not
//   made — the second attempt makes no call at all;
// - the narration guard, under a ceiling of 250 at 0.5 cents a character: that take is made, 246
//   being under it, and shot 1's narration — 83 characters, 41.5 — would be 252, and is not spoken.

const takes = takesOf(THREE_RANKS)
const [t0] = takes as [Take]

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

interface Stopped {
  ran: Videoed
  narrationCalls: string[]
  videoCalls: string[]
  questioned: boolean
}

/**
 * One run whose first attempt's shot-0 clip costs 210, killed at that take's witness and taken up by
 * a new worker whose attempt stops for budget under `ceilingCents`.
 */
async function stoppedAgain(
  requestId: string,
  ceilingCents: number,
  narrationRateCentsPerCharacter: number,
  second: readonly Take[],
): Promise<Stopped> {
  const engine = await startEngine({
    worker: false,
    renderSettings: { ...TEST_RENDER_SETTINGS, narrationRateCentsPerCharacter },
    video: { [T(1, 0)]: { costCents: 210 } },
  })
  try {
    const killed = await killedMidVideo(engine, videoRequest(requestId, ceilingCents), {
      script: videoScript(THREE_RANKS, THREE_RANKS_PICS, { takes: [t0] }),
      holdAtCall: 11,
      running: 'reel.clips',
      made: { narrations: [N(1, 0)], takes: [T(1, 0)] },
    })
    assert.equal(killed.before.job.cost_cents, 210, "the first attempt's spend")
    const ran = await takenUpVideo(engine, killed, clipsScript([...second]))
    return {
      ran,
      narrationCalls: engine.narration.calls.map((c) => c.narrationId),
      videoCalls: engine.video.calls.map((c) => c.takeId),
      questioned: existsSync(engine.questionsPath),
    }
  } finally {
    await engine.stop()
  }
}

const CHECK_24 =
  "24. when the first attempt's spend leaves the second attempt's next call above the ceiling, the run stops for budget — for the cut-off take made again, and, once that is made, for the next shot's narration"

// ---------------------------------------------------------------- 24

test(`${CHECK_24} — the cut-off take made again`, async () => {
  const stop = await stoppedAgain('r24-clip', 240, 0, [])
  const { ran } = stop

  assert.deepEqual(ran.result, {
    contractVersion: 1,
    runId: ran.runId,
    requestId: 'r24-clip',
    costCents: 210,
    status: 'stopped',
    reason: 'budget',
    limit: 'ceiling',
    estimateCents: 246,
    ceilingCents: 240,
    capCents: 300,
  })

  // Shot 0's narration is KEPT, so it is not spoken again and not guarded; the refused call is its
  // take, made again — the second attempt makes nothing at all.
  assert.deepEqual(stop.narrationCalls, [])
  assert.deepEqual(stop.videoCalls, [])
  assert.deepEqual(
    ran.narrations.map((n) => n.narration_id),
    [N(1, 0)],
  )
  assert.deepEqual(
    ran.takes.map((t) => [t.take_id, t.verdicts.map((v) => v.gate), t.outcome]),
    [[T(1, 0), ['2', '3'], null]],
  )
  assert.deepEqual(
    ran.videoReceipts.map((r) => [r.take_id, r.cost_cents]),
    [[T(1, 0), 210]],
  )
  assert.deepEqual(
    ran.speechReceipts.map((r) => [r.narration_id, r.cost_cents]),
    [[N(1, 0), 0]],
  )
  assert.deepEqual(described(ran.events), [
    ...PLANNED,
    ...STILLS,
    'stage.started video',
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
  assert.equal(stop.questioned, false, 'a stop at the ceiling wrote a question')
})

test(`${CHECK_24} — and, once that is made, the next shot's narration`, async () => {
  const stop = await stoppedAgain('r24-narration', 250, 0.5, [t0])
  const { ran } = stop

  assert.deepEqual(ran.result, {
    contractVersion: 1,
    runId: ran.runId,
    requestId: 'r24-narration',
    costCents: 210,
    status: 'stopped',
    reason: 'budget',
    limit: 'ceiling',
    estimateCents: 252,
    ceilingCents: 250,
    capCents: 300,
  })

  // The cut-off take is made again — 246, under the ceiling — and the NEXT shot's narration is
  // refused, shot 0's having been kept.
  assert.deepEqual(stop.videoCalls, [T(2, 0)])
  assert.deepEqual(stop.narrationCalls, [])
  assert.deepEqual(
    ran.narrations.map((n) => n.narration_id),
    [N(1, 0)],
  )
  assert.deepEqual(
    ran.takes.map((t) => [t.take_id, t.verdicts.map((v) => v.gate), t.outcome]),
    [
      [T(1, 0), ['2', '3'], null],
      [T(2, 0), ['2', '3', '4', '5'], 'accept'],
    ],
  )
  assert.deepEqual(
    ran.videoReceipts.map((r) => [r.take_id, r.cost_cents]),
    [
      [T(1, 0), 210],
      [T(2, 0), 0],
    ],
  )
  assert.deepEqual(described(ran.events), [
    ...PLANNED,
    ...STILLS,
    'stage.started video',
    ...['2', '3', '4', '5'].map((gate) => `verdict ${gate} shot-0 accept`),
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
  assert.equal(stop.questioned, false, 'a stop at the ceiling wrote a question')
})
