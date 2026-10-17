import assert from 'node:assert/strict'
import { copyFileSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs'
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
import { REPO } from './_repo.ts'

// benchmark-view, Slice 2 — checks 3, 11, 12, 13, 16 and 17 (docs/features/benchmark-view.md,
// Gate 3): THE SERVER AND ITS ROUTES. `packages/benchmark-read` gains the local server, `GET /`
// (a minimal document — the page itself is Slice 3), `GET /data` and `GET /run/<id>`, the two
// payload builders, the 404s and the traversal refusals. It listens on PORT 0, so the kernel
// names the port and no check binds a fixed one, and nothing here drives a browser (Gate 2, "How
// it is checked without a browser"; S-111 refuses a check that skips when something is absent,
// and there is nothing here to skip).
//
// Check 3. `Finished runs only. A crafted database with one finished run and one running run:
// /data holds exactly the finished one, and the running run's id appears nowhere in the response
// body. Then the crafted run's state is flipped to finished and the count becomes two.`
//
// Check 11. `No registry dependency, no network. packages/benchmark-read/package.json declares
// every dependency as @cutroom/… at workspace:* and not one from a registry. Its source names no
// fetch(, no http.request, no https.request, no node-fetch; and the served HTML holds no
// absolute http:// or https:// URL at all.`
//
// Check 12. `It starts nothing. Over every source file of packages/benchmark-read, the collected
// list of spawnSync, spawn(, execSync, execFileSync, fork(, run(' and child_process under either
// spelling deep-equals [].`
//
// Check 13. `It writes nothing. The server is started against a copy of a database in a
// temporary directory, every route is exercised once, and the directory's file list and every
// file's bytes are identical before and after — the database file included.`
//
// Check 16. `The fleet payload carries no model text, and the run route carries all of it. GET
// /data holds no prompt, words, reasons or answer key at any depth; GET /run/<id> holds all four.`
//
// Check 17. `A bad request answers, and nothing escapes the served set. An unknown run id answers
// 404. GET /../../data/cutroom.sqlite, GET /%2e%2e/%2e%2e/data/cutroom.sqlite and GET
// /vendor/../../DECISIONS.md each answer 404, and the response holds no byte of the named file.`
//
// Checks 6, 7, 8, 9, 14 and 15 are Slice 3's and are NOT done here: they are the page's — the
// verdict-word scan, the group sizes, the grouping key, the scrubber on the way out, the
// absolute path on the way out and the numbers table behind every chart. Check 10 and check 18
// are Slice 4's. `GET /echarts.min.js` is not built here either: the file it serves arrives in
// Slice 4, and a route with nothing behind it is a check that could only pass by pretending
// (Gate 4).
//
// Nothing here spends, reaches a provider, reads a key or starts the engine: every database is a
// temporary one built from the committed fixtures, and `data/cutroom.sqlite` is never opened.

const PACKAGE = join('packages', 'benchmark-read')
const FIXTURES = join(REPO, 'tests', 'fixtures', 'benchmark', 'ratings')

/** The model text the `completed` fixture carries, read back out of what is served. */
const PICTURE_PROMPT = 'Make the opening frame of one shot of a short vertical reel.'
const TAKE_PROMPT = 'Film the shot of Open-Sea Wave for ten seconds.'
/** A whole clause of one refusal, with no quotation mark in it: a JSON body escapes those. */
const GATE1_REASON = '(Warning Buoy) is not shown'
const GATE7_QUESTION = 'Are the shots in a sensible order?'
/** Words a sensor read in a picture, written onto one picture so the `words` key carries text. */
const PICTURE_WORDS = 'TSUNAMI WARNING'

/**
 * A provider's answer VERBATIM, in the shape 21 of the real record's 52 endings carry: the
 * planner's call came back 402 and the engine wrote the body it was given into the run's result.
 * Written onto the crafted run that died in its plan stage.
 */
const PROVIDER_BODY =
  'the planner call to MiniMax-M2.7 was answered 402 ' +
  '{"type":"error","error":{"type":"insufficient_balance_error",' +
  '"message":"insufficient balance (1008)","http_code":"402"},' +
  '"request_id":"07006a6694d3ada494aeb448f03fd529"}'

/** Pieces of it with no quotation mark in them, so a JSON body's escaping cannot hide them. */
const PROVIDER_PIECES = [
  'was answered 402',
  'insufficient_balance_error',
  '07006a6694d3ada494aeb448f03fd529',
] as const

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

/** A fixture's run id, read from the file rather than written out here twice. */
const runIdOf = (name: string): string =>
  String((fixture(name).run as Record<string, unknown>).run_id)

/**
 * A temporary record holding the named fixtures' rows, migrated by the domain's opener and then
 * filled as the schema stores them. A surrogate integer `id` is left out so two fixtures' rows
 * cannot collide on one.
 */
function recordHolding(names: readonly string[], label = 'runs'): { dir: string; path: string } {
  const dir = mkdtempSync(join(tmpdir(), `cutroom-view-${label}-`))
  const path = join(dir, 'cutroom.sqlite')
  closeDatabase(openDatabase(path))
  const db = new DatabaseSync(path)
  try {
    for (const name of names) {
      const held = fixture(name)
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

/** One column of one row, written from OUTSIDE the server — the server itself writes nothing. */
function write(path: string, sql: string, values: readonly (string | number)[]): void {
  const db = new DatabaseSync(path)
  try {
    db.prepare(sql).run(...values)
  } finally {
    db.close()
  }
}

/** Every file of a directory with its bytes, so "nothing moved" is the whole directory. */
function treeOf(dir: string): Array<[string, string]> {
  return readdirSync(dir)
    .sort()
    .map((name) => [name, readFileSync(join(dir, name)).toString('base64')] as [string, string])
}

/**
 * Started on PORT 0 — always, in every check here — so the kernel names the port and two checks
 * running at once cannot collide on one.
 */
async function serving(dbPath: string, roots?: readonly string[]): Promise<BenchmarkView> {
  const view = await startBenchmarkView({ dbPath, roots })
  assert.ok(view.address.port > 0, 'the kernel named no port, so the server bound a fixed one')
  return view
}

/** A string as it stands inside a JSON body, where a separator arrives doubled. */
const inJson = (text: string): string => JSON.stringify(text).slice(1, -1)

/**
 * One GET, with the path written on the wire EXACTLY as it is given here. `node:http` sends the
 * `path` option verbatim, where a URL-based client normalises `/../../x` to `/x` before it ever
 * reaches the server — and an unnormalised traversal is half of what check 17 asks about.
 */
function ask(view: BenchmarkView, path: string): Promise<{ status: number; body: Buffer }> {
  return new Promise((settle, fail) => {
    const call = request(
      { host: '127.0.0.1', port: view.address.port, path, method: 'GET' },
      (answer) => {
        const chunks: Buffer[] = []
        answer.on('data', (chunk: Buffer) => chunks.push(chunk))
        answer.on('end', () =>
          settle({ status: answer.statusCode ?? 0, body: Buffer.concat(chunks) }),
        )
      },
    )
    call.on('error', fail)
    call.end()
  })
}

/** Every key of a payload, at every depth. */
function keysOf(value: unknown, out: Set<string> = new Set<string>()): Set<string> {
  if (Array.isArray(value)) {
    for (const item of value) keysOf(item, out)
    return out
  }
  if (value !== null && typeof value === 'object') {
    for (const [key, inner] of Object.entries(value)) {
      out.add(key)
      keysOf(inner, out)
    }
  }
  return out
}

/** Every `.ts` file of the package's source, with its text. */
function sources(): Array<[string, string]> {
  const out: Array<[string, string]> = []
  const walk = (dir: string): void => {
    for (const entry of readdirSync(join(REPO, dir), { withFileTypes: true })) {
      const child = join(dir, entry.name)
      if (entry.isDirectory()) walk(child)
      else if (entry.name.endsWith('.ts'))
        out.push([child, readFileSync(join(REPO, child), 'utf8')])
    }
  }
  walk(join(PACKAGE, 'src'))
  assert.ok(out.length > 0, `${PACKAGE}/src holds no TypeScript file, so this scan reads nothing`)
  return out
}

// ---------------------------------------------------------------- 3

test('3. Finished runs only', async () => {
  // A CRAFTED record: all 52 runs of the real one are `finished` and none is `running`, so the
  // real data cannot exercise this filter at all (Gate 2, "Where each figure comes from").
  const made = recordHolding(['completed', 'stopped-at-gate-1'], 'finished')
  const finished = runIdOf('completed')
  const running = runIdOf('stopped-at-gate-1')
  write(made.path, 'UPDATE run SET state = ? WHERE run_id = ?', ['running', running])

  const view = await serving(made.path)
  try {
    const fleet = await ask(view, '/data')
    assert.equal(fleet.status, 200, String(fleet.status))
    const text = fleet.body.toString('utf8')
    const payload = JSON.parse(text) as { runs: Array<{ runId: string }> }
    assert.deepEqual(
      payload.runs.map((one) => one.runId),
      [finished],
      'the fleet payload is not exactly the finished run',
    )
    // NOWHERE in the body, not merely absent from the run list: a running run reached through
    // any other field of the payload is the same leak.
    assert.equal(text.includes(running), false, "the running run's id is in the response body")

    // And its own route does not serve it either.
    assert.equal((await ask(view, `/run/${running}`)).status, 404, 'a running run has a scorecard')

    // Flipped to finished, the count becomes two — the same server, so no answer here is a
    // payload built once at startup and handed out afterwards.
    write(made.path, 'UPDATE run SET state = ? WHERE run_id = ?', ['finished', running])
    const again = await ask(view, '/data')
    assert.equal(again.status, 200, String(again.status))
    const both = JSON.parse(again.body.toString('utf8')) as { runs: Array<{ runId: string }> }
    assert.deepEqual(
      [...both.runs.map((one) => one.runId)].sort(),
      [finished, running].sort(),
      'the flipped run did not join the fleet payload',
    )
    assert.equal((await ask(view, `/run/${running}`)).status, 200, 'the flipped run has no route')
  } finally {
    await view.stop()
    rmSync(made.dir, { recursive: true, force: true })
  }
})

// ---------------------------------------------------------------- 11

test('11. No registry dependency, no network', async () => {
  const manifest = JSON.parse(readFileSync(join(REPO, PACKAGE, 'package.json'), 'utf8')) as Record<
    string,
    Record<string, string> | undefined
  >
  const declared = Object.entries({
    ...manifest.dependencies,
    ...manifest.devDependencies,
    ...manifest.peerDependencies,
    ...manifest.optionalDependencies,
  })
  // The house form is a `workspace:*` dependency on another `@cutroom/…` package, and the
  // package declares one — so this scan reads something rather than passing an empty list.
  assert.ok(declared.length > 0, 'the package declares no dependency, so this scan reads nothing')
  assert.deepEqual(
    declared.filter(([name, range]) => !name.startsWith('@cutroom/') || range !== 'workspace:*'),
    [],
    'a dependency of the package comes from a registry',
  )

  // The source names no outbound call, under any of the four spellings.
  const OUTBOUND = ['fetch(', 'http.request', 'https.request', 'node-fetch'] as const
  const named: string[] = []
  for (const [file, text] of sources()) {
    for (const token of OUTBOUND) if (text.includes(token)) named.push(`${file}: ${token}`)
  }
  assert.deepEqual(named, [], 'the package names an outbound call')
  // The scan itself, against a text that holds every one of them: a scan that stopped matching
  // would otherwise read as coverage over every file at once.
  for (const token of OUTBOUND) {
    assert.ok(`a ${token} b`.includes(token), `the scan does not match ${token}`)
  }

  // And the served HTML holds no absolute URL AT ALL. ECharts 5.5.1 is not on cdnjs — it 404s
  // there — which is the failure behind this clause: the mockup's first draft loaded it from one.
  const made = recordHolding(['completed'], 'html')
  const view = await serving(made.path)
  try {
    const page = await ask(view, '/')
    assert.equal(page.status, 200, String(page.status))
    const html = page.body.toString('utf8')
    assert.match(html, /<html/i, 'GET / served no document')
    assert.doesNotMatch(html, /https?:\/\//i, 'the served HTML holds an absolute URL')
  } finally {
    await view.stop()
    rmSync(made.dir, { recursive: true, force: true })
  }
})

// ---------------------------------------------------------------- 12

test('12. It starts nothing', () => {
  // A DEEP-EQUAL AGAINST THE EMPTY LIST, never a count: a count is what a new starter satisfies
  // by being the one that was already there.
  const STARTERS = [
    'spawnSync',
    'spawn(',
    'execSync',
    'execFileSync',
    'fork(',
    "run('",
    'child_process',
    'node:child_process',
  ] as const
  const started: string[] = []
  for (const [file, text] of sources()) {
    for (const token of STARTERS) if (text.includes(token)) started.push(`${file}: ${token}`)
  }
  assert.deepEqual(started, [], 'the package starts a process')
  for (const token of STARTERS) {
    assert.ok(`a ${token} b`.includes(token), `the scan does not match ${token}`)
  }
})

// ---------------------------------------------------------------- 13

test('13. It writes nothing', async () => {
  const made = recordHolding(['completed'], 'source')
  // A COPY, in a temporary directory of its own: the whole directory is compared, so a cache, an
  // export, a generated page or a temporary file beside the database is caught as well as the
  // database.
  const dir = mkdtempSync(join(tmpdir(), 'cutroom-view-copy-'))
  const path = join(dir, 'cutroom.sqlite')
  copyFileSync(made.path, path)
  const pristine = treeOf(dir)
  assert.deepEqual(
    pristine.map(([name]) => name),
    ['cutroom.sqlite'],
    'the copy is not a lone database file',
  )

  const view = await serving(path)
  // Measured, and reported against this check as a finding: the record is a WAL database (D-001),
  // and SQLite materialises a reader's shared-memory index on its FIRST READ — so `cutroom.sqlite
  // -shm` and an empty `cutroom.sqlite-wal` appear while the loader reads `sqlite_master`, under
  // `{ readOnly: true }`, with no way to decline them (`node:sqlite` in Node 22.14 enables no URI
  // filename, so `immutable=1` cannot be asked for, and an immutable open would make check 3's
  // flipped run invisible). The window this check compares is therefore the one its own sentence
  // names — the server started, then every route exercised once — and the whole LIFETIME is
  // pinned below against the pristine copy, where the only two entries that may appear are those
  // two, named, with the `-wal` empty. Nothing else, at startup or afterwards, is tolerated.
  const before = treeOf(dir)
  try {
    // Every route this slice serves, once each, and the refusals with them.
    for (const route of [
      '/',
      '/data',
      `/run/${runIdOf('completed')}`,
      '/run/no-such-run',
      '/nothing',
    ]) {
      await ask(view, route)
    }
    assert.deepEqual(treeOf(dir), before, 'serving the record changed the directory it sits in')
  } finally {
    await view.stop()
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
  } finally {
    rmSync(dir, { recursive: true, force: true })
    rmSync(made.dir, { recursive: true, force: true })
  }
})

// ---------------------------------------------------------------- 16

test('16. The fleet payload carries no model text, and the run route carries all of it', async () => {
  const made = recordHolding(['completed', 'dead-in-plan'], 'words')
  const runId = runIdOf('completed')
  const diedId = runIdOf('dead-in-plan')
  // The fixture's pictures carry no read words, so one picture is given some: a `words` key that
  // is always an empty array is a key the run route could hold while carrying nothing.
  write(made.path, 'UPDATE picture SET words = ? WHERE run_id = ? AND picture_id = ?', [
    JSON.stringify([PICTURE_WORDS]),
    runId,
    'a1-shot-0-a',
  ])
  // And the run that died in its planner call is given the ending a real one has: a provider's
  // answer VERBATIM. The fleet payload carries the outcome and the stage, never this.
  const result = JSON.parse(
    String((fixture('dead-in-plan').run as Record<string, unknown>).result),
  ) as Record<string, unknown>
  result.detail = PROVIDER_BODY
  write(made.path, 'UPDATE run SET result = ? WHERE run_id = ?', [JSON.stringify(result), diedId])

  const TEXT = [PICTURE_PROMPT, TAKE_PROMPT, GATE1_REASON, GATE7_QUESTION, PICTURE_WORDS] as const
  const FOLDED = ['prompt', 'words', 'reasons', 'answer'] as const

  const view = await serving(made.path)
  try {
    // The key walk itself: it reads a key at depth, inside an array, or it would report an empty
    // set for every payload and pass the first half of this check on nothing.
    assert.deepEqual(
      [...keysOf({ a: [{ b: { prompt: 'x' } }] })].sort(),
      ['a', 'b', 'prompt'],
      'the key walk does not reach a key at depth',
    )

    const fleet = await ask(view, '/data')
    assert.equal(fleet.status, 200, String(fleet.status))
    const fleetText = fleet.body.toString('utf8')
    const fleetKeys = keysOf(JSON.parse(fleetText))
    assert.deepEqual(
      FOLDED.filter((key) => fleetKeys.has(key)),
      [],
      'the fleet payload carries a model-text key',
    )
    // And not the text under another name, either.
    for (const text of TEXT) {
      assert.equal(fleetText.includes(text), false, `the fleet payload carries ${text}`)
    }
    assert.ok(fleetText.includes(runId), 'the fleet payload holds no run at all')
    assert.ok(fleetText.includes(diedId), 'the fleet payload holds no run that died')

    // A PROVIDER'S RAW ANSWER is model text of the same kind, and the fleet payload carries none
    // of it: no `detail` key at any depth, and none of the body a real planner call came back
    // with. The ending's state and the stage it died at are what the overview reads, and the
    // detail view is where a detail belongs (this slice's finding 14, the main session's call).
    assert.equal(fleetKeys.has('detail'), false, "the fleet payload carries an ending's detail")
    for (const piece of PROVIDER_PIECES) {
      assert.equal(fleetText.includes(piece), false, `the fleet payload carries ${piece}`)
    }
    assert.ok(
      fleetText.includes('"status":"failed"'),
      'the fleet payload carries no ending at all, so the clause above passes on nothing',
    )

    // The second half, in the same check: a payload builder that silently dropped the words
    // fails here rather than passing on the first half.
    const one = await ask(view, `/run/${runId}`)
    assert.equal(one.status, 200, String(one.status))
    const oneText = one.body.toString('utf8')
    const oneKeys = keysOf(JSON.parse(oneText))
    assert.deepEqual(
      FOLDED.filter((key) => !oneKeys.has(key)),
      [],
      'the run route drops a model-text key',
    )
    for (const text of TEXT) {
      assert.ok(oneText.includes(text), `the run route carries the key but not ${text}`)
    }

    // The other half of the same reading: `GET /run/<id>` keeps ALL of it, the provider's answer
    // included, because that is what a detail view is for.
    const diedOne = await ask(view, `/run/${diedId}`)
    assert.equal(diedOne.status, 200, String(diedOne.status))
    const diedText = diedOne.body.toString('utf8')
    assert.ok(keysOf(JSON.parse(diedText)).has('detail'), "the run route drops the ending's detail")
    for (const piece of PROVIDER_PIECES) {
      assert.ok(diedText.includes(piece), `the run route drops ${piece}`)
    }
  } finally {
    await view.stop()
    rmSync(made.dir, { recursive: true, force: true })
  }
})

// ---------------------------------------------------------------- 17

test('17. A bad request answers, and nothing escapes the served set', async () => {
  const made = recordHolding(['completed'], 'escape')
  const view = await serving(made.path)
  try {
    // An unknown run id answers 404 — not 200 with an empty scorecard, and not a stack trace.
    for (const unknown of ['/run/no-such-run', `/run/${runIdOf('dead-in-plan')}`, '/run/']) {
      const answer = await ask(view, unknown)
      assert.equal(answer.status, 404, `${unknown} answered ${answer.status}`)
    }

    // Each named path, WRITTEN ON THE WIRE AS IT STANDS and again as a client would normalise
    // it: `/../../data/cutroom.sqlite` reaches a server as `/data/cutroom.sqlite` through any
    // URL-based client, so a route that matched `/data` by prefix would answer it.
    const ESCAPES = [
      '/../../data/cutroom.sqlite',
      '/data/cutroom.sqlite',
      '/%2e%2e/%2e%2e/data/cutroom.sqlite',
      '/vendor/../../DECISIONS.md',
      '/DECISIONS.md',
      '/vendor/echarts/echarts.min.js',
    ] as const

    // What "no byte of the named file" is measured against: windows of the files themselves —
    // the record the server has open, and a tracked file above the served set.
    const decisions = readFileSync(join(REPO, 'DECISIONS.md'))
    const record = readFileSync(made.path)
    const windows = [
      decisions.subarray(0, 48),
      decisions.subarray(400, 448),
      record.subarray(0, 48),
      record.subarray(96, 144),
    ]
    for (const [i, window] of windows.entries()) {
      assert.equal(window.length, 48, `window ${i} is not read out of a file`)
      const from = i < 2 ? decisions : record
      assert.ok(from.includes(window), `window ${i} does not come from the file it names`)
    }

    for (const path of ESCAPES) {
      const answer = await ask(view, path)
      assert.equal(answer.status, 404, `${path} answered ${answer.status}`)
      for (const [i, window] of windows.entries()) {
        assert.equal(
          answer.body.includes(window),
          false,
          `${path} answered with bytes of file window ${i}`,
        )
      }
      // The refusal is the one short body, so it cannot be a file under another name.
      assert.ok(answer.body.length < 64, `${path} answered ${answer.body.length} bytes`)
    }

    // The served set itself still answers, so none of the above passed by the server being down.
    assert.equal((await ask(view, '/data')).status, 200, '/data stopped answering')
  } finally {
    await view.stop()
    rmSync(made.dir, { recursive: true, force: true })
  }
})

// ------------------------------------------- the scrubber on the way out, which is NOT check 9

test('the scrubber on the way out of BOTH served payloads — NOT check 9, which also covers the served HTML and is Slice 3’s', async () => {
  // S-207's call, one slice on. Gate 2: "the scrubber moves into the loader and every string the
  // page serves passes through it". This slice's own deliberate break — the deep scrub returning
  // each string unchanged — left every other test in this file green, so from this commit a live
  // D-022 and D-086 redaction would be one line away from silently off.
  //
  // **This is not check 9 and does not discharge it.** Check 9 is the scrubber on the way out of
  // the served payload AND THE SERVED HTML; the document served here is the minimal one, which
  // carries no row at all, and the page that renders rows is Slice 3's.
  const made = recordHolding(['completed'], 'scrub')
  const runId = runIdOf('completed')
  // Built from parts, never written out: D-086, and tests/no-absolute-paths.test.ts reads a test
  // exactly as it reads code.
  const ARTIFACTS = join(REPO, '.artifacts')
  const URL_WITH_KEY = 'https://oss.example.com/x?OSSAccessKeyId=AK&Signature=s'
  // The positive control, and the reason it exists: S-199's round-3 finding was a WIDENED
  // scrubber that ate exactly these two. Both lengths are asserted first, so the control is
  // really the shapes it claims to be.
  const BRIEF_KEY = '3a7f1c9e5b2d84600f1e7c35a9d2b48e6071c3df925a8b4e1d6f0a73c82b5e94'
  assert.equal(runId.length, 36, 'the run id is not a run id')
  assert.equal(BRIEF_KEY.length, 64, 'the brief key is not a brief key')

  // A prompt is where a presigned URL really sits (D-022's failure shape), and it travels in
  // `GET /run/<id>`. The world id is a caller's string that travels in `GET /data`, which after
  // the ending's detail came out is where the fleet payload's free text lives.
  write(made.path, 'UPDATE picture SET prompt = ? WHERE run_id = ? AND picture_id = ?', [
    `reference ${join(ARTIFACTS, 'pictures', 'shot-0.png')} for run ${runId} ` +
      `(brief ${BRIEF_KEY}) signed ${URL_WITH_KEY}`,
    runId,
    'a1-shot-0-a',
  ])
  const canonical = JSON.parse(
    String((fixture('completed').run as Record<string, unknown>).request_canonical),
  ) as Record<string, unknown>
  canonical.worldId =
    `${join(ARTIFACTS, 'worlds', 'tsunamis.json')} ${BRIEF_KEY} ${URL_WITH_KEY}` + ` run ${runId}`
  write(made.path, 'UPDATE run SET request_canonical = ? WHERE run_id = ?', [
    JSON.stringify(canonical),
    runId,
  ])

  const view = await serving(made.path, [ARTIFACTS, REPO])
  try {
    for (const [route, kept] of [
      ['/data', 'tsunamis.json'],
      [`/run/${runId}`, 'shot-0.png'],
    ] as const) {
      const answer = await ask(view, route)
      assert.equal(answer.status, 200, `${route} answered ${answer.status}`)
      const body = answer.body.toString('utf8')

      // The URL is gone, with every token of its query string, and `<url>` stands where it was.
      for (const piece of ['oss.example.com', 'OSSAccessKeyId', 'Signature', 'https://']) {
        assert.equal(body.includes(piece), false, `${route} serves ${piece}`)
      }
      assert.ok(body.includes('<url>'), `${route} drops the URL instead of marking it`)

      // The artifact root is gone and what stood under it is a RELATIVE path, not a deletion.
      assert.equal(body.includes(inJson(ARTIFACTS)), false, `${route} serves the artifact root`)
      assert.equal(body.includes(inJson(REPO)), false, `${route} serves the repository root`)
      assert.ok(body.includes(kept), `${route} erased the path instead of making it relative`)

      // THE POSITIVE CONTROL: a run id and a brief key in those same strings, unchanged.
      assert.ok(body.includes(runId), `${route} ate the run id`)
      assert.ok(body.includes(BRIEF_KEY), `${route} ate the brief key`)
    }
  } finally {
    await view.stop()
    rmSync(made.dir, { recursive: true, force: true })
  }
})

// ---------------------------------------------------------------- what the record is, once

test('the fixtures this file reads are what it says they are', () => {
  // Not a numbered check: the five texts above are read back out of what is served, so a fixture
  // that stopped carrying one would turn check 16 red for a reason that is not check 16's.
  const made = recordHolding(['completed'], 'texts')
  try {
    const stored = openRecord({ path: made.path })
    try {
      const rows = stored.rowsOf(runIdOf('completed'))
      assert.equal(String(rows.run.state), 'finished', 'the fixture run is not finished')
      assert.ok(
        rows.picture.some((picture) => String(picture.prompt).includes(PICTURE_PROMPT)),
        'no picture carries the pinned prompt',
      )
      assert.ok(
        rows.take.some((take) => String(take.prompt).includes(TAKE_PROMPT)),
        'no take carries the pinned prompt',
      )
      assert.ok(
        rows.picture.some((picture) => String(picture.gate1).includes(GATE1_REASON)),
        'no picture carries the pinned Gate 1 reason',
      )
      assert.ok(
        rows.render.some((render) => String(render.gate7).includes(GATE7_QUESTION)),
        'the render carries no Gate 7 question',
      )
    } finally {
      stored.close()
    }
  } finally {
    rmSync(made.dir, { recursive: true, force: true })
  }
})
