import assert from 'node:assert/strict'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, relative } from 'node:path'
import { test } from 'node:test'
import { crc32, deflateSync } from 'node:zlib'
import type { MediaPort, PictureRef, VideoAnswer, VideoRequest } from '@cutroom/contracts'
import { DEFAULT_PLAN_SETTINGS } from '@cutroom/pipeline'
import {
  CLIP_EXTENSION,
  DEFAULT_VIDEO_WAIT_MS,
  EXPANSION_MODE_FIELD,
  H3_TURBO,
  NO_EXPANSION,
  UPLOAD_INITIATE_PATH,
  falVideo,
  ffmpegMedia,
  ffmpegTools,
  videoCostCents,
  videoPort,
  type VideoEntry,
} from '@cutroom/providers'
import { CLIPS_A_JOB, DEFAULT_LEASE_FLOOR_MS, LEASE_SLACK_MS, readSettings } from '@cutroom/service'
import { REPO } from './_repo.ts'
import { recordedFetch, type Wire } from './engine/wire.ts'
import { refusedService, startService, waitFor } from './engine/service.ts'
import { THREE_RANKS, THREE_RANKS_PICS, stillsRequest } from './engine/stills.ts'
import { videoRequest, videoScript } from './engine/video.ts'

// paid-path, Slice 6 — checks 14, 15, 16 and 17 (docs/features/paid-path.md): the fal VIDEO
// adapter, the download, the classification, the lease floor and the one worker. It is the fourth
// real adapter and the second on fal's queue.
//
// NOTHING HERE SPENDS AND NOTHING HERE NEEDS A KEY (S-111). Every call is answered from a fixture
// under tests/fixtures/wire, served by a `fetch` the adapter is handed, and the key every test
// uses is a made-up string whose only job is to be looked for in places it must never reach.
//
// WHAT THIS FILE IS ABOUT. D-007 hard-locks ONE video path at ONE resolution, and D-019's live
// spike found the trap the whole vertical product turns on: **`image-to-video` has no
// `aspect_ratio` field at all**, so the output ratio follows the keyframe and a request that
// carries the field — or that carries no picture — silently yields a 16:9 clip. Neither endpoint
// returns a seed, so reproducibility depends entirely on the caller's integer being sent and
// persisted. `prompt_expansion_mode` is required, and the expansion that comes back is recorded
// and shown to NO gate. Each of those is a silent failure, and each is asserted here rather than
// trusted.
//
// AND THE CARRIER IS THE PORT'S OWN ARM. `VideoAnswer` has `{ kind: 'unavailable' }`, which S-096
// built and `reel-takes` verified — so this adapter ANSWERS its transients where the image adapter
// throws them, and the worker's guarded port is what sends the call again (S-123's rule, S-125).

/** A key that is not a key: it exists to be searched for in every place it must not appear. */
const KEY = 'fal-test-key-7d41ba90c3e5'

/** A take id whose CRC-32 is the seed the engine makes for it (D-018). */
const TAKE = 'a1-shot-0-take-1'

/** The clip's own file on fal's host, as the recorded result names it. */
const CLIP_PATH = '/files/clip.mp4'

/** ffprobe, through the one MediaPort this repository has (S-125). Built once for the whole file. */
const probe: MediaPort['probe'] = ffmpegMedia(ffmpegTools()).probe

/**
 * What every test asks for: one take, five seconds, 768P, from a keyframe.
 *
 * The overrides are a loose map on purpose. Half of check 14 is about requests the TYPE already
 * refuses — 480P, a fractional duration, a mode this engine does not call — which is exactly the
 * request `validateVideoRequest` exists for: one built from a value typed `any` (S-080, D-071).
 */
function request(overrides: Record<string, unknown> = {}): VideoRequest {
  return {
    runId: 'run-video-1',
    takeId: TAKE,
    prompt: 'a papercraft library interior, the camera pushing slowly in on an open book',
    durationSeconds: 5,
    resolution: '768P',
    seed: crc32(TAKE),
    promptExpansionMode: 'balanced',
    mode: 'image-to-video',
    image: { pictureId: 'a1-shot-0-chosen', path: '' },
    ...overrides,
  } as VideoRequest
}

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

function chunk(type: string, data: Buffer): Buffer {
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data])
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([length, body, crc])
}

/** A real, tiny PNG — what a chosen keyframe on this machine is before it is uploaded. */
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

/**
 * A REAL MP4, made here by the ffmpeg this repository already requires (S-075).
 *
 * It is built rather than committed because `CLAUDE.md` forbids committing media, and it is real
 * rather than typed because the thing check 15 asserts is that the downloaded file is PROBED — and
 * a probe of bytes nobody made would prove nothing. Made once for the whole file: two seconds of
 * test pattern with a tone, which is what the stand-in video port already writes (D-087).
 */
