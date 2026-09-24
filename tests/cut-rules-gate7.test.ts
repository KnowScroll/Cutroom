import assert from 'node:assert/strict'
import { test } from 'node:test'
import { DEFAULT_RENDER_SETTINGS } from '@cutroom/pipeline'
import { startEngine } from './engine/harness.ts'
import { THREE_RANKS, THREE_RANKS_PICS } from './engine/stills.ts'
import { video, videoRequest, videoScript } from './engine/video.ts'

// cut-rules, Slice 2 — check 2 (docs/features/cut-rules.md): GATE 7 NEVER ASKS ABOUT REPETITION
// (S-158). The finished cut is still judged on its order, its pacing, what sits beside what and its
// captions — any no still fails it (I-16) — and never for showing one thing in more than one shot.

/** The four questions, typed by hand. */
const FOUR = [
  'Are the shots in a sensible order?',
  'Does the pacing work?',
  'Does every shot sit well beside the shot that follows it?',
  'Do the burned captions follow the narration?',
]

test("2. Gate 7 asks four closed questions — order, pacing, what sits beside what, the captions — and none about repetition: the settings' cutQuestions are exactly those four; through the worker every judgeCut call carries exactly them; and a judge answer naming the four, all yes, accepts the cut", async () => {
  assert.deepEqual([...DEFAULT_RENDER_SETTINGS.cutQuestions], FOUR)
  for (const question of DEFAULT_RENDER_SETTINGS.cutQuestions) {
    assert.doesNotMatch(question, /repeat|no other shot/i, `Gate 7 asks "${question}"`)
  }

  const engine = await startEngine({
    worker: true,
    script: videoScript(THREE_RANKS, THREE_RANKS_PICS, {
      cut: { answers: FOUR.map((question) => ({ question, answer: 'yes' })) },
    }),
  })
  try {
    const ran = await video(engine, videoRequest('cut-rules-2'))
    assert.equal(ran.result.status, 'completed', JSON.stringify(ran.result))
    const calls = engine.model.judgeCutCalls
    assert.equal(calls.length, 1, 'Gate 7 was not one judgeCut call')
    for (const call of calls) assert.deepEqual([...call.questions], FOUR)
    assert.ok(
      ran.events.some((e) => e.type === 'verdict' && e.gate === '7' && e.outcome === 'accept'),
      'Gate 7 did not accept a cut answered yes to all four',
    )
  } finally {
    await engine.stop()
  }
})
