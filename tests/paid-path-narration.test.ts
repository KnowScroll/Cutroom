import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative, sep } from 'node:path'
import { test } from 'node:test'
import type { NarrationAnswer, NarrationRequest } from '@cutroom/contracts'
import { DEFAULT_RENDER_SETTINGS, wordTimings } from '@cutroom/pipeline'
import {
  AUDIO_SETTING,
  MINIMAX_BASE_URL,
  T2A_MODEL,
  T2A_PATH,
  minimaxNarration,
} from '@cutroom/providers'
import { SETTING_NAMES, readSettings } from '@cutroom/service'
import { REPO } from './_repo.ts'
import { readWire, recordedFetch, type Sent, type Wire } from './engine/wire.ts'

// paid-path, Slice 4 — checks 9 and 10 (docs/features/paid-path.md): the MiniMax T2A narration
// adapter, the SECOND real adapter.
//
// NOTHING HERE SPENDS AND NOTHING HERE NEEDS A KEY. Every call is answered by a recorded body
// under tests/fixtures/wire, served to a `fetch` the adapter is handed (S-111, S-114); the key
// below is a canary that exists to be looked for.
//
// TWO CALLS MAKE ONE NARRATION. The audio comes back inside the answer, as hex; the word timings
// come back as a URL — and that URL is a PRESIGNED ALIBABA OSS LINK carrying OSSAccessKeyId and
// Signature, a credential belonging to MiniMax. D-022 exists because exactly that field was once
// written into a file committed to a public repository, and was caught by GitHub's push
// protection rather than by a sweep for the owner's own keys. So the adapter fetches the timings
// and drops the reference, and check 10 is the sweep that proves it.
//
// WHERE THE CLASSIFICATION DIFFERS FROM THE MODEL ADAPTER'S. `NarrationAnswer` carries an
// `unavailable` arm, which S-096 built and `reel-takes` verified, and the worker's guarded
// narration port is what sends the call again, with backoff, on the transient counter. So this
// adapter ANSWERS `unavailable` where the model adapter THROWS `Unavailable` — the model port has
// no such arm, which is the whole reason S-122 made it a type (S-123).

/** A key that is not one. It is asserted to reach the header, and nothing else. */
const KEY = 'canary-not-a-real-key-39'

/** The spike's own sentence (D-019). Its words are the ones the subtitle fixture times. */
const TEXT = 'Radar did not win the battle. The telephone did.'

/** A narration as the clips stage asks for one (S-070, S-071). */
const REQUEST: NarrationRequest = {
  runId: 'run-1',
  narrationId: 'a1-shot-0-narration',
  text: TEXT,
  voice: 'English_Wise_Woman',
}

/** Where the recorded answer's subtitle_file points. The fixtures are matched on this path. */
const SUBTITLE_PATH = '/audio_subtitle/recorded/subtitle.json'

/** A folder of its own for every test that writes, so nothing here reads another's files. */
function root(): { path: string; clean(): void } {
  const path = mkdtempSync(join(tmpdir(), 'cutroom-t2a-'))
  return { path, clean: () => rmSync(path, { recursive: true, force: true }) }
}

/** The adapter with recorded wire behind it, and everything it sent. */
function adapter(
  names: readonly (string | Wire)[],
  artifactRoot: string,
  over: Partial<Parameters<typeof minimaxNarration>[0]> = {},
) {
  const wire = recordedFetch(names)
  return { wire, port: minimaxNarration({ key: KEY, artifactRoot, fetch: wire.fetch, ...over }) }
}

/** What one request carried, parsed. */
function body(sent: Sent): Record<string, unknown> {
  assert.ok(sent.body !== undefined, 'the adapter sent no body')
  return JSON.parse(sent.body) as Record<string, unknown>
}

/** An answer that was made, or a failure naming what came back instead. */
function made(answer: NarrationAnswer): Extract<NarrationAnswer, { kind: 'made' }> {
  assert.equal(answer.kind, 'made', `the call answered ${answer.kind}`)
  return answer as Extract<NarrationAnswer, { kind: 'made' }>
}

