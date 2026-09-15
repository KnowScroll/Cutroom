import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { DEFAULT_PLAN_SETTINGS, planReel } from '@cutroom/pipeline'
import { QUESTIONS_MD } from '@cutroom/worker'
import { REPO } from './_repo.ts'
import { run, startEngine, type Engine, type Ran } from './engine/harness.ts'
import {
  answer,
  answerA,
  bare,
  evenAnswer,
  planRequest,
  shortRequest,
  standIn,
  twoSurvivors,
} from './engine/plans.ts'

// reel-plan, Slice 4 — how a run ends when it is not a plan (docs/features/reel-plan.md, checks 20,
// 28 and 41–44): too few sentences, every plan over the per-reel cap, a rule stop after the repair,
// a plan-only run over its ceiling, and a thrown model call.

const S = DEFAULT_PLAN_SETTINGS

const events = (ran: Ran) =>
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
function entries(text: string): string[] {
  return text.split(/^(?=## )/m).filter((chunk) => chunk.startsWith('## '))
}

// ---------------------------------------------------------------- 20

test('20. a narration of 5 sentences finishes stopped for a rule at the plan step with no model_receipt', async () => {
  const five = shortRequest('r20', 5)
  assert.equal(five.narration.length, 5)

  // Before any call: planning answers the split stop, naming the count and the target it misses.
  const model = standIn(twoSurvivors())
  const outcome = await planReel(five, model, 300, S).catch((error: unknown) => ({
    thrown: String(error),
  }))
  assert.equal(model.calls.length, 0, 'a model call was made for a narration that cannot be split')
  assert.ok('kind' in outcome, `planning threw: ${JSON.stringify(outcome)}`)
  assert.equal(outcome.kind, 'stopped-rule')
  assert.ok(outcome.kind === 'stopped-rule' && outcome.rule === 'split', JSON.stringify(outcome))
  assert.ok(!('fork' in outcome), 'a split stop carries plans')
  assert.match(outcome.detail, /\b5 sentences\b/)
  assert.match(outcome.detail, /\b6 units\b/)
  assert.doesNotMatch(outcome.detail, /\b4 units\b/, 'the detail names a target that was met')

  // The same through the service: stopped, rule split, step plan; no receipt, no plan, no verdict.
  const engine = await startEngine({ worker: true, script: twoSurvivors() })
  try {
    const ran = await run(engine, five)
    assert.deepEqual(ran.result, {
      contractVersion: 1,
      runId: ran.runId,
      requestId: 'r20',
      costCents: 0,
      status: 'stopped',
      reason: 'rule',
      rule: 'split',
      step: 'plan',
      detail: outcome.detail,
    })
    assert.deepEqual(ran.receipts, [], 'a model_receipt was written')
    assert.equal(engine.model.calls.length, 0)
    assert.deepEqual(ran.plans, [])
    assert.deepEqual(events(ran), ['run.accepted', 'stage.started', 'run.finished'])
    assert.deepEqual(written(engine), [], 'a file other than the database was written')
  } finally {
    await engine.stop()
  }
})

// ---------------------------------------------------------------- 28

test('28. the cap is read from steering-ref/steering/BUDGET.md: changing the file in a fixture changes the cap Gate 0 applies and the capCents the caller receives', async () => {
  // The file a worker reads by default is the pinned steering repository's, which says $3.00 today.
  const pinned = join(REPO, 'steering-ref', 'steering', 'BUDGET.md')
  const real = readFileSync(pinned, 'utf8')
  const row = '| Per reel, all-in | **$3.00** |'
  assert.ok(
    real.includes(row),
    "the pinned BUDGET.md's per-reel row is not $3.00; this check needs updating",
  )
  const withCap = (figure: string) => real.replace(row, `| Per reel, all-in | **${figure}** |`)

  // The 4-unit plan costs 205 cents; the 6-unit plan, a seal in two shots, 190 — and so does the
  // repair, which works from it, since the two fail the same conditions and it is cheaper.
  const sixUnits = () =>
    answer([7, 7, 7, 7, 6, 6], [{ id: 'seal', name: 'a wax seal' }], [['seal'], [], ['seal']])
  const pair = () => [{ value: answerA() }, { value: sixUnits() }]
  const refusal = () => [...pair(), { value: sixUnits() }]

  // No fixture: at 8 cents a second of video the plans are 365 and 350 cents and the repair 350,
  // all over the pinned $3.00, and the refusal carries that figure.
  const pinnedRun = await startEngine({
    worker: true,
    settings: { ...S, videoRateCentsPerSecond: 8 },
    script: { planner: refusal() },
  })
  try {
    const ran = await run(pinnedRun, planRequest('r28-pinned'))
    assert.equal(pinnedRun.budgetPath, undefined)
    assert.equal(ran.result.status, 'refused', JSON.stringify(ran.result))
    assert.equal(ran.result.capCents, 300)
  } finally {
    await pinnedRun.stop()
  }

  // One worker, three runs, the fixture rewritten between them: the cap is read at every job.
  const engine = await startEngine({
    worker: false,
    budgetMd: withCap('$1.50'),
    script: { planner: [...refusal(), ...pair(), ...refusal()] },
  })
  try {
    await engine.startWorker()
    const path = engine.budgetPath as string

    const at150 = await run(engine, planRequest('r28-150'))
    assert.equal(at150.result.status, 'refused', JSON.stringify(at150.result))
    assert.equal(at150.result.capCents, 150)
    assert.equal(at150.result.estimateCents, 190)
    assert.deepEqual(at150.plans[1]?.verdict.failed, ['cost'])

    // Raised to $1.90: the 6-unit plan is at the cap, passes, and is selected alone.
    writeFileSync(path, withCap('$1.90'))
    const at190 = await run(engine, planRequest('r28-190'))
    assert.equal(at190.result.status, 'completed', JSON.stringify(at190.result))
    assert.deepEqual(
      at190.plans.map((p) => [p.role, p.verdict.failed, p.selected]),
      [
        ['a', ['cost'], false],
        ['b', [], true],
      ],
    )

    // Lowered to $1.00: refused again, carrying the new figure.
    writeFileSync(path, withCap('$1.00'))
    const at100 = await run(engine, planRequest('r28-100'))
    assert.equal(at100.result.status, 'refused', JSON.stringify(at100.result))
    assert.equal(at100.result.capCents, 100)
  } finally {
    await engine.stop()
  }
})

// ---------------------------------------------------------------- 41

test("41. a run whose three plans all fail on cost finishes refused for budget with limit 'reel', the lowest estimate, the ceiling and the cap; appends one entry to the questions file; and leaves one job row", async () => {
  // Every plan fails cost — even one that also fails shape counts, since the rule is that every
  // plan failed condition 4. At a cap of 150: 200 cents (and 50 s), 160, and a repair of 190.
  const mixed = await planReel(
    planRequest('r41-unit'),
    standIn({
      planner: [
        { value: bare(13, 13, 12, 12) },
        { value: bare(7, 7, 7, 7, 6, 6) },
        { value: evenAnswer(6) },
      ],
    }),
    150,
    S,
  ).catch((error: unknown) => ({ kind: 'thrown', detail: String(error) }))
  assert.equal(mixed.kind, 'refused-budget', JSON.stringify(mixed))
  assert.ok(
    'verdicts' in mixed && mixed.verdicts.a.failed.includes('shape'),
    'the fixture has drifted',
  )
  assert.ok(mixed.kind === 'refused-budget' && mixed.estimateCents === 160, JSON.stringify(mixed))

  // Through the service, at the pinned cap of 300 and 10 cents a second of video: 445 cents for
  // the 4-unit plan, 360 for the 6-unit plan, and 430 for the repair on its 6 units. The lowest is
  // neither the first plan nor the repair.
  const before = repoQuestions()
  const script = () => [
    { value: answerA() },
    { value: bare(6, 6, 6, 6, 6, 6) },
    { value: evenAnswer(6) },
  ]
  const engine = await startEngine({
    worker: true,
    settings: { ...S, videoRateCentsPerSecond: 10 },
    script: { planner: [...script(), ...script()] },
  })
  try {
    assert.equal(existsSync(engine.questionsPath), false)
    const request = { ...planRequest('r41'), options: { until: 'plan' as const, budgetCents: 250 } }
    const ran = await run(engine, request)
    assert.deepEqual(ran.result, {
      contractVersion: 1,
      runId: ran.runId,
      requestId: 'r41',
      costCents: 0,
      status: 'refused',
      reason: 'budget',
      limit: 'reel',
      estimateCents: 360,
      ceilingCents: 250,
      capCents: 300,
    })
    assert.deepEqual(
      ran.plans.map((p) => [p.role, p.estimateCents, p.verdict.failed]),
      [
        ['a', 445, ['cost']],
        ['b', 360, ['cost']],
        ['repair', 430, ['cost']],
      ],
    )
    assert.deepEqual(events(ran), [
      'run.accepted',
      'stage.started',
      'verdict fail',
      'verdict fail',
      'verdict fail',
      'run.finished',
    ])

    // One job row, of kind reel.plan, and no other row of any kind.
    const jobs = engine.query<{ kind: string; correlation_id: string; state: string }>(
      'SELECT kind, correlation_id, state FROM job',
    )
    assert.deepEqual(
      jobs.map((j) => ({ ...j })),
      [{ kind: 'reel.plan', correlation_id: ran.runId, state: 'done' }],
    )

    // One entry, carrying the run and every figure, in a file created on first write.
    assert.deepEqual(
      written(engine),
      ['QUESTIONS.md'],
      'a file other than the questions file was written',
    )
    const first = readFileSync(engine.questionsPath, 'utf8')
    const [entry, ...more] = entries(first)
    assert.equal(more.length, 0, `${1 + more.length} entries for one refusal`)
    assert.ok(entry?.includes(ran.runId), 'the entry does not name the run')
    assert.ok(entry?.includes('r41'), 'the entry does not name the request')
    for (const figure of [
      '**Lowest estimate:** 360 cents',
      '**Ceiling:** 250 cents',
      '**Per-reel cap:** 300 cents',
    ]) {
      assert.ok(entry?.includes(figure), `the entry lacks "${figure}":\n${entry}`)
    }

    // A second refusal appends a second entry and leaves the first as it was.
    const again = await run(engine, { ...request, requestId: 'r41-again' })
    assert.equal(again.result.status, 'refused')
    const second = readFileSync(engine.questionsPath, 'utf8')
    assert.ok(second.startsWith(first), 'the second refusal rewrote the first entry')
    assert.equal(entries(second).length, 2)
  } finally {
    await engine.stop()
  }

  // Every test points the file at its own folder; the default is the engine repository's root.
  assert.equal(QUESTIONS_MD.split('\\').join('/'), join(REPO, 'QUESTIONS.md').split('\\').join('/'))
  assert.equal(repoQuestions(), before, "the repository's own questions file was written")
})

// ---------------------------------------------------------------- 42

test('42. a run whose repair fails and in which not every plan failed on cost finishes stopped for a rule, gate-0 at the plan step, and writes no question', async () => {
  // Two plans over a cap of 150 and a repair that fails on shape alone: not every plan failed cost.
  const mixed = await planReel(
    planRequest('r42-unit'),
    standIn({
      planner: [
        { value: bare(10, 10, 10, 10) },
        { value: bare(7, 7, 7, 7, 6, 6) },
        { value: bare(5, 5, 5, 5) },
      ],
    }),
    150,
    S,
  ).catch((error: unknown) => ({ kind: 'thrown', detail: String(error) }))
  assert.equal(mixed.kind, 'stopped-rule', JSON.stringify(mixed))
  assert.ok('rule' in mixed && mixed.rule === 'gate-0', JSON.stringify(mixed))
  assert.match(mixed.detail, /\ba \(4 units\) failed cost\b/)
  assert.match(mixed.detail, /\bb \(6 units\) failed cost\b/)
  assert.match(mixed.detail, /\brepair \(4 units\) failed shape\b/)

  // Through the service: every plan fails on shape.
  const before = repoQuestions()
  const engine = await startEngine({
    worker: true,
    script: {
      planner: [
        { value: bare(13, 13, 12, 12) },
        { value: bare(9, 9, 8, 8, 8, 8) },
        { value: bare(4, 12, 12, 12) },
      ],
    },
  })
  try {
    const ran = await run(engine, planRequest('r42'))
    const { detail, ...rest } = ran.result
    assert.deepEqual(rest, {
      contractVersion: 1,
      runId: ran.runId,
      requestId: 'r42',
      costCents: 0,
      status: 'stopped',
      reason: 'rule',
      rule: 'gate-0',
      step: 'plan',
    })
    assert.equal(typeof detail, 'string')
    for (const named of [
      'a (4 units) failed shape',
      'b (6 units) failed shape',
      'repair (4 units) failed shape',
    ]) {
      assert.ok(
        String(detail).includes(named),
        `the detail does not say "${named}": ${String(detail)}`,
      )
    }
    assert.deepEqual(events(ran), [
      'run.accepted',
      'stage.started',
      'verdict fail',
      'verdict fail',
      'verdict fail',
      'run.finished',
    ])
    assert.deepEqual(written(engine), [], 'a question, or another file, was written')
  } finally {
    await engine.stop()
  }
  assert.equal(repoQuestions(), before, "the repository's own questions file was written")
})

// ---------------------------------------------------------------- 43

test('43. a plan-only run whose estimate is above its ceiling completes with the estimate and costCents 0, and writes no question', async () => {
  const before = repoQuestions()
  const engine = await startEngine({ worker: true, script: twoSurvivors() })
  try {
    // Both plans are 205 cents; the ceiling is 100.
    const request = { ...planRequest('r43'), options: { until: 'plan' as const, budgetCents: 100 } }
    const ran = await run(engine, request)
    assert.deepEqual(ran.result, {
      contractVersion: 1,
      runId: ran.runId,
      requestId: 'r43',
      status: 'completed',
      until: 'plan',
      estimateCents: 205,
      costCents: 0,
    })
    assert.deepEqual(written(engine), [], 'a question, or another file, was written')
  } finally {
    await engine.stop()
  }
  assert.equal(repoQuestions(), before, "the repository's own questions file was written")
})

// ---------------------------------------------------------------- 44

test("44. a stand-in scripted to throw on the second call finishes the run as failed with a detail, and the first call's model_receipt is kept", async () => {
  const engine = await startEngine({
    worker: true,
    script: { planner: [{ value: answerA() }, { throws: 'stand-in down' }] },
  })
  try {
    const ran = await run(engine, planRequest('r44'))
    assert.deepEqual(ran.result, {
      contractVersion: 1,
      runId: ran.runId,
      requestId: 'r44',
      costCents: 0,
      status: 'failed',
      detail: 'stand-in down',
    })
    assert.equal(engine.model.calls.length, 2, 'the stand-in was not called twice')
    assert.deepEqual(ran.receipts, [{ role: 'planner' }], "the first call's receipt was not kept")
    assert.deepEqual(ran.plans, [], 'a failed run stored plans')
    assert.deepEqual(events(ran), ['run.accepted', 'stage.started', 'run.finished'])
    const jobs = engine.query<{ state: string }>('SELECT state FROM job')
    assert.deepEqual(
      jobs.map((j) => j.state),
      ['done'],
    )
    assert.deepEqual(written(engine), [], 'a question, or another file, was written')
  } finally {
    await engine.stop()
  }
})
