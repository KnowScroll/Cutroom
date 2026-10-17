---
status: current
authority: plan
---

# benchmark-view — one local page that shows what every run did, served from the engine's own database

Status: planned — the four gates are approved, by a read the owner delegated; no implementation file exists (S-205)
Decisions: D-022, D-086, D-087, S-016, S-109, S-111, S-166, S-180, S-182, S-184, S-197, S-198, S-200, S-201, S-203, S-204, S-205
Gates: product APPROVED 2026-10-17 owner-delegated-S-205 · architecture APPROVED 2026-10-17 owner-delegated-S-205 · program-design APPROVED 2026-10-17 owner-delegated-S-205 · slices APPROVED 2026-10-17 owner-delegated-S-205

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
>
> **No adversarial round is run on these gates — S-203, 2026-10-17**, the owner's call: _"No adversarial
> gate-reviewer round for that session we dont need it."_ The four gates are written in full, and **the owner then
> delegated the approving read — S-205**: _"You read and aaprove them"_. So the `Gates:` line records
> `owner-delegated-S-205`, which no other feature carries; **no reviewer read these gates and neither did the
> owner**, and the read that approved them found four faults in its own text and fixed them, all four listed in
> S-205.
> **The slices carry the review**: every finding against a gate sentence is written into this file's amendment
> block when it is reported, as a numbered list (S-197), and a slice whose check will not pass as written stops and
> reports (S-016).

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
- **Whether anything at all is written to disk.** With a server reading the database there is no generated page, so
  the gates say so plainly; if any file is written — a cache, an export, a saved view — it is one setting with a
  gitignored default (D-086, D-087), **nothing generated is committed** (CLAUDE.md rule 4), and anything carrying a
  run's blobs holds absolute artifact paths unless they are made relative first, the rule the ledger already has.
- **The accessibility floor of a chart beyond colour.** The look above fixes the validated palette and writes every
  figure, so colour never carries a reading alone; the gates say what a reader with no colour and no pointer still
  gets. This is internal tooling, so the product's no-scores copy law does not reach it — but a figure nobody can
  read is not a visualisation.

## ~~What the gates must settle~~ — superseded by S-201, folded into the section above

This section was written on 2026-10-16, **before** the owner specified the page's shape, and S-201 decided against
two of its six items: _"where the page's data comes from"_ offered inlining-versus-a-sibling-file when the answer is
a local server reading `data/cutroom.sqlite`, and _"inline SVG or a table with bars"_ was answered by vendored
ECharts with simple bars as SVG. Its other four are open and now live in **"What the gates still have to settle"**
above, which is the single list the gates answer — two of them moved here on 2026-10-17 in the same pass that
emptied this one. Kept as a marker rather than deleted silently, so a reader who remembers this section is told what
happened to it.

## What it must not do

Change any engine behaviour; weaken a check; reach a CDN, a network or a build step **at runtime** — a local server
is now how it runs (S-201), and the ECharts build is vendored and served by it; write to the database it opens, or
open it other than read-only; reach a provider; read a key; or commit anything it generates.

## Gate 1 — Product (no technical language)

**Who it is for.** The owner, alone, on this machine. Nobody else, and nothing automatic reads it.

**What they have today.** Fifty-two finished reel attempts, scored part by part, written out as fifty-two rows of
numbers in `docs/research/benchmark.md`. Those rows answer _what did this run score_. They cannot answer _where do
reels die_, _is anything moving_, _how do these two runs differ_, or _what did the engine actually say about this
picture_ — and the last of those has never been readable at all without opening the database by hand.

**What they can do with the page.**

- **See where reels die.** Of the runs that were started, how many reached a plan, pictures, narration, clips, a cut
  and a finished reel — in that order, each step labelled with how many were lost since the step before.
- **See whether anything is moving.** The five part scores and the overall score of every run, in the order the runs
  happened, as lines that can be turned on and off one at a time.
- **See which setups refuse pictures.** The same reading grouped four ways — by how many subjects a shot named, by
  which picture rule was in force, by how many shots the plan had, and by which world the brief came from — each
  group showing **how many decisions it is made of**, beside its figure, always.
- **Put any runs side by side.** Pick them with checkboxes in a filterable list of every run; get one column per run
  and one row per figure, with the rows that differ marked. Briefs and settings may differ freely and nothing is
  refused.
- **Open one run and read it.** Every picture with the words that asked for it and each reason it was refused, in the
  engine's own words; every clip with what was asked, what came back and how it was judged; the closing questions one
  by one; and where the seconds and the cents went.

**What it must give them, without exception.**

1. **One command starts it, and it opens in a browser on this machine.** Nothing is typed in, nothing is exported
   first, and nothing is uploaded.
2. **It reads the real record of finished runs.** A run still going is not shown. No figure is ever entered by hand,
   and the page never changes the record it reads.
3. **It states numbers and never judges.** Nothing on it says better, worse, improved, regressed, won, lost or
   significant. It says what happened, how often, and over how many runs.
4. **A figure over few runs cannot read as a confident one.** Every group says how many decisions it holds, and a
   small group is drawn differently from a large one, so a bar made of two decisions never looks like a bar made of
   forty.
5. **The engine's own words are there, folded away until asked for** — never summarised, never rewritten, and never
   carrying something a provider handed back that must not be written down.
6. **Colour never carries a reading on its own.** Every figure is written as text beside its mark, and every chart
   can be read as a plain table of the same numbers.
7. **It spends nothing, reaches nothing outside this machine, starts nothing, writes nothing and reads no secret.**

**What it is not for.** Anyone but the owner; any machine but this one; a run in progress; and above all **a
judgement about whether an engine change helped** — that judgement was `yield-compare`'s, the owner stopped it
(S-200), and a page that computed one would be that feature again under another name. It is also not a place to start
a run, change a brief, or delete anything.

**Done, in the owner's terms.** One command, a page, four views, the six days of 52 real runs in it, and no sentence
anywhere that tells them what to think about it.

## Gate 2 — Architecture

### Where each part lives

