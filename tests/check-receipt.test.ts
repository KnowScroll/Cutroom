import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { after, test } from 'node:test'
import { REPO } from './_repo.ts'
import {
  carryVerdict,
  evidenceTrailer,
  isDocument,
  readFullReceipt,
  readReceipt,
  reuseVerdict,
  testedTree,
  treeDelta,
  writeReceipt,
} from '../scripts/_verification.mjs'

// S-188 lets a journey rest on a run it did not watch, so the receipt is the only thing standing
// between "it passed here" and "it passed at this content". Three properties carry that weight:
// the tree a run records is the content it saw even when the working tree was dirty; a test is
// attributed to the file it came from, which Node's own reporters do not do; and a receipt that
// does not cover this feature at this tree is refused rather than believed.

const made: string[] = []
after(() => {
  for (const dir of made) rmSync(dir, { recursive: true, force: true })
})

function git(cwd: string, ...args: string[]) {
  const r = spawnSync(
    'git',
    ['-c', 'user.name=receipt-test', '-c', 'user.email=receipt@test', ...args],
    { cwd, encoding: 'utf8' },
  )
  assert.equal(r.status, 0, `git ${args.join(' ')}: ${r.stderr}`)
  return r.stdout.trim()
}

/**
 * The environment a nested `node --test` needs: NODE_TEST_CONTEXT is set while this file runs
 * under a runner, and a child that inherits it reports to that runner instead of to its own
 * reporters — so the reporter under test would write nothing. Same trap as scripts/journey.mjs.
 */
function nested() {
  const env: NodeJS.ProcessEnv = { ...process.env, NO_COLOR: '1' }
  delete env.NODE_TEST_CONTEXT
  return env
}

function repo(files: Record<string, string> = { 'a.txt': 'one\n' }) {
  const dir = mkdtempSync(join(tmpdir(), 'receipt-'))
  made.push(dir)
  for (const [name, body] of Object.entries(files)) writeFileSync(join(dir, name), body)
  git(dir, 'init', '-q')
  git(dir, 'add', '-A')
  git(dir, 'commit', '-q', '-m', 'fixture')
  return dir
}

// ---------------------------------------------------------------- the tree a run records

test('a clean working tree records the tree at HEAD', () => {
  const dir = repo()
  assert.equal(testedTree(dir), git(dir, 'rev-parse', 'HEAD^{tree}'))
})

test('a dirty working tree records the tree the commit of that content writes', () => {
  // The run that matters happens before the commit: static checks and the suite see the working
  // copy. If the receipt named HEAD's tree instead, every full run followed by a commit would
  // record content it never saw — the one way this mechanism could lie.
  const dir = repo()
  writeFileSync(join(dir, 'a.txt'), 'changed\n')
  writeFileSync(join(dir, 'b.txt'), 'new\n')
  const recorded = testedTree(dir)
  git(dir, 'add', '-A')
  git(dir, 'commit', '-q', '-m', 'the content that ran')
  assert.equal(recorded, git(dir, 'rev-parse', 'HEAD^{tree}'))
})

test('the tree is recorded in a repository that ignores the receipt folder, which is every real one', () => {
  // Found by running it here: with the exclusion as the only pathspec, git reads it as a path to
  // add, hints that it is ignored and exits 1, so nothing was recorded — in THIS repository, where
  // `.gitignore` names `.verification/`, while every fixture above passed because a scratch
  // repository ignores nothing. A receipt without a tree is a receipt no journey can ever reuse.
  const dir = repo({ 'a.txt': 'one\n', '.gitignore': '.verification/\n' })
  mkdirSync(join(dir, '.verification'), { recursive: true })
  writeFileSync(join(dir, '.verification', 'receipt.json'), '{}\n')
  writeFileSync(join(dir, 'a.txt'), 'changed\n')
  const recorded = testedTree(dir)
  assert.ok(
    typeof recorded === 'string' && recorded.length === 40,
    `no tree was recorded: ${String(recorded)}`,
  )
  git(dir, 'add', '-A')
  git(dir, 'commit', '-q', '-m', 'the content that ran')
  assert.equal(recorded, git(dir, 'rev-parse', 'HEAD^{tree}'))
  assert.equal(git(dir, 'ls-files', '.verification'), '', 'the receipt folder was committed')
})

