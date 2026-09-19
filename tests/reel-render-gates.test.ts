import assert from 'node:assert/strict'
import { join, relative } from 'node:path'
import { test } from 'node:test'
import { startEngine, type Engine } from './engine/harness.ts'
import { THREE_RANKS, THREE_RANKS_PICS, observation } from './engine/stills.ts'
import {
  CRITERION_TEXT,
  described,
  firstTake,
  holding,
  passesTake,
  readVideo,
  reconcilesTake,
  retake,
  seenClip,
  takeOf,
  takesOf,
  turned,
  video,
  videoFinished,
  videoRequest,
  videoScript,
  whenHeld,
  type Take,
  type TakeRow,
  type Videoed,
} from './engine/video.ts'

// reel-render, Slice 3 — checks 20, 22, 23 and 24 (docs/features/reel-render.md): Gates 3, 4 and 5
// on each take, and the verdicts every take keeps (S-072). Gate 3 reads the clip's words and hears its
// sound, from a script here: words never fail, speech or music does, and Gates 4 and 5 still run so
// the record holds every reason. Gate 4 is the witness — the clip and a temperature, nothing else
// (I-8) — whose answer is parsed as a clip observation. Gate 5 holds that observation against the
// shot's subjects and the take's criteria, and code decides; a clipped entity is motion, not a fault.
//
// Since reel-takes (S-099), a take that fails is followed by its shot's next, up to three: each stop
// below is built on each of a shot's three takes, on a shot a hold cannot cure — shot 3, made from
// words, or shot 0, which claims an event — and what was asserted of the one take is asserted of the
// three. Check 20's held case is on shot 1, which a retry now follows: its script answers the retake.

const takes = takesOf(THREE_RANKS)
const [t0, t1, t2, t3, t4, t5] = takes as [Take, Take, Take, Take, Take, Take]
/** Shot 3's three takes, and shot 0's: each shot a hold cannot cure (S-090, S-099). */
const shot3 = [t3, retake(t3, 2), retake(t3, 3)]
const shot0 = [t0, retake(t0, 2), retake(t0, 3)]

const clipsCompleted = (ran: Videoed) =>
  assert.ok(
    ran.jobs.some((j) => j.kind === 'reel.assemble'),
    `the clips stage did not complete: ${JSON.stringify(ran.result)}`,
  )

/** THREE_RANKS asked for a video, with its stills stage's own answers and each take's as given. */
async function threeRanks(
  requestId: string,
  over: NonNullable<Parameters<typeof videoScript>[2]> &
    Omit<Parameters<typeof startEngine>[0], 'worker' | 'script'> = {},
) {
  const { witness, reconciler, takes: only, stills, ...options } = over
  const engine = await startEngine({
    ...options,
    worker: true,
    script: videoScript(THREE_RANKS, THREE_RANKS_PICS, {
      ...(witness === undefined ? {} : { witness }),
      ...(reconciler === undefined ? {} : { reconciler }),
      ...(only === undefined ? {} : { takes: only }),
      ...(stills === undefined ? {} : { stills }),
    }),
  })
  try {
    return { engine, ran: await video(engine, videoRequest(requestId)) }
  } catch (error) {
    await engine.stop()
    throw error
  }
}

// ---------------------------------------------------------------- 20

