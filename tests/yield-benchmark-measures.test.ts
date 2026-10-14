import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import {
  ABSENT,
  ESTIMATE_EXCLUDES,
  FIELD_COLUMNS,
  INHERITED,
  NOT_RECORDED,
  PART_NAMES,
  REACHED_BY,
  SHARED_SPAN,
  type RunRows,
  briefKeyInput,
  classify,
  classifyGate1AndGate5,
  gate7QuestionSetInput,
  inheritance,
  scorecard,
  subjectsPerShot,
  termInputs,
  verbatim,
  VERBATIM_SITES,
} from '@cutroom/benchmark'
import { REPO } from './_repo.ts'

// docs/features/yield-benchmark.md, Gate 3, checks 1 to 4 — Slice 1's measures, over the
// committed row corpus in tests/fixtures/benchmark/. No database, no engine, no provider, no
// model call and no key: the arithmetic is pure and is handed arrays of rows.
//
// Check 1. `every field the scorecard names is computed from the column Gate 2 names for it,
// over the fixture corpus; a part is REACHED by the rule its row of the part-to-stage table
// states — plan and pictures by their stage.started, narration and clips by a reel.clips job
// row, the cut by a reel.assemble job row — and is ABSENT otherwise; narration and clips report
// one shared span, labelled clips-plus-the-wait-before-assembly, and 'not recorded' for a span
// of their own, while the cut's span is the render row's started_at to finished_at and is ABSENT
// when finished_at is null; the engine version and an image-port transient read 'not recorded'
// while the picture rule is READ from Plan.pictures and never reported 'not recorded'; the
// per-reel cap is reported only where a budget-limited result carries capCents and absent
// elsewhere; the estimate's label names the reserve, narration, every retake and every lost
// call; a stage with no stage.finished reports its seconds by the stated fallback and names
// which rule it used; and a kept_from row is excluded from the inheriting run's every numerator
// and denominator while an inherited plan stage reads 'inherited, not measured'`.
//
// Check 2. `an inherited failure is recognised although no failure table carries kept_from: on
// the constructed resumed run, the degradation whose shot's last failing picture carries
// kept_from is excluded from the inheriting run and counted in the run that made it, and so are
// a still_hold whose three take_ids all carry kept_from and a hold over an inherited clip; the
// same run's shots-degraded measure and its pictures rating both drop the inherited one`.
//
// Check 3. `gate1.ts still builds its five reconcile templates and its two technical templates
// while its text and witness steps write no reason; the strings takeFailures pushes in gate5.ts
// are exactly four and none of them is the clipping one; the verbatim buckets name every site
// Gate 2's table lists — gate0.ts's four tokens, gate1s.ts's shared-subject names AND its
// Unanswered message, gate2.ts's five, gate3.ts's two, gate7.ts's questions AND its Unanswered
// message, stills/index.ts's degradation reasons, ladder.ts's hold reason and its 'cannot be
// held' why, EVERY detail: site clips/index.ts writes including the messageOf(error) catch-all
// at :195, the run-ending detail: sites in stills/index.ts and plan/index.ts, and
// lost_call.detail; and a run-ending detail is never classified and never counted as a reason,
// so a three-takes-failed detail embedding its takes' gate strings adds nothing to any family`.
//
// Check 4. `the classifier puts each committed historical string in its stated family and leaves
// 'other' empty over the corpus; an unknown string is reported as a finding and fails nothing;
// subjects per shot is read from the selected plan and does not move when a picture's prompt
// wording changes; and the hash function is INJECTED into the package for both things that need
// one — the brief key's INPUT (request_canonical with requestId and options removed) and the
// rating stamp's Gate 7 question-set hash, since benchmark-no-io forbids the package node:crypto
// — and the key's input, computed in the package with a stub hash, puts the corpus's runs in the
// groups session 83 measured, and carries until and the request's ceiling outside itself` — with
// each string's unit: 45 clipping strings on 43 pictures.

const FIXTURES = join(REPO, 'tests', 'fixtures', 'benchmark')

/** Every committed fixture, smallest first, so a search over the corpus stops early. */
function corpus(): Array<{ name: string; rows: RunRows }> {
  return readdirSync(FIXTURES)
    .filter((name) => name.endsWith('.json'))
    .map((name) => ({
      name,
      text: readFileSync(join(FIXTURES, name), 'utf8'),
    }))
    .sort((a, b) => a.text.length - b.text.length)
    .map(({ name, text }) => ({ name, rows: JSON.parse(text) as RunRows }))
}

