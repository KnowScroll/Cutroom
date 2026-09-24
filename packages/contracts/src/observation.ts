import { z } from 'zod'
import type { ClipObservation } from './clip.ts'
import type { WitnessObservation } from './picture.ts'

// What a witness's answer must be — ONE COPY, which the gate parses under and the adapter asks with
// (docs/features/ask-again.md, Slice 1; S-156). Moved here unchanged from the pipeline's
// `stills/observation.ts` and `clips/observation.ts`, which re-export it.
//
// WHY IT LIVES IN CONTRACTS. The MiniMax adapter used to keep its own copy of this shape, because
// `packages/providers` cannot import the pipeline — and its copy said `count` was any integer, a
// `label` could be empty and no object was strict, while the gate refused all three. The witness
// counted uncountable stars −1 or "many" on a picture that stopped two reels; shown this schema
// instead, it was refused 0 times in 8 (S-156's measurement). The enums matched, which is what
// S-144's sentence read; the constraints did not. S-139's lesson on a number: the answerer must see
// the constraint it is judged by. One copy makes the drift impossible rather than detected.
//
// The adapter ASKS with these objects and never parses with them: an observation is parsed by the
// pipeline at the gate boundary, and an answer that does not parse reaches no consumer (D-041,
// S-042). `ask-again`'s check 1 holds that an answer these schemas refuse comes back from the
// adapter as its value.

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
 * D-041's fields, which a still's observation and a clip's share: one witness, one contract, and
 * only the input differs (D-053). The clip's schema is these and the temporal block, so the two can
 * never disagree about an entity.
 */
const observationFields = {
  entities: z.array(observedEntity),
  framing: z.enum(['closeUp', 'medium', 'wide', 'extremeWide']),
  setting: z.string(),
  lighting: z.enum(['bright', 'dim', 'mixed', 'silhouette']),
  readableTextPresent: z.boolean(),
  ambiguities: z.array(z.string()),
  unsafeDepictions: z.array(z.string()),
}

/**
 * A still's observation. Every object is strict, so D-041's temporal block — `actions` and
 * `eventOrder`, a clip's only — is refused on a still whether it is full or empty: its absence is
 * the whole meaning of a still's observation.
 */
export const witnessObservation: z.ZodType<WitnessObservation> = z.strictObject(observationFields)

/**
 * A clip's observation (D-041, D-044, D-053, S-072): a still's fields, built from the same
 * definition, and D-041's temporal block, required. Strict, as a still's is. Required means present:
 * a clip in which nothing moves answers empty lists, and is described, not refused.
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
