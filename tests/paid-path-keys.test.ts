import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { before, test } from 'node:test'
import { REPO } from './_repo.ts'

// paid-path, Slice 2 — check 4 (docs/features/paid-path.md): `keys-only-in-providers`, the
// TWENTIETH boundary rule (S-109), and the two mechanisms that carry its one name (S-119).
//
// A key is read with `process.env.NAME`, which is a property access on a global: no rule that
// resolves imports can ever see one. So the rule is held in two places — the config rule, which
// forbids anything outside `packages/providers` from importing the module that owns the read, by
// path and by the name `@cutroom/providers/env`; and `drift`'s key scan, which is what catches a
// key-shaped read written fresh anywhere outside `packages/providers/src`. Both are proven here,
// because one mechanism going quiet while the other stays green is exactly the state a rule that
// reads as coverage is in.

type Rule = { name: string; from?: { path?: string; pathNot?: string }; to?: { path?: string } }
const config = createRequire(import.meta.url)(join(REPO, '.dependency-cruiser.cjs')) as {
  forbidden: Rule[]
}

function drift(...args: string[]) {
  const result = spawnSync(process.execPath, ['scripts/drift.mjs', ...args], {
    cwd: REPO,
    encoding: 'utf8',
    env: { ...process.env, NO_COLOR: '1' },
  })
  return { status: result.status, out: `${result.stdout}${result.stderr}` }
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

function caught(out: string, rule: string, from: string, what: string) {
  const line = new RegExp(
    `caught\\s+${escape(rule)}\\s+${escape(from)} -> ${escape(what)}(?=\\s|$)`,
    'm',
  )
  assert.match(out, line, `drift --prove did not catch ${rule} on ${from} -> ${what}:\n${out}`)
}

let prove: { status: number | null; out: string }

before(() => {
  prove = drift('--prove')
})

// ---------------------------------------------------------------- 4

test('4. keys-only-in-providers is configured, forbidding everything outside packages/providers to reach the module that owns the read, by path and by package name', () => {
  const rule = config.forbidden.find((r) => r.name === 'keys-only-in-providers')
  assert.ok(rule !== undefined, 'keys-only-in-providers is not in .dependency-cruiser.cjs')

  const from = new RegExp(rule.from?.path ?? '(?!)')
  const notFrom = new RegExp(rule.from?.pathNot ?? '(?!)')
  const to = new RegExp(rule.to?.path ?? '(?!)')

  // Everything outside packages/providers is in the rule's from, and providers itself is not.
  for (const file of ['apps/worker/src/clips-job.ts', 'packages/domain/src/db.ts']) {
    assert.match(file, from, file)
    assert.doesNotMatch(file, notFrom, file)
  }
  assert.match('packages/providers/src/ports.ts', notFrom)

  // Both spellings of reaching it: the resolved file, and the bare specifier — which is what an
  // import of a subpath that does not resolve looks like to the graph.
  assert.match('packages/providers/src/env.ts', to)
  assert.match('@cutroom/providers/env', to)
  assert.doesNotMatch('packages/providers/src/index.ts', to)
})

test('4. drift --prove builds a deliberate violation of keys-only-in-providers, relative and by package name, and catches both', () => {
  assert.equal(prove.status, 0, prove.out)
  caught(
    prove.out,
    'keys-only-in-providers',
    'apps/worker/src/reads-a-key.ts',
    '../../../packages/providers/src/env.ts',
  )
  caught(prove.out, 'keys-only-in-providers', 'apps/worker', '@cutroom/providers/env')
})

test('4. drift --prove builds a key-shaped environment read outside packages/providers and catches it, both spellings, and reports none of the legal reads', () => {
  assert.equal(prove.status, 0, prove.out)
  // One per root the scan walks: an app, a package, a test and a script. A root quietly dropped
  // from the walk is a case going silent here (S-109 binds every package, app and test).
  caught(prove.out, 'keys-only-in-providers', 'apps/worker/src/reads-a-key.ts', 'FAL_KEY')
  caught(prove.out, 'keys-only-in-providers', 'packages/domain/src/subscripts-a-key.ts', 'FAL_KEY')
  caught(prove.out, 'keys-only-in-providers', 'tests/reads-a-key.test.ts', 'MINIMAX_API_KEY')
  caught(prove.out, 'keys-only-in-providers', 'scripts/reads-a-key.mjs', 'FAL_TOKEN')

  // The same read INSIDE providers, a read of a name that is not a key, and a key-shaped name
  // ASSIGNED rather than read — which is what the secrets checks' canary is (S-028).
  for (const clean of [
    'packages/providers/src/env.ts -> MINIMAX_API_KEY',
    'apps/service/src/settings.ts -> CUTROOM_DB_PATH',
    'tests/canary.test.ts -> CUTROOM_TEST_API_KEY',
  ]) {
    assert.match(prove.out, new RegExp(`clean\\s+${escape(clean)}(?=\\s|$)`, 'm'), prove.out)
  }
})

test('4. drift itself reads the repository for key-shaped reads, and finds none outside packages/providers', () => {
  const check = drift()
  assert.equal(check.status, 0, check.out)
  assert.match(
    check.out,
    /0 key-shaped environment reads outside packages\/providers\/src/,
    check.out,
  )
})

test('4. drift, drift --prove and drift --audit pass, and the rule count is twenty', () => {
  assert.equal(prove.status, 0, prove.out)
  assert.doesNotMatch(prove.out, /SILENT/, prove.out)
  assert.doesNotMatch(prove.out, /EAGER/, prove.out)
  assert.match(prove.out, /20 rules proven to fire/, prove.out)

  const audit = drift('--audit')
  assert.equal(audit.status, 0, audit.out)
  assert.doesNotMatch(audit.out, /DEAD/, audit.out)
  assert.match(audit.out, /live\s+keys-only-in-providers/, audit.out)
})

test("4. reel-stills' check 3 counts twenty, and so does reel-render's check 2", () => {
  // Gate 2 names reel-stills' check 3. reel-render's check 2 pins the same printed line (S-078's
  // own words), and the feature's list of what it changes in verified features did not say so —
  // the miss S-049 found in S-047 and S-078 found in S-077, a third time (S-120). Both are here,
  // so a slice that updates one and leaves the other fails this check rather than the suite.
  for (const file of ['reel-stills-rules.test.ts', 'reel-render-rules.test.ts']) {
    const source = readFileSync(join(REPO, 'tests', file), 'utf8')
    assert.match(source, /20 rules proven to fire/, `${file} does not count twenty`)
    assert.doesNotMatch(source, /19 rules proven to fire/, `${file} still counts nineteen`)
  }
})
