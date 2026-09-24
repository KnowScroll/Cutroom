import { z } from 'zod'
import {
  DEFAULT_PLAN_VARY_ON,
  type Gate0Verdict,
  type LanguageModelPort,
  type Plan,
  type PlanFork,
  type PlanScore,
  type PlanSettings,
} from '@cutroom/contracts'
import { Criterion, PlanVaryOn, type SubmitRequest } from '@cutroom/reel-contract'
import { estimate } from '../estimate.ts'
import { gate0 } from '../gates/index.ts'
import { askStructured } from '../gates/structured.ts'
import { plannedImageCalls, rankSubjects } from '../rank.ts'
import { plannedImageCallsFor } from '../stills/ladder.ts'
import { groupSentences } from '../split/index.ts'
import {
  SCORE_QUESTIONS,
  planningAnswer,
  planningPrompt,
  repairPrompt,
  scoreAnswer,
  scorePrompt,
  type PlanningAnswer,
} from './prompts.ts'
import { repairBasis } from './repair.ts'
import { scorePlan } from './score.ts'

// The planning stage (docs/features/reel-plan.md, Gates 2 and 3). The worker calls `planReel` and
// nothing else; this stage is the one caller of the splitter (D-073). It is handed its model port
// and never reaches for one.

/** Every planning setting's default. Each is provisional where its decision says so. */
export const DEFAULT_PLAN_SETTINGS: PlanSettings = {
  shotCountUnits: [4, 6], // D-112
  totalSecondsBounds: [35, 45], // D-111
  imageRateCents: 15, // BUDGET.md: nano-banana-pro/edit, the dearest candidate (O-4)
  videoRateCentsPerSecond: 4, // BUDGET.md: H3 Turbo 768P, until Q9 is read
  // D-006: M3 is the only model in the family that accepts images, so the three roles that read
  // one — the reconciler, the witness and the keyframe judge — are all routed to it.
  models: {
    planner: 'MiniMax-M2.7',
    reconciler: 'MiniMax-M3',
    witness: 'MiniMax-M3',
    judge: 'MiniMax-M3',
  },
  score: {
    questions: SCORE_QUESTIONS, // D-064, provisional until M-1
    weights: { coverage: 1, recurrence: 1, order: 1, pacing: 1, juxtaposition: 1 },
  },
  pictures: 'recurring', // D-027's rule; 'upToThree' only by setting (S-150)
}

const planSchema = z.strictObject({
  role: z.enum(['a', 'b', 'repair']),
  units: z.array(z.array(z.number().int().min(0))),
  shots: z.array(
    z.strictObject({
      unit: z.number().int().min(0),
      durationSeconds: z.number().int().min(0),
      subjectIds: z.array(z.string().min(1)),
    }),
  ),
  subjects: z.array(z.strictObject({ id: z.string().min(1), name: z.string().min(1) })),
  criteria: z.strictObject({ mustShow: z.array(Criterion), mustNotShow: z.array(Criterion) }),
  plannedImageCalls: z.number().int().min(0).max(4),
  estimateCents: z.number().int().min(0),
  // Present only when the plan was made under 'upToThree' (S-150), so a default plan is unchanged.
  pictures: z.literal('upToThree').optional(),
})

/**
 * Two plans of the same words and the axis they differ on. The axis is required and must be in the
 * contract's closed list: a fork without one fails here (D-062, D-078).
 */
export const planForkSchema: z.ZodType<PlanFork> = z.strictObject({
  axis: PlanVaryOn,
  a: planSchema,
  b: planSchema,
})

export interface PlanRecord {
  fork: PlanFork
  repair: Plan | null // D-113
  verdicts: { a: Gate0Verdict; b: Gate0Verdict; repair: Gate0Verdict | null }
  scores: { a: PlanScore; b: PlanScore } | null // only when both survived, D-113
}

export type PlanOutcome =
  | (PlanRecord & { kind: 'selected'; selected: 'a' | 'b' | 'repair'; estimateCents: number })
  | (PlanRecord & { kind: 'refused-budget'; estimateCents: number }) // lowest of the three
  | (PlanRecord & { kind: 'stopped-rule'; rule: 'gate-0'; detail: string })
  | { kind: 'stopped-rule'; rule: 'split'; detail: string } // too few sentences: no fork, no call, D-112

/** The plan code builds from one planning answer: the model's shots and subjects, and nothing else. */
function build(
  role: Plan['role'],
  units: number[][],
  answer: PlanningAnswer,
  request: SubmitRequest,
  settings: PlanSettings,
): Plan {
  const shots = [...answer.shots]
    .sort((x, y) => x.unit - y.unit)
    .map((shot) => ({ ...shot, subjectIds: [...shot.subjectIds] }))
  const subjects = answer.subjects.map((subject) => ({ ...subject }))
  // Under the default the count is D-027's, exactly as before. Under 'upToThree' it is the placement's
  // own, and the rule is stored WITH the plan so its pictures are made under the rule it was priced
  // and admitted under, whichever worker makes them (docs/features/three-pictures.md, S-150).
  const upToThree = settings.pictures === 'upToThree'
  const calls = upToThree
    ? plannedImageCallsFor({ shots, subjects, pictures: 'upToThree' })
    : plannedImageCalls(rankSubjects({ shots, subjects }))
  return {
    role,
    units,
    shots,
    subjects,
    // Copied by code, every supplied criterion with its id and text (D-034, D-096).
    criteria: {
      mustShow: request.criteria.mustShow.map((c) => ({ ...c })),
      mustNotShow: request.criteria.mustNotShow.map((c) => ({ ...c })),
    },
    plannedImageCalls: calls,
    estimateCents: estimate({ shots, plannedImageCalls: calls }, settings),
    ...(upToThree ? { pictures: 'upToThree' as const } : {}),
  }
}

