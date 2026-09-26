import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { z } from 'zod'
import {
  RefusedRequest,
  type NarrationAnswer,
  type NarrationPort,
  type WordTiming,
} from '@cutroom/contracts'
import { artifactPath } from '../artifacts.ts'
import { Spent, messageOf, transientStatus } from '../transient.ts'
import { baseOf, baseResp, summary, transientCode } from './wire.ts'

// THE MINIMAX T2A NARRATION ADAPTER — the second real adapter (docs/features/paid-path.md,
// Gate 2 "The narration"; checks 9 and 10).
//
// THE WIRE IS THE ONE D-019 VERIFIED LIVE: POST /v1/t2a_v2, `model: speech-2.8-hd`,
// `subtitle_enable: true`, which answered 110 KB of audio and a subtitle_file URL on 2026-09-02
// (steering-ref/scripts/spikes/minimax-t2a.mjs, steering-ref/docs/research/spike-results.json).
// That answer is what settled D-008's primary path and left its kokoro-js + whisper-cli fallback
// unbuilt. `fetch` and `zod`, no SDK (S-114).
//
// TWO CALLS MAKE ONE NARRATION, and the second one is the dangerous one.
//
//  1. The audio comes back INSIDE the answer, hex encoded. It is written under the artifact root
//     and the answer carries its path — files, not bytes (D-086, D-087).
//  2. The word timings come back as `subtitle_file`, A PRESIGNED ALIBABA OSS URL whose query
//     string carries OSSAccessKeyId, Expires and Signature: A LIVE CREDENTIAL BELONGING TO
//     MINIMAX. D-022 exists because that exact field was once written into a file committed to a
//     public repository, and it was GitHub's push protection that caught it, not a sweep for the
//     owner's own keys — "scanning for your own keys proves nothing about what a provider handed
//     you". So this adapter FETCHES THE TIMINGS AND DROPS THE URL. It reaches no receipt, no row,
//     no answer, no message and no log line; not the query string, and not even the host, which
//     is the most S-109 allows anyone to keep.
//
// WHERE THIS DIFFERS FROM THE MODEL ADAPTER, AND WHY (S-123). `NarrationAnswer` carries an
// `unavailable` arm that S-096 built and `reel-takes` verified, and the worker's guarded
// narration port is what sends the call again, with backoff, on the transient counter. So a
// transient here is ANSWERED, not thrown: throwing `Unavailable` as the model adapter does
// (S-122) would leave that verified mechanism unreachable for the one adapter that can use it.
// The adapter still only CLASSIFIES — it never sends again, waits or counts.
//
// THE KNOWN LIMIT, NAMED RATHER THAN HIDDEN: a transient on the SECOND call is answered
// `unavailable` like any other, and the whole `speak` is what the guarded port sends again — so
// the audio is made a second time. An adapter may not retry a call of its own, and T2A is covered
// by the owner's token plan (D-019, S-110), so that second buy costs nothing today. Slice 8
// measures it against the provider's own figures.
//
// A KEY REACHES ONE PLACE: the Authorization header of the first call, and never the second — the
// presigned URL carries its own authorisation, and ours has no business at MiniMax's storage.
// Nothing here logs, and no message names a header or a credential (S-109, D-022).

/** The one path. The plain one, with no GroupId: it is what the spike recorded answering (D-019). */
export const T2A_PATH = '/v1/t2a_v2'

/** The model D-008 and D-019 name, and the one the owner's token plan covers. */
export const T2A_MODEL = 'speech-2.8-hd'

/**
 * WHAT GRANULARITY THE TIMINGS ARE ASKED FOR AT (S-129). `subtitle_enable` alone answers the
 * provider's DEFAULT, which is `sentence` — one entry for the whole text, measured live on
 * 2026-09-21 as a single entry spanning all 20 words of a three-sentence narration. D-008's whole
 * reason for a separate narration track is the word timings, so the default is useless to it and
 * the stage's parse would fail every real narration after it had been spoken and paid for.
 *
 * An unknown field is DROPPED IN SILENCE by this wire — `subtitle_granularity`, `granularity`,
 * `subtitle_setting.granularity` and `subtitle_level` were each answered 200 with sentence-level
 * timings — so a wrong name here reads exactly like a provider that has no word level at all.
 * This is the name the provider's own reference gives, and the one measured answering with words.
 */
export const SUBTITLE_TYPE = 'word'

/** What the audio is asked for as — the settings the spike sent, which answered (D-019). */
export const AUDIO_SETTING = {
  sample_rate: 32_000,
  bitrate: 128_000,
  format: 'mp3',
  channel: 1,
} as const

