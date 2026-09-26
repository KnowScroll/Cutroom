import type {
  FailureKind,
  Piece,
  Plan,
  ResumeAdmission,
  ResumeBy,
  ResumeInputs,
  ResumePlanned,
  ResumeRates,
} from '@cutroom/contracts'
import type { SubmitRequest } from '@cutroom/reel-contract'
import { TAKES_A_SHOT } from '../clips/ladder.ts'
import { narrationText, requestedSeconds } from '../clips/narration.ts'
import { unmadeCalls } from '../stills/ladder.ts'
import { placePictures, shotIdOf } from '../stills/place.ts'

// How a failed run is resumed (docs/features/resume-failed.md, Gate 2 "How a resume is planned,
// admitted and made"; S-157, S-161 to S-164). Pure: one planner for a caller's preview, a caller's call
// and the engine's own resume, handed what the failed run holds and the rates the worker prices at,
// so the three can never plan one resume two ways. It decides what is kept and what is made again,
// and what the first calls still to make cost; `resumeRun` in the domain copies what it keeps.

/** A failure by a provider's fault: the kinds a resume is made after, by the engine or a caller (S-163). */
const PROVIDER_FAULTS: readonly FailureKind[] = [
  'unavailable',
  'unreadable',
  'provider-failed',
  'crashed',
]

/** The order a shot's pieces are listed in (S-161). */
const KINDS: ReadonlyArray<Piece['kind']> = ['still', 'narration', 'clip']

type Until = SubmitRequest['options']['until']

/** A list of pieces, or why it names none that exists. */
export type Normalised = { pieces: Piece[] } | { invalid: string }

/** The pieces in shot order, then still, narration, clip, each once (S-161). */
function sorted(pieces: ReadonlyMap<string, { unit: number; kind: Piece['kind'] }>): Piece[] {
  return [...pieces.values()]
    .sort((x, y) => x.unit - y.unit || KINDS.indexOf(x.kind) - KINDS.indexOf(y.kind))
    .map(({ unit, kind }) => ({ kind, shot: shotIdOf(unit) }))
}

/**
 * The caller's named pieces as one list (S-161): each piece with no shot expanded to every shot that
 * has that piece BY THE PLAN — a still where it places a picture, a narration and a clip on every shot
 * of a video run — duplicates dropped, in shot order and then still, narration, clip. By the plan,
 * never by the rows, so the list stored and compared does not depend on what the failed run happened
 * to finish. A shot outside the plan, a still on a shot the plan gives no picture, a narration or a
 * clip on a run that makes none, and any piece of a run with no selected plan are refused.
 */
export function normalise(pieces: readonly Piece[], plan: Plan | null, until: Until): Normalised {
  if (pieces.length === 0) return { pieces: [] }
  if (plan === null) {
    return { invalid: 'the run has no selected plan to name a piece by (S-161)' }
  }
  const units = plan.shots.map((shot) => shot.unit)
  const placed = new Set(placePictures(plan).map((p) => p.shotUnit))
  const has = (kind: Piece['kind'], unit: number) =>
    kind === 'still' ? placed.has(unit) : until === 'video'
  const out = new Map<string, { unit: number; kind: Piece['kind'] }>()
  const add = (unit: number, kind: Piece['kind']) => out.set(`${unit}:${kind}`, { unit, kind })
  for (const piece of pieces) {
    if (piece.kind !== 'still' && until !== 'video') {
      return { invalid: `a ${until} run has no ${piece.kind} to make again (S-161)` }
    }
    if (piece.shot === undefined) {
      for (const unit of units) if (has(piece.kind, unit)) add(unit, piece.kind)
      continue
    }
    const named = /^shot-(\d+)$/.exec(piece.shot)
    const unit = named === null ? Number.NaN : Number(named[1])
    if (!units.includes(unit)) {
      return { invalid: `${piece.shot} is not a shot of the plan (S-161)` }
    }
    if (!has(piece.kind, unit)) {
      return { invalid: `${piece.shot} has no still: the plan places no picture on it (S-161)` }
    }
    add(unit, piece.kind)
  }
  return { pieces: sorted(out) }
}

