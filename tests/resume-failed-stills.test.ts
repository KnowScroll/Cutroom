import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import type { PictureRecord, Plan, StillsSettings } from '@cutroom/contracts'
import {
  DEFAULT_PLAN_SETTINGS,
  DEFAULT_STILLS_SETTINGS,
  makeStills,
  placePictures,
  planReel,
  type StillsOutcome,
} from '@cutroom/pipeline'
import {
  fakeImage,
  fakeModel,
  fakeSensors,
  type FakeImage,
  type FakeModel,
  type FakeScript,
  type FakeSensors,
  type FakeSensorScript,
} from '@cutroom/providers'
import type { SubmitRequest } from '@cutroom/reel-contract'
import {
  claimJob,
  closeDatabase,
  openDatabase,
  recordGeneration,
  submitRun,
  upsertPicture,
} from '../packages/domain/src/index.ts'
import { reserveOf } from '../packages/pipeline/src/stills/ladder.ts'
import { startEngine, type Engine } from './engine/harness.ts'
import { PLANNED, described, killedAgain, killedMidStills, takenUp } from './engine/restart.ts'
import {
  THREE_RANKS,
  THREE_RANKS_PICS,
  again,
  clipped,
  judged,
  plannerFor,
  showsPerson,
  stillsRequest,
  stillsScript,
  type Pic,
} from './engine/stills.ts'

// resume-failed, Slice 2 — checks 6 to 11 (docs/features/resume-failed.md): what a crash keeps in the
// stills stage (S-164, superseding S-048 in part). A keyframes attempt run again keeps every picture
// an earlier attempt DECIDED, accepted or failed — no call, no check, no receipt for it — and picks up
// at the first step not done; a picture whose checks were cut off is made again. The canonical stays
// best of two; a kept failed picture is evidence for its shot's repair; a kept repair counts; the
// reserve is 6 − earlier − unmade; and a picture's seq is the run's greatest plus one.
//
// Checks 6 and 7 go through the worker, killed inside a picture's checks. Checks 8 to 10 run the stage
// in this process: a first attempt made to the end, then a second handed some of its decided pictures
// as kept — the pictures a crash at that point would have left decided — and the image calls the
// first attempt made before that point as `earlierImageCalls`. Check 11 is the ledger's.

const [a, b, barons, hall] = THREE_RANKS_PICS as [Pic, Pic, Pic, Pic]

const failureOf = (engine: Engine, runId: string) =>
  engine.query<{ failure: string | null }>('SELECT failure FROM run WHERE run_id = ?', runId)[0]
    ?.failure

// ---------------------------------------------------------------- 6

test('6. a stills stage failing on its reserve after crashes fails its run crashed, in S-164s words: killed three times inside a pictures checks, attempt 4 answers before any call', async () => {
  const engine = await startEngine({ worker: false })
  try {
    // Held at call 7, the barons' witness: a and b decided, the barons' picture cut off. Attempts 2
    // and 3 keep a and b and make the barons' picture again, each killed at its witness.
    const first = await killedMidStills(engine, stillsRequest('rf6'), {
      script: stillsScript(THREE_RANKS, [a, b]),
      holdAtCall: 7,
      made: ['a1-shot-0-a', 'a1-shot-0-b', 'a1-shot-1-single'],
    })
    const second = await killedAgain(engine, first, {
      script: {},
      holdAtCall: 1,
      made: ['a1-shot-0-a', 'a1-shot-0-b', 'a1-shot-1-single', 'a2-shot-1-single'],
    })
    const third = await killedAgain(engine, second, {
      script: {},
      holdAtCall: 1,
      made: [
        'a1-shot-0-a',
        'a1-shot-0-b',
        'a1-shot-1-single',
        'a2-shot-1-single',
        'a3-shot-1-single',
      ],
    })
    const ran = await takenUp(engine, third, stillsScript(THREE_RANKS, THREE_RANKS_PICS))

    assert.deepEqual(ran.result, {
      contractVersion: 1,
      runId: ran.runId,
      requestId: 'rf6',
      costCents: 0,
      status: 'failed',
      detail:
        'attempt 4 cannot make its pictures within 6 image calls: the run made 5 before it and its placement makes 2 more, 7 in all (S-048)',
    })
    assert.equal(failureOf(engine, ran.runId), 'crashed')
    assert.deepEqual(engine.image.calls, [], 'an image call before the reserve was read')
    assert.deepEqual(engine.sensors.calls, [])
    assert.deepEqual(engine.model.observeCalls, [])
    assert.deepEqual(engine.model.calls, [])
  } finally {
    await engine.stop()
  }
})

