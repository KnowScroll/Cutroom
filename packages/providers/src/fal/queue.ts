import { z } from 'zod'
import { Unavailable, transientStatus } from '../transient.ts'

// WHAT THE FAL ADAPTERS SHARE (S-114, S-124): the two base URLs, the authorisation header, the
// queue fal runs every job through, and the one answer to "did the provider make nothing, and
// would asking again help?".
//
// THE WIRE IS THE ONE D-019'S SPIKE DROVE LIVE on 2026-09-03 for video
// (steering-ref/scripts/spikes/h3-video.mjs): submit to `queue.fal.run/<slug>`, poll
// `<owner>/<model>/requests/<id>/status`, then fetch the result from the request's own URL, with
// `Authorization: Key <key>`. `fetch` and `zod`, no SDK (S-114). The image adapter is its first
// caller; the video adapter is its second (Slice 6).
//
// TWO HOSTS, TWO SETTINGS. fal's queue and fal's storage are different hosts, so each gets its own
// base URL. S-123 gave MiniMax ONE setting because MiniMax's two wires are one host; the reason
// was never "one setting a provider" but that no half of a provider may be left pointing at the
// internet while the other half is pointed at recorded wire — which with two hosts takes two
// settings. Both are asserted by a test, because session 39's `n29` — a base URL ignored entirely
// — was caught by nothing until one was added.
//
// THE ADAPTER NEVER FOLLOWS `status_url` OR `response_url`. A real answer carries both, and
// following them would let a URL the provider chose step around the base-URL setting — which is
// the one thing that keeps the suite off the network (S-111). Both are built here, from the base
// URL the adapter was given and the slug it was configured with.
//
// A KEY REACHES ONE PLACE: the Authorization header of a call to fal itself. It is in no log line,
// no message and no receipt, and it is never sent to a URL the provider handed back (S-109, D-022).

/** fal's queue: where a job is submitted and polled. The default of `CUTROOM_FAL_BASE_URL`. */
export const FAL_BASE_URL = 'https://queue.fal.run'

/** fal's storage: where a local reference picture is uploaded. `CUTROOM_FAL_STORAGE_BASE_URL`. */
export const FAL_STORAGE_BASE_URL = 'https://rest.alpha.fal.ai'

/** How fal authorises. Not `Bearer`: the spike sent exactly this and it answered (D-019). */
export function keyHeader(key: string): string {
  return `Key ${key}`
}

/** A base URL as an adapter holds it: no trailing slash, so a path can be appended to it. */
export function baseOf(url: string | undefined, fallback: string): string {
  return (url ?? fallback).replace(/\/+$/, '')
}

/** As much of a body as a message may carry. Enough to recognise, never enough to be a payload. */
export function summary(text: string): string {
  const one = text.replace(/\s+/g, ' ').trim()
  return one.length <= 200 ? one : `${one.slice(0, 200)}…`
}

/**
 * The request path of a job on a slug. fal's queue takes the whole slug to submit, and the FIRST
 * TWO SEGMENTS of it to poll — a slug `<owner>/<model>/<variant>` is polled at `<owner>/<model>`,
 * which is what the spike does (steering-ref/scripts/spikes/h3-video.mjs).
 *
 * No slug is spelled here, or anywhere but the registry (D-028): a test reads this repository's
 * own source for one, so even an example in a comment is written generically.
 */
export function requestPath(slug: string, requestId: string): string {
  const family = slug.split('/').slice(0, 2).join('/')
  return `/${family}/requests/${requestId}`
}

/** How long a whole call may take before the provider is unavailable. The spike's own wait. */
export const DEFAULT_FAL_TIMEOUT_MS = 120_000

/** How long between polls. The spike's own 3 seconds; a test sets it to nothing. */
export const DEFAULT_FAL_POLL_MS = 3_000

/** A fault: the provider will answer a second send the same way, so the run fails (S-096). */
export class FalFault extends Error {}

/** What a submit answers. `status_url` and `response_url` are recorded and never followed. */
export const submitted = z.object({
  request_id: z.string().min(1),
  status: z.string().optional(),
  queue_position: z.number().optional(),
  status_url: z.string().optional(),
  response_url: z.string().optional(),
})

/** What a poll answers. Anything that is not COMPLETED or FAILED is the queue still working. */
export const polled = z.object({
  status: z.string().min(1),
  request_id: z.string().optional(),
  queue_position: z.number().optional(),
})

export interface FalTransport {
  key: string
  fetch?: typeof globalThis.fetch
  timeoutMs?: number
}

/**
 * One request, sent and classified — the only place a fal failure becomes a kind.
 *
 * **429, 5xx, 408, a connection error and our own timeout throw `Unavailable`**; everything else —
 * 400, 401, 403, 422, 404 — throws a `FalFault`. `key` is left out for a URL the provider handed
 * back: ours has no business at fal's storage or its file host, which is the rule S-123 set for
 * MiniMax's presigned subtitle URL.
 */
