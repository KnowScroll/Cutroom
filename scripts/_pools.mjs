/**
 * Which class each test file belongs to, and how many of each class may run at once.
 *
 * S-192, from `docs/research/test_fixes_and_research.md` §4.2. Thirteen files are PATH-only journey
 * checks: each one re-runs its own feature's other test files inside a child process whose
 * environment holds only PATH, at an internal concurrency its own file ratifies (S-028, S-075).
 * One full suite is therefore 274 file executions of 153 files — 153 direct and 121 nested.
 *
 * S-176 made the OUTER runner serial because ordinary work overlapping those nested child suites
 * starved them and turned a load timeout into a false red. Measured per file on an idle machine
 * (S-191, `docs/research/test-file-costs.md`), the serial suite costs what its files cost to
 * within 3 %: there is no slack to reclaim by being tidier, so the only win available is running
 * files beside each other, and the only safe way to do that is to keep the two classes apart.
 * Ordinary files run at `ORDINARY_CONCURRENCY`, then — never at the same time — the secrets
 * children run at `SECRETS_CONCURRENCY`, each still spawning its own ratified 2 or 4.
 */
import { readdirSync } from 'node:fs'
import { join, sep } from 'node:path'

/** A PATH-only journey check: it runs a nested suite of its own, so it is never an ordinary file. */
export const SECRETS_FILE = /-secrets\.test\.ts$/

/**
 * How many ordinary files at once. Four, not the 4–6 §4.2 allows: every figure above comes from
 * files measured ALONE, so what four of them cost together is the thing this number is evidence
 * for, and the recorded floor in S-192 is the floor at four. Raising it needs its own three green
 * runs and its own recorded floor.
 */
export const ORDINARY_CONCURRENCY = 4

/**
 * How many secrets children at once. Two, not three: each one spawns 2 or 4 test processes of its
 * own, each able to start ffmpeg, a service and a worker, so a pool of two is already up to eight
 * nested processes. Two is also enough to put the class's floor (423.9 s serial, longest child
 * 123.8 s) near the longest child, where a third pool slot buys little.
 */
export const SECRETS_CONCURRENCY = 2

/** Where test files live — the three roots the suite's globs named before this split. */
export const TEST_ROOTS = ['tests', 'packages', 'apps']

/**
 * Every test file under the three roots, repository-relative with forward slashes, sorted.
 *
 * Read from the filesystem rather than from git on purpose: a test file nobody has committed yet
 * still runs, which is the hole the four file scans have and this must not copy.
 */
export function testFiles(cwd) {
  const found = []
  const walk = (dir) => {
    let entries
    try {
      entries = readdirSync(join(cwd, dir), { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') continue
      const path = `${dir}/${entry.name}`
      if (entry.isDirectory()) walk(path)
      else if (entry.isFile() && entry.name.endsWith('.test.ts')) found.push(path)
    }
  }
  for (const root of TEST_ROOTS) walk(root)
  return found.map((path) => path.split(sep).join('/')).sort()
}

/** The same files, split into the two classes that never run at the same time. */
export function classify(files) {
  return {
    ordinary: files.filter((file) => !SECRETS_FILE.test(file)),
    secrets: files.filter((file) => SECRETS_FILE.test(file)),
  }
}

/**
 * One per-file result out of several pools' worth. The reporter writes one object per pool
 * (scripts/test-receipt.mjs); the receipt needs one for the whole step, and a file that somehow
 * appeared in two pools must have its counts added rather than one of them dropped.
 */
export function mergeRaw(parts) {
  const files = {}
  let pass = 0
  let fail = 0
  for (const part of parts) {
    if (part === undefined || part === null || typeof part !== 'object') continue
    pass += part.pass ?? 0
    fail += part.fail ?? 0
    for (const [file, counts] of Object.entries(part.files ?? {})) {
      const row = (files[file] ??= { pass: 0, fail: 0 })
      row.pass += counts?.pass ?? 0
      row.fail += counts?.fail ?? 0
    }
  }
  return {
    pass,
    fail,
    total: pass + fail,
    files: Object.fromEntries(Object.entries(files).sort(([a], [b]) => (a < b ? -1 : 1))),
  }
}
