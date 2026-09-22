// WHAT IS TRANSIENT, WHAT IS A FAULT, AND WHAT HAS ALREADY SPENT (S-096, S-142, I-11,
// docs/features/paid-path.md Gate 2, docs/features/paid-failures.md Gate 2).
//
// A real adapter only CLASSIFIES. It never sends again, never waits and never counts: the sending,
// the backoff and the counter belong to the worker's guarded ports, which S-096 built and
// `reel-takes` verified. What an adapter owes its caller is an honest answer to one question —
// did the provider make nothing and might it if it is asked again, or is this wrong in a way that
// a second send cannot fix?
//
// The video and the narration ports carry the transient answer in their types:
// `{ kind: 'unavailable' }` is an answer those ports may return. `LanguageModelPort` has no such
// arm, so the model adapter carries the classification in the ERROR IT THROWS, as a type, and
// `apps/worker`'s model port counts those throws (S-137, paid-failures Slice 4).
//
// A THIRD ANSWER, since paid-failures: `Spent` — the provider made something and we could not use
// it. It carries the row that call owes the record, because a paid call that leaves no row is
// spend the budget guard reads as zero (S-133, S-059, S-087, S-095).
//
// BOTH CLASSES ARE DECLARED IN `packages/contracts` AND RE-EXPORTED HERE, unchanged in name and in
// meaning, so that no adapter's import line moved. They live there because `worker-no-providers`
// forbids `apps/worker` importing this package (S-038) and the worker is what catches them — which
// is exactly why the model port had no retry until now. See `packages/contracts/src/failures.ts`.

export { Spent, Unavailable, isSpent, isUnavailable, type LostCall } from '@cutroom/contracts'

/**
 * An HTTP status a provider answered with: whether it is transient.
 *
 * **429** is the provider saying it is busy and **5xx** is it being briefly broken; both are
 * I-11's _"A 500 is not a bad picture and is often unbilled"_. **408** is the provider's own
 * timeout, which is the same thing as ours. Everything else — 400 (the request was wrong),
 * 401 and 403 (the key is wrong, and sending it again cannot help), 404, 422 — is a fault.
 */
export function transientStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500
}

/**
 * One thrown thing's message, for the `detail` of a {@link Spent}. An adapter's own message, never
 * a stack and never a key: every message this repository's adapters build names the model and the
 * request id and nothing else (S-109, D-022).
 */
export function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
