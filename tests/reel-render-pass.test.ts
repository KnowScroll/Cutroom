import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, extname, isAbsolute, join, relative } from 'node:path'
import { after, test } from 'node:test'
import type { RenderManifest } from '@cutroom/contracts'
import { DEFAULT_RENDER_SETTINGS } from '@cutroom/pipeline'
import { ffmpegAssembler, ffmpegTools, type FakeVideoScript } from '@cutroom/providers'
import { startEngine, waitFor, type Engine } from './engine/harness.ts'
import {
  bandColours,
  captionPixels,
  measured,
  renderOf,
  rowLevel,
  shotStarts,
  toneDb,
  type RenderRow,
} from './engine/render.ts'
import { THREE_RANKS, THREE_RANKS_PICS, inTurn } from './engine/stills.ts'
import {
  UNIT_SENTENCES,
  readVideo,
  video,
  videoRequest,
  videoScript,
  type Videoed,
} from './engine/video.ts'

// reel-render, Slice 4 — checks 31, 32, 33, 34 and 36 (docs/features/reel-render.md): the one pass
// (S-073, D-054, D-055, D-056, D-008). One ffmpeg invocation reads every clip and narration the
// render manifest names and writes one MP4 at the profile: conformed from the clips' measured facts,
// each shot trimmed or held to its span, its clip's sound lowered under its narration, the shots joined
// by the concat filter inside the one filtergraph, captions burned, moov first.
//
// EVERYTHING HERE ABOUT THE OUTPUT IS MEASURED ON THE FILE (Gate 3): its streams by ffprobe, its shot
// boundaries by the frame at which the stand-in's take-keyed band changes, its captions by the
// brightness of the caption band, its mix by the level of each tone. The expected numbers are typed
// by hand from the fixtures' narrations — 9, 7, 3, 3, 2 and 5 seconds, at 24 frames a second.

const TAKES = [0, 1, 2, 3, 4, 5].map((unit) => `a1-shot-${unit}-take-1`)
const STARTS = [0, 216, 384, 456, 528, 576]
const TOTAL = 696

const PROFILE = {
  container: 'mp4',
  videoCodec: 'h264',
  audioCodec: 'aac',
  width: 108,
  height: 192,
  fps: 24,
  sampleRate: 48000,
  channels: 2,
}

/** Whether an MP4's moov box precedes its mdat, read from the file's top-level boxes. */
function moovFirst(path: string): boolean {
  const bytes = readFileSync(path)
  let at = 0
  while (at + 8 <= bytes.length) {
    let size = bytes.readUInt32BE(at)
    const type = bytes.toString('latin1', at + 4, at + 8)
    if (type === 'moov') return true
    if (type === 'mdat') return false
    if (size === 1) size = Number(bytes.readBigUInt64BE(at + 8))
    assert.ok(size >= 8, `a box of ${size} bytes at ${at}`)
    at += size
  }
  return false
}

async function completed(engine: Engine, requestId: string, waitMs?: number): Promise<Videoed> {
  if (waitMs === undefined) {
    const ran = await video(engine, videoRequest(requestId))
    assert.equal(ran.result.status, 'completed', JSON.stringify(ran.result))
    return ran
  }
  const submitted = await engine.http.submit(videoRequest(requestId))
  assert.equal(submitted.status, 202, JSON.stringify(submitted.json))
  const runId = String(submitted.json.runId)
  await waitFor(
    `video run ${runId} to finish`,
    async () => (await engine.http.status(runId)).json.state === 'finished',
    waitMs,
  )
  const ran = await readVideo(engine, runId)
  assert.equal(ran.result.status, 'completed', JSON.stringify(ran.result))
  return ran
}

// ---------------------------------------------------------------- the run 33, 34 and 36 read

let shared: Promise<{ engine: Engine; ran: Videoed; row: RenderRow & { path: string } }> | undefined

/** One completed run of THREE_RANKS at the small profile, made once for the checks that only read it. */
function plain() {
  shared ??= (async () => {
    const engine = await startEngine({
      worker: true,
      script: videoScript(THREE_RANKS, THREE_RANKS_PICS),
    })
    try {
      const ran = await completed(engine, 'r-pass')
      const row = renderOf(engine, ran.runId)
      assert.ok(row.path !== null, 'the render row has no output path')
      return { engine, ran, row: { ...row, path: row.path } }
    } catch (error) {
      await engine.stop()
      throw error
    }
  })()
  return shared
}

