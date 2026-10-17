// @cutroom/benchmark-read — the shared row loader
// (docs/features/benchmark-view.md, Gate 2 "Where each part lives"; S-204, S-205).
//
// It is HANDED a resolved database path and opens it READ-ONLY, holds the column set per table,
// selects one run's rows, and scrubs an artifact prefix or a URL out of every string that leaves
// it. It resolves no database path, scores nothing, starts no process, reaches no network and
// reads no key — `benchmark-read-no-engine` holds the engine half of that on the real dependency
// graph, and `drift --prove` builds a violation of it. The arithmetic is `@cutroom/benchmark`'s,
// which is pure and is handed rows, and `benchmark-no-reader` stops that package reaching a
// database back through this one.
//
// The package is entered only through this file.

export { TABLES, joinKeyOf, openRecord, orderOf } from './loader.ts'
export type { RecordOptions, StoredRecord } from './loader.ts'
export { artifactScrubber } from './scrub.ts'
