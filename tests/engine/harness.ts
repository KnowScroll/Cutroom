import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { startApi, type Api } from '@cutroom/api'
import type { PlanSettings } from '@cutroom/contracts'
import { DEFAULT_PLAN_SETTINGS } from '@cutroom/pipeline'
import { fakeModel, type FakeModel, type FakeScript } from '@cutroom/providers'
import { startWorker, type Worker } from '@cutroom/worker'
import { client } from '../stand-in/client.ts'

/**
 * The real engine — its API and its worker — started on a database file in a temporary folder
 * this harness owns. Every reply goes through ../stand-in/client.ts, which fails the test on a
 * body the contract does not describe for that route and status.
 *
 * The worker is optional and can be started later, which is how a test observes a run before
 * any job has been claimed. Its only model is the stand-in, answering from the script a test
 * gives — none, by default, so a run that reaches a model call fails. Its questions file is always
 * inside the harness's folder, so no test can write the repository's own.
 */
export interface Engine {
  dir: string
  dbPath: string
  /** The questions file the worker was pointed at, inside `dir`. Not created until written. */
  questionsPath: string
  /** The BUDGET.md written into `dir` when a test supplied one; otherwise the worker's default. */
  budgetPath: string | undefined
  api: Api
  http: ReturnType<typeof client>
  /** The stand-in the worker was handed, with every call it received. */
  model: FakeModel
  startWorker(): Promise<Worker>
  /** Reads the database file directly, the way an operator would, and closes it again. */
  query<T>(sql: string, ...params: Array<string | number>): T[]
  stop(): Promise<void>
}

export interface EngineOptions {
  worker: boolean
  script?: FakeScript
  settings?: PlanSettings
  /** The text of a BUDGET.md, written into the engine's folder and read by the worker for the cap. */
  budgetMd?: string
}

export async function startEngine(options: EngineOptions): Promise<Engine> {
  const dir = mkdtempSync(join(tmpdir(), 'reel-plan-'))
  const dbPath = join(dir, 'engine.sqlite')
  const questionsPath = join(dir, 'QUESTIONS.md')
  let budgetPath: string | undefined
  if (options.budgetMd !== undefined) {
    budgetPath = join(dir, 'BUDGET.md')
    writeFileSync(budgetPath, options.budgetMd)
  }
  const settings = options.settings ?? DEFAULT_PLAN_SETTINGS
  const model = fakeModel(options.script ?? {}, { models: settings.models })
  const api = await startApi({ dbPath })
  let worker: Worker | undefined

  const engine: Engine = {
    dir,
    dbPath,
    questionsPath,
    budgetPath,
    api,
    http: client(api.baseUrl),
    model,
    async startWorker() {
      worker ??= await startWorker({
        dbPath,
        pollMs: 10,
        model,
        settings,
        questionsPath,
        ...(budgetPath === undefined ? {} : { budgetPath }),
      })
      return worker
    },
    query<T>(sql: string, ...params: Array<string | number>): T[] {
      const db = new DatabaseSync(dbPath)
      try {
        return db.prepare(sql).all(...params) as T[]
      } finally {
        db.close()
      }
    },
    async stop() {
      await worker?.stop()
      await api.stop()
      rmSync(dir, { recursive: true, force: true })
    },
  }
  if (options.worker) await engine.startWorker()
  return engine
}

/** Polls until `predicate` holds, or fails naming what it was waiting for. */
export async function waitFor(
  what: string,
  predicate: () => Promise<boolean> | boolean,
  timeoutMs = 5000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (await predicate()) return
    await new Promise((resolve) => setTimeout(resolve, 10))
  }
  throw new Error(`timed out after ${timeoutMs}ms waiting for ${what}`)
}

/** Waits until the run's status says it has finished. */
export async function finished(engine: Engine, runId: string): Promise<void> {
  await waitFor(`run ${runId} to finish`, async () => {
    const { json } = await engine.http.status(runId)
    return json.state === 'finished'
  })
}

/** A stored plan row, its JSON columns parsed. */
export interface PlanRowRead {
  role: string
  axis: string
  unitCount: number
  plan: { units: number[][]; estimateCents: number }
  verdict: { outcome: string; failed: string[] }
  score: number | null
  estimateCents: number
  selected: boolean
}

/** A finished run as a caller and an operator see it: its result and events, its rows. */
export interface Ran {
  runId: string
  result: Record<string, unknown>
  events: Array<Record<string, unknown> & { type: string }>
  plans: PlanRowRead[]
  receipts: Array<{ role: string }>
}

/** Submits a request, waits for its run to finish, and reads everything it left behind. */
export async function run(engine: Engine, request: unknown): Promise<Ran> {
  const submitted = await engine.http.submit(request)
  if (submitted.status !== 202) {
    throw new Error(`the request was not accepted: ${JSON.stringify(submitted.json)}`)
  }
  const runId = String(submitted.json.runId)
  await finished(engine, runId)
  const plans = engine
    .query<{
      role: string
      axis: string
      unit_count: number
      plan: string
      verdict: string
      score: number | null
      estimate_cents: number
      selected: number
    }>('SELECT * FROM plan WHERE run_id = ? ORDER BY role', runId)
    .map((row) => ({
      role: row.role,
      axis: row.axis,
      unitCount: row.unit_count,
      plan: JSON.parse(row.plan) as PlanRowRead['plan'],
      verdict: JSON.parse(row.verdict) as PlanRowRead['verdict'],
      score: row.score,
      estimateCents: row.estimate_cents,
      selected: row.selected === 1,
    }))
  return {
    runId,
    result: (await engine.http.result(runId)).json,
    events: (await engine.http.events(runId)).json.events as Ran['events'],
    plans,
    receipts: engine
      .query<{ role: string }>('SELECT role FROM model_receipt WHERE run_id = ? ORDER BY id', runId)
      .map((r) => ({ role: r.role })),
  }
}
