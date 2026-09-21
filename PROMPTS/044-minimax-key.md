# 044 — why the subscription key works in a coding agent and not in this engine

- **For:** session 44
- **Feature:** none — research and a decision. No feature file, no slice, no journey.
- **Work:** find out what OpenCode, Hermes and pi send that we do not, and make our adapter send it — or
  establish that they cannot and say what does
- **Written:** 2026-09-21, at the end of session 43
- **Run:** not yet

**Slice 8 is built, green and committed. The reel is blocked on one fact.** Every MiniMax generation call
answers `402 insufficient balance (1008)`, while `GET /v1/models` on the same key answers **200**. The owner
reports the **same key works in OpenCode, Hermes and pi** — so the entitlement exists and something about our
request shape is not reaching it.

**Session 43 already ruled these out by measurement.** Do not re-run them:

| Axis                                         | Result                                                       |
| -------------------------------------------- | ------------------------------------------------------------ |
| `GET /v1/models`, `GET /anthropic/v1/models` | **200**, lists M3 and M2.7 — auth and account are fine       |
| `POST /v1/chat/completions`                  | 402 on M3, M2.5, M2.7, M2, M2.7-highspeed                    |
| `POST /anthropic/v1/messages`                | 402 on the same five, Bearer **and** `x-api-key`             |
| `POST /v1/t2a_v2`                            | HTTP 200 carrying `base_resp.status_code: 1008`              |
| `api.minimaxi.com`, `api.minimax.chat`       | **401 invalid api key (2049)** — so it is a `minimax.io` key |

**The strongest untested hypothesis is a REQUEST HEADER.** Reading the account works and generating does not,
on every wire and every model — which is the shape of an entitlement keyed on something other than the URL, the
model or the credential. Coding-plan traffic is commonly identified by a source header or a user agent, and
`stream: true` is a second candidate: some plans honour only streaming. Both are cheap to test and either would
explain the whole picture.

Paste everything inside the block below as the session's first message.

