import type { z } from 'zod'
import {
  witnessRefusalsOf,
  type RefusalRecorder,
  type RefusedAnswer,
  type WitnessRefusals,
} from '@cutroom/contracts'

// The witness, asked — and asked once more, TOLD WHY, when its answer is refused
// (docs/features/second-ask.md, S-146, S-147; docs/features/ask-again.md, S-156). Gate 1 on a still
// and Gate 4 on a clip both call this: the gate builds the `observe` argument ONCE, and this sends
// it, reads the answer under the gate's own schema, and on a refusal sends a NEW object — that
// argument and `refused`, the first answer's issues — a second time.
//
// WHAT THE SECOND ASK SAYS, AND WHY IT IS NOT A DOOR FOR THE BRIEF (I-8). `refused` is a
// `WitnessRefusals`, built only by `witnessRefusalsOf`, from the witness's own two schemas over the
// answer the witness just gave: a field's path and what it must be, never a value and never the
// brief. It was measured that asking the same thing again did not help — four asks, four refusals,
// one picture (S-156) — and the witness is still told nothing about what it is looking at.
//
// ONCE. A second refusal fails the run with today's words and the SECOND answer's issues (S-042),
// in the one `<path>: <message>` format `refusals.ts` keeps. A throw on either ask is not a refusal
// and propagates unchanged: `Unavailable` has the worker's counter, `Spent` its `lost_call` row and
// its kept answer, and a fault is a request that was wrong (S-137, S-142).
//
// EVERY REFUSED ANSWER IS KEPT: handed to the `refusals` port before anything else happens, so a
// person can read what the witness wrote (S-156). Each ask is a call and keeps its receipt, so a
// refused-then-parsed answer leaves two `observe` receipts; the observation is tied to the LAST of
// them (S-147). Only the answer that parses ever becomes a record (I-15's reason).

/** A refused answer as it is kept: which ask, why, and what the witness wrote. */
function kept(id: string, ask: 1 | 2, reasons: WitnessRefusals, value: unknown): RefusedAnswer {
  return {
    port: 'model',
    role: 'witness',
    call: 'observe',
    about: [id],
    ask,
    reasons,
    answer: JSON.stringify(value) ?? String(value),
  }
}

export async function askWitness<C extends object, T>(
  call: C,
  observe: (call: C & { refused?: WitnessRefusals }) => Promise<{ value: unknown }>,
  schema: z.ZodType<T>,
  id: string,
  noun: 'an observation' | 'a clip observation',
  refusals: RefusalRecorder,
): Promise<T> {
  const first = await observe(call)
  const told = witnessRefusalsOf(first.value, schema)
  if (told === null) return schema.parse(first.value)
  await refusals.keep(kept(id, 1, told, first.value))

  const second = await observe({ ...call, refused: told })
  const again = witnessRefusalsOf(second.value, schema)
  if (again === null) return schema.parse(second.value)
  await refusals.keep(kept(id, 2, again, second.value))
  throw new Error(`the witness's answer for ${id} is not ${noun}: ${again.join('; ')}`)
}
