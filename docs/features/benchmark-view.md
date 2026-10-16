---
status: current
authority: plan
---

# benchmark-view — one page that shows what a run did, opened from a file and nothing else

Status: planned
Decisions: D-022, D-086, D-087, S-016, S-109, S-111, S-166, S-180, S-182, S-184, S-198, S-200, S-201
Gates: product pending · architecture pending · program-design pending · slices pending

> **Created 2026-10-12 at the owner's request**, in session 83, by S-184: _"i want the benchmark system to be
> visualizable as well you know what i mean, some ui/frontend work for visualization"_, and then _"the visualization
> also its own feature"_.
>
> **It is built after the scoring half**, because a page that draws numbers which do not exist yet is designed
> against guesses. **Its gates are not written**, and no implementation file exists until all four are approved.
>
> **It is now the benchmark's LAST part, and the only one left** (S-200, 2026-10-16). `yield-compare` is stopped —
> three adversarial rounds refused all four of its gates and the owner stopped it rather than approve it by
> decision: _"No just leave it, we should just build the view part of it and end the benchmark."_ So this page
> draws no verdict and no delta, and the stratification below is this feature's rather than the comparison's.
> After it, the benchmark is complete and the queue moves to `self-heal`.
>
> **The owner then specified its shape by answering, and APPROVED it on 2026-10-17 against a working mockup built
> from all 52 real runs — S-201**: _"Alright now it looks good."_ So "The shape the owner approved" below is
> settled, and the gates are written to it rather than re-deciding it. S-201 also supersedes S-184's
> self-contained no-server page and amends S-200's sentence about the `--out` record: it is **a local server you
> start, reading `data/cutroom.sqlite` directly**.

## What it is

**~~One self-contained HTML file with its data inlined, opened by double-clicking it.~~ SUPERSEDED by S-201** —
it is a local server you start, because a page opened from the filesystem cannot load a data file beside it. What
stands from this paragraph is how the PAGE is built. The proven form in this repository is
`knowledge-transfer/cutroom-kt.html` (session 80): no CDN, no server, no build step, works offline, draggable and
searchable. That page is the precedent for how, and the reason this needs no new package, no dependency and no
boundary rule.

## What it shows

- **One run** — five stacked panels, one a part: the plan, the pictures, the narration, the clips, the cut, each
  with its rating, its numbers and its gate verdicts. Every picture as a row with the exact words that asked for it
  and each reason it was refused; every take with its probe, its scan and its four verdicts; the cut with Gate 7
  question by question. A bar across the top showing where the seconds and the cents went, which is the one thing
  no table makes obvious.
- **A stratification** — the chart that would have made session 82's finding obvious at a glance: the refusal rate
  by subjects per shot, 42% / 70% / 100%. **This is now this feature's, not the comparison's** (S-200), and it is
  the view that answers _which setup is good_ over the runs already made, with no matched pairs at all. It keeps
  the figures; **whether each bar carries an uncertainty band is one of the gates' questions below**, because the
  arithmetic for one belonged to the stopped feature.
- **The ledger** — every run as one sortable row, so the history is readable without opening the database.

## The shape the owner approved (S-201)

**Settled by the owner answering eleven questions on 2026-10-16, then approved against a working mockup on
2026-10-17** — _"Alright now it looks good"_. None of this is open, and the gates must be written to it rather than
re-deciding it. The mockup is at `.artifacts/view-mockup/cutroom-benchmark.html` (gitignored, self-contained, built
from all 52 real runs) with its source, its extractor and its build script beside it. **If that directory is gone,
this section is the specification.**

### How it runs

|           |                                                                                                       |
| --------- | ----------------------------------------------------------------------------------------------------- |
| process   | **a local server you start**: `node scripts/benchmark-serve.mjs`, opened on localhost                 |
| data      | **`data/cutroom.sqlite` opened read-only**, scored on the fly by `packages/benchmark`. No export step |
| scope     | **finished runs only**; a run in progress is out of scope                                             |
| reach     | **localhost only**. Not hosted — S-180 stands                                                         |
| processes | the serving reader starts **none at all** (the exhaustive `processes` deep-equal)                     |

### The four views

1. **Overview** (the landing view) — headline tiles; **where reels die**; **scores over time**; the four
   group-by cards; cost and wall clock per run; the newest runs.
2. **Ledger** — every run, sortable on each column, filtered by world / ending / brief / made-a-reel / free text,
   with a checkbox per row and a Compare button.
3. **Compare** — the picked runs as columns.
4. **One run** — tiles, a stage rail, a cost-and-time split, then part by part.

### The charts

- **Where reels die** — a **plain column chart in stage order**, Plan → Pictures → Narration → Clips → Cut → Reel
  made, each bar labelled with its count and **the loss from the previous stage in red above it**. Not a funnel
  (refused by name), and not sorted (the sequence is the information). A line under it names the biggest drop.
- **Scores over time** — six toggleable lines, the five part scores plus the overall rating, against the date each
  run ran. A gap where the run never reached that part, **never a zero**.
- **Four group-by cards**, each its own panel with its own header, laid out 2×2: subjects named in the shot,
  picture rule in force, shots in the plan, world the brief came from. Each bar carries its `%` and its group size
  in the tooltip; a bar turns red past 70%, with the figure always written so colour never carries it alone.
