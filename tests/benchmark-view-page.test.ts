import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { request } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { test } from 'node:test'
import {
  TABLES,
  fleetPayload,
  openRecord,
  runPayload,
  startBenchmarkView,
  type BenchmarkView,
} from '../packages/benchmark-read/src/index.ts'
import { closeDatabase, openDatabase } from '../packages/domain/src/index.ts'
import { REPO } from './_repo.ts'

// benchmark-view, Slice 3 — checks 6, 7, 8, 9, 14 and 15 (docs/features/benchmark-view.md,
// Gate 3): THE PAGE. `GET /` stops serving Slice 2's minimal document and serves the four views,
// the eight charts, the four group-by cards, the comparison board, the run view with the words
// folded, a numbers table in every chart panel, the true-black theme and the validated palette.
//
// Everything here is asserted from the SERVED HTML and the two payloads, over a server started on
// PORT 0 against a crafted record. No browser, no fixed port, nothing skipped (Gate 2, "How it is
// checked without a browser"; S-111). The page references `echarts.min.js` as a RELATIVE url and
// is read here as a document without it: the vendored build and its route are Slice 4's, and a
// check that needed them would be a slice needing what a later slice adds (Gate 4).
//
// Check 6. `No verdict word anywhere. The served HTML and both payloads hold none of better,
// worse, improved, improvement, regressed, regression, won, lost, winner, significant,
// confidence, p-value, uplift. Positive control in the same check: the same scan run over the
// string scores improved must report it.` Read as S-208 settles it: the scan runs over the served
// HTML's RENDERED TEXT and over the payloads' STRING VALUES, not their key names — `lost` is a
// scorecard key three times over in a verified feature — and a second assertion pins where every
// `lost` stands, so one more fails. **Two allowances, each named and each pinned by a deep-equal
// so it cannot grow quietly** (the main session's call on this slice's findings 20 and 21): the
// six VERBATIM MODEL TEXT fields are not scanned, because the record quotes a model word for word
// and a model's own words are not a verdict this page draws; and `run.estimateExcludes`, which is
// OUR OWN explanatory constant and is kept in the payload, is allowed by name in the `lost` pin.
// **And the scan runs over `data/cutroom.sqlite` itself**, all 52 runs, through both payload
// builders — a check green on five fixtures and unknown on the real record is the shape this
// feature keeps being caught by. Nothing is skipped when the record is absent: the check says so
// and fails (S-111).
//
// Check 7. `Group size, and the small-group treatment. Every group in the payload carries its
// decided count; a group whose decided is below ten carries confident: false and is drawn
// outlined, and one at ten or above carries confident: true. The discriminating case is the
// boundary: nine is false, ten is true. No band is computed anywhere.`
//
// Check 8. `The grouping keys off shot_unit, never a parsed id. A crafted picture whose
// picture_id ends in no digit still lands in the group its shot_unit names; a picture whose
// shot_unit is beyond the selected plan's shot count joins no group rather than the last one; and
// a run whose plan was never selected contributes to no group at all.`
//
// Check 9. `The scrubber on the way out. A crafted prompt holding a presigned url serves as
// <url>; a crafted absolute artifact path serves relative. Positive control: a 36-character run
// id and a 64-character brief key in the same string survive unchanged.` Slice 2's guard covers
// the two payloads (S-207, S-208); this one covers the SERVED HTML, which Slice 2's minimal
// document carried no row of.
//
// Check 14. `No absolute path reaches the page. A crafted run whose picture.path, render output
// and hold rows are all absolute: no response body matches an absolute-path shape, in either
// payload or the HTML.`
//
// Check 15. `Every chart can be read as numbers. The served HTML holds, for each chart the page
// draws — where reels die, scores over time, the four group-by cards, cost and wall clock, and
// the run view's own seconds-and-cents bar, eight in all — a table whose row count equals the
// number of points the payload gives that chart.` Every expected count here is computed from
// `/data` and `/run/<id>`, never from the page's own embedded block, or the check would be the
// page agreeing with itself.
//
// The last test of this file is NOT one of Gate 3's eighteen: it is a guard the main session
// added on this slice's finding 29, over `GET /?run=<id>`, the one route shape no gate sentence
// names. Its own title says so, the way Slice 1's and Slice 2's scrubber guards do (S-207).
//
// Checks 1, 2, 4 and 5 are Slice 1's; 3, 11, 12, 13, 16 and 17 are Slice 2's; 10 and 18 are Slice
// 4's. Nothing here spends, reaches a provider, reads a key or starts the engine: every database
// a SERVER is started against is a temporary one built from the committed fixtures. Check 6 alone
// opens `data/cutroom.sqlite`, READ-ONLY and through the loader, and only to scan the words it
// holds — which is a machine dependency on a gitignored file, reported as finding 30.

const FIXTURES = join(REPO, 'tests', 'fixtures', 'benchmark', 'ratings')

/** The eight charts the page draws, named rather than counted (check 15, S-205's fault 4). */
const CHARTS = [
  'where-reels-die',
  'scores-over-time',
  'group-subjects-in-shot',
  'group-picture-rule',
  'group-plan-shots',
  'group-world',
  'cost-and-wall-clock',
  'run-seconds-and-cents',
] as const

/** Check 6's list, exactly as Gate 3 writes it. Not one word of it is dropped (S-208). */
const VERDICT_WORDS = [
  'better',
  'worse',
  'improved',
  'improvement',
  'regressed',
  'regression',
  'won',
  'lost',
  'winner',
  'significant',
  'confidence',
  'p-value',
  'uplift',
] as const

