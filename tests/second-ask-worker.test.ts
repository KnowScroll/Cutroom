import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { FakeAnswer } from '@cutroom/providers'
import { startEngine } from './engine/harness.ts'
import {
  THREE_RANKS,
  THREE_RANKS_PICS,
  pictureOf,
  seen,
  stills,
  stillsRequest,
  stillsScript,
  twice,
  type Pic,
  type Stilled,
} from './engine/stills.ts'
import {
  seenClip,
  takeOf,
  takesOf,
  video,
  videoRequest,
  videoScript,
  type Take,
  type Videoed,
} from './engine/video.ts'

// second-ask, Slice 2 — checks 6, 7 and 8 (docs/features/second-ask.md): through the worker, with
// the stand-in. The worker hands the pipeline its recording port, which writes a receipt for every
// call as it returns — so a refused-then-parsed answer leaves two `observe` receipts and one
// observation, two refusals leave two receipts and a failed run, and a refusal followed by a throw
// leaves one (S-147, D-084). Gate 1's wiring — its schema, its noun, its picture id — is proven here,
// on a still; Gate 4's on a take. Every expectation below is typed by hand.

const [, , barons] = THREE_RANKS_PICS as [Pic, Pic, Pic, Pic]
const [t0, t1] = takesOf(THREE_RANKS) as [Take, Take]

/** The barons' observation, refused on `lighting` — a word from outside the closed set. */
const refusedStill = { ...seen(barons), lighting: 'top' }
/** Take t1's observation, refused the same way. */
const refusedClip = { ...seenClip(t1), lighting: 'top' }

/** A stills run whose barons' picture is answered by `answers`, in order. */
async function stilled(requestId: string, first: FakeAnswer, second: FakeAnswer): Promise<Stilled> {
  const engine = await startEngine({
    worker: true,
    script: stillsScript(THREE_RANKS, THREE_RANKS_PICS, {
      witness: { [barons.key]: twice(first, second) },
    }),
  })
  try {
    return await stills(engine, stillsRequest(requestId))
  } finally {
    await engine.stop()
  }
}

/** A video run whose take t1 is answered by `answers`, in order; `takes` as the script needs them. */
async function videoed(
  requestId: string,
  first: FakeAnswer,
  second: FakeAnswer,
  takes?: readonly Take[],
): Promise<Videoed> {
  const engine = await startEngine({
    worker: true,
    script: videoScript(THREE_RANKS, THREE_RANKS_PICS, {
      witness: { [t1.key]: twice(first, second) },
      ...(takes === undefined ? {} : { takes }),
    }),
  })
  try {
    return await video(engine, videoRequest(requestId))
  } finally {
    await engine.stop()
  }
}

/** How many `observe` receipts a stills run holds for each picture, by picture id. */
function observesByPicture(ran: Stilled): Map<string, number> {
  const counts = new Map<string, number>()
  for (const r of ran.receipts.filter((r) => r.call === 'observe')) {
    for (const id of r.picture_ids) counts.set(id, (counts.get(id) ?? 0) + 1)
  }
  return counts
}

/** How many `observe` receipts a video run holds for each take, by take id. */
function observesByTake(ran: Videoed): Map<string, number> {
  const counts = new Map<string, number>()
  for (const r of ran.receipts.filter((r) => r.call === 'observe')) {
    for (const id of r.take_ids) counts.set(id, (counts.get(id) ?? 0) + 1)
  }
  return counts
}

// ---------------------------------------------------------------- 6

