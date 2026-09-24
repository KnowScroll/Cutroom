import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, relative } from 'node:path'
import { test } from 'node:test'
import type { RenderManifest } from '@cutroom/contracts'
import { ffmpegAssembler, ffmpegTools } from '@cutroom/providers'
import { startEngine, type Engine } from './engine/harness.ts'
import {
  bandColours,
  bandOf,
  borderColourOf,
  edgeColour,
  measured,
  nearestColour,
  pictureColourOf,
  renderOf,
  spanStarts,
  thumbnails,
  toneDb,
  type Rgb,
} from './engine/render.ts'
import { THREE_RANKS, THREE_RANKS_PICS } from './engine/stills.ts'
import {
  CUT_QUESTIONS,
  UNIT_SENTENCES,
  retake,
  takesOf,
  video,
  videoRequest,
  videoScript,
  type Take,
  type Videoed,
} from './engine/video.ts'

// reel-takes, Slice 4 — checks 18 and 20 (docs/features/reel-takes.md): the held shot in the ONE
// PASS, measured, and the same manifest rendered again (D-025, D-054, D-055, D-059, I-17, S-073,
// S-074, S-097).
//
// A STILL-HOLD IS MEASURED, NEVER READ BACK (S-073). The stand-in picture is a solid colour keyed
// from its id, so every frame of a held span carries that colour and none the band of any of its
// three takes; a BORDERED stand-in picture — 2 pixels of another colour, which a push to 1.1 takes
// about 4.1 of the stand-in's 90 from each side — shows its border at the span's first frame and not
// at its last; the span's frames are counted in the file; and its clip tone is absent, since a held
// shot's sound is silence with its narration mixed over it.
//
// The run: THREE_RANKS, shot 1 — the barons, on its chosen picture, claiming the presence show-crowd
// — speaking on each of its three takes, so each fails Gate 3 and the shot is held on a picture the
// image stand-in is told to border. Both checks read the one run.

const PIC = 'a1-shot-1-single'
const THREE = [1, 2, 3].map((n) => `a1-shot-1-take-${n}`)

/** Spans and starts by hand, from narrations of 9, 7, 3, 3, 2 and 5 seconds at 24 frames a second. */
const SPANS = [216, 168, 72, 72, 48, 120]
const STARTS = [0, 216, 384, 456, 528, 576]
const TOTAL = 696
/** The held span: shot 1's, from 9 to 16 seconds. */
const HELD = { start: 216, frames: 168, fromSeconds: 9, seconds: 7 }

const PICTURE_COLOUR = pictureColourOf(PIC)
const BORDER_COLOUR = borderColourOf(PIC)

/** What each shot's frames carry: its take's band, and for the held shot its picture's colour. */
const SHOT_COLOURS: Array<[string, Rgb]> = [
  ['a1-shot-0-take-1', bandOf('a1-shot-0-take-1')],
  [PIC, PICTURE_COLOUR],
  ['a1-shot-2-take-1', bandOf('a1-shot-2-take-1')],
  ['a1-shot-3-take-1', bandOf('a1-shot-3-take-1')],
  ['a1-shot-4-take-1', bandOf('a1-shot-4-take-1')],
  ['a1-shot-5-take-1', bandOf('a1-shot-5-take-1')],
]

const [t0, t1, t2, t3, t4, t5] = takesOf(THREE_RANKS) as [Take, Take, Take, Take, Take, Take]

