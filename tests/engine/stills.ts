import assert from 'node:assert/strict'
import type { WitnessObservation } from '@cutroom/contracts'
import type { FakeAnswer, FakeScript } from '@cutroom/providers'
import type { SubmitRequest } from '@cutroom/reel-contract'
import { finished, type Engine } from './harness.ts'
import { answer, bare, planRequest, type Subject } from './plans.ts'

// Requests, plans, stand-in scripts and readers for reel-stills' Slice 3 and Slice 4 checks
// (docs/features/reel-stills.md, checks 4–7 and 12–47). Every builder returns a fresh value.
//
// EVERY EXPECTATION HERE IS WRITTEN BY HAND. Which subjects a picture's shot shows, which criteria
// it is given and which shot it opens are typed out below, never computed with the pipeline's own
// `placePictures` or `criteriaFor`: a fixture built by the code under test agrees with that code
// whatever it does, and a check reading it would be green on any placement at all.

// ---------------------------------------------------------------- the request

/**
 * `planRequest`'s eight sentences, asking for pictures. The criteria are chosen to route (S-040):
 * the 6-unit plan's units carry c1 (unit 0), c2 (units 1 and 3), c3 (unit 2) and c4 (unit 5).
 *
 * - `show-seal`, presence on c1: unit 0's pictures only.
 * - `show-pressing`, an EVENT on c1: no picture ever (D-043).
 * - `show-crowd`, presence on c2: units 1 and 3.
 * - `show-law`, presence on c4: unit 5, which no fixture plan gives a picture.
 * - `show-meadow`, presence with no claim: no picture ever.
 * - `never-person` and `never-flag` (which names c4): every picture.
 *
 * No id is a substring of another, so a prompt holding one id cannot be read as holding another.
 */
export function stillsRequest(requestId: string, budgetCents = 300): SubmitRequest {
  return {
    ...planRequest(requestId),
    criteria: {
      mustShow: [
        { id: 'show-seal', text: 'a wax seal on parchment', type: 'presence', claimId: 'c1' },
        {
          id: 'show-pressing',
          text: 'the seal being pressed into hot wax',
          type: 'event',
          claimId: 'c1',
        },
        { id: 'show-crowd', text: 'armed men gathered together', type: 'presence', claimId: 'c2' },
        { id: 'show-law', text: 'a printed statute book', type: 'presence', claimId: 'c4' },
        { id: 'show-meadow', text: 'a meadow beside a river', type: 'presence' },
      ],
      mustNotShow: [
        { id: 'never-person', text: 'any real living person', type: 'presence' },
        { id: 'never-flag', text: 'a modern flag', type: 'presence', claimId: 'c4' },
      ],
      depictionPolicyVersion: 'policy-3',
    },
    options: { until: 'stills', budgetCents },
  }
}

/** Every criterion id in `stillsRequest`, for asserting which ones a prompt does NOT hold. */
export const CRITERION_IDS = [
  'show-seal',
  'show-pressing',
  'show-crowd',
  'show-law',
  'show-meadow',
  'never-person',
  'never-flag',
] as const

export const NEVER = ['never-person', 'never-flag']

// ---------------------------------------------------------------- the plans

export const SEAL: Subject = { id: 'seal', name: 'a wax seal' }
/** A plural name that states no number: its count matches any count above one (S-040). */
export const BARONS: Subject = { id: 'barons', name: 'the barons' }
export const HALL: Subject = { id: 'hall', name: 'a stone hall' }
export const KING: Subject = { id: 'king', name: 'a king' }

/** What the selected 6-unit plan shows, shot by shot. */
export interface Shape {
  subjects: Subject[]
  shown: string[][]
}

/**
 * Rank 1 `seal` in shots 0, 2, 4; rank 2 `barons` in 1, 3; rank 3 `hall` in 2, 5. The canonical
 * opens shot 0, the barons shot 1, the hall shot 2 — which also shows the seal, so its pair with
 * the canonical shares one subject, while shot 1's shares none.
 */
