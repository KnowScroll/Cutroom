import assert from 'node:assert/strict'
import { performance } from 'node:perf_hooks'
import { test } from 'node:test'
import type {
  ClipsRecorder,
  LanguageModelPort,
  MediaPort,
  NarrationPort,
  NarrationRecord,
  NarrationRequest,
  TakeRecord,
  VideoPort,
  VideoRequest,
} from '@cutroom/contracts'
import { DEFAULT_PLAN_SETTINGS, makeClips } from '@cutroom/pipeline'
import { TEST_RENDER_SETTINGS, startEngine, type EngineOptions } from './engine/harness.ts'
import { passingPlan, planRequest } from './engine/plans.ts'
import { narrationProbe } from './engine/render.ts'
import { THREE_RANKS, THREE_RANKS_PICS } from './engine/stills.ts'
import {
  retake,
  takesOf,
  video,
  videoRequest,
  videoScript,
  type Take,
  type Videoed,
} from './engine/video.ts'

// reel-takes, Slice 2 — checks 10 and 11 (docs/features/reel-takes.md): a provider that fails for a
// moment (S-096, D-024, I-11). The stand-ins answer `unavailable` for the first n sends of an id when
// a test scripts `transient: n`. The worker's guarded port sends the same request again, up to
// `maxAttempts` sends, waiting `backoffMs` and then twice the last wait; nothing is written for an
// `unavailable` answer, and a call made after N of them records N on its receipt, the take counter
// untouched. Still unavailable at the last send, the port throws, and the run fails with nothing
// counted. A call that throws is a fault, sent once.
//
// The waits are measured, not assumed: the port the worker is handed is wrapped to time each send.

const takes = takesOf(THREE_RANKS)
const [t0, t1, t2, t3, t4, t5] = takes as [Take, Take, Take, Take, Take, Take]

const T = (unit: number, n = 1) => `a1-shot-${unit}-take-${n}`
const N = (unit: number) => `a1-shot-${unit}-narration`

interface Send<R> {
  id: string
  at: number
  request: R
}

/** Every send the worker's guarded ports made, timed as it reached the port the worker was handed. */
function timed() {
  const videos: Array<Send<VideoRequest>> = []
  const narrations: Array<Send<NarrationRequest>> = []
  return {
    videos,
    narrations,
    wrapVideo: (port: VideoPort): VideoPort => ({
      generate(request) {
        videos.push({
          id: request.takeId,
          at: performance.now(),
          request: structuredClone(request),
        })
        return port.generate(request)
      },
    }),
    wrapNarration: (port: NarrationPort): NarrationPort => ({
      speak(request) {
        narrations.push({
          id: request.narrationId,
          at: performance.now(),
          request: structuredClone(request),
        })
        return port.speak(request)
      },
    }),
  }
}

/** The sends of one call: the same request each time, and the waits between them, in ms. */
function sendsOf<R>(sends: ReadonlyArray<Send<R>>, id: string) {
  const of = sends.filter((s) => s.id === id)
  for (const send of of.slice(1)) {
    assert.deepEqual(send.request, of[0]?.request, `${id} was sent again with another request`)
  }
  return {
    count: of.length,
    waits: of.slice(1).map((send, i) => send.at - (of[i]?.at ?? Number.NaN)),
  }
}

/** One video run on an engine of its own, to its end, with its receipts' transient errors. */
async function ended(
  requestId: string,
  options: Omit<EngineOptions, 'worker'>,
): Promise<{
  ran: Videoed
  videoCalls: string[]
  narrationCalls: string[]
  transient: { video: Array<[string, number]>; speech: Array<[string, number]> }
}> {
  const engine = await startEngine({ worker: true, ...options })
  try {
    const ran = await video(engine, videoRequest(requestId))
    return {
      ran,
      videoCalls: engine.video.calls.map((c) => c.takeId),
      narrationCalls: engine.narration.calls.map((c) => c.narrationId),
      transient: {
        video: engine
          .query<{ take_id: string; transient_errors: number }>(
            'SELECT take_id, transient_errors FROM video_receipt WHERE run_id = ? ORDER BY id',
            ran.runId,
          )
          .map((r) => [r.take_id, r.transient_errors]),
        speech: engine
          .query<{ narration_id: string; transient_errors: number }>(
            'SELECT narration_id, transient_errors FROM speech_receipt WHERE run_id = ? ORDER BY id',
            ran.runId,
          )
          .map((r) => [r.narration_id, r.transient_errors]),
      },
    }
  } finally {
    await engine.stop()
  }
}

