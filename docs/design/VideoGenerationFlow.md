---
status: fully ratified — S-1…S-6 are D-023…D-026, D-029, D-030; see also D-027, D-028, D-031…D-072
note: the gates cluster was specified on 2026-09-11 — D-041…D-053. D-046 moved D-031's vetoes out
  of the score into Gate 1, so §1's L2 block and O-16 below are amended in place; the score formula
  no longer carries a veto factor. D-049 adds **Gate 1S**, the set-consistency gate, which four
  ratified decisions already depended on and which appeared nowhere in this flow.
note2: **L5 ASSEMBLE was specified on 2026-09-12 — D-054…D-059, and the `UNDECIDED` marker is gone.**
  One ffmpeg pass, no concat, no segment cache (D-054); one conformed output profile (D-055);
  **O-8 answered — one progressive MP4, no HLS** (D-056); the shot is the sync unit and narration is
  per shot (D-057); Gates 7 and 8 run on the assembled file and cannot spend (D-058); the **render
  manifest** is the assembler's only input, and it is a different document from L1's **keyframe
  manifest** (D-059). The **sources end card** — binding since D-008 — appeared in no earlier version
  of the L5 or L6 block and is now in both.
note3: **L0 and the plan layer were reopened and extended on 2026-09-12 — D-061…D-076.** The reel is
  now planned **twice**: two complete storyboards differing on one declared axis, filtered by a new
  **Gate 0** (text, deterministic, no model call) and ranked by a **plan score** whose model terms
  are Gate 7's own questions — so a badly shaped reel dies at **$0** instead of at Gate 7 after
  $2.20. Only the winner generates. L0 gained a defined **style contract**, lost **"beats"**, and
  moved to its own feature `reel-script` with research in scope end to end; the **epistemic layer
  lives inside this engine**. Prompt composition is now **two compilers and one refusing validator**
  at the provider boundary. **D-073…D-076 followed the same day**, opening `reel-script`: prose
  crosses and a splitter module cuts the units, the reel's truth state is its weakest claim's,
  research has its own R-gate ladder, and research spends outside the per-reel cap.
authority: none — steering/DECISIONS.md is the authority for anything ratified here
date: 2026-09-10
project: KnowScroll video generation flow (harness working name: Cutroom)
scope: Design only. No implementation and no paid generation authorized by this document.
---

# Video generation flow — what is decided so far

**Read this first.** Everything in §2 was agreed in conversation on 2026-09-10. Under
`CLAUDE.md` ritual 3, a choice is not a decision until it is a `steering/DECISIONS.md` entry
with `Rejected` and `Confirmed-by`.

| | Status |
|---|---|
| **S-1, S-3, S-4, S-6** | **ratified 2026-09-11 as D-023, D-024, D-025, D-026** — binding |
| **S-5** | ratified as **D-029** (2026-09-11), amended: tiers collapsed, selection ranked under a cap |
| **S-2** | ratified as **D-030** (2026-09-11), amended: best-of-2 on the canonical only, not per shot |
| also | **D-027** Config A scoped to Phase 1 · **D-028** image model is a registry, not a hardcoded slug |

This file remains the reasoning, not the authority. Where it and `steering/DECISIONS.md`
disagree, the decision file wins — including where a ratified entry has since been superseded.

**Companion files.** `contentions.md` holds what must never break (invariants), what is still
genuinely open (contentions), what will bite us (traps), and the full cost and latency model
behind every number quoted here. This file is what was decided; that one is what is unsettled.
`multi-reel-pipeline.md` covers how *many* reels are made — batching, supply, and why money
rather than speed turns out to be the binding constraint.

§5 records a conflict between an early version of these choices and binding decision **D-014**.
It was **resolved by S-5** later the same day, by keying keyframes to subjects rather than to
shots. The history is kept because the arithmetic that caused it is the reason S-5 has the shape
it has.

---

## 1. The flow, end to end

