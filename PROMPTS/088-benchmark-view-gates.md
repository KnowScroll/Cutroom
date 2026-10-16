# 088 — `benchmark-view`'s four gates, the benchmark's last part

- **For:** session 94
- **Feature:** `benchmark-view` (`docs/features/benchmark-view.md`). **It is the only part of the benchmark left**
  (S-200): `yield-benchmark` is built and verified, and `yield-compare` is stopped
- **Work:** the four gates written, one adversarial round, every finding applied or refused in writing. **No
  implementation file until the `Gates:` line says APPROVED four times** (CLAUDE.md rule 1)
- **Written:** 2026-10-16, rewritten 2026-10-17 against the approved shape (S-201)
- **Run:** —

> **The owner stopped `yield-compare` on 2026-10-16, in session 93** — _"No just leave it, we should just build the
> view part of it and end the benchmark"_ — after three fresh adversarial rounds refused all four of its gates (22,
> 24 and 11 findings; 57 in all, 56 applied, 1 refused). **S-200 records it, with what stopping costs.** So this
> page draws no verdict, no delta and no comparison of two sides. **It reads `data/cutroom.sqlite` through a
> local server you start** — S-201, which amends S-200 on that one point. After it, the benchmark is complete and
> the queue is `self-heal`.

## THE SHAPE IS APPROVED — S-201. Write the gates TO it, do not re-decide it

Asked in session 93, answered, and then **approved on 2026-10-17 against a working mockup** — _"Alright now it
looks good"_ — so **none of this is open**. **S-201** records it, supersedes S-184’s self-contained no-server page
and amends S-200’s sentence about the `--out` record. The full specification is
`docs/features/benchmark-view.md`, section **"The shape the owner approved"** — read that before anything else.

The mockup is at `.artifacts/view-mockup/` (gitignored): `cutroom-benchmark.html` to open, `mockup-source.html`
for the markup, CSS and chart options, `extract.mjs` for how its data was pulled and `build.mjs` for how it was
assembled. **It is a mockup, not an implementation**: it reads a baked JSON, where the real page reads the
database through a server. If that directory is gone, the feature file’s section is authoritative.

| what               | the owner’s answer                                                                                                                    |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| how it runs        | **a local server you start**: `node scripts/benchmark-serve.mjs`, open localhost. Not a file you double-click                         |
| what feeds it      | **`data/cutroom.sqlite` directly**, read-only, scored on the fly by `packages/benchmark`. No export step                              |
| which runs         | **finished runs only**. A run in progress is out of scope                                                                             |
| who reaches it     | **localhost only for now**. No hosting, no auth                                                                                       |
| comparison         | **any number of runs as columns**, every number a row, differences highlighted. **Briefs and configs may differ and nothing refuses** |
| landing view       | the **fleet overview**: headline counts, the funnel, progress over time, ledger below                                                 |
| picking runs       | **checkboxes in a filterable ledger** (world, ending, brief, made-a-reel, search)                                                     |
| model’s words      | **shown, folded** behind a click                                                                                                      |
| charts             | **ECharts, vendored into the repo**, served by our own server. No CDN at runtime. Simple bars as SVG                                  |
| the progress graph | the **five part scores plus the overall rating**, six toggleable lines over time                                                      |
| layout             | **full bleed, no side margins**; charts **at most two across**, with size presets and per-chart drag resize                           |

**Two settled decisions this contradicts, and the `S-` entry that must be written before any gate is approved.**
S-184 settled the page as **one self-contained HTML file with its data inlined, no server, opened from the
filesystem**; S-200 said it reads the scoring half’s **`--out` record**. Both are superseded by “live”. The reason
is not preference and must be stated in the entry: **a page opened from the filesystem cannot load a JSON file
beside it** under browser file-origin rules, so “feed it data and it shows up” forces a server. Also record that
**the comparison board is NOT `yield-compare` revived** (S-200): no band, no verdict word, no comparability
refusal — raw numbers side by side, which is what the owner asked for before the stop.

## Read first

