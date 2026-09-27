import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { isAbsolute, join, relative } from 'node:path'
import { test } from 'node:test'
import ts from 'typescript'
import type { AssemblerPort } from '@cutroom/contracts'
import { REPO } from './_repo.ts'
import { errorsIn } from './engine/compile.ts'
import { startEngine, type Engine } from './engine/harness.ts'
import { renderOf, renderRows } from './engine/render.ts'
import { importSpecifiers } from './engine/source.ts'
import { described, video, videoRequest, videoScript, DEGRADED } from './engine/video.ts'

// reel-render, Slice 4 — checks 39 and 40 (docs/features/reel-render.md): what a completed video run
// answers (S-069, the contract), and I-18 — nothing can be bought once assembly begins, because the
// job that assembles holds no port that buys, and the render row is written, with its start time,
// before the assembler is called.

/** DEGRADED's run with a cost in every table: a picture 6, a narration 2, a clip 4 — a spend of 12. */
async function costedRun(requestId: string) {
  const engine = await startEngine({
    worker: true,
    sensors: DEGRADED.sensors,
    images: { 'shot-0-a': { costCents: 6 } },
    narration: { 'shot-1-narration': { costCents: 2 } },
    video: { 'shot-4-take-1': { costCents: 4 } },
    script: videoScript(DEGRADED.shape, DEGRADED.pics, { stills: DEGRADED.stills }),
  })
  try {
    return { engine, ran: await video(engine, videoRequest(requestId)) }
  } catch (error) {
    await engine.stop()
    throw error
  }
}

// ---------------------------------------------------------------- 39

test("39. a completed video run's result has until video, the chosen stills in shot order, the video's absolute path under the artifact root — the render row's — estimateCents the plan's, costCents the spend, and degradations in the order reached; its events are exactly S-069's, with no verdict for gate 6 or 8; and every body on every route parses under its contract schema", async () => {
  const { engine, ran } = await costedRun('r39')
  try {
    const row = renderOf(engine, ran.runId)
    const [planned] = engine.query<{ estimate_cents: number }>(
      'SELECT estimate_cents FROM plan WHERE run_id = ? AND selected = 1',
      ran.runId,
    )
    const chosen = engine.query<{ picture_id: string; shot_unit: number; path: string }>(
      'SELECT picture_id, shot_unit, path FROM picture WHERE run_id = ? AND chosen = 1 ORDER BY shot_unit',
      ran.runId,
    )
    const [degradation] = engine.query<{ shot_id: string; reason: string }>(
      'SELECT shot_id, reason FROM degradation WHERE run_id = ?',
      ran.runId,
    )
    assert.ok(planned !== undefined && degradation !== undefined)
    assert.deepEqual(
      chosen.map((p) => p.picture_id),
      ['a1-shot-0-repair', 'a1-shot-1-repair'],
    )

    // The result, whole: nothing more and nothing less than the contract's completed video answer.
    assert.deepEqual(ran.result, {
      contractVersion: ran.result.contractVersion,
      runId: ran.runId,
      requestId: 'r39',
      status: 'completed',
      until: 'video',
      estimateCents: planned.estimate_cents,
      costCents: 12,
      stills: [
        { pictureId: 'a1-shot-0-repair', shotId: 'shot-0', path: chosen[0]?.path },
        { pictureId: 'a1-shot-1-repair', shotId: 'shot-1', path: chosen[1]?.path },
      ],
      video: { path: row.path },
      degradations: [{ shotId: 'shot-2', reason: degradation.reason }],
    })
    assert.equal(
      ran.jobs.reduce((sum, job) => sum + job.cost_cents, 0),
      12,
      "costCents is not the chain's spend",
    )
    const path = String(row.path)
    assert.equal(path, join(engine.artifactRoot, ran.runId, 'a1-render.mp4'))
    assert.ok(isAbsolute(path) && !relative(engine.artifactRoot, path).startsWith('..'))
    assert.ok(existsSync(path), 'the result names a video that is not there')
    assert.equal(readFileSync(path).toString('latin1', 4, 8), 'ftyp')

    // Its events, exactly (S-069): the plan stage's; the stills stage's, in the order its ladders ran;
    // each shot's four gates in plan order; then Gate 7's verdict, with no shot, and the two endings.
    assert.deepEqual(described(ran.events), [
      'run.accepted',
      'stage.started plan',
      'verdict 0 fail',
      'verdict 0 accept',
      'stage.finished plan',
      'stage.started stills',
      ...STILLS_EVENTS,
      'stage.finished stills',
      'stage.started video',
      ...[0, 1, 2, 3, 4, 5].flatMap((unit) =>
        ['2', '3', '4', '5'].map((gate) => `verdict ${gate} shot-${unit} accept`),
      ),
      'verdict 7 accept',
      'stage.finished video',
      'run.finished completed',
    ])
    assert.ok(!ran.events.some((e) => e.type === 'verdict' && (e.gate === '6' || e.gate === '8')))
    ran.events.forEach((event, i) => assert.equal(event.seq, i + 1))

    // Every body on every route parses under its contract schema: the client fails the test on one
    // that does not, and each route is asked here.
    assert.equal((await engine.http.status(ran.runId)).status, 200)
    assert.equal((await engine.http.events(ran.runId)).status, 200)
    assert.equal((await engine.http.result(ran.runId)).status, 200)
    assert.equal((await engine.http.lookup('r39')).status, 200)
    assert.equal((await engine.http.cancel(ran.runId)).status, 200)
    const record = await engine.http.record(ran.runId)
    assert.equal(record.status, 200)
    assert.deepEqual(record.json.degradations, [{ shotId: 'shot-2', reason: degradation.reason }])

    // The jobs: four rows, each done, the assemble job buying nothing.
    assert.deepEqual(
      ran.jobs.map((j) => [j.kind, j.state, j.cost_cents]),
      [
        ['reel.plan', 'done', 0],
        ['reel.keyframes', 'done', 6],
        ['reel.clips', 'done', 6],
        ['reel.assemble', 'done', 0],
      ],
    )
  } finally {
    await engine.stop()
  }
})

