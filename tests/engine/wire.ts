import { readFileSync, readdirSync } from 'node:fs'
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import type { AddressInfo } from 'node:net'
import { join } from 'node:path'
import { REPO } from '../_repo.ts'

// RECORDED WIRE (S-111). No test calls a provider: a real adapter is handed its transport — a
// `fetch` and a base URL, each a setting defaulting to the provider's own (paid-path, Gate 2,
// finding 3 of the gate review) — and what answers it here is a body that provider really
// returned, saved under tests/fixtures/wire and redacted before it was committed (D-022).
//
// What a recorded response cannot prove is that the endpoint still exists and still answers this
// shape. That is proven once, by hand, by the real reel of Slice 8 — never by a test that needs a
// key and a network on the day the suite runs. A live smoke test behind a flag was rejected for
// the same reason a skipped test is: it reads as coverage.
//
// Every fixture is read by check 21, whatever slice wrote it: the folder is the list.

/** The folder every recorded response lives in, named `<provider>-<call>-<case>.json`. */
export const WIRE_DIR = join(REPO, 'tests', 'fixtures', 'wire')

export interface WireRequest {
  method: string
  /** The path the call is made to, under whatever base URL the adapter was given. */
  path: string
}

export interface WireResponse {
  status: number
  headers?: Readonly<Record<string, string>>
  /** A JSON body, as it was received. */
  body?: unknown
  /** A body that is not JSON — an error page, a plain-text refusal. */
  text?: string
  /** A body that is bytes — a clip, a voice — base64 encoded. */
  base64?: string
}

export interface Wire {
  /** Where this came from and what it is for. A fixture that says nothing is a finding (check 21). */
  note: string
  provider: string
  call: string
  case: string
  request: WireRequest
  response: WireResponse
}

/** Every fixture file, sorted. The folder is the list — nothing here is typed by hand. */
export function wireFiles(): string[] {
  return readdirSync(WIRE_DIR)
    .filter((f) => f.endsWith('.json'))
    .sort()
}

/** One fixture, by its name with or without the extension. */
export function readWire(name: string): Wire {
  const file = name.endsWith('.json') ? name : `${name}.json`
  return JSON.parse(readFileSync(join(WIRE_DIR, file), 'utf8')) as Wire
}

/** What an adapter actually sent, kept so a check can read it for a key that leaked (check 3). */
export interface Sent {
  method: string
  url: string
  path: string
  headers: Record<string, string>
  body: string | undefined
}

export interface Recorded {
  /** Handed to an adapter as its transport. Serves each fixture once, in the order given. */
  fetch: typeof globalThis.fetch
  /** Every request it was asked to make, in order. */
  sent: Sent[]
  /** The fixtures not yet served — a call that never happened is as much a finding as a wrong one. */
  left(): string[]
}

/**
 * What a test serves: a fixture's name, or a `Wire` BUILT IN THE TEST.
 *
 * The built one exists for exactly one reason, and it is check 21's: a recorded fixture may hold
 * no query string, because a presigned URL in a committed file is the incident D-022 was written
 * for. Check 10 needs a LIVE-SHAPED presigned URL to prove the adapter drops it — so that URL is
 * built here, in a test, from a fixture that does not carry one, and is never written down.
 */
export type WireSource = string | Wire

/** One fixture waiting to be served. Each is served once: a second call needs a second fixture. */
interface Queued {
  name: string
  wire: Wire
  served: boolean
}

/** What a source is called in a message: its file name, or what a built one records. */
function queued(source: WireSource): Queued {
  if (typeof source === 'string') return { name: source, wire: readWire(source), served: false }
  return {
    name: `${source.provider}-${source.call}-${source.case} (built)`,
    wire: source,
    served: false,
  }
}

/**
 * The fixtures named, in the order given, with the matching every server of them shares: a
 * request is matched on its METHOD and its PATH, and each fixture is served once, so two calls to
 * one endpoint need two fixtures and the second cannot quietly reuse the first.
 */
function queueOf(names: readonly WireSource[]) {
  const queue: Queued[] = names.map(queued)
  const left = () => queue.filter((q) => !q.served).map((q) => q.name)
  return {
    left,
    /** The next unserved fixture for this call, or the refusal an unexpected call deserves. */
    take(method: string, path: string): Queued {
      const found = queue.find(
        (q) =>
          !q.served &&
          q.wire.request.method.toUpperCase() === method &&
          q.wire.request.path === path,
      )
      if (found === undefined) {
        throw new Error(
          `no recorded wire for ${method} ${path}; unserved: ${left().join(', ') || 'none'}`,
        )
      }
      found.served = true
      return found
    },
  }
}

