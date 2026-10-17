# 090 — the journey's own write must not cost a second full suite

- **For:** session 96
- **Feature:** the checking machinery itself (`scripts/check.mjs`, `scripts/journey.mjs`), not a `docs/features/` slug
- **Work:** make the checker EMIT documents-only evidence, and stop the journey producing a post-commit delta
- **Written:** 2026-10-17, at the owner's call during session 95
- **Run:** —

> **Read `grep -n '^## S-212' DECISIONS.md` first.** It records the flaw, what session 95 did about it, and what is
> still owed — which is this prompt.

## The flaw, in one paragraph

`node scripts/journey.mjs <slug>` can only run **after** the last slice is committed. It then writes `Status:`, the
Evidence line and the Divergence line **into the feature file**. So every finished feature ends with a Markdown
delta that arrives after the full run that covered the commit — and because `scripts/verification-status.mjs`
accepts only `full|targeted`, recording that delta has cost a **second full suite**. Session 94 paid 654 s. Session
95 was about to pay ~730 s more and the owner stopped it: _"that's a design flaw"_, _"run the journey once, commit
and stop"_.

The checks a Markdown edit actually owes cost **17 s** — markup 12.4 s, the four scans 4.0 s, the authority 0.3 s.
The rest was ceremony.

## Part 1 — the checker emits what session 95 had to write by hand

S-212 settled that a documents-only delta is recorded as **`Verification: targeted`** naming the four scan test
files, because those four **are** the tests a Markdown change can fail:

```text
tests/line-endings.test.ts  tests/no-absolute-paths.test.ts
tests/feature-files.test.ts tests/context-file.test.ts
```

They are `SCANS` in `scripts/check.mjs`; `--documents` and a documents-only `--changed` already run them. **No new
trailer word is invented and `verification-status.mjs` is not touched.**

What is owed is that the **checker writes it**, so no trailer is ever typed:

- `scripts/check.mjs:347-352` — when the run is documents-only and green, record `mode: 'targeted'` with the four
  scan files as its tests, rather than `mode: 'documents'` which nothing reads. Note `:355` looks for a step
  labelled `tests` or `slice tests`; the documents path's step is labelled **`scans`**, which is why `tests` comes
  back undefined today and why `targeted` would currently fail `verification-status.mjs`'s "must name
  Verification-Tests".
- `scripts/_verification.mjs` and `scripts/_verification.d.mts` — the mode's type. **`:158` must keep writing
  `receipt-full.json` only for a real `full` run, and `:191`'s `receipt.mode !== 'full'` gate must keep refusing
  reuse** — check both still hold.
- `scripts/journey.mjs` — it reads the `documents` mode today.
- The assertions that pin the current behaviour: **`tests/check-receipt.test.ts` (9 mentions)**,
  **`tests/check-changed.test.ts` (9)**, `tests/journey.test.ts`. Changing an expectation to match intended new
  behaviour is not weakening — but **add the new case rather than only editing the old one**, and keep every
  existing bound.

**Verification: the full suite.** Every file above is verification infrastructure. **One run, once** — against one
run per feature for ever.

## Part 2 — the deeper fix, which is the owner's actual ask

Part 1 makes the post-commit delta cheap. **Part 2 removes it.** _"Run the journey once, commit and stop."_

Two shapes, and the gates for this have to settle which:

1. **The journey writes before the commit.** It needs the last slice's work in the tree, not necessarily in a
   commit — so it could run against the staged tree, write its verdict, and let that verdict be part of the commit
   it describes. The hard part is the Evidence line naming the commit hash, which does not exist yet.
2. **The commit carries the verdict and the file is written from it.** The feature file's `Status:` becomes
   derived rather than stored, or the journey's output moves out of the feature file entirely.

Shape 1 is the smaller change and keeps the feature file self-describing. **Neither is chosen here** — that is this
session's first decision, and it needs a written entry with what was rejected (CLAUDE.md rule 2).

**Do not** solve it by having anyone type a status by hand: S-016 forbids exactly that, and rightly.

## What is already done, so you do not redo it

- **`benchmark-view` is finished and `Status: verified`** — four slices at `1c958a1`, `21e8705`, `6170ce3`,
  `cd22b7e`, journey PASS at `cd22b7e`, 41 findings in its Amendments block, S-206 to S-211.
- **S-212** records the flaw and how session 95 recorded its own documents-only commit.
- The three journey lines are **committed**; the tree is clean.

## Two things session 95 flagged that are still the owner's

- **Finding 23** in `docs/features/benchmark-view.md`: check 11 scans the package's whole source for `fetch(`, so
  the page cannot ask `/data` for its data. It embeds both payloads instead — `GET /` is **263.5 KB** where Gate 2
  budgeted 39 KB, and `/data` and `/run/<id>` are served, correct and checked while **nothing the page draws comes
  through them**. Gate 2's two-route rationale is unrealised.
- **S-211's regime gap**: `--slice` runs every boundary check but only its **named** test files, so a repo-wide
  scan living in another ordinary test file is invisible to a targeted slice — which is how
  `tests/ask-again-record.test.ts` went red on a package two targeted slices had already committed.
- **Memory floor**: session 95's full run dipped to **1544 MB** free in the secrets pool against the **2483 MB** of
  the four runs S-192's pool sizes rest on. No pool size changed; a thirteenth child joined. Watch it.

## The owner's acceptance of the page is still outstanding

`node scripts/benchmark-serve.mjs`, open it, read it against `.artifacts/view-mockup/cutroom-benchmark.html`. A
difference is a finding for the Amendments block (S-197), not a silent change.
