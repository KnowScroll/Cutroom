---
status: current
authority: record of what real reels ran into, not a plan
---

# Reel pitfalls — what real reels ran into, kept to fix later

The owner asked on 2026-09-24 (session 48) for a running list of the pitfalls and issues real reels hit, so they can be
fixed later. **Nothing here binds.** A fix to the engine is a feature with its gates, and a choice is an `S-` entry in
`DECISIONS.md`; a fix to a brief is the caller's text (S-134). Newest first. Each entry: the run, what happened, the
cause as far as it was read from the run's own rows and files, what was done, and what could fix it for good.

Kinds: **brief** — the brief's wording caused it, and the brief can avoid it; **provider** — a provider answered badly;
**engine** — the engine's own behaviour, fixable only by a feature.

## To fix, and to review — the short list

Kept current as entries are added. **Fix** is work that is understood and waits for a feature's gates; **review** is a
question to look at, or an owner's choice, before anything is built.

| what                                                                                    | kind   | from         | state                                            |
| --------------------------------------------------------------------------------------- | ------ | ------------ | ------------------------------------------------ |
| **Three scenes of one kind of picture**: Gate 7 refuses the cut as repetitive           | review | P-006        | owner: rewrite the brief, or review Gate 7       |
| **Show the witness the shape the gate judges it by** — one copy, in contracts           | done   | P-004, P-005 | `ask-again`, verified; held on run 12a097bf      |
| **Ask again, told why**, when a witness, plan, score or reconcile answer is refused     | done   | P-001, P-004 | `ask-again`, verified; one second ask, parsed    |
| **Keep the raw answer of a model whose answer did not parse**, so it can be read        | done   | P-004        | `scripts/refused.mjs <run>`                      |
| **`resume-failed`**: a failed run keeps what was fine and remakes only what failed      | fix    | all four     | direction settled (S-157); gates next            |
| Does S-042 (an answer that does not parse fails the run) still hold for real providers? | review | P-001, P-004 | answered: S-156 supersedes it in part            |
| Gate 1S's and Gate 7's adapter shapes are built per call — are they shown their rules?  | review | P-005        | `ask-again` Deferred 2                           |
| A text-made shot has no still to fall back on, so its third failed take stops the reel  | review | P-003        | owner: accept, or give such shots a fallback     |
| Clip prompts could ask for no fade to black; space scenes are mostly dark               | review | P-003        | watch: fix only if it recurs after the brief     |
| Brief-writing rules: compact subjects — in the SENTENCES too; no verbs of darkness      | brief  | P-002, P-003 | P-002 recurred through sentence 5 (run 12a097bf) |

## Open

### P-006 · brief · three of four scenes are one kind of picture, and Gate 7 refuses the cut as repetitive

- **Run** `12a097bf…`, 2026-09-24 (session 49), black holes, the brief as committed, after `ask-again`.
- **What happened.** The whole reel was made: plan 83 s (Gate 0 accepted both plans); pictures for shots 0 and 1
  accepted first time — **shot 1 is P-004's picture, and its witness answer parsed on the first ask**; shot 2's picture
  and its repair refused (P-002 again, below), so it was made from words; shot 3 had no picture (up to three). **All
  four clips passed Gates 2–5 on their first take.** The cut, 49.2 s, then **failed Gate 7**: the judge answered no to
  _"Does every shot show something no other shot repeats?"_ — every other question yes. **45¢**, 10.9 min, no
  `lost_call`. The file is kept: `.artifacts/12a097bf-…/a1-render.mp4`.
- **Cause.** The brief's own subject. The witness described shots 1, 2 and 3 alike — _"black circle; glowing ring of
  light"_, _"central celestial object; swirling ring of light"_, _"spiral galaxy; dark central object; glowing ring"_.
  Claims c2, c3 and c4 each picture a black hole with glowing gas around it; the judge is right that three shots repeat
  one image. The same tension as S-145 and S-148, from the other side: here nothing recurs by name, and the pictures
  recur anyway.
