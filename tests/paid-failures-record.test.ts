import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { test } from 'node:test'
import { Spent, type ImagePort, type LostCall } from '@cutroom/contracts'
import {
  claimJob,
  closeDatabase,
  imageCallCount,
  openDatabase,
  recordLostCall,
  spentCents,
  submitRun,
  type Db,
} from '../packages/domain/src/index.ts'
import { stillsRequest } from './engine/stills.ts'

// paid-failures, Slice 3 — checks 4, 5, 6 and 7 (docs/features/paid-failures.md): what the worker
// writes when a call has spent and could not be used, and what the writing changes for the two
// bounds a run is held to.
//
// NOTHING HERE CALLS A PROVIDER (S-111). The port every test hands the guard is a function that
// throws the `Spent` a real adapter would throw, which is the whole of what the worker sees.

/** A database of this test's own, with one run submitted and its first job claimed. */
function engine(): { db: Db; dir: string; runId: string; jobId: number; clean(): void } {
  const dir = mkdtempSync(join(tmpdir(), 'cutroom-lost-db-'))
  const db = openDatabase(join(dir, 'cutroom.sqlite'))
  const request = stillsRequest('req-lost-1')
  const { runId } = submitRun(db, request, JSON.stringify(request))
  const job = claimJob(db, ['reel.plan'])
  assert.ok(job !== undefined, 'no job to claim')
  return {
    db,
    dir,
    runId,
    jobId: job.id,
    clean: () => {
      closeDatabase(db)
      rmSync(dir, { recursive: true, force: true })
    },
  }
}

const lost = (over: Partial<LostCall> = {}): LostCall => ({
  port: 'image',
  model: 'fal-ai/flux-2-pro',
  costCents: 8,
  detail: "'fal-ai/flux-2-pro' produced a 1536x864 picture, which is not 9:16",
  ...over,
})

/** Every `lost_call` row, read with SQL rather than through the code that wrote it. */
function rows(dbPath: string): Array<Record<string, unknown>> {
  const sqlite = new DatabaseSync(dbPath, { readOnly: true })
  try {
    return sqlite.prepare('SELECT * FROM lost_call ORDER BY id').all() as Array<
      Record<string, unknown>
    >
  } finally {
    sqlite.close()
  }
}

// ---------------------------------------------------------------- 4

const CHECK_4 =
  '4. a Spent thrown by any of the four paying ports writes exactly one lost_call row and adds its costCents to the job row, in one transaction, and the same error is rethrown unchanged'

test(`${CHECK_4} — one row, the cost on the job, and the run still fails`, async () => {
  const e = engine()
  try {
    const { recordingSpend } = await import('../apps/worker/src/spend.ts')
    const thrown = new Spent(lost())

    await assert.rejects(
      recordingSpend(e.db, { jobId: e.jobId, runId: e.runId }, async () => {
        throw thrown
      }),
      (error: unknown) => {
        // RETHROWN UNCHANGED. Recording is not repairing: a caller that swallowed this would let a
        // run carry on without the thing it paid for (S-046, S-142).
        assert.equal(error, thrown, 'the error the stage sees is not the one the adapter threw')
        return true
      },
    )

    const written = rows(join(e.dir, 'cutroom.sqlite'))
    assert.equal(written.length, 1, 'a paid call wrote something other than one row')
    assert.equal(written[0]?.port, 'image')
    assert.equal(written[0]?.model, 'fal-ai/flux-2-pro')
    assert.equal(written[0]?.cost_cents, 8)
    assert.match(String(written[0]?.detail), /not 9:16/)
    assert.equal(written[0]?.run_id, e.runId)

    // AND THE FIGURE REACHED THE JOB ROW, which is where the budget guard reads it from (D-081).
    assert.equal(spentCents(e.db, e.runId), 8)

    // A call that fails WITHOUT having spent writes nothing at all.
    await assert.rejects(
      recordingSpend(e.db, { jobId: e.jobId, runId: e.runId }, async () => {
        throw new Error('the request was refused before anything was made')
      }),
    )
    assert.equal(rows(join(e.dir, 'cutroom.sqlite')).length, 1, 'a fault wrote a lost call')
    assert.equal(spentCents(e.db, e.runId), 8, 'a fault moved the job row')
  } finally {
    e.clean()
  }
})

test(`${CHECK_4} — each of the four ports' rows is its own port`, async () => {
  const e = engine()
  try {
    const { recordingSpend } = await import('../apps/worker/src/spend.ts')
    for (const port of ['image', 'video', 'speech', 'model'] as const) {
      await assert.rejects(
        recordingSpend(e.db, { jobId: e.jobId, runId: e.runId }, async () => {
          throw new Spent(lost({ port, costCents: port === 'video' ? 40 : 0 }))
        }),
      )
    }
    const written = rows(join(e.dir, 'cutroom.sqlite'))
    assert.deepEqual(
      written.map((row) => row.port),
      ['image', 'video', 'speech', 'model'],
    )
    // Only the clip had a figure: the model and the voice are plan-covered today (S-129), and the
    // row is what matters there.
    assert.equal(spentCents(e.db, e.runId), 40)
  } finally {
    e.clean()
  }
})

// ---------------------------------------------------------------- 5