/**
 * What the named pieces take down with them (S-161): a still its shot's clip, and the canonical's
 * still every derived shot's still and clip, each drawn from it (D-026); a standalone's still its own
 * shot only (S-150); a narration its shot's clip, which is timed to it; a clip itself. The cut and
 * Gate 7 are always made again. Normalised as the named list is.
 */
export function takedown(named: readonly Piece[], plan: Plan, until: Until): Piece[] {
  const placements = placePictures(plan)
  const canonical = placements.find((p) => p.role === 'canonical')
  const derived = placements.filter((p) => p.role === 'derived')
  const video = until === 'video'
  const down = new Map<string, { unit: number; kind: Piece['kind'] }>()
  const add = (unit: number, kind: Piece['kind']) => down.set(`${unit}:${kind}`, { unit, kind })
  for (const piece of named) {
    const unit = Number(/^shot-(\d+)$/.exec(piece.shot ?? '')?.[1] ?? Number.NaN)
    add(unit, piece.kind)
    if (piece.kind === 'narration') add(unit, 'clip')
    if (piece.kind !== 'still') continue
    if (video) add(unit, 'clip')
    if (canonical === undefined || canonical.shotUnit !== unit) continue
    for (const d of derived) {
      add(d.shotUnit, 'still')
      if (video) add(d.shotUnit, 'clip')
    }
  }
  return sorted(down)
}

/** The two pieces lists as equal: the same pieces in the same order. */
function same(stored: string, named: readonly Piece[]): boolean {
  const parsed = JSON.parse(stored) as Piece[]
  return (
    parsed.length === named.length &&
    parsed.every((p, i) => p.kind === named[i]?.kind && p.shot === named[i]?.shot)
  )
}

/**
 * Why the table of resumable endings refuses this run to `by`, or null (docs/features/resume-failed.md,
 * Gate 2 "Which endings are resumed, and who judges"; S-157, S-161, S-163).
 */
function refusal(inputs: ResumeInputs, by: ResumeBy): string | null {
  const { runId, result, failure } = inputs
  if (inputs.resumes !== null) {
    return `run ${runId} resumes run ${inputs.resumes}, and a resume is never resumed: one in all (S-162)`
  }
  if (result === null)
    return `run ${runId} has not finished, so there is nothing to resume yet (S-161)`
  const fault = result.status === 'failed' && failure !== null && PROVIDER_FAULTS.includes(failure)
  const gate7 = result.status === 'stopped' && result.reason === 'rule' && result.rule === 'gate-7'
  if (by === 'engine') {
    if (!fault) {
      return `run ${runId} ended ${ending(inputs)}, and the engine resumes only a failure by a provider's fault — unavailable, unreadable, provider-failed or crashed (S-163)`
    }
    if (inputs.cancelRequested) {
      return `run ${runId}'s caller asked to cancel it, so the engine does not resume it (S-163)`
    }
    return null
  }
  if (fault || gate7) return null
  return `run ${runId} ended ${ending(inputs)}, and only a failure by a provider's fault — unavailable, unreadable, provider-failed or crashed — or a stop at Gate 7 is resumed (S-157, S-161, S-163)`
}

/** How a run ended, in words: its status, and its kind or its rule. */
function ending({ result, failure }: ResumeInputs): string {
  if (result === null) return 'running'
  if (result.status === 'failed') return `failed ${failure ?? 'before its kind was kept'}`
  if (result.status === 'stopped' && result.reason === 'rule')
    return `stopped for rule ${result.rule}`
  if (result.status === 'stopped' || result.status === 'refused') {
    return `${result.status} for ${result.reason}`
  }
  return result.status
}

/**
 * Plans a resume of the failed run `inputs` holds, for its caller or for the engine (S-161 to S-164).
 *
 * The named pieces are normalised FIRST, so a call made again is recognised as that call before
 * anything else refuses it. A run resumed already is answered with the run that resumed it —
 * `replayed` for the list it stored, `resumed` for any other, or when the engine made it — and never
 * resumed twice. Then the table of resumable endings: the engine resumes a provider's fault its caller
 * did not ask to cancel; a caller, that or a stop at Gate 7.
 *
 * A run with no selected plan — failed in its plan stage — plans again, keeping nothing and costing
 * nothing (S-163). Every other keeps every plan row, every decided picture, finished narration and
 * decided take the named pieces do not take down, and starts at its pictures. The estimate is the first
 * calls still to make, priced at `rates` and rounded up once: the first calls of the placements no kept
 * picture satisfies, and, for a video run, the requested seconds of every shot with no kept accepted
 * take and not held on three kept failed takes — from its kept narration's measure, else the plan's —
 * and the characters of every narration not kept. No repair, no retry, no reserve, as the plan's own
 * estimate counts none (S-035).
 */
