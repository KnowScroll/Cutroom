# 052 — `resume-failed`'s gates, and the reviews real reels left

- **For:** session 52
- **Feature:** `resume-failed` (gates, on S-157's direction); P-003's, P-010's and P-011's reviews put to the owner
- **Work:** write `resume-failed`'s four gates and have them reviewed; put the three reviews to the owner; whether an
  overlay or diagram-shot feature gets its gates, if there is time. **`parallel-shots`' gates follow, in 053** — the
  owner's word in session 51.
- **Written:** 2026-09-25, at the end of session 51, from 051's text as it stood at commit `01982a8` (written in
  session 49 as 050 and carried twice), with its standing brought up to date
- **Amended:** 2026-09-25, session 52, before it ran, at the owner's word — _"if we retry a run we should be able to
  tell the system to regenerate the asset (with type) that is which asset we dont want reused"_: step 2 puts the
  pieces a caller names to be made again, and five questions about them, before the product gate
- **Run:** not yet

**Where things stand.** Session 51 built `check.mjs --changed` (S-159): documents alone are checked in about 13 s, code
still runs everything. It then made two reels at once, both outside the engine: a jet-engine reel from code alone and a
hurricane hybrid. The hurricane run `74bb96a0…` **completed on its first try**: 56¢, 10.9 minutes, every shot accepted on
its first take, and **Gate 7 answered yes to the caption question that stopped run `bf8f4444…` (P-011)**. P-011 stands:
one yes does not make a question that judges captions from 18 mostly silent frames sound. `docs/research/hyperframes.md`
holds both reels' timings and nineteen rules; the hybrid's long pole was the layers, not the engine.

Paste everything inside the block below as the session's first message.

```text
Write resume-failed's gates, then put the reviews real reels left to me.

1. `node scripts/decisions.mjs`. If it says commits are unpushed in the steering repository, say so and stop.
   Read CLAUDE.md, JOURNAL.md's session-50 and session-51 entries and docs/reel-pitfalls.md — its short list.
   `node scripts/check.mjs --changed` once (S-159): HEAD's code passed the full run before it was committed.
2. resume-failed: write its four gates in docs/features/resume-failed.md on S-157's direction — both the engine and
   the caller may start a resume, one in all; provider faults only; pictures Gate 1 accepted are kept; the caller sees a
   new run pointing back and the failed run stays failed. Settle what S-157 left for the gates: how the engine judges a
   failure a provider's (a closed list, and who names it — P-009's 504 is one), the new run's request and how it points
   back (D-094, D-099), what a clips-stage failure keeps (S-092 after a failure, not only a crash), and how ask-again's
   kept answers inform the judgement.
   The owner's addition (session 52): a caller asking for a resume may name pieces NOT to keep — made again though
   they passed their checks — as { kind: still | narration | clip, shot? }, no shot meaning every shot. The plan is
   not nameable: a new plan keeps nothing, which is a new request. Only the caller names pieces; the engine's own
   resume makes again only what failed. Before the product gate is written, put to me with AskUserQuestion:
   (a) the list itself, and that a named piece takes down everything made from it — a still or a narration its
   shot's clip (a clip's length is asked from its narration's measured seconds), any piece the cut and Gate 7 —
   worked out by the engine, never the caller, and shown with its estimated cost before anything is spent;
   (b) whether it stands outside S-157's provider-faults-only rule, since naming a piece overrules a check that
   passed, and whether it spends the one resume;
   (c) whether it may follow a gate's stop — Gate 7 refusing a cut whose clips all passed (P-011) is the strongest
   case, a shot at Gate 2's cap the weakest;
   (d) whether it may follow a completed run, or that is a feature of its own;
   (e) a field on reel-contract's resume call (D-094, D-099), or a flag on the owner's script only.
   Each answer an S- entry. Put every real choice to me. Have the gates reviewed by the gate-reviewer agent
   until approved or a finding needs me; use the test-impact agent for the amended-check list. Build only if all four
   are approved and there is time, slice by slice, each on a green check.mjs and broken deliberately.
3. The reviews, to me with AskUserQuestion, each with what docs/reel-pitfalls.md says of it:
   - P-003: a shot made from words has nothing to fall back on at its third failed take, so it stops the reel (S-090).
     Accept it, or give such shots a fallback.
   - P-011: Gate 7 stopped a correct cut on "Do the burned captions follow the narration?" — 13 of its 18 frames carry
     no caption; run 74bb96a0 was asked the same and said yes. Which fix gets its gates: the caption text shown to the
     judge, frames taken on words, or an exact comparison of the subtitles with the narration.
   - P-010: nano-banana-2 and seedream are admitted to the image registry but cannot make the exact frame. Drop them,
     or send them a size they honour.
4. If there is time: whether graphics over the clips (docs/research/hyperframes.md §4 F) or diagram shots (§4 C)
   becomes a feature with its four gates, from that file's two hybrid-reel sections, to me.

How to work:
- --changed between steps; the full check.mjs before committing code, and before a journey (S-159).
- Add every new pitfall to docs/reel-pitfalls.md, and keep its short list current.
- Before recommending a different model or provider, read its history in JOURNAL.md and DECISIONS.md (P-010).
- Brief-writing rules: each criterion a COMPACT thing, and each sentence too; no verb of vanishing or darkness; a
  criterion's claim carried only by sentences the criterion fits (P-008); no digit, symbol or acronym in a sentence;
  a tall subject is framed small (P-012).
- Never change a check or a test to reach green. Never raise the 250c ceiling. Never print a key or read .env.
- No absolute path in any committed file (D-086).
- Close out with a JOURNAL.md entry, this prompt's Run line set here and in PROMPTS/README.md (S-065), and
  PROMPTS/053 — parallel-shots' gates (S-115), on the figures in docs/research/hyperframes.md's session-51 section.
```
