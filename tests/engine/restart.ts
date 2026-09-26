import assert from 'node:assert/strict'
import type { FakeScript } from '@cutroom/providers'
import type { SubmitRequest } from '@cutroom/reel-contract'
import { waitFor, type Engine } from './harness.ts'
import { readStills, type Stilled } from './stills.ts'
import { VIDEO_FINISH_MS, readVideo, type Videoed } from './video.ts'

// A stills run whose worker is killed in the middle of its stills stage and whose keyframes job a
// new worker takes up (docs/features/reel-stills.md, Gate 2 "A restart"; checks 48 and 49; S-027,
// S-048, S-062). The first worker runs in a process of its own and is killed while its model
// stand-in holds one call open — the only way to end a worker with its job in hand. The new worker
// runs in this process, answering from a script of its own, and claims the job once its lease has
// run out.
//
// WHICH CALL IS HELD IS COUNTED ACROSS EVERY MODEL CALL, THE PLANNER'S INCLUDED: the fixture plans
// make two planner calls, then each picture past technical one `observe` and one reconcile call. So
// holding call 5 holds the second picture's witness, when two image calls have returned. Each test
// says which picture's call it holds, and the picture ids the first attempt made are asserted from
// the run's generation receipts before the kill — the count of calls is never trusted.

/** Short, so the new worker claims the job about a second after the first one's claim. */
export const LEASE_MS = 1000

/** How long a restarted run is given to finish, with the whole suite running beside it. */
const FINISH_MS = 60_000

export type Event = Record<string, unknown> & { type: string }

/** Events as one line each, the way check 41 writes them. */
export const described = (events: readonly Event[]) =>
  events.map((e) => {
    if (e.type === 'verdict') {
      return `verdict ${String(e.gate)}${e.shotId === undefined ? '' : ` ${String(e.shotId)}`} ${String(e.outcome)}`
    }
    if (e.type === 'degraded') return `degraded ${String(e.shotId)}`
    if (e.type === 'run.finished') return `run.finished ${String(e.status)}`
    return e.stage === undefined ? e.type : `${e.type} ${String(e.stage)}`
  })

/** The plan stage's events of every admitted fixture run: plan a fails Gate 0, plan b survives. */
export const PLANNED = [
  'run.accepted',
  'stage.started plan',
  'verdict 0 fail',
  'verdict 0 accept',
  'stage.finished plan',
]

export interface JobRow {
  id: number
  kind: string
  state: string
  attempts: number
  locked_at: string | null
  lease_until: string | null
  cost_cents: number
}

export interface Killed {
  runId: string
  /** What the run held once its worker had been killed, read from its rows. */
  before: {
    events: string[]
    generations: Array<{ id: number; picture_id: string; cost_cents: number }>
    receipts: Array<{ id: number; call: string; role: string; picture_ids: string }>
    keyframes: JobRow
  }
}

const jobsOf = (engine: Engine, runId: string) =>
  engine.query<JobRow>(
    'SELECT id, kind, state, attempts, locked_at, lease_until, cost_cents FROM job WHERE correlation_id = ? ORDER BY id',
    runId,
  )

/**
 * Submits `request` and runs it in a worker process until that worker's stand-in holds model call
 * `holdAtCall` open, then kills the process. `made` is the picture ids the test says the first
 * attempt's image calls made by then, in order; the run's generation receipts must be exactly those.
 */
