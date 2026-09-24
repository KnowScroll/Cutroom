import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import ts from 'typescript'
import type { AssemblerPort, RenderManifest } from '@cutroom/contracts'
import {
  fakeNarration,
  fakeVideo,
  ffmpegAssembler,
  ffmpegTools,
  type FfmpegTools,
} from '@cutroom/providers'
import { REPO } from './_repo.ts'
import { startEngine } from './engine/harness.ts'
import {
  clipProbe,
  holdRows,
  measured,
  renderOf,
  renderRows,
  replaced,
  thumbnails,
  timed,
} from './engine/render.ts'
import { importSpecifiers, sourceFiles } from './engine/source.ts'
import { THREE_RANKS, THREE_RANKS_PICS } from './engine/stills.ts'
import {
  CUT_QUESTIONS,
  UNIT_SENTENCES,
  cutAnswer,
  described,
  video,
  videoRequest,
  videoScript,
} from './engine/video.ts'

// reel-render, Slice 4 — checks 37, 38 and 41 (docs/features/reel-render.md): what the assembler may
// read (D-054, D-055, D-059), Gate 7 (S-074), and the output check (I-17, S-073).

// ---------------------------------------------------------------- 37

const ASSEMBLER = 'packages/providers/src/ffmpeg/assemble.ts'

function parsed(file: string): ts.SourceFile {
  return ts.createSourceFile(
    file,
    readFileSync(join(REPO, file), 'utf8'),
    ts.ScriptTarget.Latest,
    true,
  )
}

