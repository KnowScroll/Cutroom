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
import { dirname, join, relative, isAbsolute } from 'node:path'
import { test } from 'node:test'
import { crc32, deflateSync } from 'node:zlib'
import type { ImageRequest, PictureRef } from '@cutroom/contracts'
import { estimate } from '@cutroom/pipeline'
import {
  CONFIGURED_IMAGE_SLUG,
  FAL_BASE_URL,
  FAL_STORAGE_BASE_URL,
  IMAGE_REGISTRY,
  PICTURE_FRAME,
  PICTURE_MIN_SHORT_SIDE,
  admitEntry,
  falImage,
  ffmpegTools,
  imageCostCents,
  imageEntry,
  imagePort,
  imageRateCents,
  isUnavailable,
  cheapestEntry,
  uploadReference,
  wireFor,
  type ImageEntry,
} from '@cutroom/providers'
import { SETTING_NAMES, readSettings } from '@cutroom/service'
import { REPO } from './_repo.ts'
import { recordedFetch, type Wire } from './engine/wire.ts'
import { refusedService, startService, waitFor } from './engine/service.ts'
import { THREE_RANKS, THREE_RANKS_PICS, stillsRequest } from './engine/stills.ts'
import { videoScript } from './engine/video.ts'

// paid-path, Slice 5 — checks 11, 12 and 13 (docs/features/paid-path.md): the fal image adapter
// and D-028's closed registry, the third real adapter and the first on a second provider and a
// second key.
//
// NOTHING HERE SPENDS AND NOTHING HERE NEEDS A KEY (S-111). Every call is answered from a fixture
// under tests/fixtures/wire, served by a `fetch` the adapter is handed, and the key every test
// uses is a made-up string whose only job is to be looked for in places it must never reach.
//
// WHAT THIS FILE IS ABOUT. D-028 makes the image model a CLOSED REGISTRY with one configured
// default, because the axis that separates the four candidates — identity retention — has never
// been measured, and hardcoding one now would commit on the one axis with no evidence. Two of its
// requirements FAIL SILENTLY and are therefore asserted rather than trusted: an entry that cannot
// take a reference picture makes the derive step impossible (D-026), and a keyframe that is not
// 9:16 yields a LANDSCAPE CLIP WITH NO ERROR, because image-to-video has no aspect_ratio field
// (D-019). The second one is checked on the produced FRAME — never on the width and height the
// provider reports, which is the number an adapter that wanted to pass would read.

/** D-027 Config A plans four image calls: one canonical pair, two derived, two bare (S-046). */
const PLANNED_IMAGE_CALLS = 4

/** A ceiling below EITHER configured entry’s estimate, so admission refuses whichever is set. */
const CEILING = 20

/** A key that is not a key: it exists to be searched for in every place it must not appear. */
const KEY = 'fal-test-key-2f9c41d7e6b0'

/** What every test asks for. One reference at most — D-027's one hop, never a chain. */
function request(overrides: Partial<ImageRequest> = {}): ImageRequest {
  return {
    runId: 'run-image-1',
    pictureId: 'a1-shot-0-canonical',
    prompt: 'a keyframe of the subject, upright',
    references: [],
    aspectRatio: '9:16',
    ...overrides,
  }
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

/** A folder this test owns, and a reference picture in it. */
function folder(): { dir: string; reference: PictureRef; clean(): void } {
  const dir = mkdtempSync(join(tmpdir(), 'cutroom-image-'))
  const path = join(dir, 'run-image-1', 'a1-shot-0-canonical.png')
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, png(PICTURE_FRAME.width, PICTURE_FRAME.height))
  return {
    dir,
    reference: { pictureId: 'a1-shot-0-canonical', path },
    clean: () => rmSync(dir, { recursive: true, force: true }),
  }
}

/** The adapter, handed recorded wire and the configured entry, with no waiting between polls. */
function adapter(names: readonly (string | Wire)[], artifactRoot: string, entry?: ImageEntry) {
  const recorded = recordedFetch(names)
  const port = falImage({
    key: KEY,
    entry: entry ?? imageEntry(),
    artifactRoot,
    fetch: recorded.fetch,
    pollMs: 0,
  })
  return { port, recorded }
}

/** Everything after the submit: the poll, the result, and the file itself. */
const ANSWERED = ['fal-image-completed', 'fal-image-made', 'fal-picture-vertical']

/**
 * The calls one picture with NO reference is made of — the canonical, which D-027 makes from
 * nothing. It submits to the entry's TEXT wire, which is a different path from its edit wire and
 * therefore a fixture of its own (S-128); everything after the submit is the same, because fal
 * polls the first two segments of a slug and both wires of one model share them.
 */
const MADE = ['fal-image-bare', ...ANSWERED]

/** The calls one picture WITH a reference is made of: the entry's edit wire. */
const MADE_EDIT = ['fal-image-submitted', ...ANSWERED]

/** The two upload calls that come first when the call carries a reference. */
const UPLOAD = ['fal-upload-initiate', 'fal-upload-stored']

/**
 * A fault names THE WIRE THAT WAS CALLED, and not the entry's other one (S-128).
 *
 * `includes(textSlug)` alone would be satisfied by a message naming the edit slug, since the edit
 * slug is the text slug plus a segment — so the other wire is asserted absent as well. Which model
 * produced a bad frame is the finding D-028's bake-off is made of, and which of its two wires
 * produced it is what an operator reads next.
 */
function namesWire(message: string, references: number): void {
  const entry = imageEntry()
  const called = wireFor(entry, references)
  const other = called === entry.slug ? entry.textSlug : entry.slug
  assert.ok(message.includes(called), `the fault does not name '${called}': ${message}`)
  assert.ok(!message.includes(other), `the fault names the wire that was NOT called: ${message}`)
}

/** A fault that names the key is the leak this slice exists to prevent (S-109, D-022). */
function noKey(error: unknown): true {
  assert.ok(!everything(error).includes(KEY), 'a fault message holds the key')
  return true
}

