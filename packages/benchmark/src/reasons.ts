// The reason families, scoped to the gates whose strings they are
// (docs/features/yield-benchmark.md, Gate 2 "The reason families").
//
// ONLY Gate 1's and Gate 5's reconcile reasons are classified. Everything else is counted and
// reported VERBATIM, under the site that wrote it, because a classifier that claimed them all
// would put a legal string into `other` the first day it appeared. In live scoring an unknown
// string is reported as a FINDING and fails nothing: a gate may legally gain a reason tomorrow,
// and a scorer that refused to run would be worse than one that says what it has not seen.
//
// A run-ending `detail` is never classified and never counted as a reason: the three-takes-failed
// detail `clips/index.ts` composes embeds those takes' own Gate 2, 3 and 5 strings inside one
// sentence, so classifying it would count every one of them a second time.

/**
 * The rows the families and the buckets read. `RunRows` in measures.ts satisfies this
 * structurally, so neither file imports the other and no cycle exists (`no-circular`).
 */
export interface ReasonRows {
  run: { result: string | null }
  run_event: ReadonlyArray<{ body: string }>
  plan: ReadonlyArray<{ verdict: string; selected: number | boolean }>
  picture: ReadonlyArray<{ picture_id: string; gate1: string | null; gate1s: string | null }>
  take: ReadonlyArray<{ take_id: string; verdicts: string }>
  degradation: ReadonlyArray<{ shot_id: string; reason: string }>
  hold: ReadonlyArray<{ shot_id: string; reason: string }>
  still_hold: ReadonlyArray<{ shot_id: string; reason: string }>
  lost_call: ReadonlyArray<{ detail: string }>
  render: ReadonlyArray<{ gate7: string | null }>
}

export type ReasonFamily =
  | 'clipping'
  | 'count'
  | 'not shown'
  | 'must-show'
  | 'must-not-show'
  | 'technical'
  | 'other'

export const REASON_FAMILIES: readonly ReasonFamily[] = [
  'clipping',
  'count',
  'not shown',
  'must-show',
  'must-not-show',
  'technical',
  'other',
]

/**
 * One pattern per template the gates build, in the gates' own words:
 * `gate1.ts`'s five reconcile templates and two technical ones, and `gate5.ts`'s four — which
 * are four of those five and deliberately NOT the clipping one, because D-044's veto is the
 * keyframe's and a subject leaving a moving frame is motion (S-072).
 *
 * A reworded template turns check 3 red — it reads the pushed templates out of the gate sources
 * — rather than quietly emptying a family here (S-124's rule, applied to strings).
 */
const FAMILY_PATTERNS: ReadonlyArray<readonly [ReasonFamily, RegExp]> = [
  ['clipping', /^subject "[^"]*" \(.*\) is clipped by the edge of the frame$/],
  ['count', /^subject "[^"]*" \(.*\): the count seen does not match its name$/],
  ['not shown', /^subject "[^"]*" \(.*\) is not shown$/],
  ['must-show', /^must show "[^"]*" is not shown: /],
  ['must-not-show', /^must never show "[^"]*" is shown: /],
  ['technical', /^the file is not a readable image$/],
  ['technical', /^the picture is \d+x\d+, not 9:16$/],
]

/** The family one Gate 1 or Gate 5 reconcile string belongs to; `other` when it is new. */
export function classify(reason: string): ReasonFamily {
  for (const [family, pattern] of FAMILY_PATTERNS) if (pattern.test(reason)) return family
  return 'other'
}

/** A string count is not a picture count: the record's own figure is 45 strings on 43 pictures. */
export interface FamilyCount {
  strings: number
  pictures: number
  takes: number
}

export interface Counted {
  families: Record<ReasonFamily, FamilyCount>
  /** Every string no family claimed, reported once, in the order met. It fails nothing. */
  findings: string[]
}

function parse<T>(text: string | null | undefined): T | undefined {
  if (typeof text !== 'string') return undefined
  try {
    return JSON.parse(text) as T
  } catch {
    return undefined
  }
}

interface Gate1Blob {
  outcome: string | null
  coverage?: string
  steps?: Array<{ step: string; outcome: string | null; reasons?: string[] }>
}

interface VerdictBlob {
  gate: string
  outcome: string
  reasons?: string[]
  coverage?: unknown
}