/** A completed video run whose shot 1 is held on a bordered picture, read before the engine stops. */
async function heldRun(requestId: string): Promise<{ engine: Engine; ran: Videoed }> {
  const engine = await startEngine({
    worker: true,
    images: { 'shot-1-single': { border: true } },
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

// ---------------------------------------------------------------- 18

const CHECK_18 =
  "18. the output, measured: the held shot's span is its narration's frames exactly, starting where the shot before ends; every frame of it carries its picture's colour and none the band of any of its three takes; the 2-pixel border of a bordered picture is at the span's first frame and pushed out by its last; its clip tone is absent under the narration's; and the file's frame count is the manifest's total"

test(CHECK_18, async () => {
  const { engine, ran } = await heldRun('r18')
  try {
    const row = renderOf(engine, ran.runId)
    assert.ok(row.path !== null)

    // The file's frame count is the manifest's total, measured with ffprobe.
    assert.equal(row.renderManifest.totalFrames, TOTAL)
    assert.equal(measured(row.path).frames, TOTAL)

    // The spans the FILE shows: each shot's colour begins where its span does — the held shot's is
    // its picture's, every other's its take's band.
    assert.deepEqual(spanStarts(row.path, SHOT_COLOURS), STARTS)
    const colours = bandColours(row.path)
    assert.equal(colours.length, TOTAL)
    assert.deepEqual(
      STARTS.map((start, unit) => (STARTS[unit + 1] ?? TOTAL) - start),
      SPANS,
    )
    assert.equal(HELD.start, STARTS[1])
    assert.equal(HELD.frames, SPANS[1])

    // Every frame of the held span carries the picture's colour and none of its three takes' bands.
    const bands = THREE.map((takeId) => [takeId, bandOf(takeId)] as const)
    for (let frame = HELD.start; frame < HELD.start + HELD.frames; frame += 1) {
      const colour = colours[frame] as Rgb
      const near = nearestColour(colour, [[PIC, PICTURE_COLOUR], ...bands])
      assert.equal(
        near.name,
        PIC,
        `frame ${frame} of the held span carries a take's band: ${near.distances}`,
      )
    }

    // And no frame of it is a take's: the whole span's colours are the picture's within tolerance.
    const held = colours.slice(HELD.start, HELD.start + HELD.frames)
    for (const [takeId, band] of bands) {
      const nearest = Math.min(
        ...held.map((c) => Math.hypot(c[0] - band[0], c[1] - band[1], c[2] - band[2])),
      )
      assert.ok(nearest > 80, `a frame of the held span is ${nearest.toFixed(1)} from ${takeId}`)
    }

    // The border: 2 pixels of another colour at the span's FIRST frame, pushed out by its LAST.
    const first = edgeColour(row.path, HELD.start)
    const last = edgeColour(row.path, HELD.start + HELD.frames - 1)
    const named: Array<[string, Rgb]> = [
      ['the border', BORDER_COLOUR],
      ['the picture', PICTURE_COLOUR],
    ]
    assert.equal(
      nearestColour(first, named).name,
      'the border',
      `the span's first frame has no border: ${nearestColour(first, named).distances}`,
    )
    assert.equal(
      nearestColour(last, named).name,
      'the picture',
      `the border is still at the span's last frame: ${nearestColour(last, named).distances}`,
    )

    // The clip tone is ABSENT under the narration's — AMENDED BY cut-rules (S-158), which retires
    // "shot 0's span holds both": a reel's only sound is its narration. Shot 0's CLIP FILE carries its
    // 220 Hz tone (the premise), and the reel's 220 Hz band in shot 0 is at least 30 dB below it —
    // two spans of one file are not compared, since their noise floors differ by up to 2 dB. (Shot 0
    // runs from 0 s to 9 s, the held shot from 9 s to 16 s.)
    const shotZero = row.renderManifest.shots[0]
    assert.ok(
      shotZero !== undefined && shotZero.stillHold === undefined,
      'shot 0 is not a clip shot',
    )
    const own = toneDb(shotZero.clipPath, 220)
    assert.ok(own > -30, `shot 0's clip file is ${own} dB at 220 Hz: no tone to leave out`)
    const inReel = toneDb(row.path, 220, { fromSeconds: 1, seconds: 6 })
    assert.ok(
      own - inReel >= 30,
      `220 Hz: ${inReel} dB in shot 0 against ${own} dB in its clip file — the clip's sound is in the reel`,
    )
    const spoken = toneDb(row.path, 660, {
      fromSeconds: HELD.fromSeconds + 0.5,
      seconds: HELD.seconds - 1,
    })
    assert.ok(spoken > -30, `the held shot's narration is at ${spoken} dB`)
  } finally {
    await engine.stop()
  }
})

// ---------------------------------------------------------------- 20

const THUMB = 16 * 16 * 3

/** How far two 16 × 16 colour thumbnails are: the sum of every channel's difference. */
function apart(a: Buffer, b: Buffer): number {
  assert.equal(a.length, THUMB, 'a thumbnail is not one frame')
  assert.equal(b.length, THUMB, 'a thumbnail is not one frame')
  let sum = 0
  for (let i = 0; i < THUMB; i += 1) sum += Math.abs((a[i] as number) - (b[i] as number))
  return sum
}

/**
 * WHICH FRAME OF A FILE A PICTURE IS: the nearest of its frames, by thumbnail (reel-render's check
 * 38). Inside a held span it answers to within the half-second a caption dwells — the picture is a
 * solid colour and the burned captions are not pushed with it, so two frames between one word and
 * the next are the same pixels. Across shots it is exact: the colours differ.
 */
function frameOf(all: Buffer, shown: Buffer): number {
  let best = -1
  let least = Number.POSITIVE_INFINITY
  for (let frame = 0; (frame + 1) * THUMB <= all.length; frame += 1) {
    const d = apart(shown, all.subarray(frame * THUMB, (frame + 1) * THUMB))
    if (d < least) {
      least = d
      best = frame
    }
  }
  return best
}

/** A caption's dwell in frames: the stand-in speaks a word every 500 ms, and the profile is 24. */
const DWELL = 12

/** The mean colour of a 16 × 16 colour thumbnail. */
function meanOf(thumb: Buffer): Rgb {
  const mean = [0, 1, 2].map((c) => {
    let sum = 0
    for (let i = c; i < thumb.length; i += 3) sum += thumb[i] as number
    return Math.round(sum / (thumb.length / 3))
  })
  return [mean[0] as number, mean[1] as number, mean[2] as number]
}

const CHECK_20 =
  "20. running the assembler again over the stored manifest of a render with a held shot, under another artifact root, gives the same duration, frame count and shot boundaries, measured; and Gate 7 is shown the held shot's span's first, middle and last frames"

test(CHECK_20, async () => {
  const { engine, ran } = await heldRun('r20')
  const dir = mkdtempSync(join(tmpdir(), 'reel-takes-replay-'))
  try {
    const row = renderOf(engine, ran.runId)
    assert.ok(row.path !== null)
    const before = createHash('sha256').update(readFileSync(row.path)).digest('hex')
    const firstMeasure = measured(row.path)
    const boundaries = spanStarts(row.path, SHOT_COLOURS)
    assert.deepEqual(boundaries, STARTS)

    // The replay: the STORED TEXT, parsed, and nothing else — under another artifact root, which is
    // a setting the adapter is handed and not a path in the manifest (D-086).
    const stored = JSON.parse(row.text) as RenderManifest
    assert.equal(stored.shots[1]?.stillHold?.pictureId, PIC)
    const replay = await ffmpegAssembler(ffmpegTools(), {
      artifactRoot: join(dir, 'replay'),
    }).assemble(stored)
    assert.notEqual(replay.path, row.path, 'the replay wrote over the file it is compared with')
    assert.equal(dirname(replay.path), join(dir, 'replay', ran.runId))
    assert.ok(!relative(join(dir, 'replay'), replay.path).startsWith('..'))
    assert.equal(
      createHash('sha256').update(readFileSync(row.path)).digest('hex'),
      before,
      'the first file changed',
    )

    const again = measured(replay.path)
    assert.equal(again.frames, firstMeasure.frames)
    assert.equal(again.frames, TOTAL)
    assert.ok(
      Math.abs(again.seconds - firstMeasure.seconds) < 0.001,
      `${again.seconds} s against ${firstMeasure.seconds}`,
    )
    assert.deepEqual(spanStarts(replay.path, SHOT_COLOURS), boundaries)

    // Gate 7 is shown three frames a shot, and the held shot's ARE the frames at its span's first,
    // middle and last — 216, 300 and 383 — each compared with that frame cut from the file itself.
    assert.equal(engine.model.judgeCutCalls.length, 1, 'Gate 7 is not one judgeCut call')
    const [call] = engine.model.judgeCutCalls
    assert.ok(call !== undefined)
    assert.deepEqual([...call.questions], [...CUT_QUESTIONS])
    assert.deepEqual(
      call.shots.map((s) => s.shotId),
      [0, 1, 2, 3, 4, 5].map((u) => `shot-${u}`),
    )
    const shot = call.shots[1]
    assert.ok(shot !== undefined)
    assert.equal(shot.sentences.join(' '), (UNIT_SENTENCES[1] ?? []).join(' '))
    assert.equal(shot.frames.length, 3, `the held shot has ${shot.frames.length} frames`)

    const all = thumbnails(row.path, 'rgb24')
    assert.equal(all.length, TOTAL * THUMB)
    const frameAt = (n: number) => all.subarray(n * THUMB, (n + 1) * THUMB)
    const expected = [
      HELD.start,
      HELD.start + Math.floor(HELD.frames / 2),
      HELD.start + HELD.frames - 1,
    ]
    shot.frames.forEach((frame, k) => {
      assert.equal(frame.pictureId, `a1-render-frame-${3 + k}`)
      assert.equal(readFileSync(frame.path).toString('latin1', 1, 4), 'PNG')
      const shown = thumbnails(frame.path, 'rgb24')
      const at = expected[k] as number
      // It IS that frame of the file, to within a caption's dwell — and it is far from the same
      // frame of the shot before and of the shot after, so a frame from elsewhere would fail.
      const found = frameOf(all, shown)
      assert.ok(
        Math.abs(found - at) <= DWELL,
        `${frame.pictureId} is the file's frame ${found}, not ${at} within a caption's dwell`,
      )
      const here = apart(shown, frameAt(at))
      const elsewhere = [STARTS[0] as number, STARTS[2] as number].map((n) =>
        apart(shown, frameAt(n)),
      )
      assert.ok(
        elsewhere.every((d) => d > here + 10000),
        `${frame.pictureId} is ${here} from frame ${at} and ${elsewhere.join(', ')} from another shot's`,
      )
      // And each is the held picture, not a take: its own colour, measured.
      const near = nearestColour(meanOf(shown), [
        [PIC, PICTURE_COLOUR],
        ...THREE.map((takeId) => [takeId, bandOf(takeId)] as [string, Rgb]),
      ])
      assert.equal(near.name, PIC, `${frame.pictureId} is not the held picture: ${near.distances}`)
    })

    // THE PUSH, on the frames Gate 7 was shown: the border is in the span's first and gone from its
    // last (D-025's slow push, S-097).
    const named: Array<[string, Rgb]> = [
      ['the border', BORDER_COLOUR],
      ['the picture', PICTURE_COLOUR],
    ]
    const edgeOf = (path: string) => edgeColour(path, 0)
    const firstShown = shot.frames[0]
    const lastShown = shot.frames[2]
    assert.ok(firstShown !== undefined && lastShown !== undefined)
    assert.equal(
      nearestColour(edgeOf(firstShown.path), named).name,
      'the border',
      `the first frame Gate 7 saw has no border: ${nearestColour(edgeOf(firstShown.path), named).distances}`,
    )
    assert.equal(
      nearestColour(edgeOf(lastShown.path), named).name,
      'the picture',
      `the last frame Gate 7 saw still has a border: ${nearestColour(edgeOf(lastShown.path), named).distances}`,
    )
  } finally {
    rmSync(dir, { recursive: true, force: true })
    await engine.stop()
  }
})
