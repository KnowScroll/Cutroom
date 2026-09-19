import { performance } from 'node:perf_hooks'
import { setTimeout as sleep } from 'node:timers/promises'
import type { RenderSettings } from '@cutroom/contracts'

/**
 * Waits at least `ms` by the monotonic clock. A timer alone can end short of it: libuv counts a timer
 * from the event loop's cached time, in whole milliseconds, so `setTimeout(ms)` can fire a fraction of a
 * millisecond — or, after a long turn of the loop, more — before `ms` have passed (S-102).
 */
async function atLeast(ms: number): Promise<void> {
  const until = performance.now() + ms
  for (let left = ms; left > 0; left = until - performance.now()) await sleep(Math.ceil(left))
}

/**
 * One video or narration call, sent again while its provider answers `unavailable` — a provider
 * failing for a moment (docs/features/reel-takes.md, Gate 2 "Transient errors"; S-096, D-024, I-11).
 *
 * `send` is one send: the guard's comparison and, if it passes, the port's call — so EVERY send is
 * guarded, and a send the guard refuses is answered `refused` and not sent again (S-095). An
 * `unavailable` answer is sent again, the same request, up to `maxAttempts` sends in all, waiting
 * `backoffMs` before the second and twice the last wait before each after it. Nothing is written for
 * an `unavailable` answer: the caller records only the answer it returns, with the number of
 * `unavailable` answers before it — the transient counter, which is never the take counter.
 *
 * Still `unavailable` at the last send, it THROWS, naming the call, the sends and I-11, so the stage
 * fails the run as it fails on any thrown call (S-046), with no row, no receipt and no take. A call
 * that throws is a fault, not a transient error: the throw passes through, and nothing is sent again.
 *
 * The wait holds the worker, which runs one job at a time (D-002; reel-takes' known limit 12).
 */
export async function sentUntilAvailable<A extends { kind: string }>(
  call: string,
  transient: RenderSettings['transient'],
  send: () => Promise<A>,
): Promise<{ answer: Exclude<A, { kind: 'unavailable' }>; unavailable: number }> {
  let wait = transient.backoffMs
  for (let sent = 1; ; sent += 1) {
    const answer = await send()
    if (answer.kind !== 'unavailable') {
      return { answer: answer as Exclude<A, { kind: 'unavailable' }>, unavailable: sent - 1 }
    }
    if (sent >= transient.maxAttempts) {
      const { detail } = answer as unknown as { detail: string }
      throw new Error(
        `${call} was answered unavailable at each of its ${sent} sends, the last saying "${detail}": a provider's transient errors have their own counter, and it is spent, so nothing was made and no take is counted (I-11, S-096)`,
      )
    }
    await atLeast(wait)
    wait *= 2
  }
}
