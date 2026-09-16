import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import type { Framing } from '@cutroom/contracts'
import { DEFAULT_PLAN_SETTINGS, DEFAULT_STILLS_SETTINGS } from '@cutroom/pipeline'
import { FAKE_IMAGE_MODEL, fakeImage, fakeModel, fakeSensors } from '@cutroom/providers'
import { startWorker } from '@cutroom/worker'
import { startEngine, waitFor } from './engine/harness.ts'
import {
  THREE_RANKS,
  THREE_RANKS_PICS,
  pictureOf,
  seen,
  stills,
  stillsRequest,
  stillsScript,
} from './engine/stills.ts'

// reel-stills, Slice 3 — checks 19, 20 and 21 (docs/features/reel-stills.md): what each picture is
// made from. The canonical's two candidates render one entry with two framing values and differ in
// nothing else (D-032); a derived picture is made once from the chosen canonical, one hop (D-026,
// D-038); every prompt carries the style contract (D-069); and a worker that could not keep either
// promise refuses to start.

const [a, b] = THREE_RANKS_PICS as [
  (typeof THREE_RANKS_PICS)[number],
  (typeof THREE_RANKS_PICS)[number],
]

// ---------------------------------------------------------------- 19

test('19. the canonical is made twice from prompts that differ in their framing line and in nothing else, recorded with the axis; each derived picture is made once with the chosen canonical as its only reference; the canonical is made with none', async () => {
  // Candidate a is seen further back, so b scores higher and is chosen: a derived picture that took
  // candidate a — or the first picture made — as its reference is caught.
  const engine = await startEngine({
    worker: true,
    script: stillsScript(THREE_RANKS, THREE_RANKS_PICS, {
      witness: { [a.key]: seen(a, () => ({ prominence: 'midground' })) },
    }),
  })
  try {
    const ran = await stills(engine, stillsRequest('r19'))
    assert.equal(ran.result.status, 'completed', JSON.stringify(ran.result))
    const calls = engine.image.calls
    assert.deepEqual(
      calls.map((c) => c.pictureId),
      ['a1-shot-0-a', 'a1-shot-0-b', 'a1-shot-1-single', 'a1-shot-2-single'],
      'each picture is not made exactly once, in order',
    )
    const [first, second, ...derived] = calls as [
      (typeof calls)[number],
      (typeof calls)[number],
      ...typeof calls,
    ]

    // No reference for either candidate (D-030).
    assert.deepEqual(first.references, [])
    assert.deepEqual(second.references, [])

    // One line differs, and it is the framing line: medium for a, wide for b (the defaults).
    const aLines = first.prompt.split('\n')
    const bLines = second.prompt.split('\n')
    assert.equal(aLines.length, bLines.length, 'the two prompts have different numbers of lines')
    const differing = aLines.map((_, i) => i).filter((i) => aLines[i] !== bLines[i])
    assert.equal(
      differing.length,
      1,
      `the prompts differ on ${differing.length} lines: ${differing.join(', ')}`,
    )
    const at = differing[0] as number
    assert.match(
      aLines[at] as string,
      /\bframing\b/i,
      'the line that differs is not the framing line',
    )
    assert.match(aLines[at] as string, /\bmedium\b/)
    assert.doesNotMatch(aLines[at] as string, /\bwide\b/)
    assert.match(bLines[at] as string, /\bwide\b/)
    assert.equal(
      (aLines[at] as string).replace(/\bmedium\b/, 'wide'),
      bLines[at],
      'the framing lines differ in more than the value',
    )

    // Recorded with the axis: each candidate's row carries its framing and the prompt it was made from.
    const rowA = pictureOf(ran, a.key)
    const rowB = pictureOf(ran, b.key)
    assert.equal(rowA.framing, 'medium')
    assert.equal(rowB.framing, 'wide')
    assert.equal(rowA.prompt, first.prompt)
    assert.equal(rowB.prompt, second.prompt)
    assert.deepEqual(rowA.reference_ids, [])
    assert.equal(rowB.chosen, true, 'the fixture no longer chooses candidate b')

    // Each derived picture: once, with the chosen canonical — b — as its only reference (D-038).
    assert.equal(derived.length, 2)
    for (const call of derived) {
      assert.deepEqual(
        call.references,
        [{ pictureId: rowB.picture_id, path: rowB.path }],
        `${call.pictureId} was not made from the chosen canonical alone`,
      )
      const row = ran.pictures.find((p) => p.picture_id === call.pictureId)
      assert.equal(row?.framing, null, `${call.pictureId} records a framing it does not vary on`)
      assert.deepEqual(row?.reference_ids, [rowB.picture_id])
      assert.equal(row?.prompt, call.prompt)
    }
    for (const generation of ran.generations) {
      const call = calls.find((c) => c.pictureId === generation.picture_id)
      assert.deepEqual(
        generation.reference_ids,
        call?.references.map((r) => r.pictureId),
      )
    }
  } finally {
    await engine.stop()
  }
})

// ---------------------------------------------------------------- 20

