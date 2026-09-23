import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import type { Plan, PlanSettings } from '@cutroom/contracts'
import {
  DEFAULT_PLAN_SETTINGS,
  DEFAULT_RENDER_SETTINGS,
  admitPictures,
  admitVideo,
  gate0,
  placePictures,
  planReel,
  plannedImageCalls,
  rankSubjects,
  type PlanOutcome,
} from '@cutroom/pipeline'
import {
  fakeImage,
  fakeModel,
  fakeNarration,
  fakeSensors,
  fakeVideo,
  ffmpegAssembler,
  ffmpegMedia,
  ffmpegTools,
} from '@cutroom/providers'
import { banner, readSettings } from '@cutroom/service'
import { startWorker } from '@cutroom/worker'
// Not exported from the pipeline's index (Gate 3); reached by path, as reel-plan's tests reach the
// splitter.
import { placementCalls, plannedImageCallsFor } from '../packages/pipeline/src/stills/ladder.ts'
import { planRequest, standIn } from './engine/plans.ts'
import {
  BOTH_SHARE,
  CANONICAL_ONLY,
  FIRST_SHOT_HELD,
  FOUR_RANKS,
  NO_RECURRENCE,
  RANK_ALL_HELD,
  RANK_NOT_SHOT,
  THREE_RANKS,
  TWO_SHARED,
  plannerFor,
  type Shape,
} from './engine/stills.ts'

// three-pictures, Slice 1 — checks 1 to 5 (docs/features/three-pictures.md): the setting, the rule
// stored with the plan, placement and price (S-150). Every expectation is typed by hand, and check 1
// holds today's placement as a verbatim copy, so a default path that moved fails it.

const SHAPES: ReadonlyArray<readonly [string, Shape]> = [
  ['THREE_RANKS', THREE_RANKS],
  ['FIRST_SHOT_HELD', FIRST_SHOT_HELD],
  ['RANK_ALL_HELD', RANK_ALL_HELD],
  ['CANONICAL_ONLY', CANONICAL_ONLY],
  ['NO_RECURRENCE', NO_RECURRENCE],
  ['FOUR_RANKS', FOUR_RANKS],
  ['RANK_NOT_SHOT', RANK_NOT_SHOT],
  ['TWO_SHARED', TWO_SHARED],
  ['BOTH_SHARE', BOTH_SHARE],
]

const UP_TO_THREE: PlanSettings = { ...DEFAULT_PLAN_SETTINGS, pictures: 'upToThree' }
const CAP = 300

const planOf = (shape: Shape, pictures?: 'upToThree') => ({
  shots: shape.shown.map((subjectIds, unit) => ({ unit, durationSeconds: 7, subjectIds })),
  subjects: shape.subjects,
  ...(pictures === undefined ? {} : { pictures }),
})

/** TODAY'S PLACEMENT, verbatim from before S-150 — the oracle check 1 holds the default path to. */
function placedBefore(plan: Pick<Plan, 'shots' | 'subjects'>) {
  const held = new Set<number>()
  const placed: Array<{ subjectId: string; shotUnit: number; role: 'canonical' | 'derived' }> = []
  rankSubjects(plan)
    .slice(0, 3)
    .forEach((subjectId, rank) => {
      const shot = plan.shots.find((s) => s.subjectIds.includes(subjectId) && !held.has(s.unit))
      if (shot === undefined) return
      held.add(shot.unit)
      placed.push({ subjectId, shotUnit: shot.unit, role: rank === 0 ? 'canonical' : 'derived' })
    })
  return placed
}

/** The 6-unit plan of a shape, planned by the real stage against the stand-in (it survives alone). */
async function planned(shape: Shape, settings: PlanSettings): Promise<Plan> {
  const outcome: PlanOutcome = await planReel(
    planRequest('three-pictures'),
    standIn({ planner: plannerFor(shape) }),
    CAP,
    settings,
  )
  assert.equal(outcome.kind, 'selected', JSON.stringify(outcome))
  if (outcome.kind !== 'selected') throw new Error('unreachable')
  assert.equal(outcome.selected, 'b', 'the fixture no longer selects its 6-unit plan')
  return outcome.fork.b
}

// ---------------------------------------------------------------- 1

