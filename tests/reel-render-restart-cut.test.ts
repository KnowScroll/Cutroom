import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { startEngine, type Engine } from './engine/harness.ts'
import { measured, renderRows, shotStarts } from './engine/render.ts'
import { PLANNED, killedMidVideo, takenUpVideo } from './engine/restart.ts'
import { THREE_RANKS, THREE_RANKS_PICS } from './engine/stills.ts'
import { cutAnswer, described, videoRequest, videoScript } from './engine/video.ts'

// reel-render, Slice 6 — check 49 (docs/features/reel-render.md): a restart at Gate 7 (S-076, I-18). An
// assemble job whose worker was killed is claimed again when its lease runs out, builds its manifest
// again from the same rows under the next attempt's render id, and writes a new render row and file.
// The earlier row and file stay, and nothing is bought: the job that assembles holds no port that buys.
//
// THE FIRST WORKER IS HELD AT GATE 7's judgeCut: the planner's two calls, the stills stage's eight, two
// a take for six takes, then the cut's — call 23. By then its file is assembled, measured and cut into
// its frame strip, and its render row holds the manifest and its start, and no output: only the job's
// ending writes the row's path, measure, verdict and finish (Gate 2, "The chain"; S-073), and a killed
// job reaches no ending. So "the first kept" is read as the row exactly as it was when the worker died,
// and the file where the assembler wrote it, `<root>/<runId>/<renderId>.mp4`, byte for byte (S-089).

const UNITS = [0, 1, 2, 3, 4, 5]
const N = (unit: number) => `a1-shot-${unit}-narration`
const T = (unit: number) => `a1-shot-${unit}-take-1`

/** THREE_RANKS' stills stage, completed: Gate 1 on each picture as made, then Gate 1S rank by rank. */
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

/** Each shot's four gates, in plan order, all accepted. */
const TAKES = UNITS.flatMap((unit) =>
  ['2', '3', '4', '5'].map((gate) => `verdict ${gate} shot-${unit} accept`),
)

/** Where each shot begins, by hand: narrations of 9, 7, 3, 3, 2 and 5 seconds at 24 fps. */
const STARTS = [0, 216, 384, 456, 528, 576]

/** The paid receipts of a run, every table's, as plain rows in the order written. */
function paid(engine: Engine, runId: string) {
  const rows = (sql: string) =>
    engine.query<Record<string, unknown>>(sql, runId).map((r) => ({ ...r }))
  return {
    images: rows(
      'SELECT id, picture_id, cost_cents, at FROM generation_receipt WHERE run_id = ? ORDER BY id',
    ),
    narrations: rows(
      'SELECT id, narration_id, cost_cents, at FROM speech_receipt WHERE run_id = ? ORDER BY id',
    ),
    clips: rows(
      'SELECT id, take_id, cost_cents, at FROM video_receipt WHERE run_id = ? ORDER BY id',
    ),
  }
}

const sha256 = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex')

// ---------------------------------------------------------------- 49

