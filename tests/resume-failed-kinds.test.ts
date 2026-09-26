import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { test } from 'node:test'
import { crc32 } from 'node:zlib'
import { z } from 'zod'
import {
  OffSpec,
  ProviderFailed,
  RefusedRequest,
  Spent,
  StillUnavailable,
  Unanswered,
  Unavailable,
  failureKindOf,
  type FailureKind,
  type LanguageModelPort,
  type LostCall,
  type VideoRequest,
} from '@cutroom/contracts'
import { witnessObservation } from '@cutroom/pipeline'
import {
  fakeImage,
  fakeModel,
  fakeNarration,
  fakeVideo,
  falImage,
  falVideo,
  ffmpegMedia,
  ffmpegSensors,
  ffmpegTools,
  imageEntry,
  minimaxNarration,
  type FakeAnswer,
  type FakeScript,
} from '@cutroom/providers'
import { sentUntilAvailable } from '../apps/worker/src/transient.ts'
import { gate1s } from '../packages/pipeline/src/gates/gate1s.ts'
import { cutAnswer, gate7 } from '../packages/pipeline/src/gates/gate7.ts'
import { askWitness } from '../packages/pipeline/src/gates/witness.ts'
import { compareAnswer } from '../packages/pipeline/src/stills/prompts.ts'
import { startEngine, type Engine, type EngineOptions } from './engine/harness.ts'
import {
  THREE_RANKS,
  THREE_RANKS_PICS,
  seen,
  stills,
  stillsRequest,
  stillsScript,
  twice,
  type Pic,
} from './engine/stills.ts'
import { video, videoRequest, videoScript } from './engine/video.ts'
import { recordedFetch } from './engine/wire.ts'

// resume-failed, Slice 1 — checks 1 to 5 (docs/features/resume-failed.md): the kind of a failure
// (S-163, S-096, S-142, S-157). The kind is decided from the thrown thing's CLASS, by one function,
// never from its message; five classes are new, each thrown where a plain Error used to lose the
// fact, each with the message it had; and a run failed through the worker carries its kind in
// `run.failure` and nowhere else. Every message below was read off the code before this slice
// changed it, and is typed here by hand.

const LOST: LostCall = { port: 'image', model: 'a-model', costCents: 3, detail: 'what went wrong' }

/** What `run.failure` holds for a run, read from the table. */
function failureOf(engine: Engine, runId: string): string | null {
  const rows = engine.query<{ failure: string | null }>(
    'SELECT failure FROM run WHERE run_id = ?',
    runId,
  )
  assert.equal(rows.length, 1, `no run row for ${runId}`)
  return rows[0]!.failure
}

/** The failed result's keys, exactly: the kind is not among them (S-157). */
function assertFailedResult(result: Record<string, unknown>, detail: string | RegExp): void {
  assert.deepEqual(Object.keys(result).sort(), [
    'contractVersion',
    'costCents',
    'detail',
    'requestId',
    'runId',
    'status',
  ])
  assert.equal(result.status, 'failed', JSON.stringify(result))
  if (typeof detail === 'string') assert.equal(result.detail, detail)
  else assert.match(String(result.detail), detail)
}

/** Nothing a caller reads names the kind: no event carries it. */
function assertKindNowhereElse(events: readonly Record<string, unknown>[]): void {
  for (const event of events) {
    assert.ok(!('failure' in event), `an event carries the failure: ${JSON.stringify(event)}`)
  }
}

/** What a call threw, or a failure saying it did not throw at all. */
async function rejected(call: Promise<unknown>): Promise<unknown> {
  return call.then(
    () => assert.fail('the call did not throw'),
    (error: unknown) => error,
  )
}

// ---------------------------------------------------------------- 1

