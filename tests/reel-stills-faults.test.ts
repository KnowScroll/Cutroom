import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { FakeScript } from '@cutroom/providers'
import { startEngine, type Engine, type EngineOptions } from './engine/harness.ts'
import {
  THREE_RANKS,
  THREE_RANKS_PICS,
  TWO_SHARED,
  TWO_SHARED_PICS,
  judged,
  pictureOf,
  seen,
  stills,
  stillsRequest,
  stillsScript,
  twice,
  type Pic,
  type Stilled,
} from './engine/stills.ts'

// reel-stills, Slice 4 — checks 46 and 47 (docs/features/reel-stills.md): faults (S-042, S-046, D-005,
// D-041). A thrown port call, and an answer that does not parse, each finish the run failed with a
// detail. Nothing is thrown away: every receipt of a call that returned is kept, and every picture
// made is in the record with the checks it completed — and no Gate 1 verdict outcome where its steps
// were cut off. Every expectation below is typed by hand.

const [, , barons, hall] = THREE_RANKS_PICS as [Pic, Pic, Pic, Pic]

const STEPS = ['technical', 'text', 'witness', 'reconcile'] as const
/** A picture's record checks: its first `n` Gate 1 steps, accepted, and a Gate 1S check if given. */
const checks = (n: number, gate1s?: string) => [
  ...STEPS.slice(0, n).map((step) => ({ gate: '1', step, outcome: 'accept' })),
  ...(gate1s === undefined ? [] : [{ gate: '1S', outcome: gate1s }]),
]

/** The model receipts after the planner's, as `call role picture-ids`. */
const pictureReceipts = (ran: Stilled) =>
  ran.receipts
    .filter((r) => r.role !== 'planner')
    .map((r) => `${r.call} ${r.role} ${r.picture_ids.join(',')}`)

const observed = (id: string) => [`observe witness ${id}`, `structured reconciler ${id}`]

async function faulted(
  requestId: string,
  options: Omit<EngineOptions, 'worker'>,
): Promise<{ ran: Stilled; engine: Engine }> {
  const engine = await startEngine({ worker: true, ...options })
  try {
    return { ran: await stills(engine, stillsRequest(requestId)), engine }
  } finally {
    await engine.stop()
  }
}

/** What every faulted run shares: failed with a detail, nothing chosen, the stage not finished. */
function assertFailed(ran: Stilled, detail: RegExp): void {
  assert.deepEqual(Object.keys(ran.result).sort(), [
    'contractVersion',
    'costCents',
    'detail',
    'requestId',
    'runId',
    'status',
  ])
  assert.equal(ran.result.status, 'failed', JSON.stringify(ran.result))
  assert.match(String(ran.result.detail), detail)
  assert.ok(
    ran.pictures.every((p) => !p.chosen),
    `${ran.runId}: a picture is chosen`,
  )
  assert.ok(
    !ran.events.some((e) => e.type === 'stage.finished' && e.stage === 'stills'),
    `${ran.runId}: stage.finished for stills on a failed run`,
  )
}

// ---------------------------------------------------------------- 46

