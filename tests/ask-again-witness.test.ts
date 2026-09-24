import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { z } from 'zod'
import {
  Spent,
  refusalsOf,
  witnessRefusalsOf,
  type ClipRef,
  type RefusedAnswer,
  type ModelRole,
} from '@cutroom/contracts'
import { clipObservation, witnessObservation } from '@cutroom/pipeline'
import { REFUSED_AGAIN, REFUSED_SAID, SHAPE_PREFACE, minimaxModel } from '@cutroom/providers'
import { gate4 } from '../packages/pipeline/src/gates/gate4.ts'
import { askWitness } from '../packages/pipeline/src/gates/witness.ts'
import { startEngine, type Engine } from './engine/harness.ts'
import {
  THREE_RANKS,
  THREE_RANKS_PICS,
  pictureOf,
  seen,
  stills,
  stillsRequest,
  stillsScript,
  twice,
  type Pic,
} from './engine/stills.ts'
import {
  seenClip,
  takeOf,
  takesOf,
  video,
  videoRequest,
  videoScript,
  type Take,
} from './engine/video.ts'
import { recordedFetch, type Sent } from './engine/wire.ts'

// ask-again, Slice 4 — checks 16 to 21 (docs/features/ask-again.md): THE WITNESS IS TOLD, AND THE
// GATES' REFUSALS ARE KEPT. A refused witness answer is asked once more with a NEW object carrying
// `refused` — the first answer's issues under the witness's own schema, and nothing else — and every
// refused answer a gate makes is handed to the `refusals` port and kept (S-156, I-8). A narration's
// timings that do not parse are kept too, and the narration is not spoken again.
//
// NOTHING HERE SPENDS: hand-written ports, recorded wire, and the stand-ins behind the worker.

// ---------------------------------------------------------------- the gate, by hand

const entity = {
  label: 'a brass lamp',
  count: 1,
  position: 'centre',
  prominence: 'foreground',
  faceVisible: 'noFace',
  occluded: false,
  clippedByEdge: false,
}
const still = {
  entities: [entity],
  framing: 'medium',
  setting: 'a lamp room at night',
  lighting: 'dim',
  readableTextPresent: false,
  ambiguities: [],
  unsafeDepictions: [],
}
const clip = { ...still, actions: [], eventOrder: [] }
/** The stars counted −1 — the witness's own answer on P-004's picture. */
const uncountable = { ...still, entities: [{ ...entity, count: -1 }] }
const badLighting = { ...clip, lighting: 'scattered between the tall pillars' }
const badPosition = { ...clip, entities: [{ ...entity, position: 'bottom half' }] }

type Answer = { value: unknown } | { throws: unknown }

function observer(answers: Answer[]) {
  const seenCalls: Array<{ argument: unknown; snapshot: unknown }> = []
  const observe = async (argument: unknown) => {
    seenCalls.push({ argument, snapshot: structuredClone(argument) })
    const answer = answers[seenCalls.length - 1]
    if (answer === undefined) throw new Error(`no answer scripted for call ${seenCalls.length}`)
    if ('throws' in answer) throw answer.throws
    return { value: answer.value }
  }
  return { observe, seen: seenCalls }
}

/** A `refusals` port that keeps what it is handed, in order. */
function keeper() {
  const kept: RefusedAnswer[] = []
  return { kept, refusals: { keep: async (r: RefusedAnswer) => void kept.push(r) } }
}

const PICTURE = { pictureId: 'a1-shot-1-single', path: 'pictures/a1-shot-1-single.png' }
const TAKE = { takeId: 'a1-shot-2-take-1', path: 'clips/a1-shot-2-take-1.mp4' } as ClipRef

const issues = (schema: z.ZodType<unknown>, value: unknown) => [
  ...(witnessRefusalsOf(value, schema) ?? []),
]

// ---------------------------------------------------------------- 16

