import { z } from 'zod'
import type {
  Caption,
  MediaProbe,
  NarrationRecord,
  OutputProfile,
  Plan,
  RenderManifest,
  RenderSettings,
  RenderShot,
  TakeRecord,
} from '@cutroom/contracts'
import type { SubmitRequest } from '@cutroom/reel-contract'
import { shotIdOf } from '../stills/place.ts'

// The render manifest (docs/features/reel-render.md, Gate 2 "The render manifest" and "Spans, trims
// and holds"; D-059, S-073). Built by code from the run's rows, validated by its schema, and written
// with its hash on the render row before the assembler is called — with the files it names, the
// assembler's only input. What one must be is the schema; building one is `renderManifest`, below it.

const count = z.number().int().nonnegative()

const probe = z.strictObject({
  readable: z.boolean(),
  durationSeconds: z.number().nonnegative(),
  video: z
    .strictObject({
      codec: z.string(),
      width: count,
      height: count,
      fps: z.number().nonnegative(),
      frames: count,
    })
    .nullable(),
  audio: z.strictObject({ codec: z.string(), sampleRate: count, channels: count }).nullable(),
  moovFirst: z.boolean().nullable(),
})

/**
 * A shot's opening (S-073, D-059). A `text-to-video` shot carries a degradation reason exactly when
 * its picture was degraded (D-050) — placed — and none when the plan gave it no picture (D-027),
 * since nothing was made worse. Strict, so an unplaced opening with a reason is refused.
 */
const opening = z.union([
  z.strictObject({ kind: z.literal('keyframe'), pictureId: z.string().min(1) }),
  z.strictObject({ kind: z.literal('text-to-video'), placed: z.literal(false) }),
  z.strictObject({
    kind: z.literal('text-to-video'),
    placed: z.literal(true),
    degradation: z.string().min(1),
  }),
])

const shot = z.strictObject({
  shotId: z.string().min(1),
  /** Required on every shot (D-036, S-067). */
  joinMode: z.literal('cut'),
  takeId: z.string().min(1),
  requestId: z.string(),
  expandedPrompt: z.string(),
  clipPath: z.string().min(1),
  opening,
  narrationId: z.string().min(1),
  narrationPath: z.string().min(1),
  words: z.array(z.strictObject({ word: z.string(), startMs: count, endMs: count })),
  clip: probe,
  startFrame: count,
  frames: count,
  pictureFrames: count,
  hold: z
    .strictObject({ frames: count, seconds: z.number().nonnegative(), reason: z.string().min(1) })
    .nullable(),
  conform: z.array(z.string()),
  verdicts: z.array(
    z.strictObject({
      gate: z.string().min(1),
      outcome: z.enum(['accept', 'fail']),
      coverage: z.unknown(),
    }),
  ),
})

export const renderManifestSchema: z.ZodType<RenderManifest> = z
  .strictObject({
    runId: z.string().min(1),
    renderId: z.string().min(1),
    profile: z.strictObject({
      container: z.literal('mp4'),
      videoCodec: z.literal('h264'),
      audioCodec: z.literal('aac'),
      width: count,
      height: count,
      fps: z.number().positive(),
      sampleRate: count,
      channels: count,
    }),
    gateProfile: z.strictObject({ id: z.string().min(1), gates: z.array(z.string()) }),
    captionStyle: z.strictObject({
      id: z.string().min(1),
      fontName: z.string().min(1),
      fontSize: z.number().positive(),
      marginV: count,
    }),
    duckDb: z.number().nonnegative(),
    ledger: z.strictObject({ imageCents: count, narrationCents: count, videoCents: count }),
    shots: z.array(shot).min(1),
    captions: z.array(z.strictObject({ text: z.string(), startMs: count, endMs: count })),
    totalFrames: count,
  })
  .superRefine((manifest, context) => {
    // D-057: one narration unit a shot, never spanning a boundary — so no two shots hold one.
    const holder = new Map<string, number>()
    manifest.shots.forEach((s, index) => {
      const first = holder.get(s.narrationId)
      if (first === undefined) {
        holder.set(s.narrationId, index)
        return
      }
      context.addIssue({
        code: 'custom',
        path: ['shots', index, 'narrationId'],
        message: `shots ${first} and ${index} hold one narration, ${s.narrationId} (D-057)`,
      })
    })
  })

