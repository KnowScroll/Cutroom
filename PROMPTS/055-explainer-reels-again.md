# 055 — the two explainer reels again, video game graphics and JoJo's Bizarre Adventure, after a DNS check

- **For:** session 55
- **Feature:** none — the engine as verified, on real providers; `self-heal` (S-169) done by hand
- **Work:** the two reels `PROMPTS/054` asked for and session 54 did not make — brief B as it last ran, then brief A
  as approved — each run started only once fal's host resolves fast, every failure read from its rows, healed and run
  again until both complete; everything noted
- **Written:** 2026-09-26, at the end of session 54, at the owner's word: _"give me a prompt for a new session to
  continue or to make the reels that we are supposed to make"_. `resume-failed` moved to `PROMPTS/056`.
- **Run:** not yet

**Where things stand.** Session 54 ran brief B five times and made no reel, 126¢. Its first run stopped at Gate 5 on
two brief causes, both fixed in the criteria and no fact moved: the planner took the id `show-polygons` as a subject's
name and one screen failed the count rule (P-018), and hardware, screens and a city drew lettering (P-017). The next four
failed on the network. The last two were read to **this machine's DNS**: fal's host takes 11 s to look up, because the
DNS server never answers its IPv6 question, and `fetch` gives a connection 10 s (P-020). No brief and no engine change
can fix that, so this prompt checks it before every run instead of spending a run to find out. JoJo never ran.

**Before pasting, the owner's part.** Fix the DNS, e.g. set the network adapter's DNS server to 1.1.1.1 or 8.8.8.8,
then check that this prints well under 1000:

    node -e "const s=Date.now();require('dns').lookup('queue.fal.run',{all:true},()=>console.log(Date.now()-s))"

**No test and no code check.** The one file of code the session edits is `scripts/real-reel.mjs`' `request()` — the
caller's text (S-134) — and it goes back as HEAD has it at the end. One formatting pass on the documents before the
commit, about 20 s.

Paste everything inside the block below as the session's first message.

```text
Make the two real reels session 54 could not — fact-first explainers, not stories — and keep going until both are
made. Both briefs are at the end: B as it last ran in session 54, A as I approved it. No code changes, no tests, no
check.mjs code runs: only the engine running, and you healing each failed run.

1. `node scripts/decisions.mjs`; if it says commits are unpushed in the steering repository, say so and stop. Read
   docs/context.md first; then only docs/reel-pitfalls.md's short list (its rules are paid for — P-017 to P-020 are
   session 54's) and the "What the numbers say" section of docs/research/refusals.md. Read anything else only when a
   failure needs it. Session 54's runs are in JOURNAL.md's newest entry; read it by heading, not whole.
2. BEFORE EVERY RUN, check the lookup (P-020):
   node -e "const s=Date.now();require('dns').lookup('queue.fal.run',{all:true},()=>console.log(Date.now()-s))"
   Under 2000 ms: run. Over: do not run — check once a minute, in the background; if it has not come under 2000 ms in
   30 minutes, stop and tell me. Never change the machine's network settings yourself.
3. Put brief B (games) into request() in scripts/real-reel.mjs, word for word — the only code you edit. Then
   `node --check scripts/real-reel.mjs`, and in the background, with `spend 250` piped in:
   `node --experimental-strip-types --no-warnings scripts/real-reel.mjs --model fal-ai/flux-2-pro/edit --voice English_Graceful_Lady`
   Check the header says `pictures upToThree` and read the estimate. One run at a time (D-002), never two. Tell me each
   stage as it finishes, in a line. When B completes, brief A (JoJo) the same way.
4. HEAL EVERY FAILURE WITHOUT ASKING ME. Read why from the run's own rows — its log, `scripts/refused.mjs <run>`, and
   read-only queries of data/cutroom.sqlite, every one filtered by run_id (picture ids repeat across runs) — then:
   - a network error ("fetch failed", "did not reach the provider"), a provider's 5xx or 504, a model answer that is
     not JSON: check the lookup (step 2), then run again, unchanged;
   - a cause in the brief — a subject clipped by the frame, a subject the planner named that no picture shows, a count
     that does not match a subject's name, a criterion that does not fit a sentence its claim covers, a shot made from
     words that drifts, lettering, a character or a real person drawn: change the brief as little as it takes — the
     criteria and the wording, never the facts — and run again;
   - the same cause no brief can fix, three times on one reel while the lookup is fast: stop, and tell me.
   Never change engine code, a gate, a check or a test to get a reel through. Never raise the 250c ceiling; it is a
   constant --ceiling can only lower. Never print a key; never read .env.
5. NOTE EVERYTHING, every run: its id, cost by receipts, the time of each stage and each clip, the plan (units and
   subjects), which shots came from pictures, every refusal with its gate and reason as written, every retake,
   degradation and brief change and why, and the lookup's time before it. A cause not yet in docs/reel-pitfalls.md gets
   its P- entry and short-list row.
6. HAND EACH OVER: the finished file's full path under .artifacts/<runId>/, its length, cost and time, and a look at its
   frames (an ffmpeg contact sheet into the scratchpad) — what reads right and what does not.
7. Close out: both briefs as they completed, word for word, and every run in JOURNAL.md; the runs in docs/context.md's
   Runs table and this session's entry there (S-160); docs/research/refusals.md's counts and ledger brought up to date
   from the database; `git checkout -- scripts/real-reel.mjs`, so no code is committed; `node scripts/check.mjs
   --changed` once on the documents (formatting — no test); this prompt's Run line here and in PROMPTS/README.md
   (S-065); commit the documents. PROMPTS/056, resume-failed, is next.

The pictures show no actual character or real person from either work — a copyrighted character's likeness is not
generated, and models draw them badly. The names are spoken; the pictures are real places and objects. Every sentence
of a shot goes into its picture's prompt, so a name spoken can be drawn (P-019): if a picture is refused for a character
or a person, reword the criterion so it names a scene without them, and if the planner made the name a subject, reword
that sentence so the name is not what it shows, as the queen was in session 53 (P-016) — never a fact.

BRIEF B — how video game graphics evolved. Run it first. As it last ran in session 54 (runs cd9648c9 to fdff208b);
the criteria changed from the approved text after run a1cb6cfb (P-017, P-018), no sentence changed.
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
  show-screen (c2): "a screen showing only simple low-polygon three-dimensional graphics"
  show-card (c3): "an unbranded computer graphics card"
  show-monitor (c4): "an unbranded modern monitor showing a lifelike rendered city skyline"
mustNotShow, each type presence:
  never-person: "a recognisable real-world public figure"
  never-text: "written words or labels"
  never-character: "a recognisable character from a real video game, comic or anime"
depictionPolicyVersion: policy-3

BRIEF A — the canonical story of JoJo's Bizarre Adventure. Run it second. As I approved it; never run.
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
