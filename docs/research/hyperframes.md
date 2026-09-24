---
status: research
authority: none — a record of what was read and measured, not a decision; a choice made from it is an S- entry
---

# Hyperframes — making video from code, and where it could fit in Cutroom

Asked by the owner on 2026-09-24: _"there is another way that has come up, Hyperframes — they create videos from code
instead of using a video model. Look and research this and tell me where it can fit in our engine."_

Read from: the repository `heygen-com/hyperframes` at `326df8d` (2026-09-24, every package at **0.8.71**), its docs
and its 21 agent skills; and a spike on this machine — two shots of the black-holes reel (run `12a097bf…`) remade as
Hyperframes compositions from that run's own picture, narration and word timings, rendered, and checked the way Gate 2
checks a clip. Nothing in this repository was changed but this file and the journal.

## The short answer

**Hyperframes turns an HTML page into an MP4.** You write a page — HTML, CSS, an animation library such as GSAP — with
a few `data-*` attributes saying when each element is on screen. Its renderer opens the page in headless Chrome, sets
the page's clock to each frame's time in turn, takes a screenshot of every frame, and hands the frames to ffmpeg with
the page's audio mixed in. No video model is involved: every pixel is what the code draws, or a picture or clip the
code places.

**In plain words: a flipbook.** The web page is the drawing, with instructions such as _"at 2.73 s, the word 'chip',
light the chip up"_. Hyperframes freezes the page's clock, sets it to 0.000 s and takes a photo, then 0.042 s and
another, 24 photos for every second, and ffmpeg glues the photos into a video with the narration. Nothing is guessed,
so lines stay sharp, text is spelled exactly and motion lands on the spoken word. **Hyperframes is only the camera:**
the look — colours, layout, how the lines draw themselves — is whoever wrote the page. A plain page records plain.

**What that could give Cutroom** is a second way to make a shot, next to buying a clip from a video model:

- **A shot that cannot fail the ways model clips have failed our reels.** No fade to black on a word like "disappears" (P-003), no voice
  in the clip's sound (P-007), no garbled lettering. What the code says is what renders, and it renders the same
  picture every time (§3).
- **Things a video model cannot do well:** exact text and labels, diagrams, scale comparisons, timelines, motion keyed
  to a word in the narration — the spike's flash lands on "explodes." because the code puts it at that word's
  timestamp.
- **A better hold.** When a shot's three takes fail, the engine holds its approved picture with a plain `zoompan` push
  (D-025, S-097). The same picture, animated by a composition — a push, a light, an accent on the key word — is a far
  better hold, and it is what the spike's shot 0 is.

**What it does not give:** real-world motion. Code draws motion graphics, not cinema. It will not show a star being torn
apart the way a video model does, and it **cannot invent a real-looking person or place**. It can only _place_
real-looking footage that something else made — a photo, a clip from fal, a camera's video — and build around it:
cuts, zooms, captions, labels drawn over it. HeyGen's own realistic avatars come from HeyGen's models; Hyperframes
composes the video around them. Its 3D (Three.js) can draw people, but they look like a video game, not real. And **cost is not the argument**: fal bills a clip about 0.2¢ (S-154), so replacing
clips saves almost nothing. The argument is **reliability and precision** where model clips are weakest.

**The recommended way in**, smallest first: (1) the **composed hold** — a fixed template animates the approved picture
at the take cap (§4 A); (2) **graphics over the real clips** — fal keeps making the realistic footage and Hyperframes
draws labels, arrows or a small diagram over it (§4 F), with the word-lit **caption layer** (§4 E) beside it; (3) a
**closed set of template shots** (diagram, scale, timeline, kinetic quote) that the planner can choose and fill with the
narration's own words, which also gives a stopped shot a fallback (§4 C, B); (4) only after all of those have proved
themselves, if ever, **model-written compositions** (§4 D). Each is a feature with its four gates (CLAUDE.md rule 1). §8 gives the questions only the owner can
answer.

## 1. What it is

