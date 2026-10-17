// The artifact-prefix and URL scrubber (benchmark-view, Gate 2; S-204).
//
// It sits here rather than in the reader that used to own it because the record holds RAW model
// text: nothing under `packages/providers` redacts anything, and the benchmark's only redaction
// was at the record's WRITE boundary, which anything reading the database directly walks past.
// So every string that leaves this package passes through one of these.

/**
 * A piece of a root, as a pattern matches it literally — and a drive letter's `:` may arrive
 * with backslashes before it, because a Windows path inside an ffmpeg FILTERGRAPH has its `:`
 * and `\` escaped (S-075), so `invocations` holds a drive letter followed by
 * `\:/Users/...`, where every other column holds that letter followed by `:\Users\...`.
 * Neither spelling is written out whole here: D-086 forbids a machine path in committed source,
 * and tests/no-absolute-paths.test.ts matches one in a comment exactly as it would in code.
 */
const quoted = (piece: string): string =>
  piece.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replaceAll(':', '[\\\\]*:')

/**
 * Each root as a pattern that matches it UNDER EVERY SPELLING OF A SEPARATOR, together with the
 * separators that follow it. A pattern rather than a string because `render_manifest` and
 * `invocations` are columns that hold JSON TEXT: a root inside one of them arrives with its
 * separators escaped, and a reader that stripped only the plain spelling would leave every such
 * path whole.
 *
 * An empty root is dropped rather than compiled: its pattern would match at every position and
 * erase nothing while costing a pass over every string.
 */
function rootPatterns(roots: readonly string[]): RegExp[] {
  return roots
    .filter((root) => root.length > 0)
    .map((root) => new RegExp(`${root.split(/[\\/]/).map(quoted).join('[\\\\/]+')}[\\\\/]*`, 'g'))
}

/**
 * Every string this package serves or prints passes through the function this returns: an
 * artifact path becomes a path relative to the artifact root (D-086), and a URL becomes `<url>`
 * — no key, URL or query string anywhere (D-022).
 *
 * A run id and a brief key SURVIVE IT UNCHANGED. That is not an accident of the patterns above:
 * it is the thing a widened scrubber ate in `yield-compare`'s round 3, and it is pinned as a
 * positive control rather than left to be noticed.
 */
export function artifactScrubber(roots: readonly string[]): (text: string) => string {
  const patterns = rootPatterns(roots)
  return (text: string): string => {
    let out = text
    for (const pattern of patterns) out = out.replace(pattern, '')
    return out.replace(/\bhttps?:\/\/\S*/g, '<url>')
  }
}
