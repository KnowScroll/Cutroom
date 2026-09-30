#!/usr/bin/env node
/**
 * One job: decide whether a feature in docs/features/ is verified, and write down what happened.
 *
 *   node scripts/journey.mjs <slug>
 *
 * A feature's journey is every check in this repository plus the tests named for it,
 * tests/<slug>-*.test.ts, run at a commit. PASS writes an evidence line and flips Status to
 * verified. FAIL writes an evidence line and fills Divergence, and leaves Status alone. Evidence
 * is appended by this script and never typed by hand (S-016).
 *
 * It refuses, writes nothing and exits 2 when the feature is not ready to be judged: a gate not
 * approved, a slice not ticked, no test named for it, or uncommitted changes — an evidence line
 * names a commit, and a dirty tree means that commit is not what was tested.
 *
 * It never commits. `--repo <dir>` judges a feature in another repository; it exists for
 * tests/journey.test.ts, which cannot run this against this repository without recursing.
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { REPO, bold, dim, green, red, run } from './_lib.mjs'

const GATES = ['product', 'architecture', 'program-design', 'slices']

const args = process.argv.slice(2)
const slug = args.find((a) => !a.startsWith('--'))
const repoAt = args.indexOf('--repo')
const root = repoAt === -1 ? REPO : resolve(args[repoAt + 1] ?? '')

function refuse(message) {
  console.error(`\n${red('REFUSED')}  ${message}\n${dim('  Nothing was written.')}\n`)
  process.exit(2)
}

if (slug === undefined) refuse('usage: node scripts/journey.mjs <slug>')

// ---------------------------------------------------------------- ready to be judged?

const featurePath = join(root, 'docs', 'features', `${slug}.md`)
if (!existsSync(featurePath)) refuse(`no feature file at docs/features/${slug}.md`)

const raw = readFileSync(featurePath, 'utf8')
const crlf = raw.includes('\r\n')
const text = raw.replace(/\r\n/g, '\n')

const gates = /^Gates:(.*)$/m.exec(text)?.[1] ?? ''
for (const gate of GATES) {
  if (!new RegExp(`(^|[\\s·])${gate} APPROVED\\b`).test(gates)) {
    refuse(`gate '${gate}' is not approved`)
  }
}

const slicesSection = /^## Gate 4 — Slices[^\n]*\n([\s\S]*?)(?=^## |(?![\s\S]))/m.exec(text)?.[1]
const slices = [...(slicesSection ?? '').matchAll(/^- \[( |x)\] \*\*(.+?)\*\*/gm)]
if (slices.length === 0) refuse(`${slug} has no slices under '## Gate 4 — Slices'`)
for (const [, mark, name] of slices) {
  if (mark === ' ') refuse(`${name} is not ticked`)
}

if (!/^## Evidence/m.test(text) || !/^## Divergence/m.test(text)) {
  refuse(`${slug} has no '## Evidence' or no '## Divergence' section to write to`)
}

const testGlob = `tests/${slug}-*.test.ts`
const testsDir = join(root, 'tests')
const testFiles = existsSync(testsDir)
  ? readdirSync(testsDir).filter((f) => f.startsWith(`${slug}-`) && f.endsWith('.test.ts'))
  : []
if (testFiles.length === 0) refuse(`no test file matches ${testGlob}`)

const status = run('git', ['status', '--porcelain'], { cwd: root })
if (!status.ok) refuse(`git status failed: ${status.stderr.trim()}`)
if (status.stdout.trim() !== '') {
  refuse('the working tree has uncommitted changes; commit first, so the evidence names what ran')
}
const sha = run('git', ['rev-parse', '--short', 'HEAD'], { cwd: root }).stdout.trim()

// ---------------------------------------------------------------- the journey

// NODE_TEST_CONTEXT is set when this runs under a test runner, and a nested `node --test` that
// inherits it reports to that runner in its own format instead of printing TAP — so the count
// below would find nothing. Seen in tests/journey.test.ts.
const env = { ...process.env, NO_COLOR: '1' }
delete env.NODE_TEST_CONTEXT
let divergence = 'none'
let summary = ''

console.log(dim(`\n  ${slug} at ${sha}: every check …`))
const check = run(process.execPath, ['scripts/check.mjs'], { cwd: root, env })
if (!check.ok) {
  const line = `${check.stdout}${check.stderr}`.split('\n').find((l) => /^\s*FAIL\s/.test(l))
  const label = line
    ?.replace(/^\s*FAIL\s+/, '')
    .replace(/\s{2,}\S*\s*$/, '')
    .trim()
  divergence = label ? `the check '${label}' failed` : 'the checks failed, and none said which'
} else {
  console.log(dim(`  ${slug} at ${sha}: ${testGlob} …`))
  const tests = run(
    process.execPath,
    ['--experimental-strip-types', '--no-warnings', '--test', '--test-reporter=tap', testGlob],
    { cwd: root, env },
  )
  const out = `${tests.stdout}${tests.stderr}`
  const count = (name) => Number(new RegExp(`^# ${name} (\\d+)$`, 'm').exec(out)?.[1] ?? NaN)
  const [total, failed] = [count('tests'), count('fail')]
  if (!Number.isInteger(total) || total === 0) {
    divergence = `${testGlob} ran no tests`
  } else if (failed > 0 || !tests.ok) {
    const first = /^not ok \d+ - (.*)$/m.exec(out)?.[1]
    divergence = `${failed} of ${total} tests in ${testGlob} fail${first ? `, first '${first}'` : ''}`
  } else {
    summary = `every check green; ${total} tests in ${testGlob} pass`
  }
}

// ---------------------------------------------------------------- write it down

const passed = divergence === 'none'
const date = new Date().toLocaleDateString('en-CA')
const evidence = `- ${date} journey=${passed ? 'PASS' : 'FAIL'} at ${sha} — ${passed ? summary : divergence}`

// Newest first, above every earlier line, and never touching one.
let next = text.replace(
  /^(## Evidence[^\n]*\n)\n*([\s\S]*?)(?=^## |(?![\s\S]))/m,
  (_, heading, earlier) => `${heading}\n${evidence}\n${earlier.trim() ? earlier : '\n'}`,
)
next = next.replace(/^(## Divergence[^\n]*\n)[\s\S]*?(?=^## |(?![\s\S]))/m, `$1\n${divergence}\n\n`)
// The Divergence replacement above writes a trailing blank line when Divergence is the file's last
// section (so the file ends with `\n\n`). Prettier rejects that — every other Markdown file in the
// repository ends with a single newline — and that was the source of the prompt-073 re-journey FAIL:
// the SDK journey wrote evidence to `docs/features/cutroom-sdk.md`, whose last section is
// Divergence, and the next `check.mjs` run failed on `prettier --check`. Trim the file to exactly one
// trailing newline so the journey preserves the format invariant no matter where Divergence lives.
next = next.replace(/\n+$/, '\n')
if (passed) next = next.replace(/^Status:.*$/m, 'Status: verified')
writeFileSync(featurePath, crlf ? next.replace(/\n/g, '\r\n') : next)

if (passed) {
  console.log(`\n  ${green(bold('PASS'))}  ${slug} — Status: verified\n  ${dim(evidence)}\n`)
  process.exit(0)
}
console.log(`\n  ${red(bold('FAIL'))}  ${slug} — ${divergence}\n  ${dim(evidence)}`)
console.log(dim('\n  Stop here and report. Do not weaken a check or a test to reach green.\n'))
process.exit(1)
