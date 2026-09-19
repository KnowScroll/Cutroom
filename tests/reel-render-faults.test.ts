import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { AssemblerPort } from '@cutroom/contracts'
import type { FakeScript } from '@cutroom/providers'
import { startEngine, type Engine, type EngineOptions } from './engine/harness.ts'
import { renderRows } from './engine/render.ts'
import { THREE_RANKS, THREE_RANKS_PICS } from './engine/stills.ts'
import {
  CUT_QUESTIONS,
  described,
  video,
  videoRequest,
  videoScript,
  type Videoed,
} from './engine/video.ts'

// reel-render, Slice 5 — check 46 (docs/features/reel-render.md): faults (D-005, S-046, S-066, S-074).
// A port that throws, at any call the clips stage or the cut makes, and a judge answer that leaves out
// one of Gate 7's questions, each finish the run failed with a detail. Nothing is thrown away: every
// receipt of a call that returned is kept — read from the tables, and typed here BY HAND, never taken
// from a stand-in's own list of calls, which holds the call that threw.
//
// Gate 4 says this check may be green before Slice 5's code: makeClips and cutReel have turned a throw
// into `failed` since Slices 3 and 4. The breaks recorded with the slice are what show it can fail.

const N = (unit: number) => `a1-shot-${unit}-narration`
const T = (unit: number) => `a1-shot-${unit}-take-1`

/** The model receipts of the takes and the cut, as `call role take-ids`, in the order written. */
const takeReceipts = (ran: Videoed) =>
  ran.receipts
    .filter((r) => r.take_ids.length > 0 || r.call === 'judgeCut')
    .map((r) => `${r.call} ${r.role} ${r.take_ids.join(',')}`.trimEnd())

/** A take's two model receipts: the witness's look at its clip, then the reconciler's answer. */
const gated = (unit: number) => [`observe witness ${T(unit)}`, `structured reconciler ${T(unit)}`]

/** `videoScript` with the `i`-th answer of `role` replaced by a throw. */
function throwing(script: FakeScript, role: keyof FakeScript, i: number, message: string) {
  const answers = [...(script[role] ?? [])]
  assert.ok(answers[i] !== undefined, `the script has no ${role} answer ${i + 1} to replace`)
  answers[i] = { throws: message }
  return { ...script, [role]: answers }
}

/** THREE_RANKS' stills stage asks the witness and the reconciler four times each, and the judge never. */
const STILLS_CALLS = 4

const plain = () => videoScript(THREE_RANKS, THREE_RANKS_PICS)

interface Fault {
  name: string
  options: Omit<EngineOptions, 'worker'>
  detail: RegExp
  /** The narrations and clips the stand-ins were asked for, the call that threw included. */
  asked: { narrations: string[]; clips: string[] }
  /** The receipts of the calls that returned. */
  speech: string[]
  video: string[]
  model: string[]
  /** For a fault in the cut: what the render row kept. */
  render?: { path: boolean; measure: boolean; gate7: boolean }
}

const ALL = [0, 1, 2, 3, 4, 5]
const EVERY_TAKE = ALL.flatMap(gated)

