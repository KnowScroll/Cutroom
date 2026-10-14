// Every measure of one stored run, computed from ARRAYS OF ROWS and nothing else
// (docs/features/yield-benchmark.md, Gate 2). Pure: no database, no provider, no app, no file,
// no process, no hash of its own — the hash function is handed in, because `benchmark-no-io`
// forbids this package `node:crypto` and a pure scorer that can hash can grow a key of its own
// and stop being a function of its rows.
//
// Two different rules, said once: a row the record does not hold is reported ABSENT; a fact the
// record CANNOT hold — the engine version, an image-port transient — is reported NOT RECORDED.
// The picture rule is READ, from `Plan.pictures`, and is never 'not recorded'. Inside a part that
// was reached, a share with an empty denominator scores 0: absent in the record, zero in the
// rating.

import type { Plan } from '@cutroom/contracts'
import { type Counted, type ReasonFamily, type VerbatimSite, classify } from './reasons.ts'

// ---------------------------------------------------------------- what a row looks like

/** Every row below is shaped as the schema stores it: snake_case, JSON kept as text. */
export interface RunRow {
  run_id: string
  request_id: string
  request: string
  request_canonical: string
  state: string
  result: string | null
  cancel_requested?: number | boolean
  created_at: string
  /** Migration 0007 (S-162, S-163). The record read in session 83 predates it. */
  resumes?: string | null
  failure?: string | null
  resume_request?: string | null
}

export interface RunEventRow {
  run_id: string
  seq: number
  at: string
  body: string
}

export interface JobRow {
  id: number
  kind: string
  payload: string
  state: string
  attempts: number
  run_at: string
  locked_at: string | null
  lease_until: string | null
  error: string | null
  parent_id: number | null
  correlation_id: string
  cost_cents: number
}

export interface PlanRow {
  run_id: string
  role: string
  unit_count: number
  axis: string
  plan: string
  verdict: string
  score: number | null
  estimate_cents: number
  selected: number | boolean
}

export interface ModelReceiptRow {
  id: number
  run_id: string
  role: string
  call: string
  picture_ids: string
  take_ids: string
  model: string
  temperature: number
  input_tokens: number
  output_tokens: number
  fake: number | boolean
  at: string
}

export interface PictureRow {
  run_id: string
  picture_id: string
  seq: number
  attempt: number
  shot_unit: number
  subject_id: string
  role: string
  label: string
  path: string
  prompt: string
  framing: string | null
  reference_ids: string
  measure: string | null
  words: string | null
  gate1: string | null
  score: string | null
  gate1s: string | null
  degradation: string | null
  chosen: number | boolean
  kept_from?: string | null
}

export interface ObservationRow {
  id: string
  run_id: string
  picture_id: string
  observation: string
}

export interface ReconciliationRow {
  id: string
  run_id: string
  picture_id: string
  answer: string
  failed: string
}

export interface GenerationReceiptRow {
  id: number
  run_id: string
  picture_id: string
  model: string
  prompt: string
  reference_ids: string
  style_id: string
  style_version: number
  rate_cents: number
  cost_cents: number
  fake: number | boolean
  degraded: number | boolean
  at: string
}

export interface LostCallRow {
  id: number
  run_id: string
  port: string
  model: string
  cost_cents: number
  detail: string
  at: string
}

export interface RefusedAnswerRow {
  id: number
  run_id: string
  port: string
  role: string | null
  call: string | null
  about: string
  ask: number
  reasons: string
  answer: string
  at: string
}

export interface DegradationRow {
  run_id: string
  shot_id: string
  gate: string
  reason: string
}

export interface NarrationRow {
  run_id: string
  narration_id: string
  attempt: number
  shot_unit: number
  text: string
  path: string
  words: string | null
  probe: string | null
  kept_from?: string | null
}

export interface SpeechReceiptRow {
  id: number
  run_id: string
  narration_id: string
  model: string
  characters: number
  rate_cents: number
  cost_cents: number
  fake: number | boolean
  transient_errors: number
  at: string
}

export interface TakeRow {
  run_id: string
  take_id: string
  attempt: number
  shot_unit: number
  number: number
  mode: string
  picture_id: string | null
  degraded: number | boolean
  prompt: string
  requested_seconds: number
  seed: number
  request_id: string
  expanded_prompt: string
  path: string
  probe: string | null
  scan: string | null
  words: string | null
  sound: string | null
  verdicts: string
  outcome: string | null
  degradation: string | null
  kept_from?: string | null
}

export interface VideoReceiptRow {
  id: number
  run_id: string
  take_id: string
  model: string
  mode: string
  resolution: string
  requested_seconds: number
  aspect_ratio: string | null
  seed: number
  request_id: string
  prompt: string
  expanded_prompt: string
  expansion_mode: string
  style_id: string
  style_version: number
  rate_cents: number
  cost_cents: number
  fake: number | boolean
  degraded: number | boolean
  transient_errors: number
  at: string
}

export interface TakeObservationRow {
  id: string
  run_id: string
  take_id: string
  observation: string
}

export interface TakeReconciliationRow {
  id: string
  run_id: string
  take_id: string
  answer: string
  failed: string
}

export interface RenderRow {
  run_id: string
  render_id: string
  attempt: number
  render_manifest: string
  hash: string
  path: string | null
  profile: string
  invocations: string | null
  measure: string | null
  started_at: string
  finished_at: string | null
  gate7: string | null
}

export interface HoldRow {
  run_id: string
  render_id: string
  shot_id: string
  seconds: number
  reason: string
}

export interface StillHoldRow {
  run_id: string
  shot_id: string
  attempt: number
  picture_id: string
  probe: string
  take_ids: string
  reason: string
}

/** One run's rows, as the reader selects them and as the committed fixtures hold them. */
export interface RunRows {
  run: RunRow
  run_event: RunEventRow[]
  /** Joined to the run through `job.correlation_id` (schema.ts:88), never through a run_id. */
  job: JobRow[]
  plan: PlanRow[]
  model_receipt: ModelReceiptRow[]
  picture: PictureRow[]
  observation: ObservationRow[]
  reconciliation: ReconciliationRow[]
  generation_receipt: GenerationReceiptRow[]
  lost_call: LostCallRow[]
  refused_answer: RefusedAnswerRow[]
  degradation: DegradationRow[]
  narration: NarrationRow[]
  speech_receipt: SpeechReceiptRow[]
  take: TakeRow[]
  video_receipt: VideoReceiptRow[]
  take_observation: TakeObservationRow[]
  take_reconciliation: TakeReconciliationRow[]
  render: RenderRow[]
  hold: HoldRow[]
  still_hold: StillHoldRow[]
}

// ---------------------------------------------------------------- how a figure reads

/** A row the record does not hold. */
export const ABSENT = 'absent'
/** A fact the record cannot hold. Never zero, and never a guess. */
export const NOT_RECORDED = 'not recorded'
/** A part a resume copied in: rated nowhere, and left out of the run rating (S-162, S-164). */
export const INHERITED = 'inherited, not measured'

/**
 * The one figure narration and the clips share. It is the clips job PLUS the wait before
 * assembly — `render.started_at` is written by a separately queued assemble job and `job` carries
 * no completion instant — so it is never labelled as the clips job's own time.
 */
export const SHARED_SPAN =
  'narration and clips together — the clips job plus the wait before assembly'

/** What a selected plan's estimate covers, and the four things it does not (S-035, S-070). */
export const ESTIMATE_EXCLUDES =
  "the selected plan's intended calls at their rates only: it excludes the reserve image slots " +
  "(S-035), the narration (S-070), every retake — a shot's second and third takes, and every " +
  'repair picture — and every lost call, whose cents are paid and produce nothing'

export const PART_NAMES = ['plan', 'pictures', 'narration', 'clips', 'cut'] as const
export type PartName = (typeof PART_NAMES)[number]

