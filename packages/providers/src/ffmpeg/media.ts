import { existsSync, mkdirSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import type { ClipRef, ClipScan, ClipSound, MediaPort, MediaProbe } from '@cutroom/contracts'
import { DEFAULT_ARTIFACT_ROOT, artifactPath } from '../artifacts.ts'
import { entryFor } from '../fake/key.ts'
import type { FfmpegTools, StripFilter } from './tools.ts'

// The MediaPort on ffmpeg and ffprobe (docs/features/reel-render.md, Gate 2 "The ports", "Gates 2
// to 5 on each take" and "Gate 7"; S-072, S-074, S-075). Its probe, its scan and its frame strip are
// REAL: they measure and read the file on disk (I-17), so a stand-in clip's black second is found by
// blackdetect and not by reading a script. Its words and its sound answer from a script, defaulting
// to no words and neither speech nor music — real text-reading and sound-classifying are the paid
// path's — and any method can be scripted to throw.

export type MediaMethod = 'probe' | 'scan' | 'readText' | 'listen' | 'frames'

/** What the port reads and hears in one file. Every field is optional. */
export interface FakeMediaEntry {
  /** The words `readText` reads. None when absent. */
  words?: readonly string[]
  /** What `listen` classifies the sound as. Neither when absent. */
  speech?: boolean
  music?: boolean
  /** A method that throws this message instead of answering. */
  throws?: Partial<Record<MediaMethod, string>>
}

/** Entries by `shot-<unit>-take-<n>` or `shot-<unit>-narration` — or by a whole id, which wins. */
export type FakeMediaScript = Readonly<Record<string, FakeMediaEntry>>

/** One call the port received, in order — including one that threw. */
export interface MediaCall {
  method: MediaMethod
  /** The take, narration or render the call was about. */
  id: string
  path: string
  /** The shortest stretches a scan was handed. */
  shortest?: { blackSeconds: number; frozenSeconds: number }
}

export type FfmpegMedia = MediaPort & { readonly calls: readonly MediaCall[] }

const UNREADABLE: MediaProbe = {
  readable: false,
  durationSeconds: 0,
  video: null,
  audio: null,
  moovFirst: null,
}

interface Probed {
  streams?: Array<{
    codec_type?: string
    codec_name?: string
    width?: number
    height?: number
    r_frame_rate?: string
    nb_read_frames?: string
    sample_rate?: string
    channels?: number
  }>
  format?: { format_name?: string; duration?: string }
}

/** `24/1` as 24, `30000/1001` as 29.97…; 0 for anything else. */
function rate(text: string | undefined): number {
  const [top, bottom] = (text ?? '').split('/').map(Number)
  if (top === undefined || bottom === undefined || !(bottom > 0)) return 0
  return Number.isFinite(top / bottom) ? top / bottom : 0
}

/**
 * Whether an MP4's `moov` box comes before its `mdat` (D-056), read from the file's top-level boxes.
 * False when it has no `moov`.
 */
async function moovBeforeMdat(path: string): Promise<boolean> {
  const bytes = await readFile(path)
  let at = 0
  while (at + 8 <= bytes.length) {
    let size = bytes.readUInt32BE(at)
    const type = bytes.toString('latin1', at + 4, at + 8)
    if (type === 'moov') return true
    if (type === 'mdat') return false
    if (size === 1 && at + 16 <= bytes.length) size = Number(bytes.readBigUInt64BE(at + 8))
    else if (size === 0) size = bytes.length - at
    if (size < 8) return false
    at += size
  }
  return false
}

const seconds = (text: string) => Number(text)

/** `Duration: 00:00:09.00` as 9, from ffmpeg's account of its input. */
function inputDuration(stderr: string): number | null {
  const match = /Duration: (\d+):(\d+):(\d+(?:\.\d+)?)/.exec(stderr)
  if (match === null) return null
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3])
}

/**
 * Stretches a detector opened with `open` and closed with `close` in ffmpeg's log, in order. One the
 * file ends inside is reported with no end — a freeze or a silence that runs to the last frame — and
 * lasts until the file does.
 */
