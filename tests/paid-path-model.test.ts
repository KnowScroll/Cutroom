import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { z } from 'zod'
import type { ClipRef, ModelRole, PictureRef } from '@cutroom/contracts'
import { DEFAULT_PLAN_SETTINGS } from '@cutroom/pipeline'
import {
  DEFAULT_ANSWER_TOKENS,
  DEFAULT_REASONING_TOKENS,
  MINIMAX_BASE_URL,
  SHAPE_PREFACE,
  Unavailable,
  echoedTheSchema,
  minimaxModel,
  unfenced,
} from '@cutroom/providers'
import { recordedFetch, type Sent } from './engine/wire.ts'

// paid-path, Slice 3 — checks 6, 7 and 8 (docs/features/paid-path.md): the MiniMax model adapter,
// the first real adapter this engine has ever had.
//
// NOTHING HERE SPENDS AND NOTHING HERE NEEDS A KEY. Every call is answered by a recorded body
// under tests/fixtures/wire, served to a `fetch` the adapter is handed (S-111, S-114): the
// endpoint is never reached, and the key below is a canary that exists to be looked for.
//
// The three findings D-019's spike made are what these checks hold the adapter to: every model in
// the family emits a <think> block; a call whose budget is spent inside that block returns nothing
// at all, and reads as a schema failure while being a budget failure; and the wire that answered
// live is POST /v1/chat/completions.

/** A key that is not one. It is asserted to reach the header, and nothing else. */
const KEY = 'canary-not-a-real-key-38'

/** D-006's table, as `DEFAULT_PLAN_SETTINGS` holds it — which is where the adapter reads it. */
const MODELS: Readonly<Record<ModelRole, string>> = DEFAULT_PLAN_SETTINGS.models

/** A schema the plain fixture's content parses under, and the thinking fixture's after stripping. */
const UNITS = z.object({
  units: z.array(z.object({ sentence: z.number(), shot: z.string() })),
})

/** The adapter with recorded wire behind it, and everything it sent. */
function adapter(names: readonly string[], over: Partial<Parameters<typeof minimaxModel>[0]> = {}) {
  const wire = recordedFetch(names)
  return {
    wire,
    port: minimaxModel({ key: KEY, models: MODELS, fetch: wire.fetch, ...over }),
  }
}

/** What one request carried, parsed. */
function body(sent: Sent): Record<string, unknown> {
  assert.ok(sent.body !== undefined, 'the adapter sent no body')
  return JSON.parse(sent.body) as Record<string, unknown>
}

