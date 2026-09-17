import type {
  ClipObservation,
  ClipReconciliation,
  LanguageModelPort,
  PlanSubject,
  TakeVerdict,
} from '@cutroom/contracts'
import type { Criterion } from '@cutroom/reel-contract'
import { takeReconcileAnswer, takeReconcilePrompt } from '../clips/prompts.ts'

// Gate 5, the brief, on a take (docs/features/reel-render.md, Gate 2 "Gates 2 to 5 on each take";
// S-072, S-040, D-043, D-044). One `structured` call, role reconciler, naming the take for its receipt,
// holds the witness's observation against the shot's subjects and the take's criteria — and the reel's
// unclaimed `mustShow`, marked as the reel's. The reconciler judges; code decides.

/** What a take's shot asks of it. */
export interface TakeBrief {
  subjects: readonly PlanSubject[]
  mustShow: readonly Criterion[]
  mustNotShow: readonly Criterion[]
  unclaimed: readonly Criterion[]
}

type Answer = Pick<ClipReconciliation, 'subjects' | 'criteria'>

/**
 * The four conditions on which code fails a take (S-072): a subject the shot shows is not shown; a
 * shown subject's count does not match (S-040's rule); a claimed `mustShow` of either type is not
 * shown; a `mustNotShow` is shown. A clipped entity fails nothing — D-044's veto is the keyframe's,
 * and a subject leaving a moving frame is motion — and an unclaimed `mustShow` fails no take.
 */
export function takeFailures(answer: Answer, brief: TakeBrief): string[] {
  const failed: string[] = []
  for (const subject of brief.subjects) {
    const said = answer.subjects.find((s) => s.id === subject.id)
    const named = `subject "${subject.id}" (${subject.name})`
    if (said === undefined || said.entity === null) {
      failed.push(`${named} is not shown`)
      continue
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

export async function gate5(
  take: { takeId: string },
  observation: ClipObservation,
  brief: TakeBrief,
  model: LanguageModelPort,
): Promise<{ reconciliation: ClipReconciliation; verdict: TakeVerdict }> {
  const { value: answer } = await model.structured({
    prompt: takeReconcilePrompt(observation, brief.subjects, brief),
    schema: takeReconcileAnswer(
      brief.subjects.map((s) => s.id),
      [...brief.mustShow, ...brief.mustNotShow, ...brief.unclaimed].map((c) => c.id),
      observation.entities.length,
    ),
    role: 'reconciler',
    temperature: 0,
    takeIds: [take.takeId],
  })
  const failed = takeFailures(answer, brief)
  return {
    reconciliation: { subjects: answer.subjects, criteria: answer.criteria, failed },
    verdict: {
      gate: '5',
      outcome: failed.length === 0 ? 'accept' : 'fail',
      reasons: failed,
      coverage: { strategy: 'observation' },
    },
  }
}