test("49. after a worker is killed at Gate 7 and a new one started, the run completes with a second render row and file, the first kept, no narration, video or image receipt added, and the result's video at the second render's path", async () => {
  const engine = await startEngine({ worker: false })
  try {
    const killed = await killedMidVideo(engine, videoRequest('r49'), {
      script: videoScript(THREE_RANKS, THREE_RANKS_PICS),
      holdAtCall: 23,
      running: 'reel.assemble',
      made: { narrations: UNITS.map(N), takes: UNITS.map(T) },
    })
    const { runId } = killed

    // Held at Gate 7: the clips stage completed, every take's receipts written, and no judgeCut
    // answered. The render row was written before the assembler was called, and holds no output.
    assert.deepEqual(killed.before.events, [...PLANNED, ...STILLS, 'stage.started video', ...TAKES])
    assert.deepEqual(
      killed.before.receipts.slice(-1).map((r) => `${r.call} ${r.role} ${r.take_ids}`),
      [`structured reconciler ["${T(5)}"]`],
    )
    assert.ok(!killed.before.receipts.some((r) => r.call === 'judgeCut'), 'Gate 7 was answered')
    const [first, ...others] = renderRows(engine, runId)
    assert.ok(first !== undefined)
    assert.deepEqual(others, [], 'the first attempt wrote more than one render row')
    assert.deepEqual(
      [first.render_id, first.attempt, first.path, first.finished_at, first.gate7],
      ['a1-render', 1, null, null, null],
    )
    const firstFile = join(engine.artifactRoot, runId, 'a1-render.mp4')
    assert.ok(existsSync(firstFile), `the first render's file is not at ${firstFile}`)
    const firstBytes = sha256(firstFile)
    const before = paid(engine, runId)
    assert.deepEqual(
      [before.images.length, before.narrations.length, before.clips.length],
      [4, 6, 6],
    )

    // The new worker is asked Gate 7 alone: a clips stage run again would find no witness answer.
    const ran = await takenUpVideo(engine, killed, { judge: [{ value: cutAnswer() }] })
    const rows = renderRows(engine, runId)
    const [kept, second] = rows
    assert.equal(rows.length, 2, `the run has ${rows.length} render rows, not two`)
    assert.ok(kept !== undefined && second !== undefined)

    // The run completes, its video at the second render's path.
    const secondFile = join(engine.artifactRoot, runId, 'a2-render.mp4')
    assert.equal(second.path, secondFile)
    const chosen = engine.query<{ picture_id: string; shot_unit: number; path: string }>(
      'SELECT picture_id, shot_unit, path FROM picture WHERE run_id = ? AND chosen = 1 ORDER BY shot_unit',
      runId,
    )
    assert.deepEqual(ran.result, {
      contractVersion: 1,
      runId,
      requestId: 'r49',
      costCents: 0,
      status: 'completed',
      until: 'video',
      estimateCents: 220,
      stills: chosen.map((p) => ({
        pictureId: p.picture_id,
        shotId: `shot-${p.shot_unit}`,
        path: p.path,
      })),
      video: { path: secondFile },
      degradations: [],
    })
    assert.notEqual(secondFile, firstFile)

    // A second render row: the next attempt's, finished, judged, naming its file — its manifest made
    // again from the same rows, so the same but for its render id (S-076).
    assert.deepEqual(
      [second.render_id, second.attempt, second.gate7?.outcome],
      ['a2-render', 2, 'accept'],
    )
    assert.ok(second.finished_at !== null && second.started_at <= second.finished_at)
    assert.deepEqual(
      { ...second.renderManifest, renderId: kept.renderManifest.renderId },
      kept.renderManifest,
    )

    // The first kept: its row exactly as it was when its worker died, and its file byte for byte.
    assert.deepEqual(kept, first, 'the first render row was changed')
    assert.ok(existsSync(firstFile), 'the first render file is gone')
    assert.equal(sha256(firstFile), firstBytes, 'the first render file was written over')

    // Both files, measured: every frame, and every shot where its narration puts it.
    for (const path of [firstFile, secondFile]) {
      assert.equal(measured(path).frames, 696, path)
      assert.deepEqual(shotStarts(path, UNITS.map(T)), STARTS, path)
    }

    // No narration, video or image receipt added, and none of those ports asked for anything; the one
    // model call made is Gate 7's, a judge's, which buys nothing (D-052).
    assert.deepEqual(paid(engine, runId), before)
    assert.deepEqual(
      { images: engine.image.calls, narrations: engine.narration.calls, clips: engine.video.calls },
      { images: [], narrations: [], clips: [] },
    )
    assert.deepEqual(
      ran.receipts.slice(0, killed.before.receipts.length).map((r) => r.id),
      killed.before.receipts.map((r) => r.id),
    )
    assert.deepEqual(
      ran.receipts.slice(killed.before.receipts.length).map((r) => `${r.call} ${r.role}`),
      ['judgeCut judge'],
    )
    // So every paid receipt is still at or before the first render row's start (I-18, check 40).
    for (const receipt of [...before.images, ...before.narrations, ...before.clips]) {
      assert.ok(String(receipt.at) <= kept.started_at, `a receipt at ${String(receipt.at)}`)
    }

    // stage.started for video once; one Gate 7 verdict, the finishing attempt's (S-069).
    assert.deepEqual(described(ran.events), [
      ...PLANNED,
      ...STILLS,
      'stage.started video',
      ...TAKES,
      'verdict 7 accept',
      'stage.finished video',
      'run.finished completed',
    ])
    assert.deepEqual(
      ran.jobs.map((j) => [j.kind, j.state, j.attempts, j.cost_cents]),
      [
        ['reel.plan', 'done', 1, 0],
        ['reel.keyframes', 'done', 1, 0],
        ['reel.clips', 'done', 1, 0],
        ['reel.assemble', 'done', 2, 0],
      ],
    )
  } finally {
    await engine.stop()
  }
})