// ---------------------------------------------------------------- 10

const CHECK_10 =
  '10. a video call answered unavailable N times running, N below maxAttempts, is sent again with the same request after waits of at least backoffMs and then twice that, and is made: the take keeps its number — take 1 of its shot, one take row and one video receipt recording N; a take 2 made after two unavailable answers is take 2; and a narration call answered unavailable is sent again the same way, its speech receipt recording N'

test(CHECK_10, async () => {
  // A backoff long enough to tell one wait from twice it, on a machine running the suite beside it.
  const backoffMs = 150
  const sends = timed()
  const { ran, videoCalls, narrationCalls, transient } = await ended('r10', {
    renderSettings: { ...TEST_RENDER_SETTINGS, transient: { maxAttempts: 3, backoffMs } },
    wrapVideo: sends.wrapVideo,
    wrapNarration: sends.wrapNarration,
    // Shot 0's take is unavailable twice; shot 3's first take is black, and its second is
    // unavailable twice; shot 1's narration is unavailable twice. Shot 3's first take fails Gate 2
    // and makes no model call.
    video: {
      'shot-0-take-1': { transient: 2 },
      'shot-3-take-1': { black: 'whole' },
      'shot-3-take-2': { transient: 2 },
    },
    narration: { 'shot-1-narration': { transient: 2 } },
    script: videoScript(THREE_RANKS, THREE_RANKS_PICS, {
      takes: [t0, t1, t2, retake(t3, 2), t4, t5],
    }),
  })
  assert.equal(ran.result.status, 'completed', JSON.stringify(ran.result))

  for (const [what, sent] of [
    [T(0), sendsOf(sends.videos, T(0))],
    [T(3, 2), sendsOf(sends.videos, T(3, 2))],
    [N(1), sendsOf(sends.narrations, N(1))],
  ] as const) {
    assert.equal(sent.count, 3, `${what} was sent ${sent.count} times`)
    const [first, second] = sent.waits as [number, number]
    assert.ok(first >= backoffMs, `${what}'s first wait was ${first.toFixed(0)} ms`)
    assert.ok(second >= 2 * backoffMs, `${what}'s second wait was ${second.toFixed(0)} ms`)
  }
  // Every other call was sent once.
  assert.deepEqual(videoCalls, [
    T(0),
    T(0),
    T(0),
    T(1),
    T(2),
    T(3, 1),
    T(3, 2),
    T(3, 2),
    T(3, 2),
    T(4),
    T(5),
  ])
  assert.deepEqual(narrationCalls, [N(0), N(1), N(1), N(1), N(2), N(3), N(4), N(5)])

  // The take keeps its number: one row a take made, and one receipt, recording N.
  assert.deepEqual(
    ran.takes.map((t) => [t.take_id, t.number]),
    [
      [T(0), 1],
      [T(1), 1],
      [T(2), 1],
      [T(3, 1), 1],
      [T(3, 2), 2],
      [T(4), 1],
      [T(5), 1],
    ],
  )
  assert.deepEqual(transient.video, [
    [T(0), 2],
    [T(1), 0],
    [T(2), 0],
    [T(3, 1), 0],
    [T(3, 2), 2],
    [T(4), 0],
    [T(5), 0],
  ])
  assert.deepEqual(
    ran.narrations.map((n) => n.narration_id),
    [0, 1, 2, 3, 4, 5].map(N),
  )
  assert.deepEqual(transient.speech, [
    [N(0), 0],
    [N(1), 2],
    [N(2), 0],
    [N(3), 0],
    [N(4), 0],
    [N(5), 0],
  ])
})

