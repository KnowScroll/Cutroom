import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import { test } from 'node:test'
import { Spent, Unavailable, isSpent, isUnavailable } from '@cutroom/contracts'
import {
  Spent as ProvidersSpent,
  Unavailable as ProvidersUnavailable,
  isSpent as providersIsSpent,
} from '@cutroom/providers'
import { REPO } from './_repo.ts'

// paid-failures, Slice 1 — check 11 (docs/features/paid-failures.md): where the two classes live,
// and the boundary that put them there.
//
// `worker-no-providers` forbids `apps/worker` importing `packages/providers` (S-038), and the
// worker is the only place that knows both a stage and a table. So a class an adapter THROWS and
// the worker CATCHES cannot be declared in the adapter's package — which is exactly why
// `Unavailable` was never seen by the worker and why the model port had no transient retry until
// this feature (S-137, S-142). `packages/providers` re-exports both names, so no adapter's import
// line moved; what this check holds is that they are ONE class each, not two that happen to share a
// name, because `instanceof` across two declarations is silently false.

const WORKER = join(REPO, 'apps', 'worker', 'src')

/** Every source file under a folder, recursively. */
function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return sources(path)
    return entry.name.endsWith('.ts') ? [path] : []
  })
}

// ---------------------------------------------------------------- 11

const CHECK_11 =
  '11. apps/worker imports no packages/providers; Spent and Unavailable are packages/contracts’, and packages/providers re-exports them so no adapter’s import line moved'

test(`${CHECK_11} — the worker names what it catches without reaching for an adapter`, () => {
  const files = sources(WORKER)
  assert.ok(files.length > 0, 'apps/worker/src holds no source')
  // What an IMPORT names, not what a comment mentions: this file's own prose names the package it
  // forbids, and so does `model-port.ts`, which explains why the classes moved.
  const IMPORTS = /^\s*(?:import|export)[^\n]*?from\s+'([^']+)'/gm
  for (const file of files) {
    for (const [, from] of readFileSync(file, 'utf8').matchAll(IMPORTS)) {
      assert.ok(
        from !== '@cutroom/providers' && !String(from).includes('packages/providers'),
        `${relative(REPO, file)} imports ${from}, which worker-no-providers forbids (S-038)`,
      )
    }
  }

  // The boundary rule itself is proven against the real dependency graph by
  // `node scripts/drift.mjs --prove`, which builds a violation of it and fails if it stays silent.
  // What is asserted here is the thing that rule cannot see: that the class the worker catches is
  // the class the adapter threw.
  assert.equal(ProvidersSpent, Spent, 'packages/providers declares a SECOND Spent')
  assert.equal(
    ProvidersUnavailable,
    Unavailable,
    'packages/providers declares a SECOND Unavailable',
  )
  assert.equal(providersIsSpent, isSpent, 'there are two isSpent, and only one of them is right')

  // And the guards answer for the other's instances, which is what "one class" means in use: a
  // second declaration would typecheck, re-export cleanly, and silently never match.
  const spent = new ProvidersSpent({
    port: 'image',
    model: 'fal-ai/flux-2-pro',
    costCents: 8,
    detail: 'a frame this entry refuses',
  })
  assert.ok(isSpent(spent), 'a Spent thrown by an adapter is not the Spent the worker catches')
  assert.ok(!isUnavailable(spent), 'a Spent is also transient, so it would be sent again')
  assert.ok(
    isUnavailable(new ProvidersUnavailable('429 the provider is busy')),
    'an Unavailable thrown by an adapter is not the one the worker catches',
  )
  assert.ok(!isSpent(new ProvidersUnavailable('429')), 'an Unavailable would be recorded as spend')

  // The worker's own two files that catch them say so by name, so a rename cannot leave this check
  // reading correctly and matching nothing.
  const spend = readFileSync(join(WORKER, 'spend.ts'), 'utf8')
  assert.match(spend, /isSpent/)
  assert.match(spend, /recordLostCall/)
  const model = readFileSync(join(WORKER, 'model-port.ts'), 'utf8')
  assert.match(model, /isUnavailable/)
})
