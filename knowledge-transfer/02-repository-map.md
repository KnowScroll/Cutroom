# 02 — Repository map

This document is the layout of the repository, package by package, with the rule each obeys. Use
it as a reference when you want to know **where X lives** or **what rule constrains X**.

## Top-level

```
Cutroom/
  apps/                 three runnable programs (composition roots + workers + API)
  packages/             six libraries (engines, contracts, SDK)
  docs/                 features, history, research, the current-state context.md
  scripts/              checks, packaging, journeys, the manual paid-reel command
  db/migrations/        the SQLite migrations the service applies at startup
  tests/                the test suite, organised by feature
  data/                 gitignored; the SQLite database lives here
  .artifacts/           gitignored; generated images, clips and rendered MP4s
  .package-staging/     gitignored; tarballs built by scripts/package-sdk.mjs
  steering-ref/         a pinned git submodule of the steering repository (decisions)
  PROMPTS/              index of feature-shaping prompts (read-only history)
  JOURNAL.md            newest-first log of session outcomes (and the entry the stop-gate requires)
  DECISIONS.md          append-only list of in-repo decisions (D- and S- IDs)
  AGENTS.md / CLAUDE.md rules every coding agent reads first
```

Two more top-level entries are config: `pnpm-workspace.yaml`, `tsconfig.base.json`, `eslint.config.mjs`,
`.dependency-cruiser.cjs`. They exist to enforce the boundaries below; they are not "where code
goes".

## The seven packages and apps

The repository is a pnpm workspace with **three apps** and **six packages**. Each one has exactly
one entry point (`src/index.ts`), and the dependency rules below are **enforced on resolved file
paths** by `node scripts/drift.mjs`. The text of an import line is not what is checked.

### `apps/service`

The program you start with `corepack pnpm service`. It is the **composition root** — the only
place that imports `packages/providers` and reads settings. It builds every port, opens the
database, applies migrations, starts the API, then starts exactly one worker.

- Reads `CUTROOM_*` environment settings, then a `.env` file.
- Builds ports from settings via `packages/providers/src/ports.ts`.
- Constructs the `ResumeService` that the API uses for `POST /v1/runs/:runId/resume`.
- Owns the SIGINT shutdown logic (and on Windows, the `stdin` "stop" line — no signal reaches a
  spawned child there).

Source: `apps/service/src/{main.ts,service.ts,settings.ts,env-file.ts,waiting-runs.ts}`.

### `apps/api`

The **loopback HTTP server**. It never imports `providers` and never constructs one. It only
reads what the worker wrote and stores what the caller asked for. It owns the
`POST /v1/runs/:runId/resume` route, but the planning behind it lives in `packages/pipeline`; the
API calls a `ResumeService` that `apps/service` built.

Source: `apps/api/src/{index.ts,server.ts}`.

### `apps/worker`

The **job runner**. It receives ports it did not construct and runs the chain of four job kinds
(`reel.plan`, `reel.keyframes`, `reel.clips`, `reel.assemble`). It is also the place that knows
about the engine's own resume switch (off by default; on for the service) and about the gate
profile, the canonical framing and the per-job failure kinds.

Source: `apps/worker/src/{index.ts,worker.ts,plan-job.ts,keyframes-job.ts,clips-job.ts,assemble-job.ts,resume.ts,recorder.ts,…}`.

### `packages/reel-contract`

The **public contract**: `SubmitRequest`, `RunStatus`, `RunResult`, every `RunEvent`, every
response shape, the routes, the contract version. It imports nothing from inside the engine.

This is the **leaf** of the system: it does not import any other workspace package, and every
other package may import it. A change to this package's exported surface is a breaking change for
external consumers.

Source: `packages/reel-contract/src/{index.ts,request.ts,events.ts,record.ts,resume.ts,responses.ts,routes.ts,ready.ts,errors.ts,version.ts}`.

### `packages/sdk`

The **typed local client**. Imports `packages/reel-contract` only. Its private `launcher.ts`
starts an external command when no engine is listening.

- `createCutroom({ baseUrl, launcher?, readyTimeoutMs? })` returns a `Cutroom` handle with
  `submit`, `find`, `status`, `follow`, `result`, `record`, `cancel`, `resume`, `close`.
