import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { extname, join } from 'node:path'
import { test } from 'node:test'
import { repoFiles } from './_files.ts'
import { REPO } from './_repo.ts'

// §8 of the bootstrap prompt, and an afternoon lost to it:
//
//   sed, awk and grep in Git Bash STRIP \r ON READ, so they lie about line endings. And \r
//   is a JavaScript line terminator, so `.` in a regex does not match it — a pattern that
//   looks like it must match a line can silently fail on a CRLF file.
//
// So this test counts bytes. It never reads a line.
//
// .gitattributes (`* text=auto eol=lf`) is what makes this pass on a Windows checkout with
// core.autocrlf=true. If this test fails, the fix is that file, not this one.

const TEXT = new Set([
  '.ts',
  '.mts',
  '.cts',
  '.js',
  '.mjs',
  '.cjs',
  '.json',
  '.md',
  '.yaml',
  '.yml',
  '.sh',
  '.toml',
  '.txt',
])

test('no text file in the working copy contains a carriage return', () => {
  const offenders: string[] = []

  // S-195: tracked AND untracked-not-ignored. A new file is where a stray CRLF comes from, and it
  // is untracked exactly while the checks that should catch it are running.
  for (const rel of repoFiles(REPO)) {
    const base = rel.split('/').pop() ?? rel
    const isDotfile = base.startsWith('.') && !extname(base)
    if (!TEXT.has(extname(rel)) && !isDotfile) continue
    if (rel.startsWith('steering-ref/')) continue

    // docs/design/ holds byte-faithful copies of documents owned by the steering repository,
    // and contentions.md contains a LONE CR on purpose — a code span holding the literal
    // carriage return it is warning about. `pnpm docs:check` is what guards those files, and
    // editing one to satisfy this test would break the comparison that keeps them honest.
    if (rel.startsWith('docs/design/')) continue

    const bytes = readFileSync(join(REPO, rel))
    let carriageReturns = 0
    for (const byte of bytes) if (byte === 0x0d) carriageReturns += 1
    if (carriageReturns > 0) offenders.push(`${rel} (${carriageReturns} CR bytes)`)
  }

  assert.deepEqual(
    offenders,
    [],
    'These files have CRLF line endings in the working tree. Fix with:\n' +
      '  git add --renormalize .\n' +
      'and check .gitattributes is present. Do not relax this test.\n' +
      offenders.join('\n'),
  )
})

test('the shell hooks are LF, because bash cannot run them otherwise', () => {
  for (const hook of ['.claude/hooks/session-start.sh', '.claude/hooks/stop-gate.sh']) {
    const bytes = readFileSync(join(REPO, hook))
    assert.ok(
      !bytes.includes(0x0d),
      `${hook} contains CR. bash fails with: $'\\r': command not found`,
    )
  }
})