/**
 * DEGRADED's stills stage, by hand, in the order its gates run (reel-stills' S-046; its check 40 lists
 * the same order): the canonical's two candidates are clipped and fail, and its repair is accepted; the
 * barons' picture shows a person and fails, and its repair passes Gate 1; the hall's picture passes
 * Gate 1; then Gate 1S, rank by rank — the barons' repair accepted, the hall's picture failed with no
 * slot left, so shot 2 is degraded.
 */
const STILLS_EVENTS = [
  'verdict 1 shot-0 fail',
  'verdict 1 shot-0 fail',
  'verdict 1 shot-0 accept',
  'verdict 1 shot-1 fail',
  'verdict 1 shot-1 accept',
  'verdict 1 shot-2 accept',
  'verdict 1S shot-1 accept',
  'verdict 1S shot-2 fail',
  'degraded shot-2',
]

// ---------------------------------------------------------------- 40

function timesOf(engine: Engine, table: string, runId: string): string[] {
  return engine
    .query<{ at: string }>(`SELECT at FROM ${table} WHERE run_id = ?`, runId)
    .map((r) => r.at)
}

test("40. no image, narration or video receipt of a run is later than its first render row's start", async () => {
  // What the assembler finds when it is called: the render row, already there (I-18, S-073).
  const found: Array<{ rows: number; hash: string; path: string | null; at: string }> = []
  // The wrapper is built before the engine it reads from, so it is handed the engine's place.
  const started: { engine?: Engine } = {}
  const wrapAssembler = (assembler: AssemblerPort): AssemblerPort => ({
    ready: () => assembler.ready(),
    async assemble(renderManifest) {
      assert.ok(started.engine !== undefined)
      const rows = renderRows(started.engine, renderManifest.runId)
      found.push({
        rows: rows.length,
        hash: String(rows[0]?.hash),
        path: rows[0]?.path ?? null,
        at: new Date().toISOString(),
      })
      return assembler.assemble(renderManifest)
    },
  })
  const engine = await startEngine({
    worker: true,
    sensors: DEGRADED.sensors,
    script: videoScript(DEGRADED.shape, DEGRADED.pics, { stills: DEGRADED.stills }),
    wrapAssembler,
  })
  started.engine = engine
  try {
    const ran = await video(engine, videoRequest('r40'))
    assert.equal(ran.result.status, 'completed', JSON.stringify(ran.result))
    const [first] = renderRows(engine, ran.runId)
    assert.ok(first !== undefined)

    // The row was written — its manifest, its hash, its start, and no output yet — BEFORE the
    // assembler was called.
    assert.equal(found.length, 1)
    assert.equal(found[0]?.rows, 1, 'the assembler was called before its render row was written')
    assert.equal(found[0]?.hash, first.hash)
    assert.equal(found[0]?.path, null)
    assert.ok(first.started_at <= String(found[0]?.at), 'the render began after its assembly')
    assert.ok(first.finished_at !== null && first.started_at <= first.finished_at)

    // Every receipt of a paid call is at or before that start.
    const receipts = [
      ...timesOf(engine, 'generation_receipt', ran.runId),
      ...timesOf(engine, 'speech_receipt', ran.runId),
      ...timesOf(engine, 'video_receipt', ran.runId),
    ]
    assert.equal(receipts.length, 6 + 6 + 6, 'the run made 6 pictures, 6 narrations and 6 clips')
    for (const at of receipts) {
      assert.ok(
        at <= first.started_at,
        `a receipt at ${at} is later than the render's ${first.started_at}`,
      )
    }
  } finally {
    await engine.stop()
  }
})

