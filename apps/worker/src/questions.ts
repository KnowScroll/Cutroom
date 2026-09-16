import { appendFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// Writing a question (docs/features/reel-plan.md, Gate 2 "Selection, repair and how a run ends";
// docs/features/reel-stills.md, Gate 2 "Spending while pictures are made"; D-014, D-097, D-100). The
// engine writes one only when its own per-reel cap refuses a run or stops one — a refusal or a stop
// at the caller's ceiling is returned, not written — and only to its own file. The entry's form, and
// why it is appended after the run is finished, are S-026; a stop's entry is S-035's.

/** The default questions file: `QUESTIONS.md` at this repository's root (D-097). A setting. */
export const QUESTIONS_MD = fileURLToPath(new URL('../../../QUESTIONS.md', import.meta.url))

const HEADER = [
  '# Questions from the engine',
  '',
  "Appended by the engine's worker when its per-reel cap refuses a run (D-014, D-097, D-100).",
  'One entry per refusal, newest at the bottom. Nothing here is read back by the engine.',
  '',
].join('\n')

/** What a refusal for the per-reel cap asks the owner, with every figure it was decided on. */
export interface BudgetQuestion {
  runId: string
  requestId: string
  /** The lowest of the plans' estimates, as the caller received it. */
  estimateCents: number
  ceilingCents: number
  capCents: number
  imageRateCents: number
  videoRateCentsPerSecond: number
  plans: ReadonlyArray<{ role: string; units: number; estimateCents: number }>
}

/** Creates the file with its header on the first write, and never rewrites it (S-026). */
function ensureFile(path: string): void {
  try {
    writeFileSync(path, HEADER, { flag: 'wx' })
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
  }
}

/** Appends one entry; the file, with its header, is created on the first write. */
export function appendBudgetQuestion(
  path: string,
  question: BudgetQuestion,
  now: Date = new Date(),
): void {
  ensureFile(path)
  const plans = question.plans
    .map((p) => `${p.role} (${p.units} units) ${p.estimateCents} cents`)
    .join('; ')
  const entry = [
    '',
    `## ${now.toISOString()} — run ${question.runId} refused: every plan is over the per-reel cap`,
    '',
    `- **Request:** \`${question.requestId}\``,
    `- **Lowest estimate:** ${question.estimateCents} cents`,
    `- **Per-reel cap:** ${question.capCents} cents, the \`Per reel, all-in\` row of BUDGET.md`,
    `- **Ceiling:** ${question.ceilingCents} cents, the caller's`,
    `- **Plans:** ${plans}`,
    `- **Rates:** ${question.imageRateCents} cents an image, ${question.videoRateCentsPerSecond} cents a second of video`,
    '',
    '**Question.** No plan of this narration, and no repair of one, would cost the per-reel cap or less to make. Should the cap or the rates change, or should narrations like this be written to plan shorter?',
    '',
  ].join('\n')
  appendFileSync(path, entry)
}

/**
 * What a stills run stopped at the per-reel cap asks the owner (D-100, S-035): the figures the guard
 * decided on, what was spent and on how many pictures, and the plan being made.
 */
export interface BudgetStopQuestion {
  runId: string
  requestId: string
  /** The spend plus one more picture at the rate: the figure compared with the cap. */
  estimateCents: number
  spentCents: number
  /** The image calls the stage had made when it stopped. */
  pictures: number
  ceilingCents: number
  capCents: number
  imageRateCents: number
  videoRateCentsPerSecond: number
  plan: { role: string; units: number; estimateCents: number; plannedImageCalls: number }
}

/**
 * Appends one entry for a stop, in S-026's form under a heading of its own (S-035); the file, with
 * its header, is created on the first write.
 */
export function appendBudgetStopQuestion(
  path: string,
  question: BudgetStopQuestion,
  now: Date = new Date(),
): void {
  ensureFile(path)
  const { plan } = question
  const entry = [
    '',
    `## ${now.toISOString()} — run ${question.runId} stopped: the next picture would pass the per-reel cap`,
    '',
    `- **Request:** \`${question.requestId}\``,
    `- **Estimate:** ${question.estimateCents} cents, what was spent and one more picture at the rate`,
    `- **Spent:** ${question.spentCents} cents, on ${question.pictures} picture(s)`,
    `- **Per-reel cap:** ${question.capCents} cents, the \`Per reel, all-in\` row of BUDGET.md`,
    `- **Ceiling:** ${question.ceilingCents} cents, the caller's`,
    `- **Plan:** ${plan.role} (${plan.units} units) ${plan.estimateCents} cents, ${plan.plannedImageCalls} planned image calls`,
    `- **Rates:** ${question.imageRateCents} cents an image, ${question.videoRateCentsPerSecond} cents a second of video`,
    '',
    "**Question.** Making this reel's pictures would have passed the per-reel cap: its pictures cost more than the image rate, or its checks needed more pictures than were planned. Should the cap or the image rate change?",
    '',
  ].join('\n')
  appendFileSync(path, entry)
}