/** The detail of an answer that was not made. */
function detailOf(answer: NarrationAnswer): string {
  assert.equal(answer.kind, 'unavailable', `the call answered ${answer.kind}`)
  return (answer as Extract<NarrationAnswer, { kind: 'unavailable' }>).detail
}

/** The error one call threw, or a failure saying it did not throw at all. */
async function threw(call: () => Promise<unknown>): Promise<Error> {
  const error = await call().then(
    () => undefined,
    (e: unknown) => e as Error,
  )
  assert.ok(error !== undefined, 'the call returned an answer where it should have thrown')
  return error
}

/** The recorded subtitle body, re-timed for another text. Built, never committed. */
function subtitleFor(text: string): Wire {
  const words = text.split(/\s+/).filter((w) => w !== '')
  return {
    note: 'Built in the test, not recorded: the subtitle body for another text.',
    provider: 'minimax',
    call: 'subtitle',
    case: 'built',
    request: { method: 'GET', path: SUBTITLE_PATH },
    response: {
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: words.map((word, i) => ({
        text: word,
        time_begin: i * 500,
        time_end: i * 500 + 400,
      })),
    },
  }
}

// ---------------------------------------------------------------- 9

test('9. the adapter asks speech-2.8-hd with subtitle_enable, on the wire D-019 verified', async () => {
  const folder = root()
  try {
    const { wire, port } = adapter(['minimax-t2a-redacted', 'minimax-subtitle-words'], folder.path)
    made(await port.speak(REQUEST))

    const sent = wire.sent[0] as Sent
    assert.equal(sent.method, 'POST')
    assert.equal(sent.path, T2A_PATH)
    assert.equal(sent.path, '/v1/t2a_v2')
    // The base URL defaults to the provider's own — the same host the chat wire is on, which is
    // why T2A shares CUTROOM_MINIMAX_BASE_URL rather than taking a setting of its own (S-123).
    assert.equal(sent.url, `${MINIMAX_BASE_URL}/v1/t2a_v2`)

    const asked = body(sent)
    assert.equal(asked.model, 'speech-2.8-hd', 'the model D-008 and D-019 name')
    assert.equal(asked.model, T2A_MODEL)
    assert.equal(asked.text, TEXT, 'the text is sent verbatim')
    assert.equal(asked.subtitle_enable, true, 'without this there are no word timings at all')
    assert.equal(asked.stream, false)
    assert.deepEqual(
      asked.voice_setting,
      { voice_id: REQUEST.voice, speed: 1, vol: 1, pitch: 0 },
      'the voice is the caller’s setting, never a value spelled in the adapter',
    )
    assert.deepEqual(asked.audio_setting, AUDIO_SETTING)
    // No GroupId, and no query string of any kind: the call the spike recorded as answering was
    // the plain path, and a query is where a credential travels (D-019, D-022).
    assert.equal(new URL(sent.url).search, '')

    // The key reaches the header and nothing else.
    assert.equal(sent.headers.authorization, `Bearer ${KEY}`, JSON.stringify(sent.headers))
    assert.doesNotMatch(String(sent.body), new RegExp(KEY), 'the key was written into the body')
    assert.doesNotMatch(sent.url, new RegExp(KEY), 'the key was written into the URL')

    // The second call is the timings, fetched from the URL the first answer named — AND IT
    // CARRIES NONE OF OUR KEY. The presigned link is MiniMax's own authorisation at its storage,
    // and a key of ours sent to a third party's host is a key leaving this machine for somewhere
    // that has no business with it (S-109, D-022).
    const fetched = wire.sent[1] as Sent
    assert.equal(fetched.method, 'GET')
    assert.equal(fetched.path, SUBTITLE_PATH)
    assert.equal(fetched.headers.authorization, undefined, JSON.stringify(fetched.headers))
    assert.doesNotMatch(JSON.stringify(fetched.headers), new RegExp(KEY), 'the key went to storage')
    assert.deepEqual(wire.left(), [], 'a recorded answer was never asked for')
  } finally {
    folder.clean()
  }
})

