import assert from 'node:assert/strict'
import { test } from 'node:test'
import { renderManifest } from '@cutroom/pipeline'
import { closeDatabase, openDatabase, readRenderInputs } from '../packages/domain/src/index.ts'
import { TEST_RENDER_SETTINGS, startEngine } from './engine/harness.ts'
import { THREE_SHOTS, narrationRow, renderOf, takeOfFrames, takeRow } from './engine/render.ts'
import { PLANNED, killedMidVideo, takenUpVideo, type KilledVideo } from './engine/restart.ts'
import { THREE_RANKS, THREE_RANKS_PICS } from './engine/stills.ts'
import {
  cutAnswer,
  described,
  retake,
  seenClip,
  takesOf,
  turned,
  videoRequest,
  videoScript,
  type Take,
  type Videoed,
} from './engine/video.ts'

// reel-takes, Slice 5 — checks 21 and 23 (docs/features/reel-takes.md): a restart picks up where it
// stopped (S-092, S-027, D-081, I-15).
//
// A clips job claimed again after its lease runs out runs its code from the start, and its stage
// SKIPS WHAT AN EARLIER ATTEMPT FINISHED: every narration it finished — made, measured, its timings
// parsed — and every take it DECIDED — outcome accept or fail. None is spoken, probed, parsed, made,
// measured, heard, witnessed or reconciled again, and no receipt is added for it. A take a crash cut
// off inside its gates is NOT resumed: its row keeps the gates it reached and no outcome, and the
// shot's take of THAT NUMBER is made again under the next attempt's id. The finishing attempt emits
// each kept take's verdicts when it reaches its shot, so every decided take's verdicts are events
// once, in shot and take order, and a cut-off take's never.
//
// The render is then read from each shot's FINISHED narration and ACCEPTED take, whichever attempt
// made them — never a cut-off take or an unfinished narration — so a render is made of rows from
// more than one attempt by design (S-092, superseding S-089's attempt filter). With checkpoints a
// shot has at most one of either, so `renderManifest` refuses rows holding two, naming the shot.
//
// ONE RUN, read by the first two tests. THREE_RANKS, held at model call 19 — counted over every
// model call from 1: the planner's two, the stills stage's eight, then two a take. Shot 0's take 1
// (11, 12), shot 1's (13, 14), shot 2's take 1 (15, 16), which carries speech and fails GATE 3, shot
// 2's take 2 (17, 18), which is reconciled as showing a mustNotShow and fails GATE 5, and shot 2's
// take 3, whose WITNESS is call 19. So the first attempt leaves shots 0 and 1 accepted, TWO failed
// takes of shot 2 whose verdicts differ — so their events can be told apart in take order — its take
// 3 cut off after Gates 2 and 3, and three finished narrations. What it made is asserted from its
// receipts before the kill, never from the count (S-062).
//
// The second attempt makes shot 2's take 3 again, then shots 3 to 5 — shot 4's take 1 black from its
// first frame, so it fails Gate 2 and its take 2 is the shot's. The six takes the video shows are
// then far enough apart in colour to tell apart, which two takes of one fixture need not be.

const [t0, t1, t2, t3, t4, t5] = takesOf(THREE_RANKS) as [Take, Take, Take, Take, Take, Take]
const UNITS = [0, 1, 2, 3, 4, 5]

const N = (attempt: number, unit: number) => `a${attempt}-shot-${unit}-narration`
const T = (attempt: number, unit: number, n = 1) => `a${attempt}-shot-${unit}-take-${n}`

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

/** A take's four verdict events, in gate order, each accepted unless `outcomes` says otherwise. */
const verdicts = (unit: number, ...outcomes: string[]) =>
  ['2', '3', '4', '5'].map((gate, i) => `verdict ${gate} shot-${unit} ${outcomes[i] ?? 'accept'}`)

/**
 * Where each shot of the fixture begins in the output, by hand: narrations of 9, 7, 3, 3, 2 and 5
 * seconds at 24 frames a second — the first attempt's for shots 0 to 2, the second's for the rest.
 */
const STARTS = [0, 216, 384, 456, 528, 576]
const TOTAL = 696

/** The takes the run's video shows, shot by shot: the first attempt's for shots 0 and 1. */
const SHOWN = [T(1, 0), T(1, 1), T(2, 2, 3), T(2, 3), T(2, 4, 2), T(2, 5)]

