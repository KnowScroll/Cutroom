#!/usr/bin/env node
/**
 * One job: prove the three design documents in docs/design/ are still byte-identical to the
 * originals in the steering repository.
 *
 * The owner chose to COPY these rather than move them, so both repositories hold them. Two
 * copies of one document is the drift D-088 exists to prevent, so the copy is only safe if
 * divergence is caught mechanically. That is this script.
 *
 * Two checks, and they fail differently on purpose:
 *   A. the copy still hashes to what was recorded   -> someone edited the copy here
 *   B. the copy equals the original in steering-ref -> the original moved, or the copy did
 */
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { REPO, bold, dim, fail, green, pass, red, yellow } from './_lib.mjs'

const MANIFEST = join(REPO, 'docs', 'design', 'COPIED_FROM.json')
const SUBMODULE = 'steering-ref'

/**
 * Compare content, not line-ending accidents. The steering repository has no .gitattributes,
 * so on Windows it checks out CRLF while this repository checks out LF — the same document
 * would otherwise "differ" in every byte of every line.
 *
 * Only CRLF is folded. A LONE CR is left alone, because contentions.md contains one on
 * purpose: a code span holding the literal carriage return it is warning about.
 */
const normalise = (bytes) =>
  Buffer.from(bytes.toString('latin1').split('\r\n').join('\n'), 'latin1')

const sha256 = (bytes) => createHash('sha256').update(normalise(bytes)).digest('hex')

if (!existsSync(MANIFEST)) {
  fail(
    'docs/design/COPIED_FROM.json is missing, so nothing records where these documents ' +
      'came from. A copy with no provenance is a fork.',
  )
  process.exit(1)
}

const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'))
const haveOriginals = existsSync(join(REPO, SUBMODULE, 'steering', 'DECISIONS.md'))

console.log(`\n${bold('The copied design documents')}`)
console.log(`${dim(`  copied from ${manifest.sourceRepo} at ${manifest.sourceCommit}`)}\n`)

let edited = 0
let diverged = 0

for (const file of manifest.files) {
  const copy = join(REPO, file.path)
  if (!existsSync(copy)) {
    console.log(`  ${red('missing')}  ${file.path}`)
    edited += 1
    continue
  }

  const bytes = readFileSync(copy)
  const hash = sha256(bytes)

  if (hash !== file.sha256) {
    console.log(`  ${red('edited')}   ${file.path}`)
    console.log(
      `           ${dim(`recorded ${file.sha256.slice(0, 12)}, found ${hash.slice(0, 12)}`)}`,
    )
    edited += 1
    continue
  }

  if (!haveOriginals) {
    console.log(
      `  ${yellow('ok*')}      ${file.path} ${dim('(hash only; steering-ref not checked out)')}`,
    )
    continue
  }

  const original = join(REPO, SUBMODULE, file.sourcePath)
  if (!existsSync(original)) {
    console.log(
      `  ${red('gone')}     ${file.sourcePath} no longer exists in the steering repository`,
    )
    diverged += 1
    continue
  }
  if (!normalise(readFileSync(original)).equals(normalise(bytes))) {
    console.log(`  ${red('DRIFT')}    ${file.path}`)
    console.log(`           ${dim(`differs from ${SUBMODULE}/${file.sourcePath}`)}`)
    diverged += 1
    continue
  }
  console.log(`  ${green('same')}     ${file.path}`)
}

console.log('')

if (edited > 0) {
  fail(
    `${edited} copied document(s) were changed here. These are copies of an authority that ` +
      `lives elsewhere:\n      change the original in the steering repository, then re-copy and ` +
      `update COPIED_FROM.json.`,
  )
} else if (diverged > 0) {
  fail(
    `${diverged} document(s) no longer match the steering repository. Reconcile them, then ` +
      `re-copy and update COPIED_FROM.json. Do not edit the copy to silence this.`,
  )
} else {
  pass(`${manifest.files.length} documents identical to the steering repository`)
}
