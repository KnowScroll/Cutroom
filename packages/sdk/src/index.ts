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
import {
  launchChild,
  probeConnection,
  stopChild,
  type ChildProcess,
  type LauncherOptions,
} from './launcher.ts'
import { ReadyResponse } from '@cutroom/reel-contract'

// The typed local client for the reel engine (docs/features/cutroom-sdk.md, Gate 2 / Slice 3).
//
// Slice 3 adds the launcher lifecycle: probe for an existing engine, start one if absent,
// poll for readiness, handle the fixed-port race, and own the lifecycle of a spawned child.

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
 * The stable shape for a connection refusal, a child error or a readiness deadline.
 * `SdkConnectionError` is thrown when: no listener and no launcher (stage 'connect');
 * child error or exit with no eligible winner (stage 'start'); timeout while waiting
 * for a non-ready peer or a port-race winner (stage 'ready'); failure while closing
 * the owned child (stage 'close').
 */
export type SdkConnectionError = {
  kind: 'connection'
  stage: 'connect' | 'start' | 'ready' | 'close'
}

/** Every error the SDK throws. */
export type SdkError = SdkApiError | SdkProtocolError | SdkConnectionError

// ---------------------------------------------------------------- handle

/**
 * The configuration `createCutroom` accepts. Slice 3 adds launcher and timeout options.
 */
export type CreateCutroomOptions = {
  /**
   * The engine's loopback HTTP origin, with an explicit port. Defaults to
   * `http://127.0.0.1:8787`. Non-loopback hosts, HTTPS, credentials, paths, query strings,
   * fragments, and a missing port are rejected before any request is made (S-173, D-098).
   */
  baseUrl?: string
  /**
   * The program and argument vector to start when no engine is listening at `baseUrl`.
   * When absent and no engine is found, construction throws `SdkConnectionError` at stage
   * 'connect'. When present, the SDK spawns this program with `shell: false`, injects the
   * normalised origin's port as `CUTROOM_API_PORT`, waits for the engine's readiness
   * acknowledgement, and returns a handle that owns that child (S-175).
   */
  launcher?: {
    /** The program to execute. */
    command: string
    /** The arguments to pass. */
    args: readonly string[]
  }
  /**
   * Milliseconds to wait for readiness when starting an owned engine or polling a 503 peer.
   * Must be a positive whole number. Defaults to 30000. A non-positive, non-integer, or
   * non-finite value throws `TypeError` at construction before any probe or spawn.
   */
  readyTimeoutMs?: number
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
   * Close the handle. If the SDK owns a child process (it started one with the launcher),
   * `close()` writes `stop` on the child's stdin and waits for its exit. If the handle joined
   * an existing engine, `close()` is local only and the engine continues running.
   * After `close()`, any further method call rejects with `SdkProtocolError { stage: 'request' }`
   * and no HTTP request is made. `close()` is idempotent.
   */
  close(): Promise<void>
}

export async function createCutroom(options: CreateCutroomOptions): Promise<Cutroom> {
  return _createCutroom(options)
}

// ---------------------------------------------------------------- private state

type HandleState =
  | { status: 'probing'; baseUrl: string; options: ResolvedOptions }
  | { status: 'joined'; baseUrl: string }
  | {
      status: 'owned'
      baseUrl: string
      child: ChildProcess
      stop: () => Promise<void>
      waitForExit: () => Promise<number>
    }
  | { status: 'closed' }

/** Normalised options with defaults applied. */
interface ResolvedOptions {
  baseUrl: string
  launcher?: { command: string; args: readonly string[] }
  readyTimeoutMs: number
}

