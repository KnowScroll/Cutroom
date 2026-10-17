// What each chart draws, as numbers (benchmark-view, Gate 3 check 15; S-201's approved shape).
//
// Eight charts, named rather than counted — "the six charts" was wrong by two when check 15 was
// first written (S-205's fault 4). Every one of them is a list of POINTS derived here, from the
// payloads and nothing else, so the page's markup, its numbers table and its drawing all read the
// same list. A chart whose table disagrees with its points is what check 15 fails on.
//
// No arithmetic of the benchmark's own is repeated here: a rating, a cost and a span are read
// from the scorecard `@cutroom/benchmark` already returns. What this file does is select, group
// and order.

import type { FleetPayload, FleetRun, RunPayload } from './payload.ts'

/** The eight charts, in the order the page lays them out. */
export const CHART_NAMES = [
  'where-reels-die',
  'scores-over-time',
  'group-subjects-in-shot',
  'group-picture-rule',
  'group-plan-shots',
  'group-world',
  'cost-and-wall-clock',
  'run-seconds-and-cents',
] as const

export type ChartName = (typeof CHART_NAMES)[number]

/**
 * Ten decisions, below which a group is drawn OUTLINED rather than solid (S-204).
 *
 * No band is computed anywhere — the arithmetic for one went with the stopped feature (S-200) and
 * is not rebuilt under another name. A count beside a figure is the honest substitute, and the
 * threshold is stated as a judgement rather than dressed up: today's world groups are 33 decisions
 * and 5, and that 5 is exactly the bar that must not read as confident.
 */
export const CONFIDENT_AT = 10

/** Past this share of refusals a bar is drawn in the critical colour, the figure always written. */
export const HOT_SHARE = 70

// ---------------------------------------------------------------- where reels die

/** One stage of the sequence, with how many runs reached it and what the one before it lost. */
export interface StagePoint {
  stage: string
  label: string
  runs: number
  /** How many runs the previous stage did not hand on. Drawn in red above the bar. */
  dropped: number
}

/** The sequence, in stage order. NOT a funnel (refused by name) and NOT sorted. */
const STAGES = [
  ['plan', 'Plan'],
  ['pictures', 'Pictures'],
  ['narration', 'Narration'],
  ['clips', 'Clips'],
  ['cut', 'Cut'],
  ['reel', 'Reel made'],
] as const

export function stagePoints(fleet: FleetPayload): StagePoint[] {
  const points: StagePoint[] = []
  for (const [stage, label] of STAGES) {
    const runs =
      stage === 'reel'
        ? fleet.runs.filter((run) => run.reel.madeAFile).length
        : fleet.runs.filter((run) => run.rating.parts[stage]?.reached === true).length
    const before = points[points.length - 1]?.runs
    points.push({
      stage,
      label,
      runs,
      dropped: before === undefined ? 0 : Math.max(0, before - runs),
    })
  }
  return points
}

/** The one line under the chart: where the sequence loses most, in plain words. */
export function biggestDrop(points: readonly StagePoint[]): string {
  let worstAt = 0
  for (const [i, point] of points.entries()) {
    if (i > 0 && point.dropped > (points[worstAt]?.dropped ?? 0)) worstAt = i
  }
  const at = points[worstAt]
  if (at === undefined || at.dropped === 0 || worstAt === 0) {
    return 'No stage of the sequence hands on fewer runs than the one before it.'
  }
  const before = points[worstAt - 1]
  return `The biggest fall is from ${before?.label} to ${at.label}: ${at.dropped} runs of ${before?.runs} do not reach it.`
}

// ---------------------------------------------------------------- scores over time

/** One point of one line: a part's rating, or the run's own, on the day the run ran. */
export interface ScorePoint {
  runId: string
  at: string
  series: string
  label: string
  value: number
}

const SERIES_LABELS: Record<string, string> = {
  overall: 'Overall rating',
  plan: 'Plan',
  pictures: 'Pictures',
  narration: 'Narration',
  clips: 'Clips',
  cut: 'Cut',
}

/**
 * Six lines against the date each run ran. **A GAP where the run never reached that part, never
 * a zero** — so a part with no rating has no point here at all, rather than a point at the floor
 * a run can also earn.
 */
export function scorePoints(fleet: FleetPayload): ScorePoint[] {
  const points: ScorePoint[] = []
  for (const run of fleet.runs) {
    if (typeof run.rating.rating === 'number') {
      points.push({
        runId: run.runId,
        at: run.createdAt,
        series: 'overall',
        label: SERIES_LABELS.overall ?? 'overall',
        value: run.rating.rating,
      })
    }
    for (const [part, rated] of Object.entries(run.rating.parts)) {
      if (typeof rated.rating !== 'number') continue
      points.push({
        runId: run.runId,
        at: run.createdAt,
        series: part,
        label: SERIES_LABELS[part] ?? part,
        value: rated.rating,
      })
    }
  }
  return points
}

