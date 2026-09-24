import assert from 'node:assert/strict'
import { test } from 'node:test'
import { DEFAULT_PLAN_SETTINGS, planReel, scorePlan } from '@cutroom/pipeline'
import { planRequest, standIn, twoSurvivors } from './engine/plans.ts'

// cut-rules, Slice 1 — check 1 (docs/features/cut-rules.md): THE PLAN SCORE NEVER ASKS ABOUT
// REPETITION (S-158). A reel that shows how a thing works shows that thing again and again, and the
// question that marked such a plan down — measured doing it in S-148 and S-149 — is gone.

/** The three questions, typed by hand. */
const THREE = [
  'Does the order of the shots let each one build on the one before it?',
  'Does each shot last long enough for its narration, without lingering after it?',
  'Does each cut put two pictures side by side in a way that adds to what is said?',
]

/** The removed question, which no score prompt may carry. */
const REMOVED = 'Does every shot show something that no other shot has already shown?'

test('1. the plan score asks three closed questions — order, pacing, juxtaposition — and none about repetition: the settings\' questions are exactly those three; every score prompt carries each, and neither the removed sentence nor "already shown"; its answer schema accepts three yes/no and refuses four; the default weights hold no distinct; and a plan\'s terms are exactly coverage, recurrence, order, pacing and juxtaposition, with order, pacing and juxtaposition the answers in that order — (yes, yes, no) gives 1, 1, 0 and (no, yes, no) gives 0, 1, 0', async () => {
  assert.deepEqual([...DEFAULT_PLAN_SETTINGS.score.questions], THREE)
  assert.ok(!('distinct' in DEFAULT_PLAN_SETTINGS.score.weights), 'a weight is left for distinct')

  const model = standIn(twoSurvivors())
  const outcome = await planReel(planRequest('cut-rules-1'), model, 300, DEFAULT_PLAN_SETTINGS)
  const scoring = model.calls.filter((c) => c.role === 'reconciler')
  assert.equal(scoring.length, 2, 'two survivors were not each scored')
  for (const call of scoring) {
    for (const question of THREE) {
      assert.ok(call.prompt.includes(question), `a score prompt does not ask "${question}"`)
    }
    assert.ok(!call.prompt.includes(REMOVED), 'a score prompt still asks about repetition')
    assert.ok(!call.prompt.includes('already shown'), 'a score prompt asks what was already shown')
    assert.equal(call.schema.safeParse({ answers: ['yes', 'no', 'yes'] }).success, true)
    assert.equal(call.schema.safeParse({ answers: ['yes', 'no', 'yes', 'yes'] }).success, false)
  }

  assert.equal(outcome.kind, 'selected')
  const scores = 'scores' in outcome ? outcome.scores : null
  assert.ok(scores !== null && scores !== undefined, 'two survivors were not scored')
  for (const plan of [scores.a, scores.b]) {
    assert.deepEqual(Object.keys(plan.terms).sort(), [
      'coverage',
      'juxtaposition',
      'order',
      'pacing',
      'recurrence',
    ])
  }
  // twoSurvivors: plan a answers (yes, yes, no), plan b (yes, yes, yes) — the terms follow, in order.
  const answered = (terms: Record<string, number>) => [
    terms.order,
    terms.pacing,
    terms.juxtaposition,
  ]
  assert.deepEqual(answered(scores.a.terms), [1, 1, 0])
  assert.deepEqual(answered(scores.b.terms), [1, 1, 1])
  // A second vector, so order and pacing cannot swap unseen: (no, yes, no) gives 0, 1, 0.
  const request = planRequest('cut-rules-1b')
  const second = scorePlan(outcome.fork.a, request, ['no', 'yes', 'no'], DEFAULT_PLAN_SETTINGS)
  assert.deepEqual(answered(second.terms), [0, 1, 0])
})