```
L0  INPUT           brief · claim-referenced script · STYLE CONTRACT
                    ("beats" is gone — a beat IS a narration unit IS a
                     shot, 1:1 by D-057; a third name for one thing  D-070)
      ── produced by `reel-script`, A SEPARATE FEATURE, and research  D-066
         is in scope end to end: SERPdive primary · Exa as the second
         index for opposition · Jina fetch · source snapshots    D-010
         it hands over THE WHOLE SCRIPT — prose, claimRefs, sources,
         truth state — not opaque refs                            D-067
         it hands over PROSE, NOT NARRATION UNITS                 D-073
         the SPLITTER is its own module inside the engine, called
           by the planner WITH A TARGET UNIT COUNT — which is what
           makes D-062's `shotCount` axis work: the same words cut
           four ways or six, so two storyboards stay comparable
           never splits a sentence · never orphans a claimRef ·
           deterministic · drift-enforced
         the reel's TRUTH STATE is its WEAKEST claim's, computed  D-074
           by code, and the record names the claim that set it
         reel-script has its OWN gate ladder, R-1..R-3           D-075
           R-1 sourcing · R-2 rights + untrusted content — both
           deterministic · R-3 opposition, one model call
         research SPENDS OUTSIDE the $3.00 per-reel cap, under   D-076
           its own ceilings — §4's figures are GENERATION ONLY
      ── STYLE CONTRACT: text only in Phase 1 — palette · look ·     D-069
         era · camera language. Held PER WORLD, per-reel override.
         No image bible: Config A's four calls are all spoken for.
         It is the only thing carrying a world's look ACROSS reels;
         D-029's canonical is scoped within one reel
                    │
      ── EPISTEMIC LAYER — INSIDE the engine, not in reel-script   D-067
         computes claim-derived mustShow FROM THE SCRIPT, by code,
         never hand-authored twice
         mustNotShow = STANDING DEPICTION POLICY ∪ per-reel        D-068
           additions · policy is versioned and recorded per reel
         boundary to the cinematic layer enforced by `pnpm drift`  D-034
           — THAT EDGE DOES NOT EXIST YET and two decisions need it
                    │
L1  PLAN            TWO storyboards, not one — two complete keyframe    D-061
                    manifests for one brief, each from its own
                    structured call (D-035 intact: it forbade SPLITTING
                    one manifest, not producing two)
                    they differ on ONE DECLARED AXIS, closed enum     D-062
                      `shotCount` · `order` · `canonicalSubject` · `angle`
                      both calls at temperature 0, so a difference that
                      is not declared cannot exist — D-032 one layer up
                    ONLY THE WINNER REACHES L2. No second keyframe,
                    no second clip, no second anything                D-061
                    │
      ╔═ GATE 0 ═══ the storyboard gate — TEXT, and NO MODEL CALL   D-063 ╗
      ║   runs on EACH storyboard, before Gate 1                           ║
      ║   rejects on four countable conditions:                            ║
      ║     1. a claim in the script with no shot that shows it            ║
      ║     2. an epistemic criterion weakened or removed          D-034   ║
      ║     3. shape — outside 4–6 shots, ~40 s, duration 5–15 s   D-019   ║
      ║     4. estimated cost above $3.00 — I-1's pre-flight, now           ║
      ║        derived from a real plan instead of a config figure         ║
      ║   everything worth rejecting a PLAN for is countable, so a model   ║
      ║   here would invert I-7 for no gain — and it keeps the BLIND       ║
      ║   witness away from a brief comparison it cannot make (I-8)        ║
      ║  FAIL → not ranked. Both failing is the zero-survivor path.        ║
      ╚═════════════════════════════════════════════════════════════════════╝
                    │
      ── THE PLAN SCORE ranks survivors, never admits (I-16)        D-064
         countable terms: claim coverage · subject recurrence, which
           predicts keyframe economy BEFORE anything is generated
         model terms: GATE 7's OWN QUESTIONS — beat order, pacing,
           juxtaposition, repeated information — asked of EACH
           storyboard INDEPENDENTLY, never compared (D-031's closed
           dead end stays closed), temperature 0, by the RECONCILER
           and never the blind witness
         zero survivors → ONE informed repair call → the reel fails  D-047
         GATE 7 STILL RUNS AT L5 — this is a second use of one question
           list, not a promotion: Gate 7 judges the RENDERED file,
           where the conform, the burned captions and the mix exist
         the loser is RECORDED with its verdict and score and is
           NEVER a fallback — promoting it would spend past D-047's
           $0.45 floor on a reel already going badly              D-065
         weights unmeasured, in config, needs M-1 — as O-16 is
                    │
                    the SELECTED manifest continues:                     S-5
      ── CINEMATIC LAYER authors: shot count · order · camera ·     D-034
         duration · framing · which subject appears where
         may ADD criteria, never weaken an epistemic one
         ranking + `varyOn` computed by CODE, never by the model
                    each shot carries acceptance criteria written NOW:
                      mustShow · mustNotShow · textPolicy · audioPolicy
                      duration · camera (MiniMax's closed enum)        D-033
                    every criterion is typed by its own SHAPE          D-043
                      `presence` — a thing is/is not in frame → checked
                        at the KEYFRAME and the clip
                      `event`    — something happens over time → clip only
                      mustNotShow is always `presence`
                      not a field anyone authors: a free `checkAt` flag
                      would let a layer weaken the early check by routing
                    the manifest names every distinct subject and which
                    shots reference it — props declared here, never later
                    JSON, schema-validated; the canonical entry declares
                    `varyOn` — the one axis the two prompts differ on  D-032
                    ── briefs are tests: written before generation ──
                    │
L2  KEYFRAMES       built as a POOL, before shots are allocated             D-029
                    subjects ranked by shot count; floor >= 2 shots;
                    the topic competes like any other subject
                    │
      ── IMAGE PROMPT COMPILER composes here                       D-071
         renders the manifest entry twice on D-032's `varyOn`, and
         applies the STYLE CONTRACT (D-069) to both
                    │
                    ├─ CANONICAL · rank 1, best-of-2                   2 calls
                    │    two renderings of ONE manifest entry, differing
                    │    only on the declared `varyOn` axis            D-032
                    │    BOTH candidates go through GATE 1 first; the
                    │    score ranks SURVIVORS ONLY and never admits
                    │    winner picked by score, higher wins           D-031
                    │      SUM(w_i * normalise(param_i))   — no veto factor:
                    │      the vetoes are GATE 1 conditions now        D-046
                    │      terms are READ from Gate 1's verdict; the
                    │      scorer makes no vision call of its own      D-045
                    │      reference quality outranks composition (T-8)
                    │    zero survivors → ONE informed repair call (not a
                    │      pair) → if that fails too, the reel fails    D-047
                    │    IS frame 1 of its own shot, AND the reference
                    │    the derived frames are composed from   (tiers collapsed)
                    │         │
                    │         ▼  image model composes
                    ├─ DERIVED · next-ranked subjects, one each        2 calls
                    │    each IS frame 1 of a real shot
                    │
                    └─ everything else · text-to-video, aspect_ratio 9:16  $0
                         solid/black backgrounds are ffmpeg `color`,       $0
                    plan 4 calls · ceiling 6 · 2 held in reserve      D-027
                    a declared state change PLANS 5, holding only 1;
                    the canonical repair has first claim on it        D-048
                    max tree depth 1 — no grandchildren               D-038
                    a lineage reference is paid for by the reel that
                    generated it; reuse downstream is $0              D-040
                    │
      ╔═ GATE 1 ═══ FOUR steps, not three — same ladder as Gates 2→5,  D-042 ╗
      ║   run on ONE still instead of many frames:                          ║
      ║     technical → text → blind witness → RECONCILE vs the brief       ║
      ║   the reconcile step is what was missing: nothing compared the      ║
      ║   observation to the manifest entry, so a keyframe of the WRONG     ║
      ║   subject passed and died at the $0.32 clip, not the $0.15 image    ║
      ║   it checks the `presence` criteria only — an `event` criterion     ║
      ║   cannot be satisfied by a still at all                       D-043 ║
      ║   the two vetoes are FAILURE CONDITIONS here, not score terms D-046 ║
      ║   witness runs at temperature 0, so the score it feeds replays D-045║
      ║  FAIL → regenerate the KEYFRAME only. Never reaches the clip stage. ║
      ║  (D-014 already mandates "keyframes judged before animating")       ║
      ╚═════════════════════════════════════════════════════════════════════╝
                    │
      ── the verdict carries a STRUCTURED `WitnessObservation`, not prose,
         and carries it on `accept`, not only on failure               D-041
         ONE witness, not two — same contract, model, blindness and
         temperature; only the INPUT differs, a still here and the
         whole clip at Gate 4. No separate name for the still case:
         a "lighter" name would describe a weaker gate, and what is
         smaller is the input                                          D-053
         one type for still and clip; the temporal block (`actions`,
         `eventOrder`) is simply absent on a still
         entities[]: label (the witness's OWN words — it is blind, I-8) ·
           count · position · prominence · faceVisible · occluded ·
           clippedByEdge (the witness answers this, not a detector) D-044
         plus framing · setting · lighting · readableTextPresent ·
           ambiguities · unsafeDepictions
                    │
      ╔═ GATE 1S ═ SET CONSISTENCY — the first check ACROSS the pool  D-049 ╗
      ║   runs at L2 once every frame has passed Gate 1 individually        ║
      ║   compares each DERIVED frame to the CANONICAL, for identity        ║
      ║   of the subject they share — the canonical is the reference        ║
      ║   they were composed from, so it is what drift is measured against  ║
      ║     stage 1  DINO/CLIP cosine RANKS SUSPICION — never rejects       ║
      ║     stage 2  one grid model call ADJUDICATES, closed questions      ║
      ║   embeddings cannot reject alone: two honest shots of one subject   ║
      ║   differ in pose and framing, so cosine drops with nothing wrong    ║
      ║   EXCLUDES declared FLF2V pairs — without it every state-changing   ║
      ║   reel fails its own gate (T-2)                                D-037║
      ║   suspicion threshold in config, provisional, needs M-1             ║
      ║  FAIL → repair from reserve if free; else DISCARD the frame and     ║
      ║         that shot falls back to t2v, degradation recorded     D-050 ║
      ║         the reel does not fail · Gate 5 remains the backstop        ║
      ╚═════════════════════════════════════════════════════════════════════╝
                    │
      ── CLIP PROMPT COMPILER — compose HERE, not at L1              D-033
         inputs: manifest entry (brief · camera enum · duration)
               × GATE 1's recorded observations of the gated keyframe
               × the style contract                                  D-069
         no second vision call · a retry also consumes the failed verdict
         TWO compilers, one for images and one for clips, because they  D-071
           take different inputs at different moments — merging them
           gives one function with half its inputs absent every call
      ── AND ONE VALIDATOR, at the PROVIDER BOUNDARY                 D-071
         every outgoing provider call passes it. It REFUSES:
           · a prompt missing D-008's negative audio block
           · a `text-to-video` call without `aspect_ratio: 9:16`
         a template is bypassed by the next call site someone writes —
         a repair, a retry, a Phase 2 branch — and BOTH failures are
         silent: the output still generates and only looks wrong.
         D-019 called the missing field "the trap that would have
         shipped a 16:9 clip into a 9:16 product"
      ── MiniMax's MULTI-SHOT GRAMMAR IS NOT USED in Phase 1         D-071
         `[Shot 1]` · `[Shot 2] At 00:03.500, the camera cuts to…` ·
         strictly increasing times · the closed cut-verb list — all
         documented in the research and all inapplicable, because
         D-023 makes ONE CLIP EXACTLY ONE SHOT. Written down so it is
         not implemented from the research by mistake
      ── `prompt_expansion_mode` is REQUIRED and fal rewrites our     D-072
         prompt server-side. Record `expanded_prompt` AND the mode
         used; configure the least-rewriting value the endpoint takes
         — which nobody has read yet, O-20. The expansion reaches NO
         gate: criteria are authored before generation (I-9) and the
         witness observes the clip (I-8), so an expansion can only
         waste a take, never argue for its own output
                    │
L3  CLIPS           join mode declared per reel: `cut` (default) or    D-036
                    `chain` · chains are SEQUENTIAL last-frame in
                    Phase 1 — ffmpeg extracts, ZERO image calls —
                    re-anchor after 3 hops · parallel FLF2V parked
                    for Phase 2 (6 junction frames = ceiling, 0 reserve)
                    a declared discrete state change pins BOTH ends    D-037
                    with `end_image_url` · +1 image call
                    │
                    shots in parallel · i2v from gated keyframes,
                    t2v where no keyframe, aspect_ratio 9:16          S-1, S-6
                    receipts record `expanded_prompt` — fal rewrites  D-033
                    ║ narration (T2A, D-008) + captions run in parallel ║
                    ║ ONE T2A call PER SHOT, word-level timestamps —    ║
                    ║ the narration unit never spans a shot      D-057  ║
                    ║ five calls of a fifth of the script cost what one ║
                    ║ call of the whole script costs: T2A bills by char ║
                    │
      ╔═ GATE 2 ═══ technical — ffprobe, blackdetect, freezedetect,          ║
      ║             silencedetect, ebur128 ─────────────── <1 s, FREE       ║
      ╠═ GATE 3 ═══ text (OCR) · audio (ASR + music/speech) ──── 1–5 s      ║
      ╠═ GATE 4 ═══ witness — vision model, BLIND to the brief ── 2–10 s    ║
      ║             sees the WHOLE CLIP as video, not sampled frames  D-051 ║
      ║             M3 takes video_url inline <=50 MB · frames stay the     ║
      ║             recorded fallback · coverage.strategy says which ran    ║
      ║             `full` means the clip was SUPPLIED whole, never that    ║
      ║             the model attended to every frame — I-6                 ║
      ╠═ GATE 5 ═══ brief — reconcile witness observations vs L1 ─ 1–3 s    ║
      ║             runs EVERY criterion — `presence` and `event`      D-043║
      ╚═════════════════════════════════════════════════════════════════════╝
                    │  FAIL → S-3 retry ladder, then S-4 fallback
                    │
L4  SELECT          score handover frames · set anchors · pick best accepted
                    take · ops → new Cut version
                    │
      ╔═ GATE 6 ═══ continuity — identity/space/motion across joins ─ 1–5 s ═╗
      ╚═════════════════════════════════════════════════════════════════════╝
                    │
L5  ASSEMBLE        ONE ffmpeg pass over the whole timeline            D-054
                    no segment cache · no concat · nothing stream-copied
                    (captions burn over every shot, so segmentation
                     would save no encode and would import 07-BUILD
                     §1.5's seam problem to buy a cache priced in
                     wall-clock — which D-015 values at $0)
                    the timeline, in order:
                      clip | still-hold (D-025) | t2v (D-050), per shot
                      + burned ASS captions, from the shot's own T2A
                        word timings                              D-008
                      + audio: H3 ambience ducked under narration D-008
                      + the SOURCES END CARD — binding since D-008
                        and named in no earlier version of this block
                    every input CONFORMED from ffprobe, never assumed:
                      one output profile for every Phase 1 reel   D-055
                      MP4 · H.264 · AAC · 9:16 @768P · faststart
                      `fps` does not exist on any fal H3 endpoint,
                      and output geometry is undocumented — so the
                      literal values are config, settled by M-7
                    the shot is the SYNC unit                     D-057
                      one narration unit per shot, never spanning a
                      boundary — schema-enforced at L1
                      span = max(narration, picture) · tail-trim is
                      ordinary · a final-frame hold is DEGRADATION,
                      recorded with its seconds                     I-4
                      a duration shift is contained in its own shot;
                      nothing downstream desynchronises
                    O-8 ANSWERED — ONE PROGRESSIVE MP4              D-056
                      no HLS, no fMP4, no .m3u8 in Phase 1: offline
                      generation leaves nothing to play progressively
                      and 768P alone is no ladder. `07-BUILD` Q22's
                      Android/Media3 premise is UNRATIFIED — its own
                      source calls itself "not a decision". MP4 plays
                      natively on both candidate clients; HLS on one
                    │
      ╔═ GATE 7 ═══ cut — whole sequence: beat order, pacing, juxtaposition,║
      ║             caption/narration alignment ────── one model call       ║
      ╠═ GATE 8 ═══ custom — ks:epistemic (KnowScroll plugin)               ║
      ║   BOTH run on the ASSEMBLED FILE, after L5, before publish    D-058 ║
      ║   NEITHER CAN SPEND. Repair vocabulary is a closed enum of edit     ║
      ║   ops — reorder · retime · recaption · reselect-take (an already    ║
      ║   accepted take) — each re-runs L5 and re-runs these gates          ║
      ║   no provider call may follow the reel's first assembly: the cap    ║
      ║   was enforced pre-flight (I-1) and a gate that reopens L3 makes    ║
      ║   the reel's cost a judgment made after the money is gone           ║
      ║  FAIL with no edit that fixes it → label the reel, publish nothing  ║
      ║   Gate 7 CHECKS alignment; D-057 ESTABLISHES it — the encoded file  ║
      ║   is the only place a conform or a hold could have moved it         ║
      ╚═════════════════════════════════════════════════════════════════════╝
                    │
L6  OUTPUT          the RENDER MANIFEST + final MP4 + receipts       D-059
                    + verdicts (with coverage)
                    the render manifest is the assembler's ONLY input
                    and the reel's only record — no database read, no
                    config read, no provider call at render time
                    asset paths are LOCAL, never fal CDN URLs: fal's
                    media retention is per-request and expires
                    naming: L1 makes the KEYFRAME manifest, L5 the
                    RENDER manifest — both were "the manifest" before
                    publication stays in KnowScroll
```

