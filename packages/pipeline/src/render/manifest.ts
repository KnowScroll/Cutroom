import { z } from 'zod'
import type {
  Caption,
  ClipShot,
  MediaProbe,
  NarrationRecord,
  OutputProfile,
  Plan,
  RenderManifest,
  RenderSettings,
  RenderShot,
  StillHold,
  StillHoldShot,
  TakeRecord,
} from '@cutroom/contracts'
import type { SubmitRequest } from '@cutroom/reel-contract'
import { TAKES_A_SHOT } from '../clips/ladder.ts'
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

const span = {
  shotId: z.string().min(1),
  /** Required on every shot (D-036, S-067). */
  joinMode: z.literal('cut'),
  narrationId: z.string().min(1),
  narrationPath: z.string().min(1),
  words: z.array(z.strictObject({ word: z.string(), startMs: count, endMs: count })),
  startFrame: count,
  frames: count,
  conform: z.array(z.string()),
  verdicts: z.array(
    z.strictObject({
      gate: z.string().min(1),
      outcome: z.enum(['accept', 'fail']),
      coverage: z.unknown(),
    }),
  ),
}

/** reel-render's shot: its accepted take's clip (S-073). */
const clipShot = z.strictObject({
  ...span,
  takeId: z.string().min(1),
  requestId: z.string(),
  expandedPrompt: z.string(),
  clipPath: z.string().min(1),
  opening,
  clip: probe,
  pictureFrames: count,
  hold: z
    .strictObject({ frames: count, seconds: z.number().nonnegative(), reason: z.string().min(1) })
    .nullable(),
})

/**
 * A shot held on its chosen picture at its take cap (D-025 rung 2, S-090, S-097). Strict, so a
 * still-hold shot carrying ANY clip field is refused by the branch itself; its `degradation` is
 * required and not empty — D-059's check, which S-073 left to `reel-takes` — and its takes are
 * exactly the three its ladder consumed.
 */
const stillHoldShot = z.strictObject({
  ...span,
  stillHold: z.strictObject({
    pictureId: z.string().min(1),
    path: z.string().min(1),
    probe,
    takeIds: z.array(z.string().min(1)).length(TAKES_A_SHOT),
    degradation: z.string().min(1),
    endZoom: z.number().positive(),
  }),
})

/**
 * A shot is ONE OF TWO BRANCHES, never one object of optional fields (S-104): a clip shot with no
 * `stillHold`, or a still-hold shot with no clip field. Each branch is strict, so a clip shot
 * carrying a `stillHold` and a still-hold shot carrying a take id are refused by construction.
 */
const shot = z.union([clipShot, stillHoldShot])

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
  stills: ReadonlyArray<{ pictureId: string; shotUnit: number; verdicts: ClipShot['verdicts'] }>
  /** The stills stage's degradations, in the order reached. */
  degradations: ReadonlyArray<{ shotId: string; reason: string }>
  /** Each shot's accepted take and each held shot's three, whichever attempt made them (S-092). */
  takes: readonly TakeRecord[]
  /** Each shot's finished narration, whichever attempt made it (S-092). */
  narrations: readonly NarrationRecord[]
  /** The shots held on their chosen pictures, in the order the ladders reached them (S-098). */
  stillHolds: readonly StillHold[]
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
 * What the conform does to a HELD SHOT'S PICTURE that is worth a note (D-055, S-097, S-105): the pad,
 * read from the picture's own probe as a clip's is from its measured facts, and the silence — a
 * picture has no sound. NO FRAME-RATE NOTE: nothing is converted, because `zoompan` MAKES the span's
 * frames at the profile's rate from the one picture, whatever rate ffprobe reports of a PNG.
 */
function stillConformNotes(picture: MediaProbe, profile: OutputProfile): string[] {
  const notes: string[] = []
  const video = picture.video
  if (video !== null && (video.width !== profile.width || video.height !== profile.height)) {
    const fit = Math.min(profile.width / video.width, profile.height / video.height)
    const width = Math.min(profile.width, Math.round(video.width * fit))
    const height = Math.min(profile.height, Math.round(video.height * fit))
    if (width !== profile.width || height !== profile.height) {
      notes.push(`pad: ${width}×${height} inside ${profile.width}×${profile.height}`)
    }
  }
  notes.push('silence: the clip has no sound, so silence is added')
  return notes
}

/** One caption a narrated word, from its start to its end, offset by its shot's start (D-008). */
function pushCaptions(
  captions: Caption[],
  words: ReadonlyArray<{ word: string; startMs: number; endMs: number }>,
  startFrame: number,
  fps: number,
): void {
  const startMs = Math.round((startFrame * 1000) / fps)
  for (const word of words) {
    captions.push({ text: word.word, startMs: startMs + word.startMs, endMs: startMs + word.endMs })
  }
}

/**
 * Builds a run's render manifest from its rows (S-073, S-097): every shot of the selected plan in
 * plan order, none removed (I-12), each with its narration and timings and its span — its measured
 * narration in frames, rounded up, starting where the shot before ends — its conform notes and every
 * verdict decided before assembly; then the captions in reel time, one a narrated word, offset by its
 * shot's start.
 *
 * A shot is ONE OF TWO KINDS. A shot its ladder HELD on its chosen picture carries that picture's id,
 * path and stored probe, its three takes, its reason and the push, and no take, opening, clip
 * measure, picture frames or hold; every other shot carries its accepted take's clip, its opening,
 * the picture frames used and its hold.
 *
 * It THROWS on rows that cannot make one — a shot neither held nor accepted, a narration never
 * measured, or a shot holding TWO accepted takes or TWO finished narrations, which a restart's
 * checkpoints make impossible and a late row would not (S-092) — and on a manifest its own schema
 * refuses; the worker fails the run.
 */
