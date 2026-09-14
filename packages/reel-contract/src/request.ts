import { z } from 'zod'
import { ContractVersion } from './version.ts'

// What a caller sends (docs/features/reel-contract.md, Gate 2 "What to send").
//
// Labels and criteria, never evidence (D-096, I-14): no source, claim text, truth state or
// exposure exists here. Every object is strict, so a body carrying any field this file does not
// define is rejected rather than silently stripped.

/** An opaque label for a claim. What it refers to stays in KnowScroll. */
export const ClaimId = z.string().min(1)

/** Each claim is listed once, with its role (D-102). */
export const ClaimRef = z.strictObject({
  id: ClaimId,
  role: z.enum(['main', 'supporting']),
})

/** The closed list two plans may differ on (D-062). Absent means the engine's default (D-092). */
export const PlanVaryOn = z.enum(['shotCount', 'order', 'canonicalSubject', 'angle'])

/** One sentence of narration, referencing claims by id string only (D-096). */
export const NarrationSentence = z.strictObject({
  text: z.string().min(1),
  claimIds: z.array(ClaimId),
})

export const Criterion = z.strictObject({
  id: z.string().min(1),
  text: z.string().min(1),
  claimId: ClaimId.optional(),
})

/** Already computed on the KnowScroll side, against a named depiction-policy version (D-096). */
export const Criteria = z.strictObject({
  mustShow: z.array(Criterion),
  mustNotShow: z.array(Criterion),
  depictionPolicyVersion: z.string().min(1),
})

export const StyleContract = z.strictObject({
  id: z.string().min(1),
  version: z.number().int().nonnegative(),
  text: z.string().min(1),
})

export const RunOptions = z.strictObject({
  until: z.enum(['plan', 'stills', 'video']),
  /** The orchestrator's ceiling for this run, in integer cents (D-100). */
  budgetCents: z.number().int().positive(),
  planVaryOn: PlanVaryOn.optional(),
})

export const SubmitRequest = z
  .strictObject({
    contractVersion: ContractVersion,
    requestId: z.string().min(1),
    worldId: z.string().min(1),
    /** At least 4: a shot is one narration unit, and a unit never splits a sentence (D-063, D-073). */
    narration: z.array(NarrationSentence).min(4),
    claims: z.array(ClaimRef),
    criteria: Criteria,
    style: StyleContract,
    options: RunOptions,
  })
  .superRefine((request, ctx) => {
    const listed = new Set<string>()
    for (const claim of request.claims) {
      if (listed.has(claim.id)) {
        ctx.addIssue({
          code: 'custom',
          path: ['claims'],
          message: `claim "${claim.id}" is listed twice`,
        })
      }
      listed.add(claim.id)
    }

    const referenced = new Set<string>()
    request.narration.forEach((sentence, i) => {
      for (const id of sentence.claimIds) {
        referenced.add(id)
        if (!listed.has(id)) {
          ctx.addIssue({
            code: 'custom',
            path: ['narration', i, 'claimIds'],
            message: `sentence ${i} references claim "${id}", which is not in the claim list`,
          })
        }
      }
    })

    for (const id of listed) {
      if (!referenced.has(id)) {
        ctx.addIssue({
          code: 'custom',
          path: ['claims'],
          message: `claim "${id}" is referenced by no sentence, so no shot could show it (D-063)`,
        })
      }
    }

    const criteria = [...request.criteria.mustShow, ...request.criteria.mustNotShow]
    for (const criterion of criteria) {
      if (criterion.claimId !== undefined && !listed.has(criterion.claimId)) {
        ctx.addIssue({
          code: 'custom',
          path: ['criteria'],
          message: `criterion "${criterion.id}" names claim "${criterion.claimId}", which is not in the claim list`,
        })
      }
    }

    if (request.options.planVaryOn === 'order' && !request.claims.some((c) => c.role === 'main')) {
      ctx.addIssue({
        code: 'custom',
        path: ['options', 'planVaryOn'],
        message: '"order" needs at least one claim marked main (D-102)',
      })
    }
  })

export type ClaimId = z.infer<typeof ClaimId>
export type ClaimRef = z.infer<typeof ClaimRef>
export type PlanVaryOn = z.infer<typeof PlanVaryOn>
export type NarrationSentence = z.infer<typeof NarrationSentence>
export type Criterion = z.infer<typeof Criterion>
export type Criteria = z.infer<typeof Criteria>
export type StyleContract = z.infer<typeof StyleContract>
export type RunOptions = z.infer<typeof RunOptions>
export type SubmitRequest = z.infer<typeof SubmitRequest>