let clipBytes: Buffer | undefined
async function clip(): Promise<Buffer> {
  if (clipBytes !== undefined) return clipBytes
  const dir = mkdtempSync(join(tmpdir(), 'cutroom-clipsrc-'))
  const path = join(dir, 'clip.mp4')
  try {
    const ran = await ffmpegTools().run('ffmpeg', [
      '-hide_banner',
      '-loglevel',
      'error',
      '-y',
      '-f',
      'lavfi',
      '-i',
      'testsrc2=size=108x192:rate=24:duration=2',
      '-f',
      'lavfi',
      '-i',
      'sine=frequency=220:sample_rate=48000:duration=2',
      '-c:v',
      'libx264',
      '-preset',
      'ultrafast',
      '-pix_fmt',
      'yuv420p',
      '-c:a',
      'aac',
      path,
    ])
    assert.equal(ran.code, 0, `ffmpeg could not make the clip this file serves: ${ran.stderr}`)
    clipBytes = readFileSync(path)
    return clipBytes
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

/** The clip fal keeps at its file host, served from bytes made on this machine. */
function clipWire(bytes: Uint8Array, at = CLIP_PATH): Wire {
  return {
    note: 'built in the test: the clip at fal’s own file host. Real MP4 bytes, made here by ffmpeg rather than committed, because CLAUDE.md forbids committing media.',
    provider: 'fal',
    call: 'clip',
    case: 'made',
    request: { method: 'GET', path: at },
    response: {
      status: 200,
      headers: { 'content-type': 'video/mp4' },
      base64: Buffer.from(bytes).toString('base64'),
    },
  }
}

/** A folder this test owns, and the chosen keyframe in it that image-to-video uploads. */
function folder(): { dir: string; picture: PictureRef; clean(): void } {
  const dir = mkdtempSync(join(tmpdir(), 'cutroom-video-'))
  const path = join(dir, 'run-video-1', 'a1-shot-0-chosen.png')
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, png(864, 1536))
  return {
    dir,
    picture: { pictureId: 'a1-shot-0-chosen', path },
    clean: () => rmSync(dir, { recursive: true, force: true }),
  }
}

/** The adapter, handed recorded wire and the real probe, with no waiting between polls. */
function adapter(
  names: readonly (string | Wire)[],
  artifactRoot: string,
  overrides: Partial<Parameters<typeof falVideo>[0]> = {},
) {
  const recorded = recordedFetch(names)
  const port = falVideo({
    key: KEY,
    artifactRoot,
    probe,
    fetch: recorded.fetch,
    pollMs: 0,
    ...overrides,
  })
  return { port, recorded }
}

/** The two upload calls a local keyframe goes through, and then the queue (check 15). */
const UPLOAD = ['fal-upload-initiate', 'fal-upload-stored']
const QUEUED = ['fal-video-submitted', 'fal-video-completed', 'fal-video-made']

/** Every string a value, a message or a file holds, so a search for a leak reads all of it. */
function everything(value: unknown): string {
  return JSON.stringify(value, (_k, v: unknown) => (v instanceof Error ? v.message : v)) ?? ''
}

/** A fault or an answer that names the key is the leak this slice exists to prevent (S-109). */
function noKey(value: unknown): true {
  assert.ok(!everything(value).includes(KEY), 'the key reached a message or an answer')
  return true
}

/** What the adapter sent as the body of its submit, parsed. */
function submitted(recorded: ReturnType<typeof recordedFetch>): Record<string, unknown> {
  const post = recorded.sent.find((s) => s.method === 'POST' && s.path.includes('-to-video'))
  assert.ok(post !== undefined, 'the adapter submitted nothing to the queue')
  return JSON.parse(post.body ?? '{}') as Record<string, unknown>
}

/** A clip made end to end from a keyframe, with everything the call sent and answered. */
async function madeFromPicture(f: ReturnType<typeof folder>, result = 'fal-video-made') {
  const bytes = await clip()
  const { port, recorded } = adapter(
    [...UPLOAD, 'fal-video-submitted', 'fal-video-completed', result, clipWire(bytes)],
    f.dir,
  )
  const answer = await port.generate(request({ image: f.picture }))
  return { answer, recorded, bytes }
}

/** The `made` arm, or a failure naming what came back instead. */
function made(answer: VideoAnswer): Extract<VideoAnswer, { kind: 'made' }> {
  assert.equal(answer.kind, 'made', everything(answer))
  return answer as Extract<VideoAnswer, { kind: 'made' }>
}

// ---------------------------------------------------------------- 14

test('14. a submitted image-to-video request carries 768P, whole seconds, the caller’s seed and prompt_expansion_mode — and NO aspect_ratio, which that endpoint does not have', async () => {
  const f = folder()
  try {
    const { answer, recorded } = await madeFromPicture(f)
    made(answer)
    const body = submitted(recorded)

    assert.equal(body['resolution'], '768P', 'the clip was not asked for at 768P (D-007, D-014)')
    assert.equal(body['duration'], 5, 'the duration is not the whole seconds that were asked for')
    // THE CALLER'S SEED (D-018): neither endpoint returns one, so the integer the engine made from
    // the take id is the only thing that makes a take reproducible at all.
    assert.equal(body['seed'], crc32(TAKE))
    assert.equal(body[EXPANSION_MODE_FIELD], 'balanced', 'prompt_expansion_mode was not sent')
    assert.equal(body['prompt'], request().prompt)
    assert.equal(
      body['image_url'],
      'https://v3.fal.media/files/elephant/reference-a1-shot-0-canonical.png',
    )

    // THE TRAP (D-018's schema fact 1, D-019): image-to-video HAS NO aspect_ratio FIELD. Sending
    // one would be ignored, and the ratio would follow the keyframe anyway — but a call site that
    // sends it is one that believes the ratio is being asked for, which is exactly the belief that
    // ships a 16:9 clip into a 9:16 product.
    assert.ok(
      !Object.hasOwn(body, 'aspect_ratio'),
      `image-to-video carried aspect_ratio ${String(body['aspect_ratio'])}`,
    )

    // And the endpoint it went to is the workhorse, not the other one.
    const post = recorded.sent.find((s) => s.method === 'POST' && s.path.includes('-to-video'))
    assert.equal(post?.path, `/${H3_TURBO.imageToVideoSlug}`)
  } finally {
    f.clean()
  }
})

test('14. a text-to-video request goes to the other endpoint and carries aspect_ratio 9:16, which is the only place the ratio can be asked for', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'cutroom-video-'))
  try {
    const bytes = await clip()
    const { port, recorded } = adapter(
      ['fal-video-worded', 'fal-video-completed', 'fal-video-made', clipWire(bytes)],
      dir,
    )
    const answer = await port.generate(
      request({ mode: 'text-to-video', aspectRatio: '9:16', image: undefined }),
    )
    made(answer)

    const body = submitted(recorded)
    assert.equal(body['aspect_ratio'], '9:16')
    assert.ok(!Object.hasOwn(body, 'image_url'), 'text-to-video carried a picture')
    const post = recorded.sent.find((s) => s.method === 'POST')
    assert.equal(post?.path, `/${H3_TURBO.textToVideoSlug}`)
    // No upload happened at all: there was no local picture to get to fal.
    assert.deepEqual(
      recorded.sent.filter((s) => s.path.startsWith('/storage/')),
      [],
    )
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('14. a request outside what the endpoint takes is refused BEFORE anything is sent: 480P, a fractional or out-of-range duration, a seed that is not the caller’s integer, a picture-less image-to-video, and a text-to-video with no ratio', async () => {
  const f = folder()
  try {
    const cases: Array<[string, Record<string, unknown>, RegExp]> = [
      ['480P', { resolution: '480P' }, /768P always|hard-locked/],
      ['4 seconds', { durationSeconds: 4 }, /whole seconds 5 to 15/],
      ['16 seconds', { durationSeconds: 16 }, /whole seconds 5 to 15/],
      ['5.5 seconds', { durationSeconds: 5.5 }, /whole seconds 5 to 15/],
      ['no seed', { seed: undefined }, /seed/],
      ['a fractional seed', { seed: 1.5 }, /seed/],
      [
        'image-to-video with no picture',
        { mode: 'image-to-video', image: undefined },
        /no picture/,
      ],
      [
        'text-to-video with no ratio',
        { mode: 'text-to-video', aspectRatio: undefined, image: undefined },
        /aspectRatio 9:16/,
      ],
      [
        'a mode this engine does not call',
        { mode: 'reference-to-video', image: undefined },
        /image-to-video and text-to-video only/,
      ],
    ]
    for (const [what, overrides, says] of cases) {
      const { port, recorded } = adapter([...UPLOAD, ...QUEUED], f.dir)
      await assert.rejects(
        port.generate(request({ image: f.picture, ...overrides })),
        (error: Error) => {
          assert.match(error.message, says, `${what}: ${error.message}`)
          assert.match(error.message, /refused before any request is made/, error.message)
          return noKey(error)
        },
        what,
      )
      // A call fal would reject is not one to pay to have rejected — and an UPLOAD before the
      // refusal would already have sent this machine's picture to a third party (S-109, D-022).
      assert.deepEqual(recorded.sent, [], `${what} sent something before refusing`)
    }
  } finally {
    f.clean()
  }
})

test('14. the answer’s expanded_prompt reaches the receipt and nothing else, and an answer carrying none says so rather than recording an empty string', async () => {
  const f = folder()
  try {
    const { answer } = await madeFromPicture(f)
    const receipt = made(answer).receipt
    assert.match(receipt.expandedPrompt, /^EXPANDED-BY-PROVIDER: /, receipt.expandedPrompt)

    // D-072: recorded, and shown to NO gate. The adapter's whole answer is a clip and a receipt,
    // so the assertion here is that the expansion is in the receipt and in no other field of it;
    // that no GATE is ever given it is `reel-render`'s check 24, on the verified pipeline.
    const elsewhere = { ...receipt, expandedPrompt: 'read' }
    assert.ok(
      !everything({ clip: made(answer).clip, elsewhere }).includes('EXPANDED-BY-PROVIDER'),
      'the expansion reached something other than the receipt’s own field',
    )

    const second = folder()
    try {
      const { answer: plain } = await madeFromPicture(second, 'fal-video-plain')
      assert.equal(made(plain).receipt.expandedPrompt, NO_EXPANSION)
    } finally {
      second.clean()
    }
  } finally {
    f.clean()
  }
})

test('14. no video slug and no fal endpoint is spelled anywhere but the one file that owns it', () => {
  // D-028 forbids a model slug at a call site and D-007 leaves exactly one video path, so the
  // slugs live in `fal/h3.ts` and the storage endpoint in `fal/upload.ts` — the one function that
  // gets a local picture to fal (Gate 2, check 15). A second spelling anywhere is a second place
  // to keep true.
  const files: string[] = []
  const walk = (dir: string): void => {
    for (const item of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, item.name)
      if (item.isDirectory()) {
        if (item.name === 'node_modules' || item.name === 'dist') continue
        walk(path)
      } else if (item.name.endsWith('.ts')) files.push(path)
    }
  }
  for (const root of ['packages', 'apps']) walk(join(REPO, root))

  const owners: Array<[string, readonly string[]]> = [
    [
      join(REPO, 'packages', 'providers', 'src', 'fal', 'h3.ts'),
      [H3_TURBO.imageToVideoSlug, H3_TURBO.textToVideoSlug],
    ],
    [join(REPO, 'packages', 'providers', 'src', 'fal', 'upload.ts'), [UPLOAD_INITIATE_PATH]],
  ]
  for (const [owner, spellings] of owners) {
    assert.ok(existsSync(owner), `${relative(REPO, owner)} does not exist`)
    for (const file of files) {
      if (file === owner) continue
      const text = readFileSync(file, 'utf8')
      for (const spelling of spellings) {
        assert.ok(
          !text.includes(spelling),
          `${relative(REPO, file)} spells ${spelling}: only ${relative(REPO, owner)} may`,
        )
      }
    }
  }
})