const CORPUS = corpus()
const named = (name: string): RunRows => {
  const found = CORPUS.find((f) => f.name === name)
  assert.ok(found !== undefined, `no fixture ${name}`)
  return found.rows
}

/** Injective, and visibly not a digest: the real SHA-256 is the reader's (Slice 3, check 5). */
const stub = (input: string) => `stub:${input}`
const card = (rows: RunRows) => scorecard(rows, { hash: stub })

const clone = (rows: RunRows): RunRows => JSON.parse(JSON.stringify(rows)) as RunRows

/** The value at a dotted path; `[]` maps over an array, so one path covers every item. */
function valueAt(from: unknown, path: string): unknown {
  let at: unknown = from
  for (const step of path.split('.')) {
    if (at === undefined || at === null) return undefined
    if (step.endsWith('[]')) {
      const key = step.slice(0, -2)
      const list = (at as Record<string, unknown>)[key]
      if (!Array.isArray(list)) return undefined
      return list.map((item) => item)
    }
    at = (at as Record<string, unknown>)[step]
  }
  return at
}

/** Read a field whose path crosses an array: every item's value, in order. */
function fieldAt(from: unknown, path: string): unknown {
  const cut = path.indexOf('[].')
  if (cut < 0) return valueAt(from, path)
  const list = valueAt(from, `${path.slice(0, cut)}[]`)
  if (!Array.isArray(list)) return undefined
  return list.map((item) => fieldAt(item, path.slice(cut + 3)))
}

/**
 * What one change to one column looks like. A ladder, because one replacement cannot move every
 * field a column feeds: perturbing `plan.role` leaves "was a repair plan needed" alone, while
 * writing `repair` into it moves exactly that. The last rung takes the rows away, which is what
 * a field counting rows reads.
 */
const MUTATIONS = [null, '', 0, 1, 'repair', 'accept', 'moved'] as const

/** Set every row of one table's one column to `to`; `undefined` drops the rows outright. */
function mutate(rows: RunRows, table: string, column: string, to: unknown): boolean {
  const held = rows as unknown as Record<string, unknown>
  const target = held[table]
  if (to === undefined) {
    if (!Array.isArray(target) || target.length === 0) return false
    held[table] = []
    return true
  }
  const list = Array.isArray(target) ? target : [target]
  let touched = false
  for (const row of list) {
    if (row === null || row === undefined || typeof row !== 'object') continue
    const record = row as Record<string, unknown>
    if (record[column] === to) continue
    record[column] = to
    touched = true
  }
  return touched
}

// ---------------------------------------------------------------- check 1

test('1. every field the scorecard names is computed from the column Gate 2 names for it, over the fixture corpus', () => {
  // Every leaf the scorecard prints has an entry, and an entry that names columns is PROVED
  // against them: changing that column, and nothing else, moves that field somewhere in the
  // corpus. An entry that names none reads 'not recorded' or is a fixed label — the two
  // things Gate 2 allows a field with no column to be.
  const leaves: string[] = []
  const walk = (value: unknown, path: string) => {
    if (Array.isArray(value)) {
      if (value.length === 0) return
      walk(value[0], `${path}[]`)
      return
    }
    if (value !== null && typeof value === 'object') {
      for (const [key, child] of Object.entries(value))
        walk(child, path === '' ? key : `${path}.${key}`)
      return
    }
    leaves.push(path)
  }
  for (const { rows } of CORPUS) walk(card(rows), '')

  const declared = new Set(Object.keys(FIELD_COLUMNS))
  const undeclared = [...new Set(leaves)].filter((path) => !declared.has(path)).sort()
  assert.deepEqual(
    undeclared,
    [],
    `scorecard fields with no column named for them:\n${undeclared.join('\n')}`,
  )

  const unproven: string[] = []
  for (const [field, columns] of Object.entries(FIELD_COLUMNS)) {
    if (columns.length === 0) {
      // No column: it must read 'not recorded', or be one of the declared labels.
      const values = CORPUS.map(({ rows }) => JSON.stringify(fieldAt(card(rows), field)))
      const allowed = [
        JSON.stringify(NOT_RECORDED),
        JSON.stringify(ESTIMATE_EXCLUDES),
        JSON.stringify(SHARED_SPAN),
        ...PART_NAMES.map((part) => JSON.stringify(REACHED_BY[part])),
        JSON.stringify(undefined),
      ]
      for (const value of values) {
        if (!allowed.includes(value)) unproven.push(`${field} has no column and reads ${value}`)
      }
      continue
    }
    for (const column of columns) {
      const [table, name] = column.split('.')
      assert.ok(
        table !== undefined && name !== undefined,
        `${field} names ${column}, not table.column`,
      )
      let moved = false
      for (const { rows } of CORPUS) {
        const before = JSON.stringify(fieldAt(card(rows), field))
        for (const to of [...MUTATIONS, undefined]) {
          const broken = clone(rows)
          if (!mutate(broken, table, name, to)) continue
          if (JSON.stringify(fieldAt(card(broken), field)) !== before) {
            moved = true
            break
          }
        }
        if (moved) {
          break
        }
      }
      if (!moved) unproven.push(`${field} does not move when ${column} does`)
    }
  }
  assert.deepEqual(unproven, [], unproven.join('\n'))
})

