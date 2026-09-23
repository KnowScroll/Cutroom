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

| what                                                                                    | kind   | from         | state                                         |
| --------------------------------------------------------------------------------------- | ------ | ------------ | --------------------------------------------- |
| **Re-ask a model once when its answer does not parse**, instead of failing the run      | fix    | P-001, P-004 | next session's work (owner, option 3)         |
| **Keep the raw answer of a model whose answer did not parse**, so it can be read        | fix    | P-004        | next session's work, with the line above      |
| **`resume-failed`**: a failed run keeps what was fine and remakes only what failed      | fix    | all four     | planned, five owner questions open            |
| Does S-042 (an answer that does not parse fails the run) still hold for real providers? | review | P-001, P-004 | owner; the re-ask above supersedes it in part |
| A text-made shot has no still to fall back on, so its third failed take stops the reel  | review | P-003        | owner: accept, or give such shots a fallback  |
| Clip prompts could ask for no fade to black; space scenes are mostly dark               | review | P-003        | watch: fix only if it recurs after the brief  |
| Brief-writing rules: compact subjects; no verbs of vanishing or darkness                | brief  | P-002, P-003 | applied; add to `PROMPTS/049`'s brief rules   |

## Open

### P-004 · provider · the picture witness answered a count as words, and the run failed

- **Run** `c9f3df47…`, 2026-09-24, black holes, shot 1's picture (the black sphere ringed by glowing gas).
- **What happened.** 61 s of planning, shot 0's picture accepted, then MiniMax-M3's witness answer for shot 1's picture
  did not parse: `entities.2.count: … expected number, received string`, and the same for entity 3. A witness answer
  that does not parse fails the run (S-042). 10¢ spent (two pictures), no `lost_call`. The answer itself is not
  stored, because it never parsed.
- **Cause.** The provider's answer. Likely, not proven: a space picture is full of things no one counts — stars, dust,
  particles — and the model wrote something like "many" where a number belongs. Shot 0's stored observation shows
  the witness describing "scattered background stars" as `count: 1`, so it copes sometimes.
- **Done.** Nothing to the brief yet; the owner is asked.
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
