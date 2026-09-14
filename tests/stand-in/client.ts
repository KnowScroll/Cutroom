import assert from 'node:assert/strict'
import {
  ErrorResponse,
  EventsPage,
  RunRecord,
  RunResult,
  RunStatus,
  SubmitResponse,
} from '@cutroom/reel-contract'

// A test client for the stand-in that checks every body it receives against the schema the
// contract assigns to that route and status (docs/features/reel-contract.md, check 18). A reply
// the contract does not describe fails the test that received it, whichever test that is.

type Schema = { safeParse(x: unknown): { success: boolean } }

type Route = 'submit' | 'lookup' | 'status' | 'events' | 'result' | 'record' | 'cancel'

/** The contract's route table: which schema each status code's body must parse under. */
const EXPECTED: Record<Route, Record<number, Schema>> = {
  submit: { 202: SubmitResponse, 409: SubmitResponse, 422: SubmitResponse, 500: ErrorResponse },
  lookup: { 200: RunStatus, 400: ErrorResponse, 404: ErrorResponse, 500: ErrorResponse },
  status: { 200: RunStatus, 404: ErrorResponse, 500: ErrorResponse },
  events: { 200: EventsPage, 400: ErrorResponse, 404: ErrorResponse, 500: ErrorResponse },
  result: { 200: RunResult, 404: ErrorResponse, 409: RunStatus, 500: ErrorResponse },
  record: { 200: RunRecord, 404: ErrorResponse, 409: RunStatus, 500: ErrorResponse },
  cancel: { 200: RunStatus, 404: ErrorResponse, 500: ErrorResponse },
}

function routeOf(method: string, path: string): Route {
  const pathname = path.split('?')[0] as string
  if (method === 'POST' && pathname === '/v1/runs') return 'submit'
  if (method === 'GET' && pathname === '/v1/runs') return 'lookup'
  const sub = /^\/v1\/runs\/[^/]+(?:\/(events|result|record|cancel))?$/.exec(pathname)
  assert.ok(sub, `no contract route for ${method} ${path}`)
  if (sub[1] === undefined) return 'status'
  return sub[1] as Route
}

export type Reply = { status: number; json: Record<string, unknown> }

export function client(baseUrl: string) {
  async function call(method: string, path: string, body?: unknown, raw?: string): Promise<Reply> {
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers: { 'content-type': 'application/json' },
      body: raw ?? (body === undefined ? undefined : JSON.stringify(body)),
    })
    const json = (await res.json()) as Record<string, unknown>
    const route = routeOf(method, path)
    const schema = EXPECTED[route][res.status]
    assert.ok(
      schema,
      `${method} ${path} answered ${res.status}, a status the contract does not give that route`,
    )
    assert.ok(
      schema.safeParse(json).success,
      `${method} ${path} ${res.status} returned a body its schema rejects: ${JSON.stringify(json)}`,
    )
    return { status: res.status, json }
  }

  return {
    call,
    submit: (body: unknown) => call('POST', '/v1/runs', body),
    lookup: (requestId: string) =>
      call('GET', `/v1/runs?requestId=${encodeURIComponent(requestId)}`),
    status: (runId: string) => call('GET', `/v1/runs/${runId}`),
    events: (runId: string, since?: string | number) =>
      call('GET', `/v1/runs/${runId}/events${since === undefined ? '' : `?since=${since}`}`),
    result: (runId: string) => call('GET', `/v1/runs/${runId}/result`),
    record: (runId: string) => call('GET', `/v1/runs/${runId}/record`),
    cancel: (runId: string) => call('POST', `/v1/runs/${runId}/cancel`),
  }
}