export async function killedMidStills(
  engine: Engine,
  request: SubmitRequest,
  first: { script: FakeScript; holdAtCall: number; made: readonly string[] },
): Promise<Killed> {
  const submitted = await engine.http.submit(request)
  assert.equal(submitted.status, 202, JSON.stringify(submitted.json))
  const runId = String(submitted.json.runId)

  const crashed = engine.spawnWorker({
    script: first.script,
    holdAtCall: first.holdAtCall,
    leaseMs: LEASE_MS,
  })
  try {
    // A worker that never reaches the call would leave this waiting for ever: fail instead.
    let timer: ReturnType<typeof setTimeout> | undefined
    await Promise.race([
      crashed.held,
      new Promise((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`the worker never held model call ${first.holdAtCall}`)),
          FINISH_MS,
        )
      }),
    ]).finally(() => clearTimeout(timer))
  } finally {
    await crashed.kill()
  }

  const events = (await engine.http.events(runId)).json.events as Event[]
  const generations = engine.query<{ id: number; picture_id: string; cost_cents: number }>(
    'SELECT id, picture_id, cost_cents FROM generation_receipt WHERE run_id = ? ORDER BY id',
    runId,
  )
  const receipts = engine.query<{ id: number; call: string; role: string; picture_ids: string }>(
    'SELECT id, call, role, picture_ids FROM model_receipt WHERE run_id = ? ORDER BY id',
    runId,
  )
  const jobs = jobsOf(engine, runId)
  const keyframes = jobs.find((j) => j.kind === 'reel.keyframes')

  // The worker was killed in the middle of the stills stage, having made exactly these pictures.
  assert.deepEqual(
    generations.map((g) => g.picture_id),
    [...first.made],
    'the first attempt had not made the pictures the test holds it after',
  )
  assert.deepEqual(described(events), [...PLANNED, 'stage.started stills'])
  assert.deepEqual(
    jobs.map((j) => [j.kind, j.state, j.attempts]),
    [
      ['reel.plan', 'done', 1],
      ['reel.keyframes', 'running', 1],
    ],
  )
  assert.ok(keyframes !== undefined)
  return { runId, before: { events: described(events), generations, receipts, keyframes } }
}

/**
 * A FURTHER kill of the same run (resume-failed, S-164): a new worker process claims the keyframes job
 * once the last claim's lease has run out, makes what its attempt makes, and is killed while its
 * stand-in holds model call `next.holdAtCall` open — counted from this worker's first call, which is
 * the witness of the first picture this attempt makes, the planner's calls being long done. `made` is
 * every picture id the run's image calls have made by then, in order, every attempt's; the run's
 * generation receipts must be exactly those. The job is running at one more attempt than before.
 */
export async function killedAgain(
  engine: Engine,
  killed: Killed,
  next: { script: FakeScript; holdAtCall: number; made: readonly string[] },
): Promise<Killed> {
  const { runId } = killed
  const crashed = engine.spawnWorker({
    script: next.script,
    holdAtCall: next.holdAtCall,
    leaseMs: LEASE_MS,
  })
  try {
    let timer: ReturnType<typeof setTimeout> | undefined
    await Promise.race([
      crashed.held,
      new Promise((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`the worker never held model call ${next.holdAtCall} again`)),
          FINISH_MS,
        )
      }),
    ]).finally(() => clearTimeout(timer))
  } finally {
    await crashed.kill()
  }

  const events = (await engine.http.events(runId)).json.events as Event[]
  const generations = engine.query<{ id: number; picture_id: string; cost_cents: number }>(
    'SELECT id, picture_id, cost_cents FROM generation_receipt WHERE run_id = ? ORDER BY id',
    runId,
  )
  const receipts = engine.query<{ id: number; call: string; role: string; picture_ids: string }>(
    'SELECT id, call, role, picture_ids FROM model_receipt WHERE run_id = ? ORDER BY id',
    runId,
  )
  const jobs = jobsOf(engine, runId)
  const keyframes = jobs.find((j) => j.kind === 'reel.keyframes')

  // Every receipt so far, every attempt's; the stage started once and never finished; the job
  // claimed once more, and no earlier than the last claim's lease ran out.
  assert.deepEqual(
    generations.map((g) => g.picture_id),
    [...next.made],
    'the attempts so far had not made the pictures the test holds them after',
  )
  assert.deepEqual(described(events), [...PLANNED, 'stage.started stills'])
  assert.deepEqual(
    jobs.map((j) => [j.kind, j.state, j.attempts]),
    [
      ['reel.plan', 'done', 1],
      ['reel.keyframes', 'running', killed.before.keyframes.attempts + 1],
    ],
  )
  assert.ok(keyframes !== undefined)
  assert.ok(
    String(keyframes.locked_at) >= String(killed.before.keyframes.lease_until),
    `the job was claimed again at ${keyframes.locked_at}, before its lease ran out at ${killed.before.keyframes.lease_until}`,
  )
  return { runId, before: { events: described(events), generations, receipts, keyframes } }
}