/** A file on this machine for a vision call to carry. Its bytes are what the adapter sends. */
function media(): { dir: string; picture: PictureRef; clip: ClipRef; clean(): void } {
  const dir = mkdtempSync(join(tmpdir(), 'cutroom-wire-'))
  const picture = join(dir, 'shot-0.png')
  const clip = join(dir, 'take-1.mp4')
  writeFileSync(picture, Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex'))
  writeFileSync(clip, Buffer.from('0000001c667479706d70343200000001', 'hex'))
  return {
    dir,
    picture: { pictureId: 'a1-shot-0-a', path: picture },
    clip: { takeId: 'a1-shot-0-take-1', path: clip },
    clean: () => rmSync(dir, { recursive: true, force: true }),
  }
}

// ---------------------------------------------------------------- 6

test('6. handed a recorded MiniMax response, the adapter returns the structured answer, asked for on the wire D-019 verified', async () => {
  const { wire, port } = adapter(['minimax-chat-plain'])
  const { value } = await port.structured({
    prompt: 'Cut these sentences into four shots.',
    schema: UNITS,
    role: 'planner',
    temperature: 0,
  })
  assert.deepEqual(value, { units: [{ sentence: 1, shot: 'a wide, still frame' }] })

  const sent = wire.sent[0] as Sent
  assert.equal(sent.method, 'POST')
  assert.equal(sent.path, '/v1/chat/completions')
  // The base URL defaults to the provider's own, and a test replaces it with a recorded one.
  assert.equal(sent.url, `${MINIMAX_BASE_URL}/v1/chat/completions`)
  const asked = body(sent)
  assert.equal(asked.model, MODELS.planner)
  assert.equal(asked.temperature, 0)
  // THE PIPELINE'S PROMPT IS SENT WHOLE AND FIRST, and the shape follows it (S-130).
  const messages = asked.messages as Array<{ role: string; content: string }>
  assert.equal(messages.length, 1, 'a structured call sent more than one message')
  assert.equal(messages[0]?.role, 'user')
  const content = String(messages[0]?.content)
  assert.ok(
    content.startsWith('Cut these sentences into four shots.'),
    `the pipeline's prompt is not what the call opens with: ${content.slice(0, 120)}`,
  )
  // D-019: every max_tokens budgets for reasoning ON TOP of the answer, because a cap consumed
  // inside the reasoning block returns nothing at all.
  assert.equal(asked.max_tokens, DEFAULT_ANSWER_TOKENS + DEFAULT_REASONING_TOKENS)
  assert.ok(
    asked.response_format !== undefined,
    'the call asked for no schema, so nothing makes the answer JSON (S-114)',
  )
  // AND THE SHAPE IS SAID IN THE MESSAGE TOO, because this wire answers 200 to `response_format`
  // and ignores it: a planning answer came back with `duration` where the schema says
  // `durationSeconds`, and the first real reel failed at its first parse (S-130). The field names
  // are asserted from the SCHEMA, so a schema that gains a field gains this assertion with it.
  assert.ok(content.includes(SHAPE_PREFACE), 'the shape was not said in the message at all')
  for (const field of ['units', 'sentence', 'shot']) {
    assert.ok(
      content.slice(content.indexOf(SHAPE_PREFACE)).includes(`"${field}"`),
      `the message does not name the schema's field "${field}"`,
    )
  }
  // The rendering is the same one the header field carries, so the two cannot disagree.
  const carried = (asked.response_format as { json_schema: { schema: unknown } }).json_schema.schema
  assert.ok(
    content.includes(JSON.stringify(carried)),
    'the message and response_format carry different renderings of the schema',
  )
  assert.deepEqual(wire.left(), [])
})

test('6. a boolean schema is not sent, and `additionalProperties` still is: this parser refuses one and accepts the other', async () => {
  // `z.tuple` renders `"items": false`, a JSON Schema 2020-12 BOOLEAN SCHEMA. MiniMax's parser
  // expects an object wherever a schema may sit and refuses the WHOLE REQUEST 400 — measured on
  // M3 and M2.7 alike, and the reel's scoring call is a four-answer tuple, so every real run
  // reached it (S-131). `additionalProperties: false` is a boolean too, was measured ACCEPTED,
  // and is what tells the model to invent no field, so it is kept.
  const yesNo = z.enum(['yes', 'no'])
  const TUPLE = z.strictObject({ answers: z.tuple([yesNo, yesNo, yesNo, yesNo]) })
  assert.match(
    JSON.stringify(z.toJSONSchema(TUPLE, { io: 'input', unrepresentable: 'any' })),
    /"items":false/,
    'the schema no longer renders a boolean, so this check proves nothing',
  )

  const { wire, port } = adapter(['minimax-chat-plain'])
  // The recorded body does not parse under this schema; what is asserted is what was SENT.
  await port
    .structured({
      prompt: 'Answer four questions.',
      schema: TUPLE,
      role: 'reconciler',
      temperature: 0,
    })
    .catch(() => undefined)

  const asked = body(wire.sent[0] as Sent)
  const carried = JSON.stringify(
    (asked.response_format as { json_schema: { schema: unknown } }).json_schema.schema,
  )
  assert.doesNotMatch(carried, /"items":false/, 'the request carries the boolean this wire 400s on')
  assert.match(carried, /"prefixItems"/, 'the tuple lost more than the boolean')
  assert.match(carried, /"maxItems":4/, 'the bound that says what the boolean said is gone too')
  assert.match(
    carried,
    /"additionalProperties":false/,
    'the model is no longer told to add no field',
  )
  // The message carries the SAME rendering, so the two still cannot disagree (S-130).
  const content = String((asked.messages as Array<{ content: string }>)[0]?.content)
  assert.ok(content.includes(carried), 'the message and response_format disagree after the drop')
})

test('6. a content that opens with a <think> block is parsed as the answer AFTER it, and the block reaches nothing', async () => {
  const { port } = adapter(['minimax-chat-thinking'])
  const { value, receipt } = await port.structured({
    prompt: 'Cut these sentences into one shot.',
    schema: UNITS,
    role: 'planner',
    temperature: 0,
  })
  assert.deepEqual(value, { units: [{ sentence: 1, shot: 'a wide, still frame' }] })
  assert.doesNotMatch(JSON.stringify(value), /think/i, 'the reasoning block reached the answer')
  // The reasoning is still paid for, so it is still counted.
  assert.equal(receipt.usage.outputTokens, 128)
})

test('6. an answer wrapped in BOTH a <think> block and a ```json fence is parsed, and neither wrapper reaches it', async () => {
  // Recorded from a live MiniMax-M3 call on 2026-09-22, during the first real reel: with the
  // shape said in the message the model answered correctly and fenced it, and `JSON.parse`
  // refuses a fence. It is the same family as the reasoning block D-019 found — presentation the
  // model adds around an answer that was asked for as JSON (S-132).
  const yesNo = z.enum(['yes', 'no'])
  const SCORE = z.strictObject({ answers: z.tuple([yesNo, yesNo, yesNo, yesNo]) })
  const { port } = adapter(['minimax-chat-fenced'])
  const { value } = await port.structured({
    prompt: 'Answer each question about this plan with yes or no, in order.',
    schema: SCORE,
    role: 'reconciler',
    temperature: 0,
  })
  assert.deepEqual(value, { answers: ['no', 'yes', 'yes', 'no'] })
  assert.doesNotMatch(JSON.stringify(value), /think|```/i, 'a wrapper reached the answer')
})

test('6. an answer that is THE SCHEMA is refused as that, and not as bad JSON', async () => {
  // Measured once on a real reel: the planner answered with the rendered schema document itself.
  // `jsonOf` reported "answered something that is not JSON" — true of the truncated echo it got,
  // and confusing to read beside a quote that is plainly JSON (S-136).
  const { port } = adapter(['minimax-chat-echo'])
  const failed = await port
    .structured({ prompt: 'Cut these sentences.', schema: UNITS, role: 'planner', temperature: 0 })
    .then(
      () => undefined,
      (error: unknown) => error as Error,
    )
  assert.ok(failed !== undefined, 'an answer that was the schema was accepted as one')
  assert.match(failed.message, /THE SCHEMA rather than an object matching it/, failed.message)
  assert.doesNotMatch(failed.message, /is not JSON/, 'the echo is still reported as bad JSON')
  // The marks are the schema's own words, so an echo of any of this engine's schemas is caught.
  assert.equal(echoedTheSchema('{"$schema":"https://json-schema.org/draft/2020-12/schema"}'), true)
  assert.equal(echoedTheSchema('{"type":"object","properties":{"a":{}}}'), true)
  assert.equal(echoedTheSchema('{"units":[{"sentence":1,"shot":"a wide, still frame"}]}'), false)
})

test('6. an answer CUT OFF mid-JSON names the token budget, not the shape — the other half of D-019', async () => {
  // `answerOf` says "reasoning and no answer" when the budget is spent inside the <think> block
  // and NOTHING is left. This is the other half: the block closed, the answer began, and the
  // tokens ran out inside it — so the text is not empty and arrives at the parse as bad JSON.
  // Only `finish_reason` tells the two apart. Measured on a real reel, 23¢ in (S-140).
  const { port } = adapter(['minimax-chat-cut'])
  const failed = await port
    .structured({ prompt: 'Cut these sentences.', schema: UNITS, role: 'planner', temperature: 0 })
    .then(
      () => undefined,
      (error: unknown) => error as Error,
    )
  assert.ok(failed !== undefined, 'a cut-off answer was accepted')
  assert.match(failed.message, /cut off mid-answer/, failed.message)
  assert.match(failed.message, /finished on length/, failed.message)
  assert.match(
    failed.message,
    new RegExp(String(DEFAULT_ANSWER_TOKENS + DEFAULT_REASONING_TOKENS)),
    'the message does not name the budget that ran out',
  )
  assert.doesNotMatch(failed.message, /is not JSON/, 'a cut-off answer is still blamed on shape')
})

test('6. only a WHOLE fenced answer is unwrapped: a fence in the middle of something is left alone', async () => {
  // The narrow rule, so that a content which is not an answer in a wrapper still fails as one.
  assert.equal(unfenced('```json\n{"a":1}\n```'), '{"a":1}')
  assert.equal(unfenced('```\n{"a":1}\n```'), '{"a":1}')
  assert.equal(unfenced('{"a":1}'), '{"a":1}')
  assert.equal(
    unfenced('here you go:\n```json\n{"a":1}\n```'),
    'here you go:\n```json\n{"a":1}\n```',
  )
})

test('6. a call consumed entirely by reasoning fails NAMING THE TOKEN BUDGET, not the schema', async () => {
  const { port } = adapter(['minimax-chat-reasoning'])
  const failed = await port
    .structured({ prompt: 'Cut these sentences.', schema: UNITS, role: 'planner', temperature: 0 })
    .then(
      () => undefined,
      (error: unknown) => error as Error,
    )
  assert.ok(failed !== undefined, 'a call that answered nothing returned an answer')

  // What D-019 found: "A schema call that returns nothing will be this, not a schema failure."
  assert.match(failed.message, /max_tokens/, failed.message)
  assert.match(failed.message, /\b16\b/, 'the message does not name what the model spent')
  assert.match(
    failed.message,
    new RegExp(String(DEFAULT_ANSWER_TOKENS + DEFAULT_REASONING_TOKENS)),
    'the message does not name the budget it was given',
  )
  assert.doesNotMatch(failed.message, /schema/i, 'a budget failure reported as a schema failure')
  // It is a fault, not a transient: sending the same budget again cannot help.
  assert.ok(!(failed instanceof Unavailable), 'a spent budget was reported as transient')
})

// ---------------------------------------------------------------- 7

test('7. every model receipt carries the model id, the tokens and fake: false', async () => {
  const { port } = adapter(['minimax-chat-plain'])
  const { receipt } = await port.structured({
    prompt: 'Cut these sentences.',
    schema: UNITS,
    role: 'planner',
    temperature: 0,
    pictureIds: ['a1-shot-0-a'],
    takeIds: [],
  })
  assert.deepEqual(receipt, {
    model: MODELS.planner,
    role: 'planner',
    call: 'structured',
    temperature: 0,
    usage: { inputTokens: 812, outputTokens: 96 },
    fake: false,
    pictureIds: ['a1-shot-0-a'],
    takeIds: [],
  })
})

test('7. a vision call carries its picture as the wire expects, and its receipt names the picture', async () => {
  const files = media()
  const { wire, port } = adapter(['minimax-chat-vision'])
  try {
    const { value, receipt } = await port.observe({ picture: files.picture, temperature: 0 })

    const asked = body(wire.sent[0] as Sent)
    assert.equal(asked.model, MODELS.witness, 'a call that must see was not routed to D-006 M3')
    const parts = (asked.messages as Array<{ role: string; content: unknown }>)[0]
      ?.content as Array<Record<string, unknown>>
    assert.ok(Array.isArray(parts), 'a vision call sent a plain string, so it carried no picture')
    const image = parts.find((p) => p.type === 'image_url')
    assert.ok(image !== undefined, `no image part was sent: ${JSON.stringify(parts)}`)
    assert.match(
      String((image.image_url as { url: string }).url),
      /^data:image\/png;base64,iVBORw0KGgo/,
      'the picture was not carried as its own bytes',
    )
    assert.ok(
      parts.some((p) => p.type === 'text'),
      'the witness was sent a picture and no question',
    )
    // The shape is said in the message here too, as its own part after the media (S-130). The
    // carrier differs — a part rather than a suffix — because a vision call's content is parts.
    const shape = parts[parts.length - 1] as { type: string; text?: string }
    assert.equal(shape.type, 'text', 'the last part of a vision call is not the shape')
    assert.ok(
      String(shape.text).startsWith(SHAPE_PREFACE),
      'a vision call said its shape in nothing but response_format, which this wire ignores',
    )
    for (const field of ['entities', 'framing', 'lighting', 'unsafeDepictions']) {
      assert.ok(
        String(shape.text).includes(`"${field}"`),
        `the vision call does not name the observation's field "${field}"`,
      )
    }

    // The pipeline parses an observation at the gate boundary, so the adapter must NOT (S-042).
    assert.equal((value as { framing: string }).framing, 'medium')
    assert.equal(receipt.role, 'witness')
    assert.equal(receipt.call, 'observe')
    assert.deepEqual(receipt.pictureIds, [files.picture.pictureId])
    assert.deepEqual(receipt.takeIds, [])
    assert.equal(receipt.fake, false)
  } finally {
    files.clean()
  }
})