/**
 * A fault's words with every take and narration ID struck out: what is left names the shot, or the
 * fault named it nowhere — every one of those ids holds a shot id of its own.
 */
const named = (message: string) => message.replace(/a\d+-shot-\d+-(take-\d+|narration)/g, '<id>')

/** Each take's receipts of a model call, as `call role takeIds`, in the order written. */
const takeReceipts = (receipts: ReadonlyArray<{ call: string; role: string; take_ids: unknown }>) =>
  receipts
    .map((r) => ({
      ...r,
      ids: (typeof r.take_ids === 'string' ? JSON.parse(r.take_ids) : r.take_ids) as string[],
    }))
    .filter((r) => r.ids.length > 0)
    .map((r) => `${r.call} ${r.role} ${r.ids.join()}`)

interface Kept {
  killed: KilledVideo
  ran: Videoed
  /** The second worker's calls, in order. */
  videoCalls: string[]
  narrationCalls: string[]
  /** The render manifest's shots, as take and narration ids. */
  manifest: Array<[string | undefined, string]>
  /** What `readRenderInputs` answers, read directly once the run has completed. */
  inputs: { takes: string[]; narrations: string[] }
  /** Which shot each frame of the output carries, measured. */
  frames: number[]
}

let memo: Promise<Kept> | undefined

/** The restarted run, made once for the tests below and read before its engine is stopped. */
function restarted(): Promise<Kept> {
  memo ??= (async () => {
    const engine = await startEngine({
      worker: false,
      // Shot 2's first take carries speech: it fails Gate 3, and Gates 4 and 5 still run.
      media: { 'shot-2-take-1': { speech: true } },
      // Shot 4's first take is black from its first frame: it fails Gate 2 and makes no model call.
      video: { 'shot-4-take-1': { black: 'whole' } },
    })
    try {
      const killed = await killedMidVideo(engine, videoRequest('r21'), {
        script: videoScript(THREE_RANKS, THREE_RANKS_PICS, {
          takes: [t0, t1, t2, retake(t2, 2), retake(t2, 3)],
          // Shot 2's second take is reconciled as showing never-flag, a mustNotShow: it fails Gate
          // 5, where its first take failed Gate 3, so the two kept takes' verdicts differ.
          reconciler: { 'shot-2-take-2': turned(t2, 'never-flag') },
        }),
        holdAtCall: 19,
        running: 'reel.clips',
        made: {
          narrations: [N(1, 0), N(1, 1), N(1, 2)],
          takes: [T(1, 0), T(1, 1), T(1, 2), T(1, 2, 2), T(1, 2, 3)],
        },
      })
      // The new worker's script answers from shot 2's take 3 on: the second attempt's first model
      // call. Shot 4's take 1 fails Gate 2 and asks for none, so its take 2 follows shot 3's.
      const second = [retake(t2, 3), t3, retake(t4, 2), t5]
      const ran = await takenUpVideo(engine, killed, {
        witness: second.map((t) => ({ value: seenClip(t) })),
        // NOT ONE of the second attempt's takes is reconciled as showing show-meadow, the reel's
        // unclaimed mustShow: only the KEPT takes of shots 0 and 1 show it. A stage that judged it
        // over this attempt's takes alone would stop the run for gate-5 (S-106). Each take still
        // shows every criterion its own shot claims, so each passes Gate 5.
        reconciler: second.map((t) => ({ value: turned(t, 'show-meadow') })),
        judge: [{ value: cutAnswer() }],
      })
      assert.equal(ran.result.status, 'completed', JSON.stringify(ran.result))
      const row = renderOf(engine, ran.runId)
      const manifest = row.renderManifest.shots.map((s): [string | undefined, string] => [
        s.takeId,
        s.narrationId,
      ])
      const frames = takeOfFrames(String(row.path), SHOWN)
      // A narration MADE AND NOT FINISHED — no measure, no timings — written into the run by hand:
      // no killed worker can leave one, since the hold is at a model call and a narration is
      // measured and parsed before its shot's first take (S-062). It must reach no render (S-092).
      engine.query(
        'INSERT INTO narration (run_id, narration_id, attempt, shot_unit, text, path, words, probe) ' +
          "VALUES (?, 'a3-shot-0-narration', 3, 0, 'never finished', 'a3-shot-0-narration.wav', NULL, NULL)",
        ran.runId,
      )
      const db = openDatabase(engine.dbPath)
      let inputs: Kept['inputs']
      try {
        const read = readRenderInputs(db, ran.runId)
        inputs = {
          takes: read.takes.map((t) => t.takeId),
          narrations: read.narrations.map((n) => n.narrationId),
        }
      } finally {
        closeDatabase(db)
      }
      return {
        killed,
        ran,
        videoCalls: engine.video.calls.map((c) => c.takeId),
        narrationCalls: engine.narration.calls.map((c) => c.narrationId),
        manifest,
        inputs,
        frames,
      }
    } finally {
      await engine.stop()
    }
  })()
  return memo
}

