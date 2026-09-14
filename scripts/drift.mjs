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
  }
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

/** Each entry is a file written specifically to trip the rule it names. */
const CASES = [
  ['pipeline-no-domain', 'packages/pipeline/src/index.ts', "import '../../domain/src/index.ts'"],
  ['pipeline-no-providers', 'packages/pipeline/src/a.ts', "import '../../providers/src/index.ts'"],
  ['pipeline-no-apps', 'packages/pipeline/src/b.ts', "import '../../../apps/api/src/index.ts'"],
  ['pipeline-no-io', 'packages/pipeline/src/c.ts', "import 'node:fs'"],
  [
    'api-no-providers',
    'apps/api/src/index.ts',
    "import '../../../packages/providers/src/index.ts'",
  ],
  ['providers-no-domain', 'packages/providers/src/index.ts', "import '../../domain/src/index.ts'"],
  ['providers-no-pipeline', 'packages/providers/src/a.ts', "import '../../pipeline/src/index.ts'"],
  [
    'domain-no-pipeline-or-providers',
    'packages/domain/src/index.ts',
    "import '../../pipeline/src/index.ts'",
  ],
  ['contracts-are-a-leaf', 'packages/contracts/src/index.ts', "import '../../domain/src/index.ts'"],
  [
    'no-reaching-into-internals',
    'apps/worker/src/index.ts',
    "import '../../../packages/domain/src/deep/thing.ts'",
  ],
  ['no-circular', 'apps/worker/src/ping.ts', "import './pong.ts'"],

  // The four rules between two folders of ONE package. Every import below is relative,
  // which is exactly why matching import text could never catch them.
  ['plan-no-epistemic', 'packages/pipeline/src/plan/index.ts', "import '../epistemic/index.ts'"],
  ['split-no-cinematic', 'packages/pipeline/src/split/index.ts', "import '../cinematic/types.ts'"],
  [
    'split-imported-only-by-plan',
    'packages/pipeline/src/epistemic/reaches-split.ts',
    "import '../split/index.ts'",
  ],
  [
    'split-entered-through-its-index',
    'packages/pipeline/src/plan/deep.ts',
    "import '../split/internal/cut.ts'",
  ],
]

