import { and, count, eq, sql } from 'drizzle-orm'
import type { ImageReceipt, LostCall, PictureRecord } from '@cutroom/contracts'
import type { Db } from './db.ts'
import { generationReceipt, job, lostCall, picture } from './schema.ts'
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
 * The image calls a run has PAID FOR: its `generation_receipt` rows and its image `lost_call` rows,
 * every attempt's (D-027, S-048, S-142). The keyframes job reads it at the start of each attempt,
 * and the attempt's reserve is six less these and less the placement's calls — so an attempt run
 * again after its worker died pays for what the one before it made out of what is left, and no run
 * makes more than six.
 *
 * **A call that answered and made no usable picture counts here too**, since paid-failures: D-027
 * bounds what a run may SPEND at pictures, and two such calls in the first real reel counted for
 * nothing, so a run could have paid for eight (S-133). Counting them makes the bound tighter and
 * can never make it looser — with no lost call this is the number it always was.
 */
export function imageCallCount(db: Db, runId: string): number {
  const made = db
    .select({ n: count() })
    .from(generationReceipt)
    .where(eq(generationReceipt.runId, runId))
    .get()
  const lost = db
    .select({ n: count() })
    .from(lostCall)
    .where(and(eq(lostCall.runId, runId), eq(lostCall.port, 'image')))
    .get()
  return (made?.n ?? 0) + (lost?.n ?? 0)
}

/**
 * One call a provider answered and this engine could not use, in one immediate transaction (S-142):
 * its `lost_call` row, and its cost added to the running job row's `cost_cents` — the same two
 * writes `recordGeneration` makes, because the budget guard reads the chain's spend from the job
 * rows and cannot see a call that left none (S-035, S-087, S-095).
 *
 * The caller rethrows the error unchanged afterwards: this records what was spent, it does not
 * repair the run (S-046).
 */
export function recordLostCall(
  db: Db,
  entry: { jobId: number; runId: string; lost: LostCall },
  now: Date = new Date(),
): void {
  const { jobId, runId, lost } = entry
  db.transaction(
    (tx) => {
      tx.insert(lostCall)
        .values({
          runId,
          port: lost.port,
          model: lost.model,
          costCents: lost.costCents,
          detail: lost.detail,
          at: now.toISOString(),
        })
        .run()
      tx.update(job)
        .set({ costCents: sql`${job.costCents} + ${lost.costCents}` })
        .where(eq(job.id, jobId))
        .run()
    },
    { behavior: 'immediate' },
  )
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
