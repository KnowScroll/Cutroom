import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import type { PictureRef, PictureTextReader } from '@cutroom/contracts'
import {
  BLUR_FLOOR,
  READ_TEXT_QUESTION,
  SHAPE_PREFACE,
  REQUIRED_FILTERS,
  SENSOR_FILTERS,
  ffmpegSensors,
  ffmpegTools,
  isUnavailable,
  minimaxModel,
  sensorPort,
  visibleText,
} from '@cutroom/providers'
import { recordedFetch } from './engine/wire.ts'
import { startService, waitFor } from './engine/service.ts'
import { THREE_RANKS, THREE_RANKS_PICS, stillsRequest, stillsScript } from './engine/stills.ts'

// paid-path, Slice 7 — checks 18 and 19 (docs/features/paid-path.md): the real PictureSensorPort,
// the FIFTH and LAST real adapter and the only one that costs nothing and reads no key.
//
// NOTHING HERE SPENDS AND NOTHING HERE NEEDS A KEY (S-111, S-112). The three measures are the
// ffmpeg this repository already requires (S-075) — `blurdetect` for sharpness, `signalstats` for
// brightness, `ssim` for similarity — run on pictures made by ffmpeg inside the test. The text
// step is one vision call, answered from recorded wire or from a reader the test hands in.
//
// WHY THE TEXT STEP IS A MODEL CALL AT ALL. Gate 1's four steps include a text step (D-042), and
// this ffmpeg has no `ocr` filter and no tesseract — so a local sensor could only ever answer
// "no text", which is a gate that always passes, which is weakening a check to make it buildable
// (S-112). That is why a failed call must THROW: an answer of "no text" on a failed call is the
// same always-passing gate arriving by another road.

/** A made-up key. It exists to be searched for in the one place the sensor must never reach. */
const KEY = 'minimax-test-key-7b1e4a09c3d2'

/** What the routing table is in these tests: one model, so a receipt's model id is unambiguous. */
const MODELS = {
  planner: 'm-plan',
  reconciler: 'm-plan',
  witness: 'm-see',
  judge: 'm-see',
} as const

const tools = ffmpegTools()

/** A folder the test owns, with the pictures it asked ffmpeg for. */
interface Pictures {
  dir: string
  clean(): void
  ref(name: string): PictureRef
}

/** One picture, made by the ffmpeg this repository already requires — never committed (CLAUDE.md). */
async function make(dir: string, name: string, source: string, filters?: string): Promise<void> {
  const path = join(dir, `${name}.png`)
  const ran = await tools.run('ffmpeg', [
    '-hide_banner',
    '-nostdin',
    '-y',
    '-f',
    'lavfi',
    '-i',
    source,
    ...(filters === undefined ? [] : ['-vf', filters]),
    '-frames:v',
    '1',
    path,
  ])
  assert.equal(ran.code, 0, `ffmpeg could not make ${name}: ${ran.stderr.trim()}`)
}

/**
 * Five pictures and one file that is not a picture. `detailed` and `blurred` are the SAME source,
 * one of them through `boxblur`, so what separates them is nothing but their sharpness.
 */
async function pictures(): Promise<Pictures> {
  const dir = mkdtempSync(join(tmpdir(), 'cutroom-sensor-'))
  await make(dir, 'detailed', 'testsrc=size=90x160:duration=1:rate=1')
  await make(dir, 'blurred', 'testsrc=size=90x160:duration=1:rate=1', 'boxblur=6:2')
  // Past the blur floor: this one reads about 44 where the floor is 30, so what holds its
  // sharpness inside the range is the clamp and nothing else.
  await make(dir, 'smeared', 'testsrc=size=90x160:duration=1:rate=1', 'boxblur=14:3')
  // The same content at twice the size — still 9:16, and not the same frame (D-028 allows both).
  await make(dir, 'enlarged', 'testsrc=size=180x320:duration=1:rate=1')
  await make(dir, 'black', 'color=c=black:size=90x160')
  await make(dir, 'white', 'color=c=white:size=90x160')
  await make(dir, 'grey', 'color=c=gray:size=90x160')
  // The SAME LUMA as `grey` and a different colour: 0x00DA00 is Y 125 against grey's 126, so a
  // similarity read from the luma channel alone calls the two of them the same picture.
  await make(dir, 'tinted', 'color=c=0x00DA00:size=90x160')
  writeFileSync(join(dir, 'notes.png'), 'this is not a picture, whatever its name says')
  return {
    dir,
    clean: () => rmSync(dir, { recursive: true, force: true }),
    ref: (name) => ({ pictureId: name, path: join(dir, `${name}.png`) }),
  }
}

