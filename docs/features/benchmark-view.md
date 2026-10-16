---
status: current
authority: plan
---

# benchmark-view — one page that shows what a run did, opened from a file and nothing else

Status: planned
Decisions: D-022, D-086, D-087, S-016, S-109, S-111, S-166, S-182, S-184, S-198, S-200
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
> reads **the scoring half's own `--out` record**, which exists and holds 52 runs, it draws no verdict and no
> delta, and the stratification below is this feature's rather than the comparison's. After it, the benchmark is
> complete and the queue moves to `self-heal`.

## What it is

**One self-contained HTML file with its data inlined**, written by the benchmark under its own gitignored output
path and opened by double-clicking it. The proven form in this repository is
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