test('20. every image prompt contains the style contracts text, and every generation_receipt records the style id and version, the model, the rate applied, the cost and fake', async () => {
  // A style and a rate that are not the defaults, so neither can be written into the code.
  const style = {
    id: 'style-ink',
    version: 7,
    text: 'ink wash on rag paper, gold leaf, candlelight',
  }
  const engine = await startEngine({
    worker: true,
    settings: { ...DEFAULT_PLAN_SETTINGS, imageRateCents: 17 },
    script: stillsScript(THREE_RANKS, THREE_RANKS_PICS),
  })
  try {
    const ran = await stills(engine, { ...stillsRequest('r20'), style })
    assert.equal(ran.result.status, 'completed', JSON.stringify(ran.result))
    assert.equal(engine.image.calls.length, 4)
    for (const call of engine.image.calls) {
      assert.ok(
        call.prompt.includes(style.text),
        `${call.pictureId}'s prompt does not carry the style contract`,
      )
      assert.equal(call.aspectRatio, '9:16')
    }
    assert.equal(ran.generations.length, 4, 'not one generation_receipt per image call')
    for (const generation of ran.generations) {
      const call = engine.image.calls.find((c) => c.pictureId === generation.picture_id)
      assert.ok(call !== undefined, `${generation.picture_id} has a receipt and no call`)
      assert.equal(generation.style_id, 'style-ink')
      assert.equal(generation.style_version, 7)
      assert.equal(generation.model, FAKE_IMAGE_MODEL)
      assert.equal(
        generation.rate_cents,
        17,
        'the receipt does not record the rate applied (D-028)',
      )
      assert.equal(generation.cost_cents, 0)
      assert.equal(generation.fake, true)
      assert.equal(generation.prompt, call.prompt)
    }
  } finally {
    await engine.stop()
  }
})

// ---------------------------------------------------------------- 21

test('21. a worker refuses to start when handed an image port that does not accept references, or two equal canonical framing values', async () => {
  const engine = await startEngine({
    worker: false,
    script: stillsScript(THREE_RANKS, THREE_RANKS_PICS),
  })
  const dir = mkdtempSync(join(tmpdir(), 'reel-stills-refuse-'))
  try {
    // A run is waiting, so a worker that started its loop before refusing would claim it.
    const submitted = await engine.http.submit(stillsRequest('r21'))
    assert.equal(submitted.status, 202)
    const base = {
      dbPath: engine.dbPath,
      pollMs: 10,
      model: fakeModel({}, { models: DEFAULT_PLAN_SETTINGS.models }),
      sensors: fakeSensors({}),
      questionsPath: join(dir, 'QUESTIONS.md'),
    }

    /**
     * Starts a worker that must refuse. One that starts instead is stopped before the test fails, so
     * a worker that wrongly started fails this check at once rather than keeping the process alive.
     */
    const refuses = async (
      options: Parameters<typeof startWorker>[0],
      why: RegExp,
      what: string,
    ) => {
      let started: Awaited<ReturnType<typeof startWorker>> | undefined
      try {
        started = await startWorker(options)
      } catch (error) {
        assert.match(String(error), why, `${what}: refused for another reason`)
        return
      }
      await started.stop()
      assert.fail(`${what}: the worker started`)
    }

    // D-026: a port that cannot carry a reference cannot make a derived picture.
    await refuses(
      { ...base, image: fakeImage({}, { artifactRoot: dir, acceptsReferences: false }) },
      /reference/i,
      'an image port that does not accept references',
    )
    // D-032: equal framing values would make the canonical's two prompts one prompt.
    const equal: Array<readonly [Framing, Framing]> = [
      ['medium', 'medium'],
      ['wide', 'wide'],
    ]
    for (const canonicalFraming of equal) {
      await refuses(
        {
          ...base,
          image: fakeImage({}, { artifactRoot: dir }),
          stillsSettings: { ...DEFAULT_STILLS_SETTINGS, canonicalFraming },
        },
        /framing/i,
        `framing ${canonicalFraming.join(' and ')}`,
      )
    }
    await new Promise((resolve) => setTimeout(resolve, 100))
    assert.deepEqual(
      engine.query<{ state: string }>('SELECT state FROM job').map((j) => j.state),
      ['queued'],
      'a refused worker claimed a job',
    )

    // The same options with a port that accepts references and two different framings do start.
    assert.equal(DEFAULT_STILLS_SETTINGS.canonicalFraming[0], 'medium')
    assert.equal(DEFAULT_STILLS_SETTINGS.canonicalFraming[1], 'wide')
    const worker = await startWorker({
      ...base,
      image: fakeImage({}, { artifactRoot: dir, acceptsReferences: true }),
      stillsSettings: { ...DEFAULT_STILLS_SETTINGS, canonicalFraming: ['closeUp', 'extremeWide'] },
    })
    try {
      await waitFor('the started worker to claim the run', () =>
        engine.query<{ state: string }>('SELECT state FROM job').some((j) => j.state !== 'queued'),
      )
    } finally {
      await worker.stop()
    }
  } finally {
    await engine.stop()
    rmSync(dir, { recursive: true, force: true })
  }
})
