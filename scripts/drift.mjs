#!/usr/bin/env node
/**
 * One job: assert the module boundaries in .dependency-cruiser.cjs, prove each rule can
 * actually catch what it forbids, and report any rule that has quietly stopped applying to
 * anything.
 *
 *   node scripts/drift.mjs            check this repository, and read its source for a key
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
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
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

// ---------------------------------------------------------------- keys

/**
 * THE OTHER HALF OF `keys-only-in-providers` (S-109, S-119).
 *
 * The half in .dependency-cruiser.cjs holds the module that owns the read: nothing outside
 * packages/providers may import packages/providers/src/env.ts, by path or by name. It cannot hold
 * more than that, because a key is read with `process.env.NAME` — a property access on a global,
 * which no tool that resolves imports will ever see. So this reads the source instead, and it is
 * the half that catches the violation anyone would actually write.
 *
 * Both halves carry the one rule name, and `--prove` builds a deliberate violation of each.
 */

/** Where source lives. Anything outside these is not ours to hold (steering-ref, node_modules). */
const KEY_ROOTS = ['packages', 'apps', 'tests', 'scripts']
const KEY_SKIP = new Set(['node_modules', 'dist', '.tmp', '.artifacts', 'steering-ref', '.git'])
const KEY_SOURCE = /\.(m|c)?(t|j)s$/

/** The one folder a key may be read in (paid-path, Gate 2). */
const KEY_HOME = 'packages/providers/src/'

/** `*_API_KEY`, `*_KEY`, `*_TOKEN`, `*_SECRET` — a key's shape, whatever a provider calls it. */
const KEY_SHAPE = /^[A-Za-z_$][\w$]*_(API_KEY|KEY|TOKEN|SECRET)$/

/**
 * An environment READ: `env.NAME`, `env['NAME']` or `env[NAME]`, under any spelling of the object
 * it hangs off — `process.env`, or an `env` a function was handed. A name ASSIGNED is not a read:
 * the secrets checks set a key-shaped canary on purpose, to watch it fail to reach a child
 * (S-028), so an `=` that is not part of `==` immediately after ends the match.
 */