test('recording the tree stages nothing in the repository being checked', () => {
  const dir = repo()
  writeFileSync(join(dir, 'a.txt'), 'changed\n')
  writeFileSync(join(dir, 'b.txt'), 'new\n')
  testedTree(dir)
  assert.equal(git(dir, 'diff', '--cached', '--name-only'), '', 'the throwaway index leaked')
  assert.equal(git(dir, 'status', '--porcelain', '--untracked-files=all').split('\n').length, 2)
})

test('a tree delta names the paths that differ, and nothing else', () => {
  const dir = repo({ 'a.txt': 'one\n', 'docs.md': '# doc\n' })
  const before = git(dir, 'rev-parse', 'HEAD^{tree}')
  writeFileSync(join(dir, 'docs.md'), '# doc, edited\n')
  git(dir, 'add', '-A')
  git(dir, 'commit', '-q', '-m', 'edit the document')
  assert.deepEqual(treeDelta(dir, before, git(dir, 'rev-parse', 'HEAD^{tree}')), ['docs.md'])
})

// ---------------------------------------------------------------- the full run keeps its own file

test('a full run writes the reusable receipt, and a later run of another mode leaves it alone', () => {
  // Found on the first real use, 2026-10-15: the documents-only `--changed` run that precedes a
  // journey's evidence commit overwrote the full receipt, so the next journey in the chain found a
  // `documents` record where the reusable one had been — the saving gone in exactly the chain it
  // was built for. Only a full run may touch the full receipt.
  const dir = repo()
  const full = {
    mode: 'full' as const,
    ok: true,
    testedTree: 'a'.repeat(40),
    tests: { ok: true, files: { 'tests/demo-one.test.ts': { pass: 3, fail: 0 } } },
  }
  writeReceipt(dir, full)
  writeReceipt(dir, { mode: 'documents', ok: true, testedTree: 'b'.repeat(40) })
  writeReceipt(dir, { mode: 'targeted', ok: true, testedTree: 'c'.repeat(40) })
  assert.equal(readReceipt(dir)?.mode, 'targeted', 'the latest run is not recorded')
  const reusable = readFullReceipt(dir)
  assert.equal(reusable?.mode, 'full')
  assert.equal(reusable?.testedTree, 'a'.repeat(40), 'the full receipt was overwritten')
  assert.deepEqual(reusable?.tests?.files, full.tests.files)
})

// ---------------------------------------------------------------- per-file attribution

test('the receipt reporter says which file each test came from', () => {
  // Node 22.14's tap and junit reporters print one flat stream for several files: measured
  // 2026-10-15, and the reason this reporter exists. Without attribution the receipt could not
  // say that THIS feature's tests passed, and reuse would be a claim about the suite as a whole.
  const dir = mkdtempSync(join(tmpdir(), 'reporter-'))
  made.push(dir)
  writeFileSync(
    join(dir, 'demo-one.test.ts'),
    "import { test } from 'node:test'\ntest('a', () => {})\ntest('b', () => {})\n",
  )
  writeFileSync(
    join(dir, 'demo-two.test.ts'),
    "import { test } from 'node:test'\ntest('c', () => {})\ntest('d', () => { throw new Error('no') })\n",
  )
  const out = join(dir, 'tests.json')
  spawnSync(
    process.execPath,
    [
      '--experimental-strip-types',
      '--no-warnings',
      '--test',
      `--test-reporter=${pathToFileURL(join(REPO, 'scripts', 'test-receipt.mjs')).href}`,
      `--test-reporter-destination=${out}`,
      'demo-one.test.ts',
      'demo-two.test.ts',
    ],
    { cwd: dir, encoding: 'utf8', env: nested() },
  )
  const receipt = JSON.parse(readFileSync(out, 'utf8'))
  assert.deepEqual(receipt.files['demo-one.test.ts'], { pass: 2, fail: 0 })
  assert.deepEqual(receipt.files['demo-two.test.ts'], { pass: 1, fail: 1 })
  assert.equal(receipt.total, 4)
  assert.equal(receipt.fail, 1)
})

// ---------------------------------------------------------------- what may be reused

const GREEN = {
  receipt: 1,
  mode: 'full',
  ok: true,
  testedTree: 'f'.repeat(40),
  checks: [{ label: 'tests', ok: true, ms: 1 }],
  tests: { ok: true, total: 9, files: { 'tests/demo-one.test.ts': { pass: 5, fail: 0 } } },
}
const ASKED = { headTree: 'e'.repeat(40), testFiles: ['tests/demo-one.test.ts'] }