const CHECK_21 =
  "21. after a worker is killed mid-clips and a new one started, every narration the first attempt finished and every take it decided is kept — no narration, video, observe or reconcile call and no receipt is made for it again — and the take it cut off is made again under the next attempt's id with the same number, the cut-off row keeping its gates and no outcome; the run completes; and its events hold every kept and made take's verdicts once, in shot and take order"

const CHECK_23 =
  "23. the render of a restarted run is made from each shot's finished narration and accepted take, whichever attempt made them, and never a cut-off take or an unfinished narration — readRenderInputs read directly, and every frame of the output measured to carry the take its shot's narration puts there; and renderManifest, read directly, refuses rows holding two accepted takes of one shot, or two finished narrations, naming the shot, so the assemble job fails the run rather than choosing one"

// ---------------------------------------------------------------- 21

test(CHECK_21, async () => {
  const kept = await restarted()
  const { ran, killed } = kept

  // The first attempt left shots 0 and 1 accepted, shot 2's take 1 failed and its take 2 cut off.
  assert.deepEqual(killed.before.events, [...PLANNED, ...STILLS, 'stage.started video'])
  assert.deepEqual(
    takeReceipts(killed.before.receipts),
    [T(1, 0), T(1, 1), T(1, 2), T(1, 2, 2)].flatMap((id) => [
      `observe witness ${id}`,
      `structured reconciler ${id}`,
    ]),
  )
  assert.equal(ran.result.status, 'completed', JSON.stringify(ran.result))

  // KEPT, and not made again: the narrations of shots 0 to 2 are not spoken again, and the takes the
  // first attempt decided are not made again. The only calls are the cut-off take, made again, and
  // the shots the first attempt never reached.
  assert.deepEqual(
    kept.narrationCalls,
    [3, 4, 5].map((u) => N(2, u)),
  )
  assert.deepEqual(kept.videoCalls, [T(2, 2, 3), T(2, 3), T(2, 4), T(2, 4, 2), T(2, 5)])

  // And not looked at again: no observe or reconcile call names a kept take, and the first attempt's
  // model receipts are kept, under the same row ids, with none added for them (I-15).
  const firstTakeReceipts = killed.before.receipts.filter((r) => r.take_ids !== '[]')
  assert.deepEqual(
    ran.receipts.filter((r) => firstTakeReceipts.some((f) => f.id === r.id)).map((r) => r.id),
    firstTakeReceipts.map((r) => r.id),
  )
  assert.deepEqual(
    takeReceipts(ran.receipts),
    [T(1, 0), T(1, 1), T(1, 2), T(1, 2, 2), T(2, 2, 3), T(2, 3), T(2, 4, 2), T(2, 5)].flatMap(
      (id) => [`observe witness ${id}`, `structured reconciler ${id}`],
    ),
  )

  // No receipt is added for kept work: the first attempt's stay, and the second's are its own.
  assert.deepEqual(
    ran.speechReceipts.map((r) => r.narration_id),
    [N(1, 0), N(1, 1), N(1, 2), ...[3, 4, 5].map((u) => N(2, u))],
  )
  assert.deepEqual(
    ran.videoReceipts.map((r) => r.take_id),
    [
      T(1, 0),
      T(1, 1),
      T(1, 2),
      T(1, 2, 2),
      T(1, 2, 3),
      T(2, 2, 3),
      T(2, 3),
      T(2, 4),
      T(2, 4, 2),
      T(2, 5),
    ],
  )

  // The cut-off take is NOT resumed: its row keeps the gates it reached and no outcome, its
  // observation and reconciliation are absent, and its shot's take OF THAT NUMBER is made again
  // under the next attempt's id.
  const ALL = ['2 accept', '3 accept', '4 accept', '5 accept']
  assert.deepEqual(
    ran.takes.map((t) => [
      t.take_id,
      t.attempt,
      t.number,
      t.verdicts.map((v) => `${v.gate} ${v.outcome}`),
      t.outcome,
    ]),
    [
      [T(1, 0), 1, 1, ALL, 'accept'],
      [T(1, 1), 1, 1, ALL, 'accept'],
      [T(1, 2), 1, 1, ['2 accept', '3 fail', '4 accept', '5 accept'], 'fail'],
      [T(1, 2, 2), 1, 2, ['2 accept', '3 accept', '4 accept', '5 fail'], 'fail'],
      [T(1, 2, 3), 1, 3, ['2 accept', '3 accept'], null],
      [T(2, 2, 3), 2, 3, ALL, 'accept'],
      [T(2, 3), 2, 1, ALL, 'accept'],
      [T(2, 4), 2, 1, ['2 fail'], 'fail'],
      [T(2, 4, 2), 2, 2, ALL, 'accept'],
      [T(2, 5), 2, 1, ALL, 'accept'],
    ],
  )
  const seen = [T(1, 0), T(1, 1), T(1, 2), T(1, 2, 2), T(2, 2, 3), T(2, 3), T(2, 4, 2), T(2, 5)]
  assert.deepEqual(ran.takeObservations.map((o) => o.take_id).sort(), [...seen].sort())
  assert.deepEqual(ran.takeReconciliations.map((r) => r.take_id).sort(), [...seen].sort())

  // The narrations the first attempt finished are its own rows, measured and timed, with none of
  // their shots spoken again.
  assert.deepEqual(
    ran.narrations.map((n) => [
      n.narration_id,
      n.attempt,
      n.words?.length,
      n.probe?.durationSeconds,
    ]),
    [
      [N(1, 0), 1, 18, 9],
      [N(1, 1), 1, 14, 7],
      [N(1, 2), 1, 6, 3],
      [N(2, 3), 2, 6, 3],
      [N(2, 4), 2, 4, 2],
      [N(2, 5), 2, 10, 5],
    ],
  )

  // The finishing attempt's events hold EVERY KEPT AND MADE TAKE'S verdicts once, in shot and take
  // order — shot 2's kept take 1, which failed Gate 3, then its kept take 2, which failed Gate 5,
  // then the take made in the cut-off one's place — and the cut-off take's never. stage.started for
  // video is written once (S-027).
  assert.deepEqual(described(ran.events), [
    ...PLANNED,
    ...STILLS,
    'stage.started video',
    ...verdicts(0),
    ...verdicts(1),
    ...verdicts(2, 'accept', 'fail'),
    ...verdicts(2, 'accept', 'accept', 'accept', 'fail'),
    ...verdicts(2),
    ...verdicts(3),
    'verdict 2 shot-4 fail',
    ...verdicts(4),
    ...verdicts(5),
    'verdict 7 accept',
    'stage.finished video',
    'run.finished completed',
  ])
  assert.equal(
    ran.events.filter((e) => e.type === 'stage.started' && e.stage === 'video').length,
    1,
    'stage.started for video was written twice',
  )
  assert.deepEqual(
    ran.jobs.map((j) => [j.kind, j.state, j.attempts]),
    [
      ['reel.plan', 'done', 1],
      ['reel.keyframes', 'done', 1],
      ['reel.clips', 'done', 2],
      ['reel.assemble', 'done', 1],
    ],
  )
})

