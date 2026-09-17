import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { FakeVideoEntry } from '@cutroom/providers'
import { TEST_RENDER_SETTINGS, startEngine } from './engine/harness.ts'
import { NO_RECURRENCE } from './engine/stills.ts'
import { video, videoRequest, videoScript, type TakeRow, type Videoed } from './engine/video.ts'

// reel-render, Slice 3 — check 21 (docs/features/reel-render.md): Gate 2, technical, on a take (S-072).
// The media port MEASURES THE FILE the stand-in wrote (I-17): ffprobe for its streams and shape, and
// one ffmpeg pass of blackdetect and freezedetect handed the shortest stretches Gate 2 fails for. A
// take failing Gate 2 has no later gate — nothing to witness in a file that cannot be measured as a
// clip (S-031's reason) — and stops the run. What a real clip is conformed for later — its length,
// its frame rate, its sample rate, a missing sound — is recorded and fails nothing.
//
// freezedetect measures a freeze a few frames short (a two-second freeze reads about 1.83 s, three
// quarters of a second about 0.58 s, at 24 frames a second), so every stretch here keeps a margin
// from the threshold it is held to.

/** A run of the plan that places no picture, its first take built as the script says. */
async function firstTake(
  entry: FakeVideoEntry,
  over: { technical?: typeof TEST_RENDER_SETTINGS.technical } = {},
) {
  const engine = await startEngine({
    worker: true,
    script: videoScript(NO_RECURRENCE, []),
    video: { 'shot-0-take-1': entry },
    ...(over.technical === undefined
      ? {}
      : { renderSettings: { ...TEST_RENDER_SETTINGS, technical: over.technical } }),
  })
  try {
    return { engine, ran: await video(engine, videoRequest('r21')) }
  } catch (error) {
    await engine.stop()
    throw error
  }
}

/** The take failed Gate 2 alone: one verdict, no witness or reconciler looked at it, and the run stopped. */
function failedGate2(
  ran: Videoed,
  engine: Awaited<ReturnType<typeof firstTake>>['engine'],
  why: RegExp,
  what: string,
) {
  assert.equal(ran.result.status, 'stopped', `${what}: ${JSON.stringify(ran.result)}`)
  assert.equal(ran.result.reason, 'rule', what)
  assert.equal(ran.result.rule, 'gate-2', what)
  assert.equal(ran.result.step, 'video', what)
  assert.equal(ran.takes.length, 1, `${what}: a later take was made`)
  const take = ran.takes[0] as TakeRow
  assert.deepEqual(
    take.verdicts.map((v) => [v.gate, v.outcome]),
    [['2', 'fail']],
    `${what}: the take reached a gate after Gate 2`,
  )
  assert.equal(take.outcome, 'fail', `${what}: the take's outcome`)
  assert.ok(
    take.verdicts[0]?.reasons.some((r) => why.test(r)),
    `${what}: Gate 2 failed for another reason: ${take.verdicts[0]?.reasons.join(' | ')}`,
  )
  assert.equal(engine.model.observeClipCalls.length, 0, `${what}: the witness looked at the clip`)
  assert.equal(
    engine.model.calls.filter((c) => c.role === 'reconciler').length,
    0,
    `${what}: the reconciler was asked about the take`,
  )
  assert.equal(ran.takeObservations.length, 0, what)
  assert.equal(ran.takeReconciliations.length, 0, what)
}

// ---------------------------------------------------------------- 21

test('21. Gate 2, measuring the file the stand-in wrote, fails a take for each of unreadable bytes, no video stream, a 16:9 picture, a black second and a frozen two seconds, each built alone, with no later gate and no observe or reconcile call', async () => {
  const faults: ReadonlyArray<readonly [string, FakeVideoEntry, RegExp]> = [
    ['unreadable bytes', { unreadable: true }, /not readable/i],
    ['no video stream', { without: 'video' }, /no video/i],
    ['a 16:9 picture', { size: { width: 192, height: 108 } }, /9\/16|9:16/],
    ['a black second', { black: { atSeconds: 2, seconds: 1 } }, /black/i],
    ['a frozen two seconds', { frozen: { atSeconds: 2, seconds: 2 } }, /frozen/i],
  ]
  for (const [what, entry, why] of faults) {
    const { engine, ran } = await firstTake(entry)
    try {
      failedGate2(ran, engine, why, what)
    } finally {
      await engine.stop()
    }
  }
})

