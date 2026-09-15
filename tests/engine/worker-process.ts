import type { LanguageModelPort, PlanSettings } from '@cutroom/contracts'
import { fakeModel, type FakeScript } from '@cutroom/providers'
import { startWorker } from '@cutroom/worker'

/**
 * The real worker, in a process of its own, so a test can end it mid-run the way a crash does —
 * killed, with its job in hand, its database never closed (docs/features/reel-plan.md, check 46).
 * An in-process worker cannot be that: its `stop()` finishes the job in hand first.
 *
 * It reads its settings as JSON on standard input. Its model is the stand-in, answering from the
 * script it is given, except that call `holdAtCall` (counted across roles, from 1) is never
 * answered: the process prints `held` and waits there until it is killed. Every call before it
 * returns, so its receipt is written.
 */
export interface WorkerProcessConfig {
  dbPath: string
  questionsPath: string
  budgetPath?: string
  settings: PlanSettings
  script: FakeScript
  holdAtCall: number
  leaseMs: number
}

const chunks: Buffer[] = []
for await (const chunk of process.stdin) chunks.push(chunk as Buffer)
const config = JSON.parse(Buffer.concat(chunks).toString('utf8')) as WorkerProcessConfig

const standIn = fakeModel(config.script, { models: config.settings.models })
let received = 0
const model: LanguageModelPort = {
  structured(call) {
    received += 1
    if (received === config.holdAtCall) {
      process.stdout.write('held\n')
      return new Promise<never>(() => {})
    }
    return standIn.structured(call)
  },
}

// A held call is a promise nothing will settle, and it keeps no process alive on its own.
setInterval(() => {}, 60_000)

await startWorker({
  dbPath: config.dbPath,
  pollMs: 10,
  model,
  settings: config.settings,
  questionsPath: config.questionsPath,
  leaseMs: config.leaseMs,
  ...(config.budgetPath === undefined ? {} : { budgetPath: config.budgetPath }),
})
