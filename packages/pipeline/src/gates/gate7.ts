import { z } from 'zod'
import type { CutVerdict, LanguageModelPort, PictureRef } from '@cutroom/contracts'

// Gate 7 (docs/features/reel-render.md, Gate 2 "Gate 7"; S-074, D-058, D-064). The assembled file,
// judged once: ONE `judgeCut` call, role judge, temperature 0, given each shot in timeline order with
// the frames of its span's start, middle and end and its sentences, and five closed questions. Its
// answer names every question once, yes or no, or it does not parse and the run fails. ANY NO FAILS
// the gate (I-16): each question is worded so that yes is what a right cut answers.

/** The judge's answer: every question handed, exactly once, each yes or no, and no other. */
export function cutAnswer(questions: readonly string[]) {
  return z
    .strictObject({
      answers: z.array(
        z.strictObject({ question: z.string().min(1), answer: z.enum(['yes', 'no']) }),
      ),
    })
    .superRefine((value, context) => {
      for (const question of questions) {
        const times = value.answers.filter((a) => a.question === question).length
        if (times !== 1) {
          context.addIssue({
            code: 'custom',
            path: ['answers'],
            message: `"${question}" is answered ${times} times, not once`,
          })
        }
      }
      value.answers.forEach((a, index) => {
        if (!questions.includes(a.question)) {
          context.addIssue({
            code: 'custom',
            path: ['answers', index, 'question'],
            message: `"${a.question}" was not asked`,
          })
        }
      })
    })
}

/** One shot as the judge is shown it: where it sits is its place in the list. */
export interface CutShot {
  shotId: string
  sentences: readonly string[]
  frames: readonly PictureRef[]
}

/**
 * Throws when the answer does not parse: the caller turns that into a failed run (S-074, S-042's
 * form). The verdict's coverage is the frames the judge was shown, with their number (I-6).
 */
export async function gate7(
  shots: readonly CutShot[],
  questions: readonly string[],
  model: LanguageModelPort,
): Promise<CutVerdict> {
  const { value } = await model.judgeCut({
    shots: shots.map((s) => ({
      shotId: s.shotId,
      sentences: [...s.sentences],
      frames: s.frames.map((f) => ({ pictureId: f.pictureId, path: f.path })),
    })),
    questions: [...questions],
    temperature: 0,
  })
  const parsed = cutAnswer(questions).safeParse(value)
  if (!parsed.success) {
    throw new Error(
      `the judge's answer on the cut does not name every question once: ${parsed.error.issues
        .map((i) => i.message)
        .join('; ')}`,
    )
  }
  // In the order asked, whatever order the judge answered in.
  const answer = questions.map((question) => ({
    question,
    answer: parsed.data.answers.find((a) => a.question === question)?.answer ?? 'no',
  }))
  const reasons = answer.filter((a) => a.answer === 'no').map((a) => a.question)
  return {
    outcome: reasons.length === 0 ? 'accept' : 'fail',
    coverage: { strategy: 'frames', frames: shots.reduce((n, s) => n + s.frames.length, 0) },
    answer,
    reasons,
  }
}
