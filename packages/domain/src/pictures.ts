import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm'
import type { PictureRecord } from '@cutroom/contracts'
import type { RunRecord } from '@cutroom/reel-contract'
import type { Db } from './db.ts'
import {
  degradation,
  generationReceipt,
  hold,
  observation,
  picture,
  reconciliation,
  render,
} from './schema.ts'

// The pictures of a run and their record (docs/features/reel-stills.md, Gate 2 "Storage" and "How a
// stills run ends"; S-046). A picture's row is written with its image receipt (ledger.ts) and
// updated here as each of its checks completes, so the record holds every picture made — every
// attempt's — with each check it reached, whatever ends the run.

/** A picture's whole row, from its record. */
export function pictureValues(runId: string, p: PictureRecord): typeof picture.$inferInsert {
  return {
    runId,
    pictureId: p.pictureId,
    seq: p.seq,
    attempt: p.attempt,
    shotUnit: p.shotUnit,
    subjectId: p.subjectId,
    role: p.role,
    label: p.label,
    path: p.path,
    prompt: p.prompt,
    framing: p.framing,
    referenceIds: JSON.stringify(p.references),
    measure: p.measure === null ? null : JSON.stringify(p.measure),
    words: p.text === null ? null : JSON.stringify(p.text),
    gate1: p.gate1 === null ? null : JSON.stringify(p.gate1),
    score: p.score === null ? null : JSON.stringify(p.score),
    gate1s: p.gate1s === null ? null : JSON.stringify(p.gate1s),
    degradation: p.degradation,
    chosen: false,
  }
}

const observationId = (pictureId: string) => `obs-${pictureId}`
const reconciliationId = (pictureId: string) => `rec-${pictureId}`

/**
 * A picture's checks, made durable, in one transaction: its measure, words, Gate 1 verdict, score
 * and Gate 1S verdict, and — once there is one — its observation and its reconciliation, each
 * written once. What the picture IS — its shot, subject, path, prompt, references and `seq` — was
 * written with its receipt and is never rewritten here, and `chosen` is the run's ending's to write
 * (S-054).
 */
export function upsertPicture(db: Db, runId: string, p: PictureRecord): void {
  const values = pictureValues(runId, p)
  db.transaction(
    (tx) => {
      tx.insert(picture)
        .values(values)
        .onConflictDoUpdate({
          target: [picture.runId, picture.pictureId],
          set: {
            measure: values.measure,
            words: values.words,
            gate1: values.gate1,
            score: values.score,
            gate1s: values.gate1s,
          },
        })
        .run()
      if (p.observation !== null) {
        tx.insert(observation)
          .values({
            id: observationId(p.pictureId),
            runId,
            pictureId: p.pictureId,
            observation: JSON.stringify(p.observation),
          })
          .onConflictDoNothing()
          .run()
      }
      if (p.reconciliation !== null) {
        const { subjects, criteria, failed } = p.reconciliation
        tx.insert(reconciliation)
          .values({
            id: reconciliationId(p.pictureId),
            runId,
            pictureId: p.pictureId,
            answer: JSON.stringify({ subjects, criteria }),
            failed: JSON.stringify(failed),
          })
          .onConflictDoNothing()
          .run()
      }
    },
    { behavior: 'immediate' },
  )
}

type Check = RunRecord['pictures'][number]['checks'][number]

/**
 * A run's record as the contract gives it: one entry per picture made, every attempt, in `seq`
 * order; `observationId` and `reconciliationId` where those rows exist; a check for each completed
 * Gate 1 step and for Gate 1S; and every degradation.
 */
