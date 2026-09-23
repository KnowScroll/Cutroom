import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { LanguageModelPort, PlanSettings } from '@cutroom/contracts'
import { DEFAULT_PLAN_SETTINGS } from '@cutroom/pipeline'
// Not exported from the pipeline's index; reached by path, as reel-plan's tests reach the splitter.
import { imagePrompt, pictureEntry } from '../packages/pipeline/src/stills/prompts.ts'
import { finished, startEngine } from './engine/harness.ts'
import {
  CANONICAL_ONLY,
  NEVER,
  NO_RECURRENCE,
  again,
  assertDegraded,
  pictureOf,
  showsPerson,
  stills,
  stillsRequest,
  stillsScript,
  type Pic,
  type PictureRow,
  type Stilled,
} from './engine/stills.ts'
import { takesOf, video, videoRequest, videoScript } from './engine/video.ts'

// three-pictures, Slice 2 and 3 — checks 6 to 11 (docs/features/three-pictures.md): the standalone
// picture, made from scratch on a shot naming no pictured subject, through Gate 1 and one repair and
// never Gate 1S; placed by the rule stored WITH the plan, whichever worker makes it; and opening its
// shot with image-to-video (S-150). Every expectation is typed by hand.

const UP_TO_THREE: PlanSettings = { ...DEFAULT_PLAN_SETTINGS, pictures: 'upToThree' }
const [SEAL, HALL, KING] = NO_RECURRENCE.subjects as [
  (typeof NO_RECURRENCE.subjects)[number],
  (typeof NO_RECURRENCE.subjects)[number],
  (typeof NO_RECURRENCE.subjects)[number],
]

/** A picture of the fixtures, by hand: its shot, label, subjects and the criteria S-040 routes to it. */
const pic = (unit: number, label: string, subjects: Pic['subjects'], mustShow: string[]): Pic => ({
  key: `shot-${unit}-${label}`,
  unit,
  label,
  subjects,
  mustShow,
  mustNotShow: [...NEVER],
})

/** NO_RECURRENCE under 'upToThree': a standalone on each of shots 0, 1 and 2. */
const S0 = pic(0, 'single', [SEAL], ['show-seal'])
const S1 = pic(1, 'single', [HALL], ['show-crowd'])
const S2 = pic(2, 'single', [KING], [])

const calls = (engine: { image: { calls: ReadonlyArray<{ pictureId: string }> } }) =>
  engine.image.calls.map((c) => c.pictureId)

const stilled = (ran: Stilled) =>
  (ran.result.stills as Array<{ pictureId: string; shotId: string }>).map(
    (s) => `${s.shotId} ${s.pictureId}`,
  )

// ---------------------------------------------------------------- 6

test("6. a keyframes job run by a worker whose setting differs from the planning worker's places pictures by the PLAN'S rule, in both directions, and its image calls equal the plan's planned calls", async () => {
  /** Plans under `planning`, stops the worker between the plan job and the keyframes job, then makes the pictures under `making`. */
  async function across(planning: PlanSettings, making: PlanSettings, pics: Pic[], id: string) {
    let planned = 0
    let reached!: () => void
    const reachedLast = new Promise<void>((resolve) => (reached = resolve))
    let release!: () => void
    const released = new Promise<void>((resolve) => (release = resolve))
    const hold = (model: LanguageModelPort): LanguageModelPort => ({
      async structured(call) {
        if (call.role === 'planner' && ++planned === 2) {
          reached()
          await released
        }
        return model.structured(call)
      },
      observe: (call) => model.observe(call),
      compare: (call) => model.compare(call),
      judgeCut: (call) => model.judgeCut(call),
      readText: (call) => model.readText(call),
    })
    const engine = await startEngine({
      worker: true,
      settings: planning,
      script: stillsScript(NO_RECURRENCE, pics),
      wrapModel: hold,
    })
    try {
      const submitted = await engine.http.submit(stillsRequest(id))
      assert.equal(submitted.status, 202)
      const runId = String(submitted.json.runId)
      await reachedLast
      const stopping = engine.stopWorker()
      release()
      await stopping
      await engine.startWorker({ settings: making })
      await finished(engine, runId)
      const plan = engine.query<{ plan: string }>(
        'SELECT plan FROM plan WHERE run_id = ? AND selected = 1',
        runId,
      )[0]
      assert.ok(plan !== undefined, 'no selected plan')
      return { plan: JSON.parse(plan.plan) as { plannedImageCalls: number }, calls: calls(engine) }
    } finally {
      release()
      await engine.stop()
    }
  }

  // Planned under the default, made by a worker set to 'upToThree': no picture — the plan's rule.
  const off = await across(DEFAULT_PLAN_SETTINGS, UP_TO_THREE, [], 'r6-planned-off')
  assert.equal(off.plan.plannedImageCalls, 0)
  assert.deepEqual(off.calls, [], 'a worker set to upToThree placed pictures the plan never priced')

  // Planned under 'upToThree', made by a worker on the default: three standalones — the plan's rule.
  const on = await across(UP_TO_THREE, DEFAULT_PLAN_SETTINGS, [S0, S1, S2], 'r6-planned-on')
  assert.equal(on.plan.plannedImageCalls, 3)
  assert.deepEqual(on.calls, ['a1-shot-0-single', 'a1-shot-1-single', 'a1-shot-2-single'])
})

