import { readFile } from 'node:fs/promises'
import { extname } from 'node:path'
import { z } from 'zod'
import {
  answerRefusal,
  clipObservation,
  refusalsOf,
  witnessObservation,
  type ClipRef,
  type LanguageModelPort,
  type ModelCall,
  type ModelReceipt,
  type ModelRole,
  type PictureRef,
  type Refusals,
} from '@cutroom/contracts'
import { visibleText } from '../text.ts'
import { Spent, Unavailable, isSpent, messageOf, transientStatus } from '../transient.ts'
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
// Thinking is not switched off, AND NOW THAT IS MEASURED RATHER THAN UNVERIFIED (S-135). Gate 2
// asks for the switch "where the wire allows it"; four candidate fields were each answered 200
// with a `<think>` block still in the content, so THIS WIRE DOES NOT ALLOW IT. The budget and the
// strip carry it, and they are what the three findings above are about.
//
// A KEY REACHES ONE PLACE: the Authorization header. It is in no log line, no message, no receipt
// and no detail — nothing here logs, and every error below names the model, the status and the
// request id and nothing else (S-109, D-022).

/** The one path. OpenAI-compatible, and the one the spike answered on (D-019, S-114). */
export const CHAT_PATH = '/v1/chat/completions'

/**
 * What the answer itself may take.
 *
 * **NOT A PLAN — AN OBSERVATION IS THE LONGEST THING ANY CALL ASKS FOR** (S-140). The comment
 * here used to say a structured plan was, and 2048 was set for that. Measured on a real reel,
 * 23¢ in: a witness describing one picture listed its entities with a `label` in its own words
 * each, and **ran out mid-JSON** — the answer was cut off, not absent, so it read as a malformed
 * body rather than as the budget it was. A picture with a dozen entities is several times a
 * plan's length.
 */
export const DEFAULT_ANSWER_TOKENS = 8192

/**
 * What reasoning may take ON TOP of the answer (D-019). It is deliberately the larger of the two:
 * the failure this guards against is silent — a call that returns an empty string rather than an
 * error — and the cost of a budget that is never reached is nothing at all.
 *
 * **4096 WAS NOT ENOUGH, MEASURED ON A REAL REEL** (S-135). A planning call spent the whole
 * 6144 inside its reasoning block and answered nothing, finishing on `length` — exactly D-019's
 * third finding, reported by naming the budget as this adapter was built to. The same call
 * measured with room spends **2405 and 3131 completion tokens** for the eight-unit and four-unit
 * groupings, so the blow-out is the TAIL and not the median: a budget set near the median stops
 * a reel that is otherwise finished, at whatever it has already spent. This is set for the tail.
 *
 * **Thinking cannot be switched off on this wire, and that is measured rather than assumed.**
 * Gate 2 asks for the switch "where the wire allows it"; `reasoning_effort: 'minimal'`,
 * `thinking: { type: 'disabled' }`, `enable_thinking: false` and
 * `chat_template_kwargs: { enable_thinking: false }` were each answered **200 with a `<think>`
 * block still in the content**. The wire does not allow it — the third field it accepts and
 * ignores in two days (S-129, S-130).
 */
export const DEFAULT_REASONING_TOKENS = 24576

/**
 * How long one call may take before it is unavailable. A vision call carries a whole clip.
 *
 * **IT HAS TO COVER THE TOKEN BUDGET THE CALL IS GRANTED, or the budget is a lie** (S-137).
 * 180 s was set beside a `max_tokens` of 6144; S-135 raised that to 26624, and a model emitting
 * four times as many tokens needs the time to emit them. Measured: with the larger budget, a
 * reconciler call answered **nothing within 180 s** and the run stopped — a transient, correctly
 * classified, on a call that was doing exactly what it had been allowed to do.
 */
export const DEFAULT_TIMEOUT_MS = 600_000

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

/**
 * The words the rendered schema is appended to the message under (S-130). A constant rather than
 * a string spelled twice, so a check asserts the thing that is sent and not a copy of it (S-129's
 * `SUBTITLE_TYPE`, the same rule).
 *
 * It says the FIELD NAMES because that is what this wire got wrong: the shape was right and every
 * name was invented.
 */
