# 088 — `benchmark-view`'s four gates, the benchmark's last part

- **For:** session 94
- **Feature:** `benchmark-view` (`docs/features/benchmark-view.md`). **It is the only part of the benchmark left**
  (S-200): `yield-benchmark` is built and verified, and `yield-compare` is stopped
- **Work:** the four gates written, one adversarial round, every finding applied or refused in writing. **No
  implementation file until the `Gates:` line says APPROVED four times** (CLAUDE.md rule 1)
- **Written:** 2026-10-16
- **Run:** —

> **The owner stopped `yield-compare` on 2026-10-16, in session 93** — _"No just leave it, we should just build the
> view part of it and end the benchmark"_ — after three fresh adversarial rounds refused all four of its gates (22,
> 24 and 11 findings; 57 in all, 56 applied, 1 refused). **S-200 records it, with what stopping costs.** So this
> page reads the **scoring half's** `--out` record, which exists and holds 52 runs, and it draws no verdict, no
> delta and no comparison of two sides. After it, the benchmark is complete and the queue is `self-heal`.

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
2. **Where the page's data comes from**: inlined by the writer, or a sibling JSON file. Inlining opens from the
   filesystem with no server; a sibling does not, under a browser's file-origin rules.

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
would be that feature under another name with its gates unreviewed. Design against the `--out` record as imagined
rather than as the scoring half writes it. Weaken a check, a bound or a pinned value. Add a CDN, a server, a build
step, a network call or an npm dependency to the page. Commit anything the page generates.
