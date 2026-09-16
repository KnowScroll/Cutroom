import type { MediaProbe } from './clip.ts'
import type { WordTiming } from './narration.ts'

// The render shapes and the assembler's port (docs/features/reel-render.md, Gate 3; S-067, S-073,
// S-074). Types only. What one render is made from is ONE document, the render manifest, and the
// assembler reads nothing else (D-059). No type or field here is named for "the manifest" alone —
// the keyframe manifest and the render manifest were once both called that — and nothing here is an
// end card: the engine sends the video and nothing about its sources (D-101).

/** Identical for every reel (D-055). */
export interface OutputProfile {
  container: 'mp4'
  videoCodec: 'h264'
  audioCodec: 'aac'
  width: number
  height: number
  fps: number
  sampleRate: number
  channels: number
}

/** Config, and exactly one is defined (D-052, S-067). */
export interface GateProfile {
  /** `phase-1`. */
  id: string
  /** GATE_ORDER; a worker handed other gates refuses to start (S-067). */
  gates: readonly string[]
}

export interface Caption {
  text: string
  /** Reel time. */
  startMs: number
  endMs: number
}

type Outcome = 'accept' | 'fail'

export interface RenderShot {
  shotId: string
  /** Required: every reel is D-036's default while no plan declares a chain (S-067). */
  joinMode: 'cut'
  takeId: string
  requestId: string
  expandedPrompt: string
  clipPath: string
  opening:
    | { kind: 'keyframe'; pictureId: string }
    /** The plan gave the shot no picture (D-027): no reason, since nothing was made worse. */
    | { kind: 'text-to-video'; placed: false }
    /** Its picture was degraded (D-050): the reason is carried (I-4, S-073). */
    | { kind: 'text-to-video'; placed: true; degradation: string }
  narrationId: string
  narrationPath: string
  /** Unit time. */
  words: WordTiming[]
  /** Measured, and the conform's only source for a clip's geometry and rates (D-055). */
  clip: MediaProbe
  startFrame: number
  /** The span: ceil(narration seconds × fps) (S-073). */
  frames: number
  /** At most `frames`. */
  pictureFrames: number
  hold: { frames: number; seconds: number; reason: string } | null
  conform: string[]
  /** Every verdict decided before assembly (S-073). */
  verdicts: Array<{ gate: string; outcome: Outcome; coverage: unknown }>
}

export interface RenderManifest {
  runId: string
  /** `a<attempt>-render`. */
  renderId: string
  profile: OutputProfile
  /** The profile that ran (D-052). */
  gateProfile: GateProfile
  captionStyle: { id: string; fontName: string; fontSize: number; marginV: number }
  duckDb: number
  ledger: { imageCents: number; narrationCents: number; videoCents: number }
  /** Every shot of the selected plan, in plan order (I-12). */
  shots: RenderShot[]
  captions: Caption[]
  totalFrames: number
}

export interface AssembledFile {
  /** `<artifact root>/<runId>/<renderId>.mp4`. */
  path: string
  /** Exactly one (D-054). */
  invocations: ReadonlyArray<readonly string[]>
}

export interface AssemblerPort {
  ready(): Promise<void>
  /** Refuses a run or render id whose path would leave the artifact root (D-086). */
  assemble(renderManifest: RenderManifest): Promise<AssembledFile>
}

/** Gate 7's verdict on the assembled file (S-074). */
export interface CutVerdict {
  outcome: Outcome
  /** I-6. */
  coverage: { strategy: 'frames'; frames: number }
  answer: Array<{ question: string; answer: 'yes' | 'no' }>
  /** The questions answered no. */
  reasons: string[]
}
