import { z } from 'zod'
import type { ClipObservation } from '@cutroom/contracts'
import { observationFields } from '../stills/observation.ts'

// What a witness's answer on a clip must be before anything reads it (D-041, D-044, D-053, S-072).
// The model port types an `observe` answer `unknown`; this is Gate 4's boundary, where it is parsed,
// and an answer that does not parse finishes the run failed (S-042).

/**
 * A clip's observation: a still's fields, built from the same definition, and D-041's temporal
 * block, required. Strict, as a still's is. Required means present: a clip in which nothing moves
 * answers empty lists, and is described, not refused.
 */
export const clipObservation: z.ZodType<ClipObservation> = z.strictObject({
  ...observationFields,
  actions: z.array(
    z.strictObject({
      /** The witness's own words for who acts, never the plan's (I-8). */
      entity: z.string().min(1),
      verb: z.string().min(1),
      completes: z.boolean(),
    }),
  ),
  eventOrder: z.array(z.string()),
})
