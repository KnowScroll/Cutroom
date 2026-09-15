import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Plan, PlanSettings } from '@cutroom/contracts'
import {
  DEFAULT_PLAN_SETTINGS,
  estimate,
  planReel,
  plannedImageCalls,
  rankSubjects,
  type PlanOutcome,
} from '@cutroom/pipeline'
import type { FakeScript } from '@cutroom/providers'
// The splitter is entered only by the planner (D-073), so its tests reach it by path, from outside
// every package the boundary rules scan (Gate 2, "The splitter").
import { groupSentences } from '../packages/pipeline/src/split/index.ts'
import {
  answer,
  answerA,
  answerB,
  evenAnswer,
  planRequest,
  range,
  standIn,
  twoSurvivors,
} from './engine/plans.ts'
import { importSpecifiers, importedNames, isDeclaration, names } from './engine/source.ts'

// reel-plan, Slice 3 — grouping and planning (docs/features/reel-plan.md, checks 17, 18, 19 and
// 21–27): the splitter, the two planning calls, and everything code computes after them.

const CAP = 300
const S = DEFAULT_PLAN_SETTINGS

type Selected = Extract<PlanOutcome, { kind: 'selected' }>

async function plan(script: FakeScript, settings: PlanSettings = S, requestId = 'plan') {
  const model = standIn(script)
  const outcome = await planReel(planRequest(requestId), model, CAP, settings)
  assert.equal(
    outcome.kind,
    'selected',
    `planning did not select a plan: ${JSON.stringify(outcome)}`,
  )
  return { outcome: outcome as Selected, model }
}

/** The names of every field a zod schema describes, at any depth. */
function fieldNames(schema: unknown): string[] {
  const out: string[] = []
  const walk = (s: unknown) => {
    if (s === null || typeof s !== 'object') return
    const def = (s as { _zod?: { def?: Record<string, unknown> } })._zod?.def
    if (def === undefined) return
    if (def.type === 'object') {
      for (const [key, value] of Object.entries(def.shape as Record<string, unknown>)) {
        out.push(key)
        walk(value)
      }
    }
    for (const inner of ['element', 'innerType', 'in', 'out', 'catchall']) walk(def[inner])
    for (const many of ['items', 'options']) {
      if (Array.isArray(def[many])) for (const item of def[many] as unknown[]) walk(item)
    }
  }
  walk(schema)
  return out
}

// ---------------------------------------------------------------- 17

test("17. the splitter's units, joined in order, are exactly the positions 0..n-1, none repeated, dropped or reordered", () => {
  for (let n = 1; n <= 24; n += 1) {
    for (let units = 1; units <= n; units += 1) {
      const got = groupSentences(n, units)
      assert.ok(got !== null, `${n} sentences into ${units} units returned nothing`)
      assert.deepEqual(got.flat(), range(0, n - 1), `${n} into ${units}: ${JSON.stringify(got)}`)
      assert.equal(got.length, units, `${n} into ${units} made ${got.length} units`)

      // Gate 2's grouping rule: as equal as possible in sentences, any extra to the earliest units.
      const base = Math.floor(n / units)
      const expected = range(0, units - 1).map((i) => base + (i < n % units ? 1 : 0))
      assert.deepEqual(
        got.map((u) => u.length),
        expected,
        `${n} into ${units}: uneven units`,
      )
    }
  }

  // Fewer sentences than units: nothing, never a unit that divides a sentence (D-112).
  assert.equal(groupSentences(5, 6), null)
  assert.equal(groupSentences(0, 4), null)
  assert.equal(groupSentences(8, 0), null)

  // Never orphan a claimRef (D-107): each reference sits on a sentence, so it lands in exactly the
  // one unit its sentence lands in.
  const request = planRequest('r17')
  for (const units of [4, 6]) {
    const got = groupSentences(request.narration.length, units) ?? []
    request.narration.forEach((sentence, i) => {
      for (const claimId of sentence.claimIds) {
        const holding = got.filter((unit) => unit.includes(i))
        assert.equal(
          holding.length,
          1,
          `claim ${claimId} on sentence ${i} is in ${holding.length} units`,
        )
      }
    })
  }
})

// ---------------------------------------------------------------- 18

test('18. the same count grouped into 4 and into 6 yields 4 and 6 units, and grouping twice yields the same units', () => {
  for (const n of [6, 7, 8, 11, 13, 20]) {
    const four = groupSentences(n, 4)
    const six = groupSentences(n, 6)
    assert.equal(four?.length, 4, `${n} sentences into 4`)
    assert.equal(six?.length, 6, `${n} sentences into 6`)
    assert.deepEqual(groupSentences(n, 4), four, `${n} into 4 grouped differently the second time`)
    assert.deepEqual(groupSentences(n, 6), six, `${n} into 6 grouped differently the second time`)
  }
})

// ---------------------------------------------------------------- 19