// ---------------------------------------------------------------- 7

test('7. a keyframes attempt run again after a crash keeps every picture an earlier attempt decided, accepted or failed: no image call, no sensor measure, no witness or reconcile call and no receipt for it, its verdicts events once in the finishing attempt, and only the picture whose checks were cut off made again under the new attempts id and paid again', async () => {
  // Candidate a costs 7 in the first attempt, so a kept picture paid again would show.
  const engine = await startEngine({ worker: false, images: { 'a1-shot-0-a': { costCents: 7 } } })
  try {
    // Held at call 7, the barons' witness: a decided accepted, b decided FAILED (clipped), the
    // barons' picture cut off after its technical and text steps.
    const killed = await killedMidStills(engine, stillsRequest('rf7'), {
      script: stillsScript(THREE_RANKS, [a, b], { witness: { [b.key]: clipped(b) } }),
      holdAtCall: 7,
      made: ['a1-shot-0-a', 'a1-shot-0-b', 'a1-shot-1-single'],
    })
    const ran = await takenUp(engine, killed, stillsScript(THREE_RANKS, [barons, hall]))

    assert.equal(ran.result.status, 'completed', JSON.stringify(ran.result))
    // a is the one survivor: chosen outright, with no score and no call (D-047 step 2's rule for one).
    assert.deepEqual(
      (ran.result.stills as Array<{ shotId: string; pictureId: string }>).map(
        (s) => `${s.shotId} ${s.pictureId}`,
      ),
      ['shot-0 a1-shot-0-a', 'shot-1 a2-shot-1-single', 'shot-2 a2-shot-2-single'],
    )
    // Only the cut-off picture is made again, under attempt 2's id, and paid again; the next one new.
    assert.deepEqual(
      engine.image.calls.map((c) => c.pictureId),
      ['a2-shot-1-single', 'a2-shot-2-single'],
    )
    assert.deepEqual(
      ran.generations.map((g) => [g.picture_id, g.cost_cents]),
      [
        ['a1-shot-0-a', 7],
        ['a1-shot-0-b', 0],
        ['a1-shot-1-single', 0],
        ['a2-shot-1-single', 0],
        ['a2-shot-2-single', 0],
      ],
    )
    // No sensor measure, no witness and no reconcile call of a kept picture in the second attempt.
    const second = new Set(['a2-shot-1-single', 'a2-shot-2-single'])
    assert.deepEqual(
      engine.sensors.calls
        .filter((c) => c.method === 'measure')
        .map((c) => c.pictures[0]?.pictureId),
      ['a2-shot-1-single', 'a2-shot-2-single'],
    )
    assert.ok(engine.model.observeCalls.every((c) => second.has(c.picture.pictureId)))
    assert.deepEqual(
      engine.model.calls.map((c) => [c.role, ...(c.pictureIds ?? [])]),
      [
        ['reconciler', 'a2-shot-1-single'],
        ['reconciler', 'a2-shot-2-single'],
      ],
    )
    // The receipts: the first attempt's four calls on a and b, none on the cut-off picture's
    // witness, which never returned, and none again for a kept picture.
    assert.deepEqual(
      ran.receipts
        .filter((r) => r.role !== 'planner')
        .map((r) => `${r.call} ${r.role} ${r.picture_ids.join()}`),
      [
        'observe witness a1-shot-0-a',
        'structured reconciler a1-shot-0-a',
        'observe witness a1-shot-0-b',
        'structured reconciler a1-shot-0-b',
        'observe witness a2-shot-1-single',
        'structured reconciler a2-shot-1-single',
        'observe witness a2-shot-2-single',
        'structured reconciler a2-shot-2-single',
      ],
    )
    // Each kept picture's verdict is an event once, from the finishing attempt, in ladder order.
    assert.deepEqual(described(ran.events), [
      ...PLANNED,
      'stage.started stills',
      'verdict 1 shot-0 accept',
      'verdict 1 shot-0 fail',
      'verdict 1 shot-1 accept',
      'verdict 1 shot-2 accept',
      'verdict 1S shot-1 accept',
      'verdict 1S shot-2 accept',
      'stage.finished stills',
      'run.finished completed',
    ])
    assert.equal(ran.result.costCents, 7)
  } finally {
    await engine.stop()
  }
})

