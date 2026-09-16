import assert from 'node:assert/strict'
import { test } from 'node:test'
import { DEFAULT_STILLS_SETTINGS } from '@cutroom/pipeline'
import { startEngine, type EngineOptions } from './engine/harness.ts'
import {
  CANONICAL_ONLY,
  CANONICAL_ONLY_PICS,
  THREE_RANKS,
  THREE_RANKS_PICS,
  TWO_SHARED,
  TWO_SHARED_PICS,
  first,
  judged,
  pictureOf,
  seen,
  stills,
  stillsRequest,
  stillsScript,
  type PictureRow,
  type Stilled,
} from './engine/stills.ts'

// reel-stills, Slice 3 — check 33 (docs/features/reel-stills.md): Gate 1S (D-049, S-045). Each
// derived picture that passed Gate 1 is held against the chosen canonical. A pair sharing no subject
// is accepted uncompared; the similarity of the two whole pictures only ROUTES — at or below the
// threshold, accepted with no call; above it, one `compare` call decides. No similarity fails a
// picture on its own (I-16).

interface Ran {
  ran: Stilled
  compareCalls: ReadonlyArray<{
    pictures: readonly [{ pictureId: string; path: string }, { pictureId: string; path: string }]
    subjects: readonly string[]
    temperature: number
  }>
}

async function one(requestId: string, options: Omit<EngineOptions, 'worker'>): Promise<Ran> {
  const engine = await startEngine({ worker: true, ...options })
  try {
    const ran = await stills(engine, stillsRequest(requestId))
    return { ran, compareCalls: [...engine.model.compareCalls] }
  } finally {
    await engine.stop()
  }
}

const judgeReceipts = (ran: Stilled) =>
  ran.receipts.filter((r) => r.call === 'compare' || r.role === 'judge')
const chosenCanonicalOf = (ran: Stilled) =>
  ran.pictures.find((p) => p.role === 'canonical' && p.chosen)

// ---------------------------------------------------------------- 33