/** Reached is defined PER PART, from the evidence that part actually leaves (Gate 2's table). */
export const REACHED_BY: Record<PartName, string> = {
  plan: 'a stage.started event with stage plan',
  pictures: 'a stage.started event with stage stills',
  narration: 'a job row of kind reel.clips for the run',
  clips: 'a job row of kind reel.clips for the run',
  cut: 'a job row of kind reel.assemble for the run',
}

/** Which of the three rules gave a stage its end (S-046 writes no finish for a stopped stage). */
export const SPAN_RULES = {
  own: 'its own stage.finished',
  next: "the next stage's start",
  run: "the run's own end",
  render: "the render row's started_at to finished_at",
} as const

/** A hash the caller supplies. The reader passes SHA-256; a check passes a stub. */
export type HashFn = (input: string) => string

export interface Span {
  seconds: number | typeof ABSENT | typeof INHERITED
  rule: string
}

export interface Term {
  achieved: number
  attempted: number
}

export interface Tolerances {
  /** Seconds a take's delivered duration may differ from the seconds asked (S-182). */
  takeSeconds: number
  /** Seconds the cut's measured duration may differ from the plan's total (S-182). */
  cutSeconds: number
}

// ---------------------------------------------------------------- reading a stored value

function parse<T>(text: string | null | undefined): T | undefined {
  if (typeof text !== 'string') return undefined
  try {
    return JSON.parse(text) as T
  } catch {
    return undefined
  }
}

const truthy = (value: number | boolean | null | undefined): boolean =>
  value === true || value === 1

/** Seconds between two instants, or ABSENT when either is missing or unreadable. */
function between(from: string | null | undefined, to: string | null | undefined) {
  if (typeof from !== 'string' || typeof to !== 'string') return ABSENT
  const a = Date.parse(from)
  const b = Date.parse(to)
  if (Number.isNaN(a) || Number.isNaN(b)) return ABSENT
  return (b - a) / 1000
}

interface EventBody {
  type?: string
  stage?: string
  status?: string
  shotId?: string
  reason?: string
}

const events = (rows: RunRows): EventBody[] =>
  rows.run_event.map((event) => parse<EventBody>(event.body) ?? {}).filter(Boolean)

/** Each event with its instant, in `seq` order, so a stage's span can be read off them. */
function stageEvents(rows: RunRows): Array<{ at: string; body: EventBody }> {
  return [...rows.run_event]
    .sort((a, b) => a.seq - b.seq)
    .map((event) => ({ at: event.at, body: parse<EventBody>(event.body) ?? {} }))
}

interface ResultBlob {
  status?: string
  reason?: string
  rule?: string
  step?: string
  detail?: string
  until?: string
  costCents?: number
  estimateCents?: number
  ceilingCents?: number
  capCents?: number
  video?: { path?: string }
  stills?: Array<{ pictureId?: string; shotId?: string; path?: string }>
}

interface RequestBlob {
  worldId?: string
  options?: { until?: string; budgetCents?: number; planVaryOn?: string }
}

interface MeasureBlob {
  readable?: boolean
  durationSeconds?: number
  video?: { codec?: string; width?: number; height?: number; fps?: number; frames?: number } | null
  audio?: { codec?: string; sampleRate?: number; channels?: number } | null
  moovFirst?: boolean | null
}

interface Gate1Blob {
  outcome?: string | null
  coverage?: string
  steps?: Array<{ step: string; outcome: string | null; reasons?: string[] }>
}

interface Gate1SBlob {
  outcome?: string
  coverage?: string
  compared?: boolean
  suspicion?: number
  reasons?: string[]
}

interface VerdictBlob {
  gate: string
  outcome: string
  reasons?: string[]
}

interface ManifestShot {
  shotId?: string
  takeId?: string
  narrationId?: string
  frames?: number
  hold?: { seconds?: number } | null
}

interface ManifestBlob {
  shots?: ManifestShot[]
  totalFrames?: number
}

interface Gate7Blob {
  outcome?: string
  coverage?: { strategy?: string; frames?: number }
  answer?: Array<{ question?: string; answer?: string }>
  reasons?: string[]
}

const selectedPlanRow = (rows: RunRows): PlanRow | undefined =>
  rows.plan.find((plan) => truthy(plan.selected))

const selectedPlan = (rows: RunRows): Plan | undefined => parse<Plan>(selectedPlanRow(rows)?.plan)

const request = (run: RunRow): RequestBlob | undefined => parse<RequestBlob>(run.request_canonical)

const result = (run: RunRow): ResultBlob | undefined => parse<ResultBlob>(run.result)

// ---------------------------------------------------------------- the brief key, and the stamp

/** Keys sorted at every depth, so content — not key order — is what a brief key compares. */
function canonicalise(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalise)
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      out[key] = canonicalise((value as Record<string, unknown>)[key])
    }
    return out
  }
  return value
}

/**
 * The brief key's INPUT: `request_canonical` with `requestId` and `options` removed,
 * canonicalised. Pure, and the one place every mistake about "the same brief" can be made.
 * The reader hashes it with SHA-256; a check hashes it with a stub.
 *
 * `until` and the request's ceiling live in `options` and are therefore OUTSIDE the key, because
 * `until` decides which parts can exist and the ceiling decides when a run stops.
 */
export function briefKeyInput(run: RunRow): string {
  const parsed = parse<Record<string, unknown>>(run.request_canonical)
  if (parsed === undefined) return ''
  const REMOVED = ['requestId', 'options']
  const brief: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(parsed)) {
    if (REMOVED.includes(key)) continue
    brief[key] = value
  }
  return JSON.stringify(canonicalise(brief))
}

/**
 * The Gate 7 question-set input: every question the run was asked, in order, as the render's own
 * answers record them. S-158 removed Gate 7's fifth question, and two of the four historical
 * refusals are that removed question, so two cut ratings compare only when this matches.
 */
export function gate7QuestionSetInput(renders: readonly RenderRow[]): string | undefined {
  const answers = renders
    .map((render) => parse<Gate7Blob>(render.gate7))
    .find((gate7) => gate7?.answer !== undefined)?.answer
  if (answers === undefined) return undefined
  return JSON.stringify(answers.map((asked) => asked.question ?? ''))
}

// ---------------------------------------------------------------- inheritance

export interface InheritedRow {
  shotId: string
  inherited: boolean
  /** The run that paid for it: this one, or the run it resumes. */
  paidBy: string
}

export interface Inheritance {
  /** Picture, narration and take ids this run inherited — the three tables with `kept_from`. */
  pictures: string[]
  narrations: string[]
  takes: string[]
  /** Recognised without a `kept_from` column, per the rule Gate 2 states for each table. */
  degradations: InheritedRow[]
  holds: InheritedRow[]
  stillHolds: InheritedRow[]
}

const keptFrom = (row: { kept_from?: string | null }): string | null =>
  typeof row.kept_from === 'string' && row.kept_from !== '' ? row.kept_from : null

const shotIdOf = (unit: number): string => `shot-${unit}`

/**
 * An inherited failure, although `degradation`, `hold` and `still_hold` carry no `kept_from` and
 * a resumed run writes a FRESH degradation row for one it carried (`carried()` in
 * stills/index.ts hands the kept picture's own reason back to `degrade()`).
 *
 * - a degradation is inherited when its shot's LAST FAILING picture carries `kept_from`;
 * - a still-hold when its three `take_ids` all name takes carrying `kept_from`;
 * - a hold when its shot's clip in the render manifest came from such a take.
 *
 * Each is counted in the run that paid for it.
 */
