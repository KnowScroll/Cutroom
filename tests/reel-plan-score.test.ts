import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Plan, PlanSettings } from '@cutroom/contracts'
import { DEFAULT_PLAN_SETTINGS, planReel, scorePlan, type PlanOutcome } from '@cutroom/pipeline'
import type { FakeScript } from '@cutroom/providers'
import type { SubmitRequest } from '@cutroom/reel-contract'
import { finished, startEngine } from './engine/harness.ts'
import {
  answers,
  oneSurvivor,
  passingPlan,
  planRequest,
  standIn,
  twoSurvivors,
  type YesNo,
} from './engine/plans.ts'
import { throwStatements } from './engine/source.ts'

// reel-plan, Slice 3 — the plan score and the receipts (docs/features/reel-plan.md, checks 34–37):
// computed only for two survivors, one plan per reconciler call, and no path that rejects (D-064,
// D-113, I-16); every call that returned leaves a model_receipt (D-005, D-084).

const S = DEFAULT_PLAN_SETTINGS
const CAP = 300

type Selected = Extract<PlanOutcome, { kind: 'selected' }>

async function plan(script: FakeScript, settings: PlanSettings = S) {
  const model = standIn(script)
  const outcome = await planReel(planRequest('score'), model, CAP, settings)
  assert.equal(outcome.kind, 'selected', JSON.stringify(outcome))
  return { outcome: outcome as Selected, model }
}

// ---------------------------------------------------------------- 34

test('34. the plan score is computed only when both plans survive Gate 0, each plan in its own call, role reconciler, temperature 0, never two plans in one request', async () => {
  const both = await plan(twoSurvivors())
  assert.deepEqual(both.outcome.verdicts.a.failed, [])
  assert.deepEqual(both.outcome.verdicts.b.failed, [])
  const reconciler = both.model.calls.filter((c) => c.role === 'reconciler')
  assert.equal(reconciler.length, 2, 'one reconciler call per plan')
  for (const call of reconciler) assert.equal(call.temperature, 0)
  assert.deepEqual(
    both.model.calls.map((c) => c.role),
    ['planner', 'planner', 'reconciler', 'reconciler'],
  )

  // Each call carries one plan: the 4-unit plan's subjects in the first, the 6-unit plan's in the
  // second, and never both.
  const [first, second] = reconciler as [(typeof reconciler)[number], (typeof reconciler)[number]]
  const inA = ['the charter', 'Runnymede meadow']
  const inB = ['a wax seal', 'a stone hall']
  for (const name of inA) {
    assert.ok(first.prompt.includes(name), `the first score call lacks "${name}"`)
    assert.ok(
      !second.prompt.includes(name),
      `the second score call carries the other plan's "${name}"`,
    )
  }
  for (const name of inB) {
    assert.ok(second.prompt.includes(name), `the second score call lacks "${name}"`)
    assert.ok(
      !first.prompt.includes(name),
      `the first score call carries the other plan's "${name}"`,
    )
  }
  // …and answers for one plan: four closed questions, yes or no.
  assert.equal(first.schema.safeParse(answers('yes', 'no', 'yes', 'no')).success, true)
  assert.equal(
    first.schema.safeParse({ answers: ['yes', 'no', 'yes', 'no', 'yes', 'no', 'yes', 'no'] })
      .success,
    false,
  )
  assert.equal(first.schema.safeParse({ answers: ['yes', 'no', 'maybe', 'no'] }).success, false)
  for (const question of S.score.questions) {
    assert.ok(first.prompt.includes(question), `the score call does not ask "${question}"`)
  }

  // Both scored, and the higher selected.
  const { scores } = both.outcome
  assert.ok(scores !== null, 'two survivors were not scored')
  assert.ok(
    scores.b.total > scores.a.total,
    `the fixture expects b to score higher: ${JSON.stringify(scores)}`,
  )
  assert.equal(both.outcome.selected, 'b')
  assert.equal(both.outcome.estimateCents, both.outcome.fork.b.estimateCents)

  // A tie goes to the 4-unit plan.
  const flat = { ...S, score: { ...S.score, weights: { ...S.score.weights, recurrence: 0 } } }
  const tie = await plan(
    {
      ...twoSurvivors(),
      reconciler: [
        { value: answers('yes', 'no', 'yes', 'no') },
        { value: answers('no', 'yes', 'no', 'yes') },
      ],
    },
    flat,
  )
  assert.equal(
    tie.outcome.scores?.a.total,
    tie.outcome.scores?.b.total,
    'the tie fixture does not tie',
  )
  assert.equal(tie.outcome.selected, 'a')

  // One survivor: no score call, no score, selected outright (D-113).
  const one = await plan(oneSurvivor())
  assert.deepEqual(one.outcome.verdicts.b.failed, ['shape'])
  assert.deepEqual(
    one.model.calls.map((c) => c.role),
    ['planner', 'planner'],
    'a lone survivor was scored',
  )
  assert.equal(one.outcome.scores, null)
  assert.equal(one.outcome.selected, 'a')
})

// ---------------------------------------------------------------- 35

