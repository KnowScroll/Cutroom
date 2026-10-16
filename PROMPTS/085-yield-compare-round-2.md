# 085 — `yield-compare`'s gates, round 2 of review

- **For:** session 92
- **Feature:** `yield-compare` (`docs/features/yield-compare.md`), the benchmark's second part. `benchmark-view` is
  the phase after this one and is not worked on
- **Work:** one fresh adversarial round against the revised gates, every finding applied or refused in writing, and
  — only if all four are approved — `PROMPTS/086` for Slice 1. **No implementation file of any kind until the
  `Gates:` line says APPROVED four times**
- **Written:** 2026-10-16
- **Run:** session 92, 2026-10-16 — a fresh round 2 refused all four gates on 24 findings; 23 applied and 1
  refused, recorded in the feature file; S-199 amended for the eight choices that moved; `PROMPTS/086` written
  for round 3, which runs only if the owner says to continue

```text
Read docs/context.md first, then docs/features/yield-compare.md whole (903 lines; its "Gate review 1" section at
the end is the record of round 1 and what each of its 22 findings got), then S-199 (grep -n '^## S-199'
DECISIONS.md, then that entry's lines) which is what these gates settle beyond S-182, then S-182 and S-184 by the
same method for what still binds.

WHERE THINGS STAND. All four gates are written and NONE is approved. Round 1 of session 91 refused all four with
twenty-two findings; every one is applied and recorded in the feature file's own review table, and nothing was
refused. Six of the twenty-two were each sufficient alone, and the three with code claims were verified against the
source before being applied: tests/yield-benchmark-reader.test.ts reads the reader's SOURCE TEXT and asserts
exactly one `new DatabaseSync(` in it, so moving the open breaks it and blinds the rest of that scan;
packages/benchmark/package.json declares no zod, so a zod schema would drag package.json and pnpm-lock.yaml into
FULL_ONLY; and tests/check-pools.test.ts asserts every secrets-pool member holds a `bareEnvironment` function.

What the revision changed most, and what a fresh round should attack first:
1. THE UNIT OF EVIDENCE IS THE RUN. Only `reels made` is a share over runs; measures 2 to 8 are per-run figures
   averaged over the side's runs, because twenty pictures made by four runs are four pieces of evidence. The
   pooled and per-run answers are pinned on the same rows and disagree: 0/20 against 8/20 is delta +0.3636, band
   0.1138, MOVED pooled; the same rows are delta +0.4000, band 0.2531, inside the noise per run.
2. A BAND THAT CANNOT BE ZERO: Agresti-Caffo adjusted counts for a share, Welch floored at the run-level share
   band for a rate, and a zero band voting NO VERDICT rather than "inside the noise". Eleven worked values are
   pinned in check 1. Recompute them.
3. THE NULL COMPARISON NOW HAS THREE GROUPS AND A POSITIVE CONTROL, because five runs of one brief key are one
   group and one group reads "no verdict" whatever the arithmetic does — round 1 showed the first draft's null
   could not fail.
4. SEVEN comparability conditions, each port's models now among them; four of S-182's dropped as vacuous by
   construction; an absent observed field refusing nothing.
5. TWO AMENDMENTS TO THE VERIFIED SCORING HALF, in S-099's form: the reader's source scan grows from one file to
   three, and `scorecard()` gains `planVaryOn` with its FIELD_COLUMNS entry. Judge whether either weakens anything
   and whether the enumeration of the thirteenth PATH-only child's nine live "twelve" claims is complete.
6. SLICES 4 + 6 + 4 + 0 = 14, Slice 3 full-suite. Round 1 found Slice 1 reaching into two later slices; check
   whether it still does.

HOW TO WORK. A FRESH gate-reviewer, not a continuation: CLAUDE.md's rule 4 says the round that would approve all
four is a fresh reviewer, and this one might. Hand it the slug, S-199, the pinned figures above and the facts the
main session measured, and tell it round 1's findings are already applied so it does not re-report them. Then apply
or refuse every finding in writing, in the same table form the file already uses, and amend S-199 if a choice
moves. THIS IS ROUND 2: if a round 3 would be needed, ask the owner whether to continue rather than running a
fourth — session 83 spent three rounds on this material as one feature and session 86 a fourth on the other half.

DONE IS. One round answered in full; the Gates: line reading APPROVED four times or the findings recorded for the
next round; node scripts/check.mjs --changed green (Markdown only, S-193); the journal entry and this session's
entry in docs/context.md; and PROMPTS/086 written — Slice 1 if approved, round 3 if the owner says to continue.

DO NOT. Write packages/benchmark/src/compare.ts, scripts/benchmark-compare.mjs, scripts/_benchmark-rows.mjs or any
other implementation file. Touch yield-benchmark's gates — the two amendments this feature owes it are an amendment
block, as S-197 set. Weaken a check, a bound or a pinned value to make a round pass. Start benchmark-view's gates.
```