/**
 * Stops the API and starts it again on the same file, starts a new worker whose stand-in answers
 * from `script`, and waits for the run to finish. The keyframes job must have been claimed once more
 * than the last kill left it — a second time after one kill, a fourth after three (resume-failed,
 * `killedAgain`) — and no earlier than the last claim's lease ran out (D-002, S-027).
 */
export async function takenUp(
  engine: Engine,
  killed: Killed,
  script: FakeScript,
): Promise<Stilled> {
  await engine.restart({ script })
  await engine.startWorker()
  const { runId } = killed
  await waitFor(
    `run ${runId} to finish after its worker was killed`,
    async () => (await engine.http.status(runId)).json.state === 'finished',
    FINISH_MS,
  )
  const keyframes = jobsOf(engine, runId).find((j) => j.kind === 'reel.keyframes')
  const expected = killed.before.keyframes.attempts + 1
  assert.equal(
    keyframes?.attempts,
    expected,
    `the keyframes job was not run as attempt ${expected}`,
  )
  assert.equal(keyframes?.state, 'done')
  assert.ok(
    String(keyframes?.locked_at) >= String(killed.before.keyframes.lease_until),
    `the job was claimed again at ${keyframes?.locked_at}, before its lease ran out at ${killed.before.keyframes.lease_until}`,
  )
  const result = (await engine.http.result(runId)).json
  return readStills(engine, runId, result)()
}

// ---------------------------------------------------------------- a video run (reel-render)

// A video run whose worker is killed in its clips stage or at Gate 7, and whose clips or assemble job
// a new worker takes up (docs/features/reel-render.md, Gate 2 "Cancel, and a restart"; checks 48 and
// 49; S-027, S-076). The same mechanism as the stills stage's: the first worker in a process of its
// own, killed while its stand-in holds one model call open, counted across every model call. For
// THREE_RANKS with the default sensors that is the planner's two calls, the stills stage's eight (four
// pictures, a witness and a reconcile each, and no compare), then each take's witness and reconcile —
// take k's witness is call 11 + 2k — and Gate 7's judgeCut, call 23. Each test says which call it
// holds, and what the first attempt made by then is asserted from the run's receipts before the kill:
// the count of calls is never trusted (S-062).

type ChainKind = 'reel.clips' | 'reel.assemble'

export interface KilledVideo {
  runId: string
  /** What the run held once its worker had been killed, read from its rows. */
  before: {
    events: string[]
    generations: Array<{ id: number; picture_id: string; cost_cents: number }>
    speech: Array<{ id: number; narration_id: string; cost_cents: number }>
    clips: Array<{ id: number; take_id: string; cost_cents: number }>
    receipts: Array<{ id: number; call: string; role: string; take_ids: string }>
    /** The job the worker was killed in. */
    job: JobRow
  }
}

/**
 * Submits `request` and runs it in a worker process until that worker's stand-in holds model call
 * `holdAtCall` open, then kills the process. `running` is the job it must have been killed in, and
 * `made` the narration and take ids the test says the first clips attempt made by then, in order; the
 * run's speech and video receipts must be exactly those.
 */