Gate ordering is cheapest-first, and that is a correctness requirement rather than an
optimization: Artifact-Bench reports multimodal judges under 10% on fine-grained artifact
detection (47.5% best model vs 87.7% human), so deterministic sensors must own pixels and the
model is asked only closed semantic questions. `research/03-*` Part 4.

---

## 2. Decisions taken in conversation

Numbered `S-n` (session) so they are never mistaken for ratified `D-0nn` entries.

### S-1 · The unit of generation is the shot — ratified as **D-023**

A reel is generated as independent shots (~5–15 s each; the provider's `duration` range is 5–15
per D-019), not as one long clip and not as a small number of larger sections.

**Why.** Three gains, in order of weight: failure is isolated to one shot instead of the whole
reel; failure is caught cheap, at the keyframe stage rather than the clip stage; independent
shots generate in parallel. `02-THE-CUT` §7.4, `04-FAST` §2.

**Rejected.** One clip per reel (a single failure burns the whole generation). Splitting into
~3 larger sections (inherits the same seam and identity-drift problems as per-shot splitting,
with none of the parallelism or cheap-kill gains).

**Consequence.** Most shot-to-shot joins are cuts, not continuations. **NOT yet confirmed by
the owner** — see O-1 in §4.

### S-2 · Selection policy: best-of-2 keyframes, retry clips — ratified, amended, as **D-030**