/** What the file is called, from the format asked for above. */
export const AUDIO_EXTENSION = '.mp3'

/** How long one narration may take before it is unavailable. The spike's own wait (D-019). */
export const DEFAULT_NARRATION_TIMEOUT_MS = 120_000

export interface MinimaxNarrationOptions {
  /** Read by `packages/providers` and nowhere else (S-109). Sent in one header, written nowhere. */
  key: string
  /** The ONE artifact root every file goes under (D-086, D-087). */
  artifactRoot: string
  /** Where the provider is. Defaults to its own; a test points it at recorded wire (S-111). */
  baseUrl?: string
  /** How a request is made. Defaults to this runtime's; a test hands it recorded wire. */
  fetch?: typeof globalThis.fetch
  timeoutMs?: number
  /** The model asked for and recorded. Defaults to D-008's. */
  model?: string
}

// ---------------------------------------------------------------- the wire

/**
 * What comes back. `data.audio` is the audio as HEX, and `data.subtitle_file` is the presigned
 * URL — both under `data`, which is where the spike read them (`r.json.data.subtitle_file`,
 * recorded as `hasSubtitle: true` with the host it came from).
 */
const spoken = z.object({
  data: z
    .object({
      status: z.number().optional(),
      audio: z.string().optional(),
      subtitle_file: z.string().optional(),
    })
    .optional(),
  extra_info: z.looseObject({}).optional(),
  trace_id: z.string().optional(),
  base_resp: baseResp.optional(),
})

/**
 * The subtitle body, AS IT WAS MEASURED on 2026-09-21 rather than as it was documented (S-129).
 *
 * It is an array of SEGMENTS, not of words: asked at `subtitle_type: 'word'`, each segment carries
 * its own `timestamped_words`, and that nested array is where the word timings live. Session 38
 * recorded the documented shape — one entry a word — because the spike withheld the URL and
 * nothing here had read the body. A live call answers neither: at the default granularity there
 * is one segment for the whole text and no `timestamped_words` at all.
 *
 * `timestamped_words` is OPTIONAL here, because a provider that ignored the granularity must fail
 * at the stage's parse — loudly, naming the words it gave — rather than here, where "are these the
 * narration's words" is not this adapter's question (S-070, S-042).
 */
const subtitle = z.array(
  z.object({
    text: z.string(),
    time_begin: z.number(),
    time_end: z.number(),
    timestamped_words: z
      .array(
        z.object({
          /** The SOURCE text's characters. `pronounce_word` is the spoken form and is not this. */
          word: z.string(),
          time_begin: z.number(),
          time_end: z.number(),
        }),
      )
      .optional(),
  }),
)

/** Every entry, translated and judged in no way: one entry is one word (S-070, S-042). */
function timingsOf(entries: z.infer<typeof subtitle>, text: string): WordTiming[] {
  const tokens = entries.flatMap((entry) => entry.timestamped_words ?? [])
  if (tokens.length === 0) {
    // No word level came back. An entry holding a whole sentence would have to be SPLIT, and
    // splitting it means inventing the milliseconds inside it. So it is passed on as it arrived,
    // and the stage's parse — every word of the text, exactly once, in order — is what fails,
    // loudly, at the boundary that owns that question (S-070, S-042). An adapter that guessed
    // here would make that path unreachable.
    return entries.map((entry) => ({
      word: entry.text.trim(),
      startMs: Math.round(entry.time_begin),
      endMs: Math.round(entry.time_end),
    }))
  }

  // THE PROVIDER'S TOKENS ARE NOT THE STAGE'S WORDS (S-129), measured live: white space arrives as
  // tokens of its own, a full stop is its own token, and `holds` arrives as `hold` then `s`. The
  // stage splits the narration's text on white space and wants exactly those words, so the tokens
  // are JOINED BACK UP into them — which invents no millisecond, because a joined word begins when
  // its first token begins and ends when its last one ends.
  //
  // The join is driven by the text itself and matches on `word`, the source characters. Nothing is
  // normalised, trimmed into shape or guessed at: a run of tokens that does not build the next word
  // of the text ABANDONS THE JOIN, and every token is passed on as it arrived, so the stage's parse
  // fails naming what the provider actually said. Reporting it here would put the question in the
  // adapter, which is the one place S-070 says it does not belong.
  const wanted = text.split(/\s+/).filter((word) => word !== '')
  const joined: WordTiming[] = []
  let at = 0
  let building = ''
  let startMs = 0
  for (const token of tokens) {
    if (token.word.trim() === '') continue
    if (building === '') startMs = token.time_begin
    building += token.word
    const word = wanted[at]
    if (word === undefined || !word.startsWith(building)) return bare(tokens)
    if (building !== word) continue
    joined.push({ word, startMs: Math.round(startMs), endMs: Math.round(token.time_end) })
    building = ''
    at += 1
  }
  if (building !== '' || at !== wanted.length) return bare(tokens)
  return joined
}

