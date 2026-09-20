---
status: current
authority: plan
---

> **Created 2026-09-20**, at the owner's instruction — _"before video-edits, we need to have it be ready to work
> finally and start making real videos"_ — after `reel-takes` was verified at `6fe85b8` and every one of the engine's
> five features had passed its journey. It is the sixth feature planned in this repository (S-017, S-033), and the
> first that can spend money. The owner answered four questions before any gate was written (S-108 to S-111): **which
> adapter a port gets is one setting per port, defaulting to the stand-in**; **a key comes from the environment and
> only `packages/providers` may read one**; **the first real reel is one reel under the $3.00 cap, as cheap as the
> decisions allow**; and **a real adapter is proven against recorded wire in the suite, and by one hand-run reel
> outside it**. Two more choices were settled while the gates were written, each between real alternatives: the
> sensor's text step (S-112) and the lease a real job needs (S-113).

# paid-path — the engine makes a real reel: real pictures, real clips, a real voice, and a program that runs it

Status: planned
Decisions: D-001, D-002, D-006, D-007, D-008, D-014, D-018, D-019, D-022, D-023, D-024, D-026, D-027, D-028, D-030,
D-042, D-050, D-055, D-056, D-057, D-059, D-072, D-076, D-081, D-083, D-084, D-086, D-087, D-094, D-096, D-097,
D-098, D-099, D-100, D-111, D-112, I-1, I-11, I-15, I-17, S-016, S-021, S-027, S-033, S-035, S-036, S-038, S-042,
S-046, S-050, S-057, S-059, S-069, S-070, S-071, S-075, S-078, S-080, S-087, S-088, S-092, S-096, S-099, S-108,
S-109, S-110, S-111, S-112, S-113, S-114, S-115
Supersedes, through the entries it rests on: D-005 for this engine's model layer (S-114) — KnowScroll's side keeps it
Named only in the deferral list: D-010, D-037, D-058, S-032, S-048
Gates: product APPROVED 2026-09-20 adversarial-reviewer · architecture APPROVED 2026-09-20 adversarial-reviewer ·
program-design APPROVED 2026-09-20 adversarial-reviewer · slices APPROVED 2026-09-20 adversarial-reviewer

> **What this feature is not.** It builds no new stage, gate, table or route. Every gate a reel passes, every figure a
> cap is compared with and every row the record keeps is `reel-plan`'s, `reel-stills`', `reel-render`'s and
> `reel-takes`', verified and unchanged. **This feature replaces five stand-ins with five adapters, and builds the
> program that starts the engine.** If a reel made on real providers passes gates a stand-in reel passed, nothing in
> the pipeline learned that it was real.

## Gate 1 — Product (no technical language)

**The problem.** The engine is finished on the free path and has never made anything anyone would watch. Every
picture is a flat colour, every clip is a test pattern carrying a tone, every voice is a generated wave, and every
judgement about them is a canned answer. And **nothing starts it**: the engine is a library that only its own tests
have ever run — there is no way for a person at this machine to say "make me a reel" and have it happen.

**The visible outcome.**

- **A person can start the engine on this machine**, point something at it, ask for a reel, and get one back — the
  same answers as today: the finished video, a budget answer with its figures, the rule and step that stopped it,
  cancelled, or something went wrong inside.
- **The reel is real.** Its pictures are made by a real picture maker, its moving shots by a real clip maker, its
  voice by a real voice with real word timings, and the checks that look at them are made by a real model that can
  see. What comes back is a video someone would watch, not a test pattern.
- **It is still free unless it is told to spend.** Started plainly, the engine behaves exactly as it does today:
  stand-ins, no money, no keys, and nothing leaving this machine. **Spending is one setting per part**, so a
  reel can be made with a real voice and stand-in pictures, or any other mixture, without changing anything else.
- **The first real reel costs less than the limit and is written down**: what each part cost, what the provider's own
  record says it cost, and the two compared.

**What "real" means for each part.** A picture maker that takes a reference picture and answers upright, phone-shaped
pictures. A clip maker that turns one of those pictures, or a sentence, into a few seconds of moving picture. A voice
that reads a sentence and says where every word falls. A model that can look at a picture or a clip and answer the
questions the checks ask. **Nothing about which checks run, or what passes them, changes.**

