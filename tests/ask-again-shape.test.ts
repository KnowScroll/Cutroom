import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative } from 'node:path'
import { test } from 'node:test'
import { z } from 'zod'
import {
  clipObservation as contractsClip,
  witnessObservation as contractsStill,
  type ModelRole,
} from '@cutroom/contracts'
import { clipObservation, witnessObservation } from '@cutroom/pipeline'
import { SHAPE_PREFACE, minimaxModel } from '@cutroom/providers'
import { withoutBooleanSchemas } from '../packages/providers/src/minimax/model.ts'
import { REPO } from './_repo.ts'
import { recordedFetch, type Sent } from './engine/wire.ts'

// ask-again, Slice 1 — checks 1 and 2 (docs/features/ask-again.md): ONE SHAPE. The witness is asked
// with the gate's own schemas, from `packages/contracts`, so it is shown exactly the rule it is
// judged by (S-156). Before this slice the MiniMax adapter kept its own copy, in which a count was
// any integer: the witness counted uncountable stars −1, and the gate refused the picture.
//
// NOTHING HERE SPENDS: every call is answered by recorded wire or a stub, and the key is a canary.

const KEY = 'canary-not-a-real-key-49'

/** D-006's routing, typed by hand — the table the pins below were computed with. */
const MODELS: Readonly<Record<ModelRole, string>> = {
  planner: 'MiniMax-M2.7',
  reconciler: 'MiniMax-M3',
  witness: 'MiniMax-M3',
  judge: 'MiniMax-M3',
}

// ---------------------------------------------------------------- what did not move, pinned

// THE PINS, computed from the adapter at 046ad37 — before any file of this feature existed — and
// written here (`ask-again`'s Gate review 2, finding 8). Moving the schema must change only the
// rendered shape: the question a picture or a clip is asked, closed sets included, stays byte for
// byte, and a structured call's whole body hashes to what it did.

const CLOSED_SETS = [
  '',
  'Some of these fields take one of a fixed set of values, and nothing else is an answer. Give the value from the set even when a more exact description of what you see is available, and put that description in `ambiguities` instead:',
  '- entities.position: exactly one of "left", "centre", "right"',
  '- entities.prominence: exactly one of "foreground", "midground", "background"',
  '- entities.faceVisible: exactly one of "yes", "partial", "no", "noFace"',
  '- framing: exactly one of "closeUp", "medium", "wide", "extremeWide"',
  '- lighting: exactly one of "bright", "dim", "mixed", "silhouette"',
]

const STILL_QUESTION = [
  'Describe only what is in this picture. You have not been told what it is meant to show, and',
  'nothing you have been told about it exists: describe it as a stranger would.',
  'Name every entity you can see in your own words, with how many there are, where it sits, how',
  'prominent it is, whether a face is visible, whether it is occluded, and whether any part of it',
  'is cut off by the edge of the frame.',
  'Then give the framing, the setting, the lighting, whether any readable text is present, anything',
  'you are unsure of, and anything depicted that is unsafe.',
  ...CLOSED_SETS,
].join('\n')

const CLIP_QUESTION = [
  'Describe only what is in this clip. You have not been told what it is meant to show, and',
  'nothing you have been told about it exists: describe it as a stranger would.',
  'Name every entity you can see in your own words, with how many there are, where it sits, how',
  'prominent it is, whether a face is visible, whether it is occluded, and whether any part of it',
  'is cut off by the edge of the frame.',
  'Then give the framing, the setting, the lighting, whether any readable text is present, anything',
  'you are unsure of, and anything depicted that is unsafe.',
  'Then list what happens: each action, which entity does it, and whether it completes within the',
  'clip; and the order the events happen in.',
  ...CLOSED_SETS,
].join('\n')

/** sha256 of this structured call's whole body, at 046ad37. */
const STRUCTURED_BODY_SHA256 = '35c9fab7c8d7e574d102857f02c00b0afc2feafe7c88a21cff92a035065f1c1c'
const UNITS = z.strictObject({ units: z.array(z.array(z.number().int().nonnegative())) })

