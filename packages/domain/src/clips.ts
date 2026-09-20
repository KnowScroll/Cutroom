import { and, eq, inArray, isNotNull, or, sql, type SQL } from 'drizzle-orm'
import type {
  ClipObservation,
  ClipReconciliation,
  NarrationReceipt,
  NarrationRecord,
  PictureRecord,
  ClipShot,
  MediaProbe,
  RenderManifest,
  StillHold,
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
  stillHold,
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

/** What the clips stage is made from, read from the stills stage's rows and its own. */
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
  /** What earlier attempts finished, which this one keeps and does not make again (S-092). */
  kept: {
    /** Every narration an earlier attempt made, measured and timed, in the order made. */
    narrations: NarrationRecord[]
    /** Every take an earlier attempt decided — accept or fail — in the order made. */
    takes: TakeRecord[]
  }
}

const parsed = <T>(text: string | null): T | null =>
  text === null ? null : (JSON.parse(text) as T)

/** A take row's number, which is its number among its shot's decided takes: 1 to 3 (D-024, S-094). */
function takeNumber(number: number, takeId: string): TakeNumber {
  if (number === 1 || number === 2 || number === 3) return number
  throw new Error(`the take ${takeId} is numbered ${number}, and a take is numbered 1 to 3 (S-094)`)
}

/**
 * The run's take rows that `where` admits, in the order made, each a whole record: its measures, the
 * verdicts and outcome its gates left, and the observation and reconciliation it reached.
 */
function readTakes(db: Db, runId: string, where: SQL | undefined): TakeRecord[] {
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
  return db
    .select()
    .from(take)
    .where(where)
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
}

/** The run's narration rows that `where` admits, in the order made. */
function readNarrations(db: Db, where: SQL | undefined): NarrationRecord[] {
  return db
    .select()
    .from(narration)
    .where(where)
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
}

/** A narration an earlier attempt FINISHED: made, measured, and its timings parsed (S-092). */
const finishedNarration = (runId: string) =>
  and(eq(narration.runId, runId), isNotNull(narration.words), isNotNull(narration.probe))

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
  // What earlier attempts finished, every one's, in the order made (S-092). The clips job reads this
  // before its stage makes anything, so every row here is an earlier attempt's: a narration it
  // measured and timed, and a take whose outcome it decided. A take a crash CUT OFF has no outcome,
  // so it is not kept — it is made again under the next attempt's id, counting against no cap.
  const kept = {
    narrations: readNarrations(db, finishedNarration(runId)),
    takes: readTakes(db, runId, and(eq(take.runId, runId), isNotNull(take.outcome))),
  }
  return { stills, degradedShots, kept }
}

/** What a render manifest is built from, read from the run's rows (S-073). */
export interface RenderInputs {
  /** The chosen pictures, in shot order, each with the verdicts that approved it. */
  stills: Array<{ pictureId: string; shotUnit: number; verdicts: ClipShot['verdicts'] }>
  /** The stills stage's degradations, in the order it reached them (S-058). */
  degradations: Array<{ shotId: string; reason: string }>
  /** Each shot's accepted take and each held shot's three, whichever attempt made them (S-092). */
  takes: TakeRecord[]
  /** Each shot's finished narration, whichever attempt made it (S-092). */
  narrations: NarrationRecord[]
  /** The shots held on their chosen pictures, in the order the ladders reached them (S-098). */
  stillHolds: StillHold[]
  /** What the run's image, narration and video calls cost, every attempt's (D-081). */
  ledger: RenderManifest['ledger']
}

/**
 * The rows a render manifest is built from, once the clips job has completed (S-073): the chosen
 * pictures with Gate 1's verdict and Gate 1S's where it ran, the stills stage's degradations, the
 * shots held on their chosen pictures each with the probe its ladder stored (S-097), EACH SHOT'S
 * FINISHED NARRATION AND ACCEPTED TAKE with each held shot's three failed takes — WHICHEVER ATTEMPT
 * MADE THEM, never a cut-off take or a narration left unfinished, since a job run again picks up at
 * what an earlier attempt finished (S-092, superseding S-076's start-over and S-089's attempt
 * filter) — and the cost ledger, summed from the three receipt tables.
 *
 * With checkpoints a shot has at most one finished narration and at most one accepted take; rows
 * holding two of either are refused by `renderManifest`, which names the shot (S-092).
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
      const verdicts: ClipShot['verdicts'] = []
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

  // The shots held on their chosen pictures, in the order the ladders reached them (S-098). The
  // picture's PATH and its shot come off the picture row the still-hold's foreign key names, so the
  // manifest's path is the one the file was written at and no shot id is read back out of text.
  const stillHolds = db
    .select({
      shotUnit: picture.shotUnit,
      pictureId: stillHold.pictureId,
      path: picture.path,
      probe: stillHold.probe,
      takeIds: stillHold.takeIds,
      reason: stillHold.reason,
    })
    .from(stillHold)
    .innerJoin(
      picture,
      and(eq(stillHold.runId, picture.runId), eq(stillHold.pictureId, picture.pictureId)),
    )
    .where(eq(stillHold.runId, runId))
    .orderBy(sql`still_hold.rowid`)
    .all()
    .map((row): StillHold => ({
      shotUnit: row.shotUnit,
      pictureId: row.pictureId,
      path: row.path,
      probe: JSON.parse(row.probe) as MediaProbe,
      takeIds: JSON.parse(row.takeIds) as string[],
      reason: row.reason,
    }))

  // The takes a render is made of: each shot's ACCEPTED take, and each HELD shot's three, by the ids
  // its ladder consumed — whichever attempt made them (S-092, S-098). A take a crash cut off has no
  // outcome and is named by no still-hold, so it is never one; nor is a failed take of a shot that
  // was not held.
  const heldTakeIds = stillHolds.flatMap((hold) => [...hold.takeIds])
  const takes = readTakes(
    db,
    runId,
    and(
      eq(take.runId, runId),
      heldTakeIds.length === 0
        ? eq(take.outcome, 'accept')
        : or(eq(take.outcome, 'accept'), inArray(take.takeId, heldTakeIds)),
    ),
  )
  const narrations = readNarrations(db, finishedNarration(runId))

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
    stillHolds,
    ledger: {
      imageCents: spent(generationReceipt),
      narrationCents: spent(speechReceipt),
      videoCents: spent(videoReceipt),
    },
  }
}
