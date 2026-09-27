import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm'
import type { PictureRecord, RenderManifest, TakeVerdict } from '@cutroom/contracts'
import type { RunRecord, RunResult } from '@cutroom/reel-contract'
import type { Db } from './db.ts'
import {
  degradation,
  generationReceipt,
  hold,
  observation,
  picture,
  reconciliation,
  render,
  run,
  stillHold,
  take,
  takeObservation,
  takeReconciliation,
} from './schema.ts'

// The pictures of a run and their record (docs/features/reel-stills.md, Gate 2 "Storage" and "How a
// stills run ends"; S-046). A picture's row is written with its image receipt (ledger.ts) and
// updated here as each of its checks completes, so the record holds every picture made — every
// attempt's — with each check it reached, whatever ends the run. A later attempt reads back the ones
// whose Gate 1 decided and keeps them (readStillsInputs, S-164).

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

/** A picture's observation and reconciliation ids — and a take's, formed the same way (S-072). */
const observationId = (id: string) => `obs-${id}`
const reconciliationId = (id: string) => `rec-${id}`

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
 * A run's record as the contract gives it: one entry per picture the run holds — made, every
 * attempt's, or kept by a later attempt, which is the same row — in `seq`
 * order; `observationId` and `reconciliationId` where those rows exist; a check for each completed
 * Gate 1 step and for Gate 1S; one entry per take made, every attempt's, in the order made, with a
 * check for each gate it completed (S-093); and every degradation — the stills stage's, then the shots
 * held on their pictures, then the latest render's holds (S-098).
 */
export function readRecord(
  db: Db,
  runId: string,
): Pick<RunRecord, 'pictures' | 'takes' | 'degradations'> {
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
        // A picture copied from the run this one resumes names it; absent on every other (S-162).
        ...(row.keptFrom === null ? {} : { keptFrom: row.keptFrom }),
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
  // Then the shots held on their pictures at their take caps, in the order the clips job's ending
  // wrote them: the order the ladders reached them (S-098). A still-hold is not a hold (S-073).
  const stillHolds = db
    .select({ shotId: stillHold.shotId, reason: stillHold.reason })
    .from(stillHold)
    .where(eq(stillHold.runId, runId))
    .orderBy(sql`rowid`)
    .all()
  // Then the holds of the run's LATEST render, in shot order (S-073): a render made again holds its
  // own, and an earlier attempt's rows stay in their table without being listed twice (S-076). Shot
  // order is the shot's number, not its id as text, which would put `shot-10` before `shot-2`.
  const latest = db
    .select({ renderId: render.renderId, renderManifest: render.renderManifest })
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

  // The takes (S-093): every take made, every attempt's — a take cut off inside its gates too — in
  // the order their rows were written, which is the order made; in a resumed run, the takes copied
  // from the run it resumes first, each naming that run in `keptFrom` (S-162). `used` is true exactly for the takes
  // a COMPLETED run's video shows: those its latest render manifest names, as `chosen` is written
  // only for a completed stills stage (S-055). A run that stopped or failed after a render was made —
  // at Gate 7, say — shows a caller no video, so it used no take.
  const finished = db.select({ result: run.result }).from(run).where(eq(run.runId, runId)).get()
  const result =
    finished?.result === null || finished?.result === undefined
      ? null
      : (JSON.parse(finished.result) as RunResult)
  const used = new Set(
    result?.status === 'completed' && latest !== undefined
      ? (JSON.parse(latest.renderManifest) as RenderManifest).shots.map((shot) => shot.takeId)
      : [],
  )
  const takeSeen = new Set(
    db
      .select({ takeId: takeObservation.takeId })
      .from(takeObservation)
      .where(eq(takeObservation.runId, runId))
      .all()
      .map((r) => r.takeId),
  )
  const takeReconciled = new Set(
    db
      .select({ takeId: takeReconciliation.takeId })
      .from(takeReconciliation)
      .where(eq(takeReconciliation.runId, runId))
      .all()
      .map((r) => r.takeId),
  )
  const takes = db
    .select({
      takeId: take.takeId,
      shotUnit: take.shotUnit,
      number: take.number,
      verdicts: take.verdicts,
      keptFrom: take.keptFrom,
    })
    .from(take)
    .where(eq(take.runId, runId))
    .orderBy(sql`rowid`)
    .all()
    .map((row) => ({
      takeId: row.takeId,
      shotId: `shot-${row.shotUnit}`,
      number: row.number,
      used: used.has(row.takeId),
      ...(row.keptFrom === null ? {} : { keptFrom: row.keptFrom }),
      ...(takeSeen.has(row.takeId) ? { observationId: observationId(row.takeId) } : {}),
      ...(takeReconciled.has(row.takeId) ? { reconciliationId: reconciliationId(row.takeId) } : {}),
      checks: (JSON.parse(row.verdicts) as TakeVerdict[]).map((v) => ({
        gate: v.gate,
        outcome: v.outcome,
      })),
    }))
  return { pictures, takes, degradations: [...degradations, ...stillHolds, ...holds] }
}