/** Each plan's unit count and the Gate 0 conditions it failed, for a rule stop's detail. */
function failures(plans: readonly Plan[], verdicts: readonly Gate0Verdict[]): string {
  return plans
    .map((p, i) => `${p.role} (${p.units.length} units) failed ${verdicts[i]?.failed.join(', ')}`)
    .join('; ')
}

export async function planReel(
  request: SubmitRequest,
  model: LanguageModelPort,
  capCents: number,
  settings: PlanSettings,
): Promise<PlanOutcome> {
  // The pair's axis is declared, and checked against the closed list before any call (D-062).
  const axis = PlanVaryOn.parse(request.options.planVaryOn ?? DEFAULT_PLAN_VARY_ON)
  if (axis !== 'shotCount') throw new Error(`planVaryOn '${axis}' is not built (D-110)`)

  const [countA, countB] = settings.shotCountUnits
  const sentences = request.narration.length
  const unitsA = groupSentences(sentences, countA)
  const unitsB = groupSentences(sentences, countB)
  if (unitsA === null || unitsB === null) {
    // A sentence is never divided, so the narration cannot be cut into both groupings, and D-061
    // needs two plans: stopped at the plan step, before any model call (D-112).
    const missed = [unitsA === null ? countA : null, unitsB === null ? countB : null]
      .filter((count) => count !== null)
      .join(' and ')
    const detail = `${sentences} sentences cannot be cut into ${missed} units: a unit never divides a sentence (D-073, D-112)`
    return { kind: 'stopped-rule', rule: 'split', detail }
  }

  // One structured call per grouping, planner role, temperature 0 (D-061, D-062, D-035).
  const planned = async (role: 'a' | 'b', units: number[][]) => {
    const { value } = await askStructured(model, {
      prompt: planningPrompt(request, units, settings),
      schema: planningAnswer(units.length),
      role: 'planner',
      temperature: 0,
    })
    return build(role, units, value, request, settings)
  }
  const a = await planned('a', unitsA)
  const b = await planned('b', unitsB)
  const fork = planForkSchema.parse({ axis, a, b })

  const verdicts = {
    a: gate0(fork.a, request, capCents, settings),
    b: gate0(fork.b, request, capCents, settings),
    repair: null,
  }
  const survives = (v: Gate0Verdict) => v.outcome === 'accept'

  if (survives(verdicts.a) && survives(verdicts.b)) {
    // Each plan in its own call, reconciler role, temperature 0 — never two plans at once (D-064).
    const scored = async (p: Plan) => {
      const { value } = await askStructured(model, {
        prompt: scorePrompt(p, request, settings),
        schema: scoreAnswer,
        role: 'reconciler',
        temperature: 0,
      })
      return scorePlan(p, request, value.answers, settings)
    }
    const scores = { a: await scored(fork.a), b: await scored(fork.b) }
    // Higher wins; a tie goes to the 4-unit plan, planned first (D-031 rule 4's shape).
    const selected = scores.b.total > scores.a.total ? 'b' : 'a'
    const record = { fork, repair: null, verdicts, scores }
    return { ...record, kind: 'selected', selected, estimateCents: fork[selected].estimateCents }
  }

  if (survives(verdicts.a) || survives(verdicts.b)) {
    // A sole survivor is selected outright, and neither plan is scored (D-113).
    const selected = survives(verdicts.a) ? 'a' : 'b'
    const record = { fork, repair: null, verdicts, scores: null }
    return { ...record, kind: 'selected', selected, estimateCents: fork[selected].estimateCents }
  }

  // No survivor: one informed repair call, on the grouping D-114 picks, given both verdicts (D-064).
  const basis = repairBasis(fork, verdicts)
  const units = fork[basis].units.map((unit) => [...unit])
  const { value } = await askStructured(model, {
    prompt: repairPrompt(request, fork, verdicts, basis, settings),
    schema: planningAnswer(units.length),
    role: 'planner',
    temperature: 0,
  })
  const repair = planSchema.parse(build('repair', units, value, request, settings))
  const repaired = { ...verdicts, repair: gate0(repair, request, capCents, settings) }
  const record = { fork, repair, verdicts: repaired, scores: null }

  // Recorded as a third plan, and selected if it survives (D-113).
  if (survives(repaired.repair)) {
    return { ...record, kind: 'selected', selected: 'repair', estimateCents: repair.estimateCents }
  }

  const plans = [fork.a, fork.b, repair]
  const all = [repaired.a, repaired.b, repaired.repair]
  if (all.every((v) => v.failed.includes('cost'))) {
    // Every plan over the per-reel cap: refused for budget, with the lowest of the three estimates.
    const estimateCents = Math.min(...plans.map((p) => p.estimateCents))
    return { ...record, kind: 'refused-budget', estimateCents }
  }
  const detail = `no plan passed Gate 0, and neither did the repair: ${failures(plans, all)}`
  return { ...record, kind: 'stopped-rule', rule: 'gate-0', detail }
}
