import { z } from 'zod'
import type { Gate0Condition, Gate0Verdict, Plan, PlanFork, PlanSettings } from '@cutroom/contracts'
import type { Criterion, SubmitRequest } from '@cutroom/reel-contract'
import { SHOT_COUNT, SHOT_SECONDS } from '../gates/gate0.ts'

// The model calls the planning stage makes, each as the prompt it sends and the schema its answer
// must parse under (docs/features/reel-plan.md, Gate 2 "The two plans" and "The plan score"). Every
// prompt is built from its inputs alone — no time, no randomness — so the same inputs ask the same
// thing, which is what lets a call at temperature 0 replay (D-062, D-064).

// ---------------------------------------------------------------- planning

/**
 * What the planning call answers — only what the planning layer authors here (D-029 part 1, D-035):
 * for each unit one shot, with its seconds and the subjects it shows, and the subjects named once.
 * Ranking, image calls, the estimate and the criteria are computed by code afterwards (D-034), so
 * no field for any of them exists, and every object is strict, so an answer carrying one is refused.
 */
export function planningAnswer(units: number) {
  return z
    .strictObject({
      shots: z.array(
        z.strictObject({
          unit: z.number().int().min(0),
          durationSeconds: z.number().int().min(0),
          subjectIds: z.array(z.string().min(1)),
        }),
      ),
      subjects: z.array(z.strictObject({ id: z.string().min(1), name: z.string().min(1) })),
    })
    .superRefine((answer, ctx) => {
      // One narration unit is one shot (D-070): D-057's guard, in the schema.
      const shots = Array.from({ length: units }, () => 0)
      answer.shots.forEach((shot, i) => {
        if (shot.unit < units) shots[shot.unit] = (shots[shot.unit] ?? 0) + 1
        else {
          ctx.addIssue({
            code: 'custom',
            path: ['shots', i, 'unit'],
            message: `unit ${shot.unit} does not exist: there are ${units} units, numbered from 0`,
          })
        }
      })
      shots.forEach((count, unit) => {
        if (count !== 1) {
          ctx.addIssue({
            code: 'custom',
            path: ['shots'],
            message: `unit ${unit} has ${count} shots; one narration unit is one shot (D-070)`,
          })
        }
      })

      // Subjects are named once, and a shot shows only subjects the plan names (D-029 part 1).
      const named = new Set<string>()
      answer.subjects.forEach((subject, i) => {
        if (named.has(subject.id)) {
          ctx.addIssue({
            code: 'custom',
            path: ['subjects', i, 'id'],
            message: `subject "${subject.id}" is named twice`,
          })
        }
        named.add(subject.id)
      })
      answer.shots.forEach((shot, i) => {
        for (const id of shot.subjectIds) {
          if (!named.has(id)) {
            ctx.addIssue({
              code: 'custom',
              path: ['shots', i, 'subjectIds'],
              message: `shot for unit ${shot.unit} shows subject "${id}", which is not named`,
            })
          }
        }
      })
    })
}

export type PlanningAnswer = z.infer<ReturnType<typeof planningAnswer>>

const quoted = (text: string) => JSON.stringify(text)

function criteriaLines(list: Criterion[]): string {
  return list.length === 0 ? '- (none)' : list.map((c) => `- ${c.id}: ${c.text}`).join('\n')
}

/** Each unit's claim ids with their roles, then its sentences. */
function unitLines(request: SubmitRequest, units: readonly (readonly number[])[]): string[] {
  const roles = new Map(request.claims.map((c) => [c.id, c.role]))
  return units.map((positions, unit) => {
    const claims = [...new Set(positions.flatMap((p) => request.narration[p]?.claimIds ?? []))].map(
      (id) => `${id} (${roles.get(id) ?? 'unlisted'})`,
    )
    const sentences = positions.map((p) => `  ${quoted(request.narration[p]?.text ?? '')}`)
    return [`Unit ${unit} — claims: ${claims.join(', ') || 'none'}`, ...sentences].join('\n')
  })
}

/** How a shot is asked for, what the reel's shape must be, the units, and the criteria. */
function planningBody(
  request: SubmitRequest,
  units: readonly (readonly number[])[],
  settings: PlanSettings,
): string[] {
  const [low, high] = settings.totalSecondsBounds
  return [
    'For each unit, give one shot: the unit number, how many whole seconds the shot lasts, and the ids of the subjects it shows. Name every subject once, with an id and a name; a subject shown in several shots is named once and referred to by its id each time.',
    '',
    `Each shot lasts ${SHOT_SECONDS[0]} to ${SHOT_SECONDS[1]} seconds. All the shots together last ${low} to ${high} seconds. A reel has ${SHOT_COUNT[0]} to ${SHOT_COUNT[1]} shots.`,
    '',
    'Units:',
    ...unitLines(request, units),
    '',
    'What the pictures must show:',
    criteriaLines(request.criteria.mustShow),
    '',
    'What the pictures must never show:',
    criteriaLines(request.criteria.mustNotShow),
    '',
    'Answer only with the JSON object the schema describes.',
  ]
}

