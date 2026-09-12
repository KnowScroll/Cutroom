import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
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

test('dependency-cruiser is installed, not merely configured', () => {
  // The steering repository has a .dependency-cruiser.cjs with seven rules and an empty
  // node_modules, and its drift script hides the whole block behind an existsSync check. The
  // rules read as coverage and have never executed. This asserts the tool is really here, and
  // scripts/drift.mjs fails loudly rather than skipping if it ever is not.
  const bin = join(REPO, 'node_modules', 'dependency-cruiser', 'bin', 'dependency-cruise.mjs')
  assert.ok(existsSync(bin), `dependency-cruiser is not installed at ${bin}`)

  const pkg = JSON.parse(readFileSync(join(REPO, 'package.json'), 'utf8'))
  assert.ok(
    pkg.devDependencies?.['dependency-cruiser'],
    'dependency-cruiser must be a declared dependency, not something a machine happens to have',
  )
})

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

test('no rule has quietly stopped applying to anything', () => {
  // A rule can be wrong in a way that reads correctly: it names a folder nobody renamed it
  // after. In the steering repository the whole dependency-cruiser block is skipped because
  // the tool is not installed, so seven rules there have never run once — and the config
  // still reads as coverage.
  const { status, out } = drift('--audit')
  assert.equal(status, 0, out)
  assert.doesNotMatch(out, /DEAD/, out)
})

test('the four intra-package rules exist, because import text cannot express them', () => {
  // D-085 and D-073 both name two folders inside ONE package, where every import between
  // them is relative. Matching an import specifier prefix can never see those.
  const { out } = drift('--audit')
  for (const rule of [
    'plan-no-epistemic',
    'split-no-cinematic',
    'split-imported-only-by-plan',
    'split-entered-through-its-index',
  ]) {
    assert.match(out, new RegExp(rule), `${rule} is missing from the rule set:\n${out}`)
  }
})