export function readRecord(db: Db, runId: string): Pick<RunRecord, 'pictures' | 'degradations'> {
  const observed = new Set(
    db
      .select({ pictureId: observation.pictureId })
      .from(observation)
      .where(eq(observation.runId, runId))
      .all()
      .map((r) => r.pictureId),
  )
  const reconciled = new Set(
    db
      .select({ pictureId: reconciliation.pictureId })
      .from(reconciliation)
      .where(eq(reconciliation.runId, runId))
      .all()
      .map((r) => r.pictureId),
  )
  const pictures = db
    .select()
    .from(picture)
    .where(eq(picture.runId, runId))
    .orderBy(asc(picture.seq))
    .all()
    .map((row) => {
      const gate1 = row.gate1 === null ? null : (JSON.parse(row.gate1) as PictureRecord['gate1'])
      const gate1s =
        row.gate1s === null ? null : (JSON.parse(row.gate1s) as PictureRecord['gate1s'])
      const checks: Check[] = (gate1?.steps ?? []).map((s) => ({
        gate: '1',
        step: s.step,
        outcome: s.outcome,
      }))
      if (gate1s !== null) checks.push({ gate: '1S', outcome: gate1s.outcome })
      return {
        pictureId: row.pictureId,
        shotId: `shot-${row.shotUnit}`,
        chosen: row.chosen,
        ...(observed.has(row.pictureId) ? { observationId: observationId(row.pictureId) } : {}),
        ...(reconciled.has(row.pictureId)
          ? { reconciliationId: reconciliationId(row.pictureId) }
          : {}),
        checks,
      }
    })
  // In the order the run's ending wrote them: the order the ladders reached them (S-058).
  const degradations = db
    .select({ shotId: degradation.shotId, reason: degradation.reason })
    .from(degradation)
    .where(eq(degradation.runId, runId))
    .orderBy(sql`rowid`)
    .all()
  // Then the holds of the run's LATEST render, in shot order (S-073): a render made again holds its
  // own, and an earlier attempt's rows stay in their table without being listed twice (S-076). Shot
  // order is the shot's number, not its id as text, which would put `shot-10` before `shot-2`.
  const latest = db
    .select({ renderId: render.renderId })
    .from(render)
    .where(eq(render.runId, runId))
    .orderBy(desc(render.attempt))
    .limit(1)
    .get()
  const holds =
    latest === undefined
      ? []
      : db
          .select({ shotId: hold.shotId, reason: hold.reason })
          .from(hold)
          .where(and(eq(hold.runId, runId), eq(hold.renderId, latest.renderId)))
          .orderBy(sql`CAST(substr(${hold.shotId}, 6) AS INTEGER)`)
          .all()
  return { pictures, degradations: [...degradations, ...holds] }
}

/** A shot that goes on without an approved picture, as the stage recorded it (S-043, D-050). */
export interface DegradedShot {
  shotId: string
  /** The gate that failed last. */
  gate: '1' | '1S'
  reason: string
  /** The shot's last failing picture, which carries the reason. */
  lastPictureId: string
  /** Every picture of the shot this attempt made: each one's generation_receipt is marked. */
  pictureIds: readonly string[]
}

/**
 * Three of a degraded shot's four labels, inside the transaction that ends the run (I-4, D-025):
 * its `degradation` row, the reason on its last failing picture, and every `generation_receipt` of
 * its pictures marked degraded. The fourth, its `degraded` event, is written with the events.
 */
export function markDegraded(
  tx: Pick<Db, 'insert' | 'update'>,
  runId: string,
  shot: DegradedShot,
): void {
  tx.insert(degradation)
    .values({ runId, shotId: shot.shotId, gate: shot.gate, reason: shot.reason })
    .run()
  tx.update(picture)
    .set({ degradation: shot.reason })
    .where(and(eq(picture.runId, runId), eq(picture.pictureId, shot.lastPictureId)))
    .run()
  if (shot.pictureIds.length > 0) {
    tx.update(generationReceipt)
      .set({ degraded: true })
      .where(
        and(
          eq(generationReceipt.runId, runId),
          inArray(generationReceipt.pictureId, [...shot.pictureIds]),
        ),
      )
      .run()
  }
}

/** Marks a run's approved pictures chosen, inside the transaction that ends the run (S-046). */
export function markChosen(
  tx: Pick<Db, 'update'>,
  runId: string,
  pictureIds: readonly string[],
): void {
  for (const pictureId of pictureIds) {
    tx.update(picture)
      .set({ chosen: true })
      .where(and(eq(picture.runId, runId), eq(picture.pictureId, pictureId)))
      .run()
  }
}
