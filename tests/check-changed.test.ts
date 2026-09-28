import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { after, test } from 'node:test'
import { REPO } from './_repo.ts'

// S-177: documents choose their own small checks. A code slice must name its approved tests with
// `--slice`; a checker/configuration/unknown diff fails closed to the full suite. What must never
// happen is a code change quietly selecting no tests.
//
// Each case is a scratch repository holding this repository's own `check.mjs` and `_lib.mjs`,
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
  for (const f of ['check.mjs', '_lib.mjs']) {
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
    ['copied docs', 'decisions pin', 'format', 'scans'],
    `documents chose:\n${chosen.out}`,
  )
  for (const label of ['typecheck', 'lint', 'boundaries', 'boundaries proven', 'tests']) {
    assert.ok(chosen.skipped.includes(label), `documents did not skip ${label}:\n${chosen.out}`)
  }
  // Every check of the full run is either run or said to be skipped: none is dropped unsaid.
  assert.deepEqual(
    [...chosen.run.filter((label) => label !== 'scans'), ...chosen.skipped].sort(),
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
