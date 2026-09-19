import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { ClipObservation, VideoRequest } from '@cutroom/contracts'
import { takeReconcilePrompt, validateVideoRequest } from '@cutroom/pipeline'
import type { Criterion } from '@cutroom/reel-contract'
import { startEngine, type Engine, type EngineOptions } from './engine/harness.ts'
import { THREE_RANKS, THREE_RANKS_PICS } from './engine/stills.ts'
import {
  retake,
  seenClip,
  takesOf,
  turned,
  video,
  videoRequest,
  videoScript,
  type Take,
  type Videoed,
} from './engine/video.ts'

// reel-takes, Slice 2 — checks 6 and 7 (docs/features/reel-takes.md): what a retry is told, and what
// the gates of every take are never told (S-094, D-033, D-047, D-072, I-8, I-15).
//
// A retry's prompt is its shot's first take's prompt with, before the negative audio block, a line
// saying the takes before it failed their checks and every earlier failed take's reasons, under the
// take and then its gates. The block stays last, so every retry passes the validator (S-071). It is
// never shown a failed take's clip, path, observation or expanded prompt. And the witness and the
// reconciler of every take are handed that take's own clip, observation and brief — nothing of a
// take before it.
//
// The failed takes' witnesses and expansions say things nothing else in a run says, each beginning
// MARK-, so a prompt holding one holds that failed take's observation or expanded prompt.

const takes = takesOf(THREE_RANKS)
const [t0, t1, t2, t3, t4, t5] = takes as [Take, Take, Take, Take, Take, Take]

const T = (unit: number, n = 1) => `a1-shot-${unit}-take-${n}`

/** D-008's negative audio block, typed by hand. */
const BLOCK = 'No dialogue, no speech, no music.\nnon_diegetic_music: N/A'

/** A witness's account of a failed take that no other take's matches. */
const marked = (take: Take, which: string): ClipObservation =>
  seenClip(take, (i) => (i === 0 ? { label: `MARK-SEEN-IN-${which}` } : {}), {
    setting: `MARK-SETTING-OF-${which}`,
  })

/** One video run of THREE_RANKS on an engine of its own, to its end. */
async function ended(
  requestId: string,
  options: Omit<EngineOptions, 'worker'>,
): Promise<{ ran: Videoed; engine: Engine }> {
  const engine = await startEngine({ worker: true, ...options })
  try {
    return { ran: await video(engine, videoRequest(requestId)), engine }
  } finally {
    await engine.stop()
  }
}

/**
 * What a retry's prompt holds that its first take's does not: the lines between the first take's
 * prompt, less its block, and the block, which must end it.
 */
function inserted(first: string, retry: string, what: string): string[] {
  assert.ok(first.endsWith(BLOCK), `the first take's prompt does not end with the block:\n${first}`)
  const head = first.slice(0, first.length - BLOCK.length)
  assert.ok(retry.endsWith(BLOCK), `${what} does not end with the negative audio block:\n${retry}`)
  assert.ok(retry.startsWith(head), `${what} is not the first take's prompt:\n${retry}`)
  return retry.slice(head.length, retry.length - BLOCK.length).split('\n')
}

/** Nothing of a failed take but its reasons reaches any prompt of the run. */
function toldNothingElse(ran: Videoed, calls: readonly VideoRequest[], failed: readonly string[]) {
  for (const call of calls) {
    assert.ok(
      !call.prompt.includes('MARK-'),
      `${call.takeId}'s prompt holds a failed take's own words`,
    )
    for (const takeId of failed) {
      const row = ran.takes.find((t) => t.take_id === takeId)
      assert.ok(row !== undefined, `no row for ${takeId}`)
      assert.ok(!call.prompt.includes(row.path), `${call.takeId}'s prompt holds ${takeId}'s path`)
      assert.ok(
        !call.prompt.includes(row.expanded_prompt),
        `${call.takeId}'s prompt holds ${takeId}'s expanded prompt`,
      )
      assert.ok(!call.prompt.includes(takeId), `${call.takeId}'s prompt names ${takeId}`)
    }
  }
}

const CHECK_6 =
  "6. a retry's prompt is the first take's prompt with every earlier failed take's reasons inserted before the negative audio block, each under its take and its gates — so take 2's prompt differs from take 1's whenever take 1 failed, and take 3's from take 2's even when take 2 failed for take 1's reasons; every retry prompt ends with the negative audio block and passes the validator; and no prompt holds a failed take's path, observation or expanded prompt"

// ---------------------------------------------------------------- 6