/** A full-range YUV file, which `format` does not rescale: only the clamp holds it in range. */
async function fullRangeBlack(dir: string): Promise<PictureRef> {
  const path = join(dir, 'full-range.jpg')
  const ran = await tools.run('ffmpeg', [
    '-hide_banner',
    '-nostdin',
    '-y',
    '-f',
    'lavfi',
    '-i',
    'color=c=black:size=90x160',
    '-frames:v',
    '1',
    '-pix_fmt',
    'yuvj420p',
    path,
  ])
  assert.equal(ran.code, 0, `ffmpeg could not make a full-range file: ${ran.stderr.trim()}`)
  return { pictureId: 'full-range', path }
}

/** A reader that must never be called: the two measured steps make no model call and spend nothing. */
function noReader(): PictureTextReader & { calls: number } {
  const reader = ((picture: PictureRef): Promise<unknown> => {
    reader.calls += 1
    return Promise.reject(new Error(`the sensor made a model call about ${picture.pictureId}`))
  }) as PictureTextReader & { calls: number }
  reader.calls = 0
  return reader
}

/** A reader that answers what it is given, and counts what it was asked. */
function reads(answer: unknown): PictureTextReader & { asked: string[] } {
  const reader = ((picture: PictureRef) => {
    reader.asked.push(picture.pictureId)
    return Promise.resolve(answer)
  }) as PictureTextReader & { asked: string[] }
  reader.asked = []
  return reader
}

// ---------------------------------------------------------------- 18

test('18. sharpness is read from blurdetect: the same picture blurred measures lower, and every value is in 0..1', async () => {
  const pics = await pictures()
  try {
    const sensors = ffmpegSensors(tools)
    const sharp = await sensors.measure(pics.ref('detailed'))
    const soft = await sensors.measure(pics.ref('blurred'))

    for (const measured of [sharp, soft]) {
      assert.equal(measured.readable, true)
      assert.equal(measured.width, 90)
      assert.equal(measured.height, 160)
      assert.ok(
        measured.sharpness >= 0 && measured.sharpness <= 1,
        `sharpness ${measured.sharpness} is outside the range PictureMeasure declares`,
      )
    }
    // The ONE thing that separates the two files is a blur. A sharpness that did not come out of
    // blurdetect — a constant, a figure read from the wrong filter's log — cannot tell them apart.
    assert.ok(
      sharp.sharpness > soft.sharpness,
      `the blurred picture did not measure softer: ${sharp.sharpness} against ${soft.sharpness}`,
    )

    // PAST THE FLOOR. `smeared` reads about 44 against a floor of 30, so the arithmetic alone
    // gives about -0.48 and only the clamp holds it in the range the port declares.
    const smeared = await sensors.measure(pics.ref('smeared'))
    assert.equal(
      smeared.sharpness,
      0,
      `a picture past the blur floor measured ${smeared.sharpness}`,
    )

    // A FLAT FRAME HAS NO EDGE TO MEASURE, and blurdetect answers `nan`. It is NOT sharp: reading
    // that as 1 would put a blank picture above every real one in the keyframe score (S-044).
    const flat = await sensors.measure(pics.ref('black'))
    assert.equal(flat.sharpness, 0, `a flat picture measured ${flat.sharpness} sharp`)
    assert.ok(flat.sharpness < sharp.sharpness, 'a flat picture is not softer than a detailed one')
  } finally {
    pics.clean()
  }
})