export function inheritance(rows: RunRows): Inheritance {
  const paidElsewhere = keptFrom(rows.run as { kept_from?: string | null })
  const resumes = typeof rows.run.resumes === 'string' ? rows.run.resumes : paidElsewhere
  const owner = (inherited: boolean): string => (inherited ? (resumes ?? ABSENT) : rows.run.run_id)

  const keptTakes = new Set(
    rows.take.filter((take) => keptFrom(take) !== null).map((take) => take.take_id),
  )

  const lastFailingPicture = (shotId: string): PictureRow | undefined => {
    const failing = rows.picture
      .filter((picture) => shotIdOf(picture.shot_unit) === shotId)
      .filter((picture) => parse<Gate1Blob>(picture.gate1)?.outcome === 'fail')
    return failing[failing.length - 1]
  }

  const manifest = rows.render
    .map((render) => parse<ManifestBlob>(render.render_manifest))
    .find((blob) => blob !== undefined)

  return {
    pictures: rows.picture.filter((row) => keptFrom(row) !== null).map((row) => row.picture_id),
    narrations: rows.narration
      .filter((row) => keptFrom(row) !== null)
      .map((row) => row.narration_id),
    takes: [...keptTakes],
    degradations: rows.degradation.map((row) => {
      const last = lastFailingPicture(row.shot_id)
      const inherited = last !== undefined && keptFrom(last) !== null
      return { shotId: row.shot_id, inherited, paidBy: owner(inherited) }
    }),
    holds: rows.hold.map((row) => {
      const shot = manifest?.shots?.find((entry) => entry.shotId === row.shot_id)
      const inherited = shot?.takeId !== undefined && keptTakes.has(shot.takeId)
      return { shotId: row.shot_id, inherited, paidBy: owner(inherited) }
    }),
    stillHolds: rows.still_hold.map((row) => {
      const ids = parse<string[]>(row.take_ids) ?? []
      const inherited = ids.length > 0 && ids.every((id) => keptTakes.has(id))
      return { shotId: row.shot_id, inherited, paidBy: owner(inherited) }
    }),
  }
}

/** The rows this run made: a `kept_from` row is excluded from every numerator and denominator. */
const ownPictures = (rows: RunRows) => rows.picture.filter((row) => keptFrom(row) === null)
const ownNarrations = (rows: RunRows) => rows.narration.filter((row) => keptFrom(row) === null)
const ownTakes = (rows: RunRows) => rows.take.filter((row) => keptFrom(row) === null)

// ---------------------------------------------------------------- parts, reached and measured

const hasStage = (rows: RunRows, stage: string): boolean =>
  events(rows).some((body) => body.type === 'stage.started' && body.stage === stage)

const hasJob = (rows: RunRows, kind: string): boolean =>
  rows.job.some((job) => job.kind === kind && job.correlation_id === rows.run.run_id)

function reached(rows: RunRows, part: PartName): boolean {
  if (part === 'plan') return hasStage(rows, 'plan')
  if (part === 'pictures') return hasStage(rows, 'stills')
  if (part === 'cut') return hasJob(rows, 'reel.assemble')
  return hasJob(rows, 'reel.clips')
}

function inheritedPart(rows: RunRows, part: PartName): boolean {
  const resumes = typeof rows.run.resumes === 'string' && rows.run.resumes !== ''
  if (!resumes) return false
  if (part === 'plan') return !hasJob(rows, 'reel.plan')
  if (part === 'pictures') {
    return rows.picture.length > 0 && ownPictures(rows).length === 0
  }
  if (part === 'narration') {
    return rows.narration.length > 0 && ownNarrations(rows).length === 0
  }
  if (part === 'clips') return rows.take.length > 0 && ownTakes(rows).length === 0
  return false
}

/** A stage's span, and WHICH of the three rules gave it its end (S-046). */
function stageSpan(rows: RunRows, stage: string): Span {
  const ordered = stageEvents(rows)
  const startAt = ordered.findIndex(
    (event) => event.body.type === 'stage.started' && event.body.stage === stage,
  )
  if (startAt < 0) return { seconds: ABSENT, rule: ABSENT }
  const start = ordered[startAt]
  if (start === undefined) return { seconds: ABSENT, rule: ABSENT }

  const finish = ordered
    .slice(startAt + 1)
    .find((event) => event.body.type === 'stage.finished' && event.body.stage === stage)
  if (finish !== undefined) {
    return { seconds: between(start.at, finish.at), rule: SPAN_RULES.own }
  }
  const next = ordered
    .slice(startAt + 1)
    .find((event) => event.body.type === 'stage.started' && event.body.stage !== stage)
  if (next !== undefined) {
    return { seconds: between(start.at, next.at), rule: SPAN_RULES.next }
  }
  const ended = ordered.filter((event) => event.body.type === 'run.finished').at(-1)
  if (ended !== undefined) {
    return { seconds: between(start.at, ended.at), rule: SPAN_RULES.run }
  }
  return { seconds: ABSENT, rule: ABSENT }
}

/**
 * The one shared figure: the `video` stage's start to the render row's `started_at`. With no
 * render row the `video` stage's own fallback gives the end.
 */
function sharedSpan(rows: RunRows): Span {
  const ordered = stageEvents(rows)
  const start = ordered.find(
    (event) => event.body.type === 'stage.started' && event.body.stage === 'video',
  )
  if (start === undefined) return { seconds: ABSENT, rule: ABSENT }
  const render = rows.render[0]
  if (render !== undefined) {
    return { seconds: between(start.at, render.started_at), rule: SHARED_SPAN }
  }
  return { seconds: stageSpan(rows, 'video').seconds, rule: SHARED_SPAN }
}

/** The one true duration: the render's own `started_at` to `finished_at` (nullable). */
function cutSpan(rows: RunRows): Span {
  const render = rows.render[0]
  if (render === undefined) return { seconds: ABSENT, rule: ABSENT }
  if (typeof render.finished_at !== 'string' || render.finished_at === '') {
    return { seconds: ABSENT, rule: SPAN_RULES.render }
  }
  return { seconds: between(render.started_at, render.finished_at), rule: SPAN_RULES.render }
}

// ---------------------------------------------------------------- single measures

/** Subjects per shot, from the SELECTED PLAN — never parsed out of a picture's prompt. */
export function subjectsPerShot(rows: RunRows): number[] {
  const plan = selectedPlan(rows)
  return (plan?.shots ?? []).map((shot) => shot.subjectIds.length)
}

/** An ask of the PLAN STAGE, given no row says which stage a model call belongs to. */
function planAsks(rows: RunRows): { receipts: ModelReceiptRow[]; refusals: RefusedAnswerRow[] } {
  const receipts = rows.model_receipt.filter((receipt) => {
    if (receipt.role === 'planner') return true
    if (receipt.role !== 'reconciler') return false
    const pictures = parse<string[]>(receipt.picture_ids) ?? []
    const takes = parse<string[]>(receipt.take_ids) ?? []
    return pictures.length === 0 && takes.length === 0
  })
  const refusals = rows.refused_answer.filter((refused) => {
    if (refused.port !== 'model') return false
    if (refused.role === 'planner') return true
    if (refused.role !== 'reconciler') return false
    return (parse<string[]>(refused.about) ?? []).length === 0
  })
  return { receipts, refusals }
}

const share = (achieved: number, attempted: number): Term => ({ achieved, attempted })

/**
 * Every rating term's numerator over its stated attempted denominator, each read POSITIVELY —
 * no term is computed from the absence of a row. The WEIGHTS are S-182's and are applied in
 * ratings.ts; the two tolerances are handed in for the same reason.
 */
