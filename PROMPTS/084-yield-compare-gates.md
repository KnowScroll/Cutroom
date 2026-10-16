# 084 — `yield-compare`'s four gates, written and reviewed

- **For:** session 91
- **Feature:** `yield-compare` (`docs/features/yield-compare.md`), the benchmark's second part. `benchmark-view` is
  the phase after this one and is not worked on
- **Work:** write all four gates on what the file already records, settle the nine open choices with what is
  rejected and how each is caught, send a fresh adversarial round, and draft the `S-` entry. **No implementation
  file of any kind**
- **Written:** 2026-10-16
- **Run:** session 91, 2026-10-16 — all four gates written, round 1 refused all four with 22 findings,
  every one applied, S-199 written; round 2 is `PROMPTS/085`

```text
Read docs/context.md first, then, in this order: docs/features/yield-compare.md whole (94 lines — it records what
this feature owns, the two modes, what is already settled and the nine choices the gates must make);
docs/features/yield-benchmark.md by heading — Gate 2's "What the scorecard holds, part by part", "The ratings, with
their arithmetic" and "What is already there to score", Gate 3's "File locations", "The checks" and "The ledger's
columns", and the amendment block at the top (S-197's three imprecise sentences, which are what this file must not
repeat); S-184 then S-182 (grep -n '^## S-18[24]' DECISIONS.md, then each entry's lines) — S-184 split the
benchmark in three and S-182 holds the arithmetic this feature inherits; S-198, which put this phase next;
packages/benchmark/src/index.ts for what the pure package already exports.

WHERE THINGS STAND. yield-benchmark is BUILT and Status: verified (session 87): packages/benchmark computes every
measure from arrays of rows, scripts/benchmark.mjs reads the record read-only and writes docs/research/benchmark.md,
52 runs scored, part ratings and a run rating with an r1 stamp. It deliberately computes no band, no delta and no
verdict — those are this feature's, and S-184 says so. Three adversarial rounds in session 83 already argued over
this material while it was one feature; what survived is in docs/features/yield-compare.md under "What is already
settled, and binds these gates", and it binds: the brief key's construction, two runs a side in a group and three
shared groups at the least, the same direction in two thirds of surviving groups, a zero delta counting as not
moved, dropping a group where the measure is undefined on one side, the fingerprint's fields, and the engine's code
version and the picture rule reading "not recorded" until run-provenance exists.

THE OWNER'S REASON, WHICH DECIDES TIES. "This is also the most important or else how would we know whether the new
engine or new thing in the engine worked." Every engine feature after this one is a claim that runs got better.
This feature is what can say so, and a verdict it reaches wrongly is worse than no verdict — which is why "no
verdict" is one of the four words.

WHAT THE GATES MUST SETTLE. The file lists nine, each a real choice; every one needs what was rejected and how a
violation is caught:
1. The band's wording, in ONE place, with the check quoting the formula it checks. S-182 says a measure moves
   "beyond twice its own band" while the band is 2 x SE, which reads as 4 x SE; one draft said "pooled" over the
   unpooled Wald form.
2. The arithmetic's scope: pooled over the side or averaged over surviving groups; whether a group dropped for one
   measure keeps its counts in that measure's pool; whether a group with fewer than two runs a side is dropped.
   Pooling across groups of 8/5/4/4/4 runs can reverse the sign the per-group test sees.
3. The credit guard's quantities. Three were chosen — shots the plan asked a picture for, accepted pictures per
   shot, shots degraded — and a reviewer showed they miss a change that plans FEWER OR SHORTER shots, which lowers
   cost and wall clock and raises reels made. The plan's shot count and its total planned seconds go into the guard
   or into the fingerprint; say which.
4. Which comparability conditions are not vacuous. Style id and version, depictionPolicyVersion and the contract
   version all sit inside the brief key by construction and can refuse nothing; the measures version cannot differ
   inside one invocation; "standalone pictures exist" reveals the picture rule in one direction only. The request's
   ceiling and options.planVaryOn are in no condition at all and decide when a run stops and what the two fork
   plans differ on.
5. The verdict's unit: eight measures can disagree; whether an overall verdict is printed, and how it composes.
6. What a malformed side is: overlapping sides, a run named twice, a run id absent from the record.
7. The null comparison as a check: the five same-fingerprint runs of group 4ce40e14, split two against two, where
   nothing differs — every measure must come back inside the noise, and a claimed winner means the arithmetic is
   wrong.
8. Where the code lives, against the boundary rules that already exist: the arithmetic is pure and belongs in
   packages/benchmark (benchmark-no-engine, benchmark-no-io, benchmark-npm-only-zod hold it, and node:crypto is
   denied), the reader is a script, and there is no compare.ts today because S-184 put it here. Gate 2 says which
   file gains what, and whether the reader is a flag on scripts/benchmark.mjs or a script of its own — with what
   each costs, given check.mjs holds every scripts/ path to the full suite.
9. What it must not do, carried from the file: change engine behaviour, weaken a check, write to the record, spend,
   reach a provider or read a key.

WHAT IS TRUE ABOUT THE RECORD, AND MUST NOT BE WISHED AWAY. 5 of the 25 brief groups hold two or more runs whose
fingerprints match, the largest matching set being five runs in group 4ce40e14. A verdict needs four matching runs
in each of three groups, and only one group reaches four — SO NO VERDICT IS AVAILABLE FROM THE 52 RUNS ALREADY
MADE. Gate 1 says that in the owner's words rather than hiding it, and the null comparison and stratify are what
this feature can prove today. Stratify needs no matched pairs at all and is the view that answers which config is
good over the runs already made: session 82 found the engine's largest defect that way (42% / 70% / 100% refused by
subjects per shot).

HOW TO WORK. Gates before code (CLAUDE.md rule 1), and this session writes no implementation file. Write all four
gates into docs/features/yield-compare.md in the form yield-benchmark's use — Gate 1 product with no technical
language, Gate 2 architecture with a place-and-may-not table, Gate 3 program design with file locations, flags,
exit codes and the numbered checks as exact sentences, Gate 4 slices with each check appearing in exactly one slice
and a count that adds up. Then ONE adversarial round: the gate-reviewer agent, handed the slug, the decisions this
feature writes, and the figures above. Cap the rounds — after about three, ask the owner whether to continue rather
than running an eleventh. The reviewer's only allowed edit is the Gates: line of the file it approves.

DONE IS. The four gates written; one review round answered in full with every finding either applied or refused in
writing; the S- entry drafted for whatever the gates settle that S-182 did not; node scripts/check.mjs --changed
green (Markdown only, S-193); PROMPTS/085 written for whatever comes next — the next round, or the slices if all
four are approved; the journal entry and this session's entry in docs/context.md.

DO NOT. Write packages/benchmark/src/compare.ts or any other implementation file. Touch yield-benchmark's gates —
S-197 named three imprecise sentences there and the fix was an amendment block, not an edit. Weaken a check or a
bound to make a slice look smaller. Start benchmark-view's gates, which are the phase after this one (S-198).
```
