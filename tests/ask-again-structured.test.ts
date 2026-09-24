import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { test } from 'node:test'
import ts from 'typescript'
import { z } from 'zod'
import {
  Spent,
  Unavailable,
  answerRefusal,
  isSpent,
  refusalsOf,
  type LanguageModelPort,
  type ModelReceipt,
} from '@cutroom/contracts'
import { planningAnswer } from '@cutroom/pipeline'
import { fakeModel } from '@cutroom/providers'
import { askStructured } from '../packages/pipeline/src/gates/structured.ts'
import { REPO } from './_repo.ts'
import { startEngine, run } from './engine/harness.ts'
import { answerA, models, planRequest, twoSurvivors } from './engine/plans.ts'
import {
  THREE_RANKS,
  THREE_RANKS_PICS,
  passes,
  pictureOf,
  refusedThen,
  stills,
  stillsRequest,
  stillsScript,
  type Pic,
} from './engine/stills.ts'
import {
  passesTake,
  takeOf,
  takesOf,
  video,
  videoRequest,
  videoScript,
  type Take,
} from './engine/video.ts'

// ask-again, Slice 3 — checks 7 to 15 (docs/features/ask-again.md): THE STRUCTURED CALLS ASK AGAIN.
// A `structured` answer refused for its shape — the caller's schema refused it, it is not JSON, it
// is the schema — throws a `Spent` carrying `refused`, and the pipeline asks ONCE more, told why, at
// every call site, through `askStructured` (S-156). A budget or a wire failure, a fault and an
// `Unavailable` are asked nothing more. Through the worker, each ask keeps its row: a `lost_call` and
// a `refused_answer` for the refused one, a `model_receipt` for the one that parses (D-084).
//
// NOTHING HERE SPENDS: hand-written ports, and the stand-in behind the worker.

// ---------------------------------------------------------------- the hand-written port

const receipt = (): ModelReceipt => ({
  model: 'hand-written',
  role: 'planner',
  call: 'structured',
  temperature: 0,
  usage: { inputTokens: 0, outputTokens: 0 },
  fake: true,
  pictureIds: [],
  takeIds: [],
})

type Answer = { value: unknown } | { throws: unknown }

/** Every key of a call but its schema, which a structured clone cannot copy. */
const withoutSchema = (call: object): Record<string, unknown> =>
  Object.fromEntries(Object.entries(call).filter(([key]) => key !== 'schema'))

/** A model whose `structured` answers from a list, snapshotting every call as it is made. */
function structuredFrom(list: Answer[]) {
  const seen: Array<{ argument: unknown; snapshot: unknown }> = []
  const never = () => {
    throw new Error('only structured is called here')
  }
  const model: LanguageModelPort = {
    observe: never,
    compare: never,
    judgeCut: never,
    readText: never,
    structured: async (call) => {
      // A structured clone cannot copy a schema; the snapshot is every other key, at call time.
      const rest = withoutSchema(call)
      seen.push({ argument: call, snapshot: structuredClone(rest) })
      const next = list[seen.length - 1]
      if (next === undefined) throw new Error(`no answer scripted for call ${seen.length}`)
      if ('throws' in next) throw next.throws
      return { value: next.value as never, receipt: receipt() }
    },
  }
  return { model, seen }
}

const SCHEMA = z.strictObject({ units: z.array(z.number()) })
const CALL = {
  prompt: 'Cut these sentences.',
  schema: SCHEMA,
  role: 'planner' as const,
  temperature: 0 as const,
  pictureIds: ['a1-shot-0-single'],
}

/** A Spent carrying `refused` — the answer's shape refused — as the adapter raises it. */
const refusedSpent = (words: string) => {
  const refused = SCHEMA.safeParse({ units: words })
  assert.ok(!refused.success)
  return new Spent({
    port: 'model',
    model: 'MiniMax-M2.7',
    costCents: 0,
    detail: `refused: ${words}`,
    answer: JSON.stringify({ units: words }),
    refused: refusalsOf(refused.error),
  })
}

