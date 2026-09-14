import { createHash, randomUUID } from 'node:crypto'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import type { AddressInfo } from 'node:net'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import {
  CONTRACT_VERSION,
  SubmitRequest,
  type ErrorResponse,
  type EventsPage,
  type RunRecord,
  type RunResult,
  type RunStatus,
  type SubmitResponse,
} from '@cutroom/reel-contract'

/**
 * A stand-in for the reel engine's service, honouring docs/features/reel-contract.md.
 *
 * It exists so the contract can be proven complete and consistent before any engine exists. It
 * proves nothing about the real engine. It lives in tests/, never in a package (D-094), and it
 * keeps its runs, request hashes, planned steps and events in a real database file, so a later
 * slice can stop and restart it on the same storage and the same runs carry on.
 *
 * Runs do not progress on their own. A test moves one forward with `advance` or `runToEnd`, which
 * is what lets a test observe a run mid-way.
 */

export type Until = 'plan' | 'stills' | 'video'

export interface StandInOptions {
  /** A directory the caller owns; the database file and artifact paths live inside it. */
  storageDir: string
  /** Which `until` values this stand-in will accept — anything else is refused as unsupported. */
  canProduce: readonly Until[]
}

export interface StandIn {
  baseUrl: string
  storagePath: string
  /** Move a run forward by one step: append that step's events, and finish it if it was the last. */
  advance(runId: string): void
  /** Advance a run until its last event says it has finished. */
  runToEnd(runId: string): void
  stop(): Promise<void>
}

/** What a run will do, decided when it is accepted and stored with it. */
type EventBody = Record<string, unknown>
type Step = { events: EventBody[]; finish?: { result: RunResult; record: RunRecord } }

type Refusal = Extract<SubmitResponse, { outcome: 'refused' }>

const V = CONTRACT_VERSION

/** JSON with keys sorted at every depth, so two bodies that differ only in key order compare equal. */
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  if (value !== null && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    const keys = Object.keys(obj).sort()
    return `{${keys.map((k) => `${JSON.stringify(k)}:${canonical(obj[k])}`).join(',')}}`
  }
  return JSON.stringify(value)
}

// The hash is taken over the PARSED request, and zod rebuilds a strict object in its schema's
// key order — so on today's parser, key order is already normalised before `canonical` runs, and
// removing `canonical` changes no test result. A mutation run showed exactly that. It is kept
// anyway: the rule is that content, not key order, identifies a request, and that should not
// depend on how one library orders its output. The realistic regression — hashing the raw body
// text as sent — IS caught by check 13, and was shown to be.
const hashOf = (value: unknown) => createHash('sha256').update(canonical(value)).digest('hex')

function send(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json' })
  res.end(JSON.stringify(body))
}

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

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk as Buffer)
  return Buffer.concat(chunks).toString('utf8')
}

const RUN_ROUTE = /^\/v1\/runs\/([^/]+)$/
const RUN_SUB_ROUTE = /^\/v1\/runs\/([^/]+)\/(events|result|record)$/
const WHOLE_NUMBER = /^\d+$/