// ---------------------------------------------------------------- the stage in this process

/** THREE_RANKS' selected plan, planned by the pipeline itself from the fixture's planner answers. */
async function planned(): Promise<{ request: SubmitRequest; plan: Plan }> {
  const request = stillsRequest('rf-stills')
  const outcome = await planReel(
    request,
    fakeModel({ planner: plannerFor(THREE_RANKS) }, { models: DEFAULT_PLAN_SETTINGS.models }),
    300,
    DEFAULT_PLAN_SETTINGS,
  )
  assert.equal(outcome.kind, 'selected')
  if (outcome.kind !== 'selected') throw new Error('no plan')
  const plan = outcome.selected === 'repair' ? outcome.repair : outcome.fork[outcome.selected]
  assert.ok(plan !== null && plan !== undefined)
  return { request, plan }
}

interface Attempted {
  outcome: StillsOutcome
  image: FakeImage
  sensors: FakeSensors
  model: FakeModel
}

/** One attempt of the stills stage, with stand-in ports and a recorder that keeps nothing. */
async function attempt(
  dir: string,
  base: { request: SubmitRequest; plan: Plan },
  n: number,
  given: {
    script: FakeScript
    sensors?: FakeSensorScript
    kept?: readonly PictureRecord[]
    earlier?: number
    weights?: StillsSettings['scoreWeights']
  },
): Promise<Attempted> {
  const image = fakeImage({}, { artifactRoot: dir })
  const sensors = fakeSensors(given.sensors ?? {})
  const model = fakeModel(given.script, { models: DEFAULT_PLAN_SETTINGS.models })
  const outcome = await makeStills(
    {
      runId: 'rf-stills',
      attempt: n,
      earlierImageCalls: given.earlier ?? 0,
      request: base.request,
      plan: base.plan,
      kept: given.kept ?? [],
      // No picture copied from another run: a crash's restart (S-171's stop is check 33's).
      copiedPictures: 0,
    },
    {
      image,
      model,
      sensors,
      recorder: { record: async () => {} },
      refusals: { keep: async () => {} },
    },
    {
      plan: DEFAULT_PLAN_SETTINGS,
      stills: {
        ...DEFAULT_STILLS_SETTINGS,
        scoreWeights: given.weights ?? DEFAULT_STILLS_SETTINGS.scoreWeights,
      },
    },
  )
  return { outcome, image, sensors, model }
}

/** A first attempt's pictures as a later one reads them back: decided, none chosen, by id. */
function keptFrom(outcome: StillsOutcome, ...ids: string[]): PictureRecord[] {
  return ids.map((id) => {
    const found = outcome.pictures.find((p) => p.pictureId === id)
    assert.ok(found !== undefined, `the first attempt made no ${id}`)
    assert.notEqual(found.gate1?.outcome ?? null, null, `${id} was not decided`)
    return { ...structuredClone(found), chosen: false, degradation: null }
  })
}

