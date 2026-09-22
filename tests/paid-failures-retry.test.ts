import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { test } from 'node:test'
import { performance } from 'node:perf_hooks'
import { Spent, Unavailable, type LanguageModelPort, type ModelReceipt } from '@cutroom/contracts'
import {
  claimJob,
  closeDatabase,
  openDatabase,
  submitRun,
  type Db,
} from '../packages/domain/src/index.ts'
import { retryingModelPort } from '../apps/worker/src/model-port.ts'
import { recordingPort } from '../apps/worker/src/recording-port.ts'
import { stillsRequest } from './engine/stills.ts'

// paid-failures, Slice 4 — checks 8, 9 and 10 (docs/features/paid-failures.md): the transient
// counter the model port did not have (S-137), and the two things it must never send again.
//
// WHY IT DID NOT EXIST. `packages/providers/src/transient.ts` said plainly that the counter and the
// backoff are the worker's guarded ports', and that for the model port it was not built. The reason
// was a boundary: the model adapter throws its classification as a CLASS, and `worker-no-providers`
// forbids the worker importing the package that declared it (S-038). Both classes are
// `packages/contracts`' since S-142, so the worker can name what it catches.

const TRANSIENT = { maxAttempts: 3, backoffMs: 20 }

const RECEIPT: ModelReceipt = {
  model: 'MiniMax-M2.7',
  role: 'planner',
  call: 'structured',
  temperature: 0,
  usage: { inputTokens: 10, outputTokens: 20 },
  fake: false,
  pictureIds: [],
  takeIds: [],
}

/** A model port whose `structured` answers whatever the script's next entry says. */
function scripted(script: ReadonlyArray<'unavailable' | 'spent' | 'fault' | 'answer'>): {
  port: LanguageModelPort
  sends: () => number
} {
  let sent = 0
  const port = {
    async structured() {
      const next = script[sent] ?? 'answer'
      sent += 1
      if (next === 'unavailable') throw new Unavailable('429 the provider is busy')
      if (next === 'spent') {
        throw new Spent({
          port: 'model',
          model: 'MiniMax-M2.7',
          costCents: 0,
          detail: 'the planner call to MiniMax-M2.7 answered THE SCHEMA',
        })
      }
      if (next === 'fault') throw new Error('the request was answered 400')
      return { value: { units: [] }, receipt: RECEIPT }
    },
  } as unknown as LanguageModelPort
  return { port, sends: () => sent }
}

const call = { role: 'planner', prompt: 'Cut these.', schema: undefined, temperature: 0 } as never

function engine(): { db: Db; dir: string; runId: string; jobId: number; clean(): void } {
  const dir = mkdtempSync(join(tmpdir(), 'cutroom-retry-db-'))
  const db = openDatabase(join(dir, 'cutroom.sqlite'))
  const request = stillsRequest('req-retry-1')
  const { runId } = submitRun(db, request, JSON.stringify(request))
  const job = claimJob(db, ['reel.plan'])
  assert.ok(job !== undefined, 'no job to claim')
  return {
    db,
    dir,
    runId,
    jobId: job.id,
    clean: () => {
      closeDatabase(db)
      rmSync(dir, { recursive: true, force: true })
    },
  }
}

const countOf = (dbPath: string, table: string): number => {
  const sqlite = new DatabaseSync(dbPath, { readOnly: true })
  try {
    return (sqlite.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number }).n
  } finally {
    sqlite.close()
  }
}

// ---------------------------------------------------------------- 8

const CHECK_8 =
  '8. the model port is sent again while it answers Unavailable — the settings’ attempts, the same backoff as the video and narration ports, waiting at least the figure by the monotonic clock — and nothing is recorded for an unavailable send; still unavailable at the last send it throws naming the call and the sends'

test(`${CHECK_8} — a provider having a bad minute no longer ends the reel`, async () => {
  const busy = scripted(['unavailable', 'unavailable', 'answer'])
  const port = retryingModelPort(busy.port, TRANSIENT)
  const began = performance.now()
  const answer = await port.structured(call)
  const waited = performance.now() - began

  assert.deepEqual(answer.receipt, RECEIPT, 'the answer is not the one the provider gave')
  assert.equal(busy.sends(), 3, 'the call was not sent again, or was sent too often')
  // The wait doubles: the backoff, then twice it. Measured on the monotonic clock, as S-102's
  // `atLeast` measures it — a timer alone can fire a fraction short of its figure.
  assert.ok(
    waited >= TRANSIENT.backoffMs * 3,
    `it waited ${Math.round(waited)} ms, less than the backoff and twice it`,
  )
})

test(`${CHECK_8} — spent at the last send, it throws naming the call and the sends`, async () => {
  const down = scripted(['unavailable', 'unavailable', 'unavailable', 'answer'])
  const port = retryingModelPort(down.port, TRANSIENT)
  await assert.rejects(port.structured(call), (error: Error) => {
    assert.match(error.message, /the planner call/, error.message)
    assert.match(error.message, /3 sends/, error.message)
    return true
  })
  assert.equal(down.sends(), TRANSIENT.maxAttempts, 'the counter is not the settings’ figure')
})

// ---------------------------------------------------------------- 9

const CHECK_9 =
  '9. a Spent is sent ONCE and never again, and a plain fault is sent once and never again: a call that has been paid for is not paid for twice, and a request that was wrong is not repeated'

test(`${CHECK_9} — nothing that spent, and nothing that was wrong, is sent twice`, async () => {
  for (const [what, script] of [
    ['a call that spent', ['spent', 'answer']],
    ['a request that was wrong', ['fault', 'answer']],
  ] as const) {
    const scriptedPort = scripted(script)
    const port = retryingModelPort(scriptedPort.port, TRANSIENT)
    await assert.rejects(port.structured(call))
    assert.equal(scriptedPort.sends(), 1, `${what} was sent again`)
  }
})

// ---------------------------------------------------------------- 10

const CHECK_10 =
  '10. one send that answers writes one model receipt, whatever number of unavailable sends came before it'

test(`${CHECK_10} — the counter writes nothing, and the answer writes once`, async () => {
  const e = engine()
  try {
    const path = join(e.dir, 'cutroom.sqlite')
    const busy = scripted(['unavailable', 'unavailable', 'answer'])
    // The order the worker builds: the counter INSIDE the recording port, so an unavailable send
    // never reaches `recordReceipt` and a `Spent` thrown through it reaches `recordingSpend`.
    const port = recordingPort(retryingModelPort(busy.port, TRANSIENT), e.db, e.runId, e.jobId)

    await port.structured(call)
    assert.equal(countOf(path, 'model_receipt'), 1, 'an unavailable send wrote a receipt')
    assert.equal(countOf(path, 'lost_call'), 0, 'an unavailable send wrote a lost call')

    // And a call that spends writes its row, through the counter, exactly once.
    const paid = scripted(['spent'])
    const second = recordingPort(retryingModelPort(paid.port, TRANSIENT), e.db, e.runId, e.jobId)
    await assert.rejects(second.structured(call))
    assert.equal(countOf(path, 'lost_call'), 1, 'a call that spent did not leave exactly one row')
    assert.equal(countOf(path, 'model_receipt'), 1, 'a call that spent wrote a receipt too')
  } finally {
    e.clean()
  }
})
