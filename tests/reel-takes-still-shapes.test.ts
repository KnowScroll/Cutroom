import assert from 'node:assert/strict'
import { join } from 'node:path'
import { test } from 'node:test'
import type { RenderManifest } from '@cutroom/contracts'
import { renderManifestSchema } from '@cutroom/pipeline'
import { REPO } from './_repo.ts'
import { errorsIn } from './engine/compile.ts'

// reel-takes, Slice 4 — check 16 (docs/features/reel-takes.md): the two kinds of render shot, and
// what the render manifest's schema refuses of each (D-059, S-073, S-097).
//
// A render shot is a CLIP SHOT — reel-render's, unchanged — or a STILL-HOLD SHOT, a shot held on its
// chosen picture at its take cap (D-025 rung 2). Each branch makes the other's fields `never`, so a
// still-hold shot with a take id, a clip path, an opening, a clip measure or a hold is a type error,
// and so is a clip shot with a `stillHold`. The schema refuses the same combinations, and refuses a
// still-hold shot with no degradation reason or with other than three takes — D-059's check, which
// S-073 left to this feature.

const CONTRACTS = '../../packages/contracts/src/index.ts'

/** Where a snippet pretends to live: inside the repository, so its relative imports resolve. */
const DIR = join(REPO, '.tmp', `takes-still-shapes-${process.pid}`)

const PREAMBLE = [
  'import type {',
  '  ClipShot,',
  '  MediaProbe,',
  '  RenderShot,',
  '  StillHoldShot,',
  `} from '${CONTRACTS}'`,
  '',
  'declare const probe: MediaProbe',
  'declare const clip: ClipShot',
  'declare const still: StillHoldShot',
  'const block = {',
  "  pictureId: 'a1-shot-1-single',",
  "  path: 'artifacts/run-1/a1-shot-1-single.png',",
  '  probe,',
  "  takeIds: ['a1-shot-1-take-1', 'a1-shot-1-take-2', 'a1-shot-1-take-3'],",
  "  degradation: 'shot-1 is held on its approved picture',",
  '  endZoom: 1.1,',
  '}',
  '',
].join('\n')

const snippet = (body: string) => `${PREAMBLE}export function use(): void {\n${body}\n}\n`

// ---------------------------------------------------------------- 16

const CHECK_16 =
  '16. compiled by TypeScript in the test: a render shot with a stillHold and a take id, a clip path, an opening, a clip measure or a hold is a type error, as is a clip shot with a stillHold; and the render manifest schema refuses a still-hold shot with no degradation reason, one with other than three takes, one carrying any clip field, and a clip shot carrying a stillHold, and parses a manifest holding both kinds'

test(`${CHECK_16} — what compiles, and how a shot is told from the other`, () => {
  const legal = snippet(
    [
      '  const a: RenderShot = clip',
      '  const b: RenderShot = still',
      '  const held: StillHoldShot = { ...still, stillHold: block }',
      // A shot is told from the other by its `stillHold`, which is how the assembler reads one.
      '  const shots: RenderShot[] = [a, b, held]',
      '  for (const shot of shots) {',
      '    if (shot.stillHold !== undefined) {',
      '      void shot.stillHold.endZoom',
      '      void shot.stillHold.probe.readable',
      '      void shot.stillHold.takeIds.length',
      '    } else {',
      '      void shot.clipPath.length',
      '      void shot.clip.readable',
      '      void shot.pictureFrames',
      '      void shot.opening.kind',
      '    }',
      // Both carry the span, whichever kind they are.
      '    void [shot.shotId, shot.narrationId, shot.joinMode]',
      '    void [shot.startFrame, shot.frames, shot.conform.length, shot.verdicts.length]',
      '  }',
    ].join('\n'),
  )
  assert.deepEqual(errorsIn(DIR, legal), [], 'the two kinds of render shot did not compile')
})

