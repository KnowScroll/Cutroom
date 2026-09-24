import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { ClipShot, RenderManifest } from '@cutroom/contracts'
import { clipObservation, renderManifestSchema, witnessObservation } from '@cutroom/pipeline'
import { entity, observation } from './engine/stills.ts'

// reel-render, Slice 1 — checks 4 and 5 (docs/features/reel-render.md): the shape a witness's answer
// on a clip must have, and the shape a render manifest must have. Each is asserted by parsing, or by
// reading names through TypeScript's parser, never by reading the words that describe it.

type Schema = {
  safeParse(x: unknown): { success: boolean; error?: { issues: Array<{ path: PropertyKey[] }> } }
}
const ok = (s: Schema, x: unknown) => s.safeParse(x).success

/** The paths of every issue a refused value raised, joined by dots. */
const issuesOf = (s: Schema, x: unknown) =>
  (s.safeParse(x).error?.issues ?? []).map((i) => i.path.map(String).join('.'))

// ---------------------------------------------------------------- 4

/** A clip's observation: a still's, with D-041's temporal block. Two entities, two actions. */
const clip = () => ({
  ...observation([
    entity('a round red disc on cream paper'),
    entity('three men in mail', { count: 3 }),
  ]),
  actions: [
    { entity: 'a hand', verb: 'presses the disc', completes: true },
    { entity: 'three men in mail', verb: 'turn away', completes: false },
  ],
  eventOrder: ['a hand presses the disc', 'three men in mail turn away'],
})

test("4. the clip observation schema requires actions, eventOrder and clippedByEdge, and the still's observation schema still refuses actions and eventOrder", () => {
  assert.ok(ok(clipObservation, clip()), 'a valid clip observation was refused')
  // A clip in which nothing moves has no action and no event: the block is required, not its length.
  assert.ok(
    ok(clipObservation, { ...clip(), actions: [], eventOrder: [] }),
    'a clip observation with an empty temporal block was refused',
  )

  // D-041: the temporal block is a clip's, so a clip's observation without it is not one.
  for (const field of ['actions', 'eventOrder'] as const) {
    const missing: Record<string, unknown> = clip()
    delete missing[field]
    assert.ok(!ok(clipObservation, missing), `a clip observation without ${field} was accepted`)
    assert.ok(
      issuesOf(clipObservation, missing).includes(field),
      `the refusal does not name ${field}: ${issuesOf(clipObservation, missing).join(', ')}`,
    )
    assert.ok(
      !ok(clipObservation, { ...clip(), [field]: null }),
      `a clip observation with ${field} null was accepted`,
    )
  }
  for (const key of ['entity', 'verb', 'completes'] as const) {
    const action = clip()
    delete (action.actions[1] as Partial<(typeof action.actions)[number]>)[key]
    assert.ok(!ok(clipObservation, action), `an action without ${key} was accepted`)
  }

  // D-044: clippedByEdge on every entity of a clip, as of a still.
  for (const index of [0, 1]) {
    const missing = clip() as unknown as { entities: Array<Record<string, unknown>> }
    delete missing.entities[index]?.clippedByEdge
    assert.ok(!ok(clipObservation, missing), `entity ${index} without clippedByEdge was accepted`)
    assert.ok(
      issuesOf(clipObservation, missing).includes(`entities.${index}.clippedByEdge`),
      `the refusal does not name entities.${index}.clippedByEdge: ${issuesOf(clipObservation, missing).join(', ')}`,
    )
  }

  // And nothing a still's observation refuses is let in on a clip.
  assert.ok(!ok(clipObservation, { ...clip(), prompt: 'a seal' }), 'an unknown field was accepted')

  // The still's schema is unchanged: the temporal block, full or empty, is refused on a still.
  const still = observation([entity('a round red disc on cream paper')])
  assert.ok(ok(witnessObservation, still), 'a valid still observation was refused')
  const { actions, eventOrder } = clip()
  const temporal: Array<[string, unknown]> = [
    ['actions', actions],
    ['actions', []],
    ['eventOrder', eventOrder],
    ['eventOrder', []],
  ]
  for (const [field, value] of temporal) {
    assert.ok(
      !ok(witnessObservation, { ...still, [field]: value }),
      `a still's observation carrying ${field} ${JSON.stringify(value)} was accepted`,
    )
  }
  assert.ok(!ok(witnessObservation, clip()), "a clip's observation passed as a still's")
})

// ---------------------------------------------------------------- 5

const probe = (): ClipShot['clip'] => ({
  readable: true,
  durationSeconds: 8,
  video: { codec: 'h264', width: 144, height: 256, fps: 24, frames: 192 },
  audio: { codec: 'aac', sampleRate: 48000, channels: 2 },
  moovFirst: true,
})

