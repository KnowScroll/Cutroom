import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { renameSync } from 'node:fs'
import { crc32 } from 'node:zlib'
import type {
  MediaProbe,
  NarrationRecord,
  Plan,
  RenderManifest,
  TakeRecord,
  TakeVerdict,
  WordTiming,
} from '@cutroom/contracts'
import type { Engine } from './harness.ts'

// Readers and fixtures for reel-render's assembly checks (docs/features/reel-render.md, checks 29–41).
//
// WHERE A CHECK READS THE OUTPUT, IT MEASURES THE FILE (Gate 3, S-073): the readers here decode the
// assembled MP4 with ffmpeg and report what is in its frames and its sound — which take's band each
// frame carries, how bright the caption band is, how loud each tone is. None of them reads the render
// manifest to say what the file holds. Every expectation a check makes of a span, a start frame or a
// caption's time is typed in the check BY HAND, from the fixtures' narrations: 18, 14, 6, 6, 4 and 10
// words at half a second a word.

// ---------------------------------------------------------------- the rows a render left

const json = <T>(text: string | null): T => (text === null ? null : JSON.parse(text)) as T

export interface RenderRow {
  render_id: string
  attempt: number
  /** The stored text, exactly as the row holds it: what the hash is of. */
  text: string
  renderManifest: RenderManifest
  hash: string
  path: string | null
  profile: RenderManifest['profile']
  invocations: string[][] | null
  measure: MediaProbe | null
  started_at: string
  finished_at: string | null
  gate7: {
    outcome: string
    coverage: { strategy: string; frames: number }
    answer: Array<{ question: string; answer: string }>
    reasons: string[]
  } | null
}

/** A run's render rows, oldest first, their JSON columns parsed and the manifest's text kept. */
export function renderRows(engine: Engine, runId: string): RenderRow[] {
  return engine
    .query<Record<string, unknown>>('SELECT * FROM render WHERE run_id = ? ORDER BY attempt', runId)
    .map((r) => ({
      render_id: String(r.render_id),
      attempt: Number(r.attempt),
      text: String(r.render_manifest),
      renderManifest: json(r.render_manifest as string),
      hash: String(r.hash),
      path: r.path as string | null,
      profile: json(r.profile as string),
      invocations: json(r.invocations as string | null),
      measure: json(r.measure as string | null),
      started_at: String(r.started_at),
      finished_at: r.finished_at as string | null,
      gate7: json(r.gate7 as string | null),
    }))
}

/** A run's one render row, or a failure saying what the run holds. */
export function renderOf(engine: Engine, runId: string): RenderRow {
  const rows = renderRows(engine, runId)
  assert.equal(rows.length, 1, `the run has ${rows.length} render rows, not one`)
  return rows[0] as RenderRow
}

export interface HoldRow {
  render_id: string
  shot_id: string
  seconds: number
  reason: string
}

export const holdRows = (engine: Engine, runId: string) =>
  engine
    .query<HoldRow>(
      'SELECT render_id, shot_id, seconds, reason FROM hold WHERE run_id = ? ORDER BY rowid',
      runId,
    )
    .map((r) => ({ ...r }))

// ---------------------------------------------------------------- measuring a file

/** Runs ffmpeg with an argument array and answers its raw standard output. */
function decoded(args: readonly string[]): { stdout: Buffer; stderr: string } {
  const ran = spawnSync('ffmpeg', ['-hide_banner', '-nostats', ...args], {
    maxBuffer: 256 * 1024 * 1024,
    windowsHide: true,
  })
  assert.equal(ran.status, 0, `ffmpeg ${args.join(' ')} failed: ${ran.stderr?.toString('utf8')}`)
  return { stdout: ran.stdout, stderr: ran.stderr.toString('utf8') }
}

export type Rgb = readonly [number, number, number]

/** The colour the video stand-in keys from a take id: its CRC-32's low 24 bits (fake/video.ts). */
export function bandOf(takeId: string): Rgb {
  const c = crc32(takeId) & 0xffffff
  return [(c >> 16) & 0xff, (c >> 8) & 0xff, c & 0xff]
}

const distance = (x: Rgb, y: Rgb) => Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2])

/**
 * The mean colour of every decoded frame's band strip, in frame order. The stand-in's band is the
 * top fifth of its picture; the strip read is from a twentieth to three twentieths of the height, so
 * a pad of a row or two above the picture does not reach it.
 */
export function bandColours(path: string): Rgb[] {
  const { stdout } = decoded([
    '-i',
    path,
    '-vf',
    'crop=iw:ih/10:0:ih/20,scale=1:1:flags=area',
    '-f',
    'rawvideo',
    '-pix_fmt',
    'rgb24',
    '-',
  ])
  const out: Rgb[] = []
  for (let at = 0; at + 3 <= stdout.length; at += 3) {
    out.push([stdout[at] as number, stdout[at + 1] as number, stdout[at + 2] as number])
  }
  return out
}

