import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { test } from 'node:test'
import { closeDatabase, openDatabase, submitRun } from '../packages/domain/src/index.ts'
import { REPO } from './_repo.ts'
import { stillsRequest } from './engine/stills.ts'

// yield-benchmark, Slice 3 — checks 5 to 7 (docs/features/yield-benchmark.md, Gate 3): THE
// READER. `scripts/benchmark.mjs` scores the runs already in a record it opens READ-ONLY, prints
// the scorecard and the drill-down, writes the full record under `--out`, and writes the ledger
// only with `--rescore` (S-182, S-184, S-185, D-022, D-086).
//
// Check 5. `the reader opens every database read-only and leaves its bytes unchanged; refuses a
// missing path non-zero, creating nothing; starts no process but git rev-parse; constructs no
// port and reads no key; prints blobs and model text only when asked; hashes the brief key's
// input with SHA-256, so the key is 64 lowercase hex characters and two runs of one brief share
// it; and contains no occurrence of the spending script's name, which this check BUILDS rather
// than writes`.
//
// Check 6. `every flag in Gate 3's table behaves as it states and defaults as it states; --run
// with --part prints one part of one run and nothing else; --part without --run prints that part
// for every run; --run on a prefix matching two runs exits 2 and scores nothing; an unknown
// --part exits 2; --rescore with --run or with --part exits 2 and leaves the tracked ledger
// byte-identical; a missing --db exits 1 and creates no file; the tracked ledger is untouched
// without --rescore; and --out is written on every successful run`.
//
// Check 7. `the ledger: scoring the same fixture rows twice writes byte-identical ROWS, the
// header's read date and commit being the only bytes that move; rows are ordered by created_at
// then run_id; the columns are exactly those Gate 3 lists, in that order, each in its stated
// format; no row holds a path of any kind; the written file is prettier --check clean, since
// docs/research/ is NOT in .prettierignore and format runs on every check; and the file carries
// its front matter, LF line endings and exactly one trailing newline`.
//
// AMENDED by benchmark-view's Slice 1, 2026-10-17 (S-204, S-205), with no check title touched, no
// assertion removed and no bound moved. The read-only open, the held column set, the row selection
// and the scrubber moved out of `scripts/benchmark.mjs` and into `packages/benchmark-read`, and
// the path precedence moved into `scripts/_lib.mjs`. So: check 5's count of one `new DatabaseSync(`
// and its read-only match now read the LOADER and the reader's own count is zero; the eleven source
// scans beside them, and the spending script's name, run over BOTH sources; and check 6's
// `DEFAULT_DB_PATH` match reads `scripts/_lib.mjs`, with the reader asserted to pass `--db` through.
// Check 5's `processes` deep-equal of `['git']` is UNCHANGED and still reads the script alone,
// because `git rev-parse --short HEAD` stayed there.
//
// Nothing here spends, reaches a provider, reads a key or starts the engine: every database below
// is a temporary one, and the one tracked file is only ever read.

const READER = 'scripts/benchmark.mjs'
const LEDGER = join('docs', 'research', 'benchmark.md')
const FIXTURES = join(REPO, 'tests', 'fixtures', 'benchmark', 'ratings')

/** The five worked rating fixtures Slice 2 constructed, in the order their run ids rank. */
const WORKED = [
  'dead-in-plan',
  'dead-on-first-picture',
  'stopped-at-gate-1',
  'entered-video-made-nothing',
  'completed',
] as const

/** Every table one run's rows are read from, in the order a row set names them. */
const TABLES = [
  'run',
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
 * Every `.ts` file of the loader package, by repository-relative path and its text.
 *
 * benchmark-view's Slice 1 moved the open out of the reader and into `packages/benchmark-read`
 * (S-204). The scans below read both, because a scan over one of two sources reads as coverage.
 */
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
  walk(join('packages', 'benchmark-read', 'src'))
  assert.ok(out.length > 0, 'the loader package holds no source file, so this scan reads nothing')
  return out
}

function reader(args: string[], env?: Record<string, string>) {
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

/** A value as SQLite takes it: a boolean as 0 or 1, an object as the JSON text a column holds. */
function bound(value: unknown): string | number | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'boolean') return value ? 1 : 0
  if (typeof value === 'object') return JSON.stringify(value)
  return value as string | number
}

