import assert from 'node:assert/strict'
import { test } from 'node:test'
import ts from 'typescript'
import { isDeclaration, names, sourceFiles, where, type Name } from './engine/source.ts'

// reel-plan, Slice 2 — the shapes (docs/features/reel-plan.md, checks 1, 3, 4 and 5): what the
// engine's own types are called, where the one default lives, and which names may not exist at all.
// Every check reads live source through TypeScript's parser, scoped to declarations and field names,
// so the prose that explains a rule — here, or in a comment — can never trip it.

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
  assert.deepEqual(members, ['structured'], 'LanguageModelPort carries one call here: structured')
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
