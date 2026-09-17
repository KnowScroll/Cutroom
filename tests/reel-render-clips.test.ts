import assert from 'node:assert/strict'
import { join } from 'node:path'
import { test } from 'node:test'
import { crc32 } from 'node:zlib'
import ts from 'typescript'
import type { VideoAnswer, VideoRequest } from '@cutroom/contracts'
import { DEFAULT_PLAN_SETTINGS, NEGATIVE_AUDIO, validateVideoRequest } from '@cutroom/pipeline'
import { REPO } from './_repo.ts'
import { TEST_RENDER_SETTINGS, startEngine, type Engine } from './engine/harness.ts'
import { importedNames, sourceFiles } from './engine/source.ts'
import { THREE_RANKS, THREE_RANKS_PICS, seen, type Pic } from './engine/stills.ts'
import {
  CRITERION_TEXT,
  DEGRADED,
  DEGRADED_UNCHOSEN,
  UNIT_SENTENCES,
  takesOf,
  video,
  videoRequest,
  videoScript,
  type Videoed,
} from './engine/video.ts'

// reel-render, Slice 3 — checks 15, 17 and 18 (docs/features/reel-render.md): what a clip is made
// from, what its prompt says, and what its receipt records (S-071). A clip is made from its shot's
// chosen picture where the stills chose one, and from words at 9:16 otherwise — a shot the plan gave
// no picture, and one whose picture was degraded (D-026, D-027, D-050); its prompt is composed by code
// from the shot and Gate 1's recorded observation, with no second look (D-033, I-15), and ends with the
// negative audio block (D-008); and every call passes the validator at the one port the stage is
// handed (D-071, I-19).

const [pa, , barons] = THREE_RANKS_PICS as [Pic, Pic, Pic, Pic]

/** The stills stage's own readers: the run's pictures, with the chosen flags and paths. */
function pictures(engine: Engine, runId: string) {
  return engine
    .query<{ picture_id: string; path: string; chosen: number; shot_unit: number }>(
      'SELECT picture_id, path, chosen, shot_unit FROM picture WHERE run_id = ? ORDER BY seq',
      runId,
    )
    .map((r) => ({ ...r }))
}

const clipsCompleted = (ran: Videoed) =>
  assert.ok(
    ran.jobs.some((j) => j.kind === 'reel.assemble'),
    `the clips stage did not complete: ${JSON.stringify(ran.result)}`,
  )

/** DEGRADED's run: shots 0 and 1 from chosen pictures, shot 2 degraded, shots 3 to 5 unpictured. */
async function degradedRun(
  requestId: string,
  over: Parameters<typeof startEngine>[0] = { worker: true },
) {
  return startEngine({
    ...over,
    worker: true,
    sensors: DEGRADED.sensors,
    script: over.script ?? videoScript(DEGRADED.shape, DEGRADED.pics, { stills: DEGRADED.stills }),
  }).then(async (engine) => {
    try {
      return { engine, ran: await video(engine, videoRequest(requestId)) }
    } catch (error) {
      await engine.stop()
      throw error
    }
  })
}

// ---------------------------------------------------------------- 15