- The handle is `joined` if an engine was already at `baseUrl`, or `owned` if the SDK started one
  itself. `close()` stops the child in the owned case; in the joined case it is local-only.

Source: `packages/sdk/src/{index.ts,launcher.ts}`.

### `packages/contracts`

**Internal shared types and port interfaces**. Pure types — no I/O, no logic. Defines every port
(`ImagePort`, `VideoPort`, `NarrationPort`, `LanguageModelPort`, `MediaPort`, `AssemblerPort`,
`PictureSensorPort`), every provider setting (`PROVIDER_ADAPTERS`, `ProviderSettings`), and the
shapes that cross a stage boundary (`Plan`, `PictureRecord`, `TakeRecord`, `RenderManifest`,
`FailureKind`, etc.).

Source: `packages/contracts/src/{index.ts,…}`.

### `packages/pipeline`

**Pure stages and gates**. No database, no filesystem, no network — not even an `import` of one.
The planner calls the model port it is handed; nothing else.

- The **planner** (`planReel`): groups sentences, calls the model twice (two shot counts), runs
  Gate 0 on both, scores both, picks one, or — if both fail — repairs once.
- The **stills stage** (`makeStills`): makes one canonical picture, then derived pictures in rank
  order, with Gate 1 (alone) and Gate 1S (against the canonical) on each.
- The **clips stage** (`makeClips`): per shot, narration → up to three takes → Gates 2, 3, 4, 5.
- The **render stage** (`cutReel`): one pass through the assembler, the media probe, the frame
  strip, and Gate 7.
- The **resume planner** (`planResume`, `admitResume`, `normalise`, `takedown`): how a failed run
  is continued.
- The **splitter** (`packages/pipeline/src/split/index.ts`): groups sentences into units. Used
  only by the planner (D-073).

Source: `packages/pipeline/src/{index.ts,plan/,stills/,clips/,render/,gates/,resume/,split/,admit.ts,estimate.ts,rank.ts}`.

### `packages/providers`

**Adapters behind the ports**. Stand-ins (the default) plus real ones: fal (images, videos, via
`queue.ts`, `registry.ts`, `frame.ts`, `h3.ts`), MiniMax (model, narration, via `wire.ts`), and
local ffmpeg (sensors, media, assembler, via `ffmpeg/`).

- The only package allowed to import a model client (`reel-plan`, S-020).
- The only package that reads a provider key (S-108, S-109).
- The only place that constructs an adapter (`ports.ts`).
- The stand-in model port deliberately throws on a missing script (`STAND_IN_FAILURES`) so an
  engine with the stand-in model and no script does not invent answers (S-111).

Source: `packages/providers/src/{index.ts,ports.ts,env.ts,artifacts.ts,transient.ts,text.ts,fake/,minimax/,fal/,ffmpeg/}`.

### `packages/domain`

**Tables, migrations, queue, records, budget ledger**. SQLite through Drizzle. Owns the
`run`, `run_event`, `job`, `plan`, `picture`, `take`, `hold`, `still_hold`, `render`,
`model_receipt`, `video_receipt`, `narration_receipt` tables; the job queue (`claimJob`,
`enqueue`, `completeJob`, `buryJob`); the run lifecycle (`submitRun`, `finishRun`,
`finishStills`, `finishVideo`, `advanceStills`, `advanceClips`, `resumeRun`, `startStage`,
`requestCancel`); and the `BUDGET.md` reader.

- The job queue is a table (D-002): a job is claimed with one `UPDATE … RETURNING`, so two
  workers can never claim the same row.
- A claimed job whose lease has run out is claimed again and run from the start (S-027).
- A failed run's kind (`failure`) is written with its result (S-163); the engine and a caller
  judge a resume by it.

## The boundaries, restated

The repository enforces **twenty-two rules** over resolved file paths. The text of an import
line is not what is checked; the path it resolves to is. The rules are:

1. `pipeline` imports no `domain`, no `providers`, no app, and **no I/O at all** (no `node:fs`,
   no `node:net`, no `fetch`).
