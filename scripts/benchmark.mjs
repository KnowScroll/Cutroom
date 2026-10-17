#!/usr/bin/env node
/**
 * HOW WELL EVERY RUN WENT, part by part, out of what the engine already wrote
 * (docs/features/yield-benchmark.md; S-182, S-184, S-185).
 *
 *   node --experimental-strip-types --no-warnings scripts/benchmark.mjs [flags]
 *
 *   --db <path>      the record to read. Default: CUTROOM_DB_PATH, else the service's default
 *   --run <id>       one run, by its id or any unique prefix. Default: every run in the record
 *   --part <name>    plan | pictures | narration | clips | cut. Repeatable. Default: all five
 *   --out <path>     the full record, with the blobs. Default: .artifacts/benchmark/<instant>.json
 *   --ledger <path>  the ledger, written only with --rescore. Default: docs/research/benchmark.md
 *   --rescore        rewrite the ledger from the record. Without it the tracked ledger is untouched
 *   --blobs          print the prompts, the observations, the answers, the manifests and the words
 *
 * Exits 0 when every requested run was scored, the full record written and the ledger written if
 * it was asked for; 1 when the record could not be opened read-only, creating nothing; 2 when a
 * flag's value is unusable — `--run` naming no run or more than one, a `--part` that is not one
 * of the five, or `--rescore` beside `--run` or `--part`, since the ledger is the whole record or
 * nothing; 3 when an output could not be written.
 *
 * READ-ONLY, and it spends nothing. It OPENS NOTHING ITSELF: `@cutroom/benchmark-read` holds
 * the one read-only open, the held column set, the row selection and the scrubber, so this file
 * and the page read one copy of the schema and not two (benchmark-view, Gate 2; S-204). The
 * loader never goes through the domain's opener, which opens for writing, migrates and creates a
 * missing file, so the record's bytes do not change and a wrong path creates nothing, exactly as
 * `scripts/refused.mjs` does. It reaches no provider, constructs no port, reads no key and starts
 * no process but `git rev-parse`, for the commit the reading was done at. The arithmetic is
 * `@cutroom/benchmark`'s, which is pure and is handed rows: this file hashes, prints and writes,
 * and computes no measure of its own.
 *
 * The record it reads is the one `databasePath` names, from `scripts/_lib.mjs`: `--db`, then
 * `CUTROOM_DB_PATH`, then the service's default. That order lives there and not in the loader,
 * which may not import `apps/service` at all, and not here, which would be the second copy.
 *
 * A column the record does not hold is reported ABSENT and never as zero. This machine's record
 * predates migration 0007, so `run.resumes`, `run.failure` and the three `kept_from` columns are
 * not there: every row is selected with `SELECT *`, so a column that is not there simply does not
 * arrive and the scorecard reports it absent, and the columns the scorecard NAMES are read from
 * `sqlite_master` and `pragma_table_info` and listed under the banner — a reader that named the
 * columns in its SQL would throw on the real record instead.
 *
 * No key, URL or query string is printed or written (D-022), and no path reaches the ledger. The
 * full record keeps a path relative to the artifact root (D-086).
 */
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, isAbsolute, join, relative, resolve } from 'node:path'
import {
  ABSENT,
  INHERITED,
  NO_QUESTION_SET,
  PART_NAMES,
  RATING_VERSION,
  classifyGate1AndGate5,
  printed,
  runRating,
  scorecard,
  verbatim,
} from '@cutroom/benchmark'
import { openRecord } from '@cutroom/benchmark-read'
import { SETTING_NAMES } from '@cutroom/service'
import { REPO, bold, databasePath, dim, red, run } from './_lib.mjs'

/**
 * The measures' own version, beside the rating's `r1`. The package stamps a RATING; the figures
 * around it are this reader's selection, so the ledger's header carries a version for each and a
 * later change to what is read moves this one.
 */
const MEASURES_VERSION = 'm1'