/**
 * The planning prompt for one grouping (D-061, D-062): the sentences of each unit, the claim ids on
 * each unit with their roles, and the criteria.
 */
export function planningPrompt(
  request: SubmitRequest,
  units: readonly (readonly number[])[],
  settings: PlanSettings,
): string {
  return [
    `Plan the shots of one short vertical reel. Its narration is already written, and cut into ${units.length} units below. Each unit becomes exactly one shot.`,
    '',
    ...planningBody(request, units, settings),
  ].join('\n')
}

// ---------------------------------------------------------------- the repair

/** What each of Gate 0's conditions asks, in the words a repair call is given. */
const CONDITION_WORDS: Record<Gate0Condition, string> = {
  coverage: 'every claim must be spoken in some shot',
  criteria: 'the plan must carry every criterion',
  shape:
    'the number of shots, the seconds of each, or the seconds of all of them were out of bounds',
  cost: 'what the reel would cost to make as planned was over the per-reel cap; fewer seconds, or fewer subjects shown in two or more shots, cost less',
}

/**
 * The one repair prompt (D-064, D-114): the grouping code picked, both plans' Gate 0 verdicts —
 * each named against its own plan — and the shots of the plan whose grouping the repair keeps.
 */
export function repairPrompt(
  request: SubmitRequest,
  fork: Pick<PlanFork, 'a' | 'b'>,
  verdicts: { a: Gate0Verdict; b: Gate0Verdict },
  basis: 'a' | 'b',
  settings: PlanSettings,
): string {
  const kept = fork[basis]
  const verdictLine = (role: 'a' | 'b') => {
    const failed = verdicts[role].failed
    return `- The plan in ${fork[role].units.length} units failed: ${failed.join(', ')}.`
  }
  const conditions = [...new Set([...verdicts.a.failed, ...verdicts.b.failed])]
  const names = new Map(kept.subjects.map((s) => [s.id, s.name]))
  const shots = kept.shots.map((shot) => {
    const shown = shot.subjectIds.map((id) => names.get(id)).filter((n) => n !== undefined)
    return `- Unit ${shot.unit}: ${shot.durationSeconds} seconds, showing ${shown.join(', ') || 'nothing named'}`
  })
  return [
    `Two plans of this reel's shots were made, and neither passed the counting check.`,
    ...(['a', 'b'] as const).map(verdictLine),
    '',
    'What those conditions ask:',
    ...conditions.map((c) => `- ${c}: ${CONDITION_WORDS[c]}`),
    '',
    `Repair the plan that came closer to passing. Its narration is cut into the same ${kept.units.length} units as before, and each unit becomes exactly one shot. Its shots were:`,
    ...shots,
    '',
    ...planningBody(request, kept.units, settings),
  ].join('\n')
}

// ---------------------------------------------------------------- the plan score

/**
 * Gate 7's topics, as closed questions (D-064). Defaults of a setting, provisional until M-1.
 *
 * THREE, NOT FOUR (docs/features/cut-rules.md, S-158). The fourth asked whether every shot showed
 * something no other shot had shown, and it marked down every plan whose subject recurs — measured
 * (S-148, S-149) — while a reel that shows how a thing works shows that thing again and again. The
 * owner removed it here and from Gate 7.
 */
export const SCORE_QUESTIONS = [
  'Does the order of the shots let each one build on the one before it?',
  'Does each shot last long enough for its narration, without lingering after it?',
  'Does each cut put two pictures side by side in a way that adds to what is said?',
] as const

const yesNo = z.enum(['yes', 'no'])

/** Three answers for one plan, in the order the questions are asked. */
export const scoreAnswer = z.strictObject({ answers: z.tuple([yesNo, yesNo, yesNo]) })

/** The score prompt for ONE plan — never two in one request (D-064). */
export function scorePrompt(plan: Plan, request: SubmitRequest, settings: PlanSettings): string {
  const names = new Map(plan.subjects.map((s) => [s.id, s.name]))
  const shots = plan.shots.map((shot, i) => {
    const shown = shot.subjectIds.map((id) => names.get(id)).filter((n) => n !== undefined)
    const sentences = (plan.units[shot.unit] ?? []).map(
      (p) => `  ${quoted(request.narration[p]?.text ?? '')}`,
    )
    return [
      `Shot ${i + 1} — ${shot.durationSeconds} seconds — shows: ${shown.join(', ') || 'nothing named'}`,
      ...sentences,
    ].join('\n')
  })
  return [
    'Here is the plan of one short vertical reel: its narration, cut into shots, and what each shot shows.',
    'Answer each question about this plan with yes or no, in order.',
    '',
    ...shots,
    '',
    'Questions:',
    ...settings.score.questions.map((q, i) => `${i + 1}. ${q}`),
    '',
    'Answer only with the JSON object the schema describes.',
  ].join('\n')
}
