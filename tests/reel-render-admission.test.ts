import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { DEFAULT_PLAN_SETTINGS } from '@cutroom/pipeline'
import type { FakeScript } from '@cutroom/providers'
import type { SubmitRequest } from '@cutroom/reel-contract'
import { REPO } from './_repo.ts'
import { run, startEngine, type Engine, type Ran } from './engine/harness.ts'
import { answer, answerA, answers, planRequest } from './engine/plans.ts'
import { described, jobRows } from './engine/video.ts'

// reel-render, Slice 2 — check 8 (docs/features/reel-render.md): admission of a video run at the end
// of its plan job. A video run spends the whole estimate, so THE SELECTED PLAN'S `estimateCents` —
// D-083's figure, unchanged — is compared with the caller's ceiling (S-069), where a stills run
// compares only its pictures' share (S-030, S-035). The reserve is not counted, and narration is not
// in the estimate.

const S = DEFAULT_PLAN_SETTINGS

/**
 * Two plans whose figures all differ, so the one a refusal carries names what was compared. The
 * 4-unit plan shows three subjects, two in two shots or more: 3 calls, 205 cents. The 6-unit plan
 * shows one subject in three shots: 2 calls, 190 cents. The 6-unit plan answers every question yes
 * and the 4-unit plan one no, so the 6-unit plan is selected — 30 cents of pictures in a 190-cent
 * reel.
 */
const forkOfTwo = (): FakeScript => ({
  planner: [
    { value: answerA() },
    {
      value: answer(
        [7, 7, 7, 7, 6, 6],
        [{ id: 'seal', name: 'a wax seal' }],
        [['seal'], ['seal'], [], [], ['seal'], []],
      ),
    },
  ],
  reconciler: [
    { value: answers('yes', 'yes', 'no', 'yes') },
    { value: answers('yes', 'yes', 'yes', 'yes') },
  ],
})

/** The same script `times` over, for an engine that runs more than one request. */
function repeated(times: number): FakeScript {
  const planner = []
  const reconciler = []
  for (let i = 0; i < times; i += 1) {
    const script = forkOfTwo()
    planner.push(...(script.planner ?? []))
    reconciler.push(...(script.reconciler ?? []))
  }
  return { planner, reconciler }
}

/** The selected plan's estimate: 2 image calls at 15 cents and 40 seconds of video at 4. */
const ESTIMATE = 190
/** What the selected plan's pictures alone cost — the figure a STILLS run is admitted on. */
const PICTURES = 2 * S.imageRateCents
/** The other plan's estimate. */
const OTHER = 205

/** `planRequest`'s eight sentences, asking for a video under `budgetCents`. */
function videoOf(requestId: string, budgetCents: number): SubmitRequest {
  return { ...planRequest(requestId), options: { until: 'video', budgetCents } }
}

/** Every file the engine left in its folder, apart from the database and its journal files. */
function written(engine: Engine): string[] {
  return readdirSync(engine.dir).filter((f) => !/^engine\.sqlite(-wal|-shm|-journal)?$/.test(f))
}

const repoQuestions = () => {
  const path = join(REPO, 'QUESTIONS.md')
  return existsSync(path) ? readFileSync(path, 'utf8') : null
}

/**
 * Runs one request to its end, then stops the worker — which returns only once the job in hand has
 * returned — so a row the job wrote after the run finished is in the table before it is read.
 */
async function ranAlone(engine: Engine, request: SubmitRequest): Promise<Ran> {
  await engine.startWorker()
  try {
    return await run(engine, request)
  } finally {
    await engine.stopWorker()
  }
}

const rowsOf = (engine: Engine, runId: string) =>
  jobRows(engine).filter((j) => j.correlation_id === runId)

// ---------------------------------------------------------------- 8

