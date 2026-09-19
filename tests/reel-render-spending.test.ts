import assert from 'node:assert/strict'
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { DEFAULT_PLAN_SETTINGS } from '@cutroom/pipeline'
import type { SubmitRequest } from '@cutroom/reel-contract'
import { REPO } from './_repo.ts'
import {
  TEST_RENDER_SETTINGS,
  startEngine,
  type Engine,
  type EngineOptions,
} from './engine/harness.ts'
import { THREE_RANKS, THREE_RANKS_PICS, inTurn, type Pic } from './engine/stills.ts'
import {
  described,
  holding,
  readVideo,
  reconcilesTake,
  takesOf,
  video,
  videoFinished,
  videoRequest,
  videoScript,
  whenHeld,
  type Videoed,
} from './engine/video.ts'

// reel-render, Slice 5 — checks 42 to 45 (docs/features/reel-render.md): spending while the narration
// and the clips are made (S-035, S-036, S-053, S-059, S-070, S-071, D-081, D-100). Before every
// narration and clip call the worker's guard reads the chain's spend again and compares it plus the
// call's figure — the text's characters at the narration rate, or the requested seconds at the video
// rate, rounded up — with the per-reel cap the job read, then with the caller's ceiling. A call that
// would pass either is not made, and the run stops for budget. A stand-in costs nothing unless a test
// scripts a cost on it (S-036), so every figure below is scripted and worked out BY HAND.
//
// The fixture's six narrations, by hand (reel-render's check 13: 300 ms a word and 200 ms after it):
// units of 18, 14, 6, 6, 4 and 10 words are 9, 7, 3, 3, 2 and 5 seconds long, so their clips ask for
// 9, 7, 5, 5, 5 and 5 seconds; their texts are 82, 83, 34, 32, 26 and 52 characters.

const S = DEFAULT_PLAN_SETTINGS
const [, , , hall] = THREE_RANKS_PICS as [Pic, Pic, Pic, Pic]
const takes = takesOf(THREE_RANKS)

const N = (unit: number) => `a1-shot-${unit}-narration`
const T = (unit: number) => `a1-shot-${unit}-take-1`

/** The pinned BUDGET.md with its per-reel row set to `figure` (D-100: the cap is read from it). */
function budgetWithCap(figure: string): string {
  const real = readFileSync(join(REPO, 'steering-ref', 'steering', 'BUDGET.md'), 'utf8')
  const row = '| Per reel, all-in | **$3.00** |'
  assert.ok(real.includes(row), "the pinned BUDGET.md's per-reel row is not $3.00")
  return real.replace(row, `| Per reel, all-in | **${figure}** |`)
}

/** The repository's own questions file, as it is now. */
const repoQuestions = () => {
  const path = join(REPO, 'QUESTIONS.md')
  return existsSync(path) ? readFileSync(path, 'utf8') : null
}

