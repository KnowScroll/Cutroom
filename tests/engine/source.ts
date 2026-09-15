import { readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import ts from 'typescript'
import { REPO } from '../_repo.ts'

// Names in live source, read by TypeScript's own parser rather than by matching text.
//
// The decisions reel-plan's shape checks rest on are scoped to type names and field names, never
// to prose (D-070: a grep over every sentence also matches the verb in "flux beats nano-banana-2").
// A comment, a string or a test's own assertion message is none of these, so a parser is what keeps
// such a check from firing on the words that describe it.

const SKIP = new Set(['node_modules', 'dist', '.tmp', '.artifacts'])
const SOURCE = /\.(ts|mts|cts|mjs|cjs|js)$/

/** Every source file under the given repository folders, as repository-relative forward-slash paths. */
export function sourceFiles(...folders: string[]): string[] {
  const out: string[] = []
  const walk = (at: string) => {
    for (const entry of readdirSync(at, { withFileTypes: true })) {
      if (SKIP.has(entry.name)) continue
      const full = join(at, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (SOURCE.test(entry.name) && !entry.name.endsWith('.d.ts')) out.push(full)
    }
  }
  for (const folder of folders) walk(join(REPO, folder))
  return out.map((f) => relative(REPO, f).split('\\').join('/')).sort()
}

export type NameKind =
  'interface' | 'type' | 'class' | 'enum' | 'variable' | 'function' | 'export-alias' | 'field'

export interface Name {
  file: string
  line: number
  name: string
  kind: NameKind
  node: ts.Node
}

function parse(file: string): ts.SourceFile {
  const text = readFileSync(join(REPO, file), 'utf8')
  return ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true)
}

function nameText(name: ts.PropertyName | ts.BindingName | undefined): string | null {
  if (name === undefined) return null
  if (ts.isIdentifier(name) || ts.isPrivateIdentifier(name)) return name.text
  if (ts.isStringLiteral(name) || ts.isNumericLiteral(name)) return name.text
  if (ts.isComputedPropertyName(name) && ts.isStringLiteralLike(name.expression)) {
    return name.expression.text
  }
  return null
}

/**
 * Every declared name and every field name in the given files: interfaces, type aliases, classes,
 * enums, variables and functions at any depth, `export { a as B }` aliases, and fields — property
 * signatures and declarations, object-literal keys (so a zod `z.object({ … })` shape or a Drizzle
 * column counts), methods, accessors and enum members.
 */
export function names(files: string[]): Name[] {
  const out: Name[] = []
  for (const file of files) {
    const source = parse(file)
    const add = (node: ts.Node, name: string | null, kind: NameKind) => {
      if (name === null) return
      const line = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1
      out.push({ file, line, name, kind, node })
    }
    const visit = (node: ts.Node) => {
      if (ts.isInterfaceDeclaration(node)) add(node, node.name.text, 'interface')
      else if (ts.isTypeAliasDeclaration(node)) add(node, node.name.text, 'type')
      else if (ts.isClassDeclaration(node) || ts.isClassExpression(node)) {
        add(node, node.name?.text ?? null, 'class')
      } else if (ts.isEnumDeclaration(node)) add(node, node.name.text, 'enum')
      else if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
        add(node, node.name.text, 'variable')
      } else if (ts.isFunctionDeclaration(node)) add(node, node.name?.text ?? null, 'function')
      else if (ts.isExportSpecifier(node)) add(node, node.name.text, 'export-alias')
      else if (
        ts.isPropertySignature(node) ||
        ts.isPropertyDeclaration(node) ||
        ts.isPropertyAssignment(node) ||
        ts.isMethodSignature(node) ||
        ts.isMethodDeclaration(node) ||
        ts.isGetAccessorDeclaration(node) ||
        ts.isSetAccessorDeclaration(node) ||
        ts.isEnumMember(node)
      ) {
        add(node, nameText(node.name), 'field')
      } else if (ts.isShorthandPropertyAssignment(node)) add(node, node.name.text, 'field')
      ts.forEachChild(node, visit)
    }
    visit(source)
  }
  return out
}

export const where = (n: Name) => `${n.file}:${n.line} (${n.kind} ${n.name})`

/** The declarations that give a name a type or a value: everything but fields and export aliases. */
export const isDeclaration = (n: Name) => n.kind !== 'field' && n.kind !== 'export-alias'

/**
 * Every module specifier a file names, however it names it: `import`, `import type`, a bare
 * `import 'x'`, `export … from`, a dynamic `import('x')` and `require('x')`.
 */
export function importSpecifiers(file: string): string[] {
  const out: string[] = []
  const visit = (node: ts.Node) => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier !== undefined &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      out.push(node.moduleSpecifier.text)
    } else if (ts.isCallExpression(node)) {
      const [first] = node.arguments
      const dynamic = node.expression.kind === ts.SyntaxKind.ImportKeyword
      const required = ts.isIdentifier(node.expression) && node.expression.text === 'require'
      if ((dynamic || required) && first !== undefined && ts.isStringLiteralLike(first)) {
        out.push(first.text)
      }
    } else if (ts.isImportTypeNode(node)) {
      const arg = node.argument
      if (ts.isLiteralTypeNode(arg) && ts.isStringLiteral(arg.literal)) out.push(arg.literal.text)
    }
    ts.forEachChild(node, visit)
  }
  visit(parse(file))
  return out
}

/** Whether a file contains a `throw` statement anywhere — a path by which it can reject. */
export function throwStatements(file: string): number[] {
  const source = parse(file)
  const lines: number[] = []
  const visit = (node: ts.Node) => {
    if (ts.isThrowStatement(node)) {
      lines.push(source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1)
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  return lines
}

/** The specifiers a file imports each name from: `import { A, type B } from 'x'` gives A→x, B→x. */
export function importedNames(file: string): Map<string, string> {
  const out = new Map<string, string>()
  for (const statement of parse(file).statements) {
    if (!ts.isImportDeclaration(statement)) continue
    if (!ts.isStringLiteral(statement.moduleSpecifier)) continue
    const bindings = statement.importClause?.namedBindings
    if (bindings === undefined || !ts.isNamedImports(bindings)) continue
    for (const element of bindings.elements) {
      out.set((element.propertyName ?? element.name).text, statement.moduleSpecifier.text)
    }
  }
  return out
}
