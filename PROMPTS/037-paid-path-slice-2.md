# 037 — paid-path: Slice 2

- **For:** session 37
- **Feature:** `paid-path` — [`docs/features/paid-path.md`](../docs/features/paid-path.md)
- **Work:** Slice 2 of 8 — keys, and the twentieth rule; checks 3, 4 and 21
- **Written:** 2026-09-20, at the end of session 36, after Slice 1 was green and S-116 to S-118 were recorded
- **Run:** session 37

Paste everything inside the block below as the session's first message.

```text
Build paid-path's Slice 2 — keys, and the twentieth rule. It proves checks 3, 4 and 21 of docs/features/paid-path.md.
NO ADAPTER IS BUILT IN THIS SLICE EITHER: the five real adapters are Slices 3 to 7. Nothing costs money and no test
needs a key.

Start:
1. Run `node scripts/decisions.mjs`. If it says commits are unpushed in the steering repository, say so and stop.
2. Read CLAUDE.md; then JOURNAL.md's session 36 entry in full — Slice 1 built apps/service, and it moved one file
   forward: S-117 put packages/providers/src/env.ts in Slice 1, because check 2 could not hold without it. THAT FILE
   ALREADY EXISTS. What is left of Slice 2 is the RULE that holds it there, and the two checks beside it.
3. Read docs/features/paid-path.md whole, and especially "The twentieth boundary rule" in Gate 2, "What this feature
   changes in verified features", and checks 3, 4 and 21.
4. Decisions, each read whole, in DECISIONS.md: S-109 (keys from the environment, read only in providers), S-117 (why
   env.ts landed early and what stayed here), S-111 (recorded wire in the suite, one hand-run reel outside it), S-116
   (the stand-in script file, which is the shape a recorded-wire fixture sits beside), S-078 (reel-stills' check 3
   counts the rules exactly), S-020 (the three resolver settings without which an npm rule goes silent), S-114 (no
   model SDK). In steering-ref/steering/DECISIONS.md: D-022 (what a provider hands back is a credential), D-005 and
   D-084 (the model client lives in providers).
5. Read the code this slice changes: .dependency-cruiser.cjs whole — the nineteen rules, the npm rules' flat
   alternations, and the options block's three load-bearing settings; scripts/drift.mjs, especially --prove's cases
   by file and by package name and --audit; tests/reel-stills-rules.test.ts (check 3, which says `19 rules proven to
   fire`); packages/providers/src/env.ts and tests/engine/service.ts.

What Slice 2 builds:
- `keys-only-in-providers`, the TWENTIETH rule in .dependency-cruiser.cjs: nothing outside packages/providers/src
  reads an environment variable whose name matches a key's shape. Decide and record HOW it is expressed — a
  dependency-cruiser rule resolves imports, and `process.env.FAL_KEY` is not an import, so the rule needs a shape it
  can actually see (a module that owns the read, imported only from providers) or a second mechanism beside it. THIS
  IS A REAL CHOICE BETWEEN ALTERNATIVES: write it as an S-entry with what was rejected, and do not let the rule read
  as coverage while matching nothing — `drift --audit` exists for exactly that failure.
- Its `--prove` violation, relative AND by package name, in the form the other nineteen use.
- reel-stills' check 3 counting TWENTY, by addition: the count, the rule list, nothing else in that check.
- `.dependency-cruiser.cjs`' comment on `model-client-only-in-providers` gains S-114 beside D-005. The rule, its
  from/to and its --prove violation are unchanged.
- The recorded-wire harness: tests/fixtures/wire/<provider>-<call>-<case>.json, and whatever serves one to an adapter
  that takes a `fetch` and a base URL (Gate 2, finding 3 of the gate review). No adapter uses it yet; check 3 is what
  makes it real.
- tests/paid-path-keys.test.ts and tests/paid-path-fixtures.test.ts — checks 3, 4 and 21, red first.

How to work:
- Check 3 needs a REAL adapter to have teeth — a stand-in reads no key, which is the gate review's finding 4. No real
  adapter exists until Slice 3. STOP ON THIS and ask the owner with AskUserQuestion before writing check 3: either a
  minimal real adapter arrives here (moving work out of Slice 3), or check 3 moves to Slice 3 beside the adapter it
  needs. A recommended option first, and record the answer as an S-entry. Do not write a check 3 that cannot fail.
- Never weaken a check or a test to reach green. The rule count is exact on purpose (S-078): it becomes twenty by
  ADDITION, and a rule that loses its prove cases must still fail that check.
- No absolute path anywhere (D-086). Every fixture is redacted before it is committed: check 21 reads them all.
- A choice between real alternatives becomes an S-entry with what was rejected and how a violation is caught. The
  next free number is S-119.
- Once green, run a break campaign as sessions 30 to 36 did — the runner in .tmp/campaign/ (move session 36's
  breaks.mjs and results.jsonl aside to s36/ first). Break at least: the twentieth rule deleted; its prove case
  deleted; the rule present but matching nothing; a key read from outside providers; reel-stills' check 3 still
  saying nineteen; a fixture holding a query string. Add a control caught by nothing. Record what each break was
  caught by, and fix — by ADDING — any break caught by nothing that a check's words promise to catch. Run the
  campaign inside one turn.
- Tick Slice 2 in docs/features/paid-path.md only when checks 3, 4 and 21 pass by number and check.mjs is green.

Do NOT in this slice: build a real adapter beyond whatever the owner's answer to check 3 allows; add any npm
dependency; write scripts/real-reel.mjs; make anything concurrent (S-115); run any journey — paid-path's is Slice 8's,
and reel-stills' re-run for the rule count is Slice 8's too (S-099's form).

Finish:
- `node scripts/check.mjs` green, with the new test count stated by a TAP count. NO journey.
- A JOURNAL.md entry: intent; what changed (files, S-entries, +N tests); observed — what was red first and why, the
  break campaign's table with what each break was caught by, anything caught by nothing and what was done; next.
- Set this prompt's Run line to session 37 in PROMPTS/037-paid-path-slice-2.md and in PROMPTS/README.md (S-065), and
  write PROMPTS/038 for Slice 3.
```