const ASSEMBLE_JOB = 'apps/worker/src/assemble-job.ts'
const WORKER = 'apps/worker/src/worker.ts'

const parsed = (file: string) =>
  ts.createSourceFile(file, readFileSync(join(REPO, file), 'utf8'), ts.ScriptTarget.Latest, true)

test("40. the assemble job's context holds no image, narration or video port", () => {
  // By the compiler: the context's keys are exactly these five, and none is a port that buys. The
  // fifth, `resume`, is the engine's own resume of a run the job fails — settings and two files, never
  // a port (resume-failed, Slice 5, S-163).
  const errors = errorsIn(
    join(REPO, 'tests'),
    `
    import type { ImagePort, NarrationPort, VideoPort } from '@cutroom/contracts'
    import type { AssembleJobContext } from '../apps/worker/src/assemble-job.ts'
    type Asked = 'model' | 'media' | 'assembler' | 'render' | 'resume'
    type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false
    export const keys: Same<keyof AssembleJobContext, Asked> = true
    type Buys = ImagePort | NarrationPort | VideoPort
    type Bought = { [K in keyof AssembleJobContext]: AssembleJobContext[K] extends Buys ? K : never }[keyof AssembleJobContext]
    export const none: Same<Bought, never> = true
    `,
  )
  assert.deepEqual(errors, [])

  // By its source: the job imports no port that buys and none of the worker's guarded ports.
  const imported = importSpecifiers(ASSEMBLE_JOB)
  for (const guarded of ['./video-port.ts', './narration-port.ts', './guarded-image-port.ts']) {
    assert.ok(!imported.includes(guarded), `the assemble job imports ${guarded}`)
  }
  const text = readFileSync(join(REPO, ASSEMBLE_JOB), 'utf8')
  for (const port of ['ImagePort', 'NarrationPort', 'VideoPort']) {
    assert.ok(!new RegExp(`\\b${port}\\b`).test(text.replace(/\/\/.*$/gm, '')), `it names ${port}`)
  }

  // And the worker hands it exactly that context: the object it passes has those five keys.
  const source = parsed(WORKER)
  let handed: string | undefined
  const literals = new Map<string, string[]>()
  const visit = (node: ts.Node) => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer !== undefined &&
      ts.isObjectLiteralExpression(node.initializer)
    ) {
      literals.set(
        node.name.text,
        node.initializer.properties.map((p) => p.name?.getText(source) ?? '…'),
      )
    }
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'runAssembleJob'
    ) {
      assert.equal(node.arguments.length, 3, 'runAssembleJob is not handed a context')
      handed = node.arguments[2]?.getText(source)
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  assert.ok(handed !== undefined, 'the worker never calls runAssembleJob')
  assert.deepEqual(
    [...(literals.get(handed) ?? [])].sort(),
    ['assembler', 'media', 'model', 'render', 'resume'],
    'the context the worker hands the assemble job holds something else',
  )
})
