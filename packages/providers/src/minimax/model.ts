import { readFile } from 'node:fs/promises'
import { extname } from 'node:path'
import { z } from 'zod'
import type {
  ClipRef,
  LanguageModelPort,
  ModelCall,
  ModelReceipt,
  ModelRole,
  PictureRef,
} from '@cutroom/contracts'
import { visibleText } from '../text.ts'
import { Unavailable, transientStatus } from '../transient.ts'
import { baseOf, baseResp, summary, transientCode } from './wire.ts'

// THE MINIMAX MODEL ADAPTER — the first real adapter this engine has ever had
// (docs/features/paid-path.md, Gate 2 "The five adapters"; checks 6, 7 and 8).
//
// It speaks the wire itself, with `fetch` and `zod` and no SDK (S-114, superseding D-005 for this
// engine): what D-005 bought was a bounded tool loop, and the tool loop is the research episode,
// which belongs to KnowScroll. What is left here is four single structured calls, and the harness
// an SDK would bring — receipts, the budget refusal before every send, the transient counter — is
// already built and verified.
//
// THE WIRE IS THE ONE D-019 VERIFIED LIVE: POST /v1/chat/completions, the OpenAI-compatible
// endpoint, which answered 200 with usage for all three models on 2026-09-03
// (steering-ref/scripts/spikes/minimax-text.mjs, steering-ref/docs/research/spike-results.json).
//
// THREE THINGS D-019 FOUND ARE LOAD-BEARING HERE.
//
//  1. Every model in the family emits a `<think>…</think>` block. The block is stripped before
//     anything is parsed, or every structured call fails as a schema error.
//  2. A call whose token budget is consumed inside that block returns NOTHING AT ALL — the spike's
//     16-token cap did exactly this. That failure is reported by naming the budget, because "the
//     schema did not parse" would be a lie about what happened.
//  3. `max_tokens` therefore budgets for reasoning ON TOP of the answer.
//
// Thinking is not switched off, because nothing has verified a switch for it on this wire. The
// spike sent `model`, `messages`, `max_tokens` and `temperature` and nothing else, and an
// unverified field on a first paid call is the Hermes 404 lesson D-019 records. Gate 2 asks for
// the switch "where the wire allows it"; when one hand-run reel has shown which field this wire
// accepts, it is one line and its own entry. Until then the budget and the strip carry it.
//
// A KEY REACHES ONE PLACE: the Authorization header. It is in no log line, no message, no receipt
// and no detail — nothing here logs, and every error below names the model, the status and the
// request id and nothing else (S-109, D-022).

/** The one path. OpenAI-compatible, and the one the spike answered on (D-019, S-114). */
export const CHAT_PATH = '/v1/chat/completions'

/** What the answer itself may take. A structured plan is the longest thing any call asks for. */
export const DEFAULT_ANSWER_TOKENS = 2048

/**
 * What reasoning may take ON TOP of the answer (D-019). It is deliberately the larger of the two:
 * the failure this guards against is silent — a call that returns an empty string rather than an
 * error — and the cost of a budget that is never reached is nothing at all.
 */
export const DEFAULT_REASONING_TOKENS = 4096

/** How long one call may take before it is unavailable. A vision call carries a whole clip. */
export const DEFAULT_TIMEOUT_MS = 180_000

export interface MinimaxModelOptions {
  /** Read by `packages/providers` and nowhere else (S-109). Sent in one header, written nowhere. */
  key: string
  /** D-006's routing table, read from settings — never a model id spelled at a call site. */
  models: Readonly<Record<ModelRole, string>>
  /** Where the provider is. Defaults to its own; a test points it at recorded wire (S-111). */
  baseUrl?: string
  /** How a request is made. Defaults to this runtime's; a test hands it recorded wire. */
  fetch?: typeof globalThis.fetch
  timeoutMs?: number
  answerTokens?: number
  reasoningTokens?: number
}

// ---------------------------------------------------------------- the wire

/**
 * What comes back. Everything but `choices` is optional, because a body that is otherwise the wire
 * and is missing a count is an answer we can still use; a body that carries no choice is not.
 */
