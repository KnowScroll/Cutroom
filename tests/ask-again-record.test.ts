import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { test } from 'node:test'
import ts from 'typescript'
import { z } from 'zod'
import {
  ANSWER_REFUSALS,
  Spent,
  isSpent,
  type LanguageModelPort,
  type LostCall,
  type ModelReceipt,
  type ModelRole,
} from '@cutroom/contracts'
import { minimaxModel } from '@cutroom/providers'
import { recordingPort } from '../apps/worker/src/recording-port.ts'
import {
  REFUSED_ANSWER_CAP,
  claimJob,
  closeDatabase,
  openDatabase,
  recordRefusedAnswer,
  submitRun,
  type Db,
} from '../packages/domain/src/index.ts'
import { REPO } from './_repo.ts'
import { errorsIn } from './engine/compile.ts'
import { stillsRequest } from './engine/stills.ts'
import { readWire, recordedFetch, type Wire } from './engine/wire.ts'

// ask-again, Slice 2 — checks 3 to 6 (docs/features/ask-again.md): THE RECORD. An answer the adapter
// could not read travels on its `Spent` — the text, and, when the answer itself is at fault, why —
// and the worker keeps it in one `refused_answer` row, redacted then capped (S-156, D-022). And the
// reasons a second ask may carry are two brands only `packages/contracts` can build, so no text but
// the witness's own schema's issues can ever sit beside a picture (I-8).
//
// NOTHING HERE SPENDS: recorded wire, hand-written ports and a database of each test's own.

const KEY = 'canary-not-a-real-key-49r'

const MODELS: Readonly<Record<ModelRole, string>> = {
  planner: 'MiniMax-M2.7',
  reconciler: 'MiniMax-M3',
  witness: 'MiniMax-M3',
  judge: 'MiniMax-M3',
}

// ---------------------------------------------------------------- 3

/** A schema the recorded `units` answers do NOT match: `scenes` is missing, `units` is extra. */
const REFUSING = z.strictObject({ scenes: z.array(z.string()) })

/** `minimax-chat-plain`'s body, with this content in place of its answer. */
function answering(content: string, finish = 'stop'): Wire {
  const plain = readWire('minimax-chat-plain')
  const body = plain.response.body as { choices: Array<Record<string, unknown>> }
  return {
    ...plain,
    note: 'built in the test: the plain answer, its content replaced.',
    case: 'built',
    response: {
      ...plain.response,
      body: {
        ...body,
        choices: [{ index: 0, finish_reason: finish, message: { role: 'assistant', content } }],
      },
    },
  }
}

/** A 200 whose body is JSON and is not this wire: no `choices` at all. */
const notTheWire: Wire = {
  ...readWire('minimax-chat-plain'),
  note: 'built in the test: a 200 that is JSON and not a chat completion.',
  case: 'built',
  response: { status: 200, headers: { 'content-type': 'application/json' }, body: { hello: 1 } },
}

/** The `Spent` a structured call on this wire throws, and its receipt read directly. */
async function spentOn(wire: string | Wire): Promise<LostCall> {
  const recorded = recordedFetch([wire])
  const port = minimaxModel({ key: KEY, models: MODELS, fetch: recorded.fetch })
  let thrown: unknown
  await port
    .structured({ role: 'planner', prompt: 'Cut these.', schema: REFUSING, temperature: 0 })
    .catch((error: unknown) => {
      thrown = error
    })
  assert.ok(isSpent(thrown), `the call did not throw Spent: ${String(thrown)}`)
  return thrown.receipt
}

/** The `<path>: <message>` lines REFUSING gives this answer text. */
function issuesOf(text: string): string[] {
  const parsed = REFUSING.safeParse(JSON.parse(text))
  assert.ok(!parsed.success)
  return parsed.error.issues.map((i) => `${i.path.join('.') || '(answer)'}: ${i.message}`)
}

