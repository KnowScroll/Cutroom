# 079 — the benchmark's gates: apply round 3, add the two modes the owner asked for, round 4

- **For:** session 85
- **Feature:** `yield-benchmark` (`docs/features/yield-benchmark.md`); nothing else is built
- **Work:** apply round 3's twenty findings and four owner-driven changes, amend S-182, send a fresh
  adversarial round 4. **No implementation file of any kind**
- **Written:** 2026-10-12
- **Run:** not yet

```text
Read docs/context.md first, then, in this order: docs/features/yield-benchmark.md whole, including its three
"## Gate review" sections; S-182 (grep -n '^## S-182' DECISIONS.md, then its lines); docs/features/run-provenance.md;
docs/research/yield-baseline.md; docs/features/picture-prompt.md. PROMPTS/077-benchmark-design.md is the prompt that
started this feature and still names what it must settle.

WHERE THINGS STAND. Session 83 designed the benchmark and built none of it. Its four gates have been through THREE
adversarial rounds and are STILL NOT APPROVED. Rounds 1 and 2 are recorded in the feature file and every one of
their findings is applied. ROUND 3'S TWENTY FINDINGS ARE NOT IN THE FILE — they are listed below, and this prompt is
the only record of them. Apply them, then get a fresh round 4.

WHAT IS SETTLED BY THE OWNER AND MUST NOT BE REOPENED.
- A benchmark run is a WHOLE REEL; each part carries its own numbers, timings and rating; one composite number
  beside every internal number; and any part of any run can be read alone.
- Buying reels on a frozen brief set is Deferred 1, a later feature. This one spends nothing and only reads rows.
- THE COMPARISON STAYS IN. The owner refused to defer it: "No we need job 2 as well, this is also the most
  important or else how would we know whether the new engine or new thing in the engine worked ... even if it takes
  more time and brainstorming and decision making to close."
- The benchmark lives in THIS repository, not a new one (it reads internal tables and binds its classifier to
  gate1.ts's own strings).
- Recording what made a run is its own named feature, docs/features/run-provenance.md, not work here.
- Ratings are built only from the engine's own verdicts, an absent part scores 0 against its weight, and no rating
  decides anything. S-182 carries the weights.

FOUR CHANGES THE OWNER ASKED FOR AFTER ROUND 3 WAS SENT, not yet in the file.

1. A SECOND COMPARISON MODE, because the owner wants to compare reels on the same brief whose CONFIG differs:
   "i would want to compare the reels if they have different number of planned shots, or less number of shots or
   anything, we would want to know which config is good no?" So the refusal stops being "anything recorded differs"
   and becomes "something differs that was not declared": the caller names the fields under test, those are printed
   as the comparison's axis, and an undeclared difference is what refuses the verdict. "Did my change help" is the
   same mechanism with an empty declared set. In config mode, cost per run and wall clock per run are REPORTED, NOT
   JUDGED unless declared as the measure of interest — a richer config is supposed to cost more.
2. A STRATIFY VIEW: group every run (or one side) by a recorded property — shots in the selected plan, planned image
   calls, subjects per shot, picture role, image-to-video share — and report each stratum's measures with its band.
   This is how session 82 found the real defect (42% / 70% / 100% refused by subjects per shot) and it needs no
   matched pairs, so it answers "which config is good" over the 52 runs we already have.
3. A NULL-COMPARISON CHECK. Measured in session 83: 5 of the 25 brief groups hold two or more runs whose
   fingerprints match, and the largest matching set is five runs in group 4ce40e14. Split that set 2 against 2 and
   nothing differs at all, so the comparison MUST report every measure inside the noise. If it ever calls a winner
   there, the arithmetic is wrong. Build it as a check with those real runs.
4. AN OVERCLAIM TO DELETE. The file says "No two of those 25 groups hold two runs on one engine version". That
   cannot be known — no row records an engine version, which is the feature's own finding. Replace it with the
   measured fingerprint fact: 5 of 25 groups have a matching pair; a verdict needs two runs a side in three groups,
   so four matching runs in each of three groups, and only one group reaches four. No verdict is available from
   history; the first ones come from runs made after this exists.

ROUND 3'S TWENTY FINDINGS, each with what it asked for. It verified the earlier fixes against source and confirmed
Gate 5's four templates, Gate 1's five-plus-two, the scoped classifier, the "not recorded" stamps, and that no table
carries a commit; it also confirmed S-182 matches the gates character for character on every weight and rule it
carries.

1. THE WORKED RATING VALUES ARE WRONG, and check 7 pins them. "dead-on-first-picture = 10.0" is 19.0: the pictures
   part's second term is a share of THE PLAN'S SHOTS not degraded, the denominator is non-empty for an admitted
   plan, and a run that died on its first image call wrote no degradation row, so that share is 1.0 and collects the
   full 0.3 — pictures 30.0, run 19.0. The Gate-1-stop fixture computes to 19.0 as well (every such run in the
   record cost 15c = three image calls, 3 judged, 0 accepted, 0 degraded), so the two fixtures TIE and check 8's
   ranking is red on its own fixtures. Restate every complement term's denominator as ATTEMPTED items, recompute all
   four values, and say which fixtures each is computed over.
2. THREE COMPLEMENT TERMS PAY FOR WORK NEVER ATTEMPTED: pictures' "shots not degraded", clips' "shots not held at
   the take cap", cut's "no holds". A run that entered the video stage and made nothing scores clips 30 and cut 20.
   Fix the denominators, and add a third convention: a yes/no term whose subject never existed inside a reached part
   is 0, not 1.
3. THE FIVE PARTS DO NOT MAP ONTO THE ENGINE'S THREE STAGES. RunEvent's stage is plan | stills | video; narration,
   clips and the cut all live inside video, the clips job writes one video start, and the assemble job writes no
   start at all (118 starts = 52 plan + 43 stills + 23 video). So "a part is reached when its stage started" is
   undefined for three parts, which is where finding 2's free credit comes from, and part seconds for narration,
   clips and the cut are unsourced. State the part-to-stage/job mapping, define "reached" for those three from their
   own evidence (a narration row, a take row, a render row) or from the reel.clips / reel.assemble job rows, and fix
   check 1's wording.
4. benchmark-no-io AS SPECIFIED DOES NOT FORBID node:crypto, which is the only reason hashing moved to the reader.
   pipeline-no-io's enumeration already contains sqlite under both spellings and does not contain crypto. Enumerate
   the new rule's own builtins in the gate — the existing list plus crypto, and say what else is in or out — and
   name the crypto case in check 13.
5. THE THRESHOLD IS STATED THREE WAYS. S-182 says a measure moves "beyond twice its own band" while the gate defines
   the band as 2 x SE, which reads as 4 x SE; and check 11 says "pooled" where the gate's formula is the unpooled
   Wald form. One wording in both documents — band = 2 x SE, a move needs |delta| > band — and check 11 must quote
   the formula it checks. Per CLAUDE.md the S-entry wins, so S-182 is the one to correct.
6. THE CREDIT GUARD STILL MISSES FEWER OR SHORTER SHOTS. A change that plans 4 units instead of 6, or shorter shots,
   lowers none of the three guard quantities (plannedImageCalls is capped at 4 and can stay equal) yet lowers cost
   per run and wall clock per run and raises reels made — three deciding measures credited as "helped" for a smaller
   reel. Add the plan's shot count and its total planned seconds to the guard, or to the fingerprint so a change in
   them refuses the verdict.
7. THERE IS NO WORD FOR "IT MADE IT WORSE". The verdict vocabulary is helped | inside the noise | no verdict. Add
   HURT, in Gate 1, in the comparison section, in check 11 and in S-182. Every field already declares a direction,
   so the sign is available.
8. THE BRIEF KEY IS HASHED IN SLICE 4'S READER WHILE ITS ONLY CHECK SITS IN SLICE 1. Either hand the package an
   injected hash function and keep check 4 where it is, or move the key and fingerprint assertions into Slice 4's
   behavioural reader check. As written, Slice 1 needs Slice 4's code or proves only that the package groups by
   whatever string it is handed.
9. THE LEDGER'S COLUMNS ARE STILL NOT ENUMERATED — round 2's finding 10 was claimed fixed and was not. Check 6 says
   "the columns are exactly those Gate 2 lists" and Gate 2 lists the scorecard's hundreds of fields and says only
   "one row per run". Enumerate the ledger's columns in order with each one's format, and say whether the read date
   and commit live in a row or in the file's header — if they live in a row, "byte-identical on a second scoring" is
   red.
10. "FIVE PLACES ASSERT 22" IS FALSE; there are nine. Also stating twenty-two: CLAUDE.md a second time (line 69,
    "Three of the twenty-two are between two folders of one package"), README.md:107,
    knowledge-transfer/02-repository-map.md:155, knowledge-transfer/11-development-workflow.md:76,
    knowledge-transfer/README.md:11, knowledge-transfer/cutroom-kt.html, and docs/features/hosted-checks.md:337.
    None turns a check red, but the repository would contradict itself. And the three test amendments need naming
    precisely: tests/paid-path-keys.test.ts:139 also asserts doesNotMatch(/21 rules proven to fire/), which guards
    nothing once the files say 25 (raise it to 22); the test titles at :115 and :130 say "twenty-two"; and
    tests/reel-stills-rules.test.ts:71-76 and tests/reel-render-rules.test.ts:111-115 carry comments naming each
    rule and its ordinal, which every prior count change extended (S-078, S-120).
11. THE INHERITED-PIECE RULE CANNOT REACH DEGRADATIONS, HOLDS OR STILL-HOLDS: only picture, narration and take carry
    kept_from, and a resumed run WRITES A FRESH degradation row for a carried degradation (stills/index.ts's
    carried() and degrade()). "Shots degraded per run" is a deciding measure, a guard quantity and the pictures
    rating's second term, so the double count reaches all three. State how an inherited degradation, hold or
    still-hold is recognised (the shot's last failing picture carries kept_from) and have check 1 assert that case.
12. "THE PER-REEL CAP IS STORED NOWHERE" IS FALSE where it decided the ending: a budget-limited RunResult carries
    capCents with estimateCents and ceilingCents, and the result is stored in run.result (run a08a9c9c, 231c). Say
    "recorded only in a budget-limited result, absent otherwise", and report it where it exists.
13. THE ESTIMATE'S STATED EXCLUSIONS OMIT THE LARGEST ONE: beyond the reserve and narration it excludes every
    RETAKE and every lost call, which is most of the 40-51c estimate against 53-75c actual gap. Check 1 pins the
    label, so add them.
14. THE OWNER'S "run on individual things" HAS NO INTERFACE, NO CHECK AND NO SLICE, and the CLI is unspecified: no
    part selector, no run selector, no name for the blob/model-text flag, no spelling for the two sides and their run
    lists, for the declared change, or for --rescore, and no exit codes. Write one table of flags with defaults and
    exit codes, and a check that asks for one part of one run.
15. THE ARITHMETIC'S SCOPE IS UNDEFINED, so "one implementation is possible" is not met: whether a measure's delta
    and band are pooled over the whole side or averaged over the shared groups; whether a group dropped for one
    measure leaves that measure's pooled n and p; and whether a group with fewer than two runs on a side counts in
    the two-thirds denominator. Pooling across groups of 8/5/4/4/4 runs can reverse the sign the per-group test
    sees. State that the delta and band are computed over the runs of the surviving groups, and that a group with
    fewer than two runs a side is dropped.
16. MOST COMPARABILITY CONDITIONS ARE VACUOUS: style id and version, depictionPolicyVersion and contractVersion all
    sit inside request_canonical, from which only requestId and options are removed, so within a shared brief group
    they are equal by construction and can never refuse anything; the "measures version" is defined nowhere and
    cannot differ inside one invocation; and "standalone pictures exist" reveals the picture rule in one direction
    only. Meanwhile the request's CEILING — which the gate itself says decides when a run stops — and
    options.planVaryOn are in neither the fingerprint nor the conditions. Fix all of it; this interacts with the
    owner's config mode above.
17. THE VERDICT'S UNIT IS AMBIGUOUS: eight measures can disagree and no composition rule is given, and nothing
    forbids a run appearing on both sides, twice on one side, or a run id absent from the record. Say there is one
    verdict per measure (and how an overall one composes, if printed), refuse overlapping sides, duplicates and
    unknown ids, and have check 12 assert it.
18. SMALL BUT LOAD-BEARING: "Three worked values" heads four bullets that checks 7 and 8 call four; and S-182 does
    not carry the eight deciding measures, the decision that refusals.md and yield-baseline.md become frozen
    snapshots, or the verdict vocabulary. Add all three to S-182.
19. CHECK 2'S "every other reason-writing site" IS INCOMPLETE: the run-ending detail composed in clips/index.ts
    (which embeds failed gates' reason strings verbatim), the word-timing detail, ladder.ts's "cannot be held"
    why, and the two Unanswered messages in gate1s.ts and gate7.ts that become a failed run's detail. A classifier
    fed those double-counts, and the unknown-string finding fires on them. Add them, and say a detail string is
    never classified.
20. TWO SMALLER INACCURACIES: tests/no-absolute-paths.test.ts covers tests/**/*.json but only for four
    home/volume shapes, so it enforces "no machine path" and not "every artifact path is a placeholder" — add that
    assertion to check 1 or 14. And Slice 5 cites S-178 while S-178 is missing from the Decisions: line.

WHAT TO DO, IN ORDER.

1. Apply all twenty findings and all four owner-driven changes to docs/features/yield-benchmark.md, and add a
   "## Gate review 3" section recording round 3 the way rounds 1 and 2 are recorded.
2. AMEND S-182 in DECISIONS.md: the threshold wording (finding 5), the HURT verdict (7), the eight deciding
   measures, the frozen-snapshot decision and the verdict vocabulary (18), the guard's added quantities (6), and the
   two comparison modes with the declared-difference rule (owner change 1). An amendment is added, never rewritten
   around: say what it supersedes in its own words, as this repository's entries do.
3. Send a FRESH gate-reviewer for round 4. Hand it: the slug, the four settled decisions above, this prompt's
   finding list as what was applied, and the session-83 measurements below so it does not re-measure. Tell it to
   verify each applied fix against source, to recompute every worked rating value itself, and to be hardest on the
   new comparison modes, the part-to-stage mapping, the ledger's columns and the CLI table.
4. If it approves all four gates, it edits only the Gates: line. STOP THERE — building is a separate session
   (CLAUDE.md: a session is one phase). If it refuses, apply and decide with the owner whether a fifth round runs;
   three rounds have already cost about 650,000 reviewer tokens, and the owner has been told.

MEASURED IN SESSION 83, read-only from data/cutroom.sqlite. Do not re-measure these; do challenge any inference.
52 runs over 25 brief groups (the request minus requestId and options; largest 8, then 5, 4, 4, 4), every one
until: video. 43 selected plans, 132 pictures with all 132 files still on disk, 128 observations, 127
reconciliations, 118 takes, 95 narrations, 12 renders, 15 degradations, 3 lost calls, 10 refused answers; events 52
run.accepted, 52 run.finished, 118 stage.started, 74 stage.finished, 691 verdict, 16 degraded; jobs reel.plan 52,
reel.keyframes 43, reel.clips 23, reel.assemble 12, attempts equal to row count in every kind, so no job has ever
been retried. job.cost_cents 2202c = generation_receipt 732c (5c x 108, 8c x 24) + video_receipt 1457c +
speech_receipt 0c + lost_call 13c; model_receipt has no cost column; transient_errors exists only on speech and
video receipts. Image calls per run min 2, median 4, max 6; cents per run min 10, median 20, max 39. Selected-plan
estimates 40-51c at today's rates (a 144-190c group predates S-155). Plan plus stills a median 294 s over 23 runs.
Subjects per shot from the selected plan agrees with the prompt's "It shows:" line on 132 of 132 pictures. Gate 1
reasons: 13 distinct shapes, all from reconcile — 45 clipping strings on 43 pictures, 28 must-not-show, 10
must-show, 8 count, 3 not-shown. Fingerprint pairs: 5 of 25 brief groups hold two or more runs with matching
fingerprints, the largest matching set being five runs in group 4ce40e14.

HARD LIMITS. No implementation file, no script, no package, no test, not even a throwaway — this session finishes
the gates. No engine behaviour changes. No check, timeout, bound, test or boundary rule is weakened, skipped or
made conditional. Do not start picture-prompt, the paid pass, run-provenance, or the subjects-per-shot cap. Leave
session 84's hosted-checks work alone (docs/features/hosted-checks.md, docs/research/public-exposure-audit.md,
S-183, .github/workflows/): it has its own gates and its own session.

ONE ENVIRONMENT HAZARD, already paid for. Session 83 and session 84 ran at the same time in one checkout, and HEAD
moved between branches mid-work; for several minutes a committed tree looked destroyed and was not. If two sessions
must run at once, give the second one its own git worktree. Check git branch --show-current and
node scripts/verification-status.mjs before and after committing.

Before you stop: the JOURNAL.md entry and this session's entry in docs/context.md, this prompt's Run line, and a
commit whose trailers bind the exact tree (document-only work is Verification: targeted with
node scripts/check.mjs --changed).
```
