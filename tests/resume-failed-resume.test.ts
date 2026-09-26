import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { test } from 'node:test'
import type {
  PictureRecord,
  Piece,
  Plan,
  ResumeInputs,
  ResumePlan,
  ResumeRates,
  TakeRecord,
  VideoRequest,
} from '@cutroom/contracts'
import {
  DEFAULT_PLAN_SETTINGS,
  admitResume,
  planReel,
  planResume,
  type PlanOutcome,
} from '@cutroom/pipeline'
import { fakeModel, type FakeAnswer, type FakeScript } from '@cutroom/providers'
import type { SubmitRequest } from '@cutroom/reel-contract'
import {
  KEYFRAMES_JOB,
  PLAN_JOB,
  admitStills,
  claimJob,
  closeDatabase,
  finishVideo,
  imageCallCount,
  openDatabase,
  readResumeInputs,
  recordClip,
  recordGeneration,
  recordNarration,
  resumeRun,
  submitRun,
  upsertNarration,
  upsertPicture,
  upsertTake,
  type Db,
} from '../packages/domain/src/index.ts'
import { resumed, startEngine, waitFor, type Engine } from './engine/harness.ts'
import { answer, bare } from './engine/plans.ts'
import { narrationRow, takeRow } from './engine/render.ts'
import { PLANNED, killedMidStills } from './engine/restart.ts'
import {
  BARONS,
  CANONICAL_ONLY,
  HALL,
  KING,
  SEAL,
  THREE_RANKS,
  THREE_RANKS_PICS,
  again,
  clipped,
  inTurn,
  judged,
  plannerFor,
  refusedThen,
  showsPerson,
  stillsRequest,
  stillsScript,
  type Pic,
  type Shape,
} from './engine/stills.ts'
import {
  MUST_NOT_SHOW,
  UNCLAIMED,
  VIDEO_FINISH_MS,
  clipsScript,
  cutAnswer,
  described,
  passesTake,
  readVideo,
  retake,
  takesOf,
  videoFinished,
  videoRequest,
  videoScript,
  type Take,
  type Videoed,
} from './engine/video.ts'

// resume-failed, Slice 3 — checks 12 to 25 (docs/features/resume-failed.md): the resume, made by a
// test. A resume is a NEW RUN OF THE SAME REQUEST that copies the failed run's kept rows into itself
// in the one transaction that creates it (S-157, S-161 to S-164), so every stage, reader and label
// goes on reading one run's rows. Checks 12 to 15 plan and admit resumes in this process, from rows
// written by hand or inputs typed out; checks 16 to 25 fail a real run through the worker and resume
// it the way the API will (`resumed`, tests/engine/harness.ts), then watch the resumed run.
//
// The stand-in model answers each role's calls in call order ACROSS RUNS, so a script covers the
// failed run and its resume together: the failed run takes the answers it reached, and the resume
// the ones after.

const [a, b, barons, hall] = THREE_RANKS_PICS as [Pic, Pic, Pic, Pic]
const [t0, t1, t2, t3, t4, t5] = takesOf(THREE_RANKS) as [Take, Take, Take, Take, Take, Take]

/** A model answer the provider was unavailable for: sent again, up to three sends (S-096). */
const BUSY: FakeAnswer = { throws: 'the model answered 529', as: 'unavailable' }

/** The worker's own rates in every engine here: the default plan's and render's (S-124, S-155). */
const RATES: ResumeRates = {
  imageRateCents: 15,
  videoRateCentsPerSecond: 4,
  narrationRateCentsPerCharacter: 0,
}

const failureOf = (engine: Engine, runId: string) =>
  query<{ failure: string | null }>(engine, 'SELECT failure FROM run WHERE run_id = ?', runId)[0]
    ?.failure

/** Submits a request and waits for its run to finish, as long as a video run may take. */
async function ranToTheEnd(engine: Engine, request: SubmitRequest): Promise<Videoed> {
  const submitted = await engine.http.submit(request)
  assert.equal(submitted.status, 202, JSON.stringify(submitted.json))
  const runId = String(submitted.json.runId)
  await videoFinished(engine, runId)
  return readVideo(engine, runId)
}

/** Waits for a resumed run to finish, and reads it. */
async function resumedRun(engine: Engine, runId: string): Promise<Videoed> {
  await videoFinished(engine, runId)
  return readVideo(engine, runId)
}

/** Rows as plain objects: node:sqlite's have no prototype, which a strict deep equality compares. */
const query = <T = Record<string, unknown>>(
  engine: Engine,
  sql: string,
  ...params: Array<string | number>
): T[] => engine.query<T>(sql, ...params).map((row) => ({ ...row }) as T)

/** A failed run's result: its status failed, with that kind in `run.failure`. */
function assertFailed(engine: Engine, ran: Videoed, kind: string, detail: string | RegExp): void {
  assert.equal(ran.result.status, 'failed', JSON.stringify(ran.result))
  if (typeof detail === 'string') assert.equal(ran.result.detail, detail)
  else assert.match(String(ran.result.detail), detail)
  assert.equal(failureOf(engine, ran.runId), kind)
}

/** Every request a stand-in received for one run, by the id it was asked for. */
const idsFor = <T extends { runId: string }>(
  calls: readonly T[],
  runId: string,
  id: (c: T) => string,
) => calls.filter((c) => c.runId === runId).map(id)

/** The THREE_RANKS plan the fixtures' planner answers make: 6 shots of 7, 7, 7, 7, 6, 6 seconds. */
async function threeRanksPlan(
  request: SubmitRequest,
): Promise<{ outcome: PlanOutcome; plan: Plan }> {
  const outcome = await planReel(
    request,
    fakeModel({ planner: plannerFor(THREE_RANKS) }, { models: DEFAULT_PLAN_SETTINGS.models }),
    300,
    DEFAULT_PLAN_SETTINGS,
  )
  assert.equal(outcome.kind, 'selected')
  if (outcome.kind !== 'selected') throw new Error('no plan')
  const plan = outcome.selected === 'repair' ? outcome.repair : outcome.fork[outcome.selected]
  assert.ok(plan !== null && plan !== undefined)
  return { outcome, plan }
}

// ---------------------------------------------------------------- 12

/** A picture as the stills stage makes one, before its checks: `a<attempt>-shot-<unit>-<label>`. */
function madePicture(pictureId: string): Omit<PictureRecord, 'seq'> {
  const parts = /^a(\d+)-shot-(\d+)-(.+)$/.exec(pictureId)
  assert.ok(parts !== null, pictureId)
  const [, attempt, unit, label] = parts
  return {
    pictureId,
    attempt: Number(attempt),
    shotUnit: Number(unit),
    subjectId: 'seal',
    role: unit === '0' ? 'canonical' : 'derived',
    label: String(label),
    path: `/artifacts/rf12/${pictureId}.png`,
    prompt: `the prompt of ${pictureId}`,
    framing: null,
    references: [],
    gate1: null,
    measure: null,
    text: null,
    observation: null,
    reconciliation: null,
    score: null,
    gate1s: null,
    degradation: null,
    chosen: false,
  }
}

/** Gate 1 decided, by its technical step alone. */
const decidedGate1 = (outcome: 'accept' | 'fail'): NonNullable<PictureRecord['gate1']> => ({
  outcome,
  coverage: 'whole picture',
  steps: [{ step: 'technical', outcome, reasons: outcome === 'fail' ? ['it is too dark'] : [] }],
})

/** A video request as the clips stage asks for a take made from words. */
const wordsRequest = (runId: string, take: TakeRecord): VideoRequest => ({
  runId,
  takeId: take.takeId,
  prompt: take.prompt,
  durationSeconds: take.durationSeconds,
  resolution: '768P',
  seed: take.seed,
  promptExpansionMode: 'balanced',
  mode: 'text-to-video',
  aspectRatio: '9:16',
})