/**
 * A temporary record holding the named worked fixtures' rows.
 *
 * The file is created and MIGRATED by the domain's own opener — the thing the reader may never
 * use — and the rows are then inserted as the schema stores them. A surrogate integer `id` is
 * left out so two fixtures' rows cannot collide on one; nothing the scorecard reads is that
 * column. `createdAt` overrides one run's `created_at`, which is what the ledger orders by.
 */
function recordHolding(
  names: readonly string[],
  createdAt: Record<string, string> = {},
): { dir: string; path: string } {
  const dir = mkdtempSync(join(tmpdir(), 'cutroom-benchmark-'))
  const path = join(dir, 'cutroom.sqlite')
  closeDatabase(openDatabase(path))
  const db = new DatabaseSync(path)
  try {
    for (const name of names) {
      const fixture = JSON.parse(
        readFileSync(join(FIXTURES, `constructed-${name}.json`), 'utf8'),
      ) as Record<string, unknown>
      for (const table of TABLES) {
        const held = fixture[table]
        const rows = (Array.isArray(held) ? held : held === undefined ? [] : [held]) as Array<
          Record<string, unknown>
        >
        for (const row of rows) {
          const when = createdAt[name]
          const values: Record<string, unknown> = {
            ...row,
            ...(table === 'run' && when !== undefined ? { created_at: when } : {}),
          }
          const columns = Object.keys(values).filter(
            (column) => !(column === 'id' && typeof values[column] === 'number'),
          )
          db.prepare(
            `INSERT INTO ${table} (${columns.map((c) => `"${c}"`).join(', ')}) ` +
              `VALUES (${columns.map(() => '?').join(', ')})`,
          ).run(...columns.map((column) => bound(values[column])))
        }
      }
    }
  } finally {
    db.close()
  }
  return { dir, path }
}

/** The ledger's rows, as the markdown table holds them: the header, then one array of cells a run. */
function table(text: string): { header: string[]; rows: string[][]; block: string } {
  const lines = text.split('\n')
  const at = lines.findIndex((line) => line.startsWith('| run'))
  assert.ok(at >= 0, `the ledger holds no table:\n${text}`)
  const cells = (line: string) =>
    line
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map((cell) => cell.trim())
  const body = lines.slice(at).filter((line) => line.startsWith('|'))
  return {
    header: cells(String(body[0])),
    rows: body.slice(2).map((line) => cells(line)),
    block: body.join('\n'),
  }
}

// ---------------------------------------------------------------- 5