export function renderManifest(input: RenderInput, settings: RenderSettings): RenderManifest {
  const { profile } = settings
  const shots: RenderShot[] = []
  const captions: Caption[] = []
  let startFrame = 0

  for (const planned of input.plan.shots) {
    const unit = planned.unit
    const shotId = shotIdOf(unit)
    // A shot has at most ONE finished narration and at most ONE accepted take, whichever attempt
    // made each: a job run again keeps what an earlier attempt finished and makes no second of
    // either (S-092). Rows holding two are REFUSED, naming the shot, so the assemble job fails the
    // run rather than choosing between them — what S-089's filter on the finishing attempt did.
    const narrations = input.narrations.filter((n) => n.shotUnit === unit)
    if (narrations.length > 1) {
      throw new Error(
        `${shotId} has ${narrations.length} finished narrations — ${narrations
          .map((n) => n.narrationId)
          .join(', ')} — and a render is made of one (S-092)`,
      )
    }
    const narration = narrations[0]
    if (narration === undefined) throw new Error(`${shotId} has no narration to render`)
    if (narration.probe === null || narration.words === null) {
      throw new Error(`${shotId}'s narration ${narration.narrationId} was never measured and timed`)
    }
    const accepted = input.takes.filter((t) => t.shotUnit === unit && t.outcome === 'accept')
    if (accepted.length > 1) {
      throw new Error(
        `${shotId} has ${accepted.length} accepted takes — ${accepted
          .map((t) => t.takeId)
          .join(', ')} — and a render is made of one (S-092)`,
      )
    }

    // The span is the narration's (S-073), whichever kind of shot this is.
    const frames = framesUp(narration.probe.durationSeconds, profile.fps)
    if (frames < 1) throw new Error(`${shotId}'s narration ${narration.narrationId} has no length`)
    const still = input.stills.find((s) => s.shotUnit === unit)
    const span = {
      shotId,
      joinMode: 'cut' as const,
      narrationId: narration.narrationId,
      narrationPath: narration.path,
      words: narration.words.map((w) => ({ ...w })),
      startFrame,
      frames,
    }

    // A SHOT HELD ON ITS CHOSEN PICTURE at its take cap (D-025 rung 2, S-090, S-097): no take, no
    // opening, no clip. Its geometry comes off THE PROBE THE CLIPS STAGE STORED when it held the
    // shot — never taken again here — as a clip's comes off its measured facts (D-055, I-17); its
    // verdicts are its picture's, then its three takes' in the order its ladder consumed them.
    const held = input.stillHolds.find((h) => h.shotUnit === unit)
    if (held !== undefined) {
      if (held.probe.video === null) {
        throw new Error(`${shotId}'s picture ${held.pictureId} was never measured as a picture`)
      }
      const takes = held.takeIds.map((takeId) => {
        const of = input.takes.find((t) => t.takeId === takeId)
        if (of === undefined)
          throw new Error(`${shotId} is held on takes it has no row for: ${takeId}`)
        return of
      })
      const shot: StillHoldShot = {
        ...span,
        stillHold: {
          pictureId: held.pictureId,
          path: held.path,
          probe: held.probe,
          takeIds: [...held.takeIds],
          degradation: held.reason,
          endZoom: settings.stillPush.endZoom,
        },
        conform: stillConformNotes(held.probe, profile),
        verdicts: [...(still?.verdicts ?? []), ...takes.flatMap((t) => t.verdicts)].map((v) => ({
          gate: v.gate,
          outcome: v.outcome,
          coverage: v.coverage,
        })),
      }
      shots.push(shot)
      pushCaptions(captions, narration.words, startFrame, profile.fps)
      startFrame += frames
      continue
    }

    const take = accepted[0]
    if (take === undefined) throw new Error(`${shotId} has no accepted take to render`)
    if (take.probe === null || take.probe.video === null) {
      throw new Error(`${shotId}'s take ${take.takeId} was never measured as a clip`)
    }

    // The opening: its chosen picture; words alone because its picture was degraded, with the
    // reason; or words alone because the plan gave it none, with no reason (D-027, D-050).
    const degradation = input.degradations.find((d) => d.shotId === shotId)
    let opening: ClipShot['opening']
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

    // A clip with at least the span's frames is trimmed at the tail, the ordinary case; one with
    // fewer holds its last frame for the rest (I-4).
    const pictureFrames = Math.min(frames, framesAt(take.probe.video, profile.fps))
    if (pictureFrames < 1) throw new Error(`${shotId}'s take ${take.takeId} has no frame to show`)
    const holdFrames = frames - pictureFrames
    const seconds = Math.round((holdFrames / profile.fps) * 1000) / 1000
    const hold =
      holdFrames === 0
        ? null
        : {
            frames: holdFrames,
            seconds,
            reason: `${take.takeId} gives ${pictureFrames} frames of picture at ${profile.fps} a second and its narration spans ${frames}: its last frame is held for ${seconds} s (S-073)`,
          }

    shots.push({
      ...span,
      takeId: take.takeId,
      requestId: take.requestId,
      expandedPrompt: take.expandedPrompt,
      clipPath: take.path,
      opening,
      clip: take.probe,
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
    pushCaptions(captions, narration.words, startFrame, profile.fps)
    startFrame += frames
  }

  return renderManifestSchema.parse({
    runId: input.runId,
    renderId: renderIdOf(input.attempt),
    profile,
    gateProfile: { id: settings.gateProfile.id, gates: [...settings.gateProfile.gates] },
    captionStyle: settings.captionStyle,
    ledger: input.ledger,
    shots,
    captions,
    totalFrames: startFrame,
  })
}
