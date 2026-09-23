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
 * (D-032). A derived picture is made once and declares none; so is a standalone, made from scratch
 * on a shot naming no pictured subject (three-pictures, S-150).
 */
export const pictureEntry = z.discriminatedUnion('role', [
  z.strictObject({ role: z.literal('canonical'), ...entryFields, varyOn: z.literal('framing') }),
  z.strictObject({ role: z.literal('derived'), ...entryFields }),
  z.strictObject({ role: z.literal('standalone'), ...entryFields }),
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
    // A canonical names its framing; a derived picture is held to its reference; a standalone has
    // neither — it is made from scratch, with no reference to keep to (S-150).
    ...(entry.role === 'canonical'
      ? [`Framing: ${framing}.`]
      : entry.role === 'derived'
        ? ['Keep every subject exactly as it appears in the reference picture.']
        : []),
    `It shows: ${entry.subjects.join('; ')}.`,
    'What is said over the shot:',
    ...entry.sentences.map((sentence) => `  ${quoted(sentence)}`),
    'It must show:',
    ...criteriaLines(entry.mustShow),
    'It must never show:',
    ...criteriaLines(entry.mustNotShow),
  ].join('\n')
}

/** One verdict a repair consumes, and what it failed on. */
export interface Consumed {
  gate: '1' | '1S'
  /** Gate 1: the reasons of its failed steps. Gate 1S: the shared subjects the judge answered no. */
  reasons: readonly string[]
}

/**
 * A repair's prompt: its picture's entry rendered again — the canonical's with candidate a's framing
 * — with the reasons of every verdict it consumes APPENDED (Gate 2 "Making a picture"). Both
 * candidates' Gate 1 reasons for the canonical (D-047); a derived picture's Gate 1 reasons (S-043),
 * or the shared subjects its Gate 1S judge answered no (D-050). A repair told nothing would be a
 * re-roll, not a repair (D-047's "informed").
 */
export function repairPrompt(
  entry: PictureEntry,
  framing: Framing | null,
  consumed: readonly Consumed[],
): string {
  if (consumed.length === 0) {
    throw new Error(`a repair of ${entry.shotId} was asked for with no verdict to consume`)
  }
  const lines = [
    imagePrompt(entry, framing),
    '',
    consumed.length === 1
      ? 'The try before this one failed its checks. Correct what failed:'
      : `Each of the ${consumed.length} tries before this one failed its checks. Correct what failed:`,
  ]
  consumed.forEach((verdict, i) => {
    if (consumed.length > 1) lines.push(`Try ${i + 1}:`)
    for (const reason of verdict.reasons) {
      lines.push(
        verdict.gate === '1S'
          ? `- ${reason} does not look like the same one as in the reference picture`
          : `- ${reason}`,
      )
    }
  })
  return lines.join('\n')
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
/**
 * An id field that SAYS WHICH IDS IT ACCEPTS (S-139).
 *
 * `namesEach` has always refused an id that was not asked about, and a `superRefine` **does not
 * render into JSON Schema** — so the shape a model is shown said only `{"type":"string"}`, and
 * the constraint reached it in nothing. Measured on a real reel, 98¢ in, with two clips already
 * bought: asked about `keeper` and `log`, the reconciler answered `"Lighthouse Keeper"` and
 * `"Handwritten Logbook"` — the plan's display names — and the answer was refused.
 *
 * **What is ACCEPTED does not move by one character**: `namesEach` still runs, and still requires
 * every id exactly once and no other. What moves is what the schema SAYS, and therefore what the
 * adapter's rendering of it tells the model (S-130). A constraint a reader of the schema cannot
 * see is a constraint the answerer cannot meet.
 *
 * An empty list stays `z.string()`, because `z.enum` has no empty form and an id field that
 * accepts nothing would refuse before `namesEach` could say why.
 */
const oneOf = (ids: readonly string[]) =>
  ids.length === 0 ? z.string() : z.enum([...ids] as [string, ...string[]])

export function reconcileAnswer(
  subjectIds: readonly string[],
  criterionIds: readonly string[],
  entities: number,
) {
  const entity = z.number().int().min(0).nullable()
  return z
    .strictObject({
      subjects: z.array(
        z.strictObject({ id: oneOf(subjectIds), entity, countMatches: z.boolean() }),
      ),
      criteria: z.array(z.strictObject({ id: oneOf(criterionIds), shown: z.boolean(), entity })),
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
      subjects: z.array(z.strictObject({ subject: oneOf(subjects), same: z.enum(['yes', 'no']) })),
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