test('5. the reader opens every database read-only and leaves its bytes unchanged; refuses a missing path non-zero, creating nothing; starts no process but git rev-parse; constructs no port and reads no key; prints blobs and model text only when asked; hashes the brief key’s input with SHA-256, so the key is 64 lowercase hex characters and two runs of one brief share it; and contains no occurrence of the spending script’s name, which this check BUILDS rather than writes', () => {
  const dir = mkdtempSync(join(tmpdir(), 'cutroom-benchmark-keys-'))
  try {
    const path = join(dir, 'cutroom.sqlite')
    const db = openDatabase(path)
    // Two runs of ONE brief: the same request with a different identifier, which is the half of
    // the request the brief key removes. The third differs in its world, which it keeps.
    const ours = submitRun(db, stillsRequest('bench-brief-a'), '{}').runId
    const sibling = submitRun(db, stillsRequest('bench-brief-b'), '{}').runId
    const other = submitRun(
      db,
      { ...stillsRequest('bench-brief-c'), worldId: 'world-elsewhere' },
      '{}',
    ).runId
    closeDatabase(db)
    const before = readFileSync(path)

    const scored = reader(['--db', path, '--out', join(dir, 'record.json')])
    assert.equal(scored.status, 0, scored.err)

    const keyOf = (runId: string) => {
      const line = scored.out.split('\n').find((one) => one.includes(runId))
      assert.ok(line !== undefined, `${runId} was not scored:\n${scored.out}`)
      const found = /brief ([0-9a-f]{64})\b/.exec(line)
      assert.ok(found !== null, `no SHA-256 brief key on ${line}`)
      return String(found[1])
    }
    assert.equal(keyOf(ours), keyOf(sibling), 'two runs of one brief carry different keys')
    assert.notEqual(keyOf(ours), keyOf(other), 'two briefs carry one key')

    // Reading the record changed none of its bytes, which is what readOnly: true buys.
    assert.ok(readFileSync(path).equals(before), 'reading the database changed its bytes')

    const missing = join(dir, 'nowhere.sqlite')
    const refused = reader(['--db', missing, '--out', join(dir, 'unwritten.json')])
    assert.equal(refused.status, 1, 'a missing database was not refused with exit 1')
    assert.equal(existsSync(missing), false, 'a wrong path created a database')
    assert.equal(existsSync(join(dir, 'unwritten.json')), false, 'a refused run wrote a record')

    // Blobs and model text print only when asked for: the prompt sent for a picture is in the
    // record either way and on screen only with --blobs.
    const corpus = recordHolding(['stopped-at-gate-1'])
    try {
      const figures = reader(['--db', corpus.path, '--out', join(dir, 'figures.json')])
      assert.equal(figures.status, 0, figures.err)
      assert.doesNotMatch(figures.out, /opening frame/, 'a prompt printed with no --blobs')
      const blobs = reader(['--db', corpus.path, '--out', join(dir, 'blobs.json'), '--blobs'])
      assert.equal(blobs.status, 0, blobs.err)
      assert.match(blobs.out, /opening frame/, '--blobs printed no prompt')
      const written = JSON.parse(readFileSync(join(dir, 'blobs.json'), 'utf8')) as {
        runs: Array<{ blobs: { pictures: Array<{ prompt: string }> } }>
      }
      assert.match(
        String(written.runs[0]?.blobs.pictures[0]?.prompt),
        /opening frame/,
        'the full record holds no prompt',
      )
    } finally {
      rmSync(corpus.dir, { recursive: true, force: true })
    }

    // The source, read as bytes. The one process it starts is `git rev-parse`, for the commit
    // the reading was done at; it opens the record through node:sqlite read-only and never
    // through the domain's opener, which migrates and creates; and it constructs no port.
    //
    // benchmark-view's Slice 1 MOVED the open into `packages/benchmark-read`, so two things
    // change here and nothing is given up (S-204, S-205). The count and the read-only match
    // follow the open, and the reader's own count becomes ZERO. And every scan below runs over
    // BOTH SOURCES — this script and every source file of the loader package — because each of
    // them would otherwise read a wrapper while the real open sat in the other file, which is
    // the wrongly-green half of that slice's amendment list.
    const source = readFileSync(join(REPO, READER), 'utf8')
    const sources: Array<[string, string]> = [[READER, source], ...loaderSources()]
    const loader = loaderSources()
      .map(([, text]) => text)
      .join('\n')
    assert.equal(
      (source.match(/new DatabaseSync\(/g) ?? []).length,
      0,
      'the reader still opens a database itself',
    )
    assert.equal(
      (loader.match(/new DatabaseSync\(/g) ?? []).length,
      1,
      'the loader opens a database more than once',
    )
    assert.match(loader, /new DatabaseSync\([^)]*\{ readOnly: true \}\)/, 'not opened read-only')
    for (const [file, text] of sources) {
      assert.ok(!text.includes('openDatabase'), `${file} uses the domain's opener`)
      assert.ok(!text.includes('@cutroom/providers'), `${file} imports a provider`)
      assert.ok(!text.includes('@cutroom/domain'), `${file} imports the domain`)
      for (const starter of ['spawnSync', 'spawn(', 'execSync', 'execFileSync', 'fork(']) {
        assert.ok(!text.includes(starter), `${file} starts a process with ${starter}`)
      }
    }
    // Every process started through _lib.mjs's `run`, by the command it names. One, and it is
    // git; the arguments are asserted beside it.
    const processes = [...source.matchAll(/\brun\('([^']*)'/g)].map((found) => String(found[1]))
    assert.deepEqual(processes, ['git'], `the reader starts ${processes.join(', ')}`)
    assert.match(source, /run\('git', \['rev-parse'/, 'the one process is not git rev-parse')
    for (const [file, text] of sources) {
      for (const named of ['loadEnvFile', 'DEFAULT_ENV_FILE', 'CUTROOM_ENV_FILE', 'readSettings']) {
        assert.ok(!text.includes(named), `${file} names ${named}`)
      }
      assert.doesNotMatch(text, /['"`/\\]\.env\b/, `${file} names an environment file`)
    }

    // The spending script's name, BUILT rather than written: paid-path's check 20 reads every
    // .mjs in scripts/ and fails if one holds it, and forbids any other test file from holding
    // it either (S-111), so neither this file nor the reader may contain it as text.
    const spender = ['real', 'reel'].join('-')
    for (const [file, text] of sources) {
      assert.ok(!text.includes(spender), `${file} names the script that spends (${spender})`)
    }
    assert.ok(
      !readFileSync(join(REPO, 'tests', 'yield-benchmark-reader.test.ts'), 'utf8').includes(
        spender,
      ),
      'this check writes the forbidden string instead of building it',
    )
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

// ---------------------------------------------------------------- 6

test('6. every flag in Gate 3’s table behaves as it states and defaults as it states; --run with --part prints one part of one run and nothing else; --part without --run prints that part for every run; --run on a prefix matching two runs exits 2 and scores nothing; an unknown --part exits 2; --rescore with --run or with --part exits 2 and leaves the tracked ledger byte-identical; a missing --db exits 1 and creates no file; the tracked ledger is untouched without --rescore; and --out is written on every successful run', () => {
  const record = recordHolding(WORKED)
  const out = mkdtempSync(join(tmpdir(), 'cutroom-benchmark-out-'))
  const tracked = readFileSync(join(REPO, LEDGER))
  try {
    const heading = (text: string, part: string) =>
      (text.match(new RegExp(`^\\s+part ${part}\\b`, 'gm')) ?? []).length
    const PARTS = ['plan', 'pictures', 'narration', 'clips', 'cut']
    const ids = WORKED.map((_, i) => `ra71n657-0000-4001-8000-00000000000${i + 1}`)

    // Every run and every part, by default.
    const all = reader(['--db', record.path, '--out', join(out, 'all.json')])
    assert.equal(all.status, 0, all.err)
    for (const id of ids) assert.ok(all.out.includes(id), `${id} was not scored`)
    for (const part of PARTS) assert.equal(heading(all.out, part), 5, `${part} is not on every run`)
    assert.ok(existsSync(join(out, 'all.json')), '--out was not written')

    // --run with --part: one part of one run and nothing else.
    const one = reader([
      '--db',
      record.path,
      '--run',
      'ra71n657-0000-4001-8000-000000000005',
      '--part',
      'pictures',
      '--out',
      join(out, 'one.json'),
    ])
    assert.equal(one.status, 0, one.err)
    assert.ok(one.out.includes(String(ids[4])), 'the named run was not scored')
    for (const id of ids.slice(0, 4)) {
      assert.ok(!one.out.includes(id), `${id} was scored beside the named run`)
    }
    assert.equal(heading(one.out, 'pictures'), 1, 'the named part was not printed')
    for (const part of PARTS.filter((p) => p !== 'pictures')) {
      assert.equal(heading(one.out, part), 0, `${part} printed beside the named part`)
    }

    // --part without --run: that part for every run. Repeatable, so two parts come back for all.
    const parts = reader([
      '--db',
      record.path,
      '--part',
      'cut',
      '--part',
      'clips',
      '--out',
      join(out, 'parts.json'),
    ])
    assert.equal(parts.status, 0, parts.err)
    assert.equal(heading(parts.out, 'cut'), 5, 'the part was not printed for every run')
    assert.equal(heading(parts.out, 'clips'), 5, '--part is not repeatable')
    for (const part of ['plan', 'pictures', 'narration']) {
      assert.equal(heading(parts.out, part), 0, `${part} printed beside the named parts`)
    }

    // A prefix that names two runs, an unknown part, and --rescore beside either: exit 2, and
    // nothing scored.
    const ambiguous = reader([
      '--db',
      record.path,
      '--run',
      'ra71n657',
      '--out',
      join(out, 'ambiguous.json'),
    ])
    assert.equal(ambiguous.status, 2, 'a prefix naming five runs was accepted')
    assert.equal(existsSync(join(out, 'ambiguous.json')), false, 'a refused run scored anyway')
    for (const id of ids) assert.ok(!ambiguous.out.includes(id), 'a refused run was scored')

    const nowhere = reader([
      '--db',
      record.path,
      '--run',
      'ra71n657-0000-4001-8000-00000000000z',
      '--out',
      join(out, 'nowhere.json'),
    ])
    assert.equal(nowhere.status, 2, 'a prefix naming no run was accepted')
    assert.equal(existsSync(join(out, 'nowhere.json')), false, 'a refused run scored anyway')

    const unknown = reader([
      '--db',
      record.path,
      '--part',
      'keyframes',
      '--out',
      join(out, 'unknown.json'),
    ])
    assert.equal(unknown.status, 2, 'a part that is not one of the five was accepted')
    assert.equal(existsSync(join(out, 'unknown.json')), false, 'a refused run scored anyway')

    // A unique prefix IS accepted, which is how the record's own documents write a run id.
    const prefix = reader([
      '--db',
      record.path,
      '--run',
      'ra71n657-0000-4001-8000-000000000001',
      '--out',
      join(out, 'prefix.json'),
    ])
    assert.equal(prefix.status, 0, prefix.err)
    assert.ok(prefix.out.includes(String(ids[0])), 'a unique prefix named no run')

    // --rescore is the whole record or nothing: the ledger is TRACKED, and a partial rescore
    // would truncate it to one row or leave four part columns undefined.
    for (const partial of [
      ['--run', 'ra71n657-0000-4001-8000-000000000001'],
      ['--part', 'cut'],
    ]) {
      const refused = reader([
        '--db',
        record.path,
        '--rescore',
        ...partial,
        '--ledger',
        join(out, 'partial.md'),
        '--out',
        join(out, 'partial.json'),
      ])
      assert.equal(refused.status, 2, `--rescore ${String(partial[0])} was accepted`)
      assert.equal(existsSync(join(out, 'partial.md')), false, 'a refused rescore wrote a ledger')
      assert.ok(readFileSync(join(REPO, LEDGER)).equals(tracked), 'the tracked ledger moved')
    }

    // A missing --db exits 1 and creates nothing at all.
    const absent = reader([
      '--db',
      join(out, 'no-record.sqlite'),
      '--out',
      join(out, 'absent.json'),
    ])
    assert.equal(absent.status, 1, 'a missing record was not exit 1')
    assert.equal(existsSync(join(out, 'no-record.sqlite')), false, 'a missing record was created')
    assert.equal(existsSync(join(out, 'absent.json')), false, 'a refused run wrote a record')

    // A file that is not a database is the same refusal, and still writes nothing.
    const broken = reader(['--db', READER, '--out', join(out, 'broken.json')])
    assert.equal(broken.status, 1, 'a file that is not a database was opened')
    assert.equal(existsSync(join(out, 'broken.json')), false, 'a refused run wrote a record')

    // --db defaults to CUTROOM_DB_PATH, and the tracked ledger is untouched without --rescore.
    const byEnvironment = reader(['--out', join(out, 'environment.json')], {
      CUTROOM_DB_PATH: record.path,
    })
    assert.equal(byEnvironment.status, 0, byEnvironment.err)
    assert.ok(byEnvironment.out.includes(String(ids[0])), 'CUTROOM_DB_PATH was not read')
    assert.ok(readFileSync(join(REPO, LEDGER)).equals(tracked), 'the tracked ledger moved')
    // benchmark-view's Slice 1 moved the precedence into `scripts/_lib.mjs`: the loader may not
    // import `@cutroom/service` at all, so the fallback lives once, where both readers reach it.
    // This assertion moves there with it, and the reader's own becomes that it passes `--db`
    // through rather than resolving an order of its own.
    assert.match(
      readFileSync(join(REPO, 'scripts', '_lib.mjs'), 'utf8'),
      /DEFAULT_DB_PATH/,
      "the shared resolver does not fall back to the service's default",
    )
    assert.match(
      readFileSync(join(REPO, READER), 'utf8'),
      /databasePath\(given\.db\)/,
      'the reader does not pass --db through to the shared resolver',
    )

    // --out defaults under .artifacts/benchmark/, which is gitignored (D-086), and the instant
    // holds no `:` — a path holding one cannot be created on this machine.
    const defaulted = reader(['--db', record.path])
    assert.equal(defaulted.status, 0, defaulted.err)
    const named = /\.artifacts[\\/]benchmark[\\/](\d{8}T\d{6})\.json/.exec(defaulted.out)
    assert.ok(named !== null, `--out named no default path:\n${defaulted.out}`)
    const written = join(REPO, '.artifacts', 'benchmark', `${String(named[1])}.json`)
    assert.ok(existsSync(written), 'the default record was not written')
    rmSync(written, { force: true })
  } finally {
    rmSync(record.dir, { recursive: true, force: true })
    rmSync(out, { recursive: true, force: true })
  }
})

// ---------------------------------------------------------------- 7

test('7. the ledger: scoring the same fixture rows twice writes byte-identical ROWS, the header’s read date and commit being the only bytes that move; rows are ordered by created_at then run_id; the columns are exactly those Gate 3 lists, in that order, each in its stated format; no row holds a path of any kind; the written file is prettier --check clean, since docs/research/ is NOT in .prettierignore and format runs on every check; and the file carries its front matter, LF line endings and exactly one trailing newline', () => {
  const record = recordHolding(WORKED)
  const out = mkdtempSync(join(tmpdir(), 'cutroom-benchmark-ledger-'))
  try {
    const score = (name: string) =>
      reader([
        '--db',
        record.path,
        '--rescore',
        '--ledger',
        join(out, name),
        '--out',
        join(out, `${name}.json`),
      ])
    const first = score('one.md')
    assert.equal(first.status, 0, first.err)
    const second = score('two.md')
    assert.equal(second.status, 0, second.err)

    const one = readFileSync(join(out, 'one.md'), 'utf8')
    const two = readFileSync(join(out, 'two.md'), 'utf8')
    assert.equal(table(one).block, table(two).block, 'two scorings wrote different rows')

    // The read date and the commit live in the header and nowhere else, which is what makes the
    // rows byte-identical: a row holds nothing that moves between two scorings of one record.
    const today = new Date().toISOString().slice(0, 10)
    const commit = spawnSync('git', ['rev-parse', '--short', 'HEAD'], {
      cwd: REPO,
      encoding: 'utf8',
    }).stdout.trim()
    assert.ok(commit.length > 0, 'git named no commit')
    const header = one.slice(0, one.indexOf('| run'))
    assert.ok(header.includes(today), `the header names no read date:\n${header}`)
    assert.ok(header.includes(commit), `the header names no commit:\n${header}`)
    assert.ok(!table(one).block.includes(today), 'a row holds the read date')
    assert.ok(!table(one).block.includes(commit), 'a row holds the commit')

    // The columns Gate 3 lists, in that order.
    const { header: columns, rows } = table(one)
    assert.deepEqual(columns, [
      'run',
      'brief',
      'until',
      'ending',
      'reel',
      'plan',
      'pictures',
      'narration',
      'clips',
      'cut',
      'rating',
      'stamp',
      '¢',
      's',
      'created',
    ])
    assert.equal(rows.length, 5, 'the ledger holds a row for every run')

    const RATING = /^(\d+\.\d|absent|inherited)$/
    const FORMATS: ReadonlyArray<readonly [number, RegExp]> = [
      [0, /^`[0-9a-z-]{8,}`$/],
      [1, /^[0-9a-f]{8}$/],
      [2, /^(plan|stills|video)$/],
      [3, /^(completed|stopped|failed|refused|cancelled|absent)$/],
      [4, /^(yes|no)$/],
      [5, RATING],
      [6, RATING],
      [7, RATING],
      [8, RATING],
      [9, RATING],
      [10, /^(\d+\.\d|none)$/],
      [11, /^r1\/([0-9a-f]{8}|—)$/],
      [12, /^\d+$/],
      [13, /^(\d+\.\d|absent)$/],
      [14, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/],
    ]
    const PATHS: ReadonlyArray<readonly [RegExp, string]> = [
      [/[A-Za-z]:[\\/]{1,2}(Users|Program|Windows)/, 'a Windows drive-letter path'],
      [/\/Volumes\//, 'a macOS volume path'],
      [/\/Users\/[A-Za-z]/, 'a macOS or Linux home path'],
      [/\/home\/[a-z]/, 'a Linux home path'],
      [/\.artifacts/, "this repository's artifact root"],
      [/\.(json|png|mp4|wav|md|sqlite|txt)\b/, 'a file name'],
    ]
    /** The stamp is `r1/<hash>`: its one slash is the version's, not a path's. */
    const STAMP = 11
    for (const row of rows) {
      assert.equal(row.length, 15, `a row holds ${row.length} cells: ${row.join(' | ')}`)
      for (const [at, format] of FORMATS) {
        assert.match(String(row[at]), format, `${columns[at]} is ${String(row[at])}`)
      }
      row.forEach((cell, at) => {
        for (const [pattern, what] of PATHS) {
          assert.ok(!pattern.test(cell), `a row holds ${what}: ${cell}`)
        }
        if (at !== STAMP)
          assert.doesNotMatch(cell, /[\\/]/, `a row holds a path separator: ${cell}`)
      })
    }

    // Slice 2's five worked values, through the reader's own SHA-256: the arithmetic is the
    // package's and the hash does not move it.
    assert.deepEqual(
      rows.map((row) => String(row[10])),
      ['0.0', '10.0', '10.0', '34.0', '89.7'],
      'the ledger does not carry the five worked values',
    )

    // Ordered by created_at, then by run_id. The five fixtures share one created_at, so the
    // order above is the run id's; a sixth record puts the later run first by its own instant.
    const ordered = recordHolding(['completed', 'dead-in-plan'], {
      completed: '2026-09-30T00:00:00.000Z',
    })
    try {
      const byInstant = reader([
        '--db',
        ordered.path,
        '--rescore',
        '--ledger',
        join(out, 'ordered.md'),
        '--out',
        join(out, 'ordered.json'),
      ])
      assert.equal(byInstant.status, 0, byInstant.err)
      const written = table(readFileSync(join(out, 'ordered.md'), 'utf8')).rows
      assert.deepEqual(
        written.map((row) => String(row[14])),
        ['2026-09-30T00:00:00Z', '2026-10-01T00:00:00Z'],
        'the rows are not ordered by created_at',
      )
    } finally {
      rmSync(ordered.dir, { recursive: true, force: true })
    }

    // Front matter, LF endings, exactly one trailing newline — and prettier --check clean, with
    // this repository's own configuration, because docs/research/ is not in .prettierignore.
    assert.ok(one.startsWith('---\n'), 'the ledger carries no front matter')
    assert.match(one, /^---\nstatus:.*\nauthority:.*\n---\n/, 'the front matter is incomplete')
    assert.ok(!one.includes('\r'), 'the ledger holds a CR')
    assert.ok(one.endsWith('\n') && !one.endsWith('\n\n'), 'not exactly one trailing newline')

    const formatted = spawnSync(
      process.execPath,
      [
        join('node_modules', 'prettier', 'bin', 'prettier.cjs'),
        '--config',
        '.prettierrc.json',
        '--check',
        join(out, 'one.md'),
      ],
      { cwd: REPO, encoding: 'utf8' },
    )
    assert.equal(
      formatted.status,
      0,
      `the written ledger is not prettier clean:\n${formatted.stdout}${formatted.stderr}`,
    )

    // And the tracked ledger itself, written by this script and never typed, carries the same
    // columns — the file docs/research/benchmark.md is the one the repository reads.
    const committed = readFileSync(join(REPO, LEDGER), 'utf8')
    assert.deepEqual(table(committed).header, columns, 'the tracked ledger has other columns')
    assert.ok(table(committed).rows.length > 0, 'the tracked ledger holds no row')
    assert.ok(!committed.includes('\r'), 'the tracked ledger holds a CR')

    // Every file this check wrote, listed, so a scoring that wrote nothing cannot pass.
    assert.deepEqual(
      readdirSync(out).sort(),
      ['one.md', 'one.md.json', 'ordered.json', 'ordered.md', 'two.md', 'two.md.json'].sort(),
      'the reader wrote something else, or did not write the ledger',
    )
  } finally {
    rmSync(record.dir, { recursive: true, force: true })
    rmSync(out, { recursive: true, force: true })
  }
})
