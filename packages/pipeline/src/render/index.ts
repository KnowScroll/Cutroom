import { failureKindOf } from '@cutroom/contracts'
import type {
  FailureKind,
  AssembledFile,
  AssemblerPort,
  CutVerdict,
  LanguageModelPort,
  MediaPort,
  MediaProbe,
  PictureRef,
  RenderManifest,
  RenderSettings,
} from '@cutroom/contracts'
import { gate7 } from '../gates/gate7.ts'
import { GATE_ORDER } from '../gates/index.ts'

// The cut stage (docs/features/reel-render.md, Gate 2 "The one pass" and "Gate 7"; S-073, S-074). The
// worker calls `cutReel` with a render manifest already on its render row, and it answers with how the
// cut ended and everything it made: the assembled file, its measure, the frame strip and Gate 7's
// verdict. It never rejects — a thrown call, a refused parse or a bug becomes a failed outcome, with
// what was made before it — and it is handed no port that buys (I-18).
//
// Its settings' default sits beside it, as DEFAULT_STILLS_SETTINGS sits beside `makeStills`.

export const DEFAULT_RENDER_SETTINGS: RenderSettings = {
  // D-055: one profile for every reel — provisional until M-7.
  profile: {
    container: 'mp4',
    videoCodec: 'h264',
    audioCodec: 'aac',
    width: 768,
    height: 1366,
    fps: 24,
    sampleRate: 48000,
    channels: 2,
  },
  // D-052, S-067: config, and exactly one is defined.
  gateProfile: { id: 'phase-1', gates: GATE_ORDER },
  // D-019, S-070: T2A is covered by the token plan.
  narrationRateCentsPerCharacter: 0,
  // The only narration port is a stand-in, which speaks one tone whatever it is told; a real voice
  // is the paid path's to name.
  voice: 'stand-in',
  // D-072: the only value the research read; which rewrites least is O-20.
  promptExpansionMode: 'balanced',
  // S-072: provisional until M-1.
  technical: { aspectTolerance: 0.01, blackSeconds: 0.5, frozenSeconds: 1.0 },
  // S-073: burned from the manifest's captions by the assembler, which reel-render's Slice 4 builds.
  captionStyle: { id: 'word-captions-1', fontName: 'Arial', fontSize: 48, marginV: 200 },
  // S-074: each answered yes when the cut is right, so any no fails Gate 7 (I-16) — provisional
  // until M-1. FOUR, NOT FIVE (docs/features/cut-rules.md, S-158): the fifth asked whether every shot
  // showed something no other shot repeats, and refused the first black-holes cut for showing black
  // holes; a reel that shows how a thing works shows that thing again and again.
  cutQuestions: [
    'Are the shots in a sensible order?',
    'Does the pacing work?',
    'Does every shot sit well beside the shot that follows it?',
    'Do the burned captions follow the narration?',
  ],
  // D-024, I-11, S-096: a call answered unavailable is sent again, three sends in all, a second apart
  // and then two.
  transient: { maxAttempts: 3, backoffMs: 1000 },
  // D-025, S-097: a held shot's slow push — provisional until M-1.
  stillPush: { endZoom: 1.1 },
}

/** What the cut made, whatever ended it: each field is there once its step returned. */
interface CutRecord {
  assembled: AssembledFile | null
  measured: MediaProbe | null
  frames: PictureRef[]
  gate7: CutVerdict | null
}

export type CutOutcome = CutRecord &
  (
    | { kind: 'completed' }
    | { kind: 'stopped-rule'; rule: 'gate-7'; detail: string }
    // The kind of the failure, decided where the error was caught, from its class (S-163).
    | { kind: 'failed'; detail: string; failure: FailureKind }
  )

export interface CutPorts {
  assembler: AssemblerPort
  media: MediaPort
  /** Recording. */
  model: LanguageModelPort
}

const messageOf = (error: unknown) => (error instanceof Error ? error.message : String(error))

/**
 * How a measured file differs from the manifest that made it (I-17, S-073): its codecs, geometry,
 * frame rate, sample rate and channels against the profile, its decoded frame count against the
 * manifest's total, and its `moov` before its `mdat` (D-056). Each difference says what was measured
 * and what was asked for; none means the assembler kept its input.
 */
