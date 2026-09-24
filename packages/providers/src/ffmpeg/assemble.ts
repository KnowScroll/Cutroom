import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import type {
  AssemblerPort,
  Caption,
  ClipShot,
  RenderManifest,
  RenderShot,
  StillHoldShot,
} from '@cutroom/contracts'
import { DEFAULT_ARTIFACT_ROOT, artifactPath } from '../artifacts.ts'
import type { FfmpegTools, PassFilter } from './tools.ts'

// The AssemblerPort on ffmpeg (docs/features/reel-render.md, Gate 2 "The one pass"; S-073, S-075).
//
// ONE INVOCATION (D-054): it reads every clip and narration file the render manifest names and writes
// one MP4 — one decode, one encode, the shots joined by the concat FILTER inside the one filtergraph,
// so no seam between separately encoded pieces can exist. Nothing is written in pieces and no stream
// is passed through unencoded.
//
// THE RENDER MANIFEST IS ITS ONLY INPUT (D-059), with the files it names: it reads no database, no
// setting and no network, and it never measures a clip — a clip's geometry, frame rate, sample rate
// and channels come from the shot's measured facts in the manifest (D-055), which a video request
// carries none of.
//
// A SHOT IS ONE OF TWO KINDS (S-097). A clip shot reads its take's clip. A STILL-HOLD SHOT reads its
// chosen picture's file in place of one, conformed from THAT PICTURE'S OWN PROBE — the second
// measured source the manifest carries — then pushed in by `zoompan`, which makes exactly the span's
// frames from the one picture; its sound is silence for the span, lowered by nothing, with its
// narration mixed over it. Both kinds are joined by the same `concat` filter in the one filtergraph.

export type FfmpegAssembler = AssemblerPort & {
  /** Every render manifest the assembler was handed, in order — including one it refused. */
  readonly renderManifests: readonly RenderManifest[]
}

/** One filter of the pass, by a name `ready()` has checked the tools for (S-075). */
const filter = (name: PassFilter, options = '') => (options === '' ? name : `${name}=${options}`)

/** Two rates that are one rate: a probe gives 30000/1001 as a quotient, never as a profile's digits. */
const sameRate = (x: number, y: number) => Math.abs(x - y) < 0.001

const layoutOf = (channels: number) =>
  channels === 1 ? 'mono' : channels === 2 ? 'stereo' : `${channels}c`

/**
 * A file's name as the value of a filter's option. A filtergraph is read twice — once as a graph,
 * once as the filter's options — so the name is quoted for the first reading and its `:` escaped for
 * the second; a Windows path's `\` would be an escape in both, and ffmpeg takes `/` there.
 */
const asOption = (path: string) =>
  `'${path.replace(/\\/g, '/').replace(/:/g, '\\:').replace(/'/g, "'\\''")}'`

/** `0:00:16.30`, the subtitles file's clock: hours, minutes, seconds and hundredths. */
function clock(ms: number): string {
  const hundredths = Math.round(ms / 10)
  const two = (n: number) => String(n).padStart(2, '0')
  const seconds = Math.floor(hundredths / 100)
  return `${Math.floor(seconds / 3600)}:${two(Math.floor(seconds / 60) % 60)}:${two(seconds % 60)}.${two(hundredths % 100)}`
}

/**
 * The subtitles file: one event a caption, in reel time (D-008, S-073). Its geometry is THE
 * PROFILE'S, so the style's font size and margin are the output's own pixels (S-084).
 */
function subtitles(renderManifest: RenderManifest): string {
  const { profile, captionStyle } = renderManifest
  const outline = Math.max(1, Math.round(captionStyle.fontSize / 16))
  const text = (caption: Caption) =>
    caption.text.replace(/\s+/g, ' ').replace(/\\/g, '/').replace(/[{}]/g, '')
  return [
    '[Script Info]',
    'ScriptType: v4.00+',
    `PlayResX: ${profile.width}`,
    `PlayResY: ${profile.height}`,
    'WrapStyle: 2',
    'ScaledBorderAndShadow: yes',
    '',
    '[V4+ Styles]',
    'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
    `Style: ${captionStyle.id.replace(/,/g, ' ')},${captionStyle.fontName.replace(/,/g, ' ')},${captionStyle.fontSize},&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,${outline},0,2,0,0,${captionStyle.marginV},1`,
    '',
    '[Events]',
    'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
    ...renderManifest.captions.map(
      (caption) =>
        `Dialogue: 0,${clock(caption.startMs)},${clock(caption.endMs)},${captionStyle.id.replace(/,/g, ' ')},,0,0,0,,${text(caption)}`,
    ),
    '',
  ].join('\n')
}