/**
 * WHICH TAKE EACH FRAME OF A FILE CARRIES, measured: the index in `takeIds` of the take whose band
 * colour the frame's band is nearest — H.264 in yuv420p moves a colour a little, so nearest within a
 * tolerance, never equal. Fails when two takes of the list are too alike to tell apart, or when a
 * frame's band is near none of them.
 */
export function takeOfFrames(path: string, takeIds: readonly string[]): number[] {
  const expected = takeIds.map(bandOf)
  expected.forEach((colour, i) => {
    const next = expected[i + 1]
    if (next === undefined) return
    assert.ok(
      distance(colour, next) > 80,
      `${takeIds[i]} and ${takeIds[i + 1]} have bands too alike to find a boundary between them`,
    )
  })
  return bandColours(path).map((colour, frame) => {
    const ranked = expected.map((e, i) => ({ i, d: distance(colour, e) })).sort((x, y) => x.d - y.d)
    const nearest = ranked[0]
    assert.ok(
      nearest !== undefined && nearest.d < 40,
      `frame ${frame}'s band [${colour.join(', ')}] is no take's colour (nearest ${nearest?.d})`,
    )
    return nearest.i
  })
}

/** The frame at which each shot's band begins: a shot boundary is where the band changes (S-073). */
export function shotStarts(path: string, takeIds: readonly string[]): number[] {
  const frames = takeOfFrames(path, takeIds)
  const starts: number[] = []
  frames.forEach((take, frame) => {
    if (frame === 0 || frames[frame - 1] !== take) starts.push(frame)
  })
  // Each change must be to the next take of the list, so the starts are the shots', in order.
  assert.deepEqual(
    starts.map((frame) => frames[frame]),
    takeIds.map((_, i) => i),
    'the bands do not change from each take to the next, once each',
  )
  return starts
}

/**
 * Every decoded frame of a file — a video's, or a picture's one — as a 16 × 16 thumbnail, in frame
 * order: 256 bytes a frame in grey, 768 in colour.
 */
export function thumbnails(path: string, colour: 'gray' | 'rgb24'): Buffer {
  return decoded([
    '-i',
    path,
    '-vf',
    'scale=16:16:flags=area',
    '-f',
    'rawvideo',
    '-pix_fmt',
    colour,
    '-',
  ]).stdout
}

/** The mean grey level of one row of one frame, 0 to 255: row 0 is the frame's top. */
export function rowLevel(path: string, frame: number, row: number): number {
  const { stdout } = decoded([
    '-i',
    path,
    '-vf',
    `select='eq(n,${frame})',format=gray,crop=iw:1:0:${row}`,
    '-frames:v',
    '1',
    '-f',
    'rawvideo',
    '-pix_fmt',
    'gray',
    '-',
  ])
  assert.ok(stdout.length > 0, `the file has no frame ${frame}`)
  let sum = 0
  for (const level of stdout) sum += level
  return sum / stdout.length
}

/**
 * How many pixels of one frame's caption band are bright. The band is the stand-in's shaded lower
 * third, where nothing of the test pattern is brighter than white at 40% — so a bright pixel there is
 * a burned caption's.
 */
export function captionPixels(path: string, frame: number): number {
  const { stdout } = decoded([
    '-i',
    path,
    '-vf',
    `select='eq(n,${frame})',crop=iw:ih/3:0:ih*2/3`,
    '-frames:v',
    '1',
    '-f',
    'rawvideo',
    '-pix_fmt',
    'gray',
    '-',
  ])
  assert.ok(stdout.length > 0, `the file has no frame ${frame}`)
  let bright = 0
  for (const level of stdout) if (level >= 170) bright += 1
  return bright
}

/**
 * The level of one tone in a file's sound, in dB: the mean volume left by two narrow band-pass
 * filters around it. 220 Hz is the clips' tone and 660 Hz the narrations'; two passes keep the louder
 * tone's skirt out of the quieter one's band.
 */
export function toneDb(
  path: string,
  hz: 220 | 660,
  slice?: { fromSeconds: number; seconds: number },
): number {
  const pass = `bandpass=f=${hz}:width_type=h:w=20`
  const { stderr } = decoded([
    ...(slice === undefined ? [] : ['-ss', String(slice.fromSeconds), '-t', String(slice.seconds)]),
    '-i',
    path,
    '-vn',
    '-af',
    `${pass},${pass},volumedetect`,
    '-f',
    'null',
    '-',
  ])
  const found = /mean_volume:\s*(-?\d+(?:\.\d+)?) dB/.exec(stderr)
  assert.ok(found?.[1] !== undefined, `volumedetect reported no mean volume for ${path}`)
  return Number(found[1])
}

/** What ffprobe says of a file, the way the media port's probe counts it. */
export function measured(path: string) {
  const ran = spawnSync(
    'ffprobe',
    [
      '-v',
      'error',
      '-count_frames',
      '-show_entries',
      'stream=codec_type,codec_name,width,height,r_frame_rate,nb_read_frames,sample_rate,channels:format=duration',
      '-of',
      'json',
      path,
    ],
    { encoding: 'utf8', windowsHide: true },
  )
  assert.equal(ran.status, 0, `ffprobe ${path} failed: ${ran.stderr}`)
  const probed = JSON.parse(ran.stdout) as {
    streams: Array<Record<string, string | number>>
    format: { duration: string }
  }
  const video = probed.streams.find((s) => s.codec_type === 'video')
  const audio = probed.streams.find((s) => s.codec_type === 'audio')
  return {
    seconds: Number(probed.format.duration),
    videoCodec: video?.codec_name,
    width: video?.width,
    height: video?.height,
    fps: video?.r_frame_rate,
    frames: Number(video?.nb_read_frames),
    audioCodec: audio?.codec_name,
    sampleRate: Number(audio?.sample_rate),
    channels: audio?.channels,
  }
}