/** Every string a value, a message or a file holds, so a search for a leak reads all of it. */
function everything(value: unknown): string {
  return JSON.stringify(value, (_k, v: unknown) => (v instanceof Error ? v.message : v)) ?? ''
}

// ---------------------------------------------------------------- 11

test('11. the registry holds D-028’s four admitted entries with their rates and limits', () => {
  // Read off BUDGET.md's verified table (2026-09-11), which D-028 admits at those rates. The
  // point of the assertion is that the rate is DATA, one figure per entry, and that a later
  // session cannot quietly drop an entry or move a price without this failing.
  assert.deepEqual(
    IMAGE_REGISTRY.map((e) => e.slug),
    [
      'fal-ai/nano-banana-pro/edit',
      'fal-ai/nano-banana-2/edit',
      'bytedance/seedream/v5/lite/edit',
      'fal-ai/flux-2-pro/edit',
    ],
  )
  assert.deepEqual(
    IMAGE_REGISTRY.map((e) => e.maxReferences),
    [14, 14, 10, 9],
  )
  assert.deepEqual(
    IMAGE_REGISTRY.map((e) => (e.rate.kind === 'perImage' ? e.rate.cents : e.rate.firstMpCents)),
    [15, 8, 3.5, 3],
  )
  // The one per-megapixel entry bills input AND output, which is BUDGET.md's second correction.
  const flux = imageEntry('fal-ai/flux-2-pro/edit')
  assert.equal(flux.rate.kind, 'perMegapixel')

  // S-110 configures the cheapest admitted entry for the first real run; it settles D-028's open
  // default (O-4 / C-8) not at all, and this assertion is what says which one is configured.
  assert.equal(CONFIGURED_IMAGE_SLUG, 'fal-ai/flux-2-pro/edit')
  assert.equal(imageEntry().slug, CONFIGURED_IMAGE_SLUG)
})

test('11. a call naming a slug outside the registry is refused before any request', async () => {
  const outside = 'fal-ai/nano-banana-pro/text-to-image'
  assert.throws(
    () => imageEntry(outside),
    (error: Error) => {
      assert.match(error.message, /nano-banana-pro\/text-to-image/)
      assert.match(error.message, /D-028/)
      // The refusal names the closed set, so whoever configured it can see what was admitted.
      for (const entry of IMAGE_REGISTRY) assert.ok(error.message.includes(entry.slug))
      return true
    },
  )

  // And NOTHING IS SENT: the refusal is thrown where the port is built, so the port never exists.
  const recorded = recordedFetch(MADE)
  assert.throws(() =>
    falImage({ key: KEY, entry: imageEntry(outside), artifactRoot: '.', fetch: recorded.fetch }),
  )
  assert.deepEqual(recorded.sent, [])
})

test('11. a configured entry that does not advertise reference pictures makes the service refuse to start', () => {
  // D-026 is a REQUIREMENT, not a preference: without reference input there is no way to carry
  // identity across shots, and the subject-keyed keyframe design collapses. It fails silently —
  // the pictures still arrive, and only their identity drifts — so it is asserted at the entry.
  const blind: ImageEntry = { ...imageEntry(), maxReferences: 0 }
  assert.throws(
    () => admitEntry(blind),
    (error: Error) => {
      assert.match(error.message, /D-026/)
      assert.ok(error.message.includes(blind.slug))
      return true
    },
  )

  // The refusal is where the PORT IS BUILT — before the database is opened, before a job is
  // claimed and before a file is written — which is the service refusing to start (S-075's form).
  const recorded = recordedFetch(MADE)
  assert.throws(
    () => falImage({ key: KEY, entry: blind, artifactRoot: '.', fetch: recorded.fetch }),
    /D-026/,
  )
  assert.deepEqual(recorded.sent, [])
})

test('11. a call carrying more reference pictures than the entry takes is refused before any request', async () => {
  // D-028 puts `maxReferences` in the entry as DATA, and a limit that is held nowhere reads as
  // coverage without being any. It is refused BEFORE anything is uploaded or submitted: a call
  // fal would reject is one this engine should not pay to have rejected.
  const f = folder()
  try {
    const entry = imageEntry()
    const recorded = recordedFetch([...UPLOAD, ...MADE_EDIT])
    const port = falImage({
      key: KEY,
      entry,
      artifactRoot: f.dir,
      fetch: recorded.fetch,
      pollMs: 0,
    })
    const references = Array.from({ length: entry.maxReferences + 1 }, () => f.reference)
    await assert.rejects(port.generate(request({ references })), (error: Error) => {
      assert.ok(error.message.includes(entry.slug), error.message)
      noKey(error)
      assert.match(error.message, new RegExp(String(entry.maxReferences)))
      assert.ok(!isUnavailable(error), 'too many references was answered unavailable')
      return true
    })
    assert.deepEqual(recorded.sent, [], 'a refused call still reached the provider')
  } finally {
    f.clean()
  }
})

test('11. every admitted entry passes the admission assertions the registry makes', () => {
  // The entry-level gate is reachable by the registry's DATA, not by any setting: all four
  // admitted entries advertise references today, which is the closed registry doing its job. This
  // is what stops a later admission drifting past the gate while the gate still reads as coverage.
  for (const entry of IMAGE_REGISTRY) {
    admitEntry(entry)
    assert.ok(entry.maxReferences >= 1, `${entry.slug} advertises no reference pictures`)
    // Every entry is asked for a frame that is EXACTLY 9:16, which is what Gate 1's technical
    // step demands of the picture that comes back (packages/pipeline/src/gates/gate1.ts).
    assert.equal(
      entry.frame.width * 16,
      entry.frame.height * 9,
      `${entry.slug}'s frame is not 9:16`,
    )
    assert.ok(
      Math.min(entry.frame.width, entry.frame.height) >= PICTURE_MIN_SHORT_SIDE,
      `${entry.slug}'s frame is below 768P, so image-to-video would upscale the keyframe`,
    )
  }
  assert.equal(PICTURE_FRAME.width, 864)
  assert.equal(PICTURE_FRAME.height, 1536)
})

