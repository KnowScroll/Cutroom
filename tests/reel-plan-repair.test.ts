import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Gate0Condition, Gate0Verdict } from '@cutroom/contracts'
import { DEFAULT_PLAN_SETTINGS, planReel, repairBasis, type PlanOutcome } from '@cutroom/pipeline'
import type { FakeModel, FakeScript } from '@cutroom/providers'
import { run, startEngine, type Ran } from './engine/harness.ts'
import {
  answerA,
  bare,
  evenAnswer,
  oneSurvivor,
  planRequest,
  standIn,
  twoSurvivors,
} from './engine/plans.ts'
import { importSpecifiers, importedNames, isDeclaration, names } from './engine/source.ts'

// reel-plan, Slice 4 — selection and repair (docs/features/reel-plan.md, checks 38–40): exactly one
// plan selected only when planning succeeds (D-061, D-065, D-113); when both plans fail Gate 0, one
// repair call on the grouping D-114 picks, recorded as a third plan and put through Gate 0 (D-064).

const S = DEFAULT_PLAN_SETTINGS
const CAP = 300

/** 50 s in 4 shots, nothing shown: 200 cents at the default rates, failing on shape. */
const longA = () => bare(13, 13, 12, 12)
/** 50 s in 6 shots, nothing shown: 200 cents, failing on shape. */
const longB = () => bare(9, 9, 8, 8, 8, 8)
/** 20 s in 4 shots: 80 cents, failing on shape. */
const shortA = () => bare(5, 5, 5, 5)
/** 30 s in 6 shots: 120 cents, failing on shape. */
const shortB = () => bare(5, 5, 5, 5, 5, 5)
/** 40 s in 4 shots: 160 cents, passing at a cap of 160 or more. */
const fitA = () => bare(10, 10, 10, 10)
/** 40 s in 6 shots: 160 cents. */
const fitB = () => bare(7, 7, 7, 7, 6, 6)

/** Plans, catching a throw as an answer too, so a wrong one fails on an assertion. */
async function attempt(script: FakeScript, cap: number) {
  const model = standIn(script)
  try {
    return { outcome: await planReel(planRequest('repair'), model, cap, S), model }
  } catch (error) {
    return { outcome: { thrown: String(error) }, model }
  }
}

type Recorded = Exclude<PlanOutcome, { rule: 'split' }>

function recorded(outcome: unknown): Recorded {
  assert.ok(
    typeof outcome === 'object' && outcome !== null && 'fork' in outcome,
    `planning recorded no plans: ${JSON.stringify(outcome)}`,
  )
  return outcome as Recorded
}

/** The third planner call — the repair — and the unit count its schema and prompt were built for. */
function repairCall(model: FakeModel, units: number) {
  const planner = model.calls.filter((c) => c.role === 'planner')
  assert.equal(planner.length, 3, `${planner.length} planner calls; the repair is the third`)
  assert.equal(model.calls.length, 3, 'a call other than the two plans and the repair was made')
  const call = planner[2] as (typeof planner)[number]
  assert.equal(call.temperature, 0)
  const other = units === 4 ? 6 : 4
  assert.equal(
    call.schema.safeParse(evenAnswer(units)).success,
    true,
    `the repair's schema refuses ${units} units`,
  )
  assert.equal(
    call.schema.safeParse(evenAnswer(other)).success,
    false,
    `the repair's schema accepts ${other} units`,
  )
  assert.ok(
    call.prompt.includes(`Unit ${units - 1} —`),
    `the repair prompt lacks unit ${units - 1}`,
  )
  assert.ok(!call.prompt.includes(`Unit ${units} —`), `the repair prompt lists unit ${units}`)
  return call
}

/** The one line of a repair prompt that gives the verdict of the plan in `units` units. */
function verdictLine(prompt: string, units: number): string {
  const lines = prompt
    .split('\n')
    .filter((l) => l.includes(`${units} units`) && l.includes('failed'))
  assert.equal(
    lines.length,
    1,
    `the repair prompt has ${lines.length} verdict lines for ${units} units`,
  )
  return lines[0] as string
}

