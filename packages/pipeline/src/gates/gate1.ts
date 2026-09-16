import type {
  LanguageModelPort,
  PictureMeasure,
  PictureRecord,
  PictureRef,
  PictureSensorPort,
  PlanSubject,
  Reconciliation,
  WitnessObservation,
} from '@cutroom/contracts'
import type { Criterion } from '@cutroom/reel-contract'
import { witnessObservation } from '../stills/observation.ts'
import { reconcileAnswer, reconcilePrompt, type ReconcileAnswer } from '../stills/prompts.ts'

// Gate 1 (docs/features/reel-stills.md, Gate 2 "Gate 1 — four steps on each picture"; D-042, I-7,
// S-031, S-040, S-041, S-042). Four steps on one picture, in order, deterministic steps first. A
// picture failing technical stops there; any other failure does not stop the gate. The verdict has
// no outcome until it is decided, so a picture whose steps were cut off keeps the steps it completed
// and no outcome (S-046).

type Gate1 = NonNullable<PictureRecord['gate1']>
type Step = Gate1['steps'][number]

/** What the picture's shot asks of it: every subject the shot shows, and its presence criteria. */
export interface Brief {
  subjects: readonly PlanSubject[]
  mustShow: readonly Criterion[]
  mustNotShow: readonly Criterion[]
}

/** The fields of a picture's record Gate 1 fills, as each step completes. */
export type Gate1Progress = Pick<
  PictureRecord,
  'gate1' | 'measure' | 'text' | 'observation' | 'reconciliation'
>

/** Why a measured file is not a readable 9:16 image (D-028's dimension assertion), or nothing. */
function technicalReasons(measure: PictureMeasure): string[] {
  if (!measure.readable) return ['the file is not a readable image']
  if (!(measure.width > 0 && measure.width * 16 === measure.height * 9)) {
    return [`the picture is ${measure.width}x${measure.height}, not 9:16`]
  }
  return []
}

/**
 * The five conditions on which code fails a picture at reconcile (S-040): a subject the shot shows
 * is not shown; a shown subject's entity is clipped by the edge (D-044, D-046); a shown subject's
 * count does not match (D-046); a `mustShow` is not shown; a `mustNotShow` is shown. The reconciler
 * judges; this decides.
 */
export function reconcileFailures(
  answer: ReconcileAnswer,
  observation: WitnessObservation,
  brief: Brief,
): string[] {
  const failed: string[] = []
  for (const subject of brief.subjects) {
    const said = answer.subjects.find((s) => s.id === subject.id)
    const named = `subject "${subject.id}" (${subject.name})`
    if (said === undefined || said.entity === null) {
      failed.push(`${named} is not shown`)
      continue
    }
    if (observation.entities[said.entity]?.clippedByEdge === true) {
      failed.push(`${named} is clipped by the edge of the frame`)
    }
    if (!said.countMatches) failed.push(`${named}: the count seen does not match its name`)
  }
  for (const criterion of brief.mustShow) {
    if (answer.criteria.find((c) => c.id === criterion.id)?.shown !== true) {
      failed.push(`must show "${criterion.id}" is not shown: ${criterion.text}`)
    }
  }
  for (const criterion of brief.mustNotShow) {
    if (answer.criteria.find((c) => c.id === criterion.id)?.shown !== false) {
      failed.push(`must never show "${criterion.id}" is shown: ${criterion.text}`)
    }
  }
  return failed
}

/**
 * Runs Gate 1 on one picture and returns its decided outcome. `progress` is handed the picture's
 * Gate 1 fields after every step, so what a step found is durable before the next step starts.
 * A thrown port call, or an answer that does not parse, rejects: the stage turns it into a failed
 * run, and the steps completed before it are already recorded (S-042, S-046).
 */
export async function gate1(
  picture: PictureRef,
  brief: Brief,
  ports: { sensors: PictureSensorPort; model: LanguageModelPort },
  progress: (fields: Partial<Gate1Progress>) => Promise<void>,
): Promise<'accept' | 'fail'> {
  // The picture as the port made it, and nothing more: an id and a path (I-8).
  const ref: PictureRef = { pictureId: picture.pictureId, path: picture.path }
  const steps: Step[] = []
  const verdict = (outcome: Gate1['outcome']): Gate1 => ({
    outcome,
    coverage: 'whole picture',
    steps: [...steps],
  })

  // 1. technical — the file, measured (I-17). A failure stops the gate (S-031).
  const measure = await ports.sensors.measure(ref)
  const technical = technicalReasons(measure)
  if (technical.length > 0) {
    steps.push({ step: 'technical', outcome: 'fail', reasons: technical })
    await progress({ measure, gate1: verdict('fail') })
    return 'fail'
  }
  steps.push({ step: 'technical', outcome: 'accept', reasons: [] })
  await progress({ measure, gate1: verdict(null) })

  // 2. text — the words read, recorded; never a failure (S-041).
  const text = await ports.sensors.readText(ref)
  steps.push({ step: 'text', outcome: 'accept', reasons: [] })
  await progress({ text: [...text], gate1: verdict(null) })

  // 3. witness — the picture and a temperature, nothing else (I-8), parsed at the gate (D-041).
  const observed = await ports.model.observe({ picture: ref, temperature: 0 })
  const parsed = witnessObservation.safeParse(observed.value)
  if (!parsed.success) {
    throw new Error(
      `the witness's answer for ${ref.pictureId} is not an observation: ${parsed.error.issues
        .map((i) => `${i.path.join('.') || '(answer)'}: ${i.message}`)
        .join('; ')}`,
    )
  }
  const observation = parsed.data
  steps.push({ step: 'witness', outcome: 'accept', reasons: [] })
  await progress({ observation, gate1: verdict(null) })

  // 4. reconcile — the observation held against the brief, presence criteria only (D-043).
  const criteria = { mustShow: brief.mustShow, mustNotShow: brief.mustNotShow }
  const { value: answer } = await ports.model.structured({
    prompt: reconcilePrompt(observation, brief.subjects, criteria),
    schema: reconcileAnswer(
      brief.subjects.map((s) => s.id),
      [...brief.mustShow, ...brief.mustNotShow].map((c) => c.id),
      observation.entities.length,
    ),
    role: 'reconciler',
    temperature: 0,
    pictureIds: [ref.pictureId],
  })
  const failed = reconcileFailures(answer, observation, brief)
  steps.push({
    step: 'reconcile',
    outcome: failed.length === 0 ? 'accept' : 'fail',
    reasons: failed,
  })
  const reconciliation: Reconciliation = {
    subjects: answer.subjects,
    criteria: answer.criteria,
    failed,
  }
  // Decided now, all four steps completed: accept only if every one of them accepted (D-042).
  const outcome = steps.every((s) => s.outcome === 'accept') ? 'accept' : 'fail'
  await progress({ reconciliation, gate1: verdict(outcome) })
  return outcome
}