// ---------------------------------------------------------------- building one

/** `a<attempt>-render`: the attempt is the assemble job's, so a job run again renders again (S-076). */
export const renderIdOf = (attempt: number) => `a${attempt}-render`

/** What a render manifest is built from: the run's rows, read once the clips job has completed. */
export interface RenderInput {
  runId: string
  /** The assemble job's attempt. */
  attempt: number
  plan: Plan
  request: SubmitRequest
  /** The chosen pictures, each with the verdicts that approved it: Gate 1, and Gate 1S where it ran. */
  stills: ReadonlyArray<{ pictureId: string; shotUnit: number; verdicts: RenderShot['verdicts'] }>
  /** The stills stage's degradations, in the order reached. */
  degradations: ReadonlyArray<{ shotId: string; reason: string }>
  /** The finishing clips attempt's takes, one accepted a shot. */
  takes: readonly TakeRecord[]
  /** The same attempt's narrations. */
  narrations: readonly NarrationRecord[]
  ledger: RenderManifest['ledger']
}

/** Two rates that are one rate: ffprobe gives 30000/1001 as a quotient, never as a setting's digits. */
const sameRate = (x: number, y: number) => Math.abs(x - y) < 0.001

/** A product settled to nine places, so arithmetic noise never tips a whole number over or under. */
const settled = (value: number) => Math.round(value * 1e9) / 1e9

/** Seconds as whole frames, rounded UP (S-073): 3.06 s at 24 is 73.44 frames, a span of 74. */
const framesUp = (seconds: number, fps: number) => Math.ceil(settled(seconds * fps))

/** How many frames of picture a clip gives at the profile's rate, from its measured facts alone. */
function framesAt(video: NonNullable<MediaProbe['video']>, fps: number): number {
  if (sameRate(video.fps, fps)) return video.frames
  if (!(video.fps > 0)) return 0
  return Math.floor(settled((video.frames * fps) / video.fps))
}

/**
 * What the conform does to a clip that is WORTH A NOTE (D-055, S-073): a pad, a frame-rate conversion
 * and added silence. A scale alone and a resample alone record none. Read from the clip's measured
 * facts, as the assembler reads them.
 */
function conformNotes(clip: MediaProbe, profile: OutputProfile): string[] {
  const notes: string[] = []
  const video = clip.video
  if (video !== null && (video.width !== profile.width || video.height !== profile.height)) {
    // Scaled to fit the profile keeping its aspect; whatever the fit leaves is padded.
    const fit = Math.min(profile.width / video.width, profile.height / video.height)
    const width = Math.min(profile.width, Math.round(video.width * fit))
    const height = Math.min(profile.height, Math.round(video.height * fit))
    if (width !== profile.width || height !== profile.height) {
      notes.push(`pad: ${width}×${height} inside ${profile.width}×${profile.height}`)
    }
  }
  if (video !== null && !sameRate(video.fps, profile.fps)) {
    notes.push(`frame rate: ${video.fps} to ${profile.fps}`)
  }
  if (clip.audio === null) notes.push('silence: the clip has no sound, so silence is added')
  return notes
}

/**
 * Builds a run's render manifest from its rows (S-073): every shot of the selected plan in plan order,
 * none removed (I-12), each with its take, its opening, its narration and timings, the clip's measured
 * facts, its span — its measured narration in frames, rounded up, starting where the shot before ends
 * — the picture frames used and its hold, its conform notes, and every verdict decided before
 * assembly; then the captions in reel time, one a narrated word, offset by its shot's start.
 *
 * It THROWS on rows that cannot make one — a shot with no accepted take, a narration never measured —
 * and on a manifest its own schema refuses; the worker fails the run.
 */
