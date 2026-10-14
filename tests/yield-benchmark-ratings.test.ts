import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import {
  ABSENT,
  INHERITED,
  NO_RATING,
  PART_NAMES,
  PART_WEIGHTS,
  RATING_VERSION,
  TERM_WEIGHTS,
  TOLERANCES,
  type PartName,
  type RunRating,
  type RunRows,
  type Term,
  cutRatingsComparable,
  printed,
  rank,
  runRating,
  scorecard,
  termInputs,
} from '@cutroom/benchmark'
import { REPO } from './_repo.ts'

// docs/features/yield-benchmark.md, Gate 3, checks 8 to 10 — Slice 2's ratings, over the five
// worked rating fixtures constructed by hand in tests/fixtures/benchmark/ratings/. No database,
// no engine, no provider, no model call and no key: the arithmetic is pure and is handed rows.
//
// Check 8. `each part's rating is built only from the engine's own verdicts — the rating function
// handed a plan whose shots name four subjects and the same plan with one returns the same rating
// — every term is a stated numerator over a stated attempted denominator with no term phrased as
// an absence, each part's weights sum to 1.0, NO term is computed from the absence of a row (the
// pictures and clips shot terms read an accepted picture and take.outcome = 'accept', never
// degradation's or still_hold's absence, and every cut term is 0 while render.finished_at is
// null), and the five worked fixtures rate exactly 0.0, 10.0, 10.0, 34.0 and 89.7, term by term
// as Gate 2 states them`.
//
// Check 9. `an absent part scores 0 against its weight; a run that reached no part has no run
// rating; a run rated over a shorter until is labelled and never pooled with a whole reel; the
// five fixtures rank dead-in-plan < dead-on-first-picture = stopped-at-gate-1 <
// entered-video-made-nothing < completed, the two early deaths TYING at 10.0 because both
// achieved nothing in the parts they reached while differing in their reported figures (3
// pictures judged against 0), which the check also asserts; the stopped-at-gate-1 fixture is the
// canonical picture's three failures on ONE shot, the only shape stills/index.ts:514-521 can
// produce; entered-video-made-nothing scores clips 0.0 and cut 0.0 rather than the 30.0 and 20.0
// the struck phrasing paid it; and two runs with identical verdicts and different endings have
// identical part ratings and different reported yield`.
//
// Check 10. `a rating carries version r1 and its run's Gate 7 question-set hash; the refusal to
// compare is scoped to the CUT rating, the only one S-158's change moved, so two runs whose cut
// question-sets differ cannot have their cut ratings compared while their run ratings still rank
// and still enter the ledger; and ranking is not comparing — check 9's five fixtures carry four
// r1/— stamps and one hashed stamp and rank regardless`.

const FIXTURES = join(REPO, 'tests', 'fixtures', 'benchmark', 'ratings')

/**
 * One worked fixture: the rows, the term inputs Gate 2 states for it, and the figures it pins.
 * `terms` is what makes a pinned value computed FROM STATED INPUTS rather than read back out of
 * the code — a fixture lifted from the record pins numbers nobody restated.
 */
interface Worked extends RunRows {
  about: string
  what: string
  terms: Record<PartName, Record<string, Term> | typeof ABSENT>
  expected: { parts: Record<PartName, string>; rating: string; stamp: string }
}

const worked = (name: string): Worked =>
  JSON.parse(readFileSync(join(FIXTURES, `constructed-${name}.json`), 'utf8')) as Worked

/** Injective, and visibly not a digest: the real SHA-256 is the reader's (Slice 3, check 5). */
const stub = (input: string) => `stub:${input}`

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

const rated = (rows: RunRows) => runRating(rows, { hash: stub })
const card = (rows: RunRows) => scorecard(rows, { hash: stub })

/** The five, in the order Gate 2 works them out. */
const FIVE = [
  'dead-in-plan',
  'dead-on-first-picture',
  'stopped-at-gate-1',
  'entered-video-made-nothing',
  'completed',
] as const

// ---------------------------------------------------------------- the arithmetic, written again
//
// S-182's weights and the run weights, written out HERE as well as in the package, so the worked
// values below are computed from the gates' arithmetic and not echoed back out of the code. The
// two tables are asserted equal to the package's own, so one changed weight is red in both.

