// The comparison board's rows (benchmark-view, "The comparison board"; S-201).
//
// Any number of runs as columns, roughly fifty figures as rows in nine groups. **Briefs and
// configs may differ and nothing is refused**: there is no comparability rule, no band and NO
// VERDICT WORD here — this is not the stopped feature (S-200), and check 6 is the enforcement.
//
// A row says where its value is read from, as a dotted path into the run the fleet payload
// carries, and whether the row has a direction at all. `aim` is what the page tints by: `high`
// where a larger figure is the one a reader usually wants, `low` where a smaller one is, and
// `none` where neither is true — a world id, a brief key, a count of shots. A row with no
// direction is never tinted, which is the whole of what "only where the row has a better
// direction" means. The word itself is not written anywhere a reader can see it.

export type Aim = 'high' | 'low' | 'none'

export interface BoardRow {
  label: string
  /** A dotted path into one run of the fleet payload, resolved by the page's own script. */
  key: string
  aim: Aim
}

export interface BoardGroup {
  group: string
  rows: BoardRow[]
}

/** The nine groups, in the order the owner's shape names them. */
export const BOARD_GROUPS: readonly BoardGroup[] = [
  {
    group: 'Outcome',
    rows: [
      { label: 'Ending', key: 'ending.status', aim: 'none' },
      { label: 'Stage it ended at', key: 'ending.step', aim: 'none' },
      { label: 'Rule that ended it', key: 'ending.rule', aim: 'none' },
      { label: 'Failure kind', key: 'ending.failure', aim: 'none' },
      { label: 'Partial', key: 'partial', aim: 'none' },
      { label: 'Parts it reached and paid for', key: 'partsCovered', aim: 'none' },
    ],
  },
  {
    group: 'Part scores',
    rows: [
      { label: 'Overall rating', key: 'rating.rating', aim: 'high' },
      { label: 'Scope of the rating', key: 'rating.label', aim: 'none' },
      { label: 'Plan', key: 'rating.parts.plan.rating', aim: 'high' },
      { label: 'Pictures', key: 'rating.parts.pictures.rating', aim: 'high' },
      { label: 'Narration', key: 'rating.parts.narration.rating', aim: 'high' },
      { label: 'Clips', key: 'rating.parts.clips.rating', aim: 'high' },
      { label: 'Cut', key: 'rating.parts.cut.rating', aim: 'high' },
    ],
  },
  {
    group: 'Cost',
    rows: [
      { label: 'Cents in all', key: 'derived.spentCents', aim: 'low' },
      { label: 'Cents on pictures', key: 'costCents.image', aim: 'low' },
      { label: 'Cents on clips', key: 'costCents.video', aim: 'low' },
      { label: 'Cents on narration', key: 'costCents.speech', aim: 'low' },
      { label: 'Cents paid for no answer', key: 'costCents.lost', aim: 'low' },
      { label: 'Model calls', key: 'costCents.model', aim: 'none' },
      { label: 'Estimate at admission', key: 'estimateCents', aim: 'none' },
    ],
  },
  {
    group: 'Time',
    rows: [
      { label: 'Wall clock seconds', key: 'wallClockSeconds', aim: 'low' },
      { label: 'Plan stage seconds', key: 'stages.plan.seconds', aim: 'low' },
      { label: 'Pictures stage seconds', key: 'stages.stills.seconds', aim: 'low' },
      { label: 'Clips stage seconds', key: 'stages.video.seconds', aim: 'low' },
    ],
  },
  {
    group: 'Plan',
    rows: [
      { label: 'Shots', key: 'plan.shots', aim: 'none' },
      { label: 'Subjects', key: 'plan.subjects', aim: 'none' },
      { label: 'Subjects per shot', key: 'plan.subjectsPerShot', aim: 'none' },
      { label: 'Most subjects in one shot', key: 'plan.maxSubjectsPerShot', aim: 'none' },
      { label: 'Seconds per shot', key: 'plan.secondsPerShot', aim: 'none' },
      { label: 'Planned seconds', key: 'plan.totalSeconds', aim: 'none' },
    ],
  },
  {
    group: 'Pictures',
    rows: [
      { label: 'Pictures attempted', key: 'counts.picturesAttempted', aim: 'none' },
      { label: 'Pictures chosen', key: 'counts.picturesChosen', aim: 'high' },
      { label: 'Shots degraded', key: 'counts.shotsDegraded', aim: 'low' },
      { label: 'Pictures Gate 1 decided', key: 'derived.decided', aim: 'none' },
      { label: 'Pictures Gate 1 refused', key: 'derived.refused', aim: 'low' },
      { label: 'Share Gate 1 refused, %', key: 'derived.refusedShare', aim: 'low' },
    ],
  },
  {
    group: 'Clips',
    rows: [
      { label: 'Narrations made', key: 'counts.narrations', aim: 'none' },
      { label: 'Takes made', key: 'counts.takes', aim: 'none' },
      { label: 'Clips reached', key: 'rating.parts.clips.reached', aim: 'none' },
    ],
  },
  {
    group: 'Cut',
    rows: [
      { label: 'Cut reached', key: 'rating.parts.cut.reached', aim: 'none' },
      { label: 'Reel made', key: 'reel.madeAFile', aim: 'none' },
      { label: 'Reel seconds', key: 'reel.durationSeconds', aim: 'none' },
      { label: 'Reel frames', key: 'reel.frames', aim: 'none' },
    ],
  },
  {
    group: 'Setup',
    rows: [
      { label: 'World the brief came from', key: 'worldId', aim: 'none' },
      { label: 'Brief', key: 'briefKey', aim: 'none' },
      { label: 'Picture rule', key: 'pictureRule', aim: 'none' },
      { label: 'Ran until', key: 'until', aim: 'none' },
      { label: 'Resumed from', key: 'resumes', aim: 'none' },
      { label: 'Started', key: 'createdAt', aim: 'none' },
    ],
  },
]

/** How many figures the board holds, for the one line that says what it is. */
export const BOARD_FIGURES = BOARD_GROUPS.reduce((total, group) => total + group.rows.length, 0)