/** The ledger's columns, in Gate 3's order. */
const LEDGER_COLUMNS = [
  'run',
  'brief',
  'until',
  'ending',
  'reel',
  ...PART_NAMES,
  'rating',
  'stamp',
  '¢',
  's',
  'created',
]

/** Where the artifact root is, so the full record can hold a path relative to it (D-086). */
const ARTIFACT_ROOT = process.env[SETTING_NAMES.artifactRoot] ?? join(REPO, '.artifacts')

// ---------------------------------------------------------------- the flags

const args = process.argv.slice(2)
const VALUED = new Set(['--db', '--run', '--part', '--out', '--ledger'])
const SWITCHES = new Set(['--rescore', '--blobs'])

/** Exit 2: a flag's value is unusable. Nothing is read and nothing is written. */
function unusable(message) {
  console.error(`\n${red('benchmark')}: ${message}\n`)
  process.exit(2)
}

const given = { part: [], rescore: false, blobs: false }
for (let i = 0; i < args.length; i += 1) {
  const flag = args[i]
  if (SWITCHES.has(flag)) {
    given[flag.slice(2)] = true
    continue
  }
  if (!VALUED.has(flag)) unusable(`${flag} is not a flag of this script`)
  const value = args[i + 1]
  i += 1
  if (value === undefined || value.startsWith('--')) unusable(`${flag} needs a value`)
  if (flag === '--part') given.part.push(value)
  else given[flag.slice(2)] = value
}

for (const part of given.part) {
  if (!PART_NAMES.includes(part)) {
    unusable(`--part ${part} is not one of ${PART_NAMES.join(', ')}`)
  }
}
// The ledger is the whole record or nothing: it is a TRACKED file, and a partial rescore would
// truncate it to one row or leave four part columns undefined.
if (given.rescore && (given.run !== undefined || given.part.length > 0)) {
  unusable('--rescore scores the whole record: it cannot be given with --run or --part')
}

const parts =
  given.part.length > 0 ? PART_NAMES.filter((part) => given.part.includes(part)) : PART_NAMES
const dbPath = await databasePath(given.db)
const instant = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15)
const outPath = resolve(given.out ?? join(REPO, '.artifacts', 'benchmark', `${instant}.json`))
const ledgerPath = resolve(given.ledger ?? join(REPO, 'docs', 'research', 'benchmark.md'))

// ---------------------------------------------------------------- what is printed, and how

/** A path as this script shows it: inside the repository, relative to it (D-086). */
const shown = (path) => {
  const inside = relative(REPO, path)
  return inside.startsWith('..') || isAbsolute(inside) ? path : inside
}

/** A figure as a row prints it: a number to one decimal, a string as it reads. */
const figure = (value) => (typeof value === 'number' ? printed(value) : String(value))

/** An integer figure, for a count or a cent. */
const whole = (value) => (typeof value === 'number' ? String(Math.round(value)) : String(value))

/** A span: its seconds and which of the three rules gave it its end. */
const span = (one) =>
  typeof one.seconds === 'number' ? `${printed(one.seconds)}s (${one.rule})` : `${one.seconds}`

/** `r1/<first 8 of the question-set hash>`, or `r1/—` when no Gate 7 ran. */
const stampOf = (rating) =>
  `${RATING_VERSION}/${rating.questionSetHash === ABSENT ? NO_QUESTION_SET : String(rating.questionSetHash).slice(0, 8)}`

const say = (indent, ...pieces) =>
  console.log(`${' '.repeat(indent)}${pieces.filter((piece) => piece !== '').join('  ')}`)

/** Cents, or the word for a figure the record does not hold. */
const cents = (value) => (typeof value === 'number' ? `${Math.round(value)}¢` : String(value))

/** Seconds to one decimal, or the word for a figure the record does not hold. */
const seconds = (value) => (typeof value === 'number' ? `${printed(value)}s` : String(value))

