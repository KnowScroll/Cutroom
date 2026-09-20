import assert from 'node:assert/strict'
import { test } from 'node:test'
import { TAKES_A_SHOT } from '@cutroom/pipeline'
import { startEngine, type EngineOptions } from './engine/harness.ts'
import { killedMidVideo, takenUpVideo } from './engine/restart.ts'
import { THREE_RANKS, THREE_RANKS_PICS } from './engine/stills.ts'
import {
  clipsScript,
  described,
  retake,
  takesOf,
  videoRequest,
  videoScript,
  type Take,
  type Videoed,
} from './engine/video.ts'

// reel-takes, Slice 5 — check 22 (docs/features/reel-takes.md): the cap and the retry prompt ACROSS
// ATTEMPTS, and a held shot held again (S-092, S-098, D-024).
//
// A shot's decided takes, every attempt's, are at most three. The next take is numbered the shot's
// kept decided takes plus one, and is told EVERY kept failed take's reasons — take 1's across the
// kill, and take 1's and take 2's where two were kept. A shot whose three takes an earlier attempt
// decided and failed goes to the ladder WITH NO CALL and is held again, its labels marking the video
// receipts of those three takes, whichever attempt made them; the still_hold row carries the attempt
// that DECIDED it — the finishing job's — not the attempt its takes were made under.
//
// Shot 1 of THREE_RANKS is the holdable shot: the barons, on their chosen picture, claiming the
// presence show-crowd and no event. Its takes carry speech, so each fails Gate 3 with Gates 4 and 5
// still run — two model calls a take. Counted from 1 over every model call, the planner's two and the
// stills stage's eight come first, so take k's witness is call 11 + 2k (S-062, S-089). Each test says
// which call it holds, and what the first attempt made is asserted from its receipts before the kill.

const [t0, t1, t2, t3, t4, t5] = takesOf(THREE_RANKS) as [Take, Take, Take, Take, Take, Take]

const N = (attempt: number, unit: number) => `a${attempt}-shot-${unit}-narration`
const T = (attempt: number, unit: number, n = 1) => `a${attempt}-shot-${unit}-take-${n}`
/** Shot 1's chosen picture in THREE_RANKS: its one derived picture. */
const PIC = 'a1-shot-1-single'

/** D-008's negative audio block, typed by hand (S-071). */
const BLOCK = 'No dialogue, no speech, no music.\nnon_diegetic_music: N/A'

/** Gate 3's reason for a clip whose sound is speech, typed by hand. */
const SPEECH = '- its sound is classified as speech'

/**
 * What a retry's prompt holds that its shot's first take's does not: the lines between that prompt,
 * less the negative audio block, and the block, which must end it (S-094).
 */
function inserted(first: string, retry: string, what: string): string[] {
  assert.ok(first.endsWith(BLOCK), `the first take's prompt does not end with the block:\n${first}`)
  const head = first.slice(0, first.length - BLOCK.length)
  assert.ok(retry.endsWith(BLOCK), `${what} does not end with the negative audio block:\n${retry}`)
  assert.ok(retry.startsWith(head), `${what} is not the first take's prompt:\n${retry}`)
  return retry.slice(head.length, retry.length - BLOCK.length).split('\n')
}

/** How many takes of each shot were DECIDED across every attempt: a take a crash cut off is not one. */
function decidedPerShot(ran: Videoed): number[] {
  const counts = [0, 0, 0, 0, 0, 0]
  for (const row of ran.takes) {
    if (row.outcome !== null) counts[row.shot_unit] = (counts[row.shot_unit] ?? 0) + 1
  }
  return counts
}

interface Again {
  ran: Videoed
  /** The second worker's calls, in order. */
  videoCalls: string[]
  narrationCalls: string[]
  /** What each call the second worker made was asked with, by take id. */
  prompts: Map<string, string>
}

/**
 * One video run killed at `holdAtCall` in its clips stage and taken up by a new worker, read before
 * its engine is stopped. `made` is what the first attempt's receipts must hold by then.
 */
async function again(
  requestId: string,
  options: Omit<EngineOptions, 'worker' | 'script'>,
  first: {
    takes: readonly Take[]
    holdAtCall: number
    made: { narrations: readonly string[]; takes: readonly string[] }
  },
  second: readonly Take[],
): Promise<Again> {
  const engine = await startEngine({ worker: false, ...options })
  try {
    const killed = await killedMidVideo(engine, videoRequest(requestId), {
      script: videoScript(THREE_RANKS, THREE_RANKS_PICS, { takes: [...first.takes] }),
      holdAtCall: first.holdAtCall,
      running: 'reel.clips',
      made: first.made,
    })
    assert.equal(killed.before.job.attempts, 1)
    const ran = await takenUpVideo(engine, killed, clipsScript([...second]))
    return {
      ran,
      videoCalls: engine.video.calls.map((c) => c.takeId),
      narrationCalls: engine.narration.calls.map((c) => c.narrationId),
      prompts: new Map(engine.video.calls.map((c) => [c.takeId, c.prompt])),
    }
  } finally {
    await engine.stop()
  }
}

