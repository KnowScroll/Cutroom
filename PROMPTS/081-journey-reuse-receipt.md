# 081 — read the check-cost research and build the first lever

- **For:** session 88
- **Feature:** none. Checker and journey tooling: `scripts/check.mjs`, `scripts/journey.mjs`, and the new
  `scripts/_verification.mjs` and `scripts/test-receipt.mjs`. S-188
- **Work:** §4.0 of `docs/research/test_fixes_and_research.md` — the verification receipt, and a journey that
  reads it instead of re-running a suite at content that has not changed. §4.1 (biome) and §3 (the measurement
  pass) stay for later sessions
- **Written:** 2026-10-15, by the owner, in the session that ran it
- **Run:** session 88, 2026-10-15 — built as S-188: the receipt, `--documents`, exact-tree and document-delta
  reuse, `tests/check-receipt.test.ts` (22 checks), five S-188 cases in `tests/journey.test.ts`, twelve
  deliberate breaks each seen red and restored

```text
Read @docs/research/test_fixes_and_research.md and lets do this
```

**Two calls were the owner's, and were made in-session.** Asked how far reuse should go, the owner chose the
document-delta shape over exact-tree-only, having been shown that a chain of journeys commits an evidence line
between each one and so changes its own tree — exact-tree reuse alone would have saved nothing on the case the
research names as the expensive one. Asked whether to stop at the decision, the owner chose to build in the same
session.