function stretches(
  stderr: string,
  open: RegExp,
  close: RegExp,
  until: number | null,
): Array<{ startSeconds: number; seconds: number }> {
  const found: Array<{ startSeconds: number; seconds: number }> = []
  let started: number | null = null
  const lines = stderr.split(/\r?\n/)
  for (const line of lines) {
    const opened = open.exec(line)
    if (opened?.[1] !== undefined) {
      started = seconds(opened[1])
      continue
    }
    const closed = close.exec(line)
    if (closed?.[1] !== undefined && started !== null) {
      found.push({ startSeconds: started, seconds: seconds(closed[1]) - started })
      started = null
    }
  }
  if (started !== null && until !== null) {
    found.push({ startSeconds: started, seconds: Math.max(0, until - started) })
  }
  return found
}

export function ffmpegMedia(
  tools: FfmpegTools,
  options: { artifactRoot?: string; script?: FakeMediaScript } = {},
): FfmpegMedia {
  const script = options.script ?? {}
  const root = options.artifactRoot ?? DEFAULT_ARTIFACT_ROOT
  const calls: MediaCall[] = []

  /** The script's entry for an id, or the throw it asks this method for. */
  const scripted = (method: MediaMethod, id: string): FakeMediaEntry => {
    const entry = entryFor(script, id) ?? {}
    const thrown = entry.throws?.[method]
    if (thrown !== undefined) throw new Error(thrown)
    return entry
  }

  return {
    calls,

    ready() {
      return tools.ready()
    },

    async probe(file) {
      calls.push({ method: 'probe', id: file.id, path: file.path })
      scripted('probe', file.id)
      const ran = await tools.run('ffprobe', [
        '-v',
        'error',
        '-count_frames',
        '-show_entries',
        'stream=codec_type,codec_name,width,height,r_frame_rate,nb_read_frames,sample_rate,channels:format=format_name,duration',
        '-of',
        'json',
        file.path,
      ])
      if (ran.code !== 0) return { ...UNREADABLE }
      let probed: Probed
      try {
        probed = JSON.parse(ran.stdout) as Probed
      } catch {
        return { ...UNREADABLE }
      }
      if (probed.format === undefined) return { ...UNREADABLE }
      const streams = probed.streams ?? []
      const video = streams.find((s) => s.codec_type === 'video')
      const audio = streams.find((s) => s.codec_type === 'audio')
      const mp4 = (probed.format.format_name ?? '').split(',').includes('mp4')
      return {
        readable: true,
        durationSeconds: Number(probed.format.duration ?? 0) || 0,
        video:
          video === undefined
            ? null
            : {
                codec: video.codec_name ?? '',
                width: video.width ?? 0,
                height: video.height ?? 0,
                fps: rate(video.r_frame_rate),
                frames: Number(video.nb_read_frames ?? 0) || 0,
              },
        audio:
          audio === undefined
            ? null
            : {
                codec: audio.codec_name ?? '',
                sampleRate: Number(audio.sample_rate ?? 0) || 0,
                channels: audio.channels ?? 0,
              },
        moovFirst: mp4 ? await moovBeforeMdat(file.path) : null,
      }
    },

    async scan(clip: ClipRef, shortest): Promise<ClipScan> {
      calls.push({ method: 'scan', id: clip.takeId, path: clip.path, shortest: { ...shortest } })
      scripted('scan', clip.takeId)
      // One pass over the whole file. Each detector is handed the shortest stretch it reports: their
      // own defaults are two seconds, so a shorter threshold would otherwise never be reached. The
      // detectors report at ffmpeg's info level, on stderr, so no quieter log level is asked for.
      const ran = await tools.run('ffmpeg', [
        '-hide_banner',
        '-nostats',
        '-i',
        clip.path,
        '-vf',
        `blackdetect=d=${shortest.blackSeconds},freezedetect=d=${shortest.frozenSeconds}`,
        '-af',
        'silencedetect,ebur128=framelog=quiet',
        '-f',
        'null',
        '-',
      ])
      if (ran.code !== 0) {
        throw new Error(
          `the scan of ${clip.takeId} ended with code ${ran.code}: ${ran.stderr.trim().split(/\r?\n/).slice(-3).join(' | ')}`,
        )
      }
      const { stderr } = ran
      const until = inputDuration(stderr)
      const black = [
        ...stderr.matchAll(/black_start:(\S+) black_end:(\S+) black_duration:(\S+)/g),
      ].map((m) => ({ startSeconds: seconds(m[1] ?? ''), seconds: seconds(m[3] ?? '') }))
      const frozen = stretches(
        stderr,
        /lavfi\.freezedetect\.freeze_start: (\S+)/,
        /lavfi\.freezedetect\.freeze_end: (\S+)/,
        until,
      )
      const silent = stretches(stderr, /silence_start: (\S+)/, /silence_end: (\S+)/, until)
      const loudness = /Integrated loudness:\s*\r?\n\s*I:\s*(-?\d+(?:\.\d+)?)\s*LUFS/.exec(stderr)
      return {
        black,
        frozen,
        silent,
        loudnessLufs: loudness?.[1] === undefined ? null : Number(loudness[1]),
      }
    },

    async readText(clip) {
      calls.push({ method: 'readText', id: clip.takeId, path: clip.path })
      return [...(scripted('readText', clip.takeId).words ?? [])]
    },

    async listen(clip): Promise<ClipSound> {
      calls.push({ method: 'listen', id: clip.takeId, path: clip.path })
      const entry = scripted('listen', clip.takeId)
      return { speech: entry.speech ?? false, music: entry.music ?? false }
    },

    async frames(file, atSeconds) {
      calls.push({ method: 'frames', id: file.renderId, path: file.path })
      scripted('frames', file.renderId)
      // `<root>/<runId>/<renderId>-frame-<n>.png`, refused before anything is read or written when
      // either id would leave the root (D-086).
      const pathOf = (n: number) =>
        artifactPath(
          root,
          { runId: file.runId, id: `${file.renderId}-frame-${n}`, what: 'renderId' },
          '.png',
          'the frame strip',
        )
      pathOf(0)
      if (atSeconds.length === 0) return []

      // A time is a frame of THIS file: the one its frame rate puts there.
      const asked = await tools.run('ffprobe', [
        '-v',
        'error',
        '-select_streams',
        'v:0',
        '-show_entries',
        'stream=r_frame_rate',
        '-of',
        'json',
        file.path,
      ])
      let fps = 0
      try {
        fps = rate((JSON.parse(asked.stdout) as Probed).streams?.[0]?.r_frame_rate)
      } catch {
        fps = 0
      }
      if (asked.code !== 0 || !(fps > 0)) {
        throw new Error(`the frame strip of ${file.renderId} found no frame rate in ${file.path}`)
      }
      const numbers = atSeconds.map((seconds) => Math.max(0, Math.round(seconds * fps)))
      // One pass writes each frame once, in the file's order; a frame asked for twice is one file.
      const written = [...new Set(numbers)].sort((x, y) => x - y)
      const picked: StripFilter = 'select'
      mkdirSync(dirname(pathOf(0)), { recursive: true })
      const ran = await tools.run('ffmpeg', [
        '-hide_banner',
        '-nostdin',
        '-y',
        '-i',
        file.path,
        '-vf',
        `${picked}='${written.map((n) => `eq(n,${n})`).join('+')}'`,
        '-fps_mode',
        'passthrough',
        '-start_number',
        '0',
        // The numbered name the image writer fills in; a `%` of the folder's own is kept literal.
        join(dirname(pathOf(0)).replace(/%/g, '%%'), `${file.renderId}-frame-%d.png`),
      ])
      if (ran.code !== 0) {
        throw new Error(
          `the frame strip of ${file.renderId} ended with code ${ran.code}: ${ran.stderr.trim().split(/\r?\n/).slice(-3).join(' | ')}`,
        )
      }
      return numbers.map((number) => {
        const n = written.indexOf(number)
        const path = pathOf(n)
        if (!existsSync(path)) {
          throw new Error(`the frame strip of ${file.renderId} has no frame ${number} at ${path}`)
        }
        return { pictureId: `${file.renderId}-frame-${n}`, path }
      })
    },
  }
}