test("12. planResume keeps every plan row, every decided picture, every finished narration and every decided take, and nothing cut off; a narration measured and not timed (P-001) is made again; of two decided pictures of one shot and label, the later attempt's is kept", async () => {
  const dir = mkdtempSync(join(tmpdir(), 'resume-failed-12-'))
  const db: Db = openDatabase(join(dir, 'engine.sqlite'))
  try {
    const request = videoRequest('rf12')
    const { outcome, plan } = await threeRanksPlan(request)
    if (outcome.kind !== 'selected') throw new Error('no plan')
    const submitted = submitRun(db, request, JSON.stringify(request))
    const runId = submitted.runId
    const planJob = claimJob(db, [PLAN_JOB])
    assert.ok(planJob !== undefined)
    admitStills(db, {
      runId,
      jobId: planJob.id,
      plans: [
        {
          role: 'a',
          axis: 'shotCount',
          plan: outcome.fork.a,
          verdict: { outcome: 'fail', failed: ['shape'] },
          score: null,
          selected: false,
        },
        {
          role: 'b',
          axis: 'shotCount',
          plan,
          verdict: { outcome: 'accept', failed: [] },
          score: null,
          selected: true,
        },
      ],
    })
    const job = claimJob(db, [KEYFRAMES_JOB])
    assert.ok(job !== undefined)

    // The rows a run restarted after a crash, and failed, would hold. Attempt 1 decided shot-0's a
    // and failed shot-1's picture, and was cut off inside shot-0's b; attempt 2 — as a run from
    // before S-164 did — made shot-1's picture again and decided it, made b again, and decided
    // shot-2's. Every picture: [id, its Gate 1 outcome, or null for checks cut off].
    const pictures: Array<[string, 'accept' | 'fail' | null]> = [
      ['a1-shot-0-a', 'accept'],
      ['a1-shot-1-single', 'fail'],
      ['a1-shot-0-b', null],
      ['a2-shot-0-b', 'accept'],
      ['a2-shot-1-single', 'accept'],
      ['a2-shot-2-single', 'fail'],
    ]
    for (const [id, decided] of pictures) {
      const made = madePicture(id)
      recordGeneration(db, {
        jobId: job.id,
        runId,
        picture: made,
        rateCents: 15,
        style: { id: 'style-1', version: 2 },
        receipt: { model: 'stand-in-image', costCents: 0, fake: true },
      })
      if (decided !== null) {
        upsertPicture(db, runId, { ...made, seq: 0, gate1: decidedGate1(decided) })
      }
    }

    // Shot-0's narration finished; shot-1's measured, its timings refused (P-001); shot-2's made
    // and never measured.
    const n0 = narrationRow(0, 6.2, ['In', '1215'])
    const n1 = {
      ...narrationRow(1, 4.1, ['The', 'barons']),
      narrationId: 'a2-shot-1-narration',
      attempt: 2,
    }
    const n2 = { ...narrationRow(2, 3, ['Within']), narrationId: 'a2-shot-2-narration', attempt: 2 }
    for (const n of [n0, n1, n2]) {
      recordNarration(db, {
        jobId: job.id,
        runId,
        narration: { ...n, words: null, probe: null },
        rateCentsPerCharacter: 0,
        receipt: { model: 'stand-in-voice', characters: 2, costCents: 0, fake: true },
        transientErrors: 0,
      })
    }
    upsertNarration(db, runId, n0)
    upsertNarration(db, runId, { ...n1, words: null })

    // Shot-0's first take decided and failed; its second cut off inside its gates in attempt 1, and
    // made again and accepted in attempt 2.
    const takes: TakeRecord[] = [
      takeRow(0, 7, { outcome: 'fail' }),
      takeRow(0, 7, { takeId: 'a1-shot-0-take-2', number: 2, outcome: null, verdicts: [] }),
      takeRow(0, 7, { takeId: 'a2-shot-0-take-2', attempt: 2, number: 2 }),
    ]
    for (const take of takes) {
      recordClip(db, {
        jobId: job.id,
        runId,
        take: { ...take, outcome: null, verdicts: [] },
        request: wordsRequest(runId, take),
        style: { id: 'style-1', version: 2 },
        rateCents: 4,
        receipt: {
          model: 'stand-in-video',
          requestId: take.requestId,
          costCents: 0,
          fake: true,
          expandedPrompt: take.expandedPrompt,
        },
        transientErrors: 0,
      })
      if (take.outcome !== null) upsertTake(db, runId, take)
    }
    finishVideo(db, {
      runId,
      jobId: job.id,
      result: {
        contractVersion: 1,
        runId,
        requestId: 'rf12',
        costCents: 0,
        status: 'failed',
        detail:
          'the word timings of a2-shot-1-narration do not parse: (timings): a word is left out',
      },
      failure: 'unreadable',
    })

    const inputs = readResumeInputs(db, runId)
    const planned = planResume(inputs, [], RATES, 'caller')
    assert.equal(planned.outcome, 'planned', JSON.stringify(planned))
    if (planned.outcome !== 'planned') return
    assert.deepEqual(planned.plan.start, 'keyframes')
    assert.deepEqual(planned.plan.keep, {
      plans: ['a', 'b'],
      // In the order made; a1-shot-1-single is the earlier of shot-1's two, and a1-shot-0-b was cut off.
      pictures: ['a1-shot-0-a', 'a2-shot-0-b', 'a2-shot-1-single', 'a2-shot-2-single'],
      // a2-shot-1-narration was measured and not timed, a2-shot-2-narration never measured.
      narrations: ['a1-shot-0-narration'],
      // a1-shot-0-take-2 was cut off.
      takes: ['a1-shot-0-take-1', 'a2-shot-0-take-2'],
    })
    assert.deepEqual(planned.plan.named, [])
    assert.deepEqual(planned.plan.remade, [])
    assert.equal(inputs.failure, 'unreadable')
    assert.deepEqual(inputs.plan, plan)
  } finally {
    closeDatabase(db)
    rmSync(dir, { recursive: true, force: true })
  }
})

// ---------------------------------------------------------------- 13 to 15: inputs typed out

/** A failed run's inputs: nothing kept, 40 cents spent, failed unavailable. */
function inputsOf(
  request: SubmitRequest,
  plan: Plan | null,
  over: Partial<ResumeInputs> = {},
): ResumeInputs {
  return {
    runId: 'origin',
    request,
    result: {
      contractVersion: 1,
      runId: 'origin',
      requestId: request.requestId,
      costCents: 40,
      status: 'failed',
      detail: 'the provider is unavailable: fal answered 503',
    },
    failure: 'unavailable',
    cancelRequested: false,
    resumes: null,
    resumedBy: null,
    plan,
    plans: plan === null ? [] : ['a', 'b'],
    pictures: [],
    narrations: [],
    takes: [],
    spentCents: 40,
    ...over,
  }
}

const S = (shot: number): Piece => ({ kind: 'still', shot: `shot-${shot}` })
const N = (shot: number): Piece => ({ kind: 'narration', shot: `shot-${shot}` })
const C = (shot: number): Piece => ({ kind: 'clip', shot: `shot-${shot}` })

/** What `planResume` planned for these inputs and names, or a failure naming what it answered. */
function planned(inputs: ResumeInputs, remake: readonly Piece[], rates = RATES): ResumePlan {
  const answered = planResume(inputs, remake, rates, 'caller')
  assert.equal(answered.outcome, 'planned', JSON.stringify(answered))
  if (answered.outcome !== 'planned') throw new Error('not planned')
  return answered.plan
}

