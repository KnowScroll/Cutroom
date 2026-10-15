import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, test } from 'node:test'
import { repoFiles } from './_files.ts'
import { REPO } from './_repo.ts'

// S-195. The four file scans are the checks whose whole job is to catch what a NEW file brings in
// — an absolute machine path (D-086) or a CRLF line ending — and two of them read `git ls-files`,
// which lists tracked files only. The working order is write, run the checks, commit, so a file a
// change adds is untracked at exactly the moment those checks run: measured here before the fix,
// one file carrying an absolute path passed the scan untracked and failed it once `git add -N`
// made it tracked. Session 87 paid for this with a real violation that its own green full run
// could not see.
//
// What has to hold afterwards: the enumeration includes untracked files, still excludes everything
// git ignores, and never loses a tracked one.

const made: string[] = []
after(() => {
  for (const dir of made) rmSync(dir, { recursive: true, force: true })
})

function git(cwd: string, ...args: string[]) {
  const r = spawnSync(
    'git',
    ['-c', 'user.name=file-scans-test', '-c', 'user.email=scans@test', ...args],
    { cwd, encoding: 'utf8' },
  )
  assert.equal(r.status, 0, `git ${args.join(' ')}: ${r.stderr}`)
  return r.stdout
}

/** A repository with one committed file, one brand-new file, and one git ignores. */
function scratch() {
  const dir = mkdtempSync(join(tmpdir(), 'scans-'))
  made.push(dir)
  const write = (path: string, body: string) => {
    mkdirSync(join(dir, path, '..'), { recursive: true })
    writeFileSync(join(dir, path), body)
  }
  write('.gitignore', '.artifacts/\nnoise.log\n')
  write('committed.ts', 'export const a = 1\n')
  git(dir, 'init', '-q')
  git(dir, 'add', '-A')
  git(dir, 'commit', '-q', '-m', 'fixture')
  // Added by "the change under verification", so untracked while the checks run.
  write('added.ts', 'export const b = 2\n')
  write('deep/nested/added.mjs', 'export const c = 3\n')
  // Generated, and ignored: a scan that read these would report on artifacts.
  write('noise.log', 'noise\n')
  write('.artifacts/frame.png', 'not really a png\n')
  return dir
}

test('1. a file the change adds is enumerated although nothing has committed it yet', () => {
  const dir = scratch()
  const found = repoFiles(dir)
  assert.ok(found.includes('added.ts'), `untracked file missing: ${found.join(', ')}`)
  assert.ok(found.includes('deep/nested/added.mjs'), 'untracked file in a new folder missing')
  assert.ok(found.includes('committed.ts'), 'tracked file lost')
  assert.ok(found.includes('.gitignore'), 'tracked dotfile lost')
})

test('2. nothing git ignores is enumerated, so no scan reports on a generated file', () => {
  const dir = scratch()
  const found = repoFiles(dir)
  assert.ok(!found.includes('noise.log'), 'an ignored file was enumerated')
  assert.ok(!found.some((path) => path.startsWith('.artifacts/')), 'an artifact was enumerated')
})

test('3. every tracked file in THIS repository is still enumerated, and each one only once', () => {
  const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: REPO, encoding: 'utf8' })
    .split('\0')
    .filter(Boolean)
  const found = repoFiles(REPO)
  const missing = tracked.filter((path) => !found.includes(path))
  assert.deepEqual(missing, [], 'tracked files the scans would no longer read')
  assert.equal(new Set(found).size, found.length, 'a file is enumerated twice')
  assert.ok(found.length >= tracked.length)
})

test('4. neither scan keeps an enumeration of its own', () => {
  // The hole WAS the enumeration, so what has to hold is that there is only one of them left.
  for (const file of ['tests/no-absolute-paths.test.ts', 'tests/line-endings.test.ts']) {
    const text = readFileSync(join(REPO, file), 'utf8')
    assert.match(text, /repoFiles\(REPO\)/, `${file} does not use the shared enumeration`)
    assert.doesNotMatch(text, /ls-files/, `${file} grew its own enumeration again`)
  }
})
