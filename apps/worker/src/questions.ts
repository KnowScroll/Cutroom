import { appendFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// Writing a question (docs/features/reel-plan.md, Gate 2 "Selection, repair and how a run ends";
// D-014, D-097, D-100). The engine writes one only when its own per-reel cap refuses a run — a
// refusal against the caller's ceiling is returned, not written — and only to its own file. The
// entry's form, and why it is appended after the run is finished, are S-026.

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

/** Appends one entry; the file, with its header, is created on the first write. */
export function appendBudgetQuestion(
  path: string,
  question: BudgetQuestion,
  now: Date = new Date(),
): void {
  try {
    writeFileSync(path, HEADER, { flag: 'wx' })
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
  }
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