const completion = z.object({
  id: z.string().optional(),
  model: z.string().optional(),
  choices: z
    .array(
      z.object({
        finish_reason: z.string().nullish(),
        message: z.object({
          content: z.string().nullish(),
          /** Some models put the reasoning here instead of inside the content (D-019). */
          reasoning_content: z.string().nullish(),
        }),
      }),
    )
    .min(1),
  usage: z
    .object({
      prompt_tokens: z.number().optional(),
      completion_tokens: z.number().optional(),
      total_tokens: z.number().optional(),
      completion_tokens_details: z.object({ reasoning_tokens: z.number().optional() }).optional(),
      prompt_tokens_details: z.object({ cached_tokens: z.number().optional() }).optional(),
    })
    .optional(),
  /** MiniMax reports its own outcome here, even under HTTP 200 (./wire.ts). */
  base_resp: baseResp.optional(),
})

type Completion = z.infer<typeof completion>

/** A content part: text, a picture, or a clip. */
type Part =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } }
  | { type: 'video_url'; video_url: { url: string } }

/** What one file is called on the wire. Unknown suffixes are sent as what the call asked for. */
function mediaType(path: string, fallback: string): string {
  const known: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mov': 'video/quicktime',
  }
  return known[extname(path).toLowerCase()] ?? fallback
}

/** A file on this machine, carried as its own bytes: the provider can fetch nothing from here. */
async function dataUrl(path: string, fallback: string): Promise<string> {
  const bytes = await readFile(path)
  return `data:${mediaType(path, fallback)};base64,${bytes.toString('base64')}`
}

const picturePart = async (picture: PictureRef): Promise<Part> => ({
  type: 'image_url',
  image_url: { url: await dataUrl(picture.path, 'image/png') },
})

const clipPart = async (clip: ClipRef): Promise<Part> => ({
  type: 'video_url',
  video_url: { url: await dataUrl(clip.path, 'video/mp4') },
})

const textPart = (text: string): Part => ({ type: 'text', text })

// ---------------------------------------------------------------- the fixed questions (I-8)

// The three calls that carry a picture or a clip carry NO PROMPT, NO SCHEMA AND NO CRITERION: the
// question and the shape of the answer are fixed here, inside the adapter, because a free prompt
// beside an image is a field a gate's brief could be written into (I-8, D-042, S-037).
//
// The schemas below are used for ONE thing: to ask for the answer's shape through
// `response_format`. They never parse an answer. An observation is parsed by the pipeline at the
// gate boundary, which is where a malformed one must be caught (D-041, S-042) — an adapter that
// parsed it here would make that path unreachable.

const observedEntity = z.object({
  label: z.string(),
  count: z.number().int(),
  position: z.enum(['left', 'centre', 'right']),
  prominence: z.enum(['foreground', 'midground', 'background']),
  faceVisible: z.enum(['yes', 'partial', 'no', 'noFace']),
  occluded: z.boolean(),
  clippedByEdge: z.boolean(),
})

/** D-041's fields as D-044 amended them — a still's observation. */
const observationShape = z.object({
  entities: z.array(observedEntity),
  framing: z.enum(['closeUp', 'medium', 'wide', 'extremeWide']),
  setting: z.string(),
  lighting: z.enum(['bright', 'dim', 'mixed', 'silhouette']),
  readableTextPresent: z.boolean(),
  ambiguities: z.array(z.string()),
  unsafeDepictions: z.array(z.string()),
})

/** The same fields and the temporal block a clip has and a still does not (D-041, D-053, S-072). */
const clipObservationShape = observationShape.extend({
  actions: z.array(z.object({ entity: z.string(), verb: z.string(), completes: z.boolean() })),
  eventOrder: z.array(z.string()),
})

/** Gate 1S's closed question: every shared subject, by name, once (S-045). */
const compareShape = z.object({
  subjects: z.array(z.object({ subject: z.string(), same: z.enum(['yes', 'no']) })),
})

/** Gate 7's closed questions: every question, by its words, once (S-074). */
const cutShape = z.object({
  answers: z.array(z.object({ question: z.string(), answer: z.enum(['yes', 'no']) })),
})