// ---------------------------------------------------------------- 23

test(`${CHECK_23} — the rows a restarted render is read from, and the output measured`, async () => {
  const kept = await restarted()

  // Read directly: each shot's finished narration and accepted take, whichever attempt made them,
  // and never the cut-off take, a failed take or a narration left unfinished (S-092).
  assert.deepEqual(
    kept.inputs,
    {
      takes: SHOWN,
      narrations: [N(1, 0), N(1, 1), N(1, 2), ...[3, 4, 5].map((u) => N(2, u))],
    },
    "the render is read from rows beside each shot's finished narration and accepted take",
  )
  assert.ok(
    !kept.inputs.takes.includes(T(1, 2, 3)),
    'the render is read from the take the crash cut off',
  )
  for (const failed of [T(1, 2), T(1, 2, 2), T(2, 4)]) {
    assert.ok(!kept.inputs.takes.includes(failed), `the render is read from the failed ${failed}`)
  }
  assert.ok(
    !kept.inputs.narrations.includes('a3-shot-0-narration'),
    'the render is read from a narration that was never measured and timed',
  )

  // The manifest is those same rows, shot by shot: the first attempt's narration and take for shots
  // 0 and 1, its narration and the second's take for shot 2, the second's for the rest.
  assert.deepEqual(kept.manifest, [
    [T(1, 0), N(1, 0)],
    [T(1, 1), N(1, 1)],
    [T(2, 2, 3), N(1, 2)],
    [T(2, 3), N(2, 3)],
    [T(2, 4, 2), N(2, 4)],
    [T(2, 5), N(2, 5)],
  ])

  // And every frame of the output, measured, carries the take its shot's narration puts there: the
  // spans are the narrations', and no frame carries a clip of another shot.
  assert.equal(kept.frames.length, TOTAL)
  assert.deepEqual(
    STARTS.map((start) => kept.frames[start]),
    UNITS,
  )
  kept.frames.forEach((shot, frame) => {
    const expected = STARTS.findLastIndex((start) => start <= frame)
    assert.equal(shot, expected, `frame ${frame} carries shot ${shot}'s clip, not ${expected}'s`)
  })
})