after(async () => {
  if (shared === undefined) return
  const made = await shared.catch(() => undefined)
  await made?.engine.stop()
})

// ---------------------------------------------------------------- 31

test("31. the output is one MP4 made by one ffmpeg invocation; its measured codecs, geometry, frame rate, sample rate and channels equal the profile's; its frame count equals the manifest's total frames exactly, and each shot's take-keyed band begins exactly at its start frame; its moov precedes its mdat; no .m3u8 or segment file is written; two runs' render rows report identical profile fields", async () => {
  const engine = await startEngine({
    worker: true,
    script: inTurn(
      videoScript(THREE_RANKS, THREE_RANKS_PICS),
      videoScript(THREE_RANKS, THREE_RANKS_PICS),
    ),
  })
  try {
    const first = await completed(engine, 'r31-a')
    const second = await completed(engine, 'r31-b')
    const row = renderOf(engine, first.runId)
    const folder = join(engine.artifactRoot, first.runId)

    // One MP4, at <root>/<runId>/<renderId>.mp4, made by one invocation that read each of the twelve
    // files the manifest names once and wrote that one file.
    assert.equal(row.path, join(folder, 'a1-render.mp4'))
    assert.ok(row.path !== null && isAbsolute(row.path))
    assert.equal(readFileSync(row.path).toString('latin1', 4, 8), 'ftyp', 'the output is no MP4')
    assert.equal(row.invocations?.length, 1, 'the pass is not one invocation (D-054)')
    const [invocation] = row.invocations ?? []
    assert.ok(invocation !== undefined)
    assert.equal(invocation[0], 'ffmpeg')
    const inputs = invocation.flatMap((arg, i) => (arg === '-i' ? [invocation[i + 1]] : []))
    assert.deepEqual(
      inputs,
      first.takes.flatMap((take, unit) => [take.path, first.narrations[unit]?.path]),
      'the invocation does not read each clip and its narration once, in plan order',
    )
    assert.equal(invocation.at(-1), row.path, 'the invocation writes another file')
    assert.equal(invocation.filter((arg) => arg === '-filter_complex').length, 1)

    // Measured by ffprobe, here and by the engine: the profile's, exactly.
    const probed = measured(row.path)
    assert.deepEqual(
      {
        videoCodec: probed.videoCodec,
        width: probed.width,
        height: probed.height,
        fps: probed.fps,
        audioCodec: probed.audioCodec,
        sampleRate: probed.sampleRate,
        channels: probed.channels,
      },
      {
        videoCodec: 'h264',
        width: 108,
        height: 192,
        fps: '24/1',
        audioCodec: 'aac',
        sampleRate: 48000,
        channels: 2,
      },
    )
    assert.equal(probed.frames, TOTAL, 'the frame count is not the narrations’ 29 seconds at 24')
    assert.equal(row.renderManifest.totalFrames, TOTAL)
    assert.deepEqual(row.measure, {
      readable: true,
      durationSeconds: row.measure?.durationSeconds,
      video: { codec: 'h264', width: 108, height: 192, fps: 24, frames: TOTAL },
      audio: { codec: 'aac', sampleRate: 48000, channels: 2 },
      moovFirst: true,
    })
    assert.ok(Math.abs((row.measure?.durationSeconds ?? 0) - 29) < 0.1)

    // Each shot's take-keyed band begins exactly at its start frame.
    assert.deepEqual(shotStarts(row.path, TAKES), STARTS)
    assert.equal(bandColours(row.path).length, TOTAL)

    // moov before mdat (D-056), and nothing written in pieces.
    assert.ok(moovFirst(row.path), 'mdat precedes moov: the file was not written with +faststart')
    const files = readdirSync(folder)
    assert.deepEqual(
      [...new Set(files.map((name) => extname(name)))].sort(),
      ['.ass', '.mp4', '.png', '.wav'],
      `the run's folder holds ${files.join(', ')}`,
    )
    assert.deepEqual(
      files.filter((name) => name.endsWith('.mp4')).sort(),
      [...TAKES.map((id) => `${id}.mp4`), 'a1-render.mp4'].sort(),
      'a video file that is neither a take nor the render was written',
    )
    assert.deepEqual(
      files.filter((name) => name.endsWith('.ass')),
      ['a1-render.ass'],
    )

    // Two runs' render rows report identical profile fields (D-055).
    const other = renderOf(engine, second.runId)
    assert.deepEqual(row.profile, PROFILE)
    assert.deepEqual(other.profile, PROFILE)
    assert.deepEqual(other.renderManifest.profile, PROFILE)
    assert.equal(measured(String(other.path)).frames, TOTAL)
  } finally {
    await engine.stop()
  }
})

