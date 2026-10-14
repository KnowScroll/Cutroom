// The five part ratings, the run rating and the stamp (docs/features/yield-benchmark.md, Gate 2
// "The ratings, with their arithmetic"). Pure, like the rest of this package: handed arrays of
// rows and a hash function, and it reaches for nothing — `benchmark-no-io` forbids it
// `node:crypto`, so the Gate 7 question-set hash is injected exactly as the brief key's is.
//
// Every weight and both tolerances are S-182's, unmoved by S-184's rephrasing and by round 4,
// and are carried as rating version `r1` beside the run's Gate 7 question-set hash.
//
// Three things this file does NOT do. It computes no band, no delta and no verdict — those are
// `yield-compare`'s (S-184). It decides nothing: a rating ranks runs, it is allowed to tie, and
// `yield-compare` decides. And it never phrases a term as an absence: every term is something
// achieved over something attempted, read from the column that says the thing happened (S-184).

import {
  ABSENT,
  INHERITED,
  PART_NAMES,
  type HashFn,
  type PartName,
  type RunRows,
  type Term,
  type TermInputs,
  type Tolerances,
  gate7QuestionSetInput,
  inheritance,
  termInputs,
} from './measures.ts'

/** The rating version, carried beside the Gate 7 question-set hash (S-182, S-158). */
export const RATING_VERSION = 'r1'

/** What a run rating reads when the run reached no part of its own: never 0.0. */
export const NO_RATING = 'none'

/** The stamp's second half when no Gate 7 ran — the ledger's `r1/—`. */
export const NO_QUESTION_SET = '—'

/** S-182's two tolerances, in seconds. Slice 2 supplies them; `termInputs` requires them. */
export const TOLERANCES: Tolerances = { takeSeconds: 0.25, cutSeconds: 0.5 }

/**
 * Every term's weight inside its part, in the order Gate 2's table states them. Each part's
 * weights sum to 1.0, and a part's rating is `100 × Σ(term × weight)`.
 */
export const TERM_WEIGHTS: Record<PartName, Record<string, number>> = {
  plan: {
    gate0AdmittedTheSelectedPlan: 0.5,
    admittedAtItsFirstRound: 0.2,
    asksAnsweredAtTheFirstAsk: 0.3,
  },
  pictures: { judgedAccepted: 0.7, shotsEndingAccepted: 0.3 },
  narration: { unitsSpoken: 0.5, timingsParsedAtFirstAsk: 0.5 },
  clips: { takesAccepted: 0.5, shotsEndingAccepted: 0.3, deliveredWithinAsked: 0.2 },
  cut: { questionsAnsweredYes: 0.6, shotsCarriedWithoutAHold: 0.2, durationWithinThePlan: 0.2 },
}

/** Each part's weight in the run rating. The five sum to 1.0, and nothing is renormalised. */
export const PART_WEIGHTS: Record<PartName, number> = {
  plan: 0.1,
  pictures: 0.3,
  narration: 0.1,
  clips: 0.3,
  cut: 0.2,
}

/**
 * What a rating's scope is called. A run that asked for fewer parts, and a resumed run, are
 * PARTIAL: rated, labelled, and never pooled with a whole reel, because nothing is rescaled — a
 * perfect `plan-only` run rates 10.0 and the label is what stops that being read as a bad reel.
 */
export const LABELS = {
  whole: 'whole reel',
  plan: 'plan-only',
  stills: 'stills-only',
  partial: 'partial',
  resumed: 'resumed',
} as const

export interface RatingOptions {
  /** The reader passes SHA-256; a check passes a stub. */
  hash: HashFn
  /** S-182's `TOLERANCES` unless a caller states others. */
  tolerances?: Tolerances
}

export interface RatedTerm {
  term: string
  achieved: number
  attempted: number
  /** The share in 0 to 1, or a yes/no read as 1 or 0. */
  value: number
  weight: number
}

export interface PartRating {
  part: PartName
  reached: boolean
  /** Copied in by a resume: reported, and left out of the run rating (S-162, S-164). */
  inherited: boolean
  weight: number
  /** At FULL precision; only the printed figure is rounded. ABSENT or INHERITED otherwise. */
  rating: number | typeof ABSENT | typeof INHERITED
  terms: RatedTerm[]
}

export interface RunRating {
  runId: string
  version: typeof RATING_VERSION
  /** The injected hash of the run's Gate 7 question set, or ABSENT when no Gate 7 ran. */
  questionSetHash: string | typeof ABSENT
  /** `r1/<hash>`, or `r1/—`. Two CUT ratings compare only when this matches. */
  stamp: string
  /** At full precision, or NO_RATING when no part of the run's own was reached. */
  rating: number | typeof NO_RATING
  parts: Record<PartName, PartRating>
  partial: boolean
  label: string
  /** The parts this run reached and paid for, in part order. */
  partsCovered: PartName[]
}

