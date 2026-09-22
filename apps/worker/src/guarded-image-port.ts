import type { ImagePort, StillsSettings } from '@cutroom/contracts'
import { recordGeneration, spentCents, type Db } from '@cutroom/domain'
import { framingFor, readPictureId, type Placement } from '@cutroom/pipeline'
import { recordingSpend } from './spend.ts'

/**
 * The only image port the stills stage is handed (docs/features/reel-stills.md, Gate 2 "Spending
 * while pictures are made"; S-021, S-035, S-036): the port the worker was given, wrapped so that
 *
 * - BEFORE EACH CALL — planned or reserve — the chain's spend plus the image rate is compared with the
 *   per-reel cap, then with the caller's ceiling. A call that would pass either is not made: the
 *   answer is `refused`, with the limit and that figure, and the stage stops (S-035). The cap is
 *   compared first, so a call passing both is told `reel` and the owner is asked (D-100).
 * - AS EACH CALL RETURNS, its `generation_receipt`, its cost added to the job row and the picture's
 *   row are written in one transaction (S-036).
 *
 * The stage cannot reach the port underneath it. Built per job attempt, knowing the placement, the
 * attempt, the cap it read and the ceiling, so the row it writes carries the picture's shot, subject,
 * role, label and framing. The six-call ceiling is kept by the reserve, not here (S-043).
 */
export function guardedImagePort(
  image: ImagePort,
  db: Db,
  job: {
    jobId: number
    runId: string
    attempt: number
    placements: readonly Placement[]
    rateCents: number
    style: { id: string; version: number }
    stills: Pick<StillsSettings, 'canonicalFraming'>
    /** The per-reel cap, as the job read it from BUDGET.md (D-100). */
    capCents: number
    /** The request's `budgetCents`. */
    ceilingCents: number
  },
): ImagePort {
  return {
    acceptsReferences: image.acceptsReferences,
    async generate(request) {
      const named = readPictureId(request.pictureId)
      const placement = job.placements.find((p) => p.shotUnit === named?.shotUnit)
      if (named === null || placement === undefined) {
        throw new Error(`picture '${request.pictureId}' opens no shot the placement holds (S-039)`)
      }

      // SUM(cost_cents) over the chain, read again before every call (D-081, S-036), plus one more
      // picture at the rate — rounded up, as the estimate it answers to is (S-053).
      const estimateCents = Math.ceil(spentCents(db, job.runId) + job.rateCents)
      if (estimateCents > job.capCents) return { kind: 'refused', limit: 'reel', estimateCents }
      if (estimateCents > job.ceilingCents) {
        return { kind: 'refused', limit: 'ceiling', estimateCents }
      }

      // A PICTURE FAL MADE AND WE COULD NOT USE LEAVES ITS ROW (paid-failures, S-142). The adapter
      // throws `Spent` once the job has completed — a body that does not parse, a frame the entry
      // refuses — and the row is written, and the cost added to this job, before the throw carries
      // on and fails the run as it always did.
      const answer = await recordingSpend(db, job, () => image.generate(request))
      if (answer.kind !== 'made') return answer
      recordGeneration(db, {
        jobId: job.jobId,
        runId: job.runId,
        picture: {
          pictureId: request.pictureId,
          attempt: job.attempt,
          shotUnit: placement.shotUnit,
          subjectId: placement.subjectId,
          role: placement.role,
          label: named.label,
          path: answer.picture.path,
          prompt: request.prompt,
          framing: framingFor(placement.role, named.label, job.stills),
          references: request.references.map((r) => r.pictureId),
          gate1: null,
          measure: null,
          text: null,
          observation: null,
          reconciliation: null,
          score: null,
          gate1s: null,
          degradation: null,
          chosen: false,
        },
        rateCents: job.rateCents,
        style: job.style,
        receipt: answer.receipt,
      })
      return answer
    },
  }
}
