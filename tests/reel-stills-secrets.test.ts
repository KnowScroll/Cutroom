import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { basename } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { REPO } from './_repo.ts'

// reel-stills, Slice 5 — no secrets (docs/features/reel-stills.md, check 50, Gate 1: "It is proven
// by running the whole thing with no secrets in its surroundings"). Every other test of the journey
// is run again in a child process whose environment is PATH and nothing else this process holds —
// the restart checks' own worker processes included, since they inherit the child's environment.
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
const CHECKS = 49

/** PATH, under the name this process has it by — Windows keeps a variable's case as it was set. */
function bareEnvironment(): Record<string, string> {
  const key = Object.keys(process.env).find((k) => k.toUpperCase() === 'PATH')
  assert.ok(key !== undefined, 'this process has no PATH to hand on')
  return { PATH: process.env[key] as string }
}

test('50. every other test of the journey passes in a child process whose environment holds only PATH and what the operating system needs to start Node', () => {
  // A variable shaped like a key, set in this process: a child that inherited anything would see it.
  process.env.CUTROOM_TEST_API_KEY = 'sk-canary-not-a-real-key'
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
  assert.ok(
    !Object.values(seen).includes('sk-canary-not-a-real-key'),
    'the canary reached the child',
  )
  assert.ok(Object.keys(seen).length < Object.keys(process.env).length)

  // Every test of the journey but this file's, so the check never runs itself.
  const files = readdirSync(`${REPO}/tests`)
    .filter((f) => f.startsWith('reel-stills-') && f.endsWith('.test.ts') && f !== OWN)
    .sort()
    .map((f) => `tests/${f}`)
  assert.ok(files.length > 0)
  assert.ok(!files.some((f) => basename(f) === OWN))

  const suite = spawnSync(
    process.execPath,
    ['--experimental-strip-types', '--no-warnings', '--test', '--test-reporter=tap', ...files],
    { cwd: REPO, env, encoding: 'utf8', timeout: 300_000, maxBuffer: 32 * 1024 * 1024 },
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

  // Every check of the journey but this one ran and passed, and this one did not run.
  const passed = new Set([...out.matchAll(/^ok \d+ - (\d+)[.\s(]/gm)].map((m) => Number(m[1])))
  const checks = Array.from({ length: CHECKS }, (_, i) => i + 1)
  assert.deepEqual(
    checks.filter((n) => !passed.has(n)),
    [],
    'a check of the journey did not run, or did not pass, in the child',
  )
  assert.ok(!passed.has(CHECKS + 1), 'check 50 ran itself')
})