function bodyOf(response: WireResponse): Uint8Array | string | null {
  if (response.base64 !== undefined) return Buffer.from(response.base64, 'base64')
  if (response.text !== undefined) return response.text
  if (response.body !== undefined) return JSON.stringify(response.body)
  return null
}

/**
 * A `fetch` that answers from the named fixtures and reaches nothing.
 *
 * A fixture is matched on its method and its path, and each is served once, so two calls to one
 * endpoint need two fixtures and the second cannot quietly reuse the first. A request nothing
 * matches THROWS, naming what was asked for and what was left: an adapter that called something
 * unexpected is the finding, not a reason to answer it anyway.
 */
export function recordedFetch(names: readonly WireSource[]): Recorded {
  const queue = queueOf(names)
  const sent: Sent[] = []

  const fetch: typeof globalThis.fetch = async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input))
    const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase()
    const headers = Object.fromEntries(new Headers(init?.headers).entries())
    const body = typeof init?.body === 'string' ? init.body : undefined
    sent.push({ method, url: url.toString(), path: url.pathname, headers, body })

    const found = queue.take(method, url.pathname)
    return new Response(bodyOf(found.wire.response), {
      status: found.wire.response.status,
      headers: found.wire.response.headers,
    })
  }

  return { fetch, sent, left: queue.left }
}

export interface WireServer {
  /** What a base-URL setting is pointed at, so a service in ANOTHER PROCESS reaches the fixtures. */
  baseUrl: string
  /** Every request it was asked to answer, in order — headers included (check 3 reads them). */
  sent: Sent[]
  left(): string[]
  close(): Promise<void>
}

/**
 * The same recorded wire, served over LOOPBACK.
 *
 * `recordedFetch` is a function, and a function cannot be handed to a service running in a
 * process of its own — which is the arrangement check 3 needs, because a key reaches its adapter
 * only when a real service reads it and a real adapter sends it. So the fixtures are served by an
 * HTTP server on 127.0.0.1 instead, and the base-URL setting points the adapter at it (S-121).
 * Nothing leaves this machine: loopback is what D-098 already allows, and the port is any free one.
 */
export async function wireServer(names: readonly WireSource[]): Promise<WireServer> {
  const queue = queueOf(names)
  const sent: Sent[] = []

  const handle = (request: IncomingMessage, response: ServerResponse): void => {
    const chunks: Buffer[] = []
    request.on('data', (chunk: Buffer) => chunks.push(chunk))
    request.on('end', () => {
      const method = (request.method ?? 'GET').toUpperCase()
      const url = new URL(request.url ?? '/', `http://${request.headers.host ?? '127.0.0.1'}`)
      sent.push({
        method,
        url: url.toString(),
        path: url.pathname,
        // Node lowercases every header name; what a check reads is the value, not the spelling.
        headers: Object.fromEntries(
          Object.entries(request.headers).map(([name, value]) => [
            name,
            Array.isArray(value) ? value.join(', ') : (value ?? ''),
          ]),
        ),
        body: Buffer.concat(chunks).toString('utf8') || undefined,
      })

      let found
      try {
        found = queue.take(method, url.pathname)
      } catch (error) {
        // A call nothing matches is the finding. 418 is a status no adapter classifies, so a test
        // reads this as the unexpected call it is rather than as a transient or a fault.
        response.writeHead(418, { 'content-type': 'text/plain' })
        response.end(error instanceof Error ? error.message : String(error))
        return
      }
      const wire = found.wire.response
      response.writeHead(wire.status, wire.headers ?? {})
      response.end(bodyOf(wire) ?? undefined)
    })
  }

  const server: Server = createServer(handle)
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  // UNREF'D on purpose: a test that fails before it closes this must not hold the process open.
  // Measured in session 38's break campaign — a break that makes the service refuse to start throws
  // past the close, and the whole run then sat until it was killed rather than failing in seconds.
  server.unref()
  const { port } = server.address() as AddressInfo

  return {
    baseUrl: `http://127.0.0.1:${port}`,
    sent,
    left: queue.left,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  }
}