const FAULTS: Fault[] = [
  {
    name: 'a narration call',
    options: {
      narration: { 'shot-2-narration': { throws: 'the voice fell over' } },
      script: plain(),
    },
    detail: /the voice fell over/,
    asked: { narrations: [N(0), N(1), N(2)], clips: [T(0), T(1)] },
    speech: [N(0), N(1)],
    video: [T(0), T(1)],
    model: [...gated(0), ...gated(1)],
  },
  {
    name: 'a clip call',
    options: {
      video: { 'shot-2-take-1': { throws: 'the clip service fell over' } },
      script: plain(),
    },
    detail: /the clip service fell over/,
    asked: { narrations: [N(0), N(1), N(2)], clips: [T(0), T(1), T(2)] },
    speech: [N(0), N(1), N(2)],
    video: [T(0), T(1)],
    model: [...gated(0), ...gated(1)],
  },
  {
    name: "a probe call, on a narration's audio",
    options: {
      media: { 'shot-2-narration': { throws: { probe: 'ffprobe could not read the audio' } } },
      script: plain(),
    },
    detail: /ffprobe could not read the audio/,
    asked: { narrations: [N(0), N(1), N(2)], clips: [T(0), T(1)] },
    speech: [N(0), N(1), N(2)],
    video: [T(0), T(1)],
    model: [...gated(0), ...gated(1)],
  },
  {
    name: "a probe call, on a take's clip",
    options: {
      media: { 'shot-2-take-1': { throws: { probe: 'ffprobe could not read the clip' } } },
      script: plain(),
    },
    detail: /ffprobe could not read the clip/,
    asked: { narrations: [N(0), N(1), N(2)], clips: [T(0), T(1), T(2)] },
    speech: [N(0), N(1), N(2)],
    video: [T(0), T(1), T(2)],
    model: [...gated(0), ...gated(1)],
  },
  {
    name: 'a scan call',
    options: {
      media: { 'shot-2-take-1': { throws: { scan: 'the scan could not run' } } },
      script: plain(),
    },
    detail: /the scan could not run/,
    asked: { narrations: [N(0), N(1), N(2)], clips: [T(0), T(1), T(2)] },
    speech: [N(0), N(1), N(2)],
    video: [T(0), T(1), T(2)],
    model: [...gated(0), ...gated(1)],
  },
  {
    name: 'a readText call',
    options: {
      media: { 'shot-2-take-1': { throws: { readText: 'the words could not be read' } } },
      script: plain(),
    },
    detail: /the words could not be read/,
    asked: { narrations: [N(0), N(1), N(2)], clips: [T(0), T(1), T(2)] },
    speech: [N(0), N(1), N(2)],
    video: [T(0), T(1), T(2)],
    model: [...gated(0), ...gated(1)],
  },
  {
    name: 'a listen call',
    options: {
      media: { 'shot-2-take-1': { throws: { listen: 'the sound could not be heard' } } },
      script: plain(),
    },
    detail: /the sound could not be heard/,
    asked: { narrations: [N(0), N(1), N(2)], clips: [T(0), T(1), T(2)] },
    speech: [N(0), N(1), N(2)],
    video: [T(0), T(1), T(2)],
    model: [...gated(0), ...gated(1)],
  },
  {
    name: 'an observe call',
    options: {
      script: throwing(plain(), 'witness', STILLS_CALLS + 2, 'the witness is unreachable'),
    },
    detail: /the witness is unreachable/,
    asked: { narrations: [N(0), N(1), N(2)], clips: [T(0), T(1), T(2)] },
    speech: [N(0), N(1), N(2)],
    video: [T(0), T(1), T(2)],
    model: [...gated(0), ...gated(1)],
  },
  {
    name: 'a reconcile call',
    options: {
      script: throwing(plain(), 'reconciler', STILLS_CALLS + 2, 'the reconciler is unreachable'),
    },
    detail: /the reconciler is unreachable/,
    asked: { narrations: [N(0), N(1), N(2)], clips: [T(0), T(1), T(2)] },
    speech: [N(0), N(1), N(2)],
    video: [T(0), T(1), T(2)],
    model: [...gated(0), ...gated(1), `observe witness ${T(2)}`],
  },
  {
    name: 'a probe call, on the assembled file',
    options: {
      media: { 'a1-render': { throws: { probe: 'ffprobe could not read the reel' } } },
      script: plain(),
    },
    detail: /ffprobe could not read the reel/,
    asked: { narrations: ALL.map(N), clips: ALL.map(T) },
    speech: ALL.map(N),
    video: ALL.map(T),
    model: EVERY_TAKE,
    render: { path: true, measure: false, gate7: false },
  },
  {
    name: 'a frames call',
    options: {
      media: { 'a1-render': { throws: { frames: 'the frames could not be cut' } } },
      script: plain(),
    },
    detail: /the frames could not be cut/,
    asked: { narrations: ALL.map(N), clips: ALL.map(T) },
    speech: ALL.map(N),
    video: ALL.map(T),
    model: EVERY_TAKE,
    render: { path: true, measure: true, gate7: false },
  },
  {
    name: 'an assemble call',
    options: {
      wrapAssembler: (assembler: AssemblerPort): AssemblerPort => ({
        ready: () => assembler.ready(),
        assemble: async () => {
          throw new Error('the assembler fell over')
        },
      }),
      script: plain(),
    },
    detail: /the assembler fell over/,
    asked: { narrations: ALL.map(N), clips: ALL.map(T) },
    speech: ALL.map(N),
    video: ALL.map(T),
    model: EVERY_TAKE,
    render: { path: false, measure: false, gate7: false },
  },
  {
    name: 'a judgeCut call',
    options: { script: throwing(plain(), 'judge', 0, 'the judge is unreachable') },
    detail: /the judge is unreachable/,
    asked: { narrations: ALL.map(N), clips: ALL.map(T) },
    speech: ALL.map(N),
    video: ALL.map(T),
    model: EVERY_TAKE,
    render: { path: true, measure: true, gate7: false },
  },
  {
    name: 'a judge answer leaving out a question',
    options: {
      // Four of the five questions, each yes: the fifth is not answered at all.
      script: videoScript(THREE_RANKS, THREE_RANKS_PICS, {
        cut: {
          answers: CUT_QUESTIONS.slice(0, 4).map((question) => ({ question, answer: 'yes' })),
        },
      }),
    },
    detail: new RegExp(
      `does not name every question once.*${CUT_QUESTIONS[4].replace(/\?/g, '\\?')}`,
    ),
    asked: { narrations: ALL.map(N), clips: ALL.map(T) },
    speech: ALL.map(N),
    video: ALL.map(T),
    // The judge's call returned, so its receipt is kept; its answer is what did not parse.
    model: [...EVERY_TAKE, 'judgeCut judge'],
    render: { path: true, measure: true, gate7: false },
  },
]

