import assert from 'node:assert/strict'
import { join } from 'node:path'
import { test } from 'node:test'
import { REPO } from './_repo.ts'
import { errorsIn } from './engine/compile.ts'

// reel-render, Slice 1 — check 1 (docs/features/reel-render.md): the ports and the shapes, compiled
// by TypeScript here (D-007, D-018, D-026, D-037, D-053, I-8, S-071, S-072, S-074).
//
// A video request is refused by its type before any validator sees it: no text-to-video call without
// the 9:16 D-019 calls a trap, no image-to-video call without its picture, no reference mode and no
// end image (D-026, D-037), and 768P only (D-007, D-014). The witness is the same blind call on a
// clip as on a picture — a clip or a picture and a temperature, never both, never a prompt (I-8,
// D-053) — and Gate 7's judge takes the shots and the questions, never a schema or a role of its
// choosing (S-074). Each misuse must be an error NAMING what makes it one; the calls Gate 3 writes
// must compile clean.

const CONTRACTS = '../../packages/contracts/src/index.ts'
const CONTRACT = '../../packages/reel-contract/src/index.ts'

/** Where a snippet pretends to live: inside the repository, so its relative imports resolve. */
const DIR = join(REPO, '.tmp', `render-ports-${process.pid}`)

const PREAMBLE = [
  'import type {',
  '  AssemblerPort,',
  '  ClipRef,',
  '  ClipsRecorder,',
  '  GateProfile,',
  '  LanguageModelPort,',
  '  MediaPort,',
  '  ModelReceipt,',
  '  NarrationPort,',
  '  NarrationRecord,',
  '  PictureRef,',
  '  RenderManifest,',
  '  RenderSettings,',
  '  TakeRecord,',
  '  VideoAnswer,',
  '  VideoPort,',
  '  VideoRequest,',
  `} from '${CONTRACTS}'`,
  `import type { Criterion } from '${CONTRACT}'`,
  '',
  "type StructuredCall = Parameters<LanguageModelPort['structured']>[0]",
  'declare const model: LanguageModelPort',
  'declare const video: VideoPort',
  'declare const narration: NarrationPort',
  'declare const media: MediaPort',
  'declare const assembler: AssemblerPort',
  'declare const recorder: ClipsRecorder',
  "declare const schema: StructuredCall['schema']",
  'declare const picture: PictureRef',
  'declare const other: PictureRef',
  'declare const clip: ClipRef',
  'declare const criterion: Criterion',
  'declare const renderManifest: RenderManifest',
  'declare const take: TakeRecord',
  'declare const spoken: NarrationRecord',
  'declare const settings: RenderSettings',
  "const fields = { runId: 'run-1', takeId: 'a1-shot-0-take-1', prompt: 'p', durationSeconds: 8, resolution: '768P' as const, seed: 1, promptExpansionMode: 'balanced' }",
  '',
].join('\n')

const snippet = (body: string) =>
  `${PREAMBLE}export async function call(): Promise<void> {\n${body}\n}\n`

/** Every field a video request carries whatever its mode, as Gate 3 writes them. */
const FIELDS = [
  "    runId: 'run-1',",
  "    takeId: 'a1-shot-0-take-1',",
  "    prompt: 'a slow river at dawn',",
  '    durationSeconds: 8,',
  "    resolution: '768P',",
  '    seed: 1,',
  "    promptExpansionMode: 'balanced',",
].join('\n')

/**
 * A request literal assigned to `VideoRequest` and sent, with `extra` lines for its mode — in a
 * block of its own, so one snippet can hold several.
 */
const request = (extra: string, fields = FIELDS) =>
  `  {\n  const r: VideoRequest = {\n${extra}\n${fields}\n  }\n  const answer: VideoAnswer = await video.generate(r)\n  if (answer.kind === 'made') await media.probe({ id: answer.clip.takeId, path: answer.clip.path })\n  }`

// ---------------------------------------------------------------- 1

test('1. the calls as Gate 3 writes them compile', () => {
  const legal = snippet(
    [
      request("    mode: 'image-to-video',\n    image: picture,"),
      request("    mode: 'text-to-video',\n    aspectRatio: '9:16',"),
      "  await narration.speak({ runId: 'run-1', narrationId: 'a1-shot-0-narration', text: 'A river.', voice: 'v' })",
      "  await media.probe({ id: 'a1-shot-0-narration', path: 'a1-shot-0-narration.wav' })",
      '  await media.scan(clip, { blackSeconds: 0.5, frozenSeconds: 1 })',
      '  await media.readText(clip)',
      '  await media.listen(clip)',
      "  await media.frames({ runId: 'run-1', renderId: 'a1-render', path: 'a1-render.mp4' }, [0, 0.5, 1])",
      '  await media.ready()',
      '  await assembler.ready()',
      '  const assembled = await assembler.assemble(renderManifest)',
      '  assembled.invocations.length',
      '  await recorder.take(take)',
      '  await recorder.narration(spoken)',
      "  await model.structured({ prompt: 'p', schema, role: 'planner', temperature: 0 })",
      '  await model.structured({',
      '    prompt: `is ${criterion.text} shown?`,',
      '    schema,',
      "    role: 'reconciler',",
      '    temperature: 0,',
      '    takeIds: [clip.takeId],',
      '  })',
      '  await model.structured({',
      "    prompt: 'p',",
      '    schema,',
      "    role: 'reconciler',",
      '    temperature: 0,',
      '    pictureIds: [picture.pictureId],',
      '  })',
      '  await model.observe({ picture, temperature: 0 })',
      '  await model.observe({ clip, temperature: 0 })',
      "  await model.compare({ pictures: [picture, other], subjects: ['the king'], temperature: 0 })",
      '  const judged = await model.judgeCut({',
      "    shots: [{ shotId: 'shot-0', sentences: ['A river.'], frames: [picture, other] }],",
      "    questions: ['Are the shots in a sensible order?'],",
      '    temperature: 0,',
      '  })',
      '  const receipt: ModelReceipt = {',
      "    model: 'MiniMax-M3',",
      "    role: 'judge',",
      "    call: 'judgeCut',",
      '    temperature: 0,',
      '    usage: { inputTokens: 0, outputTokens: 0 },',
      '    fake: true,',
      '    pictureIds: [picture.pictureId],',
      '    takeIds: [],',
      '  }',
      '  const profile: GateProfile = settings.gateProfile',
      '  void [judged, receipt, profile, renderManifest.gateProfile, renderManifest.shots[0]?.joinMode]',
    ].join('\n'),
  )
  assert.deepEqual(errorsIn(DIR, legal), [], 'a call Gate 3 writes did not compile')
})

