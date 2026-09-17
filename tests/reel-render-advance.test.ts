import assert from 'node:assert/strict'
import { test } from 'node:test'
import { startEngine } from './engine/harness.ts'
import {
  THREE_RANKS,
  THREE_RANKS_PICS,
  again,
  clipped,
  stillsScript,
  type Pic,
} from './engine/stills.ts'
import {
  described,
  eventsOf,
  holding,
  jobRows,
  readVideo,
  reconcilesTake,
  video,
  videoRequest,
  videoScript,
  whenHeld,
} from './engine/video.ts'

// reel-render, Slice 3 — checks 27 and 28 (docs/features/reel-render.md): the chain's fourth row, and
// what a video run's calls cost (D-081, S-036, S-069). A completed clips stage does NOT end the run: in
// one transaction it writes its events, marks the clips job done with the cost its narration and clip
// calls added, and creates the reel.assemble row — with the run as correlation_id and itself as
// parent. So check 27 reads the clips job's writes with no assemble job run after them: the worker is
// held at the last take's reconcile call and told to stop, so it finishes the clips job and claims
// nothing more (S-082's form).

const [a, b] = THREE_RANKS_PICS as [Pic, Pic, Pic, Pic]

// ---------------------------------------------------------------- 27

test("27. a completed clips stage leaves the clips job done with its cost kept and one reel.assemble row carrying the run's correlation_id and the clips job as its parent", async () => {
  const hold = holding({ call: 'structured', matches: reconcilesTake('shot-5-take-1') })
  const engine = await startEngine({
    worker: true,
    script: videoScript(THREE_RANKS, THREE_RANKS_PICS),
    // Costs on a narration and on two clips, so a cost reset — to 0 or to anything else — is seen.
    narration: { 'shot-0-narration': { costCents: 2 } },
    video: { 'shot-3-take-1': { costCents: 5 }, 'shot-5-take-1': { costCents: 4 } },
    images: { [b.key]: { costCents: 6 } },
    wrapModel: hold.wrap,
  })
  try {
    const submitted = await engine.http.submit(videoRequest('r27'))
    assert.equal(submitted.status, 202, JSON.stringify(submitted.json))
    const runId = String(submitted.json.runId)
    await whenHeld(engine, runId, hold.reached)
    const stopping = engine.stopWorker()
    hold.release()
    await stopping

    // The clips job has returned and nothing ran after it. The run is not finished.
    assert.equal((await engine.http.status(runId)).json.state, 'running', 'the run was finished')
    assert.equal((await engine.http.result(runId)).status, 409, 'the run has a result')
    const events = described(await eventsOf(engine, runId))
    assert.equal(events.at(-1), 'verdict 5 shot-5 accept', events.join(', '))
    assert.ok(!events.some((e) => e.startsWith('run.finished')), 'the clips job wrote run.finished')
    assert.ok(!events.includes('stage.finished video'), 'the clips job finished the video stage')

    const ran = await readVideo(engine, runId)
    const clipsCost = [...ran.speechReceipts, ...ran.videoReceipts].reduce(
      (sum, r) => sum + r.cost_cents,
      0,
    )
    assert.equal(clipsCost, 2 + 5 + 4, "the receipts do not carry the script's costs")

    const rows = jobRows(engine)
    const [plan, keyframes, clips] = rows as [
      (typeof rows)[number],
      (typeof rows)[number],
      (typeof rows)[number],
    ]
    assert.deepEqual(
      rows.map((row) => ({
        kind: row.kind,
        correlation_id: row.correlation_id,
        parent_id: row.parent_id,
        state: row.state,
        attempts: row.attempts,
        cost_cents: row.cost_cents,
      })),
      [
        {
          kind: 'reel.plan',
          correlation_id: runId,
          parent_id: null,
          state: 'done',
          attempts: 1,
          cost_cents: 0,
        },
        {
          kind: 'reel.keyframes',
          correlation_id: runId,
          parent_id: plan.id,
          state: 'done',
          attempts: 1,
          cost_cents: 6,
        },
        {
          kind: 'reel.clips',
          correlation_id: runId,
          parent_id: keyframes.id,
          state: 'done',
          attempts: 1,
          cost_cents: 11,
        },
        {
          kind: 'reel.assemble',
          correlation_id: runId,
          parent_id: clips.id,
          state: 'queued',
          attempts: 0,
          cost_cents: 0,
        },
      ],
    )
  } finally {
    hold.release()
    await engine.stop()
  }
})

// ---------------------------------------------------------------- 28

test("28. with the stand-ins' default scripts, every speech receipt, video receipt and job row of a video run costs 0", async () => {
  const engine = await startEngine({
    worker: true,
    script: videoScript(THREE_RANKS, THREE_RANKS_PICS),
  })
  try {
    const ran = await video(engine, videoRequest('r28'))
    assert.equal(ran.speechReceipts.length, 6, 'the run made no narration to cost')
    assert.equal(ran.videoReceipts.length, 6, 'the run made no clip to cost')
    assert.deepEqual(
      ran.jobs.map((j) => j.kind),
      ['reel.plan', 'reel.keyframes', 'reel.clips', 'reel.assemble'],
    )
    for (const receipt of ran.speechReceipts) {
      assert.equal(receipt.cost_cents, 0, `${receipt.narration_id}'s speech receipt costs`)
      assert.equal(receipt.rate_cents, 0, `${receipt.narration_id}'s narration rate is not 0`)
      assert.equal(receipt.fake, true)
    }
    for (const receipt of ran.videoReceipts) {
      assert.equal(receipt.cost_cents, 0, `${receipt.take_id}'s video receipt costs`)
      assert.equal(receipt.fake, true)
    }
    for (const job of ran.jobs) assert.equal(job.cost_cents, 0, `${job.kind} costs`)
    assert.equal(ran.result.costCents, 0)
  } finally {
    await engine.stop()
  }
})

test("28. a video run whose stills stage stops has no speech or video receipt — green before this slice's code, since only a reel.clips job makes either and Slice 2 creates none for such a run", async () => {
  // The canonical's two candidates and its repair are all clipped: rule gate-1 at the stills stage.
  const repair = again(a, 'repair')
  const engine = await startEngine({
    worker: true,
    script: stillsScript(THREE_RANKS, [a, b, repair], {
      witness: { [a.key]: clipped(a), [b.key]: clipped(b), [repair.key]: clipped(repair) },
    }),
  })
  try {
    const ran = await video(engine, videoRequest('r28-stopped'))
    assert.equal(ran.result.status, 'stopped', JSON.stringify(ran.result))
    assert.equal(ran.result.rule, 'gate-1')
    assert.deepEqual(ran.speechReceipts, [])
    assert.deepEqual(ran.videoReceipts, [])
    assert.equal(engine.narration.calls.length, 0)
    assert.equal(engine.video.calls.length, 0)
    assert.ok(!ran.jobs.some((j) => j.kind === 'reel.clips'))
  } finally {
    await engine.stop()
  }
})
