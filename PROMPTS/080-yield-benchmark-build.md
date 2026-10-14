# 080 — build `yield-benchmark`, slice by slice

- **For:** session 87
- **Feature:** `yield-benchmark` (`docs/features/yield-benchmark.md`), four gates APPROVED by owner decision
  (S-185). `yield-compare` and `benchmark-view` are named stubs and are not worked on
- **Work:** build the four slices, one `slice-builder` at a time, each verified and committed before the next
  opens. **Written for more than one session**: it stops at a slice boundary and hands over when context runs
  short. The first building session of this feature
- **Written:** 2026-10-14
- **Run:** not yet

```text
Read docs/context.md first, then docs/features/yield-benchmark.md whole — it is the specification and it is
approved, so you build what it says rather than redesigning it. Then S-185 (grep -n '^## S-185' DECISIONS.md) and
S-182's Amended block (grep -n '^## S-182' DECISIONS.md), which carry the weights, the tolerances, the rating
version and what the split moved out.

YOU START FROM A CLEAN TREE, AND SLICE 1 IS UNBUILT. Session 86 opened Slice 1 in the wrong phase, was stopped,
and the partial work was DISCARDED at the owner's word — because it turned three verified features' checks red:
it had added the three boundary rules and their --prove cases, so `drift --prove` printed 25 while
tests/reel-stills-rules.test.ts, tests/reel-render-rules.test.ts and tests/paid-path-keys.test.ts still assert 22,
and the amendments that answer that were never written. Nothing of it survives. HEAD is cda948f, the tree is
clean, and `node scripts/drift.mjs --prove` prints 22.

THE LESSON THAT COST IS WORTH CARRYING: the three new rules and their amendments are ONE change. A slice that
adds a rule without amending every place that counts them leaves the repository red, so Slice 1 is not done — and
is not committable — until `drift --prove` says 25 AND those three test files say 25 with it.

WHAT TO BUILD, IN ORDER. Four slices, exactly as Gate 4 states them, ONE slice-builder at a time — never two at
once, because they would edit the same files. Each slice: its tests first, then its code, one deliberate break per
property seen red and restored, its amendment blocks. The builder never commits; you run the check and commit its
tree-bound evidence before opening the next slice.

  Slice 1  packages/benchmark's index, measures and reasons; the package manifest and tsconfig; the root reference
           and workspace dependency; the row fixtures under tests/fixtures/benchmark/; the three boundary rules
           with their --prove cases; and EVERY amendment taking the rule count from 22 to 25 — three test files
           and seven documents, each named by line in the gate's S-099 section, plus the two enumerations a tenth
           workspace member falsifies and cutroom-kt.html's rules array. reel-stills, reel-render and paid-path
           each gain an amendment block. Checks 1, 2, 3, 4, 11, 12. FULL SUITE.
  Slice 2  ratings.ts: the thirteen terms in their achieved-over-attempted phrasing, the weights, the tolerances,
           the three conventions, the stamp, absent parts, the partial label, the five worked values and their
           ranking WITH the tie between dead-on-first-picture and stopped-at-gate-1 at 10.0. Checks 8, 9, 10.
           TARGETED.
  Slice 3  scripts/benchmark.mjs: the read-only open, the scorecard, the drill-down, the flag table and its four
           exit codes, the brief key's SHA-256, the full record under --out, --rescore writing the ledger; then
           docs/research/refusals.md and docs/research/yield-baseline.md frozen with their date and commit, and
           PictureAnswer corrected to ImageAnswer there. Checks 5, 6, 7, 13. FULL SUITE.
  Slice 4  node scripts/journey.mjs yield-benchmark, then reel-stills, reel-render and paid-path again, serially,
           for the rule count (S-099's form, S-178's order). Proves none — it is the feature's proof.

Thirteen checks, 6 + 3 + 4 + 0, every check in exactly one slice.

S-185'S ACCEPTED RISK IS YOURS TO HONOUR. Four adversarial rounds refused these gates and the owner approved them
by decision after all nineteen of round 4's findings were applied; no reviewer approved them, and the Gates: line
says so. The bargain is that THE SLICES CARRY THE REVIEW. So: a check you cannot make pass as written is a FINDING
— stop, report it, and let the owner decide — never a check you reword, loosen, skip or make conditional. The same
goes for anything in the gates you find to be wrong about this repository's own code: five such errors were caught
in session 86 by reading source, and more may remain. Report them; do not quietly build around them.

HARD LIMITS. Never weaken a check, test, timeout, bound or boundary rule — add, never subtract. Change no engine
behaviour. Spend nothing, reach no provider, read no key, and never open data/cutroom.sqlite for writing. Commit
no media, no database and no generated artifact. Do not write yield-compare's or benchmark-view's gates, and do
not start picture-prompt, the paid pass, run-provenance or hosted-checks.

ENVIRONMENT, each trap already paid for. pnpm is not on PATH — corepack pnpm <script>, or node scripts/check.mjs.
Node is 22.14, so TypeScript tests need --experimental-strip-types and a quoted glob, never a bare directory.
Windows with a CRLF working tree: sed, awk and grep strip \r on read and lie about line endings, so count bytes
with tr -cd '\r' < file | wc -c. Shell tooling can HALVE BACKSLASHES in transit, so a regex written through a heredoc can
arrive with single backslashes where it needs double, silently matching any character — this has already broken
a boundary rule here, and it bit session 86 again while writing this prompt. Verify .dependency-cruiser.cjs's
patterns by READING THE FILE, never by trusting the command that wrote them, and check benchmark-no-io's
enumeration against pipeline-no-io's character-for-character (.dependency-cruiser.cjs:53) plus crypto.
No absolute paths anywhere (D-086). Adding a package's first file means adding
its root tsconfig.json reference, or tests/workspace.test.ts fails. The full suite takes about 25 minutes; the
known PATH-only child transient in tests/reel-takes-secrets.test.ts is a full-suite signal, not a new defect.

THIS PROMPT IS WRITTEN FOR MORE THAN ONE SESSION, AND SAYS SO RATHER THAN HOPING. Four slices carry about three
hours of check runs on their own — a full suite for Slice 1 and another for Slice 3 at roughly 25 minutes each,
and FOUR journeys in Slice 4, every one of which runs every check. Add four slice-builder agents reading context
and this will not fit in one session. That is expected and is not a failure.

So, AFTER EACH COMMITTED SLICE, judge whether there is room for the next one. If there is, open it. If there is
not:

  1. stop at the slice boundary, never inside one — a half-built slice is what turned three verified features red
     in session 86, and an uncommitted slice is what the stop-gate refuses;
  2. write the next session's prompt in PROMPTS/ as NNN-yield-benchmark-build-<n>.md, listed in PROMPTS/README.md,
     naming the slice to resume at, the commit it resumes from, and anything the gates got wrong that you found;
  3. write the JOURNAL.md entry and this session's entry in docs/context.md, and set this prompt's Run line;
  4. stop.

Resuming is cheap and guessing is not: a new session re-reads docs/context.md and the gates in minutes, while a
slice abandoned half-written costs someone an afternoon working out what is real.

Before you stop: the JOURNAL.md entry and this session's entry in docs/context.md, this prompt's Run line, and a
commit per slice whose trailers bind the exact tree — Verification: full for Slices 1 and 3, targeted for Slice 2
with its tests named, and node scripts/verification-status.mjs checked before and after each. This holds whether
you finish all four slices or one: the journal says which slices landed, which remain, and where the next session
picks up.
```