**When something fails.**

- **A part that is busy or briefly unreachable** is asked again, a few times, as already built — and it never costs a
  shot one of its three tries.
- **A part that is broken, or refuses** — a bad key, a rejected request, an answer that is not what was asked for —
  **stops the reel and says so**, as any failure does today. Nothing is retried for ever and nothing is guessed.
- **A limit reached still stops the reel** with its figures, before the call is made, exactly as today.

**Surfaces.** None. A service other programs call, plus **one command a person runs by hand** to make one real reel
and print what it spent.

**The one measure allowed.** Whether a reel made with real parts passes the same checks a stand-in reel passes, and
whether what it spent matches what the provider says it spent.

**What must NOT happen.**

- **No key is ever written down** — not in a record, a receipt, an event, a question, a log line or an error. Not the
  engine's own keys, and **not a key a provider hands back inside its answer**, which has happened before.
- **No test spends money or needs a key.** Everything the automated checks do stays free and secretless, and the two
  checks that prove that keep proving it.
- **Nothing is bought twice** because the engine was slow: a part that takes minutes must not let a second worker
  start the same work.
- **Nothing is quietly cheaper or worse**: the picture shape, the clip size and every gate stay exactly as decided.
  Saving money is done by asking for fewer or shorter shots, never by lowering a standard.
- **Nothing about the caller's reel leaves this machine but what the reel needs**: the prompts, the pictures and the
  sentences. No sources, no claim text, no evidence — the engine never had any (D-096).

## Gate 2 — Architecture

**Where the code goes** — the engine repository's packages (S-010), plus **one new app**. Only what this feature
touches:

| Package                  | This feature adds                                                                                                                                                                              | May not                                                       |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `packages/contracts`     | `ProviderSettings` — one adapter name per port, from a closed set, every default `'fake'` (S-108)                                                                                              | import anything internal but `@cutroom/reel-contract` (D-099) |
| `packages/pipeline`      | **nothing**                                                                                                                                                                                    | know that any port is real                                    |
| `packages/providers`     | five real adapters — `minimax/model.ts`, `minimax/narration.ts`, `fal/image.ts` with D-028's registry, `fal/video.ts`, `ffmpeg/sensors.ts` — one factory per port, and the only reads of a key | import `domain` or `pipeline`; write a key anywhere           |
| `packages/domain`        | **nothing**                                                                                                                                                                                    | —                                                             |
| `apps/api`               | **nothing**                                                                                                                                                                                    | import `providers` (D-005, `api-no-providers`)                |
| `apps/worker`            | **nothing but a refusal**: a lease too short for the adapters it was given (S-113)                                                                                                             | import `providers` (S-038) or read a key (S-109)              |
| **`apps/service`** (new) | the composition root: load the environment, read the settings, build the ports through `providers`' factories, start the API and one worker, stop cleanly                                      | hold pipeline logic, or be imported by any other app          |

**The twentieth boundary rule.** `keys-only-in-providers`: nothing outside `packages/providers/src` reads an
environment variable whose name matches a key's shape (`*_API_KEY`, `*_KEY`, `*_TOKEN`, `*_SECRET`). `drift --prove`
builds a deliberate violation, relative and by package name, as it does for the other nineteen. **`reel-stills`'
check 3 counts the rules and says nineteen exactly (S-078): it becomes twenty, by addition**, and that feature's
journey runs again in this feature's last slice (S-099's form).

**What the service is, and why it is a new app.** `startApi` and `startWorker` are libraries; **today nothing but the
test harness has ever started either**, and there is no program to run. The composition root must import
`providers` — and `api-no-providers` and `worker-no-providers` forbid the two apps that exist from doing it, which is
exactly the rule that keeps a stage from reaching for an adapter. So the root is its own app: it imports `providers`,
`api`, `worker` and `domain`'s migrations, and **nothing imports it**.

**What the service settles, each one setting with a default inside this repository (D-086, and no absolute path
anywhere — `tests/no-absolute-paths.test.ts`).** The database file and **its migrations, applied at startup before
either half runs**; the artifact root; the port the API listens on, loopback only (D-098); the environment file
(S-109); the lease (S-113); and `ProviderSettings` (S-108). **Every real adapter also takes its transport — a
`fetch` and a base URL, defaulting to the provider's own** — which is what lets a recorded response be served
without a network, and is how checks 3, 6 to 16 are run at all (S-111, S-114).

