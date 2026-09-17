import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { requestedSeconds } from '@cutroom/pipeline'
import { TEST_RENDER_SETTINGS, startEngine, type Engine } from './engine/harness.ts'
import { NO_RECURRENCE } from './engine/stills.ts'
import {
  UNIT_SENTENCES,
  UNIT_WORDS,
  video,
  videoRequest,
  videoScript,
  type NarrationRow,
  type Videoed,
} from './engine/video.ts'

// reel-render, Slice 3 — checks 13, 14 and 16 (docs/features/reel-render.md): narration (S-070). One
// call a shot, in plan order, just before that shot's clip; its text the unit's sentences joined by
// one space; its audio a real file, MEASURED, so its duration is the file's (I-17); its word timings
// typed unknown at the port and parsed at the stage's boundary, a malformed answer failing the run
// (S-042's form); and the clip's requested seconds taken from the measured narration (D-019, D-057).

/** A WAV's duration read from its own header: the data chunk's bytes over the bytes a second. */
function wavSeconds(path: string): number {
  const bytes = readFileSync(path)
  assert.equal(bytes.toString('latin1', 0, 4), 'RIFF', `${path} is not a RIFF file`)
  assert.equal(bytes.toString('latin1', 8, 12), 'WAVE', `${path} is not a WAVE file`)
  let at = 12
  let byteRate = 0
  while (at + 8 <= bytes.length) {
    const id = bytes.toString('latin1', at, at + 4)
    const size = bytes.readUInt32LE(at + 4)
    if (id === 'fmt ') byteRate = bytes.readUInt32LE(at + 16)
    if (id === 'data') {
      assert.ok(byteRate > 0, `${path} has no format chunk before its data`)
      return size / byteRate
    }
    at += 8 + size + (size % 2)
  }
  throw new Error(`${path} has no data chunk`)
}

const clipsCompleted = (ran: Videoed) =>
  assert.ok(
    ran.jobs.some((j) => j.kind === 'reel.assemble'),
    `the clips stage did not complete: ${JSON.stringify(ran.result)}`,
  )

// ---------------------------------------------------------------- 13