| fact         | value                                                                                                                                                                                                                                                                                         |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Made by      | HeyGen (the AI-avatar video company). "Used in production at HeyGen … across HeyGen's video product surface" (`ADOPTERS.md`)                                                                                                                                                                  |
| Licence      | Apache-2.0, "no per-render fees or commercial-use thresholds". GSAP, which most compositions use, is under the **GSAP Standard License** — free, but not an OSI open-source licence (`CREDITS.md`)                                                                                            |
| Age and pace | Created 2026-03-10; version 0.8.71 on 2026-09-24; pushed to every day. **Still 0.x** — the API is not frozen, and several READMEs already disagree with the code (below)                                                                                                                      |
| Adoption     | 52,783 stars, 4,823 forks, 206 open issues (GitHub API, 2026-09-24). Listed users: HeyGen, tldraw (PR walkthrough videos), TanStack, reap.video, Typeframe, a course generator, an AI-classroom exporter                                                                                      |
| Tagline      | "Write HTML. Render video. Built for agents."                                                                                                                                                                                                                                                 |
| Prior art    | Remotion (React components rendered by headless Chrome). Hyperframes' bet is plain HTML with no build step instead of React; Remotion's licence is source-available, not open                                                                                                                 |
| Needs        | Node 22+, ffmpeg, and a Chrome it downloads itself (`chrome-headless-shell`, about 270 MB unpacked on this machine)                                                                                                                                                                           |
| Packages     | `hyperframes` (the CLI), `@hyperframes/core` (parsers, runtime, adapters), `engine` (Chrome capture), `producer` (capture + encode + audio mix), `lint`, `sdk` (edits compositions), `player` (web component), `studio` (browser editor), `shader-transitions`, `aws-lambda`, `gcp-cloud-run` |

## 2. How it works

### A composition is an HTML page with timing attributes

```html
<div
  id="root"
  data-composition-id="shot0"
  data-start="0"
  data-duration="10"
  data-width="768"
  data-height="1366"
  data-fps="24"
>
  <img id="pic" class="clip" src="assets/picture.jpg" data-start="0" data-duration="10" />
  <div id="rail" class="clip" data-start="0" data-duration="10"></div>
  <audio id="voice" src="assets/narration.mp3" data-start="0" data-duration="9.973"></audio>
</div>
<script>
  const tl = gsap.timeline({ paused: true })
  tl.fromTo('#pic', { scale: 1 }, { scale: 1.14, duration: 10, ease: 'sine.inOut' }, 0)
  window.__timelines = window.__timelines || {}
  window.__timelines['shot0'] = tl
</script>
```

- **The HTML holds the timing; the script only describes what the page looks like at time _t_.** `data-start` and
  `data-duration` (seconds) put an element on screen; `data-start` can also be `otherClip + 0.5`. The root's
  `data-duration` is the render's length. `data-track-index` is a lane in their editor — the render ignores it; paint
  order is CSS `z-index`.
- **One paused GSAP timeline per composition**, registered at `window.__timelines[id]`. The framework seeks it; a
  script must never play, pause or set `currentTime` itself.
- **Other animation libraries** have built-in adapters: CSS animations, the Web Animations API, Anime.js, Lottie,
  Three.js, TypeGPU; maps (Mapbox, MapLibre, Leaflet) and D3 are waited for but not seeked. There is no public way to
  register a new runtime adapter.
- **Sub-compositions**: another file wrapped in `<template>`, placed with `data-composition-src`, timed locally.
- **Variables**: declared on the composition (`string`, `number`, `color`, `image` …), passed with `--variables '{…}'`
  or `--batch rows.json` (one render per row), read in the page. Variables cannot change size, length or fps.
- **Media**: `<video>` must be `muted`; its sound, if wanted, is `data-has-audio="true"`. `<audio>` carries
  `data-volume`, fades and trims. Captions are **not a built-in element** — they are ordinary HTML animated from an
  inline word list `[{text, start, end}]` in seconds — our `WordTiming` (`word`, `startMs`, `endMs`) maps onto it
  one to one.

### The render: seek, screenshot, encode

1. **Compile.** The page is read in Node. External scripts, remote images, videos and fonts are **downloaded and
   inlined** at this step; a missing local GSAP is fetched from jsDelivr; Google Fonts are fetched and cached in
   `~/.cache/hyperframes/fonts`. A small file server on `127.0.0.1` then serves the project.
