import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { after, test } from 'node:test'
import { REPO } from './_repo.ts'
import { allMarkup, MARKUP_EXTENSIONS } from '../scripts/_markup.mjs'

// S-177: documents choose their own small checks. A code slice must name its approved tests with
// `--slice`; a checker/configuration/unknown diff fails closed to the full suite. What must never
// happen is a code change quietly selecting no tests.
//
// Each case is a scratch repository holding this repository's own `check.mjs`, `_lib.mjs` and
// `_verification.mjs` (S-188: the checker imports the receipt module),
// asked with `--dry-run`, which prints what it would run and runs none of it. "Every check" is
// never a list kept here: it is what the full run's own dry run prints, so a step added to the
// full run is one `--changed` must also choose.

const made: string[] = []
after(() => {
  for (const dir of made) rmSync(dir, { recursive: true, force: true })
})

function git(cwd: string, ...args: string[]) {
  const r = spawnSync(
    'git',
    ['-c', 'user.name=check-changed-test', '-c', 'user.email=check@test', ...args],
    { cwd, encoding: 'utf8' },
  )
  assert.equal(r.status, 0, `git ${args.join(' ')}: ${r.stderr}`)
}

function write(dir: string, path: string, text: string) {
  mkdirSync(dirname(join(dir, path)), { recursive: true })
  writeFileSync(join(dir, path), text)
}

/** A committed repository with one file of each kind, and this repository's check script. */
function scratch(): string {
  const dir = mkdtempSync(join(tmpdir(), 'check-changed-'))
  made.push(dir)
  mkdirSync(join(dir, 'scripts'))
  for (const f of ['check.mjs', '_lib.mjs', '_verification.mjs', '_markup.mjs']) {
    copyFileSync(join(REPO, 'scripts', f), join(dir, 'scripts', f))
  }
  write(dir, 'packages/pipeline/src/stage.ts', 'export const stage = 1\n')
  write(dir, 'tests/stage.test.ts', "import { test } from 'node:test'\n")
  write(dir, 'docs/notes.md', '# Notes\n')
  write(dir, 'JOURNAL.md', '# Journal\n')
  write(dir, 'stray.bin', 'bytes\n')
  git(dir, 'init', '-q')
  git(dir, 'add', '-A')
  git(dir, 'commit', '-q', '-m', 'scratch')
  return dir
}

/** What `check.mjs` would run in `dir`, and what it would skip. */
function dryRun(dir: string, ...flags: string[]) {
  const r = spawnSync(process.execPath, ['scripts/check.mjs', ...flags, '--dry-run'], {
    cwd: dir,
    encoding: 'utf8',
    env: { ...process.env, NO_COLOR: '1' },
  })
  assert.equal(
    r.status,
    0,
    `check.mjs ${flags.join(' ')} --dry-run exited ${r.status}: ${r.stderr}`,
  )
  const labels = (word: string) =>
    [...r.stdout.matchAll(new RegExp(`^ {2}${word} +(\\S.*?)\\s*$`, 'gm'))].map((m) => m[1] ?? '')
  return { run: labels('would run'), skipped: labels('skipped'), out: r.stdout }
}

function assertNeedsSlice(dir: string, what: string) {
  const r = spawnSync(process.execPath, ['scripts/check.mjs', '--changed', '--dry-run'], {
    cwd: dir,
    encoding: 'utf8',
    env: { ...process.env, NO_COLOR: '1' },
  })
  assert.notEqual(r.status, 0, `${what} was accepted without named tests`)
  assert.match(`${r.stdout}${r.stderr}`, /--slice/, `${what} did not explain the targeted mode`)
}

test('S-177. a change under packages/ must name slice tests instead of silently running none', () => {
  const dir = scratch()
  write(dir, 'packages/pipeline/src/stage.ts', 'export const stage = 2\n')
  assertNeedsSlice(dir, 'a change under packages/')
  const chosen = dryRun(dir, '--slice', 'tests/stage.test.ts')
  assert.ok(chosen.run.includes('slice tests'), `slice test was not selected:\n${chosen.out}`)
  assert.ok(chosen.skipped.includes('tests'), `the aggregate suite was not skipped:\n${chosen.out}`)
})

test('S-177. every changed test file must be named by --slice', () => {
  const dir = scratch()
  write(dir, 'tests/stage.test.ts', "import { test } from 'node:test'\ntest('x', () => {})\n")
  assertNeedsSlice(dir, 'a change under tests/')
  const selected = dryRun(dir, '--slice', 'tests/stage.test.ts')
  assert.ok(selected.run.includes('slice tests'), `changed test was not selected:\n${selected.out}`)
  const omitted = spawnSync(
    process.execPath,
    ['scripts/check.mjs', '--slice', 'tests/missing.test.ts'],
    {
      cwd: dir,
      encoding: 'utf8',
      env: { ...process.env, NO_COLOR: '1' },
    },
  )
  assert.notEqual(omitted.status, 0, 'a changed test omitted from --slice was accepted')
})

