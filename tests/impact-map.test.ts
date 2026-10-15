import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import {
  appendFileSync,
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, test } from 'node:test'
import { ALWAYS_RUN, IMPACT_VERSION, pathsNamedIn, selectTests } from '../scripts/_impact.mjs'
import { REPO } from './_repo.ts'

// S-196 replaces a judgement with a record: which tests cover which source files, built by running
// each test file under NODE_V8_COVERAGE. What has to hold, and why each one is here:
//
// 1. The map really is built from what ran, including what a SPAWNED process loaded — most of this
//    suite's dependencies are spawns, not imports.
// 2. A tool a test COPIES into a scratch repository is credited to that test, because coverage
//    attributes the copy to a temporary path and would otherwise miss the checker's own tests.
// 3. Every uncertainty selects MORE, never less: an uncovered path, a missing map, a test the map
//    has never seen, a changed test file. Under-selection is a check that silently stopped running.

const made: string[] = []
after(() => {
  for (const dir of made) rmSync(dir, { recursive: true, force: true })
})

function git(cwd: string, ...args: string[]) {
  const r = spawnSync(
    'git',
    ['-c', 'user.name=impact-test', '-c', 'user.email=impact@test', ...args],
    { cwd, encoding: 'utf8' },
  )
  assert.equal(r.status, 0, `git ${args.join(' ')}: ${r.stderr}`)
}

/** The environment a nested `node --test` needs (NODE_TEST_CONTEXT would redirect its reporters). */
function nested() {
  const env: NodeJS.ProcessEnv = { ...process.env, NO_COLOR: '1' }
  delete env.NODE_TEST_CONTEXT
  delete env.NODE_V8_COVERAGE
  return env
}

const MAP = (covers: Record<string, string[]>) => ({
  impact: IMPACT_VERSION,
  builtAt: '2026-10-15T00:00:00.000Z',
  tree: 'abc',
  covers,
})

test('1. a changed source file selects every test the map says covers it, and no other', () => {
  const map = MAP({
    'tests/a.test.ts': ['packages/one/src/index.ts', 'tests/a.test.ts'],
    'tests/b.test.ts': ['packages/two/src/index.ts', 'tests/b.test.ts'],
    'tests/both.test.ts': ['packages/one/src/index.ts', 'packages/two/src/index.ts'],
  })
  const onDisk = ['tests/a.test.ts', 'tests/b.test.ts', 'tests/both.test.ts']
  const chosen = selectTests(map, ['packages/one/src/index.ts'], { testFilesOnDisk: onDisk })
  assert.deepEqual(chosen.tests, ['tests/a.test.ts', 'tests/both.test.ts'])
})

test('2. a changed file no recorded test covers owes the full run, with the reason', () => {
  const map = MAP({ 'tests/a.test.ts': ['packages/one/src/index.ts'] })
  const chosen = selectTests(map, ['packages/three/src/new.ts'], {
    testFilesOnDisk: ['tests/a.test.ts'],
  })
  assert.equal(chosen.tests, undefined)
  assert.match(chosen.why ?? '', /no recorded test covers packages\/three\/src\/new\.ts/)
})

test('3. no map at all owes the full run', () => {
  const chosen = selectTests(undefined, ['packages/one/src/index.ts'], { testFilesOnDisk: [] })
  assert.equal(chosen.tests, undefined)
  assert.match(chosen.why ?? '', /no impact map/)
})

test('4. a test file the map has never seen runs anyway, so a stale map cannot hide it', () => {
  const map = MAP({ 'tests/a.test.ts': ['packages/one/src/index.ts'] })
  const chosen = selectTests(map, ['packages/one/src/index.ts'], {
    testFilesOnDisk: ['tests/a.test.ts', 'tests/added-since.test.ts'],
  })
  assert.ok(chosen.tests?.includes('tests/added-since.test.ts'), 'an unmapped test was skipped')
})

test('5. a changed test file runs, and the scans that read files always run', () => {
  // The always-run set is IN the map here, each covering only itself: without that, an unmapped
  // test would be selected by the rule above and this check could not tell the two apart.
  const covers: Record<string, string[]> = { 'tests/a.test.ts': ['packages/one/src/index.ts'] }
  for (const always of ALWAYS_RUN) covers[always] = [always]
  const onDisk = ['tests/a.test.ts', 'tests/changed.test.ts', ...ALWAYS_RUN]
  const chosen = selectTests(MAP(covers), ['tests/changed.test.ts'], { testFilesOnDisk: onDisk })
  assert.ok(chosen.tests?.includes('tests/changed.test.ts'), 'a changed test file was not selected')
  for (const always of ALWAYS_RUN) {
    assert.ok(
      chosen.tests?.includes(always),
      `${always} reads files rather than importing them, so it must run whenever anything changed`,
    )
  }
  // And nothing else: the map is not an excuse to run the suite.
  assert.ok(!chosen.tests?.includes('tests/a.test.ts'))
})

