import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { test } from 'node:test'
import type { VideoPort } from '@cutroom/contracts'
import { REPO } from './_repo.ts'
import { startEngine, type Engine, type EngineOptions } from './engine/harness.ts'
import { THREE_RANKS, THREE_RANKS_PICS } from './engine/stills.ts'
import {
  described,
  retake,
  takesOf,
  video,
  videoRequest,
  videoScript,
  type Take,
  type Videoed,
} from './engine/video.ts'

// reel-takes, Slice 2 — check 9 (docs/features/reel-takes.md): every take is a paid call through the
// guard, and every send of it (S-095, S-096, S-087, S-035, D-014). Before each send the guard reads
// the chain's spend again, adds the take's requested seconds at the video rate, rounds up, and compares
// that with the per-reel cap the job read, then the caller's ceiling. A retry that would pass either is
// not made, and the run stops for budget — its shot is NOT held to save money (D-014).
//
// Shot 1 of THREE_RANKS has a chosen picture and claims no event, so a hold would cure it (S-090): a
// refused retry that fell through to the ladder would hold it. Nothing is held before Slice 3, so the
// clause that no still_hold row is written is green before Slice 3's code — and fails after it if a
// refused retry held its shot.
//
// The figures, by hand: shot 1's narration is 7 seconds, so its clip asks for 7, which at the default
// video rate of 4 cents a second is 28. Its first take costs 213 and fails Gate 3, so its retry is
// 213 + 28 = 241: one cent over a ceiling — or a cap — of 240. At 212 the retry is exactly 240, and
// made. The plan's estimate is 220, so a ceiling of 240 admits the run.

const takes = takesOf(THREE_RANKS)
const [t0, t1, t2, t3, t4, t5] = takes as [Take, Take, Take, Take, Take, Take]

const T = (unit: number, n = 1) => `a1-shot-${unit}-take-${n}`

/** The pinned BUDGET.md with its per-reel row set to `figure` (D-100: the cap is read from it). */
function budgetWithCap(figure: string): string {
  const real = readFileSync(join(REPO, 'steering-ref', 'steering', 'BUDGET.md'), 'utf8')
  const row = '| Per reel, all-in | **$3.00** |'
  assert.ok(real.includes(row), "the pinned BUDGET.md's per-reel row is not $3.00")
  return real.replace(row, `| Per reel, all-in | **${figure}** |`)
}

/** Shot 1's first take: it costs `cents`, and its sound is speech, so it fails Gate 3. */
const firstTakeCosting = (cents: number): Omit<EngineOptions, 'worker'> => ({
  video: { 'shot-1-take-1': { costCents: cents } },
  media: { 'shot-1-take-1': { speech: true } },
})

interface Ended {
  ran: Videoed
  calls: string[]
  stillHolds: number
  question: string | null
}

/** One video run on an engine of its own, to its end, read before the engine is stopped. */
async function ended(
  requestId: string,
  budgetCents: number,
  options: Omit<EngineOptions, 'worker'>,
  wrapVideo?: (engine: () => Engine) => (video: VideoPort) => VideoPort,
): Promise<Ended> {
  // The wrapper reads the engine only when a call reaches it, once the engine has started.
  const engine: Engine = await startEngine({
    worker: true,
    ...options,
    ...(wrapVideo === undefined ? {} : { wrapVideo: wrapVideo(() => engine) }),
  })
  try {
    const ran = await video(engine, videoRequest(requestId, budgetCents))
    return {
      ran,
      calls: engine.video.calls.map((c) => c.takeId),
      stillHolds:
        engine.query<{ n: number }>(
          'SELECT COUNT(*) AS n FROM still_hold WHERE run_id = ?',
          ran.runId,
        )[0]?.n ?? -1,
      question: existsSync(engine.questionsPath)
        ? readFileSync(engine.questionsPath, 'utf8')
        : null,
    }
  } finally {
    await engine.stop()
  }
}

/** A stop for budget on shot 1's retry: not made, and nothing held. */
function refusedRetry(
  end: Ended,
  requestId: string,
  limit: 'reel' | 'ceiling',
  ceilingCents: number,
  capCents: number,
) {
  const { ran } = end
  assert.deepEqual(ran.result, {
    contractVersion: 1,
    runId: ran.runId,
    requestId,
    costCents: 213,
    status: 'stopped',
    reason: 'budget',
    limit,
    estimateCents: 241,
    ceilingCents,
    capCents,
  })
  // The retry was not made, and neither was anything after it.
  assert.deepEqual(
    ran.takes.map((t) => [t.take_id, t.outcome]),
    [
      [T(0), 'accept'],
      [T(1, 1), 'fail'],
    ],
  )
  assert.deepEqual(
    ran.videoReceipts.map((r) => r.take_id),
    [T(0), T(1, 1)],
  )
  // The shot is not held (D-014): the run stopped, and no still_hold row was written.
  assert.equal(end.stillHolds, 0, 'a refused retry held its shot')
  assert.equal(described(ran.events).at(-1), 'run.finished stopped')
}

