import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { basename, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { readSettings } from '@cutroom/service'
import { REPO } from './_repo.ts'

// paid-path, Slice 8 — check 20 (docs/features/paid-path.md): no test file and no step of
// check.mjs names scripts/real-reel.mjs; reel-takes' check 26 and reel-render's check 50 keep
// their exact form and stay green, with every default 'fake' (S-111).
//
// WHY THIS IS A CHECK AT ALL. `scripts/real-reel.mjs` is the only thing in this repository that
// spends money. S-111's whole arrangement — recorded wire in the suite, one hand-run reel outside
// it — rests on that script being unreachable from anything automatic: a suite that could reach it
// is a suite that spends, and four verified features' Gate 1 says nothing may cost money, read a
// secret or leave this machine. So the property is held by a test rather than remembered.
//
// THIS FILE NAMES THE SCRIPT, and no other test file may. That is check 50's own shape — it
// excludes its own file from the suite it runs, because the file that asserts a property about a
// set of files is necessarily in that set. What this file does with the name is read source; it
// starts no process and imports no script, which the last test here asserts of itself.

const OWN = basename(fileURLToPath(import.meta.url))

/** The one script that spends (S-111, Gate 3's file list). */
const SCRIPT = 'scripts/real-reel.mjs'
const SCRIPT_FILE = basename(SCRIPT)

/** The two PATH-alone children of verified features, which this feature must leave exactly as they are. */
const PATH_ALONE = [
  ['reel-takes-secrets.test.ts', 26],
  ['reel-render-secrets.test.ts', 50],
] as const

const read = (rel: string) => readFileSync(join(REPO, rel), 'utf8')

const testFiles = () =>
  readdirSync(join(REPO, 'tests'))
    .filter((f) => f.endsWith('.test.ts'))
    .sort()

// ---------------------------------------------------------------- 20

test('20. no test file but this one names the script that spends', () => {
  const offenders: string[] = []
  for (const file of testFiles()) {
    if (file === OWN) continue
    const source = read(join('tests', file))
    if (source.includes(SCRIPT_FILE) || source.includes('real-reel')) offenders.push(file)
  }
  assert.deepEqual(
    offenders,
    [],
    `a test file names ${SCRIPT}, which is the only thing here that spends money (S-111)`,
  )

  // And every helper the tests share, since a test reaches the script just as well through one.
  const helpers: string[] = []
  for (const dir of ['engine', 'stand-in', 'fixtures']) {
    let entries: string[]
    try {
      entries = readdirSync(join(REPO, 'tests', dir), { recursive: true }) as string[]
    } catch {
      continue
    }
    for (const entry of entries) {
      if (!/\.(m|c)?(t|j)s$/.test(entry)) continue
      if (read(join('tests', dir, entry)).includes('real-reel')) helpers.push(`${dir}/${entry}`)
    }
  }
  assert.deepEqual(helpers, [], `a test helper names ${SCRIPT}`)
})

test('20. this file only READS the script: it starts no process and imports nothing of it', () => {
  const own = read(join('tests', OWN))

  // A check that ran what it is guarding would be the failure it exists to prevent. Its IMPORTS
  // are read rather than its whole text, because the text necessarily names what it forbids.
  const imports = [...own.matchAll(/^import .*$/gm)].map((m) => m[0])
  assert.ok(imports.length > 0, 'check 20 imports nothing at all, so this asserts nothing')
  assert.deepEqual(
    imports.filter((line) => /child_process|real-reel|@cutroom\/providers/.test(line)),
    [],
    "check 20's own file imports something that could run the script, or an adapter",
  )

  // And no call site starts a process, however it was imported.
  assert.deepEqual(
    [...own.matchAll(/\b(spawn|spawnSync|execFile|execFileSync|exec|fork)\s*\(/g)].map((m) => m[0]),
    [],
    "check 20's own file starts a process",
  )

  // It is read as bytes, from the repository's own root, and nothing is run.
  assert.ok(own.includes('readFileSync'), 'check 20 reads no source at all')
})

test('20. no step of check.mjs, and no script a step runs, names the script that spends', () => {
  const check = read(join('scripts', 'check.mjs'))
  assert.ok(check.includes('scripts/drift.mjs'), 'check.mjs no longer names the steps it runs')
  assert.ok(!check.includes('real-reel'), `a step of check.mjs names ${SCRIPT}`)

  // Every other script in the folder, so the property survives a step being moved into one of
  // them — `journey.mjs` most of all, since a journey runs every check this repository has.
  const offenders = readdirSync(join(REPO, 'scripts'))
    .filter((f) => f.endsWith('.mjs') && f !== SCRIPT_FILE)
    .filter((f) => read(join('scripts', f)).includes('real-reel'))
  assert.deepEqual(offenders, [], `a script check.mjs can reach names ${SCRIPT}`)
})

test('20. the script that spends exists, waits for a confirmation before it submits, and submits once', () => {
  const source = read(SCRIPT)

  // The order is the whole point: the estimate is printed, then a confirmation is read, then one
  // request is submitted. A script that submitted first would have spent before anyone read a
  // figure, and the estimate would be a receipt rather than a decision.
  //
  // Each position is a PIECE OF CODE and never a heading or a word in a comment: the first
  // version of this test looked for the printed heading, and a break that changed the heading
  // while leaving the section comment above it went uncaught — the comment satisfied the search.
  const at = (marker: string) => {
    const found = [
      ...source.matchAll(new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')),
    ]
      .map((m) => m.index)
      .filter((i) => !/^\s*(\/\/|\*|\/\*)/.test(source.slice(source.lastIndexOf('\n', i) + 1, i)))
    return found[0] ?? -1
  }
  const computed = at('corners(settings.planSettings)')
  const printed = at('${low.cents}c to ${high.cents}c')
  const confirmed = at('createInterface({ input: process.stdin })')
  const submitted = at("method: 'POST'")
  assert.ok(computed > 0, 'the script computes no estimate')
  assert.ok(printed > 0, 'the script prints no estimate')
  assert.ok(confirmed > 0, 'the script waits for no confirmation')
  assert.ok(submitted > 0, 'the script submits nothing')
  assert.ok(computed < printed, 'the script prints an estimate it has not computed')
  assert.ok(printed < confirmed, 'the script confirms before it has printed the estimate')
  assert.ok(confirmed < submitted, 'the script submits before it has been confirmed')

  // Exactly one submit, and THE BODY IT SUBMITS carries the ceiling. `/budgetCents/` over the
  // whole file is satisfied by the parameter's own name, which is how a break that dropped it
  // from the request's options first went uncaught.
  assert.equal(
    source.split("method: 'POST'").length - 1,
    1,
    'the script makes more than one POST, and one run is one reel (S-110)',
  )
  assert.match(
    source,
    /options:\s*\{[^}]*\bbudgetCents\b[^}]*\}/,
    'the request the script submits carries no ceiling (D-100)',
  )
  assert.match(
    source,
    /request\(requestId,\s*ceiling\)/,
    'the ceiling the script printed is not the one it submits',
  )

  // THE CEILING IS A CONSTANT `--ceiling` CAN ONLY LOWER (S-128). The owner set 250¢ on
  // 2026-09-21, above the estimate so one retake does not stop a run with money already spent and
  // below BUDGET.md's cap. A ceiling an argument could RAISE is a ceiling an accident can raise,
  // so the argument is bounded by the constant rather than compared with anything else.
  assert.match(source, /const CEILING_CENTS = 250\b/, 'the script names no ceiling of its own')
  assert.match(
    source,
    /ceiling > CEILING_CENTS/,
    'the script does not bound --ceiling by the ceiling the owner set',
  )

  // It names no key, which is what `drift`'s key scan holds over the whole of `scripts/` (S-109).
  assert.doesNotMatch(
    source,
    /\benv\s*(?:\.\s*|\[\s*['"])[A-Za-z_$][\w$]*_(API_KEY|KEY|TOKEN|SECRET)\b/,
    'the script reads a key, and only packages/providers may (S-109)',
  )
})

test("20. reel-takes' check 26 and reel-render's check 50 keep their exact form", () => {
  for (const [file, number] of PATH_ALONE) {
    const source = read(join('tests', file))
    const what = `${file} (check ${number})`

    // Unconditional. A check behind a flag is skipped when the flag is absent, and a skipped test
    // reads as coverage — which is the arrangement S-111 rejected outright.
    assert.match(source, new RegExp(`\\btest\\(\\s*['"\`]${number}\\.`), `${what} is not a test`)
    assert.ok(!/\btest\.skip\b|\btest\.todo\b|\bskip:\s*true/.test(source), `${what} can skip`)

    // The environment it hands the child is PATH and nothing else, and it reads back what the
    // child actually holds rather than trusting the object it passed (S-028).
    assert.match(source, /\{\s*PATH:/, `${what} no longer hands its child a bare PATH`)
    assert.match(
      source,
      /process\.stdout\.write\(JSON\.stringify\(process\.env\)\)/,
      `${what} no longer probes the child`,
    )
    assert.match(source, /canary/, `${what} sets no canary`)

    // And it still demands a clean run: nothing failed, nothing was cancelled, skipped or todo.
    for (const kind of ['fail', 'cancelled', 'skipped', 'todo']) {
      assert.match(
        source,
        new RegExp(`count\\('${kind}'\\),\\s*0`),
        `${what} no longer requires zero ${kind}`,
      )
    }
  }
})

test("20. every provider default is 'fake', so the two PATH-alone children need no key", () => {
  // S-108's defaults, read from the settings a service started with nothing would read. This is
  // what makes checks 26 and 50 unconditional: their children run the whole journey, and a journey
  // whose ports defaulted to a real adapter would need a key in an environment that holds PATH.
  const settings = readSettings({})
  assert.deepEqual(settings.providers, {
    model: 'fake',
    image: 'fake',
    sensor: 'fake',
    video: 'fake',
    narration: 'fake',
  })
  // And nothing a stand-in run renders with costs anything or names a vendor.
  assert.equal(settings.renderSettings.voice, 'stand-in', 'a stand-in run names a real voice')
})