test('9. the service names the voice it speaks with, one setting, defaulting to what every stand-in run uses', () => {
  // THE ADAPTER MAY NOT SPELL A VOICE. `speak` is handed `RenderSettings.voice` and sends it
  // straight through as MiniMax's `voice_id` (S-070, D-008) — and the default was still the
  // string `'stand-in'`, which the stand-in narration port ignores and a real provider refuses.
  // Every narration call of a real run would have been refused before a single clip was bought,
  // and sessions 40, 41 and 42 each carried it forward as a named limit (S-128).
  //
  // So it is a setting, like the image entry (S-127): the free path is byte-for-byte what every
  // verified feature runs on, and the run that spends names its voice.
  assert.equal(DEFAULT_RENDER_SETTINGS.voice, 'stand-in', "the pipeline's own default moved")
  assert.equal(
    readSettings({}).renderSettings.voice,
    DEFAULT_RENDER_SETTINGS.voice,
    'a plainly started service no longer renders with the pipeline’s own default',
  )
  assert.equal(
    readSettings({ [SETTING_NAMES.narrationVoice]: 'English_Graceful_Lady' }).renderSettings.voice,
    'English_Graceful_Lady',
    'the voice setting does not reach the render settings the worker is handed',
  )
  // Nothing else about what the worker renders with moves with it.
  const named = readSettings({
    [SETTING_NAMES.narrationVoice]: 'English_Graceful_Lady',
  }).renderSettings
  assert.deepEqual(
    { ...named, voice: DEFAULT_RENDER_SETTINGS.voice },
    DEFAULT_RENDER_SETTINGS,
    'naming a voice changed something else about the render settings',
  )
})

test('9. the composition root HANDS the worker those render settings, read from its own source', () => {
  // The setting reaching `ServiceSettings` proves nothing on its own: `startWorker` takes
  // `renderSettings`, and `apps/service` had never passed it at all — every run rendered with the
  // pipeline's own defaults whatever the settings said. Proving it end to end would mean a whole
  // reel through a loopback wire; this is check 17's form instead, which reads the composition
  // root's source for the one line, as check 11 reads it for a slug (S-128).
  const source = readFileSync(join(REPO, 'apps', 'service', 'src', 'service.ts'), 'utf8')
  assert.match(
    source,
    /renderSettings:\s*settings\.renderSettings/,
    'apps/service does not hand the worker the render settings it read',
  )
  // And it is handed to `startWorker`, not kept somewhere nothing reads.
  const call = /startWorker\(\{[\s\S]*?\n\s{4}\}\)/.exec(source)?.[0] ?? ''
  assert.match(call, /renderSettings/, 'the render settings are not in the startWorker call')
})

test('9. it sends where the base URL it was handed says, so a test can never reach the provider', async () => {
  const folder = root()
  try {
    // ADDED AFTER SESSION 39's BREAK CAMPAIGN, where an adapter that ignored its base URL
    // entirely was caught by NOTHING in this file: every test here uses the default, so going to
    // the provider's own host looked exactly like honouring the setting. It is the model
    // adapter's break m15 of session 38, which check 3 caught through the service — and check 3
    // is the MODEL port's. This is what S-111 rests on: a suite that cannot reach a provider.
    const { wire, port } = adapter(
      ['minimax-t2a-redacted', 'minimax-subtitle-words'],
      folder.path,
      {
        baseUrl: 'http://127.0.0.1:9/',
      },
    )
    made(await port.speak(REQUEST))
    assert.equal(
      (wire.sent[0] as Sent).url,
      'http://127.0.0.1:9/v1/t2a_v2',
      'the adapter ignored the base URL it was handed — a trailing slash is trimmed, not obeyed',
    )
  } finally {
    folder.clean()
  }
})