// A render shot is a clip shot or a still-hold shot (S-097): this builder makes the first, so its
// opening is a CLIP shot's, which a still-hold shot has none of. Types only; no assertion changes.
function shot(unit: number, opening: ClipShot['opening'], startFrame: number): ClipShot {
  return {
    shotId: `shot-${unit}`,
    joinMode: 'cut',
    takeId: `a1-shot-${unit}-take-1`,
    requestId: `request-${unit}`,
    expandedPrompt: 'a slow river at dawn',
    clipPath: `artifacts/run-1/a1-shot-${unit}-take-1.mp4`,
    opening,
    narrationId: `a1-shot-${unit}-narration`,
    narrationPath: `artifacts/run-1/a1-shot-${unit}-narration.wav`,
    words: [
      { word: 'A', startMs: 0, endMs: 300 },
      { word: 'river.', startMs: 500, endMs: 800 },
    ],
    clip: probe(),
    startFrame,
    frames: 24,
    pictureFrames: 24,
    hold: null,
    conform: [],
    verdicts: [
      { gate: '2', outcome: 'accept', coverage: { strategy: 'whole file' } },
      { gate: '5', outcome: 'accept', coverage: { strategy: 'observation' } },
    ],
  }
}

/** Three shots: one from its keyframe, one the plan gave no picture, one whose picture was degraded. */
function manifest(): RenderManifest {
  return {
    runId: 'run-1',
    renderId: 'a1-render',
    profile: {
      container: 'mp4',
      videoCodec: 'h264',
      audioCodec: 'aac',
      width: 144,
      height: 256,
      fps: 24,
      sampleRate: 48000,
      channels: 2,
    },
    gateProfile: { id: 'phase-1', gates: ['0', '1', '1S', '2', '3', '4', '5', '7'] },
    captionStyle: { id: 'captions-1', fontName: 'Arial', fontSize: 18, marginV: 40 },
    ledger: { imageCents: 0, narrationCents: 0, videoCents: 0 },
    shots: [
      shot(0, { kind: 'keyframe', pictureId: 'a1-shot-0-a' }, 0),
      shot(1, { kind: 'text-to-video', placed: false }, 24),
      shot(2, { kind: 'text-to-video', placed: true, degradation: 'gate 1 failed twice' }, 48),
    ],
    captions: [
      { text: 'A', startMs: 0, endMs: 300 },
      { text: 'river.', startMs: 500, endMs: 800 },
    ],
    totalFrames: 72,
  }
}

/** The manifest with shot `index` replaced by what `change` makes of a copy of it. */
function withShot(index: number, change: (s: Record<string, unknown>) => void): unknown {
  const m = structuredClone(manifest()) as unknown as { shots: Array<Record<string, unknown>> }
  change(m.shots[index] as Record<string, unknown>)
  return m
}

test('5. the render manifest schema refuses a manifest in which two shots hold one narration id, a shot with no join mode, a placed text-to-video opening with no degradation reason, and an unplaced one with a reason', () => {
  assert.ok(
    ok(renderManifestSchema, manifest()),
    `a valid render manifest was refused: ${issuesOf(renderManifestSchema, manifest()).join(', ')}`,
  )

  // D-057: one narration unit a shot, never shared — whichever two shots share it.
  for (const [a, b] of [
    [0, 1],
    [0, 2],
    [1, 2],
  ] as const) {
    const shared = withShot(b, (s) => (s.narrationId = `a1-shot-${a}-narration`))
    assert.ok(
      !ok(renderManifestSchema, shared),
      `shots ${a} and ${b} holding one narration id were accepted`,
    )
  }

  // D-036, S-067: every shot declares its join mode.
  for (const index of [0, 1, 2]) {
    assert.ok(
      !ok(
        renderManifestSchema,
        withShot(index, (s) => delete s.joinMode),
      ),
      `shot ${index} with no join mode was accepted`,
    )
    assert.ok(
      !ok(
        renderManifestSchema,
        withShot(index, (s) => (s.joinMode = undefined)),
      ),
      `shot ${index} with an undefined join mode was accepted`,
    )
  }

  // S-073, D-059: a placed text-to-video opening carries its degradation reason, and an unplaced one
  // — the plan gave the shot no picture (D-027) — carries none.
  for (const opening of [
    { kind: 'text-to-video', placed: true },
    { kind: 'text-to-video', placed: true, degradation: '' },
    { kind: 'text-to-video', placed: true, degradation: null },
  ]) {
    assert.ok(
      !ok(
        renderManifestSchema,
        withShot(2, (s) => (s.opening = opening)),
      ),
      `a placed text-to-video opening ${JSON.stringify(opening)} was accepted`,
    )
  }
  for (const degradation of ['gate 1 failed twice', '']) {
    const opening = { kind: 'text-to-video', placed: false, degradation }
    assert.ok(
      !ok(
        renderManifestSchema,
        withShot(1, (s) => (s.opening = opening)),
      ),
      `an unplaced text-to-video opening ${JSON.stringify(opening)} was accepted`,
    )
  }
})
