# 082 — biome for code, prettier only on changed Markdown

- **For:** session 88, continued
- **Feature:** none. Checker tooling: `scripts/check.mjs`, `eslint.config.mjs`, `.prettierrc.json`,
  `.prettierignore`, `package.json`. §4.1 of `docs/research/test_fixes_and_research.md`
- **Work:** replace eslint + prettier for `.ts`/`.mjs`/`.json` with biome; keep prettier for Markdown but run
  it on changed files only. Measured target: the static total **30.3 s → ≈11 s**, and a documents-only run
  **≈15 s → ≈1.5 s**
- **Written:** 2026-10-15, session 88
- **Run:** session 88, 2026-10-15 — built as S-189 in the same session as S-188, at the owner’s word that
  everything should be done here; measurements in the entry and in the journal

```text
Read docs/context.md first, then §4.1 and §6 of docs/research/test_fixes_and_research.md, and S-188
(grep -n '^## S-188' DECISIONS.md) — the receipt and `--documents` are what your change has to keep working.

Build §4.1. One phase, this session.

What is already measured, so do not measure it again: lint 6.25 s, format 14.07 s over the whole tree (code
5.74 s, Markdown 7.00 s), tracked Markdown 3 674 527 bytes, prettier on two changed files 0.46 s. Our
`eslint.config.mjs` is `js.configs.recommended` + `tseslint.configs.recommended` + three rules and sets no
`parserOptions.project`, so NO type-aware lint rule is in use — that is the one thing biome cannot replace,
and it is why this is cheap. Biome does not format Markdown; prettier stays for `.md`.

Write the decision first: an S- entry choosing biome for code, naming what it rejects (keeping eslint +
prettier at ~20 s a run; biome for Markdown, which it cannot do; dropping the format check for code), and
the mechanism that catches a violation. List every eslint rule with no biome equivalent and either accept
the loss in writing or keep that rule — do not let a rule disappear silently. S-188's document-class set is
format + the four file scans + the two authority checks; if `--documents` stops naming the same checks,
`tests/check-receipt.test.ts` goes red, and that is a finding, not a test to adjust.

Three traps this repository has already paid for:
- The whole-tree reformat is a large mechanical diff. It is ITS OWN commit, separate from the checker change.
- `tests/check-changed.test.ts` copies `scripts/check.mjs`, `_lib.mjs` and `_verification.mjs` into a scratch
  repository and runs them there. A new import in check.mjs means another file in that list.
- Markdown-on-changed-files-only must still be able to fail. `prettier --check` over nothing is green for the
  wrong reason: decide what it runs on when git lists no Markdown, and test that case.

Verification: this is checker tooling, so S-177 makes it the full suite — and S-188 now means you owe it ONCE
at the committing tree. Run `node scripts/verification-status.mjs` first; if HEAD already carries full
evidence for its exact tree, do not repeat it.

Before you stop: the journal entry, this session's entry in docs/context.md, the Run line here, and the
before/after number from the same machine (§6 asks for it).
```
