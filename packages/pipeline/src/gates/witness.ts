import type { z } from 'zod'

// The witness, asked — and asked once more when its answer is refused (docs/features/second-ask.md,
// S-146, S-147). Gate 1 on a still and Gate 4 on a clip both call this: the gate builds the
// `observe` argument ONCE, and this sends that same object, parses the answer under the gate's own
// schema, and on a refusal sends the same object a second time. Nothing is added to the second
// ask — no hint, no quoted first answer — because the witness is told nothing about what it is
// looking at (I-8).
//
// ONCE. A second refusal fails the run with today's words and the SECOND answer's issues (S-042).
// A throw on either ask is not a refusal and propagates unchanged: `Unavailable` has the worker's
// counter, `Spent` its `lost_call` row, and a fault is a request that was wrong (S-137, S-142).
//
// Each ask is a call and keeps its receipt, so a refused-then-parsed answer leaves two `observe`
// receipts; the observation is tied to the LAST of them (S-147). Only the answer that parses ever
// becomes a record, so there is still one record of what the picture or clip shows (I-15's reason).

/** How a refused answer's issues are named: today's format, unchanged (S-042). */
function issuesOf(error: z.ZodError): string {
  return error.issues.map((i) => `${i.path.join('.') || '(answer)'}: ${i.message}`).join('; ')
}

export async function askWitness<C, T>(
  call: C,
  observe: (call: C) => Promise<{ value: unknown }>,
  schema: z.ZodType<T>,
  id: string,
  noun: 'an observation' | 'a clip observation',
): Promise<T> {
  const first = schema.safeParse((await observe(call)).value)
  if (first.success) return first.data
  const second = schema.safeParse((await observe(call)).value)
  if (second.success) return second.data
  throw new Error(`the witness's answer for ${id} is not ${noun}: ${issuesOf(second.error)}`)
}
