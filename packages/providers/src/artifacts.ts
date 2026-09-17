import { isAbsolute, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// Where every file an adapter writes lives (D-086, D-087): ONE artifact root, a setting each adapter
// and stand-in is built with, in a folder for the run. Pictures, narrations, clips, and later the
// output and its frames all take their path from here, so no adapter can come to refuse less than
// another.

/**
 * Where files are written when no root is given: `.artifacts/` at this repository's root, which
 * `.gitignore` names (D-086). Found from this file, never from the working directory, so it is the
 * same folder whoever starts the engine from wherever.
 */
export const DEFAULT_ARTIFACT_ROOT = fileURLToPath(new URL('../../../.artifacts', import.meta.url))

/** One path segment, or a refusal: nothing a caller passes may walk out of its folder. */
function segment(value: string, what: string, who: string): void {
  if (value === '' || value === '.' || value === '..' || /[\\/:]/.test(value)) {
    throw new Error(
      `${who} refuses ${what} '${value}': a file's path must stay under the artifact root (D-086)`,
    )
  }
}

/**
 * `<root>/<runId>/<id><extension>`, refused if either id is not one path segment or the path would be
 * anywhere but under the root (D-086). `who` names the adapter in the refusal.
 */
export function artifactPath(
  root: string,
  ids: { runId: string; id: string; what: string },
  extension: string,
  who: string,
): string {
  segment(ids.runId, 'runId', who)
  segment(ids.id, ids.what, who)
  const base = resolve(root)
  const path = resolve(base, ids.runId, `${ids.id}${extension}`)
  const inside = relative(base, path)
  if (inside === '' || inside.startsWith('..') || isAbsolute(inside)) {
    throw new Error(`${who} refuses '${path}': it is not under ${base} (D-086)`)
  }
  return path
}