/** Each misuse, with the text the compiler must name when it refuses it. */
const MISUSES: ReadonlyArray<readonly [string, string, string]> = [
  [
    'a still-hold shot with a take id',
    "  const s: StillHoldShot = { ...still, takeId: 'a1-shot-1-take-1' }\n  void s",
    "'takeId'",
  ],
  [
    'a still-hold shot with a request id',
    "  const s: StillHoldShot = { ...still, requestId: 'stand-in-1' }\n  void s",
    "'requestId'",
  ],
  [
    'a still-hold shot with an expanded prompt',
    "  const s: StillHoldShot = { ...still, expandedPrompt: 'a hall at dusk' }\n  void s",
    "'expandedPrompt'",
  ],
  [
    'a still-hold shot with a clip path',
    "  const s: StillHoldShot = { ...still, clipPath: 'artifacts/run-1/a1-shot-1-take-1.mp4' }\n  void s",
    "'clipPath'",
  ],
  [
    'a still-hold shot with an opening',
    "  const s: StillHoldShot = { ...still, opening: { kind: 'keyframe', pictureId: 'a1-shot-1-single' } }\n  void s",
    "'opening'",
  ],
  [
    'a still-hold shot with a clip measure',
    '  const s: StillHoldShot = { ...still, clip: probe }\n  void s',
    "'clip'",
  ],
  [
    'a still-hold shot with picture frames',
    '  const s: StillHoldShot = { ...still, pictureFrames: 36 }\n  void s',
    "'pictureFrames'",
  ],
  [
    'a still-hold shot with a hold',
    "  const s: StillHoldShot = { ...still, hold: { frames: 12, seconds: 0.5, reason: 'r' } }\n  void s",
    "'hold'",
  ],
  [
    'a clip shot with a stillHold',
    '  const s: ClipShot = { ...clip, stillHold: block }\n  void s',
    "'stillHold'",
  ],
  [
    // Refused against BOTH branches, so the compiler names the types rather than one key: the shot
    // carries a `stillHold`, and its take id is what a still-hold shot may not have.
    'a render shot that is a clip shot with a stillHold',
    '  const s: RenderShot = { ...clip, stillHold: block }\n  void s',
    'stillHold',
  ],
  [
    'a render shot that is a still-hold shot with a clip path',
    "  const s: RenderShot = { ...still, clipPath: 'artifacts/run-1/a1-shot-1-take-1.mp4' }\n  void s",
    'clipPath',
  ],
]

test(`${CHECK_16} — what is refused, each misuse named`, () => {
  for (const [what, body, named] of MISUSES) {
    const errors = errorsIn(DIR, snippet(body))
    assert.ok(errors.length > 0, `${what} compiled`)
    assert.ok(
      errors.some((e) => e.includes(named)),
      `${what} was refused, but no error names ${named}: ${errors.join(' | ')}`,
    )
  }
})

// ---------------------------------------------------------------- 16, the schema

type Schema = { safeParse: (x: unknown) => { success: boolean; error?: { issues: unknown[] } } }

const ok = (s: Schema, x: unknown) => s.safeParse(x).success
const issuesOf = (s: Schema, x: unknown) =>
  (s.safeParse(x).error?.issues ?? []).map((i) => {
    const issue = i as { path: Array<string | number>; message: string }
    return `${issue.path.join('.')}: ${issue.message}`
  })

const PROBE = {
  readable: true,
  durationSeconds: 0,
  video: { codec: 'png', width: 90, height: 160, fps: 25, frames: 1 },
  audio: null,
  moovFirst: null,
}

const SPAN = {
  narrationId: 'a1-shot-0-narration',
  narrationPath: 'artifacts/run-1/a1-shot-0-narration.wav',
  words: [
    { word: 'A', startMs: 0, endMs: 300 },
    { word: 'charter.', startMs: 500, endMs: 800 },
  ],
  conform: [],
  verdicts: [{ gate: '1', outcome: 'accept', coverage: 'full' }],
}

/** A clip shot, as reel-render writes one. */
const clipShot = () => ({
  ...structuredClone(SPAN),
  shotId: 'shot-0',
  joinMode: 'cut',
  takeId: 'a1-shot-0-take-1',
  requestId: 'stand-in-a1-shot-0-take-1',
  expandedPrompt: 'a charter on a table',
  clipPath: 'artifacts/run-1/a1-shot-0-take-1.mp4',
  opening: { kind: 'text-to-video', placed: false },
  clip: {
    readable: true,
    durationSeconds: 5,
    video: { codec: 'h264', width: 108, height: 192, fps: 24, frames: 120 },
    audio: { codec: 'aac', sampleRate: 48000, channels: 2 },
    moovFirst: true,
  },
  startFrame: 0,
  frames: 48,
  pictureFrames: 48,
  hold: null,
})

/** A still-hold shot, in its place in plan order after it. */
const stillHoldShot = () => ({
  ...structuredClone(SPAN),
  shotId: 'shot-1',
  joinMode: 'cut',
  narrationId: 'a1-shot-1-narration',
  narrationPath: 'artifacts/run-1/a1-shot-1-narration.wav',
  stillHold: {
    pictureId: 'a1-shot-1-single',
    path: 'artifacts/run-1/a1-shot-1-single.png',
    probe: structuredClone(PROBE),
    takeIds: ['a1-shot-1-take-1', 'a1-shot-1-take-2', 'a1-shot-1-take-3'],
    degradation: 'shot-1 is held on its approved picture a1-shot-1-single (D-025, S-090)',
    endZoom: 1.1,
  },
  startFrame: 48,
  frames: 36,
})

