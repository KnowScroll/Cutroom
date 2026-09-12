import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { extname, join } from 'node:path'
import { test } from 'node:test'
import { REPO } from './_repo.ts'

// D-086, which exists because of a specific failure: the steering repository hardcoded a
// macOS media path, and a RATIFIED TEST depended on it. On this machine that path cannot
// exist, so the test could never pass and the config could never be right.
//
// Every path that points outside the repository is a setting with a default inside it.
// This test is how that is caught rather than remembered.

const CHECKED = new Set(['.ts', '.mts', '.js', '.mjs', '.cjs', '.json', '.yaml', '.yml', '.sh'])

// docs/ is excluded: the design documents are byte-identical copies of the originals in the
// steering repository (see docs/design/COPIED_FROM.json, enforced by `pnpm docs:check`).
// Editing one to satisfy a lint rule would break the comparison that keeps them honest.
const SKIP_PREFIX = ['docs/', 'steering-ref/', 'db/migrations/', 'pnpm-lock.yaml']

const PATTERNS: ReadonlyArray<readonly [RegExp, string]> = [
  [/[A-Za-z]:[\\/]{1,2}(Users|Program|Windows)/, 'a Windows drive-letter path'],
  [/\/Volumes\//, 'a macOS volume path'],
  [/\/Users\/[A-Za-z]/, 'a macOS or Linux home path'],
  [/\/home\/[a-z]/, 'a Linux home path'],
]

function trackedFiles(): string[] {
  const out = execFileSync('git', ['ls-files', '-z'], { cwd: REPO, encoding: 'utf8' })
  return out.split('\0').filter(Boolean)
}

test('no absolute, machine-specific path is committed', () => {
  const offenders: string[] = []

  for (const rel of trackedFiles()) {
    if (SKIP_PREFIX.some((p) => rel.startsWith(p))) continue
    if (!CHECKED.has(extname(rel))) continue
    if (rel === 'tests/no-absolute-paths.test.ts') continue

    const text = readFileSync(join(REPO, rel), 'utf8')
    const lines = text.split('\n')
    lines.forEach((line, i) => {
      for (const [pattern, what] of PATTERNS) {
        if (pattern.test(line)) offenders.push(`${rel}:${i + 1} — ${what}`)
      }
    })
  }

  assert.deepEqual(
    offenders,
    [],
    'D-086: one configured path per generated file, defaulting inside this repository.\n' +
      'Use an environment variable with a repo-relative default instead.\n' +
      offenders.join('\n'),
  )
})
