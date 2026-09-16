import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Gate0Condition, Plan } from '@cutroom/contracts'
import { DEFAULT_PLAN_SETTINGS, GATE_ORDER, gate0 } from '@cutroom/pipeline'
import { passingPlan, planRequest } from './engine/plans.ts'
import { importSpecifiers, importedNames, isDeclaration, names } from './engine/source.ts'

// reel-plan, Slice 3 — Gate 0 (docs/features/reel-plan.md, checks 29–33): counting only, no model
// call, all four conditions checked on every plan, every failure recorded (D-063, D-111, D-114).

const S = DEFAULT_PLAN_SETTINGS
const CAP = 300
const request = planRequest('gate-0')

const fails = (...failed: Gate0Condition[]) => ({ outcome: 'fail', failed })
const ACCEPT = { outcome: 'accept', failed: [] }

/** A passing plan with its shots replaced: one per unit given, with these durations. */
function shaped(units: number[][], durations: number[]): Plan {
  return {
    ...passingPlan(request),
    units,
    shots: durations.map((durationSeconds, unit) => ({ unit, durationSeconds, subjectIds: [] })),
  }
}

// ---------------------------------------------------------------- 29

test("29. GATE_ORDER equals ['0'], asserted as data", () => {
  assert.ok(Array.isArray(GATE_ORDER), 'GATE_ORDER is not a list')
  assert.deepEqual([...GATE_ORDER], ['0'])
})

// ---------------------------------------------------------------- 30

test('30. gates/gate0.ts imports no port type, no provider and no model client', () => {
  const ports = names(['packages/contracts/src/model.ts'])
    .filter(isDeclaration)
    .map((n) => n.name)
  assert.ok(ports.includes('LanguageModelPort'), 'the scan found no LanguageModelPort')

  for (const file of [
    'packages/pipeline/src/gates/gate0.ts',
    'packages/pipeline/src/gates/index.ts',
  ]) {
    const imported = [...importedNames(file).keys()]
    assert.deepEqual(
      imported.filter((n) => ports.includes(n)),
      [],
      `${file} imports a port type`,
    )
    assert.deepEqual(
      importSpecifiers(file).filter((s) => /providers|^ai$|^ai\/|^@ai-sdk\/|model/.test(s)),
      [],
      `${file} imports a provider, a model client or the model file`,
    )
  }

  // And Gate 0 is answered on the spot: given no port, returning a verdict rather than a promise.
  const verdict = gate0(passingPlan(request), request, CAP, S)
  assert.equal(verdict instanceof Promise, false)
  assert.deepEqual(verdict, ACCEPT)
})

// ---------------------------------------------------------------- 31