test("1. failureKindOf answers by class alone: an OffSpec is off-spec, a RefusedRequest engine, a Spent unreadable, an Unanswered unreadable, an Unavailable and a StillUnavailable unavailable, a ProviderFailed provider-failed; and a plain Error, a ZodError, a string, and a plain Error whose message is character for character each class's message are engine", () => {
  const zodError = z.string().safeParse(1).error
  assert.ok(zodError !== undefined)
  const classes: Array<[unknown, FailureKind]> = [
    [new OffSpec(LOST), 'off-spec'],
    [new RefusedRequest({ ...LOST, port: 'speech' }), 'engine'],
    [new Spent(LOST), 'unreadable'],
    [new Unanswered('the judge answered nothing it was asked'), 'unreadable'],
    [new Unavailable('fal answered 503'), 'unavailable'],
    [new StillUnavailable('the clip was answered unavailable three times'), 'unavailable'],
    [new ProviderFailed('the clip was accepted and then failed'), 'provider-failed'],
    [new Error('anything'), 'engine'],
    [zodError, 'engine'],
    ['a string', 'engine'],
    [undefined, 'engine'],
  ]
  for (const [thrown, kind] of classes) {
    assert.equal(failureKindOf(thrown), kind, `${String(thrown)} is ${failureKindOf(thrown)}`)
  }

  // The class is the fact, never the message: a plain Error carrying each class's message
  // character for character is engine, so no code can decide by reading one (S-096).
  for (const [thrown] of classes.slice(0, 7)) {
    const message = (thrown as Error).message
    assert.equal(failureKindOf(new Error(message)), 'engine', message)
  }

  // Each new class is the one it extends, so every place that already catches that one still does,
  // and its message is the one it had (S-142, S-096).
  assert.ok(new OffSpec(LOST) instanceof Spent)
  assert.ok(new RefusedRequest(LOST) instanceof Spent)
  assert.ok(new StillUnavailable('x') instanceof Unavailable)
  assert.equal(new OffSpec(LOST).message, new Spent(LOST).message)
  assert.equal(new RefusedRequest(LOST).message, new Spent(LOST).message)
  assert.deepEqual(new OffSpec(LOST).receipt, LOST)
  assert.equal(new StillUnavailable('the words as they were').message, 'the words as they were')
  assert.equal(new Unanswered('the words as they were').message, 'the words as they were')
  assert.equal(new ProviderFailed('the words as they were').message, 'the words as they were')
})

// ---------------------------------------------------------------- 2

/** A folder of this test's own, holding a 864x1536 keyframe for image-to-video. */
async function folder(): Promise<{ dir: string; picture: string; clean(): void }> {
  const dir = mkdtempSync(join(tmpdir(), 'resume-failed-kinds-'))
  const picture = join(dir, 'run-video-1', 'a1-shot-0-chosen.png')
  mkdirSync(dirname(picture), { recursive: true })
  const made = await ffmpegTools().run('ffmpeg', [
    '-v',
    'error',
    '-f',
    'lavfi',
    '-i',
    'color=c=red:s=864x1536',
    '-frames:v',
    '1',
    picture,
  ])
  assert.equal(made.code, 0, 'ffmpeg made no keyframe')
  return { dir, picture, clean: () => rmSync(dir, { recursive: true, force: true }) }
}

const IMAGE_REQUEST = {
  runId: 'run-image-1',
  pictureId: 'a1-shot-0-canonical',
  prompt: 'a keyframe of the subject, upright',
  references: [],
  aspectRatio: '9:16',
} as const

const TAKE = 'a1-shot-0-take-1'

function videoRequestOf(picture: string): VideoRequest {
  return {
    runId: 'run-video-1',
    takeId: TAKE,
    prompt: 'a papercraft library interior, the camera pushing slowly in on an open book',
    durationSeconds: 5,
    resolution: '768P',
    seed: crc32(TAKE),
    promptExpansionMode: 'balanced',
    mode: 'image-to-video',
    image: { pictureId: 'a1-shot-0-chosen', path: picture },
  }
}

const NARRATION_REQUEST = {
  runId: 'run-1',
  narrationId: 'a1-shot-0-narration',
  text: 'Radar did not win the battle. The telephone did.',
  voice: 'English_Wise_Woman',
}

const KEY = 'resume-failed-test-key-5c0e'

/** A model port whose one method is the one a check hands it, and which throws on anything else. */
function modelWith(over: Partial<LanguageModelPort>): LanguageModelPort {
  const never = () => {
    throw new Error('not called in this check')
  }
  return {
    structured: never,
    observe: never,
    compare: never,
    judgeCut: never,
    readText: never,
    ...over,
  } as LanguageModelPort
}

const RECEIPT = {
  model: 'hand-written',
  role: 'judge' as const,
  temperature: 0,
  usage: { inputTokens: 0, outputTokens: 0 },
  fake: true,
  pictureIds: [],
  takeIds: [],
}

