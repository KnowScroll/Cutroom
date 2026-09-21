import assert from 'node:assert/strict'
import type { ClipObservation, LanguageModelPort } from '@cutroom/contracts'
import type { FakeScript } from '@cutroom/providers'
import type { SubmitRequest } from '@cutroom/reel-contract'
import { waitFor, type Engine } from './harness.ts'
import type { Subject } from './plans.ts'
import {
  SEAL,
  THREE_RANKS,
  THREE_RANKS_PICS,
  WITNESS_WORDS,
  again,
  clipped,
  entity,
  judged,
  observation,
  showsPerson,
  stillsRequest,
  stillsScript,
  type Entity,
  type Pic,
  type Shape,
} from './stills.ts'

// Requests, fixtures and readers for reel-render's chain and clips checks (docs/features/reel-render.md,
// checks 7–28). Every builder returns a fresh value, and every expectation a check makes is typed in
// the check or written out here BY HAND — which sentences a shot's narration holds, which criteria
// its take is held against — never computed with the pipeline's own `narrationText` or
// `takeCriteria`: a fixture built by the code under test agrees with that code whatever it does.

/** `stillsRequest`'s sentences and criteria, asking for a video under `budgetCents`. */
export function videoRequest(requestId: string, budgetCents = 300): SubmitRequest {
  return { ...stillsRequest(requestId, budgetCents), options: { until: 'video', budgetCents } }
}

export type Event = Record<string, unknown> & { type: string }

/** Each event as one line: its type, the stage, gate, shot or status it names. */
export const described = (events: readonly Event[]) =>
  events.map((e) => {
    if (e.type === 'verdict') {
      return `verdict ${String(e.gate)}${e.shotId === undefined ? '' : ` ${String(e.shotId)}`} ${String(e.outcome)}`
    }
    if (e.type === 'degraded') return `degraded ${String(e.shotId)}`
    if (e.type === 'run.finished') return `run.finished ${String(e.status)}`
    return e.stage === undefined ? e.type : `${e.type} ${String(e.stage)}`
  })

export interface JobRow {
  id: number
  kind: string
  correlation_id: string
  parent_id: number | null
  state: string
  attempts: number
  cost_cents: number
}

/** Every job row the engine holds, oldest first. */
export const jobRows = (engine: Engine) =>
  engine
    .query<JobRow>(
      'SELECT id, kind, correlation_id, parent_id, state, attempts, cost_cents FROM job ORDER BY id',
    )
    .map((row) => ({ ...row }))

/** The events of a run, as a caller following it reads them. */
export async function eventsOf(engine: Engine, runId: string): Promise<Event[]> {
  return (await engine.http.events(runId)).json.events as Event[]
}

// ---------------------------------------------------------------- the takes, by hand (Slice 3)

/**
 * `planRequest`'s eight sentences as the fixtures' 6-unit plan holds them: units 0 and 1 hold two
 * sentences each, and the four after hold one (reel-plan's D-112 grouping). A narration's text is
 * its unit's sentences joined by one space (S-070).
 */
export const UNIT_SENTENCES: readonly (readonly string[])[] = [
  ['In 1215 a charter was sealed at Runnymede.', 'It bound a king to the law of the land.'],
  ['The barons who forced it were not democrats.', 'They wanted their own privileges back.'],
  ['Within weeks the pope annulled it.'],
  ['Yet it was reissued three times.'],
  ['Each reissue shortened it.'],
  ['Three of its clauses are still law in England today.'],
]

/** How many words each unit's narration holds, split on white space. */
export const UNIT_WORDS = [18, 14, 6, 6, 4, 10]

/**
 * The `mustShow` criteria each unit's sentences claim (S-072): unit 0 carries c1 twice — the seal,
 * a presence, and its pressing, an EVENT; units 1 and 3 carry c2, the crowd; unit 5 carries c4, the
 * statute book. Units 2 and 4 claim none. `show-meadow` has no claim: it is every take's unclaimed
 * criterion, and fails none.
 */
