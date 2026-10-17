import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { copyFileSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { request } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { test } from 'node:test'
import {
  TABLES,
  openRecord,
  startBenchmarkView,
  type BenchmarkView,
} from '../packages/benchmark-read/src/index.ts'
import { closeDatabase, openDatabase } from '../packages/domain/src/index.ts'
import { names, sourceFiles } from './engine/source.ts'
import { REPO } from './_repo.ts'

// benchmark-view, Slice 4 — checks 10 and 18 (docs/features/benchmark-view.md, Gate 3): THE
// VENDORED BUILD, ITS ROUTE AND THE LAUNCHER. `vendor/echarts/echarts.min.js` is committed at
// the repository root, served by the page's own server, and read by nothing else;
// `scripts/benchmark-serve.mjs` reads two flags, hands them to `@cutroom/benchmark-read` and
// prints the URL. Nothing is fetched, here or at runtime (S-204).
//
// Check 10. `The vendored build is the pinned one, and it is out of reach of the name scans.
// GET /echarts.min.js returns the committed file's exact bytes; its SHA-256 equals the hash
// pinned in the check; no file under packages/ or apps/ imports or names it; the file itself is
// under neither of those folders, so tests/reel-plan-shapes.test.ts:116-130 cannot read its
// source: keys; and serving it writes nothing, the tree being compared before and after as
// check 13 compares it.`
//
// Check 18. `The launcher holds no logic. scripts/benchmark-serve.mjs is at most forty lines; it
// imports @cutroom/benchmark-read and node:process and nothing else; it names no table, no
// column and no route path; and it names <the script that spends> nowhere.` That last name is
// the one thing of check 18 not quoted here verbatim: paid-path's check 20 lets no test file
// but its own hold it (S-111), so it is BUILT from its two halves in the check below.
//
// TWO CLAUSES OF THOSE TWO CHECKS CANNOT BE GREEN AS THEY STAND, and each is built here as the
// strongest thing that is true rather than quietly reinterpreted — both are reported against
// the gates (S-016, S-197) for this file's amendment block:
//
//   * Check 10's "no file under packages/ or apps/ imports or NAMES it". Slice 3's page emits
//     `<script src="echarts.min.js">` into the served document, so a file under `packages/`
//     names it and must. What is asserted here is the clause that holds — no file under either
//     folder IMPORTS it, and none holds a byte of it — plus the EXACT set of files that name
//     it, pinned by a deep-equal, so a fourth namer fails.
//   * Check 18's "imports @cutroom/benchmark-read and node:process AND NOTHING ELSE". Gate 2
//     puts the database path's precedence in `scripts/_lib.mjs` — "which both
//     `scripts/benchmark.mjs` and `scripts/benchmark-serve.mjs` already import" — so the
//     launcher imports three things and cannot import two. The import list is pinned by a
//     deep-equal of all three, which still fails on a fourth.
//
// And check 2's SECOND CHILD, which Slice 1 owed to this slice: the gates' check 2 drives the
// path precedence "through both scripts as children" while `scripts/benchmark-serve.mjs`
// arrives here, so Slice 1 could drive one script only (that file's amendment 5).
//
// Nothing here spends, reaches a provider, reads a key or starts the engine: every database is
// a temporary one built from the committed fixtures, and `data/cutroom.sqlite` is never opened.

const LAUNCHER = join('scripts', 'benchmark-serve.mjs')
const VENDORED = join('vendor', 'echarts', 'echarts.min.js')
const DRAWING_ROUTE = '/echarts.min.js'
const FIXTURES = join(REPO, 'tests', 'fixtures', 'benchmark', 'ratings')

/**
 * The build this slice commits, measured on the copy it commits: ECharts 5.6.0 by its own
 * `version:"5.6.0"`, 1030855 bytes, SHA-256 below.
 * The pin is the whole point — Gate 2 forbids the file to "change without its pinned hash
 * changing with it", so a rebuilt or re-minified ECharts fails here and is a decision, not a
 * silent swap.
 */
const PINNED_SHA256 = 'e84270bd0cd5bdf60fefc26d00c2a391cb2e81f4d26a7a9ee16185a54773a3cf'
const PINNED_BYTES = 1_030_855

/** The two folders `tests/reel-plan-shapes.test.ts` reads, and this file may not sit under. */
const SCANNED = ['packages', 'apps'] as const

const sha256 = (bytes: Buffer): string => createHash('sha256').update(bytes).digest('hex')

// ---------------------------------------------------------------- the record, and the server

/** A value as SQLite takes it: a boolean as 0 or 1, an object as the JSON text a column holds. */
function bound(value: unknown): string | number | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'boolean') return value ? 1 : 0
  if (typeof value === 'object') return JSON.stringify(value)
  return value as string | number
}

