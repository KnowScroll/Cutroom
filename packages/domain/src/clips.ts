import { and, eq, sql } from 'drizzle-orm'
import type {
  NarrationReceipt,
  NarrationRecord,
  TakeRecord,
  VideoReceipt,
  VideoRequest,
  WitnessObservation,
} from '@cutroom/contracts'
import type { Db } from './db.ts'
import {
  degradation,
  job,
  narration,
  observation,
  picture,
  speechReceipt,
  take,
  takeObservation,
  takeReconciliation,
  videoReceipt,
} from './schema.ts'

// The narrations and takes of a run (docs/features/reel-render.md, Gate 2 "Spending" and "Storage";
// S-036, S-055's form, S-070 to S-072). Each is written with its receipt, in the transaction that adds
// its cost to the job row, and updated as each measure and gate completes — so the tables keep every
// narration and take made, every attempt's, with each gate it reached, whatever ends the run.

const json = (value: unknown) => (value === null ? null : JSON.stringify(value))

/** A narration's whole row, from its record. */
function narrationValues(runId: string, n: NarrationRecord): typeof narration.$inferInsert {
  return {
    runId,
    narrationId: n.narrationId,
    attempt: n.attempt,
    shotUnit: n.shotUnit,
    text: n.text,
    path: n.path,
    words: json(n.words),
    probe: json(n.probe),
  }
}

/** A take's whole row, from its record. */
function takeValues(runId: string, t: TakeRecord): typeof take.$inferInsert {
  return {
    runId,
    takeId: t.takeId,
    attempt: t.attempt,
    shotUnit: t.shotUnit,
    number: t.number,
    mode: t.mode,
    pictureId: t.pictureId,
    degraded: t.degraded,
    prompt: t.prompt,
    requestedSeconds: t.durationSeconds,
    seed: t.seed,
    requestId: t.requestId,
    expandedPrompt: t.expandedPrompt,
    path: t.path,
    probe: json(t.probe),
    scan: json(t.scan),
    words: json(t.words),
    sound: json(t.sound),
    verdicts: JSON.stringify(t.verdicts),
    outcome: t.outcome,
    degradation: t.degradation,
  }
}

/**
 * One narration call that returned, in one immediate transaction (S-070): its `speech_receipt` with
 * the narration rate applied, its cost added to the running job row's `cost_cents` (S-036), and the
 * narration's row, made and not yet measured.
 */
export function recordNarration(
  db: Db,
  e: {
    jobId: number
    runId: string
    narration: NarrationRecord
    rateCentsPerCharacter: number
    receipt: NarrationReceipt
  },
  now: Date = new Date(),
): void {
  const { jobId, runId, receipt } = e
  db.transaction(
    (tx) => {
      tx.insert(speechReceipt)
        .values({
          runId,
          narrationId: e.narration.narrationId,
          model: receipt.model,
          characters: receipt.characters,
          rateCents: e.rateCentsPerCharacter,
          costCents: receipt.costCents,
          fake: receipt.fake,
          at: now.toISOString(),
        })
        .run()
      tx.update(job)
        .set({ costCents: sql`${job.costCents} + ${receipt.costCents}` })
        .where(eq(job.id, jobId))
        .run()
      tx.insert(narration).values(narrationValues(runId, e.narration)).run()
    },
    { behavior: 'immediate' },
  )
}

/**
 * One video call that returned, in one immediate transaction (S-071): its `video_receipt` — the mode,
 * the resolution, the requested seconds, the aspect ratio a text-to-video call asked for and none for
 * image-to-video, the seed, the provider's request id, the prompt and its expansion, the expansion mode,
 * the style contract's id and version, the rate applied, the cost, `fake` and whether it is degraded —
 * its cost added to the running job row, and the take's row, made and not yet measured.
 */
export function recordClip(
  db: Db,
  e: {
    jobId: number
    runId: string
    take: TakeRecord
    request: VideoRequest
    style: { id: string; version: number }
    rateCents: number
    receipt: VideoReceipt
  },
  now: Date = new Date(),
): void {
  const { jobId, runId, request, receipt } = e
  db.transaction(
    (tx) => {
      tx.insert(videoReceipt)
        .values({
          runId,
          takeId: e.take.takeId,
          model: receipt.model,
          mode: request.mode,
          resolution: request.resolution,
          requestedSeconds: request.durationSeconds,
          aspectRatio: request.mode === 'text-to-video' ? request.aspectRatio : null,
          seed: request.seed,
          requestId: receipt.requestId,
          prompt: request.prompt,
          expandedPrompt: receipt.expandedPrompt,
          expansionMode: request.promptExpansionMode,
          styleId: e.style.id,
          styleVersion: e.style.version,
          rateCents: e.rateCents,
          costCents: receipt.costCents,
          fake: receipt.fake,
          degraded: e.take.degraded,
          at: now.toISOString(),
        })
        .run()
      tx.update(job)
        .set({ costCents: sql`${job.costCents} + ${receipt.costCents}` })
        .where(eq(job.id, jobId))
        .run()
      tx.insert(take).values(takeValues(runId, e.take)).run()
    },
    { behavior: 'immediate' },
  )
}