test('1. a part is REACHED by the rule its row of the part-to-stage table states — plan and pictures by their stage.started, narration and clips by a reel.clips job row, the cut by a reel.assemble job row — and is ABSENT otherwise', () => {
  const reached = (rows: RunRows) =>
    Object.fromEntries(PART_NAMES.map((part) => [part, card(rows).parts[part].reached]))

  assert.deepEqual(reached(named('taken-dead-in-plan.json')), {
    plan: true,
    pictures: false,
    narration: false,
    clips: false,
    cut: false,
  })
  assert.deepEqual(reached(named('taken-dead-on-first-picture.json')), {
    plan: true,
    pictures: true,
    narration: false,
    clips: false,
    cut: false,
  })
  assert.deepEqual(reached(named('taken-stopped-at-the-take-cap.json')), {
    plan: true,
    pictures: true,
    narration: true,
    clips: true,
    cut: false,
  })
  assert.deepEqual(reached(named('taken-completed.json')), {
    plan: true,
    pictures: true,
    narration: true,
    clips: true,
    cut: true,
  })

  // The rule each part is reached by, said in the card rather than implied by it.
  for (const { rows } of CORPUS) {
    const parts = card(rows).parts
    for (const part of PART_NAMES) assert.equal(parts[part].reachedBy, REACHED_BY[part])
  }

  // A run whose video stage started but whose clips job row is gone reaches neither narration
  // nor clips: the job row is the rule, not the stage event (round 3's finding).
  const noClipsJob = clone(named('taken-completed.json'))
  noClipsJob.job = noClipsJob.job.filter((job) => job.kind !== 'reel.clips')
  assert.equal(card(noClipsJob).parts.narration.reached, false)
  assert.equal(card(noClipsJob).parts.clips.reached, false)
  assert.equal(card(noClipsJob).parts.cut.reached, true)

  // An absent part says so, and reports no span.
  const absent = card(named('taken-dead-in-plan.json')).parts.cut
  assert.equal(absent.reached, false)
  assert.equal(absent.span.seconds, ABSENT)
})

test("1. narration and clips report one shared span, labelled clips-plus-the-wait-before-assembly, and 'not recorded' for a span of their own, while the cut's span is the render row's started_at to finished_at and is ABSENT when finished_at is null", () => {
  const completed = card(named('taken-completed.json'))
  for (const part of ['narration', 'clips'] as const) {
    assert.equal(completed.parts[part].span.rule, SHARED_SPAN)
    assert.match(completed.parts[part].span.rule, /the clips job plus the wait before assembly/)
    assert.equal(typeof completed.parts[part].span.seconds, 'number')
    assert.equal(completed.parts[part].ownSpan, NOT_RECORDED)
  }
  // One figure, shared: the two parts report the same seconds, never two.
  assert.equal(completed.parts.narration.span.seconds, completed.parts.clips.span.seconds)

  // The cut's span is the render row's own, the one true duration.
  const render = named('taken-completed.json').render[0]
  assert.ok(render !== undefined)
  const expected = (Date.parse(String(render.finished_at)) - Date.parse(render.started_at)) / 1000
  assert.equal(completed.parts.cut.span.seconds, expected)
  assert.match(completed.parts.cut.span.rule, /started_at to finished_at/)

  // finished_at null: the cut is still reached, and its seconds are ABSENT — not zero, and not
  // taken from the run's own end.
  const unfinished = clone(named('taken-completed.json'))
  const row = unfinished.render[0]
  assert.ok(row !== undefined)
  row.finished_at = null
  const killed = card(unfinished)
  assert.equal(killed.parts.cut.reached, true)
  assert.equal(killed.parts.cut.span.seconds, ABSENT)
  assert.equal(killed.parts.cut.finished, false)
})