/** A term as the rating computed it: what was achieved over what was attempted, and its weight. */
const terms = (rated) =>
  rated
    .map(
      (term) =>
        `${term.term} ${whole(term.achieved)}/${whole(term.attempted)}=${term.value.toFixed(3)}×${term.weight}`,
    )
    .join('  ')

// ---------------------------------------------------------------- the record, opened to read

if (!existsSync(dbPath)) {
  console.error(`\n${red('no record at')} ${shown(dbPath)}\n`)
  process.exit(1)
}

let stored
try {
  // The open is the loader's, read-only, and it does its own first read — a file that is not a
  // database opens without complaint and fails on that read, which is why the call sits inside
  // the one place here that answers with exit 1. The two roots are HANDED to it: the loader
  // resolves no path and reads no setting.
  stored = openRecord({ path: dbPath, roots: [ARTIFACT_ROOT, REPO] })
} catch (error) {
  console.error(`\n${red('cannot read')} ${shown(dbPath)}: ${error.message}\n`)
  process.exit(1)
}

/**
 * Every string printed or written passes through here: an artifact path becomes a path relative
 * to the artifact root, and a URL becomes `<url>` — no key, URL or query string anywhere (D-022).
 * The patterns are the loader's, built from the two roots it was handed.
 */
const redact = (text) => stored.scrub(text)

/**
 * The columns the scorecard names that this record does not hold, from the loader's reading of
 * `sqlite_master` and `pragma_table_info` against the arithmetic's own field-to-column map. Each
 * is reported ABSENT by the scorecard, because the row simply has no such property — never as
 * zero, which is a figure a run can earn.
 */
const absent = stored.absentColumns()

const runIds = (() => {
  if (given.run === undefined) return stored.runIds()
  const named = stored.runIdsNamed(given.run)
  if (named.length === 0) unusable(`--run ${given.run} names no run in this record`)
  if (named.length > 1)
    unusable(`--run ${given.run} names ${named.length} runs: ${named.join(', ')}`)
  return named
})()

// ---------------------------------------------------------------- the blobs

/** Every blob the full record holds, and what `--blobs` prints: each one as the engine wrote it. */
function blobsOf(rows) {
  return {
    plans: rows.plan.map((fork) => ({
      role: fork.role,
      plan: fork.plan,
      verdict: fork.verdict,
    })),
    pictures: rows.picture.map((picture) => ({
      pictureId: picture.picture_id,
      prompt: picture.prompt,
      words: picture.words,
      measure: picture.measure,
      gate1: picture.gate1,
      gate1s: picture.gate1s,
      score: picture.score,
      degradation: picture.degradation,
    })),
    observations: rows.observation.map((seen) => ({
      pictureId: seen.picture_id,
      observation: seen.observation,
    })),
    reconciliations: rows.reconciliation.map((answered) => ({
      pictureId: answered.picture_id,
      answer: answered.answer,
      failed: answered.failed,
    })),
    narrations: rows.narration.map((narration) => ({
      narrationId: narration.narration_id,
      text: narration.text,
      words: narration.words,
      probe: narration.probe,
    })),
    takes: rows.take.map((take) => ({
      takeId: take.take_id,
      prompt: take.prompt,
      expandedPrompt: take.expanded_prompt,
      probe: take.probe,
      scan: take.scan,
      sound: take.sound,
      verdicts: take.verdicts,
    })),
    takeObservations: rows.take_observation.map((seen) => ({
      takeId: seen.take_id,
      observation: seen.observation,
    })),
    takeReconciliations: rows.take_reconciliation.map((answered) => ({
      takeId: answered.take_id,
      answer: answered.answer,
      failed: answered.failed,
    })),
    renders: rows.render.map((render) => ({
      renderId: render.render_id,
      manifest: render.render_manifest,
      invocations: render.invocations,
      measure: render.measure,
      gate7: render.gate7,
    })),
    refusedAnswers: rows.refused_answer.map((refused) => ({
      port: refused.port,
      role: refused.role,
      call: refused.call,
      about: refused.about,
      reasons: refused.reasons,
      answer: refused.answer,
    })),
    lostCalls: rows.lost_call.map((lost) => ({ port: lost.port, detail: lost.detail })),
    // Every reason-writing site's strings, verbatim and unclassified (Gate 2's table).
    verbatim: verbatim(rows),
  }
}

