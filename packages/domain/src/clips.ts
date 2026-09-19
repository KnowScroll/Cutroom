import { and, eq, max, sql } from 'drizzle-orm'
import type {
  ClipObservation,
  ClipReconciliation,
  NarrationReceipt,
  NarrationRecord,
  PictureRecord,
  RenderManifest,
  RenderShot,
  TakeNumber,
  TakeRecord,
  VideoReceipt,
  VideoRequest,
  WitnessObservation,
} from '@cutroom/contracts'
import type { Db } from './db.ts'
import {
  degradation,
  generationReceipt,
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
    /** The `unavailable` answers before the call was made (S-096). */
    transientErrors: number
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
          transientErrors: e.transientErrors,
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
    /** The `unavailable` answers before the call was made (S-096). */
    transientErrors: number
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
          transientErrors: e.transientErrors,
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
 * written with its receipt and is never rewritten here, and its degradation is the ending's to write:
 * a hold's the assemble job's (S-073), a still-hold's the clips job's (S-098).
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

/** What a render manifest is built from, read from the run's rows (S-073). */
export interface RenderInputs {
  /** The chosen pictures, in shot order, each with the verdicts that approved it. */
  stills: Array<{ pictureId: string; shotUnit: number; verdicts: RenderShot['verdicts'] }>
  /** The stills stage's degradations, in the order it reached them (S-058). */
  degradations: Array<{ shotId: string; reason: string }>
  /** The finishing clips attempt's takes, in the order made. */
  takes: TakeRecord[]
  /** The same attempt's narrations. */
  narrations: NarrationRecord[]
  /** What the run's image, narration and video calls cost, every attempt's (D-081). */
  ledger: RenderManifest['ledger']
}

const parsed = <T>(text: string | null): T | null =>
  text === null ? null : (JSON.parse(text) as T)

/** A take row's number, which is its number among its shot's decided takes: 1 to 3 (D-024, S-094). */
function takeNumber(number: number, takeId: string): TakeNumber {
  if (number === 1 || number === 2 || number === 3) return number
  throw new Error(`the take ${takeId} is numbered ${number}, and a take is numbered 1 to 3 (S-094)`)
}

/**
 * The rows a render manifest is built from, once the clips job has completed (S-073): the chosen
 * pictures with Gate 1's verdict and Gate 1S's where it ran, the stills stage's degradations, THE
 * FINISHING CLIPS ATTEMPT'S takes and narrations — the latest attempt's, since an attempt run again
 * starts over and only the one that finished advanced the run (S-076) — and the cost ledger, summed
 * from the three receipt tables.
 */
export function readRenderInputs(db: Db, runId: string): RenderInputs {
  const stills = db
    .select({
      pictureId: picture.pictureId,
      shotUnit: picture.shotUnit,
      gate1: picture.gate1,
      gate1s: picture.gate1s,
    })
    .from(picture)
    .where(and(eq(picture.runId, runId), eq(picture.chosen, true)))
    .orderBy(picture.shotUnit)
    .all()
    .map((row) => {
      const verdicts: RenderShot['verdicts'] = []
      const gate1 = parsed<NonNullable<PictureRecord['gate1']>>(row.gate1)
      if (gate1 !== null && gate1.outcome !== null) {
        verdicts.push({ gate: '1', outcome: gate1.outcome, coverage: gate1.coverage })
      }
      const gate1s = parsed<NonNullable<PictureRecord['gate1s']>>(row.gate1s)
      if (gate1s !== null) {
        verdicts.push({ gate: '1S', outcome: gate1s.outcome, coverage: gate1s.coverage })
      }
      return { pictureId: row.pictureId, shotUnit: row.shotUnit, verdicts }
    })

  const degradations = db
    .select({ shotId: degradation.shotId, reason: degradation.reason })
    .from(degradation)
    .where(eq(degradation.runId, runId))
    .orderBy(sql`rowid`)
    .all()

  const finishing =
    db
      .select({ attempt: max(take.attempt) })
      .from(take)
      .where(eq(take.runId, runId))
      .get()?.attempt ?? 0
  const observed = new Map(
    db
      .select({ takeId: takeObservation.takeId, observation: takeObservation.observation })
      .from(takeObservation)
      .where(eq(takeObservation.runId, runId))
      .all()
      .map((row) => [row.takeId, JSON.parse(row.observation) as ClipObservation]),
  )
  const reconciled = new Map(
    db
      .select()
      .from(takeReconciliation)
      .where(eq(takeReconciliation.runId, runId))
      .all()
      .map((row) => {
        const answer = JSON.parse(row.answer) as Pick<ClipReconciliation, 'subjects' | 'criteria'>
        return [row.takeId, { ...answer, failed: JSON.parse(row.failed) as string[] }] as const
      }),
  )
  const takes = db
    .select()
    .from(take)
    .where(and(eq(take.runId, runId), eq(take.attempt, finishing)))
    .orderBy(sql`rowid`)
    .all()
    .map((row): TakeRecord => ({
      takeId: row.takeId,
      attempt: row.attempt,
      shotUnit: row.shotUnit,
      number: takeNumber(row.number, row.takeId),
      mode: row.mode,
      pictureId: row.pictureId,
      degraded: row.degraded,
      prompt: row.prompt,
      durationSeconds: row.requestedSeconds,
      seed: row.seed,
      requestId: row.requestId,
      expandedPrompt: row.expandedPrompt,
      path: row.path,
      probe: parsed(row.probe),
      scan: parsed(row.scan),
      words: parsed(row.words),
      sound: parsed(row.sound),
      observation: observed.get(row.takeId) ?? null,
      reconciliation: reconciled.get(row.takeId) ?? null,
      verdicts: JSON.parse(row.verdicts) as TakeRecord['verdicts'],
      outcome: row.outcome,
      degradation: row.degradation,
    }))
  const narrations = db
    .select()
    .from(narration)
    .where(and(eq(narration.runId, runId), eq(narration.attempt, finishing)))
    .orderBy(sql`rowid`)
    .all()
    .map((row): NarrationRecord => ({
      narrationId: row.narrationId,
      attempt: row.attempt,
      shotUnit: row.shotUnit,
      text: row.text,
      path: row.path,
      words: parsed(row.words),
      probe: parsed(row.probe),
    }))

  const spent = (table: typeof generationReceipt | typeof speechReceipt | typeof videoReceipt) =>
    db
      .select({ cents: sql<number>`COALESCE(SUM(${table.costCents}), 0)` })
      .from(table)
      .where(eq(table.runId, runId))
      .get()?.cents ?? 0
  return {
    stills,
    degradations,
    takes,
    narrations,
    ledger: {
      imageCents: spent(generationReceipt),
      narrationCents: spent(speechReceipt),
      videoCents: spent(videoReceipt),
    },
  }
}