test('6. a still whose witness is refused once and then parses is accepted on the second observation — two observe receipts for that picture, one observation row equal to the second answer — and a take the same, two observe receipts for that take and one take observation; every other picture and take in the run has exactly one', async () => {
  const still = await stilled('r6-still', { value: refusedStill }, { value: seen(barons) })
  assert.equal(still.result.status, 'completed', JSON.stringify(still.result))
  const id = pictureOf(still, barons.key).picture_id
  const byPicture = observesByPicture(still)
  assert.equal(byPicture.get(id), 2, `${id} has ${byPicture.get(id)} observe receipts`)
  for (const [other, count] of byPicture) {
    if (other !== id) assert.equal(count, 1, `${other} has ${count} observe receipts`)
  }
  const observed = still.observations.filter((o) => o.picture_id === id)
  assert.equal(observed.length, 1, `${id} has ${observed.length} observations`)
  assert.deepEqual(observed[0]?.observation, seen(barons))
  assert.ok(pictureOf(still, barons.key).gate1?.steps.some((s) => s.step === 'witness'))

  const clip = await videoed('r6-take', { value: refusedClip }, { value: seenClip(t1) })
  assert.ok(
    clip.jobs.some((j) => j.kind === 'reel.assemble'),
    `the clips stage did not complete: ${JSON.stringify(clip.result)}`,
  )
  const take = takeOf(clip, t1.key).take_id
  const byTake = observesByTake(clip)
  assert.equal(byTake.get(take), 2, `${take} has ${byTake.get(take)} observe receipts`)
  for (const [other, count] of byTake) {
    if (other !== take) assert.equal(count, 1, `${other} has ${count} observe receipts`)
  }
  const takeObserved = clip.takeObservations.filter((o) => o.take_id === take)
  assert.equal(takeObserved.length, 1, `${take} has ${takeObserved.length} take observations`)
  assert.deepEqual(takeObserved[0]?.observation, seenClip(t1))
})

// ---------------------------------------------------------------- 7

test('7. a still whose witness is refused twice fails the run with a detail matching "is not an observation: ", two observe receipts for that picture and no observation row; a take the same, "is not a clip observation: ", two receipts, no take observation', async () => {
  const still = await stilled('r7-still', { value: refusedStill }, { value: refusedStill })
  assert.equal(still.result.status, 'failed', JSON.stringify(still.result))
  const id = pictureOf(still, barons.key).picture_id
  assert.match(
    String(still.result.detail),
    new RegExp(`the witness's answer for ${id} is not an observation: lighting: `),
  )
  assert.equal(observesByPicture(still).get(id), 2)
  assert.equal(still.observations.filter((o) => o.picture_id === id).length, 0)

  const clip = await videoed('r7-take', { value: refusedClip }, { value: refusedClip }, [t0, t1])
  assert.equal(clip.result.status, 'failed', JSON.stringify(clip.result))
  const take = takeOf(clip, t1.key).take_id
  assert.match(
    String(clip.result.detail),
    new RegExp(`the witness's answer for ${take} is not a clip observation: lighting: `),
  )
  assert.equal(observesByTake(clip).get(take), 2)
  assert.equal(clip.takeObservations.filter((o) => o.take_id === take).length, 0)
})

// ---------------------------------------------------------------- 8

test("8. a still whose witness is refused and whose second ask throws fails the run with the thrown error's words, one observe receipt for that picture and no observation row; a take the same, one observe receipt for that take and no take observation", async () => {
  const words = 'the witness is down for a moment'
  const still = await stilled('r8-still', { value: refusedStill }, { throws: words })
  assert.equal(still.result.status, 'failed', JSON.stringify(still.result))
  const id = pictureOf(still, barons.key).picture_id
  assert.match(String(still.result.detail), new RegExp(words))
  assert.doesNotMatch(String(still.result.detail), /is not an observation/)
  assert.equal(observesByPicture(still).get(id), 1)
  assert.equal(still.observations.filter((o) => o.picture_id === id).length, 0)

  const clip = await videoed('r8-take', { value: refusedClip }, { throws: words }, [t0, t1])
  assert.equal(clip.result.status, 'failed', JSON.stringify(clip.result))
  const take = takeOf(clip, t1.key).take_id
  assert.match(String(clip.result.detail), new RegExp(words))
  assert.doesNotMatch(String(clip.result.detail), /is not a clip observation/)
  assert.equal(observesByTake(clip).get(take), 1)
  assert.equal(clip.takeObservations.filter((o) => o.take_id === take).length, 0)
})
