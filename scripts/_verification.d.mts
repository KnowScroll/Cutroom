// The declaration `_verification.mjs` ships, on the pattern `_answers.d.mts` set: the module is
// JavaScript so the scripts run under `--experimental-strip-types` without a build, and tsc reads
// this file when a test imports it. It declares what tests/check-receipt.test.ts uses, and nothing
// a check runner needs at run time.

export interface TestFileResult {
  pass: number
  fail: number
}

export interface Receipt {
  receipt: number
  mode: 'full' | 'targeted' | 'documents' | 'code'
  ok: boolean
  testedTree?: string
  writtenAt?: string
  commit?: string
  checks?: Array<{ label: string; ok: boolean; ms: number }>
  tests?: {
    label?: string
    ok?: boolean
    ms?: number
    total?: number
    failed?: number
    files?: Record<string, TestFileResult>
  }
}

export type ReuseVerdict =
  | { kind: 'exact'; total: number; tree: string }
  | { kind: 'documents'; total: number; tree: string; delta: string[] }
  | { kind: 'none'; why: string }

export const RECEIPT_VERSION: number
export const DOCUMENT: RegExp[]
export function isDocument(path: string): boolean
export function verificationName(): string
export function verificationDir(cwd: string): string
export function receiptPath(cwd: string): string
export function testsRawPath(cwd: string): string
export function workingTreeDirt(cwd: string): string | undefined
export function testedTree(cwd: string): string | undefined
export function treeDelta(cwd: string, from: string, to: string): string[] | undefined
export function readTestsRaw(
  cwd: string,
): { total: number; fail: number; files: Record<string, TestFileResult> } | undefined
export function writeReceipt(cwd: string, receipt: Partial<Receipt>): Receipt
export function readReceipt(cwd: string): Receipt | undefined
export function readFullReceipt(cwd: string): Receipt | undefined
export function fullReceiptPath(cwd: string): string
export function ensureVerificationDir(cwd: string): string
export function reuseVerdict(asked: {
  receipt: Receipt | undefined | Record<string, unknown>
  headTree: string | undefined
  delta: string[] | undefined
  testFiles: string[]
}): ReuseVerdict
