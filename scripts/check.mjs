#!/usr/bin/env node
/**
 * One job: run every check this repository has, in one command, and say plainly which failed.
 *
 *   node scripts/check.mjs            everything
 *   node scripts/check.mjs --code     only the checks about the code in this repo
 *
 * Tools are invoked as `node <path-to-bin>` rather than through pnpm, because pnpm is not on
 * this machine's PATH (§8 of the bootstrap prompt). corepack is how pnpm itself is run:
 *   corepack pnpm install
 */
import { join } from 'node:path'
import { REPO, bold, dim, green, red, run } from './_lib.mjs'

const node = process.execPath
const bin = (...parts) => join(REPO, 'node_modules', ...parts)

const CODE = [
  ['typecheck', node, [bin('typescript', 'bin', 'tsc'), '-b', '--pretty']],
  ['lint', node, [bin('eslint', 'bin', 'eslint.js'), '.']],
  ['format', node, [bin('prettier', 'bin', 'prettier.cjs'), '--check', '.']],
  ['boundaries', node, ['scripts/drift.mjs']],
  ['boundaries proven', node, ['scripts/drift.mjs', '--prove']],
  ['no dead rule', node, ['scripts/drift.mjs', '--audit']],
  [
    'tests',
    node,
    [
      '--experimental-strip-types',
      '--test',
      'tests/**/*.test.ts',
      'packages/**/*.test.ts',
      'apps/**/*.test.ts',
    ],
  ],
]

const AUTHORITY = [
  ['decisions pin', node, ['scripts/decisions.mjs']],
  ['copied docs', node, ['scripts/docs-check.mjs']],
]

const steps = process.argv.includes('--code') ? CODE : [...CODE, ...AUTHORITY]
const failures = []

console.log('')
for (const [label, cmd, args] of steps) {
  const started = Date.now()
  const result = run(cmd, args, { env: { ...process.env, NO_COLOR: '1' } })
  const ms = `${Date.now() - started}ms`
  if (result.ok) {
    console.log(`  ${green('ok')}    ${label.padEnd(18)} ${dim(ms)}`)
  } else {
    console.log(`  ${red('FAIL')}  ${label.padEnd(18)} ${dim(ms)}`)
    failures.push([label, `${result.stdout}${result.stderr}`.trim(), [cmd, ...args]])
  }
}

if (failures.length === 0) {
  console.log(`\n${green(bold('everything green'))}\n`)
  process.exit(0)
}

for (const [label, output, argv] of failures) {
  console.log(`\n${red(bold(`--- ${label} ---`))}\n`)
  console.log(output.split('\n').slice(0, 40).join('\n'))
  console.log(dim(`\n  rerun: node ${argv.slice(1).join(' ')}`))
}
console.log(`\n${red(bold(`${failures.length} check(s) failed`))}\n`)
process.exit(1)
