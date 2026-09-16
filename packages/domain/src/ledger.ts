import { count, eq, sql } from 'drizzle-orm'
import type { ImageReceipt, PictureRecord } from '@cutroom/contracts'
import type { Db } from './db.ts'
import { generationReceipt, job, picture } from './schema.ts'
import { pictureValues } from './pictures.ts'

// What a run has spent, and what each image call cost (docs/features/reel-stills.md, Gate 2
// "Spending while pictures are made"; D-027, D-028, D-081, S-036).

/**
 * The chain's spend: `SUM(cost_cents)` over every job row with this `correlation_id`, and over no
 * other (D-081). A run's `costCents` is this sum.
 */
export function spentCents(db: Db, correlationId: string): number {
  const row = db
    .select({ spent: sql<number>`COALESCE(SUM(${job.costCents}), 0)` })
    .from(job)
    .where(eq(job.correlationId, correlationId))
    .get()
  return Number(row?.spent ?? 0)
}

/**
 * One image call that returned, in one immediate transaction (S-036, S-046): its
 * `generation_receipt` with the rate applied (D-028); its cost added to the running job row's
 * `cost_cents`; and the picture's row, made and not yet checked, whose `seq` — the run's image-call
 * number — is taken from the run's receipts here, so the number and the receipt cannot disagree.
 */
export function recordGeneration(
  db: Db,
  entry: {
    jobId: number
    runId: string
    /** The picture as made. Its `seq` is this transaction's to take, not the caller's to give. */
    picture: Omit<PictureRecord, 'seq'>
    rateCents: number
    style: { id: string; version: number }
    receipt: ImageReceipt
  },
  now: Date = new Date(),
): void {
  const { jobId, runId, receipt } = entry
  db.transaction(
    (tx) => {
      const made = tx
        .select({ n: count() })
        .from(generationReceipt)
        .where(eq(generationReceipt.runId, runId))
        .get()
      const seq = (made?.n ?? 0) + 1
      tx.insert(generationReceipt)
        .values({
          runId,
          pictureId: entry.picture.pictureId,
          model: receipt.model,
          prompt: entry.picture.prompt,
          referenceIds: JSON.stringify(entry.picture.references),
          styleId: entry.style.id,
          styleVersion: entry.style.version,
          rateCents: entry.rateCents,
          costCents: receipt.costCents,
          fake: receipt.fake,
          at: now.toISOString(),
        })
        .run()
      tx.update(job)
        .set({ costCents: sql`${job.costCents} + ${receipt.costCents}` })
        .where(eq(job.id, jobId))
        .run()
      tx.insert(picture)
        .values(pictureValues(runId, { ...entry.picture, seq }))
        .run()
    },
    { behavior: 'immediate' },
  )
}