export const THREE_RANKS: Shape = {
  subjects: [SEAL, BARONS, HALL],
  shown: [['seal'], ['barons'], ['seal', 'hall'], ['barons'], ['seal'], ['hall']],
}

/**
 * Rank 1 `seal` in 0, 1, 3; rank 2 `hall` in 0, 2 — ITS FIRST SHOT IS HELD by the canonical, so it
 * opens shot 2; rank 3 `barons` in 4, 5, opening shot 4.
 */
export const FIRST_SHOT_HELD: Shape = {
  subjects: [SEAL, HALL, BARONS],
  shown: [['seal', 'hall'], ['seal'], ['hall'], ['seal'], ['barons'], ['barons']],
}

/**
 * Rank 1 `seal` in 0, 2, 4; rank 2 `hall` in 1, 3, 5; rank 3 `king` in 0 and 1 only — EVERY ONE OF
 * ITS SHOTS IS HELD, so it gets no picture and no call (S-039). Planned image calls 4, placed 3.
 */
export const RANK_ALL_HELD: Shape = {
  subjects: [SEAL, HALL, KING],
  shown: [['seal', 'king'], ['hall', 'king'], ['seal'], ['hall'], ['seal'], ['hall']],
}

/** Rank 1 `seal` in 0 and 2, and nothing else in two shots: a canonical and no derived picture. */
export const CANONICAL_ONLY: Shape = {
  subjects: [SEAL, HALL, KING],
  shown: [['seal'], ['hall'], ['seal'], ['king'], [], []],
}

/** No subject in two shots: nothing is placed (D-029, S-039). */
export const NO_RECURRENCE: Shape = {
  subjects: [SEAL, HALL, KING],
  shown: [['seal'], ['hall'], ['king'], [], [], []],
}

/**
 * THREE_RANKS with a FOURTH recurring subject, `king` in 3 and 4: ranks 1 to 3 are placed as in
 * THREE_RANKS, and the king — rank 4 — gets no picture, though shot 3 is free (D-029: ranks 2 and 3
 * only). Its pictures are THREE_RANKS_PICS.
 */
export const FOUR_RANKS: Shape = {
  subjects: [SEAL, BARONS, HALL, KING],
  shown: [['seal'], ['barons'], ['seal', 'hall'], ['barons', 'king'], ['seal', 'king'], ['hall']],
}

/**
 * RANK ORDER IS NOT SHOT ORDER: rank 1 `seal` in 0, 1, 2; rank 2 `hall` in 3, 4, 5, opening shot 3;
 * rank 3 `barons` in 1 and 5, opening shot 1. So the pictures are made — and numbered — shot 0,
 * shot 3, then shot 1, and a list in shot order differs from one in the order made.
 */
export const RANK_NOT_SHOT: Shape = {
  subjects: [SEAL, HALL, BARONS],
  shown: [['seal'], ['seal', 'barons'], ['seal'], ['hall'], ['hall'], ['hall', 'barons']],
}

/**
 * Rank 1 `king` in 0, 1, 2; rank 2 `seal` in 0 and 2, opening shot 2 — which shows BOTH of the
 * canonical's subjects, so its pair with the canonical shares two.
 */
export const TWO_SHARED: Shape = {
  subjects: [SEAL, KING],
  shown: [['seal', 'king'], ['king'], ['seal', 'king'], [], [], []],
}

/**
 * The planner's two answers: a 4-unit plan of 50 seconds that fails Gate 0 on shape, and the 6-unit
 * plan of 40 seconds that survives alone — so the 6-unit plan is selected with no score call, and
 * every `reconciler` call the run makes is a picture's.
 */
export function plannerFor(shape: Shape): FakeScript['planner'] {
  return [
    { value: bare(13, 13, 12, 12) },
    { value: answer([7, 7, 7, 7, 6, 6], shape.subjects, shape.shown) },
  ]
}