export const SHAPE_PREFACE = [
  'Answer with a JSON object of your own, never with the schema below and never any part of it.',
  'That object must match this JSON Schema exactly, including every field name in it:',
].join('\n')

/**
 * The words the closed sets of a VISION call's shape are said under (S-144).
 *
 * The enum renders — `shapeAsked` puts the whole JSON Schema in the message, and every closed set
 * in it carries its values — and **that was measured not to be enough**. On the clip a run of
 * 2026-09-22 died on, fourteen observation calls at temperature 0 answered `position` and
 * `lighting` OUTSIDE their sets twice: `"scattered between the tall pillars"`, `"bottom half"`,
 * `"top"`. They are not synonyms or spellings — they are the model preferring a more precise thing
 * to say over the set it was given, which no rendering forbids and only the question can.
 *
 * The line is built FROM the shape, never typed beside it: a set that gains a value gains the
 * sentence (S-124, S-127, S-130's rule).
 */
export const CLOSED_SETS_PREFACE =
  'Some of these fields take one of a fixed set of values, and nothing else is an answer. Give ' +
  'the value from the set even when a more exact description of what you see is available, and ' +
  'put that description in `ambiguities` instead:'

/**
 * Every closed set in one rendered shape, as lines a reader and a model both read the same way:
 * `position: exactly one of "left", "centre", "right"`. Nested objects are walked, so an entity's
 * fields are named by their path; a shape with no closed set says nothing at all.
 */
export function closedSetsSaid(schema: z.ZodType<unknown>): string | undefined {
  let json: unknown
  try {
    json = z.toJSONSchema(schema, { io: 'input', unrepresentable: 'any' })
  } catch {
    return undefined
  }
  const lines: string[] = []
  const walk = (node: unknown, path: readonly string[]): void => {
    if (typeof node !== 'object' || node === null) return
    const at = node as Record<string, unknown>
    if (Array.isArray(at.enum) && path.length > 0) {
      lines.push(
        `- ${path.join('.')}: exactly one of ${at.enum.map((v) => JSON.stringify(v)).join(', ')}`,
      )
      return
    }
    if (at.items !== undefined) walk(at.items, path)
    const properties = at.properties
    if (typeof properties === 'object' && properties !== null) {
      for (const [name, child] of Object.entries(properties as Record<string, unknown>)) {
        walk(child, [...path, name])
      }
    }
  }
  walk(json, [])
  return lines.length === 0 ? undefined : [CLOSED_SETS_PREFACE, ...lines].join('\n')
}

/**
 * What an answer that is the SCHEMA rather than an instance of it looks like (S-136).
 *
 * Measured once, on a real reel: the planner answered with the rendered schema document itself.
 * Twelve probe calls afterwards — six under each wording of `SHAPE_PREFACE` — never reproduced
 * it, so it is a tail event and the wording is not what is relied on. What IS relied on is that
 * when it happens the refusal says so: `jsonOf`'s "answered something that is not JSON" was a
 * true sentence about a truncated echo and a confusing one to read, because the thing quoted
 * after it was plainly JSON.
 */
const SCHEMA_ECHO = ['$schema', '"properties"', '"additionalProperties"']

export function echoedTheSchema(text: string): boolean {
  return SCHEMA_ECHO.some((mark) => text.includes(mark))
}