**How a real run is composed.**

```mermaid
sequenceDiagram
  Service->>Service: load .env (one setting, default .env at the root) — S-109
  Service->>Service: read ProviderSettings — every default 'fake' (S-108)
  Service->>Providers: portFor('video', 'fal') … one factory a port
  Providers->>Providers: read FAL_KEY here, and nowhere else (S-109)
  Service->>Worker: startWorker({ …every port…, leaseMs }) — refuses on a short lease (S-113)
  Service->>Api: startApi({ dbPath })
  Note over Service: one worker, one API, one database; SIGINT stops both
```

### The five adapters, and the wire each one speaks

**The model** — MiniMax over the OpenAI-compatible `/v1` wire, **with `fetch` and `zod` and no SDK** (S-114,
superseding D-005 for this engine), routing by role:
`MiniMax-M3` for anything that must see (witness, reconciler, judge), `MiniMax-M2.7` for planning. **D-019's trap is
load-bearing: every model in the family emits `<think>…</think>`**, and a structured call whose token budget is
consumed inside the reasoning block returns nothing at all. So every call **disables thinking where the wire allows
it and strips a reasoning prefix before parsing**, and every `max_tokens` budgets for reasoning on top of the answer.
A call that returns only reasoning **fails naming the budget**, because "the schema did not parse" would be a lie.

**The narration** — `POST https://api.minimax.io/v1/t2a_v2`, `model: speech-2.8-hd`, `subtitle_enable: true`
(D-008, D-019): audio plus a **`subtitle_file` URL that is a presigned credential belonging to MiniMax** (D-022).
The adapter writes the audio under the artifact root, **fetches the timings, and drops the URL** — it reaches no row,
no receipt and no log. The token plan covers T2A, so its receipt records the characters and a cost of zero.

**The image** — fal, through **D-028's closed registry**: four admitted entries carrying their own slug, rate and
limits, one configured default, no slug at a call site. Two admission gates, both asserted rather than trusted: the
entry **accepts reference pictures** (D-026, or the derive step has no mechanism, and the service refuses to start),
and **the produced picture is 9:16 — checked on the frame**, because `image-to-video` has no `aspect_ratio` field and
a non-vertical picture yields a landscape clip **with no error** (D-019, D-028).

**The video** — fal's queue, `fal-ai/minimax-h3-turbo/{image-to-video,text-to-video}` and nothing else (D-007,
D-018): submit, poll, fetch the result, download the file under the artifact root. **768P always**, whole seconds
5–15, **`prompt_expansion_mode` required**, **the seed is the caller's** — the endpoints return none (D-019), and the
engine already makes it the take id's CRC-32 (D-018) — and **no `aspect_ratio` on image-to-video**, which the engine's
validator already encodes (S-080). The answer's `expanded_prompt` goes on the receipt and is shown to no gate (D-072).
The receipt's cost is **the configured rate applied to the seconds asked for**, rounded up as the guard rounds
(S-059) — fal's answer carries no price — and Slice 8 compares those figures with the provider's own (S-110).

**Getting a local picture to fal.** `image-to-video` and an image _edit_ call both need a picture fal can fetch, and
ours is a file under the artifact root. **The upload is one function, `uploadReference(file) → url`, written with
`fetch` like everything else (S-114); if fal's storage protocol proves fragile by hand, that one function — and
nothing else — may become `@fal-ai/client`**, recorded as its own entry with what was measured.

**Everything here is sequential (S-115).** One worker, one job, shots in plan order, each narration measured before
its own clip is asked for (S-070). **D-023's _"independent shots generate in parallel"_ is a gain named in that
decision's reasoning and is not built here**: a real 4–6 shot reel takes minutes a clip, and concurrency is its own
feature after Slice 8 has measured one, because it rewrites the budget guard's read-before-every-call and the order
every event list is asserted in.