test('13. the takedown: a still takes its shots clip; the canonicals still every derived shots still and clip; a standalones still its own shot only; a narration its shots clip; no shot means every shot that has that piece; the list is normalised; and a shot outside the plan, a shot with no such piece, a narration or clip on a stills run, and any piece on a run with no selected plan are refused invalid', async () => {
  const request = videoRequest('rf13')
  const { plan } = await threeRanksPlan(request)
  const inputs = inputsOf(request, plan)

  // THREE_RANKS places the canonical on shot-0 and two derived pictures, on shot-1 and shot-2.
  assert.deepEqual(planned(inputs, [S(1)]).remade, [S(1), C(1)])
  assert.deepEqual(planned(inputs, [S(0)]).remade, [S(0), C(0), S(1), C(1), S(2), C(2)])
  assert.deepEqual(planned(inputs, [N(4)]).remade, [N(4), C(4)])
  assert.deepEqual(planned(inputs, [C(5)]).remade, [C(5)])

  // No shot: every shot the plan gives that piece — a still where it places a picture.
  const everyStill = planned(inputs, [{ kind: 'still' }])
  assert.deepEqual(everyStill.named, [S(0), S(1), S(2)])
  assert.deepEqual(everyStill.remade, [S(0), C(0), S(1), C(1), S(2), C(2)])
  const everyNarration = planned(inputs, [{ kind: 'narration' }])
  assert.deepEqual(everyNarration.named, [N(0), N(1), N(2), N(3), N(4), N(5)])
  assert.deepEqual(
    everyNarration.remade,
    [0, 1, 2, 3, 4, 5].flatMap((shot) => [N(shot), C(shot)]),
  )

  // Normalised: without duplicates, in shot and kind order.
  const messy = planned(inputs, [C(2), S(1), C(2), N(1), S(1)])
  assert.deepEqual(messy.named, [S(1), N(1), C(2)])
  assert.deepEqual(messy.remade, [S(1), N(1), C(1), C(2)])

  // A standalone's still takes down its own shot only (three-pictures, S-150): CANONICAL_ONLY under
  // upToThree places the canonical on shot-0 and standalones on shot-1 and shot-3.
  const three: Plan = {
    ...plan,
    shots: plan.shots.map((shot, i) => ({
      ...shot,
      subjectIds: [...(CANONICAL_ONLY.shown[i] ?? [])],
    })),
    subjects: [SEAL, HALL, KING],
    pictures: 'upToThree',
  }
  const standalone = inputsOf(request, three)
  assert.deepEqual(planned(standalone, [S(1)]).remade, [S(1), C(1)])
  assert.deepEqual(planned(standalone, [S(0)]).remade, [S(0), C(0)])
  assert.deepEqual(planned(standalone, [{ kind: 'still' }]).named, [S(0), S(1), S(3)])

  const invalid = (inputsFor: ResumeInputs, remake: Piece[], detail: RegExp) => {
    const answered = planResume(inputsFor, remake, RATES, 'caller')
    assert.equal(answered.outcome, 'refused', JSON.stringify(answered))
    if (answered.outcome !== 'refused') return
    assert.equal(answered.reason, 'invalid')
    assert.match(answered.detail, detail)
  }
  invalid(inputs, [C(6)], /^shot-6 is not a shot of the plan/)
  invalid(inputs, [{ kind: 'clip', shot: 'scene-1' }], /^scene-1 is not a shot of the plan/)
  invalid(inputs, [S(4)], /^shot-4 has no still: the plan places no picture on it/)
  const stillsRun = inputsOf(stillsRequest('rf13-stills'), plan)
  invalid(stillsRun, [N(0)], /^a stills run has no narration to make again/)
  invalid(stillsRun, [{ kind: 'clip' }], /^a stills run has no clip to make again/)
  invalid(inputsOf(request, null), [S(0)], /^the run has no selected plan to name a piece by/)
  // A stills run's still is still a piece, and takes down no clip.
  assert.deepEqual(planned(stillsRun, [S(1)]).remade, [S(1)])
})

test('14. the estimate is the first calls of every placement with no kept picture at the image rate, plus the requested seconds of every shot with no kept accepted take and not held at the video rate — from its kept narrations measure, else the plans — plus the characters of every narration not kept at the narration rate, rounded up once; and for a stills runs resume, its pictures alone', async () => {
  const request = videoRequest('rf14')
  const { plan } = await threeRanksPlan(request)
  // THREE_RANKS' plan: 6 shots of 7, 7, 7, 7, 6 and 6 seconds; unit texts of 82, 83, 34, 32, 26 and
  // 52 characters, counted by hand from tests/engine/video.ts's UNIT_SENTENCES.
  const rates: ResumeRates = {
    imageRateCents: 15,
    videoRateCentsPerSecond: 4,
    narrationRateCentsPerCharacter: 0.01,
  }
  const kept: Partial<ResumeInputs> = {
    // Shot-0's a and b decided, shot-1's picture cut off, shot-2's decided.
    pictures: [
      { pictureId: 'a1-shot-0-a', shotUnit: 0, label: 'a', attempt: 1, outcome: 'accept' },
      { pictureId: 'a1-shot-0-b', shotUnit: 0, label: 'b', attempt: 1, outcome: 'fail' },
      {
        pictureId: 'a1-shot-2-single',
        shotUnit: 2,
        label: 'single',
        attempt: 1,
        outcome: 'accept',
      },
    ],
    // Shots 0, 1 and 2 narrated: 6.2, 4.1 and 12.4 seconds, asking for 7, 5 and 13.
    narrations: [
      { narrationId: 'a1-shot-0-narration', shotUnit: 0, durationSeconds: 6.2 },
      { narrationId: 'a1-shot-1-narration', shotUnit: 1, durationSeconds: 4.1 },
      { narrationId: 'a1-shot-2-narration', shotUnit: 2, durationSeconds: 12.4 },
    ],
    // Shot-0 accepted; shot-1 one failed take; shot-2 held on three failed takes.
    takes: [
      { takeId: 'a1-shot-0-take-1', shotUnit: 0, outcome: 'accept' },
      { takeId: 'a1-shot-1-take-1', shotUnit: 1, outcome: 'fail' },
      { takeId: 'a1-shot-2-take-1', shotUnit: 2, outcome: 'fail' },
      { takeId: 'a1-shot-2-take-2', shotUnit: 2, outcome: 'fail' },
      { takeId: 'a1-shot-2-take-3', shotUnit: 2, outcome: 'fail' },
    ],
  }
  // One picture (shot-1's) at 15; shot-1 from its narration, 5 s, and shots 3, 4, 5 from the plan,
  // 7 + 6 + 6, so 24 s at 4 = 96; narrations 3, 4, 5 not kept, 32 + 26 + 52 = 110 at 0.01 = 1.1.
  // 15 + 96 + 1.1 = 112.1, rounded up once: 113.
  assert.equal(planned(inputsOf(request, plan, kept), [], rates).estimateCents, 113)

  // Naming shot-0's clip: its accepted take is not kept, and its kept narration asks for 7 s: +28.
  // 112.1 + 28 = 140.1: 141.
  assert.equal(planned(inputsOf(request, plan, kept), [C(0)], rates).estimateCents, 141)
  // Naming shot-2's narration: its narration and clip taken down — the held takes with them — so
  // shot-2 asks the plan's 7 s and speaks 34 characters: 112.1 + 28 + 0.34 = 140.44: 141.
  assert.equal(planned(inputsOf(request, plan, kept), [N(2)], rates).estimateCents, 141)
  // Naming the canonical's still takes down every picture and shots 0, 1 and 2's clips: four first
  // calls (60); shot-0 from its narration, 7 s, shot-1 5, shot-2 — its three held takes taken down —
  // 13 from its narration, and 3, 4, 5 from the plan: 44 s (176); 1.1 of narration. 237.1: 238.
  assert.equal(planned(inputsOf(request, plan, kept), [S(0)], rates).estimateCents, 238)

  // Nothing kept, nothing named: every first call, every shot's plan seconds, every narration.
  // 4 × 15 + 40 × 4 + 309 × 0.01 = 60 + 160 + 3.09 = 223.09: 224.
  assert.equal(planned(inputsOf(request, plan), [], rates).estimateCents, 224)

  // A stills run's resume: its pictures alone, whatever is narrated or taken.
  const stillsRun = inputsOf(stillsRequest('rf14-stills'), plan, kept)
  assert.equal(planned(stillsRun, [], rates).estimateCents, 15)
  assert.equal(planned(inputsOf(stillsRequest('rf14-none'), plan), [], rates).estimateCents, 60)
})

test('15. admitResume admits a figure exactly equal to a limit and refuses one cent over, the cap before the ceiling', () => {
  assert.deepEqual(admitResume(55, 45, 100, 200), { admitted: true, estimateCents: 100 })
  assert.deepEqual(admitResume(55, 46, 100, 200), {
    admitted: false,
    limit: 'reel',
    estimateCents: 101,
  })
  assert.deepEqual(admitResume(55, 45, 200, 100), { admitted: true, estimateCents: 100 })
  assert.deepEqual(admitResume(55, 46, 200, 100), {
    admitted: false,
    limit: 'ceiling',
    estimateCents: 101,
  })
  // Over both: the cap is named, as every guard here names it first (D-100).
  assert.deepEqual(admitResume(55, 46, 100, 100), {
    admitted: false,
    limit: 'reel',
    estimateCents: 101,
  })
  assert.deepEqual(admitResume(0, 0, 0, 0), { admitted: true, estimateCents: 0 })
})

