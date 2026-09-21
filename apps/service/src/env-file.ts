import { readFileSync } from 'node:fs'

// Loading the environment file a setting names (S-109). The file is gitignored — `.gitignore`
// already covers `.env` and no exception is added (CLAUDE.md rule 4).
//
// Nothing here knows what a key is. It reads names and values, hands the whole lot on, and
// `packages/providers` is the only thing that ever looks for a key by name — which is why this
// file can sit in an app without being the second place a secret lives.

/** `NAME=value`, with an optional `export `, and an optional pair of matching quotes. */
const LINE = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/

function unquote(value: string): string {
  const quoted = /^(['"])([\s\S]*)\1$/.exec(value)
  return quoted === null ? value : (quoted[2] as string)
}

/**
 * Every name the file sets. A file that is not there is an empty environment, not a failure: the
 * default path is `.env` at this repository's root, and the free path needs no such file at all.
 */
export function loadEnvFile(path: string): Record<string, string> {
  let text: string
  try {
    text = readFileSync(path, 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return {}
    throw error
  }
  const values: Record<string, string> = {}
  for (const line of text.split(/\r?\n/)) {
    if (line.trim() === '' || line.trimStart().startsWith('#')) continue
    const found = LINE.exec(line)
    if (found === null) continue
    values[found[1] as string] = unquote(found[2] as string)
  }
  return values
}
