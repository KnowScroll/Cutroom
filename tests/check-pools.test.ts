import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { globSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, test } from 'node:test'
import { classify, mergeRaw, SECRETS_FILE, testFiles } from '../scripts/_pools.mjs'
import { REPO } from './_repo.ts'

// S-192 splits the suite's `tests` step into two pools that never overlap. What has to hold:
//
// 1. No file is dropped. The step used to be three globs handed to Node; it is now an
//    enumeration, and an enumeration that misses a file is a check that silently stopped.
// 2. Every PATH-only journey child is in the second pool. One of them in the first pool puts a
//    nested suite beside ordinary work, which is the cause S-176 named.
// 3. The pools really do not overlap, and the first one really does run in parallel — a change
//    that quietly did neither would still be green everywhere else.
// 4. A red in either pool fails the step, and what the other pool measured survives it.

const made: string[] = []
after(() => {
  for (const dir of made) rmSync(dir, { recursive: true, force: true })
})

/**
 * The environment a nested `node --test` needs: NODE_TEST_CONTEXT is set while this file runs
 * under a runner, and a child that inherits it reports to that runner rather than to its own
 * reporters — so the per-file results under test would never be written.
 */
function nested(extra: Record<string, string> = {}) {
  const env: NodeJS.ProcessEnv = { ...process.env, NO_COLOR: '1', ...extra }
  delete env.NODE_TEST_CONTEXT
  return env
}

/** A test file that logs when it starts and ends, and takes long enough to overlap. */
const fixture = (name: string, ms = 400) =>
  [
    "import { appendFileSync } from 'node:fs'",
    "import { test } from 'node:test'",
    '',
    `test('${name}', () => {`,
    '  const log = String(process.env.POOL_LOG)',
    `  appendFileSync(log, '${name} start ' + Date.now() + '\\n')`,
    `  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ${ms})`,
    `  appendFileSync(log, '${name} end ' + Date.now() + '\\n')`,
    '})',
    '',
  ].join('\n')

const RED = [
  "import assert from 'node:assert/strict'",
  "import { test } from 'node:test'",
  '',
  "test('deliberately red', () => assert.equal(1, 2))",
  '',
].join('\n')

/** A working copy holding the test files given, and the log the fixtures append to. */
function scratch(files: Record<string, string>) {
  const dir = mkdtempSync(join(tmpdir(), 'pools-'))
  made.push(dir)
  mkdirSync(join(dir, 'tests'))
  for (const [name, body] of Object.entries(files)) writeFileSync(join(dir, 'tests', name), body)
  const log = join(dir, 'pool.log')
  writeFileSync(log, '')
  return { dir, log }
}

type Raw = {
  total?: number
  pass?: number
  fail?: number
  freeMinMB?: number
  files?: Record<string, { pass: number; fail: number }>
  pools?: { label: string; files: number; concurrency: number; ms: number; freeMinMB: number }[]
}

function runPools(dir: string, log: string, ...args: string[]) {
  const result = spawnSync(process.execPath, [join(REPO, 'scripts', 'run-tests.mjs'), ...args], {
    cwd: dir,
    encoding: 'utf8',
    env: nested({ POOL_LOG: log }),
    timeout: 120_000,
  })
  let raw: Raw | undefined
  try {
    raw = JSON.parse(readFileSync(join(dir, '.verification', 'tests.json'), 'utf8')) as Raw
  } catch {
    raw = undefined
  }
  return { ...result, out: `${result.stdout}${result.stderr}`, raw }
}

/** Start and end for each name the fixtures logged. */
function spans(log: string) {
  const found = new Map<string, { start: number; end: number }>()
  for (const line of readFileSync(log, 'utf8').split('\n').filter(Boolean)) {
    const [name, edge, at] = line.split(' ')
    if (name === undefined || edge === undefined) continue
    const row = found.get(name) ?? { start: 0, end: 0 }
    if (edge === 'start') row.start = Number(at)
    else row.end = Number(at)
    found.set(name, row)
  }
  return found
}

test('1. the enumeration holds every test file the three globs held, and nothing else', () => {
  const found = testFiles(REPO)
  const globbed = globSync(['tests/**/*.test.ts', 'packages/**/*.test.ts', 'apps/**/*.test.ts'], {
    cwd: REPO,
  })
    .map((path) => path.split('\\').join('/'))
    .sort()
  assert.ok(globbed.length > 100, `the reference glob found ${globbed.length} file(s)`)
  assert.deepEqual(
    found,
    globbed,
    'the pools would run a different set of files than the globs did',
  )

  // And every test file git knows about, so an enumeration that walked the wrong roots is caught
  // even if both sides of the comparison above were wrong in the same way.
  const tracked = spawnSync('git', ['ls-files', '*.test.ts'], { cwd: REPO, encoding: 'utf8' })
  assert.equal(tracked.status, 0, tracked.stderr)
  const missing = tracked.stdout
    .split('\n')
    .filter(Boolean)
    .filter((path) => !found.includes(path))
  assert.deepEqual(missing, [], 'tracked test files the pools would not run')
})