/** One fixture, as the file holds it. */
function fixture(name: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(FIXTURES, `constructed-${name}.json`), 'utf8')) as Record<
    string,
    unknown
  >
}

/**
 * A temporary record holding the named fixtures' rows, migrated by the domain's opener and then
 * filled as the schema stores them. A surrogate integer `id` is left out so two fixtures' rows
 * cannot collide on one.
 */
function recordHolding(nameds: readonly string[], label = 'runs'): { dir: string; path: string } {
  const dir = mkdtempSync(join(tmpdir(), `cutroom-view-${label}-`))
  const path = join(dir, 'cutroom.sqlite')
  closeDatabase(openDatabase(path))
  const db = new DatabaseSync(path)
  try {
    for (const named of nameds) {
      const held = fixture(named)
      for (const table of ['run', ...TABLES]) {
        const rows = (
          Array.isArray(held[table]) ? held[table] : held[table] === undefined ? [] : [held[table]]
        ) as Array<Record<string, unknown>>
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
  return { dir, path }
}

/** Every file of a directory with its bytes, so "nothing moved" is the whole directory. */
function treeOf(dir: string): Array<[string, string]> {
  return readdirSync(dir)
    .sort()
    .map((name) => [name, readFileSync(join(dir, name)).toString('base64')] as [string, string])
}

/** Started on PORT 0, so the kernel names the port and two checks cannot collide on one. */
async function serving(dbPath: string): Promise<BenchmarkView> {
  const view = await startBenchmarkView({ dbPath })
  assert.ok(view.address.port > 0, 'the kernel named no port, so the server bound a fixed one')
  return view
}

/** One GET against a port, with the body as BYTES: the drawing build is compared byte for byte. */
function ask(port: number, path: string): Promise<{ status: number; type: string; body: Buffer }> {
  return new Promise((settle, fail) => {
    const call = request({ host: '127.0.0.1', port, path, method: 'GET' }, (answer) => {
      const chunks: Buffer[] = []
      answer.on('data', (chunk: Buffer) => chunks.push(chunk))
      answer.on('end', () =>
        settle({
          status: answer.statusCode ?? 0,
          type: String(answer.headers['content-type'] ?? ''),
          body: Buffer.concat(chunks),
        }),
      )
    })
    call.on('error', fail)
    call.end()
  })
}

// ---------------------------------------------------------------- 10

test('10. The vendored build is the pinned one, and it is out of reach of the name scans', async () => {
  // THE COMMITTED FILE, and the pin itself. Nothing in this repository fetches it: it is source,
  // copied in once and committed (Gate 2, "Where the vendored build may NOT live, measured").
  assert.ok(existsSync(join(REPO, VENDORED)), `${VENDORED} is not committed`)
  const bytes = readFileSync(join(REPO, VENDORED))
  assert.equal(bytes.length, PINNED_BYTES, `${VENDORED} is ${bytes.length} bytes`)
  assert.equal(sha256(bytes), PINNED_SHA256, `${VENDORED} is not the pinned build`)

  // GET /echarts.min.js RETURNS ITS EXACT BYTES — compared as bytes and then hashed, so a route
  // that re-encoded or truncated the file fails on the comparison rather than on its length.
  const made = recordHolding(['completed'], 'vendor')
  const view = await serving(made.path)
  try {
    const served = await ask(view.address.port, DRAWING_ROUTE)
    assert.equal(served.status, 200, String(served.status))
    assert.equal(served.body.length, bytes.length, 'the served build is a different length')
    assert.ok(served.body.equals(bytes), 'the served build is not the committed file')
    assert.equal(sha256(served.body), PINNED_SHA256, 'the served build is not the pinned build')
    // A browser executes what it is told is script, and refuses what it is told is text.
    assert.match(served.type, /javascript/, `the build is served as ${served.type}`)

    // And the route is the one the page asks for, in the document the server itself serves —
    // so the name on the wire and the name in the page cannot drift apart.
    const page = await ask(view.address.port, '/')
    assert.ok(
      page.body.toString('utf8').includes('"echarts.min.js"'),
      'the served page asks for no drawing build, so the route above serves nothing a reader uses',
    )
  } finally {
    await view.stop()
    rmSync(made.dir, { recursive: true, force: true })
  }

  // NO FILE UNDER packages/ OR apps/ IMPORTS IT. The scan is over every source file those two
  // folders hold, under the same walk `tests/reel-plan-shapes.test.ts` uses.
  const engine = sourceFiles(...SCANNED)
  assert.ok(engine.length > 0, 'the source walk found nothing, so this scan reads nothing')
  const importing = engine.filter((file) => {
    const text = readFileSync(join(REPO, file), 'utf8')
    return (
      /(?:from|import|require)\s*\(?\s*['"][^'"]*echarts[^'"]*['"]/.test(text) ||
      text.includes("'echarts'") ||
      text.includes('"echarts"')
    )
  })
  assert.deepEqual(importing, [], 'a file under packages/ or apps/ imports the vendored build')
  // The scan reads something: the same pattern DOES match an import of it.
  assert.match(
    "import x from '../../vendor/echarts/echarts.min.js'",
    /(?:from|import|require)\s*\(?\s*['"][^'"]*echarts[^'"]*['"]/,
    'the import scan matches no import of the build, so it reads as coverage',
  )

  // AND NO FILE UNDER THEM HOLDS A BYTE OF IT — an inlined copy is the other way the minified
  // text could arrive in a folder the name scans read.
  const window = bytes.subarray(2_048, 2_304).toString('utf8')
  assert.equal(window.length > 0, true, 'the window read out of the build is empty')
  const inlining = engine.filter((file) => readFileSync(join(REPO, file), 'utf8').includes(window))
  assert.deepEqual(inlining, [], 'a file under packages/ or apps/ holds the build inline')

  // "OR NAMES IT" CANNOT HOLD AS WRITTEN, and the measurement is here rather than in prose:
  // Slice 3's page emits the file's name as the document's one `<script src>`, and Slice 4's
  // route must name the file it serves. The EXACT set is pinned instead, so a fourth file
  // naming it fails — reported against check 10 as a finding (S-197).
  const naming = engine.filter((file) => readFileSync(join(REPO, file), 'utf8').includes('echarts'))
  assert.deepEqual(
    naming,
    [
      'packages/benchmark-read/src/draw.ts',
      'packages/benchmark-read/src/page.ts',
      'packages/benchmark-read/src/server.ts',
    ],
    'a file under packages/ or apps/ names the vendored build that did not before',
  )

  // THE FILE ITSELF IS UNDER NEITHER FOLDER, which is what keeps it out of the name scans.
  assert.deepEqual(
    engine.filter((file) => file.endsWith('echarts.min.js')),
    [],
    'the vendored build sits under a folder the name scans read',
  )
  assert.ok(VENDORED.startsWith('vendor'), `${VENDORED} is not under vendor/`)

  // THE POSITIVE CONTROL for that, read with the parser `tests/reel-plan-shapes.test.ts` check 5
  // uses: the build really does declare fields named `source`, twice, so its place is what keeps
  // that check green rather than luck.
  const declared = names([VENDORED.split('\\').join('/')])
  const forbidden = declared.filter((one) => one.name === 'source' && one.kind === 'field')
  assert.equal(
    forbidden.length,
    2,
    `the build declares ${forbidden.length} fields named source, not the two measured`,
  )

  // SERVING IT WRITES NOTHING — the window check 13's own sentence names, and then the whole
  // lifetime against the pristine copy, where the only entries that may appear are SQLite's own
  // reader state: a read-only connection to a WAL record materialises `cutroom.sqlite-shm` and
  // an empty `cutroom.sqlite-wal` on its first read and both survive the close (that file's
  // amendment 12, S-208). Nothing else, at startup or afterwards, is tolerated.
  const source = recordHolding(['completed'], 'writes')
  const dir = mkdtempSync(join(tmpdir(), 'cutroom-vendor-copy-'))
  const path = join(dir, 'cutroom.sqlite')
  copyFileSync(source.path, path)
  const pristine = treeOf(dir)
  assert.deepEqual(
    pristine.map(([name]) => name),
    ['cutroom.sqlite'],
    'the copy is not a lone database file',
  )

  const second = await serving(path)
  const before = treeOf(dir)
  try {
    // Twice, because a route that cached its first answer to disk would write on the first ask.
    for (const _ of [0, 1]) {
      const again = await ask(second.address.port, DRAWING_ROUTE)
      assert.equal(again.status, 200, String(again.status))
      assert.ok(again.body.equals(bytes), 'the served build changed between two asks')
    }
    assert.deepEqual(treeOf(dir), before, 'serving the build changed the directory beside it')
  } finally {
    await second.stop()
  }

  try {
    const after = treeOf(dir)
    assert.deepEqual(after, before, 'stopping the server changed the directory the record sits in')
    assert.deepEqual(
      after.filter(([name]) => name === 'cutroom.sqlite'),
      pristine,
      "the record's own bytes changed",
    )
    assert.deepEqual(
      after.map(([name]) => name),
      ['cutroom.sqlite', 'cutroom.sqlite-shm', 'cutroom.sqlite-wal'],
      'a file that is not SQLite’s own reader state appeared beside the record',
    )
    assert.equal(
      Buffer.from(after[2]?.[1] ?? 'x', 'base64').length,
      0,
      'the write-ahead log is not empty, so something wrote through this connection',
    )
    // And the served file is itself untouched: it is committed source, never an artifact.
    assert.equal(sha256(readFileSync(join(REPO, VENDORED))), PINNED_SHA256, 'the build changed')
    assert.deepEqual(
      readdirSync(join(REPO, 'vendor', 'echarts')).sort(),
      ['echarts.min.js'],
      'serving the build left something beside it',
    )
  } finally {
    rmSync(dir, { recursive: true, force: true })
    rmSync(source.dir, { recursive: true, force: true })
  }
})

// ---------------------------------------------------------------- 18

test('18. The launcher holds no logic', () => {
  const text = readFileSync(join(REPO, LAUNCHER), 'utf8')
  const lines = text.replace(/\n$/, '').split('\n')
  assert.ok(lines.length > 0, `${LAUNCHER} is empty, so this check reads nothing`)
  assert.ok(lines.length <= 40, `${LAUNCHER} is ${lines.length} lines`)

  // ITS IMPORTS, EXHAUSTIVELY — a deep-equal rather than a count, so a fourth import fails.
  // THREE, not the two check 18 names: Gate 2 puts the path precedence in `scripts/_lib.mjs`,
  // "which both scripts/benchmark.mjs and scripts/benchmark-serve.mjs already import", so the
  // launcher cannot both call that resolver and import two things. Reported as a finding.
  const imported = [...text.matchAll(/^import\s+(?:[^'"]*from\s+)?['"]([^'"]+)['"]/gm)]
    .map((one) => String(one[1]))
    .sort()
  assert.deepEqual(
    imported,
    ['./_lib.mjs', '@cutroom/benchmark-read', 'node:process'],
    imported.join(', '),
  )
  for (const other of ['require(', 'import(', 'createRequire']) {
    assert.equal(text.includes(other), false, `${LAUNCHER} reaches a module through ${other}`)
  }

  // IT NAMES NO TABLE. Every table the loader reads, as a whole word, over the WHOLE file —
  // comments included, because a launcher that explains the schema knows the schema.
  const tables = ['run', ...TABLES]
  const named = (word: string, where: string) => new RegExp(`\\b${word}\\b`).test(where)
  assert.deepEqual(
    tables.filter((table) => named(table, text)),
    [],
    `${LAUNCHER} names a table`,
  )

  // IT NAMES NO COLUMN. The set is read from the SCHEMA rather than written out here, so a
  // column added to the record joins this scan by itself.
  const made = mkdtempSync(join(tmpdir(), 'cutroom-vendor-columns-'))
  const columns = new Set<string>()
  try {
    const path = join(made, 'cutroom.sqlite')
    closeDatabase(openDatabase(path))
    const stored = openRecord({ path })
    try {
      for (const [, held] of stored.held) for (const column of held) columns.add(column)
    } finally {
      stored.close()
    }
  } finally {
    rmSync(made, { recursive: true, force: true })
  }
  assert.ok(columns.size > 50, `the schema gave ${columns.size} columns, so this scan reads little`)

  /**
   * The one column name the launcher may hold, and the reason it may: Gate 2's own table gives
   * the launcher `--port` — "read `--db` and `--port`, call the package, print the URL" — while
   * `port` is also a column of the record. The list is pinned by a deep-equal, so a second
   * exemption fails here rather than joining quietly (the shape S-209 settled for check 6).
   */
  const EXEMPT = ['port'] as const
  assert.deepEqual([...EXEMPT], ['port'], 'the exemption list moved')
  assert.ok(columns.has('port'), 'port is no longer a column, so the exemption is stale')
  assert.deepEqual(
    [...columns].filter((column) => !EXEMPT.includes(column as 'port') && named(column, text)),
    [],
    `${LAUNCHER} names a column of the record`,
  )

  // The two scans above read something: the same walk reports a table and a column in a line
  // that holds one of each.
  const sample = 'SELECT shot_unit FROM picture'
  assert.deepEqual(
    tables.filter((table) => named(table, sample)),
    ['picture'],
    'the table scan matches no table at all',
  )
  assert.ok(named('shot_unit', sample), 'the column scan matches no column at all')

  // IT NAMES NO ROUTE PATH: not the three the server answers, and no string literal that is a
  // path at all — so a launcher that opened a browser on one, or printed one, fails here.
  for (const route of ['/data', '/run/', DRAWING_ROUTE]) {
    assert.equal(text.includes(route), false, `${LAUNCHER} names the route ${route}`)
  }
  assert.deepEqual(
    [...text.matchAll(/(['"`])\/[^'"`\n]*\1/g)].map((one) => one[0]),
    [],
    `${LAUNCHER} holds a path as a string`,
  )

  // AND IT NAMES THE SCRIPT THAT SPENDS NOWHERE. The name is BUILT rather than written:
  // paid-path's check 20 reads every .mjs under scripts/ for it and forbids any test file but
  // its own from holding it either (S-111), so neither this file nor the launcher may.
  const spender = ['real', 'reel'].join('-')
  assert.equal(text.includes(spender), false, `${LAUNCHER} names the script that spends`)
  assert.equal(
    readFileSync(join(REPO, 'tests', 'benchmark-view-vendor.test.ts'), 'utf8').includes(spender),
    false,
    'this check writes the forbidden string instead of building it',
  )
})

// ---------------------------------------------------------------- 2, the second child

/**
 * The launcher as a CHILD, started against a record, with its printed URL read back. It binds
 * no fixed port: nothing here names one, so the kernel does, and two of these run at once.
 */
function launched(
  args: readonly string[],
  env: Record<string, string | undefined>,
): Promise<{ port: number; out: string; stop: () => Promise<void> }> {
  const child = spawn(
    process.execPath,
    ['--experimental-strip-types', '--no-warnings', LAUNCHER, ...args],
    { cwd: REPO, env: { ...process.env, ...env } },
  )
  let out = ''
  let err = ''
  return new Promise((settle, fail) => {
    const bound = setTimeout(() => {
      child.kill()
      fail(new Error(`the launcher printed no URL in 60 s:\n${out}\n${err}`))
    }, 60_000)
    const stop = () =>
      new Promise<void>((closed) => {
        child.once('close', () => closed())
        child.kill()
      })
    child.stderr.on('data', (chunk: Buffer) => {
      err += chunk.toString('utf8')
    })
    child.stdout.on('data', (chunk: Buffer) => {
      out += chunk.toString('utf8')
      const found = /http:\/\/127\.0\.0\.1:(\d+)/.exec(out)
      if (found === null) return
      clearTimeout(bound)
      settle({ port: Number(found[1]), out, stop })
    })
    child.once('close', (code) => {
      clearTimeout(bound)
      fail(new Error(`the launcher ended with ${code} before it printed a URL:\n${out}\n${err}`))
    })
  })
}

/** How many finished runs the page at a port is reading. */
async function runCount(port: number): Promise<number> {
  const answer = await ask(port, '/data')
  assert.equal(answer.status, 200, String(answer.status))
  return (JSON.parse(answer.body.toString('utf8')) as { runs: unknown[] }).runs.length
}

test("2. The path's precedence, driven through the SECOND script — the launcher Slice 1 could not reach", async () => {
  // THREE RECORDS HOLDING DIFFERENT NUMBERS OF RUNS, as check 2 requires: three records holding
  // the same rows is the lazy version, where every precedence passes because every answer is
  // the same. Here a wrong precedence reads a different record and says so.
  const one = recordHolding(['dead-in-plan'], 'one')
  const two = recordHolding(['dead-in-plan', 'completed'], 'two')
  const three = recordHolding(['dead-in-plan', 'completed', 'stopped-at-gate-1'], 'three')
  const started: Array<() => Promise<void>> = []
  try {
    // --db wins over CUTROOM_DB_PATH: one run, not three.
    const named = await launched(['--db', one.path], { CUTROOM_DB_PATH: three.path })
    started.push(named.stop)
    assert.equal(await runCount(named.port), 1, named.out)

    // CUTROOM_DB_PATH wins when no --db is given: three runs, not one.
    const byEnvironment = await launched([], { CUTROOM_DB_PATH: three.path })
    started.push(byEnvironment.stop)
    assert.equal(await runCount(byEnvironment.port), 3, byEnvironment.out)

    // And the record that was NOT chosen is not the one that answered.
    const third = await launched(['--db', two.path], { CUTROOM_DB_PATH: one.path })
    started.push(third.stop)
    assert.equal(await runCount(third.port), 2, third.out)

    // Three launchers are listening at once on three different ports, none of them named here:
    // the kernel chose each, which is what "never bind a fixed port" means in practice.
    const ports = [named.port, byEnvironment.port, third.port]
    for (const port of ports) assert.ok(port > 0, String(port))
    assert.equal(new Set(ports).size, 3, `two launchers took one port: ${ports.join(', ')}`)

    // THE THIRD LEVEL — the service's own `DEFAULT_DB_PATH` — IS NOT DRIVEN THROUGH A CHILD, and
    // the reason is that it would open `data/cutroom.sqlite`, the real record, which no check of
    // this feature touches. It is asserted directly over the resolver, all three levels, in
    // `tests/benchmark-view-loader.test.ts`; what is asserted here is that this launcher takes
    // that resolver rather than reading the environment itself, so there is no second copy of
    // the order to drift.
    const text = readFileSync(join(REPO, LAUNCHER), 'utf8')
    assert.match(
      text,
      /import \{[^}]*\bdatabasePath\b[^}]*\} from '\.\/_lib\.mjs'/,
      'the resolver is not used',
    )
    assert.match(text, /await databasePath\(/, 'the launcher does not call the resolver')
    assert.equal(
      /process\.env/.test(text),
      false,
      'the launcher reads the environment itself, which is the second copy of the precedence',
    )
  } finally {
    for (const stop of started) await stop()
    for (const made of [one, two, three]) rmSync(made.dir, { recursive: true, force: true })
  }
})

// ------------------------------------------------- the roots the launcher hands the loader

/**
 * The absolute-path shapes `tests/no-absolute-paths.test.ts:22-27` reads committed SOURCE for.
 * Here they are read over what a page SERVES, which that scan cannot see at all: a path that
 * arrived from a row was never in a file.
 */
const ABSOLUTE_SHAPES: ReadonlyArray<readonly [RegExp, string]> = [
  // The class is a BACKSLASH OR A SLASH, and the backslash is load-bearing: a Windows path
  // arrives with one, and doubled inside a JSON body. (`biome check --write` rewrote this class
  // to `[/]` as a "safe" fix while this guard was being written, which changed what it matches
  // and was caught by the positive control below — the fault CLAUDE.md warns about, from the
  // formatter rather than from a heredoc. Verify the file, not the command.)
  [/[A-Za-z]:[\\/]{1,2}(Users|Program|Windows)/, 'a Windows drive-letter path'],
  [/\/Volumes\//, 'a macOS volume path'],
  [/\/Users\/[A-Za-z]/, 'a macOS or Linux home path'],
  [/\/home\/[a-z]/, 'a Linux home path'],
]

/** One column of one row, written from OUTSIDE the server — the server itself writes nothing. */
function write(path: string, sql: string, values: readonly (string | number)[]): void {
  const db = new DatabaseSync(path)
  try {
    db.prepare(sql).run(...values)
  } finally {
    db.close()
  }
}

test("the launcher hands the loader the artifact root, so no absolute path reaches the page IT starts — NOT one of Gate 3's eighteen checks, a guard on this slice's finding 33", async () => {
  // END TO END, through the launcher as a child, because that is the only way the page is ever
  // started: `roots` is the caller's (`packages/benchmark-read/src/loader.ts`, "Given none, only
  // URLs are scrubbed"), so a launcher that passed none would leave D-086's half of the scrubber
  // inert in the one place it matters while every check that passes its own roots stayed green.
  // Measured before the fix: the planted path below was served in the page AND in /run/<id>.
  //
  // This is NOT check 14, which is Slice 3's and reads the payloads with roots named at startup.
  const made = recordHolding(['completed'], 'roots')
  const runId = String((fixture('completed').run as Record<string, unknown>).run_id)
  const planted = join(REPO, '.artifacts', 'pictures', 'shot-0.png')
  write(made.path, 'UPDATE picture SET prompt = ? WHERE run_id = ?', [
    `made from ${planted}`,
    runId,
  ])
  // The shapes read something: the planted path really is one of them.
  assert.ok(
    ABSOLUTE_SHAPES.some(([shape]) => shape.test(planted)),
    'the absolute-path shapes match no absolute path, so this guard reads nothing',
  )

  const launcher = await launched(['--db', made.path], {})
  try {
    const page = await ask(launcher.port, `/?run=${runId}`)
    const one = await ask(launcher.port, `/run/${runId}`)
    assert.equal(page.status, 200, String(page.status))
    assert.equal(one.status, 200, String(one.status))
    const bodies = [
      ['the page the launcher serves', page.body.toString('utf8')],
      ['GET /run/<id> from the launcher', one.body.toString('utf8')],
    ] as const
    for (const [what, body] of bodies) {
      // The crafted prompt arrived where a reader can see it, or the scan below reads a page
      // with nothing on it and passes on an empty set.
      assert.ok(body.includes('made from'), `${what} carries no crafted prompt at all`)
      for (const [shape, named] of ABSOLUTE_SHAPES) {
        assert.doesNotMatch(body, shape, `${what} carries ${named}`)
      }
    }
  } finally {
    await launcher.stop()
    rmSync(made.dir, { recursive: true, force: true })
  }
})