**The sensor** — **local, free, and real**: `blurdetect` for sharpness, `signalstats` for brightness and `ssim` for
similarity, all in the ffmpeg this repository already requires (S-075), so no new dependency and no spend (S-112).
**Its text step is one vision call through the model port**, because this ffmpeg has no OCR filter and no tesseract —
the alternative would be a text step that always passes, which is weakening a gate.

### What is transient, and what is a fault (S-096, I-11)

**`unavailable`, sent again with backoff, costing no take:** HTTP **429** and **5xx** from either provider, a
connection error, and a poll that times out while a job is still queued. **A throw, which fails the run:** **400**
(the request was wrong), **401/403** (the key is wrong — sending it again cannot help), a body that does not parse,
and **a job the provider accepted and then failed**, whose message is carried into the detail. The engine's own
guarded ports already own the sending, the backoff and the counter; an adapter only classifies.

**Whether a failed call bills** is the provider's business and is **not assumed**: every answer the adapter returns
carries the cost it actually incurred, and the first real run's receipts are compared with the provider's dashboard
(S-110). `reel-takes` deferred this question here, and this is where it is answered — by reading, not by asserting.

### The lease a real job needs (S-113)

A stand-in clip is made in milliseconds; **a real one takes minutes**. The job lease defaults to 60 seconds and
**nothing renews it** (D-002, `reel-takes`' known limit 14): a clips job making six real clips would outlive its
lease, be taken for abandoned and be claimed again — and with checkpoints (S-092) the second attempt would keep the
finished takes but **pay again for the one in flight**. So: **the lease is a setting the service sets from the
adapters it was given**, with a floor that covers the longest job a real run can make, and **the service runs exactly
one worker**. Renewal — a heartbeat that extends a lease while a job is alive — is **deferred**, named, and would be
the honest fix for a fleet.

### Spending, unchanged

Admission, the per-reel cap, the caller's ceiling, the guard before every call and every send, the questions file —
all `reel-plan`'s, `reel-render`'s and `reel-takes`', verified (D-014, D-083, S-035, S-059, S-087, S-095, S-096,
D-097). **What changes is only that a receipt's `costCents` is now a real figure and `fake` is false.** The first
real run is one reel under the $3.00 cap with a lower ceiling (S-110), and **the observed rate is read from the
provider and written down** — closing BUDGET.md's open Q9, which no session could close before, because nothing had
ever made a paid call. **BUDGET.md itself is the steering repository's and is not edited here** (D-115, S-017): the
figure is recorded in this repository and owed upstream, as S-033's stubs are.

### What this feature changes in verified features (S-099's form)

**No assertion is removed.** Two changes, each made in the slice that forces it, and every affected journey run again
in Slice 8:

- **`reel-stills`' check 3 counts the boundary rules and says nineteen, exactly** (S-078). `keys-only-in-providers`
  makes it **twenty**, by addition — the count is updated, the rule list gains one entry, and nothing else in that
  check changes (Slice 2).
- **`.dependency-cruiser.cjs`' comment on `model-client-only-in-providers` names D-005** as the layer the one client
  would come from. It gains **S-114** beside it: no SDK is installed, and the rule is now also what keeps one from
  being reintroduced (Slice 2). The rule itself, its `from`/`to` and its `--prove` violation are unchanged.
- **Nothing else.** `reel-plan`, `reel-render`, `reel-takes` and `reel-contract` assert nothing about which adapter a
  port is: every one of them runs on stand-ins by default (S-108), and `receipt.fake` already carries the difference
  (S-036). Their journeys re-run in Slice 8 because the rule count moved, not because they were edited.

## Gate 3 — Program design

**File locations.**

```text
apps/service/src/index.ts        the composition root: env, settings, ports, API, worker, signals
apps/service/src/settings.ts     ProviderSettings read and refused
packages/contracts/src/providers.ts   ProviderSettings, the closed sets, the defaults
packages/providers/src/env.ts    the ONLY read of a key, one function per key name
packages/providers/src/minimax/{model,narration}.ts
packages/providers/src/fal/{image,video,registry,queue}.ts
packages/providers/src/ffmpeg/sensors.ts
tests/fixtures/wire/<provider>-<call>-<case>.json   recorded responses, redacted (D-022)
scripts/real-reel.mjs            run by hand, by nothing else (S-111)
```

**The checks.** Each is one test, named by its number.

_The engine runs as a program_

