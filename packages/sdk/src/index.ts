import {
  ErrorResponse,
  EventsPage,
  ResumeRequest,
  ResumeResponse,
  RunRecord,
  RunResult,
  RunStatus,
  SubmitRequest,
  SubmitResponse,
} from '@cutroom/reel-contract'

// The typed local client for the reel engine (docs/features/cutroom-sdk.md, Gate 2 / Slice 2).
//
// Slice 2 is client/package work only: validate input before fetch, validate every response after
// it, normalise loopback URLs, encode path segments and query values, and turn the contract's
// defined refusals into ordinary return values. No child process, no readiness probe, no port
// race, no launcher: those are Slice 3.

// ---------------------------------------------------------------- errors

/**
 * A schema-valid contract error body arrived as the response for a route's 400, 404 or 500 arm.
 * The body is the parsed `ErrorResponse`; no other text from the wire is exposed (S-173,
 * docs/features/cutroom-sdk.md Gate 3 "Validation and error rules").
 */
export type SdkApiError = {
  kind: 'api'
  status: number
  body: ErrorResponse
}

/**
 * An unexpected HTTP status, malformed JSON, or a body that fails the expected schema for the
 * route and status. The wire body is dropped; nothing unparsed is exposed.
 */
export type SdkProtocolError = {
  kind: 'protocol'
  status?: number
  stage: 'ready' | 'request'
}

/**
 * The stable shape for a connection refusal, a child error or a readiness deadline. Slice 2
 * exports it; the launcher/connection-retry behavior that throws it is Slice 3 (S-175,
 * docs/features/cutroom-sdk.md Gate 2).
 */
export type SdkConnectionError = {
  kind: 'connection'
  stage: 'connect' | 'start' | 'ready' | 'close'
}

/** Every error the SDK throws in Slice 2. */
export type SdkError = SdkApiError | SdkProtocolError | SdkConnectionError

// ---------------------------------------------------------------- handle

/** The configuration `createCutroom` accepts in Slice 2. */
export type CreateCutroomOptions = {
  /**
   * The engine's loopback HTTP origin, with an explicit port. Defaults to
   * `http://127.0.0.1:8787`. Non-loopback hosts, HTTPS, credentials, paths, query strings,
   * fragments, and a missing port are rejected before any request is made (S-173, D-098).
   */
  baseUrl?: string
}

export interface Cutroom {
  /** `POST /v1/runs`. The request is validated against `SubmitRequest` before fetch. */
  submit(request: SubmitRequest): Promise<SubmitResponse>
  /** `GET /v1/runs?requestId=`. The `requestId` is URL-encoded once. */
  find(requestId: string): Promise<RunStatus>
  /** `GET /v1/runs/:runId`. The `runId` is URL-encoded once. */
  status(runId: string): Promise<RunStatus>
  /** `GET /v1/runs/:runId/events?since=`. The `runId` and `since` are URL-encoded once. */
  follow(runId: string, since?: number): Promise<EventsPage>
  /**
   * `GET /v1/runs/:runId/result`. A 200 body is `RunResult`; a 409 while the run is still
   * active is `RunStatus` (the contract's defined refusal). Never treat a 202 as a finished
   * result.
   */
  result(runId: string): Promise<RunResult | RunStatus>
  /** `GET /v1/runs/:runId/record`. A 200 body is `RunRecord`; a 409 while the run is still active is `RunStatus`. */
  record(runId: string): Promise<RunRecord | RunStatus>
  /** `POST /v1/runs/:runId/cancel`. */
  cancel(runId: string): Promise<RunStatus>
  /**
   * `POST /v1/runs/:runId/resume`. The request is validated against `ResumeRequest` before
   * fetch. A 200/202 is the accepted or preview arm; a 409/422 is the refused arm — both
   * are `ResumeResponse`.
   */
  resume(runId: string, request: ResumeRequest): Promise<ResumeResponse>
  /**
   * Local and safe in Slice 2: starts no process, sends no signal. After `close()`, any
   * further method call rejects with `SdkProtocolError { stage: 'request' }` and no HTTP
   * request is made.
   */
  close(): Promise<void>
}

