// The local server (benchmark-view, Gate 2 "Where each part lives"; S-201, S-204).
//
// A page you start against a record you name, reading `run.state = 'finished'` runs out of it
// and nothing else. It is a PACKAGE export rather than a script, so a check starts it on port 0,
// asks the port the kernel gave it for a real answer, and reads the payloads' values — no
// browser, no fixed port, no process started (Gate 2, "How it is checked without a browser").
//
// It writes nothing, anywhere: no cache, no export, no generated page, no temporary file. The
// record is opened READ-ONLY by the loader, and no route of this file reaches the filesystem at
// all — a path is matched against the three routes below and answers 404 otherwise, so there is
// nothing for a `..` to climb out of.

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import type { AddressInfo } from 'node:net'
import { openRecord, type StoredRecord } from './loader.ts'
import { benchmarkPage } from './page.ts'
import { fleetPayload, runPayload } from './payload.ts'

/**
 * Loopback only, and not a setting: a page of a local record that could be told to listen
 * elsewhere could be told so by mistake. The engine's own service takes the same line (D-098).
 */
const LOOPBACK = '127.0.0.1'

const HTML = 'text/html; charset=utf-8'
const JSON_TYPE = 'application/json; charset=utf-8'
const TEXT = 'text/plain; charset=utf-8'

/**
 * Which run the One run view opens on: the one `?run=` names, or the NEWEST finished run, which
 * is the last the loader returns (`ORDER BY created_at, run_id`). A name this record does not
 * hold is not a 404 — the page opens on the newest run and says so in one line, because a stale
 * link is a reader's mistake and a blank page is not an answer to it. `/run/<id>` itself answers
 * 404 for the same id, which is check 17's clause and is untouched.
 */
function opensOn(
  asked: string | undefined,
  fleet: { runs: Array<{ runId: string }> },
): { runId: string | undefined; unknown: string | undefined } {
  const newest = fleet.runs[fleet.runs.length - 1]?.runId
  if (asked === undefined || asked === '') return { runId: newest, unknown: undefined }
  const held = fleet.runs.some((one) => one.runId === asked)
  return held ? { runId: asked, unknown: undefined } : { runId: newest, unknown: asked }
}

export interface ViewOptions {
  /** The database file, ALREADY RESOLVED by the caller (Gate 2; the package resolves none). */
  dbPath: string
  /** Every prefix a stored path may carry, stripped from every string served (D-086). */
  roots?: readonly string[]
  /** 0, the default, takes any free port — which is what every check here uses. */
  port?: number
}

export interface BenchmarkView {
  baseUrl: string
  /** Where the server is actually listening, as the operating system reports it. */
  address: AddressInfo
  stop(): Promise<void>
}

function answer(res: ServerResponse, status: number, type: string, body: string): void {
  res.writeHead(status, { 'content-type': type, 'content-length': Buffer.byteLength(body) })
  res.end(body)
}

/**
 * One refusal, one short body, for every path that is not one of the three routes — an unknown
 * run id, a traversal, a method that is not a GET. It names nothing it was asked for: a refusal
 * that echoes the request back is a refusal that can be made to say anything.
 */
const refuse = (res: ServerResponse): void => answer(res, 404, TEXT, 'not found')

function handle(record: StoredRecord, req: IncomingMessage, res: ServerResponse): void {
  const asked = req.url ?? '/'
  const path = asked.split('?')[0] ?? '/'
  if (req.method !== 'GET') {
    refuse(res)
    return
  }

  if (path === '/') {
    const fleet = fleetPayload(record)
    // One query, read by hand rather than through a URL: `node:http` hands the request line
    // over verbatim, and a `?run=` that decodes to nothing is simply no run named.
    const query = asked.includes('?') ? asked.slice(asked.indexOf('?') + 1) : ''
    let named: string | undefined
    for (const pair of query.split('&')) {
      if (!pair.startsWith('run=')) continue
      try {
        named = decodeURIComponent(pair.slice('run='.length).replace(/\+/g, ' '))
      } catch {
        named = undefined
      }
    }
    const opened = opensOn(named, fleet)
    answer(
      res,
      200,
      HTML,
      benchmarkPage({
        fleet,
        run: opened.runId === undefined ? undefined : runPayload(record, opened.runId),
        selectedRunId: opened.runId,
        unknownRun: opened.unknown,
      }),
    )
    return
  }

  if (path === '/data') {
    answer(res, 200, JSON_TYPE, JSON.stringify(fleetPayload(record)))
    return
  }

  if (path.startsWith('/run/')) {
    let runId: string
    try {
      runId = decodeURIComponent(path.slice('/run/'.length))
    } catch {
      // A percent sequence that decodes to nothing is a bad request, not a run.
      refuse(res)
      return
    }
    const payload = runId === '' ? undefined : runPayload(record, runId)
    if (payload === undefined) refuse(res)
    else answer(res, 200, JSON_TYPE, JSON.stringify(payload))
    return
  }

  refuse(res)
}

/**
 * Start the page against a record. The record is opened once, read-only, and every request reads
 * it again — so a run that finishes while the page is open is in the next answer, and no payload
 * is a copy made at startup and handed out afterwards.
 */
export async function startBenchmarkView(options: ViewOptions): Promise<BenchmarkView> {
  const record = openRecord({ path: options.dbPath, roots: options.roots })

  const server = createServer((req, res) => {
    try {
      handle(record, req, res)
    } catch {
      // The message of a failure here can hold the path of the record (D-086) or a provider's
      // URL (D-022), so none of it is served: what went wrong is the operator's to read from
      // the record, not the page's to publish.
      answer(res, 500, TEXT, 'the record could not be read')
    }
  })
  await new Promise<void>((listening) => server.listen(options.port ?? 0, LOOPBACK, listening))
  const address = server.address() as AddressInfo

  return {
    baseUrl: `http://${LOOPBACK}:${address.port}`,
    address,
    async stop() {
      server.closeAllConnections()
      await new Promise<void>((closed) => server.close(() => closed()))
      record.close()
    },
  }
}