test("2. every site the closed list names throws its class with its message unchanged: fal's frame refusal an OffSpec, a job fal reports FAILED a ProviderFailed in both of its shapes, MiniMax's narration answering 200 with a non-transient base_resp status a RefusedRequest, the witness's second refusal, Gate 1S's and Gate 7's unparsable answers and the text step's unparsable reading an Unanswered, and a spent counter a StillUnavailable", async () => {
  const f = await folder()
  try {
    // fal's frame refusal (P-010), on recorded wire: an OffSpec, still a Spent, so its lost call is
    // written as before (S-142).
    const frame = await rejected(
      falImage({
        key: KEY,
        entry: imageEntry(),
        artifactRoot: f.dir,
        fetch: recordedFetch([
          'fal-image-bare',
          'fal-image-completed',
          'fal-image-sideways',
          'fal-picture-landscape',
        ]).fetch,
        pollMs: 0,
      }).generate(IMAGE_REQUEST),
    )
    assert.ok(frame instanceof OffSpec, `the frame refusal is ${String(frame)}`)
    assert.ok(frame instanceof Spent)
    assert.equal(
      frame.message,
      "'fal-ai/flux-2-pro' produced a 1536x864 picture, which is not 9:16. image-to-video has no aspect_ratio field, so this picture would yield a clip of its own shape with no error at all (D-019, D-028) — and the call had already spent (S-142)",
    )
    assert.equal(failureKindOf(frame), 'off-spec')

    // A job fal accepted and then reported FAILED, its result read answering an error: the picture's
    // and the clip's — the usual shape.
    const imageFailed = await rejected(
      falImage({
        key: KEY,
        entry: imageEntry(),
        artifactRoot: f.dir,
        fetch: recordedFetch(['fal-image-bare', 'fal-image-halted', 'fal-image-broken']).fetch,
        pollMs: 0,
      }).generate(IMAGE_REQUEST),
    )
    assert.ok(imageFailed instanceof ProviderFailed, `a FAILED picture is ${String(imageFailed)}`)
    assert.equal(
      imageFailed.message,
      `the picture a1-shot-0-canonical on 'fal-ai/flux-2-pro' was answered 400 {"detail":"inference failed: the reference image could not be decoded"}`,
    )
    const probe = ffmpegMedia(ffmpegTools()).probe
    const UPLOAD = ['fal-upload-initiate', 'fal-upload-stored']
    const clip = (last: string) =>
      rejected(
        falVideo({
          key: KEY,
          artifactRoot: f.dir,
          probe,
          fetch: recordedFetch([...UPLOAD, 'fal-video-submitted', 'fal-video-halted', last]).fetch,
          pollMs: 0,
        }).generate(videoRequestOf(f.picture)),
      )
    const broken = await clip('fal-video-broken')
    assert.ok(broken instanceof ProviderFailed, `a FAILED clip is ${String(broken)}`)
    assert.equal(
      broken.message,
      `the clip a1-shot-0-take-1 was answered 400 {"detail":"inference failed: the keyframe could not be decoded"}`,
    )
    // ...and its result read answering 200 anyway: the FAILED branch's own throw.
    const silent = await clip('fal-video-silent')
    assert.ok(silent instanceof ProviderFailed, `a FAILED clip answering 200 is ${String(silent)}`)
    assert.equal(
      silent.message,
      `the clip a1-shot-0-take-1 was accepted and then failed: {"detail":"inference failed: the prompt was rejected by the safety checker"}`,
    )
    assert.equal(failureKindOf(silent), 'provider-failed')

    // MiniMax's narration answering HTTP 200 with a non-transient base_resp status: the request
    // refused as ours, a RefusedRequest — still a Spent, its lost call written (S-142) — engine.
    const speak = (names: string[]) =>
      rejected(
        minimaxNarration({
          key: KEY,
          artifactRoot: f.dir,
          fetch: recordedFetch(names).fetch,
        }).speak(NARRATION_REQUEST),
      )
    const rejectedAnswer = await speak(['minimax-t2a-rejected'])
    assert.ok(
      rejectedAnswer instanceof RefusedRequest,
      `a 200 refusal is ${String(rejectedAnswer)}`,
    )
    assert.ok(rejectedAnswer instanceof Spent)
    assert.equal(
      rejectedAnswer.message,
      'the narration a1-shot-0-narration was refused by the provider: 1004 invalid api key — and the call had already spent (S-142)',
    )
    assert.equal(failureKindOf(rejectedAnswer), 'engine')
    // The refused and denied answers fail BEFORE the provider answered: plain errors still, engine.
    for (const [name, message] of [
      [
        'minimax-t2a-refused',
        'the narration a1-shot-0-narration was answered 400 {"base_resp":{"status_code":1013,"status_msg":"invalid parameters"}}',
      ],
      [
        'minimax-t2a-denied',
        'the narration a1-shot-0-narration was answered 401 {"base_resp":{"status_code":1004,"status_msg":"invalid api key"}}',
      ],
    ] as const) {
      const before = await speak([name])
      assert.ok(!(before instanceof Spent), `${name} became a Spent`)
      assert.equal((before as Error).message, message)
      assert.equal(failureKindOf(before), 'engine')
    }

    // The witness's second refusal: an Unanswered, today's words (ask-again's check 17).
    const refusedTwice = await rejected(
      askWitness(
        { picture: { pictureId: 'a1-shot-0-a', path: f.picture } },
        async () => ({ value: { entities: 'none' } }),
        witnessObservation,
        'a1-shot-0-a',
        'an observation',
        { keep: async () => {} },
      ),
    )
    assert.ok(refusedTwice instanceof Unanswered, `a refused witness is ${String(refusedTwice)}`)
    assert.match(
      (refusedTwice as Error).message,
      /^the witness's answer for a1-shot-0-a is not an observation: /,
    )

    // Gate 1S's unparsable judge answer: an Unanswered, today's words.
    const shared = ['a king']
    const loose = { subjects: [] }
    const compared = await rejected(
      gate1s(
        {
          canonical: { pictureId: 'a1-shot-0-a', path: f.picture },
          derived: { pictureId: 'a1-shot-1-single', path: f.picture },
          shared,
        },
        {
          sensors: {
            similarity: async () => 0,
          } as unknown as Parameters<typeof gate1s>[1]['sensors'],
          model: modelWith({
            compare: async () => ({ value: loose, receipt: { ...RECEIPT, call: 'compare' } }),
          }),
        },
        0.25,
      ),
    )
    const compareIssues = compareAnswer(shared).safeParse(loose).error?.issues ?? []
    assert.ok(compared instanceof Unanswered, `Gate 1S unparsable is ${String(compared)}`)
    assert.equal(
      compared.message,
      `the judge's answer for a1-shot-1-single does not name every shared subject once: ${compareIssues
        .map((i) => i.message)
        .join('; ')}`,
    )

    // Gate 7's unparsable judge answer: an Unanswered, today's words.
    const questions = ['Does the cut show what it says?']
    const cut = { answers: [] }
    const judged = await rejected(
      gate7(
        [],
        questions,
        modelWith({
          judgeCut: async () => ({ value: cut, receipt: { ...RECEIPT, call: 'judgeCut' } }),
        }),
      ),
    )
    const cutIssues = cutAnswer(questions).safeParse(cut).error?.issues ?? []
    assert.ok(judged instanceof Unanswered, `Gate 7 unparsable is ${String(judged)}`)
    assert.equal(
      judged.message,
      `the judge's answer on the cut does not name every question once: ${cutIssues
        .map((i) => i.message)
        .join('; ')}`,
    )

    // The text step's unparsable reading: an Unanswered, today's words.
    const unread = await rejected(
      ffmpegSensors(ffmpegTools()).readText({ pictureId: 'a1-shot-0-a', path: f.picture }, () =>
        Promise.resolve({}),
      ),
    )
    assert.ok(unread instanceof Unanswered, `an unreadable text step is ${String(unread)}`)
    assert.equal(
      unread.message,
      "the text step's answer for a1-shot-0-a is not readable text: text: Invalid input: expected array, received undefined",
    )

    // The counter spent: a StillUnavailable, today's words (reel-takes' check 11).
    const spent = await rejected(
      sentUntilAvailable(
        'the clip a1-shot-0-take-1',
        { maxAttempts: 3, backoffMs: 0 },
        async () => ({
          kind: 'unavailable' as const,
          detail: 'busy',
        }),
      ),
    )
    assert.ok(spent instanceof StillUnavailable, `a spent counter is ${String(spent)}`)
    assert.equal(
      spent.message,
      `the clip a1-shot-0-take-1 was answered unavailable at each of its 3 sends, the last saying "busy": a provider's transient errors have their own counter, and it is spent, so nothing was made and no take is counted (I-11, S-096)`,
    )
    assert.equal(failureKindOf(spent), 'unavailable')
  } finally {
    f.clean()
  }
})