// ---------------------------------------------------------------- 46

for (const fault of FAULTS) {
  test(`46. a port throwing on a narration, clip, probe, scan, readText, listen, observe, reconcile, frames, assemble or judgeCut call, and a judge answer leaving out a question, each finish the run failed with a detail, every receipt of a call that returned kept — ${fault.name}`, async () => {
    const engine: Engine = await startEngine({ worker: true, ...fault.options })
    try {
      const ran = await video(engine, videoRequest(`r46-${fault.name.replace(/\W+/g, '-')}`))

      // Failed, with the detail, and nothing more: no video, no stage.finished for video.
      assert.deepEqual(Object.keys(ran.result).sort(), [
        'contractVersion',
        'costCents',
        'detail',
        'requestId',
        'runId',
        'status',
      ])
      assert.equal(ran.result.status, 'failed', JSON.stringify(ran.result))
      assert.match(String(ran.result.detail), fault.detail)
      const events = described(ran.events)
      assert.equal(events.at(-1), 'run.finished failed')
      assert.ok(!events.includes('stage.finished video'), 'a failed stage has stage.finished')

      // Every call up to the one that threw was asked for, and nothing after it.
      assert.deepEqual(
        {
          narrations: engine.narration.calls.map((c) => c.narrationId),
          clips: engine.video.calls.map((c) => c.takeId),
        },
        fault.asked,
      )

      // Every receipt of a call that returned is kept, as the tables hold them.
      assert.deepEqual(
        ran.speechReceipts.map((r) => r.narration_id),
        fault.speech,
        'the speech receipts',
      )
      assert.deepEqual(
        ran.videoReceipts.map((r) => r.take_id),
        fault.video,
        'the video receipts',
      )
      assert.deepEqual(
        takeReceipts(ran),
        fault.model,
        'the model receipts of the takes and the cut',
      )
      assert.deepEqual(
        ran.narrations.map((n) => n.narration_id),
        fault.speech,
        'the narration rows',
      )
      assert.deepEqual(
        ran.takes.map((t) => t.take_id),
        fault.video,
        'the take rows',
      )

      // A fault in the cut keeps the render row with what its steps made before it.
      const rows = renderRows(engine, ran.runId)
      if (fault.render === undefined) {
        assert.deepEqual(rows, [], 'a render row for a run whose clips stage failed')
        assert.ok(!ran.jobs.some((j) => j.kind === 'reel.assemble'))
      } else {
        assert.equal(rows.length, 1)
        const [row] = rows
        assert.deepEqual(
          { path: row?.path !== null, measure: row?.measure !== null, gate7: row?.gate7 !== null },
          fault.render,
          'the render row',
        )
        assert.ok(row?.finished_at !== null, 'the render row was not finished')
        assert.ok(!events.some((e) => e.startsWith('verdict 7')), 'a verdict for gate 7')
      }
    } finally {
      await engine.stop()
    }
  })
}