/** The six lines a reader may switch off, named for the legend. */
export const scoreSeries = (): Array<{ series: string; label: string }> =>
  Object.entries(SERIES_LABELS).map(([series, label]) => ({ series, label }))

// ---------------------------------------------------------------- the four group-by cards

/** One group of decided pictures: its size, its refusals, and how it is drawn. */
export interface GroupPoint {
  key: string
  label: string
  /** How many pictures Gate 1 reached a verdict on in this group. */
  decided: number
  refused: number
  /** The share of this group's pictures Gate 1 refused, as a percentage to one decimal. */
  share: number
  /** `decided >= CONFIDENT_AT`. No band is computed: this is the count's own statement. */
  confident: boolean
  /** `outlined` below the threshold, `solid` at or above it. */
  draw: 'outlined' | 'solid'
  /** Past HOT_SHARE the bar is drawn critical, with the figure written beside it either way. */
  aboveSeventy: boolean
}

export interface GroupCard {
  chart: ChartName
  title: string
  /** The one plain line that says what the card is for. */
  note: string
  points: GroupPoint[]
}

interface Keyed {
  key: string
  label: string
  /** Where two keys sort by something other than their text. */
  order: number
  refused: boolean
}

function gather(keyed: readonly Keyed[]): GroupPoint[] {
  const groups = new Map<
    string,
    { label: string; order: number; decided: number; refused: number }
  >()
  for (const one of keyed) {
    const at = groups.get(one.key) ?? { label: one.label, order: one.order, decided: 0, refused: 0 }
    at.decided += 1
    if (one.refused) at.refused += 1
    groups.set(one.key, at)
  }
  return [...groups.entries()]
    .sort((a, b) => a[1].order - b[1].order || a[0].localeCompare(b[0]))
    .map(([key, at]) => {
      const share = at.decided === 0 ? 0 : Math.round((at.refused / at.decided) * 1000) / 10
      return {
        key,
        label: at.label,
        decided: at.decided,
        refused: at.refused,
        share,
        confident: at.decided >= CONFIDENT_AT,
        draw: at.decided >= CONFIDENT_AT ? ('solid' as const) : ('outlined' as const),
        aboveSeventy: share > HOT_SHARE,
      }
    })
}

/** `absent` is what the scorecard says when no plan was selected; a reader is told that. */
const plainly = (value: string): string => (value === 'absent' ? 'no plan selected' : value)

/**
 * The four cards: subjects named in the shot, picture rule in force, shots in the plan, world the
 * brief came from.
 *
 * **The subjects card keys off `picture.shot_unit`**, through the `subjectsInShot` the payload
 * already carries — the integer column indexed into the selected plan's shots, never a digit
 * parsed off the end of an id, which works only while the scorecard spells a shot `shot-${unit}`.
 * A picture whose shot is beyond the selected plan's shots, and every picture of a run whose plan
 * was never selected, carries `null` there and joins NO group rather than the last one.
 */
export function groupCards(fleet: FleetPayload): GroupCard[] {
  const subjects: Keyed[] = []
  const rules: Keyed[] = []
  const shots: Keyed[] = []
  const worlds: Keyed[] = []
  for (const run of fleet.runs) {
    for (const picture of run.pictures) {
      const refused = picture.refused
      if (picture.subjectsInShot !== null) {
        const count = picture.subjectsInShot
        subjects.push({
          key: String(count),
          label: count === 1 ? '1 subject' : `${count} subjects`,
          order: count,
          refused,
        })
      }
      rules.push({
        key: run.pictureRule,
        label: plainly(run.pictureRule),
        order: 0,
        refused,
      })
      if (typeof run.plan.shots === 'number') {
        shots.push({
          key: String(run.plan.shots),
          label: run.plan.shots === 1 ? '1 shot' : `${run.plan.shots} shots`,
          order: run.plan.shots,
          refused,
        })
      }
      worlds.push({ key: run.worldId, label: run.worldId, order: 0, refused })
    }
  }
  const note = 'Share of that group’s pictures Gate 1 refused, with the group’s size beside it.'
  return [
    {
      chart: 'group-subjects-in-shot',
      title: 'Subjects named in the shot',
      note,
      points: gather(subjects),
    },
    { chart: 'group-picture-rule', title: 'Picture rule in force', note, points: gather(rules) },
    { chart: 'group-plan-shots', title: 'Shots in the plan', note, points: gather(shots) },
    { chart: 'group-world', title: 'World the brief came from', note, points: gather(worlds) },
  ]
}

// ---------------------------------------------------------------- cost and wall clock