export const UNIT_CLAIMED: readonly (readonly string[])[] = [
  ['show-seal', 'show-pressing'],
  ['show-crowd'],
  [],
  ['show-crowd'],
  [],
  ['show-law'],
]
export const UNCLAIMED = ['show-meadow']
export const MUST_NOT_SHOW = ['never-person', 'never-flag']

/** `stillsRequest`'s criteria, by id, as their text reads. */
export const CRITERION_TEXT: Readonly<Record<string, string>> = {
  'show-seal': 'a wax seal on parchment',
  'show-pressing': 'the seal being pressed into hot wax',
  'show-crowd': 'armed men gathered together',
  'show-law': 'a printed statute book',
  'show-meadow': 'a meadow beside a river',
  'never-person': 'any real living person',
  'never-flag': 'a modern flag',
}

/** One take the clips stage makes, and what its shot asks of it. */
export interface Take {
  /** `shot-<unit>-take-<n>`: the take id without its attempt. */
  key: string
  unit: number
  subjects: Subject[]
  sentences: readonly string[]
  /** The claimed `mustShow` of both types. */
  mustShow: readonly string[]
  mustNotShow: readonly string[]
  unclaimed: readonly string[]
}

/** The six takes of a shape's plan, in plan order. */
export function takesOf(shape: Shape): Take[] {
  return shape.shown.map((ids, unit) => ({
    key: `shot-${unit}-take-1`,
    unit,
    subjects: ids.map((id) => {
      const subject = shape.subjects.find((s) => s.id === id)
      assert.ok(subject !== undefined, `the shape shows ${id}, which it does not name`)
      return subject
    }),
    sentences: UNIT_SENTENCES[unit] ?? [],
    mustShow: UNIT_CLAIMED[unit] ?? [],
    mustNotShow: MUST_NOT_SHOW,
    unclaimed: UNCLAIMED,
  }))
}

/**
 * A shot's take `n`: the same shot, made again after its earlier takes failed (reel-takes, S-094). It
 * asks the same of the model stand-in as the shot's first take, under its own key, so a script lists
 * each take the run will make in the order made — retakes included. A take that fails Gate 2 makes no
 * model call, so a script leaves it out: the stand-in answers in call order.
 */
export const retake = (take: Take, n: 2 | 3): Take => ({
  ...take,
  key: `shot-${take.unit}-take-${n}`,
})

/** The id a take has in the clips job's first attempt. */
export const firstTake = (key: string) => `a1-${key}`

/** The plural subject of the fixtures, seen as three. */
const PLURAL = new Set(['barons'])

/**
 * What a witness that never saw the brief says of a take's clip: one entity per subject the shot
 * shows, in its own words, and D-041's temporal block — nothing moves in a stand-in's test pattern,
 * so no action and no order. `over` changes the i-th entity.
 */
export function seenClip(
  take: Take,
  over: (i: number) => Partial<Entity> = () => ({}),
  fields: Partial<ClipObservation> = {},
): ClipObservation {
  return {
    ...observation(
      take.subjects.map((s, i) =>
        entity(WITNESS_WORDS[s.id] ?? 'something', {
          count: PLURAL.has(s.id) ? 3 : 1,
          ...over(i),
        }),
      ),
    ),
    actions: [],
    eventOrder: [],
    ...fields,
  }
}

export interface TakeAnswer {
  subjects: Array<{ id: string; entity: number | null; countMatches: boolean }>
  criteria: Array<{ id: string; shown: boolean; entity: number | null }>
}

/**
 * A reconciler's answer that passes a take: every subject shown by its entity and counted right,
 * every claimed `mustShow` shown, no `mustNotShow` shown — and the reel's unclaimed `mustShow` shown
 * too, so a run of passing takes completes its stage.
 */
