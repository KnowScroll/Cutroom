import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { test } from 'node:test'
import type { MediaPort } from '@cutroom/contracts'
import { startEngine, type Engine, type EngineOptions } from './engine/harness.ts'
import { THREE_RANKS, THREE_RANKS_PICS } from './engine/stills.ts'
import {
  described,
  retake,
  takesOf,
  turned,
  video,
  videoRequest,
  videoScript,
  type Take,
  type Videoed,
} from './engine/video.ts'

// reel-takes, Slice 3 — check 13 (docs/features/reel-takes.md): the hold at the cap (S-090, S-097,
// D-025, D-055, I-12, I-17, S-046). A shot with a chosen picture that claims no event mustShow is
// HELD on its picture when its third decided take fails — whatever Gate 2, 3 or 5 its takes failed
// on, since that picture passed Gate 1 against everything they were held to but motion — and the
// clips stage GOES ON to the next shot, completes, and hands the run to its reel.assemble row. No
// later take of the held shot is made.
//
// The picture is probed by the media port when the ladder holds the shot (D-055): the conform's only
// source for its geometry. A probe that throws fails the run with the throw's message, as any thrown
// call does (S-046); a picture that does not probe as a readable picture fails it, naming the picture
// — it passed Gate 1, so its file changed since. Neither writes a still_hold row, and the clips job
// makes no reel.assemble row.
//
// The holdable shots of THREE_RANKS are shot 1 — the barons, on its chosen picture, claiming the
// presence mustShow show-crowd — and shot 2 — the seal and the hall, on its chosen picture, claiming
// nothing. The model stand-in answers in call order, so each script lists every take the run makes,
// retakes included, and leaves out a take that fails Gate 2, which makes no model call.
//
// Neither the probe's throw nor the replaced picture is green before this slice's code: Slice 2's
// stand-in fails a held shot's run with another detail and makes no probe. What the assemble job then
// does with a held shot is Slice 4's, and no clause here reads it.

const takes = takesOf(THREE_RANKS)
const [t0, t1, t2, t3, t4, t5] = takes as [Take, Take, Take, Take, Take, Take]

const T = (unit: number, n = 1) => `a1-shot-${unit}-take-${n}`
const N = (unit: number) => `a1-shot-${unit}-narration`
/** Shot `unit`'s chosen picture in THREE_RANKS: its one derived picture. */
const PIC = (unit: number) => `a1-shot-${unit}-single`

interface Ended {
  ran: Videoed
  videoCalls: string[]
  narrationCalls: string[]
  /** Every call the media port received, in order, as its method and the id it was about. */
  media: string[]
  /** The ids the media port probed, in order. */
  probed: string[]
}

/** One video run on an engine of its own, to its end, read before the engine is stopped. */
async function ended(
  requestId: string,
  options: Omit<EngineOptions, 'worker'>,
  wrapMedia?: (engine: () => Engine) => (media: MediaPort) => MediaPort,
): Promise<Ended> {
  // The wrapper reads the engine only when a call reaches it, once the engine has started.
  const engine: Engine = await startEngine({
    worker: true,
    ...options,
    ...(wrapMedia === undefined ? {} : { wrapMedia: wrapMedia(() => engine) }),
  })
  try {
    const ran = await video(engine, videoRequest(requestId))
    return {
      ran,
      videoCalls: engine.video.calls.map((c) => c.takeId),
      narrationCalls: engine.narration.calls.map((c) => c.narrationId),
      media: engine.media.calls.map((c) => `${c.method} ${c.id}`),
      probed: engine.media.calls.filter((c) => c.method === 'probe').map((c) => c.id),
    }
  } finally {
    await engine.stop()
  }
}

const job = (ran: Videoed, kind: string) => ran.jobs.find((j) => j.kind === kind)

/**
 * Shot `unit` held at its cap: its three takes made and failed, each with the verdicts `gates`
 * reached; its picture probed once, after its third take; and the stage gone on to every later shot,
 * each accepted on its first take, and completed — the clips job done and a reel.assemble row after it.
 */
