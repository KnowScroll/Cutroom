import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { before, test } from 'node:test'
import { REPO } from './_repo.ts'

// reel-render, Slice 1 — check 2 (docs/features/reel-render.md): `processes-only-in-providers`
// (S-075).
//
// ffmpeg is reached only through ports built in packages/providers. A process started by the
// worker, the API or the domain is a spawn outside every port — S-021's uncaught worker import in
// another shape — so nothing outside packages/providers may import `child_process`, under either of
// its names. A built-in module has no package for a by-name case to place, so the cases import it
// from a file, beside pipeline-no-io's `node:fs`. Asserted by the line `drift --prove` prints for
// each case: the rule, the importing file and the specifier.

type Rule = {
  name: string
  from?: { path?: string; pathNot?: string }
  to?: { path?: string; dependencyTypes?: string[] }
}
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

const RULE = 'processes-only-in-providers'

/** The six cases S-075 names: both spellings, from each of the three places that must not spawn. */
const CASES: ReadonlyArray<readonly [string, string]> = [
  ['apps/worker/src/spawns.ts', 'child_process'],
  ['apps/worker/src/spawns-node.ts', 'node:child_process'],
  ['apps/api/src/spawns.ts', 'child_process'],
  ['apps/api/src/spawns-node.ts', 'node:child_process'],
  ['packages/domain/src/spawns.ts', 'child_process'],
  ['packages/domain/src/spawns-node.ts', 'node:child_process'],
]

let prove: { status: number | null; out: string }

before(() => {
  prove = drift('--prove')
})

// ---------------------------------------------------------------- 2

test('2. processes-only-in-providers is configured: nothing under packages/ or apps/ outside packages/providers imports child_process', () => {
  const rule = config.forbidden.find((r) => r.name === RULE)
  assert.ok(rule !== undefined, `${RULE} is not in .dependency-cruiser.cjs`)

  const from = (path: string) =>
    new RegExp(rule.from?.path ?? '(?!)').test(path) &&
    !new RegExp(rule.from?.pathNot ?? '(?!)').test(path)
  for (const path of [
    'apps/worker/src/worker.ts',
    'apps/api/src/server.ts',
    'packages/domain/src/runs.ts',
    'packages/pipeline/src/render/index.ts',
    'packages/contracts/src/clip.ts',
    'packages/reel-contract/src/index.ts',
  ]) {
    assert.ok(from(path), `${RULE} does not apply to ${path}`)
  }
  // S-075: the ffmpeg adapters live in packages/providers, and they must be able to run the tools.
  for (const path of [
    'packages/providers/src/ffmpeg/tools.ts',
    'packages/providers/src/index.ts',
  ]) {
    assert.ok(!from(path), `${RULE} forbids ${path}, where the ffmpeg adapters live`)
  }

  const to = new RegExp(rule.to?.path ?? '(?!)')
  for (const name of ['child_process', 'node:child_process']) {
    assert.match(name, to, `${RULE} does not name ${name}`)
  }
  for (const name of ['fs', 'node:fs', 'child_process_extra', 'my-child_process']) {
    assert.doesNotMatch(name, to, `${RULE} names ${name}, which is not child_process`)
  }
})

test('2. processes-only-in-providers fires in drift:prove on an import of child_process and of node:child_process from each of apps/worker, apps/api and packages/domain', () => {
  assert.equal(prove.status, 0, prove.out)
  for (const [file, specifier] of CASES) caught(prove.out, RULE, file, specifier)
})

test('2. drift, drift:prove and drift --audit pass', () => {
  const check = drift()
  assert.equal(check.status, 0, check.out)

  assert.equal(prove.status, 0, prove.out)
  assert.doesNotMatch(prove.out, /SILENT/, prove.out)
  assert.doesNotMatch(prove.out, /EAGER/, prove.out)
  // paid-path's Slice 2 added a twentieth rule, keys-only-in-providers (S-109, S-119, S-120).
  // cutroom-sdk's Slice 2 added the twenty-first, sdk-no-engine-internals (S-173, S-175), and
  // Slice 3 adds sdk-processes-only-launcher as the twenty-second. The count stays exact here for
  // the same reason it does in reel-stills' check 3 (S-078).
  assert.match(prove.out, /22 rules proven to fire/, prove.out)

  const audit = drift('--audit')
  assert.equal(audit.status, 0, audit.out)
  assert.doesNotMatch(audit.out, /DEAD/, audit.out)
  assert.match(audit.out, new RegExp(`(live|n/a)\\s+${RULE}`), audit.out)
})
