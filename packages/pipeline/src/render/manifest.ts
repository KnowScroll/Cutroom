import { z } from 'zod'
import type { RenderManifest } from '@cutroom/contracts'

// The render manifest's schema (docs/features/reel-render.md, Gate 2 "The render manifest"; D-059,
// S-073). Built by code from the run's rows, validated here, and written with its hash on the render
// row before the assembler is called — with the files it names, the assembler's only input. Building
// one is Slice 4's `renderManifest`; what one must be is here.

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
