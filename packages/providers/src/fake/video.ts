import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { crc32 } from 'node:zlib'
import type { VideoPort, VideoRequest } from '@cutroom/contracts'
import { DEFAULT_ARTIFACT_ROOT, artifactPath } from '../artifacts.ts'
import type { FfmpegTools } from '../ffmpeg/tools.ts'
import { entryFor } from './key.ts'
import { checkedFailures, scriptedThrow, type StandInFailure } from './thrown.ts'

// The stand-in VideoPort (docs/features/reel-render.md, Gate 2 "Clips"; S-071, S-075). It is the only
// video port the engine has: it runs on this machine, reads no secret, reaches no network and costs
// nothing unless a test says so (S-036). It writes A REAL MP4 THROUGH FFMPEG for every take (D-087),
// so Gate 2 measures a file and not a script: a moving test pattern, with a band across its top whose
// colour is keyed from the take id — so one shot's frames can be told from the next shot's in an
// output — darkened across its lower third where captions go, and a steady 220 Hz tone as its sound.

/** The model every stand-in receipt names. Nothing real answers to it. */
export const FAKE_VIDEO_MODEL = 'stand-in-video'

/** A small 9:16 picture, at the frame rate and sample rate a small test profile renders at. */
export const FAKE_VIDEO_SHAPE = { width: 108, height: 192, fps: 24, sampleRate: 48000 }

/** A stretch of a clip, from `atSeconds`, `seconds` long. */
export interface Stretch {
  atSeconds: number
  seconds: number
}

/** What the stand-in makes of one take. Every field is optional; the default is a good clip. */
export interface FakeVideoEntry {
  /** A black stretch, or a picture black from its first frame to its last. */
  black?: Stretch | 'whole'
  /** A frozen stretch — its first frame held — or a picture that never moves. */
  frozen?: Stretch | 'whole'
  /** Another size than the stand-in's. */
  size?: { width: number; height: number }
  fps?: number
  sampleRate?: number
  /** A clip with no sound stream, or with no picture stream. */
  without?: 'audio' | 'video'
  /** Bytes that are no video at all. */
  unreadable?: boolean
  /** A clip this many seconds long, whatever was asked for. */
  seconds?: number
  /** What the call reports it cost, in cents. 0 when absent (S-036). */
  costCents?: number
  /** What the provider made of the prompt. The stand-in's own wording when absent. */
  expandedPrompt?: string
  /** The call throws this message instead of making anything. */
  throws?: string
  /**
   * The class the throw is, as a real adapter's would be — its message then that class's for
   * `throws` — or a plain Error when absent (resume-failed, S-163).
   */
  as?: StandInFailure
  /**
   * The first this-many sends of the take id are answered `unavailable` — a provider failing for a
   * moment — and the next is answered as the rest of the entry says (reel-takes, S-096).
   */
  transient?: number
}

/** Entries by `shot-<unit>-take-<n>` — or by a whole take id, which wins. */
export type FakeVideoScript = Readonly<Record<string, FakeVideoEntry>>

export type FakeVideo = VideoPort & {
  /** Every request received, in order — including one that threw. */
  readonly calls: readonly VideoRequest[]
}

/** The filters that draw a take: the pattern's band, the caption shade, and any scripted stretch. */
function picture(entry: FakeVideoEntry, takeId: string, fps: number, frames: number): string {
  const band = (crc32(takeId) & 0xffffff).toString(16).padStart(6, '0')
  const steps = [
    `[0:v]drawbox=x=0:y=0:w=iw:h=ih/5:color=0x${band}:t=fill`,
    'drawbox=x=0:y=ih*2/3:w=iw:h=ih/3:color=black@0.6:t=fill',
  ]
  let graph = steps.join(',')
  if (entry.frozen !== undefined) {
    // Frames `first` to `last` replaced by frame `first`: the picture stops, and nothing else changes.
    const first = entry.frozen === 'whole' ? 0 : Math.round(entry.frozen.atSeconds * fps)
    const last =
      entry.frozen === 'whole'
        ? frames
        : Math.round((entry.frozen.atSeconds + entry.frozen.seconds) * fps) - 1
    graph = `${graph},split[moving][held];[moving][held]freezeframes=first=${first}:last=${last}:replace=${first}`
  }
  if (entry.black !== undefined) {
    // `between` holds both ends, so the stretch ends half a frame early and is exactly its frames.
    const black = entry.black
    const when =
      black === 'whole'
        ? ''
        : `:enable='between(t,${black.atSeconds},${black.atSeconds + black.seconds - 1 / (2 * fps)})'`
    graph = `${graph},drawbox=x=0:y=0:w=iw:h=ih:color=black:t=fill${when}`
  }
  return `${graph}[v]`
}

