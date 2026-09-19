import type { TakeRecord } from '@cutroom/contracts'
import type { Criterion } from '@cutroom/reel-contract'
import { shotIdOf } from '../stills/place.ts'

// At the take cap (docs/features/reel-takes.md, Gate 2 "At the cap"; S-090, D-025, D-024). When a
// shot's third decided take fails, D-025's ladder decides, by the classes the owner answered — and the
// class is A PROPERTY OF THE SHOT, not of which gate failed:
//
// - hold (rung 2): the shot has a chosen picture and claims no event mustShow. That picture passed
//   Gate 1 against every subject, presence mustShow and mustNotShow its shot holds (S-040), so every
//   failure Gates 2, 3 and 5 can find in one of its takes is in the clip alone or one the picture was
//   checked against: holding it cures whatever the takes failed on.
// - fail (rung 3): a shot with no chosen picture — the plan gave it none (D-027), or its picture was
//   degraded (D-050) — has nothing gated to hold, D-025's "keyframe never passed"; and a shot that
//   claims an event mustShow cannot show it in a still (D-043), D-025's "mustShow unmet".
//
// Nothing is soft in this build — no gate checks style or camera — so the answer has no label member
// (rung 1, S-090). A pure function of the shot and its takes.

/** A shot's decided takes, at most (D-024, S-094). */
export const TAKES_A_SHOT = 3

/** Hold the shot on its chosen picture, or stop the reel. No `accept_with_label` (S-090). */
export type AtTheCap = { kind: 'hold'; reason: string } | { kind: 'fail'; why: string }

export function atTheCap(
  shot: {
    shotUnit: number
    /** The chosen picture, or none. */
    picture: { pictureId: string } | null
    /** The event mustShow its sentences claim. */
    events: readonly Criterion[]
  },
  /** Its three decided takes, every one failed. */
  takes: readonly TakeRecord[],
): AtTheCap {
  const shotId = shotIdOf(shot.shotUnit)
  if (takes.length !== TAKES_A_SHOT || takes.some((t) => t.outcome !== 'fail')) {
    throw new Error(
      `${shotId} reached the ladder with ${takes.length} takes, not ${TAKES_A_SHOT} failed ones (S-090)`,
    )
  }
  const why: string[] = []
  if (shot.picture === null) {
    const words = takes.some((t) => t.degraded)
      ? 'its picture was degraded (D-050)'
      : 'the plan gave it no picture (D-027)'
    why.push(
      `it has no approved picture to hold, being made from words because ${words} — D-025's "keyframe never passed"`,
    )
  }
  if (shot.events.length > 0) {
    why.push(
      `it must show ${shot.events
        .map((c) => `"${c.id}" (${c.text})`)
        .join(
          ' and ',
        )}, an event, which a still picture cannot show (D-043) — D-025's "mustShow unmet"`,
    )
  }
  if (shot.picture === null || why.length > 0) {
    return { kind: 'fail', why: `${shotId} cannot be held: ${why.join('; and ')} (S-090)` }
  }
  return {
    kind: 'hold',
    reason: `${shotId} is held on its approved picture ${shot.picture.pictureId}: its three takes, ${takes
      .map((t) => t.takeId)
      .join(
        ', ',
      )}, failed their checks, and that picture passed Gate 1 against everything they were held to but motion (D-025, S-090)`,
  }
}