test(`${CHECK_6} — two takes failing alike, on shot 3`, async () => {
  // Shot 3's first two clips both carry speech: they fail Gate 3 for the same reason, and its third is
  // accepted.
  const { ran, engine } = await ended('r6-alike', {
    media: { 'shot-3-take-1': { speech: true }, 'shot-3-take-2': { speech: true } },
    video: {
      'shot-3-take-1': { expandedPrompt: 'MARK-EXPANDED-TAKE-ONE' },
      'shot-3-take-2': { expandedPrompt: 'MARK-EXPANDED-TAKE-TWO' },
    },
    script: videoScript(THREE_RANKS, THREE_RANKS_PICS, {
      takes: [t0, t1, t2, t3, retake(t3, 2), retake(t3, 3), t4, t5],
      witness: {
        'shot-3-take-1': marked(t3, 'TAKE-ONE'),
        'shot-3-take-2': marked(t3, 'TAKE-TWO'),
      },
    }),
  })
  assert.equal(ran.result.status, 'completed', JSON.stringify(ran.result))
  const calls = engine.video.calls
  assert.deepEqual(
    calls.slice(3, 6).map((c) => c.takeId),
    [T(3, 1), T(3, 2), T(3, 3)],
  )
  const [p1, p2, p3] = calls.slice(3, 6).map((c) => c.prompt) as [string, string, string]

  const speech = '- its sound is classified as speech'
  const second = inserted(p1, p2, "take 2's prompt")
  assert.equal(second[0], '', 'the reasons are not set off by a blank line')
  const intro = second[1] ?? ''
  assert.match(
    intro,
    /failed/i,
    `the line before the reasons does not say the takes failed: ${intro}`,
  )
  assert.deepEqual(second, ['', intro, 'Take 1:', 'Gate 3:', speech, ''])
  // Take 3 is told take 1's reasons AND take 2's — the same reasons, under each take.
  assert.deepEqual(inserted(p1, p3, "take 3's prompt"), [
    '',
    intro,
    'Take 1:',
    'Gate 3:',
    speech,
    'Take 2:',
    'Gate 3:',
    speech,
    '',
  ])
  assert.notEqual(p2, p1)
  assert.notEqual(p3, p2, "take 3's prompt is take 2's, though take 2 failed for take 1's reasons")

  for (const call of calls) {
    assert.ok(call.prompt.endsWith(BLOCK), `${call.takeId}'s prompt does not end with the block`)
    assert.deepEqual(validateVideoRequest(call), [], `${call.takeId} would be refused`)
  }
  toldNothingElse(ran, calls, [T(3, 1), T(3, 2)])
})

test(`${CHECK_6} — takes failing different gates, on shot 0`, async () => {
  // Shot 0's first clip is black: Gate 2. Its second carries music and shows a modern flag: Gates 3
  // and 5. Its third is accepted. A take failing Gate 2 makes no model call, so the script answers
  // from shot 0's second take on.
  const { ran, engine } = await ended('r6-gates', {
    video: {
      'shot-0-take-1': { black: 'whole', expandedPrompt: 'MARK-EXPANDED-TAKE-ONE' },
      'shot-0-take-2': { expandedPrompt: 'MARK-EXPANDED-TAKE-TWO' },
    },
    media: { 'shot-0-take-2': { music: true } },
    script: videoScript(THREE_RANKS, THREE_RANKS_PICS, {
      takes: [retake(t0, 2), retake(t0, 3), t1, t2, t3, t4, t5],
      witness: { 'shot-0-take-2': marked(t0, 'TAKE-TWO') },
      reconciler: { 'shot-0-take-2': turned(t0, 'never-flag') },
    }),
  })
  assert.equal(ran.result.status, 'completed', JSON.stringify(ran.result))
  const calls = engine.video.calls
  const [p1, p2, p3] = calls.slice(0, 3).map((c) => c.prompt) as [string, string, string]
  assert.deepEqual(
    calls.slice(0, 3).map((c) => c.takeId),
    [T(0, 1), T(0, 2), T(0, 3)],
  )

  // Gate 2's reasons are what it measured, as its verdict recorded them.
  const black = ran.takes.find((t) => t.take_id === T(0, 1))?.verdicts[0]
  assert.ok(black !== undefined, 'shot 0 has no first take with a verdict')
  assert.equal(black.gate, '2')
  assert.equal(black.outcome, 'fail')
  assert.ok(
    black.reasons.some((r) => /black/.test(r)),
    black.reasons.join(' | '),
  )
  const gate2 = black.reasons.map((r) => `- ${r}`)

  const second = inserted(p1, p2, "take 2's prompt")
  const intro = second[1] ?? ''
  assert.deepEqual(second, ['', intro, 'Take 1:', 'Gate 2:', ...gate2, ''])
  assert.deepEqual(inserted(p1, p3, "take 3's prompt"), [
    '',
    intro,
    'Take 1:',
    'Gate 2:',
    ...gate2,
    'Take 2:',
    'Gate 3:',
    '- its sound is classified as music',
    'Gate 5:',
    '- must never show "never-flag" is shown: a modern flag',
    '',
  ])
  for (const call of calls) assert.deepEqual(validateVideoRequest(call), [], call.takeId)
  toldNothingElse(ran, calls, [T(0, 1), T(0, 2)])
})