/** Gate 1's own reasons, per picture: its technical and reconcile steps write them all. */
export function gate1Reasons(rows: ReasonRows): Array<{ pictureId: string; reason: string }> {
  const out: Array<{ pictureId: string; reason: string }> = []
  for (const picture of rows.picture) {
    const gate1 = parse<Gate1Blob>(picture.gate1)
    for (const step of gate1?.steps ?? []) {
      for (const reason of step.reasons ?? []) out.push({ pictureId: picture.picture_id, reason })
    }
  }
  return out
}

/** Gate 5's own reasons, per take, which `takeFailures` pushed and the verdict kept. */
export function gate5Reasons(rows: ReasonRows): Array<{ takeId: string; reason: string }> {
  const out: Array<{ takeId: string; reason: string }> = []
  for (const take of rows.take) {
    for (const verdict of parse<VerdictBlob[]>(take.verdicts) ?? []) {
      if (verdict.gate !== '5') continue
      for (const reason of verdict.reasons ?? []) out.push({ takeId: take.take_id, reason })
    }
  }
  return out
}

/**
 * The two classified families, counted with each string's unit. Nothing else reaches here: not a
 * degradation reason, not a hold's, not a run-ending `detail`.
 */
export function classifyGate1AndGate5(rows: ReasonRows): Counted {
  const families = Object.fromEntries(
    REASON_FAMILIES.map((family) => [family, { strings: 0, pictures: 0, takes: 0 }]),
  ) as Record<ReasonFamily, FamilyCount>
  const seenPictures = new Map<ReasonFamily, Set<string>>()
  const seenTakes = new Map<ReasonFamily, Set<string>>()
  const findings: string[] = []

  const count = (family: ReasonFamily, seen: Map<ReasonFamily, Set<string>>, id: string) => {
    const at = families[family]
    at.strings += 1
    const ids = seen.get(family) ?? new Set<string>()
    ids.add(id)
    seen.set(family, ids)
  }

  for (const { pictureId, reason } of gate1Reasons(rows)) {
    const family = classify(reason)
    count(family, seenPictures, pictureId)
    if (family === 'other' && !findings.includes(reason)) findings.push(reason)
  }
  for (const { takeId, reason } of gate5Reasons(rows)) {
    const family = classify(reason)
    count(family, seenTakes, takeId)
    if (family === 'other' && !findings.includes(reason)) findings.push(reason)
  }

  for (const family of REASON_FAMILIES) {
    families[family].pictures = seenPictures.get(family)?.size ?? 0
    families[family].takes = seenTakes.get(family)?.size ?? 0
  }
  return { families, findings }
}

/** Every reason-writing site Gate 2's table lists, in its order, with what it writes. */
export const VERBATIM_SITES = [
  {
    site: 'gates/gate0.ts',
    writes: 'four tokens: coverage, criteria, shape, cost',
    read: "every plan row's verdict",
  },
  {
    site: 'gates/gate1s.ts',
    writes:
      "shared-subject names, and an Unanswered message when the judge's one ask is unusable " +
      '(S-163)',
    read: "every picture's gate1s reasons",
  },
  {
    site: 'gates/gate2.ts',
    writes: 'five technical reasons; no silence reason — Gate 3 writes the two sound ones',
    read: "every take's Gate 2 verdict",
  },
  {
    site: 'gates/gate3.ts',
    writes: 'two sound reasons',
    read: "every take's Gate 3 verdict",
  },
  {
    site: 'gates/gate7.ts',
    writes: 'the question strings, and an Unanswered message on the same rule',
    read: "the render's gate7 reasons",
  },
  {
    site: 'stills/index.ts',
    writes:
      'the degradation reasons, composed per shot, and its own run-ending detail: sites ' +
      '(:154, 408, 490, 498, 521)',
    read: "every degradation row's reason, and a run-ending detail the stills stage wrote",
  },
  {
    site: 'clips/ladder.ts',
    writes: 'the hold reason, and the "<shot> cannot be held" why built from one or two clauses',
    // Gate 2 names ladder.ts for "the hold reason". ladder.ts composes the STILL-hold's reason
    // (S-098); the `hold` table's reason is in fact composed in render/manifest.ts:400, which
    // Gate 2's table does not list. Both are reported here, under the site Gate 2 names, and
    // the discrepancy is Slice 1's finding — nothing is dropped and no string is classified.
    read: "every still_hold and every hold row's reason",
  },
  {
    site: 'clips/index.ts',
    writes:
      "every detail: it writes — a shot's three failed takes, the word-timing detail, the " +
      'unreadable held picture, "no take shows what the reel must show", and the catch-all ' +
      'messageOf(error) at :195',
    read: 'a run-ending detail the clips job wrote',
  },
  {
    site: 'plan/index.ts',
    writes: 'its run-ending detail: site (:158)',
    read: 'a run-ending detail the plan stage wrote',
  },
  {
    site: 'lost_call.detail',
    writes: 'whatever the port reported',
    read: "every lost call's detail",
  },
] as const