// ---------------------------------------------------------------- 15

test('15. the clip is downloaded under the artifact root and recorded BY ITS LOCAL PATH — no provider URL is stored anywhere', async () => {
  const f = folder()
  try {
    const { answer, recorded, bytes } = await madeFromPicture(f)
    const { clip: made1, receipt } = made(answer)

    const expected = join(f.dir, 'run-video-1', `${TAKE}${CLIP_EXTENSION}`)
    assert.equal(made1.path, expected)
    assert.equal(made1.takeId, TAKE)
    assert.ok(existsSync(expected), 'the clip was not written')
    assert.deepEqual(readFileSync(expected), Buffer.from(bytes), 'the file is not what was fetched')

    // A fal result URL EXPIRES and is not ours (D-022, D-086, D-087). Nothing the answer carries
    // holds it — not the clip, not the receipt, not the request id.
    const said = everything(answer)
    assert.ok(!said.includes('v3.fal.media'), `the provider's URL reached the answer: ${said}`)
    assert.ok(!said.includes(CLIP_PATH), `the provider's path reached the answer: ${said}`)
    assert.equal(receipt.requestId, '9b3e17c4-52a0-4f88-b1d7-6ae02c93d5aa')
    assert.equal(receipt.model, H3_TURBO.imageToVideoSlug)
    assert.equal(receipt.fake, false, 'a real receipt says it was a stand-in’s (S-036)')

    // The file was fetched from fal's own host WITHOUT our key: it has its own authorisation and
    // ours has no business there (S-109, D-022).
    const fetched = recorded.sent.find((s) => s.path === CLIP_PATH)
    assert.equal(fetched?.headers['authorization'] ?? '', '')
    noKey(recorded.sent.filter((s) => s.path === CLIP_PATH))
  } finally {
    f.clean()
  }
})

