import assert from 'node:assert/strict'
import { rmSync } from 'node:fs'
import { connect } from 'node:net'
import { test } from 'node:test'
import { readSettings, startService as startInProcess } from '@cutroom/service'
import { serviceFolder, startService, waitFor } from './engine/service.ts'
import { THREE_RANKS, THREE_RANKS_PICS } from './engine/stills.ts'
import { described, videoRequest, videoScript, type Event } from './engine/video.ts'

// paid-path, Slice 1 — checks 1 and 5 (docs/features/paid-path.md): the engine RUNS AS A PROGRAM.
//
// Everything before this feature was started by tests/engine/harness.ts, which calls startApi and
// startWorker as libraries. The paid path's gate review found that nothing had ever started either
// half outside a test — so "a caller can ask the engine for a reel over HTTP" had never been true
// of a program. These two checks are what makes it true: apps/service, spawned as a process, given
// nothing but an environment, answering on loopback and stopping cleanly.
//
// Every provider setting is left unset, so every port is a stand-in (S-108): no key, no network,
// no spend. What the stand-in model answers comes from the script file CUTROOM_STAND_IN_SCRIPT
// names (S-116) — the one setting that lets a free engine finish a reel at all, since the stand-in
// model answers from a script and refuses when it has none.

/** THREE_RANKS' plan stage, as reel-plan writes it: a forked plan, one fork failing Gate 0. */
const PLANNED = [
  'run.accepted',
  'stage.started plan',
  'verdict 0 fail',
  'verdict 0 accept',
  'stage.finished plan',
]

/**
 * THREE_RANKS' stills stage, completed: Gate 1 on each picture as it is made — the canonical's two
 * candidates, then the barons', then the hall's — and Gate 1S rank by rank (reel-stills, S-057).
 */
const STILLS = [
  'stage.started stills',
  'verdict 1 shot-0 accept',
  'verdict 1 shot-0 accept',
  'verdict 1 shot-1 accept',
  'verdict 1 shot-2 accept',
  'verdict 1S shot-1 accept',
  'verdict 1S shot-2 accept',
  'stage.finished stills',
]

/** THREE_RANKS' clips stage: one take a shot, each accepted at Gates 2, 3, 4 and 5 (S-069, S-094). */
const CLIPS = [
  'stage.started video',
  'verdict 2 shot-0 accept',
  'verdict 3 shot-0 accept',
  'verdict 4 shot-0 accept',
  'verdict 5 shot-0 accept',
  'verdict 2 shot-1 accept',
  'verdict 3 shot-1 accept',
  'verdict 4 shot-1 accept',
  'verdict 5 shot-1 accept',
  'verdict 2 shot-2 accept',
  'verdict 3 shot-2 accept',
  'verdict 4 shot-2 accept',
  'verdict 5 shot-2 accept',
  'verdict 2 shot-3 accept',
  'verdict 3 shot-3 accept',
  'verdict 4 shot-3 accept',
  'verdict 5 shot-3 accept',
  'verdict 2 shot-4 accept',
  'verdict 3 shot-4 accept',
  'verdict 4 shot-4 accept',
  'verdict 5 shot-4 accept',
  'verdict 2 shot-5 accept',
  'verdict 3 shot-5 accept',
  'verdict 4 shot-5 accept',
  'verdict 5 shot-5 accept',
  'verdict 7 accept',
  'stage.finished video',
  'run.finished completed',
]

/** The whole run, typed by hand, as reel-takes' check 25 types each of its six endings. */
const COMPLETED = [...PLANNED, ...STILLS, ...CLIPS]

const standIn = { model: videoScript(THREE_RANKS, THREE_RANKS_PICS) }

// ---------------------------------------------------------------- 1

