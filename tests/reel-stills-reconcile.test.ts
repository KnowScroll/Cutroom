import assert from 'node:assert/strict'
import { test } from 'node:test'
import { startEngine } from './engine/harness.ts'
import {
  CANONICAL_ONLY,
  CANONICAL_ONLY_PICS,
  CRITERION_IDS,
  THREE_RANKS,
  THREE_RANKS_PICS,
  WITNESS_WORDS,
  entity,
  first,
  inTurn,
  observation,
  passes,
  pictureOf,
  seen,
  stills,
  stillsRequest,
  stillsScript,
  type Pic,
  type ReconcileAnswer,
} from './engine/stills.ts'

// reel-stills, Slice 3 — checks 27 and 29 (docs/features/reel-stills.md): Gate 1's reconcile step.
// One `structured` call per picture past technical, role reconciler, given the shot's subjects and
// the presence criteria S-040 routes to it — never an event (D-043). The reconciler judges; CODE
// fails the picture, on exactly five conditions, and the picture keeps its observation and its
// reconciliation whichever way it goes (S-031, S-040).

const request = stillsRequest('reconcile')
const textOf = (id: string) =>
  [...request.criteria.mustShow, ...request.criteria.mustNotShow].find((c) => c.id === id)?.text ??
  ''

/**
 * Whether a prompt states S-040's count rule in its words: a count is matched against the number
 * the subject's name states — or, when it states none, one for a singular name and two or more for a
 * plural one. The rule that was rejected — one whenever the name states no number — fails it.
 */
function statesTheCountRule(prompt: string): boolean {
  const text = prompt.replace(/\s+/g, ' ')
  return (
    /the number the subject's name states/i.test(text) &&
    /one for a singular name and two or more for a plural one/i.test(text) &&
    !/\bone (when|if) (it|the name) states (none|no number)\b/i.test(text)
  )
}

// ---------------------------------------------------------------- 27

