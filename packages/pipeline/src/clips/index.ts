import { failureKindOf } from '@cutroom/contracts'
import type {
  FailureKind,
  ClipRef,
  ClipsRecorder,
  RefusalRecorder,
  LanguageModelPort,
  MediaPort,
  MediaProbe,
  NarrationPort,
  NarrationRecord,
  Plan,
  PlanSettings,
  RenderSettings,
  StillHold,
  TakeNumber,
  TakeRecord,
  TakeVerdict,
  VideoAnswer,
  VideoPort,
  VideoRequest,
  WitnessObservation,
} from '@cutroom/contracts'
import type { RunEvent, SubmitRequest } from '@cutroom/reel-contract'
import { gate2 } from '../gates/gate2.ts'
import { gate3 } from '../gates/gate3.ts'
import { gate4 } from '../gates/gate4.ts'
import { gate5, type TakeBrief } from '../gates/gate5.ts'
import { shotIdOf } from '../stills/place.ts'
import { takeCriteria } from './criteria.ts'
import { narrationIdOf, takeIdOf } from './ids.ts'
import { TAKES_A_SHOT, atTheCap } from './ladder.ts'
import { narrationText, requestedSeconds, wordTimings } from './narration.ts'
import { clipPrompt, retryPrompt } from './prompts.ts'

// The clips stage (docs/features/reel-render.md, Gates 2 and 3; S-070 to S-072; and reel-takes' S-090,
// S-091, S-094). The worker calls `makeClips` with the selected plan, the chosen pictures and the ports
// it built, and it answers with how the stage ended and everything it made. It never rejects: a thrown
// call, a refused parse or a bug becomes a failed outcome, with every narration and take made before it
// in the record.
//
// SHOT BY SHOT, IN PLAN ORDER: the shot's narration, measured and its timings parsed; then its takes,
// each made the shot's own way — from its chosen picture, or from words (S-091) — and Gates 2 to 5 on
// each as soon as it is made. A take is counted once decided: Gate 2 failed, or Gate 5 completed
// (D-024, S-094). A take that fails is followed by the shot's next, told every earlier failed take's
// reasons (D-033); the first accepted is the shot's, and none follows it (D-030). After the third
// decided failure no video call names the shot, and the ladder decides: a stop for the rule of the
// third take's lowest failing gate, or a HOLD on the shot's chosen picture — probed by the media port
// then (D-055, S-097), recorded with its `degraded` event, and the stage goes on to the next shot
// (S-090, S-098). Once every shot is done, accepted or held, a `mustShow` no sentence claims that no
// ACCEPTED take showed stops the reel for gate-5: a held shot's failed takes show nothing (S-072, S-090).
//
// AND IT SKIPS WHAT AN EARLIER ATTEMPT FINISHED (S-092). `kept` is every narration an earlier attempt
// finished and every take it decided, in the order made. A kept narration is the shot's — not spoken,
// probed or parsed again — and a kept take is not made, measured, heard, witnessed or reconciled
// again (I-15); no receipt is added for either. Reaching a shot, the stage emits each kept take's
// verdicts as events, so every decided take's verdicts are events ONCE, in shot and take order. A
// shot with a kept accepted take is finished; otherwise its next take is numbered its kept decided
// takes PLUS ONE and is told every kept failed take's reasons, and a shot whose three kept takes all
// failed reaches the ladder WITH NO CALL. A take a crash cut off is not kept and not resumed: it is
// made again under this attempt's id, under the same number, counting against no cap.

type Verdict = Extract<RunEvent, { type: 'verdict' }>
type Degraded = Extract<RunEvent, { type: 'degraded' }>
type Refused = Extract<VideoAnswer, { kind: 'refused' }>

/** A take's verdict, or a held shot's `degraded` event after its third take's verdicts (S-098). */
export type ClipsEvent =
  | Pick<Verdict, 'type' | 'gate' | 'outcome' | 'shotId'>
  | Pick<Degraded, 'type' | 'shotId' | 'reason'>

export interface ClipsRecord {
  /** This attempt's narrations, in the order made. */
  narrations: NarrationRecord[]
  takes: TakeRecord[]
  /** The shots held on their chosen pictures, in the order the ladders reached them (S-098). */
  stillHolds: StillHold[]
  /** In the order the gates ran. */
  events: ClipsEvent[]
}

type Ending =
  | { kind: 'completed' }
  | { kind: 'stopped-rule'; rule: 'gate-2' | 'gate-3' | 'gate-5'; detail: string }
  | ({ kind: 'stopped-budget' } & Pick<Refused, 'limit' | 'estimateCents'>)
  // The kind of the failure, decided where the error was caught, from its class (S-163).
  | { kind: 'failed'; detail: string; failure: FailureKind }