test("15. each shot's clip is image-to-video from its chosen picture's path where the stills chose one, its receipt with no aspect ratio, and text-to-video otherwise with aspectRatio 9:16 in its request and on its receipt — a shot the plan gave no picture and a degraded shot each built, the degraded shot's take and video receipt marked degraded; and no clip is made from a picture not chosen", async () => {
  const { engine, ran } = await degradedRun('r15')
  try {
    clipsCompleted(ran)
    const made = pictures(engine, ran.runId)
    const chosen = made.filter((p) => p.chosen === 1)
    assert.deepEqual(
      chosen.map((p) => p.picture_id),
      ['a1-shot-0-repair', 'a1-shot-1-repair'],
      'the fixture no longer chooses the two repairs',
    )
    const calls = engine.video.calls
    assert.equal(calls.length, 6)

    for (const unit of [0, 1]) {
      const call = calls[unit] as VideoRequest
      const picture = chosen.find((p) => p.picture_id === `a1-${DEGRADED.chosen[unit]}`)
      assert.ok(picture !== undefined)
      assert.equal(call.mode, 'image-to-video', `shot ${unit} was not made from its picture`)
      assert.deepEqual(
        call.mode === 'image-to-video' ? { ...call.image } : null,
        { pictureId: picture.picture_id, path: picture.path },
        `shot ${unit}'s clip is not made from its chosen picture's path`,
      )
      assert.ok(!('aspectRatio' in call), `shot ${unit}'s image-to-video request names a ratio`)
      const take = ran.takes[unit]
      assert.equal(take?.mode, 'image-to-video')
      assert.equal(take?.picture_id, picture.picture_id)
      assert.equal(take?.degraded, false)
      const receipt = ran.videoReceipts[unit]
      assert.equal(receipt?.mode, 'image-to-video')
      assert.equal(receipt?.aspect_ratio, null, `shot ${unit}'s receipt names an aspect ratio`)
      assert.equal(receipt?.degraded, false)
    }

    for (const unit of [2, 3, 4, 5]) {
      const degraded = DEGRADED.degradedShots.includes(unit)
      const call = calls[unit] as VideoRequest
      assert.equal(call.mode, 'text-to-video', `shot ${unit} was made from a picture`)
      assert.equal(call.mode === 'text-to-video' ? call.aspectRatio : null, '9:16')
      assert.ok(!('image' in call), `shot ${unit}'s text-to-video request carries a picture`)
      const take = ran.takes[unit]
      assert.equal(take?.mode, 'text-to-video')
      assert.equal(take?.picture_id, null)
      assert.equal(take?.degraded, degraded, `shot ${unit}'s take degraded flag`)
      const receipt = ran.videoReceipts[unit]
      assert.equal(receipt?.mode, 'text-to-video')
      assert.equal(receipt?.aspect_ratio, '9:16', `shot ${unit}'s receipt does not name 9:16`)
      assert.equal(receipt?.degraded, degraded, `shot ${unit}'s receipt degraded flag`)
    }
    assert.deepEqual(DEGRADED.degradedShots, [2])
    assert.deepEqual(DEGRADED.unpictured, [3, 4, 5])

    // No clip is made from a picture that was not chosen (D-026, D-050).
    const unchosen = made.filter((p) => p.chosen !== 1)
    assert.deepEqual(
      unchosen.map((p) => p.picture_id.replace(/^a\d+-/, '')).sort(),
      [...DEGRADED_UNCHOSEN].sort(),
    )
    for (const call of calls) {
      if (call.mode !== 'image-to-video') continue
      assert.ok(
        chosen.some((p) => p.picture_id === call.image.pictureId && p.path === call.image.path),
        `${call.takeId} was made from ${call.image.pictureId}, which was not chosen`,
      )
    }
  } finally {
    await engine.stop()
  }
})

// ---------------------------------------------------------------- 17

/** Every call of a video port's `generate` in live source: the files it is in. */
function videoGenerateCallers(): string[] {
  const files = sourceFiles('packages', 'apps').filter((f) => f.endsWith('.ts'))
  const read = ts.readConfigFile(join(REPO, 'tsconfig.base.json'), ts.sys.readFile)
  const parsed = ts.parseJsonConfigFileContent(read.config, ts.sys, REPO)
  const program = ts.createProgram(
    files.map((f) => join(REPO, f)),
    { ...parsed.options, noEmit: true, composite: false, incremental: false },
  )
  const checker = program.getTypeChecker()
  const callers = new Set<string>()
  let generateCalls = 0
  for (const file of files) {
    const source = program.getSourceFile(join(REPO, file))
    assert.ok(source !== undefined, `${file} is not in the program`)
    const visit = (node: ts.Node) => {
      if (
        ts.isCallExpression(node) &&
        ts.isPropertyAccessExpression(node.expression) &&
        node.expression.name.text === 'generate'
      ) {
        generateCalls += 1
        const signature = checker.getResolvedSignature(node)
        const first = signature?.getParameters()[0]
        const type =
          first === undefined ? undefined : checker.getTypeOfSymbolAtLocation(first, node)
        if (type !== undefined && checker.typeToString(type) === 'VideoRequest') callers.add(file)
      }
      ts.forEachChild(node, visit)
    }
    visit(source)
  }
  assert.ok(generateCalls >= 3, 'the scan found no generate calls, so it is not reading calls')
  return [...callers].sort()
}

