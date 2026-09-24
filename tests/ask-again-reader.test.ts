import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import {
  closeDatabase,
  openDatabase,
  recordRefusedAnswer,
  submitRun,
} from '../packages/domain/src/index.ts'
import { REPO } from './_repo.ts'
import { stillsRequest } from './engine/stills.ts'

// ask-again, Slice 5 — check 22 (docs/features/ask-again.md): THE READER. `scripts/refused.mjs`
// prints what a model wrote that could not be read, for one run, from a database it opens read-only
// (S-156, D-022, D-086). It spends nothing and reads no environment file.

const READER = 'scripts/refused.mjs'

function reader(...args: string[]) {
  return spawnSync(
    process.execPath,
    ['--experimental-strip-types', '--no-warnings', READER, ...args],
    { cwd: REPO, encoding: 'utf8' },
  )
}

test("22. scripts/refused.mjs, against a temporary database holding two runs and named by --db, prints each refused answer of the named run — role, call, about, ask, reasons, answer — and nothing of the other; leaves the database file's bytes unchanged; given a --db path that does not exist, exits non-zero and creates nothing; and names no environment file", () => {
  const dir = mkdtempSync(join(tmpdir(), 'cutroom-reader-'))
  try {
    const path = join(dir, 'cutroom.sqlite')
    const db = openDatabase(path)
    const ours = submitRun(db, stillsRequest('req-reader-a'), '{}').runId
    const theirs = submitRun(db, stillsRequest('req-reader-b'), '{}').runId
    const stars = { label: 'scattered stars', count: -1 }
    recordRefusedAnswer(db, {
      runId: ours,
      refusal: {
        port: 'model',
        role: 'witness',
        call: 'observe',
        about: ['a1-shot-1-single'],
        ask: 1,
        reasons: ['entities.0.count: Too small: expected number to be >0'],
        answer: JSON.stringify({ entities: [stars] }),
      },
    })
    recordRefusedAnswer(db, {
      runId: ours,
      refusal: {
        port: 'speech',
        role: null,
        call: null,
        about: ['a1-shot-0-narration'],
        ask: 1,
        reasons: ['(timings): the timings give 1 words'],
        answer: 'the words the provider timed, as it gave them',
      },
    })
    recordRefusedAnswer(db, {
      runId: theirs,
      refusal: {
        port: 'model',
        role: 'planner',
        call: 'structured',
        about: [],
        ask: 2,
        reasons: ['zq-another-run-reason'],
        answer: '{"zq":"another run"}',
      },
    })
    closeDatabase(db)
    const before = readFileSync(path)

    const printed = reader(ours, '--db', path)
    assert.equal(printed.status, 0, printed.stderr)
    const out = printed.stdout
    assert.match(out, new RegExp(`refused answers\\s+run ${ours}\\s+2`))
    assert.match(out, /witness observe\s+about a1-shot-1-single\s+ask 1/)
    assert.match(out, /entities\.0\.count: Too small: expected number to be >0/)
    assert.match(out, /"label": "scattered stars"/)
    assert.match(out, /"count": -1/)
    assert.match(out, /narration timings\s+about a1-shot-0-narration\s+ask 1/)
    assert.match(out, /the words the provider timed, as it gave them/)
    assert.doesNotMatch(out, /zq/, 'the other run was printed')

    assert.ok(readFileSync(path).equals(before), 'reading the database changed its bytes')

    const missing = join(dir, 'missing.sqlite')
    const refused = reader(ours, '--db', missing)
    assert.notEqual(refused.status, 0, 'a missing database was read as an empty one')
    assert.equal(existsSync(missing), false, 'a wrong path created a database')

    const source = readFileSync(join(REPO, READER), 'utf8')
    for (const named of ['loadEnvFile', 'DEFAULT_ENV_FILE', 'CUTROOM_ENV_FILE']) {
      assert.ok(!source.includes(named), `the reader names ${named}`)
    }
    // The file itself, by name — not `process.env`, which is how it reads CUTROOM_DB_PATH.
    assert.doesNotMatch(source, /['"`/\\]\.env\b/, 'the reader names an environment file')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
