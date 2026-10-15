/**
 * Build the impact map: which test files cover which source files (S-196).
 *
 * Each test file runs in a process of its own under `NODE_V8_COVERAGE`, pointed at a directory of
 * its own, so everything that process and every process it SPAWNS loads is attributed to that one
 * test file. The two pools of S-192 are reused, because this is the suite run a file at a time and
 * the secrets children still start nested suites.
 *
 * Writes `.verification/impact.json` (gitignored, like the receipt): the tree it was built at, and
 * for each test file the repository paths it covers — loaded, or named as a string in its own
 * source, which is how a tool a test COPIES into a scratch repository is credited (see _impact.mjs).
 *
 *   node scripts/impact-map.mjs              every test file
 *   node scripts/impact-map.mjs --only reel  only files whose path contains "reel"
 *
 * A partial build merges into whatever is already recorded, so a long build can be taken in slices.
 */
import { spawn } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative, sep } from 'node:path'
import { dim, green, red } from './_lib.mjs'
import { IMPACT_VERSION, pathsNamedIn, readImpact } from './_impact.mjs'
import { classify, ORDINARY_CONCURRENCY, testFiles } from './_pools.mjs'
import { ensureVerificationDir, impactPath, testedTree } from './_verification.mjs'

const WHERE = process.cwd()
const onlyAt = process.argv.indexOf('--only')
const only = onlyAt >= 0 ? process.argv[onlyAt + 1] : undefined
const all = testFiles(WHERE)
const files = only === undefined ? all : all.filter((file) => file.includes(only))
if (files.length === 0) {
  console.error(`${red('FAIL')}  no test file matches`)
  process.exit(2)
}

/** Every repository path a run under `dir` loaded, this repository's own files only. */
function loadedUnder(dir) {
  const found = new Set()
  for (const name of readdirSync(dir)) {
    let parsed
    try {
      parsed = JSON.parse(readFileSync(join(dir, name), 'utf8'))
    } catch {
      continue
    }
    for (const row of parsed.result ?? []) {
      if (typeof row.url !== 'string' || !row.url.startsWith('file:')) continue
      let path
      try {
        path = decodeURIComponent(new URL(row.url).pathname).replace(/^\//, '')
      } catch {
        continue
      }
      const rel = relative(WHERE, path).split(sep).join('/')
      if (rel.startsWith('..') || rel.startsWith('node_modules/') || rel === '') continue
      found.add(rel)
    }
  }
  return found
}

/** One test file, alone, with its own coverage directory. */
async function cover(file) {
  const dir = mkdtempSync(join(tmpdir(), 'impact-'))
  const started = Date.now()
  const child = spawn(
    process.execPath,
    ['--experimental-strip-types', '--no-warnings', '--test', '--test-reporter=tap', file],
    {
      cwd: WHERE,
      stdio: ['ignore', 'ignore', 'ignore'],
      env: { ...process.env, NO_COLOR: '1', NODE_V8_COVERAGE: dir },
    },
  )
  const code = await new Promise((resolve) => child.on('close', resolve))
  const loaded = loadedUnder(dir)
  rmSync(dir, { recursive: true, force: true })

  // A path the test NAMES — a tool it copies and runs elsewhere, a fixture it reads — is covered
  // too, and only paths that exist are kept so a comment cannot invent one.
  const named = pathsNamedIn(readFileSync(join(WHERE, file), 'utf8'))
  for (const name of named) {
    if (name.includes('/')) {
      if (existsSync(join(WHERE, name))) loaded.add(name)
      continue
    }
    // A bare basename, as a fixture's copy list writes it: credit it under the folders that hold
    // the things tests copy.
    for (const folder of ['scripts', 'tests', 'db']) {
      if (existsSync(join(WHERE, folder, name))) loaded.add(`${folder}/${name}`)
    }
  }
  return { file, ok: code === 0, ms: Date.now() - started, covers: [...loaded].sort() }
}

/** Run a list with at most `width` at a time, keeping the output in order. */
async function pooled(list, width, each) {
  const results = []
  let next = 0
  const workers = Array.from({ length: Math.min(width, list.length) }, async () => {
    while (next < list.length) {
      const index = next++
      results[index] = await each(list[index])
    }
  })
  await Promise.all(workers)
  return results
}

const { ordinary, secrets } = classify(files)
console.log(
  `\n  building the impact map: ${ordinary.length} ordinary file(s) at ${ORDINARY_CONCURRENCY}, ` +
    `${secrets.length} PATH-only child(ren) derived from their siblings\n`,
)

const started = Date.now()
const rows = await pooled(ordinary, ORDINARY_CONCURRENCY, cover)

/**
 * The PATH-only children are DERIVED, never measured, and the reason is itself a measurement:
 * coverage follows a process tree because Node propagates NODE_V8_COVERAGE into every child a
 * process spawns — which is exactly how a worker or a service a test starts gets recorded. Each of
 * these children asserts that ITS child holds nothing beyond PATH, so the variable that would
 * measure them is the variable they exist to refuse. Run under coverage, all twelve fail with
 * "the child holds a variable beyond PATH", naming NODE_V8_COVERAGE (measured 2026-10-16, which is
 * how this is here instead of a map built from thirteen red files).
 *
 * What each one does is re-run its own feature's other test files, so what it covers is exactly the
 * union of what they cover — structural, exact, and free.
 */
for (const child of secrets) {
  const feature = child.slice(0, child.lastIndexOf('-secrets.test.ts'))
  const siblings = ordinary.filter((file) => file.startsWith(`${feature}-`))
  const union = new Set([child])
  for (const sibling of siblings) {
    for (const path of rows.find((row) => row.file === sibling)?.covers ?? []) union.add(path)
  }
  rows.push({ file: child, ok: true, ms: 0, derived: siblings.length, covers: [...union].sort() })
}

ensureVerificationDir(WHERE)
const existing = readImpact(WHERE)
const covers = { ...(existing?.covers ?? {}) }
const reds = []
for (const row of rows) {
  covers[row.file] = row.covers
  if (!row.ok) reds.push(row.file)
}
mkdirSync(join(WHERE, '.verification'), { recursive: true })
writeFileSync(
  impactPath(WHERE),
  `${JSON.stringify(
    {
      impact: IMPACT_VERSION,
      builtAt: new Date().toISOString(),
      tree: testedTree(WHERE),
      partial: only !== undefined,
      covers,
    },
    null,
    2,
  )}\n`,
)

for (const row of [...rows].sort((a, b) => b.covers.length - a.covers.length).slice(0, 8)) {
  console.log(dim(`  ${String(row.covers.length).padStart(4)} file(s) covered  ${row.file}`))
}
console.log(
  `\n  ${reds.length === 0 ? green('ok') : red('FAIL')}    ${rows.length} test file(s) mapped in ` +
    `${((Date.now() - started) / 1000).toFixed(0)} s, ${Object.keys(covers).length} in the map` +
    `${reds.length === 0 ? '' : `, RED: ${reds.join(', ')}`}\n`,
)
// A red test file still maps — what it loaded is what it loaded — but the build says so, because a
// map built from a failing suite is a map of what a broken tree happens to touch.
process.exit(reds.length === 0 ? 0 : 1)