1. `the service, started as a process with no provider settings and no key in its environment, applies its migrations, listens on loopback, and completes a video run submitted over HTTP: every event typed by hand as check 25's are, every receipt fake, nothing spent, and every path it wrote under its configured artifact root` — S-108, D-086, D-098, S-069.
2. `a provider setting naming an adapter outside the closed set, and a named real adapter whose key is absent, each make the service refuse to start before its database is opened, naming the port and what was wrong; no job is claimed and no file is written` — S-108, S-075's form.
3. `the service loads its environment from the file its setting names; a key in that file reaches its adapter and appears in no row, receipt, event, question, log line or fault message of a completed run` — S-109.
4. `drift --prove builds a deliberate violation of keys-only-in-providers — a key read outside packages/providers, relative and by package name — and fails if it stays silent; the rule count is twenty, and reel-stills' check 3 counts twenty` — S-109, S-078.
5. `the service stops on SIGINT: the API closes, the worker takes no new job, a job in hand is left claimable or finished, and the process exits without an open handle` — D-002.

_The model adapter_

6. `handed a recorded MiniMax response, the adapter returns the structured answer; one whose content opens with a <think> block is parsed as the answer after it; and one consumed entirely by reasoning fails naming the token budget, not the schema` — D-019, D-006.
7. `every model receipt carries the model id, the tokens and fake: false, and a vision call carries its picture or clip as the wire expects; the role-to-model routing is D-006's table, read from settings` — D-006.
8. `429, 5xx, a connection error and a poll timeout are answered unavailable with a detail; 400, 401 and an unparseable body throw` — S-096.

_The narration adapter_

9. `the adapter asks speech-2.8-hd with subtitle_enable, writes the audio under the artifact root, returns word timings the stage parses, and records the text's code points as characters` — D-008, D-019, S-088, S-070.
10. `against a recorded response whose subtitle_file is a presigned URL carrying OSSAccessKeyId and Signature, nothing persisted holds that URL, either credential, or any query string — the timings are fetched and the reference dropped` — D-022, S-109.

_The image adapter_

11. `the registry holds D-028's four admitted entries with their rates and limits; a call naming a slug outside it is refused before any request; and a configured entry that does not advertise reference pictures makes the service refuse to start` — D-028, D-026.
12. `the produced picture's shape is asserted on the frame: a recorded response whose file is 16:9 fails the call naming the entry, and never reaches image-to-video` — D-028, D-019.
13. `an image receipt's cost is the configured entry's rate applied to the call, and changing the configured entry changes what admission estimates — an unchanged estimate means a rate is hardcoded` — D-028, D-083.

_The video adapter_

14. `a submitted request carries 768P, whole seconds 5 to 15, the caller's seed, prompt_expansion_mode and no aspect_ratio on image-to-video; the answer's expanded_prompt reaches the receipt and no gate` — D-007, D-018, D-019, D-072, S-080.
15. `the clip is downloaded under the artifact root, probed before the answer returns, and recorded by its local path — no provider URL is stored; its receipt's cost is the configured rate applied to the seconds asked for, rounded up, and a local reference picture is uploaded through the one uploadReference function` — D-086, D-087, D-022, S-059, S-114.
16. `a queued job answering 429 or 5xx, and a poll that times out, are unavailable; a rejected request throws; and a job the provider accepted and then failed throws carrying the provider's message` — S-096.
17. `a service given any real adapter refuses to start with a lease shorter than the floor a real job needs, naming the figure; and it starts exactly one worker` — S-113, D-002.

_The sensor_

18. `sharpness, brightness and similarity are measured from the file by ffmpeg's blurdetect, signalstats and ssim, each in its declared range, and a file that is not a picture measures unreadable — no model call, no spend` — S-112, S-050, S-044.
19. `the text step is one vision call through the model port whose strings are the sensor's answer, and a failed call throws rather than answering "no text"` — S-112.

_No secrets, and the real reel_

20. `no test file and no step of check.mjs names scripts/real-reel.mjs; reel-takes' check 26 and reel-render's check 50 keep their exact form and stay green, with every default 'fake'` — S-111.
21. `every recorded fixture under tests/fixtures/wire holds no key-shaped value and no query string, asserted by a test that reads them all` — D-022, S-109.
22. `every other test of this feature passes in a child process whose environment holds only PATH and what the operating system needs to start Node, in S-028's form — the probe, the canary, the allowed names, and the roll call of checks 1 to 21 passing with 22 not run` — Gate 1, S-028, S-111.

