import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { basename } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { REPO } from './_repo.ts'

// paid-path, Slice 8 — check 22 (docs/features/paid-path.md), in S-028's form: every other test of
// this feature passes in a child process whose environment holds only PATH and what the operating
// system needs to start Node — the probe, the canary, the allowed names, and the roll call.
//
// THIS IS THE FEATURE THAT INTRODUCES KEYS, and it is the one that most needs this check. Checks 26
// and 50 cover `reel-takes` and `reel-render`, and the gate review found that nothing would have
// proven that the feature which reads `MINIMAX_API_KEY` and `FAL_KEY` needs neither: every adapter
// here is tested against recorded wire served on loopback, every provider setting defaults to the
// stand-in, and the only thing that spends is a script no test names (S-108, S-111, check 20).
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
const CHECKS = 21

/**
 * How long the child is given. **Measured alone on this machine on 2026-09-21: 52 seconds** for
 * this feature's own tests, four files at a time, with the service processes and loopback wire
 * servers they start.
 *
 * The bound is roughly six times that, and the headroom is deliberate: `reel-render`'s check 50
 * takes 97 s alone and was killed once at a 300 s bound INSIDE A LOADED SUITE (S-107, session 41).
 * This child runs beside that one. A bound that fits the measurement is a bound that fails when
 * the machine is busy, and a check that fails on load says nothing about the property it holds.
 */
const BOUND_MS = 360_000

/** The bait. Each is set in this process, asserted present here, and looked for in the child. */
const CANARIES = ['sk-canary-not-a-real-key', 'fal-canary-not-a-real-key']

/** PATH, under the name this process has it by — Windows keeps a variable's case as it was set. */
function bareEnvironment(): Record<string, string> {
  const key = Object.keys(process.env).find((k) => k.toUpperCase() === 'PATH')
  assert.ok(key !== undefined, 'this process has no PATH to hand on')
  return { PATH: process.env[key] as string }
}

// ---------------------------------------------------------------- 22

test('22. every other test of this feature passes in a child process whose environment holds only PATH and what the operating system needs to start Node', () => {
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
    .filter((f) => f.startsWith('paid-path-') && f.endsWith('.test.ts') && f !== OWN)
    .sort()
    .map((f) => `tests/${f}`)
  assert.ok(files.length > 0)
  assert.ok(!files.some((f) => basename(f) === OWN))

  // Four files at a time, as checks 26 and 50 run theirs: this feature's own tests start three
  // service processes, a loopback wire server each, and an ffmpeg for every measure a sensor
  // takes — and this child runs beside the whole suite. The bound and the concurrency are test
  // support: every file still runs, and every assertion below is unchanged.
  const suite = spawnSync(
    process.execPath,
    [
      '--experimental-strip-types',
      '--no-warnings',
      '--test',
      '--test-reporter=tap',
      '--test-concurrency=4',
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
  assert.ok(!passed.has(CHECKS + 1), 'check 22 ran itself')
})
