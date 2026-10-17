/**
 * The verification receipt: what a check run observed, bound to the content it observed.
 *
 * S-188. A full run writes a receipt naming the tree it tested, every check's verdict, and every
 * test file's result. A later journey at that same content reads the receipt instead of running
 * the suite again — exactly, or when the only paths that differ are documents, in which case the
 * document-class checks are re-run live and the rest is reused.
 *
 * The tested tree is the content, not the commit: a run on a dirty tree records the tree object
 * `git add -A` would commit, so the receipt still matches after that content is committed.
 */
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { run, setting } from './_lib.mjs'

export const RECEIPT_VERSION = 1

/** Markdown this repository keeps. The only class whose change a document check can turn red. */
/**
 * What counts as a document: **any Markdown file, wherever it lives** (S-193). It used to be three
 * named places, so prose outside them — an agent's description under `.claude/agents/`, a skill's
 * `SKILL.md`, a package README — was an unclassified path and `--changed` failed closed to the full
 * suite for a sentence of English. Nothing executes a `.md` file here: the four file scans still
 * read every one of them for line endings and absolute paths, `feature-files` still reads the
 * `Gates:` and `Status:` lines it governs, `docs-check` still compares the copied authority, and
 * all of those run in the document set. A Markdown change therefore still has checks it can fail;
 * it just no longer runs the suite of code it cannot affect.
 */
export const DOCUMENT = [/\.md$/]

export const isDocument = (path) => DOCUMENT.some((re) => re.test(path))

/** One setting, defaulting inside the repository being checked, never an absolute path (D-086). */
export const verificationName = () => setting('CUTROOM_VERIFICATION_DIR') ?? '.verification'
export const verificationDir = (cwd) => join(cwd, verificationName())
export const receiptPath = (cwd) => join(verificationDir(cwd), 'receipt.json')
/**
 * The last FULL run keeps a file of its own, because only a full run is reusable and the ordinary
 * order destroys it otherwise: a journey writes an evidence line, the documents-only `--changed`
 * run before its commit writes a receipt of its own, and the next journey would find a non-full
 * record where the full one had been — labelled `documents` then, `targeted` since S-213.
 * Measured here, 2026-10-15, on the first real
 * use — one `--changed` run between two journeys took the reuse away.
 */
export const fullReceiptPath = (cwd) => join(verificationDir(cwd), 'receipt-full.json')
export const testsRawPath = (cwd) => join(verificationDir(cwd), 'tests.json')
/** The recorded impact map: which test files cover which source files (S-196). */
export const impactPath = (cwd) => join(verificationDir(cwd), 'impact.json')

/**
 * Make the receipt's folder, holding a `.gitignore` of `*` so it ignores itself and everything in
 * it — including that file. Nothing generated here can then reach a tree, an index or a status,
 * whatever the repository being checked ignores.
 */
export function ensureVerificationDir(cwd) {
  const dir = verificationDir(cwd)
  mkdirSync(dir, { recursive: true })
  const ignore = join(dir, '.gitignore')
  if (!existsSync(ignore)) writeFileSync(ignore, '*\n')
  return dir
}

function git(cwd, args, env) {
  const result = run('git', args, {
    cwd,
    env: env === undefined ? process.env : { ...process.env, ...env },
  })
  return result.ok ? result.stdout.trim() : undefined
}

/**
 * What differs from HEAD, as `git status --porcelain` says it, with the receipt's own folder left
 * out: it is generated, it is never committed, and its presence must not read as a dirty tree.
 * Returns undefined when git cannot say.
 */
export function workingTreeDirt(cwd) {
  const result = run(
    'git',
    ['status', '--porcelain', '--', '.', `:(exclude)${verificationName()}`],
    { cwd },
  )
  return result.ok ? result.stdout.trim() : undefined
}

/**
 * The tree object holding exactly the content the checks are about to see: HEAD's tree when the
 * working tree is clean, and what a commit of everything would write when it is not. Written
 * through a throwaway index, so the repository's own index is untouched.
 */