test("8. a video run whose selected plan's estimate is above its ceiling finishes refused for budget with limit 'ceiling', the plan's estimate as estimateCents, the ceiling and the cap; its events end stage.finished for plan, run.finished; it writes no question and leaves one job row", async () => {
  const before = repoQuestions()
  const engine = await startEngine({ worker: false, script: forkOfTwo() })
  try {
    // A ceiling the pictures fit and the reel does not: a stills run would be admitted here.
    const ceiling = 100
    assert.ok(PICTURES <= ceiling && ceiling < ESTIMATE, 'the fixture no longer separates them')
    const ran = await ranAlone(engine, videoOf('r8', ceiling))

    assert.deepEqual(ran.result, {
      contractVersion: 1,
      runId: ran.runId,
      requestId: 'r8',
      costCents: 0,
      status: 'refused',
      reason: 'budget',
      limit: 'ceiling',
      estimateCents: ESTIMATE,
      ceilingCents: ceiling,
      capCents: 300,
    })

    // The figure is the SELECTED plan's estimate, as its row stores it: not its pictures' share, and
    // not the other plan's.
    const selected = ran.plans.find((p) => p.selected)
    assert.equal(selected?.role, 'b', 'the fixture no longer selects the 6-unit plan')
    assert.equal(selected?.estimateCents, ran.result.estimateCents)
    assert.notEqual(ran.result.estimateCents, PICTURES)
    assert.equal(ran.plans.find((p) => p.role === 'a')?.estimateCents, OTHER)

    // The stage produced a plan, so it finished; and the run ends there (S-025, S-069).
    assert.deepEqual(described(ran.events), [
      'run.accepted',
      'stage.started plan',
      'verdict 0 accept',
      'verdict 0 accept',
      'stage.finished plan',
      'run.finished refused',
    ])

    // One job row (D-083), no call past planning, and no question: the ceiling is the caller's, not
    // the engine's cap (D-100).
    assert.deepEqual(
      rowsOf(engine, ran.runId).map((j) => ({ kind: j.kind, state: j.state })),
      [{ kind: 'reel.plan', state: 'done' }],
    )
    assert.equal(jobRows(engine).length, 1, 'a job row was made for the refused run')
    assert.equal(engine.image.calls.length, 0, 'a picture was asked for')
    assert.deepEqual(written(engine), [], 'a question, or another file, was written')
  } finally {
    await engine.stop()
  }
  assert.equal(repoQuestions(), before, "the repository's own questions file was written")
})

test("8. a video run's ceiling of exactly the selected plan's estimate is admitted while one cent less is refused", async () => {
  const engine = await startEngine({ worker: false, script: repeated(2) })
  try {
    // Admitted: the plan job ends the plan stage and makes the chain's next row. What its stills
    // stage then does is not this check's — this script answers no picture's checks.
    const exact = await ranAlone(engine, videoOf('r8-exact', ESTIMATE))
    assert.deepEqual(
      rowsOf(engine, exact.runId).map((j) => j.kind),
      ['reel.plan', 'reel.keyframes'],
      `a ceiling of exactly ${ESTIMATE} cents was not admitted: ${JSON.stringify(exact.result)}`,
    )
    assert.notEqual(exact.result.status, 'refused', JSON.stringify(exact.result))
    assert.deepEqual(
      described(exact.events).slice(0, 6),
      [
        'run.accepted',
        'stage.started plan',
        'verdict 0 accept',
        'verdict 0 accept',
        'stage.finished plan',
        'stage.started stills',
      ],
      'the admitted run did not go on to its stills stage',
    )

    const short = await ranAlone(engine, videoOf('r8-short', ESTIMATE - 1))
    assert.deepEqual(short.result, {
      contractVersion: 1,
      runId: short.runId,
      requestId: 'r8-short',
      costCents: 0,
      status: 'refused',
      reason: 'budget',
      limit: 'ceiling',
      estimateCents: ESTIMATE,
      ceilingCents: ESTIMATE - 1,
      capCents: 300,
    })
    assert.deepEqual(
      rowsOf(engine, short.runId).map((j) => j.kind),
      ['reel.plan'],
      'a refused run was given a keyframes row',
    )
  } finally {
    await engine.stop()
  }
})
