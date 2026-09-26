// HOW A CALL THAT REACHED A PROVIDER FAILS (docs/features/paid-failures.md, Gate 2; S-096, S-142),
// AND WHAT KIND OF FAILURE A RUN ENDED ON (docs/features/resume-failed.md, Gate 2; S-163).
//
// The classes are here — not in `packages/providers`, where the adapters that throw them
// live — for one reason: `worker-no-providers` forbids `apps/worker` importing that package
// (S-038), and the worker is the only place that knows both a stage and a table. A name the
// adapter throws and the worker catches has to come from a package both sides already import.
//
// That boundary is not a detail of this file; it is WHY `Unavailable` was never seen by the worker
// and why the model port had no transient retry until this feature (S-137). `packages/contracts`
// imports nothing internal and already holds runtime values beside its types, so this costs no new
// package and no new rule.
//
// Every one is a CLASS, never a shape and never a message. S-096 rejected "a thrown error carrying a
// marker" because a thrown bug of the same shape would have been treated as the real thing; a
// class nothing else constructs cannot be produced by accident, and no code reads a message to
// decide what happened.

import type { Refusals } from './brands.ts'

/**
 * What a call that has already spent owes the record (S-142): the port it was made on, the wire
 * that was actually called, what it cost by our configured rate, and what went wrong.
 *
 * ITS `detail` NEVER HOLDS A KEY, a presigned URL or a query string: an adapter naming its call
 * names the model and the request id, never a header and never a credential (S-109, D-022). Its
 * `answer`, when there is one, is the MODEL's text, which the adapter does not vet: it is redacted
 * where it is written, by `recordRefusedAnswer` (docs/features/ask-again.md, S-156).
 */
export interface LostCall {
  port: 'image' | 'video' | 'speech' | 'model'
  /** The wire that was actually called, as every receipt records it (S-128). */
  model: string
  /** The configured rate applied to what was asked for, rounded as the guard rounds (S-059). */
  costCents: number
  /** What went wrong, in the adapter's own words. */
  detail: string
  /**
   * The model's answer, when the adapter held one and could not use it: its text after the reasoning
   * block and a whole-answer fence (S-132). Absent for a body that is not the wire, a reasoning block
   * with nothing after it, and every port but the model's (S-156).
   */
  answer?: string
  /**
   * Why the ANSWER was refused, when it is the answer's fault and asking again could change it: the
   * caller's schema refused it, it is not JSON, or it is the schema. A `structured` call whose
   * `Spent` carries this is asked once more by the pipeline, told these; one without it is not
   * (S-156, S-140).
   */
  refused?: Refusals
}

/**
 * The provider made something and we could not use it: a body that does not parse, a picture whose
 * frame the entry refuses, a download that is no clip, an answer that is not the JSON it was asked
 * for (S-133, S-124, S-125, S-140).
 *
 * The call is PAID FOR, so it is never SENT again — that is the difference between this and
 * {@link Unavailable}, which is the provider having made nothing. The worker writes the receipt
 * this carries and rethrows the error unchanged, so the stage fails the run exactly as it did
 * before this existed (S-046).
 *
 * One exception, and it is not a re-send (docs/features/ask-again.md, S-156): a model `structured`
 * call whose `Spent` carries `refused` — the ANSWER was refused for its shape — is ASKED once more
 * by the pipeline, a new call told why, because model calls cost nothing under the Token Plan
 * (S-129). Every other `Spent` fails the run exactly as before.
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

// ---------------------------------------------------------------- the kind (S-163)
//
// Five classes more, each thrown where a plain Error used to lose the fact, and EACH WITH ITS MESSAGE
// CHARACTER FOR CHARACTER WHAT IT WAS — so every verified assertion on a failure's detail holds
// (docs/features/resume-failed.md, Gate 2 "Which endings are resumed, and who judges").

/**
 * The provider made something that is not what this engine may use at all: fal's picture whose frame
 * the entry refuses (P-010). A `Spent` still, so its lost call is written as before (S-142); its kind
 * is `off-spec`, which no resume makes again, because the same entry would make the same frame.
 */
export class OffSpec extends Spent {
  constructor(receipt: LostCall) {
    super(receipt)
    this.name = 'OffSpec'
  }
}

/**
 * The provider answered that it refused OUR request — MiniMax's narration answering 200 with a
 * non-transient `base_resp` status: a key, a balance, a parameter. A `Spent` still, because the
 * adapter had its answer (S-142); its kind is `engine`, as the model adapter's same case is: a
 * request that was wrong is wrong the second time (S-096, S-163).
 */
export class RefusedRequest extends Spent {
  constructor(receipt: LostCall) {
    super(receipt)
    this.name = 'RefusedRequest'
  }
}

/**
 * A model answer a GATE refused at its last ask: the witness's second refusal, Gate 1S's and Gate 7's
 * judge answers that do not parse, and the text step's reading that is not text. Its kind is
 * `unreadable`, as a `Spent` answer's is: asking again in a new run could change it (S-156, S-163).
 */
export class Unanswered extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'Unanswered'
  }
}

/**
 * A job fal ACCEPTED AND THEN REPORTED FAILED — both of the FAILED branch's shapes, its result read
 * answering 200 and answering an error. Not an `Unavailable`: nothing sends it again inside the run,
 * as nothing did before. Its kind is `provider-failed`, which a resume may make again.
 */
export class ProviderFailed extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ProviderFailed'
  }
}

/**
 * The transient counter spent: a call answered `unavailable` at every one of its sends (S-096, I-11).
 * An `Unavailable` — the provider made nothing — thrown by the counter itself, outside its own loop,
 * so nothing sends it again; its message is the counter's own sentence, not `Unavailable`'s form.
 */
export class StillUnavailable extends Unavailable {
  constructor(message: string) {
    super(message)
    // `Unavailable` prefixes its detail; the counter's sentence already names the call and the sends.
    this.message = message
    this.name = 'StillUnavailable'
  }
}

/**
 * What a failed run's `run.failure` holds (S-163). Four are resumable, by the engine with its switch
 * on or by a caller asking: `unavailable`, `unreadable`, `provider-failed` and `crashed`. `off-spec`
 * and `engine` never are.
 */
export type FailureKind =
  'unavailable' | 'unreadable' | 'provider-failed' | 'crashed' | 'off-spec' | 'engine'

/**
 * The kind of one thrown thing, by its CLASS alone — never its message (S-096's rejection of a
 * marker). `OffSpec` and `RefusedRequest` are checked before `Spent`, because each IS one; everything
 * that is none of these — a plain Error, a ZodError, a string, fs, ffmpeg, a 4xx, the stand-in out of
 * its script — is `engine`. `crashed` is never thrown: the stills stage returns it where it knows it.
 */
export function failureKindOf(error: unknown): FailureKind {
  if (error instanceof OffSpec) return 'off-spec'
  if (error instanceof RefusedRequest) return 'engine'
  if (error instanceof Spent) return 'unreadable'
  if (error instanceof Unanswered) return 'unreadable'
  if (error instanceof Unavailable) return 'unavailable'
  if (error instanceof ProviderFailed) return 'provider-failed'
  return 'engine'
}
