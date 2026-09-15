import type { LanguageModelPort, ModelReceipt, ModelRole } from '@cutroom/contracts'

// The stand-in LanguageModelPort (docs/features/reel-plan.md, Gate 2 "The model port and the
// stand-in"). It is the only model the engine has: it runs on this machine, reads no secret and
// reaches no network. It answers each call from a script a test supplies, keyed by role and by call
// order within that role, and holds no durable state.

/** One scripted answer: a value to parse under the call's schema, or an error to throw. */
export type FakeAnswer = { value: unknown } | { throws: string }

/** The answers for each role, in the order that role's calls arrive. */
export type FakeScript = Partial<Record<ModelRole, readonly FakeAnswer[]>>

/** A call the stand-in received, exactly as it was made. */
export type FakeCall = Parameters<LanguageModelPort['structured']>[0]

export type FakeModel = LanguageModelPort & {
  /** Every call received, in order — including one whose answer failed to parse or was a throw. */
  readonly calls: readonly FakeCall[]
}

export function fakeModel(
  script: FakeScript,
  options: { models: Readonly<Record<ModelRole, string>> },
): FakeModel {
  const calls: FakeCall[] = []
  const answered: Record<ModelRole, number> = { planner: 0, reconciler: 0 }

  return {
    calls,
    async structured(call) {
      calls.push(call)
      const index = answered[call.role]
      answered[call.role] = index + 1
      const entry = script[call.role]?.[index]
      if (entry === undefined) {
        throw new Error(`the stand-in's script has no answer for ${call.role} call ${index + 1}`)
      }
      if ('throws' in entry) throw new Error(entry.throws)

      // Parsed under the schema the call asked for, so a script that does not match fails the way a
      // real answer would.
      const value = call.schema.parse(structuredClone(entry.value))
      const receipt: ModelReceipt = {
        model: options.models[call.role],
        role: call.role,
        temperature: call.temperature,
        usage: { inputTokens: 0, outputTokens: 0 },
        fake: true,
      }
      return { value, receipt }
    },
  }
}
