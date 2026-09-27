#!/usr/bin/env node
/**
 * ONE REAL REEL, MADE BY HAND, AND WHAT IT SPENT (S-111, docs/features/paid-path.md, check 20).
 *
 *   node --experimental-strip-types --no-warnings scripts/real-reel.mjs
 *   node --experimental-strip-types --no-warnings scripts/real-reel.mjs --resume <runId>
 *   node --experimental-strip-types --no-warnings scripts/real-reel.mjs --resume <runId> --remake still:shot-1
 *
 * THIS IS THE ONLY THING IN THIS REPOSITORY THAT SPENDS MONEY, and it is run by a person and by
 * nothing else. No test file names it and no step of `scripts/check.mjs` names it — check 20 is
 * what holds that, because a script that spends and could be reached by a suite is a suite that
 * spends (S-111, and four verified features' Gate 1).
 *
 * WHAT IT DOES, IN ORDER, WHEN SUBMITTING A NEW REEL:
 *
 *  1. Reads the settings a service would read, with every port told to be REAL, and PRINTS THE
 *     ESTIMATE — computed from `estimate()`, the same function admission uses, over the corners
 *     of the shapes Gate 0 admits (D-111's 35 to 45 seconds, 0 to 4 planned image calls — S-150).
 *  2. WAITS. Nothing is started, no key is read into a port and nothing is submitted until the
 *     ceiling is typed back on standard input. Typing the figure back is what makes a confirmation
 *     impossible to give by accident, and it proves the estimate was read.
 *  3. Before `startService` reads the runs the engine would otherwise claim, the script asks which
 *     of them to leave alone and which to cancel, through `@cutroom/service`'s `waitingRuns` and
 *     `cancelRuns` — the read-only observation is a `better-sqlite3` connection the service opens
 *     for the script (S-163).
 *  4. Starts the engine — the same `startService` `apps/service`'s own program starts — submits
 *     ONE request under the ceiling through `makeReel`, and follows its events.
 *  5. While polling, reads `resumedBy` on every status check; when the engine has made a successor
 *     for the followed run, the script names the wait, follows the new run, and keeps the service
 *     alive until that final run ends. The engine's resume lands inside the engine (Slice 5).
 *  6. Prints WHAT IT SPENT: every receipt, its rate and its cost, the totals by kind, and the
 *     latency of the whole run and of each clip, which is the figure `parallel-shots` cannot be
 *     planned without (S-115).
 *
 * WHAT IT DOES, IN ORDER, WHEN RESUMING (`--resume <runId>`):
 *
 *  1. Reads the settings a service would read and asks the same waiting-runs question.
 *  2. Posts a free PREVIEW through `resumeReel`: a literal `{ contractVersion: 1, preview: true }`,
 *     prints every normalised piece and the resume's four figures, and asks for the figure the
 *     preview printed. A wrong answer exits before any paid post.
 *  3. Posts the RESUME through `resumeReel`: no `preview` key, with the `--remake` pieces the
 *     caller named.
 *  4. Polls the new run's status, follows `resumedBy` as above, and prints what it spent.
 *
 * WHAT IT NEVER DOES. It reads no key — the environment file is loaded and handed on whole, and
 * `packages/providers` is the only thing that looks inside it (S-109) — and it prints no key, no
 * environment variable's value and nothing a provider handed back but the figures above (D-022).
 * Every input it reads, including redirected input, comes from `scripts/_answers.mjs`'s `answers`
 * — paid-path's check 20 reads its source and asserts the script asks nothing any other way
 * (`tests/resume-failed-script.test.ts` check 42). One `post(path, body)` owns the sole
 * `method: 'POST'`; `makeReel` owns the one `/v1/runs` post and `resumeReel` owns the two resume
 * posts.
 */
