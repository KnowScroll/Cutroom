import { existsSync } from 'node:fs'
import Database from 'better-sqlite3'

// The owner's script asks, at its start, whether to leave a run still waiting alone or to cancel
// it (docs/features/resume-failed.md, Gate 1 "a person asking may name pieces not to keep"; the
// owner in PROMPTS/052's step 2 on 2026-09-25). The script cannot import `@cutroom/domain` — the
// root package does not depend on it, by S-109's rule (a key reaches only `packages/providers`,
// and a path that touches the domain reaches tables the script has no business editing). The
// service exposes the two operations the script needs from its half, the read-only observation and
// the single flag flip, so the script's text asks no question any other way
// (`tests/resume-failed-script.test.ts` check 42).

/** What `waitingRuns` returns: the id of a run that has a queued or running job. */
export interface WaitingRun {
  runId: string
}

/**
 * Every run still `running` with a job that is `queued` or `running`, in row order. Read-only — the
 * file's `PRAGMA data_version` is unchanged on return, every table's rows are unchanged, and a
 * missing file returns `[]` and creates nothing (check 43; S-163).
 */
export function waitingRuns(dbPath: string): WaitingRun[] {
  if (!existsSync(dbPath)) return []
  const db = new Database(dbPath, { readonly: true, fileMustExist: true })
  try {
    const rows = db
      .prepare(
        `SELECT r.run_id AS runId
           FROM run r
           JOIN job j ON j.correlation_id = r.run_id
          WHERE r.state = 'running'
            AND j.state IN ('queued', 'running')
          GROUP BY r.run_id
          ORDER BY r.run_id`,
      )
      .all() as WaitingRun[]
    return rows
  } finally {
    db.close()
  }
}

/**
 * Sets `cancel_requested = 1` on every named run. Nothing else: no other column, no row the
 * caller did not name, and no row on a run that is not `running` — that is `requestCancel`'s
 * existing rule (`packages/domain/src/runs.ts:806-812`), here used without Drizzle so the script
 * has no model client in reach (S-109, S-114, S-119). One UPDATE, so the file's `PRAGMA
 * data_version` bumps exactly once (check 43).
 */
export function cancelRuns(dbPath: string, runIds: readonly string[]): void {
  if (runIds.length === 0) return
  const db = new Database(dbPath)
  try {
    const placeholders = runIds.map(() => '?').join(', ')
    db.prepare(
      `UPDATE run SET cancel_requested = 1 WHERE state = 'running' AND run_id IN (${placeholders})`,
    ).run(...runIds)
  } finally {
    db.close()
  }
}
