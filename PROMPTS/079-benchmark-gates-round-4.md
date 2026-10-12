# 079 — the scoring half's gates: apply round 3, shrink to the split, round 4

- **For:** session 85
- **Feature:** `yield-benchmark` (`docs/features/yield-benchmark.md`), the scoring half only. `yield-compare` and
  `benchmark-view` are named stubs and are not worked on
- **Work:** shrink the feature to what S-184 leaves it, apply round 3's findings that belong to it, amend its
  checks and slices, send a fresh adversarial round 4. **No implementation file of any kind**
- **Written:** 2026-10-12
- **Run:** not yet

```text
Read docs/context.md first, then, in this order: docs/features/yield-benchmark.md whole, including its three
"## Gate review" sections; S-184 and then S-182 (grep -n '^## S-18[24]' DECISIONS.md, then each entry's lines) —
S-184 supersedes S-182's SCOPE and nothing else; docs/features/yield-compare.md and docs/features/benchmark-view.md,
the two stubs the split created; docs/features/run-provenance.md; docs/research/yield-baseline.md.
PROMPTS/077-benchmark-design.md is the prompt that started this feature.

WHERE THINGS STAND. Session 83 designed the benchmark, built none of it, and took its four gates through THREE
adversarial rounds without approval. Rounds 1 and 2 are recorded in the feature file with every finding applied.
ROUND 3'S TWENTY FINDINGS ARE NOT IN THE FILE — this prompt is their only record. Then the owner split the feature
in three (S-184), which removes a third of those findings from this file's problem and moves them to a stub.

THE SPLIT, SETTLED BY THE OWNER — "Yes the comparison is its own feature that is right, and also the visualization
also its own feature."
- yield-benchmark keeps: the pure packages/benchmark, the read-only scripts/benchmark.mjs, five part scorecards and
  their ratings, the run rating, the drill-down into one part of one run, the brief key, and the committed ledger.
  IT COMPUTES NO BAND AND REACHES NO VERDICT.
- yield-compare (docs/features/yield-compare.md, gates unwritten) takes: sides, per-unit rates, the two uncertainty
  bands, the four verdict words, the eight deciding measures, the credit guard, comparability and the fingerprint,
  the config mode where a declared difference is the axis, stratify, and the null comparison.
- benchmark-view (docs/features/benchmark-view.md, gates unwritten) takes the one self-contained HTML page, after
  the scoring half is BUILT.

WHAT THIS SESSION DOES, IN ORDER.

1. SHRINK docs/features/yield-benchmark.md to the scoring half. Delete its comparison material — the sides, the
   bands, the verdict, the comparability conditions, the fingerprint, and the measures that exist only to decide —
   and in its place put one short section saying what yield-compare owns and that the brief key is computed here so
   a run can be grouped there. Keep every scorecard field, every rating term, the reason families, the ledger, the
   fixtures and the three boundary rules. Renumber the checks and the slices, and keep "every check appears in
   exactly one slice" true with its arithmetic shown.

2. APPLY ROUND 3'S FINDINGS THAT STILL BELONG HERE. Each is real; each was verified against source by the reviewer.

   1. THE WORKED RATING VALUES ARE WRONG, and the check that pins them would be red on its own fixtures.
      "dead-on-first-picture = 10.0" is 19.0: the pictures part's second term is a share of THE PLAN'S SHOTS not
      degraded, whose denominator is non-empty for an admitted plan, and a run that died on its first image call
      wrote no degradation row, so that share is 1.0 and takes the full 0.3 — pictures 30.0, run 19.0. The
      Gate-1-stop fixture computes to 19.0 as well (every such run in the record cost 15c = three image calls:
      3 judged, 0 accepted, 0 degraded), so the two TIE and the ranking check fails. Recompute all four values and
      say which fixture each is computed over; if a fixture is taken from the record, its numbers must match the
      real rows.
   2. THREE COMPLEMENT TERMS PAY FOR WORK NEVER ATTEMPTED: pictures' "shots not degraded", clips' "shots not held
      at the take cap", cut's "no holds". A run that entered the video stage and made nothing scores clips 30 and
      cut 20. S-184 settles the rule that fixes the CLASS rather than the instances: EVERY RATING TERM IS PHRASED
      AS SOMETHING ACHIEVED OVER SOMETHING ATTEMPTED, never as an absence. Rewrite all five parts' terms that way,
      keep each part's weights summing to 1.0, and add the third convention: a yes/no term whose subject never
      existed inside a reached part is 0, not 1.
   3. THE FIVE PARTS DO NOT MAP ONTO THE ENGINE'S THREE STAGES. RunEvent's stage is plan | stills | video;
      narration, clips and the cut all live inside video, the clips job writes one video start and the assemble job
      writes none (118 starts = 52 plan + 43 stills + 23 video). So "a part is reached when its stage started" is
      undefined for three parts — which is where finding 2's free credit comes from — and the seconds for
      narration, clips and the cut are unsourced. State the part-to-stage/job mapping, define "reached" for those
      three from their own evidence (a narration row, a take row, a render row) or from the reel.clips and
      reel.assemble job rows, and correct the check's wording.
   4. benchmark-no-io AS SPECIFIED DOES NOT FORBID node:crypto, which is the only reason hashing moved to the
      reader. pipeline-no-io's enumeration already holds sqlite under both spellings and does not hold crypto.
      Enumerate this rule's own builtins in the gate — that list plus crypto, and say what else is in or out — and
      name the crypto case in the boundary check.
   5. THE BRIEF KEY IS HASHED IN THE READER'S SLICE WHILE ITS ONLY CHECK SITS IN THE PACKAGE'S SLICE. Either hand
      the package an injected hash function and keep the check where it is, or move the key's assertion into the
      reader's behavioural check against a temporary database. As written, one slice needs a later slice's code.
   6. THE LEDGER'S COLUMNS ARE STILL NOT ENUMERATED — this was claimed fixed in round 2 and was not. Enumerate
      them in order with each one's format, and say whether the read date and commit live in a row or in the file's
      header; if they live in a row, "byte-identical on a second scoring" is red.
   7. "FIVE PLACES ASSERT 22" IS FALSE; THERE ARE NINE. Also saying twenty-two: CLAUDE.md a second time (line 69,
      "Three of the twenty-two are between two folders of one package"), README.md:107,
      knowledge-transfer/02-repository-map.md:155, knowledge-transfer/11-development-workflow.md:76,
      knowledge-transfer/README.md:11, knowledge-transfer/cutroom-kt.html, and docs/features/hosted-checks.md:337.
      None turns a check red, but the repository would contradict itself. And name each test amendment precisely:
      tests/paid-path-keys.test.ts:139 asserts doesNotMatch(/21 rules proven to fire/), which guards nothing once
      the files say 25 — raise it to 22; the test titles at :115 and :130 say "twenty-two"; and
      tests/reel-stills-rules.test.ts:71-76 and tests/reel-render-rules.test.ts:111-115 carry comments naming each
      rule and its ordinal, which every prior count change extended (S-078, S-120).
   8. THE INHERITED-PIECE RULE CANNOT REACH DEGRADATIONS, HOLDS OR STILL-HOLDS: only picture, narration and take
      carry kept_from, and a resumed run WRITES A FRESH degradation row for a carried degradation
      (stills/index.ts's carried() and degrade()). Shots degraded feeds the pictures rating, so the double count
      reaches a rating term. State how an inherited degradation, hold or still-hold is recognised (the shot's last
      failing picture carries kept_from) and have the measures check assert that case.
   9. "THE PER-REEL CAP IS STORED NOWHERE" IS FALSE where it decided the ending: a budget-limited RunResult carries
      capCents beside estimateCents and ceilingCents, and the result is stored in run.result (run a08a9c9c, 231c).
      Say "recorded only in a budget-limited result, absent otherwise", and report it where it exists.
   10. THE ESTIMATE'S STATED EXCLUSIONS OMIT THE LARGEST ONE: beyond the reserve and narration it excludes every
       RETAKE and every lost call, which is most of the 40-51c estimate against 53-75c actual gap. The label is
       pinned by a check, so add them.
   11. THE OWNER'S "run on individual things" HAS NO INTERFACE, NO CHECK AND NO SLICE. Write one table of flags
       with their defaults and exit codes — the database, the output path, the ledger path, the run selector, the
       part selector, the blob/model-text flag, --rescore — and a check that asks for one part of one run. This is
       the owner's explicit requirement and currently unspecified.
   12. "EVERY OTHER REASON-WRITING SITE" IS INCOMPLETE: the run-ending detail composed in clips/index.ts (which
       embeds failed gates' reason strings verbatim), the word-timing detail, ladder.ts's "cannot be held" why, and
       the two Unanswered messages in gate1s.ts and gate7.ts that become a failed run's detail. A classifier fed
       those double-counts and the unknown-string finding fires on them. Add them, and say a detail string is
       never classified.
   13. TWO SMALLER ONES: tests/no-absolute-paths.test.ts covers tests/**/*.json but only for four home/volume
       shapes, so it enforces "no machine path", not "every artifact path is a placeholder" — add that assertion to
       a check of this feature. And S-178 is cited in the slices and missing from the Decisions: line.
   14. "Three worked values" heads four bullets that two checks call four. Say four.

   AND ONE OWNER CHANGE THAT STAYS HERE: delete the overclaim "No two of those 25 groups hold two runs on one
   engine version". It cannot be known — no row records an engine version, which is this feature's own finding.
   Replace it with what was measured: 5 of the 25 brief groups hold two or more runs whose fingerprints match, the
   largest matching set being five runs in group 4ce40e14; a verdict needs four matching runs in each of three
   groups, so none is available from history.

   THE FINDINGS THAT ARE NO LONGER THIS FILE'S PROBLEM, already recorded in docs/features/yield-compare.md's
   "What the gates must settle": the band's wording stated three ways and a factor of two apart; the credit guard
   missing a change that plans fewer or shorter shots; no verdict word for HURT; the arithmetic's pooling scope;
   the vacuous comparability conditions and the missing ceiling and planVaryOn; and the verdict's ambiguous unit
   with malformed sides. DO NOT solve them here. Check that each one really is in that stub before deleting it
   from this file — a finding that exists in neither document is a finding lost.

3. AMEND S-182 where the split moved its subject: its comparison clauses now belong to yield-compare, and S-184
   says so. Add nothing to S-182 that S-184 already carries; an amendment names what it supersedes in its own
   words, as this repository's entries do. If a rating term's PHRASING changes under finding 2, S-182's table
   changes with it and the amendment says why — the weights themselves do not move.

4. SEND A FRESH gate-reviewer FOR ROUND 4, on the scoring half alone. Hand it: the slug; the split and what it
   leaves out; this prompt's finding list as what was applied; and the measurements below, so it re-measures
   nothing. Tell it to verify each applied fix against source, to RECOMPUTE every worked rating value itself, and
   to be hardest on the rephrased rating terms, the part-to-stage mapping, the ledger's columns, the flag table,
   and whether anything of the comparison was left behind.

5. If it approves all four gates it edits only the Gates: line, and the session STOPS: building is its own session
   (CLAUDE.md, S-160's rule that a session is one phase). If it refuses, apply its findings and tell the owner
   plainly how many rounds have run — three have cost about 650,000 reviewer tokens — before starting a fifth.

MEASURED IN SESSION 83, read-only from data/cutroom.sqlite. Do not re-measure; do challenge any inference.
52 runs over 25 brief groups (the request minus requestId and options; largest 8, then 5, 4, 4, 4), every one
until: video. 43 selected plans, 132 pictures with all 132 files still on disk, 128 observations, 127
reconciliations, 118 takes, 95 narrations, 12 renders, 15 degradations, 3 lost calls, 10 refused answers; events 52
run.accepted, 52 run.finished, 118 stage.started, 74 stage.finished, 691 verdict, 16 degraded; jobs reel.plan 52,
reel.keyframes 43, reel.clips 23, reel.assemble 12, with attempts equal to row count in every kind, so no job has
ever been retried. job.cost_cents 2202c = generation_receipt 732c (5c x 108, 8c x 24) + video_receipt 1457c +
speech_receipt 0c + lost_call 13c; model_receipt has no cost column; transient_errors exists only on speech and
video receipts. Image calls per run min 2, median 4, max 6; cents per run min 10, median 20, max 39. Selected-plan
estimates 40-51c at today's rates (a 144-190c group predates S-155). Plan plus stills a median 294 s over 23 runs.
Subjects per shot from the selected plan agrees with the prompt's "It shows:" line on 132 of 132 pictures. Gate 1
reasons: 13 distinct shapes, all from reconcile — 45 clipping strings on 43 pictures, 28 must-not-show, 10
must-show, 8 count, 3 not-shown. Fingerprints: 5 of 25 brief groups hold two or more runs that match, the largest
set five runs in group 4ce40e14.

HARD LIMITS. No implementation file, no script, no package, no test, not even a throwaway — this session finishes
the gates. No engine behaviour changes. No check, timeout, bound, test or boundary rule is weakened, skipped or
made conditional. Do not write yield-compare's or benchmark-view's gates, and do not start picture-prompt, the paid
pass, run-provenance or the subjects-per-shot cap. Leave session 84's hosted-checks work alone
(docs/features/hosted-checks.md, docs/research/public-exposure-audit.md, S-183, .github/workflows/).

ONE ENVIRONMENT HAZARD, already paid for. Sessions 83 and 84 ran at once in one checkout and HEAD moved between
branches mid-work; for several minutes a committed tree looked destroyed and was not. If two sessions must run at
once, give the second its own git worktree. Check git branch --show-current and node scripts/verification-status.mjs
before and after committing.

Before you stop: the JOURNAL.md entry and this session's entry in docs/context.md, this prompt's Run line, and a
commit whose trailers bind the exact tree (document-only work is Verification: targeted with
node scripts/check.mjs --changed).
```
