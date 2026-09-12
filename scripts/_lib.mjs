// Shared by the scripts in this folder. No dependencies outside Node.
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

export function fail(message) {
  console.error(`\n${red('FAIL')}  ${message}\n`)
  process.exitCode = 1
}

export function pass(message) {
  console.log(`${green('ok')}    ${message}`)
}
