#!/usr/bin/env node
/**
 * THE BENCHMARK PAGE, SERVED FROM A RECORD YOU NAME (benchmark-view, Gate 2; S-201, S-204).
 *
 *   node --experimental-strip-types --no-warnings scripts/benchmark-serve.mjs [--db <file>] [--port <n>]
 *
 * A LAUNCHER AND NOTHING ELSE: two flags in, the package does the rest, the URL printed. Both
 * things it HANDS `@cutroom/benchmark-read` are resolved ONCE in `scripts/_lib.mjs`, which the
 * package may not reach: the record — `--db`, else CUTROOM_DB_PATH, else the service's default —
 * and the roots stripped from every string it serves (D-086). Without `--port`, a free one.
 */
import process from 'node:process'
import { startBenchmarkView } from '@cutroom/benchmark-read'
import { artifactRoots, databasePath } from './_lib.mjs'

/** Exit 2: a flag, or its value, this launcher cannot use. Nothing is opened, nothing printed. */
function unusable(message) {
  process.stderr.write(`\nbenchmark-serve: ${message}\n\n`)
  process.exit(2)
}

const flags = process.argv.slice(2)
const given = {}
for (let i = 0; i < flags.length; i += 1) {
  const flag = flags[i]
  if (flag !== '--db' && flag !== '--port') unusable(`${flag} is not a flag of this launcher`)
  const value = flags[i + 1]
  i += 1
  if (value === undefined || value.startsWith('--')) unusable(`${flag} needs a value`)
  given[flag.slice(2)] = value
}
if (given.port !== undefined && !/^\d+$/.test(given.port)) unusable('--port takes digits')

const view = await startBenchmarkView({
  dbPath: await databasePath(given.db),
  roots: await artifactRoots(),
  port: given.port === undefined ? 0 : Number(given.port),
})
process.stdout.write(`\n  the benchmark page is ready: ${view.baseUrl}\n\n`)