test("1. the engine version and an image-port transient read 'not recorded' while the picture rule is READ from Plan.pictures and never reported 'not recorded'", () => {
  for (const { name, rows } of CORPUS) {
    const run = card(rows).run
    assert.equal(run.engineVersion, NOT_RECORDED, name)
    assert.equal(run.transients.image, NOT_RECORDED, name)
    assert.equal(run.transients.model, NOT_RECORDED, name)
    assert.notEqual(run.pictureRule, NOT_RECORDED, name)
  }
  // Present on the selected plan: read, not guessed.
  assert.equal(card(named('taken-completed.json')).run.pictureRule, 'upToThree')
  // Absent on the selected plan: the default the plan was priced under, never 'not recorded'.
  assert.equal(card(named('constructed-gate-1s-degradation.json')).run.pictureRule, 'recurring')
  // No plan at all: absent, because there is no plan to have been priced under a rule.
  assert.equal(card(named('taken-dead-in-plan.json')).run.pictureRule, ABSENT)
})

test('1. the per-reel cap is reported only where a budget-limited result carries capCents and absent elsewhere', () => {
  assert.equal(card(named('taken-stopped-by-the-budget.json')).run.capCents, 300)
  for (const { name, rows } of CORPUS) {
    if (name === 'taken-stopped-by-the-budget.json') continue
    assert.equal(card(rows).run.capCents, ABSENT, name)
  }
})

test("1. the estimate's label names the reserve, narration, every retake and every lost call", () => {
  const label = card(named('taken-completed.json')).run.estimateExcludes
  assert.equal(label, ESTIMATE_EXCLUDES)
  for (const names of [/reserve/, /narration/, /retake/, /lost call/]) {
    assert.match(label, names, label)
  }
  // The estimate itself is the selected plan's, beside the actual spend.
  assert.equal(card(named('taken-completed.json')).run.estimateCents, 48)
})

test('1. a stage with no stage.finished reports its seconds by the stated fallback and names which rule it used', () => {
  // S-046 writes no stage.finished for a stopped stills stage: 118 starts against 74 finishes.
  const stopped = card(named('taken-stopped-at-gate-1.json')).run.stages
  assert.equal(stopped.plan.rule, 'its own stage.finished')
  assert.equal(stopped.stills.rule, "the run's own end")
  assert.equal(typeof stopped.stills.seconds, 'number')

  // The middle rule: the next stage's start, when this one never finished.
  const middle = clone(named('taken-completed.json'))
  middle.run_event = middle.run_event.filter((event) => {
    const body = JSON.parse(event.body) as { type: string; stage?: string }
    return !(body.type === 'stage.finished' && body.stage === 'stills')
  })
  assert.equal(card(middle).run.stages.stills.rule, "the next stage's start")

  // All three rules are named, and a stage that never started is absent.
  const none = card(named('taken-dead-in-plan.json')).run.stages
  assert.equal(none.video.seconds, ABSENT)
})

test("1. a kept_from row is excluded from the inheriting run's every numerator and denominator while an inherited plan stage reads 'inherited, not measured'", () => {
  const resumed = named('constructed-resumed.json')
  const sheet = card(resumed)

  // The plan this run did not pay for: inherited, and left out of the run rating (S-162).
  assert.equal(sheet.parts.plan.span.seconds, INHERITED)
  assert.equal(sheet.parts.plan.span.rule, INHERITED)
  assert.equal(sheet.run.partial, true)
  assert.deepEqual(sheet.run.partsCovered, ['pictures', 'narration', 'clips', 'cut'])

  // Every numerator and denominator drops the kept rows. The pictures this run made are
  // shot-2's two and shot-4's one; shot-0's, shot-1's and shot-3's came in with kept_from.
  const terms = termInputs(resumed, { takeSeconds: 0.25, cutSeconds: 0.5 })
  assert.deepEqual(terms.pictures.judgedAccepted, { achieved: 1, attempted: 3 })
  assert.deepEqual(terms.pictures.shotsEndingAccepted, { achieved: 1, attempted: 2 })
  assert.deepEqual(terms.clips.takesAccepted, { achieved: 2, attempted: 5 })
  assert.deepEqual(terms.clips.shotsEndingAccepted, { achieved: 2, attempted: 3 })
  // The units this run was to speak: the plan's five less the three whose narration came in
  // with kept_from (clips/index.ts does not speak an inherited narration).
  assert.deepEqual(terms.narration.unitsSpoken, { achieved: 2, attempted: 2 })
  assert.deepEqual(terms.narration.timingsParsedAtFirstAsk, { achieved: 1, attempted: 2 })

  // And the counted figures drop them too.
  assert.equal(sheet.parts.pictures.attempted, 3)
  assert.equal(sheet.parts.clips.items.length, 5)
  assert.equal(sheet.parts.narration.items.length, 2)
})