// ---------------------------------------------------------------- 16

/** Every row of `table` for `runId`, as the database holds it. */
const rowsOf = (engine: Engine, table: string, runId: string) =>
  query<Record<string, unknown>>(
    engine,
    `SELECT * FROM ${table} WHERE run_id = ? ORDER BY rowid`,
    runId,
  )

/** Every table a run's rows are in, with how the run is named there. */
const RUN_TABLES: ReadonlyArray<[string, string]> = [
  ['run', 'run_id'],
  ['run_event', 'run_id'],
  ['job', 'correlation_id'],
  ['plan', 'run_id'],
  ['model_receipt', 'run_id'],
  ['picture', 'run_id'],
  ['observation', 'run_id'],
  ['reconciliation', 'run_id'],
  ['generation_receipt', 'run_id'],
  ['lost_call', 'run_id'],
  ['refused_answer', 'run_id'],
  ['degradation', 'run_id'],
  ['narration', 'run_id'],
  ['speech_receipt', 'run_id'],
  ['take', 'run_id'],
  ['video_receipt', 'run_id'],
  ['take_observation', 'run_id'],
  ['take_reconciliation', 'run_id'],
  ['render', 'run_id'],
  ['hold', 'run_id'],
  ['still_hold', 'run_id'],
]

/** How many rows every table holds, in all. */
const counts = (engine: Engine) =>
  Object.fromEntries(
    RUN_TABLES.map(([table]) => [
      table,
      query<{ n: number }>(engine, `SELECT COUNT(*) AS n FROM ${table}`)[0]?.n,
    ]),
  )

test('16. resumeRun, in one transaction, makes a run of the same requestId and request that resumes the origin; copies the kept rows with kept_from set, chosen false, a pictures degradation as it was and a takes reset; copies no receipt, lost call, refused answer, degradation, still-hold or render; appends run.accepted and the plans events; and enqueues one job with no parent, due after the delay, its attempts the origins; a second resumeRun on the same origin, and one on a resume, throw and leave nothing', async () => {
  // The origin holds every kind of row: DEGRADED's stills — shot-2 degraded, its picture carrying
  // the reason — shot-1 held on its picture, its third take carrying the still-hold's reason, a
  // reconcile refused once (a lost call and a refused answer), and a render stopped at Gate 7.
  const engine = await startEngine({
    worker: false,
    sensors: { [hall.key]: { similarity: 0.5 } },
    video: {
      'shot-1-take-1': { black: 'whole' },
      'shot-1-take-2': { black: 'whole' },
      'shot-1-take-3': { black: 'whole' },
    },
    script: videoScript(
      THREE_RANKS,
      [a, b, again(a, 'repair'), barons, again(barons, 'repair'), hall],
      {
        stills: {
          witness: { [a.key]: clipped(a), [b.key]: clipped(b) },
          reconciler: { [barons.key]: showsPerson(barons) },
          judge: [judged([SEAL.name], [SEAL.name])],
        },
        takes: [t0, t2, t3, t4, t5],
        reconciler: { [t0.key]: refusedThen({ subjects: 'none' }, passesTake(t0)) },
        cut: cutAnswer([0]),
      },
    ),
  })
  try {
    await engine.startWorker()
    const origin = await ranToTheEnd(engine, videoRequest('rf16'))
    assert.equal(origin.result.status, 'stopped', JSON.stringify(origin.result))
    assert.equal(origin.result.rule, 'gate-7')
    await engine.stopWorker()
    for (const table of ['lost_call', 'refused_answer', 'degradation', 'still_hold', 'render']) {
      assert.ok(rowsOf(engine, table, origin.runId).length > 0, `the origin holds no ${table} row`)
    }

    const db = openDatabase(engine.dbPath)
    let runId: string
    try {
      const inputs = readResumeInputs(db, origin.runId)
      const answered = planResume(inputs, [], RATES, 'caller')
      assert.equal(answered.outcome, 'planned', JSON.stringify(answered))
      if (answered.outcome !== 'planned') return
      const now = new Date('2026-09-26T12:00:00.000Z')
      runId = db.transaction(
        (tx) =>
          resumeRun(tx, origin.runId, answered.plan, {
            now,
            delayMs: 60_000,
            resumeRequest: answered.plan.named,
          }),
        { behavior: 'immediate' },
      )

      // The run: the same request, resuming the origin, running, the caller's (empty) list stored.
      const [was] = rowsOf(engine, 'run', origin.runId)
      const [row] = rowsOf(engine, 'run', runId)
      assert.ok(was !== undefined && row !== undefined)
      assert.deepEqual(row, {
        run_id: runId,
        request_id: 'rf16',
        request: was.request,
        request_canonical: was.request_canonical,
        state: 'running',
        result: null,
        cancel_requested: 0,
        created_at: '2026-09-26T12:00:00.000Z',
        resumes: origin.runId,
        failure: null,
        resume_request: '[]',
      })

      // Copies: every column as the origin's, but the run, kept_from, a picture's chosen and a
      // take's degradation.
      const copied = (table: string, key: string, reset: Record<string, unknown>) => {
        const theirs = rowsOf(engine, table, origin.runId)
        const ours = rowsOf(engine, table, runId)
        assert.deepEqual(
          ours.map((r) => r[key]),
          theirs.map((r) => r[key]),
          `${table}: not every kept row was copied, in order`,
        )
        assert.deepEqual(
          ours,
          theirs.map((r) => ({ ...r, run_id: runId, ...reset })),
          `${table}: a copy differs from its origin's row`,
        )
      }
      copied('plan', 'role', {})
      copied('picture', 'picture_id', { chosen: 0, kept_from: origin.runId })
      copied('observation', 'id', {})
      copied('reconciliation', 'id', {})
      copied('narration', 'narration_id', { kept_from: origin.runId })
      copied('take', 'take_id', { degradation: null, kept_from: origin.runId })
      copied('take_observation', 'id', {})
      copied('take_reconciliation', 'id', {})
      // What was copied is what the origin decided, and a picture's degradation came with it.
      assert.equal(rowsOf(engine, 'picture', runId).length, 6)
      assert.ok(
        rowsOf(engine, 'picture', runId).some(
          (r) => r.picture_id === 'a1-shot-2-single' && r.degradation !== null,
        ),
        "shot-2's degradation was not carried on its picture",
      )
      assert.ok(
        rowsOf(engine, 'take', origin.runId).some((r) => r.degradation !== null),
        "no origin take carried a degradation, so the take's reset proves nothing",
      )
      assert.ok(rowsOf(engine, 'picture', origin.runId).some((r) => r.chosen === 1))
      assert.equal(rowsOf(engine, 'take', runId).length, 8)
      assert.equal(rowsOf(engine, 'narration', runId).length, 6)

      for (const table of [
        'model_receipt',
        'generation_receipt',
        'video_receipt',
        'speech_receipt',
        'lost_call',
        'refused_answer',
        'degradation',
        'still_hold',
        'render',
        'hold',
      ]) {
        assert.deepEqual(rowsOf(engine, table, runId), [], `a ${table} row was copied`)
      }

      // run.accepted and the plan stage's events, as the origin's plan stage wrote them.
      const events = engine
        .query<{ body: string; seq: number; at: string }>(
          'SELECT body, seq, at FROM run_event WHERE run_id = ? ORDER BY seq',
          runId,
        )
        .map((r) => JSON.parse(r.body) as Record<string, unknown> & { type: string })
      assert.deepEqual(described(events), PLANNED)
      assert.ok(events.every((e) => e.at === '2026-09-26T12:00:00.000Z' && e.runId === runId))

      // One job, no parent, due a minute on, its attempts the origin's keyframes job's.
      const originKeyframes = query<{ attempts: number }>(
        engine,
        "SELECT attempts FROM job WHERE correlation_id = ? AND kind = 'reel.keyframes'",
        origin.runId,
      )
      assert.deepEqual(originKeyframes, [{ attempts: 1 }])
      assert.deepEqual(
        query<Record<string, unknown>>(
          engine,
          'SELECT kind, payload, state, attempts, run_at, parent_id, cost_cents FROM job WHERE correlation_id = ?',
          runId,
        ),
        [
          {
            kind: 'reel.keyframes',
            payload: JSON.stringify({ runId }),
            state: 'queued',
            attempts: 1,
            run_at: '2026-09-26T12:01:00.000Z',
            parent_id: null,
            cost_cents: 0,
          },
        ],
      )

      // A second resume of the origin, and a resume of the resume, throw and leave nothing.
      const before = counts(engine)
      assert.throws(
        () =>
          db.transaction(
            (tx) =>
              resumeRun(tx, origin.runId, answered.plan, { now, delayMs: 0, resumeRequest: [] }),
            { behavior: 'immediate' },
          ),
        new RegExp(`^Error: run '${origin.runId}' was resumed already, by run '${runId}'`),
      )
      assert.throws(
        () =>
          db.transaction(
            (tx) => resumeRun(tx, runId, answered.plan, { now, delayMs: 0, resumeRequest: [] }),
            { behavior: 'immediate' },
          ),
        new RegExp(
          `^Error: run '${runId}' resumes run '${origin.runId}', and a resume is never resumed`,
        ),
      )
      assert.deepEqual(counts(engine), before)
    } finally {
      closeDatabase(db)
    }
  } finally {
    await engine.stop()
  }
})