// ---------------------------------------------------------------- 7

test('7. a structured answer that parses is asked for once, with exactly the call the site built — no refused key', async () => {
  const { model, seen } = structuredFrom([{ value: { units: [1] } }])
  const { value } = await askStructured(model, CALL)
  assert.deepEqual(value, { units: [1] })
  assert.equal(seen.length, 1)
  assert.equal(seen[0]?.argument, CALL, 'the first ask is not the call the site built')
  assert.ok(!('refused' in (seen[0]?.snapshot as object)))
})

// ---------------------------------------------------------------- 8

test('8. a structured ask that throws a Spent carrying refused is asked once more with a NEW object equal to the first plus those refused — snapshotted at each call — and the second answer is returned', async () => {
  const first = refusedSpent('none')
  const { model, seen } = structuredFrom([{ throws: first }, { value: { units: [1, 2] } }])
  const { value } = await askStructured(model, CALL)
  assert.deepEqual(value, { units: [1, 2] })
  assert.equal(seen.length, 2)
  assert.notEqual(seen[1]?.argument, seen[0]?.argument, 'the second ask is the same object')
  const rest = withoutSchema(CALL)
  assert.deepEqual(seen[0]?.snapshot, rest)
  assert.deepEqual(seen[1]?.snapshot, { ...rest, refused: [...(first.receipt.refused ?? [])] })
  assert.equal((seen[1]?.argument as { schema: unknown }).schema, SCHEMA, 'the schema changed')
})

// ---------------------------------------------------------------- 9

test('9. two such Spents throw the SECOND Spent object unchanged after exactly two calls; no third', async () => {
  const first = refusedSpent('none')
  const second = refusedSpent('still none')
  const { model, seen } = structuredFrom([
    { throws: first },
    { throws: second },
    { value: { units: [3] } },
  ])
  await assert.rejects(askStructured(model, CALL), (thrown) => thrown === second)
  assert.equal(seen.length, 2)
})

// ---------------------------------------------------------------- 10

test('10. a Spent with no refused (budget, wire), a plain fault and an Unavailable on the first ask are called once and come out unchanged; the same on the second ask after a refusal, twice', async () => {
  const errors = [
    new Spent({
      port: 'model',
      model: 'MiniMax-M2.7',
      costCents: 0,
      detail: 'cut off mid-answer: it finished on length',
      answer: '{"units":[1,',
    }),
    new Spent({ port: 'model', model: 'MiniMax-M2.7', costCents: 0, detail: 'not this wire' }),
    new Error('a request that was wrong'),
    new Unavailable('the planner call answered nothing within 600000 ms'),
  ]
  for (const error of errors) {
    const once = structuredFrom([{ throws: error }, { value: { units: [1] } }])
    await assert.rejects(askStructured(once.model, CALL), (thrown) => thrown === error)
    assert.equal(once.seen.length, 1, `${error.message} was asked again`)

    const twice = structuredFrom([
      { throws: refusedSpent('none') },
      { throws: error },
      { value: { units: [1] } },
    ])
    await assert.rejects(askStructured(twice.model, CALL), (thrown) => thrown === error)
    assert.equal(twice.seen.length, 2, `${error.message} on the second ask was asked a third time`)
  }
  // And the answer-refusal sentences are refusals like any other.
  const echo = new Spent({
    port: 'model',
    model: 'MiniMax-M2.7',
    costCents: 0,
    detail: 'the schema, echoed',
    answer: '{"$schema":"…"}',
    refused: answerRefusal('schema'),
  })
  const echoed = structuredFrom([{ throws: echo }, { value: { units: [1] } }])
  await askStructured(echoed.model, CALL)
  assert.equal(echoed.seen.length, 2)
})

// ---------------------------------------------------------------- 11