test('18. brightness is read from signalstats: black is 0, white is 1, grey is between them, and every value is in 0..1', async () => {
  const pics = await pictures()
  try {
    const sensors = ffmpegSensors(tools)
    const black = await sensors.measure(pics.ref('black'))
    const white = await sensors.measure(pics.ref('white'))
    const grey = await sensors.measure(pics.ref('grey'))

    for (const measured of [black, white, grey]) {
      assert.ok(
        measured.brightness >= 0 && measured.brightness <= 1,
        `brightness ${measured.brightness} is outside the range PictureMeasure declares`,
      )
    }
    assert.equal(black.brightness, 0, 'black did not measure 0')
    assert.equal(white.brightness, 1, 'white did not measure 1')
    assert.ok(
      grey.brightness > black.brightness && grey.brightness < white.brightness,
      `grey measured ${grey.brightness}, which is not between black and white`,
    )

    // A FULL-RANGE FILE, which `format` does not rescale — measured on this machine, a full-range
    // black JPEG reports a luma of 0 where a PNG's black reports 16. The arithmetic alone gives
    // about -0.07, so what holds this inside the declared range is the clamp.
    const full = await sensors.measure(await fullRangeBlack(pics.dir))
    assert.equal(full.readable, true, 'a full-range JPEG did not measure readable')
    assert.equal(full.brightness, 0, `a full-range black measured ${full.brightness}`)
  } finally {
    pics.clean()
  }
})

test('18. similarity is read from ssim: a picture against itself is 1, against another it is lower, and both are in -1..1', async () => {
  const pics = await pictures()
  try {
    const sensors = ffmpegSensors(tools)
    const itself = await sensors.similarity(pics.ref('detailed'), pics.ref('detailed'))
    const other = await sensors.similarity(pics.ref('detailed'), pics.ref('black'))

    for (const value of [itself, other]) {
      assert.ok(
        value >= -1 && value <= 1,
        `similarity ${value} is outside the range PictureSensorPort declares`,
      )
    }
    assert.equal(itself, 1, 'a picture against itself did not measure 1')
    assert.ok(other < itself, `two different pictures measured ${other}, not below ${itself}`)
    // Gate 1S reads `suspicion = 1 - similarity` against a threshold of 0.25 (S-045), so a
    // similarity that is always 1 accepts every pair with no call — the same always-passing gate
    // the text step must not become.
    assert.ok(other < 0.75, `two different pictures are not suspicious at all: ${other}`)

    // AND IT IS SSIM'S COMBINED FIGURE, not one channel's. `grey` and `tinted` have the SAME
    // LUMA and different colour, so ssim's luma channel calls them the same picture and its
    // combined figure does not — measured on this machine: Y 0.99997, U 0.8074, V 0.6575,
    // All 0.9108. A band that admits the combined figure and excludes all three channels is what
    // tells them apart, and S-045 compares WHOLE PICTURES: two that differ only in colour are not
    // the same picture.
    const coloured = await sensors.similarity(pics.ref('grey'), pics.ref('tinted'))
    assert.ok(
      coloured > 0.85 && coloured < 0.99,
      `similarity is not ssim's combined figure: ${coloured} ` +
        '(All is 0.9108 here; Y alone 0.99997, U 0.8074, V 0.6575)',
    )

    // TWO SIZES. Every picture past Gate 1's technical step is 9:16, but not necessarily the same
    // 9:16 (D-028), and ssim refuses two frames of different sizes outright — so a pair the engine
    // can really produce must be ANSWERED, not thrown.
    const scaled = await sensors.similarity(pics.ref('detailed'), pics.ref('enlarged'))
    assert.ok(
      scaled > 0.8,
      `the same content at twice the size measured ${scaled}, which is not nearly the same picture`,
    )
  } finally {
    pics.clean()
  }
})

test('18. a file that is not a picture measures unreadable rather than throwing, and no model call is made', async () => {
  const pics = await pictures()
  try {
    const sensors = ffmpegSensors(tools)
    const measured = await sensors.measure(pics.ref('notes'))
    assert.equal(measured.readable, false, 'bytes that are no picture measured readable')
    assert.equal(measured.width, 0)
    assert.equal(measured.height, 0)
    assert.equal(measured.sharpness, 0)
    assert.equal(measured.brightness, 0)
  } finally {
    pics.clean()
  }
})