import { readFileSync } from 'node:fs'
import { createInterface } from 'node:readline'
import { DatabaseSync } from 'node:sqlite'
import { estimate, plannedImageCalls } from '@cutroom/pipeline'
import {
  DEFAULT_ENV_FILE,
  cancelRuns,
  loadEnvFile,
  readSettings,
  startService,
  waitingRuns,
} from '@cutroom/service'
import { answers } from './_answers.mjs'
import { REPO, bold, dim, green, red } from './_lib.mjs'

// ---------------------------------------------------------------- the ceiling, and the request

/**
 * THE CEILING THIS RUN IS BOUNDED BY, in cents — the owner's, 2026-09-21 (S-128).
 *
 * It is above the estimate, so one retake does not stop a run with money already spent, and below
 * BUDGET.md's $3.00 per-reel cap, as S-110 requires. It is a constant and not a setting on
 * purpose: a ceiling that an environment variable could raise is a ceiling an accident can raise.
 * Lowering it for a run is `--ceiling`; there is no way to raise it here.
 */
const CEILING_CENTS = 250

/** What a confirmation has to be, exactly. */
const confirmation = (cents) => `spend ${cents}`

/**
 * The reel this run asks for. A caller's request like any other (D-094): eight narration
 * sentences, the claims they rest on, and the criteria a gate holds a picture and a clip to.
 *
 * It carries no sources, no claim text and no evidence — the engine never had any, and nothing
 * about a caller's reel leaves this machine but the prompts, the pictures and the sentences
 * (D-096, Gate 1).
 */
