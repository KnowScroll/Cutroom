import { createHash, randomUUID } from 'node:crypto'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import type { AddressInfo } from 'node:net'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import {
  CONTRACT_VERSION,
  SubmitRequest,
  type ErrorResponse,
  type RunStatus,
  type SubmitResponse,
} from '@cutroom/reel-contract'

/**
 * A stand-in for the reel engine's service, honouring docs/features/reel-contract.md.
 *
 * It exists so the contract can be proven complete and consistent before any engine exists. It
 * proves nothing about the real engine. It lives in tests/, never in a package (D-094), and it
 * keeps its runs, request hashes and events in a real database file from the first slice, so a
 * later slice can stop and restart it on the same storage.
 */

export type Until = 'plan' | 'stills' | 'video'

export interface StandInOptions {
  /** A directory the caller owns; the database file is created inside it. */
  storageDir: string
  /** Which `until` values this stand-in will accept — anything else is refused as unsupported. */
  canProduce: readonly Until[]
}

export interface StandIn {
  baseUrl: string
  storagePath: string
  stop(): Promise<void>
}

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

export async function startStandIn(options: StandInOptions): Promise<StandIn> {
  const storagePath = join(options.storageDir, 'stand-in.sqlite')
  const db = new DatabaseSync(storagePath)
  db.exec(`
    CREATE TABLE IF NOT EXISTS runs (
      run_id     TEXT PRIMARY KEY,
      request_id TEXT NOT NULL UNIQUE,
      body_hash  TEXT NOT NULL,
      until      TEXT NOT NULL,
      state      TEXT NOT NULL
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
    'INSERT INTO runs (run_id, request_id, body_hash, until, state) VALUES (?, ?, ?, ?, ?)',
  )
  const insertEvent = db.prepare('INSERT INTO events (run_id, seq, body) VALUES (?, ?, ?)')

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
    insertRun.run(runId, request.requestId, hash, request.options.until, 'running')
    const accepted = {
      contractVersion: V,
      runId,
      seq: 1,
      at: new Date().toISOString(),
      type: 'run.accepted',
    }
    insertEvent.run(runId, 1, JSON.stringify(accepted))
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
    const byId = /^\/v1\/runs\/([^/]+)$/.exec(url.pathname)

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
    async stop() {
      server.closeAllConnections()
      await new Promise<void>((resolve) => server.close(() => resolve()))
      db.close()
    },
  }
}