test('15. the clip is PROBED before the answer returns: bytes that are not a readable clip fail the call and are not left under the artifact root', async () => {
  const f = folder()
  try {
    const notAClip = Buffer.from('these bytes are not a video\n', 'utf8')
    const { port } = adapter(
      [
        ...UPLOAD,
        'fal-video-submitted',
        'fal-video-completed',
        'fal-video-made',
        clipWire(notAClip),
      ],
      f.dir,
    )
    await assert.rejects(port.generate(request({ image: f.picture })), (error: Error) => {
      assert.match(error.message, /ffprobe cannot read/, error.message)
      return noKey(error)
    })
    // Nothing that failed is left behind for a restart to find, which is the shape S-124 gave the
    // image adapter's frame check.
    assert.equal(
      existsSync(join(f.dir, 'run-video-1', `${TAKE}${CLIP_EXTENSION}`)),
      false,
      'a clip that is not a clip was left under the artifact root',
    )
  } finally {
    f.clean()
  }
})

test('15. the receipt’s cost is the CONFIGURED RATE applied to the SECONDS ASKED FOR, rounded up — and the rate comes from the entry, not from the call site', async () => {
  const f = folder()
  try {
    // The default entry: 0.5 cents a second since S-155 — 2.5 for five seconds, rounded up to 3.
    const { answer } = await madeFromPicture(f)
    assert.equal(made(answer).receipt.costCents, 3)
    assert.equal(videoCostCents(H3_TURBO, 5), 3)

    // An entry whose rate is NOT the default's. A rate spelled at the call site gives 3 here.
    const dearer: VideoEntry = { ...H3_TURBO, rateCentsPerSecond: 7.5 }
    const bytes = await clip()
    const { port } = adapter(
      [...UPLOAD, 'fal-video-submitted', 'fal-video-completed', 'fal-video-made', clipWire(bytes)],
      f.dir,
      { entry: dearer },
    )
    const dear = made(await port.generate(request({ image: f.picture, durationSeconds: 7 })))
    // 7.5 x 7 = 52.5, ROUNDED UP: `generation_receipt.cost_cents` is an integer column and the
    // budget guard rounds up, so a cost rounded the other way understates spend (S-059).
    assert.equal(dear.receipt.costCents, 53)
    assert.equal(videoCostCents(dearer, 7), 53)

    // The seconds ASKED FOR, never the seconds that came back: D-019's spike asked for 5 and got a
    // 5.184-second file, and a receipt priced on that is a number nothing can reproduce.
    // At 0.5 a second (S-155), each rounded up: 2.5 → 3, 4 → 4, 7.5 → 8.
    for (const [seconds, cents] of [
      [5, 3],
      [8, 4],
      [15, 8],
    ] as const) {
      assert.equal(videoCostCents(H3_TURBO, seconds), cents)
    }
  } finally {
    f.clean()
  }
})