test('18. neither measured step makes a model call: measure and similarity spend nothing', async () => {
  const pics = await pictures()
  const reader = noReader()
  try {
    const sensors = ffmpegSensors(tools)
    await sensors.measure(pics.ref('detailed'))
    await sensors.measure(pics.ref('notes'))
    await sensors.similarity(pics.ref('detailed'), pics.ref('black'))
    assert.equal(reader.calls, 0, 'a measured step made a model call')
    // The port takes its reader at the TEXT step and nowhere else: `measure` and `similarity`
    // cannot reach one, which is what makes "no model call, no spend" true by construction.
    assert.equal(sensors.measure.length, 1, 'measure takes something besides a picture')
    assert.equal(sensors.similarity.length, 2, 'similarity takes something besides two pictures')
  } finally {
    pics.clean()
  }
})

test('18. the three filters the sensor uses are what every ffmpeg port is made ready against', async () => {
  // S-075: a missing tool or filter is found when a worker starts, before any clip is bought. The
  // sensor's port has no `ready()` of its own, so its filters join the list every ffmpeg port's
  // `ready()` demands — a machine without `blurdetect` refuses to start rather than measuring 0.
  for (const filter of ['blurdetect', 'signalstats', 'ssim']) {
    const named: readonly string[] = SENSOR_FILTERS
    assert.ok(named.includes(filter), `SENSOR_FILTERS does not hold ${filter}`)
    assert.ok(REQUIRED_FILTERS.includes(filter), `REQUIRED_FILTERS does not hold ${filter}`)
  }
  // And the tools on this machine really have them: a list nothing checks is a list that lies.
  await ffmpegTools({ requiredFilters: SENSOR_FILTERS }).ready()
  await assert.rejects(
    ffmpegTools({ requiredFilters: [...SENSOR_FILTERS, 'nosuchfilter'] }).ready(),
    /nosuchfilter/,
  )
})

test('18. the sensor port stops refusing, and no adapter in any closed set is named and not built', async () => {
  // The sensor was the LAST adapter that refused by name (S-125 moved check 2's "named and not
  // built" assertion here when the video port was built). It is built now, so the assertion is
  // not deleted — it becomes its own opposite, which is strictly stronger: EVERY name in EVERY
  // closed set builds, and a port that answers "not built" is the finding.
  const port = sensorPort('local', {
    artifactRoot: '.',
    models: MODELS,
    tools,
  })
  assert.equal(typeof port.measure, 'function')
  assert.equal(typeof port.readText, 'function')
  assert.equal(typeof port.similarity, 'function')
})

// ---------------------------------------------------------------- 19

test('19. the text step is ONE vision call, and the strings it answers are the sensor’s answer', async () => {
  const pics = await pictures()
  const reader = reads({ text: ['MAGNA CARTA', '1215'] })
  try {
    const sensors = ffmpegSensors(tools)
    const words = await sensors.readText(pics.ref('detailed'), reader)
    assert.deepEqual(words, ['MAGNA CARTA', '1215'], 'the strings are not the model’s')
    assert.deepEqual(reader.asked, ['detailed'], 'the text step made more than one call')
  } finally {
    pics.clean()
  }
})

test('19. a failed call THROWS: the sensor never answers "no text"', async () => {
  const pics = await pictures()
  try {
    const sensors = ffmpegSensors(tools)
    // A call the provider could answer differently if it were asked again (S-122), and one it
    // could not. Neither may become an empty list: a text step that cannot fail is a gate that
    // always passes, which is the whole reason this step is a model call (S-112).
    for (const thrown of [new Error('the witness call was answered 503'), new Error('401')]) {
      await assert.rejects(
        sensors.readText(pics.ref('detailed'), () => Promise.reject(thrown)),
        (error: unknown) => error === thrown,
      )
    }
    // And an answer that arrives and is not this shape is a failed call too.
    for (const answer of [{}, { text: 'MAGNA CARTA' }, { text: [1, 2] }, null, 'none']) {
      await assert.rejects(
        sensors.readText(pics.ref('detailed'), () => Promise.resolve(answer)),
        /text/,
      )
    }
  } finally {
    pics.clean()
  }
})