test("1. with the setting off, placePictures and the plan stage's planned image calls equal today's on every fixture shape — including RANK_ALL_HELD's 4 planned calls against its placement's 3; DEFAULT_PLAN_SETTINGS.pictures is 'recurring'; and a plan built with it off carries no pictures field", async () => {
  assert.equal(DEFAULT_PLAN_SETTINGS.pictures, 'recurring')
  for (const [name, shape] of SHAPES) {
    assert.deepEqual(placePictures(planOf(shape)), placedBefore(planOf(shape)), name)

    const plan = await planned(shape, DEFAULT_PLAN_SETTINGS)
    assert.ok(!('pictures' in plan), `${name}: a default plan carries a pictures field`)
    assert.equal(
      plan.plannedImageCalls,
      plannedImageCalls(rankSubjects(plan)),
      `${name}: the default plan's calls are not D-027's`,
    )
    assert.deepEqual(placePictures(plan), placedBefore(plan), `${name}: the planned placement`)
  }
  // S-039's case, where the two counts differ and must go on differing (reel-stills-placing check 14).
  const allHeld = await planned(RANK_ALL_HELD, DEFAULT_PLAN_SETTINGS)
  assert.equal(allHeld.plannedImageCalls, 4)
  assert.equal(placementCalls(placePictures(allHeld)), 3)
})

// ---------------------------------------------------------------- 2

test("2. with 'upToThree', a plan whose subjects never recur places three standalone pictures on its three earliest shots, each on the shot's first subject, and plans 3 image calls", () => {
  const plan = planOf(NO_RECURRENCE, 'upToThree')
  assert.deepEqual(placePictures(plan), [
    { subjectId: 'seal', shotUnit: 0, role: 'standalone' },
    { subjectId: 'hall', shotUnit: 1, role: 'standalone' },
    { subjectId: 'king', shotUnit: 2, role: 'standalone' },
  ])
  assert.equal(plannedImageCallsFor(plan), 3)
})

// ---------------------------------------------------------------- 3

test("3. with 'upToThree', recurring subjects are placed exactly as with the setting off; standalone pictures fill only the earliest shots holding none and naming no pictured subject, up to three pictures; a shot naming no subject is skipped; placementCalls counts canonical 2, derived 1 and standalone 1 exactly; planned calls are never above 4 and the reserve never below 2", () => {
  for (const [name, shape] of SHAPES) {
    const on = placePictures(planOf(shape, 'upToThree'))
    const off = placePictures(planOf(shape))
    assert.deepEqual(
      on.filter((p) => p.role !== 'standalone'),
      off,
      `${name}: the recurring placement moved`,
    )
    assert.ok(on.length <= 3, `${name}: ${on.length} pictures`)
    const calls = plannedImageCallsFor(planOf(shape, 'upToThree'))
    assert.ok(calls <= 4, `${name}: ${calls} planned calls`)
    assert.ok(6 - calls >= 2, `${name}: a reserve of ${6 - calls}`)
  }

  // CANONICAL_ONLY: the seal's canonical on shot 0 (shot 2 also shows it); shot 1 (hall) and shot 3
  // (king) are free and name no pictured subject; shots 4 and 5 name nothing.
  assert.deepEqual(placePictures(planOf(CANONICAL_ONLY, 'upToThree')), [
    { subjectId: 'seal', shotUnit: 0, role: 'canonical' },
    { subjectId: 'hall', shotUnit: 1, role: 'standalone' },
    { subjectId: 'king', shotUnit: 3, role: 'standalone' },
  ])
  // TWO_SHARED: king's canonical on shot 0 (which also shows the seal), the seal derived on shot 2 —
  // shot 1 is free but names the king, a pictured subject, so it is skipped; 3 to 5 name nothing.
  assert.deepEqual(placePictures(planOf(TWO_SHARED, 'upToThree')), [
    { subjectId: 'king', shotUnit: 0, role: 'canonical' },
    { subjectId: 'seal', shotUnit: 2, role: 'derived' },
  ])
  // A standalone's subjects become pictured, and a shot naming nothing never gets one.
  const repeated = {
    shots: [
      { unit: 0, durationSeconds: 7, subjectIds: [] },
      { unit: 1, durationSeconds: 7, subjectIds: ['lamp'] },
      { unit: 2, durationSeconds: 7, subjectIds: ['sea', 'lamp'] },
      { unit: 3, durationSeconds: 7, subjectIds: ['box'] },
    ],
    subjects: [
      { id: 'lamp', name: 'Lamp' },
      { id: 'sea', name: 'Sea' },
      { id: 'box', name: 'Box' },
    ],
    pictures: 'upToThree' as const,
  }
  // `lamp` recurs (shots 1 and 2), so it is the canonical on shot 1; shot 2 names the pictured lamp and
  // is skipped; shot 0 names nothing; shot 3 is the one free shot.
  assert.deepEqual(placePictures(repeated), [
    { subjectId: 'lamp', shotUnit: 1, role: 'canonical' },
    { subjectId: 'box', shotUnit: 3, role: 'standalone' },
  ])
  // With no recurrence, a standalone's subjects are pictured for the shots after it.
  const shared = {
    shots: [
      { unit: 0, durationSeconds: 7, subjectIds: ['sea', 'boat'] },
      { unit: 1, durationSeconds: 7, subjectIds: ['gull'] },
    ],
    subjects: [
      { id: 'sea', name: 'Sea' },
      { id: 'boat', name: 'Boat' },
      { id: 'gull', name: 'Gull' },
    ],
    pictures: 'upToThree' as const,
  }
  assert.deepEqual(placePictures(shared), [
    { subjectId: 'sea', shotUnit: 0, role: 'standalone' },
    { subjectId: 'gull', shotUnit: 1, role: 'standalone' },
  ])

  // The count, pinned for each role, so a later role cannot fall into a branch silently.
  assert.equal(placementCalls([{ subjectId: 'x', shotUnit: 0, role: 'canonical' }]), 2)
  assert.equal(placementCalls([{ subjectId: 'x', shotUnit: 0, role: 'derived' }]), 1)
  assert.equal(placementCalls([{ subjectId: 'x', shotUnit: 0, role: 'standalone' }]), 1)
})