export async function createCutroom(options: CreateCutroomOptions): Promise<Cutroom> {
  // Implementation lives below — see `_createCutroom` for the body that handles the Slice 2
  // scope. Throwing here would make `createCutroom` a non-async function whose return value
  // is a rejected one; the test inventory calls for an async signature either way.
  return _createCutroom(options)
}

async function _createCutroom(options: CreateCutroomOptions): Promise<Cutroom> {
  const baseUrl = options.baseUrl === undefined ? 'http://127.0.0.1:8787' : options.baseUrl
  const origin = normaliseLoopbackOrigin(baseUrl)
  return makeHandle(origin)
}

/**
 * Reject every URL that is not a loopback HTTP origin with an explicit port and no path, query
 * or fragment. A custom permitted origin is normalised to one canonical spelling. The error
 * is `TypeError` because the URL is an input-validation failure caught at construction,
 * before any HTTP request exists.
 */
function normaliseLoopbackOrigin(raw: string): string {
  if (typeof raw !== 'string' || raw.length === 0) {
    throw new TypeError(
      `baseUrl must be a non-empty loopback HTTP origin; received ${JSON.stringify(raw)}`,
    )
  }
  let parsed: URL
  try {
    parsed = new URL(raw)
  } catch {
    throw new TypeError(`baseUrl ${JSON.stringify(raw)} is not a valid URL`)
  }
  if (parsed.protocol !== 'http:') {
    throw new TypeError(`baseUrl must use http: (D-098); received ${parsed.protocol}`)
  }
  if (parsed.username !== '' || parsed.password !== '') {
    throw new TypeError('baseUrl must not carry credentials')
  }
  const host = parsed.hostname
  const isLoopback = host === '127.0.0.1' || host === '[::1]' || host === 'localhost'
  if (!isLoopback) {
    throw new TypeError(`baseUrl host ${JSON.stringify(host)} is not a loopback host`)
  }
  // WHATWG strips the scheme's default port from `URL.port`: `http://127.0.0.1:80` parses
  // to `URL.port === ''`, indistinguishable from `http://127.0.0.1` with no port. The
  // loopback discipline requires a written port, so inspect the original authority. A
  // malformed port (non-numeric or out of range) is also caught here, because `new URL`
  // throws first — `explicitPortOf` therefore agrees with the parser on what is malformed.
  if (!hasExplicitPort(raw)) {
    throw new TypeError('baseUrl must include an explicit port')
  }
  if (parsed.pathname !== '/' && parsed.pathname !== '') {
    throw new TypeError(`baseUrl must not carry a path; received ${parsed.pathname}`)
  }
  if (parsed.search !== '') {
    throw new TypeError(`baseUrl must not carry a query string; received ${parsed.search}`)
  }
  if (parsed.hash !== '') {
    throw new TypeError(`baseUrl must not carry a fragment; received ${parsed.hash}`)
  }
  // `parsed.host` already omits the default port for `http:`, so `http://127.0.0.1:80`
  // canonicalises to `http://127.0.0.1/` and a fetch from that URL still uses port 80.
  return `${parsed.protocol}//${parsed.host}/`
}

/**
 * Whether the authority in a raw URL string carries an explicit port — IPv4/hostname with
 * `:digits`, bracketed IPv6 with `]:digits`. Anything else (no colon, non-digit suffix,
 * bracketed form without a closing bracket) is treated as "no explicit port" or
 * "malformed", matching what `new URL` accepts and what the loopback discipline allows.
 *
 * `new URL` has already validated the port by the time this is called for an input that
 * parsed successfully, so a non-numeric port in the authority would have thrown above.
 */
