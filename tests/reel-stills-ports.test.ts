import assert from 'node:assert/strict'
import { join } from 'node:path'
import { test } from 'node:test'
import ts from 'typescript'
import { REPO } from './_repo.ts'

// reel-stills, Slice 1 — check 2 (docs/features/reel-stills.md): the model port's three calls,
// compiled by TypeScript here (S-037, I-8, D-042).
//
// Review 4 of reel-engine found the witness could be sighted through `structured`: a call that
// accepts a picture, a free prompt and any schema lets a Gate 1 step show the brief to a vision
// call. The type is the first of the three things that close it, and a type is only closed if a
// compiler says so — so each misuse is compiled here and must be an error NAMING the field that
// makes it one, and the calls Gate 3 writes must compile clean.
//
// The snippets are never written to disk: the program reads them from memory and everything else
// from the real repository, so this compiles the live port types.

const CONTRACTS = '../../packages/contracts/src/index.ts'
const CONTRACT = '../../packages/reel-contract/src/index.ts'

/** Where a snippet pretends to live: inside the repository, so its relative imports resolve. */
const DIR = join(REPO, '.tmp', `stills-ports-${process.pid}`)

function options(): ts.CompilerOptions {
  const read = ts.readConfigFile(join(REPO, 'tsconfig.base.json'), ts.sys.readFile)
  assert.equal(read.error, undefined, 'tsconfig.base.json could not be read')
  const parsed = ts.parseJsonConfigFileContent(read.config, ts.sys, REPO)
  return {
    ...parsed.options,
    noEmit: true,
    declaration: false,
    declarationMap: false,
    emitDeclarationOnly: false,
    composite: false,
    incremental: false,
    // A snippet declares only what its call needs; an unused local is not what makes a
    // misuse a type error, and leaving these on would let one pass for the wrong reason.
    noUnusedLocals: false,
    noUnusedParameters: false,
  }
}

/** Compile one snippet against the live source and return its errors, in this file only. */
function errorsIn(source: string): string[] {
  const file = join(DIR, 'snippet.ts')
  const host = ts.createCompilerHost(options(), true)
  const readFile = host.readFile.bind(host)
  const fileExists = host.fileExists.bind(host)
  const getSourceFile = host.getSourceFile.bind(host)
  host.readFile = (name) => (join(name) === file ? source : readFile(name))
  host.fileExists = (name) => join(name) === file || fileExists(name)
  host.getSourceFile = (name, ...rest) =>
    join(name) === file
      ? ts.createSourceFile(name, source, ts.ScriptTarget.Latest, true)
      : getSourceFile(name, ...rest)

  const program = ts.createProgram([file], options(), host)
  const source_ = program.getSourceFile(file)
  assert.ok(source_ !== undefined, 'the snippet never reached the program')
  return [
    ...program.getSemanticDiagnostics(source_),
    ...program.getSyntacticDiagnostics(source_),
  ].map((d) => ts.flattenDiagnosticMessageText(d.messageText, ' '))
}

const PREAMBLE = [
  `import type { LanguageModelPort, PictureRef } from '${CONTRACTS}'`,
  `import type { Criterion } from '${CONTRACT}'`,
  '',
  "type StructuredCall = Parameters<LanguageModelPort['structured']>[0]",
  'declare const model: LanguageModelPort',
  "declare const schema: StructuredCall['schema']",
  'declare const picture: PictureRef',
  'declare const other: PictureRef',
  'declare const criterion: Criterion',
  '',
].join('\n')

const snippet = (body: string) =>
  `${PREAMBLE}export async function call(): Promise<void> {\n${body}\n}\n`

// ---------------------------------------------------------------- 2

test('2. the three calls, as Gate 3 writes them, compile', () => {
  const legal = snippet(
    [
      "  await model.structured({ prompt: 'p', schema, role: 'planner', temperature: 0 })",
      '  await model.structured({',
      '    prompt: `is ${criterion.text} shown?`,',
      '    schema,',
      "    role: 'reconciler',",
      '    temperature: 0,',
      '    pictureIds: [picture.pictureId],',
      '  })',
      '  await model.observe({ picture, temperature: 0 })',
      "  await model.compare({ pictures: [picture, other], subjects: ['the king'], temperature: 0 })",
    ].join('\n'),
  )
  assert.deepEqual(errorsIn(legal), [], 'a call Gate 3 writes did not compile')
})

/** Each misuse, with the word the compiler must name when it refuses it. */
const MISUSES: ReadonlyArray<readonly [string, string, string]> = [
  [
    'a picture passed to structured',
    "  await model.structured({ prompt: 'p', schema, role: 'planner', temperature: 0, picture })",
    'picture',
  ],
  [
    'picture ids that are pictures, passed to structured',
    "  await model.structured({ prompt: 'p', schema, role: 'planner', temperature: 0, pictureIds: [picture] })",
    'PictureRef',
  ],
  [
    'role witness on structured',
    "  await model.structured({ prompt: 'p', schema, role: 'witness', temperature: 0 })",
    'witness',
  ],
  [
    'role judge on structured',
    "  await model.structured({ prompt: 'p', schema, role: 'judge', temperature: 0 })",
    'judge',
  ],
  [
    'a prompt passed to observe',
    "  await model.observe({ picture, prompt: 'p', temperature: 0 })",
    'prompt',
  ],
  [
    'a schema passed to observe',
    '  await model.observe({ picture, schema, temperature: 0 })',
    'schema',
  ],
  [
    'a criterion passed to observe',
    '  await model.observe({ picture, criterion, temperature: 0 })',
    'criterion',
  ],
  [
    'a prompt passed to compare',
    "  await model.compare({ pictures: [picture, other], subjects: [], prompt: 'p', temperature: 0 })",
    'prompt',
  ],
  [
    'a schema passed to compare',
    '  await model.compare({ pictures: [picture, other], subjects: [], schema, temperature: 0 })',
    'schema',
  ],
  [
    'a criterion passed to compare',
    '  await model.compare({ pictures: [picture, other], subjects: [], criterion, temperature: 0 })',
    'criterion',
  ],
]

test('2. a picture, a witness role, a prompt, a schema or a criterion on the wrong call is a type error', () => {
  for (const [what, body, names] of MISUSES) {
    const errors = errorsIn(snippet(body))
    assert.ok(errors.length > 0, `${what} compiled`)
    assert.ok(
      errors.some((e) => e.includes(names)),
      `${what} was refused, but no error names "${names}": ${errors.join(' | ')}`,
    )
  }
})