// ---------------------------------------------------------------- 11

const CHECK_11 =
  "11. a video call, and a narration call, answered unavailable maxAttempts times finishes the run failed with a detail naming the call and I-11, with no row or receipt for it and no take counted; a call that throws is sent once and fails the run; and makeClips, read directly and handed a video port, then a narration port, that answers unavailable, finishes failed naming the answer, with nothing counted — the last two clauses green before this slice's code, as reel-render's check 46 and Slice 1's handling of the new answer make them"

test(`${CHECK_11} — a video call unavailable at its last send`, async () => {
  assert.equal(TEST_RENDER_SETTINGS.transient.maxAttempts, 3)
  const { ran, videoCalls, transient } = await ended('r11-video', {
    video: { 'shot-1-take-1': { transient: 3 } },
    script: videoScript(THREE_RANKS, THREE_RANKS_PICS, { takes: [t0] }),
  })
  assert.equal(ran.result.status, 'failed', JSON.stringify(ran.result))
  const detail = String(ran.result.detail)
  assert.ok(detail.includes(T(1)), `the detail does not name the call: ${detail}`)
  assert.match(detail, /I-11/, detail)
  // The guarded port's own throw, naming the sends (S-096) — not the stage's fault for an unavailable
  // answer that reached it, which also names the call and I-11 (added after session 31's break 11a).
  assert.match(detail, /each of its 3 sends/, `the port did not throw at its last send: ${detail}`)
  // Three sends, then nothing: not its shot's next take, and no later shot.
  assert.deepEqual(videoCalls, [T(0), T(1), T(1), T(1)])
  assert.deepEqual(
    ran.takes.map((t) => t.take_id),
    [T(0)],
    'a row was written for an unavailable call',
  )
  assert.deepEqual(transient.video, [[T(0), 0]], 'a receipt was written for an unavailable call')
  assert.deepEqual(
    ran.narrations.map((n) => n.narration_id),
    [N(0), N(1)],
  )
})

test(`${CHECK_11} — a narration call unavailable at its last send`, async () => {
  const { ran, videoCalls, narrationCalls, transient } = await ended('r11-narration', {
    narration: { 'shot-1-narration': { transient: 3 } },
    script: videoScript(THREE_RANKS, THREE_RANKS_PICS, { takes: [t0] }),
  })
  assert.equal(ran.result.status, 'failed', JSON.stringify(ran.result))
  const detail = String(ran.result.detail)
  assert.ok(detail.includes(N(1)), `the detail does not name the call: ${detail}`)
  assert.match(detail, /I-11/, detail)
  assert.match(detail, /each of its 3 sends/, `the port did not throw at its last send: ${detail}`)
  assert.deepEqual(narrationCalls, [N(0), N(1), N(1), N(1)])
  assert.deepEqual(videoCalls, [T(0)], 'a clip was made for a shot with no narration')
  assert.deepEqual(
    ran.narrations.map((n) => n.narration_id),
    [N(0)],
    'a row was written for an unavailable call',
  )
  assert.deepEqual(transient.speech, [[N(0), 0]], 'a receipt was written for an unavailable call')
  assert.deepEqual(
    ran.takes.map((t) => t.take_id),
    [T(0)],
  )
})

test(`${CHECK_11} — a call that throws, sent once`, async () => {
  for (const [what, options, calls] of [
    [
      'a video call',
      { video: { 'shot-1-take-1': { throws: 'the clip maker fell over' } } },
      (end: Awaited<ReturnType<typeof ended>>) => end.videoCalls.filter((c) => c === T(1)),
    ],
    [
      'a narration call',
      { narration: { 'shot-1-narration': { throws: 'the voice fell over' } } },
      (end: Awaited<ReturnType<typeof ended>>) => end.narrationCalls.filter((c) => c === N(1)),
    ],
  ] as const) {
    const end = await ended(`r11-throws-${what.split(' ')[1]}`, {
      ...options,
      script: videoScript(THREE_RANKS, THREE_RANKS_PICS, { takes: [t0] }),
    })
    assert.equal(end.ran.result.status, 'failed', `${what}: ${JSON.stringify(end.ran.result)}`)
    assert.match(String(end.ran.result.detail), /fell over/, what)
    assert.equal(calls(end).length, 1, `${what} that throws was sent ${calls(end).length} times`)
  }
})