test("20. every take's verdicts are gates 2, 3, 4 and 5 in order, each with an outcome and its coverage — Gate 4's strategy full with its limitation — and its outcome is set only once decided", async () => {
  const { engine, ran } = await threeRanks('r20')
  try {
    clipsCompleted(ran)
    assert.equal(ran.takes.length, 6)
    for (const take of ran.takes) {
      assert.deepEqual(
        take.verdicts.map((v) => v.gate),
        ['2', '3', '4', '5'],
        `${take.take_id}'s verdicts are not gates 2 to 5 in order`,
      )
      for (const verdict of take.verdicts) {
        assert.ok(
          ['accept', 'fail'].includes(verdict.outcome),
          `${take.take_id} gate ${verdict.gate}`,
        )
        assert.ok(Array.isArray(verdict.reasons))
      }
      const [g2, g3, g4, g5] = take.verdicts
      assert.deepEqual(
        g2?.coverage,
        { strategy: 'whole file' },
        `${take.take_id}: Gate 2's coverage`,
      )
      assert.deepEqual(
        g3?.coverage,
        { strategy: 'whole file' },
        `${take.take_id}: Gate 3's coverage`,
      )
      assert.equal(g4?.coverage.strategy, 'full', `${take.take_id}: Gate 4's coverage`)
      assert.ok(
        (g4?.coverage.limitations ?? []).some((l) => /sampl/i.test(l)),
        `${take.take_id}: Gate 4 records no limitation about how a clip is sampled (D-051)`,
      )
      assert.deepEqual(
        g5?.coverage,
        { strategy: 'observation' },
        `${take.take_id}: Gate 5's coverage`,
      )
      assert.equal(take.outcome, 'accept')
    }

    // Each verdict is an event once its gate completes, shot by shot, in plan order (S-069). What the
    // assemble job writes after them — Gate 7's verdict, since reel-render's Slice 4 — is its own
    // checks', and not read here: the clips job's events are the twenty-four after the stage's start.
    const events = described(ran.events)
    const stage = events.slice(events.indexOf('stage.started video') + 1)
    assert.deepEqual(
      stage.slice(0, 24),
      [0, 1, 2, 3, 4, 5].flatMap((u) =>
        ['2', '3', '4', '5'].map((g) => `verdict ${g} shot-${u} accept`),
      ),
    )
    assert.ok(!stage.slice(0, 24).some((e) => !e.startsWith('verdict')), stage.join(', '))
  } finally {
    await engine.stop()
  }

  // A take whose Gate 3 fails has NO outcome until Gate 5 completes: held at its reconciler's call,
  // its row holds three verdicts and none; the take before it, decided, holds its outcome. Once let
  // go, shot 1's second take follows it, and the run goes on to shots 2 to 5 (S-099).
  const hold = holding({ call: 'structured', matches: reconcilesTake(t1.key) })
  const held = await startEngine({
    worker: true,
    media: { [t1.key]: { speech: true } },
    script: videoScript(THREE_RANKS, THREE_RANKS_PICS, {
      takes: [t0, t1, retake(t1, 2), t2, t3, t4, t5],
    }),
    wrapModel: hold.wrap,
  })
  try {
    const submitted = await held.http.submit(videoRequest('r20-held'))
    const runId = String(submitted.json.runId)
    await whenHeld(held, runId, hold.reached)
    const mid = await readVideo(held, runId)
    const second = takeOf(mid, t1.key)
    assert.deepEqual(
      second.verdicts.map((v) => [v.gate, v.outcome]),
      [
        ['2', 'accept'],
        ['3', 'fail'],
        ['4', 'accept'],
      ],
    )
    assert.equal(second.outcome, null, 'the take had an outcome before Gate 5 completed')
    assert.equal(takeOf(mid, t0.key).outcome, 'accept')
    hold.release()
    await videoFinished(held, runId)
    const after = await readVideo(held, runId)
    assert.equal(takeOf(after, t1.key).outcome, 'fail')
    assert.deepEqual(
      takeOf(after, t1.key).verdicts.map((v) => v.gate),
      ['2', '3', '4', '5'],
    )
  } finally {
    hold.release()
    await held.stop()
  }
})

// ---------------------------------------------------------------- 22

test('22. Gate 3 records every word read and never fails on words, and fails a take whose sound is classified as speech, and one classified as music, with Gates 4 and 5 still run', async () => {
  const words = ['MAGNA', 'CARTA', 'MCCXV']
  const { engine, ran } = await threeRanks('r22-words', { media: { [t0.key]: { words } } })
  try {
    clipsCompleted(ran)
    const take = takeOf(ran, t0.key)
    assert.deepEqual(take.words, words, 'the words read are not recorded')
    assert.deepEqual(take.verdicts[1] && [take.verdicts[1].gate, take.verdicts[1].outcome], [
      '3',
      'accept',
    ])
    for (const other of ran.takes.filter((t) => t !== take)) assert.deepEqual(other.words, [])
    assert.deepEqual(take.sound, { speech: false, music: false })
  } finally {
    await engine.stop()
  }

  for (const heard of ['speech', 'music'] as const) {
    // The sound on each of shot 3's three takes, where it was on shot 2's one (S-099).
    const run = await threeRanks(`r22-${heard}`, {
      media: Object.fromEntries(shot3.map((t) => [t.key, { [heard]: true }])),
      takes: [t0, t1, t2, ...shot3],
    })
    try {
      const { ran: stopped, engine: e } = run
      assert.equal(stopped.result.status, 'stopped', `${heard}: ${JSON.stringify(stopped.result)}`)
      assert.equal(stopped.result.rule, 'gate-3', heard)
      for (const failing of shot3) {
        const take = takeOf(stopped, failing.key)
        assert.deepEqual(
          take.verdicts.map((v) => [v.gate, v.outcome]),
          [
            ['2', 'accept'],
            ['3', 'fail'],
            ['4', 'accept'],
            ['5', 'accept'],
          ],
          `${heard}: ${failing.key}'s verdicts`,
        )
        assert.ok(
          take.verdicts[1]?.reasons.some((r) => r.includes(heard)),
          `${heard}: ${failing.key}'s Gate 3 reasons`,
        )
        assert.equal(take.outcome, 'fail')
        assert.deepEqual(take.sound, { speech: heard === 'speech', music: heard === 'music' })
        // Gates 4 and 5 ran on it: the witness saw the clip, and the reconciler was asked.
        assert.ok(
          e.model.observeClipCalls.some((c) => c.clip.takeId === firstTake(failing.key)),
          `${heard}: ${failing.key}`,
        )
        assert.ok(
          e.model.calls.some(
            (c) => c.role === 'reconciler' && c.takeIds?.includes(firstTake(failing.key)),
          ),
          `${heard}: ${failing.key}`,
        )
      }
    } finally {
      await run.engine.stop()
    }
  }
})