const CHECK_9 =
  "9. every take is sent through the guard: a retry on a shot a hold would cure — shot 1 of THREE_RANKS — whose figure would pass the ceiling is not made, and the run stops for budget with that figure, the shot not held and no still-hold row — that clause green before Slice 3's code, since nothing is held until then, and failing after it if a refused retry held its shot; one that would pass the per-reel cap appends one question naming the take by its id; and exactly equal is made"

// ---------------------------------------------------------------- 9

test(`${CHECK_9} — a retry past the ceiling`, async () => {
  const end = await ended('r9-ceiling', 240, {
    ...firstTakeCosting(213),
    script: videoScript(THREE_RANKS, THREE_RANKS_PICS, { takes: [t0, t1] }),
  })
  refusedRetry(end, 'r9-ceiling', 'ceiling', 240, 300)
  assert.deepEqual(end.calls, [T(0), T(1, 1)], 'the refused retry reached the video port')
  assert.equal(end.question, null, 'a stop at the ceiling wrote a question')
})

test(`${CHECK_9} — a retry past the per-reel cap`, async () => {
  const end = await ended('r9-cap', 1000, {
    ...firstTakeCosting(213),
    budgetMd: budgetWithCap('$2.40'),
    script: videoScript(THREE_RANKS, THREE_RANKS_PICS, { takes: [t0, t1] }),
  })
  refusedRetry(end, 'r9-cap', 'reel', 1000, 240)
  assert.deepEqual(end.calls, [T(0), T(1, 1)], 'the refused retry reached the video port')
  // One question, naming the retry by its id.
  const entries = (end.question ?? '').split(/^(?=## )/m).filter((c) => c.startsWith('## '))
  assert.equal(entries.length, 1, `${entries.length} question entries for one stop`)
  const heading = (entries[0] ?? '').split('\n')[0] ?? ''
  assert.match(heading, /clip/, heading)
  assert.ok(heading.includes(T(1, 2)), `the question does not name ${T(1, 2)}: ${heading}`)
})

test(`${CHECK_9} — a retry exactly at the ceiling`, async () => {
  const end = await ended('r9-equal', 240, {
    ...firstTakeCosting(212),
    script: videoScript(THREE_RANKS, THREE_RANKS_PICS, {
      takes: [t0, t1, retake(t1, 2), t2, t3, t4, t5],
    }),
  })
  assert.equal(end.ran.result.status, 'completed', JSON.stringify(end.ran.result))
  assert.equal(end.ran.result.costCents, 212)
  assert.deepEqual(end.calls, [T(0), T(1, 1), T(1, 2), T(2), T(3), T(4), T(5)])
  assert.ok(
    end.ran.videoReceipts.some((r) => r.take_id === T(1, 2)),
    'the retry exactly at the ceiling was not made',
  )
})

test(`${CHECK_9} — every send of a take, not only its first`, async () => {
  // Shot 1's retry is answered unavailable at its first send, and the chain's spend grows by 213
  // before its second — as a provider that billed an unavailable answer would make it grow (the paid
  // path's; here a test writes it). The guard reads the spend again before the second send, and
  // refuses it: 213 + 28 = 241 (S-095, S-096).
  const end = await ended(
    'r9-sends',
    240,
    {
      video: { 'shot-1-take-2': { transient: 1 } },
      media: { 'shot-1-take-1': { speech: true } },
      script: videoScript(THREE_RANKS, THREE_RANKS_PICS, { takes: [t0, t1] }),
    },
    (engine) => (port) => ({
      async generate(request) {
        const answer = await port.generate(request)
        if (answer.kind === 'unavailable') {
          const db = new DatabaseSync(engine().dbPath)
          try {
            db.prepare(
              "UPDATE job SET cost_cents = cost_cents + 213 WHERE kind = 'reel.clips'",
            ).run()
          } finally {
            db.close()
          }
        }
        return answer
      },
    }),
  )
  refusedRetry(end, 'r9-sends', 'ceiling', 240, 300)
  // The retry's first send reached the port, and was answered unavailable; its second did not.
  assert.deepEqual(end.calls, [T(0), T(1, 1), T(1, 2)])
})