2. **Fake time.** Before any of the page's scripts run, a shim replaces `Date`, `performance.now` and
   `requestAnimationFrame` with a virtual clock. **`setTimeout` and `setInterval` are not replaced**, and `Math.random`
   is seeded only in distributed renders — so a composition that uses them is not repeatable. The linter refuses `Math.random`, the
   clock calls and `requestAnimationFrame`; nothing refuses `setTimeout`.
3. **Seek and capture, frame by frame.** For frame _n_ the engine calls `window.__hf.seek(n / fps)`: GSAP and the other
   adapters jump to that time, the page waits for images, fonts and decoding, and the frame is captured — by Chrome's
   `HeadlessExperimental.beginFrame` on Linux, by `Page.captureScreenshot` on Windows and macOS (this machine used
   screenshots), or by a faster `drawElementImage` path where a GPU allows. **A `<video>` in the page is never played**:
   its frames are extracted by ffmpeg beforehand and swapped in as images, frame by frame.
4. **Parallel workers.** Frames are split across several Chrome pages; `--workers auto` chose 5 here.
5. **Encode.** Frames are piped to ffmpeg — H.264 `yuv420p` with CRF 15–28 by quality preset, BT.709 tags, faststart.
   Also WebM VP9 with real alpha, MOV ProRes 4444 with alpha, GIF, PNG sequences and HLS.
6. **Audio** is never captured from the browser. Each `<audio>` is decoded to 48 kHz PCM, trimmed, faded, delayed to
   its start, and mixed with `amix` into AAC 192k; volume envelopes and effect chains are baked in. There is **no
   render-time ducking** — their "voiceover carve" is an analysis step that writes EQ cuts onto the music track.

**"Deterministic" means the same picture, not the same bytes**, unless you ask for it. Their own docs: _"exact pixels can
still vary with Chrome, fonts, codecs, GPU behavior, and the host environment."_ Their regression suite compares 100
frames by PSNR, mostly at a 30 dB floor, and needs a pinned Chrome inside Docker to reproduce its baselines. The spike
found the same (§3): byte-identical only with one worker and software rendering.

### The toolbox around the renderer

- **`hyperframes lint`** — about 127 rules, JSON output. The ones that matter to us: `non_deterministic_code`
  (`Date.now`, `Math.random`, `performance.now`), `requestanimationframe_in_composition`, `gsap_infinite_repeat`,
  `imperative_media_control`, `media_missing_id` (an `<audio>` without an id renders silent), `font_family_without_font_face`.
  **No rule catches a render-time network request.**
- **`hyperframes check`** — lint, then one headless sweep: runtime errors, failed requests, layout overflow and overlap,
  WCAG contrast with a suggested colour, and `sweep_static` when a timeline of 3 s or more never changes.
- **`hyperframes snapshot --at 1,5,8`** — frames as PNGs and one contact sheet, for a person or a model to look at.
- **The registry** — 395 items (164 blocks, 223 components, 8 examples): transitions, lower-thirds, charts, maps,
  social cards, 15+ caption styles. `hyperframes add <name>` fetches one from GitHub. **12 blocks are 1080×1920**;
  151 are 1920×1080.
- **`frame.md`** — a design-system file (colours, type, spacing as front-matter tokens) that their skills make every
  scene read. 13 presets. A convention for agents; no package code reads it.
- **Local helpers that need no account:** `hyperframes tts` (Kokoro-82M, a local text-to-speech model),
  `hyperframes transcribe` (whisper.cpp, word-level timestamps), `remove-background` (a local ONNX model), `beats`.
- **HeyGen services behind a key:** Starfish voice (with word timings), music and sound-effect catalogues, avatar
  video, cloud rendering. **Cutroom would need none of them.**
- **Telemetry is on by default** (PostHog, anonymous). `HYPERFRAMES_NO_TELEMETRY=1` or `DO_NOT_TRACK=1` turns it off.

### How their agents make a video

Hyperframes is built to be driven by a coding agent through 21 skills. The one closest to a KnowScroll reel is
**`faceless-explainer`** — "explaining a topic from arbitrary text … every visual is LLM-invented (typography /
abstract / diagram / data-viz)", 30–90 s. Its loop:

