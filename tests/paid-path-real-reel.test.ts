import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
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

  // AMENDED BY resume-failed, Slice 6 (S-163): the file that names the spending script can never
  // be handed a way to start it. Every LOCAL MODULE — a path starting with `./` or `../` — is read
  // for `child_process`, because a local module that imports `child_process` is one the test could
  // be tricked into importing and would then have a way to spend. The specifier is resolved
  // relative to this file's directory, not the repository root.
  const ownDir = join(REPO, 'tests')
  const importRe = /from\s+['"]([^'"]+)['"]/
  const localImports = imports
    .map((line) => (importRe.test(line) ? line.match(importRe)?.[1] : undefined))
    .filter((specifier): specifier is string => specifier !== undefined)
    .filter((specifier) => specifier.startsWith('./') || specifier.startsWith('../'))
  for (const specifier of localImports) {
    const candidates = [
      join(ownDir, specifier),
      join(ownDir, `${specifier}.ts`),
      join(ownDir, specifier, 'index.ts'),
    ]
    const resolved = candidates.find((p) => existsSync(p))
    assert.ok(resolved !== undefined, `could not resolve ${specifier}`)
    const source = readFileSync(resolved, 'utf8')
    assert.ok(
      !/\b(child_process|node:child_process)\b/.test(source),
      `check 20 imports ${specifier}, which imports child_process — a path to start the script`,
    )
  }

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
  // AMENDED BY resume-failed, Slice 6 (S-162, S-163): with one `post()` helper, `confirmed` is
  // re-pointed to the reel's own gate — the one comparing `confirmation(ceiling)` — and
  // `submitted` to the SUBMIT call site. The order check keeps "the estimate is printed, then the
  // gate, then the submit" — but the gate is now a piece of code rather than a stream read, and
  // the submit is a single `post('/v1/runs', ...)` rather than a `fetch` literal.
  const computed = at('corners(settings.planSettings)')
  const printed = at('${low.cents}c to ${high.cents}c')
  const confirmed = at('!== confirmation(ceiling)')
  const submitted = at("post('/v1/runs', request(requestId, ceiling))")
  assert.ok(computed > 0, 'the script computes no estimate')
  assert.ok(printed > 0, 'the script prints no estimate')
  assert.ok(confirmed > 0, 'the script waits for no confirmation')
  assert.ok(submitted > 0, 'the script submits nothing')
  assert.ok(computed < printed, 'the script prints an estimate it has not computed')
  assert.ok(printed < confirmed, 'the script confirms before it has printed the estimate')
  assert.ok(confirmed < submitted, 'the script submits before it has been confirmed')

  // Exactly one POST, and it lives inside `function post(`. The slice keeps paid-path check 20's
  // "the script makes more than one POST" rule honest: a second `method: 'POST'` outside the
  // helper's body is a second POST site, and one run is one reel (S-110). Comments don't count —
  // a comment can name the substring `method: 'POST'` to describe the rule (as the slice's header
  // does) without being a POST site. The `at()` filter above is the same one.
  const postPositions = [...source.matchAll(/method:\s*'POST'/g)]
    .map((m) => m.index ?? -1)
    .filter((i) => !/^\s*(\/\/|\*|\/\*)/.test(source.slice(source.lastIndexOf('\n', i) + 1, i)))
  assert.equal(
    postPositions.length,
    1,
    `the script has ${postPositions.length} method: 'POST' tokens; one POST per reel (S-110)`,
  )
  const postStart = source.indexOf('function post(')
  assert.ok(postStart > 0, 'the script does not name its POST helper')
  // Find the END of `function post(...)` by scanning forward — every `function post(` is closed by
  // a matching `}` at column 1, which a single-purpose helper reaches on the line that ends it.
  const postEnd = source.indexOf('\n}\n', postStart)
  assert.ok(postEnd > postStart, 'the POST helper is not a function')
  assert.ok(
    postPositions[0] !== undefined && postPositions[0] > postStart && postPositions[0] < postEnd,
    "`method: 'POST'` lives outside `function post(` — every POST goes through the helper",
  )

  // The SUBMIT is the one `post('/v1/runs', ...)` call. `request(requestId, ceiling)` is the body's
  // shape — `requestId` and `ceiling` are the two arguments admission sees (S-110).
  assert.equal(
    source.split("post('/v1/runs', request(requestId, ceiling))").length - 1,
    1,
    'the script submits through one call only',
  )

  // The PREVIEW is a literal `{ preview: true }` body, posted once, to a resume route (S-162).
  // The slice keeps the preview post count exactly one.
  const previewPositions = [
    ...source.matchAll(/post\(`\/v1\/runs\/\$\{runId\}\/resume`,\s*\{\s*preview:\s*true\s*\}\)/g),
  ].map((m) => m.index ?? -1)
  assert.equal(
    previewPositions.length,
    1,
    `the script posts ${previewPositions.length} preview requests; one preview per resume`,
  )
  // The literal `{ preview: true }` appears exactly once. Built objects would elude this assertion
  // because the substring would not appear verbatim.
  assert.equal(
    source.split('{ preview: true }').length - 1,
    1,
    '`{ preview: true }` is not a literal; spread or build makes it a variable body',
  )

  // The RESUME body has NO `preview` key. The same resume route, two call sites — the PREVIEW
  // (with `preview: true`) and the paid RESUME (without). The slice forbids a `preview:` token on
  // the resume call site — a `preview: true` on the paid body would put the request back in
  // preview mode, and the engine would never write a new run.
  const resumePosts = [
    ...source.matchAll(/post\(`\/v1\/runs\/\$\{runId\}\/resume`,\s*([\s\S]*?)\)/g),
  ]
  assert.equal(
    resumePosts.length,
    2,
    `the script has ${resumePosts.length} resume posts; one preview and one paid`,
  )
  // Exactly one of the two resume posts has `preview: true` (the PREVIEW); exactly one has none
  // (the RESUME). Together they name the two halves of the route.
  const previewBodies = resumePosts.filter((m) => /\bpreview\s*:/.test(m[1] ?? ''))
  const paidBodies = resumePosts.filter((m) => !/\bpreview\s*:/.test(m[1] ?? ''))
  assert.equal(previewBodies.length, 1, 'the script has no preview post; one preview per resume')
  assert.equal(paidBodies.length, 1, 'the script has no paid resume post; one paid post per resume')

  // Exactly three calls of `post(`. The slice forbids a fourth — a `post(...)` that is not the
  // SUBMIT, the PREVIEW or the RESUME is a way to spend the script cannot reach. Comments and the
  // helper's own definition don't count (the same way the original check treated `method: 'POST'`):
  // the slice's own header describes the rule, and `function post(` is the helper, not a call.
  // The line-before-the-match regex `/^\s*(\/\/|\*|\/\*)/` is the original check's: a `*` at the
  // start of the line is a doc comment, and the match is named in prose, not at a call site.
  const postCalls = [...source.matchAll(/\bpost\s*\(/g)]
    .map((m) => m.index ?? -1)
    .filter((i) => {
      const lineStart = source.lastIndexOf('\n', i) + 1
      const lineEnd = source.indexOf('\n', i)
      const line = source.slice(lineStart, lineEnd === -1 ? source.length : lineEnd)
      if (/^\s*(\/\/|\*|\/\*)/.test(line)) return false
      if (/^\s*function\s+post\s*\(/.test(line)) return false
      return true
    })
  assert.equal(
    postCalls.length,
    3,
    `the script has ${postCalls.length} calls of post(); only the SUBMIT, PREVIEW and RESUME go through it`,
  )

  // One `createInterface` lives in the script's text — the half that reads terminal input into
  // the string `answers()` splits (S-163). A second would be a second reader; a second
  // `readFileSync(0, ...)` would too. Neither is the slice's design.
  const createInterfaceCount = [...source.matchAll(/\bcreateInterface\s*\(/g)]
    .map((m) => m.index ?? -1)
    .filter((i) => {
      const lineStart = source.lastIndexOf('\n', i) + 1
      const lineEnd = source.indexOf('\n', i)
      const line = source.slice(lineStart, lineEnd === -1 ? source.length : lineEnd)
      return !/^\s*(\/\/|\*|\/\*)/.test(line)
    }).length
  assert.equal(
    createInterfaceCount,
    1,
    `the script has ${createInterfaceCount} createInterface calls; one terminal reader is what answers() splits`,
  )

  // Two `!== confirmation(` gates, and the second compares the figure the preview printed —
  // `estimateCents`, the figure the engine compares with the limit (D-097, D-100, S-162). The
  // amendment re-points the FIRST marker to the new-reel gate (above); the second is the resume
  // gate, which is `confirmation(figure)` where `figure = Number(preview.estimateCents)`.
  const gates = [...source.matchAll(/!==\s*confirmation\s*\(/g)]
  assert.equal(
    gates.length,
    2,
    `the script has ${gates.length} !== confirmation() gates; the new reel and the resume each have one`,
  )
  // The preview-printed figure must be passed to the resume gate. A `figure` variable assigned
  // from the preview and used in `confirmation(figure)` is what makes the gate exit before any
  // paid post.
  assert.match(
    source,
    /Number\(preview\.estimateCents\)/,
    'the resume gate does not compare the figure the preview printed',
  )
  assert.match(
    source,
    /confirmation\s*\(\s*figure\s*\)/,
    'the resume gate does not call confirmation(figure)',
  )

  // Source order: [corners, range, gate, SUBMIT] precedes [PREVIEW, gate, RESUME] (or vice versa).
  // The slice keeps both orders legal so a future rewrite does not break the test by moving the
  // new-reel block above the resume block, or the resume block above the new-reel block. The
  // shapes are:
  //   corners   — `corners(settings.planSettings)` (the compute call)
  //   range     — `${low.cents}c to ${high.cents}c` (the printed estimate range)
  //   gate      — `!== confirmation(ceiling)` (the new-reel gate, re-pointed above)
  //   SUBMIT    — `post('/v1/runs', request(requestId, ceiling))` (re-pointed above)
  //   PREVIEW   — `post(\`/v1/runs/${runId}/resume\`, { preview: true })`
  //   gate (2)  — the resume gate, `!== confirmation(figure)` — at the position right before RESUME
  //   RESUME    — `post(\`/v1/runs/${runId}/resume\`, { contractVersion: 1, ... })`
  const previewAt = source.indexOf('preview: true')
  // The resume body opens a brace right after `resume\`,` — whitespace flexible.
  const resumeAt = /resume`,\s*\{\s*contractVersion:\s*1,\s*\.\.\./.test(source)
    ? source.search(/resume`,\s*\{\s*contractVersion:\s*1,\s*\.\.\./)
    : -1
  assert.ok(previewAt > 0, 'the script does not post a preview')
  assert.ok(resumeAt > previewAt, 'the script posts the resume before the preview')

  // makeReel and resumeReel each hold ONE PATH — the route string `post()` is given. A script
  // that calls `post('/v1/runs', ...)` from `resumeReel` has crossed the routes, and the slice
  // forbids it. We slice the source at the function bodies and count `post(...)` calls inside.
  // The closing brace is the one at column 1 — every nested `}` ends an inner block, and the
  // outer function ends with `\n}\n` (or `\n}` at EOF).
  const sliceFunction = (open: string): string => {
    const start = source.indexOf(open)
    assert.ok(start > 0, `the script does not name ${open}`)
    // Walk forward counting braces. Skip braces in strings, template literals, and comments.
    let depth = 0
    let inString: string | null = null
    let i = start
    while (i < source.length) {
      const ch = source[i]
      const prev = i > 0 ? source[i - 1] : ''
      // Skip escapes in strings
      if (inString !== null) {
        if (ch === '\\' && prev !== '\\') {
          i += 2
          continue
        }
        if (ch === inString) inString = null
        i++
        continue
      }
      if (ch === '/' && source[i + 1] === '/') {
        // line comment
        const nl = source.indexOf('\n', i)
        i = nl === -1 ? source.length : nl
        continue
      }
      if (ch === '/' && source[i + 1] === '*') {
        // block comment
        const end = source.indexOf('*/', i + 2)
        i = end === -1 ? source.length : end + 2
        continue
      }
      if (ch === '"' || ch === "'" || ch === '`') {
        inString = ch
        i++
        continue
      }
      if (ch === '{') depth++
      else if (ch === '}') {
        depth--
        if (depth === 0) return source.slice(start, i + 1)
      }
      i++
    }
    throw new Error(`${open} has no closing brace`)
  }
  const makeReelBody = sliceFunction('async function makeReel(')
  const resumeReelBody = sliceFunction('async function resumeReel(')
  assert.equal(
    [...makeReelBody.matchAll(/\bpost\s*\(/g)].length,
    1,
    'makeReel calls post() more than once; only the SUBMIT goes through it',
  )
  assert.match(makeReelBody, /post\(['"`]\/v1\/runs['"`]/)
  assert.doesNotMatch(
    makeReelBody,
    /\/resume/,
    'makeReel calls the resume route; only resumeReel does',
  )
  assert.equal(
    [...resumeReelBody.matchAll(/\bpost\s*\(/g)].length,
    2,
    'resumeReel calls post() the wrong number of times; PREVIEW and RESUME go through it',
  )
  assert.doesNotMatch(
    resumeReelBody,
    /post\(['"`]\/v1\/runs['"`]/,
    'resumeReel calls the submit route; only makeReel does',
  )
  assert.match(resumeReelBody, /\/resume/)

  // Exactly one submit, and THE BODY IT SUBMITS carries the ceiling. `/budgetCents/` over the
  // whole file is satisfied by the parameter's own name, which is how a break that dropped it
  // from the request's options first went uncaught.
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

// ---------------------------------------------------------------- three-pictures, check 12

// three-pictures' check 12 (docs/features/three-pictures.md, S-150) lives HERE and not in a
// `three-pictures-*` file, because check 20 above allows exactly one test file to name the script
// that spends, and this is it. Like everything in this file, it only reads the script's source.
test("20. (three-pictures check 12) the script that spends sets CUTROOM_PICTURES to 'upToThree' among its defaults, where a value already set wins; prints the rule; and prices its corners at 0 and 4 image calls", () => {
  const source = read(SCRIPT)
  const defaults = source.match(/const env = \{([\s\S]*?)\n\}/)?.[1]
  assert.ok(defaults !== undefined, "the script's env defaults were not found")
  const setAt = defaults.indexOf("CUTROOM_PICTURES: 'upToThree',")
  const loadedAt = defaults.indexOf('...loaded,')
  assert.ok(setAt >= 0, 'the script does not turn the picture rule on')
  assert.ok(
    loadedAt > setAt,
    'a value already set does not win over the default, as every other does',
  )
  assert.match(source, /console\.log\(` {2}pictures {3}\$\{settings\.planSettings\.pictures\}/)
  assert.match(
    source,
    /const calls = \[plannedImageCalls\(\[\]\), plannedImageCalls\(\['s1', 's2', 's3'\]\)\]/,
  )
  // And the rule it sets is one the service accepts.
  assert.equal(readSettings({ CUTROOM_PICTURES: 'upToThree' }).planSettings.pictures, 'upToThree')
})

test('20. (ask-again check 23) the script that spends prints the count of refused answers, and never reads the answer column', () => {
  // AMENDED BY ask-again (S-156): the script prints nothing a provider handed back but figures, so it
  // counts the answers a model wrote that could not be read and leaves their words to
  // scripts/refused.mjs. It lives here because this is the one file allowed to name the script.
  const source = read(SCRIPT)
  const statements = [...source.matchAll(/'([^']*refused_answer[^']*)'/g)].map((m) => m[1])
  assert.deepEqual(
    statements,
    ['SELECT COUNT(*) AS n FROM refused_answer WHERE run_id = ?'],
    'the script reads refused_answer in some other way than a count',
  )
  assert.match(source, /`\s{2}refused\s{2}\$\{refused\} answer/, 'the count is not printed')
  assert.match(source, /scripts\/refused\.mjs \$\{runId\}/, 'the reader is not named')
})
