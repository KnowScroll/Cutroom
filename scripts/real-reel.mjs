#!/usr/bin/env node
/**
 * ONE REAL REEL, MADE BY HAND, AND WHAT IT SPENT (S-111, docs/features/paid-path.md, check 20).
 *
 *   node --experimental-strip-types --no-warnings scripts/real-reel.mjs
 *
 * THIS IS THE ONLY THING IN THIS REPOSITORY THAT SPENDS MONEY, and it is run by a person and by
 * nothing else. No test file names it and no step of `scripts/check.mjs` names it — check 20 is
 * what holds that, because a script that spends and could be reached by a suite is a suite that
 * spends (S-111, and four verified features' Gate 1).
 *
 * WHAT IT DOES, IN ORDER:
 *
 *  1. Reads the settings a service would read, with every port told to be REAL, and PRINTS THE
 *     ESTIMATE — computed from `estimate()`, the same function admission uses, over the corners
 *     of the shapes Gate 0 admits (D-111's 35 to 45 seconds, D-014's 2 to 4 planned image calls).
 *  2. WAITS. Nothing is started, no key is read into a port and nothing is submitted until the
 *     ceiling is typed back on standard input. Typing the figure back is what makes a confirmation
 *     impossible to give by accident, and it proves the estimate was read.
 *  3. Starts the engine — the same `startService` `apps/service`'s own program starts — submits
 *     ONE request under the ceiling, and follows its events.
 *  4. Prints WHAT IT SPENT: every receipt, its rate and its cost, the totals by kind, and the
 *     latency of the whole run and of each clip, which is the figure `parallel-shots` cannot be
 *     planned without (S-115).
 *
 * WHAT IT NEVER DOES. It reads no key — the environment file is loaded and handed on whole, and
 * `packages/providers` is the only thing that looks inside it (S-109) — and it prints no key, no
 * environment variable's value and nothing a provider handed back but the figures above (D-022).
 * It submits exactly ONE request, and if it is run again it makes a second reel and spends again.
 */
import { readFileSync } from 'node:fs'
import { createInterface } from 'node:readline'
import { DatabaseSync } from 'node:sqlite'
import { estimate, plannedImageCalls } from '@cutroom/pipeline'
import { DEFAULT_ENV_FILE, loadEnvFile, readSettings, startService } from '@cutroom/service'
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
    worldId: 'cutroom-first-real-reel',
    narration: [
      { text: 'For forty years a lamp on a headland was lit at dusk.', claimIds: ['c1'] },
      { text: 'It turned all night above water nobody else was watching.', claimIds: ['c1'] },
      {
        text: 'Before he slept, the keeper wrote the hour and the weather down.',
        claimIds: ['c2'],
      },
      { text: 'The log was a condition of the job, and he met it.', claimIds: ['c2'] },
      { text: 'A slatted white box on the grass held his thermometers.', claimIds: ['c3'] },
      { text: 'He read them at the same hour, whatever the sea was doing.', claimIds: ['c3'] },
      {
        text: 'A century later his logbook stands closed on an archive shelf.',
        claimIds: ['c4'],
      },
      {
        text: 'Its columns became a record of the water itself; kept things outlive their reason.',
        claimIds: ['c4'],
      },
    ],
    claims: [
      { id: 'c1', role: 'main' },
      { id: 'c2', role: 'supporting' },
      { id: 'c3', role: 'main' },
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
          id: 'show-lamp',
          text: 'a lighthouse lamp of glass and brass',
          type: 'presence',
          claimId: 'c1',
        },
        {
          id: 'show-log',
          text: 'an open handwritten logbook on a desk',
          type: 'presence',
          claimId: 'c2',
        },
        {
          id: 'show-box',
          text: 'a white slatted wooden instrument box standing on grass',
          type: 'presence',
          claimId: 'c3',
        },
        {
          id: 'show-archive',
          text: 'a closed handwritten logbook on a shelf in a daylit archive',
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
        { id: 'never-modern', text: 'a computer screen', type: 'presence' },
      ],
      depictionPolicyVersion: 'policy-3',
    },
    style: { id: 'style-1', version: 2, text: 'quiet, precise, natural light' },
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
 * are `plannedImageCalls`' own answers — 2 with one eligible subject, 4 with three or more (D-027).
 * The shot COUNT does not appear, because every shot costs the same video with or without a
 * keyframe (I-3).
 */
function corners(settings) {
  const seconds = [35, 45]
  const calls = [plannedImageCalls(['s1']), plannedImageCalls(['s1', 's2', 's3'])]
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

const rows = corners(settings.planSettings)
const low = rows[0]
const high = rows[rows.length - 1]

console.log(`\n${bold('one real reel')}\n`)
console.log(
  `  image      ${settings.falImageSlug} at ${settings.planSettings.imageRateCents}c a call`,
)
console.log(`  video      ${settings.planSettings.videoRateCentsPerSecond}c a second, 768P (D-007)`)
console.log(`  voice      ${settings.renderSettings.voice}`)
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

// ---------------------------------------------------------------- the confirmation

process.stdout.write(`  type ${bold(confirmation(ceiling))} to make it, or anything else to stop: `)

/**
 * The line a person supplies, read the way the shell they are in actually supplies it.
 *
 * **A TERMINAL is read with `readline`**, because a person typing one line must not be made to
 * signal end-of-file to be heard.
 *
 * **ANYTHING ELSE IS READ SYNCHRONOUSLY FROM FD 0**, and the reason is a measurement rather than a
 * preference. Measured here on 2026-09-21: in an ESM script with a top-level `await`,
 * `createInterface({ input: process.stdin })` over a REDIRECTED FILE emits `close` before it ever
 * emits `line` — the line is lost, with no delay and no other reader involved, and the script
 * refuses a confirmation that was given. The same read in a first-tick `node -e` works, which is
 * what made it look like the shell's fault. `readFileSync(0)` does not go through the stream at
 * all, so it cannot lose the line whatever the module graph does.
 *
 * Neither branch weakens what a confirmation IS: the figure, typed, and read only after the
 * estimate above has been computed and printed.
 */
const answer = process.stdin.isTTY
  ? await new Promise((resolve) => {
      const rl = createInterface({ input: process.stdin })
      rl.once('line', (line) => {
        rl.close()
        resolve(line.trim())
      })
      rl.once('close', () => resolve(''))
    })
  : (() => {
      try {
        return (readFileSync(0, 'utf8').split(/\r?\n/)[0] ?? '').trim()
      } catch {
        return ''
      }
    })()

if (answer !== confirmation(ceiling)) {
  console.log(`\n${dim('nothing was submitted, and nothing was spent.')}\n`)
  process.exit(0)
}

// ---------------------------------------------------------------- one reel

const requestId = `real-reel-${new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15)}`
const service = await startService(settings)
const started = Date.now()
let runId
try {
  console.log(`\n  listening  ${service.baseUrl}`)
  console.log(`  request    ${requestId}\n`)

  const submitted = await fetch(`${service.baseUrl}/v1/runs`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(request(requestId, ceiling)),
  })
  const accepted = await submitted.json()
  if (submitted.status !== 202) {
    throw new Error(`the engine answered ${submitted.status}: ${JSON.stringify(accepted)}`)
  }
  runId = accepted.runId
  console.log(`  ${green('submitted')}  run ${runId}\n`)

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
    const { state } = await (await fetch(`${service.baseUrl}/v1/runs/${runId}`)).json()
    if (state === 'finished') break
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

console.log(`${bold('what it spent')}  — this run's own receipts (D-084, S-036)\n`)

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
