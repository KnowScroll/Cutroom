import { failureKindOf } from '@cutroom/contracts'
import type {
  FailureKind,
  Framing,
  ImageAnswer,
  ImagePort,
  LanguageModelPort,
  PictureRecord,
  PictureRef,
  PictureSensorPort,
  Plan,
  PlanSettings,
  RefusalRecorder,
  StillsRecorder,
  StillsSettings,
} from '@cutroom/contracts'
import type { RunEvent, SubmitRequest } from '@cutroom/reel-contract'
import { GATE_ORDER } from '../gates/index.ts'
import { gate1, type Brief, type Gate1Progress } from '../gates/gate1.ts'
import { gate1s } from '../gates/gate1s.ts'
import { criteriaFor } from './criteria.ts'
import { IMAGE_CALLS, REPAIRS_PER_SHOT, placementCalls, repairLabel, reserveOf } from './ladder.ts'
import { pictureIdOf, placePictures, shotIdOf, type Placement } from './place.ts'
import { framingFor, imagePrompt, pictureEntry, repairPrompt, type Consumed } from './prompts.ts'
import { DEFAULT_SCORE_WEIGHTS, keyframeScore } from './score.ts'

// The stills stage (docs/features/reel-stills.md, Gates 2 and 3; S-039 to S-046). The worker calls
// `makeStills` with the selected plan and the ports it built, and it answers with how the stage
// ended and everything it made. It never rejects: a thrown call, a refused parse or a bug becomes a
// failed outcome, with every picture made before it in the record (S-046).
//
// The stage runs in the ladders' order (Gate 2, "The ladders and the reserve"), so the canonical's
// repair always has first claim on the reserve (D-048): the canonical, and its repair if neither
// candidate survives; then each derived picture in rank order, through Gate 1 and its repair; then
// Gate 1S on each, in rank order, with its repairs. At each step ONE SHOT'S LADDER IS FINISHED
// BEFORE THE NEXT SHOT'S BEGINS (S-057).

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
    // The kind of the failure, decided where the error was caught, from its class (S-163).
    | { kind: 'failed'; detail: string; failure: FailureKind }
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
  /** Where every answer a gate refuses is handed, to be kept (docs/features/ask-again.md, S-156). */
  refusals: RefusalRecorder
}

export interface StillsStageSettings {
  plan: PlanSettings
  stills: StillsSettings
}

/** A made picture: its place in this attempt's list, and the file the port wrote. */
interface Made {
  index: number
  ref: PictureRef
}

type Refused = Extract<ImageAnswer, { kind: 'refused' }>

const messageOf = (error: unknown) => (error instanceof Error ? error.message : String(error))