```text
Find out why our MiniMax subscription key returns 402 insufficient balance from this engine while the SAME KEY
works in OpenCode, Hermes and pi. Research their codebases and MiniMax's docs, form hypotheses, TEST THEM
against the live API, and then either make our adapter send what they send — as a recorded decision — or
establish that it cannot be done and say exactly what the owner must change.

This is a research session. No feature, no slice, no journey. It may end in a decision and a small change to
packages/providers/src/minimax/, or it may end in a finding the owner takes to MiniMax.

Start:
1. `node scripts/decisions.mjs`. If it says commits are unpushed in the steering repository, say so and stop.
2. Read CLAUDE.md; then JOURNAL.md's session 43 entries, BOTH of them — the slice and the continuation that
   records every axis already ruled out. Do not re-measure what is already measured.
3. Read D-006 and D-019 in steering-ref/steering/DECISIONS.md. D-019 recorded, from a real call on 2026-09-03,
   that "the token-plan key covers all three" text models and that T2A "IS covered by the owner's token plan".
   That is the claim that has stopped holding, and what you find may supersede it.
4. Read packages/providers/src/minimax/model.ts and wire.ts — what we send today, header for header.

WHAT IS ALREADY KNOWN, so do not spend the session re-deriving it:
- The key is a minimax.io key. minimaxi.com and minimax.chat both answer 401 invalid api key (2049).
- GET /v1/models and GET /anthropic/v1/models answer 200 and list MiniMax-M3 and MiniMax-M2.7.
- Every POST that would generate answers 402 (1008), on both wires, on five model names, with Bearer and with
  x-api-key. T2A answers HTTP 200 carrying base_resp 1008.
- MiniMax's own docs say the Token Plan covers "the full MiniMax lineup (M3 / M2.7 / image / speech)" and
  excludes MiniMax H3 — which is exactly what D-007 says, so our architecture already matches the plan's shape.
- .tmp/wireprobe.mjs, .tmp/regionprobe.mjs and .tmp/modelprobe.mjs are session 43's probes. They load the
  environment through loadEnvFile, never print a key, and live in .tmp so the key scan skips them. Reuse them.

THE HYPOTHESES, strongest first. Test each against the live API; each costs nothing while the account is at
1008, and a 200 is the answer:
  H1. A REQUEST HEADER identifies coding-plan traffic — a source header, a user agent, an anthropic-beta
      value, a client id. Reading works and generating does not, which is what an entitlement keyed on
      something other than URL, model or credential looks like.
  H2. STREAMING IS REQUIRED: `stream: true` is honoured and non-streaming is billed against balance.
  H3. The plan is a CODING PLAN, not a TOKEN PLAN. MiniMax's docs describe the Token Plan as extending "our
      former Coding Plan ... beyond language models", so a Coding Plan may be language-models-only and may be
      honoured only through the coding path.
  H4. A QUOTA WINDOW is spent. The Token Plan runs on 5-hour rolling and weekly windows.
  H5. The tools use a DIFFERENT KEY STRING than the one in .env. Cheapest of all to check, and it would
      explain everything.

HOW TO RESEARCH, in this order:
- READ THE CODEBASES, not the blog posts. Find each tool's MiniMax provider definition and read what it
  actually puts on the wire: base URL, every header, the model id, whether it streams, and any field it adds.
  `sst/opencode`, `earendil-works/pi` (its issue 2768 is about exactly this), and whichever repository Hermes
  is. Use gh and WebFetch. A provider file or a models.dev-style manifest is usually one small file.
- READ MiniMax's docs index at https://platform.minimax.io/docs/llms.txt and follow what it names about the
  Token Plan, the Coding Plan and the AI-coding-tools guide.
- THEN REPLAY. Build the exact request one of those tools sends — same URL, same headers, same body, same
  streaming flag — with our key, and see which one answers 200. That replay is the whole session in one
  measurement, and everything before it is what makes the replay worth making.

RULES, which do not relax for a research session:
- NEVER print a key, and never read .env to show one. Every probe replaces the key with <KEY> before it logs,
  as session 43's do. Report a key's SHAPE (length, prefix, whether it is a JWT) and never its value.
- Probes live in .tmp/, which is gitignored and skipped by drift's key scan. No probe goes in scripts/ or
  tests/, and NO TEST EVER CALLS A PROVIDER (S-111).
- If the answer is a change to packages/providers/src/minimax/, it is a DECISION: an S-entry with what was
  rejected and how a violation is caught, plus a recorded-wire fixture and an assertion in check 6 or 7 that
  we send whatever was found. A header we send because it works, with nothing pinning it, is a header that
  will be deleted by a later cleanup.
- If a change touches D-006's or D-019's claims, the S-entry NAMES THEM in Supersedes (D-115, S-017), and the
  corrected fact is owed upstream rather than edited into the steering repository here.
- `node scripts/check.mjs` stays green. The suite counts 463.

Finish:
- Either a MiniMax call answering 200, with what made it work recorded as a decision and pinned by a test —
  in which case say so, and PROMPTS/045-paid-path-real-reel.md is next and makes the reel;
- or a finding the owner acts on, stated as plainly as the table above: what was tried, what each attempt
  answered, and what MiniMax must be asked.
- A JOURNAL.md entry either way: intent; what changed; observed — every hypothesis, what it was tested with,
  and what it answered; next.
- Set this prompt's Run line to session 44 in PROMPTS/044-minimax-key.md and in PROMPTS/README.md (S-065).
```

## If the answer turns out to be "MiniMax cannot do this"

Session 43 researched the alternative against OpenAI's own docs and it is **not** a drop-in: eight of our nine
calls port over, and **Gate 4 does not**, because it sends a whole MP4 (`video_url`) and no OpenAI model accepts
video input. Substituting a frame strip converts D-043's `event` criteria into presence checks, which is
weakening a verified gate. Narration is solvable but only as TTS plus a `whisper-1` transcription with
`timestamp_granularities[]`, since OpenAI's TTS returns no timings. That work is its own feature with its own
four gates — it is not a detour inside Slice 8, and it relocates the Gate 4 problem rather than removing it.
