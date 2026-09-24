import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import { after, test } from 'node:test'
import type { RenderManifest } from '@cutroom/contracts'
import { renderManifestSchema } from '@cutroom/pipeline'
import { ffmpegAssembler, ffmpegTools } from '@cutroom/providers'
import { REPO } from './_repo.ts'
import { errorsIn } from './engine/compile.ts'
import { startEngine, type Engine } from './engine/harness.ts'
import { renderOf, toneDb } from './engine/render.ts'
import { THREE_RANKS, THREE_RANKS_PICS } from './engine/stills.ts'
import { video, videoRequest, videoScript } from './engine/video.ts'

// cut-rules, Slice 3 — checks 3 and 4 (docs/features/cut-rules.md): A REEL'S ONLY SOUND IS ITS
// NARRATION (S-158). The video model's own sound — ambience at best, a voice at worst (P-007) — is
// never mixed, and nothing is left in the manifest that says it is.
//
// The stand-in clips carry a loud 220 Hz tone and the stand-in narrations a 660 Hz one, so each band
// can be measured apart. The clips' tone is ASSERTED loud in each clip's own file first: without it,
// a silent reel would prove nothing (the review's round 1, finding 2).

let shared: Promise<{ engine: Engine; manifest: RenderManifest }> | undefined

/** One completed video run's stored render manifest, made once for both checks. */
function completed() {
  shared ??= (async () => {
    const engine = await startEngine({
      worker: true,
      script: videoScript(THREE_RANKS, THREE_RANKS_PICS),
    })
    try {
      const ran = await video(engine, videoRequest('cut-rules-sound'))
      assert.equal(ran.result.status, 'completed', JSON.stringify(ran.result))
      const row = renderOf(engine, ran.runId)
      return { engine, manifest: JSON.parse(row.text) as RenderManifest }
    } catch (error) {
      await engine.stop()
      throw error
    }
  })()
  return shared
}

after(async () => {
  const made = await shared?.catch(() => undefined)
  await made?.engine.stop()
})

/** A copy of a clip with its sound stream removed at the FILE, not only in the manifest's facts. */
function withoutSound(clipPath: string, dir: string): string {
  const out = join(dir, basename(clipPath))
  const ran = spawnSync(
    'ffmpeg',
    ['-hide_banner', '-nostdin', '-y', '-i', clipPath, '-an', '-c:v', 'copy', out],
    {
      encoding: 'utf8',
    },
  )
  assert.equal(ran.status, 0, ran.stderr)
  return out
}

test("3. a reel's only sound is its narration: for a completed run's render manifest, each clip file's own 220 Hz band is above −30 dB (the premise); the manifest assembled as made and the same manifest assembled over -an copies of its clips, their audio facts null, give a 220 Hz band within 1 dB of each other in every shot's span, and a 660 Hz narration band above −30 dB and within 1 dB of each other in every span; and the as-made invocation's filtergraph takes no clip input's audio — no [<even>:a] label", async () => {
  const { manifest } = await completed()
  const clipShots = manifest.shots.filter((s) => s.stillHold === undefined)
  assert.ok(clipShots.length > 0, 'the fixture has no clip shot')
  for (const shot of clipShots) {
    const own = toneDb(shot.clipPath, 220)
    assert.ok(
      own > -30,
      `${shot.shotId}'s clip file is ${own} dB at 220 Hz: no tone to hear, so its absence proves nothing`,
    )
  }

  const dir = mkdtempSync(join(tmpdir(), 'cut-rules-sound-'))
  try {
    const tools = ffmpegTools()
    const bare = join(dir, 'bare-clips')
    mkdirSync(bare)
    const silenced: RenderManifest = {
      ...manifest,
      shots: manifest.shots.map((s) =>
        s.stillHold === undefined
          ? { ...s, clipPath: withoutSound(s.clipPath, bare), clip: { ...s.clip, audio: null } }
          : s,
      ),
    }
    const asMade = await ffmpegAssembler(tools, { artifactRoot: join(dir, 'as-made') }).assemble(
      manifest,
    )
    const noSound = await ffmpegAssembler(tools, { artifactRoot: join(dir, 'no-sound') }).assemble(
      silenced,
    )

    const fps = manifest.profile.fps
    for (const shot of manifest.shots) {
      // The middle of the span, a margin from each cut, so a neighbour's edge is never measured.
      const span = { fromSeconds: shot.startFrame / fps + 0.25, seconds: shot.frames / fps - 0.5 }
      const clipBand = toneDb(asMade.path, 220, span)
      const noClip = toneDb(noSound.path, 220, span)
      assert.ok(
        Math.abs(clipBand - noClip) <= 1,
        `${shot.shotId}: the reel's 220 Hz band is ${clipBand} dB; with no clip sound at all, ${noClip} dB`,
      )
      const spoken = toneDb(asMade.path, 660, span)
      const spokenBare = toneDb(noSound.path, 660, span)
      assert.ok(spoken > -30, `${shot.shotId}: the narration's 660 Hz band is ${spoken} dB`)
      assert.ok(
        Math.abs(spoken - spokenBare) < 1,
        `${shot.shotId}: the narration moved from ${spokenBare} to ${spoken} dB with the clips' files`,
      )
    }

    // And the one pass takes no clip's sound at all: a clip is input 2i, its narration 2i + 1.
    const args = asMade.invocations[0] ?? []
    const graph = String(args[args.indexOf('-filter_complex') + 1])
    const clipAudio = [...graph.matchAll(/\[(\d+):a\]/g)]
      .map((m) => Number(m[1]))
      .filter((n) => n % 2 === 0)
    assert.deepEqual(clipAudio, [], "the filtergraph takes a clip input's audio")
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('4. no duck level is left: renderManifestSchema refuses a manifest holding duckDb, and a RenderManifest or RenderSettings literal holding one is a type error (a compile check)', async () => {
  const { manifest } = await completed()
  assert.equal(
    renderManifestSchema.safeParse(manifest).success,
    true,
    'the stored manifest does not parse',
  )
  assert.ok(!('duckDb' in manifest), 'a completed run stored a duck level')
  assert.equal(
    renderManifestSchema.safeParse({ ...manifest, duckDb: 18 }).success,
    false,
    'the schema accepts a duck level',
  )

  const errors = errorsIn(
    join(REPO, 'tests'),
    [
      "import type { RenderManifest, RenderSettings } from '../packages/contracts/src/index.ts'",
      "export const manifestHasNone: 'duckDb' extends keyof RenderManifest ? 'present' : 'absent' = 'absent'",
      "export const settingsHaveNone: 'duckDb' extends keyof RenderSettings ? 'present' : 'absent' = 'absent'",
      '',
    ].join('\n'),
  )
  assert.deepEqual(errors, [], 'a duck level is still declared')
})