export async function send(
  url: string,
  what: string,
  init: {
    method: string
    key?: string
    headers?: Record<string, string>
    body?: string | Uint8Array
    timeoutMs: number
    fetch: typeof globalThis.fetch
  },
): Promise<{ status: number; text(): Promise<string>; bytes(): Promise<Uint8Array> }> {
  let response: Response
  try {
    response = await init.fetch(url, {
      method: init.method,
      headers: {
        ...(init.headers ?? {}),
        ...(init.key === undefined ? {} : { authorization: keyHeader(init.key) }),
      },
      // `fetch`'s own body type is not in this project's lib, and what is sent is only ever a
      // JSON string or the bytes of a file, both of which every runtime accepts.
      body: init.body as unknown as undefined,
      signal: AbortSignal.timeout(init.timeoutMs),
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
        ? `${what} answered nothing within ${init.timeoutMs} ms`
        : `${what} did not reach the provider: ${reason}`,
    )
  }

  if (!response.ok) {
    const detail = `${what} was answered ${response.status} ${summary(await response.text())}`
    if (transientStatus(response.status)) throw new Unavailable(detail)
    throw new FalFault(detail)
  }
  let read: Promise<ArrayBuffer> | undefined
  const buffer = (): Promise<ArrayBuffer> => (read ??= response.arrayBuffer())
  return {
    status: response.status,
    text: async () => Buffer.from(await buffer()).toString('utf8'),
    bytes: async () => new Uint8Array(await buffer()),
  }
}

/** One body, parsed — or the fault an answer nobody can read deserves. */
export function json<T>(text: string, shape: z.ZodType<T>, what: string): T {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new FalFault(`${what} was answered 200 with a body that is not JSON: ${summary(text)}`)
  }
  const answer = shape.safeParse(parsed)
  if (!answer.success) {
    throw new FalFault(
      `${what} was answered 200 with a body that is not this wire: ` +
        answer.error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join('; '),
    )
  }
  return answer.data
}

export interface QueueRun {
  slug: string
  input: Record<string, unknown>
  what: string
  base: string
  pollMs: number
  /** How long ONE HTTP call may take. Bounds a request, never the wait. */
  timeoutMs: number
  /**
   * How long the WHOLE job may sit on the queue before the provider has made nothing.
   *
   * Split from `timeoutMs` when the video adapter was written (S-125). An image job answers in
   * seconds, so one figure served both; a real clip takes minutes, and a shared 120 s would have
   * called a job fal was still working on `unavailable` — which sends the whole call again and
   * buys a second clip. The image adapter passes its own timeout here, so nothing about it moved.
   */
  waitMs: number
  fetch: typeof globalThis.fetch
  key: string
}

/** What a queued job answered: fal's own request id, and the body of the result. */
export interface QueueResult {
  /** `VideoReceipt.requestId` — the provider's, as D-028 asks every receipt to carry (D-033). */
  requestId: string
  body: string
}

/**
 * Submit, poll until the job is answered, fetch the result. The whole of fal's queue, for whatever
 * the caller asked for — the image adapter's edit call and the video adapter's clip.
 *
 * **A queued job is neither a failure nor a transient**: it is the queue working, and the adapter
 * waits. **A job fal ACCEPTED AND THEN FAILED is a fault**, carrying the provider's own message —
 * the provider did work and refused the result, and sending the same request again would buy the
 * same refusal. The waiting is bounded by `waitMs`, after which the provider is unavailable,
 * because a job still queued is one that has made nothing yet.
 */
export async function runQueued(run: QueueRun): Promise<QueueResult> {
  const started = Date.now()
  const submit = json(
    await (
      await send(`${run.base}/${run.slug}`, run.what, {
        method: 'POST',
        key: run.key,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(run.input),
        timeoutMs: run.timeoutMs,
        fetch: run.fetch,
      })
    ).text(),
    submitted,
    run.what,
  )

  const request = `${run.base}${requestPath(run.slug, submit.request_id)}`
  for (;;) {
    const status = json(
      await (
        await send(`${request}/status`, `${run.what}'s status`, {
          method: 'GET',
          key: run.key,
          timeoutMs: run.timeoutMs,
          fetch: run.fetch,
        })
      ).text(),
      polled,
      `${run.what}'s status`,
    )

    if (status.status === 'COMPLETED') {
      const body = await (
        await send(request, `${run.what}'s result`, {
          method: 'GET',
          key: run.key,
          timeoutMs: run.timeoutMs,
          fetch: run.fetch,
        })
      ).text()
      return { requestId: submit.request_id, body }
    }

    if (status.status === 'FAILED') {
      // The result endpoint carries what went wrong, and it answers a non-200 for a failed job —
      // so the fault `send` throws already holds the provider's message. A result that answers
      // 200 anyway is a job that failed and then did not say why, which is still a fault.
      const detail = await (
        await send(request, `${run.what}`, {
          method: 'GET',
          key: run.key,
          timeoutMs: run.timeoutMs,
          fetch: run.fetch,
        })
      ).text()
      throw new FalFault(`${run.what} was accepted and then failed: ${summary(detail)}`)
    }

    if (Date.now() - started >= run.waitMs) {
      throw new Unavailable(
        `${run.what} was still ${status.status} after ${run.waitMs} ms, so it has made nothing`,
      )
    }
    if (run.pollMs > 0) await new Promise((resolve) => setTimeout(resolve, run.pollMs))
  }
}
