# 083 — finish the §3 measurement, then size the two-class scheduler

- **For:** session 89
- **Feature:** none. §3 and §4.2 of `docs/research/test_fixes_and_research.md`. Checker tooling:
  `scripts/check.mjs`
- **Work:** complete the per-file measurement (73 of 153 files remain, including 6 of the 11 secrets
  journeys), write the table, then build the two-class scheduler sized from it — with three consecutive
  green full runs as its evidence, not one
- **Written:** 2026-10-15, session 88
- **Run:**

```text
Read docs/context.md first, then §2, §3, §4.2 and §6 of docs/research/test_fixes_and_research.md, and
S-176 (grep -n '^## S-176' DECISIONS.md), whose four rejections stand: no bound raised, no child
concurrency reduced, no journey skipped, no file dropped.

PART ONE — finish the measurement. `.tmp/measure.mjs` exists and works (session 88 wrote it; it is
gitignored and carries no verification obligation). It ran 80 of 153 files before Claude Code killed the
background shell for system memory pressure — not a failure of the script. Partial data:
`.tmp/measure.json`, `.tmp/measure.md`, and the numbers are in S-190 and the journal.

Run it on an IDLE machine with nothing else building in this tree — contention is the variable being
measured, so a second session invalidates the numbers. Prefer running it in slices so a kill costs little:
`node .tmp/measure.mjs secrets` first (the eleven PATH-only journeys, the expensive half), then the rest.
Merge into one table. What it must end with, per §3: each file's wall time alone, each secrets child's
elapsed time AND its margin against its own bound, the lowest free memory seen, and the subtraction —
outer suite total minus the sum of the secrets children, which is what the ordinary ~140 files cost.

PART TWO — only then build §4.2. Two pools that never overlap: the ordinary files at outer concurrency
4–6, then the eleven secrets children at a pool of 2–3. Every child keeps its ratified internal
concurrency (2 or 4) and its bound unchanged. The pool size is the largest that keeps free memory above a
floor you record and every child's margin against its bound above a minimum you record; both numbers go in
the S- entry. S-176 is superseded in part — the outer scheduler becomes class-aware instead of one number
— and the entry must say plainly that this removes the CAUSE S-176 named (ordinary work overlapping nested
child suites) rather than widening a limit.

Evidence for a contention change is THREE consecutive green full runs with recorded peak memory and worst
child margin. One green run is not evidence. A red is the finding: stop and report.

Note for both parts: S-188 means a journey at content a green full receipt already covers runs nothing, and
`node scripts/verification-status.mjs` says whether HEAD already carries full evidence for its exact tree.
Do not repeat a suite that has already passed for this content. S-189 means the static checks are ~7 s now,
so `--slice` is cheap; the suite is the whole cost and §4.2 is about that.

Before you stop: the journal entry, this session's entry in docs/context.md, the Run line here, and the
before/after numbers from the same machine in the same state (§6).
```
