// The splitter (docs/features/reel-plan.md, Gate 2 "The splitter"; D-073, D-107, D-112).
//
// It is told how many sentences there are and how many units to make, and nothing else — not the
// text, not the claims, not any plan type — so this folder imports nothing outside itself. It never
// detects a sentence: KnowScroll sends them already cut (D-107), and it groups whole ones, in order.

/**
 * Contiguous groups of sentence positions, in order, one group per unit: as equal as possible in
 * sentence count, any extra sentences going to the earliest units. Fewer sentences than units — or
 * a count that is not a whole number — returns null, since a unit would have to divide a sentence
 * or hold none (D-112).
 */
export function groupSentences(sentenceCount: number, units: number): number[][] | null {
  if (!Number.isInteger(sentenceCount) || !Number.isInteger(units)) return null
  if (units < 1 || sentenceCount < units) return null

  const size = Math.floor(sentenceCount / units)
  const extra = sentenceCount % units
  const groups: number[][] = []
  let next = 0
  for (let unit = 0; unit < units; unit += 1) {
    const length = size + (unit < extra ? 1 : 0)
    groups.push(Array.from({ length }, (_, i) => next + i))
    next += length
  }
  return groups
}
