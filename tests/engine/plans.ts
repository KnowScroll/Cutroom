import type { Plan } from '@cutroom/contracts'
import { DEFAULT_PLAN_SETTINGS } from '@cutroom/pipeline'
import { fakeModel, type FakeScript } from '@cutroom/providers'
import type { SubmitRequest } from '@cutroom/reel-contract'

// Requests, stand-in scripts and plans for reel-plan's planning checks (docs/features/reel-plan.md,
// Slices 3 and 4). Every builder returns a fresh value, so no test can change another's fixture.

/**
 * Eight sentences, so both groupings exist: 4 units of two sentences each, and 6 units whose first
 * two hold two sentences. Four claims, one referenced from two sentences in different units, and
 * two sentences that reference none.
 */
export function planRequest(requestId: string): SubmitRequest {
  return {
    contractVersion: 1,
    requestId,
    worldId: 'world-1',
    narration: [
      { text: 'In 1215 a charter was sealed at Runnymede.', claimIds: ['c1'] },
      { text: 'It bound a king to the law of the land.', claimIds: ['c1'] },
      { text: 'The barons who forced it were not democrats.', claimIds: ['c2'] },
      { text: 'They wanted their own privileges back.', claimIds: [] },
      { text: 'Within weeks the pope annulled it.', claimIds: ['c3'] },
      { text: 'Yet it was reissued three times.', claimIds: ['c2'] },
      { text: 'Each reissue shortened it.', claimIds: [] },
      { text: 'Three of its clauses are still law in England today.', claimIds: ['c4'] },
    ],
    claims: [
      { id: 'c1', role: 'main' },
      { id: 'c2', role: 'supporting' },
      { id: 'c3', role: 'supporting' },
      { id: 'c4', role: 'main' },
    ],
    criteria: {
      mustShow: [
        { id: 'm1', text: 'a wax seal on parchment', type: 'presence', claimId: 'c1' },
        { id: 'm2', text: 'a meadow beside a river', type: 'presence' },
      ],
      mustNotShow: [
        { id: 'n1', text: 'any real living person', type: 'presence' },
        { id: 'n2', text: 'a modern flag', type: 'presence', claimId: 'c4' },
      ],
      depictionPolicyVersion: 'policy-3',
    },
    style: { id: 'style-1', version: 2, text: 'quiet, precise, natural light' },
    options: { until: 'plan', budgetCents: 300 },
  }
}

export type Subject = { id: string; name: string }

/** A planning answer: one shot per unit, in unit order, with these durations and subjects. */
export function answer(durations: number[], subjects: Subject[], shown: string[][]) {
  return {
    shots: durations.map((durationSeconds, unit) => ({
      unit,
      durationSeconds,
      subjectIds: shown[unit] ?? [],
    })),
    subjects,
  }
}

/** A planning answer for `units` units totalling about 40 seconds, one subject in every shot. */
export function evenAnswer(units: number, total = 40) {
  const base = Math.floor(total / units)
  const durations = Array.from({ length: units }, (_, i) => base + (i < total % units ? 1 : 0))
  return answer(
    durations,
    [{ id: 'river', name: 'the river' }],
    durations.map(() => ['river']),
  )
}

/** The 4-unit plan: 40 s; the charter in three shots, the meadow in two, a king in one. */
export const answerA = () =>
  answer(
    [10, 10, 10, 10],
    [
      { id: 'charter', name: 'the charter' },
      { id: 'meadow', name: 'Runnymede meadow' },
      { id: 'king', name: 'a king' },
    ],
    [['charter', 'meadow'], ['charter', 'king'], ['meadow'], ['charter']],
  )

/** The 6-unit plan: 40 s; a wax seal and a stone hall in three shots each, the seal first. */
export const answerB = () =>
  answer(
    [7, 7, 7, 7, 6, 6],
    [
      { id: 'seal', name: 'a wax seal' },
      { id: 'hall', name: 'a stone hall' },
    ],
    [['seal'], ['seal', 'hall'], ['hall'], [], ['seal'], ['hall']],
  )

export type YesNo = 'yes' | 'no'
/** A score answer: three yes/no, in the order the questions are asked (cut-rules, S-158). */
export const answers = (...three: [YesNo, YesNo, YesNo]) => ({ answers: three })

/**
 * Both plans pass Gate 0 at the default rates (each 3 image calls and 40 s: 205 cents). The 6-unit
 * plan answers every question yes and the 4-unit plan one no, so the 6-unit plan scores higher.
 */
export function twoSurvivors(): FakeScript {
  return {
    planner: [{ value: answerA() }, { value: answerB() }],
    reconciler: [{ value: answers('yes', 'yes', 'no') }, { value: answers('yes', 'yes', 'yes') }],
  }
}

/** The 6-unit plan totals 50 seconds and fails Gate 0 on shape; the 4-unit plan survives alone. */
export function oneSurvivor(): FakeScript {
  return {
    planner: [{ value: answerA() }, { value: answer([9, 9, 8, 8, 8, 8], [], []) }],
    reconciler: [],
  }
}

/** A planning answer that names no subject: these durations, one shot per unit, nothing shown. */
export const bare = (...durations: number[]) => answer(durations, [], [])

/**
 * `planRequest` cut to its first `n` sentences, keeping only the claims those sentences reference
 * and the criteria whose claim is kept — so the contract still accepts it.
 */
export function shortRequest(requestId: string, n: number): SubmitRequest {
  const request = planRequest(requestId)
  const narration = request.narration.slice(0, n)
  const referenced = new Set(narration.flatMap((s) => s.claimIds))
  const kept = (c: { claimId?: string }) => c.claimId === undefined || referenced.has(c.claimId)
  return {
    ...request,
    narration,
    claims: request.claims.filter((c) => referenced.has(c.id)),
    criteria: {
      ...request.criteria,
      mustShow: request.criteria.mustShow.filter(kept),
      mustNotShow: request.criteria.mustNotShow.filter(kept),
    },
  }
}

export const models = DEFAULT_PLAN_SETTINGS.models

export const standIn = (script: FakeScript) => fakeModel(script, { models })

export const range = (from: number, to: number) =>
  Array.from({ length: Math.max(0, to - from + 1) }, (_, i) => from + i)

/**
 * A plan Gate 0 accepts for `planRequest`: 4 units of two sentences, 4 shots of 10 s, every
 * criterion copied, 205 cents. Each Gate 0 test changes one thing about it.
 */
export function passingPlan(request: SubmitRequest): Plan {
  return {
    role: 'a',
    units: [
      [0, 1],
      [2, 3],
      [4, 5],
      [6, 7],
    ],
    shots: [0, 1, 2, 3].map((unit) => ({ unit, durationSeconds: 10, subjectIds: [] })),
    subjects: [],
    criteria: {
      mustShow: request.criteria.mustShow.map((c) => ({ ...c })),
      mustNotShow: request.criteria.mustNotShow.map((c) => ({ ...c })),
    },
    plannedImageCalls: 3,
    estimateCents: 205,
  }
}