test("31. each of Gate 0's conditions rejects a plan built to fail exactly that one — an uncovered claim; a removed or altered criterion; 3 shots, 7 shots, or a shot of 4 or 16 seconds; an estimate one cent above the cap", () => {
  const base = passingPlan(request)
  assert.deepEqual(
    gate0(base, request, CAP, S),
    ACCEPT,
    'the base plan must pass, or nothing below proves anything',
  )

  // Coverage: sentence 7, the only one referencing c4, is in no shot's unit.
  const uncovered = shaped([[0, 1], [2, 3], [4, 5], [6]], [10, 10, 10, 10])
  assert.deepEqual(gate0(uncovered, request, CAP, S), fails('coverage'), 'an uncovered claim')

  // Criteria: removed from either list, altered, or moved to the other list.
  const removedShow = {
    ...base,
    criteria: { ...base.criteria, mustShow: base.criteria.mustShow.slice(1) },
  }
  const removedNot = {
    ...base,
    criteria: { ...base.criteria, mustNotShow: base.criteria.mustNotShow.slice(0, 1) },
  }
  const altered = {
    ...base,
    criteria: {
      ...base.criteria,
      mustNotShow: base.criteria.mustNotShow.map((c) =>
        c.id === 'n1' ? { ...c, text: 'any real person' } : c,
      ),
    },
  }
  const renamed = {
    ...base,
    criteria: {
      ...base.criteria,
      mustShow: base.criteria.mustShow.map((c) => ({ ...c, id: `${c.id}x` })),
    },
  }
  const moved = {
    ...base,
    criteria: {
      mustShow: base.criteria.mustShow.slice(1),
      mustNotShow: [...base.criteria.mustNotShow, ...base.criteria.mustShow.slice(0, 1)],
    },
  }
  for (const [what, p] of Object.entries({ removedShow, removedNot, altered, renamed, moved })) {
    assert.deepEqual(gate0(p, request, CAP, S), fails('criteria'), what)
  }
  // Adding a criterion is not weakening one.
  const added = {
    ...base,
    criteria: {
      ...base.criteria,
      mustShow: [
        ...base.criteria.mustShow,
        { id: 'k1', text: 'low sun', type: 'presence' as const },
      ],
    },
  }
  assert.deepEqual(gate0(added, request, CAP, S), ACCEPT, 'an added criterion')

  // Shape: shot count, and a shot's own length — each total kept inside 35–45 s.
  const shapes: Record<string, Plan> = {
    'three shots': shaped(
      [
        [0, 1, 2],
        [3, 4, 5],
        [6, 7],
      ],
      [13, 13, 13],
    ),
    'seven shots': shaped([[0, 1], [2], [3], [4], [5], [6], [7]], [6, 6, 6, 6, 6, 6, 6]),
    'a 4-second shot': shaped(base.units as number[][], [4, 12, 12, 12]),
    'a 16-second shot': shaped(base.units as number[][], [16, 8, 8, 8]),
  }
  for (const [what, p] of Object.entries(shapes)) {
    assert.deepEqual(gate0(p, request, CAP, S), fails('shape'), what)
  }
  // …and their passing neighbours: 4 and 6 shots, 5 and 15 seconds.
  const neighbours: Record<string, Plan> = {
    'six shots': shaped([[0, 1], [2, 3], [4], [5], [6], [7]], [7, 7, 7, 7, 6, 6]),
    'a 5-second shot': shaped(base.units as number[][], [5, 11, 12, 12]),
    'a 15-second shot': shaped(base.units as number[][], [15, 9, 8, 8]),
  }
  for (const [what, p] of Object.entries(neighbours)) {
    assert.deepEqual(gate0(p, request, CAP, S), ACCEPT, what)
  }

  // Cost: one cent above the cap, against the estimate on the plan; at the cap passes.
  assert.deepEqual(
    gate0({ ...base, estimateCents: CAP + 1 }, request, CAP, S),
    fails('cost'),
    'one cent over',
  )
  assert.deepEqual(gate0({ ...base, estimateCents: CAP }, request, CAP, S), ACCEPT, 'at the cap')
  assert.deepEqual(gate0(base, request, 204, S), fails('cost'), 'the cap is the one given')
})

// ---------------------------------------------------------------- 32

test('32. plans totalling 34 and 46 seconds fail on shape and plans totalling 35 and 45 do not; changing the setting changes which', () => {
  const units = passingPlan(request).units as number[][]
  const totals: Record<number, Plan> = {
    34: shaped(units, [8, 8, 9, 9]),
    35: shaped(units, [8, 9, 9, 9]),
    45: shaped(units, [11, 11, 11, 12]),
    46: shaped(units, [11, 11, 12, 12]),
  }
  const verdicts = (settings: typeof S) =>
    Object.fromEntries(
      Object.entries(totals).map(([t, p]) => [t, gate0(p, request, CAP, settings).failed]),
    )

  assert.deepEqual(verdicts(S), { 34: ['shape'], 35: [], 45: [], 46: ['shape'] })
  assert.deepEqual(verdicts({ ...S, totalSecondsBounds: [30, 50] }), {
    34: [],
    35: [],
    45: [],
    46: [],
  })
  assert.deepEqual(verdicts({ ...S, totalSecondsBounds: [36, 44] }), {
    34: ['shape'],
    35: ['shape'],
    45: ['shape'],
    46: ['shape'],
  })
})

// ---------------------------------------------------------------- 33

test('33. a plan failing several conditions has every one recorded in its verdict', () => {
  const base = passingPlan(request)
  // Three shots, sentence 7 in none of them, a criterion removed, and a cent over the cap.
  const everything: Plan = {
    ...shaped([[0, 1, 2], [3, 4, 5], [6]], [13, 13, 13]),
    criteria: { ...base.criteria, mustShow: [] },
    estimateCents: CAP + 1,
  }
  assert.deepEqual(
    gate0(everything, request, CAP, S),
    fails('coverage', 'criteria', 'shape', 'cost'),
  )

  const shapeAndCost = {
    ...shaped(base.units as number[][], [4, 12, 12, 12]),
    estimateCents: CAP + 1,
  }
  assert.deepEqual(gate0(shapeAndCost, request, CAP, S), fails('shape', 'cost'))

  const coverageAndCriteria = {
    ...shaped([[0, 1], [2, 3], [4, 5], [6]], [10, 10, 10, 10]),
    criteria: { ...base.criteria, mustNotShow: [] },
  }
  assert.deepEqual(gate0(coverageAndCriteria, request, CAP, S), fails('coverage', 'criteria'))
})
