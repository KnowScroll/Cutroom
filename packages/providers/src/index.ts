// Adapters behind the ports. The sensor port is a stand-in, so it cannot reach a paid service
// (docs/features/reel-stills.md and docs/features/reel-render.md, Gate 2).
// Five real adapters exist: ffmpeg on this machine — the media port and the assembler — which
// reads and writes files under the artifact root, costs nothing, reads no secret and reaches no
// network (S-075); MiniMax's model and narration ports; fal's image port, through D-028's closed
// registry; and fal's video port, on D-007's one hard-locked path. The four that can spend are
// built only when a setting names them, and each reads its key through `env.ts` and nowhere else
// (S-108, S-114, S-123, S-124, S-125).
//
// EVERY DEFAULT IS STILL THE STAND-IN. Nothing in the suite constructs the MiniMax adapter but the
// checks that hand it recorded wire, so no test needs a key and the suite is still $0 (S-111).

export { DEFAULT_ARTIFACT_ROOT } from './artifacts.ts'
export { FAL_KEY, MINIMAX_KEY, falKey, minimaxKey, type Env } from './env.ts'
export {
  adapterName,
  imagePort,
  modelPort,
  narrationPort,
  sensorPort,
  videoPort,
  type PortOptions,
  type StandInScripts,
  type Transport,
} from './ports.ts'
export { Unavailable, isUnavailable, transientStatus } from './transient.ts'
export { MINIMAX_BASE_URL } from './minimax/wire.ts'
export {
  CONFIGURED_IMAGE_SLUG,
  IMAGE_REGISTRY,
  PICTURE_FRAME,
  PICTURE_MIN_SHORT_SIDE,
  admitEntry,
  cheapestEntry,
  imageCostCents,
  imageEntry,
  imageRateCents,
  wireFor,
  type Frame,
  type ImageCall,
  type ImageEntry,
  type ImageRate,
} from './fal/registry.ts'
export {
  DEFAULT_FAL_POLL_MS,
  DEFAULT_FAL_TIMEOUT_MS,
  FAL_BASE_URL,
  FAL_STORAGE_BASE_URL,
  FalFault,
} from './fal/queue.ts'
export {
  CLIP_EXTENSION,
  DEFAULT_VIDEO_WAIT_MS,
  EXPANSION_MODE_FIELD,
  H3_TURBO,
  clipsAJob,
  videoCostCents,
  type VideoEntry,
} from './fal/h3.ts'
export { PICTURE_EXTENSION, pictureFrame, type PictureFrame } from './fal/frame.ts'
export { UPLOAD_INITIATE_PATH, uploadReference, type UploadOptions } from './fal/upload.ts'
export { falImage, type FalImageOptions } from './fal/image.ts'
export { NO_EXPANSION, falVideo, type FalVideoOptions } from './fal/video.ts'
export {
  CHAT_PATH,
  DEFAULT_ANSWER_TOKENS,
  DEFAULT_REASONING_TOKENS,
  DEFAULT_TIMEOUT_MS,
  READ_TEXT_QUESTION,
  answerAfterReasoning,
  minimaxModel,
  type MinimaxModelOptions,
} from './minimax/model.ts'
export {
  AUDIO_EXTENSION,
  AUDIO_SETTING,
  DEFAULT_NARRATION_TIMEOUT_MS,
  T2A_MODEL,
  T2A_PATH,
  minimaxNarration,
  type MinimaxNarrationOptions,
} from './minimax/narration.ts'
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
export { BLUR_FLOOR, ffmpegSensors, type FfmpegSensorOptions } from './ffmpeg/sensors.ts'
export {
  REQUIRED_ENCODERS,
  REQUIRED_FILTERS,
  SENSOR_FILTERS,
  ffmpegTools,
  type FfmpegTools,
  type SensorFilter,
  type ToolRun,
} from './ffmpeg/tools.ts'
export { visibleText, type VisibleText } from './text.ts'