test('9. the audio is written under the artifact root, and the answer carries its path and never its bytes', async () => {
  const folder = root()
  try {
    const { port } = adapter(['minimax-t2a-redacted', 'minimax-subtitle-words'], folder.path)
    const answer = made(await port.speak(REQUEST))

    const expected = join(folder.path, REQUEST.runId, `${REQUEST.narrationId}.mp3`)
    assert.equal(
      answer.audio.path,
      expected,
      'the audio is not at <root>/<runId>/<narrationId>.mp3',
    )
    assert.equal(answer.audio.narrationId, REQUEST.narrationId)
    const inside = relative(folder.path, answer.audio.path)
    assert.ok(!inside.startsWith('..') && inside !== '', `${answer.audio.path} escapes the root`)

    // FILES, NOT BYTES (D-086, D-087): what is on disk is the audio the provider sent, hex
    // decoded, and the answer carries no copy of it.
    const recorded = readWire('minimax-t2a-redacted')
    const hex = (recorded.response.body as { data: { audio: string } }).data.audio
    assert.deepEqual(readFileSync(answer.audio.path), Buffer.from(hex, 'hex'))
    assert.equal(statSync(answer.audio.path).size, hex.length / 2)
    assert.doesNotMatch(JSON.stringify(answer), new RegExp(hex), 'the answer carries the audio')
  } finally {
    folder.clean()
  }
})

test('9. the timings it returns are the ones the stage parses — every word of the text, in order', async () => {
  const folder = root()
  try {
    const { port } = adapter(['minimax-t2a-redacted', 'minimax-subtitle-words'], folder.path)
    const answer = made(await port.speak(REQUEST))

    // S-070's parser, at the stage's boundary, against a measured duration a probe would give.
    const parsed = wordTimings(TEXT, 3.2).safeParse(answer.timings)
    assert.ok(
      parsed.success,
      `the timings do not parse: ${JSON.stringify(parsed.error?.issues ?? [])}`,
    )
    assert.deepEqual(
      parsed.data?.map((t) => t.word),
      TEXT.split(' '),
    )
    assert.deepEqual(parsed.data?.[0], { word: 'Radar', startMs: 0, endMs: 420 })
    assert.deepEqual(parsed.data?.at(-1), { word: 'did.', startMs: 2960, endMs: 3160 })
  } finally {
    folder.clean()
  }
})

test('9. the receipt records the text’s CODE POINTS as characters, a cost of zero, and fake: false', async () => {
  const folder = root()
  try {
    // One letter outside the Basic Multilingual Plane: 12 code points, 13 UTF-16 units (S-088).
    const text = 'Radar \u{1D400} did.'
    assert.equal([...text].length, 12)
    assert.equal(text.length, 13)

    const { port } = adapter(['minimax-t2a-redacted', subtitleFor(text)], folder.path)
    const answer = made(await port.speak({ ...REQUEST, text }))

    assert.equal(answer.receipt.characters, 12, 'characters are UTF-16 units, not code points')
    // The token plan covers T2A, so a real narration costs nothing (D-019, S-070, S-110) — and
    // the receipt is still a REAL one: `fake` is what carries the difference (S-036).
    assert.equal(answer.receipt.costCents, 0)
    assert.equal(answer.receipt.fake, false)
    assert.equal(answer.receipt.model, 'speech-2.8-hd')
  } finally {
    folder.clean()
  }
})

test('9. 429 and 5xx are ANSWERED unavailable with a detail — the arm S-096 built, not a throw', async () => {
  const folder = root()
  try {
    for (const [name, status] of [
      ['minimax-t2a-busy', 429],
      ['minimax-t2a-broken', 503],
    ] as const) {
      const { port } = adapter([name], folder.path)
      const detail = detailOf(await port.speak(REQUEST))
      assert.match(
        detail,
        new RegExp(String(status)),
        `${name}: the detail does not name ${status}`,
      )
      assert.doesNotMatch(detail, new RegExp(KEY), `${name}: a detail holds the key`)
      assert.deepEqual(readdirSync(folder.path), [], 'a call that made nothing wrote a file')
    }

    // A 200 whose base_resp says the provider was busy anyway is the same answer: MiniMax reports
    // its own outcome under 200 as well as in the status, and 1002 is the one code that is busy.
    const { port } = adapter(['minimax-t2a-limited'], folder.path)
    assert.match(detailOf(await port.speak(REQUEST)), /1002/)
    assert.deepEqual(readdirSync(folder.path), [], 'a call that made nothing wrote a file')
  } finally {
    folder.clean()
  }
})

