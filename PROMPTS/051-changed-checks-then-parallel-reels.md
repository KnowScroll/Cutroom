# 051 — time: checks chosen by what changed, then two reels made at once — one from code alone, one hybrid

- **For:** session 51
- **Feature:** none for the reels — both are spikes outside the engine (CLAUDE.md rule 1); `check.mjs --changed` is a
  trivial fix with its `S-` entry
- **Work:** `check.mjs --changed`; then a standalone Hyperframes reel and a hybrid reel made at the same time, each one
  in parallel inside, every phase timed against session 50's. **`resume-failed`'s gates and the P-003, P-010 and P-011
  reviews move to 052. `parallel-shots` is still held.**
- **Written:** 2026-09-24 at the end of session 49 as 050, on `resume-failed`; carried to 051 at the end of session 50;
  rewritten before it ran, on 2026-09-25, at the owner's word: _"optimize for time, test both (standalone and hybrid)
  with parallel method"_
- **Run:** not yet

**Where things stand.** Session 50 made the first hybrid reel — volcanoes, the engine's footage of run `bf8f4444…` with
labels, lines that follow the picture and one diagram shot drawn over it by Hyperframes — and left its tools in the
ignored `.artifacts/hyperframes-volcanoes/`: `make.mjs` (a page per scene from the run's render manifest), `join.mjs`
(the engine's one pass rebuilt, one `overlay` input per layer) and `shared/` (the drawing kit). The rules both reels
found are in `docs/research/hyperframes.md`: five from the CPU reel, seven from the hybrid.

**Session 50's baseline — what this session is timed against** (UTC, from file times and transcripts):

| reel                      | request → finished file | where the time went                                                                                                                                                                    |
| ------------------------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CPU reel, code only       | 31.7 min                | one thread wrote six scenes one after another; 66 model calls, 23.3 M tokens, 114 k out                                                                                                |
| Volcano hybrid            | 67 min                  | 13 min of full `check.mjs` before the first run; 17 min through three failed runs; the engine run 13.1 min; layers done 10.3 min after its render; 131 calls, 36.8 M tokens, 230 k out |
| Checks, the whole session | ~20 min                 | three full runs, about 17 min of them re-testing code nothing had touched                                                                                                              |

Paste everything inside the block below as the session's first message.

```text
Optimize for time: build check.mjs --changed, then make two reels at once — one from code alone, one hybrid —
each made in parallel inside, and time every phase against session 50.

1. `node scripts/decisions.mjs`. If it says commits are unpushed in the steering repository, say so and stop.
   Read CLAUDE.md, JOURNAL.md's session-50 entries, docs/reel-pitfalls.md's short list, and
   docs/research/hyperframes.md — its CPU-reel and hybrid-reel sections and their twelve rules. Session 50 left HEAD
   green and changed only docs after: no check.mjs before step 2.
2. check.mjs --changed, a trivial fix (one script and its test). Its S- entry first: checks chosen from
   `git diff --name-only` against HEAD — code (packages/, apps/, tests/, the scripts the tests read, the configs) runs
   every check; docs, the journal and the prompts run format, the authority checks and the repository-wide scans;
   ANY path the mode does not recognise runs everything. Rejected: the full run every time; no checks for docs.
   Caught by: a test that a change under packages/ or tests/, and an unknown path, each select every check. Update
   CLAUDE.md's "Before claiming anything is done" to say when --changed is enough and when the full run is required
   (before committing code, and before a feature's journey). One full check.mjs to close this step.
3. Put to me with AskUserQuestion, in one call: the two subjects — a STANDALONE reel (animated diagrams only, like the
   CPU reel) and a HYBRID reel (the engine's footage with labels and one diagram shot, like the volcanoes), three
   suggestions each — and which model the scene-writing subagents run on (sonnet, faster and cheaper; opus, as
   session 50). Then show me the hybrid's brief, kept to the brief-writing rules below, and wait for my yes.
4. Set up once: Hyperframes 0.8.71 and gsap 3 in this session's scratchpad (npm), telemetry off, the cached
   chrome-headless-shell 152 under ~/.cache/hyperframes named in HYPERFRAMES_BROWSER_PATH. Copy session 50's tools
   from .artifacts/hyperframes-volcanoes/ (make.mjs, join.mjs, shared/) into two new folders under .artifacts/.
5. Start the long pole first: commit the hybrid's brief, take the no-spend look, start the engine run in the
   background (flux-2-pro/edit, `spend 250`). While it runs, in parallel:
   - the standalone reel: its narration through the repository's narration adapter, as the CPU reel's was made, with
     the word timings re-joined where MiniMax splits them (P-001); then ONE SUBAGENT PER SCENE, all at the same time,
     each handed the kit, its scene's words and timings, the style and the twelve rules; the main thread runs
     `hyperframes check` on each, reads each contact sheet, fixes what fails, and renders;
   - the hybrid's diagram shot, drafted on draft word timings and retimed from the manifest once the run renders.
6. The hybrid's layers: as each shot's accepted clip appears in the run's folder, a subagent reads that clip's frames
   (a contact sheet with a pixel grid) and writes its layer — never wait for the whole run. A line into a clip
   follows the clip's motion and leaves before its cut; a fact about the world is a card with no line to the footage.
7. Render every composition at once, dividing Hyperframes' workers across them. Join the hybrid with join.mjs and the
   standalone with one concat pass; measure both as session 50 did — the frame count against the manifest, Gate 2's
   scan, loudness.
8. Time and count everything: the wall clock of each phase (brief, engine run, each scene's authoring, renders, joins,
   checks), and the tokens of the main thread and every subagent, from this session's transcripts, as session 50
   did. Put the table beside session 50's baseline in the research file and the journal: which parallelism paid off,
   and which did not.
9. Put to me: whether parallel-shots (S-115) gets its gates next — the engine's one-shot-at-a-time video stage is the
   long pole now.

How to work:
- Both reels are spikes outside the engine: no implementation file for them (rule 1); their media stays under
  .artifacts/ (rule 4). If the engine run fails on a provider fault, say so and ask before running it again. If Gate 7
  stops the cut on its caption question (P-011), use the run's pieces and say so.
- --changed between steps; the full check.mjs before committing code.
- Before recommending a different model or provider, read its history in JOURNAL.md and DECISIONS.md (P-010).
- Brief-writing rules: each criterion a COMPACT thing, and each sentence too; no verb of vanishing or darkness; a
  criterion's claim carried only by sentences the criterion fits (P-008); no digit, symbol or acronym in a sentence.
- Never change a check or a test to reach green. Never raise the 250c ceiling. Never print a key or read .env.
- No absolute path in any committed file (D-086).
- Close out with a JOURNAL.md entry, this prompt's Run line set here and in PROMPTS/README.md (S-065), and
  PROMPTS/052 — resume-failed's gates and the P-003, P-010 and P-011 reviews, from this prompt's text as it stood at
  commit 01982a8.
```
