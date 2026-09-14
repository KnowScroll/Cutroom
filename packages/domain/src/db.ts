import { fileURLToPath } from 'node:url'
import Database from 'better-sqlite3'
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import * as schema from './schema.ts'

export type Db = BetterSQLite3Database<typeof schema> & { $client: Database.Database }

/** The migrations drizzle-kit writes (S-012), found from this file rather than the working directory. */
const MIGRATIONS = fileURLToPath(new URL('../../../db/migrations', import.meta.url))

/**
 * Opens the engine's database file, in WAL mode (D-001), and brings its tables up to date. The
 * path is the caller's setting (D-086); the API and the worker each open their own connection.
 */
export function openDatabase(path: string): Db {
  const client = new Database(path)
  client.pragma('journal_mode = WAL')
  client.pragma('foreign_keys = ON')
  client.pragma('busy_timeout = 5000')
  const db = drizzle(client, { schema })
  migrate(db, { migrationsFolder: MIGRATIONS })
  return db
}

export function closeDatabase(db: Db): void {
  db.$client.close()
}