const EXTRA_FILES = [
  ['packages/domain/src/deep/thing.ts', 'export const thing = 1'],
  ['apps/worker/src/pong.ts', "import './ping.ts'"],
  ['packages/pipeline/src/epistemic/index.ts', 'export const fullScript = 1'],
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
 * Each entry: [rule, importing package folder, specifier]. Package names are `@cutroom/<folder>`.
 */
const BY_NAME_CASES = [
  ['pipeline-no-domain', 'packages/pipeline', '@cutroom/domain'],
  ['pipeline-no-providers', 'packages/pipeline', '@cutroom/providers'],
  ['pipeline-no-apps', 'packages/pipeline', '@cutroom/api'],
  ['api-no-providers', 'apps/api', '@cutroom/providers'],
  ['providers-no-domain', 'packages/providers', '@cutroom/domain'],
  ['providers-no-pipeline', 'packages/providers', '@cutroom/pipeline'],
  ['domain-no-pipeline-or-providers', 'packages/domain', '@cutroom/pipeline'],
  ['contracts-are-a-leaf', 'packages/contracts', '@cutroom/domain'],
]

/** The legal shape again, by package name. Nothing here may be reported. */
const BY_NAME_LEGAL = [
  ['apps/worker', '@cutroom/pipeline'],
  ['apps/worker', '@cutroom/domain'],
  ['packages/pipeline', '@cutroom/contracts'],
]

const PACKAGE_FOLDERS = [
  'packages/contracts',
  'packages/domain',
  'packages/pipeline',
  'packages/providers',
  'apps/api',
  'apps/worker',
]

/**
 * A miniature workspace: every package with a package.json that declares only `exports`, the
 * way the real ones do, and a workspace link placed where pnpm places it — inside the
 * IMPORTING package's node_modules. Then one file per import.
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
  imports.forEach(([from, specifier], i) => {
    const target = PACKAGE_FOLDERS.find((f) => `@cutroom/${f.split('/')[1]}` === specifier)
    const link = join(dir, from, 'node_modules', ...specifier.split('/'))
    if (!existsSync(link)) {
      mkdirSync(join(link, '..'), { recursive: true })
      symlinkSync(join(dir, target), link, 'junction')
    }
    writeFileSync(join(dir, from, 'src', `by-name-${i}.ts`), `import '${specifier}'\n`, 'utf8')
  })
  const tsconfig = '{ "compilerOptions": { "allowImportingTsExtensions": true, "noEmit": true } }'
  writeFileSync(join(dir, 'tsconfig.json'), `${tsconfig}\n`, 'utf8')
}

/** A legal shape. Nothing here may be reported, or the rules are too eager to be trusted. */
const LEGAL = [
  ['packages/contracts/src/index.ts', 'export type Port = { run(): Promise<void> }'],
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

  // The legal version of the four folder rules: the planner calls the splitter through its
  // index, the splitter knows only prose, and the epistemic layer keeps the full script to
  // itself. None of this may be reported.
  [
    'packages/pipeline/src/plan/index.ts',
    "import type { Port } from '../../../contracts/src/index.ts'\n" +
      "import '../split/index.ts'\n" +
      'export type Plan = Port',
  ],
  ['packages/pipeline/src/split/index.ts', 'export const split = (prose: string) => [prose]'],
  [
    'packages/pipeline/src/epistemic/index.ts',
    "import type { Port } from '../../../contracts/src/index.ts'\nexport type Epistemic = Port",
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

function prove() {
  const root = join(REPO, '.tmp', 'drift-probe')

  // 1. Every rule must fire against a file built to break it.
  const violating = join(root, 'violating')
  build(violating, [...CASES.map(([, path, body]) => [path, body]), ...EXTRA_FILES])
  const dirty = cruise(violating, SCAN)
  if (dirty.error) {
    fail(`the probe could not run:\n${dirty.error}`)
    return
  }
  const fired = new Set(dirty.violations.map((v) => v.rule))

  console.log(`\n${bold('Each rule, against a file written to break it')}\n`)
  let silent = 0
  for (const [rule] of CASES) {
    if (fired.has(rule)) {
      console.log(`  ${green('caught')}  ${rule}`)
    } else {
      console.log(`  ${red('SILENT')}  ${rule}`)
      silent += 1
    }
  }

  // 1b. The cross-package rules again, imported by PACKAGE NAME — the form real code uses.
  const byName = join(root, 'by-name')
  buildByName(
    byName,
    BY_NAME_CASES.map(([, from, specifier]) => [from, specifier]),
  )
  const dirtyByName = cruise(byName, SCAN)
  console.log(`\n${bold('The cross-package rules, imported by package name')}\n`)
  if (dirtyByName.error) {
    console.log(`  ${red('ERROR')}   ${dirtyByName.error}`)
    silent += BY_NAME_CASES.length
  } else {
    const firedByName = new Set(dirtyByName.violations.map((v) => v.rule))
    for (const [rule, , specifier] of BY_NAME_CASES) {
      if (firedByName.has(rule)) {
        console.log(`  ${green('caught')}  ${rule}  ${dim(specifier)}`)
      } else {
        console.log(`  ${red('SILENT')}  ${rule}  ${dim(specifier)}`)
        silent += 1
      }
    }
  }

  // 2. A legal shape must come back clean, or the rules are wrong rather than the code.
  const legal = join(root, 'legal')
  build(legal, LEGAL)
  const clean = cruise(legal, SCAN)
  console.log(`\n${bold('A legal shape: worker -> pipeline -> contracts, worker -> domain')}\n`)
  let overeager = 0
  if (clean.error) {
    console.log(`  ${red('ERROR')}   ${clean.error}`)
    overeager += 1
  } else if (clean.violations.length === 0) {
    console.log(`  ${green('clean')}   ${clean.modules} modules, nothing reported`)
  } else {
    overeager = clean.violations.length
    for (const v of clean.violations) {
      console.log(`  ${red('EAGER')}   ${v.rule}  ${v.from} -> ${v.to}`)
    }
  }

  // 2b. The legal shape by package name. A resolver fix that made rules over-eager on
  // workspace imports would show up here, not in the relative-path shape above.
  const legalByName = join(root, 'legal-by-name')
  buildByName(legalByName, BY_NAME_LEGAL)
  const cleanByName = cruise(legalByName, SCAN)
  console.log(`\n${bold('The legal shape, by package name')}\n`)
  if (cleanByName.error) {
    console.log(`  ${red('ERROR')}   ${cleanByName.error}`)
    overeager += 1
  } else if (cleanByName.violations.length === 0) {
    console.log(`  ${green('clean')}   ${cleanByName.modules} modules, nothing reported`)
  } else {
    overeager += cleanByName.violations.length
    for (const v of cleanByName.violations) {
      console.log(`  ${red('EAGER')}   ${v.rule}  ${v.from} -> ${v.to}`)
    }
  }

  rmSync(root, { recursive: true, force: true })
  console.log('')

  if (silent > 0) {
    fail(`${silent} rule(s) stayed silent on a file written specifically to break them.`)
  } else if (overeager > 0) {
    fail(`${overeager} rule(s) fired on a legal import. The rules are wrong, not the code.`)
  } else {
    pass(
      `${CASES.length} rules proven to fire, ${BY_NAME_CASES.length} of them again by package ` +
        'name, and silent on a legal shape both ways',
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
