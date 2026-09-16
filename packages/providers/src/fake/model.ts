import type { LanguageModelPort, ModelCall, ModelReceipt, ModelRole } from '@cutroom/contracts'

// The stand-in LanguageModelPort (docs/features/reel-plan.md, Gate 2 "The model port and the
// stand-in"; docs/features/reel-stills.md, Gate 2 "The stand-ins"). It is the only model the
// engine has: it runs on this machine, reads no secret and reaches no network. It answers each
// call from a script a test supplies, keyed by role and by call order within that role, and holds
// no durable state.
//
// The three calls keep their received calls in THREE LISTS. `calls` is the `structured` calls and
// only those, so reel-plan's checks that read it are untouched (S-047); `observeCalls` and
// `compareCalls` are what a check reads to see what actually reached the model — the type alone
// cannot prove a brief never got to the witness, because a value passed as an argument compiles
// against a variable (S-037).

/** One scripted answer: a value to parse under the call's schema, or an error to throw. */
export type FakeAnswer = { value: unknown } | { throws: string }

/**
 * The answers for each role, in the order that role's calls arrive. `witness` answers `observe`
 * and `judge` answers `compare`, since each of those calls has exactly one role (S-037).
 */
export type FakeScript = Partial<Record<ModelRole, readonly FakeAnswer[]>>

/** A `structured` call the stand-in received, exactly as it was made. */
export type FakeCall = Parameters<LanguageModelPort['structured']>[0]
/** An `observe` call the stand-in received, exactly as it was made (S-037, I-8). */
export type FakeObserveCall = Parameters<LanguageModelPort['observe']>[0]
/** A `compare` call the stand-in received, exactly as it was made (S-045). */
export type FakeCompareCall = Parameters<LanguageModelPort['compare']>[0]

export type FakeModel = LanguageModelPort & {
  /** Every `structured` call received, in order — including one whose answer failed or threw. */
  readonly calls: readonly FakeCall[]
  /** Every `observe` call received, in order. */
  readonly observeCalls: readonly FakeObserveCall[]
  /** Every `compare` call received, in order. */
  readonly compareCalls: readonly FakeCompareCall[]
}

export function fakeModel(
  script: FakeScript,
  options: { models: Readonly<Record<ModelRole, string>> },
): FakeModel {
  const calls: FakeCall[] = []
  const observeCalls: FakeObserveCall[] = []
  const compareCalls: FakeCompareCall[] = []
  const answered: Record<ModelRole, number> = { planner: 0, reconciler: 0, witness: 0, judge: 0 }

  /** The next scripted answer for a role, or the error a missing one deserves. */
  function next(role: ModelRole): FakeAnswer {
    const index = answered[role]
    answered[role] = index + 1
    const entry = script[role]?.[index]
    if (entry === undefined) {
      throw new Error(`the stand-in's script has no answer for ${role} call ${index + 1}`)
    }
    if ('throws' in entry) throw new Error(entry.throws)
    return entry
  }

  const receipt = (
    role: ModelRole,
    call: ModelCall,
    temperature: number,
    pictureIds: readonly string[],
  ): ModelReceipt => ({
    model: options.models[role],
    role,
    call,
    temperature,
    usage: { inputTokens: 0, outputTokens: 0 },
    fake: true,
    pictureIds,
  })

  return {
    calls,
    observeCalls,
    compareCalls,

    async structured(call) {
      calls.push(call)
      const entry = next(call.role)

      // Parsed under the schema the call asked for, so a script that does not match fails the way
      // a real answer would.
      const value = call.schema.parse(structuredClone((entry as { value: unknown }).value))
      return {
        value,
        receipt: receipt(call.role, 'structured', call.temperature, call.pictureIds ?? []),
      }
    },

    async observe(call) {
      observeCalls.push(call)
      const entry = next('witness')
      // Typed `unknown` by the port: the pipeline parses it at the gate, which is where a
      // malformed observation must be caught (D-041, S-042). The stand-in must not parse it here,
      // or that path could never be exercised.
      return {
        value: structuredClone((entry as { value: unknown }).value),
        receipt: receipt('witness', 'observe', call.temperature, [call.picture.pictureId]),
      }
    },

    async compare(call) {
      compareCalls.push(call)
      const entry = next('judge')
      return {
        value: structuredClone((entry as { value: unknown }).value),
        receipt: receipt(
          'judge',
          'compare',
          call.temperature,
          call.pictures.map((p) => p.pictureId),
        ),
      }
    },
  }
}
