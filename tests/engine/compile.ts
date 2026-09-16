import assert from 'node:assert/strict'
import { join } from 'node:path'
import ts from 'typescript'
import { REPO } from '../_repo.ts'

// A snippet compiled by TypeScript against the live source, for a check that a misuse of a port
// is a type error (reel-render's check 1, in the form reel-stills' check 2 wrote inline).
//
// The snippet is never written to disk: the program reads it from memory and everything else from
// the real repository, so what compiles is the live port types.

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
    // A snippet declares only what its call needs; an unused local is not what makes a misuse a
    // type error, and leaving these on would let one pass for the wrong reason.
    noUnusedLocals: false,
    noUnusedParameters: false,
  }
}

/**
 * Compiles one snippet and returns its errors, in the snippet only, each followed by the source text
 * it was reported at: TypeScript sometimes names only the types in its message and says which field
 * it means by where it points. `dir` is where the snippet pretends to live — inside the repository,
 * so its relative imports resolve.
 */
export function errorsIn(dir: string, source: string): string[] {
  const file = join(dir, 'snippet.ts')
  const compilerOptions = options()
  const host = ts.createCompilerHost(compilerOptions, true)
  const readFile = host.readFile.bind(host)
  const fileExists = host.fileExists.bind(host)
  const getSourceFile = host.getSourceFile.bind(host)
  host.readFile = (name) => (join(name) === file ? source : readFile(name))
  host.fileExists = (name) => join(name) === file || fileExists(name)
  host.getSourceFile = (name, ...rest) =>
    join(name) === file
      ? ts.createSourceFile(name, source, ts.ScriptTarget.Latest, true)
      : getSourceFile(name, ...rest)

  const program = ts.createProgram([file], compilerOptions, host)
  const snippet = program.getSourceFile(file)
  assert.ok(snippet !== undefined, 'the snippet never reached the program')
  return [
    ...program.getSemanticDiagnostics(snippet),
    ...program.getSyntacticDiagnostics(snippet),
  ].map((d) => {
    const message = ts.flattenDiagnosticMessageText(d.messageText, ' ')
    if (d.start === undefined || d.length === undefined) return message
    return `${message} [at '${source.slice(d.start, d.start + d.length)}']`
  })
}
