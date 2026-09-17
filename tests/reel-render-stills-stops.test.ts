import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { test } from 'node:test'
import type { FakeImageScript, FakeScript, FakeSensorScript } from '@cutroom/providers'
import type { SubmitRequest } from '@cutroom/reel-contract'
import { finished, startEngine, type Engine } from './engine/harness.ts'
import {
  THREE_RANKS,
  THREE_RANKS_PICS,
  again,
  clipped,
  readStills,
  stillsRequest,
  stillsScript,
  type Pic,
  type Stilled,
} from './engine/stills.ts'
import { described, jobRows, videoRequest } from './engine/video.ts'

// reel-render, Slice 2 — check 10 (docs/features/reel-render.md): a video run whose stills stage does
// not complete ends EXACTLY as a stills run does (S-046, S-069) — the same result, the same events, the
// same rows and labels, the same question — and the chain gets no reel.clips row (D-083).
//
// Each ending is built twice, from one fixture, on two engines: once asked for pictures and once for a
// video. Two engines, not one, so neither run's script can be read by the other. Every video request
// here has a ceiling at or above its plan's estimate — 4 image calls at 15 cents and 40 seconds at 4,
// 220 cents — so it is admitted, and its stills stage is reached.

const [a, b] = THREE_RANKS_PICS as [Pic, Pic]

const ESTIMATE = 220

interface Fixture {
  script: () => FakeScript
  images?: FakeImageScript
  sensors?: FakeSensorScript
  budgetCents: number
}

interface Ended {
  ran: Stilled
  jobs: ReturnType<typeof jobRows>
  questions: string[]
}

