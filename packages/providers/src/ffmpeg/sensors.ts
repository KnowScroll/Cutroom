import {
  Unanswered,
  type PictureMeasure,
  type PictureRef,
  type PictureSensorPort,
} from '@cutroom/contracts'
import { visibleText } from '../text.ts'
import type { FfmpegTools, SensorFilter } from './tools.ts'

// THE REAL PictureSensorPort (docs/features/paid-path.md, Gate 2 "The sensor"; checks 18 and 19;
// S-112, S-126). The FIFTH and LAST real adapter, and the only one that costs nothing, reads no
// key and reaches no network: its three measures are the ffmpeg this repository already requires
// (S-075), run on a file that is already on this machine.
//
// WHY THE MEASURES ARE FILTERS AND THE TEXT STEP IS A MODEL CALL. ffmpeg computes the three
// numbers exactly and repeatably, where a model would not; but this ffmpeg has NO `ocr` filter
// and no tesseract — checked on this machine on 2026-09-20 — so a local text step could only ever
// answer "no text", which is a gate that always passes. Of the two ways left, a new tool on PATH
// (which S-075 exists to keep to one) or one call to the model the engine already shows pictures
// to, S-112 chose the call. That is why a FAILED call throws here: an empty list on a failure is
// the always-passing gate arriving by another road.
//
// THE PORT IS HANDED THE CALL, NOT A MODEL PORT (S-126). `readText` takes a `PictureTextReader`,
// made by the pipeline from the model port that gate was given — which inside a worker is the
// recording one, so the vision call leaves a `model_receipt` row like every other (D-084). And
// `measure` and `similarity` are handed nothing, so "no model call, no spend" holds for them by
// construction rather than by inspection.
//
// WHAT IS READ, AND FROM WHERE. Both filtergraphs print what they measured on STDOUT — the
// metadata filter's `file=-`, and ssim's `stats_file=-` — so no log level can silence them and
// nothing here depends on ffmpeg's log format. The scan in `./media.ts` parses stderr because its
// detectors report only there (S-072); these two do not have to, and a measure that survives
// `-loglevel quiet` is a measure that cannot be silently lost.

/** How a picture is read in, so a value never depends on how a file happened to be encoded. */
const PIXEL_FORMAT = 'yuv420p'

/**
 * Where a Y plane's black and white sit: LIMITED RANGE, which is what ffmpeg converts a PNG to.
 * Measured on this machine — a black frame reports 16 and a white one 235.
 *
 * A file that is already YUV and tagged FULL range is not rescaled by `format`, measured here on
 * 2026-09-21: a full-range black JPEG reports 0, with or without it. So the CLAMP below is
 * load-bearing rather than defensive — without it such a file measures a negative brightness,
 * which is outside the range `PictureMeasure` declares. Every picture this engine makes is a PNG
 * from its own image port, and a file from anywhere else is still answered inside the range.
 */
const Y_BLACK = 16
const Y_WHITE = 235

/**
 * The `blurdetect` reading at which sharpness reaches 0. Measured here on 2026-09-21: a `testsrc`
 * frame reads about 4.7 and the same frame through `boxblur=6:2` reads about 27.6.
 *
 * It is a DECLARED figure and an option, not a number spelled where the measure is taken, for
 * S-124's reason: a constant at a call site cannot be changed by a test, so a test cannot tell it
 * from a figure that happens to be right. **Provisional until M-1**, like every other unmeasured
 * threshold here (D-031, S-044) — sharpness feeds the keyframe score's weighted sum and no gate's
 * pass or fail, so what it costs to be wrong is an ordering, not a refusal.
 */
export const BLUR_FLOOR = 30

export interface FfmpegSensorOptions {
  /** The blurdetect reading at which sharpness reaches 0. Default `BLUR_FLOOR`. */
  blurFloor?: number
}

const UNREADABLE: PictureMeasure = {
  readable: false,
  width: 0,
  height: 0,
  sharpness: 0,
  brightness: 0,
}

/** What ffprobe is asked about one file, and nothing else. */
interface Probed {
  streams?: Array<{ codec_type?: string; width?: number; height?: number }>
}

const clamp = (value: number, low: number, high: number): number =>
  Math.min(high, Math.max(low, value))

/** One `lavfi.*` value the metadata filter printed, or null when it printed none. */
function printed(stdout: string, key: string): number | null {
  // `lavfi.blur=4.652907`, `lavfi.signalstats.YAVG=126.379` — one per line, on stdout.
  const match = new RegExp(`^${key.replace(/\./g, '\\.')}=(\\S+)$`, 'm').exec(stdout)
  if (match?.[1] === undefined) return null
  const value = Number(match[1])
  // `blurdetect` reports `nan` for a frame with no edge to measure at all.
  return Number.isFinite(value) ? value : null
}

/** A filter this port declared, so no filtergraph here names one `ready()` never asked for. */
const filter = (name: SensorFilter): string => name