function request(requestId, budgetCents) {
  return {
    contractVersion: 1,
    requestId,
    // Session 51's reel, the owner's choice: how a hurricane works — a storm cloud fed by a warm
    // sea, the spin, the eye, the wind at the shore — as realistic footage (S-134: the caller's
    // text). Exact labels and one diagram are drawn over the engine's finished cut afterwards, by
    // Hyperframes and outside the engine (docs/research/hyperframes.md); nothing here knows it.
    // The volcano brief this replaced made run bf8f4444, and is in this file's history.
    worldId: 'cutroom-hurricanes',
    // THE BRIEF-WRITING RULES, EACH ONE PAID FOR (docs/reel-pitfalls.md): no digit, symbol or
    // acronym in a sentence — MiniMax's word timings split them into sub-word tokens, and a
    // narration that does not parse fails the run (P-001; "x86" in the CPU reel); no verb of
    // vanishing, fading or darkness (P-003); a sentence names what the planner draws, so every
    // subject in it is COMPACT — "the island", never "the islands", and no "the Earth", which the
    // planner would draw as the planet (P-002); and a claim is carried only by sentences its
    // criterion fits (P-008).
    narration: [
      {
        text: 'Every hurricane starts as a storm cloud over a warm tropical sea.',
        claimIds: ['c1'],
      },
      {
        text: 'Warm, wet air rises off the water and builds the cloud higher.',
        claimIds: ['c1'],
      },
      {
        text: 'More air rushes in below, and the storm begins to spin.',
        claimIds: ['c2'],
      },
      {
        text: 'It grows into a giant spiral, hundreds of kilometres wide.',
        claimIds: ['c2'],
      },
      {
        text: 'At its centre is the eye, a patch of calm, clear sky.',
        claimIds: ['c3'],
      },
      {
        text: "Around it, the eye wall carries the storm's fastest winds.",
        claimIds: ['c3'],
      },
      {
        text: 'Those winds can bend a palm tree almost to the ground.',
        claimIds: ['c4'],
      },
      {
        text: 'Rain flies sideways, straight past the bending tree.',
        claimIds: ['c4'],
      },
    ],
    claims: [
      { id: 'c1', role: 'main' },
      { id: 'c2', role: 'main' },
      { id: 'c3', role: 'supporting' },
      { id: 'c4', role: 'supporting' },
    ],
    criteria: {
      // FOUR CLAIMS, FOUR SUBJECTS, AND NO TWO OF THEM THE SAME KIND OF PICTURE (session 45, and
      // the reason this brief was rewritten). The engine made a whole reel on the earlier one —
      // four shots of a keeper, a logbook and bound volumes — and **Gate 7 refused the finished
      // cut**, answering no to _"Does every shot show something no other shot repeats?"_. That is
      // a true answer about that brief: three of its four subjects were a man and his paper, and
      // no criterion can make four shots of one subject differ.
      //
      // So the units are different SCENES rather than different sentences about one scene: a lamp
      // at night, a page under lamplight, an instrument box on grass in daylight, open water at
      // first light. Different place, different object, different hour — which is what makes
      // "something no other shot repeats" true by construction rather than by luck.
      //
      // ONE SIMPLE SUBJECT PER CLAIM, still. Gate 1 refuses a picture whose subject is clipped by
      // the edge of the frame (D-046), and a canonical that must hold several named things whole
      // in one 9:16 frame is a picture that is hard to make: two runs of five criteria were each
      // refused three times and stopped by D-047, at 15¢ each.
      //
      // "SEEN WHOLE WITHIN THE FRAME" WAS TRIED AND MADE IT WORSE. It reads as part of what the
      // criterion REQUIRES, so the reconciler began answering `show-log` "is not shown: a
      // handwritten logbook, seen whole within the frame" — a stricter mustShow, where what was
      // wanted was looser framing. The clipping rule already judges framing; the criterion says
      // what must be in the picture and nothing about how it sits.
      //
      // AND ONE SUBJECT RECURS, IN TWO OF THE FOUR SHOTS (S-145, S-146). Four different scenes share
      // no subject, and the reel of 2026-09-22 measured what that does: the stills stage ran in
      // 0.0 s, made no picture, and every clip was bought text-to-video. So the logbook appears
      // twice — open on a desk under lamplight (c2), and closed on an archive shelf a century later
      // (c4) — and the four scenes still differ in place, object and hour: a lamp room at night, a
      // desk at night, grass in daylight, an archive by day. If the plan names the logbook as ONE
      // subject, the stills stage makes one canonical picture, on its first shot only; its second shot
      // is still made from words, and one recurring subject makes no derived picture, so Gate 1S has
      // nothing to compare (S-149's correction). Gate 7 still sees four different things.
      //
      // AND NO CRITERION REQUIRES A PERSON. `show-keeper` required a lighthouse keeper while
      // `never-person` forbade one in the reconciler's reading, and a criterion violated by
      // satisfying another criterion cannot be met by any picture (S-134). The narration still
      // has its keeper; the pictures are of what he kept.
      mustShow: [
        {
          id: 'show-cloud',
          // One cloud, not a sky of them: a material filling the frame reads as a subject cut off
          // by its edge (D-046, P-002). The sea is where it stands, not what is shown.
          text: 'a towering white storm cloud over a tropical sea',
          type: 'presence',
          claimId: 'c1',
        },
        {
          id: 'show-spiral',
          text: "a hurricane's spiral of white cloud, seen from above",
          type: 'presence',
          claimId: 'c2',
        },
        {
          // The same storm as show-spiral, nearer: the recurring subject of S-145 and S-146.
          id: 'show-eye',
          text: 'the round eye at the centre of a hurricane, seen from above',
          type: 'presence',
          claimId: 'c3',
        },
        {
          id: 'show-palm',
          text: 'a palm tree bent over by strong wind',
          type: 'presence',
          claimId: 'c4',
        },
      ],
      // "ANY REAL LIVING PERSON" IS WHAT THE POLICY MEANS BY A RECOGNISABLE ONE, and a reconciler
      // reads it literally: shown a lighthouse keeper — which the earlier `show-keeper` REQUIRED —
      // it judged the picture to show a real living person, and the request argued with itself.
      // This is the caller's wording, in the caller's request; no gate, no policy and no check
      // moved (S-134).
      mustNotShow: [
        { id: 'never-person', text: 'a recognisable real-world public figure', type: 'presence' },
        // Kept on purpose for this reel too: a picture or video model garbles lettering. The labels
        // this reel carries are drawn exactly, by code, over the finished cut — never asked of a model.
        { id: 'never-text', text: 'written words or labels', type: 'presence' },
      ],
      depictionPolicyVersion: 'policy-3',
    },
    style: {
      id: 'style-hurricanes',
      version: 1,
      text: 'realistic nature documentary footage, vivid natural light, steady camera',
    },
    options: { until: 'video', budgetCents },
  }
}