test('7. a vision call carries its clip as the wire expects, and its receipt names the take', async () => {
  const files = media()
  const { wire, port } = adapter(['minimax-chat-clip'])
  try {
    const { value, receipt } = await port.observe({ clip: files.clip, temperature: 0 })

    const asked = body(wire.sent[0] as Sent)
    const parts = (asked.messages as Array<{ role: string; content: unknown }>)[0]
      ?.content as Array<Record<string, unknown>>
    const clip = parts.find((p) => p.type === 'video_url')
    assert.ok(clip !== undefined, `no video part was sent: ${JSON.stringify(parts)}`)
    assert.match(
      String((clip.video_url as { url: string }).url),
      /^data:video\/mp4;base64,/,
      'the clip was not carried as its own bytes',
    )

    assert.deepEqual((value as { eventOrder: string[] }).eventOrder, ['the seal is pressed'])
    assert.deepEqual(receipt.takeIds, [files.clip.takeId])
    assert.deepEqual(receipt.pictureIds, [])
  } finally {
    files.clean()
  }
})

test('7. a compare call QUOTES each subject and demands it back character for character', async () => {
  // Measured on a real reel: asked about the subject `shelf`, MiniMax-M3 answered "Shelf of Bound
  // Volumes" — the plan's display name — and Gate 1S refused an answer about a subject it never
  // asked about, 34¢ into a run that had already passed Gate 1 on shot 0 (S-138).
  const files = media()
  const { wire, port } = adapter(['minimax-chat-vision'])
  try {
    await port.compare({
      pictures: [files.picture, files.picture],
      subjects: ['shelf', 'keeper'],
      temperature: 0,
    })
    const asked = body(wire.sent[0] as Sent)
    const parts = (asked.messages as Array<{ content: unknown }>)[0]?.content as Array<
      Record<string, unknown>
    >
    const question = String(parts.find((p) => p.type === 'text')?.text)
    assert.match(question, /- "shelf"/, 'a subject is listed unquoted, so it reads as a topic')
    assert.match(question, /- "keeper"/)
    assert.match(question, /character\s+for\s+character/, 'the question does not demand the string')
    assert.doesNotMatch(question, /by its name/, 'the wording that invited a rename is back')
  } finally {
    files.clean()
  }
})