// ---------------------------------------------------------------- the scorecard, on screen

function printRun(card, rating) {
  console.log('')
  say(
    2,
    bold(card.run.runId),
    String(card.run.worldId),
    `brief ${card.run.briefKey}`,
    `until ${card.run.until}`,
    String(card.run.ending.status),
    `reel ${card.run.reel.madeAFile ? 'yes' : 'no'}`,
    `rating ${figure(rating.rating)}`,
    `stamp ${stampOf(rating)}`,
    rating.label,
  )
  say(
    4,
    dim('cost'),
    `image ${cents(card.run.costCents.image)}`,
    `video ${cents(card.run.costCents.video)}`,
    `speech ${cents(card.run.costCents.speech)}`,
    `lost ${cents(card.run.costCents.lost)}`,
    `model ${card.run.costCents.model} (tokens ${whole(card.run.modelTokens.input)} in, ${whole(card.run.modelTokens.output)} out)`,
  )
  say(
    4,
    dim('spend'),
    `estimate ${cents(card.run.estimateCents)}`,
    `ceiling ${cents(card.run.ceilingCents)}`,
    `cap ${cents(card.run.capCents)}`,
    dim(`— ${card.run.estimateExcludes}`),
  )
  say(
    4,
    dim('time'),
    `wall clock ${span({ seconds: card.run.wallClockSeconds, rule: "the run's last event" })}`,
    `plan ${span(card.run.stages.plan)}`,
    `stills ${span(card.run.stages.stills)}`,
    `video ${span(card.run.stages.video)}`,
  )
  say(
    4,
    dim('ending'),
    `${card.run.ending.status}`,
    `rule ${card.run.ending.rule}`,
    `step ${card.run.ending.step}`,
    `failure ${card.run.ending.failure}`,
    `resumes ${card.run.resumes}`,
    `reel ${seconds(card.run.reel.durationSeconds)}`,
    `frames ${whole(card.run.reel.frames)}`,
  )
  say(
    4,
    dim('record'),
    `picture rule ${card.run.pictureRule}`,
    `engine version ${card.run.engineVersion}`,
    `transients speech ${whole(card.run.transients.speech)}`,
    `video ${whole(card.run.transients.video)}`,
    `image ${card.run.transients.image}`,
  )
  for (const job of card.run.jobs) {
    say(
      4,
      dim('job'),
      job.kind,
      `queued ${span({ seconds: job.queuedSeconds, rule: 'run_at to locked_at' })}`,
      `attempts ${job.attempts}`,
      `error ${redact(String(job.error))}`,
      `${cents(job.costCents)}`,
    )
  }
  for (const lost of card.run.lostCalls) {
    say(4, dim('lost call'), lost.port, lost.model, `${cents(lost.costCents)}`)
  }
  for (const refused of card.run.refusedAnswers) {
    say(
      4,
      dim('refused answer'),
      refused.port,
      `${refused.role} ${refused.call}`,
      `about ${refused.about.join(', ') || '-'}`,
      `ask ${refused.ask}`,
    )
  }
  // The ending's detail embeds the gates' own strings and whatever a provider said, so it is a
  // blob: it is always in the full record, and on screen only when asked for.
  if (given.blobs) say(4, dim('detail'), redact(String(card.run.ending.detail)))
}