export type ClipsOutcome = ClipsRecord & Ending

export interface ClipsInput {
  runId: string
  /** The clips job's attempt. */
  attempt: number
  request: SubmitRequest
  plan: Plan
  /** The chosen pictures, each with Gate 1's recorded observation (D-033). */
  stills: ReadonlyArray<{
    pictureId: string
    shotUnit: number
    path: string
    observation: WitnessObservation
  }>
  /** The shots whose picture was degraded, which are made from words (D-050 step 2). */
  degradedShots: readonly number[]
  /** What earlier attempts finished, which this one keeps and does not make again (S-092). */
  kept: {
    /** Every narration an earlier attempt made, measured and timed, in the order made. */
    narrations: readonly NarrationRecord[]
    /** Every take an earlier attempt decided — accept or fail — in the order made. */
    takes: readonly TakeRecord[]
  }
}

export interface ClipsPorts {
  /** Validating and guarded: the only video port the stage is handed (D-071, S-071). */
  video: VideoPort
  /** Guarded. */
  narration: NarrationPort
  media: MediaPort
  /** Recording. */
  model: LanguageModelPort
  recorder: ClipsRecorder
  /** Where every answer a gate refuses is handed, to be kept (docs/features/ask-again.md, S-156). */
  refusals: RefusalRecorder
}

export interface ClipsStageSettings {
  plan: PlanSettings
  render: RenderSettings
}

const messageOf = (error: unknown) => (error instanceof Error ? error.message : String(error))

/** The CRC-32 of a take id's UTF-8 bytes: its seed, made by the caller and recorded (D-018, S-071). */
function crc32(text: string): number {
  let crc = 0xffffffff
  for (const byte of new TextEncoder().encode(text)) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1))
  }
  return (crc ^ 0xffffffff) >>> 0
}

/**
 * Why a held picture's probe is not a readable picture, or null when it is: ffprobe read the file and
 * found a video stream with a width and a height (S-103). `readable` alone is not enough — ffprobe
 * answers bytes that are no picture, named .png, with a stream of 0 × 0.
 */
function notAPicture(probe: MediaProbe): string | null {
  if (!probe.readable) return 'ffprobe could not read the file'
  if (probe.video === null) return 'it has no video stream'
  const { width, height } = probe.video
  if (!(width > 0 && height > 0)) return `its video stream is ${width} × ${height}`
  return null
}

/** A call the worker's guard refused (S-035): not made, and the stage stops with the guard's figures. */
const stopped = (refused: Refused): Ending => ({
  kind: 'stopped-budget',
  limit: refused.limit,
  estimateCents: refused.estimateCents,
})

/**
 * An `unavailable` answer that reached the stage: a fault, as a thrown call is (S-046, S-096). Only a
 * provider answers it, and the worker's guarded port — the only video and narration port the stage is
 * handed — sends the call again rather than pass it on; one that arrives here came through a port
 * built wrong. Nothing is recorded for it, so no take is counted (I-11).
 */
const unavailable = (port: 'video' | 'narration', id: string, detail: string) =>
  new Error(
    `the ${port} port answered unavailable for ${id} (${detail}): only the worker's guarded port may be answered that, and it sends the call again (S-096, I-11)`,
  )

export async function makeClips(
  input: ClipsInput,
  ports: ClipsPorts,
  settings: ClipsStageSettings,
): Promise<ClipsOutcome> {
  const record: ClipsRecord = { narrations: [], takes: [], stillHolds: [], events: [] }
  const snapshot = (): ClipsRecord => ({
    narrations: record.narrations.map((n) => ({ ...n })),
    takes: record.takes.map((t) => ({ ...t })),
    stillHolds: record.stillHolds.map((h) => ({ ...h })),
    events: [...record.events],
  })
  try {
    const ended = await stage(input, ports, settings, record)
    return { ...snapshot(), ...ended }
  } catch (error) {
    return {
      ...snapshot(),
      kind: 'failed',
      detail: messageOf(error),
      failure: failureKindOf(error),
    }
  }
}