/** A take's prompt as its row records it: what the call that made it was asked with. */
function promptOf(ran: Videoed, takeId: string): string {
  const row = ran.takes.find((t) => t.take_id === takeId)
  assert.ok(row !== undefined, `no row for ${takeId}`)
  return row.prompt
}

const CHECK_22 =
  "22. a first attempt killed with a shot's first take failed and its second cut off: the second attempt makes that shot's take 2, told take 1's reasons; killed with two failed: one more take; killed after a held shot's three: that shot is held again with no call, its labels marking the three receipts, whichever attempt made them; and no shot's decided takes pass three across the attempts"

// ---------------------------------------------------------------- 22

test(`${CHECK_22} — one failed and one cut off: take 2, told take 1's reasons`, async () => {
  // Held at call 15, shot 1's take 2's witness: its take 1 carried speech and failed Gate 3, and its
  // take 2 was made, measured and heard and never seen.
  const ran = await again(
    'r22-one-failed',
    { media: { 'shot-1-take-1': { speech: true } } },
    {
      takes: [t0, t1, retake(t1, 2)],
      holdAtCall: 15,
      made: { narrations: [N(1, 0), N(1, 1)], takes: [T(1, 0), T(1, 1), T(1, 1, 2)] },
    },
    [retake(t1, 2), t2, t3, t4, t5],
  )
  assert.equal(ran.ran.result.status, 'completed', JSON.stringify(ran.ran.result))

  // The second attempt makes that shot's TAKE 2 — its kept decided takes plus one — and no take 1.
  assert.deepEqual(ran.videoCalls, [T(2, 1, 2), T(2, 2), T(2, 3), T(2, 4), T(2, 5)])
  const made = ran.ran.takes.find((t) => t.take_id === T(2, 1, 2))
  assert.equal(made?.number, 2, "the take made in the second attempt is not its shot's take 2")

  // Told take 1's reasons, across the kill: the first take's prompt with that take's Gate 3 reason
  // inserted before the negative audio block (S-094).
  const retry = ran.prompts.get(T(2, 1, 2))
  assert.ok(retry !== undefined, 'shot 1 was not asked for again')
  const lines = inserted(promptOf(ran.ran, T(1, 1)), retry, "the second attempt's take 2")
  assert.equal(lines[0], '', 'the reasons are not set off by a blank line')
  const intro = lines[1] ?? ''
  assert.match(
    intro,
    /failed/i,
    `the line before the reasons does not say the takes failed: ${intro}`,
  )
  assert.deepEqual(lines, ['', intro, 'Take 1:', 'Gate 3:', SPEECH, ''])

  // No shot's decided takes pass three across the attempts: shot 1 decided two — the kept failure
  // and the take made in the cut-off one's place, which is not a decided take.
  assert.deepEqual(decidedPerShot(ran.ran), [1, 2, 1, 1, 1, 1])
  assert.ok(
    decidedPerShot(ran.ran).every((count) => count <= TAKES_A_SHOT),
    'a shot decided more than three takes across the attempts',
  )
})

test(`${CHECK_22} — two failed and one cut off: one more take, told both their reasons`, async () => {
  // Held at call 17, shot 1's take 3's witness: its takes 1 and 2 both carried speech and failed
  // Gate 3, and its take 3 was made and never seen.
  const ran = await again(
    'r22-two-failed',
    { media: { 'shot-1-take-1': { speech: true }, 'shot-1-take-2': { speech: true } } },
    {
      takes: [t0, t1, retake(t1, 2), retake(t1, 3)],
      holdAtCall: 17,
      made: {
        narrations: [N(1, 0), N(1, 1)],
        takes: [T(1, 0), T(1, 1), T(1, 1, 2), T(1, 1, 3)],
      },
    },
    [retake(t1, 3), t2, t3, t4, t5],
  )
  assert.equal(ran.ran.result.status, 'completed', JSON.stringify(ran.ran.result))

  // ONE MORE TAKE, numbered 3: the shot's two kept failed takes plus one.
  assert.deepEqual(ran.videoCalls, [T(2, 1, 3), T(2, 2), T(2, 3), T(2, 4), T(2, 5)])
  assert.equal(ran.ran.takes.find((t) => t.take_id === T(2, 1, 3))?.number, 3)

  // Told EVERY kept failed take's reasons, each under its take (D-047, S-094).
  const retry = ran.prompts.get(T(2, 1, 3))
  assert.ok(retry !== undefined, 'shot 1 was not asked for again')
  const lines = inserted(promptOf(ran.ran, T(1, 1)), retry, "the second attempt's take 3")
  const intro = lines[1] ?? ''
  assert.deepEqual(lines, [
    '',
    intro,
    'Take 1:',
    'Gate 3:',
    SPEECH,
    'Take 2:',
    'Gate 3:',
    SPEECH,
    '',
  ])

  assert.deepEqual(decidedPerShot(ran.ran), [1, 3, 1, 1, 1, 1])
  assert.ok(
    decidedPerShot(ran.ran).every((count) => count <= TAKES_A_SHOT),
    'a shot decided more than three takes across the attempts',
  )
})

