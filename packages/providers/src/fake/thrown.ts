import {
  OffSpec,
  ProviderFailed,
  RefusedRequest,
  Spent,
  Unanswered,
  Unavailable,
  type LostCall,
} from '@cutroom/contracts'

// What a stand-in's scripted throw throws (docs/features/resume-failed.md, Gate 2 "The stand-ins";
// S-163, S-116). Without `as`, a plain Error with the scripted message — as every stand-in always
// threw, so a verified test that fails a run with one still fails it as `engine`. With `as`, the class
// a real adapter throws in that case, the scripted message as its detail, so a check can fail a run
// with each kind the engine judges without a network.

/** The classes a scripted throw may name. Nothing else: a misspelt one refuses to build the stand-in. */
export const STAND_IN_FAILURES = [
  'unavailable',
  'spent',
  'off-spec',
  'unanswered',
  'provider-failed',
  'refused-request',
] as const

export type StandInFailure = (typeof STAND_IN_FAILURES)[number]

/**
 * Refuses a script whose entries name a class outside the six, naming the entry — checked where the
 * stand-in is built, before any call, so a misspelt class is never a plain error in disguise: it
 * would fail a run as `engine` and pass for whatever it was meant to be.
 */
export function checkedFailures(who: string, entries: Iterable<readonly [string, unknown]>): void {
  for (const [key, entry] of entries) {
    if (typeof entry !== 'object' || entry === null || !('as' in entry)) continue
    const as = (entry as { as: unknown }).as
    if (as === undefined) continue
    if (!(STAND_IN_FAILURES as readonly unknown[]).includes(as)) {
      throw new Error(
        `${who}'s script entry ${key} names the class ${JSON.stringify(as)}, which is not one of ${STAND_IN_FAILURES.join(', ')} (S-163)`,
      )
    }
  }
}

/**
 * The thrown thing for one scripted throw. A `Spent` of any kind carries the row a real call would
 * owe (S-142): the stand-in's port and model, and the cost the entry says, 0 when it says none.
 */
export function scriptedThrow(
  message: string,
  as: StandInFailure | undefined,
  owed: Omit<LostCall, 'detail'>,
): Error {
  const lost: LostCall = { ...owed, detail: message }
  switch (as) {
    case undefined:
      return new Error(message)
    case 'unavailable':
      return new Unavailable(message)
    case 'spent':
      return new Spent(lost)
    case 'off-spec':
      return new OffSpec(lost)
    case 'unanswered':
      return new Unanswered(message)
    case 'provider-failed':
      return new ProviderFailed(message)
    case 'refused-request':
      return new RefusedRequest(lost)
  }
}