function pipelineSources(): string[] {
  const found: string[] = []
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name)
      if (statSync(path).isDirectory()) walk(path)
      else if (name.endsWith('.ts')) found.push(relative(REPO, path).replace(/\\/g, '/'))
    }
  }
  walk(join(REPO, 'packages', 'pipeline', 'src'))
  return found.sort()
}

/** Every way a file reaches a model's `structured`: `.structured`, `['structured']`, `{ structured }`. */
function structuredUses(file: string): string[] {
  const text = readFileSync(join(REPO, file), 'utf8')
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true)
  const found: string[] = []
  const visit = (node: ts.Node) => {
    if (ts.isPropertyAccessExpression(node) && node.name.text === 'structured') {
      found.push(node.getText(source))
    }
    if (
      ts.isElementAccessExpression(node) &&
      ts.isStringLiteralLike(node.argumentExpression) &&
      node.argumentExpression.text === 'structured'
    ) {
      found.push(node.getText(source))
    }
    if (ts.isBindingElement(node)) {
      const name = (node.propertyName ?? node.name).getText(source)
      if (name === 'structured') found.push(node.getText(source))
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  return found
}

test("11. no structured call is made in packages/pipeline/src except through askStructured: a scan finds .structured, ['structured'] and a destructured structured only in gates/structured.ts, and the five sites that called it — planReel's plan, score and repair, Gate 1's reconcile, Gate 5 — import askStructured", () => {
  const files = pipelineSources()
  assert.ok(files.length > 20, `the scan read only ${files.length} files`)
  const reaching = files.filter((f) => structuredUses(f).length > 0)
  assert.deepEqual(reaching, ['packages/pipeline/src/gates/structured.ts'])

  const sites: Array<[string, number]> = [
    ['packages/pipeline/src/plan/index.ts', 3],
    ['packages/pipeline/src/gates/gate1.ts', 1],
    ['packages/pipeline/src/gates/gate5.ts', 1],
  ]
  for (const [file, calls] of sites) {
    const text = readFileSync(join(REPO, file), 'utf8')
    assert.match(
      text,
      /import \{[^}]*\baskStructured\b[^}]*\} from '\.\.\/gates\/structured\.ts'|import \{[^}]*\baskStructured\b[^}]*\} from '\.\/structured\.ts'/,
      `${file} does not import askStructured`,
    )
    assert.equal(
      (text.match(/\baskStructured\(/g) ?? []).length,
      calls,
      `${file} calls askStructured a different number of times`,
    )
  }
})

// ---------------------------------------------------------------- 12

test('12. the stand-in: a scripted structured value its schema refuses throws Spent — port model, 0¢, answer the value as JSON, refused its issues — and a { throws } entry still throws a plain Error', async () => {
  const refused = { units: 'none' }
  const stand = fakeModel(
    { planner: [{ value: refused }, { throws: 'stand-in down' }] },
    { models },
  )
  let thrown: unknown
  await stand.structured(CALL).catch((error: unknown) => {
    thrown = error
  })
  assert.ok(isSpent(thrown), `the stand-in threw ${String(thrown)}`)
  assert.equal(thrown.receipt.port, 'model')
  assert.equal(thrown.receipt.costCents, 0)
  assert.equal(thrown.receipt.model, models.planner)
  assert.equal(thrown.receipt.answer, JSON.stringify(refused))
  const expected = SCHEMA.safeParse(refused)
  assert.ok(!expected.success)
  assert.deepEqual(thrown.receipt.refused, refusalsOf(expected.error))

  await assert.rejects(stand.structured(CALL), (error: unknown) => {
    assert.ok(!isSpent(error), 'a scripted throw became a Spent')
    assert.equal((error as Error).message, 'stand-in down')
    return true
  })
})

// ---------------------------------------------------------------- through the worker

interface Rows {
  lost: Array<{ port: string; cost_cents: number }>
  refused: Array<{
    port: string
    role: string | null
    call: string | null
    about: string[]
    ask: number
    reasons: string[]
    answer: string
  }>
}

