import type {
  ClipObservation,
  PlanSubject,
  TakeRecord,
  WitnessObservation,
} from '@cutroom/contracts'
import type { Criterion, StyleContract } from '@cutroom/reel-contract'
import { COUNT_RULE, reconcileAnswer } from '../stills/prompts.ts'

// What a clip's prompt is made of, and what a take's reconciler is asked and must answer
// (docs/features/reel-render.md, Gate 2 "Clips" and "Gates 2 to 5 on each take"; S-071, S-072). Every
// prompt is built from its inputs alone — no time, no randomness — so the same inputs ask the same
// thing, and a call at temperature 0 replays.

/**
 * D-008's negative audio block: H3's sound is ambience only, so every shot prompt forbids speech and
 * music, and says so in the field H3 reads. Last in every clip prompt (S-071).
 */
export const NEGATIVE_AUDIO = 'No dialogue, no speech, no music.\nnon_diegetic_music: N/A'

const quoted = (text: string) => JSON.stringify(text)

/** What a take's prompt is composed from, once the stills are approved (D-033, D-069). */
export interface ClipBrief {
  style: Pick<StyleContract, 'text'>
  /** The shot's sentences, in order. */
  sentences: readonly string[]
  /** Every subject the shot shows. */
  subjects: readonly PlanSubject[]
  /** The take's criteria (S-072). */
  mustShow: readonly Criterion[]
  mustNotShow: readonly Criterion[]
  /** Every `mustShow` no sentence claims: the reel's, which some shot must show. */
  unclaimed: readonly Criterion[]
  /** For an image-to-video take, its picture's RECORDED observation, never looked at again (I-15). */
  picture: WitnessObservation | null
}

const textLines = (list: readonly Criterion[]) =>
  list.length === 0 ? ['- nothing further'] : list.map((c) => `- ${c.text}`)

/**
 * The clip prompt (S-071): the style contract's text; the shot's sentences; the names of the subjects
 * it shows; its claimed `mustShow` of both types, every `mustNotShow`, and every unclaimed `mustShow`
 * under a line saying the reel must show it in some shot; for an image-to-video take, its picture's
 * recorded framing, setting, lighting, and each entity's label and position; and last, the negative
 * audio block. No camera — none is planned — and no `[Shot` marker: one clip is one shot (D-071).
 */
export function clipPrompt(brief: ClipBrief): string {
  const lines = [
    'Make one shot of a short vertical reel: one continuous clip.',
    `Style: ${brief.style.text}`,
    'What is said over the shot:',
    ...brief.sentences.map((sentence) => `  ${quoted(sentence)}`),
    brief.subjects.length === 0
      ? 'It shows no named subject.'
      : `It shows: ${brief.subjects.map((s) => s.name).join('; ')}.`,
    'It must show:',
    ...textLines(brief.mustShow),
    'It must never show:',
    ...textLines(brief.mustNotShow),
  ]
  if (brief.unclaimed.length > 0) {
    lines.push(
      'The reel must show each of these in some shot, and this shot may be the one:',
      ...textLines(brief.unclaimed),
    )
  }
  if (brief.picture !== null) {
    const { framing, setting, lighting, entities } = brief.picture
    lines.push(
      'It opens on its approved picture, which was seen to show:',
      `Framing: ${framing}.`,
      `Setting: ${setting}.`,
      `Lighting: ${lighting}.`,
      ...entities.map((e) => `- ${e.label}, at the ${e.position}`),
    )
  }
  lines.push(NEGATIVE_AUDIO)
  return lines.join('\n')
}

/**
 * A retry's prompt (reel-takes, S-094; D-033's rider): the shot's first take's prompt with, inserted
 * before the negative audio block, a blank line, a line saying the takes before this one failed their
 * checks, and every earlier failed take's reasons — under `Take <n>:`, then under `Gate <g>:` for each
 * gate it failed, as bullets. The block stays last, so every retry passes the validator (S-071).
 *
 * EVERY earlier failed take, not only the last: take 3 told only take 2's reasons would ask for take
 * 2 again whenever the two failed alike — a re-roll with a new seed, which D-033 rejects — as the
 * canonical's repair consumes both candidates' verdicts (D-047, S-060). And only their RECORDED
 * reasons: never a failed take's clip, path, observation or expanded prompt (D-072), and nothing is
 * looked at to write it (D-033: "No second vision call is made"; I-15).
 */
export function retryPrompt(
  first: string,
  failed: ReadonlyArray<Pick<TakeRecord, 'number' | 'verdicts'>>,
): string {
  if (!first.endsWith(NEGATIVE_AUDIO)) {
    throw new Error(
      "a retry is made from its first take's prompt, which ends with the block (S-071)",
    )
  }
  if (failed.length === 0) throw new Error('a retry follows a take that failed (S-094)')
  const lines = ['', 'The takes before this one failed their checks. What failed, take by take:']
  for (const take of failed) {
    lines.push(`Take ${take.number}:`)
    for (const verdict of take.verdicts) {
      if (verdict.outcome !== 'fail') continue
      lines.push(`Gate ${verdict.gate}:`, ...verdict.reasons.map((reason) => `- ${reason}`))
    }
  }
  return `${first.slice(0, first.length - NEGATIVE_AUDIO.length)}${lines.join('\n')}\n${NEGATIVE_AUDIO}`
}

const idLines = (list: readonly Criterion[]) =>
  list.length === 0 ? ['- (none)'] : list.map((c) => `- ${c.id}: ${quoted(c.text)}`)

/**
 * The reconcile prompt for one take (S-072): what the witness saw of the clip, the subjects its shot
 * shows by id and name, the take's criteria, and the reel's unclaimed `mustShow` marked as the reel's.
 * Never the expanded prompt: the provider's rewriting would argue for its own clip (D-072).
 */
export function takeReconcilePrompt(
  observation: ClipObservation,
  subjects: readonly PlanSubject[],
  criteria: {
    mustShow: readonly Criterion[]
    mustNotShow: readonly Criterion[]
    unclaimed: readonly Criterion[]
  },
): string {
  return [
    'A clip was described by someone who was never told what it should show. Their description follows, as JSON; the things they saw are its "entities", numbered from 0 in the order listed, and what those things did is its "actions" and "eventOrder".',
    '',
    JSON.stringify(observation),
    '',
    'The subjects the clip should show:',
    ...(subjects.length === 0 ? ['- (none)'] : subjects.map((s) => `- ${s.id}: ${quoted(s.name)}`)),
    '',
    "For each subject, give the number of the entity that is it, or null if no entity is; and say whether that entity's count matches.",
    COUNT_RULE,
    '',
    'What the clip must show:',
    ...idLines(criteria.mustShow),
    '',
    'What the clip must never show:',
    ...idLines(criteria.mustNotShow),
    '',
    'What the reel must show in some shot — this clip may or may not be that shot:',
    ...idLines(criteria.unclaimed),
    '',
    'For each of these, say whether it is shown, and the number of the entity that shows it, or null.',
    '',
    'Answer only with the JSON object the schema describes, naming every subject and every criterion above once.',
  ].join('\n')
}

/**
 * What the reconciler must answer for one take: as for a picture (S-040, S-056) — every subject and
 * every criterion it was given, each once and nothing else, and an entity the witness gave or none.
 * An answer that does not parse fails the run.
 */
export function takeReconcileAnswer(
  subjectIds: readonly string[],
  criterionIds: readonly string[],
  entities: number,
) {
  return reconcileAnswer(subjectIds, criterionIds, entities)
}
