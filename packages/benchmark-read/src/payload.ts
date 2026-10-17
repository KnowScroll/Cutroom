// The two payloads the page is served (benchmark-view, Gate 2 "How the page receives its data";
// S-204).
//
// `GET /data` carries every FINISHED run without one word of model text — 39 KB for all 52 runs
// of the record this was measured on — and `GET /run/<id>` carries one run's full scorecard with
// the words folded into it, 3 KB typically and 40 KB at the largest. The whole record is 2665 KB
// and nine tenths of that is words for runs nobody has asked to open, which is why there are two
// payloads and not one; and every fleet view reads the same per-run rows, which is why there are
// two and not one per view.
//
// The arithmetic is none of this file's business: `@cutroom/benchmark` is handed the rows and
// returns the figures. What is here is the selection — which runs, which fields, which rows —
// and the scrubber on the way out.

import { createHash } from 'node:crypto'
import { PART_NAMES, runRating, scorecard, subjectsPerShot } from '@cutroom/benchmark'
import type { PartName, RunRows } from '@cutroom/benchmark'
import type { StoredRecord } from './loader.ts'

/** The hash the scorecard is handed, for a brief key and a Gate 7 question set. */
const hash = (input: string): string => createHash('sha256').update(input).digest('hex')

/** One column's JSON text, or nothing. A column that holds no JSON is read as absent. */
function parsed<T>(text: unknown): T | undefined {
  if (typeof text !== 'string' || text === '') return undefined
  try {
    return JSON.parse(text) as T
  } catch {
    return undefined
  }
}

/**
 * Every string of a payload, through the loader's scrubber (Gate 2, "The database holds raw model
 * text"). The record holds what a model said VERBATIM, and the benchmark's only redaction is at
 * the record's write boundary, which a server reading the database walks straight past — so an
 * artifact root becomes a relative path (D-086) and a URL becomes `<url>` (D-022) here, on the
 * way out, for every string of both payloads. A run id and a brief key survive it unchanged.
 */
function scrubbed(value: unknown, scrub: (text: string) => string): unknown {
  if (typeof value === 'string') return scrub(value)
  if (Array.isArray(value)) return value.map((item) => scrubbed(item, scrub))
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, inner]) => [key, scrubbed(inner, scrub)]),
    )
  }
  return value
}

/**
 * FINISHED ONLY (`run.state`, an enum of `running` and `finished`). The record this was built on
 * holds 52 finished runs and no running one, so nothing observable turns on this filter there —
 * and that is exactly why check 3 crafts a record where it does.
 */
const finished = (rows: RunRows): boolean => rows.run.state === 'finished'

interface Gate7Blob {
  answer?: Array<{ question?: string; answer?: string }>
}

// ---------------------------------------------------------------- the fleet

/**
 * One decided picture: a picture Gate 1 reached a verdict on. The group a picture belongs to is
 * keyed off `picture.shot_unit`, THE INTEGER COLUMN, indexed into the selected plan's subjects
 * per shot — never a digit parsed off the end of an id, which works only while the scorecard
 * spells a shot `shot-${unit}` (Gate 2, "Where each figure comes from").
 */
export interface FleetPicture {
  pictureId: string
  shotUnit: number
  /** The subjects in this picture's shot, or null: a run with no selected plan has no shots. */
  subjectsInShot: number | null
  /** Copied in by a resume: this run did not pay for it (S-162). */
  inherited: boolean
  refused: boolean
}

export interface FleetRun {
  runId: string
  requestId: string
  worldId: string
  briefKey: string
  /** `run.created_at`, which is where a run's date lives: the scorecard does not carry one. */
  createdAt: string
  until: string
  pictureRule: string
  resumes: string
  partial: boolean
  partsCovered: PartName[]
  /**
   * The OUTCOME and the stage it ended at — never the ending's `detail`, which is a provider's
   * answer verbatim in a run that died in a call.
   */
  ending: { status: string; rule: string; step: string; failure: string }
  reel: { madeAFile: boolean; durationSeconds: number | string; frames: number | string }
  costCents: Record<string, number | string>
  estimateCents: number | string
  wallClockSeconds: number | string
  stages: Record<string, { seconds: number | string; rule: string }>
  plan: {
    shots: number | string
    subjects: number | string
    subjectsPerShot: number[]
    secondsPerShot: number[]
    totalSeconds: number | string
    maxSubjectsPerShot: number | string
  }
  counts: {
    picturesAttempted: number
    picturesChosen: number
    shotsDegraded: number
    narrations: number
    takes: number
  }
  rating: {
    rating: number | string
    label: string
    stamp: string
    partial: boolean
    parts: Record<string, { rating: number | string; reached: boolean; inherited: boolean }>
  }
  pictures: FleetPicture[]
}

export interface FleetPayload {
  runs: FleetRun[]
}