test('19. against recorded wire the adapter carries the picture and the question fixed inside it, and its receipt is a readText by the witness', async () => {
  const pics = await pictures()
  const recorded = recordedFetch(['minimax-readtext-words'])
  try {
    const model = minimaxModel({ key: KEY, models: MODELS, fetch: recorded.fetch })
    const picture = pics.ref('detailed')
    const { value, receipt } = await model.readText({ picture, temperature: 0 })

    assert.deepEqual(visibleText.parse(value).text, ['MAGNA CARTA', 'Anno 1215'])
    assert.equal(receipt.call, 'readText')
    assert.equal(receipt.role, 'witness')
    assert.equal(receipt.model, MODELS.witness)
    assert.equal(receipt.fake, false)
    assert.deepEqual(receipt.pictureIds, ['detailed'])
    assert.deepEqual(receipt.takeIds, [])

    const [sent] = recorded.sent
    assert.ok(sent !== undefined, 'the adapter sent nothing')
    assert.equal(sent.path, '/v1/chat/completions')
    const body = JSON.parse(sent.body ?? '{}') as {
      model: string
      messages: Array<{ content: Array<{ type: string; image_url?: { url: string } }> }>
    }
    assert.equal(body.model, MODELS.witness)
    const parts = body.messages[0]?.content ?? []
    // I-8: a call that carries a picture carries NO PROMPT and NO SCHEMA THE CALLER WROTE. The
    // question is the adapter's own, the picture is carried as its own bytes, and the third part
    // is the ADAPTER'S OWN schema, said in the message because this wire answers 200 to
    // `response_format` and ignores it (S-130). Still nothing a caller's brief could be written
    // into — that is what I-8 forbids, and all three parts are fixed inside the adapter.
    assert.deepEqual(
      parts.map((p) => p.type),
      ['text', 'image_url', 'text'],
    )
    assert.equal(
      JSON.stringify(parts[0]),
      JSON.stringify({ type: 'text', text: READ_TEXT_QUESTION }),
    )
    assert.ok(parts[1]?.image_url?.url.startsWith('data:image/png;base64,'), 'no picture was sent')
    const shape = parts[2] as { type: string; text?: string }
    assert.ok(
      String(shape.text).startsWith(SHAPE_PREFACE),
      'the third part is not the shape, so something else reached a call that carries a picture',
    )
    assert.match(String(shape.text), /"text"/, "the shape does not name the answer's own field")
    assert.equal(sent.headers.authorization, `Bearer ${KEY}`)
    assert.deepEqual(recorded.left(), [])
  } finally {
    pics.clean()
  }
})

test('19. a transient on the text call is thrown as Unavailable, and a wrong request as a plain fault, with the key in neither', async () => {
  const pics = await pictures()
  try {
    const picture = pics.ref('detailed')
    for (const [fixture, transient, says] of [
      ['minimax-chat-busy', true, /answered 429/],
      ['minimax-chat-denied', false, /answered 40/],
      // A body that is not JSON at all, and a body that parses and is not this wire. They are
      // DIFFERENT failures and each must say which it was: an adapter that fell over further down
      // with a TypeError would satisfy "this threw" and tell an operator nothing (S-124's `t6`).
      ['minimax-chat-garbled', false, /is not JSON/],
      ['minimax-readtext-alien', false, /is not this wire/],
    ] as const) {
      const recorded = recordedFetch([fixture])
      const model = minimaxModel({ key: KEY, models: MODELS, fetch: recorded.fetch })
      const error = await model.readText({ picture, temperature: 0 }).then(
        () => null,
        (thrown: unknown) => thrown,
      )
      assert.ok(error instanceof Error, `${fixture} did not fail`)
      assert.equal(isUnavailable(error), transient, `${fixture} was classified the other way`)
      assert.match(error.message, says, `${fixture} does not say what went wrong`)
      assert.ok(!error.message.includes(KEY), `${fixture} put the key in its message`)
    }
  } finally {
    pics.clean()
  }
})