function printPart(card, rating, part, blobs, reasons) {
  const held = card.parts[part]
  const rated = rating.parts[part]
  if (!held.reached) {
    say(4, bold(`part ${part}`), ABSENT, dim(`not reached — ${held.reachedBy}`))
    return
  }
  say(
    4,
    bold(`part ${part}`),
    figure(rated.rating),
    rated.inherited ? INHERITED : dim(`reached — ${held.reachedBy}`),
    `span ${span(held.span)}`,
    part === 'narration' || part === 'clips' ? dim(`own span ${held.ownSpan}`) : '',
  )
  say(6, dim('terms'), terms(rated.terms))

  if (part === 'plan') {
    say(
      6,
      dim('figures'),
      `selected ${held.selectedRole}`,
      `repair plan ${held.repairPlan ? 'yes' : 'no'}`,
      `shots ${whole(held.shots)}`,
      `total ${seconds(held.totalSeconds)}`,
      `subjects ${whole(held.subjects)}`,
      `subjects a shot ${held.subjectsPerShot.join('/') || '-'}`,
      `most ${whole(held.maxSubjectsPerShot)}`,
      `estimate ${cents(held.admission.estimateCents)} of ${cents(held.admission.ceilingCents)}`,
    )
    for (const fork of held.forks) {
      say(
        6,
        dim('fork'),
        fork.role,
        `${fork.unitCount} units`,
        fork.axis,
        `image calls ${whole(fork.plannedImageCalls)}`,
        `estimate ${cents(fork.estimateCents)}`,
        `gate0 ${fork.gate0.outcome}`,
        `failed ${fork.gate0.failed.join(', ') || '-'}`,
        `score ${figure(fork.score)}`,
        fork.selected ? 'selected' : '',
      )
    }
    for (const call of held.modelCalls) {
      say(
        6,
        dim('model call'),
        `${call.role} ${call.call}`,
        call.model,
        `temp ${call.temperature}`,
        `tokens ${whole(call.inputTokens)} in, ${whole(call.outputTokens)} out`,
      )
    }
    say(
      6,
      dim('criteria'),
      `must show ${held.criteria.mustShow.join(', ') || '-'}`,
      `must never show ${held.criteria.mustNotShow.join(', ') || '-'}`,
    )
  }

  if (part === 'pictures') {
    say(
      6,
      dim('figures'),
      `planned ${whole(held.planned)}`,
      `attempted ${held.attempted}`,
      `chosen ${held.chosen}`,
      `image calls ${held.imageCallsUsedOfSix} of six`,
      `lost ${held.callsLost}`,
      `repairs ${held.repairPictures}`,
      `retries a shot ${held.retriesPerShot.join('/') || '-'}`,
      `degraded ${held.shotsDegradedThisRunMade} of ${held.shotsDegraded.length}`,
    )
    // Gate 1's and Gate 5's reconcile reasons, in their families; every other site's strings are
    // counted verbatim and unclassified, and an unknown one is a FINDING that fails nothing.
    for (const [family, count] of Object.entries(reasons.families)) {
      if (count.strings === 0) continue
      say(6, dim('reasons'), family, `${count.strings} strings on ${count.pictures} pictures`)
    }
    for (const finding of reasons.findings)
      say(6, red('finding'), 'a reason not classified', finding)
    for (const item of held.items) {
      say(
        6,
        dim('picture'),
        String(item.pictureId),
        item.shotId,
        item.role,
        `subject ${item.subjectId}`,
        `attempt ${item.attempt}`,
        `gate1 ${item.gate1.outcome}`,
        `coverage ${item.gate1.coverage}`,
        `gate1s ${item.gate1s.outcome}`,
        `score ${figure(item.score)}`,
        `${item.technical.width}x${item.technical.height}`,
        `witness ${item.witness.things} things, ${item.witness.clipped} clipped`,
        `${cents(item.costCents)} at ${cents(item.rateCents)}`,
        item.chosen ? 'chosen' : '',
        item.inherited ? 'inherited' : '',
      )
      for (const step of item.gate1Steps) {
        say(8, dim(`gate1 ${step.step}`), step.outcome, ...step.reasons.map((reason) => reason))
      }
    }
    for (const degraded of held.shotsDegraded) {
      say(
        6,
        dim('degraded'),
        degraded.shotId,
        `gate ${degraded.gate}`,
        degraded.reason,
        degraded.inherited ? 'inherited' : '',
      )
    }
  }

  if (part === 'narration') {
    say(6, dim('figures'), `refused timings ${held.refusedTimings}`, `spoken ${held.items.length}`)
    for (const item of held.items) {
      say(
        6,
        dim('narration'),
        String(item.narrationId),
        item.shotId,
        `${item.characters} characters`,
        `probed ${seconds(item.probedSeconds)}`,
        `timings ${item.timingsParsed ? 'parsed' : 'not parsed'}`,
        String(item.model),
        `${cents(item.costCents)} at ${cents(item.rateCents)}`,
        `transients ${whole(item.transientErrors)}`,
        item.inherited ? 'inherited' : '',
      )
      if (given.blobs) say(8, dim('text'), redact(String(item.text)))
    }
  }

  if (part === 'clips') {
    say(
      6,
      dim('figures'),
      `image to video ${held.imageToVideo}`,
      `text to video ${held.textToVideo}`,
      `ladder a shot ${held.ladderDepthPerShot.join('/') || '-'}`,
      `re-bought after a transient ${held.reboughtAfterTransient}`,
    )
    for (const item of held.items) {
      say(
        6,
        dim('take'),
        String(item.takeId),
        item.shotId,
        `take ${item.number}`,
        item.mode,
        `held to ${item.pictureId}`,
        `seed ${item.seed}`,
        `asked ${seconds(item.requestedSeconds)}`,
        `delivered ${seconds(item.deliveredSeconds)}`,
        `delta ${figure(item.deliveredDelta)}`,
        `${item.probe.codec} ${item.probe.width}x${item.probe.height} ${figure(item.probe.fps)}fps`,
        `frames ${whole(item.probe.frames)}`,
        `black ${item.scan.black}`,
        `frozen ${item.scan.frozen}`,
        `silent ${item.scan.silent}`,
        `loudness ${figure(item.scan.loudnessLufs)}`,
        `outcome ${item.outcome}`,
        `${cents(item.costCents)} at ${cents(item.rateCents)}`,
        item.inherited ? 'inherited' : '',
      )
      for (const gate of item.gates) {
        say(8, dim(`gate ${gate.gate}`), gate.outcome, ...gate.reasons.map((reason) => reason))
      }
    }
    for (const stillHold of held.stillHolds) {
      say(
        6,
        dim('still hold'),
        stillHold.shotId,
        stillHold.pictureId,
        `takes ${stillHold.takeIds.join(', ')}`,
        stillHold.reason,
        stillHold.inherited ? 'inherited' : '',
      )
    }
  }

  if (part === 'cut') {
    say(
      6,
      dim('figures'),
      `finished ${held.finished ? 'yes' : 'no'}`,
      `manifest ${held.manifestHash}`,
      `shots ${held.manifestShots}`,
      `profile ${held.profile}`,
      `ffmpeg invocations ${held.invocations}`,
      `planned ${seconds(held.plannedTotalSeconds)}`,
      `delivered ${seconds(held.output.durationSeconds)}`,
      `frames ${whole(held.output.frames)}`,
      `audio ${held.output.audio}`,
      `${cents(held.costCents)}`,
    )
    say(
      6,
      dim('gate7'),
      String(held.gate7.outcome),
      `coverage ${held.gate7.coverage}`,
      `asked ${held.gate7.asked}`,
      `yes ${held.gate7.yes}`,
      `question set ${String(held.questionSetHash).slice(0, 8)}`,
    )
    for (const question of held.gate7.answeredNo) say(8, dim('answered no'), question)
    for (const hold of held.holds) {
      say(
        6,
        dim('hold'),
        hold.shotId,
        `${seconds(hold.seconds)}`,
        hold.reason,
        hold.inherited ? 'inherited' : '',
      )
    }
  }

  if (given.blobs) printBlobs(part, blobs)
}