const CHECK_5 =
  '5. spentCents over the chain includes a lost call, and the guarded image port’s next comparison refuses the call that the lost call pushes past the cap'

test(`${CHECK_5} — the guard stops the run the lost call put over the cap`, async () => {
  const e = engine()
  try {
    const { guardedImagePort } = await import('../apps/worker/src/guarded-image-port.ts')
    const RATE = 8
    const CAP = 20

    // A port that spends and cannot be used, then one that would be made. The guard is the same
    // object in both: what changes between the two calls is only what the record says was spent.
    const port = (behaviour: 'spent' | 'made'): ImagePort => ({
      acceptsReferences: true,
      generate: async () => {
        if (behaviour === 'spent') throw new Spent(lost({ costCents: RATE }))
        throw new Error('the second call was MADE, and it should have been refused')
      },
    })

    const guard = (image: ImagePort) =>
      guardedImagePort(image, e.db, {
        jobId: e.jobId,
        runId: e.runId,
        attempt: 1,
        placements: [{ shotUnit: 0, subjectId: 's1', role: 'canonical' } as never],
        rateCents: RATE,
        style: { id: 'style', version: 1 },
        stills: { canonicalFraming: 'full' as never },
        capCents: CAP,
        ceilingCents: 300,
      })

    const request = {
      runId: e.runId,
      pictureId: 'a1-shot-0-canonical',
      prompt: 'a keyframe',
      references: [],
      aspectRatio: '9:16' as const,
    }

    // Two calls that spend and leave no picture: 16¢ of a 20¢ cap, all of it invisible before this
    // feature, because neither wrote a generation_receipt.
    for (const call of [1, 2]) {
      await assert.rejects(
        guard(port('spent')).generate(request),
        `call ${call} did not fail, so nothing was lost to record`,
      )
    }
    assert.equal(spentCents(e.db, e.runId), 2 * RATE, 'the lost calls are not in the chain’s spend')

    // The third call would be 24¢ against a 20¢ cap, so the guard refuses it BEFORE the port is
    // reached — which is the whole of why the row has to exist (S-035, S-095, D-100).
    const answer = await guard(port('made')).generate(request)
    assert.equal(answer.kind, 'refused')
    assert.equal(answer.kind === 'refused' && answer.limit, 'reel')
    assert.equal(answer.kind === 'refused' && answer.estimateCents, 3 * RATE)
  } finally {
    e.clean()
  }
})

// ---------------------------------------------------------------- 6

const CHECK_6 =
  '6. imageCallCount counts a lost image call: a run whose calls include one that made no picture has that call against D-027’s six'

test(`${CHECK_6} — the six-call bound counts what was paid for, not what came out well`, () => {
  const e = engine()
  try {
    assert.equal(imageCallCount(e.db, e.runId), 0)

    recordLostCall(e.db, { jobId: e.jobId, runId: e.runId, lost: lost() })
    assert.equal(
      imageCallCount(e.db, e.runId),
      1,
      'a paid image call does not count against the six',
    )

    // A call on another port is not an image call, whatever it cost.
    recordLostCall(e.db, { jobId: e.jobId, runId: e.runId, lost: lost({ port: 'video' }) })
    assert.equal(imageCallCount(e.db, e.runId), 1, 'a clip counted against the image bound')

    // And another run's calls are not this run's (D-081).
    const other = stillsRequest('req-lost-2')
    const { runId } = submitRun(e.db, other, JSON.stringify(other))
    recordLostCall(e.db, { jobId: e.jobId, runId, lost: lost() })
    assert.equal(imageCallCount(e.db, e.runId), 1, 'another run’s call counted against this one')
    assert.equal(imageCallCount(e.db, runId), 1)
  } finally {
    e.clean()
  }
})

// ---------------------------------------------------------------- 7

const CHECK_7 =
  '7. the migration applies to a database already holding a run’s rows, changes none of them, and a run recorded before it reads back exactly as it did'

test(`${CHECK_7} — the table arrives beside the rows that were already there`, () => {
  const e = engine()
  try {
    const path = join(e.dir, 'cutroom.sqlite')
    // The migrations ran when this database was opened, so the table is here and empty — a
    // migration that dropped or rewrote anything would have taken the run with it.
    assert.deepEqual(rows(path), [])
    const sqlite = new DatabaseSync(path, { readOnly: true })
    try {
      const runs = sqlite.prepare('SELECT run_id FROM run').all() as Array<{ run_id: string }>
      assert.deepEqual(
        runs.map((row) => row.run_id),
        [e.runId],
        'the run that was submitted before the table existed is not intact',
      )
      const columns = (
        sqlite.prepare('PRAGMA table_info(lost_call)').all() as Array<{ name: string }>
      ).map((row) => row.name)
      assert.deepEqual(columns, ['id', 'run_id', 'port', 'model', 'cost_cents', 'detail', 'at'])
    } finally {
      sqlite.close()
    }

    // Opening the same database again applies nothing and loses nothing: a migration that ran
    // twice would fail here rather than in a run that had already spent.
    const again = openDatabase(path)
    try {
      assert.equal(imageCallCount(again, e.runId), 0)
    } finally {
      closeDatabase(again)
    }
  } finally {
    e.clean()
  }
})
