import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { REPO } from './_repo.ts'

// The shape of the workspace, asserted rather than described.
//
// The rule this protects is §5 of the bootstrap prompt: a package is used through its
// src/index.ts and nothing else, and every package must be workable on its own. A package
// that is not referenced from the root tsconfig is a package nothing typechecks — which is
// the quiet version of not having a boundary at all.

type Pkg = { dir: string; name: string; json: Record<string, unknown> }

function packages(): Pkg[] {
  const found: Pkg[] = []
  for (const group of ['packages', 'apps']) {
    const base = join(REPO, group)
    for (const entry of readdirSync(base)) {
      const dir = `${group}/${entry}`
      if (!statSync(join(REPO, dir)).isDirectory()) continue
      const json = JSON.parse(readFileSync(join(REPO, dir, 'package.json'), 'utf8'))
      found.push({ dir, name: String(json.name), json })
    }
  }
  return found
}

function sourceFiles(dir: string): string[] {
  const src = join(REPO, dir, 'src')
  const out: string[] = []
  const walk = (at: string) => {
    for (const entry of readdirSync(at, { withFileTypes: true })) {
      const full = join(at, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (entry.name.endsWith('.ts')) out.push(full)
    }
  }
  walk(src)
  return out
}

/** tsconfig.json is JSONC — read the references without parsing it as strict JSON. */
function referencedProjects(): string[] {
  const text = readFileSync(join(REPO, 'tsconfig.json'), 'utf8')
  return [...text.matchAll(/"path"\s*:\s*"([^"]+)"/g)].map((m) => m[1] as string)
}

test('every package has a package.json and a tsconfig.json', () => {
  for (const pkg of packages()) {
    assert.ok(
      statSync(join(REPO, pkg.dir, 'tsconfig.json')).isFile(),
      `${pkg.dir} has no tsconfig.json`,
    )
  }
})

test('every package is scoped @cutroom/*', () => {
  for (const pkg of packages()) {
    assert.match(pkg.name, /^@cutroom\//, `${pkg.dir} is named ${pkg.name}`)
  }
})

test('a package is entered only through src/index.ts', () => {
  for (const pkg of packages()) {
    assert.deepEqual(
      pkg.json.exports,
      { '.': './src/index.ts' },
      `${pkg.dir} must expose exactly one entry point. A second one is a licence to reach ` +
        `into its internals, and the boundary rules cannot see through it.`,
    )
  }
})

test('a package with source files is referenced from the root tsconfig', () => {
  const referenced = new Set(referencedProjects().map((p) => p.replace(/^\.\//, '')))
  const unreferenced: string[] = []

  for (const pkg of packages()) {
    if (sourceFiles(pkg.dir).length === 0) continue
    if (!referenced.has(pkg.dir) && !referenced.has(`${pkg.dir}/`)) unreferenced.push(pkg.dir)
  }

  assert.deepEqual(
    unreferenced,
    [],
    'These packages have TypeScript files that `tsc -b` never looks at. Add a reference to ' +
      'tsconfig.json:\n' +
      unreferenced.map((d) => `  { "path": "./${d}" }`).join('\n'),
  )
})