const chosenOf = (outcome: StillsOutcome) =>
  outcome.pictures
    .filter((p) => p.chosen)
    .map((p) => p.pictureId)
    .sort()

/** Candidate b sharper than a: under the default weights b wins (D-031). */
const B_SHARPER: FakeSensorScript = {
  'shot-0-a': { sharpness: 0.5, brightness: 0.5 },
  'shot-0-b': { sharpness: 0.9, brightness: 0.4 },
}

async function inFolder(body: (dir: string) => Promise<void>): Promise<void> {
  const dir = mkdtempSync(join(tmpdir(), 'resume-failed-stills-'))
  try {
    await body(dir)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

// ---------------------------------------------------------------- 8

test('8. the canonical stays best of two: a kept a with b cut off makes b and chooses by score, tie to a; two kept survivors are ranked by their stored score totals with no call, and still so after the weights are changed between the runs; a kept derived picture whose references do not name the chosen canonical is refused before any call, engine; a kept accepted repair is chosen outright; a kept failed repair with both candidates failed stops for gate-1 with no call; and the choice over kept pictures equals the choice the first attempt would have made', async () => {
  await inFolder(async (dir) => {
    const base = await planned()
    const all = stillsScript(THREE_RANKS, THREE_RANKS_PICS)

    // A kept a whose b was cut off: b made, both scored now — equal, so a (D-031 rule 4)...
    const tie = await attempt(dir, base, 1, { script: all })
    const tied = await attempt(dir, base, 2, {
      script: stillsScript(THREE_RANKS, [b, barons, hall]),
      kept: keptFrom(tie.outcome, 'a1-shot-0-a').map((p) => ({ ...p, score: null })),
      earlier: 2,
    })
    assert.deepEqual(
      tied.image.calls.map((c) => c.pictureId),
      ['a2-shot-0-b', 'a2-shot-1-single', 'a2-shot-2-single'],
    )
    assert.deepEqual(chosenOf(tied.outcome), [
      'a1-shot-0-a',
      'a2-shot-1-single',
      'a2-shot-2-single',
    ])
    // ...and b sharper, so b: chosen by score, the kept a scored now beside it from its stored
    // measure — a first attempt that measured b sharper too, cut off after a.
    const first = await attempt(dir, base, 1, { script: all, sensors: B_SHARPER })
    const sharper = await attempt(dir, base, 2, {
      script: stillsScript(THREE_RANKS, [b, barons, hall]),
      sensors: B_SHARPER,
      kept: keptFrom(first.outcome, 'a1-shot-0-a').map((p) => ({ ...p, score: null })),
      earlier: 2,
    })
    assert.deepEqual(chosenOf(sharper.outcome), [
      'a2-shot-0-b',
      'a2-shot-1-single',
      'a2-shot-2-single',
    ])
    const rescored = sharper.outcome.pictures.find((p) => p.pictureId === 'a1-shot-0-a')
    assert.ok(rescored?.score !== null, 'the kept a was not scored beside the new b')

    // Two kept survivors with stored scores, b's the higher: ranked by those totals, with no call —
    // and still b under weights that would rank a first if scored again. The same choice as the first
    // attempt made (D-031 rule 5).
    assert.deepEqual(chosenOf(first.outcome), [
      'a1-shot-0-b',
      'a1-shot-1-single',
      'a1-shot-2-single',
    ])
    const reweighted = await attempt(dir, base, 2, {
      script: stillsScript(THREE_RANKS, [barons, hall]),
      sensors: B_SHARPER,
      kept: keptFrom(first.outcome, 'a1-shot-0-a', 'a1-shot-0-b'),
      earlier: 2,
      weights: { faceVisible: 2, unoccluded: 2, prominence: 2, sharpness: 0.01, brightness: 5 },
    })
    assert.deepEqual(chosenOf(reweighted.outcome), [
      'a1-shot-0-b',
      'a2-shot-1-single',
      'a2-shot-2-single',
    ])
    assert.deepEqual(
      reweighted.image.calls.map((c) => c.pictureId),
      ['a2-shot-1-single', 'a2-shot-2-single'],
    )
    assert.ok(
      !reweighted.sensors.calls.some(
        (c) => c.method === 'measure' && c.pictures[0]?.pictureId.startsWith('a1-'),
      ),
      'a kept candidate was measured again',
    )
    // The first attempt's scores, as stored, decided it: not today's weights.
    const kb = reweighted.outcome.pictures.find((p) => p.pictureId === 'a1-shot-0-b')
    assert.deepEqual(
      kb?.score,
      first.outcome.pictures.find((p) => p.pictureId === 'a1-shot-0-b')?.score,
    )

    // A kept derived picture made from the canonical this attempt does NOT choose: refused before
    // any call, an engine fault — a planner bug costs nothing.
    const [ka, kbPicture, kBarons] = keptFrom(
      first.outcome,
      'a1-shot-0-a',
      'a1-shot-0-b',
      'a1-shot-1-single',
    ) as [PictureRecord, PictureRecord, PictureRecord]
    const mismatched = await attempt(dir, base, 2, {
      script: {},
      sensors: B_SHARPER,
      kept: [ka, kbPicture, { ...kBarons, references: ['a1-shot-0-a'] }],
      earlier: 3,
    })
    assert.equal(mismatched.outcome.kind, 'failed')
    if (mismatched.outcome.kind === 'failed') {
      assert.equal(mismatched.outcome.failure, 'engine')
      assert.equal(
        mismatched.outcome.detail,
        'a1-shot-1-single was kept from an earlier attempt made from a1-shot-0-a, not from the chosen canonical a1-shot-0-b (S-164)',
      )
    }
    assert.deepEqual(mismatched.image.calls, [])
    assert.deepEqual(mismatched.sensors.calls, [])
    assert.deepEqual(mismatched.model.calls, [])
    assert.deepEqual(mismatched.model.observeCalls, [])

    // Both candidates failed and a repair accepted: the kept repair chosen outright, no call on shot 0.
    const repaired = await attempt(dir, base, 1, {
      script: stillsScript(THREE_RANKS, [a, b, again(a, 'repair'), barons, hall], {
        witness: { [a.key]: clipped(a), [b.key]: clipped(b) },
      }),
    })
    assert.deepEqual(chosenOf(repaired.outcome), [
      'a1-shot-0-repair',
      'a1-shot-1-single',
      'a1-shot-2-single',
    ])
    const outright = await attempt(dir, base, 2, {
      script: stillsScript(THREE_RANKS, [barons, hall]),
      kept: keptFrom(repaired.outcome, 'a1-shot-0-a', 'a1-shot-0-b', 'a1-shot-0-repair'),
      earlier: 3,
    })
    assert.deepEqual(chosenOf(outright.outcome), [
      'a1-shot-0-repair',
      'a2-shot-1-single',
      'a2-shot-2-single',
    ])
    assert.deepEqual(
      outright.image.calls.map((c) => [c.pictureId, c.references.map((r) => r.pictureId)]),
      [
        ['a2-shot-1-single', ['a1-shot-0-repair']],
        ['a2-shot-2-single', ['a1-shot-0-repair']],
      ],
    )

    // And a kept failed repair: the stage stops for gate-1 with no call, in the first attempt's words.
    const stopped = await attempt(dir, base, 1, {
      script: stillsScript(THREE_RANKS, [a, b, again(a, 'repair')], {
        witness: {
          [a.key]: clipped(a),
          [b.key]: clipped(b),
          ['shot-0-repair']: clipped(again(a, 'repair')),
        },
      }),
    })
    assert.equal(stopped.outcome.kind, 'stopped-rule')
    const stopsAgain = await attempt(dir, base, 2, {
      script: {},
      kept: keptFrom(stopped.outcome, 'a1-shot-0-a', 'a1-shot-0-b', 'a1-shot-0-repair'),
      earlier: 3,
    })
    assert.equal(stopsAgain.outcome.kind, 'stopped-rule')
    if (stopsAgain.outcome.kind === 'stopped-rule' && stopped.outcome.kind === 'stopped-rule') {
      assert.equal(stopsAgain.outcome.rule, 'gate-1')
      assert.equal(stopsAgain.outcome.detail, stopped.outcome.detail)
    }
    assert.deepEqual(stopsAgain.image.calls, [])
    assert.deepEqual(stopsAgain.sensors.calls, [])
    assert.deepEqual(stopsAgain.model.observeCalls, [])
    assert.deepEqual(stopsAgain.model.calls, [])
    assert.deepEqual(
      stopsAgain.outcome.events.map((e) => `${e.type} ${'outcome' in e ? e.outcome : ''}`),
      ['verdict fail', 'verdict fail', 'verdict fail'],
      'each kept verdict is an event once',
    )
  })
})

// ---------------------------------------------------------------- 9

test('9. a kept derived picture whose Gate 1S never ran has Gate 1S run against the chosen canonical with no image call and no witness call; one whose Gate 1S decided is not compared again', async () => {
  await inFolder(async (dir) => {
    const base = await planned()
    const first = await attempt(dir, base, 1, {
      script: stillsScript(THREE_RANKS, THREE_RANKS_PICS),
    })
    assert.deepEqual(chosenOf(first.outcome), [
      'a1-shot-0-a',
      'a1-shot-1-single',
      'a1-shot-2-single',
    ])
    const [ka, kb, kBarons, kHall] = keptFrom(
      first.outcome,
      'a1-shot-0-a',
      'a1-shot-0-b',
      'a1-shot-1-single',
      'a1-shot-2-single',
    ) as [PictureRecord, PictureRecord, PictureRecord, PictureRecord]

    // The hall's picture shares the seal with the canonical, so its Gate 1S is a similarity reading.
    // Cut off before it: run now, against the chosen canonical, one reading and nothing else.
    const run = await attempt(dir, base, 2, {
      script: {},
      kept: [ka, kb, kBarons, { ...kHall, gate1s: null }],
      earlier: 4,
    })
    assert.equal(run.outcome.kind, 'completed')
    assert.deepEqual(run.image.calls, [])
    assert.deepEqual(run.model.observeCalls, [])
    assert.deepEqual(run.model.calls, [])
    assert.deepEqual(
      run.sensors.calls.map((c) => [c.method, ...c.pictures.map((p) => p.pictureId)]),
      [['similarity', 'a1-shot-0-a', 'a1-shot-2-single']],
    )
    assert.equal(
      run.outcome.pictures.find((p) => p.pictureId === 'a1-shot-2-single')?.gate1s?.outcome,
      'accept',
    )
    assert.deepEqual(chosenOf(run.outcome), ['a1-shot-0-a', 'a1-shot-1-single', 'a1-shot-2-single'])

    // Decided before the crash: not compared again, no reading at all.
    const decided = await attempt(dir, base, 2, {
      script: {},
      kept: [ka, kb, kBarons, kHall],
      earlier: 4,
    })
    assert.equal(decided.outcome.kind, 'completed')
    assert.deepEqual(decided.sensors.calls, [])
    assert.deepEqual(decided.model.compareCalls, [])
    assert.deepEqual(
      decided.outcome.events.map((e) => `${e.type} ${'gate' in e ? e.gate : ''} ${e.shotId}`),
      [
        'verdict 1 shot-0',
        'verdict 1 shot-0',
        'verdict 1 shot-1',
        'verdict 1 shot-2',
        'verdict 1S shot-1',
        'verdict 1S shot-2',
      ],
    )
  })
})

// ---------------------------------------------------------------- 10

test('10. a kept failed pictures stored reasons reach its shots repair prompt; a kept repair counts toward its shots repairs and takes no reserve slot again; and the reserve is six less the runs image receipts and image lost calls, less the first calls of placements no kept picture satisfies — over a recurring placement and an upToThree placement with standalones', async () => {
  await inFolder(async (dir) => {
    const base = await planned()
    const hallRepair = again(hall, 'repair')
    // The first attempt: the hall's picture shows a person and fails Gate 1; its repair passes.
    const first = await attempt(dir, base, 1, {
      script: stillsScript(THREE_RANKS, [a, b, barons, hall, hallRepair], {
        reconciler: { [hall.key]: showsPerson(hall) },
      }),
    })
    assert.deepEqual(chosenOf(first.outcome), [
      'a1-shot-0-a',
      'a1-shot-1-single',
      'a1-shot-2-repair',
    ])
    const kept = keptFrom(
      first.outcome,
      'a1-shot-0-a',
      'a1-shot-0-b',
      'a1-shot-1-single',
      'a1-shot-2-single',
    )

    // Crashed after the hall's picture was decided, before its repair's call: 4 earlier, none unmade,
    // reserve 2. The repair is made, told the KEPT picture's reasons, read from its stored steps.
    const told = await attempt(dir, base, 2, {
      script: stillsScript(THREE_RANKS, [hallRepair]),
      kept,
      earlier: 4,
    })
    assert.equal(told.outcome.kind, 'completed')
    assert.deepEqual(
      told.image.calls.map((c) => c.pictureId),
      ['a2-shot-2-repair'],
    )
    const reasons = (kept[3]?.gate1?.steps ?? [])
      .filter((s) => s.outcome === 'fail')
      .flatMap((s) => s.reasons)
    assert.ok(reasons.length > 0, 'the kept picture failed with no reasons')
    for (const reason of reasons) {
      assert.ok(
        told.image.calls[0]?.prompt.includes(reason),
        `the repair was not told the kept picture's reason: ${reason}`,
      )
    }

    // Crashed after the hall's REPAIR passed Gate 1, before its Gate 1S: 5 earlier, none unmade,
    // reserve 1. Its Gate 1S now fails: the kept repair is counted — the next is repair-2, not a
    // second "repair" — and it took no slot again, so the one slot is free for repair-2.
    const judgeSays = judged(['a wax seal'], ['a wax seal'])
    const counted = await attempt(dir, base, 2, {
      script: {
        ...stillsScript(THREE_RANKS, [again(hall, 'repair-2')]),
        judge: [{ value: judgeSays }],
      },
      sensors: { 'shot-2-repair': { similarity: 0 } },
      kept: [...kept, { ...keptFrom(first.outcome, 'a1-shot-2-repair')[0]!, gate1s: null }],
      earlier: 5,
    })
    assert.equal(counted.outcome.kind, 'completed', JSON.stringify(counted.outcome.kind))
    assert.deepEqual(
      counted.image.calls.map((c) => c.pictureId),
      ['a2-shot-2-repair-2'],
      'the kept repair was not counted, or took a slot again',
    )
    assert.deepEqual(chosenOf(counted.outcome), [
      'a1-shot-0-a',
      'a1-shot-1-single',
      'a2-shot-2-repair-2',
    ])

    // The reserve itself: six less `earlier`, less the first calls no kept picture satisfies.
    const recurring = placePictures(base.plan)
    const kept1 = (unit: number, label: string) => ({ shotUnit: unit, label })
    assert.equal(reserveOf(recurring, 0, []), 2)
    assert.equal(reserveOf(recurring, 2, [kept1(0, 'a')]), 1) // unmade b, barons, hall: 6 − 2 − 3
    assert.equal(reserveOf(recurring, 3, [kept1(0, 'a')]), 0) // a crash's cut-off b counted twice
    assert.equal(reserveOf(recurring, 4, [kept1(0, 'a'), kept1(0, 'b')]), 0)
    assert.equal(
      reserveOf(recurring, 5, [
        kept1(0, 'a'),
        kept1(0, 'b'),
        kept1(1, 'single'),
        kept1(2, 'single'),
      ]),
      1,
    )
    // A kept repair satisfies no first call: its call is in `earlier` already.
    assert.equal(reserveOf(recurring, 3, [kept1(0, 'a'), kept1(0, 'b'), kept1(0, 'repair')]), 1)
    const upToThree = [
      { subjectId: 'seal', shotUnit: 0, role: 'canonical' as const },
      { subjectId: 'hall', shotUnit: 3, role: 'standalone' as const },
      { subjectId: 'king', shotUnit: 4, role: 'standalone' as const },
    ]
    assert.equal(reserveOf(upToThree, 0, []), 2)
    assert.equal(reserveOf(upToThree, 3, [kept1(0, 'a'), kept1(0, 'b')]), 1) // unmade 2 standalones
    assert.equal(reserveOf(upToThree, 4, [kept1(0, 'a'), kept1(0, 'b'), kept1(3, 'single')]), 1)
    assert.equal(reserveOf(upToThree, 5, [kept1(0, 'a'), kept1(0, 'b')]), -1)
  })
})

// ---------------------------------------------------------------- 11

test('11. a pictures seq is the runs greatest seq plus one: a run without copied pictures numbers them 1, 2, 3 as before, and a restarted runs new pictures follow its kept and cut-off ones', () => {
  const dir = mkdtempSync(join(tmpdir(), 'resume-failed-seq-'))
  const db = openDatabase(join(dir, 'cutroom.sqlite'))
  try {
    const request = stillsRequest('rf11')
    const { runId } = submitRun(db, request, JSON.stringify(request))
    const job = claimJob(db, ['reel.plan'])
    assert.ok(job !== undefined)
    const made = (pictureId: string): Omit<PictureRecord, 'seq'> => ({
      pictureId,
      attempt: Number(pictureId.slice(1, 2)),
      shotUnit: 0,
      subjectId: 'seal',
      role: 'canonical',
      label: pictureId.split('-').at(-1) ?? 'a',
      path: join(dir, `${pictureId}.png`),
      prompt: 'a wax seal',
      framing: null,
      references: [],
      gate1: null,
      measure: null,
      text: null,
      observation: null,
      reconciliation: null,
      score: null,
      gate1s: null,
      degradation: null,
      chosen: false,
    })
    const generate = (pictureId: string) =>
      recordGeneration(db, {
        jobId: job.id,
        runId,
        picture: made(pictureId),
        rateCents: 15,
        style: { id: 'papercraft', version: 1 },
        receipt: { model: 'stand-in-image', costCents: 0, fake: true },
      })
    const seqs = () =>
      (
        db.$client
          .prepare('SELECT picture_id, seq FROM picture WHERE run_id = ? ORDER BY seq')
          .all(runId) as Array<{ picture_id: string; seq: number }>
      ).map((r) => [r.picture_id, r.seq])

    // Three pictures made: 1, 2, 3, as receipts counted would number them.
    generate('a1-shot-0-a')
    generate('a1-shot-0-b')
    generate('a2-shot-0-b')
    assert.deepEqual(seqs(), [
      ['a1-shot-0-a', 1],
      ['a1-shot-0-b', 2],
      ['a2-shot-0-b', 3],
    ])
    // A row with no receipt of this run — as a picture copied from another run is — numbered 7: the
    // next picture made follows it at 8, where the receipts counted would say 4.
    upsertPicture(db, runId, { ...made('a1-shot-1-single'), seq: 7 })
    generate('a3-shot-2-single')
    assert.deepEqual(seqs(), [
      ['a1-shot-0-a', 1],
      ['a1-shot-0-b', 2],
      ['a2-shot-0-b', 3],
      ['a1-shot-1-single', 7],
      ['a3-shot-2-single', 8],
    ])
  } finally {
    closeDatabase(db)
    rmSync(dir, { recursive: true, force: true })
  }
})
