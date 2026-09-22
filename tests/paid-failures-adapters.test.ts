import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { crc32, deflateSync } from 'node:zlib'
import { z } from 'zod'
import type { ImageRequest, MediaPort, VideoRequest } from '@cutroom/contracts'
import {
  H3_TURBO,
  PICTURE_FRAME,
  falImage,
  falVideo,
  ffmpegMedia,
  ffmpegTools,
  imageCostCents,
  imageEntry,
  isSpent,
  isUnavailable,
  minimaxModel,
  minimaxNarration,
  videoCostCents,
} from '@cutroom/providers'
import { DEFAULT_PLAN_SETTINGS } from '@cutroom/pipeline'
import { recordedFetch, type Wire } from './engine/wire.ts'

// paid-failures, Slice 2 — checks 1, 2 and 3 (docs/features/paid-failures.md): what a real adapter
// throws once the provider has made something, and what it still throws before that.
//
// NOTHING HERE SPENDS AND NOTHING HERE NEEDS A KEY (S-111). Every call is answered from a fixture
// under tests/fixtures/wire, served by a `fetch` the adapter is handed, and the key every test uses
// is a made-up string whose only job is to be looked for where it must never reach.
//
// THE LINE EVERY ADAPTER DRAWS IS "HAS THE PROVIDER MADE SOMETHING YET" (S-142). Before it, a
// failure is our request being wrong, or the provider having made nothing: a fault, or
// `Unavailable`. After it, the call has spent whatever it spends and what failed is OUR reading of
// the answer — so it is `Spent`, carrying the port, the wire that was called, the cost our
// configured rate gives that call, and a detail. **A paid call that leaves no row is spend the
// budget guard reads as zero**, and two image calls on the first real reel did exactly that
// (S-133).

const KEY = 'fal-test-key-2f9c41d7e6b0'
const MINIMAX_KEY = 'canary-not-a-real-key-39'

/** D-006's table, as the service reads it: the role-to-model routing this adapter is built with. */
const MODELS = DEFAULT_PLAN_SETTINGS.models

/** The shape a structured call asks for here. Any schema will do: none of these answers parse. */
const UNITS = z.object({ units: z.array(z.object({ sentence: z.number(), shot: z.string() })) })

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

function chunk(type: string, data: Buffer): Buffer {
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data])
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([length, body, crc])
}