async function _createCutroom(options: CreateCutroomOptions): Promise<Cutroom> {
  // Step 1: normalise and validate baseUrl
  const baseUrl = options.baseUrl === undefined ? 'http://127.0.0.1:8787' : options.baseUrl
  const origin = normaliseLoopbackOrigin(baseUrl)

  // Step 2: validate timeout before any probe or spawn
  const readyTimeoutMs = options.readyTimeoutMs
  if (readyTimeoutMs !== undefined) {
    if (
      !Number.isFinite(readyTimeoutMs) ||
      !Number.isInteger(readyTimeoutMs) ||
      readyTimeoutMs <= 0
    ) {
      throw new TypeError(
        `readyTimeoutMs must be a positive whole number; received ${JSON.stringify(readyTimeoutMs)}`,
      )
    }
  }
  const timeoutMs = readyTimeoutMs ?? 30_000

  const resolvedOptions: ResolvedOptions = {
    baseUrl: origin,
    launcher: options.launcher,
    readyTimeoutMs: timeoutMs,
  }

  // Step 3: probe for existing engine
  const connectionResult = await probeConnection(origin)

  if (connectionResult === null) {
    // Something is listening — check if it's a valid Cutroom readiness endpoint
    const readyResult = await checkReadiness(origin, timeoutMs)
    if (readyResult === 'not-ready') {
      // A listener exists and was polled until the deadline — timeout at 'ready' stage
      throw new SdkConnectionErrorImpl('ready')
    }
    if (readyResult === 'protocol-error') {
      throw new SdkProtocolErrorImpl('ready')
    }
    // Valid ready response — join it
    return makeHandle(origin, { status: 'joined', baseUrl: origin })
  }

  // No listener found
  if (connectionResult === 'refused') {
    if (!options.launcher) {
      // No listener and no launcher — fail at connect stage
      throw new SdkConnectionErrorImpl('connect')
    }
    // Start the owned child
    const ownedResult = await startOwnedEngine(origin, resolvedOptions)
    if (!ownedResult.ok) {
      throw ownedResult.error
    }
    return makeHandle(origin, {
      status: 'owned',
      baseUrl: origin,
      child: ownedResult.child,
      stop: ownedResult.stop,
      waitForExit: ownedResult.waitForExit,
    })
  }

  // Connection timed out (unlikely for loopback, but possible)
  if (!options.launcher) {
    throw new SdkConnectionErrorImpl('connect')
  }
  const ownedResult = await startOwnedEngine(origin, resolvedOptions)
  if (!ownedResult.ok) {
    throw ownedResult.error
  }
  return makeHandle(origin, {
    status: 'owned',
    baseUrl: origin,
    child: ownedResult.child,
    stop: ownedResult.stop,
    waitForExit: ownedResult.waitForExit,
  })
}

// ---------------------------------------------------------------- ownership and readiness

/**
 * Check if the listener at baseUrl is a valid Cutroom readiness endpoint.
 * Returns 'ready', 'not-ready', or 'protocol-error'.
 */
async function checkReadiness(
  baseUrl: string,
  timeoutMs: number,
): Promise<'ready' | 'not-ready' | 'protocol-error'> {
  const deadline = Date.now() + timeoutMs
  const pollIntervalMs = 100

  while (Date.now() < deadline) {
    try {
      const res = await fetch(readinessUrl(baseUrl), {
        signal: AbortSignal.timeout(pollIntervalMs),
        redirect: 'manual',
      })
      const text = await res.text()
      let json: unknown
      try {
        json = JSON.parse(text)
      } catch {
        return 'protocol-error'
      }

      if (res.status === 200) {
        // 200 is valid only with strict { contractVersion: 1, ready: true }.
        // A 200 with ready:false, extra key, wrong version, or malformed JSON is protocol-error.
        const parsed = ReadyResponse.safeParse(json)
        if (parsed.success && (parsed.data as { ready: boolean }).ready === true) {
          return 'ready'
        }
        return 'protocol-error'
      } else if (res.status === 503) {
        // 503 is valid only with strict { contractVersion: 1, ready: false }.
        // A 503 with ready:true, extra key, wrong version, or malformed JSON is protocol-error.
        // Only a recognised 503/false is eligible for bounded polling.
        const parsed = ReadyResponse.safeParse(json)
        if (!parsed.success || (parsed.data as { ready: boolean }).ready !== false) {
          return 'protocol-error'
        }
        const remaining = deadline - Date.now()
        await sleep(Math.min(pollIntervalMs, Math.max(0, remaining)))
      } else {
        // Unexpected status
        return 'protocol-error'
      }
    } catch {
      // Connection error — keep polling
      const remaining = deadline - Date.now()
      await sleep(Math.min(pollIntervalMs, Math.max(0, remaining)))
    }
  }
  return 'not-ready'
}