test("13. every shot gets one narration call in each attempt, in plan order and before its own clip, whose text is its unit's sentences joined by one space; its audio is a readable file under the artifact root at the path its row records; its measured duration is the file's; and its word timings are every word of the text, in order, within it", async () => {
  const order: string[] = []
  // Shot 1's stand-in reports timings far shorter than its file, so a duration taken from the
  // timings rather than measured from the file is seen; and shot 2's words are longer than the rest.
  const shortTimings = UNIT_SENTENCES[1]
    ?.join(' ')
    .split(' ')
    .map((word, i) => ({ word, startMs: i * 100, endMs: i * 100 + 60 }))
  const engine = await startEngine({
    worker: true,
    script: videoScript(NO_RECURRENCE, []),
    narration: {
      'shot-1-narration': { timings: shortTimings },
      'shot-2-narration': { wordMs: 700, gapMs: 100 },
    },
    wrapNarration: (narration) => ({
      async speak(request) {
        order.push(`narration ${request.narrationId}`)
        return narration.speak(request)
      },
    }),
    wrapVideo: (port) => ({
      async generate(request) {
        order.push(`clip ${request.takeId}`)
        return port.generate(request)
      },
    }),
  })
  try {
    const ran = await video(engine, videoRequest('r13'))
    clipsCompleted(ran)

    // One call a shot, in plan order, each immediately before its own clip (S-070).
    assert.deepEqual(
      order,
      [0, 1, 2, 3, 4, 5].flatMap((u) => [
        `narration a1-shot-${u}-narration`,
        `clip a1-shot-${u}-take-1`,
      ]),
    )

    // Its text is its unit's sentences, in order, joined by one space; its voice the setting.
    assert.deepEqual(
      engine.narration.calls.map((c) => ({ ...c })),
      UNIT_SENTENCES.map((sentences, u) => ({
        runId: ran.runId,
        narrationId: `a1-shot-${u}-narration`,
        text: sentences.join(' '),
        voice: TEST_RENDER_SETTINGS.voice,
      })),
    )

    assert.equal(ran.narrations.length, 6)
    ran.narrations.forEach((row: NarrationRow, u) => {
      const text = (UNIT_SENTENCES[u] ?? []).join(' ')
      assert.equal(row.narration_id, `a1-shot-${u}-narration`)
      assert.equal(row.attempt, 1)
      assert.equal(row.shot_unit, u)
      assert.equal(row.text, text, `${row.narration_id}'s row holds other text`)

      // A readable file under the artifact root, at the path its row records.
      assert.equal(row.path, join(engine.artifactRoot, ran.runId, `${row.narration_id}.wav`))
      assert.ok(existsSync(row.path), `${row.narration_id} has no file at ${row.path}`)
      const seconds = wavSeconds(row.path)
      const expected = (UNIT_WORDS[u] ?? 0) * (u === 2 ? 0.8 : 0.5)
      assert.ok(Math.abs(seconds - expected) < 1e-9, `${row.narration_id}'s file is ${seconds} s`)

      // Its measured duration is the file's (I-17).
      assert.equal(row.probe?.readable, true, `${row.narration_id} was not measured readable`)
      assert.ok(
        Math.abs((row.probe?.durationSeconds ?? -1) - seconds) < 0.001,
        `${row.narration_id} was measured at ${row.probe?.durationSeconds} s, and its file is ${seconds} s`,
      )

      // Every word of the text, in order, each ending after it starts, none overlapping the next,
      // within the measured duration.
      const words = row.words ?? []
      assert.deepEqual(
        words.map((w) => w.word),
        text.split(/\s+/),
        `${row.narration_id}'s timings are not the words of its text`,
      )
      words.forEach((w, i) => {
        assert.ok(w.endMs > w.startMs, `${row.narration_id}: word ${i} ends before it starts`)
        const next = words[i + 1]
        if (next !== undefined) {
          assert.ok(next.startMs >= w.endMs, `${row.narration_id}: word ${i} overlaps the next`)
        }
      })
      assert.ok(
        (words.at(-1)?.endMs ?? Infinity) <= seconds * 1000,
        `${row.narration_id}'s last word ends after its audio`,
      )
    })
  } finally {
    await engine.stop()
  }
})

// ---------------------------------------------------------------- 14

/** Unit 0's words — 18 of them — at 200 ms each with a 50 ms gap: well inside its 9-second file. */
function wordsOfUnit0() {
  return (UNIT_SENTENCES[0] ?? []).join(' ').split(' ')
}
const timed = (words: readonly string[]) =>
  words.map((word, i) => ({ word, startMs: i * 250, endMs: i * 250 + 200 }))

const FAULTS: ReadonlyArray<readonly [string, () => unknown]> = [
  [
    'a word left out',
    () => {
      const words = wordsOfUnit0()
      return timed([...words.slice(0, 3), ...words.slice(4)])
    },
  ],
  [
    'a word repeated',
    () => {
      const words = wordsOfUnit0()
      return timed([...words.slice(0, 4), ...words.slice(3)])
    },
  ],
  [
    'two words reordered',
    () => {
      const words = wordsOfUnit0()
      return timed([
        ...words.slice(0, 3),
        words[4] as string,
        words[3] as string,
        ...words.slice(5),
      ])
    },
  ],
  [
    'two words overlapping',
    () => {
      const timings = timed(wordsOfUnit0())
      const third = timings[3] as { endMs: number }
      third.endMs = (timings[4] as { startMs: number }).startMs + 100
      return timings
    },
  ],
  [
    'the last word ending after the measured duration',
    () => {
      // The file is 9 seconds: 18 words of 300 ms and 200 ms gaps.
      const timings = timed(wordsOfUnit0())
      const last = timings.at(-1) as { startMs: number; endMs: number }
      last.startMs = 8_800
      last.endMs = 9_001
      return timings
    },
  ],
]

