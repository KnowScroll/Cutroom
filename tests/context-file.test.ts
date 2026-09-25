import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { REPO } from './_repo.ts'

// docs/context.md is what an agent reads before anything else (S-160): where things stand, every
// real run, and what changed where. It saves reading only while it is current and small, so:
//
// - its four sections are present, in order;
// - it is at most 300 lines, which keeps reading it cheaper than looking round;
// - its newest change is the session of JOURNAL.md's newest entry, so a session that writes its
//   journal entry and leaves this file as it was is red.

const read = (...parts: string[]) =>
  readFileSync(join(REPO, ...parts), 'utf8').replace(/\r\n/g, '\n')

const SECTIONS = ['## Where things stand', '## Runs', '## Changes', '## Where to look']
const MAX_LINES = 300

/** The session number a heading names, or NaN when it names none. */
const sessionOf = (heading: string | undefined) =>
  Number(/\bsession (\d+)\b/.exec(heading ?? '')?.[1] ?? Number.NaN)

test('S-160. docs/context.md has its four sections, in order', () => {
  const lines = read('docs', 'context.md').split('\n')
  const at = SECTIONS.map((s) => lines.indexOf(s))
  for (const [i, section] of SECTIONS.entries()) {
    assert.ok(at[i]! >= 0, `docs/context.md has no line '${section}'`)
  }
  assert.deepEqual(
    [...at].sort((a, b) => a - b),
    at,
    `docs/context.md's sections are out of order: ${SECTIONS.join(', ')}`,
  )
})

test('S-160. docs/context.md is at most 300 lines', () => {
  const count = read('docs', 'context.md').trimEnd().split('\n').length
  assert.ok(count <= MAX_LINES, `docs/context.md is ${count} lines; drop its oldest changes`)
})

test("S-160. docs/context.md's newest change is the session of JOURNAL.md's newest entry", () => {
  const journal = read('JOURNAL.md')
    .split('\n')
    .filter((l) => /^## \d{4}-\d{2}-\d{2}\b/.test(l))
    .at(-1)
  const context = read('docs', 'context.md').split('\n')
  const newest = context.slice(context.indexOf('## Changes')).find((l) => l.startsWith('### '))
  const [want, got] = [sessionOf(journal), sessionOf(newest)]
  assert.ok(Number.isInteger(want), `JOURNAL.md's newest entry names no session: ${journal}`)
  assert.equal(
    got,
    want,
    `docs/context.md's newest change is '${newest}', and JOURNAL.md's newest entry is session ${want}: ` +
      'write the session under Changes, and correct any line its work made untrue',
  )
})