// ---------------------------------------------------------------- check 2

test("2. an inherited failure is recognised although no failure table carries kept_from: on the constructed resumed run, the degradation whose shot's last failing picture carries kept_from is excluded from the inheriting run and counted in the run that made it, and so are a still_hold whose three take_ids all carry kept_from and a hold over an inherited clip", () => {
  const resumed = named('constructed-resumed.json')
  const earlier = String(resumed.run.resumes)
  const report = inheritance(resumed)

  // degradation, hold and still_hold have no kept_from column; recognition is per table.
  for (const table of ['degradation', 'hold', 'still_hold'] as const) {
    const rows = resumed[table] as unknown as Array<Record<string, unknown>>
    for (const row of rows) assert.equal('kept_from' in row, false, `${table} carries kept_from`)
  }

  assert.deepEqual(report.degradations, [
    { shotId: 'shot-1', inherited: true, paidBy: earlier },
    { shotId: 'shot-2', inherited: false, paidBy: resumed.run.run_id },
  ])
  assert.deepEqual(report.stillHolds, [
    { shotId: 'shot-0', inherited: true, paidBy: earlier },
    { shotId: 'shot-4', inherited: false, paidBy: resumed.run.run_id },
  ])
  assert.deepEqual(report.holds, [
    { shotId: 'shot-2', inherited: false, paidBy: resumed.run.run_id },
    { shotId: 'shot-3', inherited: true, paidBy: earlier },
  ])
})

test("2. the same run's shots-degraded measure and its pictures rating both drop the inherited one", () => {
  const resumed = named('constructed-resumed.json')
  const sheet = card(resumed)

  // Two degradation rows; one of them is the carried one, counted in the run that made it.
  assert.equal(resumed.degradation.length, 2)
  assert.deepEqual(
    sheet.parts.pictures.shotsDegraded.map((d) => [d.shotId, d.gate, d.inherited]),
    [
      ['shot-1', '1', true],
      ['shot-2', '1', false],
    ],
  )
  assert.equal(sheet.parts.pictures.shotsDegradedThisRunMade, 1)

  // The pictures rating is built from these two term shares and nothing else (S-184's
  // phrasing; ratings.ts applies the weights). Both drop every kept_from picture, so the
  // carried degradation's shot — whose only picture came in with kept_from — cannot pay or
  // cost this run anything.
  const terms = termInputs(resumed, { takeSeconds: 0.25, cutSeconds: 0.5 })
  assert.deepEqual(terms.pictures.judgedAccepted, { achieved: 1, attempted: 3 })
  assert.deepEqual(terms.pictures.shotsEndingAccepted, { achieved: 1, attempted: 2 })

  // Counted as the inheriting run's, the same rows would read differently in both terms.
  const asIfOwn = clone(resumed)
  for (const picture of asIfOwn.picture) picture.kept_from = null
  const wrong = termInputs(asIfOwn, { takeSeconds: 0.25, cutSeconds: 0.5 })
  assert.deepEqual(wrong.pictures.judgedAccepted, { achieved: 3, attempted: 6 })
  assert.deepEqual(wrong.pictures.shotsEndingAccepted, { achieved: 3, attempted: 5 })
  assert.notDeepEqual(wrong.pictures.judgedAccepted, terms.pictures.judgedAccepted)
})

// ---------------------------------------------------------------- check 3

const source = (path: string) =>
  readFileSync(join(REPO, 'packages', 'pipeline', 'src', path), 'utf8')