test('6. a path a test only NAMES is covered, which is how a copied tool is credited', () => {
  const named = pathsNamedIn(
    [
      "for (const f of ['check.mjs', '_lib.mjs']) copyFileSync(join(REPO, 'scripts', f), dir)",
      "readFileSync('packages/pipeline/src/plan.ts')",
      "const unrelated = 'just a sentence'",
    ].join('\n'),
  )
  assert.ok(named.includes('check.mjs'))
  assert.ok(named.includes('_lib.mjs'))
  assert.ok(named.includes('packages/pipeline/src/plan.ts'))
  assert.ok(!named.includes('just a sentence'))
})

test('7. the map is built from what each test loaded, including what its children loaded', () => {
  const dir = mkdtempSync(join(tmpdir(), 'impact-build-'))
  made.push(dir)
  const write = (path: string, body: string) => {
    mkdirSync(join(dir, path, '..'), { recursive: true })
    writeFileSync(join(dir, path), body)
  }
  write('packages/one/src/index.ts', 'export const one = 1\n')
  write('packages/two/src/index.ts', 'export const two = 2\n')
  write('packages/child/src/index.ts', 'export const child = 3\n')
  // A test that imports one package directly.
  write(
    'tests/direct-core.test.ts',
    [
      "import { test } from 'node:test'",
      "import { one } from '../packages/one/src/index.ts'",
      "test('direct', () => { if (one !== 1) throw new Error('no') })",
      '',
    ].join('\n'),
  )
  // A test whose dependency is only reached by a process it SPAWNS.
  write('spawned.mjs', "import('./packages/child/src/index.ts')\n")
  write(
    'tests/spawning.test.ts',
    [
      "import { spawnSync } from 'node:child_process'",
      "import { test } from 'node:test'",
      "test('spawning', () => {",
      "  const flags = ['--experimental-strip-types', '--no-warnings', 'spawned.mjs']",
      "  const r = spawnSync(process.execPath, flags, { encoding: 'utf8' })",
      '  if (r.status !== 0) throw new Error(r.stderr)',
      '})',
      '',
    ].join('\n'),
  )
  // A PATH-only child, which the builder must DERIVE rather than run: coverage reaches a child
  // through NODE_V8_COVERAGE, and these files exist to prove no such variable reaches theirs.
  write(
    'tests/direct-secrets.test.ts',
    [
      "import { test } from 'node:test'",
      // The helper is deliberately not named the way a real PATH-only child names its own: that
      // identifier is S-192's marker for one, and a fixture written inside this file would then
      // read as a PATH-only child sitting in the ordinary pool. The check caught exactly that.
      'function pathOnlyEnvironment() {',
      '  return { PATH: String(process.env.PATH) }',
      '}',
      "test('secrets', () => { pathOnlyEnvironment() })",
      '',
    ].join('\n'),
  )
  write('.gitignore', '.verification/\n')
  git(dir, 'init', '-q')
  git(dir, 'add', '-A')
  git(dir, 'commit', '-q', '-m', 'fixture')

  const built = spawnSync(process.execPath, [join(REPO, 'scripts', 'impact-map.mjs')], {
    cwd: dir,
    encoding: 'utf8',
    env: nested(),
    timeout: 120_000,
  })
  assert.equal(built.status, 0, `${built.stdout}${built.stderr}`)
  const map = JSON.parse(readFileSync(join(dir, '.verification', 'impact.json'), 'utf8'))

  assert.ok(
    map.covers['tests/direct-core.test.ts'].includes('packages/one/src/index.ts'),
    `an imported file was not recorded: ${JSON.stringify(map.covers)}`,
  )
  assert.ok(
    !map.covers['tests/direct-core.test.ts'].includes('packages/two/src/index.ts'),
    'a file nothing imported was recorded, so the map would select every test',
  )
  assert.ok(
    map.covers['tests/spawning.test.ts'].includes('packages/child/src/index.ts'),
    `a file loaded by a SPAWNED process was not recorded: ${JSON.stringify(map.covers['tests/spawning.test.ts'])}`,
  )

  // The PATH-only child is derived from its feature's siblings — `direct` here — so it covers
  // what they cover, without ever being run under coverage.
  assert.ok(
    map.covers['tests/direct-secrets.test.ts']?.includes('packages/one/src/index.ts'),
    `a derived child did not inherit its sibling's coverage: ${JSON.stringify(map.covers['tests/direct-secrets.test.ts'])}`,
  )
  assert.ok(
    !map.covers['tests/direct-secrets.test.ts']?.includes('packages/child/src/index.ts'),
    'a derived child inherited from a file that is not its sibling',
  )

  // And the selection built on it picks the tests that cover the changed file — the direct one,
  // and the PATH-only child that re-runs it.
  const chosen = selectTests(map, ['packages/one/src/index.ts'], {
    testFilesOnDisk: [
      'tests/direct-core.test.ts',
      'tests/direct-secrets.test.ts',
      'tests/spawning.test.ts',
    ],
  })
  assert.deepEqual(chosen.tests, ['tests/direct-core.test.ts', 'tests/direct-secrets.test.ts'])
})