// ---------------------------------------------------------------- 17

test('17. a resumed runs jobs claim the origins attempts plus one for each kind, so no picture, narration, take or render id it makes equals one the origin holds, and a named clips first take is sent a different seed from the origins first take of that shot', async () => {
  const engine = await startEngine({
    worker: true,
    script: inTurn(
      videoScript(THREE_RANKS, THREE_RANKS_PICS, { cut: cutAnswer([0]) }),
      clipsScript([t1]),
    ),
  })
  try {
    const origin = await ranToTheEnd(engine, videoRequest('rf17'))
    assert.equal(origin.result.rule, 'gate-7', JSON.stringify(origin.result))
    const made = resumed(engine, origin.runId, { remake: [C(1)] })
    assert.deepEqual(made.plan.remade, [C(1)])
    const ran = await resumedRun(engine, made.runId)
    assert.equal(ran.result.status, 'completed', JSON.stringify(ran.result))

    const jobs = (runId: string) =>
      query<{ id: number; kind: string; attempts: number; parent_id: number | null }>(
        engine,
        'SELECT id, kind, attempts, parent_id FROM job WHERE correlation_id = ? ORDER BY id',
        runId,
      )
    assert.deepEqual(
      jobs(origin.runId).map((j) => [j.kind, j.attempts]),
      [
        ['reel.plan', 1],
        ['reel.keyframes', 1],
        ['reel.clips', 1],
        ['reel.assemble', 1],
      ],
    )
    const ours = jobs(made.runId)
    assert.deepEqual(
      ours.map((j) => [j.kind, j.attempts, j.parent_id]),
      [
        ['reel.keyframes', 2, null],
        ['reel.clips', 2, ours[0]?.id],
        ['reel.assemble', 2, ours[1]?.id],
      ],
    )

    // What the resumed run made, not copied, and every id the origin holds.
    const madeIds = (table: string, key: string, runId: string, copies: boolean) =>
      engine
        .query<Record<string, string>>(
          `SELECT ${key} AS id FROM ${table} WHERE run_id = ?${copies ? '' : ' AND kept_from IS NULL'}`,
          runId,
        )
        .map((r) => r.id)
    assert.deepEqual(madeIds('picture', 'picture_id', made.runId, false), [])
    assert.deepEqual(madeIds('narration', 'narration_id', made.runId, false), [])
    assert.deepEqual(madeIds('take', 'take_id', made.runId, false), ['a2-shot-1-take-1'])
    const renders = (runId: string) =>
      query<{ render_id: string }>(
        engine,
        'SELECT render_id FROM render WHERE run_id = ?',
        runId,
      ).map((r) => r.render_id)
    assert.deepEqual(renders(made.runId), ['a2-render'])
    assert.deepEqual(renders(origin.runId), ['a1-render'])
    const theirs = new Set([
      ...madeIds('picture', 'picture_id', origin.runId, true),
      ...madeIds('narration', 'narration_id', origin.runId, true),
      ...madeIds('take', 'take_id', origin.runId, true),
      ...renders(origin.runId),
    ])
    for (const id of ['a2-shot-1-take-1', 'a2-render']) assert.ok(!theirs.has(id), id)

    // The named clip's first take: the same shot, a new id, so a new seed (D-018).
    const sent = engine.video.calls.filter((c) => c.runId === made.runId)
    assert.deepEqual(
      sent.map((c) => c.takeId),
      ['a2-shot-1-take-1'],
    )
    const first = origin.videoReceipts.find((r) => r.take_id === 'a1-shot-1-take-1')
    assert.ok(first !== undefined)
    assert.notEqual(sent[0]?.seed, first.seed)
    assert.equal(
      sent[0]?.prompt,
      first.prompt,
      'the named clip was not asked for as its first take was',
    )
  } finally {
    await engine.stop()
  }
})

// ---------------------------------------------------------------- 18

test('18. a run failed at a derived picture by an unavailable image call completes on its resume: no image call for a kept picture, one call for each missing one, no narration or video call beyond its shots own, its video shows the kept shots chosen pictures, and its reserve counts each copied picture once, as an earlier call and never as a first call still to make', async () => {
  // The origin: a and b decided, the barons' picture failed Gate 1 (it shows a person), and its
  // repair's image call answered unavailable. The resume makes the barons' repair and the hall's
  // picture, which fails Gate 1S; with a reserve of 6 − 3 copied − 1 unmade = 2 the barons' repair
  // takes one slot and the hall's first repair the other, and the hall's second Gate 1S failure
  // finds none free. Copies uncounted, the reserve would be 5 and a second repair made; counted as
  // first calls too, it would be −1 and the run would fail before any call.
  const pics = [a, b, barons, again(barons, 'repair'), hall, again(hall, 'repair')]
  const engine = await startEngine({
    worker: true,
    images: { 'a1-shot-1-repair': { throws: 'fal answered 503', as: 'unavailable' } },
    sensors: { 'shot-2-single': { similarity: 0.5 }, 'shot-2-repair': { similarity: 0.5 } },
    script: videoScript(THREE_RANKS, pics, {
      stills: {
        reconciler: { [barons.key]: showsPerson(barons) },
        judge: [judged([SEAL.name], [SEAL.name]), judged([SEAL.name], [SEAL.name])],
      },
    }),
  })
  try {
    const origin = await ranToTheEnd(engine, videoRequest('rf18'))
    assertFailed(engine, origin, 'unavailable', 'the provider is unavailable: fal answered 503')
    assert.deepEqual(
      idsFor(engine.image.calls, origin.runId, (c) => c.pictureId),
      ['a1-shot-0-a', 'a1-shot-0-b', 'a1-shot-1-single', 'a1-shot-1-repair'],
    )

    const made = resumed(engine, origin.runId)
    // One first call still to make, the hall's picture, and every shot's clip from the plan's seconds.
    assert.deepEqual(made.plan.keep.pictures, ['a1-shot-0-a', 'a1-shot-0-b', 'a1-shot-1-single'])
    assert.equal(made.plan.estimateCents, 15 + 40 * 4)
    const ran = await resumedRun(engine, made.runId)
    assert.equal(ran.result.status, 'completed', JSON.stringify(ran.result))

    assert.deepEqual(
      idsFor(engine.image.calls, made.runId, (c) => c.pictureId),
      ['a2-shot-1-repair', 'a2-shot-2-single', 'a2-shot-2-repair'],
    )
    const db = openDatabase(engine.dbPath)
    try {
      assert.equal(
        imageCallCount(db, made.runId),
        6,
        'the six are the three copies and three calls',
      )
    } finally {
      closeDatabase(db)
    }
    const degradations = query<{ shot_id: string; gate: string; reason: string }>(
      engine,
      'SELECT shot_id, gate, reason FROM degradation WHERE run_id = ?',
      made.runId,
    )
    assert.equal(degradations.length, 1)
    assert.equal(degradations[0]?.shot_id, 'shot-2')
    assert.equal(degradations[0]?.gate, '1S')
    assert.match(String(degradations[0]?.reason), /; no reserve slot is free \(D-050\)$/)

    // Its shots' own narrations and clips, one each, and nothing more.
    assert.deepEqual(
      idsFor(engine.narration.calls, made.runId, (c) => c.narrationId),
      [0, 1, 2, 3, 4, 5].map((unit) => `a1-shot-${unit}-narration`),
    )
    assert.deepEqual(
      idsFor(engine.video.calls, made.runId, (c) => c.takeId),
      [0, 1, 2, 3, 4, 5].map((unit) => `a1-shot-${unit}-take-1`),
    )

    // The video shows the kept canonical on shot-0, and the barons' repair made now on shot-1.
    const chosen = query<{ picture_id: string; kept_from: string | null }>(
      engine,
      'SELECT picture_id, kept_from FROM picture WHERE run_id = ? AND chosen = 1 ORDER BY shot_unit',
      made.runId,
    )
    assert.deepEqual(chosen, [
      { picture_id: 'a1-shot-0-a', kept_from: origin.runId },
      { picture_id: 'a2-shot-1-repair', kept_from: null },
    ])
    const manifest = renderManifestOf(engine, made.runId)
    const shots = manifest.shots.map((s) => [s.shotId, s.takeId])
    assert.deepEqual(
      shots,
      [0, 1, 2, 3, 4, 5].map((unit) => [`shot-${unit}`, `a1-shot-${unit}-take-1`]),
    )
    assert.deepEqual(
      ran.takes.map((t) => [t.take_id, t.mode, t.picture_id]),
      [
        ['a1-shot-0-take-1', 'image-to-video', 'a1-shot-0-a'],
        ['a1-shot-1-take-1', 'image-to-video', 'a2-shot-1-repair'],
        ['a1-shot-2-take-1', 'text-to-video', null],
        ['a1-shot-3-take-1', 'text-to-video', null],
        ['a1-shot-4-take-1', 'text-to-video', null],
        ['a1-shot-5-take-1', 'text-to-video', null],
      ],
    )
  } finally {
    await engine.stop()
  }
})

