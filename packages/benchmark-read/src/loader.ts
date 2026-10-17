// The shared row loader (benchmark-view, Gate 2 "Where each part lives"; S-204, S-205).
//
// One copy of the schema, for every tool that reads a stored run: `scripts/benchmark.mjs`
// scores the record, and the page serves it. Before this file there was one copy, in the
// scorer, and the second was about to be written.

import { DatabaseSync } from 'node:sqlite'
import { FIELD_COLUMNS } from '@cutroom/benchmark'
import type { RunRows } from '@cutroom/benchmark'
import { artifactScrubber } from './scrub.ts'

/** Every table one run's rows are read from, and how a row set names it. */
export const TABLES = [
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
 * The column a table is joined to its run by. `job` carries no `run_id` at all: it is reached
 * through the correlation the queue stamps on it (`packages/domain/src/schema.ts:88`).
 */
export const joinKeyOf = (table: string): string => (table === 'job' ? 'correlation_id' : 'run_id')

/**
 * The column a table's rows come back in order of. `run_event` is numbered from 1 per run in
 * the transaction that writes it, so `seq` is the written order; everywhere else the insertion
 * order is the rowid's.
 */
export const orderOf = (table: string): string => (table === 'run_event' ? 'seq' : 'rowid')

export interface RecordOptions {
  /**
   * The database file, ALREADY RESOLVED by the caller.
   *
   * This package resolves no path of its own, and that is a rule rather than a preference:
   * `DEFAULT_DB_PATH` and `SETTING_NAMES` are `@cutroom/service`'s — that is `apps/service` —
   * and `benchmark-read-no-engine` forbids `apps/`. The precedence `--db`, then
   * `CUTROOM_DB_PATH`, then `DEFAULT_DB_PATH` lives once in `scripts/_lib.mjs`, where every
   * reader reaches it.
   */
  readonly path: string
  /**
   * Every prefix a stored path may carry — the artifact root and the repository root — stripped
   * from every string that leaves here (D-086). Given none, only URLs are scrubbed.
   */
  readonly roots?: readonly string[]
}

export interface StoredRecord {
  /**
   * The read-only open itself.
   *
   * Exposed for one reason, and the reason is a check: Gate 3's check 2 proves that a write
   * through this handle THROWS, and a read-only property that nothing can exercise reads as
   * coverage. Nothing in this package writes through it — check 1 counts the opens in this
   * package's source, holds them at one, and reads the open's own `readOnly` out of it. That
   * count is a text scan, so the call below is the only place its spelling may appear.
   */
  readonly handle: DatabaseSync
  /** Which columns this record holds, per table — a table it does not hold at all is absent. */
  readonly held: ReadonlyMap<string, ReadonlySet<string>>
  /** The columns the scorecard names that this record does not hold, sorted. */
  absentColumns(): string[]
  /** Every run in the record, ordered by `created_at` and then by `run_id`. */
  runIds(): string[]
  /** Every run whose id starts with `prefix`, ordered by `run_id`. */
  runIdsNamed(prefix: string): string[]
  /** One run's rows, as the schema stores them. */
  rowsOf(runId: string): RunRows
  /** Every string that leaves here passes through this (D-022, D-086). */
  scrub(text: string): string
  close(): void
}

/**
 * Open a stored record to READ.
 *
 * Never through the domain's opener, which opens for writing, migrates and creates a missing
 * file — so the record's bytes do not change and a wrong path creates nothing. A file that is
 * not a database opens without complaint and fails on its first read, so the first read happens
 * here, where the caller is still inside its own `try`.
 */
export function openRecord(options: RecordOptions): StoredRecord {
  const db = new DatabaseSync(options.path, { readOnly: true })
  const tables = new Set(
    db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
      .all()
      .map((row) => String(row.name)),
  )

  // Which columns this record holds, per table. A column the record does not hold is reported
  // ABSENT and never as zero: every row is selected with `SELECT *`, so a column that is not
  // there simply does not arrive, and a loader that named its columns in SQL would throw on a
  // record older than a migration instead.
  const held = new Map<string, Set<string>>()
  for (const table of ['run', ...TABLES]) {
    if (!tables.has(table)) continue
    held.set(
      table,
      new Set(
        db
          .prepare('SELECT name FROM pragma_table_info(?)')
          .all(table)
          .map((row) => String(row.name)),
      ),
    )
  }

  const scrub = artifactScrubber(options.roots ?? [])

  const read = (table: string, runId: string): Array<Record<string, unknown>> => {
    if (!held.has(table)) return []
    const sql = `SELECT * FROM ${table} WHERE ${joinKeyOf(table)} = ? ORDER BY ${orderOf(table)}`
    return (
      db
        .prepare(sql)
        .all(runId)
        // A node:sqlite row has NO PROTOTYPE: it is spread into a plain object before anything
        // else reads it.
        .map((row) => ({ ...row }))
    )
  }

  return {
    handle: db,
    held,

    absentColumns(): string[] {
      // Read from the package's own field-to-column map, so a field the scorecard names and no
      // column can answer is reported rather than silently zero.
      const named = new Set<string>()
      for (const columns of Object.values(FIELD_COLUMNS))
        for (const column of columns) named.add(column)
      return [...named].sort().filter((pair) => {
        const [table, column] = pair.split('.')
        const columns = held.get(String(table))
        return columns === undefined || !columns.has(String(column))
      })
    },

    runIds(): string[] {
      return db
        .prepare('SELECT run_id FROM run ORDER BY created_at, run_id')
        .all()
        .map((row) => String(row.run_id))
    },

    runIdsNamed(prefix: string): string[] {
      return db
        .prepare("SELECT run_id FROM run WHERE run_id LIKE ? || '%' ORDER BY run_id")
        .all(prefix)
        .map((row) => String(row.run_id))
    },

    rowsOf(runId: string): RunRows {
      const run = db.prepare('SELECT * FROM run WHERE run_id = ?').get(runId) ?? {}
      const rows: Record<string, unknown> = { run: { ...run } }
      for (const table of TABLES) rows[table] = read(table, runId)
      return rows as unknown as RunRows
    },

    scrub,

    close(): void {
      db.close()
    },
  }
}