/**
 * Every token as it arrived, for a stage that must see what the provider said (S-042). White
 * space is dropped, because the stage splits on white space and a token of it is not a word in
 * any reading; nothing else is touched.
 */
function bare(tokens: readonly { word: string; time_begin: number; time_end: number }[]) {
  return tokens
    .filter((token) => token.word.trim() !== '')
    .map((token) => ({
      word: token.word.trim(),
      startMs: Math.round(token.time_begin),
      endMs: Math.round(token.time_end),
    }))
}

/**
 * What a narration that spoke and could not be read costs (S-142). **Zero**, because T2A is covered
 * by the owner's token plan (D-019, D-057, S-070) — the same figure the receipt carries. The row
 * is what matters: a call that happened, on the record.
 */
const NARRATION_LOST_CENTS = 0

/** A fault: the provider will answer a second send the same way, so the run fails (S-096). */
class Fault extends Error {}

/** A transient, carried out of the send and turned into the port's own `unavailable` arm. */
class Transient extends Error {}

/**
 * The provider answering that it refused OUR request — a non-transient `base_resp` status under 200:
 * a key, a balance, a parameter. It has answered, so the call has spent, and it leaves as a
 * `RefusedRequest`, whose run's kind is `engine`, not `unreadable` (resume-failed, S-163).
 */
class Rejected extends Fault {}

// ---------------------------------------------------------------- the adapter

