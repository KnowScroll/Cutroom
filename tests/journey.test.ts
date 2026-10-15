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

test("a pass leaves exactly one trailing newline when Divergence is the file's last section", () => {
  // Regression for the prompt-073 re-journey FAIL: when Divergence is the last section in the feature
  // file (as in `docs/features/cutroom-sdk.md`), the journey's Divergence replacement would otherwise
  // append `\n\n`, leaving a trailing blank line that `prettier --check` rejects. The journey must
  // preserve the file's format invariant no matter where Divergence lives.
  const lastSection = feature().replace(/\n## Pending human decisions\n\nNone\.\n$/, '\n')
  assert.ok(
    lastSection.endsWith('none\n\n'),
    `the fixture must end after Divergence: ${JSON.stringify(lastSection.slice(-20))}`,
  )
  const { dir } = repo({ text: lastSection })
  assert.equal(journey(dir).status, 0)
  const text = read(dir)
  assert.match(text, /^Status: verified$/m)
  assert.ok(
    text.endsWith('none\n'),
    `the file must end with one trailing newline: ${JSON.stringify(text.slice(-10))}`,
  )
  assert.ok(!text.endsWith('none\n\n'), 'a trailing blank line would fail prettier --check')
})

test("a FAIL leaves exactly one trailing newline when Divergence is the file's last section", () => {
  // Same invariant under FAIL: the Divergence replacement must not leave a trailing blank line.
  const lastSection = feature().replace(/\n## Pending human decisions\n\nNone\.\n$/, '\n')
  const { dir } = repo({ text: lastSection, check: CHECK_FAILS })
  assert.equal(journey(dir).status, 1)
  const text = read(dir)
  assert.match(text, /^Status: planned$/m)
  assert.ok(
    text.endsWith('failed\n'),
    `the file must end with one trailing newline: ${JSON.stringify(text.slice(-15))}`,
  )
  assert.ok(!text.endsWith('failed\n\n'), 'a trailing blank line would fail prettier --check')
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

// ---------------------------------------------------------------- reusing a recorded run (S-188)
//
// The journey may rest on the receipt a full check run wrote, and must not rest on anything less.
// Each case plants a receipt in the scratch repository and watches what the journey invokes: the
// stub check.mjs appends its arguments to a file, so "nothing re-runs" is observable, and the
// planted test count (7) differs from what the feature's tests really number (2), so an evidence
// line saying 7 proves the count came from the recording and not from a second run.

const CHECK_RECORDS = [
  "import { appendFileSync } from 'node:fs'",
  "appendFileSync('check-calls.txt', `${process.argv.slice(2).join(' ')}\n`)",
  "console.log('  ok    tests')",
  '',
].join('\n')

const CHECK_RECORDS_FAILING = [
  "import { appendFileSync } from 'node:fs'",
  "appendFileSync('check-calls.txt', `${process.argv.slice(2).join(' ')}\n`)",
  "console.log('  FAIL  format')",
  'process.exit(1)',
  '',
].join('\n')

/** A green full-run receipt naming the feature's one test file with seven passing tests. */
function receipt(tree: string, over: Record<string, unknown> = {}) {
  return JSON.stringify({
    receipt: 1,
    mode: 'full',
    ok: true,
    testedTree: tree,
    checks: [{ label: 'tests', ok: true, ms: 1 }],
    tests: { ok: true, total: 7, files: { 'tests/demo-one.test.ts': { pass: 7, fail: 0 } } },
    ...over,
  })
}

function plant(dir: string, body: string) {
  mkdirSync(join(dir, '.verification'), { recursive: true })
  writeFileSync(join(dir, '.verification', 'receipt.json'), body)
}

const tree = (dir: string) => git(dir, 'rev-parse', 'HEAD^{tree}')
const calls = (dir: string) => {
  try {
    return readFileSync(join(dir, 'check-calls.txt'), 'utf8').trim().split('\n')
  } catch {
    return []
  }
}

/** Commit a Markdown document, so HEAD's tree differs from the recorded one in documents alone. */
function commitDocument(dir: string, name = 'docs/note.md') {
  mkdirSync(join(dir, 'docs'), { recursive: true })
  writeFileSync(join(dir, name), '# a note\n')
  git(dir, 'add', '-A')
  git(dir, 'commit', '-q', '-m', 'a document')
}

test('a green full run recorded for this exact tree is reused, and nothing re-runs', () => {
  const { dir, sha } = repo({ text: feature(), check: CHECK_RECORDS })
  plant(dir, receipt(tree(dir)))
  const r = journey(dir)
  assert.equal(r.status, 0, r.out)
  assert.deepEqual(calls(dir), [], 'check.mjs ran although the recording covered this tree')
  assert.equal(
    section(read(dir), 'Evidence'),
    `- ${today()} journey=PASS at ${sha} — every check green; 7 tests in tests/demo-*.test.ts pass — from the full run recorded for this exact tree`,
  )
})

test('a tree differing only in documents re-runs the document checks and nothing else', () => {
  const { dir } = repo({ text: feature(), check: CHECK_RECORDS })
  const recorded = tree(dir)
  plant(dir, receipt(recorded))
  commitDocument(dir)
  const sha = git(dir, 'rev-parse', '--short', 'HEAD')
  const r = journey(dir)
  assert.equal(r.status, 0, r.out)
  assert.deepEqual(calls(dir), ['--documents'], 'the full suite ran for a document-only difference')
  assert.equal(
    section(read(dir), 'Evidence'),
    `- ${today()} journey=PASS at ${sha} — every check green; 7 tests in tests/demo-*.test.ts pass — document checks re-run; the rest from the full run recorded at ${recorded.slice(0, 7)}, which differs only in documents`,
  )
})

test('a red document check is a FAIL even when the rest of the run is reused', () => {
  const { dir } = repo({ text: feature(), check: CHECK_RECORDS_FAILING })
  plant(dir, receipt(tree(dir)))
  commitDocument(dir)
  const r = journey(dir)
  assert.equal(r.status, 1, r.out)
  const text = read(dir)
  assert.match(text, /^Status: planned$/m)
  assert.equal(section(text, 'Divergence'), "the check 'format' failed")
})

const notReusable: Array<[string, (dir: string) => void]> = [
  [
    'a path of code differs from the recorded run',
    (dir) => {
      writeFileSync(join(dir, 'tests', 'demo-one.test.ts'), `${TEST_PASSES}\n`)
      git(dir, 'add', '-A')
      git(dir, 'commit', '-q', '-m', 'a code change')
    },
  ],
  ['the recorded run was targeted, not full', () => {}],
  ['the recorded run was not green', () => {}],
  ['the receipt cannot be read', () => {}],
]

test('a recorded run that does not cover this tree is not reused: every check runs again', () => {
  for (const [why, change] of notReusable) {
    const { dir } = repo({ text: feature(), check: CHECK_RECORDS })
    const body = why.includes('targeted')
      ? receipt(tree(dir), { mode: 'targeted' })
      : why.includes('not green')
        ? receipt(tree(dir), { ok: false })
        : why.includes('cannot be read')
          ? '{ not json'
          : receipt(tree(dir))
    plant(dir, body)
    change(dir)
    const r = journey(dir)
    assert.equal(r.status, 0, `${why}: ${r.out}`)
    assert.deepEqual(calls(dir), [''], `${why}: the full check did not run`)
    assert.match(
      section(read(dir), 'Evidence'),
      /every check green; 2 tests in tests\/demo-\*\.test\.ts pass$/,
      `${why}: the count did not come from a real run of the feature's tests`,
    )
  }
})

test('after a full run the count comes from the receipt that run wrote, not from a second run', () => {
  // The feature's two tests were already run by the suite. Re-running them is what S-188 removes,
  // so a check.mjs that records seven must leave an evidence line saying seven.
  const { dir, sha } = repo({
    text: feature(),
    check: [
      "import { mkdirSync, writeFileSync } from 'node:fs'",
      "import { execFileSync } from 'node:child_process'",
      "const tree = execFileSync('git', ['rev-parse', 'HEAD^{tree}'], { encoding: 'utf8' }).trim()",
      "mkdirSync('.verification', { recursive: true })",
      "writeFileSync('.verification/receipt.json', JSON.stringify({ receipt: 1, mode: 'full', ok: true, testedTree: tree, checks: [{ label: 'tests', ok: true, ms: 1 }], tests: { ok: true, total: 7, files: { 'tests/demo-one.test.ts': { pass: 7, fail: 0 } } } }))",
      "console.log('  ok    tests')",
      '',
    ].join('\n'),
  })
  const r = journey(dir)
  assert.equal(r.status, 0, r.out)
  assert.equal(
    section(read(dir), 'Evidence'),
    `- ${today()} journey=PASS at ${sha} — every check green; 7 tests in tests/demo-*.test.ts pass`,
  )
})
