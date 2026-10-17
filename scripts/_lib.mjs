// Shared by the scripts in this folder. Nothing outside Node is imported AT LOAD TIME, and the
// one function below that needs a workspace package imports it inside itself for that reason.
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const useColor = process.stdout.isTTY && !process.env.NO_COLOR
const wrap = (code) => (s) => (useColor ? `[${code}m${s}[0m` : String(s))
export const bold = wrap(1)
export const dim = wrap(2)
export const red = wrap(31)
export const green = wrap(32)
export const yellow = wrap(33)

/** Run a command and return { ok, stdout, stderr, code }. Never throws. */
export function run(cmd, args, opts = {}) {
  try {
    const stdout = execFileSync(cmd, args, {
      cwd: opts.cwd ?? REPO,
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
      ...opts,
    })
    return { ok: true, stdout: stdout ?? '', stderr: '', code: 0 }
  } catch (err) {
    return {
      ok: false,
      stdout: err.stdout?.toString() ?? '',
      stderr: err.stderr?.toString() ?? String(err.message ?? err),
      code: typeof err.status === 'number' ? err.status : 1,
    }
  }
}

/**
 * Read one setting, preferring the real environment and falling back to .env.
 *
 * Deliberately tiny and deliberately not a dependency: the only settings these scripts read
 * are paths (D-086), never secrets. Secrets are read by the worker, at run time, and never
 * by tooling.
 */
export function setting(name) {
  if (process.env[name]) return process.env[name]
  let text
  try {
    text = readFileSync(join(REPO, '.env'), 'utf8')
  } catch {
    return undefined
  }
  for (const line of text.split('\n')) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line)
    if (match && match[1] === name) return match[2].trim().replace(/^["']|["']$/g, '')
  }
  return undefined
}

/**
 * The record a reading tool opens, under the ONE precedence every one of them shares: a `--db`
 * it was given, then `CUTROOM_DB_PATH`, then the service's `DEFAULT_DB_PATH`
 * (benchmark-view, Gate 2; S-204, S-205).
 *
 * It lives here rather than in `packages/benchmark-read` because the loader may not reach it:
 * `DEFAULT_DB_PATH` and `SETTING_NAMES` are exported by `@cutroom/service`, which is
 * `apps/service`, and `benchmark-read-no-engine` forbids that package `apps/`. So the order is
 * written down once, here, and the loader is HANDED a path it did not resolve — which is also
 * why the second copy of this order cannot drift from the first: there is no second copy.
 *
 * The import is made INSIDE the function on purpose. `scripts/check.mjs` loads this file under
 * plain node, where a top-level import of a TypeScript module would not load at all; a reader
 * that was given `--db` never reaches the import either.
 */
export async function databasePath(given) {
  if (given !== undefined) return given
  const { DEFAULT_DB_PATH, SETTING_NAMES } = await import('@cutroom/service')
  return process.env[SETTING_NAMES.dbPath] ?? DEFAULT_DB_PATH
}

/**
 * Every prefix a stored path may carry, for a reader that SERVES what it finds: the artifact
 * root — one setting with its default inside this repository (D-086) — and the repository root
 * itself. `packages/benchmark-read` strips both from every string that leaves it, so an
 * artifact path becomes a relative one (D-086) and no machine path reaches a page.
 *
 * It lives here for the same reason `databasePath` does, and is HANDED to the package for the
 * same reason a resolved record is: `SETTING_NAMES` is `@cutroom/service`'s — that is
 * `apps/service` — and `benchmark-read-no-engine` forbids the package `apps/` (benchmark-view,
 * Gate 2; S-204). **Rejected:** the package defaulting its roots from its own module URL, which
 * would be the package resolving a SETTING for itself — the artifact root is one setting per
 * generated path, not something derivable from where a module sits; and leaving the launcher to
 * pass none, which serves an absolute path out of a prompt, measured (this feature's finding
 * 33). The import is INSIDE the function for the reason above: `scripts/check.mjs` loads this
 * file under plain node.
 */
export async function artifactRoots() {
  const { SETTING_NAMES } = await import('@cutroom/service')
  return [process.env[SETTING_NAMES.artifactRoot] ?? join(REPO, '.artifacts'), REPO]
}

export function fail(message) {
  console.error(`\n${red('FAIL')}  ${message}\n`)
  process.exitCode = 1
}

export function pass(message) {
  console.log(`${green('ok')}    ${message}`)
}
