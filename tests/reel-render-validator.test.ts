import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { PictureRef, VideoAnswer, VideoPort, VideoRequest } from '@cutroom/contracts'
import { NEGATIVE_AUDIO, validateVideoRequest } from '@cutroom/pipeline'
import { validatingVideoPort } from '@cutroom/worker'

// reel-render, Slice 1 — check 6 (docs/features/reel-render.md): the validator at the video port's
// boundary (D-008, D-071, I-19, S-071).
//
// Both rules are silent when broken — the clip still generates, and only looks or sounds wrong — so
// a template in the prompt composer is not enough: the next call site forgets it (D-071). The worker's
// video port runs the validator before the port it wraps, and REFUSES by throwing. A validator that
// only flagged, or that ran after the call, would leave the wrapped port called; so this check hands
// the wrapper a port that records every call and asserts it received none.
//
// The type already refuses a text-to-video request without its ratio (check 1). A request built from
// a value typed `any` is what the type cannot see, so the refused requests here are cast.

const picture: PictureRef = { pictureId: 'a1-shot-0-a', path: 'artifacts/run-1/a1-shot-0-a.png' }

const PROMPT = ['quiet, precise, natural light', 'A river at dawn.', NEGATIVE_AUDIO].join('\n')

function fields(takeId: string, prompt = PROMPT) {
  return {
    runId: 'run-1',
    takeId,
    prompt,
    durationSeconds: 8,
    resolution: '768P' as const,
    seed: 1,
    promptExpansionMode: 'balanced',
  }
}

const fromPicture = (prompt?: string): VideoRequest => ({
  ...fields('a1-shot-0-take-1', prompt),
  mode: 'image-to-video',
  image: picture,
})
const fromWords = (prompt?: string): VideoRequest => ({
  ...fields('a1-shot-1-take-1', prompt),
  mode: 'text-to-video',
  aspectRatio: '9:16',
})

/** A video port that answers `made` and keeps every request it received. */
function recording(): VideoPort & { calls: VideoRequest[] } {
  const calls: VideoRequest[] = []
  return {
    calls,
    async generate(request): Promise<VideoAnswer> {
      calls.push(request)
      return {
        kind: 'made',
        clip: { takeId: request.takeId, path: `artifacts/${request.runId}/${request.takeId}.mp4` },
        receipt: {
          model: 'stand-in',
          requestId: 'r',
          costCents: 0,
          fake: true,
          expandedPrompt: '',
        },
      }
    },
  }
}

// ---------------------------------------------------------------- 6

test("6. the negative audio block is D-008's two lines", () => {
  assert.equal(NEGATIVE_AUDIO, 'No dialogue, no speech, no music.\nnon_diegetic_music: N/A')
})

test("6. the validator refuses a video request whose prompt lacks the negative audio block, and a text-to-video request without aspectRatio 9:16 — the worker's video port throws, and a recording port it wraps receives no call", async () => {
  const [firstLine, secondLine] = NEGATIVE_AUDIO.split('\n') as [string, string]
  const withoutBlock = PROMPT.replace(NEGATIVE_AUDIO, '').trimEnd()
  const refused: ReadonlyArray<readonly [string, VideoRequest, RegExp]> = [
    ['an image-to-video prompt with no audio block', fromPicture(withoutBlock), /negative audio/i],
    ['a text-to-video prompt with no audio block', fromWords(withoutBlock), /negative audio/i],
    [
      "a prompt with only the block's first line",
      fromPicture(PROMPT.replace(NEGATIVE_AUDIO, firstLine)),
      /negative audio/i,
    ],
    [
      "a prompt with only the block's second line",
      fromWords(PROMPT.replace(NEGATIVE_AUDIO, secondLine)),
      /negative audio/i,
    ],
    [
      'a text-to-video request with no aspectRatio',
      (() => {
        const r: Record<string, unknown> = { ...fromWords() }
        delete r.aspectRatio
        return r as unknown as VideoRequest
      })(),
      /9:16/,
    ],
    [
      'a text-to-video request asking for 16:9',
      { ...fromWords(), aspectRatio: '16:9' } as unknown as VideoRequest,
      /9:16/,
    ],
    [
      'a request of no known mode, with no image and no aspectRatio',
      { ...fields('a1-shot-2-take-1'), mode: 'reference-to-video' } as unknown as VideoRequest,
      /9:16/,
    ],
  ]

  for (const [what, request, why] of refused) {
    const reasons = validateVideoRequest(request)
    assert.ok(reasons.length > 0, `the validator passed ${what}`)
    assert.ok(
      reasons.some((r) => why.test(r)),
      `the validator refused ${what}, but for another reason: ${reasons.join(' | ')}`,
    )

    const inner = recording()
    const port = validatingVideoPort(inner)
    await assert.rejects(
      port.generate(request),
      why,
      `the worker's video port did not throw on ${what}`,
    )
    assert.equal(inner.calls.length, 0, `the port the worker wraps was called with ${what}`)
  }

  // Both wrong at once: both reasons are given, so a run's detail says everything that was wrong.
  const both = {
    ...fields('a1-shot-3-take-1', withoutBlock),
    mode: 'text-to-video',
  } as unknown as VideoRequest
  const reasons = validateVideoRequest(both)
  assert.ok(
    reasons.some((r) => /negative audio/i.test(r)),
    reasons.join(' | '),
  )
  assert.ok(
    reasons.some((r) => /9:16/.test(r)),
    reasons.join(' | '),
  )
})

test("6. the validator passes a request carrying both, and the worker's video port passes it on unchanged", async () => {
  for (const request of [fromPicture(), fromWords()]) {
    assert.deepEqual(validateVideoRequest(request), [], `the validator refused ${request.mode}`)

    const inner = recording()
    const answer = await validatingVideoPort(inner).generate(request)
    assert.deepEqual(
      inner.calls,
      [request],
      `the wrapped port did not receive the ${request.mode} request`,
    )
    assert.equal(answer.kind, 'made', `the ${request.mode} answer was not passed back`)
  }
})