// ---------------------------------------------------------------- 7

test('7. a standalone entry has no varyOn and renders with no framing line and no reference line; a standalone entry carrying varyOn is refused', () => {
  const fields = {
    shotId: 'shot-1',
    style: { id: 'style-1', version: 1, text: 'quiet, precise, natural light' },
    subjects: ['a brass lamp'],
    sentences: ['A lamp was lit at dusk.'],
    mustShow: [{ id: 'show-lamp', text: 'a lighthouse lamp' }],
    mustNotShow: [],
    aspectRatio: '9:16',
  }
  const entry = pictureEntry.parse({ role: 'standalone', ...fields })
  const prompt = imagePrompt(entry, null)
  assert.ok(!/^Framing:/m.test(prompt), 'a standalone prompt names a framing')
  assert.ok(!prompt.includes('reference picture'), 'a standalone prompt refers to a reference')
  assert.ok(prompt.includes('It shows: a brass lamp.'))
  assert.throws(() => pictureEntry.parse({ role: 'standalone', ...fields, varyOn: 'framing' }))

  // The derived prompt still carries its reference line, and the canonical its framing (unchanged).
  const derived = imagePrompt(pictureEntry.parse({ role: 'derived', ...fields }), null)
  assert.ok(derived.includes('Keep every subject exactly as it appears in the reference picture.'))
  const canonical = imagePrompt(
    pictureEntry.parse({ role: 'canonical', ...fields, varyOn: 'framing' }),
    'medium',
  )
  assert.ok(canonical.includes('Framing: medium.'))
})

// ---------------------------------------------------------------- 8

test("8. a stills run with 'upToThree' on a plan whose subjects never recur makes three standalone pictures, labelled single, each with references [], each through Gate 1, makes no compare call and no best-of-2, and approves each on its shot", async () => {
  const engine = await startEngine({
    worker: true,
    settings: UP_TO_THREE,
    script: stillsScript(NO_RECURRENCE, [S0, S1, S2]),
  })
  try {
    const ran = await stills(engine, stillsRequest('r8'))
    assert.equal(ran.result.status, 'completed', JSON.stringify(ran.result))
    assert.deepEqual(calls(engine), ['a1-shot-0-single', 'a1-shot-1-single', 'a1-shot-2-single'])
    for (const call of engine.image.calls) {
      assert.deepEqual(call.references, [], `${call.pictureId} was made from a reference`)
    }
    for (const p of [S0, S1, S2]) {
      const row: PictureRow = pictureOf(ran, p.key)
      assert.equal(row.role, 'standalone')
      assert.equal(row.label, 'single')
      assert.equal(row.framing, null)
      assert.deepEqual(row.reference_ids, [])
      assert.deepEqual(
        row.gate1?.steps.map((s) => s.step),
        ['technical', 'text', 'witness', 'reconcile'],
      )
      assert.equal(row.gate1?.outcome, 'accept')
      assert.equal(row.gate1s, null, `${row.picture_id} went through Gate 1S`)
      assert.equal(row.chosen, true)
    }
    assert.equal(engine.model.compareCalls.length, 0, 'a compare call was made')
    assert.deepEqual(stilled(ran), [
      'shot-0 a1-shot-0-single',
      'shot-1 a1-shot-1-single',
      'shot-2 a1-shot-2-single',
    ])
    assert.deepEqual(ran.degradations, [])
  } finally {
    await engine.stop()
  }
})