/**
 * Replaces a file with another encoding of itself — what an assembler that broke its own input would
 * leave (check 41). Each is a real file ffprobe measures; none is a scripted measure.
 */
export function replaced(path: string, how: 'a frame short' | 'another size' | 'mdat first') {
  const other = `${path}.other.mp4`
  const encode = ['-c:v', 'libx264', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', '-c:a', 'aac']
  const frames = measured(path).frames
  const args =
    how === 'a frame short'
      ? ['-frames:v', String(frames - 1), ...encode, '-movflags', '+faststart']
      : how === 'another size'
        ? ['-vf', 'scale=54:96', ...encode, '-movflags', '+faststart']
        : encode
  decoded(['-y', '-i', path, ...args, other])
  renameSync(other, path)
}

// ---------------------------------------------------------------- rows for renderManifest, by hand

/** A probe of a stand-in clip: 108 × 192 at 24 fps with 48 kHz stereo sound, `seconds` long. */
export function clipProbe(seconds: number, over: Partial<MediaProbe> = {}): MediaProbe {
  return {
    readable: true,
    durationSeconds: seconds,
    video: { codec: 'h264', width: 108, height: 192, fps: 24, frames: Math.round(seconds * 24) },
    audio: { codec: 'aac', sampleRate: 48000, channels: 2 },
    moovFirst: false,
    ...over,
  }
}

/** A probe of a stand-in narration: a 24 kHz mono WAV, `seconds` long. */
export const narrationProbe = (seconds: number): MediaProbe => ({
  readable: true,
  durationSeconds: seconds,
  video: null,
  audio: { codec: 'pcm_s16le', sampleRate: 24000, channels: 1 },
  moovFirst: null,
})

/** The stand-in's timings for these words: 300 ms a word, 200 ms after it. */
export const timed = (words: readonly string[]): WordTiming[] =>
  words.map((word, i) => ({ word, startMs: i * 500, endMs: i * 500 + 300 }))

const accepted = (gate: TakeVerdict['gate']): TakeVerdict => ({
  gate,
  outcome: 'accept',
  reasons: [],
  coverage:
    gate === '4'
      ? { strategy: 'full', limitations: ['how a supplied clip is sampled is undocumented'] }
      : gate === '5'
        ? { strategy: 'observation' }
        : { strategy: 'whole file' },
})

/** An accepted take of attempt 1, as the clips stage's rows hold one, its clip `seconds` long. */
export function takeRow(unit: number, seconds: number, over: Partial<TakeRecord> = {}): TakeRecord {
  const takeId = `a1-shot-${unit}-take-1`
  return {
    takeId,
    attempt: 1,
    shotUnit: unit,
    number: 1,
    mode: 'text-to-video',
    pictureId: null,
    degraded: false,
    prompt: `prompt of ${takeId}`,
    durationSeconds: Math.ceil(seconds),
    seed: crc32(takeId),
    requestId: `stand-in-${takeId}`,
    expandedPrompt: `expansion of ${takeId}`,
    path: `/artifacts/run-1/${takeId}.mp4`,
    probe: clipProbe(seconds),
    scan: { black: [], frozen: [], silent: [], loudnessLufs: -20 },
    words: [],
    sound: { speech: false, music: false },
    observation: null,
    reconciliation: null,
    verdicts: [accepted('2'), accepted('3'), accepted('4'), accepted('5')],
    outcome: 'accept',
    degradation: null,
    ...over,
  }
}

/** A narration of attempt 1, measured and timed, `seconds` long. */
export function narrationRow(
  unit: number,
  seconds: number,
  words: readonly string[],
): NarrationRecord {
  const narrationId = `a1-shot-${unit}-narration`
  return {
    narrationId,
    attempt: 1,
    shotUnit: unit,
    text: words.join(' '),
    path: `/artifacts/run-1/${narrationId}.wav`,
    words: timed(words),
    probe: narrationProbe(seconds),
  }
}

/** A selected plan of three shots, one sentence a unit. */
export const THREE_SHOTS: Plan = {
  role: 'b',
  units: [[0], [1], [2]],
  shots: [
    { unit: 0, durationSeconds: 5, subjectIds: ['seal'] },
    { unit: 1, durationSeconds: 5, subjectIds: [] },
    { unit: 2, durationSeconds: 5, subjectIds: ['seal'] },
  ],
  subjects: [{ id: 'seal', name: 'a wax seal' }],
  criteria: { mustShow: [], mustNotShow: [] },
  plannedImageCalls: 2,
  estimateCents: 60,
}