/**
 * One shot's picture: conformed to the profile from its measured facts, then trimmed to the frames
 * its span uses and, where those are fewer than the span, its last frame held for the rest.
 */
function pictureOf(shot: ClipShot, input: number, profile: RenderManifest['profile']): string {
  const video = shot.clip.video
  if (video === null) throw new Error(`${shot.takeId} was measured with no video stream`)
  const steps: string[] = []
  if (video.width !== profile.width || video.height !== profile.height) {
    // Scaled to fit the profile keeping its aspect; whatever the fit leaves is padded (D-055).
    const fit = Math.min(profile.width / video.width, profile.height / video.height)
    const width = Math.min(profile.width, Math.round(video.width * fit))
    const height = Math.min(profile.height, Math.round(video.height * fit))
    steps.push(filter('scale', `${width}:${height}`))
    if (width !== profile.width || height !== profile.height) {
      // Centred, to an even offset: a 4:2:0 picture's colour is one sample to two rows and two
      // columns, and ffmpeg moves an odd offset down to the even one below it whatever it is asked.
      const x = Math.floor((profile.width - width) / 4) * 2
      const y = Math.floor((profile.height - height) / 4) * 2
      steps.push(filter('pad', `${profile.width}:${profile.height}:${x}:${y}:black`))
    }
  }
  steps.push(filter('setsar', '1'))
  if (!sameRate(video.fps, profile.fps)) steps.push(filter('fps', String(profile.fps)))
  steps.push(filter('format', 'yuv420p'))
  steps.push(filter('trim', `end_frame=${shot.pictureFrames}`))
  const held = shot.frames - shot.pictureFrames
  if (held > 0) steps.push(filter('tpad', `stop_mode=clone:stop=${held}`))
  return `[${input}:v]${steps.join(',')}`
}

/**
 * A HELD SHOT'S PICTURE (D-025 rung 2, S-097): its file, conformed to the profile from its own probe
 * exactly as a clip is from its measured facts — scaled to fit keeping its aspect, padded, square
 * pixels — and then `zoompan`, which makes EXACTLY the span's frames from that one picture at the
 * profile's rate, zooming from 1 at the first to `endZoom` at the last, centred. Its `s` and `fps`
 * are given: zoompan's own defaults are 720p at 25, which would join no other shot.
 */
function stillOf(shot: StillHoldShot, input: number, profile: RenderManifest['profile']): string {
  const video = shot.stillHold.probe.video
  if (video === null) throw new Error(`${shot.stillHold.pictureId} was measured with no picture`)
  const steps: string[] = []
  if (video.width !== profile.width || video.height !== profile.height) {
    const fit = Math.min(profile.width / video.width, profile.height / video.height)
    const width = Math.min(profile.width, Math.round(video.width * fit))
    const height = Math.min(profile.height, Math.round(video.height * fit))
    steps.push(filter('scale', `${width}:${height}`))
    if (width !== profile.width || height !== profile.height) {
      const x = Math.floor((profile.width - width) / 4) * 2
      const y = Math.floor((profile.height - height) / 4) * 2
      steps.push(filter('pad', `${profile.width}:${profile.height}:${x}:${y}:black`))
    }
  }
  steps.push(filter('setsar', '1'))
  steps.push(filter('format', 'yuv420p'))
  // `on` is the output frame, 0 at the first and frames - 1 at the last; one frame holds zoom 1.
  const { endZoom } = shot.stillHold
  const zoom = shot.frames > 1 ? `1+(${endZoom}-1)*on/${shot.frames - 1}` : '1'
  steps.push(
    filter(
      'zoompan',
      [
        `z=${zoom}`,
        `d=${shot.frames}`,
        'x=iw/2-(iw/zoom/2)',
        'y=ih/2-(ih/zoom/2)',
        `s=${profile.width}x${profile.height}`,
        `fps=${profile.fps}`,
      ].join(':'),
    ),
  )
  steps.push(filter('setsar', '1'))
  return `[${input}:v]${steps.join(',')}`
}