// ---------------------------------------------------------------- what it would cost

/**
 * The corners of the estimate, computed from the SAME `estimate()` admission uses and the same
 * `planSettings` the service hands the worker — so a rate that moves moves this figure with it,
 * rather than leaving a number typed here to go stale (S-124, S-125, S-127's rule, a fourth time).
 *
 * The bounds are Gate 0's own: a plan totals 35 to 45 seconds (D-111), and its planned image calls
 * run from 0 — a plan with nothing to picture, which the skip rule of `pictures: 'upToThree'` can
 * leave (S-150) — to 4, the most any plan carries under either rule (D-027). Only the high corner
 * decides whether the estimate can exceed the ceiling.
 * The shot COUNT does not appear, because every shot costs the same video with or without a
 * keyframe (I-3).
 */
function corners(settings) {
  const seconds = [35, 45]
  const calls = [plannedImageCalls([]), plannedImageCalls(['s1', 's2', 's3'])]
  const rows = []
  for (const total of seconds) {
    for (const plannedCalls of calls) {
      rows.push({
        seconds: total,
        calls: plannedCalls,
        cents: estimate(
          { shots: [{ durationSeconds: total }], plannedImageCalls: plannedCalls },
          settings,
        ),
      })
    }
  }
  return rows.sort((a, b) => a.cents - b.cents)
}

// ---------------------------------------------------------------- the run

const args = process.argv.slice(2)
const flag = (name) => {
  const at = args.indexOf(`--${name}`)
  return at === -1 ? undefined : args[at + 1]
}

const ceilingArg = flag('ceiling')
const ceiling = ceilingArg === undefined ? CEILING_CENTS : Number(ceilingArg)
if (!Number.isInteger(ceiling) || ceiling < 1 || ceiling > CEILING_CENTS) {
  console.error(
    `\n${red('--ceiling must be a whole number of cents, at least 1 and at most the ceiling the owner set')}: ${CEILING_CENTS}\n`,
  )
  process.exit(2)
}

const resumeRunId = flag('resume')
const remakeArg = flag('remake')

// --remake <kind[:shot],…>  —  comma-separated `kind` or `kind:shot-<n>` pieces
const remakePieces =
  remakeArg === undefined
    ? []
    : remakeArg.split(',').map((entry) => {
        const trimmed = entry.trim()
        const colon = trimmed.indexOf(':')
        if (colon === -1) return { kind: trimmed }
        return { kind: trimmed.slice(0, colon), shot: trimmed.slice(colon + 1) }
      })

// THE ENVIRONMENT, LOADED AND HANDED ON WHOLE. Nothing here looks inside it: the key names are
// `packages/providers`' business and this file names none (S-109, the twentieth rule's key scan).
// A variable already exported wins over the file, as `apps/service`'s own program has it.
const envFile = process.env.CUTROOM_ENV_FILE ?? DEFAULT_ENV_FILE
const loaded = { ...loadEnvFile(envFile), ...process.env }

// EVERY PORT REAL (S-108). Named here rather than left to five environment variables, because that
// is what this script is for — and any one of them already set wins, so a run can be made with one
// part still a stand-in without editing this file.
const env = {
  CUTROOM_PROVIDER_MODEL: 'minimax',
  CUTROOM_PROVIDER_NARRATION: 'minimax',
  CUTROOM_PROVIDER_IMAGE: 'fal',
  CUTROOM_PROVIDER_VIDEO: 'fal',
  CUTROOM_PROVIDER_SENSOR: 'local',
  // UP TO THREE PICTURES A REEL (three-pictures, S-150): free picture slots go to shots holding
  // none, so a reel whose shots all differ still opens some of them from checked pictures. A value
  // already set wins, as every default here does.
  CUTROOM_PICTURES: 'upToThree',
  ...loaded,
  ...(flag('model') === undefined ? {} : { CUTROOM_FAL_IMAGE_MODEL: flag('model') }),
  ...(flag('voice') === undefined ? {} : { CUTROOM_NARRATION_VOICE: flag('voice') }),
}