- **Done.** Nothing; no rerun without the owner's yes.
- **For good.** Brief: each scene a different KIND of picture — the explosion; the black sphere; the star being torn,
  seen from far, as a comet-like smear rather than a ring; a whole galaxy from outside, with nothing ringed at its
  centre. Or review whether Gate 7's repetition question should hold a topic reel whose subject is one kind of thing.

### P-002 recurred · brief · the long subject came back through a SENTENCE

- **Run** `12a097bf…`, shot 2. c3's criterion was made compact in session 48, but sentence 5 still reads _"…is
  stretched into a long thin stream"_, and **the planner named the subject from it: "Tidal Stream of Star Gas"**. The
  picture and its repair were each refused by Gate 1 — the stream clipped by the frame's edge — and the shot was made
  from words, which then passed Gates 2–5.
- **For good.** The brief-writing rule reaches the narration too: a sentence names what the planner will draw. And the
  repair's witness answer was the one refused answer of the run — _"small background stars"_ counted `"many"` — asked
  again, told why, and parsed (`scripts/refused.mjs 12a097bf`): `ask-again` doing its job.

### P-005 · engine · the witness was shown a looser shape than the gate judged it by

- **Found** 2026-09-24 (session 49) by `ask-again`'s first gate review, reading the code behind P-004.
- **What happened.** The MiniMax adapter asked the witness with its OWN copy of the observation's shape
  (`packages/providers/src/minimax/model.ts`, `observedEntity`): `count` any integer, `label` possibly empty, no
  strict object. The gate parses under `count > 0`, a non-empty `label` and strict objects. The closed sets matched,
  which is what S-144's check read; the constraints did not.