test('S-177. an unknown path fails closed, beside documents or alone', () => {
  const dir = scratch()
  write(dir, 'stray.bin', 'other bytes\n')
  assertNeedsSlice(dir, 'an unrecognised path')

  write(dir, 'JOURNAL.md', '# Journal\n\nan entry\n')
  assertNeedsSlice(dir, 'an unrecognised path beside a document')
})

test('S-177. checker and workspace tooling changes fail closed to the full suite', () => {
  const dir = scratch()
  write(dir, 'scripts/check.mjs', `${readFileSync(join(REPO, 'scripts', 'check.mjs'), 'utf8')}\n`)
  const result = spawnSync(
    process.execPath,
    ['scripts/check.mjs', '--slice', 'tests/stage.test.ts'],
    {
      cwd: dir,
      encoding: 'utf8',
      env: { ...process.env, NO_COLOR: '1' },
    },
  )
  assert.notEqual(result.status, 0, 'a checker change was accepted for targeted verification')
  assert.match(`${result.stdout}${result.stderr}`, /full check/)
})

test('S-193. Markdown anywhere is a document: prose outside docs/ no longer costs the full suite', () => {
  const dir = scratch()
  // Each of these used to be an unclassified path, so a sentence of English failed --changed
  // closed to the whole suite. None of them is executed by anything.
  write(dir, '.claude/agents/check-runner.md', '# an agent\n\nprose\n')
  write(dir, '.claude/skills/checks/SKILL.md', '# a skill\n\nprose\n')
  write(dir, 'packages/pipeline/README.md', '# a package\n\nprose\n')
  const chosen = dryRun(dir, '--changed')
  assert.deepEqual(
    [...chosen.run].sort(),
    ['copied docs', 'decisions pin', 'markup changed', 'scans'],
    `Markdown outside docs/ did not choose the document checks:\n${chosen.out}`,
  )
  for (const label of ['typecheck', 'code', 'boundaries', 'boundaries proven', 'tests']) {
    assert.ok(chosen.skipped.includes(label), `${label} was not skipped:\n${chosen.out}`)
  }

  // A file that executes still fails closed, whatever prose sits beside it.
  const other = scratch()
  write(other, '.claude/settings.json', '{}\n')
  const refused = spawnSync(process.execPath, ['scripts/check.mjs', '--changed', '--dry-run'], {
    cwd: other,
    encoding: 'utf8',
    env: { ...process.env, NO_COLOR: '1' },
  })
  assert.notEqual(refused.status, 0, 'a settings change was treated as a document')
  assert.match(`${refused.stdout}${refused.stderr}`, /a path of code: \.claude\/settings\.json/)
})

test('S-192. the two-pool runner and its classes are checker tooling: no slice may carry them', () => {
  // The pool sizes and the split decide WHAT runs beside what; a targeted run that accepted a
  // change to either would be verifying the suite with the scheduler under test.
  for (const file of ['scripts/run-tests.mjs', 'scripts/_pools.mjs']) {
    const dir = scratch()
    write(dir, file, '// changed\n')
    const result = spawnSync(
      process.execPath,
      ['scripts/check.mjs', '--slice', 'tests/stage.test.ts'],
      { cwd: dir, encoding: 'utf8', env: { ...process.env, NO_COLOR: '1' } },
    )
    const out = `${result.stdout}${result.stderr}`
    assert.notEqual(result.status, 0, `${file} was accepted for targeted verification:\n${out}`)
    // Named as verification infrastructure, not merely caught by the blanket scripts/ rule: the
    // listing is what keeps a scheduler change from ever resting on a targeted run.
    assert.match(out, /changes verification infrastructure; run the full check/)
  }
})

test('S-177. an untracked source file still requires named tests', () => {
  const dir = scratch()
  write(dir, 'packages/pipeline/src/new-stage.ts', 'export const next = 1\n')
  assertNeedsSlice(dir, 'an untracked file under packages/')
})

test('S-177. code moved under docs/ is seen as both paths and requires named tests', () => {
  const dir = scratch()
  // A rename is listed by its new name alone unless renames are turned off, and this one's new
  // name is a document.
  git(dir, 'mv', 'packages/pipeline/src/stage.ts', 'docs/stage.md')
  assertNeedsSlice(dir, 'a rename from packages/ into docs/')
})