**The four least confident decisions.** The lease floor's figure (S-113) — measured on the first real run, not
guessed. Which errors a provider actually returns when it is busy (checks 8 and 16) — recorded from real failures
where possible, and from the documented shapes otherwise. Whether a failed fal job bills — read from the dashboard
after the first run. The reasoning-block handling (check 6) — D-019 saw it on every model, and the wire's switch for
it is the part that may differ per model.

## Gate 4 — Slices

- [ ] **Slice 1 — the engine runs as a program.** `apps/service`, `ProviderSettings` with every default `'fake'`, the
      environment file setting, the refusals, clean shutdown, and the root `tsconfig` reference.
      **Proves: 1, 2, 5.**
- [ ] **Slice 2 — keys, and the twentieth rule.** `packages/providers/src/env.ts`, `keys-only-in-providers` with its
      `--prove` violation, `reel-stills`' check 3 counting twenty, the fixture guard, and the recorded-wire harness.
      **Proves: 3, 4, 21.**
- [ ] **Slice 3 — the model adapter.** MiniMax over `/v1`, D-006's routing, the reasoning block, the transient
      classification. **Proves: 6, 7, 8.**
- [ ] **Slice 4 — the narration adapter.** T2A, the timings, the dropped presigned URL. **Proves: 9, 10.**
- [ ] **Slice 5 — the image adapter.** fal, D-028's registry, the two admission gates, the rate on the receipt.
      **Proves: 11, 12, 13.**
- [ ] **Slice 6 — the video adapter, and the lease.** fal's queue, the download, the classification, the lease floor
      and the one worker. **Proves: 14, 15, 16, 17.**
- [ ] **Slice 7 — the sensor.** ffmpeg's three measures, and the text step through the model port.
      **Proves: 18, 19.**
- [ ] **Slice 8 — the real reel, and the journeys.** `scripts/real-reel.mjs`; **one real reel made, under the
      ceiling**, its receipts compared with the provider's own figures and both written into `JOURNAL.md`; the
      observed rate recorded and owed upstream; **and the measured latency of a real reel, which the `parallel-shots`
      feature cannot be planned without** (S-115). **Proves: 20, 22**, then this feature's journey, and
      `reel-stills`', `reel-plan`'s, `reel-render`'s, `reel-takes`' and `reel-contract`'s again (S-099's form, for
      the rule count).

Every check appears in exactly one slice: 3 + 3 + 3 + 2 + 3 + 4 + 2 + 2 = 22.

## Outcome

- [ ] A person can start the engine on this machine and ask it for a reel, and it answers
- [ ] Every part can be real or a stand-in by one setting, and the default is free, secretless and unchanged
- [ ] One real reel exists, made under its ceiling, with what it cost written down beside what the provider says
- [ ] No key, and nothing a provider handed back, is ever written down — and no test spends or needs one

## Evidence (newest first; appended by the journey, never typed by hand)

## Divergence (the first broken boundary, or "none")

none

## Pending human decisions

1. **fal credit** — the MiniMax token plan covers the text models and T2A (D-019) and **explicitly excludes H3
   video** (D-007), so the image and video adapters need fal credit the owner holds. Slices 5 and 6 can be built and
   tested against recorded wire without it; **Slice 8 cannot run without it**.
2. **D-028's default entry** stays open (O-4 / C-8): S-110 configures the cheapest admitted entry for the first run
   and settles nothing. The bake-off is the owner's to ask for.
3. **The observed video rate** is owed to the steering repository's `BUDGET.md` (D-007's Q9) once Slice 8 reads it;
   this repository records it and cannot write it there (D-115).

### Deferred — cut on purpose, with where each goes

1. **Parallel shots** — D-023's named latency gain, unbuilt here and planned as its own feature once Slice 8 has
   measured a real reel (S-115). It owns the budget guard's race, per-shot event buffering emitted in plan order, and
   the provider's rate limits.