function failedIn(line: string): Gate0Condition[] {
  return (['coverage', 'criteria', 'shape', 'cost'] as const).filter((c) => line.includes(c))
}

const events = (ran: Ran) =>
  ran.events.map((e) => (e.type === 'verdict' ? `verdict ${String(e.outcome)}` : e.type))

// ---------------------------------------------------------------- 38

test('38. a completed run has exactly one selected plan; the unselected plan keeps its Gate 0 verdict, and its score when both survived; a run stopped or refused at the plan step has none selected', async () => {
  // Two survivors: both scored, the higher selected, the other keeping its verdict and its score.
  const both = await startEngine({ worker: true, script: twoSurvivors() })
  try {
    const ran = await run(both, planRequest('r38-both'))
    assert.equal(ran.result.status, 'completed', JSON.stringify(ran.result))
    assert.deepEqual(
      ran.plans.map((p) => [p.role, p.selected]),
      [
        ['a', false],
        ['b', true],
      ],
    )
    const [loser] = ran.plans
    assert.deepEqual(loser?.verdict, { outcome: 'accept', failed: [] })
    assert.equal(typeof loser?.score, 'number', 'the unselected survivor lost its score')
    assert.deepEqual(events(ran), [
      'run.accepted',
      'stage.started',
      'verdict accept',
      'verdict accept',
      'stage.finished',
      'run.finished',
    ])
  } finally {
    await both.stop()
  }

  // One survivor: selected outright; the other keeps its failing verdict, and nothing is scored.
  const one = await startEngine({ worker: true, script: oneSurvivor() })
  try {
    const ran = await run(one, planRequest('r38-one'))
    assert.equal(ran.result.status, 'completed', JSON.stringify(ran.result))
    assert.deepEqual(
      ran.plans.map((p) => [p.role, p.selected, p.verdict.failed, p.score]),
      [
        ['a', true, [], null],
        ['b', false, ['shape'], null],
      ],
    )
  } finally {
    await one.stop()
  }

  // Stopped for a rule: three plans, each with its verdict, none selected.
  const stopped = await startEngine({
    worker: true,
    script: { planner: [{ value: longA() }, { value: longB() }, { value: longA() }] },
  })
  try {
    const ran = await run(stopped, planRequest('r38-stopped'))
    assert.equal(ran.result.status, 'stopped', JSON.stringify(ran.result))
    assert.deepEqual(
      ran.plans.map((p) => [p.role, p.selected, p.verdict.outcome]),
      [
        ['a', false, 'fail'],
        ['b', false, 'fail'],
        ['repair', false, 'fail'],
      ],
    )
  } finally {
    await stopped.stop()
  }

  // Refused for budget: three plans over the cap, none selected.
  const refused = await startEngine({
    worker: true,
    settings: { ...S, videoRateCentsPerSecond: 10 },
    script: { planner: [{ value: fitA() }, { value: fitB() }, { value: fitA() }] },
  })
  try {
    const ran = await run(refused, planRequest('r38-refused'))
    assert.equal(ran.result.status, 'refused', JSON.stringify(ran.result))
    assert.equal(ran.plans.length, 3)
    assert.deepEqual(
      ran.plans.filter((p) => p.selected),
      [],
      'a refused run has a selected plan',
    )
  } finally {
    await refused.stop()
  }
})

// ---------------------------------------------------------------- 39