test("19. a shotCount run's two plans carry 4 and 6 units over identical sentences, and changing the setting changes the counts", async () => {
  const { outcome, model } = await plan(twoSurvivors())
  const { fork } = outcome
  assert.equal(fork.axis, 'shotCount')
  assert.equal(fork.a.units.length, 4)
  assert.equal(fork.b.units.length, 6)
  assert.deepEqual(fork.a.units.flat(), range(0, 7))
  assert.deepEqual(fork.b.units.flat(), range(0, 7))

  // The same words go to both planning calls.
  const request = planRequest('plan')
  const prompts = model.calls.filter((c) => c.role === 'planner').map((c) => c.prompt)
  assert.equal(prompts.length, 2)
  for (const sentence of request.narration) {
    for (const prompt of prompts)
      assert.ok(prompt.includes(sentence.text), `a prompt lacks "${sentence.text}"`)
  }

  const settings = { ...S, shotCountUnits: [5, 6] as const }
  const changed = await plan(
    {
      planner: [{ value: evenAnswer(5) }, { value: evenAnswer(6) }],
      reconciler: twoSurvivors().reconciler,
    },
    settings,
  )
  assert.equal(changed.outcome.fork.a.units.length, 5)
  assert.equal(changed.outcome.fork.b.units.length, 6)
})

// ---------------------------------------------------------------- 21

test('21. exactly two planning calls are made, role planner, temperature 0, one per grouping', async () => {
  const { model } = await plan(twoSurvivors())
  const planner = model.calls.filter((c) => c.role === 'planner')
  assert.equal(planner.length, 2, `${planner.length} planning calls`)
  for (const call of planner) assert.equal(call.temperature, 0)
  assert.deepEqual(
    model.calls.map((c) => c.role),
    ['planner', 'planner', 'reconciler', 'reconciler'],
    'both planning calls come first, before anything is scored',
  )

  // One per grouping: each call's schema is the one for its unit count, and no other.
  const [four, six] = planner as [(typeof planner)[number], (typeof planner)[number]]
  assert.equal(four.schema.safeParse(evenAnswer(4)).success, true)
  assert.equal(four.schema.safeParse(evenAnswer(6)).success, false)
  assert.equal(six.schema.safeParse(evenAnswer(6)).success, true)
  assert.equal(six.schema.safeParse(evenAnswer(4)).success, false)
})

// ---------------------------------------------------------------- 22

test('22. the same request planned twice against the same stand-in script yields identical plans, estimates, verdicts and selection', async () => {
  const first = await plan(twoSurvivors())
  const second = await plan(twoSurvivors())
  assert.deepEqual(second.outcome, first.outcome)
  assert.deepEqual(
    second.model.calls.map((c) => [c.role, c.temperature, c.prompt]),
    first.model.calls.map((c) => [c.role, c.temperature, c.prompt]),
    'the same request did not produce the same calls — a real model at temperature 0 could not replay it',
  )
})

// ---------------------------------------------------------------- 23

test("23. the planning call's schema has no field for ranking, image calls, estimate or criteria, and each is computed after the call", async () => {
  const { outcome, model } = await plan(twoSurvivors())
  const schema = model.calls.find((c) => c.role === 'planner')?.schema
  assert.ok(schema !== undefined, 'no planning call was made, so there is no schema to read')
  const fields = fieldNames(schema)
  for (const authored of [
    'shots',
    'unit',
    'durationSeconds',
    'subjectIds',
    'subjects',
    'id',
    'name',
  ]) {
    assert.ok(
      fields.includes(authored),
      `the scan found no ${authored} field, so it is not reading the schema`,
    )
  }
  const computed = /rank|image|estimate|cost|cent|criteri|must/i
  assert.deepEqual(
    fields.filter((f) => computed.test(f)),
    [],
    'the model is asked for something code computes',
  )

  // An answer carrying any of them is refused, so none can be read from it (D-034, D-035).
  for (const extra of [
    { ranking: ['charter'] },
    { plannedImageCalls: 4 },
    { estimateCents: 1 },
    { criteria: { mustShow: [], mustNotShow: [] } },
  ]) {
    assert.equal(
      schema?.safeParse({ ...answerA(), ...extra }).success,
      false,
      JSON.stringify(extra),
    )
  }

  // …and the plan has each, as code computes it from the answer.
  const request = planRequest('plan')
  for (const p of [outcome.fork.a, outcome.fork.b]) {
    assert.equal(p.plannedImageCalls, plannedImageCalls(rankSubjects(p)))
    assert.equal(p.estimateCents, estimate(p, S))
    assert.deepEqual(p.criteria, {
      mustShow: request.criteria.mustShow,
      mustNotShow: request.criteria.mustNotShow,
    })
  }
  assert.equal(outcome.fork.a.plannedImageCalls, 3)
  assert.equal(outcome.fork.a.estimateCents, 3 * 15 + 40 * 4)
})

// ---------------------------------------------------------------- 24