export function passesTake(take: Take): TakeAnswer {
  const first = take.subjects.length > 0 ? 0 : null
  return {
    subjects: take.subjects.map((s, i) => ({ id: s.id, entity: i, countMatches: true })),
    criteria: [
      ...take.mustShow.map((id) => ({ id, shown: true, entity: first })),
      ...take.mustNotShow.map((id) => ({ id, shown: false, entity: null })),
      ...take.unclaimed.map((id) => ({ id, shown: true, entity: null })),
    ],
  }
}

/** A passing answer with one criterion's `shown` turned over. */
export function turned(take: Take, id: string): TakeAnswer {
  const answer = passesTake(take)
  const found = answer.criteria.find((c) => c.id === id)
  assert.ok(found !== undefined, `${take.key} is not held against ${id}`)
  answer.criteria = answer.criteria.map((c) =>
    c.id === id
      ? { ...c, shown: !c.shown, entity: c.shown ? null : take.subjects.length > 0 ? 0 : null }
      : c,
  )
  return answer
}

/**
 * Gate 7's five closed questions, typed out BY HAND as the default render settings word them
 * (S-074): each is answered yes when the cut is right.
 */
export const CUT_QUESTIONS = [
  'Are the shots in a sensible order?',
  'Does the pacing work?',
  'Does every shot sit well beside the shot that follows it?',
  'Do the burned captions follow the narration?',
  'Does every shot show something no other shot repeats?',
] as const

/** A judge's answer to the five questions: every one yes, but those whose position is in `no`. */
export function cutAnswer(no: readonly number[] = []) {
  return {
    answers: CUT_QUESTIONS.map((question, i) => ({
      question,
      answer: no.includes(i) ? 'no' : 'yes',
    })),
  }
}

/**
 * The script of one video run: the planner's answers and the stills stage's (reel-stills' fixtures),
 * then, for each take in the order made, its witness and reconciler answers — each passing unless
 * replaced — and, after the stills stage's judge answers, Gate 7's: every question yes unless `cut`
 * replaces it, so a run of passing takes completes (the `judge` script answers `compare` and
 * `judgeCut` in call order). A take left out of `takes` gets no answer, so a run that reaches it
 * fails. A shot's retakes are listed where the run makes them, each by `retake` (reel-takes, S-099).
 */
export function videoScript(
  shape: Shape,
  pics: readonly Pic[],
  over: {
    stills?: Parameters<typeof stillsScript>[2]
    takes?: readonly Take[]
    witness?: Record<string, unknown>
    reconciler?: Record<string, unknown>
    cut?: unknown
  } = {},
): FakeScript {
  const stills = stillsScript(shape, pics, over.stills)
  const takes = over.takes ?? takesOf(shape)
  return {
    planner: stills.planner,
    witness: [
      ...(stills.witness ?? []),
      ...takes.map((t) => ({ value: over.witness?.[t.key] ?? seenClip(t) })),
    ],
    reconciler: [
      ...(stills.reconciler ?? []),
      ...takes.map((t) => ({ value: over.reconciler?.[t.key] ?? passesTake(t) })),
    ],
    judge: [...(stills.judge ?? []), { value: over.cut ?? cutAnswer() }],
  }
}

/**
 * The script of a clips stage and its cut alone, with no planner or stills stage before them: what a
 * worker that takes up a video run after its stills stage is asked — each take's witness and
 * reconciler answers in the order made, retakes included, each passing, then Gate 7's, every question
 * yes.
 */
export function clipsScript(takes: readonly Take[]): FakeScript {
  return {
    witness: takes.map((t) => ({ value: seenClip(t) })),
    reconciler: takes.map((t) => ({ value: passesTake(t) })),
    judge: [{ value: cutAnswer() }],
  }
}

const [pa, pb, barons, hall] = THREE_RANKS_PICS as [Pic, Pic, Pic, Pic]