const WEIGHTS: Record<PartName, Record<string, number>> = {
  plan: {
    gate0AdmittedTheSelectedPlan: 0.5,
    admittedAtItsFirstRound: 0.2,
    asksAnsweredAtTheFirstAsk: 0.3,
  },
  pictures: { judgedAccepted: 0.7, shotsEndingAccepted: 0.3 },
  narration: { unitsSpoken: 0.5, timingsParsedAtFirstAsk: 0.5 },
  clips: { takesAccepted: 0.5, shotsEndingAccepted: 0.3, deliveredWithinAsked: 0.2 },
  cut: { questionsAnsweredYes: 0.6, shotsCarriedWithoutAHold: 0.2, durationWithinThePlan: 0.2 },
}

const RUN_WEIGHTS: Record<PartName, number> = {
  plan: 0.1,
  pictures: 0.3,
  narration: 0.1,
  clips: 0.3,
  cut: 0.2,
}

/** Convention 2: a share with an empty denominator, inside a part that was reached, is 0. */
const value = (term: Term): number => (term.attempted === 0 ? 0 : term.achieved / term.attempted)

/** A part's rating from its STATED inputs: 100 × Σ(term × weight). */
function statedPart(part: PartName, terms: Record<string, Term>): number {
  let total = 0
  for (const [name, weight] of Object.entries(WEIGHTS[part])) {
    const term = terms[name]
    assert.ok(term !== undefined, `${part} states no ${name}`)
    total += value(term) * weight
  }
  return 100 * total
}

/** The run rating from the stated inputs: an absent part scores 0 against its weight. */
function statedRun(fixture: Worked): number {
  let total = 0
  for (const part of PART_NAMES) {
    const terms = fixture.terms[part]
    total += (terms === ABSENT ? 0 : statedPart(part, terms)) * RUN_WEIGHTS[part]
  }
  return total
}

// ---------------------------------------------------------------- check 8

test("8. each part's rating is built only from the engine's own verdicts — the rating function handed a plan whose shots name four subjects and the same plan with one returns the same rating", () => {
  const rows = worked('completed')
  const before = rated(rows)

  const withFour = clone(rows)
  const withOne = clone(rows)
  for (const [rows_, subjects] of [
    [withFour, ['wave_open_sea', 'seabed_fault', 'shallow_front', 'bared_sea_floor']],
    [withOne, ['wave_open_sea']],
  ] as const) {
    const selected = rows_.plan.find((plan) => plan.selected === 1 || plan.selected === true)
    assert.ok(selected !== undefined)
    const plan = JSON.parse(selected.plan) as { shots: Array<{ subjectIds: string[] }> }
    for (const shot of plan.shots) shot.subjectIds = [...subjects]
    selected.plan = JSON.stringify(plan)
  }

  // Four subjects a shot or one: the rating is the same, because no term reads how many things a
  // shot asked for. `picture-prompt` is about to make shots ask for fewer, and a rating that
  // counted them would rise by definition and stop measuring (Gate 1's two cut terms).
  assert.equal(rated(withFour).rating, before.rating)
  assert.equal(rated(withOne).rating, before.rating)
  for (const part of PART_NAMES) {
    assert.equal(rated(withFour).parts[part].rating, before.parts[part].rating, part)
    assert.equal(rated(withOne).parts[part].rating, before.parts[part].rating, part)
  }
})

test("8. every term is a stated numerator over a stated attempted denominator with no term phrased as an absence, each part's weights sum to 1.0", () => {
  // The weights are S-182's, unmoved by S-184's rephrasing and by round 4.
  assert.deepEqual(TERM_WEIGHTS, WEIGHTS)
  assert.deepEqual(PART_WEIGHTS, RUN_WEIGHTS)
  assert.deepEqual(TOLERANCES, { takeSeconds: 0.25, cutSeconds: 0.5 })

  // Each part's weights sum to 1.0, and the five run weights sum to 1.0. Summed as thousandths,
  // because 0.5 + 0.2 + 0.3 is 0.9999999999999999 in binary floating point.
  const thousandths = (weights: readonly number[]) =>
    weights.reduce((total, weight) => total + Math.round(weight * 1000), 0)
  for (const part of PART_NAMES) {
    assert.equal(thousandths(Object.values(WEIGHTS[part])), 1000, part)
  }
  assert.equal(thousandths(PART_NAMES.map((part) => RUN_WEIGHTS[part])), 1000)

  // Every term the package rates is a term termInputs computes, by the same name, as an achieved
  // count over an attempted count — never a count of rows that do not exist.
  const inputs = termInputs(worked('completed'), TOLERANCES)
  for (const part of PART_NAMES) {
    const stated = inputs[part] as unknown as Record<string, Term>
    assert.deepEqual(Object.keys(stated), Object.keys(WEIGHTS[part]), part)
    for (const [name, term] of Object.entries(stated)) {
      assert.equal(typeof term.achieved, 'number', `${part}.${name}`)
      assert.equal(typeof term.attempted, 'number', `${part}.${name}`)
      assert.ok(term.achieved <= term.attempted, `${part}.${name} achieved more than it attempted`)
      assert.ok(term.achieved >= 0, `${part}.${name}`)
    }
  }

  // And every rated term reports the same pair, with its weight, so a scorecard shows the
  // arithmetic rather than only its result.
  const rating = rated(worked('completed'))
  for (const part of PART_NAMES) {
    assert.deepEqual(
      rating.parts[part].terms.map((term) => [term.term, term.weight]),
      Object.entries(WEIGHTS[part]),
      part,
    )
  }
})