test('S-159. a change of documents only chooses the formatting, the scans and the authority, and no check of code', () => {
  const dir = scratch()
  write(dir, 'docs/notes.md', '# Notes\n\nmore\n')
  write(dir, 'JOURNAL.md', '# Journal\n\nan entry\n')
  write(dir, 'PROMPTS/052-next.md', '# 052\n')

  const all = dryRun(dir).run
  const chosen = dryRun(dir, '--changed')
  assert.deepEqual(
    [...chosen.run].sort(),
    ['copied docs', 'decisions pin', 'markup changed', 'scans'],
    `documents chose:\n${chosen.out}`,
  )
  for (const label of ['typecheck', 'code', 'boundaries', 'boundaries proven', 'tests']) {
    assert.ok(chosen.skipped.includes(label), `documents did not skip ${label}:\n${chosen.out}`)
  }
  // Every check of the full run is either run or said to be skipped: none is dropped unsaid.
  // S-189: `markup changed` IS the full run's `markup` step, narrowed to the files that differ.
  assert.deepEqual(
    [
      ...chosen.run
        .map((label) => (label === 'markup changed' ? 'markup' : label))
        .filter((label) => label !== 'scans'),
      ...chosen.skipped,
    ].sort(),
    [...all].sort(),
  )
})

test('S-177. modes cannot be combined', () => {
  const dir = scratch()
  const r = spawnSync(process.execPath, ['scripts/check.mjs', '--changed', '--code'], {
    cwd: dir,
    encoding: 'utf8',
    env: { ...process.env, NO_COLOR: '1' },
  })
  assert.notEqual(r.status, 0, 'check.mjs --changed --code was accepted')
  assert.match(r.stderr, /choose one mode/)
})

// ---------------------------------------------------------------- S-189. the markup check

test('S-189. a slice narrows the markup check to the markup that differs, and drops it when none does', () => {
  // prettier over all 126 markup files is 8.7 s; over two of them, 0.26 s (measured 2026-10-15).
  // The narrowing must be visible as a step, and its absence must be printed as a skip — a check
  // that quietly disappears is the failure mode this whole file exists to prevent.
  const code = scratch()
  write(code, 'packages/pipeline/src/stage.ts', 'export const stage = 2\n')
  const codeOnly = dryRun(code, '--slice', 'tests/stage.test.ts')
  assert.ok(
    !codeOnly.run.some((label) => label.startsWith('markup')),
    `a code-only slice ran a markup check over nothing:\n${codeOnly.out}`,
  )
  assert.ok(
    codeOnly.skipped.includes('markup'),
    `the markup check vanished without being named:\n${codeOnly.out}`,
  )

  const withDoc = scratch()
  write(withDoc, 'packages/pipeline/src/stage.ts', 'export const stage = 2\n')
  write(withDoc, 'docs/notes.md', '# Notes\n\nchanged\n')
  const narrowed = dryRun(withDoc, '--slice', 'tests/stage.test.ts')
  assert.ok(
    narrowed.run.includes('markup changed'),
    `a changed document was not checked:\n${narrowed.out}`,
  )
})

test('S-189. the full run and --documents check ALL the markup, named file by file', () => {
  // A glob is not enough: `**/*.yml` matches nothing here and prettier exits 2 on that, so the
  // step would be red for a reason that is not a finding. And a journey resting on a recorded run
  // has a clean tree, so narrowing `--documents` to what differs from HEAD would check nothing.
  const dir = scratch()
  assert.ok(dryRun(dir).run.includes('markup'), 'the full run skipped the markup check')
  assert.ok(
    dryRun(dir, '--documents').run.includes('markup'),
    '--documents skipped the markup check',
  )
  // And what it names must be files that exist, not a pattern. A scratch repository cannot run
  // the real step — `bin()` looks for prettier inside the repository being checked — so the
  // enumeration is asked directly, here, where prettier does live.
  const named = allMarkup(REPO)
  assert.ok(named.length > 20, `only ${named.length} markup file(s) named for the full run`)
  for (const path of named) {
    assert.match(path, MARKUP_EXTENSIONS, `${path} is not markup`)
    assert.doesNotMatch(path, /[*?]/, `${path} is a pattern, and prettier exits 2 on an empty one`)
    assert.ok(existsSync(join(REPO, path)), `${path} does not exist`)
  }
  assert.ok(
    named.includes('CLAUDE.md') && named.includes('pnpm-workspace.yaml'),
    'the enumeration misses Markdown at the root or the workspace YAML',
  )
})