test('39. when both plans fail, the repair call is given the grouping D-114 picks — fewer failed conditions, then lower estimate, then the 4-unit plan, each tie built on purpose — and both verdicts; the run records three plans, one marked repair', async () => {
  // D-114's order, as code: separable only on verdicts no planned run can produce, since a plan
  // built here fails only on shape or cost, and failing cost means a higher estimate.
  const v = (...failed: Gate0Condition[]): Gate0Verdict => ({ outcome: 'fail', failed })
  const at = (a: number, b: number) => ({ a: { estimateCents: a }, b: { estimateCents: b } })
  assert.equal(repairBasis(at(100, 250), { a: v('coverage', 'criteria'), b: v('shape') }), 'b')
  assert.equal(repairBasis(at(250, 100), { a: v('shape'), b: v('coverage', 'criteria') }), 'a')
  assert.equal(repairBasis(at(250, 100), { a: v('shape'), b: v('cost') }), 'b')
  assert.equal(repairBasis(at(100, 250), { a: v('cost'), b: v('shape') }), 'a')
  assert.equal(repairBasis(at(200, 200), { a: v('shape'), b: v('cost') }), 'a')
  assert.equal(repairBasis(at(200, 200), { a: v('shape', 'cost'), b: v('shape', 'cost') }), 'a')

  // Fewer failed conditions: at a cap of 150, the 4-unit plan fails shape and cost, the 6-unit
  // plan shape alone — so the repair works from the 6 units.
  const fewer = await attempt(
    { planner: [{ value: longA() }, { value: shortB() }, { value: fitB() }] },
    150,
  )
  const fewerCall = repairCall(fewer.model, 6)
  const fewerRecord = recorded(fewer.outcome)
  assert.deepEqual(fewerRecord.verdicts.a.failed, ['shape', 'cost'], 'the fixture has drifted')
  assert.deepEqual(fewerRecord.verdicts.b.failed, ['shape'], 'the fixture has drifted')
  // …given both verdicts, each named against its own plan.
  assert.deepEqual(failedIn(verdictLine(fewerCall.prompt, 4)), ['shape', 'cost'])
  assert.deepEqual(failedIn(verdictLine(fewerCall.prompt, 6)), ['shape'])
  // …and the shots of the plan it corrects, never the other plan's (S-024).
  for (const unit of [0, 1, 2, 3, 4, 5]) {
    assert.ok(
      fewerCall.prompt.includes(`- Unit ${unit}: 5 seconds, showing nothing named`),
      `the repair prompt lacks the kept plan's shot for unit ${unit}`,
    )
  }
  assert.ok(
    !/\b1[23] seconds\b/.test(fewerCall.prompt),
    "the repair prompt carries the other plan's shots",
  )

  // Equal conditions, lower estimate: both fail shape; the 6-unit plan is 120 cents, the 4-unit 200.
  const lowerB = await attempt(
    { planner: [{ value: longA() }, { value: shortB() }, { value: fitB() }] },
    CAP,
  )
  repairCall(lowerB.model, 6)
  // …and the other way round, so "lower" is not "the 6-unit plan": 80 cents against 200.
  const lowerA = await attempt(
    { planner: [{ value: shortA() }, { value: longB() }, { value: fitA() }] },
    CAP,
  )
  const lowerACall = repairCall(lowerA.model, 4)
  assert.deepEqual(failedIn(verdictLine(lowerACall.prompt, 4)), ['shape'])
  assert.deepEqual(failedIn(verdictLine(lowerACall.prompt, 6)), ['shape'])

  // A full tie: both fail shape alone at 200 cents — the 4-unit plan.
  const tie = await attempt(
    { planner: [{ value: longA() }, { value: longB() }, { value: fitA() }] },
    CAP,
  )
  repairCall(tie.model, 4)
  const tieRecord = recorded(tie.outcome)
  assert.equal(
    tieRecord.fork.a.estimateCents,
    tieRecord.fork.b.estimateCents,
    'the tie does not tie',
  )

  // Three plans recorded, one marked repair, on the grouping it was given, with its own verdict.
  for (const [what, got, basis] of [
    ['fewer', fewer, 'b'],
    ['lower b', lowerB, 'b'],
    ['lower a', lowerA, 'a'],
    ['tie', tie, 'a'],
  ] as const) {
    const record = recorded(got.outcome)
    assert.ok(record.repair !== null, `${what}: no repair plan recorded`)
    assert.equal(record.repair.role, 'repair', what)
    assert.deepEqual(
      record.repair.units,
      record.fork[basis].units,
      `${what}: not the grouping picked`,
    )
    assert.ok(record.verdicts.repair !== null, `${what}: the repair has no Gate 0 verdict`)
    assert.equal(record.fork.a.role, 'a', what)
    assert.equal(record.fork.b.role, 'b', what)
    assert.equal(record.scores, null, `${what}: a plan that failed Gate 0 was scored`)
  }

  // The same in the stored run: three rows, one of them the repair, each with its fork's axis.
  const engine = await startEngine({
    worker: true,
    script: { planner: [{ value: longA() }, { value: shortB() }, { value: shortB() }] },
  })
  try {
    const ran = await run(engine, planRequest('r39'))
    assert.deepEqual(
      ran.plans.map((p) => [p.role, p.unitCount, p.axis, p.verdict.failed]),
      [
        ['a', 4, 'shotCount', ['shape']],
        ['b', 6, 'shotCount', ['shape']],
        ['repair', 6, 'shotCount', ['shape']],
      ],
    )
    assert.deepEqual(
      ran.receipts.map((r) => r.role),
      ['planner', 'planner', 'planner'],
    )
  } finally {
    await engine.stop()
  }

  // D-114's choice is counting: repair.ts imports no port type, no provider and no model client.
  const ports = names(['packages/contracts/src/model.ts'])
    .filter(isDeclaration)
    .map((n) => n.name)
  assert.ok(ports.includes('LanguageModelPort'), 'the scan found no LanguageModelPort')
  const file = 'packages/pipeline/src/plan/repair.ts'
  assert.deepEqual(
    [...importedNames(file).keys()].filter((n) => ports.includes(n)),
    [],
    'repair.ts imports a port type',
  )
  assert.deepEqual(
    importSpecifiers(file).filter((s) => /providers|^ai$|^ai\/|^@ai-sdk\/|model/.test(s)),
    [],
    'repair.ts imports a provider, a model client or the model file',
  )
})