test(`${CHECK_23} — renderManifest refuses two accepted takes of one shot, or two finished narrations`, () => {
  const WORDS = [
    ['a', 'charter', 'was', 'sealed', 'at', 'Runnymede.'],
    ['The', 'pope', 'annulled', 'it.'],
    ['Three', 'clauses', 'are', 'still', 'law', 'in', 'England', 'today.'],
  ]
  /** Three shots of one attempt, each with its finished narration and its one accepted take. */
  const rows = () => ({
    runId: 'run-1',
    attempt: 1,
    plan: THREE_SHOTS,
    request: videoRequest('pure'),
    stills: [],
    degradations: [],
    takes: [takeRow(0, 5), takeRow(1, 5), takeRow(2, 5)],
    narrations: WORDS.map((words, unit) => narrationRow(unit, 3, words)),
    stillHolds: [],
    ledger: { imageCents: 0, narrationCents: 0, videoCents: 0 },
  })

  // As they are, they make a manifest: what is refused below is the SECOND row of a shot, not these.
  assert.equal(renderManifest(rows(), TEST_RENDER_SETTINGS).shots.length, 3)

  // Two accepted takes of one shot — what a late row from a worker whose lease outlasted it would
  // leave (S-089's reason). The manifest is refused, naming the shot, rather than choosing one.
  const twoTakes = rows()
  twoTakes.takes = [...twoTakes.takes, takeRow(1, 5, { takeId: 'a2-shot-1-take-1', attempt: 2 })]
  assert.throws(
    () => renderManifest(twoTakes, TEST_RENDER_SETTINGS),
    (error: Error) => {
      // The SHOT is named, not only the takes: a fault that listed the two take ids alone would
      // hold "shot-1" inside each of them and name the shot nowhere.
      assert.match(named(error.message), /shot-1/, error.message)
      assert.match(error.message, /accepted take/i, error.message)
      return true
    },
    'two accepted takes of one shot were not refused',
  )

  // Two finished narrations of one shot, likewise.
  const twoNarrations = rows()
  const second = narrationRow(2, 3, WORDS[2] ?? [])
  twoNarrations.narrations = [
    ...twoNarrations.narrations,
    { ...second, narrationId: 'a2-shot-2-narration', attempt: 2 },
  ]
  assert.throws(
    () => renderManifest(twoNarrations, TEST_RENDER_SETTINGS),
    (error: Error) => {
      assert.match(named(error.message), /shot-2/, error.message)
      assert.match(error.message, /narration/i, error.message)
      return true
    },
    'two finished narrations of one shot were not refused',
  )
})
