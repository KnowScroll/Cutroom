// The page (benchmark-view, Gate 4's Slice 3; the shape the owner approved, S-201).
//
// Four views — Overview, Ledger, Compare, One run — in ONE document, built here from the two
// payloads and served by `GET /`. Every chart the page draws is also written out as a table of
// its own numbers, so the document can be read with no script, no colour and no pointer at all,
// and so a chart that drew something its payload does not hold fails check 15.
//
// **Every section states in one plain line what it is for.** That was most of what made the
// first draft unreadable (S-201's four rounds of look feedback).
//
// **No verdict is drawn and no run is called better or worse than another** — check 6 is the
// enforcement, and it is why the cost key the scorecard spells `lost` is written here as
// "paid, no answer": a page that prints a word on that list prints it about a run.

import { BOARD_FIGURES, BOARD_GROUPS } from './board.ts'
import {
  COST_PORTS,
  STAGE_LABELS,
  biggestDrop,
  derivedOf,
  groupCards,
  runSplitPoints,
  scorePoints,
  scoreSeries,
  spendPoints,
  stagePoints,
  type ChartName,
  type GroupCard,
} from './charts.ts'
import type { FleetPayload, RunPayload } from './payload.ts'
import { PAGE_SCRIPT } from './draw.ts'
import { PAGE_STYLE } from './style.ts'

export interface PageInput {
  fleet: FleetPayload
  /** The run the One run view opens on: the newest finished one, or the one that was named. */
  run: RunPayload | undefined
  selectedRunId: string | undefined
  /** A run named in the query that this record does not hold, so the page can say so. */
  unknownRun?: string | undefined
}

// ---------------------------------------------------------------- writing it out

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

