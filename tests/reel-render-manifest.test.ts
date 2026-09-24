import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync, mkdtempSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { isAbsolute, join, relative } from 'node:path'
import { test } from 'node:test'
import { renderManifest, renderManifestSchema } from '@cutroom/pipeline'
import { ffmpegAssembler, ffmpegMedia, ffmpegTools } from '@cutroom/providers'
import { TEST_RENDER_SETTINGS, startEngine, type Engine } from './engine/harness.ts'
import {
  THREE_SHOTS,
  bandColours,
  holdRows,
  narrationRow,
  renderOf,
  shotStarts,
  takeRow,
  thumbnails,
} from './engine/render.ts'
import { DEGRADED, described, takeOf, video, videoRequest, videoScript } from './engine/video.ts'

// reel-render, Slice 4 — checks 29, 30 and 35 (docs/features/reel-render.md): the render manifest, and
// spans, trims and holds (S-073). The manifest is built by code from the run's rows, validated by its
// schema, and written with its hash on the render row before the assembler is called; a shot's span is
// its measured narration in frames, rounded up, starting where the last ends; a longer clip is trimmed
// with no label, and a shorter one holds its last frame, labelled in four places (I-4, S-058's form).
//
// Spans and starts are asserted TWICE: as the manifest states them, and as the output file shows them
// — the frame at which each take's band begins (S-073: measured, not read back).

// ---------------------------------------------------------------- the rows, by hand

const SETTINGS = {
  ...TEST_RENDER_SETTINGS,
  // Not the default's id: a manifest that records a constant rather than the profile that ran is caught.
  gateProfile: { id: 'phase-1-as-handed', gates: TEST_RENDER_SETTINGS.gateProfile.gates },
}

const WORDS = [
  ['a', 'charter', 'was', 'sealed', 'at', 'Runnymede.'],
  ['The', 'pope', 'annulled', 'it.'],
  ['Three', 'clauses', 'are', 'still', 'law', 'in', 'England', 'today.'],
]

const STILLS_REASON = 'a1-shot-2-single failed Gate 1S and no reserve slot is free'

/**
 * Three shots: shot 0 opens on its chosen picture, shot 1 was never given one, shot 2's was degraded.
 * Narrations of 3.2, 2 and 4 seconds are 76.8, 48 and 96 frames at 24 a second — spans of 77, 48 and
 * 96, starting at 0, 77 and 125. Every clip is 5 seconds unless `clips` says otherwise.
 */
function rows(over: { narrations?: number[]; clips?: number[] } = {}) {
  const narrations = over.narrations ?? [3.2, 2, 4]
  const clips = over.clips ?? [5, 5, 5]
  return {
    runId: 'run-1',
    attempt: 1,
    plan: THREE_SHOTS,
    request: videoRequest('pure'),
    stills: [
      {
        pictureId: 'a1-shot-0-a',
        shotUnit: 0,
        verdicts: [{ gate: '1', outcome: 'accept' as const, coverage: 'full' }],
      },
    ],
    degradations: [{ shotId: 'shot-2', reason: STILLS_REASON }],
    takes: [
      takeRow(0, clips[0] ?? 5, { mode: 'image-to-video', pictureId: 'a1-shot-0-a' }),
      takeRow(1, clips[1] ?? 5),
      takeRow(2, clips[2] ?? 5, { degraded: true }),
    ],
    narrations: WORDS.map((words, unit) => narrationRow(unit, narrations[unit] ?? 0, words)),
    // No shot of this fixture is held on its picture: a still-hold shot is reel-takes' (S-097, S-099).
    stillHolds: [],
    ledger: { imageCents: 12, narrationCents: 1, videoCents: 30 },
  }
}

// ---------------------------------------------------------------- 29, 30: the run both read

const TAKES = [0, 1, 2, 3, 4, 5].map((unit) => `a1-shot-${unit}-take-1`)

/**
 * DEGRADED's run — shots 0 and 1 open on chosen pictures, shot 2's picture was degraded, shots 3 to 5
 * were never given one — with costs scripted so the ledger is not zeros, shot 2's narration 3.06
 * seconds so a span is rounded UP (73.44 frames: 74), and two clips shorter than their narrations:
 * shot 0's is 6 seconds under 9, held 3; shot 3's is 2 seconds under 3, held 1.
 */