1. A brief, then a design preset copied to `frame.md`.
2. `STORYBOARD.md` (one block per scene) and `SCRIPT.md`; the voice is generated first and **"real voice duration
   wins"** — scene lengths are set from the narration, as ours are (S-073).
3. **One sub-agent per scene writes that scene's HTML**; an assembler script stitches them into `index.html`; a
   captions script groups words (2–4 a group, broken at punctuation and at silences over 0.18 s) into a caption layer.
4. `lint`, `check`, `snapshot` → a contact sheet a model or a person reads; one repair pass; then render, **only
   after a person approves**. Their own docs name the expected failure: _"passes every automated gate, fails human
   review."_

Their rules for authors are worth keeping whatever we build: one paused timeline; no `Date.now`, no unseeded random,
no `repeat: -1`; entrances with `fromTo`; the hero on screen by 0.5 s; **never write the narration's sentences as
on-screen text — the captions already show them**; for portrait, stack vertically and keep content in the top five
sixths, clear of the caption band.

## 3. The spike — two shots of the black-holes reel, remade

**What was made.** From run `12a097bf…`'s own files: shot 0's approved picture (`a1-shot-0-single.jpg`, 864×1536), each
shot's narration MP3, and the word timings the assembler burned as captions (`a1-render.ass`). Two compositions at the
reel's profile, 768×1366 at 24 fps, both with karaoke captions — groups of up to three words, the spoken word lit:

- **Shot 0 — the approved picture, animated.** A slow eased push with a drift (what the still-hold's `zoompan` does);
  a pull-in at "collapses" (7.04 s); at "explodes." (8.66 s) a flash, a shock ring and a push-out. The cues are the
  narration's own word timestamps.
- **Shot 3 — drawn in code only, no picture.** A seeded star field, a small black hole with a lit ring, then at "At the
  heart of nearly every galaxy" a spiral galaxy grows on a canvas and a larger black hole appears at "supermassive".

GSAP was copied in locally, so neither page loaded anything from the network at render time.

**What was measured** (Ryzen 7 5800H, 16 threads, Windows 11, hardware GPU, screenshot capture):

|                                                 | shot 0 — picture, animated                            | shot 3 — code only                                  |
| ----------------------------------------------- | ----------------------------------------------------- | --------------------------------------------------- |
| length                                          | 10.0 s, 240 frames                                    | 13.75 s, 330 frames                                 |
| render time, first run                          | **47.8 s** — setup 19.1, capture 16.5, encode 4.1 s   | **61.5 s** — setup 25.0, capture 22.7, encode 2.7 s |
| render time, again                              | 25.1 s (setup 6.0 s)                                  | —                                                   |
| file (ffprobe)                                  | H.264 768×1366 24/1 + AAC 48 kHz stereo, 6.0 MB       | the same, 2.9 MB                                    |
| **Gate 2's scan** (black ≥ 0.5 s, frozen ≥ 1 s) | **nothing found**                                     | **nothing found**                                   |
| same scan, looser noise tolerance (`n=0.003`)   | nothing                                               | three "frozen" stretches of 1.04–1.08 s             |
| loudness (integrated)                           | −14.5 LUFS                                            | −13.7 LUFS                                          |
| `hyperframes lint`                              | 2 warnings: two tweens overlap on one element's scale | clean                                               |

**Repeatability.** Two default renders of shot 0 (5 workers, hardware GPU) differed in **all 240 frames** — PSNR
45.8 dB on average, 42.8 dB at worst: identical to the eye, not in bytes. Two renders with `--workers 1
--no-browser-gpu` gave **byte-identical MP4 files** (same MD5), in 21.3 s and 66.9 s.

**What the frames show.** Shot 0 reads well: the approved picture, moving, with the flash and ring landing on
"explodes." and the lit word in the captions. It is what a still-hold could be. **Shot 3 is crude** — about fifteen
minutes of hand-written canvas code — and it fails at its one job: the small black hole and the supermassive one come
out nearly the same size on screen, so the scale the sentence is about is never shown. That is the honest cost of the
code path: **the visual is only as good as the craft of whoever writes it**, a person or a model.

**What setting it up ran into.**

- `npm i hyperframes`: 30 s. `hyperframes doctor` found the installed desktop Chrome and timed out asking its
  version; `hyperframes browser ensure` downloaded `chrome-headless-shell` 152.0.7977.30 into `~/.cache/hyperframes`,
  then hung. Pointing `HYPERFRAMES_BROWSER_PATH` at the downloaded binary worked.
- Captions asked for Arial rendered in a substitute face: the producer replaces a system font with one it embeds, so
  a real template must ship its own font file.
- A dark scene with slow motion sits near Gate 2's frozen threshold (shot 3's row above). A composed shot needs a
  motion floor, which Hyperframes' `check` can assert.