const OBSERVE_QUESTION = [
  'Describe only what is in this picture. You have not been told what it is meant to show, and',
  'nothing you have been told about it exists: describe it as a stranger would.',
  'Name every entity you can see in your own words, with how many there are, where it sits, how',
  'prominent it is, whether a face is visible, whether it is occluded, and whether any part of it',
  'is cut off by the edge of the frame.',
  'Then give the framing, the setting, the lighting, whether any readable text is present, anything',
  'you are unsure of, and anything depicted that is unsafe.',
].join('\n')

const OBSERVE_CLIP_QUESTION = [
  'Describe only what is in this clip. You have not been told what it is meant to show, and',
  'nothing you have been told about it exists: describe it as a stranger would.',
  'Name every entity you can see in your own words, with how many there are, where it sits, how',
  'prominent it is, whether a face is visible, whether it is occluded, and whether any part of it',
  'is cut off by the edge of the frame.',
  'Then give the framing, the setting, the lighting, whether any readable text is present, anything',
  'you are unsure of, and anything depicted that is unsafe.',
  'Then list what happens: each action, which entity does it, and whether it completes within the',
  'clip; and the order the events happen in.',
].join('\n')

const COMPARE_QUESTION = [
  'Two pictures follow, in order: the first is the canonical, the second is derived from it.',
  'For each subject named below, answer whether it is the same thing in both pictures.',
  'Answer yes or no for every subject named, by its name, once each, and for no other.',
].join('\n')

/**
 * Gate 1's text step, role `witness` (D-042, S-112, S-126). It asks for the words themselves, not
 * for whether there are any: `readableTextPresent` is already the witness's, and a step that
 * answered only yes or no would not be the text step Gate 1 names.
 */
export const READ_TEXT_QUESTION = [
  'Read the text in this picture. You have not been told what it is meant to show, and nothing',
  'you have been told about it exists.',
  'List every string of characters that is legible to a reader, exactly as it is written, once',
  'each. Include text on signs, labels, screens, paper and clothing.',
  'Do not describe the picture, do not translate, and do not guess at text that is not legible.',
  'If nothing is legible, the list is empty.',
].join('\n')

const CUT_QUESTION = [
  'A finished cut follows, shot by shot in timeline order: each shot with the sentences said over',
  'it and the frames cut from it.',
  'Answer each of the questions below about the cut as a whole, yes or no, by its exact words,',
  'once each, and for no other.',
].join('\n')

// ---------------------------------------------------------------- the reasoning block

/** A reasoning block that was closed, at the start of the content (D-019). */
const CLOSED_THINK = /^\s*<think>[\s\S]*?<\/think>/
/** A reasoning block that was cut off mid-thought, which is what an exhausted budget looks like. */
const OPEN_THINK = /^\s*<think>/

/**
 * The answer, with the reasoning prefix removed. An unterminated block means the budget ran out
 * inside it, so nothing is left — which the caller turns into the budget's failure, not a schema's.
 */
export function answerAfterReasoning(content: string): string {
  if (CLOSED_THINK.test(content)) return content.replace(CLOSED_THINK, '').trim()
  if (OPEN_THINK.test(content)) return ''
  return content.trim()
}

// ---------------------------------------------------------------- the adapter

