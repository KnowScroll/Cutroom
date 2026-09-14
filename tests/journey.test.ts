import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, test } from 'node:test'
import { REPO } from './_repo.ts'

// scripts/journey.mjs marks a feature verified, so it is the one script whose mistakes read as
// proof. Each case builds a small git repository of its own — a feature file, a check script
// that passes or fails on command, a test named for the feature — and runs the journey against
// it with --repo. The journey never runs against this repository from here: its check runs these
// tests, which would run the journey again.

const made: string[] = []
after(() => {
  for (const dir of made) rmSync(dir, { recursive: true, force: true })
})

const APPROVED =
  'Gates: product APPROVED 2026-09-14 adversarial-reviewer · architecture APPROVED 2026-09-14 adversarial-reviewer · program-design APPROVED 2026-09-14 adversarial-reviewer · slices APPROVED 2026-09-14 adversarial-reviewer'

function feature(opts: { gates?: string; slices?: string; evidence?: string } = {}) {
  return [
    '---',
    'status: current',
    'authority: plan',
    '---',
    '',
    '# demo — a feature for the journey to judge',
    '',
    'Status: planned',
    opts.gates ?? APPROVED,
    '',
    '## Gate 4 — Slices',
    '',
    opts.slices ?? '- [x] **Slice 1 — one.** Proves: 1.\n- [x] **Slice 2 — two.** Proves: 2.',
    '',
    '## Evidence (newest first; appended by the journey, never typed by hand)',
    '',
    ...(opts.evidence === undefined ? [] : [opts.evidence, '']),
    '## Divergence (the first broken boundary, or "none")',
    '',
    'none',
    '',
    '## Pending human decisions',
    '',
    'None.',
    '',
  ].join('\n')
}

const CHECK_PASSES = "console.log('  ok    tests')\n"
const CHECK_FAILS = "console.log('  ok    lint')\nconsole.log('  FAIL  tests')\nprocess.exit(1)\n"
const TEST_PASSES =
  "import { test } from 'node:test'\ntest('demo holds', () => {})\ntest('demo still holds', () => {})\n"
const TEST_FAILS =
  "import { test } from 'node:test'\ntest('demo holds', () => {})\ntest('demo breaks', () => { throw new Error('no') })\n"

function git(cwd: string, ...args: string[]) {
  const r = spawnSync(
    'git',
    ['-c', 'user.name=journey-test', '-c', 'user.email=journey@test', ...args],
    { cwd, encoding: 'utf8' },
  )
  assert.equal(r.status, 0, `git ${args.join(' ')}: ${r.stderr}`)
  return r.stdout.trim()
}

function repo(
  opts: {
    text?: string
    check?: string
    tests?: Record<string, string>
    dirty?: boolean
  } = {},
) {
  const dir = mkdtempSync(join(tmpdir(), 'journey-'))
  made.push(dir)
  mkdirSync(join(dir, 'docs', 'features'), { recursive: true })
  mkdirSync(join(dir, 'scripts'))
  mkdirSync(join(dir, 'tests'))
  if (opts.text !== undefined) writeFileSync(join(dir, 'docs', 'features', 'demo.md'), opts.text)
  writeFileSync(join(dir, 'scripts', 'check.mjs'), opts.check ?? CHECK_PASSES)
  for (const [name, body] of Object.entries(opts.tests ?? { 'demo-one.test.ts': TEST_PASSES })) {
    writeFileSync(join(dir, 'tests', name), body)
  }
  git(dir, 'init', '-q')
  git(dir, 'add', '-A')
  git(dir, 'commit', '-q', '-m', 'fixture')
  if (opts.dirty) writeFileSync(join(dir, 'stray.txt'), 'not committed')
  return { dir, sha: git(dir, 'rev-parse', '--short', 'HEAD') }
}

function journey(dir: string, slug = 'demo') {
  const r = spawnSync(process.execPath, ['scripts/journey.mjs', slug, '--repo', dir], {
    cwd: REPO,
    encoding: 'utf8',
    env: { ...process.env, NO_COLOR: '1' },
  })
  return { status: r.status, out: `${r.stdout}${r.stderr}` }
}

