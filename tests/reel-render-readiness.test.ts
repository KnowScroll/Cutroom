import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { DEFAULT_PLAN_SETTINGS } from '@cutroom/pipeline'
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
import { startWorker } from '@cutroom/worker'
import { startEngine, waitFor } from './engine/harness.ts'
import { planRequest } from './engine/plans.ts'

// reel-render, Slice 3 — check 12 (docs/features/reel-render.md): ffmpeg and ffprobe are checked when
// a worker starts, before anything is bought (S-075). A worker handed a media port or an assembler
// whose tools cannot be run, or that needs a filter the tools lack, refuses to start with a reason
// naming what is missing, and claims no job.
//
// What is remembered once per process is what the tools SAID, never whether a port was ready: so the
// filter case is built after a worker with the same tool names has started in this process, and a
// readiness remembered as a pass would let it through.

const MISSING_FFMPEG = 'cutroom-no-such-ffmpeg'
const MISSING_FFPROBE = 'cutroom-no-such-ffprobe'
const MISSING_FILTER = 'cutroom_no_such_filter'

// ---------------------------------------------------------------- 12

test('12. a worker handed a media port or an assembler whose ffmpeg or ffprobe cannot be run, or that needs a filter the tools lack, refuses to start with a reason naming it, and claims no job — the filter case built after a worker with the same tool names has started in the same process', async () => {
  const engine = await startEngine({ worker: false })
  const other = await startEngine({ worker: false })
  const dir = mkdtempSync(join(tmpdir(), 'reel-render-ready-'))
  try {
    // A run is waiting, so a worker that started its loop before refusing would claim it.
    const submitted = await engine.http.submit(planRequest('r12'))
    assert.equal(submitted.status, 202)

    const good = ffmpegTools()
    const root = { artifactRoot: dir }
    const base = {
      dbPath: engine.dbPath,
      pollMs: 10,
      model: fakeModel({}, { models: DEFAULT_PLAN_SETTINGS.models }),
      image: fakeImage({}, root),
      sensors: fakeSensors({}),
      video: fakeVideo(good, {}, root),
      narration: fakeNarration({}, root),
      media: ffmpegMedia(good, root),
      assembler: ffmpegAssembler(good, root),
      questionsPath: join(dir, 'QUESTIONS.md'),
    }

    /**
     * Starts a worker that must refuse, naming `name`. One that starts instead is stopped before the
     * test fails, so a worker that wrongly started fails this check at once rather than keeping the
     * process alive.
     */
    const refuses = async (
      options: Parameters<typeof startWorker>[0],
      name: string,
      what: string,
    ) => {
      let started: Awaited<ReturnType<typeof startWorker>> | undefined
      try {
        started = await startWorker(options)
      } catch (error) {
        assert.match(String(error), /refuses to start/, `${what}: not a refusal to start: ${error}`)
        assert.ok(
          String(error).includes(name),
          `${what}: the reason does not name ${name}: ${error}`,
        )
        return
      }
      await started.stop()
      assert.fail(`${what}: the worker started`)
    }
    const stillQueued = async (what: string) => {
      await new Promise((resolve) => setTimeout(resolve, 100))
      assert.deepEqual(
        engine.query<{ state: string }>('SELECT state FROM job').map((j) => j.state),
        ['queued'],
        `${what}: a refused worker claimed a job`,
      )
    }

    // A tool that cannot be run, on either port, under either name.
    const noFfmpeg = ffmpegTools({ ffmpeg: MISSING_FFMPEG })
    const noFfprobe = ffmpegTools({ ffprobe: MISSING_FFPROBE })
    await refuses(
      { ...base, media: ffmpegMedia(noFfmpeg, root) },
      MISSING_FFMPEG,
      'media, no ffmpeg',
    )
    await refuses(
      { ...base, media: ffmpegMedia(noFfprobe, root) },
      MISSING_FFPROBE,
      'media, no ffprobe',
    )
    await refuses(
      { ...base, assembler: ffmpegAssembler(noFfmpeg, root) },
      MISSING_FFMPEG,
      'assembler, no ffmpeg',
    )
    await refuses(
      { ...base, assembler: ffmpegAssembler(noFfprobe, root) },
      MISSING_FFPROBE,
      'assembler, no ffprobe',
    )
    await stillQueued('a tool that cannot be run')

    // Refused BEFORE the database is opened (S-075): handed a database file that cannot be opened,
    // the refusal is still the tool's — while the same worker with tools that run fails for the file,
    // which is what shows this probe can tell the two orders apart.
    const unopenable = join(dir, 'no-such-folder', 'engine.sqlite')
    await refuses(
      { ...base, dbPath: unopenable, media: ffmpegMedia(noFfmpeg, root) },
      MISSING_FFMPEG,
      'no ffmpeg, and a database that cannot be opened',
    )
    await assert.rejects(
      startWorker({ ...base, dbPath: unopenable }),
      (error: unknown) => !String(error).includes('refuses to start'),
      'a worker with tools that run was refused, so the probe above says nothing about the order',
    )

    // A worker with the same tool names — the defaults — starts in this process, on a database of its
    // own, so the tools have been run and what they said is remembered.
    const first = await startWorker({ ...base, dbPath: other.dbPath })
    await first.stop()

    // Then a port asking for a filter the tools lack is refused whatever passed before it.
    const lacking = ffmpegTools({ requiredFilters: ['blackdetect', MISSING_FILTER] })
    await refuses(
      { ...base, media: ffmpegMedia(lacking, root) },
      MISSING_FILTER,
      'media needing a filter the tools lack',
    )
    await refuses(
      { ...base, assembler: ffmpegAssembler(lacking, root) },
      MISSING_FILTER,
      'an assembler needing a filter the tools lack',
    )
    await stillQueued('a filter the tools lack')

    // The same options with tools that have what they need do start, and claim the run.
    const worker = await startWorker(base)
    try {
      await waitFor('the started worker to claim the run', () =>
        engine.query<{ state: string }>('SELECT state FROM job').some((j) => j.state !== 'queued'),
      )
    } finally {
      await worker.stop()
    }
  } finally {
    await engine.stop()
    await other.stop()
    rmSync(dir, { recursive: true, force: true })
  }
})
