# JOURNAL

The operational journal stays short. Sessions 01–64, including their full reasoning and raw verification notes,
are preserved byte-for-byte in [the historical journal](docs/history/JOURNAL-through-session-64.md). Read that
archive only by its session heading. New entries state the decision, commit/evidence reference and next action;
feature files, commit messages and verification trailers carry the durable detail (S-177).

## 2026-09-29 — session 68, `cutroom-sdk` Slice 2 review corrections committed

**Decision.** Correct three review findings and one housekeeping gap from Slice 2: explicit `redirect: 'manual'`
on every SDK fetch; the public-surface test references all six exported SDK types; `normaliseLoopbackOrigin`
accepts explicit `:80` while still rejecting no-port origins; `PROMPTS/065` is staged and committed. Full reasoning,
four finding bullets, observed numbers and amended-test list live in the appended archive entry below.

**Next.** Commit the corrections alone with `Verification: targeted`, `Verification-Tree: <exact tree>`,
`Verification-Tests: tests/cutroom-sdk-routes.test.ts tests/workspace.test.ts tests/boundaries.test.ts`;
run `node scripts/verification-status.mjs` against the committed tree; do not begin Slice 3.

## 2026-09-29 — session 68, `cutroom-sdk` Slice 3 handoff written

**Decision.** `PROMPTS/069-cutroom-sdk-slice-3.md` is the next-session handoff: explicit launcher configuration,
bounded strict readiness polling, fixed-port race joining, and creator-owned stdin shutdown only. It starts from
Slice 2 correction commit `45b9de9`, whose tree `143d0bc4f3054ecacf854b8f5ff32a3c5a3d36b9` has valid targeted evidence.
Full reasoning lives in the appended archive entry below.

**Next.** Session 69 runs `PROMPTS/069-cutroom-sdk-slice-3.md`; it must not begin Slice 4's journey or re-journeys.

## 2026-09-29 — session 69, `cutroom-sdk` Slice 3 complete

**Decision.** Build `PROMPTS/069-cutroom-sdk-slice-3.md`: explicit launcher, bounded readiness polling, fixed-port
race joining, and creator-owned stdin shutdown. Starting authority `45b9de9` with evidence-bound tree
`143d0bc4f3054ecacf854b8f5ff32a3c5a3d36b9`. Full reasoning, three implementation bugs and observed numbers live in
the appended archive entry below.

**Next.** Slice 4 (journey and re-journeys) is unstarted. Do not begin it in this session.

## 2026-09-29 — session 70, `cutroom-sdk` Slice 3 corrective evidence

**Decision.** Repair the incomplete Slice 3 correction on top of `3ee3ffc` without beginning Slice 4. The prior
`416c977` verification remains valid for its own tree; this correction requires new full evidence because it changes
runtime behavior, boundary configuration, and `drift --prove`.

**Evidence.** `node scripts/check.mjs` green at this commit; trailer `Verification: full`, `Verification-Tree` is the
tree the trailers bind. Exact affected tests: `tests/cutroom-sdk-launcher.test.ts`, `tests/cutroom-sdk-routes.test.ts`,
`tests/cutroom-sdk-readiness.test.ts`, `tests/boundaries.test.ts`, `tests/paid-path-keys.test.ts`,
`tests/reel-render-rules.test.ts`, `tests/reel-stills-rules.test.ts`. Full reasoning and observed numbers live in
the appended archive entry below.

**Next.** Stop after the correction is evidence-bound. Slice 4's journey and re-journeys remain unstarted.
