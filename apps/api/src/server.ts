import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import type { AddressInfo } from 'node:net'
import {
  closeDatabase,
  eventsAfter,
  openDatabase,
  readRun,
  readRunByRequestId,
  requestCancel,
  submitRun,
  type Db,
} from '@cutroom/domain'
import {
  CONTRACT_VERSION,
  SubmitRequest,
  type ErrorResponse,
  type EventsPage,
  type RunRecord,
  type SubmitResponse,
} from '@cutroom/reel-contract'

// The engine's service: the contract's routes (packages/reel-contract/src/routes.ts) over plain
// HTTP (D-098). It stores what it is asked and reads what the worker wrote. It never calls a
// provider (D-005).

/**
 * Loopback only, with no authentication — Phase 1's assumption, recorded as such in D-098. Not a
 * setting: a service that could be told to listen elsewhere could be told so by mistake.
 */
const LOOPBACK = '127.0.0.1'

export interface ApiOptions {
  /** The database file (D-086). */
  dbPath: string
  /** 0, the default, takes any free port. */
  port?: number
}

export interface Api {
  baseUrl: string
  /** Where the server is actually listening, as the operating system reports it. */
  address: AddressInfo
  stop(): Promise<void>
}

type Refusal = Extract<SubmitResponse, { outcome: 'refused' }>

const V = CONTRACT_VERSION

const notFound = (detail: string): ErrorResponse => ({
  contractVersion: V,
  error: 'not-found',
  detail,
})
const invalid = (detail: string): ErrorResponse => ({
  contractVersion: V,
  error: 'invalid',
  detail,
})

function refuse(reason: Refusal['reason'], detail: string, requestId?: string): Refusal {
  return requestId === undefined
    ? { contractVersion: V, outcome: 'refused', reason, detail }
    : { contractVersion: V, outcome: 'refused', requestId, reason, detail }
}

function send(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json' })
  res.end(JSON.stringify(body))
}

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk as Buffer)
  return Buffer.concat(chunks).toString('utf8')
}

/**
 * Validity first — version, schema, then what this engine can build — and only then whether the
 * requestId was used before, so an invalid body is 422 even when its id is known.
 */
function submit(db: Db, text: string): [number, SubmitResponse] {
  let body: unknown
  try {
    body = JSON.parse(text)
  } catch {
    return [422, refuse('invalid', 'the body is not JSON')]
  }
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return [422, refuse('invalid', 'the body is not a JSON object')]
  }
  const fields = body as Record<string, unknown>
  const requestId =
    typeof fields.requestId === 'string' && fields.requestId.length > 0
      ? fields.requestId
      : undefined

  if ('contractVersion' in fields && fields.contractVersion !== V) {
    const detail = `contractVersion ${String(fields.contractVersion)} is not supported`
    return [422, refuse('version', detail, requestId)]
  }
  const parsed = SubmitRequest.safeParse(body)
  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((i) => `${i.path.join('.') || '(body)'}: ${i.message}`)
      .join('; ')
    return [422, refuse('invalid', detail, requestId)]
  }
  const request = parsed.data

  // D-108: this engine plans; pictures and video are reel-stills' and reel-render's.
  if (request.options.until !== 'plan') {
    const detail = `until '${request.options.until}' is not built yet: this engine answers with a plan only`
    return [422, refuse('unsupported', detail, request.requestId)]
  }
  // D-110: two plans may differ on shotCount only. Absent means shotCount (D-092).
  const axis = request.options.planVaryOn
  if (axis !== undefined && axis !== 'shotCount') {
    const detail = `planVaryOn '${axis}' is not built yet: plans differ only on shotCount`
    return [422, refuse('unsupported', detail, request.requestId)]
  }

  const stored = submitRun(db, request, text)
  if (stored.outcome === 'conflict') {
    const detail = 'this requestId was already used with different content'
    return [409, refuse('conflict', detail, request.requestId)]
  }
  return [
    202,
    {
      contractVersion: V,
      outcome: 'accepted',
      requestId: request.requestId,
      runId: stored.runId,
      replayed: stored.outcome === 'replayed',
    },
  ]
}

