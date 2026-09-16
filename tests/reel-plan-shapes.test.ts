import assert from 'node:assert/strict'
import { test } from 'node:test'
import ts from 'typescript'
import { DEFAULT_PLAN_SETTINGS, planForkSchema, planningAnswer, planReel } from '@cutroom/pipeline'
import { finished, startEngine } from './engine/harness.ts'
import { evenAnswer, planRequest, standIn, twoSurvivors } from './engine/plans.ts'
import { isDeclaration, names, sourceFiles, where, type Name } from './engine/source.ts'

// reel-plan, Slices 2 and 3 — the shapes (docs/features/reel-plan.md, checks 1, 3–7): what the
// engine's own types are called, where the one default lives, which names may not exist at all, and
// the two shapes a model's answer or a fork must have before anything is built on them.
// Checks 1, 3, 4 and 5 read live source through TypeScript's parser, scoped to declarations and field
// names, so the prose that explains a rule — here, or in a comment — can never trip it.

const ENGINE = ['packages', 'apps']

function unwrap(node: ts.Expression): ts.Expression {
  let at = node
  while (
    ts.isAsExpression(at) ||
    ts.isSatisfiesExpression(at) ||
    ts.isParenthesizedExpression(at)
  ) {
    at = at.expression
  }
  return at
}

// ---------------------------------------------------------------- 1

test("1. DEFAULT_PLAN_VARY_ON is declared once, in packages/contracts/src/cinematic.ts, as 'shotCount'", async () => {
  const declared = names(sourceFiles(...ENGINE)).filter(
    (n) => n.name === 'DEFAULT_PLAN_VARY_ON' && isDeclaration(n),
  )
  assert.equal(
    declared.length,
    1,
    `DEFAULT_PLAN_VARY_ON must be declared exactly once; found ${declared.length}: ${declared.map(where).join(', ')}`,
  )
  const [only] = declared as [Name]
  assert.equal(only.file, 'packages/contracts/src/cinematic.ts', where(only))
  assert.ok(ts.isVariableDeclaration(only.node), `${where(only)} is not a constant`)
  const initializer = (only.node as ts.VariableDeclaration).initializer
  assert.ok(initializer !== undefined, `${where(only)} has no value`)
  const value = unwrap(initializer)
  assert.ok(
    ts.isStringLiteral(value) && value.text === 'shotCount',
    `${where(only)} is not the literal 'shotCount' — a value computed elsewhere is a second place to change it`,
  )

  // And it is what a consumer of the package actually receives, as a value the contract accepts.
  const contracts = await import('@cutroom/contracts')
  const { PlanVaryOn } = await import('@cutroom/reel-contract')
  assert.equal(contracts.DEFAULT_PLAN_VARY_ON, 'shotCount')
  assert.equal(PlanVaryOn.parse(contracts.DEFAULT_PLAN_VARY_ON), 'shotCount')
})

// ---------------------------------------------------------------- 3

test('3. no type named StructuredCall is exported as a standalone port', () => {
  const all = names(sourceFiles(...ENGINE))

  // D-084: the structured call is a call ON LanguageModelPort, not a port of its own. Any declaration
  // of the name — exported, aliased on export, or kept local — is the second port it retired.
  const standalone = all.filter((n) => n.name === 'StructuredCall' && n.kind !== 'field')
  assert.deepEqual(standalone.map(where), [], 'StructuredCall is declared as a thing of its own')

  // Without the port, the line above passes over nothing.
  const ports = all.filter((n) => n.name === 'LanguageModelPort' && n.kind === 'interface')
  assert.deepEqual(
    ports.map((n) => n.file),
    ['packages/contracts/src/model.ts'],
    'LanguageModelPort must be declared once, as an interface in packages/contracts/src/model.ts',
  )
  const port = (ports[0] as Name).node as ts.InterfaceDeclaration
  const members = port.members.map((m) => m.name && ts.isIdentifier(m.name) && m.name.text)
  // reel-stills' Slice 1 added `observe` and `compare` (S-037, S-049). The list stays exact: a
  // fourth call, or a picture reaching the model by a route other than these two, still fails
  // here. What D-084 forbids is a call becoming a PORT of its own, which the line above asserts.
  assert.deepEqual(
    members,
    ['structured', 'observe', 'compare'],
    'LanguageModelPort carries three calls: structured, observe and compare',
  )
})

// ---------------------------------------------------------------- 4

test('4. no type named ScriptView exists in the engine repository', () => {
  // The whole repository's code, not only its packages: a narrowed script view kept in a test or a
  // script is still D-085's guard against fields that never arrive (D-103).
  const all = names(sourceFiles('packages', 'apps', 'tests', 'scripts'))

  // A scan that reads nothing passes everything; it must at least see the contract's request type.
  assert.ok(
    all.some((n) => n.name === 'SubmitRequest' && n.file.startsWith('packages/reel-contract/')),
    'the scan found no SubmitRequest in packages/reel-contract, so it is not reading source',
  )

  const found = all.filter((n) => n.name === 'ScriptView')
  assert.deepEqual(found.map(where), [], 'ScriptView is D-085, retired by D-103')
})

// ---------------------------------------------------------------- 5

const FORBIDDEN = ['source', 'sources', 'truthState', 'claimText', 'exposure', 'beat', 'beats']

/** `truthState`, `TruthState` and a column's `truth_state` are one name. */
const fold = (name: string) => name.replace(/_/g, '').toLowerCase()