// ---------------------------------------------------------------- 3

/** THREE_RANKS' stills script with the first picture's witness answered unavailable `n` times. */
function witnessUnavailable(n: number): FakeScript {
  const script = stillsScript(THREE_RANKS, THREE_RANKS_PICS)
  const busy: FakeAnswer = { throws: 'the model answered 529', as: 'unavailable' }
  return {
    ...script,
    witness: [...Array.from({ length: n }, () => busy), ...(script.witness ?? [])],
  }
}

test('3. a StillUnavailable is sent no further time: a model, a video and a narration call answered unavailable at every send is sent exactly maxAttempts times in all, its run failed unavailable, and no receipt written', async () => {
  // The model: the canonical's first picture's witness, answered unavailable at each of 3 sends.
  {
    const engine = await startEngine({ worker: true, script: witnessUnavailable(3) })
    try {
      const ran = await stills(engine, stillsRequest('rf3-model'))
      assertFailedResult(
        ran.result,
        `the witness call was answered unavailable at each of its 3 sends, the last saying "the model answered 529": a provider's transient errors have their own counter, and it is spent, so nothing was made and no take is counted (I-11, S-096)`,
      )
      assert.equal(failureOf(engine, ran.runId), 'unavailable')
      assert.deepEqual(
        engine.model.observeCalls.map((c) => c.picture.pictureId),
        ['a1-shot-0-a', 'a1-shot-0-a', 'a1-shot-0-a'],
        'the witness call was not sent exactly three times',
      )
      assert.deepEqual(
        ran.receipts.filter((r) => r.role !== 'planner'),
        [],
        'a receipt for a call that made nothing',
      )
    } finally {
      await engine.stop()
    }
  }

  // The video and the narration: a first take and a first narration, each unavailable at 3 sends.
  for (const which of ['video', 'narration'] as const) {
    const options: Omit<EngineOptions, 'worker'> =
      which === 'video'
        ? {
            script: videoScript(THREE_RANKS, THREE_RANKS_PICS),
            video: { 'shot-0-take-1': { transient: 3 } },
          }
        : {
            script: videoScript(THREE_RANKS, THREE_RANKS_PICS),
            narration: { 'shot-0-narration': { transient: 3 } },
          }
    const engine = await startEngine({ worker: true, ...options })
    try {
      const ran = await video(engine, videoRequest(`rf3-${which}`))
      const call =
        which === 'video'
          ? 'the video call for a1-shot-0-take-1'
          : 'the narration call for a1-shot-0-narration'
      const said =
        which === 'video'
          ? 'the stand-in video port is unavailable for a1-shot-0-take-1, send 3 of the 3 it was scripted to answer so'
          : 'the stand-in narration port is unavailable for a1-shot-0-narration, send 3 of the 3 it was scripted to answer so'
      assertFailedResult(
        ran.result,
        `${call} was answered unavailable at each of its 3 sends, the last saying "${said}": a provider's transient errors have their own counter, and it is spent, so nothing was made and no take is counted (I-11, S-096)`,
      )
      assert.equal(failureOf(engine, ran.runId), 'unavailable')
      if (which === 'video') {
        assert.deepEqual(
          engine.video.calls.map((c) => c.takeId),
          [TAKE, TAKE, TAKE],
          'the clip was not sent exactly three times',
        )
        assert.deepEqual(ran.videoReceipts, [], 'a video receipt for a clip never made')
      } else {
        assert.deepEqual(
          engine.narration.calls.map((c) => c.narrationId),
          ['a1-shot-0-narration', 'a1-shot-0-narration', 'a1-shot-0-narration'],
          'the narration was not sent exactly three times',
        )
        assert.deepEqual(ran.speechReceipts, [], 'a speech receipt for a narration never made')
        assert.deepEqual(engine.video.calls, [], 'a clip was asked for after its narration failed')
      }
      assert.deepEqual(
        engine.query('SELECT * FROM lost_call WHERE run_id = ?', ran.runId),
        [],
        'a lost call for a call that made nothing',
      )
    } finally {
      await engine.stop()
    }
  }
})

