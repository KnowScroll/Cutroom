// @cutroom/benchmark — the arithmetic of the benchmark, pure
// (docs/features/yield-benchmark.md, Gate 2 "Where each part lives").
//
// It is handed ARRAYS OF ROWS, shaped as `packages/domain`'s schema stores them, and returns
// figures. It may not touch the database, a provider, an app, any npm package but zod, or any
// I/O of its own — `benchmark-no-engine`, `benchmark-no-io` and `benchmark-npm-only-zod` hold
// that on the real dependency graph, and `drift --prove` builds a violation of each. It computes
// no band, no delta and no verdict: those are `yield-compare`'s (S-184).
//
// The package is entered only through this file.

export {
  ABSENT,
  ESTIMATE_EXCLUDES,
  FIELD_COLUMNS,
  INHERITED,
  NOT_RECORDED,
  PART_NAMES,
  REACHED_BY,
  SHARED_SPAN,
  SPAN_RULES,
  briefKeyInput,
  gate7QuestionSetInput,
  inheritance,
  scorecard,
  subjectsPerShot,
  termInputs,
} from './measures.ts'

export type {
  DegradationRow,
  GenerationReceiptRow,
  HashFn,
  HoldRow,
  Inheritance,
  InheritedRow,
  JobRow,
  LostCallRow,
  ModelReceiptRow,
  NarrationRow,
  ObservationRow,
  PartName,
  PictureRow,
  PlanRow,
  ReconciliationRow,
  RefusedAnswerRow,
  RenderRow,
  RunEventRow,
  RunRow,
  RunRows,
  Scorecard,
  ScorecardOptions,
  SpeechReceiptRow,
  Span,
  StillHoldRow,
  TakeObservationRow,
  TakeReconciliationRow,
  TakeRow,
  Term,
  TermInputs,
  Tolerances,
  VideoReceiptRow,
} from './measures.ts'

export {
  LABELS,
  NO_QUESTION_SET,
  NO_RATING,
  PART_WEIGHTS,
  RATING_VERSION,
  TERM_WEIGHTS,
  TOLERANCES,
  cutRatingsComparable,
  partRatings,
  printed,
  rank,
  runRating,
  termValue,
} from './ratings.ts'

export type {
  CutComparability,
  PartRating,
  RankedPool,
  RatedTerm,
  RatingOptions,
  RunRating,
} from './ratings.ts'

export {
  REASON_FAMILIES,
  VERBATIM_SITES,
  classify,
  classifyGate1AndGate5,
  detailSite,
  gate1Reasons,
  gate5Reasons,
  verbatim,
} from './reasons.ts'

export type { Counted, FamilyCount, ReasonFamily, ReasonRows, VerbatimSite } from './reasons.ts'