export function termInputs(rows: RunRows, tolerances: Tolerances) {
  const plan = selectedPlan(rows)
  const planRow = selectedPlanRow(rows)
  const asks = planAsks(rows)
  const askCount = asks.receipts.length + asks.refusals.length
  const firstAskRefusals = asks.refusals.filter((refused) => refused.ask === 1).length

  const pictures = ownPictures(rows)
  const judged = pictures.filter(
    (picture) => (parse<Gate1Blob>(picture.gate1)?.outcome ?? null) !== null,
  )
  const acceptedPictures = judged.filter(
    (picture) => parse<Gate1Blob>(picture.gate1)?.outcome === 'accept',
  )
  const pictureShots = new Set(pictures.map((picture) => picture.shot_unit))
  const acceptedShots = new Set(acceptedPictures.map((picture) => picture.shot_unit))

  const narrations = ownNarrations(rows)
  const inheritedNarrationUnits = new Set(
    rows.narration.filter((row) => keptFrom(row) !== null).map((row) => row.shot_unit),
  )
  const unitsToSpeak = (plan?.units.length ?? 0) - inheritedNarrationUnits.size
  const spoken = new Set(narrations.map((row) => row.shot_unit)).size
  const refusedTimings = (narrationId: string) =>
    rows.refused_answer.some(
      (refused) =>
        refused.port === 'speech' &&
        refused.ask === 1 &&
        (parse<string[]>(refused.about) ?? []).includes(narrationId),
    )
  const parsedAtFirstAsk = narrations.filter((row) => !refusedTimings(row.narration_id)).length

  const takes = ownTakes(rows)
  const decided = takes.filter((take) => take.outcome !== null && take.outcome !== undefined)
  const acceptedTakes = decided.filter((take) => take.outcome === 'accept')
  const takeShots = new Set(takes.map((take) => take.shot_unit))
  const acceptedTakeShots = new Set(acceptedTakes.map((take) => take.shot_unit))
  const probed = takes.filter((take) => parse<MeasureBlob>(take.probe)?.readable === true)
  const withinAsked = probed.filter((take) => {
    const delivered = parse<MeasureBlob>(take.probe)?.durationSeconds
    if (typeof delivered !== 'number') return false
    return Math.abs(delivered - take.requested_seconds) <= tolerances.takeSeconds
  })

  const render = rows.render[0]
  const finished = render !== undefined && typeof render.finished_at === 'string'
  const gate7 = parse<Gate7Blob>(render?.gate7)
  const asked = gate7?.answer ?? []
  const manifest = parse<ManifestBlob>(render?.render_manifest)
  const keptTakes = new Set(inheritance(rows).takes)
  const manifestShots = (manifest?.shots ?? []).filter(
    (shot) => shot.takeId === undefined || !keptTakes.has(shot.takeId),
  )
  const carried = manifestShots.filter(
    (shot) => shot.hold === null || shot.hold === undefined,
  ).length
  const measured = parse<MeasureBlob>(render?.measure)?.durationSeconds
  const plannedSeconds = (plan?.shots ?? []).reduce(
    (total, shot) => total + shot.durationSeconds,
    0,
  )
  const withinPlan =
    typeof measured === 'number' && Math.abs(measured - plannedSeconds) <= tolerances.cutSeconds

  return {
    plan: {
      // Convention 3: a yes/no term whose subject never existed inside a reached part is 0.
      gate0AdmittedTheSelectedPlan: share(
        parse<{ outcome?: string }>(planRow?.verdict)?.outcome === 'accept' ? 1 : 0,
        1,
      ),
      admittedAtItsFirstRound: share(
        planRow !== undefined && !rows.plan.some((row) => row.role === 'repair') ? 1 : 0,
        1,
      ),
      asksAnsweredAtTheFirstAsk: share(Math.max(askCount - firstAskRefusals, 0), askCount),
    },
    pictures: {
      judgedAccepted: share(acceptedPictures.length, judged.length),
      shotsEndingAccepted: share(acceptedShots.size, pictureShots.size),
    },
    narration: {
      unitsSpoken: share(spoken, Math.max(unitsToSpeak, 0)),
      timingsParsedAtFirstAsk: share(parsedAtFirstAsk, narrations.length),
    },
    clips: {
      takesAccepted: share(acceptedTakes.length, decided.length),
      shotsEndingAccepted: share(acceptedTakeShots.size, takeShots.size),
      deliveredWithinAsked: share(withinAsked.length, probed.length),
    },
    // All three cut terms are 0 unless `render.finished_at` is set: `render_manifest` is notNull
    // and written BEFORE the assembler is called, so a run killed mid-assembly has a full
    // manifest, no holds and no Gate 7 — and would otherwise be paid for assembling nothing.
    cut: {
      questionsAnsweredYes: share(
        finished ? asked.filter((one) => one.answer === 'yes').length : 0,
        asked.length,
      ),
      shotsCarriedWithoutAHold: share(finished ? carried : 0, manifestShots.length),
      durationWithinThePlan: share(finished && withinPlan ? 1 : 0, 1),
    },
  }
}

export type TermInputs = ReturnType<typeof termInputs>

// ---------------------------------------------------------------- the scorecard

export interface ScorecardOptions {
  hash: HashFn
}