export type VerbatimSite = (typeof VERBATIM_SITES)[number]['site']

interface ResultBlob {
  status?: string
  reason?: string
  rule?: string
  step?: string
  detail?: string
}

/**
 * Which site a run-ending `detail` came from. A `stopped` run names its rule; a `failed` one
 * names nothing, so the stage it died in — its last `stage.started` — answers for it.
 */
export function detailSite(rows: ReasonRows): VerbatimSite | undefined {
  const result = parse<ResultBlob>(rows.run.result)
  if (result?.detail === undefined || result.detail === '') return undefined
  const rule = result.rule
  if (rule === 'gate-0' || rule === 'split') return 'plan/index.ts'
  if (rule === 'gate-1') return 'stills/index.ts'
  if (rule === 'gate-2' || rule === 'gate-3' || rule === 'gate-5') return 'clips/index.ts'
  if (rule === 'gate-7') return 'clips/index.ts'
  let stage: string | undefined
  for (const event of rows.run_event) {
    const body = parse<{ type?: string; stage?: string }>(event.body)
    if (body?.type === 'stage.started') stage = body.stage
  }
  if (stage === 'plan') return 'plan/index.ts'
  if (stage === 'stills') return 'stills/index.ts'
  if (stage === 'video') return 'clips/index.ts'
  return undefined
}

/**
 * Every unclassified string, verbatim, under the site that wrote it. One bucket per site Gate 2
 * lists, present even when empty: an absent bucket reads as coverage.
 */
export function verbatim(rows: ReasonRows): Record<VerbatimSite, string[]> {
  const buckets = Object.fromEntries(
    VERBATIM_SITES.map(({ site }) => [site, [] as string[]]),
  ) as Record<VerbatimSite, string[]>

  for (const plan of rows.plan) {
    const verdict = parse<{ outcome?: string; failed?: string[] }>(plan.verdict)
    for (const token of verdict?.failed ?? []) buckets['gates/gate0.ts'].push(token)
  }
  for (const picture of rows.picture) {
    const gate1s = parse<{ reasons?: string[] }>(picture.gate1s)
    for (const reason of gate1s?.reasons ?? []) buckets['gates/gate1s.ts'].push(reason)
  }
  for (const take of rows.take) {
    for (const verdict of parse<VerdictBlob[]>(take.verdicts) ?? []) {
      if (verdict.gate !== '2' && verdict.gate !== '3') continue
      const site = verdict.gate === '2' ? 'gates/gate2.ts' : 'gates/gate3.ts'
      for (const reason of verdict.reasons ?? []) buckets[site].push(reason)
    }
  }
  for (const render of rows.render) {
    const gate7 = parse<{ reasons?: string[] }>(render.gate7)
    for (const reason of gate7?.reasons ?? []) buckets['gates/gate7.ts'].push(reason)
  }
  for (const degradation of rows.degradation) {
    buckets['stills/index.ts'].push(degradation.reason)
  }
  for (const held of rows.still_hold) buckets['clips/ladder.ts'].push(held.reason)
  for (const held of rows.hold) buckets['clips/ladder.ts'].push(held.reason)
  for (const lost of rows.lost_call) buckets['lost_call.detail'].push(lost.detail)

  const site = detailSite(rows)
  const detail = parse<ResultBlob>(rows.run.result)?.detail
  if (site !== undefined && detail !== undefined && detail !== '') buckets[site].push(detail)

  return buckets
}
