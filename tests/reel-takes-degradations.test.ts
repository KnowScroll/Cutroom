import assert from 'node:assert/strict'
import { test } from 'node:test'
import { startEngine, type Engine } from './engine/harness.ts'
import { holdRows, renderOf } from './engine/render.ts'
import { DEGRADED, retake, takesOf, video, videoRequest, videoScript } from './engine/video.ts'
import type { Take, Videoed } from './engine/video.ts'

// reel-takes, Slice 4 — check 19 (docs/features/reel-takes.md): a completed run carrying BOTH kinds
// of degradation, in one order (I-4, S-069, S-073, S-098).
//
// A STILL-HOLD IS NOT A HOLD. A still-hold is a shot shown on its chosen picture because its three
// takes failed: a `still_hold` row, written by the CLIPS job, whose reason says the shot is held on
// its approved picture. A hold is a clip shorter than its narration showing its last frame for the
// rest: a `hold` row, written by the ASSEMBLE job, whose reason says a take's last frame is held.
// No shot has both, since a held shot shows no clip. Both are listed, in a completed result's
// `degradations` and in the record's, after the stills stage's: the stills', then the still-holds',
// then the latest render's holds.
//
// The run: DEGRADED — shot 2's picture failed Gate 1S with no slot left, so the stills stage
// degraded it — with shot 1 speaking on each of its three takes, so it is HELD on its chosen
// picture, and shot 3's clip two seconds under a narration of three, so it is HELD TO ITS NARRATION.

const [t0, t1, t2, t3, t4, t5] = takesOf(DEGRADED.shape) as [Take, Take, Take, Take, Take, Take]

async function bothKinds(requestId: string): Promise<{ engine: Engine; ran: Videoed }> {
  const engine = await startEngine({
    worker: true,
    sensors: DEGRADED.sensors,
    media: {
      'shot-1-take-1': { speech: true },
      'shot-1-take-2': { speech: true },
      'shot-1-take-3': { speech: true },
    },
    video: { 'shot-3-take-1': { seconds: 2 } },
    script: videoScript(DEGRADED.shape, DEGRADED.pics, {
      stills: DEGRADED.stills,
      takes: [t0, t1, retake(t1, 2), retake(t1, 3), t2, t3, t4, t5],
    }),
  })
  try {
    const ran = await video(engine, videoRequest(requestId))
    assert.equal(ran.result.status, 'completed', JSON.stringify(ran.result))
    return { engine, ran }
  } catch (error) {
    await engine.stop()
    throw error
  }
}

const CHECK_19 =
  '19. a completed run with a held shot and a clip held to its narration lists in its result degradations and in its record the stills degradations, then the still-hold, then the hold, each with its reason; the still-hold reason says the shot is held on its picture and the hold that a take last frame is held; one is a still_hold row and the other a hold row; and no shot has both'

test(CHECK_19, async () => {
  const { engine, ran } = await bothKinds('r19')
  try {
    // The three, each read from the table that holds it.
    const stills = engine
      .query<{ shot_id: string; reason: string }>(
        'SELECT shot_id, reason FROM degradation WHERE run_id = ? ORDER BY rowid',
        ran.runId,
      )
      .map((r) => ({ shotId: r.shot_id, reason: r.reason }))
    assert.deepEqual(
      stills.map((d) => d.shotId),
      ['shot-2'],
      'the fixture no longer degrades exactly shot 2 in its stills stage',
    )

    const heldOnItsPicture = ran.stillHolds
    assert.deepEqual(
      heldOnItsPicture.map((h) => [h.shot_id, h.picture_id]),
      [['shot-1', 'a1-shot-1-repair']],
      'the run does not hold exactly shot 1 on its picture',
    )
    assert.deepEqual(
      [...(heldOnItsPicture[0]?.take_ids ?? [])],
      ['a1-shot-1-take-1', 'a1-shot-1-take-2', 'a1-shot-1-take-3'],
    )

    const holds = holdRows(engine, ran.runId)
    assert.deepEqual(
      holds.map((h) => [h.render_id, h.shot_id, h.seconds]),
      [['a1-render', 'shot-3', 1]],
      'the run does not hold exactly shot 3 to its narration',
    )

    // Each reason says WHICH it is, and neither says the other's (S-098, S-073).
    const stillHoldReason = String(heldOnItsPicture[0]?.reason)
    const holdReason = String(holds[0]?.reason)
    assert.match(stillHoldReason, /shot-1 is held on its approved picture a1-shot-1-repair/)
    assert.match(stillHoldReason, /D-025/)
    assert.ok(
      !/last frame is held/.test(stillHoldReason),
      `the still-hold's reason is worded as a hold's: ${stillHoldReason}`,
    )
    assert.match(holdReason, /a1-shot-3-take-1/)
    assert.match(holdReason, /last frame is held/)
    assert.match(holdReason, /S-073/)
    assert.ok(
      !/held on its approved picture/.test(holdReason),
      `the hold's reason is worded as a still-hold's: ${holdReason}`,
    )

    // The order, in the completed result: the stills', then the still-hold, then the hold.
    const expected = [
      { shotId: 'shot-2', reason: stills[0]?.reason },
      { shotId: 'shot-1', reason: stillHoldReason },
      { shotId: 'shot-3', reason: holdReason },
    ]
    assert.deepEqual(ran.result.degradations, expected, 'the result lists them in another order')

    // And in the record's, which a caller reads from the record route.
    const record = (await engine.http.record(ran.runId)).json as Record<string, unknown>
    assert.deepEqual(record.degradations, expected, 'the record lists them in another order')

    // No shot has both: a held shot shows no clip, so it has no take to hold to its narration.
    const shots = new Map<string, string[]>()
    for (const [what, shotId] of [
      ['a still-hold', 'shot-1'],
      ['a hold', 'shot-3'],
    ] as const) {
      shots.set(shotId, [...(shots.get(shotId) ?? []), what])
    }
    for (const [shotId, both] of shots) {
      assert.equal(both.length, 1, `${shotId} has ${both.join(' and ')}`)
    }
    const manifest = renderOf(engine, ran.runId).renderManifest
    for (const shot of manifest.shots as unknown as Array<Record<string, unknown>>) {
      assert.ok(
        shot.stillHold === undefined || shot.hold === undefined || shot.hold === null,
        `${String(shot.shotId)} carries a still-hold and a hold`,
      )
    }
    assert.equal(manifest.shots[1]?.stillHold?.pictureId, 'a1-shot-1-repair')
    assert.equal(manifest.shots[1]?.hold, undefined)
    assert.equal(manifest.shots[3]?.stillHold, undefined)
    assert.equal(manifest.shots[3]?.hold?.frames, 24)
  } finally {
    await engine.stop()
  }
})