/** Every field below names the column it is read from, in FIELD_COLUMNS. */
export function scorecard(rows: RunRows, options: ScorecardOptions) {
  const { hash } = options
  const run = rows.run
  const asked = request(run)
  const ended = result(run)
  const plan = selectedPlan(rows)
  const planRow = selectedPlanRow(rows)
  const render = rows.render[0]
  const manifest = parse<ManifestBlob>(render?.render_manifest)
  const gate7 = parse<Gate7Blob>(render?.gate7)
  const output = parse<MeasureBlob>(render?.measure)
  const inherited = inheritance(rows)
  const keptPictures = new Set(inherited.pictures)
  const keptNarrations = new Set(inherited.narrations)
  const keptTakes = new Set(inherited.takes)

  const jobs = rows.job.filter((job) => job.correlation_id === run.run_id)
  const lastEvent = stageEvents(rows).at(-1)
  const partInherited = Object.fromEntries(
    PART_NAMES.map((part) => [part, inheritedPart(rows, part)]),
  ) as Record<PartName, boolean>
  const partReached = Object.fromEntries(
    PART_NAMES.map((part) => [part, reached(rows, part)]),
  ) as Record<PartName, boolean>

  const spanOf = (part: PartName, span: Span): Span =>
    partInherited[part] ? { seconds: INHERITED, rule: INHERITED } : span

  const sum = (values: readonly number[]) => values.reduce((total, value) => total + value, 0)

  /** Every receipt of the run, in instant order, so consecutive GAPS can be reported. */
  const receiptInstants = [
    ...rows.model_receipt.map((receipt) => receipt.at),
    ...rows.generation_receipt.map((receipt) => receipt.at),
    ...rows.speech_receipt.map((receipt) => receipt.at),
    ...rows.video_receipt.map((receipt) => receipt.at),
  ]
    .map((at) => ({ at, ms: Date.parse(at) }))
    .sort((a, b) => (Number.isNaN(a.ms) ? 1 : 0) - (Number.isNaN(b.ms) ? 1 : 0) || a.ms - b.ms)

  const until = asked?.options?.until ?? ABSENT
  const resumes = typeof run.resumes === 'string' && run.resumes !== '' ? run.resumes : ABSENT

  const pictureItems = rows.picture.map((picture) => {
    const gate1 = parse<Gate1Blob>(picture.gate1)
    const gate1s = parse<Gate1SBlob>(picture.gate1s)
    const observation = rows.observation.find((row) => row.picture_id === picture.picture_id)
    const seen = parse<{ entities?: Array<{ name?: string; clippedByEdge?: boolean }> }>(
      observation?.observation,
    )
    const reconciliation = rows.reconciliation.find((row) => row.picture_id === picture.picture_id)
    const receipt = rows.generation_receipt.find((row) => row.picture_id === picture.picture_id)
    const entities = seen?.entities ?? []
    return {
      pictureId: picture.picture_id,
      inherited: keptPictures.has(picture.picture_id),
      shotId: shotIdOf(picture.shot_unit),
      attempt: picture.attempt,
      role: picture.role,
      subjectId: picture.subject_id,
      label: picture.label,
      framing: picture.framing ?? ABSENT,
      referenceIds: parse<string[]>(picture.reference_ids) ?? [],
      prompt: picture.prompt,
      chosen: truthy(picture.chosen),
      technical: {
        readable: parse<{ readable?: boolean }>(picture.measure)?.readable ?? ABSENT,
        width: parse<{ width?: number }>(picture.measure)?.width ?? ABSENT,
        height: parse<{ height?: number }>(picture.measure)?.height ?? ABSENT,
      },
      words: parse<string[]>(picture.words) ?? [],
      gate1: {
        outcome: gate1?.outcome ?? ABSENT,
        coverage: gate1?.coverage ?? ABSENT,
      },
      gate1Steps: (gate1?.steps ?? []).map((step) => ({
        step: step.step,
        outcome: step.outcome ?? ABSENT,
        reasons: step.reasons ?? [],
        families: (step.reasons ?? []).map((reason) => classify(reason)),
      })),
      gate1s: {
        outcome: gate1s?.outcome ?? ABSENT,
        coverage: gate1s?.coverage ?? ABSENT,
        compared: gate1s?.compared ?? ABSENT,
        suspicion: gate1s?.suspicion ?? ABSENT,
        reasons: gate1s?.reasons ?? [],
      },
      score: parse<{ total?: number }>(picture.score)?.total ?? ABSENT,
      witness: {
        things: entities.length,
        clipped: entities.filter((entity) => entity.clippedByEdge === true).length,
        clippedNames: entities
          .filter((entity) => entity.clippedByEdge === true)
          .map((entity) => entity.name ?? ''),
      },
      reconcile: {
        failed: parse<string[]>(reconciliation?.failed) ?? [],
      },
      costCents: receipt?.cost_cents ?? ABSENT,
      rateCents: receipt?.rate_cents ?? ABSENT,
    }
  })

  const narrationItems = ownNarrations(rows).map((narration) => {
    const receipt = rows.speech_receipt.find((row) => row.narration_id === narration.narration_id)
    return {
      narrationId: narration.narration_id,
      inherited: keptNarrations.has(narration.narration_id),
      shotId: shotIdOf(narration.shot_unit),
      text: narration.text,
      characters: String(narration.text).length,
      probedSeconds: parse<MeasureBlob>(narration.probe)?.durationSeconds ?? ABSENT,
      timingsParsed: (parse<unknown[]>(narration.words) ?? []).length > 0,
      model: receipt?.model ?? ABSENT,
      costCents: receipt?.cost_cents ?? ABSENT,
      rateCents: receipt?.rate_cents ?? ABSENT,
      transientErrors: receipt?.transient_errors ?? ABSENT,
    }
  })

  const takeItems = ownTakes(rows).map((take) => {
    const receipt = rows.video_receipt.find((row) => row.take_id === take.take_id)
    const probe = parse<MeasureBlob>(take.probe)
    const scan = parse<{
      black?: unknown[]
      frozen?: unknown[]
      silent?: unknown[]
      loudnessLufs?: number
    }>(take.scan)
    const sound = parse<{ speech?: boolean; music?: boolean }>(take.sound)
    const delivered = probe?.durationSeconds
    return {
      takeId: take.take_id,
      inherited: keptTakes.has(take.take_id),
      shotId: shotIdOf(take.shot_unit),
      number: take.number,
      mode: take.mode,
      pictureId: take.picture_id ?? ABSENT,
      seed: take.seed,
      requestedSeconds: take.requested_seconds,
      deliveredSeconds: delivered ?? ABSENT,
      deliveredDelta: typeof delivered === 'number' ? delivered - take.requested_seconds : ABSENT,
      prompt: take.prompt,
      expandedPrompt: take.expanded_prompt,
      expansionMode: receipt?.expansion_mode ?? ABSENT,
      probe: {
        readable: probe?.readable ?? ABSENT,
        codec: probe?.video?.codec ?? ABSENT,
        width: probe?.video?.width ?? ABSENT,
        height: probe?.video?.height ?? ABSENT,
        fps: probe?.video?.fps ?? ABSENT,
        frames: probe?.video?.frames ?? ABSENT,
        audio: probe?.audio?.codec ?? ABSENT,
        moovFirst: probe?.moovFirst ?? ABSENT,
      },
      // Only black and frozen can fail Gate 2; silence and loudness are recorded and fail
      // nothing (S-072).
      scan: {
        black: (scan?.black ?? []).length,
        frozen: (scan?.frozen ?? []).length,
        silent: (scan?.silent ?? []).length,
        loudnessLufs: scan?.loudnessLufs ?? ABSENT,
      },
      sound: { speech: sound?.speech ?? ABSENT, music: sound?.music ?? ABSENT },
      gates: (parse<VerdictBlob[]>(take.verdicts) ?? []).map((verdict) => ({
        gate: verdict.gate,
        outcome: verdict.outcome,
        reasons: verdict.reasons ?? [],
      })),
      outcome: take.outcome ?? ABSENT,
      costCents: receipt?.cost_cents ?? ABSENT,
      rateCents: receipt?.rate_cents ?? ABSENT,
      resolution: receipt?.resolution ?? ABSENT,
      transientErrors: receipt?.transient_errors ?? ABSENT,
    }
  })

  const degradationRows = rows.degradation.map((row, i) => ({
    shotId: row.shot_id,
    gate: row.gate,
    reason: row.reason,
    inherited: inherited.degradations[i]?.inherited ?? false,
  }))

  const plannedSeconds = (plan?.shots ?? []).reduce(
    (total, shot) => total + shot.durationSeconds,
    0,
  )

  return {
    run: {
      runId: run.run_id,
      requestId: run.request_id,
      worldId: asked?.worldId ?? ABSENT,
      briefKey: hash(briefKeyInput(run)),
      until,
      ceilingCents: asked?.options?.budgetCents ?? ABSENT,
      // Recorded ONLY in a budget-limited result, because the cap is parsed from BUDGET.md at
      // run time and sits on no row.
      capCents: ended?.capCents ?? ABSENT,
      // READ from Plan.pictures, which is present only when it is not the default — so an
      // absent field means `recurring` and never "not recorded".
      pictureRule: plan === undefined ? ABSENT : (plan.pictures ?? 'recurring'),
      // No row records which engine made a run (`run-provenance`, not built).
      engineVersion: NOT_RECORDED,
      resumes,
      partial: until !== 'video' || resumes !== ABSENT,
      partsCovered: PART_NAMES.filter((part) => partReached[part] && !partInherited[part]),
      ending: {
        status: ended?.status ?? ABSENT,
        rule: ended?.rule ?? ABSENT,
        step: ended?.step ?? ABSENT,
        detail: ended?.detail ?? ABSENT,
        failure: run.failure ?? ABSENT,
      },
      reel: {
        madeAFile: ended?.video?.path !== undefined && output?.readable === true,
        durationSeconds: output?.durationSeconds ?? ABSENT,
        frames: output?.video?.frames ?? ABSENT,
      },
      costCents: {
        image: sum(rows.generation_receipt.map((receipt) => receipt.cost_cents)),
        video: sum(rows.video_receipt.map((receipt) => receipt.cost_cents)),
        speech: sum(rows.speech_receipt.map((receipt) => receipt.cost_cents)),
        // Model calls are not billed per call (S-129): `model_receipt` has no cost column, so
        // tokens are reported instead.
        model: NOT_RECORDED,
        lost: sum(rows.lost_call.map((lost) => lost.cost_cents)),
      },
      modelTokens: {
        input: sum(rows.model_receipt.map((receipt) => receipt.input_tokens)),
        output: sum(rows.model_receipt.map((receipt) => receipt.output_tokens)),
      },
      estimateCents: planRow?.estimate_cents ?? ABSENT,
      estimateExcludes: ESTIMATE_EXCLUDES,
      wallClockSeconds: between(run.created_at, lastEvent?.at),
      transients: {
        speech: sum(rows.speech_receipt.map((receipt) => receipt.transient_errors)),
        video: sum(rows.video_receipt.map((receipt) => receipt.transient_errors)),
        // `ImageAnswer` has only `made` and `refused`, so the image port cannot report a
        // transient at all; `model_receipt` carries no such column (six runs died of it).
        image: NOT_RECORDED,
        model: NOT_RECORDED,
      },
      stages: {
        plan: stageSpan(rows, 'plan'),
        stills: stageSpan(rows, 'stills'),
        video: stageSpan(rows, 'video'),
      },
      jobs: jobs.map((job) => ({
        kind: job.kind,
        queuedSeconds: between(job.run_at, job.locked_at),
        attempts: job.attempts,
        leaseUntil: job.lease_until ?? ABSENT,
        error: job.error ?? ABSENT,
        costCents: job.cost_cents,
      })),
      lostCalls: rows.lost_call.map((lost) => ({
        port: lost.port,
        model: lost.model,
        costCents: lost.cost_cents,
        detail: lost.detail,
      })),
      refusedAnswers: rows.refused_answer.map((refused) => ({
        port: refused.port,
        role: refused.role ?? ABSENT,
        call: refused.call ?? ABSENT,
        about: parse<string[]>(refused.about) ?? [],
        ask: refused.ask,
        reasons: parse<string[]>(refused.reasons) ?? [],
      })),
      // A gap between consecutive receipts, never a latency: every receipt carries one `at`,
      // so no per-call duration exists anywhere. The first call's gap is absent.
      receiptGaps: receiptInstants.map((receipt, i) =>
        i === 0 ? ABSENT : between(receiptInstants[i - 1]?.at, receipt.at),
      ),
    },
    parts: {
      plan: {
        reached: partReached.plan,
        reachedBy: REACHED_BY.plan,
        inherited: partInherited.plan,
        span: spanOf('plan', stageSpan(rows, 'plan')),
        forks: rows.plan.map((row) => ({
          role: row.role,
          unitCount: row.unit_count,
          axis: row.axis,
          plannedImageCalls: parse<Plan>(row.plan)?.plannedImageCalls ?? ABSENT,
          estimateCents: row.estimate_cents,
          gate0: {
            outcome: parse<{ outcome?: string }>(row.verdict)?.outcome ?? ABSENT,
            failed: parse<{ failed?: string[] }>(row.verdict)?.failed ?? [],
          },
          score: row.score ?? ABSENT,
          selected: truthy(row.selected),
        })),
        selectedRole: planRow?.role ?? ABSENT,
        repairPlan: rows.plan.some((row) => row.role === 'repair'),
        shots: plan?.shots.length ?? ABSENT,
        secondsPerShot: (plan?.shots ?? []).map((shot) => shot.durationSeconds),
        totalSeconds: plan === undefined ? ABSENT : plannedSeconds,
        subjects: plan?.subjects.length ?? ABSENT,
        subjectsPerShot: subjectsPerShot(rows),
        maxSubjectsPerShot: plan === undefined ? ABSENT : Math.max(0, ...subjectsPerShot(rows)),
        // The plan records its criteria per PLAN, not per unit, so they are reported as the
        // plan carries them.
        criteria: {
          mustShow: (plan?.criteria.mustShow ?? []).map((criterion) => criterion.id),
          mustNotShow: (plan?.criteria.mustNotShow ?? []).map((criterion) => criterion.id),
        },
        modelCalls: planAsks(rows).receipts.map((receipt) => ({
          role: receipt.role,
          call: receipt.call,
          model: receipt.model,
          temperature: receipt.temperature,
          inputTokens: receipt.input_tokens,
          outputTokens: receipt.output_tokens,
        })),
        admission: {
          estimateCents: planRow?.estimate_cents ?? ABSENT,
          ceilingCents: asked?.options?.budgetCents ?? ABSENT,
        },
      },
      pictures: {
        reached: partReached.pictures,
        reachedBy: REACHED_BY.pictures,
        span: spanOf('pictures', stageSpan(rows, 'stills')),
        planned: plan?.plannedImageCalls ?? ABSENT,
        attempted: ownPictures(rows).length,
        chosen: rows.picture.filter((picture) => truthy(picture.chosen)).length,
        imageCallsUsedOfSix:
          rows.generation_receipt.length +
          rows.lost_call.filter((lost) => lost.port === 'image').length,
        callsLost: rows.lost_call.filter((lost) => lost.port === 'image').length,
        repairPictures: rows.picture.filter((picture) =>
          String(picture.picture_id).endsWith('-repair'),
        ).length,
        retriesPerShot: [...new Set(ownPictures(rows).map((picture) => picture.shot_unit))]
          .sort((a, b) => a - b)
          .map(
            (unit) => ownPictures(rows).filter((picture) => picture.shot_unit === unit).length - 1,
          ),
        shotsDegraded: degradationRows,
        shotsDegradedThisRunMade: degradationRows.filter((row) => !row.inherited).length,
        items: pictureItems,
      },
      narration: {
        reached: partReached.narration,
        reachedBy: REACHED_BY.narration,
        span: spanOf('narration', sharedSpan(rows)),
        // The record holds nothing that splits the shared figure, so neither part reports a
        // span of its own.
        ownSpan: NOT_RECORDED,
        refusedTimings: rows.refused_answer.filter((refused) => refused.port === 'speech').length,
        items: narrationItems,
      },
      clips: {
        reached: partReached.clips,
        reachedBy: REACHED_BY.clips,
        span: spanOf('clips', sharedSpan(rows)),
        ownSpan: NOT_RECORDED,
        imageToVideo: ownTakes(rows).filter((take) => take.mode === 'image-to-video').length,
        textToVideo: ownTakes(rows).filter((take) => take.mode === 'text-to-video').length,
        ladderDepthPerShot: [...new Set(ownTakes(rows).map((take) => take.shot_unit))]
          .sort((a, b) => a - b)
          .map((unit) => ownTakes(rows).filter((take) => take.shot_unit === unit).length),
        stillHolds: rows.still_hold.map((held, i) => ({
          shotId: held.shot_id,
          pictureId: held.picture_id,
          takeIds: parse<string[]>(held.take_ids) ?? [],
          reason: held.reason,
          inherited: inherited.stillHolds[i]?.inherited ?? false,
        })),
        reboughtAfterTransient: rows.video_receipt.filter((receipt) => receipt.transient_errors > 0)
          .length,
        items: takeItems,
      },
      cut: {
        reached: partReached.cut,
        reachedBy: REACHED_BY.cut,
        span: cutSpan(rows),
        finished: render !== undefined && typeof render.finished_at === 'string',
        manifestHash: render?.hash ?? ABSENT,
        manifestShots: (manifest?.shots ?? []).length,
        profile: parse<{ container?: string }>(render?.profile)?.container ?? ABSENT,
        invocations: (parse<unknown[]>(render?.invocations) ?? []).length,
        output: {
          readable: output?.readable ?? ABSENT,
          durationSeconds: output?.durationSeconds ?? ABSENT,
          frames: output?.video?.frames ?? ABSENT,
          audio: output?.audio?.codec ?? ABSENT,
        },
        plannedTotalSeconds: plan === undefined ? ABSENT : plannedSeconds,
        gate7: {
          outcome: gate7?.outcome ?? ABSENT,
          coverage: gate7?.coverage?.strategy ?? ABSENT,
          asked: (gate7?.answer ?? []).length,
          yes: (gate7?.answer ?? []).filter((one) => one.answer === 'yes').length,
          answeredNo: (gate7?.answer ?? [])
            .filter((one) => one.answer !== 'yes')
            .map((one) => one.question ?? ''),
        },
        // Two ratings compare only when both stamps match: S-158 changed the question set.
        questionSetHash: (() => {
          const input = gate7QuestionSetInput(rows.render)
          return input === undefined ? ABSENT : hash(input)
        })(),
        holds: rows.hold.map((held, i) => ({
          shotId: held.shot_id,
          seconds: held.seconds,
          reason: held.reason,
          inherited: inherited.holds[i]?.inherited ?? false,
        })),
        costCents: sum(jobs.filter((job) => job.kind === 'reel.assemble').map((j) => j.cost_cents)),
      },
    },
  }
}