test("37. the assembler's source imports no domain, settings or network module and calls no fetch, and reads a clip's width, height, frame rate, sample rate and channels only from the shot's measured facts", async () => {
  // What it imports, exactly: files, paths, the contract's types, the one path refusal and the tools.
  assert.deepEqual(importSpecifiers(ASSEMBLER).sort(), [
    '../artifacts.ts',
    './tools.ts',
    '@cutroom/contracts',
    'node:fs',
    'node:path',
  ])
  const source = parsed(ASSEMBLER)
  const contracts = source.statements.find(
    (s): s is ts.ImportDeclaration =>
      ts.isImportDeclaration(s) &&
      ts.isStringLiteral(s.moduleSpecifier) &&
      s.moduleSpecifier.text === '@cutroom/contracts',
  )
  assert.equal(contracts?.importClause?.isTypeOnly, true, 'it imports a value from the contracts')
  assert.ok(
    !/Settings/.test(contracts?.getText(source) ?? ''),
    'it imports a settings type: the render manifest is its only input (D-059)',
  )

  // No fetch, and a geometry, rate or channel count read only off the profile it renders to or the
  // shot's measured facts — `shot.clip.video`, or a `video` that is declared as exactly that.
  const FACTS = new Set(['width', 'height', 'fps', 'sampleRate', 'channels'])
  const from: string[] = []
  const declared = new Map<string, string[]>()
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
      assert.notEqual(node.expression.text, 'fetch', 'the assembler calls fetch')
    }
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
      const name = node.name.text
      declared.set(name, [...(declared.get(name) ?? []), node.initializer.getText(source)])
    }
    if (ts.isPropertyAccessExpression(node) && FACTS.has(node.name.text)) {
      from.push(node.expression.getText(source))
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  assert.ok(from.length >= 8, `the scan found only ${from.length} reads of a geometry or a rate`)
  assert.deepEqual(
    [...new Set(from)].filter((text) => text !== 'profile').sort(),
    ['video'],
    'a width, height, frame rate, sample rate or channel count is read off something else',
  )
  // TWO MEASURED SOURCES, and no third (S-099): a clip shot's measured facts, and a still-hold
  // shot's picture probed by ffprobe when its ladder held the shot (S-097, D-055).
  assert.deepEqual(
    [...(declared.get('video') ?? [])].sort(),
    ['shot.clip.video', 'shot.stillHold.probe.video'],
    '`video` is neither a clip measured fact nor a held picture probe',
  )
  // A clip's sound is fitted to the profile whatever it is: only WHETHER it has any is read.
  assert.ok(/shot\.clip\.audio === null/.test(source.getText()), 'added silence reads another fact')

  // And it does as its source says: handed measured facts that are NOT the file's, it conforms from
  // the facts — and it runs ffmpeg once and never measures the clip itself.
  const dir = mkdtempSync(join(tmpdir(), 'reel-render-facts-'))
  try {
    const root = join(dir, 'made')
    const tools = ffmpegTools()
    const clip = await fakeVideo(tools, {}, { artifactRoot: root }).generate({
      runId: 'run-37',
      takeId: 'a1-shot-0-take-1',
      prompt: 'a test pattern',
      durationSeconds: 5,
      resolution: '768P',
      seed: 1,
      promptExpansionMode: 'balanced',
      mode: 'text-to-video',
      aspectRatio: '9:16',
    })
    const spoken = await fakeNarration({}, { artifactRoot: root }).speak({
      runId: 'run-37',
      narrationId: 'a1-shot-0-narration',
      text: 'one two three',
      voice: 'stand-in',
    })
    assert.ok(clip.kind === 'made' && spoken.kind === 'made')
    const ran: string[] = []
    const recording: FfmpegTools = {
      ...tools,
      ready: () => tools.ready(),
      run: (tool, args) => {
        ran.push(tool)
        return tools.run(tool, args)
      },
    }
    const lying: RenderManifest = {
      runId: 'run-37',
      renderId: 'a1-render',
      profile: {
        container: 'mp4',
        videoCodec: 'h264',
        audioCodec: 'aac',
        width: 108,
        height: 192,
        fps: 24,
        sampleRate: 48000,
        channels: 2,
      },
      gateProfile: { id: 'phase-1', gates: ['0', '1', '1S', '2', '3', '4', '5', '7'] },
      captionStyle: { id: 'word-captions-test', fontName: 'Arial', fontSize: 12, marginV: 20 },
      duckDb: 18,
      ledger: { imageCents: 0, narrationCents: 0, videoCents: 0 },
      shots: [
        {
          shotId: 'shot-0',
          joinMode: 'cut',
          takeId: 'a1-shot-0-take-1',
          requestId: 'stand-in',
          expandedPrompt: '',
          clipPath: clip.clip.path,
          opening: { kind: 'text-to-video', placed: false },
          narrationId: 'a1-shot-0-narration',
          narrationPath: spoken.audio.path,
          words: timed(['one', 'two', 'three']),
          // The file is 108 × 192 at 24 frames a second; the facts say 216 × 384 at 30.
          clip: clipProbe(5, {
            video: { codec: 'h264', width: 216, height: 384, fps: 30, frames: 150 },
          }),
          startFrame: 0,
          frames: 36,
          pictureFrames: 36,
          hold: null,
          conform: [],
          verdicts: [],
        },
      ],
      captions: [],
      totalFrames: 36,
    }
    const made = await ffmpegAssembler(recording, { artifactRoot: join(dir, 'out') }).assemble(
      lying,
    )
    assert.deepEqual(ran, ['ffmpeg'], 'the assembler ran something besides its one pass')
    const graph = String(made.invocations[0]?.[made.invocations[0].indexOf('-filter_complex') + 1])
    assert.match(graph, /scale=108:192/, 'the conform did not scale from the facts it was handed')
    assert.match(graph, /fps=24/, 'the conform did not convert from the rate it was handed')
    assert.equal(measured(made.path).frames, 36)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

/**
 * What D-054 and D-056 forbid, as it could be written in an argument array or in one string. LIVE
 * SOURCE is every source file under apps/ and packages/, comments included: a comment that spells one
 * of these is refused too, so none of them can be found there at all. The concat FILTER is legal, and
 * is told from the demuxer by what stands before it.
 */
const FORBIDDEN: ReadonlyArray<readonly [RegExp, string]> = [
  [/-f['"]?\s*,?\s*['"]?concat\b/, 'the concat demuxer (-f concat)'],
  [/\bconcat:/, 'the concat protocol'],
  [/-(?:c|codec|vcodec|acodec)(?::[a-z]+(?::\d+)?)?['"]?\s*,?\s*['"]?copy\b/, 'a stream copy'],
  [/\bhls\b/i, 'hls'],
  [/hls_/i, 'an hls option (-hls_segment_type)'],
  [/m3u8/i, 'm3u8'],
]

test('37. no live source in apps/ or packages/ holds -f concat, the concat demuxer or protocol, -c copy, -c:v copy, hls, m3u8 or -hls_segment_type', () => {
  // The patterns find what they are for, and leave the concat filter alone.
  const hit = (text: string) =>
    FORBIDDEN.filter(([pattern]) => pattern.test(text)).map(([, w]) => w)
  for (const forbidden of [
    "['-f', 'concat', '-i', list]",
    '-f concat -safe 0',
    "'concat:a.ts|b.ts'",
    "['-c', 'copy']",
    '-c copy',
    "'-c:v', 'copy'",
    '-c:a copy',
    "'-f', 'hls'",
    'playlist.m3u8',
    "'-hls_segment_type', 'fmp4'",
  ]) {
    assert.ok(hit(forbidden).length > 0, `nothing finds: ${forbidden}`)
  }
  for (const legal of [
    "filter('concat', `n=${shots.length}:v=1:a=1`)",
    '[v0][a0][v1][a1]concat=n=2:v=1:a=1[cut][a]',
    "'-f', 'mp4'",
    "'-c:v', 'libx264'",
    'the shots joined by the concat FILTER inside the one filtergraph',
  ]) {
    assert.deepEqual(hit(legal), [], `a legal line is refused: ${legal}`)
  }

  const files = sourceFiles('apps', 'packages')
  assert.ok(files.includes(ASSEMBLER), 'the scan does not read the assembler')
  const found: string[] = []
  for (const file of files) {
    readFileSync(join(REPO, file), 'utf8')
      .split(/\r?\n/)
      .forEach((line, i) => {
        for (const what of hit(line)) found.push(`${file}:${i + 1} — ${what}`)
      })
  }
  assert.deepEqual(found, [], 'D-054, D-056: one pass, one encode, one progressive file')
})

// ---------------------------------------------------------------- 38

/**
 * The frame of a file that a picture is: the one whose 16 × 16 colour thumbnail the picture's is
 * nearest. In colour, because every stand-in clip begins the same test pattern again and only its
 * band tells one shot's first frame from another's.
 */
function frameOf(all: Buffer, picture: string): number {
  const size = 16 * 16 * 3
  const one = thumbnails(picture, 'rgb24')
  assert.equal(one.length, size, `${picture} is not one frame`)
  let best = -1
  let least = Number.POSITIVE_INFINITY
  for (let frame = 0; (frame + 1) * size <= all.length; frame += 1) {
    let sum = 0
    for (let i = 0; i < size; i += 1) {
      sum += Math.abs((all[frame * size + i] as number) - (one[i] as number))
    }
    if (sum < least) {
      least = sum
      best = frame
    }
  }
  return best
}

test("38. Gate 7 is one judgeCut call per render, role judge, temperature 0, given every shot in timeline order with the frames of its span's start, middle and end and its sentences, and the four questions; its verdict records coverage frames and their number", async () => {
  const engine = await startEngine({
    worker: true,
    script: videoScript(THREE_RANKS, THREE_RANKS_PICS),
  })
  try {
    const ran = await video(engine, videoRequest('r38'))
    assert.equal(ran.result.status, 'completed', JSON.stringify(ran.result))
    const row = renderOf(engine, ran.runId)
    assert.ok(row.path !== null)

    assert.equal(engine.model.judgeCutCalls.length, 1, 'Gate 7 is not one judgeCut call')
    const [call] = engine.model.judgeCutCalls
    assert.ok(call !== undefined)
    assert.deepEqual(Object.keys(call).sort(), ['questions', 'shots', 'temperature'])
    assert.equal(call.temperature, 0)
    assert.deepEqual([...call.questions], [...CUT_QUESTIONS])

    // Every shot, in timeline order, with its sentences.
    assert.deepEqual(
      call.shots.map((s) => s.shotId),
      ['shot-0', 'shot-1', 'shot-2', 'shot-3', 'shot-4', 'shot-5'],
    )
    call.shots.forEach((shot, unit) => {
      assert.equal(
        shot.sentences.join(' '),
        (UNIT_SENTENCES[unit] ?? []).join(' '),
        `${shot.shotId} is not judged with its sentences`,
      )
    })

    // Three frames a shot — PNGs under the root at <runId>/<renderId>-frame-<n>.png — and each IS the
    // frame at its span's start, middle and end, found by looking for it in the file. By hand, from
    // spans of 216, 168, 72, 72, 48 and 120 frames starting at 0, 216, 384, 456, 528 and 576.
    const expected = [
      [0, 108, 215],
      [216, 300, 383],
      [384, 420, 455],
      [456, 492, 527],
      [528, 552, 575],
      [576, 636, 695],
    ]
    const all = thumbnails(row.path, 'rgb24')
    call.shots.forEach((shot, unit) => {
      assert.equal(shot.frames.length, 3, `${shot.shotId} has ${shot.frames.length} frames`)
      shot.frames.forEach((frame, k) => {
        const n = unit * 3 + k
        assert.equal(frame.pictureId, `a1-render-frame-${n}`)
        assert.equal(frame.path, join(engine.artifactRoot, ran.runId, `a1-render-frame-${n}.png`))
        assert.equal(readFileSync(frame.path).toString('latin1', 1, 4), 'PNG')
        assert.equal(frameOf(all, frame.path), expected[unit]?.[k], `${frame.pictureId}`)
      })
    })

    // Its one receipt: role judge, call judgeCut, temperature 0, naming the frames it was shown.
    const judged = ran.receipts.filter((r) => r.call === 'judgeCut')
    assert.equal(judged.length, 1)
    assert.equal(judged[0]?.role, 'judge')
    assert.equal(judged[0]?.temperature, 0)
    assert.deepEqual(
      judged[0]?.picture_ids,
      Array.from({ length: 18 }, (_, n) => `a1-render-frame-${n}`),
    )

    // Its verdict, on the render row: coverage frames with their number, the answer, no reasons.
    assert.deepEqual(row.gate7, {
      outcome: 'accept',
      coverage: { strategy: 'frames', frames: 18 },
      answer: CUT_QUESTIONS.map((question) => ({ question, answer: 'yes' })),
      reasons: [],
    })
    const verdict = ran.events.find((e) => e.type === 'verdict' && e.gate === '7')
    assert.equal(verdict?.outcome, 'accept')
    assert.ok(verdict !== undefined && !('shotId' in verdict), "Gate 7's verdict names a shot")
  } finally {
    await engine.stop()
  }
})

test('38. any answer no stops the run for rule gate-7 at step video, with the file and the render row kept, no video in the result and no question written', async () => {
  // Shot 3's clip is 2 seconds under a narration of 3, so the render holds it for one: a hold's
  // labels are written with WHATEVER ending the assemble job reaches (S-058's form), this one too.
  const engine = await startEngine({
    worker: true,
    video: { 'shot-3-take-1': { seconds: 2 } },
    script: videoScript(THREE_RANKS, THREE_RANKS_PICS, { cut: cutAnswer([1, 3]) }),
  })
  try {
    const ran = await video(engine, videoRequest('r38-no'))
    assert.equal(ran.result.status, 'stopped', JSON.stringify(ran.result))
    assert.equal(ran.result.reason, 'rule')
    assert.equal(ran.result.rule, 'gate-7')
    assert.equal(ran.result.step, 'video')
    assert.ok(!('video' in ran.result), 'a reel that failed its last check was given back')
    for (const no of [CUT_QUESTIONS[1], CUT_QUESTIONS[3]]) {
      assert.ok(String(ran.result.detail).includes(no), `the detail does not name "${no}"`)
    }

    const row = renderOf(engine, ran.runId)
    assert.ok(row.path !== null && existsSync(row.path), 'the file was not kept')
    assert.equal(row.measure?.video?.frames, 696)
    assert.ok(row.finished_at !== null)
    assert.equal(row.gate7?.outcome, 'fail')
    assert.deepEqual(row.gate7?.coverage, { strategy: 'frames', frames: 18 })
    assert.deepEqual(row.gate7?.reasons, [CUT_QUESTIONS[1], CUT_QUESTIONS[3]])
    assert.deepEqual(
      // AMENDED BY cut-rules (S-158): four questions, so four answers.
      row.gate7?.answer.map((a) => a.answer),
      ['yes', 'no', 'yes', 'no'],
    )
    assert.equal(engine.model.judgeCutCalls.length, 1)

    assert.ok(!existsSync(engine.questionsPath), 'a Gate 7 stop wrote a question')
    const lines = described(ran.events)
    assert.deepEqual(lines.slice(-3), ['degraded shot-3', 'verdict 7 fail', 'run.finished stopped'])

    // The hold's four labels, on a run that stopped: its row, its take's row, its receipt, its event.
    const holds = holdRows(engine, ran.runId)
    assert.deepEqual(
      holds.map((h) => [h.render_id, h.shot_id, h.seconds]),
      [['a1-render', 'shot-3', 1]],
    )
    const reason = String(holds[0]?.reason)
    assert.deepEqual(
      ran.takes.map((t) => t.degradation),
      [null, null, null, reason, null, null],
    )
    assert.deepEqual(
      ran.videoReceipts.map((r) => r.degraded),
      [false, false, false, true, false, false],
    )
    assert.equal(ran.events.find((e) => e.type === 'degraded')?.reason, reason)
    assert.deepEqual((await engine.http.record(ran.runId)).json.degradations, [
      { shotId: 'shot-3', reason },
    ])
    assert.ok(!lines.includes('stage.finished video'), 'a stage that failed has stage.finished')
  } finally {
    await engine.stop()
  }
})

// ---------------------------------------------------------------- 41

for (const [how, named, held] of [
  ['a frame short', /frame count is 695, not 696/, (m: RenderManifest) => m.totalFrames === 696],
  ['another size', /width is 54, not 108.*height is 96, not 192/, () => true],
  ['mdat first', /mdat precedes its moov/, () => true],
] as const) {
  test(`41. an assembled file whose measured frame count or profile differs from its manifest, or whose mdat precedes its moov, finishes the run failed, naming the difference — ${how}`, async () => {
    // The real assembler makes the file; then it is replaced by another encoding of itself, which is
    // what the media port then measures. Nothing here scripts a measure.
    const wrapAssembler = (assembler: AssemblerPort): AssemblerPort => ({
      ready: () => assembler.ready(),
      async assemble(renderManifest) {
        const made = await assembler.assemble(renderManifest)
        replaced(made.path, how)
        return made
      },
    })
    const engine = await startEngine({
      worker: true,
      script: videoScript(THREE_RANKS, THREE_RANKS_PICS),
      wrapAssembler,
    })
    try {
      const ran = await video(engine, videoRequest(`r41-${how.replace(/ /g, '-')}`))
      assert.equal(ran.result.status, 'failed', JSON.stringify(ran.result))
      assert.match(String(ran.result.detail), /differs from its render manifest/)
      assert.match(String(ran.result.detail), named)
      assert.ok(!('video' in ran.result))

      // The render row is kept with what was measured, and no cut was judged on the file.
      const [row] = renderRows(engine, ran.runId)
      assert.ok(row !== undefined && row.path !== null && row.measure !== null)
      assert.ok(held(row.renderManifest))
      assert.equal(row.gate7, null)
      assert.equal(engine.model.judgeCutCalls.length, 0, 'a file that differs was judged')
      assert.ok(!engine.media.calls.some((c) => c.method === 'frames'))
      const lines = described(ran.events)
      assert.equal(lines.at(-1), 'run.finished failed')
      assert.ok(!lines.includes('stage.finished video'))
      assert.ok(!lines.some((line) => line.startsWith('verdict 7')))
    } finally {
      await engine.stop()
    }
  })
}
