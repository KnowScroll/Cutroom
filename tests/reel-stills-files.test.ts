import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, isAbsolute, join, relative } from 'node:path'
import { test } from 'node:test'
import { DEFAULT_ARTIFACT_ROOT, fakeImage } from '@cutroom/providers'
import { REPO } from './_repo.ts'
import { startEngine } from './engine/harness.ts'
import {
  CANONICAL_ONLY,
  CANONICAL_ONLY_PICS,
  THREE_RANKS,
  THREE_RANKS_PICS,
  stills,
  stillsRequest,
  stillsScript,
} from './engine/stills.ts'

// reel-stills, Slice 3 — checks 16, 17 and 18 (docs/features/reel-stills.md): the pictures are real
// files (D-087), under one configured root whose default is a folder inside this repository that
// git ignores (D-086), and none is ever committed.

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

/** A PNG's size, read here from the file's own header — not from the sensor stand-in. */
function pngSize(path: string): { width: number; height: number } {
  const bytes = readFileSync(path)
  assert.ok(bytes.subarray(0, 8).equals(PNG), `${path} does not begin with a PNG signature`)
  assert.equal(bytes.toString('latin1', 12, 16), 'IHDR', `${path} has no IHDR chunk first`)
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) }
}

/** Every file under a folder, as full paths. */
function filesUnder(folder: string): string[] {
  if (!existsSync(folder)) return []
  return readdirSync(folder, { withFileTypes: true, recursive: true })
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name))
}

// ---------------------------------------------------------------- 16

test('16. each picture is a readable 9:16 PNG, under the artifact root in a folder for the run, at the absolute path its row records — for a chosen picture, the path the result gives — and its id carries the jobs attempt', async () => {
  const engine = await startEngine({
    worker: true,
    script: stillsScript(THREE_RANKS, THREE_RANKS_PICS),
  })
  try {
    const ran = await stills(engine, stillsRequest('r16'))
    assert.equal(ran.result.status, 'completed', JSON.stringify(ran.result))
    assert.equal(ran.pictures.length, 4)

    const keyframes = ran.jobs.find((j) => j.kind === 'reel.keyframes')
    assert.equal(keyframes?.attempts, 1)

    for (const picture of ran.pictures) {
      const { path, picture_id: id } = picture
      assert.ok(isAbsolute(path), `${id}'s path is not absolute: ${path}`)
      assert.equal(path, join(engine.artifactRoot, ran.runId, `${id}.png`))
      assert.equal(
        dirname(path),
        join(engine.artifactRoot, ran.runId),
        `${id} is not in the run's folder`,
      )
      assert.ok(!relative(engine.artifactRoot, path).startsWith('..'), `${id} is outside the root`)
      assert.ok(existsSync(path), `${id} has no file at ${path}`)
      const { width, height } = pngSize(path)
      assert.ok(width > 0 && width * 16 === height * 9, `${id} is ${width}x${height}, not 9:16`)

      // `a<attempt>-shot-<unit>-<label>` (S-046), the attempt being the keyframes job's.
      const parts = /^a(\d+)-shot-(\d+)-([a-z0-9-]+)$/.exec(id)
      assert.ok(parts, `${id} is not a<attempt>-shot-<unit>-<label>`)
      assert.equal(Number(parts[1]), keyframes?.attempts, `${id} does not carry the job's attempt`)
      assert.equal(picture.attempt, keyframes?.attempts)
      assert.equal(Number(parts[2]), picture.shot_unit)
      assert.equal(parts[3], picture.label)
    }

    const chosen = ran.pictures.filter((p) => p.chosen)
    assert.equal(chosen.length, 3)
    assert.deepEqual(
      ran.result.stills,
      chosen.map((p) => ({ pictureId: p.picture_id, shotId: `shot-${p.shot_unit}`, path: p.path })),
      "a still's path is not the path its picture's row records",
    )

    // Nothing but the run's pictures was written under the root.
    assert.deepEqual(filesUnder(engine.artifactRoot).sort(), ran.pictures.map((p) => p.path).sort())
  } finally {
    await engine.stop()
  }
})

// ---------------------------------------------------------------- 17

