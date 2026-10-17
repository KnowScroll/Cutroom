import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { test } from 'node:test'
import { DEFAULT_DB_PATH } from '../apps/service/src/index.ts'
import {
  TABLES,
  artifactScrubber,
  joinKeyOf,
  openRecord,
  orderOf,
} from '../packages/benchmark-read/src/index.ts'
import { closeDatabase, openDatabase } from '../packages/domain/src/index.ts'
import { databasePath } from '../scripts/_lib.mjs'
import { REPO } from './_repo.ts'

// benchmark-view, Slice 1 — checks 1, 2, 4 and 5 (docs/features/benchmark-view.md, Gate 3): THE
// SHARED ROW LOADER. `packages/benchmark-read` holds the one read-only open of a path it is
// HANDED, the held column set per table, the row selection and the artifact-prefix and URL
// scrubber; `scripts/benchmark.mjs` calls it instead of opening the database itself; and the
// precedence `--db` → `CUTROOM_DB_PATH` → `DEFAULT_DB_PATH` lives once in `scripts/_lib.mjs`,
// which the loader may not reach because `benchmark-read-no-engine` forbids it `apps/`
// (S-204, S-205).
//
// Check 1. `One open, and it is the loader's. packages/benchmark-read's source holds exactly one
// new DatabaseSync(, and it carries { readOnly: true }; scripts/benchmark.mjs holds none.`
//
// Check 2. `The path's precedence, and that reading cannot write. The precedence is asserted over
// scripts/_lib.mjs' resolver, driven through both scripts as children, against three temporary
// databases holding different numbers of runs, so a wrong precedence gives a different count
// rather than the same one: --db wins over CUTROOM_DB_PATH, which wins over DEFAULT_DB_PATH. A
// write through the loader's handle throws. The database file's bytes are identical after a full
// load.`
//
// Check 4. `The held column set, pinned clause by clause — new coverage this feature builds. For
// run and for each of TABLES' twenty tables in the order scripts/benchmark.mjs:68-89 lists them,
// the loader's held set equals the pinned list. A column named in the pinned list with no column
// behind it in packages/domain/src/schema.ts fails; a column dropped from the loader fails.`
//
// Check 5. `Row selection. The join key is correlation_id for job and run_id for the other
// nineteen; the order is seq for run_event and rowid otherwise; with no run named, run ids come
// back ORDER BY created_at, run_id.`
//
// And one guard that is NOT a numbered check: the scrubber FUNCTION. Gate 4 moves the scrubber
// into this package in Slice 1 while Gate 3 puts its only check — check 9 — in Slice 3, so from
// this commit `packages/benchmark-read`'s `artifactScrubber` is the only redaction this
// repository performs (`scripts/benchmark.mjs:199` builds `redact` out of it, `:809` passes every
// string of the written record through it) and a break of it was measured to turn nothing red.
// **Check 9 is still Slice 3's and is not done here**: it is the scrubber on the way out of a
// served payload and the served HTML, which neither exists yet.
//
// Nothing here spends, reaches a provider, reads a key, starts the engine or touches the real
// record: every database below is a temporary one, and `data/cutroom.sqlite` is never opened.

const READER = 'scripts/benchmark.mjs'
const LOADER = join('packages', 'benchmark-read')
const FIXTURES = join(REPO, 'tests', 'fixtures', 'benchmark', 'ratings')

/**
 * Every table one run's rows are read from, in the order the reader listed them before the list
 * moved into the loader with the open (`scripts/benchmark.mjs:68-89`, before this slice).
 */
const TABLE_ORDER = [
  'run_event',
  'job',
  'plan',
  'model_receipt',
  'picture',
  'observation',
  'reconciliation',
  'generation_receipt',
  'lost_call',
  'refused_answer',
  'degradation',
  'narration',
  'speech_receipt',
  'take',
  'video_receipt',
  'take_observation',
  'take_reconciliation',
  'render',
  'hold',
  'still_hold',
] as const

/**
 * The held column set, CLAUSE BY CLAUSE, in the order `pragma_table_info` returns them — which is
 * the order `packages/domain/src/schema.ts` declares them in. This is the scan S-200 and S-201
 * both said already existed and that S-203 found does not: before it, a column could leave the
 * schema, or arrive in it, and no check of the reader would have moved.
 */