const entries = (text: string) => text.split(/^(?=## )/m).filter((c) => c.startsWith('## '))

/**
 * One video run in an engine of its own. `asked` is whether the engine's questions file existed when
 * the run had finished — read BEFORE the engine is stopped, since stopping removes its folder.
 */
async function one(
  request: SubmitRequest,
  options: Omit<EngineOptions, 'worker'>,
): Promise<{ ran: Videoed; engine: Engine; asked: boolean }> {
  const engine = await startEngine({ worker: true, ...options })
  try {
    const ran = await video(engine, request)
    return { ran, engine, asked: existsSync(engine.questionsPath) }
  } finally {
    await engine.stop()
  }
}

/** What the stand-ins were asked for, whether or not the call returned. */
const asked = (engine: Engine) => ({
  narrations: engine.narration.calls.map((c) => c.narrationId),
  clips: engine.video.calls.map((c) => c.takeId),
})

/** The receipts the tables hold, as `[id, cost]`, in the order written. */
const costs = (ran: Videoed) => ({
  speech: ran.speechReceipts.map((r) => [r.narration_id, r.cost_cents]),
  video: ran.videoReceipts.map((r) => [r.take_id, r.cost_cents]),
})

/** The chain's spend as its job rows hold it: what the guard reads (D-081, S-036). */
const chainSpend = (ran: Videoed) => ran.jobs.reduce((sum, job) => sum + job.cost_cents, 0)

// ---------------------------------------------------------------- 42

/**
 * `videoRequest` with shot 2's one sentence spelled with a letter outside the Basic Multilingual
 * Plane — 'pope' with U+1D52D, MATHEMATICAL FRAKTUR SMALL P: one character, and two UTF-16 units. The
 * narration is 34 characters as Unicode counts them, and 35 as a JavaScript string's length does
 * (S-088).
 */
function astral(requestId: string, budgetCents: number): SubmitRequest {
  const request = videoRequest(requestId, budgetCents)
  const plain = 'Within weeks the pope annulled it.'
  const spelled = 'Within weeks the \u{1D52D}ope annulled it.'
  assert.equal(request.narration[4]?.text, plain, "the fixture's shot 2 is not its fifth sentence")
  assert.equal([...spelled].length, 34)
  assert.equal(spelled.length, 35)
  return {
    ...request,
    narration: request.narration.map((s, i) => (i === 4 ? { ...s, text: spelled } : s)),
  }
}

/**
 * Check 42's fixture. A video rate of 4.5 cents a second and a narration rate of 0.75 cents a
 * character, so each figure has a fraction to round up. The plan's estimate is 4 pictures at 15 and
 * 40 seconds at 4.5, 240 cents, so each ceiling below admits the run. The spend, by hand:
 *
 * - the hall's picture costs 150 (the keyframes job's row); every other picture 0;
 * - shot 0: narration 150 + 82 × 0.75 = 211.5 → 212, made, costs 0; clip 150 + 9 × 4.5 = 190.5 → 191,
 *   made, costs 20;
 * - shot 1: narration 170 + 83 × 0.75 = 232.25 → 233, made, costs 10; clip 180 + 7 × 4.5 = 211.5 →
 *   212, made, costs 36;
 * - shot 2: narration 216 + 34 × 0.75 = 241.5 → **242** — at 35 characters it would be 242.25 → 243;
 *   costs 4 when made. Its clip 220 + 5 × 4.5 = 242.5 → **243**, costs 0 when made;
 * - shot 3: narration 220 + 32 × 0.75 = **244**.
 */
const SPENDING: Omit<EngineOptions, 'worker'> = {
  settings: { ...S, videoRateCentsPerSecond: 4.5 },
  renderSettings: { ...TEST_RENDER_SETTINGS, narrationRateCentsPerCharacter: 0.75 },
  images: { [hall.key]: { costCents: 150 } },
  narration: { 'shot-1-narration': { costCents: 10 }, 'shot-2-narration': { costCents: 4 } },
  video: { 'shot-0-take-1': { costCents: 20 }, 'shot-1-take-1': { costCents: 36 } },
  script: videoScript(THREE_RANKS, THREE_RANKS_PICS, { takes: takes.slice(0, 3) }),
}

test("42. before every narration and clip call the guard reads the chain's spend again and compares it plus the call's figure — characters × the narration rate, or seconds × the video rate, rounded up — with the cap, then the ceiling; exactly equal is made, and one cent over is refused", async () => {
  /** One run of the fixture under a cap and a ceiling, stopped for budget with these figures. */
  const stopped = async (
    requestId: string,
    limits: { capCents: number; ceilingCents: number },
    expected: { limit: 'reel' | 'ceiling'; spent: number; estimate: number },
  ) => {
    const options =
      limits.capCents === 300
        ? SPENDING
        : { ...SPENDING, budgetMd: budgetWithCap(`$${(limits.capCents / 100).toFixed(2)}`) }
    const { ran, engine } = await one(astral(requestId, limits.ceilingCents), options)
    assert.deepEqual(
      ran.result,
      {
        contractVersion: 1,
        runId: ran.runId,
        requestId,
        costCents: expected.spent,
        status: 'stopped',
        reason: 'budget',
        limit: expected.limit,
        estimateCents: expected.estimate,
        ...limits,
      },
      requestId,
    )
    // What the guard compared is what the run's rows say was spent — the chain's, the keyframes
    // job's picture included — plus the refused call's figure.
    assert.equal(chainSpend(ran), expected.spent, `${requestId}: the spend is not the chain's`)
    assert.deepEqual(
      ran.jobs.map((j) => [j.kind, j.cost_cents]),
      [
        ['reel.plan', 0],
        ['reel.keyframes', 150],
        ['reel.clips', expected.spent - 150],
      ],
      requestId,
    )
    return { ran, engine }
  }

  /** Stopped at shot 2's narration, 242: two shots made, and no call, receipt or row for the third. */
  const atNarration = ({ ran, engine }: { ran: Videoed; engine: Engine }) => {
    assert.deepEqual(asked(engine), { narrations: [N(0), N(1)], clips: [T(0), T(1)] })
    assert.deepEqual(costs(ran), {
      speech: [
        [N(0), 0],
        [N(1), 10],
      ],
      video: [
        [T(0), 20],
        [T(1), 36],
      ],
    })
    assert.deepEqual(
      ran.narrations.map((n) => n.narration_id),
      [N(0), N(1)],
    )
  }
  /** Stopped at shot 2's clip, 243: its narration made, and no call, receipt or row for its clip. */
  const atClip = ({ ran, engine }: { ran: Videoed; engine: Engine }) => {
    assert.deepEqual(asked(engine), { narrations: [N(0), N(1), N(2)], clips: [T(0), T(1)] })
    assert.deepEqual(costs(ran), {
      speech: [
        [N(0), 0],
        [N(1), 10],
        [N(2), 4],
      ],
      video: [
        [T(0), 20],
        [T(1), 36],
      ],
    })
    assert.deepEqual(
      ran.takes.map((t) => t.take_id),
      [T(0), T(1)],
    )
  }
  /** Stopped at shot 3's narration, 244: shot 2's clip made. */
  const atNext = ({ ran, engine }: { ran: Videoed; engine: Engine }) => {
    assert.deepEqual(asked(engine), { narrations: [N(0), N(1), N(2)], clips: [T(0), T(1), T(2)] })
    assert.deepEqual(costs(ran).video, [
      [T(0), 20],
      [T(1), 36],
      [T(2), 0],
    ])
  }

  // Each limit alone, at 241, 242 and 243: the ceiling under the pinned cap of 300, then the cap —
  // read from BUDGET.md — under a ceiling one cent above it, which no call reaches.
  for (const limit of ['ceiling', 'reel'] as const) {
    const limits = (cents: number) =>
      limit === 'ceiling'
        ? { capCents: 300, ceilingCents: cents }
        : { capCents: cents, ceilingCents: cents + 1 }

    // One cent under shot 2's narration: at 242 it is one cent over, and is not made.
    atNarration(
      await stopped(`r42-${limit}-241`, limits(241), { limit, spent: 216, estimate: 242 }),
    )
    // Exactly shot 2's narration: it is made; its clip, at 243, is one cent over, and is not.
    atClip(await stopped(`r42-${limit}-242`, limits(242), { limit, spent: 220, estimate: 243 }))
    // Exactly shot 2's clip: it is made; shot 3's narration, at 244, is not.
    atNext(await stopped(`r42-${limit}-243`, limits(243), { limit, spent: 220, estimate: 244 }))
  }

  // Past both at once, the cap is compared first, and it is the limit the caller is told — by the
  // narration guard, then by the clip guard.
  atNarration(
    await stopped(
      'r42-both-241',
      { capCents: 241, ceilingCents: 241 },
      { limit: 'reel', spent: 216, estimate: 242 },
    ),
  )
  atClip(
    await stopped(
      'r42-both-242',
      { capCents: 242, ceilingCents: 242 },
      { limit: 'reel', spent: 220, estimate: 243 },
    ),
  )
})

// ---------------------------------------------------------------- 43

test("43. a clip scripted to cost more than its rate stops the run for budget before the next call, with limit ceiling, estimateCents the spend plus the next call's figure, the ceiling, the cap and costCents the spend, every narration and take made in the tables; no question is written", async () => {
  // The video rate is 4 cents a second, and shot 1's clip asks for 7 seconds: its figure is 28, and
  // it costs 250. At a narration rate of 0.5, shot 2's narration — 34 characters — would be 250 + 17
  // = 267: above the ceiling of 240, within the cap of 300. The plan's estimate is 220.
  const {
    ran,
    engine,
    asked: questioned,
  } = await one(videoRequest('r43', 240), {
    renderSettings: { ...TEST_RENDER_SETTINGS, narrationRateCentsPerCharacter: 0.5 },
    video: { 'shot-1-take-1': { costCents: 250 } },
    script: videoScript(THREE_RANKS, THREE_RANKS_PICS, { takes: takes.slice(0, 2) }),
  })
  assert.deepEqual(ran.result, {
    contractVersion: 1,
    runId: ran.runId,
    requestId: 'r43',
    costCents: 250,
    status: 'stopped',
    reason: 'budget',
    limit: 'ceiling',
    estimateCents: 267,
    ceilingCents: 240,
    capCents: 300,
  })
  assert.equal(chainSpend(ran), 250)

  // Stopped before the next call: shot 2's narration was not asked for.
  assert.deepEqual(asked(engine), { narrations: [N(0), N(1)], clips: [T(0), T(1)] })

  // Every narration and take made is in the tables, with each gate it reached and its receipt.
  assert.deepEqual(
    ran.narrations.map((n) => [n.narration_id, n.words?.length, n.probe?.durationSeconds]),
    [
      [N(0), 18, 9],
      [N(1), 14, 7],
    ],
  )
  assert.deepEqual(
    ran.takes.map((t) => [t.take_id, t.verdicts.map((v) => v.gate), t.outcome]),
    [
      [T(0), ['2', '3', '4', '5'], 'accept'],
      [T(1), ['2', '3', '4', '5'], 'accept'],
    ],
  )
  assert.deepEqual(costs(ran), {
    speech: [
      [N(0), 0],
      [N(1), 0],
    ],
    video: [
      [T(0), 0],
      [T(1), 250],
    ],
  })
  assert.deepEqual(
    ran.takeObservations.map((o) => o.take_id),
    [T(0), T(1)],
  )
  assert.deepEqual(
    ran.takeReconciliations.map((r) => r.take_id),
    [T(0), T(1)],
  )
  const events = described(ran.events)
  assert.ok(!events.includes('stage.finished video'), 'a stopped stage has stage.finished')
  assert.equal(events.at(-1), 'run.finished stopped')
  assert.ok(!ran.jobs.some((j) => j.kind === 'reel.assemble'), 'a reel.assemble row was created')

  // The caller's ceiling fired, not the engine's cap: no question (D-100).
  assert.equal(questioned, false, 'a stop at the ceiling wrote a question')
})

// ---------------------------------------------------------------- 44

test('44. a narration call whose figure, at a scripted narration rate, would pass the ceiling is not made, and the run stops for budget', async () => {
  // At 2.75 cents a character, shot 0's narration is 82 × 2.75 = 225.5 → 226, exactly the ceiling,
  // and is made; shot 1's is 83 × 2.75 = 228.25 → 229, and is not. Nothing costs anything: the rate
  // is what is compared, and the spend is 0. The plan's estimate is 220.
  const { ran, engine } = await one(videoRequest('r44', 226), {
    renderSettings: { ...TEST_RENDER_SETTINGS, narrationRateCentsPerCharacter: 2.75 },
    script: videoScript(THREE_RANKS, THREE_RANKS_PICS, { takes: takes.slice(0, 1) }),
  })
  assert.deepEqual(ran.result, {
    contractVersion: 1,
    runId: ran.runId,
    requestId: 'r44',
    costCents: 0,
    status: 'stopped',
    reason: 'budget',
    limit: 'ceiling',
    estimateCents: 229,
    ceilingCents: 226,
    capCents: 300,
  })
  assert.deepEqual(asked(engine), { narrations: [N(0)], clips: [T(0)] })
  assert.deepEqual(
    ran.speechReceipts.map((r) => [r.narration_id, r.rate_cents]),
    [[N(0), 2.75]],
  )
  assert.deepEqual(
    ran.narrations.map((n) => n.narration_id),
    [N(0)],
  )
  assert.equal(described(ran.events).at(-1), 'run.finished stopped')
})

// ---------------------------------------------------------------- 45

test('45. a clip or narration call that would pass the per-reel cap stops the run with limit reel and appends one question entry naming it after the run is finished', async () => {
  const before = repoQuestions()
  const cap = budgetWithCap('$2.40')

  // A clip: the hall's picture costs 210, so shot 0's clip — 210 + 9 × 4 = 246 — passes the cap of
  // 240, under a ceiling of 1000. The plan's estimate is 220, within both. Each run makes no take, so
  // the script holds the stills' answers once per run.
  const clipOptions = {
    budgetMd: cap,
    images: { [hall.key]: { costCents: 210 } },
    script: inTurn(
      videoScript(THREE_RANKS, THREE_RANKS_PICS, { takes: [] }),
      videoScript(THREE_RANKS, THREE_RANKS_PICS, { takes: [] }),
    ),
  }
  const engine = await startEngine({ worker: true, ...clipOptions })
  try {
    assert.equal(existsSync(engine.questionsPath), false)
    const ran = await video(engine, videoRequest('r45-clip', 1000))
    assert.deepEqual(ran.result, {
      contractVersion: 1,
      runId: ran.runId,
      requestId: 'r45-clip',
      costCents: 210,
      status: 'stopped',
      reason: 'budget',
      limit: 'reel',
      estimateCents: 246,
      ceilingCents: 1000,
      capCents: 240,
    })
    assert.deepEqual(asked(engine), { narrations: [N(0)], clips: [] })

    // One entry, naming the clip that was refused, the run and the request, with the figures.
    const text = readFileSync(engine.questionsPath, 'utf8')
    const asked45 = entries(text)
    assert.equal(asked45.length, 1, `${asked45.length} entries for one stop`)
    const entry = asked45[0] as string
    const heading = entry.split('\n')[0] as string
    assert.match(heading, /stopped/, 'the heading does not say it stopped')
    assert.match(heading, /clip/, 'the heading does not say a clip was refused')
    assert.ok(heading.includes(T(0)), `the heading does not name ${T(0)}: ${heading}`)
    assert.ok(entry.includes(ran.runId), 'the entry does not name the run')
    assert.ok(entry.includes('r45-clip'), 'the entry does not name the request')
    for (const figure of [
      '**Estimate:** 246 cents',
      '**Spent:** 210 cents',
      '**Per-reel cap:** 240 cents',
      '**Ceiling:** 1000 cents',
    ]) {
      assert.ok(entry.includes(figure), `the entry lacks "${figure}":\n${entry}`)
    }

    // A second stop APPENDS a second entry and leaves the first as it was.
    const again = await video(engine, videoRequest('r45-clip-again', 1000))
    assert.equal(again.result.limit, 'reel', JSON.stringify(again.result))
    const second = readFileSync(engine.questionsPath, 'utf8')
    assert.ok(second.startsWith(text), 'the second stop rewrote the first entry')
    const both = entries(second)
    assert.equal(both.length, 2)
    assert.ok(both[1]?.includes(again.runId))
  } finally {
    await engine.stop()
  }

  // A narration: shot 0's clip costs 250, so shot 1's narration — 250 + 83 × 0 — passes the cap. While
  // the stage runs, BUDGET.md is rewritten to $9.00: the cap compared is the one the job read when its
  // attempt began (S-059), and it is the one the entry names.
  const hold = holding({ call: 'structured', matches: reconcilesTake('shot-0-take-1') })
  const narrated = await startEngine({
    worker: true,
    budgetMd: cap,
    video: { 'shot-0-take-1': { costCents: 250 } },
    script: videoScript(THREE_RANKS, THREE_RANKS_PICS, { takes: takes.slice(0, 1) }),
    wrapModel: hold.wrap,
  })
  try {
    const submitted = await narrated.http.submit(videoRequest('r45-narration', 1000))
    const runId = String(submitted.json.runId)
    await whenHeld(narrated, runId, hold.reached)
    writeFileSync(String(narrated.budgetPath), budgetWithCap('$9.00'))
    hold.release()
    await videoFinished(narrated, runId)
    const ran = await readVideo(narrated, runId)
    assert.deepEqual(ran.result, {
      contractVersion: 1,
      runId,
      requestId: 'r45-narration',
      costCents: 250,
      status: 'stopped',
      reason: 'budget',
      limit: 'reel',
      estimateCents: 250,
      ceilingCents: 1000,
      capCents: 240,
    })
    assert.deepEqual(asked(narrated), { narrations: [N(0)], clips: [T(0)] })
    const asked45 = entries(readFileSync(narrated.questionsPath, 'utf8'))
    assert.equal(asked45.length, 1)
    const entry = asked45[0] as string
    const heading = entry.split('\n')[0] as string
    assert.match(heading, /narration/, 'the heading does not say a narration was refused')
    assert.ok(heading.includes(N(1)), `the heading does not name ${N(1)}: ${heading}`)
    assert.ok(entry.includes(runId))
    for (const figure of [
      '**Estimate:** 250 cents',
      '**Spent:** 250 cents',
      '**Per-reel cap:** 240 cents',
    ]) {
      assert.ok(entry.includes(figure), `the entry lacks "${figure}":\n${entry}`)
    }
  } finally {
    hold.release()
    await narrated.stop()
  }

  // AFTER the run is finished: with the questions file unwritable — a folder stands where it would
  // go — the append fails, and the run has still finished, stopped, with every figure. An append
  // made before the finishing transaction would have left the run unfinished.
  const blocked = await startEngine({ worker: false, ...clipOptions })
  try {
    mkdirSync(blocked.questionsPath)
    await blocked.startWorker()
    const ran = await video(blocked, videoRequest('r45-blocked', 1000))
    assert.equal(ran.result.status, 'stopped', JSON.stringify(ran.result))
    assert.equal(ran.result.limit, 'reel')
    assert.equal(ran.result.estimateCents, 246)
    assert.ok(statSync(blocked.questionsPath).isDirectory())
  } finally {
    await blocked.stop()
  }
  assert.equal(repoQuestions(), before, "the repository's own questions file was written")
})