// ---------------------------------------------------------------- pictures, by hand

/** One picture the run makes, past technical, in the order it is made. */
export interface Pic {
  /** The picture id without its attempt: `shot-<unit>-<label>`. */
  key: string
  unit: number
  label: string
  /** Every subject its shot shows, in the plan's order. */
  subjects: Subject[]
  /** The criteria S-040 gives it, by id. */
  mustShow: string[]
  mustNotShow: string[]
}

const pic = (unit: number, label: string, subjects: Subject[], mustShow: string[]): Pic => ({
  key: `shot-${unit}-${label}`,
  unit,
  label,
  subjects,
  mustShow,
  mustNotShow: [...NEVER],
})

/** THREE_RANKS' four pictures, in the order they are made. */
export const THREE_RANKS_PICS: Pic[] = [
  pic(0, 'a', [SEAL], ['show-seal']),
  pic(0, 'b', [SEAL], ['show-seal']),
  pic(1, 'single', [BARONS], ['show-crowd']),
  pic(2, 'single', [SEAL, HALL], []),
]

export const FIRST_SHOT_HELD_PICS: Pic[] = [
  pic(0, 'a', [SEAL, HALL], ['show-seal']),
  pic(0, 'b', [SEAL, HALL], ['show-seal']),
  pic(2, 'single', [HALL], []),
  pic(4, 'single', [BARONS], []),
]

export const RANK_ALL_HELD_PICS: Pic[] = [
  pic(0, 'a', [SEAL, KING], ['show-seal']),
  pic(0, 'b', [SEAL, KING], ['show-seal']),
  pic(1, 'single', [HALL, KING], ['show-crowd']),
]

/** RANK_NOT_SHOT's pictures, in the order made: shot 3's before shot 1's. */
export const RANK_NOT_SHOT_PICS: Pic[] = [
  pic(0, 'a', [SEAL], ['show-seal']),
  pic(0, 'b', [SEAL], ['show-seal']),
  pic(3, 'single', [HALL], ['show-crowd']),
  pic(1, 'single', [SEAL, BARONS], ['show-crowd']),
]

export const CANONICAL_ONLY_PICS: Pic[] = [
  pic(0, 'a', [SEAL], ['show-seal']),
  pic(0, 'b', [SEAL], ['show-seal']),
]

export const TWO_SHARED_PICS: Pic[] = [
  pic(0, 'a', [SEAL, KING], ['show-seal']),
  pic(0, 'b', [SEAL, KING], ['show-seal']),
  pic(2, 'single', [SEAL, KING], []),
]

// ---------------------------------------------------------------- the ladders, by hand (Slice 4)

/**
 * Rank 1 `seal` in 0, 1, 2; rank 2 `barons` in 1 and 3, opening shot 1; rank 3 `hall` in 2 and 4,
 * opening shot 2. BOTH derived shots also show the seal, so both pairs with the canonical share it
 * and either can fail Gate 1S. Planned image calls 4, placed 4.
 */
export const BOTH_SHARE: Shape = {
  subjects: [SEAL, BARONS, HALL],
  shown: [['seal'], ['seal', 'barons'], ['seal', 'hall'], ['barons'], ['hall'], []],
}

export const BOTH_SHARE_PICS: Pic[] = [
  pic(0, 'a', [SEAL], ['show-seal']),
  pic(0, 'b', [SEAL], ['show-seal']),
  pic(1, 'single', [SEAL, BARONS], ['show-crowd']),
  pic(2, 'single', [SEAL, HALL], []),
]

/**
 * The same shot's picture under another label. A repair renders its picture's entry again, so it
 * shows the same subjects and is given the same criteria; only its label, and so its key, differs.
 */
export const again = (p: Pic, label: string): Pic => ({
  ...p,
  key: `shot-${p.unit}-${label}`,
  label,
})

// ---------------------------------------------------------------- the witness and the reconciler

