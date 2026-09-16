import type { ImagePort, StillsSettings } from '@cutroom/contracts'
import { recordGeneration, type Db } from '@cutroom/domain'
import { framingFor, readPictureId, type Placement } from '@cutroom/pipeline'

/**
 * The only image port the stills stage is handed (docs/features/reel-stills.md, Gate 2 "Spending
 * while pictures are made"; S-021, S-035, S-036): the port the worker was given, wrapped so that as
 * each call returns, its `generation_receipt`, its cost added to the job row and the picture's row
 * are written in one transaction. The stage cannot reach the port underneath it.
 *
 * Built per job, knowing the placement and the attempt, so the row it writes carries the picture's
 * shot, subject, role, label and framing.
 *
 * reel-stills' Slice 3 builds the receipts, the costs and the rows. Comparing the spend with the cap
 * and the ceiling before each call, and refusing a call that would pass one, are Slice 4's.
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

      const answer = await image.generate(request)
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
