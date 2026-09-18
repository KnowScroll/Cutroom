import assert from 'node:assert/strict'
import { test } from 'node:test'
import { startEngine } from './engine/harness.ts'
import { THREE_RANKS, THREE_RANKS_PICS, type Pic } from './engine/stills.ts'
import {
  described,
  holding,
  readVideo,
  reconcilesTake,
  videoFinished,
  videoRequest,
  videoScript,
  whenHeld,
} from './engine/video.ts'

// reel-render, Slice 3 — check 11 (docs/features/reel-render.md): cancel in the video stage (S-027,
// S-069). The clips job and the assemble job each read the cancel flag with the stage's start, in one
// transaction, before every attempt; set, the run finishes cancelled with what the chain spent, and
// nothing more is made. A cancel during a stage does not stop that stage: here the cancel lands while
// the stage before is held at one of its model calls, so the job it cancels has not started.
//
// The render-row clause was green before any code: nothing wrote a render row until reel-render's
// Slice 4. Its table arrived with Slice 3's migration, which is what let the clause be asked at all.
// Since Slice 4 the assemble job writes one before it calls the assembler, and the clause can fail: a
// render row written before the cancel is read is caught here.

const [, b] = THREE_RANKS_PICS as [Pic, Pic, Pic, Pic]

// ---------------------------------------------------------------- 11

test('11. a cancel that lands before the clips job starts finishes the run cancelled with costCents the spend, no stage.started for video, and no narration or clip call', async () => {
  // Held at the stills stage's first witness call; a picture there costs, so the spend is not 0.
  const hold = holding({ call: 'observe', matches: () => true })
  const engine = await startEngine({
    worker: true,
    images: { [b.key]: { costCents: 6 } },
    script: videoScript(THREE_RANKS, THREE_RANKS_PICS),
    wrapModel: hold.wrap,
  })
  try {
    const submitted = await engine.http.submit(videoRequest('r11-clips'))
    const runId = String(submitted.json.runId)
    await whenHeld(engine, runId, hold.reached)
    const cancelled = await engine.http.cancel(runId)
    assert.equal(cancelled.status, 200, JSON.stringify(cancelled.json))
    hold.release()
    await videoFinished(engine, runId)

    const ran = await readVideo(engine, runId)
    assert.equal(ran.result.status, 'cancelled', JSON.stringify(ran.result))
    assert.equal(ran.result.costCents, 6, 'costCents is not what the chain spent')
    const events = described(ran.events)
    assert.ok(!events.includes('stage.started video'), 'the clips job started its stage')
    assert.deepEqual(events.slice(-2), ['stage.finished stills', 'run.finished cancelled'])
    assert.equal(engine.narration.calls.length, 0, 'a narration was made after the cancel')
    assert.equal(engine.video.calls.length, 0, 'a clip was made after the cancel')
    assert.equal(engine.model.observeClipCalls.length, 0)
    assert.deepEqual(
      ran.jobs.map((j) => [j.kind, j.state]),
      [
        ['reel.plan', 'done'],
        ['reel.keyframes', 'done'],
        ['reel.clips', 'done'],
      ],
    )
  } finally {
    hold.release()
    await engine.stop()
  }
})

test('11. one that lands before the assemble job starts finishes it cancelled with no stage.finished for video and no render row — the render-row clause green before any code, since nothing writes a render row until Slice 4', async () => {
  // Held at the last take's reconcile call; a clip costs, so the spend is not 0.
  const hold = holding({ call: 'structured', matches: reconcilesTake('shot-5-take-1') })
  const engine = await startEngine({
    worker: true,
    video: { 'shot-4-take-1': { costCents: 4 } },
    script: videoScript(THREE_RANKS, THREE_RANKS_PICS),
    wrapModel: hold.wrap,
  })
  try {
    const submitted = await engine.http.submit(videoRequest('r11-assemble'))
    const runId = String(submitted.json.runId)
    await whenHeld(engine, runId, hold.reached)
    const cancelled = await engine.http.cancel(runId)
    assert.equal(cancelled.status, 200, JSON.stringify(cancelled.json))
    hold.release()
    await videoFinished(engine, runId)

    const ran = await readVideo(engine, runId)
    assert.equal(ran.result.status, 'cancelled', JSON.stringify(ran.result))
    assert.equal(ran.result.costCents, 4, 'costCents is not what the chain spent')
    const events = described(ran.events)
    assert.ok(events.includes('stage.started video'))
    assert.ok(!events.includes('stage.finished video'), 'the video stage has stage.finished')
    assert.deepEqual(events.slice(-2), ['verdict 5 shot-5 accept', 'run.finished cancelled'])
    assert.equal(ran.takes.length, 6, 'a cancel during the clips stage stopped it')
    assert.deepEqual(
      ran.jobs.map((j) => [j.kind, j.state]),
      [
        ['reel.plan', 'done'],
        ['reel.keyframes', 'done'],
        ['reel.clips', 'done'],
        ['reel.assemble', 'done'],
      ],
    )
    assert.deepEqual(
      engine.query('SELECT render_id FROM render WHERE run_id = ?', runId),
      [],
      'a render row was written for a cancelled run',
    )
    assert.equal(engine.assembler.renderManifests.length, 0, 'the assembler was handed a manifest')
  } finally {
    hold.release()
    await engine.stop()
  }
})