/**
 * THE RENDERING WITH EVERY BOOLEAN SCHEMA REMOVED (S-131).
 *
 * JSON Schema 2020-12 lets a schema BE a boolean, and zod uses it: a `z.tuple` of four renders
 * `"items": false` beside `prefixItems`, meaning "and no more than these". **MiniMax's own
 * parser expects an object wherever a schema may sit and refuses the WHOLE REQUEST with 400** —
 * `Mismatch type open_platform_oai.CCv2GlyphProperties with value bool` — on M3 and M2.7 alike,
 * measured 2026-09-22. The reel's scoring call is a four-answer tuple, so every real run reached
 * it and stopped there.
 *
 * Dropping it loses nothing that is said elsewhere: `"items": false` beside `prefixItems` and
 * `maxItems: 4` says what `maxItems` already says, and the pipeline's own schema — which is what
 * actually parses the answer — is untouched, so nothing about what is ACCEPTED moves. This is a
 * rendering for one provider's parser, and it lives in that provider's adapter.
 *
 * **`additionalProperties` IS KEPT, although it is a boolean too.** It was measured accepted by
 * the same parser in the same session, and it is load-bearing in the other direction: it is what
 * tells the model to add no field of its own, and every pipeline schema is strict, so a field it
 * invents is a refused answer. The rule is "the booleans this parser refuses", measured, and not
 * "every boolean" — which would quietly stop asking for the one thing that keeps an answer
 * parseable.
 *
 * It is applied ONCE, to the one rendering both `response_format` and the message carry, so the
 * two still cannot disagree (S-130).
 */
const KEPT_BOOLEAN = 'additionalProperties'

export function withoutBooleanSchemas(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(withoutBooleanSchemas)
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([k, v]) => typeof v !== 'boolean' || k === KEPT_BOOLEAN)
        .map(([k, v]) => [k, withoutBooleanSchemas(v)]),
    )
  }
  return value
}

// ---------------------------------------------------------------- the fixed questions (I-8)

// The three calls that carry a picture or a clip carry NO PROMPT, NO SCHEMA AND NO CRITERION: the
// question and the shape of the answer are fixed here, inside the adapter, because a free prompt
// beside an image is a field a gate's brief could be written into (I-8, D-042, S-037).
//
// The schemas the calls ask with are used for ONE thing: to ask for the answer's shape — through
// `response_format` AND, because this wire ignores that field, in the message itself (S-130).
// They never parse an answer. An observation is parsed by the pipeline at the gate boundary,
// which is where a malformed one must be caught (D-041, S-042) — an adapter that parsed it here
// would make that path unreachable.
//
// AN OBSERVATION IS ASKED FOR WITH THE GATE'S OWN SCHEMA, `witnessObservation` or
// `clipObservation` from `packages/contracts` — never a copy of it (docs/features/ask-again.md,
// Slice 1; S-156). This file used to keep its own copy, in which `count` was any integer, a
// `label` could be empty and no object was strict, while the gate refused all three; the witness
// was told a count of −1 was fine, and wrote one for stars too many to count. Holding the gate's
// objects, this adapter could now parse with them, and must not: `ask-again`'s check 1 holds that
// an answer those schemas refuse comes back from `observe` as its value.

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

/**
 * Gate 1S's closed question (S-045).
 *
 * **"BY ITS NAME" WAS AN INVITATION TO RENAME, AND IT WAS TAKEN** (S-138). Asked about the
 * subject `shelf`, MiniMax-M3 answered `"Shelf of Bound Volumes"` — the plan's display name for
 * it, which is a name, and which Gate 1S refuses because it was not asked about. The run had
 * already passed Gate 1 on shot 0 and spent 34¢. The strings are now quoted in the list and
 * demanded back character for character, which is what `judgeCut` already says of its questions.
 */
const COMPARE_QUESTION = [
  'Two pictures follow, in order: the first is the canonical, the second is derived from it.',
  'For each subject listed below, answer whether it is the same thing in both pictures.',
  'Each subject is given as a quoted string. Use that string EXACTLY as it is written, character',
  'for character, as the value of "subject". Do not rename it, expand it, translate it or',
  'describe it, even if a more natural name for the thing is obvious from the pictures.',
  'Answer yes or no for every subject listed, once each, and for no other.',
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
  if (CLOSED_THINK.test(content)) return unfenced(content.replace(CLOSED_THINK, '').trim())
  if (OPEN_THINK.test(content)) return ''
  return unfenced(content.trim())
}

