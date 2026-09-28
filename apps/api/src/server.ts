import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import type { AddressInfo } from 'node:net'
import {
  BUDGET_MD,
  closeDatabase,
  eventsAfter,
  openDatabase,
  readRecord,
  readReelCapCents,
  readResumeInputs,
  readRun,
  readRunByRequestId,
  requestCancel,
  resumeRun,
  submitRun,
  type Db,
  type ResumeService,
} from '@cutroom/domain'
import {
  CONTRACT_VERSION,
  ReadyResponse,
  ResumeRequest,
  SubmitRequest,
  type ErrorResponse,
  type EventsPage,
  type ResumeResponse,
  type RunRecord,
  type SubmitResponse,
} from '@cutroom/reel-contract'

// The engine's service: the contract's routes (packages/reel-contract/src/routes.ts) over plain
// HTTP (D-098) — submitting, following, cancelling and, since resume-failed, resuming a failed run.
// It stores what it is asked and reads what the worker wrote; handed a ResumeService, it makes a
// resume by copying the failed run's kept rows into a new run (S-162). What a resume keeps, what it
// costs and whether it is admitted are the service's to decide: this app plans nothing, holds no
// rate and never calls a provider (D-005).

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
  /**
   * What plans, admits and asks the owner about a caller's resume, built by `apps/service` from the
   * worker's own settings and questions file (S-161, S-162). Absent: the resume route answers `422`,
   * reason `unsupported` — the contract's "the engine is running but cannot yet".
   */
  resume?: ResumeService
  /** The cap file a resume is admitted against — the worker's own. Defaults to BUDGET.md (D-097). */
  budgetPath?: string
  /**
   * Live readiness: `true` only after the sole worker has completed startup, `false` before
   * (cutroom-sdk, S-173). The API calls this getter exactly once per `GET /v1/ready` request,
   * captures the result, and uses the captured value for both status and body — so a getter whose
   * answer changes between calls cannot return 503 with `ready: true` or 200 with `ready: false`.
   * Required.
   */
  ready: () => boolean
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

  // Every `until` is built: a plan, pictures (S-047) and a video (S-069, S-077).
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

type ResumeRefusal = Extract<ResumeResponse, { outcome: 'refused'; detail: string }>

const refuseResume = (
  runId: string,
  reason: ResumeRefusal['reason'],
  detail: string,
): ResumeRefusal => ({ contractVersion: V, outcome: 'refused', runId, reason, detail })

/**
 * A caller's resume of a run (docs/features/resume-failed.md, Gate 2 "How a resume is planned,
 * admitted and made"; S-161, S-162). The run first — an unknown one is 404, as on every route of a
 * run — then validity, version and schema, and only then what this engine can do: with no service,
 * 422 unsupported. The service decides against the cap the worker reads. A preview answers as the
 * call would and writes nothing; a call admitted makes the run in one immediate transaction, read and
 * decided inside it, due at once; a call refused at the per-reel cap asks the owner once, after it.
 */