test('11. no slug is spelled anywhere but the registry', () => {
  // D-028: "No model slug is hardcoded at a call site." The registry is the one file that may
  // name one; a slug in an adapter, a composition root or a stage is the thing this forbids.
  const roots = ['packages', 'apps'].map((r) => join(REPO, r))
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
  for (const root of roots) walk(root)

  const registry = join(REPO, 'packages', 'providers', 'src', 'fal', 'registry.ts')
  for (const file of files) {
    if (file === registry) continue
    const text = readFileSync(file, 'utf8')
    for (const entry of IMAGE_REGISTRY) {
      // BOTH WIRES. An entry has two slugs since S-128, and a text wire spelled at a call site is
      // the same violation as an edit wire spelled there — it is the one the canonical goes to.
      for (const slug of [entry.slug, entry.textSlug]) {
        assert.ok(
          !text.includes(slug),
          `${relative(REPO, file)} spells the slug ${slug}: only the registry may (D-028)`,
        )
      }
    }
  }
})

test('11. every admitted entry carries BOTH wires, and both are polled in the same place', () => {
  // S-128: D-027's ladder makes the canonical picture from NOTHING — `makeStills` passes
  // `references: []` — and fal's published schemas make `image_urls` a REQUIRED field on three of
  // the four admitted edit wires. An entry with one wire cannot make the picture every other
  // picture of the reel is derived from, and the first call of the first real reel would have been
  // refused 422.
  for (const entry of IMAGE_REGISTRY) {
    assert.ok(entry.textSlug.length > 0, `${entry.slug} has no text wire`)
    assert.notEqual(entry.textSlug, entry.slug, `${entry.slug}'s two wires are one slug`)
    // THE SAME MODEL, so the rate, the limits and the frame on the entry are true of both. fal
    // polls the FIRST TWO SEGMENTS of a slug, so two wires of one model must share them — a pair
    // that did not would submit in one place and be polled in another, and the poll would 404.
    assert.equal(
      entry.textSlug.split('/').slice(0, 2).join('/'),
      entry.slug.split('/').slice(0, 2).join('/'),
      `${entry.slug} and ${entry.textSlug} are polled in different places`,
    )
  }
  // And the branch is the registry's own, beside the data, so there is ONE answer to "which slug
  // is this call's" rather than one per adapter.
  const entry = imageEntry()
  assert.equal(wireFor(entry, 0), entry.textSlug, 'a call with no reference is not the text wire')
  assert.equal(wireFor(entry, 1), entry.slug, 'a call with a reference is not the edit wire')
  assert.equal(wireFor(entry, 2), entry.slug)
})

test('11. a call with no reference goes to the text wire, and one with a reference to the edit wire', async () => {
  const f = folder()
  try {
    // The canonical: no reference, so the text wire. If it went to the edit wire the harness would
    // have no fixture for the path, which is the 422 a real run would have been refused with.
    const bare = adapter(MADE, f.dir)
    const canonical = await bare.port.generate(request())
    assert.equal(canonical.kind, 'made')
    assert.deepEqual(bare.recorded.left(), [], 'a recorded call was never made')
    const bareSubmit = bare.recorded.sent.find(
      (sent) => sent.method === 'POST' && !sent.path.includes('/storage/'),
    )
    assert.equal(bareSubmit?.path, `/${imageEntry().textSlug}`)
    assert.ok(!JSON.parse(bareSubmit?.body ?? '{}').image_urls, 'a bare call carries image_urls')

    // A derived picture: one reference, so the edit wire, and the reference is uploaded first.
    const derived = adapter([...UPLOAD, ...MADE_EDIT], f.dir)
    const made = await derived.port.generate(
      request({ pictureId: 'a1-shot-1-derived', references: [f.reference] }),
    )
    assert.equal(made.kind, 'made')
    assert.deepEqual(derived.recorded.left(), [], 'a recorded call was never made')
    const editSubmit = derived.recorded.sent.find(
      (sent) => sent.method === 'POST' && !sent.path.includes('/storage/'),
    )
    assert.equal(editSubmit?.path, `/${imageEntry().slug}`)
    assert.equal(JSON.parse(editSubmit?.body ?? '{}').image_urls?.length, 1)

    // THE RECEIPT NAMES THE WIRE THAT WAS CALLED, each of them. A canonical made on the text wire
    // and recorded as an edit is a row that cannot be reconciled with the provider's own, and it
    // is the row D-028's bake-off compares gate pass rates across (D-028, S-128).
    assert.equal(canonical.kind === 'made' && canonical.receipt.model, imageEntry().textSlug)
    assert.equal(made.kind === 'made' && made.receipt.model, imageEntry().slug)
  } finally {
    f.clean()
  }
})

test('11. cheapestEntry answers the cheapest admitted entry at this engine’s own frame', () => {
  // S-127: "the cheapest admitted one" was PROSE beside CONFIGURED_IMAGE_SLUG, and it went stale
  // the moment S-124 moved the frame to 864x1536 — flux is the only entry priced per megapixel, so
  // its headline rate did not survive, and it is second of four. The claim is data now, computed
  // from the same `imageRateCents` every estimate and receipt use.
  const cheapest = cheapestEntry()
  assert.equal(cheapest.slug, 'bytedance/seedream/v5/lite/edit')

  // AND IT AGREES WITH THE ARITHMETIC. This is the assertion that fails the moment a rate moves
  // and takes the rank with it, which is the whole reason the claim stopped being a comment.
  const rates = IMAGE_REGISTRY.map((entry) => [entry.slug, imageRateCents(entry)] as const)
  assert.deepEqual(rates, [
    ['fal-ai/nano-banana-pro/edit', 15],
    ['fal-ai/nano-banana-2/edit', 8],
    ['bytedance/seedream/v5/lite/edit', 3.5],
    ['fal-ai/flux-2-pro/edit', 7.5],
  ])
  assert.equal(
    imageRateCents(cheapest),
    Math.min(...rates.map(([, cents]) => cents)),
    'cheapestEntry does not answer the entry with the lowest rate',
  )

  // The CONFIGURED default is NOT the cheapest, and saying so is the point: a default is D-028's
  // bake-off to settle (O-4 / C-8, open) and a setting is one run's (S-127).
  assert.notEqual(cheapest.slug, CONFIGURED_IMAGE_SLUG)
})