test("8. NO term is computed from the absence of a row (the pictures and clips shot terms read an accepted picture and take.outcome = 'accept', never degradation's or still_hold's absence, and every cut term is 0 while render.finished_at is null)", () => {
  const rows = worked('completed')
  const before = rated(rows)

  // A degradation row for the shot that never got an accepted picture: the pictures rating does
  // not move, because its shot term reads an accepted `picture` row and not the absence of a
  // `degradation` (a shot that STOPS the run writes none — stills/index.ts:514-521).
  const degraded = clone(rows)
  degraded.degradation = [
    {
      run_id: rows.run.run_id,
      shot_id: 'shot-4',
      gate: '1',
      reason: 'subject "warning_buoy" (Warning Buoy) is not shown',
    },
  ]
  assert.equal(rated(degraded).parts.pictures.rating, before.parts.pictures.rating)

  // A still_hold row for a shot whose takes all failed: the clips rating does not move, because
  // its shot term reads take.outcome = 'accept' (schema.ts:412) and not a missing still_hold —
  // a shot whose three takes failed ends the run instead (clips/index.ts:260-270).
  const held = clone(rows)
  held.still_hold = [
    {
      run_id: rows.run.run_id,
      shot_id: 'shot-4',
      attempt: 1,
      picture_id: 'a1-shot-4-a',
      probe: JSON.stringify({ readable: true, durationSeconds: 10 }),
      take_ids: JSON.stringify(['a1-shot-4-take-1', 'a1-shot-4-take-2', 'a1-shot-4-take-3']),
      reason: 'the shot reached its take cap',
    },
  ]
  assert.equal(rated(held).parts.clips.rating, before.parts.clips.rating)

  // Every take outcome away: the two outcome terms read `take.outcome = 'accept'` positively, so
  // both score 0 — while the delivery term, which reads a probe and never an outcome, still pays
  // for the seconds that were delivered (0.2 × 1.0 = 20.0). An absence pays nothing anywhere.
  const undecided = clone(rows)
  for (const take of undecided.take) take.outcome = null
  const nothingJudged = rated(undecided).parts.clips
  assert.equal(printed(nothingJudged.rating), '20.0')
  assert.deepEqual(
    nothingJudged.terms.map((term) => [term.term, term.value]),
    [
      ['takesAccepted', 0],
      ['shotsEndingAccepted', 0],
      ['deliveredWithinAsked', 1],
    ],
  )

  // render_manifest is notNull and written BEFORE the assembler is called (schema.ts:487-500), so
  // a run killed mid-assembly has a FULL manifest, no holds and no Gate 7. All three cut terms
  // are 0 while finished_at is null — reading "manifest shots with no hold" there paid 20.0 for
  // assembling nothing, the exact figure S-184 was written to abolish.
  const unfinished = clone(rows)
  const render = unfinished.render[0]
  assert.ok(render !== undefined)
  render.finished_at = null
  const killed = rated(unfinished)
  assert.equal(killed.parts.cut.reached, true)
  assert.equal(printed(killed.parts.cut.rating), '0.0')
  for (const term of killed.parts.cut.terms) assert.equal(term.value, 0, term.term)
})

