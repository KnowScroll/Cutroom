import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { DEFAULT_PLAN_SETTINGS } from '@cutroom/pipeline'
import type { FakeScript } from '@cutroom/providers'
import type { SubmitRequest } from '@cutroom/reel-contract'
import { REPO } from './_repo.ts'
import { run, startEngine, type Engine, type Ran } from './engine/harness.ts'
import {
  answer,
  answerA,
  answers,
  bare,
  evenAnswer,
  planRequest,
  shortRequest,
} from './engine/plans.ts'

// reel-stills, Slice 2 — checks 9, 10 and 11 (docs/features/reel-stills.md): admission at the end
// of the plan job. A `stills` run is admitted against the caller's ceiling by THE PICTURES' FIGURE
// ALONE — the selected plan's planned image calls × the image rate (S-030, S-035) — and an
// admitted run gets a second job row, `reel.keyframes`, chained to the plan job (D-081, D-083).
// A run that selects no plan never reaches admission and ends exactly as reel-plan's does (S-025).

const S = DEFAULT_PLAN_SETTINGS

const types = (ran: Ran) =>
  ran.events.map((e) => (e.type === 'verdict' ? `verdict ${String(e.outcome)}` : e.type))

/** Every file the engine left in its folder, apart from the database and its journal files. */
function written(engine: Engine): string[] {
  return readdirSync(engine.dir).filter((f) => !/^engine\.sqlite(-wal|-shm|-journal)?$/.test(f))
}

/** The repository's own questions file, as it is now — absent, or its text. */
const repoQuestions = () => {
  const path = join(REPO, 'QUESTIONS.md')
  return existsSync(path) ? readFileSync(path, 'utf8') : null
}

