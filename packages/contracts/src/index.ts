// The engine's internal shapes and its ports, as types (S-010). The caller-facing types stay in
// @cutroom/reel-contract, the one internal package this may import (D-099).

export {
  DEFAULT_PLAN_VARY_ON,
  type Gate0Condition,
  type Gate0Verdict,
  type Plan,
  type PlanFork,
  type PlanScore,
  type PlanShot,
  type PlanSubject,
} from './cinematic.ts'
export type {
  ClipObservation,
  ClipReconciliation,
  ClipRef,
  ClipScan,
  ClipSound,
  ClipsRecorder,
  MediaPort,
  MediaProbe,
  NarrationRecord,
  StillHold,
  TakeNumber,
  TakeRecord,
  TakeVerdict,
  VideoAnswer,
  VideoPort,
  VideoReceipt,
  VideoRequest,
} from './clip.ts'
export { Spent, Unavailable, isSpent, isUnavailable, type LostCall } from './failures.ts'
export type { LanguageModelPort, ModelCall, ModelReceipt, ModelRole } from './model.ts'
export type {
  NarrationAnswer,
  NarrationPort,
  NarrationReceipt,
  NarrationRequest,
  WordTiming,
} from './narration.ts'
export {
  DEFAULT_PROVIDER_SETTINGS,
  IMAGE_ADAPTERS,
  MODEL_ADAPTERS,
  NARRATION_ADAPTERS,
  PROVIDER_ADAPTERS,
  PROVIDER_PORTS,
  SENSOR_ADAPTERS,
  STAND_IN,
  VIDEO_ADAPTERS,
  anyReal,
  type ImageAdapter,
  type ModelAdapter,
  type NarrationAdapter,
  type ProviderPort,
  type ProviderSettings,
  type SensorAdapter,
  type VideoAdapter,
} from './providers.ts'
export type {
  Framing,
  ImageAnswer,
  ImagePort,
  ImageReceipt,
  ImageRequest,
  KeyframeScore,
  KeyframeTerm,
  PictureMeasure,
  PictureRecord,
  PictureRef,
  PictureSensorPort,
  PictureTextReader,
  Reconciliation,
  StillsRecorder,
  WitnessObservation,
} from './picture.ts'
export type {
  AssembledFile,
  AssemblerPort,
  Caption,
  ClipShot,
  CutVerdict,
  GateProfile,
  OutputProfile,
  RenderManifest,
  RenderShot,
  StillHoldShot,
} from './render.ts'
export type { PlanSettings, RenderSettings, StillsSettings } from './settings.ts'
