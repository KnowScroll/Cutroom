import type {
  ClipRef,
  LanguageModelPort,
  ModelCall,
  ModelReceipt,
  ModelRole,
  PictureRef,
} from '@cutroom/contracts'

// The stand-in LanguageModelPort (docs/features/reel-plan.md, Gate 2 "The model port and the
// stand-in"; docs/features/reel-stills.md and reel-render.md, Gate 2 "The stand-ins"). It is the
// only model the engine has: it runs on this machine, reads no secret and reaches no network. It
// answers each call from a script a test supplies, keyed by role and by call order within that
// role, and holds no durable state.
//
// The calls keep what they received in FIVE LISTS. `calls` is the `structured` calls and only
// those, so reel-plan's checks that read it are untouched (S-047); `observeCalls` is `observe` on a
// picture and only that, so reel-stills' check 26 reads what it always did (S-072); and
// `observeClipCalls`, `compareCalls` and `judgeCutCalls` are the rest. They are what a check reads
// to see what actually reached the model — the type alone cannot prove a brief never got to the
// witness, because a value passed as an argument compiles against a variable (S-037).

/** One scripted answer: a value to parse under the call's schema, or an error to throw. */
export type FakeAnswer = { value: unknown } | { throws: string }

/**
 * The answers for each role, in the order that role's calls arrive. `witness` answers `observe`,
 * on a picture or a clip, and `judge` answers `compare` and `judgeCut`, since each of those calls
 * has exactly one role (S-037, S-072, S-074).
 */
export type FakeScript = Partial<Record<ModelRole, readonly FakeAnswer[]>>

/** A `structured` call the stand-in received, exactly as it was made. */
export type FakeCall = Parameters<LanguageModelPort['structured']>[0]
type ObserveCall = Parameters<LanguageModelPort['observe']>[0]
/** An `observe` call on a picture the stand-in received, exactly as it was made (S-037, I-8). */
export type FakeObserveCall = Extract<ObserveCall, { picture: PictureRef }>
/** An `observe` call on a clip the stand-in received, exactly as it was made (S-072, I-8). */
export type FakeObserveClipCall = Extract<ObserveCall, { clip: ClipRef }>
/** A `compare` call the stand-in received, exactly as it was made (S-045). */
export type FakeCompareCall = Parameters<LanguageModelPort['compare']>[0]
/** A `judgeCut` call the stand-in received, exactly as it was made (S-074). */
export type FakeJudgeCutCall = Parameters<LanguageModelPort['judgeCut']>[0]

export type FakeModel = LanguageModelPort & {
  /** Every `structured` call received, in order — including one whose answer failed or threw. */
  readonly calls: readonly FakeCall[]
  /** Every `observe` call on a picture received, in order. */
  readonly observeCalls: readonly FakeObserveCall[]
  /** Every `observe` call on a clip received, in order. */
  readonly observeClipCalls: readonly FakeObserveClipCall[]
  /** Every `compare` call received, in order. */
  readonly compareCalls: readonly FakeCompareCall[]
  /** Every `judgeCut` call received, in order. */
  readonly judgeCutCalls: readonly FakeJudgeCutCall[]
}

export function fakeModel(
  script: FakeScript,
  options: { models: Readonly<Record<ModelRole, string>> },
): FakeModel {
  const calls: FakeCall[] = []
  const observeCalls: FakeObserveCall[] = []
  const observeClipCalls: FakeObserveClipCall[] = []
  const compareCalls: FakeCompareCall[] = []
  const judgeCutCalls: FakeJudgeCutCall[] = []
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

  /** Every receipt names the pictures and the takes its call was about, or none (S-037, S-072). */
  const receipt = (
    role: ModelRole,
    call: ModelCall,
    temperature: number,
    about: { pictureIds?: readonly string[]; takeIds?: readonly string[] },
  ): ModelReceipt => ({
    model: options.models[role],
    role,
    call,
    temperature,
    usage: { inputTokens: 0, outputTokens: 0 },
    fake: true,
    pictureIds: about.pictureIds ?? [],
    takeIds: about.takeIds ?? [],
  })

  return {
    calls,
    observeCalls,
    observeClipCalls,
    compareCalls,
    judgeCutCalls,

    async structured(call) {
      calls.push(call)
      const entry = next(call.role)

      // Parsed under the schema the call asked for, so a script that does not match fails the way
      // a real answer would.
      const value = call.schema.parse(structuredClone((entry as { value: unknown }).value))
      return {
        value,
        receipt: receipt(call.role, 'structured', call.temperature, {
          pictureIds: call.pictureIds ?? [],
          takeIds: call.takeIds ?? [],
        }),
      }
    },

    async observe(call) {
      // A picture's call and a clip's are kept apart, so a check reading pictures sees only
      // pictures (S-072).
      if (call.clip === undefined) observeCalls.push(call)
      else observeClipCalls.push(call)
      const entry = next('witness')
      // Typed `unknown` by the port: the pipeline parses it at the gate, which is where a
      // malformed observation must be caught (D-041, S-042). The stand-in must not parse it here,
      // or that path could never be exercised.
      return {
        value: structuredClone((entry as { value: unknown }).value),
        receipt: receipt(
          'witness',
          'observe',
          call.temperature,
          call.clip === undefined
            ? { pictureIds: [call.picture.pictureId] }
            : { takeIds: [call.clip.takeId] },
        ),
      }
    },

    async compare(call) {
      compareCalls.push(call)
      const entry = next('judge')
      return {
        value: structuredClone((entry as { value: unknown }).value),
        receipt: receipt('judge', 'compare', call.temperature, {
          pictureIds: call.pictures.map((p) => p.pictureId),
        }),
      }
    },

    async judgeCut(call) {
      judgeCutCalls.push(call)
      const entry = next('judge')
      // S-074: its receipt names the frames it was shown, in timeline order.
      return {
        value: structuredClone((entry as { value: unknown }).value),
        receipt: receipt('judge', 'judgeCut', call.temperature, {
          pictureIds: call.shots.flatMap((s) => s.frames.map((f) => f.pictureId)),
        }),
      }
    },
  }
}