test('27. reconcile is one structured call per picture past technical, role reconciler, temperature 0, given every subject the shot shows and the criteria S-040 assigns, never an event criterion; and its prompt states that a count is matched against the number a name states, or one for a singular name and two or more for a plural one — a prompt stating one when the name states no number fails', async () => {
  const engine = await startEngine({
    worker: true,
    script: stillsScript(THREE_RANKS, THREE_RANKS_PICS),
  })
  try {
    const ran = await stills(engine, stillsRequest('r27'))
    assert.equal(ran.result.status, 'completed', JSON.stringify(ran.result))

    const reconciles = engine.model.calls.filter((c) => (c.pictureIds?.length ?? 0) > 0)
    assert.equal(
      reconciles.length,
      THREE_RANKS_PICS.length,
      'not one reconcile call per picture past technical',
    )
    assert.equal(
      engine.model.calls.filter((c) => c.role === 'reconciler').length,
      THREE_RANKS_PICS.length,
    )

    THREE_RANKS_PICS.forEach((pic: Pic, i) => {
      const call = reconciles[i]
      assert.ok(call !== undefined)
      const id = first(pic.key)
      assert.equal(call.role, 'reconciler', `${id}`)
      assert.equal(call.temperature, 0, `${id}`)
      assert.deepEqual(call.pictureIds, [id], `${id}'s call names other pictures`)

      // Every subject the shot shows, by id and by name.
      for (const subject of pic.subjects) {
        assert.ok(
          call.prompt.includes(subject.id),
          `${id}'s prompt does not give subject ${subject.id}`,
        )
        assert.ok(
          call.prompt.includes(subject.name),
          `${id}'s prompt does not give the name ${subject.name}`,
        )
      }
      // Exactly the criteria S-040 assigns, and never the event.
      const assigned = [...pic.mustShow, ...pic.mustNotShow]
      for (const criterion of CRITERION_IDS) {
        const given = call.prompt.includes(criterion)
        assert.equal(
          given,
          assigned.includes(criterion),
          `${id}'s prompt ${given ? 'gives' : 'does not give'} ${criterion}`,
        )
        assert.equal(
          call.prompt.includes(textOf(criterion)),
          assigned.includes(criterion),
          `${id}'s prompt and ${criterion}'s text`,
        )
      }
      assert.ok(
        !call.prompt.includes('show-pressing') && !call.prompt.includes('pressed'),
        `an event criterion reached ${id}`,
      )

      // The observation the witness gave is what the reconciler reconciles, in the witness's words.
      for (const subject of pic.subjects) {
        assert.ok(
          call.prompt.includes(WITNESS_WORDS[subject.id] ?? '(none)'),
          `${id}'s prompt does not carry its observation`,
        )
      }

      // The answer must name every subject and every criterion it was given, and nothing else.
      const schema = call.schema
      const good = passes(pic)
      assert.ok(schema.safeParse(good).success, `${id}: a complete answer was refused`)
      const missingSubject: ReconcileAnswer = { ...good, subjects: good.subjects.slice(1) }
      assert.ok(
        !schema.safeParse(missingSubject).success,
        `${id}: an answer leaving out a subject parsed`,
      )
      if (good.criteria.length > 0) {
        const missingCriterion: ReconcileAnswer = { ...good, criteria: good.criteria.slice(1) }
        assert.ok(
          !schema.safeParse(missingCriterion).success,
          `${id}: an answer leaving out a criterion parsed`,
        )
      }
      const withEvent: ReconcileAnswer = {
        ...good,
        criteria: [...good.criteria, { id: 'show-pressing', shown: false, entity: null }],
      }
      assert.ok(
        !schema.safeParse(withEvent).success,
        `${id}: an answer naming the event criterion parsed`,
      )
      const noSuchEntity: ReconcileAnswer = {
        ...good,
        subjects: good.subjects.map((s) => ({ ...s, entity: pic.subjects.length })),
      }
      assert.ok(
        !schema.safeParse(noSuchEntity).success,
        `${id}: an answer naming an entity the witness did not see parsed`,
      )

      // The count rule, in its words.
      assert.ok(statesTheCountRule(call.prompt), `${id}'s prompt does not state S-040's count rule`)
    })

    // The rejected rule's prompt fails the same test: the rule sentence swapped for "one".
    const prompt = reconciles[0]?.prompt ?? ''
    const ruleLine = prompt.split('\n').find((line) => /singular/.test(line))
    assert.ok(ruleLine !== undefined, 'no line of the prompt states the singular rule')
    const rejected = prompt.replace(
      ruleLine,
      "A subject's count matches when it is the number the subject's name states, or one when the name states no number.",
    )
    assert.ok(
      !statesTheCountRule(rejected),
      'a prompt stating one when the name states no number passes the rule test',
    )
  } finally {
    await engine.stop()
  }
})

// ---------------------------------------------------------------- 29