2. `api` never imports `providers`.
3. `providers` never imports `domain` or `pipeline`.
4. `contracts` and `reel-contract` are leaves.
5. The worker never imports `providers`.
6. Keys stay in `providers`.
7. A package is entered only through its `src/index.ts`.
8. The SDK imports no engine internals; only its private launcher may start a process.
9. The splitter imports nothing outside its own folder, may be imported only by the planner, and
   may be entered only through its index (D-073).
10. The pipeline imports nothing but `zod` from npm.
11. Nothing outside `providers` imports a model client (`reel-plan`, S-020).

`node scripts/drift.mjs` enforces them. `node scripts/drift.mjs --prove` writes a file to break
each rule and fails if one stays silent. `node scripts/drift.mjs --audit` fails when a rule names
a folder that a renamed package lost.

## Where things live, by concern

| Concern                              | Lives in                                                             |
| ------------------------------------ | -------------------------------------------------------------------- |
| HTTP routes, request validation      | `packages/reel-contract`, served by `apps/api`                       |
| Loopback server, route dispatch      | `apps/api/src/server.ts`                                             |
| Job queue, claims, leases            | `packages/domain/src/queue.ts`                                       |
| Run lifecycle (accept/finish/resume) | `packages/domain/src/runs.ts`                                        |
| Tables and migrations                | `packages/domain/src/{schema.ts,db.ts}`, `db/migrations/`            |
| Planning stage (model calls, gate 0) | `packages/pipeline/src/plan/index.ts`                                |
| Stills stage (ladders, gates 1, 1S)  | `packages/pipeline/src/stills/index.ts`                              |
| Clips stage (gates 2-5, holds)       | `packages/pipeline/src/clips/index.ts`                               |
| Render stage (ffmpeg pass, gate 7)   | `packages/pipeline/src/render/index.ts`                              |
| Resume planning and admission        | `packages/pipeline/src/resume/index.ts`                              |
| Port types                           | `packages/contracts/src/{providers.ts,model.ts,picture.ts,…}`        |
| Port factories (real and stand-in)   | `packages/providers/src/ports.ts`                                    |
| Real adapters                        | `packages/providers/src/{minimax,fal,ffmpeg}/`                       |
| Stand-in adapters                    | `packages/providers/src/fake/`                                       |
| Provider key reading                 | `packages/providers/src/env.ts`                                      |
| Worker loop, job dispatch            | `apps/worker/src/worker.ts`                                          |
| Per-job runners                      | `apps/worker/src/{plan-job,keyframes-job,clips-job,assemble-job}.ts` |
| Engine's own resume                  | `apps/worker/src/resume.ts`                                          |
| SDK typed client                     | `packages/sdk/src/index.ts`                                          |
| SDK child-process lifecycle          | `packages/sdk/src/launcher.ts`                                       |
| Settings and the composition root    | `apps/service/src/{settings.ts,service.ts}`                          |
| BUDGET.md, QUESTIONS.md, paths       | `apps/worker/src/questions.ts`, `packages/domain/src/budget.ts`      |

## What you should never import, and why

| If you are in…                                        | You must not import…                                           | Why                                                |
| ----------------------------------------------------- | -------------------------------------------------------------- | -------------------------------------------------- |
| `pipeline`                                            | `domain`, `providers`, `node:fs`, `node:net`, `fetch`, any app | The stage must be reproducible from inputs         |
| `api`                                                 | `providers`, `worker`, `pipeline`                              | The API must not spend or plan                     |
| `worker`                                              | `providers`                                                    | The worker must not construct adapters             |
| `providers`                                           | `domain`, `pipeline`                                           | Adapters must not know the database or the stages  |
| `contracts`                                           | any other workspace package                                    | Pure types                                         |
| `reel-contract`                                       | any other workspace package                                    | Public contract; leaf                              |
| `sdk`                                                 | `pipeline`, `domain`, `providers`                              | The SDK must not be tied to the engine's internals |
| the splitter (`packages/pipeline/src/split/index.ts`) | anything outside `split/`                                      | Only the planner calls it (D-073)                  |

The `node scripts/drift.mjs` script is what catches them; never assume a configured rule runs.
