import { z } from 'zod'
import type { WitnessObservation } from '@cutroom/contracts'

// What a witness's answer must be before anything reads it (D-041, as amended by D-044). The model
// port types an `observe` answer `unknown`; this is the gate boundary where it is parsed, and an
// answer that does not parse reaches no consumer (S-042).

const observedEntity = z.strictObject({
  /** The witness's own words, never the plan's: it has never seen the plan (I-8). */
  label: z.string().min(1),
  count: z.number().int().positive(),
  position: z.enum(['left', 'centre', 'right']),
  prominence: z.enum(['foreground', 'midground', 'background']),
  faceVisible: z.enum(['yes', 'partial', 'no', 'noFace']),
  occluded: z.boolean(),
  /** D-044: the frame-edge veto's closed question, required on every entity. */
  clippedByEdge: z.boolean(),
})

/**
 * A still's observation. Every object is strict, so D-041's temporal block — `actions` and
 * `eventOrder`, a clip's only — is refused on a still whether it is full or empty: its absence is
 * the whole meaning of a still's observation.
 */
export const witnessObservation: z.ZodType<WitnessObservation> = z.strictObject({
  entities: z.array(observedEntity),
  framing: z.enum(['closeUp', 'medium', 'wide', 'extremeWide']),
  setting: z.string(),
  lighting: z.enum(['bright', 'dim', 'mixed', 'silhouette']),
  readableTextPresent: z.boolean(),
  ambiguities: z.array(z.string()),
  unsafeDepictions: z.array(z.string()),
})