const settings = (() => {
  try {
    return readSettings(env)
  } catch (error) {
    // The refusal names the PORT and, when a key is missing, the KEY'S NAME — never its value.
    console.error(`\n${red('the settings were refused')}: ${String(error?.message ?? error)}\n`)
    process.exit(1)
  }
})()

// ---------------------------------------------------------------- the input, read once

/**
 * THE INPUT, READ ONCE. A terminal is read with `readline` and a person typing one line must not
 * be made to signal end-of-file to be heard; a redirected file is read synchronously, because
 * `createInterface({ input: process.stdin })` over a redirected stream emits `close` before it
 * ever emits `line` — the line is lost (`tests/_lib.mjs`'s notes, the measured failure of
 * 2026-09-21). `readFileSync(0)` does not go through the stream and cannot lose the line.
 *
 * Every answer the script reads is one line of this single read, handed out in source order by
 * `_answers.mjs`'s `answers(input)`. Paid-path check 20's second test holds no test file may
 * import `child_process` or a model client — and `_answers.mjs` and its declaration import
 * nothing, so the file that may name the script cannot be handed a way to start it
 * (`tests/resume-failed-script.test.ts` check 42).
 */
const redirectedInput = process.stdin.isTTY
  ? await new Promise((resolve) => {
      const lines = []
      const rl = createInterface({ input: process.stdin })
      rl.on('line', (line) => {
        lines.push(line)
      })
      rl.on('close', () => resolve(lines.join('\n')))
    })
  : (() => {
      try {
        return readFileSync(0, 'utf8')
      } catch {
        return ''
      }
    })()

const line = answers(redirectedInput)

// ---------------------------------------------------------------- waiting runs

/**
 * BEFORE `startService`, the runs still waiting are read once, through a read-only connection
 * `@cutroom/service`'s `waitingRuns` opens for this purpose (S-163). A run whose caller asked to
 * cancel is already flagged, so a follow-up that would otherwise claim it skips it; a run that is
 * still running for a different reason is named and asked about, because the engine would claim
 * it as soon as the service starts. The default answer cancels each.
 */
const waiting = resumeRunId === undefined ? waitingRuns(settings.dbPath) : []
if (waiting.length > 0) {
  console.log(
    `\n${bold('runs still waiting')}  — the engine would claim each as soon as the service starts\n`,
  )
  for (const wait of waiting) {
    console.log(`  ${wait.runId}`)
  }
  process.stdout.write(
    `\n  type ${bold('leave')} to leave them running, or anything else to cancel them before the service starts: `,
  )
  const leaveAnswer = line.next()
  if (leaveAnswer !== 'leave') {
    cancelRuns(
      settings.dbPath,
      waiting.map((w) => w.runId),
    )
    console.log(
      `  ${green('cancelled')}  ${waiting.length} run${waiting.length === 1 ? '' : 's'}\n`,
    )
  } else {
    console.log(`  ${dim('left as they were')}\n`)
  }
}

// ---------------------------------------------------------------- the new-reel confirmation

const rows = corners(settings.planSettings)
const low = rows[0]
const high = rows[rows.length - 1]