/** A real, tiny PNG — what a reference picture on this machine is before it is uploaded. */
function png(width: number, height: number): Buffer {
  const header = Buffer.alloc(13)
  header.writeUInt32BE(width, 0)
  header.writeUInt32BE(height, 4)
  header[8] = 8
  header[9] = 2
  const row = Buffer.alloc(1 + width * 3)
  const pixels = Buffer.concat(Array.from({ length: height }, () => row))
  return Buffer.concat([
    SIGNATURE,
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(pixels)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function folder(): { dir: string; clean(): void } {
  const dir = mkdtempSync(join(tmpdir(), 'cutroom-lost-'))
  return { dir, clean: () => rmSync(dir, { recursive: true, force: true }) }
}

const imageRequest = (overrides: Partial<ImageRequest> = {}): ImageRequest => ({
  runId: 'run-lost-1',
  pictureId: 'a1-shot-0-canonical',
  prompt: 'a keyframe of the subject, upright',
  references: [],
  aspectRatio: '9:16',
  ...overrides,
})

const TAKE = 'a1-shot-0-take-1'
const CLIP_PATH = '/files/clip.mp4'

/** The recorded submit is image-to-video's, which is the mode a reel's shots are made in (D-026). */
const videoRequest = (image: { pictureId: string; path: string }): VideoRequest => ({
  runId: 'run-lost-1',
  takeId: TAKE,
  prompt: 'the subject, upright, the camera pushing slowly in',
  durationSeconds: 5,
  resolution: '768P',
  seed: crc32(TAKE),
  promptExpansionMode: 'balanced',
  mode: 'image-to-video',
  image,
})

const image = (names: readonly (string | Wire)[], artifactRoot: string) => {
  const recorded = recordedFetch(names)
  return {
    recorded,
    port: falImage({
      key: KEY,
      entry: imageEntry(),
      artifactRoot,
      fetch: recorded.fetch,
      pollMs: 0,
    }),
  }
}

const probe: MediaPort['probe'] = ffmpegMedia(ffmpegTools()).probe

const video = (names: readonly (string | Wire)[], artifactRoot: string) => {
  const recorded = recordedFetch(names)
  return {
    recorded,
    port: falVideo({ key: KEY, artifactRoot, probe, fetch: recorded.fetch, pollMs: 0 }),
  }
}

/** The clip's own file on fal's host, carrying whatever bytes a case needs. */
const clipWire = (bytes: Uint8Array): Wire => ({
  note: 'built in the test: what fal’s file host serves for this clip.',
  provider: 'fal',
  call: 'clip',
  case: 'lost',
  request: { method: 'GET', path: CLIP_PATH },
  response: {
    status: 200,
    headers: { 'content-type': 'video/mp4' },
    base64: Buffer.from(bytes).toString('base64'),
  },
})

/** A completed image job whose RESULT body is not this wire at all. */
const resultWire = (body: unknown): Wire => ({
  note: 'built in the test: a completed job whose result body is not this wire.',
  provider: 'fal',
  call: 'image',
  case: 'lost',
  request: {
    method: 'GET',
    path: '/fal-ai/flux-2-pro/requests/7f2c1a80-3b44-4d61-9d0e-5c8ab2e41f37',
  },
  response: { status: 200, headers: { 'content-type': 'application/json' }, body },
})

/** The receipt a `Spent` carries, read off a thrown thing this file already knows is one. */
const receiptOf = (error: unknown): Record<string, unknown> =>
  (error as { receipt: Record<string, unknown> }).receipt

/** Every string a thrown thing holds, so a search for a leak reads all of it. */
const everything = (error: unknown): string =>
  JSON.stringify(error, Object.getOwnPropertyNames(error ?? {}))

// ---------------------------------------------------------------- 1

const CHECK_1 =
  '1. every real adapter with an answer in hand throws Spent rather than a plain fault, carrying the wire it called and the configured rate applied to what it asked for'

test(`${CHECK_1} — the image adapter, on a job fal completed and we cannot use`, async () => {
  const { dir, clean } = folder()
  try {
    const entry = imageEntry()
    const cost = imageCostCents(entry, { frame: entry.frame, references: [] })
    assert.ok(cost > 0, 'the configured image entry costs nothing, so this check proves nothing')

    const cases: ReadonlyArray<readonly [string, readonly (string | Wire)[], RegExp]> = [
      [
        'a result body that is not this wire',
        [
          'fal-image-bare',
          'fal-image-completed',
          resultWire({ ok: true, message: 'made somewhere else' }),
        ],
        /is not this wire/,
      ],
      [
        'no picture at all',
        ['fal-image-bare', 'fal-image-completed', 'fal-image-empty'],
        /carried no picture at all/,
      ],
      [
        'a frame the entry refuses',
        ['fal-image-bare', 'fal-image-completed', 'fal-image-sideways', 'fal-picture-landscape'],
        /is not 9:16/,
      ],
    ]

    for (const [name, wires, says] of cases) {
      const { port } = image(wires, dir)
      await assert.rejects(port.generate(imageRequest()), (error: unknown) => {
        assert.ok(isSpent(error), `${name} was not Spent, so it leaves no row`)
        assert.ok(!isUnavailable(error), `${name} was classified transient`)
        const receipt = receiptOf(error)
        assert.equal(receipt.port, 'image')
        // THE WIRE THAT WAS ACTUALLY CALLED — this call carries no reference, so the text wire
        // (S-128). Never the entry's edit slug whatever was sent.
        assert.equal(receipt.model, entry.textSlug)
        // The configured entry's rate applied to this call: the same arithmetic the receipt of a
        // picture that WAS made carries, so a lost call and a made one cannot be priced apart.
        assert.equal(receipt.costCents, cost)
        assert.match(String(receipt.detail), says)
        return true
      })
    }

    // Nothing a failed call made is left behind: a picture refused by its frame is thrown before
    // the file is written (S-124), so there is nothing under the root for a restart to find.
    assert.deepEqual(readdirSync(dir), [], 'a lost image call left a file under the artifact root')
  } finally {
    clean()
  }
})

test(`${CHECK_1} — the video adapter, on a clip it downloaded and cannot read`, async () => {
  const { dir, clean } = folder()
  try {
    const keyframe = join(dir, 'run-lost-1', 'a1-shot-0-chosen.png')
    mkdirSync(dirname(keyframe), { recursive: true })
    writeFileSync(keyframe, png(PICTURE_FRAME.width, PICTURE_FRAME.height))
    const request = videoRequest({ pictureId: 'a1-shot-0-chosen', path: keyframe })
    const cost = videoCostCents(H3_TURBO, request.durationSeconds)
    assert.ok(cost > 0, 'the configured video entry costs nothing, so this check proves nothing')

    // fal made the clip and billed for it, and what came down is not a clip ffprobe can read. This
    // is the most expensive single call the engine makes, and it used to leave no row at all.
    const { port } = video(
      [
        'fal-upload-initiate',
        'fal-upload-stored',
        'fal-video-submitted',
        'fal-video-completed',
        'fal-video-made',
        clipWire(Buffer.from('these bytes are not a video\n', 'utf8')),
      ],
      dir,
    )
    await assert.rejects(port.generate(request), (error: unknown) => {
      assert.ok(isSpent(error), 'a clip that was paid for and is unreadable left no row')
      const receipt = receiptOf(error)
      assert.equal(receipt.port, 'video')
      assert.equal(receipt.model, H3_TURBO.imageToVideoSlug)
      assert.equal(receipt.costCents, cost)
      assert.match(String(receipt.detail), /ffprobe cannot read/)
      return true
    })
  } finally {
    clean()
  }
})

test(`${CHECK_1} — the model adapter, on the shapes a 200 has actually answered with`, async () => {
  // Each of these is a 200 this wire has given: the schema echoed back (S-136), an answer cut off
  // mid-JSON (S-140), and a gateway's HTML where the body should be. All three are one finding —
  // the call was made, and what came back could not be read.
  const cases: ReadonlyArray<readonly [string, string, RegExp]> = [
    ['the schema echoed back', 'minimax-chat-echo', /answered THE SCHEMA/],
    ['an answer cut off mid-JSON', 'minimax-chat-cut', /cut off mid-answer/],
    ['a body that is not JSON at all', 'minimax-chat-garbled', /is not JSON/],
  ]
  for (const [name, fixture, says] of cases) {
    const recorded = recordedFetch([fixture])
    const port = minimaxModel({ key: MINIMAX_KEY, models: MODELS, fetch: recorded.fetch })
    await assert.rejects(
      port.structured({
        role: 'planner',
        prompt: 'Cut these sentences.',
        schema: UNITS,
        temperature: 0,
      }),
      (error: unknown) => {
        assert.ok(isSpent(error), `${name} left no row, and the call was made`)
        const receipt = receiptOf(error)
        assert.equal(receipt.port, 'model')
        // Zero while the Token Plan covers these calls (S-129). The ROW is what this is for.
        assert.equal(receipt.costCents, 0)
        assert.match(String(receipt.detail), says)
        return true
      },
    )
  }
})

test(`${CHECK_1} — the narration adapter, on words it spoke whose timings it cannot read`, async () => {
  const { dir, clean } = folder()
  try {
    // T2A answered 200 and spoke; the subtitle file behind it is an error document. The words are
    // said and paid for, whatever the Token Plan makes the figure.
    const recorded = recordedFetch(['minimax-t2a-redacted', 'minimax-subtitle-garbled'])
    const port = minimaxNarration({ key: MINIMAX_KEY, artifactRoot: dir, fetch: recorded.fetch })
    await assert.rejects(
      port.speak({
        runId: 'run-lost-1',
        narrationId: 'a1-shot-0-narration',
        text: 'Radar did not win the battle. The telephone did.',
        voice: 'English_Wise_Woman',
      }),
      (error: unknown) => {
        assert.ok(isSpent(error), 'a narration that was spoken and unusable left no row')
        const receipt = receiptOf(error)
        assert.equal(receipt.port, 'speech')
        assert.equal(receipt.costCents, 0)
        return true
      },
    )
  } finally {
    clean()
  }
})

// ---------------------------------------------------------------- 2

const CHECK_2 =
  '2. a failure BEFORE the provider made anything is not Spent and is what it was: a slug outside the registry, more references than the entry takes, a 400, a 401, a 422 and a rejected submit throw a plain fault, and a 429, a 5xx, a connection error and a timeout are still Unavailable'

test(`${CHECK_2} — nothing was made, so nothing is recorded`, async () => {
  const { dir, clean } = folder()
  try {
    // A transient before anything was made: still Unavailable, and never Spent. A run recording
    // these would be recording calls the provider says it did not make (I-11).
    for (const name of ['fal-image-busy', 'fal-image-down']) {
      const { port } = image([name], dir)
      await assert.rejects(port.generate(imageRequest()), (error: unknown) => {
        assert.ok(isUnavailable(error), `${name} stopped being transient`)
        assert.ok(!isSpent(error), `${name} was recorded as spend, and nothing was made`)
        return true
      })
    }

    // A fault before anything was made: a plain fault, and never Spent.
    for (const name of ['fal-image-denied', 'fal-image-refused']) {
      const { port } = image([name], dir)
      await assert.rejects(port.generate(imageRequest()), (error: unknown) => {
        assert.ok(!isSpent(error), `${name} was recorded as spend, and nothing was made`)
        assert.ok(!isUnavailable(error), `${name} was answered unavailable`)
        return true
      })
    }

    // A request this adapter refuses before it sends anything at all.
    const path = join(dir, 'reference.png')
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, png(PICTURE_FRAME.width, PICTURE_FRAME.height))
    const entry = imageEntry()
    const tooMany = Array.from({ length: entry.maxReferences + 1 }, (_, i) => ({
      pictureId: `a1-shot-${i}-canonical`,
      path,
    }))
    const { port } = image([], dir)
    await assert.rejects(port.generate(imageRequest({ references: tooMany })), (error: unknown) => {
      assert.ok(!isSpent(error), 'a request that was never sent was recorded as spend')
      return true
    })

    // And the model adapter's own two: a transient status, and a request that was wrong.
    for (const [name, spent] of [
      ['minimax-chat-busy', false],
      ['minimax-chat-denied', false],
    ] as const) {
      const recorded = recordedFetch([name])
      const port = minimaxModel({ key: MINIMAX_KEY, models: MODELS, fetch: recorded.fetch })
      await assert.rejects(
        port.structured({ role: 'planner', prompt: 'Cut these.', schema: UNITS, temperature: 0 }),
        (error: unknown) => {
          assert.equal(isSpent(error), spent, `${name} was recorded as spend`)
          return true
        },
      )
    }
  } finally {
    clean()
  }
})

// ---------------------------------------------------------------- 3

const CHECK_3 = '3. no Spent carries a key, a presigned URL or a query string in its detail'

test(`${CHECK_3} — what a row would hold, read off every Spent this file can make`, async () => {
  const { dir, clean } = folder()
  try {
    const { port } = image(
      ['fal-image-bare', 'fal-image-completed', 'fal-image-sideways', 'fal-picture-landscape'],
      dir,
    )
    await assert.rejects(port.generate(imageRequest()), (error: unknown) => {
      const said = everything(error)
      assert.ok(!said.includes(KEY), 'a Spent carries the key')
      assert.ok(!said.includes('?'), `a Spent carries a query string: ${said}`)
      return true
    })

    const recorded = recordedFetch(['minimax-chat-cut'])
    const model = minimaxModel({ key: MINIMAX_KEY, models: MODELS, fetch: recorded.fetch })
    await assert.rejects(
      model.structured({ role: 'planner', prompt: 'Cut these.', schema: UNITS, temperature: 0 }),
      (error: unknown) => {
        const said = everything(error)
        assert.ok(!said.includes(MINIMAX_KEY), 'a Spent carries the key')
        return true
      },
    )

    // The narration path is where a presigned URL exists at all (D-022, S-109): the subtitle file
    // is fetched from one, and no row, message or receipt may hold it.
    const spoke = recordedFetch(['minimax-t2a-redacted', 'minimax-subtitle-garbled'])
    const narration = minimaxNarration({ key: MINIMAX_KEY, artifactRoot: dir, fetch: spoke.fetch })
    await assert.rejects(
      narration.speak({
        runId: 'run-lost-1',
        narrationId: 'a1-shot-0-narration',
        text: 'Radar did not win the battle. The telephone did.',
        voice: 'English_Wise_Woman',
      }),
      (error: unknown) => {
        const said = everything(error)
        assert.ok(!said.includes(MINIMAX_KEY), 'a Spent carries the key')
        assert.ok(!said.includes('OSSAccessKeyId'), 'a Spent carries a presigned URL')
        assert.ok(!said.includes('Signature='), 'a Spent carries a presigned URL')
        return true
      },
    )
  } finally {
    clean()
  }
})