function resume(
  db: Db,
  options: ApiOptions,
  runId: string,
  text: string,
): [number, ResumeResponse | ErrorResponse] {
  if (readRun(db, runId) === undefined) return [404, notFound('no such run')]
  let body: unknown
  try {
    body = JSON.parse(text)
  } catch {
    return [422, refuseResume(runId, 'invalid', 'the body is not JSON')]
  }
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return [422, refuseResume(runId, 'invalid', 'the body is not a JSON object')]
  }
  const fields = body as Record<string, unknown>
  if ('contractVersion' in fields && fields.contractVersion !== V) {
    const detail = `contractVersion ${String(fields.contractVersion)} is not supported`
    return [422, refuseResume(runId, 'version', detail)]
  }
  const parsed = ResumeRequest.safeParse(body)
  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((i) => `${i.path.join('.') || '(body)'}: ${i.message}`)
      .join('; ')
    return [422, refuseResume(runId, 'invalid', detail)]
  }
  const service = options.resume
  if (service === undefined) {
    const detail = 'this engine was started with no resume service, so it resumes no run yet'
    return [422, refuseResume(runId, 'unsupported', detail)]
  }

  const remake = parsed.data.remake ?? []
  const preview = parsed.data.preview === true
  const capCents = readReelCapCents(options.budgetPath ?? BUDGET_MD)
  const now = new Date()
  const decide = (reader: Pick<Db, 'select'>) => {
    const inputs = readResumeInputs(reader, runId)
    return {
      requestId: inputs.request.requestId,
      decided: service.decide(inputs, remake, capCents),
    }
  }
  // A preview reads through the connection and opens no transaction: it writes nothing (S-161).
  const { requestId, decided, made } = preview
    ? { ...decide(db), made: undefined }
    : db.transaction(
        (tx) => {
          const answer = decide(tx)
          const madeId =
            answer.decided.outcome === 'admitted'
              ? resumeRun(tx, runId, answer.decided.plan, {
                  now,
                  delayMs: 0,
                  resumeRequest: answer.decided.plan.named,
                })
              : undefined
          return { ...answer, made: madeId }
        },
        { behavior: 'immediate' },
      )

  if (decided.outcome === 'replayed') {
    const replayed = {
      outcome: 'accepted',
      runId: decided.runId,
      resumes: runId,
      replayed: true,
    } as const
    return [202, { contractVersion: V, ...replayed }]
  }
  if (decided.outcome === 'resumed') return [409, refuseResume(runId, 'resumed', decided.detail)]
  if (decided.outcome === 'refused') {
    const code = decided.reason === 'invalid' ? 422 : 409
    return [code, refuseResume(runId, decided.reason, decided.detail)]
  }
  const { plan, estimateCents, spentCents, ceilingCents } = decided
  const figures = { estimateCents, spentCents, capCents: decided.capCents, ceilingCents }
  if (preview) {
    const limit = decided.outcome === 'budget' ? { limit: decided.limit } : {}
    const answer = { outcome: 'preview', runId, remake: plan.remade, ...figures, ...limit } as const
    return [200, { contractVersion: V, ...answer }]
  }
  if (decided.outcome === 'budget') {
    // Every refusal at the per-reel cap asks the owner; one at the caller's ceiling is returned only
    // (D-097, D-100). Asked after the transaction, which wrote nothing.
    if (decided.limit === 'reel') {
      const named = plan.named
      const asked = { runId, requestId, by: 'caller', named, ...figures } as const
      service.askOwner({ ...asked, resumeEstimateCents: plan.estimateCents }, now)
    }
    const refused = { outcome: 'refused', runId, reason: 'budget', limit: decided.limit } as const
    return [409, { contractVersion: V, ...refused, ...figures }]
  }
  if (made === undefined) throw new Error(`the resume of run ${runId} was admitted and not made`)
  const accepted = { outcome: 'accepted', runId: made, resumes: runId, replayed: false } as const
  return [202, { contractVersion: V, ...accepted }]
}

const RUN_ROUTE = /^\/v1\/runs\/([^/]+)$/
const RUN_SUB_ROUTE = /^\/v1\/runs\/([^/]+)\/(events|result|record)$/
const CANCEL_ROUTE = /^\/v1\/runs\/([^/]+)\/cancel$/
const RESUME_ROUTE = /^\/v1\/runs\/([^/]+)\/resume$/
const WHOLE_NUMBER = /^\d+$/

async function handle(
  db: Db,
  options: ApiOptions,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const url = new URL(req.url ?? '/', `http://${LOOPBACK}`)
  const byId = RUN_ROUTE.exec(url.pathname)
  const sub = RUN_SUB_ROUTE.exec(url.pathname)
  const cancel = CANCEL_ROUTE.exec(url.pathname)
  const resumeOf = RESUME_ROUTE.exec(url.pathname)

  // Readiness, before run-route handling: a getter called once per request, the captured boolean
  // driving both status and body (cutroom-sdk, S-173). No request body, no path/query segment, no
  // settings read, no row written - and no read of `db` either. The `ReadyResponse` parse on the
  // body is a type guard for the static type, not a runtime check; the strict Zod schema in
  // `packages/reel-contract/src/ready.ts` is the runtime validation, owned by the consumer.
  if (req.method === 'GET' && url.pathname === '/v1/ready') {
    const ready = options.ready()
    const body: ReadyResponse = ready
      ? { contractVersion: V, ready: true }
      : { contractVersion: V, ready: false }
    return send(res, ready ? 200 : 503, body)
  }
  if (req.method === 'POST' && url.pathname === '/v1/runs') {
    const [code, body] = submit(db, await readBody(req))
    return send(res, code, body)
  }
  if (req.method === 'POST' && resumeOf !== null) {
    const runId = decodeURIComponent(resumeOf[1] as string)
    const [code, body] = resume(db, options, runId, await readBody(req))
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
    // Every picture made, every attempt's, in seq order, with each check it reached (S-046) — and in
    // a resumed run every picture and take copied into it, each naming the run it came from (S-162).
    const record: RunRecord = { contractVersion: V, runId, ...readRecord(db, runId) }
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
    handle(db, options, req, res).catch((error: unknown) => {
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