/** The prompts, the answers, the manifests and the words — printed only when asked for. */
function printBlobs(part, blobs) {
  const text = (label, value) => {
    if (value === null || value === undefined) return
    say(8, dim(label), redact(String(value)).split('\n').join(' '))
  }
  if (part === 'plan') {
    for (const fork of blobs.plans) {
      text(`plan ${fork.role}`, fork.plan)
      text(`gate0 ${fork.role}`, fork.verdict)
    }
  }
  if (part === 'pictures') {
    for (const picture of blobs.pictures) {
      text(`prompt ${picture.pictureId}`, picture.prompt)
      text(`words ${picture.pictureId}`, picture.words)
    }
    for (const seen of blobs.observations) text(`observation ${seen.pictureId}`, seen.observation)
    for (const answered of blobs.reconciliations) {
      text(`reconciled ${answered.pictureId}`, answered.answer)
    }
  }
  if (part === 'narration') {
    for (const narration of blobs.narrations) {
      text(`timings ${narration.narrationId}`, narration.words)
    }
  }
  if (part === 'clips') {
    for (const take of blobs.takes) {
      text(`prompt ${take.takeId}`, take.prompt)
      text(`expanded ${take.takeId}`, take.expandedPrompt)
      text(`scan ${take.takeId}`, take.scan)
    }
    for (const seen of blobs.takeObservations) text(`observation ${seen.takeId}`, seen.observation)
    for (const answered of blobs.takeReconciliations) {
      text(`reconciled ${answered.takeId}`, answered.answer)
    }
  }
  if (part === 'cut') {
    for (const render of blobs.renders) {
      text(`manifest ${render.renderId}`, render.manifest)
      text(`invocations ${render.renderId}`, render.invocations)
      text(`gate7 ${render.renderId}`, render.gate7)
    }
  }
}