/** The render manifest a run's latest render row holds. */
function renderManifestOf(engine: Engine, runId: string) {
  const [row] = query<{ render_manifest: string }>(
    engine,
    'SELECT render_manifest FROM render WHERE run_id = ? ORDER BY attempt DESC LIMIT 1',
    runId,
  )
  assert.ok(row !== undefined, `run ${runId} has no render`)
  return JSON.parse(row.render_manifest) as {
    shots: Array<{ shotId: string; takeId: string }>
    ledger: { imageCents: number; narrationCents: number; videoCents: number }
  }
}

// ---------------------------------------------------------------- 19

test('19. an unnamed resume never reopens a shot the failed runs ladder ended: a shot the failed run degraded for want of a slot — its crash-cut picture not copied, so the resumed reserve has a slot — stays degraded with no image call and its gate and reason as they were, its kept text-to-video take is used, and the run completes', async () => {
  // Killed inside b's witness, the first attempt leaves a decided and b cut off. The second keeps a,
  // makes b again, fails the barons' picture and repairs it with the one slot its reserve holds
  // (6 − 2 earlier − 3 unmade), and degrades the hall's shot, its picture failing Gate 1 with no slot
  // free. The clips stage takes the hall's shot from words and fails at shot-4's clip, unavailable.
  // Resumed, five pictures are copied and b's cut-off first call is not, so the reserve is 1.
  const engine = await startEngine({
    worker: false,
    video: { 'a1-shot-4-take-1': { transient: 3 } },
  })
  try {
    const killed = await killedMidStills(engine, videoRequest('rf19'), {
      script: stillsScript(THREE_RANKS, [a, b]),
      holdAtCall: 5,
      made: ['a1-shot-0-a', 'a1-shot-0-b'],
    })
    await engine.restart({
      script: videoScript(THREE_RANKS, [b, barons, again(barons, 'repair'), hall], {
        stills: {
          reconciler: { [barons.key]: showsPerson(barons), [hall.key]: showsPerson(hall) },
        },
      }),
    })
    await engine.startWorker()
    await videoFinished(engine, killed.runId)
    const origin = await readVideo(engine, killed.runId)
    assertFailed(
      engine,
      origin,
      'unavailable',
      /^the video call for a1-shot-4-take-1 was answered unavailable at each of its 3 sends/,
    )
    const [was] = query<{ gate: string; reason: string }>(
      engine,
      "SELECT gate, reason FROM degradation WHERE run_id = ? AND shot_id = 'shot-2'",
      origin.runId,
    )
    assert.ok(was !== undefined, 'the origin did not degrade shot-2')
    assert.match(
      was.reason,
      /^a2-shot-2-single failed Gate 1 at reconcile: .*; no reserve slot is free \(S-043\)$/,
    )
    const hallTake = origin.takes.find((t) => t.shot_unit === 2)
    assert.equal(hallTake?.mode, 'text-to-video')
    assert.equal(hallTake?.outcome, 'accept')

    const made = resumed(engine, origin.runId)
    assert.deepEqual(made.plan.keep.pictures, [
      'a1-shot-0-a',
      'a2-shot-0-b',
      'a2-shot-1-single',
      'a2-shot-1-repair',
      'a2-shot-2-single',
    ])
    const ran = await resumedRun(engine, made.runId)
    assert.equal(ran.result.status, 'completed', JSON.stringify(ran.result))

    const db = openDatabase(engine.dbPath)
    try {
      // Five copies and no receipt of its own: six less five, a slot free.
      assert.equal(imageCallCount(db, made.runId), 5)
    } finally {
      closeDatabase(db)
    }
    assert.deepEqual(
      idsFor(engine.image.calls, made.runId, (c) => c.pictureId),
      [],
    )
    assert.deepEqual(
      query(engine, 'SELECT shot_id, gate, reason FROM degradation WHERE run_id = ?', made.runId),
      [{ shot_id: 'shot-2', gate: was.gate, reason: was.reason }],
    )
    assert.ok(described(ran.events).includes('degraded shot-2'))
    assert.deepEqual(
      idsFor(engine.video.calls, made.runId, (c) => c.takeId),
      ['a2-shot-4-take-1', 'a2-shot-5-take-1'],
    )
    const manifest = renderManifestOf(engine, made.runId)
    assert.equal(manifest.shots.find((s) => s.shotId === 'shot-2')?.takeId, 'a1-shot-2-take-1')
  } finally {
    await engine.stop()
  }
})

// ---------------------------------------------------------------- 20

test('20. a run failed in the clips stage resumes at the first shot not finished: a kept narration is not spoken, a kept decided take is not made, a take the origin cut off is made again under the resumed runs attempt counting against no cap, and a shots next take is numbered from its kept decided takes', async () => {
  // Shot-1's first take is black: it fails Gate 2 and is decided. Its second is made, and its witness
  // is answered unavailable at each of three sends: cut off inside its gates, the run failed.
  const base = videoScript(THREE_RANKS, THREE_RANKS_PICS, {
    takes: [t0, retake(t1, 2), t2, t3, t4, t5],
  })
  const witness = [...(base.witness ?? [])]
  witness.splice(5, 0, BUSY, BUSY, BUSY)
  const engine = await startEngine({
    worker: true,
    video: { 'a1-shot-1-take-1': { black: 'whole' } },
    script: { ...base, witness },
  })
  try {
    const origin = await ranToTheEnd(engine, videoRequest('rf20'))
    assertFailed(
      engine,
      origin,
      'unavailable',
      /^the witness call was answered unavailable at each of its 3 sends, the last saying "the model answered 529"/,
    )
    assert.deepEqual(
      origin.takes.map((t) => [t.take_id, t.outcome]),
      [
        ['a1-shot-0-take-1', 'accept'],
        ['a1-shot-1-take-1', 'fail'],
        ['a1-shot-1-take-2', null],
      ],
    )
    assert.deepEqual(
      origin.narrations.map((n) => n.narration_id),
      ['a1-shot-0-narration', 'a1-shot-1-narration'],
    )

    const made = resumed(engine, origin.runId)
    const ran = await resumedRun(engine, made.runId)
    assert.equal(ran.result.status, 'completed', JSON.stringify(ran.result))

    assert.deepEqual(
      idsFor(engine.narration.calls, made.runId, (c) => c.narrationId),
      ['a2-shot-2-narration', 'a2-shot-3-narration', 'a2-shot-4-narration', 'a2-shot-5-narration'],
    )
    assert.deepEqual(
      idsFor(engine.video.calls, made.runId, (c) => c.takeId),
      [
        'a2-shot-1-take-2',
        'a2-shot-2-take-1',
        'a2-shot-3-take-1',
        'a2-shot-4-take-1',
        'a2-shot-5-take-1',
      ],
    )
    const rows = query<{
      take_id: string
      number: number
      attempt: number
      kept_from: string | null
    }>(
      engine,
      'SELECT take_id, number, attempt, kept_from FROM take WHERE run_id = ? ORDER BY rowid',
      made.runId,
    )
    assert.deepEqual(rows, [
      { take_id: 'a1-shot-0-take-1', number: 1, attempt: 1, kept_from: origin.runId },
      { take_id: 'a1-shot-1-take-1', number: 1, attempt: 1, kept_from: origin.runId },
      { take_id: 'a2-shot-1-take-2', number: 2, attempt: 2, kept_from: null },
      { take_id: 'a2-shot-2-take-1', number: 1, attempt: 2, kept_from: null },
      { take_id: 'a2-shot-3-take-1', number: 1, attempt: 2, kept_from: null },
      { take_id: 'a2-shot-4-take-1', number: 1, attempt: 2, kept_from: null },
      { take_id: 'a2-shot-5-take-1', number: 1, attempt: 2, kept_from: null },
    ])
    // Made again as the cut-off take was asked for — told the first take's reasons — under a new id.
    const cutOff = origin.videoReceipts.find((r) => r.take_id === 'a1-shot-1-take-2')
    const again2 = engine.video.calls.find((c) => c.takeId === 'a2-shot-1-take-2')
    assert.equal(again2?.prompt, cutOff?.prompt)
    assert.notEqual(again2?.seed, cutOff?.seed)
  } finally {
    await engine.stop()
  }
})