function rowsOf(engine: Awaited<ReturnType<typeof startEngine>>, runId: string): Rows {
  return {
    lost: engine
      .query<{ port: string; cost_cents: number }>(
        'SELECT port, cost_cents FROM lost_call WHERE run_id = ? ORDER BY id',
        runId,
      )
      .map((r) => ({ port: String(r.port), cost_cents: Number(r.cost_cents) })),
    refused: engine
      .query<Record<string, unknown>>(
        'SELECT * FROM refused_answer WHERE run_id = ? ORDER BY id',
        runId,
      )
      .map((r) => ({
        port: String(r.port),
        role: r.role as string | null,
        call: r.call as string | null,
        about: JSON.parse(String(r.about)) as string[],
        ask: Number(r.ask),
        reasons: JSON.parse(String(r.reasons)) as string[],
        answer: String(r.answer),
      })),
  }
}

/** A planning answer the schema refuses, carrying a URL with a query string and a key-shaped word. */
const BAD_PLAN = {
  units: 'none',
  note: 'see https://cdn.example.test/a.png?Signature=abc123 and sk-abcdefghijklmnopqrs',
}

// ---------------------------------------------------------------- 13

test("13. through the worker, a plan run whose planner's first answer is refused and second parses completes; the second planner call carries refused equal to the first's issues; one lost_call row at 0¢ and one refused_answer row — planner, structured, ask 1, those issues, the scripted answer; a scorer refused once the same, role reconciler; and a refused planner answer holding a URL with a query string and an sk- string is kept masked", async () => {
  const base = twoSurvivors()
  const engine = await startEngine({
    worker: true,
    script: {
      planner: [{ value: BAD_PLAN }, ...(base.planner ?? [])],
      reconciler: [{ value: { answers: ['maybe'] } }, ...(base.reconciler ?? [])],
    },
  })
  try {
    const ran = await run(engine, planRequest('r13'))
    assert.equal(ran.result.status, 'completed', JSON.stringify(ran.result))

    const planner = engine.model.calls.filter((c) => c.role === 'planner')
    assert.equal(planner.length, 3, 'plan a twice and plan b once')
    assert.equal(planner[0]?.refused, undefined)
    const rows = rowsOf(engine, ran.runId)
    const first = rows.refused.find((r) => r.role === 'planner')
    assert.ok(first !== undefined, 'the refused planner answer was not kept')
    assert.deepEqual(planner[1]?.refused, first.reasons)
    assert.equal(first.call, 'structured')
    assert.equal(first.ask, 1)
    assert.deepEqual(first.about, [])
    // Exactly the issues grouping a's four-unit planning schema gives this answer.
    const refusal = planningAnswer(4).safeParse(BAD_PLAN)
    assert.ok(!refusal.success)
    assert.deepEqual(first.reasons, [...refusalsOf(refusal.error)])
    // Kept, and masked where it was written (D-022).
    assert.match(first.answer, /"units":"none"/)
    assert.doesNotMatch(first.answer, /\?Signature=|sk-abcdefghijklmnopqrs/)
    assert.match(first.answer, /https:\/\/cdn\.example\.test\/a\.png/)

    const scorer = rows.refused.find((r) => r.role === 'reconciler')
    assert.ok(scorer !== undefined, 'the refused score was not kept')
    assert.equal(scorer.ask, 1)
    assert.equal(engine.model.calls.filter((c) => c.role === 'reconciler').length, 3)

    assert.deepEqual(rows.lost, [
      { port: 'model', cost_cents: 0 },
      { port: 'model', cost_cents: 0 },
    ])
    assert.equal(rows.refused.length, 2)
    // The receipts: one per answer that parsed — two plans and two scores.
    assert.deepEqual(
      ran.receipts.map((r) => r.role),
      ['planner', 'planner', 'reconciler', 'reconciler'],
    )
  } finally {
    await engine.stop()
  }
})