test('a green full run at this exact tree is reused whole', () => {
  const verdict = reuseVerdict({ ...ASKED, receipt: GREEN, delta: [] })
  assert.equal(verdict.kind, 'exact')
  assert.equal(verdict.total, 5, "the count is the feature's own tests, not the suite's")
})

test('a delta of documents alone is reused, and names what differs', () => {
  const delta = ['docs/features/demo.md', 'JOURNAL.md']
  const verdict = reuseVerdict({ ...ASKED, receipt: GREEN, delta })
  assert.equal(verdict.kind, 'documents')
  assert.deepEqual(verdict.delta, delta)
})

const refused: Array<[string, Parameters<typeof reuseVerdict>[0], RegExp]> = [
  ['there is no receipt', { ...ASKED, receipt: undefined, delta: [] }, /no receipt/],
  [
    'the receipt is of another version',
    { ...ASKED, receipt: { ...GREEN, receipt: 2 }, delta: [] },
    /version 2/,
  ],
  [
    'the recorded run was targeted, not full',
    { ...ASKED, receipt: { ...GREEN, mode: 'targeted' }, delta: [] },
    /'targeted', not a full run/,
  ],
  [
    'the recorded run was not green',
    { ...ASKED, receipt: { ...GREEN, ok: false }, delta: [] },
    /not green/,
  ],
  [
    'the recorded run named no tree',
    { ...ASKED, receipt: { ...GREEN, testedTree: undefined }, delta: [] },
    /names no tree/,
  ],
  [
    'the recorded run recorded no tests',
    { ...ASKED, receipt: { ...GREEN, tests: undefined }, delta: [] },
    /no passing test run/,
  ],
  [
    "the recorded run does not name this feature's test file",
    { ...ASKED, receipt: GREEN, delta: [], testFiles: ['tests/demo-two.test.ts'] },
    /does not name tests\/demo-two\.test\.ts/,
  ],
  [
    "the feature's test file failed in the recorded run",
    {
      ...ASKED,
      receipt: {
        ...GREEN,
        tests: { ok: true, files: { 'tests/demo-one.test.ts': { pass: 4, fail: 1 } } },
      },
      delta: [],
    },
    /failed in the recorded run/,
  ],
  [
    "the feature's test file ran nothing in the recorded run",
    {
      ...ASKED,
      receipt: {
        ...GREEN,
        tests: { ok: true, files: { 'tests/demo-one.test.ts': { pass: 0, fail: 0 } } },
      },
      delta: [],
    },
    /ran no test in the recorded run/,
  ],
  [
    'a path of code differs from the recorded run',
    { ...ASKED, receipt: GREEN, delta: ['docs/features/demo.md', 'packages/pipeline/src/plan.ts'] },
    /packages\/pipeline\/src\/plan\.ts differs/,
  ],
  [
    'an unclassified path differs from the recorded run',
    { ...ASKED, receipt: GREEN, delta: ['something-new.yaml'] },
    /something-new\.yaml differs/,
  ],
  [
    'git could not compare the trees',
    { ...ASKED, receipt: GREEN, delta: undefined },
    /could not compare/,
  ],
]

for (const [why, asked, message] of refused) {
  test(`a recorded run is refused when ${why}`, () => {
    const verdict = reuseVerdict(asked)
    assert.equal(verdict.kind, 'none', `reuse was allowed: ${JSON.stringify(verdict)}`)
    assert.match(verdict.why as string, message)
  })
}

// ---------------------------------------------------------------- one list, two readers

