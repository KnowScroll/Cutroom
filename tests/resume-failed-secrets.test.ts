import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { basename } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { REPO } from './_repo.ts'

// resume-failed, Slice 7 — check 44 (docs/features/resume-failed.md), in S-028's form, as every
// other feature's own: every other test of this feature passes in a child process whose environment
// holds only PATH and what the operating system needs to start Node. This feature IS the engine's
// resume: the thing to prove about its own tests is that none of them needs a key or an inherited
// secret to do it. Every run here is on the stand-in, every worker is handed recorded wire, and the
// only adapter the suite ever reaches is ffmpeg on that PATH (S-111, S-163, S-096). Checks 41 and 42
// live in paid-path's resume-reel test file (paid-path's check 20 is the only file allowed to name
// the script that spends — the engine's resume preview and confirmation, S-162, S-163); they are
// covered by `paid-path-secrets`'s check 22, not here. The roll call here is checks 1 to 40, then
// check 43.
//
// On Windows a child never starts with only what it is given: libuv — the layer Node spawns through
// — copies these eleven variables from the parent into any environment that lacks them (S-028).
// They name the machine, the user or a folder — none is a credential. Elsewhere nothing is added.
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

/** The checks of the journey this one runs: every one but its own number and the two that live in
 * paid-path's resume-reel test file (paid-path's check 20 is the only file allowed to name the
 * script that spends — the engine's resume preview and confirmation, S-162, S-163). The roll call
 * here is checks 1 to 40, then check 43 — 41 numbers in all. */
const CHECKS = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27,
  28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 43,
]
const SELF = 44

/**
 * How long the child is given. This feature's worker checks start the engine with the stand-in many
 * times, and the whole set runs in under two minutes on this machine.
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

// ---------------------------------------------------------------- 44

test('44. every other test of this feature passes in a child process whose environment holds only PATH and what the operating system needs to start Node', () => {
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

  // Every test of this feature but this file's, so the check never runs itself. Discovered at
  // runtime — no hand-maintained list and no hole.
  const files = readdirSync(`${REPO}/tests`)
    .filter((f) => f.startsWith('resume-failed-') && f.endsWith('.test.ts') && f !== OWN)
    .sort()
    .map((f) => `tests/${f}`)
  assert.ok(files.length > 0)
  assert.ok(!files.some((f) => basename(f) === OWN))

  // Two files at a time, as second-ask's check 9 and three-pictures' check 13 run theirs: this
  // feature's worker checks start the engine with the stand-in once each, and the harness spins up
  // the API and the worker together. The bound and the concurrency are test support: every file
  // still runs, and every assertion below is unchanged.
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
  assert.deepEqual(
    CHECKS.filter((n) => !passed.has(n)),
    [],
    'a check of this feature did not run, or did not pass, in the child',
  )
  assert.ok(!passed.has(SELF), 'check 44 ran itself')
})