test("14. a narration answer whose timings leave a word out, repeat one, reorder two, overlap, or end after the measured duration finishes the run failed with a detail, each built alone, the narration's row kept", async () => {
  // The same timings, well formed, parse: so each fault below fails for its fault alone.
  const control = await startEngine({
    worker: true,
    script: videoScript(NO_RECURRENCE, []),
    narration: { 'shot-0-narration': { timings: timed(wordsOfUnit0()) } },
  })
  try {
    const ran = await video(control, videoRequest('r14-control'))
    clipsCompleted(ran)
    assert.deepEqual(ran.narrations[0]?.words, timed(wordsOfUnit0()))
  } finally {
    await control.stop()
  }

  for (const [fault, timings] of FAULTS) {
    const engine: Engine = await startEngine({
      worker: true,
      script: videoScript(NO_RECURRENCE, []),
      narration: { 'shot-0-narration': { timings: timings() } },
    })
    try {
      const ran = await video(engine, videoRequest('r14'))
      assert.equal(ran.result.status, 'failed', `${fault}: ${JSON.stringify(ran.result)}`)
      assert.ok(String(ran.result.detail ?? '').length > 0, `${fault}: the failure has no detail`)

      // The narration's row is kept, measured, with no timings; nothing after it was made.
      assert.equal(ran.narrations.length, 1, `${fault}: the run holds no narration row`)
      const row = ran.narrations[0] as NarrationRow
      assert.equal(row.narration_id, 'a1-shot-0-narration')
      assert.equal(row.probe?.readable, true, `${fault}: the narration was not measured`)
      assert.equal(row.words, null, `${fault}: timings that do not parse were recorded`)
      assert.equal(engine.video.calls.length, 0, `${fault}: a clip was made`)
      assert.equal(ran.takes.length, 0, `${fault}: a take was recorded`)
    } finally {
      await engine.stop()
    }
  }
})

// ---------------------------------------------------------------- 16

test("16. each clip's requested duration is its narration's measured seconds rounded up, at least 5 and at most 15: narrations of 3.2, 7.4 and 16.1 seconds ask for 5, 8 and 15", async () => {
  // The rule alone, including the edges: a whole second is not rounded up again.
  const rule: ReadonlyArray<readonly [number, number]> = [
    [3.2, 5],
    [7.4, 8],
    [16.1, 15],
    [0, 5],
    [4.0001, 5],
    [5, 5],
    [5.0001, 6],
    [7, 7],
    [14.5, 15],
    [15, 15],
  ]
  for (const [measured, asked] of rule) {
    assert.equal(requestedSeconds(measured), asked, `${measured} s asks for ${asked}`)
  }

  // And in a run, from files of those lengths: unit 1's 14 words at 1150 ms each, unit 4's 4 at
  // 800 ms and unit 5's 10 at 740 ms. Units 0, 2 and 3 keep 500 ms a word: 9, 3 and 3 seconds.
  const engine = await startEngine({
    worker: true,
    script: videoScript(NO_RECURRENCE, []),
    narration: {
      'shot-1-narration': { wordMs: 900, gapMs: 250 },
      'shot-4-narration': { wordMs: 500, gapMs: 300 },
      'shot-5-narration': { wordMs: 500, gapMs: 240 },
    },
  })
  try {
    const ran = await video(engine, videoRequest('r16'))
    clipsCompleted(ran)
    const measured = ran.narrations.map((n) => Number(n.probe?.durationSeconds.toFixed(3)))
    assert.deepEqual(measured, [9, 16.1, 3, 3, 3.2, 7.4])
    assert.deepEqual(
      engine.video.calls.map((c) => c.durationSeconds),
      [9, 15, 5, 5, 5, 8],
    )
    assert.deepEqual(
      ran.takes.map((t) => t.requested_seconds),
      [9, 15, 5, 5, 5, 8],
    )
  } finally {
    await engine.stop()
  }
})