export function planResume(
  inputs: ResumeInputs,
  remake: readonly Piece[],
  rates: ResumeRates,
  by: ResumeBy,
): ResumePlanned {
  const until = inputs.request.options.until
  const normal = normalise(remake, inputs.plan, until)
  if ('invalid' in normal) return { outcome: 'refused', reason: 'invalid', detail: normal.invalid }
  const named = normal.pieces

  const resumedBy = inputs.resumedBy
  if (resumedBy !== null) {
    const detail = `run ${inputs.runId} was resumed already, by run ${resumedBy.runId}: one in all (S-162)`
    if (by === 'engine') return { outcome: 'refused', reason: 'not-resumable', detail }
    if (resumedBy.remake !== null && same(resumedBy.remake, named)) {
      return { outcome: 'replayed', runId: resumedBy.runId }
    }
    return { outcome: 'resumed', runId: resumedBy.runId, detail }
  }
  const refused = refusal(inputs, by)
  if (refused !== null) return { outcome: 'refused', reason: 'not-resumable', detail: refused }

  const plan = inputs.plan
  if (plan === null) {
    return {
      outcome: 'planned',
      plan: {
        start: 'plan',
        keep: { plans: [], pictures: [], narrations: [], takes: [] },
        named: [],
        remade: [],
        estimateCents: 0,
      },
    }
  }

  const remade = takedown(named, plan, until)
  const isDown = (kind: Piece['kind'], unit: number) =>
    remade.some((p) => p.kind === kind && p.shot === shotIdOf(unit))
  const pictures = inputs.pictures.filter((p) => !isDown('still', p.shotUnit))
  const narrations = inputs.narrations.filter((n) => !isDown('narration', n.shotUnit))
  const takes = inputs.takes.filter((t) => !isDown('clip', t.shotUnit))

  let cents = unmadeCalls(placePictures(plan), pictures) * rates.imageRateCents
  if (until === 'video') {
    let seconds = 0
    let characters = 0
    for (const shot of plan.shots) {
      const own = takes.filter((t) => t.shotUnit === shot.unit)
      const accepted = own.some((t) => t.outcome === 'accept')
      const held = own.filter((t) => t.outcome === 'fail').length >= TAKES_A_SHOT
      const narrated = narrations.find((n) => n.shotUnit === shot.unit)
      if (!accepted && !held) {
        seconds +=
          narrated === undefined ? shot.durationSeconds : requestedSeconds(narrated.durationSeconds)
      }
      // A character is a code point, as the narration guard counts it (S-088).
      if (narrated === undefined)
        characters += [...narrationText(shot.unit, plan, inputs.request)].length
    }
    cents +=
      seconds * rates.videoRateCentsPerSecond + characters * rates.narrationRateCentsPerCharacter
  }

  return {
    outcome: 'planned',
    plan: {
      start: 'keyframes',
      keep: {
        plans: [...inputs.plans],
        pictures: pictures.map((p) => p.pictureId),
        narrations: narrations.map((n) => n.narrationId),
        takes: takes.map((t) => t.takeId),
      },
      named,
      remade,
      estimateCents: Math.ceil(cents),
    },
  }
}

/**
 * A resume admitted, or the limit it would pass (D-100, S-059, S-161): the figure compared is what the
 * reel has spent — the failed run and any run it resumes — plus the resume's estimate; over the
 * per-reel cap is `reel`, else over the caller's ceiling is `ceiling`, the cap named first as every
 * guard names it; exactly equal is admitted.
 */
export function admitResume(
  spentCents: number,
  estimateCents: number,
  capCents: number,
  ceilingCents: number,
): ResumeAdmission {
  const figure = spentCents + estimateCents
  if (figure > capCents) return { admitted: false, limit: 'reel', estimateCents: figure }
  if (figure > ceilingCents) return { admitted: false, limit: 'ceiling', estimateCents: figure }
  return { admitted: true, estimateCents: figure }
}