/**
 * reel-render's check 9 fixture: a completed stills stage with every opening S-071 names. The
 * canonical's candidates are both clipped, so its repair is chosen for shot 0; the barons' first
 * picture fails and its repair is chosen for shot 1; the hall's picture fails Gate 1S with no slot
 * left, so shot 2 is DEGRADED; shots 3, 4 and 5 were never given a picture.
 */
export const DEGRADED = {
  shape: THREE_RANKS,
  sensors: { [hall.key]: { similarity: 0.5 } },
  pics: [pa, pb, again(pa, 'repair'), barons, again(barons, 'repair'), hall],
  stills: {
    witness: { [pa.key]: clipped(pa), [pb.key]: clipped(pb) },
    reconciler: { [barons.key]: showsPerson(barons) },
    judge: [judged([SEAL.name], [SEAL.name])],
  },
  /** The chosen pictures, by key, and the shot each opens. */
  chosen: { 0: 'shot-0-repair', 1: 'shot-1-repair' } as Record<number, string>,
  degradedShots: [2],
  unpictured: [3, 4, 5],
}

/** Every picture of DEGRADED that was made and not chosen. */
export const DEGRADED_UNCHOSEN = ['shot-0-a', 'shot-0-b', 'shot-1-single', 'shot-2-single']

// ---------------------------------------------------------------- reading a video run

const json = <T>(text: string | null): T => (text === null ? null : JSON.parse(text)) as T

export interface Probe {
  readable: boolean
  durationSeconds: number
  video: { codec: string; width: number; height: number; fps: number; frames: number } | null
  audio: { codec: string; sampleRate: number; channels: number } | null
  moovFirst: boolean | null
}

export interface Verdict {
  gate: string
  outcome: string
  reasons: string[]
  coverage: { strategy: string; limitations?: string[] }
}

export interface TakeRow {
  take_id: string
  attempt: number
  shot_unit: number
  number: number
  mode: string
  picture_id: string | null
  degraded: boolean
  prompt: string
  requested_seconds: number
  seed: number
  request_id: string
  expanded_prompt: string
  path: string
  probe: Probe | null
  scan: {
    black: Array<{ startSeconds: number; seconds: number }>
    frozen: Array<{ startSeconds: number; seconds: number }>
    silent: Array<{ startSeconds: number; seconds: number }>
    loudnessLufs: number | null
  } | null
  words: string[] | null
  sound: { speech: boolean; music: boolean } | null
  verdicts: Verdict[]
  outcome: string | null
  degradation: string | null
}

export interface NarrationRow {
  narration_id: string
  attempt: number
  shot_unit: number
  text: string
  path: string
  words: Array<{ word: string; startMs: number; endMs: number }> | null
  probe: Probe | null
}

export interface VideoReceiptRow {
  id: number
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
  fake: boolean
  degraded: boolean
  /** The `unavailable` answers before the call was made (reel-takes, S-096). */
  transient_errors: number
  at: string
}

export interface SpeechReceiptRow {
  id: number
  narration_id: string
  model: string
  characters: number
  rate_cents: number
  cost_cents: number
  fake: boolean
  /** The `unavailable` answers before the call was made (reel-takes, S-096). */
  transient_errors: number
  at: string
}

export interface ModelReceiptRow {
  id: number
  role: string
  call: string
  temperature: number
  picture_ids: string[]
  take_ids: string[]
}

/** A shot held on its chosen picture at its take cap (reel-takes, S-090, S-098). */
export interface StillHoldRow {
  shot_id: string
  attempt: number
  picture_id: string
  probe: Probe
  take_ids: string[]
  reason: string
}