export function minimaxNarration(options: MinimaxNarrationOptions): NarrationPort {
  const base = baseOf(options.baseUrl)
  const send = options.fetch ?? globalThis.fetch
  const timeoutMs = options.timeoutMs ?? DEFAULT_NARRATION_TIMEOUT_MS
  const model = options.model ?? T2A_MODEL

  /**
   * One request, sent and classified.
   *
   * Everything that is not an answer becomes one of two things here and nowhere else: a
   * `Transient`, which the caller turns into the port's `unavailable` arm, or a `Fault`, which
   * fails the run. `headers` is absent for the subtitle fetch — OUR KEY HAS NO BUSINESS AT
   * MINIMAX'S STORAGE, and the presigned URL carries its own authorisation.
   */
  async function get(
    url: string,
    what: string,
    init: { method: string; headers?: Record<string, string>; body?: string },
  ): Promise<string> {
    let response: Response
    try {
      response = await send(url, { ...init, signal: AbortSignal.timeout(timeoutMs) })
    } catch (error) {
      // Nothing reached the provider, or nothing came back in time. Either way it made nothing.
      const reason = error instanceof Error ? error.message : String(error)
      // `AbortSignal.timeout` aborts with a `TimeoutError`; an abort from anywhere else is an
      // `AbortError`. Neither is reliably an `Error` subclass across runtimes, so the name is read
      // off the thrown thing rather than through `instanceof`.
      const name = (error as { name?: unknown })?.name
      const aborted = name === 'TimeoutError' || name === 'AbortError'
      throw new Transient(
        aborted
          ? `${what} answered nothing within ${timeoutMs} ms`
          : `${what} did not reach the provider: ${reason}`,
      )
    }

    const text = await response.text()
    if (!response.ok) {
      const detail = `${what} was answered ${response.status} ${summary(text)}`
      if (transientStatus(response.status)) throw new Transient(detail)
      throw new Fault(detail)
    }
    return text
  }

  /** One body, parsed — or the fault an answer nobody can read deserves. */
  function json<T>(text: string, shape: z.ZodType<T>, what: string): T {
    let parsed: unknown
    try {
      parsed = JSON.parse(text)
    } catch {
      throw new Fault(`${what} was answered 200 with a body that is not JSON: ${summary(text)}`)
    }
    const answer = shape.safeParse(parsed)
    if (!answer.success) {
      throw new Fault(
        `${what} was answered 200 with a body that is not this wire: ` +
          answer.error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join('; '),
      )
    }
    return answer.data
  }

  return {
    async speak(request) {
      const what = `the narration ${request.narrationId}`
      // WHETHER THE PROVIDER HAS SPOKEN YET (docs/features/paid-failures.md, Gate 2, S-142). Before
      // the T2A call answers, a failure is a request of ours that was wrong, or a provider that
      // made nothing; after it, the words have been spoken and the call has spent, so every
      // failure in our reading of the answer is `Spent` and carries the row that call owes.
      let answered = false
      try {
        const said = await get(`${base}${T2A_PATH}`, what, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${options.key}`,
          },
          body: JSON.stringify({
            model,
            text: request.text,
            stream: false,
            // Without this there are no word timings at all, and D-008's whole reason for a
            // separate narration track is the word timings (D-019).
            subtitle_enable: true,
            // And without THIS the timings come back at the provider's default granularity,
            // which is one entry for the whole text (S-129, measured 2026-09-21).
            subtitle_type: SUBTITLE_TYPE,
            // The voice is the caller's setting (S-070), never a value spelled here. It is
            // still `'stand-in'` by default in `DEFAULT_RENDER_SETTINGS`, which the stand-in
            // ignores and this adapter cannot: Slice 8's real run is what names a real voice.
            voice_setting: { voice_id: request.voice, speed: 1, vol: 1, pitch: 0 },
            audio_setting: { ...AUDIO_SETTING },
          }),
        })
        answered = true
        const body = json(said, spoken, what)

        // MiniMax reports its own outcome even under 200, so a busy provider can arrive either way.
        const status = body.base_resp
        if (status !== undefined && status.status_code !== 0) {
          const detail = `${what} was refused by the provider: ${status.status_code} ${status.status_msg}`
          if (transientCode(status.status_code)) throw new Transient(detail)
          throw new Rejected(detail)
        }

        const hex = body.data?.audio
        if (
          hex === undefined ||
          hex === '' ||
          hex.length % 2 !== 0 ||
          !/^[0-9a-fA-F]+$/.test(hex)
        ) {
          // `Buffer.from(x, 'hex')` truncates silently at the first character that is not hex, so
          // a body half of which is an error message would be written out as a short file rather
          // than reported. It is read here instead.
          throw new Fault(`${what} was answered 200 with no audio this adapter can read`)
        }
        const reference = body.data?.subtitle_file
        if (reference === undefined || reference === '') {
          throw new Fault(
            `${what} was answered 200 with no subtitle_file, so it has no word timings (D-008, D-019)`,
          )
        }

        // The timings, fetched — and the reference is not kept past this line. Nothing below it
        // can name the URL, because nothing below it has it.
        const timings = timingsOf(
          json(
            await get(reference, `${what}'s word timings`, { method: 'GET' }),
            subtitle,
            `${what}'s word timings`,
          ),
          request.text,
        )

        // FILES, NOT BYTES (D-086, D-087). The audio is written under the one artifact root, in
        // the run's own folder, and the answer carries its path.
        const path = artifactPath(
          options.artifactRoot,
          { runId: request.runId, id: request.narrationId, what: 'narrationId' },
          AUDIO_EXTENSION,
          'the MiniMax narration adapter',
        )
        mkdirSync(dirname(path), { recursive: true })
        writeFileSync(path, Buffer.from(hex, 'hex'))

        return {
          kind: 'made',
          audio: { narrationId: request.narrationId, path },
          timings,
          receipt: {
            model,
            // Code points, as the worker's guard counts them (S-088): not the UTF-16 length.
            characters: [...request.text].length,
            // T2A is covered by the owner's token plan, so a narration costs nothing (D-019,
            // D-057, S-070). `fake: false` is what carries the difference from a stand-in's
            // receipt (S-036), and Slice 8 compares this figure with the provider's own (S-110).
            costCents: 0,
            fake: false,
          },
        } satisfies NarrationAnswer
      } catch (error) {
        // A transient is still the port's own arm, wherever it came from: the whole `speak` is
        // sent again, and T2A's re-buy costs nothing under the Token Plan (S-123, S-129). That is
        // why this answer carries no `spent` where the video port's does — there is no figure to
        // lose. When a narration costs money, it gains what the clip has (paid-failures, Deferred).
        if (error instanceof Transient) return { kind: 'unavailable', detail: error.message }
        // The provider spoke and we could not use what it said (S-142). The row carries a zero for
        // the same reason the receipt does — T2A is plan-covered — and it is the ROW that matters:
        // a call that happened, on the record, with a figure that can be corrected later.
        if (answered) {
          const lost = {
            port: 'speech' as const,
            model,
            costCents: NARRATION_LOST_CENTS,
            detail: messageOf(error),
          }
          // Refused as ours, the same row with the class that says so; anything else it said that
          // we could not use is `unreadable` (S-163).
          throw error instanceof Rejected ? new RefusedRequest(lost) : new Spent(lost)
        }
        throw error
      }
    },
  }
}