const YN: YesNo[] = ['yes', 'no']
const EVERY_ANSWER = YN.flatMap((a) =>
  YN.flatMap((b) => YN.flatMap((c) => YN.map((d) => [a, b, c, d] as const))),
)

test('35. the plan score returns a number for every input, including every answer no, and has no path that rejects', () => {
  const request = planRequest('score-35')
  const noClaims: SubmitRequest = {
    ...request,
    claims: [],
    narration: request.narration.map((s) => ({ ...s, claimIds: [] })),
    criteria: { ...request.criteria, mustShow: [], mustNotShow: [] },
  }
  const recurring: Plan = {
    ...passingPlan(request),
    subjects: [{ id: 'river', name: 'the river' }],
    shots: [0, 1, 2, 3].map((unit) => ({
      unit,
      durationSeconds: 10,
      subjectIds: unit < 3 ? ['river'] : [],
    })),
  }
  const empty: Plan = { ...passingPlan(request), units: [], shots: [], subjects: [] }
  const keys = Object.keys(S.score.weights)
  const weightings: Record<string, Record<string, number>> = {
    default: S.score.weights,
    zero: Object.fromEntries(keys.map((k) => [k, 0])),
    missing: {},
    negative: Object.fromEntries(keys.map((k) => [k, -1])),
    notANumber: Object.fromEntries(keys.map((k) => [k, Number.NaN])),
    infinite: Object.fromEntries(keys.map((k) => [k, Number.POSITIVE_INFINITY])),
    huge: Object.fromEntries(keys.map((k) => [k, 1e300])),
  }
  const answerSets: unknown[] = [...EVERY_ANSWER, [], ['yes'], ['maybe', 'yes', 'no', 'yes']]

  let scored = 0
  for (const [label, weights] of Object.entries(weightings)) {
    const settings = { ...S, score: { ...S.score, weights } }
    for (const [p, r] of [
      [recurring, request],
      [empty, request],
      [recurring, noClaims],
      [empty, noClaims],
    ] as const) {
      for (const four of answerSets) {
        const score = scorePlan(p, r, four as readonly YesNo[], settings)
        const where = `${label} weights, ${JSON.stringify(four)}`
        assert.equal(typeof score.total, 'number', where)
        assert.ok(
          Number.isFinite(score.total) && score.total >= 0,
          `${where}: total ${score.total}`,
        )
        for (const [term, value] of Object.entries(score.terms)) {
          assert.ok(
            Number.isFinite(value) && value >= 0 && value <= 1,
            `${where}: term ${term} is ${value}`,
          )
        }
        scored += 1
      }
    }
  }
  assert.equal(scored, 7 * 4 * 19)

  // Every answer no still scores the countable terms.
  const allNo = scorePlan(recurring, request, ['no', 'no', 'no', 'no'], S)
  assert.equal(allNo.terms.coverage, 1)
  assert.equal(allNo.terms.recurrence, 3 / 4)
  assert.equal(allNo.total, 1 + 3 / 4)

  // A path that rejects would be a throw; the score's file has none (I-16).
  assert.deepEqual(
    throwStatements('packages/pipeline/src/plan/score.ts'),
    [],
    'plan/score.ts throws',
  )
})

// ---------------------------------------------------------------- 36

test('36. the same two plans score identically twice', async () => {
  const first = await plan(twoSurvivors())
  const second = await plan(twoSurvivors())
  assert.ok(first.outcome.scores !== null)
  assert.deepEqual(second.outcome.scores, first.outcome.scores)
  const prompts = (m: typeof first.model) =>
    m.calls.filter((c) => c.role === 'reconciler').map((c) => c.prompt)
  assert.deepEqual(
    prompts(second.model),
    prompts(first.model),
    'the same plan was asked about differently',
  )

  const request = planRequest('score-36')
  const { a } = first.outcome.fork
  assert.deepEqual(
    scorePlan(a, request, ['yes', 'no', 'yes', 'yes'], S),
    scorePlan(a, request, ['yes', 'no', 'yes', 'yes'], S),
  )
})

// ---------------------------------------------------------------- 37

test('37. every model call writes a model_receipt with model id, role, temperature and fake', async () => {
  const engine = await startEngine({ worker: true, script: twoSurvivors() })
  try {
    const submitted = await engine.http.submit(planRequest('r37'))
    assert.equal(submitted.status, 202)
    const runId = String(submitted.json.runId)
    await finished(engine, runId)

    const receipts = engine.query<Record<string, unknown>>(
      'SELECT run_id, role, model, temperature, input_tokens, output_tokens, fake FROM model_receipt ORDER BY id',
    )
    assert.equal(engine.model.calls.length, 4, 'the stand-in did not answer four calls')
    assert.deepEqual(
      receipts.map((r) => ({ ...r })),
      engine.model.calls.map((call) => ({
        run_id: runId,
        role: call.role,
        model: S.models[call.role],
        temperature: 0,
        input_tokens: 0,
        output_tokens: 0,
        fake: 1,
      })),
      'every call that returned has one receipt, in order, with the model its role is routed to',
    )
  } finally {
    await engine.stop()
  }
})