function heldAndWentOn(end: Ended, unit: number, gates: string[], what: string) {
  const { ran } = end
  const three = [1, 2, 3].map((n) => T(unit, n))

  // Its three takes, all failed, each reaching the gates its failure let it reach.
  for (const takeId of three) {
    const row = ran.takes.find((t) => t.take_id === takeId)
    assert.ok(row !== undefined, `${what}: no row for ${takeId}`)
    assert.equal(row.outcome, 'fail', `${what}: ${takeId}`)
    assert.deepEqual(
      row.verdicts.map((v) => `${v.gate} ${v.outcome}`),
      gates,
      `${what}: ${takeId}'s verdicts`,
    )
  }

  // No later take of it: every video call, in order, is each shot's first take but the held shot's
  // three, and every shot after it was made and accepted.
  const expected = [0, 1, 2, 3, 4, 5].flatMap((u) => (u === unit ? three : [T(u)]))
  assert.deepEqual(end.videoCalls, expected, `${what}: the video calls`)
  assert.deepEqual(
    ran.takes.map((t) => [t.take_id, t.outcome]),
    expected.map((id) => [id, three.includes(id) ? 'fail' : 'accept']),
    `${what}: the take rows`,
  )
  assert.deepEqual(end.narrationCalls, [0, 1, 2, 3, 4, 5].map(N), `${what}: the narration calls`)

  // Its picture, probed by the media port once, when the ladder held the shot: after every measure
  // of its third take, and before the next shot's narration is measured.
  assert.deepEqual(
    end.probed.filter((id) => id === PIC(unit)),
    [PIC(unit)],
    `${what}: the held picture's probes`,
  )
  const at = end.media.indexOf(`probe ${PIC(unit)}`)
  const last = end.media.findLastIndex((call) => call.endsWith(` ${three[2]}`))
  assert.equal(last, at - 1, `${what}: the probe is not after the third take: ${end.media}`)
  assert.equal(end.media[at + 1], `probe ${N(unit + 1)}`, `${what}: ${end.media}`)

  // The clips stage completed: its job done, and the chain's reel.assemble row after it.
  const clips = job(ran, 'reel.clips')
  assert.ok(clips !== undefined, `${what}: no reel.clips row`)
  assert.equal(clips.state, 'done', `${what}: the clips job`)
  const assemble = job(ran, 'reel.assemble')
  assert.ok(
    assemble !== undefined,
    `${what}: the clips stage did not complete: ${JSON.stringify(ran.result)}`,
  )
  assert.equal(assemble.parent_id, clips.id, `${what}: the reel.assemble row's parent`)
}

/** A held shot's run failed in its clips job: no still_hold row, and no label anywhere. */
function failedInTheClipsJob(end: Ended, unit: number, what: string) {
  const { ran } = end
  assert.equal(ran.result.status, 'failed', `${what}: ${JSON.stringify(ran.result)}`)
  assert.deepEqual(
    ran.jobs.map((j) => j.kind),
    ['reel.plan', 'reel.keyframes', 'reel.clips'],
    `${what}: a reel.assemble row`,
  )
  assert.deepEqual(ran.stillHolds, [], `${what}: a still_hold row`)
  assert.ok(!ran.events.some((e) => e.type === 'degraded'), `${what}: a degraded event`)
  assert.ok(
    ran.takes.every((t) => t.degradation === null),
    `${what}: a take carries a label`,
  )
  assert.ok(
    ran.videoReceipts.every((r) => !r.degraded),
    `${what}: a receipt is marked`,
  )
  assert.equal(described(ran.events).at(-1), 'run.finished failed', what)
  // Nothing after the held shot's third take.
  assert.deepEqual(
    end.videoCalls.slice(-3),
    [1, 2, 3].map((n) => T(unit, n)),
    `${what}: a later clip`,
  )
  assert.equal(end.narrationCalls.at(-1), N(unit), `${what}: a later shot's narration`)
}

const CHECK_13 =
  "13. at the cap, a shot with a chosen picture that claims no event mustShow is held — its three takes failing Gate 2, Gate 3 or Gate 5, each built — and the clips stage goes on to the next shot and completes, with a reel.assemble row; the held shot's takes all fail and no later take of it is made; and, each built alone, a held shot whose picture's probe is scripted to throw, and one whose picture's file is replaced with other bytes before its third take is decided, finish the run failed in the clips job — no reel.assemble row and no still_hold row — the first with the throw's message as its detail and the second with a detail naming the picture and saying it did not probe as a readable picture — neither green before this slice's code, whose Slice 2 stand-in fails a held shot's run with another detail and makes no probe"

/** Shot 1's three takes, each carrying speech: each fails Gate 3, and Gates 4 and 5 still run. */
const SHOT_1_SPEAKS = {
  'shot-1-take-1': { speech: true },
  'shot-1-take-2': { speech: true },
  'shot-1-take-3': { speech: true },
}

// ---------------------------------------------------------------- 13