test('31. a run at the default profile is measured at 768 × 1366, 24 fps, 48 kHz, two channels', async () => {
  // The one test that renders at the default profile (Gate 3): every other sets a small one. Its wait
  // is longer than a small run's because 29 seconds are encoded at 768 × 1366; no assertion changes.
  const engine = await startEngine({
    worker: true,
    script: videoScript(THREE_RANKS, THREE_RANKS_PICS),
    renderSettings: DEFAULT_RENDER_SETTINGS,
  })
  try {
    const ran = await completed(engine, 'r31-default', 240_000)
    const row = renderOf(engine, ran.runId)
    assert.ok(row.path !== null)
    const probed = measured(row.path)
    assert.deepEqual(
      [probed.width, probed.height, probed.fps, probed.sampleRate, probed.channels],
      [768, 1366, '24/1', 48000, 2],
    )
    assert.equal(probed.videoCodec, 'h264')
    assert.equal(probed.audioCodec, 'aac')
    assert.equal(probed.frames, TOTAL)
    assert.deepEqual(row.measure?.video, {
      codec: 'h264',
      width: 768,
      height: 1366,
      fps: 24,
      frames: TOTAL,
    })
    assert.ok(moovFirst(row.path))
    // 108 × 192 into 768 × 1366 is a scale to 768 × 1365 AND a pad of one row: the band still begins
    // at each shot's start frame, and every shot's conform notes say pad.
    assert.deepEqual(shotStarts(row.path, TAKES), STARTS)
    for (const shot of row.renderManifest.shots) {
      assert.equal(shot.conform.length, 1, `${shot.shotId}: ${shot.conform.join(' | ')}`)
      assert.match(String(shot.conform[0]), /^pad: 768×1365 inside 768×1366$/)
    }
  } finally {
    await engine.stop()
  }
})

// ---------------------------------------------------------------- 32