- The spike's files stay in the session scratchpad, not here: media is never committed (CLAUDE.md rule 4).

## 4. Where it could fit in the engine

Today, per shot: narration → a clip from the video port, up to three takes through Gates 2–5 → at the cap, hold the
approved picture or stop the reel (D-025, S-090) → one ffmpeg pass (D-054) → Gate 7. The places a composition could
enter:

```text
brief → plan (Gate 0) → pictures (Gate 1) → narration → clip takes, Gates 2–5 ──→ one ffmpeg pass → Gate 7 → MP4
          │                                               │  at the cap:              ▲       ▲
          │                                               ├─ hold the picture ◀── A: the composed hold
          │                                               └─ stop the reel    ◀── B: a composed shot instead
          └── the plan chooses a shot's kind ──→ C: a template shot ───────────┤       │
                                                 D: a model-written shot ─────┘       │
                                   the captions, from the word timings ──→ E: a caption layer
                          a transparent layer over an accepted clip ──→ F: graphics over a real clip
```

### A. The composed hold — the approved picture, animated (recommended first)

At the take cap, instead of `zoompan` on the chosen picture inside the one pass, render a **fixed template** — the
spike's shot 0 — with the picture, the shot's narration words and the span's length as variables, and hand the result
to the pass as if it were an accepted clip.

- **Fixes:** the plainest part of a finished reel; `STATUS.md` lists "the push on a held shot is unmeasured" as a known
  limit — a composed hold is a file Gate 2 can scan.
- **Risk: low.** No model writes code; no new words reach the screen; the picture already passed Gate 1 (S-040).
  The template draws no captions: the pass burns them over every shot, as today (S-073).
- **Touches:** `StillHoldShot` and its `zoompan` branch (S-097), and D-059's still-hold, which would need an S- entry
  superseding them in part; a new port (below); Gate 2 on the composed file.

### B. A composed shot where a reel would stop

`reel-pitfalls.md` lists under review: _"A text-made shot has no still to fall back on, so its third failed take stops
the reel"_ (P-003). A composed shot made from a template — the shot's subject drawn, and animated — could stand in
for it.

- **Fixes:** a reel that stops for one shot; run `879a27b7…` stopped exactly so.
- **Risk: medium.** The shot's `mustShow` criteria still have to be judged — by Gate 5's witness looking at a drawing.
  Whether a diagram "shows" _"a star torn into a swirl of gas"_ is a real question for the owner and for Gate 5, not a
  formality. A shot that claims an event mustShow can fail rung 3 today precisely because a still cannot show an event
  (D-043); an animated composition can show one, drawn.

### C. Template shots, chosen by the plan

A **closed set** of vetted templates — the way D-028's closed registry holds image models: _scale comparison_,
_labelled diagram_ (up to N parts), _timeline_, _kinetic quote_, _animated picture_. The planner chooses a template for
a shot and fills its variables; **the text on screen comes only from the narration's own words**, never from the
model (§5).

- **Gives:** what video models cannot do — exact labels, sizes to scale, dates on a line. Code spells a word exactly;
  a picture or video model cannot be trusted to. But a reel's `mustNotShow` binds a template as it binds a picture:
  the black-holes brief forbids "written words or labels", so a labelled template could not be chosen for that reel.
- **Risk: medium.** A new shot kind reaches the plan, Gate 0, the estimate, the render manifest and possibly the reel
  contract, which is frozen at version 1. The templates are code reviewed once, linted, and tested with the stand-ins.

### D. Model-written compositions — `faceless-explainer`'s way

The model writes each shot's HTML and JavaScript. The widest range, and what Hyperframes is built for.