if (resumeRunId === undefined) {
  console.log(`\n${bold('one real reel')}\n`)
  console.log(
    `  image      ${settings.falImageSlug} at ${settings.planSettings.imageRateCents}c a call`,
  )
  console.log(
    `  video      ${settings.planSettings.videoRateCentsPerSecond}c a second, 768P (D-007)`,
  )
  console.log(`  voice      ${settings.renderSettings.voice}`)
  console.log(`  pictures   ${settings.planSettings.pictures} (S-150)`)
  console.log(
    `  providers  ${Object.entries(settings.providers)
      .map(([p, a]) => `${p}=${a}`)
      .join(' ')}`,
  )
  console.log(`  artifacts  ${settings.artifactRoot}`)
  console.log(`  database   ${settings.dbPath}`)
  console.log(`\n${bold('what it would cost')}  — estimate(), over the shapes Gate 0 admits\n`)
  for (const row of rows) {
    console.log(
      `  ${String(row.seconds).padStart(2)} s  ${row.calls} image calls   ${String(row.cents).padStart(4)}c`,
    )
  }
  console.log(`\n  range      ${low.cents}c to ${high.cents}c`)
  console.log(`  ceiling    ${ceiling}c  — the run is refused at admission above this (D-100)`)
  console.log(
    `  cap        BUDGET.md's per-reel cap, unchanged and checked before this one (D-014)\n`,
  )

  if (high.cents > ceiling) {
    console.error(
      `${red('the estimate can exceed the ceiling')}: a legal plan of ${high.seconds} s with ` +
        `${high.calls} image calls is ${high.cents}c against a ceiling of ${ceiling}c, so a run ` +
        `could be refused at admission after nothing had been bought. Nothing was submitted.\n`,
    )
    process.exit(1)
  }

  // The NEW-REEL GATE — comparing the ceiling the estimate just printed.
  process.stdout.write(
    `  type ${bold(confirmation(ceiling))} to make it, or anything else to stop: `,
  )
  const newAnswer = line.next()
  if (newAnswer !== confirmation(ceiling)) {
    console.log(`\n${dim('nothing was submitted, and nothing was spent.')}\n`)
    process.exit(0)
  }
}

// ---------------------------------------------------------------- makeReel / resumeReel

/**
 * The one POST helper. Owning the only `method: 'POST'` is what keeps paid-path check 20 able to
 * say `method: 'POST'` appears once, inside this body (the helper itself is the method's
 * definition, so its `confirmed < submitted` rule moves to the reel's own gates).
 */
