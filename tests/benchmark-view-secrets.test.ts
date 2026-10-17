import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { basename } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { REPO } from './_repo.ts'

// benchmark-view, Slice 4 — the feature's PATH-ONLY CHILD, in S-028's form, as
// `tests/yield-benchmark-secrets.test.ts` is: every other check of this feature passes in a
// child process whose environment holds only PATH and what the operating system needs to start
// Node. **It is NOT one of Gate 3's eighteen checks**: Gate 3's table of what this feature
// changes elsewhere asks for it by file name (`scripts/_pools.mjs:21`, "a new
// tests/benchmark-view-secrets.test.ts runs the feature's other test files with PATH alone"),
// and S-204 settles it as the THIRTEENTH such child. A check numbered 1 to 18 is somewhere in
// the four files this one runs, never here.
//
// WHY THIS FEATURE NEEDS IT. The page reads the record directly and serves what it finds, and
// the record holds raw model text; the loader's own module reaches `@cutroom/service` through
// neither import nor environment, but `scripts/_lib.mjs` and `scripts/benchmark.mjs` do, and
// this feature's checks drive both as children. A key read that returns NOTHING leaves a
// successful run looking identical to one that never read a key, so the only way to see the
// difference is to take every key away and watch every other check still pass.
//
// It skips nothing (S-111): the counts below are asserted, so a child that ran fewer files, or
// matched none, fails instead of reading as coverage.
//
// On Windows a child never starts with only what it is given: libuv copies these eleven
// variables from the parent into any environment that lacks them (S-028). None is a credential.
const WINDOWS_ADDED = [
  'HOMEDRIVE',
  'HOMEPATH',
  'LOGONSERVER',
  'PATH',
  'SYSTEMDRIVE',
  'SYSTEMROOT',
  'TEMP',
  'USERDOMAIN',
  'USERNAME',
  'USERPROFILE',
  'WINDIR',
]
const ALLOWED = process.platform === 'win32' ? WINDOWS_ADDED : ['PATH']

const OWN = basename(fileURLToPath(import.meta.url))

/** Gate 3's eighteen checks, over the four other files of this feature. */
const CHECKS = 18

/**
 * How long the child is given. The set holds four files that each start a local server on a
 * port the kernel names, parse a megabyte of vendored script with TypeScript's own parser, and
 * drive two scripts as children of their own.
 *
 * The bound is far above all of that on purpose, for the reason S-107 recorded: a check that
 * fails on load says nothing about the property it holds.
 */
const BOUND_MS = 600_000

/** The bait. Each is set in this process, asserted present here, and looked for in the child. */
const CANARIES = ['sk-canary-not-a-real-key', 'fal-canary-not-a-real-key']

/** PATH, under the name this process has it by — Windows keeps a variable's case as it was set. */
function bareEnvironment(): Record<string, string> {
  const key = Object.keys(process.env).find((k) => k.toUpperCase() === 'PATH')
  assert.ok(key !== undefined, 'this process has no PATH to hand on')
  return { PATH: process.env[key] as string }
}

// ---------------------------------------------------------------- the thirteenth child

test("every check of this feature passes in a child process whose environment holds only PATH and what the operating system needs to start Node, in S-028's form — NOT one of Gate 3's eighteen checks", () => {
  // Two variables shaped like a key, set in this process: a child that inherited anything would
  // see them. EACH IS ASSERTED PRESENT HERE BEFORE IT IS LOOKED FOR THERE — "the canary did not
  // reach the child" is true of a canary that was never set, so a sweep whose bait is missing
  // reads exactly like a sweep that found nothing (S-128).
  process.env.CUTROOM_TEST_API_KEY = 'sk-canary-not-a-real-key'
  process.env.CUTROOM_TEST_FAL_TOKEN = 'fal-canary-not-a-real-key'
  for (const canary of CANARIES) {
    assert.ok(
      Object.values(process.env).includes(canary),
      `the canary ${canary} is not in this process, so its absence from the child proves nothing`,
    )
  }
  const env = bareEnvironment()

  // What a child started with exactly this environment actually holds, read from inside it.
  const probe = spawnSync(
    process.execPath,
    ['-e', 'process.stdout.write(JSON.stringify(process.env))'],
    { cwd: REPO, env, encoding: 'utf8' },
  )
  assert.equal(probe.status, 0, probe.stderr)
  const seen = JSON.parse(probe.stdout) as Record<string, string>
  assert.deepEqual(
    Object.keys(seen).filter((k) => !ALLOWED.includes(k.toUpperCase())),
    [],
    'the child holds a variable beyond PATH and what the operating system needs',
  )
  for (const canary of CANARIES) {
    assert.ok(!Object.values(seen).includes(canary), `the canary ${canary} reached the child`)
  }
  assert.ok(Object.keys(seen).length < Object.keys(process.env).length)

  // Every test of this feature but this file's, so the check never runs itself.
  const files = readdirSync(`${REPO}/tests`)
    .filter((f) => f.startsWith('benchmark-view-') && f.endsWith('.test.ts') && f !== OWN)
    .sort()
    .map((f) => `tests/${f}`)
  assert.ok(files.length > 0)
  assert.ok(!files.some((f) => basename(f) === OWN))

  // Two files at a time, as `yield-benchmark`'s own child runs its five: the bound and the
  // concurrency are test support, every file still runs, and every assertion below is unchanged.
  const suite = spawnSync(
    process.execPath,
    [
      '--experimental-strip-types',
      '--no-warnings',
      '--test',
      '--test-reporter=tap',
      '--test-concurrency=2',
      ...files,
    ],
    { cwd: REPO, env, encoding: 'utf8', timeout: BOUND_MS, maxBuffer: 64 * 1024 * 1024 },
  )
  const out = `${suite.stdout}${suite.stderr}`
  const count = (name: string) => Number(new RegExp(`^# ${name} (\\d+)$`, 'm').exec(out)?.[1])
  const failing = [...out.matchAll(/^not ok \d+ - (.*)$/gm)].map((m) => m[1])
  assert.deepEqual(
    failing,
    [],
    `tests fail with no secrets in their environment:\n${out.slice(-4000)}`,
  )
  assert.equal(suite.status, 0, out.slice(-4000))
  assert.equal(count('fail'), 0)
  assert.equal(count('cancelled'), 0)
  assert.equal(count('skipped'), 0)
  assert.equal(count('todo'), 0)
  assert.ok(count('tests') > 0 && count('pass') === count('tests'), out.slice(-2000))

  // Every one of Gate 3's eighteen checks ran and passed in the child. A child that ran fewer
  // files, or matched none, would otherwise pass as green (S-028).
  const passed = new Set([...out.matchAll(/^ok \d+ - (\d+)[.\s(]/gm)].map((m) => Number(m[1])))
  const checks = Array.from({ length: CHECKS }, (_, i) => i + 1)
  assert.deepEqual(
    checks.filter((n) => !passed.has(n)),
    [],
    'a check of this feature did not run, or did not pass, in the child',
  )
})
