/**
 * Which test files cover which source files, and how a changed set becomes a test set.
 *
 * S-196. `--slice` has always taken a HUMAN-NAMED list of affected tests (S-177), approved in a
 * feature's gate 3 or read out by the `test-impact` agent. That is a judgement every time, and a
 * missed test is invisible: the slice goes green and nothing says a check never ran. This module
 * replaces the judgement with a recorded map, and keeps the old answer — the full suite — for every
 * case the map cannot speak to.
 *
 * The map is built by `scripts/impact-map.mjs`, which runs each test file in its own process under
 * `NODE_V8_COVERAGE` and records every file of this repository that process, OR ANY PROCESS IT
 * SPAWNED, loaded. Measured while designing this: one test file produced 22 coverage files, so a
 * worker, a service or an ffmpeg wrapper started by a test is seen.
 *
 * Two things coverage cannot see, both measured, both handled by widening rather than hoping:
 *
 * 1. **A tool the test COPIES.** `tests/check-changed.test.ts` copies `scripts/check.mjs` into a
 *    scratch repository and runs it there, so the load is attributed to a temporary path. The test
 *    that covers the checker best would never be selected for a checker change. So a test also
 *    covers every repository path it NAMES as a string in its own source.
 * 2. **A file the test READS rather than imports.** The four file scans read every file in the
 *    working copy (S-195); the drift proof reads source to build its cases. No import, no coverage
 *    entry. So those tests are in an always-run set and run whenever anything changed at all.
 *
 * Over-selection costs seconds. Under-selection costs a check nobody notices is gone, so every
 * uncertainty here resolves towards running more: an unknown path, a missing map, a map built at
 * other content, or a changed test file that the map has never seen, all fall back to the full run.
 */
import { readFileSync } from 'node:fs'
import { impactPath } from './_verification.mjs'

export const IMPACT_VERSION = 1

/**
 * Tests that read files instead of importing them, so coverage can never attribute a dependency
 * to them. They run whenever anything changed. All four are seconds, and the first four are the
 * same set `--changed` already runs for a document (S-159, S-195).
 */
export const ALWAYS_RUN = [
  'tests/line-endings.test.ts',
  'tests/no-absolute-paths.test.ts',
  'tests/feature-files.test.ts',
  'tests/context-file.test.ts',
  'tests/file-scans.test.ts',
]

/** Read the recorded map, or undefined when there is none to read. */
export function readImpact(cwd) {
  try {
    const parsed = JSON.parse(readFileSync(impactPath(cwd), 'utf8'))
    return parsed?.impact === IMPACT_VERSION && parsed.covers ? parsed : undefined
  } catch {
    return undefined
  }
}

/**
 * Every repository path named as a string in a file's own source — what a test copies, spawns or
 * reads by name. Deliberately generous: a path mentioned in a comment selects a test that may not
 * need to run, which costs seconds, where a path missed costs a check.
 */
export function pathsNamedIn(text) {
  const found = new Set()
  for (const match of text.matchAll(
    /['"`]((?:packages|apps|tests|scripts|db|docs)\/[A-Za-z0-9_./-]+)['"`]/g,
  )) {
    found.add(match[1])
  }
  // A bare basename, as `['check.mjs', '_lib.mjs']` in a fixture's copy list, resolves below.
  for (const match of text.matchAll(/['"`]([A-Za-z0-9_-]+\.(?:mjs|cjs|js|ts|mts|json))['"`]/g)) {
    found.add(match[1])
  }
  return [...found]
}

/**
 * The test files to run for a changed set, or a reason the full suite is owed instead.
 *
 * `{ tests }` on success — always including the changed test files themselves and the always-run
 * set — or `{ why }` when the map cannot answer for something.
 */
export function selectTests(impact, changed, { testFilesOnDisk = [] } = {}) {
  if (impact === undefined) return { why: 'no impact map has been recorded' }
  const covers = impact.covers
  const tests = Object.keys(covers)
  const chosen = new Set(ALWAYS_RUN.filter((test) => testFilesOnDisk.includes(test)))

  // A test the map has never seen may cover anything, so it runs. This is what makes the map
  // survive the commits after it was built: a test added since then is not trusted to be absent.
  for (const test of testFilesOnDisk) {
    if (!covers[test]) chosen.add(test)
  }

  for (const path of changed) {
    if (path.endsWith('.test.ts')) {
      // A changed test runs, whether or not the map has seen it (S-177 said this already).
      chosen.add(path)
      continue
    }
    const covering = tests.filter((test) => covers[test].includes(path))
    if (covering.length === 0) return { why: `no recorded test covers ${path}` }
    for (const test of covering) chosen.add(test)
  }
  return { tests: [...chosen].filter((test) => testFilesOnDisk.includes(test)).sort() }
}