/** A shot that goes on without an approved picture, as the stage recorded it (S-043, D-050). */
export interface DegradedShot {
  shotId: string
  /** The gate that failed last. */
  gate: '1' | '1S'
  reason: string
  /** The shot's last failing picture, which carries the reason. */
  lastPictureId: string
  /**
   * Every picture of the shot the deciding attempt used, made or kept: each one's generation_receipt
   * is marked (S-058, S-164). A picture a crash cut off was used by no ladder, and is not among them.
   */
  pictureIds: readonly string[]
}

/**
 * The runs a run's pieces may hold their receipts in: the run, and the run it resumes, whose copied
 * pieces' receipts stay where they were paid for (docs/features/resume-failed.md, Gate 2 "What is
 * kept, and where"; S-162, S-164). A label is a fact about a piece, so it is written in whichever.
 */
export function receiptRuns(tx: Pick<Db, 'select'>, runId: string): string[] {
  const row = tx.select({ resumes: run.resumes }).from(run).where(eq(run.runId, runId)).get()
  return row?.resumes === null || row?.resumes === undefined ? [runId] : [runId, row.resumes]
}

/**
 * Three of a degraded shot's four labels, inside the transaction that ends the run (I-4, D-025):
 * its `degradation` row, the reason on its last failing picture, and every `generation_receipt` of
 * its pictures marked degraded — in the run, or in the run it resumes for a picture copied from it
 * (S-164). The fourth, its `degraded` event, is written with the events.
 */
export function markDegraded(
  tx: Pick<Db, 'select' | 'insert' | 'update'>,
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
          inArray(generationReceipt.runId, receiptRuns(tx, runId)),
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

/**
 * Every picture of a run whose Gate 1 DECIDED — accepted or failed — as the stills stage reads it
 * back, in the order made, with every check it completed: its measure, words, Gate 1 steps, its
 * observation and reconciliation from their own rows, its score, its Gate 1S verdict and its
 * degradation (docs/features/resume-failed.md; S-164). A picture whose checks were cut off is not
 * among them: it is made again. `chosen` is false on every one; the stage decides it again.
 *
 * And `copiedPictures`, the run's picture rows copied from the run it resumes (`kept_from` set):
 * what tells a resumed run's canonical left no slot for its repair — which stops for rule `gate-1` —
 * from a crash's, which fails (S-171, S-048).
 */
export function readStillsInputs(
  db: Db,
  runId: string,
): { kept: PictureRecord[]; copiedPictures: number } {
  const json = <T>(text: string | null): T | null =>
    text === null ? null : (JSON.parse(text) as T)
  const observations = new Map(
    db
      .select({ pictureId: observation.pictureId, observation: observation.observation })
      .from(observation)
      .where(eq(observation.runId, runId))
      .all()
      .map((r) => [r.pictureId, r.observation]),
  )
  const reconciliations = new Map(
    db
      .select({
        pictureId: reconciliation.pictureId,
        answer: reconciliation.answer,
        failed: reconciliation.failed,
      })
      .from(reconciliation)
      .where(eq(reconciliation.runId, runId))
      .all()
      .map((r) => [r.pictureId, r]),
  )
  const rows = db
    .select()
    .from(picture)
    .where(eq(picture.runId, runId))
    .orderBy(asc(picture.seq))
    .all()
  const kept = rows.flatMap((row): PictureRecord[] => {
    const gate1 = json<NonNullable<PictureRecord['gate1']>>(row.gate1)
    if (gate1 === null || gate1.outcome === null) return []
    const reconciled = reconciliations.get(row.pictureId)
    return [
      {
        pictureId: row.pictureId,
        attempt: row.attempt,
        shotUnit: row.shotUnit,
        subjectId: row.subjectId,
        role: row.role,
        label: row.label,
        path: row.path,
        prompt: row.prompt,
        framing: row.framing as PictureRecord['framing'],
        references: JSON.parse(row.referenceIds) as string[],
        seq: row.seq,
        gate1,
        measure: json<NonNullable<PictureRecord['measure']>>(row.measure),
        text: json<string[]>(row.words),
        observation: json<NonNullable<PictureRecord['observation']>>(
          observations.get(row.pictureId) ?? null,
        ),
        reconciliation:
          reconciled === undefined
            ? null
            : {
                ...(JSON.parse(reconciled.answer) as Omit<
                  NonNullable<PictureRecord['reconciliation']>,
                  'failed'
                >),
                failed: JSON.parse(reconciled.failed) as string[],
              },
        score: json<NonNullable<PictureRecord['score']>>(row.score),
        gate1s: json<NonNullable<PictureRecord['gate1s']>>(row.gate1s),
        degradation: row.degradation,
        chosen: false,
      },
    ]
  })
  return { kept, copiedPictures: rows.filter((row) => row.keptFrom !== null).length }
}