test('11. the service refuses to start when its image model setting names a slug outside the registry', async () => {
  const refusal = await refusedService({
    env: {
      CUTROOM_PROVIDER_IMAGE: 'fal',
      [SETTING_NAMES.falImageModel]: 'fal-ai/nano-banana-pro/text-to-image',
      FAL_KEY: KEY,
    },
  })
  try {
    assert.notEqual(refusal.code, 0, `the service exited ${refusal.code}`)
    assert.match(refusal.output, /nano-banana-pro\/text-to-image/)
    assert.match(refusal.output, /D-028/)
    assert.equal(refusal.database, false, 'the database was opened by a service that refused')
    assert.equal(refusal.artifacts, false, 'a refused service wrote a file')
    // And the key it was given is in nothing it printed (S-109, D-022).
    assert.ok(!refusal.output.includes(KEY), 'the refusal printed the key')
  } finally {
    refusal.clean()
  }
})

test('11. what is transient and what is a fault, classified as the two MiniMax adapters classify it', async () => {
  // Gate 2's "What is transient, and what is a fault" binds BOTH providers, and S-124 settles the
  // CARRIER for this port by reading it: `ImageAnswer` has no `unavailable` arm — its two arms are
  // `made` and the worker's own budget `refused`, which a provider adapter may never construct
  // (S-035) — and S-096 says plainly that image calls are not covered by the guarded retry. So the
  // classification is THROWN, as the model adapter throws it (S-122), and the split is identical.
  const dir = mkdtempSync(join(tmpdir(), 'cutroom-image-'))
  try {
    const transient = ['fal-image-busy', 'fal-image-down']
    for (const name of transient) {
      const { port, recorded } = adapter([name], dir)
      await assert.rejects(port.generate(request()), (error: unknown) => {
        assert.ok(isUnavailable(error), `${name} was not answered unavailable`)
        // A detail names the status and enough of the body to recognise, and NEVER the key.
        assert.ok(!everything(error).includes(KEY), `${name}'s detail holds the key`)
        return true
      })
      assert.equal(recorded.sent.length, 1, `${name} was sent more than once by the adapter`)
      // AND THE FIXTURE WAS ACTUALLY SERVED. A call the harness has no fixture for throws too,
      // and the adapter classifies that throw as unavailable — so a fixture whose path stopped
      // matching would satisfy every assertion above while proving nothing at all (S-128).
      assert.deepEqual(recorded.left(), [], `${name} was never served: the call went elsewhere`)
    }

    // A body that is valid JSON and is NOT THIS WIRE is its own case, and it is not the same
    // case as a body that is not JSON at all: one fails at JSON.parse and the other at the schema,
    // and an adapter that dropped the schema half would still pass every non-JSON case.
    const wrongShape: Wire = {
      note: 'built in the test: a 200 whose body parses as JSON and is not this wire',
      provider: 'fal',
      call: 'image',
      case: 'wrongshape',
      // The canonical's wire: this call carries no reference (S-128).
      request: { method: 'POST', path: '/fal-ai/flux-2-pro' },
      response: { status: 200, body: { ok: true, message: 'queued somewhere else' } },
    }
    const shaped = adapter([wrongShape], dir)
    await assert.rejects(shaped.port.generate(request()), (error: Error) => {
      assert.ok(!isUnavailable(error), 'a body that is not this wire was answered unavailable')
      // The fault SAYS WHAT ARRIVED. A body nothing read would fail too — further down, when
      // something tripped over a field that was never there — and it would say nothing a person
      // could act on. Naming the wire is the difference between a diagnosis and a stack trace.
      assert.match(error.message, /is not this wire/, error.message)
      return noKey(error)
    })

    const faults = ['fal-image-denied', 'fal-image-refused', 'fal-image-garbled']
    for (const name of faults) {
      const { port, recorded } = adapter([name], dir)
      await assert.rejects(port.generate(request()), (error: Error) => {
        assert.deepEqual(recorded.left(), [], `${name} was never served: the call went elsewhere`)
        assert.ok(!isUnavailable(error), `${name} was answered unavailable, so it would be re-sent`)
        assert.ok(error.message.length > 0)
        // The gateway's HTML is the case where a 200 is not JSON at all, and it says so: it is a
        // different failure from a body that parses and is not this wire, and the two must not
        // collapse into one message that describes neither.
        if (name === 'fal-image-garbled') assert.match(error.message, /is not JSON/, error.message)
        return noKey(error)
      })
    }

    // A job fal ACCEPTED AND THEN FAILED is a fault, and it carries the provider's own message.
    const halted = adapter(['fal-image-bare', 'fal-image-halted', 'fal-image-broken'], dir)
    await assert.rejects(halted.port.generate(request()), (error: Error) => {
      assert.ok(!isUnavailable(error))
      assert.match(error.message, /reference image could not be decoded/)
      return true
    })

    // Nothing reaching the provider, and nothing coming back in time, are both transient.
    for (const failure of [
      () => Promise.reject(new Error('ECONNREFUSED 127.0.0.1:443')),
      () =>
        Promise.reject(
          Object.assign(new Error('the operation was aborted'), { name: 'TimeoutError' }),
        ),
    ]) {
      const port = falImage({
        key: KEY,
        entry: imageEntry(),
        artifactRoot: dir,
        fetch: failure as unknown as typeof globalThis.fetch,
        pollMs: 0,
      })
      await assert.rejects(port.generate(request()), (error: unknown) => {
        assert.ok(isUnavailable(error), 'a connection error or a timeout was not transient')
        return true
      })
    }
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('11. the key reaches one header, and no message, and neither base URL is ignored', async () => {
  const f = folder()
  try {
    const recorded = recordedFetch([...UPLOAD, ...MADE_EDIT])
    const port = falImage({
      key: KEY,
      entry: imageEntry(),
      artifactRoot: f.dir,
      baseUrl: 'http://127.0.0.1:9/',
      storageBaseUrl: 'http://127.0.0.1:8/',
      fetch: recorded.fetch,
      pollMs: 0,
    })
    const answer = await port.generate(request({ references: [f.reference] }))
    assert.equal(answer.kind, 'made')

    // BOTH settings are honoured, with a trailing slash trimmed. Session 39's n29 — a base URL
    // ignored entirely — was caught by NOTHING, because every test there used the default.
    const [initiate, put, submit] = recorded.sent
    assert.ok(initiate?.url.startsWith('http://127.0.0.1:8/storage/upload/initiate'), initiate?.url)
    assert.ok(submit?.url.startsWith('http://127.0.0.1:9/fal-ai/'), submit?.url)
    for (const sent of recorded.sent.slice(2)) {
      if (sent.path.startsWith('/files/')) continue // the provider's own file URL, followed as given
      assert.ok(sent.url.startsWith('http://127.0.0.1:9/'), `${sent.url} ignored the base URL`)
    }

    // fal authorises with `Key <key>`, and the key is in that header and nowhere else at all.
    const auth = (s: (typeof recorded.sent)[number]) => s.headers['authorization'] ?? ''
    assert.equal(auth(submit as (typeof recorded.sent)[number]), `Key ${KEY}`)
    assert.equal(auth(initiate as (typeof recorded.sent)[number]), `Key ${KEY}`)
    // NOT on the PUT: the upload URL carries its own authorisation, and ours has no business at
    // fal's storage — the rule S-123 set for MiniMax's subtitle fetch (S-109, D-022).
    assert.equal(auth(put as (typeof recorded.sent)[number]), '')
    for (const sent of recorded.sent) {
      if (sent.path.startsWith('/files/')) {
        assert.equal(auth(sent), '', 'the key was sent to the provider’s file storage')
      }
      assert.ok(!(sent.body ?? '').includes(KEY), `${sent.path} carried the key in its body`)
    }
  } finally {
    f.clean()
  }
})

// ---------------------------------------------------------------- 12

test('12. a completed call writes the picture under the artifact root and records the local path', async () => {
  const f = folder()
  try {
    const { port, recorded } = adapter([...UPLOAD, ...MADE_EDIT], f.dir)
    const answer = await port.generate(request({ references: [f.reference] }))
    assert.equal(answer.kind, 'made')
    if (answer.kind !== 'made') return

    // FILES, NOT BYTES, under the ONE artifact root (D-086, D-087).
    const { path } = answer.picture
    assert.equal(answer.picture.pictureId, 'a1-shot-0-canonical')
    const inside = relative(f.dir, path)
    assert.ok(inside !== '' && !inside.startsWith('..') && !isAbsolute(inside), `${path} escaped`)
    assert.ok(existsSync(path), 'the picture has no file behind it')
    assert.deepEqual(readFileSync(path).subarray(0, 8), SIGNATURE)

    // THE PROVIDER'S URL IS NOT OURS AND IS NOT KEPT (D-022). It expires, and a row holding one
    // is a row that stops meaning anything. Nothing the call returns names it.
    const provider = 'v3.fal.media'
    assert.ok(!everything(answer).includes(provider), 'the provider’s URL is in the answer')
    assert.ok(!everything(answer).includes('files/vertical.png'))
    assert.ok(!readFileSync(path, 'latin1').includes(provider), 'the URL was written into the file')
    assert.deepEqual(recorded.left(), [], 'a recorded call was never made')
  } finally {
    f.clean()
  }
})

test('12. a result whose UNREAD fields are null is still a picture: only the fields this adapter reads may refuse one', async () => {
  // Measured on the first real reel, 2026-09-22: the seedream text wire answered 200 with `width`
  // and `height` NULL rather than absent, and `z.number().optional()` refuses a null — so a
  // picture fal had already made, and had already billed for, was thrown away by two fields the
  // adapter deliberately never reads, and no receipt was written for it (S-133). The frame is
  // still read off the BYTES, which is what the assertion below holds.
  const f = folder()
  try {
    const { port, recorded } = adapter(
      ['fal-image-bare', 'fal-image-completed', 'fal-image-nulled', 'fal-picture-vertical'],
      f.dir,
    )
    const answer = await port.generate(request())
    assert.equal(answer.kind, 'made')
    if (answer.kind !== 'made') return
    assert.ok(existsSync(answer.picture.path), 'the picture has no file behind it')
    assert.deepEqual(recorded.left(), [], 'the nulled body was never served')
    // The frame in the receipt is the one read off the bytes, not the null the provider sent.
    assert.equal(answer.receipt.fake, false)
  } finally {
    f.clean()
  }
})

test('12. a recorded response whose file is 16:9 fails the call naming the entry, and never reaches image-to-video', async () => {
  const f = folder()
  try {
    const { port } = adapter(
      ['fal-image-bare', 'fal-image-completed', 'fal-image-sideways', 'fal-picture-landscape'],
      f.dir,
    )
    // A picture id of its own, so what is asserted below is this call's file and not the
    // reference picture the folder already holds under the run's own folder.
    const landscape = 'a1-shot-2-landscape'
    await assert.rejects(port.generate(request({ pictureId: landscape })), (error: Error) => {
      // The entry is named, because which model produced it is the finding: D-028's bake-off is
      // exactly "which of these keeps its promises", and a failure that does not say which model
      // failed cannot feed it.
      namesWire(error.message, 0)
      noKey(error)
      assert.match(error.message, /1536x864|1536×864/)
      assert.match(error.message, /9:16/)
      // Not transient: asking the same model for the same thing again is not the answer.
      assert.ok(!isUnavailable(error))
      return true
    })

    // AND NOTHING IS HANDED ON, AND NOTHING IS LEFT BEHIND. The call threw, so no PictureRef
    // exists and no later stage can reach image-to-video with it — which is the silent failure
    // D-019 and D-028 both name. The frame is judged BEFORE the file is written, so a picture
    // that failed it is not on disk for anything to find: the file is what a later session, or a
    // restart, would pick up as though it had passed (S-046, S-048).
    const written = existsSync(join(f.dir, 'run-image-1'))
      ? readdirSync(join(f.dir, 'run-image-1'))
      : []
    assert.ok(
      !written.some((name) => name.startsWith(landscape)),
      `a picture that failed its frame was left under the artifact root: ${written.join(', ')}`,
    )
  } finally {
    f.clean()
  }
})

test('12. the frame is read from the file, not from the width and height the provider reports', async () => {
  // `fal-image-sideways` reports 864x1536 while its FILE is 1536x864. D-028: the requirement
  // "fails silently", so it is checked on the produced frame and not trusted from anything else.
  const wire = JSON.parse(
    readFileSync(join(REPO, 'tests', 'fixtures', 'wire', 'fal-image-sideways.json'), 'utf8'),
  ) as Wire
  const reported = (wire.response.body as { images: Array<{ width: number; height: number }> })
    .images[0]
  assert.equal(reported?.width, 864, 'the fixture no longer reports a vertical frame')
  assert.equal(reported?.height, 1536)
})

test('12. a picture that is vertical and NOT 9:16 fails the call', async () => {
  // The assertion is on the RATIO, not on the orientation. 1024x1536 is 2:3: taller than it is
  // wide, both sides clear of 768, and it would pass anything that only asked "is it portrait?".
  // Gate 1 demands `width * 16 === height * 9` exactly, so a keyframe of this shape fails its
  // technical step after it has been paid for — and image-to-video would make a 2:3 clip of it
  // with no error at all (D-019, D-028).
  const f = folder()
  try {
    const { port } = adapter(
      ['fal-image-bare', 'fal-image-completed', 'fal-image-stretched', 'fal-picture-tall'],
      f.dir,
    )
    await assert.rejects(
      port.generate(request({ pictureId: 'a1-shot-3-tall' })),
      (error: Error) => {
        namesWire(error.message, 0)
        noKey(error)
        assert.match(error.message, /1024x1536|1024×1536/)
        assert.match(error.message, /9:16/)
        return true
      },
    )
  } finally {
    f.clean()
  }
})

test('12. a file that is exactly 9:16 and below 768P fails the call', async () => {
  // 576x1024 is fal's own portrait_16_9 preset. It passes the ratio test, and image-to-video
  // would upscale the frame the viewer sees at t=0 (D-014, D-007, D-026, S-124).
  const f = folder()
  try {
    const { port } = adapter(
      ['fal-image-bare', 'fal-image-completed', 'fal-image-shrunken', 'fal-picture-undersized'],
      f.dir,
    )
    await assert.rejects(port.generate(request()), (error: Error) => {
      namesWire(error.message, 0)
      noKey(error)
      assert.match(error.message, /576/)
      assert.match(error.message, new RegExp(String(PICTURE_MIN_SHORT_SIDE)))
      return true
    })
  } finally {
    f.clean()
  }
})

test('12. bytes that are no picture, and a completed job with no picture at all, each fail the call', async () => {
  const f = folder()
  try {
    const rubbish: Wire = {
      note: 'built in the test: a body that is not a picture at all',
      provider: 'fal',
      call: 'picture',
      case: 'rubbish',
      request: { method: 'GET', path: '/files/vertical.png' },
      response: { status: 200, text: 'these bytes are not a picture\n' },
    }
    const bad = adapter(['fal-image-bare', 'fal-image-completed', 'fal-image-made', rubbish], f.dir)
    await assert.rejects(bad.port.generate(request()), (error: Error) => {
      namesWire(error.message, 0)
      noKey(error)
      assert.ok(!isUnavailable(error))
      return true
    })

    const none = adapter(['fal-image-bare', 'fal-image-completed', 'fal-image-empty'], f.dir)
    await assert.rejects(none.port.generate(request()), (error: Error) => {
      assert.ok(!isUnavailable(error))
      return noKey(error)
    })
  } finally {
    f.clean()
  }
})

test('12. a queued job is polled until it is answered, and the upload happens once', async () => {
  const f = folder()
  try {
    const { port, recorded } = adapter(
      [
        ...UPLOAD,
        'fal-image-submitted',
        'fal-image-queued',
        'fal-image-completed',
        'fal-image-made',
        'fal-picture-vertical',
      ],
      f.dir,
    )
    const answer = await port.generate(request({ references: [f.reference] }))
    assert.equal(answer.kind, 'made')
    assert.deepEqual(recorded.left(), [], 'a recorded call was never made')

    // One reference, one upload: the adapter does not send the same file twice within a call.
    const uploads = recorded.sent.filter((s) => s.path === '/storage/upload/initiate')
    assert.equal(uploads.length, 1)
    // A queued answer is neither a failure nor a transient — it is the queue working.
    const polls = recorded.sent.filter((s) => s.path.endsWith('/status'))
    assert.equal(polls.length, 2)
  } finally {
    f.clean()
  }
})

test('12. uploadReference gets a local picture to a URL fal can fetch, and keeps no presigned URL', async () => {
  // The one function that does it (Gate 2, S-114), with the escape hatch to @fal-ai/client
  // attached to it and nothing else. Check 15 proves it by number in Slice 6; it is exercised
  // here because every reference of every image call goes through it.
  const f = folder()
  try {
    // The live-shaped presigned upload URL is BUILT HERE and never written down: a recorded one
    // is the incident D-022 exists for, and check 21 forbids a fixture to carry a query string.
    const presigned =
      'https://v3.fal.media/upload/elephant/reference.png?X-Amz-Credential=AKIAEXAMPLE&X-Amz-Signature=deadbeef'
    const initiate: Wire = {
      note: 'built in the test: initiate answering a presigned upload URL, which is never recorded',
      provider: 'fal',
      call: 'upload',
      case: 'presigned',
      request: { method: 'POST', path: '/storage/upload/initiate' },
      response: {
        status: 200,
        body: {
          file_url: 'https://v3.fal.media/files/elephant/reference.png',
          upload_url: presigned,
        },
      },
    }
    const stored: Wire = {
      note: 'built in the test: the bytes accepted at the presigned URL',
      provider: 'fal',
      call: 'upload',
      case: 'presignedstored',
      request: { method: 'PUT', path: '/upload/elephant/reference.png' },
      response: { status: 200, text: '' },
    }
    const recorded = recordedFetch([initiate, stored])
    const url = await uploadReference(f.reference.path, {
      key: KEY,
      storageBaseUrl: FAL_STORAGE_BASE_URL,
      fetch: recorded.fetch,
    })
    assert.equal(url, 'https://v3.fal.media/files/elephant/reference.png')
    assert.ok(!url.includes('?'), 'the URL handed on carries a query string')

    // The bytes went to the presigned URL, with no key of ours on them.
    const put = recorded.sent.find((s) => s.method === 'PUT')
    assert.ok(put?.url.includes('X-Amz-Signature'), 'the presigned URL was not followed as given')
    assert.equal(put?.headers['authorization'] ?? '', '')

    // A file_url THAT ITSELF CARRIES A QUERY STRING is refused rather than handed on. fal's
    // storage is documented to answer a plain address, and nothing here has ever called it — so
    // if it ever answers a presigned one, that credential must not ride into an image request's
    // body, and from there into a row (D-022, S-124).
    const leaky: Wire = {
      note: 'built in the test: initiate answering a file_url that is itself presigned',
      provider: 'fal',
      call: 'upload',
      case: 'leaky',
      request: { method: 'POST', path: '/storage/upload/initiate' },
      response: {
        status: 200,
        body: {
          file_url: 'https://v3.fal.media/files/elephant/reference.png?X-Amz-Signature=deadbeef',
          upload_url: 'https://v3.fal.media/upload/elephant/reference.png',
        },
      },
    }
    const stored2: Wire = { ...stored, case: 'leakystored' }
    const leaked = recordedFetch([leaky, stored2])
    await assert.rejects(
      uploadReference(f.reference.path, {
        key: KEY,
        storageBaseUrl: FAL_STORAGE_BASE_URL,
        fetch: leaked.fetch,
      }),
      (error: Error) => {
        assert.match(error.message, /D-022/)
        return noKey(error)
      },
    )

    // A failure names nothing of the credential it was handed.
    const denied = recordedFetch(['fal-upload-denied'])
    await assert.rejects(
      uploadReference(f.reference.path, {
        key: KEY,
        storageBaseUrl: FAL_STORAGE_BASE_URL,
        fetch: denied.fetch,
      }),
      (error: Error) => {
        assert.ok(!isUnavailable(error), '401 at storage was answered unavailable')
        assert.ok(!error.message.includes(KEY))
        return true
      },
    )
  } finally {
    f.clean()
  }
})

// ---------------------------------------------------------------- 13

test('13. an image receipt’s cost is the configured entry’s rate applied to the call', async () => {
  const f = folder()
  try {
    // WITH a reference: flux bills the first megapixel of output and every extra megapixel of
    // input AND output, rounded up (BUDGET.md's second correction). At 864x1536 that is
    // 3 + 1.5 x ((2 - 1) + 2) = 7.5 cents, and a RECEIPT is whole cents rounded up, because
    // generation_receipt.cost_cents is an integer column and the budget guard rounds up (S-059).
    const withRef = adapter([...UPLOAD, ...MADE_EDIT], f.dir)
    const one = await withRef.port.generate(request({ references: [f.reference] }))
    assert.equal(one.kind, 'made')
    if (one.kind !== 'made') return
    assert.equal(one.receipt.costCents, 8)
    assert.equal(one.receipt.model, imageEntry().slug)
    assert.equal(one.receipt.fake, false)

    // WITHOUT one: the input term is gone, and 3 + 1.5 x 1 = 4.5, so the receipt is 5.
    const bare = adapter(MADE, f.dir)
    const none = await bare.port.generate(request({ pictureId: 'a1-shot-1-bare' }))
    assert.equal(none.kind, 'made')
    if (none.kind !== 'made') return
    assert.equal(none.receipt.costCents, 5)

    // And the figure is the registry's own arithmetic, not a constant that happens to match.
    assert.equal(
      imageCostCents(imageEntry(), { frame: PICTURE_FRAME, references: [PICTURE_FRAME] }),
      8,
    )
    assert.equal(imageCostCents(imageEntry(), { frame: PICTURE_FRAME, references: [] }), 5)
    // A flat entry's rate is its own figure, whatever the call carries.
    const flat = imageEntry('fal-ai/nano-banana-2/edit')
    assert.equal(imageCostCents(flat, { frame: flat.frame, references: [flat.frame] }), 8)
    assert.equal(imageCostCents(flat, { frame: flat.frame, references: [] }), 8)
  } finally {
    f.clean()
  }
})

test('13. changing the configured entry changes what admission estimates', async () => {
  // D-028: "Pre-flight has to price whatever is configured. If the rate is a constant in code,
  // swapping the model silently makes every estimate wrong in the direction that overspends."
  // An UNCHANGED estimate here means a rate is hardcoded somewhere.
  const shot = (durationSeconds: number, unit: number) => ({
    unit,
    durationSeconds,
    subjectIds: [],
  })
  const plan = { shots: [shot(5, 0), shot(10, 1)], plannedImageCalls: 4 }
  const read = (slug: string) =>
    readSettings({
      CUTROOM_PROVIDER_IMAGE: 'fal',
      [SETTING_NAMES.falImageModel]: slug,
      FAL_KEY: KEY,
    })

  const cheap = read('fal-ai/flux-2-pro/edit')
  const dear = read('fal-ai/nano-banana-pro/edit')
  assert.equal(
    cheap.planSettings.imageRateCents,
    imageRateCents(imageEntry('fal-ai/flux-2-pro/edit')),
  )
  assert.equal(dear.planSettings.imageRateCents, 15)
  assert.notEqual(
    estimate(plan, cheap.planSettings),
    estimate(plan, dear.planSettings),
    'the estimate did not move with the configured entry, so a rate is hardcoded',
  )
  // The video term is untouched by an image entry, so the whole difference is the images.
  assert.equal(
    estimate(plan, dear.planSettings) - estimate(plan, cheap.planSettings),
    4 * 15 - 4 * imageRateCents(imageEntry('fal-ai/flux-2-pro/edit')),
  )

  // A stand-in image port prices as every verified feature does: nothing about the four
  // features already passed changes because this registry exists (S-108, S-099's form).
  const standIn = readSettings({})
  assert.equal(standIn.planSettings.imageRateCents, 15)
  assert.equal(standIn.transport.falBaseUrl, FAL_BASE_URL)
  assert.equal(standIn.transport.falStorageBaseUrl, FAL_STORAGE_BASE_URL)
})

test('13. the rate reaching admission is the entry’s, applied to the engine’s own frame', () => {
  // The bridge between the two halves of check 13: the figure a receipt is charged and the figure
  // admission estimates come from ONE place, so a reel cannot be priced by one model and bought
  // from another — which would pass every receipt assertion and breach D-014's cap. They differ
  // only in WHEN they round: a receipt is whole cents, and an estimate rounds once over the
  // whole reel, which is how BUDGET.md's own Config A figures were computed (S-059, D-083).
  for (const entry of IMAGE_REGISTRY) {
    assert.equal(
      imageCostCents(entry, { frame: entry.frame, references: [entry.frame] }),
      Math.ceil(imageRateCents(entry)),
      `${entry.slug} estimates at a rate it does not charge`,
    )
  }
  // THE TIER MULTIPLIER IS ARITHMETIC. Every admitted entry is asked for a tier priced at 1
  // today, so a rate that ignored the multiplier would charge the same figure — which is why it
  // is asserted on an entry built here rather than only on the four that ship (D-028).
  const tiered: ImageEntry = {
    ...imageEntry('fal-ai/nano-banana-2/edit'),
    tier: '2K',
  }
  assert.equal(tiered.tiers['2K'], 1.5)
  assert.equal(imageRateCents(tiered), 12)
  assert.equal(imageCostCents(tiered, { frame: tiered.frame, references: [] }), 12)

  assert.equal(imageRateCents(imageEntry('fal-ai/flux-2-pro/edit')), 7.5)
  assert.equal(imageRateCents(imageEntry('bytedance/seedream/v5/lite/edit')), 3.5)
})

test('13. the port built by the factory is the registry’s, and a fal image port with no key refuses', () => {
  // The factory is the one place a name becomes an implementation (S-108), and the key is read
  // through env.ts and nowhere else (S-109).
  assert.throws(
    () =>
      imagePort('fal', {
        artifactRoot: '.',
        models: { planner: 'm', reconciler: 'm', witness: 'm', judge: 'm' },
        tools: ffmpegTools(),
        env: {},
      }),
    /FAL_KEY/,
  )
  const port = imagePort('fal', {
    artifactRoot: '.',
    models: { planner: 'm', reconciler: 'm', witness: 'm', judge: 'm' },
    tools: ffmpegTools(),
    env: { FAL_KEY: KEY },
  })
  // D-026's startup assertion, read by apps/worker before its database is opened.
  assert.equal(port.acceptsReferences, true)
})

test('13. the configured entry’s rate is what a running engine admits on', async () => {
  // THE OTHER HALF OF CHECK 13, and the one that reads the estimate where admission actually
  // makes it: inside the worker, on a run submitted over HTTP. A rate the service computes and
  // never hands on is a rate that changes nothing — the estimate would stay the pipeline's
  // default whatever entry was configured, which is exactly "a rate is hardcoded somewhere".
  //
  // The ceiling is set BELOW either estimate, so the run is refused at admission and the stills
  // stage never starts: the fal image port is built, and nothing is ever asked of it. That is
  // what lets a real adapter be configured here with no call that spends, and it is why both fal
  // base URLs are pointed at a port nothing listens on (S-111, D-100, S-030, S-035).
  const estimateOf = async (slug: string): Promise<number> => {
    const service = await startService({
      standIn: { model: videoScript(THREE_RANKS, THREE_RANKS_PICS) },
      env: {
        CUTROOM_PROVIDER_IMAGE: 'fal',
        [SETTING_NAMES.falImageModel]: slug,
        [SETTING_NAMES.falBaseUrl]: 'http://127.0.0.1:9',
        [SETTING_NAMES.falStorageBaseUrl]: 'http://127.0.0.1:9',
        FAL_KEY: KEY,
      },
    })
    try {
      const submitted = await service.http.submit({
        ...stillsRequest('paid-image-1', CEILING),
        options: { until: 'stills', budgetCents: CEILING },
      })
      assert.equal(submitted.status, 202, JSON.stringify(submitted.json))
      const runId = String(submitted.json.runId)
      await waitFor(`run ${runId} to finish`, async () => {
        const { json } = await service.http.status(runId)
        return json.state === 'finished'
      })
      const result = (await service.http.result(runId)).json
      assert.equal(result.status, 'refused', JSON.stringify(result))
      assert.equal(result.limit, 'ceiling', JSON.stringify(result))
      // Nothing was bought: the refusal is before the first picture, so no receipt exists and
      // the key the service was given never reached a call at all.
      assert.equal(service.query('SELECT * FROM generation_receipt').length, 0)
      assert.ok(!service.output().includes(KEY), 'the service printed the key')
      return Number(result.estimateCents)
    } finally {
      await service.stop()
      service.clean()
    }
  }

  const cheap = await estimateOf('fal-ai/flux-2-pro/edit')
  const dear = await estimateOf('fal-ai/nano-banana-pro/edit')
  assert.equal(
    cheap,
    Math.ceil(PLANNED_IMAGE_CALLS * imageRateCents(imageEntry('fal-ai/flux-2-pro/edit'))),
  )
  assert.equal(dear, Math.ceil(PLANNED_IMAGE_CALLS * 15))
  assert.notEqual(cheap, dear, 'admission estimated the same whichever entry was configured')
})
