import assert from 'node:assert/strict'
import { isAbsolute, relative } from 'node:path'
import { test } from 'node:test'
import type { RenderManifest } from '@cutroom/contracts'
import { renderManifestSchema } from '@cutroom/pipeline'
import { startEngine, type Engine } from './engine/harness.ts'
import { renderOf } from './engine/render.ts'
import { THREE_RANKS, THREE_RANKS_PICS } from './engine/stills.ts'
import {
  retake,
  takesOf,
  video,
  videoRequest,
  videoScript,
  type Take,
  type Videoed,
} from './engine/video.ts'

// reel-takes, Slice 4 — check 17 (docs/features/reel-takes.md): the render manifest of a run with a
// held shot (D-025, D-059, D-086, I-12, S-097).
//
// A held shot keeps ITS PLACE IN PLAN ORDER — none is removed (I-12) — and carries, in place of a
// take, its chosen picture's id and path, the probe the CLIPS STAGE took of that file when it held
// the shot, its three takes, its reason and the push. Its geometry comes off that stored probe and
// is never taken again: the manifest is the assembler's only input (D-059). Its verdicts are its
// picture's — Gate 1, and 1S where it ran — then its three takes', Gates 2 to 5 in order.
//
// The run: THREE_RANKS, with shot 1 — the barons, on its chosen picture, claiming the presence
// show-crowd — speaking on each of its three takes, so each fails Gate 3 and the shot is held.

const PIC = 'a1-shot-1-single'
const THREE = [1, 2, 3].map((n) => `a1-shot-1-take-${n}`)
/** Spans and starts by hand, from narrations of 9, 7, 3, 3, 2 and 5 seconds at 24 frames a second. */
const SPANS = [216, 168, 72, 72, 48, 120]
const STARTS = [0, 216, 384, 456, 528, 576]
const TOTAL = 696

const takes = [
  'shot-0-take-1',
  'shot-1-take-1',
  'shot-1-take-2',
  'shot-1-take-3',
  'shot-2-take-1',
  'shot-3-take-1',
  'shot-4-take-1',
  'shot-5-take-1',
]

const [t0, t1, t2, t3, t4, t5] = takesOf(THREE_RANKS) as [Take, Take, Take, Take, Take, Take]