export type Scorecard = ReturnType<typeof scorecard>
export type { Counted, ReasonFamily, VerbatimSite }

// ---------------------------------------------------------------- field, meet column

/**
 * Every field the scorecard names, against the column Gate 2 names for it. An entry with NO
 * column is a field no column can hold: it reads 'not recorded', or it is one of the declared
 * labels. Check 1 proves each one by moving its column and watching the field move.
 */
export const FIELD_COLUMNS: Record<string, readonly string[]> = {
  'run.runId': ['run.run_id'],
  'run.requestId': ['run.request_id'],
  'run.worldId': ['run.request_canonical'],
  'run.briefKey': ['run.request_canonical'],
  'run.until': ['run.request_canonical'],
  'run.ceilingCents': ['run.request_canonical'],
  'run.capCents': ['run.result'],
  'run.pictureRule': ['plan.plan', 'plan.selected'],
  'run.engineVersion': [],
  'run.resumes': ['run.resumes'],
  'run.partial': ['run.resumes', 'run.request_canonical'],
  'run.partsCovered[]': ['run_event.body', 'job.kind'],
  'run.ending.status': ['run.result'],
  'run.ending.rule': ['run.result'],
  'run.ending.step': ['run.result'],
  'run.ending.detail': ['run.result'],
  'run.ending.failure': ['run.failure'],
  'run.reel.madeAFile': ['run.result', 'render.measure'],
  'run.reel.durationSeconds': ['render.measure'],
  'run.reel.frames': ['render.measure'],
  'run.costCents.image': ['generation_receipt.cost_cents'],
  'run.costCents.video': ['video_receipt.cost_cents'],
  'run.costCents.speech': ['speech_receipt.cost_cents'],
  'run.costCents.model': [],
  'run.costCents.lost': ['lost_call.cost_cents'],
  'run.modelTokens.input': ['model_receipt.input_tokens'],
  'run.modelTokens.output': ['model_receipt.output_tokens'],
  'run.estimateCents': ['plan.estimate_cents', 'plan.selected'],
  'run.estimateExcludes': [],
  'run.wallClockSeconds': ['run.created_at', 'run_event.at'],
  'run.transients.speech': ['speech_receipt.transient_errors'],
  'run.transients.video': ['video_receipt.transient_errors'],
  'run.transients.image': [],
  'run.transients.model': [],
  'run.stages.plan.seconds': ['run_event.at', 'run_event.body'],
  'run.stages.plan.rule': ['run_event.body'],
  'run.stages.stills.seconds': ['run_event.at', 'run_event.body'],
  'run.stages.stills.rule': ['run_event.body'],
  'run.stages.video.seconds': ['run_event.at', 'run_event.body'],
  'run.stages.video.rule': ['run_event.body'],
  'run.jobs[].kind': ['job.kind', 'job.correlation_id'],
  'run.jobs[].queuedSeconds': ['job.run_at', 'job.locked_at'],
  'run.jobs[].attempts': ['job.attempts'],
  'run.jobs[].leaseUntil': ['job.lease_until'],
  'run.jobs[].error': ['job.error'],
  'run.jobs[].costCents': ['job.cost_cents'],
  'run.lostCalls[].port': ['lost_call.port'],
  'run.lostCalls[].model': ['lost_call.model'],
  'run.lostCalls[].costCents': ['lost_call.cost_cents'],
  'run.lostCalls[].detail': ['lost_call.detail'],
  'run.refusedAnswers[].port': ['refused_answer.port'],
  'run.refusedAnswers[].role': ['refused_answer.role'],
  'run.refusedAnswers[].call': ['refused_answer.call'],
  'run.refusedAnswers[].about[]': ['refused_answer.about'],
  'run.refusedAnswers[].ask': ['refused_answer.ask'],
  'run.refusedAnswers[].reasons[]': ['refused_answer.reasons'],
  'run.receiptGaps[]': [
    'model_receipt.at',
    'generation_receipt.at',
    'speech_receipt.at',
    'video_receipt.at',
  ],

  'parts.plan.reached': ['run_event.body'],
  'parts.plan.reachedBy': [],
  'parts.plan.inherited': ['run.resumes'],
  'parts.plan.span.seconds': ['run_event.at', 'run_event.body'],
  'parts.plan.span.rule': ['run_event.body', 'run.resumes'],
  'parts.plan.forks[].role': ['plan.role'],
  'parts.plan.forks[].unitCount': ['plan.unit_count'],
  'parts.plan.forks[].axis': ['plan.axis'],
  'parts.plan.forks[].plannedImageCalls': ['plan.plan'],
  'parts.plan.forks[].estimateCents': ['plan.estimate_cents'],
  'parts.plan.forks[].gate0.outcome': ['plan.verdict'],
  'parts.plan.forks[].gate0.failed[]': ['plan.verdict'],
  'parts.plan.forks[].score': ['plan.score'],
  'parts.plan.forks[].selected': ['plan.selected'],
  'parts.plan.selectedRole': ['plan.selected', 'plan.role'],
  'parts.plan.repairPlan': ['plan.role'],
  'parts.plan.shots': ['plan.plan', 'plan.selected'],
  'parts.plan.secondsPerShot[]': ['plan.plan', 'plan.selected'],
  'parts.plan.totalSeconds': ['plan.plan', 'plan.selected'],
  'parts.plan.subjects': ['plan.plan', 'plan.selected'],
  'parts.plan.subjectsPerShot[]': ['plan.plan', 'plan.selected'],
  'parts.plan.maxSubjectsPerShot': ['plan.plan', 'plan.selected'],
  'parts.plan.criteria.mustShow[]': ['plan.plan', 'plan.selected'],
  'parts.plan.criteria.mustNotShow[]': ['plan.plan', 'plan.selected'],
  'parts.plan.modelCalls[].role': ['model_receipt.role'],
  'parts.plan.modelCalls[].call': ['model_receipt.call'],
  'parts.plan.modelCalls[].model': ['model_receipt.model'],
  'parts.plan.modelCalls[].temperature': ['model_receipt.temperature'],
  'parts.plan.modelCalls[].inputTokens': ['model_receipt.input_tokens'],
  'parts.plan.modelCalls[].outputTokens': ['model_receipt.output_tokens'],
  'parts.plan.admission.estimateCents': ['plan.estimate_cents', 'plan.selected'],
  'parts.plan.admission.ceilingCents': ['run.request_canonical'],

  'parts.pictures.reached': ['run_event.body'],
  'parts.pictures.reachedBy': [],
  'parts.pictures.span.seconds': ['run_event.at', 'run_event.body'],
  'parts.pictures.span.rule': ['run_event.body'],
  'parts.pictures.planned': ['plan.plan', 'plan.selected'],
  'parts.pictures.attempted': ['picture.kept_from'],
  'parts.pictures.chosen': ['picture.chosen'],
  'parts.pictures.imageCallsUsedOfSix': ['generation_receipt.id', 'lost_call.port'],
  'parts.pictures.callsLost': ['lost_call.port'],
  'parts.pictures.repairPictures': ['picture.picture_id'],
  'parts.pictures.retriesPerShot[]': ['picture.shot_unit'],
  'parts.pictures.shotsDegraded[].shotId': ['degradation.shot_id'],
  'parts.pictures.shotsDegraded[].gate': ['degradation.gate'],
  'parts.pictures.shotsDegraded[].reason': ['degradation.reason'],
  'parts.pictures.shotsDegraded[].inherited': ['degradation.shot_id', 'picture.kept_from'],
  'parts.pictures.shotsDegradedThisRunMade': ['degradation.shot_id', 'picture.kept_from'],
  'parts.pictures.items[].pictureId': ['picture.picture_id'],
  'parts.pictures.items[].inherited': ['picture.kept_from'],
  'parts.pictures.items[].shotId': ['picture.shot_unit'],
  'parts.pictures.items[].attempt': ['picture.attempt'],
  'parts.pictures.items[].role': ['picture.role'],
  'parts.pictures.items[].subjectId': ['picture.subject_id'],
  'parts.pictures.items[].label': ['picture.label'],
  'parts.pictures.items[].framing': ['picture.framing'],
  'parts.pictures.items[].referenceIds[]': ['picture.reference_ids'],
  'parts.pictures.items[].prompt': ['picture.prompt'],
  'parts.pictures.items[].chosen': ['picture.chosen'],
  'parts.pictures.items[].technical.readable': ['picture.measure'],
  'parts.pictures.items[].technical.width': ['picture.measure'],
  'parts.pictures.items[].technical.height': ['picture.measure'],
  'parts.pictures.items[].words[]': ['picture.words'],
  'parts.pictures.items[].gate1.outcome': ['picture.gate1'],
  'parts.pictures.items[].gate1.coverage': ['picture.gate1'],
  'parts.pictures.items[].gate1Steps[].step': ['picture.gate1'],
  'parts.pictures.items[].gate1Steps[].outcome': ['picture.gate1'],
  'parts.pictures.items[].gate1Steps[].reasons[]': ['picture.gate1'],
  'parts.pictures.items[].gate1Steps[].families[]': ['picture.gate1'],
  'parts.pictures.items[].gate1s.outcome': ['picture.gate1s'],
  'parts.pictures.items[].gate1s.coverage': ['picture.gate1s'],
  'parts.pictures.items[].gate1s.compared': ['picture.gate1s'],
  'parts.pictures.items[].gate1s.suspicion': ['picture.gate1s'],
  'parts.pictures.items[].gate1s.reasons[]': ['picture.gate1s'],
  'parts.pictures.items[].score': ['picture.score'],
  'parts.pictures.items[].witness.things': ['observation.observation'],
  'parts.pictures.items[].witness.clipped': ['observation.observation'],
  'parts.pictures.items[].witness.clippedNames[]': ['observation.observation'],
  'parts.pictures.items[].reconcile.failed[]': ['reconciliation.failed'],
  'parts.pictures.items[].costCents': ['generation_receipt.cost_cents'],
  'parts.pictures.items[].rateCents': ['generation_receipt.rate_cents'],

  'parts.narration.reached': ['job.kind', 'job.correlation_id'],
  'parts.narration.reachedBy': [],
  'parts.narration.span.seconds': ['run_event.at', 'render.started_at'],
  'parts.narration.span.rule': ['run_event.body'],
  'parts.narration.ownSpan': [],
  'parts.narration.refusedTimings': ['refused_answer.port'],
  'parts.narration.items[].narrationId': ['narration.narration_id'],
  'parts.narration.items[].inherited': ['narration.kept_from'],
  'parts.narration.items[].shotId': ['narration.shot_unit'],
  'parts.narration.items[].text': ['narration.text'],
  'parts.narration.items[].characters': ['narration.text'],
  'parts.narration.items[].probedSeconds': ['narration.probe'],
  'parts.narration.items[].timingsParsed': ['narration.words'],
  'parts.narration.items[].model': ['speech_receipt.model'],
  'parts.narration.items[].costCents': ['speech_receipt.cost_cents'],
  'parts.narration.items[].rateCents': ['speech_receipt.rate_cents'],
  'parts.narration.items[].transientErrors': ['speech_receipt.transient_errors'],

  'parts.clips.reached': ['job.kind', 'job.correlation_id'],
  'parts.clips.reachedBy': [],
  'parts.clips.span.seconds': ['run_event.at', 'render.started_at'],
  'parts.clips.span.rule': ['run_event.body'],
  'parts.clips.ownSpan': [],
  'parts.clips.imageToVideo': ['take.mode'],
  'parts.clips.textToVideo': ['take.mode'],
  'parts.clips.ladderDepthPerShot[]': ['take.shot_unit'],
  'parts.clips.stillHolds[].shotId': ['still_hold.shot_id'],
  'parts.clips.stillHolds[].pictureId': ['still_hold.picture_id'],
  'parts.clips.stillHolds[].takeIds[]': ['still_hold.take_ids'],
  'parts.clips.stillHolds[].reason': ['still_hold.reason'],
  'parts.clips.stillHolds[].inherited': ['still_hold.take_ids', 'take.kept_from'],
  'parts.clips.reboughtAfterTransient': ['video_receipt.transient_errors'],
  'parts.clips.items[].takeId': ['take.take_id'],
  'parts.clips.items[].inherited': ['take.kept_from'],
  'parts.clips.items[].shotId': ['take.shot_unit'],
  'parts.clips.items[].number': ['take.number'],
  'parts.clips.items[].mode': ['take.mode'],
  'parts.clips.items[].pictureId': ['take.picture_id'],
  'parts.clips.items[].seed': ['take.seed'],
  'parts.clips.items[].requestedSeconds': ['take.requested_seconds'],
  'parts.clips.items[].deliveredSeconds': ['take.probe'],
  'parts.clips.items[].deliveredDelta': ['take.probe', 'take.requested_seconds'],
  'parts.clips.items[].prompt': ['take.prompt'],
  'parts.clips.items[].expandedPrompt': ['take.expanded_prompt'],
  'parts.clips.items[].expansionMode': ['video_receipt.expansion_mode'],
  'parts.clips.items[].probe.readable': ['take.probe'],
  'parts.clips.items[].probe.codec': ['take.probe'],
  'parts.clips.items[].probe.width': ['take.probe'],
  'parts.clips.items[].probe.height': ['take.probe'],
  'parts.clips.items[].probe.fps': ['take.probe'],
  'parts.clips.items[].probe.frames': ['take.probe'],
  'parts.clips.items[].probe.audio': ['take.probe'],
  'parts.clips.items[].probe.moovFirst': ['take.probe'],
  'parts.clips.items[].scan.black': ['take.scan'],
  'parts.clips.items[].scan.frozen': ['take.scan'],
  'parts.clips.items[].scan.silent': ['take.scan'],
  'parts.clips.items[].scan.loudnessLufs': ['take.scan'],
  'parts.clips.items[].sound.speech': ['take.sound'],
  'parts.clips.items[].sound.music': ['take.sound'],
  'parts.clips.items[].gates[].gate': ['take.verdicts'],
  'parts.clips.items[].gates[].outcome': ['take.verdicts'],
  'parts.clips.items[].gates[].reasons[]': ['take.verdicts'],
  'parts.clips.items[].outcome': ['take.outcome'],
  'parts.clips.items[].costCents': ['video_receipt.cost_cents'],
  'parts.clips.items[].rateCents': ['video_receipt.rate_cents'],
  'parts.clips.items[].resolution': ['video_receipt.resolution'],
  'parts.clips.items[].transientErrors': ['video_receipt.transient_errors'],

  'parts.cut.reached': ['job.kind', 'job.correlation_id'],
  'parts.cut.reachedBy': [],
  'parts.cut.span.seconds': ['render.started_at', 'render.finished_at'],
  'parts.cut.span.rule': ['render.started_at'],
  'parts.cut.finished': ['render.finished_at'],
  'parts.cut.manifestHash': ['render.hash'],
  'parts.cut.manifestShots': ['render.render_manifest'],
  'parts.cut.profile': ['render.profile'],
  'parts.cut.invocations': ['render.invocations'],
  'parts.cut.output.readable': ['render.measure'],
  'parts.cut.output.durationSeconds': ['render.measure'],
  'parts.cut.output.frames': ['render.measure'],
  'parts.cut.output.audio': ['render.measure'],
  'parts.cut.plannedTotalSeconds': ['plan.plan', 'plan.selected'],
  'parts.cut.gate7.outcome': ['render.gate7'],
  'parts.cut.gate7.coverage': ['render.gate7'],
  'parts.cut.gate7.asked': ['render.gate7'],
  'parts.cut.gate7.yes': ['render.gate7'],
  'parts.cut.gate7.answeredNo[]': ['render.gate7'],
  'parts.cut.questionSetHash': ['render.gate7'],
  'parts.cut.holds[].shotId': ['hold.shot_id'],
  'parts.cut.holds[].seconds': ['hold.seconds'],
  'parts.cut.holds[].reason': ['hold.reason'],
  'parts.cut.holds[].inherited': ['render.render_manifest', 'take.kept_from'],
  // The assemble job holds no port that buys (I-18), so this is 0 on every run the record
  // holds; it is read from the job row all the same, never assumed.
  'parts.cut.costCents': ['job.cost_cents'],
}