test('29. a picture fails reconcile, and keeps its observation and reconciliation, for each of: a shot subject not shown, a shown subject clipped by the edge, a shown subject whose count does not match, a mustShow not shown, a mustNotShow shown — each built alone', async () => {
  const [a] = CANONICAL_ONLY_PICS as [Pic, Pic]
  const answerWith = (change: (answer: ReconcileAnswer) => void): ReconcileAnswer => {
    const answer = passes(a)
    change(answer)
    return answer
  }
  const criterion = (answer: ReconcileAnswer, id: string) => {
    const found = answer.criteria.find((c) => c.id === id)
    assert.ok(found !== undefined)
    return found
  }

  // Each condition on candidate a alone; candidate b passes, so every run completes.
  const cases: Array<{
    name: string
    witness?: unknown
    reconciler?: ReconcileAnswer
    reason: RegExp
  }> = [
    {
      name: 'a shot subject not shown',
      reconciler: answerWith((x) => ((x.subjects[0] as { entity: number | null }).entity = null)),
      reason: /seal.*not shown/i,
    },
    {
      name: 'a shown subject clipped by the edge',
      witness: seen(a, () => ({ clippedByEdge: true })),
      reason: /seal.*clipped/i,
    },
    {
      name: 'a shown subject whose count does not match',
      reconciler: answerWith(
        (x) => ((x.subjects[0] as { countMatches: boolean }).countMatches = false),
      ),
      reason: /seal.*count/i,
    },
    {
      name: 'a mustShow not shown',
      reconciler: answerWith((x) =>
        Object.assign(criterion(x, 'show-seal'), { shown: false, entity: null }),
      ),
      reason: /show-seal.*not shown/i,
    },
    {
      name: 'a mustNotShow shown',
      reconciler: answerWith((x) =>
        Object.assign(criterion(x, 'never-person'), { shown: true, entity: 0 }),
      ),
      reason: /never-person.*shown/i,
    },
  ]
  const passing: Array<{ name: string; witness: unknown }> = [
    {
      // A clipped entity the reconciler matched to no subject is not a shot subject clipped.
      name: 'another entity clipped by the edge',
      witness: observation([
        entity(WITNESS_WORDS.seal ?? '(none)'),
        entity('a torn banner', { clippedByEdge: true }),
      ]),
    },
  ]

  const engine = await startEngine({
    worker: true,
    script: inTurn(
      ...cases.map((c) =>
        stillsScript(CANONICAL_ONLY, CANONICAL_ONLY_PICS, {
          ...(c.witness === undefined ? {} : { witness: { [a.key]: c.witness } }),
          ...(c.reconciler === undefined ? {} : { reconciler: { [a.key]: c.reconciler } }),
        }),
      ),
      ...passing.map((c) =>
        stillsScript(CANONICAL_ONLY, CANONICAL_ONLY_PICS, { witness: { [a.key]: c.witness } }),
      ),
      // The barons are plural and seen as three: the count matches, and the picture passes.
      stillsScript(THREE_RANKS, THREE_RANKS_PICS),
    ),
  })
  try {
    for (const [i, c] of cases.entries()) {
      const ran = await stills(engine, stillsRequest(`r29-${i}`))
      assert.equal(ran.result.status, 'completed', `${c.name}: ${JSON.stringify(ran.result)}`)
      const row = pictureOf(ran, a.key)
      const id = row.picture_id

      assert.equal(row.gate1?.outcome, 'fail', `${c.name}: the picture did not fail`)
      assert.deepEqual(
        row.gate1?.steps.map((s) => [s.step, s.outcome]),
        [
          ['technical', 'accept'],
          ['text', 'accept'],
          ['witness', 'accept'],
          ['reconcile', 'fail'],
        ],
        `${c.name}: it did not fail at reconcile alone`,
      )
      const reasons = row.gate1?.steps.find((s) => s.step === 'reconcile')?.reasons ?? []
      assert.equal(
        reasons.length,
        1,
        `${c.name}: ${reasons.length} reasons, not one: ${reasons.join(' | ')}`,
      )
      assert.match(reasons[0] as string, c.reason, `${c.name}: the reason does not say why`)

      // It keeps both records, and the record route gives both ids (S-031).
      assert.equal(
        ran.observations.filter((o) => o.picture_id === id).length,
        1,
        `${c.name}: no observation kept`,
      )
      const reconciliation = ran.reconciliations.find((r) => r.picture_id === id)
      assert.ok(reconciliation !== undefined, `${c.name}: no reconciliation kept`)
      assert.deepEqual(
        reconciliation.failed,
        reasons,
        `${c.name}: the reconciliation's failures are not the step's reasons`,
      )
      const entry = ran.record.pictures.find((p) => p.pictureId === id)
      assert.equal(entry?.observationId, `obs-${id}`)
      assert.equal(entry?.reconciliationId, `rec-${id}`)

      assert.equal(row.chosen, false)
      assert.equal(
        pictureOf(ran, 'shot-0-b').chosen,
        true,
        `${c.name}: the passing candidate was not chosen`,
      )
    }

    for (const c of passing) {
      const ran = await stills(engine, stillsRequest(`r29-pass-${c.name.length}`))
      assert.equal(pictureOf(ran, a.key).gate1?.outcome, 'accept', `${c.name}: the picture failed`)
    }

    const plural = await stills(engine, stillsRequest('r29-plural'))
    assert.equal(plural.result.status, 'completed', JSON.stringify(plural.result))
    const barons = pictureOf(plural, 'shot-1-single')
    assert.equal(
      plural.observations.find((o) => o.picture_id === barons.picture_id)?.observation.entities[0]
        ?.count,
      3,
    )
    assert.equal(
      barons.gate1?.outcome,
      'accept',
      'three barons failed a plural name that states no number',
    )
  } finally {
    await engine.stop()
  }
})