export type Entity = WitnessObservation['entities'][number]

/** An entity seen whole, in front, with no face: every reference term at its best. */
export function entity(label: string, over: Partial<Entity> = {}): Entity {
  return {
    label,
    count: 1,
    position: 'centre',
    prominence: 'foreground',
    faceVisible: 'noFace',
    occluded: false,
    clippedByEdge: false,
    ...over,
  }
}

export function observation(
  entities: Entity[],
  over: Partial<WitnessObservation> = {},
): WitnessObservation {
  return {
    entities,
    framing: 'medium',
    setting: 'a dim stone interior',
    lighting: 'dim',
    readableTextPresent: false,
    ambiguities: [],
    unsafeDepictions: [],
    ...over,
  }
}

/** The fixtures' one plural name. The barons are seen as three. */
const PLURAL = new Set([BARONS.id])

/**
 * The witness's own words for each subject. None holds a word of the subject's name: a witness that
 * never saw the plan cannot say it (D-041), and a label that repeated the name would put the name in
 * every prompt that carries the observation, so no check could tell whether the name was given.
 */
export const WITNESS_WORDS: Readonly<Record<string, string>> = {
  [SEAL.id]: 'a round red disc on cream paper',
  [BARONS.id]: 'men in mail coats',
  [HALL.id]: 'a long grey room with arches',
  [KING.id]: 'a crowned man on a throne',
}

/**
 * What a witness that never saw the brief says of a picture showing these subjects: one entity per
 * subject, in its own words, and three of the plural one. `over` changes the i-th entity.
 */
export function seen(
  p: Pic,
  over: (i: number) => Partial<Entity> = () => ({}),
): WitnessObservation {
  return observation(
    p.subjects.map((s, i) =>
      entity(WITNESS_WORDS[s.id] ?? 'something', {
        count: PLURAL.has(s.id) ? 3 : 1,
        ...over(i),
      }),
    ),
  )
}

export interface ReconcileAnswer {
  subjects: Array<{ id: string; entity: number | null; countMatches: boolean }>
  criteria: Array<{ id: string; shown: boolean; entity: number | null }>
}

/** A reconciler's answer that passes the picture: every subject shown by its entity, counted right. */
export function passes(p: Pic): ReconcileAnswer {
  return {
    subjects: p.subjects.map((s, i) => ({ id: s.id, entity: i, countMatches: true })),
    criteria: [
      ...p.mustShow.map((id) => ({ id, shown: true, entity: 0 })),
      ...p.mustNotShow.map((id) => ({ id, shown: false, entity: null })),
    ],
  }
}

/** A reconciler's answer that fails the picture on ONE thing: `never-person` is shown. */
export function showsPerson(p: Pic): ReconcileAnswer {
  const answer = passes(p)
  answer.criteria = answer.criteria.map((c) =>
    c.id === 'never-person' ? { ...c, shown: true, entity: 0 } : c,
  )
  return answer
}

/** What a witness says of a picture whose first subject is cut off by the edge of the frame. */
export const clipped = (p: Pic) => seen(p, (i) => (i === 0 ? { clippedByEdge: true } : {}))

/** A judge's answer: every subject named `same`, unless listed in `no`. */
export function judged(subjects: readonly string[], no: readonly string[] = []) {
  return {
    subjects: subjects.map((subject) => ({ subject, same: no.includes(subject) ? 'no' : 'yes' })),
  }
}

/** A witness override answered twice, in order (second-ask, S-147). Made only by `twice`. */
export interface Twice {
  readonly twice: readonly [FakeAnswer, FakeAnswer]
}

/**
 * A witness override that queues TWO scripted answers for one picture or take — a value or a
 * throw each — because a refused answer is now asked for once more (S-147). With one, the second
 * ask reads the next picture's answer, or runs off the script's end and throws, and a check meant
 * to prove a refusal would prove something else.
 */
