// The declaration `_pools.mjs` ships, on the pattern `_answers.d.mts` set: the module is
// JavaScript so the checker runs it without a build, and tsc reads this when a test imports it.

export const SECRETS_FILE: RegExp
export const ORDINARY_CONCURRENCY: number
export const SECRETS_CONCURRENCY: number
export const TEST_ROOTS: string[]
export function testFiles(cwd: string): string[]
export function classify(files: string[]): { ordinary: string[]; secrets: string[] }
export type FileCounts = { pass: number; fail: number }
export function mergeRaw(
  parts: (
    | undefined
    | null
    | { pass?: number; fail?: number; files?: Record<string, FileCounts> }
  )[],
): { pass: number; fail: number; total: number; files: Record<string, FileCounts> }