test('7. the role-to-model routing is D-006 table, READ FROM SETTINGS: a different table sends different models', async () => {
  // D-006, as DEFAULT_PLAN_SETTINGS holds it: M3 is the only model that accepts a picture, so
  // every role that must see is routed to it, and planning is not.
  assert.deepEqual(MODELS, {
    planner: 'MiniMax-M2.7',
    reconciler: 'MiniMax-M3',
    witness: 'MiniMax-M3',
    judge: 'MiniMax-M3',
  })

  const files = media()
  const models: Readonly<Record<ModelRole, string>> = {
    planner: 'a-planning-model',
    reconciler: 'a-reconciling-model',
    witness: 'a-seeing-model',
    judge: 'a-judging-model',
  }
  const { wire, port } = adapter(
    ['minimax-chat-plain', 'minimax-chat-vision', 'minimax-chat-vision', 'minimax-chat-vision'],
    { models },
  )
  try {
    await port.structured({
      prompt: 'Cut these sentences.',
      schema: UNITS,
      role: 'planner',
      temperature: 0,
    })
    await port.observe({ picture: files.picture, temperature: 0 })
    await port.compare({
      pictures: [files.picture, { pictureId: 'a1-shot-1-a', path: files.picture.path }],
      subjects: ['the charter'],
      temperature: 0,
    })
    await port.judgeCut({
      shots: [{ shotId: 'shot-0', sentences: ['In 1215.'], frames: [files.picture] }],
      questions: ['Does every shot show what is said over it?'],
      temperature: 0,
    })

    assert.deepEqual(
      wire.sent.map((s) => body(s).model),
      [models.planner, models.witness, models.judge, models.judge],
      'a model id is hardcoded rather than read from the settings the port was built with',
    )
  } finally {
    files.clean()
  }
})