test(`${CHECK_13} — three takes failing Gate 2`, async () => {
  // Shot 1's three takes are black from their first frame: each fails Gate 2, and makes no model call.
  const end = await ended('r13-gate2', {
    video: {
      'shot-1-take-1': { black: 'whole' },
      'shot-1-take-2': { black: 'whole' },
      'shot-1-take-3': { black: 'whole' },
    },
    script: videoScript(THREE_RANKS, THREE_RANKS_PICS, { takes: [t0, t2, t3, t4, t5] }),
  })
  heldAndWentOn(end, 1, ['2 fail'], 'Gate 2')
})

test(`${CHECK_13} — three takes failing Gate 3`, async () => {
  // Shot 2 — the seal and the hall, on its chosen picture, claiming nothing — speaks on each take.
  const end = await ended('r13-gate3', {
    media: {
      'shot-2-take-1': { speech: true },
      'shot-2-take-2': { speech: true },
      'shot-2-take-3': { speech: true },
    },
    script: videoScript(THREE_RANKS, THREE_RANKS_PICS, {
      takes: [t0, t1, t2, retake(t2, 2), retake(t2, 3), t3, t4, t5],
    }),
  })
  heldAndWentOn(end, 2, ['2 accept', '3 fail', '4 accept', '5 accept'], 'Gate 3')
})

test(`${CHECK_13} — three takes failing Gate 5`, async () => {
  // Shot 1 claims show-crowd, a presence its picture was checked for at Gate 1; none of its three
  // clips shows it.
  const crowd = turned(t1, 'show-crowd')
  const end = await ended('r13-gate5', {
    script: videoScript(THREE_RANKS, THREE_RANKS_PICS, {
      takes: [t0, t1, retake(t1, 2), retake(t1, 3), t2, t3, t4, t5],
      reconciler: { 'shot-1-take-1': crowd, 'shot-1-take-2': crowd, 'shot-1-take-3': crowd },
    }),
  })
  heldAndWentOn(end, 1, ['2 accept', '3 accept', '4 accept', '5 fail'], 'Gate 5')
})

test(`${CHECK_13} — a held shot whose picture's probe throws`, async () => {
  const thrown = 'ffprobe could not be started for the held picture'
  const end = await ended('r13-probe-throws', {
    media: { ...SHOT_1_SPEAKS, 'shot-1-single': { throws: { probe: thrown } } },
    script: videoScript(THREE_RANKS, THREE_RANKS_PICS, {
      takes: [t0, t1, retake(t1, 2), retake(t1, 3)],
    }),
  })
  failedInTheClipsJob(end, 1, 'the probe throws')
  assert.equal(end.ran.result.detail, thrown, "the detail is not the throw's message")
  assert.deepEqual(
    end.probed.filter((id) => id === PIC(1)),
    [PIC(1)],
    'the held picture was not probed once',
  )
})

test(`${CHECK_13} — a held shot whose picture's file is replaced with other bytes`, async () => {
  // While shot 1's third take is measured — made, and not yet decided — its chosen picture's file is
  // replaced with bytes that are no picture. ffprobe answers such a file named .png with a video
  // stream of 0 × 0 and no frame, and no error.
  const other = 'these are not the bytes of a picture\n'
  let replaced: string | null = null
  let readBack: string | null = null
  const end = await ended(
    'r13-replaced',
    {
      media: SHOT_1_SPEAKS,
      script: videoScript(THREE_RANKS, THREE_RANKS_PICS, {
        takes: [t0, t1, retake(t1, 2), retake(t1, 3)],
      }),
    },
    (engine) => (media) => ({
      ready: () => media.ready(),
      probe: (file) => media.probe(file),
      async scan(clip, shortest) {
        if (clip.takeId === T(1, 3)) {
          const [row] = engine().query<{ path: string }>(
            'SELECT path FROM picture WHERE picture_id = ?',
            PIC(1),
          )
          assert.ok(row !== undefined, `no row for ${PIC(1)}`)
          writeFileSync(row.path, other)
          replaced = row.path
          readBack = readFileSync(row.path, 'utf8')
        }
        return media.scan(clip, shortest)
      },
      readText: (clip) => media.readText(clip),
      listen: (clip) => media.listen(clip),
      frames: (file, at) => media.frames(file, at),
    }),
  )
  assert.ok(replaced !== null, "the third take's measure was never reached")
  assert.equal(readBack, other, 'the picture was not replaced with those bytes')
  failedInTheClipsJob(end, 1, 'the picture replaced')
  const detail = String(end.ran.result.detail)
  assert.ok(detail.includes(PIC(1)), `the detail does not name the picture: ${detail}`)
  assert.match(detail, /did not probe as a readable picture/, detail)
})