2. **Lease renewal** — a heartbeat extending a live job's lease (D-002). S-113 sets a floor and runs one worker
   instead; renewal is what a second worker would need, and belongs with whatever first runs two — most likely
   `parallel-shots`.
3. **`@fal-ai/client`** — not taken. It may replace the single `uploadReference` function, and nothing else, if
   fal's storage protocol proves fragile by hand in Slice 5, recorded then as its own entry (S-114).
4. **`reference-to-video`** — D-007 names it and D-026 prices it at twice the workhorse; no stage asks for it (S-091
   makes every take its shot's own way), so no adapter is built for it.
5. **Research providers** — SERPdive, Exa, Jina and D-010's two-index fall-through are KnowScroll's, outside the
   engine (D-096, D-076): the engine receives criteria and never searches.
6. **`kokoro-js` + `whisper-cli`** — D-008's narration fallback, unbuilt while T2A is plan-covered.
7. **Stills-stage checkpoints** (S-048) and **video-edits** (D-058) are untouched by this feature.
8. **A second vendor for any port** — D-006's and D-007's rejections stand; the registry is closed (D-028).

## Gate review 1 — 2026-09-20, adversarial reviewer, same session

Read against the gates themselves, the decisions they cite, and the code as it stands at `3a859a4`. **Eight
findings, all fixed before the gates were marked APPROVED.** Recorded here because a review that finds nothing is
not evidence that there was nothing.

1. **There is no program, and Gate 2 said so only in passing.** `startApi` and `startWorker` have never been started
   by anything but the test harness: there is no `bin`, no start script, no composition root. The feature claimed to
   "replace five stand-ins" while the thing that would hand the worker its ports did not exist. **Fixed:**
   `apps/service` is a first-class part of Gate 2 with its own paragraph, Slice 1 builds it before any adapter, and
   check 1 runs it as a process over HTTP.
2. **Check 1 asserted "the same calls, rows and events a harness-started engine makes"** — untestable without a
   reference run to compare against. **Fixed:** it now types its events by hand, as check 25 of `reel-takes` does,
   and asserts migrations, loopback, `fake` receipts and the artifact root.
3. **Nothing said how a real adapter is tested without a network.** S-111 promises recorded wire; Gate 2 never said
   the adapters take a transport, so checks 3 and 6 to 16 had no mechanism. **Fixed:** every real adapter takes a
   `fetch` and a base URL, each a setting defaulting to the provider's own, stated in Gate 2 and in the file list.
4. **Check 3 could not fail as written** — it asked that no key appears in a completed run's rows while every port
   was a stand-in, and a stand-in reads no key. **Fixed:** it runs a real adapter against recorded wire, which is
   the only arrangement in which the assertion has teeth.
5. **The rule count and the rule's own comment change a verified feature, and that was unrecorded.**
   `reel-stills`' check 3 counts nineteen exactly (S-078), and `model-client-only-in-providers`' comment names
   D-005. **Fixed:** a _What this feature changes in verified features_ section in S-099's form, both changes
   assigned to Slice 2, every affected journey re-run in Slice 8.
6. **The video receipt's cost had no source.** fal's answer carries no price, so "the cost" was undefined. **Fixed:**
   it is the configured rate applied to the seconds asked for, rounded as the guard rounds (S-059), and Slice 8
   compares it with the provider's own figures.
7. **The local reference picture had nowhere to go.** `image-to-video` and an image edit both need a picture fal can
   fetch, and ours is a local file; no step covered the upload. **Fixed:** one `uploadReference` function, named in
   Gate 2 and in check 15, with S-114's escape hatch attached to it and nothing else.
8. **This feature's own tests had no PATH-alone child.** Checks 26 and 50 cover `reel-takes` and `reel-render`;
   nothing would have proven that the feature which introduces keys needs none. **Fixed:** check 22, S-028's form,
   in Slice 8.

**Not found, and stated so it is not mistaken for missed:** nothing here weakens a verified check; no gate's failure
class is softened; no new absolute path; no new machine dependency (S-112 keeps the sensor on the ffmpeg already
required); and no test spends money under any slice.

**Open after this review, and listed under _Pending human decisions_:** fal credit, D-028's default entry, and the
observed rate owed upstream. Each is a fact the owner or the provider supplies, not a gap in the plan.
