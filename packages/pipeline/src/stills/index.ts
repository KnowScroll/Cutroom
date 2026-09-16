import type {
  Framing,
  ImageAnswer,
  ImagePort,
  LanguageModelPort,
  PictureRecord,
  PictureRef,
  PictureSensorPort,
  Plan,
  PlanSettings,
  StillsRecorder,
  StillsSettings,
} from '@cutroom/contracts'
import type { RunEvent, SubmitRequest } from '@cutroom/reel-contract'
import { GATE_ORDER } from '../gates/index.ts'
import { gate1, type Brief, type Gate1Progress } from '../gates/gate1.ts'
import { gate1s } from '../gates/gate1s.ts'
import { criteriaFor } from './criteria.ts'
import { pictureIdOf, placePictures, shotIdOf, type Placement } from './place.ts'
import { framingFor, imagePrompt, pictureEntry } from './prompts.ts'
import { DEFAULT_SCORE_WEIGHTS, keyframeScore } from './score.ts'

// The stills stage (docs/features/reel-stills.md, Gates 2 and 3; S-039 to S-046). The worker calls
// `makeStills` with the selected plan and the ports it built, and it answers with how the stage
// ended and everything it made. It never rejects: a thrown call, a refused parse or a bug becomes a
// failed outcome, with every picture made before it in the record (S-046).
//
// Slice 3 of reel-stills builds a stage whose pictures all pass. Anything that needs a ladder — a
// canonical with no survivor, a derived picture failing Gate 1 or Gate 1S — ends the stage failed
// with "the ladder is not built", which Slice 4 replaces with the ladders.

/** Every stills setting's default. The weights and the threshold are provisional until M-1. */
export const DEFAULT_STILLS_SETTINGS: StillsSettings = {
  canonicalFraming: ['medium', 'wide'], // D-032, S-044
  scoreWeights: { ...DEFAULT_SCORE_WEIGHTS }, // D-031
  suspicionThreshold: 0.25, // D-049
}

type Verdict = Extract<RunEvent, { type: 'verdict' }>
type Degraded = Extract<RunEvent, { type: 'degraded' }>
export type StillsEvent =
  | Pick<Verdict, 'type' | 'gate' | 'outcome' | 'shotId'>
  | Pick<Degraded, 'type' | 'shotId' | 'reason'>

export interface StillsRecord {
  /** This attempt's pictures, in the order made. */
  pictures: PictureRecord[]
  degradations: Array<{ shotId: string; gate: '1' | '1S'; reason: string }>
  /** In the order the checks ran. */
  events: StillsEvent[]
}

export type StillsOutcome = StillsRecord &
  (
    | { kind: 'completed' }
    | { kind: 'stopped-rule'; rule: 'gate-1'; detail: string }
    | ({ kind: 'stopped-budget' } & Pick<
        Extract<ImageAnswer, { kind: 'refused' }>,
        'limit' | 'estimateCents'
      >)
    | { kind: 'failed'; detail: string }
  )

export interface StillsInput {
  runId: string
  /** The keyframes job's attempt. */
  attempt: number
  /** The run's image calls before this attempt (S-048). */
  earlierImageCalls: number
  request: SubmitRequest
  plan: Plan
}

export interface StillsPorts {
  image: ImagePort
  model: LanguageModelPort
  sensors: PictureSensorPort
  recorder: StillsRecorder
}

export interface StillsStageSettings {
  plan: PlanSettings
  stills: StillsSettings
}

/** Until Slice 4 builds the ladders, the detail of every ending that needs one. */
const NO_LADDER = 'the ladder is not built'

/** A made picture: its place in this attempt's list, and the file the port wrote. */
interface Made {
  index: number
  ref: PictureRef
}

type Refused = Extract<ImageAnswer, { kind: 'refused' }>

const messageOf = (error: unknown) => (error instanceof Error ? error.message : String(error))

/**
 * A call the worker's guard refused (S-035): the stage stops with the guard's figures. The run's
 * budget ending is the worker's to write — Slice 4's.
 */
const stopped = (refused: Refused): Ending => ({
  kind: 'stopped-budget',
  limit: refused.limit,
  estimateCents: refused.estimateCents,
})

