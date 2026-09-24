import type { z } from 'zod'
import type { Refusals, WitnessRefusals } from './brands.ts'
import { clipObservation, witnessObservation } from './observation.ts'

// The ONLY builders of the two brands (docs/features/ask-again.md; S-156). `ask-again`'s check 6
// finds no cast to `Refusals` or `WitnessRefusals` outside this file, and compiles a string array
// or another schema's refusal handed to `observe` as a type error.

/** One issue as a reason: `<path or (answer)>: <message>` — the format S-042 has always used. */
function lines(issues: readonly z.core.$ZodIssue[]): string[] {
  return issues.map((i) => `${i.path.join('.') || '(answer)'}: ${i.message}`)
}

/** Why a `structured` answer's schema refused it, one issue a line. */
export function refusalsOf(error: z.ZodError): Refusals {
  return lines(error.issues) as unknown as Refusals
}

/**
 * The two reasons a `structured` answer is refused that are not a schema's issues: it is not JSON at
 * all, or it is the schema itself rather than an object matching it (S-136). A cut-off answer is
 * neither — it is the token budget (S-140), and is not asked again.
 */
export const ANSWER_REFUSALS = {
  'not-json': 'the answer is not JSON: answer with one JSON object and nothing around it',
  schema: 'the answer is the schema itself, not an object that matches it',
} as const

export function answerRefusal(kind: keyof typeof ANSWER_REFUSALS): Refusals {
  return [ANSWER_REFUSALS[kind]] as unknown as Refusals
}

/**
 * Why the witness's answer is refused — parsed HERE, under the schema the gate parses with, which
 * must be `witnessObservation` or `clipObservation` BY IDENTITY: any other schema throws, because
 * another schema's messages can quote the brief. `null` when the answer parses.
 */
export function witnessRefusalsOf(
  value: unknown,
  schema: z.ZodType<unknown>,
): WitnessRefusals | null {
  if (schema !== witnessObservation && schema !== clipObservation) {
    throw new Error("a witness's refusal is built only from the witness's own schemas (S-156)")
  }
  const parsed = schema.safeParse(value)
  return parsed.success ? null : (lines(parsed.error.issues) as unknown as WitnessRefusals)
}