test('2. the enumeration walks all three roots, to any depth, and skips what is not source', () => {
  // Today every test file lives under tests/, so comparing the enumeration with a glob of the
  // three roots cannot catch a root that went missing. A fixture can: this is the check that
  // fails if `packages` or `apps` is dropped from TEST_ROOTS, before a package has its first test.
  const dir = mkdtempSync(join(tmpdir(), 'roots-'))
  made.push(dir)
  const write = (relative: string) => {
    mkdirSync(join(dir, relative, '..'), { recursive: true })
    writeFileSync(join(dir, relative), '\n')
  }
  write('tests/one.test.ts')
  write('packages/thing/src/deep/two.test.ts')
  write('apps/worker/src/three.test.ts')
  write('packages/thing/node_modules/dep/four.test.ts')
  write('packages/thing/dist/five.test.ts')
  write('packages/thing/src/six.ts')
  write('docs/seven.test.ts')
  assert.deepEqual(testFiles(dir), [
    'apps/worker/src/three.test.ts',
    'packages/thing/src/deep/two.test.ts',
    'tests/one.test.ts',
  ])
})

test('3. every PATH-only journey child is in the secrets pool, named or not', () => {
  const files = testFiles(REPO)
  const { ordinary, secrets } = classify(files)
  assert.deepEqual([...ordinary, ...secrets].sort(), files, 'the two pools are not the whole set')
  assert.equal(
    ordinary.filter((file) => secrets.includes(file)).length,
    0,
    'a file is in both pools',
  )
  // Thirteen since `benchmark-view`'s own child (S-204): the bound only ever goes up, and at
  // twelve a child that stopped being one would have satisfied it.
  assert.ok(secrets.length >= 13, `only ${secrets.length} secrets children found`)
  for (const file of secrets) assert.match(file, SECRETS_FILE)

  // A PATH-only child is recognised by what it does, not by its name: each of the thirteen builds
  // the environment it hands its nested suite through a `bareEnvironment` of its own, and nothing
  // else in the repository does. One of these in the ordinary pool is S-176's cause, returned.
  // Assembled from parts so that this file, which names the marker, is not its own match.
  const marker = new RegExp(`function ${'bare'}Environment`)
  const pathOnly = ordinary.filter((file) => marker.test(readFileSync(join(REPO, file), 'utf8')))
  for (const file of secrets) {
    assert.match(
      readFileSync(join(REPO, file), 'utf8'),
      marker,
      `${file} is in the secrets pool but does not build a PATH-only environment`,
    )
  }
  assert.deepEqual(
    pathOnly,
    [],
    'a file that runs a PATH-only nested suite is in the ordinary pool',
  )
})

test('4. the merge of two pools adds their counts and keeps every file', () => {
  const merged = mergeRaw([
    { pass: 2, fail: 0, files: { 'tests/a.test.ts': { pass: 2, fail: 0 } } },
    { pass: 1, fail: 1, files: { 'tests/b-secrets.test.ts': { pass: 1, fail: 1 } } },
  ])
  assert.equal(merged.total, 4)
  assert.equal(merged.pass, 3)
  assert.equal(merged.fail, 1)
  assert.deepEqual(Object.keys(merged.files), ['tests/a.test.ts', 'tests/b-secrets.test.ts'])

  // A file somehow in both pools keeps both halves of its count rather than one of them.
  const twice = mergeRaw([
    { pass: 1, fail: 0, files: { 'tests/a.test.ts': { pass: 1, fail: 0 } } },
    { pass: 0, fail: 1, files: { 'tests/a.test.ts': { pass: 0, fail: 1 } } },
  ])
  assert.deepEqual(twice.files['tests/a.test.ts'], { pass: 1, fail: 1 })
  assert.equal(twice.total, 2)

  // Nothing a missing or malformed pool file can do makes the merge throw or invent a count.
  const partial = mergeRaw([undefined, null, { pass: 1, files: undefined }])
  assert.equal(partial.total, 1)
  assert.deepEqual(partial.files, {})
})