/**
 * A narration's measure and timings, made durable. What the narration IS — its shot, text, path and
 * attempt — was written with its receipt and is never rewritten here.
 */
export function upsertNarration(db: Db, runId: string, n: NarrationRecord): void {
  const values = narrationValues(runId, n)
  db.insert(narration)
    .values(values)
    .onConflictDoUpdate({
      target: [narration.runId, narration.narrationId],
      set: { words: values.words, probe: values.probe },
    })
    .run()
}

const observationId = (takeId: string) => `obs-${takeId}`
const reconciliationId = (takeId: string) => `rec-${takeId}`

/**
 * A take's measures and gates, made durable, in one transaction: its probe, scan, words, sound,
 * verdicts and outcome, and — once there is one — its observation and its reconciliation, each written
 * once. What the take IS — its shot, mode, picture, prompt, seed, request, path and attempt — was
 * written with its receipt and is never rewritten here, and a hold's degradation is the assemble job's
 * ending's to write (S-073).
 */
export function upsertTake(db: Db, runId: string, t: TakeRecord): void {
  const values = takeValues(runId, t)
  db.transaction(
    (tx) => {
      tx.insert(take)
        .values(values)
        .onConflictDoUpdate({
          target: [take.runId, take.takeId],
          set: {
            probe: values.probe,
            scan: values.scan,
            words: values.words,
            sound: values.sound,
            verdicts: values.verdicts,
            outcome: values.outcome,
          },
        })
        .run()
      if (t.observation !== null) {
        tx.insert(takeObservation)
          .values({
            id: observationId(t.takeId),
            runId,
            takeId: t.takeId,
            observation: JSON.stringify(t.observation),
          })
          .onConflictDoNothing()
          .run()
      }
      if (t.reconciliation !== null) {
        const { subjects, criteria, failed } = t.reconciliation
        tx.insert(takeReconciliation)
          .values({
            id: reconciliationId(t.takeId),
            runId,
            takeId: t.takeId,
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

/** What the clips stage is made from, read from the stills stage's rows. */
export interface ClipsInputs {
  /** The chosen pictures, in shot order, each with Gate 1's recorded observation (D-033). */
  stills: Array<{
    pictureId: string
    shotUnit: number
    path: string
    observation: WitnessObservation
  }>
  /** The shots the stills stage degraded, in the order it reached them (D-050 step 2). */
  degradedShots: number[]
}

/**
 * The chosen pictures of a run, with their observations, and its degraded shots. A chosen picture
 * passed Gate 1, so it has an observation; one without is a record that cannot make a clip.
 */
export function readClipsInputs(db: Db, runId: string): ClipsInputs {
  const chosen = db
    .select({
      pictureId: picture.pictureId,
      shotUnit: picture.shotUnit,
      path: picture.path,
      observation: observation.observation,
    })
    .from(picture)
    .leftJoin(
      observation,
      and(eq(observation.runId, picture.runId), eq(observation.pictureId, picture.pictureId)),
    )
    .where(and(eq(picture.runId, runId), eq(picture.chosen, true)))
    .orderBy(picture.shotUnit)
    .all()
  const stills = chosen.map((row) => {
    if (row.observation === null) {
      throw new Error(`the chosen picture ${row.pictureId} of run '${runId}' has no observation`)
    }
    return {
      pictureId: row.pictureId,
      shotUnit: row.shotUnit,
      path: row.path,
      observation: JSON.parse(row.observation) as WitnessObservation,
    }
  })
  const degradedShots = db
    .select({ shotId: degradation.shotId })
    .from(degradation)
    .where(eq(degradation.runId, runId))
    .orderBy(sql`rowid`)
    .all()
    .map((row) => Number(/^shot-(\d+)$/.exec(row.shotId)?.[1] ?? Number.NaN))
    .filter((unit) => Number.isInteger(unit))
  return { stills, degradedShots }
}