// ---------------------------------------------------------------- 21

test('21. a run failed in the plan stage by a provider fault resumes by planning again, keeping nothing and costing nothing: the resumed run writes its plan rows and stage.finished plan and completes, having used exactly the planner and scorer answers a first plan uses', async () => {
  const script = stillsScript(THREE_RANKS, THREE_RANKS_PICS)
  const engine = await startEngine({
    worker: true,
    script: { ...script, planner: [BUSY, BUSY, BUSY, ...(script.planner ?? [])] },
  })
  try {
    const origin = await ranToTheEnd(engine, stillsRequest('rf21'))
    assertFailed(
      engine,
      origin,
      'unavailable',
      /^the planner call was answered unavailable at each of its 3 sends, the last saying "the model answered 529"/,
    )
    assert.deepEqual(query(engine, 'SELECT role FROM plan WHERE run_id = ?', origin.runId), [])
    assert.deepEqual(origin.receipts, [])

    const made = resumed(engine, origin.runId)
    assert.deepEqual(made.plan, {
      start: 'plan',
      keep: { plans: [], pictures: [], narrations: [], takes: [] },
      named: [],
      remade: [],
      estimateCents: 0,
    })
    assert.equal(made.admission.estimateCents, 0)
    await waitFor(
      `run ${made.runId} to finish`,
      async () => (await engine.http.status(made.runId)).json.state === 'finished',
      VIDEO_FINISH_MS,
    )
    const ran = await readVideo(engine, made.runId)
    assert.equal(ran.result.status, 'completed', JSON.stringify(ran.result))
    assert.deepEqual(described(ran.events).slice(0, 6), [...PLANNED, 'stage.started stills'])
    assert.deepEqual(
      query<{ role: string; selected: number }>(
        engine,
        'SELECT role, selected FROM plan WHERE run_id = ? ORDER BY role',
        made.runId,
      ),
      [
        { role: 'a', selected: 0 },
        { role: 'b', selected: 1 },
      ],
    )
    // A first plan's calls: two planner answers, one for each plan of the fork, and no score, as
    // only one plan survives Gate 0 (D-113).
    assert.deepEqual(
      ran.receipts.filter((r) => r.role === 'planner').map((r) => r.call),
      ['structured', 'structured'],
    )
    assert.deepEqual(
      ran.jobs.map((j) => [j.kind, j.attempts, j.parent_id === null]),
      [
        ['reel.plan', 2, true],
        ['reel.keyframes', 1, false],
      ],
    )
  } finally {
    await engine.stop()
  }
})

// ---------------------------------------------------------------- 22

test('22. a shot held again in the resumed run from three kept failed takes is held with no call, and its four labels are written: its still_hold row under the resumed run, the reason on its third takes copy, each of its takes receipts marked degraded in whichever run holds it, and its degraded event', async () => {
  const engine = await startEngine({
    worker: true,
    video: {
      'shot-1-take-1': { black: 'whole' },
      'shot-1-take-2': { black: 'whole' },
      'shot-1-take-3': { black: 'whole' },
      'a1-shot-2-take-1': { transient: 3 },
    },
    script: videoScript(THREE_RANKS, THREE_RANKS_PICS, { takes: [t0, t2, t3, t4, t5] }),
  })
  try {
    const origin = await ranToTheEnd(engine, videoRequest('rf22'))
    assertFailed(
      engine,
      origin,
      'unavailable',
      /^the video call for a1-shot-2-take-1 was answered unavailable at each of its 3 sends/,
    )
    const [held] = origin.stillHolds
    assert.ok(held !== undefined, 'the origin did not hold shot-1')
    const shot1 = ['a1-shot-1-take-1', 'a1-shot-1-take-2', 'a1-shot-1-take-3']

    // The origin's own ending marked its receipts. Cleared here, so the resumed run's own writing is
    // what marks them again — in the run that holds them.
    const direct = new DatabaseSync(engine.dbPath)
    try {
      direct.prepare('UPDATE video_receipt SET degraded = 0 WHERE run_id = ?').run(origin.runId)
    } finally {
      direct.close()
    }

    const made = resumed(engine, origin.runId)
    const ran = await resumedRun(engine, made.runId)
    assert.equal(ran.result.status, 'completed', JSON.stringify(ran.result))

    assert.ok(
      !idsFor(engine.video.calls, made.runId, (c) => c.takeId).some((id) => id.includes('shot-1')),
    )
    assert.deepEqual(ran.stillHolds, [
      {
        shot_id: 'shot-1',
        attempt: 2,
        picture_id: 'a1-shot-1-single',
        probe: ran.stillHolds[0]?.probe,
        take_ids: shot1,
        reason: held.reason,
      },
    ])
    assert.equal(ran.stillHolds[0]?.probe.readable, true)
    assert.deepEqual(
      ran.takes.filter((t) => t.shot_unit === 1).map((t) => [t.take_id, t.degradation]),
      [
        ['a1-shot-1-take-1', null],
        ['a1-shot-1-take-2', null],
        ['a1-shot-1-take-3', held.reason],
      ],
    )
    assert.deepEqual(
      query<{ take_id: string; degraded: number }>(
        engine,
        'SELECT take_id, degraded FROM video_receipt WHERE run_id = ? ORDER BY id',
        origin.runId,
      ),
      [
        { take_id: 'a1-shot-0-take-1', degraded: 0 },
        ...shot1.map((take_id) => ({ take_id, degraded: 1 })),
      ],
    )
    const events = described(ran.events)
    const at = events.indexOf('degraded shot-1')
    assert.ok(at > 0, 'no degraded event for shot-1')
    assert.deepEqual(events.slice(at - 3, at), [
      'verdict 2 shot-1 fail',
      'verdict 2 shot-1 fail',
      'verdict 2 shot-1 fail',
    ])
  } finally {
    await engine.stop()
  }
})

// ---------------------------------------------------------------- 23

const KEPT_TAKE_CASES: ReadonlyArray<{ name: string; sql: string; detail: string }> = [
  {
    name: 'a kept take made from another picture than its shots chosen one',
    sql: "UPDATE take SET picture_id = 'a1-shot-0-b' WHERE run_id = ? AND take_id = 'a1-shot-0-take-1'",
    detail:
      "the kept take a1-shot-0-take-1 of shot-0 was made from a1-shot-0-b, not from its shot's chosen picture a1-shot-0-a (S-164)",
  },
  {
    name: 'a kept text-to-video take on a shot that has a chosen picture',
    sql: "UPDATE take SET mode = 'text-to-video', picture_id = NULL WHERE run_id = ? AND take_id = 'a1-shot-1-take-1'",
    detail:
      'the kept take a1-shot-1-take-1 of shot-1 was made from words, and its shot has the chosen picture a1-shot-1-single (S-164)',
  },
]