// ---------------------------------------------------------------- 40

test('40. a repair that survives Gate 0 is selected and the run completes', async () => {
  // Both plans fail on shape at 200 cents each, so the repair works from the 4 units; it answers
  // 40 s with the river in every shot: 2 image calls and 160 s of video, 190 cents.
  const repaired = evenAnswer(4)
  const outcome = await attempt(
    { planner: [{ value: longA() }, { value: longB() }, { value: repaired }] },
    CAP,
  )
  const record = recorded(outcome.outcome)
  assert.equal(record.kind, 'selected', JSON.stringify(record))
  assert.equal(record.kind === 'selected' && record.selected, 'repair')
  assert.deepEqual(record.verdicts.repair, { outcome: 'accept', failed: [] })
  assert.equal(record.repair?.estimateCents, 2 * 15 + 40 * 4)
  assert.equal(record.kind === 'selected' && record.estimateCents, 190)

  const engine = await startEngine({
    worker: true,
    script: { planner: [{ value: longA() }, { value: longB() }, { value: repaired }] },
  })
  try {
    const ran = await run(engine, planRequest('r40'))
    assert.deepEqual(ran.result, {
      contractVersion: 1,
      runId: ran.runId,
      requestId: 'r40',
      status: 'completed',
      until: 'plan',
      estimateCents: 190,
      costCents: 0,
    })
    assert.deepEqual(
      ran.plans.map((p) => [p.role, p.selected, p.verdict.outcome, p.score]),
      [
        ['a', false, 'fail', null],
        ['b', false, 'fail', null],
        ['repair', true, 'accept', null],
      ],
    )
    assert.deepEqual(events(ran), [
      'run.accepted',
      'stage.started',
      'verdict fail',
      'verdict fail',
      'verdict accept',
      'stage.finished',
      'run.finished',
    ])
  } finally {
    await engine.stop()
  }

  // A repair is one call: a second failing answer in the script is never asked for.
  const once = await attempt(
    { planner: [{ value: longA() }, { value: longB() }, { value: longA() }, { value: answerA() }] },
    CAP,
  )
  assert.equal(once.model.calls.length, 3, 'more than one repair call was made')
})