// ---------------------------------------------------------------- 8

/** The error one call threw, or a failure saying it did not throw at all. */
async function threw(call: () => Promise<unknown>): Promise<Error> {
  const error = await call().then(
    () => undefined,
    (e: unknown) => e as Error,
  )
  assert.ok(error !== undefined, 'the call returned an answer where it should have thrown')
  return error
}

/** One `structured` call, on whatever transport it is given. */
const oneCall = (port: ReturnType<typeof minimaxModel>) => () =>
  port.structured({ prompt: 'Cut these.', schema: UNITS, role: 'planner', temperature: 0 })

test('8. 429 and 5xx are answered unavailable with a detail — the provider made nothing and may if it is asked again', async () => {
  for (const [name, status] of [
    ['minimax-chat-busy', 429],
    ['minimax-chat-broken', 503],
  ] as const) {
    const { port } = adapter([name])
    const error = await threw(oneCall(port))
    assert.ok(
      error instanceof Unavailable,
      `${name} was not classified transient: ${error.message}`,
    )
    assert.match(error.detail, new RegExp(String(status)), `the detail does not name ${status}`)
    assert.doesNotMatch(error.message, new RegExp(KEY), 'a fault message holds the key')
  }
})

test('8. a connection error and a call that times out are answered unavailable: neither reached the provider', async () => {
  const refused: typeof globalThis.fetch = () =>
    Promise.reject(new TypeError('fetch failed: ECONNREFUSED 127.0.0.1:443'))
  const connection = await threw(
    oneCall(minimaxModel({ key: KEY, models: MODELS, fetch: refused })),
  )
  assert.ok(connection instanceof Unavailable, connection.message)
  assert.match(connection.detail, /ECONNREFUSED/)

  // The adapter's OWN timeout: a transport that never answers is aborted by the signal the
  // adapter set, and an aborted call is transient — nothing was made and nothing was billed.
  // The held timer is load-bearing: `AbortSignal.timeout`'s own timer is UNREF'D, so with nothing
  // else pending Node drains the loop and the call never settles at all. It is also what makes
  // this an assertion — an adapter that set no signal fails here, saying so, rather than hanging.
  const hangs: typeof globalThis.fetch = (_input, init) =>
    new Promise((_resolve, reject) => {
      const held = setTimeout(() => reject(new Error('the transport was never aborted')), 5_000)
      init?.signal?.addEventListener('abort', () => {
        clearTimeout(held)
        reject(new DOMException('This operation was aborted', 'AbortError'))
      })
    })
  const timedOut = await threw(
    oneCall(minimaxModel({ key: KEY, models: MODELS, fetch: hangs, timeoutMs: 50 })),
  )
  assert.ok(timedOut instanceof Unavailable, timedOut.message)
  assert.match(timedOut.detail, /50/, 'the detail does not name how long it waited')
})