test('24. rank.ts imports no port type, and the same plan ranks identically twice', () => {
  const ports = names(['packages/contracts/src/model.ts'])
    .filter(isDeclaration)
    .map((n) => n.name)
  assert.ok(ports.includes('LanguageModelPort'), 'the scan found no LanguageModelPort')
  const imported = [...importedNames('packages/pipeline/src/rank.ts').keys()]
  assert.deepEqual(
    imported.filter((n) => ports.includes(n)),
    [],
    'rank.ts imports a port type',
  )
  const specifiers = importSpecifiers('packages/pipeline/src/rank.ts')
  assert.deepEqual(
    specifiers.filter((s) => /providers|^ai$|^@ai-sdk\/|model/.test(s)),
    [],
    'rank.ts imports a provider, a model client or the model file',
  )

  // D-029 part 3: two or more shots to be eligible; by shot count, then earliest first appearance,
  // then the order the plan names them.
  const ranked: Pick<Plan, 'shots' | 'subjects'> = {
    subjects: ['once', 'late', 'tieSecond', 'tieFirst', 'most', 'sameShotB'].map((id) => ({
      id,
      name: id,
    })),
    shots: [
      ['tieFirst', 'once'],
      ['tieSecond', 'most'],
      ['most', 'tieFirst', 'sameShotB', 'late'],
      ['most', 'tieSecond', 'sameShotB', 'late'],
    ].map((subjectIds, unit) => ({ unit, durationSeconds: 10, subjectIds })),
  }
  // most: 3 shots. tieFirst, tieSecond, late, sameShotB: 2 each — first seen in shots 0, 1, 2, 2;
  // late and sameShotB both first appear in shot 2, and the plan names late first.
  const expected = ['most', 'tieFirst', 'tieSecond', 'late', 'sameShotB']
  assert.deepEqual(rankSubjects(ranked), expected)
  assert.deepEqual(rankSubjects(ranked), rankSubjects(ranked))
  assert.deepEqual(rankSubjects(structuredClone(ranked)), expected)

  // A subject named twice in one shot is still in one shot.
  const doubled = {
    subjects: [{ id: 'x', name: 'x' }],
    shots: [{ unit: 0, durationSeconds: 5, subjectIds: ['x', 'x'] }],
  }
  assert.deepEqual(rankSubjects(doubled), [])
})

// ---------------------------------------------------------------- 25

test("25. no plan's planned image calls exceed 4", async () => {
  const ids = (k: number) => range(1, k).map((i) => `s${i}`)
  assert.deepEqual(
    range(0, 8).map((k) => plannedImageCalls(ids(k))),
    [0, 2, 3, 4, 4, 4, 4, 4, 4],
    'rank 1 costs 2, ranks 2 and 3 cost 1 each, and nothing else is planned (D-027)',
  )

  // Six subjects, every one of them in two or more shots of each plan.
  const six = range(1, 6).map((i) => ({ id: `s${i}`, name: `subject ${i}` }))
  const everywhere = (units: number) => range(0, units - 1).map(() => six.map((s) => s.id))
  const script: FakeScript = {
    planner: [
      { value: answer([10, 10, 10, 10], six, everywhere(4)) },
      { value: answer([7, 7, 7, 7, 6, 6], six, everywhere(6)) },
    ],
    reconciler: twoSurvivors().reconciler,
  }
  const { outcome } = await plan(script)
  assert.equal(rankSubjects(outcome.fork.a).length, 6, 'every subject is eligible')
  assert.equal(outcome.fork.a.plannedImageCalls, 4)
  assert.equal(outcome.fork.b.plannedImageCalls, 4)
})

// ---------------------------------------------------------------- 26

test('26. both plans carry every supplied criterion with the same id and text', async () => {
  const { outcome } = await plan(twoSurvivors())
  const request = planRequest('plan')
  for (const p of [outcome.fork.a, outcome.fork.b]) {
    assert.deepEqual(p.criteria.mustShow, request.criteria.mustShow)
    assert.deepEqual(p.criteria.mustNotShow, request.criteria.mustNotShow)
  }
})

// ---------------------------------------------------------------- 27

test('27. changing the image rate or the video rate changes the estimate', async () => {
  const p = { shots: answerB().shots, plannedImageCalls: 3 }
  const base = estimate(p, S)
  assert.equal(base, 3 * 15 + 40 * 4, 'image calls × image rate + total shot seconds × video rate')
  assert.equal(estimate(p, { ...S, imageRateCents: 16 }), base + 3)
  assert.equal(estimate(p, { ...S, videoRateCentsPerSecond: 5 }), base + 40)

  const { outcome } = await plan(twoSurvivors(), { ...S, imageRateCents: 30 })
  assert.equal(outcome.fork.a.estimateCents, 3 * 30 + 40 * 4)
  assert.equal(outcome.fork.b.estimateCents, 3 * 30 + 40 * 4)
})