/**
 * THE VERBATIM MODEL TEXT a payload carries, skipped by the value scan — **a list, never a
 * pattern**, and pinned below so a seventh field cannot quietly join it.
 *
 * The record quotes a model word for word, so any of the thirteen words a model writes lands in
 * a payload: measured over all 52 runs of the real record, one take's `expandedPrompt` holds
 * `significant`. A model's own words are not a verdict this page draws, and scrubbing them would
 * be editing the evidence — so they are exempted by name, in S-208's shape, and **everything
 * else in both payloads is still scanned with all thirteen words** (the main session's call on
 * this slice's finding 20).
 */
const MODEL_TEXT_FIELDS = [
  'detail',
  'expandedPrompt',
  'prompt',
  'reasons',
  'text',
  'words',
] as const

/**
 * OUR OWN explanatory constant, which is not a model's words and so is not exempted above: it is
 * allowed BY NAME in the `lost` pin below, where a fifth occurrence fails.
 * `run.estimateExcludes` is `@cutroom/benchmark`'s ESTIMATE_EXCLUDES, whose last clause reads
 * "and every lost call, whose cents are paid and produce nothing".
 */
const EXPLANATORY_FIELDS = ['estimateExcludes'] as const

/** What the value scan does not read, and nothing else. */
const NOT_SCANNED: readonly string[] = [...MODEL_TEXT_FIELDS, ...EXPLANATORY_FIELDS]

/**
 * Every place `lost` may appear in either payload: the three scorecard KEYS a verified feature
 * ships (S-208), and the one explanatory constant above, by the path it sits at. A fifth
 * occurrence — a key or a value — fails.
 */
const LOST_SITES = [
  'key callsLost',
  'key lost',
  'key lostCalls',
  'value at .run.estimateExcludes',
] as const

/**
 * An absolute path's shape, as `tests/no-absolute-paths.test.ts:23-27` writes it. That test scans
 * SOURCE; check 14 is about a path that arrived from a row, which no source scan can see.
 */