// ---------------------------------------------------------------- helpers

/** What one request carried, parsed. */
function body(sent: Sent | undefined): Record<string, unknown> {
  assert.ok(sent?.body !== undefined, 'the adapter sent no body')
  return JSON.parse(sent.body) as Record<string, unknown>
}

type Part = { type: string; text?: string }

/** The content parts of a vision call's one message. */
function partsOf(asked: Record<string, unknown>): Part[] {
  const messages = asked.messages as Array<{ content: unknown }>
  const parts = messages[0]?.content
  assert.ok(Array.isArray(parts), 'a vision call sent no parts')
  return parts as Part[]
}

/** The schema as this wire is asked for it: the gate's, rendered and sanitised (S-130, S-131). */
const asked = (schema: z.ZodType<unknown>) =>
  withoutBooleanSchemas(z.toJSONSchema(schema, { io: 'input', unrepresentable: 'any' })) as Record<
    string,
    unknown
  >

/** A picture and a clip on this machine, for a vision call to carry. */
function media() {
  const dir = mkdtempSync(join(tmpdir(), 'cutroom-ask-again-'))
  const picture = join(dir, 'shot-1.png')
  const clip = join(dir, 'take-1.mp4')
  writeFileSync(picture, Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex'))
  writeFileSync(clip, Buffer.from('0000001c667479706d70343200000001', 'hex'))
  return {
    picture: { pictureId: 'a1-shot-1-single', path: picture },
    clip: { takeId: 'a1-shot-1-take-1', path: clip },
    clean: () => rmSync(dir, { recursive: true, force: true }),
  }
}

type Node = Record<string, unknown>
const at = (schema: Node, ...path: string[]): Node =>
  path.reduce((node, key) => (node[key] as Node) ?? {}, schema)

// ---------------------------------------------------------------- 1

test("1. the MiniMax adapter asks with the gate's own schemas: an observe body's response_format schema and its shape part are exactly z.toJSONSchema(witnessObservation) — clipObservation for a clip — sanitised as S-131 says, so count is exclusiveMinimum 0, label minLength 1 and every object additionalProperties false; the observe question part is byte for byte, and a structured body hashes to, what they were at 046ad37, written into the test; and an answer the gate refuses — a count of −1, on recorded wire — comes back from observe as its value, never thrown", async () => {
  const files = media()
  try {
    for (const [what, fixture, schema, question] of [
      ['still', 'minimax-chat-vision', witnessObservation, STILL_QUESTION],
      ['clip', 'minimax-chat-clip', clipObservation, CLIP_QUESTION],
    ] as const) {
      const wire = recordedFetch([fixture])
      const port = minimaxModel({ key: KEY, models: MODELS, fetch: wire.fetch })
      if (what === 'still') await port.observe({ picture: files.picture, temperature: 0 })
      else await port.observe({ clip: files.clip, temperature: 0 })

      const sent = body(wire.sent[0])
      const expected = asked(schema as z.ZodType<unknown>)

      // In response_format, and said in the message as the last part (S-130): the same rendering.
      const format = sent.response_format as { json_schema: { schema: unknown } }
      assert.deepEqual(
        format.json_schema.schema,
        expected,
        `${what}: response_format is not the gate's`,
      )
      const parts = partsOf(sent)
      assert.equal(
        parts[parts.length - 1]?.text,
        `${SHAPE_PREFACE}\n${JSON.stringify(expected)}`,
        `${what}: the shape part is not the gate's schema`,
      )

      // The constraints the adapter's old copy did not carry, read off what was SENT.
      const shown = format.json_schema.schema as Node
      const entity = at(shown, 'properties', 'entities', 'items')
      assert.equal(at(entity, 'properties', 'count').exclusiveMinimum, 0, `${what}: count may be 0`)
      assert.equal(at(entity, 'properties', 'label').minLength, 1, `${what}: a label may be empty`)
      assert.equal(shown.additionalProperties, false, `${what}: the observation is not strict`)
      assert.equal(entity.additionalProperties, false, `${what}: an entity is not strict`)
      if (what === 'clip') {
        const action = at(shown, 'properties', 'actions', 'items')
        assert.equal(action.additionalProperties, false, 'an action is not strict')
        assert.equal(
          at(action, 'properties', 'entity').minLength,
          1,
          "an action's entity may be empty",
        )
      }

      // And the question is exactly what it was: two text parts, the first of them this.
      const texts = parts.filter((p) => p.type === 'text')
      assert.equal(texts.length, 2, `${what}: a vision call gained or lost a text part`)
      assert.equal(texts[0]?.text, question, `${what}: the question moved`)
    }

    // A structured call's whole body, unchanged: the stub answers anything, and what was SENT is hashed.
    const sent: string[] = []
    const stub = async (_url: string | URL | Request, init?: RequestInit) => {
      sent.push(String(init?.body))
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: '{}' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 1, completion_tokens: 1 },
          base_resp: { status_code: 0, status_msg: 'success' },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      )
    }
    const planner = minimaxModel({ key: KEY, models: MODELS, fetch: stub as typeof fetch })
    await planner
      .structured({
        role: 'planner',
        prompt: 'Cut these sentences into units.',
        schema: UNITS,
        temperature: 0,
      })
      .catch(() => undefined)
    assert.equal(sent.length, 1)
    assert.equal(
      createHash('sha256')
        .update(sent[0] as string)
        .digest('hex'),
      STRUCTURED_BODY_SHA256,
      'a structured body is not what it was at 046ad37',
    )

    // THE ADAPTER NEVER PARSES (D-041, S-042): the witness's own answer from the measurement, the
    // stars counted −1, comes back as the value — and it is the gate's schema that refuses it.
    const wire = recordedFetch(['minimax-chat-uncountable'])
    const port = minimaxModel({ key: KEY, models: MODELS, fetch: wire.fetch })
    const { value } = await port.observe({ picture: files.picture, temperature: 0 })
    const entities = (value as { entities: Array<{ label: string; count: unknown }> }).entities
    assert.equal(entities[2]?.label, 'scattered stars')
    assert.equal(entities[2]?.count, -1)
    const parsed = witnessObservation.safeParse(value)
    assert.ok(!parsed.success, 'the gate accepted a count of −1')
    assert.deepEqual(
      parsed.error.issues.map((i) => i.path.join('.')),
      ['entities.2.count'],
    )
  } finally {
    files.clean()
  }
})

