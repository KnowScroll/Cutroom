import { randomUUID } from 'node:crypto'
import { and, asc, desc, eq, gt, inArray, max, sql } from 'drizzle-orm'
import type {
  AssembledFile,
  CutVerdict,
  FailureKind,
  Gate0Verdict,
  MediaProbe,
  ModelReceipt,
  Plan,
  RenderManifest,
  StillHold,
} from '@cutroom/contracts'
import {
  CONTRACT_VERSION,
  SubmitRequest,
  type RunEvent,
  type RunResult,
  type RunStatus,
} from '@cutroom/reel-contract'
import type { Db } from './db.ts'
import { markChosen, markDegraded, receiptRuns, type DegradedShot } from './pictures.ts'
import { completeJob, enqueue, type Writer } from './queue.ts'
import {
  hold,
  job,
  modelReceipt,
  plan,
  render,
  run,
  runEvent,
  stillHold,
  take,
  videoReceipt,
} from './schema.ts'

// Runs and their event record (docs/features/reel-plan.md, Gate 2 "How the contract's rules are
// kept"). Every write that numbers an event happens inside one immediate transaction, so the
// number and the row that carries it cannot be separated.

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never

/** An event as a writer describes it; the engine stamps the version, run, number and time. */
export type EventBody = DistributiveOmit<RunEvent, 'contractVersion' | 'runId' | 'seq' | 'at'>

export const PLAN_JOB = 'reel.plan'
/** The chain's second job: the pictures of an admitted `stills` or `video` run (D-081, D-083, D-108). */
export const KEYFRAMES_JOB = 'reel.keyframes'
/** The chain's third job: the clips of a `video` run whose stills stage completed (S-069). */
export const CLIPS_JOB = 'reel.clips'
/** The chain's fourth and last job: assembling a `video` run whose clips stage completed (S-069). */
export const ASSEMBLE_JOB = 'reel.assemble'

/** The stages a run has events for: `plan`, `stills` and `video`, the contract's. */
export type Stage = Extract<RunEvent, { stage: string }>['stage']

