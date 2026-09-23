import assert from 'node:assert/strict'
import { test } from 'node:test'
import { z } from 'zod'
import { Spent, Unavailable, type ClipRef, type LanguageModelPort } from '@cutroom/contracts'
import { clipObservation, witnessObservation } from '@cutroom/pipeline'
import { gate4 } from '../packages/pipeline/src/gates/gate4.ts'
import { askWitness } from '../packages/pipeline/src/gates/witness.ts'

// second-ask, Slice 1 — checks 1 to 5 (docs/features/second-ask.md): the gate, with a hand-written
// port. A refused witness answer is asked for once more, with the same argument object; a second
// refusal fails with today's words and the second answer's issues; a throw is never asked again;
// and the two schemas that refuse are exactly what they were (S-146, S-147, S-042, S-144).
//
// Gate 1 is not run here — it needs a sensor and a measure beside the model — and its wiring is
// proven through the worker by checks 6 to 8, where check 7 asserts its exact words.

// ---------------------------------------------------------------- answers

const entity = {
  label: 'a brass lamp',
  count: 1,
  position: 'centre',
  prominence: 'foreground',
  faceVisible: 'noFace',
  occluded: false,
  clippedByEdge: false,
}

/** A still's observation that parses. */
const still = {
  entities: [entity],
  framing: 'medium',
  setting: 'a lamp room at night',
  lighting: 'dim',
  readableTextPresent: false,
  ambiguities: [],
  unsafeDepictions: [],
}

/** A clip's observation that parses: a still's fields and the temporal block. */
const clip = { ...still, actions: [], eventOrder: [] }

/** Refused on `lighting` only — the value S-144 saw for `position`, put where it cannot parse. */
const badLighting = { ...clip, lighting: 'scattered between the tall pillars' }

/** Refused on `entities.0.position` only. */
const badPosition = { ...clip, entities: [{ ...entity, position: 'bottom half' }] }

// ---------------------------------------------------------------- the hand-written port

type Answer = { value: unknown } | { throws: unknown }

interface Seen {
  /** The argument exactly as passed, for identity. */
  argument: unknown
  /** A copy taken AT CALL TIME, so a key added for one ask and removed after it is still seen. */
  snapshot: unknown
}

/** An `observe` that answers from a list, in order, and records every call as it is made. */
function observer(answers: Answer[]) {
  const seen: Seen[] = []
  const observe = async (argument: unknown) => {
    seen.push({ argument, snapshot: structuredClone(argument) })
    const answer = answers[seen.length - 1]
    if (answer === undefined) throw new Error(`no answer scripted for call ${seen.length}`)
    if ('throws' in answer) throw answer.throws
    return { value: answer.value }
  }
  return { observe, seen }
}

/** A model port whose `observe` is the observer's, and which throws on anything else. */
function portOf(observe: (argument: unknown) => Promise<{ value: unknown }>): LanguageModelPort {
  const never = () => {
    throw new Error('only observe is called by Gate 4')
  }
  return {
    structured: never,
    compare: never,
    judgeCut: never,
    readText: never,
    observe: async (call) => {
      const { value } = await observe(call)
      return {
        value,
        receipt: {
          model: 'hand-written',
          role: 'witness',
          call: 'observe',
          temperature: 0,
          usage: { inputTokens: 0, outputTokens: 0 },
          fake: true,
          pictureIds: [],
          takeIds: [],
        },
      }
    },
  }
}

const TAKE: ClipRef = { takeId: 'a1-shot-2-take-1', path: 'clips/a1-shot-2-take-1.mp4' } as ClipRef
const PICTURE = { pictureId: 'a1-shot-0-a', path: 'pictures/a1-shot-0-a.png' }

const askStill = (observe: (c: unknown) => Promise<{ value: unknown }>, call: unknown) =>
  askWitness(call, observe, witnessObservation, PICTURE.pictureId, 'an observation')

// ---------------------------------------------------------------- 1

