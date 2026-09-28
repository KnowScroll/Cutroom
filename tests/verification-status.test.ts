import assert from 'node:assert/strict'
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { after, test } from 'node:test'
import { REPO } from './_repo.ts'

const made: string[] = []
after(() => {
  for (const dir of made) rmSync(dir, { recursive: true, force: true })
})

function git(cwd: string, ...args: string[]): string {
  const result = spawnSync(
    'git',
    ['-c', 'user.name=verification-test', '-c', 'user.email=test@example.com', ...args],
    {
      cwd,
      encoding: 'utf8',
    },
  )
  assert.equal(result.status, 0, `git ${args.join(' ')}: ${result.stderr}`)
  return result.stdout.trim()
}

function scratch(message: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'verification-status-'))
  made.push(dir)
  git(dir, 'init', '-q')
  git(dir, 'config', 'user.name', 'verification-test')
  git(dir, 'config', 'user.email', 'test@example.com')
  const scripts = join(dir, 'scripts')
  mkdirSync(scripts)
  for (const file of ['_lib.mjs', 'verification-status.mjs']) {
    copyFileSync(join(REPO, 'scripts', file), join(scripts, file))
  }
  writeFileSync(join(dir, 'file.txt'), 'tree\n')
  git(dir, 'add', '.')
  const tree = git(dir, 'write-tree')
  git(dir, 'commit', '-q', '-m', message.replace('<TREE>', tree))
  return dir
}

function status(dir: string) {
  return spawnSync(process.execPath, ['scripts/verification-status.mjs'], {
    cwd: dir,
    encoding: 'utf8',
  })
}

test('S-177. full evidence is accepted only for HEAD’s exact tree', () => {
  const dir = scratch('verified\n\nVerification: full\nVerification-Tree: <TREE>')
  const result = status(dir)
  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /has full verification for its exact tree/)
})

test('S-177. targeted evidence names its tests and a wrong tree is rejected', () => {
  const valid = scratch(
    'verified\n\nVerification: targeted\nVerification-Tree: <TREE>\nVerification-Tests: tests/example.test.ts',
  )
  assert.equal(status(valid).status, 0)

  const badTree = scratch('verified\n\nVerification: full\nVerification-Tree: not-the-tree')
  assert.notEqual(status(badTree).status, 0)

  const noTests = scratch('verified\n\nVerification: targeted\nVerification-Tree: <TREE>')
  assert.notEqual(status(noTests).status, 0)
})
