import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { basename } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { REPO } from './_repo.ts'

// second-ask, Slice 3 — check 9 (docs/features/second-ask.md), in S-028's form: every other
// test of this feature passes in a child process whose environment holds only PATH and what the
// operating system needs to start Node — the probe, the canary, the allowed names, and the roll
// call.
//
// THIS FEATURE ASKS A MODEL AGAIN, so the thing to prove about its own tests is that none of them
// can reach one: every ask is answered by a hand-written port or the stand-in, and nothing reads a
// key (S-111, S-028). A test that quietly picked a real key out of the environment would be a test
// that could call a provider, and this is what says none does.
//
// On Windows a child never starts with only what it is given: libuv, which Node spawns through,
// copies these eleven variables from the parent into any environment that lacks them (S-028). They
// are what the operating system needs to start Node there, and all of them name the machine, the
// user or a folder — none is a credential. Elsewhere nothing is added.
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

/** The checks of the journey this one runs: every one but its own number. */
const CHECKS = 8

/**
 * How long the child is given. This feature's worker checks start the engine with the stand-in six
 * times, and the whole set runs in a minute or two.
 *
 * The bound is far above that on purpose, for the reason S-107 recorded: `reel-render`'s check 50
 * takes 97 s alone and was killed once at a 300 s bound INSIDE A LOADED SUITE, and this child runs
 * beside it. A bound that fits the measurement is a bound that fails when the machine is busy, and
 * a check that fails on load says nothing about the property it holds.
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

// ---------------------------------------------------------------- 9

test('9. every other test of this feature passes in a child process whose environment holds only PATH and what the operating system needs to start Node', () => {
  // Two variables shaped like a key, set in this process: a child that inherited anything would
  // see them. One of them is spelled the way this feature's own adapters read a key, which is the
  // shape that would actually matter here (S-109, `packages/providers/src/env.ts`).
  //
  // EACH IS ASSERTED PRESENT HERE BEFORE IT IS LOOKED FOR THERE. "The canary did not reach the
  // child" is true of a canary that was never set, so a sweep whose bait is missing reads exactly
  // like a sweep that found nothing — and a break that deleted these two lines passed every other
  // assertion in this test (S-128).
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
    .filter((f) => f.startsWith('second-ask-') && f.endsWith('.test.ts') && f !== OWN)
    .sort()
    .map((f) => `tests/${f}`)
  assert.ok(files.length > 0)
  assert.ok(!files.some((f) => basename(f) === OWN))

  // Two files at a time, as paid-failures' check 12 runs its four. The bound and the concurrency are
  // test support: every file still runs, and every assertion below is unchanged.
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
    { cwd: REPO, env, encoding: 'utf8', timeout: BOUND_MS, maxBuffer: 32 * 1024 * 1024 },
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

  // Every check of this feature but this one ran and passed, and this one did not run. A child
  // that ran fewer files, or matched none, would otherwise pass as green (S-028).
  const passed = new Set([...out.matchAll(/^ok \d+ - (\d+)[.\s(]/gm)].map((m) => Number(m[1])))
  const checks = Array.from({ length: CHECKS }, (_, i) => i + 1)
  assert.deepEqual(
    checks.filter((n) => !passed.has(n)),
    [],
    'a check of this feature did not run, or did not pass, in the child',
  )
  assert.ok(!passed.has(CHECKS + 1), 'check 9 ran itself')
})