// ---------------------------------------------------------------- 23

test('23. every take past Gate 2 has exactly one observe receipt, role witness, temperature 0, whose takeIds are its own, and a clip observation, whether it is accepted or fails; every observe call on a clip holds only a clip of that run and a temperature', async () => {
  // Each of shot 3's three takes fails Gate 5, so the run holds accepted takes and three that failed
  // (S-099: it was shot 2's one).
  const failing = turned(t3, 'never-person')
  const scripted = [t0, t1, t2, ...shot3]
  const { engine, ran } = await threeRanks('r23', {
    reconciler: Object.fromEntries(shot3.map((t) => [t.key, failing])),
    takes: scripted,
  })
  try {
    assert.equal(ran.result.rule, 'gate-5', JSON.stringify(ran.result))
    assert.deepEqual(
      ran.takes.map((t) => t.outcome),
      ['accept', 'accept', 'accept', 'fail', 'fail', 'fail'],
    )
    for (const take of ran.takes) {
      const witnessed = ran.receipts.filter(
        (r) => r.call === 'observe' && r.take_ids.includes(take.take_id),
      )
      assert.equal(witnessed.length, 1, `${take.take_id} has ${witnessed.length} observe receipts`)
      assert.equal(witnessed[0]?.role, 'witness')
      assert.equal(witnessed[0]?.temperature, 0)
      assert.deepEqual(witnessed[0]?.take_ids, [take.take_id])
      assert.deepEqual(witnessed[0]?.picture_ids, [])
      const observed = ran.takeObservations.filter((o) => o.take_id === take.take_id)
      assert.equal(observed.length, 1, `${take.take_id} has ${observed.length} observations`)
      assert.equal(observed[0]?.id, `obs-${take.take_id}`)
      const key = take.take_id.replace(/^a\d+-/, '')
      assert.deepEqual(
        observed[0]?.observation,
        seenClip(scripted.find((t) => t.key === key) as Take),
      )
    }

    // Every observe call on a clip holds a clip of this run, and a temperature — and nothing else.
    assert.equal(engine.model.observeClipCalls.length, 6)
    for (const call of engine.model.observeClipCalls) {
      assert.deepEqual(Object.keys(call).sort(), ['clip', 'temperature'], JSON.stringify(call))
      assert.deepEqual(Object.keys(call.clip).sort(), ['path', 'takeId'], JSON.stringify(call))
      assert.equal(call.temperature, 0)
      const take = ran.takes.find((t) => t.take_id === call.clip.takeId)
      assert.ok(take !== undefined, `${call.clip.takeId} is not a take of this run`)
      assert.equal(call.clip.path, take.path)
      assert.ok(
        !relative(join(engine.artifactRoot, ran.runId), call.clip.path).startsWith('..'),
        `${call.clip.path} is not in the run's folder`,
      )
    }
  } finally {
    await engine.stop()
  }
})