`docs/context.md`, then `docs/features/benchmark-view.md` whole — it is 62 lines and already holds "What it shows"
and "What the gates must settle", both amended by S-200. Then, by heading and only the entry's lines:
`grep -n '^## S-200' DECISIONS.md` (what this feature inherited from the stopped one), then `^## S-184` (the split
and the page's proven form), `^## S-182` (the three outputs and the hashing-in-the-reader rule), `^## S-166`
(headless Chrome as a machine dependency) and `^## S-111` (a check that silently skips when a browser is absent was
rejected outright). **`docs/features/yield-benchmark.md` is the contract this page draws**: read its Gate 2 for what
the scorecard and the `--out` record actually hold, because the page must be designed against the record as
**built**, not as planned — that is the mistake `yield-compare`'s gates had to correct three times.

Measure before you write: run `node scripts/benchmark.mjs --help` (or read its flags) and **look at a real `--out`
record**, so the gates name fields that exist. `docs/research/benchmark.md` is the 52-row ledger.

## What the gates must settle, beyond what the file already lists

The feature file names five open questions. **Two are new or changed by S-200 and are the ones with teeth:**

1. **Whether a stratum carries an uncertainty band at all, and what computes it.** The figures are the scoring
   half's; the band was `yield-compare`'s and is gone. Three answers, each with a cost, and the gates must pick one:
   a single-side band computed in the page's own writer; the figures with each stratum's member count and **no
   band**, said on the page so a bare rate is not read as precise; or raw counts alone. **The failure to avoid is a
   stratum of one or two runs drawn as a confident bar** — session 82's 42% / 70% / 100% persuaded because those
   groups were large, and the record does not guarantee that for every property.
2. **~~Where the page’s data comes from~~ — SETTLED by the owner**: a local server reads the database directly.
   What remains is how the page receives it (one payload on load, or a route per view) and what the server exposes.

And three the file already names, unchanged: **where the page is written** (one setting, gitignored default, D-086
and D-087, nothing generated committed, and a run's blobs carry absolute artifact paths unless made relative
first); **what of a model's words the page may show** (D-022's form — the scorecard prints them only when asked, and
a page is a different surface); and **how it is checked without a browser in the suite** (assert structure from the
emitted HTML's text, or drive headless Chrome — S-166 made it a machine dependency like ffmpeg, and a check that
skips when it is absent is what S-111 refused).

## What this session owes

**Four gates in `docs/features/benchmark-view.md`**, in this repository's form: Gate 1 product with no technical
language, Gate 2 architecture with a place-and-may-not table, Gate 3 program design with numbered checks, Gate 4
slices with each check in exactly one slice and each slice's verification route named (`--slice` with every
affected test file, or the full suite, per S-188 and S-196). **Every choice between real alternatives becomes a
written `S-` entry** with what was rejected and how a violation is caught (S-017).

**Then one adversarial round** with a fresh `gate-reviewer`, and **measure every figure the round would otherwise
spend itself deriving and hand them over** — that is what made session 92's and 93's rounds go to the design
instead of the arithmetic. Apply or refuse every finding in writing, in the table form the feature files use.

**Learn from the three rounds that just happened.** Their findings were almost all one kind: **a rule that can
never fire, or a check that can never fail.** Before writing any check, ask what implementation it would let
through. Concretely, from rounds 1 to 3 of `yield-compare`:

- a check whose pinned case gives the same answer under the rule you chose **and** the rule you rejected proves
  nothing — pin the case where they disagree;
- a positive control built at a size where the correct answer is unreachable is green and worthless;
- a widened scrubber whose call site is **total** damages everything it touches, and the check that would catch it
  may read a different file;
- an assertion that looks like a set may be an order-exact list, so adding a legal thing reddens it;
- a slice that needs something a later slice adds cannot run at all.

## Done is

Four gates written; one round answered in full, with the `Gates:` line reading APPROVED four times or the findings
recorded for the next round; `node scripts/check.mjs --changed` green (Markdown only, S-193); the `S-` entries for
the choices; the journal entry and this session's entry in `docs/context.md`; and `PROMPTS/089` — Slice 1 if
approved, the owner's question if not.

## Do not

Write any implementation file of `benchmark-view` before the `Gates:` line says APPROVED four times. Revive
`yield-compare` — it is stopped (S-200), its gates are kept only as a record, and a page that computed verdicts
would be that feature under another name with its gates unreviewed. Design against the record as imagined rather than as
`packages/benchmark` actually scores it — open a real one first. Weaken a check, a bound or a pinned value.
**Re-decide anything in "The shape the owner approved"** (S-201) — it cost four review rounds with the owner.
Re-colour the charts without re-running the palette validator. Add a **CDN, a network call at runtime, or a build
step** — the ECharts build is vendored and served by our own server, which is the one thing "no server" no longer
forbids. Commit anything the page generates, or the vendored data.