test('1. the service, started as a process with no provider settings and no key, applies its migrations, listens on loopback, and completes a video run submitted over HTTP: its events are exactly those typed here, every receipt is fake, nothing was spent, and every path it wrote is under its configured artifact root', async () => {
  const service = await startService({ standIn })
  try {
    // Loopback only, and no setting can move it (D-098, apps/api/src/server.ts).
    assert.match(service.baseUrl, /^http:\/\/127\.0\.0\.1:\d+$/, service.output())

    // The migrations were applied by the service, before either half ran: a database the worker
    // and the API could both open holds every table this chain writes.
    const tables = service
      .query<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table'")
      .map((t) => t.name)
    for (const table of ['run', 'job', 'plan', 'picture', 'narration', 'take', 'render']) {
      assert.ok(
        tables.includes(table),
        `the migrations left no ${table} table: ${tables.join(', ')}`,
      )
    }

    const submitted = await service.http.submit(videoRequest('paid-1'))
    assert.equal(submitted.status, 202, JSON.stringify(submitted.json))
    const runId = String(submitted.json.runId)

    await waitFor(`run ${runId} to finish`, async () => {
      const { json } = await service.http.status(runId)
      return json.state === 'finished'
    })

    const events = (await service.http.events(runId)).json.events as Event[]
    assert.deepEqual(described(events), COMPLETED)

    const result = (await service.http.result(runId)).json
    assert.equal(result.status, 'completed', JSON.stringify(result))
    assert.equal(result.until, 'video', JSON.stringify(result))
    assert.equal(result.costCents, 0, 'a stand-in run spent something')

    // Every receipt of every kind says it was a stand-in's (S-036, S-108's default).
    for (const table of [
      'model_receipt',
      'generation_receipt',
      'speech_receipt',
      'video_receipt',
    ]) {
      const rows = service.query<{ fake: number }>(`SELECT fake FROM ${table}`)
      assert.ok(rows.length > 0, `${table} holds no row, so "every receipt is fake" proves nothing`)
      assert.deepEqual(
        rows.filter((r) => r.fake !== 1),
        [],
        `a row of ${table} is not a stand-in's`,
      )
    }

    // D-086, D-087: one artifact root, the one the service was configured with.
    const written = [
      ...service.query<{ path: string }>('SELECT path FROM picture'),
      ...service.query<{ path: string }>('SELECT path FROM narration'),
      ...service.query<{ path: string }>('SELECT path FROM take WHERE path IS NOT NULL'),
      ...service.query<{ path: string }>('SELECT path FROM render WHERE path IS NOT NULL'),
    ].map((r) => r.path)
    assert.ok(written.length > 0, 'the run wrote no file')
    assert.deepEqual(
      written.filter((p) => !p.startsWith(service.artifactRoot)),
      [],
      `a path is not under ${service.artifactRoot}`,
    )
  } finally {
    await service.stop()
    service.clean()
  }
})

// ---------------------------------------------------------------- 5

/** Whether anything is listening on a port, asked the way a caller would find out. */
async function listening(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = connect({ host: '127.0.0.1', port })
    socket.once('connect', () => {
      socket.destroy()
      resolve(true)
    })
    socket.once('error', () => {
      socket.destroy()
      resolve(false)
    })
  })
}

test('5. the service stops on being told to: the API closes, the worker takes no new job, no job is left running, and the process exits by itself without an open handle', async () => {
  const service = await startService({ standIn })
  const port = Number(new URL(service.baseUrl).port)
  try {
    const submitted = await service.http.submit(videoRequest('paid-5'))
    assert.equal(submitted.status, 202, JSON.stringify(submitted.json))
    const runId = String(submitted.json.runId)

    // Stopped with a job in hand: the worker has claimed the plan job and is running it.
    await waitFor('the plan stage to start', async () => {
      const events = (await service.http.events(runId)).json.events as Event[]
      return events.some((e) => e.type === 'stage.started')
    })

    const ended = await service.stop()
    // It exits BY ITSELF: nothing calls process.exit, so a leaked timer, socket or database
    // handle would hold the process open and this would time out instead of returning 0.
    assert.deepEqual(ended, { code: 0, signal: null }, service.output())
    assert.equal(await listening(port), false, 'the API is still listening')

    // The worker finished the job it held rather than abandoning it, and claimed no other: no row
    // is left running, so every job is finished or claimable by whoever starts next (D-002, S-027).
    const jobs = service.query<{ kind: string; state: string }>('SELECT kind, state FROM job')
    assert.ok(jobs.length > 0, 'no job was ever queued')
    assert.deepEqual(
      jobs.filter((j) => j.state === 'running'),
      [],
      `a job was left running: ${JSON.stringify(jobs)}`,
    )
  } finally {
    await service.kill()
    service.clean()
  }
})

test("5. SIGINT runs the service's own shutdown: the service registers exactly one handler, and the handler the operating system would call closes the API and stops the worker", async () => {
  // Windows delivers NO signal to a spawned child — SIGINT, SIGBREAK, SIGTERM and SIGHUP each
  // terminate it unconditionally and no handler runs (measured, S-118). So the test above stops a
  // real process the only way this machine can, and this one proves that what SIGINT is wired to
  // is that same shutdown: it calls the handler the service registered, which is what the
  // operating system calls where a signal arrives.
  const folder = serviceFolder({ standIn })
  const before = process.listeners('SIGINT')
  const service = await startInProcess(readSettings(folder.env))
  try {
    const added = process.listeners('SIGINT').filter((h) => !before.includes(h))
    assert.equal(added.length, 1, 'the service registered no SIGINT handler, or more than one')

    const port = Number(new URL(service.baseUrl).port)
    assert.equal(await listening(port), true, 'the service did not listen')

    ;(added[0] as (signal: NodeJS.Signals) => void)('SIGINT')
    await service.stopped

    assert.equal(await listening(port), false, 'the API is still listening')
    assert.deepEqual(
      process.listeners('SIGINT').filter((h) => !before.includes(h)),
      [],
      'a stopped service left its SIGINT handler behind',
    )
  } finally {
    await service.stop()
    rmSync(folder.dir, { recursive: true, force: true })
  }
})