export function renderManifest(input: RenderInput, settings: RenderSettings): RenderManifest {
  const { profile } = settings
  const shots: RenderShot[] = []
  const captions: Caption[] = []
  let startFrame = 0

  for (const planned of input.plan.shots) {
    const unit = planned.unit
    const shotId = shotIdOf(unit)
    const take = input.takes.filter((t) => t.shotUnit === unit && t.outcome === 'accept').at(-1)
    if (take === undefined) throw new Error(`${shotId} has no accepted take to render`)
    if (take.probe === null || take.probe.video === null) {
      throw new Error(`${shotId}'s take ${take.takeId} was never measured as a clip`)
    }
    const narration = input.narrations.filter((n) => n.shotUnit === unit).at(-1)
    if (narration === undefined) throw new Error(`${shotId} has no narration to render`)
    if (narration.probe === null || narration.words === null) {
      throw new Error(`${shotId}'s narration ${narration.narrationId} was never measured and timed`)
    }

    // The opening: its chosen picture; words alone because its picture was degraded, with the
    // reason; or words alone because the plan gave it none, with no reason (D-027, D-050).
    const still = input.stills.find((s) => s.shotUnit === unit)
    const degradation = input.degradations.find((d) => d.shotId === shotId)
    let opening: RenderShot['opening']
    if (still !== undefined) {
      if (take.mode !== 'image-to-video' || take.pictureId !== still.pictureId) {
        throw new Error(`${take.takeId} was not made from ${shotId}'s chosen picture`)
      }
      opening = { kind: 'keyframe', pictureId: still.pictureId }
    } else {
      if (take.mode !== 'text-to-video') {
        throw new Error(`${take.takeId} was made from a picture, and ${shotId} has none chosen`)
      }
      opening =
        degradation === undefined
          ? { kind: 'text-to-video', placed: false }
          : { kind: 'text-to-video', placed: true, degradation: degradation.reason }
    }

    // The span is the narration's (S-073). A clip with at least that many frames is trimmed at the
    // tail, the ordinary case; one with fewer holds its last frame for the rest (I-4).
    const frames = framesUp(narration.probe.durationSeconds, profile.fps)
    if (frames < 1) throw new Error(`${shotId}'s narration ${narration.narrationId} has no length`)
    const pictureFrames = Math.min(frames, framesAt(take.probe.video, profile.fps))
    if (pictureFrames < 1) throw new Error(`${shotId}'s take ${take.takeId} has no frame to show`)
    const held = frames - pictureFrames
    const seconds = Math.round((held / profile.fps) * 1000) / 1000
    const hold =
      held === 0
        ? null
        : {
            frames: held,
            seconds,
            reason: `${take.takeId} gives ${pictureFrames} frames of picture at ${profile.fps} a second and its narration spans ${frames}: its last frame is held for ${seconds} s (S-073)`,
          }

    shots.push({
      shotId,
      joinMode: 'cut',
      takeId: take.takeId,
      requestId: take.requestId,
      expandedPrompt: take.expandedPrompt,
      clipPath: take.path,
      opening,
      narrationId: narration.narrationId,
      narrationPath: narration.path,
      words: narration.words.map((w) => ({ ...w })),
      clip: take.probe,
      startFrame,
      frames,
      pictureFrames,
      hold,
      conform: conformNotes(take.probe, profile),
      verdicts: [...(still?.verdicts ?? []), ...take.verdicts].map((v) => ({
        gate: v.gate,
        outcome: v.outcome,
        coverage: v.coverage,
      })),
    })

    // One caption a narrated word, from its start to its end, offset by its shot's start (D-008).
    const startMs = Math.round((startFrame * 1000) / profile.fps)
    for (const word of narration.words) {
      captions.push({
        text: word.word,
        startMs: startMs + word.startMs,
        endMs: startMs + word.endMs,
      })
    }
    startFrame += frames
  }

  return renderManifestSchema.parse({
    runId: input.runId,
    renderId: renderIdOf(input.attempt),
    profile,
    gateProfile: { id: settings.gateProfile.id, gates: [...settings.gateProfile.gates] },
    captionStyle: settings.captionStyle,
    duckDb: settings.duckDb,
    ledger: input.ledger,
    shots,
    captions,
    totalFrames: startFrame,
  })
}
