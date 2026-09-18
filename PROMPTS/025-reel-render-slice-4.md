# 025 — reel-render: Slice 4

- **For:** session 25
- **Feature:** `reel-render` — [`docs/features/reel-render.md`](../docs/features/reel-render.md)
- **Work:** Slice 4 of 6 — assembly, Gate 7 and a video; checks 29–41, tests first; no journey
- **Written:** 2026-09-18, in session 24, after `reel-render`'s Slice 3 was committed (34380f2) and pushed
- **Run:** not yet

Paste everything inside the block below as the session's first message.

```text
Build reel-render's Slice 4 — assembly, Gate 7 and a video — and nothing from Slice 5 or later. It proves checks 29 to
41 of docs/features/reel-render.md. Tests first: write each check's test, watch it fail for the reason it exists, then
write the code. reel-render has six slices; this is the fourth — thirteen checks, the one ffmpeg pass, the frame strip,
Gate 7, and the first video run that completes. Most of these checks MEASURE the output file; none reads the manifest
back as its own evidence (Gate 3). No journey runs until Slice 6.

Start:
1. Run `node scripts/decisions.mjs`. If it says commits are unpushed in the steering repository, say so and stop.
2. Read CLAUDE.md; then JOURNAL.md's session 23 entry in full (Slice 3: what it built that no check asserts — the
   assembler's and the frame strip's "not built" throws, the render and hold tables nothing writes, the take's
   degradation column nothing writes; what freezedetect and a black box measured; the four faults of its own tests; the
   campaign stopped by the system for low memory at break 77 and resumed with --test-concurrency=6; a break that hangs a
   run leaving check 19's folder in .artifacts/; S-081's clips-job ending cost still checked by nothing; 19e owed to
   check 48), session 22's (S-081, S-082), and session 18's (reel-stills' Slice 4: a degraded shot's four labels written
   with whatever ending the run reaches, S-058 — a hold is labelled the same way).
3. Read docs/features/reel-render.md: Gate 2's "The render manifest", "Spans, trims and holds", "The one pass", "Gate 7",
   "How a video run ends", "Cancel, and a restart", "The ports", "ffmpeg and ffprobe", "Media files", "Storage" and
   "What this feature changes in verified features"; Gate 3's file locations, every signature Slice 4 builds
   (RenderShot, RenderManifest, AssembledFile, CutVerdict, renderManifest, CutOutcome, cutReel, MediaPort.frames,
   startRender, finishVideo's render argument, readRenderInputs) and checks 29–41; Gate 4's Slice 4; and Slices 5 and 6,
   so you know what is NOT yours: no guard comparison, budget stop, question entry or refusal for a narration or clip
   call (42–45); no thrown-port sweep and no short judge answer check (46) — cutReel never rejects and a judge answer
   that does not parse fails the run from this slice on, but 46 asserts it; no every-ending events check (47); no worker
   killed mid-clips or at Gate 7 (48, 49); no PATH-alone child (50); no journey.
4. Decisions. In DECISIONS.md: S-073 and S-074 in full, above all — what each supersedes in D-054 to D-059, and each
   one's Rejected; then S-066, S-067, S-068, S-069, S-075, S-076, S-077, S-081 and S-083; and S-019, S-025, S-027, S-036,
   S-037, S-042, S-046, S-055, S-058. In steering-ref/steering/DECISIONS.md: D-008, D-025, D-036, D-051, D-052, D-054,
   D-055, D-056, D-057, D-058, D-059, D-064, D-086, D-087, D-098, D-101; and I-4, I-6, I-12, I-16, I-17 and I-18 in
   docs/design/contentions.md.
5. Read the real code Slice 4 touches or copies: packages/contracts/src (render.ts, clip.ts, narration.ts, settings.ts,
   model.ts); packages/pipeline/src (render/index.ts — DEFAULT_RENDER_SETTINGS and where cutReel goes; render/manifest.ts
   — the schema Slice 1 wrote, which renderManifest's answer must parse under; clips/index.ts — makeClips is cutReel's
   pattern for never rejecting; clips/ids.ts; gates/gate1s.ts — a judge's answer typed unknown and parsed at the gate;
   gates/index.ts); packages/providers/src (ffmpeg/tools.ts — REQUIRED_FILTERS, which gains the pass's and the strip's;
   ffmpeg/media.ts — probe, and the frames throw this slice replaces; ffmpeg/assemble.ts — the throw this slice
   replaces; artifacts.ts — the one path refusal; fake/video.ts — the take-keyed band, the shaded lower third, the
   220 Hz tone and the script's length, size, rate, sample rate and missing stream; fake/narration.ts — the 660 Hz tone;
   fake/model.ts — judgeCut, answered from the `judge` script in call order, the script `compare` also reads);
   packages/domain/src (schema.ts — render and hold, already migrated in 0003; runs.ts — finishVideo, advanceClips,
   startStage, spentCents; clips.ts — readClipsInputs is readRenderInputs' pattern; pictures.ts — readRecord and how a
   degraded picture's four labels are written; ledger.ts); apps/worker/src (assemble-job.ts — the placeholder this slice
   replaces, handed nothing but the database and the job today; clips-job.ts; keyframes-job.ts — degraded events and a
   completed result; recording-port.ts — judgeCut recorded; worker.ts — what each job kind is handed); and the tests
   that build or assert what changes: tests/engine/harness.ts (TEST_RENDER_SETTINGS, the four ports, no way yet to wrap
   the assembler or the media port), worker-process.ts, video.ts (videoScript's judge answers, videoFinished's 90
   seconds, readVideo) and stills.ts; tests/reel-render-cancel.test.ts (check 11's second test: no render row and no
   manifest handed to the assembler — live from this slice); tests/reel-render-advance.test.ts (check 27 reads the clips
   job's writes with no assemble job run after them); tests/reel-render-names.test.ts and reel-plan-shapes.test.ts
   (the banned names); tests/reel-render-files.test.ts (check 19: no subtitles file tracked, none under tests/);
   tests/reel-render-readiness.test.ts (check 12's filter case hands its own list);
   tests/reel-stills-derived-repair.test.ts (check 38 there: the four labels, the result's and the record's
   degradations).
6. Baseline: `node scripts/check.mjs` green, 230 tests (this prompt's commit). Then run `ffmpeg -version` and
   `ffprobe -version`: 8.1.1 on PATH on 2026-09-18. If either does not run, say so and stop (S-075).

What Slice 4 builds (Gate 4, and S-077 for the verified side):
- packages/pipeline: render/manifest.ts — renderManifest: every shot of the selected plan in plan order, its opening in
  one of three forms, its take, narration, word timings and the clip's measured facts, its span
  (ceil(narration seconds × fps), starting where the last ends), picture frames and hold, its conform notes (a pad, a
  frame-rate conversion, added silence — none for a scale or a resample alone), every verdict decided before assembly
  with coverage (Gates 1 and 1S where its picture had them, Gates 2 to 5), the captions in reel time, the profile, the
  gate profile that ran, the caption style, the duck level, the cost ledger and totalFrames; it throws on rows that
  cannot make one. gates/gate7.ts. render/index.ts — cutReel, which never rejects: assemble, measure, the output check
  naming its difference, the strip, one judgeCut, the verdict.
- packages/providers: ffmpeg/assemble.ts — ONE ffmpeg invocation: the conform from the manifest's measured facts alone,
  each shot's picture trimmed or held to its span, its clip's sound fitted and lowered by the duck level, its narration
  fitted, the two mixed, the shots joined by the concat FILTER inside that one filtergraph, captions burned by the `ass`
  filter from a subtitles file it writes beside the output, H.264 and AAC at the profile with -movflags +faststart; the
  answer's invocations holding exactly that one; the run and render id refused when their path would leave the root.
  ffmpeg/media.ts — frames, real, as PNGs <root>/<runId>/<renderId>-frame-<n>.png, with the same refusal.
  ffmpeg/tools.ts — REQUIRED_FILTERS gaining exactly the filters the pass and the strip use.
- packages/domain: clips.ts — readRenderInputs (the finishing clips attempt's takes and narrations, the chosen pictures
  with their verdicts, the stills' degradations, the ledger); runs.ts — startRender, writing the render row with its
  manifest, hash and start time BEFORE the assembler is called, and finishVideo's render argument: the output, the
  invocations, the measure, Gate 7's verdict and the finish time on the render row, and each hold's four labels — a hold
  row, the take row's degradation, its video receipt marked degraded, a degraded event — with whatever ending the job
  reaches (S-058); pictures.ts — readRecord listing the latest render's holds in shot order after the degradation rows.
- apps/worker: assemble-job.ts — the cancel read it has, then readRenderInputs, renderManifest (a throw fails the run),
  the hash, startRender, cutReel with the assembler, the media port and the recording model port, then the events — a
  degraded event for each hold in shot order, a verdict for gate '7' with no shotId, stage.finished for video and
  run.finished when it accepts — and the result: completed with `video` the render's absolute path and degradations the
  stills' then the holds'; stopped for rule gate-7 at step video with the file and the render row kept, no video and no
  question; or failed. Its context holds no image, narration or video port (I-18, check 40). worker.ts handing it that
  context.
- Test support, no assertion: a judgeCut answer in videoScript so a run of passing takes completes; a way for a test to
  wrap or script the assembler and the media port in tests/engine/harness.ts and worker-process.ts (check 41 needs an
  assembled file that differs from its manifest; nothing offers one today); readers in tests/engine/ for the render and
  hold rows, the output's shot boundaries by the take-keyed band, the caption band's brightness, and the two tones'
  levels. docs/features/reel-contract.md gains its note naming S-077 — the real engine now answers until 'video'.
  CLAUDE.md only where a sentence in it stops being true.
- The checks, in tests/reel-render-*.test.ts, each test titled with its check's number and words as Gate 3 writes them.

How to work:
- Red first, per check, and write down what each red said. A test file that fails to link is red for every test in it at
  once: say so. Check 11's render-row clause was green before any code in Slice 3 because nothing wrote a render row;
  from this slice it can fail — break it (below). A change that is test support only cannot be red: say which.
- A workable order: the manifest as a pure function (29's shape, 30's spans, 33's captions, 35) with hand-written rows;
  startRender and the hash (29); the pass at the small profile (31), then the conform (32), captions burned (33), the
  duck (34), the replay (36), the source check (37); the output check (41); frames and Gate 7 (38); finishVideo, holds'
  labels and the record (30); the result and events (39); I-18 (40). If it becomes clear the slice will not fit in this
  session, stop at a green state and ask the owner with AskUserQuestion — do not tick the slice, commit it as done, or
  cut it yourself.
- Look for collisions while reading, before writing a test. Points checked on 2026-09-18, each worth a look:
  - fake/model.ts answers judgeCut from the `judge` script in call order — the script Gate 1S's compare reads — and
    videoScript passes only the stills' judge answers. So every Slice 3 test whose clips stage completes will now run a
    real assemble job that fails at judgeCut for want of an answer. None of them asserts that ending (they look for a
    reel.assemble row), but each now spawns the pass, a probe and the strip: say which tests' runs change, and what a
    default cut answer in videoScript changes for them. No assertion is removed.
  - the fixtures' narrations are 18, 14, 6, 6, 4 and 10 words at half a second a word — 9, 7, 3, 3, 2 and 5 seconds, 29
    in all — and their clips ask for 9, 7, 5, 5, 5 and 5: by default every clip is at least its narration, so NO shot
    holds. A hold needs fakeVideo's scripted length.
  - TEST_RENDER_SETTINGS spreads DEFAULT_RENDER_SETTINGS, so at 108 × 192 the caption style is still fontSize 48 and
    marginV 200 — taller than the frame. Whether the subtitles file is written against the profile's geometry or a
    reference the style is sized for decides whether a caption lands in the frame and in the stand-in's shaded lower
    third, which check 33 measures. A real choice: an S-entry, or a test profile's own caption style as support.
  - the take-keyed band is at the top of the stand-in's frame. A pad moves it, and at the default profile a 108 × 192
    clip into 768 × 1366 is a scale AND a pad (0.5625 against 0.5622, inside the 1% tolerance). H.264 in yuv420p shifts
    colours: compare bands with a tolerance, on decoded frames, and read fake/video.ts for the band before writing the
    boundary reader.
  - check 31 wants the frame count EXACT and each band beginning exactly at its start frame: a frame-rate conversion, a
    trim, a held last frame and the concat filter must add up frame for frame, and each shot's sound must be exactly its
    span or the join drifts. Count with ffprobe -count_frames, as the probe does.
  - check 36 renders a stored manifest under ANOTHER artifact root: its clip and narration paths are absolute under the
    first root. The refusal Gate 2 asks of the assembler is of a run or render id whose OUTPUT path would leave its root,
    not of an input the manifest names.
  - the pipeline imports no Node module (session 23 wrote the CRC-32 there for that reason), and startRender is handed
    the hash: where it is computed, and over exactly which bytes, decides whether check 36's "the stored manifest's
    hash is unchanged" can be recomputed from the row. Hash the text that is stored.
  - reel-render's check 5 refuses a TYPE or FIELD named manifest or endCard and exempts variables and functions;
    reel-plan's check 5 refuses source, sources, truthState, claimText, exposure, beat and beats for EVERY kind of name,
    variables, object-literal keys and Drizzle columns included. An ffmpeg input is never `source`.
  - check 37 reads live source in apps/ and packages/ for -f concat, -c copy, -c:v copy, hls, m3u8 and
    -hls_segment_type. None occurs there today, comments included: a comment in the assembler saying what it avoids
    would be the first. Decide whether "live" strips comments, say so, and match `hls` so that no ordinary word can hit
    it. The concat FILTER is legal and the check must tell it from the demuxer and the protocol.
  - .gitignore names *.mp4, *.wav and *.png and no subtitles extension; the assembler writes a subtitles file under the
    artifact root, which is ignored as a folder. Check 19 (verified) asserts none is tracked and none is under tests/.
    Adding an ignore line is not an exception; an `!` line is.
  - the contract is strict: a degraded event and a Degradation are { shotId, reason } and nothing else, and VideoRef is
    { path }. A hold's seconds ride in its row and on its manifest shot, not in the contract's entry.
  - this machine's ffmpeg has ass, subtitles, concat, scale, pad, fps, setsar, format, trim, tpad, setpts, atrim, apad,
    aresample, aformat, asetpts, amix, volume, anullsrc, select, crop, signalstats, astats, bandpass, volumedetect and
    showinfo. REQUIRED_FILTERS lists what the code uses, not what is available.
  - time and memory: videoFinished waits 90 seconds, every completing run now adds a 29-second encode, and check 31's
    last case encodes it at 768 × 1366. A longer wait is test support, not a weakened check — say where and why.
  - anything S-077 missed: grep tests/ for every implementation of AssemblerPort and MediaPort, and for
    `runAssembleJob(`.
  If building finds a verified check or a gate that cannot hold as written, STOP on that point: record it, and ask the
  owner with AskUserQuestion, a recommended option first, rather than weakening a check or editing an approved gate.
  Nothing about the approved Gates: line changes.
- A choice between real alternatives the gates leave open — the filtergraph's recipe, how a hold is made, the subtitles
  file's reference geometry, where the hash is computed, how a tone's level is measured — is recorded as an S-entry only
  if it is a real choice with a rejected option and a way it is caught. The next free number is S-084.
- Once green, run a break campaign as sessions 19 and 21 to 23 did: a runner in the scratchpad that saves each file's
  bytes (fsync'd) to a record before touching it, restores from those bytes and reads them back, fingerprints every
  modified and untracked file after each restore, refuses to start while a record exists, and checks that every find
  occurs once before a chunk starts. Carried lessons: pass a custom reporter as a file:// URL or use the built-in TAP
  one, and require the counts — a suite that prints none is a runner fault, not a catch; always --test-timeout; BOUND
  THE MEMORY FROM THE START — session 23's chunks were stopped by the system at break 77 — with --test-concurrency=6 and
  few chunks at once; after each chunk confirm no record is left and .artifacts/ is empty. Every break runs typecheck
  and every test file; session 23 left out only the two PATH-alone roll calls (reel-plan 47, reel-stills 50) — if you
  narrow the files a break runs, say which. Break each rule of each check at least once — a shot dropped from the
  manifest, or out of plan order; a join mode missing; each of the three openings wrong; conform notes or a verdict's
  coverage dropped; the gate profile a constant rather than the one that ran; a ledger of zeros against scripted costs;
  a relative path; the row's hash another text's; the row written after the assembler is called; the assembler's and
  the strip's refusal removed; a span rounded down, or every span starting at 0; a trim labelled; each of a hold's four
  labels dropped, the hold left off its manifest shot, holds listed before the stills' degradations in the result and
  in the record, or an earlier render's holds listed; a second invocation; a frame count or a boundary one frame off;
  no +faststart; a segment file written; each conform note dropped, and a note for a scale alone and a resample alone;
  a caption a sentence, without its shot's offset, offset twice, or not burned; the duck level ignored, applied to the
  narration, or only while a word is spoken; later shots' starts not moved; the assembler reading a setting, a database
  or the clip itself for a fact the manifest holds; a replay writing over the first file; two judgeCut calls, another
  role or temperature, shots out of timeline order, three frames that are not start, middle and end, sentences left
  out, four questions, coverage without its number, a `no` accepted, a gate-7 stop that removes the file or the row,
  carries a video or writes a question; each field of the completed result wrong, a verdict for gate 6 or 8, gate 7's
  with a shotId, no stage.finished for video; startRender after the assembler, the assemble job handed a video port;
  each of a frame count, a profile field and mdat first accepted, or failed without naming it; a render row written
  before the cancel read (check 11's clause) — plus a control that should be caught by nothing. Record what each break
  was caught by, fix by ADDING any break caught by nothing that a check's words promise to catch, and say which are owed
  to a later slice's check. Run the campaign inside one turn: the stop-gate runs check.mjs --code when a turn ends, so
  never end a turn with a break applied — wait on each background chunk with a foreground waiter whose end condition is
  the runner's own completion line, not a pattern a test title can contain.
- Tick Slice 4 in docs/features/reel-render.md only when checks 29–41 pass by number and check.mjs is green.

Traps, each already paid for:
- A heredoc or `node -e` text holding backticks or apostrophes can end early and run nothing. Write such text with the
  editing tool.
- Shell tooling halves backslashes, and sed/grep in Git Bash strip `\r`. Verify a file's bytes, not the command typed.
- Start a tool with an argument array, never a shell string. A Windows path INSIDE a filtergraph — the `ass` filter's
  file name — needs its `:` and `\` escaped; one given as an input or output argument does not. Verify by a burned
  caption measured in the output, not by ffmpeg's exit code.
- ffmpeg's detectors report on stderr at info level, and a font warning from the `ass` filter is on the same stream:
  read what you parse, ignore the rest, and do not quiet the log level.
- freezedetect reads a freeze a few frames short; -af on a clip with no audio stream is ignored, not an error: the
  conform must ADD silence, and note it.
- TypeScript checks a fresh object literal for excess properties and a variable not at all (session 21's check 1).
- `@cutroom/domain` does not resolve from tests/; a test importing it uses the package's src/index.ts by relative path.
- A held call that never arrives hangs its file until the timeout: fail once the run finishes first, as whenHeld does.
- Leave no untracked file at the repository root; journey.mjs refuses a dirty tree.

Out of scope: anything from Slices 5 and 6; S-081's clips-job ending cost (still unchecked — say so again unless a
Slice 4 check's words promise it); break 12f, no encoder compared, which no check's words name; reel-takes' and
video-edits' gates; the steering stubs and the pin (S-033); reel-script's criterion type (S-029).

Finish:
- `node scripts/check.mjs` green, with the new test count stated.
- A JOURNAL.md entry: intent; what changed (files, S-entries, the verified checks and test support that changed, +N
  tests); observed — each red and what it said, what Slice 4 builds that no Slice 4 check asserts, what was measured
  rather than assumed, the break campaign's table with what each was caught by, anything caught by nothing and what was
  done, any collision with a verified feature; next (Slice 5 — spending and faults; checks 42–47).
- Set this prompt's Run line to session 25 in PROMPTS/025-reel-render-slice-4.md and in PROMPTS/README.md (S-065).
- Commit as `feat(reel-render): Slice 4 — assembly, Gate 7 and a video`.
- If the owner asks for Slice 5's prompt, write it in PROMPTS/ as S-065 says.
```