function hasExplicitPort(raw: string): boolean {
  const schemeEnd = raw.indexOf('://')
  if (schemeEnd === -1) return false
  let after = raw.slice(schemeEnd + 3)
  // Strip a userinfo component if present (already forbidden, but the port still lives
  // past the `@`).
  const at = after.lastIndexOf('@')
  if (at !== -1) after = after.slice(at + 1)
  const pathStart = after.search(/[/?#]/)
  const authority = pathStart === -1 ? after : after.slice(0, pathStart)
  if (authority.startsWith('[')) {
    const close = authority.indexOf(']')
    if (close === -1) return false
    return /:\d+$/.test(authority.slice(close + 1))
  }
  return /:\d+$/.test(authority)
}

// ---------------------------------------------------------------- implementation

/**
 * One private request helper so every route uses the same loopback confinement. A 3xx
 * response is unexpected for every route the contract defines; treating it as a SdkProtocolError
 * (rather than following the redirect) is what keeps the SDK on its configured origin and
 * stops a request body from being forwarded to a peer outside the loopback. No retry, no
 * readiness probe, no launcher work — only the redirect guard lives here.
 */
async function sendRequest(
  url: string,
  init: { method?: string; headers?: Record<string, string>; body?: string },
): Promise<Response> {
  const res = await fetch(url, { ...init, redirect: 'manual' })
  if (res.status >= 300 && res.status < 400) {
    throw new SdkProtocolErrorImpl('request', res.status)
  }
  return res
}

/**
 * Construct a `Cutroom` handle that owns no process and stores no readiness state. The Slice 2
 * shape is the smallest one that exercises every route and every error type. `close()` flips a
 * flag, and every method reads it before validating or fetching.
 */
function makeHandle(baseUrl: string): Cutroom {
  let closed = false

  function assertOpen(): void {
    if (closed) {
      throw new SdkProtocolErrorImpl('request')
    }
  }

  return {
    async submit(request) {
      assertOpen()
      const parsed = SubmitRequest.safeParse(request)
      if (!parsed.success) throw new SdkProtocolErrorImpl('request')
      const res = await sendRequest(`${baseUrl}v1/runs`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(parsed.data),
      })
      return handleRouteResponse(res, 'submit') as Promise<SubmitResponse>
    },
    async find(requestId) {
      assertOpen()
      const res = await sendRequest(
        `${baseUrl}v1/runs?requestId=${encodeURIComponent(requestId)}`,
        { method: 'GET' },
      )
      return handleRouteResponse(res, 'find') as Promise<RunStatus>
    },
    async status(runId) {
      assertOpen()
      const res = await sendRequest(`${baseUrl}v1/runs/${encodeURIComponent(runId)}`, {
        method: 'GET',
      })
      return handleRouteResponse(res, 'status') as Promise<RunStatus>
    },
    async follow(runId, since) {
      assertOpen()
      const query = since === undefined ? '' : `?since=${encodeURIComponent(String(since))}`
      const res = await sendRequest(
        `${baseUrl}v1/runs/${encodeURIComponent(runId)}/events${query}`,
        {
          method: 'GET',
        },
      )
      return handleRouteResponse(res, 'follow') as Promise<EventsPage>
    },
    async result(runId) {
      assertOpen()
      const res = await sendRequest(`${baseUrl}v1/runs/${encodeURIComponent(runId)}/result`, {
        method: 'GET',
      })
      return handleRouteResponse(res, 'result') as Promise<RunResult | RunStatus>
    },
    async record(runId) {
      assertOpen()
      const res = await sendRequest(`${baseUrl}v1/runs/${encodeURIComponent(runId)}/record`, {
        method: 'GET',
      })
      return handleRouteResponse(res, 'record') as Promise<RunRecord | RunStatus>
    },
    async cancel(runId) {
      assertOpen()
      const res = await sendRequest(`${baseUrl}v1/runs/${encodeURIComponent(runId)}/cancel`, {
        method: 'POST',
      })
      return handleRouteResponse(res, 'cancel') as Promise<RunStatus>
    },
    async resume(runId, request) {
      assertOpen()
      const parsed = ResumeRequest.safeParse(request)
      if (!parsed.success) throw new SdkProtocolErrorImpl('request')
      const res = await sendRequest(`${baseUrl}v1/runs/${encodeURIComponent(runId)}/resume`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(parsed.data),
      })
      return handleRouteResponse(res, 'resume') as Promise<ResumeResponse>
    },
    async close() {
      closed = true
    },
  }
}