test('1. a witness answer that parses is asked for once: askWitness and gate4 each make exactly one observe call and return its observation', async () => {
  const onStill = observer([{ value: still }])
  const call = { picture: PICTURE, temperature: 0 }
  assert.deepEqual(await askStill(onStill.observe, call), still)
  assert.equal(onStill.seen.length, 1)

  const onClip = observer([{ value: clip }])
  const { observation, verdict } = await gate4(TAKE, portOf(onClip.observe))
  assert.deepEqual(observation, clip)
  assert.equal(verdict.outcome, 'accept')
  assert.equal(onClip.seen.length, 1)
})

// ---------------------------------------------------------------- 2

test('2. a first answer the schema refuses is asked for once more with the SAME argument object — identical by reference and, snapshotted at each call, holding only the picture or clip ref and temperature 0 — and the second answer, parsing, is the observation returned', async () => {
  const onStill = observer([{ value: { ...still, lighting: 'top' } }, { value: still }])
  const call = { picture: PICTURE, temperature: 0 }
  assert.deepEqual(await askStill(onStill.observe, call), still)
  assert.equal(onStill.seen.length, 2)
  assert.equal(onStill.seen[0]?.argument, call, 'the first ask is not the call the gate built')
  assert.equal(onStill.seen[1]?.argument, call, 'the second ask is not the same object')
  for (const { snapshot } of onStill.seen) {
    assert.deepEqual(snapshot, { picture: PICTURE, temperature: 0 })
  }

  const onClip = observer([{ value: badPosition }, { value: clip }])
  const { observation } = await gate4(TAKE, portOf(onClip.observe))
  assert.deepEqual(observation, clip)
  assert.equal(onClip.seen.length, 2)
  assert.equal(onClip.seen[0]?.argument, onClip.seen[1]?.argument, 'Gate 4 built two arguments')
  for (const { snapshot } of onClip.seen) {
    assert.deepEqual(snapshot, { clip: { takeId: TAKE.takeId, path: TAKE.path }, temperature: 0 })
  }
})

// ---------------------------------------------------------------- 3

test("3. two refused answers, refused on DIFFERENT paths (lighting, then entities.0.position), throw after exactly two observe calls with exactly \"the witness's answer for <id> is not <noun>: \" followed by the second's issues in today's format; the first's path appears nowhere in the message; no third call is made", async () => {
  // A third answer that WOULD parse, so a third ask would return rather than throw.
  const onClip = observer([{ value: badLighting }, { value: badPosition }, { value: clip }])
  await assert.rejects(gate4(TAKE, portOf(onClip.observe)), (error: Error) => {
    const expected = clipObservation.safeParse(badPosition)
    assert.ok(!expected.success)
    const issues = expected.error.issues
      .map((i) => `${i.path.join('.') || '(answer)'}: ${i.message}`)
      .join('; ')
    assert.equal(
      error.message,
      `the witness's answer for ${TAKE.takeId} is not a clip observation: ${issues}`,
    )
    assert.match(error.message, /entities\.0\.position: /)
    assert.doesNotMatch(error.message, /lighting/)
    return true
  })
  assert.equal(onClip.seen.length, 2)

  const onStill = observer([
    { value: { ...still, lighting: 'top' } },
    { value: { ...still, framing: 'bottom half' } },
    { value: still },
  ])
  await assert.rejects(
    askStill(onStill.observe, { picture: PICTURE, temperature: 0 }),
    (error: Error) => {
      assert.match(
        error.message,
        /^the witness's answer for a1-shot-0-a is not an observation: framing: /,
      )
      assert.doesNotMatch(error.message, /lighting/)
      return true
    },
  )
  assert.equal(onStill.seen.length, 2)
})

// ---------------------------------------------------------------- 4

