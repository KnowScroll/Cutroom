import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import {
  appendFileSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { after, test } from 'node:test'
import { REPO } from './_repo.ts'
import { allMarkup, MARKUP_EXTENSIONS } from '../scripts/_markup.mjs'
import { testedTree } from '../scripts/_verification.mjs'

// S-177: documents choose their own small checks. A code slice must name its approved tests with
// `--slice`; a checker/configuration/unknown diff fails closed to the full suite. What must never
// happen is a code change quietly selecting no tests.
//
// Each case is a scratch repository holding this repository's own `check.mjs`, `_lib.mjs` and
// `_verification.mjs` (S-188: the checker imports the receipt module),
// asked with `--dry-run`, which prints what it would run and runs none of it. "Every check" is
// never a list kept here: it is what the full run's own dry run prints, so a step added to the
// full run is one `--changed` must also choose.

const made: string[] = []
after(() => {
  for (const dir of made) rmSync(dir, { recursive: true, force: true })
})

function git(cwd: string, ...args: string[]) {
  const r = spawnSync(
    'git',
    ['-c', 'user.name=check-changed-test', '-c', 'user.email=check@test', ...args],
    { cwd, encoding: 'utf8' },
  )
  assert.equal(r.status, 0, `git ${args.join(' ')}: ${r.stderr}`)
}

function write(dir: string, path: string, text: string) {
  mkdirSync(dirname(join(dir, path)), { recursive: true })
  writeFileSync(join(dir, path), text)
}

/** A committed repository with one file of each kind, and this repository's check script. */
function scratch(): string {
  const dir = mkdtempSync(join(tmpdir(), 'check-changed-'))
  made.push(dir)
  mkdirSync(join(dir, 'scripts'))
  // Every module check.mjs imports, or the scratch repository's copy cannot load — the fault
  // S-188 paid for once already (S-196 added _impact.mjs and _pools.mjs).
  for (const f of [
    'check.mjs',
    '_lib.mjs',
    '_verification.mjs',
    '_markup.mjs',
    '_impact.mjs',
    '_pools.mjs',
  ]) {
    copyFileSync(join(REPO, 'scripts', f), join(dir, 'scripts', f))
  }
  write(dir, 'packages/pipeline/src/stage.ts', 'export const stage = 1\n')
  write(dir, 'tests/stage.test.ts', "import { test } from 'node:test'\n")
  write(dir, 'docs/notes.md', '# Notes\n')
  write(dir, 'JOURNAL.md', '# Journal\n')
  write(dir, 'stray.bin', 'bytes\n')
  git(dir, 'init', '-q')
  git(dir, 'add', '-A')
  git(dir, 'commit', '-q', '-m', 'scratch')
  return dir
}

/** What `check.mjs` would run in `dir`, and what it would skip. */
function dryRun(dir: string, ...flags: string[]) {
  const r = spawnSync(process.execPath, ['scripts/check.mjs', ...flags, '--dry-run'], {
    cwd: dir,
    encoding: 'utf8',
    env: { ...process.env, NO_COLOR: '1' },
  })
  assert.equal(
    r.status,
    0,
    `check.mjs ${flags.join(' ')} --dry-run exited ${r.status}: ${r.stderr}`,
  )
  const labels = (word: string) =>
    [...r.stdout.matchAll(new RegExp(`^ {2}${word} +(\\S.*?)\\s*$`, 'gm'))].map((m) => m[1] ?? '')
  return { run: labels('would run'), skipped: labels('skipped'), out: r.stdout }
}

function assertNeedsSlice(dir: string, what: string) {
  const r = spawnSync(process.execPath, ['scripts/check.mjs', '--changed', '--dry-run'], {
    cwd: dir,
    encoding: 'utf8',
    env: { ...process.env, NO_COLOR: '1' },
  })
  assert.notEqual(r.status, 0, `${what} was accepted without named tests`)
  assert.match(`${r.stdout}${r.stderr}`, /--slice/, `${what} did not explain the targeted mode`)
}

test('S-177. a change under packages/ must name slice tests instead of silently running none', () => {
  const dir = scratch()
  write(dir, 'packages/pipeline/src/stage.ts', 'export const stage = 2\n')
  assertNeedsSlice(dir, 'a change under packages/')
  const chosen = dryRun(dir, '--slice', 'tests/stage.test.ts')
  assert.ok(chosen.run.includes('slice tests'), `slice test was not selected:\n${chosen.out}`)
  assert.ok(chosen.skipped.includes('tests'), `the aggregate suite was not skipped:\n${chosen.out}`)
})

test('S-177. every changed test file must be named by --slice', () => {
  const dir = scratch()
  write(dir, 'tests/stage.test.ts', "import { test } from 'node:test'\ntest('x', () => {})\n")
  assertNeedsSlice(dir, 'a change under tests/')
  const selected = dryRun(dir, '--slice', 'tests/stage.test.ts')
  assert.ok(selected.run.includes('slice tests'), `changed test was not selected:\n${selected.out}`)
  const omitted = spawnSync(
    process.execPath,
    ['scripts/check.mjs', '--slice', 'tests/missing.test.ts'],
    {
      cwd: dir,
      encoding: 'utf8',
      env: { ...process.env, NO_COLOR: '1' },
    },
  )
  assert.notEqual(omitted.status, 0, 'a changed test omitted from --slice was accepted')
})

test('S-177. an unknown path fails closed, beside documents or alone', () => {
  const dir = scratch()
  write(dir, 'stray.bin', 'other bytes\n')
  assertNeedsSlice(dir, 'an unrecognised path')

  write(dir, 'JOURNAL.md', '# Journal\n\nan entry\n')
  assertNeedsSlice(dir, 'an unrecognised path beside a document')
})

test('S-177. checker and workspace tooling changes fail closed to the full suite', () => {
  const dir = scratch()
  write(dir, 'scripts/check.mjs', `${readFileSync(join(REPO, 'scripts', 'check.mjs'), 'utf8')}\n`)
  const result = spawnSync(
    process.execPath,
    ['scripts/check.mjs', '--slice', 'tests/stage.test.ts'],
    {
      cwd: dir,
      encoding: 'utf8',
      env: { ...process.env, NO_COLOR: '1' },
    },
  )
  assert.notEqual(result.status, 0, 'a checker change was accepted for targeted verification')
  assert.match(`${result.stdout}${result.stderr}`, /full check/)
})

test('S-193. Markdown anywhere is a document: prose outside docs/ no longer costs the full suite', () => {
  const dir = scratch()
  // Each of these used to be an unclassified path, so a sentence of English failed --changed
  // closed to the whole suite. None of them is executed by anything.
  write(dir, '.claude/agents/check-runner.md', '# an agent\n\nprose\n')
  write(dir, '.claude/skills/checks/SKILL.md', '# a skill\n\nprose\n')
  write(dir, 'packages/pipeline/README.md', '# a package\n\nprose\n')
  const chosen = dryRun(dir, '--changed')
  assert.deepEqual(
    [...chosen.run].sort(),
    ['copied docs', 'decisions pin', 'markup changed', 'scans'],
    `Markdown outside docs/ did not choose the document checks:\n${chosen.out}`,
  )
  for (const label of ['typecheck', 'code', 'boundaries', 'boundaries proven', 'tests']) {
    assert.ok(chosen.skipped.includes(label), `${label} was not skipped:\n${chosen.out}`)
  }

  // A file that executes still fails closed, whatever prose sits beside it.
  const other = scratch()
  write(other, '.claude/settings.json', '{}\n')
  const refused = spawnSync(process.execPath, ['scripts/check.mjs', '--changed', '--dry-run'], {
    cwd: other,
    encoding: 'utf8',
    env: { ...process.env, NO_COLOR: '1' },
  })
  assert.notEqual(refused.status, 0, 'a settings change was treated as a document')
  // S-196 made the refusal say WHICH rule refused; it still names the file.
  assert.match(
    `${refused.stdout}${refused.stderr}`,
    /\.claude\/settings\.json is tooling or workspace configuration/,
  )
})

test('S-192. the two-pool runner and its classes are checker tooling: no slice may carry them', () => {
  // The pool sizes and the split decide WHAT runs beside what; a targeted run that accepted a
  // change to either would be verifying the suite with the scheduler under test.
  for (const file of ['scripts/run-tests.mjs', 'scripts/_pools.mjs']) {
    const dir = scratch()
    // Appended, not replaced: check.mjs imports _pools.mjs, and a broken import would fail the
    // run for the wrong reason, leaving the refusal under test unexercised.
    appendFileSync(join(dir, file), '\n// changed by the test\n')
    const result = spawnSync(
      process.execPath,
      ['scripts/check.mjs', '--slice', 'tests/stage.test.ts'],
      { cwd: dir, encoding: 'utf8', env: { ...process.env, NO_COLOR: '1' } },
    )
    const out = `${result.stdout}${result.stderr}`
    assert.notEqual(result.status, 0, `${file} was accepted for targeted verification:\n${out}`)
    // Named as verification infrastructure, not merely caught by the blanket scripts/ rule: the
    // listing is what keeps a scheduler change from ever resting on a targeted run.
    assert.match(out, /changes verification infrastructure; run the full check/)
  }
})

test('S-177. an untracked source file still requires named tests', () => {
  const dir = scratch()
  write(dir, 'packages/pipeline/src/new-stage.ts', 'export const next = 1\n')
  assertNeedsSlice(dir, 'an untracked file under packages/')
})

test('S-177. code moved under docs/ is seen as both paths and requires named tests', () => {
  const dir = scratch()
  // A rename is listed by its new name alone unless renames are turned off, and this one's new
  // name is a document.
  git(dir, 'mv', 'packages/pipeline/src/stage.ts', 'docs/stage.md')
  assertNeedsSlice(dir, 'a rename from packages/ into docs/')
})

test('S-159. a change of documents only chooses the formatting, the scans and the authority, and no check of code', () => {
  const dir = scratch()
  write(dir, 'docs/notes.md', '# Notes\n\nmore\n')
  write(dir, 'JOURNAL.md', '# Journal\n\nan entry\n')
  write(dir, 'PROMPTS/052-next.md', '# 052\n')

  const all = dryRun(dir).run
  const chosen = dryRun(dir, '--changed')
  assert.deepEqual(
    [...chosen.run].sort(),
    ['copied docs', 'decisions pin', 'markup changed', 'scans'],
    `documents chose:\n${chosen.out}`,
  )
  for (const label of ['typecheck', 'code', 'boundaries', 'boundaries proven', 'tests']) {
    assert.ok(chosen.skipped.includes(label), `documents did not skip ${label}:\n${chosen.out}`)
  }
  // Every check of the full run is either run or said to be skipped: none is dropped unsaid.
  // S-189: `markup changed` IS the full run's `markup` step, narrowed to the files that differ.
  assert.deepEqual(
    [
      ...chosen.run
        .map((label) => (label === 'markup changed' ? 'markup' : label))
        .filter((label) => label !== 'scans'),
      ...chosen.skipped,
    ].sort(),
    [...all].sort(),
  )
})

test('S-177. modes cannot be combined', () => {
  const dir = scratch()
  const r = spawnSync(process.execPath, ['scripts/check.mjs', '--changed', '--code'], {
    cwd: dir,
    encoding: 'utf8',
    env: { ...process.env, NO_COLOR: '1' },
  })
  assert.notEqual(r.status, 0, 'check.mjs --changed --code was accepted')
  assert.match(r.stderr, /choose one mode/)
})

// ---------------------------------------------------------------- S-189. the markup check

test('S-189. a slice narrows the markup check to the markup that differs, and drops it when none does', () => {
  // prettier over all 126 markup files is 8.7 s; over two of them, 0.26 s (measured 2026-10-15).
  // The narrowing must be visible as a step, and its absence must be printed as a skip — a check
  // that quietly disappears is the failure mode this whole file exists to prevent.
  const code = scratch()
  write(code, 'packages/pipeline/src/stage.ts', 'export const stage = 2\n')
  const codeOnly = dryRun(code, '--slice', 'tests/stage.test.ts')
  assert.ok(
    !codeOnly.run.some((label) => label.startsWith('markup')),
    `a code-only slice ran a markup check over nothing:\n${codeOnly.out}`,
  )
  assert.ok(
    codeOnly.skipped.includes('markup'),
    `the markup check vanished without being named:\n${codeOnly.out}`,
  )

  const withDoc = scratch()
  write(withDoc, 'packages/pipeline/src/stage.ts', 'export const stage = 2\n')
  write(withDoc, 'docs/notes.md', '# Notes\n\nchanged\n')
  const narrowed = dryRun(withDoc, '--slice', 'tests/stage.test.ts')
  assert.ok(
    narrowed.run.includes('markup changed'),
    `a changed document was not checked:\n${narrowed.out}`,
  )
})

/** The tree at HEAD in `dir`. */
function headTree(dir: string) {
  const r = spawnSync('git', ['rev-parse', 'HEAD^{tree}'], { cwd: dir, encoding: 'utf8' })
  assert.equal(r.status, 0, r.stderr)
  return r.stdout.trim()
}

/**
 * A green full-run receipt in `dir`, naming `tree`, in the reusable file a journey rests on
 * (S-188). The folder holds a `.gitignore` of `*` exactly as the checker writes it, so the planted
 * record is invisible to git — a receipt that read as a dirty path would change what is under test.
 */
function plantFullRun(dir: string, tree: string) {
  mkdirSync(join(dir, '.verification'), { recursive: true })
  writeFileSync(join(dir, '.verification', '.gitignore'), '*\n')
  writeFileSync(
    join(dir, '.verification', 'receipt-full.json'),
    `${JSON.stringify({
      receipt: 1,
      mode: 'full',
      ok: true,
      testedTree: tree,
      checks: [{ label: 'tests', ok: true, ms: 1 }],
      tests: { ok: true, total: 9, files: { 'tests/stage.test.ts': { pass: 9, fail: 0 } } },
    })}\n`,
  )
}

/** What a real (not dry) run recorded about itself in `dir`. */
function recorded(dir: string, file = 'receipt.json') {
  return JSON.parse(readFileSync(join(dir, '.verification', file), 'utf8'))
}

test('S-213. a run whose tests the impact map chose records TARGETED, not a full suite', () => {
  // Measured the moment the checker first printed its own trailer: `--changed` with code in the
  // diff has neither `--slice` nor the documents steps, so the old flag ladder fell through to
  // `full` and a twelve-file run called itself a full suite — and wrote `receipt-full.json`, where
  // a journey looks for a run of everything. The mode is read off the step that ran instead.
  const dir = scratch()
  mkdirSync(join(dir, '.verification'), { recursive: true })
  writeFileSync(join(dir, '.verification', '.gitignore'), '*\n')
  writeFileSync(
    join(dir, '.verification', 'impact.json'),
    `${JSON.stringify({
      impact: 1,
      covers: { 'tests/stage.test.ts': ['packages/pipeline/src/stage.ts'] },
    })}\n`,
  )
  write(dir, 'packages/pipeline/src/stage.ts', 'export const stage = 4\n')
  spawnSync(process.execPath, ['scripts/check.mjs', '--changed'], {
    cwd: dir,
    encoding: 'utf8',
    env: { ...process.env, NO_COLOR: '1' },
  })
  const receipt = recorded(dir)
  assert.equal(receipt.tests.label, 'slice tests', 'the chosen set did not run as a chosen set')
  assert.equal(receipt.mode, 'targeted', 'a chosen set of tests recorded itself as a full suite')
  assert.ok(
    !existsSync(join(dir, '.verification', 'receipt-full.json')),
    'a chosen set of tests wrote the record a journey rests on',
  )
})

test('S-214. a recorded full run is carried over the documents written after it, code and all', () => {
  // The order every finished piece of work has: the suite runs, and THEN the prose that describes
  // it is written — a journey's verdict, the journal, the context file. None of it can change what
  // the suite observed, and the comparison that proves so is against the tree that run tested, not
  // against HEAD. Here the code change is uncommitted and the recorded run covers it; only a
  // journal line came after.
  const dir = scratch()
  write(dir, 'packages/pipeline/src/stage.ts', 'export const stage = 2\n')
  const ran = testedTree(dir) as string
  plantFullRun(dir, ran)
  appendFileSync(join(dir, 'JOURNAL.md'), '\nwhat happened\n')

  const chosen = dryRun(dir, '--changed')
  assert.deepEqual(
    chosen.run.sort(),
    ['copied docs', 'decisions pin', 'markup', 'scans'],
    `a carried run chose other checks:\n${chosen.out}`,
  )
  // ALL the markup, not the markup that differs from HEAD: the documents that differ from the
  // recorded run are a different set, and HEAD's would leave one of them unchecked.
  assert.ok(!chosen.run.includes('markup changed'), `the carried run narrowed its markup`)
  for (const label of ['typecheck', 'code', 'boundaries', 'tests']) {
    assert.ok(chosen.skipped.includes(label), `a carried run still ran ${label}:\n${chosen.out}`)
  }
  assert.match(chosen.out, /1 document\(s\) differ from the full run at/)

  // And what it records is FULL evidence for this content, saying where the suite ran.
  spawnSync(process.execPath, ['scripts/check.mjs', '--changed'], {
    cwd: dir,
    encoding: 'utf8',
    env: { ...process.env, NO_COLOR: '1' },
  })
  const receipt = recorded(dir)
  assert.equal(
    receipt.mode,
    'full',
    'a carried run recorded something less than the run it rests on',
  )
  assert.equal(receipt.carriedFrom, ran, 'the carried receipt does not say where the suite ran')
  assert.deepEqual(
    receipt.tests.files,
    { 'tests/stage.test.ts': { pass: 9, fail: 0 } },
    'a carried receipt names no test file, so no journey could rest on it',
  )
  // The steps cannot pass in a scratch repository with no node_modules, and that is the case worth
  // pinning: a red run must not replace the green record it rests on.
  assert.equal(receipt.ok, false)
  assert.equal(recorded(dir, 'receipt-full.json').testedTree, ran, 'a red run ate the full receipt')
})

test('S-214. a carry is refused when any path that is not a document differs from the recorded run', () => {
  const dir = scratch()
  plantFullRun(dir, headTree(dir))
  write(dir, 'packages/pipeline/src/stage.ts', 'export const stage = 3\n')
  assertNeedsSlice(dir, 'a code change the recorded run never saw')
  const r = spawnSync(process.execPath, ['scripts/check.mjs', '--changed', '--dry-run'], {
    cwd: dir,
    encoding: 'utf8',
    env: { ...process.env, NO_COLOR: '1' },
  })
  assert.match(
    `${r.stdout}${r.stderr}`,
    /could not be carried: packages\/pipeline\/src\/stage\.ts differs/,
    'the refusal does not say which path took the cheap path away',
  )
})

test('S-213. a documents-only run records targeted evidence naming the four scans', () => {
  // The receipt is what a commit's trailer is copied from (S-212), so what a documents-only run
  // RECORDS about itself is a property of the checker. This scratch repository has neither
  // node_modules nor the authority's scripts, so the steps cannot pass here — and need not: the
  // receipt is written whatever the verdict, because the mode says what RAN and `ok` says how it
  // went.
  const dir = scratch()
  appendFileSync(join(dir, 'docs/notes.md'), 'another sentence\n')
  spawnSync(process.execPath, ['scripts/check.mjs', '--changed'], {
    cwd: dir,
    encoding: 'utf8',
    env: { ...process.env, NO_COLOR: '1' },
  })
  const receipt = JSON.parse(readFileSync(join(dir, '.verification', 'receipt.json'), 'utf8'))
  assert.equal(receipt.mode, 'targeted', 'a documents-only run recorded a mode nothing reads')
  assert.deepEqual(
    (receipt.checks as Array<{ label: string }>).map((check) => check.label).sort(),
    ['copied docs', 'decisions pin', 'markup changed', 'scans'],
    'a documents-only run chose checks other than the four a document can fail',
  )
})

test('S-189. the full run and --documents check ALL the markup, named file by file', () => {
  // A glob is not enough: `**/*.yml` matches nothing here and prettier exits 2 on that, so the
  // step would be red for a reason that is not a finding. And a journey resting on a recorded run
  // has a clean tree, so narrowing `--documents` to what differs from HEAD would check nothing.
  const dir = scratch()
  assert.ok(dryRun(dir).run.includes('markup'), 'the full run skipped the markup check')
  assert.ok(
    dryRun(dir, '--documents').run.includes('markup'),
    '--documents skipped the markup check',
  )
  // And what it names must be files that exist, not a pattern. A scratch repository cannot run
  // the real step — `bin()` looks for prettier inside the repository being checked — so the
  // enumeration is asked directly, here, where prettier does live.
  const named = allMarkup(REPO)
  assert.ok(named.length > 20, `only ${named.length} markup file(s) named for the full run`)
  for (const path of named) {
    assert.match(path, MARKUP_EXTENSIONS, `${path} is not markup`)
    assert.doesNotMatch(path, /[*?]/, `${path} is a pattern, and prettier exits 2 on an empty one`)
    assert.ok(existsSync(join(REPO, path)), `${path} does not exist`)
  }
  assert.ok(
    named.includes('CLAUDE.md') && named.includes('pnpm-workspace.yaml'),
    'the enumeration misses Markdown at the root or the workspace YAML',
  )
})
