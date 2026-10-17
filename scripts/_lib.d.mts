// The declaration `_lib.mjs` ships, on the pattern `_answers.d.mts` set: the module is
// JavaScript so the checker runs it without a build, and tsc reads this when a test imports it.
//
// Written when `benchmark-view`'s Slice 1 put the database path's precedence here, where both
// readers reach it and the loader package — which may not import `apps/service` — does not.

export const REPO: string
export const bold: (s: unknown) => string
export const dim: (s: unknown) => string
export const red: (s: unknown) => string
export const green: (s: unknown) => string
export const yellow: (s: unknown) => string

export type RunResult = { ok: boolean; stdout: string; stderr: string; code: number }
export function run(cmd: string, args: readonly string[], opts?: Record<string, unknown>): RunResult

export function setting(name: string): string | undefined

/** `--db`, then `CUTROOM_DB_PATH`, then the service's `DEFAULT_DB_PATH`. */
export function databasePath(given: string | undefined): Promise<string>

export function fail(message: string): void
export function pass(message: string): void
