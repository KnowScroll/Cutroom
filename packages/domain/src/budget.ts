import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// The per-reel cap (docs/features/reel-plan.md, Gate 2 "Ranking and the estimate"; D-014, D-100).
// It lives in the steering repository's BUDGET.md and is read through the pinned steering-ref —
// never copied into this repository's configuration.

/** Where the cap is read from by default: the pinned steering repository's BUDGET.md (D-100). */
export const BUDGET_MD = fileURLToPath(
  new URL('../../../steering-ref/steering/BUDGET.md', import.meta.url),
)

const ROW = 'Per reel, all-in'
/** `$3.00`, `**$3.00**` or `$3` — dollars, and cents if written. */
const DOLLARS = /^\*{0,2}\$(\d+)(?:\.(\d{1,2}))?\*{0,2}$/

/**
 * The figure in the `Per reel, all-in` row of a BUDGET.md table, in integer cents. A file with no
 * such row, or a figure that is not dollars, throws — a cap that cannot be read is not a cap of 0.
 */
export function readReelCapCents(budgetMdPath: string): number {
  const text = readFileSync(budgetMdPath, 'utf8')
  for (const line of text.split(/\r?\n/)) {
    const cells = line.split('|').map((cell) => cell.trim())
    if (cells[1] !== ROW) continue
    const figure = DOLLARS.exec(cells[2] ?? '')
    if (figure === null) {
      throw new Error(
        `the "${ROW}" row in ${budgetMdPath} holds "${cells[2]}", not a dollar figure`,
      )
    }
    const [, dollars, cents = '0'] = figure
    return Number(dollars) * 100 + Number(cents.padEnd(2, '0'))
  }
  throw new Error(`${budgetMdPath} has no "${ROW}" row`)
}