const HELD: Record<string, readonly string[]> = {
  run: [
    'run_id',
    'request_id',
    'request',
    'request_canonical',
    'state',
    'result',
    'cancel_requested',
    'created_at',
    'resumes',
    'failure',
    'resume_request',
  ],
  run_event: ['run_id', 'seq', 'at', 'body'],
  job: [
    'id',
    'kind',
    'payload',
    'state',
    'attempts',
    'run_at',
    'locked_at',
    'lease_until',
    'error',
    'parent_id',
    'correlation_id',
    'cost_cents',
  ],
  plan: [
    'run_id',
    'role',
    'unit_count',
    'axis',
    'plan',
    'verdict',
    'score',
    'estimate_cents',
    'selected',
  ],
  model_receipt: [
    'id',
    'run_id',
    'role',
    'model',
    'temperature',
    'input_tokens',
    'output_tokens',
    'fake',
    'at',
    'call',
    'picture_ids',
    'take_ids',
  ],
  picture: [
    'run_id',
    'picture_id',
    'seq',
    'attempt',
    'shot_unit',
    'subject_id',
    'role',
    'label',
    'path',
    'prompt',
    'framing',
    'reference_ids',
    'measure',
    'words',
    'gate1',
    'score',
    'gate1s',
    'degradation',
    'chosen',
    'kept_from',
  ],
  observation: ['id', 'run_id', 'picture_id', 'observation'],
  reconciliation: ['id', 'run_id', 'picture_id', 'answer', 'failed'],
  generation_receipt: [
    'id',
    'run_id',
    'picture_id',
    'model',
    'prompt',
    'reference_ids',
    'style_id',
    'style_version',
    'rate_cents',
    'cost_cents',
    'fake',
    'degraded',
    'at',
  ],
  lost_call: ['id', 'run_id', 'port', 'model', 'cost_cents', 'detail', 'at'],
  refused_answer: [
    'id',
    'run_id',
    'port',
    'role',
    'call',
    'about',
    'ask',
    'reasons',
    'answer',
    'at',
  ],
  degradation: ['run_id', 'shot_id', 'gate', 'reason'],
  narration: [
    'run_id',
    'narration_id',
    'attempt',
    'shot_unit',
    'text',
    'path',
    'words',
    'probe',
    'kept_from',
  ],
  speech_receipt: [
    'id',
    'run_id',
    'narration_id',
    'model',
    'characters',
    'rate_cents',
    'cost_cents',
    'fake',
    'at',
    'transient_errors',
  ],
  take: [
    'run_id',
    'take_id',
    'attempt',
    'shot_unit',
    'number',
    'mode',
    'picture_id',
    'degraded',
    'prompt',
    'requested_seconds',
    'seed',
    'request_id',
    'expanded_prompt',
    'path',
    'probe',
    'scan',
    'words',
    'sound',
    'verdicts',
    'outcome',
    'degradation',
    'kept_from',
  ],
  video_receipt: [
    'id',
    'run_id',
    'take_id',
    'model',
    'mode',
    'resolution',
    'requested_seconds',
    'aspect_ratio',
    'seed',
    'request_id',
    'prompt',
    'expanded_prompt',
    'expansion_mode',
    'style_id',
    'style_version',
    'rate_cents',
    'cost_cents',
    'fake',
    'degraded',
    'at',
    'transient_errors',
  ],
  take_observation: ['id', 'run_id', 'take_id', 'observation'],
  take_reconciliation: ['id', 'run_id', 'take_id', 'answer', 'failed'],
  render: [
    'run_id',
    'render_id',
    'attempt',
    'render_manifest',
    'hash',
    'path',
    'profile',
    'invocations',
    'measure',
    'started_at',
    'finished_at',
    'gate7',
  ],
  hold: ['run_id', 'render_id', 'shot_id', 'seconds', 'reason'],
  still_hold: ['run_id', 'shot_id', 'attempt', 'picture_id', 'probe', 'take_ids', 'reason'],
}

/** Every `.ts` file of the loader package, by repository-relative path and its text. */
function loaderSources(): Array<[string, string]> {
  const out: Array<[string, string]> = []
  const walk = (at: string) => {
    for (const entry of readdirSync(join(REPO, at), { withFileTypes: true })) {
      const child = join(at, entry.name)
      if (entry.isDirectory()) walk(child)
      else if (entry.name.endsWith('.ts'))
        out.push([child, readFileSync(join(REPO, child), 'utf8')])
    }
  }
  walk(join(LOADER, 'src'))
  assert.ok(out.length > 0, `${LOADER}/src holds no TypeScript file, so this scan reads nothing`)
  return out
}