test('32. clips of another 9:16 size within the tolerance, at another frame rate, at another sample rate, and with no audio stream each render to the profile, with a conform note for the pad, the frame-rate conversion and the added silence, and none for a scale or a resample alone', async () => {
  const clips: FakeVideoScript = {
    // 108 × 190 is 9:16 within the tolerance (0.568 against 0.5625): it fits as it is, and is padded.
    'shot-0-take-1': { size: { width: 108, height: 190 } },
    'shot-1-take-1': { fps: 30 },
    'shot-2-take-1': { sampleRate: 44100 },
    'shot-3-take-1': { without: 'audio' },
    // 216 × 384 is the profile doubled: a scale alone.
    'shot-4-take-1': { size: { width: 216, height: 384 } },
  }
  const engine = await startEngine({
    worker: true,
    video: clips,
    script: videoScript(THREE_RANKS, THREE_RANKS_PICS),
  })
  try {
    const ran = await completed(engine, 'r32')
    const row = renderOf(engine, ran.runId)
    assert.ok(row.path !== null)

    // The clips are what the script asked for, measured — so the conform had something to do.
    assert.deepEqual(
      ran.takes.map((t) => [t.probe?.video?.width, t.probe?.video?.height, t.probe?.video?.fps]),
      [
        [108, 190, 24],
        [108, 192, 30],
        [108, 192, 24],
        [108, 192, 24],
        [216, 384, 24],
        [108, 192, 24],
      ],
    )
    assert.equal(ran.takes[2]?.probe?.audio?.sampleRate, 44100)
    assert.equal(ran.takes[3]?.probe?.audio, null)

    // Each renders to the profile: the file's streams, its frame count and every boundary.
    const probed = measured(row.path)
    assert.deepEqual(
      [probed.width, probed.height, probed.fps, probed.sampleRate, probed.channels],
      [108, 192, '24/1', 48000, 2],
    )
    assert.equal(probed.frames, TOTAL)
    assert.deepEqual(shotStarts(row.path, TAKES), STARTS)
    assert.equal(row.measure?.video?.frames, TOTAL)

    // A note for the pad, the conversion and the silence; none for a scale or a resample alone.
    const notes = row.renderManifest.shots.map((s) => s.conform)
    assert.deepEqual(
      notes.map((n) => n.length),
      [1, 1, 0, 1, 0, 0],
      JSON.stringify(notes),
    )
    assert.match(String(notes[0]?.[0]), /^pad: 108×190 inside 108×192$/)
    assert.match(String(notes[1]?.[0]), /^frame rate: 30 to 24$/)
    assert.match(String(notes[3]?.[0]), /^silence: /)

    // The pad is THERE, measured: shot 0's 108 × 190 picture sits inside 108 × 192, so two of its
    // frame's outermost rows are black — a clip stretched to the profile has none, as shot 5's
    // unpadded picture has none. (Frame 100 is shot 0's and frame 600 shot 5's; measured, a pad row is
    // at 0 or 1 and a picture's outermost rows at 49 to 93.)
    const outer = [0, 1, 190, 191]
    const black = (frame: number) => outer.filter((y) => rowLevel(String(row.path), frame, y) < 12)
    assert.equal(
      black(100).length,
      2,
      `shot 0's black outer rows: ${black(100).join(', ') || 'none'}`,
    )
    assert.deepEqual(black(600), [], "shot 5's picture fills the profile, and is padded")

    // The silence is ADDED: shot 3's three seconds hold the narration's tone and no clip tone, where
    // shot 2's hold both. (Shot 2 runs from 16 s to 19 s, shot 3 from 19 s to 22 s.)
    const withClip = toneDb(row.path, 220, { fromSeconds: 16.5, seconds: 2 })
    const silent = toneDb(row.path, 220, { fromSeconds: 19.5, seconds: 2 })
    assert.ok(withClip - silent > 20, `220 Hz: ${withClip} dB in shot 2, ${silent} dB in shot 3`)
    const spoken = toneDb(row.path, 660, { fromSeconds: 19.5, seconds: 2 })
    assert.ok(spoken > -30, `shot 3's narration is at ${spoken} dB`)
  } finally {
    await engine.stop()
  }
})

// ---------------------------------------------------------------- 33

test("33. every narrated word is one caption from its start to its end, offset by its shot's start; and captions are burned: a frame inside a word's caption is brighter in the caption band than a frame in the gap before that word", async () => {
  const { row } = await plain()

  // By hand: a shot starts where the narrations before it end — 0, 9, 16, 19, 22 and 24 seconds — and
  // the stand-in speaks each word for 300 ms, then waits 200.
  const starts = [0, 9000, 16000, 19000, 22000, 24000]
  const expected = UNIT_SENTENCES.flatMap((sentences, unit) =>
    sentences
      .join(' ')
      .split(' ')
      .map((text, k) => ({
        text,
        startMs: (starts[unit] ?? 0) + k * 500,
        endMs: (starts[unit] ?? 0) + k * 500 + 300,
      })),
  )
  assert.equal(expected.length, 58)
  assert.deepEqual(row.renderManifest.captions, expected)

  // Burned, measured in the file. A frame inside a word against a frame in the gap before it:
  //   shot 0's second word, 0.5–0.8 s: frame 16 (0.667 s) against frame 10 (0.417 s);
  //   shot 2's first word, 16.0–16.3 s: frame 388 (16.167 s) against frame 381 (15.875 s), in the gap
  //   after shot 1's last word — a caption not offset by its shot's start is not there;
  //   shot 5's fourth word, 25.5–25.8 s: frame 616 (25.667 s) against frame 610 (25.417 s).
  for (const [inside, gap] of [
    [16, 10],
    [388, 381],
    [616, 610],
  ] as const) {
    const lit = captionPixels(row.path, inside)
    const dark = captionPixels(row.path, gap)
    assert.equal(
      dark,
      0,
      `frame ${gap} is in a gap, and its caption band holds ${dark} bright pixels`,
    )
    assert.ok(
      lit >= 8,
      `frame ${inside} is inside a word, and its caption band holds ${lit} bright pixels`,
    )
  }
})