/** JSON with keys sorted at every depth, so two requests that differ only in key order are equal. */
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`
  if (value !== null && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    const keys = Object.keys(obj)
      .filter((k) => obj[k] !== undefined)
      .sort()
    return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`).join(',')}}`
  }
  return JSON.stringify(value)
}

/** Appends one event, numbered after the run's last, inside the caller's transaction. */
export function append(tx: Writer, runId: string, body: EventBody, now: Date): RunEvent {
  const last = tx
    .select({ seq: max(runEvent.seq) })
    .from(runEvent)
    .where(eq(runEvent.runId, runId))
    .get()
  const seq = (last?.seq ?? 0) + 1
  const at = now.toISOString()
  const event = { contractVersion: CONTRACT_VERSION, runId, seq, at, ...body } as RunEvent
  tx.insert(runEvent)
    .values({ runId, seq, at, body: JSON.stringify(event) })
    .run()
  return event
}

export type Submitted =
  | { outcome: 'accepted'; runId: string }
  | { outcome: 'replayed'; runId: string }
  | { outcome: 'conflict'; runId: string }

/**
 * Stores a valid request as a run with one `reel.plan` job (D-081, D-083) and its `run.accepted`
 * event — or, for a requestId already used, compares content: equal is the request's NEWEST run,
 * replayed — its resume, when it has one, so the caller's name for the reel reaches its current run
 * (S-162); different is a conflict. Validity is the caller's to check first.
 */
export function submitRun(
  db: Db,
  request: SubmitRequest,
  received: string,
  now: Date = new Date(),
): Submitted {
  const canonical = canonicalJson(request)
  return db.transaction(
    (tx): Submitted => {
      const existing = tx
        .select({ runId: run.runId, requestCanonical: run.requestCanonical })
        .from(run)
        .where(eq(run.requestId, request.requestId))
        .orderBy(desc(sql`rowid`))
        .limit(1)
        .get()
      if (existing !== undefined) {
        const outcome = existing.requestCanonical === canonical ? 'replayed' : 'conflict'
        return { outcome, runId: existing.runId }
      }

      const runId = randomUUID()
      tx.insert(run)
        .values({
          runId,
          requestId: request.requestId,
          request: received,
          requestCanonical: canonical,
          state: 'running',
          createdAt: now.toISOString(),
        })
        .run()
      enqueue(tx, { kind: PLAN_JOB, correlationId: runId, payload: { runId } }, now)
      append(tx, runId, { type: 'run.accepted' }, now)
      return { outcome: 'accepted', runId }
    },
    { behavior: 'immediate' },
  )
}

/**
 * A run's status. Its two pointers are read from the rows each time (S-162): `resumes` from its own
 * row, and `resumedBy` from the run that names it — never stored in its row, result or events, which a
 * resume does not change. Each is absent, not null, on a run it does not apply to.
 */
function statusOf(
  db: Db,
  row: { runId: string; requestId: string; state: string; resumes: string | null },
): RunStatus {
  const last = db
    .select({ seq: max(runEvent.seq) })
    .from(runEvent)
    .where(eq(runEvent.runId, row.runId))
    .get()
  const resumedBy = db
    .select({ runId: run.runId })
    .from(run)
    .where(eq(run.resumes, row.runId))
    .get()
  return {
    contractVersion: CONTRACT_VERSION,
    runId: row.runId,
    requestId: row.requestId,
    state: row.state === 'finished' ? 'finished' : 'running',
    lastSeq: last?.seq ?? 0,
    ...(row.resumes === null ? {} : { resumes: row.resumes }),
    ...(resumedBy === undefined ? {} : { resumedBy: resumedBy.runId }),
  }
}

export interface StoredRun {
  status: RunStatus
  /** Present once the run has finished. */
  result: RunResult | undefined
}

export function readRun(db: Db, runId: string): StoredRun | undefined {
  const row = db.select().from(run).where(eq(run.runId, runId)).get()
  if (row === undefined) return undefined
  return {
    status: statusOf(db, row),
    result: row.result === null ? undefined : (JSON.parse(row.result) as RunResult),
  }
}

/** A request's NEWEST run: its resume, when it has one (S-162). */
export function readRunByRequestId(db: Db, requestId: string): StoredRun | undefined {
  const row = db
    .select({ runId: run.runId })
    .from(run)
    .where(eq(run.requestId, requestId))
    .orderBy(desc(sql`rowid`))
    .limit(1)
    .get()
  return row === undefined ? undefined : readRun(db, row.runId)
}

/** The request a run was submitted with, parsed under the contract it was accepted by. */
export function readRequest(db: Db, runId: string): SubmitRequest {
  const row = db.select({ request: run.request }).from(run).where(eq(run.runId, runId)).get()
  if (row === undefined) throw new Error(`no run '${runId}'`)
  return SubmitRequest.parse(JSON.parse(row.request))
}

/**
 * One model call that returned, written as it returns (D-005, D-084) — outside the transaction
 * that finishes the run, so it survives a later thrown call, a failed run and an interrupted job.
 */
export function recordReceipt(
  db: Db,
  runId: string,
  receipt: ModelReceipt,
  now: Date = new Date(),
): void {
  db.insert(modelReceipt)
    .values({
      runId,
      role: receipt.role,
      call: receipt.call,
      pictureIds: JSON.stringify(receipt.pictureIds),
      takeIds: JSON.stringify(receipt.takeIds),
      model: receipt.model,
      temperature: receipt.temperature,
      inputTokens: receipt.usage.inputTokens,
      outputTokens: receipt.usage.outputTokens,
      fake: receipt.fake,
      at: now.toISOString(),
    })
    .run()
}

/** A plan as its row stores it: the plan, what Gate 0 said, its score if any, and the fork's axis. */
export interface PlanRow {
  role: Plan['role']
  /** The axis of the fork the plan belongs to, read from the fork (D-078). */
  axis: string
  plan: Plan
  verdict: Gate0Verdict
  score: number | null
  selected: boolean
}

/** The events numbered after `since`, in order. */
export function eventsAfter(db: Db, runId: string, since: number): RunEvent[] {
  return db
    .select({ body: runEvent.body })
    .from(runEvent)
    .where(and(eq(runEvent.runId, runId), gt(runEvent.seq, since)))
    .orderBy(asc(runEvent.seq))
    .all()
    .map((row) => JSON.parse(row.body) as RunEvent)
}

/** The plan rows a stage produced, written inside whichever transaction ends that stage. */
function writePlans(tx: Writer, runId: string, plans: readonly PlanRow[]): void {
  for (const row of plans) {
    tx.insert(plan)
      .values({
        runId,
        role: row.role,
        unitCount: row.plan.units.length,
        axis: row.axis,
        plan: JSON.stringify(row.plan),
        verdict: JSON.stringify(row.verdict),
        score: row.score,
        estimateCents: row.plan.estimateCents,
        selected: row.selected,
      })
      .run()
  }
}

/**
 * The greatest attempts any job of `kind` in run `runId`'s chain reached, or 0 when it has none.
 */
export function greatestAttempts(tx: Pick<Db, 'select'>, runId: string, kind: string): number {
  const row = tx
    .select({ attempts: max(job.attempts) })
    .from(job)
    .where(and(eq(job.correlationId, runId), eq(job.kind, kind)))
    .get()
  return row?.attempts ?? 0
}

/**
 * Where a run's next job of `kind` starts counting its claims: 0 for a run that resumes nothing, and
 * for a resumed run the attempts the run it resumes reached at that kind — so every id the job makes,
 * `a<attempt>-…`, is new, and no take is sent the seed the failed run's was (docs/features/resume-failed.md,
 * Gate 2 "Ids, seeds and attempts"; D-018, S-162).
 */
function startingAttempts(tx: Pick<Db, 'select'>, runId: string, kind: string): number {
  const row = tx.select({ resumes: run.resumes }).from(run).where(eq(run.runId, runId)).get()
  return row?.resumes === null || row?.resumes === undefined
    ? 0
    : greatestAttempts(tx, row.resumes, kind)
}

/**
 * A `stills` run whose pictures fit the caller's ceiling (S-030, S-035), in one transaction: the
 * plan rows, the events the plan stage ended with, the plan job marked done at cost 0, and the
 * chain's next row — one `reel.keyframes` job whose `correlation_id` is the run and whose
 * `parent_id` is the plan job (D-081, D-083). Returns that row's id.
 *
 * The run is deliberately NOT finished: it has no result until the pictures are answered for, and
 * a worker that died between this transaction and the next claim leaves a queued job, not a
 * half-finished run.
 */
export function admitStills(
  db: Db,
  admit: {
    runId: string
    jobId: number
    plans?: readonly PlanRow[]
    events?: readonly EventBody[]
  },
  now: Date = new Date(),
): number {
  const { runId, jobId } = admit
  return db.transaction(
    (tx) => {
      writePlans(tx, runId, admit.plans ?? [])
      for (const event of admit.events ?? []) append(tx, runId, event, now)
      completeJob(tx, jobId, 0)
      return enqueue(
        tx,
        {
          kind: KEYFRAMES_JOB,
          correlationId: runId,
          payload: { runId },
          parentId: jobId,
          attempts: startingAttempts(tx, runId, KEYFRAMES_JOB),
        },
        now,
      )
    },
    { behavior: 'immediate' },
  )
}

/**
 * How a run ends: its result, and — for a failed one, and only then — the kind of its failure, which
 * the engine and a caller judge a resume by (docs/features/resume-failed.md; S-163). A failed result
 * without its kind does not compile, so no finishing path can forget one; the kind is never in the
 * result, which a caller reads unchanged (S-157).
 */
export type RunEnding =
  | { result: Exclude<RunResult, { status: 'failed' }>; failure?: never }
  | { result: Extract<RunResult, { status: 'failed' }>; failure: FailureKind }

/**
 * The engine's own resume of the run a finishing transaction fails (docs/features/resume-failed.md,
 * Gate 2 "How a resume is planned, admitted and made"; S-163). It is handed the transaction after the
 * stage's labels and events are written, and the finishing function's own `now` — the time
 * `run.finished` is stamped with — and reads, plans, admits and makes the resume, or throws. Its answer
 * is the finishing function's to hand back; the worker builds it, and writes what it asks for after
 * the transaction.
 */
export type ResumeStep<T> = (tx: Writer, now: Date) => T

/** What a resume step came to: its answer, or — its savepoint rolled back — why it could not be made. */
export type ResumeStepped<T> = { answered: T } | { unmade: string }

/**
 * Step 2 of a finishing transaction: `step` inside `SAVEPOINT resume`, released when it answers and
 * rolled back to when it throws, so a resume that cannot be made leaves no row of its own and never
 * stops the run from failing (S-163).
 */
function resumeStep<T>(
  tx: Writer & Pick<Db, 'run'>,
  step: ResumeStep<T>,
  now: Date,
): ResumeStepped<T> {
  tx.run(sql`SAVEPOINT resume`)
  try {
    const answered = step(tx, now)
    tx.run(sql`RELEASE resume`)
    return { answered }
  } catch (error) {
    tx.run(sql`ROLLBACK TO resume`)
    tx.run(sql`RELEASE resume`)
    return { unmade: error instanceof Error ? error.message : String(error) }
  }
}

/**
 * Steps 2 and 3 of every transaction that finishes a run, after step 1's labels and events and before
 * step 4's job done (docs/features/resume-failed.md, Gate 2 "How a resume is planned, admitted and
 * made"; S-163): the engine's resume when one is handed in, from the rows as step 1 left them, then the
 * run's ending. So a resume's row exists before `run.finished` is appended, and a caller polling the
 * failed run never sees it finished without the run that resumed it.
 */
function resumedAndEnded<T>(
  tx: Writer & Pick<Db, 'run'>,
  runId: string,
  finish: RunEnding & { resume?: ResumeStep<T> | undefined },
  now: Date,
): ResumeStepped<T> | undefined {
  const stepped = finish.resume === undefined ? undefined : resumeStep(tx, finish.resume, now)
  endRun(tx, runId, finish, now)
  return stepped
}

/**
 * A run's ending, written inside whichever transaction ends it: `run.finished`, its state and result,
 * then a failed run's kind in `run.failure` (S-163).
 */
function endRun(tx: Writer, runId: string, ending: RunEnding, now: Date): void {
  const { result } = ending
  append(tx, runId, { type: 'run.finished', status: result.status }, now)
  tx.update(run)
    .set({ state: 'finished', result: JSON.stringify(result) })
    .where(eq(run.runId, runId))
    .run()
  if (ending.failure !== undefined) {
    tx.update(run).set({ failure: ending.failure }).where(eq(run.runId, runId)).run()
  }
}

/**
 * Finishes a run in one transaction: its plans, the events before the end, its `run.finished`
 * event, its result, and its job marked done — so a job interrupted before this leaves no
 * half-finished run behind. Handed the engine's resume, it makes it between the events and
 * `run.finished`, in a savepoint, and answers what it came to (resume-failed, S-163).
 */
export function finishRun<T = never>(
  db: Db,
  finish: {
    runId: string
    jobId: number
    plans?: readonly PlanRow[]
    events?: readonly EventBody[]
    resume?: ResumeStep<T> | undefined
  } & RunEnding,
  now: Date = new Date(),
): ResumeStepped<T> | undefined {
  const { runId, jobId, result } = finish
  return db.transaction(
    (tx) => {
      writePlans(tx, runId, finish.plans ?? [])
      for (const event of finish.events ?? []) append(tx, runId, event, now)
      const stepped = resumedAndEnded(tx, runId, finish, now)
      completeJob(tx, jobId, result.costCents)
      return stepped
    },
    { behavior: 'immediate' },
  )
}

/** The plan an admitted run was admitted on: its selected plan row's plan. */
export function readSelectedPlan(db: Db, runId: string): Plan {
  const row = db
    .select({ plan: plan.plan })
    .from(plan)
    .where(and(eq(plan.runId, runId), eq(plan.selected, true)))
    .get()
  if (row === undefined) throw new Error(`run '${runId}' has no selected plan`)
  return JSON.parse(row.plan) as Plan
}

/** What a stills stage leaves, however the run goes on from it (S-046, S-055, S-058). */
interface StillsEnding {
  chosen?: readonly string[]
  degraded?: readonly DegradedShot[]
  events?: readonly EventBody[]
}

/**
 * The stills stage's ending, written inside whichever transaction ends the stage: the approved
 * pictures marked chosen, every degraded shot's four labels (S-058), and the events the stage's checks
 * produced. One writer for a stage that ends the run and one that advances it, so the two cannot come
 * to label a shot differently (S-081).
 */
function endStills(tx: Writer, runId: string, ending: StillsEnding, now: Date): void {
  markChosen(tx, runId, ending.chosen ?? [])
  for (const shot of ending.degraded ?? []) markDegraded(tx, runId, shot)
  for (const event of ending.events ?? []) append(tx, runId, event, now)
}

/**
 * Ends a run at its stills stage, in one immediate transaction (S-046): the approved pictures marked
 * chosen, every degraded shot's labels (S-058), the events the stage's checks produced, `run.finished`,
 * the result, and the keyframes job done — its cost left as its image calls added it (S-036), never
 * overwritten with the result's. Handed the engine's resume, it makes it after the labels — so a
 * picture it copies carries the degradation this transaction wrote — and before `run.finished`
 * (resume-failed, S-163, S-164).
 */
export function finishStills<T = never>(
  db: Db,
  finish: StillsEnding & {
    runId: string
    jobId: number
    resume?: ResumeStep<T> | undefined
  } & RunEnding,
  now: Date = new Date(),
): ResumeStepped<T> | undefined {
  const { runId, jobId } = finish
  return db.transaction(
    (tx) => {
      endStills(tx, runId, finish, now)
      const stepped = resumedAndEnded(tx, runId, finish, now)
      completeJob(tx, jobId)
      return stepped
    },
    { behavior: 'immediate' },
  )
}

/**
 * A `video` run whose stills stage completed, in one immediate transaction (S-069): everything
 * `finishStills` writes of the stage — the chosen flags, the degradations' labels, the events and
 * `stage.finished` for stills — and the keyframes job done with its cost kept (S-055), and the chain's
 * next row: one `reel.clips` job whose `correlation_id` is the run and whose `parent_id` is the
 * keyframes job (D-081, D-083). Returns that row's id.
 *
 * The run is NOT finished, as `admitStills` leaves it (S-052): it has no result until the clips are
 * answered for, and a worker that died between this transaction and the next claim leaves a queued
 * job, not a half-finished run.
 */
export function advanceStills(
  db: Db,
  a: {
    runId: string
    jobId: number
    chosen: readonly string[]
    degraded: readonly DegradedShot[]
    events: readonly EventBody[]
  },
  now: Date = new Date(),
): number {
  const { runId, jobId } = a
  return db.transaction(
    (tx) => {
      endStills(tx, runId, a, now)
      completeJob(tx, jobId)
      return enqueue(
        tx,
        {
          kind: CLIPS_JOB,
          correlationId: runId,
          payload: { runId },
          parentId: jobId,
          attempts: startingAttempts(tx, runId, CLIPS_JOB),
        },
        now,
      )
    },
    { behavior: 'immediate' },
  )
}

/**
 * Three of a held shot's four labels, inside the transaction that ends the clips job's stage or its
 * run, WHATEVER THE ENDING (I-4, S-058's form, S-098): its `still_hold` row — the attempt that decided
 * it is the clips job's, read off its row — the reason on its third take's row, beside that take's
 * verdicts, and the video receipt of each of its three takes marked degraded, whichever attempt made
 * it — in the run, or in the run it resumes for a take copied from it (S-164). The fourth, its
 * `degraded` event, is among the events.
 */
function markStillHeld(tx: Writer, runId: string, jobId: number, held: StillHold): void {
  const claimed = tx.select({ attempts: job.attempts }).from(job).where(eq(job.id, jobId)).get()
  if (claimed === undefined) throw new Error(`no job ${jobId} to hold shot-${held.shotUnit} with`)
  const third = held.takeIds.at(-1)
  if (held.takeIds.length !== 3 || third === undefined) {
    throw new Error(
      `shot-${held.shotUnit} is held with ${held.takeIds.length} takes, not three (S-090)`,
    )
  }
  tx.insert(stillHold)
    .values({
      runId,
      shotId: `shot-${held.shotUnit}`,
      attempt: claimed.attempts,
      pictureId: held.pictureId,
      probe: JSON.stringify(held.probe),
      takeIds: JSON.stringify(held.takeIds),
      reason: held.reason,
    })
    .run()
  tx.update(take)
    .set({ degradation: held.reason })
    .where(and(eq(take.runId, runId), eq(take.takeId, third)))
    .run()
  tx.update(videoReceipt)
    .set({ degraded: true })
    .where(
      and(
        inArray(videoReceipt.runId, receiptRuns(tx, runId)),
        inArray(videoReceipt.takeId, [...held.takeIds]),
      ),
    )
    .run()
}

/**
 * A `video` run whose clips stage completed, in one immediate transaction (S-069): each held shot's
 * labels (S-098), the events its gates produced, the clips job done with its cost kept — what its
 * narration and clip calls added (S-036) — and the chain's last row: one `reel.assemble` job whose
 * `correlation_id` is the run and whose `parent_id` is the clips job (D-081, D-083). Returns that
 * row's id.
 *
 * The run is NOT finished, and the video stage has no `stage.finished`: the stage produced its output
 * only once its assembly does (S-025's reading, S-069).
 */
export function advanceClips(
  db: Db,
  a: {
    runId: string
    jobId: number
    events: readonly EventBody[]
    /** In the order the ladders reached them (S-098). */
    stillHolds: readonly StillHold[]
  },
  now: Date = new Date(),
): number {
  const { runId, jobId } = a
  return db.transaction(
    (tx) => {
      for (const held of a.stillHolds) markStillHeld(tx, runId, jobId, held)
      for (const event of a.events) append(tx, runId, event, now)
      completeJob(tx, jobId)
      return enqueue(
        tx,
        {
          kind: ASSEMBLE_JOB,
          correlationId: runId,
          payload: { runId },
          parentId: jobId,
          attempts: startingAttempts(tx, runId, ASSEMBLE_JOB),
        },
        now,
      )
    },
    { behavior: 'immediate' },
  )
}

/**
 * ASSEMBLY BEGINS (I-18, S-073): the render row, written with its render manifest, that manifest's
 * hash, the profile and its start time BEFORE the assembler is called. The text stored is the
 * manifest's canonical JSON, and the hash handed in is of exactly that text, so the row's hash can be
 * computed again from the row (S-085). Its start is the time a check compares every receipt with.
 */
export function startRender(
  db: Db,
  r: {
    runId: string
    jobId: number
    attempt: number
    renderManifest: RenderManifest
    hash: string
  },
  now: Date = new Date(),
): void {
  db.insert(render)
    .values({
      runId: r.runId,
      renderId: r.renderManifest.renderId,
      attempt: r.attempt,
      renderManifest: canonicalJson(r.renderManifest),
      hash: r.hash,
      profile: canonicalJson(r.renderManifest.profile),
      startedAt: now.toISOString(),
    })
    .run()
}

/** A shot whose clip is shorter than its narration, as the render manifest carries it (S-073). */
export interface HeldShot {
  shotId: string
  takeId: string
  seconds: number
  reason: string
}

/** What a render left, written with the ending of the job that made it. */
export interface RenderEnding {
  renderId: string
  holds: readonly HeldShot[]
  assembled: AssembledFile | null
  measured: MediaProbe | null
  gate7: CutVerdict | null
}

/**
 * Ends a `video` run at one of its video stage's jobs, in one immediate transaction: the events
 * before the end, `run.finished`, the result, and the job done — its cost left as its calls added it
 * (S-036), never overwritten with the result's, which is the whole chain's spend (D-081).
 *
 * From the assemble job it also writes what the render left, WHATEVER THE ENDING (S-058's form, S-073):
 * the render row's output, invocations, measure, Gate 7 verdict and finish time, and three of each
 * hold's four labels — its `hold` row, the reason on its take's row beside that take's verdicts, and
 * its take's video receipt marked degraded. The fourth, its `degraded` event, is among the events.
 *
 * From the clips job it also writes each held shot's labels, WHATEVER THE ENDING (S-098): a still-hold
 * decided before the run stopped or failed is a fact about its shot, as a degradation is (S-058).
 *
 * Handed the engine's resume, it makes it after every label and event and before `run.finished`, in
 * a savepoint, and answers what it came to (resume-failed, S-163).
 */
export function finishVideo<T = never>(
  db: Db,
  f: {
    runId: string
    jobId: number
    events?: readonly EventBody[]
    render?: RenderEnding
    /** The clips job's held shots, in the order the ladders reached them (S-098). */
    stillHolds?: readonly StillHold[]
    resume?: ResumeStep<T> | undefined
  } & RunEnding,
  now: Date = new Date(),
): ResumeStepped<T> | undefined {
  const { runId, jobId } = f
  return db.transaction(
    (tx) => {
      for (const held of f.stillHolds ?? []) markStillHeld(tx, runId, jobId, held)
      if (f.render !== undefined) {
        const { renderId, holds, assembled, measured, gate7 } = f.render
        for (const held of holds) {
          tx.insert(hold)
            .values({
              runId,
              renderId,
              shotId: held.shotId,
              seconds: held.seconds,
              reason: held.reason,
            })
            .run()
          tx.update(take)
            .set({ degradation: held.reason })
            .where(and(eq(take.runId, runId), eq(take.takeId, held.takeId)))
            .run()
          // In the run that paid for it: this one, or the run it resumes for a kept take (S-164).
          tx.update(videoReceipt)
            .set({ degraded: true })
            .where(
              and(
                inArray(videoReceipt.runId, receiptRuns(tx, runId)),
                eq(videoReceipt.takeId, held.takeId),
              ),
            )
            .run()
        }
        tx.update(render)
          .set({
            path: assembled?.path ?? null,
            invocations: assembled === null ? null : JSON.stringify(assembled.invocations),
            measure: measured === null ? null : JSON.stringify(measured),
            gate7: gate7 === null ? null : JSON.stringify(gate7),
            finishedAt: now.toISOString(),
          })
          .where(and(eq(render.runId, runId), eq(render.renderId, renderId)))
          .run()
      }
      for (const event of f.events ?? []) append(tx, runId, event, now)
      const stepped = resumedAndEnded(tx, runId, f, now)
      completeJob(tx, jobId)
      return stepped
    },
    { behavior: 'immediate' },
  )
}

/**
 * What a job does before its stage, in one immediate transaction, so a cancel cannot land between
 * the read and the start (docs/features/reel-plan.md, Gate 2 "Cancel" and "A restart";
 * docs/features/reel-stills.md, Gate 2 "Cancel"; S-027). A run whose cancel flag is set answers
 * `cancelled` and nothing is written — also when an interrupted job is run again. Otherwise
 * `stage.started` is appended, unless an earlier attempt at the job already wrote it: a job run
 * again from the start does not write it twice.
 *
 * One function over every stage, not one per stage: the transaction and the once-only rule are the
 * same for `plan`, `stills` and `video`, and a second copy is a second place for the rule to drift
 * (S-051, S-069).
 */
export function startStage(
  db: Db,
  runId: string,
  stage: Stage,
  now: Date = new Date(),
): 'cancelled' | 'started' {
  return db.transaction(
    (tx) => {
      const row = tx
        .select({ cancelRequested: run.cancelRequested })
        .from(run)
        .where(eq(run.runId, runId))
        .get()
      if (row === undefined) throw new Error(`no run '${runId}'`)
      if (row.cancelRequested) return 'cancelled'
      const started = tx
        .select({ seq: runEvent.seq })
        .from(runEvent)
        .where(
          and(
            eq(runEvent.runId, runId),
            sql`json_extract(${runEvent.body}, '$.type') = 'stage.started'`,
            sql`json_extract(${runEvent.body}, '$.stage') = ${stage}`,
          ),
        )
        .get()
      if (started === undefined) append(tx, runId, { type: 'stage.started', stage }, now)
      return 'started'
    },
    { behavior: 'immediate' },
  )
}

/** Sets the cancel flag on a running run. A finished run is left as it is. */
export function requestCancel(db: Db, runId: string): StoredRun | undefined {
  db.update(run)
    .set({ cancelRequested: true })
    .where(and(eq(run.runId, runId), eq(run.state, 'running')))
    .run()
  return readRun(db, runId)
}