test('15. a local keyframe reaches fal through the ONE uploadReference function, and our key is not sent to the presigned PUT', async () => {
  const f = folder()
  try {
    const { recorded } = await madeFromPicture(f)
    const [initiate, put, submit] = recorded.sent
    assert.equal(initiate?.path, UPLOAD_INITIATE_PATH, 'the keyframe was not uploaded')
    assert.equal(put?.method, 'PUT')
    assert.equal(put?.path, '/upload/elephant/reference-a1-shot-0-canonical.png')
    assert.equal(submit?.method, 'POST')

    // Our key goes on `initiate` and NOT on the PUT: the upload URL carries its own authorisation,
    // and a key of ours sent to a third party's storage is a key leaving this machine for somewhere
    // with no business holding it (S-109, D-022, S-124).
    assert.equal(initiate?.headers['authorization'], `Key ${KEY}`)
    assert.equal(put?.headers['authorization'] ?? '', '')
    assert.equal(submit?.headers['authorization'], `Key ${KEY}`)

    // Exactly ONE upload for one call: a second would be a second way to get a file to fal.
    assert.equal(recorded.sent.filter((s) => s.path === UPLOAD_INITIATE_PATH).length, 1)
  } finally {
    f.clean()
  }
})

test('15. both fal base URLs are honoured, and the adapter never follows a URL the provider chose for its queue', async () => {
  const f = folder()
  try {
    const bytes = await clip()
    const { port, recorded } = adapter(
      [...UPLOAD, 'fal-video-submitted', 'fal-video-completed', 'fal-video-made', clipWire(bytes)],
      f.dir,
      { baseUrl: 'http://127.0.0.1:9/', storageBaseUrl: 'http://127.0.0.1:8/' },
    )
    made(await port.generate(request({ image: f.picture })))

    for (const sent of recorded.sent) {
      if (sent.path === CLIP_PATH || sent.path.startsWith('/upload/')) continue // the provider's own
      const expected = sent.path.startsWith('/storage/') ? '8' : '9'
      assert.ok(
        sent.url.startsWith(`http://127.0.0.1:${expected}/`),
        `${sent.url} ignored the base URL it was given`,
      )
    }
    // `status_url` and `response_url` came back pointing at queue.fal.run and were not followed.
    assert.deepEqual(
      recorded.sent.filter((s) => s.url.includes('queue.fal.run')),
      [],
    )
  } finally {
    f.clean()
  }
})

// ---------------------------------------------------------------- 16

test('16. a queued job answering 429 or 5xx, a poll that times out, a connection error and the adapter’s own timeout are ANSWERED unavailable — the arm S-096 built, which this port has and the image port does not', async () => {
  const f = folder()
  try {
    const cases: Array<
      [string, readonly (string | Wire)[], Partial<Parameters<typeof falVideo>[0]>]
    > = [
      ['429 on the submit', [...UPLOAD, 'fal-video-busy'], {}],
      ['503 on the submit', [...UPLOAD, 'fal-video-down'], {}],
      [
        '503 on a status poll, after the job was accepted',
        [...UPLOAD, 'fal-video-submitted', 'fal-video-stalling'],
        {},
      ],
      [
        '503 on the clip download, after the clip was made',
        [
          ...UPLOAD,
          'fal-video-submitted',
          'fal-video-completed',
          'fal-video-made',
          'fal-clip-busy',
        ],
        {},
      ],
      [
        'a job still queued when the whole-job wait runs out',
        [...UPLOAD, 'fal-video-submitted', 'fal-video-queued'],
        { waitMs: 0 },
      ],
    ]
    for (const [what, names, overrides] of cases) {
      const { port, recorded } = adapter(names, f.dir, overrides)
      const answer = await port.generate(request({ image: f.picture }))
      assert.equal(answer.kind, 'unavailable', `${what}: ${everything(answer)}`)
      assert.ok(
        answer.kind === 'unavailable' && answer.detail.length > 0,
        `${what} answered unavailable with no detail`,
      )
      noKey(answer)
      // THE ADAPTER ONLY CLASSIFIES: it never sends again, waits or counts (S-096, D-024). The
      // sending is the worker's guarded port's, which is the one place that holds the spend.
      assert.equal(
        recorded.left().length,
        0,
        `${what} left ${recorded.left().join(', ')} unserved, so it sent the wrong calls`,
      )
      assert.ok(
        recorded.sent.filter((s) => s.method === 'POST' && s.path.includes('-to-video')).length <=
          1,
        `${what}: the adapter submitted the job more than once, which buys a second clip`,
      )
      // AND IT MADE NO CALL BEYOND THE ONES THE FIXTURES DESCRIBE. Counting submits alone is not
      // enough: an adapter that sent the whole call again would upload the keyframe again FIRST,
      // and the second upload would fail before a second submit was ever reached — which reads as
      // one submit and is two calls' worth of a re-send (session 41's break t7).
      assert.equal(
        recorded.sent.length,
        names.length,
        `${what}: the adapter made ${recorded.sent.length} calls for ${names.length} recorded ones`,
      )
    }

    // Nothing reaching the provider, and nothing coming back in time, are both transient too.
    for (const [what, failure] of [
      ['a connection error', () => Promise.reject(new Error('ECONNREFUSED 127.0.0.1:443'))],
      [
        'the adapter’s own timeout',
        () =>
          Promise.reject(
            Object.assign(new Error('the operation was aborted'), { name: 'TimeoutError' }),
          ),
      ],
    ] as const) {
      const port = falVideo({
        key: KEY,
        artifactRoot: f.dir,
        probe,
        fetch: failure as unknown as typeof globalThis.fetch,
        pollMs: 0,
      })
      const answer = await port.generate(
        request({ mode: 'text-to-video', aspectRatio: '9:16', image: undefined }),
      )
      assert.equal(answer.kind, 'unavailable', `${what}: ${everything(answer)}`)
    }
  } finally {
    f.clean()
  }
})

