import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { test } from 'node:test'
import { startApi } from '@cutroom/api'
import type { PlanSettings, ResumeRates } from '@cutroom/contracts'
import { DEFAULT_PLAN_SETTINGS, DEFAULT_RENDER_SETTINGS, planResume } from '@cutroom/pipeline'
import type { FakeAnswer, FakeScript } from '@cutroom/providers'
import {
  CONTRACT_VERSION,
  Piece,
  ResumeRequest,
  ResumeResponse,
  RunRecord,
  RunStatus,
  type SubmitRequest,
} from '@cutroom/reel-contract'
import { readSettings, startService as startInProcess } from '@cutroom/service'
import {
  closeDatabase,
  imageCallCount,
  openDatabase,
  readResumeInputs,
  resumeRun,
} from '../packages/domain/src/index.ts'
import {
  finished,
  startEngine,
  waitFor,
  type Engine,
  type EngineOptions,
} from './engine/harness.ts'
import { killedAgain, killedMidStills, takenUp } from './engine/restart.ts'
import { serviceFolder, startService } from './engine/service.ts'
import {
  CANONICAL_ONLY,
  HALL,
  KING,
  SEAL,
  THREE_RANKS,
  THREE_RANKS_PICS,
  again,
  inTurn,
  judged,
  passes,
  plannerFor,
  seen,
  showsPerson,
  stillsRequest,
  stillsScript,
  type Pic,
} from './engine/stills.ts'
import {
  clipsScript,
  cutAnswer,
  described,
  passesTake,
  readVideo,
  retake,
  seenClip,
  takesOf,
  video,
  videoFinished,
  videoRequest,
  videoScript,
  type Take,
  type Videoed,
} from './engine/video.ts'
import { client } from './stand-in/client.ts'

// resume-failed, Slice 4 — checks 26 to 34 (docs/features/resume-failed.md): the call. A caller
// resumes a failed run with `POST /v1/runs/:runId/resume` (reel-contract, version 1 amended): a
// preview says what would be made again and what it would cost, and writes nothing; a call makes
// the new run, or refuses it with the reason named. The API is handed the ResumeService
// `@cutroom/service` builds from the worker's own settings, cap file and questions file — here the
// harness's, through `resumeService`, and in check 34 the service's own, started as a process.
//
// The stand-in model answers each role's calls in call order ACROSS RUNS, so a script covers a
// failed run and its resume together: the failed run takes the answers it reached, and the resume
// the ones after. Every figure below is worked by hand.

const V = CONTRACT_VERSION

const [a, b, barons, hall] = THREE_RANKS_PICS as [Pic, Pic, Pic, Pic]
const takes = takesOf(THREE_RANKS)
const [t0, t1, t2] = takes as [Take, Take, Take]

const S = (shot: number): Piece => ({ kind: 'still', shot: `shot-${shot}` })
const N = (shot: number): Piece => ({ kind: 'narration', shot: `shot-${shot}` })
const C = (shot: number): Piece => ({ kind: 'clip', shot: `shot-${shot}` })

/** A model answer the provider was unavailable for: sent again, up to three sends (S-096). */
const BUSY: FakeAnswer = { throws: 'the model answered 529', as: 'unavailable' }

/** The worker's own rates in every harness engine here: the default plan's and render's. */
const RATES: ResumeRates = {
  imageRateCents: 15,
  videoRateCentsPerSecond: 4,
  narrationRateCentsPerCharacter: 0,
}

/** A BUDGET.md holding only the row the cap is read from, at `figure`. */
const budgetMd = (figure: string) =>
  `# Budget\n\n| Item | Cap |\n| --- | --- |\n| Per reel, all-in | **${figure}** |\n`

/** Rows as plain objects: node:sqlite's have no prototype, which a strict deep equality compares. */
const query = <T = Record<string, unknown>>(
  engine: Pick<Engine, 'query'>,
  sql: string,
  ...params: Array<string | number>
): T[] => engine.query<T>(sql, ...params).map((row) => ({ ...row }) as T)

/** Submits a request and waits for its run to finish, as long as a video run may take. */
async function ended(engine: Engine, request: SubmitRequest): Promise<Videoed> {
  const submitted = await engine.http.submit(request)
  assert.equal(submitted.status, 202, JSON.stringify(submitted.json))
  const runId = String(submitted.json.runId)
  await videoFinished(engine, runId)
  return readVideo(engine, runId)
}

/**
 * A run's ending pinned before the route is called on it: its result's status — and its detail, its
 * rule or its reason where given — and its row's `run.failure`, so a refusal is for the kind the table
 * names and never for a run that ended some other way (check 28).
 */
function pinned(
  engine: Pick<Engine, 'query'>,
  ran: { runId: string; result: Record<string, unknown> },
  want: { status: string; failure: string | null; detail?: string | RegExp; rule?: string },
): void {
  const { result } = ran
  assert.equal(result.status, want.status, JSON.stringify(result))
  if (typeof want.detail === 'string') assert.equal(result.detail, want.detail)
  if (want.detail instanceof RegExp) assert.match(String(result.detail), want.detail)
  if (want.rule !== undefined) assert.equal(result.rule, want.rule, JSON.stringify(result))
  const [row] = query<{ failure: string | null }>(
    engine,
    'SELECT failure FROM run WHERE run_id = ?',
    ran.runId,
  )
  assert.equal(row?.failure, want.failure, `run ${ran.runId}'s run.failure`)
}

/**
 * Every table's rows, read through a SECOND connection, and that connection's PRAGMA data_version —
 * which changes when any other connection commits a change to the file.
 */
function snapshot(db: DatabaseSync) {
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
    .all()
    .map((t) => String(t.name))
  const rows = Object.fromEntries(
    tables.map((t) => [
      t,
      db
        .prepare(`SELECT * FROM "${t}"`)
        .all()
        .map((r) => ({ ...r })),
    ]),
  )
  const version = Number(db.prepare('PRAGMA data_version').get()?.data_version)
  return { rows, version }
}

/** Every row of the tables a resume would write, counted: a refusal makes none. */
function counts(engine: Pick<Engine, 'query'>) {
  return Object.fromEntries(
    ['run', 'job', 'run_event', 'plan', 'picture', 'narration', 'take'].map((t) => [
      t,
      query<{ n: number }>(engine, `SELECT COUNT(*) AS n FROM ${t}`)[0]?.n,
    ]),
  )
}