/**
 * One shot's sound: SILENCE for the span, and its narration, fitted to the span, mixed over it —
 * exactly the span's samples, so the join never drifts.
 *
 * A REEL'S ONLY SOUND IS ITS NARRATION (docs/features/cut-rules.md, S-158). A clip's own sound is
 * never read: the video model makes ambience at best and, measured on a real reel, a man's voice at
 * worst (P-007), and nothing in this engine can hear which. So a clip shot's sound is the silence a
 * HELD SHOT has always had (S-097), and the clip input's audio stream is left unused.
 */
function soundOf(
  shot: RenderShot,
  index: number,
  renderManifest: RenderManifest,
): { graph: string[]; out: string } {
  const { profile } = renderManifest
  const at = (frame: number) => Math.round((frame * profile.sampleRate) / profile.fps)
  const samples = at(shot.startFrame + shot.frames) - at(shot.startFrame)
  const layout = layoutOf(profile.channels)
  const fitted = [
    filter('aresample', String(profile.sampleRate)),
    filter('aformat', `sample_fmts=fltp:channel_layouts=${layout}`),
    filter('atrim', `end_sample=${samples}`),
    filter('apad', `whole_len=${samples}`),
  ].join(',')
  const silence = `${filter('anullsrc', `r=${profile.sampleRate}:cl=${layout}`)},${filter('atrim', `end_sample=${samples}`)}`
  return {
    graph: [
      `${silence}[c${index}]`,
      `[${index * 2 + 1}:a]${fitted}[n${index}]`,
      `[c${index}][n${index}]${filter('amix', 'inputs=2:duration=longest:normalize=0')}[a${index}]`,
    ],
    out: `[a${index}]`,
  }
}

export function ffmpegAssembler(
  tools: FfmpegTools,
  options: { artifactRoot?: string } = {},
): FfmpegAssembler {
  const root = options.artifactRoot ?? DEFAULT_ARTIFACT_ROOT
  const renderManifests: RenderManifest[] = []
  return {
    renderManifests,
    ready() {
      return tools.ready()
    },
    async assemble(renderManifest) {
      renderManifests.push(renderManifest)
      const ids = { runId: renderManifest.runId, id: renderManifest.renderId, what: 'renderId' }
      const path = artifactPath(root, ids, '.mp4', 'the assembler')
      const captionsPath = artifactPath(root, ids, '.ass', 'the assembler')
      const { profile, shots } = renderManifest
      if (shots.length === 0) throw new Error(`${renderManifest.renderId} has no shot to assemble`)

      const graph: string[] = []
      const joined: string[] = []
      shots.forEach((shot, index) => {
        const seen =
          shot.stillHold === undefined
            ? pictureOf(shot, index * 2, profile)
            : stillOf(shot, index * 2, profile)
        graph.push(`${seen}[v${index}]`)
        const sound = soundOf(shot, index, renderManifest)
        graph.push(...sound.graph)
        joined.push(`[v${index}]`, sound.out)
      })
      graph.push(`${joined.join('')}${filter('concat', `n=${shots.length}:v=1:a=1`)}[cut][a]`)
      graph.push(`[cut]${filter('ass', asOption(captionsPath))}[v]`)

      mkdirSync(dirname(path), { recursive: true })
      writeFileSync(captionsPath, subtitles(renderManifest), 'utf8')

      const args = [
        '-hide_banner',
        '-nostdin',
        '-y',
        // A held shot's picture takes its clip's place among the inputs, so every shot still has
        // its own pair and the graph's labels stay the shot's index (S-097).
        ...shots.flatMap((shot) => [
          '-i',
          shot.stillHold === undefined ? shot.clipPath : shot.stillHold.path,
          '-i',
          shot.narrationPath,
        ]),
        '-filter_complex',
        graph.join(';'),
        '-map',
        '[v]',
        '-map',
        '[a]',
        '-c:v',
        'libx264',
        '-preset',
        'veryfast',
        '-pix_fmt',
        'yuv420p',
        '-r',
        String(profile.fps),
        '-c:a',
        'aac',
        '-ar',
        String(profile.sampleRate),
        '-ac',
        String(profile.channels),
        '-movflags',
        '+faststart',
        '-f',
        'mp4',
        path,
      ]
      const ran = await tools.run('ffmpeg', args)
      if (ran.code !== 0) {
        throw new Error(
          `the pass of ${renderManifest.renderId} ended with code ${ran.code}: ${ran.stderr.trim().split(/\r?\n/).slice(-3).join(' | ')}`,
        )
      }
      return { path, invocations: [[tools.ffmpeg, ...args]] }
    },
  }
}