/** A value as SQLite takes it: a boolean as 0 or 1, an object as the JSON text a column holds. */
function bound(value: unknown): string | number | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'boolean') return value ? 1 : 0
  if (typeof value === 'object') return JSON.stringify(value)
  return value as string | number
}

/** A migrated, empty temporary record. The domain's opener is the thing the loader never uses. */
function emptyRecord(label: string): { dir: string; path: string } {
  const dir = mkdtempSync(join(tmpdir(), `cutroom-loader-${label}-`))
  const path = join(dir, 'cutroom.sqlite')
  closeDatabase(openDatabase(path))
  return { dir, path }
}

/**
 * A temporary record holding the named worked fixtures' rows, migrated by the domain's opener and
 * then filled as the schema stores them. A surrogate integer `id` is left out so two fixtures'
 * rows cannot collide on one.
 */
function recordHolding(names: readonly string[]): { dir: string; path: string } {
  const made = emptyRecord('runs')
  const db = new DatabaseSync(made.path)
  try {
    for (const name of names) {
      const fixture = JSON.parse(
        readFileSync(join(FIXTURES, `constructed-${name}.json`), 'utf8'),
      ) as Record<string, unknown>
      for (const table of ['run', ...TABLE_ORDER]) {
        const holds = fixture[table]
        const rows = (Array.isArray(holds) ? holds : holds === undefined ? [] : [holds]) as Array<
          Record<string, unknown>
        >
        for (const row of rows) {
          const columns = Object.keys(row).filter(
            (column) => !(column === 'id' && typeof row[column] === 'number'),
          )
          db.prepare(
            `INSERT INTO ${table} (${columns.map((c) => `"${c}"`).join(', ')}) ` +
              `VALUES (${columns.map(() => '?').join(', ')})`,
          ).run(...columns.map((column) => bound(row[column])))
        }
      }
    }
  } finally {
    db.close()
  }
  return made
}

function reader(args: string[], env?: Record<string, string | undefined>) {
  const result = spawnSync(
    process.execPath,
    ['--experimental-strip-types', '--no-warnings', READER, ...args],
    {
      cwd: REPO,
      encoding: 'utf8',
      env: env === undefined ? process.env : { ...process.env, ...env },
      maxBuffer: 64 * 1024 * 1024,
    },
  )
  return { status: result.status, out: result.stdout, err: result.stderr }
}

/** Every file of a directory with its bytes, so "nothing moved" is the whole directory. */
function treeOf(dir: string): Array<[string, string]> {
  return readdirSync(dir)
    .sort()
    .map((name) => [name, readFileSync(join(dir, name)).toString('base64')] as [string, string])
}

// ---------------------------------------------------------------- 1

