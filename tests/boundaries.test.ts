import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { test } from 'node:test'
import { REPO } from './_repo.ts'

// The boundary rules are part of the test suite, not a separate chore someone remembers.
//
// Two assertions, and the second is the one that matters: it is not enough that the repo
// currently has no forbidden edge — the rules must be able to CATCH one. In the steering
// repository, two rules the architecture rested on were described in prose for weeks and
// were not in the config at all. Nobody had seen them fire, because they could not.

function drift(...args: string[]) {
  const result = spawnSync(process.execPath, ['scripts/drift.mjs', ...args], {
    cwd: REPO,
    encoding: 'utf8',
    env: { ...process.env, NO_COLOR: '1' },
  })
  return { status: result.status, out: `${result.stdout}${result.stderr}` }
}

test('this repository has no forbidden edge', () => {
  const { status, out } = drift()
  assert.equal(status, 0, out)
})

test('every boundary rule catches a violation written to break it', () => {
  const { status, out } = drift('--prove')
  assert.equal(status, 0, out)
  assert.match(out, /rules proven to fire/, out)
  assert.doesNotMatch(out, /SILENT/, out)
  assert.doesNotMatch(out, /EAGER/, out)
})