const ABSOLUTE_SHAPES: ReadonlyArray<readonly [RegExp, string]> = [
  [/[A-Za-z]:[\\/]{1,2}(Users|Program|Windows)/, 'a Windows drive-letter path'],
  [/\/Volumes\//, 'a macOS volume path'],
  [/\/Users\/[A-Za-z]/, 'a macOS or Linux home path'],
  [/\/home\/[a-z]/, 'a Linux home path'],
]

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
 * filled as the schema stores them (the shape `tests/benchmark-view-server.test.ts` set).
 */
function recordHolding(names: readonly string[], label = 'runs'): { dir: string; path: string } {
  const dir = mkdtempSync(join(tmpdir(), `cutroom-page-${label}-`))
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

/** One statement, written from OUTSIDE the server — the server itself writes nothing. */
function write(path: string, sql: string, values: readonly (string | number)[]): void {
  const db = new DatabaseSync(path)
  try {
    db.prepare(sql).run(...values)
  } finally {
    db.close()
  }
}

/** One column of one row, read back from outside the server. */
function read(path: string, sql: string, values: readonly (string | number)[]): unknown {
  const db = new DatabaseSync(path)
  try {
    return db.prepare(sql).get(...values)
  } finally {
    db.close()
  }
}

/** A crafted decided picture: the row a group is built out of, with Gate 1's verdict on it. */
function craftPicture(
  path: string,
  runId: string,
  pictureId: string,
  seq: number,
  shotUnit: number,
  refused: boolean,
): void {
  const gate1 = JSON.stringify({
    outcome: refused ? 'fail' : 'accept',
    coverage: 'whole picture',
    steps: [{ step: 'witness', outcome: refused ? 'fail' : 'accept', reasons: [] }],
  })
  write(
    path,
    'INSERT INTO picture (run_id, picture_id, seq, attempt, shot_unit, subject_id, role, ' +
      'label, path, prompt, reference_ids, gate1, chosen) ' +
      "VALUES (?, ?, ?, 1, ?, 'crafted_subject', 'canonical', 'a', 'picture.png', " +
      "'a crafted picture, written by this check', '[]', ?, 0)",
    [runId, pictureId, seq, shotUnit, gate1],
  )
}

/** Started on PORT 0 — always — so the kernel names the port and two checks cannot collide. */
async function serving(dbPath: string, roots?: readonly string[]): Promise<BenchmarkView> {
  const view = await startBenchmarkView({ dbPath, roots })
  assert.ok(view.address.port > 0, 'the kernel named no port, so the server bound a fixed one')
  return view
}

/** One GET, with the path written on the wire exactly as it is given here. */
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

/** The page, as text, with its status asserted. */
async function pageOf(view: BenchmarkView, path = '/'): Promise<string> {
  const answer = await ask(view, path)
  assert.equal(answer.status, 200, `${path} answered ${answer.status}`)
  const html = answer.body.toString('utf8')
  assert.match(html, /<html/i, `${path} served no document`)
  return html
}

/** A route's payload, parsed. */
async function payloadOf(view: BenchmarkView, path: string): Promise<unknown> {
  const answer = await ask(view, path)
  assert.equal(answer.status, 200, `${path} answered ${answer.status}`)
  return JSON.parse(answer.body.toString('utf8'))
}

// ---------------------------------------------------------------- reading the served HTML

/**
 * What a READER is shown: the document with every `<script>` and `<style>` block removed, its
 * tags dropped and its entities decoded. The embedded payload sits in a `<script>` block and is
 * read separately — `<url>` arrives there escaped as `<url>`, and in the body text as
 * `&lt;url&gt;`, so neither can be read by looking for raw angle brackets.
 */
function renderedText(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
}

/** The page's own embedded payload — what the chart script is handed. */
function embedded(html: string): Record<string, unknown> {
  const found = /<script id="benchmark-data" type="application\/json">([\s\S]*?)<\/script>/.exec(
    html,
  )
  assert.ok(found !== null, 'the page embeds no payload for its charts to draw')
  return JSON.parse(String(found[1])) as Record<string, unknown>
}

/** Every `data-chart` the page draws into, in the order they appear. */
function chartsDrawn(html: string): string[] {
  return [...html.matchAll(/data-chart="([^"]+)"/g)].map((found) => String(found[1]))
}

/** The rows of one chart's numbers table: its `<tbody>`'s `<tr>`s, and nothing else's. */
function numbersRows(html: string, chart: string): string[] {
  const table = new RegExp(
    `<table[^>]*data-numbers="${chart}"[^>]*>([\\s\\S]*?)</table>`,
    'i',
  ).exec(html)
  assert.ok(table !== null, `the page draws ${chart} with no numbers table behind it`)
  const body = /<tbody[^>]*>([\s\S]*?)<\/tbody>/i.exec(String(table[1]))
  assert.ok(body !== null, `${chart}'s numbers table has no body`)
  return [...String(body[1]).matchAll(/<tr\b[\s\S]*?<\/tr>/gi)].map((found) => String(found[0]))
}

/** Every string VALUE of a payload, with the path it sits at. */
function stringsOf(
  value: unknown,
  path = '',
  out: Array<[string, string]> = [],
): Array<[string, string]> {
  if (typeof value === 'string') {
    out.push([path, value])
    return out
  }
  if (Array.isArray(value)) {
    value.forEach((item, i) => {
      stringsOf(item, `${path}[${i}]`, out)
    })
    return out
  }
  if (value !== null && typeof value === 'object') {
    for (const [key, inner] of Object.entries(value)) stringsOf(inner, `${path}.${key}`, out)
  }
  return out
}

/** Every KEY of a payload, at every depth. */
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

/** Check 6's scan: which of the thirteen words a text holds, however it is spelt for case. */
const verdictWordsIn = (text: string): string[] =>
  VERDICT_WORDS.filter((word) => text.toLowerCase().includes(word))

/** The field a string sits at, with any array index dropped: `.items[3].words[1]` is `words`. */
const fieldOf = (path: string): string =>
  (path.split('.').pop() ?? '').replace(/\[\d+\]$/, '').replace(/\[\d+\]/g, '')

/**
 * Check 6 over one payload: every string value it holds except the named exemptions, with the
 * path each hit sits at. The exemptions are checked against the field name, never against the
 * path, so a `prompt` at a new depth is still exempt and a field merely CONTAINING one of those
 * names is not.
 */
function verdictHits(payload: unknown): string[] {
  const said: string[] = []
  for (const [at, value] of stringsOf(payload)) {
    if (NOT_SCANNED.includes(fieldOf(at))) continue
    for (const word of verdictWordsIn(value)) said.push(`${at} = ${word}`)
  }
  return said
}

/** Every place `lost` appears in one payload, as a key or as a value, named by where it is. */
function lostSites(payload: unknown): string[] {
  const sites = [...keysOf(payload)]
    .filter((key) => key.toLowerCase().includes('lost'))
    .map((key) => `key ${key}`)
  for (const [at, value] of stringsOf(payload)) {
    if (value.toLowerCase().includes('lost')) sites.push(`value at ${at}`)
  }
  return sites
}

// ---------------------------------------------------------------- the payloads, as types

interface FleetPictureRow {
  pictureId: string
  shotUnit: number
  subjectsInShot: number | null
  refused: boolean
}

interface FleetRunRow {
  runId: string
  worldId: string
  createdAt: string
  pictureRule: string
  plan: { shots: number | string }
  rating: { rating: number | string; parts: Record<string, { rating: number | string }> }
  pictures: FleetPictureRow[]
}

interface FleetBody {
  runs: FleetRunRow[]
}

interface RunBody {
  run: {
    runId: string
    costCents: Record<string, number | string>
    stages: Record<string, { seconds: number | string }>
  }
}

interface GroupPoint {
  key: string
  label: string
  decided: number
  refused: number
  confident: boolean
  draw: string
}

/** The page's own block, read back out of the document it embedded itself in. */
interface PageBlock {
  selectedRunId: string
  charts: Record<string, { points: unknown[] }>
}

const groupsOf = (block: PageBlock, chart: string): GroupPoint[] =>
  (block.charts[chart]?.points ?? []) as GroupPoint[]

// ---------------------------------------------------------------- 6

test('6. No verdict word anywhere', async () => {
  const made = recordHolding(['completed', 'stopped-at-gate-1', 'dead-in-plan'], 'verdict')
  const view = await serving(made.path)
  try {
    // THE POSITIVE CONTROL, first, so a scan that stopped matching fails here rather than
    // reading as coverage over every text below (Gate 3's own clause).
    assert.deepEqual(
      verdictWordsIn('scores improved'),
      ['improved'],
      'the scan no longer reads a verdict word, so everything below passes on nothing',
    )

    const html = await pageOf(view)
    const text = renderedText(html)
    // And the reader's text is really the page's words: a stripper that returned an empty
    // string would pass the scan on nothing at all.
    assert.ok(text.includes('Where reels die'), 'the rendered text is not the page')
    assert.ok(text.includes('Comparison board'), 'the rendered text holds no comparison board')
    assert.ok(text.length > 2000, `the rendered text is ${text.length} characters`)

    assert.deepEqual(verdictWordsIn(text), [], 'the served HTML says a run was better or worse')

    // THE EXEMPTIONS, PINNED FIRST, so a seventh exempted field fails here rather than quietly
    // joining the list and taking a whole category of string out of the scan with it.
    assert.deepEqual(
      [...MODEL_TEXT_FIELDS],
      ['detail', 'expandedPrompt', 'prompt', 'reasons', 'text', 'words'],
      'the verbatim-model-text exemption grew or shrank',
    )
    assert.deepEqual(
      [...EXPLANATORY_FIELDS],
      ['estimateExcludes'],
      'the explanatory-constant allowance grew or shrank',
    )
    // And the exemption is read off the FIELD, not the path: a field merely containing one of
    // those names is still scanned.
    assert.equal(fieldOf('.parts.pictures.items[3].words[1]'), 'words', 'the field read is wrong')
    assert.equal(fieldOf('.run.promptRule'), 'promptRule', 'a field containing a name is exempt')

    // Both payloads, over their STRING VALUES — a key meaning "cents lost" is not a verdict
    // about a run, which is why the key names are pinned separately below (S-208).
    const fleet = (await payloadOf(view, '/data')) as FleetBody
    const one = (await payloadOf(view, `/run/${runIdOf('completed')}`)) as unknown
    const page = embedded(html)
    for (const [what, payload] of [
      ['/data', fleet],
      ['/run/<id>', one],
      ['the page’s own block', page],
    ] as const) {
      const strings = stringsOf(payload)
      assert.ok(strings.length > 20, `${what} holds ${strings.length} strings, so this reads none`)
      assert.deepEqual(verdictHits(payload), [], `${what} carries a verdict word in a value`)
    }

    // The second assertion: every place `lost` stands in either payload is named — the three
    // scorecard keys a verified feature ships, and our own explanatory constant — so a FIFTH
    // occurrence fails here (S-208, with this slice's finding 21 answered).
    const keys = new Set([...keysOf(fleet), ...keysOf(one)])
    assert.ok(keys.has('lost'), 'neither payload carries the cost key, so this pin reads nothing')
    assert.deepEqual(
      [...new Set([...lostSites(fleet), ...lostSites(one)])].sort(),
      [...LOST_SITES],
      'a fifth `lost` is in a payload',
    )
    // And the page's rendered text never prints the word, under any of those keys' labels.
    assert.equal(text.toLowerCase().includes('lost'), false, 'the page prints the word')

    // ------------------------------------------------------------ and the REAL record

    // A check green on fixtures and unknown on the real record is the shape this feature keeps
    // being caught by, so the same scan runs over `data/cutroom.sqlite` itself — through the
    // two payload builders, not through a server, because nothing here needs a second port.
    // **Nothing is skipped when it is absent** (S-111): this says so and fails.
    const record = join(REPO, 'data', 'cutroom.sqlite')
    assert.ok(
      existsSync(record),
      `the real record is not at ${join('data', 'cutroom.sqlite')}, and check 6 may not pass ` +
        'without reading it: a scan green on five fixtures says nothing about 52 real runs',
    )
    const stored = openRecord({ path: record, roots: [join(REPO, '.artifacts'), REPO] })
    try {
      const real = fleetPayload(stored)
      assert.ok(real.runs.length > 20, `the real record holds ${real.runs.length} finished runs`)
      assert.deepEqual(verdictHits(real), [], 'the real fleet payload carries a verdict word')
      const sites = new Set(lostSites(real))
      const exempted = new Set<string>()
      for (const run of real.runs) {
        const card = runPayload(stored, run.runId)
        assert.ok(card !== undefined, `${run.runId} is in the fleet payload and has no scorecard`)
        assert.deepEqual(
          verdictHits(card),
          [],
          `the real run payload of ${run.runId} carries a verdict word outside the exemptions`,
        )
        for (const site of lostSites(card)) sites.add(site)
        for (const [at, value] of stringsOf(card)) {
          for (const word of verdictWordsIn(value)) exempted.add(`${fieldOf(at)} = ${word}`)
        }
      }
      assert.deepEqual([...sites].sort(), [...LOST_SITES], 'a fifth `lost` is in the real record')
      // THE EXEMPTION IS LOAD-BEARING, and this scan is not reading an empty record: with
      // nothing exempted, the real record reports the two hits this slice measured — a model's
      // own `significant` in a take's expanded prompt, and our own constant's `lost`. If either
      // stops being reported, the clauses above are passing on nothing.
      assert.ok(
        exempted.has('expandedPrompt = significant'),
        `the real record no longer holds the model-text hit this exemption exists for: ${[...exempted].join(', ')}`,
      )
      assert.ok(
        exempted.has('estimateExcludes = lost'),
        `the real record no longer holds the explanatory constant: ${[...exempted].join(', ')}`,
      )
    } finally {
      stored.close()
    }
  } finally {
    await view.stop()
    rmSync(made.dir, { recursive: true, force: true })
  }
})

// ---------------------------------------------------------------- 7

test('7. Group size, and the small-group treatment', async () => {
  // Two worlds, one with NINE decided pictures and one with TEN: the boundary is the whole
  // check, because every rule reads the same at a group of two and a group of fifty.
  const made = recordHolding(['completed', 'entered-video-made-nothing'], 'groups')
  const nineRun = runIdOf('completed')
  const tenRun = runIdOf('entered-video-made-nothing')
  for (const [runId, world] of [
    [nineRun, 'crafted-world-of-nine'],
    [tenRun, 'crafted-world-of-ten'],
  ] as const) {
    const row = read(made.path, 'SELECT request_canonical FROM run WHERE run_id = ?', [
      runId,
    ]) as Record<string, string>
    const canonical = JSON.parse(String(row.request_canonical)) as Record<string, unknown>
    canonical.worldId = world
    write(made.path, 'UPDATE run SET request_canonical = ? WHERE run_id = ?', [
      JSON.stringify(canonical),
      runId,
    ])
  }
  // Each fixture decides five pictures of its own; four and five crafted ones take the two
  // groups to exactly nine and exactly ten.
  for (let i = 0; i < 4; i++)
    craftPicture(made.path, nineRun, `crafted-nine-${i}`, 100 + i, i, true)
  for (let i = 0; i < 5; i++) craftPicture(made.path, tenRun, `crafted-ten-${i}`, 100 + i, i, false)

  const view = await serving(made.path)
  try {
    const html = await pageOf(view)
    const page = embedded(html) as unknown as PageBlock

    // EVERY group of all four cards carries its decided count, as a number.
    const cards = [
      'group-subjects-in-shot',
      'group-picture-rule',
      'group-plan-shots',
      'group-world',
    ] as const
    for (const card of cards) {
      const groups = groupsOf(page, card)
      assert.ok(groups.length > 0, `${card} has no group at all, so nothing below reads it`)
      for (const group of groups) {
        assert.equal(typeof group.decided, 'number', `${card}/${group.key} carries no count`)
        assert.ok(group.decided > 0, `${card}/${group.key} carries ${group.decided} decisions`)
      }
    }

    // THE BOUNDARY: nine is false, ten is true. Both in one check, because a threshold written
    // as `>` and one written as `>=` differ nowhere else.
    const worlds = groupsOf(page, 'group-world')
    const nine = worlds.find((group) => group.key === 'crafted-world-of-nine')
    const ten = worlds.find((group) => group.key === 'crafted-world-of-ten')
    assert.ok(nine !== undefined && ten !== undefined, 'the crafted worlds are not two groups')
    assert.equal(nine.decided, 9, `the nine-decision group holds ${nine.decided}`)
    assert.equal(ten.decided, 10, `the ten-decision group holds ${ten.decided}`)
    assert.equal(nine.confident, false, 'nine decisions read as confident')
    assert.equal(ten.confident, true, 'ten decisions do not read as confident')
    assert.equal(nine.draw, 'outlined', 'a group under ten is not drawn outlined')
    assert.equal(ten.draw, 'solid', 'a group at ten is drawn outlined')

    // And a READER is told, without the chart being drawn at all: the numbers table carries
    // both counts and both treatments.
    const rows = numbersRows(html, 'group-world')
    const nineRow = rows.find((row) => row.includes('crafted-world-of-nine'))
    const tenRow = rows.find((row) => row.includes('crafted-world-of-ten'))
    assert.ok(nineRow !== undefined && tenRow !== undefined, 'the numbers table names no world')
    assert.match(nineRow, /data-decided="9"/, 'the table does not carry the nine')
    assert.match(tenRow, /data-decided="10"/, 'the table does not carry the ten')
    assert.match(nineRow, /data-draw="outlined"/, 'the table does not say how the nine is drawn')
    assert.match(tenRow, /data-draw="solid"/, 'the table does not say how the ten is drawn')
    assert.ok(
      renderedText(nineRow).toLowerCase().includes('outlined'),
      'a reader is not told in words that the small group is drawn outlined',
    )

    // NO BAND IS COMPUTED ANYWHERE: the arithmetic for one went with the stopped feature
    // (S-200) and is not rebuilt under another name.
    const keys = keysOf(page)
    assert.ok(keys.has('decided'), 'the page block carries no group at all, so this reads none')
    assert.deepEqual(
      [...keys].filter((key) => /band|interval|stderr|margin|deviation/i.test(key)),
      [],
      'something in the page computes an uncertainty band',
    )
  } finally {
    await view.stop()
    rmSync(made.dir, { recursive: true, force: true })
  }
})

// ---------------------------------------------------------------- 8

test('8. The grouping keys off shot_unit, never a parsed id', async () => {
  // A plan whose five shots name ONE, TWO, THREE, FOUR and FIVE subjects, so every shot is its
  // own group and a picture in the wrong one is visible rather than absorbed.
  const made = recordHolding(['completed', 'dead-in-plan'], 'shotunit')
  const planned = runIdOf('completed')
  const planless = runIdOf('dead-in-plan')
  const planRow = read(made.path, 'SELECT role, plan FROM plan WHERE run_id = ? AND selected = 1', [
    planned,
  ]) as Record<string, string>
  assert.ok(planRow !== undefined, 'the fixture has no selected plan, so there is no grouping')
  const plan = JSON.parse(String(planRow.plan)) as {
    shots: Array<{ unit: number; subjectIds: string[] }>
    subjects: Array<{ id: string; name: string }>
  }
  assert.equal(plan.shots.length, 5, `the fixture plans ${plan.shots.length} shots`)
  plan.subjects = []
  plan.shots.forEach((shot, unit) => {
    shot.subjectIds = Array.from({ length: unit + 1 }, (_, i) => `subject-${unit}-${i}`)
    for (const id of shot.subjectIds) plan.subjects.push({ id, name: id })
  })
  write(made.path, 'UPDATE plan SET plan = ? WHERE run_id = ? AND selected = 1', [
    JSON.stringify(plan),
    planned,
  ])

  // THE LAZY-WRITE TRAP, written out: an id ending in no digit, where a regex and the column
  // cannot agree. Its shot is 2, whose plan names THREE subjects.
  const noDigit = 'crafted-picture-with-no-digit-at-its-end'
  assert.match(noDigit, /[^0-9]$/, 'the crafted id ends in a digit, so it proves nothing')
  craftPicture(made.path, planned, noDigit, 101, 2, true)
  // A shot BEYOND the plan's five, whose id ends in the digit a parser would believe.
  const beyond = 'crafted-picture-shot-9'
  assert.match(beyond, /9$/, 'the crafted id does not end in the digit a parser would read')
  craftPicture(made.path, planned, beyond, 102, 9, true)
  // And a run whose plan was never selected: `subjectsPerShot()` is [] there.
  craftPicture(made.path, planless, 'crafted-picture-with-no-plan-0', 101, 0, true)

  const view = await serving(made.path)
  try {
    const fleet = (await payloadOf(view, '/data')) as FleetBody
    const plannedRun = fleet.runs.find((run) => run.runId === planned)
    const planlessRun = fleet.runs.find((run) => run.runId === planless)
    assert.ok(plannedRun !== undefined && planlessRun !== undefined, 'a crafted run is not served')

    // The COLUMN decides, in the row the page is handed.
    const row = (run: FleetRunRow, id: string): FleetPictureRow => {
      const found = run.pictures.find((picture) => picture.pictureId === id)
      assert.ok(found !== undefined, `${id} is not a decided picture of the payload`)
      return found
    }
    assert.equal(row(plannedRun, noDigit).subjectsInShot, 3, 'the no-digit picture lost its shot')
    assert.equal(row(plannedRun, beyond).subjectsInShot, null, 'a shot beyond the plan got a group')
    assert.equal(
      row(planlessRun, 'crafted-picture-with-no-plan-0').subjectsInShot,
      null,
      'a run with no selected plan was given subjects per shot',
    )

    const html = await pageOf(view)
    const page = embedded(html) as unknown as PageBlock
    const groups = groupsOf(page, 'group-subjects-in-shot')
    const byKey = new Map(groups.map((group) => [group.key, group]))

    // One group per subject count the plan really names, and the no-digit picture is in the
    // group its COLUMN names — three subjects, beside the shot's own picture.
    assert.deepEqual(
      [...byKey.keys()].sort(),
      ['1', '2', '3', '4', '5'],
      'the groups are not the plan’s',
    )
    assert.equal(byKey.get('3')?.decided, 2, 'the no-digit picture is not in its shot’s group')
    for (const key of ['1', '2', '4', '5']) {
      assert.equal(byKey.get(key)?.decided, 1, `the group of ${key} subjects holds the wrong count`)
    }

    // NO group for the shot beyond the plan, and none named after the digit its id ends in.
    assert.equal(byKey.has('9'), false, 'a picture beyond the plan’s shots made a group of its own')

    // The two pictures outside the grouping are DECIDED, and counted everywhere else: the
    // grouping drops them, the payload does not.
    const decided = fleet.runs.reduce((count, run) => count + run.pictures.length, 0)
    const grouped = groups.reduce((count, group) => count + group.decided, 0)
    assert.equal(decided, 8, `the record decides ${decided} pictures`)
    assert.equal(grouped, 6, `the subjects grouping holds ${grouped} of them`)
    const worlds = groupsOf(page, 'group-world')
    assert.equal(
      worlds.reduce((count, group) => count + group.decided, 0),
      8,
      'the world card drops a picture the subjects card is only right to drop',
    )
  } finally {
    await view.stop()
    rmSync(made.dir, { recursive: true, force: true })
  }
})

// ---------------------------------------------------------------- 9

test('9. The scrubber on the way out, over the served HTML as well as the payloads', async () => {
  const made = recordHolding(['completed'], 'scrub')
  const runId = runIdOf('completed')
  // Built from parts, never written out: D-086, and tests/no-absolute-paths.test.ts reads a test
  // exactly as it reads code.
  const ARTIFACTS = join(REPO, '.artifacts')
  const URL_WITH_KEY = 'https://oss.example.com/x?OSSAccessKeyId=AK&Signature=s'
  // THE POSITIVE CONTROL, and the reason it exists: S-199's round-3 finding was a WIDENED
  // scrubber that ate exactly these two shapes.
  const BRIEF_KEY = '3a7f1c9e5b2d84600f1e7c35a9d2b48e6071c3df925a8b4e1d6f0a73c82b5e94'
  assert.equal(runId.length, 36, 'the run id is not a run id')
  assert.equal(BRIEF_KEY.length, 64, 'the brief key is not a brief key')

  // A prompt is where a presigned url really sits (D-022's failure shape), and the run view
  // renders every prompt folded behind a click. The world id travels in the fleet payload, so
  // it is what the ledger, the tiles and the group cards print.
  write(made.path, 'UPDATE picture SET prompt = ? WHERE run_id = ? AND picture_id = ?', [
    `reference ${join(ARTIFACTS, 'pictures', 'shot-0.png')} for run ${runId} ` +
      `(brief ${BRIEF_KEY}) signed ${URL_WITH_KEY}`,
    runId,
    'a1-shot-0-a',
  ])
  const canonical = JSON.parse(
    String(
      (
        read(made.path, 'SELECT request_canonical FROM run WHERE run_id = ?', [runId]) as Record<
          string,
          string
        >
      ).request_canonical,
    ),
  ) as Record<string, unknown>
  canonical.worldId = `${join(ARTIFACTS, 'worlds', 'tsunamis.json')} ${BRIEF_KEY} ${URL_WITH_KEY}`
  write(made.path, 'UPDATE run SET request_canonical = ? WHERE run_id = ?', [
    JSON.stringify(canonical),
    runId,
  ])

  const view = await serving(made.path, [ARTIFACTS, REPO])
  try {
    const html = await pageOf(view)
    const text = renderedText(html)
    // The page really renders both of them, or every assertion below passes on an absence.
    assert.ok(text.includes('tsunamis.json'), 'the page prints no world id at all')
    assert.ok(text.includes('shot-0.png'), 'the page folds no prompt into the run view at all')

    for (const [what, body] of [
      ['the rendered page', text],
      ['the page’s embedded block', JSON.stringify(embedded(html))],
      ['the served HTML, raw', html],
    ] as const) {
      for (const piece of ['oss.example.com', 'OSSAccessKeyId', 'Signature', 'https://']) {
        assert.equal(body.includes(piece), false, `${what} serves ${piece}`)
      }
      // The run id and the brief key SURVIVE, unchanged, in the same strings.
      assert.ok(body.includes(runId), `${what} ate the run id`)
      assert.ok(body.includes(BRIEF_KEY), `${what} ate the brief key`)
    }
    // `<url>` stands where the url was, in the reader's own text and in the block the charts
    // read — the first escaped as an entity, the second as an escaped angle bracket.
    assert.ok(text.includes('<url>'), 'the page drops the url instead of marking it')
    assert.ok(
      JSON.stringify(embedded(html)).includes('<url>'),
      'the embedded block drops the url instead of marking it',
    )
    // The artifact root is gone and what stood under it is RELATIVE, not deleted.
    assert.equal(text.includes(ARTIFACTS), false, 'the page prints the artifact root')
    assert.equal(html.includes(JSON.stringify(ARTIFACTS).slice(1, -1)), false, 'the root is served')
  } finally {
    await view.stop()
    rmSync(made.dir, { recursive: true, force: true })
  }
})

// ---------------------------------------------------------------- 14

test('14. No absolute path reaches the page', async () => {
  const made = recordHolding(['completed'], 'absolute')
  const runId = runIdOf('completed')
  const ARTIFACTS = join(REPO, '.artifacts')
  // A CRAFTED RUN whose picture path, render output and hold rows are all absolute, as the real
  // record's are (`picture.path` holds one in all 52 runs).
  write(made.path, 'UPDATE picture SET path = ? WHERE run_id = ?', [
    join(ARTIFACTS, 'pictures', 'shot-0.png'),
    runId,
  ])
  const render = read(made.path, 'SELECT render_manifest FROM render WHERE run_id = ?', [
    runId,
  ]) as Record<string, string>
  const manifest = JSON.parse(String(render.render_manifest)) as {
    shots: Array<{ clipPath?: string; narrationPath?: string }>
  }
  for (const shot of manifest.shots) {
    shot.clipPath = join(ARTIFACTS, 'clips', 'take.mp4')
    shot.narrationPath = join(ARTIFACTS, 'speech', 'line.wav')
  }
  write(made.path, 'UPDATE render SET path = ?, render_manifest = ? WHERE run_id = ?', [
    join(ARTIFACTS, 'reels', 'reel.mp4'),
    JSON.stringify(manifest),
    runId,
  ])
  write(
    made.path,
    'INSERT INTO hold (run_id, render_id, shot_id, seconds, reason) ' +
      "VALUES (?, 'a1-render', 'shot-0', 2, ?)",
    [runId, `held while ${join(ARTIFACTS, 'reels', 'cut.mp4')} was written`],
  )

  const view = await serving(made.path, [ARTIFACTS, REPO])
  try {
    const html = await pageOf(view)
    const fleet = await ask(view, '/data')
    const one = await ask(view, `/run/${runId}`)
    // The crafted rows really arrived somewhere a reader can see, or the scan below reads a
    // page with nothing on it.
    assert.ok(renderedText(html).includes('cut.mp4'), 'the page prints no hold at all')

    for (const [what, body] of [
      ['the served HTML', html],
      ['the fleet payload', fleet.body.toString('utf8')],
      ['the run payload', one.body.toString('utf8')],
    ] as const) {
      for (const [shape, named] of ABSOLUTE_SHAPES) {
        assert.doesNotMatch(body, shape, `${what} carries ${named}`)
      }
    }
    // The scan itself reads something: the same shapes DO match the paths that were written.
    assert.ok(
      ABSOLUTE_SHAPES.some(([shape]) => shape.test(join(ARTIFACTS, 'pictures', 'shot-0.png'))),
      'the absolute-path shapes match no absolute path, so this check reads nothing',
    )
    // And the page serves no stored path at all, under any key (Gate 2: a picture is its words,
    // its verdicts and its cost) — which is the guarantee that does not rest on a root being
    // named at startup.
    const keys = new Set([
      ...keysOf(JSON.parse(fleet.body.toString('utf8'))),
      ...keysOf(JSON.parse(one.body.toString('utf8'))),
    ])
    assert.equal(keys.has('path'), false, 'a payload carries a stored path')
  } finally {
    await view.stop()
    rmSync(made.dir, { recursive: true, force: true })
  }
})

// ---------------------------------------------------------------- 15

test('15. Every chart can be read as numbers', async () => {
  const made = recordHolding(
    ['completed', 'stopped-at-gate-1', 'entered-video-made-nothing', 'dead-in-plan'],
    'numbers',
  )
  // Two worlds and two picture rules, so the four group cards are not four copies of one group.
  const second = runIdOf('stopped-at-gate-1')
  const row = read(made.path, 'SELECT request_canonical FROM run WHERE run_id = ?', [
    second,
  ]) as Record<string, string>
  const canonical = JSON.parse(String(row.request_canonical)) as Record<string, unknown>
  canonical.worldId = 'crafted-second-world'
  write(made.path, 'UPDATE run SET request_canonical = ? WHERE run_id = ?', [
    JSON.stringify(canonical),
    second,
  ])

  const view = await serving(made.path)
  try {
    const html = await pageOf(view)
    const fleet = (await payloadOf(view, '/data')) as FleetBody
    const page = embedded(html) as unknown as PageBlock
    const one = (await payloadOf(view, `/run/${page.selectedRunId}`)) as RunBody
    assert.equal(one.run.runId, page.selectedRunId, 'the run view shows a run the record has not')

    // EIGHT CHARTS, named rather than counted: a ninth drawn with no table behind it fails here
    // as surely as a table with the wrong number of rows.
    assert.deepEqual(chartsDrawn(html).sort(), [...CHARTS].sort(), 'the page draws other charts')

    // Every expectation is computed HERE, from the two payloads, never from the page's own
    // block — a chart agreeing with itself is not a chart that can be read as numbers.
    const partNames = Object.keys(fleet.runs[0]?.rating.parts ?? {})
    assert.equal(partNames.length, 5, `the scorecard names ${partNames.length} parts`)

    let scorePoints = 0
    for (const run of fleet.runs) {
      if (typeof run.rating.rating === 'number') scorePoints += 1
      for (const part of partNames) {
        if (typeof run.rating.parts[part]?.rating === 'number') scorePoints += 1
      }
    }
    const decidedOf = (run: FleetRunRow): number => run.pictures.length
    const distinct = (values: Array<string | number>): number => new Set(values).size
    const withPictures = fleet.runs.filter((run) => decidedOf(run) > 0)
    const runCosts = Object.values(one.run.costCents).filter((cents) => typeof cents === 'number')
    const runStages = Object.values(one.run.stages).filter(
      (stage) => typeof stage.seconds === 'number',
    )

    const expected: Record<string, number> = {
      'where-reels-die': partNames.length + 1,
      'scores-over-time': scorePoints,
      'group-subjects-in-shot': distinct(
        fleet.runs.flatMap((run) =>
          run.pictures
            .map((picture) => picture.subjectsInShot)
            .filter((count): count is number => count !== null),
        ),
      ),
      'group-picture-rule': distinct(withPictures.map((run) => run.pictureRule)),
      'group-plan-shots': distinct(
        withPictures
          .map((run) => run.plan.shots)
          .filter((shots): shots is number => typeof shots === 'number'),
      ),
      'group-world': distinct(withPictures.map((run) => run.worldId)),
      'cost-and-wall-clock': fleet.runs.length,
      'run-seconds-and-cents': runCosts.length + runStages.length,
    }

    for (const chart of CHARTS) {
      const want = expected[chart] ?? -1
      // A chart with no point at all would make its own row count trivially right.
      assert.ok(want > 0, `${chart} is expected to draw ${want} points, so its table proves little`)
      const rows = numbersRows(html, chart)
      assert.equal(rows.length, want, `${chart} draws ${want} points beside ${rows.length} rows`)
      // And the page's own block draws exactly those points, so the table is the chart's
      // numbers rather than a second list that happens to be the same length.
      assert.equal(
        page.charts[chart]?.points.length,
        want,
        `${chart}'s configuration holds a different number of points from the payload`,
      )
    }

    // THE DISCRIMINATING CASE, as Gate 3 writes it: three groups beside two rows fails. The
    // counter is shown a document of exactly that shape, so a counter that always answered
    // "right" could not pass this check.
    const crooked =
      '<div data-chart="group-world"></div>' +
      '<table data-numbers="group-world"><tbody><tr><td>a</td></tr><tr><td>b</td></tr></tbody></table>'
    assert.equal(numbersRows(crooked, 'group-world').length, 2, 'the row counter miscounts')
    assert.notEqual(numbersRows(crooked, 'group-world').length, 3, 'two rows read as three')
  } finally {
    await view.stop()
    rmSync(made.dir, { recursive: true, force: true })
  }
})

// ------------------------------- which run the page opens on, which is NOT one of the eighteen

test('which run `GET /?run=<id>` opens — NOT one of Gate 3’s eighteen checks, a guard added on this slice’s finding 29', async () => {
  // The page cannot ask for anything over the wire (check 11 reads this package's source for
  // the outbound-call spellings), so a reader changes runs by reloading `/` with the run named
  // in the query — a route shape Gate 2's table does not list and no check of Gate 3 reaches.
  // A property nothing can fail on is the shape findings 9, 11, 18 and 23 are all about, so the
  // main session's call was to guard it here rather than leave it for a later reader to notice.
  const made = recordHolding(['completed', 'stopped-at-gate-1'], 'picked')
  const view = await serving(made.path)
  try {
    const fleet = (await payloadOf(view, '/data')) as FleetBody
    const newest = fleet.runs[fleet.runs.length - 1]?.runId
    const older = fleet.runs[0]?.runId
    assert.ok(newest !== undefined && older !== undefined, 'the record serves fewer than two runs')
    assert.notEqual(older, newest, 'both runs are the same run, so nothing below discriminates')

    // With no run named, the page opens on the NEWEST — the last the loader returns.
    const landing = embedded(await pageOf(view)) as unknown as PageBlock
    assert.equal(landing.selectedRunId, newest, 'the page does not open on the newest run')

    // A NAMED run opens in the One run view, and it is that run's own scorecard that is drawn:
    // its id is on the section, and its seconds-and-cents table is the named run's, not the
    // newest run's.
    const named = embedded(await pageOf(view, `/?run=${older}`)) as unknown as PageBlock
    assert.equal(named.selectedRunId, older, 'the named run did not open')
    const one = (await payloadOf(view, `/run/${older}`)) as RunBody
    const points =
      Object.values(one.run.costCents).filter((cents) => typeof cents === 'number').length +
      Object.values(one.run.stages).filter((stage) => typeof stage.seconds === 'number').length
    assert.ok(points > 0, 'the named run draws no point at all, so the count below proves little')
    assert.equal(
      numbersRows(await pageOf(view, `/?run=${older}`), 'run-seconds-and-cents').length,
      points,
      'the run view’s own chart is not the named run’s',
    )

    // AN UNKNOWN NAME opens the newest run and SAYS SO IN ONE LINE, rather than serving a blank
    // page or a 404: a stale link is a reader's mistake, and silence is not an answer to it.
    const stale = await pageOf(view, '/?run=no-such-run')
    assert.equal(
      (embedded(stale) as unknown as PageBlock).selectedRunId,
      newest,
      'an unknown name did not fall back to the newest run',
    )
    assert.ok(
      renderedText(stale).includes('is in this record, so the newest one is open'),
      'the page opens another run and says nothing about the one that was asked for',
    )

    // And `/run/<that same id>` still answers 404, so check 17's clause is untouched by the
    // query this guard is about.
    assert.equal((await ask(view, '/run/no-such-run')).status, 404, 'an unknown run id answered')
  } finally {
    await view.stop()
    rmSync(made.dir, { recursive: true, force: true })
  }
})