/** Ports for a stage read directly: a narration that speaks, a probe of 60 seconds, and no model. */
function direct(video: VideoPort, narration: NarrationPort) {
  const recorded: { takes: TakeRecord[]; narrations: NarrationRecord[] } = {
    takes: [],
    narrations: [],
  }
  const never = (what: string) => async () => {
    throw new Error(`${what} was called`)
  }
  const media: MediaPort = {
    ready: async () => {},
    probe: async () => narrationProbe(60),
    scan: never('scan'),
    readText: never('readText'),
    listen: never('listen'),
    frames: never('frames'),
  }
  const model: LanguageModelPort = {
    structured: never('structured'),
    observe: never('observe'),
    compare: never('compare'),
    judgeCut: never('judgeCut'),
  }
  const recorder: ClipsRecorder = {
    take: async (take) => {
      recorded.takes.push(take)
    },
    narration: async (n) => {
      recorded.narrations.push(n)
    },
  }
  return { ports: { video, narration, media, model, recorder }, recorded }
}

/** A narration port that speaks every word of the text, 300 ms each and 200 ms after. */
const speaking: NarrationPort = {
  async speak(request) {
    const words = request.text.split(/\s+/).filter((w) => w !== '')
    return {
      kind: 'made',
      audio: { narrationId: request.narrationId, path: `/nowhere/${request.narrationId}.wav` },
      timings: words.map((word, i) => ({ word, startMs: i * 500, endMs: i * 500 + 300 })),
      receipt: { model: 'm', characters: [...request.text].length, costCents: 0, fake: true },
    }
  },
}

test(`${CHECK_11} — makeClips read directly, handed a port that answers unavailable`, async () => {
  const request = planRequest('r11-direct')
  const input = {
    runId: 'run-11',
    attempt: 1,
    request,
    plan: passingPlan(request),
    stills: [],
    degradedShots: [],
  }
  const settings = { plan: DEFAULT_PLAN_SETTINGS, render: TEST_RENDER_SETTINGS }
  const busy = { kind: 'unavailable', detail: 'the provider is busy' } as const

  // A video port that answers unavailable: the stage fails naming the answer, and counts no take.
  const asked: VideoRequest[] = []
  const clips = direct(
    {
      async generate(r) {
        asked.push(r)
        return busy
      },
    },
    speaking,
  )
  const clipped = await makeClips(input, clips.ports, settings)
  assert.equal(clipped.kind, 'failed', JSON.stringify(clipped))
  assert.match(clipped.kind === 'failed' ? clipped.detail : '', /unavailable/)
  assert.match(clipped.kind === 'failed' ? clipped.detail : '', /the provider is busy/)
  assert.equal(asked.length, 1, 'the stage sent the call again itself')
  assert.deepEqual(clipped.takes, [], 'a take was counted')
  assert.deepEqual(clips.recorded.takes, [], 'a take was recorded')
  assert.deepEqual(
    clipped.narrations.map((n) => n.narrationId),
    ['a1-shot-0-narration'],
  )

  // A narration port that answers unavailable: the same, before any clip is asked for.
  const said: NarrationRequest[] = []
  const unspoken = direct(
    {
      async generate() {
        throw new Error('no clip may be asked for')
      },
    },
    {
      async speak(r) {
        said.push(r)
        return busy
      },
    },
  )
  const voiced = await makeClips(input, unspoken.ports, settings)
  assert.equal(voiced.kind, 'failed', JSON.stringify(voiced))
  assert.match(voiced.kind === 'failed' ? voiced.detail : '', /unavailable/)
  assert.equal(said.length, 1, 'the stage sent the call again itself')
  assert.deepEqual(voiced.narrations, [])
  assert.deepEqual(voiced.takes, [])
  assert.deepEqual(unspoken.recorded, { takes: [], narrations: [] })
})
