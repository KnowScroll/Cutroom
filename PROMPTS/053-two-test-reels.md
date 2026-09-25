# 053 — two real reels on the engine as it stands, on two harder subjects, and no code touched

- **For:** session 53
- **Feature:** none — the engine as verified, tested on real providers
- **Work:** two informative reels, one after the other, each from a brief the owner approves; what each cost, how long
  it took, and what ended it
- **Written:** 2026-09-25, at the end of session 52, at the owner's word: two reels before `resume-failed`'s build,
  which moved to `PROMPTS/054`, and no checks run, since no code changes
- **Run:** not yet

**Where things stand.** The engine makes a reel from a brief for about 55¢ against a 250¢ ceiling (D-014): a plan
(MiniMax), up to three pictures (fal, `flux-2-pro/edit`), clips (fal, `minimax-h3-turbo`), narration (MiniMax speech)
and one ffmpeg cut, judged by Gates 0 to 7. The last run, `74bb96a0` (hurricanes), completed first try in 10.9
minutes. Of the twelve runs since the black-holes world, two completed. The known ways a reel still ends early — a
provider's 504 (P-009), Gate 7's caption question (P-011), a tall subject clipped (P-012) — are in
`docs/reel-pitfalls.md`; nothing is fixed for them yet, so a run can stop on one of them, and that stop is a finding.

**No check.mjs and no test in this session** (the owner's word): no code changes. The one file of code the session
edits is `scripts/real-reel.mjs`' `request()` — the caller's text (S-134) — and it is put back as HEAD has it at the
end, so no code is committed. The briefs are kept in JOURNAL.md word for word.

Paste everything inside the block below as the session's first message, with the two descriptions at the end edited
if you want other subjects.

```text
I want two real reels from the engine as it stands, to keep testing it. Informative, but told as a story rather than a
lesson — a hook, a surprise, plain words. Harder subjects than before: each one a process with several stages and
moving parts. The two descriptions are at the end.

Do NOT run scripts/check.mjs or any test in this session: no code changes. The only code you edit is request() in
scripts/real-reel.mjs.

1. `node scripts/decisions.mjs`. If it says commits are unpushed in the steering repository, say so and stop.
   Read docs/context.md first, then CLAUDE.md; open docs/reel-pitfalls.md's short list and the comments inside
   request() in scripts/real-reel.mjs — they are the brief-writing rules, each one paid for.
2. FOR EACH DESCRIPTION, WRITE A BRIEF in request(), keeping every rule its comments give:
   - EIGHT narration sentences, spoken at a calm pace so the reel lands in 35-45 seconds; four claims, each carried
     by the sentences its criterion fits (P-008) — a sentence may carry none.
   - No digit, symbol or acronym in a sentence (P-001). No verb of vanishing, fading or darkness (P-003).
   - Every subject COMPACT, in the sentences too — "the island", never "the islands" (P-002); a tall or long subject
     framed small or from a distance (P-012).
   - One mustShow criterion per claim, ONE SIMPLE THING each, nothing about how it sits in the frame, nothing a
     text-made clip cannot show (S-151).
   - FOUR DIFFERENT SCENES — different place, object and time of day — so Gate 7's "does every shot show something no
     other shot repeats?" stays yes (P-006).
   - No criterion may require a person; keep mustNotShow's "a recognisable real-world public figure" (S-134).
   - A new requestId and worldId each; style from my description.
3. SHOW ME BOTH BRIEFS — the eight sentences and the four criteria each — in plain words, and wait for my yes. Change
   them if I ask.
4. RUN THEM, ONE AFTER THE OTHER (one worker, one job at a time — D-002; never two runs at once). For each:
   `node --check scripts/real-reel.mjs` (a free syntax read), then
   `node --experimental-strip-types --no-warnings scripts/real-reel.mjs --model fal-ai/flux-2-pro/edit --voice English_Graceful_Lady`
   in the background. Check the header says `pictures upToThree`, read the estimate, and type `spend 250`. Tell me
   each stage as it finishes. While the first runs, put the second brief in request() — the running process has
   already read its own.
5. HAND EACH OVER: the finished file's full path under .artifacts/<runId>/, its length, what it cost by our receipts,
   the time of each stage and of each clip, which shots came from pictures, and every retake or repair and why. If it
   did NOT finish: exactly where and why, from its own rows — the run-reader agent — and the one change to the brief
   most likely to fix it. Do not rerun without my yes. A run that stops partway has already spent.
6. Compare the two with run 74bb96a0: time, cost, retakes, what the gates said.

How to work:
- Never change code, a check or a test to make a reel pass — only the brief. A reel that fails for a reason no brief
  can fix is a finding for a feature, with its gates: write it in docs/reel-pitfalls.md and tell me.
- Never raise the 250c ceiling; it is a constant --ceiling can only lower. Never print a key, never read .env.
- No absolute path in any committed file (D-086); the paths you tell me in chat are fine.
- Close out: both briefs word for word, each run's row and every new pitfall in JOURNAL.md; the runs in docs/context.md's
  Runs table, and its entry for this session (S-160); then put scripts/real-reel.mjs back as HEAD has it
  (`git checkout -- scripts/real-reel.mjs`), so no code is committed. `node scripts/check.mjs --changed` once on the
  documents alone — about 13 s, no code check. Set this prompt's Run line here and in PROMPTS/README.md (S-065), and
  commit the documents. PROMPTS/054 is next and already written.

Description 1: How a honeybee swarm chooses its new home. Half the colony leaves with the old queen and hangs from a
branch; scouts fly out and search hollow trees; each scout dances on the swarm to argue for the site it found; the
best site wins more dancers until the scouts agree, and the whole swarm lifts off and flies there. Realistic nature
footage, close and warm, summer light.

Description 2: How a tsunami crosses an ocean. A sudden lift of the sea floor far offshore; in deep water the wave is
barely a ripple under a ship, yet it moves as fast as a jet; as the sea gets shallow near the coast it slows and grows
tall; the water at the beach first pulls far back and exposes the sand, and then the wave arrives. Realistic, calm,
wide views from above and from the shore, daylight, no people in danger shown.
```