test('8. the five worked fixtures rate exactly 0.0, 10.0, 10.0, 34.0 and 89.7, term by term as Gate 2 states them', () => {
  const pinned = ['0.0', '10.0', '10.0', '34.0', '89.7']
  const printedRatings: string[] = []

  for (const [i, name] of FIVE.entries()) {
    const fixture = worked(name)
    const rating = rated(fixture)
    const inputs = termInputs(fixture, TOLERANCES)

    // Term by term: the rows yield the inputs Gate 2 states, and nothing else.
    for (const part of PART_NAMES) {
      const stated = fixture.terms[part]
      if (stated === ABSENT) {
        assert.equal(rating.parts[part].reached, false, `${name}: ${part} is stated absent`)
        assert.equal(rating.parts[part].rating, ABSENT, `${name}: ${part}`)
        continue
      }
      assert.equal(rating.parts[part].reached, true, `${name}: ${part} is stated reached`)
      assert.deepEqual(inputs[part], stated, `${name}: ${part}'s inputs`)
    }

    // The part figures and the run figure, computed here from the stated inputs with the gates'
    // own arithmetic, agree with the package's to the last bit: every term and every part rating
    // is at FULL precision, and only the printed figure is rounded.
    for (const part of PART_NAMES) {
      const stated = fixture.terms[part]
      if (stated === ABSENT) continue
      assert.equal(rating.parts[part].rating, statedPart(part, stated), `${name}: ${part}`)
      assert.equal(printed(rating.parts[part].rating), fixture.expected.parts[part], `${name}`)
    }
    for (const part of PART_NAMES) {
      if (fixture.terms[part] !== ABSENT) continue
      assert.equal(fixture.expected.parts[part], ABSENT, `${name}: ${part}`)
    }

    assert.equal(rating.rating, statedRun(fixture), `${name}: the run rating`)
    assert.equal(printed(rating.rating), fixture.expected.rating, name)
    assert.equal(printed(rating.rating), pinned[i], name)
    printedRatings.push(printed(rating.rating))
  }

  assert.deepEqual(printedRatings, pinned)
})

// ---------------------------------------------------------------- check 9

test('9. an absent part scores 0 against its weight; a run that reached no part has no run rating', () => {
  const rows = worked('dead-on-first-picture')
  const rating = rated(rows)

  // Four parts absent, each scoring 0 against its weight: nothing is renormalised away (S-182),
  // so a run whose plan was perfect rates 10.0 and not 100.
  assert.deepEqual(
    PART_NAMES.map((part) => [part, printed(rating.parts[part].rating)]),
    [
      ['plan', '100.0'],
      ['pictures', '0.0'],
      ['narration', ABSENT],
      ['clips', ABSENT],
      ['cut', ABSENT],
    ],
  )
  assert.equal(printed(rating.rating), '10.0')
  for (const part of ['narration', 'clips', 'cut'] as const) {
    assert.equal(rating.parts[part].reached, false)
    assert.equal(rating.parts[part].weight, PART_WEIGHTS[part])
  }

  // A run that reached no part at all: no rating, not 0.0 — the plan stage never started.
  const nothing = clone(worked('dead-in-plan'))
  nothing.run_event = nothing.run_event.filter((row) => !String(row.body).includes('stage.started'))
  nothing.job = []
  const unrated = rated(nothing)
  assert.deepEqual(
    PART_NAMES.map((part) => unrated.parts[part].reached),
    [false, false, false, false, false],
  )
  assert.equal(unrated.rating, NO_RATING)
  assert.equal(printed(unrated.rating), NO_RATING)

  // And the run that did reach its plan stage rates 0.0 — a figure, not "no rating".
  assert.equal(printed(rated(worked('dead-in-plan')).rating), '0.0')
})