export function fakeVideo(
  tools: FfmpegTools,
  script: FakeVideoScript,
  options: { artifactRoot?: string } = {},
): FakeVideo {
  checkedFailures('the stand-in video port', Object.entries(script))
  const root = options.artifactRoot ?? DEFAULT_ARTIFACT_ROOT
  const calls: VideoRequest[] = []
  /** How many times each take id has been sent. */
  const sends = new Map<string, number>()
  return {
    calls,
    async generate(request) {
      calls.push(request)
      const entry = entryFor(script, request.takeId) ?? {}
      const send = (sends.get(request.takeId) ?? 0) + 1
      sends.set(request.takeId, send)
      if (entry.transient !== undefined && send <= entry.transient) {
        return {
          kind: 'unavailable',
          detail: `the stand-in video port is unavailable for ${request.takeId}, send ${send} of the ${entry.transient} it was scripted to answer so`,
        }
      }
      if (entry.throws !== undefined) {
        throw scriptedThrow(entry.throws, entry.as, {
          port: 'video',
          model: FAKE_VIDEO_MODEL,
          costCents: entry.costCents ?? 0,
        })
      }
      const path = artifactPath(
        root,
        { runId: request.runId, id: request.takeId, what: 'takeId' },
        '.mp4',
        'the stand-in video port',
      )
      mkdirSync(dirname(path), { recursive: true })

      if (entry.unreadable === true) {
        writeFileSync(path, Buffer.from('these bytes are not a video\n', 'utf8'))
      } else {
        const seconds = entry.seconds ?? request.durationSeconds
        const size = entry.size ?? FAKE_VIDEO_SHAPE
        const fps = entry.fps ?? FAKE_VIDEO_SHAPE.fps
        const sampleRate = entry.sampleRate ?? FAKE_VIDEO_SHAPE.sampleRate
        const inputs: string[] = []
        const graph: string[] = []
        const maps: string[] = []
        if (entry.without !== 'video') {
          inputs.push(
            '-f',
            'lavfi',
            '-i',
            `testsrc2=size=${size.width}x${size.height}:rate=${fps}:duration=${seconds}`,
          )
          graph.push(picture(entry, request.takeId, fps, Math.ceil(seconds * fps)))
          maps.push('-map', '[v]', '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p')
        }
        if (entry.without !== 'audio') {
          const index = entry.without === 'video' ? 0 : 1
          inputs.push(
            '-f',
            'lavfi',
            '-i',
            `sine=frequency=220:sample_rate=${sampleRate}:duration=${seconds}`,
          )
          graph.push(`[${index}:a]aformat=channel_layouts=stereo[a]`)
          maps.push('-map', '[a]', '-c:a', 'aac')
        }
        const ran = await tools.run('ffmpeg', [
          '-hide_banner',
          '-loglevel',
          'error',
          '-y',
          ...inputs,
          '-filter_complex',
          graph.join(';'),
          ...maps,
          path,
        ])
        if (ran.code !== 0) {
          throw new Error(
            `the stand-in video port could not write ${request.takeId}: ${ran.stderr.trim()}`,
          )
        }
      }

      return {
        kind: 'made',
        clip: { takeId: request.takeId, path },
        receipt: {
          model: FAKE_VIDEO_MODEL,
          requestId: `stand-in-${request.runId}-${request.takeId}`,
          costCents: entry.costCents ?? 0,
          fake: true,
          expandedPrompt:
            entry.expandedPrompt ??
            `The stand-in's expansion of ${request.takeId}: ${request.prompt}`,
        },
      }
    },
  }
}
