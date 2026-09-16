import assert from 'node:assert/strict'
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { DEFAULT_PLAN_SETTINGS } from '@cutroom/pipeline'
import type { FakeImageScript } from '@cutroom/providers'
import { REPO } from './_repo.ts'
import { finished, startEngine, type Engine, type EngineOptions } from './engine/harness.ts'
import {
  THREE_RANKS,
  THREE_RANKS_PICS,
  again,
  clipped,
  inTurn,
  judged,
  pictureOf,
  readStills,
  showsPerson,
  stills,
  stillsRequest,
  stillsScript,
  type Pic,
  type Stilled,
} from './engine/stills.ts'

// reel-stills, Slice 4 — checks 42 to 45 (docs/features/reel-stills.md): spending while pictures are
// made (S-035, S-036, D-081, D-100). Before every image call the worker's guard compares the chain's
// spend plus the image rate with the per-reel cap, then with the caller's ceiling; a call that would
// pass either is not made, and the run stops for budget. A stand-in picture costs nothing unless a
// test scripts a cost on it, so every figure below is scripted and worked out by hand.

const S = DEFAULT_PLAN_SETTINGS
const [a, b, barons, hall] = THREE_RANKS_PICS as [Pic, Pic, Pic, Pic]

/** The pinned BUDGET.md with its per-reel row set to `figure` (D-100: the cap is read from it). */
function budgetWithCap(figure: string): string {
  const real = readFileSync(join(REPO, 'steering-ref', 'steering', 'BUDGET.md'), 'utf8')
  const row = '| Per reel, all-in | **$3.00** |'
  assert.ok(real.includes(row), "the pinned BUDGET.md's per-reel row is not $3.00")
  return real.replace(row, `| Per reel, all-in | **${figure}** |`)
}

/** The repository's own questions file, as it is now. */
const repoQuestions = () => {
  const path = join(REPO, 'QUESTIONS.md')
  return existsSync(path) ? readFileSync(path, 'utf8') : null
}