- **Cost and wall clock** — one stacked bar per run, oldest first, split by port and by stage.
- **Per run** — a two-row stacked bar, seconds and cents.

### The comparison board

**Any number of runs as columns**, roughly fifty figures as rows in nine groups — Outcome, Part scores, Cost, Time,
Plan, Pictures, Clips, Cut, Setup. A row whose values are not all equal gets an accent stripe; the best value in a
row is tinted good and the worst critical, **only where the row has a better direction**. **Briefs and configs may
differ and nothing is refused.** No band, no verdict word, no comparability rule — this is not `yield-compare`
(S-200). A "show only rows that differ" toggle, and an empty state that says how to pick runs.

### The run view

Tiles, then a **stage rail** — one block per part plus the reel, green-topped where reached and dimmed where not —
then the cost-and-time split, then a panel per part. Every picture carries its outcome, its shot, its attempt, its
cost, **its Gate 1 refusal reasons in the gate's own words**, and the exact prompt **folded behind a click**. Every
take carries its mode, its asked and delivered seconds, its gate verdicts and its prompt the same way. Gate 7 is
listed question by question.

### The look

- **Dark theme is true black**: `#000000` ground, surfaces lifting by light alone (`#0c0c0e`, `#151518`,
  `#1f1f23`), borders `#242428`, **no hue cast in any neutral**. One accent, amber `#ffb224`. The light theme is
  the same structure in neutral greys.
- **Full bleed**: no centred column, a 16px gutter, and **never more than two charts across**.
- **Four chart-size presets** (380 / 520 / 700 / 940px) and a **drag handle on every chart**, with a
  `ResizeObserver` redrawing it.
- Type: Archivo for display, IBM Plex Sans for body, IBM Plex Mono for every figure, with `tabular-nums`
  throughout. Section headings 29px, tile figures 44px, base text 15px.
- **Every section states in one plain line what it is for.** That was most of what made the first draft
  unreadable.
- **Chart colours are the validated categorical palette**, fixed order, checked with the colour-blindness and
  contrast validator in both themes. **Re-colouring means re-validating**, not swapping hexes.

### What the gates still have to settle

- **How the page receives its data** — one payload on load, or a route per view — and what the server exposes.
- **Whether a group-by bar carries an uncertainty band at all.** The figures are the scoring half's; the
  arithmetic for a band went with the stopped feature (S-200). Three answers, each with a cost: a single-side band
  computed in the server; the figures with each group's size and **no band**, said on the page; or raw counts. **A
  group of one or two runs drawn as a confident bar is the failure to avoid.**
- **Where the vendored ECharts build lives** and what holds it to its pinned version.
- **What of a model's words may be rendered**, under D-022, now that a page is the surface rather than a terminal.
- **How it is checked without a browser in the suite** — structure asserted from the served HTML, or headless
  Chrome (S-166), with a check that silently skips when a browser is absent refused outright (S-111).
- **The shared row loader**: the open, the held columns, the row selection and the prefix resolution move out of
  `scripts/benchmark.mjs` so two readers do not hold two copies of the schema, and
  `tests/yield-benchmark-reader.test.ts`' scan grows to the set clause by clause. This moved here from the stopped
  feature and is the one place this feature can break something that already works.

## What the gates must settle

- **Where the page's data comes from**: inlined into the file by the benchmark, or loaded from the JSON record
  beside it. Inlining opens from the filesystem with no server; a sibling file does not, under a browser's
  file-origin rules. This is the choice the gates must make, with what it costs. **The record it reads is
  `scripts/benchmark.mjs`' own `--out`, which exists and holds 52 runs** — never a comparison's, since
  `yield-compare` is stopped (S-200).
- **Whether a stratum carries an uncertainty band, and if so what computes it.** The figures are the scoring
  half's; the band was `yield-compare`'s and is gone with it. Three answers are available and the gates must pick
  one with its cost: a single-side band computed in the page's writer; the figures with each stratum's member
  count and **no band**, said on the page so a bare rate is not read as precise; or the raw counts alone. **A
  stratum of one or two runs drawn as a confident bar is the failure to avoid** — session 82's 42% / 70% / 100%
  was persuasive because the groups were large, and the record does not guarantee that for every property.
- **Where the page is written**, as one setting with a gitignored default (D-086, D-087). **Nothing generated is
  committed** (CLAUDE.md rule 4), and a page carrying a run's blobs holds absolute artifact paths unless they are
  made relative first — the same rule the ledger already has.
- **What of a model's words the page may show.** The scorecard's screen view prints them only when asked
  (D-022's form); a page is a different surface and the gates say whether a prompt, an observation or a reconciler's
  answer is rendered, folded, or left out.
- **How it is checked without a browser in the suite.** S-166 made headless Chrome a machine dependency like
  ffmpeg, and session 80 verified a page that way by hand; whether this feature's checks assert structure from the
  emitted HTML's text, or drive a browser, is the gates' choice, and a check that silently skips when a browser is
  absent is the arrangement S-111 rejected outright.
- **Whether a chart is drawn as inline SVG or as a table with bars**, and the accessibility floor either way — this
  is internal tooling, so the product's no-scores copy law does not reach it, but a figure nobody can read is not a
  visualisation.

## What it must not do

Change any engine behaviour; weaken a check; need a server, a CDN, a build step or a network; reach a provider;
read a key; or commit anything it generates.
