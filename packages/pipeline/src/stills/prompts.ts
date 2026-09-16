import { z } from 'zod'
import type {
  Framing,
  PictureRecord,
  PlanSubject,
  StillsSettings,
  WitnessObservation,
} from '@cutroom/contracts'
import { StyleContract, type Criterion } from '@cutroom/reel-contract'

// The picture calls' inputs, each as the data or prompt it is rendered from and the schema its
// answer must parse under (docs/features/reel-stills.md, Gate 2 "Making a picture", "Gate 1" and
// "Gate 1S"; D-032, D-042, D-049, D-069, S-040, S-045). Every prompt is built from its inputs alone —
// no time, no randomness — so the same inputs ask the same thing, and a call at temperature 0
// replays.

const quoted = (text: string) => JSON.stringify(text)

// ---------------------------------------------------------------- the entry and the image prompt

const criterionLine = z.strictObject({ id: z.string().min(1), text: z.string().min(1) })

const entryFields = {
  shotId: z.string().min(1),
  /** The style contract, text only in Phase 1 (D-069). */
  style: StyleContract,
  /** The names of every subject the shot shows. */
  subjects: z.array(z.string().min(1)).min(1),
  /** The shot's sentences, in order. */
  sentences: z.array(z.string().min(1)),
  /** The presence criteria S-040 gives the shot's picture. */
  mustShow: z.array(criterionLine),
  mustNotShow: z.array(criterionLine),
  aspectRatio: z.literal('9:16'),
}

/**
 * The entry a picture's prompt is rendered from. **A canonical entry declares its axis** — framing,
 * the one thing its two candidates differ on — and one without it fails here, before any call
 * (D-032). A derived picture is made once and declares none.
 */
export const pictureEntry = z.discriminatedUnion('role', [
  z.strictObject({ role: z.literal('canonical'), ...entryFields, varyOn: z.literal('framing') }),
  z.strictObject({ role: z.literal('derived'), ...entryFields }),
])

export type PictureEntry = z.infer<typeof pictureEntry>

/**
 * The framing a picture is rendered with: the canonical's candidate `a` takes the setting's first
 * value and `b` its second (D-032, S-044); a derived picture varies on nothing and has none.
 */
export function framingFor(
  role: PictureRecord['role'],
  label: string,
  settings: Pick<StillsSettings, 'canonicalFraming'>,
): Framing | null {
  if (role !== 'canonical') return null
  return label === 'b' ? settings.canonicalFraming[1] : settings.canonicalFraming[0]
}

const criteriaLines = (list: ReadonlyArray<{ id: string; text: string }>) =>
  list.length === 0 ? ['- nothing further'] : list.map((c) => `- ${c.text}`)

/**
 * The image prompt, rendered from an entry. A canonical's two candidates render ONE entry with two
 * framing values, and the framing line is the only line that can differ between them (D-032).
 */
export function imagePrompt(entry: PictureEntry, framing: Framing | null): string {
  if (entry.role === 'canonical' && framing === null) {
    throw new Error(
      `the canonical entry for ${entry.shotId} was rendered without its framing (D-032)`,
    )
  }
  return [
    'Make the opening frame of one shot of a short vertical reel.',
    `Style: ${entry.style.text}`,
    `Shape: a vertical picture, ${entry.aspectRatio}.`,
    entry.role === 'canonical'
      ? `Framing: ${framing}.`
      : 'Keep every subject exactly as it appears in the reference picture.',
    `It shows: ${entry.subjects.join('; ')}.`,
    'What is said over the shot:',
    ...entry.sentences.map((sentence) => `  ${quoted(sentence)}`),
    'It must show:',
    ...criteriaLines(entry.mustShow),
    'It must never show:',
    ...criteriaLines(entry.mustNotShow),
  ].join('\n')
}

// ---------------------------------------------------------------- reconcile

/**
 * How a subject's count is judged, in S-040's words. The plan names a subject and gives it no
 * count, so its name is the only place a count can come from — and "one when the name states no
 * number" would fail every true picture of "the barons".
 */
export const COUNT_RULE =
  'A subject\'s count matches when the count of the thing that is it is the number the subject\'s name states; or, when the name states no number, one for a singular name and two or more for a plural one. "The barons" matches any count above one; a collective name, such as "a flock", is yours to read.'

