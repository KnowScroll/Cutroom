import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { z } from 'zod'
import type { NarrationAnswer, NarrationPort, WordTiming } from '@cutroom/contracts'
import { artifactPath } from '../artifacts.ts'
import { transientStatus } from '../transient.ts'
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
 * The subtitle body: one entry a word, each with the milliseconds it spans.
 *
 * THIS SHAPE IS DOCUMENTED AND HAS NEVER BEEN SEEN HERE. The spike recorded that a subtitle URL
 * came back and withheld the URL, so nothing in this repository has read the body behind it.
 * A body that is not this throws, naming what arrived, so Slice 8's hand-run reel finds it at
 * once rather than quietly — which is the honest state for the one part of this adapter that
 * rests on a document rather than on a call.
 */
const subtitle = z.array(
  z.object({
    text: z.string(),
    time_begin: z.number(),
    time_end: z.number(),
  }),
)

/** Every entry, translated and judged in no way: one entry is one word (S-070, S-042). */
function timingsOf(entries: z.infer<typeof subtitle>): WordTiming[] {
  // An entry holding a whole sentence would have to be split, and splitting it means inventing
  // the milliseconds inside it. So it is passed on as it arrived, and the stage's parse — every
  // word of the text, exactly once, in order — is what fails, loudly, at the boundary that owns
  // that question. An adapter that guessed here would make that path unreachable.
  return entries.map((entry) => ({
    word: entry.text.trim(),
    startMs: Math.round(entry.time_begin),
    endMs: Math.round(entry.time_end),
  }))
}

/** A fault: the provider will answer a second send the same way, so the run fails (S-096). */
class Fault extends Error {}

/** A transient, carried out of the send and turned into the port's own `unavailable` arm. */
class Transient extends Error {}

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
      try {
        const body = json(
          await get(`${base}${T2A_PATH}`, what, {
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
              // The voice is the caller's setting (S-070), never a value spelled here. It is
              // still `'stand-in'` by default in `DEFAULT_RENDER_SETTINGS`, which the stand-in
              // ignores and this adapter cannot: Slice 8's real run is what names a real voice.
              voice_setting: { voice_id: request.voice, speed: 1, vol: 1, pitch: 0 },
              audio_setting: { ...AUDIO_SETTING },
            }),
          }),
          spoken,
          what,
        )

        // MiniMax reports its own outcome even under 200, so a busy provider can arrive either way.
        const status = body.base_resp
        if (status !== undefined && status.status_code !== 0) {
          const detail = `${what} was refused by the provider: ${status.status_code} ${status.status_msg}`
          if (transientCode(status.status_code)) throw new Transient(detail)
          throw new Fault(detail)
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
        if (error instanceof Transient) return { kind: 'unavailable', detail: error.message }
        throw error
      }
    },
  }
}
