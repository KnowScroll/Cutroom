// The declaration `_impact.mjs` ships, on the pattern `_answers.d.mts` set: the module is
// JavaScript so the checker runs it without a build, and tsc reads this when a test imports it.

export const IMPACT_VERSION: number
export const ALWAYS_RUN: string[]
export type ImpactMap = {
  impact: number
  builtAt: string
  tree?: string
  partial?: boolean
  covers: Record<string, string[]>
}
export function readImpact(cwd: string): ImpactMap | undefined
export function pathsNamedIn(text: string): string[]
export function selectTests(
  impact: ImpactMap | undefined,
  changed: string[],
  options?: { testFilesOnDisk?: string[] },
): { tests: string[]; why?: undefined } | { tests?: undefined; why: string }
