/**
 * The markup this repository keeps, and who checks it.
 *
 * S-189. Biome lints and formats every file of code in one pass, 0.49 s against eslint's 6.25 s
 * plus prettier's 5.74 s over the same files. Biome cannot format Markdown, so prettier keeps the
 * markup — Markdown, YAML and the one HTML page — and is handed FILE PATHS, never globs: prettier
 * exits 2 on a pattern that matches nothing (`**` + `/*.yml` does, today), which would leave the
 * step red for a reason that is not a finding.
 */
import { run } from './_lib.mjs'

export const MARKUP_EXTENSIONS = /\.(md|ya?ml|html)$/

/** Just the markup among the paths given. */
export const markupAmong = (paths) => paths.filter((path) => MARKUP_EXTENSIONS.test(path))

/**
 * Every markup file in the repository at `cwd`: tracked, plus untracked that git does not ignore,
 * so a file nobody has committed yet is still checked. `.prettierignore` still applies, and an
 * empty answer means git could not speak — the caller then has no step to run rather than a step
 * that passes over nothing.
 */
export function allMarkup(cwd) {
  const tracked = run('git', ['ls-files', '-z'], { cwd })
  const untracked = run('git', ['ls-files', '--others', '--exclude-standard', '-z'], { cwd })
  if (!tracked.ok || !untracked.ok) return []
  const paths = `${tracked.stdout}\0${untracked.stdout}`.split('\0').filter(Boolean)
  return [...new Set(markupAmong(paths))].sort()
}