function post(path, body) {
  return fetch(`${service.baseUrl}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

/**
 * `makeReel` submits a new reel. The one `/v1/runs` post.
 */
async function makeReel(requestId, ceiling) {
  const submitted = await post('/v1/runs', request(requestId, ceiling))
  const accepted = await submitted.json()
  if (submitted.status !== 202) {
    throw new Error(`the engine answered ${submitted.status}: ${JSON.stringify(accepted)}`)
  }
  return { runId: String(accepted.runId) }
}

/**
 * `resumeReel` posts a free preview of a failed run, prints the figures, asks for the printed
 * figure, and — on the right answer — posts the paid resume. The two `/v1/runs/<id>/resume`
 * posts. The preview body is the literal `{ contractVersion: 1, preview: true }`; the paid body
 * has no `preview` key.
 */
async function resumeReel(runId, pieces) {
  // PREVIEW
  const previewRes = await post(`/v1/runs/${runId}/resume`, { preview: true })
  const preview = await previewRes.json()
  if (previewRes.status !== 200) {
    throw new Error(`the engine answered ${previewRes.status}: ${JSON.stringify(preview)}`)
  }
  const figure = Number(preview.estimateCents)
  console.log(`\n${bold(`resume of ${runId}`)}\n`)
  console.log(`  estimate   ${preview.estimateCents}c`)
  console.log(`  spent      ${preview.spentCents}c`)
  console.log(`  cap        ${preview.capCents}c`)
  console.log(`  ceiling    ${preview.ceilingCents}c`)
  if (preview.limit !== undefined) console.log(`  limit      ${preview.limit}`)
  console.log(`\n${bold('pieces made again')}\n`)
  if ((preview.remake ?? []).length === 0) {
    console.log(`  (none named — every piece the run checked is kept)`)
  } else {
    for (const piece of preview.remake) {
      console.log(`  ${piece.kind}${piece.shot === undefined ? '' : ` ${piece.shot}`}`)
    }
  }
  process.stdout.write(
    `\n  type ${bold(confirmation(figure))} to make it, or anything else to stop: `,
  )
  const answer = (line.next() ?? '').trim()
  if (answer !== confirmation(figure)) {
    console.log(`\n${dim('nothing was submitted, and nothing was spent.')}\n`)
    process.exit(0)
  }
  // RESUME
  const resumeRes = await post(`/v1/runs/${runId}/resume`, {
    contractVersion: 1,
    ...(pieces.length === 0 ? {} : { remake: pieces }),
  })
  const accepted = await resumeRes.json()
  if (resumeRes.status !== 202) {
    throw new Error(`the engine answered ${resumeRes.status}: ${JSON.stringify(accepted)}`)
  }
  return { runId: String(accepted.runId), resumed: runId }
}

// ---------------------------------------------------------------- one reel

const requestId = `real-reel-${new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15)}`
const service = await startService(settings)
const started = Date.now()
let runId
let followMessage = ''
try {
  console.log(`\n  listening  ${service.baseUrl}`)
  if (resumeRunId !== undefined) {
    console.log(`  resume     ${resumeRunId}\n`)
    const made = await resumeReel(resumeRunId, remakePieces)
    runId = made.runId
    console.log(`  ${green('submitted')}  run ${runId} (resumes ${made.resumed})\n`)
  } else {
    const made = await makeReel(requestId, ceiling)
    runId = made.runId
    console.log(`  ${green('submitted')}  run ${runId}\n`)
  }

  // Its events as they arrive, so a run that is going wrong is visible while it is going wrong.
  let since = 0
  for (;;) {
    const page = await (
      await fetch(`${service.baseUrl}/v1/runs/${runId}/events?since=${since}`)
    ).json()
    for (const event of page.events) {
      const what =
        event.type === 'verdict'
          ? `verdict ${event.gate} ${event.shotId ?? ''} ${event.outcome}`
          : event.type === 'run.finished'
            ? `run.finished ${event.status}`
            : `${event.type} ${event.stage ?? ''}`
      const secs = ((Date.parse(event.at) - started) / 1000).toFixed(1)
      console.log(`  ${dim(`${secs.padStart(7)}s`)}  ${what.trim()}`)
    }
    since = page.nextSince
    const status = await (await fetch(`${service.baseUrl}/v1/runs/${runId}`)).json()
    // The engine's resume is the engine's; the script follows the run it names — without that, a
    // long wait (S-163's fifteen minutes) leaves a person staring at a screen until a run ends
    // they are not watching (S-110, S-162).
    if (status.resumedBy !== undefined && status.resumedBy !== runId) {
      followMessage = `  the engine has resumed ${runId}; following ${status.resumedBy}\n`
      console.log(`\n${dim(followMessage.trimEnd())}\n`)
      runId = status.resumedBy
      since = 0
      continue
    }
    if (status.state === 'finished') break
    await new Promise((resolve) => setTimeout(resolve, 2000))
  }

  const result = await (await fetch(`${service.baseUrl}/v1/runs/${runId}/result`)).json()
  console.log(`\n${bold('how it ended')}\n`)
  console.log(`  status     ${result.status}`)
  for (const field of ['until', 'reason', 'rule', 'step', 'detail', 'limit']) {
    if (result[field] !== undefined) console.log(`  ${field.padEnd(10)} ${result[field]}`)
  }
  for (const field of ['estimateCents', 'ceilingCents', 'capCents']) {
    if (result[field] !== undefined) console.log(`  ${field.padEnd(10)} ${result[field]}c`)
  }
  if (result.video !== undefined) console.log(`  video      ${JSON.stringify(result.video)}`)
  if (result.degradations?.length) {
    console.log(`  degraded   ${JSON.stringify(result.degradations)}`)
  }
  console.log(`  costCents  ${result.costCents}`)
  console.log(`  latency    ${((Date.now() - started) / 1000).toFixed(1)}s, submit to finished\n`)
} finally {
  await service.stop()
}

// ---------------------------------------------------------------- what it spent

const db = new DatabaseSync(settings.dbPath)
const rowsOf = (sql) => db.prepare(sql).all(runId)

console.log(`${bold('what it spent')}  — the followed run's own receipts (D-084, S-036)\n`)

const kinds = [
  [
    'model',
    'SELECT role AS a, model AS b, 0 AS cost, fake, at FROM model_receipt WHERE run_id = ?',
  ],
  [
    'image',
    'SELECT picture_id AS a, model AS b, cost_cents AS cost, fake, at FROM generation_receipt WHERE run_id = ?',
  ],
  [
    'speech',
    'SELECT narration_id AS a, model AS b, cost_cents AS cost, fake, at FROM speech_receipt WHERE run_id = ?',
  ],
  [
    'video',
    'SELECT take_id AS a, model AS b, cost_cents AS cost, fake, at FROM video_receipt WHERE run_id = ?',
  ],
]
let total = 0
for (const [kind, sql] of kinds) {
  const receipts = rowsOf(sql)
  const sum = receipts.reduce((n, r) => n + r.cost, 0)
  total += sum
  const stood = receipts.filter((r) => r.fake === 1).length
  console.log(
    `  ${kind.padEnd(7)} ${String(receipts.length).padStart(3)} receipts  ${String(sum).padStart(4)}c` +
      (stood === 0 ? '' : `  ${red(`${stood} of them a stand-in's`)}`),
  )
  for (const r of receipts) console.log(`    ${dim(`${r.at}  ${r.a}  ${r.b}  ${r.cost}c`)}`)
}
console.log(`\n  ${bold(`total ${total}c`)}  against a ceiling of ${ceiling}c\n`)

// ANSWERS A MODEL WROTE THAT COULD NOT BE READ (docs/features/ask-again.md, S-156): the COUNT, and
// nothing of what they say — this script prints nothing a provider handed back but figures (D-022).
// The words are kept, redacted, for `scripts/refused.mjs` to print.
const refused = Number(
  db.prepare('SELECT COUNT(*) AS n FROM refused_answer WHERE run_id = ?').get(runId).n,
)
console.log(
  `  refused  ${refused} answer${refused === 1 ? '' : 's'} a model wrote that could not be read` +
    (refused === 0 ? '' : ` — read them with scripts/refused.mjs ${runId}`) +
    '\n',
)

// THE LATENCY ONE CLIP TAKES — what `parallel-shots` cannot be planned without (S-115). A shot's
// narration is measured BEFORE its own clip is asked for (S-070), so the gap between a shot's
// speech receipt and its video receipt is that clip's call and the gates that follow the narration.
const speech = rowsOf(
  'SELECT narration_id AS id, at FROM speech_receipt WHERE run_id = ? ORDER BY id',
)
const clips = rowsOf('SELECT take_id AS id, at FROM video_receipt WHERE run_id = ? ORDER BY id')
if (clips.length > 0) {
  console.log(
    `${bold('how long a clip took')}  — speech receipt to video receipt, per shot (S-070)\n`,
  )
  for (const clip of clips) {
    const shot = /shot-(\d+)/.exec(clip.id)?.[1]
    const before = speech.find((s) => s.id.includes(`shot-${shot}-`))
    const gap =
      before === undefined ? undefined : (Date.parse(clip.at) - Date.parse(before.at)) / 1000
    console.log(
      `  ${clip.id.padEnd(28)} ${gap === undefined ? 'no narration before it' : `${gap.toFixed(1)}s`}`,
    )
  }
  console.log('')
}

db.close()
console.log(dim(`  the reel and every file it made are under ${settings.artifactRoot}`))
console.log(dim(`  the repository is at ${REPO}\n`))