test("16. a refused witness answer is asked once more with a NEW object — the first ask's snapshot exactly { picture | clip, temperature: 0 }, the second's that and refused, the first's issues — and the refusals port is handed one refusal: witness, observe, about the id, ask 1, those reasons, the answer as JSON", async () => {
  const onStill = observer([{ value: uncountable }, { value: still }])
  const k = keeper()
  const call = { picture: PICTURE, temperature: 0 as const }
  const got = await askWitness(
    call,
    onStill.observe,
    witnessObservation,
    PICTURE.pictureId,
    'an observation',
    k.refusals,
  )
  assert.deepEqual(got, still)
  assert.equal(onStill.seen.length, 2)
  assert.equal(onStill.seen[0]?.argument, call, 'the first ask is not the call the gate built')
  assert.notEqual(onStill.seen[1]?.argument, call, 'the second ask is the same object')
  const told = issues(witnessObservation, uncountable)
  assert.deepEqual(told, ['entities.0.count: Too small: expected number to be >0'])
  assert.deepEqual(onStill.seen[0]?.snapshot, { picture: PICTURE, temperature: 0 })
  assert.deepEqual(onStill.seen[1]?.snapshot, { picture: PICTURE, temperature: 0, refused: told })
  assert.deepEqual(k.kept, [
    {
      port: 'model',
      role: 'witness',
      call: 'observe',
      about: [PICTURE.pictureId],
      ask: 1,
      reasons: told,
      answer: JSON.stringify(uncountable),
    },
  ])

  // A clip, through Gate 4, the same.
  const onClip = observer([{ value: badPosition }, { value: clip }])
  const c = keeper()
  const { observation } = await gate4(TAKE, portOf(onClip.observe), c.refusals)
  assert.deepEqual(observation, clip)
  const clipTold = issues(clipObservation, badPosition)
  assert.deepEqual(onClip.seen[0]?.snapshot, {
    clip: { takeId: TAKE.takeId, path: TAKE.path },
    temperature: 0,
  })
  assert.deepEqual(onClip.seen[1]?.snapshot, {
    clip: { takeId: TAKE.takeId, path: TAKE.path },
    temperature: 0,
    refused: clipTold,
  })
  assert.deepEqual(
    c.kept.map((r) => [r.about, r.ask, r.reasons]),
    [[[TAKE.takeId], 1, clipTold]],
  )
})

