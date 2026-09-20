# 033 — reel-takes: Slice 4

- **For:** session 33
- **Feature:** `reel-takes` — [`docs/features/reel-takes.md`](../docs/features/reel-takes.md)
- **Work:** Slice 4 of 6 — the still-hold, rendered; checks 16–20, tests first; no journey
- **Written:** 2026-09-20, at the end of session 32, after `reel-takes`' Slice 3 was committed (cca9106)
- **Run:** session 33

Paste everything inside the block below as the session's first message.

```text
Build reel-takes' Slice 4 — the still-hold, rendered — and nothing from Slice 5 or 6. It proves checks 16, 17, 18, 19
and 20 of docs/features/reel-takes.md. Tests first: write each check's test, watch it fail for the reason it exists,
then write the code. reel-takes has six slices; this is the fourth, and no journey runs until Slice 6.

Start:
1. Run `node scripts/decisions.mjs`. If it says commits are unpushed in the steering repository, say so and stop.
2. Read CLAUDE.md; then JOURNAL.md's session 32 entry in full (Slice 3: the hold going on, StillHold, the probe at the
   ladder, the four labels through advanceClips and finishVideo, readRecord's order, S-103, the break campaign and what
   it caught), session 31's (Slice 2: the retries and the ladder, S-101 and S-102, and the two red suite runs on a
   loaded machine), and session 30's (Slice 1: the still_hold table, migration 0004, zoompan in PASS_FILTERS and the
   push setting).
3. Read docs/features/reel-takes.md: Gate 2's "The still-hold, in the one pass" in full — every clause of the manifest's
   still-hold shot, the one pass's picture, zoompan and silence, the `ready()` clause, the run on this machine and why
   the stand-in's border is 2 pixels — then "At the cap", "A held shot's labels", "Events and endings" and "What this
   feature changes in verified features"; Gate 3's file locations, the signatures for ClipShot, StillHoldShot,
   RenderShot, RenderInput.stillHolds, FakeImageEntry.border and readRenderInputs, and checks 16–20; and Gate 4's
   Slice 4 and Slices 5 and 6, so you know what is NOT yours: no kept work, no checkpoint, no restart (Slice 5); no
   endings sweep and no child-with-PATH test, no journey (Slice 6).
4. Decisions. In DECISIONS.md: S-097 in full — it is this slice's spine — then S-099 (above all its check 37 bullet,
   which is yours, and its check 48 bullet, which is Slice 5's), S-073 (a hold, which a still-hold is not, and what
   S-097 supersedes in it), S-098 (the labels this slice reads back), S-090 and S-103. In
   steering-ref/steering/DECISIONS.md: D-025 (the rungs, the slow push), D-054 (one decode, one encode), D-055 (every
   input measured with ffprobe), D-059 (the manifest and its schema), D-086 (the artifact root, no absolute path),
   D-008 (the duck), D-074 (Gate 7); and I-4, I-12 and I-17 in
   steering-ref/docs/founding/reel-creation-engine/contentions.md. Read each decision whole: sessions 20, 29 and 32
   each found a bar-(a) finding in a clause the quote left out.
5. Read the real code Slice 4 touches: packages/contracts/src/render.ts (RenderShot today — one interface, which
   becomes the union) and src/settings.ts (stillPush, already there); packages/pipeline/src/render/manifest.ts
   (renderManifest, renderManifestSchema, RenderInput) and render/index.ts (cutReel, DEFAULT_RENDER_SETTINGS);
   packages/providers/src/ffmpeg/assemble.ts (pictureOf, soundOf, ffmpegAssembler — the filtergraph a still-hold shot
   joins) and ffmpeg/tools.ts (PASS_FILTERS already holds zoompan, REQUIRED_FILTERS with it);
   packages/providers/src/fake/image.ts (the solid-colour PNG keyed from the picture id, SIZE 90 × 160 — where `border`
   goes); packages/domain/src/clips.ts (RenderInputs and readRenderInputs) and src/pictures.ts (readRecord's
   degradations, in the order Slice 3 set); apps/worker/src/assemble-job.ts. And the tests that read or build what
   changes: tests/engine/render.ts (bandOf, bandColours, takeOfFrames, shotStarts, thumbnails, rowLevel, toneDb,
   measured, clipProbe — the measuring this slice's checks use), tests/engine/video.ts, tests/engine/stills.ts,
   tests/reel-render-cut.test.ts (check 37, the source read), tests/reel-render-shapes.test.ts (its shot builder) and
   tests/reel-render-manifest.test.ts (its rows), tests/reel-takes-hold.test.ts and tests/reel-takes-labels.test.ts
   (Slice 3's, which must stay green).
6. Baseline: `node scripts/check.mjs` green, 332 tests by a TAP count (cca9106). The suite takes about 230 s here, most
   of it reel-render's check 50 child — which overran its 300-second bound twice in session 31 while something outside
   this repository held the CPU. Check the machine is quiet before timing anything, and expect this slice to add real
   encodes.

What Slice 4 builds (Gate 4, Gate 3's signatures, S-097, S-099):
- `RenderShot` as `ClipShot | StillHoldShot` in packages/contracts/src/render.ts, each branch making the other's fields
  `never` as Gate 3 writes them, and the manifest's schema refusing a still-hold shot with no reason, with other than
  three takes, or carrying any clip field — and a clip shot carrying a `stillHold`. D-059's check, which S-073 left to
  this feature.
- `renderManifest` building a still-hold shot in its place in plan order from the run's `still_hold` row and the probe
  it holds — never re-probing: the geometry comes off the stored probe, as a clip's comes off its measured facts. Its
  verdicts are its picture's (Gate 1, and 1S where it ran) then its three takes' (Gates 2 to 5 in order, with
  coverage); its push is `RenderSettings.stillPush.endZoom`. `readRenderInputs` returns the still-holds, each with its
  probe. No shot is removed (I-12).
- The one pass taking both kinds of shot: the picture scaled to fit and padded from its probe, `setsar`, the profile's
  rate and format, then `zoompan` making exactly the span's frames, 1 at the first to `endZoom` at the last, centred;
  silence for the span with the shot's narration mixed over it, the span's samples exact. Joined by the same `concat`
  in the same filtergraph, captions burned over it — one decode, one encode (D-054). The assembler, the assemble job
  and `cutReel` take the union.
- The stand-in image's `border?: true` — a 2-pixel border of another colour, the width session 29's run measured (a
  push to 1.1 takes about 4.1 of the stand-in's 90 pixels from each side, so 2 is gone by the last frame and 4 is not).
- The completed result's and the record's degradations in one order — the stills', then the still-holds, then the holds
  — with a still-hold's reason and a hold's kept apart (S-098, S-073).
- reel-render's check 37 widened exactly as S-099's bullet says: `shot.stillHold.probe.video` a second measured source
  beside `shot.clip.video`, every other read still refused, the grep unchanged. The type-only support in two verified
  test files: tests/reel-render-shapes.test.ts' shot builder taking a clip shot's opening, and
  tests/reel-render-manifest.test.ts' rows carrying `stillHolds: []`. Neither is an assertion; no assertion is removed.
- The checks, in tests/reel-takes-*.test.ts, each test titled with its check's number and words as Gate 3 writes them:
  16 (compiled by TypeScript in the test, and the schema's four refusals plus a manifest holding both kinds), 17 (the
  manifest of a run with a held shot, read whole), 18 (the output, MEASURED — the span's frames, its picture's colour
  in every frame and no take's band in any, the bordered picture's border at the first frame and gone by the last, the
  clip tone absent under the narration's, and the file's frame count the manifest's total), 19 (a completed run with
  both a held shot and a clip held to its narration: both degradation lists, both reasons, one still_hold row and one
  hold row, no shot with both), 20 (the assembler run again over the stored manifest under another artifact root —
  same duration, frame count and shot boundaries — and Gate 7 shown the held span's first, middle and last frames).

How to work:
- Red first, per check, and write down what each red said. Check 18 and check 20 are measurements, not manifest reads
  (S-073): assert what ffprobe and the extracted frames say, never what the manifest claims.
- Slice 3 left renderManifest failing a held run "has no accepted take to render" — reel-render's own fault. This slice
  replaces it. Before writing code, run tests/reel-takes-hold.test.ts and note which of its runs reached a render at
  all, so you know what changes under you.
- The holdable shots are THREE_RANKS' shot 1 (the barons, a chosen picture, presence mustShow `show-crowd`) and shot 2
  (seal and hall, a chosen picture, no claim); shot 0 claims an event and shots 3 to 5 are made from words. Fixtures
  are chosen so the colours a check tells apart differ — the stand-in's band and picture colours are keyed from ids,
  and two can be too alike to tell apart (session 28). Check the pair you pick before you assert on it.
- A choice between real alternatives the gates leave open — where the still-hold shot's frames come from when the
  narration's and the span's disagree, how the picture input is ordered among the pass's inputs, whether the schema
  refuses by branch or by field — is recorded as an S-entry only if it is a real choice with a rejected option and a
  way it is caught. The next free number is S-104.
- If building finds a verified check or a gate that cannot hold as written — a reel-render check the union turns red
  beyond S-099's list, a zoompan frame count that is not exactly the span's — STOP on that point: record it, and ask
  the owner with AskUserQuestion, a recommended option first, rather than weakening a check or editing an approved
  gate. The approved Gates: line does not change.
- Once green, run a break campaign as sessions 30, 31 and 32 did — the runner in .tmp/campaign/ (move session 32's
  breaks.mjs, chunk logs and results.jsonl aside to s32/ first; the break list exports its default TESTS and each
  file's COUNTS): each break's files saved as bytes and fsync'd to a record before touching them, restored from those
  bytes and read back, the record removed; every modified and untracked file fingerprinted after each restore; a
  refusal to start while a record exists; each break's own tests run, and counted. Break each clause at least once —
  among them: the still-hold shot dropped from the manifest, or put at the end rather than in plan order; its probe
  re-taken rather than read off the row; zoompan given a `d` that is not the span's frames; the push fixed at 1
  or read from the wrong setting; the picture not padded, or its aspect not kept; the silence lowered by the duck; the
  narration not mixed over it; the schema accepting a still-hold shot with two takes, with no reason, or with a clip
  path; a clip shot carrying a stillHold accepted; the degradations ordered still-holds before stills; a still-hold
  written as a hold row; check 37's second source widened to any probe — plus a control caught by nothing. Record what
  each break was caught by, and fix — by ADDING — any break caught by nothing that a check's words promise to catch.
  Run the campaign inside one turn: the stop-gate runs check.mjs --code when a turn ends.
- Tick Slice 4 in docs/features/reel-takes.md only when checks 16–20 pass by number, 1–15 and every reel-render,
  reel-stills, reel-plan and reel-contract check still pass, and check.mjs is green.

Traps, each already paid for:
- A Windows path inside a filtergraph needs its `:` and `\` escaped; one given as an input or output argument does not.
  Start ffmpeg with an argument array, never a shell string. The detectors a scan parses report on stderr at info
  level, so no quieter log level.
- zoompan is measured, not assumed: it made exactly 50 frames at `d=50` in session 29's scratchpad run, on a picture
  already through `scale` and `setsar`. Keep that order, and count the frames in the file.
- A heredoc or `node -e` text holding backticks, apostrophes or backslashes can end early, run nothing, or arrive cut.
  Write such text with the editing tool.
- Shell tooling halves backslashes, and sed/grep in Git Bash strip `\r`. Verify a file's bytes, not the command typed.
- No absolute path is written anywhere (D-086): check 20's second artifact root is a setting, not a path in a manifest.
- D-096 bans the field names source, sources, truthState, claimText and exposure anywhere; reel-render's check 5 bans a
  type or field named manifest or endCard.
- node:sqlite's rows have a null prototype: hand plain objects to a deepEqual. `@cutroom/domain` does not resolve from
  tests/; a test importing it uses the package's src/index.ts by relative path.
- Leave no untracked file at the repository root; journey.mjs refuses a dirty tree.

Out of scope: anything from Slices 5 and 6 (above); the narration guard's every-send rule (S-101's Not handled); check
4's second restart, which Slice 5 moves (S-100); reel-render's check 48 (Slice 5); video-edits' gates; the paid-path
feature; the steering stubs and the pin (S-033); reel-script's criterion type (S-029).

Finish:
- `node scripts/check.mjs` green, with the new test count stated by a TAP count.
- A JOURNAL.md entry: intent; what changed (files, S-entries, the test support that changed, +N tests); observed — each
  red and what it said, what the measurements gave (frame counts, the border at first and last frame, the tone),
  check 37's widening and the two typed test files, the break campaign's table with what each was caught by, anything
  caught by nothing and what was done; next (Slice 5 — a restart picks up where it stopped: checks 21–24).
- Set this prompt's Run line to session 33 in PROMPTS/033-reel-takes-slice-4.md and in PROMPTS/README.md (S-065).
- Commit as `feat(reel-takes): Slice 4 — the still-hold, rendered`.
- If the owner asks for Slice 5's prompt, write it in PROMPTS/ as S-065 says.
```