/** Every value that comes out of the record is written through this. */
const safe = (value: unknown): string =>
  String(value ?? '').replace(/[&<>"']/g, (one) => ESCAPES[one] ?? one)

/**
 * A figure as a reader reads it: a number to one decimal, a boolean as yes or no, a list joined,
 * and `absent` or `not recorded` left exactly as the scorecard said it — never turned into a
 * zero, which is a figure a run can also earn.
 */
function fig(value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'number') {
    return Number.isInteger(value) ? String(value) : String(Math.round(value * 10) / 10)
  }
  if (typeof value === 'boolean') return value ? 'yes' : 'no'
  if (Array.isArray(value))
    return value.length === 0 ? '—' : value.map((one) => fig(one)).join(', ')
  return String(value)
}

/** An instant as the record writes it, shortened to the minute. */
const when = (at: string): string => at.slice(0, 16).replace('T', ' ')

/** A run id as a column heading: the first group of its uuid, which is how the ledger names it. */
const shortId = (runId: string): string => runId.slice(0, 8)

const row = (cells: readonly string[]): string => `<tr>${cells.join('')}</tr>`
const cell = (value: unknown, cls = ''): string =>
  `<td${cls === '' ? '' : ` class="${cls}"`}>${safe(fig(value))}</td>`
const head = (names: readonly string[]): string =>
  `<thead><tr>${names.map((name) => `<th>${safe(name)}</th>`).join('')}</tr></thead>`

/** One chart panel: the chart, the line under it, and the numbers behind it. */
function chartPanel(
  chart: ChartName,
  title: string,
  note: string,
  table: string,
  under = '',
): string {
  return `<div class="panel">
  <div class="head"><h3>${safe(title)}</h3><span class="note">${safe(note)}</span></div>
  <div class="body">
    <div class="chartwrap"><div class="chart" data-chart="${chart}"></div><span class="grip">drag the bottom edge to resize</span></div>
    ${under === '' ? '' : `<p class="legend-note">${safe(under)}</p>`}
    <details class="numbers"><summary>The numbers behind this chart</summary>
      ${table}
    </details>
  </div>
</div>`
}

/** A numbers table, named for the chart it stands behind (check 15 counts its body's rows). */
const numbers = (chart: ChartName, columns: readonly string[], rows: readonly string[]): string =>
  `<table class="numbers" data-numbers="${chart}">${head(columns)}<tbody>${rows.join('')}</tbody></table>`

const section = (eyebrow: string, title: string, line: string): string =>
  `<div class="sec"><span class="eyebrow">${safe(eyebrow)}</span><h2>${safe(title)}</h2><p>${safe(line)}</p></div>`

function tile(key: string, value: string, under: string): string {
  return `<div class="tile"><div class="k">${safe(key)}</div><div class="v">${safe(value)}</div><div class="s">${safe(under)}</div></div>`
}

// ---------------------------------------------------------------- the overview

function groupPanel(card: GroupCard): string {
  const rows = card.points.map(
    (point) =>
      `<tr data-decided="${point.decided}" data-confident="${point.confident}" data-draw="${point.draw}">` +
      `<td><span class="swatch ${point.draw}"></span>${safe(point.label)}</td>` +
      cell(point.decided, 'fig') +
      cell(point.refused, 'fig') +
      `<td class="fig${point.aboveSeventy ? ' hot' : ''}">${safe(fig(point.share))}%</td>` +
      `<td class="mark">${point.draw}${point.confident ? '' : ' — fewer than ten decisions'}</td>` +
      '</tr>',
  )
  return chartPanel(
    card.chart,
    card.title,
    card.note,
    numbers(card.chart, ['Group', 'Decided', 'Refused', '% refused', 'Drawn'], rows),
  )
}

function overview(input: PageInput): string {
  const runs = input.fleet.runs
  const stages = stagePoints(input.fleet)
  const scores = scorePoints(input.fleet)
  const cards = groupCards(input.fleet)
  const spend = spendPoints(input.fleet)
  const ports = COST_PORTS
  const stageKeys = Object.keys(STAGE_LABELS)
  const decided = runs.reduce((total, one) => total + derivedOf(one).decided, 0)
  const refused = runs.reduce((total, one) => total + derivedOf(one).refused, 0)
  const cents = spend.reduce((total, one) => total + one.spentCents, 0)

  const tiles = [
    tile('Runs in this record', String(runs.length), 'every finished run, none excluded'),
    tile(
      'Reels made',
      String(runs.filter((one) => one.reel.madeAFile).length),
      'a readable video file came out',
    ),
    tile('Cents in all', fig(cents), 'what the ports were paid, by our own receipts'),
    tile('Pictures Gate 1 decided', String(decided), `${refused} of them refused`),
    tile(
      'Share Gate 1 refused',
      `${fig(decided === 0 ? 0 : Math.round((refused / decided) * 1000) / 10)}%`,
      'over every decided picture in the record',
    ),
  ].join('')

  const stageTable = numbers(
    'where-reels-die',
    ['Stage', 'Runs that reached it', 'Not handed on'],
    stages.map((point) =>
      row([cell(point.label), cell(point.runs, 'fig'), cell(point.dropped, 'fig')]),
    ),
  )

  const scoreTable = numbers(
    'scores-over-time',
    ['Run', 'Ran at', 'Line', 'Rating'],
    scores.map((point) =>
      row([
        cell(shortId(point.runId)),
        cell(when(point.at)),
        cell(point.label),
        cell(point.value, 'fig'),
      ]),
    ),
  )

  const spendTable = numbers(
    'cost-and-wall-clock',
    [
      'Run',
      'Ran at',
      ...ports.map((port) => `${port.label}, cents`),
      'Cents in all',
      ...stageKeys.map((stage) => `${STAGE_LABELS[stage]}, s`),
      'Wall clock, s',
    ],
    spend.map((point) =>
      row([
        cell(shortId(point.runId)),
        cell(when(point.at)),
        ...ports.map((port) => cell(point.cents[port.key] ?? '—', 'fig')),
        cell(point.spentCents, 'fig'),
        ...stageKeys.map((stage) => cell(point.seconds[stage] ?? '—', 'fig')),
        cell(point.wallClockSeconds, 'fig'),
      ]),
    ),
  )

  const newest = [...runs].reverse().slice(0, 8)

  return `<section class="view" data-view="overview">
${section('The whole record', 'Every run the engine has made, scored from what it wrote', 'No run is left out and nothing is averaged away. A reel counts as made only when a readable video file came out.')}
<div class="panel"><div class="body flush"><div class="tiles">${tiles}</div></div></div>
<div class="grid2">
${chartPanel('where-reels-die', 'Where reels die', 'How many runs reached each stage, in stage order. The red figure above a bar is what the stage before it did not hand on.', stageTable, biggestDrop(stages))}
${chartPanel('scores-over-time', 'Scores over time', 'Each run’s five part scores and its overall rating, against the day it ran. Click a name in the legend to hide that line.', scoreTable, 'A gap in a line means the run never reached that part, so it has no rating there rather than a zero.')}
</div>
${section('Group by a property', 'Which setups are hard', 'The same decided pictures, grouped four ways. Each bar carries the share Gate 1 refused and the size of its group; a group of fewer than ten decisions is drawn outlined, because a small group looks like a finding when it is not one.')}
<div class="grid2">
${cards.map((card) => groupPanel(card)).join('\n')}
</div>
${section('Per run', 'Where the money and the time went', 'One bar per run, oldest first, split by the port that was paid and by the stage the seconds went to.')}
${chartPanel('cost-and-wall-clock', 'Cost and wall clock', 'cents by port and seconds by stage, one bar per run', spendTable)}
<div class="panel">
  <div class="head"><h3>Newest runs</h3><span class="note">The full list, with filters and a checkbox, is in the Ledger.</span></div>
  <div class="body flush"><div class="scroll"><table>${head(['Run', 'Ran at', 'World', 'Ending', 'Reel', 'Rating', 'Cents'])}<tbody>${newest
    .map((one) =>
      row([
        cell(shortId(one.runId)),
        cell(when(one.createdAt)),
        cell(one.worldId),
        cell(one.ending.status),
        cell(one.reel.madeAFile),
        cell(one.rating.rating, 'fig'),
        cell(derivedOf(one).spentCents, 'fig'),
      ]),
    )
    .join('')}</tbody></table></div></div>
</div>
</section>`
}

// ---------------------------------------------------------------- the ledger

function choices(name: string, label: string, values: readonly string[]): string {
  const options = ['<option value="">any</option>']
    .concat(values.map((value) => `<option value="${safe(value)}">${safe(value)}</option>`))
    .join('')
  return `<label class="ctl">${safe(label)}<select id="${name}">${options}</select></label>`
}

function ledger(input: PageInput): string {
  const runs = input.fleet.runs
  const distinct = (values: readonly string[]): string[] => [...new Set(values)].sort()
  const rows = runs.map((one) => {
    const derived = derivedOf(one)
    return (
      `<tr data-run="${safe(one.runId)}">` +
      `<td><input type="checkbox" data-pick="${safe(one.runId)}" aria-label="pick ${safe(shortId(one.runId))}" /></td>` +
      cell(shortId(one.runId)) +
      cell(when(one.createdAt)) +
      cell(one.worldId) +
      cell(one.briefKey.slice(0, 8)) +
      cell(one.ending.status) +
      cell(one.ending.step) +
      cell(one.reel.madeAFile) +
      cell(one.rating.rating, 'fig') +
      cell(derived.spentCents, 'fig') +
      cell(derived.decided, 'fig') +
      `<td class="fig">${safe(fig(derived.refusedShare))}%</td>` +
      `<td><a href="?run=${encodeURIComponent(one.runId)}">open</a></td>` +
      '</tr>'
    )
  })
  return `<section class="view" data-view="ledger" hidden>
${section('Find a run', 'Ledger', 'Filter and sort every run. Tick the ones you want and press Compare to put their figures side by side.')}
<div class="panel">
  <div class="head"><h3>All runs</h3><span class="note" id="ledger-count">${runs.length} runs</span></div>
  <div class="body">
    <div class="controls">
      ${choices('f-world', 'World', distinct(runs.map((one) => one.worldId)))}
      ${choices('f-ending', 'Ending', distinct(runs.map((one) => one.ending.status)))}
      ${choices('f-brief', 'Brief', distinct(runs.map((one) => one.briefKey)))}
      <label class="ctl">Made a reel<select id="f-made"><option value="">any</option><option value="yes">yes</option><option value="no">no</option></select></label>
      <label class="ctl">Search<input type="search" id="f-q" placeholder="run id or world" autocomplete="off" /></label>
      <button class="ghost" id="f-clear" type="button">Clear</button>
      <button class="act" id="go-compare" type="button" disabled>Compare</button>
    </div>
  </div>
  <div class="body flush"><div class="scroll"><table>${head([
    'Pick',
    'Run',
    'Ran at',
    'World',
    'Brief',
    'Ending',
    'Stage',
    'Reel',
    'Rating',
    'Cents',
    'Decided',
    '% refused',
    '',
  ])}<tbody id="ledger-body">${rows.join('')}</tbody></table></div></div>
</div>
</section>`
}

// ---------------------------------------------------------------- the comparison board

function compare(): string {
  const groups = BOARD_GROUPS.map((group) => {
    const rows = group.rows
      .map(
        (one) =>
          `<tr data-key="${safe(one.key)}" data-aim="${one.aim}" data-label="${safe(one.label)}">` +
          `<th class="figure-name">${safe(one.label)}</th>` +
          '</tr>',
      )
      .join('')
    return `<tbody class="group"><tr class="group-head"><th class="figure-name">${safe(group.group)}</th></tr>${rows}</tbody>`
  }).join('')

  return `<section class="view" data-view="compare" hidden>
${section('Side by side', 'Comparison board', `Every figure for every run you picked, in columns — ${BOARD_FIGURES} of them, in nine groups. Briefs and configs may differ and nothing is refused: this board draws no verdict and no delta.`)}
<div class="panel">
  <div class="head">
    <h3>Picked runs</h3>
    <span class="note">An amber stripe marks a row whose values are not all the same. Green is the highest value in that row and red the lowest, and only where a row has a direction at all.</span>
  </div>
  <div class="body">
    <div class="controls">
      <button class="ghost" id="cmp-clear" type="button">Clear the picks</button>
      <label class="ctl"><input type="checkbox" id="cmp-differ" /> show only rows that differ</label>
    </div>
  </div>
  <div class="empty" id="board-empty">No run is picked yet. Open the Ledger, tick the checkbox beside each run you want, and press Compare. Any number of runs may be picked, and they need not share a brief.</div>
  <div class="body flush"><div class="scroll"><table class="board" id="board"><thead><tr id="board-head"><th class="figure-name">Figure</th></tr></thead>${groups}</table></div></div>
</div>
</section>`
}

// ---------------------------------------------------------------- one run

interface PictureItem {
  pictureId: string
  shotId: string
  attempt: number
  chosen: boolean
  inherited: boolean
  costCents: number | string
  prompt: string
  words: string[]
  gate1: { outcome: string; coverage: string }
  gate1Steps: Array<{ step: string; outcome: string; reasons: string[] }>
}

interface TakeItem {
  takeId: string
  shotId: string
  number: number
  mode: string
  requestedSeconds: number | string
  deliveredSeconds: number | string
  outcome: string
  costCents: number | string
  prompt: string
  gates: Array<{ gate: string; outcome: string; reasons: string[] }>
}

interface NarrationItem {
  narrationId: string
  shotId: string
  text: string
  characters: number
  probedSeconds: number | string
  costCents: number | string
}

interface RunParts {
  plan: {
    reached: boolean
    shots: number | string
    subjects: number | string
    subjectsPerShot: number[]
    secondsPerShot: number[]
    totalSeconds: number | string
    selectedRole: string
    forks: Array<{
      role: string
      axis: string
      unitCount: number
      score: number | string
      selected: boolean
      gate0: { outcome: string; failed: string[] }
    }>
  }
  pictures: { reached: boolean; attempted: number; chosen: number; items: PictureItem[] }
  narration: { reached: boolean; items: NarrationItem[] }
  clips: { reached: boolean; items: TakeItem[] }
  cut: {
    reached: boolean
    finished: boolean
    profile: string
    manifestShots: number
    output: {
      readable: boolean | string
      durationSeconds: number | string
      frames: number | string
    }
    holds: Array<{ shotId: string; seconds: number; reason: string }>
    gate7: { outcome: string; coverage: string; asked: number; yes: number; answeredNo: string[] }
  }
}

interface RunCard {
  runId: string
  worldId: string
  briefKey: string
  createdAt: string
  pictureRule: string
  ending: { status: string; step: string; rule: string; detail: string; failure: string }
  reel: { madeAFile: boolean; durationSeconds: number | string; frames: number | string }
  costCents: Record<string, number | string>
  wallClockSeconds: number | string
  stages: Record<string, { seconds: number | string; rule: string }>
}

interface RunRating {
  rating: number | string
  label: string
  parts: Record<string, { rating: number | string; reached: boolean; inherited: boolean }>
}

/** The words the engine used, folded behind a click — and never printed as a path or a url. */
const folded = (label: string, words: string): string =>
  words === ''
    ? ''
    : `<details class="words"><summary>${safe(label)}</summary><pre>${safe(words)}</pre></details>`

function reasonsOf(steps: PictureItem['gate1Steps']): string {
  const reasons = steps.flatMap((step) => step.reasons.map((reason) => `${step.step}: ${reason}`))
  return reasons.length === 0 ? '—' : reasons.map((one) => safe(one)).join('<br />')
}

function runView(input: PageInput): string {
  const payload = input.run
  const head7 = section(
    'One run, end to end',
    'What happened in a single run',
    'The stages it reached, what it spent, and every picture, take and gate verdict — with the exact words the engine used, folded behind a click.',
  )
  const picker = `<label class="ctl" style="margin-left:auto">Pick a run<select id="r-pick">${input.fleet.runs
    .map(
      (one) =>
        `<option value="${safe(one.runId)}"${one.runId === input.selectedRunId ? ' selected' : ''}>${safe(
          `${shortId(one.runId)} · ${when(one.createdAt)} · ${one.worldId}`,
        )}</option>`,
    )
    .join('')}</select></label>`

  if (payload === undefined) {
    return `<section class="view" data-view="run" hidden>
${head7}
<div class="panel"><div class="head"><h3>Run</h3>${picker}</div>
<div class="empty">This record holds no finished run to open.</div></div>
${chartPanel('run-seconds-and-cents', 'Cost and time', 'this run alone, split by port and by stage', numbers('run-seconds-and-cents', ['Bar', 'Part', 'Figure'], []))}
</section>`
  }

  const card = payload.run as unknown as RunCard
  const parts = payload.parts as unknown as RunParts
  const rating = payload.rating as unknown as RunRating
  const split = runSplitPoints(payload)

  const tiles = [
    tile('Rating', fig(rating.rating), String(rating.label)),
    tile('Ending', String(card.ending.status), `at the ${fig(card.ending.step)} stage`),
    tile(
      'Cents',
      fig(
        Object.values(card.costCents).reduce<number>(
          (t, c) => t + (typeof c === 'number' ? c : 0),
          0,
        ),
      ),
      'what the ports were paid for this run',
    ),
    tile('Wall clock, s', fig(card.wallClockSeconds), 'first row written to last'),
    tile(
      'Pictures decided',
      String(parts.pictures.items.length),
      `${parts.pictures.chosen} chosen`,
    ),
  ].join('')

  const railParts: Array<[string, boolean]> = [
    ['Plan', rating.parts.plan?.reached === true],
    ['Pictures', rating.parts.pictures?.reached === true],
    ['Narration', rating.parts.narration?.reached === true],
    ['Clips', rating.parts.clips?.reached === true],
    ['Cut', rating.parts.cut?.reached === true],
    ['Reel made', card.reel.madeAFile],
  ]
  const rail = railParts
    .map(
      ([label, reached]) =>
        `<div class="block" data-stage="${safe(label.toLowerCase())}" data-reached="${reached}">${safe(label)}<br /><span class="pill">${reached ? 'reached' : 'not reached'}</span></div>`,
    )
    .join('')

  const splitTable = numbers(
    'run-seconds-and-cents',
    ['Bar', 'Part', 'Figure'],
    split.map((point) => row([cell(point.measure), cell(point.label), cell(point.value, 'fig')])),
  )

  const planPanel = `<div class="panel">
  <div class="head"><h3>Plan</h3><span class="note">what was planned, and which fork was selected</span></div>
  <div class="body flush"><div class="scroll"><table>${head(['Figure', 'Value'])}<tbody>
  ${row([cell('Shots'), cell(parts.plan.shots, 'fig')])}
  ${row([cell('Subjects'), cell(parts.plan.subjects, 'fig')])}
  ${row([cell('Subjects per shot'), cell(parts.plan.subjectsPerShot)])}
  ${row([cell('Seconds per shot'), cell(parts.plan.secondsPerShot)])}
  ${row([cell('Planned seconds'), cell(parts.plan.totalSeconds, 'fig')])}
  ${row([cell('Selected fork'), cell(parts.plan.selectedRole)])}
  </tbody></table></div></div>
  <div class="body flush"><div class="scroll"><table>${head(['Fork', 'Axis', 'Units', 'Gate 0', 'Score', 'Selected'])}<tbody>${parts.plan.forks
    .map((fork) =>
      row([
        cell(fork.role),
        cell(fork.axis),
        cell(fork.unitCount, 'fig'),
        cell(
          `${fork.gate0.outcome}${fork.gate0.failed.length === 0 ? '' : ` (${fork.gate0.failed.join(', ')})`}`,
        ),
        cell(fork.score, 'fig'),
        cell(fork.selected),
      ]),
    )
    .join('')}</tbody></table></div></div>
</div>`

  const picturesPanel = `<div class="panel">
  <div class="head"><h3>Pictures</h3><span class="note">every picture, its verdict, its cost, and the exact words that asked for it</span></div>
  <div class="body flush"><div class="scroll"><table>${head(['Picture', 'Shot', 'Attempt', 'Gate 1', 'Chosen', 'Cents', 'Why it was refused', 'Words'])}<tbody>${parts.pictures.items
    .map(
      (item) =>
        '<tr>' +
        cell(item.pictureId) +
        cell(item.shotId) +
        cell(item.attempt, 'fig') +
        cell(`${item.gate1.outcome}${item.inherited ? ' (copied in)' : ''}`) +
        cell(item.chosen) +
        cell(item.costCents, 'fig') +
        `<td>${reasonsOf(item.gate1Steps)}</td>` +
        `<td>${folded('the prompt', item.prompt)}${item.words.length === 0 ? '' : folded('words read in it', item.words.join(', '))}</td>` +
        '</tr>',
    )
    .join('')}</tbody></table></div></div>
</div>`

  const narrationPanel = `<div class="panel">
  <div class="head"><h3>Narration</h3><span class="note">every line spoken, what it cost and how long it came back</span></div>
  <div class="body flush"><div class="scroll"><table>${head(['Narration', 'Shot', 'Characters', 'Probed s', 'Cents', 'Words'])}<tbody>${parts.narration.items
    .map(
      (item) =>
        '<tr>' +
        cell(item.narrationId) +
        cell(item.shotId) +
        cell(item.characters, 'fig') +
        cell(item.probedSeconds, 'fig') +
        cell(item.costCents, 'fig') +
        `<td>${folded('the line', item.text)}</td>` +
        '</tr>',
    )
    .join('')}</tbody></table></div></div>
</div>`

  const clipsPanel = `<div class="panel">
  <div class="head"><h3>Clips</h3><span class="note">every take, its mode, what it was asked for and what came back</span></div>
  <div class="body flush"><div class="scroll"><table>${head(['Take', 'Shot', 'No.', 'Mode', 'Asked s', 'Delivered s', 'Outcome', 'Cents', 'Gate verdicts', 'Words'])}<tbody>${parts.clips.items
    .map(
      (item) =>
        '<tr>' +
        cell(item.takeId) +
        cell(item.shotId) +
        cell(item.number, 'fig') +
        cell(item.mode) +
        cell(item.requestedSeconds, 'fig') +
        cell(item.deliveredSeconds, 'fig') +
        cell(item.outcome) +
        cell(item.costCents, 'fig') +
        `<td>${item.gates
          .map(
            (gate) =>
              `${safe(gate.gate)}: ${safe(gate.outcome)}${gate.reasons.length === 0 ? '' : ` — ${safe(gate.reasons.join('; '))}`}`,
          )
          .join('<br />')}</td>` +
        `<td>${folded('the prompt', item.prompt)}</td>` +
        '</tr>',
    )
    .join('')}</tbody></table></div></div>
</div>`

  const gate7 = payload.gate7Answers
  const cutPanel = `<div class="panel">
  <div class="head"><h3>Cut</h3><span class="note">the assembled file, what was held, and Gate 7 question by question</span></div>
  <div class="body flush"><div class="scroll"><table>${head(['Figure', 'Value'])}<tbody>
  ${row([cell('Finished'), cell(parts.cut.finished)])}
  ${row([cell('Container'), cell(parts.cut.profile)])}
  ${row([cell('Shots in the manifest'), cell(parts.cut.manifestShots, 'fig')])}
  ${row([cell('Readable'), cell(parts.cut.output.readable)])}
  ${row([cell('Seconds'), cell(parts.cut.output.durationSeconds, 'fig')])}
  ${row([cell('Frames'), cell(parts.cut.output.frames, 'fig')])}
  ${row([cell('Gate 7'), cell(`${parts.cut.gate7.outcome} — ${fig(parts.cut.gate7.yes)} of ${fig(parts.cut.gate7.asked)} answered yes`)])}
  </tbody></table></div></div>
  <div class="body flush"><div class="scroll"><table>${head(['Held shot', 'Seconds', 'Why'])}<tbody>${parts.cut.holds
    .map((held) => row([cell(held.shotId), cell(held.seconds, 'fig'), cell(held.reason)]))
    .join('')}</tbody></table></div></div>
  <div class="body flush"><div class="scroll"><table>${head(['Gate 7 question', 'Answer'])}<tbody>${gate7
    .map((one) => row([cell(one.question), cell(one.answer)]))
    .join('')}</tbody></table></div></div>
</div>`

  const named =
    input.unknownRun === undefined
      ? ''
      : `<p class="legend-note">No finished run named ${safe(shortId(input.unknownRun))} is in this record, so the newest one is open.</p>`

  return `<section class="view" data-view="run" hidden>
${head7}
<div class="panel">
  <div class="head"><h3>Run ${safe(shortId(card.runId))}</h3><span class="note">${safe(`${card.worldId} · ${when(card.createdAt)} · picture rule ${card.pictureRule}`)}</span>${picker}</div>
  ${named}
  <div class="body flush"><div class="tiles">${tiles}</div></div>
  <div class="rail">${rail}</div>
</div>
${chartPanel('run-seconds-and-cents', 'Cost and time', 'this run alone, split by port and by stage', splitTable, 'The estimate at admission covers the selected plan’s intended calls only — not the reserve image slots, the narration, a retake or a repair, and not a call that was paid for and answered nothing.')}
${planPanel}
${picturesPanel}
${narrationPanel}
${clipsPanel}
${cutPanel}
</section>`
}

// ---------------------------------------------------------------- the document

/** The page's own block: what its script is handed, and what check 15 reads its charts from. */
function block(input: PageInput): string {
  const cards = groupCards(input.fleet)
  const charts: Record<string, unknown> = {
    'where-reels-die': { points: stagePoints(input.fleet) },
    'scores-over-time': { points: scorePoints(input.fleet), series: scoreSeries() },
    'cost-and-wall-clock': {
      points: spendPoints(input.fleet),
      ports: COST_PORTS.map((port) => ({ key: port.key, label: port.label })),
      stages: Object.entries(STAGE_LABELS).map(([key, label]) => ({ key, label })),
    },
    'run-seconds-and-cents': { points: runSplitPoints(input.run) },
  }
  for (const card of cards) charts[card.chart] = { points: card.points, title: card.title }

  const runs = input.fleet.runs.map((one) => ({ ...one, derived: derivedOf(one) }))
  const payload = { selectedRunId: input.selectedRunId ?? '', runs, charts }
  // `<` is escaped so no string of the record can close this block early; the scrubber has
  // already taken every url and every artifact root out of every string in it.
  return JSON.stringify(payload).replace(/</g, '\\u003c')
}

/**
 * The whole document: its CSS inline, its data inline, its own script inline, and ONE asset — the
 * vendored drawing file, named by a RELATIVE url. No absolute `http://` or `https://` url appears
 * anywhere in it (check 11): ECharts 5.5.1 is not on cdnjs, which is the failure behind that
 * clause, and a page of a local record has nothing to ask the network for.
 */
export function benchmarkPage(input: PageInput): string {
  return `<!doctype html>
<html lang="en" data-theme="dark">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Cutroom benchmark</title>
<style>${PAGE_STYLE}</style>
</head>
<body>
<header class="bar">
  <h1>Cutroom benchmark</h1>
  <span class="note">${safe(`every finished run in this record, read from the record itself · ${input.fleet.runs.length} runs`)}</span>
  <span class="spacer"></span>
  <div class="sizer" aria-label="Chart size">
    <button type="button" data-height="380">S</button>
    <button type="button" data-height="520" aria-current="true">M</button>
    <button type="button" data-height="700">L</button>
    <button type="button" data-height="940">XL</button>
  </div>
  <button class="ghost" id="theme" type="button">Light or dark</button>
  <nav class="views" aria-label="Views">
    <button type="button" data-show="overview" aria-current="true">Overview</button>
    <button type="button" data-show="ledger">Ledger</button>
    <button type="button" data-show="compare">Compare<span id="nav-compare"></span></button>
    <button type="button" data-show="run">One run</button>
  </nav>
</header>
<main>
${overview(input)}
${ledger(input)}
${compare()}
${runView(input)}
</main>
<script src="echarts.min.js"></script>
<script id="benchmark-data" type="application/json">${block(input)}</script>
<script>${PAGE_SCRIPT}</script>
</body>
</html>
`
}