/** The entries of a questions file, each from its `## ` heading. */
const entries = (path: string) =>
  existsSync(path)
    ? readFileSync(path, 'utf8')
        .split(/^(?=## )/m)
        .filter((chunk) => chunk.startsWith('## '))
    : []

/** A status's keys, sorted. */
const keysOf = (json: Record<string, unknown>) => Object.keys(json).sort()

/** The status keys of a run that resumes nothing and was resumed by none. */
const PLAIN_STATUS = ['contractVersion', 'lastSeq', 'requestId', 'runId', 'state']

// ---------------------------------------------------------------- 26

test("26. ResumeRequest and each arm of ResumeResponse carry contractVersion and Piece does not; each is strict; a Piece refuses a kind outside still, narration and clip and a shot not shaped shot-<n>; and RunStatus's resumes and resumedBy and the record's keptFrom are optional and absent on a run that resumes nothing", async () => {
  const ok = (schema: { safeParse(x: unknown): { success: boolean } }, x: unknown) =>
    schema.safeParse(x).success
  const without = (o: Record<string, unknown>, key: string) => {
    const copy = { ...o }
    delete copy[key]
    return copy
  }
  const figures = { estimateCents: 205, spentCents: 15, capCents: 300, ceilingCents: 230 }
  const requests: Array<Record<string, unknown>> = [
    { contractVersion: V },
    { contractVersion: V, remake: [S(0), { kind: 'clip' }], preview: true },
  ]
  const arms: Array<[string, Record<string, unknown>]> = [
    ['preview', { contractVersion: V, outcome: 'preview', runId: 'r', remake: [S(0)], ...figures }],
    [
      'preview over a limit',
      { contractVersion: V, outcome: 'preview', runId: 'r', remake: [], ...figures, limit: 'reel' },
    ],
    [
      'accepted',
      { contractVersion: V, outcome: 'accepted', runId: 'r2', resumes: 'r', replayed: false },
    ],
    ...(['not-resumable', 'resumed', 'version', 'invalid', 'unsupported'] as const).map(
      (reason): [string, Record<string, unknown>] => [
        `refused ${reason}`,
        { contractVersion: V, outcome: 'refused', runId: 'r', reason, detail: 'why' },
      ],
    ),
    [
      'refused budget',
      {
        contractVersion: V,
        outcome: 'refused',
        runId: 'r',
        reason: 'budget',
        limit: 'ceiling',
        ...figures,
      },
    ],
  ]
  const messages: Array<[string, { safeParse(x: unknown): { success: boolean } }, unknown]> = [
    ...requests.map((r, i): [string, typeof ResumeRequest, unknown] => [
      `ResumeRequest ${i}`,
      ResumeRequest,
      r,
    ]),
    ...arms.map(([name, arm]): [string, typeof ResumeResponse, unknown] => [
      `ResumeResponse ${name}`,
      ResumeResponse,
      arm,
    ]),
  ]
  for (const [name, schema, example] of messages) {
    const message = example as Record<string, unknown>
    assert.ok(ok(schema, message), `${name} rejected its own valid example`)
    assert.ok(!ok(schema, without(message, 'contractVersion')), `${name} needs no contractVersion`)
    assert.ok(!ok(schema, { ...message, contractVersion: 2 }), `${name} took another version`)
    assert.ok(!ok(schema, { ...message, sources: ['x'] }), `${name} accepted a field it lacks`)
  }
  // Each arm is strict as itself: no arm borrows another's field.
  assert.ok(!ok(ResumeResponse, { ...arms[2]?.[1], detail: 'why' }), 'accepted took a detail')
  assert.ok(!ok(ResumeResponse, without(arms[8]?.[1] ?? {}, 'limit')), 'budget had no limit')
  assert.ok(!ok(ResumeResponse, { ...arms[0]?.[1], limit: 'pocket' }), 'a limit outside two')
  assert.ok(!ok(ResumeRequest, { contractVersion: V, preview: false }), 'preview is true or absent')

  // A piece: nested, so no version; strict; three kinds; a shot named as the record names it.
  for (const piece of [{ kind: 'still' }, N(0), C(12), S(3)]) {
    assert.ok(ok(Piece, piece), JSON.stringify(piece))
  }
  assert.ok(!ok(Piece, { ...S(0), contractVersion: V }), 'a piece carried a version (D-106)')
  assert.ok(!ok(Piece, { ...S(0), sources: ['x'] }), 'a piece accepted a field it lacks')
  for (const kind of ['picture', 'take', 'cut', 'Still', '']) {
    assert.ok(!ok(Piece, { kind, shot: 'shot-0' }), `a piece of kind '${kind}'`)
  }
  for (const shot of [
    'shot-',
    'shot-x',
    'Shot-1',
    '1',
    'shot-1a',
    'shot-01',
    'shot--1',
    'shot-1.5',
    ' shot-1',
  ]) {
    assert.ok(!ok(Piece, { kind: 'still', shot }), `a piece on '${shot}'`)
  }

  // The pointers and keptFrom are optional: present they parse, absent they parse.
  const status = { contractVersion: V, runId: 'r', requestId: 'q', state: 'finished', lastSeq: 9 }
  assert.ok(ok(RunStatus, status))
  assert.ok(ok(RunStatus, { ...status, resumes: 'o' }))
  assert.ok(ok(RunStatus, { ...status, resumedBy: 'n' }))
  assert.ok(!ok(RunStatus, { ...status, resumes: '' }))
  const picture = { pictureId: 'p', shotId: 'shot-0', chosen: true, checks: [] }
  const take = { takeId: 't', shotId: 'shot-0', number: 1, used: true, checks: [] }
  const record = {
    contractVersion: V,
    runId: 'r',
    pictures: [picture],
    takes: [take],
    degradations: [],
  }
  assert.ok(ok(RunRecord, record))
  assert.ok(
    ok(RunRecord, {
      ...record,
      pictures: [{ ...picture, keptFrom: 'o' }],
      takes: [{ ...take, keptFrom: 'o' }],
    }),
  )
  assert.ok(!ok(RunRecord, { ...record, pictures: [{ ...picture, keptFrom: '' }] }))

  // Absent on a run that resumes nothing: its status, by id and by request, and every picture and
  // take of its record carry none of the three — not even as null.
  const engine = await startEngine({
    worker: true,
    script: videoScript(THREE_RANKS, THREE_RANKS_PICS),
  })
  try {
    const ran = await video(engine, videoRequest('rf26'))
    assert.equal(ran.result.status, 'completed', JSON.stringify(ran.result))
    assert.deepEqual(keysOf((await engine.http.status(ran.runId)).json), PLAIN_STATUS)
    assert.deepEqual(keysOf((await engine.http.lookup('rf26')).json), PLAIN_STATUS)
    const made = (await engine.http.record(ran.runId)).json as unknown as RunRecord
    assert.equal(made.pictures.length, 4)
    assert.equal(made.takes.length, 6)
    for (const entry of [...made.pictures, ...made.takes]) {
      assert.ok(!('keptFrom' in entry), `${JSON.stringify(entry)} carries keptFrom`)
    }
  } finally {
    await engine.stop()
  }
})

// ---------------------------------------------------------------- 27

/**
 * A video run failed in its stills stage: a (7¢) and b (8¢) decided, and the barons' picture
 * answered unavailable. What is kept is a and b; what the reel spent, 15¢.
 */
const FAILED_AT_BARONS: Omit<EngineOptions, 'worker'> = {
  images: {
    'shot-0-a': { costCents: 7 },
    'shot-0-b': { costCents: 8 },
    'shot-1-single': { throws: 'fal answered 503', as: 'unavailable' },
  },
}

test("27. the preview names every piece made again in shot order with estimateCents — what the reel spent plus the resume's estimate, the figure compared with the limit — what the reel spent, the cap and the ceiling, and the limit it would cross; and it writes nothing — every table's rows, read through a second connection, and that connection's PRAGMA data_version are unchanged", async () => {
  const engine = await startEngine({
    worker: true,
    ...FAILED_AT_BARONS,
    budgetMd: budgetMd('$3.00'),
    script: stillsScript(THREE_RANKS, [a, b]),
  })
  const second = new DatabaseSync(engine.dbPath)
  try {
    // The ceiling, 230, admits the plan's own 220: 4 pictures at 15 and 40 seconds at 4.
    const origin = await ended(engine, videoRequest('rf27', 230))
    pinned(engine, origin, {
      status: 'failed',
      failure: 'unavailable',
      detail: 'the provider is unavailable: fal answered 503',
    })
    await engine.stopWorker()
    const before = snapshot(second)

    // Nothing named: the barons' and the hall's pictures, 2 × 15, and every shot's clip from the
    // plan's seconds, 40 × 4 — 190 — on the 15 spent.
    const kept = await engine.http.resume(origin.runId, { preview: true })
    assert.equal(kept.status, 200, JSON.stringify(kept.json))
    assert.deepEqual(kept.json, {
      contractVersion: V,
      outcome: 'preview',
      runId: origin.runId,
      remake: [],
      estimateCents: 205,
      spentCents: 15,
      capCents: 300,
      ceilingCents: 230,
    })

    // The canonical's still and shot 4's narration, named out of order and twice: every piece they
    // take down, in shot order — four pictures, 60, and the same 160 of clips: 235, over 230.
    const named = await engine.http.resume(origin.runId, {
      preview: true,
      remake: [N(4), S(0), S(0)],
    })
    assert.equal(named.status, 200, JSON.stringify(named.json))
    assert.deepEqual(named.json, {
      contractVersion: V,
      outcome: 'preview',
      runId: origin.runId,
      remake: [S(0), C(0), S(1), C(1), S(2), C(2), N(4), C(4)],
      estimateCents: 235,
      spentCents: 15,
      capCents: 300,
      ceilingCents: 230,
      limit: 'ceiling',
    })

    // The cap, read at each call from the worker's file: at 200 the same 205 crosses it first.
    writeFileSync(engine.budgetPath as string, budgetMd('$2.00'))
    const capped = await engine.http.resume(origin.runId, { preview: true })
    assert.equal(capped.status, 200, JSON.stringify(capped.json))
    assert.deepEqual(capped.json, {
      contractVersion: V,
      outcome: 'preview',
      runId: origin.runId,
      remake: [],
      estimateCents: 205,
      spentCents: 15,
      capCents: 200,
      ceilingCents: 230,
      limit: 'reel',
    })

    const after = snapshot(second)
    assert.equal(after.version, before.version, 'a preview committed a change to the file')
    assert.deepEqual(after.rows, before.rows, 'a preview changed a row')
    assert.equal(existsSync(engine.questionsPath), false, 'a preview asked the owner')
  } finally {
    second.close()
    await engine.stop()
  }
})

// ---------------------------------------------------------------- 28

/** A stills run whose planner answers `planner` and nothing more: a plan-stage ending. */
const planOnly = (planner: readonly FakeAnswer[]): FakeScript => ({ planner: [...planner] })

/** THREE_RANKS' four pictures at 15 cents each, so the image guard compares a spend. */
const PAID = {
  'shot-0-a': { costCents: 15 },
  'shot-0-b': { costCents: 15 },
  'shot-0-repair': { costCents: 15 },
  'shot-1-single': { costCents: 15 },
  'shot-1-repair': { costCents: 15 },
  'shot-2-single': { costCents: 15 },
}

test("28. the route resumes once, with 202 and the new run, a failed run of each resumable kind — its caller's cancel flag set or not — and a run stopped at gate-7; the same call again, its pieces reordered or repeated, replays it, and so does its preview, writing nothing; a different list, a run the engine resumed, a resume, an off-spec, engine or unknown-kind failure, every other ending and a running run are refused with the reason named; an unknown run is 404; every run the route is called on has its run.failure and detail pinned before the call — each resumable run its kind, the off-spec run off-spec with the frame refusal's detail, the engine run engine, the unknown run null — so each refusal is for the kind the table names and never for a run that failed some other way", async () => {
  /** A 202 for a new run resuming `origin`, not replayed: the new run's id. */
  const accepted = async (engine: Engine, origin: string, remake: Piece[] = []) => {
    const reply = await engine.http.resume(origin, { remake })
    assert.equal(reply.status, 202, JSON.stringify(reply.json))
    assert.equal(reply.json.outcome, 'accepted')
    assert.equal(reply.json.resumes, origin)
    assert.equal(reply.json.replayed, false)
    assert.notEqual(reply.json.runId, origin)
    const made = String(reply.json.runId)
    const [row] = query<{ resumes: string; request_id: string }>(
      engine,
      'SELECT resumes, request_id FROM run WHERE run_id = ?',
      made,
    )
    assert.equal(row?.resumes, origin)
    return made
  }
  /** A 409 or 422 refusal of `origin`, its reason and detail. */
  const refused = async (
    engine: Engine,
    origin: string,
    status: number,
    reason: string,
    detail: RegExp,
    remake: Piece[] = [],
  ) => {
    const before = counts(engine)
    const reply = await engine.http.resume(origin, { remake })
    assert.equal(reply.status, status, JSON.stringify(reply.json))
    assert.equal(reply.json.outcome, 'refused')
    assert.equal(reply.json.runId, origin)
    assert.equal(reply.json.reason, reason, JSON.stringify(reply.json))
    assert.match(String(reply.json.detail), detail)
    assert.deepEqual(counts(engine), before, 'a refusal made a row')
  }

  // ---- the plan stage's endings, and every ending a stills run can have, on one engine in turn.
  const P = await startEngine({
    worker: true,
    images: PAID,
    script: inTurn(
      planOnly([BUSY, BUSY, BUSY]), // unavailable
      planOnly([BUSY, BUSY, BUSY]), // unavailable, its caller's cancel flag set after
      planOnly([{ throws: 'the planner answered nothing it could read', as: 'unanswered' }]),
      planOnly([{ throws: 'the planner job FAILED', as: 'provider-failed' }]),
      planOnly([{ throws: 'the planner fell over' }]), // engine
      planOnly([BUSY, BUSY, BUSY]), // unavailable, its kind unknown after
      planOnly([BUSY, BUSY, BUSY]), // unavailable, resumed by the engine after
      planOnly(plannerFor(THREE_RANKS) ?? []), // completed: a plan run
      planOnly(plannerFor(THREE_RANKS) ?? []), // refused at the ceiling
      // stopped at the ceiling: a, b, the barons failing and their repair, 60; the hall's 75 refused
      stillsScript(THREE_RANKS, [a, b, barons, again(barons, 'repair')], {
        reconciler: { [barons.key]: showsPerson(barons) },
      }),
      // stopped for rule gate-1: a, b and the canonical's repair all fail
      stillsScript(THREE_RANKS, [a, b, again(a, 'repair')], {
        reconciler: {
          [a.key]: showsPerson(a),
          [b.key]: showsPerson(b),
          'shot-0-repair': showsPerson(again(a, 'repair')),
        },
      }),
    ),
  })
  const S7 = await startEngine({
    worker: true,
    script: videoScript(THREE_RANKS, THREE_RANKS_PICS, { cut: cutAnswer([0]) }),
  })
  const O = await startEngine({
    worker: true,
    images: { 'shot-0-a': { throws: 'the picture is 1536x864, not 9:16', as: 'off-spec' } },
    script: stillsScript(THREE_RANKS, THREE_RANKS_PICS),
  })
  const K = await startEngine({ worker: false })
  try {
    const plan = (id: string) => ({
      ...stillsRequest(id),
      options: { until: 'plan' as const, budgetCents: 300 },
    })
    const unavailable = await ended(P, stillsRequest('rf28-unavailable'))
    const flagged = await ended(P, stillsRequest('rf28-flagged'))
    const unreadable = await ended(P, stillsRequest('rf28-unreadable'))
    const providerFailed = await ended(P, stillsRequest('rf28-provider-failed'))
    const engineFault = await ended(P, stillsRequest('rf28-engine'))
    const unknown = await ended(P, stillsRequest('rf28-unknown'))
    const byEngine = await ended(P, stillsRequest('rf28-by-engine'))
    const completed = await ended(P, plan('rf28-completed'))
    const refusedRun = await ended(P, stillsRequest('rf28-refused', 10))
    const stoppedBudget = await ended(P, stillsRequest('rf28-stopped-budget', 60))
    const stoppedRule = await ended(P, stillsRequest('rf28-stopped-rule'))
    await P.stopWorker()
    // Cancelled: asked while its plan job waits, then taken up.
    const cancelling = await P.http.submit(stillsRequest('rf28-cancelled'))
    const cancelledId = String(cancelling.json.runId)
    assert.equal((await P.http.cancel(cancelledId)).status, 200)
    await P.startWorker()
    await finished(P, cancelledId)
    const cancelled = await readVideo(P, cancelledId)
    await P.stopWorker()
    // Running: submitted to no worker.
    const waiting = await P.http.submit(stillsRequest('rf28-running'))
    const runningId = String(waiting.json.runId)

    // Written by hand, as nothing but a caller's flag and a run from before migration 0007 leave them.
    P.query('UPDATE run SET cancel_requested = 1 WHERE run_id = ?', flagged.runId)
    P.query('UPDATE run SET failure = NULL WHERE run_id = ?', unknown.runId)
    // The engine's own resume (Slice 5), made here by hand as the engine will: stored list null.
    const db = openDatabase(P.dbPath)
    let engineResume: string
    try {
      const planned = planResume(readResumeInputs(db, byEngine.runId), [], RATES, 'engine')
      assert.equal(planned.outcome, 'planned', JSON.stringify(planned))
      if (planned.outcome !== 'planned') return
      engineResume = db.transaction(
        (tx) =>
          resumeRun(tx, byEngine.runId, planned.plan, {
            now: new Date(),
            delayMs: 0,
            resumeRequest: null,
          }),
        { behavior: 'immediate' },
      )
    } finally {
      closeDatabase(db)
    }

    const planStage = /^the planner call was answered unavailable at each of its 3 sends/
    pinned(P, unavailable, { status: 'failed', failure: 'unavailable', detail: planStage })
    pinned(P, flagged, { status: 'failed', failure: 'unavailable', detail: planStage })
    pinned(P, unreadable, {
      status: 'failed',
      failure: 'unreadable',
      detail: 'the planner answered nothing it could read',
    })
    pinned(P, providerFailed, {
      status: 'failed',
      failure: 'provider-failed',
      detail: 'the planner job FAILED',
    })
    pinned(P, engineFault, { status: 'failed', failure: 'engine', detail: 'the planner fell over' })
    pinned(P, unknown, { status: 'failed', failure: null, detail: planStage })
    pinned(P, completed, { status: 'completed', failure: null })
    pinned(P, refusedRun, { status: 'refused', failure: null })
    pinned(P, stoppedBudget, { status: 'stopped', failure: null })
    assert.equal(stoppedBudget.result.reason, 'budget', JSON.stringify(stoppedBudget.result))
    pinned(P, stoppedRule, { status: 'stopped', failure: null, rule: 'gate-1' })
    pinned(P, cancelled, { status: 'cancelled', failure: null })
    assert.equal((await P.http.status(runningId)).json.state, 'running')

    // ---- each resumable kind, once; the caller's cancel flag is the engine's reason, not a caller's.
    const fromUnavailable = await accepted(P, unavailable.runId)
    await accepted(P, flagged.runId)
    await accepted(P, unreadable.runId)
    await accepted(P, providerFailed.runId)

    // The same call again replays it; so does its preview, and the preview writes nothing.
    const again1 = await P.http.resume(unavailable.runId, {})
    assert.equal(again1.status, 202, JSON.stringify(again1.json))
    assert.deepEqual(again1.json, {
      contractVersion: V,
      outcome: 'accepted',
      runId: fromUnavailable,
      resumes: unavailable.runId,
      replayed: true,
    })

    // ---- refused, each for its reason.
    await refused(P, byEngine.runId, 409, 'resumed', new RegExp(`by run ${engineResume}`))
    await refused(
      P,
      fromUnavailable,
      409,
      'not-resumable',
      new RegExp(`resumes run ${unavailable.runId}, and a resume is never resumed`),
    )
    await refused(P, engineFault.runId, 409, 'not-resumable', /ended failed engine, and only/)
    await refused(P, unknown.runId, 409, 'not-resumable', /ended failed before its kind was kept/)
    await refused(P, completed.runId, 409, 'not-resumable', /ended completed, and only/)
    await refused(P, refusedRun.runId, 409, 'not-resumable', /ended refused for budget, and only/)
    await refused(P, stoppedBudget.runId, 409, 'not-resumable', /ended stopped for budget, and/)
    await refused(P, stoppedRule.runId, 409, 'not-resumable', /ended stopped for rule gate-1, and/)
    await refused(P, cancelled.runId, 409, 'not-resumable', /ended cancelled, and only/)
    await refused(P, runningId, 409, 'not-resumable', /has not finished/)
    // A piece named on a run with no plan to name it by: the list is normalised first (S-161).
    await refused(P, engineFault.runId, 422, 'invalid', /has no selected plan/, [S(0)])

    const unknownRun = await P.http.resume('no-such-run', {})
    assert.equal(unknownRun.status, 404, JSON.stringify(unknownRun.json))
    assert.equal(unknownRun.json.error, 'not-found')

    // ---- off-spec: the frame refusal's kind, not resumed.
    const offSpec = await ended(O, stillsRequest('rf28-off-spec'))
    pinned(O, offSpec, {
      status: 'failed',
      failure: 'off-spec',
      detail: 'the picture is 1536x864, not 9:16 — and the call had already spent (S-142)',
    })
    await refused(O, offSpec.runId, 409, 'not-resumable', /ended failed off-spec, and only/)

    // ---- crashed: killed three times inside a picture's checks, as check 6 kills it.
    const first = await killedMidStills(K, stillsRequest('rf28-crashed'), {
      script: stillsScript(THREE_RANKS, [a, b]),
      holdAtCall: 7,
      made: ['a1-shot-0-a', 'a1-shot-0-b', 'a1-shot-1-single'],
    })
    const secondKill = await killedAgain(K, first, {
      script: {},
      holdAtCall: 1,
      made: ['a1-shot-0-a', 'a1-shot-0-b', 'a1-shot-1-single', 'a2-shot-1-single'],
    })
    const third = await killedAgain(K, secondKill, {
      script: {},
      holdAtCall: 1,
      made: [
        'a1-shot-0-a',
        'a1-shot-0-b',
        'a1-shot-1-single',
        'a2-shot-1-single',
        'a3-shot-1-single',
      ],
    })
    const crashed = await takenUp(K, third, stillsScript(THREE_RANKS, THREE_RANKS_PICS))
    await K.stopWorker()
    pinned(K, crashed, {
      status: 'failed',
      failure: 'crashed',
      detail:
        'attempt 4 cannot make its pictures within 6 image calls: the run made 5 before it and its placement makes 2 more, 7 in all (S-048)',
    })
    await accepted(K, crashed.runId)

    // ---- a stop at Gate 7: resumed with named pieces; replayed in another order, and by preview.
    const stopped = await ended(S7, videoRequest('rf28-gate-7'))
    pinned(S7, stopped, { status: 'stopped', failure: null, rule: 'gate-7' })
    await S7.stopWorker()
    const fromStop = await accepted(S7, stopped.runId, [C(1), S(2)])
    const replay = await S7.http.resume(stopped.runId, { remake: [S(2), C(1), C(1)] })
    assert.equal(replay.status, 202, JSON.stringify(replay.json))
    assert.deepEqual(replay.json, {
      contractVersion: V,
      outcome: 'accepted',
      runId: fromStop,
      resumes: stopped.runId,
      replayed: true,
    })
    const second = new DatabaseSync(S7.dbPath)
    try {
      const before = snapshot(second)
      const previewed = await S7.http.resume(stopped.runId, {
        preview: true,
        remake: [S(2), S(2), C(1)],
      })
      assert.equal(previewed.status, 202, JSON.stringify(previewed.json))
      assert.deepEqual(previewed.json, replay.json)
      const after = snapshot(second)
      assert.equal(after.version, before.version, 'the replayed preview committed a change')
      assert.deepEqual(after.rows, before.rows, 'the replayed preview changed a row')
    } finally {
      second.close()
    }
    // A different list: the one resume there is, named.
    await refused(S7, stopped.runId, 409, 'resumed', new RegExp(`by run ${fromStop}`), [C(1)])
  } finally {
    await P.stop()
    await S7.stop()
    await O.stop()
    await K.stop()
  }
})

// ---------------------------------------------------------------- 29

test('29. a resume over the cap or the ceiling is refused with the limit, estimateCents — the figure compared, spent plus estimate — what the reel spent and both limits, and no run, job or row is made; a run of the same request with budgetCents one higher, failed the same way, is resumed; and a call refused at the per-reel cap appends one question to the questions file the ResumeService was built with — its heading naming the failed run, asked by the caller, its named pieces, estimate, spend, cap, ceiling and rates — a preview none, a refusal at the ceiling none', async () => {
  // Every run fails at the barons' picture with a (40¢) and b (36¢) kept: 76 spent, and a resume of
  // 190 — the barons' and the hall's pictures, 30, and 40 seconds of clips at 4, 160 — so 266.
  const engine = await startEngine({
    worker: true,
    images: {
      'shot-0-a': { costCents: 40 },
      'shot-0-b': { costCents: 36 },
      'shot-1-single': { throws: 'fal answered 503', as: 'unavailable' },
    },
    budgetMd: budgetMd('$3.00'),
    script: inTurn(
      stillsScript(THREE_RANKS, [a, b]),
      stillsScript(THREE_RANKS, [a, b]),
      stillsScript(THREE_RANKS, [a, b]),
    ),
  })
  try {
    const request = videoRequest('rf29-ceiling', 265)
    const atCeiling = await ended(engine, request)
    const higher = await ended(engine, {
      ...request,
      requestId: 'rf29-higher',
      options: { ...request.options, budgetCents: 266 },
    })
    const atCap = await ended(engine, videoRequest('rf29-cap', 300))
    await engine.stopWorker()
    for (const ran of [atCeiling, higher, atCap]) {
      pinned(engine, ran, {
        status: 'failed',
        failure: 'unavailable',
        detail: 'the provider is unavailable: fal answered 503',
      })
    }

    // Over the ceiling by one cent: refused, every figure, nothing made and nothing asked.
    let before = counts(engine)
    const overCeiling = await engine.http.resume(atCeiling.runId, {})
    assert.equal(overCeiling.status, 409, JSON.stringify(overCeiling.json))
    assert.deepEqual(overCeiling.json, {
      contractVersion: V,
      outcome: 'refused',
      runId: atCeiling.runId,
      reason: 'budget',
      limit: 'ceiling',
      estimateCents: 266,
      spentCents: 76,
      capCents: 300,
      ceilingCents: 265,
    })
    assert.deepEqual(counts(engine), before, 'a refusal at the ceiling made a row')
    assert.deepEqual(entries(engine.questionsPath), [], 'a refusal at the ceiling asked the owner')

    // The same request one cent higher, failed the same way, is resumed: exactly equal is admitted.
    const resumed = await engine.http.resume(higher.runId, {})
    assert.equal(resumed.status, 202, JSON.stringify(resumed.json))
    assert.equal(resumed.json.resumes, higher.runId)

    // Over the cap: the cap written at 265, the ceiling 300.
    writeFileSync(engine.budgetPath as string, budgetMd('$2.65'))
    const preview = await engine.http.resume(atCap.runId, {
      preview: true,
      remake: [{ kind: 'narration' }],
    })
    assert.equal(preview.status, 200, JSON.stringify(preview.json))
    assert.equal(preview.json.limit, 'reel')
    assert.deepEqual(entries(engine.questionsPath), [], 'a preview asked the owner')
    before = counts(engine)
    const overCap = await engine.http.resume(atCap.runId, { remake: [{ kind: 'narration' }] })
    assert.equal(overCap.status, 409, JSON.stringify(overCap.json))
    assert.deepEqual(overCap.json, {
      contractVersion: V,
      outcome: 'refused',
      runId: atCap.runId,
      reason: 'budget',
      limit: 'reel',
      estimateCents: 266,
      spentCents: 76,
      capCents: 265,
      ceilingCents: 300,
    })
    assert.deepEqual(counts(engine), before, 'a refusal at the cap made a row')

    const asked = entries(engine.questionsPath)
    assert.equal(asked.length, 1, asked.join('\n'))
    const [entry] = asked as [string]
    const lines = entry.split('\n')
    assert.match(
      lines[0] as string,
      new RegExp(
        `^## \\d{4}-\\d{2}-\\d{2}T[\\d:.]+Z — run ${atCap.runId} not resumed: the resume would pass the per-reel cap$`,
      ),
    )
    for (const line of [
      '- **Request:** `rf29-cap`',
      '- **Asked by:** the caller',
      '- **Named:** narration shot-0, narration shot-1, narration shot-2, narration shot-3, narration shot-4, narration shot-5',
      "- **Estimate:** 266 cents, what the reel spent and the resume's own 190 cents",
      '- **Spent:** 76 cents over the whole reel',
      '- **Per-reel cap:** 265 cents, the `Per reel, all-in` row of BUDGET.md',
      "- **Ceiling:** 300 cents, the caller's",
      '- **Rates:** 15 cents an image, 4 cents a second of video, 0 cents a character of narration',
    ]) {
      assert.ok(lines.includes(line), `the question has no line ${line}:\n${entry}`)
    }
    assert.match(
      entry,
      /Should the cap or the rates change, or should the reel be asked for again as a new request\?/,
    )
  } finally {
    await engine.stop()
  }
})

// ---------------------------------------------------------------- 30

test("30. lookup by requestId and a replayed submit answer the newest run of the request; the failed run's status names the run that resumed it and the resume's names the failed run", async () => {
  const engine = await startEngine({ worker: true, script: planOnly([BUSY, BUSY, BUSY]) })
  try {
    const origin = await ended(engine, stillsRequest('rf30'))
    pinned(engine, origin, {
      status: 'failed',
      failure: 'unavailable',
      detail: /^the planner call was answered unavailable at each of its 3 sends/,
    })
    await engine.stopWorker()
    // Before the resume, the request's one run.
    assert.equal((await engine.http.lookup('rf30')).json.runId, origin.runId)

    const reply = await engine.http.resume(origin.runId, {})
    assert.equal(reply.status, 202, JSON.stringify(reply.json))
    const resumedId = String(reply.json.runId)

    const lookup = await engine.http.lookup('rf30')
    assert.equal(lookup.status, 200)
    assert.equal(lookup.json.runId, resumedId, 'lookup answered the failed run')
    assert.equal(lookup.json.resumes, origin.runId)
    assert.ok(!('resumedBy' in lookup.json))

    const replayed = await engine.http.submit(stillsRequest('rf30'))
    assert.equal(replayed.status, 202, JSON.stringify(replayed.json))
    assert.deepEqual(replayed.json, {
      contractVersion: V,
      outcome: 'accepted',
      requestId: 'rf30',
      runId: resumedId,
      replayed: true,
    })

    const failed = (await engine.http.status(origin.runId)).json
    assert.equal(failed.resumedBy, resumedId)
    assert.ok(!('resumes' in failed), 'the failed run resumes something')
    assert.deepEqual(keysOf(failed), [...PLAIN_STATUS, 'resumedBy'].sort())
    const resumedStatus = (await engine.http.status(resumedId)).json
    assert.equal(resumedStatus.resumes, origin.runId)
    assert.deepEqual(keysOf(resumedStatus), [...PLAIN_STATUS, 'resumes'].sort())
    // The failed run's row, result and events name no resume: the pointer is read, not stored.
    const [row] = query<{ result: string }>(
      engine,
      'SELECT result FROM run WHERE run_id = ?',
      origin.runId,
    )
    assert.ok(!String(row?.result).includes(resumedId))
  } finally {
    await engine.stop()
  }
})

// ---------------------------------------------------------------- 31

test('31. the record of a resumed run lists each kept picture and take with keptFrom the origin and each one it made without; used is true exactly for the takes its video shows, kept ones included', async () => {
  const engine = await startEngine({
    worker: true,
    script: inTurn(
      videoScript(THREE_RANKS, THREE_RANKS_PICS, { cut: cutAnswer([0]) }),
      clipsScript([t1]),
    ),
  })
  try {
    const origin = await ended(engine, videoRequest('rf31'))
    pinned(engine, origin, { status: 'stopped', failure: null, rule: 'gate-7' })
    const reply = await engine.http.resume(origin.runId, { remake: [C(1)] })
    assert.equal(reply.status, 202, JSON.stringify(reply.json))
    const resumedId = String(reply.json.runId)
    await videoFinished(engine, resumedId)
    const ran = await readVideo(engine, resumedId)
    assert.equal(ran.result.status, 'completed', JSON.stringify(ran.result))

    const record = (await engine.http.record(resumedId)).json as unknown as RunRecord
    assert.deepEqual(
      record.pictures.map((p) => [p.pictureId, p.keptFrom ?? null, p.chosen]),
      [
        ['a1-shot-0-a', origin.runId, true],
        ['a1-shot-0-b', origin.runId, false],
        ['a1-shot-1-single', origin.runId, true],
        ['a1-shot-2-single', origin.runId, true],
      ],
    )
    assert.deepEqual(
      record.takes.map((t) => [t.takeId, t.keptFrom ?? null, t.used]),
      [
        ['a1-shot-0-take-1', origin.runId, true],
        ['a1-shot-2-take-1', origin.runId, true],
        ['a1-shot-3-take-1', origin.runId, true],
        ['a1-shot-4-take-1', origin.runId, true],
        ['a1-shot-5-take-1', origin.runId, true],
        ['a2-shot-1-take-1', null, true],
      ],
    )
    // The failed run's record keeps its own pieces, the named clip's take among them, and names no
    // run: it used no take, having shown a caller no video.
    const failed = (await engine.http.record(origin.runId)).json as unknown as RunRecord
    assert.deepEqual(
      failed.takes.map((t) => [t.takeId, 'keptFrom' in t, t.used]),
      [0, 1, 2, 3, 4, 5].map((unit) => [`a1-shot-${unit}-take-1`, false, false]),
    )
    assert.ok(failed.pictures.every((p) => !('keptFrom' in p)))
  } finally {
    await engine.stop()
  }
})

// ---------------------------------------------------------------- 32

test("32. a resume after Gate 7's stop naming nothing makes the cut again and asks Gate 7 again with no image, narration or video call, using exactly one judge answer: the event verdict 7 accept, the run completed, its result's video the new cut", async () => {
  const engine = await startEngine({
    worker: true,
    script: inTurn(videoScript(THREE_RANKS, THREE_RANKS_PICS, { cut: cutAnswer([0]) }), {
      judge: [{ value: cutAnswer() }],
    }),
  })
  try {
    const origin = await ended(engine, videoRequest('rf32'))
    pinned(engine, origin, { status: 'stopped', failure: null, rule: 'gate-7' })
    const reply = await engine.http.resume(origin.runId, {})
    assert.equal(reply.status, 202, JSON.stringify(reply.json))
    const resumedId = String(reply.json.runId)
    await videoFinished(engine, resumedId)
    const ran = await readVideo(engine, resumedId)

    assert.equal(ran.result.status, 'completed', JSON.stringify(ran.result))
    const ours = <T extends { runId: string }>(calls: readonly T[]) =>
      calls.filter((c) => c.runId === resumedId)
    assert.deepEqual(ours(engine.image.calls), [], 'an image call')
    assert.deepEqual(ours(engine.narration.calls), [], 'a narration call')
    assert.deepEqual(ours(engine.video.calls), [], 'a video call')
    assert.deepEqual(
      ran.receipts.map((r) => [r.role, r.call]),
      [['judge', 'judgeCut']],
      'not exactly one judge answer',
    )
    const events = described(ran.events)
    assert.ok(events.includes('verdict 7 accept'), events.join('\n'))
    assert.equal(events.at(-1), 'run.finished completed')

    const [render] = query<{ render_id: string; path: string }>(
      engine,
      'SELECT render_id, path FROM render WHERE run_id = ?',
      resumedId,
    )
    assert.equal(render?.render_id, 'a2-render')
    assert.deepEqual(ran.result.video, { path: render?.path })
    const [old] = query<{ path: string }>(
      engine,
      'SELECT path FROM render WHERE run_id = ?',
      origin.runId,
    )
    assert.notEqual(render?.path, old?.path, 'the cut was not made again')
  } finally {
    await engine.stop()
  }
})

// ---------------------------------------------------------------- 33

const UP_TO_THREE: PlanSettings = { ...DEFAULT_PLAN_SETTINGS, pictures: 'upToThree' }

/** A picture of CANONICAL_ONLY under upToThree, by hand, as three-pictures' check 9 writes them. */
const pic = (unit: number, label: string, subjects: Pic['subjects'], mustShow: string[]): Pic => ({
  key: `shot-${unit}-${label}`,
  unit,
  label,
  subjects,
  mustShow,
  mustNotShow: ['never-person', 'never-flag'],
})
const CA = pic(0, 'a', [SEAL], ['show-seal'])
const CB = pic(0, 'b', [SEAL], ['show-seal'])
const SH = pic(1, 'single', [HALL], ['show-crowd'])
const SK = pic(3, 'single', [KING], ['show-crowd'])

/** The model's answers for pictures made in a resume, each passing unless `fail` names it. */
function picturesScript(pics: readonly Pic[], fail: readonly Pic[] = []): FakeScript {
  return {
    witness: pics.map((p) => ({ value: seen(p) })),
    reconciler: pics.map((p) => ({ value: fail.includes(p) ? showsPerson(p) : passes(p) })),
  }
}

/** The answers for takes made in a resume, each passing, then Gate 7's, every question yes. */
const takesThenCut = (made: readonly Take[]): FakeScript => ({
  witness: made.map((t) => ({ value: seenClip(t) })),
  reconciler: made.map((t) => ({ value: passesTake(t) })),
  judge: [{ value: cutAnswer() }],
})

test("33. naming a clip makes that shot's takes afresh, numbered from 1 under the resumed run's attempt with its three takes, and keeps every other shot's clip; naming the canonical's still makes it and every derived picture again, their old calls not counted; and a named derived shot gets the repairs the six still allow once the kept pictures are counted; and in an upToThree plan of a canonical and two standalones, each standalone repaired, stopped at gate-7, naming the canonical's still makes its two candidates with the reserve at 0 — both scripted to fail, the run stops for rule gate-1 with no repair call, no derived or standalone picture made, run.failure null and S-171's detail pinned; one scripted to pass, it is chosen and the run completes; and with one standalone unrepaired, so one slot is free, both failing, the repair is made", async () => {
  const imageIds = (engine: Engine, runId: string) =>
    engine.image.calls.filter((c) => c.runId === runId).map((c) => c.pictureId)
  const videoIds = (engine: Engine, runId: string) =>
    engine.video.calls.filter((c) => c.runId === runId).map((c) => c.takeId)
  /** Resumes `origin` naming `remake` through the route, and waits for the resumed run to end. */
  async function resumedThrough(engine: Engine, origin: string, remake: Piece[]) {
    const reply = await engine.http.resume(origin, { remake })
    assert.equal(reply.status, 202, JSON.stringify(reply.json))
    const runId = String(reply.json.runId)
    await videoFinished(engine, runId)
    return readVideo(engine, runId)
  }
  const stopAt7 = { cut: cutAnswer([0]) }

  // ---- a named clip: three takes of its own, numbered from 1; every other shot's clip kept.
  {
    const engine = await startEngine({
      worker: true,
      video: { 'a2-shot-1-take-1': { black: 'whole' }, 'a2-shot-1-take-2': { black: 'whole' } },
      script: inTurn(
        videoScript(THREE_RANKS, THREE_RANKS_PICS, stopAt7),
        takesThenCut([retake(t1, 3)]),
      ),
    })
    try {
      const origin = await ended(engine, videoRequest('rf33-clip'))
      pinned(engine, origin, { status: 'stopped', failure: null, rule: 'gate-7' })
      const ran = await resumedThrough(engine, origin.runId, [C(1)])
      assert.equal(ran.result.status, 'completed', JSON.stringify(ran.result))
      assert.deepEqual(videoIds(engine, ran.runId), [
        'a2-shot-1-take-1',
        'a2-shot-1-take-2',
        'a2-shot-1-take-3',
      ])
      const rows = query<{ take_id: string; number: number; kept_from: string | null }>(
        engine,
        'SELECT take_id, number, kept_from FROM take WHERE run_id = ? ORDER BY rowid',
        ran.runId,
      )
      assert.deepEqual(
        rows.map((t) => [t.take_id, t.number, t.kept_from === null ? 'made' : 'kept']),
        [
          ['a1-shot-0-take-1', 1, 'kept'],
          ['a1-shot-2-take-1', 1, 'kept'],
          ['a1-shot-3-take-1', 1, 'kept'],
          ['a1-shot-4-take-1', 1, 'kept'],
          ['a1-shot-5-take-1', 1, 'kept'],
          ['a2-shot-1-take-1', 1, 'made'],
          ['a2-shot-1-take-2', 2, 'made'],
          ['a2-shot-1-take-3', 3, 'made'],
        ],
      )
      assert.deepEqual(imageIds(engine, ran.runId), [])
    } finally {
      await engine.stop()
    }
  }

  // ---- the canonical's still: it and every derived picture made again, the old calls uncounted.
  {
    const engine = await startEngine({
      worker: true,
      script: inTurn(
        videoScript(THREE_RANKS, THREE_RANKS_PICS, stopAt7),
        picturesScript(THREE_RANKS_PICS),
        takesThenCut([t0, t1, t2]),
      ),
    })
    try {
      const origin = await ended(engine, videoRequest('rf33-canonical'))
      pinned(engine, origin, { status: 'stopped', failure: null, rule: 'gate-7' })
      const ran = await resumedThrough(engine, origin.runId, [S(0)])
      // Counted, the origin's four calls would leave 6 − 4 − 4 = −2, and fail before any call.
      assert.equal(ran.result.status, 'completed', JSON.stringify(ran.result))
      assert.deepEqual(imageIds(engine, ran.runId), [
        'a2-shot-0-a',
        'a2-shot-0-b',
        'a2-shot-1-single',
        'a2-shot-2-single',
      ])
      assert.deepEqual(videoIds(engine, ran.runId), [
        'a2-shot-0-take-1',
        'a2-shot-1-take-1',
        'a2-shot-2-take-1',
      ])
      const db = openDatabase(engine.dbPath)
      try {
        assert.equal(imageCallCount(db, ran.runId), 4, 'a call of the failed run was counted')
      } finally {
        closeDatabase(db)
      }
    } finally {
      await engine.stop()
    }
  }

  // ---- a named derived shot: the repairs the six allow once the four kept pictures are counted.
  // The failed run repaired the barons' picture: a, b, the barons' and its repair are kept, and the
  // hall's one first call leaves one slot. The hall's picture passes Gate 1 and fails Gate 1S twice:
  // its first repair takes the slot, and its second — which a shot's two repairs would allow — finds
  // none. Uncounted, the four copies would leave five slots and the second repair would be made.
  {
    const bRepair = again(barons, 'repair')
    const hRepair = again(hall, 'repair')
    const differs = judged([SEAL.name], [SEAL.name])
    const engine = await startEngine({
      worker: true,
      sensors: { 'a2-shot-2-single': { similarity: 0.5 }, 'a2-shot-2-repair': { similarity: 0.5 } },
      script: inTurn(
        videoScript(THREE_RANKS, [a, b, barons, bRepair, hall], {
          ...stopAt7,
          stills: { reconciler: { [barons.key]: showsPerson(barons) } },
        }),
        picturesScript([hall, hRepair]),
        { judge: [{ value: differs }, { value: differs }] },
        takesThenCut([t2]),
      ),
    })
    try {
      const origin = await ended(engine, videoRequest('rf33-derived'))
      pinned(engine, origin, { status: 'stopped', failure: null, rule: 'gate-7' })
      const ran = await resumedThrough(engine, origin.runId, [S(2)])
      assert.equal(ran.result.status, 'completed', JSON.stringify(ran.result))
      assert.deepEqual(imageIds(engine, ran.runId), ['a2-shot-2-single', 'a2-shot-2-repair'])
      const [degraded] = query<{ shot_id: string; gate: string; reason: string }>(
        engine,
        'SELECT shot_id, gate, reason FROM degradation WHERE run_id = ?',
        ran.runId,
      )
      assert.equal(degraded?.shot_id, 'shot-2')
      assert.equal(degraded?.gate, '1S')
      assert.match(String(degraded?.reason), /; no reserve slot is free \(D-050\)$/)
      const db = openDatabase(engine.dbPath)
      try {
        assert.equal(imageCallCount(db, ran.runId), 6)
      } finally {
        closeDatabase(db)
      }
    } finally {
      await engine.stop()
    }
  }

  // ---- S-171: an upToThree plan whose kept standalones and repairs hold the six but for the
  // canonical's two candidates.
  const HR = again(SH, 'repair')
  const KR = again(SK, 'repair')
  const repairedBoth = videoScript(CANONICAL_ONLY, [CA, CB, SH, HR, SK, KR], {
    ...stopAt7,
    takes: takesOf(CANONICAL_ONLY),
    stills: { reconciler: { [SH.key]: showsPerson(SH), [SK.key]: showsPerson(SK) } },
  })
  const why = (id: string) =>
    `${id} failed Gate 1 at reconcile: must never show "never-person" is shown: any real living person`
  {
    const engine = await startEngine({
      worker: true,
      settings: UP_TO_THREE,
      script: inTurn(repairedBoth, picturesScript([CA, CB], [CA, CB])),
    })
    try {
      const origin = await ended(engine, videoRequest('rf33-stop'))
      pinned(engine, origin, { status: 'stopped', failure: null, rule: 'gate-7' })
      const ran = await resumedThrough(engine, origin.runId, [S(0)])
      pinned(engine, ran, {
        status: 'stopped',
        failure: null,
        rule: 'gate-1',
        detail: `the canonical picture of shot-0 failed Gate 1 twice and no reserve slot is free for its repair: the run having made or kept 4 image calls before it and its placement making 2 more of the 6 (D-047, S-161, S-171). ${why('a2-shot-0-a')}. ${why('a2-shot-0-b')}`,
      })
      assert.deepEqual(imageIds(engine, ran.runId), ['a2-shot-0-a', 'a2-shot-0-b'])
      assert.deepEqual(videoIds(engine, ran.runId), [])
    } finally {
      await engine.stop()
    }
  }
  {
    const engine = await startEngine({
      worker: true,
      settings: UP_TO_THREE,
      script: inTurn(
        repairedBoth,
        picturesScript([CA, CB], [CA]),
        takesThenCut([takesOf(CANONICAL_ONLY)[0] as Take]),
      ),
    })
    try {
      const origin = await ended(engine, videoRequest('rf33-pass'))
      const ran = await resumedThrough(engine, origin.runId, [S(0)])
      assert.equal(ran.result.status, 'completed', JSON.stringify(ran.result))
      assert.deepEqual(imageIds(engine, ran.runId), ['a2-shot-0-a', 'a2-shot-0-b'])
      const stills = ran.result.stills as Array<{ shotId: string; pictureId: string }>
      assert.equal(stills.find((s) => s.shotId === 'shot-0')?.pictureId, 'a2-shot-0-b')
    } finally {
      await engine.stop()
    }
  }
  {
    const CR = again(CA, 'repair')
    const engine = await startEngine({
      worker: true,
      settings: UP_TO_THREE,
      script: inTurn(
        videoScript(CANONICAL_ONLY, [CA, CB, SH, HR, SK], {
          ...stopAt7,
          takes: takesOf(CANONICAL_ONLY),
          stills: { reconciler: { [SH.key]: showsPerson(SH) } },
        }),
        picturesScript([CA, CB, CR], [CA, CB, CR]),
      ),
    })
    try {
      const origin = await ended(engine, videoRequest('rf33-free'))
      pinned(engine, origin, { status: 'stopped', failure: null, rule: 'gate-7' })
      const ran = await resumedThrough(engine, origin.runId, [S(0)])
      // Three kept, two first calls: one slot, and the repair takes it.
      assert.deepEqual(imageIds(engine, ran.runId), [
        'a2-shot-0-a',
        'a2-shot-0-b',
        'a2-shot-0-repair',
      ])
      pinned(engine, ran, {
        status: 'stopped',
        failure: null,
        rule: 'gate-1',
        detail: /^the canonical picture of shot-0 failed Gate 1 three times \(D-047\)/,
      })
    } finally {
      await engine.stop()
    }
  }
})

// ---------------------------------------------------------------- 34

test("34. the service hands the API the ResumeService built from the worker's own settings, so the preview of a run stopped at gate-7 with a still named — a stop, which the service's own resume never takes, and a named piece, so the estimate is not 0 — gives estimateCents equal to the reel's spend plus planResume's estimate at those rates, and hands it the worker's budgetPath, so a preview's capCents equals a cap written to the file CUTROOM_BUDGET_PATH names; builds it with the worker's questionsPath, so a resume call of that run over a cap written low appends its one question to the file CUTROOM_QUESTIONS_PATH names; an API started without the service answers the route 422 unsupported", async () => {
  const dir = mkdtempSync(join(tmpdir(), 'rf34-'))
  const budgetPath = join(dir, 'BUDGET.md')
  writeFileSync(budgetPath, budgetMd('$2.90'))
  const service = await startService({
    standIn: {
      model: videoScript(THREE_RANKS, THREE_RANKS_PICS, { cut: cutAnswer([0]) }),
      images: { 'shot-0-a': { costCents: 7 } },
    },
    env: { CUTROOM_BUDGET_PATH: budgetPath },
  })
  try {
    try {
      const submitted = await service.http.submit(videoRequest('rf34'))
      assert.equal(submitted.status, 202, JSON.stringify(submitted.json))
      const runId = String(submitted.json.runId)
      await waitFor(
        `run ${runId} to finish`,
        async () => (await service.http.status(runId)).json.state === 'finished',
        90_000,
      )
      const result = (await service.http.result(runId)).json
      assert.equal(result.status, 'stopped', JSON.stringify(result))
      assert.equal(result.rule, 'gate-7')

      // What the worker prices with: the service's own settings, read from the same environment.
      const settings = readSettings(service.env)
      const rates: ResumeRates = {
        imageRateCents: settings.planSettings.imageRateCents,
        videoRateCentsPerSecond: settings.planSettings.videoRateCentsPerSecond,
        narrationRateCentsPerCharacter: settings.renderSettings.narrationRateCentsPerCharacter,
      }
      const db = openDatabase(service.dbPath)
      let expected: number
      let spent: number
      try {
        const inputs = readResumeInputs(db, runId)
        const planned = planResume(inputs, [S(2)], rates, 'caller')
        assert.equal(planned.outcome, 'planned', JSON.stringify(planned))
        if (planned.outcome !== 'planned') return
        assert.ok(planned.plan.estimateCents > 0, 'the estimate is 0, which would prove no rate')
        spent = inputs.spentCents
        expected = spent + planned.plan.estimateCents
      } finally {
        closeDatabase(db)
      }
      assert.equal(spent, 7, 'the reel spent what its one paid picture cost')

      const preview = await service.http.resume(runId, { preview: true, remake: [S(2)] })
      assert.equal(preview.status, 200, JSON.stringify(preview.json))
      assert.equal(preview.json.estimateCents, expected)
      assert.equal(preview.json.spentCents, 7)
      assert.equal(preview.json.capCents, 290, 'the cap is not the one CUTROOM_BUDGET_PATH names')

      // A cap written low: the call is refused at it, and asks where the worker asks.
      writeFileSync(budgetPath, budgetMd('$0.10'))
      const refusedCall = await service.http.resume(runId, { remake: [S(2)] })
      assert.equal(refusedCall.status, 409, JSON.stringify(refusedCall.json))
      assert.equal(refusedCall.json.limit, 'reel')
      assert.equal(refusedCall.json.capCents, 10)
      const asked = entries(service.questionsPath)
      assert.equal(asked.length, 1, asked.join('\n'))
      assert.match(
        asked[0] as string,
        new RegExp(`— run ${runId} not resumed: the resume would pass the per-reel cap`),
      )
    } finally {
      await service.stop()
    }

    // An API with no service: the route is known, the run is known, and it cannot yet.
    // `ready: () => true` is a compile-support amend for cutroom-sdk Slice 1 (S-173): the run
    // it queries has already finished and the engine's own worker has stopped, so readiness is
    // immaterial to what this test proves (a bare API's resume route is `422 unsupported`).
    const bare = await startApi({ dbPath: service.dbPath, ready: () => true })
    try {
      const [row] = query<{ run_id: string }>(service, 'SELECT run_id FROM run')
      const reply = await client(bare.baseUrl).resume(String(row?.run_id), {})
      assert.equal(reply.status, 422, JSON.stringify(reply.json))
      assert.equal(reply.json.outcome, 'refused')
      assert.equal(reply.json.reason, 'unsupported')
      assert.equal(reply.json.runId, row?.run_id)
    } finally {
      await bare.stop()
    }

    // The worker's OWN settings, not the pipeline's defaults. A service configured by its environment
    // alone, with stand-in ports, prices at the defaults (settings.ts leaves both plan rates as they
    // are for a stand-in, and the narration rate is the render default), so the child above cannot
    // tell the two apart. Here the composition root itself, `startService`, runs in this process,
    // handed the settings `readSettings` gives a fresh folder with all three rates moved off their
    // defaults — the settings its worker is built from — and a preview naming a still and a
    // narration, so every rate is in the estimate, must price at those rates.
    const own = serviceFolder({
      standIn: {
        model: videoScript(THREE_RANKS, THREE_RANKS_PICS, { cut: cutAnswer([0]) }),
        images: { 'shot-0-a': { costCents: 7 } },
      },
      env: { CUTROOM_BUDGET_PATH: budgetPath },
    })
    writeFileSync(budgetPath, budgetMd('$2.90'))
    const read = readSettings(own.env)
    const moved: ResumeRates = {
      imageRateCents: 11,
      videoRateCentsPerSecond: 3,
      narrationRateCentsPerCharacter: 1,
    }
    const defaults: ResumeRates = {
      imageRateCents: DEFAULT_PLAN_SETTINGS.imageRateCents,
      videoRateCentsPerSecond: DEFAULT_PLAN_SETTINGS.videoRateCentsPerSecond,
      narrationRateCentsPerCharacter: DEFAULT_RENDER_SETTINGS.narrationRateCentsPerCharacter,
    }
    // A stand-in service reads the defaults; each of the three is moved off them here.
    assert.deepEqual(
      {
        imageRateCents: read.planSettings.imageRateCents,
        videoRateCentsPerSecond: read.planSettings.videoRateCentsPerSecond,
        narrationRateCentsPerCharacter: read.renderSettings.narrationRateCentsPerCharacter,
      },
      defaults,
    )
    for (const key of Object.keys(moved) as Array<keyof ResumeRates>) {
      assert.notEqual(moved[key], defaults[key], `${key} was not moved off its default`)
    }
    const inProcess = await startInProcess({
      ...read,
      planSettings: {
        ...read.planSettings,
        imageRateCents: moved.imageRateCents,
        videoRateCentsPerSecond: moved.videoRateCentsPerSecond,
      },
      renderSettings: {
        ...read.renderSettings,
        narrationRateCentsPerCharacter: moved.narrationRateCentsPerCharacter,
      },
    })
    try {
      const http = client(inProcess.baseUrl)
      const submitted = await http.submit(videoRequest('rf34-own'))
      assert.equal(submitted.status, 202, JSON.stringify(submitted.json))
      const runId = String(submitted.json.runId)
      await waitFor(
        `run ${runId} to finish`,
        async () => (await http.status(runId)).json.state === 'finished',
        90_000,
      )
      const result = (await http.result(runId)).json
      assert.equal(result.status, 'stopped', JSON.stringify(result))
      assert.equal(result.rule, 'gate-7')

      const named = [S(2), N(4)]
      const db = openDatabase(own.dbPath)
      let atMoved: number
      let atDefaults: number
      let spent: number
      try {
        const inputs = readResumeInputs(db, runId)
        const priced = (rates: ResumeRates) => {
          const planned = planResume(inputs, named, rates, 'caller')
          assert.equal(planned.outcome, 'planned', JSON.stringify(planned))
          return planned.outcome === 'planned' ? planned.plan.estimateCents : Number.NaN
        }
        spent = inputs.spentCents
        atMoved = spent + priced(moved)
        atDefaults = spent + priced(defaults)
      } finally {
        closeDatabase(db)
      }
      assert.equal(spent, 7, 'the reel spent what its one paid picture cost')
      // The two figures differ, so the preview's can tell which rates it was priced at.
      assert.notEqual(atMoved, atDefaults, `both rates give ${atMoved}`)

      const preview = await http.resume(runId, { preview: true, remake: named })
      assert.equal(preview.status, 200, JSON.stringify(preview.json))
      assert.equal(
        preview.json.estimateCents,
        atMoved,
        `priced at ${String(preview.json.estimateCents)}: the pipeline's defaults give ${atDefaults}, the worker's own ${atMoved}`,
      )
      assert.equal(preview.json.spentCents, 7)
      assert.equal(preview.json.capCents, 290)
    } finally {
      await inProcess.stop()
      rmSync(own.dir, { recursive: true, force: true })
    }
  } finally {
    service.clean()
    rmSync(dir, { recursive: true, force: true })
  }
})
