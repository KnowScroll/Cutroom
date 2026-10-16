# 086 — `yield-compare`'s gates, round 3 of review

- **For:** session 93
- **Feature:** `yield-compare` (`docs/features/yield-compare.md`), the benchmark's second part. `benchmark-view` is
  the phase after this one and is not worked on
- **Work:** one fresh adversarial round against the twice-revised gates, every finding applied or refused in
  writing, and — only if all four are approved — `PROMPTS/087` for Slice 1. **No implementation file of any kind
  until the `Gates:` line says APPROVED four times**
- **Written:** 2026-10-16
- **Run:** —

> **The owner said to continue, 2026-10-16, asked at the end of session 92: round 3 runs.** Two rounds have refused
> all four gates — 22 findings in
> session 91, 24 in session 92, 45 applied and 1 refused. The owner was asked at the end of session 92 rather than
> a third round being spent unasked, because session 83 spent three rounds on this material as one feature and
> session 86 a fourth on the other half. **The two answers that were not taken**, recorded because round 4 will put
> them again: approving the four gates by decision in **S-185's form** (which waived rule 1's adversarial approval
> for `yield-benchmark` alone, after four rounds), which makes the next prompt Slice 1; or stopping, which makes it
> `benchmark-view`'s four gates (S-198's order), with `yield-compare` left written and unapproved.

```text
Read docs/context.md first, then docs/features/yield-compare.md whole (its two review sections at the end are the
record of rounds 1 and 2 and what each of their 46 findings got), then S-199 AND ITS AMENDMENT
(grep -n '^## S-199' DECISIONS.md, then that entry's lines through the amendment block), which is what these gates
settle beyond S-182, and then S-182 and S-184 by the same method for what still binds.

WHERE THINGS STAND. All four gates are written and NONE is approved. Round 1 refused all four on 22 findings and a
fresh round 2 refused all four again on 24; 45 are applied and 1 refused, each recorded in the feature file's own
two tables, and S-199 carries an amendment for the eight choices round 2 moved. Rounds 1 and 2 verified a long list
of things and did not fault them — both tables end with that list, and a third round should not redo it.

What round 2 changed most, and what a fresh round should attack first:
1. THE GUARD HAS ITS OWN BAND, AND A ZERO BAND FIRES IT. Quantities 1, 2, 4 and 5 take bare Welch, never the floor
   (whose adjusted counts return NaN on a shot count), and a band of exactly zero FIRES the guard where it votes no
   verdict for a measure. The asymmetry is argued, not assumed: judge whether it is the right asymmetry and whether
   check 5's two pinned cases — A planning 6 against B planning 4 fires, the same sides exchanged does not — can
   distinguish every wrong implementation.
2. THE VOTE RULE'S PRECEDENCE AND ITS COMPARABLE-MAJORITY CLAUSE. Clause 3 outranks clause 4, so clause 4 fires on
   `band = 0 AND delta != 0`; a no-verdict group is surviving but not comparable, and fewer than ceil(2/3 x
   surviving) comparable votes reads no verdict. Round 2 found the zero-band rule undone one level up; check
   whether it is now undone anywhere else, the guard's own vote included.
3. THE CONTROL IS ITS OWN 24-RUN FIXTURE, FOUR A SIDE, with identical attempted work on both sides and side A's
   runs reaching a finished render whose output is unreadable. Judge whether it can fail for the right reason, and
   whether the null's fifteen runs can.
4. TWO AMENDMENTS AND ONE FIXTURE EDIT TO THE VERIFIED SCORING HALF. One committed fixture's options gain
   planVaryOn, because yield-benchmark's check 1 proves every FIELD_COLUMNS entry by mutating its column and no
   fixture carries the field; an eleventh fixture is refused because check 4 pins groups.size at 9 and its shared
   pair by name. The reader's source scan splits clause by clause — negatives per file, three positives over the
   concatenation. Judge whether anything is weakened and whether the clause list is complete this time.
5. THE SLICES NAME THE FIVE ALWAYS-RUN SCANS. --slice runs no SCANS step, which is the S-195 hole, so Slices 1 and
   2 name those five files and tests/yield-benchmark-schema.test.ts. Check whether anything else a targeted slice
   needs is still unnamed, and whether 4 + 6 + 4 + 0 = 14 still holds with each check provable in its own slice.
6. THE TWELVE LIVE "twelve" CLAIMS, which ARE the instrument (S-197: no mechanical check can read an English
   count). Round 2 found three missing. Re-measure rather than trust the table.

HOW TO WORK. A FRESH gate-reviewer, not a continuation (CLAUDE.md rule 4). Hand it the slug, S-199 with its
amendment, and every figure the main session measures first — recompute the ELEVEN pinned worked values of check 1
yourself before the round and hand them over, as session 92 did with eleven, so the round is spent on design rather
than arithmetic. Tell it rounds 1 and 2 are already applied so it does not re-report them. Then apply or refuse
every finding in writing, in the same table form the file already uses, and amend S-199 again if a choice moves.
THIS IS ROUND 3 AND THE LAST ONE THAT RUNS UNASKED: if a round 4 would be needed, stop and put the two remaining
answers to the owner — approval by decision in S-185's form, or leaving the feature written and unapproved and
moving to benchmark-view.

DONE IS. One round answered in full; the Gates: line reading APPROVED four times or the findings recorded for the
next round; node scripts/check.mjs --changed green (Markdown only, S-193); the journal entry and this session's
entry in docs/context.md; and PROMPTS/087 written — Slice 1 if approved, the owner's question if not.

DO NOT. Write packages/benchmark/src/compare.ts, scripts/benchmark-compare.mjs, scripts/_benchmark-rows.mjs or any
other implementation file. Touch yield-benchmark's gates — what this feature owes it is an amendment block, as S-197
set. Weaken a check, a bound or a pinned value to make a round pass; round 2 withdrew a sentence of Gate 3's that
pre-authorised exactly that. Start benchmark-view's gates.
```