| place                               | what it gains                                                                                                                                                                                                                                      | what it still may not do                                                                                                                                                                                                                             |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/benchmark`                | **nothing new.** It already exports every figure this page draws, `subjectsPerShot` among them                                                                                                                                                     | all it may not do today, and now also: know that a page, a route, a payload or a colour exists                                                                                                                                                       |
| **`packages/benchmark-read`** (new) | **the shared row loader** — the read-only open **of a path it is handed**, the held column set per table, the row selection, the artifact-prefix and URL scrubber — **and the page**: the local server, its routes, the payloads, the HTML and CSS | open a database for writing; **resolve a database path itself**; score anything itself; import `packages/pipeline`, `packages/domain`, `packages/providers` or any app; import a registry package; start a process; reach the network; read a secret |
| `scripts/benchmark.mjs`             | unchanged in what it does; it now **calls the loader** instead of opening the database itself                                                                                                                                                      | everything `yield-benchmark`'s Gate 2 already forbids it; hold a second copy of the column set                                                                                                                                                       |
| `scripts/benchmark-serve.mjs` (new) | **a launcher and nothing else**: read `--db` and `--port`, call the package, print the URL                                                                                                                                                         | hold one line of logic a package could hold; name `real-reel` in any form (`tests/paid-path-real-reel.test.ts:132-135` reads every `scripts/*.mjs` for that string)                                                                                  |
| `vendor/echarts/echarts.min.js`     | the pinned ECharts build, **committed at the repository root**, served as a file by the page's own server                                                                                                                                          | be fetched at runtime; be imported by any source file; be edited by hand; live under `packages/` or `apps/` (see below); change without its pinned hash changing with it                                                                             |
| `tests/benchmark-view-*.test.ts`    | every check below — free, provider-free, browser-free, and port-free                                                                                                                                                                               | drive a browser; call a provider; start the engine; bind a fixed port                                                                                                                                                                                |
| **the engine**                      | **nothing**                                                                                                                                                                                                                                        | —                                                                                                                                                                                                                                                    |

### Why a package, and why one rather than two

**`check.mjs` holds `/^scripts\//` in `FULL_ONLY`** (`scripts/check.mjs:229-235`), so **a feature built in a script
makes every slice a 617 s full run**. `yield-benchmark` made this argument for its arithmetic and it holds again
here: the server, the routes, the payload builders and the page's markup live in a package, where a slice is an
ordinary targeted run, and the script that starts it is written once in the last slice and never touched again.

**It also puts the new code where the boundary rules can see it.** `scripts/drift.mjs:45` cruises `['packages',
'apps']` and nothing else, so **no boundary rule reaches a script at all** — a server left in `scripts/` could import
a provider, the domain or `child_process` and only a hand-written text scan in one test file would notice.

**One package, not two.** A separate loader package would need its own `package.json`, `tsconfig.json`, a root
`tsconfig.json` reference (`tests/workspace.test.ts:76-92`), an `exports` map of exactly `{ ".": "./src/index.ts" }`
(`:68`) and its own boundary rules — doubling that cost for a seam no rule needs, since nothing may import the loader
but the two readers that already exist.

**Rejected.** The loader inside `packages/benchmark`, which `benchmark-no-io` forbids by name (`sqlite` under both
spellings) and which round 3 of `yield-benchmark`'s review deliberately emptied of I/O. The loader left in
`scripts/benchmark.mjs` and imported from there — a script importing a script, still sending every slice to the full
run, and still outside every boundary rule. The page as a static file the scorer writes, which is S-184 and is
superseded by S-201. A new repository, which would be a second copy of the schema (S-182's reason, D-088).

### Two new boundary rules, and the count becomes 27

| rule                       | forbids                                                                                                                    |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `benchmark-read-no-engine` | a `to.path` under `packages/pipeline/`, `packages/domain/`, `packages/providers/` or `apps/` — one regex, four targets     |
| `benchmark-no-reader`      | `packages/benchmark` importing `packages/benchmark-read` — the hole that would hand the pure package `sqlite` transitively |

**Why the second rule is not redundant.** Dependency-cruiser's rules are about **direct** dependencies, so
`benchmark-no-io` stops `packages/benchmark` importing `node:sqlite` itself and says nothing about it importing a
package that does. Without `benchmark-no-reader` the arithmetic could reach a database through the loader and every
existing rule would stay green. `drift --prove` builds a deliberate violation of both, relative and by package name.

**No third rule, and that is checked rather than assumed.** `processes-only-in-providers`
(`.dependency-cruiser.cjs:125`) and `keys-only-in-providers` (`:142`) already apply to every `packages/*` path, so
the new package inherits both and a rule repeating either would read as coverage while catching nothing new. The
npm-import ban is the one real gap, and it is **not** given its own rule either: `packages/benchmark-read` imports no
npm package because it has no dependency to import, and check 11 pins that by reading its `package.json` rather than
by a cruiser rule whose `to` attributes cannot be ANDed with a builtin allowance (`yield-benchmark`'s Gate 2 explains
why that split exists).

### Where the vendored build may NOT live, measured

**Not under `packages/` or `apps/`.** `tests/reel-plan-shapes.test.ts:116-130` reads every source file under those
two folders and fails on a field or object key named `source`, `sources`, `truthState`, `claimText`, `exposure`,
`beat` or `beats`. **The ECharts build contains `source:` as an object key twice**, so a vendored copy under
`packages/` turns that verified check red — and the honest fix is to put the file somewhere the check does not read,
never to narrow the check (CLAUDE.md rule 3). It lives at `vendor/echarts/echarts.min.js`.

### The database path is resolved OUTSIDE the package, and the reason is one of these rules

**`DEFAULT_DB_PATH` and `SETTING_NAMES` are exported by `@cutroom/service`** — that is `apps/service`
(`apps/service/src/settings.ts:47`, `:86`), which `scripts/benchmark.mjs:57` imports today because **no boundary
rule reaches a script**. `benchmark-read-no-engine` forbids `apps/`, so **the package cannot import them, and a
loader that resolved its own path could not be built at all.** The precedence — `--db`, then `CUTROOM_DB_PATH`,
then `DEFAULT_DB_PATH` — therefore lives **once** in `scripts/_lib.mjs`, which both `scripts/benchmark.mjs` and
`scripts/benchmark-serve.mjs` already import, and the loader is handed a resolved path. **Rejected:** carving
`apps/service/src/settings.ts` out of the new rule, which would make the rule's own exception the widest thing
about it; and letting each script resolve the order for itself, which is the second copy this feature exists to
remove.

**Two tracked-file scans do reach it there, and it passes both as measured**: `tests/no-absolute-paths.test.ts:34-46`
and `tests/line-endings.test.ts:40-56` iterate every tracked file including `.js`, and the build carries no absolute
path and no CR byte. **Biome is the one thing that must be told about it**: `biome check .` lints and formats every
tracked `*.js`, so `vendor/` is added to Biome's and Prettier's ignore lists in the same slice, named there as a
third-party build. That is an exclusion of someone else's minified file from our formatter, not a loosened rule about
our code, and it is written into S-204 with that distinction stated.

### How the page receives its data — two routes, measured

| route                 | serves                                                                                                                                                                                                                                   | size, measured on the real 52 runs  |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| `GET /`               | the page: one HTML document, its CSS inline, no script of its own but the vendored file                                                                                                                                                  | —                                   |
| `GET /echarts.min.js` | the committed vendored build, from disk                                                                                                                                                                                                  | 1006 KB, served once                |
| `GET /data`           | the **fleet payload**: every finished run's identity, ending, part scores, costs, stage seconds, plan shape, and one row per decided picture — its shot unit and whether it was refused. **No prompt, no model text, no per-item words** | **39 KB for all 52 runs**           |
| `GET /run/<runId>`    | one run's full scorecard, including the folded words                                                                                                                                                                                     | 3 KB typical, **40 KB** the largest |

**Why not one payload on load.** The whole record is **2665 KB** and nine tenths of that is model text for runs the
owner has not asked to open. Two routes make the landing view a 39 KB load and a run's detail 40 KB at worst.

**Why not a route per view.** Every fleet view — the loss chart, the scores over time, all four group-by cards, the
ledger and the comparison board — reads the same per-run rows, so a route per view would send those rows four times
and put the grouping in four places.

### Where each figure comes from, so that no sentence here names a field that does not exist

- **The run's date is not in the scorecard.** The mockup read it out of the committed ledger's fifteenth column. The
  server reads `run.created_at` (`packages/domain/src/schema.ts:36`, `notNull`), and the ledger is not read at all.
- **Finished only** is `run.state = 'finished'` (`schema.ts:32`, an enum of `running` and `finished`). **Today all 52
  runs are `finished` and none is `running`**, so this filter changes nothing observable on the real database and its
  check needs a crafted one — check 3.
- **The group-by keys off `picture.shot_unit`**, an integer column (`picture` holds `run_id picture_id seq attempt
shot_unit subject_id role label path prompt framing reference_ids measure words gate1 score gate1s degradation
chosen`), indexed into `subjectsPerShot(rows)`, which `packages/benchmark` already exports
  (`measures.ts:717-720`). **Never a regex over an id**: the scorecard's `shotId` is synthesised as `shot-${unit}`
  (`measures.ts:567`), and the mockup's `/(\d+)$/` over that string worked only because of that format.
- **A run with no selected plan has `subjectsPerShot() === []`**, so every one of its pictures falls outside the
  grouping and joins no group. That is correct, and check 8 pins it rather than papering over it.
- **The database holds raw model text.** Nothing under `packages/providers` redacts anything; the benchmark's only
  redaction is at the record's **write** boundary (`scripts/benchmark.mjs:187-191`, applied at `:910-916` to every
  string of the `--out` record). A server reading the database directly therefore **bypasses the only redaction there
  is**, so the scrubber moves into the loader and every string the page serves passes through it: an artifact root
  becomes a relative path (D-086) and `https?://…` becomes `<url>` (D-022). **Run ids and brief keys must survive
  it** — that was S-199's round-3 finding about a widened scrubber, and it is check 9's positive control.
- **`picture.path` is absolute** in the real database (`C:\Users\XZNON\Cutroom\.artifacts\…`). The page **serves no
  blob and prints no path**: a picture is its words, its verdicts and its cost, which is the shape the owner
  approved.

### What of the engine's words is rendered

Shown, folded behind a click, and **only through the loader's scrubber**: a picture's prompt and its Gate 1 refusal
reasons, a take's prompt and its gate verdicts, and Gate 7's questions with their answers. **Not rendered at all:** a
provider's raw response body, any URL, any file path, any environment value. D-022 is why the scrubber is mandatory
rather than advisory — the failure it exists for is a presigned URL carrying a live credential in its query string,
and a prompt or a reconciler's answer is exactly where one can sit.

### How it is checked without a browser

**No test drives a browser.** The server is a package export, so a check starts it **on port 0**, makes real HTTP
requests to the port the kernel gives it, and asserts the served HTML's structure and the payloads' values. Headless
Chrome stays what S-166 made it — a machine dependency behind a port in `packages/providers`, for engine features that
draw frames — and has no part here. **A check that silently skips when a browser is absent is refused outright**
(S-111), and this arrangement has nothing to skip: no browser, no fixed port, no process started.

### What is written to disk

**Nothing.** No cache, no export, no generated page, no temporary file. The vendored build is committed source, not
an artifact. Check 13 proves it by comparing the whole tree before and after every route is exercised.

## Gate 3 — Program design

**Eighteen checks. Every one names what it would let through if it were written the lazy way**, because there is no
adversarial round on these gates (S-203) and a check that cannot fail is the defect the three refused rounds of
`yield-compare` found again and again.

1. **One open, and it is the loader's.** `packages/benchmark-read`'s source holds **exactly one** `new
DatabaseSync(`, and it carries `{ readOnly: true }`; `scripts/benchmark.mjs` holds **none**. _Lets through if
   written lazily:_ a count of "at least one", which a second open satisfies.
2. **The path's precedence, and that reading cannot write.** The precedence is asserted over `scripts/_lib.mjs`'
   resolver, driven through both scripts as children, against three temporary databases holding **different numbers
   of runs**, so a wrong precedence gives a different count rather than the same one: `--db` wins over
   `CUTROOM_DB_PATH`, which wins over `DEFAULT_DB_PATH`. A write through the loader's handle throws. The database
   file's bytes are identical after a full load. _Lets through if written lazily:_ three databases with the same
   contents, where every precedence passes.
3. **Finished runs only.** A crafted database with one `finished` run and one `running` run: `/data` holds exactly
   the finished one, and the running run's id appears **nowhere** in the response body. Then the crafted run's state
   is flipped to `finished` and the count becomes two. _Why it needs a crafted database:_ all 52 runs in the real
   record are `finished` and none is `running`, so the real data cannot exercise this at all.
4. **The held column set, pinned clause by clause — new coverage this feature builds.** For `run` and for each of
   `TABLES`' twenty tables in the order `scripts/benchmark.mjs:68-89` lists them, the loader's held set equals the
   pinned list. A column named in the pinned list with no column behind it in `packages/domain/src/schema.ts` fails;
   a column dropped from the loader fails. **S-200 and S-201 both say this scan already exists and it does not** —
   `tests/yield-benchmark-reader.test.ts` pins no column set, no `TABLES`, no join key and no scrubber (S-203).
5. **Row selection.** The join key is `correlation_id` for `job` and `run_id` for the other nineteen; the order is
   `seq` for `run_event` and `rowid` otherwise; with no run named, run ids come back `ORDER BY created_at, run_id`.
   _The discriminating case:_ two runs **sharing one `created_at`**, whose order is then decided by run id — which
   is the case `tests/yield-benchmark-reader.test.ts:548-552` already depends on and no check states.
6. **No verdict word anywhere.** The served HTML and both payloads hold none of `better`, `worse`, `improved`,
   `improvement`, `regressed`, `regression`, `won`, `lost`, `winner`, `significant`, `confidence`, `p-value`,
   `uplift`. **Positive control in the same check:** the same scan run over the string `scores improved` must report
   it, so a scan that stopped matching fails instead of reading as coverage.
7. **Group size, and the small-group treatment.** Every group in the payload carries its `decided` count; a group
   whose `decided` is **below ten** carries `confident: false` and is drawn outlined, and one at ten or above carries
   `confident: true`. _The discriminating case is the boundary:_ nine is false, ten is true. _Why ten:_ today's world
   groups are 33 decisions and 5 (`game-graphics` 82% of 33, `tsunamis` 0% of 5), and that 5 is exactly the bar that
   must not read as confident. **No band is computed anywhere** — the arithmetic for one went with the stopped
   feature (S-200), and a count beside a figure is the honest substitute.
8. **The grouping keys off `shot_unit`, never a parsed id.** A crafted picture whose `picture_id` ends in no digit
   still lands in the group its `shot_unit` names; a picture whose `shot_unit` is beyond the selected plan's shot
   count joins **no** group rather than the last one; and a run whose plan was never selected contributes to no group
   at all, because `subjectsPerShot()` is `[]` there. _Lets through if written lazily:_ a fixture whose ids all end
   in the right digit, under which a regex and the column agree.
9. **The scrubber on the way out.** A crafted prompt holding
   `https://oss.example.com/x?OSSAccessKeyId=AK&Signature=s` serves as `<url>`; a crafted absolute artifact path
   serves relative. **Positive control:** a 36-character run id and a 64-character brief key in the same string
   survive **unchanged** — S-199's round-3 finding was a widened scrubber eating exactly those.
10. **The vendored build is the pinned one, and it is out of reach of the name scans.** `GET /echarts.min.js` returns
    the committed file's exact bytes; its SHA-256 equals the hash pinned in the check; no file under `packages/` or
    `apps/` imports or names it; the file itself is under neither of those folders, so
    `tests/reel-plan-shapes.test.ts:116-130` cannot read its `source:` keys; and serving it writes nothing, the
    tree being compared before and after as check 13 compares it.
11. **No registry dependency, no network.** `packages/benchmark-read/package.json` declares **every** dependency as
    `@cutroom/…` at `workspace:*` and not one from a registry — the house form
    (`packages/benchmark/package.json` declares `@cutroom/contracts` and `@cutroom/reel-contract` that way), and
    `@cutroom/benchmark` is what this package declares, for `FIELD_COLUMNS`. Its
    source names no `fetch(`, no `http.request`, no `https.request`, no `node-fetch`; and the served HTML holds **no
    absolute `http://` or `https://` URL at all**. _This one has a real failure behind it:_ the mockup's first draft
    loaded ECharts from cdnjs, which 404s at 5.5.1.
12. **It starts nothing.** Over every source file of `packages/benchmark-read`, the collected list of `spawnSync`,
    `spawn(`, `execSync`, `execFileSync`, `fork(`, `run('` and `child_process` under either spelling deep-equals
    `[]`. _Stated as a deep-equal against the empty list_, so the assertion is exhaustive rather than a count that a
    new starter could satisfy.
13. **It writes nothing.** The server is started against a copy of a database in a temporary directory, every route
    is exercised once, and the directory's file list and every file's bytes are identical before and after — the
    database file included.
14. **No absolute path reaches the page.** A crafted run whose `picture.path`, `render` output and hold rows are all
    absolute: no response body matches an absolute-path shape, in either payload or the HTML. _This is the
    payload-level check;_ `tests/no-absolute-paths.test.ts` scans source and would not see a path that arrived from a
    row.
15. **Every chart can be read as numbers.** The served HTML holds, for **each chart the page draws** — where reels
    die, scores over time, the four group-by cards, cost and wall clock, and the run view's own seconds-and-cents
    bar, **eight in all** — a table whose row count equals the number of points the payload gives that chart. _The
    discriminating case:_ a chart of three groups beside a table of two rows fails. _Named rather than counted,_
    because "the six charts" was wrong by two when this check was first written.
16. **The fleet payload carries no model text, and the run route carries all of it.** `GET /data` holds no `prompt`,
    `words`, `reasons` or `answer` key at any depth; `GET /run/<id>` holds all four. **Both halves in one check**, so
    a payload builder that silently dropped the words fails on the second half instead of passing on the first.
17. **A bad request answers, and nothing escapes the served set.** An unknown run id answers 404. `GET
/../../data/cutroom.sqlite`, `GET /%2e%2e/%2e%2e/data/cutroom.sqlite` and `GET /vendor/../../DECISIONS.md` each
    answer 404, and the response holds no byte of the named file.
18. **The launcher holds no logic.** `scripts/benchmark-serve.mjs` is at most forty lines; it imports
    `@cutroom/benchmark-read` and `node:process` and nothing else; it names no table, no column and no route path;
    and it names `real-reel` nowhere (`tests/paid-path-real-reel.test.ts:132-135` reads every `scripts/*.mjs` for
    that string).

### What this feature changes in verified features

**Measured by a `test-impact` read of the test tree, not assumed** — and it corrects two sentences this repository
already believed (S-203).

| site                                                                                                                                                                                                           | what happens                                                                                                                                                                                                                       | the amendment                                                                                                                                                                                         | slice |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| `tests/yield-benchmark-reader.test.ts:235-240`                                                                                                                                                                 | **RED.** It counts exactly one `new DatabaseSync(` in `scripts/benchmark.mjs` and matches `{ readOnly: true }`; after the move the count is zero                                                                                   | the count and the read-only match move to the loader's source; the script's expectation becomes **zero** opens                                                                                        | 1     |
| `tests/yield-benchmark-reader.test.ts:241-255`                                                                                                                                                                 | **WRONGLY GREEN.** Eleven source scans — the domain's opener, `@cutroom/providers`, `@cutroom/domain`, five process starters, four environment names and the `.env` regex — would read a wrapper while the real open sat elsewhere | every one of the eleven runs over **both** sources, the script and the new package                                                                                                                    | 1     |
| `tests/yield-benchmark-reader.test.ts:249-251`                                                                                                                                                                 | **GREEN, for the right reason**, as long as `run('git', ['rev-parse', '--short', 'HEAD'])` stays in the script. Its `processes` deep-equal is `['git']`                                                                            | stated, not changed; the new package's own list is `[]` by check 12                                                                                                                                   | 1     |
| `tests/yield-benchmark-reader.test.ts:424-427`                                                                                                                                                                 | **RED** once the `--db` → `CUTROOM_DB_PATH` → default order moves: the script stops naming `DEFAULT_DB_PATH`                                                                                                                       | the assertion moves to **`scripts/_lib.mjs`**, which is where the precedence goes, since the package may not import `@cutroom/service` at all; the script's own becomes that it passes `--db` through | 1     |
| the rule count `25`, in `tests/paid-path-keys.test.ts:124` and `:146-147`, `tests/yield-benchmark-boundary.test.ts:172`, `tests/boundaries.test.ts:47` and `:59`, and the two rule files those compare against | **RED** when the two new rules land                                                                                                                                                                                                | every site becomes **27**; Slice 1 greps the test tree for the literal `25 rules` first, so no site is missed                                                                                         | 1     |
| `biome.json`, `.prettierignore`                                                                                                                                                                                | the vendored build is a tracked `*.js`, so `biome check .` lints and formats it and Prettier would rewrite it                                                                                                                      | `vendor/` is ignored by both, named there as a third-party build — **an exclusion of someone else's minified file from our formatter, not a loosened rule about our code** (S-204)                    | 1     |
| `tests/workspace.test.ts:53`, `:61`, `:68`, `:76-92`                                                                                                                                                           | a new package must carry its own `package.json` and `tsconfig.json`, be named `@cutroom/…`, export exactly `{ ".": "./src/index.ts" }`, and be referenced by `{ "path": "./packages/benchmark-read" }` in the root `tsconfig.json` | all five done with the package's first file                                                                                                                                                           | 1     |
| `scripts/_pools.mjs:21`, and CLAUDE.md's "twelve PATH-only journey children"                                                                                                                                   | a new `tests/benchmark-view-secrets.test.ts` runs the feature's other test files with PATH alone and lands in the second pool only if its name ends `-secrets.test.ts`                                                             | the pool becomes **thirteen** children and CLAUDE.md's sentence is amended with it; the added suite cost is named in the journal                                                                      | 4     |
| `.verification/impact.json`                                                                                                                                                                                    | the map records no cover for a file that does not exist yet, so `--changed` would send the first commit to the full suite anyway                                                                                                   | `node scripts/impact-map.mjs` is re-run after Slice 4, before the journey                                                                                                                             | 4     |

**Nothing is weakened anywhere in that table.** Four assertions move to the source that now holds the property, eleven
grow to cover a second source, seven counts go up with the rules they count, and one formatter stops reformatting a
third-party file. No bound moves, no case is dropped, and no assertion becomes conditional.

## Gate 4 — Slices

Each check sits in **exactly one** slice, and each slice's verification route is named. **No slice needs anything a
later slice adds** — that was round 3's finding against `yield-compare`. It is why `GET /` serves a minimal
document in Slice 2 and the real page in Slice 3, and why **`GET /echarts.min.js` is Slice 4's, not Slice 2's**: the
file it serves arrives in Slice 4, so a route for it in Slice 2 would be a route with nothing behind it and a check
that could only pass by pretending.

- [x] **Slice 1 — one copy of the schema.** `packages/benchmark-read` with the read-only open, the held column set,
      the row selection and the scrubber; the path precedence into `scripts/_lib.mjs`, where both scripts reach it;
      `scripts/benchmark.mjs` calling it; the two boundary rules with their
      `drift --prove` cases; the seven rule-count sites; the reader test's four amendments; `vendor/` ignored by
      Biome and Prettier; the workspace wiring. **Checks 1, 2, 4, 5.** **Verification: the full suite** — it touches
      `scripts/`, the root `tsconfig.json`, `.dependency-cruiser.cjs`, `biome.json` and `.prettierignore`, and every
      one of those is in `check.mjs`'s `FULL_ONLY`.
- [x] **Slice 2 — the server and its routes.** `GET /` (a minimal document), `/data` and `/run/<id>`; listening on
      port 0; the two payload builders; the 404s and the traversal refusals; no writes. **Checks 3, 11, 12, 13, 16, 17.** **Verification: a targeted run** over
      `tests/benchmark-view-server.test.ts` alone — package-only, no `scripts/` path in the diff.
- [x] **Slice 3 — the page.** The four views, the eight charts, the four group-by cards, the comparison board, the run
      view with the words folded, the numbers table in every chart panel, the true-black theme and the validated
      palette. **Checks 6, 7, 8, 9, 14, 15.** **Verification: a targeted run** over
      `tests/benchmark-view-page.test.ts` alone.
- [ ] **Slice 4 — the vendored build, its route, the launcher and the PATH-only child.**
      `vendor/echarts/echarts.min.js` with its pinned hash and `GET /echarts.min.js`; `scripts/benchmark-serve.mjs`;
      `tests/benchmark-view-secrets.test.ts`; `impact-map.mjs` re-run. **Checks 10, 18.** **Verification: the full suite** (a `scripts/` path and a new PATH-only child),
      then `node scripts/journey.mjs benchmark-view`.

**The two targeted routes in full**, written here rather than inside the list above, where a wrapped code span makes
Prettier oscillate between two formattings: `node scripts/check.mjs --slice tests/benchmark-view-server.test.ts` for
Slice 2, and `node scripts/check.mjs --slice tests/benchmark-view-page.test.ts` for Slice 3.

**The owner's own acceptance, after Slice 4:** start it, open it, and read the page. The mockup at
`.artifacts/view-mockup/cutroom-benchmark.html` is what the page is compared against, and a difference from it is a
finding for this file's amendment block, not a silent change.

## Amendments

**Findings against these gates go here, as a numbered list, when they are reported** (S-197, S-203): each one names
the exact gate sentence it contradicts and the `file:line` that proves it. The gates themselves are not edited. A
slice that cannot make its check pass as written stops and reports (S-016) rather than adjusting the check.

> **Reported by Slice 1 on 2026-10-17, against the gates below, which are not edited** (S-197). Eleven findings,
> each naming the sentence it contradicts and the line that proves it. Two of them changed what Slice 1 had to
> build, and one — finding 11 — added a guard the gates do not list, by the main session's call.

1. **Gate 3's table, the `25`-count row, names two sites that do not hold the count.** The row reads "the rule count
   `25`, in `tests/paid-path-keys.test.ts:124` and `:146-147`, `tests/yield-benchmark-boundary.test.ts:172`,
   **`tests/boundaries.test.ts:47` and `:59`**, and the two rule files those compare against". Neither of those two
   lines carries a number: `tests/boundaries.test.ts:47` is `assert.match(out, /rules proven to fire/, out)` and
   `:59` is `assert.doesNotMatch(out, /DEAD/, out)`. Slice 1 edited neither, and both stay green at twenty-seven.
2. **The same row omits seven live sites that do carry the count**, every one of which Slice 1 had to change:
   `tests/paid-path-keys.test.ts:115` and `:132` (two test titles reading "twenty-five"), `:138-145` (the comment
   explaining the raised guard) and `:147` (the dead guard itself); `tests/yield-benchmark-boundary.test.ts:14`
   (the comment quoting check 11) and `:163` (its test title); `tests/yield-benchmark-secrets.test.ts:43` (the
   comment bounding the child); and **`CLAUDE.md:57` and `:70`**. The row's own instruction — "Slice 1 greps the
   test tree for the literal `25 rules` first, so no site is missed" — is what found them.
3. **An eighth site is named by no gate sentence and no earlier record: `AGENTS.md:78`**, "They are
   **twenty-five** rules checked against the real dependency graph". It is live rather than historical —
   `yield-benchmark`'s own Slice 1 set it, in the commit `d535a58` titled "the count taken to 25 in one change" —
   and it is now twenty-seven.
4. **Gate 2's "No third rule, and that is checked rather than assumed" missed two rules the new package already
   inherits, and one of them made the package unbuildable.** The paragraph reasons only about
   `processes-only-in-providers` and `keys-only-in-providers`. But `benchmark-no-io`'s `from` was
   `'^packages/benchmark'` with **no trailing slash** (`.dependency-cruiser.cjs:98` before this slice), so it
   matched `packages/benchmark-read/` too — and it forbids `node:sqlite`, which is the one thing the loader exists
   to do (`packages/benchmark-read/src/loader.ts:7`). `benchmark-no-engine` (`:78`) matched it for the same reason.
   This is the class of fault S-205's read found once in Gate 2 and fixed; it survived a second time. **Slice 1
   anchored `benchmark-no-io`'s `from` to `'^packages/benchmark/'`** — the form `benchmark-npm-only-zod` already
   used at `:341` — so every path the rule was written over still matches it and nothing about
   `packages/benchmark` is weakened, while the loader's own limits are the new `benchmark-read-no-engine`.
   `benchmark-no-engine` was deliberately **left unanchored**: its extra reach over the new package forbids only
   what `benchmark-read-no-engine` forbids anyway, so narrowing it would subtract coverage for tidiness.
5. **Gate 3's check 2 needs a file Gate 4 adds in Slice 4** — the exact fault Gate 4 claims to have avoided ("**No
   slice needs anything a later slice adds** — that was round 3's finding against `yield-compare`"). Check 2 says
   the precedence is "driven through **both scripts** as children" and Gate 4 assigns check 2 to Slice 1, while
   `scripts/benchmark-serve.mjs` arrives in Slice 4. Slice 1 drove it through the one script that exists
   (`tests/benchmark-view-loader.test.ts`, check 2's three children) and asserted **all three levels** directly
   over `scripts/_lib.mjs`' resolver, which is stronger than either child; **Slice 4 owes the second child**.
6. **Gate 3's check 2 says "A write through the loader's handle throws", and Gate 2's table gives the package no
   handle to expose.** Building the clause as written needed one: `StoredRecord.handle`
   (`packages/benchmark-read/src/loader.ts:66-74`), the read-only `DatabaseSync` itself, whose only caller is that
   check. It widens the package's exported surface past what Gate 2 lists, and is named here rather than left for
   a later reader to find.
7. **Gate 3's `biome.json` row asks for a comment that biome refuses.** The row says `vendor/` is "ignored by both,
   **named there as a third-party build**". `biome.json` is strict JSON, and biome rejects a comment in its own
   configuration — measured: `biome check biome.json` answers "Expected an array, an object, or a literal but
   instead found '// …'". So `biome.json:19` carries the bare `"!vendor"` and the naming lives in
   `.prettierignore:6-10`, which does take a comment, and in this block.
8. **Gate 3's check 4 cites a line range this slice removes.** It reads "each of `TABLES`' twenty tables in the
   order `scripts/benchmark.mjs:68-89` lists them". That list moved into the loader with the open, which is Slice
   1's own work: it is now `packages/benchmark-read/src/loader.ts:13-33`, and
   `tests/benchmark-view-loader.test.ts` pins the order against both.
9. **The scrubber moves in Slice 1 and nothing checks it until Slice 3, which Gate 4 does not say.** Gate 2 puts
   "the artifact-prefix and URL scrubber" in the package, Gate 4 puts it in Slice 1, and Gate 3 puts its only
   check — check 9, "The scrubber on the way out" — in **Slice 3**. **Measured, not assumed**: Slice 1's
   deliberate break of `artifactScrubber` (`packages/benchmark-read/src/scrub.ts:44-51`, made to return its text
   unchanged) left **every** test of this slice's set green, `tests/yield-benchmark-reader.test.ts` included. The
   property was unchecked before the move too — the reader's `redact` had no check either — so nothing was lost,
   but a D-022 redaction now sits in a package with no check behind it for two slices, and the first thing that
   would catch a broken one is Slice 3. **Answered by finding 11**: Slice 1 reported this rather than deciding
   it, and the main session's call was to build the guard in Slice 1.
10. **Gate 3's `tests/workspace.test.ts` row says "all five done with the package's first file" and two more were
    needed.** A test that imports the new package and the service also needs
    `{ "path": "./packages/benchmark-read" }` and `{ "path": "./apps/service" }` in
    **`tsconfig.tooling.json`** — without them `tsc -b` fails with TS6307 on `apps/service/src/env-file.ts` — and
    a test that imports `scripts/_lib.mjs` needs a declaration beside it, so `scripts/_lib.d.mts` was written on
    the pattern `scripts/_answers.d.mts` set. Neither file appears in Gate 4's Slice 1 scope list.
11. **A guard the gates do not list was added in Slice 1, by the main session's call on finding 9, and check 9 is
    still owed by Slice 3.** Gate 4 moves the scrubber into the package in Slice 1 and Gate 3 puts its only check
    in Slice 3, so between the two commits `packages/benchmark-read`'s `artifactScrubber` is **the only redaction
    this repository performs** — `scripts/benchmark.mjs:199` builds `redact` out of it and `:809` passes every
    string of the written record through it — with nothing able to fail on it. Slice 1 therefore adds one test
    over the **function**, in `tests/benchmark-view-loader.test.ts`: an artifact root stripped under both the
    plain and the **escaped** spelling (`render.invocations` carries the escaped one, S-075), a presigned URL
    reduced to `<url>` with its query string (D-022), and **the positive control** — a 36-character run id and a
    64-character brief key in one string, unchanged (S-199's round-3 finding). Four deliberate breaks of
    `packages/benchmark-read/src/scrub.ts` each turn it red, including the widening that eats the two identifiers.
    **It is not check 9 and does not discharge it**: check 9 is the scrubber on the way out of the served payload
    and the served HTML, neither of which exists yet, and the test's own title and the file's header say so.

> **Reported by Slice 2 on 2026-10-17**, eight more against the same unedited gates (S-197). Three of them are two
> sentences of one gate contradicting each other; two changed what Slice 2 built, by the main session's call in
> **S-208**; and one is a deliberate break that stayed green, which is the signal these checks exist to give.

12. **Check 13 cannot be read over the server's whole lifetime: a read-only connection to a WAL record creates two
    files.** Check 13 reads "the directory's file list and every file's bytes are identical before and after — the
    database file included". The record is WAL (`packages/domain/src/db.ts:18`), and SQLite materialises a reader's
    shared-memory index on its first read: `cutroom.sqlite-shm` at **32768 bytes** and an **empty**
    `cutroom.sqlite-wal` appear while `openRecord` reads `sqlite_master`
    (`packages/benchmark-read/src/loader.ts:102`, `:105`) under `{ readOnly: true }`, and both survive the close;
    the database file's own bytes never change. **Reproduced by the main session before the finding was accepted.**
    There is no way to decline them — Node 22.14's `node:sqlite` takes no URI filename, so `file:…?immutable=1`
    answers "unable to open database file", and an immutable open would make check 3's flipped run invisible. Slice 1
    passes an equivalent comparison only because its snapshot is taken **after** `openRecord`
    (`tests/benchmark-view-loader.test.ts:461-462`, then `:478`). Settled by **S-208**: Slice 2 compares the window
    check 13's own sentence names — started, then every route once — **and adds** a lifetime comparison against the
    pristine copy that tolerates exactly those two entries by name, asserts the `-wal` empty and the record's bytes
    unchanged. Nothing subtracted.
13. **Gate 2's measured fleet size is wrong by more than twice.** The route table says "**39 KB for all 52 runs**"
    and "3 KB typical, **40 KB** the largest". Measured with Slice 2's builder against `data/cutroom.sqlite`: the
    payload carrying the fields that same table lists is **102.0 KB** for 52 runs and 127 decided pictures, and
    **86.1 KB** after finding 14's resolution took `ending.detail` out; one run is **12.2 KB median and 42.2 KB
    largest**. The largest fields are `rating` 20.7 KB, `pictures` 12.7 KB, `stages` 8.9 KB, `plan` 6.8 KB. No
    check constrains either size and the two-route argument is untouched — the whole record is 2665 KB — but the
    figure in S-204 is named here rather than left standing.
14. **Gate 2 asks the fleet payload for the ending and, in the same gate, forbids the page a provider's raw response
    body — and `ending.detail` is one.** "**Not rendered at all:** a provider's raw response body, any URL, any file
    path, any environment value" stands against the route table's "every finished run's identity, **ending**, part
    scores…". Measured: `ending.detail` for the planner deaths is MiniMax's 401/402 body verbatim, `request_id`
    included (the scorecard field is `packages/benchmark/src/measures.ts:1073`, read from `run.result`), and the
    URL-and-root scrubber does not touch it. Settled by **S-208**: `GET /data` carries the ending's outcome and the
    stage it died at, never `detail` and never a raw body; `GET /run/<id>` keeps all of it. `failure` was kept,
    measured first — it is a `FailureKind` enum word (`packages/domain/src/runs.ts:411`), not a body, and it is
    empty in all 52 runs. Pinned by an assertion that `/data` holds no `detail` key at any depth and none of three
    pieces of a real 402 body, while `/run/<id>` holds all three.
15. **Check 6's verdict-word list contains `lost`, and `lost` is a scorecard key three times over.** Check 6: "The
    served HTML and both payloads hold none of `better`, `worse`, … `won`, `lost`, `winner` …". Measured on the
    real record, a word-boundary scan for `lost` matches **both** payloads: `run.costCents.lost`
    (`packages/benchmark/src/measures.ts:1088`) and `run.lostCalls` (`:1118`) are scorecard keys, and
    `parts.pictures.callsLost` (`:1194`) escapes a word-boundary scan but not a plain substring one. The check
    cannot pass as written without renaming fields `yield-benchmark` already ships. Settled by **S-208**: every word
    in the list stays, the scan runs over the served HTML's rendered text and the payloads' **string values** rather
    than their key names, and a second assertion pins that the only `lost` in either payload is those three keys, so
    a fourth occurrence fails. **Check 6 is Slice 3's** and is not discharged here.
16. **Check 16's fourth key, `answer`, exists in no scorecard field.** Check 16 requires `GET /run/<id>` to hold
    `prompt`, `words`, `reasons` and `answer`. The scorecard reduces Gate 7 to
    `{ outcome, coverage, asked, yes, answeredNo }` (`packages/benchmark/src/measures.ts:1255-1263`) and names no
    `answer` anywhere. The run payload therefore carries `gate7Answers: [{ question, answer }]` read from the
    render's own blob (`packages/benchmark-read/src/payload.ts:251-254`), which is what Gate 2's "Gate 7's questions
    with their answers" asks to be rendered. Slice 2's deliberate break 9 — emptying `gate7Answers` — turns check 16
    red, which proves the key exists nowhere else in the scorecard.
17. **Check 7 puts the groups "in the payload" while Gate 4 puts the payload builders in Slice 2 and check 7 in Slice 3.** Check 7: "Every group **in the payload** carries its `decided` count". No group is built in Slice 2 — a
    payload field with no check behind it for a whole slice is the shape findings 11 and 18 are about. What Slice 3 is
    handed instead is the raw material the route table names, plus `subjectsInShot` per picture row, indexed off the
    integer `picture.shot_unit` into `subjectsPerShot(rows)` and `null` beyond the selected plan's shots or when no
    plan was selected (`packages/benchmark-read/src/payload.ts:145`) — so the grouping needs no regex over an id.
18. **The scrubber on the way out of a served payload was unchecked, and that is measured rather than assumed.**
    Gate 2: "the scrubber moves into the loader and **every string the page serves passes through it**." Slice 2's
    deliberate break 12 — `scrubbed()` returning each string unchanged
    (`packages/benchmark-read/src/payload.ts:41`) — left **every one of Slice 2's seven tests green**, exactly as
    Slice 1's break 11 did. Settled by **S-208** on S-207's precedent: a guard over both served payloads is built in
    the slice that built the redaction, with the run id and brief key surviving as the positive control. Break 12 is
    now red at `tests/benchmark-view-server.test.ts:628`, and a **widened** scrubber is red at `:638` — caught by
    the positive control alone. **Check 9 is still Slice 3's** and covers the served HTML, which Slice 2's minimal
    document carries no row of.
19. **Gate 2 gives the launcher `--port` while Gate 4's Slice 2 says "listening on port 0, always".** The table row
    reads "read `--db` and `--port`, call the package, print the URL". So `ViewOptions.port` exists and **defaults
    to 0** (`packages/benchmark-read/src/server.ts:59`), giving Slice 4's launcher something to pass without Slice 2
    needing a later slice's change; every check here starts with no port named and asserts the kernel named one
    (`tests/benchmark-view-server.test.ts:150`).

**Two choices Slice 2 made that the gates leave open, recorded in S-208**: the record is queried again on every
request with **no cache**, which is what check 3's wording reads against; and a **non-GET answers 404** through the
one refusal body, so nothing escapes the served set by a second door.

> **Reported by Slice 3 on 2026-10-17**, ten more against the same unedited gates (S-197). Two say a check cannot
> be green against the real record as its words stand; four are two sentences of one gate contradicting each other;
> three record where this slice went past what any gate names. Findings 20, 21 and 29 were resolved by the main
> session's call in **S-209**; finding 23 is left open and is the owner's.

20. **Check 6 cannot be green over `GET /run/<id>` on the REAL record, and no code of this feature can make it so:
    a model's own words carry a verdict word.** Check 6, as S-208 settles it, scans "the payloads' **string
    values**". Measured over all 52 runs of `data/cutroom.sqlite`: one hit,
    `run.parts.clips.items[].expandedPrompt` — a take's expanded prompt holding `significant`, written straight
    from the column (`packages/benchmark/src/measures.ts:1004`). The record quotes a model verbatim, so any of the
    thirteen words a model writes lands in the run payload and, folded behind a click, on the page. **Settled by
    S-209, option (a):** the value scan exempts six verbatim-model-text fields **by name** — `prompt`,
    `expandedPrompt`, `words`, `reasons`, `text`, `detail` — the exemption list is itself **pinned by a
    deep-equal** so a seventh field fails rather than quietly joining it, every other string value is still scanned
    with all thirteen words, and the scan now runs over **`data/cutroom.sqlite` itself**, all 52 runs, through both
    payload builders. Nothing is skipped when the record is absent (S-111): the clause fails and says why. The
    exemption is proved **load-bearing** in the same check — with nothing exempted the real record must still report
    `expandedPrompt = significant`, so the clauses above cannot be passing on an empty set. Scrubbing a model's
    words was refused: the record is the evidence.
21. **S-208 named three `lost` keys and missed a fourth occurrence, which is a string VALUE.** "a second assertion
    pins that the only `lost` in either payload is those three keys, so a fourth occurrence fails" —
    `run.estimateExcludes` carries `@cutroom/benchmark`'s `ESTIMATE_EXCLUDES` verbatim
    (`packages/benchmark/src/measures.ts:332-336`), whose last clause is "and **every lost call**, whose cents are
    paid and produce nothing", in all 52 runs. It is not a key and no renaming of a field reaches it. Slice 3 first
    stopped serving that constant; **the main session refused that** — dropping a field from the route Gate 2 calls
    "one run's **full scorecard**" so a scan passes is subtracting to reach green (CLAUDE.md rule 3). **Settled by
    S-209:** the field is restored, and the pinned allow-list is extended to the three keys **plus that one named
    constant**, so a **fifth** occurrence fails. `ESTIMATE_EXCLUDES` is our own explanatory prose, not model text,
    so it is deliberately **not** under finding 20's exemption. The explanation Slice 3 added in the page's own
    words under the run view's cost chart is kept.
22. **Gate 2 gives the page no script of its own, and "The look" needs one in four places.** The route table:
    "`GET /` | the page: one HTML document, its CSS inline, **no script of its own but the vendored file**". "The
    look" requires "a **drag handle** on every chart, with a `ResizeObserver` redrawing it" and "**four chart-size
    presets**", "The charts" requires "six **toggleable** lines", and "The four views" requires switching between
    four. None exists without the page's own code. Built as **one inline script in the same document**
    (`packages/benchmark-read/src/page.ts:713`), so the document still fetches exactly one asset besides itself —
    the vendored file — which is the only reading of that sentence that can be built.
23. **The page cannot USE the two routes Gate 2 designed for it, because check 11 scans this package's whole
    source — and this one is left OPEN for the owner.** Check 11: "Its source names no `fetch(`, no
    `http.request`, no `https.request`, no `node-fetch`" — and the page's script IS this package's source, so a
    page asking `/data` for its data turns a verified check red (measured: one such token in a comment of
    `draw.ts` turned check 11 red at `tests/benchmark-view-server.test.ts:276` during this slice). So the page
    **embeds both payloads** in the document (`packages/benchmark-read/src/page.ts:650-666`) and asks for nothing.
    Measured consequence against Gate 2's "Why not one payload on load": `GET /` is **263.5 KB** on the real record,
    where the route table budgeted a 39 KB landing load. **`/data` and `/run/<id>` are served, correct and
    checked — but nothing the page draws comes through them**, so Gate 2's two-route rationale is not realised. The
    main session kept the built design rather than edit a check Slice 2 had just committed, and 263.5 KB on
    localhost is not a defect — but **whether the page should fetch, and check 11 be made precise about server
    source versus client script, is the owner's call and is not settled here.**
24. **The three fonts "The look" names cannot be had, and the gates settle no substitute.** "Type: **Archivo** for
    display, **IBM Plex Sans** for body, **IBM Plex Mono** for every figure" — the mockup loaded all three from
    Google Fonts (`.artifacts/view-mockup/mockup-source.html:3`), which check 11 forbids ("the served HTML holds
    **no absolute `http://` or `https://` URL at all**"), and Gate 2 vendors ECharts and nothing else. Built as
    the smaller thing: a system stack with `tabular-nums` throughout (`packages/benchmark-read/src/style.ts:42-44`,
    and `font-variant-numeric: tabular-nums` on `body` and every figure cell). A vendored font would be a change
    to Slice 4's directory and to what Gate 2 vendors, so it is reported, not taken.
25. **The mockup draws cost and wall clock as two charts; check 15 counts them as one.**
    `.artifacts/view-mockup/mockup-source.html:566` and `:570` are two panels, "Cost" and "Wall clock". Check 15
    names "cost and wall clock" as one of "**eight in all**", and "The charts" says "**one** stacked bar per run,
    oldest first, split by port **and** by stage". Built as one panel, one chart, two y-axes — cents stacked by port
    and seconds stacked by stage — so the page draws exactly the eight the check names. **This is a visible
    difference from the approved mockup**, named here rather than changed silently, and it is one of the things the
    owner's own acceptance after Slice 4 should look at.
26. **Check 7's groups are in no payload Gate 2 lists, and this slice had to choose where they live.** Check 7:
    "Every group **in the payload** carries its `decided` count"; amendment 17 already records that Slice 2 builds
    none. They are built in `packages/benchmark-read/src/charts.ts:225-271` and travel in **the page's own embedded
    block** (`<script id="benchmark-data" type="application/json">`), which is what the chart script and check 7
    both read; `/data` and `/run/<id>` carry no group at all and are unchanged. If a later caller is meant to read
    the groups over the wire, that is a route neither Gate 2 nor Gate 3 gives them.
27. **Check 8's third clause reads two ways, and only one is buildable without losing information.** "a run whose
    plan was never selected contributes to **no group at all**, because `subjectsPerShot()` is `[]` there" — the
    reason clause is about the subjects grouping, but the words could be read over all four cards. Built narrowly:
    such a run's pictures join no **subjects** group and no **shots-in-the-plan** group (`plan.shots` is the string
    `absent` there), and they DO join the **world** and **picture-rule** cards, where a world and a rule still
    exist. `tests/benchmark-view-page.test.ts` pins both halves — 8 decided, 6 grouped by subjects, 8 by world — so
    the reading is visible rather than implied.
28. **The page keeps a vocabulary of its own for one scorecard key, which no gate sentence anticipates.** The cost
    port the scorecard spells `lost` is `paidNoAnswer` in the page's block and "paid, no answer" on screen
    (`packages/benchmark-read/src/charts.ts:294-300`). This is forced by check 6 as S-208 settles it: the block's
    `key` fields are string **values**, and a value of `lost` fails the scan even where the payload's own key is
    allowed — measured, the first build of this slice was red on exactly that at two paths. The payload keys are
    untouched and still pinned.
29. **`GET /?run=<id>` is a route shape no gate names.** Gate 2's route table lists `/`, `/echarts.min.js`,
    `/data` and `/run/<id>`. The run picker must change runs without the page fetching anything (finding 23), so
    `GET /` reads one query parameter (`packages/benchmark-read/src/server.ts:84-95`). **Settled by S-209 on
    S-207's precedent — a route shape nothing can fail on is the shape findings 9, 11, 18 and 23 are all about —
    so it is given a guard**, marked in its own title as **not one of Gate 3's eighteen**: a named run opens in the
    One run view; an unknown name opens the newest run and says so in one line on the page; and
    `GET /run/<that same unknown id>` still answers **404**, so check 17 stays green.

## Evidence

_Written by `node scripts/journey.mjs benchmark-view` after Slice 4. Never typed by hand (S-016)._

## Divergence

_Written by the journey. A FAIL is the finding: stop and report._