// ---------------------------------------------------------------- 9

test("9. a standalone failing Gate 1 takes one repair from the reserve, labelled repair, made with references [] and told Gate 1's reasons; failing again, its shot is degraded in the four places and the run goes on; with no slot free it is degraded at once", async () => {
  // A slot is free, and the repair passes.
  const R1 = again(S1, 'repair')
  const repaired = await startEngine({
    worker: true,
    settings: UP_TO_THREE,
    script: stillsScript(NO_RECURRENCE, [S0, S1, R1, S2], {
      reconciler: { [S1.key]: showsPerson(S1) },
    }),
  })
  try {
    const ran = await stills(repaired, stillsRequest('r9-repaired'))
    assert.equal(ran.result.status, 'completed', JSON.stringify(ran.result))
    assert.deepEqual(calls(repaired), [
      'a1-shot-0-single',
      'a1-shot-1-single',
      'a1-shot-1-repair',
      'a1-shot-2-single',
    ])
    const single = pictureOf(ran, S1.key)
    const repair = pictureOf(ran, R1.key)
    assert.equal(single.gate1?.outcome, 'fail')
    assert.equal(repair.role, 'standalone')
    assert.deepEqual(repair.reference_ids, [])
    assert.deepEqual(repaired.image.calls[2]?.references, [])
    const reasons = (single.gate1?.steps ?? [])
      .filter((s) => s.outcome === 'fail')
      .flatMap((s) => s.reasons)
    assert.match(reasons.join(' | '), /never-person/)
    assert.ok(
      repair.prompt.startsWith(`${single.prompt}\n`),
      "the repair is not its entry's prompt",
    )
    for (const reason of reasons) assert.ok(repair.prompt.includes(reason), reason)
    assert.deepEqual([single.chosen, repair.chosen], [false, true])
    assert.deepEqual(stilled(ran), [
      'shot-0 a1-shot-0-single',
      'shot-1 a1-shot-1-repair',
      'shot-2 a1-shot-2-single',
    ])
  } finally {
    await repaired.stop()
  }

  // The repair fails too: its shot goes on without a picture, labelled in four places.
  const failing = await startEngine({
    worker: true,
    settings: UP_TO_THREE,
    script: stillsScript(NO_RECURRENCE, [S0, S1, R1, S2], {
      reconciler: { [S1.key]: showsPerson(S1), [R1.key]: showsPerson(R1) },
    }),
  })
  try {
    const ran = await stills(failing, stillsRequest('r9-repair-fails'))
    assert.equal(ran.result.status, 'completed', JSON.stringify(ran.result))
    assertDegraded(ran, {
      shotId: 'shot-1',
      gate: '1',
      last: 'a1-shot-1-repair',
      pictures: ['a1-shot-1-single', 'a1-shot-1-repair'],
    })
    assert.deepEqual(stilled(ran), ['shot-0 a1-shot-0-single', 'shot-2 a1-shot-2-single'])
  } finally {
    await failing.stop()
  }

  // No slot free. CANONICAL_ONLY under 'upToThree': the seal's canonical on shot 0, standalones on
  // shot 1 (hall) and shot 3 (king) — 4 calls, a reserve of 2. Both canonical candidates fail, so the
  // canonical's repair takes a slot (D-048: it has first claim); the hall fails and its repair takes
  // the last, and fails; the king then fails with no slot free and is degraded at once.
  const A = pic(0, 'a', [SEAL], ['show-seal'])
  const B = pic(0, 'b', [SEAL], ['show-seal'])
  const CR = again(A, 'repair')
  const H = pic(1, 'single', [HALL], ['show-crowd'])
  const HR = again(H, 'repair')
  const K = pic(3, 'single', [KING], ['show-crowd'])
  const exhausted = await startEngine({
    worker: true,
    settings: UP_TO_THREE,
    script: stillsScript(CANONICAL_ONLY, [A, B, CR, H, HR, K], {
      reconciler: {
        [A.key]: showsPerson(A),
        [B.key]: showsPerson(B),
        [H.key]: showsPerson(H),
        [HR.key]: showsPerson(HR),
        [K.key]: showsPerson(K),
      },
    }),
  })
  try {
    const ran = await stills(exhausted, stillsRequest('r9-no-slot'))
    assert.equal(ran.result.status, 'completed', JSON.stringify(ran.result))
    assert.deepEqual(calls(exhausted), [
      'a1-shot-0-a',
      'a1-shot-0-b',
      'a1-shot-0-repair',
      'a1-shot-1-single',
      'a1-shot-1-repair',
      'a1-shot-3-single',
    ])
    assertDegraded(ran, {
      shotId: 'shot-3',
      gate: '1',
      last: 'a1-shot-3-single',
      pictures: ['a1-shot-3-single'],
    })
    assert.match(
      String(ran.degradations.find((d) => d.shot_id === 'shot-3')?.reason),
      /no reserve slot is free/,
    )
    assert.deepEqual(stilled(ran), ['shot-0 a1-shot-0-repair'])
  } finally {
    await exhausted.stop()
  }
})

