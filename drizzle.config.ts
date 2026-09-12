import { defineConfig } from 'drizzle-kit'

// Migration tooling only. There is no schema yet: the tables are slice 1 of a feature
// whose gates are still in review, and gates precede code. `pnpm db:generate` will fail
// until `packages/domain/src/schema.ts` exists, and that failure is correct.
//
// D-001: SQLite, better-sqlite3, WAL.
// D-086: the database file's path is one setting with a gitignored default inside this
// repository — never a hardcoded absolute path.
export default defineConfig({
  dialect: 'sqlite',
  schema: './packages/domain/src/schema.ts',
  out: './db/migrations',
  dbCredentials: {
    url: process.env.CUTROOM_DB_PATH ?? './data/cutroom.sqlite',
  },
  strict: true,
  verbose: true,
})