export function twice(first: FakeAnswer, second: FakeAnswer): Twice {
  return { twice: [first, second] }
}

/** A witness override's scripted answers: two for `twice`, else one, the default's if none. */
export function witnessAnswers(override: unknown, fallback: unknown): FakeAnswer[] {
  if (typeof override === 'object' && override !== null && 'twice' in override) {
    return [...(override as Twice).twice]
  }
  return [{ value: override ?? fallback }]
}

/**
 * The script of one run: the planner's two answers, and for each picture past technical its
 * witness and reconciler answers — each passing unless replaced — then the judge's answers.
 */
export function stillsScript(
  shape: Shape,
  pics: readonly Pic[],
  over: {
    witness?: Record<string, unknown>
    reconciler?: Record<string, unknown>
    judge?: unknown[]
  } = {},
): FakeScript {
  return {
    planner: plannerFor(shape),
    witness: pics.flatMap((p) => witnessAnswers(over.witness?.[p.key], seen(p))),
    reconciler: pics.map((p) => ({ value: over.reconciler?.[p.key] ?? passes(p) })),
    judge: (over.judge ?? []).map((value) => ({ value })),
  }
}

/** Several runs' scripts, one after another, for an engine that runs them in that order. */
export function inTurn(...scripts: FakeScript[]): FakeScript {
  const out: Required<FakeScript> = { planner: [], reconciler: [], witness: [], judge: [] }
  for (const script of scripts) {
    for (const role of ['planner', 'reconciler', 'witness', 'judge'] as const) {
      out[role] = [...out[role], ...(script[role] ?? [])]
    }
  }
  return out
}

// ---------------------------------------------------------------- reading a run

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
  reference_ids: string[]
  measure: {
    readable: boolean
    width: number
    height: number
    sharpness: number
    brightness: number
  } | null
  words: string[] | null
  gate1: {
    outcome: 'accept' | 'fail' | null
    coverage: string
    steps: Array<{ step: string; outcome: string; reasons: string[] }>
  } | null
  score: {
    terms: Record<string, number>
    weights: Record<string, number>
    total: number
  } | null
  gate1s: {
    outcome: string
    coverage: string
    compared: boolean
    suspicion: number | null
    answer: Array<{ subject: string; same: string }> | null
    reasons: string[]
  } | null
  degradation: string | null
  chosen: boolean
}

export interface ReceiptRow {
  id: number
  role: string
  call: string
  model: string
  temperature: number
  picture_ids: string[]
}

export interface GenerationRow {
  id: number
  picture_id: string
  model: string
  prompt: string
  reference_ids: string[]
  style_id: string
  style_version: number
  rate_cents: number
  cost_cents: number
  fake: boolean
  degraded: boolean
}

export interface Stilled {
  runId: string
  result: Record<string, unknown>
  events: Array<Record<string, unknown> & { type: string }>
  record: {
    pictures: Array<{
      pictureId: string
      shotId: string
      chosen: boolean
      observationId?: string
      reconciliationId?: string
      checks: Array<{ gate: string; step?: string; outcome: string }>
    }>
    degradations: Array<{ shotId: string; reason: string }>
  }
  pictures: PictureRow[]
  receipts: ReceiptRow[]
  generations: GenerationRow[]
  observations: Array<{ id: string; picture_id: string; observation: WitnessObservation }>
  reconciliations: Array<{ id: string; picture_id: string; answer: unknown; failed: string[] }>
  jobs: Array<{ id: number; kind: string; attempts: number; state: string; cost_cents: number }>
  /** The `degradation` table's rows for the run, in the order written. */
  degradations: Array<{ shot_id: string; gate: string; reason: string }>
  /** The selected plan, as its row stores it. */
  plan: {
    shots: Array<{ unit: number; subjectIds: string[] }>
    plannedImageCalls: number
    estimateCents: number
  }
}

const json = <T>(text: string | null): T => (text === null ? null : JSON.parse(text)) as T

