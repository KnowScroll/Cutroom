import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { before, test } from 'node:test'
import { REPO } from './_repo.ts'

// reel-stills, Slice 1 — check 3 (docs/features/reel-stills.md): `worker-no-providers` (S-038).
//
// S-021 recorded a worker constructing an adapter as NOT CAUGHT. With an image port in reach that
// import is how a run would come to spend, so the rule exists — and a rule is only a rule once it
// has been watched firing on the import real code writes. Asserted by the line `drift --prove`
// prints for ONE case: the rule, the importing folder and the specifier.

type Rule = { name: string; from?: { path?: string }; to?: { path?: string } }
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

function caught(out: string, rule: string, from: string, specifier: string) {
  const line = new RegExp(
    `caught\\s+${escape(rule)}\\s+${escape(from)} -> ${escape(specifier)}(?=\\s|$)`,
    'm',
  )
  assert.match(out, line, `drift --prove did not catch ${rule} on ${from} -> ${specifier}:\n${out}`)
}

let prove: { status: number | null; out: string }

before(() => {
  prove = drift('--prove')
})

// ---------------------------------------------------------------- 3

test('3. worker-no-providers is configured, forbidding apps/worker to import packages/providers', () => {
  const rule = config.forbidden.find((r) => r.name === 'worker-no-providers')
  assert.ok(rule !== undefined, 'worker-no-providers is not in .dependency-cruiser.cjs')
  assert.match('apps/worker/src/keyframes-job.ts', new RegExp(rule.from?.path ?? '(?!)'))
  assert.match('packages/providers/src/fake/image.ts', new RegExp(rule.to?.path ?? '(?!)'))
})

test('3. worker-no-providers fires in drift:prove on an import by path and by package name', () => {
  assert.equal(prove.status, 0, prove.out)
  caught(
    prove.out,
    'worker-no-providers',
    'apps/worker/src/spends.ts',
    '../../../packages/providers/src/index.ts',
  )
  caught(prove.out, 'worker-no-providers', 'apps/worker', '@cutroom/providers')
})

test('3. drift, drift:prove and drift --audit pass', () => {
  const check = drift()
  assert.equal(check.status, 0, check.out)

  assert.equal(prove.status, 0, prove.out)
  assert.doesNotMatch(prove.out, /SILENT/, prove.out)
  assert.doesNotMatch(prove.out, /EAGER/, prove.out)
  // reel-render's Slice 1 added a nineteenth rule, processes-only-in-providers (S-075), and
  // paid-path's Slice 2 a twentieth, keys-only-in-providers (S-109, S-119). cutroom-sdk's
  // Slice 2 added the twenty-first, sdk-no-engine-internals (S-173, S-175). The count stays
  // exact, so a rule losing every one of its prove cases, or cases for a twenty-second, still
  // fails here (S-078).
  assert.match(prove.out, /21 rules proven to fire/, prove.out)

  const audit = drift('--audit')
  assert.equal(audit.status, 0, audit.out)
  assert.doesNotMatch(audit.out, /DEAD/, audit.out)
  assert.match(audit.out, /live\s+worker-no-providers/, audit.out)
})