const read = (dir: string) => readFileSync(join(dir, 'docs', 'features', 'demo.md'), 'utf8')
const today = () => new Date().toLocaleDateString('en-CA')
const section = (text: string, heading: string) =>
  (new RegExp(`^## ${heading}[^\\n]*\\n([\\s\\S]*?)(?=^## )`, 'm').exec(text)?.[1] ?? '').trim()

// ---------------------------------------------------------------- passing

test('a pass flips Status to verified and writes one evidence line naming the date, the commit and the tests', () => {
  const { dir, sha } = repo({ text: feature() })
  const r = journey(dir)
  assert.equal(r.status, 0, r.out)
  const text = read(dir)
  assert.match(text, /^Status: verified$/m)
  assert.equal(
    section(text, 'Evidence'),
    `- ${today()} journey=PASS at ${sha} — every check green; 2 tests in tests/demo-*.test.ts pass`,
  )
  assert.equal(section(text, 'Divergence'), 'none')
})

test('a second run adds its line above the first and removes nothing', () => {
  const old = '- 2026-01-01 journey=FAIL at 0000000 — an older run'
  const { dir } = repo({ text: feature({ evidence: old }) })
  assert.equal(journey(dir).status, 0)
  const lines = section(read(dir), 'Evidence').split('\n')
  assert.equal(lines.length, 2)
  assert.match(lines[0] as string, /journey=PASS/)
  assert.equal(lines[1], old, 'the earlier evidence line was changed or lost')
})

test("a pass keeps the file's CRLF line endings", () => {
  const { dir } = repo({ text: feature().replace(/\n/g, '\r\n') })
  assert.equal(journey(dir).status, 0)
  const text = read(dir)
  assert.equal(text.split('\r\n').length, text.split('\n').length, 'a bare LF was written')
  assert.match(text, /^Status: verified\r$/m)
})

// ---------------------------------------------------------------- failing

test('a red check is a FAIL: Status unchanged, Divergence names the failing check, evidence says so', () => {
  const { dir, sha } = repo({ text: feature(), check: CHECK_FAILS })
  const r = journey(dir)
  assert.equal(r.status, 1, r.out)
  const text = read(dir)
  assert.match(text, /^Status: planned$/m)
  assert.equal(section(text, 'Divergence'), "the check 'tests' failed")
  assert.equal(
    section(text, 'Evidence'),
    `- ${today()} journey=FAIL at ${sha} — the check 'tests' failed`,
  )
})

test('a failing test named for the feature is a FAIL even when the check says green', () => {
  const { dir } = repo({ text: feature(), tests: { 'demo-one.test.ts': TEST_FAILS } })
  const r = journey(dir)
  assert.equal(r.status, 1, r.out)
  const text = read(dir)
  assert.match(text, /^Status: planned$/m)
  assert.equal(
    section(text, 'Divergence'),
    "1 of 2 tests in tests/demo-*.test.ts fail, first 'demo breaks'",
  )
})

// ---------------------------------------------------------------- refusing

const refusals: Array<[string, Parameters<typeof repo>[0], RegExp]> = [
  ['there is no feature file', {}, /no feature file/],
  [
    'a gate is not approved',
    { text: feature({ gates: APPROVED.replace('slices APPROVED', 'slices CHANGES REQUIRED') }) },
    /gate 'slices' is not approved/,
  ],
  [
    'a slice is not ticked',
    { text: feature({ slices: '- [x] **Slice 1 — one.**\n- [ ] **Slice 2 — two.**' }) },
    /Slice 2 — two\. is not ticked/,
  ],
  ['the feature has no slices', { text: feature({ slices: 'none yet' }) }, /no slices/],
  [
    'no test is named for the feature',
    { text: feature(), tests: { 'other.test.ts': TEST_PASSES } },
    /no test file matches tests\/demo-\*\.test\.ts/,
  ],
  [
    'the working tree has uncommitted changes',
    { text: feature(), dirty: true },
    /uncommitted changes/,
  ],
]

for (const [why, opts, message] of refusals) {
  test(`it refuses, writes nothing and exits 2 when ${why}`, () => {
    const { dir } = repo(opts)
    const before = opts?.text === undefined ? undefined : read(dir)
    const r = journey(dir)
    assert.equal(r.status, 2, r.out)
    assert.match(r.out, message)
    if (before !== undefined) assert.equal(read(dir), before, 'a refused journey changed the file')
  })
}