export interface Videoed {
  runId: string
  result: Record<string, unknown>
  events: Event[]
  takes: TakeRow[]
  narrations: NarrationRow[]
  videoReceipts: VideoReceiptRow[]
  speechReceipts: SpeechReceiptRow[]
  receipts: ModelReceiptRow[]
  takeObservations: Array<{ id: string; take_id: string; observation: ClipObservation }>
  takeReconciliations: Array<{ id: string; take_id: string; answer: unknown; failed: string[] }>
  /** In the order written. */
  stillHolds: StillHoldRow[]
  jobs: Array<Omit<JobRow, 'correlation_id'>>
}

/** Everything a video run left behind in its clips stage, as a caller and an operator read it. */
export async function readVideo(engine: Engine, runId: string): Promise<Videoed> {
  const status = (await engine.http.status(runId)).json
  const result =
    status.state === 'finished'
      ? ((await engine.http.result(runId)).json as Record<string, unknown>)
      : {}
  return {
    runId,
    result,
    events: await eventsOf(engine, runId),
    takes: engine
      .query<Record<string, unknown>>('SELECT * FROM take WHERE run_id = ? ORDER BY rowid', runId)
      .map((r) => ({
        ...(r as unknown as TakeRow),
        degraded: r.degraded === 1,
        probe: json(r.probe as string | null),
        scan: json(r.scan as string | null),
        words: json(r.words as string | null),
        sound: json(r.sound as string | null),
        verdicts: json(r.verdicts as string),
      })),
    narrations: engine
      .query<Record<string, unknown>>(
        'SELECT * FROM narration WHERE run_id = ? ORDER BY rowid',
        runId,
      )
      .map((r) => ({
        ...(r as unknown as NarrationRow),
        words: json(r.words as string | null),
        probe: json(r.probe as string | null),
      })),
    videoReceipts: engine
      .query<Record<string, unknown>>(
        'SELECT * FROM video_receipt WHERE run_id = ? ORDER BY id',
        runId,
      )
      .map((r) => ({
        ...(r as unknown as VideoReceiptRow),
        fake: r.fake === 1,
        degraded: r.degraded === 1,
      })),
    speechReceipts: engine
      .query<Record<string, unknown>>(
        'SELECT * FROM speech_receipt WHERE run_id = ? ORDER BY id',
        runId,
      )
      .map((r) => ({ ...(r as unknown as SpeechReceiptRow), fake: r.fake === 1 })),
    receipts: engine
      .query<Record<string, unknown>>(
        'SELECT id, role, call, temperature, picture_ids, take_ids FROM model_receipt WHERE run_id = ? ORDER BY id',
        runId,
      )
      .map((r) => ({
        ...(r as unknown as ModelReceiptRow),
        picture_ids: json(r.picture_ids as string),
        take_ids: json(r.take_ids as string),
      })),
    takeObservations: engine
      .query<{ id: string; take_id: string; observation: string }>(
        'SELECT id, take_id, observation FROM take_observation WHERE run_id = ? ORDER BY id',
        runId,
      )
      .map((r) => ({ ...r, observation: json(r.observation) })),
    takeReconciliations: engine
      .query<{ id: string; take_id: string; answer: string; failed: string }>(
        'SELECT id, take_id, answer, failed FROM take_reconciliation WHERE run_id = ? ORDER BY id',
        runId,
      )
      .map((r) => ({ ...r, answer: json(r.answer), failed: json(r.failed) })),
    stillHolds: engine
      .query<Record<string, unknown>>(
        'SELECT shot_id, attempt, picture_id, probe, take_ids, reason FROM still_hold WHERE run_id = ? ORDER BY rowid',
        runId,
      )
      .map((r) => ({
        ...(r as unknown as StillHoldRow),
        probe: json(r.probe as string),
        take_ids: json(r.take_ids as string),
      })),
    jobs: engine
      .query<Omit<JobRow, 'correlation_id'>>(
        'SELECT id, kind, parent_id, state, attempts, cost_cents FROM job WHERE correlation_id = ? ORDER BY id',
        runId,
      )
      .map((r) => ({ ...r })),
  }
}

