import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, isAbsolute, join, relative } from 'node:path'
import { test } from 'node:test'
import { DEFAULT_ARTIFACT_ROOT, fakeNarration, fakeVideo, ffmpegTools } from '@cutroom/providers'
import { REPO } from './_repo.ts'
import { startEngine } from './engine/harness.ts'
import { NO_RECURRENCE } from './engine/stills.ts'
import { video, videoRequest, videoScript, type Videoed } from './engine/video.ts'

// reel-render, Slice 3 — check 19 (docs/features/reel-render.md): every clip and narration is a real
// file (D-087) under the one artifact root, in the run's folder (D-086), written by the stand-ins
// through ffmpeg or byte by byte (S-075), and none is ever committed.
//
// A clip is read here by ffprobe run from the test and by its own bytes — never by the media port
// under test, whose answers are what the gates decide on.

/** Every file under a folder, as full paths. */
function filesUnder(folder: string): string[] {
  if (!existsSync(folder)) return []
  return readdirSync(folder, { withFileTypes: true, recursive: true })
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name))
}

/** The kinds of stream ffprobe finds in a file, read directly. */
function streamsOf(path: string): string[] {
  const out = execFileSync(
    'ffprobe',
    ['-v', 'error', '-show_entries', 'stream=codec_type', '-of', 'json', path],
    { encoding: 'utf8' },
  )
  return (JSON.parse(out) as { streams: Array<{ codec_type: string }> }).streams.map(
    (s) => s.codec_type,
  )
}

/** A clips stage that completes for a plan that places no picture: six takes, six narrations. */
async function completedClips(requestId: string, artifactRoot?: null) {
  const engine = await startEngine({
    worker: true,
    ...(artifactRoot === null ? { artifactRoot: null } : {}),
    script: videoScript(NO_RECURRENCE, []),
  })
  let ran: Videoed | undefined
  try {
    ran = await video(engine, videoRequest(requestId))
    assert.ok(
      ran.jobs.some((j) => j.kind === 'reel.assemble'),
      `the clips stage did not complete: ${JSON.stringify(ran.result)}`,
    )
    assert.equal(ran.takes.length, 6)
    assert.equal(ran.narrations.length, 6)
    return { engine, ran }
  } catch (error) {
    // Under the repository's own .artifacts/, a run that failed its assertions leaves its folder
    // behind unless it is removed here: only its own run's folders, and only there.
    const runs = engine.query<{ run_id: string }>('SELECT run_id FROM run').map((r) => r.run_id)
    await engine.stop()
    if (artifactRoot === null) {
      for (const runId of runs)
        rmSync(join(DEFAULT_ARTIFACT_ROOT, runId), { recursive: true, force: true })
    }
    throw error
  }
}

// ---------------------------------------------------------------- 19

test("19. each clip is a readable MP4 with a video and an audio stream, under the artifact root in the run's folder at the path its take row records, its id carrying the attempt", async () => {
  const { engine, ran } = await completedClips('r19')
  try {
    const clips = ran.jobs.find((j) => j.kind === 'reel.clips')
    assert.equal(clips?.attempts, 1)
    const folder = join(engine.artifactRoot, ran.runId)

    for (const take of ran.takes) {
      const { path, take_id: id } = take
      assert.ok(isAbsolute(path), `${id}'s path is not absolute: ${path}`)
      assert.equal(path, join(folder, `${id}.mp4`), `${id} is not at <root>/<runId>/<takeId>.mp4`)
      assert.equal(dirname(path), folder, `${id} is not in the run's folder`)
      assert.ok(!relative(engine.artifactRoot, path).startsWith('..'), `${id} is outside the root`)
      assert.ok(existsSync(path), `${id} has no file at ${path}`)
      assert.equal(readFileSync(path).toString('latin1', 4, 8), 'ftyp', `${id} is not an MP4`)
      assert.deepEqual(streamsOf(path).sort(), ['audio', 'video'], `${id}'s streams`)

      // `a<attempt>-shot-<unit>-take-<n>` (S-071), the attempt being the clips job's.
      const parts = /^a(\d+)-shot-(\d+)-take-(\d+)$/.exec(id)
      assert.ok(parts, `${id} is not a<attempt>-shot-<unit>-take-<n>`)
      assert.equal(Number(parts[1]), clips?.attempts, `${id} does not carry the job's attempt`)
      assert.equal(take.attempt, clips?.attempts)
      assert.equal(Number(parts[2]), take.shot_unit)
      assert.equal(Number(parts[3]), 1, 'one take a shot (S-066)')
    }

    for (const narration of ran.narrations) {
      const { path, narration_id: id } = narration
      assert.equal(
        path,
        join(folder, `${id}.wav`),
        `${id} is not at <root>/<runId>/<narrationId>.wav`,
      )
      assert.ok(existsSync(path), `${id} has no file at ${path}`)
      const bytes = readFileSync(path)
      assert.equal(bytes.toString('latin1', 0, 4), 'RIFF', `${id} is not a RIFF file`)
      assert.equal(bytes.toString('latin1', 8, 12), 'WAVE', `${id} is not a WAVE file`)
      const parts = /^a(\d+)-shot-(\d+)-narration$/.exec(id)
      assert.ok(parts, `${id} is not a<attempt>-shot-<unit>-narration`)
      assert.equal(Number(parts[1]), clips?.attempts, `${id} does not carry the job's attempt`)
      assert.equal(Number(parts[2]), narration.shot_unit)
    }
  } finally {
    await engine.stop()
  }
})