test("3. the MiniMax adapter, on recorded wire, puts on a Spent it raises while reading an answer: answer, exactly the text after the reasoning block with a whole-answer fence unwrapped — holding no <think>, no fence and none of the HTTP body — for a schema refusal, not JSON, the schema echoed and a cut-off answer; refused for the first three only, the schema refusal's as <path>: <message> lines; and neither on a body that is not JSON, not this wire, or reasoning with no answer — read off receipt.answer and receipt.refused directly", async () => {
  // A schema refusal, after a reasoning block: the answer is what follows `</think>`, exactly.
  const thinking = await spentOn('minimax-chat-thinking')
  const afterThink = '{"units":[{"sentence":1,"shot":"a wide, still frame"}]}'
  assert.equal(thinking.answer, afterThink)
  assert.deepEqual(thinking.refused, issuesOf(afterThink))
  assert.ok(thinking.refused?.some((line) => line.startsWith('scenes: ')))

  // A whole-answer fence, inside a reasoning block's wake: neither wrapper is kept (S-132).
  const fenced = await spentOn('minimax-chat-fenced')
  assert.ok(fenced.answer !== undefined && fenced.answer.length > 0)
  assert.doesNotMatch(fenced.answer, /<think>|```/)
  assert.deepEqual(fenced.refused, issuesOf(fenced.answer))

  // Not JSON at all — words where an object belongs.
  const prose = 'The first sentence is one shot, a wide still frame.'
  const words = await spentOn(answering(prose))
  assert.equal(words.answer, prose)
  assert.deepEqual(words.refused, [ANSWER_REFUSALS['not-json']])

  // The schema itself, echoed (S-136).
  const echo = await spentOn('minimax-chat-echo')
  assert.match(echo.answer ?? '', /^\{"\$schema":/)
  assert.deepEqual(echo.refused, [ANSWER_REFUSALS.schema])

  // Cut off by the token budget (S-140): its text is kept, and it is not the answer's fault.
  const cut = await spentOn('minimax-chat-cut')
  assert.equal(cut.answer, '{"units":[{"sentence":1,"shot":"a wide, still fra')
  assert.equal(cut.refused, undefined)

  // Nothing that is the answer: reasoning with nothing after it, a gateway page, a body not this wire.
  for (const wire of ['minimax-chat-reasoning', 'minimax-chat-garbled', notTheWire] as const) {
    const lost = await spentOn(wire)
    assert.equal(
      lost.answer,
      undefined,
      `${typeof wire === 'string' ? wire : 'not the wire'} kept an answer`,
    )
    assert.equal(lost.refused, undefined)
  }

  // And no answer holds anything of the HTTP body around it.
  for (const lost of [thinking, fenced, words, echo, cut]) {
    assert.doesNotMatch(lost.answer ?? '', /"choices"|"usage"|recorded-|base_resp/)
  }
})

// ---------------------------------------------------------------- the database

/** A database of this test's own, with one run submitted and its first job claimed. */
function engine(): { db: Db; path: string; runId: string; jobId: number; clean(): void } {
  const dir = mkdtempSync(join(tmpdir(), 'cutroom-refused-db-'))
  const path = join(dir, 'cutroom.sqlite')
  const db = openDatabase(path)
  const request = stillsRequest('req-refused-1')
  const { runId } = submitRun(db, request, JSON.stringify(request))
  const job = claimJob(db, ['reel.plan'])
  assert.ok(job !== undefined, 'no job to claim')
  return {
    db,
    path,
    runId,
    jobId: job.id,
    clean: () => {
      closeDatabase(db)
      rmSync(dir, { recursive: true, force: true })
    },
  }
}

/** Every row of one table, read with SQL rather than through the code that wrote it. */
function rows(path: string, table: 'refused_answer' | 'lost_call'): Array<Record<string, unknown>> {
  const sqlite = new DatabaseSync(path, { readOnly: true })
  try {
    return sqlite.prepare(`SELECT * FROM ${table} ORDER BY id`).all() as Array<
      Record<string, unknown>
    >
  } finally {
    sqlite.close()
  }
}

// ---------------------------------------------------------------- 4

const receipt = (role: ModelRole, call: ModelReceipt['call']): ModelReceipt => ({
  model: 'hand-written',
  role,
  call,
  temperature: 0,
  usage: { inputTokens: 0, outputTokens: 0 },
  fake: true,
  pictureIds: [],
  takeIds: [],
})

/** A port whose every call throws the Spent it is given, or answers when given none. */
function throwing(spent: Spent | null): LanguageModelPort {
  const fail = async <T>(ok: T): Promise<T> => {
    if (spent !== null) throw spent
    return ok
  }
  return {
    structured: async () => fail({ value: {} as never, receipt: receipt('planner', 'structured') }),
    observe: async () => fail({ value: {}, receipt: receipt('witness', 'observe') }),
    compare: async () => fail({ value: {}, receipt: receipt('judge', 'compare') }),
    judgeCut: async () => fail({ value: {}, receipt: receipt('judge', 'judgeCut') }),
    readText: async () => fail({ value: {}, receipt: receipt('witness', 'readText') }),
  }
}

const withAnswer = (over: Partial<LostCall> = {}) =>
  new Spent({
    port: 'model',
    model: 'MiniMax-M3',
    costCents: 0,
    detail: 'the answer could not be read',
    answer: '{"entities":[{"count":-1}]}',
    ...over,
  })

test('4. recordingPort writes one refused_answer row for each Spent carrying an answer, on each of the five calls — ask 2 when the call carried refused, ask 1 otherwise, reasons its refused or else its detail — and none for a Spent without one; the lost_call row is written exactly as before', async () => {
  const e = engine()
  try {
    const picture = { pictureId: 'a1-shot-1-single', path: 'pictures/a1-shot-1-single.png' }
    const other = { pictureId: 'a1-shot-2-single', path: 'pictures/a1-shot-2-single.png' }
    const clip = { takeId: 'a1-shot-1-take-1', path: 'clips/a1-shot-1-take-1.mp4' }
    const port = (spent: Spent | null) => recordingPort(throwing(spent), e.db, e.runId, e.jobId)
    const schema = z.object({})
    const refusedBefore = ['entities.0.count: Too small: expected number to be >0']

    // Each of the five calls, with an answer on its Spent; refused on the Spent for two of them.
    const calls: Array<[string, (p: LanguageModelPort) => Promise<unknown>, Spent]> = [
      [
        'structured',
        (p) =>
          p.structured({
            prompt: 'p',
            schema,
            role: 'reconciler',
            temperature: 0,
            pictureIds: [picture.pictureId],
          }),
        withAnswer({ refused: ['scenes: Invalid input'] as never }),
      ],
      ['observe', (p) => p.observe({ picture, temperature: 0 }), withAnswer()],
      [
        'observe, a second ask',
        (p) => p.observe({ clip, temperature: 0, refused: refusedBefore as never }),
        withAnswer(),
      ],
      [
        'compare',
        (p) => p.compare({ pictures: [picture, other], subjects: ['the king'], temperature: 0 }),
        withAnswer(),
      ],
      ['judgeCut', (p) => p.judgeCut({ shots: [], questions: [], temperature: 0 }), withAnswer()],
      ['readText', (p) => p.readText({ picture, temperature: 0 }), withAnswer()],
    ]
    for (const [what, make, spent] of calls) {
      await assert.rejects(
        make(port(spent)),
        (thrown) => thrown === spent,
        `${what} did not rethrow`,
      )
    }
    // A Spent without an answer: the lost call, and no refused answer.
    const bare = new Spent({
      port: 'model',
      model: 'MiniMax-M3',
      costCents: 0,
      detail: 'reasoning only',
    })
    await assert.rejects(
      port(bare).observe({ picture, temperature: 0 }),
      (thrown) => thrown === bare,
    )
    // A call that answers: neither.
    await port(null).observe({ picture, temperature: 0 })

    const kept = rows(e.path, 'refused_answer').map((row) => ({
      role: row.role,
      call: row.call,
      about: JSON.parse(String(row.about)),
      ask: row.ask,
      reasons: JSON.parse(String(row.reasons)),
      answer: row.answer,
      port: row.port,
    }))
    const answer = '{"entities":[{"count":-1}]}'
    const detail = ['the answer could not be read']
    assert.deepEqual(kept, [
      {
        port: 'model',
        role: 'reconciler',
        call: 'structured',
        about: [picture.pictureId],
        ask: 1,
        reasons: ['scenes: Invalid input'],
        answer,
      },
      {
        port: 'model',
        role: 'witness',
        call: 'observe',
        about: [picture.pictureId],
        ask: 1,
        reasons: detail,
        answer,
      },
      {
        port: 'model',
        role: 'witness',
        call: 'observe',
        about: [clip.takeId],
        ask: 2,
        reasons: detail,
        answer,
      },
      {
        port: 'model',
        role: 'judge',
        call: 'compare',
        about: [picture.pictureId, other.pictureId],
        ask: 1,
        reasons: detail,
        answer,
      },
      {
        port: 'model',
        role: 'judge',
        call: 'judgeCut',
        about: [],
        ask: 1,
        reasons: detail,
        answer,
      },
      {
        port: 'model',
        role: 'witness',
        call: 'readText',
        about: [picture.pictureId],
        ask: 1,
        reasons: detail,
        answer,
      },
    ])

    // The lost calls, exactly as paid-failures writes them: one per Spent, the bare one included.
    const lost = rows(e.path, 'lost_call')
    assert.equal(lost.length, calls.length + 1)
    assert.deepEqual(
      Object.keys(lost[0] ?? {}),
      ['id', 'run_id', 'port', 'model', 'cost_cents', 'detail', 'at'],
      'the lost_call table moved',
    )
  } finally {
    e.clean()
  }
})

// ---------------------------------------------------------------- 5

test("5. recordRefusedAnswer drops a URL's whole query string, \\/-escaped ones too; masks sk-, sd_live_ and JWT-shaped strings and the value of a credential-named JSON key; redacts before it cuts, so a key straddling 32 000 characters is masked; cuts a longer answer there with a marker naming its full length; and keeps a short clean answer byte for byte", () => {
  const e = engine()
  try {
    const keep = (answer: string, reasons: string[] = ['why']) =>
      recordRefusedAnswer(e.db, {
        runId: e.runId,
        refusal: {
          port: 'model',
          role: 'planner',
          call: 'structured',
          about: [],
          ask: 1,
          reasons,
          answer,
        },
      })
    const jwt = `eyJ${'a'.repeat(20)}.eyJ${'b'.repeat(20)}.${'c'.repeat(30)}`
    const dirty = [
      '{"note":"see https://cdn.example.test/a/b.png?OSSAccessKeyId=AKID&Signature=abc123 for it",',
      '"escaped":"https:\\/\\/cdn.example.test\\/c.png?X-Amz-Signature=zzz",',
      '"words":"sk-abcdefghijklmnop and sd_live_0123456789 and ' + jwt + '",',
      '"apiToken":"a value that names nothing secret-looking",',
      '"label":"a glowing ring"}',
    ].join('')
    keep(dirty, ['see https://x.example.test/y?token=abc'])

    const clean = '{"units":[{"sentence":1,"shot":"a wide, still frame"}]}'
    keep(clean)

    // A key straddling the cap: redacted first, so it is masked whole and never half-kept.
    const long = `${'x'.repeat(REFUSED_ANSWER_CAP - 5)} sk-abcdefghijklmnopqrstuvwxyz ${'y'.repeat(100)}`
    keep(long)

    const [first, second, third] = rows(e.path, 'refused_answer') as Array<Record<string, string>>
    const a = String(first?.answer)
    assert.doesNotMatch(a, /\?/, 'a query string was kept')
    assert.match(a, /https:\/\/cdn\.example\.test\/a\/b\.png for it/)
    assert.match(a, /https:\\\/\\\/cdn\.example\.test\\\/c\.png"/)
    assert.doesNotMatch(a, /sk-abcdefghijklmnop|sd_live_0123456789|eyJa/)
    assert.doesNotMatch(
      a,
      /names nothing secret-looking/,
      "a credential-named key's value was kept",
    )
    assert.match(a, /"label":"a glowing ring"/)
    assert.doesNotMatch(String(first?.reasons), /\?token=/, 'a reason kept a query string')

    assert.equal(second?.answer, clean, 'a clean answer was changed')

    const t = String(third?.answer)
    assert.doesNotMatch(t, /sk-abc/, 'a key straddling the cap was half-kept')
    assert.match(t, new RegExp(`… \\[cut at ${REFUSED_ANSWER_CAP} of \\d+ characters\\]$`))
    assert.equal(t.indexOf('… [cut at'), REFUSED_ANSWER_CAP)
  } finally {
    e.clean()
  }
})

// ---------------------------------------------------------------- 6

const CONTRACTS = '../packages/contracts/src/index.ts'

const PREAMBLE = [
  'import {',
  '  answerRefusal,',
  '  refusalsOf,',
  '  witnessObservation,',
  '  witnessRefusalsOf,',
  '  type LanguageModelPort,',
  '  type PictureRef,',
  '  type ClipRef,',
  `} from '${CONTRACTS}'`,
  "import type { Criterion } from '../packages/reel-contract/src/index.ts'",
  "import type { z } from 'zod'",
  '',
  "type StructuredCall = Parameters<LanguageModelPort['structured']>[0]",
  'declare const model: LanguageModelPort',
  "declare const schema: StructuredCall['schema']",
  'declare const picture: PictureRef',
  'declare const clip: ClipRef',
  'declare const criterion: Criterion',
  'declare const anyZodError: z.ZodError',
  'declare const answer: unknown',
  '',
].join('\n')

const snippet = (body: string) =>
  `${PREAMBLE}export async function call(): Promise<void> {\n${body}\n}\n`
const compiled = (body: string) => errorsIn(join(REPO, 'tests'), snippet(body))

/** Every TypeScript source under a folder, repository-relative, forward slashes. */
function sourcesUnder(folder: string): string[] {
  const found: string[] = []
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name)
      if (statSync(path).isDirectory()) {
        if (name !== 'node_modules' && name !== 'dist') walk(path)
      } else if (name.endsWith('.ts')) found.push(relative(REPO, path).replace(/\\/g, '/'))
    }
  }
  walk(join(REPO, folder))
  return found
}

/**
 * THE TYPE CHECKER, over every source file of every package and app, so a property is judged by the
 * type it lands in rather than its name: the budget guard's own `refused` lists (S-035) are
 * `RefusedCall[]` and are not this feature's, while a `refused` that lands in a brand — or that
 * lands in nothing typed at all, which is how an `any` would carry one — is.
 */
function typedProgram(files: readonly string[]): ts.Program {
  const read = ts.readConfigFile(join(REPO, 'tsconfig.base.json'), ts.sys.readFile)
  const parsed = ts.parseJsonConfigFileContent(read.config, ts.sys, REPO)
  return ts.createProgram(
    files.map((f) => join(REPO, f)),
    {
      ...parsed.options,
      noEmit: true,
      composite: false,
      incremental: false,
      declaration: false,
      declarationMap: false,
      emitDeclarationOnly: false,
    },
  )
}

interface Refused {
  file: string
  /** The initializer's text, or the name for a shorthand. */
  value: string
  /** The type the property lands in, or 'nothing typed'. */
  lands: string
}

/** Every property named `refused` whose type is either brand, or which lands in nothing typed. */
function brandedRefused(program: ts.Program, files: readonly string[]): Refused[] {
  const checker = program.getTypeChecker()
  const found: Refused[] = []
  for (const file of files) {
    const source = program.getSourceFile(join(REPO, file))
    assert.ok(source !== undefined, `${file} is not in the program`)
    const visit = (node: ts.Node) => {
      const named =
        (ts.isPropertyAssignment(node) || ts.isShorthandPropertyAssignment(node)) &&
        node.name.getText(source) === 'refused'
      if (named && ts.isObjectLiteralExpression(node.parent)) {
        const contextual = checker.getContextualType(node.parent)
        const property =
          contextual === undefined ? undefined : checker.getPropertyOfType(contextual, 'refused')
        const lands =
          property === undefined
            ? 'nothing typed'
            : checker.typeToString(checker.getTypeOfSymbolAtLocation(property, node))
        if (lands === 'nothing typed' || /\bRefusals\b|\bWitnessRefusals\b/.test(lands)) {
          const value = ts.isPropertyAssignment(node) ? node.initializer.getText(source) : 'refused'
          found.push({ file, value, lands })
        }
      }
      ts.forEachChild(node, visit)
    }
    visit(source)
  }
  return found
}

/** Every call of a function by this name, with the text of its arguments. */
function callsOf(file: string, name: string): string[][] {
  const text = readFileSync(join(REPO, file), 'utf8')
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true)
  const found: string[][] = []
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node) && node.expression.getText(source) === name) {
      found.push(node.arguments.map((a) => a.getText(source)))
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  return found
}

/** Every cast to one of the two brands. */
function brandCasts(file: string): string[] {
  const text = readFileSync(join(REPO, file), 'utf8')
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true)
  const found: string[] = []
  const visit = (node: ts.Node) => {
    if (
      (ts.isAsExpression(node) || ts.isTypeAssertionExpression(node)) &&
      /\b(?:Witness)?Refusals\b/.test(node.type.getText(source))
    ) {
      found.push(`${file}: ${node.getText(source)}`)
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  return found
}

test("6. only the witness's own schemas can fill observe's refused: a compile check finds observe({ picture, temperature: 0, refused: [criterion.text] }), observe({ clip, temperature: 0, refused: refusalsOf(anyZodError) }) and structured({ …, refused: ['x'] }) are type errors while witnessRefusalsOf's result compiles for observe and refusalsOf's and answerRefusal's for structured; witnessRefusalsOf throws for any schema but the two, by identity; no cast to either brand exists outside packages/contracts/src/refusals.ts; with the type checker, an object property named refused — written out or shorthand — that lands in either brand, or in nothing typed, exists only in gates/witness.ts, bound to witnessRefusalsOf's result, in gates/structured.ts, bound to a caught Spent's receipt.refused, and in the MiniMax adapter and the stand-in, bound to refusalsOf's or answerRefusal's result — the worker writes none; and witnessRefusalsOf is called only in gates/witness.ts, and only on the value of the observe answer just received", async () => {
  // What compiles.
  assert.deepEqual(
    compiled(
      [
        '  const told = witnessRefusalsOf(answer, witnessObservation)',
        '  if (told !== null) await model.observe({ picture, temperature: 0, refused: told })',
        "  await model.structured({ prompt: 'p', schema, role: 'planner', temperature: 0, refused: refusalsOf(anyZodError) })",
        "  await model.structured({ prompt: 'p', schema, role: 'planner', temperature: 0, refused: answerRefusal('not-json') })",
      ].join('\n'),
    ),
    [],
    'a legal second ask did not compile',
  )

  // What does not: free text, another schema's refusal beside a clip, a string array on structured.
  for (const [what, body] of [
    [
      'a criterion beside a picture',
      '  await model.observe({ picture, temperature: 0, refused: [criterion.text] })',
    ],
    [
      "another schema's refusal beside a clip",
      '  await model.observe({ clip, temperature: 0, refused: refusalsOf(anyZodError) })',
    ],
    [
      'a string array on structured',
      "  await model.structured({ prompt: 'p', schema, role: 'planner', temperature: 0, refused: ['x'] })",
    ],
  ] as const) {
    const errors = compiled(body)
    assert.ok(errors.length > 0, `${what} compiled`)
    assert.ok(
      errors.some((e) => e.includes('refused')),
      `${what} failed for another reason: ${errors.join(' | ')}`,
    )
  }

  // The builder refuses any schema but the witness's own two, by identity.
  const { witnessRefusalsOf, witnessObservation, clipObservation } = await import(
    '@cutroom/contracts'
  )
  const lookalike = z.strictObject({ label: z.string() })
  assert.throws(() => witnessRefusalsOf({}, lookalike), /witness's own schemas/)
  assert.equal(witnessRefusalsOf({ nothing: true }, clipObservation)?.length !== 0, true)
  assert.ok(witnessRefusalsOf({}, witnessObservation) !== null)

  // No cast to either brand outside the one file that builds them.
  const everywhere = [...sourcesUnder('packages'), ...sourcesUnder('apps')]
  assert.ok(everywhere.length > 100, `the scan read only ${everywhere.length} files`)
  assert.deepEqual(
    everywhere.filter((f) => f !== 'packages/contracts/src/refusals.ts').flatMap(brandCasts),
    [],
  )

  // A `refused` that lands in a brand — or in nothing typed — only where the design puts one, each
  // bound to its one source: the witness's gate, from witnessRefusalsOf; the structured helper, from
  // a caught Spent; the adapter and the stand-in, from a builder. The worker writes none.
  const sources = [...sourcesUnder('packages'), ...sourcesUnder('apps')].filter((f) =>
    /^(?:packages|apps)\/[^/]+\/src\//.test(f),
  )
  const found = brandedRefused(typedProgram(sources), sources)
  const told = callsOf('packages/pipeline/src/gates/witness.ts', 'witnessRefusalsOf')
  for (const { file, value, lands } of found) {
    if (file === 'packages/pipeline/src/gates/witness.ts') {
      assert.ok(
        told.length > 0 && /^[A-Za-z]+$/.test(value),
        `witness.ts binds refused to ${value}`,
      )
    } else if (file === 'packages/pipeline/src/gates/structured.ts') {
      assert.match(value, /\.receipt\.refused$/, `structured.ts binds refused to ${value}`)
    } else if (
      file === 'packages/providers/src/minimax/model.ts' ||
      file === 'packages/providers/src/fake/model.ts'
    ) {
      assert.match(value, /^(?:refusalsOf|answerRefusal)\(/, `${file} binds refused to ${value}`)
    } else {
      assert.fail(`${file} writes a refused property that lands in ${lands}: ${value}`)
    }
  }
  // The scan sees what it must: the adapter's two answer refusals and its schema refusal, at least.
  assert.ok(
    found.filter((f) => f.file === 'packages/providers/src/minimax/model.ts').length >= 3,
    `the scan found only ${JSON.stringify(found)}`,
  )

  // witnessRefusalsOf: only in the witness's gate, and only on an observe answer's value.
  for (const file of sourcesUnder('packages/pipeline/src')) {
    const calls = callsOf(file, 'witnessRefusalsOf')
    if (file === 'packages/pipeline/src/gates/witness.ts') {
      for (const args of calls) {
        assert.match(args[0] ?? '', /\.value$/, `witnessRefusalsOf(${args.join(', ')})`)
      }
    } else {
      assert.deepEqual(calls, [], `${file} calls witnessRefusalsOf`)
    }
  }
})
