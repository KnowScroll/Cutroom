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

- [ ] **Slice 1 — one copy of the schema.** `packages/benchmark-read` with the read-only open, the held column set,
      the row selection and the scrubber; the path precedence into `scripts/_lib.mjs`, where both scripts reach it;
      `scripts/benchmark.mjs` calling it; the two boundary rules with their
      `drift --prove` cases; the seven rule-count sites; the reader test's four amendments; `vendor/` ignored by
      Biome and Prettier; the workspace wiring. **Checks 1, 2, 4, 5.** **Verification: the full suite** — it touches
      `scripts/`, the root `tsconfig.json`, `.dependency-cruiser.cjs`, `biome.json` and `.prettierignore`, and every
      one of those is in `check.mjs`'s `FULL_ONLY`.
- [ ] **Slice 2 — the server and its routes.** `GET /` (a minimal document), `/data` and `/run/<id>`; listening on
      port 0; the two payload builders; the 404s and the traversal refusals; no writes. **Checks 3, 11, 12, 13, 16, 17.** **Verification: a targeted run** over
      `tests/benchmark-view-server.test.ts` alone — package-only, no `scripts/` path in the diff.
- [ ] **Slice 3 — the page.** The four views, the eight charts, the four group-by cards, the comparison board, the run
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

_None yet._

## Evidence

_Written by `node scripts/journey.mjs benchmark-view` after Slice 4. Never typed by hand (S-016)._

## Divergence

_Written by the journey. A FAIL is the finding: stop and report._
