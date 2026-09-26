import {
  Spent,
  refusalsOf,
  type ClipRef,
  type LanguageModelPort,
  type ModelCall,
  type ModelReceipt,
  type ModelRole,
  type PictureRef,
} from '@cutroom/contracts'
import { checkedFailures, scriptedThrow, type StandInFailure } from './thrown.ts'

// The stand-in LanguageModelPort (docs/features/reel-plan.md, Gate 2 "The model port and the
// stand-in"; docs/features/reel-stills.md and reel-render.md, Gate 2 "The stand-ins"). It is the
// only model the engine has: it runs on this machine, reads no secret and reaches no network. It
// answers each call from a script a test supplies, keyed by role and by call order within that
// role, and holds no durable state.
//
// The calls keep what they received in SIX LISTS. `calls` is the `structured` calls and only
// those, so reel-plan's checks that read it are untouched (S-047); `observeCalls` is `observe` on a
// picture and only that, so reel-stills' check 26 reads what it always did (S-072); and
// `observeClipCalls`, `compareCalls`, `judgeCutCalls` and `readTextCalls` are the rest. They are what a check reads
// to see what actually reached the model — the type alone cannot prove a brief never got to the
// witness, because a value passed as an argument compiles against a variable (S-037).

/**
 * One scripted answer: a value to parse under the call's schema, or an error to throw — a plain Error,
 * or the class `as` names, its message then that class's for `throws` (resume-failed, S-163).
 */
export type FakeAnswer = { value: unknown } | { throws: string; as?: StandInFailure }

/**
 * The answers for each role, in the order that role's calls arrive. `witness` answers `observe`,
 * on a picture or a clip, AND `readText`, Gate 1's text step; `judge` answers `compare` and
 * `judgeCut`. Each call has exactly one role (S-037, S-072, S-074, S-126).
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
/** A `readText` call the stand-in received, exactly as it was made (S-112, S-126). */
export type FakeReadTextCall = Parameters<LanguageModelPort['readText']>[0]

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
  /** Every `readText` call received, in order — Gate 1's text step (S-126). */
  readonly readTextCalls: readonly FakeReadTextCall[]
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
  const readTextCalls: FakeReadTextCall[] = []
  for (const [role, answers] of Object.entries(script)) {
    checkedFailures(
      'the stand-in model',
      (answers ?? []).map((answer, i) => [`${role} ${i + 1}`, answer] as const),
    )
  }
  const answered: Record<ModelRole, number> = { planner: 0, reconciler: 0, witness: 0, judge: 0 }

  /** The next scripted answer for a role, or the error a missing one deserves. */
  function next(role: ModelRole): FakeAnswer {
    const index = answered[role]
    answered[role] = index + 1
    const entry = script[role]?.[index]
    if (entry === undefined) {
      throw new Error(`the stand-in's script has no answer for ${role} call ${index + 1}`)
    }
    if ('throws' in entry) {
      throw scriptedThrow(entry.throws, entry.as, {
        port: 'model',
        model: options.models[role],
        costCents: 0,
      })
    }
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
    readTextCalls,

    async structured(call) {
      calls.push(call)
      const entry = next(call.role)

      // Parsed under the schema the call asked for, so a script that does not match fails the way
      // a real answer would — as `Spent`, carrying the answer and why it was refused, because that
      // is what the MiniMax adapter throws when the caller's schema refuses what the model wrote
      // (S-142, S-156). The pipeline asks such an answer once more; a `{ throws }` entry is a fault
      // and is not asked again.
      const scripted = structuredClone((entry as { value: unknown }).value)
      const parsed = call.schema.safeParse(scripted)
      if (!parsed.success) {
        throw new Spent({
          port: 'model',
          model: options.models[call.role],
          costCents: 0,
          detail: `the stand-in's ${call.role} answer is refused by its schema: ${parsed.error.message}`,
          answer: JSON.stringify(scripted) ?? String(scripted),
          refused: refusalsOf(parsed.error),
        })
      }
      const value = parsed.data
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

    async readText(call) {
      // Gate 1's text step (S-112, S-126). It is the WITNESS's model, and it is the witness's
      // script: a picture past the technical step is asked twice, in gate1's order — the text
      // step, then the observation. A run whose script holds one answer a picture runs out here,
      // which is the stand-in doing its job (S-116).
      readTextCalls.push(call)
      const entry = next('witness')
      // Unparsed, like every other call that carries a picture: the sensor is what turns this
      // into `string[]`, and an answer that is not that shape must fail there (S-042's form).
      return {
        value: structuredClone((entry as { value: unknown }).value),
        receipt: receipt('witness', 'readText', call.temperature, {
          pictureIds: [call.picture.pictureId],
        }),
      }
    },
  }
}