// ---------------------------------------------------------------- 4

const [, , barons] = THREE_RANKS_PICS as [Pic, Pic, Pic, Pic]

interface Kinded {
  name: string
  run: 'stills' | 'video'
  options: Omit<EngineOptions, 'worker'>
  kind: FailureKind
  detail: string | RegExp
}

/** The barons' observation leaving out clippedByEdge and adding actions: refused for its shape. */
function malformedBarons(): unknown {
  const malformed = seen(barons) as unknown as { entities: Array<Record<string, unknown>> }
  delete malformed.entities[0]?.clippedByEdge
  return { ...malformed, actions: ['marching'] }
}

const KINDED: Kinded[] = [
  {
    name: 'a scripted unavailable picture',
    run: 'stills',
    options: {
      script: stillsScript(THREE_RANKS, THREE_RANKS_PICS),
      images: { 'shot-0-a': { throws: 'fal answered 503', as: 'unavailable' } },
    },
    kind: 'unavailable',
    detail: 'the provider is unavailable: fal answered 503',
  },
  {
    name: 'a spent clip',
    run: 'video',
    options: {
      script: videoScript(THREE_RANKS, THREE_RANKS_PICS),
      video: { 'shot-0-take-1': { throws: 'the clip could not be read', as: 'spent' } },
    },
    kind: 'unreadable',
    detail: 'the clip could not be read — and the call had already spent (S-142)',
  },
  {
    name: 'a witness refused twice',
    run: 'stills',
    options: {
      script: stillsScript(THREE_RANKS, THREE_RANKS_PICS, {
        witness: {
          [barons.key]: twice({ value: malformedBarons() }, { value: malformedBarons() }),
        },
      }),
    },
    kind: 'unreadable',
    detail: /^the witness's answer for a1-shot-1-single is not an observation: /,
  },
  {
    name: 'refused word timings',
    run: 'video',
    options: {
      script: videoScript(THREE_RANKS, THREE_RANKS_PICS),
      narration: { 'shot-0-narration': { timings: 'these are not timings' } },
    },
    kind: 'unreadable',
    detail: /^the word timings of a1-shot-0-narration do not parse: /,
  },
  {
    name: 'a FAILED fal job',
    run: 'video',
    options: {
      script: videoScript(THREE_RANKS, THREE_RANKS_PICS),
      video: {
        'shot-0-take-1': {
          throws:
            'the clip a1-shot-0-take-1 was accepted and then failed: {"detail":"inference failed"}',
          as: 'provider-failed',
        },
      },
    },
    kind: 'provider-failed',
    detail: 'the clip a1-shot-0-take-1 was accepted and then failed: {"detail":"inference failed"}',
  },
]

