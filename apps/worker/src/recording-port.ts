import { isSpent, type LanguageModelPort, type ModelCall, type ModelRole } from '@cutroom/contracts'
import { recordReceipt, recordRefusedAnswer, type Db } from '@cutroom/domain'
import { recordingSpend } from './spend.ts'

/**
 * The port the worker hands the pipeline (docs/features/reel-plan.md, Gate 2 "Receipts"): the
 * model it was given, wrapped so that each call's `model_receipt` is written as the call returns
 * (D-005, D-084). A call that throws returned nothing and leaves no receipt; every call before it
 * keeps its own, whatever happens to the run afterwards.
 *
 * All five calls are recorded (S-037, S-074, S-126): the observation and the reconciliation of a picture
 * or a take are tied to their receipts by key — the LAST `observe` receipt whose `pictureIds` or
 * `takeIds` is that picture's or take's (two when the witness's first answer was refused and it
 * was asked once more, S-147), and the one `reconciler` receipt likewise — so a call that left no
 * row would leave a record nothing can join.
 *
 * Each row names its call, its picture ids and its take ids — the columns reel-stills' Slice 3
 * migration and reel-render's Slice 1 migration added (S-049, S-072).
 *
 * AND A CALL THAT ANSWERED AND COULD NOT BE READ LEAVES A `lost_call` ROW (paid-failures, S-142).
 * The adapter throws `Spent` once a 200 is in hand — a reasoning block with no answer, a fence, a
 * schema echo, a body cut off mid-JSON — and `recordingSpend` writes the row and rethrows, so the
 * run fails exactly as it did. The figure is zero while the Token Plan covers these calls (S-129);
 * the ROW is what the next session needs, and it is written against the job that made the call,
 * which is why the job id is asked for here rather than assumed.
 *
 * AND WHEN THAT `Spent` CARRIES THE MODEL'S ANSWER, THE ANSWER IS KEPT (docs/features/ask-again.md,
 * S-156): one `refused_answer` row — which call, what it was about, which ask (2 when the call
 * carried `refused`, the reasons of an answer refused before it), why, and the answer text — so a
 * person can read what the model wrote. A `Spent` with no answer — the wire, or a reasoning block
 * with nothing after it — keeps its `lost_call` row and no other. This port writes the row and
 * never asks again: the pipeline does, and only for a `structured` answer refused for its shape.
 */
export function recordingPort(
  model: LanguageModelPort,
  db: Db,
  runId: string,
  jobId: number,
): LanguageModelPort {
  const job = { jobId, runId }

  /** One call: its lost call and its refused answer on the record if it spent unread, then rethrown. */
  async function sent<T>(
    what: { role: ModelRole; call: ModelCall; about: readonly string[]; ask: 1 | 2 },
    send: () => Promise<T>,
  ): Promise<T> {
    try {
      return await recordingSpend(db, job, send)
    } catch (error) {
      if (isSpent(error) && error.receipt.answer !== undefined) {
        recordRefusedAnswer(db, {
          runId,
          refusal: {
            port: 'model',
            role: what.role,
            call: what.call,
            about: what.about,
            ask: what.ask,
            reasons: error.receipt.refused ?? [error.receipt.detail],
            answer: error.receipt.answer,
          },
        })
      }
      throw error
    }
  }

  return {
    async structured(call) {
      const answer = await sent(
        {
          role: call.role,
          call: 'structured',
          about: [...(call.pictureIds ?? []), ...(call.takeIds ?? [])],
          ask: call.refused === undefined ? 1 : 2,
        },
        () => model.structured(call),
      )
      recordReceipt(db, runId, answer.receipt)
      return answer
    },
    async observe(call) {
      const answer = await sent(
        {
          role: 'witness',
          call: 'observe',
          about: call.clip === undefined ? [call.picture.pictureId] : [call.clip.takeId],
          ask: call.refused === undefined ? 1 : 2,
        },
        () => model.observe(call),
      )
      recordReceipt(db, runId, answer.receipt)
      return answer
    },
    async compare(call) {
      const answer = await sent(
        {
          role: 'judge',
          call: 'compare',
          about: call.pictures.map((p) => p.pictureId),
          ask: 1,
        },
        () => model.compare(call),
      )
      recordReceipt(db, runId, answer.receipt)
      return answer
    },
    async judgeCut(call) {
      const answer = await sent(
        {
          role: 'judge',
          call: 'judgeCut',
          about: call.shots.flatMap((s) => s.frames.map((f) => f.pictureId)),
          ask: 1,
        },
        () => model.judgeCut(call),
      )
      recordReceipt(db, runId, answer.receipt)
      return answer
    },
    // Gate 1's text step (S-112, S-126). The sensor makes this call, through the reader the
    // pipeline hands it — which is made from THIS port, so the vision call a real sensor pays for
    // leaves a row like every other (D-084, D-006).
    async readText(call) {
      const answer = await sent(
        { role: 'witness', call: 'readText', about: [call.picture.pictureId], ask: 1 },
        () => model.readText(call),
      )
      recordReceipt(db, runId, answer.receipt)
      return answer
    },
  }
}