export function minimaxModel(options: MinimaxModelOptions): LanguageModelPort {
  const base = baseOf(options.baseUrl)
  const send = options.fetch ?? globalThis.fetch
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const answerTokens = options.answerTokens ?? DEFAULT_ANSWER_TOKENS
  const reasoningTokens = options.reasoningTokens ?? DEFAULT_REASONING_TOKENS
  const maxTokens = answerTokens + reasoningTokens

  /** The shape asked for. A schema that cannot be rendered asks for JSON and says so in nothing. */
  function responseFormat(schema: z.ZodType<unknown>, name: string): Record<string, unknown> {
    try {
      const json = z.toJSONSchema(schema, { io: 'input', unrepresentable: 'any' })
      return { type: 'json_schema', json_schema: { name, schema: json, strict: false } }
    } catch {
      return { type: 'json_object' }
    }
  }

  /**
   * One call, sent and classified.
   *
   * Everything that is not an answer is turned into one of two things here and nowhere else:
   * `Unavailable`, which the provider may answer differently if it is asked again, or a thrown
   * `Error`, which it will not (S-096). The adapter does not send again, wait or count — that is
   * the worker's guarded ports', and for the model port it is not built (see ../transient.ts).
   */
  async function post(body: Record<string, unknown>, role: ModelRole): Promise<Completion> {
    const model = String(body.model)
    let response: Response
    try {
      response = await send(`${base}${CHAT_PATH}`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${options.key}`,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      })
    } catch (error) {
      // Nothing reached the provider, or nothing came back in time. Either way it made nothing.
      const reason = error instanceof Error ? error.message : String(error)
      // `AbortSignal.timeout` aborts with a `TimeoutError`; an abort from anywhere else is an
      // `AbortError`. Neither is reliably an `Error` subclass across runtimes, so the name is read
      // off the thrown thing rather than through `instanceof`.
      const name = (error as { name?: unknown })?.name
      const aborted = name === 'TimeoutError' || name === 'AbortError'
      throw new Unavailable(
        aborted
          ? `the ${role} call to ${model} answered nothing within ${timeoutMs} ms`
          : `the ${role} call to ${model} did not reach the provider: ${reason}`,
      )
    }

    const text = await response.text()
    if (!response.ok) {
      const detail = `the ${role} call to ${model} was answered ${response.status} ${summary(text)}`
      if (transientStatus(response.status)) throw new Unavailable(detail)
      throw new Error(detail)
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(text)
    } catch {
      throw new Error(
        `the ${role} call to ${model} was answered 200 with a body that is not JSON: ${summary(text)}`,
      )
    }
    const answer = completion.safeParse(parsed)
    if (!answer.success) {
      throw new Error(
        `the ${role} call to ${model} was answered 200 with a body that is not this wire: ` +
          answer.error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join('; '),
      )
    }

    // MiniMax reports its own outcome even under 200, so a busy provider can arrive either way.
    const status = answer.data.base_resp
    if (status !== undefined && status.status_code !== 0) {
      const detail = `the ${role} call to ${model} was refused by the provider: ${status.status_code} ${status.status_msg}`
      if (transientCode(status.status_code)) throw new Unavailable(detail)
      throw new Error(detail)
    }
    return answer.data
  }

  /**
   * The text of the answer, or the budget's failure — never the schema's.
   *
   * D-019: _"A schema call that 'returns nothing' will be this, not a schema failure."_ So a call
   * that came back with nothing left after its reasoning names what it spent and what it was
   * given, and says nothing about a schema.
   */
  function answerOf(answer: Completion, role: ModelRole, model: string): string {
    const choice = answer.choices[0]
    const content = choice?.message.content ?? ''
    const text = answerAfterReasoning(content)
    if (text !== '') return text

    const spent = answer.usage?.completion_tokens
    const reasoned = answer.usage?.completion_tokens_details?.reasoning_tokens
    const finish = choice?.finish_reason ?? undefined
    throw new Error(
      `the ${role} call to ${model} answered with reasoning and no answer: ` +
        `${spent ?? 'an unreported number of'} completion tokens` +
        (reasoned === undefined ? '' : ` (of which ${reasoned} reasoning)`) +
        ` against a max_tokens of ${maxTokens}` +
        (finish === undefined ? '' : `, finishing on ${finish}`) +
        `. This is the token budget, not the answer's shape: raise the reasoning allowance (D-019).`,
    )
  }

  /** What the answer parses to. The shape is the caller's business, or the gate's (S-042). */
  function jsonOf(text: string, role: ModelRole, model: string): unknown {
    try {
      return JSON.parse(text)
    } catch {
      throw new Error(
        `the ${role} call to ${model} answered something that is not JSON: ${summary(text)}`,
      )
    }
  }

  /** Every receipt: the model asked for, the tokens, and `fake: false` (D-005, D-006, S-036). */
  const receiptOf = (
    role: ModelRole,
    call: ModelCall,
    temperature: number,
    answer: Completion,
    about: { pictureIds?: readonly string[]; takeIds?: readonly string[] },
  ): ModelReceipt => ({
    model: options.models[role],
    role,
    call,
    temperature,
    usage: {
      inputTokens: answer.usage?.prompt_tokens ?? 0,
      outputTokens: answer.usage?.completion_tokens ?? 0,
    },
    fake: false,
    pictureIds: about.pictureIds ?? [],
    takeIds: about.takeIds ?? [],
  })

  /** One call with a message built here, answered as an unparsed value (S-042). */
  async function ask(
    role: ModelRole,
    call: ModelCall,
    temperature: number,
    parts: readonly Part[],
    shape: z.ZodType<unknown>,
    name: string,
    about: { pictureIds?: readonly string[]; takeIds?: readonly string[] },
  ): Promise<{ value: unknown; receipt: ModelReceipt }> {
    const model = options.models[role]
    const answer = await post(
      {
        model,
        messages: [{ role: 'user', content: parts }],
        max_tokens: maxTokens,
        temperature,
        response_format: responseFormat(shape, name),
      },
      role,
    )
    const value = jsonOf(answerOf(answer, role, model), role, model)
    return { value, receipt: receiptOf(role, call, temperature, answer, about) }
  }

  return {
    async structured(call) {
      const model = options.models[call.role]
      // The prompt is the pipeline's, sent verbatim: it is built from its inputs alone, so the
      // same inputs ask the same thing and a call at temperature 0 replays.
      const answer = await post(
        {
          model,
          messages: [{ role: 'user', content: call.prompt }],
          max_tokens: maxTokens,
          temperature: call.temperature,
          response_format: responseFormat(call.schema as z.ZodType<unknown>, 'answer'),
        },
        call.role,
      )
      const text = answerOf(answer, call.role, model)
      const value = call.schema.parse(jsonOf(text, call.role, model))
      return {
        value,
        receipt: receiptOf(call.role, 'structured', call.temperature, answer, {
          pictureIds: call.pictureIds ?? [],
          takeIds: call.takeIds ?? [],
        }),
      }
    },

    async observe(call) {
      if (call.clip === undefined) {
        return ask(
          'witness',
          'observe',
          call.temperature,
          [textPart(OBSERVE_QUESTION), await picturePart(call.picture)],
          observationShape,
          'observation',
          { pictureIds: [call.picture.pictureId] },
        )
      }
      return ask(
        'witness',
        'observe',
        call.temperature,
        [textPart(OBSERVE_CLIP_QUESTION), await clipPart(call.clip)],
        clipObservationShape,
        'clipObservation',
        { takeIds: [call.clip.takeId] },
      )
    },

    async compare(call) {
      const subjects = call.subjects.map((name) => `- ${name}`).join('\n')
      return ask(
        'judge',
        'compare',
        call.temperature,
        [
          textPart(`${COMPARE_QUESTION}\n${subjects}`),
          await picturePart(call.pictures[0]),
          await picturePart(call.pictures[1]),
        ],
        compareShape,
        'comparison',
        { pictureIds: call.pictures.map((p) => p.pictureId) },
      )
    },

    async judgeCut(call) {
      const questions = call.questions.map((q) => `- ${q}`).join('\n')
      const parts: Part[] = [textPart(`${CUT_QUESTION}\n${questions}`)]
      for (const shot of call.shots) {
        parts.push(
          textPart(
            [
              `Shot ${shot.shotId}. What is said over it:`,
              ...shot.sentences.map((s) => `  ${JSON.stringify(s)}`),
              `Its ${shot.frames.length} frame(s), in order:`,
            ].join('\n'),
          ),
        )
        for (const frame of shot.frames) parts.push(await picturePart(frame))
      }
      return ask('judge', 'judgeCut', call.temperature, parts, cutShape, 'cut', {
        pictureIds: call.shots.flatMap((s) => s.frames.map((f) => f.pictureId)),
      })
    },

    async readText(call) {
      // Gate 1's text step, the fifth call (S-112, S-126). One picture, the adapter's own
      // question, and the answer returned UNPARSED — the sensor turns it into `string[]`, and an
      // answer that is not this shape is a failed step there (check 19).
      return ask(
        'witness',
        'readText',
        call.temperature,
        [textPart(READ_TEXT_QUESTION), await picturePart(call.picture)],
        visibleText,
        'visibleText',
        { pictureIds: [call.picture.pictureId] },
      )
    },
  }
}
