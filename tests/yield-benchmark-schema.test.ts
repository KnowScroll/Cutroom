import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { FIELD_COLUMNS } from '@cutroom/benchmark'
import { REPO } from './_repo.ts'

// yield-benchmark, Slice 1 — check 12 (docs/features/yield-benchmark.md, Gate 3):
//
// `every column the scorecard names exists in packages/domain/src/schema.ts and in
// db/migrations/, and every path-shaped value in tests/fixtures/benchmark/*.json is exactly the
// placeholder` — the fixtures are committed JSON and the package may not import the domain, so
// without the first half a column rename leaves every other check green while the reader breaks;
// the second half is stronger than tests/no-absolute-paths.test.ts, which matches four
// machine-path shapes only.

const PLACEHOLDER = '<artifact>'
const FIXTURES = join(REPO, 'tests', 'fixtures', 'benchmark')

/** Every `table.column` the scorecard's fields are declared to read. */
function namedColumns(): Array<[string, string]> {
  const pairs = new Set<string>()
  for (const columns of Object.values(FIELD_COLUMNS))
    for (const column of columns) pairs.add(column)
  return [...pairs].sort().map((pair) => {
    const [table, column] = pair.split('.')
    assert.ok(table !== undefined && column !== undefined, `${pair} is not table.column`)
    return [table, column]
  })
}

/** Each sqliteTable's columns, read from the schema the engine actually writes through. */
function schemaColumns(): Map<string, Set<string>> {
  const text = readFileSync(join(REPO, 'packages', 'domain', 'src', 'schema.ts'), 'utf8')
  const tables = new Map<string, Set<string>>()
  const starts = [...text.matchAll(/sqliteTable\(\s*\n?\s*'([a-z0-9_]+)'/g)]
  starts.forEach((start, i) => {
    const name = String(start[1])
    const from = start.index ?? 0
    const to = i + 1 < starts.length ? (starts[i + 1]?.index ?? text.length) : text.length
    const body = text.slice(from, to)
    const columns = new Set<string>()
    for (const column of body.matchAll(/\b(?:text|integer|real)\('([a-z0-9_]+)'/g)) {
      columns.add(String(column[1]))
    }
    tables.set(name, columns)
  })
  return tables
}

/** Each table's columns as the migrations create and alter them. */
function migrationColumns(): Map<string, Set<string>> {
  const dir = join(REPO, 'db', 'migrations')
  const tables = new Map<string, Set<string>>()
  const add = (table: string, column: string) => {
    const at = tables.get(table) ?? new Set<string>()
    at.add(column)
    tables.set(table, at)
  }
  for (const file of readdirSync(dir)
    .filter((name) => name.endsWith('.sql'))
    .sort()) {
    const text = readFileSync(join(dir, file), 'utf8')
    for (const created of text.matchAll(/CREATE TABLE `([a-z0-9_]+)` \(([\s\S]*?)\n\);/g)) {
      const table = String(created[1])
      for (const column of String(created[2]).matchAll(
        /^\s*`([a-z0-9_]+)`\s+(?:text|integer|real)/gm,
      )) {
        add(table, String(column[1]))
      }
    }
    for (const altered of text.matchAll(/ALTER TABLE `([a-z0-9_]+)` ADD `([a-z0-9_]+)`/g)) {
      add(String(altered[1]), String(altered[2]))
    }
  }
  return tables
}

/** Every string in a fixture, including the ones inside a column that holds JSON text. */
function strings(value: unknown, at: string, found: Array<[string, string]>): void {
  if (typeof value === 'string') {
    found.push([at, value])
    const trimmed = value.trim()
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        strings(JSON.parse(value), at, found)
      } catch {
        /* a column that merely looks like JSON */
      }
    }
    return
  }
  if (Array.isArray(value)) {
    value.forEach((item, i) => strings(item, `${at}[${i}]`, found))
    return
  }
  if (value !== null && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) strings(child, `${at}.${key}`, found)
  }
}

// ---------------------------------------------------------------- 12

test('12. every column the scorecard names exists in packages/domain/src/schema.ts and in db/migrations/', () => {
  const schema = schemaColumns()
  const migrations = migrationColumns()
  const missing: string[] = []

  for (const [table, column] of namedColumns()) {
    if (!(schema.get(table)?.has(column) ?? false))
      missing.push(`schema.ts has no ${table}.${column}`)
    if (!(migrations.get(table)?.has(column) ?? false)) {
      missing.push(`db/migrations/ never creates ${table}.${column}`)
    }
  }

  assert.deepEqual(missing, [], missing.join('\n'))
  // The reader joins a job row to its run through job.correlation_id, which check 1 names and
  // this check pins against the real schema (schema.ts:88).
  assert.ok(schema.get('job')?.has('correlation_id'))
  assert.ok(migrations.get('run')?.has('resumes'), 'migration 0007 adds run.resumes')
  assert.ok(migrations.get('picture')?.has('kept_from'), 'migration 0007 adds picture.kept_from')
})

test('12. every path-shaped value in tests/fixtures/benchmark/*.json is exactly the placeholder', () => {
  // Stronger than "no machine path": every value of a path-shaped FIELD is the placeholder,
  // and no string anywhere — including inside a column that holds JSON text — is one.
  const PATH_FIELDS = /(?:^|\.)(path|clipPath|narrationPath|paths|file|filePath|out|outPath)$/
  const MACHINE: ReadonlyArray<readonly [RegExp, string]> = [
    [/[A-Za-z]:[\\/]{1,2}(Users|Program|Windows)/, 'a Windows drive-letter path'],
    [/\/Volumes\//, 'a macOS volume path'],
    [/\/Users\/[A-Za-z]/, 'a macOS or Linux home path'],
    [/\/home\/[a-z]/, 'a Linux home path'],
    [/\.artifacts[\\/]/, "a path under this repository's artifact root"],
  ]

  // The glob RECURSES (widened in Slice 3): the five worked rating fixtures live one folder
  // down, in tests/fixtures/benchmark/ratings/, and the placeholder rule is the corpus's rather
  // than one folder's. The rule itself is unchanged — only the set of files it reads is wider.
  const files = readdirSync(FIXTURES, { recursive: true })
    .map((name) => String(name))
    .filter((name) => name.endsWith('.json'))
  assert.ok(files.length > 0, 'the row corpus is empty')
  const offenders: string[] = []

  for (const file of files) {
    const found: Array<[string, string]> = []
    strings(JSON.parse(readFileSync(join(FIXTURES, file), 'utf8')), '', found)
    for (const [at, value] of found) {
      if (PATH_FIELDS.test(at) && value !== PLACEHOLDER) {
        offenders.push(`${file}${at} is ${JSON.stringify(value)}, not ${PLACEHOLDER}`)
      }
      for (const [pattern, what] of MACHINE) {
        if (pattern.test(value)) offenders.push(`${file}${at} holds ${what}`)
      }
    }
  }

  assert.deepEqual(offenders, [], offenders.join('\n'))
})