test('9. a connection error and a call that times out are answered unavailable: neither reached the provider', async () => {
  const folder = root()
  try {
    const refused: typeof globalThis.fetch = () =>
      Promise.reject(new TypeError('fetch failed: ECONNREFUSED 127.0.0.1:443'))
    const connection = await minimaxNarration({
      key: KEY,
      artifactRoot: folder.path,
      fetch: refused,
    }).speak(REQUEST)
    assert.match(detailOf(connection), /ECONNREFUSED/)

    // The adapter's OWN timeout. The held timer is load-bearing: `AbortSignal.timeout`'s own timer
    // is UNREF'D, so with nothing else pending Node drains the loop and the call never settles at
    // all. It is also what makes this an assertion — an adapter that set no signal fails here,
    // saying so, rather than hanging (session 38's finding).
    const hangs: typeof globalThis.fetch = (_input, init) =>
      new Promise((_resolve, reject) => {
        const held = setTimeout(() => reject(new Error('the transport was never aborted')), 5_000)
        init?.signal?.addEventListener('abort', () => {
          clearTimeout(held)
          reject(new DOMException('This operation was aborted', 'AbortError'))
        })
      })
    const timedOut = await minimaxNarration({
      key: KEY,
      artifactRoot: folder.path,
      fetch: hangs,
      timeoutMs: 50,
    }).speak(REQUEST)
    assert.match(detailOf(timedOut), /50/, 'the detail does not name how long it waited')
  } finally {
    folder.clean()
  }
})

test('9. a transient on the SECOND call, the subtitle fetch, is answered unavailable too', async () => {
  const folder = root()
  try {
    const { wire, port } = adapter(['minimax-t2a-redacted', 'minimax-subtitle-busy'], folder.path)
    const detail = detailOf(await port.speak(REQUEST))

    assert.match(detail, /429/, 'a 429 on the timings fetch was not classified transient')
    assert.doesNotMatch(detail, new RegExp(KEY), 'a detail holds the key')
    assert.equal(wire.sent.length, 2, 'the adapter did not try to fetch the timings')
    // THE KNOWN LIMIT, ASSERTED SO IT CANNOT BE FORGOTTEN (S-123). The audio was made, and the
    // WHOLE call is what the worker's guarded port sends again — so the audio is made a second
    // time. An adapter may not retry a call of its own (S-096, S-122), and T2A is covered by the
    // token plan, so the second buy costs nothing today; Slice 8 measures it.
    assert.equal(
      wire.sent.filter((s) => s.path === T2A_PATH).length,
      1,
      'the adapter sent the audio call again itself: an adapter classifies, it never retries',
    )
  } finally {
    folder.clean()
  }
})

test('9. 400, 401, a body that does not parse and timings that are not timings THROW', async () => {
  const folder = root()
  try {
    const cases: readonly (readonly [string, readonly (string | Wire)[]])[] = [
      ['a 400', ['minimax-t2a-refused']],
      ['a 401', ['minimax-t2a-denied']],
      ['a body that is not JSON', ['minimax-t2a-garbled']],
      // `Buffer.from(x, 'hex')` truncates silently at the first character that is not hex, so an
      // audio field that is half an error message would be WRITTEN OUT AS A SHORT FILE and
      // answered `made`. Read, not written.
      ['audio that is not hex', ['minimax-t2a-clipped']],
      [
        'a subtitle body that is not the timings',
        ['minimax-t2a-redacted', 'minimax-subtitle-garbled'],
      ],
    ]
    for (const [what, names] of cases) {
      const { port } = adapter(names, folder.path)
      const error = await threw(() => port.speak(REQUEST))
      assert.doesNotMatch(error.message, new RegExp(KEY), `${what}: the message holds the key`)
      assert.doesNotMatch(
        error.message,
        /authorization/i,
        `${what}: the message names the header a key is sent in`,
      )
    }
  } finally {
    folder.clean()
  }
})

// ---------------------------------------------------------------- 10

// THE PRESIGNED URL IS BUILT HERE AND NEVER COMMITTED.
//
// Check 21 forbids any fixture to hold a query string, because a recorded presigned URL is a live
// credential sitting in this repository — the exact incident D-022 records. So check 10 takes the
// redacted fixture, which carries the host and the path alone, and puts a live-shaped query back
// on it inside the test. Nothing below is a real credential; every part of it is shaped like one.