test('8. 400, 401 and a body that does not parse THROW: sending any of them again cannot help', async () => {
  for (const name of [
    'minimax-chat-refused',
    'minimax-chat-denied',
    'minimax-chat-garbled',
  ] as const) {
    const { port } = adapter([name])
    const error = await threw(oneCall(port))
    assert.ok(!(error instanceof Unavailable), `${name} was answered unavailable: ${error.message}`)
    assert.doesNotMatch(error.message, new RegExp(KEY), `${name}'s fault message holds the key`)
    assert.doesNotMatch(
      error.message,
      /authorization/i,
      `${name}'s fault message names the header a key is sent in`,
    )
  }
})

test('8. the key is sent in the header and in nothing else, and it is in no message the adapter throws', async () => {
  const { wire, port } = adapter(['minimax-chat-plain'])
  await port.structured({
    prompt: 'Cut these sentences.',
    schema: UNITS,
    role: 'planner',
    temperature: 0,
  })
  const sent = wire.sent[0] as Sent
  assert.equal(sent.headers.authorization, `Bearer ${KEY}`, JSON.stringify(sent.headers))
  assert.doesNotMatch(String(sent.body), new RegExp(KEY), 'the key was written into the body')
  assert.doesNotMatch(sent.url, new RegExp(KEY), 'the key was written into the URL')
})
