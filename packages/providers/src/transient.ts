// WHAT IS TRANSIENT, AND WHAT IS A FAULT (S-096, I-11, docs/features/paid-path.md, Gate 2).
//
// A real adapter only CLASSIFIES. It never sends again, never waits and never counts: the sending,
// the backoff and the counter belong to the worker's guarded ports, which S-096 built and
// `reel-takes` verified. What an adapter owes its caller is an honest answer to one question —
// did the provider make nothing and might it if it is asked again, or is this wrong in a way that
// a second send cannot fix?
//
// The video and the narration ports carry that answer in their types: `{ kind: 'unavailable' }` is
// an answer those ports may return. `LanguageModelPort` has no such arm — its four calls return
// `{ value, receipt }`, nothing wraps the model port with retry, and S-096 says plainly that a
// thrown model call fails the run "until the paid-path feature builds the adapters that fail
// transiently". So the model adapter carries the classification in the ERROR IT THROWS, as a type.
//
// S-096 rejected "a thrown error carrying a marker" for video and narration, because the worker
// would have recognised a transient by an error's SHAPE, and a thrown bug of the same shape would
// have been sent again. This is not that: `Unavailable` is a class nothing else constructs, so no
// bug can produce one by accident, and no code reads a message to decide what happened.

/**
 * The provider made nothing, and it may if it is asked again: 429, 5xx, a connection error, or a
 * call that timed out before an answer arrived (S-096).
 *
 * `detail` is what a caller records or puts in a message — the status, or what the transport said.
 * IT NEVER HOLDS A KEY: an adapter naming its call names the model and the request id, never a
 * header and never a credential (S-109, D-022).
 */
export class Unavailable extends Error {
  readonly kind = 'unavailable'
  readonly detail: string

  constructor(detail: string) {
    super(`the provider is unavailable: ${detail}`)
    this.name = 'Unavailable'
    this.detail = detail
  }
}

/** Whether one thrown thing is the transient answer. A class, never a shape or a message. */
export function isUnavailable(error: unknown): error is Unavailable {
  return error instanceof Unavailable
}

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
