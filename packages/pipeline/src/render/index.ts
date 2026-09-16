import type { RenderSettings } from '@cutroom/contracts'
import { GATE_ORDER } from '../gates/index.ts'

// The cut stage (docs/features/reel-render.md, Gate 3): `cutReel` arrives with assembly, in
// reel-render's Slice 4. Its settings' default is here from Slice 1, as DEFAULT_STILLS_SETTINGS sits
// beside `makeStills`, because the worker refuses a gate profile from its first slice (S-067).

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
  // S-073: the clips' sound, under the narration for the whole span.
  duckDb: 18,
  // S-074: each answered yes when the cut is right, so any no fails Gate 7 (I-16) — provisional
  // until M-1.
  cutQuestions: [
    'Are the shots in a sensible order?',
    'Does the pacing work?',
    'Does every shot sit well beside the shot that follows it?',
    'Do the burned captions follow the narration?',
    'Does every shot show something no other shot repeats?',
  ],
}