test('9. a run rated over a shorter until is labelled and never pooled with a whole reel', () => {
  // The same rows asked for the plan alone: the parts after it are absent because they were never
  // asked for, so the run rates 10.0 and the label is what stops that being read as a bad reel.
  const shorter = clone(worked('dead-on-first-picture'))
  shorter.run_event = shorter.run_event.filter((row) => !String(row.body).includes('stills'))
  shorter.job = shorter.job.filter((row) => row.kind === 'reel.plan')
  for (const column of ['request', 'request_canonical'] as const) {
    const asked = JSON.parse(String(shorter.run[column])) as { options: Record<string, unknown> }
    asked.options = { ...asked.options, until: 'plan' }
    shorter.run[column] = JSON.stringify(asked)
  }
  const planOnly = rated(shorter)
  assert.equal(planOnly.label, 'plan-only')
  assert.equal(planOnly.partial, true)
  assert.equal(printed(planOnly.rating), '10.0')
  assert.deepEqual(planOnly.partsCovered, ['plan'])

  // A resumed run carries the same mechanism: the plan it did not pay for is INHERITED and left
  // out of the run rating, so it cannot rate 70.0 for a plan it inherited (S-162, S-164).
  const resumed = JSON.parse(
    readFileSync(join(REPO, 'tests', 'fixtures', 'benchmark', 'constructed-resumed.json'), 'utf8'),
  ) as RunRows
  const inherited = rated(resumed)
  assert.equal(inherited.parts.plan.inherited, true)
  assert.equal(inherited.parts.plan.rating, INHERITED)
  assert.equal(printed(inherited.parts.plan.rating), INHERITED)
  assert.equal(inherited.label, 'resumed')
  assert.equal(inherited.partial, true)
  assert.deepEqual(inherited.partsCovered, ['pictures', 'narration', 'clips', 'cut'])
  assert.equal(typeof inherited.rating, 'number')

  // Neither is pooled with a whole reel: ranking is per label, and a whole-reel pool holds only
  // the runs that asked for a whole reel.
  const pools = rank([...FIVE.map((name) => rated(worked(name))), planOnly, inherited])
  assert.deepEqual(
    pools.map((pool) => [pool.label, pool.ranked.length]),
    [
      ['whole reel', 5],
      ['plan-only', 1],
      ['resumed', 1],
    ],
  )
  const whole = pools.find((pool) => pool.label === 'whole reel')
  assert.ok(whole !== undefined)
  assert.equal(
    whole.ranked.every((one) => one.label === 'whole reel'),
    true,
  )
  assert.equal(whole.ranked.includes(planOnly), false)
  assert.equal(whole.ranked.includes(inherited), false)

  // Every label is the scorecard's own reading of the same rows: partial and the parts covered
  // are not computed twice differently.
  for (const rows of [worked('completed'), shorter, resumed]) {
    assert.equal(rated(rows).partial, card(rows).run.partial)
    assert.deepEqual(rated(rows).partsCovered, card(rows).run.partsCovered)
  }
})

test('9. the five fixtures rank dead-in-plan < dead-on-first-picture = stopped-at-gate-1 < entered-video-made-nothing < completed, the two early deaths TYING at 10.0 while differing in their reported figures', () => {
  const ratings = FIVE.map((name) => rated(worked(name)))
  const figures = ratings.map((one) => one.rating as number)
  const [deadInPlan, deadOnFirstPicture, stoppedAtGate1, enteredVideo, completed] = figures as [
    number,
    number,
    number,
    number,
    number,
  ]

  // `<` where it orders and `≤` where it ties: the tie is correct and kept (S-182's second
  // amendment), because both early deaths achieved nothing in the parts they reached.
  assert.ok(deadInPlan < deadOnFirstPicture)
  assert.ok(deadOnFirstPicture <= stoppedAtGate1)
  assert.ok(stoppedAtGate1 <= deadOnFirstPicture)
  assert.ok(stoppedAtGate1 < enteredVideo)
  assert.ok(enteredVideo < completed)
  assert.deepEqual(
    figures.map((one) => printed(one)),
    ['0.0', '10.0', '10.0', '34.0', '89.7'],
  )

  // Ranked ascending in one pool, ties in the order they came.
  const pools = rank(ratings)
  assert.equal(pools.length, 1)
  const pool = pools[0]
  assert.ok(pool !== undefined)
  assert.deepEqual(
    pool.ranked.map((one) => printed(one.rating)),
    ['0.0', '10.0', '10.0', '34.0', '89.7'],
  )
  assert.deepEqual(pool.unrated, [])

  // What distinguishes the two tied runs is REPORTED beside the rating and never folded into it:
  // 3 pictures judged against 0, 3 image calls against 1, 15¢ against 5¢.
  const first = card(worked('dead-on-first-picture'))
  const second = card(worked('stopped-at-gate-1'))
  assert.equal(first.parts.pictures.attempted, 0)
  assert.equal(second.parts.pictures.attempted, 3)
  assert.equal(first.parts.pictures.imageCallsUsedOfSix, 1)
  assert.equal(second.parts.pictures.imageCallsUsedOfSix, 3)
  const cents = (sheet: ReturnType<typeof card>) =>
    Number(sheet.run.costCents.image) + Number(sheet.run.costCents.lost)
  assert.equal(cents(first), 5)
  assert.equal(cents(second), 15)
  assert.notDeepEqual(
    [first.parts.pictures.attempted, cents(first)],
    [second.parts.pictures.attempted, cents(second)],
  )
})

