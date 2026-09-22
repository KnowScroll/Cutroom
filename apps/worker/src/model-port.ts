import { isUnavailable, type LanguageModelPort, type RenderSettings } from '@cutroom/contracts'
import { sentUntilAvailable } from './transient.ts'

/**
 * The model port the worker was handed, with the transient counter every other paying port already
 * had (docs/features/paid-failures.md, Slice 4; S-096, S-137, I-11).
 *
 * **Why it did not exist until now.** `packages/providers/src/transient.ts` said in as many words
 * that the counter and the backoff are the worker's guarded ports', and that for the model port it
 * was not built. The reason was a boundary, not an oversight: the model adapter carries its
 * classification in a THROWN class, and `worker-no-providers` forbids this package importing the
 * package that declared it (S-038). `Spent` and `Unavailable` are `packages/contracts`' now, so the
 * worker can name what it catches (S-142).
 *
 * **What it does.** A call answered `Unavailable` — 429, 5xx, a connection error, a call that timed
 * out before an answer arrived — waits and is sent again, the same request, up to `maxAttempts`
 * sends in all, doubling the wait, on the same counter and the same `atLeast` wait the video and
 * narration ports use. Still unavailable at the last send it throws, naming the call and the sends.
 *
 * **What it must not do, and both are checks.** A `Spent` is passed straight through and NEVER sent
 * again: that call has been paid for, and a second one pays twice (S-142). A plain fault is passed
 * straight through too: a request that was wrong is wrong the second time.
 *
 * **Where it sits.** Inside `recordingPort`, which wraps the port each job hands the pipeline. So a
 * send that answers writes exactly one `model_receipt`, an `unavailable` send writes nothing at
 * all, and a `Spent` thrown through here reaches `recordingSpend` and leaves its `lost_call` row.
 */
export function retryingModelPort(
  model: LanguageModelPort,
  transient: RenderSettings['transient'],
): LanguageModelPort {
  /** One call, sent again while the provider answers unavailable. */
  async function sent<T>(what: string, of: () => Promise<T>): Promise<T> {
    const { answer } = await sentUntilAvailable(what, transient, async () => {
      try {
        return { kind: 'answered' as const, value: await of() }
      } catch (error) {
        // ONLY the transient class is a second send. A `Spent` and a fault both leave here by the
        // same door they came in — this throws out of the sender, which stops the loop.
        if (isUnavailable(error)) return { kind: 'unavailable' as const, detail: error.detail }
        throw error
      }
    })
    return answer.value
  }

  return {
    structured: (call) => sent(`the ${call.role} call`, () => model.structured(call)),
    observe: (call) => sent('the witness call', () => model.observe(call)),
    compare: (call) => sent('the compare call', () => model.compare(call)),
    judgeCut: (call) => sent('the judge call', () => model.judgeCut(call)),
    readText: (call) => sent("the text step's call", () => model.readText(call)),
  }
}