/** The entries of a questions file, each with the run, the request and every time made anonymous. */
function questionsOf(engine: Engine, ran: Stilled, requestId: string): string[] {
  if (!existsSync(engine.questionsPath)) return []
  return readFileSync(engine.questionsPath, 'utf8')
    .split(/^(?=## )/m)
    .filter((entry) => entry.startsWith('## '))
    .map((entry) =>
      entry
        .replaceAll(ran.runId, '<run>')
        .replaceAll(requestId, '<request>')
        .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z/g, '<time>'),
    )
}

/**
 * Runs one request of a fixture on an engine of its own, to its end. The worker is stopped before
 * anything is read — it returns only once the job in hand has — so a row written after the run was
 * finished is in the table when it is read.
 */
async function ended(fixture: Fixture, request: SubmitRequest): Promise<Ended> {
  const engine = await startEngine({
    worker: true,
    script: fixture.script(),
    ...(fixture.images === undefined ? {} : { images: fixture.images }),
    ...(fixture.sensors === undefined ? {} : { sensors: fixture.sensors }),
  })
  try {
    const submitted = await engine.http.submit(request)
    assert.equal(submitted.status, 202, JSON.stringify(submitted.json))
    const runId = String(submitted.json.runId)
    await finished(engine, runId)
    await engine.stopWorker()
    const result = (await engine.http.result(runId)).json
    const ran = await readStills(engine, runId, result)()
    return { ran, jobs: jobRows(engine), questions: questionsOf(engine, ran, request.requestId) }
  } finally {
    await engine.stop()
  }
}

/** The fixture's run asked for pictures and asked for a video, and every way the two could differ. */
async function endsAsStillsDoes(name: string, fixture: Fixture): Promise<Ended> {
  const pictures = await ended(fixture, stillsRequest(`r10-${name}-stills`, fixture.budgetCents))
  const video = await ended(fixture, videoRequest(`r10-${name}-video`, fixture.budgetCents))

  const anonymous = (e: Ended) => ({ ...e.ran.result, runId: '', requestId: '' })
  assert.deepEqual(anonymous(video), anonymous(pictures), `${name}: the results differ`)
  assert.deepEqual(
    described(video.ran.events),
    described(pictures.ran.events),
    `${name}: the events differ`,
  )

  // The same rows, as an operator reads them: each job, each picture with its checks and labels, each
  // degradation and each image receipt.
  const jobs = (e: Ended) =>
    e.jobs.map((j) => ({ kind: j.kind, state: j.state, attempts: j.attempts, cost: j.cost_cents }))
  assert.deepEqual(jobs(video), jobs(pictures), `${name}: the job rows differ`)
  const pictureRows = (e: Ended) =>
    e.ran.pictures.map((p) => ({
      picture_id: p.picture_id,
      seq: p.seq,
      gate1: p.gate1,
      gate1s: p.gate1s,
      degradation: p.degradation,
      chosen: p.chosen,
    }))
  assert.deepEqual(pictureRows(video), pictureRows(pictures), `${name}: the pictures differ`)
  assert.deepEqual(video.ran.degradations, pictures.ran.degradations)
  const receipts = (e: Ended) =>
    e.ran.generations.map((g) => ({ id: g.picture_id, cost: g.cost_cents, degraded: g.degraded }))
  assert.deepEqual(receipts(video), receipts(pictures), `${name}: the image receipts differ`)
  assert.deepEqual(
    { ...video.ran.record, runId: '' },
    { ...pictures.ran.record, runId: '' },
    `${name}: the records differ`,
  )
  assert.deepEqual(video.questions, pictures.questions, `${name}: the questions differ`)

  // And the chain ends with the keyframes job: no reel.clips row (D-083).
  assert.deepEqual(
    video.jobs.map((j) => j.kind),
    ['reel.plan', 'reel.keyframes'],
    `${name}: a video run whose stills stage stopped has a job row after its keyframes job`,
  )
  // Not a stage that completed: no stage.finished for stills (S-025, S-046).
  assert.ok(
    !described(video.ran.events).includes('stage.finished stills'),
    `${name}: stage.finished for stills`,
  )
  return video
}

// ---------------------------------------------------------------- 10

test('10. a video run whose stills stage stops for a rule, stops for budget or fails ends exactly as a stills run does, with no reel.clips row', async () => {
  // Stopped for a rule: the canonical fails Gate 1 three times (D-047).
  const rule = await endsAsStillsDoes('rule', {
    script: () =>
      stillsScript(THREE_RANKS, [a, b, again(a, 'repair')], {
        witness: { [a.key]: clipped(a), [b.key]: clipped(b), 'shot-0-repair': clipped(a) },
      }),
    budgetCents: 300,
  })
  assert.equal(rule.ran.result.status, 'stopped', JSON.stringify(rule.ran.result))
  assert.equal(rule.ran.result.reason, 'rule')
  assert.equal(rule.ran.result.rule, 'gate-1')
  assert.equal(rule.ran.result.step, 'stills')

  // Stopped for budget at the caller's ceiling, admitted at exactly the estimate: the first
  // canonical candidate costs 210, so the second — 210 + 15 against 220 — is not made. No question.
  const ceiling = await endsAsStillsDoes('ceiling', {
    script: () => stillsScript(THREE_RANKS, THREE_RANKS_PICS),
    images: { [a.key]: { costCents: 210 } },
    budgetCents: ESTIMATE,
  })
  assert.equal(ceiling.ran.result.reason, 'budget', JSON.stringify(ceiling.ran.result))
  assert.equal(ceiling.ran.result.limit, 'ceiling')
  assert.deepEqual(ceiling.questions, [])

  // Stopped for budget at the per-reel cap, under a ceiling well above it: 290 + 15 passes the pinned
  // 300, so the second candidate is not made, and the owner is asked once (D-100, S-035).
  const cap = await endsAsStillsDoes('cap', {
    script: () => stillsScript(THREE_RANKS, THREE_RANKS_PICS),
    images: { [a.key]: { costCents: 290 } },
    budgetCents: 1000,
  })
  assert.equal(cap.ran.result.reason, 'budget', JSON.stringify(cap.ran.result))
  assert.equal(cap.ran.result.limit, 'reel')
  assert.equal(cap.questions.length, 1, 'a stop at the cap did not ask once')

  // Failed: the judge cannot be reached on the hall's pair.
  const failed = await endsAsStillsDoes('failed', {
    script: () => ({
      ...stillsScript(THREE_RANKS, THREE_RANKS_PICS),
      judge: [{ throws: 'the judge cannot be reached' }],
    }),
    sensors: { [(THREE_RANKS_PICS[3] as Pic).key]: { similarity: 0.5 } },
    budgetCents: 300,
  })
  assert.equal(failed.ran.result.status, 'failed', JSON.stringify(failed.ran.result))
})