export async function killedMidVideo(
  engine: Engine,
  request: SubmitRequest,
  first: {
    script: FakeScript
    holdAtCall: number
    running: ChainKind
    made: { narrations: readonly string[]; takes: readonly string[] }
  },
): Promise<KilledVideo> {
  const submitted = await engine.http.submit(request)
  assert.equal(submitted.status, 202, JSON.stringify(submitted.json))
  const runId = String(submitted.json.runId)

  const crashed = engine.spawnWorker({
    script: first.script,
    holdAtCall: first.holdAtCall,
    leaseMs: LEASE_MS,
  })
  try {
    // A worker that never reaches the call would leave this waiting for ever: fail instead.
    let timer: ReturnType<typeof setTimeout> | undefined
    await Promise.race([
      crashed.held,
      new Promise((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`the worker never held model call ${first.holdAtCall}`)),
          VIDEO_FINISH_MS,
        )
      }),
    ]).finally(() => clearTimeout(timer))
  } finally {
    await crashed.kill()
  }

  const events = (await engine.http.events(runId)).json.events as Event[]
  const generations = engine.query<{ id: number; picture_id: string; cost_cents: number }>(
    'SELECT id, picture_id, cost_cents FROM generation_receipt WHERE run_id = ? ORDER BY id',
    runId,
  )
  const speech = engine.query<{ id: number; narration_id: string; cost_cents: number }>(
    'SELECT id, narration_id, cost_cents FROM speech_receipt WHERE run_id = ? ORDER BY id',
    runId,
  )
  const clips = engine.query<{ id: number; take_id: string; cost_cents: number }>(
    'SELECT id, take_id, cost_cents FROM video_receipt WHERE run_id = ? ORDER BY id',
    runId,
  )
  const receipts = engine.query<{ id: number; call: string; role: string; take_ids: string }>(
    'SELECT id, call, role, take_ids FROM model_receipt WHERE run_id = ? ORDER BY id',
    runId,
  )
  const jobs = jobsOf(engine, runId)
  // As plain objects, so a test can hold later reads of the same rows equal to them.
  const plain = <T extends object>(rows: T[]): T[] => rows.map((r) => ({ ...r }))

  // The worker was killed in the job the test names, having made exactly these.
  assert.deepEqual(
    { narrations: speech.map((s) => s.narration_id), takes: clips.map((c) => c.take_id) },
    { narrations: [...first.made.narrations], takes: [...first.made.takes] },
    'the first attempt had not made the narrations and takes the test holds it after',
  )
  const chain: Array<[string, string, number]> = [
    ['reel.plan', 'done', 1],
    ['reel.keyframes', 'done', 1],
    ['reel.clips', first.running === 'reel.clips' ? 'running' : 'done', 1],
  ]
  if (first.running === 'reel.assemble') chain.push(['reel.assemble', 'running', 1])
  assert.deepEqual(
    jobs.map((j) => [j.kind, j.state, j.attempts]),
    chain,
  )
  const job = jobs.find((j) => j.kind === first.running)
  assert.ok(job !== undefined)
  return {
    runId,
    before: {
      events: described(events),
      generations: plain(generations),
      speech: plain(speech),
      clips: plain(clips),
      receipts: plain(receipts),
      job: { ...job },
    },
  }
}

/**
 * Stops the API and starts it again on the same file, starts a new worker whose stand-in answers
 * from `script`, and waits for the run to finish, for as long as a video run may take. The job the
 * first worker was killed in must have been claimed a second time, and no earlier than the first
 * claim's lease ran out (D-002, S-027).
 */
export async function takenUpVideo(
  engine: Engine,
  killed: KilledVideo,
  script: FakeScript,
): Promise<Videoed> {
  await engine.restart({ script })
  await engine.startWorker()
  const { runId } = killed
  await waitFor(
    `video run ${runId} to finish after its worker was killed`,
    async () => (await engine.http.status(runId)).json.state === 'finished',
    VIDEO_FINISH_MS,
  )
  const kind = killed.before.job.kind
  const job = jobsOf(engine, runId).find((j) => j.kind === kind)
  assert.equal(job?.attempts, 2, `the ${kind} job was not run a second time`)
  assert.equal(job?.state, 'done')
  assert.ok(
    String(job?.locked_at) >= String(killed.before.job.lease_until),
    `the job was claimed again at ${job?.locked_at}, before its lease ran out at ${killed.before.job.lease_until}`,
  )
  return readVideo(engine, runId)
}
