import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { after, test } from 'node:test'
import { REPO } from './_repo.ts'

// S-159: `check.mjs --changed` chooses its checks by the paths that differ from HEAD. A change
// made wholly of documents runs the formatting, the scans and the authority; anything else runs
// every check. What must never happen is a change of code, or of a path the mode does not know,
// choosing less than the full run — that is a green that tested nothing.
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

/** Every step of the full run, as the full run's own dry run prints them. */
function everything(dir: string): string[] {
  const full = dryRun(dir)
  // Asserted before it is compared with: two empty lists are equal, and a dry run that printed
  // nothing would make every case below pass.
  for (const label of ['typecheck', 'lint', 'format', 'boundaries proven', 'tests']) {
    assert.ok(full.run.includes(label), `the full run's dry run does not name ${label}`)
  }
  for (const label of ['decisions pin', 'copied docs']) {
    assert.ok(full.run.includes(label), `the full run's dry run does not name ${label}`)
  }
  assert.deepEqual(full.skipped, [], 'the full run skips a check')
  return full.run
}

function assertEveryCheck(dir: string, what: string) {
  const all = everything(dir)
  const chosen = dryRun(dir, '--changed')
  assert.deepEqual(chosen.run, all, `${what} did not choose every check:\n${chosen.out}`)
  assert.deepEqual(chosen.skipped, [], `${what} skipped a check:\n${chosen.out}`)
}

test('S-159. a change under packages/ chooses every check the full run has', () => {
  const dir = scratch()
  write(dir, 'packages/pipeline/src/stage.ts', 'export const stage = 2\n')
  assertEveryCheck(dir, 'a change under packages/')
})

test('S-159. a change under tests/ chooses every check the full run has', () => {
  const dir = scratch()
  write(dir, 'tests/stage.test.ts', "import { test } from 'node:test'\ntest('x', () => {})\n")
  assertEveryCheck(dir, 'a change under tests/')
})

test('S-159. a path the mode does not recognise chooses every check, beside documents or alone', () => {
  const dir = scratch()
  write(dir, 'stray.bin', 'other bytes\n')
  assertEveryCheck(dir, 'an unrecognised path')

  write(dir, 'JOURNAL.md', '# Journal\n\nan entry\n')
  assertEveryCheck(dir, 'an unrecognised path beside a document')
})

test('S-159. an untracked file is a change: a new file under packages/ chooses every check', () => {
  const dir = scratch()
  write(dir, 'packages/pipeline/src/new-stage.ts', 'export const next = 1\n')
  assertEveryCheck(dir, 'an untracked file under packages/')
})

test('S-159. code moved under docs/ is seen as both its paths, and chooses every check', () => {
  const dir = scratch()
  // A rename is listed by its new name alone unless renames are turned off, and this one's new
  // name is a document.
  git(dir, 'mv', 'packages/pipeline/src/stage.ts', 'docs/stage.md')
  assertEveryCheck(dir, 'a rename from packages/ into docs/')
})

test('S-159. a change of documents only chooses the formatting, the scans and the authority, and no check of code', () => {
  const dir = scratch()
  write(dir, 'docs/notes.md', '# Notes\n\nmore\n')
  write(dir, 'JOURNAL.md', '# Journal\n\nan entry\n')
  write(dir, 'PROMPTS/052-next.md', '# 052\n')

  const all = everything(dir)
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

test('S-159. --changed does not take --code', () => {
  const dir = scratch()
  const r = spawnSync(process.execPath, ['scripts/check.mjs', '--changed', '--code'], {
    cwd: dir,
    encoding: 'utf8',
    env: { ...process.env, NO_COLOR: '1' },
  })
  assert.notEqual(r.status, 0, 'check.mjs --changed --code was accepted')
  assert.match(r.stderr, /--changed chooses its own checks/)
})