test('19. a run through the service reads its pictures for real and writes ONE readText receipt for every picture the witness saw', async () => {
  // THE WHOLE CHAIN, in a process of its own: the composition root builds the local sensor, the
  // worker wraps the model in `recordingPort`, and `gate1` hands the sensor a reader made from
  // THAT port — so the vision call the sensor makes writes its `model_receipt` row (D-084, D-006).
  // A sensor handed a model port at construction would make the same call and leave no row.
  const script = stillsScript(THREE_RANKS, THREE_RANKS_PICS, {
    judge: Array.from({ length: 8 }, () => ({ subjects: [] })),
  })
  const service = await startService({
    standIn: {
      model: {
        ...script,
        // Per picture the witness is asked TWICE, in gate1's order: the text step (step 2), then
        // the observation (step 3). An engine that made one call a picture would run out here.
        witness: (script.witness ?? []).flatMap((observed) => [{ value: { text: [] } }, observed]),
      },
    },
    env: { CUTROOM_PROVIDER_SENSOR: 'local' },
  })
  try {
    const submitted = await service.http.submit({
      ...stillsRequest('paid-sensor-1'),
      options: { until: 'stills', budgetCents: 300 },
    })
    assert.equal(submitted.status, 202, JSON.stringify(submitted.json))
    const runId = String(submitted.json.runId)
    await waitFor(`run ${runId} to finish`, async () => {
      const { json } = await service.http.status(runId)
      return json.state === 'finished'
    })

    const receipts = service.query<{ call: string; role: string; picture_ids: string }>(
      'SELECT call, role, picture_ids FROM model_receipt WHERE run_id = ?',
      runId,
    )
    const readTexts = receipts.filter((r) => r.call === 'readText')
    const observes = receipts.filter((r) => r.call === 'observe')
    assert.ok(observes.length > 0, 'no picture reached the witness')
    assert.equal(
      readTexts.length,
      observes.length,
      'the text step is not one call for every picture the witness saw',
    )
    for (const receipt of readTexts) {
      assert.equal(receipt.role, 'witness')
      assert.equal((JSON.parse(receipt.picture_ids) as string[]).length, 1)
    }
    assert.deepEqual(
      readTexts.map((r) => r.picture_ids).sort(),
      observes.map((r) => r.picture_ids).sort(),
      'the text step and the witness were asked about different pictures',
    )

    // And the measures are the FILE's, read by ffmpeg: every picture the stand-in image port
    // wrote is a readable 9:16 whose two technical terms are in the range the port declares.
    const rows = service.query<{ measure: string | null }>(
      'SELECT measure FROM picture WHERE run_id = ?',
      runId,
    )
    assert.ok(rows.length > 0, 'the run made no picture')
    for (const row of rows) {
      assert.ok(row.measure !== null, 'a picture has no measure')
      const measure = JSON.parse(row.measure) as {
        readable: boolean
        width: number
        height: number
        sharpness: number
        brightness: number
      }
      assert.equal(measure.readable, true)
      assert.equal(measure.width * 16, measure.height * 9)
      assert.ok(measure.sharpness >= 0 && measure.sharpness <= 1)
      assert.ok(measure.brightness >= 0 && measure.brightness <= 1)
    }
  } finally {
    await service.stop()
    service.clean()
  }
})

test('19. the blur floor is a declared figure, not one spelled where a measure is taken', async () => {
  // S-124's rule for the image rate, applied to the one number that decides what "sharp" means:
  // a figure at a call site cannot be changed by a test, so a test cannot tell it from a constant
  // that happens to be right. Handing the sensor another floor must move the measure.
  const pics = await pictures()
  try {
    assert.ok(BLUR_FLOOR > 0 && Number.isFinite(BLUR_FLOOR))
    const wide = await ffmpegSensors(tools).measure(pics.ref('blurred'))
    const narrow = await ffmpegSensors(tools, { blurFloor: BLUR_FLOOR / 4 }).measure(
      pics.ref('blurred'),
    )
    assert.ok(
      narrow.sharpness < wide.sharpness,
      `the blur floor changed nothing: ${narrow.sharpness} against ${wide.sharpness}`,
    )
  } finally {
    pics.clean()
  }
})