export async function makeStills(
  input: StillsInput,
  ports: StillsPorts,
  settings: StillsStageSettings,
): Promise<StillsOutcome> {
  const record: StillsRecord = { pictures: [], degradations: [], events: [] }
  const snapshot = () => ({
    pictures: record.pictures.map((p) => ({ ...p })),
    degradations: [...record.degradations],
    events: [...record.events],
  })
  try {
    const ended = await stage(input, ports, settings, record)
    return { ...snapshot(), ...ended }
  } catch (error) {
    return { ...snapshot(), kind: 'failed', detail: messageOf(error) }
  }
}

type Ending =
  | { kind: 'completed' }
  | { kind: 'failed'; detail: string }
  | ({ kind: 'stopped-budget' } & Pick<Refused, 'limit' | 'estimateCents'>)

async function stage(
  input: StillsInput,
  ports: StillsPorts,
  settings: StillsStageSettings,
  record: StillsRecord,
): Promise<Ending> {
  const { plan, request } = input
  const subjects = new Map(plan.subjects.map((s) => [s.id, s]))
  const shotOf = (unit: number) => {
    const shot = plan.shots.find((s) => s.unit === unit)
    if (shot === undefined) throw new Error(`the selected plan has no shot for unit ${unit}`)
    return shot
  }

  /** What a placed picture's shot asks of it: its subjects and its presence criteria (S-040). */
  const briefOf = (placement: Placement): Brief => {
    const criteria = criteriaFor(placement.shotUnit, plan, request)
    return {
      subjects: shotOf(placement.shotUnit).subjectIds.flatMap((id) => {
        const subject = subjects.get(id)
        return subject === undefined ? [] : [subject]
      }),
      mustShow: criteria.mustShow,
      mustNotShow: criteria.mustNotShow,
    }
  }

  /** The entry a placed picture is rendered from, validated before any call (D-032). */
  const entryOf = (placement: Placement, brief: Brief) =>
    pictureEntry.parse({
      role: placement.role,
      shotId: shotIdOf(placement.shotUnit),
      style: request.style,
      subjects: brief.subjects.map((s) => s.name),
      sentences: (plan.units[placement.shotUnit] ?? []).map(
        (p) => request.narration[p]?.text ?? '',
      ),
      mustShow: brief.mustShow.map((c) => ({ id: c.id, text: c.text })),
      mustNotShow: brief.mustNotShow.map((c) => ({ id: c.id, text: c.text })),
      aspectRatio: '9:16',
      ...(placement.role === 'canonical' ? { varyOn: 'framing' } : {}),
    })

  /** Replaces a picture's fields and hands the whole record to the recorder (S-046). */
  const update = async (index: number, fields: Partial<PictureRecord>) => {
    const current = record.pictures[index]
    if (current === undefined) throw new Error(`no picture ${index} was made`)
    record.pictures[index] = { ...current, ...fields }
    await ports.recorder.record(record.pictures[index])
  }

  /** One image call: the picture as made, in the list, or the guard's refusal. */
  const make = async (
    placement: Placement,
    label: string,
    framing: Framing | null,
    references: readonly PictureRef[],
    brief: Brief,
  ): Promise<Made | Refused> => {
    const pictureId = pictureIdOf(input.attempt, placement.shotUnit, label)
    const prompt = imagePrompt(entryOf(placement, brief), framing)
    const answer = await ports.image.generate({
      runId: input.runId,
      pictureId,
      prompt,
      references: references.map((r) => ({ pictureId: r.pictureId, path: r.path })),
      aspectRatio: '9:16',
    })
    if (answer.kind === 'refused') return answer
    record.pictures.push({
      pictureId,
      attempt: input.attempt,
      shotUnit: placement.shotUnit,
      subjectId: placement.subjectId,
      role: placement.role,
      label,
      path: answer.picture.path,
      prompt,
      framing,
      references: references.map((r) => r.pictureId),
      seq: input.earlierImageCalls + record.pictures.length + 1,
      gate1: null,
      measure: null,
      text: null,
      observation: null,
      reconciliation: null,
      score: null,
      gate1s: null,
      degradation: null,
      chosen: false,
    })
    return {
      index: record.pictures.length - 1,
      ref: { pictureId: answer.picture.pictureId, path: answer.picture.path },
    }
  }

  /** Gate 1 on a made picture, recording each step, and its verdict event once decided. */
  const check = async (made: Made, placement: Placement, brief: Brief) => {
    const outcome = await gate1(made.ref, brief, ports, (fields: Partial<Gate1Progress>) =>
      update(made.index, fields),
    )
    record.events.push({
      type: 'verdict',
      gate: GATE_ORDER[1],
      outcome,
      shotId: shotIdOf(placement.shotUnit),
    })
    return outcome
  }

  const placements = placePictures(plan)
  const [canonical, ...derived] = placements
  // No subject in two shots: nothing to make, and the stage is done (S-039).
  if (canonical === undefined) return { kind: 'completed' }

  // The canonical, best of two: a then b, each through Gate 1 as soon as it is made (D-030, D-042).
  const canonicalBrief = briefOf(canonical)
  const survivors: Made[] = []
  for (const label of ['a', 'b'] as const) {
    const framing = framingFor('canonical', label, settings.stills)
    const made = await make(canonical, label, framing, [], canonicalBrief)
    if ('kind' in made) return stopped(made)
    if ((await check(made, canonical, canonicalBrief)) === 'accept') survivors.push(made)
  }

  /** A survivor's score, from its verdict alone: no call (D-045). */
  const scoreOf = (made: Made) => {
    const picture = record.pictures[made.index]
    const said = picture?.reconciliation?.subjects.find((s) => s.id === canonical.subjectId)
    const entity =
      said === undefined || said.entity === null
        ? undefined
        : picture?.observation?.entities[said.entity]
    const measure = picture?.measure
    if (entity === undefined || measure === null || measure === undefined) {
      throw new Error(
        `${made.ref.pictureId} passed Gate 1 with no entity for its subject, or no measure`,
      )
    }
    return keyframeScore(entity, measure, settings.stills.scoreWeights)
  }

  // Only survivors are scored (D-042); two are ranked, one is chosen outright, none needs a ladder.
  let chosen: Made
  if (survivors.length === 2) {
    const [a, b] = survivors as [Made, Made]
    const scoreA = scoreOf(a)
    await update(a.index, { score: scoreA })
    const scoreB = scoreOf(b)
    await update(b.index, { score: scoreB })
    // Higher wins; a tie goes to a, the first made (D-031 rule 4).
    chosen = scoreB.total > scoreA.total ? b : a
  } else if (survivors.length === 1) {
    chosen = survivors[0] as Made
  } else {
    return { kind: 'failed', detail: NO_LADDER }
  }

  // Derived pictures, in rank order, each made once from the chosen canonical alone (D-026, D-038).
  const passed: Array<{ made: Made; placement: Placement }> = []
  for (const placement of derived) {
    const brief = briefOf(placement)
    const made = await make(placement, 'single', null, [chosen.ref], brief)
    if ('kind' in made) return stopped(made)
    if ((await check(made, placement, brief)) !== 'accept')
      return { kind: 'failed', detail: NO_LADDER }
    passed.push({ made, placement })
  }

  // Gate 1S, once every derived picture has been through Gate 1, in rank order (D-049, S-045).
  const canonicalShot = shotOf(canonical.shotUnit).subjectIds
  for (const { made, placement } of passed) {
    const shown = new Set(shotOf(placement.shotUnit).subjectIds)
    const shared = canonicalShot
      .filter((id) => shown.has(id))
      .map((id) => subjects.get(id)?.name ?? id)
    const verdict = await gate1s(
      { canonical: chosen.ref, derived: made.ref, shared },
      ports,
      settings.stills.suspicionThreshold,
    )
    await update(made.index, { gate1s: verdict })
    record.events.push({
      type: 'verdict',
      gate: GATE_ORDER[2],
      outcome: verdict.outcome,
      shotId: shotIdOf(placement.shotUnit),
    })
    if (verdict.outcome === 'fail') return { kind: 'failed', detail: NO_LADDER }
  }

  // Approved: the chosen canonical and every derived picture past both gates. The flags are the
  // worker's to write, with the run's ending, in one transaction (S-046).
  for (const made of [chosen, ...passed.map((p) => p.made)]) {
    const picture = record.pictures[made.index]
    if (picture !== undefined) record.pictures[made.index] = { ...picture, chosen: true }
  }
  return { kind: 'completed' }
}