const KEY_READ =
  /\benv\s*(?:\.\s*([A-Za-z_$][\w$]*)|\[\s*(?:'([^']*)'|"([^"]*)"|([A-Za-z_$][\w$]*))\s*\])(?!\s*=[^=])/g

/** Every source file under `root`, as a path relative to it, in this repository's spelling. */
function sourceFiles(root) {
  const files = []
  const stack = KEY_ROOTS.filter((r) => existsSync(join(root, r)))
  while (stack.length > 0) {
    const at = stack.pop()
    for (const entry of readdirSync(join(root, at), { withFileTypes: true })) {
      if (KEY_SKIP.has(entry.name)) continue
      const child = `${at}/${entry.name}`
      if (entry.isDirectory()) stack.push(child)
      else if (KEY_SOURCE.test(entry.name)) files.push(child)
    }
  }
  return files.sort()
}

/** Every key-shaped environment read outside KEY_HOME: the file, the line and the name. */
function keyReads(root) {
  const found = []
  for (const file of sourceFiles(root)) {
    if (file.startsWith(KEY_HOME)) continue
    const text = readFileSync(join(root, file), 'utf8')
    KEY_READ.lastIndex = 0
    let match = KEY_READ.exec(text)
    while (match !== null) {
      const name = match[1] ?? match[2] ?? match[3] ?? match[4]
      if (KEY_SHAPE.test(name)) {
        found.push({ file, name, line: text.slice(0, match.index).split('\n').length })
      }
      match = KEY_READ.exec(text)
    }
  }
  return found
}

function checkKeys() {
  const found = keyReads(REPO)
  const home = KEY_HOME.replace(/\/$/, '')
  if (found.length === 0) {
    pass(`0 key-shaped environment reads outside ${home}`)
    return
  }
  console.error(
    `\n${red(bold(`${found.length} key-shaped environment read(s) outside ${home}`))}\n`,
  )
  for (const { file, line, name } of found) {
    console.error(`  ${red('keys-only-in-providers')}  ${file}:${line} ${dim('->')} ${name}`)
  }
  fail('a key is read outside packages/providers. Do not relax the rule; move the read (S-109).')
}

/**
 * The scan's own cases. A file is written to read a key, and the scan must find it; a file is
 * written to do the legal thing, and the scan must not. The bodies are BUILT rather than spelled,
 * because a literal key read in this file is a key read outside packages/providers, and the scan
 * reads scripts/ too — which is the point.
 */
const ENV = 'process.env'
const readsMember = (name) => `export const k = ${ENV}.${name}`
const readsSubscript = (name) => `export const k = ${ENV}[${JSON.stringify(name)}]`
const assigns = (name) => `${ENV}.${name} = 'sk-canary-not-a-real-key'`

/** Each entry: [file, name, body]. Every one of these must be reported. */
const KEY_CASES = [
  // One per root the scan walks: a package, an app, a test and a script. S-109 forbids the read
  // to every package, app AND TEST, so a root dropped from the walk is a case going silent here
  // rather than a hole nothing mentions.
  ['apps/worker/src/reads-a-key.ts', 'FAL_KEY', readsMember('FAL_KEY')],
  ['packages/domain/src/subscripts-a-key.ts', 'FAL_KEY', readsSubscript('FAL_KEY')],
  ['tests/reads-a-key.test.ts', 'MINIMAX_API_KEY', readsMember('MINIMAX_API_KEY')],
  ['scripts/reads-a-key.mjs', 'FAL_TOKEN', readsSubscript('FAL_TOKEN')],
]

/** The legal shapes. None of these may be reported, or the scan is wrong rather than the code. */
const KEY_LEGAL = [
  // The same read, inside the one folder a key may be read in.
  ['packages/providers/src/env.ts', 'MINIMAX_API_KEY', readsMember('MINIMAX_API_KEY')],
  // A setting is not a key: every path this engine writes is read exactly like this (D-086).
  ['apps/service/src/settings.ts', 'CUTROOM_DB_PATH', readsMember('CUTROOM_DB_PATH')],
  // A key-shaped name SET and never read — the secrets checks' canary, which must stay legal or
  // checks 26 and 50 could not be written at all (S-028).
  ['tests/canary.test.ts', 'CUTROOM_TEST_API_KEY', assigns('CUTROOM_TEST_API_KEY')],
]

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
  // S-119: the import half of keys-only-in-providers. The module that owns the read, reached
  // from outside providers. no-reaching-into-internals fires on this file too — a case counts as
  // caught only when ITS rule fires on ITS edge, so the two are two things proven, not one.
  [
    'keys-only-in-providers',
    'apps/worker/src/reads-a-key.ts',
    '../../../packages/providers/src/env.ts',
  ],
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
  ['packages/providers/src/env.ts', 'export const falKey = () => undefined'],
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

  // S-119: the same half again, by the name someone reaching for the key readers would write.
  // packages/providers exports only '.', so the specifier never resolves — and the rule matches
  // it as a bare specifier for exactly that reason, the way model-client-only-in-providers
  // catches a client that is not installed. If a subpath export is ever added, the resolved path
  // is the rule's other alternation and it still fires.
  ['keys-only-in-providers', 'apps/worker', '@cutroom/providers/env', 'no such subpath'],
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
 * import, in the package's src/ or in the folder the case names. An import carrying a NOTE gets
 * no link at all — it is not installed, or the package declares no such subpath — so it reaches
 * the graph as the bare specifier, which is what a rule matching by name has to fire on.
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
    if (note === undefined) {
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

  // 3. The twentieth rule's other half: a key READ rather than imported (S-119). The same rule
  // name, a mechanism no resolver can provide, and its own violating and legal shapes.
  const keys = join(root, 'keys')
  build(
    keys,
    [...KEY_CASES, ...KEY_LEGAL].map(([file, , body]) => [file, body]),
  )
  const reads = keyReads(keys)
  const readAt = (file, name) => reads.some((r) => r.file === file && r.name === name)
  console.log(`\n${bold('The twentieth rule again, read rather than imported')}\n`)
  for (const [file, name] of KEY_CASES) {
    const label = `keys-only-in-providers  ${file} -> ${name}`
    if (readAt(file, name)) {
      console.log(`  ${green('caught')}  ${label}`)
    } else {
      console.log(`  ${red('SILENT')}  ${label}`)
      silent += 1
    }
  }
  for (const [file, name] of KEY_LEGAL) {
    if (readAt(file, name)) {
      console.log(`  ${red('EAGER')}   keys-only-in-providers  ${file} -> ${name}`)
      overeager += 1
    } else {
      console.log(`  ${green('clean')}   ${file} -> ${name}`)
    }
  }
  // A read the scan found that no case named is a scan that is guessing, not a rule.
  for (const { file, name, line } of reads) {
    if (KEY_CASES.some(([f, n]) => f === file && n === name)) continue
    console.log(`  ${red('EAGER')}   keys-only-in-providers  ${file}:${line} -> ${name}`)
    overeager += 1
  }

  rmSync(root, { recursive: true, force: true })
  console.log('')

  const rules = new Set([...CASES, ...BY_NAME_CASES].map(([rule]) => rule)).size
  const caseCount = CASES.length + BY_NAME_CASES.length + KEY_CASES.length
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
        `package name and ${KEY_CASES.length} by reading rather than importing, and silent on a ` +
        'legal shape every way, every legal import resolved',
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
else {
  // Both halves of the twentieth rule, always: a green boundary graph says nothing about a key
  // read, and a clean source says nothing about an import (S-119).
  check()
  checkKeys()
}