/** A completed video run whose shot 1 is held on its picture, read before the engine is stopped. */
async function heldRun(requestId: string): Promise<{ engine: Engine; ran: Videoed }> {
  const engine = await startEngine({
    worker: true,
    media: {
      'shot-1-take-1': { speech: true },
      'shot-1-take-2': { speech: true },
      'shot-1-take-3': { speech: true },
    },
    script: videoScript(THREE_RANKS, THREE_RANKS_PICS, {
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

const CHECK_17 =
  '17. the render manifest of a run with a held shot holds, in its place in plan order, a still-hold shot — its picture id and path under the artifact root, the probe of that file the stage took when it held the shot, its three takes, its reason and the push — with its picture verdicts then its three takes and no clip field; every other shot as it would be without it; and it parses under its schema'

test(CHECK_17, async () => {
  const { engine, ran } = await heldRun('r17')
  try {
    const row = renderOf(engine, ran.runId)
    const manifest = row.renderManifest

    // Every shot of the plan, in plan order, none removed (I-12).
    assert.deepEqual(
      manifest.shots.map((s) => s.shotId),
      [0, 1, 2, 3, 4, 5].map((u) => `shot-${u}`),
    )
    assert.deepEqual(
      manifest.shots.map((s) => s.frames),
      SPANS,
    )
    assert.deepEqual(
      manifest.shots.map((s) => s.startFrame),
      STARTS,
    )
    assert.equal(manifest.totalFrames, TOTAL)
    assert.deepEqual(
      manifest.shots.map((s) => s.stillHold !== undefined),
      [false, true, false, false, false, false],
    )

    // The held shot, in its place: its picture, that file's probe, its three takes, its reason, the push.
    const held = manifest.shots[1]
    assert.ok(held?.stillHold !== undefined, 'shot 1 is not a still-hold shot')
    assert.equal(held.stillHold.pictureId, PIC)
    assert.deepEqual([...held.stillHold.takeIds], THREE)
    assert.equal(held.stillHold.endZoom, 1.1, 'the push is not RenderSettings.stillPush.endZoom')

    // The path is the picture's own file, under the artifact root and not a URL (D-059, D-086).
    const [picture] = engine.query<{ path: string }>(
      'SELECT path FROM picture WHERE run_id = ? AND picture_id = ?',
      ran.runId,
      PIC,
    )
    assert.equal(held.stillHold.path, picture?.path)
    assert.ok(held.stillHold.path.endsWith('.png'))
    assert.ok(isAbsolute(held.stillHold.path))
    assert.ok(
      !relative(engine.artifactRoot, held.stillHold.path).startsWith('..'),
      `${held.stillHold.path} is not under ${engine.artifactRoot}`,
    )
    assert.ok(!/^[a-z]+:\/\//.test(held.stillHold.path), 'the path is a URL')

    // The probe is the one the CLIPS STAGE stored on the still_hold row, not one taken again: the
    // stand-in's picture, ffprobed — a 90 × 160 png at 25, one frame, no sound.
    const [stored] = ran.stillHolds
    assert.ok(stored !== undefined, 'no still_hold row')
    assert.equal(stored.shot_id, 'shot-1')
    assert.deepEqual(held.stillHold.probe, { ...stored.probe })
    assert.deepEqual(
      { ...held.stillHold.probe },
      {
        readable: true,
        durationSeconds: 0,
        video: { codec: 'png', width: 90, height: 160, fps: 25, frames: 1 },
        audio: null,
        moovFirst: null,
      },
    )
    assert.equal(held.stillHold.degradation, stored.reason)
    assert.match(held.stillHold.degradation, /is held on its approved picture a1-shot-1-single/)

    // No clip field on it, each one absent.
    for (const field of [
      'takeId',
      'requestId',
      'expandedPrompt',
      'clipPath',
      'opening',
      'clip',
      'pictureFrames',
      'hold',
    ]) {
      assert.equal(
        (held as unknown as Record<string, unknown>)[field],
        undefined,
        `the still-hold shot carries ${field}`,
      )
    }

    // Its verdicts: its picture's — Gate 1, and 1S where it ran — then its three takes', Gates 2 to
    // 5 in order, each take's four. Its picture is derived, so Gate 1S ran.
    assert.deepEqual(
      held.verdicts.map((v) => `${v.gate} ${v.outcome}`),
      [
        '1 accept',
        '1S accept',
        ...THREE.flatMap(() => ['2 accept', '3 fail', '4 accept', '5 accept']),
      ],
    )
    for (const verdict of held.verdicts) {
      assert.notEqual(verdict.coverage, undefined, `${verdict.gate} has no coverage`)
    }

    // Every other shot as it would be without it: its accepted take, its opening, no stillHold.
    manifest.shots.forEach((shot, unit) => {
      if (unit === 1) return
      assert.equal(shot.takeId, `a1-shot-${unit}-take-1`, `${shot.shotId}'s take`)
      assert.equal(shot.stillHold, undefined, `${shot.shotId} carries a stillHold`)
      assert.equal(shot.joinMode, 'cut')
      assert.ok(shot.clip?.video !== null && shot.clip !== undefined, `${shot.shotId}'s measure`)
      assert.equal(
        shot.opening?.kind,
        unit <= 2 ? 'keyframe' : 'text-to-video',
        `${shot.shotId}'s opening`,
      )
    })
    assert.equal(held.joinMode, 'cut')
    assert.equal(held.narrationId, 'a1-shot-1-narration')
    assert.ok(held.words.length > 0, 'the held shot has no word timings')

    // Its conform notes are the pad and the silence, as any shot's are (D-055): the stand-in's
    // 90 × 160 picture fits this profile exactly, so no pad; a picture has no sound, so silence. NO
    // FRAME-RATE NOTE — nothing is converted, though ffprobe calls a PNG 25 a second (S-105).
    assert.deepEqual(held.conform, ['silence: the clip has no sound, so silence is added'])
    assert.deepEqual(manifest.shots[0]?.conform, [], "a default clip's notes")

    // And it parses under its schema, as the row stores it.
    const parsed = renderManifestSchema.safeParse(JSON.parse(row.text) as RenderManifest)
    assert.ok(
      parsed.success,
      `the stored manifest was refused: ${(parsed.error?.issues ?? [])
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join(', ')}`,
    )

    // The run made exactly the takes the hold implies, and no later take of the held shot.
    assert.deepEqual(
      ran.takes.map((t) => t.take_id),
      takes.map((k) => `a1-${k}`),
    )
  } finally {
    await engine.stop()
  }
})
