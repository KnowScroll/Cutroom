import type {
  ClipRef,
  ClipsRecorder,
  LanguageModelPort,
  MediaPort,
  NarrationPort,
  NarrationRecord,
  Plan,
  PlanSettings,
  RenderSettings,
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
import { narrationText, requestedSeconds, wordTimings } from './narration.ts'
import { clipPrompt } from './prompts.ts'

// The clips stage (docs/features/reel-render.md, Gates 2 and 3; S-066, S-070 to S-072). The worker
// calls `makeClips` with the selected plan, the chosen pictures and the ports it built, and it answers
// with how the stage ended and everything it made. It never rejects: a thrown call, a refused parse or
// a bug becomes a failed outcome, with every narration and take made before it in the record.
//
// SHOT BY SHOT, IN PLAN ORDER: the shot's narration, measured and its timings parsed; then its one take
// (S-066), made from its chosen picture or from words, and Gates 2 to 5 on it as soon as it is made. A
// take that fails stops the stage, and nothing later is made. Once every take is accepted, a `mustShow`
// no sentence claims that no take showed stops the reel for gate-5 (S-072).

type Verdict = Extract<RunEvent, { type: 'verdict' }>
type Refused = Extract<VideoAnswer, { kind: 'refused' }>

export type ClipsEvent = Pick<Verdict, 'type' | 'gate' | 'outcome' | 'shotId'>

export interface ClipsRecord {
  /** This attempt's narrations, in the order made. */
  narrations: NarrationRecord[]
  takes: TakeRecord[]
  /** In the order the gates ran. */
  events: ClipsEvent[]
}

type Ending =
  | { kind: 'completed' }
  | { kind: 'stopped-rule'; rule: 'gate-2' | 'gate-3' | 'gate-5'; detail: string }
  | ({ kind: 'stopped-budget' } & Pick<Refused, 'limit' | 'estimateCents'>)
  | { kind: 'failed'; detail: string }

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
  const record: ClipsRecord = { narrations: [], takes: [], events: [] }
  const snapshot = (): ClipsRecord => ({
    narrations: record.narrations.map((n) => ({ ...n })),
    takes: record.takes.map((t) => ({ ...t })),
    events: [...record.events],
  })
  try {
    const ended = await stage(input, ports, settings, record)
    return { ...snapshot(), ...ended }
  } catch (error) {
    return { ...snapshot(), kind: 'failed', detail: messageOf(error) }
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
  /** A take that failed stops the reel, for the rule of its lowest failing gate (S-066). */
  const stop = (index: number): Ending => {
    const take = record.takes[index]
    const failing = (take?.verdicts ?? []).filter((v) => v.outcome === 'fail')
    const lowest = failing[0]?.gate ?? '5'
    return {
      kind: 'stopped-rule',
      rule: lowest === '2' ? 'gate-2' : lowest === '3' ? 'gate-3' : 'gate-5',
      detail: `${take?.takeId} failed ${failing
        .map((v) => `Gate ${v.gate}: ${v.reasons.join('; ')}`)
        .join(', and ')}. A shot gets one take in this build, so the reel stops (S-066).`,
    }
  }

  for (const shot of plan.shots) {
    const unit = shot.unit

    // The shot's narration, immediately before its clip (S-070).
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
    const measured = await ports.media.probe({ id: narrationId, path: spoken.audio.path })
    await narrated(n, { probe: measured })
    const timings = wordTimings(text, measured.durationSeconds).safeParse(spoken.timings)
    if (!timings.success) {
      return {
        kind: 'failed',
        detail: `the word timings of ${narrationId} do not parse: ${timings.error.issues
          .map((i) => `${i.path.join('.') || '(timings)'}: ${i.message}`)
          .join('; ')}`,
      }
    }
    await narrated(n, { words: timings.data })

    // The shot's one take: from its chosen picture, or from words at 9:16 (S-071).
    const takeId = takeIdOf(attempt, unit)
    const still = input.stills.find((s) => s.shotUnit === unit)
    const criteria = takeCriteria(unit, plan, request)
    const shown = shot.subjectIds.flatMap((id) => {
      const subject = subjects.get(id)
      return subject === undefined ? [] : [subject]
    })
    const brief: TakeBrief = { subjects: shown, ...criteria }
    const prompt = clipPrompt({
      style: request.style,
      sentences: (plan.units[unit] ?? []).map((p) => request.narration[p]?.text ?? ''),
      ...brief,
      picture: still?.observation ?? null,
    })
    const fields = {
      runId,
      takeId,
      prompt,
      durationSeconds: requestedSeconds(measured.durationSeconds),
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
    const made = await ports.video.generate(asked)
    if (made.kind === 'refused') return stopped(made)
    if (made.kind === 'unavailable') throw unavailable('video', takeId, made.detail)
    record.takes.push({
      takeId,
      attempt,
      shotUnit: unit,
      number: 1,
      mode: asked.mode,
      pictureId: still?.pictureId ?? null,
      degraded: still === undefined && input.degradedShots.includes(unit),
      prompt,
      durationSeconds: fields.durationSeconds,
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

    // Gate 2. A take failing it has no later gate (S-031's reason).
    const technical = await gate2(clip, ports.media, settings.render.technical, (f) => taken(t, f))
    if (technical.outcome === 'fail') {
      await decided(t, technical, { outcome: 'fail' })
      return stop(t)
    }
    await decided(t, technical)

    // Gate 3; after it fails, Gates 4 and 5 still run, so the record holds every reason.
    const heard = await gate3(clip, ports.media, (f) => taken(t, f))
    await decided(t, heard)

    // Gate 4, the witness: a cut-off take keeps the gates it completed and no outcome.
    const witnessed = await gate4(clip, ports.model)
    await decided(t, witnessed.verdict, { observation: witnessed.observation })

    // Gate 5; the outcome is decided now: accept only if all four accepted.
    const reconciled = await gate5({ takeId }, witnessed.observation, brief, ports.model)
    const all = [...(record.takes[t]?.verdicts ?? []), reconciled.verdict]
    const outcome = all.every((v) => v.outcome === 'accept') ? 'accept' : 'fail'
    await decided(t, reconciled.verdict, { reconciliation: reconciled.reconciliation, outcome })
    if (outcome === 'fail') return stop(t)
  }

  // Every take accepted: a mustShow no sentence claims must be shown by one of them (S-072, D-025).
  const unmet = request.criteria.mustShow.filter(
    (c) =>
      c.claimId === undefined &&
      !record.takes.some(
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