test(`${CHECK_22} — three kept failed takes: held again with no call, marking their receipts`, async () => {
  // Held at call 19, shot 2's take 1's witness: shot 1's three takes all carried speech and failed
  // Gate 3, so the first attempt held it and went on; shot 2's take was cut off.
  const ran = await again(
    'r22-held-again',
    {
      media: {
        'shot-1-take-1': { speech: true },
        'shot-1-take-2': { speech: true },
        'shot-1-take-3': { speech: true },
      },
    },
    {
      takes: [t0, t1, retake(t1, 2), retake(t1, 3), t2],
      holdAtCall: 19,
      made: {
        narrations: [N(1, 0), N(1, 1), N(1, 2)],
        takes: [T(1, 0), T(1, 1), T(1, 1, 2), T(1, 1, 3), T(1, 2)],
      },
    },
    [t2, t3, t4, t5],
  )
  const { ran: run } = ran
  assert.equal(run.result.status, 'completed', JSON.stringify(run.result))

  // HELD AGAIN WITH NO CALL: the second attempt asks for no take of shot 1, and no narration of a
  // shot whose narration the first attempt finished.
  assert.deepEqual(ran.videoCalls, [T(2, 2), T(2, 3), T(2, 4), T(2, 5)])
  assert.deepEqual(ran.narrationCalls, [N(2, 3), N(2, 4), N(2, 5)])
  assert.deepEqual(
    run.takes.map((t) => t.take_id),
    [T(1, 0), T(1, 1), T(1, 1, 2), T(1, 1, 3), T(1, 2), T(2, 2), T(2, 3), T(2, 4), T(2, 5)],
  )

  // Its still_hold row: the shot, THE ATTEMPT THAT DECIDED IT — the finishing job's, not the one its
  // takes were made under — its picture, the three takes it consumed, and the reason.
  const three = [T(1, 1), T(1, 1, 2), T(1, 1, 3)]
  assert.equal(run.stillHolds.length, 1, 'not one still_hold row')
  const [held] = run.stillHolds
  assert.ok(held !== undefined)
  assert.equal(held.shot_id, 'shot-1')
  assert.equal(held.attempt, 2, 'the still_hold row does not carry the attempt that decided it')
  assert.equal(held.picture_id, PIC)
  assert.deepEqual(held.take_ids, three)
  assert.match(held.reason, new RegExp(`is held on its approved picture ${PIC}`))
  for (const takeId of three) {
    assert.ok(held.reason.includes(takeId), `the reason does not name ${takeId}: ${held.reason}`)
  }

  // Its labels mark the video receipt of each of its three takes, WHICHEVER ATTEMPT MADE THEM — all
  // three the first attempt's — and no other receipt of the run.
  assert.deepEqual(
    run.videoReceipts.filter((r) => r.degraded).map((r) => r.take_id),
    three,
  )
  // And the third of them carries the reason on its row, and no other take does.
  assert.deepEqual(
    run.takes.filter((t) => t.degradation !== null).map((t) => [t.take_id, t.degradation]),
    [[T(1, 1, 3), held.reason]],
  )

  // Its degraded event is among the finishing attempt's, after its third take's verdicts (S-098).
  const events = described(run.events)
  const degraded = events.indexOf('degraded shot-1')
  assert.ok(degraded > 0, `no degraded event for shot 1: ${events.join(', ')}`)
  assert.equal(events[degraded - 1], 'verdict 5 shot-1 accept')
  assert.equal(events[degraded + 1], 'verdict 2 shot-2 accept')
  assert.deepEqual(
    (run.result.degradations as Array<{ shotId: string; reason: string }>).map((d) => d.shotId),
    ['shot-1'],
  )

  // Three decided takes for the held shot, and no shot passes three across the attempts.
  assert.deepEqual(decidedPerShot(run), [1, 3, 1, 1, 1, 1])
  assert.ok(
    decidedPerShot(run).every((count) => count <= TAKES_A_SHOT),
    'a shot decided more than three takes across the attempts',
  )
})