function differences(renderManifest: RenderManifest, measured: MediaProbe): string[] {
  const { profile, totalFrames } = renderManifest
  if (!measured.readable) return ['it is not a readable file']
  const out: string[] = []
  const differs = (what: string, got: unknown, asked: unknown) => {
    if (got !== asked) out.push(`its ${what} is ${String(got)}, not ${String(asked)}`)
  }
  if (measured.video === null) out.push('it has no video stream')
  else {
    differs('video codec', measured.video.codec, profile.videoCodec)
    differs('width', measured.video.width, profile.width)
    differs('height', measured.video.height, profile.height)
    if (Math.abs(measured.video.fps - profile.fps) >= 0.001) {
      differs('frame rate', measured.video.fps, profile.fps)
    }
    differs('frame count', measured.video.frames, totalFrames)
  }
  if (measured.audio === null) out.push('it has no audio stream')
  else {
    differs('audio codec', measured.audio.codec, profile.audioCodec)
    differs('sample rate', measured.audio.sampleRate, profile.sampleRate)
    differs('channels', measured.audio.channels, profile.channels)
  }
  if (measured.moovFirst !== true) out.push('its mdat precedes its moov (D-056)')
  return out
}

/** The frames Gate 7 is shown of a shot: the first, the middle and the last of its span. */
const stripOf = (shot: { startFrame: number; frames: number }) => [
  shot.startFrame,
  shot.startFrame + Math.floor(shot.frames / 2),
  shot.startFrame + shot.frames - 1,
]

export async function cutReel(
  input: { renderManifest: RenderManifest },
  ports: CutPorts,
  settings: RenderSettings,
): Promise<CutOutcome> {
  const { renderManifest } = input
  const made: CutRecord = { assembled: null, measured: null, frames: [], gate7: null }
  const snapshot = (): CutRecord => ({ ...made, frames: [...made.frames] })
  try {
    // The one pass, then its output measured (I-17): a file that is not what its manifest asked for
    // is the assembler breaking its own input, and no cut is judged on it.
    made.assembled = await ports.assembler.assemble(renderManifest)
    const path = made.assembled.path
    made.measured = await ports.media.probe({ id: renderManifest.renderId, path })
    const differing = differences(renderManifest, made.measured)
    if (differing.length > 0) {
      return {
        ...snapshot(),
        kind: 'failed',
        failure: 'engine',
        detail: `the assembled file ${renderManifest.renderId} differs from its render manifest: ${differing.join('; ')}`,
      }
    }

    // The frame strip: three frames a shot, in timeline order (S-074, D-051).
    const at = renderManifest.shots.flatMap(stripOf)
    made.frames = await ports.media.frames(
      { runId: renderManifest.runId, renderId: renderManifest.renderId, path },
      at.map((frame) => frame / renderManifest.profile.fps),
    )
    if (made.frames.length !== at.length) {
      throw new Error(`the frame strip holds ${made.frames.length} frames, not ${at.length}`)
    }

    // Gate 7. A shot's sentences are its narration as the manifest holds it — its words in order,
    // joined by one space, which is how the narration's text was made of them (S-070, S-086).
    made.gate7 = await gate7(
      renderManifest.shots.map((shot, index) => ({
        shotId: shot.shotId,
        sentences: [shot.words.map((w) => w.word).join(' ')],
        frames: made.frames.slice(index * 3, index * 3 + 3),
      })),
      settings.cutQuestions,
      ports.model,
    )
    if (made.gate7.outcome === 'fail') {
      return {
        ...snapshot(),
        kind: 'stopped-rule',
        rule: 'gate-7',
        detail: `the assembled reel ${renderManifest.renderId} failed Gate 7: the judge answered no to ${made.gate7.reasons
          .map((question) => `"${question}"`)
          .join(', ')}. No edit exists to try, so the reel stops (S-066, S-074).`,
      }
    }
    return { ...snapshot(), kind: 'completed' }
  } catch (error) {
    return {
      ...snapshot(),
      kind: 'failed',
      detail: messageOf(error),
      failure: failureKindOf(error),
    }
  }
}