/** Start an owned engine using the configured launcher. */
async function startOwnedEngine(
  baseUrl: string,
  options: ResolvedOptions,
): Promise<
  | {
      ok: true
      child: ChildProcess
      stop: () => Promise<void>
      waitForExit: () => Promise<number>
    }
  | { ok: false; error: SdkConnectionError | SdkProtocolError }
> {
  // Normalize baseUrl to avoid double-slashes when appending paths
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
  if (!options.launcher) {
    return { ok: false, error: new SdkConnectionErrorImpl('connect') }
  }

  // Extract the port from the baseUrl
  const port = extractPort(normalizedBase)
  // The private launcher inherits the caller's ordinary environment and applies this one
  // SDK-owned override. The SDK does not inspect or log individual environment values.
  const env = { CUTROOM_API_PORT: String(port) }

  const launcherOptions: LauncherOptions = {
    command: options.launcher.command,
    args: options.launcher.args,
    env,
    baseUrl,
    timeoutMs: options.readyTimeoutMs,
  }

  // Launch the child
  const { child, waitForExit } = launchChild(launcherOptions)
  const protocolFailure = async (): Promise<{ ok: false; error: SdkProtocolError }> => {
    try {
      await stopChild(child)
    } catch {
      // Preserve the protocol failure; cleanup is best-effort after construction fails.
    }
    return { ok: false, error: new SdkProtocolErrorImpl('ready') }
  }

  // Wait for the child to become ready
  const deadline = Date.now() + options.readyTimeoutMs
  const pollIntervalMs = 100

  // Start monitoring child exit
  let childExited = false
  let childFailed = false
  let childExitCode = 0
  waitForExit()
    .then((code) => {
      childExited = true
      childExitCode = code
    })
    .catch(() => {
      childFailed = true
    })

  while (Date.now() < deadline) {
    if (childExited || childFailed) {
      // Child exited before ready — check if there's now a valid engine at the port (winner)
      const probeResult = await probeConnection(normalizedBase)
      if (probeResult === null) {
        // Something is now listening — could be the winner
        const readyResult = await checkReadiness(normalizedBase, Math.max(deadline - Date.now(), 0))
        if (readyResult === 'ready') {
          // There's now a valid engine — join it
          return {
            ok: true,
            child,
            stop: async () => {},
            waitForExit: async () => childExitCode,
          }
        }
      }
      return { ok: false, error: new SdkConnectionErrorImpl('start') }
    }

    try {
      const res = await fetch(readinessUrl(normalizedBase), {
        signal: AbortSignal.timeout(pollIntervalMs),
        redirect: 'manual',
      })
      const text = await res.text()
      let json: unknown
      try {
        json = JSON.parse(text)
      } catch {
        return protocolFailure()
      }

      if (res.status === 200) {
        // 200 is valid only with strict { contractVersion: 1, ready: true }.
        // A 200 with ready:false, extra key, wrong version, or malformed JSON is protocol-error.
        const parsed = ReadyResponse.safeParse(json)
        if (parsed.success && (parsed.data as { ready: boolean }).ready === true) {
          // Ready!
          return {
            ok: true,
            child,
            stop: () => stopChild(child),
            waitForExit,
          }
        }
        return protocolFailure()
      } else if (res.status === 503) {
        // 503 is valid only with strict { contractVersion: 1, ready: false }.
        // A 503 with ready:true, extra key, wrong version, or malformed JSON is protocol-error.
        const parsed = ReadyResponse.safeParse(json)
        if (!parsed.success || (parsed.data as { ready: boolean }).ready !== false) {
          return protocolFailure()
        }
        // Recognised non-ready peer — keep polling
        await sleep(Math.min(pollIntervalMs, deadline - Date.now()))
      } else {
        return protocolFailure()
      }
    } catch {
      // Connection error — keep polling
      await sleep(Math.min(pollIntervalMs, deadline - Date.now()))
    }
  }

  // Deadline expired
  if (childExited || childFailed) {
    return { ok: false, error: new SdkConnectionErrorImpl('start') }
  }
  // Timeout waiting for readiness — stop the child
  try {
    await stopChild(child)
  } catch {
    // Ignore stop errors
  }
  return { ok: false, error: new SdkConnectionErrorImpl('ready') }
}