for (const kinded of KINDED) {
  test(`4. a run failed through the worker carries its kind on its row and nowhere else — ${kinded.name}, ${kinded.kind}`, async () => {
    const engine = await startEngine({ worker: true, ...kinded.options })
    try {
      const requestId = `rf4-${kinded.name.replace(/\W+/g, '-')}`
      const ran =
        kinded.run === 'stills'
          ? await stills(engine, stillsRequest(requestId))
          : await video(engine, videoRequest(requestId))
      assertFailedResult(ran.result, kinded.detail)
      assert.equal(failureOf(engine, ran.runId), kinded.kind)
      assertKindNowhereElse(ran.events)
      const status = (await engine.http.status(ran.runId)).json
      assert.ok(!('failure' in status), 'the status names the kind')
    } finally {
      await engine.stop()
    }
  })
}

// ---------------------------------------------------------------- 5

/** The stills script with the witness's answers cut to the first `n`: the stand-in runs out. */
function witnessCut(n: number): FakeScript {
  const script = stillsScript(THREE_RANKS, THREE_RANKS_PICS)
  return { ...script, witness: (script.witness ?? []).slice(0, n) }
}

const T = (unit: number) => `a1-shot-${unit}-take-1`

/**
 * A model that, once the last take's reconciler has answered, takes shot 0's words off its narration
 * row — so the assemble job reads no finished narration for shot 0 and cannot make a render manifest
 * (S-073).
 */