for (const kase of KEPT_TAKE_CASES) {
  test(`23. a kept take whose picture is not its shots chosen picture, or a text-to-video take on a shot that has one — rows a test writes by hand — is refused before any call with its detail pinned, its run failed engine, and no narration or video call made — ${kase.name}`, async () => {
    const engine = await startEngine({
      worker: false,
      video: { 'a1-shot-2-take-1': { transient: 3 } },
      script: videoScript(THREE_RANKS, THREE_RANKS_PICS, { takes: [t0, t1] }),
    })
    try {
      await engine.startWorker()
      const origin = await ranToTheEnd(engine, videoRequest('rf23'))
      assertFailed(
        engine,
        origin,
        'unavailable',
        /^the video call for a1-shot-2-take-1 was answered unavailable at each of its 3 sends/,
      )
      await engine.stopWorker()

      const made = resumed(engine, origin.runId)
      const direct = new DatabaseSync(engine.dbPath)
      try {
        assert.equal(Number(direct.prepare(kase.sql).run(made.runId).changes), 1)
      } finally {
        direct.close()
      }
      await engine.startWorker()
      const ran = await resumedRun(engine, made.runId)
      assertFailed(engine, ran, 'engine', kase.detail)
      assert.deepEqual(
        idsFor(engine.image.calls, made.runId, (c) => c.pictureId),
        [],
      )
      assert.deepEqual(
        idsFor(engine.narration.calls, made.runId, (c) => c.narrationId),
        [],
      )
      assert.deepEqual(
        idsFor(engine.video.calls, made.runId, (c) => c.takeId),
        [],
      )
    } finally {
      await engine.stop()
    }
  })
}

// ---------------------------------------------------------------- 24

test('24. the resumed runs result reports only its own spend and its render manifests ledger only its own receipts; the origins row, result, events and job rows are byte for byte what they were before the resume, but for its receipts degraded labels', async () => {
  const pictures = Object.fromEntries(THREE_RANKS_PICS.map((p) => [p.key, { costCents: 7 }]))
  const takes = Object.fromEntries(
    [0, 1, 2, 3, 4, 5].map((unit) => [`shot-${unit}-take-1`, { costCents: 5 }]),
  )
  const engine = await startEngine({
    worker: true,
    images: pictures,
    video: { ...takes, 'a1-shot-3-take-1': { transient: 3 } },
    script: videoScript(THREE_RANKS, THREE_RANKS_PICS),
  })
  try {
    const origin = await ranToTheEnd(engine, videoRequest('rf24'))
    assertFailed(
      engine,
      origin,
      'unavailable',
      /^the video call for a1-shot-3-take-1 was answered unavailable at each of its 3 sends/,
    )
    // Four pictures at 7 and three clips at 5.
    assert.equal(origin.result.costCents, 43)
    const snapshot = () => ({
      run: query(engine, 'SELECT * FROM run WHERE run_id = ?', origin.runId),
      events: query(engine, 'SELECT * FROM run_event WHERE run_id = ? ORDER BY seq', origin.runId),
      jobs: query(engine, 'SELECT * FROM job WHERE correlation_id = ? ORDER BY id', origin.runId),
      result: JSON.stringify(origin.result),
    })
    const before = snapshot()

    const made = resumed(engine, origin.runId)
    // Shot-3's narration was spoken before its clip failed: 3 seconds, asking for 5. Shots 4 and 5
    // ask the plan's 6 each.
    assert.equal(made.admission.estimateCents, 43 + (5 + 6 + 6) * 4)
    const ran = await resumedRun(engine, made.runId)
    assert.equal(ran.result.status, 'completed', JSON.stringify(ran.result))
    // Its own three clips at 5; the pictures and the first three clips are the origin's.
    assert.equal(ran.result.costCents, 15)
    assert.deepEqual(renderManifestOf(engine, made.runId).ledger, {
      imageCents: 0,
      narrationCents: 0,
      videoCents: 15,
    })

    const after = snapshot()
    after.result = JSON.stringify((await engine.http.result(origin.runId)).json)
    assert.deepEqual(after, before)
  } finally {
    await engine.stop()
  }
})

// ---------------------------------------------------------------- 25

/**
 * Four shots, each showing one subject no other shows: no picture is placed (D-027), and every shot
 * is made from words. With Gate 0's total bounds opened to 20 seconds, the planner's four five-second
 * shots survive and its six thirteen-second shots do not: a plan of 20 seconds, 80 cents at 4 a second.
 */
const FOUR: Shape = {
  subjects: [SEAL, BARONS, HALL, KING],
  shown: [['seal'], ['barons'], ['hall'], ['king']],
}

/** FOUR's takes: its units hold sentences 0–1, 2–3, 4–5 and 6–7, and the criteria they claim. */
const FOUR_TAKES: Take[] = [
  [SEAL, ['show-seal', 'show-pressing']],
  [BARONS, ['show-crowd']],
  [HALL, ['show-crowd']],
  [KING, ['show-law']],
].map(([subject, mustShow], unit) => ({
  key: `shot-${unit}-take-1`,
  unit,
  subjects: [subject as typeof SEAL],
  sentences: [],
  mustShow: mustShow as string[],
  mustNotShow: MUST_NOT_SHOW,
  unclaimed: UNCLAIMED,
}))

test('25. the guards compare the reels spend: with a ceiling of 100, an origin that spent 55 and a resume admitted at 75 for one five-second clip at 4c a second, scripted to cost its estimate, a first retake after a Gate 2 failure is made at 95 and a second is refused at 115 with limit ceiling, estimate 115, ceiling 100 and cap 300', async () => {
  const quick = { wordMs: 100, gapMs: 100 }
  const engine = await startEngine({
    worker: true,
    settings: { ...DEFAULT_PLAN_SETTINGS, totalSecondsBounds: [20, 45] },
    narration: Object.fromEntries([0, 1, 2, 3].map((unit) => [`shot-${unit}-narration`, quick])),
    video: {
      'a1-shot-0-take-1': { costCents: 15 },
      'a1-shot-1-take-1': { costCents: 20 },
      'a1-shot-2-take-1': { costCents: 20 },
      'a1-shot-3-take-1': { transient: 3 },
      'a2-shot-3-take-1': { black: 'whole', costCents: 20 },
      'a2-shot-3-take-2': { black: 'whole', costCents: 20 },
    },
    script: {
      planner: [
        { value: answer([5, 5, 5, 5], FOUR.subjects, FOUR.shown) },
        { value: bare(13, 13, 13, 13, 13, 13) },
      ],
      ...clipsScriptOf(FOUR_TAKES.slice(0, 3)),
    },
  })
  try {
    const origin = await ranToTheEnd(engine, videoRequest('rf25', 100))
    assertFailed(
      engine,
      origin,
      'unavailable',
      /^the video call for a1-shot-3-take-1 was answered unavailable at each of its 3 sends/,
    )
    assert.equal(origin.result.costCents, 55)

    const made = resumed(engine, origin.runId)
    assert.equal(made.plan.estimateCents, 20)
    assert.equal(made.admission.estimateCents, 75)
    const ran = await resumedRun(engine, made.runId)
    assert.deepEqual(ran.result, {
      contractVersion: 1,
      runId: made.runId,
      requestId: 'rf25',
      costCents: 40,
      status: 'stopped',
      reason: 'budget',
      limit: 'ceiling',
      estimateCents: 115,
      ceilingCents: 100,
      capCents: 300,
    })
    // Take 1 at 55 + 20 = 75, take 2 at 75 + 20 = 95, both made; take 3 at 95 + 20 = 115, refused.
    assert.deepEqual(
      idsFor(engine.video.calls, made.runId, (c) => c.takeId),
      ['a2-shot-3-take-1', 'a2-shot-3-take-2'],
    )
  } finally {
    await engine.stop()
  }
})

/** Each take's witness and reconciler answers, in the order made, each passing — and no cut. */
function clipsScriptOf(takes: readonly Take[]): FakeScript {
  const { witness, reconciler } = clipsScript(takes)
  return { witness, reconciler }
}
