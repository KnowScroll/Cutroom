# 054 — two explainer reels, video game graphics and JoJo's Bizarre Adventure, each run healed by hand until it completes

- **For:** session 54
- **Feature:** none — the engine as verified, on real providers; `self-heal` (S-169) done by hand
- **Work:** two fact-first reels from two briefs the owner approved in session 53, one after the other, every failed
  run read from its own rows, healed and run again until both complete; everything noted
- **Written:** 2026-09-25, at the end of session 53, at the owner's word: _"give me a prompt, keep in mind no need of
  redundant tests or anything enginie running only + self healing thing"_. `resume-failed` moved to `PROMPTS/055`.
- **Run:** not yet

**Where things stand.** Session 53 made two reels — tsunamis on its second run, honeybees on its sixth — and counted
every refusal of the 41 real runs in `docs/research/refusals.md`: 42% of pictures refused at Gate 1, 30 of 36 for a
subject clipped by the frame's edge; no clip made from a picture ever refused, 16 of 49 made from words. The owner then
asked for reels that **explain — facts, causes, simple words — not stories**, and chose two new subjects. The briefs
below are theirs as approved, word for word. A healer inside the engine is planned (S-169, after `resume-failed`); until
it exists, this session is the healer.

**No test and no code check** (the owner's word). The one file of code the session edits is `scripts/real-reel.mjs`'
`request()` — the caller's text (S-134) — and it goes back as HEAD has it at the end. One formatting pass on the
documents before the commit, about 13 s.

Paste everything inside the block below as the session's first message.

```text
Make two real reels from the engine as it stands — fact-first explainers, not stories — and keep going until both are
made. Both briefs are at the end, word for word, already approved by me. No code changes, no tests, no check.mjs code
runs: only the engine running, and you healing each failed run.

1. `node scripts/decisions.mjs`; if it says commits are unpushed in the steering repository, say so and stop. Read
   docs/context.md first; then only docs/reel-pitfalls.md's short list (its rules are paid for) and the "What the
   numbers say" section of docs/research/refusals.md. Read anything else only when a failure needs it.
2. Put brief B (games) into request() in scripts/real-reel.mjs, word for word — the only code you edit. Then
   `node --check scripts/real-reel.mjs`, and in the background, with `spend 250` piped in:
   `node --experimental-strip-types --no-warnings scripts/real-reel.mjs --model fal-ai/flux-2-pro/edit --voice English_Graceful_Lady`
   Check the header says `pictures upToThree` and read the estimate. One run at a time (D-002), never two. Tell me each
   stage as it finishes, in a line. When B completes, brief A (JoJo) the same way.
3. HEAL EVERY FAILURE WITHOUT ASKING ME. Read why from the run's own rows — its log, `scripts/refused.mjs <run>`, and
   read-only queries of data/cutroom.sqlite, every one filtered by run_id (picture ids repeat across runs) — then:
   - a network error, a provider's 5xx or 504, a model answer that is not JSON: run again, unchanged;
   - a cause in the brief — a subject clipped by the frame, a subject the planner named that no picture shows, a
     criterion that does not fit a sentence its claim covers, a shot made from words that drifts, lettering: change the
     brief as little as it takes — the criteria and the wording, never the facts — and run again;
   - the same cause no brief can fix, three times on one reel: stop, and tell me.
   Never change engine code, a gate, a check or a test to get a reel through. Never raise the 250c ceiling; it is a
   constant --ceiling can only lower. Never print a key; never read .env.
4. NOTE EVERYTHING, every run: its id, cost by receipts, the time of each stage and each clip, the plan (units and
   subjects), which shots came from pictures, every refusal with its gate and reason as written, every retake,
   degradation and brief change and why. A cause not yet in docs/reel-pitfalls.md gets its P- entry and short-list row.
5. HAND EACH OVER: the finished file's full path under .artifacts/<runId>/, its length, cost and time, and a look at its
   frames (an ffmpeg contact sheet into the scratchpad) — what reads right and what does not.
6. Close out: both briefs as they completed, word for word, and every run in JOURNAL.md; the runs in docs/context.md's
   Runs table and this session's entry there (S-160); docs/research/refusals.md's counts and ledger brought up to date
   from the database; `git checkout -- scripts/real-reel.mjs`, so no code is committed; `node scripts/check.mjs
   --changed` once on the documents (formatting, about 13 s — no test); this prompt's Run line here and in
   PROMPTS/README.md (S-065); commit the documents. PROMPTS/055, resume-failed, is next.

The pictures show no actual character from either work — a copyrighted character's likeness is not generated, and
models draw them badly. The names are spoken; the pictures are real places and objects. If the planner names a
character as a subject and its picture is refused, reword that sentence so the character is not what it shows, as the
queen was in session 53 (P-016).

BRIEF B — how video game graphics evolved. Run it first.
worldId: cutroom-game-graphics
style: id style-game-graphics, version 1, text "clean documentary footage, soft natural light, steady camera"
claims: c1 supporting, c2 supporting, c3 main, c4 main
narration, each sentence with its claims:
  1. "In nineteen seventy two, Pong was two paddles and a ball." — c1
  2. "By nineteen eighty five, Super Mario Bros drew whole worlds in pixels." — c1
  3. "Then games moved into three dimensions, built from polygons." — c2
  4. "In nineteen ninety nine, Nvidia's GeForce two fifty six was sold as the first graphics processing unit." — c3
  5. "It lit and moved every triangle itself, freeing the main processor." — c3
  6. "In twenty eighteen, Nvidia brought real time ray tracing to games." — c4
  7. "It follows each beam of light as it bounces through a scene." — c4
  8. "Deep learning now fills in detail, so games look almost like film." — c4
mustShow, each type presence:
  show-tv (c1): "an old television showing blocky pixel game graphics"
  show-polygons (c2): "a screen showing simple low-polygon three-dimensional graphics"
  show-card (c3): "a computer graphics card"
  show-monitor (c4): "a modern monitor showing a lifelike rendered city scene"
mustNotShow, each type presence:
  never-person: "a recognisable real-world public figure"
  never-text: "written words or labels"
  never-character: "a recognisable character from a real video game, comic or anime"
depictionPolicyVersion: policy-3

BRIEF A — the canonical story of JoJo's Bizarre Adventure. Run it second.
worldId: cutroom-jojo
style: id style-jojo, version 1, text "clean documentary footage of real places and objects, rich natural colour, steady camera"
claims: c1 supporting, c2 supporting, c3 main, c4 main
narration, each sentence with its claims:
  1. "JoJo's Bizarre Adventure is Hirohiko Araki's comic, running since nineteen eighty seven." — none
  2. "Each part follows a new hero of the Joestar family, each called JoJo." — none
  3. "In Victorian England, a stone mask turns Dio Brando into a vampire." — c1
  4. "Jonathan Joestar fights him with the Ripple, breathing that carries the power of sunlight." — c2
  5. "A century later, his descendant Jotaro defeats Dio in Egypt." — c3
  6. "That part brings Stands, fighting spirits shaped by each person's will." — none
  7. "Later parts move to Japan, Italy and Florida, until the universe resets." — none
  8. "Part seven starts a new universe, telling the family story again." — c4
mustShow, each type presence:
  show-mask (c1): "an ancient carved stone mask"
  show-sun (c2): "the sun rising through morning mist"
  show-pyramids (c3): "the pyramids of Giza, seen from a distance"
  show-galaxy (c4): "a bright spiral galaxy"
mustNotShow: the same three as brief B.
depictionPolicyVersion: policy-3
```