test('23. a witness answer that does not parse finishes the run failed, that take with Gates 2 and 3 only and no outcome', async () => {
  // A still's observation: no actions and no event order, which a clip's requires (D-041).
  const still = observation([])
  const { engine, ran } = await threeRanks('r23-unparsed', {
    witness: { [t1.key]: still },
    takes: [t0, t1],
  })
  try {
    assert.equal(ran.result.status, 'failed', JSON.stringify(ran.result))
    assert.ok(String(ran.result.detail).length > 0)
    const take = takeOf(ran, t1.key)
    assert.deepEqual(
      take.verdicts.map((v) => v.gate),
      ['2', '3'],
      "the unparsed take's verdicts",
    )
    assert.equal(take.outcome, null, 'a take whose gates were cut off has an outcome')
    assert.equal(ran.takeObservations.filter((o) => o.take_id === take.take_id).length, 0)
    assert.equal(ran.takeReconciliations.filter((o) => o.take_id === take.take_id).length, 0)
    assert.ok(
      !engine.model.calls.some((c) => c.role === 'reconciler' && c.takeIds?.includes(take.take_id)),
      'the reconciler was asked about an unparsed take',
    )
    assert.equal(takeOf(ran, t0.key).outcome, 'accept')
  } finally {
    await engine.stop()
  }
})

// ---------------------------------------------------------------- 24

/** The one reconciler call about a take, as the stand-in received it. */
function reconcileCallOf(engine: Engine, takeId: string) {
  const calls = engine.model.calls.filter(
    (c) =>
      c.role === 'reconciler' &&
      c.takeIds !== undefined &&
      c.takeIds.length > 0 &&
      c.takeIds.includes(takeId),
  )
  assert.equal(calls.length, 1, `${takeId} has ${calls.length} reconciler calls`)
  return calls[0] as (typeof calls)[number]
}

test("24. Gate 5 is one structured call per take past Gate 2, role reconciler, temperature 0, takeIds its own, given every subject its shot shows and the take's criteria with the unclaimed mustShow marked, and never the expanded prompt; a clipped entity does not fail it; and every take past Gate 5 has one take_observation and one take_reconciliation row, each tied to its receipt by the take id", async () => {
  const expanded = Object.fromEntries(
    takes.map((t) => [
      t.key,
      { expandedPrompt: `EXPANDED-BY-PROVIDER-${t.unit}: a grand cinematic vista` },
    ]),
  )
  // Shot 0's subject is clipped by the edge of the frame: motion, which fails no clip (S-072).
  const clipped = seenClip(t0, (i) => (i === 0 ? { clippedByEdge: true } : {}))
  const { engine, ran } = await threeRanks('r24', {
    video: expanded,
    witness: { [t0.key]: clipped },
  })
  try {
    clipsCompleted(ran)
    assert.equal(takeOf(ran, t0.key).outcome, 'accept', 'a clipped entity failed the take')

    for (const take of takes) {
      const id = firstTake(take.key)
      const call = reconcileCallOf(engine, id)
      assert.equal(call.temperature, 0)
      assert.deepEqual(call.takeIds, [id])
      assert.equal(call.pictureIds, undefined, `${id}'s reconcile call names pictures`)
      const { prompt } = call

      // Every subject the shot shows, by id and name; the take's criteria; the unclaimed marked.
      for (const subject of take.subjects) {
        assert.ok(
          prompt.includes(subject.id) && prompt.includes(subject.name),
          `${id}: ${subject.id}`,
        )
      }
      for (const criterion of [...take.mustShow, ...take.mustNotShow]) {
        assert.ok(prompt.includes(criterion), `${id}'s reconcile prompt does not hold ${criterion}`)
        assert.ok(
          prompt.includes(CRITERION_TEXT[criterion] ?? criterion),
          `${id}: ${criterion}'s text`,
        )
      }
      const lines = prompt.split('\n')
      const marker = lines.findIndex((l) => /some shot/i.test(l))
      assert.ok(marker >= 0, `${id}'s reconcile prompt does not mark the reel's unclaimed mustShow`)
      for (const criterion of take.unclaimed) {
        const at = lines.findIndex((l) => l.includes(criterion))
        assert.ok(at > marker, `${id}: ${criterion} is not under the reel's own line`)
      }
      for (const other of ['show-seal', 'show-pressing', 'show-crowd', 'show-law']) {
        if (take.mustShow.includes(other)) continue
        assert.ok(
          !prompt.includes(other),
          `${id}'s reconcile prompt holds ${other}, which its unit does not claim`,
        )
      }
      // Never the expanded prompt (D-072).
      assert.ok(
        !prompt.includes('EXPANDED-BY-PROVIDER'),
        `${id}'s reconcile prompt holds the expanded prompt`,
      )
      assert.ok(!prompt.includes('grand cinematic vista'))

      // Its receipt, its observation and its reconciliation, each tied by the take id.
      const receipts = ran.receipts.filter(
        (r) => r.role === 'reconciler' && r.take_ids.includes(id),
      )
      assert.equal(receipts.length, 1, `${id} has ${receipts.length} reconciler receipts`)
      assert.deepEqual(receipts[0]?.take_ids, [id])
      assert.equal(receipts[0]?.temperature, 0)
      assert.equal(receipts[0]?.call, 'structured')
      assert.deepEqual(
        ran.takeObservations.filter((o) => o.take_id === id).map((o) => o.id),
        [`obs-${id}`],
      )
      const reconciled = ran.takeReconciliations.filter((o) => o.take_id === id)
      assert.deepEqual(
        reconciled.map((o) => o.id),
        [`rec-${id}`],
      )
      assert.deepEqual(reconciled[0]?.answer, passesTake(take))
      assert.deepEqual(reconciled[0]?.failed, [])
    }
    assert.ok(
      engine.video.calls.every((c) => !c.prompt.includes('EXPANDED-BY-PROVIDER')),
      'the fixture put the expansion into a prompt',
    )
  } finally {
    await engine.stop()
  }
})

