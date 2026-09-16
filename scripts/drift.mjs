#!/usr/bin/env node
/**
 * One job: assert the module boundaries in .dependency-cruiser.cjs, prove each rule can
 * actually catch what it forbids, and report any rule that has quietly stopped applying to
 * anything.
 *
 *   node scripts/drift.mjs            check this repository
 *   node scripts/drift.mjs --prove    build a deliberate violation of every rule in a
 *                                     temporary folder and fail if any rule stays silent
 *   node scripts/drift.mjs --audit    report which folders each rule names, and fail when a
 *                                     rule names a folder that is missing from a package
 *                                     that HAS source — the shape of a rename
 *
 * All three exist because of the same failure, found twice in the steering repository:
 *
 *   1. Two boundary rules the architecture rested on were described in prose for weeks and
 *      were not in the config at all.
 *   2. Its `.dependency-cruiser.cjs` carries seven rules — and dependency-cruiser is not
 *      installed there, so `drift.mjs` skips the entire block behind an `existsSync` check.
 *      None of those seven has ever run, once.
 *
 * Configured-but-dead is worse than absent, because it reads as covered. So: the tool is a
 * real dependency here, `--prove` watches every rule fire, and `--audit` watches for the
 * rule that still reads correctly while matching nothing.
 */
import { existsSync, mkdirSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { REPO, bold, dim, fail, green, pass, red, run, yellow } from './_lib.mjs'

// .dependency-cruiser.cjs is CommonJS — the format the tool loads — and --audit reads the
// rules themselves rather than a copy of them kept in this file.
const loadRules = createRequire(import.meta.url)

const DEPCRUISE = join(REPO, 'node_modules', 'dependency-cruiser', 'bin', 'dependency-cruise.mjs')
const CONFIG = join(REPO, '.dependency-cruiser.cjs')
const SCAN = ['packages', 'apps']

function cruise(cwd, targets) {
  const args = [DEPCRUISE, '--config', CONFIG, '--output-type', 'json', ...targets]
  const r = run(process.execPath, args, { cwd })
  const raw = r.stdout.trim()
  if (!raw.startsWith('{')) {
    return { error: r.stderr || raw || `dependency-cruiser exited ${r.code} with no output` }
  }
  const report = JSON.parse(raw)
  return {
    modules: report.summary?.totalCruised ?? 0,
    violations: (report.summary?.violations ?? []).map((v) => ({
      rule: v.rule?.name ?? '(unnamed)',
      from: v.from,
      to: v.to,
    })),
    edges: (report.modules ?? []).flatMap((m) =>
      (m.dependencies ?? []).map((d) => ({
        from: m.source,
        specifier: d.module,
        resolved: d.resolved,
        unresolved: d.couldNotResolve === true,
      })),
    ),
  }
}

/**
 * The edge a file's import of `specifier` became in the graph, or undefined if it is not there.
 * The tool records a core module without its `node:` prefix, so `node:fs` is the edge `fs`.
 */
function edgeOf(result, file, specifier) {
  const bare = specifier.replace(/^node:/, '')
  return result.edges.find(
    (e) => e.from === file && (e.specifier === specifier || e.specifier === bare),
  )
}

/** Did `rule` fire on exactly this import — this file, and the module this specifier became? */
function firedOn(result, rule, file, specifier) {
  const edge = edgeOf(result, file, specifier)
  if (edge === undefined) return false
  return result.violations.some((v) => v.rule === rule && v.from === file && v.to === edge.resolved)
}

// ---------------------------------------------------------------- check

function check() {
  const result = cruise(REPO, SCAN)
  if (result.error) {
    fail(`dependency-cruiser could not run:\n${result.error}`)
    return
  }
  if (result.modules === 0) {
    const hint = dim('The rules are real. Run `pnpm drift:prove` to watch each one fire.')
    console.log(`${yellow('none')}  no source files yet in ${SCAN.join(', ')}.\n      ${hint}`)
    return
  }
  if (result.violations.length === 0) {
    pass(`${result.modules} modules, 0 boundary violations`)
    return
  }
  console.error(`\n${red(bold(`${result.violations.length} boundary violations`))}\n`)
  for (const v of result.violations) {
    console.error(`  ${red(v.rule)}  ${v.from} ${dim('->')} ${v.to}`)
  }
  fail('a forbidden edge exists. Do not relax the rule; remove the edge.')
}

// ---------------------------------------------------------------- prove

/**
 * Each entry: [rule, file, specifier] — a file written specifically to trip the rule it names, by
 * importing that one specifier. A case counts as caught only when its rule fires on that file's
 * edge to that module, so two cases of one rule are two things proven, not one seen twice.
 */
const CASES = [
  ['pipeline-no-domain', 'packages/pipeline/src/index.ts', '../../domain/src/index.ts'],
  ['pipeline-no-providers', 'packages/pipeline/src/a.ts', '../../providers/src/index.ts'],
  ['pipeline-no-apps', 'packages/pipeline/src/b.ts', '../../../apps/api/src/index.ts'],
  ['pipeline-no-io', 'packages/pipeline/src/c.ts', 'node:fs'],
  // A built-in module has no package for the by-name cases to place, so both of child_process's
  // names are imported here, from each of the three places that must not start a process (S-075).
  ['processes-only-in-providers', 'apps/worker/src/spawns.ts', 'child_process'],
  ['processes-only-in-providers', 'apps/worker/src/spawns-node.ts', 'node:child_process'],
  ['processes-only-in-providers', 'apps/api/src/spawns.ts', 'child_process'],
  ['processes-only-in-providers', 'apps/api/src/spawns-node.ts', 'node:child_process'],
  ['processes-only-in-providers', 'packages/domain/src/spawns.ts', 'child_process'],
  ['processes-only-in-providers', 'packages/domain/src/spawns-node.ts', 'node:child_process'],
  ['api-no-providers', 'apps/api/src/index.ts', '../../../packages/providers/src/index.ts'],
  ['worker-no-providers', 'apps/worker/src/spends.ts', '../../../packages/providers/src/index.ts'],
  ['providers-no-domain', 'packages/providers/src/index.ts', '../../domain/src/index.ts'],
  ['providers-no-pipeline', 'packages/providers/src/a.ts', '../../pipeline/src/index.ts'],
  [
    'domain-no-pipeline-or-providers',
    'packages/domain/src/index.ts',
    '../../pipeline/src/index.ts',
  ],
  ['contracts-are-a-leaf', 'packages/contracts/src/index.ts', '../../domain/src/index.ts'],
  [
    'reel-contract-is-a-leaf',
    'packages/reel-contract/src/index.ts',
    '../../contracts/src/index.ts',
  ],
  [
    'no-reaching-into-internals',
    'apps/worker/src/index.ts',
    '../../../packages/domain/src/deep/thing.ts',
  ],
  ['no-circular', 'apps/worker/src/ping.ts', './pong.ts'],

  // The rules between two folders of ONE package. Every import below is relative, which is
  // exactly why matching import text could never catch them.
  //
  // The splitter imports nothing outside its folder (reel-plan, Gate 2). The cinematic case is
  // the one the rule it replaced was written for; the contracts case is the import that rule
  // could never see, because every import of contracts resolves to index.ts.
  ['split-imports-only-itself', 'packages/pipeline/src/split/index.ts', '../cinematic/types.ts'],
  [
    'split-imports-only-itself',
    'packages/pipeline/src/split/a.ts',
    '../../../contracts/src/index.ts',
  ],
  [
    'split-imported-only-by-plan',
    'packages/pipeline/src/gates/reaches-split.ts',
    '../split/index.ts',
  ],
  [
    'split-entered-through-its-index',
    'packages/pipeline/src/plan/deep.ts',
    '../split/internal/cut.ts',
  ],
]

const EXTRA_FILES = [
  ['packages/domain/src/deep/thing.ts', 'export const thing = 1'],
  ['apps/worker/src/pong.ts', "import './ping.ts'"],
  ['packages/pipeline/src/cinematic/types.ts', 'export type Shot = { camera: string }'],
  ['packages/pipeline/src/split/internal/cut.ts', 'export const cut = 1'],
]

/**
 * The same cross-package rules, broken the way real code will break them: by PACKAGE NAME.
 *
 * Every case above imports by relative path. Code in one package will import another as
 * `@cutroom/domain`, and an experiment run from the steering repository on 2026-09-14 showed
 * that dependency-cruiser left every such import UNRESOLVED under this config — packages
 * declare only `exports`, and the resolver was not reading it — so each of these rules stayed
 * silent on exactly the import real code writes, while the relative-path cases above passed.
 * Proven and still dead. These cases are the reason that cannot happen again unnoticed.
 *
 * npm packages are imported by name too, and only by name: a rule about `ai` or `drizzle-orm`
 * is a rule about what the resolver makes of that name inside pnpm's layout.
 *
 * Each entry: [rule, importing folder, specifier, note?]. The folder is a package, whose src/
 * gets the file, or a folder inside one. Package names are `@cutroom/<folder>`; any other
 * specifier is an npm package from NPM below, unless the note says it is not installed.
 */
const BY_NAME_CASES = [
  ['pipeline-no-domain', 'packages/pipeline', '@cutroom/domain'],
  ['pipeline-no-providers', 'packages/pipeline', '@cutroom/providers'],
  ['pipeline-no-apps', 'packages/pipeline', '@cutroom/api'],
  ['api-no-providers', 'apps/api', '@cutroom/providers'],
  ['worker-no-providers', 'apps/worker', '@cutroom/providers'],
  ['providers-no-domain', 'packages/providers', '@cutroom/domain'],
  ['providers-no-pipeline', 'packages/providers', '@cutroom/pipeline'],
  ['domain-no-pipeline-or-providers', 'packages/domain', '@cutroom/pipeline'],

  // D-099: contracts may import the contract and nothing else internal — every other one of them.
  ['contracts-are-a-leaf', 'packages/contracts', '@cutroom/domain'],
  ['contracts-are-a-leaf', 'packages/contracts', '@cutroom/pipeline'],
  ['contracts-are-a-leaf', 'packages/contracts', '@cutroom/providers'],
  ['contracts-are-a-leaf', 'packages/contracts', '@cutroom/api'],
  ['contracts-are-a-leaf', 'packages/contracts', '@cutroom/worker'],
  ['reel-contract-is-a-leaf', 'packages/reel-contract', '@cutroom/contracts'],

  // The splitter by name: the import of contracts that a rule matching `cinematic` never saw,
  // and zod, the one npm package the rest of the pipeline may use.
  ['split-imports-only-itself', 'packages/pipeline/src/split', '@cutroom/contracts'],
  ['split-imports-only-itself', 'packages/pipeline/src/split', 'zod'],

  // npm packages (reel-plan, Gate 2). The pipeline imports none but zod; nothing outside
  // packages/providers imports a model client, installed or not.
  ['pipeline-npm-only-zod', 'packages/pipeline', 'drizzle-orm'],
  ['pipeline-npm-only-zod', 'packages/pipeline', 'better-sqlite3'],
  ['pipeline-npm-only-zod', 'packages/pipeline', 'ai'],
  ['model-client-only-in-providers', 'packages/pipeline', 'ai'],
  ['model-client-only-in-providers', 'apps/worker', 'ai'],
  ['model-client-only-in-providers', 'apps/api', '@ai-sdk/openai'],
  ['model-client-only-in-providers', 'packages/domain', 'ai', 'not installed'],
]

/**
 * The legal shape again, by name. Nothing here may be reported — and every import must RESOLVE,
 * because a rule is silent on an import the resolver dropped, and a legal case that never reached
 * the graph proves nothing about the rules.
 */
const BY_NAME_LEGAL = [
  ['apps/worker', '@cutroom/pipeline'],
  ['apps/worker', '@cutroom/domain'],
  ['packages/pipeline', '@cutroom/contracts'],
  ['packages/contracts', '@cutroom/reel-contract'],
  ['packages/pipeline', 'zod'],
  ['packages/reel-contract', 'zod'],
  ['packages/domain', 'drizzle-orm'],
  ['packages/providers', 'ai'],
  ['packages/providers', '@ai-sdk/openai'],
]

const PACKAGE_FOLDERS = [
  'packages/contracts',
  'packages/reel-contract',
  'packages/domain',
  'packages/pipeline',
  'packages/providers',
  'apps/api',
  'apps/worker',
]

/**
 * The npm packages the cases import, each with a manifest shaped like the real one. The shape is
 * the point: zod and ai declare only `types`, `import` and `require` conditions, drizzle-orm also
 * a `default`, and better-sqlite3 no `exports` at all — and a resolver reads each differently.
 * zod, drizzle-orm and better-sqlite3 are copied from the versions installed here; ai and
 * @ai-sdk/openai, which are not installed, from their published manifests.
 */
const conditional = (dir = '.') => ({
  '.': { types: `${dir}/index.d.ts`, import: `${dir}/index.mjs`, require: `${dir}/index.js` },
})
const NPM = {
  zod: {
    version: '4.6.5',
    main: './index.cjs',
    exports: { '.': { types: './index.d.cts', import: './index.js', require: './index.cjs' } },
  },
  'drizzle-orm': {
    version: '0.45.2',
    main: './index.cjs',
    exports: {
      '.': {
        import: { types: './index.d.ts', default: './index.js' },
        require: { types: './index.d.cts', default: './index.cjs' },
        types: './index.d.ts',
        default: './index.js',
      },
    },
  },
  'better-sqlite3': { version: '13.0.3', main: 'lib/index.js' },
  ai: { version: '5.0.0', main: './dist/index.js', exports: conditional('./dist') },
  '@ai-sdk/openai': { version: '2.0.0', main: './dist/index.js', exports: conditional('./dist') },
}

/** Every file a manifest points at, so whichever one the resolver picks exists. */
function manifestTargets(value) {
  if (typeof value === 'string') return [value]
  if (value === null || typeof value !== 'object') return []
  return Object.values(value).flatMap(manifestTargets)
}

/** Place an npm package where pnpm places it: a folder in node_modules/.pnpm, named for its version. */
function storeNpm(dir, name) {
  const pkg = NPM[name]
  const store = join(dir, 'node_modules', '.pnpm', `${name.replace('/', '+')}@${pkg.version}`)
  const folder = join(store, 'node_modules', ...name.split('/'))
  if (!existsSync(folder)) {
    mkdirSync(folder, { recursive: true })
    const manifest = { name, version: pkg.version, main: pkg.main, exports: pkg.exports }
    writeFileSync(join(folder, 'package.json'), `${JSON.stringify(manifest)}\n`, 'utf8')
    for (const target of new Set(manifestTargets([pkg.main, pkg.exports]))) {
      const file = join(folder, target)
      mkdirSync(join(file, '..'), { recursive: true })
      writeFileSync(file, 'export {}\n', 'utf8')
    }
  }
  return folder
}

/** `packages/pipeline/src/split` → `packages/pipeline`. */
const packageOf = (from) => from.split('/').slice(0, 2).join('/')

/**
 * A miniature workspace: every package with a package.json that declares only `exports`, the
 * way the real ones do, and a link placed where pnpm places it — inside the IMPORTING package's
 * node_modules, to a workspace package or to a folder in node_modules/.pnpm. Then one file per
 * import, in the package's src/ or in the folder the case names. An import marked `not installed`
 * gets no link at all.
 *
 * Returns each import with the file it was written to.
 */
function buildByName(dir, imports) {
  rmSync(dir, { recursive: true, force: true })
  for (const folder of PACKAGE_FOLDERS) {
    const name = `@cutroom/${folder.split('/')[1]}`
    mkdirSync(join(dir, folder, 'src'), { recursive: true })
    const manifest = { name, type: 'module', exports: { '.': './src/index.ts' } }
    writeFileSync(join(dir, folder, 'package.json'), `${JSON.stringify(manifest)}\n`, 'utf8')
    writeFileSync(join(dir, folder, 'src', 'index.ts'), 'export const x = 1\n', 'utf8')
  }
  const written = imports.map(([from, specifier, note], i) => {
    const pkg = packageOf(from)
    if (note !== 'not installed') {
      const workspace = PACKAGE_FOLDERS.find((f) => `@cutroom/${f.split('/')[1]}` === specifier)
      const target = workspace ? join(dir, workspace) : storeNpm(dir, specifier)
      const link = join(dir, pkg, 'node_modules', ...specifier.split('/'))
      if (!existsSync(link)) {
        mkdirSync(join(link, '..'), { recursive: true })
        symlinkSync(target, link, 'junction')
      }
    }
    const folder = from === pkg ? `${from}/src` : from
    const file = `${folder}/by-name-${i}.ts`
    mkdirSync(join(dir, folder), { recursive: true })
    writeFileSync(join(dir, file), `import '${specifier}'\n`, 'utf8')
    return { from, specifier, note, file, workspace: specifier.startsWith('@cutroom/') }
  })
  const tsconfig = '{ "compilerOptions": { "allowImportingTsExtensions": true, "noEmit": true } }'
  writeFileSync(join(dir, 'tsconfig.json'), `${tsconfig}\n`, 'utf8')
  return written
}

/**
 * A legal shape. Nothing here may be reported, or the rules are too eager to be trusted — and
 * every import in it must resolve, or it is not in the graph for a rule to be silent on.
 */
const LEGAL = [
  ['packages/reel-contract/src/index.ts', 'export type Axis = string'],
  [
    'packages/contracts/src/index.ts',
    "import type { Axis } from '../../reel-contract/src/index.ts'\n" +
      'export type Port = { run(axis: Axis): Promise<void> }',
  ],
  [
    'packages/pipeline/src/index.ts',
    "import type { Port } from '../../contracts/src/index.ts'\nexport type Stage = Port",
  ],
  [
    'apps/worker/src/index.ts',
    "import type { Stage } from '../../../packages/pipeline/src/index.ts'\n" +
      "import '../../../packages/domain/src/index.ts'\n" +
      'export type W = Stage',
  ],
  ['packages/domain/src/index.ts', 'export const tables = {}'],
  ['apps/worker/src/helper.ts', "import './index.ts'"],

  // The legal version of the folder rules: the planner calls the splitter through its index,
  // the splitter uses only its own folder, and another stage uses contracts, not the splitter.
  [
    'packages/pipeline/src/plan/index.ts',
    "import type { Port } from '../../../contracts/src/index.ts'\n" +
      "import '../split/index.ts'\n" +
      'export type Plan = Port',
  ],
  [
    'packages/pipeline/src/split/index.ts',
    "import { even } from './units.ts'\nexport const split = (n: number) => even(n)",
  ],
  ['packages/pipeline/src/split/units.ts', 'export const even = (n: number) => [n]'],
  [
    'packages/pipeline/src/gates/index.ts',
    "import type { Port } from '../../../contracts/src/index.ts'\nexport type Gate = Port",
  ],
]

function build(dir, files) {
  rmSync(dir, { recursive: true, force: true })
  for (const [path, body] of files) {
    const full = join(dir, path)
    mkdirSync(join(full, '..'), { recursive: true })
    writeFileSync(full, `${body}\n`, 'utf8')
  }
  // dependency-cruiser needs nothing else here, but a tsconfig keeps its TypeScript reader quiet.
  const tsconfig = '{ "compilerOptions": { "allowImportingTsExtensions": true, "noEmit": true } }'
  writeFileSync(join(dir, 'tsconfig.json'), `${tsconfig}\n`, 'utf8')
}

/**
 * Print one legal import and return how many problems it has: a rule firing on it, or it never
 * resolving. A workspace import must reach that package's index; an npm import, node_modules.
 */
function reportLegal(result, file, specifier, label, expected) {
  const edge = edgeOf(result, file, specifier)
  if (edge === undefined || edge.unresolved || !expected(edge.resolved)) {
    const got = edge === undefined ? 'not in the graph' : edge.resolved
    console.log(`  ${red('UNRESOLVED')}  ${label} ${dim(got)}`)
    return 1
  }
  const eager = result.violations.filter((v) => v.from === file && v.to === edge.resolved)
  for (const v of eager) console.log(`  ${red('EAGER')}   ${v.rule}  ${label}`)
  if (eager.length === 0) console.log(`  ${green('clean')}   ${label}  ${dim(edge.resolved)}`)
  return eager.length
}

function prove() {
  // One folder per process: the test runner runs test files in parallel, and more than one of
  // them runs --prove.
  const root = join(REPO, '.tmp', `drift-probe-${process.pid}`)
  let silent = 0
  let overeager = 0

  // 1. Every rule must fire against a file built to break it.
  const violating = join(root, 'violating')
  const bodies = CASES.map(([, path, specifier]) => [path, `import '${specifier}'`])
  build(violating, [...bodies, ...EXTRA_FILES])
  const dirty = cruise(violating, SCAN)
  if (dirty.error) {
    fail(`the probe could not run:\n${dirty.error}`)
    return
  }

  console.log(`\n${bold('Each rule, against a file written to break it')}\n`)
  for (const [rule, file, specifier] of CASES) {
    const label = `${rule}  ${file} -> ${specifier}`
    if (firedOn(dirty, rule, file, specifier)) {
      console.log(`  ${green('caught')}  ${label}`)
    } else {
      console.log(`  ${red('SILENT')}  ${label}`)
      silent += 1
    }
  }

  // 1b. The same, imported by NAME — a workspace package or an npm one — the form real code uses.
  const byName = join(root, 'by-name')
  const cases = buildByName(
    byName,
    BY_NAME_CASES.map(([, from, specifier, note]) => [from, specifier, note]),
  )
  const dirtyByName = cruise(byName, SCAN)
  console.log(`\n${bold('The rules again, imported by package name')}\n`)
  if (dirtyByName.error) {
    console.log(`  ${red('ERROR')}   ${dirtyByName.error}`)
    silent += BY_NAME_CASES.length
  } else {
    BY_NAME_CASES.forEach(([rule], i) => {
      const { from, specifier, note, file } = cases[i]
      const label = `${rule}  ${from} -> ${specifier}${note ? ` (${note})` : ''}`
      if (firedOn(dirtyByName, rule, file, specifier)) {
        console.log(`  ${green('caught')}  ${label}`)
      } else {
        console.log(`  ${red('SILENT')}  ${label}`)
        silent += 1
      }
    })
  }

  // 2. A legal shape must come back clean, or the rules are wrong rather than the code.
  const legal = join(root, 'legal')
  build(legal, LEGAL)
  const clean = cruise(legal, SCAN)
  console.log(
    `\n${bold('A legal shape: worker -> pipeline -> contracts -> the contract, worker -> domain')}\n`,
  )
  if (clean.error) {
    console.log(`  ${red('ERROR')}   ${clean.error}`)
    overeager += 1
  } else {
    for (const edge of clean.edges) {
      const label = `${edge.from} -> ${edge.specifier}`
      overeager += reportLegal(clean, edge.from, edge.specifier, label, (to) =>
        /^(apps|packages)\//.test(to),
      )
    }
    for (const v of clean.violations) {
      if (clean.edges.some((e) => e.from === v.from && e.resolved === v.to)) continue
      console.log(`  ${red('EAGER')}   ${v.rule}  ${v.from} -> ${v.to}`)
      overeager += 1
    }
  }

  // 2b. The legal shape by name. A resolver change that made rules over-eager on workspace or npm
  // imports — or that dropped them from the graph — shows up here, not in the shape above.
  const legalByName = join(root, 'legal-by-name')
  const legalCases = buildByName(legalByName, BY_NAME_LEGAL)
  const cleanByName = cruise(legalByName, SCAN)
  console.log(`\n${bold('The legal shape, by package name')}\n`)
  if (cleanByName.error) {
    console.log(`  ${red('ERROR')}   ${cleanByName.error}`)
    overeager += 1
  } else {
    for (const { from, specifier, file, workspace } of legalCases) {
      const target = PACKAGE_FOLDERS.find((f) => `@cutroom/${f.split('/')[1]}` === specifier)
      const expected = workspace
        ? (to) => to === `${target}/src/index.ts`
        : (to) => to.startsWith('node_modules/.pnpm/')
      overeager += reportLegal(cleanByName, file, specifier, `${from} -> ${specifier}`, expected)
    }
  }

  rmSync(root, { recursive: true, force: true })
  console.log('')

  const rules = new Set([...CASES, ...BY_NAME_CASES].map(([rule]) => rule)).size
  const caseCount = CASES.length + BY_NAME_CASES.length
  if (silent > 0) {
    fail(`${silent} case(s) stayed silent on a file written specifically to break a rule.`)
  } else if (overeager > 0) {
    fail(
      `${overeager} legal import(s) were reported, or never reached the graph. ` +
        'The rules or the resolver are wrong, not the code.',
    )
  } else {
    pass(
      `${rules} rules proven to fire across ${caseCount} cases, ${BY_NAME_CASES.length} of them by ` +
        'package name, and silent on a legal shape both ways, every legal import resolved',
    )
  }
}

// ---------------------------------------------------------------- audit

/**
 * Expand a rule's path pattern into the concrete folders it names.
 *
 * Simple alternations are expanded — `src/(plan|cinematic)/` gives two folders — and each
 * variant is then cut at the first remaining regex metacharacter. Patterns too broad to
 * name anything (`^(apps|packages)/`, a list of Node core modules) name no folder and are
 * skipped: there is nothing about them that can go stale.
 */
function namedFolders(pattern) {
  if (typeof pattern !== 'string' || !pattern) return []

  let variants = [pattern.replace(/^\^/, '')]
  for (let guard = 0; guard < 6; guard += 1) {
    let expanded = false
    const next = []
    for (const variant of variants) {
      const group = /\(([A-Za-z0-9_|./:-]+)\)/.exec(variant)
      if (group && group[1].includes('|')) {
        expanded = true
        for (const option of group[1].split('|')) {
          next.push(
            variant.slice(0, group.index) + option + variant.slice(group.index + group[0].length),
          )
        }
      } else {
        next.push(variant)
      }
    }
    variants = next
    if (!expanded) break
  }

  const folders = new Set()
  for (const variant of variants) {
    const meta = /[([{?*+|\\$)]/.exec(variant)
    let path = variant
    if (meta) {
      // Keep only what is literal, and drop a half-named segment: `src/(?!index.ts$)` leaves
      // `src/`, not `src/(`. A pattern with no metacharacter is already a complete path and
      // must be kept whole — cutting `packages/pipeline` back to `packages` names nothing.
      path = variant.slice(0, meta.index)
      if (!path.endsWith('/')) {
        const lastSlash = path.lastIndexOf('/')
        path = lastSlash > 0 ? path.slice(0, lastSlash + 1) : ''
      }
    }
    path = path.replace(/\/+$/, '')
    // Two segments minimum: `packages` or `apps` alone names nothing in particular.
    if (path.split('/').length >= 2) folders.add(path)
  }
  return [...folders]
}

function hasSourceFiles(dir) {
  const full = join(REPO, dir)
  if (!existsSync(full)) return false
  const stack = [full]
  while (stack.length > 0) {
    const at = stack.pop()
    for (const entry of readdirSync(at, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === 'dist') continue
      const child = join(at, entry.name)
      if (entry.isDirectory()) stack.push(child)
      else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) return true
    }
  }
  return false
}

function audit() {
  const { forbidden } = loadRules(CONFIG)

  console.log(`\n${bold('Does every rule still apply to something?')}\n`)

  let dead = 0
  let inert = 0
  let live = 0

  for (const rule of forbidden) {
    const folders = [...new Set([...namedFolders(rule.from?.path), ...namedFolders(rule.to?.path)])]
    if (folders.length === 0) {
      // Nothing path-shaped to go stale: a circularity rule, or a list of core modules.
      console.log(`  ${dim('n/a')}     ${rule.name}`)
      continue
    }

    const missing = folders.filter((folder) => !existsSync(join(REPO, folder)))
    if (missing.length === 0) {
      live += 1
      console.log(`  ${green('live')}    ${rule.name}  ${dim(folders.join(' '))}`)
      continue
    }

    // A folder that is missing while its PACKAGE already has source is the shape of a
    // rename: the rule still reads correctly and now guards nothing.
    const renamed = missing.filter((folder) => {
      const pkg = folder.split('/').slice(0, 2).join('/')
      return hasSourceFiles(pkg)
    })

    if (renamed.length > 0) {
      dead += 1
      console.log(`  ${red('DEAD')}    ${rule.name}`)
      for (const folder of renamed) {
        const pkg = folder.split('/').slice(0, 2).join('/')
        console.log(`          ${dim(`${folder} does not exist, but ${pkg} has source files`)}`)
      }
    } else {
      inert += 1
      console.log(
        `  ${yellow('inert')}   ${rule.name}  ${dim(`${missing.join(' ')} — not written yet`)}`,
      )
    }
  }

  console.log('')
  if (dead > 0) {
    fail(
      `${dead} rule(s) name a folder that does not exist in a package that already has source.\n` +
        `      Either the folder was renamed and the rule now guards nothing, or the rule is wrong.\n` +
        `      A rule that reads correctly and matches nothing is the failure this check exists for.`,
    )
  } else {
    pass(`${live} rule(s) live, ${inert} waiting on folders that are not written yet, 0 dead`)
  }
}

const argv = process.argv
if (argv.includes('--prove')) prove()
else if (argv.includes('--audit')) audit()
else check()
