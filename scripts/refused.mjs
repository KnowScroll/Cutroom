#!/usr/bin/env node
/**
 * WHAT A MODEL WROTE THAT COULD NOT BE READ, for one run (docs/features/ask-again.md; S-156).
 *
 *   node --experimental-strip-types --no-warnings scripts/refused.mjs <run id or prefix> [--db <path>]
 *
 * Prints each `refused_answer` row of that run, in the order written: when, the role and call, what
 * it was about, which ask (1, or 2 for the ask after a refusal), why it was refused, and the answer
 * itself — redacted and capped where it was written (D-022). A refused witness answer, a plan, a
 * score or a reconcile the model wrote in the wrong shape, or a narration's word timings.
 *
 * READ-ONLY. It opens the database with `node:sqlite` read-only — never through the domain's
 * `openDatabase`, which opens for writing, migrates and creates a missing file — so the database's
 * bytes do not change and a wrong path creates nothing. (SQLite may leave its own `-shm` and `-wal`
 * files beside a WAL database it opened; they are gitignored with it.) It reads no environment file,
 * starts nothing and reaches no provider.
 *
 * The database is `--db`, else `CUTROOM_DB_PATH`, else the service's default (D-086).
 */
import { existsSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { DEFAULT_DB_PATH, SETTING_NAMES } from '@cutroom/service'
import { bold, dim, red } from './_lib.mjs'

const args = process.argv.slice(2)
const at = args.indexOf('--db')
const dbPath = at >= 0 ? args[at + 1] : (process.env[SETTING_NAMES.dbPath] ?? DEFAULT_DB_PATH)
const run = args.find((arg, i) => !arg.startsWith('--') && (at < 0 || i !== at + 1))

if (run === undefined || dbPath === undefined) {
  console.error(`\n${red('usage')}: scripts/refused.mjs <run id or prefix> [--db <path>]\n`)
  process.exit(2)
}
if (!existsSync(dbPath)) {
  console.error(`\n${red('no database at')} ${dbPath}\n`)
  process.exit(1)
}

const db = new DatabaseSync(dbPath, { readOnly: true })
try {
  const runs = db
    .prepare("SELECT run_id FROM run WHERE run_id LIKE ? || '%' ORDER BY run_id")
    .all(run)
    .map((row) => String(row.run_id))
  if (runs.length === 0) {
    console.error(`\n${red('no run')} ${run}\n`)
    process.exit(1)
  }
  if (runs.length > 1) {
    console.error(`\n${red(`${run} names ${runs.length} runs`)}: ${runs.join(', ')}\n`)
    process.exit(1)
  }
  const [runId] = runs
  const table = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'refused_answer'")
    .get()
  if (table === undefined) {
    // A database the service has not opened since ask-again's migration: it has kept nothing yet,
    // and this reader migrates nothing — the service does, the next time it starts.
    console.log(
      `\n${bold('refused answers')}  run ${runId}  none kept: the table is not here yet\n`,
    )
    process.exit(0)
  }
  const rows = db.prepare('SELECT * FROM refused_answer WHERE run_id = ? ORDER BY id').all(runId)

  console.log(`\n${bold('refused answers')}  run ${runId}  ${rows.length}\n`)
  for (const row of rows) {
    const what = row.port === 'speech' ? 'narration timings' : `${row.role} ${row.call}`
    console.log(
      `${bold(`#${row.id}`)}  ${dim(String(row.at))}  ${what}  about ${JSON.parse(String(row.about)).join(', ') || '-'}  ask ${row.ask}`,
    )
    for (const reason of JSON.parse(String(row.reasons))) console.log(`  ${red('why')} ${reason}`)
    let answer = String(row.answer)
    try {
      answer = JSON.stringify(JSON.parse(answer), null, 2)
    } catch {
      // Not JSON: the words the model wrote, as they are.
    }
    console.log(
      answer
        .split('\n')
        .map((line) => `  ${line}`)
        .join('\n'),
    )
    console.log('')
  }
} finally {
  db.close()
}