test('24. Gate 5 fails a take, each built alone, for a subject not shown, a count that does not match, a claimed presence mustShow not shown, a claimed event mustShow not shown, and a mustNotShow shown; and every take past Gate 5 has one take_observation and one take_reconciliation row, kept whether the take is accepted or fails', async () => {
  const base = () => passesTake(t0)
  const faults: ReadonlyArray<readonly [string, unknown, RegExp]> = [
    [
      'a subject not shown',
      { ...base(), subjects: base().subjects.map((s) => ({ ...s, entity: null })) },
      /not shown/,
    ],
    [
      'a count that does not match',
      { ...base(), subjects: base().subjects.map((s) => ({ ...s, countMatches: false })) },
      /count/,
    ],
    ['a claimed presence mustShow not shown', turned(t0, 'show-seal'), /show-seal/],
    ['a claimed event mustShow not shown', turned(t0, 'show-pressing'), /show-pressing/],
    ['a mustNotShow shown', turned(t0, 'never-flag'), /never-flag/],
  ]
  for (const [what, answer, why] of faults) {
    // Each fault on each of shot 0's three takes, where it was on its one (S-099).
    const { engine, ran } = await threeRanks(`r24-${what}`, {
      reconciler: Object.fromEntries(shot0.map((t) => [t.key, answer])),
      takes: shot0,
    })
    try {
      assert.equal(ran.result.status, 'stopped', `${what}: ${JSON.stringify(ran.result)}`)
      assert.equal(ran.result.rule, 'gate-5', what)
      const ids = shot0.map((t) => firstTake(t.key))
      for (const failing of shot0) {
        const take = takeOf(ran, failing.key) as TakeRow
        const gate5 = take.verdicts[3]
        assert.equal(gate5?.gate, '5', `${what}: ${failing.key}`)
        assert.equal(gate5?.outcome, 'fail', `${what}: ${failing.key}`)
        assert.equal(gate5?.reasons.length, 1, `${what}: ${gate5?.reasons.join(' | ')}`)
        assert.match(gate5?.reasons[0] ?? '', why, `${what}: ${failing.key}`)
        assert.equal(take.outcome, 'fail', `${what}: ${failing.key}`)
        // Kept though it failed: its observation and its reconciliation, tied to their receipts.
        const id = take.take_id
        assert.deepEqual(
          ran.takeReconciliations.find((o) => o.take_id === id)?.failed,
          gate5?.reasons,
          `${what}: ${failing.key}`,
        )
        assert.equal(
          ran.receipts.filter((r) => r.role === 'reconciler' && r.take_ids.includes(id)).length,
          1,
          `${what}: ${failing.key}`,
        )
      }
      assert.deepEqual(
        ran.takeObservations.map((o) => o.id),
        ids.map((id) => `obs-${id}`),
        what,
      )
      assert.deepEqual(
        ran.takeReconciliations.map((o) => o.id),
        ids.map((id) => `rec-${id}`),
        what,
      )
    } finally {
      await engine.stop()
    }
  }
})