test("17. the stand-in refuses a pictureId whose path would leave the root; and a run with the root unset writes its pictures under the repository's .artifacts/, which .gitignore names", async () => {
  // The root is three folders deep inside a temporary one, so a stand-in that failed to refuse would
  // write inside the temporary folder, where this test can see it — never above it.
  const base = mkdtempSync(join(tmpdir(), 'reel-stills-root-'))
  const root = join(base, 'one', 'two', 'root')
  mkdirSync(root, { recursive: true })
  try {
    const image = fakeImage({}, { artifactRoot: root })
    const leaving: Array<[string, string]> = [
      ['run-1', '../escape'],
      ['run-1', '../../escape'],
      ['run-1', '..\\..\\escape'],
      ['run-1', 'a1-shot-0-a/../../../escape'],
      ['..', 'escape'],
      ['../..', 'escape'],
    ]
    for (const [runId, pictureId] of leaving) {
      await assert.rejects(
        image.generate({
          runId,
          pictureId,
          prompt: 'a picture',
          references: [],
          aspectRatio: '9:16',
        }),
        `runId ${runId} and pictureId ${pictureId} were not refused`,
      )
    }
    assert.deepEqual(filesUnder(base), [], 'a refused picture was written anyway')

    const made = await image.generate({
      runId: 'run-1',
      pictureId: 'a1-shot-0-a',
      prompt: 'a picture',
      references: [],
      aspectRatio: '9:16',
    })
    assert.equal(made.kind, 'made')
    assert.equal(
      made.kind === 'made' ? made.picture.path : '',
      join(root, 'run-1', 'a1-shot-0-a.png'),
    )
    assert.deepEqual(filesUnder(base), [join(root, 'run-1', 'a1-shot-0-a.png')])
  } finally {
    rmSync(base, { recursive: true, force: true })
  }

  // The default: `.artifacts/` at this repository's root (D-086), which git ignores.
  assert.equal(DEFAULT_ARTIFACT_ROOT, join(REPO, '.artifacts'))
  const ignored = readFileSync(join(REPO, '.gitignore'), 'utf8').split(/\r?\n/)
  assert.ok(ignored.includes('.artifacts/'), '.gitignore does not name .artifacts/')

  const engine = await startEngine({
    worker: true,
    artifactRoot: null,
    script: stillsScript(CANONICAL_ONLY, CANONICAL_ONLY_PICS),
  })
  let runFolder: string | undefined
  try {
    assert.equal(engine.artifactRoot, DEFAULT_ARTIFACT_ROOT)
    const ran = await stills(engine, stillsRequest('r17-default'))
    runFolder = join(DEFAULT_ARTIFACT_ROOT, ran.runId)
    assert.equal(ran.result.status, 'completed', JSON.stringify(ran.result))
    assert.equal(ran.pictures.length, 2)
    for (const picture of ran.pictures) {
      assert.equal(picture.path, join(runFolder, `${picture.picture_id}.png`))
      assert.ok(existsSync(picture.path), `no file at ${picture.path}`)
      const checked = spawnSync('git', ['check-ignore', '-q', relative(REPO, picture.path)], {
        cwd: REPO,
      })
      assert.equal(checked.status, 0, `git does not ignore ${picture.path}`)
    }
  } finally {
    await engine.stop()
    // The run's own folder, and only it: the repository's .artifacts/ holds whatever else it held.
    if (runFolder !== undefined) rmSync(runFolder, { recursive: true, force: true })
  }
})

// ---------------------------------------------------------------- 18

const IMAGE = /\.(png|apng|jpe?g|jfif|webp|gif|bmp|tiff?|avif|heic|heif|ico|svg)$/i

test('18. no file with an image extension is tracked by git, and none exists under tests/', () => {
  const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: REPO, encoding: 'utf8' })
    .split('\0')
    .filter(Boolean)
  assert.ok(tracked.length > 100, 'git ls-files listed too few files to be this repository')
  assert.deepEqual(
    tracked.filter((f) => IMAGE.test(f)),
    [],
    'an image is tracked by git (D-087)',
  )

  const underTests = filesUnder(join(REPO, 'tests'))
  assert.ok(
    underTests.some((f) => f.endsWith('reel-stills-files.test.ts')),
    'the walk did not reach this file',
  )
  assert.deepEqual(
    underTests.filter((f) => IMAGE.test(f)).map((f) => relative(REPO, f)),
    [],
    'an image exists under tests/ (D-087)',
  )
})