const OSS_KEY_ID = 'STS.NTxKANARYxxxxxxxxxxxxxx'
const OSS_SIGNATURE = 'aBcDeF0123456789%2FgHiJkLmNoP%3D'
const OSS_EXPIRES = '1757000000'

function presigned(): { wire: Wire; url: string } {
  const recorded = readWire('minimax-t2a-redacted')
  const answer = structuredClone(recorded.response.body) as { data: { subtitle_file: string } }
  const query = `OSSAccessKeyId=${OSS_KEY_ID}&Expires=${OSS_EXPIRES}&Signature=${OSS_SIGNATURE}`
  const url = `${answer.data.subtitle_file}?${query}`
  answer.data.subtitle_file = url
  return {
    wire: { ...recorded, case: 'presigned', response: { ...recorded.response, body: answer } },
    url,
  }
}

test('10. the timings are fetched FROM the presigned URL — the drop is a drop, not a failure to use it', async () => {
  const folder = root()
  try {
    const { wire: fixture, url } = presigned()
    const { wire, port } = adapter([fixture, 'minimax-subtitle-words'], folder.path)
    const answer = made(await port.speak(REQUEST))

    const fetched = wire.sent[1] as Sent
    assert.equal(fetched.url, url, 'the adapter did not fetch the URL the provider gave it')
    assert.ok(wordTimings(TEXT, 3.2).safeParse(answer.timings).success, 'no timings came back')
  } finally {
    folder.clean()
  }
})

test('10. nothing the adapter returns, records or writes holds that URL, either credential, or any query string', async () => {
  const folder = root()
  try {
    const { wire: fixture, url } = presigned()
    const { port } = adapter([fixture, 'minimax-subtitle-words'], folder.path)

    // Anything the adapter printed is part of the hunt: a log line is a place a credential has
    // leaked before (S-109, D-022). Nothing here should print at all.
    const printed: string[] = []
    const out = process.stdout.write.bind(process.stdout)
    const err = process.stderr.write.bind(process.stderr)
    let answer: NarrationAnswer
    try {
      const capture = ((chunk: string | Uint8Array) => {
        printed.push(String(chunk))
        return true
      }) as typeof process.stdout.write
      process.stdout.write = capture
      process.stderr.write = capture
      answer = await port.speak(REQUEST)
    } finally {
      process.stdout.write = out
      process.stderr.write = err
    }
    const spoken = made(answer)

    /** Every file the adapter wrote, as BYTES — a URL written and then deleted is still there. */
    const files: { at: string; text: string }[] = []
    const walk = (at: string): void => {
      for (const entry of readdirSync(at, { withFileTypes: true })) {
        const path = join(at, entry.name)
        if (entry.isDirectory()) walk(path)
        else files.push({ at: path, text: readFileSync(path).toString('latin1') })
      }
    }
    walk(folder.path)
    assert.equal(files.length, 1, `the adapter wrote ${files.length} files, not one`)

    const hunted: readonly { where: string; text: string }[] = [
      { where: 'the answer', text: JSON.stringify(answer) },
      { where: 'the receipt', text: JSON.stringify(spoken.receipt) },
      { where: 'the timings', text: JSON.stringify(spoken.timings) },
      { where: 'what it printed', text: printed.join('') },
      ...files.map((f) => ({ where: `the file ${f.at.split(sep).at(-1)}`, text: f.text })),
    ]

    for (const { where, text } of hunted) {
      assert.ok(!text.includes(url), `${where} holds the presigned URL`)
      assert.ok(!text.includes(OSS_KEY_ID), `${where} holds OSSAccessKeyId`)
      assert.ok(!text.includes(OSS_SIGNATURE), `${where} holds Signature`)
      assert.ok(!text.includes(OSS_EXPIRES), `${where} holds Expires`)
      assert.ok(
        !/[?&][A-Za-z0-9_-]+=/.test(text),
        `${where} holds a query string: ${text.slice(0, 200)}`,
      )
      // The host on its own is the most S-109 allows to be kept — and nothing persisted here
      // needs even that, so nothing persisted here holds it.
      assert.ok(!text.includes('aliyuncs.com'), `${where} holds the provider's storage host`)
    }
    assert.deepEqual(printed, [], 'the adapter printed something')
  } finally {
    folder.clean()
  }
})