test("9. the stopped-at-gate-1 fixture is the canonical picture's three failures on ONE shot, the only shape stills/index.ts:514-521 can produce", () => {
  const rows = worked('stopped-at-gate-1')

  // Three pictures judged, all of them the canonical entry's, all on one shot, none accepted.
  assert.equal(rows.picture.length, 3)
  assert.deepEqual([...new Set(rows.picture.map((one) => one.role))], ['canonical'])
  assert.deepEqual([...new Set(rows.picture.map((one) => one.shot_unit))], [0])
  for (const one of rows.picture) {
    assert.equal((JSON.parse(String(one.gate1)) as { outcome: string }).outcome, 'fail')
  }
  // The stop writes NO degradation row: that site returns stopped-rule without calling degrade().
  assert.deepEqual(rows.degradation, [])

  // And the engine can produce no other shape: the D-047 stop is the CANONICAL picture's and
  // fires before any derived picture is attempted. Read from the source, so a rewrite of that
  // site turns this check red rather than leaving a fixture nobody can reach (S-124's rule).
  const stills = readFileSync(
    join(REPO, 'packages', 'pipeline', 'src', 'stills', 'index.ts'),
    'utf8',
  )
  assert.match(
    stills,
    /Three failures on one entry: the run stops for the rule, before any derived picture is/,
  )
  assert.match(
    stills,
    /the canonical picture of \$\{shotIdOf\(canonical\.shotUnit\)\} failed Gate 1 three times \(D-047\)/,
  )
  // A derived picture that fails takes one repair and degrades, and never stops a run.
  assert.match(stills, /degrade\(\s*placement,\s*'1',/)

  // The fixture's own ending says the same thing, in the engine's words.
  const ending = JSON.parse(String(rows.run.result)) as { rule?: string; detail?: string }
  assert.equal(ending.rule, 'gate-1')
  assert.match(String(ending.detail), /^the canonical picture of shot-0 failed Gate 1 three times/)

  // Two shots accepted and a third stopping the run — the version that rated 24.4 — is a state
  // the engine cannot produce, so no fixture of this feature holds one.
  assert.equal(printed(rated(rows).rating), '10.0')
})

test('9. entered-video-made-nothing scores clips 0.0 and cut 0.0 rather than the 30.0 and 20.0 the struck phrasing paid it', () => {
  const rows = worked('entered-video-made-nothing')
  const rating = rated(rows)

  // The part was reached — a reel.clips job row and a reel.assemble job row — and nothing was
  // made in it: no narration row, no take row, no render row.
  for (const part of ['narration', 'clips', 'cut'] as const) {
    assert.equal(rating.parts[part].reached, true, part)
    assert.equal(printed(rating.parts[part].rating), '0.0', part)
  }
  assert.deepEqual(rows.narration, [])
  assert.deepEqual(rows.take, [])
  assert.deepEqual(rows.render, [])

  // The two absences the struck terms read are still absent here, and pay nothing: "shots not
  // held at the take cap" paid clips 30.0 and "no holds" paid the cut 20.0, which is
  // 0.3 × 30 + 0.2 × 20 = 13.0 points of run rating — 47.0 instead of 34.0.
  assert.deepEqual(rows.still_hold, [])
  assert.deepEqual(rows.hold, [])
  assert.equal(printed(rating.rating), '34.0')
  assert.equal(printed(0.3 * 30 + 0.2 * 20), '13.0')
})

test('9. two runs with identical verdicts and different endings have identical part ratings and different reported yield', () => {
  const rows = worked('completed')
  const ended = clone(rows)
  const result = JSON.parse(String(ended.run.result)) as Record<string, unknown>
  delete result.video
  result.status = 'stopped'
  result.rule = 'gate-7'
  ended.run.result = JSON.stringify(result)

  // Every gate verdict is byte-identical, so every part rating is identical.
  assert.deepEqual(
    ended.take.map((take) => take.verdicts),
    rows.take.map((take) => take.verdicts),
  )
  for (const part of PART_NAMES) {
    assert.equal(rated(ended).parts[part].rating, rated(rows).parts[part].rating, part)
  }
  assert.equal(rated(ended).rating, rated(rows).rating)

  // The yield is reported beside the rating, and no single number is allowed to hide it.
  assert.equal(card(rows).run.reel.madeAFile, true)
  assert.equal(card(ended).run.reel.madeAFile, false)
})

// ---------------------------------------------------------------- check 10

test("10. a rating carries version r1 and its run's Gate 7 question-set hash", () => {
  const completed = rated(worked('completed'))
  assert.equal(completed.version, 'r1')
  assert.equal(RATING_VERSION, 'r1')

  // The hash is the injected one over the question-set input, which is the questions the run was
  // asked, in order. S-158 removed Gate 7's fifth question, so this is what keeps two cut ratings
  // off one scale when the set moved.
  const questions = card(worked('completed')).parts.cut.questionSetHash
  assert.equal(completed.questionSetHash, questions)
  assert.match(String(questions), /^stub:\[/)
  assert.equal(completed.stamp, `r1/${String(questions)}`)

  // No Gate 7, no question set: the stamp reads r1/— and never a hash of nothing.
  for (const name of ['dead-in-plan', 'dead-on-first-picture', 'stopped-at-gate-1'] as const) {
    const rating = rated(worked(name))
    assert.equal(rating.questionSetHash, ABSENT, name)
    assert.equal(rating.stamp, 'r1/—', name)
  }

  // The package hashes nothing itself: `benchmark-no-io` forbids it node:crypto, so ratings.ts is
  // handed a hash exactly as the brief key's input is (round 4's finding).
  const text = readFileSync(join(REPO, 'packages', 'benchmark', 'src', 'ratings.ts'), 'utf8')
  assert.doesNotMatch(text, /from '(node:)?crypto'/)
  assert.doesNotMatch(text, /createHash/)
})

test("10. the refusal to compare is scoped to the CUT rating, the only one S-158's change moved, so two runs whose cut question-sets differ cannot have their cut ratings compared while their run ratings still rank and still enter the ledger", () => {
  const rows = worked('completed')
  const moved = clone(rows)
  const render = moved.render[0]
  assert.ok(render !== undefined)
  const gate7 = JSON.parse(String(render.gate7)) as {
    answer: Array<{ question: string; answer: string }>
  }
  // S-158's removed fifth question, back on one of the two runs: a different question set.
  gate7.answer = [
    ...gate7.answer,
    { question: 'Does the reel answer the question it opened with?', answer: 'yes' },
  ]
  render.gate7 = JSON.stringify(gate7)

  const a = rated(rows)
  const b = rated(moved)
  assert.notEqual(a.stamp, b.stamp)

  const refused = cutRatingsComparable(a, b)
  assert.equal(refused.comparable, false)
  assert.match(refused.why, /question set/)
  // The same question set compares.
  assert.equal(cutRatingsComparable(a, rated(clone(rows))).comparable, true)
  // And a cut nobody judged is on no scale at all.
  assert.equal(cutRatingsComparable(a, rated(worked('dead-in-plan'))).comparable, false)

  // The refusal is the CUT rating's alone: both run ratings are figures, they still rank, and
  // both still enter the ledger.
  assert.equal(typeof a.rating, 'number')
  assert.equal(typeof b.rating, 'number')
  const pools = rank([a, b])
  assert.equal(pools.length, 1)
  assert.equal(pools[0]?.ranked.length, 2)
})

test("10. ranking is not comparing — check 9's five fixtures carry four r1/— stamps and one hashed stamp and rank regardless", () => {
  const ratings = FIVE.map((name) => rated(worked(name)))
  const stamps = ratings.map((one) => one.stamp)
  assert.equal(stamps.filter((stamp) => stamp === 'r1/—').length, 4)
  assert.equal(stamps.filter((stamp) => stamp !== 'r1/—').length, 1)
  for (const [i, name] of FIVE.entries()) {
    const stamp = worked(name).expected.stamp
    if (stamp === 'r1/—') assert.equal(stamps[i], 'r1/—', name)
    else assert.match(String(stamps[i]), /^r1\/stub:\[/, name)
  }

  // Four of the five cannot have their cut ratings compared with anything, and all five rank.
  for (const one of ratings.slice(0, 4)) {
    assert.equal(cutRatingsComparable(one, ratings[4] as RunRating).comparable, false)
  }
  const pools = rank(ratings)
  assert.equal(pools.length, 1)
  assert.deepEqual(
    pools[0]?.ranked.map((one) => printed(one.rating)),
    ['0.0', '10.0', '10.0', '34.0', '89.7'],
  )
})

// ---------------------------------------------------------------- the fixtures themselves
//
// Check 12 asserts the placeholder rule over `tests/fixtures/benchmark/*.json`, which is the
// corpus directory itself and not this subdirectory. The five worked fixtures live in `ratings/`
// because Slice 1's check 4 pins the corpus's brief groups BY COUNT —
// `yield-benchmark-measures.test.ts:693`, `assert.equal(groups.size, 9)` over the ten files in
// that directory — and five more files there makes it 11, red, with no amendment listed for this
// slice (measured, not assumed). Reported as a finding rather than worked around by weakening a
// committed check. So the same rule, in its stronger form, is asserted here over the files this
// slice adds.

test('the five worked fixtures state their inputs, and every path-shaped value in them is exactly the placeholder', () => {
  const PLACEHOLDER = '<artifact>'
  const PATH_FIELDS = /(?:^|\.)(path|clipPath|narrationPath|paths|file|filePath|out|outPath)$/
  const MACHINE: ReadonlyArray<readonly [RegExp, string]> = [
    [/[A-Za-z]:[\\/]{1,2}(Users|Program|Windows)/, 'a Windows drive-letter path'],
    [/\/Volumes\//, 'a macOS volume path'],
    [/\/Users\/[A-Za-z]/, 'a macOS or Linux home path'],
    [/\/home\/[a-z]/, 'a Linux home path'],
    [/\.artifacts[\\/]/, "a path under this repository's artifact root"],
  ]

  /** Every string, including the ones inside a column that holds JSON text (check 12's reader). */
  const strings = (value: unknown, at: string, found: Array<[string, string]>): void => {
    if (typeof value === 'string') {
      found.push([at, value])
      const trimmed = value.trim()
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
          strings(JSON.parse(value), at, found)
        } catch {
          /* a column that merely looks like JSON */
        }
      }
      return
    }
    if (Array.isArray(value)) {
      value.forEach((item, i) => strings(item, `${at}[${i}]`, found))
      return
    }
    if (value !== null && typeof value === 'object') {
      for (const [key, child] of Object.entries(value)) strings(child, `${at}.${key}`, found)
    }
  }

  const files = readdirSync(FIXTURES).filter((name) => name.endsWith('.json'))
  assert.deepEqual(files.sort(), FIVE.map((name) => `constructed-${name}.json`).sort())

  const offenders: string[] = []
  for (const file of files) {
    const fixture = JSON.parse(readFileSync(join(FIXTURES, file), 'utf8')) as Worked
    // Constructed by hand, and saying so: a pinned value must be computed from stated inputs.
    assert.match(fixture.about, /CONSTRUCTED BY HAND/, file)
    assert.ok(fixture.what.length > 0, file)
    for (const part of PART_NAMES) assert.ok(fixture.terms[part] !== undefined, `${file} ${part}`)

    const found: Array<[string, string]> = []
    strings(fixture, '', found)
    for (const [at, value] of found) {
      if (PATH_FIELDS.test(at) && value !== PLACEHOLDER) {
        offenders.push(`${file}${at} is ${JSON.stringify(value)}, not ${PLACEHOLDER}`)
      }
      for (const [pattern, what] of MACHINE) {
        if (pattern.test(value)) offenders.push(`${file}${at} holds ${what}`)
      }
    }
  }
  assert.deepEqual(offenders, [], offenders.join('\n'))
})

test('a part is reached, and inherited, by the same rule the scorecard reads it by', () => {
  // ratings.ts reads reached and inherited from the rows itself, so the rule is stated twice —
  // here is what keeps the two readings from drifting apart, over every committed fixture.
  const corpus = join(REPO, 'tests', 'fixtures', 'benchmark')
  const rows: Array<{ name: string; rows: RunRows }> = [
    ...readdirSync(corpus)
      .filter((name) => name.endsWith('.json'))
      .map((name) => ({
        name,
        rows: JSON.parse(readFileSync(join(corpus, name), 'utf8')) as RunRows,
      })),
    ...FIVE.map((name) => ({ name, rows: worked(name) as RunRows })),
  ]

  for (const one of rows) {
    const rating = rated(one.rows)
    const sheet = card(one.rows)
    for (const part of PART_NAMES) {
      assert.equal(rating.parts[part].reached, sheet.parts[part].reached, `${one.name} ${part}`)
    }
    // The scorecard reports an inherited part by reading its span as 'inherited, not measured'.
    assert.equal(rating.parts.plan.inherited, sheet.parts.plan.inherited, one.name)
    for (const part of ['pictures', 'narration', 'clips'] as const) {
      assert.equal(
        rating.parts[part].inherited,
        sheet.parts[part].span.rule === INHERITED,
        `${one.name} ${part}`,
      )
    }
    assert.equal(rating.parts.cut.inherited, false, one.name)
  }
})