function fleetRun(rows: RunRows): FleetRun {
  const card = scorecard(rows, { hash })
  const rating = runRating(rows, { hash })
  const perShot = subjectsPerShot(rows)

  // A picture's Gate 1 verdict comes from the arithmetic, which reads the blob; its shot comes
  // from the column. A picture whose shot is beyond the selected plan's shots, and every picture
  // of a run whose plan was never selected, carries no subject count rather than the last one's.
  const decided = new Map(card.parts.pictures.items.map((item) => [item.pictureId, item]))
  const pictures: FleetPicture[] = []
  for (const row of rows.picture) {
    const item = decided.get(row.picture_id)
    const outcome = item?.gate1.outcome
    if (item === undefined || (outcome !== 'accept' && outcome !== 'fail')) continue
    const unit = row.shot_unit
    pictures.push({
      pictureId: row.picture_id,
      shotUnit: unit,
      subjectsInShot: unit >= 0 && unit < perShot.length ? (perShot[unit] ?? null) : null,
      inherited: item.inherited,
      refused: outcome === 'fail',
    })
  }

  return {
    runId: card.run.runId,
    requestId: card.run.requestId,
    worldId: String(card.run.worldId),
    briefKey: card.run.briefKey,
    createdAt: String(rows.run.created_at),
    until: String(card.run.until),
    pictureRule: String(card.run.pictureRule),
    resumes: String(card.run.resumes),
    partial: card.run.partial,
    partsCovered: card.run.partsCovered,
    // The ending's STATE and the stage it died at, and NOT its `detail`. Gate 2 asks the fleet
    // payload for the "ending" and tells the page that a provider's raw response body is not
    // rendered at all; measured on the real record, `detail` is exactly that — MiniMax's 401 body
    // with its `request_id`, a zod complaint printed whole. The two sentences are reconciled by
    // reading "ending" as the outcome, which is the only sense the overview uses: where reels die
    // needs which stage and which outcome. A detail belongs in the detail view, and `GET
    // /run/<id>` keeps all of it (the main session's call on this slice's finding 14).
    ending: {
      status: String(card.run.ending.status),
      rule: String(card.run.ending.rule),
      step: String(card.run.ending.step),
      failure: String(card.run.ending.failure),
    },
    reel: card.run.reel,
    costCents: card.run.costCents,
    estimateCents: card.run.estimateCents,
    wallClockSeconds: card.run.wallClockSeconds,
    stages: card.run.stages,
    plan: {
      shots: card.parts.plan.shots,
      subjects: card.parts.plan.subjects,
      subjectsPerShot: perShot,
      secondsPerShot: card.parts.plan.secondsPerShot,
      totalSeconds: card.parts.plan.totalSeconds,
      maxSubjectsPerShot: card.parts.plan.maxSubjectsPerShot,
    },
    counts: {
      picturesAttempted: card.parts.pictures.attempted,
      picturesChosen: card.parts.pictures.chosen,
      shotsDegraded: card.parts.pictures.shotsDegradedThisRunMade,
      narrations: card.parts.narration.items.length,
      takes: card.parts.clips.items.length,
    },
    // The part scores, without their terms: a term's achieved-over-attempted is the run view's,
    // and sending every one of them for every run is what the second payload exists to avoid.
    rating: {
      rating: rating.rating,
      label: rating.label,
      stamp: rating.stamp,
      partial: rating.partial,
      parts: Object.fromEntries(
        PART_NAMES.map((part) => [
          part,
          {
            rating: rating.parts[part].rating,
            reached: rating.parts[part].reached,
            inherited: rating.parts[part].inherited,
          },
        ]),
      ),
    },
    pictures,
  }
}

/** Every finished run of the record, in the order the loader returns them. */
export function fleetPayload(record: StoredRecord): FleetPayload {
  const runs: FleetRun[] = []
  for (const runId of record.runIds()) {
    const rows = record.rowsOf(runId)
    if (!finished(rows)) continue
    runs.push(fleetRun(rows))
  }
  return scrubbed({ runs }, record.scrub) as FleetPayload
}

// ---------------------------------------------------------------- one run

export interface RunPayload {
  run: Record<string, unknown>
  parts: Record<string, unknown>
  rating: Record<string, unknown>
  /**
   * Gate 7's questions WITH THEIR ANSWERS, which the scorecard does not carry: it counts how
   * many were asked and answered yes and names the ones that were not. Gate 2 renders the
   * questions and their answers, so they are read from the render's own blob here.
   */
  gate7Answers: Array<{ question: string; answer: string }>
}

/** One run's full scorecard, or nothing at all when no FINISHED run of that id is held. */
export function runPayload(record: StoredRecord, runId: string): RunPayload | undefined {
  const rows = record.rowsOf(runId)
  if (!finished(rows)) return undefined
  const card = scorecard(rows, { hash })
  const gate7 = parsed<Gate7Blob>(rows.render[0]?.gate7)
  const payload: RunPayload = {
    run: { ...card.run, createdAt: String(rows.run.created_at) },
    parts: card.parts,
    rating: { ...runRating(rows, { hash }) },
    gate7Answers: (gate7?.answer ?? []).map((one) => ({
      question: String(one.question ?? ''),
      answer: String(one.answer ?? ''),
    })),
  }
  return scrubbed(payload, record.scrub) as RunPayload
}