/**
 * A call the worker's guard refused (S-035): the call was not made, and the stage stops with the
 * guard's figures. The ceiling, the cap and the spend are the worker's to add.
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
    return {
      ...snapshot(),
      kind: 'failed',
      detail: messageOf(error),
      failure: failureKindOf(error),
    }
  }
}

type Ending =
  | { kind: 'completed' }
  | { kind: 'stopped-rule'; rule: 'gate-1'; detail: string }
  | { kind: 'failed'; detail: string; failure: FailureKind }
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

  /**
   * One image call: the picture as made, in the list, or the guard's refusal. A repair is handed the
   * verdicts it consumes, and its prompt carries their reasons.
   */
  const make = async (
    placement: Placement,
    label: string,
    framing: Framing | null,
    references: readonly PictureRef[],
    brief: Brief,
    consumed: readonly Consumed[] = [],
  ): Promise<Made | Refused> => {
    const pictureId = pictureIdOf(input.attempt, placement.shotUnit, label)
    const entry = entryOf(placement, brief)
    const prompt =
      consumed.length === 0 ? imagePrompt(entry, framing) : repairPrompt(entry, framing, consumed)
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

  /** The failed steps of a picture's decided Gate 1 verdict, as a repair consumes them. */
  const gate1Failure = (made: Made): Consumed => ({
    gate: '1',
    reasons: (record.pictures[made.index]?.gate1?.steps ?? [])
      .filter((s) => s.outcome === 'fail')
      .flatMap((s) => s.reasons),
  })

  /** Why a picture failed Gate 1, naming it, each failed step and that step's reasons. */
  const gate1Why = (made: Made) => {
    const failed = (record.pictures[made.index]?.gate1?.steps ?? []).filter(
      (s) => s.outcome === 'fail',
    )
    return `${made.ref.pictureId} failed Gate 1 at ${failed
      .map((s) => `${s.step}: ${s.reasons.join('; ')}`)
      .join(', and at ')}`
  }

  /**
   * A shot that goes on without an approved picture (S-043, D-050 step 3). The stage records the
   * degradation, the reason on the shot's last failing picture and a `degraded` event where the
   * checks reached it; the worker writes all four labels with the run's ending (I-4, S-058).
   */
  const degrade = (placement: Placement, gate: '1' | '1S', last: Made, reason: string) => {
    const shotId = shotIdOf(placement.shotUnit)
    record.degradations.push({ shotId, gate, reason })
    const picture = record.pictures[last.index]
    if (picture !== undefined) record.pictures[last.index] = { ...picture, degradation: reason }
    record.events.push({ type: 'degraded', shotId, reason })
  }

  // Placed by the PLAN'S rule (S-150), and split by ROLE, never by position: a lone standalone is no
  // canonical, and a standalone after a canonical is no derived picture (three-pictures, Gate 2).
  const placements = placePictures(plan)
  const canonical = placements.find((p) => p.role === 'canonical')
  const derived = placements.filter((p) => p.role === 'derived')
  const standalone = placements.filter((p) => p.role === 'standalone')
  // Nothing placed: nothing to make, and the stage is done (S-039).
  if (placements.length === 0) return { kind: 'completed' }

  // The reserve: six less the run's earlier image calls, less the placement's calls, fixed now
  // (S-043, S-048). Every repair takes one slot, any free one. Below 0 — an attempt run again after
  // its worker died, which cannot make its pictures within six calls — is a fault, decided here,
  // before any call (S-061).
  let slots = reserveOf(placements, input.earlierImageCalls)
  if (slots < 0) {
    const calls = placementCalls(placements)
    // Reachable only on a job run again after a crash, so its run's kind is `crashed` (S-163).
    return {
      kind: 'failed',
      failure: 'crashed',
      detail: `attempt ${input.attempt} cannot make its pictures within ${IMAGE_CALLS} image calls: the run made ${input.earlierImageCalls} before it and its placement makes ${calls}, ${input.earlierImageCalls + calls} in all (S-048)`,
    }
  }

  const approved: Made[] = []
  // The recurring subjects, exactly as before S-150 — and only when a canonical is placed.
  if (canonical !== undefined) {
    // The canonical, best of two: a then b, each through Gate 1 as soon as it is made (D-030, D-042).
    const canonicalBrief = briefOf(canonical)
    const candidates: Made[] = []
    const survivors: Made[] = []
    for (const label of ['a', 'b'] as const) {
      const framing = framingFor('canonical', label, settings.stills)
      const made = await make(canonical, label, framing, [], canonicalBrief)
      if ('kind' in made) return stopped(made)
      candidates.push(made)
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

    // Only survivors are scored (D-042); two are ranked, one is chosen outright.
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
      // No survivor: ONE repair, told both candidates' reasons, with candidate a's framing and no
      // reference (D-047). It runs before anything else takes a slot, so it has first claim (D-048). A
      // first attempt's reserve is at least two, so it always finds one; an attempt run again whose
      // earlier calls left none fails before the call — a fault of the crash, not rule gate-1, which
      // is for a repair that was made and failed (S-048, S-061).
      if (slots <= 0) {
        const why = candidates.map(gate1Why).join('. ')
        return {
          kind: 'failed',
          failure: 'crashed',
          detail: `attempt ${input.attempt} cannot repair the canonical picture of ${shotIdOf(canonical.shotUnit)}: no reserve slot is free, the run having made ${input.earlierImageCalls} image calls before it and its placement making ${placementCalls(placements)} of the ${IMAGE_CALLS} (S-048). ${why}`,
        }
      }
      slots -= 1
      const framing = framingFor('canonical', 'a', settings.stills)
      const repair = await make(
        canonical,
        'repair',
        framing,
        [],
        canonicalBrief,
        candidates.map(gate1Failure),
      )
      if ('kind' in repair) return stopped(repair)
      if ((await check(repair, canonical, canonicalBrief)) !== 'accept') {
        // Three failures on one entry: the run stops for the rule, before any derived picture is
        // attempted (I-10), and no plan is made again (D-065).
        const why = [...candidates, repair].map(gate1Why).join('. ')
        return {
          kind: 'stopped-rule',
          rule: 'gate-1',
          detail: `the canonical picture of ${shotIdOf(canonical.shotUnit)} failed Gate 1 three times (D-047): ${why}`,
        }
      }
      // A sole survivor: the canonical outright, with no score (D-047 step 2).
      chosen = repair
    }

    // Derived pictures, in rank order, each made once from the chosen canonical alone (D-026, D-038).
    // One failing Gate 1 takes one repair, at once, if a slot is free (S-043, S-057).
    interface Passed {
      placement: Placement
      brief: Brief
      made: Made
      repairs: number
    }
    const passed: Passed[] = []
    for (const placement of derived) {
      const brief = briefOf(placement)
      const made = await make(placement, 'single', null, [chosen.ref], brief)
      if ('kind' in made) return stopped(made)
      if ((await check(made, placement, brief)) === 'accept') {
        passed.push({ placement, brief, made, repairs: 0 })
        continue
      }
      if (slots <= 0) {
        degrade(placement, '1', made, `${gate1Why(made)}; no reserve slot is free (S-043)`)
        continue
      }
      slots -= 1
      const repair = await make(placement, repairLabel(1), null, [chosen.ref], brief, [
        gate1Failure(made),
      ])
      if ('kind' in repair) return stopped(repair)
      if ((await check(repair, placement, brief)) !== 'accept') {
        degrade(placement, '1', repair, `${gate1Why(repair)}; it was the shot's repair (S-043)`)
        continue
      }
      passed.push({ placement, brief, made: repair, repairs: 1 })
    }

    // Gate 1S, once every derived picture has been through Gate 1, in rank order (D-049, S-045). One
    // failing takes a repair if a slot is free and its shot has had fewer than two; the repair goes
    // through Gate 1, then Gate 1S — all before the next shot's Gate 1S (D-050, S-043, S-057).
    const canonicalShot = shotOf(canonical.shotUnit).subjectIds
    approved.push(chosen)
    for (const shot of passed) {
      const { placement, brief } = shot
      const shown = new Set(shotOf(placement.shotUnit).subjectIds)
      const shared = canonicalShot
        .filter((id) => shown.has(id))
        .map((id) => subjects.get(id)?.name ?? id)
      let { made, repairs } = shot
      for (;;) {
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
        if (verdict.outcome === 'accept') {
          approved.push(made)
          break
        }
        const why = `${made.ref.pictureId} failed Gate 1S: the judge did not see the same ${verdict.reasons.join(' or ')} as in the canonical`
        if (repairs >= REPAIRS_PER_SHOT) {
          degrade(placement, '1S', made, `${why}; the shot has had ${repairs} repairs (D-014)`)
          break
        }
        if (slots <= 0) {
          degrade(placement, '1S', made, `${why}; no reserve slot is free (D-050)`)
          break
        }
        slots -= 1
        repairs += 1
        const repair = await make(placement, repairLabel(repairs), null, [chosen.ref], brief, [
          { gate: '1S', reasons: verdict.reasons },
        ])
        if ('kind' in repair) return stopped(repair)
        if ((await check(repair, placement, brief)) !== 'accept') {
          degrade(placement, '1', repair, `${gate1Why(repair)}; it was the shot's repair (S-043)`)
          break
        }
        made = repair
      }
    }
  }

  // Standalone pictures, in shot order, after the recurring subjects have had the reserve (D-048;
  // three-pictures, S-150). Each is made once, from scratch — no reference, no framing — through
  // Gate 1; one failing takes one repair from the reserve, told Gate 1's reasons (S-043, D-043), and
  // failing again, or with no slot free, its shot goes on made from words (S-058). A standalone never
  // stops the run (D-047 is the canonical's), and has no Gate 1S: it shares no subject with any picture.
  for (const placement of standalone) {
    const brief = briefOf(placement)
    const made = await make(placement, 'single', null, [], brief)
    if ('kind' in made) return stopped(made)
    if ((await check(made, placement, brief)) === 'accept') {
      approved.push(made)
      continue
    }
    if (slots <= 0) {
      degrade(placement, '1', made, `${gate1Why(made)}; no reserve slot is free (S-043)`)
      continue
    }
    slots -= 1
    const repair = await make(placement, repairLabel(1), null, [], brief, [gate1Failure(made)])
    if ('kind' in repair) return stopped(repair)
    if ((await check(repair, placement, brief)) !== 'accept') {
      degrade(placement, '1', repair, `${gate1Why(repair)}; it was the shot's repair (S-043)`)
      continue
    }
    approved.push(repair)
  }

  // Approved: the chosen canonical, every derived picture past both gates, and every standalone
  // past Gate 1. The flags are the
  // worker's to write, with the run's ending, in one transaction (S-046).
  for (const made of approved) {
    const picture = record.pictures[made.index]
    if (picture !== undefined) record.pictures[made.index] = { ...picture, chosen: true }
  }
  return { kind: 'completed' }
}
