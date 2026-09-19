import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import type { RenderSettings } from '@cutroom/contracts'
import { DEFAULT_PLAN_SETTINGS, DEFAULT_RENDER_SETTINGS } from '@cutroom/pipeline'
import {
  REQUIRED_FILTERS,
  fakeImage,
  fakeModel,
  fakeNarration,
  fakeSensors,
  fakeVideo,
  ffmpegAssembler,
  ffmpegMedia,
  ffmpegTools,
} from '@cutroom/providers'
import { startWorker } from '@cutroom/worker'
import { startEngine, waitFor } from './engine/harness.ts'
import { planRequest } from './engine/plans.ts'

// reel-takes, Slice 1 — check 2 (docs/features/reel-takes.md): the settings a retry and a still-hold
// read, and the filter the pass will need (D-024, D-025, I-11, S-075, S-096, S-097).
//
// A call answered `unavailable` is sent again up to `maxAttempts` sends in all, waiting `backoffMs`
// and then twice that (S-096); a held shot is pushed in from a zoom of 1 to `endZoom` (S-097). A
// setting that could not work — no send at all, a wait that is negative or not a number, a push that
// does not push in — makes the worker refuse to start before it opens its database, so it claims no
// job (S-077's order). And `zoompan` joins the filters the one pass uses, so every `ready()` requires
// it (S-075, S-097).

const CHECK_2 =
  "2. DEFAULT_RENDER_SETTINGS' transient is 3 sends and 1000 ms and its still push ends at 1.1; a worker handed maxAttempts that is not a whole number of at least 1, a backoffMs that is not a finite number of at least 0, or an endZoom that is not a finite number above 1, refuses to start and claims no job; and REQUIRED_FILTERS holds zoompan"

// ---------------------------------------------------------------- 2

test(`${CHECK_2} — the defaults`, () => {
  assert.deepEqual(
    { ...DEFAULT_RENDER_SETTINGS.transient },
    { maxAttempts: 3, backoffMs: 1000 },
    'the default transient setting is not 3 sends and 1000 ms (D-024, I-11, S-096)',
  )
  assert.deepEqual(
    { ...DEFAULT_RENDER_SETTINGS.stillPush },
    { endZoom: 1.1 },
    'the default still push does not end at 1.1 (D-025, S-097)',
  )
})