/** A model port whose `observe` is the observer's, and which throws on anything else. */
function portOf(observe: (argument: unknown) => Promise<{ value: unknown }>) {
  const never = () => {
    throw new Error('only observe is called by Gate 4')
  }
  return {
    structured: never,
    compare: never,
    judgeCut: never,
    readText: never,
    observe: async (call: unknown) => {
      const { value } = await observe(call)
      return {
        value,
        receipt: {
          model: 'hand-written',
          role: 'witness' as const,
          call: 'observe' as const,
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

// ---------------------------------------------------------------- 17

test("17. two refused witness answers throw today's words with the second's issues after two calls, and the refusals port is handed two refusals, ask 1 and ask 2, each its own reasons and answer; a Spent on the second ask propagates unchanged and is not recorded by the gate", async () => {
  const onClip = observer([{ value: badLighting }, { value: badPosition }, { value: clip }])
  const k = keeper()
  const second = issues(clipObservation, badPosition)
  await assert.rejects(gate4(TAKE, portOf(onClip.observe), k.refusals), (error: Error) => {
    assert.equal(
      error.message,
      `the witness's answer for ${TAKE.takeId} is not a clip observation: ${second.join('; ')}`,
    )
    return true
  })
  assert.equal(onClip.seen.length, 2)
  assert.deepEqual(
    k.kept.map((r) => [r.ask, r.reasons, r.answer]),
    [
      [1, issues(clipObservation, badLighting), JSON.stringify(badLighting)],
      [2, second, JSON.stringify(badPosition)],
    ],
  )

  const spent = new Spent({ port: 'model', model: 'MiniMax-M3', costCents: 0, detail: 'cut off' })
  const thrown = observer([{ value: badLighting }, { throws: spent }])
  const t = keeper()
  await assert.rejects(gate4(TAKE, portOf(thrown.observe), t.refusals), (e) => e === spent)
  assert.equal(thrown.seen.length, 2)
  assert.deepEqual(
    t.kept.map((r) => r.ask),
    [1],
    "the gate recorded the Spent — that is the worker's row to write",
  )
})

// ---------------------------------------------------------------- 18

const KEY = 'canary-not-a-real-key-49w'
const MODELS: Readonly<Record<ModelRole, string>> = {
  planner: 'MiniMax-M2.7',
  reconciler: 'MiniMax-M3',
  witness: 'MiniMax-M3',
  judge: 'MiniMax-M3',
}

function body(sent: Sent | undefined): Record<string, unknown> {
  assert.ok(sent?.body !== undefined, 'the adapter sent no body')
  return JSON.parse(sent.body) as Record<string, unknown>
}

test("18. the MiniMax adapter renders refused: an observe call's question part holds REFUSED_SAID and each reason after the closed sets, still two text parts, the media between them; a structured call's content is the prompt, then REFUSED_SAID and the reasons, then the shape; and a body with refused differs from the same call's body without it only by that text", async () => {
  const dir = mkdtempSync(join(tmpdir(), 'cutroom-told-'))
  try {
    const picture = { pictureId: 'a1-shot-1-single', path: join(dir, 'p.png') }
    writeFileSync(picture.path, Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex'))
    const told = witnessRefusalsOf(uncountable, witnessObservation)
    assert.ok(told !== null)
    const block = [REFUSED_SAID, ...told.map((r) => `- ${r}`), REFUSED_AGAIN].join('\n')

    const plain = recordedFetch(['minimax-chat-vision'])
    await minimaxModel({ key: KEY, models: MODELS, fetch: plain.fetch }).observe({
      picture,
      temperature: 0,
    })
    const again = recordedFetch(['minimax-chat-vision'])
    await minimaxModel({ key: KEY, models: MODELS, fetch: again.fetch }).observe({
      picture,
      temperature: 0,
      refused: told,
    })
    const before = body(plain.sent[0])
    const after = body(again.sent[0])
    type Part = { type: string; text?: string }
    const partsOf = (b: Record<string, unknown>) =>
      ((b.messages as Array<{ content: unknown }>)[0]?.content ?? []) as Part[]
    const [q0, ...rest0] = partsOf(before)
    const [q1, ...rest1] = partsOf(after)
    assert.equal(q1?.text, `${q0?.text}\n\n${block}`, 'the reasons do not follow the closed sets')
    assert.deepEqual(rest1, rest0, 'the media or the shape moved')
    assert.equal(partsOf(after).filter((p) => p.type === 'text').length, 2)
    assert.equal(partsOf(after)[1]?.type, 'image_url', 'the media is not between the text parts')
    assert.ok(!String(q0?.text).includes(REFUSED_SAID), 'a first ask says it was refused')
    assert.deepEqual({ ...after, messages: undefined }, { ...before, messages: undefined })

    // A structured call: the prompt, the reasons, the shape.
    const schema = z.strictObject({ units: z.array(z.number()) })
    const refusal = schema.safeParse({ units: 'none' })
    assert.ok(!refusal.success)
    const reasons = refusalsOf(refusal.error)
    const sentBodies: string[] = []
    const stub = async (_url: string | URL | Request, init?: RequestInit) => {
      sentBodies.push(String(init?.body))
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: '{"units":[1]}' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 1, completion_tokens: 1 },
          base_resp: { status_code: 0, status_msg: 'success' },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      )
    }
    const planner = minimaxModel({ key: KEY, models: MODELS, fetch: stub as typeof fetch })
    const call = { role: 'planner' as const, prompt: 'Cut these.', schema, temperature: 0 as const }
    await planner.structured(call)
    await planner.structured({ ...call, refused: reasons })
    const [b0, b1] = sentBodies.map((s) => JSON.parse(s) as Record<string, unknown>)
    const content = (b: Record<string, unknown> | undefined) =>
      String((b?.messages as Array<{ content: string }>)[0]?.content)
    const shapeAt = content(b0).indexOf(SHAPE_PREFACE)
    assert.ok(shapeAt > 0)
    const reasonBlock = [REFUSED_SAID, ...reasons.map((r) => `- ${r}`), REFUSED_AGAIN].join('\n')
    assert.equal(
      content(b1),
      `${content(b0).slice(0, shapeAt)}${reasonBlock}\n\n${content(b0).slice(shapeAt)}`,
    )
    assert.ok(content(b1).startsWith(`Cut these.\n\n${REFUSED_SAID}`))
    assert.deepEqual({ ...b1, messages: undefined }, { ...b0, messages: undefined })
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

// ---------------------------------------------------------------- through the worker

const [, , barons] = THREE_RANKS_PICS as [Pic, Pic, Pic, Pic]
const [t0, t1] = takesOf(THREE_RANKS) as [Take, Take]
const refusedStill = { ...seen(barons), lighting: 'top' }
const refusedClip = { ...seenClip(t1), lighting: 'top' }

function refusedRows(engine: Engine, runId: string) {
  return engine
    .query<Record<string, unknown>>(
      'SELECT * FROM refused_answer WHERE run_id = ? ORDER BY id',
      runId,
    )
    .map((r) => ({
      port: String(r.port),
      role: r.role === null ? null : String(r.role),
      call: r.call === null ? null : String(r.call),
      about: JSON.parse(String(r.about)) as string[],
      ask: Number(r.ask),
      reasons: JSON.parse(String(r.reasons)) as string[],
      answer: String(r.answer),
    }))
}

// ---------------------------------------------------------------- 19

test("19. I-8: with markers in every narration sentence, criterion text and id, subject name and id, claim id and the style, and the witness refused once on a still and once on a take, no observe call — first or second — holds a marker, and every observe call's keys are picture or clip, temperature and, on a second ask only, refused", async () => {
  const base = videoRequest('r19')
  const marked = {
    ...base,
    narration: base.narration.map((n, i) => ({ ...n, text: `${n.text} zqsentence${i}` })),
    criteria: {
      ...base.criteria,
      mustShow: base.criteria.mustShow.map((c) => ({ ...c, text: `${c.text} zqcriterion` })),
      mustNotShow: base.criteria.mustNotShow.map((c) => ({ ...c, text: `${c.text} zqnever` })),
    },
  }
  const engine = await startEngine({
    worker: true,
    script: videoScript(THREE_RANKS, THREE_RANKS_PICS, {
      stills: {
        witness: { [barons.key]: twice({ value: refusedStill }, { value: seen(barons) }) },
      },
      witness: { [t1.key]: twice({ value: refusedClip }, { value: seenClip(t1) }) },
    }),
  })
  try {
    const ran = await video(engine, marked)
    assert.ok(
      ran.jobs.some((j) => j.kind === 'reel.assemble'),
      `the clips stage did not complete: ${JSON.stringify(ran.result)}`,
    )
    const calls = [...engine.model.observeCalls, ...engine.model.observeClipCalls]
    const seconds = calls.filter((c) => c.refused !== undefined)
    assert.equal(seconds.length, 2, 'not exactly one second ask on the still and one on the take')

    // Every string the brief holds, as a marker or quoted whole where it is an id.
    const [selected] = engine.query<{ plan: string }>(
      'SELECT plan FROM plan WHERE run_id = ? AND selected = 1',
      ran.runId,
    )
    const subjects = (
      JSON.parse(String(selected?.plan)) as { subjects: Array<{ id: string; name: string }> }
    ).subjects
    assert.ok(subjects.length > 0, 'the selected plan names no subject')
    const markers = [
      ...marked.narration.map((n) => n.text),
      'zqsentence',
      'zqcriterion',
      'zqnever',
      ...[...marked.criteria.mustShow, ...marked.criteria.mustNotShow].flatMap((c) => [
        c.text,
        `"${c.id}"`,
      ]),
      ...marked.claims.map((c) => `"${c.id}"`),
      ...subjects.flatMap((s) => [s.name, `"${s.id}"`]),
      marked.style.text,
      `"${marked.style.id}"`,
    ]
    for (const call of calls) {
      const text = JSON.stringify(call)
      for (const marker of markers) {
        assert.ok(!text.includes(marker), `an observe call holds ${marker}: ${text.slice(0, 300)}`)
      }
      const keys = Object.keys(call).sort()
      const expected = [
        'clip' in call ? 'clip' : 'picture',
        ...(call.refused === undefined ? [] : ['refused']),
        'temperature',
      ].sort()
      assert.deepEqual(keys, expected, `an observe call carries ${keys.join(', ')}`)
    }
  } finally {
    await engine.stop()
  }
})

// ---------------------------------------------------------------- 20

test("20. through the worker, a still refused twice fails with today's words and two refused_answer rows about its picture, ask 1 and ask 2, each with the answer it gave; and a take refused once and then parsing leaves one row about the take", async () => {
  const stillEngine = await startEngine({
    worker: true,
    script: stillsScript(THREE_RANKS, THREE_RANKS_PICS, {
      witness: { [barons.key]: twice({ value: refusedStill }, { value: uncountable }) },
    }),
  })
  try {
    const ran = await stills(stillEngine, stillsRequest('r20-still'))
    assert.equal(ran.result.status, 'failed', JSON.stringify(ran.result))
    const id = pictureOf(ran, barons.key).picture_id
    assert.match(
      String(ran.result.detail),
      new RegExp(`the witness's answer for ${id} is not an observation: entities\\.0\\.count: `),
    )
    const rows = refusedRows(stillEngine, ran.runId)
    assert.deepEqual(
      rows.map((r) => [r.role, r.call, r.about, r.ask, r.answer]),
      [
        ['witness', 'observe', [id], 1, JSON.stringify(refusedStill)],
        ['witness', 'observe', [id], 2, JSON.stringify(uncountable)],
      ],
    )
    assert.deepEqual(rows[1]?.reasons, issues(witnessObservation, uncountable))
  } finally {
    await stillEngine.stop()
  }

  const clipEngine = await startEngine({
    worker: true,
    script: videoScript(THREE_RANKS, THREE_RANKS_PICS, {
      witness: { [t1.key]: twice({ value: refusedClip }, { value: seenClip(t1) }) },
    }),
  })
  try {
    const ran = await video(clipEngine, videoRequest('r20-take'))
    assert.ok(
      ran.jobs.some((j) => j.kind === 'reel.assemble'),
      JSON.stringify(ran.result),
    )
    const take = takeOf(ran, t1.key).take_id
    assert.deepEqual(
      refusedRows(clipEngine, ran.runId).map((r) => [r.about, r.ask]),
      [[[take], 1]],
    )
  } finally {
    await clipEngine.stop()
  }
})

// ---------------------------------------------------------------- 21

test("21. through the worker, a narration whose timings do not parse fails with today's words, spoken once, and one refused_answer row — speech, about its narration id, ask 1, the timings as JSON", async () => {
  const timings = [{ word: 'not', start: 0, end: 0.3 }]
  const engine = await startEngine({
    worker: true,
    script: videoScript(THREE_RANKS, THREE_RANKS_PICS, { takes: [t0] }),
    narration: { 'shot-0-narration': { timings } },
  })
  try {
    const ran = await video(engine, videoRequest('r21'))
    assert.equal(ran.result.status, 'failed', JSON.stringify(ran.result))
    assert.match(
      String(ran.result.detail),
      /the word timings of a1-shot-0-narration do not parse: /,
    )
    assert.equal(engine.narration.calls.length, 1, 'the narration was spoken again')
    const rows = refusedRows(engine, ran.runId)
    assert.equal(rows.length, 1)
    assert.deepEqual(
      { ...rows[0], reasons: undefined },
      {
        port: 'speech',
        role: null,
        call: null,
        about: ['a1-shot-0-narration'],
        ask: 1,
        reasons: undefined,
        answer: JSON.stringify(timings),
      },
    )
    assert.ok((rows[0]?.reasons.length ?? 0) > 0)
    assert.ok(
      String(ran.result.detail).includes(String(rows[0]?.reasons[0])),
      'the kept reason is not the one the run failed on',
    )
  } finally {
    await engine.stop()
  }
})
