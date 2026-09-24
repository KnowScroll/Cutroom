import type { z } from 'zod'
import { isSpent, type LanguageModelPort, type ModelReceipt } from '@cutroom/contracts'

// A `structured` call, asked — and asked ONCE more when the model's answer was refused for its
// shape (docs/features/ask-again.md, Gate 2 "askStructured, whole"; S-156). Every structured call
// the pipeline makes goes through here: the plan, its two scores and its repair (D-061, D-064),
// Gate 1's reconcile (S-040) and Gate 5 (S-072). `ask-again`'s check 11 finds no other.
//
// The adapter parses a structured answer under the caller's schema and, when it cannot use it,
// throws `Spent` (S-142). Only a `Spent` carrying `refused` — the caller's schema refused the
// answer, it is not JSON, or it is the schema — is the ANSWER's fault, and only that is asked
// again: a NEW call, the same prompt, schema, role, temperature and ids, and the reasons, which the
// adapter says after the prompt. A budget or a wire failure (S-135, S-140), a fault and an
// `Unavailable` the worker's counter already sent `maxAttempts` times propagate unchanged.
//
// ONCE. A throw from the second ask propagates as it came, its `Spent`'s words failing the run;
// there is no third ask. The first ask's `Spent` is not swallowed: the worker has already written
// its `lost_call` row and its `refused_answer` row before it reaches here (D-084).

export async function askStructured<T>(
  model: LanguageModelPort,
  call: {
    prompt: string
    schema: z.ZodType<T>
    role: 'planner' | 'reconciler'
    temperature: 0
    pictureIds?: readonly string[]
    takeIds?: readonly string[]
  },
): Promise<{ value: T; receipt: ModelReceipt }> {
  try {
    return await model.structured(call)
  } catch (first) {
    if (!isSpent(first) || first.receipt.refused === undefined) throw first
    return model.structured({ ...call, refused: first.receipt.refused })
  }
}