export function ffmpegSensors(
  tools: FfmpegTools,
  options: FfmpegSensorOptions = {},
): PictureSensorPort {
  const blurFloor = options.blurFloor ?? BLUR_FLOOR

  /** The file's own frame, and whether ffprobe reads a picture in it at all. */
  async function frameOf(picture: PictureRef): Promise<{ width: number; height: number } | null> {
    const ran = await tools.run('ffprobe', [
      '-v',
      'error',
      '-select_streams',
      'v:0',
      '-show_entries',
      'stream=codec_type,width,height',
      '-of',
      'json',
      picture.path,
    ])
    if (ran.code !== 0) return null
    let probed: Probed
    try {
      probed = JSON.parse(ran.stdout) as Probed
    } catch {
      return null
    }
    const video = (probed.streams ?? []).find((s) => s.codec_type === 'video')
    const width = video?.width ?? 0
    const height = video?.height ?? 0
    return width > 0 && height > 0 ? { width, height } : null
  }

  return {
    async measure(picture) {
      // A file that is not a picture MEASURES UNREADABLE and does not throw (check 18): a picture
      // the image port wrote badly is a failed technical step, which is a verdict the run keeps
      // (S-031), not an exception that ends it.
      const frame = await frameOf(picture)
      if (frame === null) return { ...UNREADABLE }

      // One pass over the one frame. `format` pins the plane the two detectors read rather than
      // leaving it to whatever conversion the input happens to need, and `metadata` prints what
      // they put on the frame. It does NOT normalise the range — that is the clamp's job, above.
      const ran = await tools.run('ffmpeg', [
        '-hide_banner',
        '-nostdin',
        '-nostats',
        '-i',
        picture.path,
        '-vf',
        `${filter('format')}=${PIXEL_FORMAT},${filter('blurdetect')},` +
          `${filter('signalstats')}=stat=all,${filter('metadata')}=mode=print:file=-`,
        '-f',
        'null',
        '-',
      ])
      if (ran.code !== 0) return { ...UNREADABLE }

      const blur = printed(ran.stdout, 'lavfi.blur')
      const luma = printed(ran.stdout, 'lavfi.signalstats.YAVG')
      return {
        readable: true,
        width: frame.width,
        height: frame.height,
        // Higher blur is softer. A frame with no edge at all reports `nan`, and is not sharp:
        // answering 1 there would put a flat picture above every real one in the score (S-044).
        sharpness: blur === null ? 0 : clamp(1 - blur / blurFloor, 0, 1),
        brightness: luma === null ? 0 : clamp((luma - Y_BLACK) / (Y_WHITE - Y_BLACK), 0, 1),
      }
    },

    async readText(picture, read) {
      // ONE call, and the strings it answers are this port's answer (check 19). Nothing is caught
      // here: a call that failed — refused, unreachable, or answering something that is not this
      // shape — must fail the step, because a text step that cannot fail is a gate that cannot
      // fail (S-112). An answer that arrives and is not this shape is an `Unanswered`: a new run's
      // ask could read it (S-163).
      const answer = await read(picture)
      const parsed = visibleText.safeParse(answer)
      if (!parsed.success) {
        throw new Unanswered(
          `the text step's answer for ${picture.pictureId} is not readable text: ` +
            parsed.error.issues
              .map((i) => `${i.path.join('.') || '(answer)'}: ${i.message}`)
              .join('; '),
        )
      }
      return [...parsed.data.text]
    },

    async similarity(a, b) {
      // `scale2ref` holds the second picture to the first's frame, so two pictures of different
      // sizes are compared rather than refused — ssim needs one frame size, and every picture that
      // reaches Gate 1S is 9:16 but not necessarily the same 9:16 (D-028).
      const ran = await tools.run('ffmpeg', [
        '-hide_banner',
        '-nostdin',
        '-nostats',
        '-i',
        a.path,
        '-i',
        b.path,
        '-lavfi',
        `[1:v][0:v]${filter('scale2ref')}[b][a];` +
          `[a]${filter('format')}=${PIXEL_FORMAT}[ay];` +
          `[b]${filter('format')}=${PIXEL_FORMAT}[by];` +
          `[ay][by]${filter('ssim')}=stats_file=-`,
        '-f',
        'null',
        '-',
      ])
      if (ran.code !== 0) {
        throw new Error(
          `the similarity of ${a.pictureId} and ${b.pictureId} ended with code ${ran.code}: ` +
            ran.stderr.trim().split(/\r?\n/).slice(-3).join(' | '),
        )
      }
      // `n:1 Y:0.889498 U:… V:… All:0.875395 (9.044660)` — one line a frame, on stdout.
      const match = /\bAll:(\S+)/.exec(ran.stdout)
      const value = Number(match?.[1] ?? Number.NaN)
      if (!Number.isFinite(value)) {
        throw new Error(
          `the similarity of ${a.pictureId} and ${b.pictureId} was not reported by ssim`,
        )
      }
      return clamp(value, -1, 1)
    },
  }
}