/** A manifest holding one shot of each kind. */
const bothKinds = () => ({
  runId: 'run-1',
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
  ledger: { imageCents: 12, narrationCents: 1, videoCents: 30 },
  shots: [clipShot(), stillHoldShot()],
  captions: [{ text: 'A', startMs: 0, endMs: 300 }],
  totalFrames: 84,
})

/** The manifest with shot `index` replaced by what `change` makes of a copy of it. */
function withShot(index: number, change: (s: Record<string, unknown>) => void): unknown {
  const m = bothKinds() as unknown as { shots: Array<Record<string, unknown>> }
  change(m.shots[index] as Record<string, unknown>)
  return m
}

/** Every clip field a still-hold shot may not carry, with a value of the right shape. */
const CLIP_FIELDS: ReadonlyArray<readonly [string, unknown]> = [
  ['takeId', 'a1-shot-1-take-1'],
  ['requestId', 'stand-in-a1-shot-1-take-1'],
  ['expandedPrompt', 'a hall at dusk'],
  ['clipPath', 'artifacts/run-1/a1-shot-1-take-1.mp4'],
  ['opening', { kind: 'keyframe', pictureId: 'a1-shot-1-single' }],
  ['clip', clipShot().clip],
  ['pictureFrames', 36],
  ['hold', { frames: 12, seconds: 0.5, reason: 'its last frame is held' }],
]

test(`${CHECK_16} — the schema parses a manifest holding both kinds and refuses each misuse`, () => {
  const schema = renderManifestSchema as unknown as Schema
  assert.ok(
    ok(schema, bothKinds()),
    `a manifest holding both kinds was refused: ${issuesOf(schema, bothKinds()).join(', ')}`,
  )
  // And it is the two kinds that parse: the type says so of the same value.
  const parsed: RenderManifest = renderManifestSchema.parse(bothKinds())
  assert.equal(parsed.shots[0]?.stillHold, undefined)
  assert.equal(parsed.shots[1]?.stillHold?.pictureId, 'a1-shot-1-single')

  // No degradation reason: absent, or empty.
  assert.ok(
    !ok(
      schema,
      withShot(1, (s) => {
        delete (s.stillHold as Record<string, unknown>).degradation
      }),
    ),
    'a still-hold shot with no degradation reason was accepted (D-059)',
  )
  assert.ok(
    !ok(
      schema,
      withShot(1, (s) => {
        ;(s.stillHold as Record<string, unknown>).degradation = ''
      }),
    ),
    'a still-hold shot with an empty degradation reason was accepted (D-059)',
  )

  // Other than three takes: two, four, or none.
  for (const takeIds of [
    [],
    ['a1-shot-1-take-1'],
    ['a1-shot-1-take-1', 'a1-shot-1-take-2'],
    ['a1-shot-1-take-1', 'a1-shot-1-take-2', 'a1-shot-1-take-3', 'a1-shot-1-take-4'],
  ]) {
    assert.ok(
      !ok(
        schema,
        withShot(1, (s) => {
          ;(s.stillHold as Record<string, unknown>).takeIds = takeIds
        }),
      ),
      `a still-hold shot with ${takeIds.length} takes was accepted (S-097)`,
    )
  }

  // Any clip field on a still-hold shot.
  for (const [field, value] of CLIP_FIELDS) {
    assert.ok(
      !ok(
        schema,
        withShot(1, (s) => {
          s[field] = value
        }),
      ),
      `a still-hold shot carrying ${field} was accepted (S-097)`,
    )
  }

  // A clip shot carrying a stillHold.
  assert.ok(
    !ok(
      schema,
      withShot(0, (s) => {
        s.stillHold = stillHoldShot().stillHold
      }),
    ),
    'a clip shot carrying a stillHold was accepted (S-097)',
  )

  // And a still-hold shot missing what every shot carries is refused, so the branch is not a hole.
  for (const field of ['shotId', 'joinMode', 'narrationId', 'startFrame', 'frames', 'verdicts']) {
    assert.ok(
      !ok(
        schema,
        withShot(1, (s) => {
          delete s[field]
        }),
      ),
      `a still-hold shot with no ${field} was accepted`,
    )
  }
})