test('19. the stand-ins refuse an id whose path would leave the root', async () => {
  // The root is three folders deep inside a temporary one, so a stand-in that failed to refuse would
  // write inside the temporary folder, where this test can see it — never above it.
  const base = mkdtempSync(join(tmpdir(), 'reel-render-root-'))
  const root = join(base, 'one', 'two', 'root')
  mkdirSync(root, { recursive: true })
  try {
    const clips = fakeVideo(ffmpegTools(), {}, { artifactRoot: root })
    const voice = fakeNarration({}, { artifactRoot: root })
    const leaving: Array<[string, string]> = [
      ['run-1', '../escape'],
      ['run-1', '../../escape'],
      ['run-1', '..\\..\\escape'],
      ['run-1', 'a1-shot-0-take-1/../../../escape'],
      ['..', 'escape'],
      ['../..', 'escape'],
      ['run-1/../..', 'escape'],
    ]
    for (const [runId, id] of leaving) {
      await assert.rejects(
        clips.generate({
          runId,
          takeId: id,
          prompt: 'a clip',
          durationSeconds: 5,
          resolution: '768P',
          seed: 1,
          promptExpansionMode: 'balanced',
          mode: 'text-to-video',
          aspectRatio: '9:16',
        }),
        `the video stand-in did not refuse runId ${runId} and takeId ${id}`,
      )
      await assert.rejects(
        voice.speak({ runId, narrationId: id, text: 'a word', voice: 'stand-in' }),
        `the narration stand-in did not refuse runId ${runId} and narrationId ${id}`,
      )
    }
    assert.deepEqual(filesUnder(base), [], 'a refused clip or narration was written anyway')

    // The same stand-ins write an id that stays, where it says.
    const made = await clips.generate({
      runId: 'run-1',
      takeId: 'a1-shot-0-take-1',
      prompt: 'a clip',
      durationSeconds: 5,
      resolution: '768P',
      seed: 1,
      promptExpansionMode: 'balanced',
      mode: 'text-to-video',
      aspectRatio: '9:16',
    })
    assert.equal(
      made.kind === 'made' ? made.clip.path : '',
      join(root, 'run-1', 'a1-shot-0-take-1.mp4'),
    )
    const spoken = await voice.speak({
      runId: 'run-1',
      narrationId: 'a1-shot-0-narration',
      text: 'a word',
      voice: 'stand-in',
    })
    assert.equal(
      spoken.kind === 'made' ? spoken.audio.path : '',
      join(root, 'run-1', 'a1-shot-0-narration.wav'),
    )
    assert.deepEqual(filesUnder(base).sort(), [
      join(root, 'run-1', 'a1-shot-0-narration.wav'),
      join(root, 'run-1', 'a1-shot-0-take-1.mp4'),
    ])
  } finally {
    rmSync(base, { recursive: true, force: true })
  }
})

test("19. with the root unset, clips and narrations are written under the repository's .artifacts/", async () => {
  assert.equal(DEFAULT_ARTIFACT_ROOT, join(REPO, '.artifacts'))
  let runFolder: string | undefined
  const started = await completedClips('r19-default', null)
  const { engine, ran } = started
  try {
    runFolder = join(DEFAULT_ARTIFACT_ROOT, ran.runId)
    assert.equal(engine.artifactRoot, DEFAULT_ARTIFACT_ROOT)
    const paths = [
      ...ran.takes.map((t) => [t.path, `${t.take_id}.mp4`] as const),
      ...ran.narrations.map((n) => [n.path, `${n.narration_id}.wav`] as const),
    ]
    assert.equal(paths.length, 12)
    for (const [path, name] of paths) {
      assert.equal(path, join(runFolder, name))
      assert.ok(existsSync(path), `no file at ${path}`)
      const checked = spawnSync('git', ['check-ignore', '-q', relative(REPO, path)], { cwd: REPO })
      assert.equal(checked.status, 0, `git does not ignore ${path}`)
    }
  } finally {
    await engine.stop()
    // The run's own folder, and only it: the repository's .artifacts/ holds whatever else it held.
    if (runFolder !== undefined) rmSync(runFolder, { recursive: true, force: true })
  }
})

const MEDIA =
  /\.(wav|mp3|m4a|aac|flac|ogg|oga|opus|wma|aiff?|mp4|m4v|mov|webm|mkv|avi|wmv|flv|mpe?g|3gp|ass|ssa|srt|vtt|sub|sbv)$/i

test('19. no audio, video or subtitles file is tracked by git, and none exists under tests/', () => {
  const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: REPO, encoding: 'utf8' })
    .split('\0')
    .filter(Boolean)
  assert.ok(tracked.length > 100, 'git ls-files listed too few files to be this repository')
  assert.deepEqual(
    tracked.filter((f) => MEDIA.test(f)),
    [],
    'an audio, video or subtitles file is tracked by git (D-087)',
  )

  const underTests = filesUnder(join(REPO, 'tests'))
  assert.ok(
    underTests.some((f) => f.endsWith('reel-render-files.test.ts')),
    'the walk did not reach this file',
  )
  assert.deepEqual(
    underTests.filter((f) => MEDIA.test(f)).map((f) => relative(REPO, f)),
    [],
    'an audio, video or subtitles file exists under tests/ (D-087)',
  )
})