test('5. both pools run, the per-file results are merged, and each pool records what it cost', () => {
  const { dir, log } = scratch({
    'one.test.ts': fixture('one'),
    'two.test.ts': fixture('two'),
    'three-secrets.test.ts': fixture('three'),
  })
  const result = runPools(dir, log)
  assert.equal(result.status, 0, result.out)
  assert.equal(result.raw?.total, 3, `per-file totals: ${JSON.stringify(result.raw)}`)
  assert.deepEqual(Object.keys(result.raw?.files ?? {}).sort(), [
    'tests/one.test.ts',
    'tests/three-secrets.test.ts',
    'tests/two.test.ts',
  ])
  const pools = result.raw?.pools ?? []
  assert.deepEqual(
    pools.map((pool) => [pool.label, pool.files]),
    [
      ['ordinary', 2],
      ['secrets', 1],
    ],
  )
  const [ordinaryPool, secretsPool] = pools
  assert.ok(ordinaryPool !== undefined && secretsPool !== undefined, 'a pool is missing')
  assert.ok(ordinaryPool.concurrency > 1, 'the ordinary pool is not parallel')
  assert.equal(secretsPool.concurrency, 2)
  for (const pool of pools) {
    assert.ok(pool.freeMinMB > 0, `pool ${pool.label} recorded no free-memory floor`)
    assert.ok(pool.ms > 0)
  }
  assert.ok((result.raw?.freeMinMB ?? 0) > 0, 'no floor for the step')
})

test('6. the pools never overlap, and the ordinary pool does run its files beside each other', () => {
  const { dir, log } = scratch({
    'one.test.ts': fixture('one'),
    'two.test.ts': fixture('two'),
    'three.test.ts': fixture('three'),
    'four.test.ts': fixture('four'),
    'five-secrets.test.ts': fixture('five'),
  })
  const result = runPools(dir, log)
  assert.equal(result.status, 0, result.out)
  const seen = spans(log)
  assert.equal(seen.size, 5, `only ${seen.size} file(s) logged: ${readFileSync(log, 'utf8')}`)

  const ordinary = [...seen].filter(([name]) => name !== 'five').map(([, span]) => span)
  const secrets = seen.get('five')
  assert.ok(secrets !== undefined)
  const lastOrdinaryEnd = Math.max(...ordinary.map((span) => span.end))
  assert.ok(
    secrets.start >= lastOrdinaryEnd,
    `the secrets pool started ${lastOrdinaryEnd - secrets.start} ms before the ordinary pool finished`,
  )

  // Parallel, not merely sequential-and-faster: at least two ordinary files were running at once.
  const overlapping = ordinary.some((a) =>
    ordinary.some((b) => a !== b && a.start < b.end && b.start < a.end),
  )
  assert.ok(overlapping, 'no two ordinary files overlapped, so the pool ran them one at a time')
})

test('7. a red in the secrets pool fails the step and keeps what the ordinary pool measured', () => {
  const { dir, log } = scratch({
    'one.test.ts': fixture('one', 50),
    'two-secrets.test.ts': RED,
  })
  const result = runPools(dir, log)
  assert.equal(result.status, 1, `a red pool did not fail the step:\n${result.out}`)
  assert.equal(result.raw?.fail, 1)
  assert.equal(result.raw?.files?.['tests/one.test.ts']?.pass, 1)
  assert.match(result.out, /FAIL\s+pool secrets/)
})

test('8. a red in the ordinary pool fails the step, and the secrets pool still runs', () => {
  const { dir, log } = scratch({
    'one.test.ts': RED,
    'two-secrets.test.ts': fixture('two', 50),
  })
  const result = runPools(dir, log)
  assert.equal(result.status, 1, `a red pool did not fail the step:\n${result.out}`)
  assert.equal(
    result.raw?.files?.['tests/two-secrets.test.ts']?.pass,
    1,
    'the second pool was skipped',
  )
})

test('9. --serial still runs every file in one pool at concurrency 1 (what S-176 ran)', () => {
  const { dir, log } = scratch({
    'one.test.ts': fixture('one', 150),
    'two.test.ts': fixture('two', 150),
    'three-secrets.test.ts': fixture('three', 150),
  })
  const result = runPools(dir, log, '--serial')
  assert.equal(result.status, 0, result.out)
  const pools = result.raw?.pools ?? []
  assert.deepEqual(
    pools.map((pool) => [pool.label, pool.concurrency]),
    [['every file', 1]],
  )
  const seen = [...spans(log).values()]
  const overlapping = seen.some((a) =>
    seen.some((b) => a !== b && a.start < b.end && b.start < a.end),
  )
  assert.ok(!overlapping, 'two files overlapped under --serial')
})