/** Whether two CUT ratings are on one scale, and why not when they are not. */
export interface CutComparability {
  comparable: boolean
  why: string
}

/** One pool per scope: a partial run is never ranked against a whole reel. */
export interface RankedPool {
  label: string
  /** Ascending by rating, ties in the order they came. */
  ranked: RunRating[]
  /** Runs with no rating at all: nothing to rank, and never silently dropped. */
  unrated: RunRating[]
}

// ---------------------------------------------------------------- reading a row

interface EventBody {
  type?: string
  stage?: string
}

function parse<T>(text: string | null | undefined): T | undefined {
  if (typeof text !== 'string') return undefined
  try {
    return JSON.parse(text) as T
  } catch {
    return undefined
  }
}

interface RequestBlob {
  options?: { until?: string }
}

const startedStage = (rows: RunRows, stage: string): boolean =>
  rows.run_event.some((event) => {
    const body = parse<EventBody>(event.body)
    return body?.type === 'stage.started' && body.stage === stage
  })

/** A job row is joined to its run through `job.correlation_id` (schema.ts:88). */
const hasJob = (rows: RunRows, kind: string): boolean =>
  rows.job.some((job) => job.kind === kind && job.correlation_id === rows.run.run_id)

/**
 * Reached is defined PER PART, from the evidence that part actually leaves (Gate 2's
 * part-to-stage table): `RunEvent`'s stage is `plan | stills | video`, and narration, clips and
 * the cut all happen inside `video` — the clips job makes both the narrations and the takes, and
 * the assemble job writes no `stage.started` at all.
 */
function reached(rows: RunRows, part: PartName): boolean {
  if (part === 'plan') return startedStage(rows, 'plan')
  if (part === 'pictures') return startedStage(rows, 'stills')
  if (part === 'cut') return hasJob(rows, 'reel.assemble')
  return hasJob(rows, 'reel.clips')
}

/**
 * A part a resume copied in whole. `picture`, `narration` and `take` carry `kept_from`; the
 * `plan` rows a resume copies go into a table that has no such column (`resume.ts:240-252`) and
 * the run makes no model call, so an inherited plan is one with no `reel.plan` job of its own.
 */
function inheritedPart(rows: RunRows, part: PartName): boolean {
  const resumes = typeof rows.run.resumes === 'string' && rows.run.resumes !== ''
  if (!resumes) return false
  if (part === 'plan') return !hasJob(rows, 'reel.plan')
  const kept = inheritance(rows)
  if (part === 'pictures') {
    return rows.picture.length > 0 && kept.pictures.length === rows.picture.length
  }
  if (part === 'narration') {
    return rows.narration.length > 0 && kept.narrations.length === rows.narration.length
  }
  if (part === 'clips') return rows.take.length > 0 && kept.takes.length === rows.take.length
  return false
}

/** `plan-only`, `stills-only`, `resumed`, both, or a whole reel. */
function labelOf(rows: RunRows): string {
  const until = parse<RequestBlob>(rows.run.request_canonical)?.options?.until
  const resumed = typeof rows.run.resumes === 'string' && rows.run.resumes !== ''
  const scope =
    until === 'video'
      ? LABELS.whole
      : until === 'plan'
        ? LABELS.plan
        : until === 'stills'
          ? LABELS.stills
          : LABELS.partial
  if (!resumed) return scope
  return scope === LABELS.whole ? LABELS.resumed : `${scope}, ${LABELS.resumed}`
}

// ---------------------------------------------------------------- the arithmetic

/**
 * A term's value. Convention 2: a share with an empty denominator, inside a part that was
 * reached, is 0 — never 1, never dropped, never renormalised away. Convention 3 is `termInputs`'
 * own: a yes/no term whose subject never existed comes back as 0 over 1.
 */
export const termValue = (term: Term): number =>
  term.attempted === 0 ? 0 : term.achieved / term.attempted

const termsOf = (inputs: TermInputs, part: PartName): Record<string, Term> =>
  (inputs as unknown as Record<PartName, Record<string, Term>>)[part]

function ratedTerms(part: PartName, inputs: TermInputs): RatedTerm[] {
  const stated = termsOf(inputs, part)
  return Object.entries(TERM_WEIGHTS[part]).map(([name, weight]) => {
    const term = stated[name]
    if (term === undefined) throw new Error(`${part} has no term ${name}`)
    return {
      term: name,
      achieved: term.achieved,
      attempted: term.attempted,
      value: termValue(term),
      weight,
    }
  })
}

