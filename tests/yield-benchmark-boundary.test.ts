import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { before, test } from 'node:test'
import { REPO } from './_repo.ts'

// yield-benchmark, Slice 1 — check 11 (docs/features/yield-benchmark.md, Gate 3):
//
// `benchmark-no-engine, benchmark-no-io and benchmark-npm-only-zod hold on the real dependency
// graph, and drift --prove builds a deliberate violation of each — an import of domain, of
// providers, of an app, of EVERY builtin benchmark-no-io enumerates INCLUDING node:crypto under
// both spellings, and of an npm package other than zod — each seen red, every legal import still
// resolving, and the proof's count now 25`.
//
// Three rules and not one: dependency-cruiser ANDs a `to`'s attributes, so "any builtin" and
// "any npm package but zod" cannot share one rule, and a bare-name regex for builtins also
// matches an unresolved `zod` and would report a legal import (Gate 2).

type Rule = {
  name: string
  from?: { path?: string }
  to?: { path?: string; pathNot?: string; dependencyTypes?: string[] }
}
const config = createRequire(import.meta.url)(join(REPO, '.dependency-cruiser.cjs')) as {
  forbidden: Rule[]
}
const rule = (name: string): Rule => {
  const found = config.forbidden.find((r) => r.name === name)
  assert.ok(found !== undefined, `.dependency-cruiser.cjs has no rule ${name}`)
  return found
}

function drift(...args: string[]) {
  const result = spawnSync(process.execPath, ['scripts/drift.mjs', ...args], {
    cwd: REPO,
    encoding: 'utf8',
    env: { ...process.env, NO_COLOR: '1' },
  })
  return { status: result.status, out: `${result.stdout}${result.stderr}` }
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

function caught(out: string, name: string, from: string, specifier: string) {
  const line = new RegExp(
    `caught\\s+${escape(name)}\\s+${escape(from)} -> ${escape(specifier)}(?=\\s|$)`,
    'm',
  )
  assert.match(out, line, `drift --prove did not catch ${name} on ${from} -> ${specifier}:\n${out}`)
}

/** The builtins `benchmark-no-io` enumerates, read from the rule itself (S-124's rule). */
function enumeratedBuiltins(): string[] {
  const pattern = rule('benchmark-no-io').to?.path
  assert.ok(typeof pattern === 'string', 'benchmark-no-io names no path')
  const inner = /^\^\(node:\)\?\((.+)\)\$$/.exec(pattern)
  assert.ok(inner !== null, `benchmark-no-io's pattern is not the enumeration: ${pattern}`)
  return String(inner[1]).split('|')
}

let prove: { status: number | null; out: string }

before(() => {
  prove = drift('--prove')
})

// ---------------------------------------------------------------- 11

test('11. benchmark-no-engine, benchmark-no-io and benchmark-npm-only-zod hold on the real dependency graph', () => {
  const check = drift()
  assert.equal(check.status, 0, check.out)
  assert.match(check.out, /0 boundary violations/, check.out)

  // The three rules exist, and each forbids what Gate 2 says it forbids.
  assert.equal(rule('benchmark-no-engine').to?.path, '^(packages/(domain|providers)|apps)/')
  assert.equal(
    rule('benchmark-no-io').to?.path,
    '^(node:)?(fs|fs/promises|child_process|net|http|https|http2|dgram|tls|dns|cluster|worker_threads|sqlite|repl|readline|crypto)$',
  )
  assert.equal(rule('benchmark-npm-only-zod').to?.path, 'node_modules/')
  assert.equal(
    rule('benchmark-npm-only-zod').to?.pathNot,
    'node_modules/zod/|node_modules/\\.pnpm/zod@',
  )
  for (const name of ['benchmark-no-engine', 'benchmark-no-io', 'benchmark-npm-only-zod']) {
    assert.match(String(rule(name).from?.path), /^\^packages\/benchmark/)
  }

  // `pipeline-no-io`'s enumeration, plus crypto, and nothing else (Gate 2's fenced pattern).
  const builtins = enumeratedBuiltins()
  assert.deepEqual(builtins, [
    'fs',
    'fs/promises',
    'child_process',
    'net',
    'http',
    'https',
    'http2',
    'dgram',
    'tls',
    'dns',
    'cluster',
    'worker_threads',
    'sqlite',
    'repl',
    'readline',
    'crypto',
  ])
  const pipeline = rule('pipeline-no-io').to?.path
  assert.equal(
    rule('benchmark-no-io').to?.path,
    String(pipeline).replace(/\)\$$/, '|crypto)$'),
    "benchmark-no-io is pipeline-no-io's enumeration plus crypto",
  )
})