// ---------------------------------------------------------------- 10

test("10. a stills run with 'upToThree' on a plan with one recurring subject makes its canonical best-of-2 first and its standalone pictures after, each standalone with references [] and no compare call made for it, and the image calls equal the placement's", async () => {
  const A = pic(0, 'a', [SEAL], ['show-seal'])
  const B = pic(0, 'b', [SEAL], ['show-seal'])
  const H = pic(1, 'single', [HALL], ['show-crowd'])
  const K = pic(3, 'single', [KING], ['show-crowd'])
  const engine = await startEngine({
    worker: true,
    settings: UP_TO_THREE,
    script: stillsScript(CANONICAL_ONLY, [A, B, H, K]),
  })
  try {
    const ran = await stills(engine, stillsRequest('r10'))
    assert.equal(ran.result.status, 'completed', JSON.stringify(ran.result))
    assert.deepEqual(calls(engine), [
      'a1-shot-0-a',
      'a1-shot-0-b',
      'a1-shot-1-single',
      'a1-shot-3-single',
    ])
    assert.deepEqual(
      [A, B, H, K].map((p) => pictureOf(ran, p.key).role),
      ['canonical', 'canonical', 'standalone', 'standalone'],
    )
    assert.deepEqual(engine.image.calls[2]?.references, [])
    assert.deepEqual(engine.image.calls[3]?.references, [])
    assert.equal(engine.model.compareCalls.length, 0, 'a compare call was made')
    assert.equal(pictureOf(ran, H.key).gate1s, null)
    assert.equal(pictureOf(ran, K.key).gate1s, null)
  } finally {
    await engine.stop()
  }
})

// ---------------------------------------------------------------- 11

test("11. a video run with 'upToThree' opens each shot holding an approved standalone picture with image-to-video from it, and every other shot with text-to-video", async () => {
  const engine = await startEngine({
    worker: true,
    settings: UP_TO_THREE,
    script: videoScript(NO_RECURRENCE, [S0, S1, S2]),
  })
  try {
    const ran = await video(engine, videoRequest('r11'))
    assert.ok(
      ran.jobs.some((j) => j.kind === 'reel.assemble'),
      `the clips stage did not complete: ${JSON.stringify(ran.result)}`,
    )
    const modes = new Map(ran.videoReceipts.map((r) => [r.take_id.replace(/^a\d+-/, ''), r.mode]))
    assert.equal(takesOf(NO_RECURRENCE).length, 6)
    assert.deepEqual(
      [0, 1, 2, 3, 4, 5].map((unit) => modes.get(`shot-${unit}-take-1`)),
      [
        'image-to-video',
        'image-to-video',
        'image-to-video',
        'text-to-video',
        'text-to-video',
        'text-to-video',
      ],
    )
  } finally {
    await engine.stop()
  }
})