/**
 * A whole answer that is ONE fenced code block, with the fence removed (S-132).
 *
 * MEASURED 2026-09-22: with the shape said in the message, MiniMax-M3 answered the scoring call
 * ```` ```json {"answers":["yes","no","yes","no"]} ``` ```` — the right answer, in a fence, which
 * `JSON.parse` refuses. It is the same family as the `<think>` block D-019 found: presentation
 * the model adds around an answer that was asked for as JSON, which no instruction reliably
 * suppresses, so it is removed where the reasoning block is removed.
 *
 * It matches ONLY a content that is entirely one fenced block, opening at the start and closing
 * at the end. A fence in the middle of something is left alone, because then the content is not
 * an answer in a wrapper — it is something else, and `jsonOf` should say so.
 */
const WHOLE_FENCE = /^```[a-zA-Z0-9]*\r?\n?([\s\S]*?)\r?\n?```$/

export function unfenced(text: string): string {
  const fenced = WHOLE_FENCE.exec(text)
  return fenced === null ? text : (fenced[1] ?? '').trim()
}

// ---------------------------------------------------------------- the adapter

export function minimaxModel(options: MinimaxModelOptions): LanguageModelPort {
  const base = baseOf(options.baseUrl)
  const send = options.fetch ?? globalThis.fetch
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const answerTokens = options.answerTokens ?? DEFAULT_ANSWER_TOKENS
  const reasoningTokens = options.reasoningTokens ?? DEFAULT_REASONING_TOKENS
  const maxTokens = answerTokens + reasoningTokens

  /**
   * THE SHAPE ASKED FOR, SAID TWICE — in `response_format`, and in the message itself (S-130).
   *
   * MEASURED against the live wire on 2026-09-22: **MiniMax accepts
   * `response_format: { type: 'json_schema', … }` with HTTP 200 and IGNORES IT.** A planning
   * answer came back with `duration` and `subjects` where the schema says `durationSeconds` and
   * `subjectIds`, and with a different invented pair — `seconds`, `subjects` — for a different
   * grouping of the same reel; `strict: true` behaved exactly like `type: 'json_object'`. The
   * first real reel failed at its first parse, with nothing bought, which is where this was
   * found. The same schema rendered into the MESSAGE answers with every field name exact, in
   * both groupings.
   *
   * The message's rendering is the SAME `z.toJSONSchema` the header field gets, so the two cannot
   * disagree: a schema that moves moves both, and neither is a field name typed beside a schema
   * to go stale (S-124, S-125, S-127's rule). It is built from the schema alone — no time, no
   * randomness — so a call at temperature 0 still asks the same thing and still replays (D-062,
   * D-064). `response_format` is still sent: it costs nothing, and a model that honours it is
   * answered by it. `strict` stays `false`, because `true` was measured to change nothing.
   *
   * A schema that cannot be rendered asks for JSON and says the shape in nothing — as before.
   */
  function shapeAsked(
    schema: z.ZodType<unknown>,
    name: string,
  ): { format: Record<string, unknown>; said: string | undefined } {
    try {
      const json = withoutBooleanSchemas(
        z.toJSONSchema(schema, { io: 'input', unrepresentable: 'any' }),
      )
      return {
        format: { type: 'json_schema', json_schema: { name, schema: json, strict: false } },
        said: `${SHAPE_PREFACE}\n${JSON.stringify(json)}`,
      }
    } catch {
      return { format: { type: 'json_object' }, said: undefined }
    }
  }

  /**
   * What a model call costs when it answered and could not be read (S-142).
   *
   * **Zero, and the row exists anyway.** A model call is billed in tokens, and under the Token Plan
   * those cost nothing (S-129) — so the figure is honest and the ROW is what the next session
   * needs: a call that happened, on the record, with a figure that can be corrected when a model
   * call costs money (paid-failures, Deferred item 2). A row invented later cannot be.
   */
  const MODEL_LOST_CENTS = 0

  /**
   * Everything after a 200: the provider answered, so this call spent whatever it spends. The
   * detail is the reader's own message, which names the role and the model already.
   */
  const spent = (
    model: string,
    detail: string,
    read?: { answer: string; refused?: Refusals },
  ): Spent => new Spent({ port: 'model', model, costCents: MODEL_LOST_CENTS, detail, ...read })

  /**
   * An answer that was READ — its text in hand, after the reasoning block and a whole-answer fence
   * — and could not be used (docs/features/ask-again.md, Gate 2 "Which refusals are asked again";
   * S-156). The `Spent` it raises carries the ANSWER, so the worker can keep what the model wrote,
   * and — only when the answer itself is at fault and asking again could change it — `refused`:
   * the caller's schema refused it (its issues, `<path>: <message>`), it is not JSON, or it is the
   * schema. An answer cut off by the token budget carries its text and no `refused`: the budget is
   * not the answer's fault, and asking again at the same budget cuts it again (S-140). The detail is
   * the reader's own message, exactly as before.
   */
  function answered<T>(
    model: string,
    role: ModelRole,
    text: string,
    finish: string | undefined,
    parse: (json: unknown) => T,
  ): T {
    let json: unknown
    try {
      json = jsonOf(text, role, model, finish)
    } catch (error) {
      const detail = messageOf(error)
      if (echoedTheSchema(text)) {
        throw spent(model, detail, { answer: text, refused: answerRefusal('schema') })
      }
      if (finish === 'length') throw spent(model, detail, { answer: text })
      throw spent(model, detail, { answer: text, refused: answerRefusal('not-json') })
    }
    try {
      return parse(json)
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw spent(model, messageOf(error), { answer: text, refused: refusalsOf(error) })
      }
      throw spent(model, messageOf(error), { answer: text })
    }
  }

  /**
   * One step of reading an answer the provider has already given. A failure in it is `Spent`, with
   * the reader's own message as the detail — and a `Spent` from inside is passed through, never
   * wrapped twice.
   */
  function read<T>(model: string, of: () => T): T {
    try {
      return of()
    } catch (error) {
      if (isSpent(error)) throw error
      throw spent(model, messageOf(error))
    }
  }

  /**
   * One call, sent and classified.
   *
   * Everything that is not an answer is turned into one of three things here and nowhere else:
   * `Unavailable`, which the provider may answer differently if it is asked again; `Spent`, which
   * it answered and we could not read, carrying the row that call owes (S-142); or a thrown
   * `Error`, which is our request being wrong (S-096). The adapter does not send again, wait or
   * count — that is the worker's guarded ports', and since paid-failures the model port has one
   * too (see ../transient.ts).
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

    // A 200 IS A CALL THAT SPENT (docs/features/paid-failures.md, Gate 2, S-142). The provider
    // answered; what fails from here is our reading of what it said, so it is `Spent` and carries
    // the row the call owes the record — never a plain fault, which the budget guard reads as no
    // call at all (S-133).
    let parsed: unknown
    try {
      parsed = JSON.parse(text)
    } catch {
      throw spent(
        model,
        `the ${role} call to ${model} was answered 200 with a body that is not JSON: ${summary(text)}`,
      )
    }
    const answer = completion.safeParse(parsed)
    if (!answer.success) {
      throw spent(
        model,
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
  function jsonOf(text: string, role: ModelRole, model: string, finish?: string): unknown {
    // An answer that is the SCHEMA is reported as that, not as bad JSON (S-136). Read BEFORE the
    // parse, because an echo that was cut off by the token budget does not parse either, and
    // "not JSON" is a true sentence that sends the reader after the wrong thing.
    if (echoedTheSchema(text)) {
      throw new Error(
        `the ${role} call to ${model} answered THE SCHEMA rather than an object matching it: ` +
          `${summary(text)}`,
      )
    }
    try {
      return JSON.parse(text)
    } catch {
      // AN ANSWER THAT WAS CUT OFF IS THE BUDGET, NOT THE SHAPE (S-140). `answerOf` already says
      // so when the budget is spent inside the reasoning block and NOTHING is left; this is the
      // other half — the block closed, the answer began, and the tokens ran out inside it. Both
      // arrive here as text that will not parse, and only `finish_reason` tells them apart.
      if (finish === 'length') {
        throw new Error(
          `the ${role} call to ${model} was cut off mid-answer: it finished on length against a ` +
            `max_tokens of ${maxTokens}. This is the token budget, not the answer's shape — the ` +
            `answer allowance is what to raise (D-019, S-140): ${summary(text)}`,
        )
      }
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
    // The shape is appended as a part of its own, after the question and the media (S-130). It is
    // the ADAPTER'S OWN schema, fixed here — I-8's "no prompt, no schema, no criterion" is about
    // what a CALLER may put beside a picture, and a caller puts nothing here.
    const asked = shapeAsked(shape, name)
    // THE CLOSED SETS, SAID IN THE QUESTION ITSELF (S-144). The enum renders inside `asked.said`,
    // and that was measured not to be enough: a witness answered `position` with "bottom half",
    // "scattered between the tall pillars", and then with the NEIGHBOURING field's vocabulary —
    // twice in fourteen calls and once in twelve, each time after the whole run's clips were
    // bought. The sentence is built FROM the shape, so a set that moves moves it too.
    //
    // It is APPENDED TO THE QUESTION'S OWN TEXT PART rather than added as a part of its own, so
    // the call still carries exactly what checks 6 and 7 assert: the question first, the media as
    // bytes after it, the rendered schema last.
    const sets = closedSetsSaid(shape)
    let saidAlready = sets === undefined
    const asking = parts.map((part) => {
      if (saidAlready || part.type !== 'text') return part
      saidAlready = true
      return textPart(`${part.text}\n\n${String(sets)}`)
    })
    const answer = await post(
      {
        model,
        messages: [
          {
            role: 'user',
            content: asked.said === undefined ? asking : [...asking, textPart(asked.said)],
          },
        ],
        max_tokens: maxTokens,
        temperature,
        response_format: asked.format,
      },
      role,
    )
    // READING WHAT WAS ALREADY PAID FOR (S-142): the 200 is in hand, so a reasoning block with no
    // answer, a fence, a schema echo, a cut-off body or anything that will not parse is `Spent` —
    // and once the answer's text is in hand, the `Spent` carries it (S-156).
    const text = read(model, () => answerOf(answer, role, model))
    const value = answered(
      model,
      role,
      text,
      answer.choices[0]?.finish_reason ?? undefined,
      (json) => json,
    )
    return { value, receipt: receiptOf(role, call, temperature, answer, about) }
  }

  return {
    async structured(call) {
      const model = options.models[call.role]
      // The prompt is the pipeline's, sent whole and first, with the shape appended after it
      // (S-130). Both halves are built from their inputs alone — the prompt from the request, the
      // shape from the schema — so the same inputs ask the same thing and a call at temperature 0
      // replays.
      const asked = shapeAsked(call.schema as z.ZodType<unknown>, 'answer')
      const answer = await post(
        {
          model,
          messages: [
            {
              role: 'user',
              content: asked.said === undefined ? call.prompt : `${call.prompt}\n\n${asked.said}`,
            },
          ],
          max_tokens: maxTokens,
          temperature: call.temperature,
          response_format: asked.format,
        },
        call.role,
      )
      // The same line as `ask`'s: the call is paid for, and everything from here is our reading of
      // it — including the caller's own schema refusing the answer (S-142).
      const text = read(model, () => answerOf(answer, call.role, model))
      const value = answered(
        model,
        call.role,
        text,
        answer.choices[0]?.finish_reason ?? undefined,
        (json) => call.schema.parse(json),
      )
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
          witnessObservation,
          'observation',
          { pictureIds: [call.picture.pictureId] },
        )
      }
      return ask(
        'witness',
        'observe',
        call.temperature,
        [textPart(OBSERVE_CLIP_QUESTION), await clipPart(call.clip)],
        clipObservation,
        'clipObservation',
        { takeIds: [call.clip.takeId] },
      )
    },

    async compare(call) {
      // QUOTED, so the string to answer with has edges. Unquoted, `shelf` reads as a topic and a
      // model answers it with a name of its own (S-138); `judgeCut` already quotes its sentences.
      const subjects = call.subjects.map((name) => `- ${JSON.stringify(name)}`).join('\n')
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