/** Everything a stills run left behind, as a caller and an operator read it. */
export function readStills(engine: Engine, runId: string, result: Record<string, unknown>) {
  return async (): Promise<Stilled> => {
    const record = await engine.http.record(runId)
    const pictures = engine
      .query<Record<string, unknown>>('SELECT * FROM picture WHERE run_id = ? ORDER BY seq', runId)
      .map((r): PictureRow => ({
        ...(r as unknown as PictureRow),
        reference_ids: json(r.reference_ids as string),
        measure: json(r.measure as string | null),
        words: json(r.words as string | null),
        gate1: json(r.gate1 as string | null),
        score: json(r.score as string | null),
        gate1s: json(r.gate1s as string | null),
        chosen: r.chosen === 1,
      }))
    const planRow = engine.query<{ plan: string }>(
      'SELECT plan FROM plan WHERE run_id = ? AND selected = 1',
      runId,
    )
    return {
      runId,
      result,
      events: (await engine.http.events(runId)).json.events as Stilled['events'],
      record: record.json as unknown as Stilled['record'],
      pictures,
      receipts: engine
        .query<Record<string, unknown>>(
          'SELECT id, role, call, model, temperature, picture_ids FROM model_receipt WHERE run_id = ? ORDER BY id',
          runId,
        )
        .map((r) => ({
          ...(r as unknown as ReceiptRow),
          picture_ids: json(r.picture_ids as string),
        })),
      generations: engine
        .query<Record<string, unknown>>(
          'SELECT * FROM generation_receipt WHERE run_id = ? ORDER BY id',
          runId,
        )
        .map((r) => ({
          ...(r as unknown as GenerationRow),
          reference_ids: json(r.reference_ids as string),
          fake: r.fake === 1,
          degraded: r.degraded === 1,
        })),
      observations: engine
        .query<{ id: string; picture_id: string; observation: string }>(
          'SELECT id, picture_id, observation FROM observation WHERE run_id = ? ORDER BY id',
          runId,
        )
        .map((r) => ({ ...r, observation: json(r.observation) })),
      reconciliations: engine
        .query<{ id: string; picture_id: string; answer: string; failed: string }>(
          'SELECT id, picture_id, answer, failed FROM reconciliation WHERE run_id = ? ORDER BY id',
          runId,
        )
        .map((r) => ({ ...r, answer: json(r.answer), failed: json(r.failed) })),
      jobs: engine
        .query<{ id: number; kind: string; attempts: number; state: string; cost_cents: number }>(
          'SELECT id, kind, attempts, state, cost_cents FROM job WHERE correlation_id = ? ORDER BY id',
          runId,
        )
        .map((r) => ({ ...r })),
      degradations: engine
        .query<{ shot_id: string; gate: string; reason: string }>(
          'SELECT shot_id, gate, reason FROM degradation WHERE run_id = ? ORDER BY rowid',
          runId,
        )
        .map((r) => ({ ...r })),
      plan: json(planRow[0]?.plan ?? null),
    }
  }
}

/** Submits a stills request, waits for its run to finish, and reads everything it left behind. */
export async function stills(engine: Engine, request: SubmitRequest): Promise<Stilled> {
  const submitted = await engine.http.submit(request)
  if (submitted.status !== 202) {
    throw new Error(`the request was not accepted: ${JSON.stringify(submitted.json)}`)
  }
  const runId = String(submitted.json.runId)
  await finished(engine, runId)
  const result = (await engine.http.result(runId)).json
  return readStills(engine, runId, result)()
}

/** A picture row by its id without the attempt, or a failure naming what the run holds. */
export function pictureOf(ran: Stilled, key: string): PictureRow {
  const found = ran.pictures.find((p) => p.picture_id.replace(/^a\d+-/, '') === key)
  if (found === undefined) {
    throw new Error(
      `no picture ${key}; the run holds ${ran.pictures.map((p) => p.picture_id).join(', ')}`,
    )
  }
  return found
}