test('4. an observe that throws — a plain fault, Unavailable, or Spent — on the FIRST ask is called once, and on the SECOND ask after a refusal is called twice; the same error object comes out unchanged either way', async () => {
  const errors = [
    new Error('a request that was wrong'),
    new Unavailable('the witness call answered nothing within 600000 ms'),
    new Spent({ port: 'model', model: 'MiniMax-M3', costCents: 0, detail: 'cut off mid-JSON' }),
  ]
  for (const error of errors) {
    const first = observer([{ throws: error }, { value: clip }])
    await assert.rejects(gate4(TAKE, portOf(first.observe)), (thrown) => thrown === error)
    assert.equal(first.seen.length, 1, `${error.name} on the first ask was asked again`)

    const second = observer([{ value: badLighting }, { throws: error }, { value: clip }])
    await assert.rejects(gate4(TAKE, portOf(second.observe)), (thrown) => thrown === error)
    assert.equal(second.seen.length, 2, `${error.name} on the second ask was asked a third time`)
  }
})

// ---------------------------------------------------------------- 5

/** The entity every observation's `entities` holds, as JSON Schema — typed here, never generated. */
const ENTITY_SCHEMA = {
  type: 'object',
  properties: {
    label: { type: 'string', minLength: 1 },
    count: { type: 'integer', exclusiveMinimum: 0, maximum: 9007199254740991 },
    position: { type: 'string', enum: ['left', 'centre', 'right'] },
    prominence: { type: 'string', enum: ['foreground', 'midground', 'background'] },
    faceVisible: { type: 'string', enum: ['yes', 'partial', 'no', 'noFace'] },
    occluded: { type: 'boolean' },
    clippedByEdge: { type: 'boolean' },
  },
  required: [
    'label',
    'count',
    'position',
    'prominence',
    'faceVisible',
    'occluded',
    'clippedByEdge',
  ],
  additionalProperties: false,
}

const STILL_PROPERTIES = {
  entities: { type: 'array', items: ENTITY_SCHEMA },
  framing: { type: 'string', enum: ['closeUp', 'medium', 'wide', 'extremeWide'] },
  setting: { type: 'string' },
  lighting: { type: 'string', enum: ['bright', 'dim', 'mixed', 'silhouette'] },
  readableTextPresent: { type: 'boolean' },
  ambiguities: { type: 'array', items: { type: 'string' } },
  unsafeDepictions: { type: 'array', items: { type: 'string' } },
}

const STILL_REQUIRED = [
  'entities',
  'framing',
  'setting',
  'lighting',
  'readableTextPresent',
  'ambiguities',
  'unsafeDepictions',
]

const DRAFT = 'https://json-schema.org/draft/2020-12/schema'

test('5. the two schemas are exactly what they were: witnessObservation\'s and clipObservation\'s full JSON Schema equal a hand-typed snapshot — every closed set (framing, lighting, entities.position, entities.prominence, entities.faceVisible), every strict object, every minimum — and "center", "top" or a phrase answered twice fails the gate rather than being mapped into a set', async () => {
  assert.deepEqual(z.toJSONSchema(witnessObservation), {
    $schema: DRAFT,
    type: 'object',
    properties: STILL_PROPERTIES,
    required: STILL_REQUIRED,
    additionalProperties: false,
  })
  assert.deepEqual(z.toJSONSchema(clipObservation), {
    $schema: DRAFT,
    type: 'object',
    properties: {
      ...STILL_PROPERTIES,
      actions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            entity: { type: 'string', minLength: 1 },
            verb: { type: 'string', minLength: 1 },
            completes: { type: 'boolean' },
          },
          required: ['entity', 'verb', 'completes'],
          additionalProperties: false,
        },
      },
      eventOrder: { type: 'array', items: { type: 'string' } },
    },
    required: [...STILL_REQUIRED, 'actions', 'eventOrder'],
    additionalProperties: false,
  })

  // A near-miss is refused, twice, and never mapped into the set.
  const nearMisses = [
    { ...clip, entities: [{ ...entity, position: 'center' }] },
    { ...clip, entities: [{ ...entity, position: 'top' }] },
    { ...clip, entities: [{ ...entity, position: 'scattered between the tall pillars' }] },
  ]
  for (const answer of nearMisses) {
    const port = observer([{ value: answer }, { value: answer }])
    await assert.rejects(
      gate4(TAKE, portOf(port.observe)),
      /is not a clip observation: entities\.0\.position: /,
    )
    assert.equal(port.seen.length, 2)
  }
})
