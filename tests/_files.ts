import { execFileSync } from 'node:child_process'

/**
 * Every file in the working copy the file scans must read: **tracked, plus untracked that git
 * does not ignore.**
 *
 * S-195. The scans used to enumerate `git ls-files` alone, which lists tracked files only — and
 * the working order is write, run the checks, then commit, so a file a change ADDS is untracked
 * at exactly the moment the checks run. The scans were therefore blind to the new files of every
 * change they were meant to verify: measured here, the same file carrying an absolute path passes
 * the scan while untracked and fails it once `git add -N` makes it tracked. Session 87 paid for it
 * for real — `scripts/benchmark.mjs` was committed with an absolute path and its own green full
 * run could not see it.
 *
 * `--others --exclude-standard` is what keeps the junk out: `.artifacts/`, `.tmp/`,
 * `.verification/` and `node_modules/` are ignored, so nothing generated is scanned. The same
 * pairing is what `scripts/_markup.mjs` already does for prettier (S-189).
 */
export function repoFiles(cwd: string): string[] {
  const git = (...args: string[]) =>
    execFileSync('git', args, { cwd, encoding: 'utf8' }).split('\0').filter(Boolean)
  const tracked = git('ls-files', '-z')
  const untracked = git('ls-files', '--others', '--exclude-standard', '-z')
  return [...new Set([...tracked, ...untracked])].sort()
}