/**
 * How long a video run is given to finish. Every take spawns ffmpeg and ffprobe several times, and
 * the suite runs its files side by side, so the harness's five seconds are a plan run's wait, not a
 * video run's. A longer wait changes no assertion.
 */
export const VIDEO_FINISH_MS = 90_000

/** Waits until a run's status says it has finished, for as long as a video run may take. */
export async function videoFinished(engine: Engine, runId: string): Promise<void> {
  await waitFor(
    `video run ${runId} to finish`,
    async () => (await engine.http.status(runId)).json.state === 'finished',
    VIDEO_FINISH_MS,
  )
}

/** Submits a video request, waits for its run to finish, and reads everything it left behind. */
export async function video(engine: Engine, request: SubmitRequest): Promise<Videoed> {
  const submitted = await engine.http.submit(request)
  if (submitted.status !== 202) {
    throw new Error(`the request was not accepted: ${JSON.stringify(submitted.json)}`)
  }
  const runId = String(submitted.json.runId)
  await videoFinished(engine, runId)
  return readVideo(engine, runId)
}

/** A take row by its id without the attempt, or a failure naming what the run holds. */
export function takeOf(ran: Videoed, key: string): TakeRow {
  const found = ran.takes.find((t) => t.take_id.replace(/^a\d+-/, '') === key)
  if (found === undefined) {
    throw new Error(`no take ${key}; the run holds ${ran.takes.map((t) => t.take_id).join(', ')}`)
  }
  return found
}

/**
 * A model port that holds one call open until the test lets it go: the call `which` picks, counted
 * from 1 over the calls it matches. `reached` resolves once that call is waiting.
 */
export function holding(which: {
  call: 'structured' | 'observe'
  matches: (call: Record<string, unknown>) => boolean
  nth?: number
}) {
  let reach!: () => void
  const reached = new Promise<void>((resolve) => (reach = resolve))
  let release!: () => void
  const released = new Promise<void>((resolve) => (release = resolve))
  let seen = 0
  const wait = async (call: Record<string, unknown>) => {
    if (which.matches(call) && ++seen === (which.nth ?? 1)) {
      reach()
      await released
    }
  }
  const wrap = (model: LanguageModelPort): LanguageModelPort => ({
    async structured(call) {
      if (which.call === 'structured') await wait(call as unknown as Record<string, unknown>)
      return model.structured(call)
    },
    async observe(call) {
      if (which.call === 'observe') await wait(call as unknown as Record<string, unknown>)
      return model.observe(call)
    },
    compare: (call) => model.compare(call),
    judgeCut: (call) => model.judgeCut(call),
    readText: (call) => model.readText(call),
  })
  return { wrap, reached, release: () => release() }
}

/** Whether a structured call is the reconciler's for this take (by its receipt ids). */
export const reconcilesTake =
  (takeKey: string) =>
  (call: Record<string, unknown>): boolean =>
    call.role === 'reconciler' &&
    Array.isArray(call.takeIds) &&
    call.takeIds.some((id) => String(id).replace(/^a\d+-/, '') === takeKey)

/**
 * Waits until a held call is reached, and fails instead of waiting for ever when the run finishes
 * without reaching it, or when a video run's wait runs out.
 */
export async function whenHeld(engine: Engine, runId: string, reached: Promise<void>) {
  let done = false
  const deadline = Date.now() + VIDEO_FINISH_MS
  const ended = (async () => {
    while (!done) {
      if ((await engine.http.status(runId)).json.state === 'finished') {
        const result = (await engine.http.result(runId)).json
        throw new Error(`run ${runId} finished before the held call: ${JSON.stringify(result)}`)
      }
      if (Date.now() > deadline) throw new Error(`run ${runId} never reached the held call`)
      await new Promise((resolve) => setTimeout(resolve, 20))
    }
  })()
  try {
    await Promise.race([reached, ended])
  } finally {
    done = true
    ended.catch(() => {})
  }
}
