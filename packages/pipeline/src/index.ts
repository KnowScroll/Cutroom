// Pure functions: the planning stage and what it computes (docs/features/reel-plan.md, Gate 3).
// No database, no provider, no filesystem, no network. The splitter is not exported: the planning
// stage is its one caller (D-073).

export { admitPictures, admitVideo } from './admit.ts'
export { takeCriteria } from './clips/criteria.ts'
export {
  makeClips,
  type ClipsEvent,
  type ClipsInput,
  type ClipsOutcome,
  type ClipsPorts,
  type ClipsRecord,
  type ClipsStageSettings,
} from './clips/index.ts'
export { narrationIdOf, readNarrationId, readTakeId, takeIdOf } from './clips/ids.ts'
export { TAKES_A_SHOT, atTheCap, type AtTheCap } from './clips/ladder.ts'
export { narrationText, requestedSeconds, wordTimings } from './clips/narration.ts'
export { clipObservation } from './clips/observation.ts'
export {
  NEGATIVE_AUDIO,
  clipPrompt,
  retryPrompt,
  takeReconcileAnswer,
  takeReconcilePrompt,
  type ClipBrief,
} from './clips/prompts.ts'
export { validateVideoRequest } from './clips/validate.ts'
export { estimate } from './estimate.ts'
export { GATE_ORDER, gate0 } from './gates/index.ts'
export {
  DEFAULT_PLAN_SETTINGS,
  planForkSchema,
  planReel,
  type PlanOutcome,
  type PlanRecord,
} from './plan/index.ts'
export { planningAnswer, scoreAnswer } from './plan/prompts.ts'
export { repairBasis } from './plan/repair.ts'
export { scorePlan } from './plan/score.ts'
export { plannedImageCalls, rankSubjects } from './rank.ts'
export { DEFAULT_RENDER_SETTINGS, cutReel, type CutOutcome } from './render/index.ts'
export {
  renderIdOf,
  renderManifest,
  renderManifestSchema,
  type RenderInput,
} from './render/manifest.ts'
export { criteriaFor } from './stills/criteria.ts'
export {
  DEFAULT_STILLS_SETTINGS,
  makeStills,
  type StillsEvent,
  type StillsInput,
  type StillsOutcome,
  type StillsPorts,
  type StillsRecord,
  type StillsStageSettings,
} from './stills/index.ts'
export { witnessObservation } from './stills/observation.ts'
export {
  pictureIdOf,
  placePictures,
  readPictureId,
  shotIdOf,
  type Placement,
} from './stills/place.ts'
export { framingFor, pictureEntry, type PictureEntry } from './stills/prompts.ts'
export { DEFAULT_SCORE_WEIGHTS, keyframeScore } from './stills/score.ts'