function unmeasuringAfterLastTake(engine: () => Engine) {
  return (model: LanguageModelPort): LanguageModelPort => ({
    ...model,
    async structured(call) {
      const answered = await model.structured(call)
      if (call.role === 'reconciler' && (call.takeIds ?? []).includes(T(5))) {
        const db = new DatabaseSync(engine().dbPath)
        try {
          db.exec('PRAGMA busy_timeout = 5000')
          db.prepare(
            "UPDATE narration SET words = NULL WHERE narration_id = 'a1-shot-0-narration'",
          ).run()
        } finally {
          db.close()
        }
      }
      return answered
    },
  })
}

test('5. the stand-in running out of its script, a plain scripted throw, a cap file that cannot be read and a render manifest refused each fail their run engine, and an off-spec picture off-spec, each with its detail pinned', async () => {
  const stillsCases: Array<{
    name: string
    options: Omit<EngineOptions, 'worker'>
    kind: FailureKind
    detail: (engine: Engine) => string
  }> = [
    {
      name: 'the stand-in out of its script',
      options: { script: witnessCut(1) },
      kind: 'engine',
      detail: () => "the stand-in's script has no answer for witness call 2",
    },
    {
      name: 'a plain scripted throw',
      options: {
        script: stillsScript(THREE_RANKS, THREE_RANKS_PICS),
        images: { 'shot-0-a': { throws: 'the image service fell over' } },
      },
      kind: 'engine',
      detail: () => 'the image service fell over',
    },
    {
      name: 'a cap file that cannot be read',
      options: {
        script: stillsScript(THREE_RANKS, THREE_RANKS_PICS),
        budgetMd: '# Budget\n\nNo table here.\n',
      },
      kind: 'engine',
      detail: (engine) => `${engine.budgetPath} has no "Per reel, all-in" row`,
    },
    {
      name: 'an off-spec picture',
      options: {
        script: stillsScript(THREE_RANKS, THREE_RANKS_PICS),
        images: {
          'shot-0-a': { throws: 'the picture is 1536x864, not 9:16', as: 'off-spec' },
        },
      },
      kind: 'off-spec',
      detail: () => 'the picture is 1536x864, not 9:16 — and the call had already spent (S-142)',
    },
  ]
  for (const one of stillsCases) {
    const engine = await startEngine({ worker: true, ...one.options })
    try {
      const ran = await stills(engine, stillsRequest(`rf5-${one.name.replace(/\W+/g, '-')}`))
      assertFailedResult(ran.result, one.detail(engine))
      assert.equal(failureOf(engine, ran.runId), one.kind, one.name)
    } finally {
      await engine.stop()
    }
  }

  // A render manifest refused: rows the assemble job cannot make one from.
  const started: { engine?: Engine } = {}
  const engine = await startEngine({
    worker: true,
    script: videoScript(THREE_RANKS, THREE_RANKS_PICS),
    wrapModel: unmeasuringAfterLastTake(() => started.engine as Engine),
  })
  started.engine = engine
  try {
    const ran = await video(engine, videoRequest('rf5-manifest'))
    assertFailedResult(
      ran.result,
      'the render manifest could not be built: shot-0 has no narration to render',
    )
    assert.equal(failureOf(engine, ran.runId), 'engine')
  } finally {
    await engine.stop()
  }

  // A scripted class outside the six refuses to build the stand-in, so a misspelt class is never a
  // plain error in disguise — which would fail a run as engine and pass for whatever it was meant to be.
  const misspelt = { throws: 'x', as: 'unavalable' } as unknown as FakeAnswer
  assert.throws(() => fakeModel({ witness: [misspelt] }, { models: RECEIPT_MODELS }), /unavalable/)
  assert.throws(
    () => fakeImage({ 'shot-0-a': { throws: 'x', as: 'unavalable' } as never }),
    /unavalable/,
  )
  assert.throws(
    () => fakeVideo(ffmpegTools(), { 'shot-0-take-1': { throws: 'x', as: 'unavalable' } as never }),
    /unavalable/,
  )
  assert.throws(
    () => fakeNarration({ 'shot-0-narration': { throws: 'x', as: 'unavalable' } as never }),
    /unavalable/,
  )
})

const RECEIPT_MODELS = { planner: 'p', reconciler: 'r', witness: 'w', judge: 'j' } as const
