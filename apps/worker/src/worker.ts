import { buryJob, claimJob, closeDatabase, openDatabase, PLAN_JOB } from '@cutroom/domain'
import { runPlanJob } from './plan-job.ts'

// The runner's loop: claim a due job, run it, and poll again (D-002). Jobs are run one at a time.

export interface WorkerOptions {
  /** The database file (D-086), shared with the API. */
  dbPath: string
  /** How long to wait between polls when no job is due. D-002 says 500 ms. */
  pollMs?: number
}

export interface Worker {
  /** Finishes the job in hand, stops polling, and closes the database. */
  stop(): Promise<void>
}

export async function startWorker(options: WorkerOptions): Promise<Worker> {
  const db = openDatabase(options.dbPath)
  const pollMs = options.pollMs ?? 500
  let stopped = false
  let timer: ReturnType<typeof setTimeout> | undefined
  let current: Promise<void> = Promise.resolve()

  async function drain(): Promise<void> {
    while (!stopped) {
      const job = claimJob(db, [PLAN_JOB])
      if (job === undefined) return
      try {
        await runPlanJob(db, job)
      } catch (error) {
        buryJob(db, job.id, error instanceof Error ? error.message : String(error))
      }
    }
  }

  function poll(): void {
    current = drain().finally(() => {
      if (!stopped) timer = setTimeout(poll, pollMs)
    })
  }
  poll()

  return {
    async stop() {
      stopped = true
      clearTimeout(timer)
      await current
      closeDatabase(db)
    },
  }
}