// ---------------------------------------------------------------- 14

test("14. through the worker, a plan run whose planner is refused twice fails with the second Spent's words; two lost_call rows, two refused_answer rows (ask 1, ask 2), and no third planner call", async () => {
  const engine = await startEngine({
    worker: true,
    script: {
      planner: [{ value: BAD_PLAN }, { value: { units: 'still none' } }, { value: answerA() }],
    },
  })
  try {
    const ran = await run(engine, planRequest('r14'))
    assert.equal(ran.result.status, 'failed', JSON.stringify(ran.result))
    assert.match(String(ran.result.detail), /refused by its schema/)
    assert.match(String(ran.result.detail), /still none|units/)
    assert.equal(engine.model.calls.filter((c) => c.role === 'planner').length, 2)
    const rows = rowsOf(engine, ran.runId)
    assert.equal(rows.lost.length, 2)
    assert.deepEqual(
      rows.refused.map((r) => [r.role, r.ask]),
      [
        ['planner', 1],
        ['planner', 2],
      ],
    )
    assert.match(rows.refused[1]?.answer ?? '', /still none/)
    assert.deepEqual(ran.receipts, [])
  } finally {
    await engine.stop()
  }
})

// ---------------------------------------------------------------- 15

const [, , barons] = THREE_RANKS_PICS as [Pic, Pic, Pic, Pic]
const [, t1] = takesOf(THREE_RANKS) as [Take, Take]

test('15. through the worker, a Gate 1 reconcile refused once and a Gate 5 reconcile refused once each decide their picture or take; one refused_answer row about that id, and one reconciler receipt for it — the second', async () => {
  const stillEngine = await startEngine({
    worker: true,
    script: stillsScript(THREE_RANKS, THREE_RANKS_PICS, {
      reconciler: { [barons.key]: refusedThen({ subjects: 'none' }, passes(barons)) },
    }),
  })
  try {
    const still = await stills(stillEngine, stillsRequest('r15-still'))
    assert.equal(still.result.status, 'completed', JSON.stringify(still.result))
    const id = pictureOf(still, barons.key).picture_id
    assert.equal(pictureOf(still, barons.key).gate1?.outcome, 'accept')
    const rows = rowsOf(stillEngine, still.runId)
    assert.deepEqual(
      rows.refused.map((r) => [r.role, r.call, r.about, r.ask]),
      [['reconciler', 'structured', [id], 1]],
    )
    const reconciled = still.receipts.filter(
      (r) => r.call === 'structured' && r.role === 'reconciler' && r.picture_ids.includes(id),
    )
    assert.equal(reconciled.length, 1, `${id} has ${reconciled.length} reconciler receipts`)
  } finally {
    await stillEngine.stop()
  }

  const clipEngine = await startEngine({
    worker: true,
    script: videoScript(THREE_RANKS, THREE_RANKS_PICS, {
      reconciler: { [t1.key]: refusedThen({ subjects: 'none' }, passesTake(t1)) },
    }),
  })
  try {
    const clip = await video(clipEngine, videoRequest('r15-take'))
    assert.ok(
      clip.jobs.some((j) => j.kind === 'reel.assemble'),
      `the clips stage did not complete: ${JSON.stringify(clip.result)}`,
    )
    const take = takeOf(clip, t1.key).take_id
    const rows = rowsOf(clipEngine, clip.runId)
    assert.deepEqual(
      rows.refused.map((r) => [r.role, r.call, r.about, r.ask]),
      [['reconciler', 'structured', [take], 1]],
    )
    const reconciled = clip.receipts.filter(
      (r) => r.call === 'structured' && r.role === 'reconciler' && r.take_ids.includes(take),
    )
    assert.equal(reconciled.length, 1, `${take} has ${reconciled.length} reconciler receipts`)
  } finally {
    await clipEngine.stop()
  }
})