/** One run's bar: what was paid, by port, and how long it took, by stage. */
export interface SpendPoint {
  runId: string
  at: string
  cents: Record<string, number>
  seconds: Record<string, number>
  spentCents: number
  wallClockSeconds: number
}

/**
 * The cost ports: the scorecard's own key, the name the page gives it, and what a reader is
 * told it is.
 *
 * The page's name is not always the scorecard's. `costCents.lost` is a verified feature's field
 * and stays exactly that in the payload (S-208 pins it by name), but the page neither prints the
 * word nor carries it as a value of its own: a call that was paid for and answered nothing is
 * **"paid, no answer"** here, in the block the charts read as much as on the bar itself.
 */
export const COST_PORTS = [
  { key: 'image', from: 'image', label: 'pictures' },
  { key: 'video', from: 'video', label: 'clips' },
  { key: 'speech', from: 'speech', label: 'narration' },
  { key: 'paidNoAnswer', from: 'lost', label: 'paid, no answer' },
  { key: 'model', from: 'model', label: 'model calls' },
] as const

/** The three stages the record spans, and what each covers. */
export const STAGE_LABELS: Record<string, string> = {
  plan: 'plan stage',
  stills: 'pictures stage',
  video: 'clips stage',
}

const figure = (value: number | string): number => (typeof value === 'number' ? value : 0)

/** One stacked bar per run, OLDEST FIRST — which is the order the loader returns them in. */
export function spendPoints(fleet: FleetPayload): SpendPoint[] {
  return fleet.runs.map((run) => {
    const cents: Record<string, number> = {}
    for (const port of COST_PORTS) {
      const paid = run.costCents[port.from]
      if (typeof paid === 'number') cents[port.key] = paid
    }
    const seconds: Record<string, number> = {}
    for (const [stage, span] of Object.entries(run.stages)) {
      if (typeof span.seconds === 'number') seconds[stage] = span.seconds
    }
    return {
      runId: run.runId,
      at: run.createdAt,
      cents,
      seconds,
      spentCents: Object.values(cents).reduce((total, one) => total + one, 0),
      wallClockSeconds: figure(run.wallClockSeconds),
    }
  })
}

// ---------------------------------------------------------------- one run's own bar

/** One segment of the run view's two-row bar: a port's cents, or a stage's seconds. */
export interface RunSplitPoint {
  /** `cents` or `seconds` — the bar this segment belongs to. */
  measure: 'cents' | 'seconds'
  key: string
  label: string
  value: number
}

/**
 * The run view's own chart: a two-row stacked bar, seconds and cents. A port that was never
 * billed and a stage that never ran are ABSENT in the scorecard, and absent here — the bar draws
 * what the record holds, not a zero for what it does not.
 */
export function runSplitPoints(run: RunPayload | undefined): RunSplitPoint[] {
  if (run === undefined) return []
  const card = run.run as {
    costCents?: Record<string, number | string>
    stages?: Record<string, { seconds: number | string }>
  }
  const points: RunSplitPoint[] = []
  const named = new Set<string>(COST_PORTS.map((port) => port.from))
  for (const port of COST_PORTS) {
    const cents = card.costCents?.[port.from]
    if (typeof cents !== 'number') continue
    points.push({ measure: 'cents', key: port.key, label: port.label, value: cents })
  }
  // A port the scorecard bills and this page has never heard of would otherwise be drawn
  // nowhere and counted nowhere; it is drawn under its own key, and check 15 reads the same
  // ports out of the payload, so the two cannot drift apart silently.
  for (const [port, cents] of Object.entries(card.costCents ?? {})) {
    if (named.has(port) || typeof cents !== 'number') continue
    points.push({ measure: 'cents', key: port, label: port, value: cents })
  }
  for (const [stage, span] of Object.entries(card.stages ?? {})) {
    if (typeof span.seconds !== 'number') continue
    points.push({
      measure: 'seconds',
      key: stage,
      label: STAGE_LABELS[stage] ?? stage,
      value: span.seconds,
    })
  }
  return points
}

// ---------------------------------------------------------------- what a run is, in one line

/** What the ledger, the tiles and the comparison board read off a run beyond its own fields. */
export interface RunDerived {
  decided: number
  refused: number
  /** The share of this run's decided pictures Gate 1 refused, as a percentage to one decimal. */
  refusedShare: number
  spentCents: number
}

export function derivedOf(run: FleetRun): RunDerived {
  const decided = run.pictures.length
  const refused = run.pictures.filter((picture) => picture.refused).length
  let spentCents = 0
  for (const cents of Object.values(run.costCents))
    if (typeof cents === 'number') spentCents += cents
  return {
    decided,
    refused,
    refusedShare: decided === 0 ? 0 : Math.round((refused / decided) * 1000) / 10,
    spentCents,
  }
}