// ---------------------------------------------------------------- 4

test("4. a plan built under 'upToThree' carries pictures: 'upToThree' and the new planned calls, and its estimate, Gate 0's cost verdict and admission price them", async () => {
  const off = await planned(NO_RECURRENCE, DEFAULT_PLAN_SETTINGS)
  const on = await planned(NO_RECURRENCE, UP_TO_THREE)
  assert.equal(on.pictures, 'upToThree')
  assert.equal(off.plannedImageCalls, 0)
  assert.equal(on.plannedImageCalls, 3)
  const rate = DEFAULT_PLAN_SETTINGS.imageRateCents
  assert.equal(on.estimateCents, off.estimateCents + 3 * rate)

  // A cap between the two: the default plan fits, the one under 'upToThree' fails on cost.
  const request = planRequest('three-pictures')
  const cap = off.estimateCents + rate
  assert.ok(!gate0(off, request, cap, DEFAULT_PLAN_SETTINGS).failed.includes('cost'))
  assert.ok(gate0(on, request, cap, UP_TO_THREE).failed.includes('cost'))

  assert.equal(admitPictures(on, 1000, UP_TO_THREE).picturesCents, 3 * rate)
  assert.equal(admitPictures(off, 1000, DEFAULT_PLAN_SETTINGS).picturesCents, 0)
  assert.equal(admitVideo(on, on.estimateCents).admitted, true)
  assert.equal(admitVideo(on, on.estimateCents - 1).admitted, false)
})

// ---------------------------------------------------------------- 5

test("5. readSettings: CUTROOM_PICTURES absent is 'recurring', 'upToThree' is accepted, anything else is refused before anything is built, and the banner prints it; a worker handed a rule outside the closed set refuses to start", async () => {
  assert.equal(readSettings({}).planSettings.pictures, 'recurring')
  assert.equal(readSettings({ CUTROOM_PICTURES: 'upToThree' }).planSettings.pictures, 'upToThree')
  for (const bad of ['UpToThree', 'three', 'all']) {
    assert.throws(
      () => readSettings({ CUTROOM_PICTURES: bad }),
      /CUTROOM_PICTURES is '.*', and a picture rule is one of 'recurring', 'upToThree'/,
      bad,
    )
  }
  assert.match(
    banner(readSettings({ CUTROOM_PICTURES: 'upToThree' }), 'http://127.0.0.1:0'),
    /^ {2}pictures {3}upToThree$/m,
  )

  const dir = mkdtempSync(join(tmpdir(), 'three-pictures-'))
  try {
    const tools = ffmpegTools()
    const options = {
      dbPath: join(dir, 'never-opened.sqlite'),
      pollMs: 10,
      model: fakeModel({}, { models: DEFAULT_PLAN_SETTINGS.models }),
      image: fakeImage({}, { artifactRoot: dir }),
      sensors: fakeSensors({}),
      video: fakeVideo(tools, {}, { artifactRoot: dir }),
      narration: fakeNarration({}, { artifactRoot: dir }),
      media: ffmpegMedia(tools, { artifactRoot: dir }),
      assembler: ffmpegAssembler(tools, { artifactRoot: dir }),
      questionsPath: join(dir, 'QUESTIONS.md'),
      renderSettings: DEFAULT_RENDER_SETTINGS,
      settings: { ...DEFAULT_PLAN_SETTINGS, pictures: 'everyShot' } as unknown as PlanSettings,
    }
    let started: Awaited<ReturnType<typeof startWorker>> | undefined
    try {
      started = await startWorker(options)
    } catch (error) {
      assert.match(String(error), /the picture rule is 'everyShot'/)
      return
    }
    await started.stop()
    assert.fail('a worker handed a picture rule outside the closed set started')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