// ---------------------------------------------------------------- the ledger

/** A markdown table as `prettier` lays one out: every cell padded to its column's widest. */
function markdownTable(header, rows) {
  const width = (cell) => [...cell].length
  const widths = header.map((cell, at) =>
    Math.max(3, width(cell), ...rows.map((row) => width(row[at]))),
  )
  const line = (cells) =>
    `| ${cells.map((cell, at) => cell + ' '.repeat(widths[at] - width(cell))).join(' | ')} |`
  return [
    line(header),
    `| ${widths.map((one) => '-'.repeat(one)).join(' | ')} |`,
    ...rows.map((row) => line(row)),
  ].join('\n')
}

/** One run's row, in Gate 3's fifteen columns and their formats. */
function ledgerRow(card, rating, createdAt) {
  const part = (name) => {
    const rated = rating.parts[name]
    if (rated.rating === ABSENT) return ABSENT
    // A part a resume copied in is reported and left out of the run rating (S-162, S-164): the
    // column holds one word for it rather than the sentence the scorecard prints.
    if (rated.rating === INHERITED) return 'inherited'
    return printed(rated.rating)
  }
  return [
    `\`${card.run.runId}\``,
    String(card.run.briefKey).slice(0, 8),
    String(card.run.until),
    String(card.run.ending.status),
    card.run.reel.madeAFile ? 'yes' : 'no',
    ...PART_NAMES.map((name) => part(name)),
    figure(rating.rating),
    stampOf(rating),
    // This run's own receipts, which is what a kept piece copies none of.
    String(
      Math.round(card.run.costCents.image + card.run.costCents.video + card.run.costCents.speech),
    ),
    figure(card.run.wallClockSeconds),
    // The run's own `created_at`, to the second: an instant that cannot move between two
    // scorings of one record.
    `${createdAt.slice(0, 19)}Z`,
  ]
}

/**
 * The ledger: the front matter, the header that carries everything which moves between two
 * scorings — the read date and the commit — and one row a run. A ROW HOLDS NOTHING THAT MOVES,
 * which is what makes a second scoring of one record byte-identical.
 */
