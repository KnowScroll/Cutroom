import type { SubmitRequest } from '@cutroom/reel-contract'
import type { Engine } from './harness.ts'
import { stillsRequest } from './stills.ts'

// Requests and readers for reel-render's chain checks (docs/features/reel-render.md, checks 7–10).
// Every builder returns a fresh value, and every expectation a check makes is typed in the check.

/** `stillsRequest`'s sentences and criteria, asking for a video under `budgetCents`. */
export function videoRequest(requestId: string, budgetCents = 300): SubmitRequest {
  return { ...stillsRequest(requestId, budgetCents), options: { until: 'video', budgetCents } }
}

export type Event = Record<string, unknown> & { type: string }

/** Each event as one line: its type, the stage, gate, shot or status it names. */
export const described = (events: readonly Event[]) =>
  events.map((e) => {
    if (e.type === 'verdict') {
      return `verdict ${String(e.gate)}${e.shotId === undefined ? '' : ` ${String(e.shotId)}`} ${String(e.outcome)}`
    }
    if (e.type === 'degraded') return `degraded ${String(e.shotId)}`
    if (e.type === 'run.finished') return `run.finished ${String(e.status)}`
    return e.stage === undefined ? e.type : `${e.type} ${String(e.stage)}`
  })

export interface JobRow {
  id: number
  kind: string
  correlation_id: string
  parent_id: number | null
  state: string
  attempts: number
  cost_cents: number
}

/** Every job row the engine holds, oldest first. */
export const jobRows = (engine: Engine) =>
  engine
    .query<JobRow>(
      'SELECT id, kind, correlation_id, parent_id, state, attempts, cost_cents FROM job ORDER BY id',
    )
    .map((row) => ({ ...row }))

/** The events of a run, as a caller following it reads them. */
export async function eventsOf(engine: Engine, runId: string): Promise<Event[]> {
  return (await engine.http.events(runId)).json.events as Event[]
}
