import assert from 'node:assert/strict'
import { join } from 'node:path'
import { test } from 'node:test'
import { REPO } from './_repo.ts'
import { errorsIn } from './engine/compile.ts'

// reel-takes, Slice 1 — check 1 (docs/features/reel-takes.md): a take's number and the ports' new
// answer, compiled by TypeScript here (D-024, I-11, S-094, S-096).
//
// A shot gets three takes, counted when decided (D-024, S-094), so a take's number is 1, 2 or 3 and
// nothing else — never 0, never a fourth. A provider that fails for a moment answers `unavailable`
// with a detail (S-096), on the video port and on the narration port alike, and that answer carries
// nothing else: no budget figure, since only the guard answers `refused` (S-035), and no type a
// caller would read is declared outside @cutroom/reel-contract (D-094).
//
// ONE FIELD WAS ADDED TO THE VIDEO ARM, AND THE ASSERTION IS STILL EXACT (S-143, paid-failures).
// `spent` is optional, is a `LostCall`, and exists for one case: a clip fal made and billed, whose
// DOWNLOAD was then answered 429 or 5xx. S-125 re-buys that clip, so without the field the run pays
// twice and the budget guard sees one of the two payments. It carries no clip, no take and no
// receipt — what it carries is what was already spent. **The narration arm is unchanged**, exactly
// a kind and a detail, because T2A is plan-covered and its re-buy costs nothing (S-123, S-129); and
// a THIRD key on either arm still fails this check.

const CONTRACTS = '../../packages/contracts/src/index.ts'

/** Where a snippet pretends to live: inside the repository, so its relative imports resolve. */
const DIR = join(REPO, '.tmp', `takes-ports-${process.pid}`)

const PREAMBLE = [
  'import type {',
  '  LostCall,',
  '  NarrationAnswer,',
  '  NarrationPort,',
  '  TakeNumber,',
  '  TakeRecord,',
  '  VideoAnswer,',
  '  VideoPort,',
  `} from '${CONTRACTS}'`,
  '',
  'declare const take: TakeRecord',
  'declare const video: VideoPort',
  'declare const narration: NarrationPort',
  '/** True only when A and B are the same type. */',
  'type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false',
  "type VideoUnavailable = Extract<VideoAnswer, { kind: 'unavailable' }>",
  "type NarrationUnavailable = Extract<NarrationAnswer, { kind: 'unavailable' }>",
  '',
].join('\n')

const snippet = (body: string) =>
  `${PREAMBLE}export async function call(): Promise<void> {\n${body}\n}\n`

// ---------------------------------------------------------------- 1

const CHECK_1 =
  '1. compiled by TypeScript in the test: a take record whose number is 0 or 4 is a type error and 1, 2 and 3 compile; and a video and a narration answer of kind unavailable carry a detail and nothing else'