// ---------------------------------------------------------------- 34

test("34. the clips' sound sits under the narration: one manifest rendered with the duck level at 18 and at 0 gives a clip-tone band 18 dB lower, within 1.5 dB, and a narration-tone band that moves by under 1 dB", async () => {
  const { row } = await plain()
  const dir = mkdtempSync(join(tmpdir(), 'reel-render-duck-'))
  try {
    const stored = JSON.parse(row.text) as RenderManifest
    assert.equal(stored.duckDb, 18, 'the default duck level is no longer 18 dB')
    const tools = ffmpegTools()
    const render = async (duckDb: number) => {
      const assembler = ffmpegAssembler(tools, { artifactRoot: join(dir, `duck-${duckDb}`) })
      return (await assembler.assemble({ ...stored, duckDb })).path
    }
    const ducked = await render(18)
    const level = await render(0)

    const clipTone = toneDb(level, 220) - toneDb(ducked, 220)
    assert.ok(
      Math.abs(clipTone - 18) <= 1.5,
      `the clips' 220 Hz tone is ${clipTone.toFixed(1)} dB lower at 18, not 18 ± 1.5`,
    )
    const narrationTone = toneDb(level, 660) - toneDb(ducked, 660)
    assert.ok(
      Math.abs(narrationTone) < 1,
      `the narrations' 660 Hz tone moved by ${narrationTone.toFixed(1)} dB`,
    )
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

// ---------------------------------------------------------------- 36

test("36. running the assembler again over a render row's stored manifest, under another artifact root, gives the same measured duration and frame count and the same shot boundaries, measured by the take-keyed band; the stored manifest's hash is unchanged; and a manifest whose captions' text alone is changed renders with the same boundaries", async () => {
  const { engine, ran, row } = await plain()
  const dir = mkdtempSync(join(tmpdir(), 'reel-render-replay-'))
  try {
    const before = createHash('sha256').update(readFileSync(row.path)).digest('hex')
    const first = measured(row.path)
    const boundaries = shotStarts(row.path, TAKES)
    assert.deepEqual(boundaries, STARTS)

    // The replay: the stored text, parsed, and nothing else.
    const stored = JSON.parse(row.text) as RenderManifest
    const replay = await ffmpegAssembler(ffmpegTools(), {
      artifactRoot: join(dir, 'replay'),
    }).assemble(stored)
    assert.notEqual(replay.path, row.path, 'the replay wrote over the file it is compared with')
    assert.ok(relative(join(dir, 'replay'), replay.path).startsWith(ran.runId))
    assert.equal(dirname(replay.path), join(dir, 'replay', ran.runId))
    assert.equal(
      createHash('sha256').update(readFileSync(row.path)).digest('hex'),
      before,
      'the first file changed',
    )
    const again = measured(replay.path)
    assert.equal(again.frames, first.frames)
    assert.equal(again.frames, TOTAL)
    assert.ok(
      Math.abs(again.seconds - first.seconds) < 0.001,
      `${again.seconds} s, ${first.seconds}`,
    )
    assert.deepEqual(shotStarts(replay.path, TAKES), boundaries)

    // The stored manifest's hash is unchanged, and is still its text's.
    const after = renderOf(engine, ran.runId)
    assert.equal(after.hash, row.hash)
    assert.equal(after.text, row.text)
    assert.equal(after.hash, createHash('sha256').update(after.text, 'utf8').digest('hex'))

    // D-054's caption test: the captions' text alone changed, the same boundaries.
    const recaptioned = await ffmpegAssembler(ffmpegTools(), {
      artifactRoot: join(dir, 'recaptioned'),
    }).assemble({
      ...stored,
      captions: stored.captions.map((c) => ({ ...c, text: c.text.toUpperCase().slice(0, 3) })),
    })
    assert.equal(measured(recaptioned.path).frames, TOTAL)
    assert.deepEqual(shotStarts(recaptioned.path, TAKES), boundaries)
    // …and the text did change what was burned: the same frame's caption band differs.
    assert.notEqual(captionPixels(recaptioned.path, 388), captionPixels(row.path, 388))
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