/** Each misuse, with the text the compiler must name when it refuses it. */
const MISUSES: ReadonlyArray<readonly [string, string, string]> = [
  [
    'a text-to-video request without aspectRatio',
    request("    mode: 'text-to-video',"),
    "'aspectRatio'",
  ],
  ['an image-to-video request without an image', request("    mode: 'image-to-video',"), "'image'"],
  [
    'an image-to-video request with an aspectRatio',
    request("    mode: 'image-to-video',\n    image: picture,\n    aspectRatio: '9:16',"),
    "'aspectRatio'",
  ],
  // A fresh literal is checked for excess properties, so the two above would be refused even if the
  // type let a mode carry the other mode's field. A request built first and sent after is not: only
  // the `never` on each mode refuses these (found by breaking it, session 21).
  [
    'an image-to-video request with an aspectRatio, built before it is sent',
    `  const built = { ...fields, mode: 'image-to-video' as const, image: picture, aspectRatio: '9:16' as const }\n  await video.generate(built)`,
    "'aspectRatio'",
  ],
  [
    'a text-to-video request with an image, built before it is sent',
    `  const built = { ...fields, mode: 'text-to-video' as const, aspectRatio: '9:16' as const, image: picture }\n  await video.generate(built)`,
    "'image'",
  ],
  [
    'a reference-to-video mode',
    request("    mode: 'reference-to-video',\n    image: picture,"),
    'reference-to-video',
  ],
  [
    'a resolution other than 768P',
    request(
      "    mode: 'text-to-video',\n    aspectRatio: '9:16',",
      FIELDS.replace("resolution: '768P'", "resolution: '1080P'"),
    ),
    '1080P',
  ],
  [
    'an end image on an image-to-video request',
    request("    mode: 'image-to-video',\n    image: picture,\n    endImage: other,"),
    "'endImage'",
  ],
  [
    'an end image on a text-to-video request',
    request("    mode: 'text-to-video',\n    aspectRatio: '9:16',\n    endImage: other,"),
    "'endImage'",
  ],
  [
    'observe given a clip and a prompt',
    "  await model.observe({ clip, prompt: 'what should this show?', temperature: 0 })",
    "'prompt'",
  ],
  [
    'observe given a clip and a schema',
    '  await model.observe({ clip, schema, temperature: 0 })',
    "'schema'",
  ],
  [
    'observe given a clip and a criterion',
    '  await model.observe({ clip, criterion, temperature: 0 })',
    "'criterion'",
  ],
  [
    'observe given a picture and a clip together',
    '  await model.observe({ picture, clip, temperature: 0 })',
    "'clip'",
  ],
  [
    'observe given a picture and a clip together, built before the call',
    '  const both = { picture, clip, temperature: 0 as const }\n  await model.observe(both)',
    "'clip'",
  ],
  [
    'a clip passed to structured',
    "  await model.structured({ prompt: 'p', schema, role: 'reconciler', temperature: 0, clip })",
    "'clip'",
  ],
  [
    'take ids that are clips, passed to structured',
    "  await model.structured({ prompt: 'p', schema, role: 'reconciler', temperature: 0, takeIds: [clip] })",
    'ClipRef',
  ],
  [
    'judgeCut given a schema',
    "  await model.judgeCut({ shots: [], questions: ['q'], schema, temperature: 0 })",
    "'schema'",
  ],
  [
    'judgeCut given a role',
    "  await model.judgeCut({ shots: [], questions: ['q'], role: 'judge', temperature: 0 })",
    "'role'",
  ],
  [
    'judgeCut given a prompt',
    "  await model.judgeCut({ shots: [], questions: ['q'], prompt: 'p', temperature: 0 })",
    "'prompt'",
  ],
]

test('1. a text-to-video request without aspectRatio, an image-to-video request without an image or with an aspectRatio, a reference-to-video mode, a resolution other than 768P and an end image are each a type error; observe given a clip and a prompt, or a picture and a clip together, and judgeCut given a schema or a role, are each a type error', () => {
  for (const [what, body, named] of MISUSES) {
    const errors = errorsIn(DIR, snippet(body))
    assert.ok(errors.length > 0, `${what} compiled`)
    assert.ok(
      errors.some((e) => e.includes(named)),
      `${what} was refused, but no error names ${named}: ${errors.join(' | ')}`,
    )
  }
})