test('16. the WHOLE-JOB WAIT is not the per-request timeout: a job still queued is given the wait, and the detail names that figure', async () => {
  // S-125 split the two. One figure for both is what the image adapter has always used, and it is
  // wrong for a clip: a real one takes MINUTES, so a 120-second timeout shared with one HTTP call
  // would call a job fal was still working on `unavailable` — which sends the whole call again and
  // BUYS A SECOND CLIP. The figures here are milliseconds so the test costs nothing; what is
  // asserted is which of the two bounds the waiting.
  const dir = mkdtempSync(join(tmpdir(), 'cutroom-video-'))
  try {
    let polls = 0
    const queueForever: typeof globalThis.fetch = async (input, init) => {
      const url = new URL(input instanceof Request ? input.url : String(input))
      if ((init?.method ?? 'GET').toUpperCase() === 'POST') {
        return new Response(JSON.stringify({ request_id: 'r1', status: 'IN_QUEUE' }), {
          status: 200,
        })
      }
      polls += 1
      assert.ok(url.pathname.endsWith('/status'), url.pathname)
      return new Response(JSON.stringify({ status: 'IN_QUEUE', request_id: 'r1' }), { status: 200 })
    }
    const port = falVideo({
      key: KEY,
      artifactRoot: dir,
      probe,
      fetch: queueForever,
      pollMs: 1,
      timeoutMs: 25,
      waitMs: 120,
    })
    const answer = await port.generate(
      request({ mode: 'text-to-video', aspectRatio: '9:16', image: undefined }),
    )
    assert.equal(answer.kind, 'unavailable', everything(answer))
    assert.ok(
      answer.kind === 'unavailable' && answer.detail.includes('120 ms'),
      `the wait was bounded by something other than the whole-job wait: ${everything(answer)}`,
    )
    assert.ok(polls > 1, `the job was polled ${polls} times, so nothing waited at all`)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('16. a rejected request THROWS, and so does a body nothing can read — 401, 422, a 200 that is not JSON, and a 200 that parses and is not this wire', async () => {
  const f = folder()
  try {
    for (const [what, names, says] of [
      ['401', [...UPLOAD, 'fal-video-denied'], /401/],
      ['422', [...UPLOAD, 'fal-video-refused'], /422/],
      ['a 200 that is not JSON', [...UPLOAD, 'fal-video-garbled'], /is not JSON/],
    ] as const) {
      const { port } = adapter(names, f.dir)
      await assert.rejects(port.generate(request({ image: f.picture })), (error: Error) => {
        assert.match(error.message, says, `${what}: ${error.message}`)
        return noKey(error)
      })
    }

    // A body that is valid JSON and is NOT THIS WIRE is its own case: it fails at the schema where
    // the gateway's HTML fails at JSON.parse, and a fault must say WHICH — a stack trace further
    // down would describe neither (session 40's t6).
    const wrongShape: Wire = {
      note: 'built in the test: a 200 whose body parses as JSON and is not this wire',
      provider: 'fal',
      call: 'video',
      case: 'wrongshape',
      request: {
        method: 'GET',
        path: '/fal-ai/minimax-h3-turbo/requests/9b3e17c4-52a0-4f88-b1d7-6ae02c93d5aa',
      },
      response: { status: 200, body: { ok: true, clip: 'somewhere else' } },
    }
    const { port } = adapter(
      [...UPLOAD, 'fal-video-submitted', 'fal-video-completed', wrongShape],
      f.dir,
    )
    await assert.rejects(port.generate(request({ image: f.picture })), (error: Error) => {
      assert.match(error.message, /is not this wire/, error.message)
      return noKey(error)
    })
  } finally {
    f.clean()
  }
})

test('16. a job the provider ACCEPTED AND THEN FAILED throws carrying the provider’s own message — it is not a transient, because the provider did work and refused the result', async () => {
  const f = folder()
  try {
    const { port } = adapter(
      [...UPLOAD, 'fal-video-submitted', 'fal-video-halted', 'fal-video-broken'],
      f.dir,
    )
    await assert.rejects(port.generate(request({ image: f.picture })), (error: Error) => {
      assert.match(error.message, /the keyframe could not be decoded/, error.message)
      return noKey(error)
    })
    // And nothing was written: a job that failed leaves no clip under the artifact root.
    assert.equal(existsSync(join(f.dir, 'run-video-1', `${TAKE}${CLIP_EXTENSION}`)), false)

    // THE OTHER SHAPE OF THE SAME FAILURE, and the one that proves the FAILED branch itself. When
    // the result endpoint answers a non-200 — the case above — the fault comes from the send, and
    // the provider's message rides along whether the branch carries it or not: session 41's break
    // t3 swallowed the branch's own message and NOTHING failed. A job that failed and then
    // answered 200 anyway is the case where the branch is the only thing carrying it.
    const second = folder()
    try {
      const { port: silent } = adapter(
        [...UPLOAD, 'fal-video-submitted', 'fal-video-halted', 'fal-video-silent'],
        second.dir,
      )
      await assert.rejects(silent.generate(request({ image: second.picture })), (error: Error) => {
        assert.match(error.message, /accepted and then failed/, error.message)
        assert.match(error.message, /rejected by the safety checker/, error.message)
        return noKey(error)
      })
    } finally {
      second.clean()
    }
  } finally {
    f.clean()
  }
})

test('16. a queued job is polled until it is answered, and the keyframe is uploaded once however many polls it takes', async () => {
  const f = folder()
  try {
    const bytes = await clip()
    const { port, recorded } = adapter(
      [
        ...UPLOAD,
        'fal-video-submitted',
        'fal-video-queued',
        'fal-video-completed',
        'fal-video-made',
        clipWire(bytes),
      ],
      f.dir,
    )
    made(await port.generate(request({ image: f.picture })))
    assert.deepEqual(recorded.left(), [], 'a recorded call was never made')
    assert.equal(recorded.sent.filter((s) => s.path === UPLOAD_INITIATE_PATH).length, 1)
    assert.equal(recorded.sent.filter((s) => s.path.endsWith('/status')).length, 2)
  } finally {
    f.clean()
  }
})

// ---------------------------------------------------------------- 17

test('17. the lease floor is COMPUTED from the wait a clip is allowed, so the two cannot drift into a job that outlives its own lease', () => {
  // S-125: a real clip may sit on fal's queue for `DEFAULT_VIDEO_WAIT_MS`, and a clips job asks
  // for up to `CLIPS_A_JOB` of them. Nothing renews a lease (D-002), and a job claimed again pays
  // a second time for the take in flight (S-092, D-014) — so the floor is that arithmetic, not a
  // constant beside it.
  assert.equal(DEFAULT_LEASE_FLOOR_MS, CLIPS_A_JOB * DEFAULT_VIDEO_WAIT_MS + LEASE_SLACK_MS)
  assert.ok(
    DEFAULT_LEASE_FLOOR_MS >= CLIPS_A_JOB * DEFAULT_VIDEO_WAIT_MS,
    'the floor does not cover the wait the adapter itself allows',
  )
  assert.equal(CLIPS_A_JOB, 18, 'six shots at three takes each (D-112, D-024)')

  // And a service given a real video adapter takes the floor as its lease by default.
  const settings = readSettings({ CUTROOM_PROVIDER_VIDEO: 'fal', FAL_KEY: KEY })
  assert.equal(settings.leaseMs, DEFAULT_LEASE_FLOOR_MS)
  assert.equal(settings.planSettings.videoRateCentsPerSecond, H3_TURBO.rateCentsPerSecond)
})

test('17. a service given the REAL video adapter refuses a lease below the floor, naming both figures — and with the floor honoured it starts, so the refusal is about the lease and not about an adapter that does not exist', async () => {
  const refusal = await refusedService({
    env: {
      CUTROOM_PROVIDER_VIDEO: 'fal',
      FAL_KEY: KEY,
      CUTROOM_LEASE_MS: String(DEFAULT_LEASE_FLOOR_MS - 1),
    },
  })
  try {
    assert.notEqual(refusal.code, 0, 'the service started with a lease below the floor')
    assert.ok(refusal.output.includes(String(DEFAULT_LEASE_FLOOR_MS - 1)), refusal.output)
    assert.ok(refusal.output.includes(String(DEFAULT_LEASE_FLOOR_MS)), refusal.output)
    assert.match(refusal.output, /S-113/)
    assert.equal(refusal.database, false, 'the database was opened before the refusal')
    assert.ok(!refusal.output.includes(KEY), 'the refusal printed the key')
  } finally {
    refusal.clean()
  }

  // The same settings with the lease left alone: the port is BUILT, and the service listens. Slice
  // 1 could only prove the refusal against an adapter that did not exist yet.
  const service = await startService({
    env: {
      CUTROOM_PROVIDER_VIDEO: 'fal',
      FAL_KEY: KEY,
      CUTROOM_FAL_BASE_URL: 'http://127.0.0.1:9',
    },
  })
  try {
    assert.match(service.baseUrl, /^http:\/\/127\.0\.0\.1:\d+$/, service.output())
    assert.ok(!service.output().includes(KEY), 'the banner printed the key')
  } finally {
    await service.stop()
    service.clean()
  }
})

test('17. the service starts EXACTLY ONE worker: the composition root starts one, and two runs submitted together are never being worked on at the same time', async () => {
  // With one poller no second claim exists to take a job whose lease ran out while it was still
  // alive — which on a real run would pay a second time for the take in flight (S-113, S-092).
  //
  // THE COUNT IS READ FROM THE COMPOSITION ROOT ITSELF, and it has to be. Session 41's break w1
  // started a SECOND worker and was caught by nothing here: measured directly, twice, a second
  // worker changes NOTHING a job row can show on the free path — the first worker's `drain()`
  // claims every due job in a tight loop, and stand-in work never yields long enough for a second
  // poller's 500 ms timer to find anything due, so two runs take the same six seconds and
  // `count(*) where state = 'running'` never reaches two with one worker or with two. What a
  // second worker DOES change is the shutdown — only the one the root kept is stopped, so the
  // process never exits — and check 5 catches that. This is the assertion that holds the words of
  // this check, and it is the same kind of assertion as check 11's slug scan and check 4's rule
  // count: this repository's own source, read.
  const root = readFileSync(join(REPO, 'apps', 'service', 'src', 'service.ts'), 'utf8')
  assert.equal(
    root.split('startWorker(').length - 1,
    1,
    'the composition root starts more than one worker (S-113, D-002)',
  )

  const service = await startService({
    standIn: { model: videoScript(THREE_RANKS, THREE_RANKS_PICS) },
  })
  try {
    // ONE WHOLE VIDEO RUN AND ONE STILLS RUN, submitted together. The assertion is statistical, so
    // the window has to be wide enough for the sampling to mean something: measured, two stills
    // runs are over in about 400 ms and left twenty usable samples, which would pass whether there
    // were one worker or two. A video run is seconds, so it is the window — and the stills run is
    // the SECOND chain, the one a second poller would claim while the first was still being worked
    // on. Two video runs would do as well and cost twice the ffmpeg, beside a suite that is already
    // running `reel-render`'s whole journey in a child of its own (S-107).
    const runs: string[] = []
    const submissions = [
      videoRequest('one-worker-a'),
      { ...stillsRequest('one-worker-b'), options: { until: 'stills' as const, budgetCents: 300 } },
    ]
    for (const body of submissions) {
      const submitted = await service.http.submit(body)
      assert.equal(submitted.status, 202, JSON.stringify(submitted.json))
      runs.push(String(submitted.json.runId))
    }

    let samples = 0
    let most = 0
    let done = false
    const watching = (async () => {
      for (;;) {
        try {
          const running = service.query<{ n: number }>(
            "SELECT count(*) AS n FROM job WHERE state = 'running'",
          )[0]
          if (running !== undefined) {
            samples += 1
            most = Math.max(most, running.n)
          }
        } catch {
          // The worker holds the file while it writes; a read that loses the race is not a sample.
        }
        if (done) return
        await new Promise((resolve) => setTimeout(resolve, 20))
      }
    })()

    for (const runId of runs) {
      await waitFor(`run ${runId} to finish`, async () => {
        const { json } = await service.http.status(runId)
        return json.state === 'finished'
      })
    }
    done = true
    await watching

    // KEPT, AND WHAT IT IS WORTH IS SAID ABOVE. It holds the property the words name — no two jobs
    // of one database are worked on at once — and it would catch a runner that really did
    // interleave. On the stand-in path it cannot tell one worker from two, which is why the count
    // above is read from the source and not inferred from this.
    assert.ok(samples > 50, `only ${samples} usable samples, so "never two at once" proves little`)
    assert.ok(most > 0, 'no job was ever seen running, so nothing was observed at all')
    assert.equal(most, 1, `${most} jobs were running at once: more than one worker is polling`)
  } finally {
    await service.stop()
    service.clean()
  }
})

// ---------------------------------------------------------------- the factory

test('17. the factory builds the real video port, whose probe is the engine’s own ffprobe, and one with no key refuses before anything else', async () => {
  const tools = ffmpegTools()
  const dir = mkdtempSync(join(tmpdir(), 'cutroom-video-'))
  try {
    const options = {
      artifactRoot: dir,
      models: DEFAULT_PLAN_SETTINGS.models,
      tools,
      env: { FAL_KEY: KEY },
    }
    const port = videoPort('fal', options)
    assert.equal(typeof port.generate, 'function')

    // THE PROBE THE FACTORY WIRES IS THE REAL ONE (S-125). Every other test here hands the adapter
    // a probe of its own, so nothing asked what a SERVICE's video port probes with: session 41's
    // break p2 handed it one that answers without ffprobe and nothing failed. This builds the port
    // the way `apps/service` builds it and serves it bytes that are no clip.
    const notAClip = Buffer.from('these bytes are not a video\n', 'utf8')
    const recorded = recordedFetch([
      'fal-video-worded',
      'fal-video-completed',
      'fal-video-made',
      clipWire(notAClip),
    ])
    const wired = videoPort('fal', {
      ...options,
      transport: { fetch: recorded.fetch, falBaseUrl: 'http://127.0.0.1:9' },
    })
    await assert.rejects(
      wired.generate(request({ mode: 'text-to-video', aspectRatio: '9:16', image: undefined })),
      (error: Error) => {
        assert.match(error.message, /ffprobe cannot read/, error.message)
        return noKey(error)
      },
    )

    assert.throws(
      () => videoPort('fal', { ...options, env: {} }),
      (error: Error) => {
        assert.match(error.message, /FAL_KEY is not in the environment/, error.message)
        return noKey(error)
      },
    )
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