/** The string templates a function pushes or returns, with every `${...}` read as a hole. */
function templatesIn(file: string, fn: string): string[] {
  const text = source(file)
  const at = text.search(new RegExp(`(export )?function ${fn}\\(`))
  assert.ok(at >= 0, `${file} has no ${fn}`)
  const end = text.indexOf('\n}', at)
  const body = text.slice(at, end)
  const found: string[] = []
  for (const match of body.matchAll(/(?:push|return)\s*\(?\s*\[?\s*(`[^`]*`|'[^']*')/g)) {
    const literal = match[1]
    if (literal === undefined) continue
    found.push(literal.slice(1, -1).replace(/\$\{[^}]*\}/g, '<>'))
  }
  return found
}

test('3. gate1.ts still builds its five reconcile templates and its two technical templates while its text and witness steps write no reason', () => {
  assert.deepEqual(templatesIn('gates/gate1.ts', 'reconcileFailures'), [
    '<> is not shown',
    '<> is clipped by the edge of the frame',
    '<>: the count seen does not match its name',
    'must show "<>" is not shown: <>',
    'must never show "<>" is shown: <>',
  ])
  assert.deepEqual(templatesIn('gates/gate1.ts', 'technicalReasons'), [
    'the file is not a readable image',
    'the picture is <>x<>, not 9:16',
  ])

  // The text and witness steps push a step with no reason, always (S-041, D-042).
  const text = source('gates/gate1.ts')
  for (const step of ['text', 'witness']) {
    const pushes = [...text.matchAll(new RegExp(`step: '${step}'[^}]*}`, 'g'))].map((m) => m[0])
    assert.equal(pushes.length, 1, `${step} is pushed ${pushes.length} times`)
    assert.match(String(pushes[0]), /reasons: \[\]/)
  }
})

test('3. the strings takeFailures pushes in gate5.ts are exactly four and none of them is the clipping one', () => {
  const pushed = templatesIn('gates/gate5.ts', 'takeFailures')
  assert.equal(pushed.length, 4, pushed.join(' | '))
  assert.deepEqual(pushed, [
    '<> is not shown',
    '<>: the count seen does not match its name',
    'must show "<>" is not shown: <>',
    'must never show "<>" is shown: <>',
  ])
  // Read from the pushed templates, not from the file's text: the word `clipped` appears in
  // takeFailures' own docstring, and D-044's veto is the keyframe's (S-072).
  for (const template of pushed) assert.doesNotMatch(template, /clipped/)
  assert.match(source('gates/gate5.ts'), /A clipped entity fails nothing/)
})

test("3. the verbatim buckets name every site Gate 2's table lists", () => {
  assert.deepEqual(
    VERBATIM_SITES.map((site) => site.site),
    [
      'gates/gate0.ts',
      'gates/gate1s.ts',
      'gates/gate2.ts',
      'gates/gate3.ts',
      'gates/gate7.ts',
      'stills/index.ts',
      'clips/ladder.ts',
      'clips/index.ts',
      'plan/index.ts',
      'lost_call.detail',
    ],
  )
  const says = (site: string) => {
    const found = VERBATIM_SITES.find((s) => s.site === site)
    assert.ok(found !== undefined, `no bucket for ${site}`)
    return found.writes
  }
  assert.match(says('gates/gate0.ts'), /coverage.*criteria.*shape.*cost/)
  assert.match(says('gates/gate1s.ts'), /shared-subject names.*Unanswered/)
  assert.match(says('gates/gate2.ts'), /five technical reasons/)
  assert.match(says('gates/gate3.ts'), /two sound reasons/)
  assert.match(says('gates/gate7.ts'), /question strings.*Unanswered/)
  assert.match(says('stills/index.ts'), /degradation reasons/)
  assert.match(says('stills/index.ts'), /run-ending/)
  assert.match(says('clips/ladder.ts'), /hold reason.*cannot be held/)
  assert.match(says('clips/index.ts'), /every detail: it writes.*messageOf\(error\).*:195/)
  assert.match(says('plan/index.ts'), /run-ending/)
  assert.match(says('lost_call.detail'), /whatever the port reported/)

  // Every site Gate 2 lists has a bucket in the output, and each is counted VERBATIM.
  const buckets = verbatim(named('taken-stopped-at-the-take-cap.json'))
  assert.deepEqual(Object.keys(buckets).sort(), VERBATIM_SITES.map((s) => s.site).sort())
  // The lost call's own words, from the one fixture that has one.
  const lost = verbatim(named('taken-lost-a-call.json'))['lost_call.detail']
  assert.ok(lost !== undefined && lost.length === 1, JSON.stringify(lost))

  // clips/index.ts writes five detail: sites, the messageOf(error) catch-all among them.
  const clips = readFileSync(join(REPO, 'packages', 'pipeline', 'src', 'clips', 'index.ts'), 'utf8')
  const details = [...clips.matchAll(/^\s+detail: /gm)]
  assert.equal(details.length, 5, `clips/index.ts writes ${details.length} detail: sites`)
  assert.match(clips, /detail: messageOf\(error\)/)
})

test('3. a run-ending detail is never classified and never counted as a reason, so a three-takes-failed detail embedding its takes gate strings adds nothing to any family', () => {
  const rows = clone(named('taken-stopped-at-the-take-cap.json'))
  const before = classifyGate1AndGate5(rows)

  // The detail clips/index.ts composes for three failed takes embeds those takes' own Gate 2,
  // 3 and 5 strings in one sentence. Classifying it would count every one of them twice.
  const embedded =
    "shot-1's three takes failed their checks — a1-shot-1-take-1: " +
    'subject "show-bee" (Honeybee) is clipped by the edge of the frame; ' +
    'a1-shot-1-take-2: subject "show-bee" (Honeybee) is not shown'
  const result = JSON.parse(String(rows.run.result)) as Record<string, unknown>
  result.detail = embedded
  rows.run.result = JSON.stringify(result)

  const after = classifyGate1AndGate5(rows)
  assert.deepEqual(after.families, before.families)
  assert.deepEqual(after.findings, before.findings)

  // It is reported, verbatim, as the ending's own text — under the site that wrote it.
  assert.equal(card(rows).run.ending.detail, embedded)
  const buckets = verbatim(rows)
  assert.ok(buckets['clips/index.ts']?.includes(embedded), 'the detail is not reported verbatim')
})

// ---------------------------------------------------------------- check 4

test("4. the classifier puts each committed historical string in its stated family and leaves 'other' empty over the corpus", () => {
  const families: Record<string, { strings: number; pictures: number; takes: number }> = {}
  for (const { rows } of CORPUS) {
    const counted = classifyGate1AndGate5(rows)
    for (const [family, count] of Object.entries(counted.families)) {
      const at = (families[family] ??= { strings: 0, pictures: 0, takes: 0 })
      at.strings += count.strings
      at.pictures += count.pictures
      at.takes += count.takes
    }
  }
  // Each string's UNIT is reported, because the record's own figure is 45 strings on 43
  // pictures: a count of strings is not a count of pictures.
  for (const count of Object.values(families)) {
    assert.equal(typeof count.strings, 'number')
    assert.equal(typeof count.pictures, 'number')
    assert.equal(typeof count.takes, 'number')
  }
  assert.deepEqual(families['other'], { strings: 0, pictures: 0, takes: 0 })
  assert.ok((families['clipping']?.strings ?? 0) > 0, JSON.stringify(families))
  assert.ok((families['must-not-show']?.strings ?? 0) > 0, JSON.stringify(families))

  // Each historical shape, in its stated family.
  assert.equal(classify('subject "s" (a bee) is clipped by the edge of the frame'), 'clipping')
  assert.equal(classify('subject "s" (a bee): the count seen does not match its name'), 'count')
  assert.equal(classify('subject "s" (a bee) is not shown'), 'not shown')
  assert.equal(classify('must show "c" is not shown: a bee on a flower'), 'must-show')
  assert.equal(classify('must never show "c" is shown: written words'), 'must-not-show')
  assert.equal(classify('the file is not a readable image'), 'technical')
  assert.equal(classify('the picture is 768x1376, not 9:16'), 'technical')
})

test('4. an unknown string is reported as a finding and fails nothing', () => {
  const rows = clone(named('taken-stopped-at-gate-1.json'))
  const first = rows.picture[0]
  assert.ok(first !== undefined)
  const gate1 = JSON.parse(String(first.gate1)) as {
    steps: Array<{ step: string; reasons: string[] }>
  }
  const reconcile = gate1.steps.find((step) => step.step === 'reconcile')
  assert.ok(reconcile !== undefined)
  reconcile.reasons = [...reconcile.reasons, 'a reason no gate has ever written']
  first.gate1 = JSON.stringify(gate1)

  const counted = classifyGate1AndGate5(rows)
  assert.deepEqual(counted.findings, ['a reason no gate has ever written'])
  assert.equal(counted.families['other']?.strings, 1)
  // A finding, and nothing more: the scorer still scores the run.
  assert.equal(card(rows).parts.pictures.reached, true)
})

test("4. subjects per shot is read from the selected plan and does not move when a picture's prompt wording changes", () => {
  const rows = named('taken-completed.json')
  const was = subjectsPerShot(rows)
  assert.deepEqual(was, [1, 2, 1, 1])

  const reworded = clone(rows)
  for (const picture of reworded.picture) {
    picture.prompt = String(picture.prompt).replace(/It shows: [^\n]*/g, 'It shows: something else')
  }
  assert.deepEqual(subjectsPerShot(reworded), was)
  assert.deepEqual(card(reworded).parts.plan.subjectsPerShot, was)

  // The plan is the source: change it and the measure moves.
  const replanned = clone(rows)
  const selected = replanned.plan.find((plan) => plan.selected === 1 || plan.selected === true)
  assert.ok(selected !== undefined)
  const plan = JSON.parse(selected.plan) as { shots: Array<{ subjectIds: string[] }> }
  const shot = plan.shots[0]
  assert.ok(shot !== undefined)
  shot.subjectIds = [...shot.subjectIds, 'show-second']
  selected.plan = JSON.stringify(plan)
  assert.deepEqual(subjectsPerShot(replanned), [2, 2, 1, 1])
})

test("4. the hash function is INJECTED into the package for both things that need one — the brief key's INPUT and the rating stamp's Gate 7 question-set hash — since benchmark-no-io forbids the package node:crypto", () => {
  const rows = named('taken-completed.json')

  // Nothing in the package imports a hash: both callers are handed one.
  for (const file of ['index.ts', 'measures.ts', 'reasons.ts']) {
    const text = readFileSync(join(REPO, 'packages', 'benchmark', 'src', file), 'utf8')
    assert.doesNotMatch(text, /from '(node:)?crypto'/, `${file} reaches for a hash`)
    assert.doesNotMatch(text, /createHash/, `${file} reaches for a hash`)
  }

  // The brief key's input is pure, and the key is the injected hash of it.
  const input = briefKeyInput(rows.run)
  assert.equal(card(rows).run.briefKey, stub(input))

  // The question-set input is the Gate 7 questions the run was asked, in order, and the stamp
  // is the injected hash of it. A run with no Gate 7 has no question set.
  const questions = gate7QuestionSetInput(rows.render)
  assert.ok(questions !== undefined)
  assert.match(questions, /Are the shots in a sensible order\?/)
  assert.equal(card(rows).parts.cut.questionSetHash, stub(questions))
  assert.equal(gate7QuestionSetInput(named('taken-dead-in-plan.json').render), undefined)
  assert.equal(card(named('taken-dead-in-plan.json')).parts.cut.questionSetHash, ABSENT)
})

test("4. the key's input, computed in the package with a stub hash, puts the corpus's runs in the groups session 83 measured, and carries until and the request's ceiling outside itself", () => {
  // Session 83 read 52 runs over 25 brief groups from the record. Over this corpus, the two
  // runs of the five-run group `f984199a` share a key and the other eight do not: nine groups
  // over ten runs.
  const groups = new Map<string, string[]>()
  for (const { name, rows } of CORPUS) {
    const key = card(rows).run.briefKey
    groups.set(String(key), [...(groups.get(String(key)) ?? []), name].sort())
  }
  const shared = [...groups.values()].filter((names) => names.length > 1)
  assert.equal(groups.size, 9)
  assert.deepEqual(shared, [['taken-dead-in-plan.json', 'taken-dead-on-first-picture.json']])

  // requestId and options are what the key removes; nothing else is.
  const rows = named('taken-completed.json')
  const input = briefKeyInput(rows.run)
  assert.doesNotMatch(input, /requestId/)
  assert.doesNotMatch(input, /"options"/)
  assert.doesNotMatch(input, /budgetCents/)
  assert.match(input, /worldId/)

  // The key's input is canonical: the same request with its keys in another order is one brief.
  const reordered = clone(rows)
  const parsed = JSON.parse(String(reordered.run.request_canonical)) as Record<string, unknown>
  reordered.run.request_canonical = JSON.stringify(
    Object.fromEntries(Object.entries(parsed).reverse()),
  )
  assert.equal(briefKeyInput(reordered.run), input)

  // until and the ceiling are carried OUTSIDE the key, because until decides which parts can
  // exist and the ceiling decides when a run stops.
  const sheet = card(rows)
  assert.equal(sheet.run.until, 'video')
  assert.equal(sheet.run.ceilingCents, 250)
  const shorter = clone(rows)
  const request = JSON.parse(String(shorter.run.request_canonical)) as {
    options: Record<string, unknown>
  }
  request.options = { ...request.options, until: 'plan', budgetCents: 100 }
  shorter.run.request_canonical = JSON.stringify(request)
  assert.equal(briefKeyInput(shorter.run), input)
  assert.equal(card(shorter).run.until, 'plan')
  assert.equal(card(shorter).run.ceilingCents, 100)
})