// ---------------------------------------------------------------- 2

/** Every TypeScript source file under packages/<name>/src, repository-relative, with forward slashes. */
function sources(): string[] {
  const found: string[] = []
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name)
      if (statSync(path).isDirectory()) walk(path)
      else if (name.endsWith('.ts')) found.push(relative(REPO, path).replace(/\\/g, '/'))
    }
  }
  const packages = join(REPO, 'packages')
  for (const name of readdirSync(packages)) {
    const src = join(packages, name, 'src')
    if (statSync(join(packages, name)).isDirectory() && existsDir(src)) walk(src)
  }
  return found.sort()
}

function existsDir(path: string): boolean {
  try {
    return statSync(path).isDirectory()
  } catch {
    return false
  }
}

test("2. the observation's fields are declared once: a scan of packages/*/src finds the declaration faceVisible: z.enum( in packages/contracts/src/observation.ts and nowhere else, and the pipeline's witnessObservation and clipObservation are the contracts' objects by identity", () => {
  const files = sources()
  assert.ok(files.length > 50, `the scan read only ${files.length} files`)
  const declaring = files.filter((file) =>
    readFileSync(join(REPO, file), 'utf8').includes('faceVisible: z.enum('),
  )
  assert.deepEqual(declaring, ['packages/contracts/src/observation.ts'])

  assert.equal(witnessObservation, contractsStill, "the pipeline's still schema is a copy")
  assert.equal(clipObservation, contractsClip, "the pipeline's clip schema is a copy")
})
