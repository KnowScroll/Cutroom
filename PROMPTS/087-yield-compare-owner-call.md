# 087 — `yield-compare`: the owner's call after three refused rounds

- **For:** session 94
- **Feature:** `yield-compare` (`docs/features/yield-compare.md`), the benchmark's second part. The question is
  whether its gates are approved by decision or left unapproved while `benchmark-view` is worked on
- **Work:** the owner answers; then either Slice 1 of `yield-compare` or `benchmark-view`'s four gates. **No
  implementation file of `yield-compare` until the `Gates:` line says APPROVED four times**
- **Written:** 2026-10-16
- **Run:** session 93, 2026-10-16 — **answered the same session it was written.** The owner took neither of the two
  answers below as phrased: _"No just leave it, we should just build the view part of it and end the benchmark."_
  **`yield-compare` is STOPPED (S-200)**, not parked — `Status: stopped`, no implementation file ever — and
  `benchmark-view` becomes the benchmark's last part and the only one left. `PROMPTS/088` is its gates

> **Round 3 was the last round that runs unasked** (`PROMPTS/086`'s own instruction, and the cap this repository
> keeps). Three fresh adversarial reviewers have now refused all four gates — **22, 24 and 11 findings, 57 in all,
> 56 applied and 1 refused** — and each round's answers are recorded as a table in the feature file, with S-199 and
> its two amendments settling the choices. Nothing is approved, so no implementation file exists.

## What the owner is being asked

Two answers, and only two. **This is not a request for a round 4**: a fourth round would run only if the owner asks
for one, which is the third answer available and the one neither of the two below.

| the answer                               | what happens next                                                                                                                                |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **approve by decision**, in S-185's form | a new `S-` entry approves all four gates as the owner's call with no reviewer, the `Gates:` line reads APPROVED four times, and Slice 1 is built |
| **leave it written and unapproved**      | the feature file stays as it is, `benchmark-view`'s four gates are written next (S-184's split, S-198's order), and `yield-compare` waits        |

**S-185 is the precedent for the first**, and it is exact: `yield-benchmark`'s four gates were approved by the owner
after four adversarial rounds, with rule 1's adversarial approval waived **for that one feature only**. Approving
this one the same way needs its own entry and its own waiver; S-185 does not extend itself.

**What the slices did when S-185 was used last time, which is the real argument for the first answer.** With no
reviewer approval, the slices carried the review: session 87's four `slice-builder` calls reported **25 findings**
against approved gates rather than building around them — and **only two were ever written down**, because the
hand-backs lived in that session's context. S-197 is the repair (`.claude/agents/slice-builder.md` now requires a
numbered list naming the sentence each finding contradicts), so the same route is safer than it was. It is still a
route where the gates are approved by assertion rather than by a reviewer.

## What three rounds have actually done, so the decision is made on the record

**Each round was cheaper and narrower than the last, and each still found a rule that could not fire or could not
fail.** That is the whole of the evidence, and it points both ways honestly.

- **Round 1 (22 findings, none refused)** — the null comparison **could not fail** (one brief key is one group), and
  the share band treated items inside a run as independent trials. The unit of evidence became the run.
- **Round 2 (24 findings, 23 applied, 1 refused)** — the credit guard **could never fire** on the two quantities
  round 1 had added to it, the positive control **could not read _helped_**, and the zero-band rule was undone one
  level up.
- **Round 3 (11 findings, all applied)** — a widened `redact()` would have **rewritten the verified scoring half's
  own run ids and brief keys** into a placeholder with no check noticing; the exhaustive `processes` deep-equal
  **forbids the new reader the one process the gates had permitted it**; Slice 2 proved a check from a field Slice 3
  added; the guard's cross-group vote was imported with two clauses undecided; and check 3 could not tell the
  chosen vote rule from the one the gates reject by name.

**What no round has faulted**, across all three and recorded at the end of each review section so nothing is redone:
the eleven pinned band values (recomputed by the main session and re-derived independently by two reviewers, exact
to four decimals including both thin margins), the vote rule's internal consistency, the positive control's ability
to fail for the right reason, `compare.ts`' stated input being sufficient for all eight measures and the five
stratify properties, the three boundary rules carrying the new file with **no rule added and the proof count still
25**, `scripts/` being `FULL_ONLY` so Slice 3 is right to be a full suite, every check sitting in exactly one slice
(4 + 6 + 4 + 0 = 14), and the decisions pin being current. **Round 3 also confirmed that no sentence of the kind
round 2 withdrew survives** — the one that had pre-authorised weakening the band to make a control pass.

## If the answer is "approve"

1. Write the `S-` entry first, in **S-185's form**: what is approved, that rule 1's adversarial approval is waived
   **for this feature only**, why (the three rounds and their 57 findings), what was rejected (a fourth round), and
   what catches a violation.
2. Set the `Gates:` line to APPROVED four times, and only then build **Slice 1** — the arithmetic
   (`packages/benchmark/src/compare.ts`), checks 1, 2, 3, 4, with every pinned worked value, plus
   `packages/benchmark/src/index.ts:8`' falsified sentence.
3. **Targeted**:
   `--slice tests/yield-compare-arithmetic.test.ts tests/yield-benchmark-schema.test.ts tests/line-endings.test.ts tests/no-absolute-paths.test.ts tests/feature-files.test.ts tests/context-file.test.ts tests/file-scans.test.ts`.
   One `slice-builder`, one slice, no commit by the agent (S-172, S-177).
4. **Hand the builder the findings rule**: a numbered list naming the gate sentence each finding contradicts,
   reported rather than built around (S-197).

## If the answer is "leave it"

Write `benchmark-view`'s four gates (S-184's split, S-198's order), against the comparison's `--out` record **as
these gates specify it** rather than as built, and say so in the file's header the way `yield-compare`'s says it.
One self-contained HTML page with its data inlined, no CDN and no server, in `knowledge-transfer/cutroom-kt.html`'
proven form (S-184). `yield-compare` stays `Status: planned` with its `Gates:` line pending and its three review
tables intact.

## Do not

Write `packages/benchmark/src/compare.ts`, `scripts/benchmark-compare.mjs`, `scripts/_benchmark-rows.mjs` or any
other implementation file of `yield-compare` before the `Gates:` line says APPROVED four times. Run a fourth review
round unless the owner asks for one. Weaken a check, a bound or a pinned value to reach green. Edit
`yield-benchmark`'s gates — what this feature owes it is an amendment block (S-197).
