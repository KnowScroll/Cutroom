---
status: current
date: 2026-10-01
authority: human-facing summary; docs/context.md and the named feature evidence win
---

# Cutroom status

## Short answer

The reel engine is built end to end and has made completed reels with real providers. It accepts a
brief and visual contract, plans and checks the reel, creates stills and clips, narrates and
captions them, assembles one MP4, and records what happened and what it cost.

The local SDK is also complete on Cutroom's side. `@cutroom/sdk` and
`@cutroom/reel-contract` build as portable ESM 1.0.0 tarballs, and an unrelated Node consumer has
installed, imported, executed, and typechecked them.

This is not yet a public or turnkey release. The packages are not in a registry, the engine is not
packaged, and there is no installer, hosted endpoint, updater, or deployment service. A user needs
the engine checkout on the same machine and must receive or build the SDK tarballs.

## Capability status

| Capability                                                  | State                                          |
| ----------------------------------------------------------- | ---------------------------------------------- |
| Caller contract and HTTP routes                             | verified                                       |
| Planning, stills, rendering, retries, holds, and cut gates  | verified                                       |
| MiniMax, fal, local-sensor, narration, and ffmpeg paid path | verified; exercised by real reels              |
| Run cancellation and record inspection                      | verified                                       |
| Failed-run preview and selective resume                     | verified                                       |
| Typed local SDK and launcher lifecycle                      | verified                                       |
| Portable SDK and contract packages                          | verified; local tarballs only                  |
| Registry publication                                        | not built and intentionally outside Prompt 074 |
| Engine binary, installer, service deployment, and updates   | not built                                      |
| Remote-host SDK access                                      | not supported; loopback only                   |
| Broader interactive “Cutroom proper” editor/agent           | not built; this repository is the reel engine  |

Verified feature files currently include `reel-contract`, `reel-plan`, `reel-stills`,
`reel-render`, `reel-takes`, `paid-path`, `paid-failures`, `second-ask`, `three-pictures`,
`ask-again`, `cut-rules`, `resume-failed`, `cutroom-sdk`, and `cutroom-sdk-package`.

## Prompt 074 result

Prompt 074 completed the consumer-neutral SDK package:

- `node scripts/package-sdk.mjs` reproducibly builds both archives under `.package-staging/`;
- the package journey passed 19 package-owner tests;
- the SDK re-journey passed 84 tests;
- the contract re-journey passed 42 tests;
- eight deliberate packaging breaks prove the guards catch TypeScript runtime exports,
  `workspace:*`, a missing contract, a missing declaration, an absolute export, workspace-source
  resolution, a shell launcher, and a removed public export.

One SDK re-journey run reported a timing-dependent failure before the same code passed; both
outcomes remain recorded. Exact hashes and evidence are in
[cutroom-sdk-package.md](features/cutroom-sdk-package.md) and [context.md](context.md).

## Operating reality

- The service runs only on loopback and returns local filesystem paths.
- Default stand-in providers read no key, make no network call, and spend nothing. The model
  stand-in needs an explicit answer script to complete a reel.
- The manual real-reel command is the only repository command that spends. It prints its estimate
  and requires exact confirmation before starting.
- Recent completed paid reels cost roughly 49–58 cents. Provider and gate failures are normal,
  explicit outcomes rather than hidden retries to success.
- Media, SQLite files, secrets, generated packages, and other generated artifacts are gitignored
  and never committed.

## What comes next

The next queued feature is `self-heal`. After it come the session-53 P-013/P-014 reliability
findings, `caption-match`, `composed-hold`, `diagram-shots`, `code-reels`, and the future
`parallel-shots` gates. `reel-series` is recorded as a future concept but its gates, API, and queue
position are not written.

Use [USING_CUTROOM.md](USING_CUTROOM.md) to run or consume Cutroom. For the exact current tree,
journey evidence, real-run ledger, and recent changes, use [context.md](context.md).
