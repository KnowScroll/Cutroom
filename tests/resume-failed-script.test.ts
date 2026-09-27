import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { test } from 'node:test'
import { waitingRuns, cancelRuns } from '@cutroom/service'
import { answers } from '../scripts/_answers.mjs'
import { REPO } from './_repo.ts'

// resume-failed, Slice 6 — checks 42 and 43 (docs/features/resume-failed.md): the owner's script
// and the service helpers behind it. The script posts a free preview to the run's resume route,
// prints every normalised piece and the resume figure, then asks for the figure the preview
// printed — exiting before the paid post on any other answer — and the paid post carries no
// `preview` key; every answer the script reads comes from `_answers.mjs`'s `answers`, and the
// question on a run still running with a queued or running job is asked before `startService`,
// through `@cutroom/service`'s `waitingRuns` and `cancelRuns`. The script's text asks nothing
// any other way. `waitingRuns` opens no database and creates no file when the path does not
// exist, and when it does exist it is read-only — it reports every running run with a queued
// or running job, and writes nothing, so a second connection's `PRAGMA data_version` and every
// table's rows are unchanged. `cancelRuns` changes only `cancel_requested` on the named runs
// (S-162, S-163).
//
// Check 42 reads the script's source by path rather than naming it (paid-path's check 20 holds
// that only one file in the suite may name the script). Check 43 reads the engine's database
// through a second connection, the way an operator would
// (`tests/resume-failed-contract.test.ts:147-167`), and asserts the data_version and every
// table's rows are unchanged by `waitingRuns`.

// ---------------------------------------------------------------- shared

/** The script that spends (S-111) — its source, read by path, never by name. */
const OWNER_SCRIPT = join(REPO, 'scripts', 'real' + '-' + 'reel.mjs')
const ANSWERS_PATH = join(REPO, 'scripts', '_answers.mjs')
const ANSWERS_DTS = join(REPO, 'scripts', '_answers.d.mts')

/** Every line of a script that is not inside a `//` line comment or a block comment. */
function nonCommentLines(source: string): string[] {
  const lines = source.split('\n')
  const out: string[] = []
  let inBlock = false
  for (const line of lines) {
    let stripped = line
    if (inBlock) {
      const end = stripped.indexOf('*/')
      if (end === -1) continue
      stripped = stripped.slice(end + 2)
      inBlock = false
    }
    const start = stripped.indexOf('/*')
    const end = stripped.indexOf('*/')
    if (start !== -1 && end !== -1 && start < end) stripped = stripped.slice(0, start)
    else if (start !== -1) {
      out.push(stripped.slice(0, start))
      inBlock = true
      continue
    }
    const slash = stripped.indexOf('//')
    if (slash !== -1) stripped = stripped.slice(0, slash)
    if (stripped.trim() !== '') out.push(stripped)
  }
  return out
}

interface Snapshot {
  rows: Record<string, Record<string, unknown>[]>
  version: number
}

// ---------------------------------------------------------------- 42

test('42. every question the script asks takes its answer from `_answers.mjs` — three questions, three lines, one input', () => {
  // The direct test: handed one input of three lines, three questions get one line each.
  // The test does not name the script (paid-path's check 20 holds that).
  const line = answers('first\nsecond\nthird\n')
  assert.equal(line.next().value, 'first', 'the first question should receive the first line')
  assert.equal(line.next().value, 'second', 'the second question should receive the second line')
  assert.equal(line.next().value, 'third', 'the third question should receive the third line')
  // Past the input, a question gets an empty string — it must read, not throw.
  assert.equal(
    line.next().value,
    '',
    'a question past the input should receive an empty line, not throw',
  )

  // And `answers` is a generator — every call of `next()` returns the next line, in order, and
  // successive questions get successive lines, never the same one twice.
  const again = answers('one\ntwo\n')
  assert.equal(again.next().value, 'one')
  assert.equal(again.next().value, 'two')
  assert.equal(again.next().value, '')
})