test('8. the checker asks the map, and still owes the full run for its own pieces', () => {
  const dir = mkdtempSync(join(tmpdir(), 'impact-choose-'))
  made.push(dir)
  mkdirSync(join(dir, 'scripts'))
  for (const f of [
    'check.mjs',
    '_lib.mjs',
    '_verification.mjs',
    '_markup.mjs',
    '_pools.mjs',
    '_impact.mjs',
    'run-tests.mjs',
    'test-receipt.mjs',
    'drift.mjs',
    'decisions.mjs',
    'docs-check.mjs',
  ]) {
    copyFileSync(join(REPO, 'scripts', f), join(dir, 'scripts', f))
  }
  const write = (path: string, body: string) => {
    mkdirSync(join(dir, path, '..'), { recursive: true })
    writeFileSync(join(dir, path), body)
  }
  write('packages/one/src/index.ts', 'export const one = 1\n')
  write('tests/one.test.ts', "import { test } from 'node:test'\ntest('one', () => {})\n")
  write('tests/other.test.ts', "import { test } from 'node:test'\ntest('other', () => {})\n")
  write('JOURNAL.md', '# Journal\n')
  git(dir, 'init', '-q')
  git(dir, 'add', '-A')
  git(dir, 'commit', '-q', '-m', 'fixture')
  mkdirSync(join(dir, '.verification'), { recursive: true })
  writeFileSync(join(dir, '.verification', '.gitignore'), '*\n')
  writeFileSync(
    join(dir, '.verification', 'impact.json'),
    `${JSON.stringify(
      MAP({
        'tests/one.test.ts': ['packages/one/src/index.ts', 'tests/one.test.ts'],
        'tests/other.test.ts': ['tests/other.test.ts'],
      }),
    )}\n`,
  )

  const dryRun = (...flags: string[]) =>
    spawnSync(process.execPath, ['scripts/check.mjs', ...flags, '--dry-run'], {
      cwd: dir,
      encoding: 'utf8',
      env: nested(),
    })

  // A change the map can answer for: the slice shape, and only the covering test.
  writeFileSync(join(dir, 'packages/one/src/index.ts'), 'export const one = 2\n')
  const chosen = dryRun('--changed')
  assert.equal(chosen.status, 0, `${chosen.stdout}${chosen.stderr}`)
  assert.match(chosen.stdout, /the impact map chose 1 test file\(s\)/, chosen.stdout)
  assert.match(chosen.stdout, /tests\/one\.test\.ts/)
  assert.doesNotMatch(chosen.stdout, /tests\/other\.test\.ts/)
  assert.match(chosen.stdout, /would run {2}slice tests/)
  assert.match(chosen.stdout, /skipped {4}tests/, 'the aggregate suite was not skipped')

  // A piece of the checker itself: still the full run, and it says which piece.
  // Appended, not replaced: a module the checker imports must still load, or the run fails for
  // the wrong reason and the refusal under test never happens.
  appendFileSync(join(dir, 'scripts/_pools.mjs'), '\n// changed by the test\n')
  const refused = spawnSync(process.execPath, ['scripts/check.mjs', '--changed'], {
    cwd: dir,
    encoding: 'utf8',
    env: nested(),
  })
  assert.notEqual(refused.status, 0, 'a checker change was answered by the map')
  assert.match(`${refused.stdout}${refused.stderr}`, /verification infrastructure/)
})

test('9. a large selection runs through the two pools, a small one file by file', () => {
  // A broad selection is what a change to a shared package produces, and 110 files one at a time
  // cost 1361 s where the whole suite pooled costs 617 s (S-191's per-file table, S-192's pools).
  // So the step is the pooled runner above a threshold and the plain runner below it; either way
  // only the selected files run.
  const source = readFileSync(join(REPO, 'scripts', 'check.mjs'), 'utf8')
  assert.match(source, /tests\.length > 8/, 'no threshold between the two shapes of slice step')
  assert.match(
    source,
    /'scripts\/run-tests\.mjs', \.\.\.tests/,
    'a large slice does not use the pools',
  )
  assert.match(
    source,
    /'--test-concurrency=1', \.\.\.tests/,
    'a small slice no longer runs one file at a time',
  )

  // And the pooled runner really does honour a named set rather than running everything.
  const runner = readFileSync(join(REPO, 'scripts', 'run-tests.mjs'), 'utf8')
  assert.match(runner, /named\.length > 0 \? named : testFiles\(WHERE\)/)
})
