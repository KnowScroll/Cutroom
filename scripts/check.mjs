#!/usr/bin/env node
/**
 * One job: run every check this repository has, in one command, and say plainly which failed.
 *
 *   node scripts/check.mjs            everything
 *   node scripts/check.mjs --code     only the checks about the code in this repo
 *   node scripts/check.mjs --changed  document checks, or explain why code needs --slice
 *   node scripts/check.mjs --slice <test...>  static checks plus approved tests for one code slice
 *   node scripts/check.mjs --changed --dry-run   which checks, and why; runs none of them
 *
 * Tools are invoked as `node <path-to-bin>` rather than through pnpm, because pnpm is not on
 * this machine's PATH (§8 of the bootstrap prompt). corepack is how pnpm itself is run:
 *   corepack pnpm install
 */
import { existsSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
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

// ---------------------------------------------------------------- --changed / --slice (S-177)
//
// Every path that differs from HEAD — staged or not, and untracked unless git ignores it — is a
// document, code, or a path this list does not know. Documents run what a document can turn red.
// Code must name the tests its approved impact review owns through `--slice`; unknown paths and
// verification infrastructure fail closed to the full run.

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
  /^\.claude\/(hooks\/.+\.sh|settings\.json)$/,
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
    return { steps: undefined, paths: [], why: 'git could not list what changed' }
  }
  const first = paths.find((path) => kind(path) !== 'document')
  if (first !== undefined)
    return { steps: undefined, paths, why: `a path of ${kind(first)}: ${first}` }
  const why = paths.length === 0 ? 'nothing differs from HEAD' : 'documents only'
  return { steps: DOCUMENTS_ONLY, paths, why }
}

const changed = process.argv.includes('--changed')
const sliceAt = process.argv.indexOf('--slice')
const slice = sliceAt >= 0
const sliceTests = slice
  ? process.argv.slice(sliceAt + 1).filter((arg) => !arg.startsWith('--'))
  : []
if (
  (changed && process.argv.includes('--code')) ||
  (changed && slice) ||
  (slice && process.argv.includes('--code'))
) {
  console.error(`\n${red('FAIL')}  choose one mode: --changed, --code, or --slice <test...>\n`)
  process.exit(2)
}

// Changing the checker or its proof is a broad change by definition: it must run the full suite.
const VERIFY_INFRASTRUCTURE = new Set([
  'scripts/check.mjs',
  'scripts/verification-status.mjs',
  'scripts/drift.mjs',
  'scripts/journey.mjs',
  'tests/check-changed.test.ts',
  'tests/verification-status.test.ts',
])
const FULL_ONLY = [
  /^scripts\//,
  /^(package\.json|pnpm-lock\.yaml|pnpm-workspace\.yaml|tsconfig(\.[a-z]+)?\.json)$/,
  /^(eslint\.config\.mjs|drizzle\.config\.ts|\.prettierrc\.json|\.prettierignore)$/,
  /^(\.dependency-cruiser\.cjs|\.gitattributes|\.gitignore|\.editorconfig|\.npmrc)$/,
  /^\.claude\//,
]

function validateSlice() {
  const paths = changedPaths()
  if (paths === null || paths.length === 0) return 'a slice needs a visible code diff from HEAD'
  const nonDocuments = paths.filter((path) => kind(path) !== 'document')
  if (nonDocuments.length === 0) return 'a documents-only change uses --changed, not --slice'
  const infrastructure = nonDocuments.find((path) => VERIFY_INFRASTRUCTURE.has(path))
  if (infrastructure !== undefined)
    return `${infrastructure} changes verification infrastructure; run the full check`
  const fullOnly = nonDocuments.find((path) => FULL_ONLY.some((rule) => rule.test(path)))
  if (fullOnly !== undefined)
    return `${fullOnly} changes tooling or workspace configuration; run the full check`
  const unknown = nonDocuments.find((path) => kind(path) === 'unknown')
  if (unknown !== undefined)
    return `${unknown} is not classified for targeted verification; run the full check`
  if (sliceTests.length === 0) return 'a code slice must name at least one approved .test.ts file'
  for (const test of sliceTests) {
    const absolute = resolve(REPO, test)
    const inside = !relative(REPO, absolute).startsWith('..')
    if (!inside || !/^(tests|packages|apps)\/.+\.test\.ts$/.test(test) || !existsSync(absolute)) {
      return `${test} is not an existing in-repository .test.ts file`
    }
  }
  const selected = new Set(sliceTests)
  const changedTest = nonDocuments.find((path) => path.endsWith('.test.ts') && !selected.has(path))
  if (changedTest !== undefined) return `${changedTest} changed but is not named by --slice`
  return undefined
}

let steps = process.argv.includes('--code') ? CODE : [...CODE, ...AUTHORITY]
let partial = false

console.log('')
if (changed) {
  const choice = choose()
  if (choice.steps === undefined) {
    console.error(`\n${red('FAIL')}  --changed cannot choose tests for ${choice.why}.`)
    console.error(
      `      Use --slice <approved affected .test.ts files>, or run the full check for broad/tooling work.\n`,
    )
    process.exit(2)
  }
  steps = choice.steps
  partial = steps === DOCUMENTS_ONLY
  console.log(`  --changed: ${choice.paths.length} path(s) differ from HEAD`)
  for (const path of choice.paths.slice(0, 30))
    console.log(dim(`    ${kind(path).padEnd(9)} ${path}`))
  if (choice.paths.length > 30) console.log(dim(`    and ${choice.paths.length - 30} more`))
  console.log(`  ${partial ? 'the checks a document can fail' : 'every check'}: ${choice.why}\n`)
}

if (slice) {
  const problem = validateSlice()
  if (problem !== undefined) {
    console.error(`\n${red('FAIL')}  ${problem}\n`)
    process.exit(2)
  }
  steps = [
    ...CODE.filter(([label]) => label !== 'tests'),
    [
      'slice tests',
      node,
      ['--experimental-strip-types', '--test', '--test-concurrency=1', ...sliceTests],
    ],
    ...AUTHORITY,
  ]
  console.log(`  --slice: ${sliceTests.join(', ')}\n`)
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
