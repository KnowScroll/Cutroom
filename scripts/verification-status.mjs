#!/usr/bin/env node
/**
 * Read the verification evidence attached to HEAD. Evidence is commit-tree-bound: a later
 * session may reuse a completed run only when HEAD still names the exact tree it tested (S-177).
 */
import { fail, pass, run } from './_lib.mjs'

function git(...args) {
  const result = run('git', args)
  if (!result.ok) {
    fail(`git ${args.join(' ')} failed: ${result.stderr.trim()}`)
    return undefined
  }
  return result.stdout.trim()
}

const commit = git('rev-parse', 'HEAD')
const tree = git('rev-parse', 'HEAD^{tree}')
const message = git('log', '-1', '--format=%B')
if (commit === undefined || tree === undefined || message === undefined) process.exit(1)

const field = (name) => new RegExp(`^${name}:\\s*(.+)$`, 'm').exec(message)?.[1]?.trim()
const kind = field('Verification')
const recordedTree = field('Verification-Tree')
const tests = field('Verification-Tests')

if (kind !== 'full' && kind !== 'targeted')
  fail('HEAD has no valid Verification: full|targeted trailer')
else if (recordedTree !== tree)
  fail(`HEAD evidence names tree ${recordedTree ?? '(none)'}, not ${tree}`)
else if (kind === 'targeted' && (tests === undefined || tests.length === 0)) {
  fail('targeted evidence must name Verification-Tests')
} else {
  pass(
    `${commit.slice(0, 7)} has ${kind} verification for its exact tree${tests === undefined ? '' : ` (${tests})`}`,
  )
}