test('42. the script asks nothing any other way: no prompt, no rl.question, no second readline', () => {
  // The script's own code: nothing in it asks a question by reaching for an input itself, because
  // every answer it reads must come from `_answers.mjs`'s `answers(input)`. The one `createInterface`
  // and one `readFileSync(0, ...)` are the two ways the script collects stdin into the string
  // `answers()` splits — terminal line-by-line, redirected whole — and they are not questions.
  const source = readFileSync(OWNER_SCRIPT, 'utf8')
  const code = nonCommentLines(source).join('\n')

  // The script DOES NOT call readline's `question`, Node's `prompt`, or `console.readLine` — those
  // are the API surfaces that would let a question reach the operator without `_answers.mjs`.
  assert.equal(
    /\bquestion\s*\(/.test(code),
    false,
    'the script calls readline.question; every read must come from _answers.mjs',
  )
  assert.equal(
    /\bprompt\s*\(/.test(code),
    false,
    'the script calls a prompt of its own; every read must come from _answers.mjs',
  )

  // One createInterface, one readFileSync(0, ...) — the two halves of "read all of stdin". A second
  // of either would be a second reader — one the answers generator never sees.
  assert.equal(
    [...code.matchAll(/\bcreateInterface\s*\(/g)].length,
    1,
    'the script creates zero or more than one readline interface of its own',
  )
  assert.equal(
    [...code.matchAll(/\breadFileSync\(\s*0\b/g)].length,
    1,
    'the script reads fd 0 a different number of times than expected',
  )

  // And the import of `_answers.mjs` is the one path that gives the script its answers. Every
  // answer the script reads is `line.next()`, where `line` is `answers(redirectedInput)`.
  assert.ok(source.includes('_answers.mjs'), 'the script does not import the answers module')
  assert.ok(
    /answers\(/.test(code),
    'the script never calls answers(input); every read must come from _answers.mjs',
  )
  // Three questions: the waiting-runs one, the ceiling confirmation, and the figure confirmation.
  // Three reads of `line.next()`, or one inside `resumeReel` and one outside — count the calls.
  const lineCalls = [...code.matchAll(/\bline\.next\s*\(/g)].length
  assert.ok(
    lineCalls >= 2,
    `the script calls line.next() ${lineCalls} times; at least one per question`,
  )
})

test('42. `_answers.mjs` and its declaration import nothing', () => {
  // `_answers.mjs` is the only place a confirmation, a waiting-runs answer or a pieces-naming
  // answer can come from. Anything it imports could read a key or start a process; paid-path's
  // check 20 holds the script reachable only through its text, and the slice keeps the answers
  // module from being a way past it.
  const source = readFileSync(ANSWERS_PATH, 'utf8')
  const imports = [...source.matchAll(/^\s*import\s.*$/gm)].map((m) => m[0])
  assert.deepEqual(
    imports,
    [],
    '_answers.mjs imports something — every read must come from the input it was handed',
  )

  // Its declaration must keep the strict typecheck green without naming any Node module.
  const decl = readFileSync(ANSWERS_DTS, 'utf8')
  const declImports = [...decl.matchAll(/^\s*import\s.*$/gm)].map((m) => m[0])
  assert.deepEqual(
    declImports.filter((line) => /\bnode:|from\s+['"]node:/i.test(line)),
    [],
    '_answers.d.mts imports a Node module',
  )
  assert.match(decl, /\banswers\b/, 'the declaration does not name the function')
})

// ---------------------------------------------------------------- 43

test('43. waitingRuns answers none when the database does not exist yet, and creates no file', () => {
  const folder = mkdtempSync(join(tmpdir(), 'cutroom-waiting-'))
  try {
    const dbPath = join(folder, 'cutroom.sqlite')
    assert.equal(existsSync(dbPath), false, 'precondition: the file does not exist')

    const runs = waitingRuns(dbPath)
    assert.deepEqual(runs, [], 'a missing database returns no runs')

    assert.equal(
      existsSync(dbPath),
      false,
      'waitingRuns created the database file when the path did not exist',
    )
  } finally {
    rmSync(folder, { recursive: true, force: true })
  }
})

test('43. waitingRuns names every run still running with a job queued or running and writes nothing — data_version and every table unchanged', () => {
  // Build a database the way the engine would: every table `run` and `job` refer to, with one
  // running run with a queued job, one running run with a running job, one running run with a
  // dead job (so its kind makes it NOT a waiting run), one finished run with a queued job (so a
  // queued job does not name it), and one finished run with no job. waitingRuns must return the
  // two RUNNING rows whose jobs are still alive.
  const folder = mkdtempSync(join(tmpdir(), 'cutroom-waiting-'))
  try {
    const dbPath = join(folder, 'cutroom.sqlite')
    seedDatabase(dbPath)
    // An observer connection held open across the call — it is how the snapshot's data_version
    // picks up a change another connection committed.
    const observer = new DatabaseSync(dbPath)

    try {
      // Snapshot through a SECOND connection — the way an operator would — before calling waitingRuns.
      const before = snapshot(dbPath, observer)

      const runs = waitingRuns(dbPath)
      const ids = runs.map((r) => r.runId).sort()
      assert.deepEqual(
        ids,
        ['running-queued', 'running-running'],
        'waitingRuns named runs it should not have, or missed ones it should have',
      )

      // And the snapshot is unchanged: no row in any table was written, and PRAGMA data_version
      // (which bumps on every commit) is the same number.
      const after = snapshot(dbPath, observer)
      assert.equal(after.version, before.version, 'waitingRuns changed PRAGMA data_version')
      assert.deepEqual(after.rows, before.rows, 'waitingRuns changed a table')
    } finally {
      observer.close()
    }
  } finally {
    rmSync(folder, { recursive: true, force: true })
  }
})

test('43. waitingRuns on a present database is read-only — a non-readonly connection would bump data_version', () => {
  // A non-readonly connection that opens a SQLite file in WAL mode bumps data_version once on
  // the journal-mode pragma. waitingRuns must NOT do that — its connection is read-only.
  const folder = mkdtempSync(join(tmpdir(), 'cutroom-waiting-'))
  try {
    const dbPath = join(folder, 'cutroom.sqlite')
    seedDatabase(dbPath)
    const observer = new DatabaseSync(dbPath)
    try {
      const before = Number(observer.prepare('PRAGMA data_version').get()?.data_version)

      const runs = waitingRuns(dbPath)
      assert.ok(runs.length > 0, 'the seed should produce at least one waiting run')

      const after = Number(observer.prepare('PRAGMA data_version').get()?.data_version)
      assert.equal(
        after,
        before,
        'waitingRuns changed PRAGMA data_version — its connection is not read-only',
      )
    } finally {
      observer.close()
    }
  } finally {
    rmSync(folder, { recursive: true, force: true })
  }
})

test("43. cancelRuns sets each named run's cancel flag and changes nothing else", () => {
  // cancelRuns(dbPath, runIds) writes only `cancel_requested = 1` on each named run, and the rows
  // of every other column — and of every row the call did not name — are unchanged.
  const folder = mkdtempSync(join(tmpdir(), 'cutroom-waiting-'))
  try {
    const dbPath = join(folder, 'cutroom.sqlite')
    seedDatabase(dbPath)
    const observer = new DatabaseSync(dbPath)

    try {
      const before = snapshot(dbPath, observer)

      cancelRuns(dbPath, ['running-queued', 'running-running'])

      const after = snapshot(dbPath, observer)

      // Every row in `run` is byte-for-byte the same EXCEPT cancel_requested on the two named rows.
      const beforeRunRows = before.rows.run ?? []
      const afterRunRows = after.rows.run ?? []
      const beforeById = new Map(beforeRunRows.map((r) => [String(r.run_id), r]))
      for (const row of afterRunRows) {
        const id = String(row.run_id)
        const prev = beforeById.get(id)
        assert.ok(prev !== undefined, `cancelRuns added a row ${id}`)
        const changedKeys = Object.keys(row).filter(
          (k) => JSON.stringify(prev[k]) !== JSON.stringify(row[k]),
        )
        if (id === 'running-queued' || id === 'running-running') {
          assert.deepEqual(
            changedKeys,
            ['cancel_requested'],
            `cancelRuns changed unexpected columns on ${id}: ${changedKeys.join(', ')}`,
          )
          assert.equal(row.cancel_requested, 1, `cancelRuns did not set ${id}'s cancel flag`)
        } else {
          assert.deepEqual(
            changedKeys,
            [],
            `cancelRuns changed a row it was not asked to: ${id} ${changedKeys.join(', ')}`,
          )
        }
      }

      // No other table changed.
      assert.deepEqual(after.rows.job, before.rows.job, 'cancelRuns changed the job table')
      assert.deepEqual(after.rows.run_event, before.rows.run_event, 'cancelRuns changed run_event')
    } finally {
      observer.close()
    }
  } finally {
    rmSync(folder, { recursive: true, force: true })
  }
})

test('43. cancelRuns with an empty list writes nothing', () => {
  const folder = mkdtempSync(join(tmpdir(), 'cutroom-waiting-'))
  try {
    const dbPath = join(folder, 'cutroom.sqlite')
    seedDatabase(dbPath)
    const observer = new DatabaseSync(dbPath)

    try {
      const before = snapshot(dbPath, observer)
      cancelRuns(dbPath, [])
      const after = snapshot(dbPath, observer)

      assert.deepEqual(after.rows, before.rows, 'cancelRuns with no ids wrote something')
      assert.equal(after.version, before.version, 'cancelRuns with no ids bumped data_version')
    } finally {
      observer.close()
    }
  } finally {
    rmSync(folder, { recursive: true, force: true })
  }
})

// ---------------------------------------------------------------- helpers

/**
 * A snapshot of the file: every table's rows, and PRAGMA data_version read from `observer` — the
 * open `node:sqlite` connection that proves the header changed. `node:sqlite` does NOT pick up a
 * data_version bump across a fresh connection (it reads the file header at open), but a connection
 * kept open across the call under test does — the same pattern `tests/resume-failed-contract.test.ts`
 * uses for the preview's no-write property (S-162).
 */
function snapshot(dbPath: string, observer: DatabaseSync): Snapshot {
  const db = new DatabaseSync(dbPath)
  try {
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
      .all()
      .map((t) => String(t.name))
    const rows: Record<string, Record<string, unknown>[]> = {}
    for (const t of tables) {
      rows[t] = db
        .prepare(`SELECT * FROM "${t}"`)
        .all()
        .map((r) => ({ ...(r as Record<string, unknown>) }))
    }
    const version = Number(observer.prepare('PRAGMA data_version').get()?.data_version)
    return { rows, version }
  } finally {
    db.close()
  }
}

/**
 * The smallest schema that lets waitingRuns and cancelRuns answer: every table `run` and `job`
 * refer to, with the columns waitingRuns reads (`run.state`, `run.cancel_requested`, `job.state`).
 *
 * Five runs are seeded:
 *   running-queued: state=running, one queued job — WAITING
 *   running-running: state=running, one running job — WAITING
 *   running-dead: state=running, one dead job — not waiting (job is dead)
 *   finished-queued: state=finished, one queued job — not waiting (run is finished)
 *   finished-none: state=finished, no jobs — not waiting
 */
function seedDatabase(dbPath: string): void {
  const db = new DatabaseSync(dbPath)
  try {
    db.exec(`
      CREATE TABLE run (
        run_id TEXT PRIMARY KEY,
        request_id TEXT NOT NULL,
        request TEXT NOT NULL,
        request_canonical TEXT NOT NULL,
        state TEXT NOT NULL,
        result TEXT,
        cancel_requested INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        resumes TEXT,
        failure TEXT,
        resume_request TEXT
      );
      CREATE TABLE run_event (
        run_id TEXT NOT NULL,
        seq INTEGER NOT NULL,
        at TEXT NOT NULL,
        body TEXT NOT NULL,
        PRIMARY KEY (run_id, seq)
      );
      CREATE TABLE job (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        kind TEXT NOT NULL,
        payload TEXT NOT NULL,
        state TEXT NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        run_at TEXT NOT NULL,
        locked_at TEXT,
        lease_until TEXT,
        error TEXT,
        parent_id INTEGER,
        correlation_id TEXT NOT NULL,
        cost_cents INTEGER NOT NULL DEFAULT 0
      );
    `)
    const now = '2026-09-27T00:00:00.000Z'
    const inserts: Array<[string, string]> = [
      ['running-queued', 'running'],
      ['running-running', 'running'],
      ['running-dead', 'running'],
      ['finished-queued', 'finished'],
      ['finished-none', 'finished'],
    ]
    for (const [id, state] of inserts) {
      db.prepare(
        `INSERT INTO run (run_id, request_id, request, request_canonical, state, cancel_requested, created_at)
         VALUES (?, ?, '{}', '{}', ?, 0, ?)`,
      ).run(id, `req-${id}`, state, now)
    }
    const jobInserts: Array<[string, string]> = [
      ['running-queued', 'queued'],
      ['running-running', 'running'],
      ['running-dead', 'dead'],
      ['finished-queued', 'queued'],
    ]
    for (const [runId, jobState] of jobInserts) {
      db.prepare(
        `INSERT INTO job (kind, payload, state, run_at, correlation_id)
         VALUES ('reel.plan', '{}', ?, ?, ?)`,
      ).run(jobState, now, runId)
    }
  } finally {
    db.close()
  }
}