Two keyframes are generated per shot and the better is selected; clips are generated once and
retried only on gate failure.

> **Amended by D-030 (2026-09-11).** Best-of-2 applies to the **canonical only** — not "per
> shot". Derived keyframes get a single call, regenerated only on gate failure; `text-to-video`
> shots get no candidates at all. Four planned image calls, matching D-027.
>
> **The reasoning below is superseded even where the conclusion holds.** Latency is worth $0 in
> Phase 1 (D-015 generates offline), and on cost best-of-2 loses outright — single-with-retry is
> one call plus p(fail) calls, cheaper at any failure rate under 100%. What survives is that
> best-of-2 is the pipeline's **only selection point**: Gate 1 is pass/fail, so a retry yields the
> first *passing* image, while best-of-2 yields a *choice between two passing images*. That
> matters on the canonical alone, because **T-8** means no gate tests reference quality.
>
> **D-030 opened O-16:** nothing defines what "better" means, and best-of-2 without a criterion is
> paying twice for a random draw.

**Why. Not cost.** `03-HOW-IT-WORKS` §7.1 justifies this policy as "~1.15×" on the premise that
"keyframes are cheap and clips are expensive". **At the rates recorded in `steering/BUDGET.md`
that premise is inverted** — a keyframe is $0.15 and a 5 s clip is $0.20, so a keyframe is 75%
of a clip, not 15%. The real justifications are:

- **Latency.** Best-of-2 keyframes runs in parallel and costs zero extra wall time; a clip
  retry costs a full generation round on the critical path.
- **Blast radius.** A wrong keyframe guarantees a wrong clip, so catching it pre-clip also
  saves the clip.

**The limit of the latency argument.** D-015 states seeds are generated **offline** — "Phase 1
generates offline; Phase 2 generates in response." Latency therefore does not apply to the seed
library at all. For Phase 1 only blast radius survives.

**Rejected.** Best-of-3 whole videos (selection is not correction — against a wrong brief it
selects the best of three wrongs; ViMax's ablation puts k=2 as sufficient with 3–4 adding
nothing; and 3× lands on the most expensive artifact). Best-of-2 on clips as well (2× on the
expensive stage for a gain the evidence does not support).

**Conflicted with D-014 as originally stated; narrowed by S-5.** Best-of-2 now applies to
keyframes in the subject-keyed pool, not to every shot. See §5.

### S-3 · Cap: 3 paid clip takes per shot — ratified as **D-024**

One initial take plus two retries. Counted in **takes**, not retries, to remove the off-by-one.

**Why.** Consistent with D-014's binding "retries ≤ 2 per shot" and `BUDGET.md`'s "Retries per
shot: 2" — the same policy in different units, so no amendment is needed. Without a cap, one
unachievable shot consumes the whole reel budget alone; the surveyed evidence is that
retry-until-pass mostly burns money.

**Three separate counters.** They must not share:

| Counter | Bounds | Notes |
|---|---|---|
| clip takes | 3 per shot | the cap above |
| keyframes | 2 per shot | fixed by S-2, unconditional, not a retry |
| provider transient errors | `maxAttempts` with backoff | a 500 is not a bad picture and is often unbilled; must never decrement the take cap |

**Takes may span strategies.** `03-HOW-IT-WORKS` §7 already allows one alternative strategy
after two failures on the first. So three takes is up to two strategies (e.g. i2v from
keyframe → i2v new seed → direct t2v or FLF2V), not three identical rolls.

**Rejected.** Cap of 4 (breaches the $3.00 per-reel cap in the worst case). Cap of 2
(considered and reverted by the owner; would also have required amending `BUDGET.md`).

