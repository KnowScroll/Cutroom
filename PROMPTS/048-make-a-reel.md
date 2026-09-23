# 048 — make the reel the owner describes, and hand it over

- **For:** session 48
- **Feature:** none — `scripts/real-reel.mjs`' brief is the caller's request (S-134): no gate, no check moves
- **Work:** the owner describes a reel in plain words; turn it into a brief, show it, run it on real providers, hand
  back the file. Repeat for as many reels as the owner asks for. **`parallel-shots` is still held.**
- **Written:** 2026-09-23, at the end of session 47 (replacing the earlier 048, all of whose work session 47 finished)
- **Run:** session 48, 2026-09-24 — four runs of one brief (black holes), none finished, 93¢

**Where things stand.** Session 47 finished everything the earlier 048 asked for: `paid-path` is verified with fal's
own figures read (S-154); real reels make up to three pictures by default (S-153); fal video is priced at 0.5¢ a
second, a wide margin over what fal bills (S-155). Two real reels exist, both through Gate 7 — `f895e76d…` from words,
and `436564c1…`, the first made from approved pictures (S-152). **A reel now estimates 18–53¢; fal bills about 1¢.**

**How long a reel takes, measured (session 47, three real runs):**

| run         | plan  | pictures            | clips and their checks                                      | end to end      |
| ----------- | ----- | ------------------- | ----------------------------------------------------------- | --------------- |
| `f895e76d…` | 111 s | none (0 s)          | 337 s, 4 clips, each on its first take                      | **7.5 min**     |
| `a08a9c9c…` | 98 s  | 205 s, 3 made       | 422 s, then stopped at its ceiling (S-151)                  | 12 min, no reel |
| `436564c1…` | 81 s  | 240 s, 3 + 1 repair | 1331 s, one retake, one slow clip (259 s), a loaded machine | **27.5 min**    |

**Expect 10–25 minutes a reel**: about 1.5 min to plan, 3–4 min for pictures, and 1.5–2 min a clip with its checks —
more for every retake or repair, and much more when other programs hold the CPU (close heavy ones first; S-153).

Paste everything inside the block below as the session's first message, then describe the reel you want.

```text
I want to make real reels to test the engine. I will describe each one in plain words. For each:

1. `node scripts/decisions.mjs` (once). If it says commits are unpushed in the steering repository, say so and stop.
   Read CLAUDE.md and JOURNAL.md's last session-47 entries; `node scripts/check.mjs` once, green before anything.
2. TURN MY DESCRIPTION INTO A BRIEF — the `request()` function in scripts/real-reel.mjs, the caller's own text
   (S-134): no gate, no check, no policy moves. Keep what that function's comments say was learned the hard way:
   - EIGHT narration sentences (never fewer than six: the plan is cut into 4 and 6 units), spoken at a calm pace so the
     whole reel lands in 35-45 seconds; each sentence carries one claim id, two sentences a claim, four claims.
   - One mustShow criterion per claim, ONE SIMPLE THING each — what must be seen, nothing about how it sits in the frame
     ("seen whole within the frame" made things worse), and nothing a text-made clip cannot show (S-151: "a closed
     handwritten logbook on a shelf in a daylit archive" failed twice; "a shelf of old bound logbooks in daylight"
     passed).
   - FOUR DIFFERENT SCENES — different place, object and time — so Gate 7's "does every shot show something new?"
     stays yes (session 45's refusal, S-145). Pictures come anyway: up to three a reel (S-153).
   - No criterion may REQUIRE a person; keep mustNotShow's "a recognisable real-world public figure" (S-134).
   - A new requestId and worldId each time; style text from my description or "quiet, precise, natural light".
3. SHOW ME THE BRIEF — the eight sentences and the four criteria — in plain words, and wait for my yes. Change it
   if I ask.
4. RUN IT: commit the brief, then `node --experimental-strip-types --no-warnings scripts/real-reel.mjs --model
   fal-ai/flux-2-pro/edit --voice English_Graceful_Lady`. Check the header says `pictures upToThree`, read the
   estimate (about 18-53c), and type `spend 250`. Run it in the background and tell me each stage as it finishes.
5. HAND IT OVER: the finished file's full path under .artifacts/<runId>/a1-render.mp4, its length, what it cost by our
   receipts, which shots came from pictures, and every retake or repair and why. If it did NOT finish, say exactly
   where and why, from the run's own rows, and what one change to the brief would most likely fix it — do not rerun
   without my yes. A run that fails partway has already spent: read its receipts and lost_call rows first.
6. Keep a short list in JOURNAL.md of every reel: runId, my description, cost, time, finished or not, and why.

How to work:
- Never change code, a check or a test to make a reel pass — only the brief. If a reel keeps failing for a reason the
  brief cannot fix, stop and tell me: that is a finding for a feature, with its gates, not a patch.
- Never raise the 250c ceiling; it is a constant --ceiling can only lower.
- Never print a key and never read .env to show one.
- No absolute path in any committed file (D-086); the paths you tell me in chat are fine.
- Close out with a JOURNAL.md entry, this prompt's Run line set here and in PROMPTS/README.md (S-065), and PROMPTS/049.


Description : A reel that explain to the person how Black holes work, how they come into existance and how they work, what types of black holes exist. I need it to show visuals of the black hole and interactions, what it is made of ,etc. It should be animated (not super animated but a on a line between real and animated). Dont go into high details but surface level for a 50s reel.
```
