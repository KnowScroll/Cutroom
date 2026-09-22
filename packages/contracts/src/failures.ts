// HOW A CALL THAT REACHED A PROVIDER FAILS (docs/features/paid-failures.md, Gate 2; S-096, S-142).
//
// Two classes, and they are here — not in `packages/providers`, where the adapters that throw them
// live — for one reason: `worker-no-providers` forbids `apps/worker` importing that package
// (S-038), and the worker is the only place that knows both a stage and a table. A name the
// adapter throws and the worker catches has to come from a package both sides already import.
//
// That boundary is not a detail of this file; it is WHY `Unavailable` was never seen by the worker
// and why the model port had no transient retry until this feature (S-137). `packages/contracts`
// imports nothing internal and already holds runtime values beside its types, so this costs no new
// package and no new rule.
//
// Both are CLASSES, never a shape and never a message. S-096 rejected "a thrown error carrying a
// marker" because a thrown bug of the same shape would have been treated as the real thing; a
// class nothing else constructs cannot be produced by accident, and no code reads a message to
// decide what happened.

/**
 * What a call that has already spent owes the record (S-142): the port it was made on, the wire
 * that was actually called, what it cost by our configured rate, and what went wrong.
 *
 * IT NEVER HOLDS A KEY, a presigned URL or a query string: an adapter naming its call names the
 * model and the request id, never a header and never a credential (S-109, D-022).
 */
export interface LostCall {
  port: 'image' | 'video' | 'speech' | 'model'
  /** The wire that was actually called, as every receipt records it (S-128). */
  model: string
  /** The configured rate applied to what was asked for, rounded as the guard rounds (S-059). */
  costCents: number
  /** What went wrong, in the adapter's own words. */
  detail: string
}

/**
 * The provider made something and we could not use it: a body that does not parse, a picture whose
 * frame the entry refuses, a download that is no clip, an answer that is not the JSON it was asked
 * for (S-133, S-124, S-125, S-140).
 *
 * The call is PAID FOR, so it is never sent again — that is the difference between this and
 * {@link Unavailable}, which is the provider having made nothing. The worker writes the receipt
 * this carries and rethrows the error unchanged, so the stage fails the run exactly as it did
 * before this existed (S-046).
 */
export class Spent extends Error {
  readonly kind = 'spent'
  readonly receipt: LostCall

  constructor(receipt: LostCall) {
    // The detail is the adapter's own message and already names the call and the wire, so this
    // says the one thing it does not: that the call was paid for before it failed.
    super(`${receipt.detail} — and the call had already spent (S-142)`)
    this.name = 'Spent'
    this.receipt = receipt
  }
}

/** Whether one thrown thing is a call that has already spent. A class, never a shape. */
export function isSpent(error: unknown): error is Spent {
  return error instanceof Spent
}

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