const RUN_ROUTE = /^\/v1\/runs\/([^/]+)$/
const RUN_SUB_ROUTE = /^\/v1\/runs\/([^/]+)\/(events|result|record)$/
const CANCEL_ROUTE = /^\/v1\/runs\/([^/]+)\/cancel$/
const WHOLE_NUMBER = /^\d+$/

async function handle(db: Db, req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? '/', `http://${LOOPBACK}`)
  const byId = RUN_ROUTE.exec(url.pathname)
  const sub = RUN_SUB_ROUTE.exec(url.pathname)
  const cancel = CANCEL_ROUTE.exec(url.pathname)

  if (req.method === 'POST' && url.pathname === '/v1/runs') {
    const [code, body] = submit(db, await readBody(req))
    return send(res, code, body)
  }
  if (req.method === 'POST' && cancel !== null) {
    const found = requestCancel(db, decodeURIComponent(cancel[1] as string))
    if (found === undefined) return send(res, 404, notFound('no such run'))
    return send(res, 200, found.status)
  }
  if (req.method === 'GET' && url.pathname === '/v1/runs') {
    const requestId = url.searchParams.get('requestId')
    if (requestId === null || requestId === '') {
      return send(res, 400, invalid('requestId is required'))
    }
    const found = readRunByRequestId(db, requestId)
    if (found === undefined) return send(res, 404, notFound(`no run for requestId '${requestId}'`))
    return send(res, 200, found.status)
  }
  if (req.method === 'GET' && sub !== null) {
    const runId = decodeURIComponent(sub[1] as string)
    const found = readRun(db, runId)
    if (found === undefined) return send(res, 404, notFound('no such run'))

    if (sub[2] === 'events') {
      const raw = url.searchParams.get('since')
      if (raw !== null && !WHOLE_NUMBER.test(raw)) {
        return send(res, 400, invalid('since must be a whole number, 0 or more'))
      }
      const since = raw === null ? 0 : Number(raw)
      const events = eventsAfter(db, runId, since)
      const page: EventsPage = {
        contractVersion: V,
        runId,
        events,
        nextSince: events.at(-1)?.seq ?? since,
      }
      return send(res, 200, page)
    }

    if (found.result === undefined) return send(res, 409, found.status)
    if (sub[2] === 'result') return send(res, 200, found.result)
    // This engine makes no pictures and no degradations yet, so a finished run's record is empty.
    const record: RunRecord = { contractVersion: V, runId, pictures: [], degradations: [] }
    return send(res, 200, record)
  }
  if (req.method === 'GET' && byId !== null) {
    const found = readRun(db, decodeURIComponent(byId[1] as string))
    if (found === undefined) return send(res, 404, notFound('no such run'))
    return send(res, 200, found.status)
  }
  return send(res, 404, notFound(`no route ${req.method ?? ''} ${url.pathname}`))
}

export async function startApi(options: ApiOptions): Promise<Api> {
  const db = openDatabase(options.dbPath)

  const server = createServer((req, res) => {
    handle(db, req, res).catch((error: unknown) => {
      const detail = error instanceof Error ? error.message : String(error)
      send(res, 500, { contractVersion: V, error: 'internal', detail } satisfies ErrorResponse)
    })
  })
  await new Promise<void>((resolve) => server.listen(options.port ?? 0, LOOPBACK, resolve))
  const address = server.address() as AddressInfo

  return {
    baseUrl: `http://${LOOPBACK}:${address.port}`,
    address,
    async stop() {
      server.closeAllConnections()
      await new Promise<void>((resolve) => server.close(() => resolve()))
      closeDatabase(db)
    },
  }
}