export function testedTree(cwd) {
  const head = git(cwd, ['rev-parse', 'HEAD^{tree}'])
  if (head === undefined) return undefined
  const dirty = workingTreeDirt(cwd)
  if (dirty === undefined) return undefined
  if (dirty === '') return head
  const dir = ensureVerificationDir(cwd)
  const index = join(dir, 'index.tmp')
  rmSync(index, { force: true })
  const env = { GIT_INDEX_FILE: index }
  if (git(cwd, ['read-tree', 'HEAD'], env) === undefined) return undefined
  // A plain `add -A`: the folder keeps itself out of the index by holding its own `.gitignore`
  // (see ensureVerificationDir), which works in a repository that ignores it and in one that does
  // not. A `:(exclude)` pathspec does not — git then reports the folder as an explicitly named
  // ignored path and exits 1, which is how this recorded nothing here while every scratch fixture
  // passed, the scratch repositories having no .gitignore at all.
  if (git(cwd, ['add', '-A'], env) === undefined) return undefined
  const tree = git(cwd, ['write-tree'], env)
  rmSync(index, { force: true })
  return tree
}

/**
 * The paths that differ between two tree objects, or undefined when git cannot say. The receipt's
 * own folder is left out for the same reason it is left out of the dirt: it is generated, and a
 * repository that happens to track it must not thereby lose every reuse.
 */
export function treeDelta(cwd, from, to) {
  const result = run(
    'git',
    [
      'diff',
      '--name-only',
      '--no-renames',
      '-z',
      from,
      to,
      '--',
      '.',
      `:(exclude)${verificationName()}`,
    ],
    { cwd },
  )
  if (!result.ok) return undefined
  return result.stdout.split('\0').filter(Boolean).sort()
}

/** Per-file results as the receipt reporter wrote them, or undefined when there are none. */
export function readTestsRaw(cwd) {
  try {
    const parsed = JSON.parse(readFileSync(testsRawPath(cwd), 'utf8'))
    return parsed && typeof parsed === 'object' && parsed.files ? parsed : undefined
  } catch {
    return undefined
  }
}

export function writeReceipt(cwd, receipt) {
  ensureVerificationDir(cwd)
  const body = {
    receipt: RECEIPT_VERSION,
    writtenAt: new Date().toISOString(),
    commit: git(cwd, ['rev-parse', 'HEAD']),
    ...receipt,
  }
  const text = `${JSON.stringify(body, null, 2)}\n`
  writeFileSync(receiptPath(cwd), text)
  // Only a GREEN full run touches the full receipt, so a targeted run after it — a slice, or the
  // documents-only run that records the four scans (S-212) — cannot take a journey's reuse away,
  // and neither can a full run that failed: a red record in that file would throw away the green
  // one it replaces, and nothing may be reused from it anyway (S-214). A carried run writes it,
  // because carried evidence IS full evidence for this content and the next journey rests on it.
  if (body.mode === 'full' && body.ok === true) writeFileSync(fullReceiptPath(cwd), text)
  return body
}

/**
 * The verification trailer a commit of the content this run saw must carry, derived from the run
 * instead of typed (S-213).
 *
 * `full` evidence names the tree alone: the suite ran, every file of it. `targeted` evidence must
 * also name the test files that ran — `verification-status.mjs` refuses it otherwise — and for a
 * documents-only run those are the four scans (S-212). Returns undefined rather than a trailer the
 * recorder would reject: a `code` run is evidence of nothing a commit may claim, a run with no
 * tree names no content, and targeted evidence with no test file is exactly what that recorder
 * fails on.
 *
 * A carried run's trailer is the ordinary `full` one and gains no extra line (S-214, the owner's
 * call): the suite DID run, on this content's code, and only Markdown was written after it. Where
 * it ran is in the receipt's `carriedFrom`, which costs nothing and is read by whoever is
 * diagnosing rather than by every commit.
 */
export function evidenceTrailer({ mode, tree, tests }) {
  if (mode !== 'full' && mode !== 'targeted') return undefined
  if (typeof tree !== 'string' || tree === '') return undefined
  const lines = [`Verification: ${mode}`, `Verification-Tree: ${tree}`]
  if (mode === 'full') return lines.join('\n')
  const named = (tests ?? []).filter((test) => typeof test === 'string' && test !== '')
  if (named.length === 0) return undefined
  return [...lines, `Verification-Tests: ${named.join(' ')}`].join('\n')
}