**Consequence.** The doom-loop rule in `03-HOW-IT-WORKS` §4.4 ("3 regenerations without gate
improvement → ask") fires exactly at the cap and is therefore redundant on the workflow path.
Keep it only for the Phase 2 agent path.

### S-4 · At the cap: label → still-hold → fail the reel — ratified as **D-025**

Ordered by failure class. Workflow mode is headless with no agent to ask, so this is fixed
policy rather than a judgment call at runtime.

| Failure class | Action | Cost |
|---|---|---|
| soft — style adherence, camera not exactly as asked | `accept_with_label`; verdict records why | $0 |
| picture right, motion broken — freeze, morph, artifact | hold the **gated keyframe** as a `still` with a slow push | **$0** |
| keyframe never passed, or `mustShow` unmet | **fail the reel**, publish nothing | — |

**Why the still-hold works.** The keyframe has already passed Gate 1: composition, identity and
`mustShow` are witness-confirmed. What failed is motion. Holding a verified image for the
shot's duration preserves the planned content, keeps narration in sync because duration is
exact, and costs nothing. The primitive already exists — `02-THE-CUT` §2.3 defines a `still`
clip ("an image asset held for a duration, with optional Ken Burns; edit-only, cheap") and
`05-PROVIDERS-AND-ENGINES` §4 implements it with ffmpeg `zoompan`.

**Hard rule kept.** `accept_with_label` cannot rescue a failed `mustShow`. A label fixes
framing, not substance.

**Rejected.** *Cut the shot* — the generic doc offers it, but narration is a separate T2A track
under D-008, so removing picture desynchronises every downstream beat from the audio. That is a
broken reel, not graceful degradation. *Degrade the brief and retry* — dropping a failing
`mustShow` is the pipeline silently lowering its own standard, which is what gates exist to
prevent, and `BUDGET.md` states the system "never silently degrades quality".

**Not silent.** The still-hold is recorded: labelled on the shot, in the verdict, in the
receipt, visible in the Cut view. Which seeds contain a held shot must be queryable.
Degradation that is logged is a decision; degradation that is not is a lie.

### S-5 · Keyframes are keyed to subjects, pooled, and built before shot allocation — ratified, amended, as **D-029** (tiers collapsed; ranked-and-capped selection)

A keyframe belongs to a **subject**, not to a shot. Shots that show the same thing share one.
The pool is built before shots are allocated, and it has two tiers.

> **Amended by D-029 (2026-09-11).** The subject-keying, the pool-before-allocation ordering,
> the per-reel scope, the declared props and the possibly-empty hero tier all survive as written.
> **Two things changed.** The **two tiers collapse into one** — every generated image is frame 1
> of a real shot, and the canonical doubles as the reference derived frames compose from; no
> image is made purely as a reference the viewer never sees. And **which subjects earn a keyframe
> is now a rank under a cap, not a threshold** (O-11): eligibility floor ≥2 shots, rank by shot
> count, rank 1 becomes the canonical, remaining planned calls buy derived frames, everything else
> is `text-to-video`. The reel's topic competes like any other subject. Read the two-tier
> description below as the reasoning that produced D-029, not as the rule.

**Tier A · references.** Backgrounds and settings, heroes, and shot-specific props. These are
**never sent to the video model**. They are inputs to the image model.

**Tier B · shot keyframes.** The literal first frame of a clip, composed *from* Tier A by the
image model. One per distinct opening view; shared by every shot that opens on that view.

```
hero reference    ──┐
background plate  ──┼──►  IMAGE MODEL  ──►  shot keyframe  ──►  video (i2v)
prop reference    ──┘        $0.15                                $0.04/s
```

**Why two tiers.** The video endpoint takes **one** image. A background keyframe and a hero
keyframe cannot both be frame 1. Composing them at the image stage resolves that, and it is the
verified ViMax pattern — a child shot waits on the parent's frame and is prompted "The
composition and background are correct but some elements may be wrong… replace the characters
in the image with the provided character portraits. Don't change the background."
(`research/03-*` §6.1.)

**Why before allocation.** If each shot generates its own keyframe at generation time, shot 3
cannot know shot 1 already made a usable image of the same subject. Reuse is impossible by
construction. Sharing requires a pool that exists first. This is the cast bank of
`02-THE-CUT` §2 and `00-TALK` idea 17, and ViMax's rule of generating first the shots that
others depend on.

**Props are declared in the plan, never created at shot time.** A shot that "creates a prop
keyframe and offers it to the pool" hits the same ordering problem: earlier shots have already
generated. Every prop is named in L1's manifest and deduped there.

**Solid backgrounds cost nothing.** A black screen, a flat colour or a simple gradient is an
ffmpeg `color` source (`05-PROVIDERS-AND-ENGINES` §4), not a model call. Never spend $0.15 on
something ffmpeg draws.

**Scope is per reel, not per world.** *(Owner's ruling, 2026-09-10.)*

**Why.** References scoped to a world would be cheaper — twelve seeds across four worlds is
three reels per world, so a world's plates would amortize roughly 3×. Rejected because reels
sharing a visual vocabulary go stale and boring. Freshness beats the saving.

**Rejected.** Per-world reference scoping (staleness). Keyframes keyed to shots rather than
subjects (makes reuse impossible and is what breached the budget — see §5).

**Note.** Heroes may be an empty tier. Of the four seed worlds (D-016: Predictive History,
Coding, Startups, Anime), a coding reel plausibly has no character at all. The schema must
allow zero heroes rather than assume every reel has a cast.

### S-6 · Reference semantics are applied at the image layer — ratified as **D-026**

The clip's relationship to its keyframe is **first-frame**, not loose reference. Identity work
that needs "same subject, new composition" happens at the image stage instead.

**Why.** MiniMax exposes three shapes, and the one that treats an image as a free reference is
priced out:

| Endpoint | What the image does | Rate |
|---|---|---|
| `text-to-video` | no image; has `aspect_ratio` | $0.04/s |
| `image-to-video` | image **is** frame 1; no `aspect_ratio`, inherits from the image (D-019) | $0.04/s |
| `reference-to-video` | image is a **reference**; model composes freely | **$0.08/s + token-billed refs**, h3-max only |

A 40 s reel entirely on `reference-to-video` is `40 × $0.08 = $3.20` — over the $3.00 cap with
zero keyframes generated. Mixing it into two shots lands near $2.84 with $0.16 of headroom, and
"token-billed refs" has no published rate in `BUDGET.md`, so that figure is a floor rather than
a number. It is also off D-007's permitted path (`fal-ai/minimax-h3-turbo/*`).

**What replaces it.** Tier A → Tier B. The image model takes the hero reference and composes a
new angle for $0.15, and that composition becomes frame 1. Reference semantics for a flat
$0.15 per shot instead of 2× on every second of video.

**Hard requirement this creates.** The image model **must accept reference images**. Without
that, S-5 collapses. This is now a constraint on O-4, not a free choice.

**Consequence worth stating.** Because i2v starts at the keyframe, the keyframe is on screen at
t=0 — a bad keyframe is not merely a bad seed, the viewer sees it. That is the concrete reason
Gate 1 earns its place.

**Rejected.** `reference-to-video` for Phase 1 (arithmetic above; off D-007's path). Parked as a
Phase 2 question if the per-reel cap ever loosens.

**Unverified, do not lean on it.** FLF2V (first-and-last-frame conditioning) would give control
over where a clip *ends* as well as where it starts, while staying on the cheap endpoint.
D-019 records only `text-to-video` and `image-to-video` for the h3-turbo path. Whether that
path exposes FLF2V needs one check before any design depends on it.

---

## 3. Cost model

**Every figure below is budgeted, not observed.** `H3 Turbo 768P = $0.04/s` is **unread** (Q9;
fal exposes no billing endpoint — `/billing/user_spending` and `/billing/balance` both 404) and
`nano-banana-pro keyframe = $0.15/image` is marked **UNVERIFIED** in `BUDGET.md`. D-014 blocks
the seed library until the owner reads the real charge off the fal dashboard.

**Reel shape is set by D-014, not by the design docs:** 4–6 shots per reel, ~40 s, five clips of
~8 s. `04-FAST` §2's 3-shot / 15 s reel is that document's illustration and carries no
authority; earlier arithmetic in this session used it by mistake.

At D-014's shape — 5 shots, 40 s, $0.32 per 8 s clip:

| Policy | Keyframes | Clips | Total | vs $3.00 cap |
|---|---|---|---|---|
| S-2 keyed to **shots** (best-of-2 on all 5) | 5 × 2 × $0.15 = $1.50 | $1.60 | **$3.10** | **BREACHES before any retry** |
| single keyframe on all 5 shots | 5 × $0.15 = $0.75 | $1.60 | $2.35 | fits, $0.65 spare |
| S-5 keyed to subjects, **two live tiers** — superseded, see below | $0.90 | $1.60 | $2.50 | fits, $0.50 spare |
| **D-029 · subjects, tiers collapsed** — worked example below | $0.60 | $1.60 | **$2.20** | fits, $0.80 spare |

> **Superseded by D-027 + D-029 (2026-09-11).** The two-tier worked example below the line
> ($0.90, 6 image calls) and `contentions.md` §4.2's Config A ($0.60, 4 calls) described two
> different reels, both labelled S-5. **D-027 ratified the 4-call one and forbids planning more
> than four.** D-029 collapses the tiers to match: every generated image is frame 1 of a real
> shot, and the canonical doubles as the reference the derived frames are composed from. The
> two-tier arithmetic is kept for the record only.

**Worked example under D-029.** Five shots. Subjects ranked by shot count; the top one becomes
the canonical:

```
canonical   top-ranked subject, best-of-2    2 x $0.15  =  $0.30
            — and is frame 1 of its own shot
derived     2 frames composed from it        2 x $0.15  =  $0.30
            (one per next-ranked subject)
            2 shots text-to-video, aspect_ratio 9:16      $0
            (a solid background is ffmpeg, $0)
Clips       40 s x $0.04                                 =  $1.60
                                                           -------
                                                            $2.20
plan budget 4 calls · hard ceiling 6 · 2 held in reserve
  but a reel declaring a discrete state change (D-037) PLANS 5 and holds
  only 1, and the canonical repair takes it first              D-048
```

**Superseded two-tier arithmetic**, kept for the record: `Tier A` 2 background plates + 1 hero =
$0.45; `Tier B` 1 shared best-of-2 keyframe $0.30 + 1 single-use $0.15; 2 shots t2v; $0.90 of
images, reel $2.50. Its structural claim was that **both tiers are paid calls** — a hero
reference costs $0.15 *and* the keyframe composed from it another $0.15 — with ViMax's trick
(the first shot's Tier B frame serving as a later Tier A reference) named as an optimization to
measure rather than assume. **D-029 promotes that trick to structure**, which is where the $0.30
goes. The cost of doing so is recorded as trap **T-8**: the canonical must now be a good opening
frame *and* a good reference, and nothing has measured whether one image can be both.

**The per-reel cap binds before the per-shot cap does.** At $0.32 per clip take and ~$0.80 of
headroom, a reel affords roughly **two clip retries in total across all five shots**. S-3's
per-shot cap of 3 would permit up to ten. The money stops the reel long before the take cap
does, so the $3.00 pre-flight check is the control that matters and S-3 is a backstop.

### 3.1 The four ways to build a reel — plain version

Full arithmetic, every case and every permutation, lives in **`contentions.md` §4**. This is the
short version.

There are four ways to make a 5-shot, 40-second reel. They differ only in how many "source of
truth" pictures get made before any video is generated.

| | What it is | Cost | Time | What you get |
|---|---|---|---|---|
| **0** | no pictures at all — every shot described in words | **$1.60** | **19 s** | cheapest and fastest; nothing looks consistent |
| **A** | one picture defines the look; other shots copy from it | $2.20 | 41 s | one thing stays consistent; room to fix two broken clips |
| **B** | two pictures define the look | $2.50 | 41 s | two things stay consistent; **no room left to fix anything** |
| **C** | one picture, plus a second showing it changed | $2.35 | 41 s | consistency plus one state change |

Three things fall out of this, and they are the useful part.

**1. A shot costs the same whether it has a picture or not.** Video bills at $0.04 per second
either way. So a picture is never bought to make the clip cheaper — only to keep things looking
like themselves, and to catch a mistake early while it is still cheap to throw away.

**2. Extra pictures are nearly free in time; extra *layers* are not.** A, B and C all finish in
41 seconds despite making 4, 6 and 5 pictures — because pictures made at the same moment run
side by side. What costs time is a picture that has to **wait** for another picture. Wide is
cheap. Deep is expensive.

**3. Consistency has a price, and it is small.** Measured against doing nothing at all:

> **+$0.60 and +22 seconds.** That is what "everything looks like itself" costs.

**Which to pick.** For the seed library, **A**. Seeds are generated offline (D-015), so the 22
seconds costs nothing real, and A is the only keyframed option with money left to repair a
broken clip. Phase 2, where a person is waiting, may well want a different answer — and it
should be made then, against real timing data rather than the single measurement that exists
today.

### 3.2 Why 41 seconds is probably not a problem at all

Full treatment in **`multi-reel-pipeline.md`**. The short version, because it changes how much
the numbers above matter.

Reels in the vertical feed are **independent** — nothing carries from reel N to reel N+1. So
they need not be made one at a time, or at the moment they are asked for. Make several at once,
ahead of the viewer, and serve from a queue that is already full.

Once you do that, **per-reel latency stops being a user-facing number.** It becomes a throughput
number: does the queue refill faster than the viewer drains it. And by that measure the numbers
are small — a batch of **six** covers all five users watching simultaneously.

Which quietly settles the Config A question above. If batching absorbs latency entirely, the
pipeline should be tuned purely for cost and quality, and A's extra 22 seconds costs nothing.

**The catch, and it is a large one.** Throughput was never the constraint. `BUDGET.md` caps
spend at $10/day, which at $2.52 a reel is **about four new reels per day across all users** —
while five people watching continuously would consume roughly $1,134 of reels per hour. Three
orders of magnitude apart.

So the feed cannot be generation-driven. It has to be mostly a **library** — seeds, cache,
branches already taken — with generation as the rare exception at the frontier. That is what
D-015 and `04-FAST` already assert; `multi-reel-pipeline.md` §4 is the arithmetic showing why.

Note the scope: this covers **vertical** movement only. Horizontal branches are derived from the
reel being watched, cannot be batched blind, and remain a genuine latency problem.

---

## 4. Open — nothing here is assumed

| # | Question | Where it bites |
|---|---|---|
| O-1 | **ANSWERED by D-036 (2026-09-11), reframed.** Not a global default — **join mode is declared per reel** (`cut` or `chain`), because it is a property of the content. Default `cut`, since a chain makes every shot depend on its predecessor and surrenders D-023's failure isolation. **Phase 1 chains are sequential last-frame — zero image calls**, ffmpeg extracts the terminal frame — and because D-015 makes latency worthless offline, **a chained reel is cheaper than a cut one** ($1.90 vs $2.20). Re-anchor after 3 hops (decay is documented at 3–4). Parallel FLF2V chains need 6 junction keyframes — the hard ceiling with zero reserve, T-1 again — so they are parked for Phase 2. | L1, L4 |
| O-2 | **ANSWERED by D-034 (2026-09-11).** The **epistemic layer** authors beats, the script with `claimRefs`, and `mustNotShow`; the **planning layer** authors shot count and order, `camera`, `duration`, framing, and which subject appears where. **Reframed on the way to the answer:** this is a boundary between two layers of *one engine*, not between two products — **C-11 stays parked and this does not depend on it**. Enforced by `pnpm drift`, the same mechanism `CLAUDE.md` already uses for `apps/api → providers`. **Ranking and `varyOn` are computed by code, never chosen by a model** — D-029 specifies an algorithm and demands determinism.  **AMENDED 2026-09-12:** "beats" is dropped (**D-070**) — a beat is a narration unit is a shot, 1:1 under D-057. And **D-067** places the epistemic layer **inside `reel-engine`**, not in `reel-script`: the whole script crosses, and the claim-derived `mustShow` is computed here. D-034's substance is unchanged — the planner still receives criteria as given and may add but never weaken. | L0 → L1 |
| O-3 | **ANSWERED by D-034 (2026-09-11).** The epistemic layer. `mustNotShow` comes from depiction permissions; the claim-derived `mustShow` entries are **computed from the script by code**, not hand-authored twice, so criteria cannot drift from the sentences they check. The planning layer may **add** cinematic criteria and may **never weaken or remove** an epistemic one — otherwise the layer that writes a shot also writes its own grading, and weak criteria pass forever with nothing detecting it. Gate 4's blind witness protects the *observation*, not the *standard*. This is `CLAUDE.md` ritual 7 — "add, never subtract" — applied to acceptance criteria. | L1 |
| O-4 | **Which image model for keyframes.** **Narrowed by D-028 (2026-09-11):** the model is a registry with a configured default, so the open question is now only *which default first*, and it is answered by a bake-off (~$1.06), not by argument. All four rates are READ and recorded in `BUDGET.md` — `nano-banana-2` is **$0.08**, half of Pro, same 14 refs, same explicit 9:16. **Two** hard requirements now, not one: accepts reference images (D-026), **and emits true 9:16** — `image-to-video` has no `aspect_ratio` field, so a non-vertical frame yields a 16:9 reel silently. Price no longer separates the candidates; M-1 (gate pass rate) does. | L2 |
| O-11 | **ANSWERED by D-029 (2026-09-11).** Subjects are ranked by shot count under a cap, not filtered by a threshold. Eligibility floor ≥2 shots; rank 1 becomes the canonical (best-of-2, and frame 1 of its own shot); the remaining planned calls buy derived frames for the next-ranked; everything else is t2v. Ties break by earliest first appearance, then manifest order. **The topic competes like any other subject** — no guaranteed slot, since a subject appearing once has nothing to be consistent with. | L1, L2 |
| O-12 | **ANSWERED by D-030 (2026-09-11).** Best-of-2 on the **canonical only**; single on derived (regenerated only on gate failure); none on t2v shots. Under D-029 "shared" means the canonical, since it is the only image anything derives from — blast radius 3 shots of 5, against 1 for a derived frame. The justification is **not** latency (D-015 puts Phase 1 offline, so it is worth $0) and **not** cost (single-with-retry is cheaper at any failure rate below 100%): it is that best-of-2 is the pipeline's **only selection point**, and T-8 means nothing else tests the canonical's reference quality. | L2 |
| O-13 | **CLOSED by D-039 (2026-09-11): the term is dropped.** "Reel type" entered once in conversation while scoping keyframes, and **D-029 then scoped keyframes per reel** — the only job the phrase had. Defining it after the fact so the sentence containing it stays true is how an undefined concept becomes load-bearing without anyone deciding it should. A format-preset concept may be designed later on its own terms; D-036's join mode and D-033's camera enum are the kind of fields it would carry. | L1 |
| O-14 | **ANSWERED by D-040 (2026-09-11).** The reel whose job **generated** the reference pays in full; later reels in the same branch lineage reuse it at **$0** with no image receipt. Amortising would need pre-flight to price a reel against reels that do not exist yet, which it structurally cannot do. Accepted consequence: the **first reel in a lineage is the most expensive**, and is refused if it alone breaches $3.00 — correct under a per-reel cap. No conflict with D-029: per-reel scoping exists because *unrelated* reels go stale, while a branch **is** derived from its parent by construction. | budget |
| O-15 | **ANSWERED 2026-09-11 — yes.** `fal-ai/minimax-h3-turbo/image-to-video` exposes `end_image_url`. Full schema read: `prompt`, `duration`, `resolution`, `seed`, `enable_safety_checker`, `sync_mode`, `prompt_expansion_mode`, `image_url`, `end_image_url`. **D-019 recorded only t2v and i2v and was incomplete.** Riders: `end_image_url` may be given **alone** (end-only, "the output canvas follows this image"); **both omitted yields text-to-video** — the silent-16:9 path D-029 guards, now confirmed from schema rather than inferred; resolution enum is `480P, 768P, 1080P`, not the 2K/4K of the non-turbo path. Settles C-6 (D-037) and prices the chain option in D-036. | L3 |
| **O-16** | **ANSWERED in shape by D-031 (2026-09-11); values still open.** Candidates are ranked by a **score** — `veto × Σ wᵢ·normalise(paramᵢ)`, **higher wins** (a score, not a cost: an `argmin` would silently keep the worse candidate every time, which is T-3's bug in a different unit). Deterministic sensors own pixels; the model gets **only closed yes/no questions**; no open "which is better" call exists. Two **vetoes** zero the score outright — subject clipped by the frame edge, wrong number of subjects — because a reference derived from either propagates the error into every frame composed from it. **Reference quality outranks shot composition** (T-8): composition affects one shot, reference quality affects three of five, the same 3:1 asymmetry that produced D-030. The score ranks, never admits — Gate 1 stays binary and runs first. **Still open:** the parameter list and the weights are unmeasured and provisional, which is why D-031 puts them in config; tuning them needs M-1's data. **AMENDED by D-046 (2026-09-11): the vetoes are no longer in the score.** As ratified, two vetoed candidates both scored 0, and 0 vs 0 is a **tie** — which D-031 rule 4 resolves as *first-generated wins*, so a clipped or miscounted image could become the canonical and propagate into three of five shots. The formula is now `Σ wᵢ·normalise(paramᵢ)` with no veto factor, both conditions are Gate 1 failure conditions, and rule 2 ("the score ranks; it never admits") is literally true rather than nearly true. **Also amended by D-045:** the score's model terms are read from Gate 1's verdict — the scorer makes no vision call — which pushes D-031 rule 5's temperature-0 requirement onto Gate 1's witness. | L2, Gate 1 |
| **O-17** | **ANSWERED by D-033 (2026-09-11).** *Where does the clip's text prompt come from?* Nothing specified it — L3 named the endpoint and the image and never the prose. Composed **at L3, after the keyframe is gated**, from the manifest entry × **Gate 1's recorded observations**, with **no second vision call** (a fresh pass can disagree with Gate 1, leaving two records of one frame). Acceptance criteria stay at L1 — the criteria are the test, the prompt is an instruction. Riders: `camera` is MiniMax's closed enum; `expanded_prompt` is recorded in every video receipt; a retry prompt also consumes the failed take's verdict. **Still open:** *who* composes it — O-2/O-3. | L3 |
| **O-18** | **ANSWERED by D-035 (2026-09-11).** One structured model call produces the whole manifest. **D-029's ranking needs a view across all shots at once**, so a per-shot call cannot produce it by construction; staging into two calls buys a checkpoint schema validation already gives, at the cost of a second schema to keep in sync. Plan calls are ~$0, so splitting saves nothing. Risk accepted and blunted: the manifest is schema-validated before any paid call, and D-034 already moves ranking, `varyOn` and claim-derived `mustShow` out of the model. | L1 |
| O-5 | **Which gates run per lane/tier.** **The naming half is ANSWERED by D-041/D-042/D-053 (2026-09-11)** — Gate 1's witness is the same contract, model and blindness applied to one still, with the temporal block absent, plus the reconcile step D-042 added. It is a narrower *subject*, never a lower *standard*, and D-053 removes the separate name it used to carry, since that name described a weaker gate. **The tier half is still open, but its motivation is weaker than it looks:** D-006 routes vision to `MiniMax-M3`, which the token plan covers (`minimax-h3.md:880` — only H3 video is excluded), so gate model calls carry **no marginal cost** in Phase 1 and "run fewer gates to save money" buys nothing. I-7's cheapest-first ordering is a **correctness** rule and is untouched by that. Phase 1 has one lane; the speculative-tier question belongs to the horizontal branch case, which has no design yet. **ANSWERED by D-052 (2026-09-11): one lane, one profile, every gate runs**, the profile is config and what ran is recorded (I-6). The lighter set is parked with the horizontal case, because the other thing it buys is **latency** — and D-015 puts Phase 1 offline, where wall-clock is worth $0. Latency matters at the horizontal branch, where a person is waiting. (`07-BUILD` Q10) | Gates 1–8, 1S |
| O-6 | **Frames or full video — still open. The model half was never open:** **D-006 (2026-09-03) already routes "Visual Witness, Encounter Reconciler, keyframe judge" to `MiniMax-M3`**, and this file did not notice for eight days. What remains is input mode, and **`07-BUILD` Q9's "frames as the portable baseline" leaning predates the capability being READ**: `building-blocks.md:165` records M3 accepting `video_url` (inline ≤50 MB, MP4/AVI/MOV/MKV) with its own note "send the whole clip as a blind witness — no frame sampling needed". An 8 s 768P clip is far under 50 MB, and both the portability and cost arguments for frames are gone. **The real counterweight is narrower than it looks:** every accuracy figure the design cites (Artifact-Bench, VideoWeaver's coarse-then-zoom) measured *frames*, and **I-7 already gives motion artifacts to ffmpeg**, so video input's genuine gain is temporal *semantics* — whether a `mustShow` event actually happens, and in what order — not artifact detection. **ANSWERED by D-051 (2026-09-11): video, with frames as the recorded fallback.** The decisive argument did not exist until the same day: **D-043** defers `event` criteria to Gate 4 *because motion is required*, so a frames-only witness checks them on stills again — and **D-041's `actions[].completes`** is temporal by construction. Frames stay implemented because Gate 1 and Gate 7 need the image path anyway, so the fallback is configuration rather than new work. `coverage.strategy` records which ran; `'full'` claims only that the clip was supplied whole (I-6). (`07-BUILD` Q9) | Gate 4 |
| O-7 | **Handover-frame scoring thresholds**; matters less if O-1 lands on cuts. | L4 |
| **O-8** | **ANSWERED by D-056 (2026-09-12): one progressive MP4, `faststart`, over HTTP Range. No HLS, no fMP4, no `.m3u8` in Phase 1.** HLS buys two things and Phase 1 has neither: playback that starts before the last segment exists — **D-015 generates offline, so the reel is complete and gated before any viewer reaches it**, which is `multi-reel-pipeline.md` §4.2's "library, not a generator" from the other side — and adaptive bitrate, which needs a ladder D-014's single 768P does not have. **`07-BUILD` Q22's stated premise does not hold.** It leans HLS "because the Android/Media3 client plays HLS natively"; that client comes from `docs/design/2026-09-06-zoom-ladder-talk.md`, whose front matter says *"a discussion document, not a decision"* and whose closing line asks for a D-entry **that was never appended** — it proposes the id `D-023`, which went to the unit of generation. `apps/web` is a React + Vite PWA, which is also `building-blocks.md`'s own recommended stack. **The choice does not depend on that open question:** Media3 plays progressive MP4 natively, a browser `<video>` plays progressive MP4 natively, and HLS is native to only one of them. `04-FAST` §2's dual output stays Cutroom's answer for Phase 2, where the horizontal branch case has a person waiting. | L5 |
| **O-20 · new** | **What values `prompt_expansion_mode` actually accepts.** It is required on every fal H3 call and only `balanced` appears anywhere in this repo's research. D-072 configures "the least-rewriting value the endpoint takes" and cannot name it. **Closed by one schema read, $0** — the same way O-15 closed `end_image_url`. Until then every call uses whatever is configured, recorded per receipt. | L2, L3 |
| **O-21 · new** | **Which `planVaryOn` axis is the right default.** D-062 requires one to be declared; nothing says which. This is **C-7 one layer up** — the image layer has the identical open question about D-032's `varyOn`, and both need M-1-class data. The plan score's weights (D-064) are unmeasured in the same way **O-16**'s are. | L1 |
| **O-19 · new** | **What the output geometry and frame rate actually are.** `fps` exists on **no** fal H3 endpoint (verified by schema absence) and the output rate and pixel dimensions are documented nowhere. D-055 conforms every input from ffprobe and pins the profile in config rather than guessing, so nothing is blocked — but the literal values are unknown. **Settled by M-7: one ffprobe of one real clip.** | L5 |
| O-9 | **Which harness**, if any, is adopted rather than built. Parked earlier this session. | whole runtime |
| O-10 | **Q9 — the real fal rate.** Gates every number in §3, and D-014 gates the seed library on it. | everything |

---

## 5. Conflict with a binding decision — needs the owner

**S-2 (best-of-2 keyframes on every shot) contradicts D-014.**

D-014's reasoning, verbatim:

> Twelve reels fit in $40 only with discipline: 4–6 shots per reel, text-to-video for
> establishing shots, keyframes only where continuity needs them, and keyframes judged before
> animating.

Two clauses collide with S-2. D-014 says **text-to-video for establishing shots** and
**keyframes only where continuity needs them**; S-2 puts two keyframes on every shot. §3 shows
the result: **$3.10 against a $3.00 per-reel cap, before a single retry.**

D-014 is binding and append-only.

### Resolved in principle by S-5 — 2026-09-10

The conflict came from keying keyframes to **shots**. S-5 keys them to **subjects**, and the
breach disappears: the worked example in §3 lands at **$2.50 against the $3.00 cap**, with
text-to-video on the shots that need no keyframe.

That is D-014's own instruction — "keyframes only where continuity needs them" — with the
missing half supplied: *continuity needs them when a subject recurs*. **No superseding decision
is required, and none was taken.** Three earlier options (narrow S-2, supersede D-014, split by
phase) are all moot.

**Landed 2026-09-11.** O-11 is answered and S-5 is ratified as **D-029**: subjects are ranked by
shot count under a cap rather than filtered by a threshold, so the plan lands on four image calls
whatever the manifest looks like. The "planner declares eight subjects on a five-shot reel" breach
is closed by construction — a rank cannot exceed its budget, where a threshold can. **O-12 is
answered too** (D-030): best-of-2 on the canonical only, single on derived, none on t2v — the four
calls D-027 already assumed. **All six session choices S-1…S-6 are now ratified.**

What replaced them is one new question, **O-16**: nothing defines what "better" means when
selecting between two passing candidates. That is the half of D-030 that does the work, and it is
open.

Note the figure moved: D-027 and D-029 put a Phase 1 reel at **$2.20**, not $2.50, because the
tiers collapsed and two image calls went with them.

---

## 6. When this becomes real

**Done 2026-09-11.** S-1 → **D-023**, S-3 → **D-024**, S-4 → **D-025**, S-6 → **D-026**. Each
carries `Rejected` and `Confirmed-by`.

Note what those `Confirmed-by` clauses commit us to. None of the named tests exists yet — a
duration-and-shot-count contract test, a take-counter test that transient errors do not
decrement, a queryable-degradation test, and a startup assertion that the image model advertises
reference input. Until they are written the four entries are, in the decision file's own words,
wishes rather than constraints.

**S-5 ratified 2026-09-11 as D-029**, amended on two points — the tiers collapse, and O-11's
countable rule is a rank under a cap rather than a "≥2 shots" threshold. A Phase 1 reel is now an
enforceable **$2.20** at four image calls, not a plausible $2.50 at six. **C-1 was resolved first
as D-027** (Config A, scoped to Phase 1), which is what unblocked it, and **D-028** made the image
model a configurable registry rather than a hardcoded slug.

**S-2 ratified 2026-09-11 as D-030**, amended: best-of-2 on the canonical only, not per shot. O-12
answered with it. **All six of this session's choices are now binding** — S-1…S-6 as D-023, D-030,
D-024, D-025, D-029, D-026 — alongside D-027 (Config A, Phase 1) and D-028 (the image-model
registry).

One new open question came out of it: **O-16**, the selection criterion, which D-030 names as its
own load-bearing half.

Two corrections are still outstanding, in the source documents rather than here:
`03-HOW-IT-WORKS` §7.1's "~1.15×" (it is ~1.43× at recorded rates, and the policy's real
justification is latency and blast radius), and the reel shape used throughout `04-FAST` §2
(3 shots / 15 s is an illustration; D-014 binds 4–6 shots and ~40 s).

**L5 specified 2026-09-12 as D-054…D-059, and this document has no undecided stage left.** Six
entries: one ffmpeg pass with no segment cache and no concat (D-054); one output profile with every
input conformed from ffprobe (D-055); **O-8 answered — one progressive MP4, no HLS** (D-056); the
shot as the sync unit, with narration generated per shot (D-057); Gates 7 and 8 on the assembled
file, unable to spend (D-058); and the render manifest as the assembler's only input and the reel's
only record (D-059).

Three things this document was silently missing, now in it:

- **the sources end card**, binding since D-008 and drawn in no earlier version of the L5 or L6
  block, though it is a timeline element with a duration;
- **where captions and narration are made** — L3's parallel track said "narration (T2A) + captions"
  and never said at what granularity, which is the whole of the sync question;
- **the word "manifest" meaning two different documents.** L1 makes the keyframe manifest, L5 makes
  the render manifest. Both were "the manifest".

`07-BUILD` Q22's premise was corrected in its own file the same day: **there is no ratified Android
client**, so the reason it gave for leaning HLS was not available to it. Recorded as **T-9**.

The corrections outstanding above are unchanged.