const entries = (text: string) => text.split(/^(?=## )/m).filter((c) => c.startsWith('## '))

/**
 * One stills run in an engine of its own. `asked` is whether the engine's questions file existed
 * when the run had finished — read BEFORE the engine is stopped, since stopping removes its folder.
 */
async function one(
  requestId: string,
  budgetCents: number,
  options: Omit<EngineOptions, 'worker'>,
): Promise<{ ran: Stilled; engine: Engine; asked: boolean }> {
  const engine = await startEngine({ worker: true, ...options })
  try {
    const ran = await stills(engine, stillsRequest(requestId, budgetCents))
    return { ran, engine, asked: existsSync(engine.questionsPath) }
  } finally {
    await engine.stop()
  }
}

const made = (engine: Engine) => engine.image.calls.map((c) => c.pictureId)

// ---------------------------------------------------------------- 42

test('42. spentCents sums cost_cents over every job row with the correlation_id and over no other, and the guard compares spent plus the rate with the cap, then the ceiling, before every image call', async () => {
  // The chain holds one more row, costing 5, and another run's chain a row costing 1000. The
  // pictures cost 25, 30 and 30, so before the hall's call the chain has spent 5 + 85 = 90: at a
  // ceiling of 105 the call — 90 + 15 — is made, and at 104 it is not.
  const images: FakeImageScript = {
    [a.key]: { costCents: 25 },
    [b.key]: { costCents: 30 },
    [barons.key]: { costCents: 30 },
  }
  const chained = async (requestId: string, ceiling: number) => {
    const engine = await startEngine({
      worker: false,
      images,
      script: stillsScript(THREE_RANKS, THREE_RANKS_PICS),
    })
    try {
      const submitted = await engine.http.submit(stillsRequest(requestId, ceiling))
      const runId = String(submitted.json.runId)
      const at = new Date().toISOString()
      engine.query(
        `INSERT INTO job (kind, payload, state, attempts, run_at, correlation_id, cost_cents)
         VALUES ('reel.elsewhere', '{}', 'done', 1, ?, ?, 5)`,
        at,
        runId,
      )
      engine.query(
        `INSERT INTO job (kind, payload, state, attempts, run_at, correlation_id, cost_cents)
         VALUES ('reel.elsewhere', '{}', 'done', 1, ?, 'another-run', 1000)`,
        at,
      )
      await engine.startWorker()
      await finished(engine, runId)
      const result = (await engine.http.result(runId)).json
      return { ran: await readStills(engine, runId, result)(), calls: made(engine) }
    } finally {
      await engine.stop()
    }
  }

  const fits = await chained('r42-fits', 105)
  assert.equal(fits.ran.result.status, 'completed', JSON.stringify(fits.ran.result))
  assert.equal(fits.ran.result.costCents, 90, 'the spend is not the sum over the chain')
  assert.equal(fits.calls.length, 4)

  const over = await chained('r42-over', 104)
  assert.deepEqual(over.ran.result, {
    contractVersion: 1,
    runId: over.ran.runId,
    requestId: 'r42-over',
    costCents: 90,
    status: 'stopped',
    reason: 'budget',
    limit: 'ceiling',
    estimateCents: 105,
    ceilingCents: 104,
    capCents: 300,
  })
  assert.deepEqual(over.calls, ['a1-shot-0-a', 'a1-shot-0-b', 'a1-shot-1-single'])

  // The cap, read from BUDGET.md, at $2.40 — with an image rate of 17, so the rate compared is the
  // setting's. The plan's estimate is 4 x 17 + 40 s x 4 = 228, within the cap. The pictures cost 100,
  // 100 and 23: before the hall's call 223 + 17 = 240 is the cap exactly, and the call is made; one
  // cent more and it is not.
  const capSettings = { settings: { ...S, imageRateCents: 17 }, budgetMd: budgetWithCap('$2.40') }
  const atCap = await one('r42-at-cap', 1000, {
    ...capSettings,
    images: {
      [a.key]: { costCents: 100 },
      [b.key]: { costCents: 100 },
      [barons.key]: { costCents: 23 },
    },
    script: stillsScript(THREE_RANKS, THREE_RANKS_PICS),
  })
  assert.equal(atCap.ran.result.status, 'completed', JSON.stringify(atCap.ran.result))
  assert.equal(atCap.ran.result.costCents, 223)

  const overCap = await one('r42-over-cap', 1000, {
    ...capSettings,
    images: {
      [a.key]: { costCents: 100 },
      [b.key]: { costCents: 100 },
      [barons.key]: { costCents: 24 },
    },
    script: stillsScript(THREE_RANKS, THREE_RANKS_PICS),
  })
  assert.deepEqual(overCap.ran.result, {
    contractVersion: 1,
    runId: overCap.ran.runId,
    requestId: 'r42-over-cap',
    costCents: 224,
    status: 'stopped',
    reason: 'budget',
    limit: 'reel',
    estimateCents: 241,
    ceilingCents: 1000,
    capCents: 240,
  })
  assert.deepEqual(made(overCap.engine), ['a1-shot-0-a', 'a1-shot-0-b', 'a1-shot-1-single'])

  // Past both — 230 + 15 = 245 is above the cap of 240 and the ceiling of 230 — the cap is compared
  // first, and it is the limit the caller is told. Here the refusal is of the third call.
  const both = await one('r42-both', 230, {
    budgetMd: budgetWithCap('$2.40'),
    images: { [a.key]: { costCents: 120 }, [b.key]: { costCents: 110 } },
    script: stillsScript(THREE_RANKS, THREE_RANKS_PICS),
  })
  assert.equal(both.ran.result.limit, 'reel', JSON.stringify(both.ran.result))
  assert.equal(both.ran.result.estimateCents, 245)
  assert.equal(both.ran.result.ceilingCents, 230)
  assert.deepEqual(made(both.engine), ['a1-shot-0-a', 'a1-shot-0-b'])
})

// ---------------------------------------------------------------- 43

test('43. a picture scripted to cost more than the rate stops the run for budget before the next call, with limit ceiling, estimateCents the spend plus the rate, the ceiling, the cap, costCents the spend, and every picture made so far in the record with the checks it reached; no question is written', async () => {
  // The barons' picture costs 90, six times the rate: the hall's call would be 90 + 15 = 105.
  const { ran, engine, asked } = await one('r43', 100, {
    images: { [barons.key]: { costCents: 90 } },
    script: stillsScript(THREE_RANKS, THREE_RANKS_PICS),
  })
  assert.deepEqual(ran.result, {
    contractVersion: 1,
    runId: ran.runId,
    requestId: 'r43',
    costCents: 90,
    status: 'stopped',
    reason: 'budget',
    limit: 'ceiling',
    estimateCents: 105,
    ceilingCents: 100,
    capCents: 300,
  })
  assert.deepEqual(made(engine), ['a1-shot-0-a', 'a1-shot-0-b', 'a1-shot-1-single'])
  assert.deepEqual(
    ran.generations.map((g) => [g.picture_id, g.cost_cents]),
    [
      ['a1-shot-0-a', 0],
      ['a1-shot-0-b', 0],
      ['a1-shot-1-single', 90],
    ],
  )
  assert.deepEqual(
    ran.jobs.map((j) => [j.kind, j.cost_cents]),
    [
      ['reel.plan', 0],
      ['reel.keyframes', 90],
    ],
  )

  // Every picture made so far, with each check it reached: all of Gate 1, and for the canonical's
  // two a score; Gate 1S was not reached. None is chosen.
  const gate1 = ['technical', 'text', 'witness', 'reconcile'].map((step) => ({
    gate: '1',
    step,
    outcome: 'accept',
  }))
  assert.deepEqual(
    ran.record.pictures.map((p) => ({
      pictureId: p.pictureId,
      chosen: p.chosen,
      checks: p.checks,
      ids: [p.observationId, p.reconciliationId],
    })),
    ['a1-shot-0-a', 'a1-shot-0-b', 'a1-shot-1-single'].map((id) => ({
      pictureId: id,
      chosen: false,
      checks: gate1,
      ids: [`obs-${id}`, `rec-${id}`],
    })),
  )
  assert.ok(pictureOf(ran, a.key).score !== null && pictureOf(ran, b.key).score !== null)
  assert.equal(pictureOf(ran, barons.key).gate1s, null)
  assert.ok(!ran.events.some((e) => e.type === 'stage.finished' && e.stage === 'stills'))

  // The caller's ceiling fired, not the engine's cap: no question (D-100).
  assert.equal(asked, false, 'a stop at the ceiling wrote a question')
})

// ---------------------------------------------------------------- 44

test('44. a reserve call that would pass the ceiling is not made, and the run stops for budget', async () => {
  // Every planned call fits: the pictures' figure is 60 and each ceiling below is at least that.

  // The canonical's repair: b cost 80, so the repair would be 80 + 15 = 95, above 90.
  const canonical = await one('r44-canonical', 90, {
    images: { [b.key]: { costCents: 80 } },
    script: stillsScript(THREE_RANKS, [a, b], {
      witness: { [a.key]: clipped(a), [b.key]: clipped(b) },
    }),
  })
  assert.deepEqual(made(canonical.engine), ['a1-shot-0-a', 'a1-shot-0-b'])
  assert.deepEqual(
    [
      canonical.ran.result.status,
      canonical.ran.result.reason,
      canonical.ran.result.limit,
      canonical.ran.result.estimateCents,
      canonical.ran.result.costCents,
    ],
    ['stopped', 'budget', 'ceiling', 95, 80],
  )

  // A derived picture's Gate 1 repair: the barons cost 50 and fail, so their repair would be 65.
  const derived = await one('r44-derived', 60, {
    images: { [barons.key]: { costCents: 50 } },
    script: stillsScript(THREE_RANKS, [a, b, barons], {
      reconciler: { [barons.key]: showsPerson(barons) },
    }),
  })
  assert.deepEqual(made(derived.engine), ['a1-shot-0-a', 'a1-shot-0-b', 'a1-shot-1-single'])
  assert.deepEqual(
    [derived.ran.result.status, derived.ran.result.limit, derived.ran.result.estimateCents],
    ['stopped', 'ceiling', 65],
  )

  // A Gate 1S repair: the hall costs 50 and its pair is judged different, so its repair would be 65.
  const consistency = await one('r44-consistency', 60, {
    images: { [hall.key]: { costCents: 50 } },
    sensors: { [hall.key]: { similarity: 0.5 } },
    script: stillsScript(THREE_RANKS, THREE_RANKS_PICS, {
      judge: [judged(['a wax seal'], ['a wax seal'])],
    }),
  })
  assert.deepEqual(made(consistency.engine), [
    'a1-shot-0-a',
    'a1-shot-0-b',
    'a1-shot-1-single',
    'a1-shot-2-single',
  ])
  assert.deepEqual(
    [
      consistency.ran.result.status,
      consistency.ran.result.limit,
      consistency.ran.result.estimateCents,
      consistency.ran.result.costCents,
    ],
    ['stopped', 'ceiling', 65, 50],
  )
  assert.ok(
    !made(consistency.engine).includes(`a1-${again(hall, 'repair').key}`),
    'the refused repair was made',
  )
  // The run stopped: the shot was not degraded, and nothing is chosen.
  for (const { ran } of [canonical, derived, consistency]) {
    assert.deepEqual(ran.degradations, [], `${ran.runId}: a stopped call degraded a shot`)
    assert.ok(ran.pictures.every((p) => !p.chosen))
  }
})

// ---------------------------------------------------------------- 45

test('45. a call that would pass the per-reel cap stops the run with limit reel and appends one question entry after the run is finished', async () => {
  const before = repoQuestions()
  // A cap of $2.40, and candidate a costing 230: candidate b's call would be 245.
  // Each run makes candidate a alone, so the script holds its answers once per run.
  const options = {
    budgetMd: budgetWithCap('$2.40'),
    images: { [a.key]: { costCents: 230 } },
    script: inTurn(stillsScript(THREE_RANKS, [a]), stillsScript(THREE_RANKS, [a])),
  }
  const engine = await startEngine({ worker: true, ...options })
  try {
    assert.equal(existsSync(engine.questionsPath), false)
    const ran = await stills(engine, stillsRequest('r45', 1000))
    assert.deepEqual(ran.result, {
      contractVersion: 1,
      runId: ran.runId,
      requestId: 'r45',
      costCents: 230,
      status: 'stopped',
      reason: 'budget',
      limit: 'reel',
      estimateCents: 245,
      ceilingCents: 1000,
      capCents: 240,
    })
    assert.deepEqual(made(engine), ['a1-shot-0-a'])

    // One entry, naming the run and the request, with the figures the stop was decided on.
    const asked = entries(readFileSync(engine.questionsPath, 'utf8'))
    assert.equal(asked.length, 1, `${asked.length} entries for one stop`)
    const entry = asked[0] as string
    assert.ok(entry.includes(ran.runId), 'the entry does not name the run')
    assert.ok(entry.includes('r45'), 'the entry does not name the request')
    assert.match(entry.split('\n')[0] as string, /stopped/, 'the heading does not say it stopped')
    for (const figure of [
      '**Estimate:** 245 cents',
      '**Spent:** 230 cents',
      '**Per-reel cap:** 240 cents',
      '**Ceiling:** 1000 cents',
    ]) {
      assert.ok(entry.includes(figure), `the entry lacks "${figure}":\n${entry}`)
    }

    // A second stop APPENDS a second entry and leaves the first as it was.
    const firstText = readFileSync(engine.questionsPath, 'utf8')
    const again45 = await stills(engine, stillsRequest('r45-again', 1000))
    assert.equal(again45.result.limit, 'reel', JSON.stringify(again45.result))
    const secondText = readFileSync(engine.questionsPath, 'utf8')
    assert.ok(secondText.startsWith(firstText), 'the second stop rewrote the first entry')
    const both = entries(secondText)
    assert.equal(both.length, 2)
    assert.ok(both[1]?.includes(again45.runId))
  } finally {
    await engine.stop()
  }

  // AFTER the run is finished: with the questions file unwritable — a folder stands where it would
  // go — the append fails, and the run has still finished, stopped, with every figure. An append
  // made before the finishing transaction would have left the run unfinished.
  const blocked = await startEngine({ worker: false, ...options })
  try {
    mkdirSync(blocked.questionsPath)
    await blocked.startWorker()
    const ran = await stills(blocked, stillsRequest('r45-blocked', 1000))
    assert.equal(ran.result.status, 'stopped', JSON.stringify(ran.result))
    assert.equal(ran.result.limit, 'reel')
    assert.equal(ran.result.estimateCents, 245)
    assert.ok(statSync(blocked.questionsPath).isDirectory())
  } finally {
    await blocked.stop()
  }
  assert.equal(repoQuestions(), before, "the repository's own questions file was written")
})