/**
 * Whether the evidence of a recorded full run may be CARRIED to the content being checked now, and
 * what that content still owes (S-214).
 *
 *   carry  every path that differs from the tree that run tested is a document: the code the suite
 *          ran IS the code here, so the document-class checks run live and nothing else does
 *   none   `why` says what disqualified the recorded run
 *
 * This is the same inference S-188 already lets a journey make, pointed at the content being
 * committed rather than at HEAD — which is what removes the second suite. A finished piece of work
 * always grows prose after the run that verified it: a journey's own verdict, the journal, this
 * repository's context file. None of it can change what the suite observed, and until this existed
 * every line of it cost 617 s or a trailer naming four scans for a commit full of code.
 *
 * The carried run's own test rows come back with the verdict, because a receipt that claims `full`
 * must say which test files passed or no later journey can rest on it.
 */
export function carryVerdict({ receipt, contentTree, delta }) {
  const no = (why) => ({ kind: 'none', why })
  if (receipt === undefined) return no('no recorded full run')
  if (receipt.receipt !== RECEIPT_VERSION) return no(`receipt version ${receipt.receipt}`)
  if (receipt.mode !== 'full') return no(`recorded run was '${receipt.mode}', not a full run`)
  if (receipt.ok !== true) return no('the recorded run was not green')
  const tests = receipt.tests
  if (
    tests === undefined ||
    tests.ok !== true ||
    typeof tests.files !== 'object' ||
    tests.files === null
  ) {
    return no('the recorded run records no passing test run')
  }
  if (typeof receipt.testedTree !== 'string' || receipt.testedTree === '')
    return no('the receipt names no tree')
  if (typeof contentTree !== 'string' || contentTree === '')
    return no('git could not name this content')
  if (delta === undefined) return no('git could not compare the trees')
  const code = delta.find((path) => !isDocument(path))
  if (code !== undefined) return no(`${code} differs from the recorded run`)
  return { kind: 'carry', from: receipt.testedTree, tree: contentTree, delta, tests }
}

function read(path) {
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8'))
    return parsed && typeof parsed === 'object' ? parsed : undefined
  } catch {
    return undefined
  }
}

/** The last run of any mode: what a human or a diagnostic reads. */
export const readReceipt = (cwd) => read(receiptPath(cwd))
/** The last FULL run: the only record a journey may rest on. */
export const readFullReceipt = (cwd) => read(fullReceiptPath(cwd))

/**
 * Whether a journey at `headTree` may rest on `receipt`, and what it must still run.
 *
 *   exact      nothing differs: no check runs
 *   documents  only documents differ: the document-class checks run, the rest is reused
 *   none       run the full suite, and `why` says what disqualified the receipt
 *
 * `testFiles` are the feature's own test files, repository-relative. Every one of them must be in
 * the receipt with at least one passing test and no failure, or the recorded run says nothing
 * about this feature and cannot stand in for its journey.
 */
export function reuseVerdict({ receipt, headTree, delta, testFiles }) {
  const no = (why) => ({ kind: 'none', why })
  if (receipt === undefined) return no('no receipt')
  if (receipt.receipt !== RECEIPT_VERSION) return no(`receipt version ${receipt.receipt}`)
  if (receipt.mode !== 'full') return no(`recorded run was '${receipt.mode}', not a full run`)
  if (receipt.ok !== true) return no('the recorded run was not green')
  if (typeof receipt.testedTree !== 'string' || receipt.testedTree === '')
    return no('the receipt names no tree')
  const tests = receipt.tests
  if (
    tests === undefined ||
    tests.ok !== true ||
    typeof tests.files !== 'object' ||
    tests.files === null
  ) {
    return no('the receipt records no passing test run')
  }
  if (headTree === undefined) return no('git could not name the tree at HEAD')
  if (delta === undefined) return no('git could not compare the trees')
  let total = 0
  for (const file of testFiles) {
    const row = tests.files[file]
    if (row === undefined) return no(`the recorded run does not name ${file}`)
    if (row.fail > 0) return no(`${file} failed in the recorded run`)
    if (!(row.pass > 0)) return no(`${file} ran no test in the recorded run`)
    total += row.pass
  }
  if (delta.length === 0) return { kind: 'exact', total, tree: receipt.testedTree }
  const code = delta.find((path) => !isDocument(path))
  if (code !== undefined) return no(`${code} differs from the recorded run`)
  return { kind: 'documents', total, tree: receipt.testedTree, delta }
}