export async function startStandIn(options: StandInOptions): Promise<StandIn> {
  const storagePath = join(options.storageDir, 'stand-in.sqlite')
  const db = new DatabaseSync(storagePath)
  db.exec(`
    CREATE TABLE IF NOT EXISTS runs (
      run_id     TEXT PRIMARY KEY,
      request_id TEXT NOT NULL UNIQUE,
      body_hash  TEXT NOT NULL,
      until      TEXT NOT NULL,
      state      TEXT NOT NULL,
      steps      TEXT NOT NULL,
      cursor     INTEGER NOT NULL DEFAULT 0,
      result     TEXT,
      record     TEXT
    );
    CREATE TABLE IF NOT EXISTS events (
      run_id TEXT    NOT NULL,
      seq    INTEGER NOT NULL,
      body   TEXT    NOT NULL,
      PRIMARY KEY (run_id, seq)
    );
  `)

  const runByRequest = db.prepare('SELECT run_id, body_hash FROM runs WHERE request_id = ?')
  const runById = db.prepare('SELECT run_id, request_id, state FROM runs WHERE run_id = ?')
  const lastSeq = db.prepare('SELECT COALESCE(MAX(seq), 0) AS last FROM events WHERE run_id = ?')
  const insertRun = db.prepare(
    'INSERT INTO runs (run_id, request_id, body_hash, until, state, steps) VALUES (?, ?, ?, ?, ?, ?)',
  )
  const insertEvent = db.prepare('INSERT INTO events (run_id, seq, body) VALUES (?, ?, ?)')
  const progress = db.prepare(
    'SELECT state, steps, cursor, result, record FROM runs WHERE run_id = ?',
  )
  const moveCursor = db.prepare('UPDATE runs SET cursor = ? WHERE run_id = ?')
  const finishRun = db.prepare(
    "UPDATE runs SET state = 'finished', result = ?, record = ? WHERE run_id = ?",
  )
  const eventsAfter = db.prepare(
    'SELECT body FROM events WHERE run_id = ? AND seq > ? ORDER BY seq',
  )

  function status(runId: string): RunStatus | undefined {
    const run = runById.get(runId) as
      { run_id: string; request_id: string; state: string } | undefined
    if (run === undefined) return undefined
    const { last } = lastSeq.get(runId) as { last: number }
    return {
      contractVersion: V,
      runId: run.run_id,
      requestId: run.request_id,
      state: run.state === 'finished' ? 'finished' : 'running',
      lastSeq: Number(last),
    }
  }

  function append(runId: string, body: EventBody): void {
    const { last } = lastSeq.get(runId) as { last: number }
    const seq = Number(last) + 1
    const event = { contractVersion: V, runId, seq, at: new Date().toISOString(), ...body }
    insertEvent.run(runId, seq, JSON.stringify(event))
  }

  /** A run that completes normally, shaped by its `until`. */
  function completionSteps(runId: string, request: SubmitRequest): Step[] {
    const until = request.options.until
    const artifacts = join(options.storageDir, 'artifacts', runId)
    const shots = request.narration.slice(0, 6).map((_, i) => `s${i + 1}`)
    const estimateCents = 200
    const steps: Step[] = [
      { events: [{ type: 'stage.started', stage: 'plan' }] },
      { events: [{ type: 'stage.finished', stage: 'plan' }] },
    ]
    const pictures: RunRecord['pictures'] = []
    const stills: Array<{ pictureId: string; shotId: string; path: string }> = []

    if (until !== 'plan') {
      steps.push({ events: [{ type: 'stage.started', stage: 'stills' }] })
      shots.forEach((shotId, i) => {
        // The first shot keeps both best-of-2 candidates in the record (D-042); one is chosen.
        for (const candidate of i === 0 ? ['a', 'b'] : ['a']) {
          const pictureId = `${runId}-${shotId}-${candidate}`
          const chosen = candidate === 'a'
          const outcome = !chosen ? 'fail' : i === 1 ? 'accept_with_label' : 'accept'
          pictures.push({
            pictureId,
            shotId,
            chosen,
            observationId: `obs-${pictureId}`,
            reconciliationId: `rec-${pictureId}`,
            checks: [{ gate: '1', step: 'reconcile', outcome }],
          })
          steps.push({ events: [{ type: 'verdict', gate: '1', outcome, shotId }] })
          if (chosen) stills.push({ pictureId, shotId, path: join(artifacts, `${pictureId}.png`) })
        }
      })
      steps.push({ events: [{ type: 'stage.finished', stage: 'stills' }] })
    }

    const lastShot = shots.at(-1) as string
    const degradations = until === 'video' ? [{ shotId: lastShot, reason: 'held as a still' }] : []
    if (until === 'video') {
      steps.push({ events: [{ type: 'stage.started', stage: 'video' }] })
      steps.push({ events: [{ type: 'degraded', shotId: lastShot, reason: 'held as a still' }] })
      steps.push({ events: [{ type: 'stage.finished', stage: 'video' }] })
    }

    const common = { contractVersion: V, runId, requestId: request.requestId }
    let result: RunResult
    if (until === 'plan') {
      result = { ...common, costCents: 0, status: 'completed', until, estimateCents }
    } else if (until === 'stills') {
      result = {
        ...common,
        costCents: 60,
        status: 'completed',
        until,
        estimateCents,
        stills,
        degradations,
      }
    } else {
      result = {
        ...common,
        costCents: estimateCents,
        status: 'completed',
        until,
        estimateCents,
        stills,
        video: { path: join(artifacts, 'reel.mp4') },
        degradations,
      }
    }
    const record: RunRecord = { contractVersion: V, runId, pictures, degradations }
    steps.push({
      events: [{ type: 'run.finished', status: 'completed' }],
      finish: { result, record },
    })
    return steps
  }

  function advance(runId: string): void {
    const run = progress.get(runId) as { state: string; steps: string; cursor: number } | undefined
    if (run === undefined || run.state === 'finished') return
    const steps = JSON.parse(run.steps) as Step[]
    const step = steps[Number(run.cursor)]
    if (step === undefined) return
    for (const body of step.events) append(runId, body)
    moveCursor.run(Number(run.cursor) + 1, runId)
    if (step.finish !== undefined) {
      finishRun.run(JSON.stringify(step.finish.result), JSON.stringify(step.finish.record), runId)
    }
  }

  function submit(text: string): [number, SubmitResponse] {
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

    // Validity first — an invalid body is 422 even if its requestId was used before.
    if ('contractVersion' in fields && fields.contractVersion !== V) {
      return [
        422,
        refuse(
          'version',
          `contractVersion ${String(fields.contractVersion)} is not supported`,
          requestId,
        ),
      ]
    }
    const parsed = SubmitRequest.safeParse(body)
    if (!parsed.success) {
      const detail = parsed.error.issues
        .map((i) => `${i.path.join('.') || '(body)'}: ${i.message}`)
        .join('; ')
      return [422, refuse('invalid', detail, requestId)]
    }
    const request = parsed.data
    if (!options.canProduce.includes(request.options.until)) {
      return [
        422,
        refuse(
          'unsupported',
          `this service cannot produce until '${request.options.until}'`,
          request.requestId,
        ),
      ]
    }

    const hash = hashOf(request)
    const existing = runByRequest.get(request.requestId) as
      { run_id: string; body_hash: string } | undefined
    if (existing !== undefined) {
      if (existing.body_hash === hash) {
        return [
          202,
          {
            contractVersion: V,
            outcome: 'accepted',
            requestId: request.requestId,
            runId: existing.run_id,
            replayed: true,
          },
        ]
      }
      return [
        409,
        refuse(
          'conflict',
          'this requestId was already used with different content',
          request.requestId,
        ),
      ]
    }

    const runId = randomUUID()
    insertRun.run(
      runId,
      request.requestId,
      hash,
      request.options.until,
      'running',
      JSON.stringify(completionSteps(runId, request)),
    )
    append(runId, { type: 'run.accepted' })
    return [
      202,
      {
        contractVersion: V,
        outcome: 'accepted',
        requestId: request.requestId,
        runId,
        replayed: false,
      },
    ]
  }

  async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = new URL(req.url ?? '/', 'http://stand-in')
    const byId = RUN_ROUTE.exec(url.pathname)
    const sub = RUN_SUB_ROUTE.exec(url.pathname)

    if (req.method === 'POST' && url.pathname === '/v1/runs') {
      const [code, body] = submit(await readBody(req))
      return send(res, code, body)
    }
    if (req.method === 'GET' && url.pathname === '/v1/runs') {
      const requestId = url.searchParams.get('requestId')
      if (requestId === null || requestId === '') {
        return send(res, 400, invalid('requestId is required'))
      }
      const run = runByRequest.get(requestId) as { run_id: string } | undefined
      if (run === undefined) return send(res, 404, notFound(`no run for requestId '${requestId}'`))
      return send(res, 200, status(run.run_id))
    }
    if (req.method === 'GET' && sub !== null) {
      const runId = decodeURIComponent(sub[1] as string)
      const found = status(runId)
      if (found === undefined) return send(res, 404, notFound('no such run'))

      if (sub[2] === 'events') {
        const raw = url.searchParams.get('since')
        if (raw !== null && !WHOLE_NUMBER.test(raw)) {
          return send(res, 400, invalid('since must be a whole number, 0 or more'))
        }
        const since = raw === null ? 0 : Number(raw)
        const rows = eventsAfter.all(runId, since) as Array<{ body: string }>
        const events = rows.map((r) => JSON.parse(r.body) as EventsPage['events'][number])
        const page: EventsPage = {
          contractVersion: V,
          runId,
          events,
          nextSince: events.at(-1)?.seq ?? since,
        }
        return send(res, 200, page)
      }

      if (found.state !== 'finished') return send(res, 409, found)
      const done = progress.get(runId) as { result: string; record: string }
      return send(res, 200, JSON.parse(sub[2] === 'result' ? done.result : done.record))
    }
    if (req.method === 'GET' && byId !== null) {
      const found = status(decodeURIComponent(byId[1] as string))
      if (found === undefined) return send(res, 404, notFound('no such run'))
      return send(res, 200, found)
    }
    return send(res, 404, notFound(`no route ${req.method ?? ''} ${url.pathname}`))
  }

  const server = createServer((req, res) => {
    handle(req, res).catch((error: unknown) => {
      const detail = error instanceof Error ? error.message : String(error)
      send(res, 500, { contractVersion: V, error: 'internal', detail } satisfies ErrorResponse)
    })
  })

  // Loopback only (D-098).
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address() as AddressInfo

  return {
    baseUrl: `http://127.0.0.1:${port}`,
    storagePath,
    advance,
    runToEnd(runId: string) {
      for (let guard = 0; guard < 1000; guard += 1) {
        const run = progress.get(runId) as { state: string } | undefined
        if (run === undefined || run.state === 'finished') return
        advance(runId)
      }
      throw new Error(`run ${runId} did not finish within 1000 steps`)
    },
    async stop() {
      server.closeAllConnections()
      await new Promise<void>((resolve) => server.close(() => resolve()))
      db.close()
    },
  }
}
