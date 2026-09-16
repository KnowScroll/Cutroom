import assert from 'node:assert/strict'
import { test } from 'node:test'
import { GATE_ORDER, pictureEntry, witnessObservation } from '@cutroom/pipeline'
import { entity, observation } from './engine/stills.ts'

// reel-stills, Slice 3 — checks 5, 6 and 7 (docs/features/reel-stills.md): the gates' order, the
// shape a witness's answer must have, and the shape a canonical picture's entry must have. Each is
// asserted as data or by parsing, never by reading the words that describe it.

type Schema = {
  safeParse(x: unknown): { success: boolean; error?: { issues: Array<{ path: PropertyKey[] }> } }
}
const ok = (s: Schema, x: unknown) => s.safeParse(x).success

/** The paths of every issue a refused value raised, joined by dots. */
const issuesOf = (s: Schema, x: unknown) =>
  (s.safeParse(x).error?.issues ?? []).map((i) => i.path.map(String).join('.'))

// ---------------------------------------------------------------- 5

test("5. GATE_ORDER equals ['0', '1', '1S'], asserted as data", () => {
  assert.ok(Array.isArray(GATE_ORDER), 'GATE_ORDER is not a list')
  assert.deepEqual([...GATE_ORDER], ['0', '1', '1S'])
})

// ---------------------------------------------------------------- 6

/** Two entities, so a schema that checks only the first entity is not enough. */
const valid = () =>
  observation([entity('a red disc of wax'), entity('three men in mail', { count: 3 })])

test("6. the observation schema requires clippedByEdge on every entity and refuses actions or eventOrder on a still's observation", () => {
  assert.ok(ok(witnessObservation, valid()), 'a valid still observation was refused')

  for (const index of [0, 1]) {
    const missing = valid() as unknown as { entities: Array<Record<string, unknown>> }
    delete missing.entities[index]?.clippedByEdge
    assert.ok(
      !ok(witnessObservation, missing),
      `entity ${index} without clippedByEdge was accepted`,
    )
    assert.ok(
      issuesOf(witnessObservation, missing).some((p) => p === `entities.${index}.clippedByEdge`),
      `the refusal does not name entities.${index}.clippedByEdge: ${issuesOf(witnessObservation, missing).join(', ')}`,
    )

    const notABoolean = valid() as unknown as { entities: Array<Record<string, unknown>> }
    ;(notABoolean.entities[index] as Record<string, unknown>).clippedByEdge = 'no'
    assert.ok(
      !ok(witnessObservation, notABoolean),
      `clippedByEdge 'no' was accepted on entity ${index}`,
    )
  }

  // D-041: the temporal block is absent on a still — present at all, even empty, is refused.
  const temporal: Array<[string, unknown]> = [
    ['actions', [{ entity: 'a man', verb: 'presses', completes: true }]],
    ['actions', []],
    ['eventOrder', ['the seal is pressed']],
    ['eventOrder', []],
  ]
  for (const [field, value] of temporal) {
    const withTime = { ...valid(), [field]: value }
    assert.ok(
      !ok(witnessObservation, withTime),
      `a still's observation carrying ${field} ${JSON.stringify(value)} was accepted`,
    )
  }
})

// ---------------------------------------------------------------- 7

/** The canonical's entry for shot 0 of the 6-unit plan, as Gate 2 describes an entry. */
const canonical = () => ({
  role: 'canonical',
  shotId: 'shot-0',
  style: { id: 'style-1', version: 2, text: 'quiet, precise, natural light' },
  subjects: ['a wax seal'],
  sentences: [
    'In 1215 a charter was sealed at Runnymede.',
    'It bound a king to the law of the land.',
  ],
  mustShow: [{ id: 'show-seal', text: 'a wax seal on parchment' }],
  mustNotShow: [{ id: 'never-person', text: 'any real living person' }],
  aspectRatio: '9:16',
  varyOn: 'framing',
})

test('7. a canonical entry without a declared axis fails validation', () => {
  assert.ok(ok(pictureEntry, canonical()), 'a canonical entry declaring its axis was refused')

  const undeclared: Record<string, unknown> = canonical()
  delete undeclared.varyOn
  assert.ok(!ok(pictureEntry, undeclared), 'a canonical entry with no axis was accepted')
  assert.ok(
    !ok(pictureEntry, { ...canonical(), varyOn: undefined }),
    'a canonical entry whose axis is undefined was accepted',
  )
  // D-032: one axis, declared — framing. A seed is D-032's rejected seed-only variation.
  for (const axis of ['seed', '', 'angle']) {
    assert.ok(
      !ok(pictureEntry, { ...canonical(), varyOn: axis }),
      `a canonical entry declaring the axis '${axis}' was accepted`,
    )
  }

  // A derived picture is made once and has nothing to vary: its entry needs no axis.
  const derived: Record<string, unknown> = { ...canonical(), role: 'derived', shotId: 'shot-2' }
  delete derived.varyOn
  assert.ok(ok(pictureEntry, derived), 'a derived entry with no axis was refused')
})
