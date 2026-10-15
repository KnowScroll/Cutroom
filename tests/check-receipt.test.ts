import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { after, test } from 'node:test'
import { REPO } from './_repo.ts'
import { isDocument, reuseVerdict, testedTree, treeDelta } from '../scripts/_verification.mjs'

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
  assert.ok(!isDocument('packages/pipeline/src/plan.ts'))
  assert.ok(!isDocument('docs/features/demo.ts'))
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
  assert.deepEqual(would, ['format', 'scans', 'decisions pin', 'copied docs'])
  assert.match(r.stdout, /^\s*skipped\s+tests$/m)
})

test('--documents is a mode of its own, not combined with another', () => {
  const r = spawnSync(
    process.execPath,
    ['scripts/check.mjs', '--documents', '--slice', 'tests/check-receipt.test.ts'],
    { cwd: REPO, encoding: 'utf8', env: { ...process.env, NO_COLOR: '1' } },
  )
  assert.notEqual(r.status, 0, 'two modes at once were accepted')
  assert.match(`${r.stdout}${r.stderr}`, /choose one mode/)
})