async function heldRun(requestId: string) {
  const engine = await startEngine({
    worker: true,
    sensors: DEGRADED.sensors,
    images: { 'shot-0-a': { costCents: 6 } },
    narration: { 'shot-1-narration': { costCents: 2 }, 'shot-2-narration': { wordMs: 310 } },
    video: {
      'shot-0-take-1': { seconds: 6 },
      'shot-3-take-1': { seconds: 2 },
      'shot-4-take-1': { costCents: 4 },
    },
    script: videoScript(DEGRADED.shape, DEGRADED.pics, { stills: DEGRADED.stills }),
    renderSettings: SETTINGS,
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

const SPANS = [216, 168, 74, 72, 48, 120]
const STARTS = [0, 216, 384, 458, 530, 578]
const TOTAL = 698

/** The reason the stills stage gave for degrading shot 2, read from its own table. */
function stillsReason(engine: Engine, runId: string): string {
  const [row] = engine.query<{ shot_id: string; reason: string }>(
    'SELECT shot_id, reason FROM degradation WHERE run_id = ?',
    runId,
  )
  assert.equal(row?.shot_id, 'shot-2', 'the fixture no longer degrades shot 2')
  return String(row?.reason)
}

// ---------------------------------------------------------------- 29

test("29. a completed run's render manifest holds every shot of the selected plan in plan order, none removed, each with its take, its narration, join mode cut, an opening that is its chosen picture, text-to-video unplaced for a shot the plan gave no picture, or text-to-video placed with its reason for a degraded shot, its conform notes and every verdict decided before assembly with coverage; and the profile, the gate profile, the caption style and the cost ledger; every path in it is under the artifact root and none is a URL; it parses under its schema; the render row's hash is its hash", async () => {
  const { engine, ran } = await heldRun('r29')
  try {
    const row = renderOf(engine, ran.runId)
    const manifest = row.renderManifest
    assert.equal(manifest.runId, ran.runId)
    assert.equal(manifest.renderId, 'a1-render')
    assert.equal(row.render_id, 'a1-render')

    // Every shot of the selected plan, in plan order, none removed (I-12).
    assert.deepEqual(
      manifest.shots.map((s) => s.shotId),
      ['shot-0', 'shot-1', 'shot-2', 'shot-3', 'shot-4', 'shot-5'],
    )
    manifest.shots.forEach((shot, unit) => {
      const take = takeOf(ran, `shot-${unit}-take-1`)
      const narration = ran.narrations[unit]
      assert.ok(narration !== undefined)
      assert.equal(shot.joinMode, 'cut', `${shot.shotId} has no join mode cut`)
      assert.equal(shot.takeId, `a1-shot-${unit}-take-1`)
      assert.equal(shot.takeId, take.take_id)
      assert.equal(shot.clipPath, take.path, `${shot.shotId}'s clip is not its take's file`)
      assert.equal(shot.requestId, take.request_id)
      assert.equal(shot.expandedPrompt, take.expanded_prompt)
      assert.deepEqual(shot.clip, take.probe, `${shot.shotId}'s measured facts are not its take's`)
      assert.equal(shot.narrationId, `a1-shot-${unit}-narration`)
      assert.equal(shot.narrationPath, narration.path)
      assert.deepEqual(shot.words, narration.words)
      assert.ok(Array.isArray(shot.conform), `${shot.shotId} has no conform notes`)
      assert.deepEqual(shot.conform, [], 'a default clip needs no pad, conversion or silence')
    })

    // The three openings (S-073, D-027, D-050).
    const reason = stillsReason(engine, ran.runId)
    assert.deepEqual(
      manifest.shots.map((s) => s.opening),
      [
        { kind: 'keyframe', pictureId: 'a1-shot-0-repair' },
        { kind: 'keyframe', pictureId: 'a1-shot-1-repair' },
        { kind: 'text-to-video', placed: true, degradation: reason },
        { kind: 'text-to-video', placed: false },
        { kind: 'text-to-video', placed: false },
        { kind: 'text-to-video', placed: false },
      ],
    )

    // Every verdict decided before assembly, with coverage: Gate 1 for the canonical's shot, Gates 1
    // and 1S for a derived picture's, and Gates 2 to 5 for every take.
    assert.deepEqual(
      manifest.shots.map((s) => s.verdicts.map((v) => v.gate)),
      [
        ['1', '2', '3', '4', '5'],
        ['1', '1S', '2', '3', '4', '5'],
        ['2', '3', '4', '5'],
        ['2', '3', '4', '5'],
        ['2', '3', '4', '5'],
        ['2', '3', '4', '5'],
      ],
    )
    manifest.shots.forEach((shot, unit) => {
      const take = takeOf(ran, `shot-${unit}-take-1`)
      for (const verdict of shot.verdicts) {
        assert.equal(verdict.outcome, 'accept', `${shot.shotId} Gate ${verdict.gate}`)
        assert.ok(
          verdict.coverage !== undefined && verdict.coverage !== null,
          `${shot.shotId}'s Gate ${verdict.gate} verdict has no coverage (I-6)`,
        )
        const ofTake = take.verdicts.find((v) => v.gate === verdict.gate)
        if (ofTake !== undefined) assert.deepEqual(verdict.coverage, ofTake.coverage)
      }
      const four = shot.verdicts.find((v) => v.gate === '4')?.coverage as {
        strategy: string
        limitations: string[]
      }
      assert.equal(four.strategy, 'full')
      assert.ok(four.limitations.length > 0, "Gate 4's coverage lost its limitation (D-051)")
    })
    const pictures = engine.query<{ picture_id: string; gate1: string; gate1s: string | null }>(
      'SELECT picture_id, gate1, gate1s FROM picture WHERE run_id = ? AND chosen = 1 ORDER BY shot_unit',
      ran.runId,
    )
    pictures.forEach((picture, unit) => {
      const held = manifest.shots[unit]?.verdicts ?? []
      const gate1 = JSON.parse(picture.gate1) as { coverage: unknown }
      assert.deepEqual(held.find((v) => v.gate === '1')?.coverage, gate1.coverage)
      if (picture.gate1s !== null) {
        const gate1s = JSON.parse(picture.gate1s) as { coverage: unknown }
        assert.deepEqual(held.find((v) => v.gate === '1S')?.coverage, gate1s.coverage)
      }
    })

    // The profile, the gate profile THAT RAN, the caption style, the duck level and the ledger.
    assert.deepEqual(manifest.profile, {
      container: 'mp4',
      videoCodec: 'h264',
      audioCodec: 'aac',
      width: 108,
      height: 192,
      fps: 24,
      sampleRate: 48000,
      channels: 2,
    })
    assert.deepEqual(manifest.gateProfile, {
      id: 'phase-1-as-handed',
      gates: ['0', '1', '1S', '2', '3', '4', '5', '7'],
    })
    assert.deepEqual(manifest.captionStyle, SETTINGS.captionStyle)
    // AMENDED BY cut-rules (S-158): no duck level — a reel's only sound is its narration.
    assert.ok(!('duckDb' in manifest), 'the manifest carries a duck level')
    assert.deepEqual(manifest.ledger, { imageCents: 6, narrationCents: 2, videoCents: 4 })
    assert.equal(manifest.totalFrames, TOTAL)

    // Every path is absolute, under the artifact root, and no string in it is a URL. A shot names
    // its clip or, where it is held on its picture, that picture (S-097, S-099): types only here,
    // since no shot of this fixture is held.
    for (const shot of manifest.shots) {
      const named =
        shot.stillHold === undefined
          ? [shot.clipPath, shot.narrationPath]
          : [shot.stillHold.path, shot.narrationPath]
      for (const path of named) {
        assert.ok(isAbsolute(path), `${path} is not absolute`)
        const inside = relative(engine.artifactRoot, path)
        assert.ok(!inside.startsWith('..') && !isAbsolute(inside), `${path} is outside the root`)
        assert.ok(existsSync(path), `${path} names no file`)
      }
    }
    const strings: string[] = []
    const walk = (value: unknown) => {
      if (typeof value === 'string') strings.push(value)
      else if (Array.isArray(value)) value.forEach(walk)
      else if (value !== null && typeof value === 'object') Object.values(value).forEach(walk)
    }
    walk(manifest)
    assert.deepEqual(
      strings.filter((s) => /^[a-z][a-z0-9+.-]*:\/\//i.test(s)),
      [],
      'the manifest holds a URL',
    )

    // It parses under its schema, and the row's hash is the stored text's.
    const parsed = renderManifestSchema.safeParse(manifest)
    assert.ok(parsed.success, JSON.stringify(parsed.error?.issues))
    assert.equal(
      row.hash,
      createHash('sha256').update(row.text, 'utf8').digest('hex'),
      "the render row's hash is not its manifest's",
    )
    assert.deepEqual(row.profile, manifest.profile)
  } finally {
    await engine.stop()
  }
})

test('29. the assembler and the frame strip refuse a run or render id whose path would leave the root', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'reel-render-root-'))
  try {
    const root = join(dir, 'root')
    const tools = ffmpegTools()
    const assembler = ffmpegAssembler(tools, { artifactRoot: root })
    const media = ffmpegMedia(tools, { artifactRoot: root })
    const good = renderManifest(rows(), SETTINGS)

    for (const ids of [
      { runId: '..' },
      { runId: '../elsewhere' },
      { renderId: '../a1-render' },
      { renderId: 'a1/../../../render' },
    ]) {
      await assert.rejects(
        assembler.assemble({ ...good, ...ids }),
        /artifact root/,
        `the assembler took ${JSON.stringify(ids)}`,
      )
      await assert.rejects(
        media.frames({ runId: good.runId, renderId: good.renderId, path: 'x.mp4', ...ids }, [0]),
        /artifact root/,
        `the frame strip took ${JSON.stringify(ids)}`,
      )
    }
    assert.deepEqual(readdirSync(dir), [], 'a refused id wrote something')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

// ---------------------------------------------------------------- 30

test("30. each shot's span is its narration's measured seconds in frames, rounded up, starting where the last ends; a clip longer than its narration is trimmed with no label", () => {
  const manifest = renderManifest(rows(), SETTINGS)
  assert.deepEqual(
    manifest.shots.map((s) => [s.startFrame, s.frames]),
    [
      [0, 77],
      [77, 48],
      [125, 96],
    ],
  )
  assert.equal(manifest.totalFrames, 221)
  for (const shot of manifest.shots) {
    assert.equal(
      shot.pictureFrames,
      shot.frames,
      `${shot.shotId} is 5 seconds, longer than its span`,
    )
    assert.equal(shot.hold, null, `${shot.shotId} is trimmed, and a trim has no label`)
  }

  // A whole number of frames is not rounded up again, and a clip of exactly its span holds nothing.
  const exact = renderManifest(rows({ narrations: [3, 2, 4], clips: [3, 2, 4] }), SETTINGS)
  assert.deepEqual(
    exact.shots.map((s) => [s.startFrame, s.frames, s.pictureFrames, s.hold]),
    [
      [0, 72, 72, null],
      [72, 48, 48, null],
      [120, 96, 96, null],
    ],
  )
})

test("30. a clip shorter holds its last frame, carried on the manifest's shot", () => {
  // Shot 1's clip is a second and a half under a narration of two: 36 frames of picture in a span of 48.
  const manifest = renderManifest(rows({ clips: [5, 1.5, 5] }), SETTINGS)
  const [first, held, last] = manifest.shots
  assert.equal(held?.frames, 48)
  assert.equal(held?.pictureFrames, 36)
  assert.equal(held?.hold?.frames, 12)
  assert.equal(held?.hold?.seconds, 0.5)
  assert.match(String(held?.hold?.reason), /a1-shot-1-take-1/)
  assert.equal(first?.hold, null)
  assert.equal(last?.hold, null)
  // The hold moves no later shot: the span is the narration's, held or not.
  assert.equal(last?.startFrame, 125)
})

test("30. each shot's span is its narration's measured seconds in frames, rounded up, starting where the last ends; and a clip shorter holds its last frame, labelled in four places — a hold row with its seconds, the take's row with the reason, its video receipt and a degraded event — carried on the manifest's shot, and listed after the stills' degradations in the result and in the record", async () => {
  const { engine, ran } = await heldRun('r30')
  try {
    const row = renderOf(engine, ran.runId)
    const manifest = row.renderManifest

    // The narrations as measured, by hand: 18, 14, 6, 6, 4 and 10 words; shot 2's words are 310 ms.
    assert.deepEqual(
      ran.narrations.map((n) => n.probe?.durationSeconds),
      [9, 7, 3.06, 3, 2, 5],
    )
    // The spans the manifest states — 3.06 s is 73.44 frames, rounded UP to 74.
    assert.deepEqual(
      manifest.shots.map((s) => s.frames),
      SPANS,
    )
    assert.deepEqual(
      manifest.shots.map((s) => s.startFrame),
      STARTS,
    )
    assert.equal(manifest.totalFrames, TOTAL)
    // The spans the FILE shows: each take's band begins at its shot's start frame.
    assert.ok(row.path !== null)
    assert.deepEqual(shotStarts(row.path, TAKES), STARTS)
    assert.equal(bandColours(row.path).length, TOTAL)

    // Shot 0: 6 s of picture under 9 s of narration, held 3 s. Shot 3: 2 s under 3, held 1 s.
    const holds = holdRows(engine, ran.runId)
    assert.deepEqual(
      holds.map((h) => [h.render_id, h.shot_id, h.seconds]),
      [
        ['a1-render', 'shot-0', 3],
        ['a1-render', 'shot-3', 1],
      ],
    )
    const [hold0, hold3] = holds.map((h) => h.reason)
    assert.ok(hold0 !== undefined && hold3 !== undefined)
    assert.match(hold0, /a1-shot-0-take-1/)
    assert.match(hold3, /a1-shot-3-take-1/)
    assert.deepEqual(
      manifest.shots.map((s) => [s.pictureFrames, s.hold]),
      [
        [144, { frames: 72, seconds: 3, reason: hold0 }],
        [168, null],
        [74, null],
        [48, { frames: 24, seconds: 1, reason: hold3 }],
        [48, null],
        [120, null],
      ],
    )

    // The take's row carries the reason beside its verdicts; a trimmed take's carries none.
    assert.deepEqual(
      ran.takes.map((t) => t.degradation),
      [hold0, null, null, hold3, null, null],
    )
    // Its video receipt is marked — as shot 2's is, for its degraded picture (D-050) — and no other.
    assert.deepEqual(
      ran.videoReceipts.map((r) => r.degraded),
      [true, false, true, true, false, false],
    )
    // Its degraded event, after the stills stage's, in shot order, before Gate 7's verdict.
    const stills = stillsReason(engine, ran.runId)
    const degraded = ran.events.filter((e) => e.type === 'degraded')
    assert.deepEqual(
      degraded.map((e) => [e.shotId, e.reason]),
      [
        ['shot-2', stills],
        ['shot-0', hold0],
        ['shot-3', hold3],
      ],
    )
    const lines = described(ran.events)
    assert.deepEqual(lines.slice(-5), [
      'degraded shot-0',
      'degraded shot-3',
      'verdict 7 accept',
      'stage.finished video',
      'run.finished completed',
    ])

    // Listed after the stills' degradations, in the result and in the record.
    const listed = [
      { shotId: 'shot-2', reason: stills },
      { shotId: 'shot-0', reason: hold0 },
      { shotId: 'shot-3', reason: hold3 },
    ]
    assert.deepEqual(ran.result.degradations, listed)
    assert.deepEqual((await engine.http.record(ran.runId)).json.degradations, listed)

    // The record lists the LATEST render's holds: an earlier render's, written here by hand as an
    // interrupted attempt would have left them, are not listed with them.
    engine.query(
      `INSERT INTO render (run_id, render_id, attempt, render_manifest, hash, profile, started_at)
       VALUES (?, 'a0-render', 0, '{}', 'none', '{}', '2026-01-01T00:00:00.000Z')`,
      ran.runId,
    )
    engine.query(
      `INSERT INTO hold (run_id, render_id, shot_id, seconds, reason)
       VALUES (?, 'a0-render', 'shot-5', 2, 'an earlier render held shot 5')`,
      ran.runId,
    )
    assert.deepEqual((await engine.http.record(ran.runId)).json.degradations, listed)
  } finally {
    await engine.stop()
  }
})

test('30. the held frames are the last frame of the clip: nothing moves in the output while a shot holds', async () => {
  const { engine, ran } = await heldRun('r30-held')
  try {
    const row = renderOf(engine, ran.runId)
    assert.ok(row.path !== null)
    const moved = motion(row.path)
    // Shot 0 moves for its 144 frames of picture and is still for the 72 it holds. A held frame is
    // the frame before it again, so nothing moves into it — but for the encoder, which now and then
    // sharpens a still picture by a fraction of a level: measured at most 0.45 against a moving
    // frame's least, 0.88. So: every moving frame moves, nearly every held frame does not at all,
    // no held frame moves as much as the least a moving one does, and on average a tenth as much.
    const mean = (values: number[]) => values.reduce((sum, v) => sum + v, 0) / values.length
    const moving = moved.slice(100, 144)
    const held = moved.slice(145, 216)
    const said = `moving ${moving.join(', ')} — held ${held.join(', ')}`
    assert.ok(Math.min(...moving) > 0.5, said)
    assert.ok(held.filter((m) => m < 0.05).length >= held.length * 0.8, said)
    assert.ok(Math.max(...held) < Math.min(...moving), said)
    assert.ok(mean(held) * 10 < mean(moving), said)
    // Shot 1, trimmed, moves to its last frame.
    assert.ok(Math.min(...moved.slice(300, 384)) > 0.5, moved.slice(300, 384).join(', '))
  } finally {
    await engine.stop()
  }
})

// ---------------------------------------------------------------- 35

test("35. lengthening one shot's measured narration changes that shot's span and every later shot's start, and no caption's offset from its own shot's start", () => {
  const before = renderManifest(rows(), SETTINGS)
  // Shot 0's narration measured at 4.1 seconds, not 3.2: 98.4 frames, a span of 99.
  const after = renderManifest(rows({ narrations: [4.1, 2, 4] }), SETTINGS)

  assert.deepEqual(
    before.shots.map((s) => [s.startFrame, s.frames]),
    [
      [0, 77],
      [77, 48],
      [125, 96],
    ],
  )
  assert.deepEqual(
    after.shots.map((s) => [s.startFrame, s.frames]),
    [
      [0, 99],
      [99, 48],
      [147, 96],
    ],
  )
  assert.equal(after.totalFrames, 243)

  // A shot's start in reel time, by hand: 77 frames is 3208 ms and 125 is 5208; 99 is 4125, 147 is 6125.
  const offsets = (starts: number[], captions: typeof before.captions) => {
    const counts = WORDS.map((w) => w.length)
    const out: number[][] = []
    let at = 0
    counts.forEach((count, shot) => {
      out.push(captions.slice(at, at + count).map((c) => c.startMs - (starts[shot] ?? 0)))
      at += count
    })
    return out
  }
  const own = [
    [0, 500, 1000, 1500, 2000, 2500],
    [0, 500, 1000, 1500],
    [0, 500, 1000, 1500, 2000, 2500, 3000, 3500],
  ]
  assert.deepEqual(offsets([0, 3208, 5208], before.captions), own)
  assert.deepEqual(offsets([0, 4125, 6125], after.captions), own)
  assert.deepEqual(
    after.captions.map((c) => c.endMs - c.startMs),
    before.captions.map((c) => c.endMs - c.startMs),
  )
})

test('29. renderManifest throws on rows that cannot make one: a shot with no accepted take, and one with no measured narration', () => {
  const noTake = rows()
  noTake.takes = noTake.takes.filter((t) => t.shotUnit !== 1)
  assert.throws(() => renderManifest(noTake, SETTINGS), /shot-1/)

  const failed = rows()
  failed.takes = failed.takes.map((t) =>
    t.shotUnit === 2 ? { ...t, outcome: 'fail' as const } : t,
  )
  assert.throws(() => renderManifest(failed, SETTINGS), /shot-2/)

  const unmeasured = rows()
  unmeasured.narrations = unmeasured.narrations.map((n) =>
    n.shotUnit === 0 ? { ...n, probe: null } : n,
  )
  assert.throws(() => renderManifest(unmeasured, SETTINGS), /shot-0/)

  // And on a manifest its own schema refuses: rows that give two shots one narration id (D-057).
  // What it returns has been validated, not only what a check later reads from a row.
  const shared = rows()
  shared.narrations = shared.narrations.map((n) =>
    n.shotUnit === 1 ? { ...n, narrationId: 'a1-shot-0-narration' } : n,
  )
  assert.throws(() => renderManifest(shared, SETTINGS), /hold one narration/)
})

/**
 * How much the picture moves INTO each frame of a file: the mean absolute difference between its
 * 16 × 16 grey thumbnail and the frame before's. The stand-in's pattern moves every frame; a held
 * frame is the frame before it again.
 */
function motion(path: string): number[] {
  const size = 16 * 16
  const grey = thumbnails(path, 'gray')
  const out: number[] = [0]
  for (let frame = 1; frame * size + size <= grey.length; frame += 1) {
    let sum = 0
    for (let i = 0; i < size; i += 1) {
      sum += Math.abs((grey[frame * size + i] as number) - (grey[(frame - 1) * size + i] as number))
    }
    out.push(sum / size)
  }
  return out
}