test('21. Gate 2 passes a quarter second of black and three quarters of a second frozen at the default thresholds, and fails those two once blackSeconds is 0.2 and frozenSeconds 0.4', async () => {
  assert.deepEqual(TEST_RENDER_SETTINGS.technical, {
    aspectTolerance: 0.01,
    blackSeconds: 0.5,
    frozenSeconds: 1.0,
  })
  const black: FakeVideoEntry = { black: { atSeconds: 2, seconds: 0.25 } }
  const frozen: FakeVideoEntry = { frozen: { atSeconds: 2, seconds: 0.75 } }

  // At the defaults, both pass: every take of the run passes Gate 2 and the stage completes.
  const engine = await startEngine({
    worker: true,
    script: videoScript(NO_RECURRENCE, []),
    video: { 'shot-0-take-1': black, 'shot-1-take-1': frozen },
  })
  try {
    const ran = await video(engine, videoRequest('r21-defaults'))
    assert.ok(
      ran.jobs.some((j) => j.kind === 'reel.assemble'),
      `the clips stage did not complete: ${JSON.stringify(ran.result)}`,
    )
    for (const take of ran.takes.slice(0, 2)) {
      assert.equal(take.verdicts[0]?.gate, '2')
      assert.equal(
        take.verdicts[0]?.outcome,
        'accept',
        `${take.take_id}: ${take.verdicts[0]?.reasons}`,
      )
    }
  } finally {
    await engine.stop()
  }

  // Held to shorter stretches, each fails alone.
  const technical = { aspectTolerance: 0.01, blackSeconds: 0.2, frozenSeconds: 0.4 }
  for (const [what, entry, why] of [
    ['a quarter second of black, at 0.2', black, /black/i],
    ['three quarters of a second frozen, at 0.4', frozen, /frozen/i],
  ] as const) {
    const run = await firstTake(entry, { technical })
    try {
      failedGate2(run.ran, run.engine, why, what)
      // The scan was handed the thresholds it was held to, and reported the stretch it failed for.
      const scan = run.ran.takes[0]?.scan
      const found = why.source.includes('black') ? scan?.black : scan?.frozen
      assert.ok((found ?? []).length > 0, `${what}: the scan reports no stretch`)
    } finally {
      await run.engine.stop()
    }
  }
})

test('21. Gate 2 passes a take shorter than its narration, one of another 9:16 size within the tolerance, one at another frame rate, one at another sample rate, and one with no audio stream', async () => {
  // Shot 2's narration is 3 seconds, so its clip is asked for 5; the stand-in makes 4.
  const passing: Record<string, FakeVideoEntry> = {
    'shot-0-take-1': { without: 'audio' },
    'shot-1-take-1': { size: { width: 110, height: 196 } },
    'shot-2-take-1': { seconds: 4 },
    'shot-3-take-1': { fps: 30 },
    'shot-4-take-1': { sampleRate: 44100 },
  }
  const engine = await startEngine({
    worker: true,
    script: videoScript(NO_RECURRENCE, []),
    video: passing,
  })
  try {
    const ran = await video(engine, videoRequest('r21-conformed'))
    assert.ok(
      ran.jobs.some((j) => j.kind === 'reel.assemble'),
      `the clips stage did not complete: ${JSON.stringify(ran.result)}`,
    )
    const [noAudio, other, shorter, rate, sampled] = ran.takes as [
      TakeRow,
      TakeRow,
      TakeRow,
      TakeRow,
      TakeRow,
    ]
    for (const take of [noAudio, other, shorter, rate, sampled]) {
      assert.deepEqual(
        take.verdicts[0] && [take.verdicts[0].gate, take.verdicts[0].outcome],
        ['2', 'accept'],
        `${take.take_id} failed Gate 2: ${take.verdicts[0]?.reasons.join(' | ')}`,
      )
    }

    // Each is what it was built to be, as measured — and recorded, never failing.
    assert.equal(noAudio.probe?.audio, null, 'the take with no audio stream was measured with one')
    assert.ok(noAudio.probe?.video !== null)
    assert.deepEqual(
      other.probe?.video && [other.probe.video.width, other.probe.video.height],
      [110, 196],
    )
    assert.ok(Math.abs(110 / 196 - 9 / 16) <= 0.01)
    assert.ok((shorter.probe?.durationSeconds ?? 0) < shorter.requested_seconds - 0.5)
    assert.equal(shorter.requested_seconds, 5)
    assert.equal(rate.probe?.video?.fps, 30)
    assert.equal(sampled.probe?.audio?.sampleRate, 44100)
  } finally {
    await engine.stop()
  }
})