/** Extract the port number from a baseUrl like 'http://127.0.0.1:8787/'. */
function extractPort(baseUrl: string): number {
  const port = explicitPort(baseUrl)
  if (port === undefined) throw new TypeError('normalised baseUrl lost its explicit port')
  return Number(port)
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)))
}

// ---------------------------------------------------------------- URL normalisation

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
  const port = explicitPort(raw)
  if (port === undefined) {
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
  return `${parsed.protocol}//${parsed.hostname}:${Number(port)}/`
}

/**
 * Whether the authority in a raw URL string carries an explicit port.
 */
function explicitPort(raw: string): string | undefined {
  const schemeEnd = raw.indexOf('://')
  if (schemeEnd === -1) return undefined
  let after = raw.slice(schemeEnd + 3)
  const at = after.lastIndexOf('@')
  if (at !== -1) after = after.slice(at + 1)
  const pathStart = after.search(/[/?#]/)
  const authority = pathStart === -1 ? after : after.slice(0, pathStart)
  if (authority.startsWith('[')) {
    const close = authority.indexOf(']')
    if (close === -1) return undefined
    return /^:(\d+)$/.exec(authority.slice(close + 1))?.[1]
  }
  return /:(\d+)$/.exec(authority)?.[1]
}

function readinessUrl(baseUrl: string): string {
  return new URL('/v1/ready', baseUrl).toString()
}

// ---------------------------------------------------------------- handle

/**
 * Construct a `Cutroom` handle. The `state` tracks whether the SDK owns a child process.
 * `close()` behaves differently for joined vs owned handles.
 */
function makeHandle(baseUrl: string, state: HandleState): Cutroom {
  let closed = false

  function assertOpen(): void {
    if (closed) {
      throw new SdkProtocolErrorImpl('request')
    }
  }

  async function close(): Promise<void> {
    if (closed) return
    closed = true
    if (state.status === 'owned') {
      try {
        await state.stop()
      } catch {
        throw new SdkConnectionErrorImpl('close')
      }
    }
    // For 'joined' state, close is purely local — no process to stop
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
        { method: 'GET' },
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
    close,
  }
}

// ---------------------------------------------------------------- request helper

/**
 * One private request helper so every route uses the same loopback confinement.
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

// ---------------------------------------------------------------- dispatch

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

  const text = await res.text()
  let body: unknown
  try {
    body = JSON.parse(text)
  } catch {
    throw new SdkProtocolErrorImpl('request', status)
  }

  if (status === 400 || status === 404 || status === 500) {
    const parsed = ErrorResponse.safeParse(body)
    if (parsed.success) {
      throw new SdkApiErrorImpl(status, parsed.data as ErrorResponse)
    }
    throw new SdkProtocolErrorImpl('request', status)
  }

  const schema = schemas[status]
  if (schema !== undefined) {
    const parsed = schema.safeParse(body)
    if (parsed.success) return parsed.data
    throw new SdkProtocolErrorImpl('request', status)
  }

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

class SdkConnectionErrorImpl extends Error implements SdkConnectionError {
  readonly kind = 'connection' as const
  readonly stage: 'connect' | 'start' | 'ready' | 'close'
  constructor(stage: 'connect' | 'start' | 'ready' | 'close') {
    super(`sdk connection error: stage=${stage}`)
    this.stage = stage
  }
}