test("17. every clip prompt holds the style contract's text, its shot's sentences, the names of the subjects the shot shows, its claimed mustShow of both types, every mustNotShow and every unclaimed mustShow, and ends with the negative audio block, with no [Shot marker; an image-to-video prompt holds its picture's recorded framing, setting, lighting and entity labels; every request the stage builds passes the validator; the clips job makes no observe call on a picture and no compare call; and in apps/ and packages/ a video port's generate is called only in apps/worker/src/video-port.ts and packages/pipeline/src/clips/index.ts, and clips-job.ts hands makeClips only the port video-port.ts builds", async () => {
  // The chosen pictures' witnesses say something no other picture's does, so a prompt that holds it
  // holds that picture's recorded observation and no other.
  const canonical = seen(pa, (i) =>
    i === 0 ? { label: 'a crimson disc with a lion', position: 'left' } : {},
  )
  canonical.framing = 'closeUp'
  canonical.setting = 'a sunlit courtyard of pale stone'
  canonical.lighting = 'bright'
  const crowd = seen(barons, (i) =>
    i === 0 ? { label: 'three men in grey mail', position: 'right' } : {},
  )
  crowd.framing = 'wide'
  crowd.setting = 'a torchlit undercroft'
  crowd.lighting = 'mixed'
  const script = videoScript(DEGRADED.shape, DEGRADED.pics, {
    stills: {
      ...DEGRADED.stills,
      witness: { ...DEGRADED.stills.witness, 'shot-0-repair': canonical, 'shot-1-repair': crowd },
    },
  })
  const { engine, ran } = await degradedRun('r17', { worker: true, script })
  try {
    clipsCompleted(ran)
    const calls = engine.video.calls
    assert.equal(calls.length, 6)
    const takes = takesOf(THREE_RANKS)
    const style = videoRequest('r17').style.text

    calls.forEach((call, unit) => {
      const take = takes[unit]
      assert.ok(take !== undefined)
      const { prompt } = call
      const at = (text: string) => prompt.indexOf(text)
      const holds = (text: string, what: string) =>
        assert.ok(at(text) >= 0, `shot ${unit}'s prompt does not hold ${what}: ${text}\n${prompt}`)

      holds(style, "the style contract's text")
      for (const sentence of UNIT_SENTENCES[unit] ?? []) holds(sentence, 'its sentence')
      for (const subject of take.subjects) holds(subject.name, 'a subject its shot shows')
      for (const id of take.mustShow) holds(CRITERION_TEXT[id] ?? id, `its claimed mustShow ${id}`)
      for (const id of take.mustNotShow) holds(CRITERION_TEXT[id] ?? id, `mustNotShow ${id}`)

      // The reel's unclaimed mustShow, under a line saying the reel must show it in some shot.
      const line = prompt.split('\n').findIndex((l) => /must show/i.test(l) && /some shot/i.test(l))
      assert.ok(
        line >= 0,
        `shot ${unit}'s prompt has no line for what the reel must show:\n${prompt}`,
      )
      const after = prompt
        .split('\n')
        .slice(line + 1)
        .join('\n')
      for (const id of take.unclaimed) {
        assert.ok(
          after.includes(CRITERION_TEXT[id] ?? id),
          `shot ${unit}: ${id} is not under that line`,
        )
      }

      // A mustShow another unit claims is not this take's (S-072).
      for (const id of ['show-seal', 'show-pressing', 'show-crowd', 'show-law']) {
        if (take.mustShow.includes(id)) continue
        assert.equal(at(CRITERION_TEXT[id] ?? id), -1, `shot ${unit}'s prompt holds ${id}`)
      }

      assert.ok(
        prompt.endsWith(NEGATIVE_AUDIO),
        `shot ${unit}'s prompt does not end with the block`,
      )
      assert.ok(!prompt.includes('[Shot'), `shot ${unit}'s prompt holds a [Shot marker`)
      assert.deepEqual(validateVideoRequest(call), [], `shot ${unit}'s request fails the validator`)
    })

    // An image-to-video prompt holds its picture's RECORDED observation, as the observation row reads.
    const observed = engine
      .query<{ picture_id: string; observation: string }>(
        'SELECT picture_id, observation FROM observation WHERE run_id = ?',
        ran.runId,
      )
      .map((r) => ({
        id: r.picture_id,
        observation: JSON.parse(r.observation) as typeof canonical,
      }))
    for (const [unit, key, expected] of [
      [0, 'shot-0-repair', canonical],
      [1, 'shot-1-repair', crowd],
    ] as const) {
      const recorded = observed.find((o) => o.id === `a1-${key}`)?.observation
      assert.deepEqual(recorded, expected, `${key}'s observation row is not the witness's answer`)
      const prompt = calls[unit]?.prompt ?? ''
      for (const text of [recorded.framing, recorded.setting, recorded.lighting]) {
        assert.ok(prompt.includes(text), `shot ${unit}'s prompt does not hold ${text}`)
      }
      for (const e of recorded.entities) {
        assert.ok(
          prompt.includes(e.label),
          `shot ${unit}'s prompt does not hold the label ${e.label}`,
        )
        assert.ok(prompt.includes(e.position), `shot ${unit}'s prompt does not hold ${e.position}`)
      }
    }
    for (const unit of [2, 3, 4, 5]) {
      const prompt = calls[unit]?.prompt ?? ''
      for (const text of [canonical.setting, crowd.setting, 'a crimson disc with a lion']) {
        assert.ok(!prompt.includes(text), `shot ${unit}'s text-to-video prompt holds ${text}`)
      }
    }

    // The clips job looks at no picture again, and compares none (D-033, I-15): the stills stage's
    // six observe calls and its one compare call are all there are.
    assert.equal(engine.model.observeCalls.length, 6)
    assert.equal(engine.model.compareCalls.length, 1)
    assert.equal(
      ran.receipts.filter((r) => r.call === 'observe' && r.picture_ids.length > 0).length,
      6,
    )
    assert.equal(ran.receipts.filter((r) => r.call === 'compare').length, 1)
  } finally {
    await engine.stop()
  }

  // Only two files call a video port's generate (D-071's grep-level check, by type).
  assert.deepEqual(videoGenerateCallers(), [
    'apps/worker/src/video-port.ts',
    'packages/pipeline/src/clips/index.ts',
  ])

  // clips-job.ts hands makeClips only the port video-port.ts builds, the validator outermost.
  const file = 'apps/worker/src/clips-job.ts'
  const source = ts.createSourceFile(
    file,
    ts.sys.readFile(join(REPO, file)) ?? '',
    ts.ScriptTarget.Latest,
    true,
  )
  const imported = importedNames(file)
  const handed: ts.Expression[] = []
  const visit = (node: ts.Node) => {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'makeClips'
    ) {
      const ports = node.arguments[1]
      assert.ok(
        ports !== undefined && ts.isObjectLiteralExpression(ports),
        'makeClips is not handed an object of ports',
      )
      for (const property of ports.properties) {
        if (
          ts.isPropertyAssignment(property) &&
          ts.isIdentifier(property.name) &&
          property.name.text === 'video'
        ) {
          handed.push(property.initializer)
        }
        assert.ok(
          !(ts.isShorthandPropertyAssignment(property) && property.name.text === 'video'),
          'makeClips is handed a video port by a shorthand name',
        )
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  assert.equal(
    handed.length,
    1,
    'clips-job.ts does not call makeClips with a video port exactly once',
  )
  const port = handed[0] as ts.Expression
  assert.ok(
    ts.isCallExpression(port) && ts.isIdentifier(port.expression),
    'the video port handed is not built by a call',
  )
  const builder = (port.expression as ts.Identifier).text
  assert.equal(builder, 'validatingVideoPort', 'the video port handed is not the validating one')
  assert.equal(imported.get(builder), './video-port.ts', `${builder} is not video-port.ts'`)
  const inner = port.arguments[0]
  assert.ok(
    inner !== undefined &&
      ts.isCallExpression(inner) &&
      ts.isIdentifier(inner.expression) &&
      imported.get(inner.expression.text) === './video-port.ts',
    'the port the validator wraps is not built by video-port.ts',
  )
})

// ---------------------------------------------------------------- 18

test("18. every video receipt records the model, the mode, 768P, the requested duration, the seed, the request id, the prompt, the expanded prompt, the expansion mode — one mode for every call of a run — the style contract's id and version, the rate applied, the cost and fake; every seed is its take id's CRC-32; no receipt names reference-to-video; and an attempt of a plan of N shots that completes makes N video receipts", async () => {
  const answers: Array<{ request: VideoRequest; answer: VideoAnswer }> = []
  const settings = { ...DEFAULT_PLAN_SETTINGS, videoRateCentsPerSecond: 3 }
  const { engine, ran } = await degradedRun('r18', {
    worker: true,
    settings,
    renderSettings: { ...TEST_RENDER_SETTINGS, promptExpansionMode: 'least-rewriting-probe' },
    video: Object.fromEntries(
      [0, 1, 2, 3, 4, 5].map((u) => [
        `shot-${u}-take-1`,
        {
          expandedPrompt: `the provider's rewriting of shot ${u}`,
          ...(u === 3 ? { costCents: 7 } : {}),
        },
      ]),
    ),
    wrapVideo: (port) => ({
      async generate(request) {
        const answer = await port.generate(request)
        answers.push({ request, answer })
        return answer
      },
    }),
  })
  try {
    clipsCompleted(ran)
    const request = videoRequest('r18')

    // A plan of six shots whose attempt completes makes six video receipts, one a take, in plan order.
    assert.equal(ran.videoReceipts.length, 6)
    assert.equal(answers.length, 6)
    assert.deepEqual(
      ran.videoReceipts.map((r) => r.take_id),
      [0, 1, 2, 3, 4, 5].map((u) => `a1-shot-${u}-take-1`),
    )

    ran.videoReceipts.forEach((receipt, i) => {
      const { request: asked, answer } = answers[i] as (typeof answers)[number]
      assert.ok(answer.kind === 'made')
      const what = `${receipt.take_id}'s receipt`
      assert.equal(receipt.take_id, asked.takeId)
      assert.equal(receipt.model, answer.receipt.model, `${what}: model`)
      assert.equal(receipt.mode, asked.mode, `${what}: mode`)
      assert.ok(
        ['image-to-video', 'text-to-video'].includes(receipt.mode),
        `${what}: ${receipt.mode}`,
      )
      assert.equal(receipt.resolution, '768P', `${what}: resolution`)
      assert.equal(asked.resolution, '768P')
      assert.equal(receipt.requested_seconds, asked.durationSeconds, `${what}: requested seconds`)
      assert.equal(receipt.seed, asked.seed, `${what}: seed`)
      assert.equal(
        receipt.seed,
        crc32(receipt.take_id),
        `${what}: the seed is not the take id's CRC-32`,
      )
      assert.equal(receipt.request_id, answer.receipt.requestId, `${what}: request id`)
      assert.ok(receipt.request_id.length > 0)
      assert.equal(receipt.prompt, asked.prompt, `${what}: prompt`)
      assert.equal(
        receipt.expanded_prompt,
        `the provider's rewriting of shot ${i}`,
        `${what}: expanded prompt`,
      )
      assert.equal(receipt.expansion_mode, 'least-rewriting-probe', `${what}: expansion mode`)
      assert.equal(asked.promptExpansionMode, 'least-rewriting-probe')
      assert.equal(receipt.style_id, request.style.id, `${what}: style id`)
      assert.equal(receipt.style_version, request.style.version, `${what}: style version`)
      assert.equal(receipt.rate_cents, 3, `${what}: the rate applied is not the setting's`)
      assert.equal(receipt.cost_cents, i === 3 ? 7 : 0, `${what}: cost`)
      assert.equal(receipt.fake, true, `${what}: fake`)

      // The take's row agrees with its receipt.
      const take = ran.takes[i]
      assert.equal(take?.seed, receipt.seed)
      assert.equal(take?.request_id, receipt.request_id)
      assert.equal(take?.expanded_prompt, receipt.expanded_prompt)
    })
    assert.equal(new Set(ran.videoReceipts.map((r) => r.expansion_mode)).size, 1)
    assert.ok(!ran.videoReceipts.some((r) => /reference/i.test(r.mode)))
  } finally {
    await engine.stop()
  }
})