function ledger(scored, commit) {
  const rows = scored.map(({ card, rating, createdAt }) => ledgerRow(card, rating, createdAt))
  return [
    '---',
    'status: current',
    'authority: the ledger of every run the engine has made, scored from the record it wrote — not a plan; nothing here binds',
    '---',
    '',
    '# Benchmark — every run the engine has made, scored part by part',
    '',
    `Written by \`scripts/benchmark.mjs --rescore\` and never typed by hand (S-016's rule, as`,
    '`journey.mjs` has it). Read on **' +
      new Date().toISOString().slice(0, 10) +
      '** at commit `' +
      commit +
      '`, over **' +
      String(rows.length) +
      ' runs**.',
    'Rating version `' + RATING_VERSION + '`, measures version `' + MEASURES_VERSION + '`.',
    '',
    'A part rating is `absent` where the run never reached that part, and the run rating is `none`',
    'where it reached no part of its own. The rating ranks runs and decides nothing; the `reel`',
    'column is whether a watchable file came out, which no single number is allowed to hide. Two',
    'cut ratings compare only when their stamps match, because S-158 changed the Gate 7 question',
    'set. The scorecard behind every row, with its blobs, is the full record `--out` writes, and',
    'no column here holds a path of any kind.',
    '',
    markdownTable(LEDGER_COLUMNS, rows),
    '',
  ].join('\n')
}

// ---------------------------------------------------------------- scoring

const hash = (input) => createHash('sha256').update(input).digest('hex')
const commit = (() => {
  const named = run('git', ['rev-parse', '--short', 'HEAD'])
  return named.ok ? named.stdout.trim() : 'not recorded'
})()

const scored = []
try {
  console.log('')
  say(
    2,
    bold('benchmark'),
    shown(dbPath),
    `${runIds.length} runs`,
    `commit ${commit}`,
    `${RATING_VERSION}/${MEASURES_VERSION}`,
  )
  if (absent.length > 0) {
    say(2, dim('absent in this record'), absent.join(', '), dim('— reported absent, never zero'))
  }
  for (const runId of runIds) {
    const rows = stored.rowsOf(runId)
    const card = scorecard(rows, { hash })
    const rating = runRating(rows, { hash })
    const blobs = blobsOf(rows)
    const reasons = classifyGate1AndGate5(rows)
    scored.push({ card, rating, blobs, reasons, createdAt: String(rows.run.created_at) })
    printRun(card, rating)
    for (const part of parts) printPart(card, rating, part, blobs, reasons)
  }
} finally {
  stored.close()
}

// ---------------------------------------------------------------- what is written down

/** Exit 3: an output could not be written. Every scored figure is already on screen. */
function unwritten(path, error) {
  console.error(`\n${red('cannot write')} ${shown(path)}: ${error.message}\n`)
  process.exit(3)
}

const record = {
  readAt: new Date().toISOString(),
  commit,
  ratingVersion: RATING_VERSION,
  measuresVersion: MEASURES_VERSION,
  record: shown(dbPath),
  runsScored: runIds.length,
  partsScored: parts,
  absentColumns: absent,
  runs: scored.map(({ card, rating, blobs, reasons }) => ({
    run: card.run.runId,
    scorecard: card,
    rating,
    reasons,
    blobs,
  })),
}

try {
  mkdirSync(dirname(outPath), { recursive: true })
  // Every string the record holds passes through `redact`: a path relative to the artifact root,
  // and no URL anywhere (D-022, D-086).
  writeFileSync(
    outPath,
    `${JSON.stringify(record, (_key, value) => (typeof value === 'string' ? redact(value) : value), 2)}\n`,
    'utf8',
  )
} catch (error) {
  unwritten(outPath, error)
}
console.log('')
say(2, dim('record'), shown(outPath))

if (given.rescore) {
  try {
    mkdirSync(dirname(ledgerPath), { recursive: true })
    writeFileSync(ledgerPath, ledger(scored, commit), 'utf8')
  } catch (error) {
    unwritten(ledgerPath, error)
  }
  say(2, dim('ledger'), shown(ledgerPath))
}
console.log('')
