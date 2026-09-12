#!/usr/bin/env node
/**
 * One job: assert the module boundaries in .dependency-cruiser.cjs, and prove each rule
 * can actually catch what it forbids.
 *
 *   node scripts/drift.mjs            check this repository
 *   node scripts/drift.mjs --prove    build a deliberate violation of every rule in a
 *                                     temporary folder and fail if any rule stays silent
 *
 * --prove exists because of a specific failure in the steering repository: two boundary
 * rules the architecture rested on were described in prose for weeks and were not in the
 * config at all. A rule nobody has seen fire is a comment.
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { REPO, bold, dim, fail, green, pass, red, run, yellow } from './_lib.mjs'

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
]

const EXTRA_FILES = [
  ['packages/domain/src/deep/thing.ts', 'export const thing = 1'],
  ['apps/worker/src/pong.ts', "import './ping.ts'"],
]

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

  rmSync(root, { recursive: true, force: true })
  console.log('')

  if (silent > 0) {
    fail(`${silent} rule(s) stayed silent on a file written specifically to break them.`)
  } else if (overeager > 0) {
    fail(`${overeager} rule(s) fired on a legal import. The rules are wrong, not the code.`)
  } else {
    pass(`${CASES.length} rules proven to fire, and silent on a legal shape`)
  }
}

if (process.argv.includes('--prove')) prove()
else check()