const idLines = (list: readonly Criterion[]) =>
  list.length === 0 ? ['- (none)'] : list.map((c) => `- ${c.id}: ${quoted(c.text)}`)

/**
 * The reconcile prompt for one picture (D-042): what the witness saw, the subjects the picture's
 * shot shows by id and name, and the presence criteria S-040 gives it — never an event (D-043).
 */
export function reconcilePrompt(
  observation: WitnessObservation,
  subjects: readonly PlanSubject[],
  criteria: { mustShow: readonly Criterion[]; mustNotShow: readonly Criterion[] },
): string {
  return [
    'A picture was described by someone who was never told what it should show. Their description follows, as JSON; the things they saw are its "entities", numbered from 0 in the order listed.',
    '',
    JSON.stringify(observation),
    '',
    'The subjects the picture should show:',
    ...subjects.map((s) => `- ${s.id}: ${quoted(s.name)}`),
    '',
    "For each subject, give the number of the entity that is it, or null if no entity is; and say whether that entity's count matches.",
    COUNT_RULE,
    '',
    'What the picture must show:',
    ...idLines(criteria.mustShow),
    '',
    'What the picture must never show:',
    ...idLines(criteria.mustNotShow),
    '',
    'For each of these, say whether it is shown, and the number of the entity that shows it, or null.',
    '',
    'Answer only with the JSON object the schema describes, naming every subject and every criterion above once.',
  ].join('\n')
}

type Issue = { addIssue(issue: { code: 'custom'; path: PropertyKey[]; message: string }): void }

/** Each expected id named exactly once, and no other. */
function namesEach(
  list: ReadonlyArray<{ id: string }>,
  expected: readonly string[],
  path: string,
  ctx: Issue,
): void {
  const named = new Map<string, number>()
  list.forEach((item, i) => {
    if (!expected.includes(item.id)) {
      ctx.addIssue({
        code: 'custom',
        path: [path, i, 'id'],
        message: `"${item.id}" was not asked about`,
      })
    }
    named.set(item.id, (named.get(item.id) ?? 0) + 1)
  })
  for (const id of expected) {
    const times = named.get(id) ?? 0
    if (times !== 1) {
      ctx.addIssue({
        code: 'custom',
        path: [path],
        message: `"${id}" is answered ${times} times, not once`,
      })
    }
  }
}

/**
 * What the reconciler must answer for one picture: every subject and every criterion it was given,
 * each once, and nothing else; and an entity is a number the witness gave, or null. An answer that
 * does not parse fails the run (S-054), as a refused planning answer does.
 */
export function reconcileAnswer(
  subjectIds: readonly string[],
  criterionIds: readonly string[],
  entities: number,
) {
  const entity = z.number().int().min(0).nullable()
  return z
    .strictObject({
      subjects: z.array(z.strictObject({ id: z.string(), entity, countMatches: z.boolean() })),
      criteria: z.array(z.strictObject({ id: z.string(), shown: z.boolean(), entity })),
    })
    .superRefine((answer, ctx) => {
      namesEach(answer.subjects, subjectIds, 'subjects', ctx)
      namesEach(answer.criteria, criterionIds, 'criteria', ctx)
      for (const [path, list] of [
        ['subjects', answer.subjects],
        ['criteria', answer.criteria],
      ] as const) {
        list.forEach((item, i) => {
          if (item.entity !== null && item.entity >= entities) {
            ctx.addIssue({
              code: 'custom',
              path: [path, i, 'entity'],
              message: `entity ${item.entity} does not exist: the witness saw ${entities}`,
            })
          }
        })
      }
    })
}

export type ReconcileAnswer = z.infer<ReturnType<typeof reconcileAnswer>>

// ---------------------------------------------------------------- Gate 1S

/**
 * What the judge must answer about one pair: every shared subject, by name, once, `yes` or `no`
 * (S-045). The closed question itself is fixed inside the adapter (S-037).
 */
export function compareAnswer(subjects: readonly string[]) {
  return z
    .strictObject({
      subjects: z.array(z.strictObject({ subject: z.string(), same: z.enum(['yes', 'no']) })),
    })
    .superRefine((answer, ctx) => {
      namesEach(
        answer.subjects.map((a) => ({ id: a.subject })),
        subjects,
        'subjects',
        ctx,
      )
    })
}
