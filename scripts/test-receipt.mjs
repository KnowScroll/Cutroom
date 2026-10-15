/**
 * A test reporter whose only job is to say which file each test belongs to.
 *
 * Node 22.14's built-in tap and junit reporters do not attribute a test to its file: running two
 * files prints one flat stream, measured 2026-10-15. The receipt needs per-file results (S-188),
 * so it is collected here, from the runner's own event stream, where `data.file` is present.
 *
 * Wired by scripts/check.mjs as a second reporter writing to the receipt's raw file; the stream a
 * human reads is unchanged. Output is one JSON object: totals, and a map of repository-relative
 * path to its passing and failing counts.
 */
import { relative, sep } from 'node:path'

export default async function* receiptReporter(source) {
  const cwd = process.cwd()
  const files = new Map()
  let pass = 0
  let fail = 0

  const row = (file) => {
    const key = file === undefined ? '(no file)' : relative(cwd, file).split(sep).join('/')
    const existing = files.get(key)
    if (existing !== undefined) return existing
    const made = { pass: 0, fail: 0 }
    files.set(key, made)
    return made
  }

  for await (const event of source) {
    if (event.type === 'test:pass') {
      row(event.data.file).pass += 1
      pass += 1
    } else if (event.type === 'test:fail') {
      row(event.data.file).fail += 1
      fail += 1
    }
  }

  yield `${JSON.stringify(
    {
      pass,
      fail,
      total: pass + fail,
      files: Object.fromEntries([...files].sort(([a], [b]) => (a < b ? -1 : 1))),
    },
    null,
    2,
  )}\n`
}