- **Risk: high.** Model-written code runs in Chrome, which Hyperframes launches with `--no-sandbox` and **no request
  interception**. A composition can fetch at render time, and the compile step downloads any URL it names (HTTPS only,
  literal private addresses refused, DNS trusted). The brief is the caller's text, so a brief could steer the code.
  Quality varies from run to run, which is the very thing the gates exist to catch, and their own docs expect _"passes
  every gate, fails human review."_ Only after A and C have shown the path, if ever.

### E. A caption layer

Render the captions alone as a transparent overlay (WebM VP9 alpha or ProRes 4444) from the word timings, and composite
it in the one pass in place of the `.ass` burn.

- **Gives:** the caption styles the registry has — highlight, pill karaoke, pop — with the spoken word lit.
- **Risk: low; value: taste.** Today's captions work. An owner's call on the look, and cheap to try after A.

### F. Graphics over a real clip — realistic footage and exact drawing together

fal keeps making the realistic clip, exactly as today. For the shots that call for it, a template renders a
**transparent layer** (WebM VP9 alpha or ProRes 4444) of labels, arrows or a small diagram, timed to the shot's own
narration words, and the one pass lays it over the accepted clip — one more input to D-054's single invocation, not a
second pass. A real-looking black hole with its event horizon drawn and named at the word "horizon", for instance.

- **Gives:** what neither can do alone — the realism only a video model makes, and the precision only code has.
- **Risk: medium.** It puts new words on screen, so it waits on the owner's answer to §8's question 2, takes its words
  from the narration only (D-096), and is bound by the reel's `mustNotShow` like a picture is — the black-holes brief's
  "written words or labels" would forbid it there. Gates 2–5 judge the clip before assembly, so the overlay is judged
  only by Gate 7, in the cut — a question for its gates. It needs A's port and adapter first.

### Not recommended: Hyperframes as the assembler