test("1. One open, and it is the loader's", () => {
  // The count is EXACT on both sides. "At least one" is what a second open satisfies, and zero
  // in the script is what a wrapper around a second open would satisfy — so the script's own
  // count is asserted at zero rather than merely left unmentioned.
  const sources = loaderSources()
  const joined = sources.map(([, text]) => text).join('\n')
  assert.equal(
    (joined.match(/new DatabaseSync\(/g) ?? []).length,
    1,
    `${LOADER} opens a database other than once:\n${sources.map(([file]) => file).join('\n')}`,
  )
  assert.match(joined, /new DatabaseSync\([^)]*\{ readOnly: true \}\)/, 'not opened read-only')

  // And it is in ONE file, so the single count cannot be two halves of a split open.
  const opening = sources.filter(([, text]) => text.includes('new DatabaseSync('))
  assert.equal(opening.length, 1, opening.map(([file]) => file).join(', '))

  const script = readFileSync(join(REPO, READER), 'utf8')
  assert.equal(
    (script.match(/new DatabaseSync\(/g) ?? []).length,
    0,
    'the reader still opens a database itself',
  )
  assert.ok(script.includes('@cutroom/benchmark-read'), 'the reader does not call the loader')
})

// ---------------------------------------------------------------- 2

test("2. The path's precedence, and that reading cannot write", async () => {
  // THREE records holding DIFFERENT NUMBERS OF RUNS. Three records holding the same rows is the
  // lazy version of this check: every precedence passes it, because every answer prints the same
  // count. Here a wrong precedence prints a different number of runs.
  const one = recordHolding(['dead-in-plan'])
  const two = recordHolding(['dead-in-plan', 'completed'])
  const three = recordHolding(['dead-in-plan', 'completed', 'stopped-at-gate-1'])
  const out = mkdtempSync(join(tmpdir(), 'cutroom-loader-out-'))
  const held = process.env.CUTROOM_DB_PATH
  try {
    // --db wins over CUTROOM_DB_PATH: one run, not three.
    const named = reader(['--db', one.path, '--out', join(out, 'one.json')], {
      CUTROOM_DB_PATH: three.path,
    })
    assert.equal(named.status, 0, named.err)
    assert.match(named.out, /\b1 runs\b/, named.out)

    // CUTROOM_DB_PATH wins over the service's default: three runs, not one and not the record at
    // DEFAULT_DB_PATH, which this check never opens.
    const byEnvironment = reader(['--out', join(out, 'three.json')], {
      CUTROOM_DB_PATH: three.path,
    })
    assert.equal(byEnvironment.status, 0, byEnvironment.err)
    assert.match(byEnvironment.out, /\b3 runs\b/, byEnvironment.out)

    // And the two records that were NOT chosen are not the ones that answered.
    const twoRuns = reader(['--db', two.path, '--out', join(out, 'two.json')], {
      CUTROOM_DB_PATH: one.path,
    })
    assert.equal(twoRuns.status, 0, twoRuns.err)
    assert.match(twoRuns.out, /\b2 runs\b/, twoRuns.out)

    // The resolver itself, all three levels, including the one a child cannot exercise without
    // opening the real record. `scripts/benchmark-serve.mjs` is Slice 4's, so the "both scripts"
    // half of this check reaches one script today and gains the second with that file.
    process.env.CUTROOM_DB_PATH = three.path
    assert.equal(await databasePath(one.path), one.path, '--db did not win')
    assert.equal(await databasePath(undefined), three.path, 'CUTROOM_DB_PATH did not win')
    delete process.env.CUTROOM_DB_PATH
    assert.equal(
      await databasePath(undefined),
      DEFAULT_DB_PATH,
      "the resolver does not fall back to the service's default",
    )
    for (const record of [one.path, two.path, three.path]) {
      assert.notEqual(DEFAULT_DB_PATH, record, 'a temporary record stands at the default path')
    }

    // A write through the loader's handle THROWS: the open carries { readOnly: true } and that is
    // exercised, not only read out of the source by check 1.
    const stored = openRecord({ path: two.path })
    const before = readFileSync(two.path)
    const tree = treeOf(two.dir)
    try {
      assert.throws(
        () => stored.handle.exec("DELETE FROM run WHERE run_id = 'nothing'"),
        /readonly|read-only/i,
        'a write through the loader reached the database',
      )
      // A FULL load: every run, every table, the held set and the absent set.
      const ids = stored.runIds()
      assert.equal(ids.length, 2, ids.join(', '))
      for (const id of ids) assert.ok(stored.rowsOf(id).run.run_id === id)
      stored.absentColumns()
    } finally {
      stored.close()
    }
    assert.ok(readFileSync(two.path).equals(before), 'a full load changed the database bytes')
    assert.deepEqual(treeOf(two.dir), tree, 'a full load wrote a file beside the database')
  } finally {
    if (held === undefined) delete process.env.CUTROOM_DB_PATH
    else process.env.CUTROOM_DB_PATH = held
    for (const made of [one, two, three]) rmSync(made.dir, { recursive: true, force: true })
    rmSync(out, { recursive: true, force: true })
  }
})

// ---------------------------------------------------------------- 4

test('4. The held column set, pinned clause by clause — new coverage this feature builds', () => {
  const made = emptyRecord('columns')
  try {
    const stored = openRecord({ path: made.path })
    try {
      // The twenty tables, in the order the reader listed them, and `run` read separately.
      assert.deepEqual([...TABLES], [...TABLE_ORDER], "the loader's table list moved")
      assert.equal(TABLES.length, 20, String(TABLES.length))
      assert.ok(!TABLES.includes('run' as never), 'run is in TABLES rather than read separately')

      // Clause by clause: `run` and then each of the twenty, in that order. A column dropped from
      // the loader's reading, or added to the schema without this list moving, fails here.
      for (const table of ['run', ...TABLE_ORDER]) {
        const columns = stored.held.get(table)
        assert.ok(columns !== undefined, `the loader holds no column set for ${table}`)
        assert.deepEqual([...columns], HELD[table], `${table}'s held columns moved`)
      }
      assert.deepEqual(
        [...stored.held.keys()],
        ['run', ...TABLE_ORDER],
        'the loader holds a table the pinned list does not name',
      )

      // Every column the arithmetic names is behind one of the columns above, so a freshly
      // migrated record reports nothing absent. The real record predates migration 0007 and does.
      assert.deepEqual(stored.absentColumns(), [], 'a migrated record is missing a named column')
    } finally {
      stored.close()
    }

    // A column named in the pinned list with no column behind it in the schema fails. The scan is
    // run over a name that is NOT there first, so a scan that stopped matching anything fails
    // here rather than passing every column in silence.
    const schema = readFileSync(join(REPO, 'packages', 'domain', 'src', 'schema.ts'), 'utf8')
    const declared = (column: string) =>
      new RegExp(String.raw`\b(text|integer|real|blob)\(\s*'${column}'`).test(schema)
    assert.equal(
      declared('no_such_column'),
      false,
      'the schema scan matches a column that is not there',
    )
    assert.equal(declared('run_id'), true, 'the schema scan reads no column at all')
    const unbacked: string[] = []
    for (const [table, columns] of Object.entries(HELD)) {
      for (const column of columns) if (!declared(column)) unbacked.push(`${table}.${column}`)
    }
    assert.deepEqual(unbacked, [], 'a pinned column has no column behind it in schema.ts')
  } finally {
    rmSync(made.dir, { recursive: true, force: true })
  }
})

// ---------------------------------------------------------------- 5

test('5. Row selection', () => {
  const made = emptyRecord('selection')
  try {
    // Two runs SHARING ONE created_at, so their order is decided by run id, and a third that is
    // older than both. Inserted newest-id-first on the shared instant: insertion order, run id
    // alone and created_at alone each give a different answer from the one the loader must give.
    const alpha = 'aaaaaaaa-0000-4000-8000-000000000001'
    const beta = 'bbbbbbbb-0000-4000-8000-000000000002'
    const older = 'cccccccc-0000-4000-8000-000000000003'
    const shared = '2026-02-02T00:00:00.000Z'

    const db = new DatabaseSync(made.path)
    try {
      const run = db.prepare(
        'INSERT INTO run (run_id, request_id, request, request_canonical, state, ' +
          'cancel_requested, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)',
      )
      run.run(beta, 'req-beta', '{}', '{}', 'finished', shared)
      run.run(alpha, 'req-alpha', '{}', '{}', 'finished', shared)
      run.run(older, 'req-older', '{}', '{}', 'finished', '2025-01-01T00:00:00.000Z')

      // run_event is ordered by `seq`, not by the order it was written in.
      const event = db.prepare('INSERT INTO run_event (run_id, seq, at, body) VALUES (?, ?, ?, ?)')
      for (const seq of [3, 1, 2]) event.run(alpha, seq, shared, `{"n":${seq}}`)

      // Everything else is ordered by `rowid` — the order it was written in. `seq` here runs
      // backwards, so a loader that ordered by a column would give the other answer.
      const picture = db.prepare(
        'INSERT INTO picture (run_id, picture_id, seq, attempt, shot_unit, subject_id, role, ' +
          'label, path, prompt, framing, reference_ids, measure, words, gate1, score, gate1s, ' +
          'chosen) VALUES (?, ?, ?, 1, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)',
      )
      for (const seq of [3, 1, 2]) {
        picture.run(
          alpha,
          `p${seq}`,
          seq,
          's1',
          'main',
          'label',
          'path',
          'prompt',
          'framing',
          '[]',
          '{}',
          'words',
          '{}',
          0,
          '[]',
        )
      }

      // `job` carries NO run_id: it is joined through the correlation the queue stamps on it.
      const job = db.prepare(
        'INSERT INTO job (kind, payload, state, attempts, run_at, correlation_id) ' +
          'VALUES (?, ?, ?, 0, ?, ?)',
      )
      job.run('plan', '{}', 'done', shared, alpha)
      job.run('stills', '{}', 'done', shared, beta)
    } finally {
      db.close()
    }

    const stored = openRecord({ path: made.path })
    try {
      // The join key and the order, named rather than inferred from one happy fixture.
      assert.equal(joinKeyOf('job'), 'correlation_id')
      for (const table of TABLE_ORDER.filter((name) => name !== 'job')) {
        assert.equal(joinKeyOf(table), 'run_id', `${table} is joined by the wrong column`)
      }
      assert.equal(orderOf('run_event'), 'seq')
      for (const table of TABLE_ORDER.filter((name) => name !== 'run_event')) {
        assert.equal(orderOf(table), 'rowid', `${table} is ordered by the wrong column`)
      }

      // With no run named: created_at, then run_id. The two sharing an instant rank by id, and
      // the older run comes first however it was written.
      assert.deepEqual(
        stored.runIds(),
        [older, alpha, beta],
        'the run order is not created_at, run_id',
      )

      // A prefix names only the runs it starts, in run_id order.
      assert.deepEqual(stored.runIdsNamed('aaaa'), [alpha])
      assert.deepEqual(stored.runIdsNamed('dddd'), [])

      const rows = stored.rowsOf(alpha)
      assert.equal(String(rows.run.run_id), alpha)
      assert.deepEqual(
        rows.run_event.map((row) => row.seq),
        [1, 2, 3],
        'run_event is not ordered by seq',
      )
      assert.deepEqual(
        rows.picture.map((row) => row.seq),
        [3, 1, 2],
        'a rowid-ordered table is not in the order it was written',
      )
      assert.deepEqual(
        rows.job.map((row) => row.kind),
        ['plan'],
        'job is not joined through correlation_id',
      )
      // The other run's rows are not this run's, in every one of the twenty tables.
      const other = stored.rowsOf(beta)
      assert.equal(other.run_event.length, 0)
      assert.equal(other.picture.length, 0)
      assert.deepEqual(
        other.job.map((row) => row.kind),
        ['stills'],
      )
      for (const table of TABLE_ORDER) {
        assert.ok(Array.isArray(other[table]), `${table} is missing from a row set`)
      }
    } finally {
      stored.close()
    }
  } finally {
    rmSync(made.dir, { recursive: true, force: true })
  }
})

// ---------------------------------------------------------------- the scrubber itself

test('the scrubber function strips an artifact root and a URL and leaves a run id and a brief key alone — NOT check 9, which Slice 3 still owes over the served payload', () => {
  // A root BUILT rather than written, for the reason `tests/no-absolute-paths.test.ts` exists:
  // D-086 forbids a machine path in committed source, and that scan reads a test exactly as it
  // reads code. Nothing below is this machine's path.
  const root = ['D:', 'scratch', 'cutroom', '.artifacts'].join('\\')
  const scrub = artifactScrubber([root])

  // An artifact path comes back relative to the root (D-086).
  assert.equal(scrub(`${root}\\shots\\p1.png`), 'shots\\p1.png')
  assert.equal(scrub(`${root}\\`), '')

  // And under the ESCAPED spelling, which is why `rootPatterns` compiles a pattern per root
  // rather than matching a string: a Windows path inside an ffmpeg filtergraph carries its `:`
  // and its separators escaped (S-075), and `render.invocations` holds exactly that text. A
  // reader that stripped only the plain spelling would leave every such path whole, and nothing
  // else in this repository would notice.
  const escaped = `D\\:/scratch/cutroom/.artifacts/shots/p1.png`
  assert.equal(scrub(escaped), 'shots/p1.png')

  // A URL becomes `<url>` (D-022). The failure this exists for is a presigned URL carrying a
  // live credential in its query string, so the query string must go with it.
  const presigned = 'https://oss.example.com/x?OSSAccessKeyId=AK&Signature=s'
  assert.equal(scrub(`made at ${presigned} today`), 'made at <url> today')
  assert.doesNotMatch(scrub(presigned), /OSSAccessKeyId|Signature/)

  // THE POSITIVE CONTROL. A 36-character run id and a 64-character brief key in one string
  // survive UNCHANGED: a widened scrubber eating exactly those is S-199's round-3 finding, and
  // without this half the three assertions above are all satisfied by a function that erases
  // everything.
  const runId = 'a1b8f2ee-0000-4000-8000-000000000001'
  const briefKey = 'b'.repeat(64)
  assert.equal(runId.length, 36, 'the control is not a 36-character run id')
  assert.equal(briefKey.length, 64, 'the control is not a 64-character brief key')
  const identity = `run ${runId} brief ${briefKey}`
  assert.equal(scrub(identity), identity, 'the scrubber ate a run id or a brief key')
  assert.equal(
    scrub(`run ${runId} at ${presigned} brief ${briefKey}`),
    `run ${runId} at <url> brief ${briefKey}`,
  )

  // A root given as an empty string is dropped rather than compiled: its pattern would match at
  // every position and erase nothing while costing a pass over every string.
  assert.equal(artifactScrubber([''])(identity), identity)
  assert.equal(artifactScrubber([])(presigned), '<url>')
})
