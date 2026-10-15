import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { before, test } from 'node:test'
import { REPO } from './_repo.ts'
import { importedNames, isDeclaration, names, sourceFiles, where } from './engine/source.ts'

// reel-plan, Slice 2 — the rules (docs/features/reel-plan.md, checks 2, 8 and 9): the boundary-rule
// changes Gate 2 lists, each watched firing in `drift --prove` on the import it exists for, and the
// three drift modes passing with this feature's source present.
//
// A rule is asserted here by the line `drift --prove` prints for ONE case — the rule, the importing
// folder and the specifier — not by the rule's name appearing somewhere in the output, which one
// firing case would satisfy for every case of that rule.
//
// Amended by the `pipeline-no-io` fix slice on 2026-10-15 (S-187) — nothing above or below is
// removed or loosened. `reel-plan` owns `pipeline-no-io`, so one more property is pinned at the end
// of this file: the rule names no `dependencyTypes`, and `drift --prove` catches every builtin its
// pattern enumerates under BOTH spellings, bare `sqlite` among them.

type Rule = {
  name: string
  from?: { path?: string; pathNot?: string }
  to?: { path?: string; pathNot?: string; dependencyTypes?: string[] }
}
type Config = {
  forbidden: Rule[]
  options: { exclude?: { path?: string }; doNotFollow?: { path?: string } }
}

const config = createRequire(import.meta.url)(join(REPO, '.dependency-cruiser.cjs')) as Config