/** The entries of a questions file: each begins with a second-level heading. */
const entries = (text: string) => text.split(/^(?=## )/m).filter((c) => c.startsWith('## '))

interface JobRow {
  id: number
  kind: string
  correlation_id: string
  parent_id: number | null
  state: string
  cost_cents: number
}

const jobsOf = (engine: Engine) =>
  engine.query<JobRow>(
    'SELECT id, kind, correlation_id, parent_id, state, cost_cents FROM job ORDER BY id',
  )

/** `planRequest`'s eight sentences, asking for pictures under `budgetCents`. */
function stillsRequest(requestId: string, budgetCents: number): SubmitRequest {
  return { ...planRequest(requestId), options: { until: 'stills', budgetCents } }
}

/**
 * Two plans whose PLANNED IMAGE CALLS DIFFER, so the pictures' figure names which plan was
 * selected and cannot be confused with the other's. The 4-unit plan shows three subjects, two of
 * them in two shots or more — 3 calls, 205 cents. The 6-unit plan shows one subject in three
 * shots — 2 calls, 190 cents. The 6-unit plan answers every question yes and the 4-unit plan one
 * no, so the 6-unit plan is selected: 2 x 15 = 30 cents of pictures inside a 190-cent reel.
 */
const oneSubjectB = () =>
  answer(
    [7, 7, 7, 7, 6, 6],
    [{ id: 'seal', name: 'a wax seal' }],
    [['seal'], ['seal'], [], [], ['seal'], []],
  )

const forkOfTwo = (): FakeScript => ({
  planner: [{ value: answerA() }, { value: oneSubjectB() }],
  reconciler: [
    { value: answers('yes', 'yes', 'no', 'yes') },
    { value: answers('yes', 'yes', 'yes', 'yes') },
  ],
})

/** The same script `times` over, for an engine that runs more than one request. */
function repeated(times: number): FakeScript {
  const planner = []
  const reconciler = []
  for (let i = 0; i < times; i += 1) {
    const script = forkOfTwo()
    planner.push(...(script.planner ?? []))
    reconciler.push(...(script.reconciler ?? []))
  }
  return { planner, reconciler }
}

/** What the selected plan's pictures cost: 2 planned image calls at the default 15 cents. */
const PICTURES = 2 * S.imageRateCents
/** What the whole reel would cost: the same plan's estimate, video included. */
const WHOLE = 190

// ---------------------------------------------------------------- 9

test("9. a stills run whose chosen plan's pictures cost more than its ceiling finishes refused for budget with limit 'ceiling', the pictures' figure as estimateCents, the ceiling and the cap; its events end stage.finished for plan, run.finished, with no stills event; it writes no question and leaves one job row", async () => {
  const before = repoQuestions()
  const engine = await startEngine({ worker: true, script: forkOfTwo() })
  try {
    const ran = await run(engine, stillsRequest('r9', PICTURES - 1))
    assert.deepEqual(ran.result, {
      contractVersion: 1,
      runId: ran.runId,
      requestId: 'r9',
      costCents: 0,
      status: 'refused',
      reason: 'budget',
      limit: 'ceiling',
      estimateCents: PICTURES,
      ceilingCents: PICTURES - 1,
      capCents: 300,
    })

    // The figure is the SELECTED plan's pictures and nothing else: not the other plan's 3 calls,
    // not the reserve's six, and not the whole reel.
    assert.equal(ran.result.estimateCents, 30)
    assert.notEqual(ran.result.estimateCents, WHOLE)
    const selected = ran.plans.find((p) => p.selected)
    assert.equal(selected?.role, 'b', 'the fixture no longer selects the 6-unit plan')
    assert.equal(selected?.estimateCents, WHOLE)

    // The stage produced a plan, so it has stage.finished — and the run stops there (S-025, S-046).
    assert.deepEqual(types(ran), [
      'run.accepted',
      'stage.started',
      'verdict accept',
      'verdict accept',
      'stage.finished',
      'run.finished',
    ])
    assert.deepEqual(
      ran.events.filter((e) => e.stage === 'stills'),
      [],
      'a stills stage event for a run refused before any picture',
    )
    assert.deepEqual(
      ran.events.filter((e) => e.type === 'stage.finished').map((e) => e.stage),
      ['plan'],
    )

    // No second job row (D-083), and no question: the caller's ceiling is not the engine's cap
    // (D-100).
    assert.deepEqual(
      jobsOf(engine).map((j) => ({
        kind: j.kind,
        correlation_id: j.correlation_id,
        state: j.state,
      })),
      [{ kind: 'reel.plan', correlation_id: ran.runId, state: 'done' }],
    )
    assert.deepEqual(written(engine), [], 'a question, or another file, was written')
  } finally {
    await engine.stop()
  }
  assert.equal(repoQuestions(), before, "the repository's own questions file was written")
})

// ---------------------------------------------------------------- 10

test('10. a stills run whose pictures fit its ceiling while its whole estimate does not is admitted, with a second job row of kind reel.keyframes, the runs correlation_id and the plan job as parent; a ceiling of exactly planned calls x rate is admitted and one cent less is refused', async () => {
  const engine = await startEngine({ worker: true, script: repeated(3) })
  try {
    // A ceiling the pictures fit and the reel does not: 30 <= 100 < 190.
    assert.ok(PICTURES < 100 && 100 < WHOLE, 'the fixture no longer separates the two figures')
    const roomy = await run(engine, stillsRequest('r10-roomy', 100))

    const rows = jobsOf(engine).filter((j) => j.correlation_id === roomy.runId)
    assert.equal(rows.length, 2, `the admitted run has ${rows.length} job rows, not two`)
    const [planJob, keyframes] = rows as [JobRow, JobRow]
    assert.equal(planJob.kind, 'reel.plan')
    assert.equal(planJob.state, 'done')
    assert.equal(planJob.cost_cents, 0, 'the plan job was completed at a cost')
    assert.equal(keyframes.kind, 'reel.keyframes')
    assert.equal(keyframes.correlation_id, roomy.runId, 'D-081: the chain shares the run id')
    assert.equal(keyframes.parent_id, planJob.id, 'D-081: the plan job is the parent')

    // Admitted means the plan stage finished and the run was NOT refused there. Gate 2 puts the
    // plan rows in the SAME transaction as the keyframes row, so an admitted run keeps the plan it
    // was admitted on: without them the chain would go on with no record of what it is making.
    assert.deepEqual(
      roomy.events.filter((e) => e.type === 'stage.finished').map((e) => e.stage),
      ['plan'],
    )
    assert.notEqual(roomy.result.reason, 'budget', JSON.stringify(roomy.result))
    assert.deepEqual(
      roomy.plans.map((p) => [p.role, p.estimateCents, p.selected]),
      [
        ['a', 205, false],
        ['b', WHOLE, true],
      ],
      'an admitted run did not keep the plans it was admitted on',
    )

    // Exactly the pictures' figure is admitted; one cent less is refused. This is the pair that
    // catches a figure carrying the reserve, or the whole reel's estimate.
    const exact = await run(engine, stillsRequest('r10-exact', PICTURES))
    assert.equal(
      jobsOf(engine).filter((j) => j.correlation_id === exact.runId && j.kind === 'reel.keyframes')
        .length,
      1,
      `a ceiling of exactly ${PICTURES} cents was not admitted: ${JSON.stringify(exact.result)}`,
    )
    assert.notEqual(exact.result.reason, 'budget', JSON.stringify(exact.result))

    const short = await run(engine, stillsRequest('r10-short', PICTURES - 1))
    assert.deepEqual(short.result, {
      contractVersion: 1,
      runId: short.runId,
      requestId: 'r10-short',
      costCents: 0,
      status: 'refused',
      reason: 'budget',
      limit: 'ceiling',
      estimateCents: PICTURES,
      ceilingCents: PICTURES - 1,
      capCents: 300,
    })
    assert.deepEqual(
      jobsOf(engine)
        .filter((j) => j.correlation_id === short.runId)
        .map((j) => j.kind),
      ['reel.plan'],
      'a refused run was given a keyframes row',
    )
  } finally {
    await engine.stop()
  }
})

// ---------------------------------------------------------------- 11

/** A `stills` run and a `plan` run of the same request end the same way when no plan is selected. */
async function endsAsPlanDoes(
  engine: Engine,
  request: SubmitRequest,
  budgetCents: number,
): Promise<{ stills: Ran; plan: Ran }> {
  const stills = await run(engine, {
    ...request,
    requestId: `${request.requestId}-stills`,
    options: { until: 'stills', budgetCents },
  })
  const plan = await run(engine, {
    ...request,
    requestId: `${request.requestId}-plan`,
    options: { until: 'plan', budgetCents },
  })
  const withoutIds = (ran: Ran) => ({ ...ran.result, runId: '', requestId: '' })
  assert.deepEqual(
    withoutIds(stills),
    withoutIds(plan),
    'a stills run ended differently from a plan run',
  )
  assert.deepEqual(types(stills), types(plan), 'a stills run emitted different events')
  assert.deepEqual(
    stills.plans.map((p) => [p.role, p.estimateCents, p.verdict.failed, p.selected]),
    plan.plans.map((p) => [p.role, p.estimateCents, p.verdict.failed, p.selected]),
  )
  assert.deepEqual(
    jobsOf(engine)
      .filter((j) => j.correlation_id === stills.runId)
      .map((j) => j.kind),
    ['reel.plan'],
    'a stills run that selected no plan was given a reel.keyframes row',
  )
  return { stills, plan }
}

test("11. a stills run in which no plan is selected — every plan over the per-reel cap, a gate-0 stop, a split stop — ends as reel-plan's run does, with S-025's events and, for the cap, one question, and has no reel.keyframes row", async () => {
  const repoBefore = repoQuestions()

  // Every plan over the per-reel cap. At 10 cents a second of video: 445, 360 and a 430 repair,
  // all above the pinned 300 — reel-plan's check 41, asked for pictures.
  const script = () => [
    { value: answerA() },
    { value: bare(6, 6, 6, 6, 6, 6) },
    { value: evenAnswer(6) },
  ]
  const capped = await startEngine({
    worker: true,
    settings: { ...S, videoRateCentsPerSecond: 10 },
    script: { planner: [...script(), ...script()] },
  })
  try {
    assert.equal(existsSync(capped.questionsPath), false)
    const { stills } = await endsAsPlanDoes(capped, planRequest('r11-cap'), 250)
    assert.deepEqual(
      { ...stills.result, runId: '', requestId: '' },
      {
        contractVersion: 1,
        runId: '',
        requestId: '',
        costCents: 0,
        status: 'refused',
        reason: 'budget',
        limit: 'reel',
        estimateCents: 360,
        ceilingCents: 250,
        capCents: 300,
      },
    )
    assert.deepEqual(types(stills), [
      'run.accepted',
      'stage.started',
      'verdict fail',
      'verdict fail',
      'verdict fail',
      'run.finished',
    ])

    // The engine's own cap fired, so the owner is asked — once for the stills run, and once for
    // the plan run beside it (D-100, S-026).
    assert.deepEqual(written(capped), ['QUESTIONS.md'])
    const asked = entries(readFileSync(capped.questionsPath, 'utf8'))
    assert.equal(asked.length, 2, `${asked.length} entries for two refusals`)
    const mine = asked.filter((e) => e.includes(stills.runId))
    assert.equal(mine.length, 1, 'the stills refusal did not append exactly one entry')
    assert.ok(mine[0]?.includes('r11-cap-stills'), 'the entry does not name the request')
  } finally {
    await capped.stop()
  }

  // A gate-0 stop: every plan fails on shape, so not every plan failed on cost — reel-plan's 42.
  const stopped = await startEngine({
    worker: true,
    script: {
      planner: [
        { value: bare(13, 13, 12, 12) },
        { value: bare(9, 9, 8, 8, 8, 8) },
        { value: bare(4, 12, 12, 12) },
        { value: bare(13, 13, 12, 12) },
        { value: bare(9, 9, 8, 8, 8, 8) },
        { value: bare(4, 12, 12, 12) },
      ],
    },
  })
  try {
    const { stills } = await endsAsPlanDoes(stopped, planRequest('r11-gate0'), 300)
    assert.equal(stills.result.status, 'stopped')
    assert.equal(stills.result.reason, 'rule')
    assert.equal(stills.result.rule, 'gate-0')
    assert.equal(stills.result.step, 'plan')
    assert.deepEqual(types(stills), [
      'run.accepted',
      'stage.started',
      'verdict fail',
      'verdict fail',
      'verdict fail',
      'run.finished',
    ])
    assert.deepEqual(written(stopped), [], 'a rule stop wrote a question')
  } finally {
    await stopped.stop()
  }

  // A split stop: five sentences cannot be cut into six units, so no plan is ever asked for.
  const split = await startEngine({ worker: true, script: {} })
  try {
    const { stills } = await endsAsPlanDoes(split, shortRequest('r11-split', 5), 300)
    assert.equal(stills.result.status, 'stopped')
    assert.equal(stills.result.rule, 'split')
    assert.equal(stills.result.step, 'plan')
    assert.deepEqual(types(stills), ['run.accepted', 'stage.started', 'run.finished'])
    assert.deepEqual(stills.plans, [])
    assert.equal(
      split.model.calls.length,
      0,
      'a model was asked for a narration that cannot be split',
    )
    assert.deepEqual(written(split), [], 'a rule stop wrote a question')
  } finally {
    await split.stop()
  }

  assert.equal(repoQuestions(), repoBefore, "the repository's own questions file was written")
})
