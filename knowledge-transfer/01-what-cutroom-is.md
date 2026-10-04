# 01 — What Cutroom is

This document is the one-paragraph truth about Cutroom, the boundaries it draws, and the limits
that follow from them. Read it first; everything else assumes you understand it.

## The one-paragraph truth

Cutroom is a **local reel-creation engine**. A caller hands it a narrated brief, claims, visual
criteria, a style, and a spending ceiling; Cutroom plans it, makes and checks stills, turns them
into clips, narrates and captions them, and returns one measured MP4. The service listens on the
loopback HTTP interface (`127.0.0.1`), processes one machine's work, and remembers enough about
each run to inspect, cancel, or resume it.

## What it is not

Cutroom is explicitly **not**:

- A hosted product. There is no public host, no authentication, no multi-tenant story.
- A general interactive video editor. The cut stage assembles one reel from the stills and clips
  the engine made; it does not edit arbitrary footage.
- A registry-published engine package. `@cutroom/sdk` and `@cutroom/reel-contract` are the only
  packages an external consumer installs, and they connect to a service the consumer runs
  themselves. The engine itself is not on npm.
- A binary or installer. There is no installer, no updater, no deployment story. The service is
  started as a Node program on the machine that owns it.

The current target audience is **five users on one machine**. The architecture can be extended,
but every decision today is shaped by that scope.

## The two hard boundaries

Two rules follow from that scope, and they show up everywhere.

### 1. Loopback only

The HTTP API listens on `127.0.0.1` and never on a routable host. There is no authentication —
the assumption is that if you can reach `127.0.0.1` on the machine, you own the machine. This is
intentional and not configurable. (`apps/api/src/server.ts:42-43`, D-098.)

### 2. Provider keys are confined

A provider key (`MINIMAX_KEY`, `FAL_KEY`) is read in exactly one place: `packages/providers`,
through `env.ts`. No other package, no app, no test imports a key or constructs a real adapter
directly. The worker is handed ports it cannot construct. This keeps a stage or a runner from
reaching for an adapter that spends money without going through the composition root, where the
owner is the one who decided to spend. (S-021, S-038, S-108, S-109.)

## What works today

- **Brief to plan, approved stills, clips, narration, captions, gates, holds, retries, and one
  MP4.** Every stage is implemented and verified.
- **Real MiniMax and fal adapters** with explicit spending and failure accounting.
- **A loopback HTTP service** with submit, find, status, events, result, record, cancel, resume,
  and readiness routes.
- **A typed `@cutroom/sdk` client** that joins an existing service or launches a
  consumer-supplied command.
- **Portable ESM packages** for `@cutroom/sdk` and `@cutroom/reel-contract`, version `1.0.0`, with
  TypeScript declarations for Node 22.14 or newer.
- **Recovery of failed runs** through previewed, selective resume — both the engine's automatic
  resume (after `resumeDelayMs`, off by default; on for the service) and a caller's manual
  preview/admit through `POST /v1/runs/:runId/resume`.

## What is paid, what is not

- Pictures (`reel.keyframes`, fal) and clips (`reel.clips`, fal) cost money when the real
  adapter is configured. Model calls (planning and every gate's model) and narration (MiniMax)
  are priced at 0¢ under MiniMax's token plan, but every call still writes its receipt row.
- The render stage (`reel.assemble`) uses ffmpeg locally and does not spend.
- The default service starts with stand-in adapters for every port. It reads no key and spends
  nothing. The stand-in model port deliberately invents no answers, so a complete synthetic
  reel requires a `CUTROOM_STAND_IN_SCRIPT`.
- A real reel costs roughly 49–58¢. Two limits are checked before every paid call: the owner's
  **per-reel cap**, $3.00 (300¢) in `steering-ref/steering/BUDGET.md`, and the caller's
  **ceiling**, `options.budgetCents` on each request (250¢ is a typical value).

## The contract

The public contract is **`@cutroom/reel-contract`**, version `1`. It defines:

- The shape of a `SubmitRequest` (a narrated brief, criteria, claims, options including
  `budgetCents` and `until`).
- Every response a route returns (`SubmitResponse`, `RunResult`, `RunStatus`, `EventsPage`,
  `ResumeResponse`, etc.).
- Every event a run emits (`stage.started`, `verdict`, `stage.finished`, `run.accepted`,
  `run.finished`, `degraded`, etc.).
- The routes — all under `/v1/`.

Changing the contract is gated and reviewed (`docs/features/reel-contract.md`). External
consumers pin to version `1`.

## Where to look next

- **Repository map**: `02-repository-map.md` — every folder, every package.
- **Request lifecycle**: `03-request-lifecycle.md` — the chain that turns a brief into an MP4.
- **Source of truth**: `docs/context.md` for current state, `DECISIONS.md` for any D- or S-ID, and
  `docs/features/<slug>.md` for any feature you need depth on.