/** `100 × Σ(term × weight)`, at full precision. */
const figure = (terms: readonly RatedTerm[]): number =>
  100 * terms.reduce((total, term) => total + term.value * term.weight, 0)

/** The five part ratings: a part not reached is ABSENT, a part a resume copied in INHERITED. */
export function partRatings(rows: RunRows, options: RatingOptions): Record<PartName, PartRating> {
  const inputs = termInputs(rows, options.tolerances ?? TOLERANCES)
  const parts: Partial<Record<PartName, PartRating>> = {}
  for (const part of PART_NAMES) {
    const terms = ratedTerms(part, inputs)
    const isReached = reached(rows, part)
    const isInherited = inheritedPart(rows, part)
    parts[part] = {
      part,
      reached: isReached,
      inherited: isInherited,
      weight: PART_WEIGHTS[part],
      rating: !isReached ? ABSENT : isInherited ? INHERITED : figure(terms),
      terms,
    }
  }
  return parts as Record<PartName, PartRating>
}

/**
 * The run rating: `Σ(part rating × part weight)` over the parts the run reached and paid for.
 *
 * **An absent part scores 0 against its weight** and an inherited part is left out, because
 * S-182 rejected renormalising: a perfect `plan-only` run rates `0.1 × 100 = 10.0` and not 100,
 * and a resumed run cannot rate 70.0 for a plan it did not pay for. **A run that reached no part
 * of its own has NO rating at all** — not 0.0, which is a figure a run can earn.
 *
 * It is computed from UNROUNDED part ratings; only the printed figure is rounded (`printed`).
 */
export function runRating(rows: RunRows, options: RatingOptions): RunRating {
  const parts = partRatings(rows, options)
  const partsCovered = PART_NAMES.filter((part) => parts[part].reached && !parts[part].inherited)
  const input = gate7QuestionSetInput(rows.render)
  const questionSetHash = input === undefined ? ABSENT : options.hash(input)

  let total = 0
  for (const part of PART_NAMES) {
    const rating = parts[part].rating
    total += (typeof rating === 'number' ? rating : 0) * PART_WEIGHTS[part]
  }

  return {
    runId: rows.run.run_id,
    version: RATING_VERSION,
    questionSetHash,
    stamp: `${RATING_VERSION}/${questionSetHash === ABSENT ? NO_QUESTION_SET : questionSetHash}`,
    rating: partsCovered.length === 0 ? NO_RATING : total,
    parts,
    partial: labelOf(rows) !== LABELS.whole,
    label: labelOf(rows),
    partsCovered,
  }
}

/**
 * The refusal to compare, scoped to the CUT rating — the only one S-158's change moved. Two cuts
 * judged under different question sets are not on one scale, so their cut ratings do not compare;
 * their run ratings still rank and still enter the ledger, because **ranking is not comparing**.
 */
export function cutRatingsComparable(a: RunRating, b: RunRating): CutComparability {
  if (a.version !== b.version) {
    return {
      comparable: false,
      why: `rating versions ${a.version} and ${b.version} are not one scale`,
    }
  }
  if (a.questionSetHash === ABSENT || b.questionSetHash === ABSENT) {
    return {
      comparable: false,
      why: 'a cut no Gate 7 judged carries no question set, so its cut rating is on no scale and compares with nothing',
    }
  }
  if (a.questionSetHash !== b.questionSetHash) {
    return {
      comparable: false,
      why: "Gate 7's question set differs between the two runs (S-158 removed its fifth question), so the two cut ratings are not on one scale",
    }
  }
  return { comparable: true, why: `one rating version and one Gate 7 question set` }
}

/**
 * Ranking, which is not comparing: one pool per label, ascending by rating, ties kept in the
 * order they came. A partial run is never pooled with a whole reel, and a run with no rating is
 * in no pool's ranking — it is reported beside it instead of being dropped.
 */
export function rank(ratings: readonly RunRating[]): RankedPool[] {
  const pools: RankedPool[] = []
  for (const rating of ratings) {
    let pool = pools.find((one) => one.label === rating.label)
    if (pool === undefined) {
      pool = { label: rating.label, ranked: [], unrated: [] }
      pools.push(pool)
    }
    if (typeof rating.rating === 'number') pool.ranked.push(rating)
    else pool.unrated.push(rating)
  }
  const value = (rating: RunRating): number =>
    typeof rating.rating === 'number' ? rating.rating : Number.NaN
  for (const pool of pools) pool.ranked.sort((a, b) => value(a) - value(b))
  return pools
}

/** The one place a figure is rounded: to one decimal, for printing and for the ledger. */
export function printed(value: number | string): string {
  return typeof value === 'number' ? value.toFixed(1) : value
}