// ---------------------------------------------------------------- 7

const CHECK_7 =
  "7. every take's observe call holds its clip and a temperature and nothing else, and its reconcile prompt is the one takeReconcilePrompt makes of its own observation and its shot's brief — no earlier take's reason, observation or id reaches Gate 4 or 5; and each take has one witness and one reconciler receipt, its takeIds its own"

test(CHECK_7, async () => {
  // Shot 1's first take is seen in words no other take's witness uses, and fails Gate 5; its second is
  // accepted. Gate 4 is handed a take's own clip and Gate 5 its own observation and brief by
  // construction (S-072), so this is green once retries exist; the breaks recorded with the slice show
  // it can fail.
  const failing = turned(t1, 'never-person')
  const engine = await startEngine({
    worker: true,
    script: videoScript(THREE_RANKS, THREE_RANKS_PICS, {
      takes: [t0, t1, retake(t1, 2), t2, t3, t4, t5],
      witness: { 'shot-1-take-1': marked(t1, 'TAKE-ONE') },
      reconciler: { 'shot-1-take-1': failing },
    }),
  })
  try {
    const ran = await video(engine, videoRequest('r7'))
    assert.equal(ran.result.status, 'completed', JSON.stringify(ran.result))
    const made = [T(0), T(1, 1), T(1, 2), T(2), T(3), T(4), T(5)]
    assert.deepEqual(
      ran.takes.map((t) => t.take_id),
      made,
    )
    const reason = 'must never show "never-person" is shown: any real living person'
    assert.deepEqual(ran.takes[1]?.verdicts[3]?.reasons, [reason])

    // Gate 4: each take's clip, its own, and a temperature — nothing else.
    assert.deepEqual(
      engine.model.observeClipCalls.map((c) => c.clip.takeId),
      made,
    )
    for (const call of engine.model.observeClipCalls) {
      assert.deepEqual(Object.keys(call).sort(), ['clip', 'temperature'], JSON.stringify(call))
      assert.deepEqual(Object.keys(call.clip).sort(), ['path', 'takeId'], JSON.stringify(call))
      assert.equal(call.temperature, 0)
      assert.equal(call.clip.path, ran.takes.find((t) => t.take_id === call.clip.takeId)?.path)
    }

    // Gate 5: the prompt takeReconcilePrompt makes of the take's own observation and its shot's brief.
    const { criteria } = videoRequest('r7')
    const byId = (ids: readonly string[]): Criterion[] =>
      ids.map((id) => {
        const found = [...criteria.mustShow, ...criteria.mustNotShow].find((c) => c.id === id)
        assert.ok(found !== undefined, id)
        return found
      })
    const scripted = [t0, t1, retake(t1, 2), t2, t3, t4, t5]
    scripted.forEach((take, i) => {
      const takeId = made[i] as string
      const calls = engine.model.calls.filter(
        (c) => c.role === 'reconciler' && c.takeIds?.includes(takeId),
      )
      assert.equal(calls.length, 1, `${takeId} has ${calls.length} reconcile calls`)
      const observed = i === 1 ? marked(t1, 'TAKE-ONE') : seenClip(take)
      assert.equal(
        calls[0]?.prompt,
        takeReconcilePrompt(observed, take.subjects, {
          mustShow: byId(take.mustShow),
          mustNotShow: byId(take.mustNotShow),
          unclaimed: byId(take.unclaimed),
        }),
        `${takeId}'s reconcile prompt is not made of its own observation and brief`,
      )
    })

    // Nothing of shot 1's first take reaches its second's gates.
    const retried = engine.model.calls.find(
      (c) => c.role === 'reconciler' && c.takeIds?.includes(T(1, 2)),
    )
    assert.ok(retried !== undefined)
    assert.ok(!retried.prompt.includes(reason), "take 2's reconciler is told take 1's reason")
    assert.ok(!retried.prompt.includes('MARK-'), "take 2's reconciler is told take 1's observation")
    assert.ok(!retried.prompt.includes(T(1, 1)), "take 2's reconciler is told take 1's id")
    assert.deepEqual(retried.takeIds, [T(1, 2)])

    // One witness and one reconciler receipt a take, naming it alone.
    for (const takeId of made) {
      const receipts = ran.receipts.filter((r) => r.take_ids.includes(takeId))
      assert.deepEqual(
        receipts.map((r) => [r.call, r.role, r.take_ids]),
        [
          ['observe', 'witness', [takeId]],
          ['structured', 'reconciler', [takeId]],
        ],
        `${takeId}'s receipts`,
      )
    }
  } finally {
    await engine.stop()
  }
})
