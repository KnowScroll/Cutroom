# Cutroom — Knowledge Transfer

This directory is an onboarding guide for **Cutroom**, the local reel-creation engine that lives in
this repository (`C:\Users\XZNON\Cutroom`). It explains what the system is, how its pieces fit
together, how a request becomes a video, and where to look when something breaks or needs changing.

## The interactive version

**[`cutroom-kt.html`](./cutroom-kt.html)** is the same knowledge transfer as one self-contained page:
open it in any browser, no server or network needed. It has a draggable system map (HLD), the package
graph with all 22 boundary rules, a step-through sequence diagram of one request, flowcharts of every
stage, the gates, an ER graph of all 21 tables, failure and resume paths, settings, a debugging guide,
change playbooks, an index of every source file and a glossary, with search across all of it. It was
checked against the source on 2026-10-04; its last tab lists where the numbered files below differ
from the code.

## Who this is for

Anyone who needs to read the repository competently — new contributors, reviewers, an agent
debugging a real run, or someone who has inherited the code. The goal is that, after reading these
documents in order, you can:

- Describe what Cutroom is and what it is not (hosted product, general video tool, etc.).
- Name every package and app, and the rule each one obeys.
- Trace a request from `POST /v1/runs` through the database, the worker, the pipeline stages, the
  providers, and back to a `RunResult`.
- Find the source-of-truth documents (`DECISIONS.md`, `docs/context.md`, `docs/features/*.md`) for
  any deeper question.

## Read in this order

1. **[01 — What Cutroom is](./01-what-cutroom-is.md)** — the one-paragraph truth, the user-facing
   boundaries, and the limits. Read this first; everything else builds on it.
2. **[02 — Repository map](./02-repository-map.md)** — every folder, every package, every app, with
   the rule each obeys. Use this as a reference when you want to know "where does X live".
3. **[03 — The request lifecycle](./03-request-lifecycle.md)** — the full journey from
   `POST /v1/runs` to an MP4. Walk through this once; refer back when you need the exact chain.
4. **[04 — Pipeline stages](./04-pipeline-stages.md)** — the four pure stages inside
   `packages/pipeline`: plan, stills, clips, render. Inputs, outputs, ports, and gates.
5. **[05 — Providers and ports](./05-providers-and-ports.md)** — the stand-in and real (fal, h3,
   MiniMax, ffmpeg) adapters, and how the worker is handed them.
6. **[06 — Gates](./06-gates.md)** — every gate (0, 1, 1S, 2, 3, 4, 5, 7), its verdict shape, and
   the difference between a gate failure and a thrown failure.
7. **[07 — Database and queue](./07-database-and-queue.md)** — the SQLite tables, the job queue,
   event log, and how a run's state evolves.
8. **[08 — Resume of failed runs](./08-resume-of-failed-runs.md)** — the engine's automatic resume
   and the caller's manual preview/admit/resume via `POST /v1/runs/:runId/resume`.
9. **[09 — The SDK and contracts](./09-sdk-and-contracts.md)** — what `@cutroom/sdk` is, what
   `@cutroom/reel-contract` exports, and how external code uses them.
10. **[10 — Settings and budgets](./10-settings-and-budgets.md)** — every `CUTROOM_*` setting, the
    `BUDGET.md` cap, the `QUESTIONS.md` log, the artifact root, and the lease.
11. **[11 — Development workflow](./11-development-workflow.md)** — how to run checks, write
    journeys, build the SDK, and start the service. The pragmatic "what do I run" guide.

## Conventions used in these files

- **`path/to/file.ts`** paths are repository-relative.
- **Decision IDs** (`D-005`, `S-021`) point to entries in `DECISIONS.md` — open that file and search
  for the ID to see the rule and its rejection. Five lines are always honest.
- **Feature files** (`docs/features/<slug>.md`) are the authoritative descriptions of each
  verified slice of the engine. Open them when you need depth on a single feature.
- **`docs/context.md`** is the current-state-of-the-engine summary, including the table of recent
  real runs with their endings. Read it when you want to know "what is actually true today".

## What this directory is not

- It is not a substitute for `docs/context.md`, `DECISIONS.md`, or `docs/features/<slug>.md`. Those
  remain the source of truth; this directory points at them.
- It is not a tutorial for writing a Cutroom feature. New features go through the gates system
  (product → architecture → program design → slices) described in `AGENTS.md`.
- It is not committed history. The journal (`JOURNAL.md`) and the per-feature files own history;
  this directory owns the explanation.

## Where to look when something is wrong

| Symptom                                  | Open first                                                              |
| ---------------------------------------- | ----------------------------------------------------------------------- |
| "The drift check is red"                 | `02-repository-map.md` (boundaries) — what rule broke, and why          |
| "A run stopped at gate X"                | `06-gates.md` — what gate X checks                                      |
| "A real run failed in the middle"        | `08-resume-of-failed-runs.md` and `docs/context.md` (recent runs table) |
| "The service refuses to start"           | `10-settings-and-budgets.md` — what setting is missing or invalid       |
| "I want to add a feature"                | `AGENTS.md` (four gates) and `docs/features/<slug>.md` template         |
| "I want to read a feature in depth"      | `docs/features/<slug>.md` for that feature                              |
| "I want to know why a decision was made" | `DECISIONS.md` — search for the D- or S-ID                              |
| "I want to write a journey"              | `docs/context.md` (verification), `scripts/journey.mjs` (the runner)    |
| "I want to publish a new SDK release"    | `09-sdk-and-contracts.md` and `scripts/package-sdk.mjs`                 |
| "I want to find a real bug"              | `docs/reel-pitfalls.md` — lessons from real runs                        |