/** The picture id a key has in a run's first attempt. */
export const first = (key: string) => `a1-${key}`

/**
 * A degraded shot is LABELLED IN FOUR PLACES, and the four agree (I-4, D-025): one `degradation` row
 * naming the shot, the gate that failed last and why; its last failing picture's `degradation`,
 * which carries the same reason, and no other picture's; every `generation_receipt` of the shot's
 * pictures marked degraded, and no other receipt; and one `degraded` event. The result, when the run
 * completed, and the record list it too. Everything expected is given by hand. Returns the reason.
 *
 * The receipts marked are the shot's pictures of the attempt that degraded it — `attempt`, 1 unless
 * given — and no earlier attempt's (S-058).
 */
export function assertDegraded(
  ran: Stilled,
  expected: {
    shotId: string
    gate: '1' | '1S'
    last: string
    pictures: readonly string[]
    attempt?: number
  },
): string {
  const { shotId, gate, last, pictures } = expected
  const attempt = expected.attempt ?? 1
  const rows = ran.degradations.filter((d) => d.shot_id === shotId)
  assert.equal(rows.length, 1, `${shotId} has ${rows.length} degradation rows, not one`)
  const row = rows[0] as Stilled['degradations'][number]
  assert.equal(row.gate, gate, `${shotId} is degraded at gate ${row.gate}, not ${gate}`)
  const reason = row.reason
  assert.ok(reason.length > 0, `${shotId}'s degradation gives no reason`)

  const labelled = ran.pictures.filter((p) => p.degradation !== null)
  assert.ok(
    labelled.some((p) => p.picture_id === last && p.degradation === reason),
    `${last}, the last failing picture of ${shotId}, does not carry the degradation's reason`,
  )
  for (const picture of ran.pictures.filter((p) => `shot-${p.shot_unit}` === shotId)) {
    if (picture.picture_id !== last) {
      assert.equal(picture.degradation, null, `${picture.picture_id} is labelled, and is not last`)
    }
    assert.equal(picture.chosen, false, `${picture.picture_id} of degraded ${shotId} is chosen`)
  }

  // The shot's receipts are exactly the pictures expected, and every one is marked; a receipt of a
  // shot with no degradation row is not.
  const ofShot = (id: string, shot: string) => id.startsWith(`a${attempt}-${shot}-`)
  assert.deepEqual(
    ran.generations.filter((g) => ofShot(g.picture_id, shotId)).map((g) => g.picture_id),
    [...pictures],
    `${shotId}'s generation receipts are not the pictures expected`,
  )
  for (const generation of ran.generations) {
    if (ofShot(generation.picture_id, shotId)) {
      assert.equal(generation.degraded, true, `${generation.picture_id} is not marked degraded`)
    } else if (!ran.degradations.some((d) => ofShot(generation.picture_id, d.shot_id))) {
      assert.equal(generation.degraded, false, `${generation.picture_id} is marked degraded`)
    }
  }

  const events = ran.events.filter((e) => e.type === 'degraded' && e.shotId === shotId)
  assert.equal(events.length, 1, `${shotId} has ${events.length} degraded events, not one`)
  assert.equal(events[0]?.reason, reason, "the degraded event's reason is not the row's")

  assert.deepEqual(
    ran.record.degradations.filter((d) => d.shotId === shotId),
    [{ shotId, reason }],
    "the record's degradations do not list the shot with its reason",
  )
  if (ran.result.status === 'completed') {
    const listed = (ran.result.degradations as Array<{ shotId: string; reason: string }>).filter(
      (d) => d.shotId === shotId,
    )
    assert.deepEqual(listed, [{ shotId, reason }], "the result's degradations do not list the shot")
    const stilled = ran.result.stills as Array<{ shotId: string }>
    assert.ok(!stilled.some((s) => s.shotId === shotId), `degraded ${shotId} has a still`)
  }
  return reason
}
