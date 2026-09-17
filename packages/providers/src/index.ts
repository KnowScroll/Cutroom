// Adapters behind the ports. The model, image, sensor, video and narration ports are stand-ins, so
// nothing here can reach a paid service (docs/features/reel-plan.md, docs/features/reel-stills.md and
// docs/features/reel-render.md, Gate 2). The one real adapter is ffmpeg on this machine — the media
// port and the assembler — which reads and writes files under the artifact root, costs nothing, reads
// no secret and reaches no network (S-075).

export { DEFAULT_ARTIFACT_ROOT } from './artifacts.ts'
export {
  FAKE_IMAGE_MODEL,
  fakeImage,
  type FakeImage,
  type FakeImageEntry,
  type FakeImageScript,
} from './fake/image.ts'
export {
  fakeModel,
  type FakeAnswer,
  type FakeCall,
  type FakeCompareCall,
  type FakeJudgeCutCall,
  type FakeModel,
  type FakeObserveCall,
  type FakeObserveClipCall,
  type FakeScript,
} from './fake/model.ts'
export {
  FAKE_NARRATION_MODEL,
  fakeNarration,
  type FakeNarration,
  type FakeNarrationEntry,
  type FakeNarrationScript,
} from './fake/narration.ts'
export {
  fakeSensors,
  type FakeSensorCall,
  type FakeSensorEntry,
  type FakeSensors,
  type FakeSensorScript,
  type SensorMethod,
} from './fake/sensors.ts'
export {
  FAKE_VIDEO_MODEL,
  FAKE_VIDEO_SHAPE,
  fakeVideo,
  type FakeVideo,
  type FakeVideoEntry,
  type FakeVideoScript,
  type Stretch,
} from './fake/video.ts'
export { ffmpegAssembler, type FfmpegAssembler } from './ffmpeg/assemble.ts'
export {
  ffmpegMedia,
  type FakeMediaEntry,
  type FakeMediaScript,
  type FfmpegMedia,
  type MediaCall,
  type MediaMethod,
} from './ffmpeg/media.ts'
export {
  REQUIRED_ENCODERS,
  REQUIRED_FILTERS,
  ffmpegTools,
  type FfmpegTools,
  type ToolRun,
} from './ffmpeg/tools.ts'
