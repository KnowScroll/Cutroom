import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { startApi, type Api } from '@cutroom/api'
import { startWorker, type Worker } from '@cutroom/worker'
import { client } from '../stand-in/client.ts'

/**
 * The real engine — its API and its worker — started on a database file in a temporary folder
 * this harness owns. Every reply goes through ../stand-in/client.ts, which fails the test on a
 * body the contract does not describe for that route and status.
 *
 * The worker is optional and can be started later, which is how a test observes a run before
 * any job has been claimed.
 */
export interface Engine {
  dir: string
  dbPath: string
  api: Api
  http: ReturnType<typeof client>
  startWorker(): Promise<Worker>
  /** Reads the database file directly, the way an operator would, and closes it again. */
  query<T>(sql: string, ...params: Array<string | number>): T[]
  stop(): Promise<void>
}

export async function startEngine(options: { worker: boolean }): Promise<Engine> {
  const dir = mkdtempSync(join(tmpdir(), 'reel-plan-'))
  const dbPath = join(dir, 'engine.sqlite')
  const api = await startApi({ dbPath })
  let worker: Worker | undefined

  const engine: Engine = {
    dir,
    dbPath,
    api,
    http: client(api.baseUrl),
    async startWorker() {
      worker ??= await startWorker({ dbPath, pollMs: 10 })
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