// ---------------------------------------------------------------- dispatch

/** Each route's success-and-defined-refusal schema, indexed by status. */
type RouteSchemas = {
  submit: { 202: typeof SubmitResponse; 409: typeof SubmitResponse; 422: typeof SubmitResponse }
  find: { 200: typeof RunStatus }
  status: { 200: typeof RunStatus }
  follow: { 200: typeof EventsPage }
  result: { 200: typeof RunResult; 409: typeof RunStatus }
  record: { 200: typeof RunRecord; 409: typeof RunStatus }
  cancel: { 200: typeof RunStatus }
  resume: {
    200: typeof ResumeResponse
    202: typeof ResumeResponse
    409: typeof ResumeResponse
    422: typeof ResumeResponse
  }
}

const ROUTE_SCHEMAS: RouteSchemas = {
  submit: { 202: SubmitResponse, 409: SubmitResponse, 422: SubmitResponse },
  find: { 200: RunStatus },
  status: { 200: RunStatus },
  follow: { 200: EventsPage },
  result: { 200: RunResult, 409: RunStatus },
  record: { 200: RunRecord, 409: RunStatus },
  cancel: { 200: RunStatus },
  resume: { 200: ResumeResponse, 202: ResumeResponse, 409: ResumeResponse, 422: ResumeResponse },
}

type RouteName = keyof RouteSchemas

async function handleRouteResponse<R extends RouteName>(res: Response, route: R): Promise<unknown> {
  const status = res.status
  const schemas = ROUTE_SCHEMAS[route] as Record<
    number,
    { safeParse: (x: unknown) => { success: boolean; data?: unknown } }
  >

  // Parse the body once, even when an error path will use it.
  const text = await res.text()
  let body: unknown
  try {
    body = JSON.parse(text)
  } catch {
    throw new SdkProtocolErrorImpl('request', status)
  }

  // Schema-valid 400, 404 or 500 ErrorResponse bodies → SdkApiError.
  if (status === 400 || status === 404 || status === 500) {
    const parsed = ErrorResponse.safeParse(body)
    if (parsed.success) {
      throw new SdkApiErrorImpl(status, parsed.data as ErrorResponse)
    }
    throw new SdkProtocolErrorImpl('request', status)
  }

  // A status defined by the route, with its expected body schema.
  const schema = schemas[status]
  if (schema !== undefined) {
    const parsed = schema.safeParse(body)
    if (parsed.success) return parsed.data
    throw new SdkProtocolErrorImpl('request', status)
  }

  // Anything else is unexpected.
  throw new SdkProtocolErrorImpl('request', status)
}

// ---------------------------------------------------------------- error classes

class SdkApiErrorImpl extends Error implements SdkApiError {
  readonly kind = 'api' as const
  readonly status: number
  readonly body: ErrorResponse
  constructor(status: number, body: ErrorResponse) {
    super(`sdk api error: ${status} ${body.error}: ${body.detail}`)
    this.status = status
    this.body = body
  }
}

class SdkProtocolErrorImpl extends Error implements SdkProtocolError {
  readonly kind = 'protocol' as const
  readonly stage: 'ready' | 'request'
  readonly status: number | undefined
  constructor(stage: 'ready' | 'request', status?: number) {
    super(`sdk protocol error: stage=${stage}${status === undefined ? '' : ` status=${status}`}`)
    this.stage = stage
    this.status = status
  }
}
