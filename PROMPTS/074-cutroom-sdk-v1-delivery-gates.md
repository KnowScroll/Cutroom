# 074 — `cutroom-sdk-package`: finish the portable SDK package

- **For:** the execution session after prompt 073 resolution A completes green
- **Feature:** `cutroom-sdk-package` (D-098, D-115; S-173, S-175, S-177, S-180)
- **Work:** approve the minimal packaging gates, build installable SDK/contract artifacts, prove them from an external consumer, and run the affected journeys
- **Written:** 2026-09-30; rewritten before run after the owner clarified that Cutroom ships the SDK only and consumers own every integration
- **Run:** not yet run

```text
Finish the Cutroom SDK package. Cutroom's responsibility ends with a portable, installable,
consumer-neutral `@cutroom/sdk` package and its `@cutroom/reel-contract` dependency. Do not edit
KnowScroll, package the Cutroom engine, write an installer, choose a deployment machine, publish
to a registry, or start `self-heal`. A consumer supplies its own engine URL and, when it wants
start-if-absent behavior, its own literal launcher command and argument vector as S-175 requires.

Prerequisite and startup

1. Follow the repository startup order exactly: `node scripts/decisions.mjs --fetch`, `node
   scripts/drift.mjs`, the last 40 lines of `JOURNAL.md`, and `node
   scripts/verification-status.mjs`. Stop if the steering authority is newer.
2. Prompt 073 resolution A must already have completed. Require exact evidence that the formatting
   correction received a green full check and fresh `cutroom-sdk` and `reel-contract` journeys
   both PASSed from clean trees. If it has not, stop: prompt 073 A is the only next work. Do not
   substitute resolution B/C or rerun old evidence as startup.
3. Read `AGENTS.md` / `CLAUDE.md`, `docs/context.md`, S-173, S-175, S-177 and S-180,
   `docs/features/cutroom-sdk.md`, the SDK and contract manifests/tsconfigs/source, root workspace
   and TypeScript configuration, package-related checks, SDK tests, `.gitignore`, and the journey
   reader. Inspect emitted JavaScript/import behavior with the installed TypeScript version; do
   not guess how `.ts` specifiers, declarations or workspace dependencies are rewritten.

Scope and non-goals

4. The completed deliverables are standard npm-format package artifacts for:

   - `@cutroom/reel-contract`: ESM JavaScript, declarations, public schemas/types and its runtime
     `zod` dependency;
   - `@cutroom/sdk`: ESM JavaScript, declarations, the existing public surface, and an ordinary
     versioned dependency on `@cutroom/reel-contract`.

   The artifacts must be installable by an otherwise unrelated Node project. Their installed
   manifests contain no `private: true`, `workspace:*`, source-checkout path, absolute path or
   public `.ts` export. Their runtime contains no engine code, provider, database, ffmpeg, media,
   secret, migration or generated state. Build/pack output goes to one configured gitignored
   repository-relative directory and is never committed.
5. Explicit non-goals: no KnowScroll adapter or file; no engine executable/bundle; no registry
   publication or credentials; no operating-system installer/service; no release activation,
   update or rollback manager; no dashboard; no new HTTP route; no database/schema change; no
   provider call; no paid reel. Consumers decide where the engine lives and how they obtain and
   configure it.

Gate phase — approve before implementation

6. Create `docs/features/cutroom-sdk-package.md` with the repository's required front matter,
   `Status: planned`, one `Gates:` line, slices, Evidence and Divergence. Write all four gates,
   review them adversarially, apply every finding, review again, and mark them APPROVED only when
   no finding remains. No implementation file may exist before that approval.
7. The gate document must contain the following implementation-ready sections:

   **Feature summary (five sentences maximum).** The SDK behavior is already built and verified;
   this feature turns its two public workspace packages into portable artifacts an unrelated
   Node consumer can install and execute without Cutroom's source checkout or TypeScript loader.

   **Goals.** Reproducible build/pack command; compiled ESM and `.d.ts`; versioned compatible
   manifests; clean external installation; runtime and type consumption; existing SDK behavior
   unchanged; package contents and provenance inspectable.

   **User flows (numbered and deterministic).** Build both artifacts; inspect them; install them
   into a fresh temporary consumer outside the repository; import `@cutroom/sdk` with plain Node;
   typecheck public use; join a ready stand-in; launch a consumer-supplied stand-in with
   `process.execPath` and a JavaScript fixture; call every public method; close joined and owned
   handles; reject an incompatible/malformed peer; rebuild and prove deterministic contents
   except for explicitly named archive metadata.

   **API definitions.** State that no API is added or changed. List the existing readiness and
   run route families the SDK consumes using this strict shape for each:

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

   **Data model.** Write exactly: `New tables: none; modified tables: none; migrations: none` and
   explain that packaging creates no product state.

   **State transitions.** Preserve the existing SDK lifecycle only: constructing -> probing ->
   joined or owned -> closed, including readiness polling and the fixed-port race. Package build
   state is source -> compiled staging -> validated artifact; any failure abandons staging and
   produces no accepted artifact.

   **Edge cases.** Wrong/missing package version; unresolved workspace dependency; `.ts` export;
   missing declaration; CommonJS consumer requesting unsupported CJS; incompatible Node version;
   archive containing files not explicitly allowed; package import resolving into the Cutroom
   checkout; consumer-supplied launcher missing/failing; malformed readiness; redirect; timeout;
   two callers; close ownership. Give each an exact result and catcher.

   **Security/operations.** No secret, media, database, environment snapshot, absolute path or
   source map with a source-tree path in either archive. The SDK remains loopback-only, uses
   `shell: false`, and logs no consumer command, arguments or environment. There is no runtime
   telemetry or update service.

   **Portability.** Package code uses Node/ESM and Node process APIs only, contains no native
   dependency and makes no Windows, Linux or macOS path/shell assumption. Tests use
   `process.execPath`, temporary directories and path/URL APIs, never `cmd`, PowerShell, bash,
   drive letters, `/tmp`, `/bin`, or hard-coded separators. Claim package portability by this
   boundary; do not claim a separately supplied engine or consumer launcher was packaged.

   **Non-functional requirements.** Node support follows the repository's declared minimum;
   packing is offline after dependencies are installed; the installed SDK adds no network call
   except its explicit loopback requests; creation is deterministic and leaves a clean tree;
   expected load is unchanged because packaging adds no runtime service.

   **Implementation handoff.** Exact files/bounded directories, build technology and rationale,
   affected-test inventory, deliberate breaks, verification commands, journey impact and stop
   conditions for each slice.

8. Gate review rejects: a KnowScroll-specific file/type; engine packaging; OS-specific commands;
   a source checkout/link as the acceptance consumer; `private`, `0.0.0`, `workspace:*` or `.ts`
   exports in shipped manifests; committed build artifacts; duplicated contract schemas;
   bundling `zod` without an explicit choice; CJS without a proven need; registry publication; or
   a package test that imports workspace source instead of the installed artifact.

Implementation phase — only after all gates are approved

9. Implement tests first. Add one package-owner test (prefer
   `tests/cutroom-sdk-package.test.ts`) that initially fails against current workspace-only
   manifests. It builds and inspects both archives, then creates a fresh temporary consumer
   outside the checkout and installs them with a normal package-manager operation. The consumer
   is not a Cutroom workspace and fails if resolution or a source map reaches the checkout.
10. Choose the smallest build design the approved gates support. Prefer TypeScript's compiler and
    a staging manifest over a new bundler unless inspection proves it cannot emit correct ESM and
    declarations. Keep workspace development working; ordinary tests must not depend on stale
    `dist`. One repository command builds/packs both packages in dependency order and cleans stale
    staging before use.
11. Archive tests assert exact allowed files, package names and v1 versions; ESM exports point to
    `.js`; declaration exports point to `.d.ts`; the SDK declares the compatible contract version;
    the contract declares `zod`; neither archive contains `workspace:*`, `private: true`, `.ts`
    runtime source, tests, docs, secrets, media, database, absolute paths or internal packages.
12. The installed-consumer proof uses plain `node`, with no `tsx`, TypeScript stripping, loader,
    workspace link or repository `NODE_PATH`. It imports every runtime export, typechecks every
    public type, runs route behavior through a stand-in, and exercises the launcher using
    `process.execPath` plus a JavaScript fixture. Cover join, start, readiness, fixed-port race,
    all public methods, both close ownership paths and stable typed errors. No real engine,
    provider, database, ffmpeg, media or secret.
13. Prove the test with deliberate breaks, each restored: restore a `.ts` export; leave
    `workspace:*`; omit the contract archive; remove one `.d.ts`; add an absolute/source path;
    resolve the consumer import to workspace source; use a shell launcher; and remove one public
    export. Record the exact assertion each turns red.
14. Update workspace/package checks and boundaries only where the approved package contract
    requires it. Do not weaken existing SDK boundaries. Build output stays ignored and is removed
    before the final clean-tree check.

Evidence and completion

15. Package/workspace/build behavior requires the full `node scripts/check.mjs`, not `--slice`.
    Record `Verification: full`, exact tree and affected tests in commit trailers per S-177.
16. Run `node scripts/journey.mjs cutroom-sdk-package` from a clean tree exactly once. On PASS,
    commit generated evidence alone. Then run the impact report's exact affected journeys from
    clean trees; review `cutroom-sdk` and `reel-contract`, but do not guess or widen the list before
    impact review. Stop and commit the first generated FAIL.
17. SDK v1 is complete from Cutroom's side only when prompt 073 A's evidence chain is green; both
    artifacts build from a clean checkout; the external consumer installs, imports, typechecks and
    exercises them without Cutroom source resolution; package and exact affected journeys PASS;
    artifacts are absent from Git; and the tree is clean.
18. Update `docs/context.md`, `JOURNAL.md` and this prompt's Run line; run the document-only check;
    commit the close-out and stop. Do not integrate a consumer, publish packages, package the
    engine, or start `self-heal`. Report the reproducible build/pack command and verified artifact
    names so any consumer can take over.
```

## Run

not yet run
