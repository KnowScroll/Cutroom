import type { LanguageModelPort, PlanSettings } from '@cutroom/contracts'
import {
  BUDGET_MD,
  buryJob,
  claimJob,
  closeDatabase,
  DEFAULT_LEASE_MS,
  KEYFRAMES_JOB,
  openDatabase,
  PLAN_JOB,
} from '@cutroom/domain'
import { DEFAULT_PLAN_SETTINGS } from '@cutroom/pipeline'
import { runKeyframesJob } from './keyframes-job.ts'
import { runPlanJob, type PlanJobContext } from './plan-job.ts'
import { QUESTIONS_MD } from './questions.ts'

// The runner's loop: claim a due job, run it, and poll again (D-002). Jobs are run one at a time.
// Both of the chain's kinds are claimed by the one worker, oldest row first, so a reel's plan job
// is always run before the keyframes job it creates (D-081, D-083).

export interface WorkerOptions {
  /** The database file (D-086), shared with the API. */
  dbPath: string
  /** How long to wait between polls when no job is due. D-002 says 500 ms. */
  pollMs?: number
  /**
   * How long a job this worker claims is held from every other claim (D-002's lease). A job still
   * running when its lease runs out is taken to be abandoned, claimed again and run from the start
   * (S-027). Nothing renews a lease, so it must outlast the longest job. Defaults to 60 seconds.
   */
  leaseMs?: number
  /**
   * The only way the worker asks a model (S-021). The caller supplies it; the worker wraps it so
   * every receipt is recorded, and never constructs one itself.
   */
  model: LanguageModelPort
  /** Planning settings. Defaults to the pipeline's. */
  settings?: PlanSettings
  /** The BUDGET.md the per-reel cap is read from (D-100). Defaults to the pinned steering-ref's. */
  budgetPath?: string
  /** The questions file a per-reel cap refusal is appended to (D-097). Defaults to QUESTIONS.md at the root. */
  questionsPath?: string
}

export interface Worker {
  /** Finishes the job in hand, stops polling, and closes the database. */
  stop(): Promise<void>
}

export async function startWorker(options: WorkerOptions): Promise<Worker> {
  const db = openDatabase(options.dbPath)
  const pollMs = options.pollMs ?? 500
  const leaseMs = options.leaseMs ?? DEFAULT_LEASE_MS
  const context: PlanJobContext = {
    model: options.model,
    settings: options.settings ?? DEFAULT_PLAN_SETTINGS,
    budgetPath: options.budgetPath ?? BUDGET_MD,
    questionsPath: options.questionsPath ?? QUESTIONS_MD,
  }
  let stopped = false
  let timer: ReturnType<typeof setTimeout> | undefined
  let current: Promise<void> = Promise.resolve()

  async function drain(): Promise<void> {
    while (!stopped) {
      const job = claimJob(db, [PLAN_JOB, KEYFRAMES_JOB], new Date(), leaseMs)
      if (job === undefined) return
      try {
        if (job.kind === KEYFRAMES_JOB) await runKeyframesJob(db, job)
        else await runPlanJob(db, job, context)
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