test(`${CHECK_2} — the refusals`, async () => {
  const engine = await startEngine({ worker: false })
  const dir = mkdtempSync(join(tmpdir(), 'reel-takes-settings-'))
  try {
    // A run is waiting, so a worker that started its loop before refusing would claim it.
    const submitted = await engine.http.submit(planRequest('r2-settings'))
    assert.equal(submitted.status, 202)

    const tools = ffmpegTools()
    const root = { artifactRoot: dir }
    const base = {
      dbPath: engine.dbPath,
      pollMs: 10,
      model: fakeModel({}, { models: DEFAULT_PLAN_SETTINGS.models }),
      image: fakeImage({}, root),
      sensors: fakeSensors({}),
      video: fakeVideo(tools, {}, root),
      narration: fakeNarration({}, root),
      media: ffmpegMedia(tools, root),
      assembler: ffmpegAssembler(tools, root),
      questionsPath: join(dir, 'QUESTIONS.md'),
    }
    const withTransient = (transient: RenderSettings['transient']): RenderSettings => ({
      ...DEFAULT_RENDER_SETTINGS,
      transient,
    })
    const withPush = (endZoom: number): RenderSettings => ({
      ...DEFAULT_RENDER_SETTINGS,
      stillPush: { endZoom },
    })

    /**
     * Starts a worker that must refuse, naming the setting. One that starts instead is stopped before
     * the test fails, so a worker that wrongly started fails this check at once rather than keeping
     * the process alive.
     */
    const refuses = async (
      options: Parameters<typeof startWorker>[0],
      setting: string,
      what: string,
    ) => {
      let started: Awaited<ReturnType<typeof startWorker>> | undefined
      try {
        started = await startWorker(options)
      } catch (error) {
        assert.match(String(error), /refuses to start/, `${what}: not a refusal to start: ${error}`)
        assert.ok(
          String(error).includes(setting),
          `${what}: the reason does not name ${setting}: ${error}`,
        )
        return
      }
      await started.stop()
      assert.fail(`${what}: the worker started`)
    }

    const sends: ReadonlyArray<readonly [string, number]> = [
      ['no send at all', 0],
      ['a negative number of sends', -1],
      ['a part of a send', 1.5],
      ['a number of sends that is not a number', Number.NaN],
      ['endless sends', Number.POSITIVE_INFINITY],
    ]
    for (const [what, maxAttempts] of sends) {
      await refuses(
        { ...base, renderSettings: withTransient({ maxAttempts, backoffMs: 1000 }) },
        'maxAttempts',
        what,
      )
    }
    const waits: ReadonlyArray<readonly [string, number]> = [
      ['a negative wait', -1],
      ['a wait that is not a number', Number.NaN],
      ['an endless wait', Number.POSITIVE_INFINITY],
    ]
    for (const [what, backoffMs] of waits) {
      await refuses(
        { ...base, renderSettings: withTransient({ maxAttempts: 3, backoffMs }) },
        'backoffMs',
        what,
      )
    }
    const pushes: ReadonlyArray<readonly [string, number]> = [
      ['a push that stays at 1', 1],
      ['a push that pulls out', 0.9],
      ['a push of no zoom at all', 0],
      ['a push that is not a number', Number.NaN],
      ['an endless push', Number.POSITIVE_INFINITY],
    ]
    for (const [what, endZoom] of pushes) {
      await refuses({ ...base, renderSettings: withPush(endZoom) }, 'endZoom', what)
    }

    // Refused BEFORE the database is opened (S-077's order), and before the tools are asked: handed a
    // database file that cannot be opened, each refusal is still the setting's — while the same worker
    // with the default settings fails for the file, which is what shows this probe can tell the
    // orders apart.
    const unopenable = join(dir, 'no-such-folder', 'engine.sqlite')
    await refuses(
      {
        ...base,
        dbPath: unopenable,
        renderSettings: withTransient({ maxAttempts: 0, backoffMs: 1000 }),
      },
      'maxAttempts',
      'no send at all, and a database that cannot be opened',
    )
    await refuses(
      {
        ...base,
        dbPath: unopenable,
        renderSettings: withTransient({ maxAttempts: 3, backoffMs: -1 }),
      },
      'backoffMs',
      'a negative wait, and a database that cannot be opened',
    )
    await refuses(
      { ...base, dbPath: unopenable, renderSettings: withPush(1) },
      'endZoom',
      'a push that stays at 1, and a database that cannot be opened',
    )
    await assert.rejects(
      startWorker({ ...base, dbPath: unopenable, renderSettings: DEFAULT_RENDER_SETTINGS }),
      (error: unknown) => !String(error).includes('refuses to start'),
      'the default settings were refused, so the probe above says nothing about the order',
    )
    // And before ready(): handed tools that cannot be run, each refusal is still the setting's, while
    // the default settings are refused for the tools.
    const noTools = ffmpegMedia(ffmpegTools({ ffmpeg: 'cutroom-no-such-ffmpeg' }), root)
    for (const [renderSettings, setting] of [
      [withTransient({ maxAttempts: 0, backoffMs: 1000 }), 'maxAttempts'],
      [withTransient({ maxAttempts: 3, backoffMs: -1 }), 'backoffMs'],
      [withPush(1), 'endZoom'],
    ] as const) {
      await refuses(
        { ...base, media: noTools, renderSettings },
        setting,
        `${setting} wrong, and tools that cannot be run`,
      )
    }
    await refuses(
      { ...base, media: noTools, renderSettings: DEFAULT_RENDER_SETTINGS },
      'cutroom-no-such-ffmpeg',
      'the default settings, and tools that cannot be run',
    )

    await new Promise((resolve) => setTimeout(resolve, 100))
    assert.deepEqual(
      engine.query<{ state: string }>('SELECT state FROM job').map((j) => j.state),
      ['queued'],
      'a refused worker claimed a job',
    )

    // The edges are settings that work: one send and no wait, and a push just past 1. That worker
    // starts, and claims the run.
    const worker = await startWorker({
      ...base,
      renderSettings: {
        ...DEFAULT_RENDER_SETTINGS,
        transient: { maxAttempts: 1, backoffMs: 0 },
        stillPush: { endZoom: 1.01 },
      },
    })
    try {
      await waitFor('the started worker to claim the run', () =>
        engine.query<{ state: string }>('SELECT state FROM job').some((j) => j.state !== 'queued'),
      )
    } finally {
      await worker.stop()
    }
  } finally {
    await engine.stop()
    rmSync(dir, { recursive: true, force: true })
  }
})

test(`${CHECK_2} — zoompan required`, () => {
  assert.ok(
    REQUIRED_FILTERS.includes('zoompan'),
    `REQUIRED_FILTERS does not hold zoompan: ${REQUIRED_FILTERS.join(', ')}`,
  )
  // Every ready() requires it by default: the tools' own list, as a port is built with it.
  assert.ok(
    ffmpegTools().requiredFilters.includes('zoompan'),
    "ffmpegTools' filters leave zoompan out",
  )
})