test('5. no field or type in packages/ or apps/ is named source, sources, truthState, claimText, exposure, beat or beats', () => {
  const all = names(sourceFiles(...ENGINE))
  assert.ok(
    all.some((n) => n.name === 'claimIds' && n.kind === 'field'),
    'the scan found no claimIds field in the contract, so it is not reading fields',
  )

  const forbidden = new Set(FORBIDDEN.map(fold))
  const found = all.filter((n) => forbidden.has(fold(n.name)))
  assert.deepEqual(
    found.map(where),
    [],
    'D-096 keeps sources, claim text, truth states and exposure in KnowScroll; D-070 dropped beats',
  )
})

// ---------------------------------------------------------------- 6

test("6. a PlanFork whose axis is absent or not in the enum fails validation, and every stored plan row carries its fork's axis", async () => {
  const outcome = await planReel(
    planRequest('r6-fork'),
    standIn(twoSurvivors()),
    300,
    DEFAULT_PLAN_SETTINGS,
  )
  assert.equal(outcome.kind, 'selected', JSON.stringify(outcome))
  const { fork } = outcome as Extract<typeof outcome, { kind: 'selected' }>
  assert.equal(
    planForkSchema.safeParse(fork).success,
    true,
    'the fork planReel returned does not validate',
  )

  const absent: Record<string, unknown> = { ...fork }
  delete absent.axis
  for (const [what, candidate] of Object.entries({
    absent,
    undefined: { ...fork, axis: undefined },
    null: { ...fork, axis: null },
    'not in the enum': { ...fork, axis: 'sideways' },
    'differently spelt': { ...fork, axis: 'shotcount' },
  })) {
    assert.equal(
      planForkSchema.safeParse(candidate).success,
      false,
      `a fork whose axis is ${what} validated`,
    )
  }
  for (const axis of ['shotCount', 'order', 'canonicalSubject', 'angle']) {
    assert.equal(
      planForkSchema.safeParse({ ...fork, axis }).success,
      true,
      `axis ${axis} was refused`,
    )
  }

  // Stored: a run with two survivors completes with an estimate, and each plan row carries the axis.
  const engine = await startEngine({ worker: true, script: twoSurvivors() })
  try {
    const submitted = await engine.http.submit(planRequest('r6'))
    const runId = String(submitted.json.runId)
    await finished(engine, runId)

    const rows = engine.query<{
      role: string
      axis: string
      unit_count: number
      selected: number
      estimate_cents: number
    }>(
      'SELECT role, axis, unit_count, selected, estimate_cents FROM plan WHERE run_id = ? ORDER BY role',
      runId,
    )
    assert.deepEqual(
      rows.map((r) => [r.role, r.axis, r.unit_count]),
      [
        ['a', 'shotCount', 4],
        ['b', 'shotCount', 6],
      ],
      'the run does not store both plans of its fork, each with the axis',
    )
    const selected = rows.filter((r) => r.selected === 1)
    assert.equal(selected.length, 1, 'a completed run has exactly one selected plan')

    const result = (await engine.http.result(runId)).json
    assert.deepEqual(result, {
      contractVersion: 1,
      runId,
      requestId: 'r6',
      status: 'completed',
      until: 'plan',
      estimateCents: selected[0]?.estimate_cents,
      costCents: 0,
    })
  } finally {
    await engine.stop()
  }
})

// ---------------------------------------------------------------- 7

test("7. the planning call's schema refuses an answer with a unit that has two shots or none", async () => {
  const schema = planningAnswer(4)
  const withUnits = (units: number[]) => ({
    ...evenAnswer(4),
    shots: units.map((unit) => ({ unit, durationSeconds: 10, subjectIds: ['river'] })),
  })
  assert.equal(
    schema.safeParse(withUnits([0, 1, 2, 3])).success,
    true,
    'one shot per unit was refused',
  )
  assert.equal(
    schema.safeParse(withUnits([3, 1, 0, 2])).success,
    true,
    'the order shots are listed in is not a unit',
  )
  for (const [what, units] of Object.entries({
    'two shots for unit 1': [0, 1, 1, 2, 3],
    'no shot for unit 2': [0, 1, 3],
    'two for unit 2 and none for unit 3': [0, 1, 2, 2],
    'a unit that does not exist': [0, 1, 2, 3, 4],
    'no shots at all': [],
  })) {
    assert.equal(schema.safeParse(withUnits(units)).success, false, `${what} was accepted`)
  }

  // What else makes an answer not a plan (S-023): a subject named twice, a shot showing a subject
  // the answer never names, and a duration that is not whole seconds.
  const named = evenAnswer(4)
  for (const [what, candidate] of Object.entries({
    'a subject named twice': { ...named, subjects: [...named.subjects, ...named.subjects] },
    'an unnamed subject': { ...named, subjects: [] },
    'a duration in part-seconds': {
      ...named,
      shots: named.shots.map((s, i) => (i === 0 ? { ...s, durationSeconds: 9.5 } : s)),
    },
  })) {
    assert.equal(schema.safeParse(candidate).success, false, `${what} was accepted`)
  }

  // The stand-in parses its answer under the schema it was asked for, so a run cannot plan from one.
  const script = { planner: [{ value: withUnits([0, 1, 1, 2, 3]) }, { value: evenAnswer(6) }] }
  await assert.rejects(
    planReel(planRequest('r7'), standIn(script), 300, DEFAULT_PLAN_SETTINGS),
    'a planning answer with two shots for one unit became a plan',
  )
})