function drift(...args: string[]) {
  const result = spawnSync(process.execPath, ['scripts/drift.mjs', ...args], {
    cwd: REPO,
    encoding: 'utf8',
    env: { ...process.env, NO_COLOR: '1' },
  })
  return { status: result.status, out: `${result.stdout}${result.stderr}` }
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** `drift --prove` caught this rule on a file in `from` importing `specifier`. */
function caught(out: string, rule: string, from: string, specifier: string) {
  const line = new RegExp(
    `caught\\s+${escape(rule)}\\s+${escape(from)} -> ${escape(specifier)}(?=\\s|$)`,
    'm',
  )
  assert.match(out, line, `drift --prove did not catch ${rule} on ${from} -> ${specifier}:\n${out}`)
}

/** `drift --prove` resolved this legal import and reported nothing on it. */
function clean(out: string, from: string, specifier: string) {
  const line = new RegExp(`clean\\s+${escape(from)} -> ${escape(specifier)}(?=\\s|$)`, 'm')
  assert.match(out, line, `drift --prove did not show ${from} -> ${specifier} as clean:\n${out}`)
}

let prove: { status: number | null; out: string }

before(() => {
  prove = drift('--prove')
})

// ---------------------------------------------------------------- 2

test('2. PlanVaryOn and Criterion are declared only in @cutroom/reel-contract, and contracts-are-a-leaf permits @cutroom/contracts to import it and nothing else internal, proven by a drift:prove case by package name', () => {
  const declared = names(sourceFiles('packages', 'apps')).filter(
    (n) => (n.name === 'PlanVaryOn' || n.name === 'Criterion') && isDeclaration(n),
  )
  const outside = declared.filter((n) => !n.file.startsWith('packages/reel-contract/src/'))
  assert.deepEqual(outside.map(where), [], 'a caller-facing type is declared outside the contract')

  // Declared only there, and actually reused — not merely absent from contracts.
  const imports = importedNames('packages/contracts/src/cinematic.ts')
  assert.equal(imports.get('PlanVaryOn'), '@cutroom/reel-contract')
  assert.equal(imports.get('Criterion'), '@cutroom/reel-contract')

  assert.equal(prove.status, 0, prove.out)
  clean(prove.out, 'packages/contracts', '@cutroom/reel-contract')
  for (const other of ['domain', 'pipeline', 'providers', 'api', 'worker']) {
    caught(prove.out, 'contracts-are-a-leaf', 'packages/contracts', `@cutroom/${other}`)
  }
})

// ---------------------------------------------------------------- 8

test("8. drift, drift:prove and drift --audit pass with this feature's source; each rule this feature changes or adds fires in drift:prove", () => {
  for (const file of ['cinematic.ts', 'model.ts', 'settings.ts']) {
    assert.ok(
      existsSync(join(REPO, 'packages/contracts/src', file)),
      `no packages/contracts/src/${file}`,
    )
  }

  const rules = new Map(config.forbidden.map((r) => [r.name, r]))

  // Deleted: D-103 retired D-085, whose backstop this was, and no epistemic module exists (D-096).
  assert.equal(rules.has('plan-no-epistemic'), false, 'plan-no-epistemic is still configured')
  // Replaced: it could never fire, since every import of @cutroom/contracts resolves to index.ts.
  assert.equal(rules.has('split-no-cinematic'), false, 'split-no-cinematic is still configured')
  for (const rule of [
    'split-imports-only-itself',
    'pipeline-npm-only-zod',
    'model-client-only-in-providers',
  ]) {
    assert.ok(rules.has(rule), `${rule} is not configured`)
  }
  // No gate creates a cinematic folder; a rule naming one turns DEAD once the pipeline has source.
  const cinematic = config.forbidden.filter((r) =>
    [r.from?.path, r.from?.pathNot, r.to?.path, r.to?.pathNot].some((p) =>
      p?.includes('cinematic'),
    ),
  )
  assert.deepEqual(
    cinematic.map((r) => r.name),
    [],
    'a rule still names a cinematic folder',
  )

  // Without this, no rule about an npm import can ever fire: the path never reaches the graph.
  const exclude = new RegExp(config.options.exclude?.path ?? '(?!)')
  for (const path of [
    'node_modules/.pnpm/zod@4.6.5/node_modules/zod/index.js',
    'node_modules/.pnpm/ai@5.0.0/node_modules/ai/dist/index.mjs',
  ]) {
    assert.equal(exclude.test(path), false, `options.exclude removes ${path} from the graph`)
  }
  // …and this repository's own tsc output stays out of it.
  for (const path of [
    'packages/domain/dist/schema.d.ts',
    'apps/api/dist/server.d.ts',
    'dist/tooling/x.d.ts',
  ]) {
    assert.equal(exclude.test(path), true, `options.exclude lets ${path} into the graph`)
  }
  // …while the tool still does not walk inside a package.
  assert.match(
    'node_modules/ai/dist/index.mjs',
    new RegExp(config.options.doNotFollow?.path ?? '(?!)'),
  )

  const check = drift()
  assert.equal(check.status, 0, check.out)
  const audit = drift('--audit')
  assert.equal(audit.status, 0, audit.out)
  assert.doesNotMatch(audit.out, /DEAD/, audit.out)
  assert.equal(prove.status, 0, prove.out)

  caught(
    prove.out,
    'contracts-are-a-leaf',
    'packages/contracts/src/index.ts',
    '../../domain/src/index.ts',
  )
  caught(
    prove.out,
    'split-imports-only-itself',
    'packages/pipeline/src/split/index.ts',
    '../cinematic/types.ts',
  )
  caught(
    prove.out,
    'split-imports-only-itself',
    'packages/pipeline/src/split/a.ts',
    '../../../contracts/src/index.ts',
  )
  caught(
    prove.out,
    'split-imports-only-itself',
    'packages/pipeline/src/split',
    '@cutroom/contracts',
  )
  caught(prove.out, 'split-imports-only-itself', 'packages/pipeline/src/split', 'zod')
  caught(
    prove.out,
    'split-entered-through-its-index',
    'packages/pipeline/src/plan/deep.ts',
    '../split/internal/cut.ts',
  )
  caught(prove.out, 'pipeline-npm-only-zod', 'packages/pipeline', 'drizzle-orm')
  caught(prove.out, 'model-client-only-in-providers', 'apps/worker', 'ai')
  clean(prove.out, 'packages/pipeline/src/split/index.ts', './units.ts')
  clean(prove.out, 'packages/pipeline/src/plan/index.ts', '../split/index.ts')
})

// ---------------------------------------------------------------- 9

test('9. a pipeline file importing an npm package other than zod, and a file outside packages/providers importing ai, are each caught', () => {
  assert.equal(prove.status, 0, prove.out)

  // Laid out the way pnpm lays them out: a link in the importing package's node_modules to a folder
  // in node_modules/.pnpm, each package's manifest shaped like the real one's `exports`.
  caught(prove.out, 'pipeline-npm-only-zod', 'packages/pipeline', 'drizzle-orm')
  caught(prove.out, 'pipeline-npm-only-zod', 'packages/pipeline', 'better-sqlite3')
  caught(prove.out, 'pipeline-npm-only-zod', 'packages/pipeline', 'ai')

  caught(prove.out, 'model-client-only-in-providers', 'packages/pipeline', 'ai')
  caught(prove.out, 'model-client-only-in-providers', 'apps/worker', 'ai')
  caught(prove.out, 'model-client-only-in-providers', 'apps/api', '@ai-sdk/openai')
  caught(prove.out, 'model-client-only-in-providers', 'packages/domain', 'ai (not installed)')

  // What each rule must stay silent on, every one of them resolved to a real file first.
  clean(prove.out, 'packages/pipeline', 'zod')
  clean(prove.out, 'packages/pipeline', '@cutroom/contracts')
  clean(prove.out, 'packages/providers', 'ai')
  clean(prove.out, 'packages/providers', '@ai-sdk/openai')
})

// ---------------------------------------------------------------- S-187

// `pipeline-no-io` carried `dependencyTypes: ['core']`, and dependency-cruiser ANDs a `to`'s
// attributes, so the rule was SILENT on bare `sqlite`: that is the one enumerated name with no bare
// form — Node exposes it only as `node:sqlite` — so `import 'sqlite'` resolves to nothing and
// reaches the graph typed `unknown` rather than `core`. Measured over all 32 spellings of
// `benchmark-no-io`'s enumeration: 31 fired with the attribute, bare `sqlite` did not (S-186).
// The attribute is gone (S-187), which makes the rule strictly broader, and its `--prove` cases are
// now generated from its own pattern instead of the single `node:fs` that let the gap read as
// coverage.

test('S-187. pipeline-no-io names no dependencyTypes, and drift --prove catches EVERY builtin its pattern enumerates under BOTH spellings — bare sqlite, which no core-scoped rule can see, among them', () => {
  const io = config.forbidden.find((r) => r.name === 'pipeline-no-io')
  assert.ok(io !== undefined, '.dependency-cruiser.cjs has no rule pipeline-no-io')
  assert.equal(
    io.to?.dependencyTypes,
    undefined,
    'pipeline-no-io names dependencyTypes again, and a core-scoped rule is silent on bare sqlite',
  )

  // The enumeration comes out of the loaded rule, never a literal: a builtin dropped from the
  // pattern drops its two cases rather than leaving a case list that reads as coverage.
  const pattern = io.to?.path
  assert.ok(typeof pattern === 'string', 'pipeline-no-io names no path')
  const inner = /^\^\(node:\)\?\((.+)\)\$$/.exec(pattern)
  assert.ok(inner !== null, `pipeline-no-io's pattern is not the enumeration: ${pattern}`)
  const builtins = String(inner[1]).split('|')
  for (const name of ['fs', 'child_process', 'sqlite']) {
    assert.ok(builtins.includes(name), builtins.join('|'))
  }

  assert.equal(prove.status, 0, prove.out)
  for (const builtin of builtins) {
    for (const specifier of [builtin, `node:${builtin}`]) {
      const line = new RegExp(
        `caught\\s+pipeline-no-io\\s+packages/pipeline/src/\\S+ -> ${escape(specifier)}(?=\\s|$)`,
        'm',
      )
      assert.match(prove.out, line, `no pipeline-no-io case for ${specifier}:\n${prove.out}`)
    }
  }
  assert.doesNotMatch(prove.out, /SILENT/, prove.out)
})