test('46. a witness answer that does not parse finishes the run failed with a detail, and that pictures record has technical and text checks only, no Gate 1 verdict outcome, no verdict event and no observation id', async () => {
  // The barons' observation leaves out clippedByEdge (D-044) and adds actions (D-041).
  const malformed = seen(barons) as unknown as { entities: Array<Record<string, unknown>> }
  delete malformed.entities[0]?.clippedByEdge
  const answer = { ...malformed, actions: ['marching'] }
  // TWICE, because a refused answer is asked for once more (second-ask, S-147): with one, the
  // second ask would read the next picture's answer and this check would stop testing a refusal.
  const { ran, engine } = await faulted('r46', {
    script: stillsScript(THREE_RANKS, THREE_RANKS_PICS, {
      witness: { [barons.key]: twice({ value: answer }, { value: answer }) },
    }),
  })
  assertFailed(ran, /witness/i)
  // Today's exact words, so a stand-in running out of answers cannot pass for a refusal (S-147).
  assert.match(
    String(ran.result.detail),
    /the witness's answer for a1-shot-1-single is not an observation: /,
  )

  const row = pictureOf(ran, barons.key)
  assert.deepEqual(
    row.gate1,
    {
      outcome: null,
      coverage: 'whole picture',
      steps: [
        { step: 'technical', outcome: 'accept', reasons: [] },
        { step: 'text', outcome: 'accept', reasons: [] },
      ],
    },
    'the picture whose witness answer did not parse has a decided verdict, or other steps',
  )
  const entry = ran.record.pictures.find((p) => p.pictureId === row.picture_id)
  assert.ok(entry !== undefined)
  assert.deepEqual(entry.checks, checks(2))
  assert.ok(!('observationId' in entry), 'the record gives it an observation id')
  assert.ok(!('reconciliationId' in entry))
  assert.ok(!ran.observations.some((o) => o.picture_id === row.picture_id))
  assert.equal(
    ran.events.filter((e) => e.type === 'verdict' && e.shotId === 'shot-1').length,
    0,
    'a verdict event for a picture whose verdict was never decided',
  )
  // The witness's calls returned, so their receipts are kept — BOTH asks, the refused one and the
  // one asked once more (S-147); nothing was reconciled after them.
  assert.deepEqual(pictureReceipts(ran), [
    ...observed('a1-shot-0-a'),
    ...observed('a1-shot-0-b'),
    'observe witness a1-shot-1-single',
    'observe witness a1-shot-1-single',
  ])
  assert.deepEqual(
    engine.image.calls.map((c) => c.pictureId),
    ['a1-shot-0-a', 'a1-shot-0-b', 'a1-shot-1-single'],
  )
})

// ---------------------------------------------------------------- 47

/** The script with the `i`-th answer of `role` replaced by a throw. */
function throwing(script: FakeScript, role: keyof FakeScript, i: number, message: string) {
  const answers = [...(script[role] ?? [])]
  answers[i] = { throws: message }
  return { ...script, [role]: answers }
}