test('one document list serves check.mjs and the reuse verdict', () => {
  // A second copy of the list is the drift this mechanism cannot survive: a path check.mjs treats
  // as code while the reuse verdict treats it as a document would reuse a run that never saw it.
  const source = readFileSync(join(REPO, 'scripts', 'check.mjs'), 'utf8')
  assert.match(source, /import \{[\s\S]*?DOCUMENT,[\s\S]*?\} from '\.\/_verification\.mjs'/)
  assert.doesNotMatch(source, /^const DOCUMENT = \[/m, 'check.mjs grew its own document list')
  assert.ok(isDocument('docs/features/demo.md'))
  assert.ok(isDocument('JOURNAL.md'))
  // S-193: Markdown is a document wherever it lives, including prose that used to be unclassified.
  assert.ok(isDocument('.claude/agents/check-runner.md'))
  assert.ok(isDocument('.claude/skills/checks/SKILL.md'))
  assert.ok(isDocument('packages/sdk/README.md'))
  assert.ok(isDocument('steering-ref/steering/DECISIONS.md'))
  // And nothing that executes becomes one, whatever folder of prose it sits beside.
  assert.ok(!isDocument('packages/pipeline/src/plan.ts'))
  assert.ok(!isDocument('docs/features/demo.ts'))
  assert.ok(!isDocument('.claude/settings.json'))
  assert.ok(!isDocument('.claude/hooks/stop-gate.sh'))
  assert.ok(!isDocument('docs/notes.md.ts'))
})

// ---------------------------------------------------------------- the mode a journey calls

test('--documents runs what a document can fail and skips the suite', () => {
  const r = spawnSync(process.execPath, ['scripts/check.mjs', '--documents', '--dry-run'], {
    cwd: REPO,
    encoding: 'utf8',
    env: { ...process.env, NO_COLOR: '1' },
  })
  assert.equal(r.status, 0, `${r.stdout}${r.stderr}`)
  const would = [...r.stdout.matchAll(/^\s*would run\s+(.+?)\s*$/gm)].map((m) => m[1])
  // S-189: `markup` is prettier over ALL Markdown, YAML and HTML — not narrowed to what differs
  // from HEAD, because a journey resting on a recorded run has a clean tree and the narrowed set
  // would be empty, which is green for the wrong reason.
  assert.deepEqual(would, ['markup', 'scans', 'decisions pin', 'copied docs'])
  assert.match(r.stdout, /^\s*skipped\s+tests$/m)
})

// ---------------------------------------------------------------- the evidence a run IS

test('S-213. full evidence names the tree; targeted evidence must name its test files', () => {
  // The checker writes the trailer rather than leaving it to be typed (S-212's "still owed"), so
  // what it may write is a property of its own: the two shapes every commit in this repository
  // carries, and nothing scripts/verification-status.mjs would refuse.
  const tree = 'a'.repeat(40)
  assert.equal(
    evidenceTrailer({ mode: 'full', tree, tests: ['tests/demo-one.test.ts'] }),
    `Verification: full\nVerification-Tree: ${tree}`,
    'a full run named test files, which no full commit here carries',
  )
  assert.equal(
    evidenceTrailer({
      mode: 'targeted',
      tree,
      tests: ['tests/line-endings.test.ts', 'tests/context-file.test.ts'],
    }),
    `Verification: targeted\nVerification-Tree: ${tree}\nVerification-Tests: tests/line-endings.test.ts tests/context-file.test.ts`,
  )
})

const noTrailer: Array<[string, Parameters<typeof evidenceTrailer>[0]]> = [
  // The first is exactly what scripts/verification-status.mjs:31 fails on: the checker prints
  // nothing rather than a trailer the recorder would reject.
  ['targeted evidence names no test file', { mode: 'targeted', tree: 'b'.repeat(40), tests: [] }],
  ['no tree was recorded', { mode: 'full', tree: undefined, tests: [] }],
  ['the run was --code', { mode: 'code', tree: 'c'.repeat(40), tests: [] }],
  [
    'the mode is one no recorder accepts',
    { mode: 'documents', tree: 'd'.repeat(40), tests: ['tests/line-endings.test.ts'] },
  ],
]

for (const [why, asked] of noTrailer) {
  test(`S-213. no trailer is offered when ${why}`, () => {
    assert.equal(evidenceTrailer(asked), undefined)
  })
}

test('S-213. the checker prints the trailer from its receipt and formats none of its own', () => {
  const source = readFileSync(join(REPO, 'scripts', 'check.mjs'), 'utf8')
  assert.match(source, /evidenceTrailer\(\{/, 'check.mjs does not print the recorded trailer')
  assert.doesNotMatch(source, /Verification-Tree:/, 'check.mjs grew a trailer format of its own')
  // The four scans ARE the tests a documents-only run names (S-212), so the scans are a test step
  // the receipt reads — and the mode nothing ever read is gone.
  assert.match(source, /label === 'scans'/)
  assert.doesNotMatch(source, /'documents'/, 'check.mjs still records a mode nothing reads')
  // And the scans run under the receipt reporter, like every other test step, so those four names
  // come with measured counts beside them. Without it the receipt would name no test file, the
  // trailer would be one verification-status.mjs refuses, and the checker would print nothing —
  // measured by hand on this repository, 2026-10-17: four files, 11 passing tests, 2.7 s.
  assert.match(source, /const SCANS_STEP = \['scans', node, reportingTests\(SCANS\)\]/)
  assert.match(source, /`--test-reporter=\$\{RECEIPT_REPORTER\}`/)
  assert.match(source, /`--test-reporter-destination=\$\{testsRawPath\(WHERE\)\}`/)
})

// ---------------------------------------------------------------- what may be carried

// S-214. The reuse verdict above answers a journey asking about HEAD. This one answers the checker
// asking about the content in front of it, which is what stops the prose written AFTER a suite —
// a journey's verdict, a journal entry — costing another suite. Same inference, same refusals.

const RAN = {
  receipt: 1,
  mode: 'full',
  ok: true,
  testedTree: 'f'.repeat(40),
  checks: [{ label: 'tests', ok: true, ms: 1 }],
  tests: { ok: true, total: 9, files: { 'tests/demo-one.test.ts': { pass: 5, fail: 0 } } },
}
const HERE = { contentTree: 'e'.repeat(40) }

test('S-214. a green full run is carried when every path that differs is a document', () => {
  const verdict = carryVerdict({
    ...HERE,
    receipt: RAN,
    delta: ['JOURNAL.md', 'docs/features/demo.md'],
  })
  assert.equal(verdict.kind, 'carry')
  if (verdict.kind !== 'carry') return
  assert.equal(verdict.from, RAN.testedTree, 'the carry does not say where the suite ran')
  assert.deepEqual(
    verdict.tests,
    RAN.tests,
    'the carried test rows are lost, so nothing may rest on it',
  )
})

test('S-214. content identical to the recorded run carries nothing over', () => {
  const verdict = carryVerdict({ contentTree: RAN.testedTree, receipt: RAN, delta: [] })
  assert.equal(verdict.kind, 'carry')
  if (verdict.kind !== 'carry') return
  assert.equal(verdict.from, verdict.tree, 'identical content read as a carry from somewhere else')
})

const notCarried: Array<[string, Parameters<typeof carryVerdict>[0], RegExp]> = [
  [
    'there is no recorded full run',
    { ...HERE, receipt: undefined, delta: [] },
    /no recorded full run/,
  ],
  [
    'the record is of another version',
    { ...HERE, receipt: { ...RAN, receipt: 2 }, delta: [] },
    /version 2/,
  ],
  [
    'the recorded run was targeted, not full',
    { ...HERE, receipt: { ...RAN, mode: 'targeted' }, delta: [] },
    /'targeted', not a full run/,
  ],
  [
    'the recorded run was not green',
    { ...HERE, receipt: { ...RAN, ok: false }, delta: [] },
    /not green/,
  ],
  [
    'the recorded run records no passing tests',
    { ...HERE, receipt: { ...RAN, tests: undefined }, delta: [] },
    /no passing test run/,
  ],
  [
    'the record names no tree',
    { ...HERE, receipt: { ...RAN, testedTree: undefined }, delta: [] },
    /names no tree/,
  ],
  [
    'git could not name this content',
    { ...HERE, contentTree: undefined, receipt: RAN, delta: [] },
    /could not name this content/,
  ],
  [
    'git could not compare the trees',
    { ...HERE, receipt: RAN, delta: undefined },
    /could not compare/,
  ],
  [
    'a path of code differs from the recorded run',
    { ...HERE, receipt: RAN, delta: ['JOURNAL.md', 'scripts/check.mjs'] },
    /scripts\/check\.mjs differs/,
  ],
  [
    'an unclassified path differs from the recorded run',
    { ...HERE, receipt: RAN, delta: ['something-new.yaml'] },
    /something-new\.yaml differs/,
  ],
]

for (const [why, asked, message] of notCarried) {
  test(`S-214. nothing is carried when ${why}`, () => {
    const verdict = carryVerdict(asked)
    assert.equal(verdict.kind, 'none', `a carry was allowed: ${JSON.stringify(verdict)}`)
    assert.match(verdict.why as string, message)
  })
}

test('--documents is a mode of its own, not combined with another', () => {
  const r = spawnSync(
    process.execPath,
    ['scripts/check.mjs', '--documents', '--slice', 'tests/check-receipt.test.ts'],
    { cwd: REPO, encoding: 'utf8', env: { ...process.env, NO_COLOR: '1' } },
  )
  assert.notEqual(r.status, 0, 'two modes at once were accepted')
  assert.match(`${r.stdout}${r.stderr}`, /choose one mode/)
})