test('33. Gate 1S runs on every run with a derived picture past Gate 1 and on no other; a pair sharing no subject, and a pair at or below the threshold, is accepted with no call; above it one compare call, role judge, temperature 0, given the two pictures and the shared subjects names, decides; no Gate 1S fail exists without that calls receipt; its answers reasons are the subjects answered no', async () => {
  const [a, , barons, hall] = THREE_RANKS_PICS
  assert.ok(a !== undefined && barons !== undefined && hall !== undefined)

  // The defaults: every similarity 1, so every pair is unsuspicious and no judge is asked.
  const plain = await one('r33-plain', { script: stillsScript(THREE_RANKS, THREE_RANKS_PICS) })
  // At the default threshold exactly: 1 - 0.75 = 0.25.
  const atDefault = await one('r33-at-default', {
    sensors: { [hall.key]: { similarity: 0.75 } },
    script: stillsScript(THREE_RANKS, THREE_RANKS_PICS),
  })
  // At a threshold that is not the default, exactly: 1 - 0.5 = 0.5 — so the setting is what is read.
  const atSetting = await one('r33-at-setting', {
    sensors: { [hall.key]: { similarity: 0.5 } },
    stillsSettings: { ...DEFAULT_STILLS_SETTINGS, suspicionThreshold: 0.5 },
    script: stillsScript(THREE_RANKS, THREE_RANKS_PICS),
  })
  // Above it: the judge decides, and says the same. Candidate a is seen further back, so b is chosen,
  // and a pair held against the first candidate made rather than the chosen one is caught.
  const same = await one('r33-same', {
    sensors: { [hall.key]: { similarity: 0.5 } },
    script: stillsScript(THREE_RANKS, THREE_RANKS_PICS, {
      witness: { [a.key]: seen(a, () => ({ prominence: 'midground' })) },
      judge: [judged(['a wax seal'])],
    }),
  })
  // Two shared subjects, and the judge says one of them is not the same.
  const [, , seal] = TWO_SHARED_PICS
  assert.ok(seal !== undefined)
  const differs = await one('r33-differs', {
    sensors: { [seal.key]: { similarity: 0.1 } },
    script: stillsScript(TWO_SHARED, TWO_SHARED_PICS, {
      judge: [judged(['a wax seal', 'a king'], ['a king'])],
    }),
  })
  // No derived picture at all.
  const alone = await one('r33-alone', {
    script: stillsScript(CANONICAL_ONLY, CANONICAL_ONLY_PICS),
  })

  for (const { ran } of [plain, atDefault, atSetting, same, alone]) {
    assert.equal(ran.result.status, 'completed', JSON.stringify(ran.result))
  }

  // On every run with a derived picture past Gate 1, every such picture has a Gate 1S verdict; no
  // canonical ever has one; a run with no derived picture has none at all.
  for (const { ran } of [plain, atDefault, atSetting, same, differs]) {
    for (const picture of ran.pictures) {
      if (picture.role === 'derived' && picture.gate1?.outcome === 'accept') {
        assert.ok(
          picture.gate1s !== null,
          `${ran.runId}: ${picture.picture_id} passed Gate 1 and has no Gate 1S verdict`,
        )
      }
      if (picture.role === 'canonical') assert.equal(picture.gate1s, null)
    }
  }
  assert.ok(
    alone.ran.pictures.every((p) => p.gate1s === null),
    'a run with no derived picture has a Gate 1S verdict',
  )
  assert.equal(alone.compareCalls.length, 0)
  assert.equal(
    alone.ran.events.filter((e) => e.type === 'verdict' && e.gate === '1S').length,
    0,
    'a run with no derived picture has a Gate 1S event',
  )

  // A pair sharing no subject: accepted, not compared, no suspicion taken.
  const expectUncompared = (row: PictureRow, suspicion: number | null) =>
    assert.deepEqual(
      row.gate1s,
      {
        outcome: 'accept',
        coverage: 'pair',
        compared: false,
        suspicion,
        answer: null,
        reasons: [],
      },
      `${row.picture_id}'s Gate 1S verdict`,
    )
  expectUncompared(pictureOf(plain.ran, barons.key), null)
  // Sharing the seal, and not suspicious: accepted with the suspicion recorded and no call.
  expectUncompared(pictureOf(plain.ran, hall.key), 0)
  expectUncompared(pictureOf(atDefault.ran, hall.key), 0.25)
  expectUncompared(pictureOf(atSetting.ran, hall.key), 0.5)
  for (const { ran, compareCalls } of [plain, atDefault, atSetting]) {
    assert.equal(
      compareCalls.length,
      0,
      `${ran.runId}: the judge was asked about an unsuspicious pair`,
    )
    assert.deepEqual(judgeReceipts(ran), [])
  }

  // Above the threshold: one compare call, given the two pictures and the shared subjects' names.
  const canonical = chosenCanonicalOf(same.ran)
  const hallRow = pictureOf(same.ran, hall.key)
  assert.equal(canonical?.picture_id, 'a1-shot-0-b', 'the fixture no longer chooses candidate b')
  assert.equal(same.compareCalls.length, 1)
  assert.deepEqual(same.compareCalls[0], {
    pictures: [
      { pictureId: canonical.picture_id, path: canonical.path },
      { pictureId: hallRow.picture_id, path: hallRow.path },
    ],
    subjects: ['a wax seal'],
    temperature: 0,
  })
  assert.deepEqual(hallRow.gate1s, {
    outcome: 'accept',
    coverage: 'pair',
    compared: true,
    suspicion: 0.5,
    answer: [{ subject: 'a wax seal', same: 'yes' }],
    reasons: [],
  })
  const receipts = judgeReceipts(same.ran)
  assert.equal(receipts.length, 1)
  assert.deepEqual(
    [receipts[0]?.call, receipts[0]?.role, receipts[0]?.temperature, receipts[0]?.picture_ids],
    ['compare', 'judge', 0, [canonical.picture_id, hallRow.picture_id]],
  )

  // The judge's no fails the picture, with the subjects it answered no as the reasons.
  const sealRow = pictureOf(differs.ran, seal.key)
  assert.equal(differs.compareCalls.length, 1)
  assert.deepEqual([...(differs.compareCalls[0]?.subjects ?? [])].sort(), ['a king', 'a wax seal'])
  assert.equal(sealRow.gate1s?.outcome, 'fail')
  assert.equal(sealRow.gate1s?.compared, true)
  assert.deepEqual(sealRow.gate1s?.reasons, ['a king'])
  assert.deepEqual(
    [...(sealRow.gate1s?.answer ?? [])].sort((x, y) => x.subject.localeCompare(y.subject)),
    [
      { subject: 'a king', same: 'no' },
      { subject: 'a wax seal', same: 'yes' },
    ],
  )
  assert.equal(sealRow.chosen, false)

  // No Gate 1S fail, anywhere, without the compare receipt that decided it.
  for (const { ran } of [plain, atDefault, atSetting, same, differs, alone]) {
    for (const row of ran.pictures.filter((p) => p.gate1s?.outcome === 'fail')) {
      const decided = ran.receipts.filter(
        (r) => r.call === 'compare' && r.picture_ids.includes(row.picture_id),
      )
      assert.equal(
        decided.length,
        1,
        `${row.picture_id} failed Gate 1S with ${decided.length} compare receipts`,
      )
    }
  }
  assert.ok(
    differs.ran.pictures.some((p) => p.gate1s?.outcome === 'fail'),
    'the fixture no longer fails Gate 1S',
  )
  assert.equal(first(seal.key), sealRow.picture_id)
})