test('47. a stand-in throwing on an image, observe, reconcile or compare call, or on measure, readText or similarity, and a compare answer that leaves out a shared subject, each finish the run failed with a detail; every receipt of a call that returned is kept, and every picture made before it is in the record with the checks it completed and, where its steps were cut off, no Gate 1 verdict outcome', async () => {
  const plain = () => stillsScript(THREE_RANKS, THREE_RANKS_PICS)
  const suspicious = { [hall.key]: { similarity: 0.5 } }
  const A = 'a1-shot-0-a'
  const B = 'a1-shot-0-b'
  const BARONS = 'a1-shot-1-single'
  const HALL = 'a1-shot-2-single'

  const cases: Array<{
    name: string
    options: Omit<EngineOptions, 'worker'>
    detail: RegExp
    /** Every image call the stand-in received, the one that threw included. */
    made: string[]
    /** The image calls that returned: the generation receipts. */
    images: string[]
    receipts: string[]
    record: Array<[string, ReturnType<typeof checks>]>
    /** The picture whose Gate 1 was cut off, if one was. */
    cut?: string
  }> = [
    {
      name: 'an image call',
      options: {
        images: { [barons.key]: { throws: 'the image service fell over' } },
        script: plain(),
      },
      detail: /the image service fell over/,
      made: [A, B, BARONS],
      images: [A, B],
      receipts: [...observed(A), ...observed(B)],
      record: [
        [A, checks(4)],
        [B, checks(4)],
      ],
    },
    {
      name: 'an observe call',
      options: { script: throwing(plain(), 'witness', 2, 'the witness is unreachable') },
      detail: /the witness is unreachable/,
      made: [A, B, BARONS],
      images: [A, B, BARONS],
      receipts: [...observed(A), ...observed(B)],
      record: [
        [A, checks(4)],
        [B, checks(4)],
        [BARONS, checks(2)],
      ],
      cut: BARONS,
    },
    {
      name: 'a reconcile call',
      options: { script: throwing(plain(), 'reconciler', 2, 'the reconciler is unreachable') },
      detail: /the reconciler is unreachable/,
      made: [A, B, BARONS],
      images: [A, B, BARONS],
      receipts: [...observed(A), ...observed(B), `observe witness ${BARONS}`],
      record: [
        [A, checks(4)],
        [B, checks(4)],
        [BARONS, checks(3)],
      ],
      cut: BARONS,
    },
    {
      name: 'a compare call',
      options: {
        sensors: suspicious,
        script: { ...plain(), judge: [{ throws: 'the judge is unreachable' }] },
      },
      detail: /the judge is unreachable/,
      made: [A, B, BARONS, HALL],
      images: [A, B, BARONS, HALL],
      receipts: [...observed(A), ...observed(B), ...observed(BARONS), ...observed(HALL)],
      record: [
        [A, checks(4)],
        [B, checks(4)],
        [BARONS, checks(4, 'accept')],
        [HALL, checks(4)],
      ],
    },
    {
      name: 'measure',
      options: {
        sensors: { [barons.key]: { throws: { measure: 'the sensor cannot measure' } } },
        script: plain(),
      },
      detail: /the sensor cannot measure/,
      made: [A, B, BARONS],
      images: [A, B, BARONS],
      receipts: [...observed(A), ...observed(B)],
      record: [
        [A, checks(4)],
        [B, checks(4)],
        [BARONS, checks(0)],
      ],
    },
    {
      name: 'readText',
      options: {
        sensors: { [barons.key]: { throws: { readText: 'the sensor cannot read' } } },
        script: plain(),
      },
      detail: /the sensor cannot read/,
      made: [A, B, BARONS],
      images: [A, B, BARONS],
      receipts: [...observed(A), ...observed(B)],
      record: [
        [A, checks(4)],
        [B, checks(4)],
        [BARONS, checks(1)],
      ],
      cut: BARONS,
    },
    {
      name: 'similarity',
      options: {
        sensors: { [hall.key]: { throws: { similarity: 'the sensor cannot compare' } } },
        script: plain(),
      },
      detail: /the sensor cannot compare/,
      made: [A, B, BARONS, HALL],
      images: [A, B, BARONS, HALL],
      receipts: [...observed(A), ...observed(B), ...observed(BARONS), ...observed(HALL)],
      record: [
        [A, checks(4)],
        [B, checks(4)],
        [BARONS, checks(4, 'accept')],
        [HALL, checks(4)],
      ],
    },
  ]

  for (const c of cases) {
    const { ran, engine } = await faulted(`r47-${c.name.replace(/\W+/g, '-')}`, c.options)
    assertFailed(ran, c.detail)
    assert.deepEqual(
      engine.image.calls.map((call) => call.pictureId),
      c.made,
      `${c.name}: the image calls made`,
    )
    assert.deepEqual(
      ran.generations.map((g) => g.picture_id),
      c.images,
      `${c.name}: every image call that returned has its receipt, and no other has one`,
    )
    assert.deepEqual(pictureReceipts(ran), c.receipts, `${c.name}: the model receipts kept`)
    assert.equal(ran.receipts.filter((r) => r.role === 'planner').length, 2)
    assert.deepEqual(
      ran.record.pictures.map((p) => [p.pictureId, p.checks]),
      c.record,
      `${c.name}: the record`,
    )
    for (const picture of ran.pictures) {
      const cut = picture.picture_id === c.cut
      if (cut || (picture.gate1 !== null && picture.gate1.steps.length < 4)) {
        assert.equal(
          picture.gate1?.outcome ?? null,
          null,
          `${c.name}: ${picture.picture_id}'s steps were cut off and its verdict has an outcome`,
        )
      }
    }
    if (c.cut !== undefined) {
      assert.ok(pictureOf(ran, c.cut.replace(/^a1-/, '')).gate1 !== null)
    }
  }

  // A compare answer that leaves out a shared subject: the two pictures share the seal and the
  // king, and the judge names only the seal. The call returned, so its receipt is kept.
  const [kingA, kingB, seal] = TWO_SHARED_PICS as [Pic, Pic, Pic]
  const { ran } = await faulted('r47-left-out', {
    sensors: { [seal.key]: { similarity: 0.1 } },
    script: stillsScript(TWO_SHARED, TWO_SHARED_PICS, { judge: [judged(['a wax seal'])] }),
  })
  assertFailed(ran, /a king/)
  const [idA, idB, idSeal] = [kingA, kingB, seal].map((p) => `a1-${p.key}`) as [
    string,
    string,
    string,
  ]
  assert.deepEqual(pictureReceipts(ran), [
    ...observed(idA),
    ...observed(idB),
    ...observed(idSeal),
    `compare judge ${idA},${idSeal}`,
  ])
  assert.deepEqual(
    ran.record.pictures.map((p) => [p.pictureId, p.checks]),
    [
      [idA, checks(4)],
      [idB, checks(4)],
      [idSeal, checks(4)],
    ],
  )
  assert.equal(pictureOf(ran, seal.key).gate1s, null, 'a verdict from an answer that did not parse')
})