It could place our clips as `<video>` elements and do the whole cut. That would unmake D-054 (one ffmpeg pass), D-055
(one profile, every input conformed), D-059 (the render manifest as the only input) and the verified `reel-render` — to
render slower (every clip's frames are extracted to images first) with more moving parts. Our ffmpeg pass already does
what the cut needs.

## 5. What it would have to respect here

**The port and the boundaries.** A composition is rendered by a process, so it belongs behind a port in
`packages/providers` (S-075, `processes-only-in-providers`), and the worker is handed it (S-038, S-021). A sketch, not a
design:

```ts
// packages/contracts — a type only
interface CompositionPort {
  /** Rejects naming a missing Chrome or ffmpeg, as MediaPort does (S-075). */
  ready(): Promise<void>
  /** Renders one template with its variables to an MP4 under the artifact root (D-086). */
  render(request: {
    runId: string
    takeId: string
    template: string
    variables: Record<string, unknown>
    durationSeconds: number
  }): Promise<{ clip: ClipRef; receipt: { template: string; costCents: 0; fake: boolean } }>
}
```

- **The pipeline stays pure.** Choosing a template and filling its variables is a pure function; so is writing a
  page's HTML as a string. Rendering is the port's. The stand-in writes an MP4 through ffmpeg, as the video stand-in
  does.
- **The adapter** writes the project folder under `.artifacts/<run>/`, then runs `hyperframes render` with an argument
  array (never a shell string), or calls `@hyperframes/producer`'s `createRenderJob` / `executeRenderJob`, which take a
  project directory, not an HTML string.

**No network at render time** — the ffmpeg adapter's property (S-075), which a Chrome adapter would have to earn:
vendor GSAP and every font into the template; set `HYPERFRAMES_NO_TELEMETRY=1`; point the font and frame caches inside
the repository (`HYPERFRAMES_FONT_CACHE_DIR`, `--frames-cache-dir`) rather than the home folder (D-086); and, because
Hyperframes intercepts nothing, prove it with a test that renders with the network unreachable.

**Chrome is a second machine dependency** next to ffmpeg: about 270 MB, pinned by version, downloaded once. A worker
would refuse to start without it, as it does without ffmpeg (S-075), and the environment traps in CLAUDE.md would gain
an entry.

**The gates still judge the file.** Gate 2 scans it for black and frozen stretches; Gate 3 has nothing to hear — a
composition renders no sound of its own, and a reel's only sound is its narration (S-158); Gate 5's witness judges
what it shows; Gate 7 judges the cut. Nothing measured is taken on trust because the renderer calls itself
deterministic.

**Repeatability is not byte-identity by default.** Anything that would rely on a re-render being the same bytes — a
cache, `resume-failed` (S-157) — needs one worker with software rendering, pinned Chrome and fonts, or must compare by
measurement instead.

**What the screen says is a claim.** KnowScroll's epistemic layer checks the narration's claims; the engine receives
the narration with opaque claim ids and the derived criteria — never a claim's text, a source or a truth state (D-096).
Text on screen beyond the captions — a label, a number — is a new claim the epistemic layer never saw, unless it is the
narration's own words. **Templates take their words from the narration only.**

**Copy voice.** No scores, no streaks, no percentages on screen (CLAUDE.md). The registry's charts, counters and
bar races are built to show figures — each would need checking against this before use.

**D-101.** No end card and nothing about sources: none of the registry's outros or call-to-action blocks.

**Portrait.** 12 of 164 blocks are 1080×1920 and none is our 768×1366. Templates would be written for the reel's own
profile (D-055) and rendered at it, so the one pass's conform has nothing to change.

## 6. What else it offers, beyond shots

- **A stand-in voice that speaks.** `hyperframes tts` runs Kokoro-82M locally, free and without a key (it needs
  `pip install kokoro-onnx soundfile`; not installed here). The narration stand-in writes a tone today; a spoken
  stand-in would make the free path's reels watchable.
- **A second opinion on word timings.** `hyperframes transcribe` (whisper.cpp, local — it must be built with cmake
  first; not installed here) gives word timestamps read from the audio itself. Run `ee63e617…` failed because
  MiniMax's word timings repeated "Sun." at a sentence boundary; timings read from the audio are an independent check
  on the provider's. (Their own notes: Whisper invents "Thank you." over silence.)
- **A preview player.** `<hyperframes-player>` plays a composition in a page — a possible preview surface for
  `video-edits`.
- **Rules worth borrowing** for any composed shot: the lint's determinism rules, `check`'s contrast and overflow sweep,
  the motion assertions (`appearsBy`, `staysInFrame`, `keepsMoving`).

## 7. Its weak points, as read

- **0.x and fast.** Docs disagree with the code in several places: the producer's README shows an API the code no
  longer has; the engine README's `acquireBrowser` signature is stale; the CLI docs say 256 MB a worker, the code sizes
  1.5 GB; the capture mode the determinism page describes is not the default.
- **Heavy.** Chrome per worker; about 25 GB a minute of raw frames at 1080p30 on the disk path. Fine for 40-second
  reels on this machine; it would matter at volume.
- **Craft-bound.** A code shot looks like motion graphics. Whether it looks _good_ depends entirely on the template or
  the model writing it, and the spike's own shot 3 shows how easily a quick one misses its point.
- **Not an alternative to cinematic clips.** Photoreal motion — gas swirling, a star exploding in 3D — stays the video
  model's job.

**Other code-to-video tools, named but not researched here:** Remotion (React; source-available licence), Motion Canvas
and Revideo (TypeScript, canvas-based, MIT), Manim (Python; the mathematical-animation library behind 3Blue1Brown's
explainers). If a composed shot is wanted, the choice between them is a written decision with its alternatives
(CLAUDE.md rule 2) — this file is research for that choice, not the choice.

## 8. For the owner — the questions before any gate

1. **Should a reel ever look like motion graphics** — a drawn diagram or typographic shot cut between cinematic clips —
   or only when a shot would otherwise stop the reel (B)?
2. **Text on screen beyond the captions:** allowed at all? If so, only the narration's own words?
3. **Is a free reel wanted** for the free path and for testing — composed shots with Kokoro's voice, no provider at all?
4. **Chrome as a second dependency** of the engine, next to ffmpeg — acceptable?
5. **Which first:** the composed hold (A), graphics over real clips (F), a composed shot where a reel would stop (B),
   or template shots in plans (C)? A first is recommended: it builds the port, the adapter, the stand-in and Chrome's
   check with the least at stake, and F, E, C and B each build on it.

If A is chosen, the next step is a feature file in `docs/features/` — the name `composed-hold` is a suggestion — with
the four gates written and adversarially reviewed before any code (CLAUDE.md rule 1), and the S- entries it would need:
the new port, Chrome as a dependency, and the part of D-059 and S-097 it supersedes.

## A whole reel from code — how a CPU works (2026-09-24)

The owner then asked for a whole reel made this way, on a new subject, in animated diagrams rather than anything
real-looking. Made outside the engine; nothing in the repository's code was touched. The files are in the ignored
artifact root, `.artifacts/hyperframes-cpu/`, the finished reel at `cpu-reel.mp4`.

- **Script:** six narrations, 146 words, written for it — the fetch–decode–execute loop; control unit, ALU, registers
  and clock; slow memory, fast caches, several cores; x86 in PCs against ARM in phones; transistors as switches wired
  into logic gates; wafers coated, exposed through a mask, etched layer after layer, cut and packaged. Spoken by
  MiniMax `speech-2.8-hd`, voice `English_Graceful_Lady`, through the repository's own narration adapter: six calls,
  838 characters.
- **Pictures:** none. Every frame is SVG drawn and animated by GSAP in six Hyperframes compositions sharing one small
  kit (colours, draw-on lines, pop-ins, word-keyed timing, captions lit word by word). Every cue is a narration word's
  timestamp.
- **Result:** 76.3 s, H.264 768×1366 at 24 fps + AAC 48 kHz, 7.1 MB, integrated loudness −14.2 LUFS. **Gate 2's scan
  finds nothing** once one fault was fixed (below); no silence of a second or more. Longer than D-111's 35–45 s,
  because the subject is broad — this reel was never an engine run.
- **Time:** each scene rendered in 17–20 s warm; the six together about two minutes; the join 6 s. Authoring was the
  cost: several hours of writing and checking scenes, frame sheet by frame sheet.

**What it ran into — each one a rule for any composed-shot feature:**

1. **MiniMax's word timings for "x86", "PCs" and "ARM" came back as 53 sub-word tokens for 23 words**, "x86" repeated
   six times — P-001's fault again, on the text this time. The captions re-join the tokens to the text's words
   (punctuation skipped, a run of identical whole-word tokens made one). The engine's stage would have refused the
   narration (S-070).
2. **A GSAP `fromTo` that sets a property only in its from-values drops it once the timeline is rewound past the
   tween** — measured: after seeking to the end and back to 0, the property stays at its pre-tween value on every later
   seek. The Hyperframes runtime rewinds, so every moving block of two scenes rendered invisible although lint passed
   and a plain forward seek showed them. Written as set, then move, then fade instead, and proved by a check comparing
   each scene's visible state at every half second, reached fresh and reached after a rewind: identical in five scenes,
   one fading ring at 6% opacity in the sixth.
3. **GSAP reads a `textContent` value like "x86" as a number to animate**, and rewinds it to "x0". Text is written when
   the element is built and only revealed by a tween.
4. **A diagram that holds still reads as frozen.** Scene 3 held still for 1.4 s between two cues, and Gate 2's scan
   flagged it in the joined reel. The blocks were started a second earlier. A composed shot needs a motion floor.
5. **Fills show before their strokes draw.** A draw-on animates the outline only; a filled shape must fade its fill in
   with it, or it sits on screen as a dark silhouette from the first frame.

## Reproducing the spike

In any scratch folder outside the repository:

```bash
npm i hyperframes@0.8.71 gsap@3
export HYPERFRAMES_NO_TELEMETRY=1
npx hyperframes browser ensure            # downloads chrome-headless-shell; if it hangs, set HYPERFRAMES_BROWSER_PATH
npx hyperframes lint shot0
npx hyperframes render shot0 -o out/shot0.mp4 --fps 24 --quality standard
npx hyperframes render shot0 -o out/w1.mp4 --fps 24 --quality standard --workers 1 --no-browser-gpu
ffmpeg -hide_banner -i out/shot0.mp4 -vf "blackdetect=d=0.5,freezedetect=d=1" -an -f null -   # Gate 2's scan
```

`shot0/` holds `index.html` (the composition in §2, with the cues of §3), and `assets/` with the picture, the
narration, a local `gsap.min.js` and a small captions script that turns the word list into lit groups of three.