async function stage(
  input: ClipsInput,
  ports: ClipsPorts,
  settings: ClipsStageSettings,
  record: ClipsRecord,
): Promise<Ending> {
  const { runId, attempt, plan, request } = input
  const subjects = new Map(plan.subjects.map((s) => [s.id, s]))

  // A kept take made from another picture than its shot's chosen one, or from words on a shot that
  // has a chosen picture, is refused BEFORE ANY CALL, as an engine fault (resume-failed, S-164). The
  // takedown and the carried degradations make it unreachable; this makes a planner bug cost nothing,
  // where a render refused after the clips are paid for would cost them all.
  for (const kept of input.kept.takes) {
    const still = input.stills.find((s) => s.shotUnit === kept.shotUnit)
    if (kept.mode === 'text-to-video' ? still === undefined : kept.pictureId === still?.pictureId) {
      continue
    }
    const shotId = shotIdOf(kept.shotUnit)
    throw new Error(
      kept.mode === 'text-to-video'
        ? `the kept take ${kept.takeId} of ${shotId} was made from words, and its shot has the chosen picture ${still?.pictureId} (S-164)`
        : `the kept take ${kept.takeId} of ${shotId} was made from ${kept.pictureId}, not from its shot's chosen picture ${still?.pictureId ?? '— it has none'} (S-164)`,
    )
  }

  /** Replaces a narration's fields and hands the whole record to the recorder. */
  const narrated = async (index: number, fields: Partial<NarrationRecord>) => {
    const current = record.narrations[index]
    if (current === undefined) throw new Error(`no narration ${index} was made`)
    record.narrations[index] = { ...current, ...fields }
    await ports.recorder.narration(record.narrations[index])
  }
  /** Replaces a take's fields and hands the whole record to the recorder. */
  const taken = async (index: number, fields: Partial<TakeRecord>) => {
    const current = record.takes[index]
    if (current === undefined) throw new Error(`no take ${index} was made`)
    record.takes[index] = { ...current, ...fields }
    await ports.recorder.take(record.takes[index])
  }
  /** A gate's verdict, added to its take in gate order, and its event once it completed. */
  const decided = async (index: number, verdict: TakeVerdict, fields: Partial<TakeRecord> = {}) => {
    const verdicts = [...(record.takes[index]?.verdicts ?? []), verdict]
    await taken(index, { ...fields, verdicts })
    record.events.push({
      type: 'verdict',
      gate: verdict.gate,
      outcome: verdict.outcome,
      shotId: shotIdOf(record.takes[index]?.shotUnit ?? -1),
    })
  }
  /** Each failed gate of a take, with its reasons. */
  const failures = (take: TakeRecord) =>
    take.verdicts
      .filter((v) => v.outcome === 'fail')
      .map((v) => `Gate ${v.gate}: ${v.reasons.join('; ')}`)
      .join(', and ')
  /**
   * A shot whose three takes failed and cannot be held stops the reel, for the rule of its THIRD
   * take's lowest failing gate (S-090, S-094), the detail naming each take, its reasons and why.
   */
  const stop = (failed: readonly TakeRecord[], why: string): Ending => {
    const lowest = failed.at(-1)?.verdicts.find((v) => v.outcome === 'fail')?.gate ?? '5'
    return {
      kind: 'stopped-rule',
      rule: lowest === '2' ? 'gate-2' : lowest === '3' ? 'gate-3' : 'gate-5',
      detail: `${shotIdOf(failed[0]?.shotUnit ?? -1)}'s three takes failed their checks — ${failed
        .map((t) => `${t.takeId} failed ${failures(t)}`)
        .join('; ')} — so the reel stops: ${why}`,
    }
  }

  for (const shot of plan.shots) {
    const unit = shot.unit

    // The shot's narration. One an earlier attempt FINISHED is the shot's, and is not spoken, probed
    // or parsed again (S-092): its measure is the one that attempt took. Otherwise it is made now,
    // immediately before its clip (S-070).
    let measured: MediaProbe
    const keptNarration = input.kept.narrations.find((k) => k.shotUnit === unit)
    if (keptNarration !== undefined) {
      if (keptNarration.probe === null || keptNarration.words === null) {
        throw new Error(
          `${shotIdOf(unit)} kept the narration ${keptNarration.narrationId}, which was never measured and timed (S-092)`,
        )
      }
      measured = keptNarration.probe
    } else {
      const narrationId = narrationIdOf(attempt, unit)
      const text = narrationText(unit, plan, request)
      const spoken = await ports.narration.speak({
        runId,
        narrationId,
        text,
        voice: settings.render.voice,
      })
      if (spoken.kind === 'refused') return stopped(spoken)
      if (spoken.kind === 'unavailable') throw unavailable('narration', narrationId, spoken.detail)
      record.narrations.push({
        narrationId,
        attempt,
        shotUnit: unit,
        text,
        path: spoken.audio.path,
        words: null,
        probe: null,
      })
      const n = record.narrations.length - 1
      // Measured: the file's duration is the narration's (I-17).
      measured = await ports.media.probe({ id: narrationId, path: spoken.audio.path })
      await narrated(n, { probe: measured })
      const timings = wordTimings(text, measured.durationSeconds).safeParse(spoken.timings)
      if (!timings.success) {
        const reasons = timings.error.issues.map(
          (i) => `${i.path.join('.') || '(timings)'}: ${i.message}`,
        )
        // KEPT, and not asked again (docs/features/ask-again.md, S-156): the owner kept a narration
        // to one call, and what the provider answered is what the next reading needs (P-001).
        await ports.refusals.keep({
          port: 'speech',
          role: null,
          call: null,
          about: [narrationId],
          ask: 1,
          reasons,
          answer: JSON.stringify(spoken.timings) ?? String(spoken.timings),
        })
        // An answer the provider gave that cannot be used, returned rather than thrown: its run's
        // kind is `unreadable`, and a new run may ask again (P-001, S-163).
        return {
          kind: 'failed',
          failure: 'unreadable',
          detail: `the word timings of ${narrationId} do not parse: ${reasons.join('; ')}`,
        }
      }
      await narrated(n, { words: timings.data })
    }

    // What every take of the shot is made from and held to: its first take's prompt, criteria and
    // requested seconds, and its mode — from its chosen picture, or from words at 9:16 (S-071, S-091).
    const still = input.stills.find((s) => s.shotUnit === unit)
    const criteria = takeCriteria(unit, plan, request)
    const shown = shot.subjectIds.flatMap((id) => {
      const subject = subjects.get(id)
      return subject === undefined ? [] : [subject]
    })
    const brief: TakeBrief = { subjects: shown, ...criteria }
    const first = clipPrompt({
      style: request.style,
      sentences: (plan.units[unit] ?? []).map((p) => request.narration[p]?.text ?? ''),
      ...brief,
      picture: still?.observation ?? null,
    })
    const durationSeconds = requestedSeconds(measured.durationSeconds)

    // The takes an earlier attempt DECIDED for this shot are kept, in the order made, and their
    // verdicts become events now — the finishing attempt emits them as it reaches the shot, so every
    // decided take's verdicts are events once, in shot and take order (S-092). None of them is made,
    // measured, heard, witnessed or reconciled again (I-15).
    const kept = input.kept.takes.filter((k) => k.shotUnit === unit)
    for (const earlier of kept) {
      for (const verdict of earlier.verdicts) {
        record.events.push({
          type: 'verdict',
          gate: verdict.gate,
          outcome: verdict.outcome,
          shotId: shotIdOf(unit),
        })
      }
    }

    // Up to three decided takes, EVERY ATTEMPT'S, until one is accepted (D-024, D-030, S-092, S-094):
    // a shot with a kept accepted take is finished, and the next take of any other is numbered its
    // kept decided takes plus one — so a shot with three kept failed takes makes no call at all.
    const failed: TakeRecord[] = kept.filter((k) => k.outcome === 'fail')
    const finishedEarlier = kept.some((k) => k.outcome === 'accept')
    for (let count = kept.length + 1; !finishedEarlier && count <= TAKES_A_SHOT; count += 1) {
      const number = count as TakeNumber
      const takeId = takeIdOf(attempt, unit, number)
      // A retry is told every earlier failed take's reasons, and nothing else of them (D-033).
      const prompt = failed.length === 0 ? first : retryPrompt(first, failed)
      const fields = {
        runId,
        takeId,
        prompt,
        durationSeconds,
        resolution: '768P' as const,
        seed: crc32(takeId),
        promptExpansionMode: settings.render.promptExpansionMode,
      }
      const asked: VideoRequest =
        still === undefined
          ? { ...fields, mode: 'text-to-video', aspectRatio: '9:16' }
          : {
              ...fields,
              mode: 'image-to-video',
              image: { pictureId: still.pictureId, path: still.path },
            }
      // A take the guard refuses is not made, and its shot is not held: the stage stops for budget
      // (S-095). Not made, it is not counted.
      const made = await ports.video.generate(asked)
      if (made.kind === 'refused') return stopped(made)
      if (made.kind === 'unavailable') throw unavailable('video', takeId, made.detail)
      record.takes.push({
        takeId,
        attempt,
        shotUnit: unit,
        number,
        mode: asked.mode,
        pictureId: still?.pictureId ?? null,
        degraded: still === undefined && input.degradedShots.includes(unit),
        prompt,
        durationSeconds,
        seed: fields.seed,
        requestId: made.receipt.requestId,
        expandedPrompt: made.receipt.expandedPrompt,
        path: made.clip.path,
        probe: null,
        scan: null,
        words: null,
        sound: null,
        observation: null,
        reconciliation: null,
        verdicts: [],
        outcome: null,
        degradation: null,
      })
      const t = record.takes.length - 1
      const clip: ClipRef = { takeId, path: made.clip.path }

      // Gate 2. A take failing it has no later gate (S-031's reason), and is decided.
      const technical = await gate2(clip, ports.media, settings.render.technical, (f) =>
        taken(t, f),
      )
      if (technical.outcome === 'fail') {
        await decided(t, technical, { outcome: 'fail' })
        failed.push(record.takes[t] as TakeRecord)
        continue
      }
      await decided(t, technical)

      // Gate 3; after it fails, Gates 4 and 5 still run, so the record holds every reason.
      const heard = await gate3(clip, ports.media, (f) => taken(t, f))
      await decided(t, heard)

      // Gate 4, the witness, given this take's clip alone (I-8): a cut-off take keeps the gates it
      // completed and no outcome.
      const witnessed = await gate4(clip, ports.model, ports.refusals)
      await decided(t, witnessed.verdict, { observation: witnessed.observation })

      // Gate 5, given this take's own observation and its shot's brief; the outcome is decided now:
      // accept only if all four accepted.
      const reconciled = await gate5({ takeId }, witnessed.observation, brief, ports.model)
      const all = [...(record.takes[t]?.verdicts ?? []), reconciled.verdict]
      const outcome = all.every((v) => v.outcome === 'accept') ? 'accept' : 'fail'
      await decided(t, reconciled.verdict, { reconciliation: reconciled.reconciliation, outcome })
      if (outcome === 'accept') break
      failed.push(record.takes[t] as TakeRecord)
    }

    // At the cap: every one of its three decided takes failed, and the ladder decides (S-090).
    if (failed.length === TAKES_A_SHOT) {
      const capped = atTheCap(
        {
          shotUnit: unit,
          picture: still === undefined ? null : { pictureId: still.pictureId },
          events: criteria.mustShow.filter((c) => c.type === 'event'),
        },
        failed,
      )
      if (capped.kind === 'fail') return stop(failed, capped.why)

      // A hold: the ladder holds only a shot with a chosen picture (S-090). Its picture is probed by
      // the media port now, when the ladder holds the shot — the conform's only source for its
      // geometry (D-055, I-17, S-097). A probe that throws fails the run, as any thrown call does
      // (S-046); a picture that does not probe as a readable picture is a fault, and fails it too — it
      // passed Gate 1, so its file is not the one that was checked (S-103). Either way nothing is
      // recorded for the hold, so no label is written.
      if (still === undefined) throw new Error(`${shotIdOf(unit)} was held with no chosen picture`)
      const probe = await ports.media.probe({ id: still.pictureId, path: still.path })
      const unreadable = notAPicture(probe)
      if (unreadable !== null) {
        return {
          kind: 'failed',
          failure: 'engine',
          detail: `${shotIdOf(unit)} is to be held on its approved picture ${still.pictureId}, which did not probe as a readable picture: ${unreadable} (D-055, S-097, S-103)`,
        }
      }
      // Recorded, with its degraded event after its third take's verdicts; its labels are written with
      // whatever ending the clips job reaches (S-098). The stage goes on to the next shot.
      record.stillHolds.push({
        shotUnit: unit,
        pictureId: still.pictureId,
        path: still.path,
        probe,
        takeIds: failed.map((t) => t.takeId),
        reason: capped.reason,
      })
      record.events.push({ type: 'degraded', shotId: shotIdOf(unit), reason: capped.reason })
    }
  }

  // Every shot done, accepted or held: a mustShow no sentence claims must be shown by an ACCEPTED take
  // — a held shot's takes all failed, and show nothing for it (S-072, S-090).
  const everyTake = [...input.kept.takes, ...record.takes]
  const unmet = request.criteria.mustShow.filter(
    (c) =>
      c.claimId === undefined &&
      !everyTake.some(
        (take) =>
          take.outcome === 'accept' &&
          take.reconciliation?.criteria.some((said) => said.id === c.id && said.shown),
      ),
  )
  if (unmet.length > 0) {
    record.events.push({ type: 'verdict', gate: '5', outcome: 'fail' })
    return {
      kind: 'stopped-rule',
      rule: 'gate-5',
      detail: `no take shows what the reel must show in some shot: ${unmet
        .map((c) => `"${c.id}" (${c.text})`)
        .join(', ')} (S-072)`,
    }
  }
  return { kind: 'completed' }
}
