# Cutroom

Cutroom is a local reel-creation engine. A caller supplies a narrated brief, claims, visual
criteria, a style, and a spending ceiling; Cutroom plans the reel, makes and checks stills, turns
them into clips, narrates and captions them, and returns one measured MP4. The service runs on
loopback, processes one machine's work, and records enough detail to inspect, cancel, or resume a
run.

The engine is built end to end. Its verified paid path uses MiniMax for planning and narration,
fal for images and video, local sensors and ffmpeg for inspection and assembly. Recent real reels
cost about 49–58 cents; a paid run is always started manually and confirms its ceiling before any
provider is called. The same engine can start with stand-in providers for local integration work
without keys, network access, or spend.

Cutroom is not a hosted product or a general interactive video editor. It currently targets five
people on one machine. The SDK is packaged and externally installable, but neither the SDK nor the
engine is published to a registry, and the engine has no binary, installer, updater, or deployment
service.

## What is ready

- Brief to plan, approved stills, clips, narration, captions, gates, retries, holds, and one MP4.
- Real MiniMax and fal adapters with explicit spending and failure accounting.
- A loopback HTTP service with submit, find, status, events, result, record, cancel, resume, and
  readiness routes.
- A typed `@cutroom/sdk` client that joins an existing service or launches a consumer-supplied
  command.
- Portable ESM packages for `@cutroom/sdk` and `@cutroom/reel-contract`, version `1.0.0`, with
  declaration files for Node 22.14 or newer.
- Recovery of failed runs through previewed, selective resume.

Current limitations and the next work are kept in [docs/STATUS.md](docs/STATUS.md). The detailed,
authoritative engineering state is [docs/context.md](docs/context.md).

## Quick start

Requirements:

- Node.js 22.14 or newer;
- Corepack (included with the supported Node installation);
- ffmpeg and ffprobe 8.x on `PATH`;
- Git submodules initialized.

Install and check the checkout:

```bash
git submodule update --init
corepack pnpm install
node scripts/decisions.mjs --fetch
node scripts/check.mjs --changed --dry-run
```

Start the local service with its default stand-in providers:

```bash
corepack pnpm service
```

It listens on `http://127.0.0.1:8787` by default. In another terminal:

```bash
curl http://127.0.0.1:8787/v1/ready
```

The default service is safe for readiness and integration work: it reads no provider key and
spends nothing. Its model stand-in deliberately invents no answers, so a complete synthetic reel
requires a `CUTROOM_STAND_IN_SCRIPT`; the verified free end-to-end example is exercised by
`tests/paid-path-service.test.ts`.

For every supported way to use the service and SDK—including an external consumer install, all
public SDK operations, free experiments, a real paid reel, resume, outputs, settings, and known
limits—read [Using Cutroom](docs/USING_CUTROOM.md).

## Build the SDK packages

```bash
node scripts/package-sdk.mjs
```

This creates two gitignored artifacts:

```text
.package-staging/cutroom-reel-contract-1.0.0.tgz
.package-staging/cutroom-sdk-1.0.0.tgz
```

They contain compiled ESM JavaScript and declarations, not the engine. A consumer must connect to
a running Cutroom service or supply an exact engine launcher command and argument vector. See the
[external consumer instructions](docs/USING_CUTROOM.md#install-the-sdk-in-another-project).

## Repository layout

```text
apps/service              composition root and runnable local service
apps/api                  loopback HTTP API; never calls a provider
apps/worker               job runner; receives ports and cannot construct providers
packages/reel-contract    caller-facing schemas, types, routes, and contract version
packages/sdk              typed local client and launcher lifecycle
packages/contracts        internal shared types and port interfaces
packages/pipeline         pure stages and gates; no database, filesystem, or network
packages/providers        stand-in, MiniMax, fal, local-sensor, and ffmpeg adapters
packages/domain           tables, migrations, queue, records, and budget ledger
scripts                   checks, packaging, journeys, and the manual paid-reel command
docs/features             approved gates and journey evidence for each feature
```

Twenty-two dependency rules enforce these boundaries over resolved file paths. They include
package entry-point rules, three rules inside the planner/splitter package, SDK isolation, process
and key confinement, and npm dependency restrictions.

```bash
node scripts/drift.mjs
node scripts/drift.mjs --prove
node scripts/drift.mjs --audit
```

## Development and verification

`pnpm` is intentionally invoked through Corepack on this machine:

```bash
node scripts/check.mjs                         # full suite
node scripts/check.mjs --changed               # documentation-only changes
node scripts/check.mjs --slice tests/name.test.ts
node scripts/verification-status.mjs           # evidence bound to the exact HEAD tree
```

Never commit `.env`, media, the SQLite database, `.artifacts/`, `.package-staging/`, or other
generated files. Decisions and the rules for contributing are in [AGENTS.md](AGENTS.md) and
[CLAUDE.md](CLAUDE.md). The public contract is version 1; changing it requires the feature gates
and evidence described in those files.

## Documentation map

- [Using Cutroom](docs/USING_CUTROOM.md) — operator and consumer guide.
- [Current status](docs/STATUS.md) — what works, what is distributed, and what remains.
- [Engineering context](docs/context.md) — exact current evidence, runs, queue, and recent changes.
- [SDK feature](docs/features/cutroom-sdk.md) and
  [package feature](docs/features/cutroom-sdk-package.md) — reviewed behavior and packaging proof.
- [Reel pitfalls](docs/reel-pitfalls.md) — lessons from real runs.
- [Prompt index](PROMPTS/README.md) and [journal](JOURNAL.md) — why the repository changed.