test(`${CHECK_1} — what compiles, each answer having exactly a kind and a detail`, () => {
  const legal = snippet(
    [
      '  const one: TakeRecord = { ...take, number: 1 }',
      '  const two: TakeRecord = { ...take, number: 2 }',
      '  const three: TakeRecord = { ...take, number: 3 }',
      '  const numbers: TakeNumber[] = [1, 2, 3]',
      "  const clip: VideoAnswer = { kind: 'unavailable', detail: 'the provider is busy' }",
      "  const voice: NarrationAnswer = { kind: 'unavailable', detail: 'the provider is busy' }",
      // What each port may answer: the new answer is among them, read off the ports themselves.
      "  const fromVideo: VideoUnavailable = { kind: 'unavailable', detail: 'x' }",
      "  const answered: Awaited<ReturnType<VideoPort['generate']>> = fromVideo",
      "  const fromNarration: NarrationUnavailable = { kind: 'unavailable', detail: 'x' }",
      "  const spoken: Awaited<ReturnType<NarrationPort['speak']>> = fromNarration",
      // A kind and a detail, and nothing else: an answer built before it is used is not checked for
      // excess properties, so the members' own keys are compared.
      "  const videoKeys: Same<keyof VideoUnavailable, 'kind' | 'detail' | 'spent'> = true",
      "  const narrationKeys: Same<keyof NarrationUnavailable, 'kind' | 'detail'> = true",
      // `spent` is OPTIONAL — every other unavailable answer has none — and it is a `LostCall`,
      // the shape the worker writes a `lost_call` row from (S-142, S-143).
      "  const videoSpentOptional: Same<VideoUnavailable, { kind: 'unavailable'; detail: string; spent?: LostCall }> = true",
      "  const videoSpent: Same<VideoUnavailable['spent'], LostCall | undefined> = true",
      "  const videoDetail: Same<VideoUnavailable['detail'], string> = true",
      "  const narrationDetail: Same<NarrationUnavailable['detail'], string> = true",
      "  const made = await video.generate({ runId: 'r', takeId: 'a1-shot-0-take-1', prompt: 'p', durationSeconds: 5, resolution: '768P', seed: 1, promptExpansionMode: 'balanced', mode: 'text-to-video', aspectRatio: '9:16' })",
      "  if (made.kind === 'unavailable') void made.detail.length",
      "  const said = await narration.speak({ runId: 'r', narrationId: 'a1-shot-0-narration', text: 't', voice: 'v' })",
      "  if (said.kind === 'unavailable') void said.detail.length",
      '  void [one, two, three, numbers, clip, voice, answered, spoken]',
      '  void [videoKeys, narrationKeys, videoDetail, narrationDetail]',
      '  void [videoSpentOptional, videoSpent]',
    ].join('\n'),
  )
  assert.deepEqual(
    errorsIn(DIR, legal),
    [],
    'a take numbered 1 to 3, or an unavailable answer, did not compile',
  )
})

/** Each misuse, with the text the compiler must name when it refuses it. */
const MISUSES: ReadonlyArray<readonly [string, string, string]> = [
  [
    'a take record numbered 0',
    '  const t: TakeRecord = { ...take, number: 0 }\n  void t',
    "'number'",
  ],
  [
    'a take record numbered 4',
    '  const t: TakeRecord = { ...take, number: 4 }\n  void t',
    "'number'",
  ],
  [
    'a take record whose number is any number',
    '  const n: number = 2\n  const t: TakeRecord = { ...take, number: n }\n  void t',
    "'number'",
  ],
  ['a take number of 4', '  const n: TakeNumber = 4\n  void n', "'n'"],
  [
    'a video answer of kind unavailable with no detail',
    "  const a: VideoAnswer = { kind: 'unavailable' }\n  void a",
    "'detail'",
  ],
  [
    'a narration answer of kind unavailable with no detail',
    "  const a: NarrationAnswer = { kind: 'unavailable' }\n  void a",
    "'detail'",
  ],
  [
    'a video answer of kind unavailable whose detail is not text',
    "  const a: VideoAnswer = { kind: 'unavailable', detail: 500 }\n  void a",
    "'detail'",
  ],
  [
    'a video answer of kind unavailable carrying a budget figure',
    "  const a: VideoAnswer = { kind: 'unavailable', detail: 'x', estimateCents: 1 }\n  void a",
    "'estimateCents'",
  ],
  [
    'a narration answer of kind unavailable carrying a budget limit',
    "  const a: NarrationAnswer = { kind: 'unavailable', detail: 'x', limit: 'reel' }\n  void a",
    "'limit'",
  ],
  [
    'a video answer of kind unavailable carrying a clip',
    "  const a: VideoAnswer = { kind: 'unavailable', detail: 'x', clip: { takeId: 't', path: 'p' } }\n  void a",
    "'clip'",
  ],
]

test(`${CHECK_1} — what is refused, each misuse named`, () => {
  for (const [what, body, named] of MISUSES) {
    const errors = errorsIn(DIR, snippet(body))
    assert.ok(errors.length > 0, `${what} compiled`)
    assert.ok(
      errors.some((e) => e.includes(named)),
      `${what} was refused, but no error names ${named}: ${errors.join(' | ')}`,
    )
  }
})