test('11. drift --prove builds a deliberate violation of each — an import of domain, of providers, of an app, of EVERY builtin benchmark-no-io enumerates INCLUDING node:crypto under both spellings, and of an npm package other than zod — each seen red', () => {
  assert.equal(prove.status, 0, prove.out)

  // The engine: one regex, three targets, by relative path and by package name.
  caught(
    prove.out,
    'benchmark-no-engine',
    'packages/benchmark/src/reaches-domain.ts',
    '../../domain/src/index.ts',
  )
  caught(
    prove.out,
    'benchmark-no-engine',
    'packages/benchmark/src/reaches-providers.ts',
    '../../providers/src/index.ts',
  )
  caught(
    prove.out,
    'benchmark-no-engine',
    'packages/benchmark/src/reaches-worker.ts',
    '../../../apps/worker/src/index.ts',
  )
  caught(prove.out, 'benchmark-no-engine', 'packages/benchmark', '@cutroom/domain')
  caught(prove.out, 'benchmark-no-engine', 'packages/benchmark', '@cutroom/providers')
  caught(prove.out, 'benchmark-no-engine', 'packages/benchmark', '@cutroom/api')

  // Every enumerated builtin, under BOTH spellings — crypto among them, because a pure scorer
  // that can hash can grow a key of its own and stop being a function of its rows.
  const builtins = enumeratedBuiltins()
  assert.ok(builtins.includes('crypto'), builtins.join('|'))
  for (const builtin of builtins) {
    for (const specifier of [builtin, `node:${builtin}`]) {
      const line = new RegExp(
        `caught\\s+benchmark-no-io\\s+packages/benchmark/src/\\S+ -> ${escape(specifier)}(?=\\s|$)`,
        'm',
      )
      assert.match(prove.out, line, `no benchmark-no-io case for ${specifier}:\n${prove.out}`)
    }
  }

  // An npm package other than zod, by the name real code writes it as.
  caught(prove.out, 'benchmark-npm-only-zod', 'packages/benchmark', 'drizzle-orm')
  caught(prove.out, 'benchmark-npm-only-zod', 'packages/benchmark', 'better-sqlite3')
})

test('11. every legal import still resolving, and the proof count now 25', () => {
  assert.equal(prove.status, 0, prove.out)
  assert.doesNotMatch(prove.out, /SILENT/, prove.out)
  assert.doesNotMatch(prove.out, /EAGER/, prove.out)
  assert.doesNotMatch(prove.out, /UNRESOLVED/, prove.out)

  // yield-benchmark's Slice 1 added the twenty-third, twenty-fourth and twenty-fifth rules:
  // benchmark-no-engine, benchmark-no-io and benchmark-npm-only-zod (S-184, S-185). The count
  // stays exact, so a rule losing every one of its prove cases still fails here (S-078).
  assert.match(prove.out, /25 rules proven to fire/, prove.out)

  // The legal shape the package will really have: zod, the contract, and its own folder.
  assert.match(prove.out, /clean\s+packages\/benchmark -> zod/, prove.out)
  assert.match(prove.out, /clean\s+packages\/benchmark -> @cutroom\/reel-contract/, prove.out)

  const audit = drift('--audit')
  assert.equal(audit.status, 0, audit.out)
  assert.doesNotMatch(audit.out, /DEAD/, audit.out)
  for (const name of ['benchmark-no-engine', 'benchmark-no-io', 'benchmark-npm-only-zod']) {
    assert.match(audit.out, new RegExp(`live\\s+${name}`), audit.out)
  }
})