- **Measured** (0¢, the real witness, P-004's two pictures, four asks each): the adapter's copy was refused **3 of 8**
  times — all on reel 4's picture, the background stars counted **−1, "many", −1** ("too many to count"); the gate's
  schema, **0 of 8**, the same stars counted 1, 100 or 150. The first raw witness answers anyone has read.
- **Cause.** Two copies of one shape, because `packages/providers` cannot import the pipeline's schema. S-139's
  lesson — the answerer never sees the constraint it is judged by — on a number rather than a closed set.
- **Done.** The owner chose one copy, in `packages/contracts` (S-156): `ask-again`'s Slice 1.
- **For good.** Any adapter-held shape a gate parses under is the same finding waiting: Gate 1S's and Gate 7's are
  built per call at the gate, and stay the adapter's (`ask-again` Deferred item 2).

### P-004 · provider · the picture witness answered a count as words, and the run failed

- **Run** `c9f3df47…`, 2026-09-24, black holes, shot 1's picture (the black sphere ringed by glowing gas).
- **What happened.** 61 s of planning, shot 0's picture accepted, then MiniMax-M3's witness answer for shot 1's picture
  did not parse: `entities.2.count: … expected number, received string`, and the same for entity 3. A witness answer
  that does not parse fails the run (S-042). 10¢ spent (two pictures), no `lost_call`. The answer itself is not
  stored, because it never parsed.
- **Cause.** The provider's answer. Likely, not proven: a space picture is full of things no one counts — stars, dust,
  particles — and the model wrote something like "many" where a number belongs. Shot 0's stored observation shows
  the witness describing "scattered background stars" as `count: 1`, so it copes sometimes.
- **Recurred** on run `c52d418a…` (reel 4, the brief unchanged, the owner's option 3): the witness's answer for shot 1's
  picture again — `entities.2.count: Too small: expected number to be >0`, a count of 0 — at 160 s, 15¢. **Two runs, the
  same shot, two different malformed counts.** Both pictures, read by eye, are good: a black disc in a bright ring of gas
  on a starfield. So it is this kind of picture, not chance — likely an entity the witness lists as there but
  uncountable (the dark centre, the starfield) — and still not provable without the raw answer.
- **Held, session 49.** On run `12a097bf…` shot 1's picture parsed on its first ask, under the gate's own shape.
- **Read, session 49.** The cause is P-005: the witness was shown a shape that allowed −1 and 0; its answers,
  measured, counted the uncountable stars −1 or "many". Shown the gate's shape, 0 of 8 refused.
- **Done.** Nothing to the brief: it cannot fix a model writing the wrong type. Reels stopped; the fix is
  `PROMPTS/049`'s feature, the owner's choice.
- **For good.** The brief cannot reliably stop a model writing a word for a number. Engine options, each a feature:
  ask the witness once more on an answer that does not parse (as a provider's transient fault is); or keep the raw
  answer of a failed parse, so the next one of these can be read rather than guessed. And `resume-failed` would have
  kept the plan and shot 0's picture. **Second provider-answer failure in three runs** (P-001) — the pattern is: one bad
  answer from a model fails a whole run.

### P-003 · brief + engine · a sentence that asks for darkness makes a clip that ends in black

- **Run** `879a27b7…`, 2026-09-24, black holes, shot 2.
- **What happened.** All three text-made takes failed Gate 2 on black frames near their end (0.9 s; 2 s plus 1.3 s
  frozen; 0.7 s, all after 11.6 s). A frame read at 12.9 s of take 2 is entirely black. With no approved picture to hold
  (P-002), the reel stopped at rule `gate-2` (S-090). 53¢ spent.
- **Cause.** Sentence 6, _"That gas swirls inward, glowing hot, before it disappears for good."_ The video model acted it
  out and faded the swirl to nothing. Gate 2 reads black as a broken clip, which is right for a broken clip and wrong for
  a fade the narration asked for.
- **Done.** Sentence 6 reworded: _"…in a bright spiral."_
- **For good.** Brief-writing: no verb of vanishing, fading, darkness or ending in a sentence (disappear, vanish, fade,
  go dark). Engine, if it recurs: the prompt a clip is made from could ask for no fade to black, or the space subjects'
  prompts could ask for a lit frame — a feature, with its gates. Gate 2's threshold is NOT the fix (never weaken a
  check).

### P-002 · brief · a long subject in a tall frame is clipped by its edge, and the picture is refused

- **Run** `879a27b7…`, 2026-09-24, black holes, shot 2.
- **What happened.** _"a star stretched into a long glowing stream"_ — the picture and its repair each drew a stream
  crossing the whole 9:16 frame corner to corner, and Gate 1 refused both: `subject "stream" … is clipped by the edge of
the frame` (D-046). The shot degraded to words (D-050), which left it nothing to hold when its clips failed (P-003).
- **Cause.** A subject whose shape is long cannot sit whole in a tall frame. The same rule refused five-subject pictures
  in session 45.
- **Done.** c3's criterion is now _"a star being torn into a bright swirl of glowing gas"_ — compact.
- **For good.** Brief-writing: each criterion names a COMPACT thing — a sphere, a swirl, an object — never a stream, a
  line, a road, a river, a horizon.

### P-001 · provider · MiniMax repeated a word in its word timings, and the run failed

- **Run** `ee63e617…`, 2026-09-24, black holes, shot 0's narration.
- **What happened.** `speech-2.8-hd`'s word timings for _"…many times heavier than our Sun. When its fuel…"_ gave
  _"Sun."_ twice, at the sentence boundary. The adapter's join fell back to raw sub-word tokens (38 for 26 words), the
  stage's parse refused them (S-070), and a narration that does not parse fails the run (S-042). 15¢ spent, all three
  pictures accepted and thrown away.
- **Cause.** The provider's answer. Earlier reels spoke two sentences a shot and parsed, so it is this text, or chance.
- **Done.** Sentence 1 reworded to end _"…far heavier than our own."_; the next run's narrations all parsed.
- **For good.** If it recurs on other text: a narration whose timings do not parse could be asked for once more before
  the run fails — a feature. And `resume-failed` (`docs/features/resume-failed.md`) would have kept the plan and the three
  pictures.

## Across runs

- **A failed or stopped run throws away everything it made** — `resume-failed`, planned.
- **A shot made from words has no still to fall back on**, so its third failed take stops the reel (S-090) where a
  pictured shot would be held.
