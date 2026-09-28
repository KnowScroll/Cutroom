#!/usr/bin/env node
/**
 * One job: run every check this repository has, in one command, and say plainly which failed.
 *
 *   node scripts/check.mjs            everything
 *   node scripts/check.mjs --code     only the checks about the code in this repo
 *   node scripts/check.mjs --changed  only what the paths changed since HEAD can turn red (S-159)
 *   node scripts/check.mjs --changed --dry-run   which checks, and why; runs none of them
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
      // Some PATH-only journey checks run their own bounded, parallel child suites. Running the
      // outer suite serially preserves every check while preventing nested ffmpeg/SQLite workers
      // from competing for the same machine and turning a load timeout into a false aggregate red.
      '--test-concurrency=1',
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

// ---------------------------------------------------------------- --changed (S-159)
//
// Every path that differs from HEAD — staged or not, and untracked unless git ignores it — is a
// document, code, or a path this list does not know. Only a change made wholly of documents runs
// less than everything, and what it runs is what a document can turn red: the formatting, the
// tests that read files other than code, and the authority. One path of code, or one unknown
// path, runs every check. It trusts HEAD: code is committed only after the full run.

const DOCUMENT = [
  /^docs\/.+\.md$/,
  /^PROMPTS\/.+\.md$/,
  /^(JOURNAL|DECISIONS|CLAUDE|README|AGENTS)\.md$/,
]

const CODE_PATH = [
  /^(packages|apps|tests|scripts|db)\//,
  /^(package\.json|pnpm-lock\.yaml|pnpm-workspace\.yaml|tsconfig(\.[a-z]+)?\.json)$/,
  /^(eslint\.config\.mjs|drizzle\.config\.ts|\.prettierrc\.json|\.prettierignore)$/,
  /^(\.dependency-cruiser\.cjs|\.gitattributes|\.gitignore|\.editorconfig|\.npmrc)$/,
]

/** The four tests that read files other than code; the whole suite runs them too. */
const SCANS = [
  'tests/line-endings.test.ts',
  'tests/no-absolute-paths.test.ts',
  'tests/feature-files.test.ts',
  'tests/context-file.test.ts',
]

const DOCUMENTS_ONLY = [
  CODE.find(([label]) => label === 'format'),
  ['scans', node, ['--experimental-strip-types', '--test', ...SCANS]],
  ...AUTHORITY,
]

const kind = (path) =>
  DOCUMENT.some((re) => re.test(path))
    ? 'document'
    : CODE_PATH.some((re) => re.test(path))
      ? 'code'
      : 'unknown'

/**
 * The paths that differ from HEAD, or null when git cannot say. `--no-renames`, because a rename
 * is otherwise listed by its new name alone: a file of code moved under docs/ would read as a
 * document. `-z`, because git quotes a path with a character outside ASCII.
 */
function changedPaths() {
  const tracked = run('git', ['diff', '--name-only', '--no-renames', '-z', 'HEAD'])
  const untracked = run('git', ['ls-files', '--others', '--exclude-standard', '-z'])
  if (!tracked.ok || !untracked.ok) return null
  const paths = `${tracked.stdout}\0${untracked.stdout}`.split('\0').filter(Boolean)
  return [...new Set(paths)].sort()
}

function choose() {
  const paths = changedPaths()
  if (paths === null) {
    return { steps: [...CODE, ...AUTHORITY], paths: [], why: 'git could not list what changed' }
  }
  const first = paths.find((path) => kind(path) !== 'document')
  if (first !== undefined) {
    return { steps: [...CODE, ...AUTHORITY], paths, why: `a path of ${kind(first)}: ${first}` }
  }
  const why = paths.length === 0 ? 'nothing differs from HEAD' : 'documents only'
  return { steps: DOCUMENTS_ONLY, paths, why }
}

const changed = process.argv.includes('--changed')
if (changed && process.argv.includes('--code')) {
  console.error(`\n${red('FAIL')}  --changed chooses its own checks; it does not take --code\n`)
  process.exit(2)
}

let steps = process.argv.includes('--code') ? CODE : [...CODE, ...AUTHORITY]
let partial = false

console.log('')
if (changed) {
  const choice = choose()
  steps = choice.steps
  partial = steps === DOCUMENTS_ONLY
  console.log(`  --changed: ${choice.paths.length} path(s) differ from HEAD`)
  for (const path of choice.paths.slice(0, 30))
    console.log(dim(`    ${kind(path).padEnd(9)} ${path}`))
  if (choice.paths.length > 30) console.log(dim(`    and ${choice.paths.length - 30} more`))
  console.log(`  ${partial ? 'the checks a document can fail' : 'every check'}: ${choice.why}\n`)
}

if (process.argv.includes('--dry-run')) {
  const chosen = new Set(steps.map(([label]) => label))
  for (const [label] of steps) console.log(`  would run  ${label}`)
  for (const [label] of [...CODE, ...AUTHORITY]) {
    if (!chosen.has(label)) console.log(`  skipped    ${label}`)
  }
  console.log('')
  process.exit(0)
}

const failures = []

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
  const verdict = partial
    ? 'green — documents only: the code checks were not run (S-159)'
    : 'everything green'
  console.log(`\n${green(bold(verdict))}\n`)
  process.exit(0)
}

for (const [label, output, argv] of failures) {
  console.log(`\n${red(bold(`--- ${label} ---`))}\n`)
  const lines = output.split('\n')
  const start = Math.max(0, lines.length - 80)
  if (start > 0) console.log(dim(`  (${start} earlier output line(s) omitted)\n`))
  console.log(lines.slice(start).join('\n'))
  console.log(dim(`\n  rerun: node ${argv.slice(1).join(' ')}`))
}
console.log(`\n${red(bold(`${failures.length} check(s) failed`))}\n`)
process.exit(1)
