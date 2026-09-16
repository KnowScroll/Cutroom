import type {
  KeyframeScore,
  KeyframeTerm,
  PictureMeasure,
  WitnessObservation,
} from '@cutroom/contracts'

// The keyframe score (docs/features/reel-stills.md, Gate 2 "Choosing the main picture"; D-031,
// D-045, D-046, S-044). It ranks two canonical candidates that both survived Gate 1, reading the
// verdict only — it makes no call. It can reject nothing (I-16): every input gives a number above
// 0, and this file has no throw. Written as arithmetic that cannot throw, not as a caught error.

/** Reference quality above composition — D-031's one fixed ordering. Provisional until M-1. */
export const DEFAULT_SCORE_WEIGHTS: Readonly<Record<KeyframeTerm, number>> = {
  faceVisible: 2,
  unoccluded: 2,
  prominence: 2,
  sharpness: 1,
  brightness: 1,
}

const TERMS: readonly KeyframeTerm[] = [
  'faceVisible',
  'unoccluded',
  'prominence',
  'sharpness',
  'brightness',
]

/** Every term is at least this, so no term — and no score — is ever 0 (D-046). */
const FLOOR = 0.01

// Maps, not object literals: an answer such as 'constructor' must find nothing, not a function.
const FACE = new Map<unknown, number>([
  ['yes', 1],
  ['noFace', 1],
  ['partial', 2 / 3],
  ['no', 1 / 3],
])
const PROMINENCE = new Map<unknown, number>([
  ['foreground', 1],
  ['midground', 2 / 3],
  ['background', 1 / 3],
])

/** A sensor's value clamped to [0.01, 1]. Not a number — NaN included — is the floor. */
function clamped(value: unknown): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return FLOOR
  return Math.min(1, Math.max(FLOOR, value))
}

/** A weight that is missing or not a positive finite number counts as its default (S-044). */
function weightOf(weights: Record<string, number> | undefined, term: KeyframeTerm): number {
  const weight: unknown = weights?.[term]
  return typeof weight === 'number' && Number.isFinite(weight) && weight > 0
    ? weight
    : DEFAULT_SCORE_WEIGHTS[term]
}

/**
 * The weighted sum of five terms of the canonical subject's reconciled entity and the technical
 * measure, each in (0, 1]. An answer outside its closed list counts as that term's lowest value.
 * The total is capped at the largest finite number, and held above 0 when weights so small that
 * their products round to nothing would otherwise make it 0 (S-054). Every term, the weights as
 * used and the total are returned, so a score replays from its record (D-031 rule 5).
 */
export function keyframeScore(
  entity: WitnessObservation['entities'][number],
  measure: PictureMeasure,
  weights: Record<string, number>,
): KeyframeScore {
  const terms: Record<KeyframeTerm, number> = {
    faceVisible: FACE.get(entity?.faceVisible) ?? 1 / 3,
    unoccluded: entity?.occluded === false ? 1 : 1 / 2,
    prominence: PROMINENCE.get(entity?.prominence) ?? 1 / 3,
    sharpness: clamped(measure?.sharpness),
    brightness: clamped(measure?.brightness),
  }
  const used = {} as Record<KeyframeTerm, number>
  let total = 0
  for (const term of TERMS) {
    used[term] = weightOf(weights, term)
    total += used[term] * terms[term]
  }
  return {
    terms,
    weights: used,
    total: Math.max(Math.min(total, Number.MAX_VALUE), Number.MIN_VALUE),
  }
}
