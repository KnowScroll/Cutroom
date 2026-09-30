# 074 — `cutroom-sdk-v1`: Linux delivery and KnowScroll integration gates

- **For:** the planning session after prompt 073 resolution A completes green
- **Feature:** `cutroom-sdk-v1` (D-098, D-115; S-173, S-175, S-177, S-179)
- **Work:** plan and adversarially review the Linux release, installation, launcher, and cross-repository proof; no implementation
- **Written:** 2026-09-30, after the owner required SDK v1 to be usable by KnowScroll before `self-heal` and corrected the deployment target to Linux
- **Run:** not yet run

```text
Plan `cutroom-sdk-v1` only. The objective is not merely an SDK source package that passes
isolated tests: it is a versioned Linux release that KnowScroll can install and use to call a
separate Cutroom engine process. Do not implement packaging, compilation, installation,
KnowScroll integration, a launcher, or a journey in this session. Gates before code.

Prerequisite and stop boundary

1. Follow Cutroom's startup order exactly: `node scripts/decisions.mjs --fetch`, `node
   scripts/drift.mjs`, the last 40 lines of `JOURNAL.md`, and `node
   scripts/verification-status.mjs`. Stop if the steering authority is newer.
2. Prompt 073 resolution A must already have completed: the two Markdown files were formatted,
   the new tree received a green full check, and fresh `cutroom-sdk` and `reel-contract`
   journeys both PASSed from clean trees. If that exact evidence does not exist, stop and report
   that prompt 073 A is the only next work. Do not substitute resolution B or C, rerun a journey
   as startup, or weaken a check.
3. Read Cutroom's `AGENTS.md` / `CLAUDE.md`, `docs/context.md`, S-173, S-175, S-177 and S-179,
   `docs/features/cutroom-sdk.md`, both public package manifests and tsconfigs,
   `packages/sdk/src/index.ts`, `packages/sdk/src/launcher.ts`, the service entry/settings,
   workspace configuration, generated-path rules, and the SDK tests. Inventory every runtime
   dependency needed outside this source checkout, including Node, native modules, ffmpeg,
   database migrations, configured artifact paths, and provider configuration. Read; do not
   infer.
4. Read KnowScroll's `CLAUDE.md` and then `steering/STATE.md` before any other KnowScroll file.
   Recite the state in your own words. The local state observed while this prompt was written
   reported an old commit and uncommitted files even though Git was clean at a newer commit; use
   KnowScroll's own `pnpm state` ritual to reconcile that before planning and record what changed.
   Read D-098, D-099 and D-115, `steering/SYSTEM.md`, the worker/API package manifests, workspace
   configuration, and every current reel submission/job contract. Do not edit implementation.

Authority and feature ownership

5. Create two linked planning files, because D-115 assigns the two sides to different
   authorities:

   - Cutroom: `docs/features/cutroom-sdk-v1.md` owns compiled/versioned SDK and contract
     artifacts, the separately runnable engine release, the launcher contract, runtime
     prerequisites, release verification, and rollback.
   - KnowScroll: `steering/features/cutroom-integration.md` owns obtaining the release,
     configuring its location without a machine-specific committed absolute path, constructing
     `createCutroom`, submitting/following/reading/cancelling/resuming runs, lifecycle ownership,
     and the KnowScroll-side journey.

   Each file has its own status, decisions, Gates 1–4, slices, Evidence and Divergence. Neither
   feature may claim the other repository's work. Cross-link exact compatible versions and the
   final joint acceptance journey.

Owner decisions required before gate approval

6. Put each choice between alternatives in the authority that owns it, with Chose, Why,
   Rejected, Caught-by and Confirmed-by. Ask the owner concise questions and do not invent an
   answer. At minimum settle:

   - **Delivery channel.** Recommend a versioned local release for the one Linux machine, made of
     immutable installable artifacts with checksums. Compare it with a private package registry,
     a public registry, and a Git/source-checkout dependency. A source checkout, `workspace:*`,
     or a sibling-repository path is not a v1 release.
   - **Linux support matrix.** Name the distribution family, CPU architecture and minimum Node
     version actually supported. The design must contain no PowerShell, `.cmd`, drive-letter,
     backslash-path, Windows service, or Windows-only packaging assumption. Do not claim all
     Linux distributions if only one is proved.
   - **Installation owner and location.** Decide what installs/upgrades Cutroom, where immutable
     releases live, how KnowScroll discovers the active release through configuration, and which
     process owns rollback. Never commit a machine-specific absolute path.
   - **Release/version compatibility.** Decide the v1 version identifiers for SDK, contract and
     engine, the compatibility check at readiness, lock/checksum behavior, upgrade order, and
     what happens when versions disagree.
   - **Runtime prerequisites.** Decide whether Node, ffmpeg and native runtime dependencies are
     bundled or host prerequisites, and how their exact versions are checked before a paid run.
   - **Secrets and generated state.** Decide how the separate engine receives provider secrets
     without KnowScroll or the SDK reading/logging them, and where its database, media and other
     generated artifacts live under configured, gitignored paths.

Required Gate 1 — Product

7. Write a feature summary of at most five sentences, the user-visible outcome and explicit
   non-goals. Define deterministic numbered flows for:

   1. clean Linux installation;
   2. KnowScroll joining an already-ready engine;
   3. KnowScroll starting an absent engine through the SDK's explicit command/vector;
   4. submit, find/status, follow, result, record, cancel and resume;
   5. creator-owned close and a joined handle's non-owning close;
   6. upgrade and rollback;
   7. missing artifact, bad checksum, missing prerequisite, incompatible version, failed child,
      readiness timeout, malformed response and provider-secret absence.

   The primary acceptance statement is: from a clean supported Linux host, KnowScroll installs
   pinned v1 artifacts, starts with no Cutroom process, obtains a typed SDK handle, starts exactly
   one separate engine, completes a no-provider acceptance run through the public methods, reads
   its record/result, and closes only the process it created. A second flow proves joining an
   existing engine starts and stops nothing.

Required Gate 2 — Architecture

8. Define the artifact graph and boundaries. At minimum account for:

   - compiled ESM JavaScript and `.d.ts` for `@cutroom/reel-contract` and `@cutroom/sdk`;
   - no public export that points at `.ts` source and no unresolved `workspace:*` in an installed
     artifact;
   - a separately runnable compiled Cutroom engine release whose stable entry is supplied to the
     SDK as a literal command and argument vector with `shell: false`;
   - the engine, not KnowScroll, owning providers, database, ffmpeg and generated media;
   - the SDK importing only the public contract and Node built-ins;
   - reproducible artifact contents, version metadata and checksums;
   - atomic active-version selection and rollback without overwriting the previous release;
   - no committed absolute path and no reliance on either repository's source-tree layout.

   State why the chosen build/package technologies fit Node 22+ ESM and native dependencies.
   Name every new or changed package, script, config, boundary rule and generated directory.

9. Include strict interfaces. For every HTTP API used, use this exact schema:

   - Name:
   - Type: REST
   - Method:
   - Path:
   - Auth:
   - Request Schema (JSON):
   - Response Schema (JSON):
   - Error Codes:
   - Idempotency:
   - Rate Limits:

   Reuse the existing readiness and run routes; do not invent a second engine protocol merely for
   packaging. Define a strict release manifest schema containing artifact name, semantic version,
   contract version, supported platform/architecture, minimum Node version, entry point,
   dependency/prerequisite versions and SHA-256 checksums. Define the launcher configuration
   schema and the KnowScroll configuration boundary. If no data table changes, say explicitly:
   `New tables: none; modified tables: none; migrations: none`, and explain why installation
   state belongs outside the product database.

10. Specify state transitions for release installation and SDK lifecycle. Installation must cover
    absent -> staged -> verified -> active, failure back to absent/previous active, and rollback.
    SDK lifecycle must preserve probing -> joined or owned -> closed, including the fixed-port race.

Required Gate 3 — Program design and failures

11. Define modules and one owner for each responsibility: compiler/builder, package manifest
    rewriter, release assembler, checksum verifier, installer/activator, engine entry, SDK client,
    KnowScroll adapter and acceptance harness. No module may silently combine package creation,
    installation and activation.
12. Enumerate edge cases and exact outcomes: partial install, checksum mismatch, interrupted
    activation, stale active pointer, wrong CPU architecture, wrong Node/native ABI, missing
    ffmpeg, unwritable configured directories, occupied port by a non-Cutroom peer, ready=false,
    contract mismatch, two KnowScroll callers, early engine exit, SIGTERM/normal shutdown,
    invalid request, malformed response, and restart after a crashed owner.
13. Define security and privacy: release integrity, least-privilege file permissions, no shell
    command string, loopback only, no secret in argv/manifest/log/error, no media/database/release
    artifact committed, and no provider key readable by KnowScroll or SDK code.
14. Define operations and observability without adding a dashboard: structured lifecycle/release
    events with no secrets, version and readiness diagnostics, retained install/rollback receipts,
    and a concise Linux runbook. State expected load (five users, one machine), readiness bound,
    availability expectation and disk cleanup policy.

Required Gate 4 — Slices and proof

15. Write a dependency-ordered slice plan. It must begin with impact/baseline and end with a
    generated joint acceptance result. Separate at least:

    - artifact and compatibility contract;
    - compiled public packages;
    - compiled engine release and runtime-prerequisite checks;
    - installer/activation/rollback;
    - KnowScroll adapter and configuration;
    - Linux cross-repository acceptance journey;
    - final Cutroom and affected-feature re-journeys.

   For every slice name exact files or bounded directories, tests written red first, deliberate
   breaks, boundary proof, verification command, commit/evidence rule and stop condition. Re-run
   test impact after each slice; never guess a re-journey list in advance.
16. The Linux acceptance harness must start from a clean temporary install root outside both
    source trees and must use produced artifacts, not workspace links. It proves checksums, package
    import/type surface, absent-engine launch, existing-engine join, fixed-port race, every SDK
    method against a no-provider stand-in or deterministic engine fixture, creator-owned close,
    non-owning close, incompatible-version refusal and rollback. It must fail if an installed file
    resolves into either source checkout.
17. Define rollout: build immutable candidate, verify in a clean Linux environment, activate one
    version, integrate pinned KnowScroll configuration, run the joint journey, then retain the
    prior version for rollback. No paid provider call belongs to packaging proof. A later optional
    real-reel smoke may run only under its existing budget and secret rules.

Adversarial review and output

18. Review both gate files adversarially against their own repository rules and against each
    other. Reject approval for any source-checkout dependency, Windows-only assumption,
    `workspace:*` leakage, TypeScript export in installed packages, shell launcher, unversioned
    artifact, unverified checksum, bundled secret, committed absolute path, in-process engine,
    second worker, hand-written evidence, or acceptance test that runs against source instead of
    installed artifacts.
19. Apply review corrections to the gate documents, review again, and mark gates approved only
    when no finding remains. Update each repository's decisions, context/state inputs and journal
    under its own rules. Run document-only checks only; no implementation or feature journey.
20. Finish with a clean tree in each repository and write the next implementation prompt for
    Slice 0/1 only. That prompt must not exist until both linked gate sets are approved. Stop;
    do not begin the build, `self-heal`, or another feature.
```

## Run

not yet run
