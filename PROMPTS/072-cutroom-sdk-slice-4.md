# 072 — `cutroom-sdk`: Slice 4, journey and compatibility proof

- **For:** the next execution session
- **Feature:** `cutroom-sdk` (S-016, S-173, S-175, S-177, S-178)
- **Work:** complete the evidence-only final slice: SDK journey, then `reel-contract` re-journey
- **Written:** 2026-09-29, after Slice 3 corrective evidence was verified at `ae0599a`
- **Run:** not yet run

```text
Complete cutroom-sdk Slice 4 only. It adds no source, tests, contract, boundary rule, provider,
database, media, secret, or runtime behavior. Its deliverable is generated journey evidence.

1. Follow the repository startup order: decisions, drift, Journal tail, verification-status. Stop
   if the steering authority is newer. Confirm HEAD is clean and that ae0599a's Slice 3 evidence
   is still valid for its exact tree. Do not rerun a Slice 3 check as a preflight.

2. Read docs/context.md; docs/features/cutroom-sdk.md's Slice 0 impact record, Gate 4 and the
   explicit unchecked Slice 4 entry; S-016, S-173, S-175, S-177 and S-178; and
   scripts/journey.mjs. Reconfirm that the exact affected-feature list is reel-contract alone:
   ReadyResponse and Routes are public-contract additions; reel-plan was read-only; the sole
   resume-failed change was compile support, not an evidence amendment; Slice 2/3 affected only
   cutroom-sdk files and shared verification infrastructure.

3. Make the SDK eligible for judgment. Change only cutroom-sdk's Slice 4 checkbox from [ ] to [x].
   Do not change Status, Evidence, Divergence, source, tests, gates, timeouts, or re-journey list.
   Update JOURNAL.md, docs/context.md and this prompt's Run line for the session. Run
   node scripts/check.mjs --changed (document checks only), and commit this preparation tree as:

     docs(cutroom-sdk): prepare Slice 4 journey

   The tick commit must be clean before any journey starts. A document-only check does not replace
   a journey.

4. Run exactly once:

     node scripts/journey.mjs cutroom-sdk

   It performs the required full repository check and every tests/cutroom-sdk-*.test.ts file. Do
   not edit generated Evidence, Divergence or Status. On FAIL, commit the generated feature file
   as `docs(cutroom-sdk): journey FAIL at <input-commit>`, record the failure in Journal/context,
   run the document-only check, commit that bookkeeping, and stop. Do not re-run it or begin a
   re-journey.

5. On SDK PASS, commit the generated feature evidence alone as:

     docs(cutroom-sdk): journey PASS at <input-commit>

   Confirm the tree is clean. Then run exactly once:

     node scripts/journey.mjs reel-contract

   This is the sole compatibility re-journey, and it is serial because its evidence must name the
   completed SDK journey commit. On FAIL, commit its generated result as
   `docs(reel-contract): re-journey FAIL at <input-commit>`, write the required Journal/context
   finding, document-check and commit it, then stop.

6. On PASS, commit the generated result alone as:

     docs(reel-contract): re-journey PASS at <input-commit>

   Its full check is the final Gate 4 full-green proof. Do not run another aggregate suite on the
   unchanged tree. Update Journal/context and this prompt's Run line, run check.mjs --changed, and
   commit the documentation-only close-out. Confirm a clean tree. cutroom-sdk is verified only
   when its generated journey reports PASS; reel-contract retains its verified status with a new
   evidence line.

Stop at the first journey failure. Never weaken a check, change a timeout, amend a feature's
evidence by hand, widen the re-journey list, or start self-heal.
```
