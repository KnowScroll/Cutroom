import type {
  LanguageModelPort,
  PictureRecord,
  PictureRef,
  PictureSensorPort,
} from '@cutroom/contracts'
import { compareAnswer } from '../stills/prompts.ts'

// Gate 1S (docs/features/reel-stills.md, Gate 2 "Gate 1S — set consistency"; D-049, S-045). A
// derived picture that passed Gate 1, held against the chosen canonical. The similarity of the two
// whole pictures only ROUTES: at or below the threshold the pair is accepted with no call; above
// it, one `compare` call decides. No similarity fails a picture on its own (I-16).

export type Gate1S = NonNullable<PictureRecord['gate1s']>

/**
 * `shared` is the names of the subjects both shots show. None: accepted, not compared. A suspicion
 * that is not at or below the threshold — NaN included — goes to the judge, which is the only thing
 * here that can fail a picture.
 */
export async function gate1s(
  pair: { canonical: PictureRef; derived: PictureRef; shared: readonly string[] },
  ports: { sensors: PictureSensorPort; model: LanguageModelPort },
  threshold: number,
): Promise<Gate1S> {
  const accepted = (suspicion: number | null): Gate1S => ({
    outcome: 'accept',
    coverage: 'pair',
    compared: false,
    suspicion,
    answer: null,
    reasons: [],
  })
  if (pair.shared.length === 0) return accepted(null)

  const canonical: PictureRef = { pictureId: pair.canonical.pictureId, path: pair.canonical.path }
  const derived: PictureRef = { pictureId: pair.derived.pictureId, path: pair.derived.path }
  const suspicion = 1 - (await ports.sensors.similarity(canonical, derived))
  if (suspicion <= threshold) return accepted(suspicion)

  const { value } = await ports.model.compare({
    pictures: [canonical, derived],
    subjects: [...pair.shared],
    temperature: 0,
  })
  const parsed = compareAnswer(pair.shared).safeParse(value)
  if (!parsed.success) {
    throw new Error(
      `the judge's answer for ${derived.pictureId} does not name every shared subject once: ${parsed.error.issues
        .map((i) => i.message)
        .join('; ')}`,
    )
  }
  const answer = parsed.data.subjects
  const reasons = pair.shared.filter(
    (name) => answer.find((a) => a.subject === name)?.same === 'no',
  )
  return {
    outcome: reasons.length === 0 ? 'accept' : 'fail',
    coverage: 'pair',
    compared: true,
    suspicion,
    answer,
    reasons,
  }
}
